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
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { derived, observableFromEvent, ObservableMap } from '../../../../base/common/observable.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { observableMemento } from '../../../../platform/observable/common/observableMemento.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { ChatModeKind } from '../common/constants.js';
import { ILanguageModelToolsService, ToolSet } from '../common/languageModelToolsService.js';
import { PromptFileRewriter } from './promptSyntax/promptFileRewriter.js';
export var ToolsScope;
(function (ToolsScope) {
    ToolsScope[ToolsScope["Global"] = 0] = "Global";
    ToolsScope[ToolsScope["Session"] = 1] = "Session";
    ToolsScope[ToolsScope["Mode"] = 2] = "Mode";
})(ToolsScope || (ToolsScope = {}));
let ChatSelectedTools = class ChatSelectedTools extends Disposable {
    constructor(_mode, _toolsService, _storageService, _instantiationService) {
        super();
        this._mode = _mode;
        this._toolsService = _toolsService;
        this._instantiationService = _instantiationService;
        this._sessionStates = new ObservableMap();
        /**
         * All enabled tools and tool sets.
         */
        this.entries = this.entriesMap.map(function (value) {
            const result = new Set();
            for (const [item, enabled] of value) {
                if (enabled) {
                    result.add(item);
                }
            }
            return result;
        });
        this.enablementMap = this.entriesMap.map((map, r) => {
            const result = new Map();
            const _set = (tool, enabled) => {
                // ONLY disable a tool that isn't enabled yet
                const enabledNow = result.get(tool);
                if (enabled || !enabledNow) {
                    result.set(tool, enabled);
                }
            };
            for (const [item, enabled] of map) {
                if (item instanceof ToolSet) {
                    for (const tool of item.getTools(r)) {
                        // Tools from an mcp tool set are explicitly enabled/disabled under the tool set.
                        // Other toolsets don't show individual tools under the tool set and enablement just follows the toolset.
                        const toolEnabled = item.source.type === 'mcp' ?
                            map.get(tool) ?? enabled :
                            enabled;
                        _set(tool, toolEnabled);
                    }
                }
                else {
                    if (item.canBeReferencedInPrompt) {
                        _set(item, enabled);
                    }
                }
            }
            return result;
        });
        const storedTools = observableMemento({
            defaultValue: { disabledToolSets: [], disabledTools: [] },
            key: 'chat/selectedTools',
        });
        this._selectedTools = this._store.add(storedTools(1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */, _storageService));
        this._allTools = observableFromEvent(_toolsService.onDidChangeTools, () => Array.from(_toolsService.getTools()));
    }
    /**
     * All tools and tool sets with their enabled state.
     */
    get entriesMap() {
        return derived(r => {
            const map = new Map();
            const currentMode = this._mode.read(r);
            let currentMap = this._sessionStates.get(currentMode.id);
            const modeTools = currentMode.customTools?.read(r);
            if (!currentMap && currentMode.kind === ChatModeKind.Agent && modeTools) {
                currentMap = this._toolsService.toToolAndToolSetEnablementMap(modeTools);
            }
            if (currentMap) {
                for (const tool of this._allTools.read(r)) {
                    if (tool.canBeReferencedInPrompt) {
                        map.set(tool, currentMap.get(tool) === true); // false if not present
                    }
                }
                for (const toolSet of this._toolsService.toolSets.read(r)) {
                    map.set(toolSet, currentMap.get(toolSet) === true); // false if not present
                }
            }
            else {
                const currData = this._selectedTools.read(r);
                const disabledToolSets = new Set(currData.disabledToolSets ?? []);
                const disabledTools = new Set(currData.disabledTools ?? []);
                for (const tool of this._allTools.read(r)) {
                    if (tool.canBeReferencedInPrompt) {
                        map.set(tool, !disabledTools.has(tool.id));
                    }
                }
                for (const toolSet of this._toolsService.toolSets.read(r)) {
                    map.set(toolSet, !disabledToolSets.has(toolSet.id));
                }
            }
            return map;
        });
    }
    get entriesScope() {
        const mode = this._mode.get();
        if (this._sessionStates.has(mode.id)) {
            return ToolsScope.Session;
        }
        if (mode.kind === ChatModeKind.Agent && mode.customTools?.get() && mode.uri) {
            return ToolsScope.Mode;
        }
        return ToolsScope.Global;
    }
    get currentMode() {
        return this._mode.get();
    }
    resetSessionEnablementState() {
        const mode = this._mode.get();
        this._sessionStates.delete(mode.id);
    }
    set(enablementMap, sessionOnly) {
        const mode = this._mode.get();
        if (sessionOnly) {
            this._sessionStates.set(mode.id, enablementMap);
            return;
        }
        if (this._sessionStates.has(mode.id)) {
            this._sessionStates.set(mode.id, enablementMap);
            return;
        }
        if (mode.kind === ChatModeKind.Agent && mode.customTools?.get() && mode.uri) {
            // apply directly to mode file.
            this.updateCustomModeTools(mode.uri.get(), enablementMap);
            return;
        }
        const storedData = { disabledToolSets: [], disabledTools: [] };
        for (const [item, enabled] of enablementMap) {
            if (!enabled) {
                if (item instanceof ToolSet) {
                    storedData.disabledToolSets.push(item.id);
                }
                else {
                    storedData.disabledTools.push(item.id);
                }
            }
        }
        this._selectedTools.set(storedData, undefined);
    }
    async updateCustomModeTools(uri, enablementMap) {
        await this._instantiationService.createInstance(PromptFileRewriter).openAndRewriteTools(uri, enablementMap, CancellationToken.None);
    }
};
ChatSelectedTools = __decorate([
    __param(1, ILanguageModelToolsService),
    __param(2, IStorageService),
    __param(3, IInstantiationService)
], ChatSelectedTools);
export { ChatSelectedTools };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFNlbGVjdGVkVG9vbHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9hZHZpa2FyL0RvY3VtZW50cy9hcmNoaXRlY3QvYXJjaDIvQXJjaElERS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2Jyb3dzZXIvY2hhdFNlbGVjdGVkVG9vbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDNUUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxPQUFPLEVBQWUsbUJBQW1CLEVBQUUsYUFBYSxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFFakgsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDbkcsT0FBTyxFQUFxQixpQkFBaUIsRUFBRSxNQUFNLDZEQUE2RCxDQUFDO0FBQ25ILE9BQU8sRUFBRSxlQUFlLEVBQStCLE1BQU0sZ0RBQWdELENBQUM7QUFFOUcsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLHdCQUF3QixDQUFDO0FBQ3RELE9BQU8sRUFBRSwwQkFBMEIsRUFBMkMsT0FBTyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDdEksT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFlMUUsTUFBTSxDQUFOLElBQVksVUFJWDtBQUpELFdBQVksVUFBVTtJQUNyQiwrQ0FBTSxDQUFBO0lBQ04saURBQU8sQ0FBQTtJQUNQLDJDQUFJLENBQUE7QUFDTCxDQUFDLEVBSlcsVUFBVSxLQUFWLFVBQVUsUUFJckI7QUFFTSxJQUFNLGlCQUFpQixHQUF2QixNQUFNLGlCQUFrQixTQUFRLFVBQVU7SUFxQmhELFlBQ2tCLEtBQTZCLEVBQ2xCLGFBQTBELEVBQ3JFLGVBQWdDLEVBQzFCLHFCQUE2RDtRQUVwRixL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