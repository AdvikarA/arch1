/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { hostname, release } from 'os';
import { toErrorMessage } from '../../../base/common/errorMessage.js';
import { onUnexpectedError, setUnexpectedErrorHandler } from '../../../base/common/errors.js';
import { combinedDisposable, Disposable, toDisposable } from '../../../base/common/lifecycle.js';
import { Schemas } from '../../../base/common/network.js';
import { URI } from '../../../base/common/uri.js';
import { Emitter } from '../../../base/common/event.js';
import { ProxyChannel, StaticRouter } from '../../../base/parts/ipc/common/ipc.js';
import { Server as UtilityProcessMessagePortServer, once } from '../../../base/parts/ipc/node/ipc.mp.js';
import { CodeCacheCleaner } from './contrib/codeCacheCleaner.js';
import { LanguagePackCachedDataCleaner } from './contrib/languagePackCachedDataCleaner.js';
import { LocalizationsUpdater } from './contrib/localizationsUpdater.js';
import { LogsDataCleaner } from './contrib/logsDataCleaner.js';
import { UnusedWorkspaceStorageDataCleaner } from './contrib/storageDataCleaner.js';
import { IChecksumService } from '../../../platform/checksum/common/checksumService.js';
import { ChecksumService } from '../../../platform/checksum/node/checksumService.js';
import { IConfigurationService } from '../../../platform/configuration/common/configuration.js';
import { ConfigurationService } from '../../../platform/configuration/common/configurationService.js';
import { IDiagnosticsService } from '../../../platform/diagnostics/common/diagnostics.js';
import { DiagnosticsService } from '../../../platform/diagnostics/node/diagnosticsService.js';
import { IDownloadService } from '../../../platform/download/common/download.js';
import { DownloadService } from '../../../platform/download/common/downloadService.js';
import { INativeEnvironmentService } from '../../../platform/environment/common/environment.js';
import { GlobalExtensionEnablementService } from '../../../platform/extensionManagement/common/extensionEnablementService.js';
import { ExtensionGalleryService } from '../../../platform/extensionManagement/common/extensionGalleryService.js';
import { IAllowedExtensionsService, IExtensionGalleryService, IExtensionManagementService, IExtensionTipsService, IGlobalExtensionEnablementService } from '../../../platform/extensionManagement/common/extensionManagement.js';
import { ExtensionSignatureVerificationService, IExtensionSignatureVerificationService } from '../../../platform/extensionManagement/node/extensionSignatureVerificationService.js';
import { ExtensionManagementChannel, ExtensionTipsChannel } from '../../../platform/extensionManagement/common/extensionManagementIpc.js';
import { ExtensionManagementService, INativeServerExtensionManagementService } from '../../../platform/extensionManagement/node/extensionManagementService.js';
import { IExtensionRecommendationNotificationService } from '../../../platform/extensionRecommendations/common/extensionRecommendations.js';
import { IFileService } from '../../../platform/files/common/files.js';
import { FileService } from '../../../platform/files/common/fileService.js';
import { DiskFileSystemProvider } from '../../../platform/files/node/diskFileSystemProvider.js';
import { SyncDescriptor } from '../../../platform/instantiation/common/descriptors.js';
import { IInstantiationService } from '../../../platform/instantiation/common/instantiation.js';
import { InstantiationService } from '../../../platform/instantiation/common/instantiationService.js';
import { ServiceCollection } from '../../../platform/instantiation/common/serviceCollection.js';
import { ILanguagePackService } from '../../../platform/languagePacks/common/languagePacks.js';
import { NativeLanguagePackService } from '../../../platform/languagePacks/node/languagePacks.js';
import { ConsoleLogger, ILoggerService, ILogService } from '../../../platform/log/common/log.js';
import { LoggerChannelClient } from '../../../platform/log/common/logIpc.js';
import product from '../../../platform/product/common/product.js';
import { IProductService } from '../../../platform/product/common/productService.js';
import { IRequestService } from '../../../platform/request/common/request.js';
import { IStorageService } from '../../../platform/storage/common/storage.js';
import { resolveCommonProperties } from '../../../platform/telemetry/common/commonProperties.js';
import { ICustomEndpointTelemetryService, ITelemetryService } from '../../../platform/telemetry/common/telemetry.js';
import { TelemetryAppenderChannel } from '../../../platform/telemetry/common/telemetryIpc.js';
import { TelemetryLogAppender } from '../../../platform/telemetry/common/telemetryLogAppender.js';
import { TelemetryService } from '../../../platform/telemetry/common/telemetryService.js';
import { supportsTelemetry, NullAppender, NullTelemetryService, getPiiPathsFromEnvironment, isInternalTelemetry, isLoggingOnly } from '../../../platform/telemetry/common/telemetryUtils.js';
import { CustomEndpointTelemetryService } from '../../../platform/telemetry/node/customEndpointTelemetryService.js';
import { ExtensionStorageService, IExtensionStorageService } from '../../../platform/extensionManagement/common/extensionStorage.js';
import { IgnoredExtensionsManagementService, IIgnoredExtensionsManagementService } from '../../../platform/userDataSync/common/ignoredExtensions.js';
import { IUserDataSyncLocalStoreService, IUserDataSyncLogService, IUserDataSyncEnablementService, IUserDataSyncService, IUserDataSyncStoreManagementService, IUserDataSyncStoreService, IUserDataSyncUtilService, registerConfiguration as registerUserDataSyncConfiguration, IUserDataSyncResourceProviderService } from '../../../platform/userDataSync/common/userDataSync.js';
import { IUserDataSyncAccountService, UserDataSyncAccountService } from '../../../platform/userDataSync/common/userDataSyncAccount.js';
import { UserDataSyncLocalStoreService } from '../../../platform/userDataSync/common/userDataSyncLocalStoreService.js';
import { UserDataSyncAccountServiceChannel, UserDataSyncStoreManagementServiceChannel } from '../../../platform/userDataSync/common/userDataSyncIpc.js';
import { UserDataSyncLogService } from '../../../platform/userDataSync/common/userDataSyncLog.js';
import { IUserDataSyncMachinesService, UserDataSyncMachinesService } from '../../../platform/userDataSync/common/userDataSyncMachines.js';
import { UserDataSyncEnablementService } from '../../../platform/userDataSync/common/userDataSyncEnablementService.js';
import { UserDataSyncService } from '../../../platform/userDataSync/common/userDataSyncService.js';
import { UserDataSyncServiceChannel } from '../../../platform/userDataSync/common/userDataSyncServiceIpc.js';
import { UserDataSyncStoreManagementService, UserDataSyncStoreService } from '../../../platform/userDataSync/common/userDataSyncStoreService.js';
import { IUserDataProfileStorageService } from '../../../platform/userDataProfile/common/userDataProfileStorageService.js';
import { SharedProcessUserDataProfileStorageService } from '../../../platform/userDataProfile/node/userDataProfileStorageService.js';
import { ActiveWindowManager } from '../../../platform/windows/node/windowTracker.js';
import { ISignService } from '../../../platform/sign/common/sign.js';
import { SignService } from '../../../platform/sign/node/signService.js';
import { ISharedTunnelsService } from '../../../platform/tunnel/common/tunnel.js';
import { SharedTunnelsService } from '../../../platform/tunnel/node/tunnelService.js';
import { ipcSharedProcessTunnelChannelName, ISharedProcessTunnelService } from '../../../platform/remote/common/sharedProcessTunnelService.js';
import { SharedProcessTunnelService } from '../../../platform/tunnel/node/sharedProcessTunnelService.js';
import { IUriIdentityService } from '../../../platform/uriIdentity/common/uriIdentity.js';
import { UriIdentityService } from '../../../platform/uriIdentity/common/uriIdentityService.js';
import { isLinux } from '../../../base/common/platform.js';
import { FileUserDataProvider } from '../../../platform/userData/common/fileUserDataProvider.js';
import { DiskFileSystemProviderClient, LOCAL_FILE_SYSTEM_CHANNEL_NAME } from '../../../platform/files/common/diskFileSystemProviderClient.js';
import { InspectProfilingService as V8InspectProfilingService } from '../../../platform/profiling/node/profilingService.js';
import { IV8InspectProfilingService } from '../../../platform/profiling/common/profiling.js';
import { IExtensionsScannerService } from '../../../platform/extensionManagement/common/extensionsScannerService.js';
import { ExtensionsScannerService } from '../../../platform/extensionManagement/node/extensionsScannerService.js';
import { IUserDataProfilesService } from '../../../platform/userDataProfile/common/userDataProfile.js';
import { IExtensionsProfileScannerService } from '../../../platform/extensionManagement/common/extensionsProfileScannerService.js';
import { PolicyChannelClient } from '../../../platform/policy/common/policyIpc.js';
import { IPolicyService, NullPolicyService } from '../../../platform/policy/common/policy.js';
import { UserDataProfilesService } from '../../../platform/userDataProfile/common/userDataProfileIpc.js';
import { OneDataSystemAppender } from '../../../platform/telemetry/node/1dsAppender.js';
import { UserDataProfilesCleaner } from './contrib/userDataProfilesCleaner.js';
import { IRemoteTunnelService } from '../../../platform/remoteTunnel/common/remoteTunnel.js';
import { UserDataSyncResourceProviderService } from '../../../platform/userDataSync/common/userDataSyncResourceProvider.js';
import { ExtensionsContributions } from './contrib/extensions.js';
import { localize } from '../../../nls.js';
import { LogService } from '../../../platform/log/common/logService.js';
import { ISharedProcessLifecycleService, SharedProcessLifecycleService } from '../../../platform/lifecycle/node/sharedProcessLifecycleService.js';
import { RemoteTunnelService } from '../../../platform/remoteTunnel/node/remoteTunnelService.js';
import { ExtensionsProfileScannerService } from '../../../platform/extensionManagement/node/extensionsProfileScannerService.js';
import { ExtensionRecommendationNotificationServiceChannelClient } from '../../../platform/extensionRecommendations/common/extensionRecommendationsIpc.js';
import { INativeHostService } from '../../../platform/native/common/native.js';
import { NativeHostService } from '../../../platform/native/common/nativeHostService.js';
import { UserDataAutoSyncService } from '../../../platform/userDataSync/node/userDataAutoSyncService.js';
import { ExtensionTipsService } from '../../../platform/extensionManagement/node/extensionTipsService.js';
import { IMainProcessService, MainProcessService } from '../../../platform/ipc/common/mainProcessService.js';
import { RemoteStorageService } from '../../../platform/storage/common/storageService.js';
import { IRemoteSocketFactoryService, RemoteSocketFactoryService } from '../../../platform/remote/common/remoteSocketFactoryService.js';
import { nodeSocketFactory } from '../../../platform/remote/node/nodeSocketFactory.js';
import { NativeEnvironmentService } from '../../../platform/environment/node/environmentService.js';
import { SharedProcessRawConnection, SharedProcessLifecycle } from '../../../platform/sharedProcess/common/sharedProcess.js';
import { getOSReleaseInfo } from '../../../base/node/osReleaseInfo.js';
import { getDesktopEnvironment } from '../../../base/common/desktopEnvironmentInfo.js';
import { getCodeDisplayProtocol, getDisplayProtocol } from '../../../base/node/osDisplayProtocolInfo.js';
import { RequestService } from '../../../platform/request/electron-utility/requestService.js';
import { DefaultExtensionsInitializer } from './contrib/defaultExtensionsInitializer.js';
import { AllowedExtensionsService } from '../../../platform/extensionManagement/common/allowedExtensionsService.js';
import { IExtensionGalleryManifestService } from '../../../platform/extensionManagement/common/extensionGalleryManifest.js';
import { ExtensionGalleryManifestIPCService } from '../../../platform/extensionManagement/common/extensionGalleryManifestServiceIpc.js';
import { ISharedWebContentExtractorService } from '../../../platform/webContentExtractor/common/webContentExtractor.js';
import { SharedWebContentExtractorService } from '../../../platform/webContentExtractor/node/sharedWebContentExtractorService.js';
import { McpManagementService } from '../../../platform/mcp/node/mcpManagementService.js';
import { IAllowedMcpServersService, IMcpGalleryService, IMcpManagementService } from '../../../platform/mcp/common/mcpManagement.js';
import { IMcpResourceScannerService, McpResourceScannerService } from '../../../platform/mcp/common/mcpResourceScannerService.js';
import { McpGalleryService } from '../../../platform/mcp/common/mcpGalleryService.js';
import { McpManagementChannel } from '../../../platform/mcp/common/mcpManagementIpc.js';
import { AllowedMcpServersService } from '../../../platform/mcp/common/allowedMcpServersService.js';
class SharedProcessMain extends Disposable {
    constructor(configuration) {
        super();
        this.configuration = configuration;
        this.server = this._register(new UtilityProcessMessagePortServer(this));
        this.lifecycleService = undefined;
        this.onDidWindowConnectRaw = this._register(new Emitter());
        this.registerListeners();
    }
    registerListeners() {
        // Shared process lifecycle
        let didExit = false;
        const onExit = () => {
            if (!didExit) {
                didExit = true;
                this.lifecycleService?.fireOnWillShutdown();
                this.dispose();
            }
        };
        process.once('exit', onExit);
        once(process.parentPort, SharedProcessLifecycle.exit, onExit);
    }
    async init() {
        // Services
        const instantiationService = await this.initServices();
        // Config
        registerUserDataSyncConfiguration();
        instantiationService.invokeFunction(accessor => {
            const logService = accessor.get(ILogService);
            const telemetryService = accessor.get(ITelemetryService);
            // Log info
            logService.trace('sharedProcess configuration', JSON.stringify(this.configuration));
            // Channels
            this.initChannels(accessor);
            // Error handler
            this.registerErrorHandler(logService);
            // Report Client OS/DE Info
            this.reportClientOSInfo(telemetryService, logService);
        });
        // Instantiate Contributions
        this._register(combinedDisposable(instantiationService.createInstance(CodeCacheCleaner, this.configuration.codeCachePath), instantiationService.createInstance(LanguagePackCachedDataCleaner), instantiationService.createInstance(UnusedWorkspaceStorageDataCleaner), instantiationService.createInstance(LogsDataCleaner), instantiationService.createInstance(LocalizationsUpdater), instantiationService.createInstance(ExtensionsContributions), instantiationService.createInstance(UserDataProfilesCleaner), instantiationService.createInstance(DefaultExtensionsInitializer)));
    }
    async initServices() {
        const services = new ServiceCollection();
        // Product
        const productService = { _serviceBrand: undefined, ...product };
        services.set(IProductService, productService);
        // Main Process
        const mainRouter = new StaticRouter(ctx => ctx === 'main');
        const mainProcessService = new MainProcessService(this.server, mainRouter);
        services.set(IMainProcessService, mainProcessService);
        // Policies
        const policyService = this.configuration.policiesData ? new PolicyChannelClient(this.configuration.policiesData, mainProcessService.getChannel('policy')) : new NullPolicyService();
        services.set(IPolicyService, policyService);
        // Environment
        const environmentService = new NativeEnvironmentService(this.configuration.args, productService);
        services.set(INativeEnvironmentService, environmentService);
        // Logger
        const loggerService = new LoggerChannelClient(undefined, this.configuration.logLevel, environmentService.logsHome, this.configuration.loggers.map(loggerResource => ({ ...loggerResource, resource: URI.revive(loggerResource.resource) })), mainProcessService.getChannel('logger'));
        services.set(ILoggerService, loggerService);
        // Log
        const sharedLogGroup = { id: 'shared', name: localize('sharedLog', "Shared") };
        const logger = this._register(loggerService.createLogger('sharedprocess', { name: localize('sharedLog', "Shared"), group: sharedLogGroup }));
        const consoleLogger = this._register(new ConsoleLogger(logger.getLevel()));
        const logService = this._register(new LogService(logger, [consoleLogger]));
        services.set(ILogService, logService);
        // Lifecycle
        this.lifecycleService = this._register(new SharedProcessLifecycleService(logService));
        services.set(ISharedProcessLifecycleService, this.lifecycleService);
        // Files
        const fileService = this._register(new FileService(logService));
        services.set(IFileService, fileService);
        const diskFileSystemProvider = this._register(new DiskFileSystemProvider(logService));
        fileService.registerProvider(Schemas.file, diskFileSystemProvider);
        // URI Identity
        const uriIdentityService = new UriIdentityService(fileService);
        services.set(IUriIdentityService, uriIdentityService);
        // User Data Profiles
        const userDataProfilesService = this._register(new UserDataProfilesService(this.configuration.profiles.all, URI.revive(this.configuration.profiles.home).with({ scheme: environmentService.userRoamingDataHome.scheme }), mainProcessService.getChannel('userDataProfiles')));
        services.set(IUserDataProfilesService, userDataProfilesService);
        const userDataFileSystemProvider = this._register(new FileUserDataProvider(Schemas.file, 
        // Specifically for user data, use the disk file system provider
        // from the main process to enable atomic read/write operations.
        // Since user data can change very frequently across multiple
        // processes, we want a single process handling these operations.
        this._register(new DiskFileSystemProviderClient(mainProcessService.getChannel(LOCAL_FILE_SYSTEM_CHANNEL_NAME), { pathCaseSensitive: isLinux })), Schemas.vscodeUserData, userDataProfilesService, uriIdentityService, logService));
        fileService.registerProvider(Schemas.vscodeUserData, userDataFileSystemProvider);
        // Configuration
        const configurationService = this._register(new ConfigurationService(userDataProfilesService.defaultProfile.settingsResource, fileService, policyService, logService));
        services.set(IConfigurationService, configurationService);
        // Storage (global access only)
        const storageService = new RemoteStorageService(undefined, { defaultProfile: userDataProfilesService.defaultProfile, currentProfile: userDataProfilesService.defaultProfile }, mainProcessService, environmentService);
        services.set(IStorageService, storageService);
        this._register(toDisposable(() => storageService.flush()));
        // Initialize config & storage in parallel
        await Promise.all([
            configurationService.initialize(),
            storageService.initialize()
        ]);
        // Request
        const networkLogger = this._register(loggerService.createLogger(`network-shared`, { name: localize('networkk', "Network"), group: sharedLogGroup }));
        const requestService = new RequestService(configurationService, environmentService, this._register(new LogService(networkLogger)));
        services.set(IRequestService, requestService);
        // Checksum
        services.set(IChecksumService, new SyncDescriptor(ChecksumService, undefined, false /* proxied to other processes */));
        // V8 Inspect profiler
        services.set(IV8InspectProfilingService, new SyncDescriptor(V8InspectProfilingService, undefined, false /* proxied to other processes */));
        // Native Host
        const nativeHostService = new NativeHostService(-1 /* we are not running in a browser window context */, mainProcessService);
        services.set(INativeHostService, nativeHostService);
        // Download
        services.set(IDownloadService, new SyncDescriptor(DownloadService, undefined, true));
        // Extension recommendations
        const activeWindowManager = this._register(new ActiveWindowManager(nativeHostService));
        const activeWindowRouter = new StaticRouter(ctx => activeWindowManager.getActiveClientId().then(id => ctx === id));
        services.set(IExtensionRecommendationNotificationService, new ExtensionRecommendationNotificationServiceChannelClient(this.server.getChannel('extensionRecommendationNotification', activeWindowRouter)));
        // Telemetry
        let telemetryService;
        const appenders = [];
        const internalTelemetry = isInternalTelemetry(productService, configurationService);
        if (supportsTelemetry(productService, environmentService)) {
            const logAppender = new TelemetryLogAppender('', false, loggerService, environmentService, productService);
            appenders.push(logAppender);
            if (!isLoggingOnly(productService, environmentService) && productService.aiConfig?.ariaKey) {
                const collectorAppender = new OneDataSystemAppender(requestService, internalTelemetry, 'monacoworkbench', null, productService.aiConfig.ariaKey);
                this._register(toDisposable(() => collectorAppender.flush())); // Ensure the 1DS appender is disposed so that it flushes remaining data
                appenders.push(collectorAppender);
            }
            telemetryService = new TelemetryService({
                appenders,
                commonProperties: resolveCommonProperties(release(), hostname(), process.arch, productService.commit, productService.version, this.configuration.machineId, this.configuration.sqmId, this.configuration.devDeviceId, internalTelemetry, productService.date),
                sendErrorTelemetry: true,
                piiPaths: getPiiPathsFromEnvironment(environmentService),
            }, configurationService, productService);
        }
        else {
            telemetryService = NullTelemetryService;
            const nullAppender = NullAppender;
            appenders.push(nullAppender);
        }
        this.server.registerChannel('telemetryAppender', new TelemetryAppenderChannel(appenders));
        services.set(ITelemetryService, telemetryService);
        // Custom Endpoint Telemetry
        const customEndpointTelemetryService = new CustomEndpointTelemetryService(configurationService, telemetryService, loggerService, environmentService, productService);
        services.set(ICustomEndpointTelemetryService, customEndpointTelemetryService);
        // Extension Management
        services.set(IExtensionsProfileScannerService, new SyncDescriptor(ExtensionsProfileScannerService, undefined, true));
        services.set(IExtensionsScannerService, new SyncDescriptor(ExtensionsScannerService, undefined, true));
        services.set(IExtensionSignatureVerificationService, new SyncDescriptor(ExtensionSignatureVerificationService, undefined, true));
        services.set(IAllowedExtensionsService, new SyncDescriptor(AllowedExtensionsService, undefined, true));
        services.set(INativeServerExtensionManagementService, new SyncDescriptor(ExtensionManagementService, undefined, true));
        // MCP Management
        services.set(IAllowedMcpServersService, new SyncDescriptor(AllowedMcpServersService, undefined, true));
        services.set(IMcpGalleryService, new SyncDescriptor(McpGalleryService, undefined, true));
        services.set(IMcpResourceScannerService, new SyncDescriptor(McpResourceScannerService, undefined, true));
        services.set(IMcpManagementService, new SyncDescriptor(McpManagementService, undefined, true));
        // Extension Gallery
        services.set(IExtensionGalleryManifestService, new ExtensionGalleryManifestIPCService(this.server, productService));
        services.set(IExtensionGalleryService, new SyncDescriptor(ExtensionGalleryService, undefined, true));
        // Extension Tips
        services.set(IExtensionTipsService, new SyncDescriptor(ExtensionTipsService, undefined, false /* Eagerly scans and computes exe based recommendations */));
        // Localizations
        services.set(ILanguagePackService, new SyncDescriptor(NativeLanguagePackService, undefined, false /* proxied to other processes */));
        // Diagnostics
        services.set(IDiagnosticsService, new SyncDescriptor(DiagnosticsService, undefined, false /* proxied to other processes */));
        // Settings Sync
        services.set(IUserDataSyncAccountService, new SyncDescriptor(UserDataSyncAccountService, undefined, true));
        services.set(IUserDataSyncLogService, new SyncDescriptor(UserDataSyncLogService, undefined, true));
        services.set(IUserDataSyncUtilService, ProxyChannel.toService(this.server.getChannel('userDataSyncUtil', client => client.ctx !== 'main')));
        services.set(IGlobalExtensionEnablementService, new SyncDescriptor(GlobalExtensionEnablementService, undefined, false /* Eagerly resets installed extensions */));
        services.set(IIgnoredExtensionsManagementService, new SyncDescriptor(IgnoredExtensionsManagementService, undefined, true));
        services.set(IExtensionStorageService, new SyncDescriptor(ExtensionStorageService));
        services.set(IUserDataSyncStoreManagementService, new SyncDescriptor(UserDataSyncStoreManagementService, undefined, true));
        services.set(IUserDataSyncStoreService, new SyncDescriptor(UserDataSyncStoreService, undefined, true));
        services.set(IUserDataSyncMachinesService, new SyncDescriptor(UserDataSyncMachinesService, undefined, true));
        services.set(IUserDataSyncLocalStoreService, new SyncDescriptor(UserDataSyncLocalStoreService, undefined, false /* Eagerly cleans up old backups */));
        services.set(IUserDataSyncEnablementService, new SyncDescriptor(UserDataSyncEnablementService, undefined, true));
        services.set(IUserDataSyncService, new SyncDescriptor(UserDataSyncService, undefined, false /* Initializes the Sync State */));
        services.set(IUserDataProfileStorageService, new SyncDescriptor(SharedProcessUserDataProfileStorageService, undefined, true));
        services.set(IUserDataSyncResourceProviderService, new SyncDescriptor(UserDataSyncResourceProviderService, undefined, true));
        // Signing
        services.set(ISignService, new SyncDescriptor(SignService, undefined, false /* proxied to other processes */));
        // Tunnel
        const remoteSocketFactoryService = new RemoteSocketFactoryService();
        services.set(IRemoteSocketFactoryService, remoteSocketFactoryService);
        remoteSocketFactoryService.register(0 /* RemoteConnectionType.WebSocket */, nodeSocketFactory);
        services.set(ISharedTunnelsService, new SyncDescriptor(SharedTunnelsService));
        services.set(ISharedProcessTunnelService, new SyncDescriptor(SharedProcessTunnelService));
        // Remote Tunnel
        services.set(IRemoteTunnelService, new SyncDescriptor(RemoteTunnelService));
        // Web Content Extractor
        services.set(ISharedWebContentExtractorService, new SyncDescriptor(SharedWebContentExtractorService));
        return new InstantiationService(services);
    }
    initChannels(accessor) {
        // Extensions Management
        const channel = new ExtensionManagementChannel(accessor.get(IExtensionManagementService), () => null);
        this.server.registerChannel('extensions', channel);
        // Mcp Management
        const mcpManagementChannel = new McpManagementChannel(accessor.get(IMcpManagementService), () => null);
        this.server.registerChannel('mcpManagement', mcpManagementChannel);
        // Language Packs
        const languagePacksChannel = ProxyChannel.fromService(accessor.get(ILanguagePackService), this._store);
        this.server.registerChannel('languagePacks', languagePacksChannel);
        // Diagnostics
        const diagnosticsChannel = ProxyChannel.fromService(accessor.get(IDiagnosticsService), this._store);
        this.server.registerChannel('diagnostics', diagnosticsChannel);
        // Extension Tips
        const extensionTipsChannel = new ExtensionTipsChannel(accessor.get(IExtensionTipsService));
        this.server.registerChannel('extensionTipsService', extensionTipsChannel);
        // Checksum
        const checksumChannel = ProxyChannel.fromService(accessor.get(IChecksumService), this._store);
        this.server.registerChannel('checksum', checksumChannel);
        // Profiling
        const profilingChannel = ProxyChannel.fromService(accessor.get(IV8InspectProfilingService), this._store);
        this.server.registerChannel('v8InspectProfiling', profilingChannel);
        // Settings Sync
        const userDataSyncMachineChannel = ProxyChannel.fromService(accessor.get(IUserDataSyncMachinesService), this._store);
        this.server.registerChannel('userDataSyncMachines', userDataSyncMachineChannel);
        // Custom Endpoint Telemetry
        const customEndpointTelemetryChannel = ProxyChannel.fromService(accessor.get(ICustomEndpointTelemetryService), this._store);
        this.server.registerChannel('customEndpointTelemetry', customEndpointTelemetryChannel);
        const userDataSyncAccountChannel = new UserDataSyncAccountServiceChannel(accessor.get(IUserDataSyncAccountService));
        this.server.registerChannel('userDataSyncAccount', userDataSyncAccountChannel);
        const userDataSyncStoreManagementChannel = new UserDataSyncStoreManagementServiceChannel(accessor.get(IUserDataSyncStoreManagementService));
        this.server.registerChannel('userDataSyncStoreManagement', userDataSyncStoreManagementChannel);
        const userDataSyncChannel = new UserDataSyncServiceChannel(accessor.get(IUserDataSyncService), accessor.get(IUserDataProfilesService), accessor.get(ILogService));
        this.server.registerChannel('userDataSync', userDataSyncChannel);
        const userDataAutoSync = this._register(accessor.get(IInstantiationService).createInstance(UserDataAutoSyncService));
        this.server.registerChannel('userDataAutoSync', ProxyChannel.fromService(userDataAutoSync, this._store));
        this.server.registerChannel('IUserDataSyncResourceProviderService', ProxyChannel.fromService(accessor.get(IUserDataSyncResourceProviderService), this._store));
        // Tunnel
        const sharedProcessTunnelChannel = ProxyChannel.fromService(accessor.get(ISharedProcessTunnelService), this._store);
        this.server.registerChannel(ipcSharedProcessTunnelChannelName, sharedProcessTunnelChannel);
        // Remote Tunnel
        const remoteTunnelChannel = ProxyChannel.fromService(accessor.get(IRemoteTunnelService), this._store);
        this.server.registerChannel('remoteTunnel', remoteTunnelChannel);
        // Web Content Extractor
        const webContentExtractorChannel = ProxyChannel.fromService(accessor.get(ISharedWebContentExtractorService), this._store);
        this.server.registerChannel('sharedWebContentExtractor', webContentExtractorChannel);
    }
    registerErrorHandler(logService) {
        // Listen on global error events
        process.on('uncaughtException', error => onUnexpectedError(error));
        process.on('unhandledRejection', (reason) => onUnexpectedError(reason));
        // Install handler for unexpected errors
        setUnexpectedErrorHandler(error => {
            const message = toErrorMessage(error, true);
            if (!message) {
                return;
            }
            logService.error(`[uncaught exception in sharedProcess]: ${message}`);
        });
    }
    async reportClientOSInfo(telemetryService, logService) {
        if (isLinux) {
            const [releaseInfo, displayProtocol] = await Promise.all([
                getOSReleaseInfo(logService.error.bind(logService)),
                getDisplayProtocol(logService.error.bind(logService))
            ]);
            const desktopEnvironment = getDesktopEnvironment();
            const codeSessionType = getCodeDisplayProtocol(displayProtocol, this.configuration.args['ozone-platform']);
            if (releaseInfo) {
                telemetryService.publicLog2('clientPlatformInfo', {
                    platformId: releaseInfo.id,
                    platformVersionId: releaseInfo.version_id,
                    platformIdLike: releaseInfo.id_like,
                    desktopEnvironment: desktopEnvironment,
                    displayProtocol: displayProtocol,
                    codeDisplayProtocol: codeSessionType
                });
            }
        }
    }
    handledClientConnection(e) {
        // This filter on message port messages will look for
        // attempts of a window to connect raw to the shared
        // process to handle these connections separate from
        // our IPC based protocol.
        if (e.data !== SharedProcessRawConnection.response) {
            return false;
        }
        const port = e.ports.at(0);
        if (port) {
            this.onDidWindowConnectRaw.fire(port);
            return true;
        }
        return false;
    }
}
export async function main(configuration) {
    // create shared process and signal back to main that we are
    // ready to accept message ports as client connections
    try {
        const sharedProcess = new SharedProcessMain(configuration);
        process.parentPort.postMessage(SharedProcessLifecycle.ipcReady);
        // await initialization and signal this back to electron-main
        await sharedProcess.init();
        process.parentPort.postMessage(SharedProcessLifecycle.initDone);
    }
    catch (error) {
        process.parentPort.postMessage({ error: error.toString() });
    }
}
const handle = setTimeout(() => {
    process.parentPort.postMessage({ warning: '[SharedProcess] did not receive configuration within 30s...' });
}, 30000);
process.parentPort.once('message', (e) => {
    clearTimeout(handle);
    main(e.data);
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2hhcmVkUHJvY2Vzc01haW4uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9hZHZpa2FyL0RvY3VtZW50cy9hcmNoaXRlY3QvYXJjaDIvQXJjaElERS9zcmMvIiwic291cmNlcyI6WyJ2cy9jb2RlL2VsZWN0cm9uLXV0aWxpdHkvc2hhcmVkUHJvY2Vzcy9zaGFyZWRQcm9jZXNzTWFpbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE9BQU8sRUFBRSxNQUFNLElBQUksQ0FBQztBQUV2QyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDdEUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLHlCQUF5QixFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDOUYsT0FBTyxFQUFFLGtCQUFrQixFQUFFLFVBQVUsRUFBRSxZQUFZLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUNqRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDMUQsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBQ2xELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUN4RCxPQUFPLEVBQUUsWUFBWSxFQUFFLFlBQVksRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQ25GLE9BQU8sRUFBMkIsTUFBTSxJQUFJLCtCQUErQixFQUFFLElBQUksRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ2xJLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQ2pFLE9BQU8sRUFBRSw2QkFBNkIsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQzNGLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ3pFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUMvRCxPQUFPLEVBQUUsaUNBQWlDLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUNwRixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUN4RixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFDckYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0seURBQXlELENBQUM7QUFDaEcsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sZ0VBQWdFLENBQUM7QUFDdEcsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0scURBQXFELENBQUM7QUFDMUYsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sMERBQTBELENBQUM7QUFDOUYsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sK0NBQStDLENBQUM7QUFDakYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQ3ZGLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLHFEQUFxRCxDQUFDO0FBQ2hHLE9BQU8sRUFBRSxnQ0FBZ0MsRUFBRSxNQUFNLDRFQUE0RSxDQUFDO0FBQzlILE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLHlFQUF5RSxDQUFDO0FBQ2xILE9BQU8sRUFBRSx5QkFBeUIsRUFBRSx3QkFBd0IsRUFBRSwyQkFBMkIsRUFBRSxxQkFBcUIsRUFBRSxpQ0FBaUMsRUFBRSxNQUFNLHFFQUFxRSxDQUFDO0FBQ2pPLE9BQU8sRUFBRSxxQ0FBcUMsRUFBRSxzQ0FBc0MsRUFBRSxNQUFNLHFGQUFxRixDQUFDO0FBQ3BMLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxvQkFBb0IsRUFBRSxNQUFNLHdFQUF3RSxDQUFDO0FBQzFJLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBFQUEwRSxDQUFDO0FBQy9KLE9BQU8sRUFBRSwyQ0FBMkMsRUFBRSxNQUFNLCtFQUErRSxDQUFDO0FBQzVJLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUN2RSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sK0NBQStDLENBQUM7QUFDNUUsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sd0RBQXdELENBQUM7QUFDaEcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHVEQUF1RCxDQUFDO0FBQ3ZGLE9BQU8sRUFBRSxxQkFBcUIsRUFBb0IsTUFBTSx5REFBeUQsQ0FBQztBQUNsSCxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxnRUFBZ0UsQ0FBQztBQUN0RyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSw2REFBNkQsQ0FBQztBQUNoRyxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUMvRixPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSx1REFBdUQsQ0FBQztBQUNsRyxPQUFPLEVBQUUsYUFBYSxFQUFFLGNBQWMsRUFBRSxXQUFXLEVBQWUsTUFBTSxxQ0FBcUMsQ0FBQztBQUM5RyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUM3RSxPQUFPLE9BQU8sTUFBTSw2Q0FBNkMsQ0FBQztBQUNsRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFDckYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBRTlFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUM5RSxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSx3REFBd0QsQ0FBQztBQUNqRyxPQUFPLEVBQUUsK0JBQStCLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxpREFBaUQsQ0FBQztBQUNySCxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQztBQUM5RixPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNsRyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSx3REFBd0QsQ0FBQztBQUMxRixPQUFPLEVBQUUsaUJBQWlCLEVBQXNCLFlBQVksRUFBRSxvQkFBb0IsRUFBRSwwQkFBMEIsRUFBRSxtQkFBbUIsRUFBRSxhQUFhLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUNqTixPQUFPLEVBQUUsOEJBQThCLEVBQUUsTUFBTSxvRUFBb0UsQ0FBQztBQUNwSCxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxrRUFBa0UsQ0FBQztBQUNySSxPQUFPLEVBQUUsa0NBQWtDLEVBQUUsbUNBQW1DLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNySixPQUFPLEVBQUUsOEJBQThCLEVBQUUsdUJBQXVCLEVBQUUsOEJBQThCLEVBQUUsb0JBQW9CLEVBQUUsbUNBQW1DLEVBQUUseUJBQXlCLEVBQUUsd0JBQXdCLEVBQUUscUJBQXFCLElBQUksaUNBQWlDLEVBQUUsb0NBQW9DLEVBQUUsTUFBTSx1REFBdUQsQ0FBQztBQUNsWCxPQUFPLEVBQUUsMkJBQTJCLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSw4REFBOEQsQ0FBQztBQUN2SSxPQUFPLEVBQUUsNkJBQTZCLEVBQUUsTUFBTSx3RUFBd0UsQ0FBQztBQUN2SCxPQUFPLEVBQUUsaUNBQWlDLEVBQUUseUNBQXlDLEVBQUUsTUFBTSwwREFBMEQsQ0FBQztBQUN4SixPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSwwREFBMEQsQ0FBQztBQUNsRyxPQUFPLEVBQUUsNEJBQTRCLEVBQUUsMkJBQTJCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQztBQUMxSSxPQUFPLEVBQUUsNkJBQTZCLEVBQUUsTUFBTSx3RUFBd0UsQ0FBQztBQUN2SCxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSw4REFBOEQsQ0FBQztBQUNuRyxPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSxpRUFBaUUsQ0FBQztBQUM3RyxPQUFPLEVBQUUsa0NBQWtDLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxtRUFBbUUsQ0FBQztBQUNqSixPQUFPLEVBQUUsOEJBQThCLEVBQUUsTUFBTSwyRUFBMkUsQ0FBQztBQUMzSCxPQUFPLEVBQUUsMENBQTBDLEVBQUUsTUFBTSx5RUFBeUUsQ0FBQztBQUNySSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxpREFBaUQsQ0FBQztBQUN0RixPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDckUsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQ3pFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBQ2xGLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQ3RGLE9BQU8sRUFBRSxpQ0FBaUMsRUFBRSwyQkFBMkIsRUFBRSxNQUFNLCtEQUErRCxDQUFDO0FBQy9JLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLDZEQUE2RCxDQUFDO0FBQ3pHLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHFEQUFxRCxDQUFDO0FBQzFGLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ2hHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUMzRCxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSwyREFBMkQsQ0FBQztBQUNqRyxPQUFPLEVBQUUsNEJBQTRCLEVBQUUsOEJBQThCLEVBQUUsTUFBTSxnRUFBZ0UsQ0FBQztBQUM5SSxPQUFPLEVBQUUsdUJBQXVCLElBQUkseUJBQXlCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUM1SCxPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSxpREFBaUQsQ0FBQztBQUM3RixPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSwwRUFBMEUsQ0FBQztBQUNySCxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSx3RUFBd0UsQ0FBQztBQUNsSCxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSw2REFBNkQsQ0FBQztBQUN2RyxPQUFPLEVBQUUsZ0NBQWdDLEVBQUUsTUFBTSxpRkFBaUYsQ0FBQztBQUNuSSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQztBQUNuRixPQUFPLEVBQUUsY0FBYyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFDOUYsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sZ0VBQWdFLENBQUM7QUFDekcsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0saURBQWlELENBQUM7QUFDeEYsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDL0UsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sdURBQXVELENBQUM7QUFDN0YsT0FBTyxFQUFFLG1DQUFtQyxFQUFFLE1BQU0sdUVBQXVFLENBQUM7QUFDNUgsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0seUJBQXlCLENBQUM7QUFDbEUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGlCQUFpQixDQUFDO0FBQzNDLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUN4RSxPQUFPLEVBQUUsOEJBQThCLEVBQUUsNkJBQTZCLEVBQUUsTUFBTSxtRUFBbUUsQ0FBQztBQUNsSixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNqRyxPQUFPLEVBQUUsK0JBQStCLEVBQUUsTUFBTSwrRUFBK0UsQ0FBQztBQUNoSSxPQUFPLEVBQUUsdURBQXVELEVBQUUsTUFBTSxrRkFBa0YsQ0FBQztBQUMzSixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUMvRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUN6RixPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSxnRUFBZ0UsQ0FBQztBQUN6RyxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxvRUFBb0UsQ0FBQztBQUMxRyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQztBQUM3RyxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxvREFBb0QsQ0FBQztBQUMxRixPQUFPLEVBQUUsMkJBQTJCLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQztBQUV4SSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQztBQUN2RixPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSwwREFBMEQsQ0FBQztBQUNwRyxPQUFPLEVBQUUsMEJBQTBCLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUM3SCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUN2RSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUN2RixPQUFPLEVBQUUsc0JBQXNCLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUN6RyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sOERBQThELENBQUM7QUFDOUYsT0FBTyxFQUFFLDRCQUE0QixFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFDekYsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sMEVBQTBFLENBQUM7QUFDcEgsT0FBTyxFQUFFLGdDQUFnQyxFQUFFLE1BQU0sMEVBQTBFLENBQUM7QUFDNUgsT0FBTyxFQUFFLGtDQUFrQyxFQUFFLE1BQU0sb0ZBQW9GLENBQUM7QUFDeEksT0FBTyxFQUFFLGlDQUFpQyxFQUFFLE1BQU0scUVBQXFFLENBQUM7QUFDeEgsT0FBTyxFQUFFLGdDQUFnQyxFQUFFLE1BQU0sZ0ZBQWdGLENBQUM7QUFDbEksT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFDMUYsT0FBTyxFQUFFLHlCQUF5QixFQUFFLGtCQUFrQixFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0NBQStDLENBQUM7QUFDckksT0FBTyxFQUFFLDBCQUEwQixFQUFFLHlCQUF5QixFQUFFLE1BQU0sMkRBQTJELENBQUM7QUFDbEksT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDdEYsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDeEYsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sMERBQTBELENBQUM7QUFFcEcsTUFBTSxpQkFBa0IsU0FBUSxVQUFVO0lBUXpDLFlBQW9CLGFBQTBDO1FBQzdELEtBQUssRUFBRSxDQUFDO1FBRFcsa0JBQWEsR0FBYixhQUFhLENBQTZCO1FBTjdDLFdBQU0sR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksK0JBQStCLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztRQUU1RSxxQkFBZ0IsR0FBOEMsU0FBUyxDQUFDO1FBRS9ELDBCQUFxQixHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLEVBQW1CLENBQUMsQ0FBQztRQUt2RixJQUFJLENBQUMsaUJBQWlCLEVBQUUsQ0FBQztJQUMxQixDQUFDO0lBRU8saUJBQWlCO1FBRXhCLDJCQUEyQjtRQUMzQixJQUFJLE9BQU8sR0FBRyxLQUFLLENBQUM7UUFDcEIsTUFBTSxNQUFNLEdBQUcsR0FBRyxFQUFFO1lBQ25CLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztnQkFDZCxPQUFPLEdBQUcsSUFBSSxDQUFDO2dCQUVmLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxrQkFBa0IsRUFBRSxDQUFDO2dCQUM1QyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDaEIsQ0FBQztRQUNGLENBQUMsQ0FBQztRQUNGLE9BQU8sQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLE1BQU0sQ0FBQyxDQUFDO1FBQzdCLElBQUksQ0FBQyxPQUFPLENBQUMsVUFBVSxFQUFFLHNCQUFzQixDQUFDLElBQUksRUFBRSxNQUFNLENBQUMsQ0FBQztJQUMvRCxDQUFDO0lBRUQsS0FBSyxDQUFDLElBQUk7UUFFVCxXQUFXO1FBQ1gsTUFBTSxvQkFBb0IsR0FBRyxNQUFNLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQztRQUV2RCxTQUFTO1FBQ1QsaUNBQWlDLEVBQUUsQ0FBQztRQUVwQyxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsUUFBUSxDQUFDLEVBQUU7WUFDOUMsTUFBTSxVQUFVLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxXQUFXLENBQUMsQ0FBQztZQUM3QyxNQUFNLGdCQUFnQixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsaUJBQWlCLENBQUMsQ0FBQztZQUV6RCxXQUFXO1lBQ1gsVUFBVSxDQUFDLEtBQUssQ0FBQyw2QkFBNkIsRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDO1lBRXBGLFdBQVc7WUFDWCxJQUFJLENBQUMsWUFBWSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBRTVCLGdCQUFnQjtZQUNoQixJQUFJLENBQUMsb0JBQW9CLENBQUMsVUFBVSxDQUFDLENBQUM7WUFFdEMsMkJBQTJCO1lBQzNCLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxnQkFBZ0IsRUFBRSxVQUFVLENBQUMsQ0FBQztRQUN2RCxDQUFDLENBQUMsQ0FBQztRQUVILDRCQUE0QjtRQUM1QixJQUFJLENBQUMsU0FBUyxDQUFDLGtCQUFrQixDQUNoQyxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsZ0JBQWdCLEVBQUUsSUFBSSxDQUFDLGFBQWEsQ0FBQyxhQUFhLENBQUMsRUFDdkYsb0JBQW9CLENBQUMsY0FBYyxDQUFDLDZCQUE2QixDQUFDLEVBQ2xFLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyxpQ0FBaUMsQ0FBQyxFQUN0RSxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsZUFBZSxDQUFDLEVBQ3BELG9CQUFvQixDQUFDLGNBQWMsQ0FBQyxvQkFBb0IsQ0FBQyxFQUN6RCxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsdUJBQXVCLENBQUMsRUFDNUQsb0JBQW9CLENBQUMsY0FBYyxDQUFDLHVCQUF1QixDQUFDLEVBQzVELG9CQUFvQixDQUFDLGNBQWMsQ0FBQyw0QkFBNEIsQ0FBQyxDQUNqRSxDQUFDLENBQUM7SUFDSixDQUFDO0lBRU8sS0FBSyxDQUFDLFlBQVk7UUFDekIsTUFBTSxRQUFRLEdBQUcsSUFBSSxpQkFBaUIsRUFBRSxDQUFDO1FBRXpDLFVBQVU7UUFDVixNQUFNLGNBQWMsR0FBRyxFQUFFLGFBQWEsRUFBRSxTQUFTLEVBQUUsR0FBRyxPQUFPLEVBQUUsQ0FBQztRQUNoRSxRQUFRLENBQUMsR0FBRyxDQUFDLGVBQWUsRUFBRSxjQUFjLENBQUMsQ0FBQztRQUU5QyxlQUFlO1FBQ2YsTUFBTSxVQUFVLEdBQUcsSUFBSSxZQUFZLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEtBQUssTUFBTSxDQUFDLENBQUM7UUFDM0QsTUFBTSxrQkFBa0IsR0FBRyxJQUFJLGtCQUFrQixDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsVUFBVSxDQUFDLENBQUM7UUFDM0UsUUFBUSxDQUFDLEdBQUcsQ0FBQyxtQkFBbUIsRUFBRSxrQkFBa0IsQ0FBQyxDQUFDO1FBRXRELFdBQVc7UUFDWCxNQUFNLGFBQWEsR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsSUFBSSxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLFlBQVksRUFBRSxrQkFBa0IsQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxpQkFBaUIsRUFBRSxDQUFDO1FBQ3BMLFFBQVEsQ0FBQyxHQUFHLENBQUMsY0FBYyxFQUFFLGFBQWEsQ0FBQyxDQUFDO1FBRTVDLGNBQWM7UUFDZCxNQUFNLGtCQUFrQixHQUFHLElBQUksd0JBQXdCLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxJQUFJLEVBQUUsY0FBYyxDQUFDLENBQUM7UUFDakcsUUFBUSxDQUFDLEdBQUcsQ0FBQyx5QkFBeUIsRUFBRSxrQkFBa0IsQ0FBQyxDQUFDO1FBRTVELFNBQVM7UUFDVCxNQUFNLGFBQWEsR0FBRyxJQUFJLG1CQUFtQixDQUFDLFNBQVMsRUFBRSxJQUFJLENBQUMsYUFBYSxDQUFDLFFBQVEsRUFBRSxrQkFBa0IsQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLGNBQWMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLEdBQUcsY0FBYyxFQUFFLFFBQVEsRUFBRSxHQUFHLENBQUMsTUFBTSxDQUFDLGNBQWMsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxrQkFBa0IsQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQztRQUN0UixRQUFRLENBQUMsR0FBRyxDQUFDLGNBQWMsRUFBRSxhQUFhLENBQUMsQ0FBQztRQUU1QyxNQUFNO1FBQ04sTUFBTSxjQUFjLEdBQWdCLEVBQUUsRUFBRSxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUUsUUFBUSxDQUFDLFdBQVcsRUFBRSxRQUFRLENBQUMsRUFBRSxDQUFDO1FBQzVGLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsYUFBYSxDQUFDLFlBQVksQ0FBQyxlQUFlLEVBQUUsRUFBRSxJQUFJLEVBQUUsUUFBUSxDQUFDLFdBQVcsRUFBRSxRQUFRLENBQUMsRUFBRSxLQUFLLEVBQUUsY0FBYyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQzdJLE1BQU0sYUFBYSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxhQUFhLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUMzRSxNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksVUFBVSxDQUFDLE1BQU0sRUFBRSxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUMzRSxRQUFRLENBQUMsR0FBRyxDQUFDLFdBQVcsRUFBRSxVQUFVLENBQUMsQ0FBQztRQUV0QyxZQUFZO1FBQ1osSUFBSSxDQUFDLGdCQUFnQixHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSw2QkFBNkIsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDO1FBQ3RGLFFBQVEsQ0FBQyxHQUFHLENBQUMsOEJBQThCLEVBQUUsSUFBSSxDQUFDLGdCQUFnQixDQUFDLENBQUM7UUFFcEUsUUFBUTtRQUNSLE1BQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxXQUFXLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQztRQUNoRSxRQUFRLENBQUMsR0FBRyxDQUFDLFlBQVksRUFBRSxXQUFXLENBQUMsQ0FBQztRQUV4QyxNQUFNLHNCQUFzQixHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxzQkFBc0IsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDO1FBQ3RGLFdBQVcsQ0FBQyxnQkFBZ0IsQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLHNCQUFzQixDQUFDLENBQUM7UUFFbkUsZUFBZTtRQUNmLE1BQU0sa0JBQWtCLEdBQUcsSUFBSSxrQkFBa0IsQ0FBQyxXQUFXLENBQUMsQ0FBQztRQUMvRCxRQUFRLENBQUMsR0FBRyxDQUFDLG1CQUFtQixFQUFFLGtCQUFrQixDQUFDLENBQUM7UUFFdEQscUJBQXFCO1FBQ3JCLE1BQU0sdUJBQXVCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLHVCQUF1QixDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsUUFBUSxDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLE1BQU0sRUFBRSxrQkFBa0IsQ0FBQyxtQkFBbUIsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLGtCQUFrQixDQUFDLFVBQVUsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUM5USxRQUFRLENBQUMsR0FBRyxDQUFDLHdCQUF3QixFQUFFLHVCQUF1QixDQUFDLENBQUM7UUFFaEUsTUFBTSwwQkFBMEIsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksb0JBQW9CLENBQ3pFLE9BQU8sQ0FBQyxJQUFJO1FBQ1osZ0VBQWdFO1FBQ2hFLGdFQUFnRTtRQUNoRSw2REFBNkQ7UUFDN0QsaUVBQWlFO1FBQ2pFLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSw0QkFBNEIsQ0FBQyxrQkFBa0IsQ0FBQyxVQUFVLENBQUMsOEJBQThCLENBQUMsRUFBRSxFQUFFLGlCQUFpQixFQUFFLE9BQU8sRUFBRSxDQUFDLENBQUMsRUFDL0ksT0FBTyxDQUFDLGNBQWMsRUFDdEIsdUJBQXVCLEVBQ3ZCLGtCQUFrQixFQUNsQixVQUFVLENBQ1YsQ0FBQyxDQUFDO1FBQ0gsV0FBVyxDQUFDLGdCQUFnQixDQUFDLE9BQU8sQ0FBQyxjQUFjLEVBQUUsMEJBQTBCLENBQUMsQ0FBQztRQUVqRixnQkFBZ0I7UUFDaEIsTUFBTSxvQkFBb0IsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksb0JBQW9CLENBQUMsdUJBQXVCLENBQUMsY0FBYyxDQUFDLGdCQUFnQixFQUFFLFdBQVcsRUFBRSxhQUFhLEVBQUUsVUFBVSxDQUFDLENBQUMsQ0FBQztRQUN2SyxRQUFRLENBQUMsR0FBRyxDQUFDLHFCQUFxQixFQUFFLG9CQUFvQixDQUFDLENBQUM7UUFFMUQsK0JBQStCO1FBQy9CLE1BQU0sY0FBYyxHQUFHLElBQUksb0JBQW9CLENBQUMsU0FBUyxFQUFFLEVBQUUsY0FBYyxFQUFFLHVCQUF1QixDQUFDLGNBQWMsRUFBRSxjQUFjLEVBQUUsdUJBQXVCLENBQUMsY0FBYyxFQUFFLEVBQUUsa0JBQWtCLEVBQUUsa0JBQWtCLENBQUMsQ0FBQztRQUN2TixRQUFRLENBQUMsR0FBRyxDQUFDLGVBQWUsRUFBRSxjQUFjLENBQUMsQ0FBQztRQUM5QyxJQUFJLENBQUMsU0FBUyxDQUFDLFlBQVksQ0FBQyxHQUFHLEVBQUUsQ0FBQyxjQUFjLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBRTNELDBDQUEwQztRQUMxQyxNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQUM7WUFDakIsb0JBQW9CLENBQUMsVUFBVSxFQUFFO1lBQ2pDLGNBQWMsQ0FBQyxVQUFVLEVBQUU7U0FDM0IsQ0FBQyxDQUFDO1FBRUgsVUFBVTtRQUNWLE1BQU0sYUFBYSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsYUFBYSxDQUFDLFlBQVksQ0FBQyxnQkFBZ0IsRUFBRSxFQUFFLElBQUksRUFBRSxRQUFRLENBQUMsVUFBVSxFQUFFLFNBQVMsQ0FBQyxFQUFFLEtBQUssRUFBRSxjQUFjLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDckosTUFBTSxjQUFjLEdBQUcsSUFBSSxjQUFjLENBQUMsb0JBQW9CLEVBQUUsa0JBQWtCLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLFVBQVUsQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDbkksUUFBUSxDQUFDLEdBQUcsQ0FBQyxlQUFlLEVBQUUsY0FBYyxDQUFDLENBQUM7UUFFOUMsV0FBVztRQUNYLFFBQVEsQ0FBQyxHQUFHLENBQUMsZ0JBQWdCLEVBQUUsSUFBSSxjQUFjLENBQUMsZUFBZSxFQUFFLFNBQVMsRUFBRSxLQUFLLENBQUMsZ0NBQWdDLENBQUMsQ0FBQyxDQUFDO1FBRXZILHNCQUFzQjtRQUN0QixRQUFRLENBQUMsR0FBRyxDQUFDLDBCQUEwQixFQUFFLElBQUksY0FBYyxDQUFDLHlCQUF5QixFQUFFLFNBQVMsRUFBRSxLQUFLLENBQUMsZ0NBQWdDLENBQUMsQ0FBQyxDQUFDO1FBRTNJLGNBQWM7UUFDZCxNQUFNLGlCQUFpQixHQUFHLElBQUksaUJBQWlCLENBQUMsQ0FBQyxDQUFDLENBQUMsb0RBQW9ELEVBQUUsa0JBQWtCLENBQXVCLENBQUM7UUFDbkosUUFBUSxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsRUFBRSxpQkFBaUIsQ0FBQyxDQUFDO1FBRXBELFdBQVc7UUFDWCxRQUFRLENBQUMsR0FBRyxDQUFDLGdCQUFnQixFQUFFLElBQUksY0FBYyxDQUFDLGVBQWUsRUFBRSxTQUFTLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQztRQUVyRiw0QkFBNEI7UUFDNUIsTUFBTSxtQkFBbUIsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksbUJBQW1CLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDO1FBQ3ZGLE1BQU0sa0JBQWtCLEdBQUcsSUFBSSxZQUFZLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxtQkFBbUIsQ0FBQyxpQkFBaUIsRUFBRSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEdBQUcsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ25ILFFBQVEsQ0FBQyxHQUFHLENBQUMsMkNBQTJDLEVBQUUsSUFBSSx1REFBdUQsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxxQ0FBcUMsRUFBRSxrQkFBa0IsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUUxTSxZQUFZO1FBQ1osSUFBSSxnQkFBbUMsQ0FBQztRQUN4QyxNQUFNLFNBQVMsR0FBeUIsRUFBRSxDQUFDO1FBQzNDLE1BQU0saUJBQWlCLEdBQUcsbUJBQW1CLENBQUMsY0FBYyxFQUFFLG9CQUFvQixDQUFDLENBQUM7UUFDcEYsSUFBSSxpQkFBaUIsQ0FBQyxjQUFjLEVBQUUsa0JBQWtCLENBQUMsRUFBRSxDQUFDO1lBQzNELE1BQU0sV0FBVyxHQUFHLElBQUksb0JBQW9CLENBQUMsRUFBRSxFQUFFLEtBQUssRUFBRSxhQUFhLEVBQUUsa0JBQWtCLEVBQUUsY0FBYyxDQUFDLENBQUM7WUFDM0csU0FBUyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQztZQUM1QixJQUFJLENBQUMsYUFBYSxDQUFDLGNBQWMsRUFBRSxrQkFBa0IsQ0FBQyxJQUFJLGNBQWMsQ0FBQyxRQUFRLEVBQUUsT0FBTyxFQUFFLENBQUM7Z0JBQzVGLE1BQU0saUJBQWlCLEdBQUcsSUFBSSxxQkFBcUIsQ0FBQyxjQUFjLEVBQUUsaUJBQWlCLEVBQUUsaUJBQWlCLEVBQUUsSUFBSSxFQUFFLGNBQWMsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUM7Z0JBQ2pKLElBQUksQ0FBQyxTQUFTLENBQUMsWUFBWSxDQUFDLEdBQUcsRUFBRSxDQUFDLGlCQUFpQixDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLHdFQUF3RTtnQkFDdkksU0FBUyxDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO1lBQ25DLENBQUM7WUFFRCxnQkFBZ0IsR0FBRyxJQUFJLGdCQUFnQixDQUFDO2dCQUN2QyxTQUFTO2dCQUNULGdCQUFnQixFQUFFLHVCQUF1QixDQUFDLE9BQU8sRUFBRSxFQUFFLFFBQVEsRUFBRSxFQUFFLE9BQU8sQ0FBQyxJQUFJLEVBQUUsY0FBYyxDQUFDLE1BQU0sRUFBRSxjQUFjLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxhQUFhLENBQUMsU0FBUyxFQUFFLElBQUksQ0FBQyxhQUFhLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxhQUFhLENBQUMsV0FBVyxFQUFFLGlCQUFpQixFQUFFLGNBQWMsQ0FBQyxJQUFJLENBQUM7Z0JBQzdQLGtCQUFrQixFQUFFLElBQUk7Z0JBQ3hCLFFBQVEsRUFBRSwwQkFBMEIsQ0FBQyxrQkFBa0IsQ0FBQzthQUN4RCxFQUFFLG9CQUFvQixFQUFFLGNBQWMsQ0FBQyxDQUFDO1FBQzFDLENBQUM7YUFBTSxDQUFDO1lBQ1AsZ0JBQWdCLEdBQUcsb0JBQW9CLENBQUM7WUFDeEMsTUFBTSxZQUFZLEdBQUcsWUFBWSxDQUFDO1lBQ2xDLFNBQVMsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUM7UUFDOUIsQ0FBQztRQUVELElBQUksQ0FBQyxNQUFNLENBQUMsZUFBZSxDQUFDLG1CQUFtQixFQUFFLElBQUksd0JBQXdCLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQztRQUMxRixRQUFRLENBQUMsR0FBRyxDQUFDLGlCQUFpQixFQUFFLGdCQUFnQixDQUFDLENBQUM7UUFFbEQsNEJBQTRCO1FBQzVCLE1BQU0sOEJBQThCLEdBQUcsSUFBSSw4QkFBOEIsQ0FBQyxvQkFBb0IsRUFBRSxnQkFBZ0IsRUFBRSxhQUFhLEVBQUUsa0JBQWtCLEVBQUUsY0FBYyxDQUFDLENBQUM7UUFDckssUUFBUSxDQUFDLEdBQUcsQ0FBQywrQkFBK0IsRUFBRSw4QkFBOEIsQ0FBQyxDQUFDO1FBRTlFLHVCQUF1QjtRQUN2QixRQUFRLENBQUMsR0FBRyxDQUFDLGdDQUFnQyxFQUFFLElBQUksY0FBYyxDQUFDLCtCQUErQixFQUFFLFNBQVMsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDO1FBQ3JILFFBQVEsQ0FBQyxHQUFHLENBQUMseUJBQXlCLEVBQUUsSUFBSSxjQUFjLENBQUMsd0JBQXdCLEVBQUUsU0FBUyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUM7UUFDdkcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxzQ0FBc0MsRUFBRSxJQUFJLGNBQWMsQ0FBQyxxQ0FBcUMsRUFBRSxTQUFTLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQztRQUNqSSxRQUFRLENBQUMsR0FBRyxDQUFDLHlCQUF5QixFQUFFLElBQUksY0FBYyxDQUFDLHdCQUF3QixFQUFFLFNBQVMsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDO1FBQ3ZHLFFBQVEsQ0FBQyxHQUFHLENBQUMsdUNBQXVDLEVBQUUsSUFBSSxjQUFjLENBQUMsMEJBQTBCLEVBQUUsU0FBUyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUM7UUFFdkgsaUJBQWlCO1FBQ2pCLFFBQVEsQ0FBQyxHQUFHLENBQUMseUJBQXlCLEVBQUUsSUFBSSxjQUFjLENBQUMsd0JBQXdCLEVBQUUsU0FBUyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUM7UUFDdkcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsRUFBRSxJQUFJLGNBQWMsQ0FBQyxpQkFBaUIsRUFBRSxTQUFTLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQztRQUN6RixRQUFRLENBQUMsR0FBRyxDQUFDLDBCQUEwQixFQUFFLElBQUksY0FBYyxDQUFDLHlCQUF5QixFQUFFLFNBQVMsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDO1FBQ3pHLFFBQVEsQ0FBQyxHQUFHLENBQUMscUJBQXFCLEVBQUUsSUFBSSxjQUFjLENBQUMsb0JBQW9CLEVBQUUsU0FBUyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUM7UUFFL0Ysb0JBQW9CO1FBQ3BCLFFBQVEsQ0FBQyxHQUFHLENBQUMsZ0NBQWdDLEVBQUUsSUFBSSxrQ0FBa0MsQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLGNBQWMsQ0FBQyxDQUFDLENBQUM7UUFDcEgsUUFBUSxDQUFDLEdBQUcsQ0FBQyx3QkFBd0IsRUFBRSxJQUFJLGNBQWMsQ0FBQyx1QkFBdUIsRUFBRSxTQUFTLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQztRQUVyRyxpQkFBaUI7UUFDakIsUUFBUSxDQUFDLEdBQUcsQ0FBQyxxQkFBcUIsRUFBRSxJQUFJLGNBQWMsQ0FBQyxvQkFBb0IsRUFBRSxTQUFTLEVBQUUsS0FBSyxDQUFDLDBEQUEwRCxDQUFDLENBQUMsQ0FBQztRQUUzSixnQkFBZ0I7UUFDaEIsUUFBUSxDQUFDLEdBQUcsQ0FBQyxvQkFBb0IsRUFBRSxJQUFJLGNBQWMsQ0FBQyx5QkFBeUIsRUFBRSxTQUFTLEVBQUUsS0FBSyxDQUFDLGdDQUFnQyxDQUFDLENBQUMsQ0FBQztRQUVySSxjQUFjO1FBQ2QsUUFBUSxDQUFDLEdBQUcsQ0FBQyxtQkFBbUIsRUFBRSxJQUFJLGNBQWMsQ0FBQyxrQkFBa0IsRUFBRSxTQUFTLEVBQUUsS0FBSyxDQUFDLGdDQUFnQyxDQUFDLENBQUMsQ0FBQztRQUU3SCxnQkFBZ0I7UUFDaEIsUUFBUSxDQUFDLEdBQUcsQ0FBQywyQkFBMkIsRUFBRSxJQUFJLGNBQWMsQ0FBQywwQkFBMEIsRUFBRSxTQUFTLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQztRQUMzRyxRQUFRLENBQUMsR0FBRyxDQUFDLHVCQUF1QixFQUFFLElBQUksY0FBYyxDQUFDLHNCQUFzQixFQUFFLFNBQVMsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDO1FBQ25HLFFBQVEsQ0FBQyxHQUFHLENBQUMsd0JBQXdCLEVBQUUsWUFBWSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxrQkFBa0IsRUFBRSxNQUFNLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxHQUFHLEtBQUssTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzVJLFFBQVEsQ0FBQyxHQUFHLENBQUMsaUNBQWlDLEVBQUUsSUFBSSxjQUFjLENBQUMsZ0NBQWdDLEVBQUUsU0FBUyxFQUFFLEtBQUssQ0FBQyx5Q0FBeUMsQ0FBQyxDQUFDLENBQUM7UUFDbEssUUFBUSxDQUFDLEdBQUcsQ0FBQyxtQ0FBbUMsRUFBRSxJQUFJLGNBQWMsQ0FBQyxrQ0FBa0MsRUFBRSxTQUFTLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQztRQUMzSCxRQUFRLENBQUMsR0FBRyxDQUFDLHdCQUF3QixFQUFFLElBQUksY0FBYyxDQUFDLHVCQUF1QixDQUFDLENBQUMsQ0FBQztRQUNwRixRQUFRLENBQUMsR0FBRyxDQUFDLG1DQUFtQyxFQUFFLElBQUksY0FBYyxDQUFDLGtDQUFrQyxFQUFFLFNBQVMsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDO1FBQzNILFFBQVEsQ0FBQyxHQUFHLENBQUMseUJBQXlCLEVBQUUsSUFBSSxjQUFjLENBQUMsd0JBQXdCLEVBQUUsU0FBUyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUM7UUFDdkcsUUFBUSxDQUFDLEdBQUcsQ0FBQyw0QkFBNEIsRUFBRSxJQUFJLGNBQWMsQ0FBQywyQkFBMkIsRUFBRSxTQUFTLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQztRQUM3RyxRQUFRLENBQUMsR0FBRyxDQUFDLDhCQUE4QixFQUFFLElBQUksY0FBYyxDQUFDLDZCQUE2QixFQUFFLFNBQVMsRUFBRSxLQUFLLENBQUMsbUNBQW1DLENBQUMsQ0FBQyxDQUFDO1FBQ3RKLFFBQVEsQ0FBQyxHQUFHLENBQUMsOEJBQThCLEVBQUUsSUFBSSxjQUFjLENBQUMsNkJBQTZCLEVBQUUsU0FBUyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUM7UUFDakgsUUFBUSxDQUFDLEdBQUcsQ0FBQyxvQkFBb0IsRUFBRSxJQUFJLGNBQWMsQ0FBQyxtQkFBbUIsRUFBRSxTQUFTLEVBQUUsS0FBSyxDQUFDLGdDQUFnQyxDQUFDLENBQUMsQ0FBQztRQUMvSCxRQUFRLENBQUMsR0FBRyxDQUFDLDhCQUE4QixFQUFFLElBQUksY0FBYyxDQUFDLDBDQUEwQyxFQUFFLFNBQVMsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDO1FBQzlILFFBQVEsQ0FBQyxHQUFHLENBQUMsb0NBQW9DLEVBQUUsSUFBSSxjQUFjLENBQUMsbUNBQW1DLEVBQUUsU0FBUyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUM7UUFFN0gsVUFBVTtRQUNWLFFBQVEsQ0FBQyxHQUFHLENBQUMsWUFBWSxFQUFFLElBQUksY0FBYyxDQUFDLFdBQVcsRUFBRSxTQUFTLEVBQUUsS0FBSyxDQUFDLGdDQUFnQyxDQUFDLENBQUMsQ0FBQztRQUUvRyxTQUFTO1FBQ1QsTUFBTSwwQkFBMEIsR0FBRyxJQUFJLDBCQUEwQixFQUFFLENBQUM7UUFDcEUsUUFBUSxDQUFDLEdBQUcsQ0FBQywyQkFBMkIsRUFBRSwwQkFBMEIsQ0FBQyxDQUFDO1FBQ3RFLDBCQUEwQixDQUFDLFFBQVEseUNBQWlDLGlCQUFpQixDQUFDLENBQUM7UUFDdkYsUUFBUSxDQUFDLEdBQUcsQ0FBQyxxQkFBcUIsRUFBRSxJQUFJLGNBQWMsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLENBQUM7UUFDOUUsUUFBUSxDQUFDLEdBQUcsQ0FBQywyQkFBMkIsRUFBRSxJQUFJLGNBQWMsQ0FBQywwQkFBMEIsQ0FBQyxDQUFDLENBQUM7UUFFMUYsZ0JBQWdCO1FBQ2hCLFFBQVEsQ0FBQyxHQUFHLENBQUMsb0JBQW9CLEVBQUUsSUFBSSxjQUFjLENBQUMsbUJBQW1CLENBQUMsQ0FBQyxDQUFDO1FBRTVFLHdCQUF3QjtRQUN4QixRQUFRLENBQUMsR0FBRyxDQUFDLGlDQUFpQyxFQUFFLElBQUksY0FBYyxDQUFDLGdDQUFnQyxDQUFDLENBQUMsQ0FBQztRQUV0RyxPQUFPLElBQUksb0JBQW9CLENBQUMsUUFBUSxDQUFDLENBQUM7SUFDM0MsQ0FBQztJQUVPLFlBQVksQ0FBQyxRQUEwQjtRQUU5Qyx3QkFBd0I7UUFDeEIsTUFBTSxPQUFPLEdBQUcsSUFBSSwwQkFBMEIsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLDJCQUEyQixDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDdEcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxlQUFlLENBQUMsWUFBWSxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBRW5ELGlCQUFpQjtRQUNqQixNQUFNLG9CQUFvQixHQUFHLElBQUksb0JBQW9CLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxxQkFBcUIsQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3ZHLElBQUksQ0FBQyxNQUFNLENBQUMsZUFBZSxDQUFDLGVBQWUsRUFBRSxvQkFBb0IsQ0FBQyxDQUFDO1FBRW5FLGlCQUFpQjtRQUNqQixNQUFNLG9CQUFvQixHQUFHLFlBQVksQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxvQkFBb0IsQ0FBQyxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUN2RyxJQUFJLENBQUMsTUFBTSxDQUFDLGVBQWUsQ0FBQyxlQUFlLEVBQUUsb0JBQW9CLENBQUMsQ0FBQztRQUVuRSxjQUFjO1FBQ2QsTUFBTSxrQkFBa0IsR0FBRyxZQUFZLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsbUJBQW1CLENBQUMsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDcEcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxlQUFlLENBQUMsYUFBYSxFQUFFLGtCQUFrQixDQUFDLENBQUM7UUFFL0QsaUJBQWlCO1FBQ2pCLE1BQU0sb0JBQW9CLEdBQUcsSUFBSSxvQkFBb0IsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLHFCQUFxQixDQUFDLENBQUMsQ0FBQztRQUMzRixJQUFJLENBQUMsTUFBTSxDQUFDLGVBQWUsQ0FBQyxzQkFBc0IsRUFBRSxvQkFBb0IsQ0FBQyxDQUFDO1FBRTFFLFdBQVc7UUFDWCxNQUFNLGVBQWUsR0FBRyxZQUFZLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsZ0JBQWdCLENBQUMsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDOUYsSUFBSSxDQUFDLE1BQU0sQ0FBQyxlQUFlLENBQUMsVUFBVSxFQUFFLGVBQWUsQ0FBQyxDQUFDO1FBRXpELFlBQVk7UUFDWixNQUFNLGdCQUFnQixHQUFHLFlBQVksQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQywwQkFBMEIsQ0FBQyxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUN6RyxJQUFJLENBQUMsTUFBTSxDQUFDLGVBQWUsQ0FBQyxvQkFBb0IsRUFBRSxnQkFBZ0IsQ0FBQyxDQUFDO1FBRXBFLGdCQUFnQjtRQUNoQixNQUFNLDBCQUEwQixHQUFHLFlBQVksQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyw0QkFBNEIsQ0FBQyxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUNySCxJQUFJLENBQUMsTUFBTSxDQUFDLGVBQWUsQ0FBQyxzQkFBc0IsRUFBRSwwQkFBMEIsQ0FBQyxDQUFDO1FBRWhGLDRCQUE0QjtRQUM1QixNQUFNLDhCQUE4QixHQUFHLFlBQVksQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQywrQkFBK0IsQ0FBQyxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUM1SCxJQUFJLENBQUMsTUFBTSxDQUFDLGVBQWUsQ0FBQyx5QkFBeUIsRUFBRSw4QkFBOEIsQ0FBQyxDQUFDO1FBRXZGLE1BQU0sMEJBQTBCLEdBQUcsSUFBSSxpQ0FBaUMsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLDJCQUEyQixDQUFDLENBQUMsQ0FBQztRQUNwSCxJQUFJLENBQUMsTUFBTSxDQUFDLGVBQWUsQ0FBQyxxQkFBcUIsRUFBRSwwQkFBMEIsQ0FBQyxDQUFDO1FBRS9FLE1BQU0sa0NBQWtDLEdBQUcsSUFBSSx5Q0FBeUMsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLG1DQUFtQyxDQUFDLENBQUMsQ0FBQztRQUM1SSxJQUFJLENBQUMsTUFBTSxDQUFDLGVBQWUsQ0FBQyw2QkFBNkIsRUFBRSxrQ0FBa0MsQ0FBQyxDQUFDO1FBRS9GLE1BQU0sbUJBQW1CLEdBQUcsSUFBSSwwQkFBMEIsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLG9CQUFvQixDQUFDLEVBQUUsUUFBUSxDQUFDLEdBQUcsQ0FBQyx3QkFBd0IsQ0FBQyxFQUFFLFFBQVEsQ0FBQyxHQUFHLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQztRQUNsSyxJQUFJLENBQUMsTUFBTSxDQUFDLGVBQWUsQ0FBQyxjQUFjLEVBQUUsbUJBQW1CLENBQUMsQ0FBQztRQUVqRSxNQUFNLGdCQUFnQixHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDLGNBQWMsQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDLENBQUM7UUFDckgsSUFBSSxDQUFDLE1BQU0sQ0FBQyxlQUFlLENBQUMsa0JBQWtCLEVBQUUsWUFBWSxDQUFDLFdBQVcsQ0FBQyxnQkFBZ0IsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztRQUV6RyxJQUFJLENBQUMsTUFBTSxDQUFDLGVBQWUsQ0FBQyxzQ0FBc0MsRUFBRSxZQUFZLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsb0NBQW9DLENBQUMsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztRQUUvSixTQUFTO1FBQ1QsTUFBTSwwQkFBMEIsR0FBRyxZQUFZLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsMkJBQTJCLENBQUMsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDcEgsSUFBSSxDQUFDLE1BQU0sQ0FBQyxlQUFlLENBQUMsaUNBQWlDLEVBQUUsMEJBQTBCLENBQUMsQ0FBQztRQUUzRixnQkFBZ0I7UUFDaEIsTUFBTSxtQkFBbUIsR0FBRyxZQUFZLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsb0JBQW9CLENBQUMsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDdEcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxlQUFlLENBQUMsY0FBYyxFQUFFLG1CQUFtQixDQUFDLENBQUM7UUFFakUsd0JBQXdCO1FBQ3hCLE1BQU0sMEJBQTBCLEdBQUcsWUFBWSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLGlDQUFpQyxDQUFDLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQzFILElBQUksQ0FBQyxNQUFNLENBQUMsZUFBZSxDQUFDLDJCQUEyQixFQUFFLDBCQUEwQixDQUFDLENBQUM7SUFDdEYsQ0FBQztJQUVPLG9CQUFvQixDQUFDLFVBQXVCO1FBRW5ELGdDQUFnQztRQUNoQyxPQUFPLENBQUMsRUFBRSxDQUFDLG1CQUFtQixFQUFFLEtBQUssQ0FBQyxFQUFFLENBQUMsaUJBQWlCLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztRQUNuRSxPQUFPLENBQUMsRUFBRSxDQUFDLG9CQUFvQixFQUFFLENBQUMsTUFBZSxFQUFFLEVBQUUsQ0FBQyxpQkFBaUIsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO1FBRWpGLHdDQUF3QztRQUN4Qyx5QkFBeUIsQ0FBQyxLQUFLLENBQUMsRUFBRTtZQUNqQyxNQUFNLE9BQU8sR0FBRyxjQUFjLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxDQUFDO1lBQzVDLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztnQkFDZCxPQUFPO1lBQ1IsQ0FBQztZQUVELFVBQVUsQ0FBQyxLQUFLLENBQUMsMENBQTBDLE9BQU8sRUFBRSxDQUFDLENBQUM7UUFDdkUsQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDO0lBRU8sS0FBSyxDQUFDLGtCQUFrQixDQUFDLGdCQUFtQyxFQUFFLFVBQXVCO1FBQzVGLElBQUksT0FBTyxFQUFFLENBQUM7WUFDYixNQUFNLENBQUMsV0FBVyxFQUFFLGVBQWUsQ0FBQyxHQUFHLE1BQU0sT0FBTyxDQUFDLEdBQUcsQ0FBQztnQkFDeEQsZ0JBQWdCLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUM7Z0JBQ25ELGtCQUFrQixDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDO2FBQ3JELENBQUMsQ0FBQztZQUNILE1BQU0sa0JBQWtCLEdBQUcscUJBQXFCLEVBQUUsQ0FBQztZQUNuRCxNQUFNLGVBQWUsR0FBRyxzQkFBc0IsQ0FBQyxlQUFlLEVBQUUsSUFBSSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDO1lBQzNHLElBQUksV0FBVyxFQUFFLENBQUM7Z0JBbUJqQixnQkFBZ0IsQ0FBQyxVQUFVLENBQTRELG9CQUFvQixFQUFFO29CQUM1RyxVQUFVLEVBQUUsV0FBVyxDQUFDLEVBQUU7b0JBQzFCLGlCQUFpQixFQUFFLFdBQVcsQ0FBQyxVQUFVO29CQUN6QyxjQUFjLEVBQUUsV0FBVyxDQUFDLE9BQU87b0JBQ25DLGtCQUFrQixFQUFFLGtCQUFrQjtvQkFDdEMsZUFBZSxFQUFFLGVBQWU7b0JBQ2hDLG1CQUFtQixFQUFFLGVBQWU7aUJBQ3BDLENBQUMsQ0FBQztZQUNKLENBQUM7UUFDRixDQUFDO0lBQ0YsQ0FBQztJQUVELHVCQUF1QixDQUFDLENBQWU7UUFFdEMscURBQXFEO1FBQ3JELG9EQUFvRDtRQUNwRCxvREFBb0Q7UUFDcEQsMEJBQTBCO1FBRTFCLElBQUksQ0FBQyxDQUFDLElBQUksS0FBSywwQkFBMEIsQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUNwRCxPQUFPLEtBQUssQ0FBQztRQUNkLENBQUM7UUFFRCxNQUFNLElBQUksR0FBRyxDQUFDLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUMzQixJQUFJLElBQUksRUFBRSxDQUFDO1lBQ1YsSUFBSSxDQUFDLHFCQUFxQixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUV0QyxPQUFPLElBQUksQ0FBQztRQUNiLENBQUM7UUFFRCxPQUFPLEtBQUssQ0FBQztJQUNkLENBQUM7Q0FDRDtBQUVELE1BQU0sQ0FBQyxLQUFLLFVBQVUsSUFBSSxDQUFDLGFBQTBDO0lBRXBFLDREQUE0RDtJQUM1RCxzREFBc0Q7SUFFdEQsSUFBSSxDQUFDO1FBQ0osTUFBTSxhQUFhLEdBQUcsSUFBSSxpQkFBaUIsQ0FBQyxhQUFhLENBQUMsQ0FBQztRQUMzRCxPQUFPLENBQUMsVUFBVSxDQUFDLFdBQVcsQ0FBQyxzQkFBc0IsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUVoRSw2REFBNkQ7UUFDN0QsTUFBTSxhQUFhLENBQUMsSUFBSSxFQUFFLENBQUM7UUFFM0IsT0FBTyxDQUFDLFVBQVUsQ0FBQyxXQUFXLENBQUMsc0JBQXNCLENBQUMsUUFBUSxDQUFDLENBQUM7SUFDakUsQ0FBQztJQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7UUFDaEIsT0FBTyxDQUFDLFVBQVUsQ0FBQyxXQUFXLENBQUMsRUFBRSxLQUFLLEVBQUUsS0FBSyxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQUMsQ0FBQztJQUM3RCxDQUFDO0FBQ0YsQ0FBQztBQUVELE1BQU0sTUFBTSxHQUFHLFVBQVUsQ0FBQyxHQUFHLEVBQUU7SUFDOUIsT0FBTyxDQUFDLFVBQVUsQ0FBQyxXQUFXLENBQUMsRUFBRSxPQUFPLEVBQUUsNkRBQTZELEVBQUUsQ0FBQyxDQUFDO0FBQzVHLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQztBQUVWLE9BQU8sQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQXdCLEVBQUUsRUFBRTtJQUMvRCxZQUFZLENBQUMsTUFBTSxDQUFDLENBQUM7SUFDckIsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFtQyxDQUFDLENBQUM7QUFDN0MsQ0FBQyxDQUFDLENBQUMifQ==