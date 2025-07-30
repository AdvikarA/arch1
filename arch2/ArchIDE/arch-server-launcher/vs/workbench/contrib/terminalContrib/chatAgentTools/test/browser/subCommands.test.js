/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { deepStrictEqual } from 'assert';
import { extractInlineSubCommands, splitCommandLineIntoSubCommands } from '../../browser/subCommands.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../../base/test/common/utils.js';
suite('splitCommandLineIntoSubCommands', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('should split command line into subcommands', () => {
        const commandLine = 'echo "Hello World" && ls -la || pwd';
        const expectedSubCommands = ['echo "Hello World"', 'ls -la', 'pwd'];
        const actualSubCommands = splitCommandLineIntoSubCommands(commandLine, 'zsh', 3 /* OperatingSystem.Linux */);
        deepStrictEqual(actualSubCommands, expectedSubCommands);
    });
    suite('bash/sh shell', () => {
        test('should split on logical operators', () => {
            const commandLine = 'echo test && ls -la || pwd';
            const expectedSubCommands = ['echo test', 'ls -la', 'pwd'];
            const actualSubCommands = splitCommandLineIntoSubCommands(commandLine, 'bash', 3 /* OperatingSystem.Linux */);
            deepStrictEqual(actualSubCommands, expectedSubCommands);
        });
        test('should split on pipes', () => {
            const commandLine = 'ls -la | grep test | wc -l';
            const expectedSubCommands = ['ls -la', 'grep test', 'wc -l'];
            const actualSubCommands = splitCommandLineIntoSubCommands(commandLine, 'sh', 3 /* OperatingSystem.Linux */);
            deepStrictEqual(actualSubCommands, expectedSubCommands);
        });
        test('should split on semicolons', () => {
            const commandLine = 'cd /tmp; ls -la; pwd';
            const expectedSubCommands = ['cd /tmp', 'ls -la', 'pwd'];
            const actualSubCommands = splitCommandLineIntoSubCommands(commandLine, 'sh', 3 /* OperatingSystem.Linux */);
            deepStrictEqual(actualSubCommands, expectedSubCommands);
        });
        test('should split on background operator', () => {
            const commandLine = 'sleep 5 & echo done';
            const expectedSubCommands = ['sleep 5', 'echo done'];
            const actualSubCommands = splitCommandLineIntoSubCommands(commandLine, 'sh', 3 /* OperatingSystem.Linux */);
            deepStrictEqual(actualSubCommands, expectedSubCommands);
        });
        test('should split on redirection operators', () => {
            const commandLine = 'echo test > output.txt && cat output.txt';
            const expectedSubCommands = ['echo test', 'output.txt', 'cat output.txt'];
            const actualSubCommands = splitCommandLineIntoSubCommands(commandLine, 'sh', 3 /* OperatingSystem.Linux */);
            deepStrictEqual(actualSubCommands, expectedSubCommands);
        });
        test('should split on stderr redirection', () => {
            const commandLine = 'command 2> error.log && echo success';
            const expectedSubCommands = ['command', 'error.log', 'echo success'];
            const actualSubCommands = splitCommandLineIntoSubCommands(commandLine, 'sh', 3 /* OperatingSystem.Linux */);
            deepStrictEqual(actualSubCommands, expectedSubCommands);
        });
        test('should split on append redirection', () => {
            const commandLine = 'echo line1 >> file.txt && echo line2 >> file.txt';
            const expectedSubCommands = ['echo line1', 'file.txt', 'echo line2', 'file.txt'];
            const actualSubCommands = splitCommandLineIntoSubCommands(commandLine, 'sh', 3 /* OperatingSystem.Linux */);
            deepStrictEqual(actualSubCommands, expectedSubCommands);
        });
    });
    suite('zsh shell', () => {
        test('should split on zsh-specific operators', () => {
            const commandLine = 'echo test <<< "input" && ls';
            const expectedSubCommands = ['echo test', '"input"', 'ls'];
            const actualSubCommands = splitCommandLineIntoSubCommands(commandLine, 'zsh', 3 /* OperatingSystem.Linux */);
            deepStrictEqual(actualSubCommands, expectedSubCommands);
        });
        test('should split on process substitution', () => {
            const commandLine = 'diff <(ls dir1) <(ls dir2)';
            const expectedSubCommands = ['diff', 'ls dir1)', 'ls dir2)'];
            const actualSubCommands = splitCommandLineIntoSubCommands(commandLine, 'zsh', 3 /* OperatingSystem.Linux */);
            deepStrictEqual(actualSubCommands, expectedSubCommands);
        });
        test('should split on bidirectional redirection', () => {
            const commandLine = 'command <> file.txt && echo done';
            const expectedSubCommands = ['command', 'file.txt', 'echo done'];
            const actualSubCommands = splitCommandLineIntoSubCommands(commandLine, 'zsh', 3 /* OperatingSystem.Linux */);
            deepStrictEqual(actualSubCommands, expectedSubCommands);
        });
        test('should handle complex zsh command chains', () => {
            const commandLine = 'ls | grep test && echo found || echo not found';
            const expectedSubCommands = ['ls', 'grep test', 'echo found', 'echo not found'];
            const actualSubCommands = splitCommandLineIntoSubCommands(commandLine, 'zsh', 3 /* OperatingSystem.Linux */);
            deepStrictEqual(actualSubCommands, expectedSubCommands);
        });
    });
    suite('PowerShell', () => {
        test('should not split on PowerShell logical operators', () => {
            const commandLine = 'Get-ChildItem -and Get-Location -or Write-Host "test"';
            const expectedSubCommands = ['Get-ChildItem -and Get-Location -or Write-Host "test"'];
            const actualSubCommands = splitCommandLineIntoSubCommands(commandLine, 'powershell', 3 /* OperatingSystem.Linux */);
            deepStrictEqual(actualSubCommands, expectedSubCommands);
        });
        test('should split on PowerShell pipes', () => {
            const commandLine = 'Get-Process | Where-Object Name -eq "notepad" | Stop-Process';
            const expectedSubCommands = ['Get-Process', 'Where-Object Name -eq "notepad"', 'Stop-Process'];
            const actualSubCommands = splitCommandLineIntoSubCommands(commandLine, 'powershell.exe', 1 /* OperatingSystem.Windows */);
            deepStrictEqual(actualSubCommands, expectedSubCommands);
        });
        test('should split on PowerShell redirection', () => {
            const commandLine = 'Get-Process > processes.txt && Get-Content processes.txt';
            const expectedSubCommands = ['Get-Process', 'processes.txt', 'Get-Content processes.txt'];
            const actualSubCommands = splitCommandLineIntoSubCommands(commandLine, 'pwsh.exe', 1 /* OperatingSystem.Windows */);
            deepStrictEqual(actualSubCommands, expectedSubCommands);
        });
    });
    suite('edge cases', () => {
        test('should return single command when no operators present', () => {
            const commandLine = 'echo "hello world"';
            const expectedSubCommands = ['echo "hello world"'];
            const actualSubCommands = splitCommandLineIntoSubCommands(commandLine, 'bash', 3 /* OperatingSystem.Linux */);
            deepStrictEqual(actualSubCommands, expectedSubCommands);
        });
        test('should handle empty command', () => {
            const commandLine = '';
            const expectedSubCommands = [''];
            const actualSubCommands = splitCommandLineIntoSubCommands(commandLine, 'zsh', 3 /* OperatingSystem.Linux */);
            deepStrictEqual(actualSubCommands, expectedSubCommands);
        });
        test('should trim whitespace from subcommands', () => {
            const commandLine = 'echo test   &&   ls -la   ||   pwd';
            const expectedSubCommands = ['echo test', 'ls -la', 'pwd'];
            const actualSubCommands = splitCommandLineIntoSubCommands(commandLine, 'sh', 3 /* OperatingSystem.Linux */);
            deepStrictEqual(actualSubCommands, expectedSubCommands);
        });
        test('should handle multiple consecutive operators', () => {
            const commandLine = 'echo test && && ls';
            const expectedSubCommands = ['echo test', '', 'ls'];
            const actualSubCommands = splitCommandLineIntoSubCommands(commandLine, 'bash', 3 /* OperatingSystem.Linux */);
            deepStrictEqual(actualSubCommands, expectedSubCommands);
        });
        test('should handle unknown shell as sh', () => {
            const commandLine = 'echo test && ls -la';
            const expectedSubCommands = ['echo test', 'ls -la'];
            const actualSubCommands = splitCommandLineIntoSubCommands(commandLine, 'unknown-shell', 3 /* OperatingSystem.Linux */);
            deepStrictEqual(actualSubCommands, expectedSubCommands);
        });
    });
    suite('shell type detection', () => {
        test('should detect PowerShell variants', () => {
            const commandLine = 'Get-Process ; Get-Location';
            const expectedSubCommands = ['Get-Process', 'Get-Location'];
            deepStrictEqual(splitCommandLineIntoSubCommands(commandLine, 'powershell', 3 /* OperatingSystem.Linux */), expectedSubCommands);
            deepStrictEqual(splitCommandLineIntoSubCommands(commandLine, 'powershell.exe', 1 /* OperatingSystem.Windows */), expectedSubCommands);
            deepStrictEqual(splitCommandLineIntoSubCommands(commandLine, 'pwsh', 3 /* OperatingSystem.Linux */), expectedSubCommands);
            deepStrictEqual(splitCommandLineIntoSubCommands(commandLine, 'pwsh.exe', 1 /* OperatingSystem.Windows */), expectedSubCommands);
            deepStrictEqual(splitCommandLineIntoSubCommands(commandLine, 'powershell-preview', 3 /* OperatingSystem.Linux */), expectedSubCommands);
        });
        test('should detect zsh specifically', () => {
            const commandLine = 'echo test <<< input';
            const expectedSubCommands = ['echo test', 'input'];
            const actualSubCommands = splitCommandLineIntoSubCommands(commandLine, 'zsh', 3 /* OperatingSystem.Linux */);
            deepStrictEqual(actualSubCommands, expectedSubCommands);
        });
        test('should default to sh for other shells', () => {
            const commandLine = 'echo test && ls';
            const expectedSubCommands = ['echo test', 'ls'];
            deepStrictEqual(splitCommandLineIntoSubCommands(commandLine, 'bash', 3 /* OperatingSystem.Linux */), expectedSubCommands);
            deepStrictEqual(splitCommandLineIntoSubCommands(commandLine, 'dash', 3 /* OperatingSystem.Linux */), expectedSubCommands);
            deepStrictEqual(splitCommandLineIntoSubCommands(commandLine, 'fish', 3 /* OperatingSystem.Linux */), expectedSubCommands);
        });
    });
    suite('complex command combinations', () => {
        test('should handle mixed operators in order', () => {
            const commandLine = 'ls | grep test && echo found > result.txt || echo failed';
            const expectedSubCommands = ['ls', 'grep test', 'echo found', 'result.txt', 'echo failed'];
            const actualSubCommands = splitCommandLineIntoSubCommands(commandLine, 'bash', 3 /* OperatingSystem.Linux */);
            deepStrictEqual(actualSubCommands, expectedSubCommands);
        });
        test.skip('should handle subshells and braces', () => {
            const commandLine = '(cd /tmp && ls) && { echo done; }';
            const expectedSubCommands = ['(cd /tmp', 'ls)', '{ echo done', '}'];
            const actualSubCommands = splitCommandLineIntoSubCommands(commandLine, 'zsh', 3 /* OperatingSystem.Linux */);
            deepStrictEqual(actualSubCommands, expectedSubCommands);
        });
        test('should handle here documents', () => {
            const commandLine = 'cat << EOF && echo done';
            const expectedSubCommands = ['cat', 'EOF', 'echo done'];
            const actualSubCommands = splitCommandLineIntoSubCommands(commandLine, 'sh', 3 /* OperatingSystem.Linux */);
            deepStrictEqual(actualSubCommands, expectedSubCommands);
        });
    });
});
suite('extractInlineSubCommands', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    function assertSubCommandsUnordered(result, expectedSubCommands) {
        deepStrictEqual(Array.from(result).sort(), expectedSubCommands.sort());
    }
    suite('POSIX shells (bash, zsh, sh)', () => {
        test('should extract command substitution with $()', () => {
            const commandLine = 'echo "Current date: $(date)"';
            const result = extractInlineSubCommands(commandLine, '/bin/bash', 3 /* OperatingSystem.Linux */);
            assertSubCommandsUnordered(result, ['date']);
        });
        test('should extract command substitution with backticks', () => {
            const commandLine = 'echo "Current date: `date`"';
            const result = extractInlineSubCommands(commandLine, '/bin/bash', 3 /* OperatingSystem.Linux */);
            assertSubCommandsUnordered(result, ['date']);
        });
        test('should extract process substitution with <()', () => {
            const commandLine = 'diff <(cat file1.txt) <(cat file2.txt)';
            const result = extractInlineSubCommands(commandLine, '/bin/bash', 3 /* OperatingSystem.Linux */);
            assertSubCommandsUnordered(result, ['cat file1.txt', 'cat file2.txt']);
        });
        test('should extract process substitution with >()', () => {
            const commandLine = 'tee >(wc -l) >(grep pattern) < input.txt';
            const result = extractInlineSubCommands(commandLine, '/bin/bash', 3 /* OperatingSystem.Linux */);
            assertSubCommandsUnordered(result, ['wc -l', 'grep pattern']);
        });
        test('should extract multiple inline commands', () => {
            const commandLine = 'echo "Today is $(date) and user is $(whoami)"';
            const result = extractInlineSubCommands(commandLine, '/bin/bash', 3 /* OperatingSystem.Linux */);
            assertSubCommandsUnordered(result, ['date', 'whoami']);
        });
        test('should extract nested inline commands', () => {
            const commandLine = 'echo "$(echo "Inner: $(date)")"';
            const result = extractInlineSubCommands(commandLine, '/bin/bash', 3 /* OperatingSystem.Linux */);
            assertSubCommandsUnordered(result, ['echo "Inner: $(date)"', 'date']);
        });
        test('should handle mixed substitution types', () => {
            const commandLine = 'echo "Date: $(date)" && cat `which ls` | grep <(echo pattern)';
            const result = extractInlineSubCommands(commandLine, '/bin/bash', 3 /* OperatingSystem.Linux */);
            assertSubCommandsUnordered(result, ['date', 'which ls', 'echo pattern']);
        });
        test('should handle empty substitutions', () => {
            const commandLine = 'echo $() test ``';
            const result = extractInlineSubCommands(commandLine, '/bin/bash', 3 /* OperatingSystem.Linux */);
            assertSubCommandsUnordered(result, []);
        });
        test('should handle commands with whitespace', () => {
            const commandLine = 'echo "$( ls -la | grep test )"';
            const result = extractInlineSubCommands(commandLine, '/bin/bash', 3 /* OperatingSystem.Linux */);
            assertSubCommandsUnordered(result, ['ls -la | grep test']);
        });
    });
    suite('PowerShell (pwsh)', () => {
        test('should extract command substitution with $()', () => {
            const commandLine = 'Write-Host "Current date: $(Get-Date)"';
            const result = extractInlineSubCommands(commandLine, 'powershell.exe', 1 /* OperatingSystem.Windows */);
            assertSubCommandsUnordered(result, ['Get-Date']);
        });
        test('should extract array subexpression with @()', () => {
            const commandLine = 'Write-Host @(Get-ChildItem | Where-Object {$_.Name -like "*.txt"})';
            const result = extractInlineSubCommands(commandLine, 'pwsh.exe', 1 /* OperatingSystem.Windows */);
            assertSubCommandsUnordered(result, ['Get-ChildItem | Where-Object {$_.Name -like "*.txt"}']);
        });
        test('should extract call operator with &()', () => {
            const commandLine = 'Write-Host &(Get-Command git)';
            const result = extractInlineSubCommands(commandLine, 'powershell.exe', 1 /* OperatingSystem.Windows */);
            assertSubCommandsUnordered(result, ['Get-Command git']);
        });
        test('should extract multiple PowerShell substitutions', () => {
            const commandLine = 'Write-Host "User: $(whoami) and date: $(Get-Date)"';
            const result = extractInlineSubCommands(commandLine, 'pwsh.exe', 1 /* OperatingSystem.Windows */);
            assertSubCommandsUnordered(result, ['whoami', 'Get-Date']);
        });
        test('should extract nested PowerShell commands', () => {
            const commandLine = 'Write-Host "$(Write-Host "Inner: $(Get-Date)")"';
            const result = extractInlineSubCommands(commandLine, 'powershell.exe', 1 /* OperatingSystem.Windows */);
            assertSubCommandsUnordered(result, ['Write-Host "Inner: $(Get-Date)"', 'Get-Date']);
        });
        test('should handle mixed PowerShell substitution types', () => {
            const commandLine = 'Write-Host "$(Get-Date)" @(Get-ChildItem) &(Get-Command ls)';
            const result = extractInlineSubCommands(commandLine, 'pwsh.exe', 1 /* OperatingSystem.Windows */);
            assertSubCommandsUnordered(result, ['Get-Date', 'Get-ChildItem', 'Get-Command ls']);
        });
        test('should handle PowerShell commands with complex expressions', () => {
            const commandLine = 'Write-Host "$((Get-ChildItem).Count)"';
            const result = extractInlineSubCommands(commandLine, 'powershell.exe', 1 /* OperatingSystem.Windows */);
            assertSubCommandsUnordered(result, ['(Get-ChildItem).Count']);
        });
        test('should handle empty PowerShell substitutions', () => {
            const commandLine = 'Write-Host $() @() &()';
            const result = extractInlineSubCommands(commandLine, 'pwsh', 3 /* OperatingSystem.Linux */);
            assertSubCommandsUnordered(result, []);
        });
    });
    suite('Shell detection', () => {
        test('should detect PowerShell from various shell paths', () => {
            const commandLine = 'Write-Host "$(Get-Date)"';
            const powershellShells = [
                'powershell.exe',
                'pwsh.exe',
                'powershell',
                'pwsh',
                'powershell-preview',
                'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe',
                '/usr/bin/pwsh'
            ];
            for (const shell of powershellShells) {
                const result = extractInlineSubCommands(commandLine, shell, commandLine.match(/\.exe/) ? 1 /* OperatingSystem.Windows */ : 3 /* OperatingSystem.Linux */);
                assertSubCommandsUnordered(result, ['Get-Date']);
            }
        });
        test('should treat non-PowerShell shells as POSIX', () => {
            const commandLine = 'echo "$(date)"';
            const posixShells = [
                '/bin/bash',
                '/bin/sh',
                '/bin/zsh',
                '/usr/bin/fish',
                'bash',
                'sh',
                'zsh'
            ];
            for (const shell of posixShells) {
                const result = extractInlineSubCommands(commandLine, shell, 3 /* OperatingSystem.Linux */);
                assertSubCommandsUnordered(result, ['date']);
            }
        });
    });
    // suite('Edge cases', () => {
    // 	test('should handle commands with no inline substitutions', () => {
    // 		const result1 = extractInlineSubCommands('echo hello world', '/bin/bash', OperatingSystem.Linux);
    // 		deepStrictEqual(Array.from(result1), []);
    // 		const result2 = extractInlineSubCommands('Write-Host "hello world"', 'pwsh', OperatingSystem.Linux);
    // 		deepStrictEqual(Array.from(result2), []);
    // 	});
    // 	test('should handle malformed substitutions gracefully', () => {
    // 		const commandLine = 'echo $( incomplete';
    // 		const result = extractInlineSubCommands(commandLine, '/bin/bash', OperatingSystem.Linux);
    // 		assertSubCommandsUnordered(result, []);
    // 	});
    // 	test('should handle escaped substitutions (should still extract)', () => {
    // 		// Note: This implementation doesn't handle escaping - that would be a future enhancement
    // 		const commandLine = 'echo \\$(date)';
    // 		const result = extractInlineSubCommands(commandLine, '/bin/bash', OperatingSystem.Linux);
    // 		assertSubCommandsUnordered(result, ['date']);
    // 	});
    // 	test('should handle empty command line', () => {
    // 		const result = extractInlineSubCommands('', '/bin/bash', OperatingSystem.Linux);
    // 		assertSubCommandsUnordered(result, []);
    // 	});
    // 	test('should handle whitespace-only command line', () => {
    // 		const result = extractInlineSubCommands('   \t  \n  ', '/bin/bash', OperatingSystem.Linux);
    // 		assertSubCommandsUnordered(result, []);
    // 	});
    // });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3ViQ29tbWFuZHMudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL2FkdmlrYXIvRG9jdW1lbnRzL2FyY2hpdGVjdC9hcmNoMi9BcmNoSURFL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlcm1pbmFsQ29udHJpYi9jaGF0QWdlbnRUb29scy90ZXN0L2Jyb3dzZXIvc3ViQ29tbWFuZHMudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sUUFBUSxDQUFDO0FBQ3pDLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSwrQkFBK0IsRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBRXpHLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBRXRHLEtBQUssQ0FBQyxpQ0FBaUMsRUFBRSxHQUFHLEVBQUU7SUFDN0MsdUNBQXVDLEVBQUUsQ0FBQztJQUUxQyxJQUFJLENBQUMsNENBQTRDLEVBQUUsR0FBRyxFQUFFO1FBQ3ZELE1BQU0sV0FBVyxHQUFHLHFDQUFxQyxDQUFDO1FBQzFELE1BQU0sbUJBQW1CLEdBQUcsQ0FBQyxvQkFBb0IsRUFBRSxRQUFRLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDcEUsTUFBTSxpQkFBaUIsR0FBRywrQkFBK0IsQ0FBQyxXQUFXLEVBQUUsS0FBSyxnQ0FBd0IsQ0FBQztRQUNyRyxlQUFlLENBQUMsaUJBQWlCLEVBQUUsbUJBQW1CLENBQUMsQ0FBQztJQUN6RCxDQUFDLENBQUMsQ0FBQztJQUVILEtBQUssQ0FBQyxlQUFlLEVBQUUsR0FBRyxFQUFFO1FBQzNCLElBQUksQ0FBQyxtQ0FBbUMsRUFBRSxHQUFHLEVBQUU7WUFDOUMsTUFBTSxXQUFXLEdBQUcsNEJBQTRCLENBQUM7WUFDakQsTUFBTSxtQkFBbUIsR0FBRyxDQUFDLFdBQVcsRUFBRSxRQUFRLEVBQUUsS0FBSyxDQUFDLENBQUM7WUFDM0QsTUFB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