/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { Action } from '../../../../base/common/actions.js';
import { assertNever } from '../../../../base/common/assert.js';
import { markdownCommandLink, MarkdownString } from '../../../../base/common/htmlContent.js';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import { localize } from '../../../../nls.js';
import { INotificationService, Severity } from '../../../../platform/notification/common/notification.js';
import { IQuickInputService } from '../../../../platform/quickinput/common/quickInput.js';
import { ChatElicitationRequestPart } from '../../chat/browser/chatElicitationRequestPart.js';
import { ChatModel } from '../../chat/common/chatModel.js';
import { IChatService } from '../../chat/common/chatService.js';
const noneItem = { id: undefined, label: localize('mcp.elicit.enum.none', 'None'), description: localize('mcp.elicit.enum.none.description', 'No selection'), alwaysShow: true };
let McpElicitationService = class McpElicitationService {
    constructor(_notificationService, _quickInputService, _chatService) {
        this._notificationService = _notificationService;
        this._quickInputService = _quickInputService;
        this._chatService = _chatService;
    }
    elicit(server, context, elicitation, token) {
        const store = new DisposableStore();
        return new Promise(resolve => {
            const chatModel = context?.chatSessionId && this._chatService.getSession(context.chatSessionId);
            if (chatModel instanceof ChatModel) {
                const request = chatModel.getRequests().at(-1);
                if (request) {
                    const part = new ChatElicitationRequestPart(localize('mcp.elicit.title', 'Request for Input'), elicitation.message, new MarkdownString(markdownCommandLink({
                        id: "workbench.mcp.showConfiguration" /* McpCommandIds.ShowConfiguration */,
                        title: localize('msg.subtitle', "{0} (MCP Server)", server.definition.label),
                        arguments: [server.collection.id, server.definition.id],
                    }), { isTrusted: true }), localize('mcp.elicit.accept', 'Respond'), localize('mcp.elicit.reject', 'Cancel'), async () => {
                        const p = this._doElicit(elicitation, token);
                        resolve(p);
                        const result = await p;
                        part.state = result.action === 'accept' ? 'accepted' : 'rejected';
                        part.acceptedResult = result.content;
                    }, () => {
                        resolve({ action: 'decline' });
                        part.state = 'rejected';
                        return Promise.resolve();
                    });
                    chatModel.acceptResponseProgress(request, part);
                }
            }
            else {
                const handle = this._notificationService.notify({
                    message: elicitation.message,
                    source: localize('mcp.elicit.source', 'MCP Server ({0})', server.definition.label),
                    severity: Severity.Info,
                    actions: {
                        primary: [store.add(new Action('mcp.elicit.give', localize('mcp.elicit.give', 'Respond'), undefined, true, () => resolve(this._doElicit(elicitation, token))))],
                        secondary: [store.add(new Action('mcp.elicit.cancel', localize('mcp.elicit.cancel', 'Cancel'), undefined, true, () => resolve({ action: 'decline' })))],
                    }
                });
                store.add(handle.onDidClose(() => resolve({ action: 'cancel' })));
                store.add(token.onCancellationRequested(() => resolve({ action: 'cancel' })));
            }
        }).finally(() => store.dispose());
    }
    async _doElicit(elicitation, token) {
        const quickPick = this._quickInputService.createQuickPick();
        const store = new DisposableStore();
        try {
            const properties = Object.entries(elicitation.requestedSchema.properties);
            const requiredFields = new Set(elicitation.requestedSchema.required || []);
            const results = {};
            const backSnapshots = [];
            quickPick.title = elicitation.message;
            quickPick.totalSteps = properties.length;
            quickPick.ignoreFocusOut = true;
            for (let i = 0; i < properties.length; i++) {
                const [propertyName, schema] = properties[i];
                const isRequired = requiredFields.has(propertyName);
                const restore = backSnapshots.at(i);
                store.clear();
                quickPick.step = i + 1;
                quickPick.title = schema.title || propertyName;
                quickPick.placeholder = this._getFieldPlaceholder(schema, isRequired);
                quickPick.value = restore?.value ?? '';
                quickPick.validationMessage = '';
                quickPick.buttons = i > 0 ? [this._quickInputService.backButton] : [];
                let result;
                if (schema.type === 'boolean') {
                    result = await this._handleEnumField(quickPick, { ...schema, type: 'string', enum: ['true', 'false'] }, isRequired, store, token);
                    if (result.type === 'value') {
                        result.value = result.value === 'true' ? true : false;
                    }
                }
                else if (schema.type === 'string' && 'enum' in schema) {
                    result = await this._handleEnumField(quickPick, schema, isRequired, store, token);
                }
                else {
                    result = await this._handleInputField(quickPick, schema, isRequired, store, token);
                    if (result.type === 'value' && (schema.type === 'number' || schema.type === 'integer')) {
                        result.value = Number(result.value);
                    }
                }
                if (result.type === 'back') {
                    i -= 2;
                    continue;
                }
                if (result.type === 'cancel') {
                    return { action: 'cancel' };
                }
                backSnapshots[i] = { value: quickPick.value };
                if (result.value === undefined) {
                    delete results[propertyName];
                }
                else {
                    results[propertyName] = result.value;
                }
            }
            return {
                action: 'accept',
                content: results,
            };
        }
        finally {
            store.dispose();
            quickPick.dispose();
        }
    }
    _getFieldPlaceholder(schema, required) {
        let placeholder = schema.description || '';
        if (!required) {
            placeholder = placeholder ? `${placeholder} (${localize('optional', 'Optional')})` : localize('optional', 'Optional');
        }
        return placeholder;
    }
    async _handleEnumField(quickPick, schema, required, store, token) {
        const items = schema.enum.map((value, index) => ({
            id: value,
            label: value,
            description: schema.enumNames?.[index],
        }));
        if (!required) {
            items.push(noneItem);
        }
        quickPick.items = items;
        quickPick.canSelectMany = false;
        return new Promise(resolve => {
            store.add(token.onCancellationRequested(() => resolve({ type: 'cancel' })));
            store.add(quickPick.onDidAccept(() => {
                const selected = quickPick.selectedItems[0];
                if (selected) {
                    resolve({ type: 'value', value: selected.id });
                }
            }));
            store.add(quickPick.onDidTriggerButton(() => resolve({ type: 'back' })));
            store.add(quickPick.onDidHide(() => resolve({ type: 'cancel' })));
            quickPick.show();
        });
    }
    async _handleInputField(quickPick, schema, required, store, token) {
        quickPick.canSelectMany = false;
        const updateItems = () => {
            const items = [];
            if (quickPick.value) {
                const validation = this._validateInput(quickPick.value, schema);
                quickPick.validationMessage = validation.message;
                if (validation.isValid) {
                    items.push({ id: '$current', label: `\u27A4 ${quickPick.value}` });
                }
            }
            else {
                quickPick.validationMessage = '';
            }
            if (quickPick.validationMessage) {
                quickPick.severity = Severity.Warning;
            }
            else {
                quickPick.severity = Severity.Ignore;
                if (!required) {
                    items.push(noneItem);
                }
            }
            quickPick.items = items;
        };
        updateItems();
        return new Promise(resolve => {
            if (token.isCancellationRequested) {
                resolve({ type: 'cancel' });
                return;
            }
            store.add(token.onCancellationRequested(() => resolve({ type: 'cancel' })));
            store.add(quickPick.onDidChangeValue(updateItems));
            store.add(quickPick.onDidAccept(() => {
                if (!quickPick.selectedItems[0].id) {
                    resolve({ type: 'value', value: undefined });
                }
                else if (!quickPick.validationMessage) {
                    resolve({ type: 'value', value: quickPick.value });
                }
            }));
            store.add(quickPick.onDidTriggerButton(() => resolve({ type: 'back' })));
            store.add(quickPick.onDidHide(() => resolve({ type: 'cancel' })));
            quickPick.show();
        });
    }
    _validateInput(value, schema) {
        switch (schema.type) {
            case 'string':
                return this._validateString(value, schema);
            case 'number':
            case 'integer':
                return this._validateNumber(value, schema);
            default:
                assertNever(schema);
        }
    }
    _validateString(value, schema) {
        if (schema.minLength && value.length < schema.minLength) {
            return { isValid: false, message: localize('mcp.elicit.validation.minLength', 'Minimum length is {0}', schema.minLength) };
        }
        if (schema.maxLength && value.length > schema.maxLength) {
            return { isValid: false, message: localize('mcp.elicit.validation.maxLength', 'Maximum length is {0}', schema.maxLength) };
        }
        if (schema.format) {
            const formatValid = this._validateStringFormat(value, schema.format);
            if (!formatValid.isValid) {
                return formatValid;
            }
        }
        return { isValid: true, parsedValue: value };
    }
    _validateStringFormat(value, format) {
        switch (format) {
            case 'email':
                return !value.includes('@')
                    ? { isValid: true }
                    : { isValid: false, message: localize('mcp.elicit.validation.email', 'Please enter a valid email address') };
            case 'uri':
                if (URL.canParse(value)) {
                    return { isValid: true };
                }
                else {
                    return { isValid: false, message: localize('mcp.elicit.validation.uri', 'Please enter a valid URI') };
                }
            case 'date': {
                const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
                if (!dateRegex.test(value)) {
                    return { isValid: false, message: localize('mcp.elicit.validation.date', 'Please enter a valid date (YYYY-MM-DD)') };
                }
                const date = new Date(value);
                return !isNaN(date.getTime())
                    ? { isValid: true }
                    : { isValid: false, message: localize('mcp.elicit.validation.date', 'Please enter a valid date (YYYY-MM-DD)') };
            }
            case 'date-time': {
                const dateTime = new Date(value);
                return !isNaN(dateTime.getTime())
                    ? { isValid: true }
                    : { isValid: false, message: localize('mcp.elicit.validation.dateTime', 'Please enter a valid date-time') };
            }
            default:
                return { isValid: true };
        }
    }
    _validateNumber(value, schema) {
        const parsed = Number(value);
        if (isNaN(parsed)) {
            return { isValid: false, message: localize('mcp.elicit.validation.number', 'Please enter a valid number') };
        }
        if (schema.type === 'integer' && !Number.isInteger(parsed)) {
            return { isValid: false, message: localize('mcp.elicit.validation.integer', 'Please enter a valid integer') };
        }
        if (schema.minimum !== undefined && parsed < schema.minimum) {
            return { isValid: false, message: localize('mcp.elicit.validation.minimum', 'Minimum value is {0}', schema.minimum) };
        }
        if (schema.maximum !== undefined && parsed > schema.maximum) {
            return { isValid: false, message: localize('mcp.elicit.validation.maximum', 'Maximum value is {0}', schema.maximum) };
        }
        return { isValid: true, parsedValue: parsed };
    }
};
McpElicitationService = __decorate([
    __param(0, INotificationService),
    __param(1, IQuickInputService),
    __param(2, IChatService)
], McpElicitationService);
export { McpElicitationService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWNwRWxpY2l0YXRpb25TZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvYWR2aWthci9Eb2N1bWVudHMvYXJjaGl0ZWN0L2FyY2gyL0FyY2hJREUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbWNwL2Jyb3dzZXIvbWNwRWxpY2l0YXRpb25TZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUM1RCxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFFaEUsT0FBTyxFQUFFLG1CQUFtQixFQUFFLGNBQWMsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQzdGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUN2RSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDOUMsT0FBTyxFQUFFLG9CQUFvQixFQUFFLFFBQVEsRUFBRSxNQUFNLDBEQUEwRCxDQUFDO0FBQzFHLE9BQU8sRUFBRSxrQkFBa0IsRUFBOEIsTUFBTSxzREFBc0QsQ0FBQztBQUN0SCxPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUM5RixPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDM0QsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBS2hFLE1BQU0sUUFBUSxHQUFtQixFQUFFLEVBQUUsRUFBRSxTQUFTLEVBQUUsS0FBSyxFQUFFLFFBQVEsQ0FBQyxzQkFBc0IsRUFBRSxNQUFNLENBQUMsRUFBRSxXQUFXLEVBQUUsUUFBUSxDQUFDLGtDQUFrQyxFQUFFLGNBQWMsQ0FBQyxFQUFFLFVBQVUsRUFBRSxJQUFJLEVBQUUsQ0FBQztBQUUxTCxJQUFNLHFCQUFxQixHQUEzQixNQUFNLHFCQUFx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