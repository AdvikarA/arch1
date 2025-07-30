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
import * as fs from 'fs';
import { Promises, Queue } from '../../../base/common/async.js';
import { VSBuffer } from '../../../base/common/buffer.js';
import { CancellationError, getErrorMessage } from '../../../base/common/errors.js';
import { Emitter } from '../../../base/common/event.js';
import { hash } from '../../../base/common/hash.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { ResourceMap, ResourceSet } from '../../../base/common/map.js';
import { Schemas } from '../../../base/common/network.js';
import * as path from '../../../base/common/path.js';
import { joinPath } from '../../../base/common/resources.js';
import * as semver from '../../../base/common/semver/semver.js';
import { isBoolean, isDefined, isUndefined } from '../../../base/common/types.js';
import { URI } from '../../../base/common/uri.js';
import { generateUuid } from '../../../base/common/uuid.js';
import * as pfs from '../../../base/node/pfs.js';
import { extract, zip } from '../../../base/node/zip.js';
import * as nls from '../../../nls.js';
import { IDownloadService } from '../../download/common/download.js';
import { INativeEnvironmentService } from '../../environment/common/environment.js';
import { AbstractExtensionManagementService, AbstractExtensionTask, toExtensionManagementError } from '../common/abstractExtensionManagementService.js';
import { ExtensionManagementError, IExtensionGalleryService, IExtensionManagementService, EXTENSION_INSTALL_CLIENT_TARGET_PLATFORM_CONTEXT, ExtensionSignatureVerificationCode, computeSize, IAllowedExtensionsService, VerifyExtensionSignatureConfigKey, shouldRequireRepositorySignatureFor, } from '../common/extensionManagement.js';
import { areSameExtensions, computeTargetPlatform, ExtensionKey, getGalleryExtensionId, groupByExtension } from '../common/extensionManagementUtil.js';
import { IExtensionsProfileScannerService } from '../common/extensionsProfileScannerService.js';
import { IExtensionsScannerService } from '../common/extensionsScannerService.js';
import { ExtensionsDownloader } from './extensionDownloader.js';
import { ExtensionsLifecycle } from './extensionLifecycle.js';
import { fromExtractError, getManifest } from './extensionManagementUtil.js';
import { ExtensionsManifestCache } from './extensionsManifestCache.js';
import { ExtensionsWatcher } from './extensionsWatcher.js';
import { isEngineValid } from '../../extensions/common/extensionValidator.js';
import { IFileService, toFileOperationResult } from '../../files/common/files.js';
import { IInstantiationService, refineServiceDecorator } from '../../instantiation/common/instantiation.js';
import { ILogService } from '../../log/common/log.js';
import { IProductService } from '../../product/common/productService.js';
import { ITelemetryService } from '../../telemetry/common/telemetry.js';
import { IUriIdentityService } from '../../uriIdentity/common/uriIdentity.js';
import { IUserDataProfilesService } from '../../userDataProfile/common/userDataProfile.js';
import { IConfigurationService } from '../../configuration/common/configuration.js';
import { IExtensionGalleryManifestService } from '../common/extensionGalleryManifest.js';
export const INativeServerExtensionManagementService = refineServiceDecorator(IExtensionManagementService);
const DELETED_FOLDER_POSTFIX = '.vsctmp';
let ExtensionManagementService = class ExtensionManagementService extends AbstractExtensionManagementService {
    constructor(galleryService, telemetryService, logService, environmentService, extensionsScannerService, extensionsProfileScannerService, downloadService, instantiationService, fileService, configurationService, extensionGalleryManifestService, productService, allowedExtensionsService, uriIdentityService, userDataProfilesService) {
        super(galleryService, telemetryService, uriIdentityService, logService, productService, allowedExtensionsService, userDataProfilesService);
        this.environmentService = environmentService;
        this.extensionsScannerService = extensionsScannerService;
        this.extensionsProfileScannerService = extensionsProfileScannerService;
        this.downloadService = downloadService;
        this.instantiationService = instantiationService;
        this.fileService = fileService;
        this.configurationService = configurationService;
        this.extensionGalleryManifestService = extensionGalleryManifestService;
        this.extractingGalleryExtensions = new Map();
        this.knownDirectories = new ResourceSet();
        const extensionLifecycle = this._register(instantiationService.createInstance(ExtensionsLifecycle));
        this.extensionsScanner = this._register(instantiationService.createInstance(ExtensionsScanner, extension => extensionLifecycle.postUninstall(extension)));
        this.manifestCache = this._register(new ExtensionsManifestCache(userDataProfilesService, fileService, uriIdentityService, this, this.logService));
        this.extensionsDownloader = this._register(instantiationService.createInstance(ExtensionsDownloader));
        const extensionsWatcher = this._register(new ExtensionsWatcher(this, this.extensionsScannerService, userDataProfilesService, extensionsProfileScannerService, uriIdentityService, fileService, logService));
        this._register(extensionsWatcher.onDidChangeExtensionsByAnotherSource(e => this.onDidChangeExtensionsFromAnotherSource(e)));
        this.watchForExtensionsNotInstalledBySystem();
    }
    getTargetPlatform() {
        if (!this._targetPlatformPromise) {
            this._targetPlatformPromise = computeTargetPlatform(this.fileService, this.logService);
        }
        return this._targetPlatformPromise;
    }
    async zip(extension) {
        this.logService.trace('ExtensionManagementService#zip', extension.identifier.id);
        const files = await this.collectFiles(extension);
        const location = await zip(joinPath(this.extensionsDownloader.extensionsDownloadDir, generateUuid()).fsPath, files);
        return URI.file(location);
    }
    async getManifest(vsix) {
        const { location, cleanup } = await this.downloadVsix(vsix);
        const zipPath = path.resolve(location.fsPath);
        try {
            return await getManifest(zipPath);
        }
        finally {
            await cleanup();
        }
    }
    getInstalled(type, profileLocation = this.userDataProfilesService.defaultProfile.extensionsResource, productVersion = { version: this.productService.version, date: this.productService.date }, language) {
        return this.extensionsScanner.scanExtensions(type ?? null, profileLocation, productVersion, language);
    }
    scanAllUserInstalledExtensions() {
        return this.extensionsScanner.scanAllUserExtensions();
    }
    scanInstalledExtensionAtLocation(location) {
        return this.extensionsScanner.scanUserExtensionAtLocation(location);
    }
    async install(vsix, options = {}) {
        this.logService.trace('ExtensionManagementService#install', vsix.toString());
        const { location, cleanup } = await this.downloadVsix(vsix);
        try {
            const manifest = await getManifest(path.resolve(location.fsPath));
            const extensionId = getGalleryExtensionId(manifest.publisher, manifest.name);
            if (manifest.engines && manifest.engines.vscode && !isEngineValid(manifest.engines.vscode, this.productService.version, this.productService.date)) {
                throw new Error(nls.localize('incompatible', "Unable to install extension '{0}' as it is not compatible with VS Code '{1}'.", extensionId, this.productService.version));
            }
            const allowedToInstall = this.allowedExtensionsService.isAllowed({ id: extensionId, version: manifest.version, publisherDisplayName: undefined });
            if (allowedToInstall !== true) {
                throw new Error(nls.localize('notAllowed', "This extension cannot be installed because {0}", allowedToInstall.value));
            }
            const results = await this.installExtensions([{ manifest, extension: location, options }]);
            const result = results.find(({ identifier }) => areSameExtensions(identifier, { id: extensionId }));
            if (result?.local) {
                return result.local;
            }
            if (result?.error) {
                throw result.error;
            }
            throw toExtensionManagementError(new Error(`Unknown error while installing extension ${extensionId}`));
        }
        finally {
            await cleanup();
        }
    }
    async installFromLocation(location, profileLocation) {
        this.logService.trace('ExtensionManagementService#installFromLocation', location.toString());
        const local = await this.extensionsScanner.scanUserExtensionAtLocation(location);
        if (!local || !local.manifest.name || !local.manifest.version) {
            throw new Error(`Cannot find a valid extension from the location ${location.toString()}`);
        }
        await this.addExtensionsToProfile([[local, { source: 'resource' }]], profileLocation);
        this.logService.info('Successfully installed extension', local.identifier.id, profileLocation.toString());
        return local;
    }
    async installExtensionsFromProfile(extensions, fromProfileLocation, toProfileLocation) {
        this.logService.trace('ExtensionManagementService#installExtensionsFromProfile', extensions, fromProfileLocation.toString(), toProfileLocation.toString());
        const extensionsToInstall = (await this.getInstalled(1 /* ExtensionType.User */, fromProfileLocation)).filter(e => extensions.some(id => areSameExtensions(id, e.identifier)));
        if (extensionsToInstall.length) {
            const metadata = await Promise.all(extensionsToInstall.map(e => this.extensionsScanner.scanMetadata(e, fromProfileLocation)));
            await this.addExtensionsToProfile(extensionsToInstall.map((e, index) => [e, metadata[index]]), toProfileLocation);
            this.logService.info('Successfully installed extensions', extensionsToInstall.map(e => e.identifier.id), toProfileLocation.toString());
        }
        return extensionsToInstall;
    }
    async updateMetadata(local, metadata, profileLocation) {
        this.logService.trace('ExtensionManagementService#updateMetadata', local.identifier.id);
        if (metadata.isPreReleaseVersion) {
            metadata.preRelease = true;
            metadata.hasPreReleaseVersion = true;
        }
        // unset if false
        if (metadata.isMachineScoped === false) {
            metadata.isMachineScoped = undefined;
        }
        if (metadata.isBuiltin === false) {
            metadata.isBuiltin = undefined;
        }
        if (metadata.pinned === false) {
            metadata.pinned = undefined;
        }
        local = await this.extensionsScanner.updateMetadata(local, metadata, profileLocation);
        this.manifestCache.invalidate(profileLocation);
        this._onDidUpdateExtensionMetadata.fire({ local, profileLocation });
        return local;
    }
    deleteExtension(extension) {
        return this.extensionsScanner.deleteExtension(extension, 'remove');
    }
    copyExtension(extension, fromProfileLocation, toProfileLocation, metadata) {
        return this.extensionsScanner.copyExtension(extension, fromProfileLocation, toProfileLocation, metadata);
    }
    moveExtension(extension, fromProfileLocation, toProfileLocation, metadata) {
        return this.extensionsScanner.moveExtension(extension, fromProfileLocation, toProfileLocation, metadata);
    }
    removeExtension(extension, fromProfileLocation) {
        return this.extensionsScanner.removeExtension(extension.identifier, fromProfileLocation);
    }
    copyExtensions(fromProfileLocation, toProfileLocation) {
        return this.extensionsScanner.copyExtensions(fromProfileLocation, toProfileLocation, { version: this.productService.version, date: this.productService.date });
    }
    deleteExtensions(...extensions) {
        return this.extensionsScanner.setExtensionsForRemoval(...extensions);
    }
    async cleanUp() {
        this.logService.trace('ExtensionManagementService#cleanUp');
        try {
            await this.extensionsScanner.cleanUp();
        }
        catch (error) {
            this.logService.error(error);
        }
    }
    async download(extension, operation, donotVerifySignature) {
        const { location } = await this.downloadExtension(extension, operation, !donotVerifySignature);
        return location;
    }
    async downloadVsix(vsix) {
        if (vsix.scheme === Schemas.file) {
            return { location: vsix, async cleanup() { } };
        }
        this.logService.trace('Downloading extension from', vsix.toString());
        const location = joinPath(this.extensionsDownloader.extensionsDownloadDir, generateUuid());
        await this.downloadService.download(vsix, location);
        this.logService.info('Downloaded extension to', location.toString());
        const cleanup = async () => {
            try {
                await this.fileService.del(location);
            }
            catch (error) {
                this.logService.error(error);
            }
        };
        return { location, cleanup };
    }
    getCurrentExtensionsManifestLocation() {
        return this.userDataProfilesService.defaultProfile.extensionsResource;
    }
    createInstallExtensionTask(manifest, extension, options) {
        const extensionKey = extension instanceof URI ? new ExtensionKey({ id: getGalleryExtensionId(manifest.publisher, manifest.name) }, manifest.version) : ExtensionKey.create(extension);
        return this.instantiationService.createInstance(InstallExtensionInProfileTask, extensionKey, manifest, extension, options, (operation, token) => {
            if (extension instanceof URI) {
                return this.extractVSIX(extensionKey, extension, options, token);
            }
            let promise = this.extractingGalleryExtensions.get(extensionKey.toString());
            if (!promise) {
                this.extractingGalleryExtensions.set(extensionKey.toString(), promise = this.downloadAndExtractGalleryExtension(extensionKey, extension, operation, options, token));
                promise.finally(() => this.extractingGalleryExtensions.delete(extensionKey.toString()));
            }
            return promise;
        }, this.extensionsScanner);
    }
    createUninstallExtensionTask(extension, options) {
        return new UninstallExtensionInProfileTask(extension, options, this.extensionsProfileScannerService);
    }
    async downloadAndExtractGalleryExtension(extensionKey, gallery, operation, options, token) {
        const { verificationStatus, location } = await this.downloadExtension(gallery, operation, !options.donotVerifySignature, options.context?.[EXTENSION_INSTALL_CLIENT_TARGET_PLATFORM_CONTEXT]);
        try {
            if (token.isCancellationRequested) {
                throw new CancellationError();
            }
            // validate manifest
            const manifest = await getManifest(location.fsPath);
            if (!new ExtensionKey(gallery.identifier, gallery.version).equals(new ExtensionKey({ id: getGalleryExtensionId(manifest.publisher, manifest.name) }, manifest.version))) {
                throw new ExtensionManagementError(nls.localize('invalidManifest', "Cannot install '{0}' extension because of manifest mismatch with Marketplace", gallery.identifier.id), "Invalid" /* ExtensionManagementErrorCode.Invalid */);
            }
            const local = await this.extensionsScanner.extractUserExtension(extensionKey, location.fsPath, false, token);
            if (verificationStatus !== ExtensionSignatureVerificationCode.Success && this.environmentService.isBuilt) {
                try {
                    await this.extensionsDownloader.delete(location);
                }
                catch (e) {
                    /* Ignore */
                    this.logService.warn(`Error while deleting the downloaded file`, location.toString(), getErrorMessage(e));
                }
            }
            return { local, verificationStatus };
        }
        catch (error) {
            try {
                await this.extensionsDownloader.delete(location);
            }
            catch (e) {
                /* Ignore */
                this.logService.warn(`Error while deleting the downloaded file`, location.toString(), getErrorMessage(e));
            }
            throw toExtensionManagementError(error);
        }
    }
    async downloadExtension(extension, operation, verifySignature, clientTargetPlatform) {
        if (verifySignature) {
            const value = this.configurationService.getValue(VerifyExtensionSignatureConfigKey);
            verifySignature = isBoolean(value) ? value : true;
        }
        const { location, verificationStatus } = await this.extensionsDownloader.download(extension, operation, verifySignature, clientTargetPlatform);
        const shouldRequireSignature = shouldRequireRepositorySignatureFor(extension.private, await this.extensionGalleryManifestService.getExtensionGalleryManifest());
        if (verificationStatus !== ExtensionSignatureVerificationCode.Success
            && !(verificationStatus === ExtensionSignatureVerificationCode.NotSigned && !shouldRequireSignature)
            && verifySignature
            && this.environmentService.isBuilt
            && (await this.getTargetPlatform()) !== "linux-armhf" /* TargetPlatform.LINUX_ARMHF */) {
            try {
                await this.extensionsDownloader.delete(location);
            }
            catch (e) {
                /* Ignore */
                this.logService.warn(`Error while deleting the downloaded file`, location.toString(), getErrorMessage(e));
            }
            if (!verificationStatus) {
                throw new ExtensionManagementError(nls.localize('signature verification not executed', "Signature verification was not executed."), "SignatureVerificationInternal" /* ExtensionManagementErrorCode.SignatureVerificationInternal */);
            }
            switch (verificationStatus) {
                case ExtensionSignatureVerificationCode.PackageIntegrityCheckFailed:
                case ExtensionSignatureVerificationCode.SignatureIsInvalid:
                case ExtensionSignatureVerificationCode.SignatureManifestIsInvalid:
                case ExtensionSignatureVerificationCode.SignatureIntegrityCheckFailed:
                case ExtensionSignatureVerificationCode.EntryIsMissing:
                case ExtensionSignatureVerificationCode.EntryIsTampered:
                case ExtensionSignatureVerificationCode.Untrusted:
                case ExtensionSignatureVerificationCode.CertificateRevoked:
                case ExtensionSignatureVerificationCode.SignatureIsNotValid:
                case ExtensionSignatureVerificationCode.SignatureArchiveHasTooManyEntries:
                case ExtensionSignatureVerificationCode.NotSigned:
                    throw new ExtensionManagementError(nls.localize('signature verification failed', "Signature verification failed with '{0}' error.", verificationStatus), "SignatureVerificationFailed" /* ExtensionManagementErrorCode.SignatureVerificationFailed */);
            }
            throw new ExtensionManagementError(nls.localize('signature verification failed', "Signature verification failed with '{0}' error.", verificationStatus), "SignatureVerificationInternal" /* ExtensionManagementErrorCode.SignatureVerificationInternal */);
        }
        return { location, verificationStatus };
    }
    async extractVSIX(extensionKey, location, options, token) {
        const local = await this.extensionsScanner.extractUserExtension(extensionKey, path.resolve(location.fsPath), isBoolean(options.keepExisting) ? !options.keepExisting : true, token);
        return { local };
    }
    async collectFiles(extension) {
        const collectFilesFromDirectory = async (dir) => {
            let entries = await pfs.Promises.readdir(dir);
            entries = entries.map(e => path.join(dir, e));
            const stats = await Promise.all(entries.map(e => fs.promises.stat(e)));
            let promise = Promise.resolve([]);
            stats.forEach((stat, index) => {
                const entry = entries[index];
                if (stat.isFile()) {
                    promise = promise.then(result => ([...result, entry]));
                }
                if (stat.isDirectory()) {
                    promise = promise
                        .then(result => collectFilesFromDirectory(entry)
                        .then(files => ([...result, ...files])));
                }
            });
            return promise;
        };
        const files = await collectFilesFromDirectory(extension.location.fsPath);
        return files.map(f => ({ path: `extension/${path.relative(extension.location.fsPath, f)}`, localPath: f }));
    }
    async onDidChangeExtensionsFromAnotherSource({ added, removed }) {
        if (removed) {
            const removedExtensions = added && this.uriIdentityService.extUri.isEqual(removed.profileLocation, added.profileLocation)
                ? removed.extensions.filter(e => added.extensions.every(identifier => !areSameExtensions(identifier, e)))
                : removed.extensions;
            for (const identifier of removedExtensions) {
                this.logService.info('Extensions removed from another source', identifier.id, removed.profileLocation.toString());
                this._onDidUninstallExtension.fire({ identifier, profileLocation: removed.profileLocation });
            }
        }
        if (added) {
            const extensions = await this.getInstalled(1 /* ExtensionType.User */, added.profileLocation);
            const addedExtensions = extensions.filter(e => added.extensions.some(identifier => areSameExtensions(identifier, e.identifier)));
            this._onDidInstallExtensions.fire(addedExtensions.map(local => {
                this.logService.info('Extensions added from another source', local.identifier.id, added.profileLocation.toString());
                return { identifier: local.identifier, local, profileLocation: added.profileLocation, operation: 1 /* InstallOperation.None */ };
            }));
        }
    }
    async watchForExtensionsNotInstalledBySystem() {
        this._register(this.extensionsScanner.onExtract(resource => this.knownDirectories.add(resource)));
        const stat = await this.fileService.resolve(this.extensionsScannerService.userExtensionsLocation);
        for (const childStat of stat.children ?? []) {
            if (childStat.isDirectory) {
                this.knownDirectories.add(childStat.resource);
            }
        }
        this._register(this.fileService.watch(this.extensionsScannerService.userExtensionsLocation));
        this._register(this.fileService.onDidFilesChange(e => this.onDidFilesChange(e)));
    }
    async onDidFilesChange(e) {
        if (!e.affects(this.extensionsScannerService.userExtensionsLocation, 1 /* FileChangeType.ADDED */)) {
            return;
        }
        const added = [];
        for (const resource of e.rawAdded) {
            // Check if this is a known directory
            if (this.knownDirectories.has(resource)) {
                continue;
            }
            // Is not immediate child of extensions resource
            if (!this.uriIdentityService.extUri.isEqual(this.uriIdentityService.extUri.dirname(resource), this.extensionsScannerService.userExtensionsLocation)) {
                continue;
            }
            // .obsolete file changed
            if (this.uriIdentityService.extUri.isEqual(resource, this.uriIdentityService.extUri.joinPath(this.extensionsScannerService.userExtensionsLocation, '.obsolete'))) {
                continue;
            }
            // Ignore changes to files starting with `.`
            if (this.uriIdentityService.extUri.basename(resource).startsWith('.')) {
                continue;
            }
            // Ignore changes to the deleted folder
            if (this.uriIdentityService.extUri.basename(resource).endsWith(DELETED_FOLDER_POSTFIX)) {
                continue;
            }
            try {
                // Check if this is a directory
                if (!(await this.fileService.stat(resource)).isDirectory) {
                    continue;
                }
            }
            catch (error) {
                if (toFileOperationResult(error) !== 1 /* FileOperationResult.FILE_NOT_FOUND */) {
                    this.logService.error(error);
                }
                continue;
            }
            // Check if this is an extension added by another source
            // Extension added by another source will not have installed timestamp
            const extension = await this.extensionsScanner.scanUserExtensionAtLocation(resource);
            if (extension && extension.installedTimestamp === undefined) {
                this.knownDirectories.add(resource);
                added.push(extension);
            }
        }
        if (added.length) {
            await this.addExtensionsToProfile(added.map(e => [e, undefined]), this.userDataProfilesService.defaultProfile.extensionsResource);
            this.logService.info('Added extensions to default profile from external source', added.map(e => e.identifier.id));
        }
    }
    async addExtensionsToProfile(extensions, profileLocation) {
        const localExtensions = extensions.map(e => e[0]);
        await this.extensionsScanner.unsetExtensionsForRemoval(...localExtensions.map(extension => ExtensionKey.create(extension)));
        await this.extensionsProfileScannerService.addExtensionsToProfile(extensions, profileLocation);
        this._onDidInstallExtensions.fire(localExtensions.map(local => ({ local, identifier: local.identifier, operation: 1 /* InstallOperation.None */, profileLocation })));
    }
};
ExtensionManagementService = __decorate([
    __param(0, IExtensionGalleryService),
    __param(1, ITelemetryService),
    __param(2, ILogService),
    __param(3, INativeEnvironmentService),
    __param(4, IExtensionsScannerService),
    __param(5, IExtensionsProfileScannerService),
    __param(6, IDownloadService),
    __param(7, IInstantiationService),
    __param(8, IFileService),
    __param(9, IConfigurationService),
    __param(10, IExtensionGalleryManifestService),
    __param(11, IProductService),
    __param(12, IAllowedExtensionsService),
    __param(13, IUriIdentityService),
    __param(14, IUserDataProfilesService)
], ExtensionManagementService);
export { ExtensionManagementService };
let ExtensionsScanner = class ExtensionsScanner extends Disposable {
    constructor(beforeRemovingExtension, fileService, extensionsScannerService, extensionsProfileScannerService, uriIdentityService, telemetryService, logService) {
        super();
        this.beforeRemovingExtension = beforeRemovingExtension;
        this.fileService = fileService;
        this.extensionsScannerService = extensionsScannerService;
        this.extensionsProfileScannerService = extensionsProfileScannerService;
        this.uriIdentityService = uriIdentityService;
        this.telemetryService = telemetryService;
        this.logService = logService;
        this._onExtract = this._register(new Emitter());
        this.onExtract = this._onExtract.event;
        this.scanAllExtensionPromise = new ResourceMap();
        this.scanUserExtensionsPromise = new ResourceMap();
        this.obsoletedResource = joinPath(this.extensionsScannerService.userExtensionsLocation, '.obsolete');
        this.obsoleteFileLimiter = new Queue();
    }
    async cleanUp() {
        await this.removeTemporarilyDeletedFolders();
        await this.deleteExtensionsMarkedForRemoval();
        //TODO: Remove this initiialization after coupe of releases
        await this.initializeExtensionSize();
    }
    async scanExtensions(type, profileLocation, productVersion, language) {
        try {
            const cacheKey = profileLocation.with({ query: language });
            const userScanOptions = { includeInvalid: true, profileLocation, productVersion, language };
            let scannedExtensions = [];
            if (type === null || type === 0 /* ExtensionType.System */) {
                let scanAllExtensionsPromise = this.scanAllExtensionPromise.get(cacheKey);
                if (!scanAllExtensionsPromise) {
                    scanAllExtensionsPromise = this.extensionsScannerService.scanAllExtensions({ language }, userScanOptions)
                        .finally(() => this.scanAllExtensionPromise.delete(cacheKey));
                    this.scanAllExtensionPromise.set(cacheKey, scanAllExtensionsPromise);
                }
                scannedExtensions.push(...await scanAllExtensionsPromise);
            }
            else if (type === 1 /* ExtensionType.User */) {
                let scanUserExtensionsPromise = this.scanUserExtensionsPromise.get(cacheKey);
                if (!scanUserExtensionsPromise) {
                    scanUserExtensionsPromise = this.extensionsScannerService.scanUserExtensions(userScanOptions)
                        .finally(() => this.scanUserExtensionsPromise.delete(cacheKey));
                    this.scanUserExtensionsPromise.set(cacheKey, scanUserExtensionsPromise);
                }
                scannedExtensions.push(...await scanUserExtensionsPromise);
            }
            scannedExtensions = type !== null ? scannedExtensions.filter(r => r.type === type) : scannedExtensions;
            return await Promise.all(scannedExtensions.map(extension => this.toLocalExtension(extension)));
        }
        catch (error) {
            throw toExtensionManagementError(error, "Scanning" /* ExtensionManagementErrorCode.Scanning */);
        }
    }
    async scanAllUserExtensions() {
        try {
            const scannedExtensions = await this.extensionsScannerService.scanAllUserExtensions();
            return await Promise.all(scannedExtensions.map(extension => this.toLocalExtension(extension)));
        }
        catch (error) {
            throw toExtensionManagementError(error, "Scanning" /* ExtensionManagementErrorCode.Scanning */);
        }
    }
    async scanUserExtensionAtLocation(location) {
        try {
            const scannedExtension = await this.extensionsScannerService.scanExistingExtension(location, 1 /* ExtensionType.User */, { includeInvalid: true });
            if (scannedExtension) {
                return await this.toLocalExtension(scannedExtension);
            }
        }
        catch (error) {
            this.logService.error(error);
        }
        return null;
    }
    async extractUserExtension(extensionKey, zipPath, removeIfExists, token) {
        const folderName = extensionKey.toString();
        const tempLocation = URI.file(path.join(this.extensionsScannerService.userExtensionsLocation.fsPath, `.${generateUuid()}`));
        const extensionLocation = URI.file(path.join(this.extensionsScannerService.userExtensionsLocation.fsPath, folderName));
        if (await this.fileService.exists(extensionLocation)) {
            if (!removeIfExists) {
                try {
                    return await this.scanLocalExtension(extensionLocation, 1 /* ExtensionType.User */);
                }
                catch (error) {
                    this.logService.warn(`Error while scanning the existing extension at ${extensionLocation.path}. Deleting the existing extension and extracting it.`, getErrorMessage(error));
                }
            }
            try {
                await this.deleteExtensionFromLocation(extensionKey.id, extensionLocation, 'removeExisting');
            }
            catch (error) {
                throw new ExtensionManagementError(nls.localize('errorDeleting', "Unable to delete the existing folder '{0}' while installing the extension '{1}'. Please delete the folder manually and try again", extensionLocation.fsPath, extensionKey.id), "Delete" /* ExtensionManagementErrorCode.Delete */);
            }
        }
        try {
            if (token.isCancellationRequested) {
                throw new CancellationError();
            }
            // Extract
            try {
                this.logService.trace(`Started extracting the extension from ${zipPath} to ${extensionLocation.fsPath}`);
                await extract(zipPath, tempLocation.fsPath, { sourcePath: 'extension', overwrite: true }, token);
                this.logService.info(`Extracted extension to ${extensionLocation}:`, extensionKey.id);
            }
            catch (e) {
                throw fromExtractError(e);
            }
            const metadata = { installedTimestamp: Date.now(), targetPlatform: extensionKey.targetPlatform };
            try {
                metadata.size = await computeSize(tempLocation, this.fileService);
            }
            catch (error) {
                // Log & ignore
                this.logService.warn(`Error while getting the size of the extracted extension : ${tempLocation.fsPath}`, getErrorMessage(error));
            }
            try {
                await this.extensionsScannerService.updateManifestMetadata(tempLocation, metadata);
            }
            catch (error) {
                this.telemetryService.publicLog2('extension:extract', { extensionId: extensionKey.id, code: `${toFileOperationResult(error)}` });
                throw toExtensionManagementError(error, "UpdateMetadata" /* ExtensionManagementErrorCode.UpdateMetadata */);
            }
            if (token.isCancellationRequested) {
                throw new CancellationError();
            }
            // Rename
            try {
                this.logService.trace(`Started renaming the extension from ${tempLocation.fsPath} to ${extensionLocation.fsPath}`);
                await this.rename(tempLocation.fsPath, extensionLocation.fsPath);
                this.logService.info('Renamed to', extensionLocation.fsPath);
            }
            catch (error) {
                if (error.code === 'ENOTEMPTY') {
                    this.logService.info(`Rename failed because extension was installed by another source. So ignoring renaming.`, extensionKey.id);
                    try {
                        await this.fileService.del(tempLocation, { recursive: true });
                    }
                    catch (e) { /* ignore */ }
                }
                else {
                    this.logService.info(`Rename failed because of ${getErrorMessage(error)}. Deleted from extracted location`, tempLocation);
                    throw error;
                }
            }
            this._onExtract.fire(extensionLocation);
        }
        catch (error) {
            try {
                await this.fileService.del(tempLocation, { recursive: true });
            }
            catch (e) { /* ignore */ }
            throw error;
        }
        return this.scanLocalExtension(extensionLocation, 1 /* ExtensionType.User */);
    }
    async scanMetadata(local, profileLocation) {
        const extension = await this.getScannedExtension(local, profileLocation);
        return extension?.metadata;
    }
    async getScannedExtension(local, profileLocation) {
        const extensions = await this.extensionsProfileScannerService.scanProfileExtensions(profileLocation);
        return extensions.find(e => areSameExtensions(e.identifier, local.identifier));
    }
    async updateMetadata(local, metadata, profileLocation) {
        try {
            await this.extensionsProfileScannerService.updateMetadata([[local, metadata]], profileLocation);
        }
        catch (error) {
            this.telemetryService.publicLog2('extension:extract', { extensionId: local.identifier.id, code: `${toFileOperationResult(error)}`, isProfile: !!profileLocation });
            throw toExtensionManagementError(error, "UpdateMetadata" /* ExtensionManagementErrorCode.UpdateMetadata */);
        }
        return this.scanLocalExtension(local.location, local.type, profileLocation);
    }
    async setExtensionsForRemoval(...extensions) {
        const extensionsToRemove = [];
        for (const extension of extensions) {
            if (await this.fileService.exists(extension.location)) {
                extensionsToRemove.push(extension);
            }
        }
        const extensionKeys = extensionsToRemove.map(e => ExtensionKey.create(e));
        await this.withRemovedExtensions(removedExtensions => extensionKeys.forEach(extensionKey => {
            removedExtensions[extensionKey.toString()] = true;
            this.logService.info('Marked extension as removed', extensionKey.toString());
        }));
    }
    async unsetExtensionsForRemoval(...extensionKeys) {
        try {
            const results = [];
            await this.withRemovedExtensions(removedExtensions => extensionKeys.forEach(extensionKey => {
                if (removedExtensions[extensionKey.toString()]) {
                    results.push(true);
                    delete removedExtensions[extensionKey.toString()];
                }
                else {
                    results.push(false);
                }
            }));
            return results;
        }
        catch (error) {
            throw toExtensionManagementError(error, "UnsetRemoved" /* ExtensionManagementErrorCode.UnsetRemoved */);
        }
    }
    async deleteExtension(extension, type) {
        if (this.uriIdentityService.extUri.isEqualOrParent(extension.location, this.extensionsScannerService.userExtensionsLocation)) {
            await this.deleteExtensionFromLocation(extension.identifier.id, extension.location, type);
            await this.unsetExtensionsForRemoval(ExtensionKey.create(extension));
        }
    }
    async copyExtension(extension, fromProfileLocation, toProfileLocation, metadata) {
        const source = await this.getScannedExtension(extension, fromProfileLocation);
        const target = await this.getScannedExtension(extension, toProfileLocation);
        metadata = { ...source?.metadata, ...metadata };
        if (target) {
            if (this.uriIdentityService.extUri.isEqual(target.location, extension.location)) {
                await this.extensionsProfileScannerService.updateMetadata([[extension, { ...target.metadata, ...metadata }]], toProfileLocation);
            }
            else {
                const targetExtension = await this.scanLocalExtension(target.location, extension.type, toProfileLocation);
                await this.extensionsProfileScannerService.removeExtensionsFromProfile([targetExtension.identifier], toProfileLocation);
                await this.extensionsProfileScannerService.addExtensionsToProfile([[extension, { ...target.metadata, ...metadata }]], toProfileLocation);
            }
        }
        else {
            await this.extensionsProfileScannerService.addExtensionsToProfile([[extension, metadata]], toProfileLocation);
        }
        return this.scanLocalExtension(extension.location, extension.type, toProfileLocation);
    }
    async moveExtension(extension, fromProfileLocation, toProfileLocation, metadata) {
        const source = await this.getScannedExtension(extension, fromProfileLocation);
        const target = await this.getScannedExtension(extension, toProfileLocation);
        metadata = { ...source?.metadata, ...metadata };
        if (target) {
            if (this.uriIdentityService.extUri.isEqual(target.location, extension.location)) {
                await this.extensionsProfileScannerService.updateMetadata([[extension, { ...target.metadata, ...metadata }]], toProfileLocation);
            }
            else {
                const targetExtension = await this.scanLocalExtension(target.location, extension.type, toProfileLocation);
                await this.removeExtension(targetExtension.identifier, toProfileLocation);
                await this.extensionsProfileScannerService.addExtensionsToProfile([[extension, { ...target.metadata, ...metadata }]], toProfileLocation);
            }
        }
        else {
            await this.extensionsProfileScannerService.addExtensionsToProfile([[extension, metadata]], toProfileLocation);
            if (source) {
                await this.removeExtension(source.identifier, fromProfileLocation);
            }
        }
        return this.scanLocalExtension(extension.location, extension.type, toProfileLocation);
    }
    async removeExtension(identifier, fromProfileLocation) {
        await this.extensionsProfileScannerService.removeExtensionsFromProfile([identifier], fromProfileLocation);
    }
    async copyExtensions(fromProfileLocation, toProfileLocation, productVersion) {
        const fromExtensions = await this.scanExtensions(1 /* ExtensionType.User */, fromProfileLocation, productVersion);
        const extensions = await Promise.all(fromExtensions
            .filter(e => !e.isApplicationScoped) /* remove application scoped extensions */
            .map(async (e) => ([e, await this.scanMetadata(e, fromProfileLocation)])));
        await this.extensionsProfileScannerService.addExtensionsToProfile(extensions, toProfileLocation);
    }
    async deleteExtensionFromLocation(id, location, type) {
        this.logService.trace(`Deleting ${type} extension from disk`, id, location.fsPath);
        const renamedLocation = this.uriIdentityService.extUri.joinPath(this.uriIdentityService.extUri.dirname(location), `${this.uriIdentityService.extUri.basename(location)}.${hash(generateUuid()).toString(16)}${DELETED_FOLDER_POSTFIX}`);
        await this.rename(location.fsPath, renamedLocation.fsPath);
        await this.fileService.del(renamedLocation, { recursive: true });
        this.logService.info(`Deleted ${type} extension from disk`, id, location.fsPath);
    }
    withRemovedExtensions(updateFn) {
        return this.obsoleteFileLimiter.queue(async () => {
            let raw;
            try {
                const content = await this.fileService.readFile(this.obsoletedResource, 'utf8');
                raw = content.value.toString();
            }
            catch (error) {
                if (toFileOperationResult(error) !== 1 /* FileOperationResult.FILE_NOT_FOUND */) {
                    throw error;
                }
            }
            let removed = {};
            if (raw) {
                try {
                    removed = JSON.parse(raw);
                }
                catch (e) { /* ignore */ }
            }
            if (updateFn) {
                updateFn(removed);
                if (Object.keys(removed).length) {
                    await this.fileService.writeFile(this.obsoletedResource, VSBuffer.fromString(JSON.stringify(removed)));
                }
                else {
                    try {
                        await this.fileService.del(this.obsoletedResource);
                    }
                    catch (error) {
                        if (toFileOperationResult(error) !== 1 /* FileOperationResult.FILE_NOT_FOUND */) {
                            throw error;
                        }
                    }
                }
            }
            return removed;
        });
    }
    async rename(extractPath, renamePath) {
        try {
            await pfs.Promises.rename(extractPath, renamePath, 2 * 60 * 1000 /* Retry for 2 minutes */);
        }
        catch (error) {
            throw toExtensionManagementError(error, "Rename" /* ExtensionManagementErrorCode.Rename */);
        }
    }
    async scanLocalExtension(location, type, profileLocation) {
        try {
            if (profileLocation) {
                const scannedExtensions = await this.extensionsScannerService.scanUserExtensions({ profileLocation });
                const scannedExtension = scannedExtensions.find(e => this.uriIdentityService.extUri.isEqual(e.location, location));
                if (scannedExtension) {
                    return await this.toLocalExtension(scannedExtension);
                }
            }
            else {
                const scannedExtension = await this.extensionsScannerService.scanExistingExtension(location, type, { includeInvalid: true });
                if (scannedExtension) {
                    return await this.toLocalExtension(scannedExtension);
                }
            }
            throw new ExtensionManagementError(nls.localize('cannot read', "Cannot read the extension from {0}", location.path), "ScanningExtension" /* ExtensionManagementErrorCode.ScanningExtension */);
        }
        catch (error) {
            throw toExtensionManagementError(error, "ScanningExtension" /* ExtensionManagementErrorCode.ScanningExtension */);
        }
    }
    async toLocalExtension(extension) {
        let stat;
        try {
            stat = await this.fileService.resolve(extension.location);
        }
        catch (error) { /* ignore */ }
        let readmeUrl;
        let changelogUrl;
        if (stat?.children) {
            readmeUrl = stat.children.find(({ name }) => /^readme(\.txt|\.md|)$/i.test(name))?.resource;
            changelogUrl = stat.children.find(({ name }) => /^changelog(\.txt|\.md|)$/i.test(name))?.resource;
        }
        return {
            identifier: extension.identifier,
            type: extension.type,
            isBuiltin: extension.isBuiltin || !!extension.metadata?.isBuiltin,
            location: extension.location,
            manifest: extension.manifest,
            targetPlatform: extension.targetPlatform,
            validations: extension.validations,
            isValid: extension.isValid,
            readmeUrl,
            changelogUrl,
            publisherDisplayName: extension.metadata?.publisherDisplayName,
            publisherId: extension.metadata?.publisherId || null,
            isApplicationScoped: !!extension.metadata?.isApplicationScoped,
            isMachineScoped: !!extension.metadata?.isMachineScoped,
            isPreReleaseVersion: !!extension.metadata?.isPreReleaseVersion,
            hasPreReleaseVersion: !!extension.metadata?.hasPreReleaseVersion,
            preRelease: extension.preRelease,
            installedTimestamp: extension.metadata?.installedTimestamp,
            updated: !!extension.metadata?.updated,
            pinned: !!extension.metadata?.pinned,
            private: !!extension.metadata?.private,
            isWorkspaceScoped: false,
            source: extension.metadata?.source ?? (extension.identifier.uuid ? 'gallery' : 'vsix'),
            size: extension.metadata?.size ?? 0,
        };
    }
    async initializeExtensionSize() {
        const extensions = await this.extensionsScannerService.scanAllUserExtensions();
        await Promise.all(extensions.map(async (extension) => {
            // set size if not set before
            if (isDefined(extension.metadata?.installedTimestamp) && isUndefined(extension.metadata?.size)) {
                const size = await computeSize(extension.location, this.fileService);
                await this.extensionsScannerService.updateManifestMetadata(extension.location, { size });
            }
        }));
    }
    async deleteExtensionsMarkedForRemoval() {
        let removed;
        try {
            removed = await this.withRemovedExtensions();
        }
        catch (error) {
            throw toExtensionManagementError(error, "ReadRemoved" /* ExtensionManagementErrorCode.ReadRemoved */);
        }
        if (Object.keys(removed).length === 0) {
            this.logService.debug(`No extensions are marked as removed.`);
            return;
        }
        this.logService.debug(`Deleting extensions marked as removed:`, Object.keys(removed));
        const extensions = await this.scanAllUserExtensions();
        const installed = new Set();
        for (const e of extensions) {
            if (!removed[ExtensionKey.create(e).toString()]) {
                installed.add(e.identifier.id.toLowerCase());
            }
        }
        try {
            // running post uninstall tasks for extensions that are not installed anymore
            const byExtension = groupByExtension(extensions, e => e.identifier);
            await Promises.settled(byExtension.map(async (e) => {
                const latest = e.sort((a, b) => semver.rcompare(a.manifest.version, b.manifest.version))[0];
                if (!installed.has(latest.identifier.id.toLowerCase())) {
                    await this.beforeRemovingExtension(latest);
                }
            }));
        }
        catch (error) {
            this.logService.error(error);
        }
        const toRemove = extensions.filter(e => e.installedTimestamp /* Installed by System */ && removed[ExtensionKey.create(e).toString()]);
        await Promise.allSettled(toRemove.map(e => this.deleteExtension(e, 'marked for removal')));
    }
    async removeTemporarilyDeletedFolders() {
        this.logService.trace('ExtensionManagementService#removeTempDeleteFolders');
        let stat;
        try {
            stat = await this.fileService.resolve(this.extensionsScannerService.userExtensionsLocation);
        }
        catch (error) {
            if (toFileOperationResult(error) !== 1 /* FileOperationResult.FILE_NOT_FOUND */) {
                this.logService.error(error);
            }
            return;
        }
        if (!stat?.children) {
            return;
        }
        try {
            await Promise.allSettled(stat.children.map(async (child) => {
                if (!child.isDirectory || !child.name.endsWith(DELETED_FOLDER_POSTFIX)) {
                    return;
                }
                this.logService.trace('Deleting the temporarily deleted folder', child.resource.toString());
                try {
                    await this.fileService.del(child.resource, { recursive: true });
                    this.logService.trace('Deleted the temporarily deleted folder', child.resource.toString());
                }
                catch (error) {
                    if (toFileOperationResult(error) !== 1 /* FileOperationResult.FILE_NOT_FOUND */) {
                        this.logService.error(error);
                    }
                }
            }));
        }
        catch (error) { /* ignore */ }
    }
};
ExtensionsScanner = __decorate([
    __param(1, IFileService),
    __param(2, IExtensionsScannerService),
    __param(3, IExtensionsProfileScannerService),
    __param(4, IUriIdentityService),
    __param(5, ITelemetryService),
    __param(6, ILogService)
], ExtensionsScanner);
export { ExtensionsScanner };
let InstallExtensionInProfileTask = class InstallExtensionInProfileTask extends AbstractExtensionTask {
    get operation() { return this.options.operation ?? this._operation; }
    get verificationStatus() { return this._verificationStatus; }
    constructor(extensionKey, manifest, source, options, extractExtensionFn, extensionsScanner, uriIdentityService, galleryService, userDataProfilesService, extensionsScannerService, extensionsProfileScannerService, logService) {
        super();
        this.extensionKey = extensionKey;
        this.manifest = manifest;
        this.source = source;
        this.options = options;
        this.extractExtensionFn = extractExtensionFn;
        this.extensionsScanner = extensionsScanner;
        this.uriIdentityService = uriIdentityService;
        this.galleryService = galleryService;
        this.userDataProfilesService = userDataProfilesService;
        this.extensionsScannerService = extensionsScannerService;
        this.extensionsProfileScannerService = extensionsProfileScannerService;
        this.logService = logService;
        this._operation = 2 /* InstallOperation.Install */;
        this.identifier = this.extensionKey.identifier;
    }
    async doRun(token) {
        const installed = await this.extensionsScanner.scanExtensions(1 /* ExtensionType.User */, this.options.profileLocation, this.options.productVersion);
        const existingExtension = installed.find(i => areSameExtensions(i.identifier, this.identifier));
        if (existingExtension) {
            this._operation = 3 /* InstallOperation.Update */;
        }
        const metadata = {
            isApplicationScoped: this.options.isApplicationScoped || existingExtension?.isApplicationScoped,
            isMachineScoped: this.options.isMachineScoped || existingExtension?.isMachineScoped,
            isBuiltin: this.options.isBuiltin || existingExtension?.isBuiltin,
            isSystem: existingExtension?.type === 0 /* ExtensionType.System */ ? true : undefined,
            installedTimestamp: Date.now(),
            pinned: this.options.installGivenVersion ? true : (this.options.pinned ?? existingExtension?.pinned),
            source: this.source instanceof URI ? 'vsix' : 'gallery',
        };
        let local;
        // VSIX
        if (this.source instanceof URI) {
            if (existingExtension) {
                if (this.extensionKey.equals(new ExtensionKey(existingExtension.identifier, existingExtension.manifest.version))) {
                    try {
                        await this.extensionsScanner.deleteExtension(existingExtension, 'existing');
                    }
                    catch (e) {
                        throw new Error(nls.localize('restartCode', "Please restart VS Code before reinstalling {0}.", this.manifest.displayName || this.manifest.name));
                    }
                }
            }
            // Remove the extension with same version if it is already uninstalled.
            // Installing a VSIX extension shall replace the existing extension always.
            const existingWithSameVersion = await this.unsetIfRemoved(this.extensionKey);
            if (existingWithSameVersion) {
                try {
                    await this.extensionsScanner.deleteExtension(existingWithSameVersion, 'existing');
                }
                catch (e) {
                    throw new Error(nls.localize('restartCode', "Please restart VS Code before reinstalling {0}.", this.manifest.displayName || this.manifest.name));
                }
            }
        }
        // Gallery
        else {
            metadata.id = this.source.identifier.uuid;
            metadata.publisherId = this.source.publisherId;
            metadata.publisherDisplayName = this.source.publisherDisplayName;
            metadata.targetPlatform = this.source.properties.targetPlatform;
            metadata.updated = !!existingExtension;
            metadata.private = this.source.private;
            metadata.isPreReleaseVersion = this.source.properties.isPreReleaseVersion;
            metadata.hasPreReleaseVersion = existingExtension?.hasPreReleaseVersion || this.source.properties.isPreReleaseVersion;
            metadata.preRelease = isBoolean(this.options.preRelease)
                ? this.options.preRelease
                : this.options.installPreReleaseVersion || this.source.properties.isPreReleaseVersion || existingExtension?.preRelease;
            if (existingExtension && existingExtension.type !== 0 /* ExtensionType.System */ && existingExtension.manifest.version === this.source.version) {
                return this.extensionsScanner.updateMetadata(existingExtension, metadata, this.options.profileLocation);
            }
            // Unset if the extension is uninstalled and return the unset extension.
            local = await this.unsetIfRemoved(this.extensionKey);
        }
        if (token.isCancellationRequested) {
            throw toExtensionManagementError(new CancellationError());
        }
        if (!local) {
            const result = await this.extractExtensionFn(this.operation, token);
            local = result.local;
            this._verificationStatus = result.verificationStatus;
        }
        if (this.uriIdentityService.extUri.isEqual(this.userDataProfilesService.defaultProfile.extensionsResource, this.options.profileLocation)) {
            try {
                await this.extensionsScannerService.initializeDefaultProfileExtensions();
            }
            catch (error) {
                throw toExtensionManagementError(error, "IntializeDefaultProfile" /* ExtensionManagementErrorCode.IntializeDefaultProfile */);
            }
        }
        if (token.isCancellationRequested) {
            throw toExtensionManagementError(new CancellationError());
        }
        try {
            await this.extensionsProfileScannerService.addExtensionsToProfile([[local, metadata]], this.options.profileLocation, !local.isValid);
        }
        catch (error) {
            throw toExtensionManagementError(error, "AddToProfile" /* ExtensionManagementErrorCode.AddToProfile */);
        }
        const result = await this.extensionsScanner.scanLocalExtension(local.location, 1 /* ExtensionType.User */, this.options.profileLocation);
        if (!result) {
            throw new ExtensionManagementError('Cannot find the installed extension', "InstalledExtensionNotFound" /* ExtensionManagementErrorCode.InstalledExtensionNotFound */);
        }
        if (this.source instanceof URI) {
            this.updateMetadata(local, token);
        }
        return result;
    }
    async unsetIfRemoved(extensionKey) {
        // If the same version of extension is marked as removed, remove it from there and return the local.
        const [removed] = await this.extensionsScanner.unsetExtensionsForRemoval(extensionKey);
        if (removed) {
            this.logService.info('Removed the extension from removed list:', extensionKey.id);
            const userExtensions = await this.extensionsScanner.scanAllUserExtensions();
            return userExtensions.find(i => ExtensionKey.create(i).equals(extensionKey));
        }
        return undefined;
    }
    async updateMetadata(extension, token) {
        try {
            let [galleryExtension] = await this.galleryService.getExtensions([{ id: extension.identifier.id, version: extension.manifest.version }], token);
            if (!galleryExtension) {
                [galleryExtension] = await this.galleryService.getExtensions([{ id: extension.identifier.id }], token);
            }
            if (galleryExtension) {
                const metadata = {
                    id: galleryExtension.identifier.uuid,
                    publisherDisplayName: galleryExtension.publisherDisplayName,
                    publisherId: galleryExtension.publisherId,
                    isPreReleaseVersion: galleryExtension.properties.isPreReleaseVersion,
                    hasPreReleaseVersion: extension.hasPreReleaseVersion || galleryExtension.properties.isPreReleaseVersion,
                    preRelease: galleryExtension.properties.isPreReleaseVersion || this.options.installPreReleaseVersion
                };
                await this.extensionsScanner.updateMetadata(extension, metadata, this.options.profileLocation);
            }
        }
        catch (error) {
            /* Ignore Error */
        }
    }
};
InstallExtensionInProfileTask = __decorate([
    __param(6, IUriIdentityService),
    __param(7, IExtensionGalleryService),
    __param(8, IUserDataProfilesService),
    __param(9, IExtensionsScannerService),
    __param(10, IExtensionsProfileScannerService),
    __param(11, ILogService)
], InstallExtensionInProfileTask);
class UninstallExtensionInProfileTask extends AbstractExtensionTask {
    constructor(extension, options, extensionsProfileScannerService) {
        super();
        this.extension = extension;
        this.options = options;
        this.extensionsProfileScannerService = extensionsProfileScannerService;
    }
    doRun(token) {
        return this.extensionsProfileScannerService.removeExtensionsFromProfile([this.extension.identifier], this.options.profileLocation);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uTWFuYWdlbWVudFNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9hZHZpa2FyL0RvY3VtZW50cy9hcmNoaXRlY3QvYXJjaDIvQXJjaElERS9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9leHRlbnNpb25NYW5hZ2VtZW50L25vZGUvZXh0ZW5zaW9uTWFuYWdlbWVudFNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLEVBQUUsTUFBTSxJQUFJLENBQUM7QUFDekIsT0FBTyxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUNoRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFHMUQsT0FBTyxFQUFFLGlCQUFpQixFQUFFLGVBQWUsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ3BGLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUN4RCxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFDcEQsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQy9ELE9BQU8sRUFBRSxXQUFXLEVBQUUsV0FBVyxFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFDdkUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQzFELE9BQU8sS0FBSyxJQUFJLE1BQU0sOEJBQThCLENBQUM7QUFDckQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQzdELE9BQU8sS0FBSyxNQUFNLE1BQU0sdUNBQXVDLENBQUM7QUFDaEUsT0FBTyxFQUFFLFNBQVMsRUFBRSxTQUFTLEVBQUUsV0FBVyxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDbEYsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBQ2xELE9B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