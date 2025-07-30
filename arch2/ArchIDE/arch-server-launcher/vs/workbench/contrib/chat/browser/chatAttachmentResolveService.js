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
import { basename } from '../../../../base/common/resources.js';
import { URI } from '../../../../base/common/uri.js';
import { SymbolKinds } from '../../../../editor/common/languages.js';
import { ITextModelService } from '../../../../editor/common/services/resolverService.js';
import { localize } from '../../../../nls.js';
import { IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { MarkerSeverity } from '../../../../platform/markers/common/markers.js';
import { isUntitledResourceEditorInput } from '../../../common/editor.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { IExtensionService, isProposedApiEnabled } from '../../../services/extensions/common/extensions.js';
import { UntitledTextEditorInput } from '../../../services/untitled/common/untitledTextEditorInput.js';
import { createNotebookOutputVariableEntry, NOTEBOOK_CELL_OUTPUT_MIME_TYPE_LIST_FOR_CHAT_CONST } from '../../notebook/browser/contrib/chat/notebookChatUtils.js';
import { getOutputViewModelFromId } from '../../notebook/browser/controller/cellOutputActions.js';
import { getNotebookEditorFromEditorPane } from '../../notebook/browser/notebookBrowser.js';
import { CHAT_ATTACHABLE_IMAGE_MIME_TYPES, getAttachableImageExtension } from '../common/chatModel.js';
import { IDiagnosticVariableEntryFilterData, toPromptFileVariableEntry, PromptFileVariableKind } from '../common/chatVariableEntries.js';
import { getPromptsTypeForLanguageId, PromptsType } from '../common/promptSyntax/promptTypes.js';
import { imageToHash } from './chatPasteProviders.js';
import { resizeImage } from './imageUtils.js';
export const IChatAttachmentResolveService = createDecorator('IChatAttachmentResolveService');
let ChatAttachmentResolveService = class ChatAttachmentResolveService {
    constructor(fileService, editorService, textModelService, extensionService, dialogService) {
        this.fileService = fileService;
        this.editorService = editorService;
        this.textModelService = textModelService;
        this.extensionService = extensionService;
        this.dialogService = dialogService;
    }
    // --- EDITORS ---
    async resolveEditorAttachContext(editor) {
        // untitled editor
        if (isUntitledResourceEditorInput(editor)) {
            return await this.resolveUntitledEditorAttachContext(editor);
        }
        if (!editor.resource) {
            return undefined;
        }
        let stat;
        try {
            stat = await this.fileService.stat(editor.resource);
        }
        catch {
            return undefined;
        }
        if (!stat.isDirectory && !stat.isFile) {
            return undefined;
        }
        const imageContext = await this.resolveImageEditorAttachContext(editor.resource);
        if (imageContext) {
            return this.extensionService.extensions.some(ext => isProposedApiEnabled(ext, 'chatReferenceBinaryData')) ? imageContext : undefined;
        }
        return await this.resolveResourceAttachContext(editor.resource, stat.isDirectory);
    }
    async resolveUntitledEditorAttachContext(editor) {
        // If the resource is known, we can use it directly
        if (editor.resource) {
            return await this.resolveResourceAttachContext(editor.resource, false);
        }
        // Otherwise, we need to check if the contents are already open in another editor
        const openUntitledEditors = this.editorService.editors.filter(editor => editor instanceof UntitledTextEditorInput);
        for (const canidate of openUntitledEditors) {
            const model = await canidate.resolve();
            const contents = model.textEditorModel?.getValue();
            if (contents === editor.contents) {
                return await this.resolveResourceAttachContext(canidate.resource, false);
            }
        }
        return undefined;
    }
    async resolveResourceAttachContext(resource, isDirectory) {
        let omittedState = 0 /* OmittedState.NotOmitted */;
        if (!isDirectory) {
            let languageId;
            try {
                const createdModel = await this.textModelService.createModelReference(resource);
                languageId = createdModel.object.getLanguageId();
                createdModel.dispose();
            }
            catch {
                omittedState = 2 /* OmittedState.Full */;
            }
            if (/\.(svg)$/i.test(resource.path)) {
                omittedState = 2 /* OmittedState.Full */;
            }
            if (languageId) {
                const promptsType = getPromptsTypeForLanguageId(languageId);
                if (promptsType === PromptsType.prompt) {
                    return toPromptFileVariableEntry(resource, PromptFileVariableKind.PromptFile);
                }
                else if (promptsType === PromptsType.instructions) {
                    return toPromptFileVariableEntry(resource, PromptFileVariableKind.Instruction);
                }
            }
        }
        return {
            kind: isDirectory ? 'directory' : 'file',
            value: resource,
            id: resource.toString(),
            name: basename(resource),
            omittedState
        };
    }
    // --- IMAGES ---
    async resolveImageEditorAttachContext(resource, data, mimeType) {
        if (!resource) {
            return undefined;
        }
        if (mimeType) {
            if (!getAttachableImageExtension(mimeType)) {
                return undefined;
            }
        }
        else {
            const match = SUPPORTED_IMAGE_EXTENSIONS_REGEX.exec(resource.path);
            if (!match) {
                return undefined;
            }
            mimeType = getMimeTypeFromPath(match);
        }
        const fileName = basename(resource);
        let dataBuffer;
        if (data) {
            dataBuffer = data;
        }
        else {
            let stat;
            try {
                stat = await this.fileService.stat(resource);
            }
            catch {
                return undefined;
            }
            const readFile = await this.fileService.readFile(resource);
            if (stat.size > 30 * 1024 * 1024) { // 30 MB
                this.dialogService.error(localize('imageTooLarge', 'Image is too large'), localize('imageTooLargeMessage', 'The image {0} is too large to be attached.', fileName));
                throw new Error('Image is too large');
            }
            dataBuffer = readFile.value;
        }
        const isPartiallyOmitted = /\.gif$/i.test(resource.path);
        const imageFileContext = await this.resolveImageAttachContext([{
                id: resource.toString(),
                name: fileName,
                data: dataBuffer.buffer,
                icon: Codicon.fileMedia,
                resource: resource,
                mimeType: mimeType,
                omittedState: isPartiallyOmitted ? 1 /* OmittedState.Partial */ : 0 /* OmittedState.NotOmitted */
            }]);
        return imageFileContext[0];
    }
    resolveImageAttachContext(images) {
        return Promise.all(images.map(async (image) => ({
            id: image.id || await imageToHash(image.data),
            name: image.name,
            fullName: image.resource ? image.resource.path : undefined,
            value: await resizeImage(image.data, image.mimeType),
            icon: image.icon,
            kind: 'image',
            isFile: false,
            isDirectory: false,
            omittedState: image.omittedState || 0 /* OmittedState.NotOmitted */,
            references: image.resource ? [{ reference: image.resource, kind: 'reference' }] : []
        })));
    }
    // --- MARKERS ---
    resolveMarkerAttachContext(markers) {
        return markers.map((marker) => {
            let filter;
            if (!('severity' in marker)) {
                filter = { filterUri: URI.revive(marker.uri), filterSeverity: MarkerSeverity.Warning };
            }
            else {
                filter = IDiagnosticVariableEntryFilterData.fromMarker(marker);
            }
            return IDiagnosticVariableEntryFilterData.toEntry(filter);
        });
    }
    // --- SYMBOLS ---
    resolveSymbolsAttachContext(symbols) {
        return symbols.map(symbol => {
            const resource = URI.file(symbol.fsPath);
            return {
                kind: 'symbol',
                id: symbolId(resource, symbol.range),
                value: { uri: resource, range: symbol.range },
                symbolKind: symbol.kind,
                icon: SymbolKinds.toIcon(symbol.kind),
                fullName: symbol.name,
                name: symbol.name,
            };
        });
    }
    // --- NOTEBOOKS ---
    resolveNotebookOutputAttachContext(data) {
        const notebookEditor = getNotebookEditorFromEditorPane(this.editorService.activeEditorPane);
        if (!notebookEditor) {
            return [];
        }
        const outputViewModel = getOutputViewModelFromId(data.outputId, notebookEditor);
        if (!outputViewModel) {
            return [];
        }
        const mimeType = outputViewModel.pickedMimeType?.mimeType;
        if (mimeType && NOTEBOOK_CELL_OUTPUT_MIME_TYPE_LIST_FOR_CHAT_CONST.includes(mimeType)) {
            const entry = createNotebookOutputVariableEntry(outputViewModel, mimeType, notebookEditor);
            if (!entry) {
                return [];
            }
            return [entry];
        }
        return [];
    }
    // --- SOURCE CONTROL ---
    resolveSourceControlHistoryItemAttachContext(data) {
        return data.map(d => ({
            id: d.historyItem.id,
            name: d.name,
            value: URI.revive(d.resource),
            historyItem: {
                ...d.historyItem,
                references: []
            },
            kind: 'scmHistoryItem'
        }));
    }
};
ChatAttachmentResolveService = __decorate([
    __param(0, IFileService),
    __param(1, IEditorService),
    __param(2, ITextModelService),
    __param(3, IExtensionService),
    __param(4, IDialogService)
], ChatAttachmentResolveService);
export { ChatAttachmentResolveService };
function symbolId(resource, range) {
    let rangePart = '';
    if (range) {
        rangePart = `:${range.startLineNumber}`;
        if (range.startLineNumber !== range.endLineNumber) {
            rangePart += `-${range.endLineNumber}`;
        }
    }
    return resource.fsPath + rangePart;
}
const SUPPORTED_IMAGE_EXTENSIONS_REGEX = new RegExp(`\\.(${Object.keys(CHAT_ATTACHABLE_IMAGE_MIME_TYPES).join('|')})$`, 'i');
function getMimeTypeFromPath(match) {
    const ext = match[1].toLowerCase();
    return CHAT_ATTACHABLE_IMAGE_MIME_TYPES[ext];
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdEF0dGFjaG1lbnRSZXNvbHZlU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL2FkdmlrYXIvRG9jdW1lbnRzL2FyY2hpdGVjdC9hcmNoMi9BcmNoSURFL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvYnJvd3Nlci9jaGF0QXR0YWNobWVudFJlc29sdmVTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBR2hHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUM5RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFFaEUsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBRXJELE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUNyRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx1REFBdUQsQ0FBQztBQUMxRixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDOUMsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBRWhGLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUMxRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDN0YsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQ2hGLE9BQU8sRUFBRSw2QkFBNkIsRUFBRSxNQUFNLDJCQUEyQixDQUFDO0FBRTFFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUNsRixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUM1RyxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSw4REFBOEQsQ0FBQztBQUN2RyxPQUFPLEVBQUUsaUNBQWlD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