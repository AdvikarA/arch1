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
import { Action } from '../../../../base/common/actions.js';
import { disposableTimeout } from '../../../../base/common/async.js';
import { CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { createErrorWithActions } from '../../../../base/common/errorMessage.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import severity from '../../../../base/common/severity.js';
import * as nls from '../../../../nls.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { IMarkerService, MarkerSeverity } from '../../../../platform/markers/common/markers.js';
import { IProgressService } from '../../../../platform/progress/common/progress.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { DEBUG_CONFIGURE_COMMAND_ID, DEBUG_CONFIGURE_LABEL } from './debugCommands.js';
import { Markers } from '../../markers/common/markers.js';
import { ConfiguringTask, CustomTask, TaskEventKind } from '../../tasks/common/tasks.js';
import { ITaskService } from '../../tasks/common/taskService.js';
import { IViewsService } from '../../../services/views/common/viewsService.js';
const onceFilter = (event, filter) => Event.once(Event.filter(event, filter));
export var TaskRunResult;
(function (TaskRunResult) {
    TaskRunResult[TaskRunResult["Failure"] = 0] = "Failure";
    TaskRunResult[TaskRunResult["Success"] = 1] = "Success";
})(TaskRunResult || (TaskRunResult = {}));
const DEBUG_TASK_ERROR_CHOICE_KEY = 'debug.taskerrorchoice';
const ABORT_LABEL = nls.localize('abort', "Abort");
const DEBUG_ANYWAY_LABEL = nls.localize({ key: 'debugAnyway', comment: ['&& denotes a mnemonic'] }, "&&Debug Anyway");
const DEBUG_ANYWAY_LABEL_NO_MEMO = nls.localize('debugAnywayNoMemo', "Debug Anyway");
let DebugTaskRunner = class DebugTaskRunner {
    constructor(taskService, markerService, configurationService, viewsService, dialogService, storageService, commandService, progressService) {
        this.taskService = taskService;
        this.markerService = markerService;
        this.configurationService = configurationService;
        this.viewsService = viewsService;
        this.dialogService = dialogService;
        this.storageService = storageService;
        this.commandService = commandService;
        this.progressService = progressService;
        this.globalCancellation = new CancellationTokenSource();
    }
    cancel() {
        this.globalCancellation.dispose(true);
        this.globalCancellation = new CancellationTokenSource();
    }
    dispose() {
        this.globalCancellation.dispose(true);
    }
    async runTaskAndCheckErrors(root, taskId) {
        try {
            const taskSummary = await this.runTask(root, taskId, this.globalCancellation.token);
            if (taskSummary && (taskSummary.exitCode === undefined || taskSummary.cancelled)) {
                // User canceled, either debugging, or the prelaunch task
                return 0 /* TaskRunResult.Failure */;
            }
            const errorCount = taskId ? this.markerService.read({ severities: MarkerSeverity.Error, take: 2 }).length : 0;
            const successExitCode = taskSummary && taskSummary.exitCode === 0;
            const failureExitCode = taskSummary && taskSummary.exitCode !== 0;
            const onTaskErrors = this.configurationService.getValue('debug').onTaskErrors;
            if (successExitCode || onTaskErrors === 'debugAnyway' || (errorCount === 0 && !failureExitCode)) {
                return 1 /* TaskRunResult.Success */;
            }
            if (onTaskErrors === 'showErrors') {
                await this.viewsService.openView(Markers.MARKERS_VIEW_ID, true);
                return Promise.resolve(0 /* TaskRunResult.Failure */);
            }
            if (onTaskErrors === 'abort') {
                return Promise.resolve(0 /* TaskRunResult.Failure */);
            }
            const taskLabel = typeof taskId === 'string' ? taskId : taskId ? taskId.name : '';
            const message = errorCount > 1
                ? nls.localize('preLaunchTaskErrors', "Errors exist after running preLaunchTask '{0}'.", taskLabel)
                : errorCount === 1
                    ? nls.localize('preLaunchTaskError', "Error exists after running preLaunchTask '{0}'.", taskLabel)
                    : taskSummary && typeof taskSummary.exitCode === 'number'
                        ? nls.localize('preLaunchTaskExitCode', "The preLaunchTask '{0}' terminated with exit code {1}.", taskLabel, taskSummary.exitCode)
                        : nls.localize('preLaunchTaskTerminated', "The preLaunchTask '{0}' terminated.", taskLabel);
            let DebugChoice;
            (function (DebugChoice) {
                DebugChoice[DebugChoice["DebugAnyway"] = 1] = "DebugAnyway";
                DebugChoice[DebugChoice["ShowErrors"] = 2] = "ShowErrors";
                DebugChoice[DebugChoice["Cancel"] = 0] = "Cancel";
            })(DebugChoice || (DebugChoice = {}));
            const { result, checkboxChecked } = await this.dialogService.prompt({
                type: severity.Warning,
                message,
                buttons: [
                    {
                        label: DEBUG_ANYWAY_LABEL,
                        run: () => DebugChoice.DebugAnyway
                    },
                    {
                        label: nls.localize({ key: 'showErrors', comment: ['&& denotes a mnemonic'] }, "&&Show Errors"),
                        run: () => DebugChoice.ShowErrors
                    }
                ],
                cancelButton: {
                    label: ABORT_LABEL,
                    run: () => DebugChoice.Cancel
                },
                checkbox: {
                    label: nls.localize('remember', "Remember my choice in user settings"),
                }
            });
            const debugAnyway = result === DebugChoice.DebugAnyway;
            const abort = result === DebugChoice.Cancel;
            if (checkboxChecked) {
                this.configurationService.updateValue('debug.onTaskErrors', result === DebugChoice.DebugAnyway ? 'debugAnyway' : abort ? 'abort' : 'showErrors');
            }
            if (abort) {
                return Promise.resolve(0 /* TaskRunResult.Failure */);
            }
            if (debugAnyway) {
                return 1 /* TaskRunResult.Success */;
            }
            await this.viewsService.openView(Markers.MARKERS_VIEW_ID, true);
            return Promise.resolve(0 /* TaskRunResult.Failure */);
        }
        catch (err) {
            const taskConfigureAction = this.taskService.configureAction();
            const choiceMap = JSON.parse(this.storageService.get(DEBUG_TASK_ERROR_CHOICE_KEY, 1 /* StorageScope.WORKSPACE */, '{}'));
            let choice = -1;
            let DebugChoice;
            (function (DebugChoice) {
                DebugChoice[DebugChoice["DebugAnyway"] = 0] = "DebugAnyway";
                DebugChoice[DebugChoice["ConfigureTask"] = 1] = "ConfigureTask";
                DebugChoice[DebugChoice["Cancel"] = 2] = "Cancel";
            })(DebugChoice || (DebugChoice = {}));
            if (choiceMap[err.message] !== undefined) {
                choice = choiceMap[err.message];
            }
            else {
                const { result, checkboxChecked } = await this.dialogService.prompt({
                    type: severity.Error,
                    message: err.message,
                    buttons: [
                        {
                            label: nls.localize({ key: 'debugAnyway', comment: ['&& denotes a mnemonic'] }, "&&Debug Anyway"),
                            run: () => DebugChoice.DebugAnyway
                        },
                        {
                            label: taskConfigureAction.label,
                            run: () => DebugChoice.ConfigureTask
                        }
                    ],
                    cancelButton: {
                        run: () => DebugChoice.Cancel
                    },
                    checkbox: {
                        label: nls.localize('rememberTask', "Remember my choice for this task")
                    }
                });
                choice = result;
                if (checkboxChecked) {
                    choiceMap[err.message] = choice;
                    this.storageService.store(DEBUG_TASK_ERROR_CHOICE_KEY, JSON.stringify(choiceMap), 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
                }
            }
            if (choice === DebugChoice.ConfigureTask) {
                await taskConfigureAction.run();
            }
            return choice === DebugChoice.DebugAnyway ? 1 /* TaskRunResult.Success */ : 0 /* TaskRunResult.Failure */;
        }
    }
    async runTask(root, taskId, token = this.globalCancellation.token) {
        if (!taskId) {
            return Promise.resolve(null);
        }
        if (!root) {
            return Promise.reject(new Error(nls.localize('invalidTaskReference', "Task '{0}' can not be referenced from a launch configuration that is in a different workspace folder.", typeof taskId === 'string' ? taskId : taskId.type)));
        }
        // run a task before starting a debug session
        const task = await this.taskService.getTask(root, taskId);
        if (!task) {
            const errorMessage = typeof taskId === 'string'
                ? nls.localize('DebugTaskNotFoundWithTaskId', "Could not find the task '{0}'.", taskId)
                : nls.localize('DebugTaskNotFound', "Could not find the specified task.");
            return Promise.reject(createErrorWithActions(errorMessage, [new Action(DEBUG_CONFIGURE_COMMAND_ID, DEBUG_CONFIGURE_LABEL, undefined, true, () => this.commandService.executeCommand(DEBUG_CONFIGURE_COMMAND_ID))]));
        }
        // If a task is missing the problem matcher the promise will never complete, so we need to have a workaround #35340
        let taskStarted = false;
        const store = new DisposableStore();
        const getTaskKey = (t) => t.getKey() ?? t.getMapKey();
        const taskKey = getTaskKey(task);
        const inactivePromise = new Promise((resolve) => store.add(onceFilter(this.taskService.onDidStateChange, e => {
            // When a task isBackground it will go inactive when it is safe to launch.
            // But when a background task is terminated by the user, it will also fire an inactive event.
            // This means that we will not get to see the real exit code from running the task (undefined when terminated by the user).
            // Catch the ProcessEnded event here, which occurs before inactive, and capture the exit code to prevent this.
            return (e.kind === TaskEventKind.Inactive
                || (e.kind === TaskEventKind.ProcessEnded && e.exitCode === undefined))
                && getTaskKey(e.__task) === taskKey;
        })(e => {
            taskStarted = true;
            resolve(e.kind === TaskEventKind.ProcessEnded ? { exitCode: e.exitCode } : null);
        })));
        store.add(onceFilter(this.taskService.onDidStateChange, e => ((e.kind === TaskEventKind.Active) || (e.kind === TaskEventKind.DependsOnStarted)) && getTaskKey(e.__task) === taskKey)(() => {
            // Task is active, so everything seems to be fine, no need to prompt after 10 seconds
            // Use case being a slow running task should not be prompted even though it takes more than 10 seconds
            taskStarted = true;
        }));
        const didAcquireInput = store.add(new Emitter());
        store.add(onceFilter(this.taskService.onDidStateChange, e => (e.kind === TaskEventKind.AcquiredInput) && getTaskKey(e.__task) === taskKey)(() => didAcquireInput.fire()));
        const taskDonePromise = this.taskService.getActiveTasks().then(async (tasks) => {
            if (tasks.find(t => getTaskKey(t) === taskKey)) {
                didAcquireInput.fire();
                // Check that the task isn't busy and if it is, wait for it
                const busyTasks = await this.taskService.getBusyTasks();
                if (busyTasks.find(t => getTaskKey(t) === taskKey)) {
                    taskStarted = true;
                    return inactivePromise;
                }
                // task is already running and isn't busy - nothing to do.
                return Promise.resolve(null);
            }
            const taskPromise = this.taskService.run(task);
            if (task.configurationProperties.isBackground) {
                return inactivePromise;
            }
            return taskPromise.then(x => x ?? null);
        });
        const result = new Promise((resolve, reject) => {
            taskDonePromise.then(result => {
                taskStarted = true;
                resolve(result);
            }, error => reject(error));
            store.add(token.onCancellationRequested(() => {
                resolve({ exitCode: undefined, cancelled: true });
                this.taskService.terminate(task).catch(() => { });
            }));
            // Start the timeouts once a terminal has been acquired
            store.add(didAcquireInput.event(() => {
                const waitTime = task.configurationProperties.isBackground ? 5000 : 10000;
                // Error shown if there's a background task with no problem matcher that doesn't exit quickly
                store.add(disposableTimeout(() => {
                    if (!taskStarted) {
                        const errorMessage = nls.localize('taskNotTracked', "The task '{0}' has not exited and doesn't have a 'problemMatcher' defined. Make sure to define a problem matcher for watch tasks.", typeof taskId === 'string' ? taskId : JSON.stringify(taskId));
                        reject({ severity: severity.Error, message: errorMessage });
                    }
                }, waitTime));
                const hideSlowPreLaunchWarning = this.configurationService.getValue('debug').hideSlowPreLaunchWarning;
                if (!hideSlowPreLaunchWarning) {
                    // Notification shown on any task taking a while to resolve
                    store.add(disposableTimeout(() => {
                        const message = nls.localize('runningTask', "Waiting for preLaunchTask '{0}'...", task.configurationProperties.name);
                        const buttons = [DEBUG_ANYWAY_LABEL_NO_MEMO, ABORT_LABEL];
                        const canConfigure = task instanceof CustomTask || task instanceof ConfiguringTask;
                        if (canConfigure) {
                            buttons.splice(1, 0, nls.localize('configureTask', "Configure Task"));
                        }
                        this.progressService.withProgress({ location: 15 /* ProgressLocation.Notification */, title: message, buttons }, () => result.catch(() => { }), (choice) => {
                            if (choice === undefined) {
                                // no-op, keep waiting
                            }
                            else if (choice === 0) { // debug anyway
                                resolve({ exitCode: 0 });
                            }
                            else { // abort or configure
                                resolve({ exitCode: undefined, cancelled: true });
                                this.taskService.terminate(task).catch(() => { });
                                if (canConfigure && choice === 1) { // configure
                                    this.taskService.openConfig(task);
                                }
                            }
                        });
                    }, 10_000));
                }
            }));
        });
        return result.finally(() => store.dispose());
    }
};
DebugTaskRunner = __decorate([
    __param(0, ITaskService),
    __param(1, IMarkerService),
    __param(2, IConfigurationService),
    __param(3, IViewsService),
    __param(4, IDialogService),
    __param(5, IStorageService),
    __param(6, ICommandService),
    __param(7, IProgressService)
], DebugTaskRunner);
export { DebugTaskRunner };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVidWdUYXNrUnVubmVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvYWR2aWthci9Eb2N1bWVudHMvYXJjaGl0ZWN0L2FyY2gyL0FyY2hJREUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvZGVidWcvYnJvd3Nlci9kZWJ1Z1Rhc2tSdW5uZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQzVELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ3JFLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ2xGLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ2pGLE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDbEUsT0FBTyxFQUFFLGVBQWUsRUFBZSxNQUFNLHNDQUFzQyxDQUFDO0FBQ3BGLE9BQU8sUUFBUSxNQUFNLHFDQUFxQyxDQUFDO0FBQzNELE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUM7QUFDMUMsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQ25GLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ25HLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUNoRixPQUFPLEVBQUUsY0FBYyxFQUFFLGNBQWMsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQ2hHLE9BQU8sRUFBRSxnQkFBZ0IsRUFBb0IsTUFBTSxrREFBa0QsQ0FBQztBQUN0RyxPQUFPLEVBQUUsZUFBZSxFQUErQixNQUFNLGdEQUFnRCxDQUFDO0FBRTlHLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxxQkFBcUIsRUFBRSxNQUFNLG9CQUFv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