/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { DisposableStore } from '../../../base/common/lifecycle.js';
import { derivedOpts, observableFromEventOpts } from '../../../base/common/observable.js';
/** Creates an observable update when a configuration key updates. */
export function observableConfigValue(key, defaultValue, configurationService) {
    function compute_$show2FramesUp() {
        return observableFromEventOpts({ debugName: () => `Configuration Key "${key}"`, }, (handleChange) => configurationService.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration(key)) {
                handleChange(e);
            }
        }), () => configurationService.getValue(key) ?? defaultValue);
    }
    return compute_$show2FramesUp();
}
/** Update the configuration key with a value derived from observables. */
export function bindContextKey(key, service, computeValue) {
    const boundKey = key.bindTo(service);
    function compute_$show2FramesUp() {
        const store = new DisposableStore();
        derivedOpts({ debugName: () => `Set Context Key "${key.key}"` }, reader => {
            const value = computeValue(reader);
            boundKey.set(value);
            return value;
        }).recomputeInitiallyAndOnChange(store);
        return store;
    }
    return compute_$show2FramesUp();
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGxhdGZvcm1PYnNlcnZhYmxlVXRpbHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9hZHZpa2FyL0RvY3VtZW50cy9hcmNoaXRlY3QvYXJjaDIvQXJjaElERS9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9vYnNlcnZhYmxlL2NvbW1vbi9wbGF0Zm9ybU9ic2VydmFibGVVdGlscy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsZUFBZSxFQUFlLE1BQU0sbUNBQW1DLENBQUM7QUFDakYsT0FBTyxFQUFFLFdBQVcsRUFBd0IsdUJBQXVCLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUloSCxxRUFBcUU7QUFDckUsTUFBTSxVQUFVLHFCQUFxQixDQUFJLEdBQVcsRUFBRSxZQUFlLEVBQUUsb0JBQTJDO0lBQ2pILFNBQVMsc0JBQXNCO1FBQzlCLE9BQU8sdUJBQXVCLENBQUMsRUFBRSxTQUFTLEVBQUUsR0FBRyxFQUFFLENBQUMsc0JBQXNCLEdBQUcsR0FBRyxHQUFHLEVBQ2hGLENBQUMsWUFBWSxFQUFFLEVBQUUsQ0FBQyxvQkFBb0IsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDLENBQUMsRUFBRTtZQUNuRSxJQUFJLENBQUMsQ0FBQyxvQkFBb0IsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDO2dCQUNqQyxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDakIsQ0FBQztRQUNGLENBQUMsQ0FBQyxFQUNGLEdBQUcsRUFBRSxDQUFDLG9CQUFvQixDQUFDLFFBQVEsQ0FBSSxHQUFHLENBQUMsSUFBSSxZQUFZLENBQzNELENBQUM7SUFDSCxDQUFDO0lBQ0QsT0FBTyxzQkFBc0IsRUFBRSxDQUFDO0FBQ2pDLENBQUM7QUFFRCwwRUFBMEU7QUFDMUUsTUFBTSxVQUFVLGNBQWMsQ0FBNEIsR0FBcUIsRUFBRSxPQUEyQixFQUFFLFlBQW9DO0lBQ2pKLE1BQU0sUUFBUSxHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUM7SUFFckMsU0FBUyxzQkFBc0I7UUFDOUIsTUFBTSxLQUFLLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQztRQUNwQyxXQUFXLENBQUMsRUFBRSxTQUFTLEVBQUUsR0FBRyxFQUFFLENBQUMsb0JBQW9CLEdBQUcsQ0FBQyxHQUFHLEdBQUcsRUFBRSxFQUFFLE1BQU0sQ0FBQyxFQUFFO1lBQ3pFLE1BQU0sS0FBSyxHQUFHLFlBQVksQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUNuQyxRQUFRLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQ3BCLE9BQU8sS0FBSyxDQUFDO1FBQ2QsQ0FBQyxDQUFDLENBQUMsNkJBQTZCLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDeEMsT0FBTyxLQUFLLENBQUM7SUFDZCxDQUFDO0lBRUQsT0FBTyxzQkFBc0IsRUFBRSxDQUFDO0FBQ2pDLENBQUMifQ==