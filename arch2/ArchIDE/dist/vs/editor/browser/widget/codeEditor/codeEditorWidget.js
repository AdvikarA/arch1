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
var CodeEditorWidget_1;
import '../../services/markerDecorations.js';
import * as dom from '../../../../base/browser/dom.js';
import { onUnexpectedError } from '../../../../base/common/errors.js';
import { Emitter, createEventDeliveryQueue } from '../../../../base/common/event.js';
import { hash } from '../../../../base/common/hash.js';
import { Disposable, dispose } from '../../../../base/common/lifecycle.js';
import { Schemas } from '../../../../base/common/network.js';
import './editor.css';
import { applyFontInfo } from '../../config/domFontInfo.js';
import { EditorConfiguration } from '../../config/editorConfiguration.js';
import { TabFocus } from '../../config/tabFocus.js';
import { EditorExtensionsRegistry } from '../../editorExtensions.js';
import { ICodeEditorService } from '../../services/codeEditorService.js';
import { View } from '../../view.js';
import { DOMLineBreaksComputerFactory } from '../../view/domLineBreaksComputer.js';
import { ViewUserInputEvents } from '../../view/viewUserInputEvents.js';
import { CodeEditorContributions } from './codeEditorContributions.js';
import { filterFontDecorations, filterValidationDecorations } from '../../../common/config/editorOptions.js';
import { CursorColumns } from '../../../common/core/cursorColumns.js';
import { editorUnnecessaryCodeOpacity } from '../../../common/core/editorColorRegistry.js';
import { Position } from '../../../common/core/position.js';
import { Range } from '../../../common/core/range.js';
import { Selection } from '../../../common/core/selection.js';
import { WordOperations } from '../../../common/cursor/cursorWordOperations.js';
import { InternalEditorAction } from '../../../common/editorAction.js';
import * as editorCommon from '../../../common/editorCommon.js';
import { EditorContextKeys } from '../../../common/editorContextKeys.js';
import { ILanguageConfigurationService } from '../../../common/languages/languageConfigurationRegistry.js';
import { ModelDecorationOptions } from '../../../common/model/textModel.js';
import { ILanguageFeaturesService } from '../../../common/services/languageFeatures.js';
import { MonospaceLineBreaksComputerFactory } from '../../../common/viewModel/monospaceLineBreaksComputer.js';
import { ViewModel } from '../../../common/viewModel/viewModelImpl.js';
import * as nls from '../../../../nls.js';
import { IAccessibilityService } from '../../../../platform/accessibility/common/accessibility.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ServiceCollection } from '../../../../platform/instantiation/common/serviceCollection.js';
import { INotificationService, Severity } from '../../../../platform/notification/common/notification.js';
import { editorErrorForeground, editorHintForeground, editorInfoForeground, editorWarningForeground } from '../../../../platform/theme/common/colorRegistry.js';
import { IThemeService, registerThemingParticipant } from '../../../../platform/theme/common/themeService.js';
import { MenuId } from '../../../../platform/actions/common/actions.js';
import { TextModelEditSource, EditSources } from '../../../common/textModelEditSource.js';
let CodeEditorWidget = class CodeEditorWidget extends Disposable {
    static { CodeEditorWidget_1 = this; }
    static { this.dropIntoEditorDecorationOptions = ModelDecorationOptions.register({
        description: 'workbench-dnd-target',
        className: 'dnd-target'
    }); }
    //#endregion
    get isSimpleWidget() {
        return this._configuration.isSimpleWidget;
    }
    get contextMenuId() {
        return this._configuration.contextMenuId;
    }
    get contextKeyService() { return this._contextKeyService; }
    constructor(domElement, _options, codeEditorWidgetOptions, instantiationService, codeEditorService, commandService, contextKeyService, themeService, notificationService, accessibilityService, languageConfigurationService, languageFeaturesService) {
        super();
        this.languageConfigurationService = languageConfigurationService;
        //#region Eventing
        this._deliveryQueue = createEventDeliveryQueue();
        this._contributions = this._register(new CodeEditorContributions());
        this._onDidDispose = this._register(new Emitter());
        this.onDidDispose = this._onDidDispose.event;
        this._onDidChangeModelContent = this._register(new Emitter({ deliveryQueue: this._deliveryQueue }));
        this.onDidChangeModelContent = this._onDidChangeModelContent.event;
        this._onDidChangeModelLanguage = this._register(new Emitter({ deliveryQueue: this._deliveryQueue }));
        this.onDidChangeModelLanguage = this._onDidChangeModelLanguage.event;
        this._onDidChangeModelLanguageConfiguration = this._register(new Emitter({ deliveryQueue: this._deliveryQueue }));
        this.onDidChangeModelLanguageConfiguration = this._onDidChangeModelLanguageConfiguration.event;
        this._onDidChangeModelOptions = this._register(new Emitter({ deliveryQueue: this._deliveryQueue }));
        this.onDidChangeModelOptions = this._onDidChangeModelOptions.event;
        this._onDidChangeModelDecorations = this._register(new Emitter({ deliveryQueue: this._deliveryQueue }));
        this.onDidChangeModelDecorations = this._onDidChangeModelDecorations.event;
        this._onDidChangeLineHeight = this._register(new Emitter({ deliveryQueue: this._deliveryQueue }));
        this.onDidChangeLineHeight = this._onDidChangeLineHeight.event;
        this._onDidChangeFont = this._register(new Emitter({ deliveryQueue: this._deliveryQueue }));
        this.onDidChangeFont = this._onDidChangeFont.event;
        this._onDidChangeModelTokens = this._register(new Emitter({ deliveryQueue: this._deliveryQueue }));
        this.onDidChangeModelTokens = this._onDidChangeModelTokens.event;
        this._onDidChangeConfiguration = this._register(new Emitter({ deliveryQueue: this._deliveryQueue }));
        this.onDidChangeConfiguration = this._onDidChangeConfiguration.event;
        this._onWillChangeModel = this._register(new Emitter({ deliveryQueue: this._deliveryQueue }));
        this.onWillChangeModel = this._onWillChangeModel.event;
        this._onDidChangeModel = this._register(new Emitter({ deliveryQueue: this._deliveryQueue }));
        this.onDidChangeModel = this._onDidChangeModel.event;
        this._onDidChangeCursorPosition = this._register(new Emitter({ deliveryQueue: this._deliveryQueue }));
        this.onDidChangeCursorPosition = this._onDidChangeCursorPosition.event;
        this._onDidChangeCursorSelection = this._register(new Emitter({ deliveryQueue: this._deliveryQueue }));
        this.onDidChangeCursorSelection = this._onDidChangeCursorSelection.event;
        this._onDidAttemptReadOnlyEdit = this._register(new InteractionEmitter(this._contributions, this._deliveryQueue));
        this.onDidAttemptReadOnlyEdit = this._onDidAttemptReadOnlyEdit.event;
        this._onDidLayoutChange = this._register(new Emitter({ deliveryQueue: this._deliveryQueue }));
        this.onDidLayoutChange = this._onDidLayoutChange.event;
        this._editorTextFocus = this._register(new BooleanEventEmitter({ deliveryQueue: this._deliveryQueue }));
        this.onDidFocusEditorText = this._editorTextFocus.onDidChangeToTrue;
        this.onDidBlurEditorText = this._editorTextFocus.onDidChangeToFalse;
        this._editorWidgetFocus = this._register(new BooleanEventEmitter({ deliveryQueue: this._deliveryQueue }));
        this.onDidFocusEditorWidget = this._editorWidgetFocus.onDidChangeToTrue;
        this.onDidBlurEditorWidget = this._editorWidgetFocus.onDidChangeToFalse;
        this._onWillType = this._register(new InteractionEmitter(this._contributions, this._deliveryQueue));
        this.onWillType = this._onWillType.event;
        this._onDidType = this._register(new InteractionEmitter(this._contributions, this._deliveryQueue));
        this.onDidType = this._onDidType.event;
        this._onDidCompositionStart = this._register(new InteractionEmitter(this._contributions, this._deliveryQueue));
        this.onDidCompositionStart = this._onDidCompositionStart.event;
        this._onDidCompositionEnd = this._register(new InteractionEmitter(this._contributions, this._deliveryQueue));
        this.onDidCompositionEnd = this._onDidCompositionEnd.event;
        this._onDidPaste = this._register(new InteractionEmitter(this._contributions, this._deliveryQueue));
        this.onDidPaste = this._onDidPaste.event;
        this._onMouseUp = this._register(new InteractionEmitter(this._contributions, this._deliveryQueue));
        this.onMouseUp = this._onMouseUp.event;
        this._onMouseDown = this._register(new InteractionEmitter(this._contributions, this._deliveryQueue));
        this.onMouseDown = this._onMouseDown.event;
        this._onMouseDrag = this._register(new InteractionEmitter(this._contributions, this._deliveryQueue));
        this.onMouseDrag = this._onMouseDrag.event;
        this._onMouseDrop = this._register(new InteractionEmitter(this._contributions, this._deliveryQueue));
        this.onMouseDrop = this._onMouseDrop.event;
        this._onMouseDropCanceled = this._register(new InteractionEmitter(this._contributions, this._deliveryQueue));
        this.onMouseDropCanceled = this._onMouseDropCanceled.event;
        this._onDropIntoEditor = this._register(new InteractionEmitter(this._contributions, this._deliveryQueue));
        this.onDropIntoEditor = this._onDropIntoEditor.event;
        this._onContextMenu = this._register(new InteractionEmitter(this._contributions, this._deliveryQueue));
        this.onContextMenu = this._onContextMenu.event;
        this._onMouseMove = this._register(new InteractionEmitter(this._contributions, this._deliveryQueue));
        this.onMouseMove = this._onMouseMove.event;
        this._onMouseLeave = this._register(new InteractionEmitter(this._contributions, this._deliveryQueue));
        this.onMouseLeave = this._onMouseLeave.event;
        this._onMouseWheel = this._register(new InteractionEmitter(this._contributions, this._deliveryQueue));
        this.onMouseWheel = this._onMouseWheel.event;
        this._onKeyUp = this._register(new InteractionEmitter(this._contributions, this._deliveryQueue));
        this.onKeyUp = this._onKeyUp.event;
        this._onKeyDown = this._register(new InteractionEmitter(this._contributions, this._deliveryQueue));
        this.onKeyDown = this._onKeyDown.event;
        this._onDidContentSizeChange = this._register(new Emitter({ deliveryQueue: this._deliveryQueue }));
        this.onDidContentSizeChange = this._onDidContentSizeChange.event;
        this._onDidScrollChange = this._register(new Emitter({ deliveryQueue: this._deliveryQueue }));
        this.onDidScrollChange = this._onDidScrollChange.event;
        this._onDidChangeViewZones = this._register(new Emitter({ deliveryQueue: this._deliveryQueue }));
        this.onDidChangeViewZones = this._onDidChangeViewZones.event;
        this._onDidChangeHiddenAreas = this._register(new Emitter({ deliveryQueue: this._deliveryQueue }));
        this.onDidChangeHiddenAreas = this._onDidChangeHiddenAreas.event;
        this._updateCounter = 0;
        this._onWillTriggerEditorOperationEvent = this._register(new Emitter());
        this.onWillTriggerEditorOperationEvent = this._onWillTriggerEditorOperationEvent.event;
        this._onBeginUpdate = this._register(new Emitter());
        this.onBeginUpdate = this._onBeginUpdate.event;
        this._onEndUpdate = this._register(new Emitter());
        this.onEndUpdate = this._onEndUpdate.event;
        this._onBeforeExecuteEdit = this._register(new Emitter());
        this.onBeforeExecuteEdit = this._onBeforeExecuteEdit.event;
        this._actions = new Map();
        this._bannerDomNode = null;
        this._dropIntoEditorDecorations = this.createDecorationsCollection();
        this.inComposition = false;
        codeEditorService.willCreateCodeEditor();
        const options = { ..._options };
        this._domElement = domElement;
        this._overflowWidgetsDomNode = options.overflowWidgetsDomNode;
        delete options.overflowWidgetsDomNode;
        this._id = (++EDITOR_ID);
        this._decorationTypeKeysToIds = {};
        this._decorationTypeSubtypes = {};
        this._telemetryData = codeEditorWidgetOptions.telemetryData;
        this._configuration = this._register(this._createConfiguration(codeEditorWidgetOptions.isSimpleWidget || false, codeEditorWidgetOptions.contextMenuId ?? (codeEditorWidgetOptions.isSimpleWidget ? MenuId.SimpleEditorContext : MenuId.EditorContext), options, accessibilityService));
        this._register(this._configuration.onDidChange((e) => {
            this._onDidChangeConfiguration.fire(e);
            const options = this._configuration.options;
            if (e.hasChanged(164 /* EditorOption.layoutInfo */)) {
                const layoutInfo = options.get(164 /* EditorOption.layoutInfo */);
                this._onDidLayoutChange.fire(layoutInfo);
            }
        }));
        this._contextKeyService = this._register(contextKeyService.createScoped(this._domElement));
        if (codeEditorWidgetOptions.contextKeyValues) {
            for (const [key, value] of Object.entries(codeEditorWidgetOptions.contextKeyValues)) {
                this._contextKeyService.createKey(key, value);
            }
        }
        this._notificationService = notificationService;
        this._codeEditorService = codeEditorService;
        this._commandService = commandService;
        this._themeService = themeService;
        this._register(new EditorContextKeysManager(this, this._contextKeyService));
        this._register(new EditorModeContext(this, this._contextKeyService, languageFeaturesService));
        this._instantiationService = this._register(instantiationService.createChild(new ServiceCollection([IContextKeyService, this._contextKeyService])));
        this._modelData = null;
        this._contentWidgets = {};
        this._overlayWidgets = {};
        this._glyphMarginWidgets = {};
        let contributions;
        if (Array.isArray(codeEditorWidgetOptions.contributions)) {
            contributions = codeEditorWidgetOptions.contributions;
        }
        else {
            contributions = EditorExtensionsRegistry.getEditorContributions();
        }
        this._contributions.initialize(this, contributions, this._instantiationService);
        for (const action of EditorExtensionsRegistry.getEditorActions()) {
            if (this._actions.has(action.id)) {
                onUnexpectedError(new Error(`Cannot have two actions with the same id ${action.id}`));
                continue;
            }
            const internalAction = new InternalEditorAction(action.id, action.label, action.alias, action.metadata, action.precondition ?? undefined, (args) => {
                return this._instantiationService.invokeFunction((accessor) => {
                    return Promise.resolve(action.runEditorCommand(accessor, this, args));
                });
            }, this._contextKeyService);
            this._actions.set(internalAction.id, internalAction);
        }
        const isDropIntoEnabled = () => {
            return !this._configuration.options.get(103 /* EditorOption.readOnly */)
                && this._configuration.options.get(43 /* EditorOption.dropIntoEditor */).enabled;
        };
        this._register(new dom.DragAndDropObserver(this._domElement, {
            onDragOver: e => {
                if (!isDropIntoEnabled()) {
                    return;
                }
                const target = this.getTargetAtClientPoint(e.clientX, e.clientY);
                if (target?.position) {
                    this.showDropIndicatorAt(target.position);
                }
            },
            onDrop: async (e) => {
                if (!isDropIntoEnabled()) {
                    return;
                }
                this.removeDropIndicator();
                if (!e.dataTransfer) {
                    return;
                }
                const target = this.getTargetAtClientPoint(e.clientX, e.clientY);
                if (target?.position) {
                    this._onDropIntoEditor.fire({ position: target.position, event: e });
                }
            },
            onDragLeave: () => {
                this.removeDropIndicator();
            },
            onDragEnd: () => {
                this.removeDropIndicator();
            },
        }));
        this._codeEditorService.addCodeEditor(this);
    }
    writeScreenReaderContent(reason) {
        this._modelData?.view.writeScreenReaderContent(reason);
    }
    _createConfiguration(isSimpleWidget, contextMenuId, options, accessibilityService) {
        return new EditorConfiguration(isSimpleWidget, contextMenuId, options, this._domElement, accessibilityService);
    }
    getId() {
        return this.getEditorType() + ':' + this._id;
    }
    getEditorType() {
        return editorCommon.EditorType.ICodeEditor;
    }
    dispose() {
        this._codeEditorService.removeCodeEditor(this);
        this._actions.clear();
        this._contentWidgets = {};
        this._overlayWidgets = {};
        this._removeDecorationTypes();
        this._postDetachModelCleanup(this._detachModel());
        this._onDidDispose.fire();
        super.dispose();
    }
    invokeWithinContext(fn) {
        return this._instantiationService.invokeFunction(fn);
    }
    updateOptions(newOptions) {
        this._configuration.updateOptions(newOptions || {});
    }
    getOptions() {
        return this._configuration.options;
    }
    getOption(id) {
        return this._configuration.options.get(id);
    }
    getRawOptions() {
        return this._configuration.getRawOptions();
    }
    getOverflowWidgetsDomNode() {
        return this._overflowWidgetsDomNode;
    }
    getConfiguredWordAtPosition(position) {
        if (!this._modelData) {
            return null;
        }
        return WordOperations.getWordAtPosition(this._modelData.model, this._configuration.options.get(147 /* EditorOption.wordSeparators */), this._configuration.options.get(146 /* EditorOption.wordSegmenterLocales */), position);
    }
    getValue(options = null) {
        if (!this._modelData) {
            return '';
        }
        const preserveBOM = (options && options.preserveBOM) ? true : false;
        let eolPreference = 0 /* EndOfLinePreference.TextDefined */;
        if (options && options.lineEnding && options.lineEnding === '\n') {
            eolPreference = 1 /* EndOfLinePreference.LF */;
        }
        else if (options && options.lineEnding && options.lineEnding === '\r\n') {
            eolPreference = 2 /* EndOfLinePreference.CRLF */;
        }
        return this._modelData.model.getValue(eolPreference, preserveBOM);
    }
    setValue(newValue) {
        try {
            this._beginUpdate();
            if (!this._modelData) {
                return;
            }
            this._modelData.model.setValue(newValue);
        }
        finally {
            this._endUpdate();
        }
    }
    getModel() {
        if (!this._modelData) {
            return null;
        }
        return this._modelData.model;
    }
    setModel(_model = null) {
        try {
            this._beginUpdate();
            const model = _model;
            if (this._modelData === null && model === null) {
                // Current model is the new model
                return;
            }
            if (this._modelData && this._modelData.model === model) {
                // Current model is the new model
                return;
            }
            const e = {
                oldModelUrl: this._modelData?.model.uri || null,
                newModelUrl: model?.uri || null
            };
            this._onWillChangeModel.fire(e);
            const hasTextFocus = this.hasTextFocus();
            const detachedModel = this._detachModel();
            this._attachModel(model);
            if (this.hasModel()) {
                // we have a new model (with a new view)!
                if (hasTextFocus) {
                    this.focus();
                }
            }
            else {
                // we have no model (and no view) anymore
                // make sure the outside world knows we are not focused
                this._editorTextFocus.setValue(false);
                this._editorWidgetFocus.setValue(false);
            }
            this._removeDecorationTypes();
            this._onDidChangeModel.fire(e);
            this._postDetachModelCleanup(detachedModel);
            this._contributionsDisposable = this._contributions.onAfterModelAttached();
        }
        finally {
            this._endUpdate();
        }
    }
    _removeDecorationTypes() {
        this._decorationTypeKeysToIds = {};
        if (this._decorationTypeSubtypes) {
            for (const decorationType in this._decorationTypeSubtypes) {
                const subTypes = this._decorationTypeSubtypes[decorationType];
                for (const subType in subTypes) {
                    this._removeDecorationType(decorationType + '-' + subType);
                }
            }
            this._decorationTypeSubtypes = {};
        }
    }
    getVisibleRanges() {
        if (!this._modelData) {
            return [];
        }
        return this._modelData.viewModel.getVisibleRanges();
    }
    getVisibleRangesPlusViewportAboveBelow() {
        if (!this._modelData) {
            return [];
        }
        return this._modelData.viewModel.getVisibleRangesPlusViewportAboveBelow();
    }
    getWhitespaces() {
        if (!this._modelData) {
            return [];
        }
        return this._modelData.viewModel.viewLayout.getWhitespaces();
    }
    static _getVerticalOffsetAfterPosition(modelData, modelLineNumber, modelColumn, includeViewZones) {
        const modelPosition = modelData.model.validatePosition({
            lineNumber: modelLineNumber,
            column: modelColumn
        });
        const viewPosition = modelData.viewModel.coordinatesConverter.convertModelPositionToViewPosition(modelPosition);
        return modelData.viewModel.viewLayout.getVerticalOffsetAfterLineNumber(viewPosition.lineNumber, includeViewZones);
    }
    getTopForLineNumber(lineNumber, includeViewZones = false) {
        if (!this._modelData) {
            return -1;
        }
        return CodeEditorWidget_1._getVerticalOffsetForPosition(this._modelData, lineNumber, 1, includeViewZones);
    }
    getTopForPosition(lineNumber, column) {
        if (!this._modelData) {
            return -1;
        }
        return CodeEditorWidget_1._getVerticalOffsetForPosition(this._modelData, lineNumber, column, false);
    }
    static _getVerticalOffsetForPosition(modelData, modelLineNumber, modelColumn, includeViewZones = false) {
        const modelPosition = modelData.model.validatePosition({
            lineNumber: modelLineNumber,
            column: modelColumn
        });
        const viewPosition = modelData.viewModel.coordinatesConverter.convertModelPositionToViewPosition(modelPosition);
        return modelData.viewModel.viewLayout.getVerticalOffsetForLineNumber(viewPosition.lineNumber, includeViewZones);
    }
    getBottomForLineNumber(lineNumber, includeViewZones = false) {
        if (!this._modelData) {
            return -1;
        }
        const maxCol = this._modelData.model.getLineMaxColumn(lineNumber);
        return CodeEditorWidget_1._getVerticalOffsetAfterPosition(this._modelData, lineNumber, maxCol, includeViewZones);
    }
    getLineHeightForPosition(position) {
        if (!this._modelData) {
            return -1;
        }
        const viewModel = this._modelData.viewModel;
        const coordinatesConverter = viewModel.coordinatesConverter;
        const pos = Position.lift(position);
        if (coordinatesConverter.modelPositionIsVisible(pos)) {
            const viewPosition = coordinatesConverter.convertModelPositionToViewPosition(pos);
            return viewModel.viewLayout.getLineHeightForLineNumber(viewPosition.lineNumber);
        }
        return 0;
    }
    setHiddenAreas(ranges, source, forceUpdate) {
        this._modelData?.viewModel.setHiddenAreas(ranges.map(r => Range.lift(r)), source, forceUpdate);
    }
    getVisibleColumnFromPosition(rawPosition) {
        if (!this._modelData) {
            return rawPosition.column;
        }
        const position = this._modelData.model.validatePosition(rawPosition);
        const tabSize = this._modelData.model.getOptions().tabSize;
        return CursorColumns.visibleColumnFromColumn(this._modelData.model.getLineContent(position.lineNumber), position.column, tabSize) + 1;
    }
    getStatusbarColumn(rawPosition) {
        if (!this._modelData) {
            return rawPosition.column;
        }
        const position = this._modelData.model.validatePosition(rawPosition);
        const tabSize = this._modelData.model.getOptions().tabSize;
        return CursorColumns.toStatusbarColumn(this._modelData.model.getLineContent(position.lineNumber), position.column, tabSize);
    }
    getPosition() {
        if (!this._modelData) {
            return null;
        }
        return this._modelData.viewModel.getPosition();
    }
    setPosition(position, source = 'api') {
        if (!this._modelData) {
            return;
        }
        if (!Position.isIPosition(position)) {
            throw new Error('Invalid arguments');
        }
        this._modelData.viewModel.setSelections(source, [{
                selectionStartLineNumber: position.lineNumber,
                selectionStartColumn: position.column,
                positionLineNumber: position.lineNumber,
                positionColumn: position.column
            }]);
    }
    _sendRevealRange(modelRange, verticalType, revealHorizontal, scrollType) {
        if (!this._modelData) {
            return;
        }
        if (!Range.isIRange(modelRange)) {
            throw new Error('Invalid arguments');
        }
        const validatedModelRange = this._modelData.model.validateRange(modelRange);
        const viewRange = this._modelData.viewModel.coordinatesConverter.convertModelRangeToViewRange(validatedModelRange);
        this._modelData.viewModel.revealRange('api', revealHorizontal, viewRange, verticalType, scrollType);
    }
    revealLine(lineNumber, scrollType = 0 /* editorCommon.ScrollType.Smooth */) {
        this._revealLine(lineNumber, 0 /* VerticalRevealType.Simple */, scrollType);
    }
    revealLineInCenter(lineNumber, scrollType = 0 /* editorCommon.ScrollType.Smooth */) {
        this._revealLine(lineNumber, 1 /* VerticalRevealType.Center */, scrollType);
    }
    revealLineInCenterIfOutsideViewport(lineNumber, scrollType = 0 /* editorCommon.ScrollType.Smooth */) {
        this._revealLine(lineNumber, 2 /* VerticalRevealType.CenterIfOutsideViewport */, scrollType);
    }
    revealLineNearTop(lineNumber, scrollType = 0 /* editorCommon.ScrollType.Smooth */) {
        this._revealLine(lineNumber, 5 /* VerticalRevealType.NearTop */, scrollType);
    }
    _revealLine(lineNumber, revealType, scrollType) {
        if (typeof lineNumber !== 'number') {
            throw new Error('Invalid arguments');
        }
        this._sendRevealRange(new Range(lineNumber, 1, lineNumber, 1), revealType, false, scrollType);
    }
    revealPosition(position, scrollType = 0 /* editorCommon.ScrollType.Smooth */) {
        this._revealPosition(position, 0 /* VerticalRevealType.Simple */, true, scrollType);
    }
    revealPositionInCenter(position, scrollType = 0 /* editorCommon.ScrollType.Smooth */) {
        this._revealPosition(position, 1 /* VerticalRevealType.Center */, true, scrollType);
    }
    revealPositionInCenterIfOutsideViewport(position, scrollType = 0 /* editorCommon.ScrollType.Smooth */) {
        this._revealPosition(position, 2 /* VerticalRevealType.CenterIfOutsideViewport */, true, scrollType);
    }
    revealPositionNearTop(position, scrollType = 0 /* editorCommon.ScrollType.Smooth */) {
        this._revealPosition(position, 5 /* VerticalRevealType.NearTop */, true, scrollType);
    }
    _revealPosition(position, verticalType, revealHorizontal, scrollType) {
        if (!Position.isIPosition(position)) {
            throw new Error('Invalid arguments');
        }
        this._sendRevealRange(new Range(position.lineNumber, position.column, position.lineNumber, position.column), verticalType, revealHorizontal, scrollType);
    }
    getSelection() {
        if (!this._modelData) {
            return null;
        }
        return this._modelData.viewModel.getSelection();
    }
    getSelections() {
        if (!this._modelData) {
            return null;
        }
        return this._modelData.viewModel.getSelections();
    }
    setSelection(something, source = 'api') {
        const isSelection = Selection.isISelection(something);
        const isRange = Range.isIRange(something);
        if (!isSelection && !isRange) {
            throw new Error('Invalid arguments');
        }
        if (isSelection) {
            this._setSelectionImpl(something, source);
        }
        else if (isRange) {
            // act as if it was an IRange
            const selection = {
                selectionStartLineNumber: something.startLineNumber,
                selectionStartColumn: something.startColumn,
                positionLineNumber: something.endLineNumber,
                positionColumn: something.endColumn
            };
            this._setSelectionImpl(selection, source);
        }
    }
    _setSelectionImpl(sel, source) {
        if (!this._modelData) {
            return;
        }
        const selection = new Selection(sel.selectionStartLineNumber, sel.selectionStartColumn, sel.positionLineNumber, sel.positionColumn);
        this._modelData.viewModel.setSelections(source, [selection]);
    }
    revealLines(startLineNumber, endLineNumber, scrollType = 0 /* editorCommon.ScrollType.Smooth */) {
        this._revealLines(startLineNumber, endLineNumber, 0 /* VerticalRevealType.Simple */, scrollType);
    }
    revealLinesInCenter(startLineNumber, endLineNumber, scrollType = 0 /* editorCommon.ScrollType.Smooth */) {
        this._revealLines(startLineNumber, endLineNumber, 1 /* VerticalRevealType.Center */, scrollType);
    }
    revealLinesInCenterIfOutsideViewport(startLineNumber, endLineNumber, scrollType = 0 /* editorCommon.ScrollType.Smooth */) {
        this._revealLines(startLineNumber, endLineNumber, 2 /* VerticalRevealType.CenterIfOutsideViewport */, scrollType);
    }
    revealLinesNearTop(startLineNumber, endLineNumber, scrollType = 0 /* editorCommon.ScrollType.Smooth */) {
        this._revealLines(startLineNumber, endLineNumber, 5 /* VerticalRevealType.NearTop */, scrollType);
    }
    _revealLines(startLineNumber, endLineNumber, verticalType, scrollType) {
        if (typeof startLineNumber !== 'number' || typeof endLineNumber !== 'number') {
            throw new Error('Invalid arguments');
        }
        this._sendRevealRange(new Range(startLineNumber, 1, endLineNumber, 1), verticalType, false, scrollType);
    }
    revealRange(range, scrollType = 0 /* editorCommon.ScrollType.Smooth */, revealVerticalInCenter = false, revealHorizontal = true) {
        this._revealRange(range, revealVerticalInCenter ? 1 /* VerticalRevealType.Center */ : 0 /* VerticalRevealType.Simple */, revealHorizontal, scrollType);
    }
    revealRangeInCenter(range, scrollType = 0 /* editorCommon.ScrollType.Smooth */) {
        this._revealRange(range, 1 /* VerticalRevealType.Center */, true, scrollType);
    }
    revealRangeInCenterIfOutsideViewport(range, scrollType = 0 /* editorCommon.ScrollType.Smooth */) {
        this._revealRange(range, 2 /* VerticalRevealType.CenterIfOutsideViewport */, true, scrollType);
    }
    revealRangeNearTop(range, scrollType = 0 /* editorCommon.ScrollType.Smooth */) {
        this._revealRange(range, 5 /* VerticalRevealType.NearTop */, true, scrollType);
    }
    revealRangeNearTopIfOutsideViewport(range, scrollType = 0 /* editorCommon.ScrollType.Smooth */) {
        this._revealRange(range, 6 /* VerticalRevealType.NearTopIfOutsideViewport */, true, scrollType);
    }
    revealRangeAtTop(range, scrollType = 0 /* editorCommon.ScrollType.Smooth */) {
        this._revealRange(range, 3 /* VerticalRevealType.Top */, true, scrollType);
    }
    _revealRange(range, verticalType, revealHorizontal, scrollType) {
        if (!Range.isIRange(range)) {
            throw new Error('Invalid arguments');
        }
        this._sendRevealRange(Range.lift(range), verticalType, revealHorizontal, scrollType);
    }
    setSelections(ranges, source = 'api', reason = 0 /* CursorChangeReason.NotSet */) {
        if (!this._modelData) {
            return;
        }
        if (!ranges || ranges.length === 0) {
            throw new Error('Invalid arguments');
        }
        for (let i = 0, len = ranges.length; i < len; i++) {
            if (!Selection.isISelection(ranges[i])) {
                throw new Error('Invalid arguments');
            }
        }
        this._modelData.viewModel.setSelections(source, ranges, reason);
    }
    getContentWidth() {
        if (!this._modelData) {
            return -1;
        }
        return this._modelData.viewModel.viewLayout.getContentWidth();
    }
    getScrollWidth() {
        if (!this._modelData) {
            return -1;
        }
        return this._modelData.viewModel.viewLayout.getScrollWidth();
    }
    getScrollLeft() {
        if (!this._modelData) {
            return -1;
        }
        return this._modelData.viewModel.viewLayout.getCurrentScrollLeft();
    }
    getContentHeight() {
        if (!this._modelData) {
            return -1;
        }
        return this._modelData.viewModel.viewLayout.getContentHeight();
    }
    getScrollHeight() {
        if (!this._modelData) {
            return -1;
        }
        return this._modelData.viewModel.viewLayout.getScrollHeight();
    }
    getScrollTop() {
        if (!this._modelData) {
            return -1;
        }
        return this._modelData.viewModel.viewLayout.getCurrentScrollTop();
    }
    setScrollLeft(newScrollLeft, scrollType = 1 /* editorCommon.ScrollType.Immediate */) {
        if (!this._modelData) {
            return;
        }
        if (typeof newScrollLeft !== 'number') {
            throw new Error('Invalid arguments');
        }
        this._modelData.viewModel.viewLayout.setScrollPosition({
            scrollLeft: newScrollLeft
        }, scrollType);
    }
    setScrollTop(newScrollTop, scrollType = 1 /* editorCommon.ScrollType.Immediate */) {
        if (!this._modelData) {
            return;
        }
        if (typeof newScrollTop !== 'number') {
            throw new Error('Invalid arguments');
        }
        this._modelData.viewModel.viewLayout.setScrollPosition({
            scrollTop: newScrollTop
        }, scrollType);
    }
    setScrollPosition(position, scrollType = 1 /* editorCommon.ScrollType.Immediate */) {
        if (!this._modelData) {
            return;
        }
        this._modelData.viewModel.viewLayout.setScrollPosition(position, scrollType);
    }
    hasPendingScrollAnimation() {
        if (!this._modelData) {
            return false;
        }
        return this._modelData.viewModel.viewLayout.hasPendingScrollAnimation();
    }
    saveViewState() {
        if (!this._modelData) {
            return null;
        }
        const contributionsState = this._contributions.saveViewState();
        const cursorState = this._modelData.viewModel.saveCursorState();
        const viewState = this._modelData.viewModel.saveState();
        return {
            cursorState: cursorState,
            viewState: viewState,
            contributionsState: contributionsState
        };
    }
    restoreViewState(s) {
        if (!this._modelData || !this._modelData.hasRealView) {
            return;
        }
        const codeEditorState = s;
        if (codeEditorState && codeEditorState.cursorState && codeEditorState.viewState) {
            const cursorState = codeEditorState.cursorState;
            if (Array.isArray(cursorState)) {
                if (cursorState.length > 0) {
                    this._modelData.viewModel.restoreCursorState(cursorState);
                }
            }
            else {
                // Backwards compatibility
                this._modelData.viewModel.restoreCursorState([cursorState]);
            }
            this._contributions.restoreViewState(codeEditorState.contributionsState || {});
            const reducedState = this._modelData.viewModel.reduceRestoreState(codeEditorState.viewState);
            this._modelData.view.restoreState(reducedState);
        }
    }
    handleInitialized() {
        this._getViewModel()?.visibleLinesStabilized();
    }
    onVisible() {
        this._modelData?.view.refreshFocusState();
    }
    onHide() {
        this._modelData?.view.refreshFocusState();
    }
    getContribution(id) {
        return this._contributions.get(id);
    }
    getActions() {
        return Array.from(this._actions.values());
    }
    getSupportedActions() {
        let result = this.getActions();
        result = result.filter(action => action.isSupported());
        return result;
    }
    getAction(id) {
        return this._actions.get(id) || null;
    }
    trigger(source, handlerId, payload) {
        payload = payload || {};
        try {
            this._onWillTriggerEditorOperationEvent.fire({ source: source, handlerId: handlerId, payload: payload });
            this._beginUpdate();
            switch (handlerId) {
                case "compositionStart" /* editorCommon.Handler.CompositionStart */:
                    this._startComposition();
                    return;
                case "compositionEnd" /* editorCommon.Handler.CompositionEnd */:
                    this._endComposition(source);
                    return;
                case "type" /* editorCommon.Handler.Type */: {
                    const args = payload;
                    this._type(source, args.text || '');
                    return;
                }
                case "replacePreviousChar" /* editorCommon.Handler.ReplacePreviousChar */: {
                    const args = payload;
                    this._compositionType(source, args.text || '', args.replaceCharCnt || 0, 0, 0);
                    return;
                }
                case "compositionType" /* editorCommon.Handler.CompositionType */: {
                    const args = payload;
                    this._compositionType(source, args.text || '', args.replacePrevCharCnt || 0, args.replaceNextCharCnt || 0, args.positionDelta || 0);
                    return;
                }
                case "paste" /* editorCommon.Handler.Paste */: {
                    const args = payload;
                    this._paste(source, args.text || '', args.pasteOnNewLine || false, args.multicursorText || null, args.mode || null, args.clipboardEvent);
                    return;
                }
                case "cut" /* editorCommon.Handler.Cut */:
                    this._cut(source);
                    return;
            }
            const action = this.getAction(handlerId);
            if (action) {
                Promise.resolve(action.run(payload)).then(undefined, onUnexpectedError);
                return;
            }
            if (!this._modelData) {
                return;
            }
            if (this._triggerEditorCommand(source, handlerId, payload)) {
                return;
            }
            this._triggerCommand(handlerId, payload);
        }
        finally {
            this._endUpdate();
        }
    }
    _triggerCommand(handlerId, payload) {
        this._commandService.executeCommand(handlerId, payload);
    }
    _startComposition() {
        if (!this._modelData) {
            return;
        }
        this.inComposition = true;
        this._modelData.viewModel.startComposition();
        this._onDidCompositionStart.fire();
    }
    _endComposition(source) {
        if (!this._modelData) {
            return;
        }
        this.inComposition = false;
        this._modelData.viewModel.endComposition(source);
        this._onDidCompositionEnd.fire();
    }
    _type(source, text) {
        if (!this._modelData || text.length === 0) {
            return;
        }
        if (source === 'keyboard') {
            this._onWillType.fire(text);
        }
        this._modelData.viewModel.type(text, source);
        if (source === 'keyboard') {
            this._onDidType.fire(text);
        }
    }
    _compositionType(source, text, replacePrevCharCnt, replaceNextCharCnt, positionDelta) {
        if (!this._modelData) {
            return;
        }
        this._modelData.viewModel.compositionType(text, replacePrevCharCnt, replaceNextCharCnt, positionDelta, source);
    }
    _paste(source, text, pasteOnNewLine, multicursorText, mode, clipboardEvent) {
        if (!this._modelData) {
            return;
        }
        const viewModel = this._modelData.viewModel;
        const startPosition = viewModel.getSelection().getStartPosition();
        viewModel.paste(text, pasteOnNewLine, multicursorText, source);
        const endPosition = viewModel.getSelection().getStartPosition();
        if (source === 'keyboard') {
            this._onDidPaste.fire({
                clipboardEvent,
                range: new Range(startPosition.lineNumber, startPosition.column, endPosition.lineNumber, endPosition.column),
                languageId: mode
            });
        }
    }
    _cut(source) {
        if (!this._modelData) {
            return;
        }
        this._modelData.viewModel.cut(source);
    }
    _triggerEditorCommand(source, handlerId, payload) {
        const command = EditorExtensionsRegistry.getEditorCommand(handlerId);
        if (command) {
            payload = payload || {};
            payload.source = source;
            this._instantiationService.invokeFunction((accessor) => {
                Promise.resolve(command.runEditorCommand(accessor, this, payload)).then(undefined, onUnexpectedError);
            });
            return true;
        }
        return false;
    }
    _getViewModel() {
        if (!this._modelData) {
            return null;
        }
        return this._modelData.viewModel;
    }
    pushUndoStop() {
        if (!this._modelData) {
            return false;
        }
        if (this._configuration.options.get(103 /* EditorOption.readOnly */)) {
            // read only editor => sorry!
            return false;
        }
        this._modelData.model.pushStackElement();
        return true;
    }
    popUndoStop() {
        if (!this._modelData) {
            return false;
        }
        if (this._configuration.options.get(103 /* EditorOption.readOnly */)) {
            // read only editor => sorry!
            return false;
        }
        this._modelData.model.popStackElement();
        return true;
    }
    edit(edit, reason) {
        return this.executeEdits(reason, edit.replacements.map(e => ({ range: e.range, text: e.text })), undefined);
    }
    executeEdits(source, edits, endCursorState) {
        if (!this._modelData) {
            return false;
        }
        if (this._configuration.options.get(103 /* EditorOption.readOnly */)) {
            // read only editor => sorry!
            return false;
        }
        let cursorStateComputer;
        if (!endCursorState) {
            cursorStateComputer = () => null;
        }
        else if (Array.isArray(endCursorState)) {
            cursorStateComputer = () => endCursorState;
        }
        else {
            cursorStateComputer = endCursorState;
        }
        let sourceStr;
        let reason;
        if (source instanceof TextModelEditSource) {
            reason = source;
            sourceStr = source.metadata.source;
        }
        else {
            reason = EditSources.unknown({ name: sourceStr });
            sourceStr = source;
        }
        this._onBeforeExecuteEdit.fire({ source: sourceStr ?? undefined });
        this._modelData.viewModel.executeEdits(sourceStr, edits, cursorStateComputer, reason);
        return true;
    }
    executeCommand(source, command) {
        if (!this._modelData) {
            return;
        }
        this._modelData.viewModel.executeCommand(command, source);
    }
    executeCommands(source, commands) {
        if (!this._modelData) {
            return;
        }
        this._modelData.viewModel.executeCommands(commands, source);
    }
    createDecorationsCollection(decorations) {
        return new EditorDecorationsCollection(this, decorations);
    }
    changeDecorations(callback) {
        if (!this._modelData) {
            // callback will not be called
            return null;
        }
        return this._modelData.model.changeDecorations(callback, this._id);
    }
    getLineDecorations(lineNumber) {
        if (!this._modelData) {
            return null;
        }
        const options = this._configuration.options;
        return this._modelData.model.getLineDecorations(lineNumber, this._id, filterValidationDecorations(options), filterFontDecorations(options));
    }
    getDecorationsInRange(range) {
        if (!this._modelData) {
            return null;
        }
        const options = this._configuration.options;
        return this._modelData.model.getDecorationsInRange(range, this._id, filterValidationDecorations(options), filterFontDecorations(options));
    }
    getFontSizeAtPosition(position) {
        if (!this._modelData) {
            return null;
        }
        return this._modelData.viewModel.getFontSizeAtPosition(position);
    }
    /**
     * @deprecated
     */
    deltaDecorations(oldDecorations, newDecorations) {
        if (!this._modelData) {
            return [];
        }
        if (oldDecorations.length === 0 && newDecorations.length === 0) {
            return oldDecorations;
        }
        return this._modelData.model.deltaDecorations(oldDecorations, newDecorations, this._id);
    }
    removeDecorations(decorationIds) {
        if (!this._modelData || decorationIds.length === 0) {
            return;
        }
        this._modelData.model.changeDecorations((changeAccessor) => {
            changeAccessor.deltaDecorations(decorationIds, []);
        });
    }
    setDecorationsByType(description, decorationTypeKey, decorationOptions) {
        const newDecorationsSubTypes = {};
        const oldDecorationsSubTypes = this._decorationTypeSubtypes[decorationTypeKey] || {};
        this._decorationTypeSubtypes[decorationTypeKey] = newDecorationsSubTypes;
        const newModelDecorations = [];
        for (const decorationOption of decorationOptions) {
            let typeKey = decorationTypeKey;
            if (decorationOption.renderOptions) {
                // identify custom render options by a hash code over all keys and values
                // For custom render options register a decoration type if necessary
                const subType = hash(decorationOption.renderOptions).toString(16);
                // The fact that `decorationTypeKey` appears in the typeKey has no influence
                // it is just a mechanism to get predictable and unique keys (repeatable for the same options and unique across clients)
                typeKey = decorationTypeKey + '-' + subType;
                if (!oldDecorationsSubTypes[subType] && !newDecorationsSubTypes[subType]) {
                    // decoration type did not exist before, register new one
                    this._registerDecorationType(description, typeKey, decorationOption.renderOptions, decorationTypeKey);
                }
                newDecorationsSubTypes[subType] = true;
            }
            const opts = this._resolveDecorationOptions(typeKey, !!decorationOption.hoverMessage);
            if (decorationOption.hoverMessage) {
                opts.hoverMessage = decorationOption.hoverMessage;
            }
            newModelDecorations.push({ range: decorationOption.range, options: opts });
        }
        // remove decoration sub types that are no longer used, deregister decoration type if necessary
        for (const subType in oldDecorationsSubTypes) {
            if (!newDecorationsSubTypes[subType]) {
                this._removeDecorationType(decorationTypeKey + '-' + subType);
            }
        }
        // update all decorations
        const oldDecorationsIds = this._decorationTypeKeysToIds[decorationTypeKey] || [];
        this.changeDecorations(accessor => this._decorationTypeKeysToIds[decorationTypeKey] = accessor.deltaDecorations(oldDecorationsIds, newModelDecorations));
        return this._decorationTypeKeysToIds[decorationTypeKey] || [];
    }
    setDecorationsByTypeFast(decorationTypeKey, ranges) {
        // remove decoration sub types that are no longer used, deregister decoration type if necessary
        const oldDecorationsSubTypes = this._decorationTypeSubtypes[decorationTypeKey] || {};
        for (const subType in oldDecorationsSubTypes) {
            this._removeDecorationType(decorationTypeKey + '-' + subType);
        }
        this._decorationTypeSubtypes[decorationTypeKey] = {};
        const opts = ModelDecorationOptions.createDynamic(this._resolveDecorationOptions(decorationTypeKey, false));
        const newModelDecorations = new Array(ranges.length);
        for (let i = 0, len = ranges.length; i < len; i++) {
            newModelDecorations[i] = { range: ranges[i], options: opts };
        }
        // update all decorations
        const oldDecorationsIds = this._decorationTypeKeysToIds[decorationTypeKey] || [];
        this.changeDecorations(accessor => this._decorationTypeKeysToIds[decorationTypeKey] = accessor.deltaDecorations(oldDecorationsIds, newModelDecorations));
    }
    removeDecorationsByType(decorationTypeKey) {
        // remove decorations for type and sub type
        const oldDecorationsIds = this._decorationTypeKeysToIds[decorationTypeKey];
        if (oldDecorationsIds) {
            this.changeDecorations(accessor => accessor.deltaDecorations(oldDecorationsIds, []));
        }
        if (this._decorationTypeKeysToIds.hasOwnProperty(decorationTypeKey)) {
            delete this._decorationTypeKeysToIds[decorationTypeKey];
        }
        if (this._decorationTypeSubtypes.hasOwnProperty(decorationTypeKey)) {
            delete this._decorationTypeSubtypes[decorationTypeKey];
        }
    }
    getLayoutInfo() {
        const options = this._configuration.options;
        const layoutInfo = options.get(164 /* EditorOption.layoutInfo */);
        return layoutInfo;
    }
    createOverviewRuler(cssClassName) {
        if (!this._modelData || !this._modelData.hasRealView) {
            return null;
        }
        return this._modelData.view.createOverviewRuler(cssClassName);
    }
    getContainerDomNode() {
        return this._domElement;
    }
    getDomNode() {
        if (!this._modelData || !this._modelData.hasRealView) {
            return null;
        }
        return this._modelData.view.domNode.domNode;
    }
    delegateVerticalScrollbarPointerDown(browserEvent) {
        if (!this._modelData || !this._modelData.hasRealView) {
            return;
        }
        this._modelData.view.delegateVerticalScrollbarPointerDown(browserEvent);
    }
    delegateScrollFromMouseWheelEvent(browserEvent) {
        if (!this._modelData || !this._modelData.hasRealView) {
            return;
        }
        this._modelData.view.delegateScrollFromMouseWheelEvent(browserEvent);
    }
    layout(dimension, postponeRendering = false) {
        this._configuration.observeContainer(dimension);
        if (!postponeRendering) {
            this.render();
        }
    }
    focus() {
        if (!this._modelData || !this._modelData.hasRealView) {
            return;
        }
        this._modelData.view.focus();
    }
    hasTextFocus() {
        if (!this._modelData || !this._modelData.hasRealView) {
            return false;
        }
        return this._modelData.view.isFocused();
    }
    hasWidgetFocus() {
        if (!this._modelData || !this._modelData.hasRealView) {
            return false;
        }
        return this._modelData.view.isWidgetFocused();
    }
    addContentWidget(widget) {
        const widgetData = {
            widget: widget,
            position: widget.getPosition()
        };
        if (this._contentWidgets.hasOwnProperty(widget.getId())) {
            console.warn('Overwriting a content widget with the same id:' + widget.getId());
        }
        this._contentWidgets[widget.getId()] = widgetData;
        if (this._modelData && this._modelData.hasRealView) {
            this._modelData.view.addContentWidget(widgetData);
        }
    }
    layoutContentWidget(widget) {
        const widgetId = widget.getId();
        if (this._contentWidgets.hasOwnProperty(widgetId)) {
            const widgetData = this._contentWidgets[widgetId];
            widgetData.position = widget.getPosition();
            if (this._modelData && this._modelData.hasRealView) {
                this._modelData.view.layoutContentWidget(widgetData);
            }
        }
    }
    removeContentWidget(widget) {
        const widgetId = widget.getId();
        if (this._contentWidgets.hasOwnProperty(widgetId)) {
            const widgetData = this._contentWidgets[widgetId];
            delete this._contentWidgets[widgetId];
            if (this._modelData && this._modelData.hasRealView) {
                this._modelData.view.removeContentWidget(widgetData);
            }
        }
    }
    addOverlayWidget(widget) {
        const widgetData = {
            widget: widget,
            position: widget.getPosition()
        };
        if (this._overlayWidgets.hasOwnProperty(widget.getId())) {
            console.warn('Overwriting an overlay widget with the same id.');
        }
        this._overlayWidgets[widget.getId()] = widgetData;
        if (this._modelData && this._modelData.hasRealView) {
            this._modelData.view.addOverlayWidget(widgetData);
        }
    }
    layoutOverlayWidget(widget) {
        const widgetId = widget.getId();
        if (this._overlayWidgets.hasOwnProperty(widgetId)) {
            const widgetData = this._overlayWidgets[widgetId];
            widgetData.position = widget.getPosition();
            if (this._modelData && this._modelData.hasRealView) {
                this._modelData.view.layoutOverlayWidget(widgetData);
            }
        }
    }
    removeOverlayWidget(widget) {
        const widgetId = widget.getId();
        if (this._overlayWidgets.hasOwnProperty(widgetId)) {
            const widgetData = this._overlayWidgets[widgetId];
            delete this._overlayWidgets[widgetId];
            if (this._modelData && this._modelData.hasRealView) {
                this._modelData.view.removeOverlayWidget(widgetData);
            }
        }
    }
    addGlyphMarginWidget(widget) {
        const widgetData = {
            widget: widget,
            position: widget.getPosition()
        };
        if (this._glyphMarginWidgets.hasOwnProperty(widget.getId())) {
            console.warn('Overwriting a glyph margin widget with the same id.');
        }
        this._glyphMarginWidgets[widget.getId()] = widgetData;
        if (this._modelData && this._modelData.hasRealView) {
            this._modelData.view.addGlyphMarginWidget(widgetData);
        }
    }
    layoutGlyphMarginWidget(widget) {
        const widgetId = widget.getId();
        if (this._glyphMarginWidgets.hasOwnProperty(widgetId)) {
            const widgetData = this._glyphMarginWidgets[widgetId];
            widgetData.position = widget.getPosition();
            if (this._modelData && this._modelData.hasRealView) {
                this._modelData.view.layoutGlyphMarginWidget(widgetData);
            }
        }
    }
    removeGlyphMarginWidget(widget) {
        const widgetId = widget.getId();
        if (this._glyphMarginWidgets.hasOwnProperty(widgetId)) {
            const widgetData = this._glyphMarginWidgets[widgetId];
            delete this._glyphMarginWidgets[widgetId];
            if (this._modelData && this._modelData.hasRealView) {
                this._modelData.view.removeGlyphMarginWidget(widgetData);
            }
        }
    }
    changeViewZones(callback) {
        if (!this._modelData || !this._modelData.hasRealView) {
            return;
        }
        this._modelData.view.change(callback);
    }
    getTargetAtClientPoint(clientX, clientY) {
        if (!this._modelData || !this._modelData.hasRealView) {
            return null;
        }
        return this._modelData.view.getTargetAtClientPoint(clientX, clientY);
    }
    getScrolledVisiblePosition(rawPosition) {
        if (!this._modelData || !this._modelData.hasRealView) {
            return null;
        }
        const position = this._modelData.model.validatePosition(rawPosition);
        const options = this._configuration.options;
        const layoutInfo = options.get(164 /* EditorOption.layoutInfo */);
        const top = CodeEditorWidget_1._getVerticalOffsetForPosition(this._modelData, position.lineNumber, position.column) - this.getScrollTop();
        const left = this._modelData.view.getOffsetForColumn(position.lineNumber, position.column) + layoutInfo.glyphMarginWidth + layoutInfo.lineNumbersWidth + layoutInfo.decorationsWidth - this.getScrollLeft();
        const height = this.getLineHeightForPosition(position);
        return {
            top: top,
            left: left,
            height
        };
    }
    getOffsetForColumn(lineNumber, column) {
        if (!this._modelData || !this._modelData.hasRealView) {
            return -1;
        }
        return this._modelData.view.getOffsetForColumn(lineNumber, column);
    }
    render(forceRedraw = false) {
        if (!this._modelData || !this._modelData.hasRealView) {
            return;
        }
        this._modelData.viewModel.batchEvents(() => {
            this._modelData.view.render(true, forceRedraw);
        });
    }
    setAriaOptions(options) {
        if (!this._modelData || !this._modelData.hasRealView) {
            return;
        }
        this._modelData.view.setAriaOptions(options);
    }
    applyFontInfo(target) {
        applyFontInfo(target, this._configuration.options.get(59 /* EditorOption.fontInfo */));
    }
    setBanner(domNode, domNodeHeight) {
        if (this._bannerDomNode && this._domElement.contains(this._bannerDomNode)) {
            this._bannerDomNode.remove();
        }
        this._bannerDomNode = domNode;
        this._configuration.setReservedHeight(domNode ? domNodeHeight : 0);
        if (this._bannerDomNode) {
            this._domElement.prepend(this._bannerDomNode);
        }
    }
    _attachModel(model) {
        if (!model) {
            this._modelData = null;
            return;
        }
        const listenersToRemove = [];
        this._domElement.setAttribute('data-mode-id', model.getLanguageId());
        this._configuration.setIsDominatedByLongLines(model.isDominatedByLongLines());
        this._configuration.setModelLineCount(model.getLineCount());
        const attachedView = model.onBeforeAttached();
        const viewModel = new ViewModel(this._id, this._configuration, model, DOMLineBreaksComputerFactory.create(dom.getWindow(this._domElement)), MonospaceLineBreaksComputerFactory.create(this._configuration.options), (callback) => dom.scheduleAtNextAnimationFrame(dom.getWindow(this._domElement), callback), this.languageConfigurationService, this._themeService, attachedView, {
            batchChanges: (cb) => {
                try {
                    this._beginUpdate();
                    return cb();
                }
                finally {
                    this._endUpdate();
                }
            },
        });
        // Someone might destroy the model from under the editor, so prevent any exceptions by setting a null model
        listenersToRemove.push(model.onWillDispose(() => this.setModel(null)));
        listenersToRemove.push(viewModel.onEvent((e) => {
            switch (e.kind) {
                case 0 /* OutgoingViewModelEventKind.ContentSizeChanged */:
                    this._onDidContentSizeChange.fire(e);
                    break;
                case 1 /* OutgoingViewModelEventKind.FocusChanged */:
                    this._editorTextFocus.setValue(e.hasFocus);
                    break;
                case 2 /* OutgoingViewModelEventKind.WidgetFocusChanged */:
                    this._editorWidgetFocus.setValue(e.hasFocus);
                    break;
                case 3 /* OutgoingViewModelEventKind.ScrollChanged */:
                    this._onDidScrollChange.fire(e);
                    break;
                case 4 /* OutgoingViewModelEventKind.ViewZonesChanged */:
                    this._onDidChangeViewZones.fire();
                    break;
                case 5 /* OutgoingViewModelEventKind.HiddenAreasChanged */:
                    this._onDidChangeHiddenAreas.fire();
                    break;
                case 6 /* OutgoingViewModelEventKind.ReadOnlyEditAttempt */:
                    this._onDidAttemptReadOnlyEdit.fire();
                    break;
                case 7 /* OutgoingViewModelEventKind.CursorStateChanged */: {
                    if (e.reachedMaxCursorCount) {
                        const multiCursorLimit = this.getOption(88 /* EditorOption.multiCursorLimit */);
                        const message = nls.localize('cursors.maximum', "The number of cursors has been limited to {0}. Consider using [find and replace](https://code.visualstudio.com/docs/editor/codebasics#_find-and-replace) for larger changes or increase the editor multi cursor limit setting.", multiCursorLimit);
                        this._notificationService.prompt(Severity.Warning, message, [
                            {
                                label: 'Find and Replace',
                                run: () => {
                                    this._commandService.executeCommand('editor.action.startFindReplaceAction');
                                }
                            },
                            {
                                label: nls.localize('goToSetting', 'Increase Multi Cursor Limit'),
                                run: () => {
                                    this._commandService.executeCommand('workbench.action.openSettings2', {
                                        query: 'editor.multiCursorLimit'
                                    });
                                }
                            }
                        ]);
                    }
                    const positions = [];
                    for (let i = 0, len = e.selections.length; i < len; i++) {
                        positions[i] = e.selections[i].getPosition();
                    }
                    const e1 = {
                        position: positions[0],
                        secondaryPositions: positions.slice(1),
                        reason: e.reason,
                        source: e.source
                    };
                    this._onDidChangeCursorPosition.fire(e1);
                    const e2 = {
                        selection: e.selections[0],
                        secondarySelections: e.selections.slice(1),
                        modelVersionId: e.modelVersionId,
                        oldSelections: e.oldSelections,
                        oldModelVersionId: e.oldModelVersionId,
                        source: e.source,
                        reason: e.reason
                    };
                    this._onDidChangeCursorSelection.fire(e2);
                    break;
                }
                case 8 /* OutgoingViewModelEventKind.ModelDecorationsChanged */:
                    this._onDidChangeModelDecorations.fire(e.event);
                    break;
                case 9 /* OutgoingViewModelEventKind.ModelLanguageChanged */:
                    this._domElement.setAttribute('data-mode-id', model.getLanguageId());
                    this._onDidChangeModelLanguage.fire(e.event);
                    break;
                case 10 /* OutgoingViewModelEventKind.ModelLanguageConfigurationChanged */:
                    this._onDidChangeModelLanguageConfiguration.fire(e.event);
                    break;
                case 11 /* OutgoingViewModelEventKind.ModelContentChanged */:
                    this._onDidChangeModelContent.fire(e.event);
                    break;
                case 12 /* OutgoingViewModelEventKind.ModelOptionsChanged */:
                    this._onDidChangeModelOptions.fire(e.event);
                    break;
                case 13 /* OutgoingViewModelEventKind.ModelTokensChanged */:
                    this._onDidChangeModelTokens.fire(e.event);
                    break;
                case 14 /* OutgoingViewModelEventKind.ModelLineHeightChanged */:
                    this._onDidChangeLineHeight.fire(e.event);
                    break;
                case 15 /* OutgoingViewModelEventKind.ModelFontChangedEvent */:
                    this._onDidChangeFont.fire(e.event);
                    break;
            }
        }));
        const [view, hasRealView] = this._createView(viewModel);
        if (hasRealView) {
            this._domElement.appendChild(view.domNode.domNode);
            let keys = Object.keys(this._contentWidgets);
            for (let i = 0, len = keys.length; i < len; i++) {
                const widgetId = keys[i];
                view.addContentWidget(this._contentWidgets[widgetId]);
            }
            keys = Object.keys(this._overlayWidgets);
            for (let i = 0, len = keys.length; i < len; i++) {
                const widgetId = keys[i];
                view.addOverlayWidget(this._overlayWidgets[widgetId]);
            }
            keys = Object.keys(this._glyphMarginWidgets);
            for (let i = 0, len = keys.length; i < len; i++) {
                const widgetId = keys[i];
                view.addGlyphMarginWidget(this._glyphMarginWidgets[widgetId]);
            }
            view.render(false, true);
            view.domNode.domNode.setAttribute('data-uri', model.uri.toString());
        }
        this._modelData = new ModelData(model, viewModel, view, hasRealView, listenersToRemove, attachedView);
    }
    _createView(viewModel) {
        let commandDelegate;
        if (this.isSimpleWidget) {
            commandDelegate = {
                paste: (text, pasteOnNewLine, multicursorText, mode) => {
                    this._paste('keyboard', text, pasteOnNewLine, multicursorText, mode);
                },
                type: (text) => {
                    this._type('keyboard', text);
                },
                compositionType: (text, replacePrevCharCnt, replaceNextCharCnt, positionDelta) => {
                    this._compositionType('keyboard', text, replacePrevCharCnt, replaceNextCharCnt, positionDelta);
                },
                startComposition: () => {
                    this._startComposition();
                },
                endComposition: () => {
                    this._endComposition('keyboard');
                },
                cut: () => {
                    this._cut('keyboard');
                }
            };
        }
        else {
            commandDelegate = {
                paste: (text, pasteOnNewLine, multicursorText, mode) => {
                    const payload = { text, pasteOnNewLine, multicursorText, mode };
                    this._commandService.executeCommand("paste" /* editorCommon.Handler.Paste */, payload);
                },
                type: (text) => {
                    const payload = { text };
                    this._commandService.executeCommand("type" /* editorCommon.Handler.Type */, payload);
                },
                compositionType: (text, replacePrevCharCnt, replaceNextCharCnt, positionDelta) => {
                    // Try if possible to go through the existing `replacePreviousChar` command
                    if (replaceNextCharCnt || positionDelta) {
                        // must be handled through the new command
                        const payload = { text, replacePrevCharCnt, replaceNextCharCnt, positionDelta };
                        this._commandService.executeCommand("compositionType" /* editorCommon.Handler.CompositionType */, payload);
                    }
                    else {
                        const payload = { text, replaceCharCnt: replacePrevCharCnt };
                        this._commandService.executeCommand("replacePreviousChar" /* editorCommon.Handler.ReplacePreviousChar */, payload);
                    }
                },
                startComposition: () => {
                    this._commandService.executeCommand("compositionStart" /* editorCommon.Handler.CompositionStart */, {});
                },
                endComposition: () => {
                    this._commandService.executeCommand("compositionEnd" /* editorCommon.Handler.CompositionEnd */, {});
                },
                cut: () => {
                    this._commandService.executeCommand("cut" /* editorCommon.Handler.Cut */, {});
                }
            };
        }
        const viewUserInputEvents = new ViewUserInputEvents(viewModel.coordinatesConverter);
        viewUserInputEvents.onKeyDown = (e) => this._onKeyDown.fire(e);
        viewUserInputEvents.onKeyUp = (e) => this._onKeyUp.fire(e);
        viewUserInputEvents.onContextMenu = (e) => this._onContextMenu.fire(e);
        viewUserInputEvents.onMouseMove = (e) => this._onMouseMove.fire(e);
        viewUserInputEvents.onMouseLeave = (e) => this._onMouseLeave.fire(e);
        viewUserInputEvents.onMouseDown = (e) => this._onMouseDown.fire(e);
        viewUserInputEvents.onMouseUp = (e) => this._onMouseUp.fire(e);
        viewUserInputEvents.onMouseDrag = (e) => this._onMouseDrag.fire(e);
        viewUserInputEvents.onMouseDrop = (e) => this._onMouseDrop.fire(e);
        viewUserInputEvents.onMouseDropCanceled = (e) => this._onMouseDropCanceled.fire(e);
        viewUserInputEvents.onMouseWheel = (e) => this._onMouseWheel.fire(e);
        const view = new View(this._domElement, this.getId(), commandDelegate, this._configuration, this._themeService.getColorTheme(), viewModel, viewUserInputEvents, this._overflowWidgetsDomNode, this._instantiationService);
        return [view, true];
    }
    _postDetachModelCleanup(detachedModel) {
        detachedModel?.removeAllDecorationsWithOwnerId(this._id);
    }
    _detachModel() {
        this._contributionsDisposable?.dispose();
        this._contributionsDisposable = undefined;
        if (!this._modelData) {
            return null;
        }
        const model = this._modelData.model;
        const removeDomNode = this._modelData.hasRealView ? this._modelData.view.domNode.domNode : null;
        this._modelData.dispose();
        this._modelData = null;
        this._domElement.removeAttribute('data-mode-id');
        if (removeDomNode && this._domElement.contains(removeDomNode)) {
            removeDomNode.remove();
        }
        if (this._bannerDomNode && this._domElement.contains(this._bannerDomNode)) {
            this._bannerDomNode.remove();
        }
        return model;
    }
    _registerDecorationType(description, key, options, parentTypeKey) {
        this._codeEditorService.registerDecorationType(description, key, options, parentTypeKey, this);
    }
    _removeDecorationType(key) {
        this._codeEditorService.removeDecorationType(key);
    }
    _resolveDecorationOptions(typeKey, writable) {
        return this._codeEditorService.resolveDecorationOptions(typeKey, writable);
    }
    getTelemetryData() {
        return this._telemetryData;
    }
    hasModel() {
        return (this._modelData !== null);
    }
    showDropIndicatorAt(position) {
        const newDecorations = [{
                range: new Range(position.lineNumber, position.column, position.lineNumber, position.column),
                options: CodeEditorWidget_1.dropIntoEditorDecorationOptions
            }];
        this._dropIntoEditorDecorations.set(newDecorations);
        this.revealPosition(position, 1 /* editorCommon.ScrollType.Immediate */);
    }
    removeDropIndicator() {
        this._dropIntoEditorDecorations.clear();
    }
    setContextValue(key, value) {
        this._contextKeyService.createKey(key, value);
    }
    _beginUpdate() {
        this._updateCounter++;
        if (this._updateCounter === 1) {
            this._onBeginUpdate.fire();
        }
    }
    _endUpdate() {
        this._updateCounter--;
        if (this._updateCounter === 0) {
            this._onEndUpdate.fire();
        }
    }
};
CodeEditorWidget = CodeEditorWidget_1 = __decorate([
    __param(3, IInstantiationService),
    __param(4, ICodeEditorService),
    __param(5, ICommandService),
    __param(6, IContextKeyService),
    __param(7, IThemeService),
    __param(8, INotificationService),
    __param(9, IAccessibilityService),
    __param(10, ILanguageConfigurationService),
    __param(11, ILanguageFeaturesService)
], CodeEditorWidget);
export { CodeEditorWidget };
let EDITOR_ID = 0;
class ModelData {
    constructor(model, viewModel, view, hasRealView, listenersToRemove, attachedView) {
        this.model = model;
        this.viewModel = viewModel;
        this.view = view;
        this.hasRealView = hasRealView;
        this.listenersToRemove = listenersToRemove;
        this.attachedView = attachedView;
    }
    dispose() {
        dispose(this.listenersToRemove);
        this.model.onBeforeDetached(this.attachedView);
        if (this.hasRealView) {
            this.view.dispose();
        }
        this.viewModel.dispose();
    }
}
var BooleanEventValue;
(function (BooleanEventValue) {
    BooleanEventValue[BooleanEventValue["NotSet"] = 0] = "NotSet";
    BooleanEventValue[BooleanEventValue["False"] = 1] = "False";
    BooleanEventValue[BooleanEventValue["True"] = 2] = "True";
})(BooleanEventValue || (BooleanEventValue = {}));
export class BooleanEventEmitter extends Disposable {
    constructor(_emitterOptions) {
        super();
        this._emitterOptions = _emitterOptions;
        this._onDidChangeToTrue = this._register(new Emitter(this._emitterOptions));
        this.onDidChangeToTrue = this._onDidChangeToTrue.event;
        this._onDidChangeToFalse = this._register(new Emitter(this._emitterOptions));
        this.onDidChangeToFalse = this._onDidChangeToFalse.event;
        this._value = 0 /* BooleanEventValue.NotSet */;
    }
    setValue(_value) {
        const value = (_value ? 2 /* BooleanEventValue.True */ : 1 /* BooleanEventValue.False */);
        if (this._value === value) {
            return;
        }
        this._value = value;
        if (this._value === 2 /* BooleanEventValue.True */) {
            this._onDidChangeToTrue.fire();
        }
        else if (this._value === 1 /* BooleanEventValue.False */) {
            this._onDidChangeToFalse.fire();
        }
    }
}
/**
 * A regular event emitter that also makes sure contributions are instantiated if necessary
 */
class InteractionEmitter extends Emitter {
    constructor(_contributions, deliveryQueue) {
        super({ deliveryQueue });
        this._contributions = _contributions;
    }
    fire(event) {
        this._contributions.onBeforeInteractionEvent();
        super.fire(event);
    }
}
class EditorContextKeysManager extends Disposable {
    constructor(editor, contextKeyService) {
        super();
        this._editor = editor;
        contextKeyService.createKey('editorId', editor.getId());
        this._editorSimpleInput = EditorContextKeys.editorSimpleInput.bindTo(contextKeyService);
        this._editorFocus = EditorContextKeys.focus.bindTo(contextKeyService);
        this._textInputFocus = EditorContextKeys.textInputFocus.bindTo(contextKeyService);
        this._editorTextFocus = EditorContextKeys.editorTextFocus.bindTo(contextKeyService);
        this._tabMovesFocus = EditorContextKeys.tabMovesFocus.bindTo(contextKeyService);
        this._editorReadonly = EditorContextKeys.readOnly.bindTo(contextKeyService);
        this._inDiffEditor = EditorContextKeys.inDiffEditor.bindTo(contextKeyService);
        this._editorColumnSelection = EditorContextKeys.columnSelection.bindTo(contextKeyService);
        this._hasMultipleSelections = EditorContextKeys.hasMultipleSelections.bindTo(contextKeyService);
        this._hasNonEmptySelection = EditorContextKeys.hasNonEmptySelection.bindTo(contextKeyService);
        this._canUndo = EditorContextKeys.canUndo.bindTo(contextKeyService);
        this._canRedo = EditorContextKeys.canRedo.bindTo(contextKeyService);
        this._register(this._editor.onDidChangeConfiguration(() => this._updateFromConfig()));
        this._register(this._editor.onDidChangeCursorSelection(() => this._updateFromSelection()));
        this._register(this._editor.onDidFocusEditorWidget(() => this._updateFromFocus()));
        this._register(this._editor.onDidBlurEditorWidget(() => this._updateFromFocus()));
        this._register(this._editor.onDidFocusEditorText(() => this._updateFromFocus()));
        this._register(this._editor.onDidBlurEditorText(() => this._updateFromFocus()));
        this._register(this._editor.onDidChangeModel(() => this._updateFromModel()));
        this._register(this._editor.onDidChangeConfiguration(() => this._updateFromModel()));
        this._register(TabFocus.onDidChangeTabFocus((tabFocusMode) => this._tabMovesFocus.set(tabFocusMode)));
        this._updateFromConfig();
        this._updateFromSelection();
        this._updateFromFocus();
        this._updateFromModel();
        this._editorSimpleInput.set(this._editor.isSimpleWidget);
    }
    _updateFromConfig() {
        const options = this._editor.getOptions();
        this._tabMovesFocus.set(options.get(163 /* EditorOption.tabFocusMode */) || TabFocus.getTabFocusMode());
        this._editorReadonly.set(options.get(103 /* EditorOption.readOnly */));
        this._inDiffEditor.set(options.get(70 /* EditorOption.inDiffEditor */));
        this._editorColumnSelection.set(options.get(28 /* EditorOption.columnSelection */));
    }
    _updateFromSelection() {
        const selections = this._editor.getSelections();
        if (!selections) {
            this._hasMultipleSelections.reset();
            this._hasNonEmptySelection.reset();
        }
        else {
            this._hasMultipleSelections.set(selections.length > 1);
            this._hasNonEmptySelection.set(selections.some(s => !s.isEmpty()));
        }
    }
    _updateFromFocus() {
        this._editorFocus.set(this._editor.hasWidgetFocus() && !this._editor.isSimpleWidget);
        this._editorTextFocus.set(this._editor.hasTextFocus() && !this._editor.isSimpleWidget);
        this._textInputFocus.set(this._editor.hasTextFocus());
    }
    _updateFromModel() {
        const model = this._editor.getModel();
        this._canUndo.set(Boolean(model && model.canUndo()));
        this._canRedo.set(Boolean(model && model.canRedo()));
    }
}
export class EditorModeContext extends Disposable {
    constructor(_editor, _contextKeyService, _languageFeaturesService) {
        super();
        this._editor = _editor;
        this._contextKeyService = _contextKeyService;
        this._languageFeaturesService = _languageFeaturesService;
        this._langId = EditorContextKeys.languageId.bindTo(_contextKeyService);
        this._hasCompletionItemProvider = EditorContextKeys.hasCompletionItemProvider.bindTo(_contextKeyService);
        this._hasCodeActionsProvider = EditorContextKeys.hasCodeActionsProvider.bindTo(_contextKeyService);
        this._hasCodeLensProvider = EditorContextKeys.hasCodeLensProvider.bindTo(_contextKeyService);
        this._hasDefinitionProvider = EditorContextKeys.hasDefinitionProvider.bindTo(_contextKeyService);
        this._hasDeclarationProvider = EditorContextKeys.hasDeclarationProvider.bindTo(_contextKeyService);
        this._hasImplementationProvider = EditorContextKeys.hasImplementationProvider.bindTo(_contextKeyService);
        this._hasTypeDefinitionProvider = EditorContextKeys.hasTypeDefinitionProvider.bindTo(_contextKeyService);
        this._hasHoverProvider = EditorContextKeys.hasHoverProvider.bindTo(_contextKeyService);
        this._hasDocumentHighlightProvider = EditorContextKeys.hasDocumentHighlightProvider.bindTo(_contextKeyService);
        this._hasDocumentSymbolProvider = EditorContextKeys.hasDocumentSymbolProvider.bindTo(_contextKeyService);
        this._hasReferenceProvider = EditorContextKeys.hasReferenceProvider.bindTo(_contextKeyService);
        this._hasRenameProvider = EditorContextKeys.hasRenameProvider.bindTo(_contextKeyService);
        this._hasSignatureHelpProvider = EditorContextKeys.hasSignatureHelpProvider.bindTo(_contextKeyService);
        this._hasInlayHintsProvider = EditorContextKeys.hasInlayHintsProvider.bindTo(_contextKeyService);
        this._hasDocumentFormattingProvider = EditorContextKeys.hasDocumentFormattingProvider.bindTo(_contextKeyService);
        this._hasDocumentSelectionFormattingProvider = EditorContextKeys.hasDocumentSelectionFormattingProvider.bindTo(_contextKeyService);
        this._hasMultipleDocumentFormattingProvider = EditorContextKeys.hasMultipleDocumentFormattingProvider.bindTo(_contextKeyService);
        this._hasMultipleDocumentSelectionFormattingProvider = EditorContextKeys.hasMultipleDocumentSelectionFormattingProvider.bindTo(_contextKeyService);
        this._isInEmbeddedEditor = EditorContextKeys.isInEmbeddedEditor.bindTo(_contextKeyService);
        const update = () => this._update();
        // update when model/mode changes
        this._register(_editor.onDidChangeModel(update));
        this._register(_editor.onDidChangeModelLanguage(update));
        // update when registries change
        this._register(_languageFeaturesService.completionProvider.onDidChange(update));
        this._register(_languageFeaturesService.codeActionProvider.onDidChange(update));
        this._register(_languageFeaturesService.codeLensProvider.onDidChange(update));
        this._register(_languageFeaturesService.definitionProvider.onDidChange(update));
        this._register(_languageFeaturesService.declarationProvider.onDidChange(update));
        this._register(_languageFeaturesService.implementationProvider.onDidChange(update));
        this._register(_languageFeaturesService.typeDefinitionProvider.onDidChange(update));
        this._register(_languageFeaturesService.hoverProvider.onDidChange(update));
        this._register(_languageFeaturesService.documentHighlightProvider.onDidChange(update));
        this._register(_languageFeaturesService.documentSymbolProvider.onDidChange(update));
        this._register(_languageFeaturesService.referenceProvider.onDidChange(update));
        this._register(_languageFeaturesService.renameProvider.onDidChange(update));
        this._register(_languageFeaturesService.documentFormattingEditProvider.onDidChange(update));
        this._register(_languageFeaturesService.documentRangeFormattingEditProvider.onDidChange(update));
        this._register(_languageFeaturesService.signatureHelpProvider.onDidChange(update));
        this._register(_languageFeaturesService.inlayHintsProvider.onDidChange(update));
        update();
    }
    dispose() {
        super.dispose();
    }
    reset() {
        this._contextKeyService.bufferChangeEvents(() => {
            this._langId.reset();
            this._hasCompletionItemProvider.reset();
            this._hasCodeActionsProvider.reset();
            this._hasCodeLensProvider.reset();
            this._hasDefinitionProvider.reset();
            this._hasDeclarationProvider.reset();
            this._hasImplementationProvider.reset();
            this._hasTypeDefinitionProvider.reset();
            this._hasHoverProvider.reset();
            this._hasDocumentHighlightProvider.reset();
            this._hasDocumentSymbolProvider.reset();
            this._hasReferenceProvider.reset();
            this._hasRenameProvider.reset();
            this._hasDocumentFormattingProvider.reset();
            this._hasDocumentSelectionFormattingProvider.reset();
            this._hasSignatureHelpProvider.reset();
            this._isInEmbeddedEditor.reset();
        });
    }
    _update() {
        const model = this._editor.getModel();
        if (!model) {
            this.reset();
            return;
        }
        this._contextKeyService.bufferChangeEvents(() => {
            this._langId.set(model.getLanguageId());
            this._hasCompletionItemProvider.set(this._languageFeaturesService.completionProvider.has(model));
            this._hasCodeActionsProvider.set(this._languageFeaturesService.codeActionProvider.has(model));
            this._hasCodeLensProvider.set(this._languageFeaturesService.codeLensProvider.has(model));
            this._hasDefinitionProvider.set(this._languageFeaturesService.definitionProvider.has(model));
            this._hasDeclarationProvider.set(this._languageFeaturesService.declarationProvider.has(model));
            this._hasImplementationProvider.set(this._languageFeaturesService.implementationProvider.has(model));
            this._hasTypeDefinitionProvider.set(this._languageFeaturesService.typeDefinitionProvider.has(model));
            this._hasHoverProvider.set(this._languageFeaturesService.hoverProvider.has(model));
            this._hasDocumentHighlightProvider.set(this._languageFeaturesService.documentHighlightProvider.has(model));
            this._hasDocumentSymbolProvider.set(this._languageFeaturesService.documentSymbolProvider.has(model));
            this._hasReferenceProvider.set(this._languageFeaturesService.referenceProvider.has(model));
            this._hasRenameProvider.set(this._languageFeaturesService.renameProvider.has(model));
            this._hasSignatureHelpProvider.set(this._languageFeaturesService.signatureHelpProvider.has(model));
            this._hasInlayHintsProvider.set(this._languageFeaturesService.inlayHintsProvider.has(model));
            this._hasDocumentFormattingProvider.set(this._languageFeaturesService.documentFormattingEditProvider.has(model) || this._languageFeaturesService.documentRangeFormattingEditProvider.has(model));
            this._hasDocumentSelectionFormattingProvider.set(this._languageFeaturesService.documentRangeFormattingEditProvider.has(model));
            this._hasMultipleDocumentFormattingProvider.set(this._languageFeaturesService.documentFormattingEditProvider.all(model).length + this._languageFeaturesService.documentRangeFormattingEditProvider.all(model).length > 1);
            this._hasMultipleDocumentSelectionFormattingProvider.set(this._languageFeaturesService.documentRangeFormattingEditProvider.all(model).length > 1);
            this._isInEmbeddedEditor.set(model.uri.scheme === Schemas.walkThroughSnippet || model.uri.scheme === Schemas.vscodeChatCodeBlock);
        });
    }
}
class EditorDecorationsCollection {
    get length() {
        return this._decorationIds.length;
    }
    constructor(_editor, decorations) {
        this._editor = _editor;
        this._decorationIds = [];
        this._isChangingDecorations = false;
        if (Array.isArray(decorations) && decorations.length > 0) {
            this.set(decorations);
        }
    }
    onDidChange(listener, thisArgs, disposables) {
        return this._editor.onDidChangeModelDecorations((e) => {
            if (this._isChangingDecorations) {
                return;
            }
            listener.call(thisArgs, e);
        }, disposables);
    }
    getRange(index) {
        if (!this._editor.hasModel()) {
            return null;
        }
        if (index >= this._decorationIds.length) {
            return null;
        }
        return this._editor.getModel().getDecorationRange(this._decorationIds[index]);
    }
    getRanges() {
        if (!this._editor.hasModel()) {
            return [];
        }
        const model = this._editor.getModel();
        const result = [];
        for (const decorationId of this._decorationIds) {
            const range = model.getDecorationRange(decorationId);
            if (range) {
                result.push(range);
            }
        }
        return result;
    }
    has(decoration) {
        return this._decorationIds.includes(decoration.id);
    }
    clear() {
        if (this._decorationIds.length === 0) {
            // nothing to do
            return;
        }
        this.set([]);
    }
    set(newDecorations) {
        try {
            this._isChangingDecorations = true;
            this._editor.changeDecorations((accessor) => {
                this._decorationIds = accessor.deltaDecorations(this._decorationIds, newDecorations);
            });
        }
        finally {
            this._isChangingDecorations = false;
        }
        return this._decorationIds;
    }
    append(newDecorations) {
        let newDecorationIds = [];
        try {
            this._isChangingDecorations = true;
            this._editor.changeDecorations((accessor) => {
                newDecorationIds = accessor.deltaDecorations([], newDecorations);
                this._decorationIds = this._decorationIds.concat(newDecorationIds);
            });
        }
        finally {
            this._isChangingDecorations = false;
        }
        return newDecorationIds;
    }
}
const squigglyStart = encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 6 3' enable-background='new 0 0 6 3' height='3' width='6'><g fill='`);
const squigglyEnd = encodeURIComponent(`'><polygon points='5.5,0 2.5,3 1.1,3 4.1,0'/><polygon points='4,0 6,2 6,0.6 5.4,0'/><polygon points='0,2 1,3 2.4,3 0,0.6'/></g></svg>`);
function getSquigglySVGData(color) {
    return squigglyStart + encodeURIComponent(color.toString()) + squigglyEnd;
}
const dotdotdotStart = encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" height="3" width="12"><g fill="`);
const dotdotdotEnd = encodeURIComponent(`"><circle cx="1" cy="1" r="1"/><circle cx="5" cy="1" r="1"/><circle cx="9" cy="1" r="1"/></g></svg>`);
function getDotDotDotSVGData(color) {
    return dotdotdotStart + encodeURIComponent(color.toString()) + dotdotdotEnd;
}
registerThemingParticipant((theme, collector) => {
    const errorForeground = theme.getColor(editorErrorForeground);
    if (errorForeground) {
        collector.addRule(`.monaco-editor .${"squiggly-error" /* ClassName.EditorErrorDecoration */} { background: url("data:image/svg+xml,${getSquigglySVGData(errorForeground)}") repeat-x bottom left; }`);
        collector.addRule(`:root { --monaco-editor-error-decoration: url("data:image/svg+xml,${getSquigglySVGData(errorForeground)}"); }`);
    }
    const warningForeground = theme.getColor(editorWarningForeground);
    if (warningForeground) {
        collector.addRule(`.monaco-editor .${"squiggly-warning" /* ClassName.EditorWarningDecoration */} { background: url("data:image/svg+xml,${getSquigglySVGData(warningForeground)}") repeat-x bottom left; }`);
        collector.addRule(`:root { --monaco-editor-warning-decoration: url("data:image/svg+xml,${getSquigglySVGData(warningForeground)}"); }`);
    }
    const infoForeground = theme.getColor(editorInfoForeground);
    if (infoForeground) {
        collector.addRule(`.monaco-editor .${"squiggly-info" /* ClassName.EditorInfoDecoration */} { background: url("data:image/svg+xml,${getSquigglySVGData(infoForeground)}") repeat-x bottom left; }`);
        collector.addRule(`:root { --monaco-editor-info-decoration: url("data:image/svg+xml,${getSquigglySVGData(infoForeground)}"); }`);
    }
    const hintForeground = theme.getColor(editorHintForeground);
    if (hintForeground) {
        collector.addRule(`.monaco-editor .${"squiggly-hint" /* ClassName.EditorHintDecoration */} { background: url("data:image/svg+xml,${getDotDotDotSVGData(hintForeground)}") no-repeat bottom left; }`);
        collector.addRule(`:root { --monaco-editor-hint-decoration: url("data:image/svg+xml,${getDotDotDotSVGData(hintForeground)}"); }`);
    }
    const unnecessaryForeground = theme.getColor(editorUnnecessaryCodeOpacity);
    if (unnecessaryForeground) {
        collector.addRule(`.monaco-editor.showUnused .${"squiggly-inline-unnecessary" /* ClassName.EditorUnnecessaryInlineDecoration */} { opacity: ${unnecessaryForeground.rgba.a}; }`);
        collector.addRule(`:root { --monaco-editor-unnecessary-decoration-opacity: ${unnecessaryForeground.rgba.a}; }`);
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29kZUVkaXRvcldpZGdldC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL2FkdmlrYXIvRG9jdW1lbnRzL2FyY2hpdGVjdC9hcmNoMi9BcmNoSURFL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9icm93c2VyL3dpZGdldC9jb2RlRWRpdG9yL2NvZGVFZGl0b3JXaWRnZXQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8scUNBQXFDLENBQUM7QUFDN0MsT0FBTyxLQUFLLEdBQUcsTUFBTSxpQ0FBaUMsQ0FBQztBQUl2RCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUN0RSxPQUFPLEVBQUUsT0FBTyxFQUE2Qyx3QkFBd0IsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ2hJLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUN2RCxPQUFPLEVBQUUsVUFBVSxFQUFnQyxPQUFPLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUN6RyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDN0QsT0FBTyxjQUFjLENBQUM7QUFDdEIsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBQzVELE9BQU8sRUFBRSxtQkFBbUIsRUFBOEIsTUFBTSxxQ0FBcUMsQ0FBQztBQUN0RyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFFcEQsT0FBTyxFQUFFLHdCQUF3QixFQUFrQyxNQUFNLDJCQUEyQixDQUFDO0FBQ3JHLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQ3pFLE9BQU8sRUFBa0UsSUFBSSxFQUFFLE1BQU0sZUFBZSxDQUFDO0FBQ3JHLE9BQU8sRUFBRSw0QkFBNEIsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBRW5GLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFN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