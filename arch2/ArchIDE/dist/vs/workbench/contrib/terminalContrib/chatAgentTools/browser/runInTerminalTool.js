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
var RunInTerminalTool_1;
import { timeout } from '../../../../../base/common/async.js';
import { CancellationError } from '../../../../../base/common/errors.js';
import { MarkdownString } from '../../../../../base/common/htmlContent.js';
import { Disposable, DisposableStore } from '../../../../../base/common/lifecycle.js';
import { OS } from '../../../../../base/common/platform.js';
import { count } from '../../../../../base/common/strings.js';
import { generateUuid } from '../../../../../base/common/uuid.js';
import { localize } from '../../../../../nls.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { IStorageService } from '../../../../../platform/storage/common/storage.js';
import { ITelemetryService } from '../../../../../platform/telemetry/common/telemetry.js';
import { ITerminalLogService } from '../../../../../platform/terminal/common/terminal.js';
import { IWorkspaceContextService } from '../../../../../platform/workspace/common/workspace.js';
import { IRemoteAgentService } from '../../../../services/remote/common/remoteAgentService.js';
import { IChatService } from '../../../chat/common/chatService.js';
import { ILanguageModelToolsService, ToolDataSource } from '../../../chat/common/languageModelToolsService.js';
import { ITerminalService } from '../../../terminal/browser/terminal.js';
import { ITerminalProfileResolverService } from '../../../terminal/common/terminal.js';
import { getRecommendedToolsOverRunInTerminal } from './alternativeRecommendation.js';
import { CommandLineAutoApprover } from './commandLineAutoApprover.js';
import { BasicExecuteStrategy } from './executeStrategy/basicExecuteStrategy.js';
import { NoneExecuteStrategy } from './executeStrategy/noneExecuteStrategy.js';
import { RichExecuteStrategy } from './executeStrategy/richExecuteStrategy.js';
import { isPowerShell } from './runInTerminalHelpers.js';
import { extractInlineSubCommands, splitCommandLineIntoSubCommands } from './subCommands.js';
import { ToolTerminalCreator } from './toolTerminalCreator.js';
import { ILanguageModelsService } from '../../../chat/common/languageModels.js';
import { getOutput, pollForOutputAndIdle, promptForMorePolling, racePollingOrPrompt } from './bufferOutputPolling.js';
const TERMINAL_SESSION_STORAGE_KEY = 'chat.terminalSessions';
export const RunInTerminalToolData = {
    id: 'run_in_terminal',
    toolReferenceName: 'runInTerminal',
    canBeReferencedInPrompt: true,
    displayName: localize('runInTerminalTool.displayName', 'Run in Terminal'),
    modelDescription: [
        'This tool allows you to execute shell commands in a persistent terminal session, preserving environment variables, working directory, and other context across multiple commands.',
        '',
        'Command Execution:',
        '- Supports multi-line commands',
        '',
        'Directory Management:',
        '- Must use absolute paths to avoid navigation issues.',
        '',
        'Program Execution:',
        '- Supports Python, Node.js, and other executables.',
        '- Install dependencies via pip, npm, etc.',
        '',
        'Background Processes:',
        '- For long-running tasks (e.g., servers), set isBackground=true.',
        '- Returns a terminal ID for checking status and runtime later.',
        '',
        'Output Management:',
        '- Output is automatically truncated if longer than 60KB to prevent context overflow',
        '- Use filters like \'head\', \'tail\', \'grep\' to limit output size',
        '- For pager commands, disable paging: use \'git --no-pager\' or add \'| cat\'',
        '',
        'Best Practices:',
        '- Be specific with commands to avoid excessive output',
        '- Use targeted queries instead of broad scans',
        '- Consider using \'wc -l\' to count before listing many items'
    ].join('\n'),
    userDescription: localize('runInTerminalTool.userDescription', 'Tool for running commands in the terminal'),
    source: ToolDataSource.Internal,
    inputSchema: {
        type: 'object',
        properties: {
            command: {
                type: 'string',
                description: 'The command to run in the terminal.'
            },
            explanation: {
                type: 'string',
                description: 'A one-sentence description of what the command does. This will be shown to the user before the command is run.'
            },
            isBackground: {
                type: 'boolean',
                description: 'Whether the command starts a background process. If true, the command will run in the background and you will not see the output. If false, the tool call will block on the command finishing, and then you will get the output. Examples of background processes: building in watch mode, starting a server. You can check the output of a background process later on by using get_terminal_output.'
            },
        },
        required: [
            'command',
            'explanation',
            'isBackground',
        ]
    }
};
/**
 * A set of characters to ignore when reporting telemetry
 */
const telemetryIgnoredSequences = [
    '\x1b[I', // Focus in
    '\x1b[O', // Focus out
];
let RunInTerminalTool = class RunInTerminalTool extends Disposable {
    static { RunInTerminalTool_1 = this; }
    static { this._backgroundExecutions = new Map(); }
    static getBackgroundOutput(id) {
        const backgroundExecution = RunInTerminalTool_1._backgroundExecutions.get(id);
        if (!backgroundExecution) {
            throw new Error('Invalid terminal ID');
        }
        return backgroundExecution.getOutput();
    }
    constructor(_instantiationService, _languageModelToolsService, _storageService, _telemetryService, _logService, _terminalProfileResolverService, _terminalService, _remoteAgentService, _chatService, _workspaceContextService, _languageModelsService) {
        super();
        this._instantiationService = _instantiationService;
        this._languageModelToolsService = _languageModelToolsService;
        this._storageService = _storageService;
        this._telemetryService = _telemetryService;
        this._logService = _logService;
        this._terminalProfileResolverService = _terminalProfileResolverService;
        this._terminalService = _terminalService;
        this._remoteAgentService = _remoteAgentService;
        this._chatService = _chatService;
        this._workspaceContextService = _workspaceContextService;
        this._languageModelsService = _languageModelsService;
        this._sessionTerminalAssociations = new Map();
        this._commandLineAutoApprover = this._register(_instantiationService.createInstance(CommandLineAutoApprover));
        this._osBackend = this._remoteAgentService.getEnvironment().then(remoteEnv => remoteEnv?.os ?? OS);
        // Restore terminal associations from storage
        this._restoreTerminalAssociations();
        this._register(this._terminalService.onDidDisposeInstance(e => {
            for (const [sessionId, toolTerminal] of this._sessionTerminalAssociations.entries()) {
                if (e === toolTerminal.instance) {
                    this._sessionTerminalAssociations.delete(sessionId);
                }
            }
        }));
    }
    async prepareToolInvocation(context, token) {
        const args = context.parameters;
        this._alternativeRecommendation = getRecommendedToolsOverRunInTerminal(args.command, this._languageModelToolsService);
        const presentation = this._alternativeRecommendation ? 'hidden' : undefined;
        const os = await this._osBackend;
        const shell = await this._terminalProfileResolverService.getDefaultShell({
            os,
            remoteAuthority: this._remoteAgentService.getConnection()?.remoteAuthority
        });
        const language = os === 1 /* OperatingSystem.Windows */ ? 'pwsh' : 'sh';
        let confirmationMessages;
        if (this._alternativeRecommendation) {
            confirmationMessages = undefined;
        }
        else {
            const subCommands = splitCommandLineIntoSubCommands(args.command, shell, os);
            const inlineSubCommands = subCommands.map(e => Array.from(extractInlineSubCommands(e, shell, os))).flat();
            const allSubCommands = [...subCommands, ...inlineSubCommands];
            const subCommandResults = allSubCommands.map(e => this._commandLineAutoApprover.isCommandAutoApproved(e, shell, os));
            const commandLineResult = this._commandLineAutoApprover.isCommandLineAutoApproved(args.command);
            const autoApproveReasons = [
                ...subCommandResults.map(e => e.reason),
                commandLineResult.reason,
            ];
            let isAutoApproved = false;
            if (subCommandResults.some(e => e.result === 'denied')) {
                this._logService.info('autoApprove: Sub-command DENIED auto approval');
            }
            else if (commandLineResult.result === 'denied') {
                this._logService.info('autoApprove: Command line DENIED auto approval');
            }
            else {
                if (subCommandResults.every(e => e.result === 'approved')) {
                    this._logService.info('autoApprove: All sub-commands auto-approved');
                    isAutoApproved = true;
                }
                else {
                    this._logService.info('autoApprove: All sub-commands NOT auto-approved');
                    if (commandLineResult.result === 'approved') {
                        this._logService.info('autoApprove: Command line auto-approved');
                        isAutoApproved = true;
                    }
                    else {
                        this._logService.info('autoApprove: Command line NOT auto-approved');
                    }
                }
            }
            // TODO: Surface reason on tool part https://github.com/microsoft/vscode/issues/256780
            for (const reason of autoApproveReasons) {
                this._logService.info(`- ${reason}`);
            }
            confirmationMessages = isAutoApproved ? undefined : {
                title: args.isBackground
                    ? localize('runInTerminal.background', "Run command in background terminal")
                    : localize('runInTerminal.foreground', "Run command in terminal"),
                message: new MarkdownString(args.explanation),
            };
        }
        const instance = context.chatSessionId ? this._sessionTerminalAssociations.get(context.chatSessionId)?.instance : undefined;
        let toolEditedCommand = await this._rewriteCommandIfNeeded(args, instance, shell);
        if (toolEditedCommand === args.command) {
            toolEditedCommand = undefined;
        }
        return {
            confirmationMessages,
            presentation,
            toolSpecificData: {
                kind: 'terminal',
                commandLine: {
                    original: args.command,
                    toolEdited: toolEditedCommand
                },
                language,
            }
        };
    }
    async invoke(invocation, _countTokens, _progress, token) {
        if (this._alternativeRecommendation) {
            return this._alternativeRecommendation;
        }
        const args = invocation.parameters;
        this._logService.debug(`RunInTerminalTool: Invoking with options ${JSON.stringify(args)}`);
        const toolSpecificData = invocation.toolSpecificData;
        if (!toolSpecificData) {
            throw new Error('toolSpecificData must be provided for this tool');
        }
        const chatSessionId = invocation.context?.sessionId;
        if (!invocation.context || chatSessionId === undefined) {
            throw new Error('A chat session ID is required for this tool');
        }
        const command = toolSpecificData.commandLine.userEdited ?? toolSpecificData.commandLine.toolEdited ?? toolSpecificData.commandLine.original;
        const didUserEditCommand = (toolSpecificData.commandLine.userEdited !== undefined &&
            toolSpecificData.commandLine.userEdited !== toolSpecificData.commandLine.original);
        const didToolEditCommand = (!didUserEditCommand &&
            toolSpecificData.commandLine.toolEdited !== undefined &&
            toolSpecificData.commandLine.toolEdited !== toolSpecificData.commandLine.original);
        if (token.isCancellationRequested) {
            throw new CancellationError();
        }
        let error;
        const isNewSession = !args.isBackground && !this._sessionTerminalAssociations.has(chatSessionId);
        const timingStart = Date.now();
        const termId = generateUuid();
        const store = new DisposableStore();
        this._logService.debug(`RunInTerminalTool: Creating ${args.isBackground ? 'background' : 'foreground'} terminal. termId=${termId}, chatSessionId=${chatSessionId}`);
        const toolTerminal = await (args.isBackground ? this._initBackgroundTerminal : this._initForegroundTerminal)(chatSessionId, termId, token);
        this._terminalService.setActiveInstance(toolTerminal.instance);
        const timingConnectMs = Date.now() - timingStart;
        const xterm = await toolTerminal.instance.xtermReadyPromise;
        if (!xterm) {
            throw new Error('Instance was disposed before xterm.js was ready');
        }
        let inputUserChars = 0;
        let inputUserSigint = false;
        store.add(xterm.raw.onData(data => {
            if (!telemetryIgnoredSequences.includes(data)) {
                inputUserChars += data.length;
            }
            inputUserSigint ||= data === '\x03';
        }));
        if (args.isBackground) {
            let outputAndIdle = undefined;
            try {
                this._logService.debug(`RunInTerminalTool: Starting background execution \`${command}\``);
                const execution = new BackgroundTerminalExecution(toolTerminal.instance, xterm, command);
                RunInTerminalTool_1._backgroundExecutions.set(termId, execution);
                outputAndIdle = await pollForOutputAndIdle(execution, false, token, this._languageModelsService);
                if (!outputAndIdle.terminalExecutionIdleBeforeTimeout) {
                    outputAndIdle = await racePollingOrPrompt(() => pollForOutputAndIdle(execution, true, token, this._languageModelsService), () => promptForMorePolling(command, invocation.context, this._chatService), outputAndIdle, token, this._languageModelsService, execution);
                }
                let resultText = (didUserEditCommand
                    ? `Note: The user manually edited the command to \`${command}\`, and that command is now running in terminal with ID=${termId}`
                    : didToolEditCommand
                        ? `Note: The tool simplified the command to \`${command}\`, and that command is now running in terminal with ID=${termId}`
                        : `Command is running in terminal with ID=${termId}`);
                if (outputAndIdle && outputAndIdle.modelOutputEvalResponse) {
                    resultText += `\n\ The command became idle with output:\n${outputAndIdle.modelOutputEvalResponse}`;
                }
                else if (outputAndIdle) {
                    resultText += `\n\ The command is still running, with output:\n${outputAndIdle.output}`;
                }
                return {
                    content: [{
                            kind: 'text',
                            value: resultText,
                        }]
                };
            }
            catch (e) {
                error = 'threw';
                if (termId) {
                    RunInTerminalTool_1._backgroundExecutions.get(termId)?.dispose();
                    RunInTerminalTool_1._backgroundExecutions.delete(termId);
                }
                throw e;
            }
            finally {
                store.dispose();
                this._logService.debug(`RunInTerminalTool: Finished polling \`${outputAndIdle?.output.length}\` lines of output in \`${outputAndIdle?.pollDurationMs}\``);
                const timingExecuteMs = Date.now() - timingStart;
                this._sendTelemetry(toolTerminal.instance, {
                    didUserEditCommand,
                    didToolEditCommand,
                    shellIntegrationQuality: toolTerminal.shellIntegrationQuality,
                    isBackground: true,
                    error,
                    exitCode: undefined,
                    isNewSession: true,
                    timingExecuteMs,
                    timingConnectMs,
                    terminalExecutionIdleBeforeTimeout: outputAndIdle?.terminalExecutionIdleBeforeTimeout,
                    outputLineCount: outputAndIdle?.output ? count(outputAndIdle.output, '\n') : 0,
                    pollDurationMs: outputAndIdle?.pollDurationMs,
                    inputUserChars,
                    inputUserSigint,
                });
            }
        }
        else {
            let terminalResult = '';
            let outputLineCount = -1;
            let exitCode;
            try {
                let strategy;
                const commandDetection = toolTerminal.instance.capabilities.get(2 /* TerminalCapability.CommandDetection */);
                switch (toolTerminal.shellIntegrationQuality) {
                    case "none" /* ShellIntegrationQuality.None */: {
                        strategy = this._instantiationService.createInstance(NoneExecuteStrategy, toolTerminal.instance);
                        break;
                    }
                    case "basic" /* ShellIntegrationQuality.Basic */: {
                        strategy = this._instantiationService.createInstance(BasicExecuteStrategy, toolTerminal.instance, commandDetection);
                        break;
                    }
                    case "rich" /* ShellIntegrationQuality.Rich */: {
                        strategy = this._instantiationService.createInstance(RichExecuteStrategy, toolTerminal.instance, commandDetection);
                        break;
                    }
                }
                this._logService.debug(`RunInTerminalTool: Using \`${strategy.type}\` execute strategy for command \`${command}\``);
                const executeResult = await strategy.execute(command, token);
                this._logService.debug(`RunInTerminalTool: Finished \`${strategy.type}\` execute strategy with exitCode \`${executeResult.exitCode}\`, result.length \`${executeResult.output?.length}\`, error \`${executeResult.error}\``);
                outputLineCount = executeResult.output === undefined ? 0 : count(executeResult.output.trim(), '\n') + 1;
                exitCode = executeResult.exitCode;
                error = executeResult.error;
                const resultArr = [];
                if (executeResult.output !== undefined) {
                    resultArr.push(executeResult.output);
                }
                if (executeResult.additionalInformation) {
                    resultArr.push(executeResult.additionalInformation);
                }
                terminalResult = resultArr.join('\n\n');
            }
            catch (e) {
                this._logService.debug(`RunInTerminalTool: Threw exception`);
                toolTerminal.instance.dispose();
                error = 'threw';
                throw e;
            }
            finally {
                store.dispose();
                const timingExecuteMs = Date.now() - timingStart;
                this._sendTelemetry(toolTerminal.instance, {
                    didUserEditCommand,
                    didToolEditCommand,
                    isBackground: false,
                    shellIntegrationQuality: toolTerminal.shellIntegrationQuality,
                    error,
                    isNewSession,
                    outputLineCount,
                    exitCode,
                    timingExecuteMs,
                    timingConnectMs,
                    inputUserChars,
                    inputUserSigint,
                });
            }
            const resultText = [];
            if (didUserEditCommand) {
                resultText.push(`Note: The user manually edited the command to \`${command}\`, and this is the output of running that command instead:\n`);
            }
            else if (didToolEditCommand) {
                resultText.push(`Note: The tool simplified the command to \`${command}\`, and this is the output of running that command instead:\n`);
            }
            resultText.push(terminalResult);
            return {
                content: [{
                        kind: 'text',
                        value: resultText.join(''),
                    }]
            };
        }
    }
    async _initBackgroundTerminal(chatSessionId, termId, token) {
        this._logService.debug(`RunInTerminalTool: Creating background terminal with ID=${termId}`);
        const toolTerminal = await this._instantiationService.createInstance(ToolTerminalCreator).createTerminal(token);
        this._sessionTerminalAssociations.set(chatSessionId, toolTerminal);
        if (token.isCancellationRequested) {
            toolTerminal.instance.dispose();
            throw new CancellationError();
        }
        await this._setupTerminalAssociation(toolTerminal, chatSessionId, termId, true);
        return toolTerminal;
    }
    async _initForegroundTerminal(chatSessionId, termId, token) {
        const cachedTerminal = this._sessionTerminalAssociations.get(chatSessionId);
        if (cachedTerminal) {
            this._logService.debug(`RunInTerminalTool: Using cached foreground terminal with session ID \`${chatSessionId}\``);
            return cachedTerminal;
        }
        const toolTerminal = await this._instantiationService.createInstance(ToolTerminalCreator).createTerminal(token);
        this._sessionTerminalAssociations.set(chatSessionId, toolTerminal);
        if (token.isCancellationRequested) {
            toolTerminal.instance.dispose();
            throw new CancellationError();
        }
        await this._setupTerminalAssociation(toolTerminal, chatSessionId, termId, false);
        return toolTerminal;
    }
    async _rewriteCommandIfNeeded(args, instance, shell) {
        const commandLine = args.command;
        const os = await this._osBackend;
        // Re-write the command if it starts with `cd <dir> && <suffix>` or `cd <dir>; <suffix>`
        // to just `<suffix>` if the directory matches the current terminal's cwd. This simplifies
        // the result in the chat by removing redundancies that some models like to add.
        const isPwsh = isPowerShell(shell, os);
        const cdPrefixMatch = commandLine.match(isPwsh
            ? /^(?:cd(?: \/d)?|Set-Location(?: -Path)?) (?<dir>[^\s]+) ?(?:&&|;)\s+(?<suffix>.+)$/i
            : /^cd (?<dir>[^\s]+) &&\s+(?<suffix>.+)$/);
        const cdDir = cdPrefixMatch?.groups?.dir;
        const cdSuffix = cdPrefixMatch?.groups?.suffix;
        if (cdDir && cdSuffix) {
            let cwd;
            // Get the current session terminal's cwd
            if (instance) {
                cwd = await instance.getCwdResource();
            }
            // If a terminal is not available, use the workspace root
            if (!cwd) {
                const workspaceFolders = this._workspaceContextService.getWorkspace().folders;
                if (workspaceFolders.length === 1) {
                    cwd = workspaceFolders[0].uri;
                }
            }
            // Re-write the command if it matches the cwd
            if (cwd) {
                // Remove any surrounding quotes
                let cdDirPath = cdDir;
                if (cdDirPath.startsWith('"') && cdDirPath.endsWith('"')) {
                    cdDirPath = cdDirPath.slice(1, -1);
                }
                // Normalize trailing slashes
                cdDirPath = cdDirPath.replace(/(?:[\\\/])$/, '');
                let cwdFsPath = cwd.fsPath.replace(/(?:[\\\/])$/, '');
                // Case-insensitive comparison on Windows
                if (os === 1 /* OperatingSystem.Windows */) {
                    cdDirPath = cdDirPath.toLowerCase();
                    cwdFsPath = cwdFsPath.toLowerCase();
                }
                if (cdDirPath === cwdFsPath) {
                    return cdSuffix;
                }
            }
        }
        return commandLine;
    }
    _restoreTerminalAssociations() {
        const storedAssociations = this._storageService.get(TERMINAL_SESSION_STORAGE_KEY, 1 /* StorageScope.WORKSPACE */, '{}');
        try {
            const associations = JSON.parse(storedAssociations);
            // Find existing terminals and associate them with sessions
            for (const instance of this._terminalService.instances) {
                if (instance.processId) {
                    const association = associations[instance.processId];
                    if (association) {
                        this._logService.debug(`RunInTerminalTool: Restored terminal association for PID ${instance.processId}, session ${association.sessionId}`);
                        const toolTerminal = {
                            instance,
                            shellIntegrationQuality: association.shellIntegrationQuality
                        };
                        this._sessionTerminalAssociations.set(association.sessionId, toolTerminal);
                        // Listen for terminal disposal to clean up storage
                        this._register(instance.onDisposed(() => {
                            this._removeTerminalAssociation(instance.processId);
                        }));
                    }
                }
            }
        }
        catch (error) {
            this._logService.debug(`RunInTerminalTool: Failed to restore terminal associations: ${error}`);
        }
    }
    async _setupTerminalAssociation(toolTerminal, chatSessionId, termId, isBackground) {
        await this._associateTerminalWithSession(toolTerminal.instance, chatSessionId, termId, toolTerminal.shellIntegrationQuality, isBackground);
        this._register(toolTerminal.instance.onDisposed(() => {
            if (toolTerminal.instance.processId) {
                this._removeTerminalAssociation(toolTerminal.instance.processId);
            }
        }));
    }
    async _associateTerminalWithSession(terminal, sessionId, id, shellIntegrationQuality, isBackground) {
        try {
            // Wait for process ID with timeout
            const pid = await Promise.race([
                terminal.processReady.then(() => terminal.processId),
                timeout(5000).then(() => { throw new Error('Timeout'); })
            ]);
            if (typeof pid === 'number') {
                const storedAssociations = this._storageService.get(TERMINAL_SESSION_STORAGE_KEY, 1 /* StorageScope.WORKSPACE */, '{}');
                const associations = JSON.parse(storedAssociations);
                const existingAssociation = associations[pid] || {};
                associations[pid] = {
                    ...existingAssociation,
                    sessionId,
                    shellIntegrationQuality,
                    id,
                    isBackground
                };
                this._storageService.store(TERMINAL_SESSION_STORAGE_KEY, JSON.stringify(associations), 1 /* StorageScope.WORKSPACE */, 0 /* StorageTarget.USER */);
                this._logService.debug(`RunInTerminalTool: Associated terminal PID ${pid} with session ${sessionId}`);
            }
        }
        catch (error) {
            this._logService.debug(`RunInTerminalTool: Failed to associate terminal with session: ${error}`);
        }
    }
    async _removeTerminalAssociation(pid) {
        try {
            const storedAssociations = this._storageService.get(TERMINAL_SESSION_STORAGE_KEY, 1 /* StorageScope.WORKSPACE */, '{}');
            const associations = JSON.parse(storedAssociations);
            if (associations[pid]) {
                delete associations[pid];
                this._storageService.store(TERMINAL_SESSION_STORAGE_KEY, JSON.stringify(associations), 1 /* StorageScope.WORKSPACE */, 0 /* StorageTarget.USER */);
                this._logService.debug(`RunInTerminalTool: Removed terminal association for PID ${pid}`);
            }
        }
        catch (error) {
            this._logService.debug(`RunInTerminalTool: Failed to remove terminal association: ${error}`);
        }
    }
    _sendTelemetry(instance, state) {
        this._telemetryService.publicLog2('toolUse.runInTerminal', {
            terminalSessionId: instance.sessionId,
            result: state.error ?? 'success',
            strategy: state.shellIntegrationQuality === "rich" /* ShellIntegrationQuality.Rich */ ? 2 : state.shellIntegrationQuality === "basic" /* ShellIntegrationQuality.Basic */ ? 1 : 0,
            userEditedCommand: state.didUserEditCommand ? 1 : 0,
            toolEditedCommand: state.didToolEditCommand ? 1 : 0,
            isBackground: state.isBackground ? 1 : 0,
            isNewSession: state.isNewSession ? 1 : 0,
            outputLineCount: state.outputLineCount,
            nonZeroExitCode: state.exitCode === undefined ? -1 : state.exitCode === 0 ? 0 : 1,
            timingConnectMs: state.timingConnectMs,
            pollDurationMs: state.pollDurationMs ?? 0,
            terminalExecutionIdleBeforeTimeout: state.terminalExecutionIdleBeforeTimeout ?? false,
            inputUserChars: state.inputUserChars,
            inputUserSigint: state.inputUserSigint,
        });
    }
};
RunInTerminalTool = RunInTerminalTool_1 = __decorate([
    __param(0, IInstantiationService),
    __param(1, ILanguageModelToolsService),
    __param(2, IStorageService),
    __param(3, ITelemetryService),
    __param(4, ITerminalLogService),
    __param(5, ITerminalProfileResolverService),
    __param(6, ITerminalService),
    __param(7, IRemoteAgentService),
    __param(8, IChatService),
    __param(9, IWorkspaceContextService),
    __param(10, ILanguageModelsService)
], RunInTerminalTool);
export { RunInTerminalTool };
class BackgroundTerminalExecution extends Disposable {
    constructor(_instance, _xterm, _commandLine) {
        super();
        this._instance = _instance;
        this._xterm = _xterm;
        this._commandLine = _commandLine;
        this._startMarker = this._register(this._xterm.raw.registerMarker());
        this._instance.runCommand(this._commandLine, true);
    }
    getOutput() {
        return getOutput(this._instance, this._startMarker);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVuSW5UZXJtaW5hbFRvb2wuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9hZHZpa2FyL0RvY3VtZW50cy9hcmNoaXRlY3QvYXJjaDIvQXJjaElERS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXJtaW5hbENvbnRyaWIvY2hhdEFnZW50VG9vbHMvYnJvd3Nlci9ydW5JblRlcm1pbmFsVG9vbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFHaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBRTlELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ3pFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUMzRSxPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ3RGLE9BQU8sRUFBbUIsRUFBRSxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDN0UsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBRTlELE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUNsRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFDakQsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0RBQStELENBQUM7QUFDdEcsT0FBTyxFQUFFLGVBQWUsRUFBK0IsTUFBTSxtREFBbUQsQ0FBQztBQUNqSCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx1REFBdUQsQ0FBQztBQUUxRixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxxREFBcUQsQ0FBQztBQUMxRixPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSx1REFBdUQsQ0FBQztBQUNqRyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSwwREFBMEQsQ0FBQztBQUMvRixPQUFPLEVB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