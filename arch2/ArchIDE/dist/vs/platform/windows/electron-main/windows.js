/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import electron from 'electron';
import { Color } from '../../../base/common/color.js';
import { join } from '../../../base/common/path.js';
import { isLinux, isMacintosh, isWindows } from '../../../base/common/platform.js';
import { IConfigurationService } from '../../configuration/common/configuration.js';
import { IEnvironmentMainService } from '../../environment/electron-main/environmentMainService.js';
import { createDecorator } from '../../instantiation/common/instantiation.js';
import { IProductService } from '../../product/common/productService.js';
import { IThemeMainService } from '../../theme/electron-main/themeMainService.js';
import { WindowMinimumSize, hasNativeTitlebar, useNativeFullScreen, useWindowControlsOverlay, zoomLevelToZoomFactor } from '../../window/common/window.js';
import { defaultWindowState } from '../../window/electron-main/window.js';
export const IWindowsMainService = createDecorator('windowsMainService');
export var OpenContext;
(function (OpenContext) {
    // opening when running from the command line
    OpenContext[OpenContext["CLI"] = 0] = "CLI";
    // macOS only: opening from the dock (also when opening files to a running instance from desktop)
    OpenContext[OpenContext["DOCK"] = 1] = "DOCK";
    // opening from the main application window
    OpenContext[OpenContext["MENU"] = 2] = "MENU";
    // opening from a file or folder dialog
    OpenContext[OpenContext["DIALOG"] = 3] = "DIALOG";
    // opening from the OS's UI
    OpenContext[OpenContext["DESKTOP"] = 4] = "DESKTOP";
    // opening through the API
    OpenContext[OpenContext["API"] = 5] = "API";
    // opening from a protocol link
    OpenContext[OpenContext["LINK"] = 6] = "LINK";
})(OpenContext || (OpenContext = {}));
export function defaultBrowserWindowOptions(accessor, windowState, overrides, webPreferences) {
    const themeMainService = accessor.get(IThemeMainService);
    const productService = accessor.get(IProductService);
    const configurationService = accessor.get(IConfigurationService);
    const environmentMainService = accessor.get(IEnvironmentMainService);
    const windowSettings = configurationService.getValue('window');
    const options = {
        backgroundColor: themeMainService.getBackgroundColor(),
        minWidth: WindowMinimumSize.WIDTH,
        minHeight: WindowMinimumSize.HEIGHT,
        title: productService.nameLong,
        show: windowState.mode !== 0 /* WindowMode.Maximized */ && windowState.mode !== 3 /* WindowMode.Fullscreen */, // reduce flicker by showing later
        x: windowState.x,
        y: windowState.y,
        width: windowState.width,
        height: windowState.height,
        webPreferences: {
            ...webPreferences,
            enableWebSQL: false,
            spellcheck: false,
            zoomFactor: zoomLevelToZoomFactor(windowState.zoomLevel ?? windowSettings?.zoomLevel),
            autoplayPolicy: 'user-gesture-required',
            // Enable experimental css highlight api https://chromestatus.com/feature/5436441440026624
            // Refs https://github.com/microsoft/vscode/issues/140098
            enableBlinkFeatures: 'HighlightAPI',
            sandbox: true,
            // TODO(deepak1556): Should be removed once migration is complete
            // https://github.com/microsoft/vscode/issues/239228
            enableDeprecatedPaste: true,
        },
        experimentalDarkMode: true
    };
    if (isWindows) {
        const borderSetting = windowSettings?.border || 'default';
        if (borderSetting !== 'default') {
            if (borderSetting === 'off') {
                options.accentColor = false;
            }
            else if (typeof borderSetting === 'string') {
                options.accentColor = borderSetting;
            }
        }
    }
    if (isLinux) {
        options.icon = join(environmentMainService.appRoot, 'resources/linux/code.png'); // always on Linux
    }
    else if (isWindows && !environmentMainService.isBuilt) {
        options.icon = join(environmentMainService.appRoot, 'resources/win32/code_150x150.png'); // only when running out of sources on Windows
    }
    if (isMacintosh) {
        options.acceptFirstMouse = true; // enabled by default
        if (windowSettings?.clickThroughInactive === false) {
            options.acceptFirstMouse = false;
        }
    }
    if (overrides?.disableFullscreen) {
        options.fullscreen = false;
    }
    else if (isMacintosh && !useNativeFullScreen(configurationService)) {
        options.fullscreenable = false; // enables simple fullscreen mode
    }
    const useNativeTabs = isMacintosh && windowSettings?.nativeTabs === true;
    if (useNativeTabs) {
        options.tabbingIdentifier = productService.nameShort; // this opts in to sierra tabs
    }
    const hideNativeTitleBar = !hasNativeTitlebar(configurationService, overrides?.forceNativeTitlebar ? "native" /* TitlebarStyle.NATIVE */ : undefined);
    if (hideNativeTitleBar) {
        options.titleBarStyle = 'hidden';
        if (!isMacintosh) {
            options.frame = false;
        }
        if (useWindowControlsOverlay(configurationService)) {
            if (isMacintosh) {
                options.titleBarOverlay = true;
            }
            else {
                // This logic will not perfectly guess the right colors
                // to use on initialization, but prefer to keep things
                // simple as it is temporary and not noticeable
                const titleBarColor = themeMainService.getWindowSplash(undefined)?.colorInfo.titleBarBackground ?? themeMainService.getBackgroundColor();
                const symbolColor = Color.fromHex(titleBarColor).isDarker() ? '#FFFFFF' : '#000000';
                options.titleBarOverlay = {
                    height: 29, // the smallest size of the title bar on windows accounting for the border on windows 11
                    color: titleBarColor,
                    symbolColor
                };
            }
        }
    }
    if (overrides?.alwaysOnTop) {
        options.alwaysOnTop = true;
    }
    return options;
}
export function getLastFocused(windows) {
    let lastFocusedWindow = undefined;
    let maxLastFocusTime = Number.MIN_VALUE;
    for (const window of windows) {
        if (window.lastFocusTime > maxLastFocusTime) {
            maxLastFocusTime = window.lastFocusTime;
            lastFocusedWindow = window;
        }
    }
    return lastFocusedWindow;
}
export var WindowStateValidator;
(function (WindowStateValidator) {
    function validateWindowState(logService, state, displays = electron.screen.getAllDisplays()) {
        logService.trace(`window#validateWindowState: validating window state on ${displays.length} display(s)`, state);
        if (typeof state.x !== 'number' ||
            typeof state.y !== 'number' ||
            typeof state.width !== 'number' ||
            typeof state.height !== 'number') {
            logService.trace('window#validateWindowState: unexpected type of state values');
            return undefined;
        }
        if (state.width <= 0 || state.height <= 0) {
            logService.trace('window#validateWindowState: unexpected negative values');
            return undefined;
        }
        // Single Monitor: be strict about x/y positioning
        // macOS & Linux: these OS seem to be pretty good in ensuring that a window is never outside of it's bounds.
        // Windows: it is possible to have a window with a size that makes it fall out of the window. our strategy
        //          is to try as much as possible to keep the window in the monitor bounds. we are not as strict as
        //          macOS and Linux and allow the window to exceed the monitor bounds as long as the window is still
        //          some pixels (128) visible on the screen for the user to drag it back.
        if (displays.length === 1) {
            const displayWorkingArea = getWorkingArea(displays[0]);
            logService.trace('window#validateWindowState: single monitor working area', displayWorkingArea);
            if (displayWorkingArea) {
                function ensureStateInDisplayWorkingArea() {
                    if (!state || typeof state.x !== 'number' || typeof state.y !== 'number' || !displayWorkingArea) {
                        return;
                    }
                    if (state.x < displayWorkingArea.x) {
                        // prevent window from falling out of the screen to the left
                        state.x = displayWorkingArea.x;
                    }
                    if (state.y < displayWorkingArea.y) {
                        // prevent window from falling out of the screen to the top
                        state.y = displayWorkingArea.y;
                    }
                }
                // ensure state is not outside display working area (top, left)
                ensureStateInDisplayWorkingArea();
                if (state.width > displayWorkingArea.width) {
                    // prevent window from exceeding display bounds width
                    state.width = displayWorkingArea.width;
                }
                if (state.height > displayWorkingArea.height) {
                    // prevent window from exceeding display bounds height
                    state.height = displayWorkingArea.height;
                }
                if (state.x > (displayWorkingArea.x + displayWorkingArea.width - 128)) {
                    // prevent window from falling out of the screen to the right with
                    // 128px margin by positioning the window to the far right edge of
                    // the screen
                    state.x = displayWorkingArea.x + displayWorkingArea.width - state.width;
                }
                if (state.y > (displayWorkingArea.y + displayWorkingArea.height - 128)) {
                    // prevent window from falling out of the screen to the bottom with
                    // 128px margin by positioning the window to the far bottom edge of
                    // the screen
                    state.y = displayWorkingArea.y + displayWorkingArea.height - state.height;
                }
                // again ensure state is not outside display working area
                // (it may have changed from the previous validation step)
                ensureStateInDisplayWorkingArea();
            }
            return state;
        }
        // Multi Montior (fullscreen): try to find the previously used display
        if (state.display && state.mode === 3 /* WindowMode.Fullscreen */) {
            const display = displays.find(d => d.id === state.display);
            if (display && typeof display.bounds?.x === 'number' && typeof display.bounds?.y === 'number') {
                logService.trace('window#validateWindowState: restoring fullscreen to previous display');
                const defaults = defaultWindowState(3 /* WindowMode.Fullscreen */); // make sure we have good values when the user restores the window
                defaults.x = display.bounds.x; // carefull to use displays x/y position so that the window ends up on the correct monitor
                defaults.y = display.bounds.y;
                return defaults;
            }
        }
        // Multi Monitor (non-fullscreen): ensure window is within display bounds
        let display;
        let displayWorkingArea;
        try {
            display = electron.screen.getDisplayMatching({ x: state.x, y: state.y, width: state.width, height: state.height });
            displayWorkingArea = getWorkingArea(display);
            logService.trace('window#validateWindowState: multi-monitor working area', displayWorkingArea);
        }
        catch (error) {
            // Electron has weird conditions under which it throws errors
            // e.g. https://github.com/microsoft/vscode/issues/100334 when
            // large numbers are passed in
            logService.error('window#validateWindowState: error finding display for window state', error);
        }
        if (display && validateWindowStateOnDisplay(state, display)) {
            return state;
        }
        logService.trace('window#validateWindowState: state is outside of the multi-monitor working area');
        return undefined;
    }
    WindowStateValidator.validateWindowState = validateWindowState;
    function validateWindowStateOnDisplay(state, display) {
        if (typeof state.x !== 'number' ||
            typeof state.y !== 'number' ||
            typeof state.width !== 'number' ||
            typeof state.height !== 'number' ||
            state.width <= 0 || state.height <= 0) {
            return false;
        }
        const displayWorkingArea = getWorkingArea(display);
        return Boolean(displayWorkingArea && // we have valid working area bounds
            state.x + state.width > displayWorkingArea.x && // prevent window from falling out of the screen to the left
            state.y + state.height > displayWorkingArea.y && // prevent window from falling out of the screen to the top
            state.x < displayWorkingArea.x + displayWorkingArea.width && // prevent window from falling out of the screen to the right
            state.y < displayWorkingArea.y + displayWorkingArea.height // prevent window from falling out of the screen to the bottom
        );
    }
    WindowStateValidator.validateWindowStateOnDisplay = validateWindowStateOnDisplay;
    function getWorkingArea(display) {
        // Prefer the working area of the display to account for taskbars on the
        // desktop being positioned somewhere (https://github.com/microsoft/vscode/issues/50830).
        //
        // Linux X11 sessions sometimes report wrong display bounds, so we validate
        // the reported sizes are positive.
        if (display.workArea.width > 0 && display.workArea.height > 0) {
            return display.workArea;
        }
        if (display.bounds.width > 0 && display.bounds.height > 0) {
            return display.bounds;
        }
        return undefined;
    }
})(WindowStateValidator || (WindowStateValidator = {}));
/**
 * We have some components like `NativeWebContentExtractorService` that create offscreen windows
 * to extract content from web pages. These windows are not visible to the user and are not
 * considered part of the main application window. This function filters out those offscreen
 * windows from the list of all windows.
 * @returns An array of all BrowserWindow instances that are not offscreen.
 */
export function getAllWindowsExcludingOffscreen() {
    return electron.BrowserWindow.getAllWindows().filter(win => !win.webContents.isOffscreen());
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2luZG93cy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL2FkdmlrYXIvRG9jdW1lbnRzL2FyY2hpdGVjdC9hcmNoMi9BcmNoSURFL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3dpbmRvd3MvZWxlY3Ryb24tbWFpbi93aW5kb3dzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sUUFBZ0MsTUFBTSxVQUFVLENBQUM7QUFDeEQsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBRXRELE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUNwRCxPQUFPLEVBQXVCLE9BQU8sRUFBRSxXQUFXLEVBQUUsU0FBUyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFHeEcsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFFcEYsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sMkRBQTJELENBQUM7QUFDcEcsT0FBTyxFQUFvQixlQUFlLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUVoRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDekUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sK0NBQStDLENBQUM7QUFDbEYsT0FBTyxFQUE0RSxpQkFBaUIsRUFBRSxpQkFBaUIsRUFBRSxtQkFBbUIsRUFBRSx3QkFBd0IsRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQ3JPLE9BQU8sRUFBeUMsa0JBQWtCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUVqSCxNQUFNLENBQUMsTUFBTSxtQkFBbUIsR0FBRyxlQUFlLENBQXNCLG9CQUFvQixDQUFDLENBQUM7QUF5QzlGLE1BQU0sQ0FBTixJQUFrQixXQXNCakI7QUF0QkQsV0FBa0IsV0FBVztJQUU1Qiw2Q0FBNkM7SUFDN0MsMkNBQUcsQ0FBQTtJQUVILGlHQUFpRztJ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