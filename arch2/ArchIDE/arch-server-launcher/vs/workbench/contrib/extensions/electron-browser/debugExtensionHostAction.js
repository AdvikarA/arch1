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
import { Codicon } from '../../../../base/common/codicons.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { randomPort } from '../../../../base/common/ports.js';
import * as nls from '../../../../nls.js';
import { Categories } from '../../../../platform/action/common/actionCommonCategories.js';
import { Action2, MenuId } from '../../../../platform/actions/common/actions.js';
import { IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { INativeHostService } from '../../../../platform/native/common/native.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { IProgressService } from '../../../../platform/progress/common/progress.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { ActiveEditorContext } from '../../../common/contextkeys.js';
import { IExtensionService } from '../../../services/extensions/common/extensions.js';
import { IHostService } from '../../../services/host/browser/host.js';
import { IDebugService } from '../../debug/common/debug.js';
import { RuntimeExtensionsEditor } from './runtimeExtensionsEditor.js';
import { IQuickInputService } from '../../../../platform/quickinput/common/quickInput.js';
import { IsDevelopmentContext } from '../../../../platform/contextkey/common/contextkeys.js';
export class DevtoolsExtensionHostAction extends Action2 {
    constructor() {
        super({
            id: 'workbench.extensions.action.devtoolsExtensionHost',
            title: nls.localize2('openDevToolsForExtensionHost', 'Open Developer Tools for Extension Host'),
            category: Categories.Developer,
            precondition: IsDevelopmentContext,
            f1: true,
        });
    }
    async run(accessor) {
        const extensionService = accessor.get(IExtensionService);
        const nativeHostService = accessor.get(INativeHostService);
        const quickInputService = accessor.get(IQuickInputService);
        const inspectPorts = await extensionService.getInspectPorts(1 /* ExtensionHostKind.LocalProcess */, true);
        if (inspectPorts.length === 0) {
            console.log('[devtoolsExtensionHost] No extension host inspect ports found.');
            return;
        }
        const items = inspectPorts.filter(portInfo => portInfo.devtoolsUrl).map(portInfo => ({
            label: portInfo.devtoolsLabel ?? `${portInfo.host}:${portInfo.port}`,
            detail: `${portInfo.host}:${portInfo.port}`,
            portInfo: portInfo
        }));
        if (items.length === 1) {
            const portInfo = items[0].portInfo;
            nativeHostService.openDevToolsWindow(portInfo.devtoolsUrl);
            return;
        }
        const selected = await quickInputService.pick(items, {
            placeHolder: nls.localize('selectExtensionHost', "Pick extension host"),
            matchOnDetail: true,
        });
        if (selected) {
            const portInfo = selected.portInfo;
            nativeHostService.openDevToolsWindow(portInfo.devtoolsUrl);
        }
    }
}
export class DebugExtensionHostAction extends Action2 {
    constructor() {
        super({
            id: 'workbench.extensions.action.debugExtensionHost',
            title: { value: nls.localize('debugExtensionHost', "Start Debugging Extension Host In New Window"), original: 'Start Debugging Extension Host In New Window' },
            category: Categories.Developer,
            f1: true,
            icon: Codicon.debugStart,
            menu: {
                id: MenuId.EditorTitle,
                when: ActiveEditorContext.isEqualTo(RuntimeExtensionsEditor.ID),
                group: 'navigation',
            }
        });
    }
    run(accessor) {
        const nativeHostService = accessor.get(INativeHostService);
        const dialogService = accessor.get(IDialogService);
        const extensionService = accessor.get(IExtensionService);
        const productService = accessor.get(IProductService);
        const instantiationService = accessor.get(IInstantiationService);
        const hostService = accessor.get(IHostService);
        extensionService.getInspectPorts(1 /* ExtensionHostKind.LocalProcess */, false).then(async (inspectPorts) => {
            if (inspectPorts.length === 0) {
                const res = await dialogService.confirm({
                    message: nls.localize('restart1', "Debug Extensions"),
                    detail: nls.localize('restart2', "In order to debug extensions a restart is required. Do you want to restart '{0}' now?", productService.nameLong),
                    primaryButton: nls.localize({ key: 'restart3', comment: ['&& denotes a mnemonic'] }, "&&Restart")
                });
                if (res.confirmed) {
                    await nativeHostService.relaunch({ addArgs: [`--inspect-extensions=${randomPort()}`] });
                }
                return;
            }
            if (inspectPorts.length > 1) {
                // TODO
                console.warn(`There are multiple extension hosts available for debugging. Picking the first one...`);
            }
            const s = instantiationService.createInstance(Storage);
            s.storeDebugOnNewWindow(inspectPorts[0].port);
            hostService.openWindow();
        });
    }
}
let Storage = class Storage {
    constructor(_storageService) {
        this._storageService = _storageService;
    }
    storeDebugOnNewWindow(targetPort) {
        this._storageService.store('debugExtensionHost.debugPort', targetPort, -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
    }
    getAndDeleteDebugPortIfSet() {
        const port = this._storageService.getNumber('debugExtensionHost.debugPort', -1 /* StorageScope.APPLICATION */);
        if (port !== undefined) {
            this._storageService.remove('debugExtensionHost.debugPort', -1 /* StorageScope.APPLICATION */);
        }
        return port;
    }
};
Storage = __decorate([
    __param(0, IStorageService)
], Storage);
let DebugExtensionsContribution = class DebugExtensionsContribution extends Disposable {
    constructor(_debugService, _instantiationService, _progressService) {
        super();
        this._debugService = _debugService;
        this._instantiationService = _instantiationService;
        const storage = this._instantiationService.createInstance(Storage);
        const port = storage.getAndDeleteDebugPortIfSet();
        if (port !== undefined) {
            _progressService.withProgress({
                location: 15 /* ProgressLocation.Notification */,
                title: nls.localize('debugExtensionHost.progress', "Attaching Debugger To Extension Host"),
            }, async (p) => {
                // eslint-disable-next-line local/code-no-dangerous-type-assertions
                await this._debugService.startDebugging(undefined, {
                    type: 'node',
                    name: nls.localize('debugExtensionHost.launch.name', "Attach Extension Host"),
                    request: 'attach',
                    port,
                    trace: true,
                    // resolve source maps everywhere:
                    resolveSourceMapLocations: null,
                    // announces sources eagerly for the loaded scripts view:
                    eagerSources: true,
                    // source maps of published VS Code are on the CDN and can take a while to load
                    timeouts: {
                        sourceMapMinPause: 30_000,
                        sourceMapCumulativePause: 300_000,
                    },
                });
            });
        }
    }
};
DebugExtensionsContribution = __decorate([
    __param(0, IDebugService),
    __param(1, IInstantiationService),
    __param(2, IProgressService)
], DebugExtensionsContribution);
export { DebugExtensionsContribution };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVidWdFeHRlbnNpb25Ib3N0QWN0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvYWR2aWthci9Eb2N1bWVudHMvYXJjaGl0ZWN0L2FyY2gyL0FyY2hJREUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvZXh0ZW5zaW9ucy9lbGVjdHJvbi1icm93c2VyL2RlYnVnRXh0ZW5zaW9uSG9zdEFjdGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDOUQsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUM5RCxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFDO0FBQzFDLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSw4REFBOEQsQ0FBQztBQUMxRixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQ2pGLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUNoRixPQUFPLEVBQUUscUJBQXFCLEVBQW9CLE1BQU0sNERBQTRELENBQUM7QUFDckgsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sOENBQThDLENBQUM7QUFDbEYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHVEQUF1RCxDQUFDO0FBQ3hGLE9BQU8sRUFBRSxnQkFBZ0IsRUFBb0IsTUFBTSxrREFBa0QsQ0FBQztBQUN0RyxPQUFPLEVBQUUsZUFBZSxFQUErQixNQUFNLGdEQUFnRCxDQUFDO0FBQzlHLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBR3JFLE9BQU8sRUFBRSxpQkFBaUIsRUFBeUIsTUFBTSxtREFBbUQsQ0FBQztBQUM3RyxPQUFPLEVBQUUs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