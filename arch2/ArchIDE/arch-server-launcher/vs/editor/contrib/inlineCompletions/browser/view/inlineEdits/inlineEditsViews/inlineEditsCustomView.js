var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { getWindow, n } from '../../../../../../../base/browser/dom.js';
import { StandardMouseEvent } from '../../../../../../../base/browser/mouseEvent.js';
import { Emitter } from '../../../../../../../base/common/event.js';
import { Disposable } from '../../../../../../../base/common/lifecycle.js';
import { autorun, constObservable, derived, derivedObservableWithCache, observableValue } from '../../../../../../../base/common/observable.js';
import { editorBackground } from '../../../../../../../platform/theme/common/colorRegistry.js';
import { asCssVariable } from '../../../../../../../platform/theme/common/colorUtils.js';
import { IThemeService } from '../../../../../../../platform/theme/common/themeService.js';
import { observableCodeEditor } from '../../../../../../browser/observableCodeEditor.js';
import { LineSource, renderLines, RenderOptions } from '../../../../../../browser/widget/diffEditor/components/diffEditorViewZones/renderLines.js';
import { Rect } from '../../../../../../common/core/2d/rect.js';
import { LineRange } from '../../../../../../common/core/ranges/lineRange.js';
import { ILanguageService } from '../../../../../../common/languages/language.js';
import { LineTokens, TokenArray } from '../../../../../../common/tokens/lineTokens.js';
import { InlineEditTabAction } from '../inlineEditsViewInterface.js';
import { getEditorBlendedColor, inlineEditIndicatorPrimaryBackground, inlineEditIndicatorSecondaryBackground, inlineEditIndicatorsuccessfulBackground } from '../theme.js';
import { getContentRenderWidth, maxContentWidthInRange, rectToProps } from '../utils/utils.js';
const MIN_END_OF_LINE_PADDING = 14;
const PADDING_VERTICALLY = 0;
const PADDING_HORIZONTALLY = 4;
const HORIZONTAL_OFFSET_WHEN_ABOVE_BELOW = 4;
const VERTICAL_OFFSET_WHEN_ABOVE_BELOW = 2;
// !! minEndOfLinePadding should always be larger than paddingHorizontally + horizontalOffsetWhenAboveBelow
let InlineEditsCustomView = class InlineEditsCustomView extends Disposable {
    constructor(_editor, displayLocation, tabAction, themeService, _languageService) {
        super();
        this._editor = _editor;
        this._languageService = _languageService;
        this._onDidClick = this._register(new Emitter());
        this.onDidClick = this._onDidClick.event;
        this._isHovered = observableValue(this, false);
        this.isHovered = this._isHovered;
        this._viewRef = n.ref();
        this._editorObs = observableCodeEditor(this._editor);
        const styles = tabAction.map((v, reader) => {
            let border;
            switch (v) {
                case InlineEditTabAction.Inactive:
                    border = inlineEditIndicatorSecondaryBackground;
                    break;
                case InlineEditTabAction.Jump:
                    border = inlineEditIndicatorPrimaryBackground;
                    break;
                case InlineEditTabAction.Accept:
                    border = inlineEditIndicatorsuccessfulBackground;
                    break;
            }
            return {
                border: getEditorBlendedColor(border, themeService).read(reader).toString(),
                background: asCssVariable(editorBackground)
            };
        });
        const state = displayLocation.map(dl => dl ? this.getState(dl) : undefined);
        const view = state.map(s => s ? this.getRendering(s, styles) : undefined);
        const overlay = n.div({
            class: 'inline-edits-custom-view',
            style: {
                position: 'absolute',
                overflow: 'visible',
                top: '0px',
                left: '0px',
                display: 'block',
            },
        }, [view]).keepUpdated(this._store);
        this._register(this._editorObs.createOverlayWidget({
            domNode: overlay.element,
            position: constObservable(null),
            allowEditorOverflow: false,
            minContentWidthInPx: derivedObservableWithCache(this, (reader, prev) => {
                const s = state.read(reader);
                if (!s) {
                    return prev ?? 0;
                }
                const current = s.rect.map(rect => rect.right).read(reader)
                    + this._editorObs.layoutInfoVerticalScrollbarWidth.read(reader)
                    + PADDING_HORIZONTALLY
                    - this._editorObs.layoutInfoContentLeft.read(reader);
                return Math.max(prev ?? 0, current); // will run into infinite loop otherwise TODO: fix this
            }).recomputeInitiallyAndOnChange(this._store),
        }));
        this._register(autorun((reader) => {
            const v = view.read(reader);
            if (!v) {
                this._isHovered.set(false, undefined);
                return;
            }
            this._isHovered.set(overlay.isHovered.read(reader), undefined);
        }));
    }
    // TODO: this is very similar to side by side `fitsInsideViewport`, try to use the same function
    fitsInsideViewport(range, displayLabel, reader) {
        const editorWidth = this._editorObs.layoutInfoWidth.read(reader);
        const editorContentLeft = this._editorObs.layoutInfoContentLeft.read(reader);
        const editorVerticalScrollbar = this._editor.getLayoutInfo().verticalScrollbarWidth;
        const minimapWidth = this._editorObs.layoutInfoMinimap.read(reader).minimapLeft !== 0 ? this._editorObs.layoutInfoMinimap.read(reader).minimapWidth : 0;
        const maxOriginalContent = maxContentWidthInRange(this._editorObs, range, undefined);
        const maxModifiedContent = getContentRenderWidth(displayLabel, this._editor, this._editor.getModel());
        const padding = PADDING_HORIZONTALLY + MIN_END_OF_LINE_PADDING;
        return maxOriginalContent + maxModifiedContent + padding < editorWidth - editorContentLeft - editorVerticalScrollbar - minimapWidth;
    }
    getState(displayLocation) {
        const contentState = derived((reader) => {
            const startLineNumber = displayLocation.range.startLineNumber;
            const endLineNumber = displayLocation.range.endLineNumber;
            const startColumn = displayLocation.range.startColumn;
            const endColumn = displayLocation.range.endColumn;
            const lineCount = this._editor.getModel()?.getLineCount() ?? 0;
            const lineWidth = maxContentWidthInRange(this._editorObs, new LineRange(startLineNumber, startLineNumber + 1), reader);
            const lineWidthBelow = startLineNumber + 1 <= lineCount ? maxContentWidthInRange(this._editorObs, new LineRange(startLineNumber + 1, startLineNumber + 2), reader) : undefined;
            const lineWidthAbove = startLineNumber - 1 >= 1 ? maxContentWidthInRange(this._editorObs, new LineRange(startLineNumber - 1, startLineNumber), reader) : undefined;
            const startContentLeftOffset = this._editor.getOffsetForColumn(startLineNumber, startColumn);
            const endContentLeftOffset = this._editor.getOffsetForColumn(endLineNumber, endColumn);
            return {
                lineWidth,
                lineWidthBelow,
                lineWidthAbove,
                startContentLeftOffset,
                endContentLeftOffset
            };
        });
        const startLineNumber = displayLocation.range.startLineNumber;
        const endLineNumber = displayLocation.range.endLineNumber;
        // only check viewport once in the beginning when rendering the view
        const fitsInsideViewport = this.fitsInsideViewport(new LineRange(startLineNumber, endLineNumber + 1), displayLocation.label, undefined);
        const rect = derived((reader) => {
            const w = this._editorObs.getOption(59 /* EditorOption.fontInfo */).read(reader).typicalHalfwidthCharacterWidth;
            const { lineWidth, lineWidthBelow, lineWidthAbove, startContentLeftOffset, endContentLeftOffset } = contentState.read(reader);
            const contentLeft = this._editorObs.layoutInfoContentLeft.read(reader);
            const lineHeight = this._editorObs.observeLineHeightForLine(startLineNumber).recomputeInitiallyAndOnChange(reader.store).read(reader);
            const scrollTop = this._editorObs.scrollTop.read(reader);
            const scrollLeft = this._editorObs.scrollLeft.read(reader);
            let position;
            if (startLineNumber === endLineNumber && endContentLeftOffset + 5 * w >= lineWidth && fitsInsideViewport) {
                position = 'end'; // Render at the end of the line if the range ends almost at the end of the line
            }
            else if (lineWidthBelow !== undefined && lineWidthBelow + MIN_END_OF_LINE_PADDING - HORIZONTAL_OFFSET_WHEN_ABOVE_BELOW - PADDING_HORIZONTALLY < startContentLeftOffset) {
                position = 'below'; // Render Below if possible
            }
            else if (lineWidthAbove !== undefined && lineWidthAbove + MIN_END_OF_LINE_PADDING - HORIZONTAL_OFFSET_WHEN_ABOVE_BELOW - PADDING_HORIZONTALLY < startContentLeftOffset) {
                position = 'above'; // Render Above if possible
            }
            else {
                position = 'end'; // Render at the end of the line otherwise
            }
            let topOfLine;
            let contentStartOffset;
            let deltaX = 0;
            let deltaY = 0;
            switch (position) {
                case 'end': {
                    topOfLine = this._editorObs.editor.getTopForLineNumber(startLineNumber);
                    contentStartOffset = lineWidth;
                    deltaX = PADDING_HORIZONTALLY + MIN_END_OF_LINE_PADDING;
                    break;
                }
                case 'below': {
                    topOfLine = this._editorObs.editor.getTopForLineNumber(startLineNumber + 1);
                    contentStartOffset = startContentLeftOffset;
                    deltaX = PADDING_HORIZONTALLY + HORIZONTAL_OFFSET_WHEN_ABOVE_BELOW;
                    deltaY = PADDING_VERTICALLY + VERTICAL_OFFSET_WHEN_ABOVE_BELOW;
                    break;
                }
                case 'above': {
                    topOfLine = this._editorObs.editor.getTopForLineNumber(startLineNumber - 1);
                    contentStartOffset = startContentLeftOffset;
                    deltaX = PADDING_HORIZONTALLY + HORIZONTAL_OFFSET_WHEN_ABOVE_BELOW;
                    deltaY = -PADDING_VERTICALLY + VERTICAL_OFFSET_WHEN_ABOVE_BELOW;
                    break;
                }
            }
            const textRect = Rect.fromLeftTopWidthHeight(contentLeft + contentStartOffset - scrollLeft, topOfLine - scrollTop, w * displayLocation.label.length, lineHeight);
            return textRect.withMargin(PADDING_VERTICALLY, PADDING_HORIZONTALLY).translateX(deltaX).translateY(deltaY);
        });
        return {
            rect,
            label: displayLocation.label
        };
    }
    getRendering(state, styles) {
        const line = document.createElement('div');
        const t = this._editor.getModel().tokenization.tokenizeLinesAt(1, [state.label])?.[0];
        let tokens;
        if (t) {
            tokens = TokenArray.fromLineTokens(t).toLineTokens(state.label, this._languageService.languageIdCodec);
        }
        else {
            tokens = LineTokens.createEmpty(state.label, this._languageService.languageIdCodec);
        }
        const result = renderLines(new LineSource([tokens]), RenderOptions.fromEditor(this._editor).withSetWidth(false).withScrollBeyondLastColumn(0), [], line, true);
        line.style.width = `${result.minWidthInPx}px`;
        const rect = state.rect.map(r => r.withMargin(0, PADDING_HORIZONTALLY));
        return n.div({
            class: 'collapsedView',
            ref: this._viewRef,
            style: {
                position: 'absolute',
                ...rectToProps(reader => rect.read(reader)),
                overflow: 'hidden',
                boxSizing: 'border-box',
                cursor: 'pointer',
                border: styles.map(s => `1px solid ${s.border}`),
                borderRadius: '4px',
                backgroundColor: styles.map(s => s.background),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                whiteSpace: 'nowrap',
            },
            onclick: (e) => { this._onDidClick.fire(new StandardMouseEvent(getWindow(e), e)); }
        }, [
            line
        ]);
    }
};
InlineEditsCustomView = __decorate([
    __param(3, IThemeService),
    __param(4, ILanguageService)
], InlineEditsCustomView);
export { InlineEditsCustomView };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5saW5lRWRpdHNDdXN0b21WaWV3LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvYWR2aWthci9Eb2N1bWVudHMvYXJjaGl0ZWN0L2FyY2gyL0FyY2hJREUvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvaW5saW5lQ29tcGxldGlvbnMvYnJvd3Nlci92aWV3L2lubGluZUVkaXRzL2lubGluZUVkaXRzVmlld3MvaW5saW5lRWRpdHNDdXN0b21WaWV3LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7OztBQUFBOzs7Z0dBR2dHO0FBQ2hHLE9BQU8sRUFBRSxTQUFTLEVBQUUsQ0FBQyxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDeEUsT0FBTyxFQUFlLGtCQUFrQixFQUFFLE1BQU0saURBQWlELENBQUM7QUFDbEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBQ3BFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQztBQUMzRSxPQUFPLEVBQUUsT0FBTyxFQUFFLGVBQWUsRUFBRSxPQUFPLEVBQUUsMEJBQTBCLEVBQXdCLGVBQWUsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQ3RLLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLDZEQUE2RCxDQUFDO0FBQy9GLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSwwREFBMEQsQ0FBQztBQUN6RixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sNERBQTRELENBQUM7QUFFM0YsT0FBTyxFQUF3QixvQkFBb0IsRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBQy9HLE9BQU8sRUFBRSxVQUFVLEVBQUUsV0FBVyxFQUFFLGFBQWEsRUFBRSxNQUFNLDJGQUEyRixDQUFDO0FBRW5KLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUNoRSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFFOUUsT0FBTyxFQUFFLGdC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