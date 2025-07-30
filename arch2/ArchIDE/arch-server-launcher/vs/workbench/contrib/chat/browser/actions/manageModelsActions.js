/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { coalesce } from '../../../../../base/common/arrays.js';
import { Codicon } from '../../../../../base/common/codicons.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { ThemeIcon } from '../../../../../base/common/themables.js';
import { localize2 } from '../../../../../nls.js';
import { Action2 } from '../../../../../platform/actions/common/actions.js';
import { ICommandService } from '../../../../../platform/commands/common/commands.js';
import { IQuickInputService } from '../../../../../platform/quickinput/common/quickInput.js';
import { ChatContextKeys } from '../../common/chatContextKeys.js';
import { ILanguageModelsService } from '../../common/languageModels.js';
import { CHAT_CATEGORY } from './chatActions.js';
export class ManageModelsAction extends Action2 {
    static { this.ID = 'workbench.action.chat.manageLanguageModels'; }
    constructor() {
        super({
            id: ManageModelsAction.ID,
            title: localize2('manageLanguageModels', 'Manage Language Models...'),
            category: CHAT_CATEGORY,
            precondition: ChatContextKeys.enabled,
            f1: true
        });
    }
    async run(accessor, ...args) {
        const languageModelsService = accessor.get(ILanguageModelsService);
        const quickInputService = accessor.get(IQuickInputService);
        const commandService = accessor.get(ICommandService);
        const vendors = languageModelsService.getVendors();
        const store = new DisposableStore();
        const quickPickItems = vendors.map(vendor => ({
            label: vendor.displayName,
            vendor: vendor.vendor,
            managementCommand: vendor.managementCommand,
            buttons: vendor.managementCommand ? [{
                    iconClass: ThemeIcon.asClassName(Codicon.settingsGear),
                    tooltip: `Manage ${vendor.displayName}`
                }] : undefined
        }));
        const quickPick = store.add(quickInputService.createQuickPick());
        quickPick.title = 'Manage Language Models';
        quickPick.placeholder = 'Select a provider...';
        quickPick.items = quickPickItems;
        quickPick.show();
        store.add(quickPick.onDidAccept(async () => {
            quickPick.hide();
            const selectedItem = quickPick.selectedItems[0];
            if (selectedItem) {
                const models = coalesce((await languageModelsService.selectLanguageModels({ vendor: selectedItem.vendor }, true)).map(modelIdentifier => {
                    const modelMetadata = languageModelsService.lookupLanguageModel(modelIdentifier);
                    if (!modelMetadata) {
                        return undefined;
                    }
                    return {
                        metadata: modelMetadata,
                        identifier: modelIdentifier,
                    };
                }));
                await this.showModelSelectorQuickpick(models, quickInputService, languageModelsService);
            }
        }));
        store.add(quickPick.onDidTriggerItemButton(async (event) => {
            const selectedItem = event.item;
            const managementCommand = selectedItem.managementCommand;
            if (managementCommand) {
                commandService.executeCommand(managementCommand, selectedItem.vendor);
            }
        }));
        store.add(quickPick.onDidHide(() => {
            store.dispose();
        }));
    }
    async showModelSelectorQuickpick(modelsAndIdentifiers, quickInputService, languageModelsService) {
        const store = new DisposableStore();
        const modelItems = modelsAndIdentifiers.map(model => ({
            label: model.metadata.name,
            detail: model.metadata.id,
            modelId: model.identifier,
            vendor: model.metadata.vendor,
            picked: model.metadata.isUserSelectable
        }));
        if (modelItems.length === 0) {
            store.dispose();
            return;
        }
        const quickPick = quickInputService.createQuickPick();
        quickPick.items = modelItems;
        quickPick.title = 'Manage Language Models';
        quickPick.placeholder = 'Select language models...';
        quickPick.selectedItems = modelItems.filter(item => item.picked);
        quickPick.canSelectMany = true;
        quickPick.show();
        // Handle selection
        store.add(quickPick.onDidAccept(async () => {
            quickPick.hide();
            const items = quickPick.items;
            items.forEach(item => {
                languageModelsService.updateModelPickerPreference(item.modelId, quickPick.selectedItems.includes(item));
            });
        }));
        store.add(quickPick.onDidHide(() => {
            store.dispose();
        }));
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFuYWdlTW9kZWxzQWN0aW9ucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL2FkdmlrYXIvRG9jdW1lbnRzL2FyY2hpdGVjdC9hcmNoMi9BcmNoSURFL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvYnJvd3Nlci9hY3Rpb25zL21hbmFnZU1vZGVsc0FjdGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2hFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUNqRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDMUUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ3BFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUNsRCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDNUUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHFEQUFxRCxDQUFDO0FBRXRGLE9BQU8sRUFBRSxrQkFBa0IsRUFBa0IsTUFBTSx5REFBeUQsQ0FBQztBQUM3RyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDbEUsT0FBTyxFQUEyQyxzQkFBc0IsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ2pILE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxrQkFBa0IsQ0FBQztBQVlqRCxNQUFNLE9BQU8sa0JBQW1CLFNBQVEsT0FBTzthQUM5QixPQUFFLEdBQUcsNENBQTRDLENBQUM7SUFFbEU7UUFDQyxLQUFLLENBQUM7WUFDTCxFQUFFLEVBQUUsa0JBQWtCLENBQUMsRUFBRTtZQUN6QixLQUFLLEVBQUUsU0FBUyxDQUFDLHNCQUFzQixFQUFFLDJCQUEyQixDQUFDO1lBQ3JFLFFBQVEsRUFBRSxhQUFh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