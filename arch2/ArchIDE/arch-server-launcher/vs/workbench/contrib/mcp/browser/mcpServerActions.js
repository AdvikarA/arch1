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
var InstallAction_1, UninstallAction_1, ManageMcpServerAction_1, StartServerAction_1, StopServerAction_1, RestartServerAction_1, AuthServerAction_1, ShowServerOutputAction_1, ShowServerConfigurationAction_1, ShowServerJsonConfigurationAction_1, ConfigureModelAccessAction_1, ShowSamplingRequestsAction_1, BrowseResourcesAction_1, McpServerStatusAction_1;
import { getDomNodePagePosition } from '../../../../base/browser/dom.js';
import { ActionViewItem } from '../../../../base/browser/ui/actionbar/actionViewItems.js';
import { alert } from '../../../../base/browser/ui/aria/aria.js';
import { Action, Separator } from '../../../../base/common/actions.js';
import { Emitter } from '../../../../base/common/event.js';
import { MarkdownString } from '../../../../base/common/htmlContent.js';
import { disposeIfDisposable } from '../../../../base/common/lifecycle.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { URI } from '../../../../base/common/uri.js';
import { localize } from '../../../../nls.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IAllowedMcpServersService } from '../../../../platform/mcp/common/mcpManagement.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { IAuthenticationService } from '../../../services/authentication/common/authentication.js';
import { IAuthenticationQueryService } from '../../../services/authentication/common/authenticationQuery.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { errorIcon, infoIcon, manageExtensionIcon, trustIcon, warningIcon } from '../../extensions/browser/extensionsIcons.js';
import { IMcpRegistry } from '../common/mcpRegistryTypes.js';
import { IMcpSamplingService, IMcpService, IMcpWorkbenchService, McpConnectionState } from '../common/mcpTypes.js';
export class McpServerAction extends Action {
    constructor() {
        super(...arguments);
        this._mcpServer = null;
    }
    static { this.EXTENSION_ACTION_CLASS = 'extension-action'; }
    static { this.TEXT_ACTION_CLASS = `${McpServerAction.EXTENSION_ACTION_CLASS} text`; }
    static { this.LABEL_ACTION_CLASS = `${McpServerAction.EXTENSION_ACTION_CLASS} label`; }
    static { this.PROMINENT_LABEL_ACTION_CLASS = `${McpServerAction.LABEL_ACTION_CLASS} prominent`; }
    static { this.ICON_ACTION_CLASS = `${McpServerAction.EXTENSION_ACTION_CLASS} icon`; }
    get mcpServer() { return this._mcpServer; }
    set mcpServer(mcpServer) { this._mcpServer = mcpServer; this.update(); }
}
let DropDownAction = class DropDownAction extends McpServerAction {
    constructor(id, label, cssClass, enabled, instantiationService) {
        super(id, label, cssClass, enabled);
        this.instantiationService = instantiationService;
        this._actionViewItem = null;
    }
    createActionViewItem(options) {
        this._actionViewItem = this.instantiationService.createInstance(DropDownExtensionActionViewItem, this, options);
        return this._actionViewItem;
    }
    run(actionGroups) {
        this._actionViewItem?.showMenu(actionGroups);
        return Promise.resolve();
    }
};
DropDownAction = __decorate([
    __param(4, IInstantiationService)
], DropDownAction);
export { DropDownAction };
let DropDownExtensionActionViewItem = class DropDownExtensionActionViewItem extends ActionViewItem {
    constructor(action, options, contextMenuService) {
        super(null, action, { ...options, icon: true, label: true });
        this.contextMenuService = contextMenuService;
    }
    showMenu(menuActionGroups) {
        if (this.element) {
            const actions = this.getActions(menuActionGroups);
            const elementPosition = getDomNodePagePosition(this.element);
            const anchor = { x: elementPosition.left, y: elementPosition.top + elementPosition.height + 10 };
            this.contextMenuService.showContextMenu({
                getAnchor: () => anchor,
                getActions: () => actions,
                actionRunner: this.actionRunner,
                onHide: () => disposeIfDisposable(actions)
            });
        }
    }
    getActions(menuActionGroups) {
        let actions = [];
        for (const menuActions of menuActionGroups) {
            actions = [...actions, ...menuActions, new Separator()];
        }
        return actions.length ? actions.slice(0, actions.length - 1) : actions;
    }
};
DropDownExtensionActionViewItem = __decorate([
    __param(2, IContextMenuService)
], DropDownExtensionActionViewItem);
export { DropDownExtensionActionViewItem };
let InstallAction = class InstallAction extends McpServerAction {
    static { InstallAction_1 = this; }
    static { this.CLASS = `${this.LABEL_ACTION_CLASS} prominent install`; }
    static { this.HIDE = `${this.CLASS} hide`; }
    constructor(editor, mcpWorkbenchService, telemetryService) {
        super('extensions.install', localize('install', "Install"), InstallAction_1.CLASS, false);
        this.editor = editor;
        this.mcpWorkbenchService = mcpWorkbenchService;
        this.telemetryService = telemetryService;
        this.update();
    }
    update() {
        this.enabled = false;
        this.class = InstallAction_1.HIDE;
        if (this.mcpServer?.local) {
            return;
        }
        if (!this.mcpServer?.gallery && !this.mcpServer?.installable) {
            return;
        }
        if (this.mcpServer.installState !== 3 /* McpServerInstallState.Uninstalled */) {
            return;
        }
        this.class = InstallAction_1.CLASS;
        this.enabled = this.mcpWorkbenchService.canInstall(this.mcpServer) === true;
    }
    async run() {
        if (!this.mcpServer) {
            return;
        }
        if (!this.editor) {
            this.mcpWorkbenchService.open(this.mcpServer);
            alert(localize('mcpServerInstallation', "Installing MCP Server {0} started. An editor is now open with more details on this MCP Server", this.mcpServer.label));
        }
        this.telemetryService.publicLog2('mcp:action:install', { name: this.mcpServer.gallery?.name });
        await this.mcpWorkbenchService.install(this.mcpServer);
    }
};
InstallAction = InstallAction_1 = __decorate([
    __param(1, IMcpWorkbenchService),
    __param(2, ITelemetryService)
], InstallAction);
export { InstallAction };
export class InstallingLabelAction extends McpServerAction {
    static { this.LABEL = localize('installing', "Installing"); }
    static { this.CLASS = `${McpServerAction.LABEL_ACTION_CLASS} install installing`; }
    constructor() {
        super('extension.installing', InstallingLabelAction.LABEL, InstallingLabelAction.CLASS, false);
    }
    update() {
        this.class = `${InstallingLabelAction.CLASS}${this.mcpServer && this.mcpServer.installState === 0 /* McpServerInstallState.Installing */ ? '' : ' hide'}`;
    }
}
let UninstallAction = class UninstallAction extends McpServerAction {
    static { UninstallAction_1 = this; }
    static { this.CLASS = `${this.LABEL_ACTION_CLASS} prominent uninstall`; }
    static { this.HIDE = `${this.CLASS} hide`; }
    constructor(mcpWorkbenchService) {
        super('extensions.uninstall', localize('uninstall', "Uninstall"), UninstallAction_1.CLASS, false);
        this.mcpWorkbenchService = mcpWorkbenchService;
        this.update();
    }
    update() {
        this.enabled = false;
        this.class = UninstallAction_1.HIDE;
        if (!this.mcpServer) {
            return;
        }
        if (!this.mcpServer.local) {
            return;
        }
        if (this.mcpServer.installState !== 1 /* McpServerInstallState.Installed */) {
            this.enabled = false;
            return;
        }
        this.class = UninstallAction_1.CLASS;
        this.enabled = true;
        this.label = localize('uninstall', "Uninstall");
    }
    async run() {
        if (!this.mcpServer) {
            return;
        }
        await this.mcpWorkbenchService.uninstall(this.mcpServer);
    }
};
UninstallAction = UninstallAction_1 = __decorate([
    __param(0, IMcpWorkbenchService)
], UninstallAction);
export { UninstallAction };
let ManageMcpServerAction = class ManageMcpServerAction extends DropDownAction {
    static { ManageMcpServerAction_1 = this; }
    static { this.ID = 'mcpServer.manage'; }
    static { this.Class = `${McpServerAction.ICON_ACTION_CLASS} manage ` + ThemeIcon.asClassName(manageExtensionIcon); }
    static { this.HideManageExtensionClass = `${this.Class} hide`; }
    constructor(isEditorAction, instantiationService) {
        super(ManageMcpServerAction_1.ID, '', '', true, instantiationService);
        this.isEditorAction = isEditorAction;
        this.tooltip = localize('manage', "Manage");
        this.update();
    }
    async getActionGroups() {
        const groups = [];
        groups.push([
            this.instantiationService.createInstance(StartServerAction),
        ]);
        groups.push([
            this.instantiationService.createInstance(StopServerAction),
            this.instantiationService.createInstance(RestartServerAction),
        ]);
        groups.push([
            this.instantiationService.createInstance(AuthServerAction),
        ]);
        groups.push([
            this.instantiationService.createInstance(ShowServerOutputAction),
            this.instantiationService.createInstance(ShowServerConfigurationAction),
            this.instantiationService.createInstance(ShowServerJsonConfigurationAction),
        ]);
        groups.push([
            this.instantiationService.createInstance(ConfigureModelAccessAction),
            this.instantiationService.createInstance(ShowSamplingRequestsAction),
        ]);
        groups.push([
            this.instantiationService.createInstance(BrowseResourcesAction),
        ]);
        if (!this.isEditorAction) {
            groups.push([
                this.instantiationService.createInstance(UninstallAction),
            ]);
        }
        groups.forEach(group => group.forEach(extensionAction => {
            if (extensionAction instanceof McpServerAction) {
                extensionAction.mcpServer = this.mcpServer;
            }
        }));
        return groups;
    }
    async run() {
        return super.run(await this.getActionGroups());
    }
    update() {
        this.class = ManageMcpServerAction_1.HideManageExtensionClass;
        this.enabled = false;
        if (this.mcpServer) {
            this.enabled = !!this.mcpServer.local;
            this.class = this.enabled ? ManageMcpServerAction_1.Class : ManageMcpServerAction_1.HideManageExtensionClass;
        }
    }
};
ManageMcpServerAction = ManageMcpServerAction_1 = __decorate([
    __param(1, IInstantiationService)
], ManageMcpServerAction);
export { ManageMcpServerAction };
let StartServerAction = class StartServerAction extends McpServerAction {
    static { StartServerAction_1 = this; }
    static { this.CLASS = `${this.LABEL_ACTION_CLASS} prominent start`; }
    static { this.HIDE = `${this.CLASS} hide`; }
    constructor(mcpService) {
        super('extensions.start', localize('start', "Start Server"), StartServerAction_1.CLASS, false);
        this.mcpService = mcpService;
        this.update();
    }
    update() {
        this.enabled = false;
        this.class = StartServerAction_1.HIDE;
        const server = this.getServer();
        if (!server) {
            return;
        }
        const serverState = server.connectionState.get();
        if (!McpConnectionState.canBeStarted(serverState.state)) {
            return;
        }
        this.class = StartServerAction_1.CLASS;
        this.enabled = true;
        this.label = localize('start', "Start Server");
    }
    async run() {
        const server = this.getServer();
        if (!server) {
            return;
        }
        await server.start({ promptType: 'all-untrusted' });
        server.showOutput();
    }
    getServer() {
        if (!this.mcpServer) {
            return;
        }
        if (!this.mcpServer.local) {
            return;
        }
        return this.mcpService.servers.get().find(s => s.definition.id === this.mcpServer?.id);
    }
};
StartServerAction = StartServerAction_1 = __decorate([
    __param(0, IMcpService)
], StartServerAction);
export { StartServerAction };
let StopServerAction = class StopServerAction extends McpServerAction {
    static { StopServerAction_1 = this; }
    static { this.CLASS = `${this.LABEL_ACTION_CLASS} prominent stop`; }
    static { this.HIDE = `${this.CLASS} hide`; }
    constructor(mcpService) {
        super('extensions.stop', localize('stop', "Stop Server"), StopServerAction_1.CLASS, false);
        this.mcpService = mcpService;
        this.update();
    }
    update() {
        this.enabled = false;
        this.class = StopServerAction_1.HIDE;
        const server = this.getServer();
        if (!server) {
            return;
        }
        const serverState = server.connectionState.get();
        if (McpConnectionState.canBeStarted(serverState.state)) {
            return;
        }
        this.class = StopServerAction_1.CLASS;
        this.enabled = true;
        this.label = localize('stop', "Stop Server");
    }
    async run() {
        const server = this.getServer();
        if (!server) {
            return;
        }
        await server.stop();
    }
    getServer() {
        if (!this.mcpServer) {
            return;
        }
        if (!this.mcpServer.local) {
            return;
        }
        return this.mcpService.servers.get().find(s => s.definition.id === this.mcpServer?.id);
    }
};
StopServerAction = StopServerAction_1 = __decorate([
    __param(0, IMcpService)
], StopServerAction);
export { StopServerAction };
let RestartServerAction = class RestartServerAction extends McpServerAction {
    static { RestartServerAction_1 = this; }
    static { this.CLASS = `${this.LABEL_ACTION_CLASS} prominent restart`; }
    static { this.HIDE = `${this.CLASS} hide`; }
    constructor(mcpService) {
        super('extensions.restart', localize('restart', "Restart Server"), RestartServerAction_1.CLASS, false);
        this.mcpService = mcpService;
        this.update();
    }
    update() {
        this.enabled = false;
        this.class = RestartServerAction_1.HIDE;
        const server = this.getServer();
        if (!server) {
            return;
        }
        const serverState = server.connectionState.get();
        if (McpConnectionState.canBeStarted(serverState.state)) {
            return;
        }
        this.class = RestartServerAction_1.CLASS;
        this.enabled = true;
        this.label = localize('restart', "Restart Server");
    }
    async run() {
        const server = this.getServer();
        if (!server) {
            return;
        }
        await server.stop();
        await server.start({ promptType: 'all-untrusted' });
        server.showOutput();
    }
    getServer() {
        if (!this.mcpServer) {
            return;
        }
        if (!this.mcpServer.local) {
            return;
        }
        return this.mcpService.servers.get().find(s => s.definition.id === this.mcpServer?.id);
    }
};
RestartServerAction = RestartServerAction_1 = __decorate([
    __param(0, IMcpService)
], RestartServerAction);
export { RestartServerAction };
let AuthServerAction = class AuthServerAction extends McpServerAction {
    static { AuthServerAction_1 = this; }
    static { this.CLASS = `${this.LABEL_ACTION_CLASS} prominent account`; }
    static { this.HIDE = `${this.CLASS} hide`; }
    static { this.SIGN_OUT = localize('mcp.signOut', 'Sign Out'); }
    static { this.DISCONNECT = localize('mcp.disconnect', 'Disconnect Account'); }
    constructor(mcpService, _authenticationQueryService, _authenticationService) {
        super('extensions.restart', localize('restart', "Restart Server"), RestartServerAction.CLASS, false);
        this.mcpService = mcpService;
        this._authenticationQueryService = _authenticationQueryService;
        this._authenticationService = _authenticationService;
        this.update();
    }
    update() {
        this.enabled = false;
        this.class = AuthServerAction_1.HIDE;
        const server = this.getServer();
        if (!server) {
            return;
        }
        const accountQuery = this.getAccountQuery();
        if (!accountQuery) {
            return;
        }
        this._accountQuery = accountQuery;
        this.class = AuthServerAction_1.CLASS;
        this.enabled = true;
        let label = accountQuery.entities().getEntityCount().total > 1 ? AuthServerAction_1.DISCONNECT : AuthServerAction_1.SIGN_OUT;
        label += ` (${accountQuery.accountName})`;
        this.label = label;
    }
    async run() {
        const server = this.getServer();
        if (!server) {
            return;
        }
        const accountQuery = this.getAccountQuery();
        if (!accountQuery) {
            return;
        }
        await server.stop();
        const { providerId, accountName } = accountQuery;
        accountQuery.mcpServer(server.definition.id).setAccessAllowed(false, server.definition.label);
        if (this.label === AuthServerAction_1.SIGN_OUT) {
            const accounts = await this._authenticationService.getAccounts(providerId);
            const account = accounts.find(a => a.label === accountName);
            if (account) {
                const sessions = await this._authenticationService.getSessions(providerId, undefined, { account });
                for (const session of sessions) {
                    await this._authenticationService.removeSession(providerId, session.id);
                }
            }
        }
    }
    getServer() {
        if (!this.mcpServer) {
            return;
        }
        if (!this.mcpServer.local) {
            return;
        }
        return this.mcpService.servers.get().find(s => s.definition.id === this.mcpServer?.id);
    }
    getAccountQuery() {
        const server = this.getServer();
        if (!server) {
            return undefined;
        }
        if (this._accountQuery) {
            return this._accountQuery;
        }
        const serverId = server.definition.id;
        const preferences = this._authenticationQueryService.mcpServer(serverId).getAllAccountPreferences();
        if (!preferences.size) {
            return undefined;
        }
        for (const [providerId, accountName] of preferences) {
            const accountQuery = this._authenticationQueryService.provider(providerId).account(accountName);
            if (!accountQuery.mcpServer(serverId).isAccessAllowed()) {
                continue; // skip accounts that are not allowed
            }
            return accountQuery;
        }
        return undefined;
    }
};
AuthServerAction = AuthServerAction_1 = __decorate([
    __param(0, IMcpService),
    __param(1, IAuthenticationQueryService),
    __param(2, IAuthenticationService)
], AuthServerAction);
export { AuthServerAction };
let ShowServerOutputAction = class ShowServerOutputAction extends McpServerAction {
    static { ShowServerOutputAction_1 = this; }
    static { this.CLASS = `${this.LABEL_ACTION_CLASS} prominent output`; }
    static { this.HIDE = `${this.CLASS} hide`; }
    constructor(mcpService) {
        super('extensions.output', localize('output', "Show Output"), ShowServerOutputAction_1.CLASS, false);
        this.mcpService = mcpService;
        this.update();
    }
    update() {
        this.enabled = false;
        this.class = ShowServerOutputAction_1.HIDE;
        const server = this.getServer();
        if (!server) {
            return;
        }
        this.class = ShowServerOutputAction_1.CLASS;
        this.enabled = true;
        this.label = localize('output', "Show Output");
    }
    async run() {
        const server = this.getServer();
        if (!server) {
            return;
        }
        server.showOutput();
    }
    getServer() {
        if (!this.mcpServer) {
            return;
        }
        if (!this.mcpServer.local) {
            return;
        }
        return this.mcpService.servers.get().find(s => s.definition.id === this.mcpServer?.id);
    }
};
ShowServerOutputAction = ShowServerOutputAction_1 = __decorate([
    __param(0, IMcpService)
], ShowServerOutputAction);
export { ShowServerOutputAction };
let ShowServerConfigurationAction = class ShowServerConfigurationAction extends McpServerAction {
    static { ShowServerConfigurationAction_1 = this; }
    static { this.CLASS = `${this.LABEL_ACTION_CLASS} prominent config`; }
    static { this.HIDE = `${this.CLASS} hide`; }
    constructor(mcpWorkbenchService) {
        super('extensions.config', localize('config', "Show Configuration"), ShowServerConfigurationAction_1.CLASS, false);
        this.mcpWorkbenchService = mcpWorkbenchService;
        this.update();
    }
    update() {
        this.enabled = false;
        this.class = ShowServerConfigurationAction_1.HIDE;
        if (!this.mcpServer?.local) {
            return;
        }
        this.class = ShowServerConfigurationAction_1.CLASS;
        this.enabled = true;
    }
    async run() {
        if (!this.mcpServer?.local) {
            return;
        }
        this.mcpWorkbenchService.open(this.mcpServer, { tab: "configuration" /* McpServerEditorTab.Configuration */ });
    }
};
ShowServerConfigurationAction = ShowServerConfigurationAction_1 = __decorate([
    __param(0, IMcpWorkbenchService)
], ShowServerConfigurationAction);
export { ShowServerConfigurationAction };
let ShowServerJsonConfigurationAction = class ShowServerJsonConfigurationAction extends McpServerAction {
    static { ShowServerJsonConfigurationAction_1 = this; }
    static { this.CLASS = `${this.LABEL_ACTION_CLASS} prominent config`; }
    static { this.HIDE = `${this.CLASS} hide`; }
    constructor(mcpService, mcpRegistry, editorService) {
        super('extensions.jsonConfig', localize('configJson', "Show Configuration (JSON)"), ShowServerJsonConfigurationAction_1.CLASS, false);
        this.mcpService = mcpService;
        this.mcpRegistry = mcpRegistry;
        this.editorService = editorService;
        this.update();
    }
    update() {
        this.enabled = false;
        this.class = ShowServerJsonConfigurationAction_1.HIDE;
        const configurationTarget = this.getConfigurationTarget();
        if (!configurationTarget) {
            return;
        }
        this.class = ShowServerConfigurationAction.CLASS;
        this.enabled = true;
    }
    async run() {
        const configurationTarget = this.getConfigurationTarget();
        if (!configurationTarget) {
            return;
        }
        this.editorService.openEditor({
            resource: URI.isUri(configurationTarget) ? configurationTarget : configurationTarget.uri,
            options: { selection: URI.isUri(configurationTarget) ? undefined : configurationTarget.range }
        });
    }
    getConfigurationTarget() {
        if (!this.mcpServer) {
            return;
        }
        if (!this.mcpServer.local) {
            return;
        }
        const server = this.mcpService.servers.get().find(s => s.definition.label === this.mcpServer?.name);
        if (!server) {
            return;
        }
        const collection = this.mcpRegistry.collections.get().find(c => c.id === server.collection.id);
        const serverDefinition = collection?.serverDefinitions.get().find(s => s.id === server.definition.id);
        return serverDefinition?.presentation?.origin || collection?.presentation?.origin;
    }
};
ShowServerJsonConfigurationAction = ShowServerJsonConfigurationAction_1 = __decorate([
    __param(0, IMcpService),
    __param(1, IMcpRegistry),
    __param(2, IEditorService)
], ShowServerJsonConfigurationAction);
export { ShowServerJsonConfigurationAction };
let ConfigureModelAccessAction = class ConfigureModelAccessAction extends McpServerAction {
    static { ConfigureModelAccessAction_1 = this; }
    static { this.CLASS = `${this.LABEL_ACTION_CLASS} prominent config`; }
    static { this.HIDE = `${this.CLASS} hide`; }
    constructor(mcpService, commandService) {
        super('extensions.config', localize('mcp.configAccess', 'Configure Model Access'), ConfigureModelAccessAction_1.CLASS, false);
        this.mcpService = mcpService;
        this.commandService = commandService;
        this.update();
    }
    update() {
        this.enabled = false;
        this.class = ConfigureModelAccessAction_1.HIDE;
        const server = this.getServer();
        if (!server) {
            return;
        }
        this.class = ConfigureModelAccessAction_1.CLASS;
        this.enabled = true;
        this.label = localize('mcp.configAccess', 'Configure Model Access');
    }
    async run() {
        const server = this.getServer();
        if (!server) {
            return;
        }
        this.commandService.executeCommand("workbench.mcp.configureSamplingModels" /* McpCommandIds.ConfigureSamplingModels */, server);
    }
    getServer() {
        if (!this.mcpServer) {
            return;
        }
        if (!this.mcpServer.local) {
            return;
        }
        return this.mcpService.servers.get().find(s => s.definition.id === this.mcpServer?.id);
    }
};
ConfigureModelAccessAction = ConfigureModelAccessAction_1 = __decorate([
    __param(0, IMcpService),
    __param(1, ICommandService)
], ConfigureModelAccessAction);
export { ConfigureModelAccessAction };
let ShowSamplingRequestsAction = class ShowSamplingRequestsAction extends McpServerAction {
    static { ShowSamplingRequestsAction_1 = this; }
    static { this.CLASS = `${this.LABEL_ACTION_CLASS} prominent config`; }
    static { this.HIDE = `${this.CLASS} hide`; }
    constructor(mcpService, samplingService, editorService) {
        super('extensions.config', localize('mcp.samplingLog', 'Show Sampling Requests'), ShowSamplingRequestsAction_1.CLASS, false);
        this.mcpService = mcpService;
        this.samplingService = samplingService;
        this.editorService = editorService;
        this.update();
    }
    update() {
        this.enabled = false;
        this.class = ShowSamplingRequestsAction_1.HIDE;
        const server = this.getServer();
        if (!server) {
            return;
        }
        if (!this.samplingService.hasLogs(server)) {
            return;
        }
        this.class = ShowSamplingRequestsAction_1.CLASS;
        this.enabled = true;
    }
    async run() {
        const server = this.getServer();
        if (!server) {
            return;
        }
        if (!this.samplingService.hasLogs(server)) {
            return;
        }
        this.editorService.openEditor({
            resource: undefined,
            contents: this.samplingService.getLogText(server),
            label: localize('mcp.samplingLog.title', 'MCP Sampling: {0}', server.definition.label),
        });
    }
    getServer() {
        if (!this.mcpServer) {
            return;
        }
        if (!this.mcpServer.local) {
            return;
        }
        return this.mcpService.servers.get().find(s => s.definition.id === this.mcpServer?.id);
    }
};
ShowSamplingRequestsAction = ShowSamplingRequestsAction_1 = __decorate([
    __param(0, IMcpService),
    __param(1, IMcpSamplingService),
    __param(2, IEditorService)
], ShowSamplingRequestsAction);
export { ShowSamplingRequestsAction };
let BrowseResourcesAction = class BrowseResourcesAction extends McpServerAction {
    static { BrowseResourcesAction_1 = this; }
    static { this.CLASS = `${this.LABEL_ACTION_CLASS} prominent config`; }
    static { this.HIDE = `${this.CLASS} hide`; }
    constructor(mcpService, commandService) {
        super('extensions.config', localize('mcp.resources', 'Browse Resources'), BrowseResourcesAction_1.CLASS, false);
        this.mcpService = mcpService;
        this.commandService = commandService;
        this.update();
    }
    update() {
        this.enabled = false;
        this.class = BrowseResourcesAction_1.HIDE;
        const server = this.getServer();
        if (!server) {
            return;
        }
        const capabilities = server.capabilities.get();
        if (capabilities !== undefined && !(capabilities & 16 /* McpCapability.Resources */)) {
            return;
        }
        this.class = BrowseResourcesAction_1.CLASS;
        this.enabled = true;
    }
    async run() {
        const server = this.getServer();
        if (!server) {
            return;
        }
        const capabilities = server.capabilities.get();
        if (capabilities !== undefined && !(capabilities & 16 /* McpCapability.Resources */)) {
            return;
        }
        return this.commandService.executeCommand("workbench.mcp.browseResources" /* McpCommandIds.BrowseResources */, server);
    }
    getServer() {
        if (!this.mcpServer) {
            return;
        }
        if (!this.mcpServer.local) {
            return;
        }
        return this.mcpService.servers.get().find(s => s.definition.id === this.mcpServer?.id);
    }
};
BrowseResourcesAction = BrowseResourcesAction_1 = __decorate([
    __param(0, IMcpService),
    __param(1, ICommandService)
], BrowseResourcesAction);
export { BrowseResourcesAction };
let McpServerStatusAction = class McpServerStatusAction extends McpServerAction {
    static { McpServerStatusAction_1 = this; }
    static { this.CLASS = `${McpServerAction.ICON_ACTION_CLASS} extension-status`; }
    get status() { return this._status; }
    constructor(mcpWorkbenchService, allowedMcpServersService, commandService) {
        super('extensions.status', '', `${McpServerStatusAction_1.CLASS} hide`, false);
        this.mcpWorkbenchService = mcpWorkbenchService;
        this.allowedMcpServersService = allowedMcpServersService;
        this.commandService = commandService;
        this._status = [];
        this._onDidChangeStatus = this._register(new Emitter());
        this.onDidChangeStatus = this._onDidChangeStatus.event;
        this._register(allowedMcpServersService.onDidChangeAllowedMcpServers(() => this.update()));
        this.update();
    }
    update() {
        this.computeAndUpdateStatus();
    }
    computeAndUpdateStatus() {
        this.updateStatus(undefined, true);
        this.enabled = false;
        if (!this.mcpServer) {
            return;
        }
        if ((this.mcpServer.gallery || this.mcpServer.installable) && this.mcpServer.installState === 3 /* McpServerInstallState.Uninstalled */) {
            const result = this.mcpWorkbenchService.canInstall(this.mcpServer);
            if (result !== true) {
                this.updateStatus({ icon: warningIcon, message: result }, true);
                return;
            }
        }
        if (this.mcpServer.local && this.mcpServer.installState === 1 /* McpServerInstallState.Installed */) {
            const result = this.allowedMcpServersService.isAllowed(this.mcpServer.local);
            if (result !== true) {
                this.updateStatus({ icon: warningIcon, message: new MarkdownString(localize('disabled - not allowed', "This MCP Server is disabled because {0}", result.value)) }, true);
                return;
            }
        }
    }
    updateStatus(status, updateClass) {
        if (status) {
            if (this._status.some(s => s.message.value === status.message.value && s.icon?.id === status.icon?.id)) {
                return;
            }
        }
        else {
            if (this._status.length === 0) {
                return;
            }
            this._status = [];
        }
        if (status) {
            this._status.push(status);
            this._status.sort((a, b) => b.icon === trustIcon ? -1 :
                a.icon === trustIcon ? 1 :
                    b.icon === errorIcon ? -1 :
                        a.icon === errorIcon ? 1 :
                            b.icon === warningIcon ? -1 :
                                a.icon === warningIcon ? 1 :
                                    b.icon === infoIcon ? -1 :
                                        a.icon === infoIcon ? 1 :
                                            0);
        }
        if (updateClass) {
            if (status?.icon === errorIcon) {
                this.class = `${McpServerStatusAction_1.CLASS} extension-status-error ${ThemeIcon.asClassName(errorIcon)}`;
            }
            else if (status?.icon === warningIcon) {
                this.class = `${McpServerStatusAction_1.CLASS} extension-status-warning ${ThemeIcon.asClassName(warningIcon)}`;
            }
            else if (status?.icon === infoIcon) {
                this.class = `${McpServerStatusAction_1.CLASS} extension-status-info ${ThemeIcon.asClassName(infoIcon)}`;
            }
            else if (status?.icon === trustIcon) {
                this.class = `${McpServerStatusAction_1.CLASS} ${ThemeIcon.asClassName(trustIcon)}`;
            }
            else {
                this.class = `${McpServerStatusAction_1.CLASS} hide`;
            }
        }
        this._onDidChangeStatus.fire();
    }
    async run() {
        if (this._status[0]?.icon === trustIcon) {
            return this.commandService.executeCommand('workbench.trust.manage');
        }
    }
};
McpServerStatusAction = McpServerStatusAction_1 = __decorate([
    __param(0, IMcpWorkbenchService),
    __param(1, IAllowedMcpServersService),
    __param(2, ICommandService)
], McpServerStatusAction);
export { McpServerStatusAction };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWNwU2VydmVyQWN0aW9ucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL2FkdmlrYXIvRG9jdW1lbnRzL2FyY2hpdGVjdC9hcmNoMi9BcmNoSURFL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL21jcC9icm93c2VyL21jcFNlcnZlckFjdGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQ3pFLE9BQU8sRUFBRSxjQUFjLEVBQTBCLE1BQU0sMERBQTBELENBQUM7QUFDbEgsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ2pFLE9BQU8sRUFBRSxNQUFNLEVBQVcsU0FBUyxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDaEYsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQzNELE9BQU8sRUFBbUIsY0FBYyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDekYsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDM0UsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2pFLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUNyRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFFOUMsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQ25GLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQzlGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ25HLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQzdGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG9EQUFvRCxDQUFD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