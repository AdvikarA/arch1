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
import * as dom from '../../../../../base/browser/dom.js';
import { $ } from '../../../../../base/browser/dom.js';
import { Disposable, DisposableStore, toDisposable } from '../../../../../base/common/lifecycle.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { IChatService } from '../../common/chatService.js';
import { IEditorService } from '../../../../services/editor/common/editorService.js';
import { WorkbenchList } from '../../../../../platform/list/browser/listService.js';
import { ButtonWithIcon } from '../../../../../base/browser/ui/button/button.js';
import { Codicon } from '../../../../../base/common/codicons.js';
import { URI } from '../../../../../base/common/uri.js';
import { ThemeIcon } from '../../../../../base/common/themables.js';
import { ResourcePool } from './chatCollections.js';
import { ResourceLabels } from '../../../../browser/labels.js';
import { FileKind } from '../../../../../platform/files/common/files.js';
import { createFileIconThemableTreeContainerScope } from '../../../files/browser/views/explorerView.js';
import { IThemeService } from '../../../../../platform/theme/common/themeService.js';
import { autorun, derived } from '../../../../../base/common/observable.js';
import { MultiDiffEditorInput } from '../../../multiDiffEditor/browser/multiDiffEditorInput.js';
import { MultiDiffEditorItem } from '../../../multiDiffEditor/browser/multiDiffSourceResolverService.js';
import { IEditorGroupsService } from '../../../../services/editor/common/editorGroupsService.js';
import { Emitter } from '../../../../../base/common/event.js';
let ChatCheckpointFileChangesSummaryContentPart = class ChatCheckpointFileChangesSummaryContentPart extends Disposable {
    constructor(content, context, chatService, editorService, editorGroupsService, instantiationService) {
        super();
        this.chatService = chatService;
        this.editorService = editorService;
        this.editorGroupsService = editorGroupsService;
        this.instantiationService = instantiationService;
        this.ELEMENT_HEIGHT = 22;
        this.MAX_ITEMS_SHOWN = 6;
        this._onDidChangeHeight = this._register(new Emitter());
        this.onDidChangeHeight = this._onDidChangeHeight.event;
        this.isCollapsed = true;
        this.fileChanges = content.fileChanges;
        this.fileChangesDiffsObservable = this.computeFileChangesDiffs(context, content.fileChanges);
        const headerDomNode = $('.checkpoint-file-changes-summary-header');
        this.domNode = $('.checkpoint-file-changes-summary', undefined, headerDomNode);
        this.domNode.tabIndex = 0;
        this._register(this.renderHeader(headerDomNode));
        this._register(this.renderFilesList(this.domNode));
    }
    changeID(change) {
        return `${change.sessionId}-${change.requestId}-${change.reference.path}`;
    }
    computeFileChangesDiffs(context, changes) {
        return derived((r) => {
            const fileChangesDiffs = new Map();
            for (const change of changes) {
                const sessionId = change.sessionId;
                const session = this.chatService.getSession(sessionId);
                if (!session || !session.editingSessionObs) {
                    continue;
                }
                const editSession = session.editingSessionObs.promiseResult.read(r)?.data;
                if (!editSession) {
                    continue;
                }
                const uri = change.reference;
                const modifiedEntry = editSession.getEntry(uri);
                if (!modifiedEntry) {
                    continue;
                }
                const requestId = change.requestId;
                const undoStops = context.content.filter(e => e.kind === 'undoStop');
                for (let i = undoStops.length - 1; i >= 0; i--) {
                    const modifiedUri = modifiedEntry.modifiedURI;
                    const undoStopID = undoStops[i].id;
                    const diff = editSession.getEntryDiffBetweenStops(modifiedUri, requestId, undoStopID)?.read(r);
                    if (!diff) {
                        continue;
                    }
                    fileChangesDiffs.set(this.changeID(change), diff);
                }
            }
            return fileChangesDiffs;
        });
    }
    renderHeader(container) {
        const viewListButtonContainer = container.appendChild($('.chat-file-changes-label'));
        const viewListButton = new ButtonWithIcon(viewListButtonContainer, {});
        viewListButton.label = this.fileChanges.length === 1 ? `Changed 1 file` : `Changed ${this.fileChanges.length} files`;
        const setExpansionState = () => {
            viewListButton.icon = this.isCollapsed ? Codicon.chevronRight : Codicon.chevronDown;
            this.domNode.classList.toggle('chat-file-changes-collapsed', this.isCollapsed);
            this._onDidChangeHeight.fire();
        };
        setExpansionState();
        const disposables = new DisposableStore();
        disposables.add(viewListButton);
        disposables.add(viewListButton.onDidClick(() => {
            this.isCollapsed = !this.isCollapsed;
            setExpansionState();
        }));
        disposables.add(this.renderViewAllFileChangesButton(viewListButton.element));
        return toDisposable(() => disposables.dispose());
    }
    renderViewAllFileChangesButton(container) {
        const button = container.appendChild($('.chat-view-changes-icon'));
        button.classList.add(...ThemeIcon.asClassNameArray(Codicon.diffMultiple));
        return dom.addDisposableListener(button, 'click', (e) => {
            const resources = [];
            for (const fileChange of this.fileChanges) {
                const diffEntry = this.fileChangesDiffsObservable.get().get(this.changeID(fileChange));
                if (diffEntry) {
                    resources.push({
                        originalUri: diffEntry.originalURI,
                        modifiedUri: diffEntry.modifiedURI
                    });
                }
                else {
                    resources.push({
                        originalUri: fileChange.reference
                    });
                }
            }
            const source = URI.parse(`multi-diff-editor:${new Date().getMilliseconds().toString() + Math.random().toString()}`);
            const input = this.instantiationService.createInstance(MultiDiffEditorInput, source, 'Checkpoint File Changes', resources.map(resource => {
                return new MultiDiffEditorItem(resource.originalUri, resource.modifiedUri, undefined);
            }), false);
            this.editorGroupsService.activeGroup.openEditor(input);
            dom.EventHelper.stop(e, true);
        });
    }
    renderFilesList(container) {
        const store = new DisposableStore();
        this.list = store.add(this.instantiationService.createInstance(CollapsibleChangesSummaryListPool)).get();
        const itemsShown = Math.min(this.fileChanges.length, this.MAX_ITEMS_SHOWN);
        const height = itemsShown * this.ELEMENT_HEIGHT;
        this.list.layout(height);
        this.updateList(this.fileChanges, this.fileChangesDiffsObservable.get());
        container.appendChild(this.list.getHTMLElement().parentElement);
        store.add(this.list.onDidOpen((item) => {
            const element = item.element;
            if (!element) {
                return;
            }
            const diff = this.fileChangesDiffsObservable.get().get(this.changeID(element));
            if (diff) {
                const input = {
                    original: { resource: diff.originalURI },
                    modified: { resource: diff.modifiedURI },
                    options: { preserveFocus: true }
                };
                this.editorService.openEditor(input);
            }
            else {
                this.editorService.openEditor({ resource: element.reference, options: { preserveFocus: true } });
            }
        }));
        store.add(this.list.onContextMenu(e => {
            dom.EventHelper.stop(e.browserEvent, true);
        }));
        store.add(autorun((r) => {
            this.updateList(this.fileChanges, this.fileChangesDiffsObservable.read(r));
        }));
        return store;
    }
    updateList(fileChanges, fileChangesDiffs) {
        this.list.splice(0, this.list.length, this.computeFileChangeSummaryItems(fileChanges, fileChangesDiffs));
    }
    computeFileChangeSummaryItems(fileChanges, fileChangesDiffs) {
        const items = [];
        for (const fileChange of fileChanges) {
            const diffEntry = fileChangesDiffs.get(this.changeID(fileChange));
            if (diffEntry) {
                const additionalLabels = [];
                if (diffEntry) {
                    additionalLabels.push({
                        description: ` +${diffEntry.added} `,
                        className: 'insertions',
                    });
                    additionalLabels.push({
                        description: ` -${diffEntry.removed} `,
                        className: 'deletions',
                    });
                }
                const item = {
                    ...fileChange,
                    additionalLabels
                };
                items.push(item);
            }
            else {
                items.push(fileChange);
            }
        }
        return items;
    }
    hasSameContent(other, followingContent, element) {
        return other.kind === 'changesSummary' && other.fileChanges.length === this.fileChanges.length;
    }
    addDisposable(disposable) {
        this._register(disposable);
    }
};
ChatCheckpointFileChangesSummaryContentPart = __decorate([
    __param(2, IChatService),
    __param(3, IEditorService),
    __param(4, IEditorGroupsService),
    __param(5, IInstantiationService)
], ChatCheckpointFileChangesSummaryContentPart);
export { ChatCheckpointFileChangesSummaryContentPart };
let CollapsibleChangesSummaryListPool = class CollapsibleChangesSummaryListPool extends Disposable {
    constructor(instantiationService, themeService) {
        super();
        this.instantiationService = instantiationService;
        this.themeService = themeService;
        this._resourcePool = this._register(new ResourcePool(() => this.listFactory()));
    }
    listFactory() {
        const container = $('.chat-summary-list');
        const store = new DisposableStore();
        store.add(createFileIconThemableTreeContainerScope(container, this.themeService));
        const resourceLabels = store.add(this.instantiationService.createInstance(ResourceLabels, { onDidChangeVisibility: () => Disposable.None }));
        const list = store.add(this.instantiationService.createInstance((WorkbenchList), 'ChatListRenderer', container, new CollapsibleChangesSummaryListDelegate(), [this.instantiationService.createInstance(CollapsibleChangesSummaryListRenderer, resourceLabels)], {}));
        return {
            list: list,
            dispose: () => {
                store.dispose();
            }
        };
    }
    get() {
        return this._resourcePool.get().list;
    }
};
CollapsibleChangesSummaryListPool = __decorate([
    __param(0, IInstantiationService),
    __param(1, IThemeService)
], CollapsibleChangesSummaryListPool);
class CollapsibleChangesSummaryListDelegate {
    getHeight(element) {
        return 22;
    }
    getTemplateId(element) {
        return CollapsibleChangesSummaryListRenderer.TEMPLATE_ID;
    }
}
class CollapsibleChangesSummaryListRenderer {
    static { this.TEMPLATE_ID = 'collapsibleChangesSummaryListRenderer'; }
    static { this.CHANGES_SUMMARY_CLASS_NAME = 'insertions-and-deletions'; }
    constructor(labels) {
        this.labels = labels;
        this.templateId = CollapsibleChangesSummaryListRenderer.TEMPLATE_ID;
    }
    renderTemplate(container) {
        const label = this.labels.create(container, { supportHighlights: true, supportIcons: true });
        return { label, dispose: () => label.dispose() };
    }
    renderElement(data, index, templateData) {
        const label = templateData.label;
        label.setFile(data.reference, {
            fileKind: FileKind.FILE,
            title: data.reference.path
        });
        const labelElement = label.element;
        labelElement.querySelector(`.${CollapsibleChangesSummaryListRenderer.CHANGES_SUMMARY_CLASS_NAME}`)?.remove();
        if (!data.additionalLabels) {
            return;
        }
        const changesSummary = labelElement.appendChild($(`.${CollapsibleChangesSummaryListRenderer.CHANGES_SUMMARY_CLASS_NAME}`));
        for (const additionalLabel of data.additionalLabels) {
            const element = changesSummary.appendChild($(`.${additionalLabel.className}`));
            element.textContent = additionalLabel.description;
        }
    }
    disposeTemplate(templateData) {
        templateData.dispose();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdENoYW5nZXNTdW1tYXJ5UGFydC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL2FkdmlrYXIvRG9jdW1lbnRzL2FyY2hpdGVjdC9hcmNoMi9BcmNoSURFL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvYnJvd3Nlci9jaGF0Q29udGVudFBhcnRzL2NoYXRDaGFuZ2VzU3VtbWFyeVBhcnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQ0FBb0MsQ0FBQztBQUMxRCxPQUFPLEVBQUUsQ0FBQyxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDdkQsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQWUsWUFBWSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFJakgsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0RBQStELENBQUM7QUFDdEcsT0FBTyxFQUFrRCxZQUFZLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUMzRyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0scURBQXFELENBQUM7QUFFckYsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLHFEQUFxRCxDQUFDO0FBQ3BGLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxpREFBaUQsQ0FBQztBQUNqRixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDakUsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ3hELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNwRSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sc0JBQXNCLENBQUM7QUFDcEQsT0FBTyxFQUFrQixjQUFjLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUUvRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sK0NBQStDLENBQUM7QUFDekUsT0FBTyxFQUFFLHdD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