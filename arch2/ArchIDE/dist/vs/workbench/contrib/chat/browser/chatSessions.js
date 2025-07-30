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
var LocalChatSessionsProvider_1, SessionsRenderer_1;
import './media/chatSessions.css';
import * as nls from '../../../../nls.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { SyncDescriptor } from '../../../../platform/instantiation/common/descriptors.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { IContextKeyService, ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
import { ViewPaneContainer } from '../../../browser/parts/views/viewPaneContainer.js';
import { ViewPane } from '../../../browser/parts/views/viewPane.js';
import { Extensions, IViewDescriptorService } from '../../../common/views.js';
import { IExtensionService } from '../../../services/extensions/common/extensions.js';
import { IWorkbenchLayoutService } from '../../../services/layout/browser/layoutService.js';
import { WorkbenchAsyncDataTree } from '../../../../platform/list/browser/listService.js';
import { IChatSessionsService } from '../common/chatSessionsService.js';
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { ResourceLabels } from '../../../browser/labels.js';
import { ActionBar } from '../../../../base/browser/ui/actionbar/actionbar.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { append, $, getActiveWindow } from '../../../../base/browser/dom.js';
import { URI } from '../../../../base/common/uri.js';
import { IEditorGroupsService } from '../../../services/editor/common/editorGroupsService.js';
import { Emitter } from '../../../../base/common/event.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { ChatEditorInput } from './chatEditorInput.js';
import { IChatWidgetService } from './chat.js';
import { ChatAgentLocation, ChatConfiguration } from '../common/constants.js';
import { MenuId, MenuRegistry } from '../../../../platform/actions/common/actions.js';
import { registerIcon } from '../../../../platform/theme/common/iconRegistry.js';
import { IViewsService } from '../../../services/views/common/viewsService.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { ChatSessionUri } from '../common/chatUri.js';
export const VIEWLET_ID = 'workbench.view.chat.sessions';
let ChatSessionsView = class ChatSessionsView extends Disposable {
    static { this.ID = 'workbench.contrib.chatSessions'; }
    constructor(configurationService) {
        super();
        this.configurationService = configurationService;
        this.isViewContainerRegistered = false;
        // Initial check
        this.updateViewContainerRegistration();
        // Listen for configuration changes
        this._register(this.configurationService.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration(ChatConfiguration.AgentSessionsViewLocation)) {
                this.updateViewContainerRegistration();
            }
        }));
    }
    updateViewContainerRegistration() {
        const location = this.configurationService.getValue(ChatConfiguration.AgentSessionsViewLocation);
        if (location === 'view' && !this.isViewContainerRegistered) {
            this.registerViewContainer();
        }
        else if (location !== 'view' && this.isViewContainerRegistered) {
            // Note: VS Code doesn't support unregistering view containers
            // Once registered, they remain registered for the session
            // but you could hide them or make them conditional through 'when' clauses
        }
    }
    registerViewContainer() {
        if (this.isViewContainerRegistered) {
            return;
        }
        Registry.as(Extensions.ViewContainersRegistry).registerViewContainer({
            id: VIEWLET_ID,
            title: nls.localize2('chat.sessions', "Chat Sessions"),
            ctorDescriptor: new SyncDescriptor(ChatSessionsViewPaneContainer),
            hideIfEmpty: false,
            icon: registerIcon('chat-sessions-icon', Codicon.commentDiscussion, 'Icon for Chat Sessions View'),
            order: 10
        }, 0 /* ViewContainerLocation.Sidebar */);
    }
};
ChatSessionsView = __decorate([
    __param(0, IConfigurationService)
], ChatSessionsView);
export { ChatSessionsView };
// Local Chat Sessions Provider - tracks open editors as chat sessions
let LocalChatSessionsProvider = class LocalChatSessionsProvider extends Disposable {
    static { LocalChatSessionsProvider_1 = this; }
    static { this.CHAT_WIDGET_VIEW_ID = 'workbench.panel.chat.view.copilot'; }
    constructor(editorGroupService, chatWidgetService) {
        super();
        this.editorGroupService = editorGroupService;
        this.chatWidgetService = chatWidgetService;
        this.chatSessionType = 'local';
        this.label = 'Local Chat Sessions';
        this._onDidChange = this._register(new Emitter());
        this.onDidChange = this._onDidChange.event;
        // Track the current editor set to detect actual new additions
        this.currentEditorSet = new Set();
        // Maintain ordered list of editor keys to preserve consistent ordering
        this.editorOrder = [];
        this.initializeCurrentEditorSet();
        this.registerEditorListeners();
        this.registerWidgetListeners();
    }
    registerWidgetListeners() {
        // Listen for new chat widgets being added/removed
        this._register(this.chatWidgetService.onDidAddWidget(widget => {
            // Only fire for chat view instance
            if (widget.location === ChatAgentLocation.Panel &&
                typeof widget.viewContext === 'object' &&
                'viewId' in widget.viewContext &&
                widget.viewContext.viewId === LocalChatSessionsProvider_1.CHAT_WIDGET_VIEW_ID) {
                this._onDidChange.fire();
                // Listen for view model changes on this widget
                this._register(widget.onDidChangeViewModel(() => {
                    this._onDidChange.fire();
                }));
                // Listen for title changes on the current model
                this.registerModelTitleListener(widget);
            }
        }));
        // Check for existing chat widgets and register listeners
        const existingWidgets = this.chatWidgetService.getWidgetsByLocations(ChatAgentLocation.Panel)
            .filter(widget => typeof widget.viewContext === 'object' && 'viewId' in widget.viewContext && widget.viewContext.viewId === LocalChatSessionsProvider_1.CHAT_WIDGET_VIEW_ID);
        existingWidgets.forEach(widget => {
            this._register(widget.onDidChangeViewModel(() => {
                this._onDidChange.fire();
                this.registerModelTitleListener(widget);
            }));
            // Register title listener for existing widget
            this.registerModelTitleListener(widget);
        });
    }
    registerModelTitleListener(widget) {
        const model = widget.viewModel?.model;
        if (model) {
            // Listen for model changes to detect title changes
            // Since setCustomTitle doesn't fire an event, we listen to general model changes
            this._register(model.onDidChange(() => {
                this._onDidChange.fire();
            }));
        }
    }
    initializeCurrentEditorSet() {
        this.currentEditorSet.clear();
        this.editorOrder = []; // Reset the order
        this.editorGroupService.groups.forEach(group => {
            group.editors.forEach(editor => {
                if (this.isLocalChatSession(editor)) {
                    const key = this.getEditorKey(editor, group);
                    this.currentEditorSet.add(key);
                    this.editorOrder.push(key);
                }
            });
        });
    }
    getEditorKey(editor, group) {
        return `${group.id}-${editor.typeId}-${editor.resource?.toString() || editor.getName()}`;
    }
    registerEditorListeners() {
        // Listen to all groups for editor changes
        this.editorGroupService.groups.forEach(group => this.registerGroupListeners(group));
        // Listen for new groups
        this._register(this.editorGroupService.onDidAddGroup(group => {
            this.registerGroupListeners(group);
            this.initializeCurrentEditorSet(); // Refresh our tracking
            this._onDidChange.fire();
        }));
        this._register(this.editorGroupService.onDidRemoveGroup(() => {
            this.initializeCurrentEditorSet(); // Refresh our tracking
            this._onDidChange.fire();
        }));
    }
    isLocalChatSession(editor) {
        if (!(editor instanceof ChatEditorInput)) {
            return false; // Only track ChatEditorInput instances
        }
        return editor.resource?.scheme === 'vscode-chat-editor';
    }
    registerGroupListeners(group) {
        this._register(group.onDidModelChange(e => {
            if (!this.isLocalChatSession(e.editor)) {
                return;
            }
            switch (e.kind) {
                case 5 /* GroupModelChangeKind.EDITOR_OPEN */:
                    // Only fire change if this is a truly new editor
                    if (e.editor) {
                        const editorKey = this.getEditorKey(e.editor, group);
                        if (!this.currentEditorSet.has(editorKey)) {
                            this.currentEditorSet.add(editorKey);
                            this.editorOrder.push(editorKey); // Append to end
                            this._onDidChange.fire();
                        }
                    }
                    break;
                case 6 /* GroupModelChangeKind.EDITOR_CLOSE */:
                    // Remove from our tracking set and fire change
                    if (e.editor) {
                        const editorKey = this.getEditorKey(e.editor, group);
                        this.currentEditorSet.delete(editorKey);
                        const index = this.editorOrder.indexOf(editorKey);
                        if (index > -1) {
                            this.editorOrder.splice(index, 1);
                        }
                    }
                    this._onDidChange.fire();
                    break;
                case 7 /* GroupModelChangeKind.EDITOR_MOVE */:
                    // Just refresh the set without resetting the order
                    this.currentEditorSet.clear();
                    this.editorGroupService.groups.forEach(group => {
                        group.editors.forEach(editor => {
                            const key = this.getEditorKey(editor, group);
                            this.currentEditorSet.add(key);
                        });
                    });
                    this._onDidChange.fire();
                    break;
                case 8 /* GroupModelChangeKind.EDITOR_ACTIVE */:
                    // Editor became active - no need to change our list
                    // This happens when clicking on tabs or opening editors
                    break;
                case 9 /* GroupModelChangeKind.EDITOR_LABEL */:
                    this._onDidChange.fire();
                    break;
            }
        }));
    }
    async provideChatSessionItems(token) {
        const sessions = [];
        // Create a map to quickly find editors by their key
        const editorMap = new Map();
        this.editorGroupService.groups.forEach(group => {
            group.editors.forEach(editor => {
                if (editor instanceof ChatEditorInput) {
                    const key = this.getEditorKey(editor, group);
                    editorMap.set(key, { editor, group });
                }
            });
        });
        // Add chat view instance
        const chatWidget = this.chatWidgetService.getWidgetsByLocations(ChatAgentLocation.Panel)
            .find(widget => typeof widget.viewContext === 'object' && 'viewId' in widget.viewContext && widget.viewContext.viewId === LocalChatSessionsProvider_1.CHAT_WIDGET_VIEW_ID);
        if (chatWidget) {
            sessions.push({
                id: LocalChatSessionsProvider_1.CHAT_WIDGET_VIEW_ID,
                label: chatWidget.viewModel?.model.title || nls.localize2('chat.sessions.chatView', "Chat").value,
                description: nls.localize('chat.sessions.chatView.description', "Chat View"),
                iconPath: Codicon.chatSparkle,
                widget: chatWidget,
                sessionType: 'widget'
            });
        }
        // Build editor-based sessions in the order specified by editorOrder
        this.editorOrder.forEach((editorKey, index) => {
            const editorInfo = editorMap.get(editorKey);
            if (editorInfo) {
                const sessionId = `local-${editorInfo.group.id}-${index}`;
                sessions.push({
                    id: sessionId,
                    label: editorInfo.editor.getName(),
                    iconPath: Codicon.commentDiscussion,
                    editor: editorInfo.editor,
                    group: editorInfo.group,
                    sessionType: 'editor'
                });
            }
        });
        return sessions;
    }
};
LocalChatSessionsProvider = LocalChatSessionsProvider_1 = __decorate([
    __param(0, IEditorGroupsService),
    __param(1, IChatWidgetService)
], LocalChatSessionsProvider);
// Chat sessions container
let ChatSessionsViewPaneContainer = class ChatSessionsViewPaneContainer extends ViewPaneContainer {
    constructor(instantiationService, configurationService, layoutService, contextMenuService, telemetryService, extensionService, themeService, storageService, contextService, viewDescriptorService, logService, chatSessionsService) {
        super(VIEWLET_ID, {
            mergeViewWithContainerWhenSingleView: false,
        }, instantiationService, configurationService, layoutService, contextMenuService, telemetryService, extensionService, themeService, storageService, contextService, viewDescriptorService, logService);
        this.chatSessionsService = chatSessionsService;
        this.registeredViewDescriptors = new Map();
        // Create and register the local chat sessions provider
        this.localProvider = this._register(this.instantiationService.createInstance(LocalChatSessionsProvider));
        this._register(this.chatSessionsService.registerChatSessionItemProvider(this.localProvider));
        this.updateViewRegistration();
        // Listen for provider changes and register/unregister views accordingly
        this._register(this.chatSessionsService.onDidChangeItemsProviders(() => {
            this.updateViewRegistration();
        }));
        // Listen for session items changes and refresh the appropriate provider tree
        this._register(this.chatSessionsService.onDidChangeSessionItems((chatSessionType) => {
            this.refreshProviderTree(chatSessionType);
        }));
        // Listen for contribution availability changes and update view registration
        this._register(this.chatSessionsService.onDidChangeAvailability(() => {
            this.updateViewRegistration();
        }));
    }
    getTitle() {
        const title = nls.localize('chat.sessions.title', "Chat Sessions");
        return title;
    }
    getAllChatSessionProviders() {
        if (this.localProvider) {
            return [this.localProvider, ...this.chatSessionsService.getChatSessionItemProviders()];
        }
        else {
            return this.chatSessionsService.getChatSessionItemProviders();
        }
    }
    refreshProviderTree(chatSessionType) {
        // Find the provider with the matching chatSessionType
        const providers = this.getAllChatSessionProviders();
        const targetProvider = providers.find(provider => provider.chatSessionType === chatSessionType);
        if (targetProvider) {
            // Find the corresponding view and refresh its tree
            const viewId = `${VIEWLET_ID}.${chatSessionType}`;
            const view = this.getView(viewId);
            if (view) {
                view.refreshTree();
            }
        }
    }
    async updateViewRegistration() {
        // prepare all chat session providers
        const contributions = await this.chatSessionsService.getChatSessionContributions();
        await Promise.all(contributions.map(contrib => this.chatSessionsService.canResolveItemProvider(contrib.id)));
        const currentProviders = this.getAllChatSessionProviders();
        const currentProviderIds = new Set(currentProviders.map(p => p.chatSessionType));
        // Find views that need to be unregistered (providers that are no longer available)
        const viewsToUnregister = [];
        for (const [providerId, viewDescriptor] of this.registeredViewDescriptors.entries()) {
            if (!currentProviderIds.has(providerId)) {
                viewsToUnregister.push(viewDescriptor);
                this.registeredViewDescriptors.delete(providerId);
            }
        }
        // Unregister removed views
        if (viewsToUnregister.length > 0) {
            const container = Registry.as(Extensions.ViewContainersRegistry).get(VIEWLET_ID);
            if (container) {
                Registry.as(Extensions.ViewsRegistry).deregisterViews(viewsToUnregister, container);
            }
        }
        // Register new views
        this.registerViews();
    }
    async registerViews() {
        const container = Registry.as(Extensions.ViewContainersRegistry).get(VIEWLET_ID);
        const providers = this.getAllChatSessionProviders();
        if (container && providers.length > 0) {
            const viewDescriptorsToRegister = [];
            let index = 1;
            providers.forEach(provider => {
                // Only register if not already registered
                if (!this.registeredViewDescriptors.has(provider.chatSessionType)) {
                    const viewDescriptor = {
                        id: `${VIEWLET_ID}.${provider.chatSessionType}`,
                        name: {
                            value: provider.label,
                            original: provider.label,
                        },
                        ctorDescriptor: new SyncDescriptor(SessionsViewPane, [provider]),
                        canToggleVisibility: true,
                        canMoveView: true,
                        order: provider.chatSessionType === 'local' ? 0 : index++,
                    };
                    viewDescriptorsToRegister.push(viewDescriptor);
                    this.registeredViewDescriptors.set(provider.chatSessionType, viewDescriptor);
                }
            });
            if (viewDescriptorsToRegister.length > 0) {
                Registry.as(Extensions.ViewsRegistry).registerViews(viewDescriptorsToRegister, container);
            }
        }
    }
    dispose() {
        // Unregister all views before disposal
        if (this.registeredViewDescriptors.size > 0) {
            const container = Registry.as(Extensions.ViewContainersRegistry).get(VIEWLET_ID);
            if (container) {
                const allRegisteredViews = Array.from(this.registeredViewDescriptors.values());
                Registry.as(Extensions.ViewsRegistry).deregisterViews(allRegisteredViews, container);
            }
            this.registeredViewDescriptors.clear();
        }
        super.dispose();
    }
};
ChatSessionsViewPaneContainer = __decorate([
    __param(0, IInstantiationService),
    __param(1, IConfigurationService),
    __param(2, IWorkbenchLayoutService),
    __param(3, IContextMenuService),
    __param(4, ITelemetryService),
    __param(5, IExtensionService),
    __param(6, IThemeService),
    __param(7, IStorageService),
    __param(8, IWorkspaceContextService),
    __param(9, IViewDescriptorService),
    __param(10, ILogService),
    __param(11, IChatSessionsService)
], ChatSessionsViewPaneContainer);
// Chat sessions item data source for the tree
class SessionsDataSource {
    constructor(provider) {
        this.provider = provider;
    }
    hasChildren(element) {
        // Only the provider (root) has children
        return element === this.provider;
    }
    async getChildren(element) {
        if (element === this.provider) {
            try {
                const items = await this.provider.provideChatSessionItems(CancellationToken.None);
                return items.map(item => ({ ...item, provider: this.provider }));
            }
            catch (error) {
                return [];
            }
        }
        return [];
    }
}
// Tree delegate for session items
class SessionsDelegate {
    static { this.ITEM_HEIGHT = 22; }
    getHeight(element) {
        return SessionsDelegate.ITEM_HEIGHT;
    }
    getTemplateId(element) {
        return SessionsRenderer.TEMPLATE_ID;
    }
}
// Renderer for session items in the tree
let SessionsRenderer = class SessionsRenderer extends Disposable {
    static { SessionsRenderer_1 = this; }
    static { this.TEMPLATE_ID = 'session'; }
    constructor(labels, themeService) {
        super();
        this.labels = labels;
        this.themeService = themeService;
        this.appliedIconColorStyles = new Set();
        // Listen for theme changes to clear applied styles
        this._register(this.themeService.onDidColorThemeChange(() => {
            this.appliedIconColorStyles.clear();
        }));
    }
    applyIconColorStyle(iconId, colorId) {
        const styleKey = `${iconId}-${colorId}`;
        if (this.appliedIconColorStyles.has(styleKey)) {
            return; // Already applied
        }
        const colorTheme = this.themeService.getColorTheme();
        const color = colorTheme.getColor(colorId);
        if (color) {
            // Target the ::before pseudo-element where the actual icon is rendered
            const css = `.monaco-workbench .chat-session-item .monaco-icon-label.codicon-${iconId}::before { color: ${color} !important; }`;
            const activeWindow = getActiveWindow();
            const styleId = `chat-sessions-icon-${styleKey}`;
            const existingStyle = activeWindow.document.getElementById(styleId);
            if (existingStyle) {
                existingStyle.textContent = css;
            }
            else {
                const styleElement = activeWindow.document.createElement('style');
                styleElement.id = styleId;
                styleElement.textContent = css;
                activeWindow.document.head.appendChild(styleElement);
                // Clean up on dispose
                this._register({
                    dispose: () => {
                        const activeWin = getActiveWindow();
                        const style = activeWin.document.getElementById(styleId);
                        if (style) {
                            style.remove();
                        }
                    }
                });
            }
            this.appliedIconColorStyles.add(styleKey);
        }
        else {
            console.log('No color found for colorId:', colorId);
        }
    }
    get templateId() {
        return SessionsRenderer_1.TEMPLATE_ID;
    }
    renderTemplate(container) {
        const element = append(container, $('.chat-session-item'));
        const resourceLabel = this.labels.create(element, { supportHighlights: true });
        const actionBar = new ActionBar(container);
        return {
            container: element,
            resourceLabel,
            actionBar
        };
    }
    renderElement(element, index, templateData) {
        const session = element.element;
        // Handle different icon types
        let iconResource;
        let iconTheme;
        let iconUri;
        if (session.iconPath) {
            if (session.iconPath instanceof URI) {
                // Check if it's a data URI - if so, use it as icon option instead of resource
                if (session.iconPath.scheme === 'data') {
                    iconUri = session.iconPath;
                }
                else {
                    iconResource = session.iconPath;
                }
            }
            else if (ThemeIcon.isThemeIcon(session.iconPath)) {
                iconTheme = session.iconPath;
            }
            else {
                // Handle {light, dark} structure
                iconResource = session.iconPath.light;
            }
        }
        // Apply color styling if specified
        if (iconTheme?.color?.id) {
            this.applyIconColorStyle(iconTheme.id, iconTheme.color.id);
        }
        // Set the resource label
        templateData.resourceLabel.setResource({
            name: session.label,
            description: 'description' in session && typeof session.description === 'string' ? session.description : '',
            resource: iconResource
        }, {
            fileKind: undefined,
            icon: iconTheme || iconUri
        });
    }
    disposeTemplate(templateData) {
        templateData.resourceLabel.dispose();
        templateData.actionBar.dispose();
    }
};
SessionsRenderer = SessionsRenderer_1 = __decorate([
    __param(1, IThemeService)
], SessionsRenderer);
// Sessions view pane for a specific provider
let SessionsViewPane = class SessionsViewPane extends ViewPane {
    constructor(provider, options, keybindingService, contextMenuService, configurationService, contextKeyService, viewDescriptorService, instantiationService, openerService, themeService, hoverService, editorService, viewsService) {
        super(options, keybindingService, contextMenuService, configurationService, contextKeyService, viewDescriptorService, instantiationService, openerService, themeService, hoverService);
        this.provider = provider;
        this.instantiationService = instantiationService;
        this.editorService = editorService;
        this.viewsService = viewsService;
        // Listen for changes in the provider if it's a LocalChatSessionsProvider
        if (provider instanceof LocalChatSessionsProvider) {
            this._register(provider.onDidChange(() => {
                if (this.tree && this.isBodyVisible()) {
                    this.tree.updateChildren(this.provider);
                }
            }));
        }
    }
    isLocalChatSessionItem(item) {
        return ('editor' in item && 'group' in item) || ('widget' in item && 'sessionType' in item);
    }
    refreshTree() {
        if (this.tree && this.isBodyVisible()) {
            this.tree.updateChildren(this.provider);
        }
    }
    renderBody(container) {
        super.renderBody(container);
        this.treeContainer = append(container, $('.chat-sessions-tree.show-file-icons'));
        this.treeContainer.classList.add('file-icon-themable-tree');
        this.labels = this.instantiationService.createInstance(ResourceLabels, { onDidChangeVisibility: this.onDidChangeBodyVisibility });
        this._register(this.labels);
        this.dataSource = new SessionsDataSource(this.provider);
        const delegate = new SessionsDelegate();
        const renderer = new SessionsRenderer(this.labels, this.themeService);
        this._register(renderer);
        this.tree = this.instantiationService.createInstance(WorkbenchAsyncDataTree, 'SessionsTree', this.treeContainer, delegate, [renderer], this.dataSource, {
            horizontalScrolling: false,
            setRowLineHeight: false,
            transformOptimization: false,
            identityProvider: {
                getId: (element) => element.id
            },
            accessibilityProvider: {
                getAriaLabel: (element) => element.label,
                getWidgetAriaLabel: () => nls.localize('chatSessions.treeAriaLabel', "Chat Sessions")
            },
            hideTwistiesOfChildlessElements: true,
            allowNonCollapsibleParents: true // Allow nodes to be non-collapsible even if they have children
        });
        this._register(this.tree);
        // Handle double-click and keyboard selection to open editors
        this._register(this.tree.onDidOpen(async (e) => {
            const element = e.element;
            if (element && this.isLocalChatSessionItem(element)) {
                if (element.sessionType === 'editor' && element.editor && element.group) {
                    // Open the chat editor
                    await this.editorService.openEditor(element.editor, element.group);
                }
                else if (element.sessionType === 'widget' && element.widget) {
                    this.viewsService.openView(element.id, true);
                }
            }
            else {
                const ckey = this.contextKeyService.createKey('chatSessionType', element.provider.chatSessionType);
                ckey.reset();
                await this.editorService.openEditor({
                    resource: ChatSessionUri.forSession(element.provider.chatSessionType, element.id),
                    options: { pinned: true }
                });
            }
        }));
        // Handle visibility changes to load data
        this._register(this.onDidChangeBodyVisibility(async (visible) => {
            if (visible && this.tree) {
                await this.tree.setInput(this.provider);
            }
        }));
        // Initially load data if visible
        if (this.isBodyVisible() && this.tree) {
            this.tree.setInput(this.provider);
        }
    }
    layoutBody(height, width) {
        super.layoutBody(height, width);
        if (this.tree) {
            this.tree.layout(height, width);
        }
    }
    focus() {
        super.focus();
        if (this.tree) {
            this.tree.domFocus();
        }
    }
};
SessionsViewPane = __decorate([
    __param(2, IKeybindingService),
    __param(3, IContextMenuService),
    __param(4, IConfigurationService),
    __param(5, IContextKeyService),
    __param(6, IViewDescriptorService),
    __param(7, IInstantiationService),
    __param(8, IOpenerService),
    __param(9, IThemeService),
    __param(10, IHoverService),
    __param(11, IEditorService),
    __param(12, IViewsService)
], SessionsViewPane);
MenuRegistry.appendMenuItem(MenuId.ViewTitle, {
    command: {
        id: 'workbench.action.openChat',
        title: nls.localize2('interactiveSession.open', "New Chat Editor"),
        icon: Codicon.plus
    },
    group: 'navigation',
    order: 1,
    when: ContextKeyExpr.equals('view', `${VIEWLET_ID}.local`),
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFNlc3Npb25zLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvYWR2aWthci9Eb2N1bWVudHMvYXJjaGl0ZWN0L2FyY2gyL0FyY2hJREUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9icm93c2VyL2NoYXRTZXNzaW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTywwQkFBMEIsQ0FBQztBQUNsQyxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFDO0FBQzFDLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ25HLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQzlGLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSwwREFBMEQsQ0FBQztBQUMxRixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNuRyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDckUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQzVFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUNqRixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQztBQUN2RixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDbEYsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFDOUYsT0FBTyxFQUFFLGtCQUFrQixFQUFFLGNBQWMsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQzFHLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQzFGLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQztBQUM5RSxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0s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