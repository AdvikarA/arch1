/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { deepStrictEqual, strictEqual } from 'assert';
import { importAMDNodeModule } from '../../../../../../amdX.js';
import { Color, RGBA } from '../../../../../../base/common/color.js';
import { Emitter } from '../../../../../../base/common/event.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../../base/test/common/utils.js';
import { TestConfigurationService } from '../../../../../../platform/configuration/test/common/testConfigurationService.js';
import { TerminalCapabilityStore } from '../../../../../../platform/terminal/common/capabilities/terminalCapabilityStore.js';
import { IThemeService } from '../../../../../../platform/theme/common/themeService.js';
import { TestColorTheme } from '../../../../../../platform/theme/test/common/testThemeService.js';
import { PANEL_BACKGROUND, SIDE_BAR_BACKGROUND } from '../../../../../common/theme.js';
import { XtermTerminal } from '../../../browser/xterm/xtermTerminal.js';
import { TERMINAL_VIEW_ID } from '../../../common/terminal.js';
import { registerColors, TERMINAL_BACKGROUND_COLOR, TERMINAL_CURSOR_BACKGROUND_COLOR, TERMINAL_CURSOR_FOREGROUND_COLOR, TERMINAL_FOREGROUND_COLOR, TERMINAL_INACTIVE_SELECTION_BACKGROUND_COLOR, TERMINAL_SELECTION_BACKGROUND_COLOR, TERMINAL_SELECTION_FOREGROUND_COLOR } from '../../../common/terminalColorRegistry.js';
import { workbenchInstantiationService } from '../../../../../test/browser/workbenchTestServices.js';
import { XtermAddonImporter } from '../../../browser/xterm/xtermAddonImporter.js';
registerColors();
class TestWebglAddon {
    constructor() {
        this.onChangeTextureAtlas = new Emitter().event;
        this.onAddTextureAtlasCanvas = new Emitter().event;
        this.onRemoveTextureAtlasCanvas = new Emitter().event;
        this.onContextLoss = new Emitter().event;
    }
    static { this.shouldThrow = false; }
    static { this.isEnabled = false; }
    activate() {
        TestWebglAddon.isEnabled = !TestWebglAddon.shouldThrow;
        if (TestWebglAddon.shouldThrow) {
            throw new Error('Test webgl set to throw');
        }
    }
    dispose() {
        TestWebglAddon.isEnabled = false;
    }
    clearTextureAtlas() { }
}
class TestXtermAddonImporter extends XtermAddonImporter {
    async importAddon(name) {
        if (name === 'webgl') {
            return Promise.resolve(TestWebglAddon);
        }
        return super.importAddon(name);
    }
}
export class TestViewDescriptorService {
    constructor() {
        this._location = 1 /* ViewContainerLocation.Panel */;
        this._onDidChangeLocation = new Emitter();
        this.onDidChangeLocation = this._onDidChangeLocation.event;
    }
    getViewLocationById(id) {
        return this._location;
    }
    moveTerminalToLocation(to) {
        const oldLocation = this._location;
        this._location = to;
        this._onDidChangeLocation.fire({
            views: [
                { id: TERMINAL_VIEW_ID }
            ],
            from: oldLocation,
            to
        });
    }
}
const defaultTerminalConfig = {
    fontFamily: 'monospace',
    fontWeight: 'normal',
    fontWeightBold: 'normal',
    gpuAcceleration: 'off',
    scrollback: 10,
    fastScrollSensitivity: 2,
    mouseWheelScrollSensitivity: 1,
    unicodeVersion: '6'
};
suite('XtermTerminal', () => {
    const store = ensureNoDisposablesAreLeakedInTestSuite();
    let instantiationService;
    let configurationService;
    let themeService;
    let xterm;
    let XTermBaseCtor;
    function write(data) {
        return new Promise((resolve) => {
            xterm.write(data, resolve);
        });
    }
    setup(async () => {
        configurationService = new TestConfigurationService({
            editor: {
                fastScrollSensitivity: 2,
                mouseWheelScrollSensitivity: 1
            },
            files: {},
            terminal: {
                integrated: defaultTerminalConfig
            }
        });
        instantiationService = workbenchInstantiationService({
            configurationService: () => configurationService
        }, store);
        themeService = instantiationService.get(IThemeService);
        XTermBaseCtor = (await importAMDNodeModule('@xterm/xterm', 'lib/xterm.js')).Terminal;
        const capabilityStore = store.add(new TerminalCapabilityStore());
        xterm = store.add(instantiationService.createInstance(XtermTerminal, XTermBaseCtor, {
            cols: 80,
            rows: 30,
            xtermColorProvider: { getBackgroundColor: () => undefined },
            capabilities: capabilityStore,
            disableShellIntegrationReporting: true,
            xtermAddonImporter: new TestXtermAddonImporter(),
        }, undefined));
        TestWebglAddon.shouldThrow = false;
        TestWebglAddon.isEnabled = false;
    });
    test('should use fallback dimensions of 80x30', () => {
        strictEqual(xterm.raw.cols, 80);
        strictEqual(xterm.raw.rows, 30);
    });
    suite('getContentsAsText', () => {
        test('should return all buffer contents when no markers provided', async () => {
            await write('line 1\r\nline 2\r\nline 3\r\nline 4\r\nline 5');
            const result = xterm.getContentsAsText();
            strictEqual(result.startsWith('line 1\nline 2\nline 3\nline 4\nline 5'), true, 'Should include the content plus empty lines up to buffer length');
            const lines = result.split('\n');
            strictEqual(lines.length, xterm.raw.buffer.active.length, 'Should end with empty lines (total buffer size is 30 rows)');
        });
        test('should return contents from start marker to end', async () => {
            await write('line 1\r\n');
            const startMarker = xterm.raw.registerMarker(0);
            await write('line 2\r\nline 3\r\nline 4\r\nline 5');
            const result = xterm.getContentsAsText(startMarker);
            strictEqual(result.startsWith('line 2\nline 3\nline 4\nline 5'), true, 'Should start with line 2 and include empty lines');
        });
        test('should return contents from start to end marker', async () => {
            await write('line 1\r\n');
            const startMarker = xterm.raw.registerMarker(0);
            await write('line 2\r\nline 3\r\n');
            const endMarker = xterm.raw.registerMarker(0);
            await write('line 4\r\nline 5');
            const result = xterm.getContentsAsText(startMarker, endMarker);
            strictEqual(result, 'line 2\nline 3\nline 4');
        });
        test('should return single line when start and end markers are the same', async () => {
            await write('line 1\r\nline 2\r\n');
            const marker = xterm.raw.registerMarker(0);
            await write('line 3\r\nline 4\r\nline 5');
            const result = xterm.getContentsAsText(marker, marker);
            strictEqual(result, 'line 3');
        });
        test('should return empty string when start marker is beyond end marker', async () => {
            await write('line 1\r\n');
            const endMarker = xterm.raw.registerMarker(0);
            await write('line 2\r\nline 3\r\n');
            const startMarker = xterm.raw.registerMarker(0);
            await write('line 4\r\nline 5');
            const result = xterm.getContentsAsText(startMarker, endMarker);
            strictEqual(result, '');
        });
        test('should handle empty buffer', async () => {
            const result = xterm.getContentsAsText();
            const lines = result.split('\n');
            strictEqual(lines.length, xterm.raw.buffer.active.length, 'Empty terminal should have empty lines equal to buffer length');
            strictEqual(lines.every(line => line === ''), true, 'All lines should be empty');
        });
        test('should handle mixed content with spaces and special characters', async () => {
            await write('hello world\r\n  indented line\r\nline with $pecial chars!@#\r\n\r\nempty line above');
            const result = xterm.getContentsAsText();
            strictEqual(result.startsWith('hello world\n  indented line\nline with $pecial chars!@#\n\nempty line above'), true, 'Should handle spaces and special characters correctly');
        });
        test('should throw error when startMarker is disposed (line === -1)', async () => {
            await write('line 1\r\n');
            const disposedMarker = xterm.raw.registerMarker(0);
            await write('line 2\r\nline 3\r\nline 4\r\nline 5');
            disposedMarker.dispose();
            try {
                xterm.getContentsAsText(disposedMarker);
                throw new Error('Expected error was not thrown');
            }
            catch (error) {
                strictEqual(error.message, 'Cannot get contents of a disposed startMarker');
            }
        });
        test('should throw error when endMarker is disposed (line === -1)', async () => {
            await write('line 1\r\n');
            const startMarker = xterm.raw.registerMarker(0);
            await write('line 2\r\n');
            const disposedEndMarker = xterm.raw.registerMarker(0);
            await write('line 3\r\nline 4\r\nline 5');
            disposedEndMarker.dispose();
            try {
                xterm.getContentsAsText(startMarker, disposedEndMarker);
                throw new Error('Expected error was not thrown');
            }
            catch (error) {
                strictEqual(error.message, 'Cannot get contents of a disposed endMarker');
            }
        });
        test('should handle markers at buffer boundaries', async () => {
            const startMarker = xterm.raw.registerMarker(0);
            await write('line 1\r\nline 2\r\nline 3\r\nline 4\r\n');
            const endMarker = xterm.raw.registerMarker(0);
            await write('line 5');
            const result = xterm.getContentsAsText(startMarker, endMarker);
            strictEqual(result, 'line 1\nline 2\nline 3\nline 4\nline 5', 'Should handle markers at buffer boundaries correctly');
        });
        test('should handle terminal escape sequences properly', async () => {
            await write('\x1b[31mred text\x1b[0m\r\n\x1b[32mgreen text\x1b[0m');
            const result = xterm.getContentsAsText();
            strictEqual(result.startsWith('red text\ngreen text'), true, 'ANSI escape sequences should be filtered out, but there will be trailing empty lines');
        });
    });
    suite('getBufferReverseIterator', () => {
        test('should get text properly within scrollback limit', async () => {
            const text = 'line 1\r\nline 2\r\nline 3\r\nline 4\r\nline 5';
            await write(text);
            const result = [...xterm.getBufferReverseIterator()].reverse().join('\r\n');
            strictEqual(text, result, 'Should equal original text');
        });
        test('should get text properly when exceed scrollback limit', async () => {
            // max buffer lines(40) = rows(30) + scrollback(10)
            const text = 'line 1\r\nline 2\r\nline 3\r\nline 4\r\nline 5\r\n'.repeat(8).trim();
            await write(text);
            await write('\r\nline more');
            const result = [...xterm.getBufferReverseIterator()].reverse().join('\r\n');
            const expect = text.slice(8) + '\r\nline more';
            strictEqual(expect, result, 'Should equal original text without line 1');
        });
    });
    suite('theme', () => {
        test('should apply correct background color based on getBackgroundColor', () => {
            themeService.setTheme(new TestColorTheme({
                [PANEL_BACKGROUND]: '#ff0000',
                [SIDE_BAR_BACKGROUND]: '#00ff00'
            }));
            xterm = store.add(instantiationService.createInstance(XtermTerminal, XTermBaseCtor, {
                cols: 80,
                rows: 30,
                xtermAddonImporter: new TestXtermAddonImporter(),
                xtermColorProvider: { getBackgroundColor: () => new Color(new RGBA(255, 0, 0)) },
                capabilities: store.add(new TerminalCapabilityStore()),
                disableShellIntegrationReporting: true,
            }, undefined));
            strictEqual(xterm.raw.options.theme?.background, '#ff0000');
        });
        test('should react to and apply theme changes', () => {
            themeService.setTheme(new TestColorTheme({
                [TERMINAL_BACKGROUND_COLOR]: '#000100',
                [TERMINAL_FOREGROUND_COLOR]: '#000200',
                [TERMINAL_CURSOR_FOREGROUND_COLOR]: '#000300',
                [TERMINAL_CURSOR_BACKGROUND_COLOR]: '#000400',
                [TERMINAL_SELECTION_BACKGROUND_COLOR]: '#000500',
                [TERMINAL_INACTIVE_SELECTION_BACKGROUND_COLOR]: '#000600',
                [TERMINAL_SELECTION_FOREGROUND_COLOR]: undefined,
                'terminal.ansiBlack': '#010000',
                'terminal.ansiRed': '#020000',
                'terminal.ansiGreen': '#030000',
                'terminal.ansiYellow': '#040000',
                'terminal.ansiBlue': '#050000',
                'terminal.ansiMagenta': '#060000',
                'terminal.ansiCyan': '#070000',
                'terminal.ansiWhite': '#080000',
                'terminal.ansiBrightBlack': '#090000',
                'terminal.ansiBrightRed': '#100000',
                'terminal.ansiBrightGreen': '#110000',
                'terminal.ansiBrightYellow': '#120000',
                'terminal.ansiBrightBlue': '#130000',
                'terminal.ansiBrightMagenta': '#140000',
                'terminal.ansiBrightCyan': '#150000',
                'terminal.ansiBrightWhite': '#160000',
            }));
            xterm = store.add(instantiationService.createInstance(XtermTerminal, XTermBaseCtor, {
                cols: 80,
                rows: 30,
                xtermAddonImporter: new TestXtermAddonImporter(),
                xtermColorProvider: { getBackgroundColor: () => undefined },
                capabilities: store.add(new TerminalCapabilityStore()),
                disableShellIntegrationReporting: true
            }, undefined));
            deepStrictEqual(xterm.raw.options.theme, {
                background: undefined,
                foreground: '#000200',
                cursor: '#000300',
                cursorAccent: '#000400',
                selectionBackground: '#000500',
                selectionInactiveBackground: '#000600',
                selectionForeground: undefined,
                overviewRulerBorder: undefined,
                scrollbarSliderActiveBackground: undefined,
                scrollbarSliderBackground: undefined,
                scrollbarSliderHoverBackground: undefined,
                black: '#010000',
                green: '#030000',
                red: '#020000',
                yellow: '#040000',
                blue: '#050000',
                magenta: '#060000',
                cyan: '#070000',
                white: '#080000',
                brightBlack: '#090000',
                brightRed: '#100000',
                brightGreen: '#110000',
                brightYellow: '#120000',
                brightBlue: '#130000',
                brightMagenta: '#140000',
                brightCyan: '#150000',
                brightWhite: '#160000',
            });
            themeService.setTheme(new TestColorTheme({
                [TERMINAL_BACKGROUND_COLOR]: '#00010f',
                [TERMINAL_FOREGROUND_COLOR]: '#00020f',
                [TERMINAL_CURSOR_FOREGROUND_COLOR]: '#00030f',
                [TERMINAL_CURSOR_BACKGROUND_COLOR]: '#00040f',
                [TERMINAL_SELECTION_BACKGROUND_COLOR]: '#00050f',
                [TERMINAL_INACTIVE_SELECTION_BACKGROUND_COLOR]: '#00060f',
                [TERMINAL_SELECTION_FOREGROUND_COLOR]: '#00070f',
                'terminal.ansiBlack': '#01000f',
                'terminal.ansiRed': '#02000f',
                'terminal.ansiGreen': '#03000f',
                'terminal.ansiYellow': '#04000f',
                'terminal.ansiBlue': '#05000f',
                'terminal.ansiMagenta': '#06000f',
                'terminal.ansiCyan': '#07000f',
                'terminal.ansiWhite': '#08000f',
                'terminal.ansiBrightBlack': '#09000f',
                'terminal.ansiBrightRed': '#10000f',
                'terminal.ansiBrightGreen': '#11000f',
                'terminal.ansiBrightYellow': '#12000f',
                'terminal.ansiBrightBlue': '#13000f',
                'terminal.ansiBrightMagenta': '#14000f',
                'terminal.ansiBrightCyan': '#15000f',
                'terminal.ansiBrightWhite': '#16000f',
            }));
            deepStrictEqual(xterm.raw.options.theme, {
                background: undefined,
                foreground: '#00020f',
                cursor: '#00030f',
                cursorAccent: '#00040f',
                selectionBackground: '#00050f',
                selectionInactiveBackground: '#00060f',
                selectionForeground: '#00070f',
                overviewRulerBorder: undefined,
                scrollbarSliderActiveBackground: undefined,
                scrollbarSliderBackground: undefined,
                scrollbarSliderHoverBackground: undefined,
                black: '#01000f',
                green: '#03000f',
                red: '#02000f',
                yellow: '#04000f',
                blue: '#05000f',
                magenta: '#06000f',
                cyan: '#07000f',
                white: '#08000f',
                brightBlack: '#09000f',
                brightRed: '#10000f',
                brightGreen: '#11000f',
                brightYellow: '#12000f',
                brightBlue: '#13000f',
                brightMagenta: '#14000f',
                brightCyan: '#15000f',
                brightWhite: '#16000f',
            });
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoieHRlcm1UZXJtaW5hbC50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvYWR2aWthci9Eb2N1bWVudHMvYXJjaGl0ZWN0L2FyY2gyL0FyY2hJREUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVybWluYWwvdGVzdC9icm93c2VyL3h0ZXJtL3h0ZXJtVGVybWluYWwudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUloRyxPQUFPLEVBQUUsZUFBZSxFQUFFLFdBQVcsRUFBRSxNQUFNLFFBQVEsQ0FBQztBQUN0RCxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQztBQUNoRSxPQUFPLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ3JFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUNqRSxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUV0RyxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxrRkFBa0YsQ0FBQztBQUU1SCxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSxvRkFBb0YsQ0FBQztBQUM3SCxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0seURBQXlELENBQUM7QUFDeEYsT0FBTyxFQUFFLGNBQWMsRUFBb0IsTUFBTSxrRUFBa0UsQ0FBQztBQUNwSCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUV2RixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDeEUsT0FBTyxFQUEwQixnQkFBZ0IsRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBQ3ZGLE9BQU8sRUFBRSxjQUFjLEVBQUUseUJBQXlCLEVBQUUsZ0NBQWdDLEVBQUUsZ0NBQWdDLEVBQUUseUJBQXlCLEVBQUUsNENBQTRDLEVBQUUsbUNBQW1DLEVBQUUs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