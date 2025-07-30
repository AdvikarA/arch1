/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as arrays from '../../../base/common/arrays.js';
import { Position } from '../core/position.js';
import { Range } from '../core/range.js';
import { IndentGuide, IndentGuideHorizontalLine } from '../textModelGuides.js';
import { ModelDecorationOptions } from '../model/textModel.js';
import { LineInjectedText } from '../textModelEvents.js';
import * as viewEvents from '../viewEvents.js';
import { createModelLineProjection } from './modelLineProjection.js';
import { ConstantTimePrefixSumComputer } from '../model/prefixSumComputer.js';
import { ViewLineData } from '../viewModel.js';
import { IdentityCoordinatesConverter } from '../coordinatesConverter.js';
export class ViewModelLinesFromProjectedModel {
    constructor(editorId, model, domLineBreaksComputerFactory, monospaceLineBreaksComputerFactory, fontInfo, tabSize, wrappingStrategy, wrappingColumn, wrappingIndent, wordBreak, wrapOnEscapedLineFeeds) {
        this._editorId = editorId;
        this.model = model;
        this._validModelVersionId = -1;
        this._domLineBreaksComputerFactory = domLineBreaksComputerFactory;
        this._monospaceLineBreaksComputerFactory = monospaceLineBreaksComputerFactory;
        this.fontInfo = fontInfo;
        this.tabSize = tabSize;
        this.wrappingStrategy = wrappingStrategy;
        this.wrappingColumn = wrappingColumn;
        this.wrappingIndent = wrappingIndent;
        this.wordBreak = wordBreak;
        this.wrapOnEscapedLineFeeds = wrapOnEscapedLineFeeds;
        this._constructLines(/*resetHiddenAreas*/ true, null);
    }
    dispose() {
        this.hiddenAreasDecorationIds = this.model.deltaDecorations(this.hiddenAreasDecorationIds, []);
    }
    createCoordinatesConverter() {
        return new CoordinatesConverter(this);
    }
    _constructLines(resetHiddenAreas, previousLineBreaks) {
        this.modelLineProjections = [];
        if (resetHiddenAreas) {
            this.hiddenAreasDecorationIds = this.model.deltaDecorations(this.hiddenAreasDecorationIds, []);
        }
        const linesContent = this.model.getLinesContent();
        const injectedTextDecorations = this.model.getInjectedTextDecorations(this._editorId);
        const lineCount = linesContent.length;
        const lineBreaksComputer = this.createLineBreaksComputer();
        const injectedTextQueue = new arrays.ArrayQueue(LineInjectedText.fromDecorations(injectedTextDecorations));
        for (let i = 0; i < lineCount; i++) {
            const lineInjectedText = injectedTextQueue.takeWhile(t => t.lineNumber === i + 1);
            lineBreaksComputer.addRequest(linesContent[i], lineInjectedText, previousLineBreaks ? previousLineBreaks[i] : null);
        }
        const linesBreaks = lineBreaksComputer.finalize();
        const values = [];
        const hiddenAreas = this.hiddenAreasDecorationIds.map((areaId) => this.model.getDecorationRange(areaId)).sort(Range.compareRangesUsingStarts);
        let hiddenAreaStart = 1, hiddenAreaEnd = 0;
        let hiddenAreaIdx = -1;
        let nextLineNumberToUpdateHiddenArea = (hiddenAreaIdx + 1 < hiddenAreas.length) ? hiddenAreaEnd + 1 : lineCount + 2;
        for (let i = 0; i < lineCount; i++) {
            const lineNumber = i + 1;
            if (lineNumber === nextLineNumberToUpdateHiddenArea) {
                hiddenAreaIdx++;
                hiddenAreaStart = hiddenAreas[hiddenAreaIdx].startLineNumber;
                hiddenAreaEnd = hiddenAreas[hiddenAreaIdx].endLineNumber;
                nextLineNumberToUpdateHiddenArea = (hiddenAreaIdx + 1 < hiddenAreas.length) ? hiddenAreaEnd + 1 : lineCount + 2;
            }
            const isInHiddenArea = (lineNumber >= hiddenAreaStart && lineNumber <= hiddenAreaEnd);
            const line = createModelLineProjection(linesBreaks[i], !isInHiddenArea);
            values[i] = line.getViewLineCount();
            this.modelLineProjections[i] = line;
        }
        this._validModelVersionId = this.model.getVersionId();
        this.projectedModelLineLineCounts = new ConstantTimePrefixSumComputer(values);
    }
    getHiddenAreas() {
        return this.hiddenAreasDecorationIds.map((decId) => this.model.getDecorationRange(decId));
    }
    setHiddenAreas(_ranges) {
        const validatedRanges = _ranges.map(r => this.model.validateRange(r));
        const newRanges = normalizeLineRanges(validatedRanges);
        // TODO@Martin: Please stop calling this method on each model change!
        // This checks if there really was a change
        const oldRanges = this.hiddenAreasDecorationIds.map((areaId) => this.model.getDecorationRange(areaId)).sort(Range.compareRangesUsingStarts);
        if (newRanges.length === oldRanges.length) {
            let hasDifference = false;
            for (let i = 0; i < newRanges.length; i++) {
                if (!newRanges[i].equalsRange(oldRanges[i])) {
                    hasDifference = true;
                    break;
                }
            }
            if (!hasDifference) {
                return false;
            }
        }
        const newDecorations = newRanges.map((r) => ({
            range: r,
            options: ModelDecorationOptions.EMPTY,
        }));
        this.hiddenAreasDecorationIds = this.model.deltaDecorations(this.hiddenAreasDecorationIds, newDecorations);
        const hiddenAreas = newRanges;
        let hiddenAreaStart = 1, hiddenAreaEnd = 0;
        let hiddenAreaIdx = -1;
        let nextLineNumberToUpdateHiddenArea = (hiddenAreaIdx + 1 < hiddenAreas.length) ? hiddenAreaEnd + 1 : this.modelLineProjections.length + 2;
        let hasVisibleLine = false;
        for (let i = 0; i < this.modelLineProjections.length; i++) {
            const lineNumber = i + 1;
            if (lineNumber === nextLineNumberToUpdateHiddenArea) {
                hiddenAreaIdx++;
                hiddenAreaStart = hiddenAreas[hiddenAreaIdx].startLineNumber;
                hiddenAreaEnd = hiddenAreas[hiddenAreaIdx].endLineNumber;
                nextLineNumberToUpdateHiddenArea = (hiddenAreaIdx + 1 < hiddenAreas.length) ? hiddenAreaEnd + 1 : this.modelLineProjections.length + 2;
            }
            let lineChanged = false;
            if (lineNumber >= hiddenAreaStart && lineNumber <= hiddenAreaEnd) {
                // Line should be hidden
                if (this.modelLineProjections[i].isVisible()) {
                    this.modelLineProjections[i] = this.modelLineProjections[i].setVisible(false);
                    lineChanged = true;
                }
            }
            else {
                hasVisibleLine = true;
                // Line should be visible
                if (!this.modelLineProjections[i].isVisible()) {
                    this.modelLineProjections[i] = this.modelLineProjections[i].setVisible(true);
                    lineChanged = true;
                }
            }
            if (lineChanged) {
                const newOutputLineCount = this.modelLineProjections[i].getViewLineCount();
                this.projectedModelLineLineCounts.setValue(i, newOutputLineCount);
            }
        }
        if (!hasVisibleLine) {
            // Cannot have everything be hidden => reveal everything!
            this.setHiddenAreas([]);
        }
        return true;
    }
    modelPositionIsVisible(modelLineNumber, _modelColumn) {
        if (modelLineNumber < 1 || modelLineNumber > this.modelLineProjections.length) {
            // invalid arguments
            return false;
        }
        return this.modelLineProjections[modelLineNumber - 1].isVisible();
    }
    getModelLineViewLineCount(modelLineNumber) {
        if (modelLineNumber < 1 || modelLineNumber > this.modelLineProjections.length) {
            // invalid arguments
            return 1;
        }
        return this.modelLineProjections[modelLineNumber - 1].getViewLineCount();
    }
    setTabSize(newTabSize) {
        if (this.tabSize === newTabSize) {
            return false;
        }
        this.tabSize = newTabSize;
        this._constructLines(/*resetHiddenAreas*/ false, null);
        return true;
    }
    setWrappingSettings(fontInfo, wrappingStrategy, wrappingColumn, wrappingIndent, wordBreak) {
        const equalFontInfo = this.fontInfo.equals(fontInfo);
        const equalWrappingStrategy = (this.wrappingStrategy === wrappingStrategy);
        const equalWrappingColumn = (this.wrappingColumn === wrappingColumn);
        const equalWrappingIndent = (this.wrappingIndent === wrappingIndent);
        const equalWordBreak = (this.wordBreak === wordBreak);
        if (equalFontInfo && equalWrappingStrategy && equalWrappingColumn && equalWrappingIndent && equalWordBreak) {
            return false;
        }
        const onlyWrappingColumnChanged = (equalFontInfo && equalWrappingStrategy && !equalWrappingColumn && equalWrappingIndent && equalWordBreak);
        this.fontInfo = fontInfo;
        this.wrappingStrategy = wrappingStrategy;
        this.wrappingColumn = wrappingColumn;
        this.wrappingIndent = wrappingIndent;
        this.wordBreak = wordBreak;
        let previousLineBreaks = null;
        if (onlyWrappingColumnChanged) {
            previousLineBreaks = [];
            for (let i = 0, len = this.modelLineProjections.length; i < len; i++) {
                previousLineBreaks[i] = this.modelLineProjections[i].getProjectionData();
            }
        }
        this._constructLines(/*resetHiddenAreas*/ false, previousLineBreaks);
        return true;
    }
    createLineBreaksComputer() {
        const lineBreaksComputerFactory = (this.wrappingStrategy === 'advanced'
            ? this._domLineBreaksComputerFactory
            : this._monospaceLineBreaksComputerFactory);
        return lineBreaksComputerFactory.createLineBreaksComputer(this.fontInfo, this.tabSize, this.wrappingColumn, this.wrappingIndent, this.wordBreak, this.wrapOnEscapedLineFeeds);
    }
    onModelFlushed() {
        this._constructLines(/*resetHiddenAreas*/ true, null);
    }
    onModelLinesDeleted(versionId, fromLineNumber, toLineNumber) {
        if (!versionId || versionId <= this._validModelVersionId) {
            // Here we check for versionId in case the lines were reconstructed in the meantime.
            // We don't want to apply stale change events on top of a newer read model state.
            return null;
        }
        const outputFromLineNumber = (fromLineNumber === 1 ? 1 : this.projectedModelLineLineCounts.getPrefixSum(fromLineNumber - 1) + 1);
        const outputToLineNumber = this.projectedModelLineLineCounts.getPrefixSum(toLineNumber);
        this.modelLineProjections.splice(fromLineNumber - 1, toLineNumber - fromLineNumber + 1);
        this.projectedModelLineLineCounts.removeValues(fromLineNumber - 1, toLineNumber - fromLineNumber + 1);
        return new viewEvents.ViewLinesDeletedEvent(outputFromLineNumber, outputToLineNumber);
    }
    onModelLinesInserted(versionId, fromLineNumber, _toLineNumber, lineBreaks) {
        if (!versionId || versionId <= this._validModelVersionId) {
            // Here we check for versionId in case the lines were reconstructed in the meantime.
            // We don't want to apply stale change events on top of a newer read model state.
            return null;
        }
        // cannot use this.getHiddenAreas() because those decorations have already seen the effect of this model change
        const isInHiddenArea = (fromLineNumber > 2 && !this.modelLineProjections[fromLineNumber - 2].isVisible());
        const outputFromLineNumber = (fromLineNumber === 1 ? 1 : this.projectedModelLineLineCounts.getPrefixSum(fromLineNumber - 1) + 1);
        let totalOutputLineCount = 0;
        const insertLines = [];
        const insertPrefixSumValues = [];
        for (let i = 0, len = lineBreaks.length; i < len; i++) {
            const line = createModelLineProjection(lineBreaks[i], !isInHiddenArea);
            insertLines.push(line);
            const outputLineCount = line.getViewLineCount();
            totalOutputLineCount += outputLineCount;
            insertPrefixSumValues[i] = outputLineCount;
        }
        // TODO@Alex: use arrays.arrayInsert
        this.modelLineProjections =
            this.modelLineProjections.slice(0, fromLineNumber - 1)
                .concat(insertLines)
                .concat(this.modelLineProjections.slice(fromLineNumber - 1));
        this.projectedModelLineLineCounts.insertValues(fromLineNumber - 1, insertPrefixSumValues);
        return new viewEvents.ViewLinesInsertedEvent(outputFromLineNumber, outputFromLineNumber + totalOutputLineCount - 1);
    }
    onModelLineChanged(versionId, lineNumber, lineBreakData) {
        if (versionId !== null && versionId <= this._validModelVersionId) {
            // Here we check for versionId in case the lines were reconstructed in the meantime.
            // We don't want to apply stale change events on top of a newer read model state.
            return [false, null, null, null];
        }
        const lineIndex = lineNumber - 1;
        const oldOutputLineCount = this.modelLineProjections[lineIndex].getViewLineCount();
        const isVisible = this.modelLineProjections[lineIndex].isVisible();
        const line = createModelLineProjection(lineBreakData, isVisible);
        this.modelLineProjections[lineIndex] = line;
        const newOutputLineCount = this.modelLineProjections[lineIndex].getViewLineCount();
        let lineMappingChanged = false;
        let changeFrom = 0;
        let changeTo = -1;
        let insertFrom = 0;
        let insertTo = -1;
        let deleteFrom = 0;
        let deleteTo = -1;
        if (oldOutputLineCount > newOutputLineCount) {
            changeFrom = this.projectedModelLineLineCounts.getPrefixSum(lineNumber - 1) + 1;
            changeTo = changeFrom + newOutputLineCount - 1;
            deleteFrom = changeTo + 1;
            deleteTo = deleteFrom + (oldOutputLineCount - newOutputLineCount) - 1;
            lineMappingChanged = true;
        }
        else if (oldOutputLineCount < newOutputLineCount) {
            changeFrom = this.projectedModelLineLineCounts.getPrefixSum(lineNumber - 1) + 1;
            changeTo = changeFrom + oldOutputLineCount - 1;
            insertFrom = changeTo + 1;
            insertTo = insertFrom + (newOutputLineCount - oldOutputLineCount) - 1;
            lineMappingChanged = true;
        }
        else {
            changeFrom = this.projectedModelLineLineCounts.getPrefixSum(lineNumber - 1) + 1;
            changeTo = changeFrom + newOutputLineCount - 1;
        }
        this.projectedModelLineLineCounts.setValue(lineIndex, newOutputLineCount);
        const viewLinesChangedEvent = (changeFrom <= changeTo ? new viewEvents.ViewLinesChangedEvent(changeFrom, changeTo - changeFrom + 1) : null);
        const viewLinesInsertedEvent = (insertFrom <= insertTo ? new viewEvents.ViewLinesInsertedEvent(insertFrom, insertTo) : null);
        const viewLinesDeletedEvent = (deleteFrom <= deleteTo ? new viewEvents.ViewLinesDeletedEvent(deleteFrom, deleteTo) : null);
        return [lineMappingChanged, viewLinesChangedEvent, viewLinesInsertedEvent, viewLinesDeletedEvent];
    }
    acceptVersionId(versionId) {
        this._validModelVersionId = versionId;
        if (this.modelLineProjections.length === 1 && !this.modelLineProjections[0].isVisible()) {
            // At least one line must be visible => reset hidden areas
            this.setHiddenAreas([]);
        }
    }
    getViewLineCount() {
        return this.projectedModelLineLineCounts.getTotalSum();
    }
    _toValidViewLineNumber(viewLineNumber) {
        if (viewLineNumber < 1) {
            return 1;
        }
        const viewLineCount = this.getViewLineCount();
        if (viewLineNumber > viewLineCount) {
            return viewLineCount;
        }
        return viewLineNumber | 0;
    }
    getActiveIndentGuide(viewLineNumber, minLineNumber, maxLineNumber) {
        viewLineNumber = this._toValidViewLineNumber(viewLineNumber);
        minLineNumber = this._toValidViewLineNumber(minLineNumber);
        maxLineNumber = this._toValidViewLineNumber(maxLineNumber);
        const modelPosition = this.convertViewPositionToModelPosition(viewLineNumber, this.getViewLineMinColumn(viewLineNumber));
        const modelMinPosition = this.convertViewPositionToModelPosition(minLineNumber, this.getViewLineMinColumn(minLineNumber));
        const modelMaxPosition = this.convertViewPositionToModelPosition(maxLineNumber, this.getViewLineMinColumn(maxLineNumber));
        const result = this.model.guides.getActiveIndentGuide(modelPosition.lineNumber, modelMinPosition.lineNumber, modelMaxPosition.lineNumber);
        const viewStartPosition = this.convertModelPositionToViewPosition(result.startLineNumber, 1);
        const viewEndPosition = this.convertModelPositionToViewPosition(result.endLineNumber, this.model.getLineMaxColumn(result.endLineNumber));
        return {
            startLineNumber: viewStartPosition.lineNumber,
            endLineNumber: viewEndPosition.lineNumber,
            indent: result.indent
        };
    }
    // #region ViewLineInfo
    getViewLineInfo(viewLineNumber) {
        viewLineNumber = this._toValidViewLineNumber(viewLineNumber);
        const r = this.projectedModelLineLineCounts.getIndexOf(viewLineNumber - 1);
        const lineIndex = r.index;
        const remainder = r.remainder;
        return new ViewLineInfo(lineIndex + 1, remainder);
    }
    getMinColumnOfViewLine(viewLineInfo) {
        return this.modelLineProjections[viewLineInfo.modelLineNumber - 1].getViewLineMinColumn(this.model, viewLineInfo.modelLineNumber, viewLineInfo.modelLineWrappedLineIdx);
    }
    getMaxColumnOfViewLine(viewLineInfo) {
        return this.modelLineProjections[viewLineInfo.modelLineNumber - 1].getViewLineMaxColumn(this.model, viewLineInfo.modelLineNumber, viewLineInfo.modelLineWrappedLineIdx);
    }
    getModelStartPositionOfViewLine(viewLineInfo) {
        const line = this.modelLineProjections[viewLineInfo.modelLineNumber - 1];
        const minViewColumn = line.getViewLineMinColumn(this.model, viewLineInfo.modelLineNumber, viewLineInfo.modelLineWrappedLineIdx);
        const column = line.getModelColumnOfViewPosition(viewLineInfo.modelLineWrappedLineIdx, minViewColumn);
        return new Position(viewLineInfo.modelLineNumber, column);
    }
    getModelEndPositionOfViewLine(viewLineInfo) {
        const line = this.modelLineProjections[viewLineInfo.modelLineNumber - 1];
        const maxViewColumn = line.getViewLineMaxColumn(this.model, viewLineInfo.modelLineNumber, viewLineInfo.modelLineWrappedLineIdx);
        const column = line.getModelColumnOfViewPosition(viewLineInfo.modelLineWrappedLineIdx, maxViewColumn);
        return new Position(viewLineInfo.modelLineNumber, column);
    }
    getViewLineInfosGroupedByModelRanges(viewStartLineNumber, viewEndLineNumber) {
        const startViewLine = this.getViewLineInfo(viewStartLineNumber);
        const endViewLine = this.getViewLineInfo(viewEndLineNumber);
        const result = new Array();
        let lastVisibleModelPos = this.getModelStartPositionOfViewLine(startViewLine);
        let viewLines = new Array();
        for (let curModelLine = startViewLine.modelLineNumber; curModelLine <= endViewLine.modelLineNumber; curModelLine++) {
            const line = this.modelLineProjections[curModelLine - 1];
            if (line.isVisible()) {
                const startOffset = curModelLine === startViewLine.modelLineNumber
                    ? startViewLine.modelLineWrappedLineIdx
                    : 0;
                const endOffset = curModelLine === endViewLine.modelLineNumber
                    ? endViewLine.modelLineWrappedLineIdx + 1
                    : line.getViewLineCount();
                for (let i = startOffset; i < endOffset; i++) {
                    viewLines.push(new ViewLineInfo(curModelLine, i));
                }
            }
            if (!line.isVisible() && lastVisibleModelPos) {
                const lastVisibleModelPos2 = new Position(curModelLine - 1, this.model.getLineMaxColumn(curModelLine - 1) + 1);
                const modelRange = Range.fromPositions(lastVisibleModelPos, lastVisibleModelPos2);
                result.push(new ViewLineInfoGroupedByModelRange(modelRange, viewLines));
                viewLines = [];
                lastVisibleModelPos = null;
            }
            else if (line.isVisible() && !lastVisibleModelPos) {
                lastVisibleModelPos = new Position(curModelLine, 1);
            }
        }
        if (lastVisibleModelPos) {
            const modelRange = Range.fromPositions(lastVisibleModelPos, this.getModelEndPositionOfViewLine(endViewLine));
            result.push(new ViewLineInfoGroupedByModelRange(modelRange, viewLines));
        }
        return result;
    }
    // #endregion
    getViewLinesBracketGuides(viewStartLineNumber, viewEndLineNumber, activeViewPosition, options) {
        const modelActivePosition = activeViewPosition ? this.convertViewPositionToModelPosition(activeViewPosition.lineNumber, activeViewPosition.column) : null;
        const resultPerViewLine = [];
        for (const group of this.getViewLineInfosGroupedByModelRanges(viewStartLineNumber, viewEndLineNumber)) {
            const modelRangeStartLineNumber = group.modelRange.startLineNumber;
            const bracketGuidesPerModelLine = this.model.guides.getLinesBracketGuides(modelRangeStartLineNumber, group.modelRange.endLineNumber, modelActivePosition, options);
            for (const viewLineInfo of group.viewLines) {
                const bracketGuides = bracketGuidesPerModelLine[viewLineInfo.modelLineNumber - modelRangeStartLineNumber];
                // visibleColumns stay as they are (this is a bug and needs to be fixed, but it is not a regression)
                // model-columns must be converted to view-model columns.
                const result = bracketGuides.map(g => {
                    if (g.forWrappedLinesAfterColumn !== -1) {
                        const p = this.modelLineProjections[viewLineInfo.modelLineNumber - 1].getViewPositionOfModelPosition(0, g.forWrappedLinesAfterColumn);
                        if (p.lineNumber >= viewLineInfo.modelLineWrappedLineIdx) {
                            return undefined;
                        }
                    }
                    if (g.forWrappedLinesBeforeOrAtColumn !== -1) {
                        const p = this.modelLineProjections[viewLineInfo.modelLineNumber - 1].getViewPositionOfModelPosition(0, g.forWrappedLinesBeforeOrAtColumn);
                        if (p.lineNumber < viewLineInfo.modelLineWrappedLineIdx) {
                            return undefined;
                        }
                    }
                    if (!g.horizontalLine) {
                        return g;
                    }
                    let column = -1;
                    if (g.column !== -1) {
                        const p = this.modelLineProjections[viewLineInfo.modelLineNumber - 1].getViewPositionOfModelPosition(0, g.column);
                        if (p.lineNumber === viewLineInfo.modelLineWrappedLineIdx) {
                            column = p.column;
                        }
                        else if (p.lineNumber < viewLineInfo.modelLineWrappedLineIdx) {
                            column = this.getMinColumnOfViewLine(viewLineInfo);
                        }
                        else if (p.lineNumber > viewLineInfo.modelLineWrappedLineIdx) {
                            return undefined;
                        }
                    }
                    const viewPosition = this.convertModelPositionToViewPosition(viewLineInfo.modelLineNumber, g.horizontalLine.endColumn);
                    const p = this.modelLineProjections[viewLineInfo.modelLineNumber - 1].getViewPositionOfModelPosition(0, g.horizontalLine.endColumn);
                    if (p.lineNumber === viewLineInfo.modelLineWrappedLineIdx) {
                        return new IndentGuide(g.visibleColumn, column, g.className, new IndentGuideHorizontalLine(g.horizontalLine.top, viewPosition.column), -1, -1);
                    }
                    else if (p.lineNumber < viewLineInfo.modelLineWrappedLineIdx) {
                        return undefined;
                    }
                    else {
                        if (g.visibleColumn !== -1) {
                            // Don't repeat horizontal lines that use visibleColumn for unrelated lines.
                            return undefined;
                        }
                        return new IndentGuide(g.visibleColumn, column, g.className, new IndentGuideHorizontalLine(g.horizontalLine.top, this.getMaxColumnOfViewLine(viewLineInfo)), -1, -1);
                    }
                });
                resultPerViewLine.push(result.filter((r) => !!r));
            }
        }
        return resultPerViewLine;
    }
    getViewLinesIndentGuides(viewStartLineNumber, viewEndLineNumber) {
        // TODO: Use the same code as in `getViewLinesBracketGuides`.
        // Future TODO: Merge with `getViewLinesBracketGuides`.
        // However, this requires more refactoring of indent guides.
        viewStartLineNumber = this._toValidViewLineNumber(viewStartLineNumber);
        viewEndLineNumber = this._toValidViewLineNumber(viewEndLineNumber);
        const modelStart = this.convertViewPositionToModelPosition(viewStartLineNumber, this.getViewLineMinColumn(viewStartLineNumber));
        const modelEnd = this.convertViewPositionToModelPosition(viewEndLineNumber, this.getViewLineMaxColumn(viewEndLineNumber));
        let result = [];
        const resultRepeatCount = [];
        const resultRepeatOption = [];
        const modelStartLineIndex = modelStart.lineNumber - 1;
        const modelEndLineIndex = modelEnd.lineNumber - 1;
        let reqStart = null;
        for (let modelLineIndex = modelStartLineIndex; modelLineIndex <= modelEndLineIndex; modelLineIndex++) {
            const line = this.modelLineProjections[modelLineIndex];
            if (line.isVisible()) {
                const viewLineStartIndex = line.getViewLineNumberOfModelPosition(0, modelLineIndex === modelStartLineIndex ? modelStart.column : 1);
                const viewLineEndIndex = line.getViewLineNumberOfModelPosition(0, this.model.getLineMaxColumn(modelLineIndex + 1));
                const count = viewLineEndIndex - viewLineStartIndex + 1;
                let option = 0 /* IndentGuideRepeatOption.BlockNone */;
                if (count > 1 && line.getViewLineMinColumn(this.model, modelLineIndex + 1, viewLineEndIndex) === 1) {
                    // wrapped lines should block indent guides
                    option = (viewLineStartIndex === 0 ? 1 /* IndentGuideRepeatOption.BlockSubsequent */ : 2 /* IndentGuideRepeatOption.BlockAll */);
                }
                resultRepeatCount.push(count);
                resultRepeatOption.push(option);
                // merge into previous request
                if (reqStart === null) {
                    reqStart = new Position(modelLineIndex + 1, 0);
                }
            }
            else {
                // hit invisible line => flush request
                if (reqStart !== null) {
                    result = result.concat(this.model.guides.getLinesIndentGuides(reqStart.lineNumber, modelLineIndex));
                    reqStart = null;
                }
            }
        }
        if (reqStart !== null) {
            result = result.concat(this.model.guides.getLinesIndentGuides(reqStart.lineNumber, modelEnd.lineNumber));
            reqStart = null;
        }
        const viewLineCount = viewEndLineNumber - viewStartLineNumber + 1;
        const viewIndents = new Array(viewLineCount);
        let currIndex = 0;
        for (let i = 0, len = result.length; i < len; i++) {
            let value = result[i];
            const count = Math.min(viewLineCount - currIndex, resultRepeatCount[i]);
            const option = resultRepeatOption[i];
            let blockAtIndex;
            if (option === 2 /* IndentGuideRepeatOption.BlockAll */) {
                blockAtIndex = 0;
            }
            else if (option === 1 /* IndentGuideRepeatOption.BlockSubsequent */) {
                blockAtIndex = 1;
            }
            else {
                blockAtIndex = count;
            }
            for (let j = 0; j < count; j++) {
                if (j === blockAtIndex) {
                    value = 0;
                }
                viewIndents[currIndex++] = value;
            }
        }
        return viewIndents;
    }
    getViewLineContent(viewLineNumber) {
        const info = this.getViewLineInfo(viewLineNumber);
        return this.modelLineProjections[info.modelLineNumber - 1].getViewLineContent(this.model, info.modelLineNumber, info.modelLineWrappedLineIdx);
    }
    getViewLineLength(viewLineNumber) {
        const info = this.getViewLineInfo(viewLineNumber);
        return this.modelLineProjections[info.modelLineNumber - 1].getViewLineLength(this.model, info.modelLineNumber, info.modelLineWrappedLineIdx);
    }
    getViewLineMinColumn(viewLineNumber) {
        const info = this.getViewLineInfo(viewLineNumber);
        return this.modelLineProjections[info.modelLineNumber - 1].getViewLineMinColumn(this.model, info.modelLineNumber, info.modelLineWrappedLineIdx);
    }
    getViewLineMaxColumn(viewLineNumber) {
        const info = this.getViewLineInfo(viewLineNumber);
        return this.modelLineProjections[info.modelLineNumber - 1].getViewLineMaxColumn(this.model, info.modelLineNumber, info.modelLineWrappedLineIdx);
    }
    getViewLineData(viewLineNumber) {
        const info = this.getViewLineInfo(viewLineNumber);
        return this.modelLineProjections[info.modelLineNumber - 1].getViewLineData(this.model, info.modelLineNumber, info.modelLineWrappedLineIdx);
    }
    getViewLinesData(viewStartLineNumber, viewEndLineNumber, needed) {
        viewStartLineNumber = this._toValidViewLineNumber(viewStartLineNumber);
        viewEndLineNumber = this._toValidViewLineNumber(viewEndLineNumber);
        const start = this.projectedModelLineLineCounts.getIndexOf(viewStartLineNumber - 1);
        let viewLineNumber = viewStartLineNumber;
        const startModelLineIndex = start.index;
        const startRemainder = start.remainder;
        const result = [];
        for (let modelLineIndex = startModelLineIndex, len = this.model.getLineCount(); modelLineIndex < len; modelLineIndex++) {
            const line = this.modelLineProjections[modelLineIndex];
            if (!line.isVisible()) {
                continue;
            }
            const fromViewLineIndex = (modelLineIndex === startModelLineIndex ? startRemainder : 0);
            let remainingViewLineCount = line.getViewLineCount() - fromViewLineIndex;
            let lastLine = false;
            if (viewLineNumber + remainingViewLineCount > viewEndLineNumber) {
                lastLine = true;
                remainingViewLineCount = viewEndLineNumber - viewLineNumber + 1;
            }
            line.getViewLinesData(this.model, modelLineIndex + 1, fromViewLineIndex, remainingViewLineCount, viewLineNumber - viewStartLineNumber, needed, result);
            viewLineNumber += remainingViewLineCount;
            if (lastLine) {
                break;
            }
        }
        return result;
    }
    validateViewPosition(viewLineNumber, viewColumn, expectedModelPosition) {
        viewLineNumber = this._toValidViewLineNumber(viewLineNumber);
        const r = this.projectedModelLineLineCounts.getIndexOf(viewLineNumber - 1);
        const lineIndex = r.index;
        const remainder = r.remainder;
        const line = this.modelLineProjections[lineIndex];
        const minColumn = line.getViewLineMinColumn(this.model, lineIndex + 1, remainder);
        const maxColumn = line.getViewLineMaxColumn(this.model, lineIndex + 1, remainder);
        if (viewColumn < minColumn) {
            viewColumn = minColumn;
        }
        if (viewColumn > maxColumn) {
            viewColumn = maxColumn;
        }
        const computedModelColumn = line.getModelColumnOfViewPosition(remainder, viewColumn);
        const computedModelPosition = this.model.validatePosition(new Position(lineIndex + 1, computedModelColumn));
        if (computedModelPosition.equals(expectedModelPosition)) {
            return new Position(viewLineNumber, viewColumn);
        }
        return this.convertModelPositionToViewPosition(expectedModelPosition.lineNumber, expectedModelPosition.column);
    }
    validateViewRange(viewRange, expectedModelRange) {
        const validViewStart = this.validateViewPosition(viewRange.startLineNumber, viewRange.startColumn, expectedModelRange.getStartPosition());
        const validViewEnd = this.validateViewPosition(viewRange.endLineNumber, viewRange.endColumn, expectedModelRange.getEndPosition());
        return new Range(validViewStart.lineNumber, validViewStart.column, validViewEnd.lineNumber, validViewEnd.column);
    }
    convertViewPositionToModelPosition(viewLineNumber, viewColumn) {
        const info = this.getViewLineInfo(viewLineNumber);
        const inputColumn = this.modelLineProjections[info.modelLineNumber - 1].getModelColumnOfViewPosition(info.modelLineWrappedLineIdx, viewColumn);
        // console.log('out -> in ' + viewLineNumber + ',' + viewColumn + ' ===> ' + (lineIndex+1) + ',' + inputColumn);
        return this.model.validatePosition(new Position(info.modelLineNumber, inputColumn));
    }
    convertViewRangeToModelRange(viewRange) {
        const start = this.convertViewPositionToModelPosition(viewRange.startLineNumber, viewRange.startColumn);
        const end = this.convertViewPositionToModelPosition(viewRange.endLineNumber, viewRange.endColumn);
        return new Range(start.lineNumber, start.column, end.lineNumber, end.column);
    }
    convertModelPositionToViewPosition(_modelLineNumber, _modelColumn, affinity = 2 /* PositionAffinity.None */, allowZeroLineNumber = false, belowHiddenRanges = false) {
        const validPosition = this.model.validatePosition(new Position(_modelLineNumber, _modelColumn));
        const inputLineNumber = validPosition.lineNumber;
        const inputColumn = validPosition.column;
        let lineIndex = inputLineNumber - 1, lineIndexChanged = false;
        if (belowHiddenRanges) {
            while (lineIndex < this.modelLineProjections.length && !this.modelLineProjections[lineIndex].isVisible()) {
                lineIndex++;
                lineIndexChanged = true;
            }
        }
        else {
            while (lineIndex > 0 && !this.modelLineProjections[lineIndex].isVisible()) {
                lineIndex--;
                lineIndexChanged = true;
            }
        }
        if (lineIndex === 0 && !this.modelLineProjections[lineIndex].isVisible()) {
            // Could not reach a real line
            // console.log('in -> out ' + inputLineNumber + ',' + inputColumn + ' ===> ' + 1 + ',' + 1);
            // TODO@alexdima@hediet this isn't soo pretty
            return new Position(allowZeroLineNumber ? 0 : 1, 1);
        }
        const deltaLineNumber = 1 + this.projectedModelLineLineCounts.getPrefixSum(lineIndex);
        let r;
        if (lineIndexChanged) {
            if (belowHiddenRanges) {
                r = this.modelLineProjections[lineIndex].getViewPositionOfModelPosition(deltaLineNumber, 1, affinity);
            }
            else {
                r = this.modelLineProjections[lineIndex].getViewPositionOfModelPosition(deltaLineNumber, this.model.getLineMaxColumn(lineIndex + 1), affinity);
            }
        }
        else {
            r = this.modelLineProjections[inputLineNumber - 1].getViewPositionOfModelPosition(deltaLineNumber, inputColumn, affinity);
        }
        // console.log('in -> out ' + inputLineNumber + ',' + inputColumn + ' ===> ' + r.lineNumber + ',' + r);
        return r;
    }
    /**
     * @param affinity The affinity in case of an empty range. Has no effect for non-empty ranges.
    */
    convertModelRangeToViewRange(modelRange, affinity = 0 /* PositionAffinity.Left */) {
        if (modelRange.isEmpty()) {
            const start = this.convertModelPositionToViewPosition(modelRange.startLineNumber, modelRange.startColumn, affinity);
            return Range.fromPositions(start);
        }
        else {
            const start = this.convertModelPositionToViewPosition(modelRange.startLineNumber, modelRange.startColumn, 1 /* PositionAffinity.Right */);
            const end = this.convertModelPositionToViewPosition(modelRange.endLineNumber, modelRange.endColumn, 0 /* PositionAffinity.Left */);
            return new Range(start.lineNumber, start.column, end.lineNumber, end.column);
        }
    }
    getViewLineNumberOfModelPosition(modelLineNumber, modelColumn) {
        let lineIndex = modelLineNumber - 1;
        if (this.modelLineProjections[lineIndex].isVisible()) {
            // this model line is visible
            const deltaLineNumber = 1 + this.projectedModelLineLineCounts.getPrefixSum(lineIndex);
            return this.modelLineProjections[lineIndex].getViewLineNumberOfModelPosition(deltaLineNumber, modelColumn);
        }
        // this model line is not visible
        while (lineIndex > 0 && !this.modelLineProjections[lineIndex].isVisible()) {
            lineIndex--;
        }
        if (lineIndex === 0 && !this.modelLineProjections[lineIndex].isVisible()) {
            // Could not reach a real line
            return 1;
        }
        const deltaLineNumber = 1 + this.projectedModelLineLineCounts.getPrefixSum(lineIndex);
        return this.modelLineProjections[lineIndex].getViewLineNumberOfModelPosition(deltaLineNumber, this.model.getLineMaxColumn(lineIndex + 1));
    }
    getDecorationsInRange(range, ownerId, filterOutValidation, filterFontDecorations, onlyMinimapDecorations, onlyMarginDecorations) {
        const modelStart = this.convertViewPositionToModelPosition(range.startLineNumber, range.startColumn);
        const modelEnd = this.convertViewPositionToModelPosition(range.endLineNumber, range.endColumn);
        if (modelEnd.lineNumber - modelStart.lineNumber <= range.endLineNumber - range.startLineNumber) {
            // most likely there are no hidden lines => fast path
            // fetch decorations from column 1 to cover the case of wrapped lines that have whole line decorations at column 1
            return this.model.getDecorationsInRange(new Range(modelStart.lineNumber, 1, modelEnd.lineNumber, modelEnd.column), ownerId, filterOutValidation, filterFontDecorations, onlyMinimapDecorations, onlyMarginDecorations);
        }
        let result = [];
        const modelStartLineIndex = modelStart.lineNumber - 1;
        const modelEndLineIndex = modelEnd.lineNumber - 1;
        let reqStart = null;
        for (let modelLineIndex = modelStartLineIndex; modelLineIndex <= modelEndLineIndex; modelLineIndex++) {
            const line = this.modelLineProjections[modelLineIndex];
            if (line.isVisible()) {
                // merge into previous request
                if (reqStart === null) {
                    reqStart = new Position(modelLineIndex + 1, modelLineIndex === modelStartLineIndex ? modelStart.column : 1);
                }
            }
            else {
                // hit invisible line => flush request
                if (reqStart !== null) {
                    const maxLineColumn = this.model.getLineMaxColumn(modelLineIndex);
                    result = result.concat(this.model.getDecorationsInRange(new Range(reqStart.lineNumber, reqStart.column, modelLineIndex, maxLineColumn), ownerId, filterOutValidation, filterFontDecorations, onlyMinimapDecorations));
                    reqStart = null;
                }
            }
        }
        if (reqStart !== null) {
            result = result.concat(this.model.getDecorationsInRange(new Range(reqStart.lineNumber, reqStart.column, modelEnd.lineNumber, modelEnd.column), ownerId, filterOutValidation, filterFontDecorations, onlyMinimapDecorations));
            reqStart = null;
        }
        result.sort((a, b) => {
            const res = Range.compareRangesUsingStarts(a.range, b.range);
            if (res === 0) {
                if (a.id < b.id) {
                    return -1;
                }
                if (a.id > b.id) {
                    return 1;
                }
                return 0;
            }
            return res;
        });
        // Eliminate duplicate decorations that might have intersected our visible ranges multiple times
        const finalResult = [];
        let finalResultLen = 0;
        let prevDecId = null;
        for (const dec of result) {
            const decId = dec.id;
            if (prevDecId === decId) {
                // skip
                continue;
            }
            prevDecId = decId;
            finalResult[finalResultLen++] = dec;
        }
        return finalResult;
    }
    getInjectedTextAt(position) {
        const info = this.getViewLineInfo(position.lineNumber);
        return this.modelLineProjections[info.modelLineNumber - 1].getInjectedTextAt(info.modelLineWrappedLineIdx, position.column);
    }
    normalizePosition(position, affinity) {
        const info = this.getViewLineInfo(position.lineNumber);
        return this.modelLineProjections[info.modelLineNumber - 1].normalizePosition(info.modelLineWrappedLineIdx, position, affinity);
    }
    getLineIndentColumn(lineNumber) {
        const info = this.getViewLineInfo(lineNumber);
        if (info.modelLineWrappedLineIdx === 0) {
            return this.model.getLineIndentColumn(info.modelLineNumber);
        }
        // wrapped lines have no indentation.
        // We deliberately don't handle the case that indentation is wrapped
        // to avoid two view lines reporting indentation for the very same model line.
        return 0;
    }
}
/**
 * Overlapping unsorted ranges:
 * [   )      [ )       [  )
 *    [    )      [       )
 * ->
 * Non overlapping sorted ranges:
 * [       )  [ ) [        )
 *
 * Note: This function only considers line information! Columns are ignored.
*/
function normalizeLineRanges(ranges) {
    if (ranges.length === 0) {
        return [];
    }
    const sortedRanges = ranges.slice();
    sortedRanges.sort(Range.compareRangesUsingStarts);
    const result = [];
    let currentRangeStart = sortedRanges[0].startLineNumber;
    let currentRangeEnd = sortedRanges[0].endLineNumber;
    for (let i = 1, len = sortedRanges.length; i < len; i++) {
        const range = sortedRanges[i];
        if (range.startLineNumber > currentRangeEnd + 1) {
            result.push(new Range(currentRangeStart, 1, currentRangeEnd, 1));
            currentRangeStart = range.startLineNumber;
            currentRangeEnd = range.endLineNumber;
        }
        else if (range.endLineNumber > currentRangeEnd) {
            currentRangeEnd = range.endLineNumber;
        }
    }
    result.push(new Range(currentRangeStart, 1, currentRangeEnd, 1));
    return result;
}
/**
 * Represents a view line. Can be used to efficiently query more information about it.
 */
class ViewLineInfo {
    get isWrappedLineContinuation() {
        return this.modelLineWrappedLineIdx > 0;
    }
    constructor(modelLineNumber, modelLineWrappedLineIdx) {
        this.modelLineNumber = modelLineNumber;
        this.modelLineWrappedLineIdx = modelLineWrappedLineIdx;
    }
}
/**
 * A list of view lines that have a contiguous span in the model.
*/
class ViewLineInfoGroupedByModelRange {
    constructor(modelRange, viewLines) {
        this.modelRange = modelRange;
        this.viewLines = viewLines;
    }
}
class CoordinatesConverter {
    constructor(lines) {
        this._lines = lines;
    }
    // View -> Model conversion and related methods
    convertViewPositionToModelPosition(viewPosition) {
        return this._lines.convertViewPositionToModelPosition(viewPosition.lineNumber, viewPosition.column);
    }
    convertViewRangeToModelRange(viewRange) {
        return this._lines.convertViewRangeToModelRange(viewRange);
    }
    validateViewPosition(viewPosition, expectedModelPosition) {
        return this._lines.validateViewPosition(viewPosition.lineNumber, viewPosition.column, expectedModelPosition);
    }
    validateViewRange(viewRange, expectedModelRange) {
        return this._lines.validateViewRange(viewRange, expectedModelRange);
    }
    // Model -> View conversion and related methods
    convertModelPositionToViewPosition(modelPosition, affinity, allowZero, belowHiddenRanges) {
        return this._lines.convertModelPositionToViewPosition(modelPosition.lineNumber, modelPosition.column, affinity, allowZero, belowHiddenRanges);
    }
    convertModelRangeToViewRange(modelRange, affinity) {
        return this._lines.convertModelRangeToViewRange(modelRange, affinity);
    }
    modelPositionIsVisible(modelPosition) {
        return this._lines.modelPositionIsVisible(modelPosition.lineNumber, modelPosition.column);
    }
    getModelLineViewLineCount(modelLineNumber) {
        return this._lines.getModelLineViewLineCount(modelLineNumber);
    }
    getViewLineNumberOfModelPosition(modelLineNumber, modelColumn) {
        return this._lines.getViewLineNumberOfModelPosition(modelLineNumber, modelColumn);
    }
}
var IndentGuideRepeatOption;
(function (IndentGuideRepeatOption) {
    IndentGuideRepeatOption[IndentGuideRepeatOption["BlockNone"] = 0] = "BlockNone";
    IndentGuideRepeatOption[IndentGuideRepeatOption["BlockSubsequent"] = 1] = "BlockSubsequent";
    IndentGuideRepeatOption[IndentGuideRepeatOption["BlockAll"] = 2] = "BlockAll";
})(IndentGuideRepeatOption || (IndentGuideRepeatOption = {}));
export class ViewModelLinesFromModelAsIs {
    constructor(model) {
        this.model = model;
    }
    dispose() {
    }
    createCoordinatesConverter() {
        return new IdentityCoordinatesConverter(this.model);
    }
    getHiddenAreas() {
        return [];
    }
    setHiddenAreas(_ranges) {
        return false;
    }
    setTabSize(_newTabSize) {
        return false;
    }
    setWrappingSettings(_fontInfo, _wrappingStrategy, _wrappingColumn, _wrappingIndent) {
        return false;
    }
    createLineBreaksComputer() {
        const result = [];
        return {
            addRequest: (lineText, injectedText, previousLineBreakData) => {
                result.push(null);
            },
            finalize: () => {
                return result;
            }
        };
    }
    onModelFlushed() {
    }
    onModelLinesDeleted(_versionId, fromLineNumber, toLineNumber) {
        return new viewEvents.ViewLinesDeletedEvent(fromLineNumber, toLineNumber);
    }
    onModelLinesInserted(_versionId, fromLineNumber, toLineNumber, lineBreaks) {
        return new viewEvents.ViewLinesInsertedEvent(fromLineNumber, toLineNumber);
    }
    onModelLineChanged(_versionId, lineNumber, lineBreakData) {
        return [false, new viewEvents.ViewLinesChangedEvent(lineNumber, 1), null, null];
    }
    acceptVersionId(_versionId) {
    }
    getViewLineCount() {
        return this.model.getLineCount();
    }
    getActiveIndentGuide(viewLineNumber, _minLineNumber, _maxLineNumber) {
        return {
            startLineNumber: viewLineNumber,
            endLineNumber: viewLineNumber,
            indent: 0
        };
    }
    getViewLinesBracketGuides(startLineNumber, endLineNumber, activePosition) {
        return new Array(endLineNumber - startLineNumber + 1).fill([]);
    }
    getViewLinesIndentGuides(viewStartLineNumber, viewEndLineNumber) {
        const viewLineCount = viewEndLineNumber - viewStartLineNumber + 1;
        const result = new Array(viewLineCount);
        for (let i = 0; i < viewLineCount; i++) {
            result[i] = 0;
        }
        return result;
    }
    getViewLineContent(viewLineNumber) {
        return this.model.getLineContent(viewLineNumber);
    }
    getViewLineLength(viewLineNumber) {
        return this.model.getLineLength(viewLineNumber);
    }
    getViewLineMinColumn(viewLineNumber) {
        return this.model.getLineMinColumn(viewLineNumber);
    }
    getViewLineMaxColumn(viewLineNumber) {
        return this.model.getLineMaxColumn(viewLineNumber);
    }
    getViewLineData(viewLineNumber) {
        const lineTokens = this.model.tokenization.getLineTokens(viewLineNumber);
        const lineContent = lineTokens.getLineContent();
        return new ViewLineData(lineContent, false, 1, lineContent.length + 1, 0, lineTokens.inflate(), null);
    }
    getViewLinesData(viewStartLineNumber, viewEndLineNumber, needed) {
        const lineCount = this.model.getLineCount();
        viewStartLineNumber = Math.min(Math.max(1, viewStartLineNumber), lineCount);
        viewEndLineNumber = Math.min(Math.max(1, viewEndLineNumber), lineCount);
        const result = [];
        for (let lineNumber = viewStartLineNumber; lineNumber <= viewEndLineNumber; lineNumber++) {
            const idx = lineNumber - viewStartLineNumber;
            result[idx] = needed[idx] ? this.getViewLineData(lineNumber) : null;
        }
        return result;
    }
    getDecorationsInRange(range, ownerId, filterOutValidation, filterFontDecorations, onlyMinimapDecorations, onlyMarginDecorations) {
        return this.model.getDecorationsInRange(range, ownerId, filterOutValidation, filterFontDecorations, onlyMinimapDecorations, onlyMarginDecorations);
    }
    normalizePosition(position, affinity) {
        return this.model.normalizePosition(position, affinity);
    }
    getLineIndentColumn(lineNumber) {
        return this.model.getLineIndentColumn(lineNumber);
    }
    getInjectedTextAt(position) {
        // Identity lines collection does not support injected text.
        return null;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmlld01vZGVsTGluZXMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9hZHZpa2FyL0RvY3VtZW50cy9hcmNoaXRlY3QvYXJjaDIvQXJjaElERS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29tbW9uL3ZpZXdNb2RlbC92aWV3TW9kZWxMaW5lcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEtBQUssTUFBTSxNQUFNLGdDQUFnQyxDQUFDO0FBSXpELE9BQU8sRUFBYSxRQUFRLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQztBQUMxRCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0JBQWtCLENBQUM7QUFFekMsT0FBTyxFQUErQyxXQUFXLEVBQUUseUJBQXlCLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUM1SCxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUMvRCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUN6RCxPQUFPLEtBQUssVUFBVSxNQUFNLGtCQUFrQixDQUFDO0FBQy9DLE9BQU8sRUFBRSx5QkFBeUIsRUFBd0IsTUFBTSwwQkFBMEIsQ0FBQztBQUUzRixPQUFPLEVBQUUsNkJBQTZCLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUM5RSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0saUJBQWlCLENBQUM7QUFDL0MsT0FBTyxFQUF5Qiw0QkFBNEIsRUFBRSxNQUFNLDRCQUE0QixDQUFDO0FBd0NqRyxNQUFNLE9BQU8sZ0NBQWdDO0lBeUI1QyxZQUNDLFFBQWdCLEVBQ2hCLEtBQWlCLEVBQ2pCLDRCQUF3RCxFQUN4RCxrQ0FBOEQsRUFDOUQsUUFBa0IsRUFDbEIsT0FBZSxFQUNmLGdCQUF1QyxFQUN2QyxjQUFzQixFQUN0QixjQUE4QixFQUM5QixTQUErQixFQUMvQixzQkFBK0I7UUFFL0IsSUFBSSxDQUFDLFNBQVMsR0FBRyxRQUFRLENBQUM7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