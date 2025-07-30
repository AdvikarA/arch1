/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { disposableTimeout, RunOnceScheduler } from '../../../../base/common/async.js';
import { Emitter } from '../../../../base/common/event.js';
import { MarkdownString } from '../../../../base/common/htmlContent.js';
import { Disposable, DisposableStore } from '../../../../base/common/lifecycle.js';
import { basename, isAbsolute } from '../../../../base/common/path.js';
import { isDefined } from '../../../../base/common/types.js';
import { URI } from '../../../../base/common/uri.js';
import { localize } from '../../../../nls.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { ILanguageModelToolsService, ToolDataSource, } from '../../chat/common/languageModelToolsService.js';
import { TestId } from './testId.js';
import { TestingContextKeys } from './testingContextKeys.js';
import { getTestProgressText, collectTestStateCounts } from './testingProgressMessages.js';
import { isFailedState } from './testingStates.js';
import { ITestResultService } from './testResultService.js';
import { ITestService, testsInFile, waitForTestToBeIdle } from './testService.js';
let TestingChatAgentToolContribution = class TestingChatAgentToolContribution extends Disposable {
    static { this.ID = 'workbench.contrib.testing.chatAgentTool'; }
    constructor(instantiationService, toolsService, contextKeyService) {
        super();
        const runInTerminalTool = instantiationService.createInstance(RunTestTool);
        this._register(toolsService.registerToolData(RunTestTool.DEFINITION));
        this._register(toolsService.registerToolImplementation(RunTestTool.ID, runInTerminalTool));
        // todo@connor4312: temporary for 1.103 release during changeover
        contextKeyService.createKey('chat.coreTestFailureToolEnabled', true).set(true);
    }
};
TestingChatAgentToolContribution = __decorate([
    __param(0, IInstantiationService),
    __param(1, ILanguageModelToolsService),
    __param(2, IContextKeyService)
], TestingChatAgentToolContribution);
export { TestingChatAgentToolContribution };
let RunTestTool = class RunTestTool extends Disposable {
    static { this.ID = 'runTests'; }
    static { this.DEFINITION = {
        id: this.ID,
        toolReferenceName: 'runTests',
        canBeReferencedInPrompt: true,
        when: TestingContextKeys.hasRunnableTests,
        displayName: 'Run tests',
        modelDescription: 'Runs unit tests in files. Use this tool if the user asks to run tests or when you want to validate changes using unit tests. When possible, always try to provide `files` paths containing the relevant unit tests in order to avoid unnecessarily long test runs.',
        inputSchema: {
            type: 'object',
            properties: {
                files: {
                    type: 'array',
                    items: {
                        type: 'string',
                    },
                    description: 'Absolute paths to the test files to run. If not provided, all test files will be run.',
                },
                testNames: {
                    type: 'array',
                    items: {
                        type: 'string',
                    },
                    description: 'An array of test suites, test classes, or test cases to run. If not provided, all tests in the files will be run.',
                }
            },
        },
        userDescription: localize('runTestTool.userDescription', 'Runs unit tests'),
        source: ToolDataSource.Internal,
        tags: [
            'vscode_editing_with_tests',
            'enable_other_tool_copilot_readFile',
            'enable_other_tool_copilot_listDirectory',
            'enable_other_tool_copilot_findFiles',
            'enable_other_tool_copilot_runTests',
        ],
    }; }
    constructor(_testService, _uriIdentityService, _workspaceContextService, _testResultService) {
        super();
        this._testService = _testService;
        this._uriIdentityService = _uriIdentityService;
        this._workspaceContextService = _workspaceContextService;
        this._testResultService = _testResultService;
    }
    async invoke(invocation, countTokens, progress, token) {
        const params = invocation.parameters;
        const testFiles = await this._getFileTestsToRun(params, progress);
        const testCases = await this._getTestCasesToRun(params, testFiles, progress);
        if (!testCases.length) {
            return {
                content: [{ kind: 'text', value: 'No tests found in the files. Ensure the correct absolute paths are passed to the tool.' }],
                toolResultError: localize('runTestTool.noTests', 'No tests found in the files'),
            };
        }
        progress.report({ message: localize('runTestTool.invoke.progress', 'Starting test run...') });
        const result = await this._captureTestResult(testCases, token);
        if (!result) {
            return {
                content: [{ kind: 'text', value: 'No test run was started. Instruct the user to ensure their test runner is correctly configured' }],
                toolResultError: localize('runTestTool.noRunStarted', 'No test run was started. This may be an issue with your test runner or extension.'),
            };
        }
        await this._monitorRunProgress(result, progress, token);
        if (token.isCancellationRequested) {
            this._testService.cancelTestRun(result.id);
            return {
                content: [{ kind: 'text', value: localize('runTestTool.invoke.cancelled', 'Test run was cancelled.') }],
                toolResultMessage: localize('runTestTool.invoke.cancelled', 'Test run was cancelled.'),
            };
        }
        return {
            content: [{ kind: 'text', value: this._makeModelTestResults(result) }],
            toolResultMessage: getTestProgressText(collectTestStateCounts(true, [result])),
        };
    }
    _makeModelTestResults(result) {
        const failures = result.counts[6 /* TestResultState.Errored */] + result.counts[4 /* TestResultState.Failed */];
        let str = `<summary passed=${result.counts[3 /* TestResultState.Passed */]} failed=${failures} />`;
        if (failures === 0) {
            return str;
        }
        for (const failure of result.tests) {
            if (!isFailedState(failure.ownComputedState)) {
                continue;
            }
            const [, ...testPath] = TestId.split(failure.item.extId);
            const testName = testPath.pop();
            str += `<testFailure name=${JSON.stringify(testName)} path=${JSON.stringify(testPath.join(' > '))}>\n`;
            str += failure.tasks.flatMap(t => t.messages.filter(m => m.type === 0 /* TestMessageType.Error */)).join('\n\n');
            str += `\n</testFailure>\n`;
        }
        return str;
    }
    /** Updates the UI progress as the test runs, resolving when the run is finished. */
    async _monitorRunProgress(result, progress, token) {
        const store = new DisposableStore();
        const update = () => {
            const counts = collectTestStateCounts(!result.completedAt, [result]);
            const text = getTestProgressText(counts);
            progress.report({ message: text, increment: counts.runSoFar - lastSoFar, total: counts.totalWillBeRun });
            lastSoFar = counts.runSoFar;
        };
        let lastSoFar = 0;
        const throttler = store.add(new RunOnceScheduler(update, 500));
        return new Promise(resolve => {
            store.add(result.onChange(() => {
                if (!throttler.isScheduled) {
                    throttler.schedule();
                }
            }));
            store.add(token.onCancellationRequested(() => {
                this._testService.cancelTestRun(result.id);
                resolve();
            }));
            store.add(result.onComplete(() => {
                update();
                resolve();
            }));
        }).finally(() => store.dispose());
    }
    /**
     * Captures the test result. This is a little tricky because some extensions
     * trigger an 'out of bound' test run, so we actually wait for the first
     * test run to come in that contains one or more tasks and treat that as the
     * one we're looking for.
     */
    async _captureTestResult(testCases, token) {
        const store = new DisposableStore();
        const onDidTimeout = store.add(new Emitter());
        return new Promise(resolve => {
            store.add(onDidTimeout.event(() => {
                resolve(undefined);
            }));
            store.add(this._testResultService.onResultsChanged(ev => {
                if ('started' in ev) {
                    store.add(ev.started.onNewTask(() => {
                        store.dispose();
                        resolve(ev.started);
                    }));
                }
            }));
            this._testService.runTests({
                group: 2 /* TestRunProfileBitset.Run */,
                tests: testCases,
                preserveFocus: true,
            }, token).then(() => {
                if (!store.isDisposed) {
                    store.add(disposableTimeout(() => onDidTimeout.fire(), 5_000));
                }
            });
        }).finally(() => store.dispose());
    }
    /** Filters the test files to individual test cases based on the provided parameters. */
    async _getTestCasesToRun(params, tests, progress) {
        if (!params.testNames?.length) {
            return tests;
        }
        progress.report({ message: localize('runTestTool.invoke.filterProgress', 'Filtering tests...') });
        const testNames = params.testNames.map(t => t.toLowerCase().trim());
        const filtered = [];
        const doFilter = async (test) => {
            const name = test.item.label.toLowerCase().trim();
            if (testNames.some(tn => name.includes(tn))) {
                filtered.push(test);
                return;
            }
            if (test.expand === 1 /* TestItemExpandState.Expandable */) {
                await this._testService.collection.expand(test.item.extId, 1);
            }
            await waitForTestToBeIdle(this._testService, test);
            await Promise.all([...test.children].map(async (id) => {
                const item = this._testService.collection.getNodeById(id);
                if (item) {
                    await doFilter(item);
                }
            }));
        };
        await Promise.all(tests.map(doFilter));
        return filtered;
    }
    /** Gets the file tests to run based on the provided parameters. */
    async _getFileTestsToRun(params, progress) {
        if (!params.files?.length) {
            return [...this._testService.collection.rootItems];
        }
        progress.report({ message: localize('runTestTool.invoke.filesProgress', 'Discovering tests...') });
        const firstWorkspaceFolder = this._workspaceContextService.getWorkspace().folders.at(0)?.uri;
        const uris = params.files.map(f => {
            if (isAbsolute(f)) {
                return URI.file(f);
            }
            else if (firstWorkspaceFolder) {
                return URI.joinPath(firstWorkspaceFolder, f);
            }
            else {
                return undefined;
            }
        }).filter(isDefined);
        const tests = [];
        for (const uri of uris) {
            for await (const file of testsInFile(this._testService, this._uriIdentityService, uri, undefined, false)) {
                tests.push(file);
            }
        }
        return tests;
    }
    prepareToolInvocation(context, token) {
        const params = context.parameters;
        const title = localize('runTestTool.confirm.title', 'Allow test run?');
        const inFiles = params.files?.map((f) => '`' + basename(f) + '`');
        return Promise.resolve({
            invocationMessage: localize('runTestTool.confirm.invocation', 'Running tests...'),
            confirmationMessages: {
                title,
                message: inFiles?.length
                    ? new MarkdownString().appendMarkdown(localize('runTestTool.confirm.message', 'The model wants to run tests in {0}.', inFiles.join(', ')))
                    : localize('runTestTool.confirm.all', 'The model wants to run all tests.'),
                allowAutoConfirm: true,
            },
        });
    }
};
RunTestTool = __decorate([
    __param(0, ITestService),
    __param(1, IUriIdentityService),
    __param(2, IWorkspaceContextService),
    __param(3, ITestResultService)
], RunTestTool);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdGluZ0NoYXRBZ2VudFRvb2wuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9hZHZpa2FyL0RvY3VtZW50cy9hcmNoaXRlY3QvYXJjaDIvQXJjaElERS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXN0aW5nL2NvbW1vbi90ZXN0aW5nQ2hhdEFnZW50VG9vbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUV2RixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDM0QsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ3hFLE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDbkYsT0FBTyxFQUFFLFFBQVEsRUFBRSxVQUFVLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUN2RSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDN0QsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ3JELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUM5QyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUMxRixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNuRyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx3REFBd0QsQ0FBQztBQUM3RixPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQztBQUU5RixPQUFPLEVBRU4sMEJBQTBCLEVBTzFCLGNBQWMsR0FFZCxNQUFNLGdEQUFnRCxDQUFDO0FBQ3hELE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxhQUFhLENBQUM7QUFDckMsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0seUJBQXlCLENBQUM7QUFDN0QsT0FBTyxFQUFFLG1CQUFtQixFQUFFLHNCQUFzQixFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFDM0YsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBRW5ELE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHdCQUF3QixDQUFDO0FBQzVELE9BQU8sRUFBRSxZQUFZLEVBQUUsV0FBVyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sa0JBQWtCLENBQUM7QUFHM0UsSUFBTSxnQ0FBZ0MsR0FBdEMsTUFBTSxnQ0FBaUMsU0FBUSxVQUFVO2FBQ3hDLE9BQUUsR0FBRyx5Q0FBeUMsQUFBNUMsQ0FBNkM7SUFFdEUsWUFDd0Isb0JBQTJDLEVBQ3RDLFlBQXdDLEVBQ2hELGlCQUFxQztRQUV6RCxLQUFLLEVBQUUsQ0FBQztRQUNSLE1BQU0saUJBQWlCLEdBQUcsb0JBQW9CLENBQUMsY0FBYyxDQUFDLFdBQVcsQ0FBQyxDQUFDO1FBQzNFLElBQUksQ0FBQyxTQUFTLENBQUMsWUFBWSxDQUFDLGdCQUFnQixDQUFDLFdBQVcsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDO1FBQ3RFLElBQUksQ0FBQyxTQUFTLENBQ2IsWUFBWSxDQUFDLDBCQUEwQixDQUFDLFdBQVcsQ0FBQyxFQUFFLEVBQUUsaUJBQWlCLENBQUMsQ0FDMUUsQ0FBQztRQUVGLGlFQUFpRTtRQUNqRSxpQkFBaUIsQ0FBQyxTQUFTLENBQUMsaUNBQWlDLEVBQUUsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ2hGLENBQUM7O0FBakJXLGdDQUFnQztJQUkxQyxXQUFBLHFCQUFxQixDQUFBO0lBQ3JCLFdBQUEsMEJBQTBCLENBQUE7SUFDMUIsV0FBQSxrQkFBa0IsQ0FBQTtHQU5SLGdDQUFnQyxDQWtCNUM7O0FBT0QsSUFBTSxXQUFXLEdBQWpCLE1BQU0sV0FBWSxTQUFRLFVBQVU7YUFDWixPQUFFLEdBQUcsVUFBVSxBQUFiLENBQWM7YUFDaEIsZUFBVSxHQUFjO1FBQzlDLEVBQUUsRUFBRSxJQUFJLENBQUMsRUFBRTtRQUNYLGlCQUFpQixFQUFFLFVBQVU7UUFDN0IsdUJBQXVCLEVBQUUsSUFBSTtRQUM3QixJQUFJLEVBQUUsa0JBQWtCLENBQUMsZ0JBQWdCO1FBQ3pDLFdBQVcsRUFBRSxXQUFXO1FBQ3hCLGdCQUFnQixFQUFFLG9RQUFvUTtRQUN0UixXQUFXLEVBQUU7WUFDWixJQUFJLEVBQUUsUUFBUTtZQUNkLFVBQVUsRUFBRTtnQkFDWCxLQUFLLEVBQUU7b0JBQ04sSUFBSSxFQUFFLE9BQU87b0JBQ2IsS0FBSyxFQUFFO3dCQUNOLElBQUksRUFBRSxRQUFRO3FCQUNkO29CQUNELFdBQVcsRUFBRSx1RkFBdUY7aUJBQ3BHO2dCQUNELFNBQVMsRUFBRTtvQkFDVixJQUFJLEVBQUUsT0FBTztvQkFDYixLQUFLLEVBQUU7d0JBQ04sSUFBSSxFQUFFLFFBQVE7cUJBQ2Q7b0JBQ0QsV0FBVyxFQUFFLG1IQUFtSDtpQkFDaEk7YUFDRDtTQUNEO1FBQ0QsZUFBZSxFQUFFLFFBQVEsQ0FBQyw2QkFBNkIsRUFBRSxpQkFBaUIsQ0FBQztRQUMzRSxNQUFNLEVBQUUsY0FBYyxDQUFDLFFBQVE7UUFDL0IsSUFBSSxFQUFFO1lBQ0wsMkJBQTJCO1lBQzNCLG9DQUFvQztZQUNwQyx5Q0FBeUM7WUFDekMscUNBQXFDO1lBQ3JDLG9DQUFvQztTQUNwQztLQUNELEFBbkNnQyxDQW1DL0I7SUFFRixZQUNnQyxZQUEwQixFQUNuQixtQkFBd0MsRUFDbkMsd0JBQWtELEVBQ3hELGtCQUFzQztRQUUzRSxLQUFLLEVBQUUsQ0FBQztRQUx1QixpQkFBWSxHQUFaLFlBQVksQ0FBYztRQUNuQix3QkFBbUIsR0FBbkIsbUJBQW1CLENBQXFCO1FBQ25DLDZCQUF3QixHQUF4Qix3QkFBd0IsQ0FBMEI7UUFDeEQsdUJBQWtCLEdBQWxCLGtCQUFrQixDQUFvQjtJQUc1RSxDQUFDO0lBRUQsS0FBSyxDQUFDLE1BQU0sQ0FBQyxVQUEyQixFQUFFLFdBQWdDLEVBQUUsUUFBc0IsRUFBRSxLQUF3QjtRQUMzSCxNQUFNLE1BQU0sR0FBdUIsVUFBVSxDQUFDLFVBQVUsQ0FBQztRQUN6RCxNQUFNLFNBQVMsR0FBRyxNQUFNLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxNQUFNLEVBQUUsUUFBUSxDQUFDLENBQUM7UUFDbEUsTUFBTSxTQUFTLEdBQUcsTUFBTSxJQUFJLENBQUMsa0JBQWtCLENBQUMsTUFBTSxFQUFFLFNBQVMsRUFBRSxRQUFRLENBQUMsQ0FBQztRQUM3RSxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ3ZCLE9BQU87Z0JBQ04sT0FBTyxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRSx3RkFBd0YsRUFBRSxDQUFDO2dCQUM1SCxlQUFlLEVBQUUsUUFBUSxDQUFDLHFCQUFxQixFQUFFLDZCQUE2QixDQUFDO2FBQy9FLENBQUM7UUFDSCxDQUFDO1FBRUQsUUFBUSxDQUFDLE1BQU0sQ0FBQyxFQUFFLE9BQU8sRUFBRSxRQUFRLENBQUMsNkJBQTZCLEVBQUUsc0JBQXNCLENBQUMsRUFBRSxDQUFDLENBQUM7UUFFOUYsTUFBTSxNQUFNLEdBQUcsTUFBTSxJQUFJLENBQUMsa0JBQWtCLENBQUMsU0FBUyxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQy9ELElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUNiLE9BQU87Z0JBQ04sT0FBTyxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRSxnR0FBZ0csRUFBRSxDQUFDO2dCQUNwSSxlQUFlLEVBQUUsUUFBUSxDQUFDLDBCQUEwQixFQUFFLG1GQUFtRixDQUFDO2FBQzFJLENBQUM7UUFDSCxDQUFDO1FBRUQsTUFBTSxJQUFJLENBQUMsbUJBQW1CLENBQUMsTUFBTSxFQUFFLFFBQVEsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUV4RCxJQUFJLEtBQUssQ0FBQyx1QkFBdUIsRUFBRSxDQUFDO1lBQ25DLElBQUksQ0FBQyxZQUFZLENBQUMsYUFBYSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQztZQUMzQyxPQUFPO2dCQUNOLE9BQU8sRUFBRSxDQUFDLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUUsUUFBUSxDQUFDLDhCQUE4QixFQUFFLHlCQUF5QixDQUFDLEVBQUUsQ0FBQztnQkFDdkcsaUJBQWlCLEVBQUUsUUFBUSxDQUFDLDhCQUE4QixFQUFFLHlCQUF5QixDQUFDO2FBQ3RGLENBQUM7UUFDSCxDQUFDO1FBRUQsT0FBTztZQUNOLE9BQU8sRUFBRSxDQUFDLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUUsSUFBSSxDQUFDLHFCQUFxQixDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUM7WUFDdEUsaUJBQWlCLEVBQUUsbUJBQW1CLENBQUMsc0JBQXNCLENBQUMsSUFBSSxFQUFFLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztTQUM5RSxDQUFDO0lBQ0gsQ0FBQztJQUVPLHFCQUFxQixDQUFDLE1BQXNCO1FBQ25ELE1BQU0sUUFBUSxHQUFHLE1BQU0sQ0FBQyxNQUFNLGlDQUF5QixHQUFHLE1BQU0sQ0FBQyxNQUFNLGdDQUF3QixDQUFDO1FBQ2hHLElBQUksR0FBRyxHQUFHLG1CQUFtQixNQUFNLENBQUMsTUFBTSxnQ0FBd0IsV0FBVyxRQUFRLEtBQUssQ0FBQztRQUMzRixJQUFJLFFBQVEsS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUNwQixPQUFPLEdBQUcsQ0FBQztRQUNaLENBQUM7UUFFRCxLQUFLLE1BQU0sT0FBTyxJQUFJLE1BQU0sQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUNwQyxJQUFJLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxFQUFFLENBQUM7Z0JBQzlDLFNBQVM7WUFDVixDQUFDO1lBRUQsTUFBTSxDQUFDLEVBQUUsR0FBRyxRQUFRLENBQUMsR0FBRyxNQUFNLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDekQsTUFBTSxRQUFRLEdBQUcsUUFBUSxDQUFDLEdBQUcsRUFBRSxDQUFDO1lBQ2hDLEdBQUcsSUFBSSxxQkFBcUIsSUFBSSxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsU0FBUyxJQUFJLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsS0FBSyxDQUFDO1lBQ3ZHLEdBQUcsSUFBSSxPQUFPLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksa0NBQTBCLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUN6RyxHQUFHLElBQUksb0JBQW9CLENBQUM7UUFDN0IsQ0FBQztRQUVELE9BQU8sR0FBRyxDQUFDO0lBQ1osQ0FBQztJQUVELG9GQUFvRjtJQUM1RSxLQUFLLENBQUMsbUJBQW1CLENBQUMsTUFBc0IsRUFBRSxRQUFzQixFQUFFLEtBQXdCO1FBQ3pHLE1BQU0sS0FBSyxHQUFHLElBQUksZUFBZSxFQUFFLENBQUM7UUFFcEMsTUFBTSxNQUFNLEdBQUcsR0FBRyxFQUFFO1lBQ25CLE1BQU0sTUFBTSxHQUFHLHNCQUFzQixDQUFDLENBQUMsTUFBTSxDQUFDLFdBQVcsRUFBRSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7WUFDckUsTUFBTSxJQUFJLEdBQUcsbUJBQW1CLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDekMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFFLE1BQU0sQ0FBQyxRQUFRLEdBQUcsU0FBUyxFQUFFLEtBQUssRUFBRSxNQUFNLENBQUMsY0FBYyxFQUFFLENBQUMsQ0FBQztZQUN6RyxTQUFTLEdBQUcsTUFBTSxDQUFDLFFBQVEsQ0FBQztRQUM3QixDQUFDLENBQUM7UUFFRixJQUFJLFNBQVMsR0FBRyxDQUFDLENBQUM7UUFDbEIsTUFBTSxTQUFTLEdBQUcsS0FBSyxDQUFDLEdBQUcsQ0FBQyxJQUFJLGdCQUFnQixDQUFDLE1BQU0sRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDO1FBRS9ELE9BQU8sSUFBSSxPQUFPLENBQU8sT0FBTyxDQUFDLEVBQUU7WUFDbEMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLEdBQUcsRUFBRTtnQkFDOUIsSUFBSSxDQUFDLFNBQVMsQ0FBQyxXQUFXLEVBQUUsQ0FBQztvQkFDNUIsU0FBUyxDQUFDLFFBQVEsRUFBRSxDQUFDO2dCQUN0QixDQUFDO1lBQ0YsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUVKLEtBQUssQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLHVCQUF1QixDQUFDLEdBQUcsRUFBRTtnQkFDNUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDO2dCQUMzQyxPQUFPLEVBQUUsQ0FBQztZQUNYLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFFSixLQUFLLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUMsR0FBRyxFQUFFO2dCQUNoQyxNQUFNLEVBQUUsQ0FBQztnQkFDVCxPQUFPLEVBQUUsQ0FBQztZQUNYLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDTCxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLENBQUMsS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUM7SUFDbkMsQ0FBQztJQUVEOzs7OztPQUtHO0lBQ0ssS0FBSyxDQUFDLGtCQUFrQixDQUFDLFNBQTBDLEVBQUUsS0FBd0I7UUFDcEcsTUFBTSxLQUFLLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQztRQUNwQyxNQUFNLFlBQVksR0FBRyxLQUFLLENBQUMsR0FBRyxDQUFDLElBQUksT0FBTyxFQUFRLENBQUMsQ0FBQztRQUVwRCxPQUFPLElBQUksT0FBTyxDQUE2QixPQUFPLENBQUMsRUFBRTtZQUN4RCxLQUFLLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxLQUFLLENBQUMsR0FBRyxFQUFFO2dCQUNqQyxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUM7WUFDcEIsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUVKLEtBQUssQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLGdCQUFnQixDQUFDLEVBQUUsQ0FBQyxFQUFFO2dCQUN2RCxJQUFJLFNBQVMsSUFBSSxFQUFFLEVBQUUsQ0FBQztvQkFDckIsS0FBSyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxHQUFHLEVBQUU7d0JBQ25DLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQzt3QkFDaEIsT0FBTyxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQztvQkFDckIsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDTCxDQUFDO1lBQ0YsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUVKLElBQUksQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUFDO2dCQUMxQixLQUFLLGtDQUEwQjtnQkFDL0IsS0FBSyxFQUFFLFNBQVM7Z0JBQ2hCLGFBQWEsRUFBRSxJQUFJO2FBQ25CLEVBQUUsS0FBSyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRTtnQkFDbkIsSUFBSSxDQUFDLEtBQUssQ0FBQyxVQUFVLEVBQUUsQ0FBQztvQkFDdkIsS0FBSyxDQUFDLEdBQUcsQ0FBQyxpQkFBaUIsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxZQUFZLENBQUMsSUFBSSxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQztnQkFDaEUsQ0FBQztZQUNGLENBQUMsQ0FBQyxDQUFDO1FBQ0osQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxDQUFDLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDO0lBQ25DLENBQUM7SUFFRCx3RkFBd0Y7SUFDaEYsS0FBSyxDQUFDLGtCQUFrQixDQUFDLE1BQTBCLEVBQUUsS0FBc0MsRUFBRSxRQUFzQjtRQUMxSCxJQUFJLENBQUMsTUFBTSxDQUFDLFNBQVMsRUFBRSxNQUFNLEVBQUUsQ0FBQztZQUMvQixPQUFPLEtBQUssQ0FBQztRQUNkLENBQUM7UUFFRCxRQUFRLENBQUMsTUFBTSxDQUFDLEVBQUUsT0FBTyxFQUFFLFFBQVEsQ0FBQyxtQ0FBbUMsRUFBRSxvQkFBb0IsQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUVsRyxNQUFNLFNBQVMsR0FBRyxNQUFNLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDO1FBQ3BFLE1BQU0sUUFBUSxHQUFvQyxFQUFFLENBQUM7UUFDckQsTUFBTSxRQUFRLEdBQUcsS0FBSyxFQUFFLElBQW1DLEVBQUUsRUFBRTtZQUM5RCxNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxXQUFXLEVBQUUsQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUNsRCxJQUFJLFNBQVMsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQztnQkFDN0MsUUFBUSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztnQkFDcEIsT0FBTztZQUNSLENBQUM7WUFFRCxJQUFJLElBQUksQ0FBQyxNQUFNLDJDQUFtQyxFQUFFLENBQUM7Z0JBQ3BELE1BQU0sSUFBSSxDQUFDLFlBQVksQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQy9ELENBQUM7WUFDRCxNQUFNLG1CQUFtQixDQUFDLElBQUksQ0FBQyxZQUFZLEVBQUUsSUFBSSxDQUFDLENBQUM7WUFDbkQsTUFBTSxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsR0FBRyxDQUFDLEtBQUssRUFBQyxFQUFFLEVBQUMsRUFBRTtnQkFDbkQsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxVQUFVLENBQUMsV0FBVyxDQUFDLEVBQUUsQ0FBQyxDQUFDO2dCQUMxRCxJQUFJLElBQUksRUFBRSxDQUFDO29CQUNWLE1BQU0sUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDO2dCQUN0QixDQUFDO1lBQ0YsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNMLENBQUMsQ0FBQztRQUVGLE1BQU0sT0FBTyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUM7UUFDdkMsT0FBTyxRQUFRLENBQUM7SUFDakIsQ0FBQztJQUVELG1FQUFtRTtJQUMzRCxLQUFLLENBQUMsa0JBQWtCLENBQUMsTUFBMEIsRUFBRSxRQUFzQjtRQUNsRixJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssRUFBRSxNQUFNLEVBQUUsQ0FBQztZQUMzQixPQUFPLENBQUMsR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLFVBQVUsQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUNwRCxDQUFDO1FBRUQsUUFBUSxDQUFDLE1BQU0sQ0FBQyxFQUFFLE9BQU8sRUFBRSxRQUFRLENBQUMsa0NBQWtDLEVBQUUsc0JBQXNCLENBQUMsRUFBRSxDQUFDLENBQUM7UUFFbkcsTUFBTSxvQkFBb0IsR0FBRyxJQUFJLENBQUMsd0JBQXdCLENBQUMsWUFBWSxFQUFFLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUM7UUFDN0YsTUFBTSxJQUFJLEdBQUcsTUFBTSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUU7WUFDakMsSUFBSSxVQUFVLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztnQkFDbkIsT0FBTyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ3BCLENBQUM7aUJBQU0sSUFBSSxvQkFBb0IsRUFBRSxDQUFDO2dCQUNqQyxPQUFPLEdBQUcsQ0FBQyxRQUFRLENBQUMsb0JBQW9CLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDOUMsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLE9BQU8sU0FBUyxDQUFDO1lBQ2xCLENBQUM7UUFDRixDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLENBQUM7UUFFckIsTUFBTSxLQUFLLEdBQW9DLEVBQUUsQ0FBQztRQUNsRCxLQUFLLE1BQU0sR0FBRyxJQUFJLElBQUksRUFBRSxDQUFDO1lBQ3hCLElBQUksS0FBSyxFQUFFLE1BQU0sSUFBSSxJQUFJLFdBQVcsQ0FBQyxJQUFJLENBQUMsWUFBWSxFQUFFLElBQUksQ0FBQyxtQkFBbUIsRUFBRSxHQUFHLEVBQUUsU0FBUyxFQUFFLEtBQUssQ0FBQyxFQUFFLENBQUM7Z0JBQzFHLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDbEIsQ0FBQztRQUNGLENBQUM7UUFFRCxPQUFPLEtBQUssQ0FBQztJQUNkLENBQUM7SUFFRCxxQkFBcUIsQ0FBQyxPQUEwQyxFQUFFLEtBQXdCO1FBQ3pGLE1BQU0sTUFBTSxHQUF1QixPQUFPLENBQUMsVUFBVSxDQUFDO1FBQ3RELE1BQU0sS0FBSyxHQUFHLFFBQVEsQ0FBQywyQkFBMkIsRUFBRSxpQkFBaUIsQ0FBQyxDQUFDO1FBQ3ZFLE1BQU0sT0FBTyxHQUFHLE1BQU0sQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBUyxFQUFFLEVBQUUsQ0FBQyxHQUFHLEdBQUcsUUFBUSxDQUFDLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDO1FBRTFFLE9BQU8sT0FBTyxDQUFDLE9BQU8sQ0FBQztZQUN0QixpQkFBaUIsRUFBRSxRQUFRLENBQUMsZ0NBQWdDLEVBQUUsa0JBQWtCLENBQUM7WUFDakYsb0JBQW9CLEVBQUU7Z0JBQ3JCLEtBQUs7Z0JBQ0wsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNO29CQUN2QixDQUFDLENBQUMsSUFBSSxjQUFjLEVBQUUsQ0FBQyxjQUFjLENBQUMsUUFBUSxDQUFDLDZCQUE2QixFQUFFLHNDQUFzQyxFQUFFLE9BQU8sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztvQkFDMUksQ0FBQyxDQUFDLFFBQVEsQ0FBQyx5QkFBeUIsRUFBRSxtQ0FBbUMsQ0FBQztnQkFDM0UsZ0JBQWdCLEVBQUUsSUFBSTthQUN0QjtTQUNELENBQUMsQ0FBQztJQUNKLENBQUM7O0FBN1BJLFdBQVc7SUF3Q2QsV0FBQSxZQUFZLENBQUE7SUFDWixXQUFBLG1CQUFtQixDQUFBO0lBQ25CLFdBQUEsd0JBQXdCLENBQUE7SUFDeEIsV0FBQSxrQkFBa0IsQ0FBQTtHQTNDZixXQUFXLENBOFBoQiJ9