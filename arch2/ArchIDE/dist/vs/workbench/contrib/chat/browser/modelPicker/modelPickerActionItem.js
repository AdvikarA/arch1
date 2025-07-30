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
import { localize } from '../../../../../nls.js';
import * as dom from '../../../../../base/browser/dom.js';
import { renderLabelWithIcons } from '../../../../../base/browser/ui/iconLabel/iconLabels.js';
import { ActionWidgetDropdownActionViewItem } from '../../../../../platform/actions/browser/actionWidgetDropdownActionViewItem.js';
import { IActionWidgetService } from '../../../../../platform/actionWidget/browser/actionWidget.js';
import { IMenuService } from '../../../../../platform/actions/common/actions.js';
import { IContextKeyService } from '../../../../../platform/contextkey/common/contextkey.js';
import { ICommandService } from '../../../../../platform/commands/common/commands.js';
import { ChatEntitlement, IChatEntitlementService } from '../../common/chatEntitlementService.js';
import { IKeybindingService } from '../../../../../platform/keybinding/common/keybinding.js';
import { DEFAULT_MODEL_PICKER_CATEGORY } from '../../common/modelPicker/modelPickerWidget.js';
import { ManageModelsAction } from '../actions/manageModelsActions.js';
function modelDelegateToWidgetActionsProvider(delegate) {
    return {
        getActions: () => {
            return delegate.getModels().map(model => {
                return {
                    id: model.metadata.id,
                    enabled: true,
                    checked: model.metadata.id === delegate.getCurrentModel()?.metadata.id,
                    category: model.metadata.modelPickerCategory || DEFAULT_MODEL_PICKER_CATEGORY,
                    class: undefined,
                    description: model.metadata.cost,
                    tooltip: model.metadata.description ?? model.metadata.name,
                    label: model.metadata.name,
                    run: () => {
                        delegate.setModel(model);
                    }
                };
            });
        }
    };
}
function getModelPickerActionBarActions(menuService, contextKeyService, commandService, chatEntitlementService) {
    const additionalActions = [];
    additionalActions.push({
        id: 'manageModels',
        label: localize('chat.manageModels', "Manage Models..."),
        enabled: true,
        tooltip: localize('chat.manageModels.tooltip', "Manage language models"),
        class: undefined,
        run: () => {
            const commandId = ManageModelsAction.ID;
            commandService.executeCommand(commandId);
        }
    });
    // Add upgrade option if entitlement is free
    if (chatEntitlementService.entitlement === ChatEntitlement.Free) {
        additionalActions.push({
            id: 'moreModels',
            label: localize('chat.moreModels', "Add Premium Models"),
            enabled: true,
            tooltip: localize('chat.moreModels.tooltip', "Add premium models"),
            class: undefined,
            run: () => {
                const commandId = 'workbench.action.chat.upgradePlan';
                commandService.executeCommand(commandId);
            }
        });
    }
    return additionalActions;
}
/**
 * Action view item for selecting a language model in the chat interface.
 */
let ModelPickerActionItem = class ModelPickerActionItem extends ActionWidgetDropdownActionViewItem {
    constructor(action, currentModel, delegate, actionWidgetService, menuService, contextKeyService, commandService, chatEntitlementService, keybindingService) {
        // Modify the original action with a different label and make it show the current model
        const actionWithLabel = {
            ...action,
            label: currentModel?.metadata.name ?? localize('chat.modelPicker.label', "Pick Model"),
            tooltip: localize('chat.modelPicker.label', "Pick Model"),
            run: () => { }
        };
        const modelPickerActionWidgetOptions = {
            actionProvider: modelDelegateToWidgetActionsProvider(delegate),
            actionBarActions: getModelPickerActionBarActions(menuService, contextKeyService, commandService, chatEntitlementService)
        };
        super(actionWithLabel, modelPickerActionWidgetOptions, actionWidgetService, keybindingService, contextKeyService);
        this.currentModel = currentModel;
        // Listen for model changes from the delegate
        this._register(delegate.onDidChangeModel(model => {
            this.currentModel = model;
            if (this.element) {
                this.renderLabel(this.element);
            }
        }));
    }
    renderLabel(element) {
        dom.reset(element, dom.$('span.chat-model-label', undefined, this.currentModel?.metadata.name ?? localize('chat.modelPicker.label', "Pick Model")), ...renderLabelWithIcons(`$(chevron-down)`));
        this.setAriaLabelAttributes(element);
        return null;
    }
    render(container) {
        super.render(container);
        container.classList.add('chat-modelPicker-item');
    }
};
ModelPickerActionItem = __decorate([
    __param(3, IActionWidgetService),
    __param(4, IMenuService),
    __param(5, IContextKeyService),
    __param(6, ICommandService),
    __param(7, IChatEntitlementService),
    __param(8, IKeybindingService)
], ModelPickerActionItem);
export { ModelPickerActionItem };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9kZWxQaWNrZXJBY3Rpb25JdGVtLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvYWR2aWthci9Eb2N1bWVudHMvYXJjaGl0ZWN0L2FyY2gyL0FyY2hJREUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9icm93c2VyL21vZGVsUGlja2VyL21vZGVsUGlja2VyQWN0aW9uSXRlbS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUtoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFDakQsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQ0FBb0MsQ0FBQztBQUMxRCxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSx3REFBd0QsQ0FBQztBQUU5RixPQUFPLEVBQUUsa0NBQWtDLEVBQUUsTUFBTSwrRUFBK0UsQ0FBQztBQUNuSSxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSw4REFBOEQsQ0FBQztBQUVwRyxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDakYsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0seURBQXlELENBQUM7QUFDN0YsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHFEQUFxRCxDQUFDO0FBQ3RGLE9BQU8sRUFBRSxlQUFlLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUNsRyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUM3RixPQUFPLEVBQUUsNkJBQTZCLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQztBQUM5RixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQVN2RSxTQUFTLG9DQUFvQyxDQUFDLFFBQThCO0lBQzNFLE9BQU87UUFDTixVQUFVLEVBQUUsR0FBRyxFQUFFO1lBQ2hCLE9BQU8sUUFBUSxDQUFDLFNBQVMsRUFBRSxDQUFDLEdBQUcsQ0FB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