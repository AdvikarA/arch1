/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../../base/test/common/utils.js';
import { TestConfigurationService } from '../../../../../../platform/configuration/test/common/testConfigurationService.js';
import { workbenchInstantiationService } from '../../../../../test/browser/workbenchTestServices.js';
import { CommandLineAutoApprover } from '../../browser/commandLineAutoApprover.js';
import { ok, strictEqual } from 'assert';
suite('CommandLineAutoApprover', () => {
    const store = ensureNoDisposablesAreLeakedInTestSuite();
    let instantiationService;
    let configurationService;
    let commandLineAutoApprover;
    let shell;
    let os;
    setup(() => {
        configurationService = new TestConfigurationService();
        instantiationService = workbenchInstantiationService({
            configurationService: () => configurationService
        }, store);
        shell = 'bash';
        os = 3 /* OperatingSystem.Linux */;
        commandLineAutoApprover = store.add(instantiationService.createInstance(CommandLineAutoApprover));
    });
    function setAutoApprove(value) {
        setConfig("chat.agent.terminal.autoApprove" /* TerminalChatAgentToolsSettingId.AutoApprove */, value);
    }
    function setAutoApproveWithCommandLine(value) {
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
    function isAutoApproved(commandLine) {
        return commandLineAutoApprover.isCommandAutoApproved(commandLine, shell, os).result === 'approved';
    }
    function isCommandLineAutoApproved(commandLine) {
        return commandLineAutoApprover.isCommandLineAutoApproved(commandLine).result === 'approved';
    }
    suite('autoApprove with allow patterns only', () => {
        test('should auto-approve exact command match', () => {
            setAutoApprove({
                "echo": true
            });
            ok(isAutoApproved('echo'));
        });
        test('should auto-approve command with arguments', () => {
            setAutoApprove({
                "echo": true
            });
            ok(isAutoApproved('echo hello world'));
        });
        test('should not auto-approve when there is no match', () => {
            setAutoApprove({
                "echo": true
            });
            ok(!isAutoApproved('ls'));
        });
        test('should not auto-approve partial command matches', () => {
            setAutoApprove({
                "echo": true
            });
            ok(!isAutoApproved('echotest'));
        });
        test('should handle multiple commands in autoApprove', () => {
            setAutoApprove({
                "echo": true,
                "ls": true,
                "pwd": true
            });
            ok(isAutoApproved('echo'));
            ok(isAutoApproved('ls -la'));
            ok(isAutoApproved('pwd'));
            ok(!isAutoApproved('rm'));
        });
    });
    suite('autoApprove with deny patterns only', () => {
        test('should deny commands in autoApprove', () => {
            setAutoApprove({
                "rm": false,
                "del": false
            });
            ok(!isAutoApproved('rm file.txt'));
            ok(!isAutoApproved('del file.txt'));
        });
        test('should not auto-approve safe commands when no allow patterns are present', () => {
            setAutoApprove({
                "rm": false
            });
            ok(!isAutoApproved('echo hello'));
            ok(!isAutoApproved('ls'));
        });
    });
    suite('autoApprove with mixed allow and deny patterns', () => {
        test('should deny commands set to false even if other commands are set to true', () => {
            setAutoApprove({
                "echo": true,
                "rm": false
            });
            ok(isAutoApproved('echo hello'));
            ok(!isAutoApproved('rm file.txt'));
        });
        test('should auto-approve allow patterns not set to false', () => {
            setAutoApprove({
                "echo": true,
                "ls": true,
                "pwd": true,
                "rm": false,
                "del": false
            });
            ok(isAutoApproved('echo'));
            ok(isAutoApproved('ls'));
            ok(isAutoApproved('pwd'));
            ok(!isAutoApproved('rm'));
            ok(!isAutoApproved('del'));
        });
    });
    suite('regex patterns', () => {
        test('should handle regex patterns in autoApprove', () => {
            setAutoApprove({
                "/^echo/": true,
                "/^ls/": true,
                "pwd": true
            });
            ok(isAutoApproved('echo hello'));
            ok(isAutoApproved('ls -la'));
            ok(isAutoApproved('pwd'));
            ok(!isAutoApproved('rm file'));
        });
        test('should handle regex patterns for deny', () => {
            setAutoApprove({
                "echo": true,
                "rm": true,
                "/^rm\\s+/": false,
                "/^del\\s+/": false
            });
            ok(isAutoApproved('echo hello'));
            ok(isAutoApproved('rm'));
            ok(!isAutoApproved('rm file.txt'));
            ok(!isAutoApproved('del file.txt'));
        });
        test('should handle complex regex patterns', () => {
            setAutoApprove({
                "/^(echo|ls|pwd)\\b/": true,
                "/^git (status|show\\b.*)$/": true,
                "/rm|del|kill/": false
            });
            ok(isAutoApproved('echo test'));
            ok(isAutoApproved('ls -la'));
            ok(isAutoApproved('pwd'));
            ok(isAutoApproved('git status'));
            ok(isAutoApproved('git show'));
            ok(isAutoApproved('git show HEAD'));
            ok(!isAutoApproved('rm file'));
            ok(!isAutoApproved('del file'));
            ok(!isAutoApproved('kill process'));
        });
        suite('flags', () => {
            test('should handle case-insensitive regex patterns with i flag', () => {
                setAutoApprove({
                    "/^echo/i": true,
                    "/^ls/i": true,
                    "/rm|del/i": false
                });
                ok(isAutoApproved('echo hello'));
                ok(isAutoApproved('ECHO hello'));
                ok(isAutoApproved('Echo hello'));
                ok(isAutoApproved('ls -la'));
                ok(isAutoApproved('LS -la'));
                ok(isAutoApproved('Ls -la'));
                ok(!isAutoApproved('rm file'));
                ok(!isAutoApproved('RM file'));
                ok(!isAutoApproved('del file'));
                ok(!isAutoApproved('DEL file'));
            });
            test('should handle multiple regex flags', () => {
                setAutoApprove({
                    "/^git\\s+/gim": true,
                    "/dangerous/gim": false
                });
                ok(isAutoApproved('git status'));
                ok(isAutoApproved('GIT status'));
                ok(isAutoApproved('Git status'));
                ok(!isAutoApproved('dangerous command'));
                ok(!isAutoApproved('DANGEROUS command'));
            });
            test('should handle various regex flags', () => {
                setAutoApprove({
                    "/^echo.*/s": true, // dotall flag
                    "/^git\\s+/i": true, // case-insensitive flag
                    "/rm|del/g": false // global flag
                });
                ok(isAutoApproved('echo hello\nworld'));
                ok(isAutoApproved('git status'));
                ok(isAutoApproved('GIT status'));
                ok(!isAutoApproved('rm file'));
                ok(!isAutoApproved('del file'));
            });
            test('should handle regex patterns without flags', () => {
                setAutoApprove({
                    "/^echo/": true,
                    "/rm|del/": false
                });
                ok(isAutoApproved('echo hello'));
                ok(!isAutoApproved('ECHO hello'), 'Should be case-sensitive without i flag');
                ok(!isAutoApproved('rm file'));
                ok(!isAutoApproved('RM file'), 'Should be case-sensitive without i flag');
            });
        });
    });
    suite('edge cases', () => {
        test('should handle empty autoApprove', () => {
            setAutoApprove({});
            ok(!isAutoApproved('echo hello'));
            ok(!isAutoApproved('ls'));
            ok(!isAutoApproved('rm file'));
        });
        test('should handle empty command strings', () => {
            setAutoApprove({
                "echo": true
            });
            ok(!isAutoApproved(''));
            ok(!isAutoApproved('   '));
        });
        test('should handle whitespace in commands', () => {
            setAutoApprove({
                "echo": true
            });
            ok(isAutoApproved('echo   hello   world'));
            ok(!isAutoApproved('  echo hello'));
        });
        test('should be case-sensitive by default', () => {
            setAutoApprove({
                "echo": true
            });
            ok(isAutoApproved('echo hello'));
            ok(!isAutoApproved('ECHO hello'));
            ok(!isAutoApproved('Echo hello'));
        });
        // https://github.com/microsoft/vscode/issues/252411
        test('should handle string-based values with special regex characters', () => {
            setAutoApprove({
                "pwsh.exe -File D:\\foo.bar\\a-script.ps1": true
            });
            ok(isAutoApproved('pwsh.exe -File D:\\foo.bar\\a-script.ps1'));
            ok(isAutoApproved('pwsh.exe -File D:\\foo.bar\\a-script.ps1 -AnotherArg'));
        });
    });
    suite('PowerShell-specific commands', () => {
        setup(() => {
            shell = 'pwsh';
        });
        test('should handle Windows PowerShell commands', () => {
            setAutoApprove({
                "Get-ChildItem": true,
                "Get-Content": true,
                "Get-Location": true,
                "Remove-Item": false,
                "del": false
            });
            ok(isAutoApproved('Get-ChildItem'));
            ok(isAutoApproved('Get-Content file.txt'));
            ok(isAutoApproved('Get-Location'));
            ok(!isAutoApproved('Remove-Item file.txt'));
        });
        test('should handle ( prefixes', () => {
            setAutoApprove({
                "Get-Content": true
            });
            ok(isAutoApproved('Get-Content file.txt'));
            ok(isAutoApproved('(Get-Content file.txt'));
            ok(!isAutoApproved('[Get-Content'));
            ok(!isAutoApproved('foo'));
        });
    });
    suite('isCommandLineAutoApproved - matchCommandLine functionality', () => {
        test('should auto-approve command line patterns with matchCommandLine: true', () => {
            setAutoApproveWithCommandLine({
                "echo": { approve: true, matchCommandLine: true }
            });
            ok(isCommandLineAutoApproved('echo hello'));
            ok(isCommandLineAutoApproved('echo test && ls'));
        });
        test('should not auto-approve regular patterns with isCommandLineAutoApproved', () => {
            setAutoApprove({
                "echo": true
            });
            // Regular patterns should not be matched by isCommandLineAutoApproved
            ok(!isCommandLineAutoApproved('echo hello'));
        });
        test('should handle regex patterns with matchCommandLine: true', () => {
            setAutoApproveWithCommandLine({
                "/echo.*world/": { approve: true, matchCommandLine: true }
            });
            ok(isCommandLineAutoApproved('echo hello world'));
            ok(!isCommandLineAutoApproved('echo hello'));
        });
        test('should handle case-insensitive regex with matchCommandLine: true', () => {
            setAutoApproveWithCommandLine({
                "/echo/i": { approve: true, matchCommandLine: true }
            });
            ok(isCommandLineAutoApproved('echo hello'));
            ok(isCommandLineAutoApproved('ECHO hello'));
            ok(isCommandLineAutoApproved('Echo hello'));
        });
        test('should handle complex command line patterns', () => {
            setAutoApproveWithCommandLine({
                "/^npm run build/": { approve: true, matchCommandLine: true },
                "/\.ps1/i": { approve: true, matchCommandLine: true }
            });
            ok(isCommandLineAutoApproved('npm run build --production'));
            ok(isCommandLineAutoApproved('powershell -File script.ps1'));
            ok(isCommandLineAutoApproved('pwsh -File SCRIPT.PS1'));
            ok(!isCommandLineAutoApproved('npm install'));
        });
        test('should return false for empty command line', () => {
            setAutoApproveWithCommandLine({
                "echo": { approve: true, matchCommandLine: true }
            });
            ok(!isCommandLineAutoApproved(''));
            ok(!isCommandLineAutoApproved('   '));
        });
        test('should handle mixed configuration with matchCommandLine entries', () => {
            setAutoApproveWithCommandLine({
                "echo": true, // Regular pattern
                "ls": { approve: true, matchCommandLine: true }, // Command line pattern
                "rm": { approve: true, matchCommandLine: false } // Explicit regular pattern
            });
            // Only the matchCommandLine: true entry should work with isCommandLineAutoApproved
            ok(isCommandLineAutoApproved('ls -la'));
            ok(!isCommandLineAutoApproved('echo hello'));
            ok(!isCommandLineAutoApproved('rm file.txt'));
        });
        test('should handle deny patterns with matchCommandLine: true', () => {
            setAutoApproveWithCommandLine({
                "echo": { approve: true, matchCommandLine: true },
                "/dangerous/": { approve: false, matchCommandLine: true }
            });
            ok(isCommandLineAutoApproved('echo hello'));
            ok(!isCommandLineAutoApproved('echo dangerous command'));
            ok(!isCommandLineAutoApproved('dangerous operation'));
        });
        test('should prioritize deny list over allow list for command line patterns', () => {
            setAutoApproveWithCommandLine({
                "/echo/": { approve: true, matchCommandLine: true },
                "/echo.*dangerous/": { approve: false, matchCommandLine: true }
            });
            ok(isCommandLineAutoApproved('echo hello'));
            ok(!isCommandLineAutoApproved('echo dangerous command'));
        });
        test('should handle complex deny patterns with matchCommandLine', () => {
            setAutoApproveWithCommandLine({
                "npm": { approve: true, matchCommandLine: true },
                "/npm.*--force/": { approve: false, matchCommandLine: true },
                "/\.ps1.*-ExecutionPolicy/i": { approve: false, matchCommandLine: true }
            });
            ok(isCommandLineAutoApproved('npm install'));
            ok(isCommandLineAutoApproved('npm run build'));
            ok(!isCommandLineAutoApproved('npm install --force'));
            ok(!isCommandLineAutoApproved('powershell -File script.ps1 -ExecutionPolicy Bypass'));
        });
    });
    suite('reasons', () => {
        function getCommandReason(command) {
            return commandLineAutoApprover.isCommandAutoApproved(command, shell, os).reason;
        }
        function getCommandLineReason(commandLine) {
            return commandLineAutoApprover.isCommandLineAutoApproved(commandLine).reason;
        }
        suite('command', () => {
            test('approved', () => {
                setAutoApprove({ echo: true });
                strictEqual(getCommandReason('echo hello'), `Command 'echo hello' is approved by allow list rule: echo`);
            });
            test('not approved', () => {
                setAutoApprove({ echo: false });
                strictEqual(getCommandReason('echo hello'), `Command 'echo hello' is denied by deny list rule: echo`);
            });
            test('no match', () => {
                setAutoApprove({});
                strictEqual(getCommandReason('echo hello'), `Command 'echo hello' has no matching auto approve entries`);
            });
        });
        suite('command line', () => {
            test('approved', () => {
                setAutoApproveWithCommandLine({ echo: { approve: true, matchCommandLine: true } });
                strictEqual(getCommandLineReason('echo hello'), `Command line 'echo hello' is approved by allow list rule: echo`);
            });
            test('not approved', () => {
                setAutoApproveWithCommandLine({ echo: { approve: false, matchCommandLine: true } });
                strictEqual(getCommandLineReason('echo hello'), `Command line 'echo hello' is denied by deny list rule: echo`);
            });
            test('no match', () => {
                setAutoApproveWithCommandLine({});
                strictEqual(getCommandLineReason('echo hello'), `Command line 'echo hello' has no matching auto approve entries`);
            });
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbWFuZExpbmVBdXRvQXBwcm92ZXIudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL2FkdmlrYXIvRG9jdW1lbnRzL2FyY2hpdGVjdC9hcmNoMi9BcmNoSURFL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlcm1pbmFsQ29udHJpYi9jaGF0QWdlbnRUb29scy90ZXN0L2Jyb3dzZXIvY29tbWFuZExpbmVBdXRvQXBwcm92ZXIudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUN0RyxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxrRkFBa0YsQ0FBQztBQUU1SCxPQUFPLEVBQUUsNkJBQTZCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUVyRyxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUVuRixPQUFPLEVBQUUsRUFBRSxFQUFFLFdBQVcsRUFBRSxNQUFNLFFBQVEsQ0FBQztBQUV6QyxLQUFLLENBQUMseUJBQXlCLEVBQUUsR0FBRyxFQUFFO0lBQ3JDLE1BQU0sS0FBSyxHQUFHLHVDQUF1QyxFQUFFLENBQUM7SUFFeEQsSUFBSSxvQkFBMkMsQ0FBQztJQUNoRCxJQUFJLG9CQUE4QyxDQUFDO0lBRW5ELElBQUksdUJBQWdELENBQUM7SUFDckQsSUFBSSxLQUFhLENBQUM7SUFDbEIsSUFBSSxFQUFtQixDQUFDO0lBRXhCLEtBQUssQ0FBQyxHQUFHLEVBQUU7UUFDVixvQkFBb0IsR0FBRyxJQUFJLHdCQUF3QixFQUFFLENBQUM7UUFDdEQsb0JBQW9CLEdBQUcsNkJBQTZCLENBQUM7WUFDcEQsb0JBQW9CLEVBQUUsR0FBRyxFQUFFLENBQUMsb0JBQW9CO1NBQ2hELEVBQUUsS0FBSyxDQUFDLENBQUM7UUFFVixLQUFLLEdBQUcsTUFBTSxDQUFDO1FBQ2YsRUFBRSxnQ0FBd0IsQ0FBQztRQUMzQix1QkFBdUIsR0FBRyxLQUFLLENBQUMsR0FBRyxDQUFDLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDLENBQUM7SUFDbkcsQ0FBQyxDQUFDLENBQUM7SUFFSCxTQUFTLGNBQWMsQ0FBQyxLQUFpQztRQUN4RCxTQUFTLHNGQUE4QyxLQUFLLENBQUMsQ0FBQztJQUMvRCxDQUFDO0lBRUQsU0FBUyw2QkFBNkIsQ0FBQyxLQUFvRjtRQUMxSCxTQUFTLHNGQUE4QyxLQUFLLENBQUMsQ0FBQztJQUMvRCxDQUFDO0lBRUQsU0FBUyxTQUFTLENBQUMsR0FBVyxFQUFFLEtBQWM7UUFDN0Msb0JBQW9CLENBQUMsb0JBQW9CLENBQUMsR0FBRyxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQ3RELG9CQUFvQixDQUFDLCtCQUErQixDQUFDLElBQUksQ0FBQztZQUN6RCxvQkFBb0IsRUFBRSxHQUFHLEVBQUUsQ0FBQyxJQUFJO1lBQ2hDLFlBQVksRUFBRSxJQUFJLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQzVCLE1BQU0sa0NBQTBCO1lBQ2hDLE1BQU0sRUFBRSxJQUFLO1NBQ2IsQ0FBQyxDQUFDO0lBQ0osQ0FBQztJQUVELFNBQVMsY0FBYyxDQUFDLFdBQW1CO1FBQzFDLE9BQU8sdUJBQXVCLENBQUMscUJBQXFCLENBQUMsV0FBVyxFQUFFLEtBQUssRUFBRSxFQUFFLENBQUMsQ0FBQyxNQUFNLEtBQUssVUFBVSxDQUFDO0lBQ3BHLENBQUM7SUFFRCxTQUFTLHlCQUF5QixDQUFDLFdBQW1CO1FBQ3JELE9BQU8sdUJBQXVCLENBQUMseUJBQXlCLENBQUMsV0FBVyxDQUFDLENBQUMsTUFBTSxLQUFLLFVBQVUsQ0FBQztJQUM3RixDQUFDO0lBRUQsS0FBSyxDQUFDLHNDQUFzQyxFQUFFLEdBQUcsRUFBRTtRQUNsRCxJQUFJLENBQUMseUNBQXlDLEVBQUUsR0FBRyxFQUFFO1lBQ3BELGNBQWMsQ0FBQztnQkFDZCxNQUFNLEVBQUUsSUFBSTthQUNaLENBQUMsQ0FBQztZQUNILEVBQUUsQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztRQUM1QixDQUFDLENBQUMsQ0FBQztRQUVILElBQUksQ0FBQyw0Q0FBNEMsRUFBRSxHQUFHLEVBQUU7WUFDdkQsY0FBYyxDQUFDO2dCQUNkLE1BQU0sRUFBRSxJQUFJO2FBQ1osQ0FBQyxDQUFDO1lBQ0gsRUFBRSxDQUFDLGNBQWMsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLENBQUM7UUFDeEMsQ0FBQyxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsZ0RBQWdELEVBQUUsR0FBRyxFQUFFO1lBQzNELGNBQWMsQ0FBQztnQkFDZCxNQUFNLEVBQUUsSUFBSTthQUNaLENBQUMsQ0FBQztZQUNILEVBQUUsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO1FBQzNCLENBQUMsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLGlEQUFpRCxFQUFFLEdBQUcsRUFBRTtZQUM1RCxjQUFjLENBQUM7Z0JBQ2QsTUFBTSxFQUFFLElBQUk7YUFDWixDQUFDLENBQUM7WUFDSCxFQUFFLENBQUMsQ0FBQyxjQUFjLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQztRQUNqQyxDQUFDLENBQUMsQ0FBQztRQUVILElBQUksQ0FBQyxnREFBZ0QsRUFBRSxHQUFHLEVBQUU7WUFDM0QsY0FBYyxDQUFDO2dCQUNkLE1BQU0sRUFBRSxJQUFJO2dCQUNaLElBQUksRUFBRSxJQUFJO2dCQUNWLEtBQUssRUFBRSxJQUFJO2FBQ1gsQ0FBQyxDQUFDO1lBQ0gsRUFBRSxDQUFDLGNBQWMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO1lBQzNCLEVBQUUsQ0FBQyxjQUFjLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQztZQUM3QixFQUFFLENBQUMsY0FBYyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7WUFDMUIsRUFBRSxDQUFDLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7UUFDM0IsQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDLENBQUMsQ0FBQztJQUVILEtBQUssQ0FBQyxxQ0FBcUMsRUFBRSxHQUFHLEVBQUU7UUFDakQsSUFBSSxDQUFDLHFDQUFxQyxFQUFFLEdBQUcsRUFBRTtZQUNoRCxjQUFjLENBQUM7Z0JBQ2QsSUFBSSxFQUFFLEtBQUs7Z0JBQ1gsS0FBSyxFQUFFLEtBQUs7YUFDWixDQUFDLENBQUM7WUFDSCxFQUFFLENBQUMsQ0FBQyxjQUFjLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQztZQUNuQyxFQUFFLENBQUMsQ0FBQyxjQUFjLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQztRQUNyQyxDQUFDLENBQUMsQ0FBQztRQUVILElBQUksQ0FBQywwRUFBMEUsRUFBRSxHQUFHLEVBQUU7WUFDckYsY0FBYyxDQUFDO2dCQUNkLElBQUksRUFBRSxLQUFLO2FBQ1gsQ0FBQyxDQUFDO1lBQ0gsRUFBRSxDQUFDLENBQUMsY0FBYyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUM7WUFDbEMsRUFBRSxDQUFDLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7UUFDM0IsQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDLENBQUMsQ0FBQztJQUVILEtBQUssQ0FBQyxnREFBZ0QsRUFBRSxHQUFHLEVBQUU7UUFDNUQsSUFBSSxDQUFDLDBFQUEwRSxFQUFFLEdBQUcsRUFBRTtZQUNyRixjQUFjLENBQUM7Z0JBQ2QsTUFBTSxFQUFFLElBQUk7Z0JBQ1osSUFBSSxFQUFFLEtBQUs7YUFDWCxDQUFDLENBQUM7WUFDSCxFQUFFLENBQUMsY0FBYyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUM7WUFDakMsRUFBRSxDQUFDLENBQUMsY0FBYyxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUM7UUFDcEMsQ0FBQyxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMscURBQXFELEVBQUUsR0FBRyxFQUFFO1lBQ2hFLGNBQWMsQ0FBQztnQkFDZCxNQUFNLEVBQUUsSUFBSTtnQkFDWixJQUFJLEVBQUUsSUFBSTtnQkFDVixLQUFLLEVBQUUsSUFBSTtnQkFDWCxJQUFJLEVBQUUsS0FBSztnQkFDWCxLQUFLLEVBQUUsS0FBSzthQUNaLENBQUMsQ0FBQztZQUNILEVBQUUsQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztZQUMzQixFQUFFLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7WUFDekIsRUFBRSxDQUFDLGNBQWMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO1lBQzFCLEVBQUUsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO1lBQzFCLEVBQUUsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO1FBQzVCLENBQUMsQ0FBQyxDQUFDO0lBQ0osQ0FBQyxDQUFDLENBQUM7SUFFSCxLQUFLLENBQUMsZ0JBQWdCLEVBQUUsR0FBRyxFQUFFO1FBQzVCLElBQUksQ0FBQyw2Q0FBNkMsRUFBRSxHQUFHLEVBQUU7WUFDeEQsY0FBYyxDQUFDO2dCQUNkLFNBQVMsRUFBRSxJQUFJO2dCQUNmLE9BQU8sRUFBRSxJQUFJO2dCQUNiLEtBQUssRUFBRSxJQUFJO2FBQ1gsQ0FBQyxDQUFDO1lBRUgsRUFBRSxDQUFDLGNBQWMsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDO1lBQ2pDLEVBQUUsQ0FBQyxjQUFjLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQztZQUM3QixFQUFFLENBQUMsY0FBYyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7WUFDMUIsRUFBRSxDQUFDLENBQUMsY0FBYyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUM7UUFDaEMsQ0FBQyxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsdUNBQXVDLEVBQUUsR0FBRyxFQUFFO1lBQ2xELGNBQWMsQ0FBQztnQkFDZCxNQUFNLEVBQUUsSUFBSTtnQkFDWixJQUFJLEVBQUUsSUFBSTtnQkFDVixXQUFXLEVBQUUsS0FBSztnQkFDbEIsWUFBWSxFQUFFLEtBQUs7YUFDbkIsQ0FBQyxDQUFDO1lBRUgsRUFBRSxDQUFDLGNBQWMsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDO1lBQ2pDLEVBQUUsQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztZQUN6QixFQUFFLENBQUMsQ0FBQyxjQUFjLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQztZQUNuQyxFQUFFLENBQUMsQ0FBQyxjQUFjLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQztRQUNyQyxDQUFDLENBQUMsQ0FBQztRQUVILElBQUksQ0FBQyxzQ0FBc0MsRUFBRSxHQUFHLEVBQUU7WUFDakQsY0FBYyxDQUFDO2dCQUNkLHFCQUFxQixFQUFFLElBQUk7Z0JBQzNCLDRCQUE0QixFQUFFLElBQUk7Z0JBQ2xDLGVBQWUsRUFBRSxLQUFLO2FBQ3RCLENBQUMsQ0FBQztZQUVILEVBQUUsQ0FBQyxjQUFjLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQztZQUNoQyxFQUFFLENBQUMsY0FBYyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUM7WUFDN0IsRUFBRSxDQUFDLGNBQWMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO1lBQzFCLEVBQUUsQ0FBQyxjQUFjLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQztZQUNqQyxFQUFFLENBQUMsY0FBYyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUM7WUFDL0IsRUFBRSxDQUFDLGNBQWMsQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDO1lBQ3BDLEVBQUUsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDO1lBQy9CLEVBQUUsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDO1lBQ2hDLEVBQUUsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDO1FBQ3JDLENBQUMsQ0FBQyxDQUFDO1FBRUgsS0FBSyxDQUFDLE9BQU8sRUFBRSxHQUFHLEVBQUU7WUFDbkIsSUFBSSxDQUFDLDJEQUEyRCxFQUFFLEdBQUcsRUFBRTtnQkFDdEUsY0FBYyxDQUFDO29CQUNkLFVBQVUsRUFBRSxJQUFJO29CQUNoQixRQUFRLEVBQUUsSUFBSTtvQkFDZCxXQUFXLEVBQUUsS0FBSztpQkFDbEIsQ0FBQyxDQUFDO2dCQUVILEVBQUUsQ0FBQyxjQUFjLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQztnQkFDakMsRUFBRSxDQUFDLGNBQWMsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDO2dCQUNqQyxFQUFFLENBQUMsY0FBYyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUM7Z0JBQ2pDLEVBQUUsQ0FBQyxjQUFjLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQztnQkFDN0IsRUFBRSxDQUFDLGNBQWMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDO2dCQUM3QixFQUFFLENBQUMsY0FBYyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUM7Z0JBQzdCLEVBQUUsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDO2dCQUMvQixFQUFFLENBQUMsQ0FBQyxjQUFjLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQztnQkFDL0IsRUFBRSxDQUFDLENBQUMsY0FBYyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUM7Z0JBQ2hDLEVBQUUsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDO1lBQ2pDLENBQUMsQ0FBQyxDQUFDO1lBRUgsSUFBSSxDQUFDLG9DQUFvQyxFQUFFLEdBQUcsRUFBRTtnQkFDL0MsY0FBYyxDQUFDO29CQUNkLGVBQWUsRUFBRSxJQUFJO29CQUNyQixnQkFBZ0IsRUFBRSxLQUFLO2lCQUN2QixDQUFDLENBQUM7Z0JBRUgsRUFBRSxDQUFDLGNBQWMsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDO2dCQUNqQyxFQUFFLENBQUMsY0FBYyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUM7Z0JBQ2pDLEVBQUUsQ0FBQyxjQUFjLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQztnQkFDakMsRUFBRSxDQUFDLENBQUMsY0FBYyxDQUFDLG1CQUFtQixDQUFDLENBQUMsQ0FBQztnQkFDekMsRUFBRSxDQUFDLENBQUMsY0FBYyxDQUFDLG1CQUFtQixDQUFDLENBQUMsQ0FBQztZQUMxQyxDQUFDLENBQUMsQ0FBQztZQUVILElBQUksQ0FBQyxtQ0FBbUMsRUFBRSxHQUFHLEVBQUU7Z0JBQzlDLGNBQWMsQ0FBQztvQkFDZCxZQUFZLEVBQUUsSUFBSSxFQUFHLGNBQWM7b0JBQ25DLGFBQWEsRUFBRSxJQUFJLEVBQUUsd0JBQXdCO29CQUM3QyxXQUFXLEVBQUUsS0FBSyxDQUFHLGNBQWM7aUJBQ25DLENBQUMsQ0FBQztnQkFFSCxFQUFFLENBQUMsY0FBYyxDQUFDLG1CQUFtQixDQUFDLENBQUMsQ0FBQztnQkFDeEMsRUFBRSxDQUFDLGNBQWMsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDO2dCQUNqQyxFQUFFLENBQUMsY0FBYyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUM7Z0JBQ2pDLEVBQUUsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDO2dCQUMvQixFQUFFLENBQUMsQ0FBQyxjQUFjLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQztZQUNqQyxDQUFDLENBQUMsQ0FBQztZQUVILElBQUksQ0FBQyw0Q0FBNEMsRUFBRSxHQUFHLEVBQUU7Z0JBQ3ZELGNBQWMsQ0FBQztvQkFDZCxTQUFTLEVBQUUsSUFBSTtvQkFDZixVQUFVLEVBQUUsS0FBSztpQkFDakIsQ0FBQyxDQUFDO2dCQUVILEVBQUUsQ0FBQyxjQUFjLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQztnQkFDakMsRUFBRSxDQUFDLENBQUMsY0FBYyxDQUFDLFlBQVksQ0FBQyxFQUFFLHlDQUF5QyxDQUFDLENBQUM7Z0JBQzdFLEVBQUUsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDO2dCQUMvQixFQUFFLENBQUMsQ0FBQyxjQUFjLENBQUMsU0FBUyxDQUFDLEVBQUUseUNBQXlDLENBQUMsQ0FBQztZQUMzRSxDQUFDLENBQUMsQ0FBQztRQUNKLENBQUMsQ0FBQyxDQUFDO0lBQ0osQ0FBQyxDQUFDLENBQUM7SUFFSCxLQUFLLENBQUMsWUFBWSxFQUFFLEdBQUcsRUFBRTtRQUN4QixJQUFJLENBQUMsaUNBQWlDLEVBQUUsR0FBRyxFQUFFO1lBQzVDLGNBQWMsQ0FBQyxFQUFFLENBQUMsQ0FBQztZQUVuQixFQUFFLENBQUMsQ0FBQyxjQUFjLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQztZQUNsQyxFQUFFLENBQUMsQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztZQUMxQixFQUFFLENBQUMsQ0FBQyxjQUFjLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQztRQUNoQyxDQUFDLENBQUMsQ0FBQztRQUVILElBQUksQ0FBQyxxQ0FBcUMsRUFBRSxHQUFHLEVBQUU7WUFDaEQsY0FBYyxDQUFDO2dCQUNkLE1BQU0sRUFBRSxJQUFJO2FBQ1osQ0FBQyxDQUFDO1lBRUgsRUFBRSxDQUFDLENBQUMsY0FBYyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDeEIsRUFBRSxDQUFDLENBQUMsY0FBYyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7UUFDNUIsQ0FBQyxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsc0NBQXNDLEVBQUUsR0FBRyxFQUFFO1lBQ2pELGNBQWMsQ0FBQztnQkFDZCxNQUFNLEVBQUUsSUFBSTthQUNaLENBQUMsQ0FBQztZQUVILEVBQUUsQ0FBQyxjQUFjLENBQUMsc0JBQXNCLENBQUMsQ0FBQyxDQUFDO1lBQzNDLEVBQUUsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDO1FBQ3JDLENBQUMsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLHFDQUFxQyxFQUFFLEdBQUcsRUFBRTtZQUNoRCxjQUFjLENBQUM7Z0JBQ2QsTUFBTSxFQUFFLElBQUk7YUFDWixDQUFDLENBQUM7WUFFSCxFQUFFLENBQUMsY0FBYyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUM7WUFDakMsRUFBRSxDQUFDLENBQUMsY0FBYyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUM7WUFDbEMsRUFBRSxDQUFDLENBQUMsY0FBYyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUM7UUFDbkMsQ0FBQyxDQUFDLENBQUM7UUFFSCxvREFBb0Q7UUFDcEQsSUFBSSxDQUFDLGlFQUFpRSxFQUFFLEdBQUcsRUFBRTtZQUM1RSxjQUFjLENBQUM7Z0JBQ2QsMENBQTBDLEVBQUUsSUFBSTthQUNoRCxDQUFDLENBQUM7WUFFSCxFQUFFLENBQUMsY0FBYyxDQUFDLDBDQUEwQyxDQUFDLENBQUMsQ0FBQztZQUMvRCxFQUFFLENBQUMsY0FBYyxDQUFDLHNEQUFzRCxDQUFDLENBQUMsQ0FBQztRQUM1RSxDQUFDLENBQUMsQ0FBQztJQUNKLENBQUMsQ0FBQyxDQUFDO0lBRUgsS0FBSyxDQUFDLDhCQUE4QixFQUFFLEdBQUcsRUFBRTtRQUMxQyxLQUFLLENBQUMsR0FBRyxFQUFFO1lBQ1YsS0FBSyxHQUFHLE1BQU0sQ0FBQztRQUNoQixDQUFDLENBQUMsQ0FBQztRQUVILElBQUksQ0FBQywyQ0FBMkMsRUFBRSxHQUFHLEVBQUU7WUFDdEQsY0FBYyxDQUFDO2dCQUNkLGVBQWUsRUFBRSxJQUFJO2dCQUNyQixhQUFhLEVBQUUsSUFBSTtnQkFDbkIsY0FBYyxFQUFFLElBQUk7Z0JBQ3BCLGFBQWEsRUFBRSxLQUFLO2dCQUNwQixLQUFLLEVBQUUsS0FBSzthQUNaLENBQUMsQ0FBQztZQUVILEVBQUUsQ0FBQyxjQUFjLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQztZQUNwQyxFQUFFLENBQUMsY0FBYyxDQUFDLHNCQUFzQixDQUFDLENBQUMsQ0FBQztZQUMzQyxFQUFFLENBQUMsY0FBYyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUM7WUFDbkMsRUFBRSxDQUFDLENBQUMsY0FBYyxDQUFDLHNCQUFzQixDQUFDLENBQUMsQ0FBQztRQUM3QyxDQUFDLENBQUMsQ0FBQztRQUVILElBQUksQ0FBQywwQkFBMEIsRUFBRSxHQUFHLEVBQUU7WUFDckMsY0FBYyxDQUFDO2dCQUNkLGFBQWEsRUFBRSxJQUFJO2FBQ25CLENBQUMsQ0FBQztZQUVILEVBQUUsQ0FBQyxjQUFjLENBQUMsc0JBQXNCLENBQUMsQ0FBQyxDQUFDO1lBQzNDLEVBQUUsQ0FBQyxjQUFjLENBQUMsdUJBQXVCLENBQUMsQ0FBQyxDQUFDO1lBQzVDLEVBQUUsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDO1lBQ3BDLEVBQUUsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO1FBQzVCLENBQUMsQ0FBQyxDQUFDO0lBQ0osQ0FBQyxDQUFDLENBQUM7SUFFSCxLQUFLLENBQUMsNERBQTRELEVBQUUsR0FBRyxFQUFFO1FBQ3hFLElBQUksQ0FBQyx1RUFBdUUsRUFBRSxHQUFHLEVBQUU7WUFDbEYsNkJBQTZCLENBQUM7Z0JBQzdCLE1BQU0sRUFBRSxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsZ0JBQWdCLEVBQUUsSUFBSSxFQUFFO2FBQ2pELENBQUMsQ0FBQztZQUVILEVBQUUsQ0FBQyx5QkFBeUIsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDO1lBQzVDLEVBQUUsQ0FBQyx5QkFBeUIsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLENBQUM7UUFDbEQsQ0FBQyxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMseUVBQXlFLEVBQUUsR0FBRyxFQUFFO1lBQ3BGLGNBQWMsQ0FBQztnQkFDZCxNQUFNLEVBQUUsSUFBSTthQUNaLENBQUMsQ0FBQztZQUVILHNFQUFzRTtZQUN0RSxFQUFFLENBQUMsQ0FBQyx5QkFBeUIsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDO1FBQzlDLENBQUMsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLDBEQUEwRCxFQUFFLEdBQUcsRUFBRTtZQUNyRSw2QkFBNkIsQ0FBQztnQkFDN0IsZUFBZSxFQUFFLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxnQkFBZ0IsRUFBRSxJQUFJLEVBQUU7YUFDMUQsQ0FBQyxDQUFDO1lBRUgsRUFBRSxDQUFDLHlCQUF5QixDQUFDLGtCQUFrQixDQUFDLENBQUMsQ0FBQztZQUNsRCxFQUFFLENBQUMsQ0FBQyx5QkFBeUIsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDO1FBQzlDLENBQUMsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLGtFQUFrRSxFQUFFLEdBQUcsRUFBRTtZQUM3RSw2QkFBNkIsQ0FBQztnQkFDN0IsU0FBUyxFQUFFLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxnQkFBZ0IsRUFBRSxJQUFJLEVBQUU7YUFDcEQsQ0FBQyxDQUFDO1lBRUgsRUFBRSxDQUFDLHlCQUF5QixDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUM7WUFDNUMsRUFBRSxDQUFDLHlCQUF5QixDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUM7WUFDNUMsRUFBRSxDQUFDLHlCQUF5QixDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUM7UUFDN0MsQ0FBQyxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsNkNBQTZDLEVBQUUsR0FBRyxFQUFFO1lBQ3hELDZCQUE2QixDQUFDO2dCQUM3QixrQkFBa0IsRUFBRSxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsZ0JBQWdCLEVBQUUsSUFBSSxFQUFFO2dCQUM3RCxVQUFVLEVBQUUsRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLGdCQUFnQixFQUFFLElBQUksRUFBRTthQUNyRCxDQUFDLENBQUM7WUFFSCxFQUFFLENBQUMseUJBQXlCLENBQUMsNEJBQTRCLENBQUMsQ0FBQyxDQUFDO1lBQzVELEVBQUUsQ0FBQyx5QkFBeUIsQ0FBQyw2QkFBNkIsQ0FBQyxDQUFDLENBQUM7WUFDN0QsRUFBRSxDQUFDLHlCQUF5QixDQUFDLHVCQUF1QixDQUFDLENBQUMsQ0FBQztZQUN2RCxFQUFFLENBQUMsQ0FBQyx5QkFBeUIsQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDO1FBQy9DLENBQUMsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLDRDQUE0QyxFQUFFLEdBQUcsRUFBRTtZQUN2RCw2QkFBNkIsQ0FBQztnQkFDN0IsTUFBTSxFQUFFLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxnQkFBZ0IsRUFBRSxJQUFJLEVBQUU7YUFDakQsQ0FBQyxDQUFDO1lBRUgsRUFBRSxDQUFDLENBQUMseUJBQXlCLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUNuQyxFQUFFLENBQUMsQ0FBQyx5QkFBeUIsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO1FBQ3ZDLENBQUMsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLGlFQUFpRSxFQUFFLEdBQUcsRUFBRTtZQUM1RSw2QkFBNkIsQ0FBQztnQkFDN0IsTUFBTSxFQUFFLElBQUksRUFBRyxrQkFBa0I7Z0JBQ2pDLElBQUksRUFBRSxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsZ0JBQWdCLEVBQUUsSUFBSSxFQUFFLEVBQUcsdUJBQXVCO2dCQUN6RSxJQUFJLEVBQUUsRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLGdCQUFnQixFQUFFLEtBQUssRUFBRSxDQUFFLDJCQUEyQjthQUM3RSxDQUFDLENBQUM7WUFFSCxtRkFBbUY7WUFDbkYsRUFBRSxDQUFDLHlCQUF5QixDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUM7WUFDeEMsRUFBRSxDQUFDLENBQUMseUJBQXlCLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQztZQUM3QyxFQUFFLENBQUMsQ0FBQyx5QkFBeUIsQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDO1FBQy9DLENBQUMsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLHlEQUF5RCxFQUFFLEdBQUcsRUFBRTtZQUNwRSw2QkFBNkIsQ0FBQztnQkFDN0IsTUFBTSxFQUFFLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxnQkFBZ0IsRUFBRSxJQUFJLEVBQUU7Z0JBQ2pELGFBQWEsRUFBRSxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsZ0JBQWdCLEVBQUUsSUFBSSxFQUFFO2FBQ3pELENBQUMsQ0FBQztZQUVILEVBQUUsQ0FBQyx5QkFBeUIsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDO1lBQzVDLEVBQUUsQ0FBQyxDQUFDLHlCQUF5QixDQUFDLHdCQUF3QixDQUFDLENBQUMsQ0FBQztZQUN6RCxFQUFFLENBQUMsQ0FBQyx5QkFBeUIsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDLENBQUM7UUFDdkQsQ0FBQyxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsdUVBQXVFLEVBQUUsR0FBRyxFQUFFO1lBQ2xGLDZCQUE2QixDQUFDO2dCQUM3QixRQUFRLEVBQUUsRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLGdCQUFnQixFQUFFLElBQUksRUFBRTtnQkFDbkQsbUJBQW1CLEVBQUUsRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLGdCQUFnQixFQUFFLElBQUksRUFBRTthQUMvRCxDQUFDLENBQUM7WUFFSCxFQUFFLENBQUMseUJBQXlCLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQztZQUM1QyxFQUFFLENBQUMsQ0FBQyx5QkFBeUIsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDLENBQUM7UUFDMUQsQ0FBQyxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsMkRBQTJELEVBQUUsR0FBRyxFQUFFO1lBQ3RFLDZCQUE2QixDQUFDO2dCQUM3QixLQUFLLEVBQUUsRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLGdCQUFnQixFQUFFLElBQUksRUFBRTtnQkFDaEQsZ0JBQWdCLEVBQUUsRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLGdCQUFnQixFQUFFLElBQUksRUFBRTtnQkFDNUQsNEJBQTRCLEVBQUUsRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLGdCQUFnQixFQUFFLElBQUksRUFBRTthQUN4RSxDQUFDLENBQUM7WUFFSCxFQUFFLENBQUMseUJBQXlCLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQztZQUM3QyxFQUFFLENBQUMseUJBQXlCLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQztZQUMvQyxFQUFFLENBQUMsQ0FBQyx5QkFBeUIsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDLENBQUM7WUFDdEQsRUFBRSxDQUFDLENBQUMseUJBQXlCLENBQUMscURBQXFELENBQUMsQ0FBQyxDQUFDO1FBQ3ZGLENBQUMsQ0FBQyxDQUFDO0lBQ0osQ0FBQyxDQUFDLENBQUM7SUFFSCxLQUFLLENBQUMsU0FBUyxFQUFFLEdBQUcsRUFBRTtRQUNyQixTQUFTLGdCQUFnQixDQUFDLE9BQWU7WUFDeEMsT0FBTyx1QkFBdUIsQ0FBQyxxQkFBcUIsQ0FBQyxPQUFPLEVBQUUsS0FBSyxFQUFFLEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQztRQUNqRixDQUFDO1FBRUQsU0FBUyxvQkFBb0IsQ0FBQyxXQUFtQjtZQUNoRCxPQUFPLHVCQUF1QixDQUFDLHlCQUF5QixDQUFDLFdBQVcsQ0FBQyxDQUFDLE1BQU0sQ0FBQztRQUM5RSxDQUFDO1FBRUQsS0FBSyxDQUFDLFNBQVMsRUFBRSxHQUFHLEVBQUU7WUFDckIsSUFBSSxDQUFDLFVBQVUsRUFBRSxHQUFHLEVBQUU7Z0JBQ3JCLGNBQWMsQ0FBQyxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO2dCQUMvQixXQUFXLENBQUMsZ0JBQWdCLENBQUMsWUFBWSxDQUFDLEVBQUUsMkRBQTJELENBQUMsQ0FBQztZQUMxRyxDQUFDLENBQUMsQ0FBQztZQUNILElBQUksQ0FBQyxjQUFjLEVBQUUsR0FBRyxFQUFFO2dCQUN6QixjQUFjLENBQUMsRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQztnQkFDaEMsV0FBVyxDQUFDLGdCQUFnQixDQUFDLFlBQVksQ0FBQyxFQUFFLHdEQUF3RCxDQUFDLENBQUM7WUFDdkcsQ0FBQyxDQUFDLENBQUM7WUFDSCxJQUFJLENBQUMsVUFBVSxFQUFFLEdBQUcsRUFBRTtnQkFDckIsY0FBYyxDQUFDLEVBQUUsQ0FBQyxDQUFDO2dCQUNuQixXQUFXLENBQUMsZ0JBQWdCLENBQUMsWUFBWSxDQUFDLEVBQUUsMkRBQTJELENBQUMsQ0FBQztZQUMxRyxDQUFDLENBQUMsQ0FBQztRQUNKLENBQUMsQ0FBQyxDQUFDO1FBRUgsS0FBSyxDQUFDLGNBQWMsRUFBRSxHQUFHLEVBQUU7WUFDMUIsSUFBSSxDQUFDLFVBQVUsRUFBRSxHQUFHLEVBQUU7Z0JBQ3JCLDZCQUE2QixDQUFDLEVBQUUsSUFBSSxFQUFFLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxnQkFBZ0IsRUFBRSxJQUFJLEVBQUUsRUFBRSxDQUFDLENBQUM7Z0JBQ25GLFdBQVcsQ0FBQyxvQkFBb0IsQ0FBQyxZQUFZLENBQUMsRUFBRSxnRUFBZ0UsQ0FBQyxDQUFDO1lBQ25ILENBQUMsQ0FBQyxDQUFDO1lBQ0gsSUFBSSxDQUFDLGNBQWMsRUFBRSxHQUFHLEVBQUU7Z0JBQ3pCLDZCQUE2QixDQUFDLEVBQUUsSUFBSSxFQUFFLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxnQkFBZ0IsRUFBRSxJQUFJLEVBQUUsRUFBRSxDQUFDLENBQUM7Z0JBQ3BGLFdBQVcsQ0FBQyxvQkFBb0IsQ0FBQyxZQUFZLENBQUMsRUFBRSw2REFBNkQsQ0FBQyxDQUFDO1lBQ2hILENBQUMsQ0FBQyxDQUFDO1lBQ0gsSUFBSSxDQUFDLFVBQVUsRUFBRSxHQUFHLEVBQUU7Z0JBQ3JCLDZCQUE2QixDQUFDLEVBQUUsQ0FBQyxDQUFDO2dCQUNsQyxXQUFXLENBQUMsb0JBQW9CLENBQUMsWUFBWSxDQUFDLEVBQUUsZ0VBQWdFLENBQUMsQ0FBQztZQUNuSCxDQUFDLENBQUMsQ0FBQztRQUNKLENBQUMsQ0FBQyxDQUFDO0lBQ0osQ0FBQyxDQUFDLENBQUM7QUFDSixDQUFDLENBQUMsQ0FBQyJ9