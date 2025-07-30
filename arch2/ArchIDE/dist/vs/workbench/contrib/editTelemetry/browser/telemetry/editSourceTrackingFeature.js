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
import { CachedFunction } from '../../../../../base/common/cache.js';
import { MarkdownString } from '../../../../../base/common/htmlContent.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { autorun, mapObservableArrayCached, derived, observableValue, derivedWithSetter, observableFromEvent } from '../../../../../base/common/observable.js';
import { DynamicCssRules } from '../../../../../editor/browser/editorDom.js';
import { observableCodeEditor } from '../../../../../editor/browser/observableCodeEditor.js';
import { CodeEditorWidget } from '../../../../../editor/browser/widget/codeEditor/codeEditorWidget.js';
import { CommandsRegistry } from '../../../../../platform/commands/common/commands.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { ServiceCollection } from '../../../../../platform/instantiation/common/serviceCollection.js';
import { observableConfigValue } from '../../../../../platform/observable/common/platformObservableUtils.js';
import { ITelemetryService } from '../../../../../platform/telemetry/common/telemetry.js';
import { IEditorService } from '../../../../services/editor/common/editorService.js';
import { IStatusbarService } from '../../../../services/statusbar/browser/statusbar.js';
import { EditSourceTrackingImpl } from './editSourceTrackingImpl.js';
import { DataChannelForwardingTelemetryService } from './forwardingTelemetryService.js';
import { EDIT_TELEMETRY_DETAILS_SETTING_ID, EDIT_TELEMETRY_SHOW_DECORATIONS, EDIT_TELEMETRY_SHOW_STATUS_BAR } from '../settings.js';
let EditTrackingFeature = class EditTrackingFeature extends Disposable {
    constructor(_workspace, _annotatedDocuments, _configurationService, _instantiationService, _statusbarService, _editorService) {
        super();
        this._workspace = _workspace;
        this._annotatedDocuments = _annotatedDocuments;
        this._configurationService = _configurationService;
        this._instantiationService = _instantiationService;
        this._statusbarService = _statusbarService;
        this._editorService = _editorService;
        this._showStateInMarkdownDoc = 'editTelemetry.showDebugDetails';
        this._toggleDecorations = 'editTelemetry.toggleDebugDecorations';
        this._editSourceTrackingShowDecorations = makeSettable(observableConfigValue(EDIT_TELEMETRY_SHOW_DECORATIONS, false, this._configurationService));
        this._editSourceTrackingShowStatusBar = observableConfigValue(EDIT_TELEMETRY_SHOW_STATUS_BAR, false, this._configurationService);
        this._editSourceDetailsEnabled = observableConfigValue(EDIT_TELEMETRY_DETAILS_SETTING_ID, false, this._configurationService);
        const instantiationServiceWithInterceptedTelemetry = this._instantiationService.createChild(new ServiceCollection([ITelemetryService, this._instantiationService.createInstance(DataChannelForwardingTelemetryService)]));
        const impl = this._register(instantiationServiceWithInterceptedTelemetry.createInstance(EditSourceTrackingImpl, this._editSourceDetailsEnabled, this._annotatedDocuments));
        this._register(autorun((reader) => {
            if (!this._editSourceTrackingShowDecorations.read(reader)) {
                return;
            }
            const visibleEditors = observableFromEvent(this, this._editorService.onDidVisibleEditorsChange, () => this._editorService.visibleTextEditorControls);
            mapObservableArrayCached(this, visibleEditors, (editor, store) => {
                if (editor instanceof CodeEditorWidget) {
                    const obsEditor = observableCodeEditor(editor);
                    const cssStyles = new DynamicCssRules(editor);
                    const decorations = new CachedFunction((source) => {
                        const r = store.add(cssStyles.createClassNameRef({
                            backgroundColor: source.getColor(),
                        }));
                        return r.className;
                    });
                    store.add(obsEditor.setDecorations(derived(reader => {
                        const uri = obsEditor.model.read(reader)?.uri;
                        if (!uri) {
                            return [];
                        }
                        const doc = this._workspace.getDocument(uri);
                        if (!doc) {
                            return [];
                        }
                        const docsState = impl.docsState.read(reader).get(doc);
                        if (!docsState) {
                            return [];
                        }
                        const ranges = (docsState.longtermTracker.read(reader)?.getTrackedRanges(reader)) ?? [];
                        return ranges.map(r => ({
                            range: doc.value.get().getTransformer().getRange(r.range),
                            options: {
                                description: 'editSourceTracking',
                                inlineClassName: decorations.get(r.source),
                            }
                        }));
                    })));
                }
            }).recomputeInitiallyAndOnChange(reader.store);
        }));
        this._register(autorun(reader => {
            if (!this._editSourceTrackingShowStatusBar.read(reader)) {
                return;
            }
            const statusBarItem = reader.store.add(this._statusbarService.addEntry({
                name: '',
                text: '',
                command: this._showStateInMarkdownDoc,
                tooltip: 'Edit Source Tracking',
                ariaLabel: '',
            }, 'editTelemetry', 1 /* StatusbarAlignment.RIGHT */, 100));
            const sumChangedCharacters = derived(reader => {
                const docs = impl.docsState.read(reader);
                let sum = 0;
                for (const state of docs.values()) {
                    const t = state.longtermTracker.read(reader);
                    if (!t) {
                        continue;
                    }
                    const d = state.getTelemetryData(t.getTrackedRanges(reader));
                    sum += d.totalModifiedCharactersInFinalState;
                }
                return sum;
            });
            const tooltipMarkdownString = derived(reader => {
                const docs = impl.docsState.read(reader);
                const docsDataInTooltip = [];
                const editSources = [];
                for (const [doc, state] of docs) {
                    const tracker = state.longtermTracker.read(reader);
                    if (!tracker) {
                        continue;
                    }
                    const trackedRanges = tracker.getTrackedRanges(reader);
                    const data = state.getTelemetryData(trackedRanges);
                    if (data.totalModifiedCharactersInFinalState === 0) {
                        continue; // Don't include unmodified documents in tooltip
                    }
                    editSources.push(...trackedRanges.map(r => r.source));
                    // Filter out unmodified properties as these are not interesting to see in the hover
                    const filteredData = Object.fromEntries(Object.entries(data).filter(([_, value]) => !(typeof value === 'number') || value !== 0));
                    docsDataInTooltip.push([
                        `### ${doc.uri.fsPath}`,
                        '```json',
                        JSON.stringify(filteredData, undefined, '\t'),
                        '```',
                        '\n'
                    ].join('\n'));
                }
                let tooltipContent;
                if (docsDataInTooltip.length === 0) {
                    tooltipContent = 'No modified documents';
                }
                else if (docsDataInTooltip.length <= 3) {
                    tooltipContent = docsDataInTooltip.join('\n\n');
                }
                else {
                    const lastThree = docsDataInTooltip.slice(-3);
                    tooltipContent = '...\n\n' + lastThree.join('\n\n');
                }
                const agenda = this._createEditSourceAgenda(editSources);
                const tooltipWithCommand = new MarkdownString(tooltipContent + '\n\n[View Details](command:' + this._showStateInMarkdownDoc + ')');
                tooltipWithCommand.appendMarkdown('\n\n' + agenda + '\n\nToggle decorations: [Click here](command:' + this._toggleDecorations + ')');
                tooltipWithCommand.isTrusted = { enabledCommands: [this._toggleDecorations] };
                tooltipWithCommand.supportHtml = true;
                return tooltipWithCommand;
            });
            reader.store.add(autorun(reader => {
                statusBarItem.update({
                    name: 'editTelemetry',
                    text: `$(edit) ${sumChangedCharacters.read(reader)} chars inserted`,
                    ariaLabel: `Edit Source Tracking: ${sumChangedCharacters.read(reader)} modified characters`,
                    tooltip: tooltipMarkdownString.read(reader),
                    command: this._showStateInMarkdownDoc,
                });
            }));
            reader.store.add(CommandsRegistry.registerCommand(this._toggleDecorations, () => {
                this._editSourceTrackingShowDecorations.set(!this._editSourceTrackingShowDecorations.get(), undefined);
            }));
        }));
    }
    _createEditSourceAgenda(editSources) {
        // Collect all edit sources from the tracked documents
        const editSourcesSeen = new Set();
        const editSourceInfo = [];
        for (const editSource of editSources) {
            if (!editSourcesSeen.has(editSource.toString())) {
                editSourcesSeen.add(editSource.toString());
                editSourceInfo.push({ name: editSource.toString(), color: editSource.getColor() });
            }
        }
        const agendaItems = editSourceInfo.map(info => `<span style="background-color:${info.color};border-radius:3px;">${info.name}</span>`);
        return agendaItems.join(' ');
    }
};
EditTrackingFeature = __decorate([
    __param(2, IConfigurationService),
    __param(3, IInstantiationService),
    __param(4, IStatusbarService),
    __param(5, IEditorService)
], EditTrackingFeature);
export { EditTrackingFeature };
export function makeSettable(obs) {
    const overrideObs = observableValue('overrideObs', undefined);
    return derivedWithSetter(overrideObs, (reader) => {
        return overrideObs.read(reader) ?? obs.read(reader);
    }, (value, tx) => {
        overrideObs.set(value, tx);
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdFNvdXJjZVRyYWNraW5nRmVhdHVyZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL2FkdmlrYXIvRG9jdW1lbnRzL2FyY2hpdGVjdC9hcmNoMi9BcmNoSURFL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2VkaXRUZWxlbWV0cnkvYnJvd3Nlci90ZWxlbWV0cnkvZWRpdFNvdXJjZVRyYWNraW5nRmVhdHVyZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUdoRyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDckUsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBQzNFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNyRSxPQUFPLEVBQUUsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE9BQU8sRUFBb0MsZUFBZSxFQUFFLGlCQUFpQixFQUFFLG1CQUFtQixFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDak0sT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQzdFLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLHVEQUF1RCxDQUFDO0FBQzdGLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLHFFQUFxRSxDQUFDO0FBRXZHLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLHFEQUFxRCxDQUFDO0FBQ3ZGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFDO0FBQ3RHLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFDO0FBQ3RHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG1FQUFtRSxDQUFDO0FBQ3RHLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHNFQUFzRSxDQUFDO0FBQzdHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHVEQUF1RCxDQUFD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