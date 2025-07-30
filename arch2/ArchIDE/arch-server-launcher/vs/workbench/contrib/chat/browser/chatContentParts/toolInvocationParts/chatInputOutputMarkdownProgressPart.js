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
var ChatInputOutputMarkdownProgressPart_1;
import { decodeBase64 } from '../../../../../../base/common/buffer.js';
import { toDisposable } from '../../../../../../base/common/lifecycle.js';
import { getExtensionForMimeType } from '../../../../../../base/common/mime.js';
import { autorun } from '../../../../../../base/common/observable.js';
import { basename } from '../../../../../../base/common/resources.js';
import { ILanguageService } from '../../../../../../editor/common/languages/language.js';
import { IModelService } from '../../../../../../editor/common/services/model.js';
import { IInstantiationService } from '../../../../../../platform/instantiation/common/instantiation.js';
import { ChatResponseResource } from '../../../common/chatModel.js';
import { isResponseVM } from '../../../common/chatViewModel.js';
import { ChatCollapsibleInputOutputContentPart } from '../chatToolInputOutputContentPart.js';
import { BaseChatToolInvocationSubPart } from './chatToolInvocationSubPart.js';
let ChatInputOutputMarkdownProgressPart = class ChatInputOutputMarkdownProgressPart extends BaseChatToolInvocationSubPart {
    static { ChatInputOutputMarkdownProgressPart_1 = this; }
    /** Remembers expanded tool parts on re-render */
    static { this._expandedByDefault = new WeakMap(); }
    get codeblocks() {
        return this._codeblocks;
    }
    constructor(toolInvocation, context, editorPool, codeBlockStartIndex, message, subtitle, input, output, isError, currentWidthDelegate, instantiationService, modelService, languageService) {
        super(toolInvocation);
        this._codeblocks = [];
        let codeBlockIndex = codeBlockStartIndex;
        const toCodePart = (data) => {
            const model = this._register(modelService.createModel(data, languageService.createById('json'), undefined, true));
            return {
                kind: 'code',
                textModel: model,
                languageId: model.getLanguageId(),
                options: {
                    hideToolbar: true,
                    reserveWidth: 19,
                    maxHeightInLines: 13,
                    verticalPadding: 5,
                    editorOptions: {
                        wordWrap: 'on'
                    }
                },
                codeBlockInfo: {
                    codeBlockIndex: codeBlockIndex++,
                    codemapperUri: undefined,
                    elementId: context.element.id,
                    focus: () => { },
                    isStreaming: false,
                    ownerMarkdownPartId: this.codeblocksPartId,
                    uri: model.uri,
                    chatSessionId: context.element.sessionId,
                    uriPromise: Promise.resolve(model.uri)
                }
            };
        };
        let processedOutput = output;
        if (typeof output === 'string') { // back compat with older stored versions
            processedOutput = [{ type: 'embed', value: output, isText: true }];
        }
        const requestId = isResponseVM(context.element) ? context.element.requestId : context.element.id;
        const collapsibleListPart = this._register(instantiationService.createInstance(ChatCollapsibleInputOutputContentPart, message, subtitle, context, editorPool, toCodePart(input), processedOutput && {
            parts: processedOutput.map((o, i) => {
                const permalinkBasename = o.type === 'ref' || o.uri
                    ? basename(o.uri)
                    : o.mimeType && getExtensionForMimeType(o.mimeType)
                        ? `file${getExtensionForMimeType(o.mimeType)}`
                        : 'file' + (o.isText ? '.txt' : '.bin');
                if (o.type === 'ref') {
                    return { kind: 'data', uri: o.uri, mimeType: o.mimeType };
                }
                else if (o.isText && !o.asResource) {
                    return toCodePart(o.value);
                }
                else {
                    let decoded;
                    try {
                        if (!o.isText) {
                            decoded = decodeBase64(o.value).buffer;
                        }
                    }
                    catch {
                        // ignored
                    }
                    // Fall back to text if it's not valid base64
                    const permalinkUri = ChatResponseResource.createUri(context.element.sessionId, requestId, toolInvocation.toolCallId, i, permalinkBasename);
                    return { kind: 'data', value: decoded || new TextEncoder().encode(o.value), mimeType: o.mimeType, uri: permalinkUri };
                }
            }),
        }, isError, ChatInputOutputMarkdownProgressPart_1._expandedByDefault.get(toolInvocation) ?? false, currentWidthDelegate()));
        this._codeblocks.push(...collapsibleListPart.codeblocks);
        this._register(collapsibleListPart.onDidChangeHeight(() => this._onDidChangeHeight.fire()));
        this._register(toDisposable(() => ChatInputOutputMarkdownProgressPart_1._expandedByDefault.set(toolInvocation, collapsibleListPart.expanded)));
        const progressObservable = toolInvocation.kind === 'toolInvocation' ? toolInvocation.progress : undefined;
        if (progressObservable) {
            this._register(autorun(reader => {
                const progress = progressObservable?.read(reader);
                if (progress.message) {
                    collapsibleListPart.title = progress.message;
                }
            }));
        }
        this.domNode = collapsibleListPart.domNode;
    }
};
ChatInputOutputMarkdownProgressPart = ChatInputOutputMarkdownProgressPart_1 = __decorate([
    __param(10, IInstantiationService),
    __param(11, IModelService),
    __param(12, ILanguageService)
], ChatInputOutputMarkdownProgressPart);
export { ChatInputOutputMarkdownProgressPart };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdElucHV0T3V0cHV0TWFya2Rvd25Qcm9ncmVzc1BhcnQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9hZHZpa2FyL0RvY3VtZW50cy9hcmNoaXRlY3QvYXJjaDIvQXJjaElERS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2Jyb3dzZXIvY2hhdENvbnRlbnRQYXJ0cy90b29sSW52b2NhdGlvblBhcnRzL2NoYXRJbnB1dE91dHB1dE1hcmtkb3duUHJvZ3Jlc3NQYXJ0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFFdkUsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQzFFLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQ2hGLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUN0RSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDdEUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sdURBQXVELENBQUM7QUFDekYsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBQ2xGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLGtFQUFrRSxDQUFDO0FBQ3pHLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBRXBFLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUtoRSxPQUFPLEVBQUUscUNBQXFDLEVBQXFELE1BQU0sc0NBQXNDLENBQUM7QUFDaEosT0FBTyxFQUFFLDZCQUE2QixFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFFeEUsSUFBTSxtQ0FBbUMsR0FBekMsTUFBTSxtQ0FBb0MsU0FBUSw2QkFBNkI7O0lBQ3JGLGlEQUFpRDth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