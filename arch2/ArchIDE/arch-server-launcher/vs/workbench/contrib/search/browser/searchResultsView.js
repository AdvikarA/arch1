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
var TextSearchResultRenderer_1, FolderMatchRenderer_1, FileMatchRenderer_1, MatchRenderer_1;
import * as DOM from '../../../../base/browser/dom.js';
import { CountBadge } from '../../../../base/browser/ui/countBadge/countBadge.js';
import { Disposable, DisposableStore } from '../../../../base/common/lifecycle.js';
import * as paths from '../../../../base/common/path.js';
import * as nls from '../../../../nls.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { FileKind } from '../../../../platform/files/common/files.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { isEqual } from '../../../../base/common/resources.js';
import { MenuId } from '../../../../platform/actions/common/actions.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { MenuWorkbenchToolBar } from '../../../../platform/actions/browser/toolbar.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { ServiceCollection } from '../../../../platform/instantiation/common/serviceCollection.js';
import { defaultCountBadgeStyles } from '../../../../platform/theme/browser/defaultStyles.js';
import { SearchContext } from '../common/constants.js';
import { getDefaultHoverDelegate } from '../../../../base/browser/ui/hover/hoverDelegateFactory.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { isSearchTreeMatch, isSearchTreeFileMatch, isSearchTreeFolderMatch, isTextSearchHeading, isSearchTreeFolderMatchWorkspaceRoot, isSearchTreeFolderMatchNoRoot, isPlainTextSearchHeading } from './searchTreeModel/searchTreeCommon.js';
import { isSearchTreeAIFileMatch } from './AISearch/aiSearchModelBase.js';
export class SearchDelegate {
    static { this.ITEM_HEIGHT = 22; }
    getHeight(element) {
        return SearchDelegate.ITEM_HEIGHT;
    }
    getTemplateId(element) {
        if (isSearchTreeFolderMatch(element)) {
            return FolderMatchRenderer.TEMPLATE_ID;
        }
        else if (isSearchTreeFileMatch(element)) {
            return FileMatchRenderer.TEMPLATE_ID;
        }
        else if (isSearchTreeMatch(element)) {
            return MatchRenderer.TEMPLATE_ID;
        }
        else if (isTextSearchHeading(element)) {
            return TextSearchResultRenderer.TEMPLATE_ID;
        }
        console.error('Invalid search tree element', element);
        throw new Error('Invalid search tree element');
    }
}
let TextSearchResultRenderer = class TextSearchResultRenderer extends Disposable {
    static { TextSearchResultRenderer_1 = this; }
    static { this.TEMPLATE_ID = 'textResultMatch'; }
    constructor(labels, contextService, instantiationService, contextKeyService) {
        super();
        this.labels = labels;
        this.contextService = contextService;
        this.instantiationService = instantiationService;
        this.contextKeyService = contextKeyService;
        this.templateId = TextSearchResultRenderer_1.TEMPLATE_ID;
    }
    renderTemplate(container) {
        const disposables = new DisposableStore();
        const textSearchResultElement = DOM.append(container, DOM.$('.textsearchresult'));
        const label = this.labels.create(textSearchResultElement, { supportDescriptionHighlights: true, supportHighlights: true, supportIcons: true });
        disposables.add(label);
        const actionBarContainer = DOM.append(textSearchResultElement, DOM.$('.actionBarContainer'));
        const contextKeyServiceMain = disposables.add(this.contextKeyService.createScoped(container));
        const instantiationService = disposables.add(this.instantiationService.createChild(new ServiceCollection([IContextKeyService, contextKeyServiceMain])));
        const actions = disposables.add(instantiationService.createInstance(MenuWorkbenchToolBar, actionBarContainer, MenuId.SearchActionMenu, {
            menuOptions: {
                shouldForwardArgs: true
            },
            highlightToggledItems: true,
            hiddenItemStrategy: 0 /* HiddenItemStrategy.Ignore */,
            toolbarOptions: {
                primaryGroup: (g) => /^inline/.test(g),
            },
        }));
        return { label, disposables, actions, contextKeyService: contextKeyServiceMain };
    }
    async renderElement(node, index, templateData) {
        if (isPlainTextSearchHeading(node.element)) {
            templateData.label.setLabel(nls.localize('searchFolderMatch.plainText.label', "Text Results"));
            SearchContext.AIResultsTitle.bindTo(templateData.contextKeyService).set(false);
            SearchContext.MatchFocusKey.bindTo(templateData.contextKeyService).set(false);
            SearchContext.FileFocusKey.bindTo(templateData.contextKeyService).set(false);
            SearchContext.FolderFocusKey.bindTo(templateData.contextKeyService).set(false);
        }
        else {
            try {
                await node.element.parent().searchModel.getAITextResultProviderName();
            }
            catch {
                // ignore
            }
            const localizedLabel = nls.localize({
                key: 'searchFolderMatch.aiText.label',
                comment: ['This is displayed before the AI text search results, now always "AI-assisted results".']
            }, 'AI-assisted results');
            // todo: make icon extension-contributed.
            templateData.label.setLabel(`$(${Codicon.searchSparkle.id}) ${localizedLabel}`);
            SearchContext.AIResultsTitle.bindTo(templateData.contextKeyService).set(true);
            SearchContext.MatchFocusKey.bindTo(templateData.contextKeyService).set(false);
            SearchContext.FileFocusKey.bindTo(templateData.contextKeyService).set(false);
            SearchContext.FolderFocusKey.bindTo(templateData.contextKeyService).set(false);
        }
    }
    disposeTemplate(templateData) {
        templateData.disposables.dispose();
    }
    renderCompressedElements(node, index, templateData) {
    }
};
TextSearchResultRenderer = TextSearchResultRenderer_1 = __decorate([
    __param(1, IWorkspaceContextService),
    __param(2, IInstantiationService),
    __param(3, IContextKeyService)
], TextSearchResultRenderer);
export { TextSearchResultRenderer };
let FolderMatchRenderer = class FolderMatchRenderer extends Disposable {
    static { FolderMatchRenderer_1 = this; }
    static { this.TEMPLATE_ID = 'folderMatch'; }
    constructor(searchView, labels, contextService, labelService, instantiationService, contextKeyService) {
        super();
        this.searchView = searchView;
        this.labels = labels;
        this.contextService = contextService;
        this.labelService = labelService;
        this.instantiationService = instantiationService;
        this.contextKeyService = contextKeyService;
        this.templateId = FolderMatchRenderer_1.TEMPLATE_ID;
    }
    renderCompressedElements(node, index, templateData) {
        const compressed = node.element;
        const folder = compressed.elements[compressed.elements.length - 1];
        const label = compressed.elements.map(e => e.name());
        if (folder.resource) {
            const fileKind = (isSearchTreeFolderMatchWorkspaceRoot(folder)) ? FileKind.ROOT_FOLDER : FileKind.FOLDER;
            templateData.label.setResource({ resource: folder.resource, name: label }, {
                fileKind,
                separator: this.labelService.getSeparator(folder.resource.scheme),
            });
        }
        else {
            templateData.label.setLabel(nls.localize('searchFolderMatch.other.label', "Other files"));
        }
        this.renderFolderDetails(folder, templateData);
    }
    renderTemplate(container) {
        const disposables = new DisposableStore();
        const folderMatchElement = DOM.append(container, DOM.$('.foldermatch'));
        const label = this.labels.create(folderMatchElement, { supportDescriptionHighlights: true, supportHighlights: true });
        disposables.add(label);
        const badge = new CountBadge(DOM.append(folderMatchElement, DOM.$('.badge')), {}, defaultCountBadgeStyles);
        disposables.add(badge);
        const actionBarContainer = DOM.append(folderMatchElement, DOM.$('.actionBarContainer'));
        const elementDisposables = new DisposableStore();
        disposables.add(elementDisposables);
        const contextKeyServiceMain = disposables.add(this.contextKeyService.createScoped(container));
        SearchContext.AIResultsTitle.bindTo(contextKeyServiceMain).set(false);
        SearchContext.MatchFocusKey.bindTo(contextKeyServiceMain).set(false);
        SearchContext.FileFocusKey.bindTo(contextKeyServiceMain).set(false);
        SearchContext.FolderFocusKey.bindTo(contextKeyServiceMain).set(true);
        const instantiationService = disposables.add(this.instantiationService.createChild(new ServiceCollection([IContextKeyService, contextKeyServiceMain])));
        const actions = disposables.add(instantiationService.createInstance(MenuWorkbenchToolBar, actionBarContainer, MenuId.SearchActionMenu, {
            menuOptions: {
                shouldForwardArgs: true
            },
            hiddenItemStrategy: 0 /* HiddenItemStrategy.Ignore */,
            toolbarOptions: {
                primaryGroup: (g) => /^inline/.test(g),
            },
        }));
        return {
            label,
            badge,
            actions,
            disposables,
            elementDisposables,
            contextKeyService: contextKeyServiceMain
        };
    }
    renderElement(node, index, templateData) {
        const folderMatch = node.element;
        if (folderMatch.resource) {
            const workspaceFolder = this.contextService.getWorkspaceFolder(folderMatch.resource);
            if (workspaceFolder && isEqual(workspaceFolder.uri, folderMatch.resource)) {
                templateData.label.setFile(folderMatch.resource, { fileKind: FileKind.ROOT_FOLDER, hidePath: true });
            }
            else {
                templateData.label.setFile(folderMatch.resource, { fileKind: FileKind.FOLDER, hidePath: this.searchView.isTreeLayoutViewVisible });
            }
        }
        else {
            templateData.label.setLabel(nls.localize('searchFolderMatch.other.label', "Other files"));
        }
        SearchContext.IsEditableItemKey.bindTo(templateData.contextKeyService).set(!folderMatch.hasOnlyReadOnlyMatches());
        templateData.elementDisposables.add(folderMatch.onChange(() => {
            SearchContext.IsEditableItemKey.bindTo(templateData.contextKeyService).set(!folderMatch.hasOnlyReadOnlyMatches());
        }));
        this.renderFolderDetails(folderMatch, templateData);
    }
    disposeElement(element, index, templateData) {
        templateData.elementDisposables.clear();
    }
    disposeCompressedElements(node, index, templateData) {
        templateData.elementDisposables.clear();
    }
    disposeTemplate(templateData) {
        templateData.disposables.dispose();
    }
    renderFolderDetails(folder, templateData) {
        const count = folder.recursiveMatchCount();
        templateData.badge.setCount(count);
        templateData.badge.setTitleFormat(count > 1 ? nls.localize('searchFileMatches', "{0} files found", count) : nls.localize('searchFileMatch', "{0} file found", count));
        templateData.actions.context = { viewer: this.searchView.getControl(), element: folder };
    }
};
FolderMatchRenderer = FolderMatchRenderer_1 = __decorate([
    __param(2, IWorkspaceContextService),
    __param(3, ILabelService),
    __param(4, IInstantiationService),
    __param(5, IContextKeyService)
], FolderMatchRenderer);
export { FolderMatchRenderer };
let FileMatchRenderer = class FileMatchRenderer extends Disposable {
    static { FileMatchRenderer_1 = this; }
    static { this.TEMPLATE_ID = 'fileMatch'; }
    constructor(searchView, labels, contextService, configurationService, instantiationService, contextKeyService) {
        super();
        this.searchView = searchView;
        this.labels = labels;
        this.contextService = contextService;
        this.configurationService = configurationService;
        this.instantiationService = instantiationService;
        this.contextKeyService = contextKeyService;
        this.templateId = FileMatchRenderer_1.TEMPLATE_ID;
    }
    renderCompressedElements(node, index, templateData) {
        throw new Error('Should never happen since node is incompressible.');
    }
    renderTemplate(container) {
        const disposables = new DisposableStore();
        const elementDisposables = new DisposableStore();
        disposables.add(elementDisposables);
        const fileMatchElement = DOM.append(container, DOM.$('.filematch'));
        const label = this.labels.create(fileMatchElement);
        disposables.add(label);
        const badge = new CountBadge(DOM.append(fileMatchElement, DOM.$('.badge')), {}, defaultCountBadgeStyles);
        disposables.add(badge);
        const actionBarContainer = DOM.append(fileMatchElement, DOM.$('.actionBarContainer'));
        const contextKeyServiceMain = disposables.add(this.contextKeyService.createScoped(container));
        SearchContext.AIResultsTitle.bindTo(contextKeyServiceMain).set(false);
        SearchContext.MatchFocusKey.bindTo(contextKeyServiceMain).set(false);
        SearchContext.FileFocusKey.bindTo(contextKeyServiceMain).set(true);
        SearchContext.FolderFocusKey.bindTo(contextKeyServiceMain).set(false);
        const instantiationService = disposables.add(this.instantiationService.createChild(new ServiceCollection([IContextKeyService, contextKeyServiceMain])));
        const actions = disposables.add(instantiationService.createInstance(MenuWorkbenchToolBar, actionBarContainer, MenuId.SearchActionMenu, {
            menuOptions: {
                shouldForwardArgs: true
            },
            hiddenItemStrategy: 0 /* HiddenItemStrategy.Ignore */,
            toolbarOptions: {
                primaryGroup: (g) => /^inline/.test(g),
            },
        }));
        return {
            el: fileMatchElement,
            label,
            badge,
            actions,
            disposables,
            elementDisposables,
            contextKeyService: contextKeyServiceMain
        };
    }
    renderElement(node, index, templateData) {
        const fileMatch = node.element;
        templateData.el.setAttribute('data-resource', fileMatch.resource.toString());
        const decorationConfig = this.configurationService.getValue('search').decorations;
        templateData.label.setFile(fileMatch.resource, { range: isSearchTreeAIFileMatch(fileMatch) ? fileMatch.getFullRange() : undefined, hidePath: this.searchView.isTreeLayoutViewVisible && !(isSearchTreeFolderMatchNoRoot(fileMatch.parent())), hideIcon: false, fileDecorations: { colors: decorationConfig.colors, badges: decorationConfig.badges } });
        const count = fileMatch.count();
        templateData.badge.setCount(count);
        templateData.badge.setTitleFormat(count > 1 ? nls.localize('searchMatches', "{0} matches found", count) : nls.localize('searchMatch', "{0} match found", count));
        templateData.actions.context = { viewer: this.searchView.getControl(), element: fileMatch };
        SearchContext.IsEditableItemKey.bindTo(templateData.contextKeyService).set(!fileMatch.hasOnlyReadOnlyMatches());
        templateData.elementDisposables.add(fileMatch.onChange(() => {
            SearchContext.IsEditableItemKey.bindTo(templateData.contextKeyService).set(!fileMatch.hasOnlyReadOnlyMatches());
        }));
        // when hidesExplorerArrows: true, then the file nodes should still have a twistie because it would otherwise
        // be hard to tell whether the node is collapsed or expanded.
        const twistieContainer = templateData.el.parentElement?.parentElement?.querySelector('.monaco-tl-twistie');
        twistieContainer?.classList.add('force-twistie');
    }
    disposeElement(element, index, templateData) {
        templateData.elementDisposables.clear();
    }
    disposeTemplate(templateData) {
        templateData.disposables.dispose();
    }
};
FileMatchRenderer = FileMatchRenderer_1 = __decorate([
    __param(2, IWorkspaceContextService),
    __param(3, IConfigurationService),
    __param(4, IInstantiationService),
    __param(5, IContextKeyService)
], FileMatchRenderer);
export { FileMatchRenderer };
let MatchRenderer = class MatchRenderer extends Disposable {
    static { MatchRenderer_1 = this; }
    static { this.TEMPLATE_ID = 'match'; }
    constructor(searchView, contextService, configurationService, instantiationService, contextKeyService, hoverService) {
        super();
        this.searchView = searchView;
        this.contextService = contextService;
        this.configurationService = configurationService;
        this.instantiationService = instantiationService;
        this.contextKeyService = contextKeyService;
        this.hoverService = hoverService;
        this.templateId = MatchRenderer_1.TEMPLATE_ID;
    }
    renderCompressedElements(node, index, templateData) {
        throw new Error('Should never happen since node is incompressible.');
    }
    renderTemplate(container) {
        container.classList.add('linematch');
        const lineNumber = DOM.append(container, DOM.$('span.matchLineNum'));
        const parent = DOM.append(container, DOM.$('a.plain.match'));
        const before = DOM.append(parent, DOM.$('span'));
        const match = DOM.append(parent, DOM.$('span.findInFileMatch'));
        const replace = DOM.append(parent, DOM.$('span.replaceMatch'));
        const after = DOM.append(parent, DOM.$('span'));
        const actionBarContainer = DOM.append(container, DOM.$('span.actionBarContainer'));
        const disposables = new DisposableStore();
        const contextKeyServiceMain = disposables.add(this.contextKeyService.createScoped(container));
        SearchContext.AIResultsTitle.bindTo(contextKeyServiceMain).set(false);
        SearchContext.MatchFocusKey.bindTo(contextKeyServiceMain).set(true);
        SearchContext.FileFocusKey.bindTo(contextKeyServiceMain).set(false);
        SearchContext.FolderFocusKey.bindTo(contextKeyServiceMain).set(false);
        const instantiationService = disposables.add(this.instantiationService.createChild(new ServiceCollection([IContextKeyService, contextKeyServiceMain])));
        const actions = disposables.add(instantiationService.createInstance(MenuWorkbenchToolBar, actionBarContainer, MenuId.SearchActionMenu, {
            menuOptions: {
                shouldForwardArgs: true
            },
            hiddenItemStrategy: 0 /* HiddenItemStrategy.Ignore */,
            toolbarOptions: {
                primaryGroup: (g) => /^inline/.test(g),
            },
        }));
        return {
            parent,
            before,
            match,
            replace,
            after,
            lineNumber,
            actions,
            disposables,
            contextKeyService: contextKeyServiceMain
        };
    }
    renderElement(node, index, templateData) {
        const match = node.element;
        const preview = match.preview();
        const replace = this.searchView.model.isReplaceActive() &&
            !!this.searchView.model.replaceString &&
            !match.isReadonly;
        templateData.before.textContent = preview.before;
        templateData.match.textContent = preview.inside;
        templateData.match.classList.toggle('replace', replace);
        templateData.replace.textContent = replace ? match.replaceString : '';
        templateData.after.textContent = preview.after;
        const title = (preview.fullBefore + (replace ? match.replaceString : preview.inside) + preview.after).trim().substr(0, 999);
        templateData.disposables.add(this.hoverService.setupManagedHover(getDefaultHoverDelegate('mouse'), templateData.parent, title));
        SearchContext.IsEditableItemKey.bindTo(templateData.contextKeyService).set(!match.isReadonly);
        const numLines = match.range().endLineNumber - match.range().startLineNumber;
        const extraLinesStr = numLines > 0 ? `+${numLines}` : '';
        const showLineNumbers = this.configurationService.getValue('search').showLineNumbers;
        const lineNumberStr = showLineNumbers ? `${match.range().startLineNumber}:` : '';
        templateData.lineNumber.classList.toggle('show', (numLines > 0) || showLineNumbers);
        templateData.lineNumber.textContent = lineNumberStr + extraLinesStr;
        templateData.disposables.add(this.hoverService.setupManagedHover(getDefaultHoverDelegate('mouse'), templateData.lineNumber, this.getMatchTitle(match, showLineNumbers)));
        templateData.actions.context = { viewer: this.searchView.getControl(), element: match };
    }
    disposeTemplate(templateData) {
        templateData.disposables.dispose();
    }
    getMatchTitle(match, showLineNumbers) {
        const startLine = match.range().startLineNumber;
        const numLines = match.range().endLineNumber - match.range().startLineNumber;
        const lineNumStr = showLineNumbers ?
            nls.localize('lineNumStr', "From line {0}", startLine, numLines) + ' ' :
            '';
        const numLinesStr = numLines > 0 ?
            '+ ' + nls.localize('numLinesStr', "{0} more lines", numLines) :
            '';
        return lineNumStr + numLinesStr;
    }
};
MatchRenderer = MatchRenderer_1 = __decorate([
    __param(1, IWorkspaceContextService),
    __param(2, IConfigurationService),
    __param(3, IInstantiationService),
    __param(4, IContextKeyService),
    __param(5, IHoverService)
], MatchRenderer);
export { MatchRenderer };
let SearchAccessibilityProvider = class SearchAccessibilityProvider {
    constructor(searchView, labelService) {
        this.searchView = searchView;
        this.labelService = labelService;
    }
    getWidgetAriaLabel() {
        return nls.localize('search', "Search");
    }
    getAriaLabel(element) {
        if (isSearchTreeFolderMatch(element)) {
            const count = element.allDownstreamFileMatches().reduce((total, current) => total + current.count(), 0);
            return element.resource ?
                nls.localize('folderMatchAriaLabel', "{0} matches in folder root {1}, Search result", count, element.name()) :
                nls.localize('otherFilesAriaLabel', "{0} matches outside of the workspace, Search result", count);
        }
        if (isSearchTreeFileMatch(element)) {
            const path = this.labelService.getUriLabel(element.resource, { relative: true }) || element.resource.fsPath;
            return nls.localize('fileMatchAriaLabel', "{0} matches in file {1} of folder {2}, Search result", element.count(), element.name(), paths.dirname(path));
        }
        if (isSearchTreeMatch(element)) {
            const match = element;
            const searchModel = this.searchView.model;
            const replace = searchModel.isReplaceActive() && !!searchModel.replaceString;
            const matchString = match.getMatchString();
            const range = match.range();
            const matchText = match.text().substr(0, range.endColumn + 150);
            if (replace) {
                return nls.localize('replacePreviewResultAria', "'{0}' at column {1} replace {2} with {3}", matchText, range.startColumn, matchString, match.replaceString);
            }
            return nls.localize('searchResultAria', "'{0}' at column {1} found {2}", matchText, range.startColumn, matchString);
        }
        return null;
    }
};
SearchAccessibilityProvider = __decorate([
    __param(1, ILabelService)
], SearchAccessibilityProvider);
export { SearchAccessibilityProvider };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VhcmNoUmVzdWx0c1ZpZXcuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9hZHZpa2FyL0RvY3VtZW50cy9hcmNoaXRlY3QvYXJjaDIvQXJjaElERS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9zZWFyY2gvYnJvd3Nlci9zZWFyY2hSZXN1bHRzVmlldy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxpQ0FBaUMsQ0FBQztBQUN2RCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFJbEYsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNuRixPQUFPLEtBQUssS0FBSyxNQUFNLGlDQUFpQyxDQUFDO0FBQ3pELE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUM7QUFDMUMsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDbkcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQ3RFLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUUzRSxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQztBQUc5RixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFHL0QsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQ3hFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ25HLE9BQU8sRUFBc0Isb0JBQW9CLEVBQUUsTUFBTSxpREFBaUQsQ0FBQztBQUUzRyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUMxRixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxnRUFBZ0UsQ0FBQztBQUNuRyxPQUFP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