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
import { addDisposableListener, getActiveWindow, isHTMLElement } from '../../../../../base/browser/dom.js';
import { createTrustedTypesPolicy } from '../../../../../base/browser/trustedTypes.js';
import { IAccessibilityService } from '../../../../../platform/accessibility/common/accessibility.js';
import { EditorFontLigatures } from '../../../../common/config/editorOptions.js';
import { Range } from '../../../../common/core/range.js';
import { Selection } from '../../../../common/core/selection.js';
import { StringBuilder } from '../../../../common/core/stringBuilder.js';
import { LineDecoration } from '../../../../common/viewLayout/lineDecorations.js';
import { RenderLineInput, renderViewLine } from '../../../../common/viewLayout/viewLineRenderer.js';
import { Disposable, MutableDisposable } from '../../../../../base/common/lifecycle.js';
import { IME } from '../../../../../base/common/ime.js';
import { getColumnOfNodeOffset } from '../../../viewParts/viewLines/viewLine.js';
const ttPolicy = createTrustedTypesPolicy('richScreenReaderContent', { createHTML: value => value });
const LINE_NUMBER_ATTRIBUTE = 'data-line-number';
let RichScreenReaderContent = class RichScreenReaderContent extends Disposable {
    constructor(_domNode, _context, _viewController, _accessibilityService) {
        super();
        this._domNode = _domNode;
        this._context = _context;
        this._viewController = _viewController;
        this._accessibilityService = _accessibilityService;
        this._selectionChangeListener = this._register(new MutableDisposable());
        this._accessibilityPageSize = 1;
        this._ignoreSelectionChangeTime = 0;
        this._state = new RichScreenReaderState([]);
        this._strategy = new RichPagedScreenReaderStrategy();
        this._renderedLines = new Map();
        this._renderedSelection = new Selection(1, 1, 1, 1);
        this.onConfigurationChanged(this._context.configuration.options);
    }
    updateScreenReaderContent(primarySelection) {
        const focusedElement = getActiveWindow().document.activeElement;
        if (!focusedElement || focusedElement !== this._domNode.domNode) {
            return;
        }
        const isScreenReaderOptimized = this._accessibilityService.isScreenReaderOptimized();
        if (isScreenReaderOptimized) {
            const state = this._getScreenReaderContentLineIntervals(primarySelection);
            if (!this._state.equals(state)) {
                this._state = state;
                this._renderedLines = this._renderScreenReaderContent(state);
            }
            if (!this._renderedSelection.equalsSelection(primarySelection)) {
                this._renderedSelection = primarySelection;
                this._setSelectionOnScreenReaderContent(this._context, this._renderedLines, primarySelection);
            }
        }
        else {
            this._state = new RichScreenReaderState([]);
            this._setIgnoreSelectionChangeTime('setValue');
            this._domNode.domNode.textContent = '';
        }
    }
    updateScrollTop(primarySelection) {
        const intervals = this._state.intervals;
        if (!intervals.length) {
            return;
        }
        const viewLayout = this._context.viewModel.viewLayout;
        const stateStartLineNumber = intervals[0].startLine;
        const verticalOffsetOfStateStartLineNumber = viewLayout.getVerticalOffsetForLineNumber(stateStartLineNumber);
        const verticalOffsetOfPositionLineNumber = viewLayout.getVerticalOffsetForLineNumber(primarySelection.positionLineNumber);
        this._domNode.domNode.scrollTop = verticalOffsetOfPositionLineNumber - verticalOffsetOfStateStartLineNumber;
    }
    onFocusChange(newFocusValue) {
        if (newFocusValue) {
            this._selectionChangeListener.value = this._setSelectionChangeListener();
        }
        else {
            this._selectionChangeListener.value = undefined;
        }
    }
    onConfigurationChanged(options) {
        this._accessibilityPageSize = options.get(3 /* EditorOption.accessibilityPageSize */);
    }
    onWillCut() {
        this._setIgnoreSelectionChangeTime('onCut');
    }
    onWillPaste() {
        this._setIgnoreSelectionChangeTime('onWillPaste');
    }
    // --- private methods
    _setIgnoreSelectionChangeTime(reason) {
        this._ignoreSelectionChangeTime = Date.now();
    }
    _setSelectionChangeListener() {
        // See https://github.com/microsoft/vscode/issues/27216 and https://github.com/microsoft/vscode/issues/98256
        // When using a Braille display or NVDA for example, it is possible for users to reposition the
        // system caret. This is reflected in Chrome as a `selectionchange` event and needs to be reflected within the editor.
        // `selectionchange` events often come multiple times for a single logical change
        // so throttle multiple `selectionchange` events that burst in a short period of time.
        let previousSelectionChangeEventTime = 0;
        return addDisposableListener(this._domNode.domNode.ownerDocument, 'selectionchange', () => {
            const activeElement = getActiveWindow().document.activeElement;
            const isFocused = activeElement === this._domNode.domNode;
            if (!isFocused) {
                return;
            }
            const isScreenReaderOptimized = this._accessibilityService.isScreenReaderOptimized();
            if (!isScreenReaderOptimized || !IME.enabled) {
                return;
            }
            const now = Date.now();
            const delta1 = now - previousSelectionChangeEventTime;
            previousSelectionChangeEventTime = now;
            if (delta1 < 5) {
                // received another `selectionchange` event within 5ms of the previous `selectionchange` event
                // => ignore it
                return;
            }
            const delta2 = now - this._ignoreSelectionChangeTime;
            this._ignoreSelectionChangeTime = 0;
            if (delta2 < 100) {
                // received a `selectionchange` event within 100ms since we touched the hidden div
                // => ignore it, since we caused it
                return;
            }
            const selection = this._getEditorSelectionFromDomRange();
            if (!selection) {
                return;
            }
            this._viewController.setSelection(selection);
        });
    }
    _renderScreenReaderContent(state) {
        const nodes = [];
        const renderedLines = new Map();
        for (const interval of state.intervals) {
            for (let lineNumber = interval.startLine; lineNumber <= interval.endLine; lineNumber++) {
                const renderedLine = this._renderLine(lineNumber);
                renderedLines.set(lineNumber, renderedLine);
                nodes.push(renderedLine.domNode);
            }
        }
        this._setIgnoreSelectionChangeTime('setValue');
        this._domNode.domNode.replaceChildren(...nodes);
        return renderedLines;
    }
    _renderLine(viewLineNumber) {
        const viewModel = this._context.viewModel;
        const positionLineData = viewModel.getViewLineRenderingData(viewLineNumber);
        const options = this._context.configuration.options;
        const fontInfo = options.get(59 /* EditorOption.fontInfo */);
        const stopRenderingLineAfter = options.get(132 /* EditorOption.stopRenderingLineAfter */);
        const renderControlCharacters = options.get(107 /* EditorOption.renderControlCharacters */);
        const fontLigatures = options.get(60 /* EditorOption.fontLigatures */);
        const disableMonospaceOptimizations = options.get(40 /* EditorOption.disableMonospaceOptimizations */);
        const lineDecorations = LineDecoration.filter(positionLineData.inlineDecorations, viewLineNumber, positionLineData.minColumn, positionLineData.maxColumn);
        const useMonospaceOptimizations = fontInfo.isMonospace && !disableMonospaceOptimizations;
        const useFontLigatures = fontLigatures !== EditorFontLigatures.OFF;
        let renderWhitespace;
        const experimentalWhitespaceRendering = options.get(47 /* EditorOption.experimentalWhitespaceRendering */);
        if (experimentalWhitespaceRendering === 'off') {
            renderWhitespace = options.get(112 /* EditorOption.renderWhitespace */);
        }
        else {
            renderWhitespace = 'none';
        }
        const renderLineInput = new RenderLineInput(useMonospaceOptimizations, fontInfo.canUseHalfwidthRightwardsArrow, positionLineData.content, positionLineData.continuesWithWrappedLine, positionLineData.isBasicASCII, positionLineData.containsRTL, positionLineData.minColumn - 1, positionLineData.tokens, lineDecorations, positionLineData.tabSize, positionLineData.startVisibleColumn, fontInfo.spaceWidth, fontInfo.middotWidth, fontInfo.wsmiddotWidth, stopRenderingLineAfter, renderWhitespace, renderControlCharacters, useFontLigatures, null, null, 0, true);
        const htmlBuilder = new StringBuilder(10000);
        const renderOutput = renderViewLine(renderLineInput, htmlBuilder);
        const html = htmlBuilder.build();
        const trustedhtml = ttPolicy?.createHTML(html) ?? html;
        const lineHeight = viewModel.viewLayout.getLineHeightForLineNumber(viewLineNumber) + 'px';
        const domNode = document.createElement('div');
        domNode.innerHTML = trustedhtml;
        domNode.style.lineHeight = lineHeight;
        domNode.style.height = lineHeight;
        domNode.setAttribute(LINE_NUMBER_ATTRIBUTE, viewLineNumber.toString());
        return new RichRenderedScreenReaderLine(domNode, renderOutput.characterMapping);
    }
    _setSelectionOnScreenReaderContent(context, renderedLines, viewSelection) {
        const activeDocument = getActiveWindow().document;
        const activeDocumentSelection = activeDocument.getSelection();
        if (!activeDocumentSelection) {
            return;
        }
        const startLineNumber = viewSelection.startLineNumber;
        const endLineNumber = viewSelection.endLineNumber;
        const startRenderedLine = renderedLines.get(startLineNumber);
        const endRenderedLine = renderedLines.get(endLineNumber);
        if (!startRenderedLine || !endRenderedLine) {
            return;
        }
        const range = new globalThis.Range();
        const viewModel = context.viewModel;
        const model = viewModel.model;
        const coordinatesConverter = viewModel.coordinatesConverter;
        const startRange = new Range(startLineNumber, 1, startLineNumber, viewSelection.startColumn);
        const modelStartRange = coordinatesConverter.convertViewRangeToModelRange(startRange);
        const characterCountForStart = model.getCharacterCountInRange(modelStartRange);
        const endRange = new Range(endLineNumber, 1, endLineNumber, viewSelection.endColumn);
        const modelEndRange = coordinatesConverter.convertViewRangeToModelRange(endRange);
        const characterCountForEnd = model.getCharacterCountInRange(modelEndRange);
        const startDomPosition = startRenderedLine.characterMapping.getDomPosition(characterCountForStart);
        const endDomPosition = endRenderedLine.characterMapping.getDomPosition(characterCountForEnd);
        const startDomNode = startRenderedLine.domNode.firstChild;
        const endDomNode = endRenderedLine.domNode.firstChild;
        const startChildren = startDomNode.childNodes;
        const endChildren = endDomNode.childNodes;
        const startNode = startChildren.item(startDomPosition.partIndex);
        const endNode = endChildren.item(endDomPosition.partIndex);
        if (!startNode.firstChild || !endNode.firstChild) {
            return;
        }
        range.setStart(startNode.firstChild, viewSelection.startColumn === 1 ? 0 : startDomPosition.charIndex + 1);
        range.setEnd(endNode.firstChild, viewSelection.endColumn === 1 ? 0 : endDomPosition.charIndex + 1);
        this._setIgnoreSelectionChangeTime('setRange');
        activeDocumentSelection.setBaseAndExtent(range.startContainer, range.startOffset, range.endContainer, range.endOffset);
    }
    _getScreenReaderContentLineIntervals(primarySelection) {
        return this._strategy.fromEditorSelection(this._context.viewModel, primarySelection, this._accessibilityPageSize);
    }
    _getEditorSelectionFromDomRange() {
        if (!this._renderedLines) {
            return;
        }
        const selection = getActiveWindow().document.getSelection();
        if (!selection) {
            return;
        }
        const rangeCount = selection.rangeCount;
        if (rangeCount === 0) {
            return;
        }
        const range = selection.getRangeAt(0);
        const startContainer = range.startContainer;
        const endContainer = range.endContainer;
        const startSpanElement = startContainer.parentElement;
        const endSpanElement = endContainer.parentElement;
        if (!startSpanElement || !isHTMLElement(startSpanElement) || !endSpanElement || !isHTMLElement(endSpanElement)) {
            return;
        }
        const startLineDomNode = startSpanElement.parentElement?.parentElement;
        const endLineDomNode = endSpanElement.parentElement?.parentElement;
        if (!startLineDomNode || !endLineDomNode) {
            return;
        }
        const startLineNumberAttribute = startLineDomNode.getAttribute(LINE_NUMBER_ATTRIBUTE);
        const endLineNumberAttribute = endLineDomNode.getAttribute(LINE_NUMBER_ATTRIBUTE);
        if (!startLineNumberAttribute || !endLineNumberAttribute) {
            return;
        }
        const startLineNumber = parseInt(startLineNumberAttribute);
        const endLineNumber = parseInt(endLineNumberAttribute);
        const startMapping = this._renderedLines.get(startLineNumber)?.characterMapping;
        const endMapping = this._renderedLines.get(endLineNumber)?.characterMapping;
        if (!startMapping || !endMapping) {
            return;
        }
        const startColumn = getColumnOfNodeOffset(startMapping, startSpanElement, range.startOffset);
        const endColumn = getColumnOfNodeOffset(endMapping, endSpanElement, range.endOffset);
        return new Selection(startLineNumber, startColumn, endLineNumber, endColumn);
    }
};
RichScreenReaderContent = __decorate([
    __param(3, IAccessibilityService)
], RichScreenReaderContent);
export { RichScreenReaderContent };
class RichRenderedScreenReaderLine {
    constructor(domNode, characterMapping) {
        this.domNode = domNode;
        this.characterMapping = characterMapping;
    }
}
class LineInterval {
    constructor(startLine, endLine) {
        this.startLine = startLine;
        this.endLine = endLine;
    }
}
class RichScreenReaderState {
    constructor(intervals) {
        this.intervals = intervals;
    }
    equals(other) {
        if (this.intervals.length !== other.intervals.length) {
            return false;
        }
        for (let i = 0; i < this.intervals.length; i++) {
            if (this.intervals[i].startLine !== other.intervals[i].startLine || this.intervals[i].endLine !== other.intervals[i].endLine) {
                return false;
            }
        }
        return true;
    }
}
class RichPagedScreenReaderStrategy {
    constructor() { }
    _getPageOfLine(lineNumber, linesPerPage) {
        return Math.floor((lineNumber - 1) / linesPerPage);
    }
    _getRangeForPage(context, page, linesPerPage) {
        const offset = page * linesPerPage;
        const startLineNumber = offset + 1;
        const endLineNumber = Math.min(offset + linesPerPage, context.getLineCount());
        return new LineInterval(startLineNumber, endLineNumber);
    }
    fromEditorSelection(context, viewSelection, linesPerPage) {
        const selectionStartPage = this._getPageOfLine(viewSelection.startLineNumber, linesPerPage);
        const selectionStartPageRange = this._getRangeForPage(context, selectionStartPage, linesPerPage);
        const selectionEndPage = this._getPageOfLine(viewSelection.endLineNumber, linesPerPage);
        const selectionEndPageRange = this._getRangeForPage(context, selectionEndPage, linesPerPage);
        const lineIntervals = [{ startLine: selectionStartPageRange.startLine, endLine: selectionStartPageRange.endLine }];
        if (selectionStartPage + 1 < selectionEndPage) {
            lineIntervals.push({ startLine: selectionEndPageRange.startLine, endLine: selectionEndPageRange.endLine });
        }
        return new RichScreenReaderState(lineIntervals);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2NyZWVuUmVhZGVyQ29udGVudFJpY2guanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9hZHZpa2FyL0RvY3VtZW50cy9hcmNoaXRlY3QvYXJjaDIvQXJjaElERS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvYnJvd3Nlci9jb250cm9sbGVyL2VkaXRDb250ZXh0L25hdGl2ZS9zY3JlZW5SZWFkZXJDb250ZW50UmljaC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsZUFBZSxFQUFFLGFBQWEsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBRTNHLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQ3ZGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFDO0FBQ3RHLE9BQU8sRUFBRSxtQkFBbUIsRUFBMkUsTUFBTSw0Q0FBNEMsQ0FBQztBQUMxSixPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDekQsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2pFLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUN6RSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDbEYsT0FBTyxFQUFvQixlQUFlLEVBQUUsY0FBYyxFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFJdEgsT0FBTyxFQUFFLFVBQVUsRUFBZSxpQkFBaUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ3JHLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUd4RCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUVqRixNQUFNLFFBQVEsR0FBRyx3QkFBd0IsQ0FBQyx5QkFBeUIsRUFBRSxFQUFFLFVBQVUsRUFBRSxLQUFLLENBQUMs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