/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { deepStrictEqual, fail, strictEqual } from 'assert';
import { importAMDNodeModule } from '../../../../../../amdX.js';
import { getActiveDocument } from '../../../../../../base/browser/dom.js';
import { timeout } from '../../../../../../base/common/async.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../../base/test/common/utils.js';
import { TestConfigurationService } from '../../../../../../platform/configuration/test/common/testConfigurationService.js';
import { NullLogService } from '../../../../../../platform/log/common/log.js';
import { ShellIntegrationAddon } from '../../../../../../platform/terminal/common/xterm/shellIntegrationAddon.js';
import { workbenchInstantiationService } from '../../../../../test/browser/workbenchTestServices.js';
import { ITerminalConfigurationService } from '../../../../terminal/browser/terminal.js';
import { NullTelemetryService } from '../../../../../../platform/telemetry/common/telemetryUtils.js';
import { events as rich_windows11_pwsh7_echo_3_times } from './recordings/rich/windows11_pwsh7_echo_3_times.js';
import { events as rich_windows11_pwsh7_ls_one_time } from './recordings/rich/windows11_pwsh7_ls_one_time.js';
import { events as rich_windows11_pwsh7_type_foo } from './recordings/rich/windows11_pwsh7_type_foo.js';
import { events as rich_windows11_pwsh7_type_foo_left_twice } from './recordings/rich/windows11_pwsh7_type_foo_left_twice.js';
import { events as rich_macos_zsh_omz_echo_3_times } from './recordings/rich/macos_zsh_omz_echo_3_times.js';
import { events as rich_macos_zsh_omz_ls_one_time } from './recordings/rich/macos_zsh_omz_ls_one_time.js';
import { events as basic_macos_zsh_p10k_ls_one_time } from './recordings/basic/macos_zsh_p10k_ls_one_time.js';
const recordedTestCases = [
    {
        name: 'rich_windows11_pwsh7_echo_3_times',
        events: rich_windows11_pwsh7_echo_3_times,
        finalAssertions: (commandDetection) => {
            assertCommandDetectionState(commandDetection, ['echo a', 'echo b', 'echo c'], '|');
        }
    },
    {
        name: 'rich_windows11_pwsh7_ls_one_time',
        events: rich_windows11_pwsh7_ls_one_time,
        finalAssertions: (commandDetection) => {
            assertCommandDetectionState(commandDetection, ['ls'], '|');
        }
    },
    {
        name: 'rich_windows11_pwsh7_type_foo',
        events: rich_windows11_pwsh7_type_foo,
        finalAssertions: (commandDetection) => {
            assertCommandDetectionState(commandDetection, [], 'foo|');
        }
    },
    {
        name: 'rich_windows11_pwsh7_type_foo_left_twice',
        events: rich_windows11_pwsh7_type_foo_left_twice,
        finalAssertions: (commandDetection) => {
            assertCommandDetectionState(commandDetection, [], 'f|oo');
        }
    },
    {
        name: 'rich_macos_zsh_omz_echo_3_times',
        events: rich_macos_zsh_omz_echo_3_times,
        finalAssertions: (commandDetection) => {
            assertCommandDetectionState(commandDetection, ['echo a', 'echo b', 'echo c'], '|');
        }
    },
    {
        name: 'rich_macos_zsh_omz_ls_one_time',
        events: rich_macos_zsh_omz_ls_one_time,
        finalAssertions: (commandDetection) => {
            assertCommandDetectionState(commandDetection, ['ls'], '|');
        }
    },
    {
        name: 'basic_macos_zsh_p10k_ls_one_time',
        events: basic_macos_zsh_p10k_ls_one_time,
        finalAssertions: (commandDetection) => {
            // Prompt input model doesn't work for p10k yet
            // Assert a single command has completed
            deepStrictEqual(commandDetection.commands.map(e => e.command), ['']);
        }
    },
];
function assertCommandDetectionState(commandDetection, commands, promptInput) {
    if (!commandDetection) {
        fail('Command detection must be set');
    }
    deepStrictEqual(commandDetection.commands.map(e => e.command), commands);
    strictEqual(commandDetection.promptInputModel.getCombinedString(), promptInput);
}
suite('Terminal Contrib Shell Integration Recordings', () => {
    const store = ensureNoDisposablesAreLeakedInTestSuite();
    let xterm;
    let capabilities;
    setup(async () => {
        const terminalConfig = {
            integrated: {}
        };
        const instantiationService = workbenchInstantiationService({
            configurationService: () => new TestConfigurationService({
                files: { autoSave: false },
                terminal: terminalConfig,
                editor: { fontSize: 14, fontFamily: 'Arial', lineHeight: 12, fontWeight: 'bold' }
            })
        }, store);
        const terminalConfigurationService = instantiationService.get(ITerminalConfigurationService);
        terminalConfigurationService.setConfig(terminalConfig);
        const shellIntegrationAddon = store.add(new ShellIntegrationAddon('', true, undefined, NullTelemetryService, new NullLogService));
        const TerminalCtor = (await importAMDNodeModule('@xterm/xterm', 'lib/xterm.js')).Terminal;
        xterm = store.add(new TerminalCtor({ allowProposedApi: true }));
        capabilities = shellIntegrationAddon.capabilities;
        const testContainer = document.createElement('div');
        getActiveDocument().body.append(testContainer);
        xterm.open(testContainer);
        xterm.loadAddon(shellIntegrationAddon);
        xterm.focus();
    });
    for (const testCase of recordedTestCases) {
        test(testCase.name, async () => {
            for (const [i, event] of testCase.events.entries()) {
                // DEBUG: Uncomment to see the events as they are played
                // console.log(
                // 	event.type,
                // 	event.type === 'command'
                // 		? event.id
                // 		: event.type === 'resize'
                // 			? `${event.cols}x${event.rows}`
                // 			: (event.data.length > 50 ? event.data.slice(0, 50) + '...' : event.data).replaceAll('\x1b', '\\x1b').replace(/(\n|\r).+$/, '...')
                // );
                // console.log('promptInputModel', capabilities.get(TerminalCapability.CommandDetection)?.promptInputModel.getCombinedString());
                switch (event.type) {
                    case 'resize': {
                        xterm.resize(event.cols, event.rows);
                        break;
                    }
                    case 'output': {
                        const promises = [];
                        if (event.data.includes('\x1b]633;B')) {
                            // If the output contains the command start sequence, allow time for the prompt to get
                            // adjusted.
                            promises.push(new Promise(r => {
                                const commandDetection = capabilities.get(2 /* TerminalCapability.CommandDetection */);
                                if (commandDetection) {
                                    const d = commandDetection.onCommandStarted(() => {
                                        d.dispose();
                                        r();
                                    });
                                }
                            }));
                        }
                        promises.push(new Promise(r => xterm.write(event.data, () => r())));
                        await Promise.all(promises);
                        break;
                    }
                    case 'input': {
                        xterm.input(event.data, true);
                        break;
                    }
                    case 'promptInputChange': {
                        // Ignore this event if it's followed by another promptInputChange as that
                        // means this one isn't important and could cause a race condition in the
                        // test
                        if (testCase.events.length > i + 1 && testCase.events[i + 1].type === 'promptInputChange') {
                            continue;
                        }
                        const promptInputModel = capabilities.get(2 /* TerminalCapability.CommandDetection */)?.promptInputModel;
                        if (promptInputModel && promptInputModel.getCombinedString() !== event.data) {
                            await Promise.race([
                                await timeout(1000).then(() => { throw new Error(`Prompt input change timed out current="${promptInputModel.getCombinedString()}", expected="${event.data}"`); }),
                                await new Promise(r => {
                                    const d = promptInputModel.onDidChangeInput(() => {
                                        if (promptInputModel.getCombinedString() === event.data) {
                                            d.dispose();
                                            r();
                                        }
                                    });
                                })
                            ]);
                        }
                        break;
                    }
                }
            }
            testCase.finalAssertions(capabilities.get(2 /* TerminalCapability.CommandDetection */));
        });
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2hlbGxJbnRlZ3JhdGlvbkFkZG9uLmludGVncmF0aW9uVGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL2FkdmlrYXIvRG9jdW1lbnRzL2FyY2hpdGVjdC9hcmNoMi9BcmNoSURFL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlcm1pbmFsL3Rlc3QvYnJvd3Nlci94dGVybS9zaGVsbEludGVncmF0aW9uQWRkb24uaW50ZWdyYXRpb25UZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBRSxlQUFlLEVBQUUsSUFBSSxFQUFFLFdBQVcsRUFBRSxNQUFNLFFBQVEsQ0FBQztBQUM1RCxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQztBQUNoRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUMxRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDakUsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFDdEcsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sa0ZBQWtGLENBQUM7QUFDNUgsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDhDQUE4QyxDQUFDO0FBRzlFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDJFQUEyRSxDQUFDO0FBQ2xILE9BQU8sRUFBRSw2QkFBNkIsRUFBeUMsTUFBTSxzREFBc0QsQ0FBQztBQUM1SSxPQUFPLEVBQUUsNkJBQTZCLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUV6RixPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSwrREFBK0QsQ0FBQztBQUNyRyxPQUFPLEVBQUUsTUFBTSxJQUFJLGlDQUFpQyxFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDaEgsT0FBTyxFQUFFLE1BQU0sSUFBSSxnQ0FBZ0MsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FB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