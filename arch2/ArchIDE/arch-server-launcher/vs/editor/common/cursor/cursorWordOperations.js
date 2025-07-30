/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as strings from '../../../base/common/strings.js';
import { SingleCursorState } from '../cursorCommon.js';
import { DeleteOperations } from './cursorDeleteOperations.js';
import { getMapForWordSeparators } from '../core/wordCharacterClassifier.js';
import { Position } from '../core/position.js';
import { Range } from '../core/range.js';
var WordType;
(function (WordType) {
    WordType[WordType["None"] = 0] = "None";
    WordType[WordType["Regular"] = 1] = "Regular";
    WordType[WordType["Separator"] = 2] = "Separator";
})(WordType || (WordType = {}));
export var WordNavigationType;
(function (WordNavigationType) {
    WordNavigationType[WordNavigationType["WordStart"] = 0] = "WordStart";
    WordNavigationType[WordNavigationType["WordStartFast"] = 1] = "WordStartFast";
    WordNavigationType[WordNavigationType["WordEnd"] = 2] = "WordEnd";
    WordNavigationType[WordNavigationType["WordAccessibility"] = 3] = "WordAccessibility"; // Respect chrome definition of a word
})(WordNavigationType || (WordNavigationType = {}));
export class WordOperations {
    static _createWord(lineContent, wordType, nextCharClass, start, end) {
        // console.log('WORD ==> ' + start + ' => ' + end + ':::: <<<' + lineContent.substring(start, end) + '>>>');
        return { start: start, end: end, wordType: wordType, nextCharClass: nextCharClass };
    }
    static _createIntlWord(intlWord, nextCharClass) {
        // console.log('INTL WORD ==> ' + intlWord.index + ' => ' + intlWord.index + intlWord.segment.length + ':::: <<<' + intlWord.segment + '>>>');
        return { start: intlWord.index, end: intlWord.index + intlWord.segment.length, wordType: 1 /* WordType.Regular */, nextCharClass: nextCharClass };
    }
    static _findPreviousWordOnLine(wordSeparators, model, position) {
        const lineContent = model.getLineContent(position.lineNumber);
        return this._doFindPreviousWordOnLine(lineContent, wordSeparators, position);
    }
    static _doFindPreviousWordOnLine(lineContent, wordSeparators, position) {
        let wordType = 0 /* WordType.None */;
        const previousIntlWord = wordSeparators.findPrevIntlWordBeforeOrAtOffset(lineContent, position.column - 2);
        for (let chIndex = position.column - 2; chIndex >= 0; chIndex--) {
            const chCode = lineContent.charCodeAt(chIndex);
            const chClass = wordSeparators.get(chCode);
            if (previousIntlWord && chIndex === previousIntlWord.index) {
                return this._createIntlWord(previousIntlWord, chClass);
            }
            if (chClass === 0 /* WordCharacterClass.Regular */) {
                if (wordType === 2 /* WordType.Separator */) {
                    return this._createWord(lineContent, wordType, chClass, chIndex + 1, this._findEndOfWord(lineContent, wordSeparators, wordType, chIndex + 1));
                }
                wordType = 1 /* WordType.Regular */;
            }
            else if (chClass === 2 /* WordCharacterClass.WordSeparator */) {
                if (wordType === 1 /* WordType.Regular */) {
                    return this._createWord(lineContent, wordType, chClass, chIndex + 1, this._findEndOfWord(lineContent, wordSeparators, wordType, chIndex + 1));
                }
                wordType = 2 /* WordType.Separator */;
            }
            else if (chClass === 1 /* WordCharacterClass.Whitespace */) {
                if (wordType !== 0 /* WordType.None */) {
                    return this._createWord(lineContent, wordType, chClass, chIndex + 1, this._findEndOfWord(lineContent, wordSeparators, wordType, chIndex + 1));
                }
            }
        }
        if (wordType !== 0 /* WordType.None */) {
            return this._createWord(lineContent, wordType, 1 /* WordCharacterClass.Whitespace */, 0, this._findEndOfWord(lineContent, wordSeparators, wordType, 0));
        }
        return null;
    }
    static _findEndOfWord(lineContent, wordSeparators, wordType, startIndex) {
        const nextIntlWord = wordSeparators.findNextIntlWordAtOrAfterOffset(lineContent, startIndex);
        const len = lineContent.length;
        for (let chIndex = startIndex; chIndex < len; chIndex++) {
            const chCode = lineContent.charCodeAt(chIndex);
            const chClass = wordSeparators.get(chCode);
            if (nextIntlWord && chIndex === nextIntlWord.index + nextIntlWord.segment.length) {
                return chIndex;
            }
            if (chClass === 1 /* WordCharacterClass.Whitespace */) {
                return chIndex;
            }
            if (wordType === 1 /* WordType.Regular */ && chClass === 2 /* WordCharacterClass.WordSeparator */) {
                return chIndex;
            }
            if (wordType === 2 /* WordType.Separator */ && chClass === 0 /* WordCharacterClass.Regular */) {
                return chIndex;
            }
        }
        return len;
    }
    static _findNextWordOnLine(wordSeparators, model, position) {
        const lineContent = model.getLineContent(position.lineNumber);
        return this._doFindNextWordOnLine(lineContent, wordSeparators, position);
    }
    static _doFindNextWordOnLine(lineContent, wordSeparators, position) {
        let wordType = 0 /* WordType.None */;
        const len = lineContent.length;
        const nextIntlWord = wordSeparators.findNextIntlWordAtOrAfterOffset(lineContent, position.column - 1);
        for (let chIndex = position.column - 1; chIndex < len; chIndex++) {
            const chCode = lineContent.charCodeAt(chIndex);
            const chClass = wordSeparators.get(chCode);
            if (nextIntlWord && chIndex === nextIntlWord.index) {
                return this._createIntlWord(nextIntlWord, chClass);
            }
            if (chClass === 0 /* WordCharacterClass.Regular */) {
                if (wordType === 2 /* WordType.Separator */) {
                    return this._createWord(lineContent, wordType, chClass, this._findStartOfWord(lineContent, wordSeparators, wordType, chIndex - 1), chIndex);
                }
                wordType = 1 /* WordType.Regular */;
            }
            else if (chClass === 2 /* WordCharacterClass.WordSeparator */) {
                if (wordType === 1 /* WordType.Regular */) {
                    return this._createWord(lineContent, wordType, chClass, this._findStartOfWord(lineContent, wordSeparators, wordType, chIndex - 1), chIndex);
                }
                wordType = 2 /* WordType.Separator */;
            }
            else if (chClass === 1 /* WordCharacterClass.Whitespace */) {
                if (wordType !== 0 /* WordType.None */) {
                    return this._createWord(lineContent, wordType, chClass, this._findStartOfWord(lineContent, wordSeparators, wordType, chIndex - 1), chIndex);
                }
            }
        }
        if (wordType !== 0 /* WordType.None */) {
            return this._createWord(lineContent, wordType, 1 /* WordCharacterClass.Whitespace */, this._findStartOfWord(lineContent, wordSeparators, wordType, len - 1), len);
        }
        return null;
    }
    static _findStartOfWord(lineContent, wordSeparators, wordType, startIndex) {
        const previousIntlWord = wordSeparators.findPrevIntlWordBeforeOrAtOffset(lineContent, startIndex);
        for (let chIndex = startIndex; chIndex >= 0; chIndex--) {
            const chCode = lineContent.charCodeAt(chIndex);
            const chClass = wordSeparators.get(chCode);
            if (previousIntlWord && chIndex === previousIntlWord.index) {
                return chIndex;
            }
            if (chClass === 1 /* WordCharacterClass.Whitespace */) {
                return chIndex + 1;
            }
            if (wordType === 1 /* WordType.Regular */ && chClass === 2 /* WordCharacterClass.WordSeparator */) {
                return chIndex + 1;
            }
            if (wordType === 2 /* WordType.Separator */ && chClass === 0 /* WordCharacterClass.Regular */) {
                return chIndex + 1;
            }
        }
        return 0;
    }
    static moveWordLeft(wordSeparators, model, position, wordNavigationType, hasMulticursor) {
        let lineNumber = position.lineNumber;
        let column = position.column;
        if (column === 1) {
            if (lineNumber > 1) {
                lineNumber = lineNumber - 1;
                column = model.getLineMaxColumn(lineNumber);
            }
        }
        let prevWordOnLine = WordOperations._findPreviousWordOnLine(wordSeparators, model, new Position(lineNumber, column));
        if (wordNavigationType === 0 /* WordNavigationType.WordStart */) {
            return new Position(lineNumber, prevWordOnLine ? prevWordOnLine.start + 1 : 1);
        }
        if (wordNavigationType === 1 /* WordNavigationType.WordStartFast */) {
            if (!hasMulticursor // avoid having multiple cursors stop at different locations when doing word start
                && prevWordOnLine
                && prevWordOnLine.wordType === 2 /* WordType.Separator */
                && prevWordOnLine.end - prevWordOnLine.start === 1
                && prevWordOnLine.nextCharClass === 0 /* WordCharacterClass.Regular */) {
                // Skip over a word made up of one single separator and followed by a regular character
                prevWordOnLine = WordOperations._findPreviousWordOnLine(wordSeparators, model, new Position(lineNumber, prevWordOnLine.start + 1));
            }
            return new Position(lineNumber, prevWordOnLine ? prevWordOnLine.start + 1 : 1);
        }
        if (wordNavigationType === 3 /* WordNavigationType.WordAccessibility */) {
            while (prevWordOnLine
                && prevWordOnLine.wordType === 2 /* WordType.Separator */) {
                // Skip over words made up of only separators
                prevWordOnLine = WordOperations._findPreviousWordOnLine(wordSeparators, model, new Position(lineNumber, prevWordOnLine.start + 1));
            }
            return new Position(lineNumber, prevWordOnLine ? prevWordOnLine.start + 1 : 1);
        }
        // We are stopping at the ending of words
        if (prevWordOnLine && column <= prevWordOnLine.end + 1) {
            prevWordOnLine = WordOperations._findPreviousWordOnLine(wordSeparators, model, new Position(lineNumber, prevWordOnLine.start + 1));
        }
        return new Position(lineNumber, prevWordOnLine ? prevWordOnLine.end + 1 : 1);
    }
    static _moveWordPartLeft(model, position) {
        const lineNumber = position.lineNumber;
        const maxColumn = model.getLineMaxColumn(lineNumber);
        if (position.column === 1) {
            return (lineNumber > 1 ? new Position(lineNumber - 1, model.getLineMaxColumn(lineNumber - 1)) : position);
        }
        const lineContent = model.getLineContent(lineNumber);
        for (let column = position.column - 1; column > 1; column--) {
            const left = lineContent.charCodeAt(column - 2);
            const right = lineContent.charCodeAt(column - 1);
            if (left === 95 /* CharCode.Underline */ && right !== 95 /* CharCode.Underline */) {
                // snake_case_variables
                return new Position(lineNumber, column);
            }
            if (left === 45 /* CharCode.Dash */ && right !== 45 /* CharCode.Dash */) {
                // kebab-case-variables
                return new Position(lineNumber, column);
            }
            if ((strings.isLowerAsciiLetter(left) || strings.isAsciiDigit(left)) && strings.isUpperAsciiLetter(right)) {
                // camelCaseVariables
                return new Position(lineNumber, column);
            }
            if (strings.isUpperAsciiLetter(left) && strings.isUpperAsciiLetter(right)) {
                // thisIsACamelCaseWithOneLetterWords
                if (column + 1 < maxColumn) {
                    const rightRight = lineContent.charCodeAt(column);
                    if (strings.isLowerAsciiLetter(rightRight) || strings.isAsciiDigit(rightRight)) {
                        return new Position(lineNumber, column);
                    }
                }
            }
        }
        return new Position(lineNumber, 1);
    }
    static moveWordRight(wordSeparators, model, position, wordNavigationType) {
        let lineNumber = position.lineNumber;
        let column = position.column;
        let movedDown = false;
        if (column === model.getLineMaxColumn(lineNumber)) {
            if (lineNumber < model.getLineCount()) {
                movedDown = true;
                lineNumber = lineNumber + 1;
                column = 1;
            }
        }
        let nextWordOnLine = WordOperations._findNextWordOnLine(wordSeparators, model, new Position(lineNumber, column));
        if (wordNavigationType === 2 /* WordNavigationType.WordEnd */) {
            if (nextWordOnLine && nextWordOnLine.wordType === 2 /* WordType.Separator */) {
                if (nextWordOnLine.end - nextWordOnLine.start === 1 && nextWordOnLine.nextCharClass === 0 /* WordCharacterClass.Regular */) {
                    // Skip over a word made up of one single separator and followed by a regular character
                    nextWordOnLine = WordOperations._findNextWordOnLine(wordSeparators, model, new Position(lineNumber, nextWordOnLine.end + 1));
                }
            }
            if (nextWordOnLine) {
                column = nextWordOnLine.end + 1;
            }
            else {
                column = model.getLineMaxColumn(lineNumber);
            }
        }
        else if (wordNavigationType === 3 /* WordNavigationType.WordAccessibility */) {
            if (movedDown) {
                // If we move to the next line, pretend that the cursor is right before the first character.
                // This is needed when the first word starts right at the first character - and in order not to miss it,
                // we need to start before.
                column = 0;
            }
            while (nextWordOnLine
                && (nextWordOnLine.wordType === 2 /* WordType.Separator */
                    || nextWordOnLine.start + 1 <= column)) {
                // Skip over a word made up of one single separator
                // Also skip over word if it begins before current cursor position to ascertain we're moving forward at least 1 character.
                nextWordOnLine = WordOperations._findNextWordOnLine(wordSeparators, model, new Position(lineNumber, nextWordOnLine.end + 1));
            }
            if (nextWordOnLine) {
                column = nextWordOnLine.start + 1;
            }
            else {
                column = model.getLineMaxColumn(lineNumber);
            }
        }
        else {
            if (nextWordOnLine && !movedDown && column >= nextWordOnLine.start + 1) {
                nextWordOnLine = WordOperations._findNextWordOnLine(wordSeparators, model, new Position(lineNumber, nextWordOnLine.end + 1));
            }
            if (nextWordOnLine) {
                column = nextWordOnLine.start + 1;
            }
            else {
                column = model.getLineMaxColumn(lineNumber);
            }
        }
        return new Position(lineNumber, column);
    }
    static _moveWordPartRight(model, position) {
        const lineNumber = position.lineNumber;
        const maxColumn = model.getLineMaxColumn(lineNumber);
        if (position.column === maxColumn) {
            return (lineNumber < model.getLineCount() ? new Position(lineNumber + 1, 1) : position);
        }
        const lineContent = model.getLineContent(lineNumber);
        for (let column = position.column + 1; column < maxColumn; column++) {
            const left = lineContent.charCodeAt(column - 2);
            const right = lineContent.charCodeAt(column - 1);
            if (left !== 95 /* CharCode.Underline */ && right === 95 /* CharCode.Underline */) {
                // snake_case_variables
                return new Position(lineNumber, column);
            }
            if (left !== 45 /* CharCode.Dash */ && right === 45 /* CharCode.Dash */) {
                // kebab-case-variables
                return new Position(lineNumber, column);
            }
            if ((strings.isLowerAsciiLetter(left) || strings.isAsciiDigit(left)) && strings.isUpperAsciiLetter(right)) {
                // camelCaseVariables
                return new Position(lineNumber, column);
            }
            if (strings.isUpperAsciiLetter(left) && strings.isUpperAsciiLetter(right)) {
                // thisIsACamelCaseWithOneLetterWords
                if (column + 1 < maxColumn) {
                    const rightRight = lineContent.charCodeAt(column);
                    if (strings.isLowerAsciiLetter(rightRight) || strings.isAsciiDigit(rightRight)) {
                        return new Position(lineNumber, column);
                    }
                }
            }
        }
        return new Position(lineNumber, maxColumn);
    }
    static _deleteWordLeftWhitespace(model, position) {
        const lineContent = model.getLineContent(position.lineNumber);
        const startIndex = position.column - 2;
        const lastNonWhitespace = strings.lastNonWhitespaceIndex(lineContent, startIndex);
        if (lastNonWhitespace + 1 < startIndex) {
            return new Range(position.lineNumber, lastNonWhitespace + 2, position.lineNumber, position.column);
        }
        return null;
    }
    static deleteWordLeft(ctx, wordNavigationType) {
        const wordSeparators = ctx.wordSeparators;
        const model = ctx.model;
        const selection = ctx.selection;
        const whitespaceHeuristics = ctx.whitespaceHeuristics;
        if (!selection.isEmpty()) {
            return selection;
        }
        if (DeleteOperations.isAutoClosingPairDelete(ctx.autoClosingDelete, ctx.autoClosingBrackets, ctx.autoClosingQuotes, ctx.autoClosingPairs.autoClosingPairsOpenByEnd, ctx.model, [ctx.selection], ctx.autoClosedCharacters)) {
            const position = ctx.selection.getPosition();
            return new Range(position.lineNumber, position.column - 1, position.lineNumber, position.column + 1);
        }
        const position = new Position(selection.positionLineNumber, selection.positionColumn);
        let lineNumber = position.lineNumber;
        let column = position.column;
        if (lineNumber === 1 && column === 1) {
            // Ignore deleting at beginning of file
            return null;
        }
        if (whitespaceHeuristics) {
            const r = this._deleteWordLeftWhitespace(model, position);
            if (r) {
                return r;
            }
        }
        let prevWordOnLine = WordOperations._findPreviousWordOnLine(wordSeparators, model, position);
        if (wordNavigationType === 0 /* WordNavigationType.WordStart */) {
            if (prevWordOnLine) {
                column = prevWordOnLine.start + 1;
            }
            else {
                if (column > 1) {
                    column = 1;
                }
                else {
                    lineNumber--;
                    column = model.getLineMaxColumn(lineNumber);
                }
            }
        }
        else {
            if (prevWordOnLine && column <= prevWordOnLine.end + 1) {
                prevWordOnLine = WordOperations._findPreviousWordOnLine(wordSeparators, model, new Position(lineNumber, prevWordOnLine.start + 1));
            }
            if (prevWordOnLine) {
                column = prevWordOnLine.end + 1;
            }
            else {
                if (column > 1) {
                    column = 1;
                }
                else {
                    lineNumber--;
                    column = model.getLineMaxColumn(lineNumber);
                }
            }
        }
        return new Range(lineNumber, column, position.lineNumber, position.column);
    }
    static deleteInsideWord(wordSeparators, model, selection) {
        if (!selection.isEmpty()) {
            return selection;
        }
        const position = new Position(selection.positionLineNumber, selection.positionColumn);
        const r = this._deleteInsideWordWhitespace(model, position);
        if (r) {
            return r;
        }
        return this._deleteInsideWordDetermineDeleteRange(wordSeparators, model, position);
    }
    static _charAtIsWhitespace(str, index) {
        const charCode = str.charCodeAt(index);
        return (charCode === 32 /* CharCode.Space */ || charCode === 9 /* CharCode.Tab */);
    }
    static _deleteInsideWordWhitespace(model, position) {
        const lineContent = model.getLineContent(position.lineNumber);
        const lineContentLength = lineContent.length;
        if (lineContentLength === 0) {
            // empty line
            return null;
        }
        let leftIndex = Math.max(position.column - 2, 0);
        if (!this._charAtIsWhitespace(lineContent, leftIndex)) {
            // touches a non-whitespace character to the left
            return null;
        }
        let rightIndex = Math.min(position.column - 1, lineContentLength - 1);
        if (!this._charAtIsWhitespace(lineContent, rightIndex)) {
            // touches a non-whitespace character to the right
            return null;
        }
        // walk over whitespace to the left
        while (leftIndex > 0 && this._charAtIsWhitespace(lineContent, leftIndex - 1)) {
            leftIndex--;
        }
        // walk over whitespace to the right
        while (rightIndex + 1 < lineContentLength && this._charAtIsWhitespace(lineContent, rightIndex + 1)) {
            rightIndex++;
        }
        return new Range(position.lineNumber, leftIndex + 1, position.lineNumber, rightIndex + 2);
    }
    static _deleteInsideWordDetermineDeleteRange(wordSeparators, model, position) {
        const lineContent = model.getLineContent(position.lineNumber);
        const lineLength = lineContent.length;
        if (lineLength === 0) {
            // empty line
            if (position.lineNumber > 1) {
                return new Range(position.lineNumber - 1, model.getLineMaxColumn(position.lineNumber - 1), position.lineNumber, 1);
            }
            else {
                if (position.lineNumber < model.getLineCount()) {
                    return new Range(position.lineNumber, 1, position.lineNumber + 1, 1);
                }
                else {
                    // empty model
                    return new Range(position.lineNumber, 1, position.lineNumber, 1);
                }
            }
        }
        const touchesWord = (word) => {
            return (word.start + 1 <= position.column && position.column <= word.end + 1);
        };
        const createRangeWithPosition = (startColumn, endColumn) => {
            startColumn = Math.min(startColumn, position.column);
            endColumn = Math.max(endColumn, position.column);
            return new Range(position.lineNumber, startColumn, position.lineNumber, endColumn);
        };
        const deleteWordAndAdjacentWhitespace = (word) => {
            let startColumn = word.start + 1;
            let endColumn = word.end + 1;
            let expandedToTheRight = false;
            while (endColumn - 1 < lineLength && this._charAtIsWhitespace(lineContent, endColumn - 1)) {
                expandedToTheRight = true;
                endColumn++;
            }
            if (!expandedToTheRight) {
                while (startColumn > 1 && this._charAtIsWhitespace(lineContent, startColumn - 2)) {
                    startColumn--;
                }
            }
            return createRangeWithPosition(startColumn, endColumn);
        };
        const prevWordOnLine = WordOperations._findPreviousWordOnLine(wordSeparators, model, position);
        if (prevWordOnLine && touchesWord(prevWordOnLine)) {
            return deleteWordAndAdjacentWhitespace(prevWordOnLine);
        }
        const nextWordOnLine = WordOperations._findNextWordOnLine(wordSeparators, model, position);
        if (nextWordOnLine && touchesWord(nextWordOnLine)) {
            return deleteWordAndAdjacentWhitespace(nextWordOnLine);
        }
        if (prevWordOnLine && nextWordOnLine) {
            return createRangeWithPosition(prevWordOnLine.end + 1, nextWordOnLine.start + 1);
        }
        if (prevWordOnLine) {
            return createRangeWithPosition(prevWordOnLine.start + 1, prevWordOnLine.end + 1);
        }
        if (nextWordOnLine) {
            return createRangeWithPosition(nextWordOnLine.start + 1, nextWordOnLine.end + 1);
        }
        return createRangeWithPosition(1, lineLength + 1);
    }
    static _deleteWordPartLeft(model, selection) {
        if (!selection.isEmpty()) {
            return selection;
        }
        const pos = selection.getPosition();
        const toPosition = WordOperations._moveWordPartLeft(model, pos);
        return new Range(pos.lineNumber, pos.column, toPosition.lineNumber, toPosition.column);
    }
    static _findFirstNonWhitespaceChar(str, startIndex) {
        const len = str.length;
        for (let chIndex = startIndex; chIndex < len; chIndex++) {
            const ch = str.charAt(chIndex);
            if (ch !== ' ' && ch !== '\t') {
                return chIndex;
            }
        }
        return len;
    }
    static _deleteWordRightWhitespace(model, position) {
        const lineContent = model.getLineContent(position.lineNumber);
        const startIndex = position.column - 1;
        const firstNonWhitespace = this._findFirstNonWhitespaceChar(lineContent, startIndex);
        if (startIndex + 1 < firstNonWhitespace) {
            // bingo
            return new Range(position.lineNumber, position.column, position.lineNumber, firstNonWhitespace + 1);
        }
        return null;
    }
    static deleteWordRight(ctx, wordNavigationType) {
        const wordSeparators = ctx.wordSeparators;
        const model = ctx.model;
        const selection = ctx.selection;
        const whitespaceHeuristics = ctx.whitespaceHeuristics;
        if (!selection.isEmpty()) {
            return selection;
        }
        const position = new Position(selection.positionLineNumber, selection.positionColumn);
        let lineNumber = position.lineNumber;
        let column = position.column;
        const lineCount = model.getLineCount();
        const maxColumn = model.getLineMaxColumn(lineNumber);
        if (lineNumber === lineCount && column === maxColumn) {
            // Ignore deleting at end of file
            return null;
        }
        if (whitespaceHeuristics) {
            const r = this._deleteWordRightWhitespace(model, position);
            if (r) {
                return r;
            }
        }
        let nextWordOnLine = WordOperations._findNextWordOnLine(wordSeparators, model, position);
        if (wordNavigationType === 2 /* WordNavigationType.WordEnd */) {
            if (nextWordOnLine) {
                column = nextWordOnLine.end + 1;
            }
            else {
                if (column < maxColumn || lineNumber === lineCount) {
                    column = maxColumn;
                }
                else {
                    lineNumber++;
                    nextWordOnLine = WordOperations._findNextWordOnLine(wordSeparators, model, new Position(lineNumber, 1));
                    if (nextWordOnLine) {
                        column = nextWordOnLine.start + 1;
                    }
                    else {
                        column = model.getLineMaxColumn(lineNumber);
                    }
                }
            }
        }
        else {
            if (nextWordOnLine && column >= nextWordOnLine.start + 1) {
                nextWordOnLine = WordOperations._findNextWordOnLine(wordSeparators, model, new Position(lineNumber, nextWordOnLine.end + 1));
            }
            if (nextWordOnLine) {
                column = nextWordOnLine.start + 1;
            }
            else {
                if (column < maxColumn || lineNumber === lineCount) {
                    column = maxColumn;
                }
                else {
                    lineNumber++;
                    nextWordOnLine = WordOperations._findNextWordOnLine(wordSeparators, model, new Position(lineNumber, 1));
                    if (nextWordOnLine) {
                        column = nextWordOnLine.start + 1;
                    }
                    else {
                        column = model.getLineMaxColumn(lineNumber);
                    }
                }
            }
        }
        return new Range(lineNumber, column, position.lineNumber, position.column);
    }
    static _deleteWordPartRight(model, selection) {
        if (!selection.isEmpty()) {
            return selection;
        }
        const pos = selection.getPosition();
        const toPosition = WordOperations._moveWordPartRight(model, pos);
        return new Range(pos.lineNumber, pos.column, toPosition.lineNumber, toPosition.column);
    }
    static _createWordAtPosition(model, lineNumber, word) {
        const range = new Range(lineNumber, word.start + 1, lineNumber, word.end + 1);
        return {
            word: model.getValueInRange(range),
            startColumn: range.startColumn,
            endColumn: range.endColumn
        };
    }
    static getWordAtPosition(model, _wordSeparators, _intlSegmenterLocales, position) {
        const wordSeparators = getMapForWordSeparators(_wordSeparators, _intlSegmenterLocales);
        const prevWord = WordOperations._findPreviousWordOnLine(wordSeparators, model, position);
        if (prevWord && prevWord.wordType === 1 /* WordType.Regular */ && prevWord.start <= position.column - 1 && position.column - 1 <= prevWord.end) {
            return WordOperations._createWordAtPosition(model, position.lineNumber, prevWord);
        }
        const nextWord = WordOperations._findNextWordOnLine(wordSeparators, model, position);
        if (nextWord && nextWord.wordType === 1 /* WordType.Regular */ && nextWord.start <= position.column - 1 && position.column - 1 <= nextWord.end) {
            return WordOperations._createWordAtPosition(model, position.lineNumber, nextWord);
        }
        return null;
    }
    static word(config, model, cursor, inSelectionMode, position) {
        const wordSeparators = getMapForWordSeparators(config.wordSeparators, config.wordSegmenterLocales);
        const prevWord = WordOperations._findPreviousWordOnLine(wordSeparators, model, position);
        const nextWord = WordOperations._findNextWordOnLine(wordSeparators, model, position);
        if (!inSelectionMode) {
            // Entering word selection for the first time
            let startColumn;
            let endColumn;
            if (prevWord && prevWord.wordType === 1 /* WordType.Regular */ && prevWord.start <= position.column - 1 && position.column - 1 <= prevWord.end) {
                // isTouchingPrevWord
                startColumn = prevWord.start + 1;
                endColumn = prevWord.end + 1;
            }
            else if (nextWord && nextWord.wordType === 1 /* WordType.Regular */ && nextWord.start <= position.column - 1 && position.column - 1 <= nextWord.end) {
                // isTouchingNextWord
                startColumn = nextWord.start + 1;
                endColumn = nextWord.end + 1;
            }
            else {
                if (prevWord) {
                    startColumn = prevWord.end + 1;
                }
                else {
                    startColumn = 1;
                }
                if (nextWord) {
                    endColumn = nextWord.start + 1;
                }
                else {
                    endColumn = model.getLineMaxColumn(position.lineNumber);
                }
            }
            return new SingleCursorState(new Range(position.lineNumber, startColumn, position.lineNumber, endColumn), 1 /* SelectionStartKind.Word */, 0, new Position(position.lineNumber, endColumn), 0);
        }
        let startColumn;
        let endColumn;
        if (prevWord && prevWord.wordType === 1 /* WordType.Regular */ && prevWord.start < position.column - 1 && position.column - 1 < prevWord.end) {
            // isInsidePrevWord
            startColumn = prevWord.start + 1;
            endColumn = prevWord.end + 1;
        }
        else if (nextWord && nextWord.wordType === 1 /* WordType.Regular */ && nextWord.start < position.column - 1 && position.column - 1 < nextWord.end) {
            // isInsideNextWord
            startColumn = nextWord.start + 1;
            endColumn = nextWord.end + 1;
        }
        else {
            startColumn = position.column;
            endColumn = position.column;
        }
        const lineNumber = position.lineNumber;
        let column;
        if (cursor.selectionStart.containsPosition(position)) {
            column = cursor.selectionStart.endColumn;
        }
        else if (position.isBeforeOrEqual(cursor.selectionStart.getStartPosition())) {
            column = startColumn;
            const possiblePosition = new Position(lineNumber, column);
            if (cursor.selectionStart.containsPosition(possiblePosition)) {
                column = cursor.selectionStart.endColumn;
            }
        }
        else {
            column = endColumn;
            const possiblePosition = new Position(lineNumber, column);
            if (cursor.selectionStart.containsPosition(possiblePosition)) {
                column = cursor.selectionStart.startColumn;
            }
        }
        return cursor.move(true, lineNumber, column, 0);
    }
}
export class WordPartOperations extends WordOperations {
    static deleteWordPartLeft(ctx) {
        const candidates = enforceDefined([
            WordOperations.deleteWordLeft(ctx, 0 /* WordNavigationType.WordStart */),
            WordOperations.deleteWordLeft(ctx, 2 /* WordNavigationType.WordEnd */),
            WordOperations._deleteWordPartLeft(ctx.model, ctx.selection)
        ]);
        candidates.sort(Range.compareRangesUsingEnds);
        return candidates[2];
    }
    static deleteWordPartRight(ctx) {
        const candidates = enforceDefined([
            WordOperations.deleteWordRight(ctx, 0 /* WordNavigationType.WordStart */),
            WordOperations.deleteWordRight(ctx, 2 /* WordNavigationType.WordEnd */),
            WordOperations._deleteWordPartRight(ctx.model, ctx.selection)
        ]);
        candidates.sort(Range.compareRangesUsingStarts);
        return candidates[0];
    }
    static moveWordPartLeft(wordSeparators, model, position, hasMulticursor) {
        const candidates = enforceDefined([
            WordOperations.moveWordLeft(wordSeparators, model, position, 0 /* WordNavigationType.WordStart */, hasMulticursor),
            WordOperations.moveWordLeft(wordSeparators, model, position, 2 /* WordNavigationType.WordEnd */, hasMulticursor),
            WordOperations._moveWordPartLeft(model, position)
        ]);
        candidates.sort(Position.compare);
        return candidates[2];
    }
    static moveWordPartRight(wordSeparators, model, position) {
        const candidates = enforceDefined([
            WordOperations.moveWordRight(wordSeparators, model, position, 0 /* WordNavigationType.WordStart */),
            WordOperations.moveWordRight(wordSeparators, model, position, 2 /* WordNavigationType.WordEnd */),
            WordOperations._moveWordPartRight(model, position)
        ]);
        candidates.sort(Position.compare);
        return candidates[0];
    }
}
function enforceDefined(arr) {
    return arr.filter(el => Boolean(el));
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3Vyc29yV29yZE9wZXJhdGlvbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9hZHZpa2FyL0RvY3VtZW50cy9hcmNoaXRlY3QvYXJjaDIvQXJjaElERS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29tbW9uL2N1cnNvci9jdXJzb3JXb3JkT3BlcmF0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEtBQUssT0FBTyxNQUFNLGlDQUFpQyxDQUFDO0FBRTNELE9BQU8sRUFBK0QsaUJBQWlCLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUNwSCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUMvRCxPQUFPLEVBQW9FLHVCQUF1QixFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDL0ksT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHFCQUFxQixDQUFDO0FBQy9DLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQkFBa0IsQ0FBQztBQXlCekMsSUFBVyxRQUlWO0FBSkQsV0FBVyxRQUFRO0lBQ2xCLHVDQUFRLENBQUE7SUFDUiw2Q0FBVyxDQUFBO0lBQ1gsaURBQWEsQ0FBQTtBQUNkLENBQUMsRUFKVSxRQUFRLEtBQVIsUUFBUSxRQUlsQjtBQUVELE1BQU0sQ0FBTixJQUFrQixrQkFLakI7QUFMRCxXQUFrQixrQkFBa0I7SUFDbkMscUVBQWEsQ0FBQTtJQUNiLDZFQUFpQixDQUFBO0lBQ2pCLGlFQUFXLENBQUE7SUFDWCxxRkFBcUIsQ0FBQSxDQUFDLHNDQUFzQztBQUM3RCxDQUFDLEVBTGlCLGtCQUFrQixLQUFsQixrQkFBa0IsUUFLbkM7QUFjRCxNQUFNLE9BQU8sY0FBYztJQUVsQixNQUFNLENBQUMsV0FBVyxDQUFDLFdBQW1CLEVBQUUsUUFBa0IsRUFBRSxhQUFpQyxFQUFFLEtBQWEsRUFBRSxHQUFXO1FBQ2hJLDRHQUE0RztRQUM1RyxPQUFPLEVBQUUsS0FBSyxFQUFF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