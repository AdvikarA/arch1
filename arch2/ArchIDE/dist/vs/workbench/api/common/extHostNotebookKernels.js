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
import { asArray } from '../../../base/common/arrays.js';
import { DeferredPromise, timeout } from '../../../base/common/async.js';
import { CancellationTokenSource } from '../../../base/common/cancellation.js';
import { Emitter } from '../../../base/common/event.js';
import { Disposable, DisposableStore } from '../../../base/common/lifecycle.js';
import { ResourceMap } from '../../../base/common/map.js';
import { URI } from '../../../base/common/uri.js';
import { ExtensionIdentifier } from '../../../platform/extensions/common/extensions.js';
import { ILogService } from '../../../platform/log/common/log.js';
import { MainContext } from './extHost.protocol.js';
import { ApiCommand, ApiCommandArgument, ApiCommandResult } from './extHostCommands.js';
import * as extHostTypeConverters from './extHostTypeConverters.js';
import { NotebookCellOutput, NotebookControllerAffinity2, NotebookVariablesRequestKind } from './extHostTypes.js';
import { asWebviewUri } from '../../contrib/webview/common/webview.js';
import { CellExecutionUpdateType } from '../../contrib/notebook/common/notebookExecutionService.js';
import { checkProposedApiEnabled } from '../../services/extensions/common/extensions.js';
import { SerializableObjectWithBuffers } from '../../services/extensions/common/proxyIdentifier.js';
import { variablePageSize } from '../../contrib/notebook/common/notebookKernelService.js';
let ExtHostNotebookKernels = class ExtHostNotebookKernels {
    constructor(mainContext, _initData, _extHostNotebook, _commands, _logService) {
        this._initData = _initData;
        this._extHostNotebook = _extHostNotebook;
        this._commands = _commands;
        this._logService = _logService;
        this._activeExecutions = new ResourceMap();
        this._activeNotebookExecutions = new ResourceMap();
        this._kernelDetectionTask = new Map();
        this._kernelDetectionTaskHandlePool = 0;
        this._kernelSourceActionProviders = new Map();
        this._kernelSourceActionProviderHandlePool = 0;
        this._kernelData = new Map();
        this._handlePool = 0;
        this.id = 0;
        this.variableStore = {};
        this._proxy = mainContext.getProxy(MainContext.MainThreadNotebookKernels);
        // todo@rebornix @joyceerhl: move to APICommands once stabilized.
        const selectKernelApiCommand = new ApiCommand('notebook.selectKernel', '_notebook.selectKernel', 'Trigger kernel picker for specified notebook editor widget', [
            new ApiCommandArgument('options', 'Select kernel options', v => true, (v) => {
                if (v && 'notebookEditor' in v && 'id' in v) {
                    const notebookEditorId = this._extHostNotebook.getIdByEditor(v.notebookEditor);
                    return {
                        id: v.id, extension: v.extension, notebookEditorId
                    };
                }
                else if (v && 'notebookEditor' in v) {
                    const notebookEditorId = this._extHostNotebook.getIdByEditor(v.notebookEditor);
                    if (notebookEditorId === undefined) {
                        throw new Error(`Cannot invoke 'notebook.selectKernel' for unrecognized notebook editor ${v.notebookEditor.notebook.uri.toString()}`);
                    }
                    if ('skipIfAlreadySelected' in v) {
                        return { notebookEditorId, skipIfAlreadySelected: v.skipIfAlreadySelected };
                    }
                    return { notebookEditorId };
                }
                return v;
            })
        ], ApiCommandResult.Void);
        const requestKernelVariablesApiCommand = new ApiCommand('vscode.executeNotebookVariableProvider', '_executeNotebookVariableProvider', 'Execute notebook variable provider', [ApiCommandArgument.Uri], new ApiCommandResult('A promise that resolves to an array of variables', (value, apiArgs) => {
            return value.map(variable => {
                return {
                    variable: {
                        name: variable.name,
                        value: variable.value,
                        expression: variable.expression,
                        type: variable.type,
                        language: variable.language
                    },
                    hasNamedChildren: variable.hasNamedChildren,
                    indexedChildrenCount: variable.indexedChildrenCount
                };
            });
        }));
        this._commands.registerApiCommand(selectKernelApiCommand);
        this._commands.registerApiCommand(requestKernelVariablesApiCommand);
    }
    createNotebookController(extension, id, viewType, label, handler, preloads) {
        for (const data of this._kernelData.values()) {
            if (data.controller.id === id && ExtensionIdentifier.equals(extension.identifier, data.extensionId)) {
                throw new Error(`notebook controller with id '${id}' ALREADY exist`);
            }
        }
        const handle = this._handlePool++;
        const that = this;
        this._logService.trace(`NotebookController[${handle}], CREATED by ${extension.identifier.value}, ${id}`);
        const _defaultExecutHandler = () => console.warn(`NO execute handler from notebook controller '${data.id}' of extension: '${extension.identifier}'`);
        let isDisposed = false;
        const onDidChangeSelection = new Emitter();
        const onDidReceiveMessage = new Emitter();
        const data = {
            id: createKernelId(extension.identifier, id),
            notebookType: viewType,
            extensionId: extension.identifier,
            extensionLocation: extension.extensionLocation,
            label: label || extension.identifier.value,
            preloads: preloads ? preloads.map(extHostTypeConverters.NotebookRendererScript.from) : []
        };
        //
        let _executeHandler = handler ?? _defaultExecutHandler;
        let _interruptHandler;
        let _variableProvider;
        this._proxy.$addKernel(handle, data).catch(err => {
            // this can happen when a kernel with that ID is already registered
            console.log(err);
            isDisposed = true;
        });
        // update: all setters write directly into the dto object
        // and trigger an update. the actual update will only happen
        // once per event loop execution
        let tokenPool = 0;
        const _update = () => {
            if (isDisposed) {
                return;
            }
            const myToken = ++tokenPool;
            Promise.resolve().then(() => {
                if (myToken === tokenPool) {
                    this._proxy.$updateKernel(handle, data);
                }
            });
        };
        // notebook documents that are associated to this controller
        const associatedNotebooks = new ResourceMap();
        const controller = {
            get id() { return id; },
            get notebookType() { return data.notebookType; },
            onDidChangeSelectedNotebooks: onDidChangeSelection.event,
            get label() {
                return data.label;
            },
            set label(value) {
                data.label = value ?? extension.displayName ?? extension.name;
                _update();
            },
            get detail() {
                return data.detail ?? '';
            },
            set detail(value) {
                data.detail = value;
                _update();
            },
            get description() {
                return data.description ?? '';
            },
            set description(value) {
                data.description = value;
                _update();
            },
            get supportedLanguages() {
                return data.supportedLanguages;
            },
            set supportedLanguages(value) {
                data.supportedLanguages = value;
                _update();
            },
            get supportsExecutionOrder() {
                return data.supportsExecutionOrder ?? false;
            },
            set supportsExecutionOrder(value) {
                data.supportsExecutionOrder = value;
                _update();
            },
            get rendererScripts() {
                return data.preloads ? data.preloads.map(extHostTypeConverters.NotebookRendererScript.to) : [];
            },
            get executeHandler() {
                return _executeHandler;
            },
            set executeHandler(value) {
                _executeHandler = value ?? _defaultExecutHandler;
            },
            get interruptHandler() {
                return _interruptHandler;
            },
            set interruptHandler(value) {
                _interruptHandler = value;
                data.supportsInterrupt = Boolean(value);
                _update();
            },
            set variableProvider(value) {
                checkProposedApiEnabled(extension, 'notebookVariableProvider');
                _variableProvider = value;
                data.hasVariableProvider = !!value;
                value?.onDidChangeVariables(e => that._proxy.$variablesUpdated(e.uri));
                _update();
            },
            get variableProvider() {
                return _variableProvider;
            },
            createNotebookCellExecution(cell) {
                if (isDisposed) {
                    throw new Error('notebook controller is DISPOSED');
                }
                if (!associatedNotebooks.has(cell.notebook.uri)) {
                    that._logService.trace(`NotebookController[${handle}] NOT associated to notebook, associated to THESE notebooks:`, Array.from(associatedNotebooks.keys()).map(u => u.toString()));
                    throw new Error(`notebook controller is NOT associated to notebook: ${cell.notebook.uri.toString()}`);
                }
                return that._createNotebookCellExecution(cell, createKernelId(extension.identifier, this.id));
            },
            createNotebookExecution(notebook) {
                checkProposedApiEnabled(extension, 'notebookExecution');
                if (isDisposed) {
                    throw new Error('notebook controller is DISPOSED');
                }
                if (!associatedNotebooks.has(notebook.uri)) {
                    that._logService.trace(`NotebookController[${handle}] NOT associated to notebook, associated to THESE notebooks:`, Array.from(associatedNotebooks.keys()).map(u => u.toString()));
                    throw new Error(`notebook controller is NOT associated to notebook: ${notebook.uri.toString()}`);
                }
                return that._createNotebookExecution(notebook, createKernelId(extension.identifier, this.id));
            },
            dispose: () => {
                if (!isDisposed) {
                    this._logService.trace(`NotebookController[${handle}], DISPOSED`);
                    isDisposed = true;
                    this._kernelData.delete(handle);
                    onDidChangeSelection.dispose();
                    onDidReceiveMessage.dispose();
                    this._proxy.$removeKernel(handle);
                }
            },
            // --- priority
            updateNotebookAffinity(notebook, priority) {
                if (priority === NotebookControllerAffinity2.Hidden) {
                    // This api only adds an extra enum value, the function is the same, so just gate on the new value being passed
                    // for proposedAPI check.
                    checkProposedApiEnabled(extension, 'notebookControllerAffinityHidden');
                }
                that._proxy.$updateNotebookPriority(handle, notebook.uri, priority);
            },
            // --- ipc
            onDidReceiveMessage: onDidReceiveMessage.event,
            postMessage(message, editor) {
                checkProposedApiEnabled(extension, 'notebookMessaging');
                return that._proxy.$postMessage(handle, editor && that._extHostNotebook.getIdByEditor(editor), message);
            },
            asWebviewUri(uri) {
                checkProposedApiEnabled(extension, 'notebookMessaging');
                return asWebviewUri(uri, that._initData.remote);
            },
        };
        this._kernelData.set(handle, {
            extensionId: extension.identifier,
            controller,
            onDidReceiveMessage,
            onDidChangeSelection,
            associatedNotebooks
        });
        return controller;
    }
    getIdByController(controller) {
        for (const [_, candidate] of this._kernelData) {
            if (candidate.controller === controller) {
                return createKernelId(candidate.extensionId, controller.id);
            }
        }
        return null;
    }
    createNotebookControllerDetectionTask(extension, viewType) {
        const handle = this._kernelDetectionTaskHandlePool++;
        const that = this;
        this._logService.trace(`NotebookControllerDetectionTask[${handle}], CREATED by ${extension.identifier.value}`);
        this._proxy.$addKernelDetectionTask(handle, viewType);
        const detectionTask = {
            dispose: () => {
                this._kernelDetectionTask.delete(handle);
                that._proxy.$removeKernelDetectionTask(handle);
            }
        };
        this._kernelDetectionTask.set(handle, detectionTask);
        return detectionTask;
    }
    registerKernelSourceActionProvider(extension, viewType, provider) {
        const handle = this._kernelSourceActionProviderHandlePool++;
        const eventHandle = typeof provider.onDidChangeNotebookKernelSourceActions === 'function' ? handle : undefined;
        const that = this;
        this._kernelSourceActionProviders.set(handle, provider);
        this._logService.trace(`NotebookKernelSourceActionProvider[${handle}], CREATED by ${extension.identifier.value}`);
        this._proxy.$addKernelSourceActionProvider(handle, handle, viewType);
        let subscription;
        if (eventHandle !== undefined) {
            subscription = provider.onDidChangeNotebookKernelSourceActions(_ => this._proxy.$emitNotebookKernelSourceActionsChangeEvent(eventHandle));
        }
        return {
            dispose: () => {
                this._kernelSourceActionProviders.delete(handle);
                that._proxy.$removeKernelSourceActionProvider(handle, handle);
                subscription?.dispose();
            }
        };
    }
    async $provideKernelSourceActions(handle, token) {
        const provider = this._kernelSourceActionProviders.get(handle);
        if (provider) {
            const disposables = new DisposableStore();
            const ret = await provider.provideNotebookKernelSourceActions(token);
            return (ret ?? []).map(item => extHostTypeConverters.NotebookKernelSourceAction.from(item, this._commands.converter, disposables));
        }
        return [];
    }
    $acceptNotebookAssociation(handle, uri, value) {
        const obj = this._kernelData.get(handle);
        if (obj) {
            // update data structure
            const notebook = this._extHostNotebook.getNotebookDocument(URI.revive(uri));
            if (value) {
                obj.associatedNotebooks.set(notebook.uri, true);
            }
            else {
                obj.associatedNotebooks.delete(notebook.uri);
            }
            this._logService.trace(`NotebookController[${handle}] ASSOCIATE notebook`, notebook.uri.toString(), value);
            // send event
            obj.onDidChangeSelection.fire({
                selected: value,
                notebook: notebook.apiNotebook
            });
        }
    }
    async $executeCells(handle, uri, handles) {
        const obj = this._kernelData.get(handle);
        if (!obj) {
            // extension can dispose kernels in the meantime
            return;
        }
        const document = this._extHostNotebook.getNotebookDocument(URI.revive(uri));
        const cells = [];
        for (const cellHandle of handles) {
            const cell = document.getCell(cellHandle);
            if (cell) {
                cells.push(cell.apiCell);
            }
        }
        try {
            this._logService.trace(`NotebookController[${handle}] EXECUTE cells`, document.uri.toString(), cells.length);
            await obj.controller.executeHandler.call(obj.controller, cells, document.apiNotebook, obj.controller);
        }
        catch (err) {
            //
            this._logService.error(`NotebookController[${handle}] execute cells FAILED`, err);
            console.error(err);
        }
    }
    async $cancelCells(handle, uri, handles) {
        const obj = this._kernelData.get(handle);
        if (!obj) {
            // extension can dispose kernels in the meantime
            return;
        }
        // cancel or interrupt depends on the controller. When an interrupt handler is used we
        // don't trigger the cancelation token of executions.
        const document = this._extHostNotebook.getNotebookDocument(URI.revive(uri));
        if (obj.controller.interruptHandler) {
            await obj.controller.interruptHandler.call(obj.controller, document.apiNotebook);
        }
        else {
            for (const cellHandle of handles) {
                const cell = document.getCell(cellHandle);
                if (cell) {
                    this._activeExecutions.get(cell.uri)?.cancel();
                }
            }
        }
        if (obj.controller.interruptHandler) {
            // If we're interrupting all cells, we also need to cancel the notebook level execution.
            const items = this._activeNotebookExecutions.get(document.uri);
            this._activeNotebookExecutions.delete(document.uri);
            if (handles.length && Array.isArray(items) && items.length) {
                items.forEach(d => d.dispose());
            }
        }
    }
    async $provideVariables(handle, requestId, notebookUri, parentId, kind, start, token) {
        const obj = this._kernelData.get(handle);
        if (!obj) {
            return;
        }
        const document = this._extHostNotebook.getNotebookDocument(URI.revive(notebookUri));
        const variableProvider = obj.controller.variableProvider;
        if (!variableProvider) {
            return;
        }
        let parent = undefined;
        if (parentId !== undefined) {
            parent = this.variableStore[parentId];
            if (!parent) {
                // request for unknown parent
                return;
            }
        }
        else {
            // root request, clear store
            this.variableStore = {};
        }
        const requestKind = kind === 'named' ? NotebookVariablesRequestKind.Named : NotebookVariablesRequestKind.Indexed;
        const variableResults = variableProvider.provideVariables(document.apiNotebook, parent, requestKind, start, token);
        let resultCount = 0;
        for await (const result of variableResults) {
            if (token.isCancellationRequested) {
                return;
            }
            const variable = {
                id: this.id++,
                name: result.variable.name,
                value: result.variable.value,
                type: result.variable.type,
                interfaces: result.variable.interfaces,
                language: result.variable.language,
                expression: result.variable.expression,
                hasNamedChildren: result.hasNamedChildren,
                indexedChildrenCount: result.indexedChildrenCount,
                extensionId: obj.extensionId.value,
            };
            this.variableStore[variable.id] = result.variable;
            this._proxy.$receiveVariable(requestId, variable);
            if (resultCount++ >= variablePageSize) {
                return;
            }
        }
    }
    $acceptKernelMessageFromRenderer(handle, editorId, message) {
        const obj = this._kernelData.get(handle);
        if (!obj) {
            // extension can dispose kernels in the meantime
            return;
        }
        const editor = this._extHostNotebook.getEditorById(editorId);
        obj.onDidReceiveMessage.fire(Object.freeze({ editor: editor.apiEditor, message }));
    }
    // ---
    _createNotebookCellExecution(cell, controllerId) {
        if (cell.index < 0) {
            throw new Error('CANNOT execute cell that has been REMOVED from notebook');
        }
        const notebook = this._extHostNotebook.getNotebookDocument(cell.notebook.uri);
        const cellObj = notebook.getCellFromApiCell(cell);
        if (!cellObj) {
            throw new Error('invalid cell');
        }
        if (this._activeExecutions.has(cellObj.uri)) {
            throw new Error(`duplicate execution for ${cellObj.uri}`);
        }
        const execution = new NotebookCellExecutionTask(controllerId, cellObj, this._proxy);
        this._activeExecutions.set(cellObj.uri, execution);
        const listener = execution.onDidChangeState(() => {
            if (execution.state === NotebookCellExecutionTaskState.Resolved) {
                execution.dispose();
                listener.dispose();
                this._activeExecutions.delete(cellObj.uri);
            }
        });
        return execution.asApiObject();
    }
    // ---
    _createNotebookExecution(nb, controllerId) {
        const notebook = this._extHostNotebook.getNotebookDocument(nb.uri);
        const runningCell = nb.getCells().find(cell => {
            const apiCell = notebook.getCellFromApiCell(cell);
            return apiCell && this._activeExecutions.has(apiCell.uri);
        });
        if (runningCell) {
            throw new Error(`duplicate cell execution for ${runningCell.document.uri}`);
        }
        if (this._activeNotebookExecutions.has(notebook.uri)) {
            throw new Error(`duplicate notebook execution for ${notebook.uri}`);
        }
        const execution = new NotebookExecutionTask(controllerId, notebook, this._proxy);
        const listener = execution.onDidChangeState(() => {
            if (execution.state === NotebookExecutionTaskState.Resolved) {
                execution.dispose();
                listener.dispose();
                this._activeNotebookExecutions.delete(notebook.uri);
            }
        });
        this._activeNotebookExecutions.set(notebook.uri, [execution, listener]);
        return execution.asApiObject();
    }
};
ExtHostNotebookKernels = __decorate([
    __param(4, ILogService)
], ExtHostNotebookKernels);
export { ExtHostNotebookKernels };
var NotebookCellExecutionTaskState;
(function (NotebookCellExecutionTaskState) {
    NotebookCellExecutionTaskState[NotebookCellExecutionTaskState["Init"] = 0] = "Init";
    NotebookCellExecutionTaskState[NotebookCellExecutionTaskState["Started"] = 1] = "Started";
    NotebookCellExecutionTaskState[NotebookCellExecutionTaskState["Resolved"] = 2] = "Resolved";
})(NotebookCellExecutionTaskState || (NotebookCellExecutionTaskState = {}));
class NotebookCellExecutionTask extends Disposable {
    static { this.HANDLE = 0; }
    get state() { return this._state; }
    constructor(controllerId, _cell, _proxy) {
        super();
        this._cell = _cell;
        this._proxy = _proxy;
        this._handle = NotebookCellExecutionTask.HANDLE++;
        this._onDidChangeState = new Emitter();
        this.onDidChangeState = this._onDidChangeState.event;
        this._state = NotebookCellExecutionTaskState.Init;
        this._tokenSource = this._register(new CancellationTokenSource());
        this._collector = new TimeoutBasedCollector(10, updates => this.update(updates));
        this._executionOrder = _cell.internalMetadata.executionOrder;
        this._proxy.$createExecution(this._handle, controllerId, this._cell.notebook.uri, this._cell.handle);
    }
    cancel() {
        this._tokenSource.cancel();
    }
    async updateSoon(update) {
        await this._collector.addItem(update);
    }
    async update(update) {
        const updates = Array.isArray(update) ? update : [update];
        return this._proxy.$updateExecution(this._handle, new SerializableObjectWithBuffers(updates));
    }
    verifyStateForOutput() {
        if (this._state === NotebookCellExecutionTaskState.Init) {
            throw new Error('Must call start before modifying cell output');
        }
        if (this._state === NotebookCellExecutionTaskState.Resolved) {
            throw new Error('Cannot modify cell output after calling resolve');
        }
    }
    cellIndexToHandle(cellOrCellIndex) {
        let cell = this._cell;
        if (cellOrCellIndex) {
            cell = this._cell.notebook.getCellFromApiCell(cellOrCellIndex);
        }
        if (!cell) {
            throw new Error('INVALID cell');
        }
        return cell.handle;
    }
    validateAndConvertOutputs(items) {
        return items.map(output => {
            const newOutput = NotebookCellOutput.ensureUniqueMimeTypes(output.items, true);
            if (newOutput === output.items) {
                return extHostTypeConverters.NotebookCellOutput.from(output);
            }
            return extHostTypeConverters.NotebookCellOutput.from({
                items: newOutput,
                id: output.id,
                metadata: output.metadata
            });
        });
    }
    async updateOutputs(outputs, cell, append) {
        const handle = this.cellIndexToHandle(cell);
        const outputDtos = this.validateAndConvertOutputs(asArray(outputs));
        return this.updateSoon({
            editType: CellExecutionUpdateType.Output,
            cellHandle: handle,
            append,
            outputs: outputDtos
        });
    }
    async updateOutputItems(items, output, append) {
        items = NotebookCellOutput.ensureUniqueMimeTypes(asArray(items), true);
        return this.updateSoon({
            editType: CellExecutionUpdateType.OutputItems,
            items: items.map(extHostTypeConverters.NotebookCellOutputItem.from),
            outputId: output.id,
            append
        });
    }
    asApiObject() {
        const that = this;
        const result = {
            get token() { return that._tokenSource.token; },
            get cell() { return that._cell.apiCell; },
            get executionOrder() { return that._executionOrder; },
            set executionOrder(v) {
                that._executionOrder = v;
                that.update([{
                        editType: CellExecutionUpdateType.ExecutionState,
                        executionOrder: that._executionOrder
                    }]);
            },
            start(startTime) {
                if (that._state === NotebookCellExecutionTaskState.Resolved || that._state === NotebookCellExecutionTaskState.Started) {
                    throw new Error('Cannot call start again');
                }
                that._state = NotebookCellExecutionTaskState.Started;
                that._onDidChangeState.fire();
                that.update({
                    editType: CellExecutionUpdateType.ExecutionState,
                    runStartTime: startTime
                });
            },
            end(success, endTime, executionError) {
                if (that._state === NotebookCellExecutionTaskState.Resolved) {
                    throw new Error('Cannot call resolve twice');
                }
                that._state = NotebookCellExecutionTaskState.Resolved;
                that._onDidChangeState.fire();
                // The last update needs to be ordered correctly and applied immediately,
                // so we use updateSoon and immediately flush.
                that._collector.flush();
                const error = createSerializeableError(executionError);
                that._proxy.$completeExecution(that._handle, new SerializableObjectWithBuffers({
                    runEndTime: endTime,
                    lastRunSuccess: success,
                    error
                }));
            },
            clearOutput(cell) {
                that.verifyStateForOutput();
                return that.updateOutputs([], cell, false);
            },
            appendOutput(outputs, cell) {
                that.verifyStateForOutput();
                return that.updateOutputs(outputs, cell, true);
            },
            replaceOutput(outputs, cell) {
                that.verifyStateForOutput();
                return that.updateOutputs(outputs, cell, false);
            },
            appendOutputItems(items, output) {
                that.verifyStateForOutput();
                return that.updateOutputItems(items, output, true);
            },
            replaceOutputItems(items, output) {
                that.verifyStateForOutput();
                return that.updateOutputItems(items, output, false);
            }
        };
        return Object.freeze(result);
    }
}
function createSerializeableError(executionError) {
    const convertRange = (range) => (range ? {
        startLineNumber: range.start.line,
        startColumn: range.start.character,
        endLineNumber: range.end.line,
        endColumn: range.end.character
    } : undefined);
    const convertStackFrame = (frame) => ({
        uri: frame.uri,
        position: frame.position,
        label: frame.label
    });
    const error = executionError ? {
        name: executionError.name,
        message: executionError.message,
        stack: executionError.stack instanceof Array
            ? executionError.stack.map(frame => convertStackFrame(frame))
            : executionError.stack,
        location: convertRange(executionError.location),
        uri: executionError.uri
    } : undefined;
    return error;
}
var NotebookExecutionTaskState;
(function (NotebookExecutionTaskState) {
    NotebookExecutionTaskState[NotebookExecutionTaskState["Init"] = 0] = "Init";
    NotebookExecutionTaskState[NotebookExecutionTaskState["Started"] = 1] = "Started";
    NotebookExecutionTaskState[NotebookExecutionTaskState["Resolved"] = 2] = "Resolved";
})(NotebookExecutionTaskState || (NotebookExecutionTaskState = {}));
class NotebookExecutionTask extends Disposable {
    static { this.HANDLE = 0; }
    get state() { return this._state; }
    constructor(controllerId, _notebook, _proxy) {
        super();
        this._notebook = _notebook;
        this._proxy = _proxy;
        this._handle = NotebookExecutionTask.HANDLE++;
        this._onDidChangeState = new Emitter();
        this.onDidChangeState = this._onDidChangeState.event;
        this._state = NotebookExecutionTaskState.Init;
        this._tokenSource = this._register(new CancellationTokenSource());
        this._proxy.$createNotebookExecution(this._handle, controllerId, this._notebook.uri);
    }
    cancel() {
        this._tokenSource.cancel();
    }
    asApiObject() {
        const result = {
            start: () => {
                if (this._state === NotebookExecutionTaskState.Resolved || this._state === NotebookExecutionTaskState.Started) {
                    throw new Error('Cannot call start again');
                }
                this._state = NotebookExecutionTaskState.Started;
                this._onDidChangeState.fire();
                this._proxy.$beginNotebookExecution(this._handle);
            },
            end: () => {
                if (this._state === NotebookExecutionTaskState.Resolved) {
                    throw new Error('Cannot call resolve twice');
                }
                this._state = NotebookExecutionTaskState.Resolved;
                this._onDidChangeState.fire();
                this._proxy.$completeNotebookExecution(this._handle);
            },
        };
        return Object.freeze(result);
    }
}
class TimeoutBasedCollector {
    constructor(delay, callback) {
        this.delay = delay;
        this.callback = callback;
        this.batch = [];
        this.startedTimer = Date.now();
    }
    addItem(item) {
        this.batch.push(item);
        if (!this.currentDeferred) {
            this.currentDeferred = new DeferredPromise();
            this.startedTimer = Date.now();
            timeout(this.delay).then(() => {
                return this.flush();
            });
        }
        // This can be called by the extension repeatedly for a long time before the timeout is able to run.
        // Force a flush after the delay.
        if (Date.now() - this.startedTimer > this.delay) {
            return this.flush();
        }
        return this.currentDeferred.p;
    }
    flush() {
        if (this.batch.length === 0 || !this.currentDeferred) {
            return Promise.resolve();
        }
        const deferred = this.currentDeferred;
        this.currentDeferred = undefined;
        const batch = this.batch;
        this.batch = [];
        return this.callback(batch)
            .finally(() => deferred.complete());
    }
}
export function createKernelId(extensionIdentifier, id) {
    return `${extensionIdentifier.value}/${id}`;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdE5vdGVib29rS2VybmVscy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL2FkdmlrYXIvRG9jdW1lbnRzL2FyY2hpdGVjdC9hcmNoMi9BcmNoSURFL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvY29tbW9uL2V4dEhvc3ROb3RlYm9va0tlcm5lbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ3pELE9BQU8sRUFBRSxlQUFlLEVBQUUsT0FBTyxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDekUsT0FBTyxFQUFxQix1QkFBdUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2xHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUN4RCxPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBZSxNQUFNLG1DQUFtQyxDQUFDO0FBQzdGLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUMxRCxPQUFPLEVBQUUsR0FBRyxFQUFpQixNQUFNLDZCQUE2QixDQUFDO0FBQ2pFLE9BQU8sRUFBRSxtQkFBbUIsRUFBeUIsTUFBTSxtREFBbUQsQ0FBQztBQUMvRyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDbEUsT0FBTyxFQUF5RixXQUFXLEVBQXNFLE1BQU0sdUJBQXVCLENBQUM7QUFDL00sT0FBTyxFQUFFLFVBQVUsRUFBRSxrQkFBa0IsRUFBRSxnQkFBZ0IsRUFBbUIsTUFBTSxzQkFBc0IsQ0FBQztBQUl6RyxPQUFPLEtBQUsscUJBQXFCLE1BQU0sNEJBQTRCLENBQUM7QUFDcEUsT0FBTyxFQUFFLGtCQUFrQixFQUFFLDJCQUEyQixFQUFFLDRCQUE0QixFQUFFLE1BQU0sbUJBQW1CLENBQUM7QUFDbEgsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFN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