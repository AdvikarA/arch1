/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../nls.js';
import * as platform from '../../../../base/common/platform.js';
import { MenuItemAction } from '../../../../platform/actions/common/actions.js';
import { Action } from '../../../../base/common/actions.js';
import { createActionViewItem, getActionBarActions, getContextMenuActions } from '../../../../platform/actions/browser/menuEntryActionViewItem.js';
import { equals } from '../../../../base/common/arrays.js';
import { ActionViewItem } from '../../../../base/browser/ui/actionbar/actionViewItems.js';
import { renderLabelWithIcons } from '../../../../base/browser/ui/iconLabel/iconLabels.js';
import { reset } from '../../../../base/browser/dom.js';
import { ResourceTree } from '../../../../base/common/resourceTree.js';
import { MarkdownString } from '../../../../base/common/htmlContent.js';
import { URI } from '../../../../base/common/uri.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { fromNow, safeIntl } from '../../../../base/common/date.js';
import { historyItemHoverAdditionsForeground, historyItemHoverDefaultLabelBackground, historyItemHoverDefaultLabelForeground, historyItemHoverDeletionsForeground, historyItemHoverLabelForeground } from './scmHistory.js';
import { asCssVariable } from '../../../../platform/theme/common/colorUtils.js';
export function isSCMViewService(element) {
    return Array.isArray(element.repositories) && Array.isArray(element.visibleRepositories);
}
export function isSCMRepository(element) {
    return !!element.provider && !!element.input;
}
export function isSCMInput(element) {
    return !!element.validateInput && typeof element.value === 'string';
}
export function isSCMActionButton(element) {
    return element.type === 'actionButton';
}
export function isSCMResourceGroup(element) {
    return !!element.provider && !!element.resources;
}
export function isSCMResource(element) {
    return !!element.sourceUri && isSCMResourceGroup(element.resourceGroup);
}
export function isSCMResourceNode(element) {
    return ResourceTree.isResourceNode(element) && isSCMResourceGroup(element.context);
}
export function isSCMHistoryItemViewModelTreeElement(element) {
    return element.type === 'historyItemViewModel';
}
export function isSCMHistoryItemLoadMoreTreeElement(element) {
    return element.type === 'historyItemLoadMore';
}
export function isSCMHistoryItemChangeViewModelTreeElement(element) {
    return element.type === 'historyItemChangeViewModel';
}
export function isSCMHistoryItemChangeNode(element) {
    return ResourceTree.isResourceNode(element) && isSCMHistoryItemViewModelTreeElement(element.context);
}
const compareActions = (a, b) => {
    if (a instanceof MenuItemAction && b instanceof MenuItemAction) {
        return a.id === b.id && a.enabled === b.enabled && a.hideActions?.isHidden === b.hideActions?.isHidden;
    }
    return a.id === b.id && a.enabled === b.enabled;
};
export function connectPrimaryMenu(menu, callback, primaryGroup) {
    let cachedPrimary = [];
    let cachedSecondary = [];
    const updateActions = () => {
        const { primary, secondary } = getActionBarActions(menu.getActions({ shouldForwardArgs: true }), primaryGroup);
        if (equals(cachedPrimary, primary, compareActions) && equals(cachedSecondary, secondary, compareActions)) {
            return;
        }
        cachedPrimary = primary;
        cachedSecondary = secondary;
        callback(primary, secondary);
    };
    updateActions();
    return menu.onDidChange(updateActions);
}
export function collectContextMenuActions(menu) {
    return getContextMenuActions(menu.getActions({ shouldForwardArgs: true }), 'inline').secondary;
}
export class StatusBarAction extends Action {
    constructor(command, commandService) {
        super(`statusbaraction{${command.id}}`, command.title, '', true);
        this.command = command;
        this.commandService = commandService;
        this.tooltip = command.tooltip || '';
    }
    run() {
        return this.commandService.executeCommand(this.command.id, ...(this.command.arguments || []));
    }
}
class StatusBarActionViewItem extends ActionViewItem {
    constructor(action, options) {
        super(null, action, { ...options, icon: false, label: true });
    }
    updateLabel() {
        if (this.options.label && this.label) {
            reset(this.label, ...renderLabelWithIcons(this.action.label));
        }
    }
}
export function getActionViewItemProvider(instaService) {
    return (action, options) => {
        if (action instanceof StatusBarAction) {
            return new StatusBarActionViewItem(action, options);
        }
        return createActionViewItem(instaService, action, options);
    };
}
export function getProviderKey(provider) {
    return `${provider.providerId}:${provider.label}${provider.rootUri ? `:${provider.rootUri.toString()}` : ''}`;
}
export function getRepositoryResourceCount(provider) {
    return provider.groups.reduce((r, g) => r + g.resources.length, 0);
}
export function getHistoryItemEditorTitle(historyItem, maxLength = 20) {
    const title = historyItem.subject.length <= maxLength ?
        historyItem.subject : `${historyItem.subject.substring(0, maxLength)}\u2026`;
    return `${historyItem.displayId ?? historyItem.id} - ${title}`;
}
export function getHistoryItemHoverContent(themeService, historyItem) {
    const colorTheme = themeService.getColorTheme();
    const markdown = new MarkdownString('', { isTrusted: true, supportThemeIcons: true });
    if (historyItem.author) {
        const icon = URI.isUri(historyItem.authorIcon)
            ? `![${historyItem.author}](${historyItem.authorIcon.toString()}|width=20,height=20)`
            : ThemeIcon.isThemeIcon(historyItem.authorIcon)
                ? `$(${historyItem.authorIcon.id})`
                : '$(account)';
        if (historyItem.authorEmail) {
            const emailTitle = localize('emailLinkTitle', "Email");
            markdown.appendMarkdown(`${icon} [**${historyItem.author}**](mailto:${historyItem.authorEmail} "${emailTitle} ${historyItem.author}")`);
        }
        else {
            markdown.appendMarkdown(`${icon} **${historyItem.author}**`);
        }
        if (historyItem.timestamp) {
            const dateFormatter = safeIntl.DateTimeFormat(platform.language, { year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric' }).value;
            markdown.appendMarkdown(`, $(history) ${fromNow(historyItem.timestamp, true, true)} (${dateFormatter.format(historyItem.timestamp)})`);
        }
        markdown.appendMarkdown('\n\n');
    }
    markdown.appendMarkdown(`${historyItem.message.replace(/\r\n|\r|\n/g, '\n\n')}\n\n`);
    if (historyItem.statistics) {
        markdown.appendMarkdown(`---\n\n`);
        markdown.appendMarkdown(`<span>${historyItem.statistics.files === 1 ?
            localize('fileChanged', "{0} file changed", historyItem.statistics.files) :
            localize('filesChanged', "{0} files changed", historyItem.statistics.files)}</span>`);
        if (historyItem.statistics.insertions) {
            const additionsForegroundColor = colorTheme.getColor(historyItemHoverAdditionsForeground);
            markdown.appendMarkdown(`,&nbsp;<span style="color:${additionsForegroundColor};">${historyItem.statistics.insertions === 1 ?
                localize('insertion', "{0} insertion{1}", historyItem.statistics.insertions, '(+)') :
                localize('insertions', "{0} insertions{1}", historyItem.statistics.insertions, '(+)')}</span>`);
        }
        if (historyItem.statistics.deletions) {
            const deletionsForegroundColor = colorTheme.getColor(historyItemHoverDeletionsForeground);
            markdown.appendMarkdown(`,&nbsp;<span style="color:${deletionsForegroundColor};">${historyItem.statistics.deletions === 1 ?
                localize('deletion', "{0} deletion{1}", historyItem.statistics.deletions, '(-)') :
                localize('deletions', "{0} deletions{1}", historyItem.statistics.deletions, '(-)')}</span>`);
        }
    }
    if ((historyItem.references ?? []).length > 0) {
        markdown.appendMarkdown(`\n\n---\n\n`);
        markdown.appendMarkdown((historyItem.references ?? []).map(ref => {
            const labelIconId = ThemeIcon.isThemeIcon(ref.icon) ? ref.icon.id : '';
            const labelBackgroundColor = ref.color ? asCssVariable(ref.color) : asCssVariable(historyItemHoverDefaultLabelBackground);
            const labelForegroundColor = ref.color ? asCssVariable(historyItemHoverLabelForeground) : asCssVariable(historyItemHoverDefaultLabelForeground);
            return `<span style="color:${labelForegroundColor};background-color:${labelBackgroundColor};border-radius:10px;">&nbsp;$(${labelIconId})&nbsp;${ref.name}&nbsp;&nbsp;</span>`;
        }).join('&nbsp;&nbsp;'));
    }
    return { markdown, markdownNotSupportedFallback: historyItem.message };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL2FkdmlrYXIvRG9jdW1lbnRzL2FyY2hpdGVjdC9hcmNoMi9BcmNoSURFL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3NjbS9icm93c2VyL3V0aWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQzlDLE9BQU8sS0FBSyxRQUFRLE1BQU0scUNBQXFDLENBQUM7QUFHaEUsT0FBTyxFQUFTLGNBQWMsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBR3ZGLE9BQU8sRUFBRSxNQUFNLEVBQVcsTUFBTSxvQ0FBb0MsQ0FBQztBQUNyRSxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsbUJBQW1CLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxpRUFBaUUsQ0FBQztBQUNuSixPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDM0QsT0FBTyxFQUFFLGNBQWMsRUFBOEIsTUFBTSwwREFBMEQsQ0FBQztBQUN0SCxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxxREFBcUQsQ0FBQztBQUczRixPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFFeEQsT0FBTyxFQUFpQixZQUFZLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUd0RixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDeEUsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ3JELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNqRSxPQUFPLEVBQUUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQ3BFLE9BQU8sRUFBRSxtQ0FBbUMsRUFBRSxzQ0FBc0MsRUFBRSxzQ0FBc0MsRUFBRSxtQ0FBbUMsRUFBRSwr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