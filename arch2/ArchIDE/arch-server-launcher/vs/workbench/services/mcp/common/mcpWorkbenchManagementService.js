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
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import { IMcpManagementService, IMcpGalleryService, IAllowedMcpServersService } from '../../../../platform/mcp/common/mcpManagement.js';
import { IInstantiationService, refineServiceDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { IUserDataProfileService } from '../../../services/userDataProfile/common/userDataProfile.js';
import { Emitter } from '../../../../base/common/event.js';
import { IMcpResourceScannerService } from '../../../../platform/mcp/common/mcpResourceScannerService.js';
import { isWorkspaceFolder, IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { MCP_CONFIGURATION_KEY, WORKSPACE_STANDALONE_CONFIGURATIONS } from '../../configuration/common/configuration.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IRemoteAgentService } from '../../remote/common/remoteAgentService.js';
import { McpManagementChannelClient } from '../../../../platform/mcp/common/mcpManagementIpc.js';
import { IUserDataProfilesService } from '../../../../platform/userDataProfile/common/userDataProfile.js';
import { IRemoteUserDataProfilesService } from '../../userDataProfile/common/remoteUserDataProfiles.js';
import { AbstractMcpManagementService, AbstractMcpResourceManagementService } from '../../../../platform/mcp/common/mcpManagementService.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { ResourceMap } from '../../../../base/common/map.js';
export const USER_CONFIG_ID = 'usrlocal';
export const REMOTE_USER_CONFIG_ID = 'usrremote';
export const WORKSPACE_CONFIG_ID = 'workspace';
export const WORKSPACE_FOLDER_CONFIG_ID_PREFIX = 'ws';
export var LocalMcpServerScope;
(function (LocalMcpServerScope) {
    LocalMcpServerScope["User"] = "user";
    LocalMcpServerScope["RemoteUser"] = "remoteUser";
    LocalMcpServerScope["Workspace"] = "workspace";
})(LocalMcpServerScope || (LocalMcpServerScope = {}));
export const IWorkbenchMcpManagementService = refineServiceDecorator(IMcpManagementService);
let WorkbenchMcpManagementService = class WorkbenchMcpManagementService extends AbstractMcpManagementService {
    constructor(mcpManagementService, allowedMcpServersService, userDataProfileService, uriIdentityService, workspaceContextService, remoteAgentService, userDataProfilesService, remoteUserDataProfilesService, instantiationService) {
        super(allowedMcpServersService);
        this.mcpManagementService = mcpManagementService;
        this.userDataProfileService = userDataProfileService;
        this.uriIdentityService = uriIdentityService;
        this.workspaceContextService = workspaceContextService;
        this.userDataProfilesService = userDataProfilesService;
        this.remoteUserDataProfilesService = remoteUserDataProfilesService;
        this._onInstallMcpServer = this._register(new Emitter());
        this.onInstallMcpServer = this._onInstallMcpServer.event;
        this._onDidInstallMcpServers = this._register(new Emitter());
        this.onDidInstallMcpServers = this._onDidInstallMcpServers.event;
        this._onDidUpdateMcpServers = this._register(new Emitter());
        this.onDidUpdateMcpServers = this._onDidUpdateMcpServers.event;
        this._onUninstallMcpServer = this._register(new Emitter());
        this.onUninstallMcpServer = this._onUninstallMcpServer.event;
        this._onDidUninstallMcpServer = this._register(new Emitter());
        this.onDidUninstallMcpServer = this._onDidUninstallMcpServer.event;
        this._onInstallMcpServerInCurrentProfile = this._register(new Emitter());
        this.onInstallMcpServerInCurrentProfile = this._onInstallMcpServerInCurrentProfile.event;
        this._onDidInstallMcpServersInCurrentProfile = this._register(new Emitter());
        this.onDidInstallMcpServersInCurrentProfile = this._onDidInstallMcpServersInCurrentProfile.event;
        this._onDidUpdateMcpServersInCurrentProfile = this._register(new Emitter());
        this.onDidUpdateMcpServersInCurrentProfile = this._onDidUpdateMcpServersInCurrentProfile.event;
        this._onUninstallMcpServerInCurrentProfile = this._register(new Emitter());
        this.onUninstallMcpServerInCurrentProfile = this._onUninstallMcpServerInCurrentProfile.event;
        this._onDidUninstallMcpServerInCurrentProfile = this._register(new Emitter());
        this.onDidUninstallMcpServerInCurrentProfile = this._onDidUninstallMcpServerInCurrentProfile.event;
        this._onDidChangeProfile = this._register(new Emitter());
        this.onDidChangeProfile = this._onDidChangeProfile.event;
        this.workspaceMcpManagementService = this._register(instantiationService.createInstance(WorkspaceMcpManagementService));
        const remoteAgentConnection = remoteAgentService.getConnection();
        if (remoteAgentConnection) {
            this.remoteMcpManagementService = this._register(instantiationService.createInstance(McpManagementChannelClient, remoteAgentConnection.getChannel('mcpManagement')));
        }
        this._register(this.mcpManagementService.onInstallMcpServer(e => {
            this._onInstallMcpServer.fire(e);
            if (uriIdentityService.extUri.isEqual(e.mcpResource, this.userDataProfileService.currentProfile.mcpResource)) {
                this._onInstallMcpServerInCurrentProfile.fire({ ...e, scope: "user" /* LocalMcpServerScope.User */ });
            }
        }));
        this._register(this.mcpManagementService.onDidInstallMcpServers(e => {
            const { mcpServerInstallResult, mcpServerInstallResultInCurrentProfile } = this.createInstallMcpServerResultsFromEvent(e, "user" /* LocalMcpServerScope.User */);
            this._onDidInstallMcpServers.fire(mcpServerInstallResult);
            if (mcpServerInstallResultInCurrentProfile.length) {
                this._onDidInstallMcpServersInCurrentProfile.fire(mcpServerInstallResultInCurrentProfile);
            }
        }));
        this._register(this.mcpManagementService.onDidUpdateMcpServers(e => {
            const { mcpServerInstallResult, mcpServerInstallResultInCurrentProfile } = this.createInstallMcpServerResultsFromEvent(e, "user" /* LocalMcpServerScope.User */);
            this._onDidUpdateMcpServers.fire(mcpServerInstallResult);
            if (mcpServerInstallResultInCurrentProfile.length) {
                this._onDidUpdateMcpServersInCurrentProfile.fire(mcpServerInstallResultInCurrentProfile);
            }
        }));
        this._register(this.mcpManagementService.onUninstallMcpServer(e => {
            this._onUninstallMcpServer.fire(e);
            if (uriIdentityService.extUri.isEqual(e.mcpResource, this.userDataProfileService.currentProfile.mcpResource)) {
                this._onUninstallMcpServerInCurrentProfile.fire({ ...e, scope: "user" /* LocalMcpServerScope.User */ });
            }
        }));
        this._register(this.mcpManagementService.onDidUninstallMcpServer(e => {
            this._onDidUninstallMcpServer.fire(e);
            if (uriIdentityService.extUri.isEqual(e.mcpResource, this.userDataProfileService.currentProfile.mcpResource)) {
                this._onDidUninstallMcpServerInCurrentProfile.fire({ ...e, scope: "user" /* LocalMcpServerScope.User */ });
            }
        }));
        this._register(this.workspaceMcpManagementService.onInstallMcpServer(async (e) => {
            this._onInstallMcpServer.fire(e);
            this._onInstallMcpServerInCurrentProfile.fire({ ...e, scope: "workspace" /* LocalMcpServerScope.Workspace */ });
        }));
        this._register(this.workspaceMcpManagementService.onDidInstallMcpServers(async (e) => {
            const { mcpServerInstallResult } = this.createInstallMcpServerResultsFromEvent(e, "workspace" /* LocalMcpServerScope.Workspace */);
            this._onDidInstallMcpServers.fire(mcpServerInstallResult);
            this._onDidInstallMcpServersInCurrentProfile.fire(mcpServerInstallResult);
        }));
        this._register(this.workspaceMcpManagementService.onUninstallMcpServer(async (e) => {
            this._onUninstallMcpServer.fire(e);
            this._onUninstallMcpServerInCurrentProfile.fire({ ...e, scope: "workspace" /* LocalMcpServerScope.Workspace */ });
        }));
        this._register(this.workspaceMcpManagementService.onDidUninstallMcpServer(async (e) => {
            this._onDidUninstallMcpServer.fire(e);
            this._onDidUninstallMcpServerInCurrentProfile.fire({ ...e, scope: "workspace" /* LocalMcpServerScope.Workspace */ });
        }));
        this._register(this.workspaceMcpManagementService.onDidUpdateMcpServers(e => {
            const { mcpServerInstallResult } = this.createInstallMcpServerResultsFromEvent(e, "workspace" /* LocalMcpServerScope.Workspace */);
            this._onDidUpdateMcpServers.fire(mcpServerInstallResult);
            this._onDidUpdateMcpServersInCurrentProfile.fire(mcpServerInstallResult);
        }));
        if (this.remoteMcpManagementService) {
            this._register(this.remoteMcpManagementService.onInstallMcpServer(async (e) => {
                this._onInstallMcpServer.fire(e);
                const remoteMcpResource = await this.getRemoteMcpResource(this.userDataProfileService.currentProfile.mcpResource);
                if (remoteMcpResource ? uriIdentityService.extUri.isEqual(e.mcpResource, remoteMcpResource) : this.userDataProfileService.currentProfile.isDefault) {
                    this._onInstallMcpServerInCurrentProfile.fire({ ...e, scope: "remoteUser" /* LocalMcpServerScope.RemoteUser */ });
                }
            }));
            this._register(this.remoteMcpManagementService.onDidInstallMcpServers(e => this.handleRemoteInstallMcpServerResultsFromEvent(e, this._onDidInstallMcpServers, this._onDidInstallMcpServersInCurrentProfile)));
            this._register(this.remoteMcpManagementService.onDidUpdateMcpServers(e => this.handleRemoteInstallMcpServerResultsFromEvent(e, this._onDidInstallMcpServers, this._onDidInstallMcpServersInCurrentProfile)));
            this._register(this.remoteMcpManagementService.onUninstallMcpServer(async (e) => {
                this._onUninstallMcpServer.fire(e);
                const remoteMcpResource = await this.getRemoteMcpResource(this.userDataProfileService.currentProfile.mcpResource);
                if (remoteMcpResource ? uriIdentityService.extUri.isEqual(e.mcpResource, remoteMcpResource) : this.userDataProfileService.currentProfile.isDefault) {
                    this._onUninstallMcpServerInCurrentProfile.fire({ ...e, scope: "remoteUser" /* LocalMcpServerScope.RemoteUser */ });
                }
            }));
            this._register(this.remoteMcpManagementService.onDidUninstallMcpServer(async (e) => {
                this._onDidUninstallMcpServer.fire(e);
                const remoteMcpResource = await this.getRemoteMcpResource(this.userDataProfileService.currentProfile.mcpResource);
                if (remoteMcpResource ? uriIdentityService.extUri.isEqual(e.mcpResource, remoteMcpResource) : this.userDataProfileService.currentProfile.isDefault) {
                    this._onDidUninstallMcpServerInCurrentProfile.fire({ ...e, scope: "remoteUser" /* LocalMcpServerScope.RemoteUser */ });
                }
            }));
        }
        this._register(userDataProfileService.onDidChangeCurrentProfile(e => {
            if (!this.uriIdentityService.extUri.isEqual(e.previous.mcpResource, e.profile.mcpResource)) {
                this._onDidChangeProfile.fire();
            }
        }));
    }
    createInstallMcpServerResultsFromEvent(e, scope) {
        const mcpServerInstallResult = [];
        const mcpServerInstallResultInCurrentProfile = [];
        for (const result of e) {
            const workbenchResult = {
                ...result,
                local: result.local ? this.toWorkspaceMcpServer(result.local, scope) : undefined
            };
            mcpServerInstallResult.push(workbenchResult);
            if (this.uriIdentityService.extUri.isEqual(result.mcpResource, this.userDataProfileService.currentProfile.mcpResource)) {
                mcpServerInstallResultInCurrentProfile.push(workbenchResult);
            }
        }
        return { mcpServerInstallResult, mcpServerInstallResultInCurrentProfile };
    }
    async handleRemoteInstallMcpServerResultsFromEvent(e, emitter, currentProfileEmitter) {
        const mcpServerInstallResult = [];
        const mcpServerInstallResultInCurrentProfile = [];
        const remoteMcpResource = await this.getRemoteMcpResource(this.userDataProfileService.currentProfile.mcpResource);
        for (const result of e) {
            const workbenchResult = {
                ...result,
                local: result.local ? this.toWorkspaceMcpServer(result.local, "remoteUser" /* LocalMcpServerScope.RemoteUser */) : undefined
            };
            mcpServerInstallResult.push(workbenchResult);
            if (remoteMcpResource ? this.uriIdentityService.extUri.isEqual(result.mcpResource, remoteMcpResource) : this.userDataProfileService.currentProfile.isDefault) {
                mcpServerInstallResultInCurrentProfile.push(workbenchResult);
            }
        }
        emitter.fire(mcpServerInstallResult);
        if (mcpServerInstallResultInCurrentProfile.length) {
            currentProfileEmitter.fire(mcpServerInstallResultInCurrentProfile);
        }
    }
    async getInstalled() {
        const installed = [];
        const [userServers, remoteServers, workspaceServers] = await Promise.all([
            this.mcpManagementService.getInstalled(this.userDataProfileService.currentProfile.mcpResource),
            this.remoteMcpManagementService?.getInstalled(await this.getRemoteMcpResource()) ?? Promise.resolve([]),
            this.workspaceMcpManagementService?.getInstalled() ?? Promise.resolve([]),
        ]);
        for (const server of userServers) {
            installed.push(this.toWorkspaceMcpServer(server, "user" /* LocalMcpServerScope.User */));
        }
        for (const server of remoteServers) {
            installed.push(this.toWorkspaceMcpServer(server, "remoteUser" /* LocalMcpServerScope.RemoteUser */));
        }
        for (const server of workspaceServers) {
            installed.push(this.toWorkspaceMcpServer(server, "workspace" /* LocalMcpServerScope.Workspace */));
        }
        return installed;
    }
    toWorkspaceMcpServer(server, scope) {
        return { ...server, id: `mcp.config.${this.getConfigId(server, scope)}.${server.name}`, scope };
    }
    getConfigId(server, scope) {
        if (scope === "user" /* LocalMcpServerScope.User */) {
            return USER_CONFIG_ID;
        }
        if (scope === "remoteUser" /* LocalMcpServerScope.RemoteUser */) {
            return REMOTE_USER_CONFIG_ID;
        }
        if (scope === "workspace" /* LocalMcpServerScope.Workspace */) {
            const workspace = this.workspaceContextService.getWorkspace();
            if (workspace.configuration && this.uriIdentityService.extUri.isEqual(workspace.configuration, server.mcpResource)) {
                return WORKSPACE_CONFIG_ID;
            }
            const workspaceFolders = workspace.folders;
            for (let index = 0; index < workspaceFolders.length; index++) {
                const workspaceFolder = workspaceFolders[index];
                if (this.uriIdentityService.extUri.isEqual(this.uriIdentityService.extUri.joinPath(workspaceFolder.uri, WORKSPACE_STANDALONE_CONFIGURATIONS[MCP_CONFIGURATION_KEY]), server.mcpResource)) {
                    return `${WORKSPACE_FOLDER_CONFIG_ID_PREFIX}${index}`;
                }
            }
        }
        return 'unknown';
    }
    async install(server, options) {
        options = options ?? {};
        if (options.target === 5 /* ConfigurationTarget.WORKSPACE */ || isWorkspaceFolder(options.target)) {
            const mcpResource = options.target === 5 /* ConfigurationTarget.WORKSPACE */ ? this.workspaceContextService.getWorkspace().configuration : options.target.toResource(WORKSPACE_STANDALONE_CONFIGURATIONS[MCP_CONFIGURATION_KEY]);
            if (!mcpResource) {
                throw new Error(`Illegal target: ${options.target}`);
            }
            options.mcpResource = mcpResource;
            const result = await this.workspaceMcpManagementService.install(server, options);
            return this.toWorkspaceMcpServer(result, "workspace" /* LocalMcpServerScope.Workspace */);
        }
        if (options.target === 4 /* ConfigurationTarget.USER_REMOTE */) {
            if (!this.remoteMcpManagementService) {
                throw new Error(`Illegal target: ${options.target}`);
            }
            options.mcpResource = await this.getRemoteMcpResource(options.mcpResource);
            const result = await this.remoteMcpManagementService.install(server, options);
            return this.toWorkspaceMcpServer(result, "remoteUser" /* LocalMcpServerScope.RemoteUser */);
        }
        if (options.target && options.target !== 2 /* ConfigurationTarget.USER */ && options.target !== 3 /* ConfigurationTarget.USER_LOCAL */) {
            throw new Error(`Illegal target: ${options.target}`);
        }
        options.mcpResource = this.userDataProfileService.currentProfile.mcpResource;
        const result = await this.mcpManagementService.install(server, options);
        return this.toWorkspaceMcpServer(result, "user" /* LocalMcpServerScope.User */);
    }
    async installFromGallery(server, options) {
        options = options ?? {};
        if (!options.mcpResource) {
            options.mcpResource = this.userDataProfileService.currentProfile.mcpResource;
        }
        const result = await this.mcpManagementService.installFromGallery(server, options);
        return this.toWorkspaceMcpServer(result, "user" /* LocalMcpServerScope.User */);
    }
    async updateMetadata(local, server, profileLocation) {
        if (local.scope === "workspace" /* LocalMcpServerScope.Workspace */) {
            const result = await this.workspaceMcpManagementService.updateMetadata(local, server, profileLocation);
            return this.toWorkspaceMcpServer(result, "workspace" /* LocalMcpServerScope.Workspace */);
        }
        if (local.scope === "remoteUser" /* LocalMcpServerScope.RemoteUser */) {
            if (!this.remoteMcpManagementService) {
                throw new Error(`Illegal target: ${local.scope}`);
            }
            const result = await this.remoteMcpManagementService.updateMetadata(local, server, profileLocation);
            return this.toWorkspaceMcpServer(result, "remoteUser" /* LocalMcpServerScope.RemoteUser */);
        }
        const result = await this.mcpManagementService.updateMetadata(local, server, profileLocation);
        return this.toWorkspaceMcpServer(result, "user" /* LocalMcpServerScope.User */);
    }
    async uninstall(server) {
        if (server.scope === "workspace" /* LocalMcpServerScope.Workspace */) {
            return this.workspaceMcpManagementService.uninstall(server);
        }
        if (server.scope === "remoteUser" /* LocalMcpServerScope.RemoteUser */) {
            if (!this.remoteMcpManagementService) {
                throw new Error(`Illegal target: ${server.scope}`);
            }
            return this.remoteMcpManagementService.uninstall(server);
        }
        return this.mcpManagementService.uninstall(server, { mcpResource: this.userDataProfileService.currentProfile.mcpResource });
    }
    async getRemoteMcpResource(mcpResource) {
        if (!mcpResource && this.userDataProfileService.currentProfile.isDefault) {
            return undefined;
        }
        mcpResource = mcpResource ?? this.userDataProfileService.currentProfile.mcpResource;
        let profile = this.userDataProfilesService.profiles.find(p => this.uriIdentityService.extUri.isEqual(p.mcpResource, mcpResource));
        if (profile) {
            profile = await this.remoteUserDataProfilesService.getRemoteProfile(profile);
        }
        else {
            profile = (await this.remoteUserDataProfilesService.getRemoteProfiles()).find(p => this.uriIdentityService.extUri.isEqual(p.mcpResource, mcpResource));
        }
        return profile?.mcpResource;
    }
};
WorkbenchMcpManagementService = __decorate([
    __param(1, IAllowedMcpServersService),
    __param(2, IUserDataProfileService),
    __param(3, IUriIdentityService),
    __param(4, IWorkspaceContextService),
    __param(5, IRemoteAgentService),
    __param(6, IUserDataProfilesService),
    __param(7, IRemoteUserDataProfilesService),
    __param(8, IInstantiationService)
], WorkbenchMcpManagementService);
export { WorkbenchMcpManagementService };
let WorkspaceMcpResourceManagementService = class WorkspaceMcpResourceManagementService extends AbstractMcpResourceManagementService {
    constructor(mcpResource, target, mcpGalleryService, fileService, uriIdentityService, logService, mcpResourceScannerService) {
        super(mcpResource, target, mcpGalleryService, fileService, uriIdentityService, logService, mcpResourceScannerService);
    }
    installFromGallery() {
        throw new Error('Not supported');
    }
    updateMetadata() {
        throw new Error('Not supported');
    }
    installFromUri() {
        throw new Error('Not supported');
    }
    async getLocalServerInfo() {
        return undefined;
    }
};
WorkspaceMcpResourceManagementService = __decorate([
    __param(2, IMcpGalleryService),
    __param(3, IFileService),
    __param(4, IUriIdentityService),
    __param(5, ILogService),
    __param(6, IMcpResourceScannerService)
], WorkspaceMcpResourceManagementService);
let WorkspaceMcpManagementService = class WorkspaceMcpManagementService extends AbstractMcpManagementService {
    constructor(allowedMcpServersService, uriIdentityService, logService, workspaceContextService, instantiationService) {
        super(allowedMcpServersService);
        this.uriIdentityService = uriIdentityService;
        this.logService = logService;
        this.workspaceContextService = workspaceContextService;
        this.instantiationService = instantiationService;
        this._onInstallMcpServer = this._register(new Emitter());
        this.onInstallMcpServer = this._onInstallMcpServer.event;
        this._onDidInstallMcpServers = this._register(new Emitter());
        this.onDidInstallMcpServers = this._onDidInstallMcpServers.event;
        this._onDidUpdateMcpServers = this._register(new Emitter());
        this.onDidUpdateMcpServers = this._onDidUpdateMcpServers.event;
        this._onUninstallMcpServer = this._register(new Emitter());
        this.onUninstallMcpServer = this._onUninstallMcpServer.event;
        this._onDidUninstallMcpServer = this._register(new Emitter());
        this.onDidUninstallMcpServer = this._onDidUninstallMcpServer.event;
        this.allMcpServers = [];
        this.workspaceMcpManagementServices = new ResourceMap();
        this.initialize();
    }
    async initialize() {
        try {
            await this.onDidChangeWorkbenchState();
            await this.onDidChangeWorkspaceFolders({ added: this.workspaceContextService.getWorkspace().folders, removed: [], changed: [] });
            this._register(this.workspaceContextService.onDidChangeWorkspaceFolders(e => this.onDidChangeWorkspaceFolders(e)));
            this._register(this.workspaceContextService.onDidChangeWorkbenchState(e => this.onDidChangeWorkbenchState()));
        }
        catch (error) {
            this.logService.error('Failed to initialize workspace folders', error);
        }
    }
    async onDidChangeWorkbenchState() {
        if (this.workspaceConfiguration) {
            await this.removeWorkspaceService(this.workspaceConfiguration);
        }
        this.workspaceConfiguration = this.workspaceContextService.getWorkspace().configuration;
        if (this.workspaceConfiguration) {
            await this.addWorkspaceService(this.workspaceConfiguration, 5 /* ConfigurationTarget.WORKSPACE */);
        }
    }
    async onDidChangeWorkspaceFolders(e) {
        try {
            await Promise.allSettled(e.removed.map(folder => this.removeWorkspaceService(folder.toResource(WORKSPACE_STANDALONE_CONFIGURATIONS[MCP_CONFIGURATION_KEY]))));
        }
        catch (error) {
            this.logService.error(error);
        }
        try {
            await Promise.allSettled(e.added.map(folder => this.addWorkspaceService(folder.toResource(WORKSPACE_STANDALONE_CONFIGURATIONS[MCP_CONFIGURATION_KEY]), 6 /* ConfigurationTarget.WORKSPACE_FOLDER */)));
        }
        catch (error) {
            this.logService.error(error);
        }
    }
    async addWorkspaceService(mcpResource, target) {
        if (this.workspaceMcpManagementServices.has(mcpResource)) {
            return;
        }
        const disposables = new DisposableStore();
        const service = disposables.add(this.instantiationService.createInstance(WorkspaceMcpResourceManagementService, mcpResource, target));
        try {
            const installedServers = await service.getInstalled();
            this.allMcpServers.push(...installedServers);
            if (installedServers.length > 0) {
                const installResults = installedServers.map(server => ({
                    name: server.name,
                    local: server,
                    mcpResource: server.mcpResource
                }));
                this._onDidInstallMcpServers.fire(installResults);
            }
        }
        catch (error) {
            this.logService.warn('Failed to get installed servers from', mcpResource.toString(), error);
        }
        disposables.add(service.onInstallMcpServer(e => this._onInstallMcpServer.fire(e)));
        disposables.add(service.onDidInstallMcpServers(e => {
            for (const { local } of e) {
                if (local) {
                    this.allMcpServers.push(local);
                }
            }
            this._onDidInstallMcpServers.fire(e);
        }));
        disposables.add(service.onDidUpdateMcpServers(e => {
            for (const { local, mcpResource } of e) {
                if (local) {
                    const index = this.allMcpServers.findIndex(server => this.uriIdentityService.extUri.isEqual(server.mcpResource, mcpResource) && server.name === local.name);
                    if (index !== -1) {
                        this.allMcpServers.splice(index, 1, local);
                    }
                }
            }
            this._onDidUpdateMcpServers.fire(e);
        }));
        disposables.add(service.onUninstallMcpServer(e => this._onUninstallMcpServer.fire(e)));
        disposables.add(service.onDidUninstallMcpServer(e => {
            const index = this.allMcpServers.findIndex(server => this.uriIdentityService.extUri.isEqual(server.mcpResource, e.mcpResource) && server.name === e.name);
            if (index !== -1) {
                this.allMcpServers.splice(index, 1);
                this._onDidUninstallMcpServer.fire(e);
            }
        }));
        this.workspaceMcpManagementServices.set(mcpResource, { service, dispose: () => disposables.dispose() });
    }
    async removeWorkspaceService(mcpResource) {
        const serviceItem = this.workspaceMcpManagementServices.get(mcpResource);
        if (serviceItem) {
            try {
                const installedServers = await serviceItem.service.getInstalled();
                this.allMcpServers = this.allMcpServers.filter(server => !installedServers.some(uninstalled => this.uriIdentityService.extUri.isEqual(uninstalled.mcpResource, server.mcpResource)));
                for (const server of installedServers) {
                    this._onDidUninstallMcpServer.fire({
                        name: server.name,
                        mcpResource: server.mcpResource
                    });
                }
            }
            catch (error) {
                this.logService.warn('Failed to get installed servers from', mcpResource.toString(), error);
            }
            this.workspaceMcpManagementServices.delete(mcpResource);
            serviceItem.dispose();
        }
    }
    async getInstalled() {
        return this.allMcpServers;
    }
    async install(server, options) {
        if (!options?.mcpResource) {
            throw new Error('MCP resource is required');
        }
        const mcpManagementServiceItem = this.workspaceMcpManagementServices.get(options?.mcpResource);
        if (!mcpManagementServiceItem) {
            throw new Error(`No MCP management service found for resource: ${options?.mcpResource.toString()}`);
        }
        return mcpManagementServiceItem.service.install(server, options);
    }
    async uninstall(server, options) {
        const mcpResource = server.mcpResource;
        const mcpManagementServiceItem = this.workspaceMcpManagementServices.get(mcpResource);
        if (!mcpManagementServiceItem) {
            throw new Error(`No MCP management service found for resource: ${mcpResource.toString()}`);
        }
        return mcpManagementServiceItem.service.uninstall(server, options);
    }
    installFromGallery() {
        throw new Error('Not supported');
    }
    updateMetadata() {
        throw new Error('Not supported');
    }
    dispose() {
        this.workspaceMcpManagementServices.forEach(service => service.dispose());
        this.workspaceMcpManagementServices.clear();
        super.dispose();
    }
};
WorkspaceMcpManagementService = __decorate([
    __param(0, IAllowedMcpServersService),
    __param(1, IUriIdentityService),
    __param(2, ILogService),
    __param(3, IWorkspaceContextService),
    __param(4, IInstantiationService)
], WorkspaceMcpManagementService);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWNwV29ya2JlbmNoTWFuYWdlbWVudFNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9hZHZpa2FyL0RvY3VtZW50cy9hcmNoaXRlY3QvYXJjaDIvQXJjaElERS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvbWNwL2NvbW1vbi9tY3BXb3JrYmVuY2hNYW5hZ2VtZW50U2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsZUFBZSxFQUFlLE1BQU0sc0NBQXNDLENBQUM7QUFDcEYsT0FBTyxFQUFtQixxQkFBcUIsRUFBZ0ssa0JBQWtCLEVBQW9CLHlCQUF5QixFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDelUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLHNCQUFzQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDM0gsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sNkRBQTZELENBQUM7QUFDdEcsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLGtDQUFrQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSwwQkFBMEIsRUFBcUIsTUFBTSw4REFBOEQsQ0FBQztBQUM3SCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsd0JBQXdCLEVBQWtELE1BQU0sb0RBQW9ELENBQUM7QUFDakssT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sd0RBQXdELENBQUM7QUFDN0YsT0FBTyxFQUFFLHFCQUFxQixFQUFFLG1DQUFtQyxFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFDekgsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ3JFLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBSWhGLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLHFEQUFxRCxDQUFDO0FBQ2pHLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLGdFQUFnRSxDQUFD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