/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { binarySearch2 } from '../../../base/common/arrays.js';
import { intersection } from '../../../base/common/collections.js';
export class CustomLine {
    constructor(decorationId, index, lineNumber, specialHeight, prefixSum) {
        this.decorationId = decorationId;
        this.index = index;
        this.lineNumber = lineNumber;
        this.specialHeight = specialHeight;
        this.prefixSum = prefixSum;
        this.maximumSpecialHeight = specialHeight;
        this.deleted = false;
    }
}
/**
 * Manages line heights in the editor with support for custom line heights from decorations.
 *
 * This class maintains an ordered collection of line heights, where each line can have either
 * the default height or a custom height specified by decorations. It supports efficient querying
 * of individual line heights as well as accumulated heights up to a specific line.
 *
 * Line heights are stored in a sorted array for efficient binary search operations. Each line
 * with custom height is represented by a {@link CustomLine} object which tracks its special height,
 * accumulated height prefix sum, and associated decoration ID.
 *
 * The class optimizes performance by:
 * - Using binary search to locate lines in the ordered array
 * - Batching updates through a pending changes mechanism
 * - Computing prefix sums for O(1) accumulated height lookup
 * - Tracking maximum height for lines with multiple decorations
 * - Efficiently handling document changes (line insertions and deletions)
 *
 * When lines are inserted or deleted, the manager updates line numbers and prefix sums
 * for all affected lines. It also handles special cases like decorations that span
 * the insertion/deletion points by re-applying those decorations appropriately.
 *
 * All query operations automatically commit pending changes to ensure consistent results.
 * Clients can modify line heights by adding or removing custom line height decorations,
 * which are tracked by their unique decoration IDs.
 */
export class LineHeightsManager {
    constructor(defaultLineHeight, customLineHeightData) {
        this._decorationIDToCustomLine = new ArrayMap();
        this._orderedCustomLines = [];
        this._pendingSpecialLinesToInsert = [];
        this._invalidIndex = 0;
        this._hasPending = false;
        this._defaultLineHeight = defaultLineHeight;
        if (customLineHeightData.length > 0) {
            for (const data of customLineHeightData) {
                this.insertOrChangeCustomLineHeight(data.decorationId, data.startLineNumber, data.endLineNumber, data.lineHeight);
            }
            this.commit();
        }
    }
    set defaultLineHeight(defaultLineHeight) {
        this._defaultLineHeight = defaultLineHeight;
    }
    get defaultLineHeight() {
        return this._defaultLineHeight;
    }
    removeCustomLineHeight(decorationID) {
        const customLines = this._decorationIDToCustomLine.get(decorationID);
        if (!customLines) {
            return;
        }
        this._decorationIDToCustomLine.delete(decorationID);
        for (const customLine of customLines) {
            customLine.deleted = true;
            this._invalidIndex = Math.min(this._invalidIndex, customLine.index);
        }
        this._hasPending = true;
    }
    insertOrChangeCustomLineHeight(decorationId, startLineNumber, endLineNumber, lineHeight) {
        this.removeCustomLineHeight(decorationId);
        for (let lineNumber = startLineNumber; lineNumber <= endLineNumber; lineNumber++) {
            const customLine = new CustomLine(decorationId, -1, lineNumber, lineHeight, 0);
            this._pendingSpecialLinesToInsert.push(customLine);
        }
        this._hasPending = true;
    }
    heightForLineNumber(lineNumber) {
        const searchIndex = this._binarySearchOverOrderedCustomLinesArray(lineNumber);
        if (searchIndex >= 0) {
            return this._orderedCustomLines[searchIndex].maximumSpecialHeight;
        }
        return this._defaultLineHeight;
    }
    getAccumulatedLineHeightsIncludingLineNumber(lineNumber) {
        const searchIndex = this._binarySearchOverOrderedCustomLinesArray(lineNumber);
        if (searchIndex >= 0) {
            return this._orderedCustomLines[searchIndex].prefixSum + this._orderedCustomLines[searchIndex].maximumSpecialHeight;
        }
        if (searchIndex === -1) {
            return this._defaultLineHeight * lineNumber;
        }
        const modifiedIndex = -(searchIndex + 1);
        const previousSpecialLine = this._orderedCustomLines[modifiedIndex - 1];
        return previousSpecialLine.prefixSum + previousSpecialLine.maximumSpecialHeight + this._defaultLineHeight * (lineNumber - previousSpecialLine.lineNumber);
    }
    onLinesDeleted(fromLineNumber, toLineNumber) {
        const deleteCount = toLineNumber - fromLineNumber + 1;
        const numberOfCustomLines = this._orderedCustomLines.length;
        const candidateStartIndexOfDeletion = this._binarySearchOverOrderedCustomLinesArray(fromLineNumber);
        let startIndexOfDeletion;
        if (candidateStartIndexOfDeletion >= 0) {
            startIndexOfDeletion = candidateStartIndexOfDeletion;
            for (let i = candidateStartIndexOfDeletion - 1; i >= 0; i--) {
                if (this._orderedCustomLines[i].lineNumber === fromLineNumber) {
                    startIndexOfDeletion--;
                }
                else {
                    break;
                }
            }
        }
        else {
            startIndexOfDeletion = candidateStartIndexOfDeletion === -(numberOfCustomLines + 1) && candidateStartIndexOfDeletion !== -1 ? numberOfCustomLines - 1 : -(candidateStartIndexOfDeletion + 1);
        }
        const candidateEndIndexOfDeletion = this._binarySearchOverOrderedCustomLinesArray(toLineNumber);
        let endIndexOfDeletion;
        if (candidateEndIndexOfDeletion >= 0) {
            endIndexOfDeletion = candidateEndIndexOfDeletion;
            for (let i = candidateEndIndexOfDeletion + 1; i < numberOfCustomLines; i++) {
                if (this._orderedCustomLines[i].lineNumber === toLineNumber) {
                    endIndexOfDeletion++;
                }
                else {
                    break;
                }
            }
        }
        else {
            endIndexOfDeletion = candidateEndIndexOfDeletion === -(numberOfCustomLines + 1) && candidateEndIndexOfDeletion !== -1 ? numberOfCustomLines - 1 : -(candidateEndIndexOfDeletion + 1);
        }
        const isEndIndexBiggerThanStartIndex = endIndexOfDeletion > startIndexOfDeletion;
        const isEndIndexEqualToStartIndexAndCoversCustomLine = endIndexOfDeletion === startIndexOfDeletion
            && this._orderedCustomLines[startIndexOfDeletion]
            && this._orderedCustomLines[startIndexOfDeletion].lineNumber >= fromLineNumber
            && this._orderedCustomLines[startIndexOfDeletion].lineNumber <= toLineNumber;
        if (isEndIndexBiggerThanStartIndex || isEndIndexEqualToStartIndexAndCoversCustomLine) {
            let maximumSpecialHeightOnDeletedInterval = 0;
            for (let i = startIndexOfDeletion; i <= endIndexOfDeletion; i++) {
                maximumSpecialHeightOnDeletedInterval = Math.max(maximumSpecialHeightOnDeletedInterval, this._orderedCustomLines[i].maximumSpecialHeight);
            }
            let prefixSumOnDeletedInterval = 0;
            if (startIndexOfDeletion > 0) {
                const previousSpecialLine = this._orderedCustomLines[startIndexOfDeletion - 1];
                prefixSumOnDeletedInterval = previousSpecialLine.prefixSum + previousSpecialLine.maximumSpecialHeight + this._defaultLineHeight * (fromLineNumber - previousSpecialLine.lineNumber - 1);
            }
            else {
                prefixSumOnDeletedInterval = fromLineNumber > 0 ? (fromLineNumber - 1) * this._defaultLineHeight : 0;
            }
            const firstSpecialLineDeleted = this._orderedCustomLines[startIndexOfDeletion];
            const lastSpecialLineDeleted = this._orderedCustomLines[endIndexOfDeletion];
            const firstSpecialLineAfterDeletion = this._orderedCustomLines[endIndexOfDeletion + 1];
            const heightOfFirstLineAfterDeletion = firstSpecialLineAfterDeletion && firstSpecialLineAfterDeletion.lineNumber === toLineNumber + 1 ? firstSpecialLineAfterDeletion.maximumSpecialHeight : this._defaultLineHeight;
            const totalHeightDeleted = lastSpecialLineDeleted.prefixSum
                + lastSpecialLineDeleted.maximumSpecialHeight
                - firstSpecialLineDeleted.prefixSum
                + this._defaultLineHeight * (toLineNumber - lastSpecialLineDeleted.lineNumber)
                + this._defaultLineHeight * (firstSpecialLineDeleted.lineNumber - fromLineNumber)
                + heightOfFirstLineAfterDeletion - maximumSpecialHeightOnDeletedInterval;
            const decorationIdsSeen = new Set();
            const newOrderedCustomLines = [];
            const newDecorationIDToSpecialLine = new ArrayMap();
            let numberOfDeletions = 0;
            for (let i = 0; i < this._orderedCustomLines.length; i++) {
                const customLine = this._orderedCustomLines[i];
                if (i < startIndexOfDeletion) {
                    newOrderedCustomLines.push(customLine);
                    newDecorationIDToSpecialLine.add(customLine.decorationId, customLine);
                }
                else if (i >= startIndexOfDeletion && i <= endIndexOfDeletion) {
                    const decorationId = customLine.decorationId;
                    if (!decorationIdsSeen.has(decorationId)) {
                        customLine.index -= numberOfDeletions;
                        customLine.lineNumber = fromLineNumber;
                        customLine.prefixSum = prefixSumOnDeletedInterval;
                        customLine.maximumSpecialHeight = maximumSpecialHeightOnDeletedInterval;
                        newOrderedCustomLines.push(customLine);
                        newDecorationIDToSpecialLine.add(customLine.decorationId, customLine);
                    }
                    else {
                        numberOfDeletions++;
                    }
                }
                else if (i > endIndexOfDeletion) {
                    customLine.index -= numberOfDeletions;
                    customLine.lineNumber -= deleteCount;
                    customLine.prefixSum -= totalHeightDeleted;
                    newOrderedCustomLines.push(customLine);
                    newDecorationIDToSpecialLine.add(customLine.decorationId, customLine);
                }
                decorationIdsSeen.add(customLine.decorationId);
            }
            this._orderedCustomLines = newOrderedCustomLines;
            this._decorationIDToCustomLine = newDecorationIDToSpecialLine;
        }
        else {
            const totalHeightDeleted = deleteCount * this._defaultLineHeight;
            for (let i = endIndexOfDeletion; i < this._orderedCustomLines.length; i++) {
                const customLine = this._orderedCustomLines[i];
                if (customLine.lineNumber > toLineNumber) {
                    customLine.lineNumber -= deleteCount;
                    customLine.prefixSum -= totalHeightDeleted;
                }
            }
        }
    }
    onLinesInserted(fromLineNumber, toLineNumber) {
        const insertCount = toLineNumber - fromLineNumber + 1;
        const candidateStartIndexOfInsertion = this._binarySearchOverOrderedCustomLinesArray(fromLineNumber);
        let startIndexOfInsertion;
        if (candidateStartIndexOfInsertion >= 0) {
            startIndexOfInsertion = candidateStartIndexOfInsertion;
            for (let i = candidateStartIndexOfInsertion - 1; i >= 0; i--) {
                if (this._orderedCustomLines[i].lineNumber === fromLineNumber) {
                    startIndexOfInsertion--;
                }
                else {
                    break;
                }
            }
        }
        else {
            startIndexOfInsertion = -(candidateStartIndexOfInsertion + 1);
        }
        const toReAdd = [];
        const decorationsImmediatelyAfter = new Set();
        for (let i = startIndexOfInsertion; i < this._orderedCustomLines.length; i++) {
            if (this._orderedCustomLines[i].lineNumber === fromLineNumber) {
                decorationsImmediatelyAfter.add(this._orderedCustomLines[i].decorationId);
            }
        }
        const decorationsImmediatelyBefore = new Set();
        for (let i = startIndexOfInsertion - 1; i >= 0; i--) {
            if (this._orderedCustomLines[i].lineNumber === fromLineNumber - 1) {
                decorationsImmediatelyBefore.add(this._orderedCustomLines[i].decorationId);
            }
        }
        const decorationsWithGaps = intersection(decorationsImmediatelyBefore, decorationsImmediatelyAfter);
        for (let i = startIndexOfInsertion; i < this._orderedCustomLines.length; i++) {
            this._orderedCustomLines[i].lineNumber += insertCount;
            this._orderedCustomLines[i].prefixSum += this._defaultLineHeight * insertCount;
        }
        if (decorationsWithGaps.size > 0) {
            for (const decorationId of decorationsWithGaps) {
                const decoration = this._decorationIDToCustomLine.get(decorationId);
                if (decoration) {
                    const startLineNumber = decoration.reduce((min, l) => Math.min(min, l.lineNumber), fromLineNumber); // min
                    const endLineNumber = decoration.reduce((max, l) => Math.max(max, l.lineNumber), fromLineNumber); // max
                    const lineHeight = decoration.reduce((max, l) => Math.max(max, l.specialHeight), 0);
                    toReAdd.push({
                        decorationId,
                        startLineNumber,
                        endLineNumber,
                        lineHeight
                    });
                }
            }
            for (const dec of toReAdd) {
                this.insertOrChangeCustomLineHeight(dec.decorationId, dec.startLineNumber, dec.endLineNumber, dec.lineHeight);
            }
            this.commit();
        }
    }
    commit() {
        if (!this._hasPending) {
            return;
        }
        for (const pendingChange of this._pendingSpecialLinesToInsert) {
            const candidateInsertionIndex = this._binarySearchOverOrderedCustomLinesArray(pendingChange.lineNumber);
            const insertionIndex = candidateInsertionIndex >= 0 ? candidateInsertionIndex : -(candidateInsertionIndex + 1);
            this._orderedCustomLines.splice(insertionIndex, 0, pendingChange);
            this._invalidIndex = Math.min(this._invalidIndex, insertionIndex);
        }
        this._pendingSpecialLinesToInsert = [];
        const newDecorationIDToSpecialLine = new ArrayMap();
        const newOrderedSpecialLines = [];
        for (let i = 0; i < this._invalidIndex; i++) {
            const customLine = this._orderedCustomLines[i];
            newOrderedSpecialLines.push(customLine);
            newDecorationIDToSpecialLine.add(customLine.decorationId, customLine);
        }
        let numberOfDeletions = 0;
        let previousSpecialLine = (this._invalidIndex > 0) ? newOrderedSpecialLines[this._invalidIndex - 1] : undefined;
        for (let i = this._invalidIndex; i < this._orderedCustomLines.length; i++) {
            const customLine = this._orderedCustomLines[i];
            if (customLine.deleted) {
                numberOfDeletions++;
                continue;
            }
            customLine.index = i - numberOfDeletions;
            if (previousSpecialLine && previousSpecialLine.lineNumber === customLine.lineNumber) {
                customLine.maximumSpecialHeight = previousSpecialLine.maximumSpecialHeight;
                customLine.prefixSum = previousSpecialLine.prefixSum;
            }
            else {
                let maximumSpecialHeight = customLine.specialHeight;
                for (let j = i; j < this._orderedCustomLines.length; j++) {
                    const nextSpecialLine = this._orderedCustomLines[j];
                    if (nextSpecialLine.deleted) {
                        continue;
                    }
                    if (nextSpecialLine.lineNumber !== customLine.lineNumber) {
                        break;
                    }
                    maximumSpecialHeight = Math.max(maximumSpecialHeight, nextSpecialLine.specialHeight);
                }
                customLine.maximumSpecialHeight = maximumSpecialHeight;
                let prefixSum;
                if (previousSpecialLine) {
                    prefixSum = previousSpecialLine.prefixSum + previousSpecialLine.maximumSpecialHeight + this._defaultLineHeight * (customLine.lineNumber - previousSpecialLine.lineNumber - 1);
                }
                else {
                    prefixSum = this._defaultLineHeight * (customLine.lineNumber - 1);
                }
                customLine.prefixSum = prefixSum;
            }
            previousSpecialLine = customLine;
            newOrderedSpecialLines.push(customLine);
            newDecorationIDToSpecialLine.add(customLine.decorationId, customLine);
        }
        this._orderedCustomLines = newOrderedSpecialLines;
        this._decorationIDToCustomLine = newDecorationIDToSpecialLine;
        this._invalidIndex = Infinity;
        this._hasPending = false;
    }
    _binarySearchOverOrderedCustomLinesArray(lineNumber) {
        return binarySearch2(this._orderedCustomLines.length, (index) => {
            const line = this._orderedCustomLines[index];
            if (line.lineNumber === lineNumber) {
                return 0;
            }
            else if (line.lineNumber < lineNumber) {
                return -1;
            }
            else {
                return 1;
            }
        });
    }
}
class ArrayMap {
    constructor() {
        this._map = new Map();
    }
    add(key, value) {
        const array = this._map.get(key);
        if (!array) {
            this._map.set(key, [value]);
        }
        else {
            array.push(value);
        }
    }
    get(key) {
        return this._map.get(key);
    }
    delete(key) {
        this._map.delete(key);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGluZUhlaWdodHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9hZHZpa2FyL0RvY3VtZW50cy9hcmNoaXRlY3QvYXJjaDIvQXJjaElERS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29tbW9uL3ZpZXdMYXlvdXQvbGluZUhlaWdodHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQy9ELE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUVuRSxNQUFNLE9BQU8sVUFBVTtJQVV0QixZQUFZLFlBQW9CLEVBQUUsS0FBYSxFQUFFLFVBQWtCLEVBQUUsYUFBcUIsRUFBRSxTQUFpQjtRQUM1RyxJQUFJLENBQUMsWUFBWSxHQUFHLFlBQVksQ0FBQztRQUNqQyxJQUFJLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQztRQUNuQixJQUFJLENBQUMsVUFBVSxHQUFHLFVBQVUsQ0FBQztRQUM3QixJQUFJLENBQUMsYUFBYSxHQUFHLGFBQWEsQ0FBQztRQUNuQyxJQUFJLENBQUMsU0FBUyxHQUFHLFNBQVMsQ0FBQztRQUMzQixJQUFJLENBQUMsb0JBQW9CLEdBQUcsYUFBYSxDQUFDO1FBQzFDLElBQUksQ0FBQyxPQUFPLEdBQUcsS0FBSyxDQUFDO0lBQ3RCLENBQUM7Q0FDRDtBQUVEOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0dBeUJHO0FBQ0gsTUFBTSxPQUFPLGtCQUFrQjtJQVM5QixZQUFZLGlCQUF5QixFQUFFLG9CQUE2QztRQVA1RSw4QkFBeUIsR0FBaUMsSUFBSSxRQUFRLEVBQXNCLENBQUM7UUFDN0Ysd0JBQW1CLEdBQWlCLEVBQUUsQ0FBQztRQUN2QyxpQ0FBNEIsR0FBaUIsRUFBRSxDQUFDO1FBQ2hELGtCQUFhLEdBQVcsQ0FBQyxDQUFDO1FBRTFCLGdCQUFXLEdBQVksS0FBSyxDQUFDO1FBR3BDLElBQUksQ0FBQyxr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