/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { strict as assert } from 'assert';
import { CancellationToken } from '../../../../../../base/common/cancellation.js';
import { racePollingOrPrompt } from '../../browser/bufferOutputPolling.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../../base/test/common/utils.js';
import { Emitter } from '../../../../../../base/common/event.js';
suite('racePollingOrPrompt', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    const defaultOriginalResult = { terminalExecutionIdleBeforeTimeout: false, output: '', pollDurationMs: 20000 /* PollingConsts.FirstPollingMaxDuration */ };
    const defaultToken = CancellationToken.None;
    const defaultLanguageModelsService = {};
    const defaultExecution = { getOutput: () => 'output' };
    /**
     * Returns a set of arguments for racePollingOrPrompt, allowing overrides for testing.
     */
    function getArgs(overrides) {
        return {
            pollFn: overrides?.pollFn ?? (async () => ({ terminalExecutionIdleBeforeTimeout: true, output: 'output', pollDurationMs: 0 })),
            promptFn: overrides?.promptFn ?? (() => ({ promise: new Promise(() => { }), part: undefined })),
            originalResult: overrides?.originalResult ?? defaultOriginalResult,
            token: overrides?.token ?? defaultToken,
            languageModelsService: overrides?.languageModelsService ?? defaultLanguageModelsService,
            execution: overrides?.execution ?? defaultExecution
        };
    }
    test('should resolve with poll result if polling finishes first', async () => {
        let pollResolved = false;
        const args = getArgs({
            pollFn: async () => {
                pollResolved = true;
                return { terminalExecutionIdleBeforeTimeout: true, output: 'output', pollDurationMs: 0 };
            }
        });
        const result = await racePollingOrPrompt(args.pollFn, args.promptFn, args.originalResult, args.token, args.languageModelsService, args.execution);
        assert.ok(pollResolved);
        assert.deepEqual(result, { terminalExecutionIdleBeforeTimeout: true, output: 'output', pollDurationMs: 0 });
    });
    test('should resolve with poll result if prompt is rejected', async () => {
        const args = getArgs({
            pollFn: async () => ({ terminalExecutionIdleBeforeTimeout: false, output: 'output', pollDurationMs: 0 }),
            promptFn: () => ({ promise: Promise.resolve(false), part: undefined }),
            originalResult: { terminalExecutionIdleBeforeTimeout: false, output: 'original', pollDurationMs: 20000 /* PollingConsts.FirstPollingMaxDuration */ }
        });
        const result = await racePollingOrPrompt(args.pollFn, args.promptFn, args.originalResult, args.token, args.languageModelsService, args.execution);
        assert.deepEqual(result, args.originalResult);
    });
    test('should poll again if prompt is accepted', async () => {
        let extraPollCount = 0;
        const args = getArgs({
            pollFn: async () => {
                extraPollCount++;
                return { terminalExecutionIdleBeforeTimeout: false, output: 'output', pollDurationMs: 0 };
            },
            promptFn: () => ({ promise: Promise.resolve(true), part: undefined }),
            originalResult: { terminalExecutionIdleBeforeTimeout: false, output: 'original', pollDurationMs: 20000 /* PollingConsts.FirstPollingMaxDuration */ },
            languageModelsService: {
                selectLanguageModels: async () => [],
                sendChatRequest: async () => ({ result: '', stream: [] })
            }
        });
        const result = await racePollingOrPrompt(args.pollFn, args.promptFn, args.originalResult, args.token, args.languageModelsService, args.execution);
        assert.ok(extraPollCount === 1);
        assert(result?.pollDurationMs && args.originalResult.pollDurationMs && result.pollDurationMs > args.originalResult.pollDurationMs);
    });
    test('should call part.hide() if polling finishes before prompt resolves', async () => {
        let hideCalled = false;
        const part = { hide: () => { hideCalled = true; }, onDidRequestHide: () => new Emitter() };
        const args = getArgs({
            pollFn: async () => ({ terminalExecutionIdleBeforeTimeout: true, output: 'output', pollDurationMs: 0 }),
            promptFn: () => ({
                promise: new Promise(() => { }),
                part
            })
        });
        const result = await racePollingOrPrompt(args.pollFn, args.promptFn, args.originalResult, args.token, args.languageModelsService, args.execution);
        assert.strictEqual(hideCalled, true);
        assert.deepEqual(result, { terminalExecutionIdleBeforeTimeout: true, output: 'output', pollDurationMs: 0 });
    });
    test('should return promptly if cancellation is requested', async () => {
        let pollCalled = false;
        const args = getArgs({
            pollFn: async () => {
                pollCalled = true;
                return { terminalExecutionIdleBeforeTimeout: false, output: 'output', pollDurationMs: 0 };
            },
            promptFn: () => ({
                promise: new Promise(() => { }),
                part: undefined
            }),
            originalResult: { terminalExecutionIdleBeforeTimeout: false, output: 'original', pollDurationMs: 20000 /* PollingConsts.FirstPollingMaxDuration */ },
            token: { isCancellationRequested: true }
        });
        const result = await racePollingOrPrompt(args.pollFn, args.promptFn, args.originalResult, args.token, args.languageModelsService, args.execution);
        assert.ok(pollCalled);
        assert.deepEqual(result, await args.pollFn());
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnVmZmVyT3V0cHV0UG9sbGluZy50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvYWR2aWthci9Eb2N1bWVudHMvYXJjaGl0ZWN0L2FyY2gyL0FyY2hJREUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVybWluYWxDb250cmliL2NoYXRBZ2VudFRvb2xzL3Rlc3QvYnJvd3Nlci9idWZmZXJPdXRwdXRQb2xsaW5nLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLE1BQU0sSUFBSSxNQUFNLEVBQUUsTUFBTSxRQUFRLENBQUM7QUFDMUMsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sK0NBQStDLENBQUM7QUFDbEYsT0FBTyxFQUFpQixtQkFBbUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQzFGLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBRXRHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUVqRSxLQUFLLENBQUMscUJBQXFCLEVBQUUsR0FBRyxFQUFFO0lBQ2pDLHVDQUF1QyxFQUFFLENBQUM7SUFFMUMsTUFBTSxxQkFBcUIsR0FBRyxFQUFFLGtDQUFrQyxFQUFFLEtBQUssRUFBRSxNQUFNLEVBQUUsRUFBRSxFQUFFLGNBQWMsbURBQXVDLEVBQUUsQ0FBQztJQUMvSSxNQUFNLFlBQVksR0FBRyxpQkFBaUIsQ0FBQyxJQUFJLENBQUM7SUFDNUMsTUFBTSw0QkFBNEIsR0FBRyxFQUFTLENBQUM7SUFDL0MsTUFBTSxnQkFBZ0IsR0FBRyxFQUFFLFNBQVMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxRQUFRLEVBQUUsQ0FBQztJQUV2RDs7T0FFRztJQUNILFNBQVMsT0FBTyxDQUFDLFNBT2hCO1FBQ0EsT0FBTztZQUNOLE1BQU0sRUFBRSxTQUFTLEVBQUUsTUFBTSxJQUFJLENBQUMsS0FBSyxJQUFJLEVBQUUs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