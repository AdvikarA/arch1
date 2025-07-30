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
import { $, addDisposableListener, disposableWindowInterval, EventType, h } from '../../../../base/browser/dom.js';
import { renderMarkdown } from '../../../../base/browser/markdownRenderer.js';
import { Checkbox } from '../../../../base/browser/ui/toggle/toggle.js';
import { mainWindow } from '../../../../base/browser/window.js';
import { findLast } from '../../../../base/common/arraysFind.js';
import { assertNever } from '../../../../base/common/assert.js';
import { VSBuffer } from '../../../../base/common/buffer.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { groupBy } from '../../../../base/common/collections.js';
import { Event } from '../../../../base/common/event.js';
import { markdownCommandLink, MarkdownString } from '../../../../base/common/htmlContent.js';
import { Disposable, DisposableStore, toDisposable } from '../../../../base/common/lifecycle.js';
import { autorun, derived, derivedObservableWithCache, observableValue } from '../../../../base/common/observable.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { isDefined } from '../../../../base/common/types.js';
import { URI } from '../../../../base/common/uri.js';
import { Range } from '../../../../editor/common/core/range.js';
import { SuggestController } from '../../../../editor/contrib/suggest/browser/suggestController.js';
import { localize, localize2 } from '../../../../nls.js';
import { IActionViewItemService } from '../../../../platform/actions/browser/actionViewItemService.js';
import { MenuEntryActionViewItem } from '../../../../platform/actions/browser/menuEntryActionViewItem.js';
import { Action2, MenuId, MenuItemAction, MenuRegistry } from '../../../../platform/actions/common/actions.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { mcpAutoStartConfig } from '../../../../platform/mcp/common/mcpManagement.js';
import { observableConfigValue } from '../../../../platform/observable/common/platformObservableUtils.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { IQuickInputService } from '../../../../platform/quickinput/common/quickInput.js';
import { defaultCheckboxStyles } from '../../../../platform/theme/browser/defaultStyles.js';
import { spinningLoading } from '../../../../platform/theme/common/iconRegistry.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { PICK_WORKSPACE_FOLDER_COMMAND_ID } from '../../../browser/actions/workspaceCommands.js';
import { ActiveEditorContext, RemoteNameContext, ResourceContextKey, WorkbenchStateContext, WorkspaceFolderCountContext } from '../../../common/contextkeys.js';
import { IAuthenticationService } from '../../../services/authentication/common/authentication.js';
import { IAuthenticationQueryService } from '../../../services/authentication/common/authenticationQuery.js';
import { MCP_CONFIGURATION_KEY, WORKSPACE_STANDALONE_CONFIGURATIONS } from '../../../services/configuration/common/configuration.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { IRemoteUserDataProfilesService } from '../../../services/userDataProfile/common/remoteUserDataProfiles.js';
import { IUserDataProfileService } from '../../../services/userDataProfile/common/userDataProfile.js';
import { IViewsService } from '../../../services/views/common/viewsService.js';
import { CHAT_CONFIG_MENU_ID } from '../../chat/browser/actions/chatActions.js';
import { ChatViewId, IChatWidgetService } from '../../chat/browser/chat.js';
import { ChatContextKeys } from '../../chat/common/chatContextKeys.js';
import { ChatModeKind } from '../../chat/common/constants.js';
import { ILanguageModelsService } from '../../chat/common/languageModels.js';
import { VIEW_CONTAINER } from '../../extensions/browser/extensions.contribution.js';
import { extensionsFilterSubMenu, IExtensionsWorkbenchService } from '../../extensions/common/extensions.js';
import { TEXT_FILE_EDITOR_ID } from '../../files/common/files.js';
import { McpContextKeys } from '../common/mcpContextKeys.js';
import { IMcpRegistry } from '../common/mcpRegistryTypes.js';
import { HasInstalledMcpServersContext, IMcpSamplingService, IMcpService, InstalledMcpServersViewId, McpConnectionState, mcpPromptPrefix, McpStartServerInteraction } from '../common/mcpTypes.js';
import { McpAddConfigurationCommand } from './mcpCommandsAddConfiguration.js';
import { McpResourceQuickAccess, McpResourceQuickPick } from './mcpResourceQuickAccess.js';
import './media/mcpServerAction.css';
import { openPanelChatAndGetWidget } from './openPanelChatAndGetWidget.js';
// acroynms do not get localized
const category = {
    original: 'MCP',
    value: 'MCP',
};
export class ListMcpServerCommand extends Action2 {
    constructor() {
        super({
            id: "workbench.mcp.listServer" /* McpCommandIds.ListServer */,
            title: localize2('mcp.list', 'List Servers'),
            icon: Codicon.server,
            category,
            f1: true,
            menu: [{
                    when: ContextKeyExpr.and(ContextKeyExpr.or(McpContextKeys.hasUnknownTools, McpContextKeys.hasServersWithErrors), ChatContextKeys.chatModeKind.isEqualTo(ChatModeKind.Agent)),
                    id: MenuId.ChatExecute,
                    group: 'navigation',
                    order: 2,
                }],
        });
    }
    async run(accessor) {
        const mcpService = accessor.get(IMcpService);
        const commandService = accessor.get(ICommandService);
        const quickInput = accessor.get(IQuickInputService);
        const store = new DisposableStore();
        const pick = quickInput.createQuickPick({ useSeparators: true });
        pick.placeholder = localize('mcp.selectServer', 'Select an MCP Server');
        store.add(pick);
        store.add(autorun(reader => {
            const servers = groupBy(mcpService.servers.read(reader).slice().sort((a, b) => (a.collection.presentation?.order || 0) - (b.collection.presentation?.order || 0)), s => s.collection.id);
            const firstRun = pick.items.length === 0;
            pick.items = [
                { id: '$add', label: localize('mcp.addServer', 'Add Server'), description: localize('mcp.addServer.description', 'Add a new server configuration'), alwaysShow: true, iconClass: ThemeIcon.asClassName(Codicon.add) },
                ...Object.values(servers).filter(s => s.length).flatMap((servers) => [
                    { type: 'separator', label: servers[0].collection.label, id: servers[0].collection.id },
                    ...servers.map(server => ({
                        id: server.definition.id,
                        label: server.definition.label,
                        description: McpConnectionState.toString(server.connectionState.read(reader)),
                    })),
                ]),
            ];
            if (firstRun && pick.items.length > 3) {
                pick.activeItems = pick.items.slice(2, 3); // select the first server by default
            }
        }));
        const picked = await new Promise(resolve => {
            store.add(pick.onDidAccept(() => {
                resolve(pick.activeItems[0]);
            }));
            store.add(pick.onDidHide(() => {
                resolve(undefined);
            }));
            pick.show();
        });
        store.dispose();
        if (!picked) {
            // no-op
        }
        else if (picked.id === '$add') {
            commandService.executeCommand("workbench.mcp.addConfiguration" /* McpCommandIds.AddConfiguration */);
        }
        else {
            commandService.executeCommand("workbench.mcp.serverOptions" /* McpCommandIds.ServerOptions */, picked.id);
        }
    }
}
export class McpServerOptionsCommand extends Action2 {
    constructor() {
        super({
            id: "workbench.mcp.serverOptions" /* McpCommandIds.ServerOptions */,
            title: localize2('mcp.options', 'Server Options'),
            category,
            f1: false,
        });
    }
    async run(accessor, id) {
        const mcpService = accessor.get(IMcpService);
        const quickInputService = accessor.get(IQuickInputService);
        const mcpRegistry = accessor.get(IMcpRegistry);
        const editorService = accessor.get(IEditorService);
        const commandService = accessor.get(ICommandService);
        const samplingService = accessor.get(IMcpSamplingService);
        const authenticationQueryService = accessor.get(IAuthenticationQueryService);
        const authenticationService = accessor.get(IAuthenticationService);
        const server = mcpService.servers.get().find(s => s.definition.id === id);
        if (!server) {
            return;
        }
        const collection = mcpRegistry.collections.get().find(c => c.id === server.collection.id);
        const serverDefinition = collection?.serverDefinitions.get().find(s => s.id === server.definition.id);
        const items = [];
        const serverState = server.connectionState.get();
        items.push({ type: 'separator', label: localize('mcp.actions.status', 'Status') });
        // Only show start when server is stopped or in error state
        if (McpConnectionState.canBeStarted(serverState.state)) {
            items.push({
                label: localize('mcp.start', 'Start Server'),
                action: 'start'
            });
        }
        else {
            items.push({
                label: localize('mcp.stop', 'Stop Server'),
                action: 'stop'
            });
            items.push({
                label: localize('mcp.restart', 'Restart Server'),
                action: 'restart'
            });
        }
        items.push(...this._getAuthActions(authenticationQueryService, server.definition.id));
        const configTarget = serverDefinition?.presentation?.origin || collection?.presentation?.origin;
        if (configTarget) {
            items.push({
                label: localize('mcp.config', 'Show Configuration'),
                action: 'config',
            });
        }
        items.push({
            label: localize('mcp.showOutput', 'Show Output'),
            action: 'showOutput'
        });
        items.push({ type: 'separator', label: localize('mcp.actions.sampling', 'Sampling') }, {
            label: localize('mcp.configAccess', 'Configure Model Access'),
            description: localize('mcp.showOutput.description', 'Set the models the server can use via MCP sampling'),
            action: 'configSampling'
        });
        if (samplingService.hasLogs(server)) {
            items.push({
                label: localize('mcp.samplingLog', 'Show Sampling Requests'),
                description: localize('mcp.samplingLog.description', 'Show the sampling requests for this server'),
                action: 'samplingLog',
            });
        }
        const capabilities = server.capabilities.get();
        if (capabilities === undefined || (capabilities & 16 /* McpCapability.Resources */)) {
            items.push({ type: 'separator', label: localize('mcp.actions.resources', 'Resources') });
            items.push({
                label: localize('mcp.resources', 'Browse Resources'),
                action: 'resources',
            });
        }
        const pick = await quickInputService.pick(items, {
            placeHolder: localize('mcp.selectAction', 'Select action for \'{0}\'', server.definition.label),
        });
        if (!pick) {
            return;
        }
        switch (pick.action) {
            case 'start':
                await server.start({ promptType: 'all-untrusted' });
                server.showOutput();
                break;
            case 'stop':
                await server.stop();
                break;
            case 'restart':
                await server.stop();
                await server.start({ promptType: 'all-untrusted' });
                break;
            case 'disconnect':
                await server.stop();
                await this._handleAuth(authenticationService, pick.accountQuery, server.definition, false);
                break;
            case 'signout':
                await server.stop();
                await this._handleAuth(authenticationService, pick.accountQuery, server.definition, true);
                break;
            case 'showOutput':
                server.showOutput();
                break;
            case 'config':
                editorService.openEditor({
                    resource: URI.isUri(configTarget) ? configTarget : configTarget.uri,
                    options: { selection: URI.isUri(configTarget) ? undefined : configTarget.range }
                });
                break;
            case 'configSampling':
                return commandService.executeCommand("workbench.mcp.configureSamplingModels" /* McpCommandIds.ConfigureSamplingModels */, server);
            case 'resources':
                return commandService.executeCommand("workbench.mcp.browseResources" /* McpCommandIds.BrowseResources */, server);
            case 'samplingLog':
                editorService.openEditor({
                    resource: undefined,
                    contents: samplingService.getLogText(server),
                    label: localize('mcp.samplingLog.title', 'MCP Sampling: {0}', server.definition.label),
                });
                break;
            default:
                assertNever(pick);
        }
    }
    _getAuthActions(authenticationQueryService, serverId) {
        const result = [];
        // Really, this should only ever have one entry.
        for (const [providerId, accountName] of authenticationQueryService.mcpServer(serverId).getAllAccountPreferences()) {
            const accountQuery = authenticationQueryService.provider(providerId).account(accountName);
            if (!accountQuery.mcpServer(serverId).isAccessAllowed()) {
                continue; // skip accounts that are not allowed
            }
            // If there are multiple allowed servers/extensions, other things are using this provider
            // so we show a disconnect action, otherwise we show a sign out action.
            if (accountQuery.entities().getEntityCount().total > 1) {
                result.push({
                    action: 'disconnect',
                    label: localize('mcp.disconnect', 'Disconnect Account'),
                    description: `(${accountName})`,
                    accountQuery
                });
            }
            else {
                result.push({
                    action: 'signout',
                    label: localize('mcp.signOut', 'Sign Out'),
                    description: `(${accountName})`,
                    accountQuery
                });
            }
        }
        return result;
    }
    async _handleAuth(authenticationService, accountQuery, definition, signOut) {
        const { providerId, accountName } = accountQuery;
        accountQuery.mcpServer(definition.id).setAccessAllowed(false, definition.label);
        if (signOut) {
            const accounts = await authenticationService.getAccounts(providerId);
            const account = accounts.find(a => a.label === accountName);
            if (account) {
                const sessions = await authenticationService.getSessions(providerId, undefined, { account });
                for (const session of sessions) {
                    await authenticationService.removeSession(providerId, session.id);
                }
            }
        }
    }
}
let MCPServerActionRendering = class MCPServerActionRendering extends Disposable {
    constructor(actionViewItemService, mcpService, instaService, commandService, configurationService) {
        super();
        const hoverIsOpen = observableValue(this, false);
        const config = observableConfigValue(mcpAutoStartConfig, "newAndOutdated" /* McpAutoStartValue.NewAndOutdated */, configurationService);
        let DisplayedState;
        (function (DisplayedState) {
            DisplayedState[DisplayedState["None"] = 0] = "None";
            DisplayedState[DisplayedState["NewTools"] = 1] = "NewTools";
            DisplayedState[DisplayedState["Error"] = 2] = "Error";
            DisplayedState[DisplayedState["Refreshing"] = 3] = "Refreshing";
        })(DisplayedState || (DisplayedState = {}));
        function isServer(s) {
            return typeof s.start === 'function';
        }
        const displayedStateCurrent = derived((reader) => {
            const servers = mcpService.servers.read(reader);
            const serversPerState = [];
            for (const server of servers) {
                let thisState = 0 /* DisplayedState.None */;
                switch (server.cacheState.read(reader)) {
                    case 0 /* McpServerCacheState.Unknown */:
                    case 2 /* McpServerCacheState.Outdated */:
                        thisState = server.connectionState.read(reader).state === 3 /* McpConnectionState.Kind.Error */ ? 2 /* DisplayedState.Error */ : 1 /* DisplayedState.NewTools */;
                        break;
                    case 3 /* McpServerCacheState.RefreshingFromUnknown */:
                        thisState = 3 /* DisplayedState.Refreshing */;
                        break;
                    default:
                        thisState = server.connectionState.read(reader).state === 3 /* McpConnectionState.Kind.Error */ ? 2 /* DisplayedState.Error */ : 0 /* DisplayedState.None */;
                        break;
                }
                serversPerState[thisState] ??= [];
                serversPerState[thisState].push(server);
            }
            const unknownServerStates = mcpService.lazyCollectionState.read(reader);
            if (unknownServerStates.state === 1 /* LazyCollectionState.LoadingUnknown */) {
                serversPerState[3 /* DisplayedState.Refreshing */] ??= [];
                serversPerState[3 /* DisplayedState.Refreshing */].push(...unknownServerStates.collections);
            }
            else if (unknownServerStates.state === 0 /* LazyCollectionState.HasUnknown */) {
                serversPerState[1 /* DisplayedState.NewTools */] ??= [];
                serversPerState[1 /* DisplayedState.NewTools */].push(...unknownServerStates.collections);
            }
            let maxState = (serversPerState.length - 1);
            if (maxState === 1 /* DisplayedState.NewTools */ && config.read(reader) !== "never" /* McpAutoStartValue.Never */) {
                maxState = 0 /* DisplayedState.None */;
            }
            return { state: maxState, servers: serversPerState[maxState] || [] };
        });
        // avoid hiding the hover if a state changes while it's open:
        const displayedState = derivedObservableWithCache(this, (reader, last) => {
            if (last && hoverIsOpen.read(reader)) {
                return last;
            }
            else {
                return displayedStateCurrent.read(reader);
            }
        });
        this._store.add(actionViewItemService.register(MenuId.ChatExecute, "workbench.mcp.listServer" /* McpCommandIds.ListServer */, (action, options) => {
            if (!(action instanceof MenuItemAction)) {
                return undefined;
            }
            return instaService.createInstance(class extends MenuEntryActionViewItem {
                render(container) {
                    super.render(container);
                    container.classList.add('chat-mcp');
                    const action = h('button.chat-mcp-action', [h('span@icon')]);
                    this._register(autorun(r => {
                        const displayed = displayedState.read(r);
                        const { state } = displayed;
                        const { root, icon } = action;
                        this.updateTooltip();
                        container.classList.toggle('chat-mcp-has-action', state !== 0 /* DisplayedState.None */);
                        if (!root.parentElement) {
                            container.appendChild(root);
                        }
                        root.ariaLabel = this.getLabelForState(displayed);
                        root.className = 'chat-mcp-action';
                        icon.className = '';
                        if (state === 1 /* DisplayedState.NewTools */) {
                            root.classList.add('chat-mcp-action-new');
                            icon.classList.add(...ThemeIcon.asClassNameArray(Codicon.refresh));
                        }
                        else if (state === 2 /* DisplayedState.Error */) {
                            root.classList.add('chat-mcp-action-error');
                            icon.classList.add(...ThemeIcon.asClassNameArray(Codicon.warning));
                        }
                        else if (state === 3 /* DisplayedState.Refreshing */) {
                            root.classList.add('chat-mcp-action-refreshing');
                            icon.classList.add(...ThemeIcon.asClassNameArray(spinningLoading));
                        }
                        else {
                            root.remove();
                        }
                    }));
                }
                async onClick(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    const { state, servers } = displayedStateCurrent.get();
                    if (state === 1 /* DisplayedState.NewTools */) {
                        const interaction = new McpStartServerInteraction();
                        servers.filter(isServer).forEach(server => server.stop().then(() => server.start({ interaction })));
                        mcpService.activateCollections();
                    }
                    else if (state === 3 /* DisplayedState.Refreshing */) {
                        findLast(servers, isServer)?.showOutput();
                    }
                    else if (state === 2 /* DisplayedState.Error */) {
                        const server = findLast(servers, isServer);
                        if (server) {
                            server.showOutput();
                            commandService.executeCommand("workbench.mcp.serverOptions" /* McpCommandIds.ServerOptions */, server.definition.id);
                        }
                    }
                    else {
                        commandService.executeCommand("workbench.mcp.listServer" /* McpCommandIds.ListServer */);
                    }
                }
                getTooltip() {
                    return this.getLabelForState() || super.getTooltip();
                }
                getHoverContents({ state, servers } = displayedStateCurrent.get()) {
                    const link = (s) => markdownCommandLink({
                        title: s.definition.label,
                        id: "workbench.mcp.serverOptions" /* McpCommandIds.ServerOptions */,
                        arguments: [s.definition.id],
                    });
                    const single = servers.length === 1;
                    const names = servers.map(s => isServer(s) ? link(s) : '`' + s.label + '`').map(l => single ? l : `- ${l}\n`).join(', ');
                    let markdown;
                    if (state === 1 /* DisplayedState.NewTools */) {
                        markdown = new MarkdownString(single
                            ? localize('mcp.newTools.md.single', "MCP server {0} has been updated and may have new tools available.", names)
                            : localize('mcp.newTools.md.multi', "MCP servers have been updated and may have new tools available:\n\n{0}", names));
                    }
                    else if (state === 2 /* DisplayedState.Error */) {
                        markdown = new MarkdownString(single
                            ? localize('mcp.err.md.single', "MCP server {0} was unable to start successfully.", names)
                            : localize('mcp.err.md.multi', "Multiple MCP servers were unable to start successfully:\n\n{0}", names));
                    }
                    else {
                        return this.getLabelForState() || undefined;
                    }
                    return {
                        element: (token) => {
                            hoverIsOpen.set(true, undefined);
                            const store = new DisposableStore();
                            store.add(toDisposable(() => hoverIsOpen.set(false, undefined)));
                            store.add(token.onCancellationRequested(() => {
                                store.dispose();
                            }));
                            // todo@connor4312/@benibenj: workaround for #257923
                            store.add(disposableWindowInterval(mainWindow, () => {
                                if (!container.isConnected) {
                                    store.dispose();
                                }
                            }, 2000));
                            const container = $('div.mcp-hover-contents');
                            // Render markdown content
                            markdown.isTrusted = true;
                            const markdownResult = store.add(renderMarkdown(markdown));
                            container.appendChild(markdownResult.element);
                            // Add divider
                            const divider = $('hr.mcp-hover-divider');
                            container.appendChild(divider);
                            // Add checkbox for mcpAutoStartConfig setting
                            const checkboxContainer = $('div.mcp-hover-setting');
                            const settingLabelStr = localize('mcp.autoStart', "Automatically start MCP servers when sending a chat message");
                            const checkbox = store.add(new Checkbox(settingLabelStr, config.get() !== "never" /* McpAutoStartValue.Never */, defaultCheckboxStyles));
                            checkboxContainer.appendChild(checkbox.domNode);
                            // Add label next to checkbox
                            const settingLabel = $('span.mcp-hover-setting-label', undefined, settingLabelStr);
                            checkboxContainer.appendChild(settingLabel);
                            const onChange = () => {
                                const newValue = checkbox.checked ? "newAndOutdated" /* McpAutoStartValue.NewAndOutdated */ : "never" /* McpAutoStartValue.Never */;
                                configurationService.updateValue(mcpAutoStartConfig, newValue);
                            };
                            store.add(checkbox.onChange(onChange));
                            store.add(addDisposableListener(settingLabel, EventType.CLICK, () => {
                                checkbox.checked = !checkbox.checked;
                                onChange();
                            }));
                            container.appendChild(checkboxContainer);
                            return container;
                        },
                    };
                }
                getLabelForState({ state, servers } = displayedStateCurrent.get()) {
                    if (state === 1 /* DisplayedState.NewTools */) {
                        return localize('mcp.newTools', "New tools available ({0})", servers.length || 1);
                    }
                    else if (state === 2 /* DisplayedState.Error */) {
                        return localize('mcp.toolError', "Error loading {0} tool(s)", servers.length || 1);
                    }
                    else if (state === 3 /* DisplayedState.Refreshing */) {
                        return localize('mcp.toolRefresh', "Discovering tools...");
                    }
                    else {
                        return null;
                    }
                }
            }, action, { ...options, keybindingNotRenderedWithLabel: true });
        }, Event.fromObservable(displayedState)));
    }
};
MCPServerActionRendering = __decorate([
    __param(0, IActionViewItemService),
    __param(1, IMcpService),
    __param(2, IInstantiationService),
    __param(3, ICommandService),
    __param(4, IConfigurationService)
], MCPServerActionRendering);
export { MCPServerActionRendering };
export class ResetMcpTrustCommand extends Action2 {
    constructor() {
        super({
            id: "workbench.mcp.resetTrust" /* McpCommandIds.ResetTrust */,
            title: localize2('mcp.resetTrust', "Reset Trust"),
            category,
            f1: true,
            precondition: McpContextKeys.toolsCount.greater(0),
        });
    }
    run(accessor) {
        const mcpService = accessor.get(IMcpService);
        mcpService.resetTrust();
    }
}
export class ResetMcpCachedTools extends Action2 {
    constructor() {
        super({
            id: "workbench.mcp.resetCachedTools" /* McpCommandIds.ResetCachedTools */,
            title: localize2('mcp.resetCachedTools', "Reset Cached Tools"),
            category,
            f1: true,
            precondition: McpContextKeys.toolsCount.greater(0),
        });
    }
    run(accessor) {
        const mcpService = accessor.get(IMcpService);
        mcpService.resetCaches();
    }
}
export class AddConfigurationAction extends Action2 {
    constructor() {
        super({
            id: "workbench.mcp.addConfiguration" /* McpCommandIds.AddConfiguration */,
            title: localize2('mcp.addConfiguration', "Add Server..."),
            metadata: {
                description: localize2('mcp.addConfiguration.description', "Installs a new Model Context protocol to the mcp.json settings"),
            },
            category,
            f1: true,
            menu: {
                id: MenuId.EditorContent,
                when: ContextKeyExpr.and(ContextKeyExpr.regex(ResourceContextKey.Path.key, /\.vscode[/\\]mcp\.json$/), ActiveEditorContext.isEqualTo(TEXT_FILE_EDITOR_ID))
            }
        });
    }
    async run(accessor, configUri) {
        const instantiationService = accessor.get(IInstantiationService);
        const workspaceService = accessor.get(IWorkspaceContextService);
        const target = configUri ? workspaceService.getWorkspaceFolder(URI.parse(configUri)) : undefined;
        return instantiationService.createInstance(McpAddConfigurationCommand, target ?? undefined).run();
    }
}
export class RemoveStoredInput extends Action2 {
    constructor() {
        super({
            id: "workbench.mcp.removeStoredInput" /* McpCommandIds.RemoveStoredInput */,
            title: localize2('mcp.resetCachedTools', "Reset Cached Tools"),
            category,
            f1: false,
        });
    }
    run(accessor, scope, id) {
        accessor.get(IMcpRegistry).clearSavedInputs(scope, id);
    }
}
export class EditStoredInput extends Action2 {
    constructor() {
        super({
            id: "workbench.mcp.editStoredInput" /* McpCommandIds.EditStoredInput */,
            title: localize2('mcp.editStoredInput', "Edit Stored Input"),
            category,
            f1: false,
        });
    }
    run(accessor, inputId, uri, configSection, target) {
        const workspaceFolder = uri && accessor.get(IWorkspaceContextService).getWorkspaceFolder(uri);
        accessor.get(IMcpRegistry).editSavedInput(inputId, workspaceFolder || undefined, configSection, target);
    }
}
export class ShowConfiguration extends Action2 {
    constructor() {
        super({
            id: "workbench.mcp.showConfiguration" /* McpCommandIds.ShowConfiguration */,
            title: localize2('mcp.command.showConfiguration', "Show Configuration"),
            category,
            f1: false,
        });
    }
    run(accessor, collectionId, serverId) {
        const collection = accessor.get(IMcpRegistry).collections.get().find(c => c.id === collectionId);
        if (!collection) {
            return;
        }
        const server = collection?.serverDefinitions.get().find(s => s.id === serverId);
        const editorService = accessor.get(IEditorService);
        if (server?.presentation?.origin) {
            editorService.openEditor({
                resource: server.presentation.origin.uri,
                options: { selection: server.presentation.origin.range }
            });
        }
        else if (collection.presentation?.origin) {
            editorService.openEditor({
                resource: collection.presentation.origin,
            });
        }
    }
}
export class ShowOutput extends Action2 {
    constructor() {
        super({
            id: "workbench.mcp.showOutput" /* McpCommandIds.ShowOutput */,
            title: localize2('mcp.command.showOutput', "Show Output"),
            category,
            f1: false,
        });
    }
    run(accessor, serverId) {
        accessor.get(IMcpService).servers.get().find(s => s.definition.id === serverId)?.showOutput();
    }
}
export class RestartServer extends Action2 {
    constructor() {
        super({
            id: "workbench.mcp.restartServer" /* McpCommandIds.RestartServer */,
            title: localize2('mcp.command.restartServer', "Restart Server"),
            category,
            f1: false,
        });
    }
    async run(accessor, serverId, opts) {
        const s = accessor.get(IMcpService).servers.get().find(s => s.definition.id === serverId);
        s?.showOutput();
        await s?.stop();
        await s?.start({ promptType: 'all-untrusted', ...opts });
    }
}
export class StartServer extends Action2 {
    constructor() {
        super({
            id: "workbench.mcp.startServer" /* McpCommandIds.StartServer */,
            title: localize2('mcp.command.startServer', "Start Server"),
            category,
            f1: false,
        });
    }
    async run(accessor, serverId, opts) {
        const s = accessor.get(IMcpService).servers.get().find(s => s.definition.id === serverId);
        await s?.start({ promptType: 'all-untrusted', ...opts });
    }
}
export class StopServer extends Action2 {
    constructor() {
        super({
            id: "workbench.mcp.stopServer" /* McpCommandIds.StopServer */,
            title: localize2('mcp.command.stopServer', "Stop Server"),
            category,
            f1: false,
        });
    }
    async run(accessor, serverId) {
        const s = accessor.get(IMcpService).servers.get().find(s => s.definition.id === serverId);
        await s?.stop();
    }
}
export class McpBrowseCommand extends Action2 {
    constructor() {
        super({
            id: "workbench.mcp.browseServers" /* McpCommandIds.Browse */,
            title: localize2('mcp.command.browse', "MCP Servers"),
            category,
            menu: [{
                    id: extensionsFilterSubMenu,
                    group: '1_predefined',
                    order: 1,
                }],
        });
    }
    async run(accessor) {
        accessor.get(IExtensionsWorkbenchService).openSearch('@mcp ');
    }
}
MenuRegistry.appendMenuItem(MenuId.CommandPalette, {
    command: {
        id: "workbench.mcp.browseServers" /* McpCommandIds.Browse */,
        title: localize2('mcp.command.browse.mcp', "Browse Servers"),
        category
    },
});
export class BrowseMcpServersPageCommand extends Action2 {
    constructor() {
        super({
            id: "workbench.mcp.browseServersPage" /* McpCommandIds.BrowsePage */,
            title: localize2('mcp.command.open', "Browse MCP Servers"),
            icon: Codicon.globe,
            menu: [{
                    id: MenuId.ViewTitle,
                    when: ContextKeyExpr.equals('view', InstalledMcpServersViewId),
                    group: 'navigation',
                }],
        });
    }
    async run(accessor) {
        const productService = accessor.get(IProductService);
        const openerService = accessor.get(IOpenerService);
        return openerService.open(productService.quality === 'insider' ? 'https://code.visualstudio.com/insider/mcp' : 'https://code.visualstudio.com/mcp');
    }
}
export class ShowInstalledMcpServersCommand extends Action2 {
    constructor() {
        super({
            id: "workbench.mcp.showInstalledServers" /* McpCommandIds.ShowInstalled */,
            title: localize2('mcp.command.show.installed', "Show Installed Servers"),
            category,
            precondition: HasInstalledMcpServersContext,
            f1: true,
        });
    }
    async run(accessor) {
        const viewsService = accessor.get(IViewsService);
        const view = await viewsService.openView(InstalledMcpServersViewId, true);
        if (!view) {
            await viewsService.openViewContainer(VIEW_CONTAINER.id);
            await viewsService.openView(InstalledMcpServersViewId, true);
        }
    }
}
MenuRegistry.appendMenuItem(CHAT_CONFIG_MENU_ID, {
    command: {
        id: "workbench.mcp.showInstalledServers" /* McpCommandIds.ShowInstalled */,
        title: localize2('mcp.servers', "MCP Servers")
    },
    when: ContextKeyExpr.and(ChatContextKeys.enabled, ContextKeyExpr.equals('view', ChatViewId)),
    order: 14,
    group: '0_level'
});
class OpenMcpResourceCommand extends Action2 {
    async run(accessor) {
        const fileService = accessor.get(IFileService);
        const editorService = accessor.get(IEditorService);
        const resource = await this.getURI(accessor);
        if (!(await fileService.exists(resource))) {
            await fileService.createFile(resource, VSBuffer.fromString(JSON.stringify({ servers: {} }, null, '\t')));
        }
        await editorService.openEditor({ resource });
    }
}
export class OpenUserMcpResourceCommand extends OpenMcpResourceCommand {
    constructor() {
        super({
            id: "workbench.mcp.openUserMcpJson" /* McpCommandIds.OpenUserMcp */,
            title: localize2('mcp.command.openUserMcp', "Open User Configuration"),
            category,
            f1: true
        });
    }
    getURI(accessor) {
        const userDataProfileService = accessor.get(IUserDataProfileService);
        return Promise.resolve(userDataProfileService.currentProfile.mcpResource);
    }
}
export class OpenRemoteUserMcpResourceCommand extends OpenMcpResourceCommand {
    constructor() {
        super({
            id: "workbench.mcp.openRemoteUserMcpJson" /* McpCommandIds.OpenRemoteUserMcp */,
            title: localize2('mcp.command.openRemoteUserMcp', "Open Remote User Configuration"),
            category,
            f1: true,
            precondition: RemoteNameContext.notEqualsTo('')
        });
    }
    async getURI(accessor) {
        const userDataProfileService = accessor.get(IUserDataProfileService);
        const remoteUserDataProfileService = accessor.get(IRemoteUserDataProfilesService);
        const remoteProfile = await remoteUserDataProfileService.getRemoteProfile(userDataProfileService.currentProfile);
        return remoteProfile.mcpResource;
    }
}
export class OpenWorkspaceFolderMcpResourceCommand extends Action2 {
    constructor() {
        super({
            id: "workbench.mcp.openWorkspaceFolderMcpJson" /* McpCommandIds.OpenWorkspaceFolderMcp */,
            title: localize2('mcp.command.openWorkspaceFolderMcp', "Open Workspace Folder MCP Configuration"),
            category,
            f1: true,
            precondition: WorkspaceFolderCountContext.notEqualsTo(0)
        });
    }
    async run(accessor) {
        const workspaceContextService = accessor.get(IWorkspaceContextService);
        const commandService = accessor.get(ICommandService);
        const editorService = accessor.get(IEditorService);
        const workspaceFolders = workspaceContextService.getWorkspace().folders;
        const workspaceFolder = workspaceFolders.length === 1 ? workspaceFolders[0] : await commandService.executeCommand(PICK_WORKSPACE_FOLDER_COMMAND_ID);
        if (workspaceFolder) {
            await editorService.openEditor({ resource: workspaceFolder.toResource(WORKSPACE_STANDALONE_CONFIGURATIONS[MCP_CONFIGURATION_KEY]) });
        }
    }
}
export class OpenWorkspaceMcpResourceCommand extends Action2 {
    constructor() {
        super({
            id: "workbench.mcp.openWorkspaceMcpJson" /* McpCommandIds.OpenWorkspaceMcp */,
            title: localize2('mcp.command.openWorkspaceMcp', "Open Workspace MCP Configuration"),
            category,
            f1: true,
            precondition: WorkbenchStateContext.isEqualTo('workspace')
        });
    }
    async run(accessor) {
        const workspaceContextService = accessor.get(IWorkspaceContextService);
        const editorService = accessor.get(IEditorService);
        const workspaceConfiguration = workspaceContextService.getWorkspace().configuration;
        if (workspaceConfiguration) {
            await editorService.openEditor({ resource: workspaceConfiguration });
        }
    }
}
export class McpBrowseResourcesCommand extends Action2 {
    constructor() {
        super({
            id: "workbench.mcp.browseResources" /* McpCommandIds.BrowseResources */,
            title: localize2('mcp.browseResources', "Browse Resources..."),
            category,
            precondition: McpContextKeys.serverCount.greater(0),
            f1: true,
        });
    }
    run(accessor, server) {
        if (server) {
            accessor.get(IInstantiationService).createInstance(McpResourceQuickPick, server).pick();
        }
        else {
            accessor.get(IQuickInputService).quickAccess.show(McpResourceQuickAccess.PREFIX);
        }
    }
}
export class McpConfigureSamplingModels extends Action2 {
    constructor() {
        super({
            id: "workbench.mcp.configureSamplingModels" /* McpCommandIds.ConfigureSamplingModels */,
            title: localize2('mcp.configureSamplingModels', "Configure SamplingModel"),
            category,
        });
    }
    async run(accessor, server) {
        const quickInputService = accessor.get(IQuickInputService);
        const lmService = accessor.get(ILanguageModelsService);
        const mcpSampling = accessor.get(IMcpSamplingService);
        const existingIds = new Set(mcpSampling.getConfig(server).allowedModels);
        const allItems = lmService.getLanguageModelIds().map(id => {
            const model = lmService.lookupLanguageModel(id);
            if (!model.isUserSelectable) {
                return undefined;
            }
            return {
                label: model.name,
                description: model.description,
                id,
                picked: existingIds.size ? existingIds.has(id) : model.isDefault,
            };
        }).filter(isDefined);
        allItems.sort((a, b) => (b.picked ? 1 : 0) - (a.picked ? 1 : 0) || a.label.localeCompare(b.label));
        // do the quickpick selection
        const picked = await quickInputService.pick(allItems, {
            placeHolder: localize('mcp.configureSamplingModels.ph', 'Pick the models {0} can access via MCP sampling', server.definition.label),
            canPickMany: true,
        });
        if (picked) {
            await mcpSampling.updateConfig(server, c => c.allowedModels = picked.map(p => p.id));
        }
        return picked?.length || 0;
    }
}
export class McpStartPromptingServerCommand extends Action2 {
    constructor() {
        super({
            id: "workbench.mcp.startPromptForServer" /* McpCommandIds.StartPromptForServer */,
            title: localize2('mcp.startPromptingServer', "Start Prompting Server"),
            category,
            f1: false,
        });
    }
    async run(accessor, server) {
        const widget = await openPanelChatAndGetWidget(accessor.get(IViewsService), accessor.get(IChatWidgetService));
        if (!widget) {
            return;
        }
        const editor = widget.inputEditor;
        const model = editor.getModel();
        if (!model) {
            return;
        }
        const range = (editor.getSelection() || model.getFullModelRange()).collapseToEnd();
        const text = mcpPromptPrefix(server.definition) + '.';
        model.applyEdits([{ range, text }]);
        editor.setSelection(Range.fromPositions(range.getEndPosition().delta(0, text.length)));
        widget.focusInput();
        SuggestController.get(editor)?.triggerSuggest();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWNwQ29tbWFuZHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9hZHZpa2FyL0RvY3VtZW50cy9hcmNoaXRlY3QvYXJjaDIvQXJjaElERS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9tY3AvYnJvd3Nlci9tY3BDb21tYW5kcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsQ0FBQyxFQUFFLHFCQUFxQixFQUFFLHdCQUF3QixFQUFFLFNBQVMsRUFBRSxDQUFDLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUNuSCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sOENBQThDLENBQUM7QUFFOUUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLDhDQUE4QyxDQUFDO0FBQ3hFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUNoRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDakUsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ2hFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUM3RCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDOUQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ2pFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUN6RCxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsY0FBYyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDN0YsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQUUsWUFBWSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDakcsT0FBTyxFQUFFLE9BQU8sRUFBRSxPQUFPLEVBQUUsMEJBQTBCLEVBQUUsZUFBZSxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDdEgsT0FBTyxF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