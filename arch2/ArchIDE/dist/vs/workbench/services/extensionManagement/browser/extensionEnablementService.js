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
import { localize } from '../../../../nls.js';
import { Event, Emitter } from '../../../../base/common/event.js';
import { Disposable, toDisposable } from '../../../../base/common/lifecycle.js';
import { IExtensionManagementService, IGlobalExtensionEnablementService, ENABLED_EXTENSIONS_STORAGE_PATH, DISABLED_EXTENSIONS_STORAGE_PATH, IAllowedExtensionsService } from '../../../../platform/extensionManagement/common/extensionManagement.js';
import { IWorkbenchExtensionEnablementService, IExtensionManagementServerService, IWorkbenchExtensionManagementService } from '../common/extensionManagement.js';
import { areSameExtensions, BetterMergeId, getExtensionDependencies, isMalicious } from '../../../../platform/extensionManagement/common/extensionManagementUtil.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { IWorkbenchEnvironmentService } from '../../environment/common/environmentService.js';
import { isAuthenticationProviderExtension, isLanguagePackExtension, isResolverExtension } from '../../../../platform/extensions/common/extensions.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { StorageManager } from '../../../../platform/extensionManagement/common/extensionEnablementService.js';
import { webWorkerExtHostConfig } from '../../extensions/common/extensions.js';
import { IUserDataSyncAccountService } from '../../../../platform/userDataSync/common/userDataSyncAccount.js';
import { IUserDataSyncEnablementService } from '../../../../platform/userDataSync/common/userDataSync.js';
import { ILifecycleService } from '../../lifecycle/common/lifecycle.js';
import { INotificationService, NotificationPriority, Severity } from '../../../../platform/notification/common/notification.js';
import { IHostService } from '../../host/browser/host.js';
import { IExtensionBisectService } from './extensionBisect.js';
import { IWorkspaceTrustManagementService, IWorkspaceTrustRequestService } from '../../../../platform/workspace/common/workspaceTrust.js';
import { IExtensionManifestPropertiesService } from '../../extensions/common/extensionManifestPropertiesService.js';
import { isVirtualWorkspace } from '../../../../platform/workspace/common/virtualWorkspace.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { equals } from '../../../../base/common/arrays.js';
import { isString } from '../../../../base/common/types.js';
import { Delayer } from '../../../../base/common/async.js';
const SOURCE = 'IWorkbenchExtensionEnablementService';
let ExtensionEnablementService = class ExtensionEnablementService extends Disposable {
    constructor(storageService, globalExtensionEnablementService, contextService, environmentService, extensionManagementService, configurationService, extensionManagementServerService, userDataSyncEnablementService, userDataSyncAccountService, lifecycleService, notificationService, hostService, extensionBisectService, allowedExtensionsService, workspaceTrustManagementService, workspaceTrustRequestService, extensionManifestPropertiesService, instantiationService, logService) {
        super();
        this.storageService = storageService;
        this.globalExtensionEnablementService = globalExtensionEnablementService;
        this.contextService = contextService;
        this.environmentService = environmentService;
        this.extensionManagementService = extensionManagementService;
        this.configurationService = configurationService;
        this.extensionManagementServerService = extensionManagementServerService;
        this.userDataSyncEnablementService = userDataSyncEnablementService;
        this.userDataSyncAccountService = userDataSyncAccountService;
        this.lifecycleService = lifecycleService;
        this.notificationService = notificationService;
        this.extensionBisectService = extensionBisectService;
        this.allowedExtensionsService = allowedExtensionsService;
        this.workspaceTrustManagementService = workspaceTrustManagementService;
        this.workspaceTrustRequestService = workspaceTrustRequestService;
        this.extensionManifestPropertiesService = extensionManifestPropertiesService;
        this.logService = logService;
        this._onEnablementChanged = new Emitter();
        this.onEnablementChanged = this._onEnablementChanged.event;
        this.extensionsDisabledExtensions = [];
        this.delayer = this._register(new Delayer(0));
        this.storageManager = this._register(new StorageManager(storageService));
        const uninstallDisposable = this._register(Event.filter(extensionManagementService.onDidUninstallExtension, e => !e.error)(({ identifier }) => this._reset(identifier)));
        let isDisposed = false;
        this._register(toDisposable(() => isDisposed = true));
        this.extensionsManager = this._register(instantiationService.createInstance(ExtensionsManager));
        this.extensionsManager.whenInitialized().then(() => {
            if (!isDisposed) {
                uninstallDisposable.dispose();
                this._onDidChangeExtensions([], [], false);
                this._register(this.extensionsManager.onDidChangeExtensions(({ added, removed, isProfileSwitch }) => this._onDidChangeExtensions(added, removed, isProfileSwitch)));
                this.loopCheckForMaliciousExtensions();
            }
        });
        this._register(this.globalExtensionEnablementService.onDidChangeEnablement(({ extensions, source }) => this._onDidChangeGloballyDisabledExtensions(extensions, source)));
        this._register(allowedExtensionsService.onDidChangeAllowedExtensionsConfigValue(() => this._onDidChangeExtensions([], [], false)));
        // delay notification for extensions disabled until workbench restored
        if (this.allUserExtensionsDisabled) {
            this.lifecycleService.when(4 /* LifecyclePhase.Eventually */).then(() => {
                this.notificationService.prompt(Severity.Info, localize('extensionsDisabled', "All installed extensions are temporarily disabled."), [{
                        label: localize('Reload', "Reload and Enable Extensions"),
                        run: () => hostService.reload({ disableExtensions: false })
                    }], {
                    sticky: true,
                    priority: NotificationPriority.URGENT
                });
            });
        }
    }
    get hasWorkspace() {
        return this.contextService.getWorkbenchState() !== 1 /* WorkbenchState.EMPTY */;
    }
    get allUserExtensionsDisabled() {
        return this.environmentService.disableExtensions === true;
    }
    getEnablementState(extension) {
        return this._computeEnablementState(extension, this.extensionsManager.extensions, this.getWorkspaceType());
    }
    getEnablementStates(extensions, workspaceTypeOverrides = {}) {
        const extensionsEnablements = new Map();
        const workspaceType = { ...this.getWorkspaceType(), ...workspaceTypeOverrides };
        return extensions.map(extension => this._computeEnablementState(extension, extensions, workspaceType, extensionsEnablements));
    }
    getDependenciesEnablementStates(extension) {
        return getExtensionDependencies(this.extensionsManager.extensions, extension).map(e => [e, this.getEnablementState(e)]);
    }
    canChangeEnablement(extension) {
        try {
            this.throwErrorIfCannotChangeEnablement(extension);
            return true;
        }
        catch (error) {
            return false;
        }
    }
    canChangeWorkspaceEnablement(extension) {
        if (!this.canChangeEnablement(extension)) {
            return false;
        }
        try {
            this.throwErrorIfCannotChangeWorkspaceEnablement(extension);
            return true;
        }
        catch (error) {
            return false;
        }
    }
    throwErrorIfCannotChangeEnablement(extension, donotCheckDependencies) {
        if (isLanguagePackExtension(extension.manifest)) {
            throw new Error(localize('cannot disable language pack extension', "Cannot change enablement of {0} extension because it contributes language packs.", extension.manifest.displayName || extension.identifier.id));
        }
        if (this.userDataSyncEnablementService.isEnabled() && this.userDataSyncAccountService.account &&
            isAuthenticationProviderExtension(extension.manifest) && extension.manifest.contributes.authentication.some(a => a.id === this.userDataSyncAccountService.account.authenticationProviderId)) {
            throw new Error(localize('cannot disable auth extension', "Cannot change enablement {0} extension because Settings Sync depends on it.", extension.manifest.displayName || extension.identifier.id));
        }
        if (this._isEnabledInEnv(extension)) {
            throw new Error(localize('cannot change enablement environment', "Cannot change enablement of {0} extension because it is enabled in environment", extension.manifest.displayName || extension.identifier.id));
        }
        this.throwErrorIfEnablementStateCannotBeChanged(extension, this.getEnablementState(extension), donotCheckDependencies);
    }
    throwErrorIfEnablementStateCannotBeChanged(extension, enablementStateOfExtension, donotCheckDependencies) {
        switch (enablementStateOfExtension) {
            case 2 /* EnablementState.DisabledByEnvironment */:
                throw new Error(localize('cannot change disablement environment', "Cannot change enablement of {0} extension because it is disabled in environment", extension.manifest.displayName || extension.identifier.id));
            case 4 /* EnablementState.DisabledByMalicious */:
                throw new Error(localize('cannot change enablement malicious', "Cannot change enablement of {0} extension because it is malicious", extension.manifest.displayName || extension.identifier.id));
            case 5 /* EnablementState.DisabledByVirtualWorkspace */:
                throw new Error(localize('cannot change enablement virtual workspace', "Cannot change enablement of {0} extension because it does not support virtual workspaces", extension.manifest.displayName || extension.identifier.id));
            case 1 /* EnablementState.DisabledByExtensionKind */:
                throw new Error(localize('cannot change enablement extension kind', "Cannot change enablement of {0} extension because of its extension kind", extension.manifest.displayName || extension.identifier.id));
            case 7 /* EnablementState.DisabledByAllowlist */:
                throw new Error(localize('cannot change disallowed extension enablement', "Cannot change enablement of {0} extension because it is disallowed", extension.manifest.displayName || extension.identifier.id));
            case 6 /* EnablementState.DisabledByInvalidExtension */:
                throw new Error(localize('cannot change invalid extension enablement', "Cannot change enablement of {0} extension because of it is invalid", extension.manifest.displayName || extension.identifier.id));
            case 8 /* EnablementState.DisabledByExtensionDependency */:
                if (donotCheckDependencies) {
                    break;
                }
                // Can be changed only when all its dependencies enablements can be changed
                for (const dependency of getExtensionDependencies(this.extensionsManager.extensions, extension)) {
                    if (this.isEnabled(dependency)) {
                        continue;
                    }
                    throw new Error(localize('cannot change enablement dependency', "Cannot enable '{0}' extension because it depends on '{1}' extension that cannot be enabled", extension.manifest.displayName || extension.identifier.id, dependency.manifest.displayName || dependency.identifier.id));
                }
        }
    }
    throwErrorIfCannotChangeWorkspaceEnablement(extension) {
        if (!this.hasWorkspace) {
            throw new Error(localize('noWorkspace', "No workspace."));
        }
        if (isAuthenticationProviderExtension(extension.manifest)) {
            throw new Error(localize('cannot disable auth extension in workspace', "Cannot change enablement of {0} extension in workspace because it contributes authentication providers", extension.manifest.displayName || extension.identifier.id));
        }
    }
    async setEnablement(extensions, newState) {
        await this.extensionsManager.whenInitialized();
        if (newState === 11 /* EnablementState.EnabledGlobally */ || newState === 12 /* EnablementState.EnabledWorkspace */) {
            extensions.push(...this.getExtensionsToEnableRecursively(extensions, this.extensionsManager.extensions, newState, { dependencies: true, pack: true }));
        }
        const workspace = newState === 10 /* EnablementState.DisabledWorkspace */ || newState === 12 /* EnablementState.EnabledWorkspace */;
        for (const extension of extensions) {
            if (workspace) {
                this.throwErrorIfCannotChangeWorkspaceEnablement(extension);
            }
            else {
                this.throwErrorIfCannotChangeEnablement(extension);
            }
        }
        const result = [];
        for (const extension of extensions) {
            const enablementState = this.getEnablementState(extension);
            if (enablementState === 0 /* EnablementState.DisabledByTrustRequirement */
                /* All its disabled dependencies are disabled by Trust Requirement */
                || (enablementState === 8 /* EnablementState.DisabledByExtensionDependency */ && this.getDependenciesEnablementStates(extension).every(([, e]) => this.isEnabledEnablementState(e) || e === 0 /* EnablementState.DisabledByTrustRequirement */))) {
                const trustState = await this.workspaceTrustRequestService.requestWorkspaceTrust();
                result.push(trustState ?? false);
            }
            else {
                result.push(await this._setUserEnablementState(extension, newState));
            }
        }
        const changedExtensions = extensions.filter((e, index) => result[index]);
        if (changedExtensions.length) {
            this._onEnablementChanged.fire(changedExtensions);
        }
        return result;
    }
    getExtensionsToEnableRecursively(extensions, allExtensions, enablementState, options, checked = []) {
        if (!options.dependencies && !options.pack) {
            return [];
        }
        const toCheck = extensions.filter(e => checked.indexOf(e) === -1);
        if (!toCheck.length) {
            return [];
        }
        for (const extension of toCheck) {
            checked.push(extension);
        }
        const extensionsToEnable = [];
        for (const extension of allExtensions) {
            // Extension is already checked
            if (checked.some(e => areSameExtensions(e.identifier, extension.identifier))) {
                continue;
            }
            const enablementStateOfExtension = this.getEnablementState(extension);
            // Extension is enabled
            if (this.isEnabledEnablementState(enablementStateOfExtension)) {
                continue;
            }
            // Skip if dependency extension is disabled by extension kind
            if (enablementStateOfExtension === 1 /* EnablementState.DisabledByExtensionKind */) {
                continue;
            }
            // Check if the extension is a dependency or in extension pack
            if (extensions.some(e => (options.dependencies && e.manifest.extensionDependencies?.some(id => areSameExtensions({ id }, extension.identifier)))
                || (options.pack && e.manifest.extensionPack?.some(id => areSameExtensions({ id }, extension.identifier))))) {
                const index = extensionsToEnable.findIndex(e => areSameExtensions(e.identifier, extension.identifier));
                // Extension is not added to the disablement list so add it
                if (index === -1) {
                    extensionsToEnable.push(extension);
                }
                // Extension is there already in the disablement list.
                else {
                    try {
                        // Replace only if the enablement state can be changed
                        this.throwErrorIfEnablementStateCannotBeChanged(extension, enablementStateOfExtension, true);
                        extensionsToEnable.splice(index, 1, extension);
                    }
                    catch (error) { /*Do not add*/ }
                }
            }
        }
        if (extensionsToEnable.length) {
            extensionsToEnable.push(...this.getExtensionsToEnableRecursively(extensionsToEnable, allExtensions, enablementState, options, checked));
        }
        return extensionsToEnable;
    }
    _setUserEnablementState(extension, newState) {
        const currentState = this._getUserEnablementState(extension.identifier);
        if (currentState === newState) {
            return Promise.resolve(false);
        }
        switch (newState) {
            case 11 /* EnablementState.EnabledGlobally */:
                this._enableExtension(extension.identifier);
                break;
            case 9 /* EnablementState.DisabledGlobally */:
                this._disableExtension(extension.identifier);
                break;
            case 12 /* EnablementState.EnabledWorkspace */:
                this._enableExtensionInWorkspace(extension.identifier);
                break;
            case 10 /* EnablementState.DisabledWorkspace */:
                this._disableExtensionInWorkspace(extension.identifier);
                break;
        }
        return Promise.resolve(true);
    }
    isEnabled(extension) {
        const enablementState = this.getEnablementState(extension);
        return this.isEnabledEnablementState(enablementState);
    }
    isEnabledEnablementState(enablementState) {
        return enablementState === 3 /* EnablementState.EnabledByEnvironment */ || enablementState === 12 /* EnablementState.EnabledWorkspace */ || enablementState === 11 /* EnablementState.EnabledGlobally */;
    }
    isDisabledGlobally(extension) {
        return this._isDisabledGlobally(extension.identifier);
    }
    _computeEnablementState(extension, extensions, workspaceType, computedEnablementStates) {
        computedEnablementStates = computedEnablementStates ?? new Map();
        let enablementState = computedEnablementStates.get(extension);
        if (enablementState !== undefined) {
            return enablementState;
        }
        enablementState = this._getUserEnablementState(extension.identifier);
        const isEnabled = this.isEnabledEnablementState(enablementState);
        if (isMalicious(extension.identifier, this.getMaliciousExtensions().map(e => ({ extensionOrPublisher: e })))) {
            enablementState = 4 /* EnablementState.DisabledByMalicious */;
        }
        else if (isEnabled && extension.type === 1 /* ExtensionType.User */ && this.allowedExtensionsService.isAllowed(extension) !== true) {
            enablementState = 7 /* EnablementState.DisabledByAllowlist */;
        }
        else if (isEnabled && !extension.isValid) {
            enablementState = 6 /* EnablementState.DisabledByInvalidExtension */;
        }
        else if (this.extensionBisectService.isDisabledByBisect(extension)) {
            enablementState = 2 /* EnablementState.DisabledByEnvironment */;
        }
        else if (this._isDisabledInEnv(extension)) {
            enablementState = 2 /* EnablementState.DisabledByEnvironment */;
        }
        else if (this._isDisabledByVirtualWorkspace(extension, workspaceType)) {
            enablementState = 5 /* EnablementState.DisabledByVirtualWorkspace */;
        }
        else if (isEnabled && this._isDisabledByWorkspaceTrust(extension, workspaceType)) {
            enablementState = 0 /* EnablementState.DisabledByTrustRequirement */;
        }
        else if (this._isDisabledByExtensionKind(extension)) {
            enablementState = 1 /* EnablementState.DisabledByExtensionKind */;
        }
        else if (isEnabled && this._isDisabledByExtensionDependency(extension, extensions, workspaceType, computedEnablementStates)) {
            enablementState = 8 /* EnablementState.DisabledByExtensionDependency */;
        }
        else if (!isEnabled && this._isEnabledInEnv(extension)) {
            enablementState = 3 /* EnablementState.EnabledByEnvironment */;
        }
        computedEnablementStates.set(extension, enablementState);
        return enablementState;
    }
    _isDisabledInEnv(extension) {
        if (this.allUserExtensionsDisabled) {
            return !extension.isBuiltin && !isResolverExtension(extension.manifest, this.environmentService.remoteAuthority);
        }
        const disabledExtensions = this.environmentService.disableExtensions;
        if (Array.isArray(disabledExtensions)) {
            return disabledExtensions.some(id => areSameExtensions({ id }, extension.identifier));
        }
        // Check if this is the better merge extension which was migrated to a built-in extension
        if (areSameExtensions({ id: BetterMergeId.value }, extension.identifier)) {
            return true;
        }
        return false;
    }
    _isEnabledInEnv(extension) {
        const enabledExtensions = this.environmentService.enableExtensions;
        if (Array.isArray(enabledExtensions)) {
            return enabledExtensions.some(id => areSameExtensions({ id }, extension.identifier));
        }
        return false;
    }
    _isDisabledByVirtualWorkspace(extension, workspaceType) {
        // Not a virtual workspace
        if (!workspaceType.virtual) {
            return false;
        }
        // Supports virtual workspace
        if (this.extensionManifestPropertiesService.getExtensionVirtualWorkspaceSupportType(extension.manifest) !== false) {
            return false;
        }
        // Web extension from web extension management server
        if (this.extensionManagementServerService.getExtensionManagementServer(extension) === this.extensionManagementServerService.webExtensionManagementServer && this.extensionManifestPropertiesService.canExecuteOnWeb(extension.manifest)) {
            return false;
        }
        return true;
    }
    _isDisabledByExtensionKind(extension) {
        if (this.extensionManagementServerService.remoteExtensionManagementServer || this.extensionManagementServerService.webExtensionManagementServer) {
            const installLocation = this.extensionManagementServerService.getExtensionInstallLocation(extension);
            for (const extensionKind of this.extensionManifestPropertiesService.getExtensionKind(extension.manifest)) {
                if (extensionKind === 'ui') {
                    if (installLocation === 1 /* ExtensionInstallLocation.Local */) {
                        return false;
                    }
                }
                if (extensionKind === 'workspace') {
                    if (installLocation === 2 /* ExtensionInstallLocation.Remote */) {
                        return false;
                    }
                }
                if (extensionKind === 'web') {
                    if (this.extensionManagementServerService.webExtensionManagementServer /* web */) {
                        if (installLocation === 3 /* ExtensionInstallLocation.Web */ || installLocation === 2 /* ExtensionInstallLocation.Remote */) {
                            return false;
                        }
                    }
                    else if (installLocation === 1 /* ExtensionInstallLocation.Local */) {
                        const enableLocalWebWorker = this.configurationService.getValue(webWorkerExtHostConfig);
                        if (enableLocalWebWorker === true || enableLocalWebWorker === 'auto') {
                            // Web extensions are enabled on all configurations
                            return false;
                        }
                    }
                }
            }
            return true;
        }
        return false;
    }
    _isDisabledByWorkspaceTrust(extension, workspaceType) {
        if (workspaceType.trusted) {
            return false;
        }
        if (this.contextService.isInsideWorkspace(extension.location)) {
            return true;
        }
        return this.extensionManifestPropertiesService.getExtensionUntrustedWorkspaceSupportType(extension.manifest) === false;
    }
    _isDisabledByExtensionDependency(extension, extensions, workspaceType, computedEnablementStates) {
        if (!extension.manifest.extensionDependencies) {
            return false;
        }
        // Find dependency that is from the same server or does not exports any API
        const dependencyExtensions = extensions.filter(e => extension.manifest.extensionDependencies?.some(id => areSameExtensions(e.identifier, { id })
            && (this.extensionManagementServerService.getExtensionManagementServer(e) === this.extensionManagementServerService.getExtensionManagementServer(extension) || ((e.manifest.main || e.manifest.browser) && e.manifest.api === 'none'))));
        if (!dependencyExtensions.length) {
            return false;
        }
        const hasEnablementState = computedEnablementStates.has(extension);
        if (!hasEnablementState) {
            // Placeholder to handle cyclic deps
            computedEnablementStates.set(extension, 11 /* EnablementState.EnabledGlobally */);
        }
        try {
            for (const dependencyExtension of dependencyExtensions) {
                const enablementState = this._computeEnablementState(dependencyExtension, extensions, workspaceType, computedEnablementStates);
                if (!this.isEnabledEnablementState(enablementState) && enablementState !== 1 /* EnablementState.DisabledByExtensionKind */) {
                    return true;
                }
            }
        }
        finally {
            if (!hasEnablementState) {
                // remove the placeholder
                computedEnablementStates.delete(extension);
            }
        }
        return false;
    }
    _getUserEnablementState(identifier) {
        if (this.hasWorkspace) {
            if (this._getWorkspaceEnabledExtensions().filter(e => areSameExtensions(e, identifier))[0]) {
                return 12 /* EnablementState.EnabledWorkspace */;
            }
            if (this._getWorkspaceDisabledExtensions().filter(e => areSameExtensions(e, identifier))[0]) {
                return 10 /* EnablementState.DisabledWorkspace */;
            }
        }
        if (this._isDisabledGlobally(identifier)) {
            return 9 /* EnablementState.DisabledGlobally */;
        }
        return 11 /* EnablementState.EnabledGlobally */;
    }
    _isDisabledGlobally(identifier) {
        return this.globalExtensionEnablementService.getDisabledExtensions().some(e => areSameExtensions(e, identifier));
    }
    _enableExtension(identifier) {
        this._removeFromWorkspaceDisabledExtensions(identifier);
        this._removeFromWorkspaceEnabledExtensions(identifier);
        return this.globalExtensionEnablementService.enableExtension(identifier, SOURCE);
    }
    _disableExtension(identifier) {
        this._removeFromWorkspaceDisabledExtensions(identifier);
        this._removeFromWorkspaceEnabledExtensions(identifier);
        return this.globalExtensionEnablementService.disableExtension(identifier, SOURCE);
    }
    _enableExtensionInWorkspace(identifier) {
        this._removeFromWorkspaceDisabledExtensions(identifier);
        this._addToWorkspaceEnabledExtensions(identifier);
    }
    _disableExtensionInWorkspace(identifier) {
        this._addToWorkspaceDisabledExtensions(identifier);
        this._removeFromWorkspaceEnabledExtensions(identifier);
    }
    _addToWorkspaceDisabledExtensions(identifier) {
        if (!this.hasWorkspace) {
            return Promise.resolve(false);
        }
        const disabledExtensions = this._getWorkspaceDisabledExtensions();
        if (disabledExtensions.every(e => !areSameExtensions(e, identifier))) {
            disabledExtensions.push(identifier);
            this._setDisabledExtensions(disabledExtensions);
            return Promise.resolve(true);
        }
        return Promise.resolve(false);
    }
    async _removeFromWorkspaceDisabledExtensions(identifier) {
        if (!this.hasWorkspace) {
            return false;
        }
        const disabledExtensions = this._getWorkspaceDisabledExtensions();
        for (let index = 0; index < disabledExtensions.length; index++) {
            const disabledExtension = disabledExtensions[index];
            if (areSameExtensions(disabledExtension, identifier)) {
                disabledExtensions.splice(index, 1);
                this._setDisabledExtensions(disabledExtensions);
                return true;
            }
        }
        return false;
    }
    _addToWorkspaceEnabledExtensions(identifier) {
        if (!this.hasWorkspace) {
            return false;
        }
        const enabledExtensions = this._getWorkspaceEnabledExtensions();
        if (enabledExtensions.every(e => !areSameExtensions(e, identifier))) {
            enabledExtensions.push(identifier);
            this._setEnabledExtensions(enabledExtensions);
            return true;
        }
        return false;
    }
    _removeFromWorkspaceEnabledExtensions(identifier) {
        if (!this.hasWorkspace) {
            return false;
        }
        const enabledExtensions = this._getWorkspaceEnabledExtensions();
        for (let index = 0; index < enabledExtensions.length; index++) {
            const disabledExtension = enabledExtensions[index];
            if (areSameExtensions(disabledExtension, identifier)) {
                enabledExtensions.splice(index, 1);
                this._setEnabledExtensions(enabledExtensions);
                return true;
            }
        }
        return false;
    }
    _getWorkspaceEnabledExtensions() {
        return this._getExtensions(ENABLED_EXTENSIONS_STORAGE_PATH);
    }
    _setEnabledExtensions(enabledExtensions) {
        this._setExtensions(ENABLED_EXTENSIONS_STORAGE_PATH, enabledExtensions);
    }
    _getWorkspaceDisabledExtensions() {
        return this._getExtensions(DISABLED_EXTENSIONS_STORAGE_PATH);
    }
    _setDisabledExtensions(disabledExtensions) {
        this._setExtensions(DISABLED_EXTENSIONS_STORAGE_PATH, disabledExtensions);
    }
    _getExtensions(storageId) {
        if (!this.hasWorkspace) {
            return [];
        }
        return this.storageManager.get(storageId, 1 /* StorageScope.WORKSPACE */);
    }
    _setExtensions(storageId, extensions) {
        this.storageManager.set(storageId, extensions, 1 /* StorageScope.WORKSPACE */);
    }
    async _onDidChangeGloballyDisabledExtensions(extensionIdentifiers, source) {
        if (source !== SOURCE) {
            await this.extensionsManager.whenInitialized();
            const extensions = this.extensionsManager.extensions.filter(installedExtension => extensionIdentifiers.some(identifier => areSameExtensions(identifier, installedExtension.identifier)));
            this._onEnablementChanged.fire(extensions);
        }
    }
    _onDidChangeExtensions(added, removed, isProfileSwitch) {
        const changedExtensions = added.filter(e => !this.isEnabledEnablementState(this.getEnablementState(e)));
        const existingDisabledExtensions = this.extensionsDisabledExtensions;
        this.extensionsDisabledExtensions = this.extensionsManager.extensions.filter(extension => {
            const enablementState = this.getEnablementState(extension);
            return enablementState === 8 /* EnablementState.DisabledByExtensionDependency */ || enablementState === 7 /* EnablementState.DisabledByAllowlist */ || enablementState === 4 /* EnablementState.DisabledByMalicious */;
        });
        for (const extension of existingDisabledExtensions) {
            if (this.extensionsDisabledExtensions.every(e => !areSameExtensions(e.identifier, extension.identifier))) {
                changedExtensions.push(extension);
            }
        }
        for (const extension of this.extensionsDisabledExtensions) {
            if (existingDisabledExtensions.every(e => !areSameExtensions(e.identifier, extension.identifier))) {
                changedExtensions.push(extension);
            }
        }
        if (changedExtensions.length) {
            this._onEnablementChanged.fire(changedExtensions);
        }
        if (!isProfileSwitch) {
            removed.forEach(({ identifier }) => this._reset(identifier));
        }
    }
    async updateExtensionsEnablementsWhenWorkspaceTrustChanges() {
        await this.extensionsManager.whenInitialized();
        const computeEnablementStates = (workspaceType) => {
            const extensionsEnablements = new Map();
            return this.extensionsManager.extensions.map(extension => [extension, this._computeEnablementState(extension, this.extensionsManager.extensions, workspaceType, extensionsEnablements)]);
        };
        const workspaceType = this.getWorkspaceType();
        const enablementStatesWithTrustedWorkspace = computeEnablementStates({ ...workspaceType, trusted: true });
        const enablementStatesWithUntrustedWorkspace = computeEnablementStates({ ...workspaceType, trusted: false });
        const enablementChangedExtensionsBecauseOfTrust = enablementStatesWithTrustedWorkspace.filter(([, enablementState], index) => enablementState !== enablementStatesWithUntrustedWorkspace[index][1]).map(([extension]) => extension);
        if (enablementChangedExtensionsBecauseOfTrust.length) {
            this._onEnablementChanged.fire(enablementChangedExtensionsBecauseOfTrust);
        }
    }
    getWorkspaceType() {
        return { trusted: this.workspaceTrustManagementService.isWorkspaceTrusted(), virtual: isVirtualWorkspace(this.contextService.getWorkspace()) };
    }
    _reset(extension) {
        this._removeFromWorkspaceDisabledExtensions(extension);
        this._removeFromWorkspaceEnabledExtensions(extension);
        this.globalExtensionEnablementService.enableExtension(extension);
    }
    loopCheckForMaliciousExtensions() {
        this.checkForMaliciousExtensions()
            .then(() => this.delayer.trigger(() => { }, 1000 * 60 * 5)) // every five minutes
            .then(() => this.loopCheckForMaliciousExtensions());
    }
    async checkForMaliciousExtensions() {
        try {
            const extensionsControlManifest = await this.extensionManagementService.getExtensionsControlManifest();
            const changed = this.storeMaliciousExtensions(extensionsControlManifest.malicious.map(({ extensionOrPublisher }) => extensionOrPublisher));
            if (changed) {
                this._onDidChangeExtensions([], [], false);
            }
        }
        catch (err) {
            this.logService.error(err);
        }
    }
    getMaliciousExtensions() {
        return this.storageService.getObject('extensionsEnablement/malicious', -1 /* StorageScope.APPLICATION */, []);
    }
    storeMaliciousExtensions(extensions) {
        const existing = this.getMaliciousExtensions();
        if (equals(existing, extensions, (a, b) => !isString(a) && !isString(b) ? areSameExtensions(a, b) : a === b)) {
            return false;
        }
        this.storageService.store('extensionsEnablement/malicious', JSON.stringify(extensions), -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
        return true;
    }
};
ExtensionEnablementService = __decorate([
    __param(0, IStorageService),
    __param(1, IGlobalExtensionEnablementService),
    __param(2, IWorkspaceContextService),
    __param(3, IWorkbenchEnvironmentService),
    __param(4, IExtensionManagementService),
    __param(5, IConfigurationService),
    __param(6, IExtensionManagementServerService),
    __param(7, IUserDataSyncEnablementService),
    __param(8, IUserDataSyncAccountService),
    __param(9, ILifecycleService),
    __param(10, INotificationService),
    __param(11, IHostService),
    __param(12, IExtensionBisectService),
    __param(13, IAllowedExtensionsService),
    __param(14, IWorkspaceTrustManagementService),
    __param(15, IWorkspaceTrustRequestService),
    __param(16, IExtensionManifestPropertiesService),
    __param(17, IInstantiationService),
    __param(18, ILogService)
], ExtensionEnablementService);
export { ExtensionEnablementService };
let ExtensionsManager = class ExtensionsManager extends Disposable {
    get extensions() { return this._extensions; }
    constructor(extensionManagementService, extensionManagementServerService, logService) {
        super();
        this.extensionManagementService = extensionManagementService;
        this.extensionManagementServerService = extensionManagementServerService;
        this.logService = logService;
        this._extensions = [];
        this._onDidChangeExtensions = this._register(new Emitter());
        this.onDidChangeExtensions = this._onDidChangeExtensions.event;
        this.disposed = false;
        this._register(toDisposable(() => this.disposed = true));
        this.initializePromise = this.initialize();
    }
    whenInitialized() {
        return this.initializePromise;
    }
    async initialize() {
        try {
            this._extensions = [
                ...await this.extensionManagementService.getInstalled(),
                ...await this.extensionManagementService.getInstalledWorkspaceExtensions(true)
            ];
            if (this.disposed) {
                return;
            }
            this._onDidChangeExtensions.fire({ added: this.extensions, removed: [], isProfileSwitch: false });
        }
        catch (error) {
            this.logService.error(error);
        }
        this._register(this.extensionManagementService.onDidInstallExtensions(e => this.updateExtensions(e.reduce((result, { local, operation }) => {
            if (local && operation !== 4 /* InstallOperation.Migrate */) {
                result.push(local);
            }
            return result;
        }, []), [], undefined, false)));
        this._register(Event.filter(this.extensionManagementService.onDidUninstallExtension, (e => !e.error))(e => this.updateExtensions([], [e.identifier], e.server, false)));
        this._register(this.extensionManagementService.onDidChangeProfile(({ added, removed, server }) => {
            this.updateExtensions(added, removed.map(({ identifier }) => identifier), server, true);
        }));
    }
    updateExtensions(added, identifiers, server, isProfileSwitch) {
        if (added.length) {
            for (const extension of added) {
                const extensionServer = this.extensionManagementServerService.getExtensionManagementServer(extension);
                const index = this._extensions.findIndex(e => areSameExtensions(e.identifier, extension.identifier) && this.extensionManagementServerService.getExtensionManagementServer(e) === extensionServer);
                if (index !== -1) {
                    this._extensions.splice(index, 1);
                }
            }
            this._extensions.push(...added);
        }
        const removed = [];
        for (const identifier of identifiers) {
            const index = this._extensions.findIndex(e => areSameExtensions(e.identifier, identifier) && this.extensionManagementServerService.getExtensionManagementServer(e) === server);
            if (index !== -1) {
                removed.push(...this._extensions.splice(index, 1));
            }
        }
        if (added.length || removed.length) {
            this._onDidChangeExtensions.fire({ added, removed, isProfileSwitch });
        }
    }
};
ExtensionsManager = __decorate([
    __param(0, IWorkbenchExtensionManagementService),
    __param(1, IExtensionManagementServerService),
    __param(2, ILogService)
], ExtensionsManager);
registerSingleton(IWorkbenchExtensionEnablementService, ExtensionEnablementService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uRW5hYmxlbWVudFNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9hZHZpa2FyL0RvY3VtZW50cy9hcmNoaXRlY3QvYXJjaDIvQXJjaElERS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvZXh0ZW5zaW9uTWFuYWdlbWVudC9icm93c2VyL2V4dGVuc2lvbkVuYWJsZW1lbnRTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUM5QyxPQUFPLEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxVQUFVLEVBQUUsWUFBWSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDaEYsT0FBTyxFQUFFLDJCQUEyQixFQUF3QixpQ0FBaUMsRUFBRSwrQkFBK0IsRUFBRSxnQ0FBZ0MsRUFBb0IseUJBQXlCLEVBQUUsTUFBTSx3RUFBd0UsQ0FBQztBQUM5UixPQUFPLEVBQUUsb0NBQW9DLEVBQW1CLGlDQUFpQyxFQUFFLG9DQUFvQyxFQUF3RCxNQUFNLGtDQUFrQyxDQUFDO0FBQ3hPLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxhQUFhLEVBQUUsd0JBQXdCLEVBQUUsV0FBVyxFQUFFLE1BQU0sNEVBQTRFLENBQUM7QUFDckssT0FBTyxFQUFFLHdCQUF3QixFQUFrQixNQUFNLG9EQUFvRCxDQUFDO0FBQzlHLE9BQU8sRUFBRSxlQUFlLEVBQStCLE1BQU0sZ0RBQWdELENBQUM7QUFDOUcsT0FBTyxFQUFFLDRCQUE0QixFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDOUYsT0FBTyxFQUE2QixpQ0FBaUMsRUFBRSx1QkFBdUIsRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQ2xMLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ25HLE9BQU8sRUFBcUIsaUJBQWlCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUMvRyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sK0VBQStFLENBQUM7QUFDL0csT0FBTyxFQUFFLHNCQUFzQixFQUErQixNQUFNLHVDQUF1QyxDQUFDO0FBQzVHLE9BQU8sRUFBRSwyQkFBMkIsRUFBRSxNQUFNLGlFQUFpRSxDQUFDO0FBQzlHLE9BQU8sRUFBRSw4QkFBOEIsRUFBRSxNQUFNLDBEQUEwRCxDQUFDO0FBQzFHLE9BQU8sRUFBRSxpQkFBaUIsRUFBa0IsTUFBTSxxQ0FBcUMsQ0FBQztBQUN4RixPQUFPLEVBQUUsb0JBQW9CLEVBQUUsb0JBQW9CLEVBQUUsUUFBUSxFQUFFLE1BQU0sMERBQTBELENBQUM7QUFDaEksT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDRCQUE0QixDQUFDO0FBQzFELE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLHNCQUFzQixDQUFDO0FBQy9ELE9BQU8sRUFBRSxnQ0FBZ0MsRUFBRSw2QkFBNkIsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQzFJLE9BQU8sRUFBRSxtQ0FBbUMsRUFBRSxNQUFNLCtEQUErRCxDQUFDO0FBQ3BILE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDJEQUEyRCxDQUFDO0FBQy9GLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUNyRSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNuRyxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDM0QsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQzVELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUUzRCxNQUFNLE1BQU0sR0FBRyxzQ0FBc0MsQ0FBQztBQUkvQyxJQUFNLDBCQUEwQixHQUFoQyxNQUFNLDBCQUEyQixTQUFRLFVBQVU7SUFZekQsWUFDa0IsY0FBZ0QsRUFDOUIsZ0NBQXNGLEVBQy9GLGNBQXlELEVBQ3JELGtCQUFpRSxFQUNsRSwwQkFBd0UsRUFDOUUsb0JBQTRELEVBQ2hELGdDQUFvRixFQUN2Riw2QkFBOEUsRUFDakYsMEJBQXdFLEVBQ2xGLGdCQUFvRCxFQUNqRCxtQkFBMEQsRUFDbEUsV0FBeUIsRUFDZCxzQkFBZ0UsRUFDOUQsd0JBQW9FLEVBQzdELCtCQUFrRixFQUNyRiw0QkFBNEUsRUFDdEUsa0NBQXdGLEVBQ3RHLG9CQUEyQyxFQUNyRCxVQUF3QztRQUVyRCxLQUFLLEVBQUUsQ0FBQztRQXBCMEIsbUJBQWMsR0FBZCxjQUFjLENBQWlCO1FBQ1gscUNBQWdDLEdBQWhDLGdDQUFnQyxDQUFtQztRQUM5RSxtQkFBYyxHQUFkLGNBQWMsQ0FBMEI7UUFDcEMsdUJBQWtCLEdBQWxCLGtCQUFrQixDQUE4QjtRQUNqRCwrQkFBMEIsR0FBMUIsMEJBQTBCLENBQTZCO1FBQzdELHlCQUFvQixHQUFwQixvQkFBb0IsQ0FBdUI7UUFDL0IscUNBQWdDLEdBQWhDLGdDQUFnQyxDQUFtQztRQUN0RSxrQ0FBNkIsR0FBN0IsNkJBQTZCLENBQWdDO1FBQ2hFLCtCQUEwQixHQUExQiwwQkFBMEIsQ0FBNkI7UUFDakUscUJBQWdCLEdBQWhCLGdCQUFnQixDQUFtQjtRQUNoQyx3QkFBbUIsR0FBbkIsbUJBQW1CLENBQXNCO1FBRXRDLDJCQUFzQixHQUF0QixzQkFBc0IsQ0FBeUI7UUFDN0MsNkJBQXdCLEdBQXhCLHdCQUF3QixDQUEyQjtRQUM1QyxvQ0FBK0IsR0FBL0IsK0JBQStCLENBQWtDO1FBQ3BFLGlDQUE0QixHQUE1Qiw0QkFBNEIsQ0FBK0I7UUFDckQsdUNBQWtDLEdBQWxDLGtDQUFrQyxDQUFxQztRQUUvRixlQUFVLEdBQVYsVUFBVSxDQUFhO1FBM0JyQyx5QkFBb0IsR0FBRyxJQUFJLE9BQU8sRUFBeUIsQ0FBQztRQUM3RCx3QkFBbUIsR0FBaUMsSUFBSSxDQUFDLG9CQUFvQixDQUFDLEtBQUssQ0FBQztRQUk1RixpQ0FBNEIsR0FBaUIsRUFBRSxDQUFDO1FBQ3ZDLFlBQU8sR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxDQUFPLENBQUMsQ0FBQyxDQUFDLENBQUM7UUF3Qi9ELElBQUksQ0FBQyxjQUFjLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLGNBQWMsQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDO1FBRXpFLE1BQU0sbUJBQW1CLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLDBCQUEwQixDQUFDLHVCQUF1QixFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFLFVBQVUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUN6SyxJQUFJLFVBQVUsR0FBRyxLQUFLLENBQUM7UUFDdkIsSUFBSSxDQUFDLFNBQVMsQ0FBQyxZQUFZLENBQUMsR0FBRyxFQUFFLENBQUMsVUFBVSxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUM7UUFDdEQsSUFBSSxDQUFDLGlCQUFpQixHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsb0JBQW9CLENBQUMsY0FBYyxDQUFDLGlCQUFpQixDQUFDLENBQUMsQ0FBQztRQUNoRyxJQUFJLENBQUMsaUJBQWlCLENBQUMsZUFBZSxFQUFFLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRTtZQUNsRCxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUM7Z0JBQ2pCLG1CQUFtQixDQUFDLE9BQU8sRUFBRSxDQUFDO2dCQUM5QixJQUFJLENBQUMsc0JBQXNCLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQztnQkFDM0MsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUMscUJBQXFCLENBQUMsQ0FBQyxFQUFFLEtBQUssRUFBRSxPQUFPLEVBQUUsZUFBZSxFQUFFLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxLQUFLLEVBQUUsT0FBTyxFQUFFLGVBQWUsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDcEssSUFBSSxDQUFDLCtCQUErQixFQUFFLENBQUM7WUFDeEMsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsZ0NBQWdDLENBQUMscUJBQXFCLENBQUMsQ0FBQyxFQUFFLFVBQVUsRUFBRSxNQUFNLEVBQUUsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLHNDQUFzQyxDQUFDLFVBQVUsRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDekssSUFBSSxDQUFDLFNBQVMsQ0FBQyx3QkFBd0IsQ0FBQyx1Q0FBdUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsc0JBQXNCLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFbkksc0VBQXNFO1FBQ3RFLElBQUksSUFBSSxDQUFDLHlCQUF5QixFQUFFLENBQUM7WUFDcEMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLElBQUksbUNBQTJCLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRTtnQkFDL0QsSUFBSSxDQUFDLG1CQUFtQixDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLFFBQVEsQ0FBQyxvQkFBb0IsRUFBRSxvREFBb0QsQ0FBQyxFQUFFLENBQUM7d0JBQ3JJLEtBQUssRUFBRSxRQUFRLENBQUMsUUFBUSxFQUFFLDhCQUE4QixDQUFDO3dCQUN6RCxHQUFHLEVBQUUsR0FBRyxFQUFFLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxFQUFFLGlCQUFpQixFQUFFLEtBQUssRUFBRSxDQUFDO3FCQUMzRCxDQUFDLEVBQUU7b0JBQ0gsTUFBTSxFQUFFLElBQUk7b0JBQ1osUUFBUSxFQUFFLG9CQUFvQixDQUFDLE1BQU07aUJBQ3JDLENBQUMsQ0FBQztZQUNKLENBQUMsQ0FBQyxDQUFDO1FBQ0osQ0FBQztJQUNGLENBQUM7SUFFRCxJQUFZLFlBQVk7UUFDdkIsT0FBTyxJQUFJLENBQUMsY0FBYyxDQUFDLGlCQUFpQixFQUFFLGlDQUF5QixDQUFDO0lBQ3pFLENBQUM7SUFFRCxJQUFZLHlCQUF5QjtRQUNwQyxPQUFPLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxpQkFBaUIsS0FBSyxJQUFJLENBQUM7SUFDM0QsQ0FBQztJQUVELGtCQUFrQixDQUFDLFNBQXFCO1FBQ3ZDLE9BQU8sSUFBSSxDQUFDLHVCQUF1QixDQUFDLFNBQVMsRUFBRSxJQUFJLENBQUMsaUJBQWlCLENBQUMsVUFBVSxFQUFFLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDLENBQUM7SUFDNUcsQ0FBQztJQUVELG1CQUFtQixDQUFDLFVBQXdCLEVBQUUseUJBQWlELEVBQUU7UUFDaEcsTUFBTSxxQkFBcUIsR0FBRyxJQUFJLEdBQUcsRUFBK0IsQ0FBQztRQUNyRSxNQUFNLGFBQWEsR0FBRyxFQUFFLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixFQUFFLEVBQUUsR0FBRyxzQkFBc0IsRUFBRSxDQUFDO1FBQ2hGLE9BQU8sVUFBVSxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxTQUFTLEVBQUUsVUFBVSxFQUFFLGFBQWEsRUFBRSxxQkFBcUIsQ0FBQyxDQUFDLENBQUM7SUFDL0gsQ0FBQztJQUVELCtCQUErQixDQUFDLFNBQXFCO1FBQ3BELE9BQU8sd0JBQXdCLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLFVBQVUsRUFBRSxTQUFTLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3pILENBQUM7SUFFRCxtQkFBbUIsQ0FBQyxTQUFxQjtRQUN4QyxJQUFJLENBQUM7WUFDSixJQUFJLENBQUMsa0NBQWtDLENBQUMsU0FBUyxDQUFDLENBQUM7WUFDbkQsT0FBTyxJQUFJLENBQUM7UUFDYixDQUFDO1FBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztZQUNoQixPQUFPLEtBQUssQ0FBQztRQUNkLENBQUM7SUFDRixDQUFDO0lBRUQsNEJBQTRCLENBQUMsU0FBcUI7UUFDakQsSUFBSSxDQUFDLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDO1lBQzFDLE9BQU8sS0FBSyxDQUFDO1FBQ2QsQ0FBQztRQUVELElBQUksQ0FBQztZQUNKLElBQUksQ0FBQywyQ0FBMkMsQ0FBQyxTQUFTLENBQUMsQ0FBQztZQUM1RCxPQUFPLElBQUksQ0FBQztRQUNiLENBQUM7UUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1lBQ2hCLE9BQU8sS0FBSyxDQUFDO1FBQ2QsQ0FBQztJQUNGLENBQUM7SUFFTyxrQ0FBa0MsQ0FBQyxTQUFxQixFQUFFLHNCQUFnQztRQUNqRyxJQUFJLHVCQUF1QixDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDO1lBQ2pELE1BQU0sSUFBSSxLQUFLLENBQUMsUUFBUSxDQUFDLHdDQUF3QyxFQUFFLGtGQUFrRixFQUFFLFNBQVMsQ0FBQyxRQUFRLENBQUMsV0FBVyxJQUFJLFNBQVMsQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUNwTixDQUFDO1FBRUQsSUFBSSxJQUFJLENBQUMsNkJBQTZCLENBQUMsU0FBUyxFQUFFLElBQUksSUFBSSxDQUFDLDBCQUEwQixDQUFDLE9BQU87WUFDNUYsaUNBQWlDLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxJQUFJLFNBQVMsQ0FBQyxRQUFRLENBQUMsV0FBWSxDQUFDLGNBQWUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxLQUFLLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxPQUFRLENBQUMsd0JBQXdCLENBQUMsRUFBRSxDQUFDO1lBQ2pNLE1BQU0sSUFBSSxLQUFLLENBQUMsUUFBUSxDQUFDLCtCQUErQixFQUFFLDZFQUE2RSxFQUFFLFNBQVMsQ0FBQyxRQUFRLENBQUMsV0FBVyxJQUFJLFNBQVMsQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUN0TSxDQUFDO1FBRUQsSUFBSSxJQUFJLENBQUMsZUFBZSxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUM7WUFDckMsTUFBTSxJQUFJLEtBQUssQ0FBQyxRQUFRLENBQUMsc0NBQXNDLEVBQUUsZ0ZBQWdGLEVBQUUsU0FBUyxDQUFDLFFBQVEsQ0FBQyxXQUFXLElBQUksU0FBUyxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ2hOLENBQUM7UUFFRCxJQUFJLENBQUMsMENBQTBDLENBQUMsU0FBUyxFQUFFLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxTQUFTLENBQUMsRUFBRSxzQkFBc0IsQ0FBQyxDQUFDO0lBQ3hILENBQUM7SUFFTywwQ0FBMEMsQ0FBQyxTQUFxQixFQUFFLDBCQUEyQyxFQUFFLHNCQUFnQztRQUN0SixRQUFRLDBCQUEwQixFQUFFLENBQUM7WUFDcEM7Z0JBQ0MsTUFBTSxJQUFJLEtBQUssQ0FBQyxRQUFRLENBQUMsdUNBQXVDLEVBQUUsaUZBQWlGLEVBQUUsU0FBUyxDQUFDLFFBQVEsQ0FBQyxXQUFXLElBQUksU0FBUyxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQ2xOO2dCQUNDLE1BQU0sSUFBSSxLQUFLLENBQUMsUUFBUSxDQUFDLG9DQUFvQyxFQUFFLG1FQUFtRSxFQUFFLFNBQVMsQ0FBQyxRQUFRLENBQUMsV0FBVyxJQUFJLFNBQVMsQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUNqTTtnQkFDQyxNQUFNLElBQUksS0FBSyxDQUFDLFFBQVEsQ0FBQyw0Q0FBNEMsRUFBRSwwRkFBMEYsRUFBRSxTQUFTLENBQUMsUUFBUSxDQUFDLFdBQVcsSUFBSSxTQUFTLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDaE87Z0JBQ0MsTUFBTSxJQUFJLEtBQUssQ0FBQyxRQUFRLENBQUMseUNBQXlDLEVBQUUseUVBQXlFLEVBQUUsU0FBUyxDQUFDLFFBQVEsQ0FBQyxXQUFXLElBQUksU0FBUyxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQzVNO2dCQUNDLE1BQU0sSUFBSSxLQUFLLENBQUMsUUFBUSxDQUFDLCtDQUErQyxFQUFFLG9FQUFvRSxFQUFFLFNBQVMsQ0FBQyxRQUFRLENBQUMsV0FBVyxJQUFJLFNBQVMsQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUM3TTtnQkFDQyxNQUFNLElBQUksS0FBSyxDQUFDLFFBQVEsQ0FBQyw0Q0FBNEMsRUFBRSxvRUFBb0UsRUFBRSxTQUFTLENBQUMsUUFBUSxDQUFDLFdBQVcsSUFBSSxTQUFTLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDMU07Z0JBQ0MsSUFBSSxzQkFBc0IsRUFBRSxDQUFDO29CQUM1QixNQUFNO2dCQUNQLENBQUM7Z0JBQ0QsMkVBQTJFO2dCQUMzRSxLQUFLLE1BQU0sVUFBVSxJQUFJLHdCQUF3QixDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxVQUFVLEVBQUUsU0FBUyxDQUFDLEVBQUUsQ0FBQztvQkFDakcsSUFBSSxJQUFJLENBQUMsU0FBUyxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUM7d0JBQ2hDLFNBQVM7b0JBQ1YsQ0FBQztvQkFDRCxNQUFNLElBQUksS0FBSyxDQUFDLFFBQVEsQ0FBQyxxQ0FBcUMsRUFBRSw0RkFBNEYsRUFBRSxTQUFTLENBQUMsUUFBUSxDQUFDLFdBQVcsSUFBSSxTQUFTLENBQUMsVUFBVSxDQUFDLEVBQUUsRUFBRSxVQUFVLENBQUMsUUFBUSxDQUFDLFdBQVcsSUFBSSxVQUFVLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7Z0JBQ3hSLENBQUM7UUFDSCxDQUFDO0lBQ0YsQ0FBQztJQUVPLDJDQUEyQyxDQUFDLFNBQXFCO1FBQ3hFLElBQUksQ0FBQyxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUM7WUFDeEIsTUFBTSxJQUFJLEtBQUssQ0FBQyxRQUFRLENBQUMsYUFBYSxFQUFFLGVBQWUsQ0FBQyxDQUFDLENBQUM7UUFDM0QsQ0FBQztRQUNELElBQUksaUNBQWlDLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUM7WUFDM0QsTUFBTSxJQUFJLEtBQUssQ0FBQyxRQUFRLENBQUMsNENBQTRDLEVBQUUsd0dBQXdHLEVBQUUsU0FBUyxDQUFDLFFBQVEsQ0FBQyxXQUFXLElBQUksU0FBUyxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQzlPLENBQUM7SUFDRixDQUFDO0lBRUQsS0FBSyxDQUFDLGFBQWEsQ0FBQyxVQUF3QixFQUFFLFFBQXlCO1FBQ3RFLE1BQU0sSUFBSSxDQUFDLGlCQUFpQixDQUFDLGVBQWUsRUFBRSxDQUFDO1FBRS9DLElBQUksUUFBUSw2Q0FBb0MsSUFBSSxRQUFRLDhDQUFxQyxFQUFFLENBQUM7WUFDbkcsVUFBVSxDQUFDLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQyxnQ0FBZ0MsQ0FBQyxVQUFVLEVBQUUsSUFBSSxDQUFDLGlCQUFpQixDQUFDLFVBQVUsRUFBRSxRQUFRLEVBQUUsRUFBRSxZQUFZLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDeEosQ0FBQztRQUVELE1BQU0sU0FBUyxHQUFHLFFBQVEsK0NBQXNDLElBQUksUUFBUSw4Q0FBcUMsQ0FBQztRQUNsSCxLQUFLLE1BQU0sU0FBUyxJQUFJLFVBQVUsRUFBRSxDQUFDO1lBQ3BDLElBQUksU0FBUyxFQUFFLENBQUM7Z0JBQ2YsSUFBSSxDQUFDLDJDQUEyQyxDQUFDLFNBQVMsQ0FBQyxDQUFDO1lBQzdELENBQUM7aUJBQU0sQ0FBQztnQkFDUCxJQUFJLENBQUMsa0NBQWtDLENBQUMsU0FBUyxDQUFDLENBQUM7WUFDcEQsQ0FBQztRQUNGLENBQUM7UUFFRCxNQUFNLE1BQU0sR0FBYyxFQUFFLENBQUM7UUFDN0IsS0FBSyxNQUFNLFNBQVMsSUFBSSxVQUFVLEVBQUUsQ0FBQztZQUNwQyxNQUFNLGVBQWUsR0FBRyxJQUFJLENBQUMsa0JBQWtCLENBQUMsU0FBUyxDQUFDLENBQUM7WUFDM0QsSUFBSSxlQUFlLHVEQUErQztnQkFDakUscUVBQXFFO21CQUNsRSxDQUFDLGVBQWUsMERBQWtELElBQUksSUFBSSxDQUFDLCtCQUErQixDQUFDLFNBQVMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLHdCQUF3QixDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsdURBQStDLENBQUMsQ0FBQyxFQUMvTixDQUFDO2dCQUNGLE1BQU0sVUFBVSxHQUFHLE1BQU0sSUFBSSxDQUFDLDRCQUE0QixDQUFDLHFCQUFxQixFQUFFLENBQUM7Z0JBQ25GLE1BQU0sQ0FBQyxJQUFJLENBQUMsVUFBVSxJQUFJLEtBQUssQ0FBQyxDQUFDO1lBQ2xDLENBQUM7aUJBQU0sQ0FBQztnQkFDUCxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sSUFBSSxDQUFDLHVCQUF1QixDQUFDLFNBQVMsRUFBRSxRQUFRLENBQUMsQ0FBQyxDQUFDO1lBQ3RFLENBQUM7UUFDRixDQUFDO1FBRUQsTUFBTSxpQkFBaUIsR0FBRyxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLEtBQUssRUFBRSxFQUFFLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7UUFDekUsSUFBSSxpQkFBaUIsQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUM5QixJQUFJLENBQUMsb0JBQW9CLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLENBQUM7UUFDbkQsQ0FBQztRQUNELE9BQU8sTUFBTSxDQUFDO0lBQ2YsQ0FBQztJQUVPLGdDQUFnQyxDQUFDLFVBQXdCLEVBQUUsYUFBd0MsRUFBRSxlQUFnQyxFQUFFLE9BQWlELEVBQUUsVUFBd0IsRUFBRTtRQUMzTixJQUFJLENBQUMsT0FBTyxDQUFDLFlBQVksSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUM1QyxPQUFPLEVBQUUsQ0FBQztRQUNYLENBQUM7UUFFRCxNQUFNLE9BQU8sR0FBRyxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ2xFLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDckIsT0FBTyxFQUFFLENBQUM7UUFDWCxDQUFDO1FBRUQsS0FBSyxNQUFNLFNBQVMsSUFBSSxPQUFPLEVBQUUsQ0FBQztZQUNqQyxPQUFPLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQ3pCLENBQUM7UUFFRCxNQUFNLGtCQUFrQixHQUFpQixFQUFFLENBQUM7UUFDNUMsS0FBSyxNQUFNLFNBQVMsSUFBSSxhQUFhLEVBQUUsQ0FBQztZQUN2QywrQkFBK0I7WUFDL0IsSUFBSSxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLFVBQVUsRUFBRSxTQUFTLENBQUMsVUFBVSxDQUFDLENBQUMsRUFBRSxDQUFDO2dCQUM5RSxTQUFTO1lBQ1YsQ0FBQztZQUVELE1BQU0sMEJBQTBCLEdBQUcsSUFBSSxDQUFDLGtCQUFrQixDQUFDLFNBQVMsQ0FBQyxDQUFDO1lBQ3RFLHVCQUF1QjtZQUN2QixJQUFJLElBQUksQ0FBQyx3QkFBd0IsQ0FBQywwQkFBMEIsQ0FBQyxFQUFFLENBQUM7Z0JBQy9ELFNBQVM7WUFDVixDQUFDO1lBRUQsNkRBQTZEO1lBQzdELElBQUksMEJBQTBCLG9EQUE0QyxFQUFFLENBQUM7Z0JBQzVFLFNBQVM7WUFDVixDQUFDO1lBRUQsOERBQThEO1lBQzlELElBQUksVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUN2QixDQUFDLE9BQU8sQ0FBQyxZQUFZLElBQUksQ0FBQyxDQUFDLFFBQVEsQ0FBQyxxQkFBcUIsRUFBRSxJQUFJLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxpQkFBaUIsQ0FBQyxFQUFFLEVBQUUsRUFBRSxFQUFFLFNBQVMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDO21CQUNwSCxDQUFDLE9BQU8sQ0FBQyxJQUFJLElBQUksQ0FBQyxDQUFDLFFBQVEsQ0FBQyxhQUFhLEVBQUUsSUFBSSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsaUJBQWlCLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxTQUFTLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztnQkFFOUcsTUFBTSxLQUFLLEdBQUcsa0JBQWtCLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLFVBQVUsRUFBRSxTQUFTLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQztnQkFFdkcsMkRBQTJEO2dCQUMzRCxJQUFJLEtBQUssS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDO29CQUNsQixrQkFBa0IsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUM7Z0JBQ3BDLENBQUM7Z0JBRUQsc0RBQXNEO3FCQUNqRCxDQUFDO29CQUNMLElBQUksQ0FBQzt3QkFDSixzREFBc0Q7d0JBQ3RELElBQUksQ0FBQywwQ0FBMEMsQ0FBQyxTQUFTLEVBQUUsMEJBQTBCLEVBQUUsSUFBSSxDQUFDLENBQUM7d0JBQzdGLGtCQUFrQixDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUUsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxDQUFDO29CQUNoRCxDQUFDO29CQUFDLE9BQU8sS0FBSyxFQUFFLENBQUMsQ0FBQyxjQUFjLENBQUMsQ0FBQztnQkFDbkMsQ0FBQztZQUNGLENBQUM7UUFDRixDQUFDO1FBRUQsSUFBSSxrQkFBa0IsQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUMvQixrQkFBa0IsQ0FBQyxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUMsZ0NBQWdDLENBQUMsa0JBQWtCLEVBQUUsYUFBYSxFQUFFLGVBQWUsRUFBRSxPQUFPLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQztRQUN6SSxDQUFDO1FBRUQsT0FBTyxrQkFBa0IsQ0FBQztJQUMzQixDQUFDO0lBRU8sdUJBQXVCLENBQUMsU0FBcUIsRUFBRSxRQUF5QjtRQUUvRSxNQUFNLFlBQVksR0FBRyxJQUFJLENBQUMsdUJBQXVCLENBQUMsU0FBUyxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBRXhFLElBQUksWUFBWSxLQUFLLFFBQVEsRUFBRSxDQUFDO1lBQy9CLE9BQU8sT0FBTyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUMvQixDQUFDO1FBRUQsUUFBUSxRQUFRLEVBQUUsQ0FBQztZQUNsQjtnQkFDQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsU0FBUyxDQUFDLFVBQVUsQ0FBQyxDQUFDO2dCQUM1QyxNQUFNO1lBQ1A7Z0JBQ0MsSUFBSSxDQUFDLGlCQUFpQixDQUFDLFNBQVMsQ0FBQyxVQUFVLENBQUMsQ0FBQztnQkFDN0MsTUFBTTtZQUNQO2dCQUNDLElBQUksQ0FBQywyQkFBMkIsQ0FBQyxTQUFTLENBQUMsVUFBVSxDQUFDLENBQUM7Z0JBQ3ZELE1BQU07WUFDUDtnQkFDQyxJQUFJLENBQUMsNEJBQTRCLENBQUMsU0FBUyxDQUFDLFVBQVUsQ0FBQyxDQUFDO2dCQUN4RCxNQUFNO1FBQ1IsQ0FBQztRQUVELE9BQU8sT0FBTyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUM5QixDQUFDO0lBRUQsU0FBUyxDQUFDLFNBQXFCO1FBQzlCLE1BQU0sZUFBZSxHQUFHLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUMzRCxPQUFPLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxlQUFlLENBQUMsQ0FBQztJQUN2RCxDQUFDO0lBRUQsd0JBQXdCLENBQUMsZUFBZ0M7UUFDeEQsT0FBTyxlQUFlLGlEQUF5QyxJQUFJLGVBQWUsOENBQXFDLElBQUksZUFBZSw2Q0FBb0MsQ0FBQztJQUNoTCxDQUFDO0lBRUQsa0JBQWtCLENBQUMsU0FBcUI7UUFDdkMsT0FBTyxJQUFJLENBQUMsbUJBQW1CLENBQUMsU0FBUyxDQUFDLFVBQVUsQ0FBQyxDQUFDO0lBQ3ZELENBQUM7SUFFTyx1QkFBdUIsQ0FBQyxTQUFxQixFQUFFLFVBQXFDLEVBQUUsYUFBNEIsRUFBRSx3QkFBMkQ7UUFDdEwsd0JBQXdCLEdBQUcsd0JBQXdCLElBQUksSUFBSSxHQUFHLEVBQStCLENBQUM7UUFDOUYsSUFBSSxlQUFlLEdBQUcsd0JBQXdCLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQzlELElBQUksZUFBZSxLQUFLLFNBQVMsRUFBRSxDQUFDO1lBQ25DLE9BQU8sZUFBZSxDQUFDO1FBQ3hCLENBQUM7UUFFRCxlQUFlLEdBQUcsSUFBSSxDQUFDLHVCQUF1QixDQUFDLFNBQVMsQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUNyRSxNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsd0JBQXdCLENBQUMsZUFBZSxDQUFDLENBQUM7UUFFakUsSUFBSSxXQUFXLENBQUMsU0FBUyxDQUFDLFVBQVUsRUFBRSxJQUFJLENBQUMsc0JBQXNCLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsb0JBQW9CLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztZQUM5RyxlQUFlLDhDQUFzQyxDQUFDO1FBQ3ZELENBQUM7YUFFSSxJQUFJLFNBQVMsSUFBSSxTQUFTLENBQUMsSUFBSSwrQkFBdUIsSUFBSSxJQUFJLENBQUMsd0JBQXdCLENBQUMsU0FBUyxDQUFDLFNBQVMsQ0FBQyxLQUFLLElBQUksRUFBRSxDQUFDO1lBQzVILGVBQWUsOENBQXNDLENBQUM7UUFDdkQsQ0FBQzthQUVJLElBQUksU0FBUyxJQUFJLENBQUMsU0FBUyxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQzFDLGVBQWUscURBQTZDLENBQUM7UUFDOUQsQ0FBQzthQUVJLElBQUksSUFBSSxDQUFDLHNCQUFzQixDQUFDLGtCQUFrQixDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUM7WUFDcEUsZUFBZSxnREFBd0MsQ0FBQztRQUN6RCxDQUFDO2FBRUksSUFBSSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQztZQUMzQyxlQUFlLGdEQUF3QyxDQUFDO1FBQ3pELENBQUM7YUFFSSxJQUFJLElBQUksQ0FBQyw2QkFBNkIsQ0FBQyxTQUFTLEVBQUUsYUFBYSxDQUFDLEVBQUUsQ0FBQztZQUN2RSxlQUFlLHFEQUE2QyxDQUFDO1FBQzlELENBQUM7YUFFSSxJQUFJLFNBQVMsSUFBSSxJQUFJLENBQUMsMkJBQTJCLENBQUMsU0FBUyxFQUFFLGFBQWEsQ0FBQyxFQUFFLENBQUM7WUFDbEYsZUFBZSxxREFBNkMsQ0FBQztRQUM5RCxDQUFDO2FBRUksSUFBSSxJQUFJLENBQUMsMEJBQTBCLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQztZQUNyRCxlQUFlLGtEQUEwQyxDQUFDO1FBQzNELENBQUM7YUFFSSxJQUFJLFNBQVMsSUFBSSxJQUFJLENBQUMsZ0NBQWdDLENBQUMsU0FBUyxFQUFFLFVBQVUsRUFBRSxhQUFhLEVBQUUsd0JBQXdCLENBQUMsRUFBRSxDQUFDO1lBQzdILGVBQWUsd0RBQWdELENBQUM7UUFDakUsQ0FBQzthQUVJLElBQUksQ0FBQyxTQUFTLElBQUksSUFBSSxDQUFDLGVBQWUsQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDO1lBQ3hELGVBQWUsK0NBQXVDLENBQUM7UUFDeEQsQ0FBQztRQUVELHdCQUF3QixDQUFDLEdBQUcsQ0FBQyxTQUFTLEVBQUUsZUFBZSxDQUFDLENBQUM7UUFDekQsT0FBTyxlQUFlLENBQUM7SUFDeEIsQ0FBQztJQUVPLGdCQUFnQixDQUFDLFNBQXFCO1FBQzdDLElBQUksSUFBSSxDQUFDLHlCQUF5QixFQUFFLENBQUM7WUFDcEMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxTQUFTLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxTQUFTLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxlQUFlLENBQUMsQ0FBQztRQUNsSCxDQUFDO1FBRUQsTUFBTSxrQkFBa0IsR0FBRyxJQUFJLENBQUMsa0JBQWtCLENBQUMsaUJBQWlCLENBQUM7UUFDckUsSUFBSSxLQUFLLENBQUMsT0FBTyxDQUFDLGtCQUFrQixDQUFDLEVBQUUsQ0FBQztZQUN2QyxPQUFPLGtCQUFrQixDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLGlCQUFpQixDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsU0FBUyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUM7UUFDdkYsQ0FBQztRQUVELHlGQUF5RjtRQUN6RixJQUFJLGlCQUFpQixDQUFDLEVBQUUsRUFBRSxFQUFFLGFBQWEsQ0FBQyxLQUFLLEVBQUUsRUFBRSxTQUFTLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQztZQUMxRSxPQUFPLElBQUksQ0FBQztRQUNiLENBQUM7UUFFRCxPQUFPLEtBQUssQ0FBQztJQUNkLENBQUM7SUFFTyxlQUFlLENBQUMsU0FBcUI7UUFDNUMsTUFBTSxpQkFBaUIsR0FBRyxJQUFJLENBQUMsa0JBQWtCLENBQUMsZ0JBQWdCLENBQUM7UUFDbkUsSUFBSSxLQUFLLENBQUMsT0FBTyxDQUFDLGlCQUFpQixDQUFDLEVBQUUsQ0FBQztZQUN0QyxPQUFPLGlCQUFpQixDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLGlCQUFpQixDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsU0FBUyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUM7UUFDdEYsQ0FBQztRQUNELE9BQU8sS0FBSyxDQUFDO0lBQ2QsQ0FBQztJQUVPLDZCQUE2QixDQUFDLFNBQXFCLEVBQUUsYUFBNEI7UUFDeEYsMEJBQTBCO1FBQzFCLElBQUksQ0FBQyxhQUFhLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDNUIsT0FBTyxLQUFLLENBQUM7UUFDZCxDQUFDO1FBRUQsNkJBQTZCO1FBQzdCLElBQUksSUFBSSxDQUFDLGtDQUFrQyxDQUFDLHVDQUF1QyxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsS0FBSyxLQUFLLEVBQUUsQ0FBQztZQUNuSCxPQUFPLEtBQUssQ0FBQztRQUNkLENBQUM7UUFFRCxxREFBcUQ7UUFDckQsSUFBSSxJQUFJLENBQUMsZ0NBQWdDLENBQUMsNEJBQTRCLENBQUMsU0FBUyxDQUFDLEtBQUssSUFBSSxDQUFDLGdDQUFnQyxDQUFDLDRCQUE0QixJQUFJLElBQUksQ0FBQyxrQ0FBa0MsQ0FBQyxlQUFlLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUM7WUFDek8sT0FBTyxLQUFLLENBQUM7UUFDZCxDQUFDO1FBRUQsT0FBTyxJQUFJLENBQUM7SUFDYixDQUFDO0lBRU8sMEJBQTBCLENBQUMsU0FBcUI7UUFDdkQsSUFBSSxJQUFJLENBQUMsZ0NBQWdDLENBQUMsK0JBQStCLElBQUksSUFBSSxDQUFDLGdDQUFnQyxDQUFDLDRCQUE0QixFQUFFLENBQUM7WUFDakosTUFBTSxlQUFlLEdBQUcsSUFBSSxDQUFDLGdDQUFnQyxDQUFDLDJCQUEyQixDQUFDLFNBQVMsQ0FBQyxDQUFDO1lBQ3JHLEtBQUssTUFBTSxhQUFhLElBQUksSUFBSSxDQUFDLGtDQUFrQyxDQUFDLGdCQUFnQixDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDO2dCQUMxRyxJQUFJLGFBQWEsS0FBSyxJQUFJLEVBQUUsQ0FBQztvQkFDNUIsSUFBSSxlQUFlLDJDQUFtQyxFQUFFLENBQUM7d0JBQ3hELE9BQU8sS0FBSyxDQUFDO29CQUNkLENBQUM7Z0JBQ0YsQ0FBQztnQkFDRCxJQUFJLGFBQWEsS0FBSyxXQUFXLEVBQUUsQ0FBQztvQkFDbkMsSUFBSSxlQUFlLDRDQUFvQyxFQUFFLENBQUM7d0JBQ3pELE9BQU8sS0FBSyxDQUFDO29CQUNkLENBQUM7Z0JBQ0YsQ0FBQztnQkFDRCxJQUFJLGFBQWEsS0FBSyxLQUFLLEVBQUUsQ0FBQztvQkFDN0IsSUFBSSxJQUFJLENBQUMsZ0NBQWdDLENBQUMsNEJBQTRCLENBQUMsU0FBUyxFQUFFLENBQUM7d0JBQ2xGLElBQUksZUFBZSx5Q0FBaUMsSUFBSSxlQUFlLDRDQUFvQyxFQUFFLENBQUM7NEJBQzdHLE9BQU8sS0FBSyxDQUFDO3dCQUNkLENBQUM7b0JBQ0YsQ0FBQzt5QkFBTSxJQUFJLGVBQWUsMkNBQW1DLEVBQUUsQ0FBQzt3QkFDL0QsTUFBTSxvQkFBb0IsR0FBRyxJQUFJLENBQUMsb0JBQW9CLENBQUMsUUFBUSxDQUE4QixzQkFBc0IsQ0FBQyxDQUFDO3dCQUNySCxJQUFJLG9CQUFvQixLQUFLLElBQUksSUFBSSxvQkFBb0IsS0FBSyxNQUFNLEVBQUUsQ0FBQzs0QkFDdEUsbURBQW1EOzRCQUNuRCxPQUFPLEtBQUssQ0FBQzt3QkFDZCxDQUFDO29CQUNGLENBQUM7Z0JBQ0YsQ0FBQztZQUNGLENBQUM7WUFDRCxPQUFPLElBQUksQ0FBQztRQUNiLENBQUM7UUFDRCxPQUFPLEtBQUssQ0FBQztJQUNkLENBQUM7SUFFTywyQkFBMkIsQ0FBQyxTQUFxQixFQUFFLGFBQTRCO1FBQ3RGLElBQUksYUFBYSxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQzNCLE9BQU8sS0FBSyxDQUFDO1FBQ2QsQ0FBQztRQUVELElBQUksSUFBSSxDQUFDLGNBQWMsQ0FBQyxpQkFBaUIsQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQztZQUMvRCxPQUFPLElBQUksQ0FBQztRQUNiLENBQUM7UUFFRCxPQUFPLElBQUksQ0FBQyxrQ0FBa0MsQ0FBQyx5Q0FBeUMsQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLEtBQUssS0FBSyxDQUFDO0lBQ3hILENBQUM7SUFFTyxnQ0FBZ0MsQ0FBQyxTQUFxQixFQUFFLFVBQXFDLEVBQUUsYUFBNEIsRUFBRSx3QkFBMEQ7UUFFOUwsSUFBSSxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMscUJBQXFCLEVBQUUsQ0FBQztZQUMvQyxPQUFPLEtBQUssQ0FBQztRQUNkLENBQUM7UUFFRCwyRUFBMkU7UUFDM0UsTUFBTSxvQkFBb0IsR0FBRyxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQ2xELFNBQVMsQ0FBQyxRQUFRLENBQUMscUJBQXFCLEVBQUUsSUFBSSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLFVBQVUsRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDO2VBQ3hGLENBQUMsSUFBSSxDQUFDLGdDQUFnQyxDQUFDLDRCQUE0QixDQUFDLENBQUMsQ0FBQyxLQUFLLElBQUksQ0FBQyxnQ0FBZ0MsQ0FBQyw0QkFBNEIsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxJQUFJLElBQUksQ0FBQyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsUUFBUSxDQUFDLEdBQUcsS0FBSyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUUzTyxJQUFJLENBQUMsb0JBQW9CLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDbEMsT0FBTyxLQUFLLENBQUM7UUFDZCxDQUFDO1FBRUQsTUFBTSxrQkFBa0IsR0FBRyx3QkFBd0IsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDbkUsSUFBSSxDQUFDLGtCQUFrQixFQUFFLENBQUM7WUFDekIsb0NBQW9DO1lBQ3BDLHdCQUF3QixDQUFDLEdBQUcsQ0FBQyxTQUFTLDJDQUFrQyxDQUFDO1FBQzFFLENBQUM7UUFDRCxJQUFJLENBQUM7WUFDSixLQUFLLE1BQU0sbUJBQW1CLElBQUksb0JBQW9CLEVBQUUsQ0FBQztnQkFDeEQsTUFBTSxlQUFlLEdBQUcsSUFBSSxDQUFDLHVCQUF1QixDQUFDLG1CQUFtQixFQUFFLFVBQVUsRUFBRSxhQUFhLEVBQUUsd0JBQXdCLENBQUMsQ0FBQztnQkFDL0gsSUFBSSxDQUFDLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxlQUFlLENBQUMsSUFBSSxlQUFlLG9EQUE0QyxFQUFFLENBQUM7b0JBQ3BILE9BQU8sSUFBSSxDQUFDO2dCQUNiLENBQUM7WUFDRixDQUFDO1FBQ0YsQ0FBQztnQkFBUyxDQUFDO1lBQ1YsSUFBSSxDQUFDLGtCQUFrQixFQUFFLENBQUM7Z0JBQ3pCLHlCQUF5QjtnQkFDekIsd0JBQXdCLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1lBQzVDLENBQUM7UUFDRixDQUFDO1FBRUQsT0FBTyxLQUFLLENBQUM7SUFDZCxDQUFDO0lBRU8sdUJBQXVCLENBQUMsVUFBZ0M7UUFDL0QsSUFBSSxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUM7WUFDdkIsSUFBSSxJQUFJLENBQUMsOEJBQThCLEVBQUUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLEVBQUUsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO2dCQUM1RixpREFBd0M7WUFDekMsQ0FBQztZQUVELElBQUksSUFBSSxDQUFDLCtCQUErQixFQUFFLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxFQUFFLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztnQkFDN0Ysa0RBQXlDO1lBQzFDLENBQUM7UUFDRixDQUFDO1FBQ0QsSUFBSSxJQUFJLENBQUMsbUJBQW1CLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQztZQUMxQyxnREFBd0M7UUFDekMsQ0FBQztRQUNELGdEQUF1QztJQUN4QyxDQUFDO0lBRU8sbUJBQW1CLENBQUMsVUFBZ0M7UUFDM0QsT0FBTyxJQUFJLENBQUMsZ0NBQWdDLENBQUMscUJBQXFCLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLEVBQUUsVUFBVSxDQUFDLENBQUMsQ0FBQztJQUNsSCxDQUFDO0lBRU8sZ0JBQWdCLENBQUMsVUFBZ0M7UUFDeEQsSUFBSSxDQUFDLHNDQUFzQyxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBQ3hELElBQUksQ0FBQyxxQ0FBcUMsQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUN2RCxPQUFPLElBQUksQ0FBQyxnQ0FBZ0MsQ0FBQyxlQUFlLENBQUMsVUFBVSxFQUFFLE1BQU0sQ0FBQyxDQUFDO0lBQ2xGLENBQUM7SUFFTyxpQkFBaUIsQ0FBQyxVQUFnQztRQUN6RCxJQUFJLENBQUMsc0NBQXNDLENBQUMsVUFBVSxDQUFDLENBQUM7UUFDeEQsSUFBSSxDQUFDLHFDQUFxQyxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBQ3ZELE9BQU8sSUFBSSxDQUFDLGdDQUFnQyxDQUFDLGdCQUFnQixDQUFDLFVBQVUsRUFBRSxNQUFNLENBQUMsQ0FBQztJQUNuRixDQUFDO0lBRU8sMkJBQTJCLENBQUMsVUFBZ0M7UUFDbkUsSUFBSSxDQUFDLHNDQUFzQyxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBQ3hELElBQUksQ0FBQyxnQ0FBZ0MsQ0FBQyxVQUFVLENBQUMsQ0FBQztJQUNuRCxDQUFDO0lBRU8sNEJBQTRCLENBQUMsVUFBZ0M7UUFDcEUsSUFBSSxDQUFDLGlDQUFpQyxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBQ25ELElBQUksQ0FBQyxxQ0FBcUMsQ0FBQyxVQUFVLENBQUMsQ0FBQztJQUN4RCxDQUFDO0lBRU8saUNBQWlDLENBQUMsVUFBZ0M7UUFDekUsSUFBSSxDQUFDLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQztZQUN4QixPQUFPLE9BQU8sQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDL0IsQ0FBQztRQUNELE1BQU0sa0JBQWtCLEdBQUcsSUFBSSxDQUFDLCtCQUErQixFQUFFLENBQUM7UUFDbEUsSUFBSSxrQkFBa0IsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLGlCQUFpQixDQUFDLENBQUMsRUFBRSxVQUFVLENBQUMsQ0FBQyxFQUFFLENBQUM7WUFDdEUsa0JBQWtCLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDO1lBQ3BDLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO1lBQ2hELE9BQU8sT0FBTyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUM5QixDQUFDO1FBQ0QsT0FBTyxPQUFPLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQy9CLENBQUM7SUFFTyxLQUFLLENBQUMsc0NBQXNDLENBQUMsVUFBZ0M7UUFDcEYsSUFBSSxDQUFDLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQztZQUN4QixPQUFPLEtBQUssQ0FBQztRQUNkLENBQUM7UUFDRCxNQUFNLGtCQUFrQixHQUFHLElBQUksQ0FBQywrQkFBK0IsRUFBRSxDQUFDO1FBQ2xFLEtBQUssSUFBSSxLQUFLLEdBQUcsQ0FBQyxFQUFFLEtBQUssR0FBRyxrQkFBa0IsQ0FBQyxNQUFNLEVBQUUsS0FBSyxFQUFFLEVBQUUsQ0FBQztZQUNoRSxNQUFNLGlCQUFpQixHQUFHLGtCQUFrQixDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQ3BELElBQUksaUJBQWlCLENBQUMsaUJBQWlCLEVBQUUsVUFBVSxDQUFDLEVBQUUsQ0FBQztnQkFDdEQsa0JBQWtCLENBQUMsTUFBTSxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQztnQkFDcEMsSUFBSSxDQUFDLHNCQUFzQixDQUFDLGtCQUFrQixDQUFDLENBQUM7Z0JBQ2hELE9BQU8sSUFBSSxDQUFDO1lBQ2IsQ0FBQztRQUNGLENBQUM7UUFDRCxPQUFPLEtBQUssQ0FBQztJQUNkLENBQUM7SUFFTyxnQ0FBZ0MsQ0FBQyxVQUFnQztRQUN4RSxJQUFJLENBQUMsSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDO1lBQ3hCLE9BQU8sS0FBSyxDQUFDO1FBQ2QsQ0FBQztRQUNELE1BQU0saUJBQWlCLEdBQUcsSUFBSSxDQUFDLDhCQUE4QixFQUFFLENBQUM7UUFDaEUsSUFBSSxpQkFBaUIsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLGlCQUFpQixDQUFDLENBQUMsRUFBRSxVQUFVLENBQUMsQ0FBQyxFQUFFLENBQUM7WUFDckUsaUJBQWlCLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDO1lBQ25DLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO1lBQzlDLE9BQU8sSUFBSSxDQUFDO1FBQ2IsQ0FBQztRQUNELE9BQU8sS0FBSyxDQUFDO0lBQ2QsQ0FBQztJQUVPLHFDQUFxQyxDQUFDLFVBQWdDO1FBQzdFLElBQUksQ0FBQyxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUM7WUFDeEIsT0FBTyxLQUFLLENBQUM7UUFDZCxDQUFDO1FBQ0QsTUFBTSxpQkFBaUIsR0FBRyxJQUFJLENBQUMsOEJBQThCLEVBQUUsQ0FBQztRQUNoRSxLQUFLLElBQUksS0FBSyxHQUFHLENBQUMsRUFBRSxLQUFLLEdBQUcsaUJBQWlCLENBQUMsTUFBTSxFQUFFLEtBQUssRUFBRSxFQUFFLENBQUM7WUFDL0QsTUFBTSxpQkFBaUIsR0FBRyxpQkFBaUIsQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUNuRCxJQUFJLGlCQUFpQixDQUFDLGlCQUFpQixFQUFFLFVBQVUsQ0FBQyxFQUFFLENBQUM7Z0JBQ3RELGlCQUFpQixDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUM7Z0JBQ25DLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO2dCQUM5QyxPQUFPLElBQUksQ0FBQztZQUNiLENBQUM7UUFDRixDQUFDO1FBQ0QsT0FBTyxLQUFLLENBQUM7SUFDZCxDQUFDO0lBRVMsOEJBQThCO1FBQ3ZDLE9BQU8sSUFBSSxDQUFDLGNBQWMsQ0FBQywrQkFBK0IsQ0FBQyxDQUFDO0lBQzdELENBQUM7SUFFTyxxQkFBcUIsQ0FBQyxpQkFBeUM7UUFDdEUsSUFBSSxDQUFDLGNBQWMsQ0FBQywrQkFBK0IsRUFBRSxpQkFBaUIsQ0FBQyxDQUFDO0lBQ3pFLENBQUM7SUFFUywrQkFBK0I7UUFDeEMsT0FBTyxJQUFJLENBQUMsY0FBYyxDQUFDLGdDQUFnQyxDQUFDLENBQUM7SUFDOUQsQ0FBQztJQUVPLHNCQUFzQixDQUFDLGtCQUEwQztRQUN4RSxJQUFJLENBQUMsY0FBYyxDQUFDLGdDQUFnQyxFQUFFLGtCQUFrQixDQUFDLENBQUM7SUFDM0UsQ0FBQztJQUVPLGNBQWMsQ0FBQyxTQUFpQjtRQUN2QyxJQUFJLENBQUMsSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDO1lBQ3hCLE9BQU8sRUFBRSxDQUFDO1FBQ1gsQ0FBQztRQUNELE9BQU8sSUFBSSxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsU0FBUyxpQ0FBeUIsQ0FBQztJQUNuRSxDQUFDO0lBRU8sY0FBYyxDQUFDLFNBQWlCLEVBQUUsVUFBa0M7UUFDM0UsSUFBSSxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsU0FBUyxFQUFFLFVBQVUsaUNBQXlCLENBQUM7SUFDeEUsQ0FBQztJQUVPLEtBQUssQ0FBQyxzQ0FBc0MsQ0FBQyxvQkFBeUQsRUFBRSxNQUFlO1FBQzlILElBQUksTUFBTSxLQUFLLE1BQU0sRUFBRSxDQUFDO1lBQ3ZCLE1BQU0sSUFBSSxDQUFDLGlCQUFpQixDQUFDLGVBQWUsRUFBRSxDQUFDO1lBQy9DLE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLGtCQUFrQixDQUFDLEVBQUUsQ0FBQyxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQyxpQkFBaUIsQ0FBQyxVQUFVLEVBQUUsa0JBQWtCLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ3pMLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUM7UUFDNUMsQ0FBQztJQUNGLENBQUM7SUFFTyxzQkFBc0IsQ0FBQyxLQUFnQyxFQUFFLE9BQWtDLEVBQUUsZUFBd0I7UUFDNUgsTUFBTSxpQkFBaUIsR0FBaUIsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLHdCQUF3QixDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDdEgsTUFBTSwwQkFBMEIsR0FBRyxJQUFJLENBQUMsNEJBQTRCLENBQUM7UUFDckUsSUFBSSxDQUFDLDRCQUE0QixHQUFHLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxFQUFFO1lBQ3hGLE1BQU0sZUFBZSxHQUFHLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxTQUFTLENBQUMsQ0FBQztZQUMzRCxPQUFPLGVBQWUsMERBQWtELElBQUksZUFBZSxnREFBd0MsSUFBSSxlQUFlLGdEQUF3QyxDQUFDO1FBQ2hNLENBQUMsQ0FBQyxDQUFDO1FBQ0gsS0FBSyxNQUFNLFNBQVMsSUFBSSwwQkFBMEIsRUFBRSxDQUFDO1lBQ3BELElBQUksSUFBSSxDQUFDLDRCQUE0QixDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLFVBQVUsRUFBRSxTQUFTLENBQUMsVUFBVSxDQUFDLENBQUMsRUFBRSxDQUFDO2dCQUMxRyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUM7WUFDbkMsQ0FBQztRQUNGLENBQUM7UUFDRCxLQUFLLE1BQU0sU0FBUyxJQUFJLElBQUksQ0FBQyw0QkFBNEIsRUFBRSxDQUFDO1lBQzNELElBQUksMEJBQTBCLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLENBQUMsVUFBVSxFQUFFLFNBQVMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxFQUFFLENBQUM7Z0JBQ25HLGlCQUFpQixDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQztZQUNuQyxDQUFDO1FBQ0YsQ0FBQztRQUNELElBQUksaUJBQWlCLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDOUIsSUFBSSxDQUFDLG9CQUFvQixDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO1FBQ25ELENBQUM7UUFDRCxJQUFJLENBQUMsZUFBZSxFQUFFLENBQUM7WUFDdEIsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDLEVBQUUsVUFBVSxFQUFFLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQztRQUM5RCxDQUFDO0lBQ0YsQ0FBQztJQUVNLEtBQUssQ0FBQyxvREFBb0Q7UUFDaEUsTUFBTSxJQUFJLENBQUMsaUJBQWlCLENBQUMsZUFBZSxFQUFFLENBQUM7UUFFL0MsTUFBTSx1QkFBdUIsR0FBRyxDQUFDLGFBQTRCLEVBQW1DLEVBQUU7WUFDakcsTUFBTSxxQkFBcUIsR0FBRyxJQUFJLEdBQUcsRUFBK0IsQ0FBQztZQUNyRSxPQUFPLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxTQUFTLEVBQUUsSUFBSSxDQUFDLHVCQUF1QixDQUFDLFNBQVMsRUFBRSxJQUFJLENBQUMsaUJBQWlCLENBQUMsVUFBVSxFQUFFLGFBQWEsRUFBRSxxQkFBcUIsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUMxTCxDQUFDLENBQUM7UUFFRixNQUFNLGFBQWEsR0FBRyxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztRQUM5QyxNQUFNLG9DQUFvQyxHQUFHLHVCQUF1QixDQUFDLEVBQUUsR0FBRyxhQUFhLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7UUFDMUcsTUFBTSxzQ0FBc0MsR0FBRyx1QkFBdUIsQ0FBQyxFQUFFLEdBQUcsYUFBYSxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDO1FBQzdHLE1BQU0seUNBQXlDLEdBQUcsb0NBQW9DLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLGVBQWUsQ0FBQyxFQUFFLEtBQUssRUFBRSxFQUFFLENBQUMsZUFBZSxLQUFLLHNDQUFzQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsRUFBRSxFQUFFLENBQUMsU0FBUyxDQUFDLENBQUM7UUFFcE8sSUFBSSx5Q0FBeUMsQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUN0RCxJQUFJLENBQUMsb0JBQW9CLENBQUMsSUFBSSxDQUFDLHlDQUF5QyxDQUFDLENBQUM7UUFDM0UsQ0FBQztJQUNGLENBQUM7SUFFTyxnQkFBZ0I7UUFDdkIsT0FBTyxFQUFFLE9BQU8sRUFBRSxJQUFJLENBQUMsK0JBQStCLENBQUMsa0JBQWtCLEVBQUUsRUFBRSxPQUFPLEVBQUUsa0JBQWtCLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxZQUFZLEVBQUUsQ0FBQyxFQUFFLENBQUM7SUFDaEosQ0FBQztJQUVPLE1BQU0sQ0FBQyxTQUErQjtRQUM3QyxJQUFJLENBQUMsc0NBQXNDLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDdkQsSUFBSSxDQUFDLHFDQUFxQyxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQ3RELElBQUksQ0FBQyxnQ0FBZ0MsQ0FBQyxlQUFlLENBQUMsU0FBUyxDQUFDLENBQUM7SUFDbEUsQ0FBQztJQUVPLCtCQUErQjtRQUN0QyxJQUFJLENBQUMsMkJBQTJCLEVBQUU7YUFDaEMsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUMsRUFBRSxJQUFJLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMscUJBQXFCO2FBQ2hGLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsK0JBQStCLEVBQUUsQ0FBQyxDQUFDO0lBQ3RELENBQUM7SUFFTyxLQUFLLENBQUMsMkJBQTJCO1FBQ3hDLElBQUksQ0FBQztZQUNKLE1BQU0seUJBQXlCLEdBQUcsTUFBTSxJQUFJLENBQUMsMEJBQTBCLENBQUMsNEJBQTRCLEVBQUUsQ0FBQztZQUN2RyxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsd0JBQXdCLENBQUMseUJBQXlCLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsb0JBQW9CLEVBQUUsRUFBRSxFQUFFLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxDQUFDO1lBQzNJLElBQUksT0FBTyxFQUFFLENBQUM7Z0JBQ2IsSUFBSSxDQUFDLHNCQUFzQixDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUM7WUFDNUMsQ0FBQztRQUNGLENBQUM7UUFBQyxPQUFPLEdBQUcsRUFBRSxDQUFDO1lBQ2QsSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDNUIsQ0FBQztJQUNGLENBQUM7SUFFTyxzQkFBc0I7UUFDN0IsT0FBTyxJQUFJLENBQUMsY0FBYyxDQUFDLFNBQVMsQ0FBQyxnQ0FBZ0MscUNBQTRCLEVBQUUsQ0FBQyxDQUFDO0lBQ3RHLENBQUM7SUFFTyx3QkFBd0IsQ0FBQyxVQUF3RDtRQUN4RixNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsc0JBQXNCLEVBQUUsQ0FBQztRQUMvQyxJQUFJLE1BQU0sQ0FBQyxRQUFRLEVBQUUsVUFBVSxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLGlCQUFpQixDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUM7WUFDOUcsT0FBTyxLQUFLLENBQUM7UUFDZCxDQUFDO1FBQ0QsSUFBSSxDQUFDLGNBQWMsQ0FBQyxLQUFLLENBQUMsZ0NBQWdDLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxVQUFVLENBQUMsbUVBQWtELENBQUM7UUFDekksT0FBTyxJQUFJLENBQUM7SUFDYixDQUFDO0NBQ0QsQ0FBQTtBQTdyQlksMEJBQTBCO0lBYXBDLFdBQUEsZUFBZSxDQUFBO0lBQ2YsV0FBQSxpQ0FBaUMsQ0FBQTtJQUNqQyxXQUFBLHdCQUF3QixDQUFBO0lBQ3hCLFdBQUEsNEJBQTRCLENBQUE7SUFDNUIsV0FBQSwyQkFBMkIsQ0FBQTtJQUMzQixXQUFBLHFCQUFxQixDQUFBO0lBQ3JCLFdBQUEsaUNBQWlDLENBQUE7SUFDakMsV0FBQSw4QkFBOEIsQ0FBQTtJQUM5QixXQUFBLDJCQUEyQixDQUFBO0lBQzNCLFdBQUEsaUJBQWlCLENBQUE7SUFDakIsWUFBQSxvQkFBb0IsQ0FBQTtJQUNwQixZQUFBLFlBQVksQ0FBQTtJQUNaLFlBQUEsdUJBQXVCLENBQUE7SUFDdkIsWUFBQSx5QkFBeUIsQ0FBQTtJQUN6QixZQUFBLGdDQUFnQyxDQUFBO0lBQ2hDLFlBQUEsNkJBQTZCLENBQUE7SUFDN0IsWUFBQSxtQ0FBbUMsQ0FBQTtJQUNuQyxZQUFBLHFCQUFxQixDQUFBO0lBQ3JCLFlBQUEsV0FBVyxDQUFBO0dBL0JELDBCQUEwQixDQTZyQnRDOztBQUVELElBQU0saUJBQWlCLEdBQXZCLE1BQU0saUJBQWtCLFNBQVEsVUFBVTtJQUd6QyxJQUFJLFVBQVUsS0FBNEIsT0FBTyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQztJQVFwRSxZQUN1QywwQkFBaUYsRUFDcEYsZ0NBQW9GLEVBQzFHLFVBQXdDO1FBRXJELEtBQUssRUFBRSxDQUFDO1FBSitDLCtCQUEwQixHQUExQiwwQkFBMEIsQ0FBc0M7UUFDbkUscUNBQWdDLEdBQWhDLGdDQUFnQyxDQUFtQztRQUN6RixlQUFVLEdBQVYsVUFBVSxDQUFhO1FBWjlDLGdCQUFXLEdBQWlCLEVBQUUsQ0FBQztRQUcvQiwyQkFBc0IsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxFQUF1RyxDQUFDLENBQUM7UUFDM0osMEJBQXFCLEdBQUcsSUFBSSxDQUFDLHNCQUFzQixDQUFDLEtBQUssQ0FBQztRQUczRCxhQUFRLEdBQVksS0FBSyxDQUFDO1FBUWpDLElBQUksQ0FBQyxTQUFTLENBQUMsWUFBWSxDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxRQUFRLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQztRQUN6RCxJQUFJLENBQUMsaUJBQWlCLEdBQUcsSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDO0lBQzVDLENBQUM7SUFFRCxlQUFlO1FBQ2QsT0FBTyxJQUFJLENBQUMsaUJBQWlCLENBQUM7SUFDL0IsQ0FBQztJQUVPLEtBQUssQ0FBQyxVQUFVO1FBQ3ZCLElBQUksQ0FBQztZQUNKLElBQUksQ0FBQyxXQUFXLEdBQUc7Z0JBQ2xCLEdBQUcsTUFBTSxJQUFJLENBQUMsMEJBQTBCLENBQUMsWUFBWSxFQUFFO2dCQUN2RCxHQUFHLE1BQU0sSUFBSSxDQUFDLDBCQUEwQixDQUFDLCtCQUErQixDQUFDLElBQUksQ0FBQzthQUM5RSxDQUFDO1lBQ0YsSUFBSSxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7Z0JBQ25CLE9BQU87WUFDUixDQUFDO1lBQ0QsSUFBSSxDQUFDLHNCQUFzQixDQUFDLElBQUksQ0FBQyxFQUFFLEtBQUssRUFBRSxJQUFJLENBQUMsVUFBVSxFQUFFLE9BQU8sRUFBRSxFQUFFLEVBQUUsZUFBZSxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUM7UUFDbkcsQ0FBQztRQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7WUFDaEIsSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDOUIsQ0FBQztRQUNELElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLDBCQUEwQixDQUFDLHNCQUFzQixDQUFDLENBQUMsQ0FBQyxFQUFFLENBQ3pFLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFlLENBQUMsTUFBTSxFQUFFLEVBQUUsS0FBSyxFQUFFLFNBQVMsRUFBRSxFQUFFLEVBQUU7WUFDN0UsSUFBSSxLQUFLLElBQUksU0FBUyxxQ0FBNkIsRUFBRSxDQUFDO2dCQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7WUFBQyxDQUFDO1lBQUMsT0FBTyxNQUFNLENBQUM7UUFDNUYsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxTQUFTLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ2pDLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsMEJBQTBCLENBQUMsdUJBQXVCLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxNQUFNLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3hLLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLDBCQUEwQixDQUFDLGtCQUFrQixDQUFDLENBQUMsRUFBRSxLQUFLLEVBQUUsT0FBTyxFQUFFLE1BQU0sRUFBRSxFQUFFLEVBQUU7WUFDaEcsSUFBSSxDQUFDLGdCQUFnQixDQUFDLEtBQUssRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxVQUFVLEVBQUUsRUFBRSxFQUFFLENBQUMsVUFBVSxDQUFDLEVBQUUsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQ3pGLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDO0lBRU8sZ0JBQWdCLENBQUMsS0FBbUIsRUFBRSxXQUFtQyxFQUFFLE1BQThDLEVBQUUsZUFBd0I7UUFDMUosSUFBSSxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDbEIsS0FBSyxNQUFNLFNBQVMsSUFBSSxLQUFLLEVBQUUsQ0FBQztnQkFDL0IsTUFBTSxlQUFlLEdBQUcsSUFBSSxDQUFDLGdDQUFnQyxDQUFDLDRCQUE0QixDQUFDLFNBQVMsQ0FBQyxDQUFDO2dCQUN0RyxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLGlCQUFpQixDQUFDLENBQUMsQ0FBQyxVQUFVLEVBQUUsU0FBUyxDQUFDLFVBQVUsQ0FBQyxJQUFJLElBQUksQ0FBQyxnQ0FBZ0MsQ0FBQyw0QkFBNEIsQ0FBQyxDQUFDLENBQUMsS0FBSyxlQUFlLENBQUMsQ0FBQztnQkFDbE0sSUFBSSxLQUFLLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQztvQkFDbEIsSUFBSSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDO2dCQUNuQyxDQUFDO1lBQ0YsQ0FBQztZQUNELElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEdBQUcsS0FBSyxDQUFDLENBQUM7UUFDakMsQ0FBQztRQUNELE1BQU0sT0FBTyxHQUFpQixFQUFFLENBQUM7UUFDakMsS0FBSyxNQUFNLFVBQVUsSUFBSSxXQUFXLEVBQUUsQ0FBQztZQUN0QyxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLGlCQUFpQixDQUFDLENBQUMsQ0FBQyxVQUFVLEVBQUUsVUFBVSxDQUFDLElBQUksSUFBSSxDQUFDLGdDQUFnQyxDQUFDLDRCQUE0QixDQUFDLENBQUMsQ0FBQyxLQUFLLE1BQU0sQ0FBQyxDQUFDO1lBQy9LLElBQUksS0FBSyxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUM7Z0JBQ2xCLE9BQU8sQ0FBQyxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNwRCxDQUFDO1FBQ0YsQ0FBQztRQUNELElBQUksS0FBSyxDQUFDLE1BQU0sSUFBSSxPQUFPLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDcEMsSUFBSSxDQUFDLHNCQUFzQixDQUFDLElBQUksQ0FBQyxFQUFFLEtBQUssRUFBRSxPQUFPLEVBQUUsZUFBZSxFQUFFLENBQUMsQ0FBQztRQUN2RSxDQUFDO0lBQ0YsQ0FBQztDQUNELENBQUE7QUF0RUssaUJBQWlCO0lBWXBCLFdBQUEsb0NBQW9DLENBQUE7SUFDcEMsV0FBQSxpQ0FBaUMsQ0FBQTtJQUNqQyxXQUFBLFdBQVcsQ0FBQTtHQWRSLGlCQUFpQixDQXNFdEI7QUFFRCxpQkFBaUIsQ0FBQyxvQ0FBb0MsRUFBRSwwQkFBMEIsb0NBQTRCLENBQUMifQ==