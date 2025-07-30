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
import { createDecorator, IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { Emitter } from '../../../../base/common/event.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { Memento } from '../../../common/memento.js';
import { Action2, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { ContextKeyExpr, IContextKeyService, RawContextKey } from '../../../../platform/contextkey/common/contextkey.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { IUserDataSyncEnablementService } from '../../../../platform/userDataSync/common/userDataSync.js';
import { ExtensionIdentifier } from '../../../../platform/extensions/common/extensions.js';
import { URI } from '../../../../base/common/uri.js';
import { joinPath } from '../../../../base/common/resources.js';
import { FileAccess } from '../../../../base/common/network.js';
import { EXTENSION_INSTALL_DEP_PACK_CONTEXT, EXTENSION_INSTALL_SKIP_WALKTHROUGH_CONTEXT, IExtensionManagementService } from '../../../../platform/extensionManagement/common/extensionManagement.js';
import { walkthroughs } from '../common/gettingStartedContent.js';
import { IWorkbenchAssignmentService } from '../../../services/assignment/common/assignmentService.js';
import { IHostService } from '../../../services/host/browser/host.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { parseLinkedText } from '../../../../base/common/linkedText.js';
import { walkthroughsExtensionPoint } from './gettingStartedExtensionPoint.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { dirname } from '../../../../base/common/path.js';
import { coalesce } from '../../../../base/common/arrays.js';
import { IViewsService } from '../../../services/views/common/viewsService.js';
import { localize, localize2 } from '../../../../nls.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { checkGlobFileExists } from '../../../services/extensions/common/workspaceContains.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { asWebviewUri } from '../../webview/common/webview.js';
import { IWorkbenchLayoutService } from '../../../services/layout/browser/layoutService.js';
import { extensionDefaultIcon } from '../../../services/extensionManagement/common/extensionsIcons.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { GettingStartedInput } from './gettingStartedInput.js';
export const HasMultipleNewFileEntries = new RawContextKey('hasMultipleNewFileEntries', false);
export const IWalkthroughsService = createDecorator('walkthroughsService');
export const hiddenEntriesConfigurationKey = 'workbench.welcomePage.hiddenCategories';
export const walkthroughMetadataConfigurationKey = 'workbench.welcomePage.walkthroughMetadata';
const BUILT_IN_SOURCE = localize('builtin', "Built-In");
// Show walkthrough as "new" for 7 days after first install
const DAYS = 24 * 60 * 60 * 1000;
const NEW_WALKTHROUGH_TIME = 7 * DAYS;
let WalkthroughsService = class WalkthroughsService extends Disposable {
    constructor(storageService, commandService, instantiationService, workspaceContextService, contextService, userDataSyncEnablementService, configurationService, extensionManagementService, hostService, viewsService, telemetryService, tasExperimentService, productService, layoutService, editorService) {
        super();
        this.storageService = storageService;
        this.commandService = commandService;
        this.instantiationService = instantiationService;
        this.workspaceContextService = workspaceContextService;
        this.contextService = contextService;
        this.userDataSyncEnablementService = userDataSyncEnablementService;
        this.configurationService = configurationService;
        this.extensionManagementService = extensionManagementService;
        this.hostService = hostService;
        this.viewsService = viewsService;
        this.telemetryService = telemetryService;
        this.tasExperimentService = tasExperimentService;
        this.productService = productService;
        this.layoutService = layoutService;
        this.editorService = editorService;
        this._onDidAddWalkthrough = new Emitter();
        this.onDidAddWalkthrough = this._onDidAddWalkthrough.event;
        this._onDidRemoveWalkthrough = new Emitter();
        this.onDidRemoveWalkthrough = this._onDidRemoveWalkthrough.event;
        this._onDidChangeWalkthrough = new Emitter();
        this.onDidChangeWalkthrough = this._onDidChangeWalkthrough.event;
        this._onDidProgressStep = new Emitter();
        this.onDidProgressStep = this._onDidProgressStep.event;
        this.sessionEvents = new Set();
        this.completionListeners = new Map();
        this.gettingStartedContributions = new Map();
        this.steps = new Map();
        this.sessionInstalledExtensions = new Set();
        this.categoryVisibilityContextKeys = new Set();
        this.stepCompletionContextKeyExpressions = new Set();
        this.stepCompletionContextKeys = new Set();
        this.metadata = new Map(JSON.parse(this.storageService.get(walkthroughMetadataConfigurationKey, 0 /* StorageScope.PROFILE */, '[]')));
        this.memento = new Memento('gettingStartedService', this.storageService);
        this.stepProgress = this.memento.getMemento(0 /* StorageScope.PROFILE */, 0 /* StorageTarget.USER */);
        this.initCompletionEventListeners();
        HasMultipleNewFileEntries.bindTo(this.contextService).set(false);
        this.registerWalkthroughs();
    }
    registerWalkthroughs() {
        walkthroughs.forEach(async (category, index) => {
            this._registerWalkthrough({
                ...category,
                icon: { type: 'icon', icon: category.icon },
                order: walkthroughs.length - index,
                source: BUILT_IN_SOURCE,
                when: ContextKeyExpr.deserialize(category.when) ?? ContextKeyExpr.true(),
                steps: category.content.steps.map((step, index) => {
                    return ({
                        ...step,
                        completionEvents: step.completionEvents ?? [],
                        description: parseDescription(step.description),
                        category: category.id,
                        order: index,
                        when: ContextKeyExpr.deserialize(step.when) ?? ContextKeyExpr.true(),
                        media: step.media.type === 'image'
                            ? {
                                type: 'image',
                                altText: step.media.altText,
                                path: convertInternalMediaPathsToBrowserURIs(step.media.path)
                            }
                            : step.media.type === 'svg'
                                ? {
                                    type: 'svg',
                                    altText: step.media.altText,
                                    path: convertInternalMediaPathToFileURI(step.media.path).with({ query: JSON.stringify({ moduleId: 'vs/workbench/contrib/welcomeGettingStarted/common/media/' + step.media.path }) })
                                }
                                : step.media.type === 'markdown'
                                    ? {
                                        type: 'markdown',
                                        path: convertInternalMediaPathToFileURI(step.media.path).with({ query: JSON.stringify({ moduleId: 'vs/workbench/contrib/welcomeGettingStarted/common/media/' + step.media.path }) }),
                                        base: FileAccess.asFileUri('vs/workbench/contrib/welcomeGettingStarted/common/media/'),
                                        root: FileAccess.asFileUri('vs/workbench/contrib/welcomeGettingStarted/common/media/'),
                                    }
                                    : {
                                        type: 'video',
                                        path: convertRelativeMediaPathsToWebviewURIs(FileAccess.asFileUri('vs/workbench/contrib/welcomeGettingStarted/common/media/'), step.media.path),
                                        altText: step.media.altText,
                                        root: FileAccess.asFileUri('vs/workbench/contrib/welcomeGettingStarted/common/media/'),
                                        poster: step.media.poster ? convertRelativeMediaPathsToWebviewURIs(FileAccess.asFileUri('vs/workbench/contrib/welcomeGettingStarted/common/media/'), step.media.poster) : undefined
                                    },
                    });
                })
            });
        });
        walkthroughsExtensionPoint.setHandler((_, { added, removed }) => {
            added.map(e => this.registerExtensionWalkthroughContributions(e.description));
            removed.map(e => this.unregisterExtensionWalkthroughContributions(e.description));
        });
    }
    initCompletionEventListeners() {
        this._register(this.commandService.onDidExecuteCommand(command => this.progressByEvent(`onCommand:${command.commandId}`)));
        this.extensionManagementService.getInstalled().then(installed => {
            installed.forEach(ext => this.progressByEvent(`extensionInstalled:${ext.identifier.id.toLowerCase()}`));
        });
        this._register(this.extensionManagementService.onDidInstallExtensions((result) => {
            if (result.some(e => ExtensionIdentifier.equals(this.productService.defaultChatAgent?.extensionId, e.identifier.id) && !e?.context?.[EXTENSION_INSTALL_SKIP_WALKTHROUGH_CONTEXT])) {
                result.forEach(e => {
                    this.sessionInstalledExtensions.add(e.identifier.id.toLowerCase());
                    this.progressByEvent(`extensionInstalled:${e.identifier.id.toLowerCase()}`);
                });
                return;
            }
            for (const e of result) {
                const skipWalkthrough = e?.context?.[EXTENSION_INSTALL_SKIP_WALKTHROUGH_CONTEXT] || e?.context?.[EXTENSION_INSTALL_DEP_PACK_CONTEXT];
                // If the window had last focus and the install didn't specify to skip the walkthrough
                // Then add it to the sessionInstallExtensions to be opened
                if (!skipWalkthrough) {
                    this.sessionInstalledExtensions.add(e.identifier.id.toLowerCase());
                }
                this.progressByEvent(`extensionInstalled:${e.identifier.id.toLowerCase()}`);
            }
        }));
        this._register(this.contextService.onDidChangeContext(event => {
            if (event.affectsSome(this.stepCompletionContextKeys)) {
                this.stepCompletionContextKeyExpressions.forEach(expression => {
                    if (event.affectsSome(new Set(expression.keys())) && this.contextService.contextMatchesRules(expression)) {
                        this.progressByEvent(`onContext:` + expression.serialize());
                    }
                });
            }
        }));
        this._register(this.viewsService.onDidChangeViewVisibility(e => {
            if (e.visible) {
                this.progressByEvent('onView:' + e.id);
            }
        }));
        this._register(this.configurationService.onDidChangeConfiguration(e => {
            e.affectedKeys.forEach(key => { this.progressByEvent('onSettingChanged:' + key); });
        }));
        if (this.userDataSyncEnablementService.isEnabled()) {
            this.progressByEvent('onEvent:sync-enabled');
        }
        this._register(this.userDataSyncEnablementService.onDidChangeEnablement(() => {
            if (this.userDataSyncEnablementService.isEnabled()) {
                this.progressByEvent('onEvent:sync-enabled');
            }
        }));
    }
    markWalkthroughOpened(id) {
        const walkthrough = this.gettingStartedContributions.get(id);
        const prior = this.metadata.get(id);
        if (prior && walkthrough) {
            this.metadata.set(id, { ...prior, manaullyOpened: true, stepIDs: walkthrough.steps.map(s => s.id) });
        }
        this.storageService.store(walkthroughMetadataConfigurationKey, JSON.stringify([...this.metadata.entries()]), 0 /* StorageScope.PROFILE */, 0 /* StorageTarget.USER */);
    }
    async registerExtensionWalkthroughContributions(extension) {
        const convertExtensionPathToFileURI = (path) => path.startsWith('https://')
            ? URI.parse(path, true)
            : FileAccess.uriToFileUri(joinPath(extension.extensionLocation, path));
        const convertExtensionRelativePathsToBrowserURIs = (path) => {
            const convertPath = (path) => path.startsWith('https://')
                ? URI.parse(path, true)
                : FileAccess.uriToBrowserUri(joinPath(extension.extensionLocation, path));
            if (typeof path === 'string') {
                const converted = convertPath(path);
                return { hcDark: converted, hcLight: converted, dark: converted, light: converted };
            }
            else {
                return {
                    hcDark: convertPath(path.hc),
                    hcLight: convertPath(path.hcLight ?? path.light),
                    light: convertPath(path.light),
                    dark: convertPath(path.dark)
                };
            }
        };
        if (!(extension.contributes?.walkthroughs?.length)) {
            return;
        }
        let sectionToOpen;
        let sectionToOpenIndex = Math.min(); // '+Infinity';
        await Promise.all(extension.contributes?.walkthroughs?.map(async (walkthrough, index) => {
            const categoryID = extension.identifier.value + '#' + walkthrough.id;
            const isNewlyInstalled = !this.metadata.get(categoryID);
            if (isNewlyInstalled) {
                this.metadata.set(categoryID, { firstSeen: +new Date(), stepIDs: walkthrough.steps?.map(s => s.id) ?? [], manaullyOpened: false });
            }
            const override = await Promise.race([
                this.tasExperimentService?.getTreatment(`gettingStarted.overrideCategory.${extension.identifier.value + '.' + walkthrough.id}.when`),
                new Promise(resolve => setTimeout(() => resolve(walkthrough.when), 5000))
            ]);
            if (this.sessionInstalledExtensions.has(extension.identifier.value.toLowerCase())
                && this.contextService.contextMatchesRules(ContextKeyExpr.deserialize(override ?? walkthrough.when) ?? ContextKeyExpr.true())) {
                this.sessionInstalledExtensions.delete(extension.identifier.value.toLowerCase());
                if (index < sectionToOpenIndex && isNewlyInstalled) {
                    sectionToOpen = categoryID;
                    sectionToOpenIndex = index;
                }
            }
            const steps = (walkthrough.steps ?? []).map((step, index) => {
                const description = parseDescription(step.description || '');
                const fullyQualifiedID = extension.identifier.value + '#' + walkthrough.id + '#' + step.id;
                let media;
                if (!step.media) {
                    throw Error('missing media in walkthrough step: ' + walkthrough.id + '@' + step.id);
                }
                if (step.media.image) {
                    const altText = step.media.altText;
                    if (altText === undefined) {
                        console.error('Walkthrough item:', fullyQualifiedID, 'is missing altText for its media element.');
                    }
                    media = { type: 'image', altText, path: convertExtensionRelativePathsToBrowserURIs(step.media.image) };
                }
                else if (step.media.markdown) {
                    media = {
                        type: 'markdown',
                        path: convertExtensionPathToFileURI(step.media.markdown),
                        base: convertExtensionPathToFileURI(dirname(step.media.markdown)),
                        root: FileAccess.uriToFileUri(extension.extensionLocation),
                    };
                }
                else if (step.media.svg) {
                    media = {
                        type: 'svg',
                        path: convertExtensionPathToFileURI(step.media.svg),
                        altText: step.media.svg,
                    };
                }
                else if (step.media.video) {
                    const baseURI = FileAccess.uriToFileUri(extension.extensionLocation);
                    media = {
                        type: 'video',
                        path: convertRelativeMediaPathsToWebviewURIs(baseURI, step.media.video),
                        root: FileAccess.uriToFileUri(extension.extensionLocation),
                        altText: step.media.altText,
                        poster: step.media.poster ? convertRelativeMediaPathsToWebviewURIs(baseURI, step.media.poster) : undefined
                    };
                }
                // Throw error for unknown walkthrough format
                else {
                    throw new Error('Unknown walkthrough format detected for ' + fullyQualifiedID);
                }
                return ({
                    description,
                    media,
                    completionEvents: step.completionEvents?.filter(x => typeof x === 'string') ?? [],
                    id: fullyQualifiedID,
                    title: step.title,
                    when: ContextKeyExpr.deserialize(step.when) ?? ContextKeyExpr.true(),
                    category: categoryID,
                    order: index,
                });
            });
            let isFeatured = false;
            if (walkthrough.featuredFor) {
                const folders = this.workspaceContextService.getWorkspace().folders.map(f => f.uri);
                const token = new CancellationTokenSource();
                setTimeout(() => token.cancel(), 2000);
                isFeatured = await this.instantiationService.invokeFunction(a => checkGlobFileExists(a, folders, walkthrough.featuredFor, token.token));
            }
            const iconStr = walkthrough.icon ?? extension.icon;
            const walkthoughDescriptor = {
                description: walkthrough.description,
                title: walkthrough.title,
                id: categoryID,
                isFeatured,
                source: extension.displayName ?? extension.name,
                order: 0,
                walkthroughPageTitle: extension.displayName ?? extension.name,
                steps,
                icon: iconStr ? {
                    type: 'image',
                    path: FileAccess.uriToBrowserUri(joinPath(extension.extensionLocation, iconStr)).toString(true)
                } : {
                    icon: extensionDefaultIcon,
                    type: 'icon'
                },
                when: ContextKeyExpr.deserialize(override ?? walkthrough.when) ?? ContextKeyExpr.true(),
            };
            this._registerWalkthrough(walkthoughDescriptor);
            this._onDidAddWalkthrough.fire(this.resolveWalkthrough(walkthoughDescriptor));
        }));
        this.storageService.store(walkthroughMetadataConfigurationKey, JSON.stringify([...this.metadata.entries()]), 0 /* StorageScope.PROFILE */, 0 /* StorageTarget.USER */);
        const hadLastFoucs = await this.hostService.hadLastFocus();
        if (hadLastFoucs && sectionToOpen && this.configurationService.getValue('workbench.welcomePage.walkthroughs.openOnInstall')) {
            this.telemetryService.publicLog2('gettingStarted.didAutoOpenWalkthrough', { id: sectionToOpen });
            const activeEditor = this.editorService.activeEditor;
            if (activeEditor instanceof GettingStartedInput) {
                this.commandService.executeCommand('workbench.action.keepEditor');
            }
            this.commandService.executeCommand('workbench.action.openWalkthrough', sectionToOpen, {
                inactive: this.layoutService.hasFocus("workbench.parts.editor" /* Parts.EDITOR_PART */) // do not steal the active editor away
            });
        }
    }
    unregisterExtensionWalkthroughContributions(extension) {
        if (!(extension.contributes?.walkthroughs?.length)) {
            return;
        }
        extension.contributes?.walkthroughs?.forEach(section => {
            const categoryID = extension.identifier.value + '#' + section.id;
            section.steps.forEach(step => {
                const fullyQualifiedID = extension.identifier.value + '#' + section.id + '#' + step.id;
                this.steps.delete(fullyQualifiedID);
            });
            this.gettingStartedContributions.delete(categoryID);
            this._onDidRemoveWalkthrough.fire(categoryID);
        });
    }
    getWalkthrough(id) {
        const walkthrough = this.gettingStartedContributions.get(id);
        if (!walkthrough) {
            throw Error('Trying to get unknown walkthrough: ' + id);
        }
        return this.resolveWalkthrough(walkthrough);
    }
    getWalkthroughs() {
        const registeredCategories = [...this.gettingStartedContributions.values()];
        const categoriesWithCompletion = registeredCategories
            .map(category => {
            return {
                ...category,
                content: {
                    type: 'steps',
                    steps: category.steps
                }
            };
        })
            .filter(category => category.content.type !== 'steps' || category.content.steps.length)
            .filter(category => category.id !== 'NewWelcomeExperience')
            .map(category => this.resolveWalkthrough(category));
        return categoriesWithCompletion;
    }
    resolveWalkthrough(category) {
        const stepsWithProgress = category.steps.map(step => this.getStepProgress(step));
        const hasOpened = this.metadata.get(category.id)?.manaullyOpened;
        const firstSeenDate = this.metadata.get(category.id)?.firstSeen;
        const isNew = firstSeenDate && firstSeenDate > (+new Date() - NEW_WALKTHROUGH_TIME);
        const lastStepIDs = this.metadata.get(category.id)?.stepIDs;
        const rawCategory = this.gettingStartedContributions.get(category.id);
        if (!rawCategory) {
            throw Error('Could not find walkthrough with id ' + category.id);
        }
        const currentStepIds = rawCategory.steps.map(s => s.id);
        const hasNewSteps = lastStepIDs && (currentStepIds.length !== lastStepIDs.length || currentStepIds.some((id, index) => id !== lastStepIDs[index]));
        let recencyBonus = 0;
        if (firstSeenDate) {
            const currentDate = +new Date();
            const timeSinceFirstSeen = currentDate - firstSeenDate;
            recencyBonus = Math.max(0, (NEW_WALKTHROUGH_TIME - timeSinceFirstSeen) / NEW_WALKTHROUGH_TIME);
        }
        return {
            ...category,
            recencyBonus,
            steps: stepsWithProgress,
            newItems: !!hasNewSteps,
            newEntry: !!(isNew && !hasOpened),
        };
    }
    getStepProgress(step) {
        return {
            ...step,
            done: false,
            ...this.stepProgress[step.id]
        };
    }
    progressStep(id) {
        const oldProgress = this.stepProgress[id];
        if (!oldProgress || oldProgress.done !== true) {
            this.stepProgress[id] = { done: true };
            this.memento.saveMemento();
            const step = this.getStep(id);
            if (!step) {
                throw Error('Tried to progress unknown step');
            }
            this._onDidProgressStep.fire(this.getStepProgress(step));
        }
    }
    deprogressStep(id) {
        delete this.stepProgress[id];
        this.memento.saveMemento();
        const step = this.getStep(id);
        this._onDidProgressStep.fire(this.getStepProgress(step));
    }
    progressByEvent(event) {
        if (this.sessionEvents.has(event)) {
            return;
        }
        this.sessionEvents.add(event);
        this.completionListeners.get(event)?.forEach(id => this.progressStep(id));
    }
    registerWalkthrough(walkthoughDescriptor) {
        this._registerWalkthrough({
            ...walkthoughDescriptor,
            steps: walkthoughDescriptor.steps.map(step => ({ ...step, description: parseDescription(step.description) }))
        });
    }
    _registerWalkthrough(walkthroughDescriptor) {
        const oldCategory = this.gettingStartedContributions.get(walkthroughDescriptor.id);
        if (oldCategory) {
            console.error(`Skipping attempt to overwrite walkthrough. (${walkthroughDescriptor.id})`);
            return;
        }
        this.gettingStartedContributions.set(walkthroughDescriptor.id, walkthroughDescriptor);
        walkthroughDescriptor.steps.forEach(step => {
            if (this.steps.has(step.id)) {
                throw Error('Attempting to register step with id ' + step.id + ' twice. Second is dropped.');
            }
            this.steps.set(step.id, step);
            step.when.keys().forEach(key => this.categoryVisibilityContextKeys.add(key));
            this.registerDoneListeners(step);
        });
        walkthroughDescriptor.when.keys().forEach(key => this.categoryVisibilityContextKeys.add(key));
    }
    registerDoneListeners(step) {
        if (step.doneOn) {
            console.error(`wakthrough step`, step, `uses deprecated 'doneOn' property. Adopt 'completionEvents' to silence this warning`);
            return;
        }
        if (!step.completionEvents.length) {
            step.completionEvents = coalesce(step.description
                .filter(linkedText => linkedText.nodes.length === 1) // only buttons
                .flatMap(linkedText => linkedText.nodes
                .filter(((node) => typeof node !== 'string'))
                .map(({ href }) => {
                if (href.startsWith('command:')) {
                    return 'onCommand:' + href.slice('command:'.length, href.includes('?') ? href.indexOf('?') : undefined);
                }
                if (href.startsWith('https://') || href.startsWith('http://')) {
                    return 'onLink:' + href;
                }
                return undefined;
            })));
        }
        if (!step.completionEvents.length) {
            step.completionEvents.push('stepSelected');
        }
        for (let event of step.completionEvents) {
            const [_, eventType, argument] = /^([^:]*):?(.*)$/.exec(event) ?? [];
            if (!eventType) {
                console.error(`Unknown completionEvent ${event} when registering step ${step.id}`);
                continue;
            }
            switch (eventType) {
                case 'onLink':
                case 'onEvent':
                case 'onView':
                case 'onSettingChanged':
                    break;
                case 'onContext': {
                    const expression = ContextKeyExpr.deserialize(argument);
                    if (expression) {
                        this.stepCompletionContextKeyExpressions.add(expression);
                        expression.keys().forEach(key => this.stepCompletionContextKeys.add(key));
                        event = eventType + ':' + expression.serialize();
                        if (this.contextService.contextMatchesRules(expression)) {
                            this.sessionEvents.add(event);
                        }
                    }
                    else {
                        console.error('Unable to parse context key expression:', expression, 'in walkthrough step', step.id);
                    }
                    break;
                }
                case 'onStepSelected':
                case 'stepSelected':
                    event = 'stepSelected:' + step.id;
                    break;
                case 'onCommand':
                    event = eventType + ':' + argument.replace(/^toSide:/, '');
                    break;
                case 'onExtensionInstalled':
                case 'extensionInstalled':
                    event = 'extensionInstalled:' + argument.toLowerCase();
                    break;
                default:
                    console.error(`Unknown completionEvent ${event} when registering step ${step.id}`);
                    continue;
            }
            this.registerCompletionListener(event, step);
        }
    }
    registerCompletionListener(event, step) {
        if (!this.completionListeners.has(event)) {
            this.completionListeners.set(event, new Set());
        }
        this.completionListeners.get(event)?.add(step.id);
    }
    getStep(id) {
        const step = this.steps.get(id);
        if (!step) {
            throw Error('Attempting to access step which does not exist in registry ' + id);
        }
        return step;
    }
};
WalkthroughsService = __decorate([
    __param(0, IStorageService),
    __param(1, ICommandService),
    __param(2, IInstantiationService),
    __param(3, IWorkspaceContextService),
    __param(4, IContextKeyService),
    __param(5, IUserDataSyncEnablementService),
    __param(6, IConfigurationService),
    __param(7, IExtensionManagementService),
    __param(8, IHostService),
    __param(9, IViewsService),
    __param(10, ITelemetryService),
    __param(11, IWorkbenchAssignmentService),
    __param(12, IProductService),
    __param(13, IWorkbenchLayoutService),
    __param(14, IEditorService)
], WalkthroughsService);
export { WalkthroughsService };
export const parseDescription = (desc) => desc.split('\n').filter(x => x).map(text => parseLinkedText(text));
export const convertInternalMediaPathToFileURI = (path) => path.startsWith('https://')
    ? URI.parse(path, true)
    : FileAccess.asFileUri(`vs/workbench/contrib/welcomeGettingStarted/common/media/${path}`);
const convertInternalMediaPathToBrowserURI = (path) => path.startsWith('https://')
    ? URI.parse(path, true)
    : FileAccess.asBrowserUri(`vs/workbench/contrib/welcomeGettingStarted/common/media/${path}`);
const convertInternalMediaPathsToBrowserURIs = (path) => {
    if (typeof path === 'string') {
        const converted = convertInternalMediaPathToBrowserURI(path);
        return { hcDark: converted, hcLight: converted, dark: converted, light: converted };
    }
    else {
        return {
            hcDark: convertInternalMediaPathToBrowserURI(path.hc),
            hcLight: convertInternalMediaPathToBrowserURI(path.hcLight ?? path.light),
            light: convertInternalMediaPathToBrowserURI(path.light),
            dark: convertInternalMediaPathToBrowserURI(path.dark)
        };
    }
};
const convertRelativeMediaPathsToWebviewURIs = (basePath, path) => {
    const convertPath = (path) => path.startsWith('https://')
        ? URI.parse(path, true)
        : asWebviewUri(joinPath(basePath, path));
    if (typeof path === 'string') {
        const converted = convertPath(path);
        return { hcDark: converted, hcLight: converted, dark: converted, light: converted };
    }
    else {
        return {
            hcDark: convertPath(path.hc),
            hcLight: convertPath(path.hcLight ?? path.light),
            light: convertPath(path.light),
            dark: convertPath(path.dark)
        };
    }
};
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'resetGettingStartedProgress',
            category: localize2('developer', "Developer"),
            title: localize2('resetWelcomePageWalkthroughProgress', "Reset Welcome Page Walkthrough Progress"),
            f1: true,
            metadata: {
                description: localize2('resetGettingStartedProgressDescription', 'Reset the progress of all Walkthrough steps on the Welcome Page to make them appear as if they are being viewed for the first time, providing a fresh start to the getting started experience.'),
            }
        });
    }
    run(accessor) {
        const gettingStartedService = accessor.get(IWalkthroughsService);
        const storageService = accessor.get(IStorageService);
        storageService.store(hiddenEntriesConfigurationKey, JSON.stringify([]), 0 /* StorageScope.PROFILE */, 0 /* StorageTarget.USER */);
        storageService.store(walkthroughMetadataConfigurationKey, JSON.stringify([]), 0 /* StorageScope.PROFILE */, 0 /* StorageTarget.USER */);
        const memento = new Memento('gettingStartedService', accessor.get(IStorageService));
        const record = memento.getMemento(0 /* StorageScope.PROFILE */, 0 /* StorageTarget.USER */);
        for (const key in record) {
            if (Object.prototype.hasOwnProperty.call(record, key)) {
                try {
                    gettingStartedService.deprogressStep(key);
                }
                catch (e) {
                    console.error(e);
                }
            }
        }
        memento.saveMemento();
    }
});
registerSingleton(IWalkthroughsService, WalkthroughsService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2V0dGluZ1N0YXJ0ZWRTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvYWR2aWthci9Eb2N1bWVudHMvYXJjaGl0ZWN0L2FyY2gyL0FyY2hJREUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvd2VsY29tZUdldHRpbmdTdGFydGVkL2Jyb3dzZXIvZ2V0dGluZ1N0YXJ0ZWRTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxlQUFlLEVBQUUscUJBQXFCLEVBQW9CLE1BQU0sNERBQTRELENBQUM7QUFDdEksT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLGtDQUFrQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxlQUFlLEVBQStCLE1BQU0sZ0RBQWdELENBQUM7QUFDOUcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLDRCQUE0QixDQUFDO0FBQ3JELE9BQU8sRUFBRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDMUYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQ25GLE9BQU8sRUFBRSxjQUFjLEVBQXdCLGtCQUFrQixFQUFFLGFBQWEsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQy9JLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNsRSxPQUFPLEVBQUUsOEJBQThCLEVBQUUsTUFBTSwwREFBMEQsQ0FBQztBQUMxRyxPQUFPLEVBQUUsbUJBQW1CLEVBQXlCLE1BQU0sc0RBQXNELENBQUM7QUFDbEgsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ3JELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNoRSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDaEUsT0FBTyxFQUFFLGtDQUFrQyxFQUFFLDBD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