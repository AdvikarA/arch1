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
import { mapFindFirst } from '../../../../base/common/arraysFind.js';
import { decodeBase64 } from '../../../../base/common/buffer.js';
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { Event } from '../../../../base/common/event.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { isDefined } from '../../../../base/common/types.js';
import { localize } from '../../../../nls.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { getConfigValueInTarget, IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { ExtensionIdentifier } from '../../../../platform/extensions/common/extensions.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { INotificationService, Severity } from '../../../../platform/notification/common/notification.js';
import { ILanguageModelsService } from '../../chat/common/languageModels.js';
import { mcpServerSamplingSection } from './mcpConfiguration.js';
import { McpSamplingLog } from './mcpSamplingLog.js';
import { McpError } from './mcpTypes.js';
var ModelMatch;
(function (ModelMatch) {
    ModelMatch[ModelMatch["UnsureAllowedDuringChat"] = 0] = "UnsureAllowedDuringChat";
    ModelMatch[ModelMatch["UnsureAllowedOutsideChat"] = 1] = "UnsureAllowedOutsideChat";
    ModelMatch[ModelMatch["NotAllowed"] = 2] = "NotAllowed";
    ModelMatch[ModelMatch["NoMatchingModel"] = 3] = "NoMatchingModel";
})(ModelMatch || (ModelMatch = {}));
let McpSamplingService = class McpSamplingService extends Disposable {
    constructor(_languageModelsService, _configurationService, _dialogService, _notificationService, _commandService, instaService) {
        super();
        this._languageModelsService = _languageModelsService;
        this._configurationService = _configurationService;
        this._dialogService = _dialogService;
        this._notificationService = _notificationService;
        this._commandService = _commandService;
        this._sessionSets = {
            allowedDuringChat: new Map(),
            allowedOutsideChat: new Map(),
        };
        this._logs = this._register(instaService.createInstance(McpSamplingLog));
    }
    async sample(opts, token = CancellationToken.None) {
        const messages = opts.params.messages.map((message) => {
            const content = message.content.type === 'text'
                ? { type: 'text', value: message.content.text }
                : message.content.type === 'image' || message.content.type === 'audio'
                    ? { type: 'image_url', value: { mimeType: message.content.mimeType, data: decodeBase64(message.content.data) } }
                    : undefined;
            if (!content) {
                return undefined;
            }
            return {
                role: message.role === 'assistant' ? 2 /* ChatMessageRole.Assistant */ : 1 /* ChatMessageRole.User */,
                content: [content]
            };
        }).filter(isDefined);
        if (opts.params.systemPrompt) {
            messages.unshift({ role: 0 /* ChatMessageRole.System */, content: [{ type: 'text', value: opts.params.systemPrompt }] });
        }
        const model = await this._getMatchingModel(opts);
        // todo@connor4312: nullExtensionDescription.identifier -> undefined with API update
        const response = await this._languageModelsService.sendChatRequest(model, new ExtensionIdentifier('Github.copilot-chat'), messages, {}, token);
        let responseText = '';
        // MCP doesn't have a notion of a multi-part sampling response, so we only preserve text
        // Ref https://github.com/modelcontextprotocol/modelcontextprotocol/issues/91
        const streaming = (async () => {
            for await (const part of response.stream) {
                if (Array.isArray(part)) {
                    for (const p of part) {
                        if (p.part.type === 'text') {
                            responseText += p.part.value;
                        }
                    }
                }
                else if (part.part.type === 'text') {
                    responseText += part.part.value;
                }
            }
        })();
        try {
            await Promise.all([response.result, streaming]);
            this._logs.add(opts.server, opts.params.messages, responseText, model);
            return {
                sample: {
                    model,
                    content: { type: 'text', text: responseText },
                    role: 'assistant', // it came from the model!
                },
            };
        }
        catch (err) {
            throw McpError.unknown(err);
        }
    }
    hasLogs(server) {
        return this._logs.has(server);
    }
    getLogText(server) {
        return this._logs.getAsText(server);
    }
    async _getMatchingModel(opts) {
        const model = await this._getMatchingModelInner(opts.server, opts.isDuringToolCall, opts.params.modelPreferences);
        if (model === 0 /* ModelMatch.UnsureAllowedDuringChat */) {
            const retry = await this._showContextual(opts.isDuringToolCall, localize('mcp.sampling.allowDuringChat.title', 'Allow MCP tools from "{0}" to make LLM requests?', opts.server.definition.label), localize('mcp.sampling.allowDuringChat.desc', 'The MCP server "{0}" has issued a request to make a language model call. Do you want to allow it to make requests during chat?', opts.server.definition.label), this.allowButtons(opts.server, 'allowedDuringChat'));
            if (retry) {
                return this._getMatchingModel(opts);
            }
            throw McpError.notAllowed();
        }
        else if (model === 1 /* ModelMatch.UnsureAllowedOutsideChat */) {
            const retry = await this._showContextual(opts.isDuringToolCall, localize('mcp.sampling.allowOutsideChat.title', 'Allow MCP server "{0}" to make LLM requests?', opts.server.definition.label), localize('mcp.sampling.allowOutsideChat.desc', 'The MCP server "{0}" has issued a request to make a language model call. Do you want to allow it to make requests, outside of tool calls during chat?', opts.server.definition.label), this.allowButtons(opts.server, 'allowedOutsideChat'));
            if (retry) {
                return this._getMatchingModel(opts);
            }
            throw McpError.notAllowed();
        }
        else if (model === 2 /* ModelMatch.NotAllowed */) {
            throw McpError.notAllowed();
        }
        else if (model === 3 /* ModelMatch.NoMatchingModel */) {
            const newlyPickedModels = opts.isDuringToolCall
                ? await this._commandService.executeCommand("workbench.mcp.configureSamplingModels" /* McpCommandIds.ConfigureSamplingModels */, opts.server)
                : await this._notify(localize('mcp.sampling.needsModels', 'MCP server "{0}" triggered a language model request, but it has no allowlisted models.', opts.server.definition.label), {
                    [localize('configure', 'Configure')]: () => this._commandService.executeCommand("workbench.mcp.configureSamplingModels" /* McpCommandIds.ConfigureSamplingModels */, opts.server),
                    [localize('cancel', 'Cancel')]: () => Promise.resolve(undefined),
                });
            if (newlyPickedModels) {
                return this._getMatchingModel(opts);
            }
            throw McpError.notAllowed();
        }
        return model;
    }
    allowButtons(server, key) {
        return {
            [localize('mcp.sampling.allow.inSession', 'Allow in this Session')]: async () => {
                this._sessionSets[key].set(server.definition.id, true);
                return true;
            },
            [localize('mcp.sampling.allow.always', 'Always')]: async () => {
                await this.updateConfig(server, c => c[key] = true);
                return true;
            },
            [localize('mcp.sampling.allow.notNow', 'Not Now')]: async () => {
                this._sessionSets[key].set(server.definition.id, false);
                return false;
            },
            [localize('mcp.sampling.allow.never', 'Never')]: async () => {
                await this.updateConfig(server, c => c[key] = false);
                return false;
            },
        };
    }
    async _showContextual(isDuringToolCall, title, message, buttons) {
        if (isDuringToolCall) {
            const result = await this._dialogService.prompt({
                type: 'question',
                title: title,
                message,
                buttons: Object.entries(buttons).map(([label, run]) => ({ label, run })),
            });
            return await result.result;
        }
        else {
            return await this._notify(message, buttons);
        }
    }
    async _notify(message, buttons) {
        return await new Promise(resolve => {
            const handle = this._notificationService.prompt(Severity.Info, message, Object.entries(buttons).map(([label, action]) => ({
                label,
                run: () => resolve(action()),
            })));
            Event.once(handle.onDidClose)(() => resolve(undefined));
        });
    }
    /**
     * Gets the matching model for the MCP server in this context, or
     * a reason why no model could be selected.
     */
    async _getMatchingModelInner(server, isDuringToolCall, preferences) {
        const config = this.getConfig(server);
        // 1. Ensure the server is allowed to sample in this context
        if (isDuringToolCall && !config.allowedDuringChat && !this._sessionSets.allowedDuringChat.has(server.definition.id)) {
            return config.allowedDuringChat === undefined ? 0 /* ModelMatch.UnsureAllowedDuringChat */ : 2 /* ModelMatch.NotAllowed */;
        }
        else if (!isDuringToolCall && !config.allowedOutsideChat && !this._sessionSets.allowedOutsideChat.has(server.definition.id)) {
            return config.allowedOutsideChat === undefined ? 1 /* ModelMatch.UnsureAllowedOutsideChat */ : 2 /* ModelMatch.NotAllowed */;
        }
        // 2. Get the configured models, or the default model(s)
        const foundModelIdsDeep = config.allowedModels?.filter(m => !!this._languageModelsService.lookupLanguageModel(m)) || this._languageModelsService.getLanguageModelIds().filter(m => this._languageModelsService.lookupLanguageModel(m)?.isDefault);
        const foundModelIds = foundModelIdsDeep.flat().sort((a, b) => b.length - a.length); // Sort by length to prefer most specific
        if (!foundModelIds.length) {
            return 3 /* ModelMatch.NoMatchingModel */;
        }
        // 3. If preferences are provided, try to match them from the allowed models
        if (preferences?.hints) {
            const found = mapFindFirst(preferences.hints, hint => foundModelIds.find(model => model.toLowerCase().includes(hint.name.toLowerCase())));
            if (found) {
                return found;
            }
        }
        return foundModelIds[0]; // Return the first matching model
    }
    _configKey(server) {
        return `${server.collection.label}: ${server.definition.label}`;
    }
    getConfig(server) {
        return this._getConfig(server).value || {};
    }
    /**
     * _getConfig reads the sampling config reads the `{ server: data }` mapping
     * from the appropriate config. We read from the most specific possible
     * config up to the default configuration location that the MCP server itself
     * is defined in. We don't go further because then workspace-specific servers
     * would get in the user settings which is not meaningful and could lead
     * to confusion.
     *
     * todo@connor4312: generalize this for other esttings when we have them
     */
    _getConfig(server) {
        const def = server.readDefinitions().get();
        const mostSpecificConfig = 8 /* ConfigurationTarget.MEMORY */;
        const leastSpecificConfig = def.collection?.configTarget || 2 /* ConfigurationTarget.USER */;
        const key = this._configKey(server);
        const resource = def.collection?.presentation?.origin;
        const configValue = this._configurationService.inspect(mcpServerSamplingSection, { resource });
        for (let target = mostSpecificConfig; target >= leastSpecificConfig; target--) {
            const mapping = getConfigValueInTarget(configValue, target);
            const config = mapping?.[key];
            if (config) {
                return { value: config, key, mapping, target, resource };
            }
        }
        return { value: undefined, mapping: undefined, key, target: leastSpecificConfig, resource };
    }
    async updateConfig(server, mutate) {
        const { value, mapping, key, target, resource } = this._getConfig(server);
        const newConfig = { ...value };
        mutate(newConfig);
        await this._configurationService.updateValue(mcpServerSamplingSection, { ...mapping, [key]: newConfig }, { resource }, target);
        return newConfig;
    }
};
McpSamplingService = __decorate([
    __param(0, ILanguageModelsService),
    __param(1, IConfigurationService),
    __param(2, IDialogService),
    __param(3, INotificationService),
    __param(4, ICommandService),
    __param(5, IInstantiationService)
], McpSamplingService);
export { McpSamplingService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWNwU2FtcGxpbmdTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvYWR2aWthci9Eb2N1bWVudHMvYXJjaGl0ZWN0L2FyY2gyL0FyY2hJREUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbWNwL2NvbW1vbi9tY3BTYW1wbGluZ1NlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQ3JFLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUNqRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUM1RSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDekQsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUM3RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDOUMsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQ25GLE9BQU8sRUFBdUIsc0JBQXNCLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNoSixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDaEYsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDM0YsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDbkcsT0FBTyxFQUFFLG9CQUFvQixFQUFFLFFBQVEsRUFBRSxNQUFNLDBEQUEwRCxDQUFDO0FBQzFHLE9BQU8sRUFBc0Usc0JBQXNCLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUVqSixPQUFPLEVBQW1DLHdCQUF3QixFQUFF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