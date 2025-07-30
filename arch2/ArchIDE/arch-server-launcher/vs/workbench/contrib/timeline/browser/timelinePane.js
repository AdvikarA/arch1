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
import './media/timelinePane.css';
import { localize, localize2 } from '../../../../nls.js';
import * as DOM from '../../../../base/browser/dom.js';
import * as css from '../../../../base/browser/cssValue.js';
import { ActionRunner } from '../../../../base/common/actions.js';
import { CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { fromNow } from '../../../../base/common/date.js';
import { debounce } from '../../../../base/common/decorators.js';
import { Emitter } from '../../../../base/common/event.js';
import { createMatches } from '../../../../base/common/filters.js';
import { Iterable } from '../../../../base/common/iterator.js';
import { DisposableStore, Disposable } from '../../../../base/common/lifecycle.js';
import { Schemas } from '../../../../base/common/network.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { escapeRegExpCharacters } from '../../../../base/common/strings.js';
import { URI } from '../../../../base/common/uri.js';
import { IconLabel } from '../../../../base/browser/ui/iconLabel/iconLabel.js';
import { ViewPane } from '../../../browser/parts/views/viewPane.js';
import { WorkbenchObjectTree } from '../../../../platform/list/browser/listService.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { ContextKeyExpr, IContextKeyService, RawContextKey } from '../../../../platform/contextkey/common/contextkey.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ITimelineService } from '../common/timeline.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { SideBySideEditor, EditorResourceAccessor } from '../../../common/editor.js';
import { ICommandService, CommandsRegistry } from '../../../../platform/commands/common/commands.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { IViewDescriptorService } from '../../../common/views.js';
import { IProgressService } from '../../../../platform/progress/common/progress.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { ActionBar } from '../../../../base/browser/ui/actionbar/actionbar.js';
import { getContextMenuActions, createActionViewItem } from '../../../../platform/actions/browser/menuEntryActionViewItem.js';
import { IMenuService, MenuId, registerAction2, Action2, MenuRegistry } from '../../../../platform/actions/common/actions.js';
import { ActionViewItem } from '../../../../base/browser/ui/actionbar/actionViewItems.js';
import { ColorScheme } from '../../../../platform/theme/common/theme.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { registerIcon } from '../../../../platform/theme/common/iconRegistry.js';
import { API_OPEN_DIFF_EDITOR_COMMAND_ID, API_OPEN_EDITOR_COMMAND_ID } from '../../../browser/parts/editor/editorCommands.js';
import { isString } from '../../../../base/common/types.js';
import { renderAsPlaintext } from '../../../../base/browser/markdownRenderer.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { IExtensionService } from '../../../services/extensions/common/extensions.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { IHoverService, WorkbenchHoverDelegate } from '../../../../platform/hover/browser/hover.js';
const ItemHeight = 22;
function isLoadMoreCommand(item) {
    return item instanceof LoadMoreCommand;
}
function isTimelineItem(item) {
    return !!item && !item.handle.startsWith('vscode-command:');
}
function updateRelativeTime(item, lastRelativeTime) {
    item.relativeTime = isTimelineItem(item) ? fromNow(item.timestamp) : undefined;
    item.relativeTimeFullWord = isTimelineItem(item) ? fromNow(item.timestamp, false, true) : undefined;
    if (lastRelativeTime === undefined || item.relativeTime !== lastRelativeTime) {
        lastRelativeTime = item.relativeTime;
        item.hideRelativeTime = false;
    }
    else {
        item.hideRelativeTime = true;
    }
    return lastRelativeTime;
}
class TimelineAggregate {
    constructor(timeline) {
        this._stale = false;
        this._requiresReset = false;
        this.source = timeline.source;
        this.items = timeline.items;
        this._cursor = timeline.paging?.cursor;
        this.lastRenderedIndex = -1;
    }
    get cursor() {
        return this._cursor;
    }
    get more() {
        return this._cursor !== undefined;
    }
    get newest() {
        return this.items[0];
    }
    get oldest() {
        return this.items[this.items.length - 1];
    }
    add(timeline, options) {
        let updated = false;
        if (timeline.items.length !== 0 && this.items.length !== 0) {
            updated = true;
            const ids = new Set();
            const timestamps = new Set();
            for (const item of timeline.items) {
                if (item.id === undefined) {
                    timestamps.add(item.timestamp);
                }
                else {
                    ids.add(item.id);
                }
            }
            // Remove any duplicate items
            let i = this.items.length;
            let item;
            while (i--) {
                item = this.items[i];
                if ((item.id !== undefined && ids.has(item.id)) || timestamps.has(item.timestamp)) {
                    this.items.splice(i, 1);
                }
            }
            if ((timeline.items[timeline.items.length - 1]?.timestamp ?? 0) >= (this.newest?.timestamp ?? 0)) {
                this.items.splice(0, 0, ...timeline.items);
            }
            else {
                this.items.push(...timeline.items);
            }
        }
        else if (timeline.items.length !== 0) {
            updated = true;
            this.items.push(...timeline.items);
        }
        // If we are not requesting more recent items than we have, then update the cursor
        if (options.cursor !== undefined || typeof options.limit !== 'object') {
            this._cursor = timeline.paging?.cursor;
        }
        if (updated) {
            this.items.sort((a, b) => (b.timestamp - a.timestamp) ||
                (a.source === undefined
                    ? b.source === undefined ? 0 : 1
                    : b.source === undefined ? -1 : b.source.localeCompare(a.source, undefined, { numeric: true, sensitivity: 'base' })));
        }
        return updated;
    }
    get stale() {
        return this._stale;
    }
    get requiresReset() {
        return this._requiresReset;
    }
    invalidate(requiresReset) {
        this._stale = true;
        this._requiresReset = requiresReset;
    }
}
class LoadMoreCommand {
    constructor(loading) {
        this.handle = 'vscode-command:loadMore';
        this.timestamp = 0;
        this.description = undefined;
        this.tooltip = undefined;
        this.contextValue = undefined;
        // Make things easier for duck typing
        this.id = undefined;
        this.icon = undefined;
        this.iconDark = undefined;
        this.source = undefined;
        this.relativeTime = undefined;
        this.relativeTimeFullWord = undefined;
        this.hideRelativeTime = undefined;
        this._loading = false;
        this._loading = loading;
    }
    get loading() {
        return this._loading;
    }
    set loading(value) {
        this._loading = value;
    }
    get ariaLabel() {
        return this.label;
    }
    get label() {
        return this.loading ? localize('timeline.loadingMore', "Loading...") : localize('timeline.loadMore', "Load more");
    }
    get themeIcon() {
        return undefined;
    }
}
export const TimelineFollowActiveEditorContext = new RawContextKey('timelineFollowActiveEditor', true, true);
export const TimelineExcludeSources = new RawContextKey('timelineExcludeSources', '[]', true);
export const TimelineViewFocusedContext = new RawContextKey('timelineFocused', true);
let TimelinePane = class TimelinePane extends ViewPane {
    static { this.TITLE = localize2('timeline', "Timeline"); }
    constructor(options, keybindingService, contextMenuService, contextKeyService, configurationService, storageService, viewDescriptorService, instantiationService, editorService, commandService, progressService, timelineService, openerService, themeService, hoverService, labelService, uriIdentityService, extensionService) {
        super({ ...options, titleMenuId: MenuId.TimelineTitle }, keybindingService, contextMenuService, configurationService, contextKeyService, viewDescriptorService, instantiationService, openerService, themeService, hoverService);
        this.storageService = storageService;
        this.editorService = editorService;
        this.commandService = commandService;
        this.progressService = progressService;
        this.timelineService = timelineService;
        this.labelService = labelService;
        this.uriIdentityService = uriIdentityService;
        this.extensionService = extensionService;
        this.pendingRequests = new Map();
        this.timelinesBySource = new Map();
        this._followActiveEditor = true;
        this._isEmpty = true;
        this._maxItemCount = 0;
        this._visibleItemCount = 0;
        this._pendingRefresh = false;
        this.commands = this._register(this.instantiationService.createInstance(TimelinePaneCommands, this));
        this.followActiveEditorContext = TimelineFollowActiveEditorContext.bindTo(this.contextKeyService);
        this.timelineExcludeSourcesContext = TimelineExcludeSources.bindTo(this.contextKeyService);
        const excludedSourcesString = storageService.get('timeline.excludeSources', 0 /* StorageScope.PROFILE */, '[]');
        this.timelineExcludeSourcesContext.set(excludedSourcesString);
        this.excludedSources = new Set(JSON.parse(excludedSourcesString));
        this._register(storageService.onDidChangeValue(0 /* StorageScope.PROFILE */, 'timeline.excludeSources', this._store)(this.onStorageServiceChanged, this));
        this._register(configurationService.onDidChangeConfiguration(this.onConfigurationChanged, this));
        this._register(timelineService.onDidChangeProviders(this.onProvidersChanged, this));
        this._register(timelineService.onDidChangeTimeline(this.onTimelineChanged, this));
        this._register(timelineService.onDidChangeUri(uri => this.setUri(uri), this));
    }
    get followActiveEditor() {
        return this._followActiveEditor;
    }
    set followActiveEditor(value) {
        if (this._followActiveEditor === value) {
            return;
        }
        this._followActiveEditor = value;
        this.followActiveEditorContext.set(value);
        this.updateFilename(this._filename);
        if (value) {
            this.onActiveEditorChanged();
        }
    }
    get pageOnScroll() {
        if (this._pageOnScroll === undefined) {
            this._pageOnScroll = this.configurationService.getValue('timeline.pageOnScroll') ?? false;
        }
        return this._pageOnScroll;
    }
    get pageSize() {
        let pageSize = this.configurationService.getValue('timeline.pageSize');
        if (pageSize === undefined || pageSize === null) {
            // If we are paging when scrolling, then add an extra item to the end to make sure the "Load more" item is out of view
            pageSize = Math.max(20, Math.floor((this.tree?.renderHeight ?? 0 / ItemHeight) + (this.pageOnScroll ? 1 : -1)));
        }
        return pageSize;
    }
    reset() {
        this.loadTimeline(true);
    }
    setUri(uri) {
        this.setUriCore(uri, true);
    }
    setUriCore(uri, disableFollowing) {
        if (disableFollowing) {
            this.followActiveEditor = false;
        }
        this.uri = uri;
        this.updateFilename(uri ? this.labelService.getUriBasenameLabel(uri) : undefined);
        this.treeRenderer?.setUri(uri);
        this.loadTimeline(true);
    }
    onStorageServiceChanged() {
        const excludedSourcesString = this.storageService.get('timeline.excludeSources', 0 /* StorageScope.PROFILE */, '[]');
        this.timelineExcludeSourcesContext.set(excludedSourcesString);
        this.excludedSources = new Set(JSON.parse(excludedSourcesString));
        const missing = this.timelineService.getSources()
            .filter(({ id }) => !this.excludedSources.has(id) && !this.timelinesBySource.has(id));
        if (missing.length !== 0) {
            this.loadTimeline(true, missing.map(({ id }) => id));
        }
        else {
            this.refresh();
        }
    }
    onConfigurationChanged(e) {
        if (e.affectsConfiguration('timeline.pageOnScroll')) {
            this._pageOnScroll = undefined;
        }
    }
    onActiveEditorChanged() {
        if (!this.followActiveEditor || !this.isExpanded()) {
            return;
        }
        const uri = EditorResourceAccessor.getOriginalUri(this.editorService.activeEditor, { supportSideBySide: SideBySideEditor.PRIMARY });
        if ((this.uriIdentityService.extUri.isEqual(uri, this.uri) && uri !== undefined) ||
            // Fallback to match on fsPath if we are dealing with files or git schemes
            (uri?.fsPath === this.uri?.fsPath && (uri?.scheme === Schemas.file || uri?.scheme === 'git') && (this.uri?.scheme === Schemas.file || this.uri?.scheme === 'git'))) {
            // If the uri hasn't changed, make sure we have valid caches
            for (const source of this.timelineService.getSources()) {
                if (this.excludedSources.has(source.id)) {
                    continue;
                }
                const timeline = this.timelinesBySource.get(source.id);
                if (timeline !== undefined && !timeline.stale) {
                    continue;
                }
                if (timeline !== undefined) {
                    this.updateTimeline(timeline, timeline.requiresReset);
                }
                else {
                    this.loadTimelineForSource(source.id, uri, true);
                }
            }
            return;
        }
        this.setUriCore(uri, false);
    }
    onProvidersChanged(e) {
        if (e.removed) {
            for (const source of e.removed) {
                this.timelinesBySource.delete(source);
            }
            this.refresh();
        }
        if (e.added) {
            this.loadTimeline(true, e.added);
        }
    }
    onTimelineChanged(e) {
        if (e?.uri === undefined || this.uriIdentityService.extUri.isEqual(URI.revive(e.uri), this.uri)) {
            const timeline = this.timelinesBySource.get(e.id);
            if (timeline === undefined) {
                return;
            }
            if (this.isBodyVisible()) {
                this.updateTimeline(timeline, e.reset);
            }
            else {
                timeline.invalidate(e.reset);
            }
        }
    }
    updateFilename(filename) {
        this._filename = filename;
        if (this.followActiveEditor || !filename) {
            this.updateTitleDescription(filename);
        }
        else {
            this.updateTitleDescription(`${filename} (pinned)`);
        }
    }
    get message() {
        return this._message;
    }
    set message(message) {
        this._message = message;
        this.updateMessage();
    }
    updateMessage() {
        if (this._message !== undefined) {
            this.showMessage(this._message);
        }
        else {
            this.hideMessage();
        }
    }
    showMessage(message) {
        if (!this.$message) {
            return;
        }
        this.$message.classList.remove('hide');
        this.resetMessageElement();
        this.$message.textContent = message;
    }
    hideMessage() {
        this.resetMessageElement();
        this.$message.classList.add('hide');
    }
    resetMessageElement() {
        DOM.clearNode(this.$message);
    }
    get hasVisibleItems() {
        return this._visibleItemCount > 0;
    }
    clear(cancelPending) {
        this._visibleItemCount = 0;
        this._maxItemCount = this.pageSize;
        this.timelinesBySource.clear();
        if (cancelPending) {
            for (const pendingRequest of this.pendingRequests.values()) {
                pendingRequest.request.tokenSource.cancel();
                pendingRequest.dispose();
            }
            this.pendingRequests.clear();
            if (!this.isBodyVisible() && this.tree) {
                this.tree.setChildren(null, undefined);
                this._isEmpty = true;
            }
        }
    }
    async loadTimeline(reset, sources) {
        // If we have no source, we are resetting all sources, so cancel everything in flight and reset caches
        if (sources === undefined) {
            if (reset) {
                this.clear(true);
            }
            // TODO@eamodio: Are these the right the list of schemes to exclude? Is there a better way?
            if (this.uri?.scheme === Schemas.vscodeSettings || this.uri?.scheme === Schemas.webviewPanel || this.uri?.scheme === Schemas.walkThrough) {
                this.uri = undefined;
                this.clear(false);
                this.refresh();
                return;
            }
            if (this._isEmpty && this.uri !== undefined) {
                this.setLoadingUriMessage();
            }
        }
        if (this.uri === undefined) {
            this.clear(false);
            this.refresh();
            return;
        }
        if (!this.isBodyVisible()) {
            return;
        }
        let hasPendingRequests = false;
        for (const source of sources ?? this.timelineService.getSources().map(s => s.id)) {
            const requested = this.loadTimelineForSource(source, this.uri, reset);
            if (requested) {
                hasPendingRequests = true;
            }
        }
        if (!hasPendingRequests) {
            this.refresh();
        }
        else if (this._isEmpty) {
            this.setLoadingUriMessage();
        }
    }
    loadTimelineForSource(source, uri, reset, options) {
        if (this.excludedSources.has(source)) {
            return false;
        }
        const timeline = this.timelinesBySource.get(source);
        // If we are paging, and there are no more items or we have enough cached items to cover the next page,
        // don't bother querying for more
        if (!reset &&
            options?.cursor !== undefined &&
            timeline !== undefined &&
            (!timeline?.more || timeline.items.length > timeline.lastRenderedIndex + this.pageSize)) {
            return false;
        }
        if (options === undefined) {
            if (!reset &&
                timeline !== undefined &&
                timeline.items.length > 0 &&
                !timeline.more) {
                // If we are not resetting, have item(s), and already know there are no more to fetch, we're done here
                return false;
            }
            options = { cursor: reset ? undefined : timeline?.cursor, limit: this.pageSize };
        }
        const pendingRequest = this.pendingRequests.get(source);
        if (pendingRequest !== undefined) {
            options.cursor = pendingRequest.request.options.cursor;
            // TODO@eamodio deal with concurrent requests better
            if (typeof options.limit === 'number') {
                if (typeof pendingRequest.request.options.limit === 'number') {
                    options.limit += pendingRequest.request.options.limit;
                }
                else {
                    options.limit = pendingRequest.request.options.limit;
                }
            }
        }
        pendingRequest?.request?.tokenSource.cancel();
        pendingRequest?.dispose();
        options.cacheResults = true;
        options.resetCache = reset;
        const tokenSource = new CancellationTokenSource();
        const newRequest = this.timelineService.getTimeline(source, uri, options, tokenSource);
        if (newRequest === undefined) {
            tokenSource.dispose();
            return false;
        }
        const disposables = new DisposableStore();
        this.pendingRequests.set(source, { request: newRequest, dispose: () => disposables.dispose() });
        disposables.add(tokenSource);
        disposables.add(tokenSource.token.onCancellationRequested(() => this.pendingRequests.delete(source)));
        this.handleRequest(newRequest);
        return true;
    }
    updateTimeline(timeline, reset) {
        if (reset) {
            this.timelinesBySource.delete(timeline.source);
            // Override the limit, to re-query for all our existing cached (possibly visible) items to keep visual continuity
            const { oldest } = timeline;
            this.loadTimelineForSource(timeline.source, this.uri, true, oldest !== undefined ? { limit: { timestamp: oldest.timestamp, id: oldest.id } } : undefined);
        }
        else {
            // Override the limit, to query for any newer items
            const { newest } = timeline;
            this.loadTimelineForSource(timeline.source, this.uri, false, newest !== undefined ? { limit: { timestamp: newest.timestamp, id: newest.id } } : { limit: this.pageSize });
        }
    }
    async handleRequest(request) {
        let response;
        try {
            response = await this.progressService.withProgress({ location: this.id }, () => request.result);
        }
        catch {
            // Ignore
        }
        // If the request was cancelled then it was already deleted from the pendingRequests map
        if (!request.tokenSource.token.isCancellationRequested) {
            this.pendingRequests.get(request.source)?.dispose();
            this.pendingRequests.delete(request.source);
        }
        if (response === undefined || request.uri !== this.uri) {
            if (this.pendingRequests.size === 0 && this._pendingRefresh) {
                this.refresh();
            }
            return;
        }
        const source = request.source;
        let updated = false;
        const timeline = this.timelinesBySource.get(source);
        if (timeline === undefined) {
            this.timelinesBySource.set(source, new TimelineAggregate(response));
            updated = true;
        }
        else {
            updated = timeline.add(response, request.options);
        }
        if (updated) {
            this._pendingRefresh = true;
            // If we have visible items already and there are other pending requests, debounce for a bit to wait for other requests
            if (this.hasVisibleItems && this.pendingRequests.size !== 0) {
                this.refreshDebounced();
            }
            else {
                this.refresh();
            }
        }
        else if (this.pendingRequests.size === 0) {
            if (this._pendingRefresh) {
                this.refresh();
            }
            else {
                this.tree.rerender();
            }
        }
    }
    *getItems() {
        let more = false;
        if (this.uri === undefined || this.timelinesBySource.size === 0) {
            this._visibleItemCount = 0;
            return;
        }
        const maxCount = this._maxItemCount;
        let count = 0;
        if (this.timelinesBySource.size === 1) {
            const [source, timeline] = Iterable.first(this.timelinesBySource);
            timeline.lastRenderedIndex = -1;
            if (this.excludedSources.has(source)) {
                this._visibleItemCount = 0;
                return;
            }
            if (timeline.items.length !== 0) {
                // If we have any items, just say we have one for now -- the real count will be updated below
                this._visibleItemCount = 1;
            }
            more = timeline.more;
            let lastRelativeTime;
            for (const item of timeline.items) {
                item.relativeTime = undefined;
                item.hideRelativeTime = undefined;
                count++;
                if (count > maxCount) {
                    more = true;
                    break;
                }
                lastRelativeTime = updateRelativeTime(item, lastRelativeTime);
                yield { element: item };
            }
            timeline.lastRenderedIndex = count - 1;
        }
        else {
            const sources = [];
            let hasAnyItems = false;
            let mostRecentEnd = 0;
            for (const [source, timeline] of this.timelinesBySource) {
                timeline.lastRenderedIndex = -1;
                if (this.excludedSources.has(source) || timeline.stale) {
                    continue;
                }
                if (timeline.items.length !== 0) {
                    hasAnyItems = true;
                }
                if (timeline.more) {
                    more = true;
                    const last = timeline.items[Math.min(maxCount, timeline.items.length - 1)];
                    if (last.timestamp > mostRecentEnd) {
                        mostRecentEnd = last.timestamp;
                    }
                }
                const iterator = timeline.items[Symbol.iterator]();
                sources.push({ timeline, iterator, nextItem: iterator.next() });
            }
            this._visibleItemCount = hasAnyItems ? 1 : 0;
            function getNextMostRecentSource() {
                return sources
                    .filter(source => !source.nextItem.done)
                    .reduce((previous, current) => (previous === undefined || current.nextItem.value.timestamp >= previous.nextItem.value.timestamp) ? current : previous, undefined);
            }
            let lastRelativeTime;
            let nextSource;
            while (nextSource = getNextMostRecentSource()) {
                nextSource.timeline.lastRenderedIndex++;
                const item = nextSource.nextItem.value;
                item.relativeTime = undefined;
                item.hideRelativeTime = undefined;
                if (item.timestamp >= mostRecentEnd) {
                    count++;
                    if (count > maxCount) {
                        more = true;
                        break;
                    }
                    lastRelativeTime = updateRelativeTime(item, lastRelativeTime);
                    yield { element: item };
                }
                nextSource.nextItem = nextSource.iterator.next();
            }
        }
        this._visibleItemCount = count;
        if (count > 0) {
            if (more) {
                yield {
                    element: new LoadMoreCommand(this.pendingRequests.size !== 0)
                };
            }
            else if (this.pendingRequests.size !== 0) {
                yield {
                    element: new LoadMoreCommand(true)
                };
            }
        }
    }
    refresh() {
        if (!this.isBodyVisible()) {
            return;
        }
        this.tree.setChildren(null, this.getItems());
        this._isEmpty = !this.hasVisibleItems;
        if (this.uri === undefined) {
            this.updateFilename(undefined);
            this.message = localize('timeline.editorCannotProvideTimeline', "The active editor cannot provide timeline information.");
        }
        else if (this._isEmpty) {
            if (this.pendingRequests.size !== 0) {
                this.setLoadingUriMessage();
            }
            else {
                this.updateFilename(this.labelService.getUriBasenameLabel(this.uri));
                const scmProviderCount = this.contextKeyService.getContextKeyValue('scm.providerCount');
                if (this.timelineService.getSources().filter(({ id }) => !this.excludedSources.has(id)).length === 0) {
                    this.message = localize('timeline.noTimelineSourcesEnabled', "All timeline sources have been filtered out.");
                }
                else {
                    if (this.configurationService.getValue('workbench.localHistory.enabled') && !this.excludedSources.has('timeline.localHistory')) {
                        this.message = localize('timeline.noLocalHistoryYet', "Local History will track recent changes as you save them unless the file has been excluded or is too large.");
                    }
                    else if (this.excludedSources.size > 0) {
                        this.message = localize('timeline.noTimelineInfoFromEnabledSources', "No filtered timeline information was provided.");
                    }
                    else {
                        this.message = localize('timeline.noTimelineInfo', "No timeline information was provided.");
                    }
                }
                if (!scmProviderCount || scmProviderCount === 0) {
                    this.message += ' ' + localize('timeline.noSCM', "Source Control has not been configured.");
                }
            }
        }
        else {
            this.updateFilename(this.labelService.getUriBasenameLabel(this.uri));
            this.message = undefined;
        }
        this._pendingRefresh = false;
    }
    refreshDebounced() {
        this.refresh();
    }
    focus() {
        super.focus();
        this.tree.domFocus();
    }
    setExpanded(expanded) {
        const changed = super.setExpanded(expanded);
        if (changed && this.isBodyVisible()) {
            if (!this.followActiveEditor) {
                this.setUriCore(this.uri, true);
            }
            else {
                this.onActiveEditorChanged();
            }
        }
        return changed;
    }
    setVisible(visible) {
        if (visible) {
            this.extensionService.activateByEvent('onView:timeline');
            this.visibilityDisposables = new DisposableStore();
            this.editorService.onDidActiveEditorChange(this.onActiveEditorChanged, this, this.visibilityDisposables);
            // Refresh the view on focus to update the relative timestamps
            this.onDidFocus(() => this.refreshDebounced(), this, this.visibilityDisposables);
            super.setVisible(visible);
            this.onActiveEditorChanged();
        }
        else {
            this.visibilityDisposables?.dispose();
            super.setVisible(visible);
        }
    }
    layoutBody(height, width) {
        super.layoutBody(height, width);
        this.tree.layout(height, width);
    }
    renderHeaderTitle(container) {
        super.renderHeaderTitle(container, this.title);
        container.classList.add('timeline-view');
    }
    renderBody(container) {
        super.renderBody(container);
        this.$container = container;
        container.classList.add('tree-explorer-viewlet-tree-view', 'timeline-tree-view');
        this.$message = DOM.append(this.$container, DOM.$('.message'));
        this.$message.classList.add('timeline-subtle');
        this.message = localize('timeline.editorCannotProvideTimeline', "The active editor cannot provide timeline information.");
        this.$tree = document.createElement('div');
        this.$tree.classList.add('customview-tree', 'file-icon-themable-tree', 'hide-arrows');
        // this.treeElement.classList.add('show-file-icons');
        container.appendChild(this.$tree);
        this.treeRenderer = this.instantiationService.createInstance(TimelineTreeRenderer, this.commands, this.viewDescriptorService.getViewLocationById(this.id));
        this._register(this.treeRenderer.onDidScrollToEnd(item => {
            if (this.pageOnScroll) {
                this.loadMore(item);
            }
        }));
        this.tree = this.instantiationService.createInstance((WorkbenchObjectTree), 'TimelinePane', this.$tree, new TimelineListVirtualDelegate(), [this.treeRenderer], {
            identityProvider: new TimelineIdentityProvider(),
            accessibilityProvider: {
                getAriaLabel(element) {
                    if (isLoadMoreCommand(element)) {
                        return element.ariaLabel;
                    }
                    return element.accessibilityInformation ? element.accessibilityInformation.label : localize('timeline.aria.item', "{0}: {1}", element.relativeTimeFullWord ?? '', element.label);
                },
                getRole(element) {
                    if (isLoadMoreCommand(element)) {
                        return 'treeitem';
                    }
                    return element.accessibilityInformation && element.accessibilityInformation.role ? element.accessibilityInformation.role : 'treeitem';
                },
                getWidgetAriaLabel() {
                    return localize('timeline', "Timeline");
                }
            },
            keyboardNavigationLabelProvider: new TimelineKeyboardNavigationLabelProvider(),
            multipleSelectionSupport: false,
            overrideStyles: this.getLocationBasedColors().listOverrideStyles,
        });
        TimelineViewFocusedContext.bindTo(this.tree.contextKeyService);
        this._register(this.tree.onContextMenu(e => this.onContextMenu(this.commands, e)));
        this._register(this.tree.onDidChangeSelection(e => this.ensureValidItems()));
        this._register(this.tree.onDidOpen(e => {
            if (!e.browserEvent || !this.ensureValidItems()) {
                return;
            }
            const selection = this.tree.getSelection();
            let item;
            if (selection.length === 1) {
                item = selection[0];
            }
            if (item === null) {
                return;
            }
            if (isTimelineItem(item)) {
                if (item.command) {
                    let args = item.command.arguments ?? [];
                    if (item.command.id === API_OPEN_EDITOR_COMMAND_ID || item.command.id === API_OPEN_DIFF_EDITOR_COMMAND_ID) {
                        // Some commands owned by us should receive the
                        // `IOpenEvent` as context to open properly
                        args = [...args, e];
                    }
                    this.commandService.executeCommand(item.command.id, ...args);
                }
            }
            else if (isLoadMoreCommand(item)) {
                this.loadMore(item);
            }
        }));
    }
    loadMore(item) {
        if (item.loading) {
            return;
        }
        item.loading = true;
        this.tree.rerender(item);
        if (this.pendingRequests.size !== 0) {
            return;
        }
        this._maxItemCount = this._visibleItemCount + this.pageSize;
        this.loadTimeline(false);
    }
    ensureValidItems() {
        // If we don't have any non-excluded timelines, clear the tree and show the loading message
        if (!this.hasVisibleItems || !this.timelineService.getSources().some(({ id }) => !this.excludedSources.has(id) && this.timelinesBySource.has(id))) {
            this.tree.setChildren(null, undefined);
            this._isEmpty = true;
            this.setLoadingUriMessage();
            return false;
        }
        return true;
    }
    setLoadingUriMessage() {
        const file = this.uri && this.labelService.getUriBasenameLabel(this.uri);
        this.updateFilename(file);
        this.message = file ? localize('timeline.loading', "Loading timeline for {0}...", file) : '';
    }
    onContextMenu(commands, treeEvent) {
        const item = treeEvent.element;
        if (item === null) {
            return;
        }
        const event = treeEvent.browserEvent;
        event.preventDefault();
        event.stopPropagation();
        if (!this.ensureValidItems()) {
            return;
        }
        this.tree.setFocus([item]);
        const actions = commands.getItemContextActions(item);
        if (!actions.length) {
            return;
        }
        this.contextMenuService.showContextMenu({
            getAnchor: () => treeEvent.anchor,
            getActions: () => actions,
            getActionViewItem: (action) => {
                const keybinding = this.keybindingService.lookupKeybinding(action.id);
                if (keybinding) {
                    return new ActionViewItem(action, action, { label: true, keybinding: keybinding.getLabel() });
                }
                return undefined;
            },
            onHide: (wasCancelled) => {
                if (wasCancelled) {
                    this.tree.domFocus();
                }
            },
            getActionsContext: () => ({ uri: this.uri, item }),
            actionRunner: new TimelineActionRunner()
        });
    }
};
__decorate([
    debounce(500)
], TimelinePane.prototype, "refreshDebounced", null);
TimelinePane = __decorate([
    __param(1, IKeybindingService),
    __param(2, IContextMenuService),
    __param(3, IContextKeyService),
    __param(4, IConfigurationService),
    __param(5, IStorageService),
    __param(6, IViewDescriptorService),
    __param(7, IInstantiationService),
    __param(8, IEditorService),
    __param(9, ICommandService),
    __param(10, IProgressService),
    __param(11, ITimelineService),
    __param(12, IOpenerService),
    __param(13, IThemeService),
    __param(14, IHoverService),
    __param(15, ILabelService),
    __param(16, IUriIdentityService),
    __param(17, IExtensionService)
], TimelinePane);
export { TimelinePane };
class TimelineElementTemplate {
    static { this.id = 'TimelineElementTemplate'; }
    constructor(container, actionViewItemProvider, hoverDelegate) {
        container.classList.add('custom-view-tree-node-item');
        this.icon = DOM.append(container, DOM.$('.custom-view-tree-node-item-icon'));
        this.iconLabel = new IconLabel(container, { supportHighlights: true, supportIcons: true, hoverDelegate });
        const timestampContainer = DOM.append(this.iconLabel.element, DOM.$('.timeline-timestamp-container'));
        this.timestamp = DOM.append(timestampContainer, DOM.$('span.timeline-timestamp'));
        const actionsContainer = DOM.append(this.iconLabel.element, DOM.$('.actions'));
        this.actionBar = new ActionBar(actionsContainer, { actionViewItemProvider });
    }
    dispose() {
        this.iconLabel.dispose();
        this.actionBar.dispose();
    }
    reset() {
        this.icon.className = '';
        this.icon.style.backgroundImage = '';
        this.actionBar.clear();
    }
}
export class TimelineIdentityProvider {
    getId(item) {
        return item.handle;
    }
}
class TimelineActionRunner extends ActionRunner {
    async runAction(action, { uri, item }) {
        if (!isTimelineItem(item)) {
            // TODO@eamodio do we need to do anything else?
            await action.run();
            return;
        }
        await action.run({
            $mid: 12 /* MarshalledId.TimelineActionContext */,
            handle: item.handle,
            source: item.source,
            uri
        }, uri, item.source);
    }
}
export class TimelineKeyboardNavigationLabelProvider {
    getKeyboardNavigationLabel(element) {
        return element.label;
    }
}
export class TimelineListVirtualDelegate {
    getHeight(_element) {
        return ItemHeight;
    }
    getTemplateId(element) {
        return TimelineElementTemplate.id;
    }
}
let TimelineTreeRenderer = class TimelineTreeRenderer {
    constructor(commands, viewContainerLocation, instantiationService, themeService) {
        this.commands = commands;
        this.viewContainerLocation = viewContainerLocation;
        this.instantiationService = instantiationService;
        this.themeService = themeService;
        this._onDidScrollToEnd = new Emitter();
        this.onDidScrollToEnd = this._onDidScrollToEnd.event;
        this.templateId = TimelineElementTemplate.id;
        this.actionViewItemProvider = createActionViewItem.bind(undefined, this.instantiationService);
        this._hoverDelegate = this.instantiationService.createInstance(WorkbenchHoverDelegate, this.viewContainerLocation === 1 /* ViewContainerLocation.Panel */ ? 'mouse' : 'element', {
            instantHover: this.viewContainerLocation !== 1 /* ViewContainerLocation.Panel */
        }, {
            position: {
                hoverPosition: 1 /* HoverPosition.RIGHT */ // Will flip when there's no space
            }
        });
    }
    setUri(uri) {
        this.uri = uri;
    }
    renderTemplate(container) {
        return new TimelineElementTemplate(container, this.actionViewItemProvider, this._hoverDelegate);
    }
    renderElement(node, index, template) {
        template.reset();
        const { element: item } = node;
        const theme = this.themeService.getColorTheme();
        const icon = theme.type === ColorScheme.LIGHT ? item.icon : item.iconDark;
        const iconUrl = icon ? URI.revive(icon) : null;
        if (iconUrl) {
            template.icon.className = 'custom-view-tree-node-item-icon';
            template.icon.style.backgroundImage = css.asCSSUrl(iconUrl);
            template.icon.style.color = '';
        }
        else if (item.themeIcon) {
            template.icon.className = `custom-view-tree-node-item-icon ${ThemeIcon.asClassName(item.themeIcon)}`;
            if (item.themeIcon.color) {
                template.icon.style.color = theme.getColor(item.themeIcon.color.id)?.toString() ?? '';
            }
            else {
                template.icon.style.color = '';
            }
            template.icon.style.backgroundImage = '';
        }
        else {
            template.icon.className = 'custom-view-tree-node-item-icon';
            template.icon.style.backgroundImage = '';
            template.icon.style.color = '';
        }
        const tooltip = item.tooltip
            ? isString(item.tooltip)
                ? item.tooltip
                : { markdown: item.tooltip, markdownNotSupportedFallback: renderAsPlaintext(item.tooltip) }
            : undefined;
        template.iconLabel.setLabel(item.label, item.description, {
            title: tooltip,
            matches: createMatches(node.filterData)
        });
        template.timestamp.textContent = item.relativeTime ?? '';
        template.timestamp.ariaLabel = item.relativeTimeFullWord ?? '';
        template.timestamp.parentElement.classList.toggle('timeline-timestamp--duplicate', isTimelineItem(item) && item.hideRelativeTime);
        template.actionBar.context = { uri: this.uri, item };
        template.actionBar.actionRunner = new TimelineActionRunner();
        template.actionBar.push(this.commands.getItemActions(item), { icon: true, label: false });
        // If we are rendering the load more item, we've scrolled to the end, so trigger an event
        if (isLoadMoreCommand(item)) {
            setTimeout(() => this._onDidScrollToEnd.fire(item), 0);
        }
    }
    disposeElement(element, index, templateData) {
        templateData.actionBar.actionRunner.dispose();
    }
    disposeTemplate(template) {
        template.dispose();
    }
};
TimelineTreeRenderer = __decorate([
    __param(2, IInstantiationService),
    __param(3, IThemeService)
], TimelineTreeRenderer);
const timelineRefresh = registerIcon('timeline-refresh', Codicon.refresh, localize('timelineRefresh', 'Icon for the refresh timeline action.'));
const timelinePin = registerIcon('timeline-pin', Codicon.pin, localize('timelinePin', 'Icon for the pin timeline action.'));
const timelineUnpin = registerIcon('timeline-unpin', Codicon.pinned, localize('timelineUnpin', 'Icon for the unpin timeline action.'));
let TimelinePaneCommands = class TimelinePaneCommands extends Disposable {
    constructor(pane, timelineService, storageService, contextKeyService, menuService) {
        super();
        this.pane = pane;
        this.timelineService = timelineService;
        this.storageService = storageService;
        this.contextKeyService = contextKeyService;
        this.menuService = menuService;
        this._register(this.sourceDisposables = new DisposableStore());
        this._register(registerAction2(class extends Action2 {
            constructor() {
                super({
                    id: 'timeline.refresh',
                    title: localize2('refresh', "Refresh"),
                    icon: timelineRefresh,
                    category: localize2('timeline', "Timeline"),
                    menu: {
                        id: MenuId.TimelineTitle,
                        group: 'navigation',
                        order: 99,
                    }
                });
            }
            run(accessor, ...args) {
                pane.reset();
            }
        }));
        this._register(CommandsRegistry.registerCommand('timeline.toggleFollowActiveEditor', (accessor, ...args) => pane.followActiveEditor = !pane.followActiveEditor));
        this._register(MenuRegistry.appendMenuItem(MenuId.TimelineTitle, ({
            command: {
                id: 'timeline.toggleFollowActiveEditor',
                title: localize2('timeline.toggleFollowActiveEditorCommand.follow', 'Pin the Current Timeline'),
                icon: timelinePin,
                category: localize2('timeline', "Timeline"),
            },
            group: 'navigation',
            order: 98,
            when: TimelineFollowActiveEditorContext
        })));
        this._register(MenuRegistry.appendMenuItem(MenuId.TimelineTitle, ({
            command: {
                id: 'timeline.toggleFollowActiveEditor',
                title: localize2('timeline.toggleFollowActiveEditorCommand.unfollow', 'Unpin the Current Timeline'),
                icon: timelineUnpin,
                category: localize2('timeline', "Timeline"),
            },
            group: 'navigation',
            order: 98,
            when: TimelineFollowActiveEditorContext.toNegated()
        })));
        this._register(timelineService.onDidChangeProviders(() => this.updateTimelineSourceFilters()));
        this.updateTimelineSourceFilters();
    }
    getItemActions(element) {
        return this.getActions(MenuId.TimelineItemContext, { key: 'timelineItem', value: element.contextValue }).primary;
    }
    getItemContextActions(element) {
        return this.getActions(MenuId.TimelineItemContext, { key: 'timelineItem', value: element.contextValue }).secondary;
    }
    getActions(menuId, context) {
        const contextKeyService = this.contextKeyService.createOverlay([
            ['view', this.pane.id],
            [context.key, context.value],
        ]);
        const menu = this.menuService.getMenuActions(menuId, contextKeyService, { shouldForwardArgs: true });
        return getContextMenuActions(menu, 'inline');
    }
    updateTimelineSourceFilters() {
        this.sourceDisposables.clear();
        const excluded = new Set(JSON.parse(this.storageService.get('timeline.excludeSources', 0 /* StorageScope.PROFILE */, '[]')));
        for (const source of this.timelineService.getSources()) {
            this.sourceDisposables.add(registerAction2(class extends Action2 {
                constructor() {
                    super({
                        id: `timeline.toggleExcludeSource:${source.id}`,
                        title: source.label,
                        menu: {
                            id: MenuId.TimelineFilterSubMenu,
                            group: 'navigation',
                        },
                        toggled: ContextKeyExpr.regex(`timelineExcludeSources`, new RegExp(`\\b${escapeRegExpCharacters(source.id)}\\b`)).negate()
                    });
                }
                run(accessor, ...args) {
                    if (excluded.has(source.id)) {
                        excluded.delete(source.id);
                    }
                    else {
                        excluded.add(source.id);
                    }
                    const storageService = accessor.get(IStorageService);
                    storageService.store('timeline.excludeSources', JSON.stringify([...excluded.keys()]), 0 /* StorageScope.PROFILE */, 0 /* StorageTarget.USER */);
                }
            }));
        }
    }
};
TimelinePaneCommands = __decorate([
    __param(1, ITimelineService),
    __param(2, IStorageService),
    __param(3, IContextKeyService),
    __param(4, IMenuService)
], TimelinePaneCommands);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGltZWxpbmVQYW5lLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvYWR2aWthci9Eb2N1bWVudHMvYXJjaGl0ZWN0L2FyY2gyL0FyY2hJREUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGltZWxpbmUvYnJvd3Nlci90aW1lbGluZVBhbmUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTywwQkFBMEIsQ0FBQztBQUNsQyxPQUFPLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQ3pELE9BQU8sS0FBSyxHQUFHLE1BQU0saUNBQWlDLENBQUM7QUFDdkQsT0FBTyxLQUFLLEdBQUcsTUFBTSxzQ0FBc0MsQ0FBQztBQUM1RCxPQUFPLEVBQVcsWUFBWSxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDM0UsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDbEYsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQzFELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUNqRSxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0sa0NBQWtDLENBQUM7QUFDbEUsT0FBTyxFQUFjLGFBQWEsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQy9FLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUMvRCxPQUFPLEVBQUUsZUFBZSxFQUFlLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2hHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUM3RCxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDM0UsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDNUUsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdD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