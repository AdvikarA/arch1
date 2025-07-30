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
import { Disposable, toDisposable } from '../../../../../../base/common/lifecycle.js';
import { autorun, debouncedObservable, observableFromEvent, observableValue } from '../../../../../../base/common/observable.js';
import { basename } from '../../../../../../base/common/resources.js';
import { assertType } from '../../../../../../base/common/types.js';
import { LineRange } from '../../../../../../editor/common/core/ranges/lineRange.js';
import { Range } from '../../../../../../editor/common/core/range.js';
import { nullDocumentDiff } from '../../../../../../editor/common/diff/documentDiffProvider.js';
import { PrefixSumComputer } from '../../../../../../editor/common/model/prefixSumComputer.js';
import { localize } from '../../../../../../nls.js';
import { AccessibilitySignal, IAccessibilitySignalService } from '../../../../../../platform/accessibilitySignal/browser/accessibilitySignalService.js';
import { MenuId } from '../../../../../../platform/actions/common/actions.js';
import { IInstantiationService } from '../../../../../../platform/instantiation/common/instantiation.js';
import { ILogService } from '../../../../../../platform/log/common/log.js';
import { IEditorService } from '../../../../../services/editor/common/editorService.js';
import { NotebookDeletedCellDecorator } from '../../../../notebook/browser/diff/inlineDiff/notebookDeletedCellDecorator.js';
import { NotebookInsertedCellDecorator } from '../../../../notebook/browser/diff/inlineDiff/notebookInsertedCellDecorator.js';
import { NotebookModifiedCellDecorator } from '../../../../notebook/browser/diff/inlineDiff/notebookModifiedCellDecorator.js';
import { CellEditState, getNotebookEditorFromEditorPane } from '../../../../notebook/browser/notebookBrowser.js';
import { INotebookEditorService } from '../../../../notebook/browser/services/notebookEditorService.js';
import { CellKind } from '../../../../notebook/common/notebookCommon.js';
import { IChatAgentService } from '../../../common/chatAgents.js';
import { ChatAgentLocation } from '../../../common/constants.js';
import { ChatEditingCodeEditorIntegration } from '../chatEditingCodeEditorIntegration.js';
import { countChanges, sortCellChanges } from './notebookCellChanges.js';
import { OverlayToolbarDecorator } from './overlayToolbarDecorator.js';
let ChatEditingNotebookEditorIntegration = class ChatEditingNotebookEditorIntegration extends Disposable {
    constructor(_entry, editor, notebookModel, originalModel, cellChanges, instantiationService) {
        super();
        this.instantiationService = instantiationService;
        const notebookEditor = getNotebookEditorFromEditorPane(editor);
        assertType(notebookEditor);
        this.notebookEditor = notebookEditor;
        this.integration = this.instantiationService.createInstance(ChatEditingNotebookEditorWidgetIntegration, _entry, notebookEditor, notebookModel, originalModel, cellChanges);
        this._register(editor.onDidChangeControl(() => {
            const notebookEditor = getNotebookEditorFromEditorPane(editor);
            if (notebookEditor && notebookEditor !== this.notebookEditor) {
                this.notebookEditor = notebookEditor;
                this.integration.dispose();
                this.integration = this.instantiationService.createInstance(ChatEditingNotebookEditorWidgetIntegration, _entry, notebookEditor, notebookModel, originalModel, cellChanges);
            }
        }));
    }
    get currentIndex() {
        return this.integration.currentIndex;
    }
    reveal(firstOrLast) {
        return this.integration.reveal(firstOrLast);
    }
    next(wrap) {
        return this.integration.next(wrap);
    }
    previous(wrap) {
        return this.integration.previous(wrap);
    }
    enableAccessibleDiffView() {
        this.integration.enableAccessibleDiffView();
    }
    acceptNearestChange(change) {
        return this.integration.acceptNearestChange(change);
    }
    rejectNearestChange(change) {
        return this.integration.rejectNearestChange(change);
    }
    toggleDiff(change, show) {
        return this.integration.toggleDiff(change, show);
    }
    dispose() {
        this.integration.dispose();
        super.dispose();
    }
};
ChatEditingNotebookEditorIntegration = __decorate([
    __param(5, IInstantiationService)
], ChatEditingNotebookEditorIntegration);
export { ChatEditingNotebookEditorIntegration };
let ChatEditingNotebookEditorWidgetIntegration = class ChatEditingNotebookEditorWidgetIntegration extends Disposable {
    constructor(_entry, notebookEditor, notebookModel, originalModel, cellChanges, instantiationService, _editorService, _chatAgentService, notebookEditorService, accessibilitySignalService, logService) {
        super();
        this._entry = _entry;
        this.notebookEditor = notebookEditor;
        this.notebookModel = notebookModel;
        this.cellChanges = cellChanges;
        this.instantiationService = instantiationService;
        this._editorService = _editorService;
        this._chatAgentService = _chatAgentService;
        this.accessibilitySignalService = accessibilitySignalService;
        this.logService = logService;
        this._currentIndex = observableValue(this, -1);
        this.currentIndex = this._currentIndex;
        this.cellEditorIntegrations = new Map();
        this.markdownEditState = observableValue(this, '');
        this.markupCellListeners = new Map();
        this.sortedCellChanges = [];
        this.changeIndexComputer = new PrefixSumComputer(new Uint32Array(0));
        const onDidChangeVisibleRanges = debouncedObservable(observableFromEvent(notebookEditor.onDidChangeVisibleRanges, () => notebookEditor.visibleRanges), 50);
        this._register(toDisposable(() => {
            this.markupCellListeners.forEach((v) => v.dispose());
        }));
        let originalReadonly = undefined;
        const shouldBeReadonly = _entry.isCurrentlyBeingModifiedBy.map(value => !!value);
        this._register(autorun(r => {
            const isReadOnly = shouldBeReadonly.read(r);
            const notebookEditor = notebookEditorService.retrieveExistingWidgetFromURI(_entry.modifiedURI)?.value;
            if (!notebookEditor) {
                return;
            }
            if (isReadOnly) {
                originalReadonly ??= notebookEditor.isReadOnly;
                notebookEditor.setOptions({ isReadOnly: true });
            }
            else if (originalReadonly === false) {
                notebookEditor.setOptions({ isReadOnly: false });
                // Ensure all cells area editable.
                // We make use of chatEditingCodeEditorIntegration to handle cell diffing and navigation.
                // However that also makes the cell read-only. We need to ensure that the cell is editable.
                // E.g. first we make notebook readonly (in here), then cells end up being readonly because notebook is readonly.
                // Then chatEditingCodeEditorIntegration makes cells readonly and keeps track of the original readonly state.
                // However the cell is already readonly because the notebook is readonly.
                // So when we restore the notebook to editable (in here), the cell is made editable again.
                // But when chatEditingCodeEditorIntegration attempts to restore, it will restore the original readonly state.
                // & from the perpspective of chatEditingCodeEditorIntegration, the cell was readonly & should continue to be readonly.
                // To get around this, we wait for a few ms before restoring the original readonly state for each cell.
                const timeout = setTimeout(() => {
                    notebookEditor.setOptions({ isReadOnly: true });
                    notebookEditor.setOptions({ isReadOnly: false });
                    disposable.dispose();
                }, 100);
                const disposable = toDisposable(() => clearTimeout(timeout));
                r.store.add(disposable);
            }
        }));
        // INIT when not streaming nor diffing the response anymore, once per request, and when having changes
        let lastModifyingRequestId;
        this._store.add(autorun(r => {
            if (!_entry.isCurrentlyBeingModifiedBy.read(r)
                && !_entry.isProcessingResponse.read(r)
                && lastModifyingRequestId !== _entry.lastModifyingRequestId
                && cellChanges.read(r).some(c => c.type !== 'unchanged' && !c.diff.read(r).identical)) {
                lastModifyingRequestId = _entry.lastModifyingRequestId;
                // Check if any of the changes are visible, if not, reveal the first change.
                const visibleChange = this.sortedCellChanges.find(c => {
                    if (c.type === 'unchanged') {
                        return false;
                    }
                    const index = c.modifiedCellIndex ?? c.originalCellIndex;
                    return this.notebookEditor.visibleRanges.some(range => index >= range.start && index < range.end);
                });
                if (!visibleChange) {
                    this.reveal(true);
                }
            }
        }));
        this._register(autorun(r => {
            this.sortedCellChanges = sortCellChanges(cellChanges.read(r));
            const indexes = [];
            for (const change of this.sortedCellChanges) {
                indexes.push(change.type === 'insert' || change.type === 'delete' ? 1
                    : change.type === 'modified' ? change.diff.read(r).changes.length
                        : 0);
            }
            this.changeIndexComputer = new PrefixSumComputer(new Uint32Array(indexes));
            if (this.changeIndexComputer.getTotalSum() === 0) {
                this.revertMarkupCellState();
            }
        }));
        // Build cell integrations (responsible for navigating changes within a cell and decorating cell text changes)
        this._register(autorun(r => {
            if (this.notebookEditor.textModel !== this.notebookModel) {
                return;
            }
            const sortedCellChanges = sortCellChanges(cellChanges.read(r));
            const changes = sortedCellChanges.filter(c => c.type !== 'delete');
            onDidChangeVisibleRanges.read(r);
            if (!changes.length) {
                this.cellEditorIntegrations.forEach(({ diff }) => {
                    diff.set({ ...diff.get(), ...nullDocumentDiff }, undefined);
                });
                return;
            }
            this.markdownEditState.read(r);
            const validCells = new Set();
            changes.forEach((change) => {
                if (change.modifiedCellIndex === undefined || change.modifiedCellIndex >= notebookModel.cells.length) {
                    return;
                }
                const cell = notebookModel.cells[change.modifiedCellIndex];
                const editor = notebookEditor.codeEditors.find(([vm,]) => vm.handle === notebookModel.cells[change.modifiedCellIndex].handle)?.[1];
                const modifiedModel = change.modifiedModel.promiseResult.read(r)?.data;
                const originalModel = change.originalModel.promiseResult.read(r)?.data;
                if (!cell || !originalModel || !modifiedModel) {
                    return;
                }
                if (cell.cellKind === CellKind.Markup && !this.markupCellListeners.has(cell.handle)) {
                    const cellModel = this.notebookEditor.getViewModel()?.viewCells.find(c => c.handle === cell.handle);
                    if (cellModel) {
                        const listener = cellModel.onDidChangeState((e) => {
                            if (e.editStateChanged) {
                                setTimeout(() => this.markdownEditState.set(cellModel.handle + '-' + cellModel.getEditState(), undefined), 0);
                            }
                        });
                        this.markupCellListeners.set(cell.handle, listener);
                    }
                }
                if (!editor) {
                    return;
                }
                const diff = {
                    ...change.diff.read(r),
                    modifiedModel,
                    originalModel,
                    keep: change.keep,
                    undo: change.undo
                };
                validCells.add(cell);
                const currentDiff = this.cellEditorIntegrations.get(cell);
                if (currentDiff) {
                    // Do not unnecessarily trigger a change event
                    if (!areDocumentDiff2Equal(currentDiff.diff.get(), diff)) {
                        currentDiff.diff.set(diff, undefined);
                    }
                }
                else {
                    const diff2 = observableValue(`diff${cell.handle}`, diff);
                    const integration = this.instantiationService.createInstance(ChatEditingCodeEditorIntegration, _entry, editor, diff2, true);
                    this.cellEditorIntegrations.set(cell, { integration, diff: diff2 });
                    this._register(integration);
                    this._register(editor.onDidDispose(() => {
                        this.cellEditorIntegrations.get(cell)?.integration.dispose();
                        this.cellEditorIntegrations.delete(cell);
                    }));
                    this._register(editor.onDidChangeModel(() => {
                        if (editor.getModel() !== cell.textModel) {
                            this.cellEditorIntegrations.get(cell)?.integration.dispose();
                            this.cellEditorIntegrations.delete(cell);
                        }
                    }));
                }
            });
            // Dispose old integrations as the editors are no longer valid.
            this.cellEditorIntegrations.forEach((v, cell) => {
                if (!validCells.has(cell)) {
                    v.integration.dispose();
                    this.cellEditorIntegrations.delete(cell);
                }
            });
        }));
        const cellsAreVisible = onDidChangeVisibleRanges.map(v => v.length > 0);
        const debouncedChanges = debouncedObservable(cellChanges, 10);
        this._register(autorun(r => {
            if (this.notebookEditor.textModel !== this.notebookModel || !cellsAreVisible.read(r) || !this.notebookEditor.getViewModel()) {
                return;
            }
            // We can have inserted cells that have been accepted, in those cases we do not want any decorators on them.
            const changes = debouncedChanges.read(r).filter(c => c.type === 'insert' ? !c.diff.read(r).identical : true);
            const modifiedChanges = changes.filter(c => c.type === 'modified');
            this.createDecorators();
            // If all cells are just inserts, then no need to show any decorations.
            if (changes.every(c => c.type === 'insert')) {
                this.insertedCellDecorator?.apply([]);
                this.modifiedCellDecorator?.apply([]);
                this.deletedCellDecorator?.apply([], originalModel);
                this.overlayToolbarDecorator?.decorate([]);
            }
            else {
                this.insertedCellDecorator?.apply(changes);
                this.modifiedCellDecorator?.apply(modifiedChanges);
                this.deletedCellDecorator?.apply(changes, originalModel);
                this.overlayToolbarDecorator?.decorate(changes.filter(c => c.type === 'insert' || c.type === 'modified'));
            }
        }));
    }
    getCurrentChange() {
        const currentIndex = Math.min(this._currentIndex.get(), this.changeIndexComputer.getTotalSum() - 1);
        const index = this.changeIndexComputer.getIndexOf(currentIndex);
        const change = this.sortedCellChanges[index.index];
        return change ? { change, index: index.remainder } : undefined;
    }
    updateCurrentIndex(change, indexInCell = 0) {
        const index = this.sortedCellChanges.indexOf(change);
        const changeIndex = this.changeIndexComputer.getPrefixSum(index - 1);
        const currentIndex = Math.min(changeIndex + indexInCell, this.changeIndexComputer.getTotalSum() - 1);
        this._currentIndex.set(currentIndex, undefined);
    }
    createDecorators() {
        const cellChanges = this.cellChanges.get();
        const accessibilitySignalService = this.accessibilitySignalService;
        this.insertedCellDecorator ??= this._register(this.instantiationService.createInstance(NotebookInsertedCellDecorator, this.notebookEditor));
        this.modifiedCellDecorator ??= this._register(this.instantiationService.createInstance(NotebookModifiedCellDecorator, this.notebookEditor));
        this.overlayToolbarDecorator ??= this._register(this.instantiationService.createInstance(OverlayToolbarDecorator, this.notebookEditor, this.notebookModel));
        if (this.deletedCellDecorator) {
            this._store.delete(this.deletedCellDecorator);
            this.deletedCellDecorator.dispose();
        }
        this.deletedCellDecorator = this._register(this.instantiationService.createInstance(NotebookDeletedCellDecorator, this.notebookEditor, {
            className: 'chat-diff-change-content-widget',
            telemetrySource: 'chatEditingNotebookHunk',
            menuId: MenuId.ChatEditingEditorHunk,
            argFactory: (deletedCellIndex) => {
                return {
                    accept() {
                        const entry = cellChanges.find(c => c.type === 'delete' && c.originalCellIndex === deletedCellIndex);
                        if (entry) {
                            return entry.keep(entry.diff.get().changes[0]);
                        }
                        accessibilitySignalService.playSignal(AccessibilitySignal.editsKept, { allowManyInParallel: true });
                        return Promise.resolve(true);
                    },
                    reject() {
                        const entry = cellChanges.find(c => c.type === 'delete' && c.originalCellIndex === deletedCellIndex);
                        if (entry) {
                            return entry.undo(entry.diff.get().changes[0]);
                        }
                        accessibilitySignalService.playSignal(AccessibilitySignal.editsUndone, { allowManyInParallel: true });
                        return Promise.resolve(true);
                    },
                };
            }
        }));
    }
    getCell(modifiedCellIndex) {
        const cell = this.notebookModel.cells[modifiedCellIndex];
        const integration = this.cellEditorIntegrations.get(cell)?.integration;
        return integration;
    }
    reveal(firstOrLast) {
        const changes = this.sortedCellChanges.filter(c => c.type !== 'unchanged');
        if (!changes.length) {
            return;
        }
        const change = firstOrLast ? changes[0] : changes[changes.length - 1];
        this._revealFirstOrLast(change, firstOrLast);
    }
    _revealFirstOrLast(change, firstOrLast = true) {
        switch (change.type) {
            case 'insert':
            case 'modified':
                {
                    this.blur(this.getCurrentChange()?.change);
                    const index = firstOrLast || change.type === 'insert' ? 0 : change.diff.get().changes.length - 1;
                    return this._revealChange(change, index);
                }
            case 'delete':
                this.blur(this.getCurrentChange()?.change);
                // reveal the deleted cell decorator
                this.deletedCellDecorator?.reveal(change.originalCellIndex);
                this.updateCurrentIndex(change);
                return true;
            default:
                break;
        }
        return false;
    }
    _revealChange(change, indexInCell) {
        switch (change.type) {
            case 'insert':
            case 'modified':
                {
                    const textChange = change.diff.get().changes[indexInCell];
                    const cellViewModel = this.getCellViewModel(change);
                    if (cellViewModel) {
                        this.updateCurrentIndex(change, indexInCell);
                        this.revealChangeInView(cellViewModel, textChange?.modified, change)
                            .catch(err => { this.logService.warn(`Error revealing change in view: ${err}`); });
                        return true;
                    }
                    break;
                }
            case 'delete':
                this.updateCurrentIndex(change);
                // reveal the deleted cell decorator
                this.deletedCellDecorator?.reveal(change.originalCellIndex);
                return true;
            default:
                break;
        }
        return false;
    }
    getCellViewModel(change) {
        if (change.type === 'delete' || change.modifiedCellIndex === undefined || change.modifiedCellIndex >= this.notebookModel.cells.length) {
            return undefined;
        }
        const cell = this.notebookModel.cells[change.modifiedCellIndex];
        const cellViewModel = this.notebookEditor.getViewModel()?.viewCells.find(c => c.handle === cell.handle);
        return cellViewModel;
    }
    async revealChangeInView(cell, lines, change) {
        const targetLines = lines ?? new LineRange(0, 0);
        if (change.type === 'modified' && cell.cellKind === CellKind.Markup && cell.getEditState() === CellEditState.Preview) {
            cell.updateEditState(CellEditState.Editing, 'chatEditNavigation');
        }
        const focusTarget = cell.cellKind === CellKind.Code || change.type === 'modified' ? 'editor' : 'container';
        await this.notebookEditor.focusNotebookCell(cell, focusTarget, { focusEditorLine: targetLines.startLineNumber });
        await this.notebookEditor.revealRangeInCenterAsync(cell, new Range(targetLines.startLineNumber, 0, targetLines.endLineNumberExclusive, 0));
    }
    revertMarkupCellState() {
        for (const change of this.sortedCellChanges) {
            const cellViewModel = this.getCellViewModel(change);
            if (cellViewModel?.cellKind === CellKind.Markup && cellViewModel.getEditState() === CellEditState.Editing &&
                (cellViewModel.editStateSource === 'chatEditNavigation' || cellViewModel.editStateSource === 'chatEdit')) {
                cellViewModel.updateEditState(CellEditState.Preview, 'chatEdit');
            }
        }
    }
    blur(change) {
        if (!change) {
            return;
        }
        const cellViewModel = this.getCellViewModel(change);
        if (cellViewModel?.cellKind === CellKind.Markup && cellViewModel.getEditState() === CellEditState.Editing && cellViewModel.editStateSource === 'chatEditNavigation') {
            cellViewModel.updateEditState(CellEditState.Preview, 'chatEditNavigation');
        }
    }
    next(wrap) {
        const changes = this.sortedCellChanges.filter(c => c.type !== 'unchanged');
        const currentChange = this.getCurrentChange();
        if (!currentChange) {
            const firstChange = changes[0];
            if (firstChange) {
                return this._revealFirstOrLast(firstChange);
            }
            return false;
        }
        // go to next
        // first check if we are at the end of the current change
        switch (currentChange.change.type) {
            case 'modified':
                {
                    const cellIntegration = this.getCell(currentChange.change.modifiedCellIndex);
                    if (cellIntegration) {
                        if (cellIntegration.next(false)) {
                            this.updateCurrentIndex(currentChange.change, cellIntegration.currentIndex.get());
                            return true;
                        }
                    }
                    const isLastChangeInCell = currentChange.index >= lastChangeIndex(currentChange.change);
                    const index = isLastChangeInCell ? 0 : currentChange.index + 1;
                    const change = isLastChangeInCell ? changes[changes.indexOf(currentChange.change) + 1] : currentChange.change;
                    if (change) {
                        if (isLastChangeInCell) {
                            this.blur(currentChange.change);
                        }
                        if (this._revealChange(change, index)) {
                            return true;
                        }
                    }
                }
                break;
            case 'insert':
            case 'delete':
                {
                    this.blur(currentChange.change);
                    // go to next change directly
                    const nextChange = changes[changes.indexOf(currentChange.change) + 1];
                    if (nextChange && this._revealFirstOrLast(nextChange, true)) {
                        return true;
                    }
                }
                break;
            default:
                break;
        }
        if (wrap) {
            const firstChange = changes[0];
            if (firstChange) {
                return this._revealFirstOrLast(firstChange, true);
            }
        }
        return false;
    }
    previous(wrap) {
        const changes = this.sortedCellChanges.filter(c => c.type !== 'unchanged');
        const currentChange = this.getCurrentChange();
        if (!currentChange) {
            const lastChange = changes[changes.length - 1];
            if (lastChange) {
                return this._revealFirstOrLast(lastChange, false);
            }
            return false;
        }
        // go to previous
        // first check if we are at the start of the current change
        switch (currentChange.change.type) {
            case 'modified':
                {
                    const cellIntegration = this.getCell(currentChange.change.modifiedCellIndex);
                    if (cellIntegration) {
                        if (cellIntegration.previous(false)) {
                            this.updateCurrentIndex(currentChange.change, cellIntegration.currentIndex.get());
                            return true;
                        }
                    }
                    const isFirstChangeInCell = currentChange.index <= 0;
                    const change = isFirstChangeInCell ? changes[changes.indexOf(currentChange.change) - 1] : currentChange.change;
                    if (change) {
                        const index = isFirstChangeInCell ? lastChangeIndex(change) : currentChange.index - 1;
                        if (isFirstChangeInCell) {
                            this.blur(currentChange.change);
                        }
                        if (this._revealChange(change, index)) {
                            return true;
                        }
                    }
                }
                break;
            case 'insert':
            case 'delete':
                {
                    this.blur(currentChange.change);
                    // go to previous change directly
                    const prevChange = changes[changes.indexOf(currentChange.change) - 1];
                    if (prevChange && this._revealFirstOrLast(prevChange, false)) {
                        return true;
                    }
                }
                break;
            default:
                break;
        }
        if (wrap) {
            const lastChange = changes[changes.length - 1];
            if (lastChange) {
                return this._revealFirstOrLast(lastChange, false);
            }
        }
        return false;
    }
    enableAccessibleDiffView() {
        const cell = this.notebookEditor.getActiveCell()?.model;
        if (cell) {
            const integration = this.cellEditorIntegrations.get(cell)?.integration;
            integration?.enableAccessibleDiffView();
        }
    }
    getfocusedIntegration() {
        const first = this.notebookEditor.getSelectionViewModels()[0];
        if (first) {
            return this.cellEditorIntegrations.get(first.model)?.integration;
        }
        return undefined;
    }
    async acceptNearestChange(hunk) {
        if (hunk) {
            await hunk.accept();
        }
        else {
            const current = this.getCurrentChange();
            const focused = this.getfocusedIntegration();
            // delete changes can't be focused
            if (current && !focused || current?.change.type === 'delete') {
                current.change.keep(current?.change.diff.get().changes[current.index]);
            }
            else if (focused) {
                await focused.acceptNearestChange();
            }
            this._currentIndex.set(this._currentIndex.get() - 1, undefined);
            this.next(true);
        }
    }
    async rejectNearestChange(hunk) {
        if (hunk) {
            await hunk.reject();
        }
        else {
            const current = this.getCurrentChange();
            const focused = this.getfocusedIntegration();
            // delete changes can't be focused
            if (current && !focused || current?.change.type === 'delete') {
                current.change.undo(current.change.diff.get().changes[current.index]);
            }
            else if (focused) {
                await focused.rejectNearestChange();
            }
            this._currentIndex.set(this._currentIndex.get() - 1, undefined);
            this.next(true);
        }
    }
    async toggleDiff(_change, _show) {
        const defaultAgentName = this._chatAgentService.getDefaultAgent(ChatAgentLocation.Panel)?.fullName;
        const diffInput = {
            original: { resource: this._entry.originalURI },
            modified: { resource: this._entry.modifiedURI },
            label: defaultAgentName
                ? localize('diff.agent', '{0} (changes from {1})', basename(this._entry.modifiedURI), defaultAgentName)
                : localize('diff.generic', '{0} (changes from chat)', basename(this._entry.modifiedURI))
        };
        await this._editorService.openEditor(diffInput);
    }
};
ChatEditingNotebookEditorWidgetIntegration = __decorate([
    __param(5, IInstantiationService),
    __param(6, IEditorService),
    __param(7, IChatAgentService),
    __param(8, INotebookEditorService),
    __param(9, IAccessibilitySignalService),
    __param(10, ILogService)
], ChatEditingNotebookEditorWidgetIntegration);
export class ChatEditingNotebookDiffEditorIntegration extends Disposable {
    constructor(notebookDiffEditor, cellChanges) {
        super();
        this.notebookDiffEditor = notebookDiffEditor;
        this.cellChanges = cellChanges;
        this._currentIndex = observableValue(this, -1);
        this.currentIndex = this._currentIndex;
        this._store.add(autorun(r => {
            const index = notebookDiffEditor.currentChangedIndex.read(r);
            const numberOfCellChanges = cellChanges.read(r).filter(c => !c.diff.read(r).identical);
            if (numberOfCellChanges.length && index >= 0 && index < numberOfCellChanges.length) {
                // Notebook Diff editor only supports navigating through changes to cells.
                // However in chat we take changes to lines in the cells into account.
                // So if we're on the second cell and first cell has 3 changes, then we're on the 4th change.
                const changesSoFar = countChanges(numberOfCellChanges.slice(0, index + 1));
                this._currentIndex.set(changesSoFar - 1, undefined);
            }
            else {
                this._currentIndex.set(-1, undefined);
            }
        }));
    }
    reveal(firstOrLast) {
        const changes = sortCellChanges(this.cellChanges.get().filter(c => c.type !== 'unchanged'));
        if (!changes.length) {
            return undefined;
        }
        if (firstOrLast) {
            this.notebookDiffEditor.firstChange();
        }
        else {
            this.notebookDiffEditor.lastChange();
        }
    }
    next(_wrap) {
        const changes = this.cellChanges.get().filter(c => !c.diff.get().identical).length;
        if (this.notebookDiffEditor.currentChangedIndex.get() === changes - 1) {
            return false;
        }
        this.notebookDiffEditor.nextChange();
        return true;
    }
    previous(_wrap) {
        const changes = this.cellChanges.get().filter(c => !c.diff.get().identical).length;
        if (this.notebookDiffEditor.currentChangedIndex.get() === changes - 1) {
            return false;
        }
        this.notebookDiffEditor.nextChange();
        return true;
    }
    enableAccessibleDiffView() {
        //
    }
    async acceptNearestChange(change) {
        await change.accept();
        this.next(true);
    }
    async rejectNearestChange(change) {
        await change.reject();
        this.next(true);
    }
    async toggleDiff(_change, _show) {
        //
    }
}
function areDocumentDiff2Equal(diff1, diff2) {
    if (diff1.changes !== diff2.changes) {
        return false;
    }
    if (diff1.identical !== diff2.identical) {
        return false;
    }
    if (diff1.moves !== diff2.moves) {
        return false;
    }
    if (diff1.originalModel !== diff2.originalModel) {
        return false;
    }
    if (diff1.modifiedModel !== diff2.modifiedModel) {
        return false;
    }
    if (diff1.keep !== diff2.keep) {
        return false;
    }
    if (diff1.undo !== diff2.undo) {
        return false;
    }
    if (diff1.quitEarly !== diff2.quitEarly) {
        return false;
    }
    return true;
}
function lastChangeIndex(change) {
    if (change.type === 'modified') {
        return change.diff.get().changes.length - 1;
    }
    return 0;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdEVkaXRpbmdOb3RlYm9va0VkaXRvckludGVncmF0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvYWR2aWthci9Eb2N1bWVudHMvYXJjaGl0ZWN0L2FyY2gyL0FyY2hJREUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9icm93c2VyL2NoYXRFZGl0aW5nL25vdGVib29rL2NoYXRFZGl0aW5nTm90ZWJvb2tFZGl0b3JJbnRlZ3JhdGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsVUFBVSxFQUFlLFlBQVksRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQ25HLE9BQU8sRUFBRSxPQUFPLEVBQUUsbUJBQW1CLEVBQW9DLG1CQUFtQixFQUFFLGVBQWUsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQ25LLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUN0RSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDcEUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLDBEQUEwRCxDQUFDO0FBQ3JGLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQztBQUN0RSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSw4REFBOEQsQ0FBQztBQUNoRyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUMvRixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFDcEQsT0FBTyxFQUFFLG1CQUFtQixFQUFFLDJCQUEyQixFQUFFLE1BQU0sc0ZBQXNGLENBQUM7QUFDeEosT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQzlFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLGtFQUFrRSxDQUFDO0FBQ3pHLE9BQU8sRUFBRSxXQUFXLEVBQUUs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