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
import * as dom from '../../../../../../base/browser/dom.js';
import { Emitter } from '../../../../../../base/common/event.js';
import { localize } from '../../../../../../nls.js';
import { IContextKeyService } from '../../../../../../platform/contextkey/common/contextkey.js';
import { IExtensionManagementService } from '../../../../../../platform/extensionManagement/common/extensionManagement.js';
import { areSameExtensions } from '../../../../../../platform/extensionManagement/common/extensionManagementUtil.js';
import { IInstantiationService } from '../../../../../../platform/instantiation/common/instantiation.js';
import { IKeybindingService } from '../../../../../../platform/keybinding/common/keybinding.js';
import { ChatContextKeys } from '../../../common/chatContextKeys.js';
import { CancelChatActionId } from '../../actions/chatExecuteActions.js';
import { AcceptToolConfirmationActionId } from '../../actions/chatToolActions.js';
import { IChatWidgetService } from '../../chat.js';
import { ChatConfirmationWidget } from '../chatConfirmationWidget.js';
import { ChatExtensionsContentPart } from '../chatExtensionsContentPart.js';
import { BaseChatToolInvocationSubPart } from './chatToolInvocationSubPart.js';
let ExtensionsInstallConfirmationWidgetSubPart = class ExtensionsInstallConfirmationWidgetSubPart extends BaseChatToolInvocationSubPart {
    constructor(toolInvocation, context, keybindingService, contextKeyService, chatWidgetService, extensionManagementService, instantiationService) {
        super(toolInvocation);
        this.codeblocks = [];
        if (toolInvocation.toolSpecificData?.kind !== 'extensions') {
            throw new Error('Tool specific data is missing or not of kind extensions');
        }
        const extensionsContent = toolInvocation.toolSpecificData;
        this.domNode = dom.$('');
        const chatExtensionsContentPart = this._register(instantiationService.createInstance(ChatExtensionsContentPart, extensionsContent));
        this._register(chatExtensionsContentPart.onDidChangeHeight(() => this._onDidChangeHeight.fire()));
        dom.append(this.domNode, chatExtensionsContentPart.domNode);
        if (toolInvocation.isConfirmed === undefined) {
            const continueLabel = localize('continue', "Continue");
            const continueKeybinding = keybindingService.lookupKeybinding(AcceptToolConfirmationActionId)?.getLabel();
            const continueTooltip = continueKeybinding ? `${continueLabel} (${continueKeybinding})` : continueLabel;
            const cancelLabel = localize('cancel', "Cancel");
            const cancelKeybinding = keybindingService.lookupKeybinding(CancelChatActionId)?.getLabel();
            const cancelTooltip = cancelKeybinding ? `${cancelLabel} (${cancelKeybinding})` : cancelLabel;
            const enableContinueButtonEvent = this._register(new Emitter());
            const buttons = [
                {
                    label: continueLabel,
                    data: true,
                    tooltip: continueTooltip,
                    disabled: true,
                    onDidChangeDisablement: enableContinueButtonEvent.event
                },
                {
                    label: cancelLabel,
                    data: false,
                    isSecondary: true,
                    tooltip: cancelTooltip
                }
            ];
            const confirmWidget = this._register(instantiationService.createInstance(ChatConfirmationWidget, toolInvocation.confirmationMessages?.title ?? localize('installExtensions', "Install Extensions"), undefined, toolInvocation.confirmationMessages?.message ?? localize('installExtensionsConfirmation', "Click the Install button on the extension and then press Continue when finished."), buttons, context.container));
            this._register(confirmWidget.onDidChangeHeight(() => this._onDidChangeHeight.fire()));
            dom.append(this.domNode, confirmWidget.domNode);
            this._register(confirmWidget.onDidClick(button => {
                toolInvocation.confirmed.complete(button.data);
                chatWidgetService.getWidgetBySessionId(context.element.sessionId)?.focusInput();
            }));
            toolInvocation.confirmed.p.then(() => {
                ChatContextKeys.Editing.hasToolConfirmation.bindTo(contextKeyService).set(false);
                this._onNeedsRerender.fire();
            });
            const disposable = this._register(extensionManagementService.onInstallExtension(e => {
                if (extensionsContent.extensions.some(id => areSameExtensions({ id }, e.identifier))) {
                    disposable.dispose();
                    enableContinueButtonEvent.fire(false);
                }
            }));
        }
    }
};
ExtensionsInstallConfirmationWidgetSubPart = __decorate([
    __param(2, IKeybindingService),
    __param(3, IContextKeyService),
    __param(4, IChatWidgetService),
    __param(5, IExtensionManagementService),
    __param(6, IInstantiationService)
], ExtensionsInstallConfirmationWidgetSubPart);
export { ExtensionsInstallConfirmationWidgetSubPart };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdEV4dGVuc2lvbnNJbnN0YWxsVG9vbFN1YlBhcnQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9hZHZpa2FyL0RvY3VtZW50cy9hcmNoaXRlY3QvYXJjaDIvQXJjaElERS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2Jyb3dzZXIvY2hhdENvbnRlbnRQYXJ0cy90b29sSW52b2NhdGlvblBhcnRzL2NoYXRFeHRlbnNpb25zSW5zdGFsbFRvb2xTdWJQYXJ0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0sdUNBQXVDLENBQUM7QUFDN0QsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ2pFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQUNwRCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNoRyxPQUFPLEVBQUUsMkJBQTJCLEVBQUUsTUFBTSw4RUFBOEUsQ0FBQztBQUMzSCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxrRkFBa0YsQ0FBQztBQUNySCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxrRUFBa0UsQ0FBQztBQUN6RyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNoRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFFckUsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDekUsT0FBTyxFQUFFLDhCQUE4QixFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDbEYsT0FBTyxFQUFzQixrQkFBa0IsRUFBRSxNQUFNLGVBQWUsQ0FBQztBQUN2RSxPQUFPLEVBQUUsc0JBQXNCLEVBQTJCLE1BQU0sOEJBQThCLENBQUM7QUFFL0YsT0FBTyxFQUFFLHlCQUF5QixFQUFF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