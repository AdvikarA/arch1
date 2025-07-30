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
import { localize } from '../../../../../../nls.js';
import { URI } from '../../../../../../base/common/uri.js';
import { assert } from '../../../../../../base/common/assert.js';
import { Codicon } from '../../../../../../base/common/codicons.js';
import { ThemeIcon } from '../../../../../../base/common/themables.js';
import { IPromptsService } from '../../../common/promptSyntax/service/promptsService.js';
import { dirname, extUri, joinPath } from '../../../../../../base/common/resources.js';
import { DisposableStore } from '../../../../../../base/common/lifecycle.js';
import { IFileService } from '../../../../../../platform/files/common/files.js';
import { ILabelService } from '../../../../../../platform/label/common/label.js';
import { IOpenerService } from '../../../../../../platform/opener/common/opener.js';
import { IDialogService } from '../../../../../../platform/dialogs/common/dialogs.js';
import { ICommandService } from '../../../../../../platform/commands/common/commands.js';
import { getCleanPromptName } from '../../../common/promptSyntax/config/promptFileLocations.js';
import { PromptsType, INSTRUCTIONS_DOCUMENTATION_URL, MODE_DOCUMENTATION_URL, PROMPT_DOCUMENTATION_URL } from '../../../common/promptSyntax/promptTypes.js';
import { NEW_PROMPT_COMMAND_ID, NEW_INSTRUCTIONS_COMMAND_ID, NEW_MODE_COMMAND_ID } from '../newPromptFileActions.js';
import { IQuickInputService } from '../../../../../../platform/quickinput/common/quickInput.js';
import { askForPromptFileName } from './askForPromptName.js';
import { IInstantiationService } from '../../../../../../platform/instantiation/common/instantiation.js';
import { CancellationToken } from '../../../../../../base/common/cancellation.js';
import { UILabelProvider } from '../../../../../../base/common/keybindingLabels.js';
import { OS } from '../../../../../../base/common/platform.js';
import { askForPromptSourceFolder } from './askForPromptSourceFolder.js';
/**
 * Button that opens the documentation.
 */
const HELP_BUTTON = Object.freeze({
    tooltip: localize('help', "Help"),
    iconClass: ThemeIcon.asClassName(Codicon.question),
});
/**
 * A quick pick item that starts the 'New Prompt File' command.
 */
const NEW_PROMPT_FILE_OPTION = Object.freeze({
    type: 'item',
    label: `$(plus) ${localize('commands.new-promptfile.select-dialog.label', 'New prompt file...')}`,
    value: URI.parse(PROMPT_DOCUMENTATION_URL),
    pickable: false,
    alwaysShow: true,
    buttons: [HELP_BUTTON],
    commandId: NEW_PROMPT_COMMAND_ID,
});
/**
 * A quick pick item that starts the 'New Instructions File' command.
 */
const NEW_INSTRUCTIONS_FILE_OPTION = Object.freeze({
    type: 'item',
    label: `$(plus) ${localize('commands.new-instructionsfile.select-dialog.label', 'New instruction file...')}`,
    value: URI.parse(INSTRUCTIONS_DOCUMENTATION_URL),
    pickable: false,
    alwaysShow: true,
    buttons: [HELP_BUTTON],
    commandId: NEW_INSTRUCTIONS_COMMAND_ID,
});
/**
 * A quick pick item that starts the 'Update Instructions' command.
 */
const UPDATE_INSTRUCTIONS_OPTION = Object.freeze({
    type: 'item',
    label: `$(refresh) ${localize('commands.update-instructions.select-dialog.label', 'Generate instructions...')}`,
    value: URI.parse(INSTRUCTIONS_DOCUMENTATION_URL),
    pickable: false,
    alwaysShow: true,
    buttons: [HELP_BUTTON],
    commandId: 'workbench.action.chat.generateInstructions',
});
/**
 * A quick pick item that starts the 'New Instructions File' command.
 */
const NEW_MODE_FILE_OPTION = Object.freeze({
    type: 'item',
    label: `$(plus) ${localize('commands.new-modefile.select-dialog.label', 'Create new custom chat mode file...')}`,
    value: URI.parse(MODE_DOCUMENTATION_URL),
    pickable: false,
    alwaysShow: true,
    buttons: [HELP_BUTTON],
    commandId: NEW_MODE_COMMAND_ID,
});
/**
 * Button that opens a prompt file in the editor.
 */
const EDIT_BUTTON = Object.freeze({
    tooltip: localize('open', "Open in Editor"),
    iconClass: ThemeIcon.asClassName(Codicon.edit),
});
/**
 * Button that deletes a prompt file.
 */
const DELETE_BUTTON = Object.freeze({
    tooltip: localize('delete', "Delete"),
    iconClass: ThemeIcon.asClassName(Codicon.trash),
});
/**
 * Button that renames a prompt file.
 */
const RENAME_BUTTON = Object.freeze({
    tooltip: localize('rename', "Rename"),
    iconClass: ThemeIcon.asClassName(Codicon.replace),
});
/**
 * Button that copies a prompt file.
 */
const COPY_BUTTON = Object.freeze({
    tooltip: localize('copy', "Copy or Move (press {0})", UILabelProvider.modifierLabels[OS].ctrlKey),
    iconClass: ThemeIcon.asClassName(Codicon.copy),
});
let PromptFilePickers = class PromptFilePickers {
    constructor(_labelService, _quickInputService, _openerService, _fileService, _dialogService, _commandService, _instaService, _promptsService) {
        this._labelService = _labelService;
        this._quickInputService = _quickInputService;
        this._openerService = _openerService;
        this._fileService = _fileService;
        this._dialogService = _dialogService;
        this._commandService = _commandService;
        this._instaService = _instaService;
        this._promptsService = _promptsService;
    }
    /**
     * Shows the prompt file selection dialog to the user that allows to run a prompt file(s).
     *
     * If {@link ISelectOptions.resource resource} is provided, the dialog will have
     * the resource pre-selected in the prompts list.
     */
    async selectPromptFile(options) {
        const quickPick = this._quickInputService.createQuickPick();
        quickPick.busy = true;
        quickPick.placeholder = localize('searching', 'Searching file system...');
        try {
            const fileOptions = await this._createPromptPickItems(options);
            const activeItem = options.resource && fileOptions.find(f => extUri.isEqual(f.value, options.resource));
            quickPick.activeItems = [activeItem ?? fileOptions[0]];
            quickPick.placeholder = options.placeholder;
            quickPick.canAcceptInBackground = true;
            quickPick.matchOnDescription = true;
            quickPick.items = fileOptions;
        }
        finally {
            quickPick.busy = false;
        }
        return new Promise(resolve => {
            const disposables = new DisposableStore();
            let isResolved = false;
            // then the dialog is hidden or disposed for other reason,
            // dispose everything and resolve the main promise
            disposables.add({
                dispose() {
                    quickPick.dispose();
                    if (!isResolved) {
                        resolve(undefined);
                        isResolved = true;
                    }
                },
            });
            // handle the prompt `accept` event
            disposables.add(quickPick.onDidAccept(async (event) => {
                const { selectedItems } = quickPick;
                const { keyMods } = quickPick;
                const selectedItem = selectedItems[0];
                if (selectedItem.commandId) {
                    await this._commandService.executeCommand(selectedItem.commandId);
                    return;
                }
                if (selectedItem) {
                    resolve({ promptFile: selectedItem.value, keyMods: { ...keyMods } });
                    isResolved = true;
                }
                // if user submitted their selection, close the dialog
                if (!event.inBackground) {
                    disposables.dispose();
                }
            }));
            // handle the `button click` event on a list item (edit, delete, etc.)
            disposables.add(quickPick.onDidTriggerItemButton(e => this._handleButtonClick(quickPick, e, options)));
            // when the dialog is hidden, dispose everything
            disposables.add(quickPick.onDidHide(disposables.dispose.bind(disposables)));
            // finally, reveal the dialog
            quickPick.show();
        });
    }
    async _createPromptPickItems(options) {
        const { resource } = options;
        const buttons = [];
        if (options.optionEdit !== false) {
            buttons.push(EDIT_BUTTON);
        }
        if (options.optionCopy !== false) {
            buttons.push(COPY_BUTTON);
        }
        if (options.optionRename !== false) {
            buttons.push(RENAME_BUTTON);
        }
        if (options.optionDelete !== false) {
            buttons.push(DELETE_BUTTON);
        }
        const promptFiles = await this._promptsService.listPromptFiles(options.type, CancellationToken.None);
        const fileOptions = promptFiles.map((promptFile) => {
            return this._createPromptPickItem(promptFile, buttons);
        });
        // if a resource is provided, create an `activeItem` for it to pre-select
        // it in the UI, and sort the list so the active item appears at the top
        let activeItem;
        if (options.resource) {
            activeItem = fileOptions.find((file) => {
                return extUri.isEqual(file.value, options.resource);
            });
            // if no item for the `resource` was found, it means that the resource is not
            // in the list of prompt files, so add a new item for it; this ensures that
            // the currently active prompt file is always available in the selection dialog,
            // even if it is not included in the prompts list otherwise(from location setting)
            if (!activeItem) {
                activeItem = this._createPromptPickItem({
                    uri: options.resource,
                    // "user" prompts are always registered in the prompts list, hence it
                    // should be safe to assume that `resource` is not "user" prompt here
                    storage: 'local',
                    type: options.type,
                }, buttons);
                fileOptions.push(activeItem);
            }
            fileOptions.sort((file1, file2) => {
                if (extUri.isEqual(file1.value, resource)) {
                    return -1;
                }
                if (extUri.isEqual(file2.value, resource)) {
                    return 1;
                }
                return 0;
            });
        }
        const newItems = options.optionNew !== false ? this._getNewItems(options.type) : [];
        if (newItems.length > 0) {
            fileOptions.splice(0, 0, ...newItems);
        }
        return fileOptions;
    }
    _getNewItems(type) {
        switch (type) {
            case PromptsType.prompt:
                return [NEW_PROMPT_FILE_OPTION];
            case PromptsType.instructions:
                return [NEW_INSTRUCTIONS_FILE_OPTION, UPDATE_INSTRUCTIONS_OPTION];
            case PromptsType.mode:
                return [NEW_MODE_FILE_OPTION];
            default:
                throw new Error(`Unknown prompt type '${type}'.`);
        }
    }
    _createPromptPickItem(promptFile, buttons) {
        const { uri, storage } = promptFile;
        const fileWithoutExtension = getCleanPromptName(uri);
        // if a "user" prompt, don't show its filesystem path in
        // the user interface, but do that for all the "local" ones
        const description = (storage === 'user')
            ? localize('user-data-dir.capitalized', 'User data folder')
            : this._labelService.getUriLabel(dirname(uri), { relative: true });
        const tooltip = (storage === 'user')
            ? description
            : uri.fsPath;
        return {
            id: uri.toString(),
            type: 'item',
            label: fileWithoutExtension,
            description,
            tooltip,
            value: uri,
            buttons
        };
    }
    async keepQuickPickOpen(quickPick, work) {
        const previousIgnoreFocusOut = quickPick.ignoreFocusOut;
        quickPick.ignoreFocusOut = true;
        try {
            await work();
        }
        finally {
            quickPick.ignoreFocusOut = previousIgnoreFocusOut;
        }
    }
    async _handleButtonClick(quickPick, context, options) {
        const { item, button } = context;
        const { value, } = item;
        // `edit` button was pressed, open the prompt file in editor
        if (button === EDIT_BUTTON) {
            await this._openerService.open(value);
            return;
        }
        // `copy` button was pressed, open the prompt file in editor
        if (button === COPY_BUTTON) {
            const currentFolder = dirname(value);
            const isMove = quickPick.keyMods.ctrlCmd;
            const newFolder = await this._instaService.invokeFunction(askForPromptSourceFolder, options.type, currentFolder, isMove);
            if (!newFolder) {
                return;
            }
            const newName = await this._instaService.invokeFunction(askForPromptFileName, options.type, newFolder.uri, item.label);
            if (!newName) {
                return;
            }
            const newFile = joinPath(newFolder.uri, newName);
            if (isMove) {
                await this._fileService.move(value, newFile);
            }
            else {
                await this._fileService.copy(value, newFile);
            }
            await this._openerService.open(newFile);
            return;
        }
        // `rename` button was pressed, open a rename dialog
        if (button === RENAME_BUTTON) {
            const currentFolder = dirname(value);
            const newName = await this._instaService.invokeFunction(askForPromptFileName, options.type, currentFolder, item.label);
            if (newName) {
                const newFile = joinPath(currentFolder, newName);
                await this._fileService.move(value, newFile);
                await this._openerService.open(newFile);
            }
            return;
        }
        // `delete` button was pressed, delete the prompt file
        if (button === DELETE_BUTTON) {
            // sanity check to confirm our expectations
            assert((quickPick.activeItems.length < 2), `Expected maximum one active item, got '${quickPick.activeItems.length}'.`);
            const activeItem = quickPick.activeItems[0];
            // sanity checks - prompt file exists and is not a folder
            const info = await this._fileService.stat(value);
            assert(info.isDirectory === false, `'${value.fsPath}' points to a folder.`);
            // don't close the main prompt selection dialog by the confirmation dialog
            await this.keepQuickPickOpen(quickPick, async () => {
                const filename = getCleanPromptName(value);
                const { confirmed } = await this._dialogService.confirm({
                    message: localize('commands.prompts.use.select-dialog.delete-prompt.confirm.message', "Are you sure you want to delete '{0}'?", filename),
                });
                // if prompt deletion was not confirmed, nothing to do
                if (!confirmed) {
                    return;
                }
                // prompt deletion was confirmed so delete the prompt file
                await this._fileService.del(value);
                // remove the deleted prompt from the selection dialog list
                let removedIndex = -1;
                quickPick.items = quickPick.items.filter((option, index) => {
                    if (option === item) {
                        removedIndex = index;
                        return false;
                    }
                    return true;
                });
                // if the deleted item was active item, find a new item to set as active
                if (activeItem && (activeItem === item)) {
                    assert(removedIndex >= 0, 'Removed item index must be a valid index.');
                    // we set the previous item as new active, or the next item
                    // if removed prompt item was in the beginning of the list
                    const newActiveItemIndex = Math.max(removedIndex - 1, 0);
                    const newActiveItem = quickPick.items[newActiveItemIndex];
                    quickPick.activeItems = newActiveItem ? [newActiveItem] : [];
                }
            });
            return;
        }
        if (button === HELP_BUTTON) {
            // open the documentation
            await this._openerService.open(item.value);
            return;
        }
        throw new Error(`Unknown button '${JSON.stringify(button)}'.`);
    }
};
PromptFilePickers = __decorate([
    __param(0, ILabelService),
    __param(1, IQuickInputService),
    __param(2, IOpenerService),
    __param(3, IFileService),
    __param(4, IDialogService),
    __param(5, ICommandService),
    __param(6, IInstantiationService),
    __param(7, IPromptsService)
], PromptFilePickers);
export { PromptFilePickers };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvbXB0RmlsZVBpY2tlcnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9hZHZpa2FyL0RvY3VtZW50cy9hcmNoaXRlY3QvYXJjaDIvQXJjaElERS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2Jyb3dzZXIvcHJvbXB0U3ludGF4L3BpY2tlcnMvcHJvbXB0RmlsZVBpY2tlcnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBQ3BELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUMzRCxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDakUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBQ3BFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUN2RSxPQUFPLEVBQWUsZUFBZSxFQUFFLE1BQU0sd0RBQXdELENBQUM7QUFDdEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLEVBQUUsUUFBUSxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDdkYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQzdFLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUNoRixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDakYsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLG9EQUFvRCxDQUFDO0FBQ3BGLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUN0RixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sd0RBQXdELENBQUM7QUFDekYsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDaEcsT0FBTyxFQUFFLFdBQVcs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