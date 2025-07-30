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
import { Disposable, DisposableStore, MutableDisposable, toDisposable } from '../../../../base/common/lifecycle.js';
import { $, append, clearNode, addDisposableListener, EventType } from '../../../../base/browser/dom.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { ExtensionIdentifier } from '../../../../platform/extensions/common/extensions.js';
import { Sizing, SplitView } from '../../../../base/browser/ui/splitview/splitview.js';
import { Extensions, IExtensionFeaturesManagementService } from '../../../services/extensionManagement/common/extensionFeatures.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { localize } from '../../../../nls.js';
import { WorkbenchList } from '../../../../platform/list/browser/listService.js';
import { getExtensionId } from '../../../../platform/extensionManagement/common/extensionManagementUtil.js';
import { Button } from '../../../../base/browser/ui/button/button.js';
import { defaultButtonStyles, defaultKeybindingLabelStyles } from '../../../../platform/theme/browser/defaultStyles.js';
import { renderMarkdown } from '../../../../base/browser/markdownRenderer.js';
import { getErrorMessage, onUnexpectedError } from '../../../../base/common/errors.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { PANEL_SECTION_BORDER } from '../../../common/theme.js';
import { IThemeService, Themable } from '../../../../platform/theme/common/themeService.js';
import { DomScrollableElement } from '../../../../base/browser/ui/scrollbar/scrollableElement.js';
import { IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import Severity from '../../../../base/common/severity.js';
import { errorIcon, infoIcon, warningIcon } from './extensionsIcons.js';
import { SeverityIcon } from '../../../../base/browser/ui/severityIcon/severityIcon.js';
import { KeybindingLabel } from '../../../../base/browser/ui/keybindingLabel/keybindingLabel.js';
import { OS } from '../../../../base/common/platform.js';
import { MarkdownString, isMarkdownString } from '../../../../base/common/htmlContent.js';
import { Color } from '../../../../base/common/color.js';
import { IExtensionService } from '../../../services/extensions/common/extensions.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { SyncDescriptor } from '../../../../platform/instantiation/common/descriptors.js';
import { ResolvedKeybinding } from '../../../../base/common/keybindings.js';
import { asCssVariable } from '../../../../platform/theme/common/colorUtils.js';
import { foreground, chartAxis, chartGuide, chartLine } from '../../../../platform/theme/common/colorRegistry.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
let RuntimeStatusMarkdownRenderer = class RuntimeStatusMarkdownRenderer extends Disposable {
    static { this.ID = 'runtimeStatus'; }
    constructor(extensionService, openerService, hoverService, extensionFeaturesManagementService) {
        super();
        this.extensionService = extensionService;
        this.openerService = openerService;
        this.hoverService = hoverService;
        this.extensionFeaturesManagementService = extensionFeaturesManagementService;
        this.type = 'element';
    }
    shouldRender(manifest) {
        const extensionId = new ExtensionIdentifier(getExtensionId(manifest.publisher, manifest.name));
        if (!this.extensionService.extensions.some(e => ExtensionIdentifier.equals(e.identifier, extensionId))) {
            return false;
        }
        return !!manifest.main || !!manifest.browser;
    }
    render(manifest) {
        const disposables = new DisposableStore();
        const extensionId = new ExtensionIdentifier(getExtensionId(manifest.publisher, manifest.name));
        const emitter = disposables.add(new Emitter());
        disposables.add(this.extensionService.onDidChangeExtensionsStatus(e => {
            if (e.some(extension => ExtensionIdentifier.equals(extension, extensionId))) {
                emitter.fire(this.createElement(manifest, disposables));
            }
        }));
        disposables.add(this.extensionFeaturesManagementService.onDidChangeAccessData(e => emitter.fire(this.createElement(manifest, disposables))));
        return {
            onDidChange: emitter.event,
            data: this.createElement(manifest, disposables),
            dispose: () => disposables.dispose()
        };
    }
    createElement(manifest, disposables) {
        const container = $('.runtime-status');
        const extensionId = new ExtensionIdentifier(getExtensionId(manifest.publisher, manifest.name));
        const status = this.extensionService.getExtensionsStatus()[extensionId.value];
        if (this.extensionService.extensions.some(extension => ExtensionIdentifier.equals(extension.identifier, extensionId))) {
            const data = new MarkdownString();
            data.appendMarkdown(`### ${localize('activation', "Activation")}\n\n`);
            if (status.activationTimes) {
                if (status.activationTimes.activationReason.startup) {
                    data.appendMarkdown(`Activated on Startup: \`${status.activationTimes.activateCallTime}ms\``);
                }
                else {
                    data.appendMarkdown(`Activated by \`${status.activationTimes.activationReason.activationEvent}\` event: \`${status.activationTimes.activateCallTime}ms\``);
                }
            }
            else {
                data.appendMarkdown('Not yet activated');
            }
            this.renderMarkdown(data, container, disposables);
        }
        const features = Registry.as(Extensions.ExtensionFeaturesRegistry).getExtensionFeatures();
        for (const feature of features) {
            const accessData = this.extensionFeaturesManagementService.getAccessData(extensionId, feature.id);
            if (accessData) {
                this.renderMarkdown(new MarkdownString(`\n ### ${localize('label', "{0} Usage", feature.label)}\n\n`), container, disposables);
                if (accessData.accessTimes.length) {
                    const description = append(container, $('.feature-chart-description', undefined, localize('chartDescription', "There were {0} {1} requests from this extension in the last 30 days.", accessData?.accessTimes.length, feature.accessDataLabel ?? feature.label)));
                    description.style.marginBottom = '8px';
                    this.renderRequestsChart(container, accessData.accessTimes, disposables);
                }
                const status = accessData?.current?.status;
                if (status) {
                    const data = new MarkdownString();
                    if (status?.severity === Severity.Error) {
                        data.appendMarkdown(`$(${errorIcon.id}) ${status.message}\n\n`);
                    }
                    if (status?.severity === Severity.Warning) {
                        data.appendMarkdown(`$(${warningIcon.id}) ${status.message}\n\n`);
                    }
                    if (data.value) {
                        this.renderMarkdown(data, container, disposables);
                    }
                }
            }
        }
        if (status.runtimeErrors.length || status.messages.length) {
            const data = new MarkdownString();
            if (status.runtimeErrors.length) {
                data.appendMarkdown(`\n ### ${localize('uncaught errors', "Uncaught Errors ({0})", status.runtimeErrors.length)}\n`);
                for (const error of status.runtimeErrors) {
                    data.appendMarkdown(`$(${Codicon.error.id})&nbsp;${getErrorMessage(error)}\n\n`);
                }
            }
            if (status.messages.length) {
                data.appendMarkdown(`\n ### ${localize('messaages', "Messages ({0})", status.messages.length)}\n`);
                for (const message of status.messages) {
                    data.appendMarkdown(`$(${(message.type === Severity.Error ? Codicon.error : message.type === Severity.Warning ? Codicon.warning : Codicon.info).id})&nbsp;${message.message}\n\n`);
                }
            }
            if (data.value) {
                this.renderMarkdown(data, container, disposables);
            }
        }
        return container;
    }
    renderMarkdown(markdown, container, disposables) {
        const { element, dispose } = renderMarkdown({
            value: markdown.value,
            isTrusted: markdown.isTrusted,
            supportThemeIcons: true
        }, {
            actionHandler: {
                callback: (content) => this.openerService.open(content, { allowCommands: !!markdown.isTrusted }).catch(onUnexpectedError),
                disposables
            },
        });
        disposables.add(toDisposable(dispose));
        append(container, element);
    }
    renderRequestsChart(container, accessTimes, disposables) {
        const width = 450;
        const height = 250;
        const margin = { top: 0, right: 4, bottom: 20, left: 4 };
        const innerWidth = width - margin.left - margin.right;
        const innerHeight = height - margin.top - margin.bottom;
        const chartContainer = append(container, $('.feature-chart-container'));
        chartContainer.style.position = 'relative';
        const tooltip = append(chartContainer, $('.feature-chart-tooltip'));
        tooltip.style.position = 'absolute';
        tooltip.style.width = '0px';
        tooltip.style.height = '0px';
        let maxCount = 100;
        const map = new Map();
        for (const accessTime of accessTimes) {
            const day = `${accessTime.getDate()} ${accessTime.toLocaleString('default', { month: 'short' })}`;
            map.set(day, (map.get(day) ?? 0) + 1);
            maxCount = Math.max(maxCount, map.get(day));
        }
        const now = new Date();
        const points = [];
        for (let i = 0; i <= 30; i++) {
            const date = new Date(now);
            date.setDate(now.getDate() - (30 - i));
            const dateString = `${date.getDate()} ${date.toLocaleString('default', { month: 'short' })}`;
            const count = map.get(dateString) ?? 0;
            const x = (i / 30) * innerWidth;
            const y = innerHeight - (count / maxCount) * innerHeight;
            points.push({ x, y, date: dateString, count });
        }
        const chart = append(chartContainer, $('.feature-chart'));
        const svg = append(chart, $.SVG('svg'));
        svg.setAttribute('width', `${width}px`);
        svg.setAttribute('height', `${height}px`);
        svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
        const g = $.SVG('g');
        g.setAttribute('transform', `translate(${margin.left},${margin.top})`);
        svg.appendChild(g);
        const xAxisLine = $.SVG('line');
        xAxisLine.setAttribute('x1', '0');
        xAxisLine.setAttribute('y1', `${innerHeight}`);
        xAxisLine.setAttribute('x2', `${innerWidth}`);
        xAxisLine.setAttribute('y2', `${innerHeight}`);
        xAxisLine.setAttribute('stroke', asCssVariable(chartAxis));
        xAxisLine.setAttribute('stroke-width', '1px');
        g.appendChild(xAxisLine);
        for (let i = 1; i <= 30; i += 7) {
            const date = new Date(now);
            date.setDate(now.getDate() - (30 - i));
            const dateString = `${date.getDate()} ${date.toLocaleString('default', { month: 'short' })}`;
            const x = (i / 30) * innerWidth;
            // Add vertical line
            const tick = $.SVG('line');
            tick.setAttribute('x1', `${x}`);
            tick.setAttribute('y1', `${innerHeight}`);
            tick.setAttribute('x2', `${x}`);
            tick.setAttribute('y2', `${innerHeight + 10}`);
            tick.setAttribute('stroke', asCssVariable(chartAxis));
            tick.setAttribute('stroke-width', '1px');
            g.appendChild(tick);
            const ruler = $.SVG('line');
            ruler.setAttribute('x1', `${x}`);
            ruler.setAttribute('y1', `0`);
            ruler.setAttribute('x2', `${x}`);
            ruler.setAttribute('y2', `${innerHeight}`);
            ruler.setAttribute('stroke', asCssVariable(chartGuide));
            ruler.setAttribute('stroke-width', '1px');
            g.appendChild(ruler);
            const xAxisDate = $.SVG('text');
            xAxisDate.setAttribute('x', `${x}`);
            xAxisDate.setAttribute('y', `${height}`); // Adjusted y position to be within the SVG view port
            xAxisDate.setAttribute('text-anchor', 'middle');
            xAxisDate.setAttribute('fill', asCssVariable(foreground));
            xAxisDate.setAttribute('font-size', '10px');
            xAxisDate.textContent = dateString;
            g.appendChild(xAxisDate);
        }
        const line = $.SVG('polyline');
        line.setAttribute('fill', 'none');
        line.setAttribute('stroke', asCssVariable(chartLine));
        line.setAttribute('stroke-width', `2px`);
        line.setAttribute('points', points.map(p => `${p.x},${p.y}`).join(' '));
        g.appendChild(line);
        const highlightCircle = $.SVG('circle');
        highlightCircle.setAttribute('r', `4px`);
        highlightCircle.style.display = 'none';
        g.appendChild(highlightCircle);
        const hoverDisposable = disposables.add(new MutableDisposable());
        const mouseMoveListener = (event) => {
            const rect = svg.getBoundingClientRect();
            const mouseX = event.clientX - rect.left - margin.left;
            let closestPoint;
            let minDistance = Infinity;
            points.forEach(point => {
                const distance = Math.abs(point.x - mouseX);
                if (distance < minDistance) {
                    minDistance = distance;
                    closestPoint = point;
                }
            });
            if (closestPoint) {
                highlightCircle.setAttribute('cx', `${closestPoint.x}`);
                highlightCircle.setAttribute('cy', `${closestPoint.y}`);
                highlightCircle.style.display = 'block';
                tooltip.style.left = `${closestPoint.x + 24}px`;
                tooltip.style.top = `${closestPoint.y + 14}px`;
                hoverDisposable.value = this.hoverService.showInstantHover({
                    content: new MarkdownString(`${closestPoint.date}: ${closestPoint.count} requests`),
                    target: tooltip,
                    appearance: {
                        showPointer: true,
                        skipFadeInAnimation: true,
                    }
                });
            }
            else {
                hoverDisposable.value = undefined;
            }
        };
        disposables.add(addDisposableListener(svg, EventType.MOUSE_MOVE, mouseMoveListener));
        const mouseLeaveListener = () => {
            highlightCircle.style.display = 'none';
            hoverDisposable.value = undefined;
        };
        disposables.add(addDisposableListener(svg, EventType.MOUSE_LEAVE, mouseLeaveListener));
    }
};
RuntimeStatusMarkdownRenderer = __decorate([
    __param(0, IExtensionService),
    __param(1, IOpenerService),
    __param(2, IHoverService),
    __param(3, IExtensionFeaturesManagementService)
], RuntimeStatusMarkdownRenderer);
const runtimeStatusFeature = {
    id: RuntimeStatusMarkdownRenderer.ID,
    label: localize('runtime', "Runtime Status"),
    access: {
        canToggle: false
    },
    renderer: new SyncDescriptor(RuntimeStatusMarkdownRenderer),
};
let ExtensionFeaturesTab = class ExtensionFeaturesTab extends Themable {
    constructor(manifest, feature, themeService, instantiationService) {
        super(themeService);
        this.manifest = manifest;
        this.feature = feature;
        this.instantiationService = instantiationService;
        this.featureView = this._register(new MutableDisposable());
        this.layoutParticipants = [];
        this.extensionId = new ExtensionIdentifier(getExtensionId(manifest.publisher, manifest.name));
        this.domNode = $('div.subcontent.feature-contributions');
        this.create();
    }
    layout(height, width) {
        this.layoutParticipants.forEach(participant => participant.layout(height, width));
    }
    create() {
        const features = this.getFeatures();
        if (features.length === 0) {
            append($('.no-features'), this.domNode).textContent = localize('noFeatures', "No features contributed.");
            return;
        }
        const splitView = this._register(new SplitView(this.domNode, {
            orientation: 1 /* Orientation.HORIZONTAL */,
            proportionalLayout: true
        }));
        this.layoutParticipants.push({
            layout: (height, width) => {
                splitView.el.style.height = `${height - 14}px`;
                splitView.layout(width);
            }
        });
        const featuresListContainer = $('.features-list-container');
        const list = this._register(this.createFeaturesList(featuresListContainer));
        list.splice(0, list.length, features);
        const featureViewContainer = $('.feature-view-container');
        this._register(list.onDidChangeSelection(e => {
            const feature = e.elements[0];
            if (feature) {
                this.showFeatureView(feature, featureViewContainer);
            }
        }));
        const index = this.feature ? features.findIndex(f => f.id === this.feature) : 0;
        list.setSelection([index === -1 ? 0 : index]);
        splitView.addView({
            onDidChange: Event.None,
            element: featuresListContainer,
            minimumSize: 100,
            maximumSize: Number.POSITIVE_INFINITY,
            layout: (width, _, height) => {
                featuresListContainer.style.width = `${width}px`;
                list.layout(height, width);
            }
        }, 200, undefined, true);
        splitView.addView({
            onDidChange: Event.None,
            element: featureViewContainer,
            minimumSize: 500,
            maximumSize: Number.POSITIVE_INFINITY,
            layout: (width, _, height) => {
                featureViewContainer.style.width = `${width}px`;
                this.featureViewDimension = { height, width };
                this.layoutFeatureView();
            }
        }, Sizing.Distribute, undefined, true);
        splitView.style({
            separatorBorder: this.theme.getColor(PANEL_SECTION_BORDER)
        });
    }
    createFeaturesList(container) {
        const renderer = this.instantiationService.createInstance(ExtensionFeatureItemRenderer, this.extensionId);
        const delegate = new ExtensionFeatureItemDelegate();
        const list = this.instantiationService.createInstance(WorkbenchList, 'ExtensionFeaturesList', append(container, $('.features-list-wrapper')), delegate, [renderer], {
            multipleSelectionSupport: false,
            setRowLineHeight: false,
            horizontalScrolling: false,
            accessibilityProvider: {
                getAriaLabel(extensionFeature) {
                    return extensionFeature?.label ?? '';
                },
                getWidgetAriaLabel() {
                    return localize('extension features list', "Extension Features");
                }
            },
            openOnSingleClick: true
        });
        return list;
    }
    layoutFeatureView() {
        this.featureView.value?.layout(this.featureViewDimension?.height, this.featureViewDimension?.width);
    }
    showFeatureView(feature, container) {
        if (this.featureView.value?.feature.id === feature.id) {
            return;
        }
        clearNode(container);
        this.featureView.value = this.instantiationService.createInstance(ExtensionFeatureView, this.extensionId, this.manifest, feature);
        container.appendChild(this.featureView.value.domNode);
        this.layoutFeatureView();
    }
    getFeatures() {
        const features = Registry.as(Extensions.ExtensionFeaturesRegistry)
            .getExtensionFeatures().filter(feature => {
            const renderer = this.getRenderer(feature);
            const shouldRender = renderer?.shouldRender(this.manifest);
            renderer?.dispose();
            return shouldRender;
        }).sort((a, b) => a.label.localeCompare(b.label));
        const renderer = this.getRenderer(runtimeStatusFeature);
        if (renderer?.shouldRender(this.manifest)) {
            features.splice(0, 0, runtimeStatusFeature);
        }
        renderer?.dispose();
        return features;
    }
    getRenderer(feature) {
        return feature.renderer ? this.instantiationService.createInstance(feature.renderer) : undefined;
    }
};
ExtensionFeaturesTab = __decorate([
    __param(2, IThemeService),
    __param(3, IInstantiationService)
], ExtensionFeaturesTab);
export { ExtensionFeaturesTab };
class ExtensionFeatureItemDelegate {
    getHeight() { return 22; }
    getTemplateId() { return 'extensionFeatureDescriptor'; }
}
let ExtensionFeatureItemRenderer = class ExtensionFeatureItemRenderer {
    constructor(extensionId, extensionFeaturesManagementService) {
        this.extensionId = extensionId;
        this.extensionFeaturesManagementService = extensionFeaturesManagementService;
        this.templateId = 'extensionFeatureDescriptor';
    }
    renderTemplate(container) {
        container.classList.add('extension-feature-list-item');
        const label = append(container, $('.extension-feature-label'));
        const disabledElement = append(container, $('.extension-feature-disabled-label'));
        disabledElement.textContent = localize('revoked', "No Access");
        const statusElement = append(container, $('.extension-feature-status'));
        return { label, disabledElement, statusElement, disposables: new DisposableStore() };
    }
    renderElement(element, index, templateData) {
        templateData.disposables.clear();
        templateData.label.textContent = element.label;
        templateData.disabledElement.style.display = element.id === runtimeStatusFeature.id || this.extensionFeaturesManagementService.isEnabled(this.extensionId, element.id) ? 'none' : 'inherit';
        templateData.disposables.add(this.extensionFeaturesManagementService.onDidChangeEnablement(({ extension, featureId, enabled }) => {
            if (ExtensionIdentifier.equals(extension, this.extensionId) && featureId === element.id) {
                templateData.disabledElement.style.display = enabled ? 'none' : 'inherit';
            }
        }));
        const statusElementClassName = templateData.statusElement.className;
        const updateStatus = () => {
            const accessData = this.extensionFeaturesManagementService.getAccessData(this.extensionId, element.id);
            if (accessData?.current?.status) {
                templateData.statusElement.style.display = 'inherit';
                templateData.statusElement.className = `${statusElementClassName} ${SeverityIcon.className(accessData.current.status.severity)}`;
            }
            else {
                templateData.statusElement.style.display = 'none';
            }
        };
        updateStatus();
        templateData.disposables.add(this.extensionFeaturesManagementService.onDidChangeAccessData(({ extension, featureId }) => {
            if (ExtensionIdentifier.equals(extension, this.extensionId) && featureId === element.id) {
                updateStatus();
            }
        }));
    }
    disposeElement(element, index, templateData) {
        templateData.disposables.dispose();
    }
    disposeTemplate(templateData) {
        templateData.disposables.dispose();
    }
};
ExtensionFeatureItemRenderer = __decorate([
    __param(1, IExtensionFeaturesManagementService)
], ExtensionFeatureItemRenderer);
let ExtensionFeatureView = class ExtensionFeatureView extends Disposable {
    constructor(extensionId, manifest, feature, openerService, instantiationService, extensionFeaturesManagementService, dialogService) {
        super();
        this.extensionId = extensionId;
        this.manifest = manifest;
        this.feature = feature;
        this.openerService = openerService;
        this.instantiationService = instantiationService;
        this.extensionFeaturesManagementService = extensionFeaturesManagementService;
        this.dialogService = dialogService;
        this.layoutParticipants = [];
        this.domNode = $('.extension-feature-content');
        this.create(this.domNode);
    }
    create(content) {
        const header = append(content, $('.feature-header'));
        const title = append(header, $('.feature-title'));
        title.textContent = this.feature.label;
        if (this.feature.access.canToggle) {
            const actionsContainer = append(header, $('.feature-actions'));
            const button = new Button(actionsContainer, defaultButtonStyles);
            this.updateButtonLabel(button);
            this._register(this.extensionFeaturesManagementService.onDidChangeEnablement(({ extension, featureId }) => {
                if (ExtensionIdentifier.equals(extension, this.extensionId) && featureId === this.feature.id) {
                    this.updateButtonLabel(button);
                }
            }));
            this._register(button.onDidClick(async () => {
                const enabled = this.extensionFeaturesManagementService.isEnabled(this.extensionId, this.feature.id);
                const confirmationResult = await this.dialogService.confirm({
                    title: localize('accessExtensionFeature', "Enable '{0}' Feature", this.feature.label),
                    message: enabled
                        ? localize('disableAccessExtensionFeatureMessage', "Would you like to revoke '{0}' extension to access '{1}' feature?", this.manifest.displayName ?? this.extensionId.value, this.feature.label)
                        : localize('enableAccessExtensionFeatureMessage', "Would you like to allow '{0}' extension to access '{1}' feature?", this.manifest.displayName ?? this.extensionId.value, this.feature.label),
                    custom: true,
                    primaryButton: enabled ? localize('revoke', "Revoke Access") : localize('grant', "Allow Access"),
                    cancelButton: localize('cancel', "Cancel"),
                });
                if (confirmationResult.confirmed) {
                    this.extensionFeaturesManagementService.setEnablement(this.extensionId, this.feature.id, !enabled);
                }
            }));
        }
        const body = append(content, $('.feature-body'));
        const bodyContent = $('.feature-body-content');
        const scrollableContent = this._register(new DomScrollableElement(bodyContent, {}));
        append(body, scrollableContent.getDomNode());
        this.layoutParticipants.push({ layout: () => scrollableContent.scanDomNode() });
        scrollableContent.scanDomNode();
        if (this.feature.description) {
            const description = append(bodyContent, $('.feature-description'));
            description.textContent = this.feature.description;
        }
        const accessData = this.extensionFeaturesManagementService.getAccessData(this.extensionId, this.feature.id);
        if (accessData?.current?.status) {
            append(bodyContent, $('.feature-status', undefined, $(`span${ThemeIcon.asCSSSelector(accessData.current.status.severity === Severity.Error ? errorIcon : accessData.current.status.severity === Severity.Warning ? warningIcon : infoIcon)}`, undefined), $('span', undefined, accessData.current.status.message)));
        }
        const featureContentElement = append(bodyContent, $('.feature-content'));
        if (this.feature.renderer) {
            const renderer = this.instantiationService.createInstance(this.feature.renderer);
            if (renderer.type === 'table') {
                this.renderTableData(featureContentElement, renderer);
            }
            else if (renderer.type === 'markdown') {
                this.renderMarkdownData(featureContentElement, renderer);
            }
            else if (renderer.type === 'markdown+table') {
                this.renderMarkdownAndTableData(featureContentElement, renderer);
            }
            else if (renderer.type === 'element') {
                this.renderElementData(featureContentElement, renderer);
            }
        }
    }
    updateButtonLabel(button) {
        button.label = this.extensionFeaturesManagementService.isEnabled(this.extensionId, this.feature.id) ? localize('revoke', "Revoke Access") : localize('enable', "Allow Access");
    }
    renderTableData(container, renderer) {
        const tableData = this._register(renderer.render(this.manifest));
        const tableDisposable = this._register(new MutableDisposable());
        if (tableData.onDidChange) {
            this._register(tableData.onDidChange(data => {
                clearNode(container);
                tableDisposable.value = this.renderTable(data, container);
            }));
        }
        tableDisposable.value = this.renderTable(tableData.data, container);
    }
    renderTable(tableData, container) {
        const disposables = new DisposableStore();
        append(container, $('table', undefined, $('tr', undefined, ...tableData.headers.map(header => $('th', undefined, header))), ...tableData.rows
            .map(row => {
            return $('tr', undefined, ...row.map(rowData => {
                if (typeof rowData === 'string') {
                    return $('td', undefined, $('p', undefined, rowData));
                }
                const data = Array.isArray(rowData) ? rowData : [rowData];
                return $('td', undefined, ...data.map(item => {
                    const result = [];
                    if (isMarkdownString(rowData)) {
                        const element = $('', undefined);
                        this.renderMarkdown(rowData, element);
                        result.push(element);
                    }
                    else if (item instanceof ResolvedKeybinding) {
                        const element = $('');
                        const kbl = disposables.add(new KeybindingLabel(element, OS, defaultKeybindingLabelStyles));
                        kbl.set(item);
                        result.push(element);
                    }
                    else if (item instanceof Color) {
                        result.push($('span', { class: 'colorBox', style: 'background-color: ' + Color.Format.CSS.format(item) }, ''));
                        result.push($('code', undefined, Color.Format.CSS.formatHex(item)));
                    }
                    return result;
                }).flat());
            }));
        })));
        return disposables;
    }
    renderMarkdownAndTableData(container, renderer) {
        const markdownAndTableData = this._register(renderer.render(this.manifest));
        if (markdownAndTableData.onDidChange) {
            this._register(markdownAndTableData.onDidChange(data => {
                clearNode(container);
                this.renderMarkdownAndTable(data, container);
            }));
        }
        this.renderMarkdownAndTable(markdownAndTableData.data, container);
    }
    renderMarkdownData(container, renderer) {
        container.classList.add('markdown');
        const markdownData = this._register(renderer.render(this.manifest));
        if (markdownData.onDidChange) {
            this._register(markdownData.onDidChange(data => {
                clearNode(container);
                this.renderMarkdown(data, container);
            }));
        }
        this.renderMarkdown(markdownData.data, container);
    }
    renderMarkdown(markdown, container) {
        const { element, dispose } = renderMarkdown({
            value: markdown.value,
            isTrusted: markdown.isTrusted,
            supportThemeIcons: true
        }, {
            actionHandler: {
                callback: (content) => this.openerService.open(content, { allowCommands: !!markdown.isTrusted }).catch(onUnexpectedError),
                disposables: this._store
            },
        });
        this._register(toDisposable(dispose));
        append(container, element);
    }
    renderMarkdownAndTable(data, container) {
        for (const markdownOrTable of data) {
            if (isMarkdownString(markdownOrTable)) {
                const element = $('', undefined);
                this.renderMarkdown(markdownOrTable, element);
                append(container, element);
            }
            else {
                const tableElement = append(container, $('table'));
                this.renderTable(markdownOrTable, tableElement);
            }
        }
    }
    renderElementData(container, renderer) {
        const elementData = this._register(renderer.render(this.manifest));
        if (elementData.onDidChange) {
            this._register(elementData.onDidChange(data => {
                clearNode(container);
                container.appendChild(data);
            }));
        }
        container.appendChild(elementData.data);
    }
    layout(height, width) {
        this.layoutParticipants.forEach(p => p.layout(height, width));
    }
};
ExtensionFeatureView = __decorate([
    __param(3, IOpenerService),
    __param(4, IInstantiationService),
    __param(5, IExtensionFeaturesManagementService),
    __param(6, IDialogService)
], ExtensionFeatureView);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uRmVhdHVyZXNUYWIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9hZHZpa2FyL0RvY3VtZW50cy9hcmNoaXRlY3QvYXJjaDIvQXJjaElERS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9leHRlbnNpb25zL2Jyb3dzZXIvZXh0ZW5zaW9uRmVhdHVyZXNUYWIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQWUsaUJBQWlCLEVBQUUsWUFBWSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDakksT0FBTyxFQUFFLENBQUMsRUFBRSxNQUFNLEVBQUUsU0FBUyxFQUFFLHFCQUFxQixFQUFFLFNBQVMsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQ3pHLE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDbEUsT0FBTyxFQUFFLG1CQUFtQixFQUFzQixNQUFNLHNEQUFzRCxDQUFDO0FBQy9HLE9BQU8sRUFBZSxNQUFNLEVBQUUsU0FBUyxFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFDcEcsT0FBTyxFQUErQixVQUFVLEVBQXlELG1DQUFtQyxFQUEySSxNQUFNLG1FQUFtRSxDQUFDO0FBQ2pXLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUM1RSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNuRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDOUMsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQ2pGLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSw0RUFBNEUsQ0FBQztBQUU1RyxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sOENBQThDLENBQUM7QUFDdEUsT0FBTyxFQUFFLG1CQUFtQixF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