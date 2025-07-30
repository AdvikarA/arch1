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
import { isNonEmptyArray } from '../../../base/common/arrays.js';
import { CancellationToken } from '../../../base/common/cancellation.js';
import { onUnexpectedError } from '../../../base/common/errors.js';
import { Emitter } from '../../../base/common/event.js';
import { DisposableMap, DisposableStore, toDisposable } from '../../../base/common/lifecycle.js';
import { URI } from '../../../base/common/uri.js';
import { ILanguageService } from '../../../editor/common/languages/language.js';
import { NotebookDto } from './mainThreadNotebookDto.js';
import { extHostNamedCustomer } from '../../services/extensions/common/extHostCustomers.js';
import { INotebookEditorService } from '../../contrib/notebook/browser/services/notebookEditorService.js';
import { INotebookExecutionStateService } from '../../contrib/notebook/common/notebookExecutionStateService.js';
import { INotebookKernelService } from '../../contrib/notebook/common/notebookKernelService.js';
import { ExtHostContext, MainContext } from '../common/extHost.protocol.js';
import { INotebookService } from '../../contrib/notebook/common/notebookService.js';
import { AsyncIterableSource } from '../../../base/common/async.js';
class MainThreadKernel {
    get preloadUris() {
        return this.preloads.map(p => p.uri);
    }
    get preloadProvides() {
        return this.preloads.flatMap(p => p.provides);
    }
    constructor(data, _languageService) {
        this._languageService = _languageService;
        this._onDidChange = new Emitter();
        this.onDidChange = this._onDidChange.event;
        this.id = data.id;
        this.viewType = data.notebookType;
        this.extension = data.extensionId;
        this.implementsInterrupt = data.supportsInterrupt ?? false;
        this.label = data.label;
        this.description = data.description;
        this.detail = data.detail;
        this.supportedLanguages = isNonEmptyArray(data.supportedLanguages) ? data.supportedLanguages : _languageService.getRegisteredLanguageIds();
        this.implementsExecutionOrder = data.supportsExecutionOrder ?? false;
        this.hasVariableProvider = data.hasVariableProvider ?? false;
        this.localResourceRoot = URI.revive(data.extensionLocation);
        this.preloads = data.preloads?.map(u => ({ uri: URI.revive(u.uri), provides: u.provides })) ?? [];
    }
    update(data) {
        const event = Object.create(null);
        if (data.label !== undefined) {
            this.label = data.label;
            event.label = true;
        }
        if (data.description !== undefined) {
            this.description = data.description;
            event.description = true;
        }
        if (data.detail !== undefined) {
            this.detail = data.detail;
            event.detail = true;
        }
        if (data.supportedLanguages !== undefined) {
            this.supportedLanguages = isNonEmptyArray(data.supportedLanguages) ? data.supportedLanguages : this._languageService.getRegisteredLanguageIds();
            event.supportedLanguages = true;
        }
        if (data.supportsExecutionOrder !== undefined) {
            this.implementsExecutionOrder = data.supportsExecutionOrder;
            event.hasExecutionOrder = true;
        }
        if (data.supportsInterrupt !== undefined) {
            this.implementsInterrupt = data.supportsInterrupt;
            event.hasInterruptHandler = true;
        }
        if (data.hasVariableProvider !== undefined) {
            this.hasVariableProvider = data.hasVariableProvider;
            event.hasVariableProvider = true;
        }
        this._onDidChange.fire(event);
    }
}
class MainThreadKernelDetectionTask {
    constructor(notebookType) {
        this.notebookType = notebookType;
    }
}
let MainThreadNotebookKernels = class MainThreadNotebookKernels {
    constructor(extHostContext, _languageService, _notebookKernelService, _notebookExecutionStateService, _notebookService, notebookEditorService) {
        this._languageService = _languageService;
        this._notebookKernelService = _notebookKernelService;
        this._notebookExecutionStateService = _notebookExecutionStateService;
        this._notebookService = _notebookService;
        this._editors = new DisposableMap();
        this._disposables = new DisposableStore();
        this._kernels = new Map();
        this._kernelDetectionTasks = new Map();
        this._kernelSourceActionProviders = new Map();
        this._kernelSourceActionProvidersEventRegistrations = new Map();
        this._executions = new Map();
        this._notebookExecutions = new Map();
        this.variableRequestIndex = 0;
        this.variableRequestMap = new Map();
        this._proxy = extHostContext.getProxy(ExtHostContext.ExtHostNotebookKernels);
        notebookEditorService.listNotebookEditors().forEach(this._onEditorAdd, this);
        notebookEditorService.onDidAddNotebookEditor(this._onEditorAdd, this, this._disposables);
        notebookEditorService.onDidRemoveNotebookEditor(this._onEditorRemove, this, this._disposables);
        this._disposables.add(toDisposable(() => {
            // EH shut down, complete all executions started by this EH
            this._executions.forEach(e => {
                e.complete({});
            });
            this._notebookExecutions.forEach(e => e.complete());
        }));
        this._disposables.add(this._notebookKernelService.onDidChangeSelectedNotebooks(e => {
            for (const [handle, [kernel,]] of this._kernels) {
                if (e.oldKernel === kernel.id) {
                    this._proxy.$acceptNotebookAssociation(handle, e.notebook, false);
                }
                else if (e.newKernel === kernel.id) {
                    this._proxy.$acceptNotebookAssociation(handle, e.notebook, true);
                }
            }
        }));
    }
    dispose() {
        this._disposables.dispose();
        for (const [, registration] of this._kernels.values()) {
            registration.dispose();
        }
        for (const [, registration] of this._kernelDetectionTasks.values()) {
            registration.dispose();
        }
        for (const [, registration] of this._kernelSourceActionProviders.values()) {
            registration.dispose();
        }
        this._editors.dispose();
    }
    // --- kernel ipc
    _onEditorAdd(editor) {
        const ipcListener = editor.onDidReceiveMessage(e => {
            if (!editor.hasModel()) {
                return;
            }
            const { selected } = this._notebookKernelService.getMatchingKernel(editor.textModel);
            if (!selected) {
                return;
            }
            for (const [handle, candidate] of this._kernels) {
                if (candidate[0] === selected) {
                    this._proxy.$acceptKernelMessageFromRenderer(handle, editor.getId(), e.message);
                    break;
                }
            }
        });
        this._editors.set(editor, ipcListener);
    }
    _onEditorRemove(editor) {
        this._editors.deleteAndDispose(editor);
    }
    async $postMessage(handle, editorId, message) {
        const tuple = this._kernels.get(handle);
        if (!tuple) {
            throw new Error('kernel already disposed');
        }
        const [kernel] = tuple;
        let didSend = false;
        for (const [editor] of this._editors) {
            if (!editor.hasModel()) {
                continue;
            }
            if (this._notebookKernelService.getMatchingKernel(editor.textModel).selected !== kernel) {
                // different kernel
                continue;
            }
            if (editorId === undefined) {
                // all editors
                editor.postMessage(message);
                didSend = true;
            }
            else if (editor.getId() === editorId) {
                // selected editors
                editor.postMessage(message);
                didSend = true;
                break;
            }
        }
        return didSend;
    }
    $receiveVariable(requestId, variable) {
        const source = this.variableRequestMap.get(requestId);
        if (source) {
            source.emitOne(variable);
        }
    }
    // --- kernel adding/updating/removal
    async $addKernel(handle, data) {
        const that = this;
        const kernel = new class extends MainThreadKernel {
            async executeNotebookCellsRequest(uri, handles) {
                await that._proxy.$executeCells(handle, uri, handles);
            }
            async cancelNotebookCellExecution(uri, handles) {
                await that._proxy.$cancelCells(handle, uri, handles);
            }
            provideVariables(notebookUri, parentId, kind, start, token) {
                const requestId = `${handle}variables${that.variableRequestIndex++}`;
                if (that.variableRequestMap.has(requestId)) {
                    return that.variableRequestMap.get(requestId).asyncIterable;
                }
                const source = new AsyncIterableSource();
                that.variableRequestMap.set(requestId, source);
                that._proxy.$provideVariables(handle, requestId, notebookUri, parentId, kind, start, token).then(() => {
                    source.resolve();
                    that.variableRequestMap.delete(requestId);
                }).catch((err) => {
                    source.reject(err);
                    that.variableRequestMap.delete(requestId);
                });
                return source.asyncIterable;
            }
        }(data, this._languageService);
        const disposables = this._disposables.add(new DisposableStore());
        // Ensure _kernels is up to date before we register a kernel.
        this._kernels.set(handle, [kernel, disposables]);
        disposables.add(this._notebookKernelService.registerKernel(kernel));
    }
    $updateKernel(handle, data) {
        const tuple = this._kernels.get(handle);
        if (tuple) {
            tuple[0].update(data);
        }
    }
    $removeKernel(handle) {
        const tuple = this._kernels.get(handle);
        if (tuple) {
            tuple[1].dispose();
            this._kernels.delete(handle);
        }
    }
    $updateNotebookPriority(handle, notebook, value) {
        const tuple = this._kernels.get(handle);
        if (tuple) {
            this._notebookKernelService.updateKernelNotebookAffinity(tuple[0], URI.revive(notebook), value);
        }
    }
    // --- Cell execution
    $createExecution(handle, controllerId, rawUri, cellHandle) {
        const uri = URI.revive(rawUri);
        const notebook = this._notebookService.getNotebookTextModel(uri);
        if (!notebook) {
            throw new Error(`Notebook not found: ${uri.toString()}`);
        }
        const kernel = this._notebookKernelService.getMatchingKernel(notebook);
        if (!kernel.selected || kernel.selected.id !== controllerId) {
            throw new Error(`Kernel is not selected: ${kernel.selected?.id} !== ${controllerId}`);
        }
        const execution = this._notebookExecutionStateService.createCellExecution(uri, cellHandle);
        execution.confirm();
        this._executions.set(handle, execution);
    }
    $updateExecution(handle, data) {
        const updates = data.value;
        try {
            const execution = this._executions.get(handle);
            execution?.update(updates.map(NotebookDto.fromCellExecuteUpdateDto));
        }
        catch (e) {
            onUnexpectedError(e);
        }
    }
    $completeExecution(handle, data) {
        try {
            const execution = this._executions.get(handle);
            execution?.complete(NotebookDto.fromCellExecuteCompleteDto(data.value));
        }
        catch (e) {
            onUnexpectedError(e);
        }
        finally {
            this._executions.delete(handle);
        }
    }
    // --- Notebook execution
    $createNotebookExecution(handle, controllerId, rawUri) {
        const uri = URI.revive(rawUri);
        const notebook = this._notebookService.getNotebookTextModel(uri);
        if (!notebook) {
            throw new Error(`Notebook not found: ${uri.toString()}`);
        }
        const kernel = this._notebookKernelService.getMatchingKernel(notebook);
        if (!kernel.selected || kernel.selected.id !== controllerId) {
            throw new Error(`Kernel is not selected: ${kernel.selected?.id} !== ${controllerId}`);
        }
        const execution = this._notebookExecutionStateService.createExecution(uri);
        execution.confirm();
        this._notebookExecutions.set(handle, execution);
    }
    $beginNotebookExecution(handle) {
        try {
            const execution = this._notebookExecutions.get(handle);
            execution?.begin();
        }
        catch (e) {
            onUnexpectedError(e);
        }
    }
    $completeNotebookExecution(handle) {
        try {
            const execution = this._notebookExecutions.get(handle);
            execution?.complete();
        }
        catch (e) {
            onUnexpectedError(e);
        }
        finally {
            this._notebookExecutions.delete(handle);
        }
    }
    // --- notebook kernel detection task
    async $addKernelDetectionTask(handle, notebookType) {
        const kernelDetectionTask = new MainThreadKernelDetectionTask(notebookType);
        const registration = this._notebookKernelService.registerNotebookKernelDetectionTask(kernelDetectionTask);
        this._kernelDetectionTasks.set(handle, [kernelDetectionTask, registration]);
    }
    $removeKernelDetectionTask(handle) {
        const tuple = this._kernelDetectionTasks.get(handle);
        if (tuple) {
            tuple[1].dispose();
            this._kernelDetectionTasks.delete(handle);
        }
    }
    // --- notebook kernel source action provider
    async $addKernelSourceActionProvider(handle, eventHandle, notebookType) {
        const kernelSourceActionProvider = {
            viewType: notebookType,
            provideKernelSourceActions: async () => {
                const actions = await this._proxy.$provideKernelSourceActions(handle, CancellationToken.None);
                return actions.map(action => {
                    let documentation = action.documentation;
                    if (action.documentation && typeof action.documentation !== 'string') {
                        documentation = URI.revive(action.documentation);
                    }
                    return {
                        label: action.label,
                        command: action.command,
                        description: action.description,
                        detail: action.detail,
                        documentation,
                    };
                });
            }
        };
        if (typeof eventHandle === 'number') {
            const emitter = new Emitter();
            this._kernelSourceActionProvidersEventRegistrations.set(eventHandle, emitter);
            kernelSourceActionProvider.onDidChangeSourceActions = emitter.event;
        }
        const registration = this._notebookKernelService.registerKernelSourceActionProvider(notebookType, kernelSourceActionProvider);
        this._kernelSourceActionProviders.set(handle, [kernelSourceActionProvider, registration]);
    }
    $removeKernelSourceActionProvider(handle, eventHandle) {
        const tuple = this._kernelSourceActionProviders.get(handle);
        if (tuple) {
            tuple[1].dispose();
            this._kernelSourceActionProviders.delete(handle);
        }
        if (typeof eventHandle === 'number') {
            this._kernelSourceActionProvidersEventRegistrations.delete(eventHandle);
        }
    }
    $emitNotebookKernelSourceActionsChangeEvent(eventHandle) {
        const emitter = this._kernelSourceActionProvidersEventRegistrations.get(eventHandle);
        if (emitter instanceof Emitter) {
            emitter.fire(undefined);
        }
    }
    $variablesUpdated(notebookUri) {
        this._notebookKernelService.notifyVariablesChange(URI.revive(notebookUri));
    }
};
MainThreadNotebookKernels = __decorate([
    extHostNamedCustomer(MainContext.MainThreadNotebookKernels),
    __param(1, ILanguageService),
    __param(2, INotebookKernelService),
    __param(3, INotebookExecutionStateService),
    __param(4, INotebookService),
    __param(5, INotebookEditorService)
], MainThreadNotebookKernels);
export { MainThreadNotebookKernels };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZE5vdGVib29rS2VybmVscy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL2FkdmlrYXIvRG9jdW1lbnRzL2FyY2hpdGVjdC9hcmNoMi9BcmNoSURFL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvYnJvd3Nlci9tYWluVGhyZWFkTm90ZWJvb2tLZXJuZWxzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUNqRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUN6RSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUNuRSxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0sK0JBQStCLENBQUM7QUFDL0QsT0FBTyxFQUFFLGFBQWEsRUFBRSxlQUFlLEVBQWUsWUFBWSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDOUcsT0FBTyxFQUFFLEdBQUcsRUFBaUIsTUFBTSw2QkFBNkIsQ0FBQztBQUNqRSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQztBQUVoRixPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sNEJBQTRCLENBQUM7QUFDekQsT0FBTyxFQUFFLG9CQUFvQixFQUFtQixNQUFNLHNEQUFzRCxDQUFDO0FBRTdHLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLGtFQUFrRSxDQUFDO0FBQzFHLE9BQU8sRUFBOEMsOEJBQThCLEVBQUUsTUFBTSxnRUFBZ0UsQ0FBQztBQUM1SixPQUFPLEVBQTBHLHNCQUFzQixFQUFtQixNQUFNLHdEQUF3RCxDQUFDO0FBRXpOLE9BQU8sRUFBRSxjQUFjLEVBQXNHLFdBQVcsRUFBa0MsTUFBTSwrQkFBK0IsQ0FBQztBQUNoTixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUNw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