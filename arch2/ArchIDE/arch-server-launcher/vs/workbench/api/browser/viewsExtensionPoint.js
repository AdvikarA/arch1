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
import * as resources from '../../../base/common/resources.js';
import { isFalsyOrWhitespace } from '../../../base/common/strings.js';
import { localize } from '../../../nls.js';
import { ContextKeyExpr } from '../../../platform/contextkey/common/contextkey.js';
import { ExtensionIdentifier, ExtensionIdentifierSet } from '../../../platform/extensions/common/extensions.js';
import { SyncDescriptor } from '../../../platform/instantiation/common/descriptors.js';
import { IInstantiationService } from '../../../platform/instantiation/common/instantiation.js';
import { Registry } from '../../../platform/registry/common/platform.js';
import { ThemeIcon } from '../../../base/common/themables.js';
import { Extensions as ViewletExtensions } from '../../browser/panecomposite.js';
import { CustomTreeView, TreeViewPane } from '../../browser/parts/views/treeView.js';
import { ViewPaneContainer } from '../../browser/parts/views/viewPaneContainer.js';
import { registerWorkbenchContribution2 } from '../../common/contributions.js';
import { Extensions as ViewContainerExtensions } from '../../common/views.js';
import { VIEWLET_ID as DEBUG } from '../../contrib/debug/common/debug.js';
import { VIEWLET_ID as EXPLORER } from '../../contrib/files/common/files.js';
import { VIEWLET_ID as REMOTE } from '../../contrib/remote/browser/remoteExplorer.js';
import { VIEWLET_ID as SCM } from '../../contrib/scm/common/scm.js';
import { WebviewViewPane } from '../../contrib/webviewView/browser/webviewViewPane.js';
import { isProposedApiEnabled } from '../../services/extensions/common/extensions.js';
import { ExtensionsRegistry } from '../../services/extensions/common/extensionsRegistry.js';
import { ILogService } from '../../../platform/log/common/log.js';
import { Extensions as ExtensionFeaturesRegistryExtensions } from '../../services/extensionManagement/common/extensionFeatures.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { MarkdownString } from '../../../base/common/htmlContent.js';
const viewsContainerSchema = {
    type: 'object',
    properties: {
        id: {
            description: localize({ key: 'vscode.extension.contributes.views.containers.id', comment: ['Contribution refers to those that an extension contributes to VS Code through an extension/contribution point. '] }, "Unique id used to identify the container in which views can be contributed using 'views' contribution point"),
            type: 'string',
            pattern: '^[a-zA-Z0-9_-]+$'
        },
        title: {
            description: localize('vscode.extension.contributes.views.containers.title', 'Human readable string used to render the container'),
            type: 'string'
        },
        icon: {
            description: localize('vscode.extension.contributes.views.containers.icon', "Path to the container icon. Icons are 24x24 centered on a 50x40 block and have a fill color of 'rgb(215, 218, 224)' or '#d7dae0'. It is recommended that icons be in SVG, though any image file type is accepted."),
            type: 'string'
        }
    },
    required: ['id', 'title', 'icon']
};
export const viewsContainersContribution = {
    description: localize('vscode.extension.contributes.viewsContainers', 'Contributes views containers to the editor'),
    type: 'object',
    properties: {
        'activitybar': {
            description: localize('views.container.activitybar', "Contribute views containers to Activity Bar"),
            type: 'array',
            items: viewsContainerSchema
        },
        'panel': {
            description: localize('views.container.panel', "Contribute views containers to Panel"),
            type: 'array',
            items: viewsContainerSchema
        }
    },
    additionalProperties: false
};
var ViewType;
(function (ViewType) {
    ViewType["Tree"] = "tree";
    ViewType["Webview"] = "webview";
})(ViewType || (ViewType = {}));
var InitialVisibility;
(function (InitialVisibility) {
    InitialVisibility["Visible"] = "visible";
    InitialVisibility["Hidden"] = "hidden";
    InitialVisibility["Collapsed"] = "collapsed";
})(InitialVisibility || (InitialVisibility = {}));
const viewDescriptor = {
    type: 'object',
    required: ['id', 'name', 'icon'],
    defaultSnippets: [{ body: { id: '${1:id}', name: '${2:name}', icon: '${3:icon}' } }],
    properties: {
        type: {
            markdownDescription: localize('vscode.extension.contributes.view.type', "Type of the view. This can either be `tree` for a tree view based view or `webview` for a webview based view. The default is `tree`."),
            type: 'string',
            enum: [
                'tree',
                'webview',
            ],
            markdownEnumDescriptions: [
                localize('vscode.extension.contributes.view.tree', "The view is backed by a `TreeView` created by `createTreeView`."),
                localize('vscode.extension.contributes.view.webview', "The view is backed by a `WebviewView` registered by `registerWebviewViewProvider`."),
            ]
        },
        id: {
            markdownDescription: localize('vscode.extension.contributes.view.id', 'Identifier of the view. This should be unique across all views. It is recommended to include your extension id as part of the view id. Use this to register a data provider through `vscode.window.registerTreeDataProviderForView` API. Also to trigger activating your extension by registering `onView:${id}` event to `activationEvents`.'),
            type: 'string'
        },
        name: {
            description: localize('vscode.extension.contributes.view.name', 'The human-readable name of the view. Will be shown'),
            type: 'string'
        },
        when: {
            description: localize('vscode.extension.contributes.view.when', 'Condition which must be true to show this view'),
            type: 'string'
        },
        icon: {
            description: localize('vscode.extension.contributes.view.icon', "Path to the view icon. View icons are displayed when the name of the view cannot be shown. It is recommended that icons be in SVG, though any image file type is accepted."),
            type: 'string'
        },
        contextualTitle: {
            description: localize('vscode.extension.contributes.view.contextualTitle', "Human-readable context for when the view is moved out of its original location. By default, the view's container name will be used."),
            type: 'string'
        },
        visibility: {
            description: localize('vscode.extension.contributes.view.initialState', "Initial state of the view when the extension is first installed. Once the user has changed the view state by collapsing, moving, or hiding the view, the initial state will not be used again."),
            type: 'string',
            enum: [
                'visible',
                'hidden',
                'collapsed'
            ],
            default: 'visible',
            enumDescriptions: [
                localize('vscode.extension.contributes.view.initialState.visible', "The default initial state for the view. In most containers the view will be expanded, however; some built-in containers (explorer, scm, and debug) show all contributed views collapsed regardless of the `visibility`."),
                localize('vscode.extension.contributes.view.initialState.hidden', "The view will not be shown in the view container, but will be discoverable through the views menu and other view entry points and can be un-hidden by the user."),
                localize('vscode.extension.contributes.view.initialState.collapsed', "The view will show in the view container, but will be collapsed.")
            ]
        },
        initialSize: {
            type: 'number',
            description: localize('vscode.extension.contributs.view.size', "The initial size of the view. The size will behave like the css 'flex' property, and will set the initial size when the view is first shown. In the side bar, this is the height of the view. This value is only respected when the same extension owns both the view and the view container."),
        },
        accessibilityHelpContent: {
            type: 'string',
            markdownDescription: localize('vscode.extension.contributes.view.accessibilityHelpContent', "When the accessibility help dialog is invoked in this view, this content will be presented to the user as a markdown string. Keybindings will be resolved when provided in the format of <keybinding:commandId>. If there is no keybinding, that will be indicated and this command will be included in a quickpick for easy configuration.")
        }
    }
};
const remoteViewDescriptor = {
    type: 'object',
    required: ['id', 'name'],
    properties: {
        id: {
            description: localize('vscode.extension.contributes.view.id', 'Identifier of the view. This should be unique across all views. It is recommended to include your extension id as part of the view id. Use this to register a data provider through `vscode.window.registerTreeDataProviderForView` API. Also to trigger activating your extension by registering `onView:${id}` event to `activationEvents`.'),
            type: 'string'
        },
        name: {
            description: localize('vscode.extension.contributes.view.name', 'The human-readable name of the view. Will be shown'),
            type: 'string'
        },
        when: {
            description: localize('vscode.extension.contributes.view.when', 'Condition which must be true to show this view'),
            type: 'string'
        },
        group: {
            description: localize('vscode.extension.contributes.view.group', 'Nested group in the viewlet'),
            type: 'string'
        },
        remoteName: {
            description: localize('vscode.extension.contributes.view.remoteName', 'The name of the remote type associated with this view'),
            type: ['string', 'array'],
            items: {
                type: 'string'
            }
        }
    }
};
const viewsContribution = {
    description: localize('vscode.extension.contributes.views', "Contributes views to the editor"),
    type: 'object',
    properties: {
        'explorer': {
            description: localize('views.explorer', "Contributes views to Explorer container in the Activity bar"),
            type: 'array',
            items: viewDescriptor,
            default: []
        },
        'debug': {
            description: localize('views.debug', "Contributes views to Debug container in the Activity bar"),
            type: 'array',
            items: viewDescriptor,
            default: []
        },
        'scm': {
            description: localize('views.scm', "Contributes views to SCM container in the Activity bar"),
            type: 'array',
            items: viewDescriptor,
            default: []
        },
        'test': {
            description: localize('views.test', "Contributes views to Test container in the Activity bar"),
            type: 'array',
            items: viewDescriptor,
            default: []
        },
        'remote': {
            description: localize('views.remote', "Contributes views to Remote container in the Activity bar. To contribute to this container, enableProposedApi needs to be turned on"),
            type: 'array',
            items: remoteViewDescriptor,
            default: []
        }
    },
    additionalProperties: {
        description: localize('views.contributed', "Contributes views to contributed views container"),
        type: 'array',
        items: viewDescriptor,
        default: []
    }
};
const viewsContainersExtensionPoint = ExtensionsRegistry.registerExtensionPoint({
    extensionPoint: 'viewsContainers',
    jsonSchema: viewsContainersContribution
});
const viewsExtensionPoint = ExtensionsRegistry.registerExtensionPoint({
    extensionPoint: 'views',
    deps: [viewsContainersExtensionPoint],
    jsonSchema: viewsContribution,
    activationEventsGenerator: (viewExtensionPointTypeArray, result) => {
        for (const viewExtensionPointType of viewExtensionPointTypeArray) {
            for (const viewDescriptors of Object.values(viewExtensionPointType)) {
                for (const viewDescriptor of viewDescriptors) {
                    if (viewDescriptor.id) {
                        result.push(`onView:${viewDescriptor.id}`);
                    }
                }
            }
        }
    }
});
const CUSTOM_VIEWS_START_ORDER = 7;
let ViewsExtensionHandler = class ViewsExtensionHandler {
    static { this.ID = 'workbench.contrib.viewsExtensionHandler'; }
    constructor(instantiationService, logService) {
        this.instantiationService = instantiationService;
        this.logService = logService;
        this.viewContainersRegistry = Registry.as(ViewContainerExtensions.ViewContainersRegistry);
        this.viewsRegistry = Registry.as(ViewContainerExtensions.ViewsRegistry);
        this.handleAndRegisterCustomViewContainers();
        this.handleAndRegisterCustomViews();
    }
    handleAndRegisterCustomViewContainers() {
        viewsContainersExtensionPoint.setHandler((extensions, { added, removed }) => {
            if (removed.length) {
                this.removeCustomViewContainers(removed);
            }
            if (added.length) {
                this.addCustomViewContainers(added, this.viewContainersRegistry.all);
            }
        });
    }
    addCustomViewContainers(extensionPoints, existingViewContainers) {
        const viewContainersRegistry = Registry.as(ViewContainerExtensions.ViewContainersRegistry);
        let activityBarOrder = CUSTOM_VIEWS_START_ORDER + viewContainersRegistry.all.filter(v => !!v.extensionId && viewContainersRegistry.getViewContainerLocation(v) === 0 /* ViewContainerLocation.Sidebar */).length;
        let panelOrder = 5 + viewContainersRegistry.all.filter(v => !!v.extensionId && viewContainersRegistry.getViewContainerLocation(v) === 1 /* ViewContainerLocation.Panel */).length + 1;
        for (const { value, collector, description } of extensionPoints) {
            Object.entries(value).forEach(([key, value]) => {
                if (!this.isValidViewsContainer(value, collector)) {
                    return;
                }
                switch (key) {
                    case 'activitybar':
                        activityBarOrder = this.registerCustomViewContainers(value, description, activityBarOrder, existingViewContainers, 0 /* ViewContainerLocation.Sidebar */);
                        break;
                    case 'panel':
                        panelOrder = this.registerCustomViewContainers(value, description, panelOrder, existingViewContainers, 1 /* ViewContainerLocation.Panel */);
                        break;
                }
            });
        }
    }
    removeCustomViewContainers(extensionPoints) {
        const viewContainersRegistry = Registry.as(ViewContainerExtensions.ViewContainersRegistry);
        const removedExtensions = extensionPoints.reduce((result, e) => { result.add(e.description.identifier); return result; }, new ExtensionIdentifierSet());
        for (const viewContainer of viewContainersRegistry.all) {
            if (viewContainer.extensionId && removedExtensions.has(viewContainer.extensionId)) {
                // move all views in this container into default view container
                const views = this.viewsRegistry.getViews(viewContainer);
                if (views.length) {
                    this.viewsRegistry.moveViews(views, this.getDefaultViewContainer());
                }
                this.deregisterCustomViewContainer(viewContainer);
            }
        }
    }
    isValidViewsContainer(viewsContainersDescriptors, collector) {
        if (!Array.isArray(viewsContainersDescriptors)) {
            collector.error(localize('viewcontainer requirearray', "views containers must be an array"));
            return false;
        }
        for (const descriptor of viewsContainersDescriptors) {
            if (typeof descriptor.id !== 'string' && isFalsyOrWhitespace(descriptor.id)) {
                collector.error(localize('requireidstring', "property `{0}` is mandatory and must be of type `string` with non-empty value. Only alphanumeric characters, '_', and '-' are allowed.", 'id'));
                return false;
            }
            if (!(/^[a-z0-9_-]+$/i.test(descriptor.id))) {
                collector.error(localize('requireidstring', "property `{0}` is mandatory and must be of type `string` with non-empty value. Only alphanumeric characters, '_', and '-' are allowed.", 'id'));
                return false;
            }
            if (typeof descriptor.title !== 'string') {
                collector.error(localize('requirestring', "property `{0}` is mandatory and must be of type `string`", 'title'));
                return false;
            }
            if (typeof descriptor.icon !== 'string') {
                collector.error(localize('requirestring', "property `{0}` is mandatory and must be of type `string`", 'icon'));
                return false;
            }
            if (isFalsyOrWhitespace(descriptor.title)) {
                collector.warn(localize('requirenonemptystring', "property `{0}` is mandatory and must be of type `string` with non-empty value", 'title'));
                return true;
            }
        }
        return true;
    }
    registerCustomViewContainers(containers, extension, order, existingViewContainers, location) {
        containers.forEach(descriptor => {
            const themeIcon = ThemeIcon.fromString(descriptor.icon);
            const icon = themeIcon || resources.joinPath(extension.extensionLocation, descriptor.icon);
            const id = `workbench.view.extension.${descriptor.id}`;
            const title = descriptor.title || id;
            const viewContainer = this.registerCustomViewContainer(id, title, icon, order++, extension.identifier, location);
            // Move those views that belongs to this container
            if (existingViewContainers.length) {
                const viewsToMove = [];
                for (const existingViewContainer of existingViewContainers) {
                    if (viewContainer !== existingViewContainer) {
                        viewsToMove.push(...this.viewsRegistry.getViews(existingViewContainer).filter(view => view.originalContainerId === descriptor.id));
                    }
                }
                if (viewsToMove.length) {
                    this.viewsRegistry.moveViews(viewsToMove, viewContainer);
                }
            }
        });
        return order;
    }
    registerCustomViewContainer(id, title, icon, order, extensionId, location) {
        let viewContainer = this.viewContainersRegistry.get(id);
        if (!viewContainer) {
            viewContainer = this.viewContainersRegistry.registerViewContainer({
                id,
                title: { value: title, original: title },
                extensionId,
                ctorDescriptor: new SyncDescriptor(ViewPaneContainer, [id, { mergeViewWithContainerWhenSingleView: true }]),
                hideIfEmpty: true,
                order,
                icon,
            }, location);
        }
        return viewContainer;
    }
    deregisterCustomViewContainer(viewContainer) {
        this.viewContainersRegistry.deregisterViewContainer(viewContainer);
        Registry.as(ViewletExtensions.Viewlets).deregisterPaneComposite(viewContainer.id);
    }
    handleAndRegisterCustomViews() {
        viewsExtensionPoint.setHandler((extensions, { added, removed }) => {
            if (removed.length) {
                this.removeViews(removed);
            }
            if (added.length) {
                this.addViews(added);
            }
        });
    }
    addViews(extensions) {
        const viewIds = new Set();
        const allViewDescriptors = [];
        for (const extension of extensions) {
            const { value, collector } = extension;
            Object.entries(value).forEach(([key, value]) => {
                if (!this.isValidViewDescriptors(value, collector)) {
                    return;
                }
                if (key === 'remote' && !isProposedApiEnabled(extension.description, 'contribViewsRemote')) {
                    collector.warn(localize('ViewContainerRequiresProposedAPI', "View container '{0}' requires 'enabledApiProposals: [\"contribViewsRemote\"]' to be added to 'Remote'.", key));
                    return;
                }
                const viewContainer = this.getViewContainer(key);
                if (!viewContainer) {
                    collector.warn(localize('ViewContainerDoesnotExist', "View container '{0}' does not exist and all views registered to it will be added to 'Explorer'.", key));
                }
                const container = viewContainer || this.getDefaultViewContainer();
                const viewDescriptors = [];
                for (let index = 0; index < value.length; index++) {
                    const item = value[index];
                    // validate
                    if (viewIds.has(item.id)) {
                        collector.error(localize('duplicateView1', "Cannot register multiple views with same id `{0}`", item.id));
                        continue;
                    }
                    if (this.viewsRegistry.getView(item.id) !== null) {
                        collector.error(localize('duplicateView2', "A view with id `{0}` is already registered.", item.id));
                        continue;
                    }
                    const order = ExtensionIdentifier.equals(extension.description.identifier, container.extensionId)
                        ? index + 1
                        : container.viewOrderDelegate
                            ? container.viewOrderDelegate.getOrder(item.group)
                            : undefined;
                    let icon;
                    if (typeof item.icon === 'string') {
                        icon = ThemeIcon.fromString(item.icon) || resources.joinPath(extension.description.extensionLocation, item.icon);
                    }
                    const initialVisibility = this.convertInitialVisibility(item.visibility);
                    const type = this.getViewType(item.type);
                    if (!type) {
                        collector.error(localize('unknownViewType', "Unknown view type `{0}`.", item.type));
                        continue;
                    }
                    let weight = undefined;
                    if (typeof item.initialSize === 'number') {
                        if (container.extensionId?.value === extension.description.identifier.value) {
                            weight = item.initialSize;
                        }
                        else {
                            this.logService.warn(`${extension.description.identifier.value} tried to set the view size of ${item.id} but it was ignored because the view container does not belong to it.`);
                        }
                    }
                    let accessibilityHelpContent;
                    if (isProposedApiEnabled(extension.description, 'contribAccessibilityHelpContent') && item.accessibilityHelpContent) {
                        accessibilityHelpContent = new MarkdownString(item.accessibilityHelpContent);
                    }
                    const viewDescriptor = {
                        type: type,
                        ctorDescriptor: type === ViewType.Tree ? new SyncDescriptor(TreeViewPane) : new SyncDescriptor(WebviewViewPane),
                        id: item.id,
                        name: { value: item.name, original: item.name },
                        when: ContextKeyExpr.deserialize(item.when),
                        containerIcon: icon || viewContainer?.icon,
                        containerTitle: item.contextualTitle || (viewContainer && (typeof viewContainer.title === 'string' ? viewContainer.title : viewContainer.title.value)),
                        canToggleVisibility: true,
                        canMoveView: viewContainer?.id !== REMOTE,
                        treeView: type === ViewType.Tree ? this.instantiationService.createInstance(CustomTreeView, item.id, item.name, extension.description.identifier.value) : undefined,
                        collapsed: this.showCollapsed(container) || initialVisibility === InitialVisibility.Collapsed,
                        order: order,
                        extensionId: extension.description.identifier,
                        originalContainerId: key,
                        group: item.group,
                        remoteAuthority: item.remoteName || item.remoteAuthority, // TODO@roblou - delete after remote extensions are updated
                        virtualWorkspace: item.virtualWorkspace,
                        hideByDefault: initialVisibility === InitialVisibility.Hidden,
                        workspace: viewContainer?.id === REMOTE ? true : undefined,
                        weight,
                        accessibilityHelpContent
                    };
                    viewIds.add(viewDescriptor.id);
                    viewDescriptors.push(viewDescriptor);
                }
                allViewDescriptors.push({ viewContainer: container, views: viewDescriptors });
            });
        }
        this.viewsRegistry.registerViews2(allViewDescriptors);
    }
    getViewType(type) {
        if (type === ViewType.Webview) {
            return ViewType.Webview;
        }
        if (!type || type === ViewType.Tree) {
            return ViewType.Tree;
        }
        return undefined;
    }
    getDefaultViewContainer() {
        return this.viewContainersRegistry.get(EXPLORER);
    }
    removeViews(extensions) {
        const removedExtensions = extensions.reduce((result, e) => { result.add(e.description.identifier); return result; }, new ExtensionIdentifierSet());
        for (const viewContainer of this.viewContainersRegistry.all) {
            const removedViews = this.viewsRegistry.getViews(viewContainer).filter(v => v.extensionId && removedExtensions.has(v.extensionId));
            if (removedViews.length) {
                this.viewsRegistry.deregisterViews(removedViews, viewContainer);
                for (const view of removedViews) {
                    const anyView = view;
                    if (anyView.treeView) {
                        anyView.treeView.dispose();
                    }
                }
            }
        }
    }
    convertInitialVisibility(value) {
        if (Object.values(InitialVisibility).includes(value)) {
            return value;
        }
        return undefined;
    }
    isValidViewDescriptors(viewDescriptors, collector) {
        if (!Array.isArray(viewDescriptors)) {
            collector.error(localize('requirearray', "views must be an array"));
            return false;
        }
        for (const descriptor of viewDescriptors) {
            if (typeof descriptor.id !== 'string') {
                collector.error(localize('requirestring', "property `{0}` is mandatory and must be of type `string`", 'id'));
                return false;
            }
            if (typeof descriptor.name !== 'string') {
                collector.error(localize('requirestring', "property `{0}` is mandatory and must be of type `string`", 'name'));
                return false;
            }
            if (descriptor.when && typeof descriptor.when !== 'string') {
                collector.error(localize('optstring', "property `{0}` can be omitted or must be of type `string`", 'when'));
                return false;
            }
            if (descriptor.icon && typeof descriptor.icon !== 'string') {
                collector.error(localize('optstring', "property `{0}` can be omitted or must be of type `string`", 'icon'));
                return false;
            }
            if (descriptor.contextualTitle && typeof descriptor.contextualTitle !== 'string') {
                collector.error(localize('optstring', "property `{0}` can be omitted or must be of type `string`", 'contextualTitle'));
                return false;
            }
            if (descriptor.visibility && !this.convertInitialVisibility(descriptor.visibility)) {
                collector.error(localize('optenum', "property `{0}` can be omitted or must be one of {1}", 'visibility', Object.values(InitialVisibility).join(', ')));
                return false;
            }
        }
        return true;
    }
    getViewContainer(value) {
        switch (value) {
            case 'explorer': return this.viewContainersRegistry.get(EXPLORER);
            case 'debug': return this.viewContainersRegistry.get(DEBUG);
            case 'scm': return this.viewContainersRegistry.get(SCM);
            case 'remote': return this.viewContainersRegistry.get(REMOTE);
            default: return this.viewContainersRegistry.get(`workbench.view.extension.${value}`);
        }
    }
    showCollapsed(container) {
        switch (container.id) {
            case EXPLORER:
            case SCM:
            case DEBUG:
                return true;
        }
        return false;
    }
};
ViewsExtensionHandler = __decorate([
    __param(0, IInstantiationService),
    __param(1, ILogService)
], ViewsExtensionHandler);
class ViewContainersDataRenderer extends Disposable {
    constructor() {
        super(...arguments);
        this.type = 'table';
    }
    shouldRender(manifest) {
        return !!manifest.contributes?.viewsContainers;
    }
    render(manifest) {
        const contrib = manifest.contributes?.viewsContainers || {};
        const viewContainers = Object.keys(contrib).reduce((result, location) => {
            const viewContainersForLocation = contrib[location];
            result.push(...viewContainersForLocation.map(viewContainer => ({ ...viewContainer, location })));
            return result;
        }, []);
        if (!viewContainers.length) {
            return { data: { headers: [], rows: [] }, dispose: () => { } };
        }
        const headers = [
            localize('view container id', "ID"),
            localize('view container title', "Title"),
            localize('view container location', "Where"),
        ];
        const rows = viewContainers
            .sort((a, b) => a.id.localeCompare(b.id))
            .map(viewContainer => {
            return [
                viewContainer.id,
                viewContainer.title,
                viewContainer.location
            ];
        });
        return {
            data: {
                headers,
                rows
            },
            dispose: () => { }
        };
    }
}
class ViewsDataRenderer extends Disposable {
    constructor() {
        super(...arguments);
        this.type = 'table';
    }
    shouldRender(manifest) {
        return !!manifest.contributes?.views;
    }
    render(manifest) {
        const contrib = manifest.contributes?.views || {};
        const views = Object.keys(contrib).reduce((result, location) => {
            const viewsForLocation = contrib[location];
            result.push(...viewsForLocation.map(view => ({ ...view, location })));
            return result;
        }, []);
        if (!views.length) {
            return { data: { headers: [], rows: [] }, dispose: () => { } };
        }
        const headers = [
            localize('view id', "ID"),
            localize('view name title', "Name"),
            localize('view container location', "Where"),
        ];
        const rows = views
            .sort((a, b) => a.id.localeCompare(b.id))
            .map(view => {
            return [
                view.id,
                view.name,
                view.location
            ];
        });
        return {
            data: {
                headers,
                rows
            },
            dispose: () => { }
        };
    }
}
Registry.as(ExtensionFeaturesRegistryExtensions.ExtensionFeaturesRegistry).registerExtensionFeature({
    id: 'viewsContainers',
    label: localize('viewsContainers', "View Containers"),
    access: {
        canToggle: false
    },
    renderer: new SyncDescriptor(ViewContainersDataRenderer),
});
Registry.as(ExtensionFeaturesRegistryExtensions.ExtensionFeaturesRegistry).registerExtensionFeature({
    id: 'views',
    label: localize('views', "Views"),
    access: {
        canToggle: false
    },
    renderer: new SyncDescriptor(ViewsDataRenderer),
});
registerWorkbenchContribution2(ViewsExtensionHandler.ID, ViewsExtensionHandler, 1 /* WorkbenchPhase.BlockStartup */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmlld3NFeHRlbnNpb25Qb2ludC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL2FkdmlrYXIvRG9jdW1lbnRzL2FyY2hpdGVjdC9hcmNoMi9BcmNoSURFL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvYnJvd3Nlci92aWV3c0V4dGVuc2lvblBvaW50LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBR2hHLE9BQU8sS0FBSyxTQUFTLE1BQU0sbUNBQW1DLENBQUM7QUFDL0QsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFFdEUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGlCQUFpQixDQUFDO0FBQzNDLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUNuRixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsc0JBQXNCLEVBQTZDLE1BQU0sbURBQW1ELENBQUM7QUFDM0osT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHVEQUF1RCxDQUFDO0FBQ3ZGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQ2hHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQztBQUN6RSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDOUQsT0FBTyxFQUFFLFVBQVUsSUFBSSxpQkFBaUIsRUFBeUIsTUFBTSxnQ0FBZ0MsQ0FBQztBQUN4RyxPQUFPLEVBQUUsY0FBYyxFQUFFLFlBQVksRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQ3JGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQ25GLE9BQU8sRUFBMEMsOEJBQThCLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUN2SCxPQUFPLEVBQUUsVUFBVSxJQUFJLHVCQUF1QixFQUF5SCxNQUFNLHVCQUF1QixDQUFDO0FBQ3JNLE9BQU8sRUFB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