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
import { assertNever } from '../../../../base/common/assert.js';
import { disposableTimeout, RunOnceScheduler, timeout } from '../../../../base/common/async.js';
import { CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { Disposable, DisposableStore, toDisposable } from '../../../../base/common/lifecycle.js';
import { autorun, derived, ObservablePromise, observableValue } from '../../../../base/common/observable.js';
import { basename } from '../../../../base/common/resources.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { ILanguageService } from '../../../../editor/common/languages/language.js';
import { getIconClasses } from '../../../../editor/common/services/getIconClasses.js';
import { IModelService } from '../../../../editor/common/services/model.js';
import { localize } from '../../../../nls.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { IQuickInputService } from '../../../../platform/quickinput/common/quickInput.js';
import { TerminalLocation } from '../../../../platform/terminal/common/terminal.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { QueryBuilder } from '../../../services/search/common/queryBuilder.js';
import { ISearchService } from '../../../services/search/common/search.js';
import { ITerminalGroupService, ITerminalService } from '../../terminal/browser/terminal.js';
const SHELL_INTEGRATION_TIMEOUT = 5000;
const NO_SHELL_INTEGRATION_IDLE = 1000;
const SUGGEST_DEBOUNCE = 200;
let McpPromptArgumentPick = class McpPromptArgumentPick extends Disposable {
    constructor(prompt, _quickInputService, _terminalService, _searchService, _workspaceContextService, _labelService, _fileService, _modelService, _languageService, _terminalGroupService, _instantiationService) {
        super();
        this.prompt = prompt;
        this._quickInputService = _quickInputService;
        this._terminalService = _terminalService;
        this._searchService = _searchService;
        this._workspaceContextService = _workspaceContextService;
        this._labelService = _labelService;
        this._fileService = _fileService;
        this._modelService = _modelService;
        this._languageService = _languageService;
        this._terminalGroupService = _terminalGroupService;
        this._instantiationService = _instantiationService;
        this.quickPick = this._register(_quickInputService.createQuickPick({ useSeparators: true }));
    }
    async createArgs(token) {
        const { quickPick, prompt } = this;
        quickPick.totalSteps = prompt.arguments.length;
        quickPick.step = 0;
        quickPick.ignoreFocusOut = true;
        quickPick.sortByLabel = false;
        const args = {};
        const backSnapshots = [];
        for (let i = 0; i < prompt.arguments.length; i++) {
            const arg = prompt.arguments[i];
            const restore = backSnapshots.at(i);
            quickPick.step = i + 1;
            quickPick.placeholder = arg.required ? arg.description : `${arg.description || ''} (${localize('optional', 'Optional')})`;
            quickPick.title = localize('mcp.prompt.pick.title', 'Value for: {0}', arg.title || arg.name);
            quickPick.value = restore?.value ?? ((args.hasOwnProperty(arg.name) && args[arg.name]) || '');
            quickPick.items = restore?.items ?? [];
            quickPick.activeItems = restore?.activeItems ?? [];
            quickPick.buttons = i > 0 ? [this._quickInputService.backButton] : [];
            const value = await this._getArg(arg, !!restore, args, token);
            if (value.type === 'back') {
                i -= 2;
            }
            else if (value.type === 'cancel') {
                return undefined;
            }
            else if (value.type === 'arg') {
                backSnapshots[i] = { value: quickPick.value, items: quickPick.items.slice(), activeItems: quickPick.activeItems.slice() };
                args[arg.name] = value.value;
            }
            else {
                assertNever(value);
            }
        }
        quickPick.value = '';
        quickPick.placeholder = localize('loading', 'Loading...');
        quickPick.busy = true;
        return args;
    }
    async _getArg(arg, didRestoreState, argsSoFar, token) {
        const { quickPick } = this;
        const store = new DisposableStore();
        const input$ = observableValue(this, quickPick.value);
        const asyncPicks = [
            {
                name: localize('mcp.arg.suggestions', 'Suggestions'),
                observer: this._promptCompletions(arg, input$, argsSoFar),
            },
            {
                name: localize('mcp.arg.files', 'Files'),
                observer: this._fileCompletions(input$),
            }
        ];
        store.add(autorun(reader => {
            if (didRestoreState) {
                input$.read(reader);
                return; // don't overwrite initial items until the user types
            }
            let items = [];
            items.push({ id: 'insert-text', label: localize('mcp.arg.asText', 'Insert as text'), iconClass: ThemeIcon.asClassName(Codicon.textSize), action: 'text', alwaysShow: true });
            items.push({ id: 'run-command', label: localize('mcp.arg.asCommand', 'Run as Command'), description: localize('mcp.arg.asCommand.description', 'Inserts the command output as the prompt argument'), iconClass: ThemeIcon.asClassName(Codicon.terminal), action: 'command', alwaysShow: true });
            let busy = false;
            for (const pick of asyncPicks) {
                const state = pick.observer.read(reader);
                busy ||= state.busy;
                if (state.picks) {
                    items.push({ label: pick.name, type: 'separator' });
                    items = items.concat(state.picks);
                }
            }
            const previouslyActive = quickPick.activeItems;
            quickPick.busy = busy;
            quickPick.items = items;
            const lastActive = items.find(i => previouslyActive.some(a => a.id === i.id));
            // Keep any selection state, but otherwise select the first completion item, and avoid default-selecting the top item unless there are no compltions
            if (lastActive) {
                quickPick.activeItems = [lastActive];
            }
            else if (items.length > 2) {
                quickPick.activeItems = [items[3]];
            }
            else if (busy) {
                quickPick.activeItems = [];
            }
            else {
                quickPick.activeItems = [items[0]];
            }
        }));
        try {
            const value = await new Promise(resolve => {
                if (token) {
                    store.add(token.onCancellationRequested(() => {
                        resolve(undefined);
                    }));
                }
                store.add(quickPick.onDidChangeValue(value => {
                    quickPick.validationMessage = undefined;
                    input$.set(value, undefined);
                }));
                store.add(quickPick.onDidAccept(() => {
                    const item = quickPick.selectedItems[0];
                    if (!quickPick.value && arg.required && (!item || item.action === 'text' || item.action === 'command')) {
                        quickPick.validationMessage = localize('mcp.arg.required', "This argument is required");
                    }
                    else if (!item) {
                        // For optional arguments when no item is selected, return empty text action
                        resolve({ id: 'insert-text', label: '', action: 'text' });
                    }
                    else {
                        resolve(item);
                    }
                }));
                store.add(quickPick.onDidTriggerButton(() => {
                    resolve('back');
                }));
                store.add(quickPick.onDidHide(() => {
                    resolve(undefined);
                }));
                quickPick.show();
            });
            if (value === 'back') {
                return { type: 'back' };
            }
            if (value === undefined) {
                return { type: 'cancel' };
            }
            store.clear();
            const cts = new CancellationTokenSource();
            store.add(toDisposable(() => cts.dispose(true)));
            store.add(quickPick.onDidHide(() => store.dispose()));
            switch (value.action) {
                case 'text':
                    return { type: 'arg', value: quickPick.value || undefined };
                case 'command':
                    if (!quickPick.value) {
                        return { type: 'arg', value: undefined };
                    }
                    quickPick.busy = true;
                    return { type: 'arg', value: await this._getTerminalOutput(quickPick.value, cts.token) };
                case 'suggest':
                    return { type: 'arg', value: value.label };
                case 'file':
                    quickPick.busy = true;
                    return { type: 'arg', value: await this._fileService.readFile(value.uri).then(c => c.value.toString()) };
                default:
                    assertNever(value);
            }
        }
        finally {
            store.dispose();
        }
    }
    _promptCompletions(arg, input, argsSoFar) {
        const alreadyResolved = {};
        for (const [key, value] of Object.entries(argsSoFar)) {
            if (value) {
                alreadyResolved[key] = value;
            }
        }
        return this._asyncCompletions(input, async (i, t) => {
            const items = await this.prompt.complete(arg.name, i, alreadyResolved, t);
            return items.map((i) => ({ id: `suggest:${i}`, label: i, action: 'suggest' }));
        });
    }
    _fileCompletions(input) {
        const qb = this._instantiationService.createInstance(QueryBuilder);
        return this._asyncCompletions(input, async (i, token) => {
            if (!i) {
                return [];
            }
            const query = qb.file(this._workspaceContextService.getWorkspace().folders, {
                filePattern: i,
                maxResults: 10,
            });
            const { results } = await this._searchService.fileSearch(query, token);
            return results.map((i) => ({
                id: i.resource.toString(),
                label: basename(i.resource),
                description: this._labelService.getUriLabel(i.resource),
                iconClasses: getIconClasses(this._modelService, this._languageService, i.resource),
                uri: i.resource,
                action: 'file',
            }));
        });
    }
    _asyncCompletions(input, mapper) {
        const promise = derived(reader => {
            const queryValue = input.read(reader);
            const cts = new CancellationTokenSource();
            reader.store.add(toDisposable(() => cts.dispose(true)));
            return new ObservablePromise(timeout(SUGGEST_DEBOUNCE, cts.token)
                .then(() => mapper(queryValue, cts.token))
                .catch(() => []));
        });
        return promise.map((value, reader) => {
            const result = value.promiseResult.read(reader);
            return { picks: result?.data || [], busy: result === undefined };
        });
    }
    async _getTerminalOutput(command, token) {
        // The terminal outlives the specific pick argument. This is both a feature and a bug.
        // Feature: we can reuse the terminal if the user puts in multiple args
        // Bug workaround: if we dispose the terminal here and that results in the panel
        // closing, then focus moves out of the quickpick and into the active editor pane (chat input)
        // https://github.com/microsoft/vscode/blob/6a016f2507cd200b12ca6eecdab2f59da15aacb1/src/vs/workbench/browser/parts/editor/editorGroupView.ts#L1084
        const terminal = (this._terminal ??= this._register(await this._terminalService.createTerminal({
            config: {
                name: localize('mcp.terminal.name', "MCP Terminal"),
                isTransient: true,
                forceShellIntegration: true,
                isFeatureTerminal: true,
            },
            location: TerminalLocation.Panel,
        })));
        this._terminalService.setActiveInstance(terminal);
        this._terminalGroupService.showPanel(false);
        const shellIntegration = terminal.capabilities.get(2 /* TerminalCapability.CommandDetection */);
        if (shellIntegration) {
            return this._getTerminalOutputInner(terminal, command, shellIntegration, token);
        }
        const store = new DisposableStore();
        return await new Promise(resolve => {
            store.add(terminal.capabilities.onDidAddCapability(e => {
                if (e.id === 2 /* TerminalCapability.CommandDetection */) {
                    store.dispose();
                    resolve(this._getTerminalOutputInner(terminal, command, e.capability, token));
                }
            }));
            store.add(token.onCancellationRequested(() => {
                store.dispose();
                resolve(undefined);
            }));
            store.add(disposableTimeout(() => {
                store.dispose();
                resolve(this._getTerminalOutputInner(terminal, command, undefined, token));
            }, SHELL_INTEGRATION_TIMEOUT));
        });
    }
    async _getTerminalOutputInner(terminal, command, shellIntegration, token) {
        const store = new DisposableStore();
        return new Promise(resolve => {
            let allData = '';
            store.add(terminal.onLineData(d => allData += d + '\n'));
            if (shellIntegration) {
                store.add(shellIntegration.onCommandFinished(e => resolve(e.getOutput() || allData)));
            }
            else {
                const done = store.add(new RunOnceScheduler(() => resolve(allData), NO_SHELL_INTEGRATION_IDLE));
                store.add(terminal.onData(() => done.schedule()));
            }
            store.add(token.onCancellationRequested(() => resolve(undefined)));
            store.add(terminal.onDisposed(() => resolve(undefined)));
            terminal.runCommand(command, true);
        }).finally(() => {
            store.dispose();
        });
    }
};
McpPromptArgumentPick = __decorate([
    __param(1, IQuickInputService),
    __param(2, ITerminalService),
    __param(3, ISearchService),
    __param(4, IWorkspaceContextService),
    __param(5, ILabelService),
    __param(6, IFileService),
    __param(7, IModelService),
    __param(8, ILanguageService),
    __param(9, ITerminalGroupService),
    __param(10, IInstantiationService)
], McpPromptArgumentPick);
export { McpPromptArgumentPick };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWNwUHJvbXB0QXJndW1lbnRQaWNrLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvYWR2aWthci9Eb2N1bWVudHMvYXJjaGl0ZWN0L2FyY2gyL0FyY2hJREUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbWNwL2Jyb3dzZXIvbWNwUHJvbXB0QXJndW1lbnRQaWNrLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUNoRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsZ0JBQWdCLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDaEcsT0FBTyxFQUFxQix1QkFBdUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ3JHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUM5RCxPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBRSxZQUFZLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNqRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE9BQU8sRUFBZSxpQkFBaUIsRUFBRSxlQUFlLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUMxSCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDaEUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBRWpFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGlEQUFpRCxDQUFDO0FBQ25GLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUN0RixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFDNUUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQzlDLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUMxRSxPQUFPLEVBQUUscUJB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