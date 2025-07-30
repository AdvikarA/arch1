/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { sumBy } from '../../../../../base/common/arrays.js';
/**
 * The ARC (accepted and retained characters) counts how many characters inserted by the initial suggestion (trackedEdit)
 * stay unmodified after a certain amount of time after acceptance.
*/
export class ArcTracker {
    constructor(valueBeforeTrackedEdit, _trackedEdit) {
        this.valueBeforeTrackedEdit = valueBeforeTrackedEdit;
        this._trackedEdit = _trackedEdit;
        const eNormalized = _trackedEdit.removeCommonSuffixPrefix(valueBeforeTrackedEdit.getValue());
        this._updatedTrackedEdit = eNormalized.mapData(() => new IsTrackedEditData(true));
    }
    handleEdits(edit) {
        const e = edit.mapData(_d => new IsTrackedEditData(false));
        const composedEdit = this._updatedTrackedEdit.compose(e);
        const onlyTrackedEdit = composedEdit.decomposeSplit(e => !e.data.isTrackedEdit).e2;
        this._updatedTrackedEdit = onlyTrackedEdit;
    }
    getTrackedEdit() {
        return this._updatedTrackedEdit.toStringEdit();
    }
    getAcceptedRestrainedCharactersCount() {
        const s = sumBy(this._updatedTrackedEdit.replacements, e => e.getNewLength());
        return s;
    }
    getOriginalCharacterCount() {
        return sumBy(this._trackedEdit.replacements, e => e.getNewLength());
    }
    getDebugState() {
        return {
            edits: this._updatedTrackedEdit.replacements.map(e => ({
                range: e.replaceRange.toString(),
                newText: e.newText,
                isTrackedEdit: e.data.isTrackedEdit,
            }))
        };
    }
}
export class IsTrackedEditData {
    constructor(isTrackedEdit) {
        this.isTrackedEdit = isTrackedEdit;
    }
    join(data) {
        if (this.isTrackedEdit !== data.isTrackedEdit) {
            return undefined;
        }
        return this;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXJjVHJhY2tlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL2FkdmlrYXIvRG9jdW1lbnRzL2FyY2hpdGVjdC9hcmNoMi9BcmNoSURFL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2VkaXRUZWxlbWV0cnkvYnJvd3Nlci90ZWxlbWV0cnkvYXJjVHJhY2tlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFJN0Q7OztFQUdFO0FBQ0YsTUFBTSxPQUFPLFVBQVU7SUFHdEIsWUFDaUIsc0JBQW9DLEVBQ25DLFlBQTRCO1FBRDdCLDJCQUFzQixHQUF0QixzQkFBc0IsQ0FBYztRQUNuQyxpQkFBWSxHQUFaLFlBQVksQ0FBZ0I7UUFFN0MsTUFBTSxXQUFXLEdBQUcsWUFBWSxDQUFDLHdCQUF3QixDQUFDLHNCQUFzQixDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUM7UUFDN0YsSUFBSSxDQUFDLG1CQUFtQixHQUFHLFdBQVcsQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO0lBQ25GLENBQUM7SUFFRCxXQUFXLENBQUMsSUFBb0I7UUFDL0IsTUFBTSxDQUFDLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLElBQUksaUJBQWlCLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztRQUMzRCxNQUFNLFlBQVksR0FBRyxJQUFJLENBQUMsbUJBQW1CLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3pELE1BQU0sZUFBZSxHQUFHLFlBQVksQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUMsRUFBRSxDQUFDO1FBQ25GLElBQUksQ0FBQyxtQkFBbUIsR0FBRyxlQUFlLENBQUM7SUFDNUMsQ0FBQztJQUVELGNBQWM7UUFDYixPQUFPLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxZQUFZLEVBQUUsQ0FBQztJQUNoRCxDQUFDO0lBRUQsb0NBQW9DO1FBQ25DLE1BQU0sQ0FBQyxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUMsbUJBQW1CLENBQUMsWUFBWSxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLFlBQVksRUFBRSxDQUFDLENBQUM7UUFDOUUsT0FBTyxDQUFDLENBQUM7SUFDVixDQUFDO0lBRUQseUJBQXlCO1FBQ3hCLE9BQU8sS0FBSyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsWUFBWSxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLFlBQVksRUFBRSxDQUFDLENBQUM7SUFDckUsQ0FBQztJQUVELGFBQWE7UUFDWixPQUFPO1lBQ04sS0FBSyxFQUFFLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQztnQkFDdEQsS0FBSyxFQUFFLENBQUMsQ0FBQyxZQUFZLENBQUMsUUFBUSxFQUFFO2dCQUNoQyxPQUFPLEVBQUUsQ0FBQyxDQUFDLE9BQU87Z0JBQ2xCLGFBQWEsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLGFBQWE7YUFDbkMsQ0FBQyxDQUFDO1NBQ0gsQ0FBQztJQUNILENBQUM7Q0FDRDtBQUVELE1BQU0sT0FBTyxpQkFBaUI7SUFDN0IsWUFDaUIsYUFBc0I7UUFBdEIsa0JBQWEsR0FBYixhQUFhLENBQVM7SUFDbkMsQ0FBQztJQUVMLElBQUksQ0FBQyxJQUF1QjtRQUMzQixJQUFJLElBQUksQ0FBQyxhQUFhLEtBQUssSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFDO1lBQy9DLE9BQU8sU0FBUyxDQUFDO1FBQ2xCLENBQUM7UUFDRCxPQUFPLElBQUksQ0FBQztJQUNiLENBQUM7Q0FDRCJ9