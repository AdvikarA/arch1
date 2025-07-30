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
var ChatToolOutputSubPart_1;
import * as dom from '../../../../../../base/browser/dom.js';
import { renderMarkdown } from '../../../../../../base/browser/markdownRenderer.js';
import { decodeBase64 } from '../../../../../../base/common/buffer.js';
import { CancellationTokenSource } from '../../../../../../base/common/cancellation.js';
import { Codicon } from '../../../../../../base/common/codicons.js';
import { ThemeIcon } from '../../../../../../base/common/themables.js';
import { generateUuid } from '../../../../../../base/common/uuid.js';
import { localize } from '../../../../../../nls.js';
import { IInstantiationService } from '../../../../../../platform/instantiation/common/instantiation.js';
import { IChatWidgetService } from '../../chat.js';
import { IChatOutputRendererService } from '../../chatOutputItemRenderer.js';
import { ChatCustomProgressPart } from '../chatProgressContentPart.js';
import { BaseChatToolInvocationSubPart } from './chatToolInvocationSubPart.js';
// TODO: see if we can reuse existing types instead of adding ChatToolOutputSubPart
let ChatToolOutputSubPart = class ChatToolOutputSubPart extends BaseChatToolInvocationSubPart {
    static { ChatToolOutputSubPart_1 = this; }
    /** Remembers cached state on re-render */
    static { this._cachedStates = new WeakMap(); }
    constructor(toolInvocation, context, chatOutputItemRendererService, chatWidgetService, instantiationService) {
        super(toolInvocation);
        this.context = context;
        this.chatOutputItemRendererService = chatOutputItemRendererService;
        this.chatWidgetService = chatWidgetService;
        this.instantiationService = instantiationService;
        this.codeblocks = [];
        this._disposeCts = this._register(new CancellationTokenSource());
        const details = toolInvocation.kind === 'toolInvocation'
            ? toolInvocation.resultDetails
            : {
                output: {
                    type: 'data',
                    mimeType: toolInvocation.resultDetails.output.mimeType,
                    value: decodeBase64(toolInvocation.resultDetails.output.base64Data),
                },
            };
        this.domNode = dom.$('div.tool-output-part');
        const titleEl = dom.$('.output-title');
        this.domNode.appendChild(titleEl);
        if (typeof toolInvocation.invocationMessage === 'string') {
            titleEl.textContent = toolInvocation.invocationMessage;
        }
        else {
            const md = this._register(renderMarkdown(toolInvocation.invocationMessage));
            titleEl.appendChild(md.element);
        }
        this.domNode.appendChild(this.createOutputPart(toolInvocation, details));
    }
    dispose() {
        this._disposeCts.dispose(true);
        super.dispose();
    }
    createOutputPart(toolInvocation, details) {
        const vm = this.chatWidgetService.getWidgetBySessionId(this.context.element.sessionId)?.viewModel;
        const parent = dom.$('div.webview-output');
        parent.style.maxHeight = '80vh';
        let partState = { height: 0, webviewOrigin: generateUuid() };
        if (vm) {
            let allStates = ChatToolOutputSubPart_1._cachedStates.get(vm);
            if (!allStates) {
                allStates = new Map();
                ChatToolOutputSubPart_1._cachedStates.set(vm, allStates);
            }
            const cachedState = allStates.get(toolInvocation.toolCallId);
            if (cachedState) {
                partState = cachedState;
            }
            else {
                allStates.set(toolInvocation.toolCallId, partState);
            }
        }
        if (partState.height) {
            parent.style.height = `${partState.height}px`;
        }
        const progressMessage = dom.$('span');
        progressMessage.textContent = localize('loading', 'Rendering tool output...');
        const progressPart = this.instantiationService.createInstance(ChatCustomProgressPart, progressMessage, ThemeIcon.modify(Codicon.loading, 'spin'));
        parent.appendChild(progressPart.domNode);
        // TODO: we also need to show the tool output in the UI
        this.chatOutputItemRendererService.renderOutputPart(details.output.mimeType, details.output.value.buffer, parent, { origin: partState.webviewOrigin }, this._disposeCts.token).then((renderedItem) => {
            if (this._disposeCts.token.isCancellationRequested) {
                return;
            }
            this._register(renderedItem);
            progressPart.domNode.remove();
            this._onDidChangeHeight.fire();
            this._register(renderedItem.onDidChangeHeight(newHeight => {
                this._onDidChangeHeight.fire();
                partState.height = newHeight;
            }));
            this._register(renderedItem.webview.onDidWheel(e => {
                this.chatWidgetService.getWidgetBySessionId(this.context.element.sessionId)?.delegateScrollFromMouseWheelEvent({
                    ...e,
                    preventDefault: () => { },
                    stopPropagation: () => { }
                });
            }));
            // When the webview is disconnected from the DOM due to being hidden, we need to reload it when it is shown again.
            const widget = this.chatWidgetService.getWidgetBySessionId(this.context.element.sessionId);
            if (widget) {
                this._register(widget?.onDidShow(() => {
                    renderedItem.reinitialize();
                }));
            }
        }, (error) => {
            // TODO: show error in UI too
            console.error('Error rendering tool output:', error);
        });
        return parent;
    }
};
ChatToolOutputSubPart = ChatToolOutputSubPart_1 = __decorate([
    __param(2, IChatOutputRendererService),
    __param(3, IChatWidgetService),
    __param(4, IInstantiationService)
], ChatToolOutputSubPart);
export { ChatToolOutputSubPart };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFRvb2xPdXRwdXRQYXJ0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvYWR2aWthci9Eb2N1bWVudHMvYXJjaGl0ZWN0L2FyY2gyL0FyY2hJREUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9icm93c2VyL2NoYXRDb250ZW50UGFydHMvdG9vbEludm9jYXRpb25QYXJ0cy9jaGF0VG9vbE91dHB1dFBhcnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0sdUNBQXVDLENBQUM7QUFDN0QsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLG9EQUFvRCxDQUFDO0FBQ3BGLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUN2RSxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQztBQUN4RixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFDcEUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQ3ZFLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUNyRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFDcEQsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sa0VBQWtFLENBQUM7QUFJekcsT0FBTyxFQUFzQixrQkFBa0IsRUFBRSxNQUFNLGVBQWUsQ0FBQztBQUN2RSxPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUU3RSxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUN2RSxPQUFPLEVBQUUsNkJBQTZCLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQU8vRSxtRkFBbUY7QUFDNUUsSUFBTSxxQkFBcUIsR0FBM0IsTUFBTSxxQkFBc0IsU0FBUSw2QkFBNkI7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