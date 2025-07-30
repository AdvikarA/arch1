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
import { Emitter } from '../../../../base/common/event.js';
import { isMacintosh, isWindows } from '../../../../base/common/platform.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { ILocalPtyService, ITerminalLogService, TerminalExtensions, TerminalIpcChannels } from '../../../../platform/terminal/common/terminal.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { ITerminalInstanceService } from '../browser/terminal.js';
import { ITerminalProfileResolverService } from '../common/terminal.js';
import { LocalPty } from './localPty.js';
import { IConfigurationResolverService } from '../../../services/configurationResolver/common/configurationResolver.js';
import { IShellEnvironmentService } from '../../../services/environment/electron-browser/shellEnvironmentService.js';
import { IHistoryService } from '../../../services/history/common/history.js';
import * as terminalEnvironment from '../common/terminalEnvironment.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { IEnvironmentVariableService } from '../common/environmentVariable.js';
import { BaseTerminalBackend } from '../browser/baseTerminalBackend.js';
import { INativeHostService } from '../../../../platform/native/common/native.js';
import { Client as MessagePortClient } from '../../../../base/parts/ipc/common/ipc.mp.js';
import { acquirePort } from '../../../../base/parts/ipc/electron-browser/ipc.mp.js';
import { getDelayedChannel, ProxyChannel } from '../../../../base/parts/ipc/common/ipc.js';
import { mark } from '../../../../base/common/performance.js';
import { ILifecycleService } from '../../../services/lifecycle/common/lifecycle.js';
import { DeferredPromise } from '../../../../base/common/async.js';
import { IStatusbarService } from '../../../services/statusbar/browser/statusbar.js';
import { memoize } from '../../../../base/common/decorators.js';
import { StopWatch } from '../../../../base/common/stopwatch.js';
import { IRemoteAgentService } from '../../../services/remote/common/remoteAgentService.js';
import { shouldUseEnvironmentVariableCollection } from '../../../../platform/terminal/common/terminalEnvironment.js';
import { DisposableStore, MutableDisposable } from '../../../../base/common/lifecycle.js';
let LocalTerminalBackendContribution = class LocalTerminalBackendContribution {
    static { this.ID = 'workbench.contrib.localTerminalBackend'; }
    constructor(instantiationService, terminalInstanceService) {
        const backend = instantiationService.createInstance(LocalTerminalBackend);
        Registry.as(TerminalExtensions.Backend).registerTerminalBackend(backend);
        terminalInstanceService.didRegisterBackend(backend);
    }
};
LocalTerminalBackendContribution = __decorate([
    __param(0, IInstantiationService),
    __param(1, ITerminalInstanceService)
], LocalTerminalBackendContribution);
export { LocalTerminalBackendContribution };
let LocalTerminalBackend = class LocalTerminalBackend extends BaseTerminalBackend {
    /**
     * Communicate to the direct proxy (renderer<->ptyhost) if it's available, otherwise use the
     * indirect proxy (renderer<->main<->ptyhost). The latter may not need to actually launch the
     * pty host, for example when detecting profiles.
     */
    get _proxy() { return this._directProxy || this._localPtyService; }
    get whenReady() { return this._whenReady.p; }
    setReady() { this._whenReady.complete(); }
    constructor(workspaceContextService, _lifecycleService, logService, _localPtyService, _labelService, _shellEnvironmentService, _storageService, _configurationResolverService, _configurationService, _productService, _historyService, _terminalProfileResolverService, _environmentVariableService, historyService, _nativeHostService, statusBarService, _remoteAgentService) {
        super(_localPtyService, logService, historyService, _configurationResolverService, statusBarService, workspaceContextService);
        this._lifecycleService = _lifecycleService;
        this._localPtyService = _localPtyService;
        this._labelService = _labelService;
        this._shellEnvironmentService = _shellEnvironmentService;
        this._storageService = _storageService;
        this._configurationResolverService = _configurationResolverService;
        this._configurationService = _configurationService;
        this._productService = _productService;
        this._historyService = _historyService;
        this._terminalProfileResolverService = _terminalProfileResolverService;
        this._environmentVariableService = _environmentVariableService;
        this._nativeHostService = _nativeHostService;
        this._remoteAgentService = _remoteAgentService;
        this.remoteAuthority = undefined;
        this._ptys = new Map();
        this._directProxyDisposables = this._register(new MutableDisposable());
        this._whenReady = new DeferredPromise();
        this._onDidRequestDetach = this._register(new Emitter());
        this.onDidRequestDetach = this._onDidRequestDetach.event;
        this._register(this.onPtyHostRestart(() => {
            this._directProxy = undefined;
            this._directProxyClientEventually = undefined;
            this._connectToDirectProxy();
        }));
    }
    /**
     * Request a direct connection to the pty host, this will launch the pty host process if necessary.
     */
    async _connectToDirectProxy() {
        // Check if connecting is in progress
        if (this._directProxyClientEventually) {
            await this._directProxyClientEventually.p;
            return;
        }
        this._logService.debug('Starting pty host');
        const directProxyClientEventually = new DeferredPromise();
        this._directProxyClientEventually = directProxyClientEventually;
        const directProxy = ProxyChannel.toService(getDelayedChannel(this._directProxyClientEventually.p.then(client => client.getChannel(TerminalIpcChannels.PtyHostWindow))));
        this._directProxy = directProxy;
        this._directProxyDisposables.clear();
        // The pty host should not get launched until at least the window restored phase
        // if remote auth exists, don't await
        if (!this._remoteAgentService.getConnection()?.remoteAuthority) {
            await this._lifecycleService.when(3 /* LifecyclePhase.Restored */);
        }
        mark('code/terminal/willConnectPtyHost');
        this._logService.trace('Renderer->PtyHost#connect: before acquirePort');
        acquirePort('vscode:createPtyHostMessageChannel', 'vscode:createPtyHostMessageChannelResult').then(port => {
            mark('code/terminal/didConnectPtyHost');
            this._logService.trace('Renderer->PtyHost#connect: connection established');
            const store = new DisposableStore();
            this._directProxyDisposables.value = store;
            // There are two connections to the pty host; one to the regular shared process
            // _localPtyService, and one directly via message port _ptyHostDirectProxy. The former is
            // used for pty host management messages, it would make sense in the future to use a
            // separate interface/service for this one.
            const client = store.add(new MessagePortClient(port, `window:${this._nativeHostService.windowId}`));
            directProxyClientEventually.complete(client);
            this._onPtyHostConnected.fire();
            // Attach process listeners
            store.add(directProxy.onProcessData(e => this._ptys.get(e.id)?.handleData(e.event)));
            store.add(directProxy.onDidChangeProperty(e => this._ptys.get(e.id)?.handleDidChangeProperty(e.property)));
            store.add(directProxy.onProcessExit(e => {
                const pty = this._ptys.get(e.id);
                if (pty) {
                    pty.handleExit(e.event);
                    this._ptys.delete(e.id);
                }
            }));
            store.add(directProxy.onProcessReady(e => this._ptys.get(e.id)?.handleReady(e.event)));
            store.add(directProxy.onProcessReplay(e => this._ptys.get(e.id)?.handleReplay(e.event)));
            store.add(directProxy.onProcessOrphanQuestion(e => this._ptys.get(e.id)?.handleOrphanQuestion()));
            store.add(directProxy.onDidRequestDetach(e => this._onDidRequestDetach.fire(e)));
            // Eagerly fetch the backend's environment for memoization
            this.getEnvironment();
        });
    }
    async requestDetachInstance(workspaceId, instanceId) {
        return this._proxy.requestDetachInstance(workspaceId, instanceId);
    }
    async acceptDetachInstanceReply(requestId, persistentProcessId) {
        if (!persistentProcessId) {
            this._logService.warn('Cannot attach to feature terminals, custom pty terminals, or those without a persistentProcessId');
            return;
        }
        return this._proxy.acceptDetachInstanceReply(requestId, persistentProcessId);
    }
    async persistTerminalState() {
        const ids = Array.from(this._ptys.keys());
        const serialized = await this._proxy.serializeTerminalState(ids);
        this._storageService.store("terminal.integrated.bufferState" /* TerminalStorageKeys.TerminalBufferState */, serialized, 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
    }
    async updateTitle(id, title, titleSource) {
        await this._proxy.updateTitle(id, title, titleSource);
    }
    async updateIcon(id, userInitiated, icon, color) {
        await this._proxy.updateIcon(id, userInitiated, icon, color);
    }
    async updateProperty(id, property, value) {
        return this._proxy.updateProperty(id, property, value);
    }
    async createProcess(shellLaunchConfig, cwd, cols, rows, unicodeVersion, env, options, shouldPersist) {
        await this._connectToDirectProxy();
        const executableEnv = await this._shellEnvironmentService.getShellEnv();
        const id = await this._proxy.createProcess(shellLaunchConfig, cwd, cols, rows, unicodeVersion, env, executableEnv, options, shouldPersist, this._getWorkspaceId(), this._getWorkspaceName());
        const pty = new LocalPty(id, shouldPersist, this._proxy);
        this._ptys.set(id, pty);
        return pty;
    }
    async attachToProcess(id) {
        await this._connectToDirectProxy();
        try {
            await this._proxy.attachToProcess(id);
            const pty = new LocalPty(id, true, this._proxy);
            this._ptys.set(id, pty);
            return pty;
        }
        catch (e) {
            this._logService.warn(`Couldn't attach to process ${e.message}`);
        }
        return undefined;
    }
    async attachToRevivedProcess(id) {
        await this._connectToDirectProxy();
        try {
            const newId = await this._proxy.getRevivedPtyNewId(this._getWorkspaceId(), id) ?? id;
            return await this.attachToProcess(newId);
        }
        catch (e) {
            this._logService.warn(`Couldn't attach to process ${e.message}`);
        }
        return undefined;
    }
    async listProcesses() {
        await this._connectToDirectProxy();
        return this._proxy.listProcesses();
    }
    async getLatency() {
        const measurements = [];
        const sw = new StopWatch();
        if (this._directProxy) {
            await this._directProxy.getLatency();
            sw.stop();
            measurements.push({
                label: 'window<->ptyhost (message port)',
                latency: sw.elapsed()
            });
            sw.reset();
        }
        const results = await this._localPtyService.getLatency();
        sw.stop();
        measurements.push({
            label: 'window<->ptyhostservice<->ptyhost',
            latency: sw.elapsed()
        });
        return [
            ...measurements,
            ...results
        ];
    }
    async getPerformanceMarks() {
        return this._proxy.getPerformanceMarks();
    }
    async reduceConnectionGraceTime() {
        this._proxy.reduceConnectionGraceTime();
    }
    async getDefaultSystemShell(osOverride) {
        return this._proxy.getDefaultSystemShell(osOverride);
    }
    async getProfiles(profiles, defaultProfile, includeDetectedProfiles) {
        return this._localPtyService.getProfiles(this._workspaceContextService.getWorkspace().id, profiles, defaultProfile, includeDetectedProfiles) || [];
    }
    async getEnvironment() {
        return this._proxy.getEnvironment();
    }
    async getShellEnvironment() {
        return this._shellEnvironmentService.getShellEnv();
    }
    async getWslPath(original, direction) {
        return this._proxy.getWslPath(original, direction);
    }
    async setTerminalLayoutInfo(layoutInfo) {
        const args = {
            workspaceId: this._getWorkspaceId(),
            tabs: layoutInfo ? layoutInfo.tabs : []
        };
        await this._proxy.setTerminalLayoutInfo(args);
        // Store in the storage service as well to be used when reviving processes as normally this
        // is stored in memory on the pty host
        this._storageService.store("terminal.integrated.layoutInfo" /* TerminalStorageKeys.TerminalLayoutInfo */, JSON.stringify(args), 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
    }
    async getTerminalLayoutInfo() {
        const workspaceId = this._getWorkspaceId();
        const layoutArgs = { workspaceId };
        // Revive processes if needed
        const serializedState = this._storageService.get("terminal.integrated.bufferState" /* TerminalStorageKeys.TerminalBufferState */, 1 /* StorageScope.WORKSPACE */);
        const reviveBufferState = this._deserializeTerminalState(serializedState);
        if (reviveBufferState && reviveBufferState.length > 0) {
            try {
                // Create variable resolver
                const activeWorkspaceRootUri = this._historyService.getLastActiveWorkspaceRoot();
                const lastActiveWorkspace = activeWorkspaceRootUri ? this._workspaceContextService.getWorkspaceFolder(activeWorkspaceRootUri) ?? undefined : undefined;
                const variableResolver = terminalEnvironment.createVariableResolver(lastActiveWorkspace, await this._terminalProfileResolverService.getEnvironment(this.remoteAuthority), this._configurationResolverService);
                // Re-resolve the environments and replace it on the state so local terminals use a fresh
                // environment
                mark('code/terminal/willGetReviveEnvironments');
                await Promise.all(reviveBufferState.map(state => new Promise(r => {
                    this._resolveEnvironmentForRevive(variableResolver, state.shellLaunchConfig).then(freshEnv => {
                        state.processLaunchConfig.env = freshEnv;
                        r();
                    });
                })));
                mark('code/terminal/didGetReviveEnvironments');
                mark('code/terminal/willReviveTerminalProcesses');
                await this._proxy.reviveTerminalProcesses(workspaceId, reviveBufferState, Intl.DateTimeFormat().resolvedOptions().locale);
                mark('code/terminal/didReviveTerminalProcesses');
                this._storageService.remove("terminal.integrated.bufferState" /* TerminalStorageKeys.TerminalBufferState */, 1 /* StorageScope.WORKSPACE */);
                // If reviving processes, send the terminal layout info back to the pty host as it
                // will not have been persisted on application exit
                const layoutInfo = this._storageService.get("terminal.integrated.layoutInfo" /* TerminalStorageKeys.TerminalLayoutInfo */, 1 /* StorageScope.WORKSPACE */);
                if (layoutInfo) {
                    mark('code/terminal/willSetTerminalLayoutInfo');
                    await this._proxy.setTerminalLayoutInfo(JSON.parse(layoutInfo));
                    mark('code/terminal/didSetTerminalLayoutInfo');
                    this._storageService.remove("terminal.integrated.layoutInfo" /* TerminalStorageKeys.TerminalLayoutInfo */, 1 /* StorageScope.WORKSPACE */);
                }
            }
            catch (e) {
                this._logService.warn('LocalTerminalBackend#getTerminalLayoutInfo Error', e && typeof e === 'object' && 'message' in e ? e.message : e);
            }
        }
        return this._proxy.getTerminalLayoutInfo(layoutArgs);
    }
    async _resolveEnvironmentForRevive(variableResolver, shellLaunchConfig) {
        const platformKey = isWindows ? 'windows' : (isMacintosh ? 'osx' : 'linux');
        const envFromConfigValue = this._configurationService.getValue(`terminal.integrated.env.${platformKey}`);
        const baseEnv = await (shellLaunchConfig.useShellEnvironment ? this.getShellEnvironment() : this.getEnvironment());
        const env = await terminalEnvironment.createTerminalEnvironment(shellLaunchConfig, envFromConfigValue, variableResolver, this._productService.version, this._configurationService.getValue("terminal.integrated.detectLocale" /* TerminalSettingId.DetectLocale */), baseEnv);
        if (shouldUseEnvironmentVariableCollection(shellLaunchConfig)) {
            const workspaceFolder = terminalEnvironment.getWorkspaceForTerminal(shellLaunchConfig.cwd, this._workspaceContextService, this._historyService);
            await this._environmentVariableService.mergedCollection.applyToProcessEnvironment(env, { workspaceFolder }, variableResolver);
        }
        return env;
    }
    _getWorkspaceName() {
        return this._labelService.getWorkspaceLabel(this._workspaceContextService.getWorkspace());
    }
    // #region Pty service contribution RPC calls
    installAutoReply(match, reply) {
        return this._proxy.installAutoReply(match, reply);
    }
    uninstallAllAutoReplies() {
        return this._proxy.uninstallAllAutoReplies();
    }
};
__decorate([
    memoize
], LocalTerminalBackend.prototype, "getEnvironment", null);
__decorate([
    memoize
], LocalTerminalBackend.prototype, "getShellEnvironment", null);
LocalTerminalBackend = __decorate([
    __param(0, IWorkspaceContextService),
    __param(1, ILifecycleService),
    __param(2, ITerminalLogService),
    __param(3, ILocalPtyService),
    __param(4, ILabelService),
    __param(5, IShellEnvironmentService),
    __param(6, IStorageService),
    __param(7, IConfigurationResolverService),
    __param(8, IConfigurationService),
    __param(9, IProductService),
    __param(10, IHistoryService),
    __param(11, ITerminalProfileResolverService),
    __param(12, IEnvironmentVariableService),
    __param(13, IHistoryService),
    __param(14, INativeHostService),
    __param(15, IStatusbarService),
    __param(16, IRemoteAgentService)
], LocalTerminalBackend);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9jYWxUZXJtaW5hbEJhY2tlbmQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9hZHZpa2FyL0RvY3VtZW50cy9hcmNoaXRlY3QvYXJjaDIvQXJjaElERS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXJtaW5hbC9lbGVjdHJvbi1icm93c2VyL2xvY2FsVGVybWluYWxCYWNrZW5kLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUMzRCxPQUFPLEVBQXVCLFdBQVcsRUFBRSxTQUFTLEVBQW1CLE1BQU0scUNBQXFDLENBQUM7QUFFbkgsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDbkcsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDbkcsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQzNFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUM1RSxPQUFPLEVBQUUsZUFBZSxFQUErQixNQUFNLGdEQUFnRCxDQUFDO0FBQzlHLE9BQU8sRUFBRSxnQkFBZ0IsRUFBNkssbUJBQW1CLEVBQWdHLGtCQUFrQixFQUFFLG1CQUFtQixFQUF1QyxNQUFNLGtEQUFrRCxDQUFDO0FBRWhjLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLG9EQUFvRCxDQUFDO0FBRTlGLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLHdCQUF3QixDQUFDO0FBQ2xFLE9BQU8sRUFBRSwrQkFBK0IsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBRXhFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxlQUFlLENBQUM7QUFDekMsT0FBTyxFQUFFLDZCQUE2QixFQUFFLE1BQU0seUVBQXlFLENBQUM7QUFDeEgsT0FBTyxFQUFFLHdCQUF3QixF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