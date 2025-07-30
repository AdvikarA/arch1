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
import { Separator, SubmenuAction } from '../../../../base/common/actions.js';
import * as dom from '../../../../base/browser/dom.js';
import { IContextMenuService, IContextViewService } from '../../../../platform/contextview/browser/contextView.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { getZoomFactor } from '../../../../base/browser/browser.js';
import { unmnemonicLabel } from '../../../../base/common/labels.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
import { createSingleCallFunction } from '../../../../base/common/functional.js';
import { popup } from '../../../../base/parts/contextmenu/electron-browser/contextmenu.js';
import { hasNativeContextMenu } from '../../../../platform/window/common/window.js';
import { isMacintosh, isWindows } from '../../../../base/common/platform.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { ContextMenuMenuDelegate, ContextMenuService as HTMLContextMenuService } from '../../../../platform/contextview/browser/contextMenuService.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { stripIcons } from '../../../../base/common/iconLabels.js';
import { coalesce } from '../../../../base/common/arrays.js';
import { Emitter } from '../../../../base/common/event.js';
import { isAnchor } from '../../../../base/browser/ui/contextview/contextview.js';
import { IMenuService } from '../../../../platform/actions/common/actions.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
let ContextMenuService = class ContextMenuService {
    get onDidShowContextMenu() { return this.impl.onDidShowContextMenu; }
    get onDidHideContextMenu() { return this.impl.onDidHideContextMenu; }
    constructor(notificationService, telemetryService, keybindingService, configurationService, contextViewService, menuService, contextKeyService) {
        function createContextMenuService(native) {
            return native ?
                new NativeContextMenuService(notificationService, telemetryService, keybindingService, menuService, contextKeyService)
                : new HTMLContextMenuService(telemetryService, notificationService, contextViewService, keybindingService, menuService, contextKeyService);
        }
        // set initial context menu service
        let isNativeContextMenu = hasNativeContextMenu(configurationService);
        this.impl = createContextMenuService(isNativeContextMenu);
        // MacOS does not need a restart when the menu style changes
        // It should update the context menu style on menu style configuration change
        if (isMacintosh) {
            this.listener = configurationService.onDidChangeConfiguration(e => {
                if (!e.affectsConfiguration("window.menuStyle" /* MenuSettings.MenuStyle */)) {
                    return;
                }
                const newIsNativeContextMenu = hasNativeContextMenu(configurationService);
                if (newIsNativeContextMenu === isNativeContextMenu) {
                    return;
                }
                this.impl.dispose();
                this.impl = createContextMenuService(newIsNativeContextMenu);
                isNativeContextMenu = newIsNativeContextMenu;
            });
        }
    }
    dispose() {
        this.listener?.dispose();
        this.impl.dispose();
    }
    showContextMenu(delegate) {
        this.impl.showContextMenu(delegate);
    }
};
ContextMenuService = __decorate([
    __param(0, INotificationService),
    __param(1, ITelemetryService),
    __param(2, IKeybindingService),
    __param(3, IConfigurationService),
    __param(4, IContextViewService),
    __param(5, IMenuService),
    __param(6, IContextKeyService)
], ContextMenuService);
export { ContextMenuService };
let NativeContextMenuService = class NativeContextMenuService extends Disposable {
    constructor(notificationService, telemetryService, keybindingService, menuService, contextKeyService) {
        super();
        this.notificationService = notificationService;
        this.telemetryService = telemetryService;
        this.keybindingService = keybindingService;
        this.menuService = menuService;
        this.contextKeyService = contextKeyService;
        this._onDidShowContextMenu = this._store.add(new Emitter());
        this.onDidShowContextMenu = this._onDidShowContextMenu.event;
        this._onDidHideContextMenu = this._store.add(new Emitter());
        this.onDidHideContextMenu = this._onDidHideContextMenu.event;
    }
    showContextMenu(delegate) {
        delegate = ContextMenuMenuDelegate.transform(delegate, this.menuService, this.contextKeyService);
        const actions = delegate.getActions();
        if (actions.length) {
            const onHide = createSingleCallFunction(() => {
                delegate.onHide?.(false);
                dom.ModifierKeyEmitter.getInstance().resetKeyStatus();
                this._onDidHideContextMenu.fire();
            });
            const menu = this.createMenu(delegate, actions, onHide);
            const anchor = delegate.getAnchor();
            let x;
            let y;
            let zoom = getZoomFactor(dom.isHTMLElement(anchor) ? dom.getWindow(anchor) : dom.getActiveWindow());
            if (dom.isHTMLElement(anchor)) {
                const elementPosition = dom.getDomNodePagePosition(anchor);
                // When drawing context menus, we adjust the pixel position for native menus using zoom level
                // In areas where zoom is applied to the element or its ancestors, we need to adjust accordingly
                // e.g. The title bar has counter zoom behavior meaning it applies the inverse of zoom level.
                // Window Zoom Level: 1.5, Title Bar Zoom: 1/1.5, Coordinate Multiplier: 1.5 * 1.0 / 1.5 = 1.0
                zoom *= dom.getDomNodeZoomLevel(anchor);
                // Position according to the axis alignment and the anchor alignment:
                // `HORIZONTAL` aligns at the top left or right of the anchor and
                //  `VERTICAL` aligns at the bottom left of the anchor.
                if (delegate.anchorAxisAlignment === 1 /* AnchorAxisAlignment.HORIZONTAL */) {
                    if (delegate.anchorAlignment === 0 /* AnchorAlignment.LEFT */) {
                        x = elementPosition.left;
                        y = elementPosition.top;
                    }
                    else {
                        x = elementPosition.left + elementPosition.width;
                        y = elementPosition.top;
                    }
                    if (!isMacintosh) {
                        const window = dom.getWindow(anchor);
                        const availableHeightForMenu = window.screen.height - y;
                        if (availableHeightForMenu < actions.length * (isWindows ? 45 : 32) /* guess of 1 menu item height */) {
                            // this is a guess to detect whether the context menu would
                            // open to the bottom from this point or to the top. If the
                            // menu opens to the top, make sure to align it to the bottom
                            // of the anchor and not to the top.
                            // this seems to be only necessary for Windows and Linux.
                            y += elementPosition.height;
                        }
                    }
                }
                else {
                    if (delegate.anchorAlignment === 0 /* AnchorAlignment.LEFT */) {
                        x = elementPosition.left;
                        y = elementPosition.top + elementPosition.height;
                    }
                    else {
                        x = elementPosition.left + elementPosition.width;
                        y = elementPosition.top + elementPosition.height;
                    }
                }
                // Shift macOS menus by a few pixels below elements
                // to account for extra padding on top of native menu
                // https://github.com/microsoft/vscode/issues/84231
                if (isMacintosh) {
                    y += 4 / zoom;
                }
            }
            else if (isAnchor(anchor)) {
                x = anchor.x;
                y = anchor.y;
            }
            else {
                // We leave x/y undefined in this case which will result in
                // Electron taking care of opening the menu at the cursor position.
            }
            if (typeof x === 'number') {
                x = Math.floor(x * zoom);
            }
            if (typeof y === 'number') {
                y = Math.floor(y * zoom);
            }
            popup(menu, { x, y, positioningItem: delegate.autoSelectFirstItem ? 0 : undefined, }, () => onHide());
            this._onDidShowContextMenu.fire();
        }
    }
    createMenu(delegate, entries, onHide, submenuIds = new Set()) {
        return coalesce(entries.map(entry => this.createMenuItem(delegate, entry, onHide, submenuIds)));
    }
    createMenuItem(delegate, entry, onHide, submenuIds) {
        // Separator
        if (entry instanceof Separator) {
            return { type: 'separator' };
        }
        // Submenu
        if (entry instanceof SubmenuAction) {
            if (submenuIds.has(entry.id)) {
                console.warn(`Found submenu cycle: ${entry.id}`);
                return undefined;
            }
            return {
                label: unmnemonicLabel(stripIcons(entry.label)).trim(),
                submenu: this.createMenu(delegate, entry.actions, onHide, new Set([...submenuIds, entry.id]))
            };
        }
        // Normal Menu Item
        else {
            let type = undefined;
            if (!!entry.checked) {
                if (typeof delegate.getCheckedActionsRepresentation === 'function') {
                    type = delegate.getCheckedActionsRepresentation(entry);
                }
                else {
                    type = 'checkbox';
                }
            }
            const item = {
                label: unmnemonicLabel(stripIcons(entry.label)).trim(),
                checked: !!entry.checked,
                type,
                enabled: !!entry.enabled,
                click: event => {
                    // To preserve pre-electron-2.x behaviour, we first trigger
                    // the onHide callback and then the action.
                    // Fixes https://github.com/microsoft/vscode/issues/45601
                    onHide();
                    // Run action which will close the menu
                    this.runAction(entry, delegate, event);
                }
            };
            const keybinding = !!delegate.getKeyBinding ? delegate.getKeyBinding(entry) : this.keybindingService.lookupKeybinding(entry.id);
            if (keybinding) {
                const electronAccelerator = keybinding.getElectronAccelerator();
                if (electronAccelerator) {
                    item.accelerator = electronAccelerator;
                }
                else {
                    const label = keybinding.getLabel();
                    if (label) {
                        item.label = `${item.label} [${label}]`;
                    }
                }
            }
            return item;
        }
    }
    async runAction(actionToRun, delegate, event) {
        if (!delegate.skipTelemetry) {
            this.telemetryService.publicLog2('workbenchActionExecuted', { id: actionToRun.id, from: 'contextMenu' });
        }
        const context = delegate.getActionsContext ? delegate.getActionsContext(event) : undefined;
        try {
            if (delegate.actionRunner) {
                await delegate.actionRunner.run(actionToRun, context);
            }
            else if (actionToRun.enabled) {
                await actionToRun.run(context);
            }
        }
        catch (error) {
            this.notificationService.error(error);
        }
    }
};
NativeContextMenuService = __decorate([
    __param(0, INotificationService),
    __param(1, ITelemetryService),
    __param(2, IKeybindingService),
    __param(3, IMenuService),
    __param(4, IContextKeyService)
], NativeContextMenuService);
registerSingleton(IContextMenuService, ContextMenuService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29udGV4dG1lbnVTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvYWR2aWthci9Eb2N1bWVudHMvYXJjaGl0ZWN0L2FyY2gyL0FyY2hJREUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL2NvbnRleHRtZW51L2VsZWN0cm9uLWJyb3dzZXIvY29udGV4dG1lbnVTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBZ0YsU0FBUyxFQUFFLGFBQWEsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQzVKLE9BQU8sS0FBSyxHQUFHLE1BQU0saUNBQWlDLENBQUM7QUFDdkQsT0FBTyxFQUE0QixtQkFBbUIsRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQzdJLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG9EQUFvRCxDQUFDO0FBQ3ZGLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQzFGLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUNwRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDcEUsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sMERBQTBELENBQUM7QUFFaEcsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFFakYsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLG9FQUFvRSxDQUFDO0FBQzNGLE9BQU8sRUFBRSxvQkFBb0IsRUFBZ0IsTUFBTSw4Q0FBOEMsQ0FBQztBQUNsRyxPQUFPLEVBQUUsV0FBVyxFQUFFLFNBQVMsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQzdFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ25HLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxrQkFBa0IsSUFBSSxzQkFB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