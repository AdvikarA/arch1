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
var NativeExtensionHostKindPicker_1;
import { runWhenWindowIdle } from '../../../../base/browser/dom.js';
import { mainWindow } from '../../../../base/browser/window.js';
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { Schemas } from '../../../../base/common/network.js';
import * as performance from '../../../../base/common/performance.js';
import { isCI } from '../../../../base/common/platform.js';
import * as nls from '../../../../nls.js';
import { Categories } from '../../../../platform/action/common/actionCommonCategories.js';
import { Action2, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { IExtensionGalleryService } from '../../../../platform/extensionManagement/common/extensionManagement.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { INativeHostService } from '../../../../platform/native/common/native.js';
import { INotificationService, NotificationPriority, Severity } from '../../../../platform/notification/common/notification.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { IRemoteAuthorityResolverService, RemoteAuthorityResolverError, getRemoteAuthorityPrefix } from '../../../../platform/remote/common/remoteAuthorityResolver.js';
import { IRemoteExtensionsScannerService } from '../../../../platform/remote/common/remoteExtensionsScanner.js';
import { getRemoteName, parseAuthorityWithPort } from '../../../../platform/remote/common/remoteHosts.js';
import { updateProxyConfigurationsScope } from '../../../../platform/request/common/request.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { IWorkspaceTrustManagementService } from '../../../../platform/workspace/common/workspaceTrust.js';
import { IWorkbenchEnvironmentService } from '../../environment/common/environmentService.js';
import { IWorkbenchExtensionEnablementService, IWorkbenchExtensionManagementService } from '../../extensionManagement/common/extensionManagement.js';
import { WebWorkerExtensionHost } from '../browser/webWorkerExtensionHost.js';
import { AbstractExtensionService, ExtensionHostCrashTracker, LocalExtensions, RemoteExtensions, ResolverExtensions, checkEnabledAndProposedAPI, extensionIsEnabled, isResolverExtension } from '../common/abstractExtensionService.js';
import { parseExtensionDevOptions } from '../common/extensionDevOptions.js';
import { extensionHostKindToString, extensionRunningPreferenceToString } from '../common/extensionHostKind.js';
import { IExtensionManifestPropertiesService } from '../common/extensionManifestPropertiesService.js';
import { filterExtensionDescriptions } from '../common/extensionRunningLocationTracker.js';
import { ExtensionHostExtensions, IExtensionService, toExtension, webWorkerExtHostConfig } from '../common/extensions.js';
import { ExtensionsProposedApi } from '../common/extensionsProposedApi.js';
import { RemoteExtensionHost } from '../common/remoteExtensionHost.js';
import { CachedExtensionScanner } from './cachedExtensionScanner.js';
import { NativeLocalProcessExtensionHost } from './localProcessExtensionHost.js';
import { IHostService } from '../../host/browser/host.js';
import { ILifecycleService } from '../../lifecycle/common/lifecycle.js';
import { IRemoteAgentService } from '../../remote/common/remoteAgentService.js';
import { IRemoteExplorerService } from '../../remote/common/remoteExplorerService.js';
import { AsyncIterableObject } from '../../../../base/common/async.js';
let NativeExtensionService = class NativeExtensionService extends AbstractExtensionService {
    constructor(instantiationService, notificationService, environmentService, telemetryService, extensionEnablementService, fileService, productService, extensionManagementService, contextService, configurationService, extensionManifestPropertiesService, logService, remoteAgentService, remoteExtensionsScannerService, lifecycleService, remoteAuthorityResolverService, _nativeHostService, _hostService, _remoteExplorerService, _extensionGalleryService, _workspaceTrustManagementService, dialogService) {
        const extensionsProposedApi = instantiationService.createInstance(ExtensionsProposedApi);
        const extensionScanner = instantiationService.createInstance(CachedExtensionScanner);
        const extensionHostFactory = new NativeExtensionHostFactory(extensionsProposedApi, extensionScanner, () => this._getExtensionRegistrySnapshotWhenReady(), instantiationService, environmentService, extensionEnablementService, configurationService, remoteAgentService, remoteAuthorityResolverService, logService);
        super({ hasLocalProcess: true, allowRemoteExtensionsInLocalWebWorker: false }, extensionsProposedApi, extensionHostFactory, new NativeExtensionHostKindPicker(environmentService, configurationService, logService), instantiationService, notificationService, environmentService, telemetryService, extensionEnablementService, fileService, productService, extensionManagementService, contextService, configurationService, extensionManifestPropertiesService, logService, remoteAgentService, remoteExtensionsScannerService, lifecycleService, remoteAuthorityResolverService, dialogService);
        this._nativeHostService = _nativeHostService;
        this._hostService = _hostService;
        this._remoteExplorerService = _remoteExplorerService;
        this._extensionGalleryService = _extensionGalleryService;
        this._workspaceTrustManagementService = _workspaceTrustManagementService;
        this._localCrashTracker = new ExtensionHostCrashTracker();
        this._extensionScanner = extensionScanner;
        // delay extension host creation and extension scanning
        // until the workbench is running. we cannot defer the
        // extension host more (LifecyclePhase.Restored) because
        // some editors require the extension host to restore
        // and this would result in a deadlock
        // see https://github.com/microsoft/vscode/issues/41322
        lifecycleService.when(2 /* LifecyclePhase.Ready */).then(() => {
            // reschedule to ensure this runs after restoring viewlets, panels, and editors
            runWhenWindowIdle(mainWindow, () => {
                this._initialize();
            }, 50 /*max delay*/);
        });
    }
    async _scanAllLocalExtensions() {
        return this._extensionScanner.scannedExtensions;
    }
    _onExtensionHostCrashed(extensionHost, code, signal) {
        const activatedExtensions = [];
        const extensionsStatus = this.getExtensionsStatus();
        for (const key of Object.keys(extensionsStatus)) {
            const extensionStatus = extensionsStatus[key];
            if (extensionStatus.activationStarted && extensionHost.containsExtension(extensionStatus.id)) {
                activatedExtensions.push(extensionStatus.id);
            }
        }
        super._onExtensionHostCrashed(extensionHost, code, signal);
        if (extensionHost.kind === 1 /* ExtensionHostKind.LocalProcess */) {
            if (code === 55 /* ExtensionHostExitCode.VersionMismatch */) {
                this._notificationService.prompt(Severity.Error, nls.localize('extensionService.versionMismatchCrash', "Extension host cannot start: version mismatch."), [{
                        label: nls.localize('relaunch', "Relaunch VS Code"),
                        run: () => {
                            this._instantiationService.invokeFunction((accessor) => {
                                const hostService = accessor.get(IHostService);
                                hostService.restart();
                            });
                        }
                    }]);
                return;
            }
            this._logExtensionHostCrash(extensionHost);
            this._sendExtensionHostCrashTelemetry(code, signal, activatedExtensions);
            this._localCrashTracker.registerCrash();
            if (this._localCrashTracker.shouldAutomaticallyRestart()) {
                this._logService.info(`Automatically restarting the extension host.`);
                this._notificationService.status(nls.localize('extensionService.autoRestart', "The extension host terminated unexpectedly. Restarting..."), { hideAfter: 5000 });
                this.startExtensionHosts();
            }
            else {
                const choices = [];
                if (this._environmentService.isBuilt) {
                    choices.push({
                        label: nls.localize('startBisect', "Start Extension Bisect"),
                        run: () => {
                            this._instantiationService.invokeFunction(accessor => {
                                const commandService = accessor.get(ICommandService);
                                commandService.executeCommand('extension.bisect.start');
                            });
                        }
                    });
                }
                else {
                    choices.push({
                        label: nls.localize('devTools', "Open Developer Tools"),
                        run: () => this._nativeHostService.openDevTools()
                    });
                }
                choices.push({
                    label: nls.localize('restart', "Restart Extension Host"),
                    run: () => this.startExtensionHosts()
                });
                if (this._environmentService.isBuilt) {
                    choices.push({
                        label: nls.localize('learnMore', "Learn More"),
                        run: () => {
                            this._instantiationService.invokeFunction(accessor => {
                                const openerService = accessor.get(IOpenerService);
                                openerService.open('https://aka.ms/vscode-extension-bisect');
                            });
                        }
                    });
                }
                this._notificationService.prompt(Severity.Error, nls.localize('extensionService.crash', "Extension host terminated unexpectedly 3 times within the last 5 minutes."), choices);
            }
        }
    }
    _sendExtensionHostCrashTelemetry(code, signal, activatedExtensions) {
        this._telemetryService.publicLog2('extensionHostCrash', {
            code,
            signal,
            extensionIds: activatedExtensions.map(e => e.value)
        });
        for (const extensionId of activatedExtensions) {
            this._telemetryService.publicLog2('extensionHostCrashExtension', {
                code,
                signal,
                extensionId: extensionId.value
            });
        }
    }
    // --- impl
    async _resolveAuthority(remoteAuthority) {
        const authorityPlusIndex = remoteAuthority.indexOf('+');
        if (authorityPlusIndex === -1) {
            // This authority does not need to be resolved, simply parse the port number
            const { host, port } = parseAuthorityWithPort(remoteAuthority);
            return {
                authority: {
                    authority: remoteAuthority,
                    connectTo: {
                        type: 0 /* RemoteConnectionType.WebSocket */,
                        host,
                        port
                    },
                    connectionToken: undefined
                }
            };
        }
        return this._resolveAuthorityOnExtensionHosts(1 /* ExtensionHostKind.LocalProcess */, remoteAuthority);
    }
    async _getCanonicalURI(remoteAuthority, uri) {
        const authorityPlusIndex = remoteAuthority.indexOf('+');
        if (authorityPlusIndex === -1) {
            // This authority does not use a resolver
            return uri;
        }
        const localProcessExtensionHosts = this._getExtensionHostManagers(1 /* ExtensionHostKind.LocalProcess */);
        if (localProcessExtensionHosts.length === 0) {
            // no local process extension hosts
            throw new Error(`Cannot resolve canonical URI`);
        }
        const results = await Promise.all(localProcessExtensionHosts.map(extHost => extHost.getCanonicalURI(remoteAuthority, uri)));
        for (const result of results) {
            if (result) {
                return result;
            }
        }
        // we can only reach this if there was no resolver extension that can return the cannonical uri
        throw new Error(`Cannot get canonical URI because no extension is installed to resolve ${getRemoteAuthorityPrefix(remoteAuthority)}`);
    }
    _resolveExtensions() {
        return new AsyncIterableObject(emitter => this._doResolveExtensions(emitter));
    }
    async _doResolveExtensions(emitter) {
        this._extensionScanner.startScanningExtensions();
        const remoteAuthority = this._environmentService.remoteAuthority;
        let remoteEnv = null;
        let remoteExtensions = [];
        if (remoteAuthority) {
            this._remoteAuthorityResolverService._setCanonicalURIProvider(async (uri) => {
                if (uri.scheme !== Schemas.vscodeRemote || uri.authority !== remoteAuthority) {
                    // The current remote authority resolver cannot give the canonical URI for this URI
                    return uri;
                }
                performance.mark(`code/willGetCanonicalURI/${getRemoteAuthorityPrefix(remoteAuthority)}`);
                if (isCI) {
                    this._logService.info(`Invoking getCanonicalURI for authority ${getRemoteAuthorityPrefix(remoteAuthority)}...`);
                }
                try {
                    return this._getCanonicalURI(remoteAuthority, uri);
                }
                finally {
                    performance.mark(`code/didGetCanonicalURI/${getRemoteAuthorityPrefix(remoteAuthority)}`);
                    if (isCI) {
                        this._logService.info(`getCanonicalURI returned for authority ${getRemoteAuthorityPrefix(remoteAuthority)}.`);
                    }
                }
            });
            if (isCI) {
                this._logService.info(`Starting to wait on IWorkspaceTrustManagementService.workspaceResolved...`);
            }
            // Now that the canonical URI provider has been registered, we need to wait for the trust state to be
            // calculated. The trust state will be used while resolving the authority, however the resolver can
            // override the trust state through the resolver result.
            await this._workspaceTrustManagementService.workspaceResolved;
            if (isCI) {
                this._logService.info(`Finished waiting on IWorkspaceTrustManagementService.workspaceResolved.`);
            }
            const localExtensions = await this._scanAllLocalExtensions();
            const resolverExtensions = localExtensions.filter(extension => isResolverExtension(extension));
            if (resolverExtensions.length) {
                emitter.emitOne(new ResolverExtensions(resolverExtensions));
            }
            let resolverResult;
            try {
                resolverResult = await this._resolveAuthorityInitial(remoteAuthority);
            }
            catch (err) {
                if (RemoteAuthorityResolverError.isNoResolverFound(err)) {
                    err.isHandled = await this._handleNoResolverFound(remoteAuthority);
                }
                else {
                    if (RemoteAuthorityResolverError.isHandled(err)) {
                        console.log(`Error handled: Not showing a notification for the error`);
                    }
                }
                this._remoteAuthorityResolverService._setResolvedAuthorityError(remoteAuthority, err);
                // Proceed with the local extension host
                return this._startLocalExtensionHost(emitter);
            }
            // set the resolved authority
            this._remoteAuthorityResolverService._setResolvedAuthority(resolverResult.authority, resolverResult.options);
            this._remoteExplorerService.setTunnelInformation(resolverResult.tunnelInformation);
            // monitor for breakage
            const connection = this._remoteAgentService.getConnection();
            if (connection) {
                this._register(connection.onDidStateChange(async (e) => {
                    if (e.type === 0 /* PersistentConnectionEventType.ConnectionLost */) {
                        this._remoteAuthorityResolverService._clearResolvedAuthority(remoteAuthority);
                    }
                }));
                this._register(connection.onReconnecting(() => this._resolveAuthorityAgain()));
            }
            // fetch the remote environment
            [remoteEnv, remoteExtensions] = await Promise.all([
                this._remoteAgentService.getEnvironment(),
                this._remoteExtensionsScannerService.scanExtensions()
            ]);
            if (!remoteEnv) {
                this._notificationService.notify({ severity: Severity.Error, message: nls.localize('getEnvironmentFailure', "Could not fetch remote environment") });
                // Proceed with the local extension host
                return this._startLocalExtensionHost(emitter);
            }
            const useHostProxyDefault = remoteEnv.useHostProxy;
            this._register(this._configurationService.onDidChangeConfiguration(e => {
                if (e.affectsConfiguration('http.useLocalProxyConfiguration')) {
                    updateProxyConfigurationsScope(this._configurationService.getValue('http.useLocalProxyConfiguration'), useHostProxyDefault);
                }
            }));
            updateProxyConfigurationsScope(this._configurationService.getValue('http.useLocalProxyConfiguration'), useHostProxyDefault);
        }
        else {
            this._remoteAuthorityResolverService._setCanonicalURIProvider(async (uri) => uri);
        }
        return this._startLocalExtensionHost(emitter, remoteExtensions);
    }
    async _startLocalExtensionHost(emitter, remoteExtensions = []) {
        // Ensure that the workspace trust state has been fully initialized so
        // that the extension host can start with the correct set of extensions.
        await this._workspaceTrustManagementService.workspaceTrustInitialized;
        if (remoteExtensions.length) {
            emitter.emitOne(new RemoteExtensions(remoteExtensions));
        }
        emitter.emitOne(new LocalExtensions(await this._scanAllLocalExtensions()));
    }
    async _onExtensionHostExit(code) {
        // Dispose everything associated with the extension host
        await this._doStopExtensionHosts();
        // Dispose the management connection to avoid reconnecting after the extension host exits
        const connection = this._remoteAgentService.getConnection();
        connection?.dispose();
        if (parseExtensionDevOptions(this._environmentService).isExtensionDevTestFromCli) {
            // When CLI testing make sure to exit with proper exit code
            if (isCI) {
                this._logService.info(`Asking native host service to exit with code ${code}.`);
            }
            this._nativeHostService.exit(code);
        }
        else {
            // Expected development extension termination: When the extension host goes down we also shutdown the window
            this._nativeHostService.closeWindow();
        }
    }
    async _handleNoResolverFound(remoteAuthority) {
        const remoteName = getRemoteName(remoteAuthority);
        const recommendation = this._productService.remoteExtensionTips?.[remoteName];
        if (!recommendation) {
            return false;
        }
        const resolverExtensionId = recommendation.extensionId;
        const allExtensions = await this._scanAllLocalExtensions();
        const extension = allExtensions.filter(e => e.identifier.value === resolverExtensionId)[0];
        if (extension) {
            if (!extensionIsEnabled(this._logService, this._extensionEnablementService, extension, false)) {
                const message = nls.localize('enableResolver', "Extension '{0}' is required to open the remote window.\nOK to enable?", recommendation.friendlyName);
                this._notificationService.prompt(Severity.Info, message, [{
                        label: nls.localize('enable', 'Enable and Reload'),
                        run: async () => {
                            await this._extensionEnablementService.setEnablement([toExtension(extension)], 11 /* EnablementState.EnabledGlobally */);
                            await this._hostService.reload();
                        }
                    }], {
                    sticky: true,
                    priority: NotificationPriority.URGENT
                });
            }
        }
        else {
            // Install the Extension and reload the window to handle.
            const message = nls.localize('installResolver', "Extension '{0}' is required to open the remote window.\nDo you want to install the extension?", recommendation.friendlyName);
            this._notificationService.prompt(Severity.Info, message, [{
                    label: nls.localize('install', 'Install and Reload'),
                    run: async () => {
                        const [galleryExtension] = await this._extensionGalleryService.getExtensions([{ id: resolverExtensionId }], CancellationToken.None);
                        if (galleryExtension) {
                            await this._extensionManagementService.installFromGallery(galleryExtension);
                            await this._hostService.reload();
                        }
                        else {
                            this._notificationService.error(nls.localize('resolverExtensionNotFound', "`{0}` not found on marketplace"));
                        }
                    }
                }], {
                sticky: true,
                priority: NotificationPriority.URGENT,
            });
        }
        return true;
    }
};
NativeExtensionService = __decorate([
    __param(0, IInstantiationService),
    __param(1, INotificationService),
    __param(2, IWorkbenchEnvironmentService),
    __param(3, ITelemetryService),
    __param(4, IWorkbenchExtensionEnablementService),
    __param(5, IFileService),
    __param(6, IProductService),
    __param(7, IWorkbenchExtensionManagementService),
    __param(8, IWorkspaceContextService),
    __param(9, IConfigurationService),
    __param(10, IExtensionManifestPropertiesService),
    __param(11, ILogService),
    __param(12, IRemoteAgentService),
    __param(13, IRemoteExtensionsScannerService),
    __param(14, ILifecycleService),
    __param(15, IRemoteAuthorityResolverService),
    __param(16, INativeHostService),
    __param(17, IHostService),
    __param(18, IRemoteExplorerService),
    __param(19, IExtensionGalleryService),
    __param(20, IWorkspaceTrustManagementService),
    __param(21, IDialogService)
], NativeExtensionService);
export { NativeExtensionService };
let NativeExtensionHostFactory = class NativeExtensionHostFactory {
    constructor(_extensionsProposedApi, _extensionScanner, _getExtensionRegistrySnapshotWhenReady, _instantiationService, environmentService, _extensionEnablementService, configurationService, _remoteAgentService, _remoteAuthorityResolverService, _logService) {
        this._extensionsProposedApi = _extensionsProposedApi;
        this._extensionScanner = _extensionScanner;
        this._getExtensionRegistrySnapshotWhenReady = _getExtensionRegistrySnapshotWhenReady;
        this._instantiationService = _instantiationService;
        this._extensionEnablementService = _extensionEnablementService;
        this._remoteAgentService = _remoteAgentService;
        this._remoteAuthorityResolverService = _remoteAuthorityResolverService;
        this._logService = _logService;
        this._webWorkerExtHostEnablement = determineLocalWebWorkerExtHostEnablement(environmentService, configurationService);
    }
    createExtensionHost(runningLocations, runningLocation, isInitialStart) {
        switch (runningLocation.kind) {
            case 1 /* ExtensionHostKind.LocalProcess */: {
                const startup = (isInitialStart
                    ? 2 /* ExtensionHostStartup.EagerManualStart */
                    : 1 /* ExtensionHostStartup.EagerAutoStart */);
                return this._instantiationService.createInstance(NativeLocalProcessExtensionHost, runningLocation, startup, this._createLocalProcessExtensionHostDataProvider(runningLocations, isInitialStart, runningLocation));
            }
            case 2 /* ExtensionHostKind.LocalWebWorker */: {
                if (this._webWorkerExtHostEnablement !== 0 /* LocalWebWorkerExtHostEnablement.Disabled */) {
                    const startup = this._webWorkerExtHostEnablement === 2 /* LocalWebWorkerExtHostEnablement.Lazy */ ? 3 /* ExtensionHostStartup.LazyAutoStart */ : 2 /* ExtensionHostStartup.EagerManualStart */;
                    return this._instantiationService.createInstance(WebWorkerExtensionHost, runningLocation, startup, this._createWebWorkerExtensionHostDataProvider(runningLocations, runningLocation));
                }
                return null;
            }
            case 3 /* ExtensionHostKind.Remote */: {
                const remoteAgentConnection = this._remoteAgentService.getConnection();
                if (remoteAgentConnection) {
                    return this._instantiationService.createInstance(RemoteExtensionHost, runningLocation, this._createRemoteExtensionHostDataProvider(runningLocations, remoteAgentConnection.remoteAuthority));
                }
                return null;
            }
        }
    }
    _createLocalProcessExtensionHostDataProvider(runningLocations, isInitialStart, desiredRunningLocation) {
        return {
            getInitData: async () => {
                if (isInitialStart) {
                    // Here we load even extensions that would be disabled by workspace trust
                    const scannedExtensions = await this._extensionScanner.scannedExtensions;
                    if (isCI) {
                        this._logService.info(`NativeExtensionHostFactory._createLocalProcessExtensionHostDataProvider.scannedExtensions: ${scannedExtensions.map(ext => ext.identifier.value).join(',')}`);
                    }
                    const localExtensions = checkEnabledAndProposedAPI(this._logService, this._extensionEnablementService, this._extensionsProposedApi, scannedExtensions, /* ignore workspace trust */ true);
                    if (isCI) {
                        this._logService.info(`NativeExtensionHostFactory._createLocalProcessExtensionHostDataProvider.localExtensions: ${localExtensions.map(ext => ext.identifier.value).join(',')}`);
                    }
                    const runningLocation = runningLocations.computeRunningLocation(localExtensions, [], false);
                    const myExtensions = filterExtensionDescriptions(localExtensions, runningLocation, extRunningLocation => desiredRunningLocation.equals(extRunningLocation));
                    const extensions = new ExtensionHostExtensions(0, localExtensions, myExtensions.map(extension => extension.identifier));
                    if (isCI) {
                        this._logService.info(`NativeExtensionHostFactory._createLocalProcessExtensionHostDataProvider.myExtensions: ${myExtensions.map(ext => ext.identifier.value).join(',')}`);
                    }
                    return { extensions };
                }
                else {
                    // restart case
                    const snapshot = await this._getExtensionRegistrySnapshotWhenReady();
                    const myExtensions = runningLocations.filterByRunningLocation(snapshot.extensions, desiredRunningLocation);
                    const extensions = new ExtensionHostExtensions(snapshot.versionId, snapshot.extensions, myExtensions.map(extension => extension.identifier));
                    return { extensions };
                }
            }
        };
    }
    _createWebWorkerExtensionHostDataProvider(runningLocations, desiredRunningLocation) {
        return {
            getInitData: async () => {
                const snapshot = await this._getExtensionRegistrySnapshotWhenReady();
                const myExtensions = runningLocations.filterByRunningLocation(snapshot.extensions, desiredRunningLocation);
                const extensions = new ExtensionHostExtensions(snapshot.versionId, snapshot.extensions, myExtensions.map(extension => extension.identifier));
                return { extensions };
            }
        };
    }
    _createRemoteExtensionHostDataProvider(runningLocations, remoteAuthority) {
        return {
            remoteAuthority: remoteAuthority,
            getInitData: async () => {
                const snapshot = await this._getExtensionRegistrySnapshotWhenReady();
                const remoteEnv = await this._remoteAgentService.getEnvironment();
                if (!remoteEnv) {
                    throw new Error('Cannot provide init data for remote extension host!');
                }
                const myExtensions = runningLocations.filterByExtensionHostKind(snapshot.extensions, 3 /* ExtensionHostKind.Remote */);
                const extensions = new ExtensionHostExtensions(snapshot.versionId, snapshot.extensions, myExtensions.map(extension => extension.identifier));
                return {
                    connectionData: this._remoteAuthorityResolverService.getConnectionData(remoteAuthority),
                    pid: remoteEnv.pid,
                    appRoot: remoteEnv.appRoot,
                    extensionHostLogsPath: remoteEnv.extensionHostLogsPath,
                    globalStorageHome: remoteEnv.globalStorageHome,
                    workspaceStorageHome: remoteEnv.workspaceStorageHome,
                    extensions,
                };
            }
        };
    }
};
NativeExtensionHostFactory = __decorate([
    __param(3, IInstantiationService),
    __param(4, IWorkbenchEnvironmentService),
    __param(5, IWorkbenchExtensionEnablementService),
    __param(6, IConfigurationService),
    __param(7, IRemoteAgentService),
    __param(8, IRemoteAuthorityResolverService),
    __param(9, ILogService)
], NativeExtensionHostFactory);
function determineLocalWebWorkerExtHostEnablement(environmentService, configurationService) {
    if (environmentService.isExtensionDevelopment && environmentService.extensionDevelopmentKind?.some(k => k === 'web')) {
        return 1 /* LocalWebWorkerExtHostEnablement.Eager */;
    }
    else {
        const config = configurationService.getValue(webWorkerExtHostConfig);
        if (config === true) {
            return 1 /* LocalWebWorkerExtHostEnablement.Eager */;
        }
        else if (config === 'auto') {
            return 2 /* LocalWebWorkerExtHostEnablement.Lazy */;
        }
        else {
            return 0 /* LocalWebWorkerExtHostEnablement.Disabled */;
        }
    }
}
var LocalWebWorkerExtHostEnablement;
(function (LocalWebWorkerExtHostEnablement) {
    LocalWebWorkerExtHostEnablement[LocalWebWorkerExtHostEnablement["Disabled"] = 0] = "Disabled";
    LocalWebWorkerExtHostEnablement[LocalWebWorkerExtHostEnablement["Eager"] = 1] = "Eager";
    LocalWebWorkerExtHostEnablement[LocalWebWorkerExtHostEnablement["Lazy"] = 2] = "Lazy";
})(LocalWebWorkerExtHostEnablement || (LocalWebWorkerExtHostEnablement = {}));
let NativeExtensionHostKindPicker = NativeExtensionHostKindPicker_1 = class NativeExtensionHostKindPicker {
    constructor(environmentService, configurationService, _logService) {
        this._logService = _logService;
        this._hasRemoteExtHost = Boolean(environmentService.remoteAuthority);
        const webWorkerExtHostEnablement = determineLocalWebWorkerExtHostEnablement(environmentService, configurationService);
        this._hasWebWorkerExtHost = (webWorkerExtHostEnablement !== 0 /* LocalWebWorkerExtHostEnablement.Disabled */);
    }
    pickExtensionHostKind(extensionId, extensionKinds, isInstalledLocally, isInstalledRemotely, preference) {
        const result = NativeExtensionHostKindPicker_1.pickExtensionHostKind(extensionKinds, isInstalledLocally, isInstalledRemotely, preference, this._hasRemoteExtHost, this._hasWebWorkerExtHost);
        this._logService.trace(`pickRunningLocation for ${extensionId.value}, extension kinds: [${extensionKinds.join(', ')}], isInstalledLocally: ${isInstalledLocally}, isInstalledRemotely: ${isInstalledRemotely}, preference: ${extensionRunningPreferenceToString(preference)} => ${extensionHostKindToString(result)}`);
        return result;
    }
    static pickExtensionHostKind(extensionKinds, isInstalledLocally, isInstalledRemotely, preference, hasRemoteExtHost, hasWebWorkerExtHost) {
        const result = [];
        for (const extensionKind of extensionKinds) {
            if (extensionKind === 'ui' && isInstalledLocally) {
                // ui extensions run locally if possible
                if (preference === 0 /* ExtensionRunningPreference.None */ || preference === 1 /* ExtensionRunningPreference.Local */) {
                    return 1 /* ExtensionHostKind.LocalProcess */;
                }
                else {
                    result.push(1 /* ExtensionHostKind.LocalProcess */);
                }
            }
            if (extensionKind === 'workspace' && isInstalledRemotely) {
                // workspace extensions run remotely if possible
                if (preference === 0 /* ExtensionRunningPreference.None */ || preference === 2 /* ExtensionRunningPreference.Remote */) {
                    return 3 /* ExtensionHostKind.Remote */;
                }
                else {
                    result.push(3 /* ExtensionHostKind.Remote */);
                }
            }
            if (extensionKind === 'workspace' && !hasRemoteExtHost) {
                // workspace extensions also run locally if there is no remote
                if (preference === 0 /* ExtensionRunningPreference.None */ || preference === 1 /* ExtensionRunningPreference.Local */) {
                    return 1 /* ExtensionHostKind.LocalProcess */;
                }
                else {
                    result.push(1 /* ExtensionHostKind.LocalProcess */);
                }
            }
            if (extensionKind === 'web' && isInstalledLocally && hasWebWorkerExtHost) {
                // web worker extensions run in the local web worker if possible
                if (preference === 0 /* ExtensionRunningPreference.None */ || preference === 1 /* ExtensionRunningPreference.Local */) {
                    return 2 /* ExtensionHostKind.LocalWebWorker */;
                }
                else {
                    result.push(2 /* ExtensionHostKind.LocalWebWorker */);
                }
            }
        }
        return (result.length > 0 ? result[0] : null);
    }
};
NativeExtensionHostKindPicker = NativeExtensionHostKindPicker_1 = __decorate([
    __param(0, IWorkbenchEnvironmentService),
    __param(1, IConfigurationService),
    __param(2, ILogService)
], NativeExtensionHostKindPicker);
export { NativeExtensionHostKindPicker };
class RestartExtensionHostAction extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.restartExtensionHost',
            title: nls.localize2('restartExtensionHost', "Restart Extension Host"),
            category: Categories.Developer,
            f1: true
        });
    }
    async run(accessor) {
        const extensionService = accessor.get(IExtensionService);
        const stopped = await extensionService.stopExtensionHosts(nls.localize('restartExtensionHost.reason', "An explicit request"));
        if (stopped) {
            extensionService.startExtensionHosts();
        }
    }
}
registerAction2(RestartExtensionHostAction);
registerSingleton(IExtensionService, NativeExtensionService, 0 /* InstantiationType.Eager */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmF0aXZlRXh0ZW5zaW9uU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL2FkdmlrYXIvRG9jdW1lbnRzL2FyY2hpdGVjdC9hcmNoMi9BcmNoSURFL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9leHRlbnNpb25zL2VsZWN0cm9uLWJyb3dzZXIvbmF0aXZlRXh0ZW5zaW9uU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDcEUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQ2hFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQzVFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUM3RCxPQUFPLEtBQUssV0FBVyxNQUFNLHdDQUF3QyxDQUFDO0FBQ3RFLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUUzRCxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFDO0FBQzFDLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSw4REFBOEQsQ0FBQztBQUMxRixPQUFPLEVBQUUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQzFGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUNuRixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNuRyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFFaEYsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sd0VBQXdFLENBQUM7QUFFbEgsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQzFFLE9BQU8sRUFBcUIsaUJBQWlCLEVBQUUs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