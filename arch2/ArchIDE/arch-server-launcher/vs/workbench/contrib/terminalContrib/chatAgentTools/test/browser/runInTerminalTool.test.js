/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ok, strictEqual } from 'assert';
import { CancellationToken } from '../../../../../../base/common/cancellation.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../../base/test/common/utils.js';
import { TestConfigurationService } from '../../../../../../platform/configuration/test/common/testConfigurationService.js';
import { workbenchInstantiationService } from '../../../../../test/browser/workbenchTestServices.js';
import { ILanguageModelToolsService } from '../../../../chat/common/languageModelToolsService.js';
import { RunInTerminalTool } from '../../browser/runInTerminalTool.js';
import { IWorkspaceContextService } from '../../../../../../platform/workspace/common/workspace.js';
import { ITerminalService } from '../../../../terminal/browser/terminal.js';
import { Emitter } from '../../../../../../base/common/event.js';
class TestRunInTerminalTool extends RunInTerminalTool {
    constructor() {
        super(...arguments);
        this._osBackend = Promise.resolve(1 /* OperatingSystem.Windows */);
    }
    get commandLineAutoApprover() { return this._commandLineAutoApprover; }
    async rewriteCommandIfNeeded(args, instance, shell) {
        return this._rewriteCommandIfNeeded(args, instance, shell);
    }
    setBackendOs(os) {
        this._osBackend = Promise.resolve(os);
    }
}
suite('RunInTerminalTool', () => {
    const store = ensureNoDisposablesAreLeakedInTestSuite();
    let instantiationService;
    let configurationService;
    let workspaceService;
    let runInTerminalTool;
    setup(() => {
        configurationService = new TestConfigurationService();
        instantiationService = workbenchInstantiationService({
            configurationService: () => configurationService,
        }, store);
        instantiationService.stub(ILanguageModelToolsService, {
            getTools() {
                return [];
            },
        });
        instantiationService.stub(ITerminalService, {
            onDidDisposeInstance: new Emitter().event
        });
        workspaceService = instantiationService.invokeFunction(accessor => accessor.get(IWorkspaceContextService));
        runInTerminalTool = store.add(instantiationService.createInstance(TestRunInTerminalTool));
    });
    function setAutoApprove(value) {
        setConfig("chat.agent.terminal.autoApprove" /* TerminalChatAgentToolsSettingId.AutoApprove */, value);
    }
    function setConfig(key, value) {
        configurationService.setUserConfiguration(key, value);
        configurationService.onDidChangeConfigurationEmitter.fire({
            affectsConfiguration: () => true,
            affectedKeys: new Set([key]),
            source: 2 /* ConfigurationTarget.USER */,
            change: null,
        });
    }
    function createInstanceWithCwd(uri) {
        return {
            getCwdResource: async () => uri
        };
    }
    /**
     * Executes a test scenario for the RunInTerminalTool
     */
    async function executeToolTest(params) {
        const context = {
            parameters: {
                command: 'echo hello',
                explanation: 'Print hello to the console',
                isBackground: false,
                ...params
            }
        };
        const result = await runInTerminalTool.prepareToolInvocation(context, CancellationToken.None);
        return result;
    }
    /**
     * Helper to assert that a command should be auto-approved (no confirmation required)
     */
    function assertAutoApproved(preparedInvocation) {
        ok(preparedInvocation, 'Expected prepared invocation to be defined');
        ok(!preparedInvocation.confirmationMessages, 'Expected no confirmation messages for auto-approved command');
    }
    /**
     * Helper to assert that a command requires confirmation
     */
    function assertConfirmationRequired(preparedInvocation, expectedTitle) {
        ok(preparedInvocation, 'Expected prepared invocation to be defined');
        ok(preparedInvocation.confirmationMessages, 'Expected confirmation messages for non-approved command');
        if (expectedTitle) {
            strictEqual(preparedInvocation.confirmationMessages.title, expectedTitle);
        }
    }
    suite('prepareToolInvocation - auto approval behavior', () => {
        test('should auto-approve commands in allow list', async () => {
            setAutoApprove({
                echo: true
            });
            const result = await executeToolTest({ command: 'echo hello world' });
            assertAutoApproved(result);
        });
        test('should require confirmation for commands not in allow list', async () => {
            setAutoApprove({
                ls: true
            });
            const result = await executeToolTest({
                command: 'rm file.txt',
                explanation: 'Remove a file'
            });
            assertConfirmationRequired(result, 'Run command in terminal');
        });
        test('should require confirmation for commands in deny list even if in allow list', async () => {
            setAutoApprove({
                rm: false,
                echo: true
            });
            const result = await executeToolTest({
                command: 'rm dangerous-file.txt',
                explanation: 'Remove a dangerous file'
            });
            assertConfirmationRequired(result, 'Run command in terminal');
        });
        test('should handle background commands with confirmation', async () => {
            setAutoApprove({
                ls: true
            });
            const result = await executeToolTest({
                command: 'npm run watch',
                explanation: 'Start watching for file changes',
                isBackground: true
            });
            assertConfirmationRequired(result, 'Run command in background terminal');
        });
        test('should auto-approve background commands in allow list', async () => {
            setAutoApprove({
                npm: true
            });
            const result = await executeToolTest({
                command: 'npm run watch',
                explanation: 'Start watching for file changes',
                isBackground: true
            });
            assertAutoApproved(result);
        });
        test('should handle regex patterns in allow list', async () => {
            setAutoApprove({
                '/^git (status|log)/': true
            });
            const result = await executeToolTest({ command: 'git status --porcelain' });
            assertAutoApproved(result);
        });
        test('should handle complex command chains with sub-commands', async () => {
            setAutoApprove({
                echo: true,
                ls: true
            });
            const result = await executeToolTest({ command: 'echo "hello" && ls -la' });
            assertAutoApproved(result);
        });
        test('should require confirmation when one sub-command is not approved', async () => {
            setAutoApprove({
                echo: true
            });
            const result = await executeToolTest({ command: 'echo "hello" && rm file.txt' });
            assertConfirmationRequired(result);
        });
        test('should handle empty command strings', async () => {
            setAutoApprove({
                echo: true
            });
            const result = await executeToolTest({
                command: '',
                explanation: 'Empty command'
            });
            assertConfirmationRequired(result);
        });
        test('should handle commands with only whitespace', async () => {
            setAutoApprove({
                echo: true
            });
            const result = await executeToolTest({
                command: '   \t\n   ',
                explanation: 'Whitespace only command'
            });
            assertConfirmationRequired(result);
        });
        test('should handle matchCommandLine: true patterns', async () => {
            setAutoApprove({
                "/dangerous/": { approve: false, matchCommandLine: true },
                "echo": { approve: true, matchCommandLine: true }
            });
            const result1 = await executeToolTest({ command: 'echo hello world' });
            assertAutoApproved(result1);
            const result2 = await executeToolTest({ command: 'echo this is a dangerous command' });
            assertConfirmationRequired(result2);
        });
        test('should only approve when neither sub-commands or command lines are denied', async () => {
            setAutoApprove({
                "foo": true,
                "/^foo$/": { approve: false, matchCommandLine: true },
            });
            const result1 = await executeToolTest({ command: 'foo' });
            assertConfirmationRequired(result1);
            const result2 = await executeToolTest({ command: 'foo bar' });
            assertAutoApproved(result2);
        });
    });
    suite('command re-writing', () => {
        function createRewriteParams(command, chatSessionId) {
            return {
                command,
                explanation: 'Test command',
                isBackground: false
            };
        }
        suite('cd <cwd> && <suffix> -> <suffix>', () => {
            suite('Posix', () => {
                setup(() => {
                    runInTerminalTool.setBackendOs(3 /* OperatingSystem.Linux */);
                });
                test('should return original command when no cd prefix pattern matches', async () => {
                    const parameters = createRewriteParams('echo hello world');
                    const result = await runInTerminalTool.rewriteCommandIfNeeded(parameters, undefined, 'pwsh');
                    strictEqual(result, 'echo hello world');
                });
                test('should return original command when cd pattern does not have suffix', async () => {
                    runInTerminalTool.setBackendOs(3 /* OperatingSystem.Linux */);
                    const parameters = createRewriteParams('cd /some/path');
                    const result = await runInTerminalTool.rewriteCommandIfNeeded(parameters, undefined, 'pwsh');
                    strictEqual(result, 'cd /some/path');
                });
                test('should rewrite command with ; separator when directory matches cwd', async () => {
                    const testDir = '/test/workspace';
                    const parameters = createRewriteParams(`cd ${testDir}; npm test`, 'session-1');
                    workspaceService.setWorkspace({
                        folders: [{ uri: { fsPath: testDir } }]
                    });
                    const result = await runInTerminalTool.rewriteCommandIfNeeded(parameters, undefined, 'pwsh');
                    strictEqual(result, 'npm test');
                });
                test('should rewrite command with && separator when directory matches cwd', async () => {
                    const testDir = '/test/workspace';
                    const parameters = createRewriteParams(`cd ${testDir} && npm install`, 'session-1');
                    workspaceService.setWorkspace({
                        folders: [{ uri: { fsPath: testDir } }]
                    });
                    const result = await runInTerminalTool.rewriteCommandIfNeeded(parameters, undefined, 'bash');
                    strictEqual(result, 'npm install');
                });
                test('should rewrite command when the path is wrapped in double quotes', async () => {
                    const testDir = '/test/workspace';
                    const parameters = createRewriteParams(`cd "${testDir}" && npm install`, 'session-1');
                    workspaceService.setWorkspace({
                        folders: [{ uri: { fsPath: testDir } }]
                    });
                    const result = await runInTerminalTool.rewriteCommandIfNeeded(parameters, undefined, 'bash');
                    strictEqual(result, 'npm install');
                });
                test('should not rewrite command when directory does not match cwd', async () => {
                    const testDir = '/test/workspace';
                    const differentDir = '/different/path';
                    const command = `cd ${differentDir} && npm install`;
                    const parameters = createRewriteParams(command, 'session-1');
                    workspaceService.setWorkspace({
                        folders: [{ uri: { fsPath: testDir } }]
                    });
                    const result = await runInTerminalTool.rewriteCommandIfNeeded(parameters, undefined, 'bash');
                    strictEqual(result, command);
                });
                test('should return original command when no workspace folders available', async () => {
                    const command = 'cd /some/path && npm install';
                    const parameters = createRewriteParams(command, 'session-1');
                    workspaceService.setWorkspace({
                        folders: []
                    });
                    const result = await runInTerminalTool.rewriteCommandIfNeeded(parameters, undefined, 'bash');
                    strictEqual(result, command);
                });
                test('should return original command when multiple workspace folders available', async () => {
                    const command = 'cd /some/path && npm install';
                    const parameters = createRewriteParams(command, 'session-1');
                    workspaceService.setWorkspace({
                        folders: [
                            { uri: { fsPath: '/workspace1' } },
                            { uri: { fsPath: '/workspace2' } }
                        ]
                    });
                    const result = await runInTerminalTool.rewriteCommandIfNeeded(parameters, undefined, 'bash');
                    strictEqual(result, command);
                });
                test('should handle commands with complex suffixes', async () => {
                    const testDir = '/test/workspace';
                    const command = `cd ${testDir} && npm install && npm test && echo "done"`;
                    const parameters = createRewriteParams(command, 'session-1');
                    workspaceService.setWorkspace({
                        folders: [{ uri: { fsPath: testDir } }]
                    });
                    const result = await runInTerminalTool.rewriteCommandIfNeeded(parameters, undefined, 'bash');
                    strictEqual(result, 'npm install && npm test && echo "done"');
                });
                test('should handle session without chatSessionId', async () => {
                    const command = 'cd /some/path && npm install';
                    const parameters = createRewriteParams(command);
                    workspaceService.setWorkspace({
                        folders: [{ uri: { fsPath: '/some/path' } }]
                    });
                    const result = await runInTerminalTool.rewriteCommandIfNeeded(parameters, undefined, 'bash');
                    strictEqual(result, 'npm install');
                });
                test('should ignore any trailing forward slash', async () => {
                    const testDir = '/test/workspace';
                    const parameters = createRewriteParams(`cd ${testDir}/ && npm install`, 'session-1');
                    workspaceService.setWorkspace({
                        folders: [{ uri: { fsPath: testDir } }]
                    });
                    const result = await runInTerminalTool.rewriteCommandIfNeeded(parameters, undefined, 'bash');
                    strictEqual(result, 'npm install');
                });
            });
            suite('Windows', () => {
                setup(() => {
                    runInTerminalTool.setBackendOs(1 /* OperatingSystem.Windows */);
                });
                test('should ignore any trailing back slash', async () => {
                    const testDir = 'c:\\test\\workspace';
                    const parameters = createRewriteParams(`cd ${testDir}\\ && npm install`, 'session-1');
                    workspaceService.setWorkspace({
                        folders: [{ uri: { fsPath: testDir } }]
                    });
                    const result = await runInTerminalTool.rewriteCommandIfNeeded(parameters, undefined, 'cmd');
                    strictEqual(result, 'npm install');
                });
                test('should prioritize instance cwd over workspace service', async () => {
                    const instanceDir = 'C:\\instance\\workspace';
                    const workspaceDir = 'C:\\workspace\\service';
                    const command = `cd ${instanceDir} && npm test`;
                    const parameters = createRewriteParams(command, 'session-1');
                    workspaceService.setWorkspace({
                        folders: [{ uri: { fsPath: workspaceDir } }]
                    });
                    const instance = createInstanceWithCwd({ fsPath: instanceDir });
                    const result = await runInTerminalTool.rewriteCommandIfNeeded(parameters, instance, 'cmd');
                    strictEqual(result, 'npm test');
                });
                test('should prioritize instance cwd over workspace service - PowerShell style', async () => {
                    const instanceDir = 'C:\\instance\\workspace';
                    const workspaceDir = 'C:\\workspace\\service';
                    const command = `cd ${instanceDir}; npm test`;
                    const parameters = createRewriteParams(command, 'session-1');
                    workspaceService.setWorkspace({
                        folders: [{ uri: { fsPath: workspaceDir } }]
                    });
                    const instance = createInstanceWithCwd({ fsPath: instanceDir });
                    const result = await runInTerminalTool.rewriteCommandIfNeeded(parameters, instance, 'pwsh');
                    strictEqual(result, 'npm test');
                });
                test('should not rewrite when instance cwd differs from cd path', async () => {
                    const instanceDir = 'C:\\instance\\workspace';
                    const cdDir = 'C:\\different\\path';
                    const workspaceDir = 'C:\\workspace\\service';
                    const command = `cd ${cdDir} && npm test`;
                    const parameters = createRewriteParams(command, 'session-1');
                    workspaceService.setWorkspace({
                        folders: [{ uri: { fsPath: workspaceDir } }]
                    });
                    const instance = createInstanceWithCwd({ fsPath: instanceDir });
                    const result = await runInTerminalTool.rewriteCommandIfNeeded(parameters, instance, 'cmd');
                    // Should not rewrite since instance cwd doesn't match cd path
                    strictEqual(result, command);
                });
                test('should fallback to workspace service when instance getCwdResource returns undefined', async () => {
                    const workspaceDir = 'C:\\workspace\\service';
                    const command = `cd ${workspaceDir} && npm test`;
                    const parameters = createRewriteParams(command, 'session-1');
                    workspaceService.setWorkspace({
                        folders: [{ uri: { fsPath: workspaceDir } }]
                    });
                    const instance = createInstanceWithCwd(undefined);
                    const result = await runInTerminalTool.rewriteCommandIfNeeded(parameters, instance, 'cmd');
                    strictEqual(result, 'npm test');
                });
                test('should prioritize instance cwd over workspace service even when both match cd path', async () => {
                    const sharedDir = 'C:\\shared\\workspace';
                    const command = `cd ${sharedDir} && npm build`;
                    const parameters = createRewriteParams(command, 'session-1');
                    workspaceService.setWorkspace({
                        folders: [{ uri: { fsPath: sharedDir } }]
                    });
                    const instance = createInstanceWithCwd({ fsPath: sharedDir });
                    const result = await runInTerminalTool.rewriteCommandIfNeeded(parameters, instance, 'cmd');
                    strictEqual(result, 'npm build');
                });
                test('should handle case-insensitive comparison on Windows with instance', async () => {
                    const instanceDir = 'C:\\Instance\\Workspace';
                    const cdDir = 'c:\\instance\\workspace'; // Different case
                    const command = `cd ${cdDir} && npm test`;
                    const parameters = createRewriteParams(command, 'session-1');
                    const instance = createInstanceWithCwd({ fsPath: instanceDir });
                    const result = await runInTerminalTool.rewriteCommandIfNeeded(parameters, instance, 'cmd');
                    strictEqual(result, 'npm test');
                });
                test('should handle quoted paths with instance priority', async () => {
                    const instanceDir = 'C:\\instance\\workspace';
                    const command = 'cd "C:\\instance\\workspace" && npm test';
                    const parameters = createRewriteParams(command, 'session-1');
                    workspaceService.setWorkspace({
                        folders: [{ uri: { fsPath: 'C:\\different\\workspace' } }]
                    });
                    const instance = createInstanceWithCwd({ fsPath: instanceDir });
                    const result = await runInTerminalTool.rewriteCommandIfNeeded(parameters, instance, 'cmd');
                    strictEqual(result, 'npm test');
                });
                test('should handle cd /d flag when directory matches cwd', async () => {
                    const testDir = 'C:\\test\\workspace';
                    const options = createRewriteParams(`cd /d ${testDir} && echo hello`, 'session-1');
                    workspaceService.setWorkspace({
                        folders: [{ uri: { fsPath: testDir } }]
                    });
                    const result = await runInTerminalTool.rewriteCommandIfNeeded(options, undefined, 'pwsh');
                    strictEqual(result, 'echo hello');
                });
                test('should handle cd /d flag with quoted paths when directory matches cwd', async () => {
                    const testDir = 'C:\\test\\workspace';
                    const options = createRewriteParams(`cd /d "${testDir}" && echo hello`, 'session-1');
                    workspaceService.setWorkspace({
                        folders: [{ uri: { fsPath: testDir } }]
                    });
                    const result = await runInTerminalTool.rewriteCommandIfNeeded(options, undefined, 'pwsh');
                    strictEqual(result, 'echo hello');
                });
                test('should handle cd /d flag with quoted paths from issue example', async () => {
                    const testDir = 'd:\\microsoft\\vscode';
                    const options = createRewriteParams(`cd /d "${testDir}" && .\\scripts\\test.bat`, 'session-1');
                    workspaceService.setWorkspace({
                        folders: [{ uri: { fsPath: testDir } }]
                    });
                    const result = await runInTerminalTool.rewriteCommandIfNeeded(options, undefined, 'pwsh');
                    strictEqual(result, '.\\scripts\\test.bat');
                });
                test('should not rewrite cd /d when directory does not match cwd', async () => {
                    const testDir = 'C:\\test\\workspace';
                    const differentDir = 'C:\\different\\path';
                    const command = `cd /d ${differentDir} && echo hello`;
                    const options = createRewriteParams(command, 'session-1');
                    workspaceService.setWorkspace({
                        folders: [{ uri: { fsPath: testDir } }]
                    });
                    const result = await runInTerminalTool.rewriteCommandIfNeeded(options, undefined, 'pwsh');
                    strictEqual(result, command);
                });
                test('should handle cd /d flag with instance priority', async () => {
                    const instanceDir = 'C:\\instance\\workspace';
                    const workspaceDir = 'C:\\workspace\\service';
                    const command = `cd /d ${instanceDir} && npm test`;
                    const parameters = createRewriteParams(command, 'session-1');
                    workspaceService.setWorkspace({
                        folders: [{ uri: { fsPath: workspaceDir } }]
                    });
                    const instance = createInstanceWithCwd({ fsPath: instanceDir });
                    const result = await runInTerminalTool.rewriteCommandIfNeeded(parameters, instance, 'pwsh');
                    strictEqual(result, 'npm test');
                });
                test('should handle cd /d flag with semicolon separator', async () => {
                    const testDir = 'C:\\test\\workspace';
                    const options = createRewriteParams(`cd /d ${testDir}; echo hello`, 'session-1');
                    workspaceService.setWorkspace({
                        folders: [{ uri: { fsPath: testDir } }]
                    });
                    const result = await runInTerminalTool.rewriteCommandIfNeeded(options, undefined, 'pwsh');
                    strictEqual(result, 'echo hello');
                });
            });
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVuSW5UZXJtaW5hbFRvb2wudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL2FkdmlrYXIvRG9jdW1lbnRzL2FyY2hpdGVjdC9hcmNoMi9BcmNoSURFL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlcm1pbmFsQ29udHJpYi9jaGF0QWdlbnRUb29scy90ZXN0L2Jyb3dzZXIvcnVuSW5UZXJtaW5hbFRvb2wudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsRUFBRSxFQUFFLFdBQVcsRUFBRSxNQUFNLFFBQVEsQ0FBQztBQUN6QyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQztBQUNsRixPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUd0RyxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxrRkFBa0YsQ0FBQztBQUM1SCxPQUFPLEVBQUUsNkJBQTZCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUNyRyxPQUFPLEVBQThELDBCQUEwQixFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFFOUosT0FBTyxFQUFFLGlCQUFpQixFQUFrQyxNQUFNLG9DQUFvQyxDQUFDO0FBRXZHLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLDBEQUEwRCxDQUFDO0FBR3BHLE9BQU8sRUFBRSxnQkFBZ0IsRUFBMEIsTUFBTSwwQ0FBMEMsQ0FBQztBQUVwRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFFakUsTUFBTSxxQkFBc0IsU0FBUSxpQkFBaUI7SUFBckQ7O1FBQ29CLGVBQVUsR0FBNkIsT0FBTyxDQUFDLE9BQU8saUNBQXlCLENBQUM7SUFXcEcsQ0FBQztJQVRBLElBQUksdUJBQXVCLEtBQThCLE9BQU8sSUFBSSxDQUFDLHdCQUF3QixDQUFDLENBQUMsQ0FBQztJQUVoRyxLQUFLLENBQUMsc0JBQXNCLENB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