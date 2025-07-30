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
var FilePromptContentProvider_1;
import { PROMPT_LANGUAGE_ID } from '../promptTypes.js';
import { assert } from '../../../../../../base/common/assert.js';
import { CancellationError } from '../../../../../../base/common/errors.js';
import { IModelService } from '../../../../../../editor/common/services/model.js';
import { ILanguageService } from '../../../../../../editor/common/languages/language.js';
import { isPromptOrInstructionsFile } from '../config/promptFileLocations.js';
import { PromptContentsProviderBase } from './promptContentsProviderBase.js';
import { OpenFailed, NotPromptFile, ResolveError, FolderReference } from '../../promptFileReferenceErrors.js';
import { IFileService } from '../../../../../../platform/files/common/files.js';
/**
 * Prompt contents provider for a file on the disk referenced by
 * a provided {@link URI}.
 */
let FilePromptContentProvider = FilePromptContentProvider_1 = class FilePromptContentProvider extends PromptContentsProviderBase {
    get sourceName() {
        return 'file';
    }
    get languageId() {
        if (this.options.languageId) {
            return this.options.languageId;
        }
        const model = this.modelService.getModel(this.uri);
        if (model !== null) {
            return model.getLanguageId();
        }
        const inferredId = this.languageService
            .guessLanguageIdByFilepathOrFirstLine(this.uri);
        if (inferredId !== null) {
            return inferredId;
        }
        // fallback to the default prompt language ID
        return PROMPT_LANGUAGE_ID;
    }
    constructor(uri, options, fileService, modelService, languageService) {
        super(options);
        this.uri = uri;
        this.fileService = fileService;
        this.modelService = modelService;
        this.languageService = languageService;
        if (options.updateOnChange) {
            // make sure the object is updated on file changes
            this._register(this.fileService.onDidFilesChange((event) => {
                // if file was added or updated, forward the event to
                // the `getContentsStream()` produce a new stream for file contents
                if (event.contains(this.uri, 1 /* FileChangeType.ADDED */, 0 /* FileChangeType.UPDATED */)) {
                    // we support only full file parsing right now because
                    // the event doesn't contain a list of changed lines
                    this.onChangeEmitter.fire('full');
                    return;
                }
                // if file was deleted, forward the event to
                // the `getContentsStream()` produce an error
                if (event.contains(this.uri, 2 /* FileChangeType.DELETED */)) {
                    this.onChangeEmitter.fire(event);
                    return;
                }
            }));
        }
    }
    /**
     * Creates a stream of lines from the file based on the changes listed in
     * the provided event.
     *
     * @param event - event that describes the changes in the file; `'full'` is
     * 				  the special value that means that all contents have changed
     * @param cancellationToken - token that cancels this operation
     */
    async getContentsStream(_event, cancellationToken) {
        assert(!cancellationToken?.isCancellationRequested, new CancellationError());
        // get the binary stream of the file contents
        let fileStream;
        try {
            // ensure that the referenced URI points to a file before
            // trying to get a stream for its contents
            const info = await this.fileService.resolve(this.uri);
            // validate that the cancellation was not yet requested
            assert(!cancellationToken?.isCancellationRequested, new CancellationError());
            assert(info.isFile, new FolderReference(this.uri));
            const { allowNonPromptFiles } = this.options;
            // if URI doesn't point to a prompt file, don't try to resolve it,
            // unless the `allowNonPromptFiles` option is set to `true`
            if ((allowNonPromptFiles !== true) && (isPromptOrInstructionsFile(this.uri) === false)) {
                throw new NotPromptFile(this.uri);
            }
            fileStream = await this.fileService.readFileStream(this.uri);
            // after the promise above complete, this object can be already disposed or
            // the cancellation could be requested, in that case destroy the stream and
            // throw cancellation error
            if (this.isDisposed || cancellationToken?.isCancellationRequested) {
                fileStream.value.destroy();
                throw new CancellationError();
            }
            return fileStream.value;
        }
        catch (error) {
            if ((error instanceof ResolveError) || (error instanceof CancellationError)) {
                throw error;
            }
            throw new OpenFailed(this.uri, error);
        }
    }
    createNew(promptContentsSource, options) {
        return new FilePromptContentProvider_1(promptContentsSource.uri, options, this.fileService, this.modelService, this.languageService);
    }
    /**
     * String representation of this object.
     */
    toString() {
        return `file-prompt-contents-provider:${this.uri.path}`;
    }
};
FilePromptContentProvider = FilePromptContentProvider_1 = __decorate([
    __param(2, IFileService),
    __param(3, IModelService),
    __param(4, ILanguageService)
], FilePromptContentProvider);
export { FilePromptContentProvider };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmlsZVByb21wdENvbnRlbnRzUHJvdmlkZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9hZHZpa2FyL0RvY3VtZW50cy9hcmNoaXRlY3QvYXJjaDIvQXJjaElERS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2NvbW1vbi9wcm9tcHRTeW50YXgvY29udGVudFByb3ZpZGVycy9maWxlUHJvbXB0Q29udGVudHNQcm92aWRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sbUJBQW1CLENBQUM7QUFHdkQsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ2pFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBRzVFLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUNsRixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSx1REFBdUQsQ0FBQztBQUN6RixPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUM5RSxPQUFPLEVBQWtDLDBCQUEwQixFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDN0csT0FBTyxFQUFFLFVBQVUsRUFBRSxhQUFhLEVBQUUsWUFBWSxFQUFFLGVBQWUsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQzlHLE9BQU8sRUFBb0MsWUFBWSxFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFFbEg7OztHQUdHO0FBQ0ksSUFBTSx5QkFBeUIsaUNBQS9CLE1BQU0seUJBQTBCLFNBQVEsMEJBQTRDO0lBQzFGLElBQW9CLFVBQVU7UUFDN0IsT0FBTyxNQUFNLENBQUM7SUFDZixDQUFDO0lBRUQsSUFBb0IsVUFBVTtRQUM3QixJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMsVUFBVSxFQUFFLENBQUM7WUFDN0IsT0FBTyxJQUFJLENB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