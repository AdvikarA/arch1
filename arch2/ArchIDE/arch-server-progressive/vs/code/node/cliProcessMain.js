/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as fs from 'fs';
import { hostname, release } from 'os';
import { raceTimeout } from '../../base/common/async.js';
import { toErrorMessage } from '../../base/common/errorMessage.js';
import { isSigPipeError, onUnexpectedError, setUnexpectedErrorHandler } from '../../base/common/errors.js';
import { Disposable } from '../../base/common/lifecycle.js';
import { Schemas } from '../../base/common/network.js';
import { isAbsolute, join } from '../../base/common/path.js';
import { isWindows, isMacintosh } from '../../base/common/platform.js';
import { cwd } from '../../base/common/process.js';
import { URI } from '../../base/common/uri.js';
import { IConfigurationService } from '../../platform/configuration/common/configuration.js';
import { ConfigurationService } from '../../platform/configuration/common/configurationService.js';
import { IDownloadService } from '../../platform/download/common/download.js';
import { DownloadService } from '../../platform/download/common/downloadService.js';
import { INativeEnvironmentService } from '../../platform/environment/common/environment.js';
import { NativeEnvironmentService } from '../../platform/environment/node/environmentService.js';
import { ExtensionGalleryServiceWithNoStorageService } from '../../platform/extensionManagement/common/extensionGalleryService.js';
import { IAllowedExtensionsService, IExtensionGalleryService } from '../../platform/extensionManagement/common/extensionManagement.js';
import { ExtensionSignatureVerificationService, IExtensionSignatureVerificationService } from '../../platform/extensionManagement/node/extensionSignatureVerificationService.js';
import { ExtensionManagementCLI } from '../../platform/extensionManagement/common/extensionManagementCLI.js';
import { IExtensionsProfileScannerService } from '../../platform/extensionManagement/common/extensionsProfileScannerService.js';
import { IExtensionsScannerService } from '../../platform/extensionManagement/common/extensionsScannerService.js';
import { ExtensionManagementService, INativeServerExtensionManagementService } from '../../platform/extensionManagement/node/extensionManagementService.js';
import { ExtensionsScannerService } from '../../platform/extensionManagement/node/extensionsScannerService.js';
import { IFileService } from '../../platform/files/common/files.js';
import { FileService } from '../../platform/files/common/fileService.js';
import { DiskFileSystemProvider } from '../../platform/files/node/diskFileSystemProvider.js';
import { SyncDescriptor } from '../../platform/instantiation/common/descriptors.js';
import { InstantiationService } from '../../platform/instantiation/common/instantiationService.js';
import { ServiceCollection } from '../../platform/instantiation/common/serviceCollection.js';
import { ILanguagePackService } from '../../platform/languagePacks/common/languagePacks.js';
import { NativeLanguagePackService } from '../../platform/languagePacks/node/languagePacks.js';
import { ConsoleLogger, getLogLevel, ILoggerService, ILogService, LogLevel } from '../../platform/log/common/log.js';
import { FilePolicyService } from '../../platform/policy/common/filePolicyService.js';
import { IPolicyService, NullPolicyService } from '../../platform/policy/common/policy.js';
import { NativePolicyService } from '../../platform/policy/node/nativePolicyService.js';
import product from '../../platform/product/common/product.js';
import { IProductService } from '../../platform/product/common/productService.js';
import { IRequestService } from '../../platform/request/common/request.js';
import { RequestService } from '../../platform/request/node/requestService.js';
import { StateReadonlyService } from '../../platform/state/node/stateService.js';
import { resolveCommonProperties } from '../../platform/telemetry/common/commonProperties.js';
import { ITelemetryService } from '../../platform/telemetry/common/telemetry.js';
import { TelemetryService } from '../../platform/telemetry/common/telemetryService.js';
import { supportsTelemetry, NullTelemetryService, getPiiPathsFromEnvironment, isInternalTelemetry } from '../../platform/telemetry/common/telemetryUtils.js';
import { OneDataSystemAppender } from '../../platform/telemetry/node/1dsAppender.js';
import { buildTelemetryMessage } from '../../platform/telemetry/node/telemetry.js';
import { IUriIdentityService } from '../../platform/uriIdentity/common/uriIdentity.js';
import { UriIdentityService } from '../../platform/uriIdentity/common/uriIdentityService.js';
import { IUserDataProfilesService } from '../../platform/userDataProfile/common/userDataProfile.js';
import { UserDataProfilesReadonlyService } from '../../platform/userDataProfile/node/userDataProfile.js';
import { resolveMachineId, resolveSqmId, resolvedevDeviceId } from '../../platform/telemetry/node/telemetryUtils.js';
import { ExtensionsProfileScannerService } from '../../platform/extensionManagement/node/extensionsProfileScannerService.js';
import { LogService } from '../../platform/log/common/logService.js';
import { LoggerService } from '../../platform/log/node/loggerService.js';
import { localize } from '../../nls.js';
import { FileUserDataProvider } from '../../platform/userData/common/fileUserDataProvider.js';
import { addUNCHostToAllowlist, getUNCHost } from '../../base/node/unc.js';
import { AllowedExtensionsService } from '../../platform/extensionManagement/common/allowedExtensionsService.js';
import { McpManagementCli } from '../../platform/mcp/common/mcpManagementCli.js';
import { IExtensionGalleryManifestService } from '../../platform/extensionManagement/common/extensionGalleryManifest.js';
import { ExtensionGalleryManifestService } from '../../platform/extensionManagement/common/extensionGalleryManifestService.js';
import { IAllowedMcpServersService, IMcpGalleryService, IMcpManagementService } from '../../platform/mcp/common/mcpManagement.js';
import { McpManagementService } from '../../platform/mcp/node/mcpManagementService.js';
import { IMcpResourceScannerService, McpResourceScannerService } from '../../platform/mcp/common/mcpResourceScannerService.js';
import { McpGalleryService } from '../../platform/mcp/common/mcpGalleryService.js';
import { AllowedMcpServersService } from '../../platform/mcp/common/allowedMcpServersService.js';
class CliMain extends Disposable {
    constructor(argv) {
        super();
        this.argv = argv;
        this.registerListeners();
    }
    registerListeners() {
        // Dispose on exit
        process.once('exit', () => this.dispose());
    }
    async run() {
        // Services
        const [instantiationService, appenders] = await this.initServices();
        return instantiationService.invokeFunction(async (accessor) => {
            const logService = accessor.get(ILogService);
            const fileService = accessor.get(IFileService);
            const environmentService = accessor.get(INativeEnvironmentService);
            const userDataProfilesService = accessor.get(IUserDataProfilesService);
            // Log info
            logService.info('CLI main', this.argv);
            // Error handler
            this.registerErrorHandler(logService);
            // Run based on argv
            await this.doRun(environmentService, fileService, userDataProfilesService, instantiationService);
            // Flush the remaining data in AI adapter (with 1s timeout)
            await Promise.all(appenders.map(a => {
                raceTimeout(a.flush(), 1000);
            }));
            return;
        });
    }
    async initServices() {
        const services = new ServiceCollection();
        // Product
        const productService = { _serviceBrand: undefined, ...product };
        services.set(IProductService, productService);
        // Environment
        const environmentService = new NativeEnvironmentService(this.argv, productService);
        services.set(INativeEnvironmentService, environmentService);
        // Init folders
        await Promise.all([
            this.allowWindowsUNCPath(environmentService.appSettingsHome.with({ scheme: Schemas.file }).fsPath),
            this.allowWindowsUNCPath(environmentService.extensionsPath)
        ].map(path => path ? fs.promises.mkdir(path, { recursive: true }) : undefined));
        // Logger
        const loggerService = new LoggerService(getLogLevel(environmentService), environmentService.logsHome);
        services.set(ILoggerService, loggerService);
        // Log
        const logger = this._register(loggerService.createLogger('cli', { name: localize('cli', "CLI") }));
        const otherLoggers = [];
        if (loggerService.getLogLevel() === LogLevel.Trace) {
            otherLoggers.push(new ConsoleLogger(loggerService.getLogLevel()));
        }
        const logService = this._register(new LogService(logger, otherLoggers));
        services.set(ILogService, logService);
        // Files
        const fileService = this._register(new FileService(logService));
        services.set(IFileService, fileService);
        const diskFileSystemProvider = this._register(new DiskFileSystemProvider(logService));
        fileService.registerProvider(Schemas.file, diskFileSystemProvider);
        // Uri Identity
        const uriIdentityService = new UriIdentityService(fileService);
        services.set(IUriIdentityService, uriIdentityService);
        // User Data Profiles
        const stateService = new StateReadonlyService(1 /* SaveStrategy.DELAYED */, environmentService, logService, fileService);
        const userDataProfilesService = new UserDataProfilesReadonlyService(stateService, uriIdentityService, environmentService, fileService, logService);
        services.set(IUserDataProfilesService, userDataProfilesService);
        // Use FileUserDataProvider for user data to
        // enable atomic read / write operations.
        fileService.registerProvider(Schemas.vscodeUserData, new FileUserDataProvider(Schemas.file, diskFileSystemProvider, Schemas.vscodeUserData, userDataProfilesService, uriIdentityService, logService));
        // Policy
        let policyService;
        if (isWindows && productService.win32RegValueName) {
            policyService = this._register(new NativePolicyService(logService, productService.win32RegValueName));
        }
        else if (isMacintosh && productService.darwinBundleIdentifier) {
            policyService = this._register(new NativePolicyService(logService, productService.darwinBundleIdentifier));
        }
        else if (environmentService.policyFile) {
            policyService = this._register(new FilePolicyService(environmentService.policyFile, fileService, logService));
        }
        else {
            policyService = new NullPolicyService();
        }
        services.set(IPolicyService, policyService);
        // Configuration
        const configurationService = this._register(new ConfigurationService(userDataProfilesService.defaultProfile.settingsResource, fileService, policyService, logService));
        services.set(IConfigurationService, configurationService);
        // Initialize
        await Promise.all([
            stateService.init(),
            configurationService.initialize()
        ]);
        // Get machine ID
        let machineId = undefined;
        try {
            machineId = await resolveMachineId(stateService, logService);
        }
        catch (error) {
            if (error.code !== 'ENOENT') {
                logService.error(error);
            }
        }
        const sqmId = await resolveSqmId(stateService, logService);
        const devDeviceId = await resolvedevDeviceId(stateService, logService);
        // Initialize user data profiles after initializing the state
        userDataProfilesService.init();
        // URI Identity
        services.set(IUriIdentityService, new UriIdentityService(fileService));
        // Request
        const requestService = new RequestService('local', configurationService, environmentService, logService);
        services.set(IRequestService, requestService);
        // Download Service
        services.set(IDownloadService, new SyncDescriptor(DownloadService, undefined, true));
        // Extensions
        services.set(IExtensionsProfileScannerService, new SyncDescriptor(ExtensionsProfileScannerService, undefined, true));
        services.set(IExtensionsScannerService, new SyncDescriptor(ExtensionsScannerService, undefined, true));
        services.set(IExtensionSignatureVerificationService, new SyncDescriptor(ExtensionSignatureVerificationService, undefined, true));
        services.set(IAllowedExtensionsService, new SyncDescriptor(AllowedExtensionsService, undefined, true));
        services.set(INativeServerExtensionManagementService, new SyncDescriptor(ExtensionManagementService, undefined, true));
        services.set(IExtensionGalleryManifestService, new SyncDescriptor(ExtensionGalleryManifestService));
        services.set(IExtensionGalleryService, new SyncDescriptor(ExtensionGalleryServiceWithNoStorageService, undefined, true));
        // Localizations
        services.set(ILanguagePackService, new SyncDescriptor(NativeLanguagePackService, undefined, false));
        // MCP
        services.set(IAllowedMcpServersService, new SyncDescriptor(AllowedMcpServersService, undefined, true));
        services.set(IMcpResourceScannerService, new SyncDescriptor(McpResourceScannerService, undefined, true));
        services.set(IMcpGalleryService, new SyncDescriptor(McpGalleryService, undefined, true));
        services.set(IMcpManagementService, new SyncDescriptor(McpManagementService, undefined, true));
        // Telemetry
        const appenders = [];
        const isInternal = isInternalTelemetry(productService, configurationService);
        if (supportsTelemetry(productService, environmentService)) {
            if (productService.aiConfig && productService.aiConfig.ariaKey) {
                appenders.push(new OneDataSystemAppender(requestService, isInternal, 'monacoworkbench', null, productService.aiConfig.ariaKey));
            }
            const config = {
                appenders,
                sendErrorTelemetry: false,
                commonProperties: resolveCommonProperties(release(), hostname(), process.arch, productService.commit, productService.version, machineId, sqmId, devDeviceId, isInternal, productService.date),
                piiPaths: getPiiPathsFromEnvironment(environmentService)
            };
            services.set(ITelemetryService, new SyncDescriptor(TelemetryService, [config], false));
        }
        else {
            services.set(ITelemetryService, NullTelemetryService);
        }
        return [new InstantiationService(services), appenders];
    }
    allowWindowsUNCPath(path) {
        if (isWindows) {
            const host = getUNCHost(path);
            if (host) {
                addUNCHostToAllowlist(host);
            }
        }
        return path;
    }
    registerErrorHandler(logService) {
        // Install handler for unexpected errors
        setUnexpectedErrorHandler(error => {
            const message = toErrorMessage(error, true);
            if (!message) {
                return;
            }
            logService.error(`[uncaught exception in CLI]: ${message}`);
        });
        // Handle unhandled errors that can occur
        process.on('uncaughtException', err => {
            if (!isSigPipeError(err)) {
                onUnexpectedError(err);
            }
        });
        process.on('unhandledRejection', (reason) => onUnexpectedError(reason));
    }
    async doRun(environmentService, fileService, userDataProfilesService, instantiationService) {
        let profile = undefined;
        if (environmentService.args.profile) {
            profile = userDataProfilesService.profiles.find(p => p.name === environmentService.args.profile);
            if (!profile) {
                throw new Error(`Profile '${environmentService.args.profile}' not found.`);
            }
        }
        const profileLocation = (profile ?? userDataProfilesService.defaultProfile).extensionsResource;
        // List Extensions
        if (this.argv['list-extensions']) {
            return instantiationService.createInstance(ExtensionManagementCLI, new ConsoleLogger(LogLevel.Info, false)).listExtensions(!!this.argv['show-versions'], this.argv['category'], profileLocation);
        }
        // Install Extension
        else if (this.argv['install-extension'] || this.argv['install-builtin-extension']) {
            const installOptions = { isMachineScoped: !!this.argv['do-not-sync'], installPreReleaseVersion: !!this.argv['pre-release'], donotIncludePackAndDependencies: !!this.argv['do-not-include-pack-dependencies'], profileLocation };
            return instantiationService.createInstance(ExtensionManagementCLI, new ConsoleLogger(LogLevel.Info, false)).installExtensions(this.asExtensionIdOrVSIX(this.argv['install-extension'] || []), this.asExtensionIdOrVSIX(this.argv['install-builtin-extension'] || []), installOptions, !!this.argv['force']);
        }
        // Uninstall Extension
        else if (this.argv['uninstall-extension']) {
            return instantiationService.createInstance(ExtensionManagementCLI, new ConsoleLogger(LogLevel.Info, false)).uninstallExtensions(this.asExtensionIdOrVSIX(this.argv['uninstall-extension']), !!this.argv['force'], profileLocation);
        }
        else if (this.argv['update-extensions']) {
            return instantiationService.createInstance(ExtensionManagementCLI, new ConsoleLogger(LogLevel.Info, false)).updateExtensions(profileLocation);
        }
        // Locate Extension
        else if (this.argv['locate-extension']) {
            return instantiationService.createInstance(ExtensionManagementCLI, new ConsoleLogger(LogLevel.Info, false)).locateExtension(this.argv['locate-extension']);
        }
        // Install MCP server
        else if (this.argv['add-mcp']) {
            return instantiationService.createInstance(McpManagementCli, new ConsoleLogger(LogLevel.Info, false)).addMcpDefinitions(this.argv['add-mcp']);
        }
        // Telemetry
        else if (this.argv['telemetry']) {
            console.log(await buildTelemetryMessage(environmentService.appRoot, environmentService.extensionsPath));
        }
    }
    asExtensionIdOrVSIX(inputs) {
        return inputs.map(input => /\.vsix$/i.test(input) ? URI.file(isAbsolute(input) ? input : join(cwd(), input)) : input);
    }
}
export async function main(argv) {
    const cliMain = new CliMain(argv);
    try {
        await cliMain.run();
    }
    finally {
        cliMain.dispose();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpUHJvY2Vzc01haW4uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9hZHZpa2FyL0RvY3VtZW50cy9hcmNoaXRlY3QvYXJjaDIvQXJjaElERS9zcmMvIiwic291cmNlcyI6WyJ2cy9jb2RlL25vZGUvY2xpUHJvY2Vzc01haW4udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLEVBQUUsTUFBTSxJQUFJLENBQUM7QUFDekIsT0FBTyxFQUFFLFFBQVEsRUFBRSxPQUFPLEVBQUUsTUFBTSxJQUFJLENBQUM7QUFDdkMsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLDRCQUE0QixDQUFDO0FBQ3pELE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUNuRSxPQUFPLEVBQUUsY0FBYyxFQUFFLGlCQUFpQixFQUFFLHlCQUF5QixFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFDM0csT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQzVELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUN2RCxPQUFPLEVBQUUsVUFBVSxFQUFFLElBQUksRUFBRSxNQUFNLDJCQUEyQixDQUFDO0FBQzdELE9BQU8sRUFBRSxTQUFTLEVBQUUsV0FBVyxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDdkUsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBQ25ELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQUMvQyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUM3RixPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSw2REFBNkQsQ0FBQztBQUNuRyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUM5RSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFFcEYs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