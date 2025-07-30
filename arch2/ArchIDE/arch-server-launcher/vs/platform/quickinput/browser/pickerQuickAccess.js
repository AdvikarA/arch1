/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { timeout } from '../../../base/common/async.js';
import { CancellationTokenSource } from '../../../base/common/cancellation.js';
import { Disposable, DisposableStore, MutableDisposable } from '../../../base/common/lifecycle.js';
import { isFunction } from '../../../base/common/types.js';
export var TriggerAction;
(function (TriggerAction) {
    /**
     * Do nothing after the button was clicked.
     */
    TriggerAction[TriggerAction["NO_ACTION"] = 0] = "NO_ACTION";
    /**
     * Close the picker.
     */
    TriggerAction[TriggerAction["CLOSE_PICKER"] = 1] = "CLOSE_PICKER";
    /**
     * Update the results of the picker.
     */
    TriggerAction[TriggerAction["REFRESH_PICKER"] = 2] = "REFRESH_PICKER";
    /**
     * Remove the item from the picker.
     */
    TriggerAction[TriggerAction["REMOVE_ITEM"] = 3] = "REMOVE_ITEM";
})(TriggerAction || (TriggerAction = {}));
function isPicksWithActive(obj) {
    const candidate = obj;
    return Array.isArray(candidate.items);
}
function isFastAndSlowPicks(obj) {
    const candidate = obj;
    return !!candidate.picks && candidate.additionalPicks instanceof Promise;
}
export class PickerQuickAccessProvider extends Disposable {
    constructor(prefix, options) {
        super();
        this.prefix = prefix;
        this.options = options;
    }
    provide(picker, token, runOptions) {
        const disposables = new DisposableStore();
        // Apply options if any
        picker.canAcceptInBackground = !!this.options?.canAcceptInBackground;
        // Disable filtering & sorting, we control the results
        picker.matchOnLabel = picker.matchOnDescription = picker.matchOnDetail = picker.sortByLabel = false;
        // Set initial picks and update on type
        let picksCts = undefined;
        const picksDisposable = disposables.add(new MutableDisposable());
        const updatePickerItems = async () => {
            // Cancel any previous ask for picks and busy
            picksCts?.dispose(true);
            picker.busy = false;
            // Setting the .value will call dispose() on the previous value, so we need to do this AFTER cancelling with dispose(true).
            const picksDisposables = picksDisposable.value = new DisposableStore();
            // Create new cancellation source for this run
            picksCts = picksDisposables.add(new CancellationTokenSource(token));
            // Collect picks and support both long running and short or combined
            const picksToken = picksCts.token;
            let picksFilter = picker.value.substring(this.prefix.length);
            if (!this.options?.shouldSkipTrimPickFilter) {
                picksFilter = picksFilter.trim();
            }
            const providedPicks = this._getPicks(picksFilter, picksDisposables, picksToken, runOptions);
            const applyPicks = (picks, skipEmpty) => {
                let items;
                let activeItem = undefined;
                if (isPicksWithActive(picks)) {
                    items = picks.items;
                    activeItem = picks.active;
                }
                else {
                    items = picks;
                }
                if (items.length === 0) {
                    if (skipEmpty) {
                        return false;
                    }
                    // We show the no results pick if we have no input to prevent completely empty pickers #172613
                    if ((picksFilter.length > 0 || picker.hideInput) && this.options?.noResultsPick) {
                        if (isFunction(this.options.noResultsPick)) {
                            items = [this.options.noResultsPick(picksFilter)];
                        }
                        else {
                            items = [this.options.noResultsPick];
                        }
                    }
                }
                picker.items = items;
                if (activeItem) {
                    picker.activeItems = [activeItem];
                }
                return true;
            };
            const applyFastAndSlowPicks = async (fastAndSlowPicks) => {
                let fastPicksApplied = false;
                let slowPicksApplied = false;
                await Promise.all([
                    // Fast Picks: if `mergeDelay` is configured, in order to reduce
                    // amount of flicker, we race against the slow picks over some delay
                    // and then set the fast picks.
                    // If the slow picks are faster, we reduce the flicker by only
                    // setting the items once.
                    (async () => {
                        if (typeof fastAndSlowPicks.mergeDelay === 'number') {
                            await timeout(fastAndSlowPicks.mergeDelay);
                            if (picksToken.isCancellationRequested) {
                                return;
                            }
                        }
                        if (!slowPicksApplied) {
                            fastPicksApplied = applyPicks(fastAndSlowPicks.picks, true /* skip over empty to reduce flicker */);
                        }
                    })(),
                    // Slow Picks: we await the slow picks and then set them at
                    // once together with the fast picks, but only if we actually
                    // have additional results.
                    (async () => {
                        picker.busy = true;
                        try {
                            const awaitedAdditionalPicks = await fastAndSlowPicks.additionalPicks;
                            if (picksToken.isCancellationRequested) {
                                return;
                            }
                            let picks;
                            let activePick = undefined;
                            if (isPicksWithActive(fastAndSlowPicks.picks)) {
                                picks = fastAndSlowPicks.picks.items;
                                activePick = fastAndSlowPicks.picks.active;
                            }
                            else {
                                picks = fastAndSlowPicks.picks;
                            }
                            let additionalPicks;
                            let additionalActivePick = undefined;
                            if (isPicksWithActive(awaitedAdditionalPicks)) {
                                additionalPicks = awaitedAdditionalPicks.items;
                                additionalActivePick = awaitedAdditionalPicks.active;
                            }
                            else {
                                additionalPicks = awaitedAdditionalPicks;
                            }
                            if (additionalPicks.length > 0 || !fastPicksApplied) {
                                // If we do not have any activePick or additionalActivePick
                                // we try to preserve the currently active pick from the
                                // fast results. This fixes an issue where the user might
                                // have made a pick active before the additional results
                                // kick in.
                                // See https://github.com/microsoft/vscode/issues/102480
                                let fallbackActivePick = undefined;
                                if (!activePick && !additionalActivePick) {
                                    const fallbackActivePickCandidate = picker.activeItems[0];
                                    if (fallbackActivePickCandidate && picks.indexOf(fallbackActivePickCandidate) !== -1) {
                                        fallbackActivePick = fallbackActivePickCandidate;
                                    }
                                }
                                applyPicks({
                                    items: [...picks, ...additionalPicks],
                                    active: activePick || additionalActivePick || fallbackActivePick
                                });
                            }
                        }
                        finally {
                            if (!picksToken.isCancellationRequested) {
                                picker.busy = false;
                            }
                            slowPicksApplied = true;
                        }
                    })()
                ]);
            };
            // No Picks
            if (providedPicks === null) {
                // Ignore
            }
            // Fast and Slow Picks
            else if (isFastAndSlowPicks(providedPicks)) {
                await applyFastAndSlowPicks(providedPicks);
            }
            // Fast Picks
            else if (!(providedPicks instanceof Promise)) {
                applyPicks(providedPicks);
            }
            // Slow Picks
            else {
                picker.busy = true;
                try {
                    const awaitedPicks = await providedPicks;
                    if (picksToken.isCancellationRequested) {
                        return;
                    }
                    if (isFastAndSlowPicks(awaitedPicks)) {
                        await applyFastAndSlowPicks(awaitedPicks);
                    }
                    else {
                        applyPicks(awaitedPicks);
                    }
                }
                finally {
                    if (!picksToken.isCancellationRequested) {
                        picker.busy = false;
                    }
                }
            }
        };
        disposables.add(picker.onDidChangeValue(() => updatePickerItems()));
        updatePickerItems();
        // Accept the pick on accept and hide picker
        disposables.add(picker.onDidAccept(event => {
            if (runOptions?.handleAccept) {
                if (!event.inBackground) {
                    picker.hide(); // hide picker unless we accept in background
                }
                runOptions.handleAccept?.(picker.activeItems[0], event.inBackground);
                return;
            }
            const [item] = picker.selectedItems;
            if (typeof item?.accept === 'function') {
                if (!event.inBackground) {
                    picker.hide(); // hide picker unless we accept in background
                }
                item.accept(picker.keyMods, event);
            }
        }));
        const buttonTrigger = async (button, item) => {
            if (typeof item.trigger !== 'function') {
                return;
            }
            const buttonIndex = item.buttons?.indexOf(button) ?? -1;
            if (buttonIndex >= 0) {
                const result = item.trigger(buttonIndex, picker.keyMods);
                const action = (typeof result === 'number') ? result : await result;
                if (token.isCancellationRequested) {
                    return;
                }
                switch (action) {
                    case TriggerAction.NO_ACTION:
                        break;
                    case TriggerAction.CLOSE_PICKER:
                        picker.hide();
                        break;
                    case TriggerAction.REFRESH_PICKER:
                        updatePickerItems();
                        break;
                    case TriggerAction.REMOVE_ITEM: {
                        const index = picker.items.indexOf(item);
                        if (index !== -1) {
                            const items = picker.items.slice();
                            const removed = items.splice(index, 1);
                            const activeItems = picker.activeItems.filter(activeItem => activeItem !== removed[0]);
                            const keepScrollPositionBefore = picker.keepScrollPosition;
                            picker.keepScrollPosition = true;
                            picker.items = items;
                            if (activeItems) {
                                picker.activeItems = activeItems;
                            }
                            picker.keepScrollPosition = keepScrollPositionBefore;
                        }
                        break;
                    }
                }
            }
        };
        // Trigger the pick with button index if button triggered
        disposables.add(picker.onDidTriggerItemButton(({ button, item }) => buttonTrigger(button, item)));
        disposables.add(picker.onDidTriggerSeparatorButton(({ button, separator }) => buttonTrigger(button, separator)));
        return disposables;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGlja2VyUXVpY2tBY2Nlc3MuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9hZHZpa2FyL0RvY3VtZW50cy9hcmNoaXRlY3QvYXJjaDIvQXJjaElERS9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9xdWlja2lucHV0L2Jyb3dzZXIvcGlja2VyUXVpY2tBY2Nlc3MudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQ3hELE9BQU8sRUFBcUIsdUJBQXVCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNsRyxPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBZSxpQkFBaUIsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBR2hILE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUUzRCxNQUFNLENBQU4sSUFBWSxhQXFCWDtBQXJCRCxXQUFZLGFBQWE7SUFFeEI7O09BRUc7SUFDSCwyREFBUyxDQUFBO0lBRVQ7O09BRUc7SUFDSCxpRUFBWSxDQUFBO0lBRVo7O09BRUc7SUFDSCxxRUFBYyxDQUFBO0lBRWQ7O09BRUc7SUFDSCwrREFBVyxDQUFBO0FBQ1osQ0FBQyxFQXJCVyxhQUFhLEtBQWIsYUFBYSxRQXFCeEI7QUFvRkQsU0FBUyxpQkFBaUIsQ0FBSSxHQUFZO0lBQ3pDLE1BQU0sU0FBUyxHQUFHLEdBQXlCLENBQUM7SUFFNUMsT0FBTyxLQUFLLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsQ0FBQztBQUN2QyxDQUFDO0FBRUQsU0FBUyxrQkFBa0IsQ0FBSSxHQUFZO0lBQzFDLE1BQU0sU0FBUyxHQUFHLEdBQTBCLENBQUM7SUFFN0MsT0FBTyxDQUFDLENBQUMsU0FBUyxDQUFDLEtBQUssSUFBSSxTQUFTLENBQUMsZUFBZSxZQUFZLE9BQU8sQ0FBQztBQUMxRSxDQUFDO0FBRUQsTUFBTSxPQUFnQix5QkFBNEQs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