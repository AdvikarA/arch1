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
import { timeout } from '../../../../../../base/common/async.js';
import { localize } from '../../../../../../nls.js';
import { ITelemetryService } from '../../../../../../platform/telemetry/common/telemetry.js';
import { IChatService } from '../../../../chat/common/chatService.js';
import { ILanguageModelsService } from '../../../../chat/common/languageModels.js';
import { ToolDataSource } from '../../../../chat/common/languageModelToolsService.js';
import { ITaskService } from '../../../../tasks/common/taskService.js';
import { ITerminalService } from '../../../../terminal/browser/terminal.js';
import { pollForOutputAndIdle, promptForMorePolling, racePollingOrPrompt } from '../bufferOutputPolling.js';
import { getOutput } from '../outputHelpers.js';
import { getTaskDefinition, getTaskForTool } from './taskHelpers.js';
import { MarkdownString } from '../../../../../../base/common/htmlContent.js';
import { IConfigurationService } from '../../../../../../platform/configuration/common/configuration.js';
let RunTaskTool = class RunTaskTool {
    constructor(_tasksService, _telemetryService, _terminalService, _languageModelsService, _chatService, _configurationService) {
        this._tasksService = _tasksService;
        this._telemetryService = _telemetryService;
        this._terminalService = _terminalService;
        this._languageModelsService = _languageModelsService;
        this._chatService = _chatService;
        this._configurationService = _configurationService;
    }
    async invoke(invocation, _countTokens, _progress, token) {
        const args = invocation.parameters;
        if (!invocation.context) {
            return { content: [{ kind: 'text', value: `No invocation context` }], toolResultMessage: `No invocation context` };
        }
        const taskDefinition = getTaskDefinition(args.id);
        const task = await getTaskForTool(args.id, taskDefinition, args.workspaceFolder, this._configurationService, this._tasksService);
        if (!task) {
            return { content: [{ kind: 'text', value: `Task not found: ${args.id}` }], toolResultMessage: new MarkdownString(localize('copilotChat.taskNotFound', 'Task not found: `{0}`', args.id)) };
        }
        const activeTasks = await this._tasksService.getActiveTasks();
        if (activeTasks.includes(task)) {
            return { content: [{ kind: 'text', value: `The task ${taskDefinition.taskLabel} is already running.` }], toolResultMessage: new MarkdownString(localize('copilotChat.taskAlreadyRunning', 'The task `{0}` is already running.', taskDefinition.taskLabel)) };
        }
        const raceResult = await Promise.race([this._tasksService.run(task), timeout(3000)]);
        const result = raceResult && typeof raceResult === 'object' ? raceResult : undefined;
        const resource = this._tasksService.getTerminalForTask(task);
        const terminal = this._terminalService.instances.find(t => t.resource.path === resource?.path && t.resource.scheme === resource.scheme);
        if (!terminal) {
            return { content: [{ kind: 'text', value: `Task started but no terminal was found for: ${taskDefinition.taskLabel}` }], toolResultMessage: new MarkdownString(localize('copilotChat.noTerminal', 'Task started but no terminal was found for: `{0}`', taskDefinition.taskLabel)) };
        }
        _progress.report({ message: new MarkdownString(localize('copilotChat.checkingOutput', 'Checking output for `{0}`', taskDefinition.taskLabel)) });
        let outputAndIdle = await pollForOutputAndIdle({ getOutput: () => getOutput(terminal), isActive: () => this._isTaskActive(task) }, false, token, this._languageModelsService);
        if (!outputAndIdle.terminalExecutionIdleBeforeTimeout) {
            outputAndIdle = await racePollingOrPrompt(() => pollForOutputAndIdle({ getOutput: () => getOutput(terminal), isActive: () => this._isTaskActive(task) }, true, token, this._languageModelsService), () => promptForMorePolling(taskDefinition.taskLabel, invocation.context, this._chatService), outputAndIdle, token, this._languageModelsService, { getOutput: () => getOutput(terminal), isActive: () => this._isTaskActive(task) });
        }
        let output = '';
        if (result?.exitCode) {
            output = `Task failed with exit code.`;
        }
        else {
            if (outputAndIdle.terminalExecutionIdleBeforeTimeout) {
                output += `Task finished`;
            }
            else {
                output += `Task started and will continue to run in the background.`;
            }
        }
        this._telemetryService.publicLog2?.('copilotChat.runTaskTool.run', {
            taskId: args.id,
            bufferLength: outputAndIdle.output.length,
            pollDurationMs: outputAndIdle?.pollDurationMs ?? 0,
        });
        return { content: [{ kind: 'text', value: `The output was ${outputAndIdle.output}` }], toolResultMessage: output };
    }
    async _isTaskActive(task) {
        const activeTasks = await this._tasksService.getActiveTasks();
        return Promise.resolve(activeTasks?.includes(task));
    }
    async prepareToolInvocation(context, token) {
        const args = context.parameters;
        const taskDefinition = getTaskDefinition(args.id);
        const task = await getTaskForTool(args.id, taskDefinition, args.workspaceFolder, this._configurationService, this._tasksService);
        if (!task) {
            return { invocationMessage: new MarkdownString(localize('copilotChat.taskNotFound', 'Task not found: `{0}`', args.id)) };
        }
        const activeTasks = await this._tasksService.getActiveTasks();
        if (task && activeTasks.includes(task)) {
            return { invocationMessage: new MarkdownString(localize('copilotChat.taskAlreadyActive', 'The task is already running.')) };
        }
        if (await this._isTaskActive(task)) {
            return {
                invocationMessage: new MarkdownString(localize('copilotChat.taskIsAlreadyRunning', '`{0}` is already running.', taskDefinition.taskLabel ?? args.id)),
                pastTenseMessage: new MarkdownString(localize('copilotChat.taskWasAlreadyRunning', '`{0}` was already running.', taskDefinition.taskLabel ?? args.id)),
                confirmationMessages: undefined
            };
        }
        return {
            invocationMessage: new MarkdownString(localize('copilotChat.runningTask', 'Running `{0}`', taskDefinition.taskLabel)),
            pastTenseMessage: new MarkdownString(task?.configurationProperties.isBackground
                ? localize('copilotChat.startedTask', 'Started `{0}`', taskDefinition.taskLabel)
                : localize('copilotChat.ranTask', 'Ran `{0}`', taskDefinition.taskLabel)),
            confirmationMessages: task
                ? { title: localize('copilotChat.allowTaskRunTitle', 'Allow task run?'), message: localize('copilotChat.allowTaskRunMsg', 'Allow Copilot to run the task `{0}`?', taskDefinition.taskLabel) }
                : undefined
        };
    }
};
RunTaskTool = __decorate([
    __param(0, ITaskService),
    __param(1, ITelemetryService),
    __param(2, ITerminalService),
    __param(3, ILanguageModelsService),
    __param(4, IChatService),
    __param(5, IConfigurationService)
], RunTaskTool);
export { RunTaskTool };
export const RunTaskToolData = {
    id: 'run_task',
    toolReferenceName: 'runTask2',
    canBeReferencedInPrompt: true,
    displayName: localize('runInTerminalTool.displayName', 'Run Task'),
    modelDescription: 'Runs a VS Code task.\n\n- If you see that an appropriate task exists for building or running code, prefer to use this tool to run the task instead of using the run_in_terminal tool.\n- Make sure that any appropriate build or watch task is running before trying to run tests or execute code.\n- If the user asks to run a task, use this tool to do so.',
    userDescription: localize('runInTerminalTool.userDescription', 'Tool for running tasks in the workspace'),
    source: ToolDataSource.Internal,
    inputSchema: {
        'type': 'object',
        'properties': {
            'workspaceFolder': {
                'type': 'string',
                'description': 'The workspace folder path containing the task'
            },
            'id': {
                'type': 'string',
                'description': 'The task ID to run.'
            }
        },
        'required': [
            'workspaceFolder',
            'id'
        ]
    }
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVuVGFza1Rvb2wuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9hZHZpa2FyL0RvY3VtZW50cy9hcmNoaXRlY3QvYXJjaDIvQXJjaElERS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXJtaW5hbENvbnRyaWIvY2hhdEFnZW50VG9vbHMvYnJvd3Nlci90YXNrL3J1blRhc2tUb29sLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUVqRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFDcEQsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sMERBQTBELENBQUM7QUFDN0YsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ3RFLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBQ25GLE9BQU8sRUFBdUksY0FBYyxFQUFnQixNQUFNLHNEQUFzRCxDQUFDO0FBQ3pPLE9BQU8sRUFBRSxZQUFZLEVBQXNCLE1BQU0seUNBQXlDLENBQUM7QUFDM0YsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDNUUsT0FBTyxFQUFFLG9CQUFvQixFQUFFLG9CQUFvQixFQUFFLG1CQUFtQixFQUFFLE1BQU0sMkJBQTJCLENBQUM7QUFDNUcsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHFCQUFxQixDQUFDO0FBQ2hELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxjQUFjLEVBQUUsTUFBTSxrQkFBa0IsQ0FBQztBQUNyRSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sOENBQThDLENBQUM7QUFDOUUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sa0VBQWtFLENBQUM7QUFvQmxHLElBQU0sV0FBVyxHQUFqQixNQUFNLFdBQVc7SUFFdkIs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