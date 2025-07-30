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
import { PauseableEmitter } from '../../../../../base/common/event.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { IModelService } from '../../../../../editor/common/services/model.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { NotebookEditorWidget } from '../../../notebook/browser/notebookEditorWidget.js';
import { INotebookEditorService } from '../../../notebook/browser/services/notebookEditorService.js';
import { arrayContainsElementOrParent, isSearchTreeFileMatch, isSearchTreeFolderMatch, isSearchTreeFolderMatchWithResource, isSearchTreeMatch, isTextSearchHeading, mergeSearchResultEvents, SEARCH_RESULT_PREFIX } from './searchTreeCommon.js';
import { PlainTextSearchHeadingImpl } from './textSearchHeading.js';
import { AITextSearchHeadingImpl } from '../AISearch/aiSearchModel.js';
let SearchResultImpl = class SearchResultImpl extends Disposable {
    constructor(searchModel, instantiationService, modelService, notebookEditorService) {
        super();
        this.searchModel = searchModel;
        this.instantiationService = instantiationService;
        this.modelService = modelService;
        this.notebookEditorService = notebookEditorService;
        this._onChange = this._register(new PauseableEmitter({
            merge: mergeSearchResultEvents
        }));
        this.onChange = this._onChange.event;
        this._plainTextSearchResult = this._register(this.instantiationService.createInstance(PlainTextSearchHeadingImpl, this));
        this._aiTextSearchResult = this._register(this.instantiationService.createInstance(AITextSearchHeadingImpl, this));
        this._register(this._plainTextSearchResult.onChange((e) => this._onChange.fire(e)));
        this._register(this._aiTextSearchResult.onChange((e) => this._onChange.fire(e)));
        this.modelService.getModels().forEach(model => this.onModelAdded(model));
        this._register(this.modelService.onModelAdded(model => this.onModelAdded(model)));
        this._register(this.notebookEditorService.onDidAddNotebookEditor(widget => {
            if (widget instanceof NotebookEditorWidget) {
                this.onDidAddNotebookEditorWidget(widget);
            }
        }));
        this._id = SEARCH_RESULT_PREFIX + Date.now().toString();
    }
    id() {
        return this._id;
    }
    get plainTextSearchResult() {
        return this._plainTextSearchResult;
    }
    get aiTextSearchResult() {
        return this._aiTextSearchResult;
    }
    get children() {
        return this.textSearchResults;
    }
    get hasChildren() {
        return true; // should always have a Text Search Result for plain results.
    }
    get textSearchResults() {
        return [this._plainTextSearchResult, this._aiTextSearchResult];
    }
    async batchReplace(elementsToReplace) {
        try {
            this._onChange.pause();
            await Promise.all(elementsToReplace.map(async (elem) => {
                const parent = elem.parent();
                if ((isSearchTreeFolderMatch(parent) || isSearchTreeFileMatch(parent)) && arrayContainsElementOrParent(parent, elementsToReplace)) {
                    // skip any children who have parents in the array
                    return;
                }
                if (isSearchTreeFileMatch(elem)) {
                    await elem.parent().replace(elem);
                }
                else if (isSearchTreeMatch(elem)) {
                    await elem.parent().replace(elem);
                }
                else if (isSearchTreeFolderMatch(elem)) {
                    await elem.replaceAll();
                }
            }));
        }
        finally {
            this._onChange.resume();
        }
    }
    batchRemove(elementsToRemove) {
        // need to check that we aren't trying to remove elements twice
        const removedElems = [];
        try {
            this._onChange.pause();
            elementsToRemove.forEach((currentElement) => {
                if (!arrayContainsElementOrParent(currentElement, removedElems)) {
                    if (isTextSearchHeading(currentElement)) {
                        currentElement.hide();
                    }
                    else if (!isSearchTreeFolderMatch(currentElement) || isSearchTreeFolderMatchWithResource(currentElement)) {
                        if (isSearchTreeFileMatch(currentElement)) {
                            currentElement.parent().remove(currentElement);
                        }
                        else if (isSearchTreeMatch(currentElement)) {
                            currentElement.parent().remove(currentElement);
                        }
                        else if (isSearchTreeFolderMatchWithResource(currentElement)) {
                            currentElement.parent().remove(currentElement);
                        }
                        removedElems.push(currentElement);
                    }
                }
            });
        }
        finally {
            this._onChange.resume();
        }
    }
    get isDirty() {
        return this._aiTextSearchResult.isDirty || this._plainTextSearchResult.isDirty;
    }
    get query() {
        return this._plainTextSearchResult.query;
    }
    set query(query) {
        this._plainTextSearchResult.query = query;
    }
    setAIQueryUsingTextQuery(query) {
        if (!query) {
            query = this.query;
        }
        this.aiTextSearchResult.query = aiTextQueryFromTextQuery(query);
    }
    onDidAddNotebookEditorWidget(widget) {
        this._onWillChangeModelListener?.dispose();
        this._onWillChangeModelListener = widget.onWillChangeModel((model) => {
            if (model) {
                this.onNotebookEditorWidgetRemoved(widget, model?.uri);
            }
        });
        this._onDidChangeModelListener?.dispose();
        // listen to view model change as we are searching on both inputs and outputs
        this._onDidChangeModelListener = widget.onDidAttachViewModel(() => {
            if (widget.hasModel()) {
                this.onNotebookEditorWidgetAdded(widget, widget.textModel.uri);
            }
        });
    }
    folderMatches(ai = false) {
        if (ai) {
            return this._aiTextSearchResult.folderMatches();
        }
        return this._plainTextSearchResult.folderMatches();
    }
    onModelAdded(model) {
        const folderMatch = this._plainTextSearchResult.findFolderSubstr(model.uri);
        folderMatch?.bindModel(model);
    }
    async onNotebookEditorWidgetAdded(editor, resource) {
        const folderMatch = this._plainTextSearchResult.findFolderSubstr(resource);
        await folderMatch?.bindNotebookEditorWidget(editor, resource);
    }
    onNotebookEditorWidgetRemoved(editor, resource) {
        const folderMatch = this._plainTextSearchResult.findFolderSubstr(resource);
        folderMatch?.unbindNotebookEditorWidget(editor, resource);
    }
    add(allRaw, searchInstanceID, ai, silent = false) {
        this._plainTextSearchResult.hidden = false;
        if (ai) {
            this._aiTextSearchResult.add(allRaw, searchInstanceID, silent);
        }
        else {
            this._plainTextSearchResult.add(allRaw, searchInstanceID, silent);
        }
    }
    clear() {
        this._plainTextSearchResult.clear();
        this._aiTextSearchResult.clear();
    }
    remove(matches, ai = false) {
        if (ai) {
            this._aiTextSearchResult.remove(matches, ai);
        }
        this._plainTextSearchResult.remove(matches, ai);
    }
    replace(match) {
        return this._plainTextSearchResult.replace(match);
    }
    matches(ai) {
        if (ai === undefined) {
            return this._plainTextSearchResult.matches().concat(this._aiTextSearchResult.matches());
        }
        else if (ai === true) {
            return this._aiTextSearchResult.matches();
        }
        return this._plainTextSearchResult.matches();
    }
    isEmpty() {
        return this._plainTextSearchResult.isEmpty() && this._aiTextSearchResult.isEmpty();
    }
    fileCount(ignoreSemanticSearchResults = false) {
        if (ignoreSemanticSearchResults) {
            return this._plainTextSearchResult.fileCount();
        }
        return this._plainTextSearchResult.fileCount() + this._aiTextSearchResult.fileCount();
    }
    count(ignoreSemanticSearchResults = false) {
        if (ignoreSemanticSearchResults) {
            return this._plainTextSearchResult.count();
        }
        return this._plainTextSearchResult.count() + this._aiTextSearchResult.count();
    }
    setCachedSearchComplete(cachedSearchComplete, ai) {
        if (ai) {
            this._aiTextSearchResult.cachedSearchComplete = cachedSearchComplete;
        }
        else {
            this._plainTextSearchResult.cachedSearchComplete = cachedSearchComplete;
        }
    }
    getCachedSearchComplete(ai) {
        if (ai) {
            return this._aiTextSearchResult.cachedSearchComplete;
        }
        return this._plainTextSearchResult.cachedSearchComplete;
    }
    toggleHighlights(value, ai = false) {
        if (ai) {
            this._aiTextSearchResult.toggleHighlights(value);
        }
        else {
            this._plainTextSearchResult.toggleHighlights(value);
        }
    }
    getRangeHighlightDecorations(ai = false) {
        if (ai) {
            return this._aiTextSearchResult.rangeHighlightDecorations;
        }
        return this._plainTextSearchResult.rangeHighlightDecorations;
    }
    replaceAll(progress) {
        return this._plainTextSearchResult.replaceAll(progress);
    }
    async dispose() {
        this._aiTextSearchResult?.dispose();
        this._plainTextSearchResult?.dispose();
        this._onWillChangeModelListener?.dispose();
        this._onDidChangeModelListener?.dispose();
        super.dispose();
    }
};
SearchResultImpl = __decorate([
    __param(1, IInstantiationService),
    __param(2, IModelService),
    __param(3, INotebookEditorService)
], SearchResultImpl);
export { SearchResultImpl };
function aiTextQueryFromTextQuery(query) {
    return query === null ? null : { ...query, contentPattern: query.contentPattern.pattern, type: 3 /* QueryType.aiText */ };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VhcmNoUmVzdWx0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvYWR2aWthci9Eb2N1bWVudHMvYXJjaGl0ZWN0L2FyY2gyL0FyY2hJREUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvc2VhcmNoL2Jyb3dzZXIvc2VhcmNoVHJlZU1vZGVsL3NlYXJjaFJlc3VsdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQVMsZ0JBQWdCLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUM5RSxPQUFPLEVBQUUsVUFBVSxFQUFlLE1BQU0seUNBQXlDLENBQUM7QUFHbEYsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQy9FLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFDO0FBRXRHLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBQ3pGLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLDZEQUE2RCxDQUFDO0FBRXJHLE9BQU8sRUFBRSw0QkFBNEIsRUFBb0gscUJBQXFCLEVBQUUsdUJBQXVCLEVBQUUsbUNBQW1DLEVBQUUsaUJBQWlCLEVBQUUsbUJBQW1CLEVBQXNCLHVCQUF1QixFQUFtQixvQkFBb0IsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBR3hZLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLHdCQUF3QixDQUFDO0FBQ3BFLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBRWhFLElBQU0sZ0JBQWdCLEdBQXRCLE1BQU0sZ0JBQWlCLFNBQVEsVUFBVTtJQVkvQyxZQUNpQixXQUF5QixFQUNsQixvQkFBNEQsRUFDcEUsWUFBNEMsRUFDbkMscUJBQThEO1FBRXRGLEtBQUssRUFBRSxDQUFDO1FBTFEsZ0JBQVcsR0FBWCxXQUFXLENBQWM7UUFDRCx5QkFBb0IsR0FBcEIsb0JB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