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
/**
 * Notes on what to implement next:
 *   - re-trigger suggestions dialog on `folder` selection because the `#file:` references take
 *     `file` paths, therefore a "folder" completion is never final
 *   - provide the same suggestions that the `#file:` variables in the chat input have, e.g.,
 *     recently used files, related files, etc.
 *   - support markdown links; markdown extension does sometimes provide the paths completions, but
 *     the prompt completions give more options (e.g., recently used files, related files, etc.)
 *   - add `Windows` support
 */
import { IPromptsService } from '../service/promptsService.js';
import { isOneOf } from '../../../../../../base/common/types.js';
import { dirname, extUri } from '../../../../../../base/common/resources.js';
import { Disposable } from '../../../../../../base/common/lifecycle.js';
import { CancellationError } from '../../../../../../base/common/errors.js';
import { ALL_PROMPTS_LANGUAGE_SELECTOR } from '../promptTypes.js';
import { assert, assertNever } from '../../../../../../base/common/assert.js';
import { IFileService } from '../../../../../../platform/files/common/files.js';
import { ILanguageFeaturesService } from '../../../../../../editor/common/services/languageFeatures.js';
/**
 * Finds a file reference that suites the provided `position`.
 */
function findFileReference(references, position) {
    for (const reference of references) {
        const { range } = reference;
        // ignore any other types of references
        if (reference.type !== 'file') {
            return undefined;
        }
        // this ensures that we handle only the `#file:` references for now
        if (reference.subtype !== 'prompt') {
            return undefined;
        }
        // reference must match the provided position
        const { startLineNumber, endColumn } = range;
        if ((startLineNumber !== position.lineNumber) || (endColumn !== position.column)) {
            continue;
        }
        return reference;
    }
    return undefined;
}
/**
 * Provides reference paths autocompletion for the `#file:` variables inside prompts.
 */
let PromptPathAutocompletion = class PromptPathAutocompletion extends Disposable {
    constructor(fileService, promptsService, languageService) {
        super();
        this.fileService = fileService;
        this.promptsService = promptsService;
        this.languageService = languageService;
        /**
         * Debug display name for this provider.
         */
        this._debugDisplayName = 'PromptPathAutocompletion';
        /**
         * List of trigger characters handled by this provider.
         */
        this.triggerCharacters = [':', '.', '/'];
        this._register(this.languageService.completionProvider.register(ALL_PROMPTS_LANGUAGE_SELECTOR, this));
    }
    /**
     * The main function of this provider that calculates
     * completion items based on the provided arguments.
     */
    async provideCompletionItems(model, position, context, token) {
        assert(!token.isCancellationRequested, new CancellationError());
        const { triggerCharacter } = context;
        // it must always have been triggered by a character
        if (!triggerCharacter) {
            return undefined;
        }
        assert(isOneOf(triggerCharacter, this.triggerCharacters), `Prompt path autocompletion provider`);
        const parser = this.promptsService.getSyntaxParserFor(model);
        assert(parser.isDisposed === false, 'Prompt parser must not be disposed.');
        // start the parser in case it was not started yet,
        // and wait for it to settle to a final result
        const completed = await parser.start(token).settled();
        if (!completed || token.isCancellationRequested) {
            return undefined;
        }
        const { references } = parser;
        const fileReference = findFileReference(references, position);
        if (!fileReference) {
            return undefined;
        }
        const parentFolder = dirname(parser.uri);
        // in the case of the '.' trigger character, we must check if this is the first
        // dot in the link path, otherwise the dot could be a part of a folder name
        if (triggerCharacter === ':' || (triggerCharacter === '.' && fileReference.path === '.')) {
            return {
                suggestions: await this.getFirstFolderSuggestions(triggerCharacter, parentFolder, fileReference),
            };
        }
        if (triggerCharacter === '/' || triggerCharacter === '.') {
            return {
                suggestions: await this.getNonFirstFolderSuggestions(triggerCharacter, parentFolder, fileReference),
            };
        }
        assertNever(triggerCharacter, `Unexpected trigger character '${triggerCharacter}'.`);
    }
    /**
     * Gets "raw" folder suggestions. Unlike the full completion items,
     * these ones do not have `insertText` and `range` properties which
     * are meant to be added by the caller later on.
     */
    async getFolderSuggestions(uri) {
        const { children } = await this.fileService.resolve(uri);
        const suggestions = [];
        // no `children` - no suggestions
        if (!children) {
            return suggestions;
        }
        for (const child of children) {
            const kind = child.isDirectory
                ? 23 /* CompletionItemKind.Folder */
                : 20 /* CompletionItemKind.File */;
            const sortText = child.isDirectory
                ? '1'
                : '2';
            suggestions.push({
                label: child.name,
                kind,
                sortText,
            });
        }
        return suggestions;
    }
    /**
     * Gets suggestions for a first folder/file name in the path. E.g., the one
     * that follows immediately after the `:` character of the `#file:` variable.
     *
     * The main difference between this and "subsequent" folder cases is that in
     * the beginning of the path the suggestions also contain the `..` item and
     * the `./` normalization prefix for relative paths.
     *
     * See also {@link getNonFirstFolderSuggestions}.
     */
    async getFirstFolderSuggestions(character, fileFolderUri, fileReference) {
        const { linkRange } = fileReference;
        // when character is `:`, there must be no link present yet
        // otherwise the `:` was used in the middle of the link hence
        // we don't want to provide suggestions for that
        if ((character === ':') && (linkRange !== undefined)) {
            return [];
        }
        // otherwise when the `.` character is present, it is inside the link part
        // of the reference, hence we always expect the link range to be present
        if ((character === '.') && (linkRange === undefined)) {
            return [];
        }
        const suggestions = await this.getFolderSuggestions(fileFolderUri);
        // replacement range for suggestions; when character is `.`, we want to also
        // replace it, because we add `./` at the beginning of all the relative paths
        const startColumnOffset = (character === '.') ? 1 : 0;
        const range = {
            ...fileReference.range,
            endColumn: fileReference.range.endColumn,
            startColumn: fileReference.range.endColumn - startColumnOffset,
        };
        return [
            {
                label: '..',
                kind: 23 /* CompletionItemKind.Folder */,
                insertText: '..',
                range,
                sortText: '0',
            },
            ...suggestions
                .map((suggestion) => {
                // add space at the end of file names since no completions
                // that follow the file name are expected anymore
                const suffix = (suggestion.kind === 20 /* CompletionItemKind.File */)
                    ? ' '
                    : '';
                return {
                    ...suggestion,
                    range,
                    label: `./${suggestion.label}${suffix}`,
                    // we use the `./` prefix for consistency
                    insertText: `./${suggestion.label}${suffix}`,
                };
            }),
        ];
    }
    /**
     * Gets suggestions for a folder/file name that follows after the first one.
     * See also {@link getFirstFolderSuggestions}.
     */
    async getNonFirstFolderSuggestions(character, fileFolderUri, fileReference) {
        const { linkRange, path } = fileReference;
        if (linkRange === undefined) {
            return [];
        }
        const currentFolder = extUri.resolvePath(fileFolderUri, path);
        let suggestions = await this.getFolderSuggestions(currentFolder);
        // when trigger character was a `.`, which is we know is inside
        // the folder/file name in the path, filter out to only items
        // that start with the dot instead of showing all of them
        if (character === '.') {
            suggestions = suggestions.filter((suggestion) => {
                return suggestion.label.startsWith('.');
            });
        }
        // replacement range of the suggestions
        // when character is `.` we want to also replace it too
        const startColumnOffset = (character === '.') ? 1 : 0;
        const range = {
            ...fileReference.range,
            endColumn: fileReference.range.endColumn,
            startColumn: fileReference.range.endColumn - startColumnOffset,
        };
        return suggestions
            .map((suggestion) => {
            // add space at the end of file names since no completions
            // that follow the file name are expected anymore
            const suffix = (suggestion.kind === 20 /* CompletionItemKind.File */)
                ? ' '
                : '';
            return {
                ...suggestion,
                insertText: `${suggestion.label}${suffix}`,
                range,
            };
        });
    }
};
PromptPathAutocompletion = __decorate([
    __param(0, IFileService),
    __param(1, IPromptsService),
    __param(2, ILanguageFeaturesService)
], PromptPathAutocompletion);
export { PromptPathAutocompletion };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvbXB0UGF0aEF1dG9jb21wbGV0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvYWR2aWthci9Eb2N1bWVudHMvYXJjaGl0ZWN0L2FyY2gyL0FyY2hJREUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9jb21tb24vcHJvbXB0U3ludGF4L2xhbmd1YWdlUHJvdmlkZXJzL3Byb21wdFBhdGhBdXRvY29tcGxldGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRzs7Ozs7Ozs7O0dBU0c7QUFFSCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFFL0QsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ2pFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFFN0UsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQ3hFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQzVFLE9BQU8sRUFBRSw2QkFBNkIsRUFBRSxNQUFNLG1CQUFtQixDQUFDO0FBR2xFLE9BQU8sRUFBRSxNQUFNLEVBQUUsV0FBVyxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDOUUsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBRWhGLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLDhEQUE4RCxDQUFDO0FBcUJ4Rzs7R0FFRztBQUNILFNBQVMsaUJBQWlCLENBQUMsVUFBdUMsRUFBRSxRQUFrQjtJQUNyRixLQUFLLE1BQU0sU0FBUyxJQUFJLFVBQVUsRUFBRSxDQUFDO1FBQ3BDLE1BQU0sRUFBRSxLQUFLLEVBQUUsR0FBRyxTQUFTLENBQUM7UUFFNUIsdUNBQXVDO1FBQ3ZDLElBQUksU0FBUyxDQUFDLElBQUksS0FBSyxNQUFNLEVBQUUsQ0FB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