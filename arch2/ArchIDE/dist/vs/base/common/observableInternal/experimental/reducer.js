/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { strictEquals, BugIndicatingError } from '../commonFacade/deps.js';
import { subtransaction } from '../transaction.js';
import { DebugNameData } from '../debugName.js';
import { DerivedWithSetter } from '../observables/derivedImpl.js';
/**
 * Creates an observable value that is based on values and changes from other observables.
 * Additionally, a reducer can report how that state changed.
*/
export function observableReducer(owner, options) {
    return observableReducerSettable(owner, options);
}
/**
 * Creates an observable value that is based on values and changes from other observables.
 * Additionally, a reducer can report how that state changed.
*/
export function observableReducerSettable(owner, options) {
    let prevValue = undefined;
    let hasValue = false;
    const d = new DerivedWithSetter(new DebugNameData(owner, undefined, options.update), (reader, changeSummary) => {
        if (!hasValue) {
            prevValue = options.initial instanceof Function ? options.initial() : options.initial;
            hasValue = true;
        }
        const newValue = options.update(reader, prevValue, changeSummary);
        prevValue = newValue;
        return newValue;
    }, options.changeTracker, () => {
        if (hasValue) {
            options.disposeFinal?.(prevValue);
            hasValue = false;
        }
    }, options.equalityComparer ?? strictEquals, (value, tx, change) => {
        if (!hasValue) {
            throw new BugIndicatingError('Can only set when there is a listener! This is to prevent leaks.');
        }
        subtransaction(tx, tx => {
            prevValue = value;
            d.setValue(value, tx, change);
        });
    });
    return d;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVkdWNlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL2FkdmlrYXIvRG9jdW1lbnRzL2FyY2hpdGVjdC9hcmNoMi9BcmNoSURFL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvY29tbW9uL29ic2VydmFibGVJbnRlcm5hbC9leHBlcmltZW50YWwvcmVkdWNlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQW9CLFlBQVksRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHlCQUF5QixDQUFDO0FBRTdGLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxtQkFBbUIsQ0FBQztBQUVuRCxPQUFPLEVBQUUsYUFBYSxFQUFjLE1BQU0saUJBQWlCLENBQUM7QUFDNUQsT0FBTyxFQUFFLGlCQUFpQixFQUFrQixNQUFNLCtCQUErQixDQUFDO0FBc0JsRjs7O0VBR0U7QUFDRixNQUFNLFVBQVUsaUJBQWlCLENBQW1DLEtBQWlCLEVBQUUsT0FBbUQ7SUFDekksT0FBTyx5QkFBeUIsQ0FBNEIsS0FBSyxFQUFFLE9BQU8sQ0FBUSxDQUFDO0FBQ3BGLENBQUM7QUFFRDs7O0VBR0U7QUFDRixNQUFNLFVBQVUseUJBQXlCLENBQW1DLEtBQWlCLEVBQUUsT0FBbUQ7SUFDakosSUFBSSxTQUFTLEdBQWtCLFNBQVMsQ0FBQztJQUN6QyxJQUFJLFFBQVEsR0FBRyxLQUFLLENBQUM7SUFFckIsTUFBTSxDQUFDLEdBQUcsSUFBSSxpQkFBaUIsQ0FDOUIsSUFBSSxhQUFhLENBQUMsS0FBSyxFQUFFLFNBQVMsRUFBRSxPQUFPLENBQUMsTUFBTSxDQUFDLEVBQ25ELENBQUMsTUFBa0MsRUFBRSxhQUFhLEVBQUUsRUFBRTtRQUNyRCxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7WUFDZixTQUFTLEdBQUcsT0FBTyxDQUFDLE9BQU8sWUFBWSxRQUFRLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQztZQUN0RixRQUFRLEdBQUcsSUFBSSxDQUFDO1FBQ2pCLENBQUM7UUFDRCxNQUFNLFFBQVEsR0FBRyxPQUFPLENBQUMsTUFBTSxDQUFDLE1BQU0sRUFBRSxTQUFVLEVBQUUsYUFBYSxDQUFDLENBQUM7UUFDbkUsU0FBUyxHQUFHLFFBQVEsQ0FBQztRQUNyQixPQUFPLFFBQVEsQ0FBQztJQUNqQixDQUFDLEVBQ0QsT0FBTyxDQUFDLGFBQWEsRUFDckIsR0FBRyxFQUFFO1FBQ0osSUFBSSxRQUFRLEVBQUUsQ0FBQztZQUNkLE9BQU8sQ0FBQyxZQUFZLEVBQUUsQ0FBQyxTQUFVLENBQUMsQ0FBQztZQUNuQyxRQUFRLEdBQUcsS0FBSyxDQUFDO1FBQ2xCLENBQUM7SUFDRixDQUFDLEVBQ0QsT0FBTyxDQUFDLGdCQUFnQixJQUFJLFlBQVksRUFDeEMsQ0FBQyxLQUFLLEVBQUUsRUFBRSxFQUFFLE1BQU0sRUFBRSxFQUFFO1FBQ3JCLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUNmLE1BQU0sSUFBSSxrQkFBa0IsQ0FBQyxrRUFBa0UsQ0FBQyxDQUFDO1FBQ2xHLENBQUM7UUFDRCxjQUFjLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFO1lBQ3ZCLFNBQVMsR0FBRyxLQUFLLENBQUM7WUFDbEIsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxLQUFLLEVBQUUsRUFBRSxFQUFFLE1BQU0sQ0FBQyxDQUFDO1FBQy9CLENBQUMsQ0FBQyxDQUFDO0lBQ0osQ0FBQyxDQUNELENBQUM7SUFFRixPQUFPLENBQUMsQ0FBQztBQUNWLENBQUMifQ==