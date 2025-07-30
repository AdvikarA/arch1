/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { DataTransfers } from '../../../base/browser/dnd.js';
import { mainWindow } from '../../../base/browser/window.js';
import { coalesce } from '../../../base/common/arrays.js';
import { DeferredPromise } from '../../../base/common/async.js';
import { VSBuffer } from '../../../base/common/buffer.js';
import { ResourceMap } from '../../../base/common/map.js';
import { parse } from '../../../base/common/marshalling.js';
import { Schemas } from '../../../base/common/network.js';
import { isNative, isWeb } from '../../../base/common/platform.js';
import { URI } from '../../../base/common/uri.js';
import { localize } from '../../../nls.js';
import { IDialogService } from '../../dialogs/common/dialogs.js';
import { HTMLFileSystemProvider } from '../../files/browser/htmlFileSystemProvider.js';
import { WebFileSystemAccess } from '../../files/browser/webFileSystemAccess.js';
import { ByteSize, IFileService } from '../../files/common/files.js';
import { IInstantiationService } from '../../instantiation/common/instantiation.js';
import { extractSelection } from '../../opener/common/opener.js';
import { Registry } from '../../registry/common/platform.js';
//#region Editor / Resources DND
export const CodeDataTransfers = {
    EDITORS: 'CodeEditors',
    FILES: 'CodeFiles',
    SYMBOLS: 'application/vnd.code.symbols',
    MARKERS: 'application/vnd.code.diagnostics',
    NOTEBOOK_CELL_OUTPUT: 'notebook-cell-output',
    SCM_HISTORY_ITEM: 'scm-history-item',
};
export function extractEditorsDropData(e) {
    const editors = [];
    if (e.dataTransfer && e.dataTransfer.types.length > 0) {
        // Data Transfer: Code Editors
        const rawEditorsData = e.dataTransfer.getData(CodeDataTransfers.EDITORS);
        if (rawEditorsData) {
            try {
                editors.push(...parse(rawEditorsData));
            }
            catch (error) {
                // Invalid transfer
            }
        }
        // Data Transfer: Resources
        else {
            try {
                const rawResourcesData = e.dataTransfer.getData(DataTransfers.RESOURCES);
                editors.push(...createDraggedEditorInputFromRawResourcesData(rawResourcesData));
            }
            catch (error) {
                // Invalid transfer
            }
        }
        // Check for native file transfer
        if (e.dataTransfer?.files) {
            for (let i = 0; i < e.dataTransfer.files.length; i++) {
                const file = e.dataTransfer.files[i];
                if (file && getPathForFile(file)) {
                    try {
                        editors.push({ resource: URI.file(getPathForFile(file)), isExternal: true, allowWorkspaceOpen: true });
                    }
                    catch (error) {
                        // Invalid URI
                    }
                }
            }
        }
        // Check for CodeFiles transfer
        const rawCodeFiles = e.dataTransfer.getData(CodeDataTransfers.FILES);
        if (rawCodeFiles) {
            try {
                const codeFiles = JSON.parse(rawCodeFiles);
                for (const codeFile of codeFiles) {
                    editors.push({ resource: URI.file(codeFile), isExternal: true, allowWorkspaceOpen: true });
                }
            }
            catch (error) {
                // Invalid transfer
            }
        }
        // Workbench contributions
        const contributions = Registry.as(Extensions.DragAndDropContribution).getAll();
        for (const contribution of contributions) {
            const data = e.dataTransfer.getData(contribution.dataFormatKey);
            if (data) {
                try {
                    editors.push(...contribution.getEditorInputs(data));
                }
                catch (error) {
                    // Invalid transfer
                }
            }
        }
    }
    // Prevent duplicates: it is possible that we end up with the same
    // dragged editor multiple times because multiple data transfers
    // are being used (https://github.com/microsoft/vscode/issues/128925)
    const coalescedEditors = [];
    const seen = new ResourceMap();
    for (const editor of editors) {
        if (!editor.resource) {
            coalescedEditors.push(editor);
        }
        else if (!seen.has(editor.resource)) {
            coalescedEditors.push(editor);
            seen.set(editor.resource, true);
        }
    }
    return coalescedEditors;
}
export async function extractEditorsAndFilesDropData(accessor, e) {
    const editors = extractEditorsDropData(e);
    // Web: Check for file transfer
    if (e.dataTransfer && isWeb && containsDragType(e, DataTransfers.FILES)) {
        const files = e.dataTransfer.items;
        if (files) {
            const instantiationService = accessor.get(IInstantiationService);
            const filesData = await instantiationService.invokeFunction(accessor => extractFilesDropData(accessor, e));
            for (const fileData of filesData) {
                editors.push({ resource: fileData.resource, contents: fileData.contents?.toString(), isExternal: true, allowWorkspaceOpen: fileData.isDirectory });
            }
        }
    }
    return editors;
}
export function createDraggedEditorInputFromRawResourcesData(rawResourcesData) {
    const editors = [];
    if (rawResourcesData) {
        const resourcesRaw = JSON.parse(rawResourcesData);
        for (const resourceRaw of resourcesRaw) {
            if (resourceRaw.indexOf(':') > 0) { // mitigate https://github.com/microsoft/vscode/issues/124946
                const { selection, uri } = extractSelection(URI.parse(resourceRaw));
                editors.push({ resource: uri, options: { selection } });
            }
        }
    }
    return editors;
}
async function extractFilesDropData(accessor, event) {
    // Try to extract via `FileSystemHandle`
    if (WebFileSystemAccess.supported(mainWindow)) {
        const items = event.dataTransfer?.items;
        if (items) {
            return extractFileTransferData(accessor, items);
        }
    }
    // Try to extract via `FileList`
    const files = event.dataTransfer?.files;
    if (!files) {
        return [];
    }
    return extractFileListData(accessor, files);
}
async function extractFileTransferData(accessor, items) {
    const fileSystemProvider = accessor.get(IFileService).getProvider(Schemas.file);
    // eslint-disable-next-line no-restricted-syntax
    if (!(fileSystemProvider instanceof HTMLFileSystemProvider)) {
        return []; // only supported when running in web
    }
    const results = [];
    for (let i = 0; i < items.length; i++) {
        const file = items[i];
        if (file) {
            const result = new DeferredPromise();
            results.push(result);
            (async () => {
                try {
                    const handle = await file.getAsFileSystemHandle();
                    if (!handle) {
                        result.complete(undefined);
                        return;
                    }
                    if (WebFileSystemAccess.isFileSystemFileHandle(handle)) {
                        result.complete({
                            resource: await fileSystemProvider.registerFileHandle(handle),
                            isDirectory: false
                        });
                    }
                    else if (WebFileSystemAccess.isFileSystemDirectoryHandle(handle)) {
                        result.complete({
                            resource: await fileSystemProvider.registerDirectoryHandle(handle),
                            isDirectory: true
                        });
                    }
                    else {
                        result.complete(undefined);
                    }
                }
                catch (error) {
                    result.complete(undefined);
                }
            })();
        }
    }
    return coalesce(await Promise.all(results.map(result => result.p)));
}
export async function extractFileListData(accessor, files) {
    const dialogService = accessor.get(IDialogService);
    const results = [];
    for (let i = 0; i < files.length; i++) {
        const file = files.item(i);
        if (file) {
            // Skip for very large files because this operation is unbuffered
            if (file.size > 100 * ByteSize.MB) {
                dialogService.warn(localize('fileTooLarge', "File is too large to open as untitled editor. Please upload it first into the file explorer and then try again."));
                continue;
            }
            const result = new DeferredPromise();
            results.push(result);
            const reader = new FileReader();
            reader.onerror = () => result.complete(undefined);
            reader.onabort = () => result.complete(undefined);
            reader.onload = async (event) => {
                const name = file.name;
                const loadResult = event.target?.result ?? undefined;
                if (typeof name !== 'string' || typeof loadResult === 'undefined') {
                    result.complete(undefined);
                    return;
                }
                result.complete({
                    resource: URI.from({ scheme: Schemas.untitled, path: name }),
                    contents: typeof loadResult === 'string' ? VSBuffer.fromString(loadResult) : VSBuffer.wrap(new Uint8Array(loadResult))
                });
            };
            // Start reading
            reader.readAsArrayBuffer(file);
        }
    }
    return coalesce(await Promise.all(results.map(result => result.p)));
}
//#endregion
export function containsDragType(event, ...dragTypesToFind) {
    if (!event.dataTransfer) {
        return false;
    }
    const dragTypes = event.dataTransfer.types;
    const lowercaseDragTypes = [];
    for (let i = 0; i < dragTypes.length; i++) {
        lowercaseDragTypes.push(dragTypes[i].toLowerCase()); // somehow the types are lowercase
    }
    for (const dragType of dragTypesToFind) {
        if (lowercaseDragTypes.indexOf(dragType.toLowerCase()) >= 0) {
            return true;
        }
    }
    return false;
}
class DragAndDropContributionRegistry {
    constructor() {
        this._contributions = new Map();
    }
    register(contribution) {
        if (this._contributions.has(contribution.dataFormatKey)) {
            throw new Error(`A drag and drop contributiont with key '${contribution.dataFormatKey}' was already registered.`);
        }
        this._contributions.set(contribution.dataFormatKey, contribution);
    }
    getAll() {
        return this._contributions.values();
    }
}
export const Extensions = {
    DragAndDropContribution: 'workbench.contributions.dragAndDrop'
};
Registry.add(Extensions.DragAndDropContribution, new DragAndDropContributionRegistry());
//#endregion
//#region DND Utilities
/**
 * A singleton to store transfer data during drag & drop operations that are only valid within the application.
 */
export class LocalSelectionTransfer {
    static { this.INSTANCE = new LocalSelectionTransfer(); }
    constructor() {
        // protect against external instantiation
    }
    static getInstance() {
        return LocalSelectionTransfer.INSTANCE;
    }
    hasData(proto) {
        return proto && proto === this.proto;
    }
    clearData(proto) {
        if (this.hasData(proto)) {
            this.proto = undefined;
            this.data = undefined;
        }
    }
    getData(proto) {
        if (this.hasData(proto)) {
            return this.data;
        }
        return undefined;
    }
    setData(data, proto) {
        if (proto) {
            this.data = data;
            this.proto = proto;
        }
    }
}
function setDataAsJSON(e, kind, data) {
    e.dataTransfer?.setData(kind, JSON.stringify(data));
}
function getDataAsJSON(e, kind, defaultValue) {
    const rawSymbolsData = e.dataTransfer?.getData(kind);
    if (rawSymbolsData) {
        try {
            return JSON.parse(rawSymbolsData);
        }
        catch (error) {
            // Invalid transfer
        }
    }
    return defaultValue;
}
export function extractSymbolDropData(e) {
    return getDataAsJSON(e, CodeDataTransfers.SYMBOLS, []);
}
export function fillInSymbolsDragData(symbolsData, e) {
    setDataAsJSON(e, CodeDataTransfers.SYMBOLS, symbolsData);
}
export function extractMarkerDropData(e) {
    return getDataAsJSON(e, CodeDataTransfers.MARKERS, undefined);
}
export function fillInMarkersDragData(markerData, e) {
    setDataAsJSON(e, CodeDataTransfers.MARKERS, markerData);
}
export function extractNotebookCellOutputDropData(e) {
    return getDataAsJSON(e, CodeDataTransfers.NOTEBOOK_CELL_OUTPUT, undefined);
}
/**
 * A helper to get access to Electrons `webUtils.getPathForFile` function
 * in a safe way without crashing the application when running in the web.
 */
export function getPathForFile(file) {
    if (isNative && typeof globalThis.vscode?.webUtils?.getPathForFile === 'function') {
        return globalThis.vscode.webUtils.getPathForFile(file);
    }
    return undefined;
}
//#endregion
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZG5kLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvYWR2aWthci9Eb2N1bWVudHMvYXJjaGl0ZWN0L2FyY2gyL0FyY2hJREUvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vZG5kL2Jyb3dzZXIvZG5kLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUM3RCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFFN0QsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQzFELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUNoRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDMUQsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBQzFELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUM1RCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDMUQsT0FBTyxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUNuRSxPQUFPLEVBQUUsR0FBRyxFQUFpQixNQUFNLDZCQUE2QixDQUFDO0FBQ2pFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQztBQUMzQyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFFakUsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sK0NBQStDLENBQUM7QUFDdkYsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDakYsT0FBTyxFQUFFLFFBQVEsRUFBRSxZQUFZLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUNyRSxPQUFPLEVBQUUscUJBQXFCLEVBQW9CLE1BQU0sNkNBQTZDLENB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