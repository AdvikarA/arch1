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
import { MarkdownString } from '../../../../../../base/common/htmlContent.js';
import { URI } from '../../../../../../base/common/uri.js';
import { IFileService } from '../../../../../../platform/files/common/files.js';
import { VSBuffer } from '../../../../../../base/common/buffer.js';
let CreateAndRunTaskTool = class CreateAndRunTaskTool {
    constructor(_tasksService, _telemetryService, _terminalService, _languageModelsService, _chatService, _fileService) {
        this._tasksService = _tasksService;
        this._telemetryService = _telemetryService;
        this._terminalService = _terminalService;
        this._languageModelsService = _languageModelsService;
        this._chatService = _chatService;
        this._fileService = _fileService;
    }
    async invoke(invocation, _countTokens, _progress, token) {
        const args = invocation.parameters;
        if (!invocation.context) {
            return { content: [{ kind: 'text', value: `No invocation context` }], toolResultMessage: `No invocation context` };
        }
        const tasksJsonUri = URI.file(args.workspaceFolder).with({ path: `${args.workspaceFolder}/.vscode/tasks.json` });
        const exists = await this._fileService.exists(tasksJsonUri);
        const newTask = {
            label: args.task.label,
            type: args.task.type,
            command: args.task.command,
            args: args.task.args,
            isBackground: args.task.isBackground,
            problemMatcher: args.task.problemMatcher,
            group: args.task.group
        };
        const tasksJsonContent = JSON.stringify({
            version: '2.0.0',
            tasks: [newTask]
        }, null, '\t');
        if (!exists) {
            await this._fileService.createFile(tasksJsonUri, VSBuffer.fromString(tasksJsonContent), { overwrite: true });
            _progress.report({ message: 'Created tasks.json file' });
            await timeout(200);
        }
        else {
            // add to the existing tasks.json file
            const content = await this._fileService.readFile(tasksJsonUri);
            const tasksJson = JSON.parse(content.value.toString());
            tasksJson.tasks.push(newTask);
            await this._fileService.writeFile(tasksJsonUri, VSBuffer.fromString(JSON.stringify(tasksJson, null, '\t')));
            _progress.report({ message: 'Updated tasks.json file' });
            await timeout(200);
        }
        _progress.report({ message: new MarkdownString(localize('copilotChat.fetchingTask', 'Resolving the task')) });
        const task = (await this._tasksService.tasks())?.find(t => t._label === args.task.label);
        if (!task) {
            return { content: [{ kind: 'text', value: `Task not found: ${args.task.label}` }], toolResultMessage: new MarkdownString(localize('copilotChat.taskNotFound', 'Task not found: `{0}`', args.task.label)) };
        }
        _progress.report({ message: new MarkdownString(localize('copilotChat.runningTask', 'Running task `{0}`', args.task.label)) });
        const raceResult = await Promise.race([this._tasksService.run(task), timeout(3000)]);
        const result = raceResult && typeof raceResult === 'object' ? raceResult : undefined;
        const resource = this._tasksService.getTerminalForTask(task);
        const terminal = this._terminalService.instances.find(t => t.resource.path === resource?.path && t.resource.scheme === resource.scheme);
        if (!terminal) {
            return { content: [{ kind: 'text', value: `Task started but no terminal was found for: ${args.task.label}` }], toolResultMessage: new MarkdownString(localize('copilotChat.noTerminal', 'Task started but no terminal was found for: `{0}`', args.task.label)) };
        }
        _progress.report({ message: new MarkdownString(localize('copilotChat.checkingOutput', 'Checking output for `{0}`', args.task.label)) });
        let outputAndIdle = await pollForOutputAndIdle({ getOutput: () => getOutput(terminal), isActive: () => this._isTaskActive(task) }, false, token, this._languageModelsService);
        if (!outputAndIdle.terminalExecutionIdleBeforeTimeout) {
            outputAndIdle = await racePollingOrPrompt(() => pollForOutputAndIdle({ getOutput: () => getOutput(terminal), isActive: () => this._isTaskActive(task) }, true, token, this._languageModelsService), () => promptForMorePolling(args.task.label, invocation.context, this._chatService), outputAndIdle, token, this._languageModelsService, { getOutput: () => getOutput(terminal), isActive: () => this._isTaskActive(task) });
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
        this._telemetryService.publicLog2?.('copilotChat.runTaskTool.createAndRunTask', {
            taskLabel: args.task.label,
            bufferLength: outputAndIdle.output.length,
            pollDurationMs: outputAndIdle?.pollDurationMs ?? 0,
        });
        return { content: [{ kind: 'text', value: `The output was ${outputAndIdle.output}` }], toolResultMessage: output };
    }
    async _isTaskActive(task) {
        const activeTasks = await this._tasksService.getActiveTasks();
        return activeTasks?.includes(task) ?? false;
    }
    async prepareToolInvocation(context, token) {
        const args = context.parameters;
        const task = args.task;
        const allTasks = await this._tasksService.tasks();
        if (allTasks?.find(t => t._label === task.label)) {
            return {
                invocationMessage: new MarkdownString(localize('taskExists', 'Task `{0}` already exists.', task.label)),
                pastTenseMessage: new MarkdownString(localize('taskExistsPast', 'Task `{0}` already exists.', task.label)),
                confirmationMessages: undefined
            };
        }
        const activeTasks = await this._tasksService.getActiveTasks();
        if (activeTasks.find(t => t._label === task.label)) {
            return {
                invocationMessage: new MarkdownString(localize('alreadyRunning', 'Task \`{0}\` is already running.', task.label)),
                pastTenseMessage: new MarkdownString(localize('alreadyRunning', 'Task \`{0}\` is already running.', task.label)),
                confirmationMessages: undefined
            };
        }
        return {
            invocationMessage: new MarkdownString(localize('createdTask', 'Created task \`{0}\`', task.label)),
            pastTenseMessage: new MarkdownString(localize('createdTaskPast', 'Created task \`{0}\`', task.label)),
            confirmationMessages: {
                title: localize('allowTaskCreationExecution', 'Allow task creation and execution?'),
                message: new MarkdownString(localize('copilotCreateTask', 'Copilot will create the task \`{0}\` with command \`{1}\`{2}.', task.label, task.command, task.args?.length ? ` and args \`${task.args.join(' ')}\`` : ''))
            }
        };
    }
};
CreateAndRunTaskTool = __decorate([
    __param(0, ITaskService),
    __param(1, ITelemetryService),
    __param(2, ITerminalService),
    __param(3, ILanguageModelsService),
    __param(4, IChatService),
    __param(5, IFileService)
], CreateAndRunTaskTool);
export { CreateAndRunTaskTool };
export const CreateAndRunTaskToolData = {
    id: 'create_and_run_task',
    toolReferenceName: 'createAndRunTask2',
    canBeReferencedInPrompt: true,
    displayName: localize('createAndRunTask.displayName', 'Create and run Task'),
    modelDescription: localize('createAndRunTask.modelDescription', 'For a workspace, this tool will create a task based on the package.json, README.md, and project structure so that the project can be built and run.'),
    userDescription: localize('createAndRunTask.userDescription', "Create and run a task in the workspace"),
    source: ToolDataSource.Internal,
    inputSchema: {
        'type': 'object',
        'properties': {
            'workspaceFolder': {
                'type': 'string',
                'description': 'The absolute path of the workspace folder where the tasks.json file will be created.'
            },
            'task': {
                'type': 'object',
                'description': 'The task to add to the new tasks.json file.',
                'properties': {
                    'label': {
                        'type': 'string',
                        'description': 'The label of the task.'
                    },
                    'type': {
                        'type': 'string',
                        'description': `The type of the task. The only supported value is 'shell'.`,
                        'enum': [
                            'shell'
                        ]
                    },
                    'command': {
                        'type': 'string',
                        'description': 'The shell command to run for the task. Use this to specify commands for building or running the application.'
                    },
                    'args': {
                        'type': 'array',
                        'description': 'The arguments to pass to the command.',
                        'items': {
                            'type': 'string'
                        }
                    },
                    'isBackground': {
                        'type': 'boolean',
                        'description': 'Whether the task runs in the background without blocking the UI or other tasks. Set to true for long-running processes like watch tasks or servers that should continue executing without requiring user attention. When false, the task will block the terminal until completion.'
                    },
                    'problemMatcher': {
                        'type': 'array',
                        'description': `The problem matcher to use to parse task output for errors and warnings. Can be a predefined matcher like '$tsc' (TypeScript), '$eslint - stylish', '$gcc', etc., or a custom pattern defined in tasks.json. This helps VS Code display errors in the Problems panel and enables quick navigation to error locations.`,
                        'items': {
                            'type': 'string'
                        }
                    },
                    'group': {
                        'type': 'string',
                        'description': 'The group to which the task belongs.'
                    }
                },
                'required': [
                    'label',
                    'type',
                    'command'
                ]
            }
        },
        'required': [
            'task',
            'workspaceFolder'
        ]
    },
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3JlYXRlQW5kUnVuVGFza1Rvb2wuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9hZHZpa2FyL0RvY3VtZW50cy9hcmNoaXRlY3QvYXJjaDIvQXJjaElERS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXJtaW5hbENvbnRyaWIvY2hhdEFnZW50VG9vbHMvYnJvd3Nlci90YXNrL2NyZWF0ZUFuZFJ1blRhc2tUb29sLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUVqRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFDcEQsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sMERBQTBELENBQUM7QUFDN0YsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ3RFLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBQ25GLE9BQU8sRUFBdUksY0FBYyxFQUFnQixNQUFNLHNEQUFzRCxDQUFDO0FBQ3pPLE9BQU8sRUFBRSxZQUFZLEVBQXNCLE1BQU0seUNBQXlDLENBQUM7QUFDM0YsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDNUUsT0FBTyxFQUFFLG9CQUFvQixFQUFFLG9CQUFvQixFQUFFLG1CQUFtQixFQUFFLE1BQU0sMkJBQTJCLENBQUM7QUFDNUcsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHFCQUFxQixDQUFDO0FBRWhELE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQztBQUM5RSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDM0QsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQ2hGLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx5Q0FB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