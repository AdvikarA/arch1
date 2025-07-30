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
var ThemeMainService_1;
import electron from 'electron';
import { Emitter, Event } from '../../../base/common/event.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { isLinux, isMacintosh, isWindows } from '../../../base/common/platform.js';
import { IConfigurationService } from '../../configuration/common/configuration.js';
import { IStateService } from '../../state/node/state.js';
import { ThemeTypeSelector } from '../common/theme.js';
import { coalesce } from '../../../base/common/arrays.js';
import { getAllWindowsExcludingOffscreen } from '../../windows/electron-main/windows.js';
import { ILogService } from '../../log/common/log.js';
// These default colors match our default themes
// editor background color ("Dark Modern", etc...)
const DEFAULT_BG_LIGHT = '#FFFFFF';
const DEFAULT_BG_DARK = '#1F1F1F';
const DEFAULT_BG_HC_BLACK = '#000000';
const DEFAULT_BG_HC_LIGHT = '#FFFFFF';
const THEME_STORAGE_KEY = 'theme';
const THEME_BG_STORAGE_KEY = 'themeBackground';
const THEME_WINDOW_SPLASH_KEY = 'windowSplash';
const THEME_WINDOW_SPLASH_OVERRIDE_KEY = 'windowSplashWorkspaceOverride';
const AUXILIARYBAR_DEFAULT_VISIBILITY = 'workbench.secondarySideBar.defaultVisibility';
var ThemeSettings;
(function (ThemeSettings) {
    ThemeSettings.DETECT_COLOR_SCHEME = 'window.autoDetectColorScheme';
    ThemeSettings.DETECT_HC = 'window.autoDetectHighContrast';
    ThemeSettings.SYSTEM_COLOR_THEME = 'window.systemColorTheme';
})(ThemeSettings || (ThemeSettings = {}));
let ThemeMainService = class ThemeMainService extends Disposable {
    static { ThemeMainService_1 = this; }
    static { this.DEFAULT_BAR_WIDTH = 300; }
    static { this.WORKSPACE_OVERRIDE_LIMIT = 50; }
    constructor(stateService, configurationService, logService) {
        super();
        this.stateService = stateService;
        this.configurationService = configurationService;
        this.logService = logService;
        this._onDidChangeColorScheme = this._register(new Emitter());
        this.onDidChangeColorScheme = this._onDidChangeColorScheme.event;
        // System Theme
        if (!isLinux) {
            this._register(this.configurationService.onDidChangeConfiguration(e => {
                if (e.affectsConfiguration(ThemeSettings.SYSTEM_COLOR_THEME) || e.affectsConfiguration(ThemeSettings.DETECT_COLOR_SCHEME)) {
                    this.updateSystemColorTheme();
                }
            }));
        }
        this.updateSystemColorTheme();
        // Color Scheme changes
        this._register(Event.fromNodeEventEmitter(electron.nativeTheme, 'updated')(() => this._onDidChangeColorScheme.fire(this.getColorScheme())));
    }
    updateSystemColorTheme() {
        if (isLinux || this.configurationService.getValue(ThemeSettings.DETECT_COLOR_SCHEME)) {
            electron.nativeTheme.themeSource = 'system'; // only with `system` we can detect the system color scheme
        }
        else {
            switch (this.configurationService.getValue(ThemeSettings.SYSTEM_COLOR_THEME)) {
                case 'dark':
                    electron.nativeTheme.themeSource = 'dark';
                    break;
                case 'light':
                    electron.nativeTheme.themeSource = 'light';
                    break;
                case 'auto':
                    switch (this.getPreferredBaseTheme() ?? this.getStoredBaseTheme()) {
                        case ThemeTypeSelector.VS:
                            electron.nativeTheme.themeSource = 'light';
                            break;
                        case ThemeTypeSelector.VS_DARK:
                            electron.nativeTheme.themeSource = 'dark';
                            break;
                        default: electron.nativeTheme.themeSource = 'system';
                    }
                    break;
                default:
                    electron.nativeTheme.themeSource = 'system';
                    break;
            }
        }
    }
    getColorScheme() {
        // high contrast is reflected by the shouldUseInvertedColorScheme property
        if (isWindows) {
            if (electron.nativeTheme.shouldUseHighContrastColors) {
                // shouldUseInvertedColorScheme is dark, !shouldUseInvertedColorScheme is light
                return { dark: electron.nativeTheme.shouldUseInvertedColorScheme, highContrast: true };
            }
        }
        // high contrast is set if one of shouldUseInvertedColorScheme or shouldUseHighContrastColors is set,
        // reflecting the 'Invert colours' and `Increase contrast` settings in MacOS
        else if (isMacintosh) {
            if (electron.nativeTheme.shouldUseInvertedColorScheme || electron.nativeTheme.shouldUseHighContrastColors) {
                return { dark: electron.nativeTheme.shouldUseDarkColors, highContrast: true };
            }
        }
        // ubuntu gnome seems to have 3 states, light dark and high contrast
        else if (isLinux) {
            if (electron.nativeTheme.shouldUseHighContrastColors) {
                return { dark: true, highContrast: true };
            }
        }
        return {
            dark: electron.nativeTheme.shouldUseDarkColors,
            highContrast: false
        };
    }
    getPreferredBaseTheme() {
        const colorScheme = this.getColorScheme();
        if (this.configurationService.getValue(ThemeSettings.DETECT_HC) && colorScheme.highContrast) {
            return colorScheme.dark ? ThemeTypeSelector.HC_BLACK : ThemeTypeSelector.HC_LIGHT;
        }
        if (this.configurationService.getValue(ThemeSettings.DETECT_COLOR_SCHEME)) {
            return colorScheme.dark ? ThemeTypeSelector.VS_DARK : ThemeTypeSelector.VS;
        }
        return undefined;
    }
    getBackgroundColor() {
        const preferred = this.getPreferredBaseTheme();
        const stored = this.getStoredBaseTheme();
        // If the stored theme has the same base as the preferred, we can return the stored background
        if (preferred === undefined || preferred === stored) {
            const storedBackground = this.stateService.getItem(THEME_BG_STORAGE_KEY, null);
            if (storedBackground) {
                return storedBackground;
            }
        }
        // Otherwise we return the default background for the preferred base theme. If there's no preferred, use the stored one.
        switch (preferred ?? stored) {
            case ThemeTypeSelector.VS: return DEFAULT_BG_LIGHT;
            case ThemeTypeSelector.HC_BLACK: return DEFAULT_BG_HC_BLACK;
            case ThemeTypeSelector.HC_LIGHT: return DEFAULT_BG_HC_LIGHT;
            default: return DEFAULT_BG_DARK;
        }
    }
    getStoredBaseTheme() {
        const baseTheme = this.stateService.getItem(THEME_STORAGE_KEY, ThemeTypeSelector.VS_DARK).split(' ')[0];
        switch (baseTheme) {
            case ThemeTypeSelector.VS: return ThemeTypeSelector.VS;
            case ThemeTypeSelector.HC_BLACK: return ThemeTypeSelector.HC_BLACK;
            case ThemeTypeSelector.HC_LIGHT: return ThemeTypeSelector.HC_LIGHT;
            default: return ThemeTypeSelector.VS_DARK;
        }
    }
    saveWindowSplash(windowId, workspace, splash) {
        // Update override as needed
        const splashOverride = this.updateWindowSplashOverride(workspace, splash);
        // Update in storage
        this.stateService.setItems(coalesce([
            { key: THEME_STORAGE_KEY, data: splash.baseTheme },
            { key: THEME_BG_STORAGE_KEY, data: splash.colorInfo.background },
            { key: THEME_WINDOW_SPLASH_KEY, data: splash },
            splashOverride ? { key: THEME_WINDOW_SPLASH_OVERRIDE_KEY, data: splashOverride } : undefined
        ]));
        // Update in opened windows
        if (typeof windowId === 'number') {
            this.updateBackgroundColor(windowId, splash);
        }
        // Update system theme
        this.updateSystemColorTheme();
    }
    updateWindowSplashOverride(workspace, splash) {
        let splashOverride = undefined;
        let changed = false;
        if (workspace) {
            splashOverride = { ...this.getWindowSplashOverride() }; // make a copy for modifications
            changed = this.doUpdateWindowSplashOverride(workspace, splash, splashOverride, 'sideBar');
            changed = this.doUpdateWindowSplashOverride(workspace, splash, splashOverride, 'auxiliaryBar') || changed;
        }
        return changed ? splashOverride : undefined;
    }
    doUpdateWindowSplashOverride(workspace, splash, splashOverride, part) {
        const currentWidth = part === 'sideBar' ? splash.layoutInfo?.sideBarWidth : splash.layoutInfo?.auxiliaryBarWidth;
        const overrideWidth = part === 'sideBar' ? splashOverride.layoutInfo.sideBarWidth : splashOverride.layoutInfo.auxiliaryBarWidth;
        // No layout info: remove override
        let changed = false;
        if (typeof currentWidth !== 'number') {
            if (splashOverride.layoutInfo.workspaces[workspace.id]) {
                delete splashOverride.layoutInfo.workspaces[workspace.id];
                changed = true;
            }
            return changed;
        }
        let workspaceOverride = splashOverride.layoutInfo.workspaces[workspace.id];
        if (!workspaceOverride) {
            const workspaceEntries = Object.keys(splashOverride.layoutInfo.workspaces);
            if (workspaceEntries.length >= ThemeMainService_1.WORKSPACE_OVERRIDE_LIMIT) {
                delete splashOverride.layoutInfo.workspaces[workspaceEntries[0]];
                changed = true;
            }
            workspaceOverride = { sideBarVisible: false, auxiliaryBarVisible: false };
            splashOverride.layoutInfo.workspaces[workspace.id] = workspaceOverride;
            changed = true;
        }
        // Part has width: update width & visibility override
        if (currentWidth > 0) {
            if (overrideWidth !== currentWidth) {
                splashOverride.layoutInfo[part === 'sideBar' ? 'sideBarWidth' : 'auxiliaryBarWidth'] = currentWidth;
                changed = true;
            }
            switch (part) {
                case 'sideBar':
                    if (!workspaceOverride.sideBarVisible) {
                        workspaceOverride.sideBarVisible = true;
                        changed = true;
                    }
                    break;
                case 'auxiliaryBar':
                    if (!workspaceOverride.auxiliaryBarVisible) {
                        workspaceOverride.auxiliaryBarVisible = true;
                        changed = true;
                    }
                    break;
            }
        }
        // Part is hidden: update visibility override
        else {
            switch (part) {
                case 'sideBar':
                    if (workspaceOverride.sideBarVisible) {
                        workspaceOverride.sideBarVisible = false;
                        changed = true;
                    }
                    break;
                case 'auxiliaryBar':
                    if (workspaceOverride.auxiliaryBarVisible) {
                        workspaceOverride.auxiliaryBarVisible = false;
                        changed = true;
                    }
                    break;
            }
        }
        return changed;
    }
    updateBackgroundColor(windowId, splash) {
        for (const window of getAllWindowsExcludingOffscreen()) {
            if (window.id === windowId) {
                window.setBackgroundColor(splash.colorInfo.background);
                break;
            }
        }
    }
    getWindowSplash(workspace) {
        try {
            return this.doGetWindowSplash(workspace);
        }
        catch (error) {
            this.logService.error('[theme main service] Failed to get window splash', error);
            return undefined;
        }
    }
    doGetWindowSplash(workspace) {
        const partSplash = this.stateService.getItem(THEME_WINDOW_SPLASH_KEY);
        if (!partSplash?.layoutInfo) {
            return partSplash; // return early: overrides currently only apply to layout info
        }
        const override = this.getWindowSplashOverride();
        // Figure out side bar width based on workspace and overrides
        let sideBarWidth;
        if (workspace) {
            if (override.layoutInfo.workspaces[workspace.id]?.sideBarVisible === false) {
                sideBarWidth = 0;
            }
            else {
                sideBarWidth = override.layoutInfo.sideBarWidth || partSplash.layoutInfo.sideBarWidth || ThemeMainService_1.DEFAULT_BAR_WIDTH;
            }
        }
        else {
            sideBarWidth = 0;
        }
        // Figure out auxiliary bar width based on workspace, configuration and overrides
        const auxiliaryBarDefaultVisibility = this.configurationService.getValue(AUXILIARYBAR_DEFAULT_VISIBILITY);
        let auxiliaryBarWidth;
        if (workspace) {
            const auxiliaryBarVisible = override.layoutInfo.workspaces[workspace.id]?.auxiliaryBarVisible;
            if (auxiliaryBarVisible === true) {
                auxiliaryBarWidth = override.layoutInfo.auxiliaryBarWidth || partSplash.layoutInfo.auxiliaryBarWidth || ThemeMainService_1.DEFAULT_BAR_WIDTH;
            }
            else if (auxiliaryBarVisible === false) {
                auxiliaryBarWidth = 0;
            }
            else {
                if (auxiliaryBarDefaultVisibility === 'visible' || auxiliaryBarDefaultVisibility === 'visibleInWorkspace') {
                    auxiliaryBarWidth = override.layoutInfo.auxiliaryBarWidth || partSplash.layoutInfo.auxiliaryBarWidth || ThemeMainService_1.DEFAULT_BAR_WIDTH;
                }
                else if (auxiliaryBarDefaultVisibility === 'maximized' || auxiliaryBarDefaultVisibility === 'maximizedInWorkspace') {
                    auxiliaryBarWidth = Number.MAX_SAFE_INTEGER; // marker for a maximised auxiliary bar
                }
                else {
                    auxiliaryBarWidth = 0;
                }
            }
        }
        else {
            auxiliaryBarWidth = 0; // technically not true if configured 'visible', but we never store splash per empty window, so we decide on a default here
        }
        return {
            ...partSplash,
            layoutInfo: {
                ...partSplash.layoutInfo,
                sideBarWidth,
                auxiliaryBarWidth
            }
        };
    }
    getWindowSplashOverride() {
        let override = this.stateService.getItem(THEME_WINDOW_SPLASH_OVERRIDE_KEY);
        if (!override?.layoutInfo) {
            override = {
                layoutInfo: {
                    sideBarWidth: ThemeMainService_1.DEFAULT_BAR_WIDTH,
                    auxiliaryBarWidth: ThemeMainService_1.DEFAULT_BAR_WIDTH,
                    workspaces: {}
                }
            };
        }
        if (!override.layoutInfo.sideBarWidth) {
            override.layoutInfo.sideBarWidth = ThemeMainService_1.DEFAULT_BAR_WIDTH;
        }
        if (!override.layoutInfo.auxiliaryBarWidth) {
            override.layoutInfo.auxiliaryBarWidth = ThemeMainService_1.DEFAULT_BAR_WIDTH;
        }
        if (!override.layoutInfo.workspaces) {
            override.layoutInfo.workspaces = {};
        }
        return override;
    }
};
ThemeMainService = ThemeMainService_1 = __decorate([
    __param(0, IStateService),
    __param(1, IConfigurationService),
    __param(2, ILogService)
], ThemeMainService);
export { ThemeMainService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGhlbWVNYWluU2VydmljZUltcGwuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9hZHZpa2FyL0RvY3VtZW50cy9hcmNoaXRlY3QvYXJjaDIvQXJjaElERS9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS90aGVtZS9lbGVjdHJvbi1tYWluL3RoZW1lTWFpblNlcnZpY2VJbXBsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLFFBQVEsTUFBTSxVQUFVLENBQUM7QUFDaEMsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUMvRCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDL0QsT0FBTyxFQUFFLE9BQU8sRUFBRSxXQUFXLEVBQUUsU0FBUyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDbkYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFDcEYsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDJCQUEyQixDQUFDO0FBRzFELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBRXZELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUMxRCxPQUFPLEVBQUUsK0JBQStCLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUN6RixPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0seUJBQXlCLENBQUM7QUFHdEQsZ0RBQWdEO0FBQ2hELGtEQUFrRDtBQUNsRCxNQUFNLGdCQUFnQixHQUFHLFNBQVMsQ0FBQztBQUNuQyxNQUFNLGVBQWUsR0FBRyxTQUFTLENBQUM7QUFDbEMsTUFBTSxtQkFBbUIsR0FBRyxTQUFTLENBQUM7QUFDdEMsTUFBTSxtQkFBbUIsR0FBRyxTQUFTLENBQUM7QUFFdEMsTUFBTSxpQkFBaUIsR0FBRyxPQUFPLENBQUM7QUFDbEMsTUFBTSxvQkFBb0Is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