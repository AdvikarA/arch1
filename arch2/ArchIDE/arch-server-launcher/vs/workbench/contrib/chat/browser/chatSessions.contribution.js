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
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { localize } from '../../../../nls.js';
import { ContextKeyExpr, IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { Extensions as WorkbenchExtensions } from '../../../common/contributions.js';
import { IEditorGroupsService } from '../../../services/editor/common/editorGroupsService.js';
import { IExtensionService, isProposedApiEnabled } from '../../../services/extensions/common/extensions.js';
import { ExtensionsRegistry } from '../../../services/extensions/common/extensionsRegistry.js';
import { IChatWidgetService } from '../browser/chat.js';
import { ChatEditorInput } from '../browser/chatEditorInput.js';
import { IChatAgentService } from '../common/chatAgents.js';
import { IChatService } from '../common/chatService.js';
import { IChatSessionsService } from '../common/chatSessionsService.js';
import { ChatSessionUri } from '../common/chatUri.js';
import { ChatAgentLocation, ChatModeKind } from '../common/constants.js';
const extensionPoint = ExtensionsRegistry.registerExtensionPoint({
    extensionPoint: 'chatSessions',
    jsonSchema: {
        description: localize('chatSessionsExtPoint', 'Contributes chat session integrations to the chat widget.'),
        type: 'array',
        items: {
            type: 'object',
            properties: {
                id: {
                    description: localize('chatSessionsExtPoint.id', 'A unique identifier for this item.'),
                    type: 'string',
                },
                name: {
                    description: localize('chatSessionsExtPoint.name', 'Name shown in the chat widget. (eg: @agent)'),
                    type: 'string',
                },
                displayName: {
                    description: localize('chatSessionsExtPoint.displayName', 'A longer name for this item which is used for display in menus.'),
                    type: 'string',
                },
                description: {
                    description: localize('chatSessionsExtPoint.description', 'Description of the chat session for use in menus and tooltips.'),
                    type: 'string'
                },
                when: {
                    description: localize('chatSessionsExtPoint.when', 'Condition which must be true to show this item.'),
                    type: 'string'
                }
            },
            required: ['id', 'name', 'displayName', 'description'],
        }
    },
    activationEventsGenerator: (contribs, results) => {
        for (const contrib of contribs) {
            results.push(`onChatSession:${contrib.id}`);
        }
    }
});
let ChatSessionsContribution = class ChatSessionsContribution extends Disposable {
    constructor(logService, chatSessionsService) {
        super();
        this.logService = logService;
        this.chatSessionsService = chatSessionsService;
        extensionPoint.setHandler(extensions => {
            for (const ext of extensions) {
                if (!isProposedApiEnabled(ext.description, 'chatSessionsProvider')) {
                    continue;
                }
                if (!Array.isArray(ext.value)) {
                    continue;
                }
                for (const contribution of ext.value) {
                    const c = {
                        id: contribution.id,
                        name: contribution.name,
                        displayName: contribution.displayName,
                        description: contribution.description,
                        when: contribution.when,
                        extensionDescription: ext.description,
                    };
                    this.logService.info(`Registering chat session from extension contribution: ${c.displayName} (id='${c.id}' name='${c.name}')`);
                    this._register(this.chatSessionsService.registerContribution(c)); // TODO: Is it for contribution to own this? I think not
                }
            }
        });
    }
};
ChatSessionsContribution = __decorate([
    __param(0, ILogService),
    __param(1, IChatSessionsService)
], ChatSessionsContribution);
export { ChatSessionsContribution };
const workbenchRegistry = Registry.as(WorkbenchExtensions.Workbench);
workbenchRegistry.registerWorkbenchContribution(ChatSessionsContribution, 3 /* LifecyclePhase.Restored */);
class ContributedChatSessionData {
    constructor(session, chatSessionType, id, onWillDispose) {
        this.session = session;
        this.chatSessionType = chatSessionType;
        this.id = id;
        this.onWillDispose = onWillDispose;
    }
    dispose() {
        this.onWillDispose(this.session, this.chatSessionType, this.id);
        this.session.dispose();
    }
}
let ChatSessionsService = class ChatSessionsService extends Disposable {
    constructor(_logService, _instantiationService, _chatAgentService, _extensionService, _contextKeyService) {
        super();
        this._logService = _logService;
        this._instantiationService = _instantiationService;
        this._chatAgentService = _chatAgentService;
        this._extensionService = _extensionService;
        this._contextKeyService = _contextKeyService;
        this._itemsProviders = new Map();
        this._onDidChangeItemsProviders = this._register(new Emitter());
        this.onDidChangeItemsProviders = this._onDidChangeItemsProviders.event;
        this._contentProviders = new Map();
        this._contributions = new Map();
        this._dynamicAgentDisposables = new Map();
        this._contextKeys = new Set();
        this._onDidChangeSessionItems = this._register(new Emitter());
        this.onDidChangeSessionItems = this._onDidChangeSessionItems.event;
        this._onDidChangeAvailability = this._register(new Emitter());
        this.onDidChangeAvailability = this._onDidChangeAvailability.event;
        this._sessions = new Map();
        // Listen for context changes and re-evaluate contributions
        this._register(Event.filter(this._contextKeyService.onDidChangeContext, e => e.affectsSome(this._contextKeys))(() => {
            this._evaluateAvailability();
        }));
    }
    registerContribution(contribution) {
        if (this._contributions.has(contribution.id)) {
            this._logService.warn(`Chat session contribution with id '${contribution.id}' is already registered.`);
            return { dispose: () => { } };
        }
        // Track context keys from the when condition
        if (contribution.when) {
            const whenExpr = ContextKeyExpr.deserialize(contribution.when);
            if (whenExpr) {
                for (const key of whenExpr.keys()) {
                    this._contextKeys.add(key);
                }
            }
        }
        this._contributions.set(contribution.id, contribution);
        // Register dynamic agent if the when condition is satisfied
        this._registerDynamicAgentIfAvailable(contribution);
        return {
            dispose: () => {
                this._contributions.delete(contribution.id);
                this._disposeDynamicAgent(contribution.id);
            }
        };
    }
    _isContributionAvailable(contribution) {
        if (!contribution.when) {
            return true;
        }
        const whenExpr = ContextKeyExpr.deserialize(contribution.when);
        return !whenExpr || this._contextKeyService.contextMatchesRules(whenExpr);
    }
    _registerDynamicAgentIfAvailable(contribution) {
        if (this._isContributionAvailable(contribution)) {
            const disposable = this._registerDynamicAgent(contribution);
            this._dynamicAgentDisposables.set(contribution.id, disposable);
        }
    }
    _disposeDynamicAgent(contributionId) {
        const disposable = this._dynamicAgentDisposables.get(contributionId);
        if (disposable) {
            disposable.dispose();
            this._dynamicAgentDisposables.delete(contributionId);
        }
    }
    _evaluateAvailability() {
        let hasChanges = false;
        for (const contribution of this._contributions.values()) {
            const isCurrentlyRegistered = this._dynamicAgentDisposables.has(contribution.id);
            const shouldBeRegistered = this._isContributionAvailable(contribution);
            if (isCurrentlyRegistered && !shouldBeRegistered) {
                // Should be unregistered
                this._disposeDynamicAgent(contribution.id);
                // Also dispose any cached sessions for this contribution
                this._disposeSessionsForContribution(contribution.id);
                hasChanges = true;
            }
            else if (!isCurrentlyRegistered && shouldBeRegistered) {
                // Should be registered
                this._registerDynamicAgentIfAvailable(contribution);
                hasChanges = true;
            }
        }
        // Fire events to notify UI about provider availability changes
        if (hasChanges) {
            // Fire the main availability change event
            this._onDidChangeAvailability.fire();
            // Notify that the list of available item providers has changed
            for (const provider of this._itemsProviders.values()) {
                this._onDidChangeItemsProviders.fire(provider);
            }
            // Notify about session items changes for all chat session types
            for (const contribution of this._contributions.values()) {
                this._onDidChangeSessionItems.fire(contribution.id);
            }
        }
    }
    _disposeSessionsForContribution(contributionId) {
        // Find and dispose all sessions that belong to this contribution
        const sessionsToDispose = [];
        for (const [sessionKey, sessionData] of this._sessions) {
            if (sessionData.chatSessionType === contributionId) {
                sessionsToDispose.push(sessionKey);
            }
        }
        if (sessionsToDispose.length > 0) {
            this._logService.info(`Disposing ${sessionsToDispose.length} cached sessions for contribution '${contributionId}' due to when clause change`);
        }
        for (const sessionKey of sessionsToDispose) {
            const sessionData = this._sessions.get(sessionKey);
            if (sessionData) {
                sessionData.dispose(); // This will call _onWillDisposeSession and clean up
            }
        }
    }
    _registerDynamicAgent(contribution) {
        const { id, name, displayName, description, extensionDescription } = contribution;
        const { identifier: extensionId, name: extensionName, displayName: extensionDisplayName, publisher: extensionPublisherId } = extensionDescription;
        const agentData = {
            id,
            name,
            fullName: displayName,
            description: description,
            isDefault: false,
            isCore: false,
            isDynamic: true,
            isCodingAgent: true, // TODO: Influences chat UI (eg: locks chat to participant, hides UX elements, etc...)
            slashCommands: [],
            locations: [ChatAgentLocation.Panel], // TODO: This doesn't appear to be respected
            modes: [ChatModeKind.Agent, ChatModeKind.Ask], // TODO: These are no longer respected
            disambiguation: [],
            metadata: {
                themeIcon: Codicon.sendToRemoteAgent,
                isSticky: false,
            },
            extensionId,
            extensionDisplayName: extensionDisplayName || extensionName,
            extensionPublisherId,
        };
        const agentImpl = this._instantiationService.createInstance(CodingAgentChatImplementation, contribution);
        const disposable = this._chatAgentService.registerDynamicAgent(agentData, agentImpl);
        return disposable;
    }
    getChatSessionContributions() {
        return Array.from(this._contributions.values()).filter(contribution => this._isContributionAvailable(contribution));
    }
    getChatSessionItemProviders() {
        return [...this._itemsProviders.values()].filter(provider => {
            // Check if the provider's corresponding contribution is available
            const contribution = this._contributions.get(provider.chatSessionType);
            return !contribution || this._isContributionAvailable(contribution);
        });
    }
    async canResolveItemProvider(chatViewType) {
        // First check if the contribution is available based on its when clause
        const contribution = this._contributions.get(chatViewType);
        if (contribution && !this._isContributionAvailable(contribution)) {
            return false;
        }
        if (this._itemsProviders.has(chatViewType)) {
            return true;
        }
        await this._extensionService.whenInstalledExtensionsRegistered();
        await this._extensionService.activateByEvent(`onChatSession:${chatViewType}`);
        return this._itemsProviders.has(chatViewType);
    }
    notifySessionItemsChange(chatSessionType) {
        this._onDidChangeSessionItems.fire(chatSessionType);
    }
    async canResolveContentProvider(chatViewType) {
        // First check if the contribution is available based on its when clause
        const contribution = this._contributions.get(chatViewType);
        if (contribution && !this._isContributionAvailable(contribution)) {
            return false;
        }
        if (this._contentProviders.has(chatViewType)) {
            return true;
        }
        await this._extensionService.whenInstalledExtensionsRegistered();
        await this._extensionService.activateByEvent(`onChatSession:${chatViewType}`);
        return this._contentProviders.has(chatViewType);
    }
    async provideChatSessionItems(chatSessionType, token) {
        if (!(await this.canResolveItemProvider(chatSessionType))) {
            throw Error(`Can not find provider for ${chatSessionType}`);
        }
        const provider = this._itemsProviders.get(chatSessionType);
        if (provider?.provideChatSessionItems) {
            const sessions = await provider.provideChatSessionItems(token);
            return sessions;
        }
        return [];
    }
    registerChatSessionItemProvider(provider) {
        const chatSessionType = provider.chatSessionType;
        this._itemsProviders.set(chatSessionType, provider);
        this._onDidChangeItemsProviders.fire(provider);
        return {
            dispose: () => {
                const provider = this._itemsProviders.get(chatSessionType);
                if (provider) {
                    this._itemsProviders.delete(chatSessionType);
                    this._onDidChangeItemsProviders.fire(provider);
                }
            }
        };
    }
    registerChatSessionContentProvider(provider) {
        this._contentProviders.set(provider.chatSessionType, provider);
        return {
            dispose: () => {
                this._contentProviders.delete(provider.chatSessionType);
                // Remove all sessions that were created by this provider
                for (const [key, session] of this._sessions) {
                    if (session.chatSessionType === provider.chatSessionType) {
                        session.dispose();
                        this._sessions.delete(key);
                    }
                }
            }
        };
    }
    async provideChatSessionContent(chatSessionType, id, token) {
        if (!(await this.canResolveContentProvider(chatSessionType))) {
            throw Error(`Can not find provider for ${chatSessionType}`);
        }
        const provider = this._contentProviders.get(chatSessionType);
        if (!provider) {
            throw Error(`Can not find provider for ${chatSessionType}`);
        }
        const sessionKey = `${chatSessionType}_${id}`;
        const existingSessionData = this._sessions.get(sessionKey);
        if (existingSessionData) {
            return existingSessionData.session;
        }
        const session = await provider.provideChatSessionContent(id, token);
        const sessionData = new ContributedChatSessionData(session, chatSessionType, id, this._onWillDisposeSession.bind(this));
        this._sessions.set(sessionKey, sessionData);
        return session;
    }
    _onWillDisposeSession(session, chatSessionType, id) {
        const sessionKey = `${chatSessionType}_${id}`;
        this._sessions.delete(sessionKey);
    }
    get hasChatSessionItemProviders() {
        return this._itemsProviders.size > 0;
    }
};
ChatSessionsService = __decorate([
    __param(0, ILogService),
    __param(1, IInstantiationService),
    __param(2, IChatAgentService),
    __param(3, IExtensionService),
    __param(4, IContextKeyService)
], ChatSessionsService);
export { ChatSessionsService };
registerSingleton(IChatSessionsService, ChatSessionsService, 1 /* InstantiationType.Delayed */);
/**
 * Implementation for individual remote coding agent chat functionality
 */
let CodingAgentChatImplementation = class CodingAgentChatImplementation extends Disposable {
    constructor(chatSession, chatService, chatWidgetService, editorGroupService, chatSessionService) {
        super();
        this.chatSession = chatSession;
        this.chatService = chatService;
        this.chatWidgetService = chatWidgetService;
        this.editorGroupService = editorGroupService;
        this.chatSessionService = chatSessionService;
    }
    async invoke(request, progress, history, token) {
        const widget = this.chatWidgetService.getWidgetBySessionId(request.sessionId);
        if (!widget) {
            return {};
        }
        let chatSession;
        // Find the first editor that matches the chat session
        for (const group of this.editorGroupService.groups) {
            if (chatSession) {
                break;
            }
            for (const editor of group.editors) {
                if (editor instanceof ChatEditorInput) {
                    try {
                        const chatModel = await this.chatService.loadSessionForResource(editor.resource, request.location, CancellationToken.None);
                        if (chatModel?.sessionId === request.sessionId) {
                            // this is the model
                            const identifier = ChatSessionUri.parse(editor.resource);
                            if (identifier) {
                                chatSession = await this.chatSessionService.provideChatSessionContent(this.chatSession.id, identifier.sessionId, token);
                            }
                            break;
                        }
                    }
                    catch (error) {
                        // might not be us
                    }
                }
            }
        }
        if (chatSession?.requestHandler) {
            await chatSession.requestHandler(request, progress, [], token);
        }
        return {};
    }
};
CodingAgentChatImplementation = __decorate([
    __param(1, IChatService),
    __param(2, IChatWidgetService),
    __param(3, IEditorGroupsService),
    __param(4, IChatSessionsService)
], CodingAgentChatImplementation);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFNlc3Npb25zLmNvbnRyaWJ1dGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL2FkdmlrYXIvRG9jdW1lbnRzL2FyY2hpdGVjdC9hcmNoMi9BcmNoSURFL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvYnJvd3Nlci9jaGF0U2Vzc2lvbnMuY29udHJpYnV0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQzVFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUM5RCxPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxVQUFVLEVBQWUsTUFBTSxzQ0FBc0MsQ0FBQztBQUMvRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDOUMsT0FBTyxFQUFFLGNBQWMsRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQzFHLE9BQU8sRUFBcUIsaUJBQWlCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUMvRyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNuRyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDckUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQzVFLE9BQU8sRUFBMkQsVUFBVSxJQUFJLG1CQUFtQixFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDOUksT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sd0RBQXdELENBQUM7QUFDOUYsT0FBTyxFQUFFLGlCQUFpQixFQUFFLG9CQUFvQixFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDNUcsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0s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