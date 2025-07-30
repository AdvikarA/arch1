/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { DeferredPromise, RunOnceScheduler } from '../../../../../../base/common/async.js';
import { DisposableStore } from '../../../../../../base/common/lifecycle.js';
export async function waitForIdle(onData, idleDurationMs) {
    // This is basically Event.debounce but with an initial event to trigger the debounce
    // immediately
    const store = new DisposableStore();
    const deferred = new DeferredPromise();
    const scheduler = store.add(new RunOnceScheduler(() => deferred.complete(), idleDurationMs));
    store.add(onData(() => scheduler.schedule()));
    scheduler.schedule();
    return deferred.p.finally(() => store.dispose());
}
/**
 * Tracks the terminal for being idle on a prompt input. This must be called before `executeCommand`
 * is called.
 */
export async function trackIdleOnPrompt(instance, idleDurationMs, store) {
    const idleOnPrompt = new DeferredPromise();
    const onData = instance.onData;
    const scheduler = store.add(new RunOnceScheduler(() => {
        idleOnPrompt.complete();
    }, idleDurationMs));
    // Only schedule when a prompt sequence (A) is seen after an execute sequence (C). This prevents
    // cases where the command is executed before the prompt is written. While not perfect, sitting
    // on an A without a C following shortly after is a very good indicator that the command is done
    // and the terminal is idle. Note that D is treated as a signal for executed since shell
    // integration sometimes lacks the C sequence either due to limitations in the integation or the
    // required hooks aren't available.
    let TerminalState;
    (function (TerminalState) {
        TerminalState[TerminalState["Initial"] = 0] = "Initial";
        TerminalState[TerminalState["Prompt"] = 1] = "Prompt";
        TerminalState[TerminalState["Executing"] = 2] = "Executing";
        TerminalState[TerminalState["PromptAfterExecuting"] = 3] = "PromptAfterExecuting";
    })(TerminalState || (TerminalState = {}));
    let state = 0 /* TerminalState.Initial */;
    store.add(onData(e => {
        // Update state
        // p10k fires C as `133;C;`
        const matches = e.matchAll(/(?:\x1b\]|\x9d)[16]33;(?<type>[ACD])(?:;.*)?(?:\x1b\\|\x07|\x9c)/g);
        for (const match of matches) {
            if (match.groups?.type === 'A') {
                if (state === 0 /* TerminalState.Initial */) {
                    state = 1 /* TerminalState.Prompt */;
                }
                else if (state === 2 /* TerminalState.Executing */) {
                    state = 3 /* TerminalState.PromptAfterExecuting */;
                }
            }
            else if (match.groups?.type === 'C' || match.groups?.type === 'D') {
                state = 2 /* TerminalState.Executing */;
            }
        }
        // Re-schedule on every data event as we're tracking data idle
        if (state === 3 /* TerminalState.PromptAfterExecuting */) {
            scheduler.schedule();
        }
        else {
            scheduler.cancel();
        }
    }));
    return idleOnPrompt.p;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXhlY3V0ZVN0cmF0ZWd5LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvYWR2aWthci9Eb2N1bWVudHMvYXJjaGl0ZWN0L2FyY2gyL0FyY2hJREUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVybWluYWxDb250cmliL2NoYXRBZ2VudFRvb2xzL2Jyb3dzZXIvZXhlY3V0ZVN0cmF0ZWd5L2V4ZWN1dGVTdHJhdGVneS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsZUFBZSxFQUFFLGdCQUFnQixFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFHM0YsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBbUI3RSxNQUFNLENBQUMsS0FBSyxVQUFVLFdBQVcsQ0FBQyxNQUFzQixFQUFFLGNBQXNCO0lBQy9FLHFGQUFxRjtJQUNyRixjQUFjO0lBQ2QsTUFBTSxLQUFLLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQztJQUNwQyxNQUFNLFFBQVEsR0FBRyxJQUFJLGVBQWUsRUFBUSxDQUFDO0lBQzdDLE1BQU0sU0FBUyxHQUFHLEtBQUssQ0FBQyxHQUFHLENBQUMsSUFBSSxnQkFBZ0IsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFLEVBQUUsY0FBYyxDQUFDLENBQUMsQ0FBQztJQUM3RixLQUFLLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLEVBQUUsQ0FBQyxTQUFTLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQzlDLFNBQVMsQ0FBQyxRQUFRLEVBQUUsQ0FBQztJQUNyQixPQUFPLFFBQVEsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxDQUFDLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDO0FBQ2xELENBQUM7QUFFRDs7O0dBR0c7QUFDSCxNQUFNLENBQUMsS0FBSyxVQUFVLGlCQUFpQixDQUN0QyxRQUEyQixFQUMzQixjQUFzQixFQUN0QixLQUFzQjtJQUV0QixNQUFNLFlBQVksR0FBRyxJQUFJLGVBQWUsRUFBUSxDQUFDO0lBQ2pELE1BQU0sTUFBTSxHQUFHLFFBQVEsQ0FBQyxNQUFNLENBQUM7SUFDL0IsTUFBTSxTQUFTLEdBQUcsS0FBSyxDQUFDLEdBQUcsQ0FBQyxJQUFJLGdCQUFnQixDQUFDLEdBQUcsRUFBRTtRQUNyRCxZQUFZLENBQUMsUUFBUSxFQUFFLENBQUM7SUFDekIsQ0FBQyxFQUFFLGNBQWMsQ0FBQyxDQUFDLENBQUM7SUFDcEIsZ0dBQWdHO0lBQ2hHLCtGQUErRjtJQUMvRixnR0FBZ0c7SUFDaEcsd0ZBQXdGO0lBQ3hGLGdHQUFnRztJQUNoRyxtQ0FBbUM7SUFDbkMsSUFBVyxhQUtWO0lBTEQsV0FBVyxhQUFhO1FBQ3ZCLHVEQUFPLENBQUE7UUFDUCxxREFBTSxDQUFBO1FBQ04sMkRBQVMsQ0FBQTtRQUNULGlGQUFvQixDQUFBO0lBQ3JCLENBQUMsRUFMVSxhQUFhLEtBQWIsYUFBYSxRQUt2QjtJQUNELElBQUksS0FBSyxnQ0FBdUMsQ0FBQztJQUNqRCxLQUFLLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRTtRQUNwQixlQUFlO1FBQ2YsMkJBQTJCO1FBQzNCLE1BQU0sT0FBTyxHQUFHLENBQUMsQ0FBQyxRQUFRLENBQUMsbUVBQW1FLENBQUMsQ0FBQztRQUNoRyxLQUFLLE1BQU0sS0FBSyxJQUFJLE9BQU8sRUFBRSxDQUFDO1lBQzdCLElBQUksS0FBSyxDQUFDLE1BQU0sRUFBRSxJQUFJLEtBQUssR0FBRyxFQUFFLENBQUM7Z0JBQ2hDLElBQUksS0FBSyxrQ0FBMEIsRUFBRSxDQUFDO29CQUNyQyxLQUFLLCtCQUF1QixDQUFDO2dCQUM5QixDQUFDO3FCQUFNLElBQUksS0FBSyxvQ0FBNEIsRUFBRSxDQUFDO29CQUM5QyxLQUFLLDZDQUFxQyxDQUFDO2dCQUM1QyxDQUFDO1lBQ0YsQ0FBQztpQkFBTSxJQUFJLEtBQUssQ0FBQyxNQUFNLEVBQUUsSUFBSSxLQUFLLEdBQUcsSUFBSSxLQUFLLENBQUMsTUFBTSxFQUFFLElBQUksS0FBSyxHQUFHLEVBQUUsQ0FBQztnQkFDckUsS0FBSyxrQ0FBMEIsQ0FBQztZQUNqQyxDQUFDO1FBQ0YsQ0FBQztRQUNELDhEQUE4RDtRQUM5RCxJQUFJLEtBQUssK0NBQXVDLEVBQUUsQ0FBQztZQUNsRCxTQUFTLENBQUMsUUFBUSxFQUFFLENBQUM7UUFDdEIsQ0FBQzthQUFNLENBQUM7WUFDUCxTQUFTLENBQUMsTUFBTSxFQUFFLENBQUM7UUFDcEIsQ0FBQztJQUNGLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDSixPQUFPLFlBQVksQ0FBQyxDQUFDLENBQUM7QUFDdkIsQ0FBQyJ9