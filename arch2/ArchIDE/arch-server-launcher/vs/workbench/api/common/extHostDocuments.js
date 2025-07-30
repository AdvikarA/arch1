/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter } from '../../../base/common/event.js';
import { DisposableStore } from '../../../base/common/lifecycle.js';
import { URI } from '../../../base/common/uri.js';
import { MainContext } from './extHost.protocol.js';
import { setWordDefinitionFor } from './extHostDocumentData.js';
import * as TypeConverters from './extHostTypeConverters.js';
import { assertReturnsDefined } from '../../../base/common/types.js';
import { deepFreeze } from '../../../base/common/objects.js';
import { TextDocumentChangeReason } from './extHostTypes.js';
export class ExtHostDocuments {
    constructor(mainContext, documentsAndEditors) {
        this._onDidAddDocument = new Emitter();
        this._onDidRemoveDocument = new Emitter();
        this._onDidChangeDocument = new Emitter();
        this._onDidChangeDocumentWithReason = new Emitter();
        this._onDidSaveDocument = new Emitter();
        this.onDidAddDocument = this._onDidAddDocument.event;
        this.onDidRemoveDocument = this._onDidRemoveDocument.event;
        this.onDidChangeDocument = this._onDidChangeDocument.event;
        this.onDidChangeDocumentWithReason = this._onDidChangeDocumentWithReason.event;
        this.onDidSaveDocument = this._onDidSaveDocument.event;
        this._toDispose = new DisposableStore();
        this._documentLoader = new Map();
        this._proxy = mainContext.getProxy(MainContext.MainThreadDocuments);
        this._documentsAndEditors = documentsAndEditors;
        this._documentsAndEditors.onDidRemoveDocuments(documents => {
            for (const data of documents) {
                this._onDidRemoveDocument.fire(data.document);
            }
        }, undefined, this._toDispose);
        this._documentsAndEditors.onDidAddDocuments(documents => {
            for (const data of documents) {
                this._onDidAddDocument.fire(data.document);
            }
        }, undefined, this._toDispose);
    }
    dispose() {
        this._toDispose.dispose();
    }
    getAllDocumentData() {
        return [...this._documentsAndEditors.allDocuments()];
    }
    getDocumentData(resource) {
        if (!resource) {
            return undefined;
        }
        const data = this._documentsAndEditors.getDocument(resource);
        if (data) {
            return data;
        }
        return undefined;
    }
    getDocument(resource) {
        const data = this.getDocumentData(resource);
        if (!data?.document) {
            throw new Error(`Unable to retrieve document from URI '${resource}'`);
        }
        return data.document;
    }
    ensureDocumentData(uri, options) {
        const cached = this._documentsAndEditors.getDocument(uri);
        if (cached && (!options?.encoding || cached.document.encoding === options.encoding)) {
            return Promise.resolve(cached);
        }
        let promise = this._documentLoader.get(uri.toString());
        if (!promise) {
            promise = this._proxy.$tryOpenDocument(uri, options).then(uriData => {
                this._documentLoader.delete(uri.toString());
                const canonicalUri = URI.revive(uriData);
                return assertReturnsDefined(this._documentsAndEditors.getDocument(canonicalUri));
            }, err => {
                this._documentLoader.delete(uri.toString());
                return Promise.reject(err);
            });
            this._documentLoader.set(uri.toString(), promise);
        }
        else {
            if (options?.encoding) {
                promise = promise.then(data => {
                    if (data.document.encoding !== options.encoding) {
                        return this.ensureDocumentData(uri, options);
                    }
                    return data;
                });
            }
        }
        return promise;
    }
    createDocumentData(options) {
        return this._proxy.$tryCreateDocument(options).then(data => URI.revive(data));
    }
    $acceptModelLanguageChanged(uriComponents, newLanguageId) {
        const uri = URI.revive(uriComponents);
        const data = this._documentsAndEditors.getDocument(uri);
        if (!data) {
            throw new Error('unknown document');
        }
        // Treat a language change as a remove + add
        this._onDidRemoveDocument.fire(data.document);
        data._acceptLanguageId(newLanguageId);
        this._onDidAddDocument.fire(data.document);
    }
    $acceptModelSaved(uriComponents) {
        const uri = URI.revive(uriComponents);
        const data = this._documentsAndEditors.getDocument(uri);
        if (!data) {
            throw new Error('unknown document');
        }
        this.$acceptDirtyStateChanged(uriComponents, false);
        this._onDidSaveDocument.fire(data.document);
    }
    $acceptDirtyStateChanged(uriComponents, isDirty) {
        const uri = URI.revive(uriComponents);
        const data = this._documentsAndEditors.getDocument(uri);
        if (!data) {
            throw new Error('unknown document');
        }
        data._acceptIsDirty(isDirty);
        this._onDidChangeDocument.fire({
            document: data.document,
            contentChanges: [],
            reason: undefined,
        });
        this._onDidChangeDocumentWithReason.fire({
            document: data.document,
            contentChanges: [],
            reason: undefined,
            detailedReason: undefined,
        });
    }
    $acceptEncodingChanged(uriComponents, encoding) {
        const uri = URI.revive(uriComponents);
        const data = this._documentsAndEditors.getDocument(uri);
        if (!data) {
            throw new Error('unknown document');
        }
        data._acceptEncoding(encoding);
        this._onDidChangeDocument.fire({
            document: data.document,
            contentChanges: [],
            reason: undefined,
        });
        this._onDidChangeDocumentWithReason.fire({
            document: data.document,
            contentChanges: [],
            reason: undefined,
            detailedReason: undefined,
        });
    }
    $acceptModelChanged(uriComponents, events, isDirty) {
        const uri = URI.revive(uriComponents);
        const data = this._documentsAndEditors.getDocument(uri);
        if (!data) {
            throw new Error('unknown document');
        }
        data._acceptIsDirty(isDirty);
        data.onEvents(events);
        let reason = undefined;
        if (events.isUndoing) {
            reason = TextDocumentChangeReason.Undo;
        }
        else if (events.isRedoing) {
            reason = TextDocumentChangeReason.Redo;
        }
        this._onDidChangeDocument.fire(deepFreeze({
            document: data.document,
            contentChanges: events.changes.map((change) => {
                return {
                    range: TypeConverters.Range.to(change.range),
                    rangeOffset: change.rangeOffset,
                    rangeLength: change.rangeLength,
                    text: change.text
                };
            }),
            reason,
        }));
        this._onDidChangeDocumentWithReason.fire(deepFreeze({
            document: data.document,
            contentChanges: events.changes.map((change) => {
                return {
                    range: TypeConverters.Range.to(change.range),
                    rangeOffset: change.rangeOffset,
                    rangeLength: change.rangeLength,
                    text: change.text
                };
            }),
            reason,
            detailedReason: events.detailedReason ? {
                source: events.detailedReason.source,
                metadata: events.detailedReason,
            } : undefined,
        }));
    }
    setWordDefinitionFor(languageId, wordDefinition) {
        setWordDefinitionFor(languageId, wordDefinition);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdERvY3VtZW50cy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL2FkdmlrYXIvRG9jdW1lbnRzL2FyY2hpdGVjdC9hcmNoMi9BcmNoSURFL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvY29tbW9uL2V4dEhvc3REb2N1bWVudHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLCtCQUErQixDQUFDO0FBQy9ELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUNwRSxPQUFPLEVBQUUsR0FBRyxFQUFpQixNQUFNLDZCQUE2QixDQUFDO0FBQ2pFLE9BQU8sRUFBdUMsV0FBVyxFQUE0QixNQUFNLHVCQUF1QixDQUFDO0FBQ25ILE9BQU8sRUFBdUIsb0JBQW9CLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQUVyRixPQUFPLEtBQUssY0FBYyxNQUFNLDRCQUE0QixDQUFDO0FBRTdELE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQ3JFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUM3RCxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxtQkFBbUIsQ0FBQztBQUc3RCxNQUFNLE9BQU8sZ0JBQWdCO0lBbUI1QixZQUFZLFdBQXlCLEVBQUUsbUJBQStDO1FBakJyRSxzQkFBaUIsR0FBRyxJQUFJLE9BQU8sRUFBdUIsQ0FBQztRQUN2RCx5QkFBb0IsR0FBRyxJQUFJLE9BQU8sRUFBdUIsQ0FBQztRQUMxRCx5QkFBb0IsR0FBRyxJQUFJLE9BQU8sRUFBMEQsQ0FBQztRQUM3RixtQ0FBOEIsR0FBRyxJQUFJLE9BQU8sRUFBa0MsQ0FBQztRQUMvRSx1QkFBa0IsR0FBRyxJQUFJLE9BQU8sRUFBdUIsQ0FBQztRQUVoRSxxQkFBZ0IsR0FBK0IsSUFBSSxDQUFDLGlCQUFpQixDQUFDLEtBQUss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