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
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { Codicon } from '../../../../../base/common/codicons.js';
import { ThemeIcon } from '../../../../../base/common/themables.js';
import { MarkdownString } from '../../../../../base/common/htmlContent.js';
import { ToolDataSource } from '../languageModelToolsService.js';
import { ILogService } from '../../../../../platform/log/common/log.js';
import { IChatTodoListService } from '../chatTodoListService.js';
import { ContextKeyExpr } from '../../../../../platform/contextkey/common/contextkey.js';
export const TodoListToolSettingId = 'chat.todoListTool.enabled';
export const ManageTodoListToolToolId = 'vscode_manageTodoList';
export const ManageTodoListToolData = {
    id: ManageTodoListToolToolId,
    toolReferenceName: 'manageTodoList',
    when: ContextKeyExpr.equals(`config.${TodoListToolSettingId}`, true),
    canBeReferencedInPrompt: true,
    icon: ThemeIcon.fromId(Codicon.checklist.id),
    displayName: 'Manage Todo Lists',
    modelDescription: 'A tool for managing todo lists. Can create/update and read items in a todo list. Operations: write (add new todo items or update todo items), read(retrieve all todo items).',
    source: ToolDataSource.Internal,
    inputSchema: {
        type: 'object',
        properties: {
            operation: {
                type: 'string',
                enum: ['write', 'read'],
                description: 'The operation to perform on todo list: write or read. When using write, you must provide the complete todo list, including any new or updated items. Partial updates are not supported.'
            },
            todoList: {
                type: 'array',
                description: 'Array of todo items to be written.  Ignore for read operation ',
                items: {
                    type: 'object',
                    properties: {
                        id: {
                            type: 'number',
                            description: 'Numerical identifier representing the position of the todo item in the ordered list. Lower numbers have higher priority.'
                        },
                        title: {
                            type: 'string',
                            description: 'Short title or summary of the todo item.'
                        },
                        description: {
                            type: 'string',
                            description: 'Detailed description of the todo item.'
                        },
                        status: {
                            type: 'string',
                            enum: ['not-started', 'in-progress', 'completed'],
                            description: 'Current status of the todo item.'
                        },
                    },
                    required: ['id', 'title', 'description', 'status']
                }
            }
        },
        required: ['operation']
    }
};
let ManageTodoListTool = class ManageTodoListTool extends Disposable {
    constructor(chatTodoListService, logService) {
        super();
        this.chatTodoListService = chatTodoListService;
        this.logService = logService;
    }
    async invoke(invocation, _countTokens, _progress, _token) {
        const chatSessionId = invocation.context?.sessionId;
        if (chatSessionId === undefined) {
            throw new Error('A chat session ID is required for this tool');
        }
        const args = invocation.parameters;
        this.logService.debug(`ManageTodoListTool: Invoking with options ${JSON.stringify(args)}`);
        try {
            const storage = this.chatTodoListService.getChatTodoListStorage();
            switch (args.operation) {
                case 'read': {
                    const readResult = this.handleRead(storage, chatSessionId);
                    return {
                        content: [{
                                kind: 'text',
                                value: readResult
                            }]
                    };
                }
                case 'write': {
                    const todoList = args.todoList.map((parsedTodo) => ({
                        id: parsedTodo.id,
                        title: parsedTodo.title,
                        description: parsedTodo.description,
                        status: parsedTodo.status
                    }));
                    storage.setTodoList(chatSessionId, todoList);
                    return {
                        content: [{
                                kind: 'text',
                                value: 'Successfully wrote todo list'
                            }]
                    };
                }
                default: {
                    const errorResult = 'Error: Unknown operation';
                    return {
                        content: [{
                                kind: 'text',
                                value: errorResult
                            }]
                    };
                }
            }
        }
        catch (error) {
            const errorMessage = `Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
            return {
                content: [{
                        kind: 'text',
                        value: errorMessage
                    }]
            };
        }
    }
    async prepareToolInvocation(context, _token) {
        if (!context.chatSessionId) {
            throw new Error('chatSessionId undefined');
        }
        const storage = this.chatTodoListService.getChatTodoListStorage();
        const currentTodoItems = storage.getTodoList(context.chatSessionId);
        const args = context.parameters;
        let message;
        switch (args.operation) {
            case 'write': {
                if (args.todoList) {
                    if (!currentTodoItems.length) {
                        message = 'Creating todo list';
                    }
                    else {
                        message = 'Updating todo list';
                    }
                }
                break;
            }
            case 'read': {
                message = 'Reading all items in todo list';
                break;
            }
            default:
                break;
        }
        const items = args.todoList ?? currentTodoItems;
        const todoList = items.map(todo => ({
            id: todo.id.toString(),
            title: todo.title,
            description: todo.description,
            status: todo.status
        }));
        return {
            invocationMessage: new MarkdownString(message ?? 'Unknown todo list operation'),
            toolSpecificData: {
                kind: 'todoList',
                sessionId: context.chatSessionId,
                todoList: todoList
            }
        };
    }
    handleRead(storage, sessionId) {
        const todoItems = storage.getTodoList(sessionId);
        if (todoItems.length === 0) {
            return 'No todo list found.';
        }
        const markdownTaskList = this.formatTodoListAsMarkdownTaskList(todoItems);
        return `# Task List\n\n${markdownTaskList}`;
    }
    formatTodoListAsMarkdownTaskList(todoList) {
        if (todoList.length === 0) {
            return '';
        }
        return todoList.map(todo => {
            let checkbox;
            switch (todo.status) {
                case 'completed':
                    checkbox = '[x]';
                    break;
                case 'in-progress':
                    checkbox = '[-]';
                    break;
                case 'not-started':
                default:
                    checkbox = '[ ]';
                    break;
            }
            const lines = [`- ${checkbox} ${todo.title}`];
            if (todo.description && todo.description.trim()) {
                lines.push(`  - ${todo.description.trim()}`);
            }
            return lines.join('\n');
        }).join('\n');
    }
};
ManageTodoListTool = __decorate([
    __param(0, IChatTodoListService),
    __param(1, ILogService)
], ManageTodoListTool);
export { ManageTodoListTool };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFuYWdlVG9kb0xpc3RUb29sLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvYWR2aWthci9Eb2N1bWVudHMvYXJjaGl0ZWN0L2FyY2gyL0FyY2hJREUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9jb21tb24vdG9vbHMvbWFuYWdlVG9kb0xpc3RUb29sLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBR2hHLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNyRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDakUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ3BFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUMzRSxPQUFPLEVBS04sY0FBYyxFQUdkLE1BQU0saUNBQWlDLENBQUM7QUFDekMsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBQ3hFLE9BQU8sRUFBYSxvQkFBb0IsRUFBd0IsTUFBTSwyQkFBMkIsQ0FBQztBQUNsRyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0seURBQXlELENBQUM7QUFFekYsTUFBTSxDQUFDLE1BQU0scUJBQXFCLEdBQUcsMkJBQTJCLENBQUM7QUFFakUsTUFBTSxDQUFDLE1BQU0sd0JBQXdCLEdBQUcsdUJBQXVCLENBQUM7QUFFaEUsTUFBTSxDQUFDLE1BQU0sc0JBQXNCLEdBQWM7SUFDaEQsRUFBRSxFQUFFLHdCQUF3QjtJQUM1QixpQkFBaUIsRUFBRSxnQkFBZ0I7SUFDbkMsSUFBSSxFQUFFLGNBQWMsQ0FBQyxNQUFNLENBQUMsVUFBVSxxQkFBcUIsRUFBRSxFQUFFLElBQUksQ0FBQztJQUNwRSx1QkFBdUIsRUFBRSxJQUFJO0lBQzdCLElBQUksRUFBRSxTQUFTLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxTQUFT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