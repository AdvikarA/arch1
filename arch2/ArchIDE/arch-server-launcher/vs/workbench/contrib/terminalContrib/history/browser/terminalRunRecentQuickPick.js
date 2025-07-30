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
var TerminalOutputProvider_1;
import { Toggle } from '../../../../../base/browser/ui/toggle/toggle.js';
import { isMacintosh } from '../../../../../base/common/platform.js';
import { IModelService } from '../../../../../editor/common/services/model.js';
import { ITextModelService } from '../../../../../editor/common/services/resolverService.js';
import { localize } from '../../../../../nls.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { IQuickInputService } from '../../../../../platform/quickinput/common/quickInput.js';
import { collapseTildePath } from '../../../../../platform/terminal/common/terminalEnvironment.js';
import { asCssVariable, inputActiveOptionBackground, inputActiveOptionBorder, inputActiveOptionForeground } from '../../../../../platform/theme/common/colorRegistry.js';
import { ThemeIcon } from '../../../../../base/common/themables.js';
import { commandHistoryFuzzySearchIcon, commandHistoryOpenFileIcon, commandHistoryOutputIcon, commandHistoryRemoveIcon } from '../../../terminal/browser/terminalIcons.js';
import { terminalStrings } from '../../../terminal/common/terminalStrings.js';
import { URI } from '../../../../../base/common/uri.js';
import { fromNow } from '../../../../../base/common/date.js';
import { IEditorService } from '../../../../services/editor/common/editorService.js';
import { showWithPinnedItems } from '../../../../../platform/quickinput/browser/quickPickPin.js';
import { IStorageService } from '../../../../../platform/storage/common/storage.js';
import { IAccessibleViewService } from '../../../../../platform/accessibility/browser/accessibleView.js';
import { Disposable, DisposableStore } from '../../../../../base/common/lifecycle.js';
import { getCommandHistory, getDirectoryHistory, getShellFileHistory } from '../common/history.js';
export async function showRunRecentQuickPick(accessor, instance, terminalInRunCommandPicker, type, filterMode, value) {
    if (!instance.xterm) {
        return;
    }
    const accessibleViewService = accessor.get(IAccessibleViewService);
    const editorService = accessor.get(IEditorService);
    const instantiationService = accessor.get(IInstantiationService);
    const quickInputService = accessor.get(IQuickInputService);
    const storageService = accessor.get(IStorageService);
    const runRecentStorageKey = `${"terminal.pinnedRecentCommands" /* TerminalStorageKeys.PinnedRecentCommandsPrefix */}.${instance.shellType}`;
    let placeholder;
    let items = [];
    const commandMap = new Set();
    const removeFromCommandHistoryButton = {
        iconClass: ThemeIcon.asClassName(commandHistoryRemoveIcon),
        tooltip: localize('removeCommand', "Remove from Command History")
    };
    const commandOutputButton = {
        iconClass: ThemeIcon.asClassName(commandHistoryOutputIcon),
        tooltip: localize('viewCommandOutput', "View Command Output"),
        alwaysVisible: false
    };
    const openResourceButtons = [];
    if (type === 'command') {
        placeholder = isMacintosh ? localize('selectRecentCommandMac', 'Select a command to run (hold Option-key to edit the command)') : localize('selectRecentCommand', 'Select a command to run (hold Alt-key to edit the command)');
        const cmdDetection = instance.capabilities.get(2 /* TerminalCapability.CommandDetection */);
        const commands = cmdDetection?.commands;
        // Current session history
        const executingCommand = cmdDetection?.executingCommand;
        if (executingCommand) {
            commandMap.add(executingCommand);
        }
        function formatLabel(label) {
            return label
                // Replace new lines with "enter" symbol
                .replace(/\r?\n/g, '\u23CE')
                // Replace 3 or more spaces with midline horizontal ellipsis which looks similar
                // to whitespace in the editor
                .replace(/\s\s\s+/g, '\u22EF');
        }
        if (commands && commands.length > 0) {
            for (let i = commands.length - 1; i >= 0; i--) {
                const entry = commands[i];
                // Trim off any whitespace and/or line endings, replace new lines with the
                // Downwards Arrow with Corner Leftwards symbol
                const label = entry.command.trim();
                if (label.length === 0 || commandMap.has(label)) {
                    continue;
                }
                let description = collapseTildePath(entry.cwd, instance.userHome, instance.os === 1 /* OperatingSystem.Windows */ ? '\\' : '/');
                if (entry.exitCode) {
                    // Since you cannot get the last command's exit code on pwsh, just whether it failed
                    // or not, -1 is treated specially as simply failed
                    if (entry.exitCode === -1) {
                        description += ' failed';
                    }
                    else {
                        description += ` exitCode: ${entry.exitCode}`;
                    }
                }
                description = description.trim();
                const buttons = [commandOutputButton];
                // Merge consecutive commands
                const lastItem = items.length > 0 ? items[items.length - 1] : undefined;
                if (lastItem?.type !== 'separator' && lastItem?.label === label) {
                    lastItem.id = entry.timestamp.toString();
                    lastItem.description = description;
                    continue;
                }
                items.push({
                    label: formatLabel(label),
                    rawLabel: label,
                    description,
                    id: entry.timestamp.toString(),
                    command: entry,
                    buttons: entry.hasOutput() ? buttons : undefined
                });
                commandMap.add(label);
            }
        }
        if (executingCommand) {
            items.unshift({
                label: formatLabel(executingCommand),
                rawLabel: executingCommand,
                description: cmdDetection.cwd
            });
        }
        if (items.length > 0) {
            items.unshift({
                type: 'separator',
                buttons: [], // HACK: Force full sized separators as there's no flag currently
                label: terminalStrings.currentSessionCategory
            });
        }
        // Gather previous session history
        const history = instantiationService.invokeFunction(getCommandHistory);
        const previousSessionItems = [];
        for (const [label, info] of history.entries) {
            // Only add previous session item if it's not in this session
            if (!commandMap.has(label) && info.shellType === instance.shellType) {
                previousSessionItems.unshift({
                    label: formatLabel(label),
                    rawLabel: label,
                    buttons: [removeFromCommandHistoryButton]
                });
                commandMap.add(label);
            }
        }
        if (previousSessionItems.length > 0) {
            items.push({
                type: 'separator',
                buttons: [], // HACK: Force full sized separators as there's no flag currently
                label: terminalStrings.previousSessionCategory
            }, ...previousSessionItems);
        }
        // Gather shell file history
        const shellFileHistory = await instantiationService.invokeFunction(getShellFileHistory, instance.shellType);
        if (shellFileHistory !== undefined) {
            const dedupedShellFileItems = [];
            for (const label of shellFileHistory.commands) {
                if (!commandMap.has(label)) {
                    dedupedShellFileItems.unshift({
                        label: formatLabel(label),
                        rawLabel: label
                    });
                }
            }
            if (dedupedShellFileItems.length > 0) {
                const button = {
                    iconClass: ThemeIcon.asClassName(commandHistoryOpenFileIcon),
                    tooltip: localize('openShellHistoryFile', "Open File"),
                    alwaysVisible: false,
                    resource: shellFileHistory.sourceResource
                };
                openResourceButtons.push(button);
                items.push({
                    type: 'separator',
                    buttons: [button],
                    label: localize('shellFileHistoryCategory', '{0} history', instance.shellType),
                    description: shellFileHistory.sourceLabel
                }, ...dedupedShellFileItems);
            }
        }
    }
    else {
        placeholder = isMacintosh
            ? localize('selectRecentDirectoryMac', 'Select a directory to go to (hold Option-key to edit the command)')
            : localize('selectRecentDirectory', 'Select a directory to go to (hold Alt-key to edit the command)');
        const cwds = instance.capabilities.get(0 /* TerminalCapability.CwdDetection */)?.cwds || [];
        if (cwds && cwds.length > 0) {
            for (const label of cwds) {
                items.push({ label, rawLabel: label });
            }
            items = items.reverse();
            items.unshift({ type: 'separator', label: terminalStrings.currentSessionCategory });
        }
        // Gather previous session history
        const history = instantiationService.invokeFunction(getDirectoryHistory);
        const previousSessionItems = [];
        // Only add previous session item if it's not in this session and it matches the remote authority
        for (const [label, info] of history.entries) {
            if ((info === null || info.remoteAuthority === instance.remoteAuthority) && !cwds.includes(label)) {
                previousSessionItems.unshift({
                    label,
                    rawLabel: label,
                    buttons: [removeFromCommandHistoryButton]
                });
            }
        }
        if (previousSessionItems.length > 0) {
            items.push({ type: 'separator', label: terminalStrings.previousSessionCategory }, ...previousSessionItems);
        }
    }
    if (items.length === 0) {
        return;
    }
    const disposables = new DisposableStore();
    const fuzzySearchToggle = disposables.add(new Toggle({
        title: 'Fuzzy search',
        icon: commandHistoryFuzzySearchIcon,
        isChecked: filterMode === 'fuzzy',
        inputActiveOptionBorder: asCssVariable(inputActiveOptionBorder),
        inputActiveOptionForeground: asCssVariable(inputActiveOptionForeground),
        inputActiveOptionBackground: asCssVariable(inputActiveOptionBackground)
    }));
    disposables.add(fuzzySearchToggle.onChange(() => {
        instantiationService.invokeFunction(showRunRecentQuickPick, instance, terminalInRunCommandPicker, type, fuzzySearchToggle.checked ? 'fuzzy' : 'contiguous', quickPick.value);
    }));
    const outputProvider = disposables.add(instantiationService.createInstance(TerminalOutputProvider));
    const quickPick = disposables.add(quickInputService.createQuickPick({ useSeparators: true }));
    const originalItems = items;
    quickPick.items = [...originalItems];
    quickPick.sortByLabel = false;
    quickPick.placeholder = placeholder;
    quickPick.matchOnLabelMode = filterMode || 'contiguous';
    quickPick.toggles = [fuzzySearchToggle];
    disposables.add(quickPick.onDidTriggerItemButton(async (e) => {
        if (e.button === removeFromCommandHistoryButton) {
            if (type === 'command') {
                instantiationService.invokeFunction(getCommandHistory)?.remove(e.item.label);
            }
            else {
                instantiationService.invokeFunction(getDirectoryHistory)?.remove(e.item.label);
            }
        }
        else if (e.button === commandOutputButton) {
            const selectedCommand = e.item.command;
            const output = selectedCommand?.getOutput();
            if (output && selectedCommand?.command) {
                const textContent = await outputProvider.provideTextContent(URI.from({
                    scheme: TerminalOutputProvider.scheme,
                    path: `${selectedCommand.command}... ${fromNow(selectedCommand.timestamp, true)}`,
                    fragment: output,
                    query: `terminal-output-${selectedCommand.timestamp}-${instance.instanceId}`
                }));
                if (textContent) {
                    await editorService.openEditor({
                        resource: textContent.uri
                    });
                }
            }
        }
        await instantiationService.invokeFunction(showRunRecentQuickPick, instance, terminalInRunCommandPicker, type, filterMode, value);
    }));
    disposables.add(quickPick.onDidTriggerSeparatorButton(async (e) => {
        const resource = openResourceButtons.find(openResourceButton => e.button === openResourceButton)?.resource;
        if (resource) {
            await editorService.openEditor({
                resource
            });
        }
    }));
    disposables.add(quickPick.onDidChangeValue(async (value) => {
        if (!value) {
            await instantiationService.invokeFunction(showRunRecentQuickPick, instance, terminalInRunCommandPicker, type, filterMode, value);
        }
    }));
    let terminalScrollStateSaved = false;
    function restoreScrollState() {
        terminalScrollStateSaved = false;
        instance.xterm?.markTracker.restoreScrollState();
        instance.xterm?.markTracker.clear();
    }
    disposables.add(quickPick.onDidChangeActive(async () => {
        const xterm = instance.xterm;
        if (!xterm) {
            return;
        }
        const [item] = quickPick.activeItems;
        if (!item) {
            return;
        }
        if ('command' in item && item.command && item.command.marker) {
            if (!terminalScrollStateSaved) {
                xterm.markTracker.saveScrollState();
                terminalScrollStateSaved = true;
            }
            const promptRowCount = item.command.getPromptRowCount();
            const commandRowCount = item.command.getCommandRowCount();
            xterm.markTracker.revealRange({
                start: {
                    x: 1,
                    y: item.command.marker.line - (promptRowCount - 1) + 1
                },
                end: {
                    x: instance.cols,
                    y: item.command.marker.line + (commandRowCount - 1) + 1
                }
            });
        }
        else {
            restoreScrollState();
        }
    }));
    disposables.add(quickPick.onDidAccept(async () => {
        const result = quickPick.activeItems[0];
        let text;
        if (type === 'cwd') {
            text = `cd ${await instance.preparePathForShell(result.rawLabel)}`;
        }
        else { // command
            text = result.rawLabel;
        }
        quickPick.hide();
        terminalScrollStateSaved = false;
        instance.xterm?.markTracker.clear();
        instance.scrollToBottom();
        instance.runCommand(text, !quickPick.keyMods.alt);
        if (quickPick.keyMods.alt) {
            instance.focus();
        }
    }));
    disposables.add(quickPick.onDidHide(() => restoreScrollState()));
    if (value) {
        quickPick.value = value;
    }
    return new Promise(r => {
        terminalInRunCommandPicker.set(true);
        disposables.add(showWithPinnedItems(storageService, runRecentStorageKey, quickPick, true));
        disposables.add(quickPick.onDidHide(() => {
            terminalInRunCommandPicker.set(false);
            accessibleViewService.showLastProvider("terminal" /* AccessibleViewProviderId.Terminal */);
            r();
            disposables.dispose();
        }));
    });
}
let TerminalOutputProvider = class TerminalOutputProvider extends Disposable {
    static { TerminalOutputProvider_1 = this; }
    static { this.scheme = 'TERMINAL_OUTPUT'; }
    constructor(textModelResolverService, _modelService) {
        super();
        this._modelService = _modelService;
        this._register(textModelResolverService.registerTextModelContentProvider(TerminalOutputProvider_1.scheme, this));
    }
    async provideTextContent(resource) {
        const existing = this._modelService.getModel(resource);
        if (existing && !existing.isDisposed()) {
            return existing;
        }
        return this._modelService.createModel(resource.fragment, null, resource, false);
    }
};
TerminalOutputProvider = TerminalOutputProvider_1 = __decorate([
    __param(0, ITextModelService),
    __param(1, IModelService)
], TerminalOutputProvider);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxSdW5SZWNlbnRRdWlja1BpY2suanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9hZHZpa2FyL0RvY3VtZW50cy9hcmNoaXRlY3QvYXJjaDIvQXJjaElERS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXJtaW5hbENvbnRyaWIvaGlzdG9yeS9icm93c2VyL3Rlcm1pbmFsUnVuUmVjZW50UXVpY2tQaWNrLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0saURBQWlELENBQUM7QUFDekUsT0FBTyxFQUFFLFdBQVcsRUFBbUIsTUFBTSx3Q0FBd0MsQ0FBQztBQUV0RixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDL0UsT0FBTyxFQUE2QixpQkFBaUIsRUFBRSxNQUFNLDBEQUEwRCxDQUFDO0FBQ3hILE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUNqRCxPQUFPLEVBQUUscUJBQXFCLEVBQW9CLE1BQU0sK0RBQStELENBQUM7QUFDeEgsT0FBTyxFQUFxQixrQkFBa0IsRUFBdUMsTUFBTSx5REFBeUQsQ0FBQztBQUVySixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxnRUFBZ0UsQ0FBQztBQUNuRyxPQUFPLEVBQUUsYUFBYSxFQUFFLDJCQUEyQixFQUFFLHVCQUF1QixFQUFFLDJCQUEyQixFQUFFLE1BQU0sdURBQXVELENBQUM7QUFDekssT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBRXBFLE9BQU8sRUFBRSw2QkFBNkIsRUFBRSwwQkFBMEIsRUFBRSx3QkFBd0IsRUFBRSx3QkFBd0IsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBRTNLLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUM5RSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDeEQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQzdELE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxxREFBcUQsQ0FBQztBQUNyRixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNqRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFFcEYsT0FBTyxFQUE0QixzQkFBc0IsRUFBRSxNQUFNLGlFQUFpRSxDQUFDO0FBQ25JLE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDdEYsT0FBTyxFQUFFLGlCQUFpQixFQUFFLG1CQUFtQixFQUFFLG1CQUFtQixFQUFFLE1BQU0sc0JBQXNCLENBQUM7QUFFbkcsTUFBTSxDQUFDLEtBQUssVUFBVSxzQkFBc0IsQ0FDM0MsUUFBMEIsRUFDMUIsUUFBMkIsRUFDM0IsMEJBQWdELEVBQ2hELElBQXVCLEVBQ3ZCLFVBQW1DLEVBQ25DLEtBQWM7SUFFZCxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssRUFBRSxDQUFDO1FBQ3JCLE9BQU87SUFDUixDQUFDO0lBRUQsTUFBTSxxQkFBcUIsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLHNCQUFzQixDQUFDLENBQUM7SUFDbkUsTUFBTSxhQUFhLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsQ0FBQztJQUNuRCxNQUFNLG9CQUFvQixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMscUJBQXFCLENBQUMsQ0FBQztJQUNqRSxNQUFNLGlCQUFpQixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsa0JBQWtCLENBQUMsQ0FBQztJQUMzRCxNQUFNLGNBQWMsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGVBQWUsQ0FBQyxDQUFDO0lBRXJELE1BQU0sbUJBQW1CLEdBQUcsR0FBRyxvRkFBOEMsSUFBSSxRQUFRLENBQUMsU0FBUyxFQUFFLENBQUM7SUFDdEcsSUFBSSxXQUFtQixDQUFDO0lBRXhCLElBQUksS0FBSyxHQUEyRSxFQUFFLENBQUM7SUFDdkYsTUFBTSxVQUFVLEdBQWdCLElBQUksR0FBRyxFQUFFLENBQUM7SUFFMUMsTUFBTSw4QkFBOEIsR0FBc0I7UUFDekQsU0FBUyxFQUFFLFNBQVMsQ0FBQyxXQUFXLENBQUMsd0JBQXdCLENBQUM7UUFDMUQsT0FBTyxFQUFFLFFBQVEsQ0FBQyxlQUFlLEVBQUUsNkJBQTZCLENBQUM7S0FDakUsQ0FBQztJQUVGLE1BQU0sbUJBQW1CLEdBQXNCO1FBQzlDLFNBQVMsRUFBRSxTQUFTLENBQUMsV0FBVyxDQUFDLHdCQUF3QixDQUFDO1FBQzFELE9BQU8sRUFBRSxRQUFRLENBQUMsbUJBQW1CLEVBQUUscUJBQXFCLENBQUM7UUFDN0QsYUFBYSxFQUFFLEtBQUs7S0FDcEIsQ0FBQztJQUVGLE1BQU0sbUJBQW1CLEdBQThDLEVBQUUsQ0FBQztJQUUxRSxJQUFJLElBQUksS0FBSyxTQUFTLEVBQUUsQ0FBQztRQUN4QixXQUFXLEdBQUcsV0FBVyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsd0JBQXdCLEVBQUUsK0RBQStELENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLHFCQUFxQixFQUFFLDREQUE0RCxDQUFDLENBQUM7UUFDaE8sTUFBTSxZQUFZLEdBQUcsUUFBUSxDQUFDLFlBQVksQ0FBQyxHQUFHLDZDQUFxQyxDQUFDO1FBQ3BGLE1BQU0sUUFBUSxHQUFHLFlBQVksRUFBRSxRQUFRLENBQUM7UUFDeEMsMEJBQTBCO1FBQzFCLE1BQU0sZ0JBQWdCLEdBQUcsWUFBWSxFQUFFLGdCQUFnQixDQUFDO1FBQ3hELElBQUksZ0JBQWdCLEVBQUUsQ0FBQztZQUN0QixVQUFVLENBQUMsR0FBRyxDQUFDLGdCQUFnQixDQUFDLENBQUM7UUFDbEMsQ0FBQztRQUNELFNBQVMsV0FBVyxDQUFDLEtBQWE7WUFDakMsT0FBTyxLQUFLO2dCQUNYLHdDQUF3QztpQkFDdkMsT0FBTyxDQUFDLFFBQVEsRUFBRSxRQUFRLENBQUM7Z0JBQzVCLGdGQUFnRjtnQkFDaEYsOEJBQThCO2lCQUM3QixPQUFPLENBQUMsVUFBVSxFQUFFLFFBQVEsQ0FBQyxDQUFDO1FBQ2pDLENBQUM7UUFDRCxJQUFJLFFBQVEsSUFBSSxRQUFRLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDO1lBQ3JDLEtBQUssSUFBSSxDQUFDLEdBQUcsUUFBUSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO2dCQUMvQyxNQUFNLEtBQUssR0FBRyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQzFCLDBFQUEwRTtnQkFDMUUsK0NBQStDO2dCQUMvQyxNQUFNLEtBQUssR0FBRyxLQUFLLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxDQUFDO2dCQUNuQyxJQUFJLEtBQUssQ0FBQyxNQUFNLEtBQUssQ0FBQyxJQUFJLFVBQVUsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQztvQkFDakQsU0FBUztnQkFDVixDQUFDO2dCQUNELElBQUksV0FBVyxHQUFHLGlCQUFpQixDQUFDLEtBQUssQ0FBQyxHQUFHLEVBQUUsUUFBUSxDQUFDLFFBQVEsRUFBRSxRQUFRLENBQUMsRUFBRSxvQ0FBNEIsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQztnQkFDeEgsSUFBSSxLQUFLLENBQUMsUUFBUSxFQUFFLENBQUM7b0JBQ3BCLG9GQUFvRjtvQkFDcEYsbURBQW1EO29CQUNuRCxJQUFJLEtBQUssQ0FBQyxRQUFRLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQzt3QkFDM0IsV0FBVyxJQUFJLFNBQVMsQ0FBQztvQkFDMUIsQ0FBQzt5QkFBTSxDQUFDO3dCQUNQLFdBQVcsSUFBSSxjQUFjLEtBQUssQ0FBQyxRQUFRLEVBQUUsQ0FBQztvQkFDL0MsQ0FBQztnQkFDRixDQUFDO2dCQUNELFdBQVcsR0FBRyxXQUFXLENBQUMsSUFBSSxFQUFFLENBQUM7Z0JBQ2pDLE1BQU0sT0FBTyxHQUF3QixDQUFDLG1CQUFtQixDQUFDLENBQUM7Z0JBQzNELDZCQUE2QjtnQkFDN0IsTUFBTSxRQUFRLEdBQUcsS0FBSyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUM7Z0JBQ3hFLElBQUksUUFBUSxFQUFFLElBQUksS0FBSyxXQUFXLElBQUksUUFBUSxFQUFFLEtBQUssS0FBSyxLQUFLLEVBQUUsQ0FBQztvQkFDakUsUUFBUSxDQUFDLEVBQUUsR0FBRyxLQUFLLENBQUMsU0FBUyxDQUFDLFFBQVEsRUFBRSxDQUFDO29CQUN6QyxRQUFRLENBQUMsV0FBVyxHQUFHLFdBQVcsQ0FBQztvQkFDbkMsU0FBUztnQkFDVixDQUFDO2dCQUNELEtBQUssQ0FBQyxJQUFJLENBQUM7b0JBQ1YsS0FBSyxFQUFFLFdBQVcsQ0FBQyxLQUFLLENBQUM7b0JBQ3pCLFFBQVEsRUFBRSxLQUFLO29CQUNmLFdBQVc7b0JBQ1gsRUFBRSxFQUFFLEtBQUssQ0FBQyxTQUFTLENBQUMsUUFBUSxFQUFFO29CQUM5QixPQUFPLEVBQUUsS0FBSztvQkFDZCxPQUFPLEVBQUUsS0FBSyxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLFNBQVM7aUJBQ2hELENBQUMsQ0FBQztnQkFDSCxVQUFVLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQ3ZCLENBQUM7UUFDRixDQUFDO1FBQ0QsSUFBSSxnQkFBZ0IsRUFBRSxDQUFDO1lBQ3RCLEtBQUssQ0FBQyxPQUFPLENBQUM7Z0JBQ2IsS0FBSyxFQUFFLFdBQVcsQ0FBQyxnQkFBZ0IsQ0FBQztnQkFDcEMsUUFBUSxFQUFFLGdCQUFnQjtnQkFDMUIsV0FBVyxFQUFFLFlBQVksQ0FBQyxHQUFHO2FBQzdCLENBQUMsQ0FBQztRQUNKLENBQUM7UUFDRCxJQUFJLEtBQUssQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUM7WUFDdEIsS0FBSyxDQUFDLE9BQU8sQ0FBQztnQkFDYixJQUFJLEVBQUUsV0FBVztnQkFDakIsT0FBTyxFQUFFLEVBQUUsRUFBRSxpRUFBaUU7Z0JBQzlFLEtBQUssRUFBRSxlQUFlLENBQUMsc0JBQXNCO2FBQzdDLENBQUMsQ0FBQztRQUNKLENBQUM7UUFFRCxrQ0FBa0M7UUFDbEMsTUFBTSxPQUFPLEdBQUcsb0JBQW9CLENBQUMsY0FBYyxDQUFDLGlCQUFpQixDQUFDLENBQUM7UUFDdkUsTUFBTSxvQkFBb0IsR0FBOEMsRUFBRSxDQUFDO1FBQzNFLEtBQUssTUFBTSxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsSUFBSSxPQUFPLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDN0MsNkRBQTZEO1lBQzdELElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxJQUFJLElBQUksQ0FBQyxTQUFTLEtBQUssUUFBUSxDQUFDLFNBQVMsRUFBRSxDQUFDO2dCQUNyRSxvQkFBb0IsQ0FBQyxPQUFPLENBQUM7b0JBQzVCLEtBQUssRUFBRSxXQUFXLENBQUMsS0FBSyxDQUFDO29CQUN6QixRQUFRLEVBQUUsS0FBSztvQkFDZixPQUFPLEVBQUUsQ0FBQyw4QkFBOEIsQ0FBQztpQkFDekMsQ0FBQyxDQUFDO2dCQUNILFVBQVUsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDdkIsQ0FBQztRQUNGLENBQUM7UUFFRCxJQUFJLG9CQUFvQixDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQztZQUNyQyxLQUFLLENBQUMsSUFBSSxDQUNUO2dCQUNDLElBQUksRUFBRSxXQUFXO2dCQUNqQixPQUFPLEVBQUUsRUFBRSxFQUFFLGlFQUFpRTtnQkFDOUUsS0FBSyxFQUFFLGVBQWUsQ0FBQyx1QkFBdUI7YUFDOUMsRUFDRCxHQUFHLG9CQUFvQixDQUN2QixDQUFDO1FBQ0gsQ0FBQztRQUVELDRCQUE0QjtRQUM1QixNQUFNLGdCQUFnQixHQUFHLE1BQU0sb0JBQW9CLENBQUMsY0FBYyxDQUFDLG1CQUFtQixFQUFFLFFBQVEsQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUM1RyxJQUFJLGdCQUFnQixLQUFLLFNBQVMsRUFBRSxDQUFDO1lBQ3BDLE1BQU0scUJBQXFCLEdBQThDLEVBQUUsQ0FBQztZQUM1RSxLQUFLLE1BQU0sS0FBSyxJQUFJLGdCQUFnQixDQUFDLFFBQVEsRUFBRSxDQUFDO2dCQUMvQyxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDO29CQUM1QixxQkFBcUIsQ0FBQyxPQUFPLENBQUM7d0JBQzdCLEtBQUssRUFBRSxXQUFXLENBQUMsS0FBSyxDQUFDO3dCQUN6QixRQUFRLEVBQUUsS0FBSztxQkFDZixDQUFDLENBQUM7Z0JBQ0osQ0FBQztZQUNGLENBQUM7WUFDRCxJQUFJLHFCQUFxQixDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQztnQkFDdEMsTUFBTSxNQUFNLEdBQTBDO29CQUNyRCxTQUFTLEVBQUUsU0FBUyxDQUFDLFdBQVcsQ0FBQywwQkFBMEIsQ0FBQztvQkFDNUQsT0FBTyxFQUFFLFFBQVEsQ0FBQyxzQkFBc0IsRUFBRSxXQUFXLENBQUM7b0JBQ3RELGFBQWEsRUFBRSxLQUFLO29CQUNwQixRQUFRLEVBQUUsZ0JBQWdCLENBQUMsY0FBYztpQkFDekMsQ0FBQztnQkFDRixtQkFBbUIsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7Z0JBQ2pDLEtBQUssQ0FBQyxJQUFJLENBQ1Q7b0JBQ0MsSUFBSSxFQUFFLFdBQVc7b0JBQ2pCLE9BQU8sRUFBRSxDQUFDLE1BQU0sQ0FBQztvQkFDakIsS0FBSyxFQUFFLFFBQVEsQ0FBQywwQkFBMEIsRUFBRSxhQUFhLEVBQUUsUUFBUSxDQUFDLFNBQVMsQ0FBQztvQkFDOUUsV0FBVyxFQUFFLGdCQUFnQixDQUFDLFdBQVc7aUJBQ3pDLEVBQ0QsR0FBRyxxQkFBcUIsQ0FDeEIsQ0FBQztZQUNILENBQUM7UUFDRixDQUFDO0lBQ0YsQ0FBQztTQUFNLENBQUM7UUFDUCxXQUFXLEdBQUcsV0FBVztZQUN4QixDQUFDLENBQUMsUUFBUSxDQUFDLDBCQUEwQixFQUFFLG1FQUFtRSxDQUFDO1lBQzNHLENBQUMsQ0FBQyxRQUFRLENBQUMsdUJBQXVCLEVBQUUsZ0VBQWdFLENBQUMsQ0FBQztRQUN2RyxNQUFNLElBQUksR0FBRyxRQUFRLENBQUMsWUFBWSxDQUFDLEdBQUcseUNBQWlDLEVBQUUsSUFBSSxJQUFJLEVBQUUsQ0FBQztRQUNwRixJQUFJLElBQUksSUFBSSxJQUFJLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDO1lBQzdCLEtBQUssTUFBTSxLQUFLLElBQUksSUFBSSxFQUFFLENBQUM7Z0JBQzFCLEtBQUssQ0FBQyxJQUFJLENBQUMsRUFBRSxLQUFLLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUM7WUFDeEMsQ0FBQztZQUNELEtBQUssR0FBRyxLQUFLLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDeEIsS0FBSyxDQUFDLE9BQU8sQ0FBQyxFQUFFLElBQUksRUFBRSxXQUFXLEVBQUUsS0FBSyxFQUFFLGVBQWUsQ0FBQyxzQkFBc0IsRUFBRSxDQUFDLENBQUM7UUFDckYsQ0FBQztRQUVELGtDQUFrQztRQUNsQyxNQUFNLE9BQU8sR0FBRyxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsbUJBQW1CLENBQUMsQ0FBQztRQUN6RSxNQUFNLG9CQUFvQixHQUE4QyxFQUFFLENBQUM7UUFDM0UsaUdBQWlHO1FBQ2pHLEtBQUssTUFBTSxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsSUFBSSxPQUFPLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDN0MsSUFBSSxDQUFDLElBQUksS0FBSyxJQUFJLElBQUksSUFBSSxDQUFDLGVBQWUsS0FBSyxRQUFRLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUM7Z0JBQ25HLG9CQUFvQixDQUFDLE9BQU8sQ0FBQztvQkFDNUIsS0FBSztvQkFDTCxRQUFRLEVBQUUsS0FBSztvQkFDZixPQUFPLEVBQUUsQ0FBQyw4QkFBOEIsQ0FBQztpQkFDekMsQ0FBQyxDQUFDO1lBQ0osQ0FBQztRQUNGLENBQUM7UUFDRCxJQUFJLG9CQUFvQixDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQztZQUNyQyxLQUFLLENBQUMsSUFBSSxDQUNULEVBQUUsSUFBSSxFQUFFLFdBQVcsRUFBRSxLQUFLLEVBQUUsZUFBZSxDQUFDLHVCQUF1QixFQUFFLEVBQ3JFLEdBQUcsb0JBQW9CLENBQ3ZCLENBQUM7UUFDSCxDQUFDO0lBQ0YsQ0FBQztJQUNELElBQUksS0FBSyxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsQ0FBQztRQUN4QixPQUFPO0lBQ1IsQ0FBQztJQUNELE1BQU0sV0FBVyxHQUFHLElBQUksZUFBZSxFQUFFLENBQUM7SUFDMUMsTUFBTSxpQkFBaUIsR0FBRyxXQUFXLENBQUMsR0FBRyxDQUFDLElBQUksTUFBTSxDQUFDO1FBQ3BELEtBQUssRUFBRSxjQUFjO1FBQ3JCLElBQUksRUFBRSw2QkFBNkI7UUFDbkMsU0FBUyxFQUFFLFVBQVUsS0FBSyxPQUFPO1FBQ2pDLHVCQUF1QixFQUFFLGFBQWEsQ0FBQyx1QkFBdUIsQ0FBQztRQUMvRCwyQkFBMkIsRUFBRSxhQUFhLENBQUMsMkJBQTJCLENBQUM7UUFDdkUsMkJBQTJCLEVBQUUsYUFBYSxDQUFDLDJCQUEyQixDQUFDO0tBQ3ZFLENBQUMsQ0FBQyxDQUFDO0lBQ0osV0FBVyxDQUFDLEdBQUcsQ0FBQyxpQkFBaUIsQ0FBQyxRQUFRLENBQUMsR0FBRyxFQUFFO1FBQy9DLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyxzQkFBc0IsRUFBRSxRQUFRLEVBQUUsMEJBQTBCLEVBQUUsSUFBSSxFQUFFLGlCQUFpQixDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxZQUFZLEVBQUUsU0FBUyxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQzlLLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDSixNQUFNLGNBQWMsR0FBRyxXQUFXLENBQUMsR0FBRyxDQUFDLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDLENBQUM7SUFDcEcsTUFBTSxTQUFTLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FBQyxpQkFBaUIsQ0FBQyxlQUFlLENBQStDLEVBQUUsYUFBYSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQztJQUM1SSxNQUFNLGFBQWEsR0FBRyxLQUFLLENBQUM7SUFDNUIsU0FBUyxDQUFDLEtBQUssR0FBRyxDQUFDLEdBQUcsYUFBYSxDQUFDLENBQUM7SUFDckMsU0FBUyxDQUFDLFdBQVcsR0FBRyxLQUFLLENBQUM7SUFDOUIsU0FBUyxDQUFDLFdBQVcsR0FBRyxXQUFXLENBQUM7SUFDcEMsU0FBUyxDQUFDLGdCQUFnQixHQUFHLFVBQVUsSUFBSSxZQUFZLENBQUM7SUFDeEQsU0FBUyxDQUFDLE9BQU8sR0FBRyxDQUFDLGlCQUFpQixDQUFDLENBQUM7SUFDeEMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsc0JBQXNCLENBQUMsS0FBSyxFQUFDLENBQUMsRUFBQyxFQUFFO1FBQzFELElBQUksQ0FBQyxDQUFDLE1BQU0sS0FBSyw4QkFBOEIsRUFBRSxDQUFDO1lBQ2pELElBQUksSUFBSSxLQUFLLFNBQVMsRUFBRSxDQUFDO2dCQUN4QixvQkFBb0IsQ0FBQyxjQUFjLENBQUMsaUJBQWlCLENBQUMsRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUM5RSxDQUFDO2lCQUFNLENBQUM7Z0JBQ1Asb0JBQW9CLENBQUMsY0FBYyxDQUFDLG1CQUFtQixDQUFDLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDaEYsQ0FBQztRQUNGLENBQUM7YUFBTSxJQUFJLENBQUMsQ0FBQyxNQUFNLEtBQUssbUJBQW1CLEVBQUUsQ0FBQztZQUM3QyxNQUFNLGVBQWUsR0FBSSxDQUFDLENBQUMsSUFBYSxDQUFDLE9BQU8sQ0FBQztZQUNqRCxNQUFNLE1BQU0sR0FBRyxlQUFlLEVBQUUsU0FBUyxFQUFFLENBQUM7WUFDNUMsSUFBSSxNQUFNLElBQUksZUFBZSxFQUFFLE9BQU8sRUFBRSxDQUFDO2dCQUN4QyxNQUFNLFdBQVcsR0FBRyxNQUFNLGNBQWMsQ0FBQyxrQkFBa0IsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUNuRTtvQkFDQyxNQUFNLEVBQUUsc0JBQXNCLENBQUMsTUFBTTtvQkFDckMsSUFBSSxFQUFFLEdBQUcsZUFBZSxDQUFDLE9BQU8sT0FBTyxPQUFPLENBQUMsZUFBZSxDQUFDLFNBQVMsRUFBRSxJQUFJLENBQUMsRUFBRTtvQkFDakYsUUFBUSxFQUFFLE1BQU07b0JBQ2hCLEtBQUssRUFBRSxtQkFBbUIsZUFBZSxDQUFDLFNBQVMsSUFBSSxRQUFRLENBQUMsVUFBVSxFQUFFO2lCQUM1RSxDQUFDLENBQUMsQ0FBQztnQkFDTCxJQUFJLFdBQVcsRUFBRSxDQUFDO29CQUNqQixNQUFNLGFBQWEsQ0FBQyxVQUFVLENBQUM7d0JBQzlCLFFBQVEsRUFBRSxXQUFXLENBQUMsR0FBRztxQkFDekIsQ0FBQyxDQUFDO2dCQUNKLENBQUM7WUFDRixDQUFDO1FBQ0YsQ0FBQztRQUNELE1BQU0sb0JBQW9CLENBQUMsY0FBYyxDQUFDLHNCQUFzQixFQUFFLFFBQVEsRUFBRSwwQkFBMEIsRUFBRSxJQUFJLEVBQUUsVUFBVSxFQUFFLEtBQUssQ0FBQyxDQUFDO0lBQ2xJLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDSixXQUFXLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQywyQkFBMkIsQ0FBQyxLQUFLLEVBQUMsQ0FBQyxFQUFDLEVBQUU7UUFDL0QsTUFBTSxRQUFRLEdBQUcsbUJBQW1CLENBQUMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsTUFBTSxLQUFLLGtCQUFrQixDQUFDLEVBQUUsUUFBUSxDQUFDO1FBQzNHLElBQUksUUFBUSxFQUFFLENBQUM7WUFDZCxNQUFNLGFBQWEsQ0FBQyxVQUFVLENBQUM7Z0JBQzlCLFFBQVE7YUFDUixDQUFDLENBQUM7UUFDSixDQUFDO0lBQ0YsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNKLFdBQVcsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLGdCQUFnQixDQUFDLEtBQUssRUFBQyxLQUFLLEVBQUMsRUFBRTtRQUN4RCxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7WUFDWixNQUFNLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyxzQkFBc0IsRUFBRSxRQUFRLEVBQUUsMEJBQTBCLEVBQUUsSUFBSSxFQUFFLFVBQVUsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUNsSSxDQUFDO0lBQ0YsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNKLElBQUksd0JBQXdCLEdBQUcsS0FBSyxDQUFDO0lBQ3JDLFNBQVMsa0JBQWtCO1FBQzFCLHdCQUF3QixHQUFHLEtBQUssQ0FBQztRQUNqQyxRQUFRLENBQUMsS0FBSyxFQUFFLFdBQVcsQ0FBQyxrQkFBa0IsRUFBRSxDQUFDO1FBQ2pELFFBQVEsQ0FBQyxLQUFLLEVBQUUsV0FBVyxDQUFDLEtBQUssRUFBRSxDQUFDO0lBQ3JDLENBQUM7SUFDRCxXQUFXLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxpQkFBaUIsQ0FBQyxLQUFLLElBQUksRUFBRTtRQUN0RCxNQUFNLEtBQUssR0FBRyxRQUFRLENBQUMsS0FBSyxDQUFDO1FBQzdCLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUNaLE9BQU87UUFDUixDQUFDO1FBQ0QsTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLFNBQVMsQ0FBQyxXQUFXLENBQUM7UUFDckMsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO1lBQ1gsT0FBTztRQUNSLENBQUM7UUFDRCxJQUFJLFNBQVMsSUFBSSxJQUFJLElBQUksSUFBSSxDQUFDLE9BQU8sSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQzlELElBQUksQ0FBQyx3QkFBd0IsRUFBRSxDQUFDO2dCQUMvQixLQUFLLENBQUMsV0FBVyxDQUFDLGVBQWUsRUFBRSxDQUFDO2dCQUNwQyx3QkFBd0IsR0FBRyxJQUFJLENBQUM7WUFDakMsQ0FBQztZQUNELE1BQU0sY0FBYyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsaUJBQWlCLEVBQUUsQ0FBQztZQUN4RCxNQUFNLGVBQWUsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLGtCQUFrQixFQUFFLENBQUM7WUFDMUQsS0FBSyxDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUM7Z0JBQzdCLEtBQUssRUFBRTtvQkFDTixDQUFDLEVBQUUsQ0FBQztvQkFDSixDQUFDLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsSUFBSSxHQUFHLENBQUMsY0FBYyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUM7aUJBQ3REO2dCQUNELEdBQUcsRUFBRTtvQkFDSixDQUFDLEVBQUUsUUFBUSxDQUFDLElBQUk7b0JBQ2hCLENBQUMsRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxJQUFJLEdBQUcsQ0FBQyxlQUFlLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQztpQkFDdkQ7YUFDRCxDQUFDLENBQUM7UUFDSixDQUFDO2FBQU0sQ0FBQztZQUNQLGtCQUFrQixFQUFFLENBQUM7UUFDdEIsQ0FBQztJQUNGLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDSixXQUFXLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxXQUFXLENBQUMsS0FBSyxJQUFJLEVBQUU7UUFDaEQsTUFBTSxNQUFNLEdBQUcsU0FBUyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUN4QyxJQUFJLElBQVksQ0FBQztRQUNqQixJQUFJLElBQUksS0FBSyxLQUFLLEVBQUUsQ0FBQztZQUNwQixJQUFJLEdBQUcsTUFBTSxNQUFNLFFBQVEsQ0FBQyxtQkFBbUIsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQztRQUNwRSxDQUFDO2FBQU0sQ0FBQyxDQUFDLFVBQVU7WUFDbEIsSUFBSSxHQUFHLE1BQU0sQ0FBQyxRQUFRLENBQUM7UUFDeEIsQ0FBQztRQUNELFNBQVMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztRQUNqQix3QkFBd0IsR0FBRyxLQUFLLENBQUM7UUFDakMsUUFBUSxDQUFDLEtBQUssRUFBRSxXQUFXLENBQUMsS0FBSyxFQUFFLENBQUM7UUFDcEMsUUFBUSxDQUFDLGNBQWMsRUFBRSxDQUFDO1FBQzFCLFFBQVEsQ0FBQyxVQUFVLENBQUMsSUFBSSxFQUFFLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUNsRCxJQUFJLFNBQVMsQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLENBQUM7WUFDM0IsUUFBUSxDQUFDLEtBQUssRUFBRSxDQUFDO1FBQ2xCLENBQUM7SUFDRixDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ0osV0FBVyxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsU0FBUyxDQUFDLEdBQUcsRUFBRSxDQUFDLGtCQUFrQixFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQ2pFLElBQUksS0FBSyxFQUFFLENBQUM7UUFDWCxTQUFTLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQztJQUN6QixDQUFDO0lBQ0QsT0FBTyxJQUFJLE9BQU8sQ0FBTyxDQUFDLENBQUMsRUFBRTtRQUM1QiwwQkFBMEIsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDckMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxtQkFBbUIsQ0FBQyxjQUFjLEVBQUUsbUJBQW1CLEVBQUUsU0FBUyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUM7UUFDM0YsV0FBVyxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsU0FBUyxDQUFDLEdBQUcsRUFBRTtZQUN4QywwQkFBMEIsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDdEMscUJBQXFCLENBQUMsZ0JBQWdCLG9EQUFtQyxDQUFDO1lBQzFFLENBQUMsRUFBRSxDQUFDO1lBQ0osV0FBVyxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQ3ZCLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDLENBQUMsQ0FBQztBQUNKLENBQUM7QUFFRCxJQUFNLHNCQUFzQixHQUE1QixNQUFNLHNCQUF1QixTQUFRLFVBQVU7O2FBQ3ZDLFdBQU0sR0FBRyxpQkFBaUIsQUFBcEIsQ0FBcUI7SUFFbEMsWUFDb0Isd0JBQTJDLEVBQzlCLGFBQTRCO1FBRTVELEtBQUssRUFBRSxDQUFDO1FBRndCLGtCQUFhLEdBQWIsYUFBYSxDQUFlO1FBRzVELElBQUksQ0FBQyxTQUFTLENBQUMsd0JBQXdCLENBQUMsZ0NBQWdDLENBQUMsd0JBQXNCLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUM7SUFDaEgsQ0FBQztJQUVELEtBQUssQ0FBQyxrQkFBa0IsQ0FBQyxRQUFhO1FBQ3JDLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQ3ZELElBQUksUUFBUSxJQUFJLENBQUMsUUFBUSxDQUFDLFVBQVUsRUFBRSxFQUFFLENBQUM7WUFDeEMsT0FBTyxRQUFRLENBQUM7UUFDakIsQ0FBQztRQUVELE9BQU8sSUFBSSxDQUFDLGFBQWEsQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLEtBQUssQ0FBQyxDQUFDO0lBQ2pGLENBQUM7O0FBbEJJLHNCQUFzQjtJQUl6QixXQUFBLGlCQUFpQixDQUFBO0lBQ2pCLFdBQUEsYUFBYSxDQUFBO0dBTFYsc0JBQXNCLENBbUIzQiJ9