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
var ViewPane_1;
import './media/paneviewlet.css';
import * as nls from '../../../../nls.js';
import { Event, Emitter } from '../../../../base/common/event.js';
import { asCssVariable, foreground } from '../../../../platform/theme/common/colorRegistry.js';
import { after, append, $, trackFocus, EventType, addDisposableListener, Dimension, reset, isAncestorOfActiveElement, isActiveElement } from '../../../../base/browser/dom.js';
import { createCSSRule } from '../../../../base/browser/domStylesheets.js';
import { asCssValueWithDefault, asCSSUrl } from '../../../../base/browser/cssValue.js';
import { DisposableMap, DisposableStore, toDisposable } from '../../../../base/common/lifecycle.js';
import { Action } from '../../../../base/common/actions.js';
import { prepareActions } from '../../../../base/browser/ui/actionbar/actionbar.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { Pane } from '../../../../base/browser/ui/splitview/paneview.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { Extensions as ViewContainerExtensions, IViewDescriptorService, defaultViewIcon, ViewContainerLocationToString } from '../../../common/views.js';
import { IViewsService } from '../../../services/views/common/viewsService.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { assertReturnsDefined } from '../../../../base/common/types.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { MenuId, Action2, SubmenuItemAction } from '../../../../platform/actions/common/actions.js';
import { createActionViewItem } from '../../../../platform/actions/browser/menuEntryActionViewItem.js';
import { parseLinkedText } from '../../../../base/common/linkedText.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { Button } from '../../../../base/browser/ui/button/button.js';
import { Link } from '../../../../platform/opener/browser/link.js';
import { ProgressBar } from '../../../../base/browser/ui/progressbar/progressbar.js';
import { AbstractProgressScope, ScopedProgressIndicator } from '../../../services/progress/browser/progressIndicator.js';
import { DomScrollableElement } from '../../../../base/browser/ui/scrollbar/scrollableElement.js';
import { URI } from '../../../../base/common/uri.js';
import { registerIcon } from '../../../../platform/theme/common/iconRegistry.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { WorkbenchToolBar } from '../../../../platform/actions/browser/toolbar.js';
import { FilterWidget } from './viewFilter.js';
import { BaseActionViewItem } from '../../../../base/browser/ui/actionbar/actionViewItems.js';
import { ServiceCollection } from '../../../../platform/instantiation/common/serviceCollection.js';
import { defaultButtonStyles, defaultProgressBarStyles } from '../../../../platform/theme/browser/defaultStyles.js';
import { getDefaultHoverDelegate } from '../../../../base/browser/ui/hover/hoverDelegateFactory.js';
import { ILifecycleService } from '../../../services/lifecycle/common/lifecycle.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
import { PANEL_BACKGROUND, PANEL_SECTION_DRAG_AND_DROP_BACKGROUND, PANEL_STICKY_SCROLL_BACKGROUND, PANEL_STICKY_SCROLL_BORDER, PANEL_STICKY_SCROLL_SHADOW, SIDE_BAR_BACKGROUND, SIDE_BAR_DRAG_AND_DROP_BACKGROUND, SIDE_BAR_STICKY_SCROLL_BACKGROUND, SIDE_BAR_STICKY_SCROLL_BORDER, SIDE_BAR_STICKY_SCROLL_SHADOW } from '../../../common/theme.js';
import { renderLabelWithIcons } from '../../../../base/browser/ui/iconLabel/iconLabels.js';
import { ViewMenuActions } from './viewMenuActions.js';
export var ViewPaneShowActions;
(function (ViewPaneShowActions) {
    /** Show the actions when the view is hovered. This is the default behavior. */
    ViewPaneShowActions[ViewPaneShowActions["Default"] = 0] = "Default";
    /** Always shows the actions when the view is expanded */
    ViewPaneShowActions[ViewPaneShowActions["WhenExpanded"] = 1] = "WhenExpanded";
    /** Always shows the actions */
    ViewPaneShowActions[ViewPaneShowActions["Always"] = 2] = "Always";
})(ViewPaneShowActions || (ViewPaneShowActions = {}));
export const VIEWPANE_FILTER_ACTION = new Action('viewpane.action.filter');
const viewPaneContainerExpandedIcon = registerIcon('view-pane-container-expanded', Codicon.chevronDown, nls.localize('viewPaneContainerExpandedIcon', 'Icon for an expanded view pane container.'));
const viewPaneContainerCollapsedIcon = registerIcon('view-pane-container-collapsed', Codicon.chevronRight, nls.localize('viewPaneContainerCollapsedIcon', 'Icon for a collapsed view pane container.'));
const viewsRegistry = Registry.as(ViewContainerExtensions.ViewsRegistry);
let ViewWelcomeController = class ViewWelcomeController {
    get enabled() { return this._enabled; }
    constructor(container, delegate, instantiationService, openerService, contextKeyService, lifecycleService) {
        this.container = container;
        this.delegate = delegate;
        this.instantiationService = instantiationService;
        this.openerService = openerService;
        this.contextKeyService = contextKeyService;
        this.items = [];
        this._enabled = false;
        this.disposables = new DisposableStore();
        this.enabledDisposables = this.disposables.add(new DisposableStore());
        this.renderDisposables = this.disposables.add(new DisposableStore());
        this.disposables.add(Event.runAndSubscribe(this.delegate.onDidChangeViewWelcomeState, () => this.onDidChangeViewWelcomeState()));
        this.disposables.add(lifecycleService.onWillShutdown(() => this.dispose())); // Fixes https://github.com/microsoft/vscode/issues/208878
    }
    layout(height, width) {
        if (!this._enabled) {
            return;
        }
        this.element.style.height = `${height}px`;
        this.element.style.width = `${width}px`;
        this.element.classList.toggle('wide', width > 640);
        this.scrollableElement.scanDomNode();
    }
    focus() {
        if (!this._enabled) {
            return;
        }
        this.element.focus();
    }
    onDidChangeViewWelcomeState() {
        const enabled = this.delegate.shouldShowWelcome();
        if (this._enabled === enabled) {
            return;
        }
        this._enabled = enabled;
        if (!enabled) {
            this.enabledDisposables.clear();
            return;
        }
        this.container.classList.add('welcome');
        const viewWelcomeContainer = append(this.container, $('.welcome-view'));
        this.element = $('.welcome-view-content', { tabIndex: 0 });
        this.scrollableElement = new DomScrollableElement(this.element, { alwaysConsumeMouseWheel: true, horizontal: 2 /* ScrollbarVisibility.Hidden */, vertical: 3 /* ScrollbarVisibility.Visible */, });
        append(viewWelcomeContainer, this.scrollableElement.getDomNode());
        this.enabledDisposables.add(toDisposable(() => {
            this.container.classList.remove('welcome');
            this.scrollableElement.dispose();
            viewWelcomeContainer.remove();
            this.scrollableElement = undefined;
            this.element = undefined;
        }));
        this.contextKeyService.onDidChangeContext(this.onDidChangeContext, this, this.enabledDisposables);
        Event.chain(viewsRegistry.onDidChangeViewWelcomeContent, $ => $.filter(id => id === this.delegate.id))(this.onDidChangeViewWelcomeContent, this, this.enabledDisposables);
        this.onDidChangeViewWelcomeContent();
    }
    onDidChangeViewWelcomeContent() {
        const descriptors = viewsRegistry.getViewWelcomeContent(this.delegate.id);
        this.items = [];
        for (const descriptor of descriptors) {
            if (descriptor.when === 'default') {
                this.defaultItem = { descriptor, visible: true };
            }
            else {
                const visible = descriptor.when ? this.contextKeyService.contextMatchesRules(descriptor.when) : true;
                this.items.push({ descriptor, visible });
            }
        }
        this.render();
    }
    onDidChangeContext() {
        let didChange = false;
        for (const item of this.items) {
            if (!item.descriptor.when || item.descriptor.when === 'default') {
                continue;
            }
            const visible = this.contextKeyService.contextMatchesRules(item.descriptor.when);
            if (item.visible === visible) {
                continue;
            }
            item.visible = visible;
            didChange = true;
        }
        if (didChange) {
            this.render();
        }
    }
    render() {
        this.renderDisposables.clear();
        this.element.innerText = '';
        const contents = this.getContentDescriptors();
        if (contents.length === 0) {
            this.container.classList.remove('welcome');
            this.scrollableElement.scanDomNode();
            return;
        }
        let buttonsCount = 0;
        for (const { content, precondition, renderSecondaryButtons } of contents) {
            const lines = content.split('\n');
            for (let line of lines) {
                line = line.trim();
                if (!line) {
                    continue;
                }
                const linkedText = parseLinkedText(line);
                if (linkedText.nodes.length === 1 && typeof linkedText.nodes[0] !== 'string') {
                    const node = linkedText.nodes[0];
                    const buttonContainer = append(this.element, $('.button-container'));
                    const button = new Button(buttonContainer, { title: node.title, supportIcons: true, secondary: renderSecondaryButtons && buttonsCount > 0 ? true : false, ...defaultButtonStyles, });
                    button.label = node.label;
                    button.onDidClick(_ => {
                        this.openerService.open(node.href, { allowCommands: true });
                    }, null, this.renderDisposables);
                    this.renderDisposables.add(button);
                    buttonsCount++;
                    if (precondition) {
                        const updateEnablement = () => button.enabled = this.contextKeyService.contextMatchesRules(precondition);
                        updateEnablement();
                        const keys = new Set(precondition.keys());
                        const onDidChangeContext = Event.filter(this.contextKeyService.onDidChangeContext, e => e.affectsSome(keys));
                        onDidChangeContext(updateEnablement, null, this.renderDisposables);
                    }
                }
                else {
                    const p = append(this.element, $('p'));
                    for (const node of linkedText.nodes) {
                        if (typeof node === 'string') {
                            append(p, ...renderLabelWithIcons(node));
                        }
                        else {
                            const link = this.renderDisposables.add(this.instantiationService.createInstance(Link, p, node, {}));
                            if (precondition && node.href.startsWith('command:')) {
                                const updateEnablement = () => link.enabled = this.contextKeyService.contextMatchesRules(precondition);
                                updateEnablement();
                                const keys = new Set(precondition.keys());
                                const onDidChangeContext = Event.filter(this.contextKeyService.onDidChangeContext, e => e.affectsSome(keys));
                                onDidChangeContext(updateEnablement, null, this.renderDisposables);
                            }
                        }
                    }
                }
            }
        }
        this.container.classList.add('welcome');
        this.scrollableElement.scanDomNode();
    }
    getContentDescriptors() {
        const visibleItems = this.items.filter(v => v.visible);
        if (visibleItems.length === 0 && this.defaultItem) {
            return [this.defaultItem.descriptor];
        }
        return visibleItems.map(v => v.descriptor);
    }
    dispose() {
        this.disposables.dispose();
    }
};
ViewWelcomeController = __decorate([
    __param(2, IInstantiationService),
    __param(3, IOpenerService),
    __param(4, IContextKeyService),
    __param(5, ILifecycleService)
], ViewWelcomeController);
let ViewPane = class ViewPane extends Pane {
    static { ViewPane_1 = this; }
    static { this.AlwaysShowActionsConfig = 'workbench.view.alwaysShowHeaderActions'; }
    get title() {
        return this._title;
    }
    get titleDescription() {
        return this._titleDescription;
    }
    get singleViewPaneContainerTitle() {
        return this._singleViewPaneContainerTitle;
    }
    constructor(options, keybindingService, contextMenuService, configurationService, contextKeyService, viewDescriptorService, instantiationService, openerService, themeService, hoverService, accessibleViewInformationService) {
        super({ ...options, ...{ orientation: viewDescriptorService.getViewLocationById(options.id) === 1 /* ViewContainerLocation.Panel */ ? 1 /* Orientation.HORIZONTAL */ : 0 /* Orientation.VERTICAL */ } });
        this.keybindingService = keybindingService;
        this.contextMenuService = contextMenuService;
        this.configurationService = configurationService;
        this.contextKeyService = contextKeyService;
        this.viewDescriptorService = viewDescriptorService;
        this.instantiationService = instantiationService;
        this.openerService = openerService;
        this.themeService = themeService;
        this.hoverService = hoverService;
        this.accessibleViewInformationService = accessibleViewInformationService;
        this._onDidFocus = this._register(new Emitter());
        this.onDidFocus = this._onDidFocus.event;
        this._onDidBlur = this._register(new Emitter());
        this.onDidBlur = this._onDidBlur.event;
        this._onDidChangeBodyVisibility = this._register(new Emitter());
        this.onDidChangeBodyVisibility = this._onDidChangeBodyVisibility.event;
        this._onDidChangeTitleArea = this._register(new Emitter());
        this.onDidChangeTitleArea = this._onDidChangeTitleArea.event;
        this._onDidChangeViewWelcomeState = this._register(new Emitter());
        this.onDidChangeViewWelcomeState = this._onDidChangeViewWelcomeState.event;
        this._isVisible = false;
        this.headerActionViewItems = this._register(new DisposableMap());
        this.id = options.id;
        this._title = options.title;
        this._titleDescription = options.titleDescription;
        this._singleViewPaneContainerTitle = options.singleViewPaneContainerTitle;
        this.showActions = options.showActions ?? ViewPaneShowActions.Default;
        this.scopedContextKeyService = this._register(contextKeyService.createScoped(this.element));
        this.scopedContextKeyService.createKey('view', this.id);
        const viewLocationKey = this.scopedContextKeyService.createKey('viewLocation', ViewContainerLocationToString(viewDescriptorService.getViewLocationById(this.id)));
        this._register(Event.filter(viewDescriptorService.onDidChangeLocation, e => e.views.some(view => view.id === this.id))(() => viewLocationKey.set(ViewContainerLocationToString(viewDescriptorService.getViewLocationById(this.id)))));
        const childInstantiationService = this._register(this.instantiationService.createChild(new ServiceCollection([IContextKeyService, this.scopedContextKeyService])));
        this.menuActions = this._register(childInstantiationService.createInstance(ViewMenuActions, options.titleMenuId ?? MenuId.ViewTitle, MenuId.ViewTitleContext, { shouldForwardArgs: !options.donotForwardArgs, renderShortTitle: true }));
        this._register(this.menuActions.onDidChange(() => this.updateActions()));
    }
    get headerVisible() {
        return super.headerVisible;
    }
    set headerVisible(visible) {
        super.headerVisible = visible;
        this.element.classList.toggle('merged-header', !visible);
    }
    setVisible(visible) {
        if (this._isVisible !== visible) {
            this._isVisible = visible;
            if (this.isExpanded()) {
                this._onDidChangeBodyVisibility.fire(visible);
            }
        }
    }
    isVisible() {
        return this._isVisible;
    }
    isBodyVisible() {
        return this._isVisible && this.isExpanded();
    }
    setExpanded(expanded) {
        const changed = super.setExpanded(expanded);
        if (changed) {
            this._onDidChangeBodyVisibility.fire(expanded);
        }
        this.updateTwistyIcon();
        return changed;
    }
    render() {
        super.render();
        const focusTracker = trackFocus(this.element);
        this._register(focusTracker);
        this._register(focusTracker.onDidFocus(() => this._onDidFocus.fire()));
        this._register(focusTracker.onDidBlur(() => this._onDidBlur.fire()));
    }
    renderHeader(container) {
        this.headerContainer = container;
        this.twistiesContainer = append(container, $(`.twisty-container${ThemeIcon.asCSSSelector(this.getTwistyIcon(this.isExpanded()))}`));
        this.renderHeaderTitle(container, this.title);
        const actions = append(container, $('.actions'));
        actions.classList.toggle('show-always', this.showActions === ViewPaneShowActions.Always);
        actions.classList.toggle('show-expanded', this.showActions === ViewPaneShowActions.WhenExpanded);
        this.toolbar = this.instantiationService.createInstance(WorkbenchToolBar, actions, {
            orientation: 0 /* ActionsOrientation.HORIZONTAL */,
            actionViewItemProvider: (action, options) => {
                const item = this.createActionViewItem(action, options);
                if (item) {
                    this.headerActionViewItems.set(item.action.id, item);
                }
                return item;
            },
            ariaLabel: nls.localize('viewToolbarAriaLabel', "{0} actions", this.title),
            getKeyBinding: action => this.keybindingService.lookupKeybinding(action.id),
            renderDropdownAsChildElement: true,
            actionRunner: this.getActionRunner(),
            resetMenu: this.menuActions.menuId
        });
        this._register(this.toolbar);
        this.setActions();
        this._register(addDisposableListener(actions, EventType.CLICK, e => e.preventDefault()));
        const viewContainerModel = this.viewDescriptorService.getViewContainerByViewId(this.id);
        if (viewContainerModel) {
            this._register(this.viewDescriptorService.getViewContainerModel(viewContainerModel).onDidChangeContainerInfo(({ title }) => this.updateTitle(this.title)));
        }
        else {
            console.error(`View container model not found for view ${this.id}`);
        }
        const onDidRelevantConfigurationChange = Event.filter(this.configurationService.onDidChangeConfiguration, e => e.affectsConfiguration(ViewPane_1.AlwaysShowActionsConfig));
        this._register(onDidRelevantConfigurationChange(this.updateActionsVisibility, this));
        this.updateActionsVisibility();
    }
    updateHeader() {
        super.updateHeader();
        this.updateTwistyIcon();
    }
    updateTwistyIcon() {
        if (this.twistiesContainer) {
            this.twistiesContainer.classList.remove(...ThemeIcon.asClassNameArray(this.getTwistyIcon(!this._expanded)));
            this.twistiesContainer.classList.add(...ThemeIcon.asClassNameArray(this.getTwistyIcon(this._expanded)));
        }
    }
    getTwistyIcon(expanded) {
        return expanded ? viewPaneContainerExpandedIcon : viewPaneContainerCollapsedIcon;
    }
    style(styles) {
        super.style(styles);
        const icon = this.getIcon();
        if (this.iconContainer) {
            const fgColor = asCssValueWithDefault(styles.headerForeground, asCssVariable(foreground));
            if (URI.isUri(icon)) {
                // Apply background color to activity bar item provided with iconUrls
                this.iconContainer.style.backgroundColor = fgColor;
                this.iconContainer.style.color = '';
            }
            else {
                // Apply foreground color to activity bar items provided with codicons
                this.iconContainer.style.color = fgColor;
                this.iconContainer.style.backgroundColor = '';
            }
        }
    }
    getIcon() {
        return this.viewDescriptorService.getViewDescriptorById(this.id)?.containerIcon || defaultViewIcon;
    }
    renderHeaderTitle(container, title) {
        this.iconContainer = append(container, $('.icon', undefined));
        const icon = this.getIcon();
        let cssClass = undefined;
        if (URI.isUri(icon)) {
            cssClass = `view-${this.id.replace(/[\.\:]/g, '-')}`;
            const iconClass = `.pane-header .icon.${cssClass}`;
            createCSSRule(iconClass, `
				mask: ${asCSSUrl(icon)} no-repeat 50% 50%;
				mask-size: 24px;
				-webkit-mask: ${asCSSUrl(icon)} no-repeat 50% 50%;
				-webkit-mask-size: 16px;
			`);
        }
        else if (ThemeIcon.isThemeIcon(icon)) {
            cssClass = ThemeIcon.asClassName(icon);
        }
        if (cssClass) {
            this.iconContainer.classList.add(...cssClass.split(' '));
        }
        const calculatedTitle = this.calculateTitle(title);
        this.titleContainer = append(container, $('h3.title', {}, calculatedTitle));
        this.titleContainerHover = this._register(this.hoverService.setupManagedHover(getDefaultHoverDelegate('mouse'), this.titleContainer, calculatedTitle));
        if (this._titleDescription) {
            this.setTitleDescription(this._titleDescription);
        }
        this.iconContainerHover = this._register(this.hoverService.setupManagedHover(getDefaultHoverDelegate('mouse'), this.iconContainer, calculatedTitle));
        this.iconContainer.setAttribute('aria-label', this._getAriaLabel(calculatedTitle, this._titleDescription));
    }
    _getAriaLabel(title, description) {
        const viewHasAccessibilityHelpContent = this.viewDescriptorService.getViewDescriptorById(this.id)?.accessibilityHelpContent;
        const accessibleViewHasShownForView = this.accessibleViewInformationService?.hasShownAccessibleView(this.id);
        if (!viewHasAccessibilityHelpContent || accessibleViewHasShownForView) {
            if (description) {
                return `${title} - ${description}`;
            }
            else {
                return title;
            }
        }
        return nls.localize('viewAccessibilityHelp', 'Use Alt+F1 for accessibility help {0}', title);
    }
    updateTitle(title) {
        const calculatedTitle = this.calculateTitle(title);
        if (this.titleContainer) {
            this.titleContainer.textContent = calculatedTitle;
            this.titleContainerHover?.update(calculatedTitle);
        }
        this.updateAriaHeaderLabel(calculatedTitle, this._titleDescription);
        this._title = title;
        this._onDidChangeTitleArea.fire();
    }
    updateAriaHeaderLabel(title, description) {
        const ariaLabel = this._getAriaLabel(title, description);
        if (this.iconContainer) {
            this.iconContainerHover?.update(title);
            this.iconContainer.setAttribute('aria-label', ariaLabel);
        }
        this.ariaHeaderLabel = this.getAriaHeaderLabel(ariaLabel);
    }
    setTitleDescription(description) {
        if (this.titleDescriptionContainer) {
            this.titleDescriptionContainer.textContent = description ?? '';
            this.titleDescriptionContainerHover?.update(description ?? '');
        }
        else if (description && this.titleContainer) {
            this.titleDescriptionContainer = after(this.titleContainer, $('span.description', {}, description));
            this.titleDescriptionContainerHover = this._register(this.hoverService.setupManagedHover(getDefaultHoverDelegate('mouse'), this.titleDescriptionContainer, description));
        }
    }
    updateTitleDescription(description) {
        this.setTitleDescription(description);
        this.updateAriaHeaderLabel(this._title, description);
        this._titleDescription = description;
        this._onDidChangeTitleArea.fire();
    }
    calculateTitle(title) {
        const viewContainer = this.viewDescriptorService.getViewContainerByViewId(this.id);
        const model = this.viewDescriptorService.getViewContainerModel(viewContainer);
        const viewDescriptor = this.viewDescriptorService.getViewDescriptorById(this.id);
        const isDefault = this.viewDescriptorService.getDefaultContainerById(this.id) === viewContainer;
        if (!isDefault && viewDescriptor?.containerTitle && model.title !== viewDescriptor.containerTitle) {
            return `${viewDescriptor.containerTitle}: ${title}`;
        }
        return title;
    }
    renderBody(container) {
        this.viewWelcomeController = this._register(this.instantiationService.createInstance(ViewWelcomeController, container, this));
    }
    layoutBody(height, width) {
        this.viewWelcomeController?.layout(height, width);
    }
    onDidScrollRoot() {
        // noop
    }
    getProgressIndicator() {
        if (this.progressBar === undefined) {
            this.progressBar = this._register(new ProgressBar(this.element, defaultProgressBarStyles));
            this.progressBar.hide();
        }
        if (this.progressIndicator === undefined) {
            const that = this;
            this.progressIndicator = this._register(new ScopedProgressIndicator(assertReturnsDefined(this.progressBar), new class extends AbstractProgressScope {
                constructor() {
                    super(that.id, that.isBodyVisible());
                    this._register(that.onDidChangeBodyVisibility(isVisible => isVisible ? this.onScopeOpened(that.id) : this.onScopeClosed(that.id)));
                }
            }()));
        }
        return this.progressIndicator;
    }
    getProgressLocation() {
        return this.viewDescriptorService.getViewContainerByViewId(this.id).id;
    }
    getLocationBasedColors() {
        return getLocationBasedViewColors(this.viewDescriptorService.getViewLocationById(this.id));
    }
    focus() {
        if (this.viewWelcomeController?.enabled) {
            this.viewWelcomeController.focus();
        }
        else if (this.element) {
            this.element.focus();
        }
        if (isActiveElement(this.element) || isAncestorOfActiveElement(this.element)) {
            this._onDidFocus.fire();
        }
    }
    setActions() {
        if (this.toolbar) {
            const primaryActions = [...this.menuActions.getPrimaryActions()];
            if (this.shouldShowFilterInHeader()) {
                primaryActions.unshift(VIEWPANE_FILTER_ACTION);
            }
            this.toolbar.setActions(prepareActions(primaryActions), prepareActions(this.menuActions.getSecondaryActions()));
            this.toolbar.context = this.getActionsContext();
        }
    }
    updateActionsVisibility() {
        if (!this.headerContainer) {
            return;
        }
        const shouldAlwaysShowActions = this.configurationService.getValue('workbench.view.alwaysShowHeaderActions');
        this.headerContainer.classList.toggle('actions-always-visible', shouldAlwaysShowActions);
    }
    updateActions() {
        this.setActions();
        this._onDidChangeTitleArea.fire();
    }
    createActionViewItem(action, options) {
        if (action.id === VIEWPANE_FILTER_ACTION.id) {
            const that = this;
            return new class extends BaseActionViewItem {
                constructor() { super(null, action); }
                setFocusable() { }
                get trapsArrowNavigation() { return true; }
                render(container) {
                    container.classList.add('viewpane-filter-container');
                    const filter = that.getFilterWidget();
                    append(container, filter.element);
                    filter.relayout();
                }
            };
        }
        return createActionViewItem(this.instantiationService, action, { ...options, ...{ menuAsChild: action instanceof SubmenuItemAction } });
    }
    getActionsContext() {
        return undefined;
    }
    getActionRunner() {
        return undefined;
    }
    getOptimalWidth() {
        return 0;
    }
    saveState() {
        // Subclasses to implement for saving state
    }
    shouldShowWelcome() {
        return false;
    }
    getFilterWidget() {
        return undefined;
    }
    shouldShowFilterInHeader() {
        return false;
    }
};
ViewPane = ViewPane_1 = __decorate([
    __param(1, IKeybindingService),
    __param(2, IContextMenuService),
    __param(3, IConfigurationService),
    __param(4, IContextKeyService),
    __param(5, IViewDescriptorService),
    __param(6, IInstantiationService),
    __param(7, IOpenerService),
    __param(8, IThemeService),
    __param(9, IHoverService)
], ViewPane);
export { ViewPane };
let FilterViewPane = class FilterViewPane extends ViewPane {
    constructor(options, keybindingService, contextMenuService, configurationService, contextKeyService, viewDescriptorService, instantiationService, openerService, themeService, hoverService, accessibleViewService) {
        super(options, keybindingService, contextMenuService, configurationService, contextKeyService, viewDescriptorService, instantiationService, openerService, themeService, hoverService, accessibleViewService);
        const childInstantiationService = this._register(instantiationService.createChild(new ServiceCollection([IContextKeyService, this.scopedContextKeyService])));
        this.filterWidget = this._register(childInstantiationService.createInstance(FilterWidget, options.filterOptions));
    }
    getFilterWidget() {
        return this.filterWidget;
    }
    renderBody(container) {
        super.renderBody(container);
        this.filterContainer = append(container, $('.viewpane-filter-container'));
    }
    layoutBody(height, width) {
        super.layoutBody(height, width);
        this.dimension = new Dimension(width, height);
        const wasFilterShownInHeader = !this.filterContainer?.hasChildNodes();
        const shouldShowFilterInHeader = this.shouldShowFilterInHeader();
        if (wasFilterShownInHeader !== shouldShowFilterInHeader) {
            if (shouldShowFilterInHeader) {
                reset(this.filterContainer);
            }
            this.updateActions();
            if (!shouldShowFilterInHeader) {
                append(this.filterContainer, this.filterWidget.element);
            }
        }
        if (!shouldShowFilterInHeader) {
            height = height - 44;
        }
        this.filterWidget.layout(width);
        this.layoutBodyContent(height, width);
    }
    shouldShowFilterInHeader() {
        return !(this.dimension && this.dimension.width < 600 && this.dimension.height > 100);
    }
};
FilterViewPane = __decorate([
    __param(1, IKeybindingService),
    __param(2, IContextMenuService),
    __param(3, IConfigurationService),
    __param(4, IContextKeyService),
    __param(5, IViewDescriptorService),
    __param(6, IInstantiationService),
    __param(7, IOpenerService),
    __param(8, IThemeService),
    __param(9, IHoverService)
], FilterViewPane);
export { FilterViewPane };
export function getLocationBasedViewColors(location) {
    let background, overlayBackground, stickyScrollBackground, stickyScrollBorder, stickyScrollShadow;
    switch (location) {
        case 1 /* ViewContainerLocation.Panel */:
            background = PANEL_BACKGROUND;
            overlayBackground = PANEL_SECTION_DRAG_AND_DROP_BACKGROUND;
            stickyScrollBackground = PANEL_STICKY_SCROLL_BACKGROUND;
            stickyScrollBorder = PANEL_STICKY_SCROLL_BORDER;
            stickyScrollShadow = PANEL_STICKY_SCROLL_SHADOW;
            break;
        case 0 /* ViewContainerLocation.Sidebar */:
        case 2 /* ViewContainerLocation.AuxiliaryBar */:
        default:
            background = SIDE_BAR_BACKGROUND;
            overlayBackground = SIDE_BAR_DRAG_AND_DROP_BACKGROUND;
            stickyScrollBackground = SIDE_BAR_STICKY_SCROLL_BACKGROUND;
            stickyScrollBorder = SIDE_BAR_STICKY_SCROLL_BORDER;
            stickyScrollShadow = SIDE_BAR_STICKY_SCROLL_SHADOW;
    }
    return {
        background,
        overlayBackground,
        listOverrideStyles: {
            listBackground: background,
            treeStickyScrollBackground: stickyScrollBackground,
            treeStickyScrollBorder: stickyScrollBorder,
            treeStickyScrollShadow: stickyScrollShadow
        }
    };
}
export class ViewAction extends Action2 {
    constructor(desc) {
        super(desc);
        this.desc = desc;
    }
    run(accessor, ...args) {
        const view = accessor.get(IViewsService).getActiveViewWithId(this.desc.viewId);
        if (view) {
            return this.runInView(accessor, view, ...args);
        }
        return undefined;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmlld1BhbmUuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9hZHZpa2FyL0RvY3VtZW50cy9hcmNoaXRlY3QvYXJjaDIvQXJjaElERS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYnJvd3Nlci9wYXJ0cy92aWV3cy92aWV3UGFuZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyx5QkFBeUIsQ0FBQztBQUNqQyxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFDO0FBQzFDLE9BQU8sRUFBRSxLQUFLLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDbEUsT0FBTyxFQUFFLGFBQWEsRUFBRSxVQUFVLEVBQUUsTUFBTSxvREFBb0QsQ0FBQztBQUMvRixPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sRUFBRSxDQUFDLEVBQUUsVUFBVSxFQUFFLFNBQVMsRUFBRSxxQkFBcUIsRUFBRSxTQUFTLEVBQUUsS0FBSyxFQUFFLHlCQUF5QixFQUFFLGVBQWUsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQy9LLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUMzRSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsUUFBUSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDdkYsT0FBTyxFQUFFLGFBQWEsRUFBRSxlQUFlLEVBQUUsWUFBWSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDcEcsT0FBTyxFQUFFLE1BQU0sRUFBMEIsTUFBTSxvQ0FBb0MsQ0FBQztBQUNwRixPQUFPLEVBQXVDLGNBQWMsRUFBRSxNQUFNLG9EQUFvRCxDQUFDO0FBQ3pILE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUM1RSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUMxRixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUM5RixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDbEYsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2pFLE9BQU8sRUFBZ0IsSUFBSSxFQUFlLE1BQU0sbURBQW1ELENBQUM7QUFDcEcsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDbkcsT0FBTyxFQUFFLFVBQVUsSUFBSSx1QkFBdUIsRUFBUyxzQkFBc0IsRUFBaUUsZUFBZSxFQUFFLDZCQUE2QixFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFDL04sT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQy9FLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQzFGLE9BQU8sRUFBRSxvQkFBb0IsRUFBaUIsTUFBTSxrQ0FBa0MsQ0FBQztBQUN2RixPQUFPLEVBQUUscUJBQXFCLEVBQW9CLE1BQU0sNERBQTRELENBQUM7QUFDckgsT0FBTyxFQUFFLE1BQU0sRUFBRSxPQUFPLEVBQW1CLGlCQUFpQixFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDckgsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0saUVBQWlFLENBQUM7QUFDdkcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQ3hFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQztBQUM5RSxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sOENBQThDLENBQUM7QUFDdEUsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBRW5FLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx3REFBd0QsQ0FBQztBQUNyRixPQUFPLEVBQUUscUJBQXFCLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUV6SCxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUVsRyxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDckQsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBQ2pGLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUU5RCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxpREFBaUQsQ0FBQztBQUNuRixPQUFPLEVBQUUsWUFBWSxFQUF3QixNQUFNLGlCQUFpQixDQUFDO0FBQ3JFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDBEQUEwRCxDQUFDO0FBQzlGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGdFQUFnRSxDQUFDO0FBQ25HLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSx3QkFBd0IsRUFBRSxNQUFNLHFEQUFxRCxDQUFDO0FBQ3BILE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLDJEQUEyRCxDQUFDO0FBQ3BHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGlEQUFpRCxDQUFDO0FBRXBGLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUU1RSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsc0NBQXNDLEVBQUUsOEJBQThCLEVBQUUsMEJBQTBCLEVBQUUsMEJBQTBCLEVBQUUsbUJBQW1CLEVBQUUsaUNBQWlDLEVBQUUsaUNBQWlDLEVBQUUsNkJBQTZCLEVBQUUsNkJBQTZCLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQUVyVixPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxxREFBcUQsQ0FBQztBQUMzRixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sc0JBQXNCLENBQUM7QUFFdkQsTUFBTSxDQUFOLElBQVksbUJBU1g7QUFURCxXQUFZLG1CQUFtQjtJQUM5QiwrRUFBK0U7SUFDL0UsbUVBQU8sQ0FBQTtJQUVQLHlEQUF5RDtJQUN6RCw2RUFBWSxDQUFBO0lBRVosK0JBQStCO0lBQy9CLGlFQUFNLENBQUE7QUFDUCxDQUFDLEVBVFcsbUJBQW1CLEtBQW5CLG1CQUFtQixRQVM5QjtBQWVELE1BQU0sQ0FBQyxNQUFNLHNCQUFzQixHQUFHLElBQUksTUFBTSxDQUFDLHdCQUF3QixDQUFDLENBQUM7QUFFM0UsTUFBTSw2QkFBNkIsR0FBRyxZQUFZLENBQUMsOEJBQThCLEVBQUUsT0FBTyxDQUFDLFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLCtCQUErQixFQUFFLDJDQUEyQyxDQUFDLENBQUMsQ0FBQztBQUNwTSxNQUFNLDhCQUE4QixHQUFHLFlBQVksQ0FBQywrQkFBK0IsRUFBRSxPQUFPLENBQUMsWUFBWSxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsZ0NBQWdDLEVBQUUsMkNBQTJDLENBQUMsQ0FBQyxDQUFDO0FBRXhNLE1BQU0sYUFBYSxHQUFHLFFBQVEsQ0FBQyxFQUFFLENBQWlCLHVCQUF1QixDQUFDLGFBQWEsQ0FBQyxDQUFDO0FBYXpGLElBQU0scUJBQXFCLEdBQTNCLE1BQU0scUJBQXFCO0lBSzFCLElBQUksT0FBTyxLQUFjLE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUM7SUFTaEQsWUFDa0IsU0FBc0IsRUFDdEIsUUFBOEIsRUFDeEIsb0JBQW1ELEVBQzFELGFBQXVDLEVBQ25DLGlCQUE2QyxFQUM5QyxnQkFBbUM7UUFMckMsY0FBUyxHQUFULFNBQVMsQ0FBYTtRQUN0QixhQUFRLEdBQVIsUUFBUSxDQUFzQjtRQUNoQix5QkFBb0IsR0FBcEIsb0JBQW9CLENBQXVCO1FBQ2hELGtCQUFhLEdBQWIsYUFBYSxDQUFnQjtRQUMzQixzQkFBaUIsR0FBakIsaUJBQWlCLENBQW9CO1FBaEIxRCxVQUFLLEdBQVksRUFBRSxDQUFDO1FBR3BCLGFBQVEsR0FBWSxLQUFLLENBQUM7UUFJakIsZ0JBQVcsR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFDO1FBQ3BDLHVCQUFrQixHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLElBQUksZUFBZSxFQUFFLENBQUMsQ0FBQztRQUNqRSxzQkFBaUIsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxJQUFJLGVBQWUsRUFBRSxDQUFDLENBQUM7UUFVaEYsSUFBSSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLDJCQUEyQixFQUFFLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQywyQkFBMkIsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUNqSSxJQUFJLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxjQUFjLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLDBEQUEwRDtJQUN4SSxDQUFDO0lBRUQsTUFBTSxDQUFDLE1BQWMsRUFBRSxLQUFhO1FBQ25DLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7WUFDcEIsT0FBTztRQUNSLENBQUM7UUFFRCxJQUFJLENBQUMsT0FBUSxDQUFDLEtBQUssQ0FBQyxNQUFNLEdBQUcsR0FBRyxNQUFNLElBQUksQ0FBQztRQUMzQyxJQUFJLENBQUMsT0FBUSxDQUFDLEtBQUssQ0FBQyxLQUFLLEdBQUcsR0FBRyxLQUFLLElBQUksQ0FBQztRQUN6QyxJQUFJLENBQUMsT0FBUSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFLEtBQUssR0FBRyxHQUFHLENBQUMsQ0FBQztRQUNwRCxJQUFJLENBQUMsaUJBQWtCLENBQUMsV0FBVyxFQUFFLENBQUM7SUFDdkMsQ0FBQztJQUVELEtBQUs7UUFDSixJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO1lBQ3BCLE9BQU87UUFDUixDQUFDO1FBRUQsSUFBSSxDQUFDLE9BQVEsQ0FBQyxLQUFLLEVBQUUsQ0FBQztJQUN2QixDQUFDO0lBRU8sMkJBQTJCO1FBQ2xDLE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsaUJBQWlCLEVBQUUsQ0FBQztRQUVsRCxJQUFJLElBQUksQ0FBQyxRQUFRLEtBQUssT0FBTyxFQUFFLENBQUM7WUFDL0IsT0FBTztRQUNSLENBQUM7UUFFRCxJQUFJLENBQUMsUUFBUSxHQUFHLE9BQU8sQ0FBQztRQUV4QixJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDZCxJQUFJLENBQUMsa0JBQWtCLENBQUMsS0FBSyxFQUFFLENBQUM7WUFDaEMsT0FBTztRQUNSLENBQUM7UUFFRCxJQUFJLENBQUMsU0FBUyxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDeEMsTUFBTSxvQkFBb0IsR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQztRQUN4RSxJQUFJLENBQUMsT0FBTyxHQUFHLENBQUMsQ0FBQyx1QkFBdUIsRUFBRSxFQUFFLFFBQVEsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQzNELElBQUksQ0FBQyxpQkFBaUIsR0FBRyxJQUFJLG9CQUFvQixDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsRUFBRSx1QkFBdUIsRUFBRSxJQUFJLEVBQUUsVUFBVSxvQ0FBNEIsRUFBRSxRQUFRLHFDQUE2QixHQUFHLENBQUMsQ0FBQztRQUNuTCxNQUFNLENBQUMsb0JBQW9CLEVBQUUsSUFBSSxDQUFDLGlCQUFpQixDQUFDLFVBQVUsRUFBRSxDQUFDLENBQUM7UUFFbEUsSUFBSSxDQUFDLGtCQUFrQixDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsR0FBRyxFQUFFO1lBQzdDLElBQUksQ0FBQyxTQUFTLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQztZQUMzQyxJQUFJLENBQUMsaUJBQWtCLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDbEMsb0JBQW9CLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDOUIsSUFBSSxDQUFDLGlCQUFpQixHQUFHLFNBQVMsQ0FBQztZQUNuQyxJQUFJLENBQUMsT0FBTyxHQUFHLFNBQVMsQ0FBQztRQUMxQixDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRUosSUFBSSxDQUFDLGlCQUFpQixDQUFDLGtCQUFrQixDQUFDLElBQUksQ0FBQyxrQkFBa0IsRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLGtCQUFrQixDQUFDLENBQUM7UUFDbEcsS0FBSyxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUMsNkJBQTZCLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxLQUFLLElBQUksQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FDcEcsSUFBSSxDQUFDLDZCQUE2QixFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsa0JBQWtCLENBQUMsQ0FBQztRQUNyRSxJQUFJLENBQUMsNkJBQTZCLEVBQUUsQ0FBQztJQUN0QyxDQUFDO0lBRU8sNkJBQTZCO1FBQ3BDLE1BQU0sV0FBVyxHQUFHLGFBQWEsQ0FBQyxxQkFBcUIsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBRTFFLElBQUksQ0FBQyxLQUFLLEdBQUcsRUFBRSxDQUFDO1FBRWhCLEtBQUssTUFBTSxVQUFVLElBQUksV0FBVyxFQUFFLENBQUM7WUFDdEMsSUFBSSxVQUFVLENBQUMsSUFBSSxLQUFLLFNBQVMsRUFBRSxDQUFDO2dCQUNuQyxJQUFJLENBQUMsV0FBVyxHQUFHLEVBQUUsVUFBVSxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsQ0FBQztZQUNsRCxDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsTUFBTSxPQUFPLEdBQUcsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLG1CQUFtQixDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDO2dCQUNyRyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxFQUFFLFVBQVUsRUFBRSxPQUFPLEVBQUUsQ0FBQyxDQUFDO1lBQzFDLENBQUM7UUFDRixDQUFDO1FBRUQsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO0lBQ2YsQ0FBQztJQUVPLGtCQUFrQjtRQUN6QixJQUFJLFNBQVMsR0FBRyxLQUFLLENBQUM7UUFFdEIsS0FBSyxNQUFNLElBQUksSUFBSSxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7WUFDL0IsSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxJQUFJLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxLQUFLLFNBQVMsRUFBRSxDQUFDO2dCQUNqRSxTQUFTO1lBQ1YsQ0FBQztZQUVELE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDO1lBRWpGLElBQUksSUFBSSxDQUFDLE9BQU8sS0FBSyxPQUFPLEVBQUUsQ0FBQztnQkFDOUIsU0FBUztZQUNWLENBQUM7WUFFRCxJQUFJLENBQUMsT0FBTyxHQUFHLE9BQU8sQ0FBQztZQUN2QixTQUFTLEdBQUcsSUFBSSxDQUFDO1FBQ2xCLENBQUM7UUFFRCxJQUFJLFNBQVMsRUFBRSxDQUFDO1lBQ2YsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO1FBQ2YsQ0FBQztJQUNGLENBQUM7SUFFTyxNQUFNO1FBQ2IsSUFBSSxDQUFDLGlCQUFpQixDQUFDLEtBQUssRUFBRSxDQUFDO1FBQy9CLElBQUksQ0FBQyxPQUFRLENBQUMsU0FBUyxHQUFHLEVBQUUsQ0FBQztRQUU3QixNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMscUJBQXFCLEVBQUUsQ0FBQztRQUU5QyxJQUFJLFFBQVEsQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDM0IsSUFBSSxDQUFDLFNBQVMsQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1lBQzNDLElBQUksQ0FBQyxpQkFBa0IsQ0FBQyxXQUFXLEVBQUUsQ0FBQztZQUN0QyxPQUFPO1FBQ1IsQ0FBQztRQUVELElBQUksWUFBWSxHQUFHLENBQUMsQ0FBQztRQUNyQixLQUFLLE1BQU0sRUFBRSxPQUFPLEVBQUUsWUFBWSxFQUFFLHNCQUFzQixFQUFFLElBQUksUUFBUSxFQUFFLENBQUM7WUFDMUUsTUFBTSxLQUFLLEdBQUcsT0FBTyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUVsQyxLQUFLLElBQUksSUFBSSxJQUFJLEtBQUssRUFBRSxDQUFDO2dCQUN4QixJQUFJLEdBQUcsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO2dCQUVuQixJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7b0JBQ1gsU0FBUztnQkFDVixDQUFDO2dCQUVELE1BQU0sVUFBVSxHQUFHLGVBQWUsQ0FBQyxJQUFJLENBQUMsQ0FBQztnQkFFekMsSUFBSSxVQUFVLENBQUMsS0FBSyxDQUFDLE1BQU0sS0FBSyxDQUFDLElBQUksT0FBTyxVQUFVLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxLQUFLLFFBQVEsRUFBRSxDQUFDO29CQUM5RSxNQUFNLElBQUksR0FBRyxVQUFVLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO29CQUNqQyxNQUFNLGVBQWUsR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLE9BQVEsRUFBRSxDQUFDLENBQUMsbUJBQW1CLENBQUMsQ0FBQyxDQUFDO29CQUN0RSxNQUFNLE1BQU0sR0FBRyxJQUFJLE1BQU0sQ0FBQyxlQUFlLEVBQUUsRUFBRSxLQUFLLEVBQUUsSUFBSSxDQUFDLEtBQUssRUFBRSxZQUFZLEVBQUUsSUFBSSxFQUFFLFNBQVMsRUFBRSxzQkFBc0IsSUFBSSxZQUFZLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEtBQUssRUFBRSxHQUFHLG1CQUFtQixHQUFHLENBQUMsQ0FBQztvQkFDckwsTUFBTSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDO29CQUMxQixNQUFNLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxFQUFFO3dCQUNyQixJQUFJLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLEVBQUUsYUFBYSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7b0JBQzdELENBQUMsRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLGlCQUFpQixDQUFDLENBQUM7b0JBQ2pDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUM7b0JBQ25DLFlBQVksRUFBRSxDQUFDO29CQUVmLElBQUksWUFBWSxFQUFFLENBQUM7d0JBQ2xCLE1BQU0sZ0JBQWdCLEdBQUcsR0FBRyxFQUFFLENBQUMsTUFBTSxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUMsaUJBQWlCLENBQUMsbUJBQW1CLENBQUMsWUFBWSxDQUFDLENBQUM7d0JBQ3pHLGdCQUFnQixFQUFFLENBQUM7d0JBRW5CLE1BQU0sSUFBSSxHQUFHLElBQUksR0FBRyxDQUFDLFlBQVksQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDO3dCQUMxQyxNQUFNLGtCQUFrQixHQUFHLEtBQUssQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLGtCQUFrQixFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO3dCQUM3RyxrQkFBa0IsQ0FBQyxnQkFBZ0IsRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLGlCQUFpQixDQUFDLENBQUM7b0JBQ3BFLENBQUM7Z0JBQ0YsQ0FBQztxQkFBTSxDQUFDO29CQUNQLE1BQU0sQ0FBQyxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUMsT0FBUSxFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO29CQUV4QyxLQUFLLE1BQU0sSUFBSSxJQUFJLFVBQVUsQ0FBQyxLQUFLLEVBQUUsQ0FBQzt3QkFDckMsSUFBSSxPQUFPLElBQUksS0FBSyxRQUFRLEVBQUUsQ0FBQzs0QkFDOUIsTUFBTSxDQUFDLENBQUMsRUFBRSxHQUFHLG9CQUFvQixDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7d0JBQzFDLENBQUM7NkJBQU0sQ0FBQzs0QkFDUCxNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsaUJBQWlCLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsSUFBSSxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQzs0QkFFckcsSUFBSSxZQUFZLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQztnQ0FDdEQsTUFBTSxnQkFBZ0IsR0FBRyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxtQkFBbUIsQ0FBQyxZQUFZLENBQUMsQ0FBQztnQ0FDdkcsZ0JBQWdCLEVBQUUsQ0FBQztnQ0FFbkIsTUFBTSxJQUFJLEdBQUcsSUFBSSxHQUFHLENBQUMsWUFBWSxDQUFDLElBQUksRUFBRSxDQUFDLENBQUM7Z0NBQzFDLE1BQU0sa0JBQWtCLEdBQUcsS0FBSyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsa0JBQWtCLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7Z0NBQzdHLGtCQUFrQixDQUFDLGdCQUFnQixFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsaUJBQWlCLENBQUMsQ0FBQzs0QkFDcEUsQ0FBQzt3QkFDRixDQUFDO29CQUNGLENBQUM7Z0JBQ0YsQ0FBQztZQUNGLENBQUM7UUFDRixDQUFDO1FBRUQsSUFBSSxDQUFDLFNBQVMsQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQ3hDLElBQUksQ0FBQyxpQkFBa0IsQ0FBQyxXQUFXLEVBQUUsQ0FBQztJQUN2QyxDQUFDO0lBRU8scUJBQXFCO1FBQzVCLE1BQU0sWUFBWSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBRXZELElBQUksWUFBWSxDQUFDLE1BQU0sS0FBSyxDQUFDLElBQUksSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDO1lBQ25ELE9BQU8sQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBQ3RDLENBQUM7UUFFRCxPQUFPLFlBQVksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUM7SUFDNUMsQ0FBQztJQUVELE9BQU87UUFDTixJQUFJLENBQUMsV0FBVyxDQUFDLE9BQU8sRUFBRSxDQUFDO0lBQzVCLENBQUM7Q0FDRCxDQUFBO0FBM01LLHFCQUFxQjtJQWlCeEIsV0FBQSxxQkFBcUIsQ0FBQTtJQUNyQixXQUFBLGNBQWMsQ0FBQTtJQUNkLFdBQUEsa0JBQWtCLENBQUE7SUFDbEIsV0FBQSxpQkFBaUIsQ0FBQTtHQXBCZCxxQkFBcUIsQ0EyTTFCO0FBRU0sSUFBZSxRQUFRLEdBQXZCLE1BQWUsUUFBUyxTQUFRLElBQUk7O2FBRWxCLDRCQUF1QixHQUFHLHdDQUF3QyxBQUEzQyxDQUE0QztJQXFCM0YsSUFBVyxLQUFLO1FBQ2YsT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDO0lBQ3BCLENBQUM7SUFHRCxJQUFXLGdCQUFnQjtRQUMxQixPQUFPLElBQUksQ0FBQyxpQkFBaUIsQ0FBQztJQUMvQixDQUFDO0lBR0QsSUFBVyw0QkFBNEI7UUFDdEMsT0FBTyxJQUFJLENBQUMsNkJBQTZCLENBQUM7SUFDM0MsQ0FBQztJQXVCRCxZQUNDLE9BQXlCLEVBQ0wsaUJBQStDLEVBQzlDLGtCQUFpRCxFQUMvQyxvQkFBOEQsRUFDakUsaUJBQStDLEVBQzNDLHFCQUF1RCxFQUN4RCxvQkFBcUQsRUFDNUQsYUFBdUMsRUFDeEMsWUFBcUMsRUFDckMsWUFBOEMsRUFDMUMsZ0NBQW9FO1FBRXZGLEtBQUssQ0FBQyxFQUFFLEdBQUcsT0FBTyxFQUFFLEdBQUcsRUFBRSxXQUFXLEVBQUUscUJBQXFCLENBQUMsbUJBQW1CLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyx3Q0FBZ0MsQ0FBQyxDQUFDLGdDQUF3QixDQUFDLDZCQUFxQixFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBWG5KLHNCQUFpQixHQUFqQixpQkFBaUIsQ0FBb0I7UUFDcEMsdUJBQWtCLEdBQWxCLGtCQUFrQixDQUFxQjtRQUM1Qix5QkFBb0IsR0FBcEIsb0JBQW9CLENBQXVCO1FBQ3ZELHNCQUFpQixHQUFqQixpQkFBaUIsQ0FBb0I7UUFDakMsMEJBQXFCLEdBQXJCLHFCQUFxQixDQUF3QjtRQUM5Qyx5QkFBb0IsR0FBcEIsb0JBQW9CLENBQXVCO1FBQ2xELGtCQUFhLEdBQWIsYUFBYSxDQUFnQjtRQUM5QixpQkFBWSxHQUFaLFlBQVksQ0FBZTtRQUNsQixpQkFBWSxHQUFaLFlBQVksQ0FBZTtRQUMxQyxxQ0FBZ0MsR0FBaEMsZ0NBQWdDLENBQW9DO1FBakVoRixnQkFBVyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLEVBQVEsQ0FBQyxDQUFDO1FBQ2pELGVBQVUsR0FBZ0IsSUFBSSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUM7UUFFbEQsZUFBVSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLEVBQVEsQ0FBQyxDQUFDO1FBQ2hELGNBQVMsR0FBZ0IsSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUM7UUFFaEQsK0JBQTBCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sRUFBVyxDQUFDLENBQUM7UUFDbkUsOEJBQXlCLEdBQW1CLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxLQUFLLENBQUM7UUFFakYsMEJBQXFCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sRUFBUSxDQUFDLENBQUM7UUFDN0QseUJBQW9CLEdBQWdCLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxLQUFLLENBQUM7UUFFcEUsaUNBQTRCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sRUFBUSxDQUFDLENBQUM7UUFDcEUsZ0NBQTJCLEdBQWdCLElBQUksQ0FBQyw0QkFBNEIsQ0FBQyxLQUFLLENBQUM7UUFFcEYsZUFBVSxHQUFZLEtBQUssQ0FBQztRQW1DbkIsMEJBQXFCLEdBQTJDLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxhQUFhLEVBQUUsQ0FBQyxDQUFDO1FBbUJwSCxJQUFJLENBQUMsRUFBRSxHQUFHLE9BQU8sQ0FBQyxFQUFFLENBQUM7UUFDckIsSUFBSSxDQUFDLE1BQU0sR0FBRyxPQUFPLENBQUMsS0FBSyxDQUFDO1FBQzVCLElBQUksQ0FBQyxpQkFBaUIsR0FBRyxPQUFPLENBQUMsZ0JBQWdCLENBQUM7UUFDbEQsSUFBSSxDQUFDLDZCQUE2QixHQUFHLE9BQU8sQ0FBQyw0QkFBNEIsQ0FBQztRQUMxRSxJQUFJLENBQUMsV0FBVyxHQUFHLE9BQU8sQ0FBQyxXQUFXLElBQUksbUJBQW1CLENBQUMsT0FBTyxDQUFDO1FBRXRFLElBQUksQ0FBQyx1QkFBdUIsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLGlCQUFpQixDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztRQUM1RixJQUFJLENBQUMsdUJBQXVCLENBQUMsU0FBUyxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDeEQsTUFBTSxlQUFlLEdBQUcsSUFBSSxDQUFDLHVCQUF1QixDQUFDLFNBQVMsQ0FBQyxjQUFjLEVBQUUsNkJBQTZCLENBQUMscUJBQXFCLENBQUMsbUJBQW1CLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBRSxDQUFDLENBQUMsQ0FBQztRQUNuSyxJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMscUJBQXFCLENBQUMsbUJBQW1CLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxFQUFFLEtBQUssSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUMsZUFBZSxDQUFDLEdBQUcsQ0FBQyw2QkFBNkIsQ0FBQyxxQkFBcUIsQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUV2TyxNQUFNLHlCQUF5QixHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLG9CQUFvQixDQUFDLFdBQVcsQ0FBQyxJQUFJLGlCQUFpQixDQUFDLENBQUMsa0JBQWtCLEVBQUUsSUFBSSxDQUFDLHVCQUF1QixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDbkssSUFBSSxDQUFDLFdBQVcsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLHlCQUF5QixDQUFDLGNBQWMsQ0FBQyxlQUFlLEVBQUUsT0FBTyxDQUFDLFdBQVcsSUFBSSxNQUFNLENBQUMsU0FBUyxFQUFFLE1BQU0sQ0FBQyxnQkFBZ0IsRUFBRSxFQUFFLGlCQUFpQixFQUFFLENBQUMsT0FBTyxDQUFDLGdCQUFnQixFQUFFLGdCQUFnQixFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQztRQUN6TyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDMUUsQ0FBQztJQUVELElBQWEsYUFBYTtRQUN6QixPQUFPLEtBQUssQ0FBQyxhQUFhLENBQUM7SUFDNUIsQ0FBQztJQUVELElBQWEsYUFBYSxDQUFDLE9BQWdCO1FBQzFDLEtBQUssQ0FBQyxhQUFhLEdBQUcsT0FBTyxDQUFDO1FBQzlCLElBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxlQUFlLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUMxRCxDQUFDO0lBRUQsVUFBVSxDQUFDLE9BQWdCO1FBQzFCLElBQUksSUFBSSxDQUFDLFVBQVUsS0FBSyxPQUFPLEVBQUUsQ0FBQztZQUNqQyxJQUFJLENBQUMsVUFBVSxHQUFHLE9BQU8sQ0FBQztZQUUxQixJQUFJLElBQUksQ0FBQyxVQUFVLEVBQUUsRUFBRSxDQUFDO2dCQUN2QixJQUFJLENBQUMsMEJBQTBCLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBQy9DLENBQUM7UUFDRixDQUFDO0lBQ0YsQ0FBQztJQUVELFNBQVM7UUFDUixPQUFPLElBQUksQ0FBQyxVQUFVLENBQUM7SUFDeEIsQ0FBQztJQUVELGFBQWE7UUFDWixPQUFPLElBQUksQ0FBQyxVQUFVLElBQUksSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDO0lBQzdDLENBQUM7SUFFUSxXQUFXLENBQUMsUUFBaUI7UUFDckMsTUFBTSxPQUFPLEdBQUcsS0FBSyxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUM1QyxJQUFJLE9BQU8sRUFBRSxDQUFDO1lBQ2IsSUFBSSxDQUFDLDBCQUEwQixDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUNoRCxDQUFDO1FBQ0QsSUFBSSxDQUFDLGdCQUFnQixFQUFFLENBQUM7UUFDeEIsT0FBTyxPQUFPLENBQUM7SUFDaEIsQ0FBQztJQUVRLE1BQU07UUFDZCxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUM7UUFFZixNQUFNLFlBQVksR0FBRyxVQUFVLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQzlDLElBQUksQ0FBQyxTQUFTLENBQUMsWUFBWSxDQUFDLENBQUM7UUFDN0IsSUFBSSxDQUFDLFNBQVMsQ0FBQyxZQUFZLENBQUMsVUFBVSxDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ3ZFLElBQUksQ0FBQyxTQUFTLENBQUMsWUFBWSxDQUFDLFNBQVMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQztJQUN0RSxDQUFDO0lBRVMsWUFBWSxDQUFDLFNBQXNCO1FBQzVDLElBQUksQ0FBQyxlQUFlLEdBQUcsU0FBUyxDQUFDO1FBRWpDLElBQUksQ0FBQyxpQkFBaUIsR0FBRyxNQUFNLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxvQkFBb0IsU0FBUyxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFFcEksSUFBSSxDQUFDLGlCQUFpQixDQUFDLFNBQVMsRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7UUFFOUMsTUFBTSxPQUFPLEdBQUcsTUFBTSxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQztRQUNqRCxPQUFPLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxhQUFhLEVBQUUsSUFBSSxDQUFDLFdBQVcsS0FBSyxtQkFBbUIsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUN6RixPQUFPLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxlQUFlLEVBQUUsSUFBSSxDQUFDLFdBQVcsS0FBSyxtQkFBbUIsQ0FBQyxZQUFZLENBQUMsQ0FBQztRQUNqRyxJQUFJLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsZ0JBQWdCLEVBQUUsT0FBTyxFQUFFO1lBQ2xGLFdBQVcsdUNBQStCO1lBQzFDLHNCQUFzQixFQUFFLENBQUMsTUFBTSxFQUFFLE9BQU8sRUFBRSxFQUFFO2dCQUMzQyxNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsb0JBQW9CLENBQUMsTUFBTSxFQUFFLE9BQU8sQ0FBQyxDQUFDO2dCQUN4RCxJQUFJLElBQUksRUFBRSxDQUFDO29CQUNWLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUM7Z0JBQ3RELENBQUM7Z0JBQ0QsT0FBTyxJQUFJLENBQUM7WUFDYixDQUFDO1lBQ0QsU0FBUyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsc0JBQXNCLEVBQUUsYUFBYSxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUM7WUFDMUUsYUFBYSxFQUFFLE1BQU0sQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLGdCQUFnQixDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUM7WUFDM0UsNEJBQTRCLEVBQUUsSUFBSTtZQUNsQyxZQUFZLEVBQUUsSUFBSSxDQUFDLGVBQWUsRUFBRTtZQUNwQyxTQUFTLEVBQUUsSUFBSSxDQUFDLFdBQVcsQ0FBQyxNQUFNO1NBQ2xDLENBQUMsQ0FBQztRQUVILElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQzdCLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQztRQUVsQixJQUFJLENBQUMsU0FBUyxDQUFDLHFCQUFxQixDQUFDLE9BQU8sRUFBRSxTQUFTLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLGNBQWMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUV6RixNQUFNLGtCQUFrQixHQUFHLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyx3QkFBd0IsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDeEYsSUFBSSxrQkFBa0IsRUFBRSxDQUFDO1lBQ3hCLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLHFCQUFxQixDQUFDLHFCQUFxQixDQUFDLGtCQUFrQixDQUFDLENBQUMsd0JBQXdCLENBQUMsQ0FBQyxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDNUosQ0FBQzthQUFNLENBQUM7WUFDUCxPQUFPLENBQUMsS0FBSyxDQUFDLDJDQUEyQyxJQUFJLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztRQUNyRSxDQUFDO1FBRUQsTUFBTSxnQ0FBZ0MsR0FBRyxLQUFLLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyx3QkFBd0IsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxvQkFBb0IsQ0FBQyxVQUFRLENBQUMsdUJBQXVCLENBQUMsQ0FBQyxDQUFDO1FBQ3pLLElBQUksQ0FBQyxTQUFTLENBQUMsZ0NBQWdDLENBQUMsSUFBSSxDQUFDLHVCQUF1QixFQUFFLElBQUksQ0FBQyxDQUFDLENBQUM7UUFDckYsSUFBSSxDQUFDLHVCQUF1QixFQUFFLENBQUM7SUFDaEMsQ0FBQztJQUVrQixZQUFZO1FBQzlCLEtBQUssQ0FBQyxZQUFZLEVBQUUsQ0FBQztRQUNyQixJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztJQUN6QixDQUFDO0lBRU8sZ0JBQWdCO1FBQ3ZCLElBQUksSUFBSSxDQUFDLGlCQUFpQixFQUFFLENBQUM7WUFDNUIsSUFBSSxDQUFDLGlCQUFpQixDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsR0FBRyxTQUFTLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDNUcsSUFBSSxDQUFDLGlCQUFpQixDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsR0FBRyxTQUFTLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3pHLENBQUM7SUFDRixDQUFDO0lBRVMsYUFBYSxDQUFDLFFBQWlCO1FBQ3hDLE9BQU8sUUFBUSxDQUFDLENBQUMsQ0FBQyw2QkFBNkIsQ0FBQyxDQUFDLENBQUMsOEJBQThCLENBQUM7SUFDbEYsQ0FBQztJQUVRLEtBQUssQ0FBQyxNQUFtQjtRQUNqQyxLQUFLLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBRXBCLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUM1QixJQUFJLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQztZQUN4QixNQUFNLE9BQU8sR0FBRyxxQkFBcUIsQ0FBQyxNQUFNLENBQUMsZ0JBQWdCLEVBQUUsYUFBYSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUM7WUFDMUYsSUFBSSxHQUFHLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUM7Z0JBQ3JCLHFFQUFxRTtnQkFDckUsSUFBSSxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsZUFBZSxHQUFHLE9BQU8sQ0FBQztnQkFDbkQsSUFBSSxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsS0FBSyxHQUFHLEVBQUUsQ0FBQztZQUNyQyxDQUFDO2lCQUFNLENBQUM7Z0JBQ1Asc0VBQXNFO2dCQUN0RSxJQUFJLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxLQUFLLEdBQUcsT0FBTyxDQUFDO2dCQUN6QyxJQUFJLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxlQUFlLEdBQUcsRUFBRSxDQUFDO1lBQy9DLENBQUM7UUFDRixDQUFDO0lBQ0YsQ0FBQztJQUVPLE9BQU87UUFDZCxPQUFPLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxxQkFBcUIsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLEVBQUUsYUFBYSxJQUFJLGVBQWUsQ0FBQztJQUNwRyxDQUFDO0lBRVMsaUJBQWlCLENBQUMsU0FBc0IsRUFBRSxLQUFhO1FBQ2hFLElBQUksQ0FBQyxhQUFhLEdBQUcsTUFBTSxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsT0FBTyxFQUFFLFNBQVMsQ0FBQyxDQUFDLENBQUM7UUFDOUQsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBRTVCLElBQUksUUFBUSxHQUF1QixTQUFTLENBQUM7UUFDN0MsSUFBSSxHQUFHLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUM7WUFDckIsUUFBUSxHQUFHLFFBQVEsSUFBSSxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsU0FBUyxFQUFFLEdBQUcsQ0FBQyxFQUFFLENBQUM7WUFDckQsTUFBTSxTQUFTLEdBQUcsc0JBQXNCLFFBQVEsRUFBRSxDQUFDO1lBRW5ELGFBQWEsQ0FBQyxTQUFTLEVBQUU7WUFDaEIsUUFBUSxDQUFDLElBQUksQ0FBQzs7b0JBRU4sUUFBUSxDQUFDLElBQUksQ0FBQzs7SUFFOUIsQ0FBQyxDQUFDO1FBQ0osQ0FBQzthQUFNLElBQUksU0FBUyxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDO1lBQ3hDLFFBQVEsR0FBRyxTQUFTLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3hDLENBQUM7UUFFRCxJQUFJLFFBQVEsRUFBRSxDQUFDO1lBQ2QsSUFBSSxDQUFDLGFBQWEsQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLEdBQUcsUUFBUSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO1FBQzFELENBQUM7UUFFRCxNQUFNLGVBQWUsR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ25ELElBQUksQ0FBQyxjQUFjLEdBQUcsTUFBTSxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsVUFBVSxFQUFFLEVBQUUsRUFBRSxlQUFlLENBQUMsQ0FBQyxDQUFDO1FBQzVFLElBQUksQ0FBQyxtQkFBbUIsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsaUJBQWlCLENBQUMsdUJBQXVCLENBQUMsT0FBTyxDQUFDLEVBQUUsSUFBSSxDQUFDLGNBQWMsRUFBRSxlQUFlLENBQUMsQ0FBQyxDQUFDO1FBRXZKLElBQUksSUFBSSxDQUFDLGlCQUFpQixFQUFFLENBQUM7WUFDNUIsSUFBSSxDQUFDLG1CQUFtQixDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO1FBQ2xELENBQUM7UUFFRCxJQUFJLENBQUMsa0JBQWtCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLGlCQUFpQixDQUFDLHVCQUF1QixDQUFDLE9BQU8sQ0FBQyxFQUFFLElBQUksQ0FBQyxhQUFhLEVBQUUsZUFBZSxDQUFDLENBQUMsQ0FBQztRQUNySixJQUFJLENBQUMsYUFBYSxDQUFDLFlBQVksQ0FBQyxZQUFZLEVBQUUsSUFBSSxDQUFDLGFBQWEsQ0FBQyxlQUFlLEVBQUUsSUFBSSxDQUFDLGlCQUFpQixDQUFDLENBQUMsQ0FBQztJQUM1RyxDQUFDO0lBRU8sYUFBYSxDQUFDLEtBQWEsRUFBRSxXQUErQjtRQUNuRSxNQUFNLCtCQUErQixHQUFHLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxxQkFBcUIsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLEVBQUUsd0JBQXdCLENBQUM7UUFDNUgsTUFBTSw2QkFBNkIsR0FBRyxJQUFJLENBQUMsZ0NBQWdDLEVBQUUsc0JBQXNCLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQzdHLElBQUksQ0FBQywrQkFBK0IsSUFBSSw2QkFBNkIsRUFBRSxDQUFDO1lBQ3ZFLElBQUksV0FBVyxFQUFFLENBQUM7Z0JBQ2pCLE9BQU8sR0FBRyxLQUFLLE1BQU0sV0FBVyxFQUFFLENBQUM7WUFDcEMsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLE9BQU8sS0FBSyxDQUFDO1lBQ2QsQ0FBQztRQUNGLENBQUM7UUFFRCxPQUFPLEdBQUcsQ0FBQyxRQUFRLENBQUMsdUJBQXVCLEVBQUUsdUNBQXVDLEVBQUUsS0FBSyxDQUFDLENBQUM7SUFDOUYsQ0FBQztJQUVTLFdBQVcsQ0FBQyxLQUFhO1FBQ2xDLE1BQU0sZUFBZSxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDbkQsSUFBSSxJQUFJLENBQUMsY0FBYyxFQUFFLENBQUM7WUFDekIsSUFBSSxDQUFDLGNBQWMsQ0FBQyxXQUFXLEdBQUcsZUFBZSxDQUFDO1lBQ2xELElBQUksQ0FBQyxtQkFBbUIsRUFBRSxNQUFNLENBQUMsZUFBZSxDQUFDLENBQUM7UUFDbkQsQ0FBQztRQUVELElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxlQUFlLEVBQUUsSUFBSSxDQUFDLGlCQUFpQixDQUFDLENBQUM7UUFFcEUsSUFBSSxDQUFDLE1BQU0sR0FBRyxLQUFLLENBQUM7UUFDcEIsSUFBSSxDQUFDLHFCQUFxQixDQUFDLElBQUksRUFBRSxDQUFDO0lBQ25DLENBQUM7SUFFTyxxQkFBcUIsQ0FBQyxLQUFhLEVBQUUsV0FBK0I7UUFDM0UsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQyxLQUFLLEVBQUUsV0FBVyxDQUFDLENBQUM7UUFDekQsSUFBSSxJQUFJLENBQUMsYUFBYSxFQUFFLENBQUM7WUFDeEIsSUFBSSxDQUFDLGtCQUFrQixFQUFFLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUN2QyxJQUFJLENBQUMsYUFBYSxDQUFDLFlBQVksQ0FBQyxZQUFZLEVBQUUsU0FBUyxDQUFDLENBQUM7UUFDMUQsQ0FBQztRQUNELElBQUksQ0FBQyxlQUFlLEdBQUcsSUFBSSxDQUFDLGtCQUFrQixDQUFDLFNBQVMsQ0FBQyxDQUFDO0lBQzNELENBQUM7SUFFTyxtQkFBbUIsQ0FBQyxXQUErQjtRQUMxRCxJQUFJLElBQUksQ0FBQyx5QkFBeUIsRUFBRSxDQUFDO1lBQ3BDLElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxXQUFXLEdBQUcsV0FBVyxJQUFJLEVBQUUsQ0FBQztZQUMvRCxJQUFJLENBQUMsOEJBQThCLEVBQUUsTUFBTSxDQUFDLFdBQVcsSUFBSSxFQUFFLENBQUMsQ0FBQztRQUNoRSxDQUFDO2FBQ0ksSUFBSSxXQUFXLElBQUksSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFDO1lBQzdDLElBQUksQ0FBQyx5QkFBeUIsR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFDLENBQUMsa0JBQWtCLEVBQUUsRUFBRSxFQUFFLFdBQVcsQ0FBQyxDQUFDLENBQUM7WUFDcEcsSUFBSSxDQUFDLDhCQUE4QixHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxpQkFBaUIsQ0FBQyx1QkFBdUIsQ0FBQyxPQUFPLENBQUMsRUFBRSxJQUFJLENBQUMseUJBQXlCLEVBQUUsV0FBVyxDQUFDLENBQUMsQ0FBQztRQUMxSyxDQUFDO0lBQ0YsQ0FBQztJQUVTLHNCQUFzQixDQUFDLFdBQWdDO1FBQ2hFLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxXQUFXLENBQUMsQ0FBQztRQUN0QyxJQUFJLENBQUMscUJBQXFCLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxXQUFXLENBQUMsQ0FBQztRQUNyRCxJQUFJLENBQUMsaUJBQWlCLEdBQUcsV0FBVyxDQUFDO1FBQ3JDLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxJQUFJLEVBQUUsQ0FBQztJQUNuQyxDQUFDO0lBRU8sY0FBYyxDQUFDLEtBQWE7UUFDbkMsTUFBTSxhQUFhLEdBQUcsSUFBSSxDQUFDLHFCQUFxQixDQUFDLHdCQUF3QixDQUFDLElBQUksQ0FBQyxFQUFFLENBQUUsQ0FBQztRQUNwRixNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMscUJBQXFCLENBQUMscUJBQXFCLENBQUMsYUFBYSxDQUFDLENBQUM7UUFDOUUsTUFBTSxjQUFjLEdBQUcsSUFBSSxDQUFDLHFCQUFxQixDQUFDLHFCQUFxQixDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUNqRixNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMscUJBQXFCLENBQUMsdUJBQXVCLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxLQUFLLGFBQWEsQ0FBQztRQUVoRyxJQUFJLENBQUMsU0FBUyxJQUFJLGNBQWMsRUFBRSxjQUFjLElBQUksS0FBSyxDQUFDLEtBQUssS0FBSyxjQUFjLENBQUMsY0FBYyxFQUFFLENBQUM7WUFDbkcsT0FBTyxHQUFHLGNBQWMsQ0FBQyxjQUFjLEtBQUssS0FBSyxFQUFFLENBQUM7UUFDckQsQ0FBQztRQUVELE9BQU8sS0FBSyxDQUFDO0lBQ2QsQ0FBQztJQUVTLFVBQVUsQ0FBQyxTQUFzQjtRQUMxQyxJQUFJLENBQUMscUJBQXFCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsb0JBQW9CLENBQUMsY0FBYyxDQUFDLHFCQUFxQixFQUFFLFNBQVMsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDO0lBQy9ILENBQUM7SUFFUyxVQUFVLENBQUMsTUFBYyxFQUFFLEtBQWE7UUFDakQsSUFBSSxDQUFDLHFCQUFxQixFQUFFLE1BQU0sQ0FBQyxNQUFNLEVBQUUsS0FBSyxDQUFDLENBQUM7SUFDbkQsQ0FBQztJQUVELGVBQWU7UUFDZCxPQUFPO0lBQ1IsQ0FBQztJQUVELG9CQUFvQjtRQUNuQixJQUFJLElBQUksQ0FBQyxXQUFXLEtBQUssU0FBUyxFQUFFLENBQUM7WUFDcEMsSUFBSSxDQUFDLFdBQVcsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksV0FBVyxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsd0JBQXdCLENBQUMsQ0FBQyxDQUFDO1lBQzNGLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxFQUFFLENBQUM7UUFDekIsQ0FBQztRQUVELElBQUksSUFBSSxDQUFDLGlCQUFpQixLQUFLLFNBQVMsRUFBRSxDQUFDO1lBQzFDLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQztZQUNsQixJQUFJLENBQUMsaUJBQWlCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLHVCQUF1QixDQUFDLG9CQUFvQixDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsRUFBRSxJQUFJLEtBQU0sU0FBUSxxQkFBcUI7Z0JBQ2xKO29CQUNDLEtBQUssQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQyxDQUFDO29CQUNyQyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDcEksQ0FBQzthQUNELEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDUCxDQUFDO1FBQ0QsT0FBTyxJQUFJLENBQUMsaUJBQWlCLENBQUM7SUFDL0IsQ0FBQztJQUVTLG1CQUFtQjtRQUM1QixPQUFPLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyx3QkFBd0IsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFFLENBQUMsRUFBRSxDQUFDO0lBQ3pFLENBQUM7SUFFUyxzQkFBc0I7UUFDL0IsT0FBTywwQkFBMEIsQ0FBQyxJQUFJLENBQUMscUJBQXFCLENBQUMsbUJBQW1CLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDNUYsQ0FBQztJQUVELEtBQUs7UUFDSixJQUFJLElBQUksQ0FBQyxxQkFBcUIsRUFBRSxPQUFPLEVBQUUsQ0FBQztZQUN6QyxJQUFJLENBQUMscUJBQXFCLENBQUMsS0FBSyxFQUFFLENBQUM7UUFDcEMsQ0FBQzthQUFNLElBQUksSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ3pCLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLENBQUM7UUFDdEIsQ0FBQztRQUNELElBQUksZUFBZSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSx5QkFBeUIsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztZQUM5RSxJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksRUFBRSxDQUFDO1FBQ3pCLENBQUM7SUFDRixDQUFDO0lBRU8sVUFBVTtRQUNqQixJQUFJLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUNsQixNQUFNLGNBQWMsR0FBRyxDQUFDLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxpQkFBaUIsRUFBRSxDQUFDLENBQUM7WUFDakUsSUFBSSxJQUFJLENBQUMsd0JBQXdCLEVBQUUsRUFBRSxDQUFDO2dCQUNyQyxjQUFjLENBQUMsT0FBTyxDQUFDLHNCQUFzQixDQUFDLENBQUM7WUFDaEQsQ0FBQztZQUNELElBQUksQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLGNBQWMsQ0FBQyxjQUFjLENBQUMsRUFBRSxjQUFjLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxtQkFBbUIsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUNoSCxJQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUMsaUJBQWlCLEVBQUUsQ0FBQztRQUNqRCxDQUFDO0lBQ0YsQ0FBQztJQUVPLHVCQUF1QjtRQUM5QixJQUFJLENBQUMsSUFBSSxDQUFDLGVBQWUsRUFBRSxDQUFDO1lBQzNCLE9BQU87UUFDUixDQUFDO1FBQ0QsTUFBTSx1QkFBdUIsR0FBRyxJQUFJLENBQUMsb0JBQW9CLENBQUMsUUFBUSxDQUFVLHdDQUF3QyxDQUFDLENBQUM7UUFDdEgsSUFBSSxDQUFDLGVBQWUsQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLHdCQUF3QixFQUFFLHVCQUF1QixDQUFDLENBQUM7SUFDMUYsQ0FBQztJQUVTLGFBQWE7UUFDdEIsSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDO1FBQ2xCLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxJQUFJLEVBQUUsQ0FBQztJQUNuQyxDQUFDO0lBRUQsb0JBQW9CLENBQUMsTUFBZSxFQUFFLE9BQTRDO1FBQ2pGLElBQUksTUFBTSxDQUFDLEVBQUUsS0FBSyxzQkFBc0IsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUM3QyxNQUFNLElBQUksR0FBRyxJQUFJLENBQUM7WUFDbEIsT0FBTyxJQUFJLEtBQU0sU0FBUSxrQkFBa0I7Z0JBQzFDLGdCQUFnQixLQUFLLENBQUMsSUFBSSxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDN0IsWUFBWSxLQUE4RCxDQUFDO2dCQUNwRixJQUFhLG9CQUFvQixLQUFjLE9BQU8sSUFBSSxDQUFDLENBQUMsQ0FBQztnQkFDcEQsTUFBTSxDQUFDLFNBQXNCO29CQUNyQyxTQUFTLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQywyQkFBMkIsQ0FBQyxDQUFDO29CQUNyRCxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsZUFBZSxFQUFHLENBQUM7b0JBQ3ZDLE1BQU0sQ0FBQyxTQUFTLEVBQUUsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDO29CQUNsQyxNQUFNLENBQUMsUUFBUSxFQUFFLENBQUM7Z0JBQ25CLENBQUM7YUFDRCxDQUFDO1FBQ0gsQ0FBQztRQUNELE9BQU8sb0JBQW9CLENBQUMsSUFBSSxDQUFDLG9CQUFvQixFQUFFLE1BQU0sRUFBRSxFQUFFLEdBQUcsT0FBTyxFQUFFLEdBQUcsRUFBRSxXQUFXLEVBQUUsTUFBTSxZQUFZLGlCQUFpQixFQUFFLEVBQUUsQ0FBQyxDQUFDO0lBQ3pJLENBQUM7SUFFRCxpQkFBaUI7UUFDaEIsT0FBTyxTQUFTLENBQUM7SUFDbEIsQ0FBQztJQUVELGVBQWU7UUFDZCxPQUFPLFNBQVMsQ0FBQztJQUNsQixDQUFDO0lBRUQsZUFBZTtRQUNkLE9BQU8sQ0FBQyxDQUFDO0lBQ1YsQ0FBQztJQUVELFNBQVM7UUFDUiwyQ0FBMkM7SUFDNUMsQ0FBQztJQUVELGlCQUFpQjtRQUNoQixPQUFPLEtBQUssQ0FBQztJQUNkLENBQUM7SUFFRCxlQUFlO1FBQ2QsT0FBTyxTQUFTLENBQUM7SUFDbEIsQ0FBQztJQUVELHdCQUF3QjtRQUN2QixPQUFPLEtBQUssQ0FBQztJQUNkLENBQUM7O0FBbGJvQixRQUFRO0lBNEQzQixXQUFBLGtCQUFrQixDQUFBO0lBQ2xCLFdBQUEsbUJBQW1CLENBQUE7SUFDbkIsV0FBQSxxQkFBcUIsQ0FBQTtJQUNyQixXQUFBLGtCQUFrQixDQUFBO0lBQ2xCLFdBQUEsc0JBQXNCLENBQUE7SUFDdEIsV0FBQSxxQkFBcUIsQ0FBQTtJQUNyQixXQUFBLGNBQWMsQ0FBQTtJQUNkLFdBQUEsYUFBYSxDQUFBO0lBQ2IsV0FBQSxhQUFhLENBQUE7R0FwRU0sUUFBUSxDQW1iN0I7O0FBRU0sSUFBZSxjQUFjLEdBQTdCLE1BQWUsY0FBZSxTQUFRLFFBQVE7SUFNcEQsWUFDQyxPQUErQixFQUNYLGlCQUFxQyxFQUNwQyxrQkFBdUMsRUFDckMsb0JBQTJDLEVBQzlDLGlCQUFxQyxFQUNqQyxxQkFBNkMsRUFDOUMsb0JBQTJDLEVBQ2xELGFBQTZCLEVBQzlCLFlBQTJCLEVBQzNCLFlBQTJCLEVBQzFDLHFCQUF5RDtRQUV6RCxLQUFLLENBQUMsT0FBTyxFQUFFLGlCQUFpQixFQUFFLGtCQUFrQixFQUFFLG9CQUFvQixFQUFFLGlCQUFpQixFQUFFLHFCQUFxQixFQUFFLG9CQUFvQixFQUFFLGFBQWEsRUFBRSxZQUFZLEVBQUUsWUFBWSxFQUFFLHFCQUFxQixDQUFDLENBQUM7UUFDOU0sTUFBTSx5QkFBeUIsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLG9CQUFvQixDQUFDLFdBQVcsQ0FBQyxJQUFJLGlCQUFpQixDQUFDLENBQUMsa0JBQWtCLEVBQUUsSUFBSSxDQUFDLHVCQUF1QixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDOUosSUFBSSxDQUFDLFlBQVksR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLHlCQUF5QixDQUFDLGNBQWMsQ0FBQyxZQUFZLEVBQUUsT0FBTyxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUM7SUFDbkgsQ0FBQztJQUVRLGVBQWU7UUFDdkIsT0FBTyxJQUFJLENBQUMsWUFBWSxDQUFDO0lBQzFCLENBQUM7SUFFa0IsVUFBVSxDQUFDLFNBQXNCO1FBQ25ELEtBQUssQ0FBQyxVQUFVLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDNUIsSUFBSSxDQUFDLGVBQWUsR0FBRyxNQUFNLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyw0QkFBNEIsQ0FBQyxDQUFDLENBQUM7SUFDM0UsQ0FBQztJQUVrQixVQUFVLENBQUMsTUFBYyxFQUFFLEtBQWE7UUFDMUQsS0FBSyxDQUFDLFVBQVUsQ0FBQyxNQUFNLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFFaEMsSUFBSSxDQUFDLFNBQVMsR0FBRyxJQUFJLFNBQVMsQ0FBQyxLQUFLLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFDOUMsTUFBTSxzQkFBc0IsR0FBRyxDQUFDLElBQUksQ0FBQyxlQUFlLEVBQUUsYUFBYSxFQUFFLENBQUM7UUFDdEUsTUFBTSx3QkFBd0IsR0FBRyxJQUFJLENBQUMsd0JBQXdCLEVBQUUsQ0FBQztRQUNqRSxJQUFJLHNCQUFzQixLQUFLLHdCQUF3QixFQUFFLENBQUM7WUFDekQsSUFBSSx3QkFBd0IsRUFBRSxDQUFDO2dCQUM5QixLQUFLLENBQUMsSUFBSSxDQUFDLGVBQWdCLENBQUMsQ0FBQztZQUM5QixDQUFDO1lBQ0QsSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFDO1lBQ3JCLElBQUksQ0FBQyx3QkFBd0IsRUFBRSxDQUFDO2dCQUMvQixNQUFNLENBQUMsSUFBSSxDQUFDLGVBQWdCLEVBQUUsSUFBSSxDQUFDLFlBQVksQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUMxRCxDQUFDO1FBQ0YsQ0FBQztRQUNELElBQUksQ0FBQyx3QkFBd0IsRUFBRSxDQUFDO1lBQy9CLE1BQU0sR0FBRyxNQUFNLEdBQUcsRUFBRSxDQUFDO1FBQ3RCLENBQUM7UUFDRCxJQUFJLENBQUMsWUFBWSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUNoQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsTUFBTSxFQUFFLEtBQUssQ0FBQyxDQUFDO0lBQ3ZDLENBQUM7SUFFUSx3QkFBd0I7UUFDaEMsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDLFNBQVMsSUFBSSxJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssR0FBRyxHQUFHLElBQUksSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLEdBQUcsR0FBRyxDQUFDLENBQUM7SUFDdkYsQ0FBQztDQUlELENBQUE7QUE3RHFCLGNBQWM7SUFRakMsV0FBQSxrQkFBa0IsQ0FBQTtJQUNsQixXQUFBLG1CQUFtQixDQUFBO0lBQ25CLFdBQUEscUJBQXFCLENBQUE7SUFDckIsV0FBQSxrQkFBa0IsQ0FBQTtJQUNsQixXQUFBLHNCQUFzQixDQUFBO0lBQ3RCLFdBQUEscUJBQXFCLENBQUE7SUFDckIsV0FBQSxjQUFjLENBQUE7SUFDZCxXQUFBLGFBQWEsQ0FBQTtJQUNiLFdBQUEsYUFBYSxDQUFBO0dBaEJNLGNBQWMsQ0E2RG5DOztBQVFELE1BQU0sVUFBVSwwQkFBMEIsQ0FBQyxRQUFzQztJQUNoRixJQUFJLFVBQVUsRUFBRSxpQkFBaUIsRUFBRSxzQkFBc0IsRUFBRSxrQkFBa0IsRUFBRSxrQkFBa0IsQ0FBQztJQUVsRyxRQUFRLFFBQVEsRUFBRSxDQUFDO1FBQ2xCO1lBQ0MsVUFBVSxHQUFHLGdCQUFnQixDQUFDO1lBQzlCLGlCQUFpQixHQUFHLHNDQUFzQyxDQUFDO1lBQzNELHNCQUFzQixHQUFHLDhCQUE4QixDQUFDO1lBQ3hELGtCQUFrQixHQUFHLDBCQUEwQixDQUFDO1lBQ2hELGtCQUFrQixHQUFHLDBCQUEwQixDQUFDO1lBQ2hELE1BQU07UUFFUCwyQ0FBbUM7UUFDbkMsZ0RBQXdDO1FBQ3hDO1lBQ0MsVUFBVSxHQUFHLG1CQUFtQixDQUFDO1lBQ2pDLGlCQUFpQixHQUFHLGlDQUFpQyxDQUFDO1lBQ3RELHNCQUFzQixHQUFHLGlDQUFpQyxDQUFDO1lBQzNELGtCQUFrQixHQUFHLDZCQUE2QixDQUFDO1lBQ25ELGtCQUFrQixHQUFHLDZCQUE2QixDQUFDO0lBQ3JELENBQUM7SUFFRCxPQUFPO1FBQ04sVUFBVTtRQUNWLGlCQUFpQjtRQUNqQixrQkFBa0IsRUFBRTtZQUNuQixjQUFjLEVBQUUsVUFBVTtZQUMxQiwwQkFBMEIsRUFBRSxzQkFBc0I7WUFDbEQsc0JBQXNCLEVBQUUsa0JBQWtCO1lBQzFDLHNCQUFzQixFQUFFLGtCQUFrQjtTQUMxQztLQUNELENBQUM7QUFDSCxDQUFDO0FBRUQsTUFBTSxPQUFnQixVQUE0QixTQUFRLE9BQU87SUFFaEUsWUFBWSxJQUFvRDtRQUMvRCxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDWixJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQztJQUNsQixDQUFDO0lBRUQsR0FBRyxDQUFDLFFBQTBCLEVBQUUsR0FBRyxJQUFXO1FBQzdDLE1BQU0sSUFBSSxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsYUFBYSxDQUFDLENBQUMsbUJBQW1CLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUMvRSxJQUFJLElBQUksRUFBRSxDQUFDO1lBQ1YsT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDLFFBQVEsRUFBSyxJQUFJLEVBQUUsR0FBRyxJQUFJLENBQUMsQ0FBQztRQUNuRCxDQUFDO1FBQ0QsT0FBTyxTQUFTLENBQUM7SUFDbEIsQ0FBQztDQUdEIn0=