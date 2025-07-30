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
import { Disposable } from '../../../../base/common/lifecycle.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { localize } from '../../../../nls.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { getExcludes, ISearchService, VIEW_ID } from '../../../services/search/common/search.js';
import { IViewsService } from '../../../services/views/common/viewsService.js';
import { IChatContextPickService, picksWithPromiseFn } from '../../chat/browser/chatContextPickService.js';
import { SearchContext } from '../common/constants.js';
import { SearchView } from './searchView.js';
import { basename, dirname, joinPath, relativePath } from '../../../../base/common/resources.js';
import { compare } from '../../../../base/common/strings.js';
import { ILanguageService } from '../../../../editor/common/languages/language.js';
import { getIconClasses } from '../../../../editor/common/services/getIconClasses.js';
import { IModelService } from '../../../../editor/common/services/model.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { FileKind, FileType, IFileService } from '../../../../platform/files/common/files.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { IHistoryService } from '../../../services/history/common/history.js';
import { isCancellationError } from '../../../../base/common/errors.js';
import * as glob from '../../../../base/common/glob.js';
import { ResourceSet } from '../../../../base/common/map.js';
import { SymbolsQuickAccessProvider } from './symbolsQuickAccess.js';
import { SymbolKinds } from '../../../../editor/common/languages.js';
let SearchChatContextContribution = class SearchChatContextContribution extends Disposable {
    static { this.ID = 'workbench.contributions.searchChatContextContribution'; }
    constructor(instantiationService, chatContextPickService) {
        super();
        this._store.add(chatContextPickService.registerChatContextItem(instantiationService.createInstance(SearchViewResultChatContextPick)));
        this._store.add(chatContextPickService.registerChatContextItem(instantiationService.createInstance(FilesAndFoldersPickerPick)));
        this._store.add(chatContextPickService.registerChatContextItem(this._store.add(instantiationService.createInstance(SymbolsContextPickerPick))));
    }
};
SearchChatContextContribution = __decorate([
    __param(0, IInstantiationService),
    __param(1, IChatContextPickService)
], SearchChatContextContribution);
export { SearchChatContextContribution };
let SearchViewResultChatContextPick = class SearchViewResultChatContextPick {
    constructor(_contextKeyService, _viewsService, _labelService) {
        this._contextKeyService = _contextKeyService;
        this._viewsService = _viewsService;
        this._labelService = _labelService;
        this.type = 'valuePick';
        this.label = localize('chatContext.searchResults', 'Search Results');
        this.icon = Codicon.search;
        this.ordinal = 500;
    }
    isEnabled() {
        return !!SearchContext.HasSearchResults.getValue(this._contextKeyService);
    }
    async asAttachment() {
        const searchView = this._viewsService.getViewWithId(VIEW_ID);
        if (!(searchView instanceof SearchView)) {
            return [];
        }
        return searchView.model.searchResult.matches().map(result => ({
            kind: 'file',
            id: result.resource.toString(),
            value: result.resource,
            name: this._labelService.getUriBasenameLabel(result.resource),
        }));
    }
};
SearchViewResultChatContextPick = __decorate([
    __param(0, IContextKeyService),
    __param(1, IViewsService),
    __param(2, ILabelService)
], SearchViewResultChatContextPick);
let SymbolsContextPickerPick = class SymbolsContextPickerPick {
    constructor(_instantiationService) {
        this._instantiationService = _instantiationService;
        this.type = 'pickerPick';
        this.label = localize('symbols', 'Symbols...');
        this.icon = Codicon.symbolField;
        this.ordinal = -200;
    }
    dispose() {
        this._provider?.dispose();
    }
    asPicker() {
        return {
            placeholder: localize('select.symb', "Select a symbol"),
            picks: picksWithPromiseFn((query, token) => {
                this._provider ??= this._instantiationService.createInstance(SymbolsQuickAccessProvider);
                return this._provider.getSymbolPicks(query, undefined, token).then(symbolItems => {
                    const result = [];
                    for (const item of symbolItems) {
                        if (!item.symbol) {
                            continue;
                        }
                        const attachment = {
                            kind: 'symbol',
                            id: JSON.stringify(item.symbol.location),
                            value: item.symbol.location,
                            symbolKind: item.symbol.kind,
                            icon: SymbolKinds.toIcon(item.symbol.kind),
                            fullName: item.label,
                            name: item.symbol.name,
                        };
                        result.push({
                            label: item.symbol.name,
                            iconClass: ThemeIcon.asClassName(SymbolKinds.toIcon(item.symbol.kind)),
                            asAttachment() {
                                return attachment;
                            }
                        });
                    }
                    return result;
                });
            }),
        };
    }
};
SymbolsContextPickerPick = __decorate([
    __param(0, IInstantiationService)
], SymbolsContextPickerPick);
let FilesAndFoldersPickerPick = class FilesAndFoldersPickerPick {
    constructor(_searchService, _labelService, _modelService, _languageService, _configurationService, _workspaceService, _fileService, _historyService) {
        this._searchService = _searchService;
        this._labelService = _labelService;
        this._modelService = _modelService;
        this._languageService = _languageService;
        this._configurationService = _configurationService;
        this._workspaceService = _workspaceService;
        this._fileService = _fileService;
        this._historyService = _historyService;
        this.type = 'pickerPick';
        this.label = localize('chatContext.folder', 'Files & Folders...');
        this.icon = Codicon.folder;
        this.ordinal = 600;
    }
    asPicker() {
        return {
            placeholder: localize('chatContext.attach.files.placeholder', "Search file or folder by name"),
            picks: picksWithPromiseFn(async (value, token) => {
                const workspaces = this._workspaceService.getWorkspace().folders.map(folder => folder.uri);
                const defaultItems = [];
                (await getTopLevelFolders(workspaces, this._fileService)).forEach(uri => defaultItems.push(this._createPickItem(uri, FileKind.FOLDER)));
                this._historyService.getHistory().filter(a => a.resource).slice(0, 30).forEach(uri => defaultItems.push(this._createPickItem(uri.resource, FileKind.FILE)));
                if (value === '') {
                    return defaultItems;
                }
                const result = [];
                await Promise.all(workspaces.map(async (workspace) => {
                    const { folders, files } = await searchFilesAndFolders(workspace, value, true, token, undefined, this._configurationService, this._searchService);
                    for (const folder of folders) {
                        result.push(this._createPickItem(folder, FileKind.FOLDER));
                    }
                    for (const file of files) {
                        result.push(this._createPickItem(file, FileKind.FILE));
                    }
                }));
                result.sort((a, b) => compare(a.label, b.label));
                return result;
            }),
        };
    }
    _createPickItem(resource, kind) {
        return {
            label: basename(resource),
            description: this._labelService.getUriLabel(dirname(resource), { relative: true }),
            iconClass: kind === FileKind.FILE
                ? getIconClasses(this._modelService, this._languageService, resource, FileKind.FILE).join(' ')
                : ThemeIcon.asClassName(Codicon.folder),
            asAttachment: () => {
                return {
                    kind: kind === FileKind.FILE ? 'file' : 'directory',
                    id: resource.toString(),
                    value: resource,
                    name: basename(resource),
                };
            }
        };
    }
};
FilesAndFoldersPickerPick = __decorate([
    __param(0, ISearchService),
    __param(1, ILabelService),
    __param(2, IModelService),
    __param(3, ILanguageService),
    __param(4, IConfigurationService),
    __param(5, IWorkspaceContextService),
    __param(6, IFileService),
    __param(7, IHistoryService)
], FilesAndFoldersPickerPick);
export async function searchFilesAndFolders(workspace, pattern, fuzzyMatch, token, cacheKey, configurationService, searchService) {
    const segmentMatchPattern = caseInsensitiveGlobPattern(fuzzyMatch ? fuzzyMatchingGlobPattern(pattern) : continousMatchingGlobPattern(pattern));
    const searchExcludePattern = getExcludes(configurationService.getValue({ resource: workspace })) || {};
    const searchOptions = {
        folderQueries: [{
                folder: workspace,
                disregardIgnoreFiles: configurationService.getValue('explorer.excludeGitIgnore'),
            }],
        type: 1 /* QueryType.File */,
        shouldGlobMatchFilePattern: true,
        cacheKey,
        excludePattern: searchExcludePattern,
        sortByScore: true,
    };
    let searchResult;
    try {
        searchResult = await searchService.fileSearch({ ...searchOptions, filePattern: `{**/${segmentMatchPattern}/**,${pattern}}` }, token);
    }
    catch (e) {
        if (!isCancellationError(e)) {
            throw e;
        }
    }
    if (!searchResult || token?.isCancellationRequested) {
        return { files: [], folders: [] };
    }
    const fileResources = searchResult.results.map(result => result.resource);
    const folderResources = getMatchingFoldersFromFiles(fileResources, workspace, segmentMatchPattern);
    return { folders: folderResources, files: fileResources };
}
function fuzzyMatchingGlobPattern(pattern) {
    if (!pattern) {
        return '*';
    }
    return '*' + pattern.split('').join('*') + '*';
}
function continousMatchingGlobPattern(pattern) {
    if (!pattern) {
        return '*';
    }
    return '*' + pattern + '*';
}
function caseInsensitiveGlobPattern(pattern) {
    let caseInsensitiveFilePattern = '';
    for (let i = 0; i < pattern.length; i++) {
        const char = pattern[i];
        if (/[a-zA-Z]/.test(char)) {
            caseInsensitiveFilePattern += `[${char.toLowerCase()}${char.toUpperCase()}]`;
        }
        else {
            caseInsensitiveFilePattern += char;
        }
    }
    return caseInsensitiveFilePattern;
}
// TODO: remove this and have support from the search service
function getMatchingFoldersFromFiles(resources, workspace, segmentMatchPattern) {
    const uniqueFolders = new ResourceSet();
    for (const resource of resources) {
        const relativePathToRoot = relativePath(workspace, resource);
        if (!relativePathToRoot) {
            throw new Error('Resource is not a child of the workspace');
        }
        let dirResource = workspace;
        const stats = relativePathToRoot.split('/').slice(0, -1);
        for (const stat of stats) {
            dirResource = dirResource.with({ path: `${dirResource.path}/${stat}` });
            uniqueFolders.add(dirResource);
        }
    }
    const matchingFolders = [];
    for (const folderResource of uniqueFolders) {
        const stats = folderResource.path.split('/');
        const dirStat = stats[stats.length - 1];
        if (!dirStat || !glob.match(segmentMatchPattern, dirStat)) {
            continue;
        }
        matchingFolders.push(folderResource);
    }
    return matchingFolders;
}
export async function getTopLevelFolders(workspaces, fileService) {
    const folders = [];
    for (const workspace of workspaces) {
        const fileSystemProvider = fileService.getProvider(workspace.scheme);
        if (!fileSystemProvider) {
            continue;
        }
        const entries = await fileSystemProvider.readdir(workspace);
        for (const [name, type] of entries) {
            const entryResource = joinPath(workspace, name);
            if (type === FileType.Directory) {
                folders.push(entryResource);
            }
        }
    }
    return folders;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdENvbnRyaWJ1dGlvbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9hZHZpa2FyL0RvY3VtZW50cy9hcmNoaXRlY3QvYXJjaDIvQXJjaElERS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9zZWFyY2gvYnJvd3Nlci9jaGF0Q29udHJpYnV0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDOUQsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNqRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDOUMsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDMUYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDbkcsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBRTNFLE9BQU8sRUFBRSxXQUFXLEVBQXFELGNBQWMsRUFBYSxPQUFPLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUMvSixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDL0UsT0FBTyxFQUFzRCx1QkFBdUIsRUFBeUIsa0JBQWtCLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQztBQUV0TCxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sd0JBQXdCLENBQUM7QUFDdkQsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLGlCQUFpQixDQUFDO0FBRTdDLE9BQU8sRUFBRSxRQUFRLEVBQUUsT0FBTyxFQUFFLFFBQVEsRUFBRSxZQUFZLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNqRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sb0NB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