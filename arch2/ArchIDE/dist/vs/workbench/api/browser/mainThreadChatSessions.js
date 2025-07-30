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
import { raceCancellationError } from '../../../base/common/async.js';
import { Emitter } from '../../../base/common/event.js';
import { Disposable, DisposableMap } from '../../../base/common/lifecycle.js';
import { revive } from '../../../base/common/marshalling.js';
import { URI } from '../../../base/common/uri.js';
import { ILogService } from '../../../platform/log/common/log.js';
import { ChatViewId } from '../../contrib/chat/browser/chat.js';
import { IChatSessionsService } from '../../contrib/chat/common/chatSessionsService.js';
import { ChatSessionUri } from '../../contrib/chat/common/chatUri.js';
import { IEditorService } from '../../services/editor/common/editorService.js';
import { extHostNamedCustomer } from '../../services/extensions/common/extHostCustomers.js';
import { IViewsService } from '../../services/views/common/viewsService.js';
import { ExtHostContext, MainContext } from '../common/extHost.protocol.js';
let MainThreadChatSessions = class MainThreadChatSessions extends Disposable {
    constructor(_extHostContext, _chatSessionsService, _editorService, _logService, _viewsService) {
        super();
        this._extHostContext = _extHostContext;
        this._chatSessionsService = _chatSessionsService;
        this._editorService = _editorService;
        this._logService = _logService;
        this._viewsService = _viewsService;
        this._itemProvidersRegistrations = this._register(new DisposableMap());
        this._contentProvidersRegisterations = this._register(new DisposableMap());
        // Store progress emitters for active sessions: key is `${handle}_${sessionId}_${requestId}`
        this._activeProgressEmitters = new Map();
        // Store completion emitters for sessions: key is `${handle}_${sessionId}_${requestId}`
        this._completionEmitters = new Map();
        // Store pending progress chunks for sessions that haven't set up emitters yet
        this._pendingProgressChunks = new Map();
        this._proxy = this._extHostContext.getProxy(ExtHostContext.ExtHostChatSessions);
    }
    $registerChatSessionItemProvider(handle, chatSessionType, label) {
        // Register the provider handle - this tracks that a provider exists
        const provider = {
            label,
            chatSessionType,
            provideChatSessionItems: (token) => this._provideChatSessionItems(handle, token)
        };
        this._itemProvidersRegistrations.set(handle, this._chatSessionsService.registerChatSessionItemProvider(provider));
    }
    $onDidChangeChatSessionItems(chatSessionType) {
        // Notify the provider that its chat session items have changed
        this._chatSessionsService.notifySessionItemsChange(chatSessionType);
    }
    async _provideChatSessionItems(handle, token) {
        try {
            // Get all results as an array from the RPC call
            const sessions = await this._proxy.$provideChatSessionItems(handle, token);
            return sessions.map(session => ({
                ...session,
                id: session.id,
                iconPath: session.iconPath ? this._reviveIconPath(session.iconPath) : undefined
            }));
        }
        catch (error) {
            this._logService.error('Error providing chat sessions:', error);
        }
        return [];
    }
    async _provideChatSessionContent(providerHandle, id, token) {
        try {
            const sessionContent = await raceCancellationError(this._proxy.$provideChatSessionContent(providerHandle, id, token), token);
            const progressEmitter = new Emitter;
            const completionEmitter = new Emitter();
            let progressEvent = undefined;
            if (sessionContent.hasActiveResponseCallback) {
                const requestId = 'ongoing';
                // set progress
                progressEvent = progressEmitter.event;
                // store the event emitter using a key that combines handle and session id
                const progressKey = `${providerHandle}_${id}_${requestId}`;
                this._activeProgressEmitters.set(progressKey, progressEmitter);
                this._completionEmitters.set(progressKey, completionEmitter);
            }
            let requestHandler;
            if (sessionContent.hasRequestHandler) {
                requestHandler = async (request, progress, history, token) => {
                    const progressKey = `${providerHandle}_${id}_${request.requestId}`;
                    const _progressEmitter = new Emitter;
                    this._activeProgressEmitters.set(progressKey, _progressEmitter);
                    _progressEmitter.event(e => {
                        progress(e);
                    });
                    await this._proxy.$invokeChatSessionRequestHandler(providerHandle, id, request, [], token);
                };
            }
            return {
                id: sessionContent.id,
                history: sessionContent.history.map(turn => {
                    if (turn.type === 'request') {
                        return { type: 'request', prompt: turn.prompt };
                    }
                    return {
                        type: 'response',
                        parts: turn.parts.map(part => revive(part))
                    };
                }),
                progressEvent: progressEvent,
                requestHandler: requestHandler,
                dispose: () => {
                    progressEmitter.dispose();
                    completionEmitter.dispose();
                    this._proxy.$disposeChatSessionContent(providerHandle, sessionContent.id);
                },
            };
        }
        catch (error) {
            this._logService.error(`Error providing chat session content for handle ${providerHandle} and id ${id}:`, error);
            throw error; // Re-throw to propagate the error
        }
    }
    $unregisterChatSessionItemProvider(handle) {
        this._itemProvidersRegistrations.deleteAndDispose(handle);
    }
    $registerChatSessionContentProvider(handle, chatSessionType) {
        const provider = {
            chatSessionType,
            provideChatSessionContent: (id, token) => this._provideChatSessionContent(handle, id, token)
        };
        this._contentProvidersRegisterations.set(handle, this._chatSessionsService.registerChatSessionContentProvider(provider));
    }
    $unregisterChatSessionContentProvider(handle) {
        this._contentProvidersRegisterations.deleteAndDispose(handle);
    }
    async $handleProgressChunk(handle, sessionId, requestId, chunks) {
        const progressKey = `${handle}_${sessionId}_${requestId}`;
        const progressEmitter = this._activeProgressEmitters.get(progressKey);
        if (!progressEmitter) {
            // If the progress emitter hasn't been set up yet, store the chunks for later
            const existingChunks = this._pendingProgressChunks.get(progressKey) || [];
            this._pendingProgressChunks.set(progressKey, [...existingChunks, ...chunks]);
            this._logService.debug(`Storing pending progress chunks for handle ${handle}, sessionId ${sessionId}, requestId ${requestId}`);
            return;
        }
        // First, flush any pending chunks that were stored before the emitter was ready
        const pendingChunks = this._pendingProgressChunks.get(progressKey);
        if (pendingChunks && pendingChunks.length > 0) {
            this._logService.debug(`Flushing ${pendingChunks.length} pending progress chunks for handle ${handle}, sessionId ${sessionId}, requestId ${requestId}`);
            const pendingProgressParts = pendingChunks.map(chunk => {
                const [progress] = Array.isArray(chunk) ? chunk : [chunk];
                return revive(progress);
            });
            progressEmitter.fire(pendingProgressParts);
            this._pendingProgressChunks.delete(progressKey);
        }
        // Then emit the current chunks
        const chatProgressParts = chunks.map(chunk => {
            const [progress] = Array.isArray(chunk) ? chunk : [chunk];
            return revive(progress);
        });
        progressEmitter.fire(chatProgressParts);
    }
    $handleProgressComplete(handle, sessionId, requestId) {
        const progressKey = `${handle}_${sessionId}_${requestId}`;
        const progressEmitter = this._activeProgressEmitters.get(progressKey);
        const completionEmitter = this._completionEmitters.get(progressKey);
        if (!progressEmitter) {
            this._logService.warn(`No progress emitter found for handle ${handle} and requestId ${requestId}`);
            return;
        }
        // TODO: Fire a completion event through the progress emitter
        const completionProgress = {
            kind: 'progressMessage',
            content: { value: 'Session completed', isTrusted: false }
        };
        progressEmitter.fire([completionProgress]);
        // Fire completion event if someone is listening
        if (completionEmitter) {
            completionEmitter.fire();
        }
        // Clean up the emitters and any pending chunks
        progressEmitter.dispose();
        completionEmitter?.dispose();
        this._activeProgressEmitters.delete(progressKey);
        this._completionEmitters.delete(progressKey);
        this._pendingProgressChunks.delete(progressKey);
    }
    $handleAnchorResolve(handle, sessionId, requestId, requestHandle, anchor) {
        // throw new Error('Method not implemented.');
    }
    dispose() {
        // Clean up all active progress emitters
        for (const emitter of this._activeProgressEmitters.values()) {
            emitter.dispose();
        }
        this._activeProgressEmitters.clear();
        // Clean up all completion emitters
        for (const emitter of this._completionEmitters.values()) {
            emitter.dispose();
        }
        this._completionEmitters.clear();
        // Clean up all pending progress chunks
        this._pendingProgressChunks.clear();
        super.dispose();
    }
    _reviveIconPath(iconPath) {
        if (!iconPath) {
            return undefined;
        }
        // Handle ThemeIcon (has id property)
        if (typeof iconPath === 'object' && 'id' in iconPath) {
            return iconPath; // ThemeIcon doesn't need conversion
        }
        // handle single URI
        if (typeof iconPath === 'object' && 'scheme' in iconPath) {
            return URI.revive(iconPath);
        }
        // Handle light/dark theme icons
        if (typeof iconPath === 'object' && ('light' in iconPath && 'dark' in iconPath)) {
            return {
                light: URI.revive(iconPath.light),
                dark: URI.revive(iconPath.dark)
            };
        }
        return undefined;
    }
    async $showChatSession(chatSessionType, sessionId, position) {
        const sessionUri = ChatSessionUri.forSession(chatSessionType, sessionId);
        if (typeof position === 'undefined') {
            const chatPanel = await this._viewsService.openView(ChatViewId);
            await chatPanel?.loadSession(sessionUri);
        }
        else {
            await this._editorService.openEditor({
                resource: sessionUri,
                options: { pinned: true },
            }, position);
        }
    }
};
MainThreadChatSessions = __decorate([
    extHostNamedCustomer(MainContext.MainThreadChatSessions),
    __param(1, IChatSessionsService),
    __param(2, IEditorService),
    __param(3, ILogService),
    __param(4, IViewsService)
], MainThreadChatSessions);
export { MainThreadChatSessions };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZENoYXRTZXNzaW9ucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL2FkdmlrYXIvRG9jdW1lbnRzL2FyY2hpdGVjdC9hcmNoMi9BcmNoSURFL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvYnJvd3Nlci9tYWluVGhyZWFkQ2hhdFNlc3Npb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBRXRFLE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSwrQkFBK0IsQ0FBQztBQUMvRCxPQUFPLEVBQUUsVUFBVSxFQUFFLGFBQWEsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQzlFLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUM3RCxPQUFPLEVBQUUsR0FBRyxFQUFpQixNQUFNLDZCQUE2QixDQUFDO0FBQ2pFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUNsRSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFJaEUsT0FBTyxFQUF3RixvQkFBb0IsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQzlLLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUV0RSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sK0NBQStDLENBQUM7QUFDL0UsT0FBTyxFQUFFLG9CQUFvQixFQUFtQixNQUFNLHNEQUFzRCxDQUFDO0FBRTdHLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUM1RSxPQUFPLEVBQTRCLGNBQWMsRUFBb0IsV0FBVyxFQUErQixNQUFNLCtCQUErQixDQUFDO0FBRzlJLElBQU0sc0JBQXNCLEdBQTVCLE1BQU0sc0JBQXVCLFNBQVEsVUFBVTtJQWVyRCxZQUNrQixlQUFnQyxFQUMzQixvQkFB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