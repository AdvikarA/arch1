/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as dom from '../../../../base/browser/dom.js';
import { alert as alertFn } from '../../../../base/browser/ui/aria/aria.js';
import { Toggle } from '../../../../base/browser/ui/toggle/toggle.js';
import { Sash } from '../../../../base/browser/ui/sash/sash.js';
import { Widget } from '../../../../base/browser/ui/widget.js';
import { Delayer } from '../../../../base/common/async.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { onUnexpectedError } from '../../../../base/common/errors.js';
import { toDisposable } from '../../../../base/common/lifecycle.js';
import * as platform from '../../../../base/common/platform.js';
import * as strings from '../../../../base/common/strings.js';
import './findWidget.css';
import { Range } from '../../../common/core/range.js';
import { CONTEXT_FIND_INPUT_FOCUSED, CONTEXT_REPLACE_INPUT_FOCUSED, FIND_IDS, MATCHES_LIMIT } from './findModel.js';
import * as nls from '../../../../nls.js';
import { ContextScopedFindInput, ContextScopedReplaceInput } from '../../../../platform/history/browser/contextScopedHistoryWidget.js';
import { showHistoryKeybindingHint } from '../../../../platform/history/browser/historyWidgetKeybindingHint.js';
import { asCssVariable, contrastBorder, editorFindMatchForeground, editorFindMatchHighlightBorder, editorFindMatchHighlightForeground, editorFindRangeHighlightBorder, inputActiveOptionBackground, inputActiveOptionBorder, inputActiveOptionForeground } from '../../../../platform/theme/common/colorRegistry.js';
import { registerIcon, widgetClose } from '../../../../platform/theme/common/iconRegistry.js';
import { registerThemingParticipant } from '../../../../platform/theme/common/themeService.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { isHighContrast } from '../../../../platform/theme/common/theme.js';
import { assertReturnsDefined } from '../../../../base/common/types.js';
import { defaultInputBoxStyles, defaultToggleStyles } from '../../../../platform/theme/browser/defaultStyles.js';
import { createInstantHoverDelegate, getDefaultHoverDelegate } from '../../../../base/browser/ui/hover/hoverDelegateFactory.js';
const findCollapsedIcon = registerIcon('find-collapsed', Codicon.chevronRight, nls.localize('findCollapsedIcon', 'Icon to indicate that the editor find widget is collapsed.'));
const findExpandedIcon = registerIcon('find-expanded', Codicon.chevronDown, nls.localize('findExpandedIcon', 'Icon to indicate that the editor find widget is expanded.'));
export const findSelectionIcon = registerIcon('find-selection', Codicon.selection, nls.localize('findSelectionIcon', 'Icon for \'Find in Selection\' in the editor find widget.'));
export const findReplaceIcon = registerIcon('find-replace', Codicon.replace, nls.localize('findReplaceIcon', 'Icon for \'Replace\' in the editor find widget.'));
export const findReplaceAllIcon = registerIcon('find-replace-all', Codicon.replaceAll, nls.localize('findReplaceAllIcon', 'Icon for \'Replace All\' in the editor find widget.'));
export const findPreviousMatchIcon = registerIcon('find-previous-match', Codicon.arrowUp, nls.localize('findPreviousMatchIcon', 'Icon for \'Find Previous\' in the editor find widget.'));
export const findNextMatchIcon = registerIcon('find-next-match', Codicon.arrowDown, nls.localize('findNextMatchIcon', 'Icon for \'Find Next\' in the editor find widget.'));
const NLS_FIND_DIALOG_LABEL = nls.localize('label.findDialog', "Find / Replace");
const NLS_FIND_INPUT_LABEL = nls.localize('label.find', "Find");
const NLS_FIND_INPUT_PLACEHOLDER = nls.localize('placeholder.find', "Find");
const NLS_PREVIOUS_MATCH_BTN_LABEL = nls.localize('label.previousMatchButton', "Previous Match");
const NLS_NEXT_MATCH_BTN_LABEL = nls.localize('label.nextMatchButton', "Next Match");
const NLS_TOGGLE_SELECTION_FIND_TITLE = nls.localize('label.toggleSelectionFind', "Find in Selection");
const NLS_CLOSE_BTN_LABEL = nls.localize('label.closeButton', "Close");
const NLS_REPLACE_INPUT_LABEL = nls.localize('label.replace', "Replace");
const NLS_REPLACE_INPUT_PLACEHOLDER = nls.localize('placeholder.replace', "Replace");
const NLS_REPLACE_BTN_LABEL = nls.localize('label.replaceButton', "Replace");
const NLS_REPLACE_ALL_BTN_LABEL = nls.localize('label.replaceAllButton', "Replace All");
const NLS_TOGGLE_REPLACE_MODE_BTN_LABEL = nls.localize('label.toggleReplaceButton', "Toggle Replace");
const NLS_MATCHES_COUNT_LIMIT_TITLE = nls.localize('title.matchesCountLimit', "Only the first {0} results are highlighted, but all find operations work on the entire text.", MATCHES_LIMIT);
export const NLS_MATCHES_LOCATION = nls.localize('label.matchesLocation', "{0} of {1}");
export const NLS_NO_RESULTS = nls.localize('label.noResults', "No results");
const FIND_WIDGET_INITIAL_WIDTH = 419;
const PART_WIDTH = 275;
const FIND_INPUT_AREA_WIDTH = PART_WIDTH - 54;
let MAX_MATCHES_COUNT_WIDTH = 69;
// let FIND_ALL_CONTROLS_WIDTH = 17/** Find Input margin-left */ + (MAX_MATCHES_COUNT_WIDTH + 3 + 1) /** Match Results */ + 23 /** Button */ * 4 + 2/** sash */;
const FIND_INPUT_AREA_HEIGHT = 33; // The height of Find Widget when Replace Input is not visible.
const ctrlKeyMod = (platform.isMacintosh ? 256 /* KeyMod.WinCtrl */ : 2048 /* KeyMod.CtrlCmd */);
export class FindWidgetViewZone {
    constructor(afterLineNumber) {
        this.afterLineNumber = afterLineNumber;
        this.heightInPx = FIND_INPUT_AREA_HEIGHT;
        this.suppressMouseDown = false;
        this.domNode = document.createElement('div');
        this.domNode.className = 'dock-find-viewzone';
    }
}
function stopPropagationForMultiLineUpwards(event, value, textarea) {
    const isMultiline = !!value.match(/\n/);
    if (textarea && isMultiline && textarea.selectionStart > 0) {
        event.stopPropagation();
        return;
    }
}
function stopPropagationForMultiLineDownwards(event, value, textarea) {
    const isMultiline = !!value.match(/\n/);
    if (textarea && isMultiline && textarea.selectionEnd < textarea.value.length) {
        event.stopPropagation();
        return;
    }
}
export class FindWidget extends Widget {
    static { this.ID = 'editor.contrib.findWidget'; }
    constructor(codeEditor, controller, state, contextViewProvider, keybindingService, contextKeyService, _hoverService, _findWidgetSearchHistory, _replaceWidgetHistory) {
        super();
        this._hoverService = _hoverService;
        this._findWidgetSearchHistory = _findWidgetSearchHistory;
        this._replaceWidgetHistory = _replaceWidgetHistory;
        this._cachedHeight = null;
        this._revealTimeouts = [];
        this._codeEditor = codeEditor;
        this._controller = controller;
        this._state = state;
        this._contextViewProvider = contextViewProvider;
        this._keybindingService = keybindingService;
        this._contextKeyService = contextKeyService;
        this._isVisible = false;
        this._isReplaceVisible = false;
        this._ignoreChangeEvent = false;
        this._updateHistoryDelayer = new Delayer(500);
        this._register(toDisposable(() => this._updateHistoryDelayer.cancel()));
        this._register(this._state.onFindReplaceStateChange((e) => this._onStateChanged(e)));
        this._buildDomNode();
        this._updateButtons();
        this._tryUpdateWidgetWidth();
        this._findInput.inputBox.layout();
        this._register(this._codeEditor.onDidChangeConfiguration((e) => {
            if (e.hasChanged(103 /* EditorOption.readOnly */)) {
                if (this._codeEditor.getOption(103 /* EditorOption.readOnly */)) {
                    // Hide replace part if editor becomes read only
                    this._state.change({ isReplaceRevealed: false }, false);
                }
                this._updateButtons();
            }
            if (e.hasChanged(164 /* EditorOption.layoutInfo */)) {
                this._tryUpdateWidgetWidth();
            }
            if (e.hasChanged(2 /* EditorOption.accessibilitySupport */)) {
                this.updateAccessibilitySupport();
            }
            if (e.hasChanged(50 /* EditorOption.find */)) {
                const supportLoop = this._codeEditor.getOption(50 /* EditorOption.find */).loop;
                this._state.change({ loop: supportLoop }, false);
                const addExtraSpaceOnTop = this._codeEditor.getOption(50 /* EditorOption.find */).addExtraSpaceOnTop;
                if (addExtraSpaceOnTop && !this._viewZone) {
                    this._viewZone = new FindWidgetViewZone(0);
                    this._showViewZone();
                }
                if (!addExtraSpaceOnTop && this._viewZone) {
                    this._removeViewZone();
                }
            }
        }));
        this.updateAccessibilitySupport();
        this._register(this._codeEditor.onDidChangeCursorSelection(() => {
            if (this._isVisible) {
                this._updateToggleSelectionFindButton();
            }
        }));
        this._register(this._codeEditor.onDidFocusEditorWidget(async () => {
            if (this._isVisible) {
                const globalBufferTerm = await this._controller.getGlobalBufferTerm();
                if (globalBufferTerm && globalBufferTerm !== this._state.searchString) {
                    this._state.change({ searchString: globalBufferTerm }, false);
                    this._findInput.select();
                }
            }
        }));
        this._findInputFocused = CONTEXT_FIND_INPUT_FOCUSED.bindTo(contextKeyService);
        this._findFocusTracker = this._register(dom.trackFocus(this._findInput.inputBox.inputElement));
        this._register(this._findFocusTracker.onDidFocus(() => {
            this._findInputFocused.set(true);
            this._updateSearchScope();
        }));
        this._register(this._findFocusTracker.onDidBlur(() => {
            this._findInputFocused.set(false);
        }));
        this._replaceInputFocused = CONTEXT_REPLACE_INPUT_FOCUSED.bindTo(contextKeyService);
        this._replaceFocusTracker = this._register(dom.trackFocus(this._replaceInput.inputBox.inputElement));
        this._register(this._replaceFocusTracker.onDidFocus(() => {
            this._replaceInputFocused.set(true);
            this._updateSearchScope();
        }));
        this._register(this._replaceFocusTracker.onDidBlur(() => {
            this._replaceInputFocused.set(false);
        }));
        this._codeEditor.addOverlayWidget(this);
        if (this._codeEditor.getOption(50 /* EditorOption.find */).addExtraSpaceOnTop) {
            this._viewZone = new FindWidgetViewZone(0); // Put it before the first line then users can scroll beyond the first line.
        }
        this._register(this._codeEditor.onDidChangeModel(() => {
            if (!this._isVisible) {
                return;
            }
            this._viewZoneId = undefined;
        }));
        this._register(this._codeEditor.onDidScrollChange((e) => {
            if (e.scrollTopChanged) {
                this._layoutViewZone();
                return;
            }
            // for other scroll changes, layout the viewzone in next tick to avoid ruining current rendering.
            setTimeout(() => {
                this._layoutViewZone();
            }, 0);
        }));
    }
    // ----- IOverlayWidget API
    getId() {
        return FindWidget.ID;
    }
    getDomNode() {
        return this._domNode;
    }
    getPosition() {
        if (this._isVisible) {
            return {
                preference: 0 /* OverlayWidgetPositionPreference.TOP_RIGHT_CORNER */
            };
        }
        return null;
    }
    // ----- React to state changes
    _onStateChanged(e) {
        if (e.searchString) {
            try {
                this._ignoreChangeEvent = true;
                this._findInput.setValue(this._state.searchString);
            }
            finally {
                this._ignoreChangeEvent = false;
            }
            this._updateButtons();
        }
        if (e.replaceString) {
            this._replaceInput.inputBox.value = this._state.replaceString;
        }
        if (e.isRevealed) {
            if (this._state.isRevealed) {
                this._reveal();
            }
            else {
                this._hide(true);
            }
        }
        if (e.isReplaceRevealed) {
            if (this._state.isReplaceRevealed) {
                if (!this._codeEditor.getOption(103 /* EditorOption.readOnly */) && !this._isReplaceVisible) {
                    this._isReplaceVisible = true;
                    this._replaceInput.width = dom.getTotalWidth(this._findInput.domNode);
                    this._updateButtons();
                    this._replaceInput.inputBox.layout();
                }
            }
            else {
                if (this._isReplaceVisible) {
                    this._isReplaceVisible = false;
                    this._updateButtons();
                }
            }
        }
        if ((e.isRevealed || e.isReplaceRevealed) && (this._state.isRevealed || this._state.isReplaceRevealed)) {
            if (this._tryUpdateHeight()) {
                this._showViewZone();
            }
        }
        if (e.isRegex) {
            this._findInput.setRegex(this._state.isRegex);
        }
        if (e.wholeWord) {
            this._findInput.setWholeWords(this._state.wholeWord);
        }
        if (e.matchCase) {
            this._findInput.setCaseSensitive(this._state.matchCase);
        }
        if (e.preserveCase) {
            this._replaceInput.setPreserveCase(this._state.preserveCase);
        }
        if (e.searchScope) {
            if (this._state.searchScope) {
                this._toggleSelectionFind.checked = true;
            }
            else {
                this._toggleSelectionFind.checked = false;
            }
            this._updateToggleSelectionFindButton();
        }
        if (e.searchString || e.matchesCount || e.matchesPosition) {
            const showRedOutline = (this._state.searchString.length > 0 && this._state.matchesCount === 0);
            this._domNode.classList.toggle('no-results', showRedOutline);
            this._updateMatchesCount();
            this._updateButtons();
        }
        if (e.searchString || e.currentMatch) {
            this._layoutViewZone();
        }
        if (e.updateHistory) {
            this._delayedUpdateHistory();
        }
        if (e.loop) {
            this._updateButtons();
        }
    }
    _delayedUpdateHistory() {
        this._updateHistoryDelayer.trigger(this._updateHistory.bind(this)).then(undefined, onUnexpectedError);
    }
    _updateHistory() {
        if (this._state.searchString) {
            this._findInput.inputBox.addToHistory();
        }
        if (this._state.replaceString) {
            this._replaceInput.inputBox.addToHistory();
        }
    }
    _updateMatchesCount() {
        this._matchesCount.style.minWidth = MAX_MATCHES_COUNT_WIDTH + 'px';
        if (this._state.matchesCount >= MATCHES_LIMIT) {
            this._matchesCount.title = NLS_MATCHES_COUNT_LIMIT_TITLE;
        }
        else {
            this._matchesCount.title = '';
        }
        // remove previous content
        this._matchesCount.firstChild?.remove();
        let label;
        if (this._state.matchesCount > 0) {
            let matchesCount = String(this._state.matchesCount);
            if (this._state.matchesCount >= MATCHES_LIMIT) {
                matchesCount += '+';
            }
            let matchesPosition = String(this._state.matchesPosition);
            if (matchesPosition === '0') {
                matchesPosition = '?';
            }
            label = strings.format(NLS_MATCHES_LOCATION, matchesPosition, matchesCount);
        }
        else {
            label = NLS_NO_RESULTS;
        }
        this._matchesCount.appendChild(document.createTextNode(label));
        alertFn(this._getAriaLabel(label, this._state.currentMatch, this._state.searchString));
        MAX_MATCHES_COUNT_WIDTH = Math.max(MAX_MATCHES_COUNT_WIDTH, this._matchesCount.clientWidth);
    }
    // ----- actions
    _getAriaLabel(label, currentMatch, searchString) {
        if (label === NLS_NO_RESULTS) {
            return searchString === ''
                ? nls.localize('ariaSearchNoResultEmpty', "{0} found", label)
                : nls.localize('ariaSearchNoResult', "{0} found for '{1}'", label, searchString);
        }
        if (currentMatch) {
            const ariaLabel = nls.localize('ariaSearchNoResultWithLineNum', "{0} found for '{1}', at {2}", label, searchString, currentMatch.startLineNumber + ':' + currentMatch.startColumn);
            const model = this._codeEditor.getModel();
            if (model && (currentMatch.startLineNumber <= model.getLineCount()) && (currentMatch.startLineNumber >= 1)) {
                const lineContent = model.getLineContent(currentMatch.startLineNumber);
                return `${lineContent}, ${ariaLabel}`;
            }
            return ariaLabel;
        }
        return nls.localize('ariaSearchNoResultWithLineNumNoCurrentMatch', "{0} found for '{1}'", label, searchString);
    }
    /**
     * If 'selection find' is ON we should not disable the button (its function is to cancel 'selection find').
     * If 'selection find' is OFF we enable the button only if there is a selection.
     */
    _updateToggleSelectionFindButton() {
        const selection = this._codeEditor.getSelection();
        const isSelection = selection ? (selection.startLineNumber !== selection.endLineNumber || selection.startColumn !== selection.endColumn) : false;
        const isChecked = this._toggleSelectionFind.checked;
        if (this._isVisible && (isChecked || isSelection)) {
            this._toggleSelectionFind.enable();
        }
        else {
            this._toggleSelectionFind.disable();
        }
    }
    _updateButtons() {
        this._findInput.setEnabled(this._isVisible);
        this._replaceInput.setEnabled(this._isVisible && this._isReplaceVisible);
        this._updateToggleSelectionFindButton();
        this._closeBtn.setEnabled(this._isVisible);
        const findInputIsNonEmpty = (this._state.searchString.length > 0);
        const matchesCount = this._state.matchesCount ? true : false;
        this._prevBtn.setEnabled(this._isVisible && findInputIsNonEmpty && matchesCount && this._state.canNavigateBack());
        this._nextBtn.setEnabled(this._isVisible && findInputIsNonEmpty && matchesCount && this._state.canNavigateForward());
        this._replaceBtn.setEnabled(this._isVisible && this._isReplaceVisible && findInputIsNonEmpty);
        this._replaceAllBtn.setEnabled(this._isVisible && this._isReplaceVisible && findInputIsNonEmpty);
        this._domNode.classList.toggle('replaceToggled', this._isReplaceVisible);
        this._toggleReplaceBtn.setExpanded(this._isReplaceVisible);
        const canReplace = !this._codeEditor.getOption(103 /* EditorOption.readOnly */);
        this._toggleReplaceBtn.setEnabled(this._isVisible && canReplace);
    }
    _reveal() {
        this._revealTimeouts.forEach(e => {
            clearTimeout(e);
        });
        this._revealTimeouts = [];
        if (!this._isVisible) {
            this._isVisible = true;
            const selection = this._codeEditor.getSelection();
            switch (this._codeEditor.getOption(50 /* EditorOption.find */).autoFindInSelection) {
                case 'always':
                    this._toggleSelectionFind.checked = true;
                    break;
                case 'never':
                    this._toggleSelectionFind.checked = false;
                    break;
                case 'multiline': {
                    const isSelectionMultipleLine = !!selection && selection.startLineNumber !== selection.endLineNumber;
                    this._toggleSelectionFind.checked = isSelectionMultipleLine;
                    break;
                }
                default:
                    break;
            }
            this._tryUpdateWidgetWidth();
            this._updateButtons();
            this._revealTimeouts.push(setTimeout(() => {
                this._domNode.classList.add('visible');
                this._domNode.setAttribute('aria-hidden', 'false');
            }, 0));
            // validate query again as it's being dismissed when we hide the find widget.
            this._revealTimeouts.push(setTimeout(() => {
                this._findInput.validate();
            }, 200));
            this._codeEditor.layoutOverlayWidget(this);
            let adjustEditorScrollTop = true;
            if (this._codeEditor.getOption(50 /* EditorOption.find */).seedSearchStringFromSelection && selection) {
                const domNode = this._codeEditor.getDomNode();
                if (domNode) {
                    const editorCoords = dom.getDomNodePagePosition(domNode);
                    const startCoords = this._codeEditor.getScrolledVisiblePosition(selection.getStartPosition());
                    const startLeft = editorCoords.left + (startCoords ? startCoords.left : 0);
                    const startTop = startCoords ? startCoords.top : 0;
                    if (this._viewZone && startTop < this._viewZone.heightInPx) {
                        if (selection.endLineNumber > selection.startLineNumber) {
                            adjustEditorScrollTop = false;
                        }
                        const leftOfFindWidget = dom.getTopLeftOffset(this._domNode).left;
                        if (startLeft > leftOfFindWidget) {
                            adjustEditorScrollTop = false;
                        }
                        const endCoords = this._codeEditor.getScrolledVisiblePosition(selection.getEndPosition());
                        const endLeft = editorCoords.left + (endCoords ? endCoords.left : 0);
                        if (endLeft > leftOfFindWidget) {
                            adjustEditorScrollTop = false;
                        }
                    }
                }
            }
            this._showViewZone(adjustEditorScrollTop);
        }
    }
    _hide(focusTheEditor) {
        this._revealTimeouts.forEach(e => {
            clearTimeout(e);
        });
        this._revealTimeouts = [];
        if (this._isVisible) {
            this._isVisible = false;
            this._updateButtons();
            this._domNode.classList.remove('visible');
            this._domNode.setAttribute('aria-hidden', 'true');
            this._findInput.clearMessage();
            if (focusTheEditor) {
                this._codeEditor.focus();
            }
            this._codeEditor.layoutOverlayWidget(this);
            this._removeViewZone();
        }
    }
    _layoutViewZone(targetScrollTop) {
        const addExtraSpaceOnTop = this._codeEditor.getOption(50 /* EditorOption.find */).addExtraSpaceOnTop;
        if (!addExtraSpaceOnTop) {
            this._removeViewZone();
            return;
        }
        if (!this._isVisible) {
            return;
        }
        const viewZone = this._viewZone;
        if (this._viewZoneId !== undefined || !viewZone) {
            return;
        }
        this._codeEditor.changeViewZones((accessor) => {
            viewZone.heightInPx = this._getHeight();
            this._viewZoneId = accessor.addZone(viewZone);
            // scroll top adjust to make sure the editor doesn't scroll when adding viewzone at the beginning.
            this._codeEditor.setScrollTop(targetScrollTop || this._codeEditor.getScrollTop() + viewZone.heightInPx);
        });
    }
    _showViewZone(adjustScroll = true) {
        if (!this._isVisible) {
            return;
        }
        const addExtraSpaceOnTop = this._codeEditor.getOption(50 /* EditorOption.find */).addExtraSpaceOnTop;
        if (!addExtraSpaceOnTop) {
            return;
        }
        if (this._viewZone === undefined) {
            this._viewZone = new FindWidgetViewZone(0);
        }
        const viewZone = this._viewZone;
        this._codeEditor.changeViewZones((accessor) => {
            if (this._viewZoneId !== undefined) {
                // the view zone already exists, we need to update the height
                const newHeight = this._getHeight();
                if (newHeight === viewZone.heightInPx) {
                    return;
                }
                const scrollAdjustment = newHeight - viewZone.heightInPx;
                viewZone.heightInPx = newHeight;
                accessor.layoutZone(this._viewZoneId);
                if (adjustScroll) {
                    this._codeEditor.setScrollTop(this._codeEditor.getScrollTop() + scrollAdjustment);
                }
                return;
            }
            else {
                let scrollAdjustment = this._getHeight();
                // if the editor has top padding, factor that into the zone height
                scrollAdjustment -= this._codeEditor.getOption(95 /* EditorOption.padding */).top;
                if (scrollAdjustment <= 0) {
                    return;
                }
                viewZone.heightInPx = scrollAdjustment;
                this._viewZoneId = accessor.addZone(viewZone);
                if (adjustScroll) {
                    this._codeEditor.setScrollTop(this._codeEditor.getScrollTop() + scrollAdjustment);
                }
            }
        });
    }
    _removeViewZone() {
        this._codeEditor.changeViewZones((accessor) => {
            if (this._viewZoneId !== undefined) {
                accessor.removeZone(this._viewZoneId);
                this._viewZoneId = undefined;
                if (this._viewZone) {
                    this._codeEditor.setScrollTop(this._codeEditor.getScrollTop() - this._viewZone.heightInPx);
                    this._viewZone = undefined;
                }
            }
        });
    }
    _tryUpdateWidgetWidth() {
        if (!this._isVisible) {
            return;
        }
        if (!this._domNode.isConnected) {
            // the widget is not in the DOM
            return;
        }
        const layoutInfo = this._codeEditor.getLayoutInfo();
        const editorContentWidth = layoutInfo.contentWidth;
        if (editorContentWidth <= 0) {
            // for example, diff view original editor
            this._domNode.classList.add('hiddenEditor');
            return;
        }
        else if (this._domNode.classList.contains('hiddenEditor')) {
            this._domNode.classList.remove('hiddenEditor');
        }
        const editorWidth = layoutInfo.width;
        const minimapWidth = layoutInfo.minimap.minimapWidth;
        let collapsedFindWidget = false;
        let reducedFindWidget = false;
        let narrowFindWidget = false;
        if (this._resized) {
            const widgetWidth = dom.getTotalWidth(this._domNode);
            if (widgetWidth > FIND_WIDGET_INITIAL_WIDTH) {
                // as the widget is resized by users, we may need to change the max width of the widget as the editor width changes.
                this._domNode.style.maxWidth = `${editorWidth - 28 - minimapWidth - 15}px`;
                this._replaceInput.width = dom.getTotalWidth(this._findInput.domNode);
                return;
            }
        }
        if (FIND_WIDGET_INITIAL_WIDTH + 28 + minimapWidth >= editorWidth) {
            reducedFindWidget = true;
        }
        if (FIND_WIDGET_INITIAL_WIDTH + 28 + minimapWidth - MAX_MATCHES_COUNT_WIDTH >= editorWidth) {
            narrowFindWidget = true;
        }
        if (FIND_WIDGET_INITIAL_WIDTH + 28 + minimapWidth - MAX_MATCHES_COUNT_WIDTH >= editorWidth + 50) {
            collapsedFindWidget = true;
        }
        this._domNode.classList.toggle('collapsed-find-widget', collapsedFindWidget);
        this._domNode.classList.toggle('narrow-find-widget', narrowFindWidget);
        this._domNode.classList.toggle('reduced-find-widget', reducedFindWidget);
        if (!narrowFindWidget && !collapsedFindWidget) {
            // the minimal left offset of findwidget is 15px.
            this._domNode.style.maxWidth = `${editorWidth - 28 - minimapWidth - 15}px`;
        }
        this._findInput.layout({ collapsedFindWidget, narrowFindWidget, reducedFindWidget });
        if (this._resized) {
            const findInputWidth = this._findInput.inputBox.element.clientWidth;
            if (findInputWidth > 0) {
                this._replaceInput.width = findInputWidth;
            }
        }
        else if (this._isReplaceVisible) {
            this._replaceInput.width = dom.getTotalWidth(this._findInput.domNode);
        }
    }
    _getHeight() {
        let totalheight = 0;
        // find input margin top
        totalheight += 4;
        // find input height
        totalheight += this._findInput.inputBox.height + 2 /** input box border */;
        if (this._isReplaceVisible) {
            // replace input margin
            totalheight += 4;
            totalheight += this._replaceInput.inputBox.height + 2 /** input box border */;
        }
        // margin bottom
        totalheight += 4;
        return totalheight;
    }
    _tryUpdateHeight() {
        const totalHeight = this._getHeight();
        if (this._cachedHeight !== null && this._cachedHeight === totalHeight) {
            return false;
        }
        this._cachedHeight = totalHeight;
        this._domNode.style.height = `${totalHeight}px`;
        return true;
    }
    // ----- Public
    focusFindInput() {
        this._findInput.select();
        // Edge browser requires focus() in addition to select()
        this._findInput.focus();
    }
    focusReplaceInput() {
        this._replaceInput.select();
        // Edge browser requires focus() in addition to select()
        this._replaceInput.focus();
    }
    highlightFindOptions() {
        this._findInput.highlightFindOptions();
    }
    _updateSearchScope() {
        if (!this._codeEditor.hasModel()) {
            return;
        }
        if (this._toggleSelectionFind.checked) {
            const selections = this._codeEditor.getSelections();
            selections.map(selection => {
                if (selection.endColumn === 1 && selection.endLineNumber > selection.startLineNumber) {
                    selection = selection.setEndPosition(selection.endLineNumber - 1, this._codeEditor.getModel().getLineMaxColumn(selection.endLineNumber - 1));
                }
                const currentMatch = this._state.currentMatch;
                if (selection.startLineNumber !== selection.endLineNumber) {
                    if (!Range.equalsRange(selection, currentMatch)) {
                        return selection;
                    }
                }
                return null;
            }).filter(element => !!element);
            if (selections.length) {
                this._state.change({ searchScope: selections }, true);
            }
        }
    }
    _onFindInputMouseDown(e) {
        // on linux, middle key does pasting.
        if (e.middleButton) {
            e.stopPropagation();
        }
    }
    _onFindInputKeyDown(e) {
        if (e.equals(ctrlKeyMod | 3 /* KeyCode.Enter */)) {
            if (this._keybindingService.dispatchEvent(e, e.target)) {
                e.preventDefault();
                return;
            }
            else {
                this._findInput.inputBox.insertAtCursor('\n');
                e.preventDefault();
                return;
            }
        }
        if (e.equals(2 /* KeyCode.Tab */)) {
            if (this._isReplaceVisible) {
                this._replaceInput.focus();
            }
            else {
                this._findInput.focusOnCaseSensitive();
            }
            e.preventDefault();
            return;
        }
        if (e.equals(2048 /* KeyMod.CtrlCmd */ | 18 /* KeyCode.DownArrow */)) {
            this._codeEditor.focus();
            e.preventDefault();
            return;
        }
        if (e.equals(16 /* KeyCode.UpArrow */)) {
            return stopPropagationForMultiLineUpwards(e, this._findInput.getValue(), this._findInput.domNode.querySelector('textarea'));
        }
        if (e.equals(18 /* KeyCode.DownArrow */)) {
            return stopPropagationForMultiLineDownwards(e, this._findInput.getValue(), this._findInput.domNode.querySelector('textarea'));
        }
    }
    _onReplaceInputKeyDown(e) {
        if (e.equals(ctrlKeyMod | 3 /* KeyCode.Enter */)) {
            if (this._keybindingService.dispatchEvent(e, e.target)) {
                e.preventDefault();
                return;
            }
            else {
                this._replaceInput.inputBox.insertAtCursor('\n');
                e.preventDefault();
                return;
            }
        }
        if (e.equals(2 /* KeyCode.Tab */)) {
            this._findInput.focusOnCaseSensitive();
            e.preventDefault();
            return;
        }
        if (e.equals(1024 /* KeyMod.Shift */ | 2 /* KeyCode.Tab */)) {
            this._findInput.focus();
            e.preventDefault();
            return;
        }
        if (e.equals(2048 /* KeyMod.CtrlCmd */ | 18 /* KeyCode.DownArrow */)) {
            this._codeEditor.focus();
            e.preventDefault();
            return;
        }
        if (e.equals(16 /* KeyCode.UpArrow */)) {
            return stopPropagationForMultiLineUpwards(e, this._replaceInput.inputBox.value, this._replaceInput.inputBox.element.querySelector('textarea'));
        }
        if (e.equals(18 /* KeyCode.DownArrow */)) {
            return stopPropagationForMultiLineDownwards(e, this._replaceInput.inputBox.value, this._replaceInput.inputBox.element.querySelector('textarea'));
        }
    }
    // ----- sash
    getVerticalSashLeft(_sash) {
        return 0;
    }
    // ----- initialization
    _keybindingLabelFor(actionId) {
        const kb = this._keybindingService.lookupKeybinding(actionId);
        if (!kb) {
            return '';
        }
        return ` (${kb.getLabel()})`;
    }
    _buildDomNode() {
        const flexibleHeight = true;
        const flexibleWidth = true;
        // Find input
        const findSearchHistoryConfig = this._codeEditor.getOption(50 /* EditorOption.find */).history;
        const replaceHistoryConfig = this._codeEditor.getOption(50 /* EditorOption.find */).replaceHistory;
        this._findInput = this._register(new ContextScopedFindInput(null, this._contextViewProvider, {
            width: FIND_INPUT_AREA_WIDTH,
            label: NLS_FIND_INPUT_LABEL,
            placeholder: NLS_FIND_INPUT_PLACEHOLDER,
            appendCaseSensitiveLabel: this._keybindingLabelFor(FIND_IDS.ToggleCaseSensitiveCommand),
            appendWholeWordsLabel: this._keybindingLabelFor(FIND_IDS.ToggleWholeWordCommand),
            appendRegexLabel: this._keybindingLabelFor(FIND_IDS.ToggleRegexCommand),
            validation: (value) => {
                if (value.length === 0 || !this._findInput.getRegex()) {
                    return null;
                }
                try {
                    // use `g` and `u` which are also used by the TextModel search
                    new RegExp(value, 'gu');
                    return null;
                }
                catch (e) {
                    return { content: e.message };
                }
            },
            flexibleHeight,
            flexibleWidth,
            flexibleMaxHeight: 118,
            showCommonFindToggles: true,
            showHistoryHint: () => showHistoryKeybindingHint(this._keybindingService),
            inputBoxStyles: defaultInputBoxStyles,
            toggleStyles: defaultToggleStyles,
            history: findSearchHistoryConfig === 'workspace' ? this._findWidgetSearchHistory : new Set([]),
        }, this._contextKeyService));
        this._findInput.setRegex(!!this._state.isRegex);
        this._findInput.setCaseSensitive(!!this._state.matchCase);
        this._findInput.setWholeWords(!!this._state.wholeWord);
        this._register(this._findInput.onKeyDown((e) => {
            if (e.equals(3 /* KeyCode.Enter */) && !this._codeEditor.getOption(50 /* EditorOption.find */).findOnType) {
                this._state.change({ searchString: this._findInput.getValue() }, true);
            }
            this._onFindInputKeyDown(e);
        }));
        this._register(this._findInput.inputBox.onDidChange(() => {
            if (this._ignoreChangeEvent || !this._codeEditor.getOption(50 /* EditorOption.find */).findOnType) {
                return;
            }
            this._state.change({ searchString: this._findInput.getValue() }, true);
        }));
        this._register(this._findInput.onDidOptionChange(() => {
            this._state.change({
                isRegex: this._findInput.getRegex(),
                wholeWord: this._findInput.getWholeWords(),
                matchCase: this._findInput.getCaseSensitive()
            }, true);
        }));
        this._register(this._findInput.onCaseSensitiveKeyDown((e) => {
            if (e.equals(1024 /* KeyMod.Shift */ | 2 /* KeyCode.Tab */)) {
                if (this._isReplaceVisible) {
                    this._replaceInput.focus();
                    e.preventDefault();
                }
            }
        }));
        this._register(this._findInput.onRegexKeyDown((e) => {
            if (e.equals(2 /* KeyCode.Tab */)) {
                if (this._isReplaceVisible) {
                    this._replaceInput.focusOnPreserve();
                    e.preventDefault();
                }
            }
        }));
        this._register(this._findInput.inputBox.onDidHeightChange((e) => {
            if (this._tryUpdateHeight()) {
                this._showViewZone();
            }
        }));
        if (platform.isLinux) {
            this._register(this._findInput.onMouseDown((e) => this._onFindInputMouseDown(e)));
        }
        this._matchesCount = document.createElement('div');
        this._matchesCount.className = 'matchesCount';
        this._updateMatchesCount();
        // Create a scoped hover delegate for all find related buttons
        const hoverDelegate = this._register(createInstantHoverDelegate());
        // Previous button
        this._prevBtn = this._register(new SimpleButton({
            label: NLS_PREVIOUS_MATCH_BTN_LABEL + this._keybindingLabelFor(FIND_IDS.PreviousMatchFindAction),
            icon: findPreviousMatchIcon,
            hoverDelegate,
            onTrigger: () => {
                assertReturnsDefined(this._codeEditor.getAction(FIND_IDS.PreviousMatchFindAction)).run().then(undefined, onUnexpectedError);
            }
        }, this._hoverService));
        // Next button
        this._nextBtn = this._register(new SimpleButton({
            label: NLS_NEXT_MATCH_BTN_LABEL + this._keybindingLabelFor(FIND_IDS.NextMatchFindAction),
            icon: findNextMatchIcon,
            hoverDelegate,
            onTrigger: () => {
                assertReturnsDefined(this._codeEditor.getAction(FIND_IDS.NextMatchFindAction)).run().then(undefined, onUnexpectedError);
            }
        }, this._hoverService));
        const findPart = document.createElement('div');
        findPart.className = 'find-part';
        findPart.appendChild(this._findInput.domNode);
        const actionsContainer = document.createElement('div');
        actionsContainer.className = 'find-actions';
        findPart.appendChild(actionsContainer);
        actionsContainer.appendChild(this._matchesCount);
        actionsContainer.appendChild(this._prevBtn.domNode);
        actionsContainer.appendChild(this._nextBtn.domNode);
        // Toggle selection button
        this._toggleSelectionFind = this._register(new Toggle({
            icon: findSelectionIcon,
            title: NLS_TOGGLE_SELECTION_FIND_TITLE + this._keybindingLabelFor(FIND_IDS.ToggleSearchScopeCommand),
            isChecked: false,
            hoverDelegate: hoverDelegate,
            inputActiveOptionBackground: asCssVariable(inputActiveOptionBackground),
            inputActiveOptionBorder: asCssVariable(inputActiveOptionBorder),
            inputActiveOptionForeground: asCssVariable(inputActiveOptionForeground),
        }));
        this._register(this._toggleSelectionFind.onChange(() => {
            if (this._toggleSelectionFind.checked) {
                if (this._codeEditor.hasModel()) {
                    let selections = this._codeEditor.getSelections();
                    selections = selections.map(selection => {
                        if (selection.endColumn === 1 && selection.endLineNumber > selection.startLineNumber) {
                            selection = selection.setEndPosition(selection.endLineNumber - 1, this._codeEditor.getModel().getLineMaxColumn(selection.endLineNumber - 1));
                        }
                        if (!selection.isEmpty()) {
                            return selection;
                        }
                        return null;
                    }).filter((element) => !!element);
                    if (selections.length) {
                        this._state.change({ searchScope: selections }, true);
                    }
                }
            }
            else {
                this._state.change({ searchScope: null }, true);
            }
        }));
        actionsContainer.appendChild(this._toggleSelectionFind.domNode);
        // Close button
        this._closeBtn = this._register(new SimpleButton({
            label: NLS_CLOSE_BTN_LABEL + this._keybindingLabelFor(FIND_IDS.CloseFindWidgetCommand),
            icon: widgetClose,
            hoverDelegate,
            onTrigger: () => {
                this._state.change({ isRevealed: false, searchScope: null }, false);
            },
            onKeyDown: (e) => {
                if (e.equals(2 /* KeyCode.Tab */)) {
                    if (this._isReplaceVisible) {
                        if (this._replaceBtn.isEnabled()) {
                            this._replaceBtn.focus();
                        }
                        else {
                            this._codeEditor.focus();
                        }
                        e.preventDefault();
                    }
                }
            }
        }, this._hoverService));
        // Replace input
        this._replaceInput = this._register(new ContextScopedReplaceInput(null, undefined, {
            label: NLS_REPLACE_INPUT_LABEL,
            placeholder: NLS_REPLACE_INPUT_PLACEHOLDER,
            appendPreserveCaseLabel: this._keybindingLabelFor(FIND_IDS.TogglePreserveCaseCommand),
            history: replaceHistoryConfig === 'workspace' ? this._replaceWidgetHistory : new Set([]),
            flexibleHeight,
            flexibleWidth,
            flexibleMaxHeight: 118,
            showHistoryHint: () => showHistoryKeybindingHint(this._keybindingService),
            inputBoxStyles: defaultInputBoxStyles,
            toggleStyles: defaultToggleStyles,
        }, this._contextKeyService, true));
        this._replaceInput.setPreserveCase(!!this._state.preserveCase);
        this._register(this._replaceInput.onKeyDown((e) => this._onReplaceInputKeyDown(e)));
        this._register(this._replaceInput.inputBox.onDidChange(() => {
            this._state.change({ replaceString: this._replaceInput.inputBox.value }, false);
        }));
        this._register(this._replaceInput.inputBox.onDidHeightChange((e) => {
            if (this._isReplaceVisible && this._tryUpdateHeight()) {
                this._showViewZone();
            }
        }));
        this._register(this._replaceInput.onDidOptionChange(() => {
            this._state.change({
                preserveCase: this._replaceInput.getPreserveCase()
            }, true);
        }));
        this._register(this._replaceInput.onPreserveCaseKeyDown((e) => {
            if (e.equals(2 /* KeyCode.Tab */)) {
                if (this._prevBtn.isEnabled()) {
                    this._prevBtn.focus();
                }
                else if (this._nextBtn.isEnabled()) {
                    this._nextBtn.focus();
                }
                else if (this._toggleSelectionFind.enabled) {
                    this._toggleSelectionFind.focus();
                }
                else if (this._closeBtn.isEnabled()) {
                    this._closeBtn.focus();
                }
                e.preventDefault();
            }
        }));
        // Create scoped hover delegate for replace actions
        const replaceHoverDelegate = this._register(createInstantHoverDelegate());
        // Replace one button
        this._replaceBtn = this._register(new SimpleButton({
            label: NLS_REPLACE_BTN_LABEL + this._keybindingLabelFor(FIND_IDS.ReplaceOneAction),
            icon: findReplaceIcon,
            hoverDelegate: replaceHoverDelegate,
            onTrigger: () => {
                this._controller.replace();
            },
            onKeyDown: (e) => {
                if (e.equals(1024 /* KeyMod.Shift */ | 2 /* KeyCode.Tab */)) {
                    this._closeBtn.focus();
                    e.preventDefault();
                }
            }
        }, this._hoverService));
        // Replace all button
        this._replaceAllBtn = this._register(new SimpleButton({
            label: NLS_REPLACE_ALL_BTN_LABEL + this._keybindingLabelFor(FIND_IDS.ReplaceAllAction),
            icon: findReplaceAllIcon,
            hoverDelegate: replaceHoverDelegate,
            onTrigger: () => {
                this._controller.replaceAll();
            }
        }, this._hoverService));
        const replacePart = document.createElement('div');
        replacePart.className = 'replace-part';
        replacePart.appendChild(this._replaceInput.domNode);
        const replaceActionsContainer = document.createElement('div');
        replaceActionsContainer.className = 'replace-actions';
        replacePart.appendChild(replaceActionsContainer);
        replaceActionsContainer.appendChild(this._replaceBtn.domNode);
        replaceActionsContainer.appendChild(this._replaceAllBtn.domNode);
        // Toggle replace button
        this._toggleReplaceBtn = this._register(new SimpleButton({
            label: NLS_TOGGLE_REPLACE_MODE_BTN_LABEL,
            className: 'codicon toggle left',
            onTrigger: () => {
                this._state.change({ isReplaceRevealed: !this._isReplaceVisible }, false);
                if (this._isReplaceVisible) {
                    this._replaceInput.width = dom.getTotalWidth(this._findInput.domNode);
                    this._replaceInput.inputBox.layout();
                }
                this._showViewZone();
            }
        }, this._hoverService));
        this._toggleReplaceBtn.setExpanded(this._isReplaceVisible);
        // Widget
        this._domNode = document.createElement('div');
        this._domNode.className = 'editor-widget find-widget';
        this._domNode.setAttribute('aria-hidden', 'true');
        this._domNode.ariaLabel = NLS_FIND_DIALOG_LABEL;
        this._domNode.role = 'dialog';
        // We need to set this explicitly, otherwise on IE11, the width inheritence of flex doesn't work.
        this._domNode.style.width = `${FIND_WIDGET_INITIAL_WIDTH}px`;
        this._domNode.appendChild(this._toggleReplaceBtn.domNode);
        this._domNode.appendChild(findPart);
        this._domNode.appendChild(this._closeBtn.domNode);
        this._domNode.appendChild(replacePart);
        this._resizeSash = this._register(new Sash(this._domNode, this, { orientation: 0 /* Orientation.VERTICAL */, size: 2 }));
        this._resized = false;
        let originalWidth = FIND_WIDGET_INITIAL_WIDTH;
        this._register(this._resizeSash.onDidStart(() => {
            originalWidth = dom.getTotalWidth(this._domNode);
        }));
        this._register(this._resizeSash.onDidChange((evt) => {
            this._resized = true;
            const width = originalWidth + evt.startX - evt.currentX;
            if (width < FIND_WIDGET_INITIAL_WIDTH) {
                // narrow down the find widget should be handled by CSS.
                return;
            }
            const maxWidth = parseFloat(dom.getComputedStyle(this._domNode).maxWidth) || 0;
            if (width > maxWidth) {
                return;
            }
            this._domNode.style.width = `${width}px`;
            if (this._isReplaceVisible) {
                this._replaceInput.width = dom.getTotalWidth(this._findInput.domNode);
            }
            this._findInput.inputBox.layout();
            this._tryUpdateHeight();
        }));
        this._register(this._resizeSash.onDidReset(() => {
            // users double click on the sash
            const currentWidth = dom.getTotalWidth(this._domNode);
            if (currentWidth < FIND_WIDGET_INITIAL_WIDTH) {
                // The editor is narrow and the width of the find widget is controlled fully by CSS.
                return;
            }
            let width = FIND_WIDGET_INITIAL_WIDTH;
            if (!this._resized || currentWidth === FIND_WIDGET_INITIAL_WIDTH) {
                // 1. never resized before, double click should maximizes it
                // 2. users resized it already but its width is the same as default
                const layoutInfo = this._codeEditor.getLayoutInfo();
                width = layoutInfo.width - 28 - layoutInfo.minimap.minimapWidth - 15;
                this._resized = true;
            }
            else {
                /**
                 * no op, the find widget should be shrinked to its default size.
                 */
            }
            this._domNode.style.width = `${width}px`;
            if (this._isReplaceVisible) {
                this._replaceInput.width = dom.getTotalWidth(this._findInput.domNode);
            }
            this._findInput.inputBox.layout();
        }));
    }
    updateAccessibilitySupport() {
        const value = this._codeEditor.getOption(2 /* EditorOption.accessibilitySupport */);
        this._findInput.setFocusInputOnOptionClick(value !== 2 /* AccessibilitySupport.Enabled */);
    }
    getViewState() {
        let widgetViewZoneVisible = false;
        if (this._viewZone && this._viewZoneId) {
            widgetViewZoneVisible = this._viewZone.heightInPx > this._codeEditor.getScrollTop();
        }
        return {
            widgetViewZoneVisible,
            scrollTop: this._codeEditor.getScrollTop()
        };
    }
    setViewState(state) {
        if (!state) {
            return;
        }
        if (state.widgetViewZoneVisible) {
            // we should add the view zone
            this._layoutViewZone(state.scrollTop);
        }
    }
}
export class SimpleButton extends Widget {
    constructor(opts, hoverService) {
        super();
        this._opts = opts;
        let className = 'button';
        if (this._opts.className) {
            className = className + ' ' + this._opts.className;
        }
        if (this._opts.icon) {
            className = className + ' ' + ThemeIcon.asClassName(this._opts.icon);
        }
        this._domNode = document.createElement('div');
        this._domNode.tabIndex = 0;
        this._domNode.className = className;
        this._domNode.setAttribute('role', 'button');
        this._domNode.setAttribute('aria-label', this._opts.label);
        this._register(hoverService.setupManagedHover(opts.hoverDelegate ?? getDefaultHoverDelegate('element'), this._domNode, this._opts.label));
        this.onclick(this._domNode, (e) => {
            this._opts.onTrigger();
            e.preventDefault();
        });
        this.onkeydown(this._domNode, (e) => {
            if (e.equals(10 /* KeyCode.Space */) || e.equals(3 /* KeyCode.Enter */)) {
                this._opts.onTrigger();
                e.preventDefault();
                return;
            }
            this._opts.onKeyDown?.(e);
        });
    }
    get domNode() {
        return this._domNode;
    }
    isEnabled() {
        return (this._domNode.tabIndex >= 0);
    }
    focus() {
        this._domNode.focus();
    }
    setEnabled(enabled) {
        this._domNode.classList.toggle('disabled', !enabled);
        this._domNode.setAttribute('aria-disabled', String(!enabled));
        this._domNode.tabIndex = enabled ? 0 : -1;
    }
    setExpanded(expanded) {
        this._domNode.setAttribute('aria-expanded', String(!!expanded));
        if (expanded) {
            this._domNode.classList.remove(...ThemeIcon.asClassNameArray(findCollapsedIcon));
            this._domNode.classList.add(...ThemeIcon.asClassNameArray(findExpandedIcon));
        }
        else {
            this._domNode.classList.remove(...ThemeIcon.asClassNameArray(findExpandedIcon));
            this._domNode.classList.add(...ThemeIcon.asClassNameArray(findCollapsedIcon));
        }
    }
}
// theming
registerThemingParticipant((theme, collector) => {
    const findMatchHighlightBorder = theme.getColor(editorFindMatchHighlightBorder);
    if (findMatchHighlightBorder) {
        collector.addRule(`.monaco-editor .findMatch { border: 1px ${isHighContrast(theme.type) ? 'dotted' : 'solid'} ${findMatchHighlightBorder}; box-sizing: border-box; }`);
    }
    const findRangeHighlightBorder = theme.getColor(editorFindRangeHighlightBorder);
    if (findRangeHighlightBorder) {
        collector.addRule(`.monaco-editor .findScope { border: 1px ${isHighContrast(theme.type) ? 'dashed' : 'solid'} ${findRangeHighlightBorder}; }`);
    }
    const hcBorder = theme.getColor(contrastBorder);
    if (hcBorder) {
        collector.addRule(`.monaco-editor .find-widget { border: 1px solid ${hcBorder}; }`);
    }
    const findMatchForeground = theme.getColor(editorFindMatchForeground);
    if (findMatchForeground) {
        collector.addRule(`.monaco-editor .findMatchInline { color: ${findMatchForeground}; }`);
    }
    const findMatchHighlightForeground = theme.getColor(editorFindMatchHighlightForeground);
    if (findMatchHighlightForeground) {
        collector.addRule(`.monaco-editor .currentFindMatchInline { color: ${findMatchHighlightForeground}; }`);
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmluZFdpZGdldC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL2FkdmlrYXIvRG9jdW1lbnRzL2FyY2hpdGVjdC9hcmNoMi9BcmNoSURFL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL2ZpbmQvYnJvd3Nlci9maW5kV2lkZ2V0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0saUNBQWlDLENBQUM7QUFHdkQsT0FBTyxFQUFFLEtBQUssSUFBSSxPQUFPLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUM1RSxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sOENBQThDLENBQUM7QUFLdEUsT0FBTyxFQUF3RCxJQUFJLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUN0SCxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDL0QsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQzNELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUM5RCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUV0RSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDcEUsT0FBTyxLQUFLLFFBQVEsTUFBTSxxQ0FBcUMsQ0FBQztBQUNoRSxPQUFPLEtBQUssT0FBTyxNQUFNLG9DQUFvQyxDQUFDO0FBQzlELE9BQU8sa0JBQWtCLENBQUM7QUFHMUIsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQ3RELE9BQU8sRUFBRSwwQkFBMEIsRUFBRSw2QkFBNkIsRUFBRSxRQUFRLEVBQUUsYUFBYSxFQUFFLE1BQU0sZ0JBQWdCLENBQUM7QUFFcEgsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQztBQUUxQyxPQUFPLEVBQUUsc0JBQXNCLEVBQUUseUJBQXlCLEVBQUUs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