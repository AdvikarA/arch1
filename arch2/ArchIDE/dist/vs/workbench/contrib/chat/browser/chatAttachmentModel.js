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
import { URI } from '../../../../base/common/uri.js';
import { Emitter } from '../../../../base/common/event.js';
import { basename } from '../../../../base/common/resources.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { isPromptFileVariableEntry } from '../common/chatVariableEntries.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { ISharedWebContentExtractorService } from '../../../../platform/webContentExtractor/common/webContentExtractor.js';
import { Schemas } from '../../../../base/common/network.js';
import { IChatAttachmentResolveService } from './chatAttachmentResolveService.js';
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { equals } from '../../../../base/common/objects.js';
import { Iterable } from '../../../../base/common/iterator.js';
let ChatAttachmentModel = class ChatAttachmentModel extends Disposable {
    constructor(fileService, webContentExtractorService, chatAttachmentResolveService) {
        super();
        this.fileService = fileService;
        this.webContentExtractorService = webContentExtractorService;
        this.chatAttachmentResolveService = chatAttachmentResolveService;
        this._attachments = new Map();
        this._onDidChange = this._register(new Emitter());
        this.onDidChange = this._onDidChange.event;
    }
    get attachments() {
        return Array.from(this._attachments.values());
    }
    get size() {
        return this._attachments.size;
    }
    get fileAttachments() {
        return this.attachments.filter(file => file.kind === 'file' && URI.isUri(file.value))
            .map(file => file.value);
    }
    getAttachmentIDs() {
        return new Set(this._attachments.keys());
    }
    async addFile(uri, range) {
        if (/\.(png|jpe?g|gif|bmp|webp)$/i.test(uri.path)) {
            const context = await this.asImageVariableEntry(uri);
            if (context) {
                this.addContext(context);
            }
            return;
        }
        else {
            this.addContext(this.asFileVariableEntry(uri, range));
        }
    }
    addFolder(uri) {
        this.addContext({
            kind: 'directory',
            value: uri,
            id: uri.toString(),
            name: basename(uri),
        });
    }
    clear(clearStickyAttachments = false) {
        if (clearStickyAttachments) {
            const deleted = Array.from(this._attachments.keys());
            this._attachments.clear();
            this._onDidChange.fire({ deleted, added: [], updated: [] });
        }
        else {
            const deleted = [];
            const allIds = Array.from(this._attachments.keys());
            for (const id of allIds) {
                const entry = this._attachments.get(id);
                if (entry && !isPromptFileVariableEntry(entry)) {
                    this._attachments.delete(id);
                    deleted.push(id);
                }
            }
            this._onDidChange.fire({ deleted, added: [], updated: [] });
        }
    }
    addContext(...attachments) {
        attachments = attachments.filter(attachment => !this._attachments.has(attachment.id));
        this.updateContext(Iterable.empty(), attachments);
    }
    clearAndSetContext(...attachments) {
        this.updateContext(Array.from(this._attachments.keys()), attachments);
    }
    delete(...variableEntryIds) {
        this.updateContext(variableEntryIds, Iterable.empty());
    }
    updateContext(toDelete, upsert) {
        const deleted = [];
        const added = [];
        const updated = [];
        for (const id of toDelete) {
            const item = this._attachments.get(id);
            if (item) {
                this._attachments.delete(id);
                deleted.push(id);
            }
        }
        for (const item of upsert) {
            const oldItem = this._attachments.get(item.id);
            if (!oldItem) {
                this._attachments.set(item.id, item);
                added.push(item);
            }
            else if (!equals(oldItem, item)) {
                this._attachments.set(item.id, item);
                updated.push(item);
            }
        }
        if (deleted.length > 0 || added.length > 0 || updated.length > 0) {
            this._onDidChange.fire({ deleted, added, updated });
        }
    }
    // ---- create utils
    asFileVariableEntry(uri, range) {
        return {
            kind: 'file',
            value: range ? { uri, range } : uri,
            id: uri.toString() + (range?.toString() ?? ''),
            name: basename(uri),
        };
    }
    // Gets an image variable for a given URI, which may be a file or a web URL
    async asImageVariableEntry(uri) {
        if (uri.scheme === Schemas.file && await this.fileService.canHandleResource(uri)) {
            return await this.chatAttachmentResolveService.resolveImageEditorAttachContext(uri);
        }
        else if (uri.scheme === Schemas.http || uri.scheme === Schemas.https) {
            const extractedImages = await this.webContentExtractorService.readImage(uri, CancellationToken.None);
            if (extractedImages) {
                return await this.chatAttachmentResolveService.resolveImageEditorAttachContext(uri, extractedImages);
            }
        }
        return undefined;
    }
};
ChatAttachmentModel = __decorate([
    __param(0, IFileService),
    __param(1, ISharedWebContentExtractorService),
    __param(2, IChatAttachmentResolveService)
], ChatAttachmentModel);
export { ChatAttachmentModel };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdEF0dGFjaG1lbnRNb2RlbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL2FkdmlrYXIvRG9jdW1lbnRzL2FyY2hpdGVjdC9hcmNoMi9BcmNoSURFL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvYnJvd3Nlci9jaGF0QXR0YWNobWVudE1vZGVsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUNyRCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDM0QsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBRWhFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNsRSxPQUFPLEVBQW9ELHlCQUF5QixFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDL0gsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQzFFLE9BQU8sRUFBRSxpQ0FBaUMsRUFBRSxNQUFNLHdFQUF3RSxDQUFDO0FBQzNILE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUM3RCxPQUFPLEVBQUUsNkJBQTZCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUNsRixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUM1RSxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDNUQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBUXhELElBQU0sbUJBQW1CLEdBQXpCLE1BQU0sbUJBQW9CLFNBQVEsVUFBVTtJQU9sRCxZQUNlLFdBQTBDLEVBQ3JCLDBCQUE4RSxFQUNsRiw0QkFBNEU7UUFFM0csS0FBSyxFQUFFLENBQUM7UUFKdUIsZ0JBQVcsR0FBWCxXQUFXLENBQWM7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