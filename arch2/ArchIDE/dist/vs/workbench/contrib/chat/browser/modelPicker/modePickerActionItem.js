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
import { renderLabelWithIcons } from '../../../../../base/browser/ui/iconLabel/iconLabels.js';
import { autorun } from '../../../../../base/common/observable.js';
import { localize } from '../../../../../nls.js';
import { ActionWidgetDropdownActionViewItem } from '../../../../../platform/actions/browser/actionWidgetDropdownActionViewItem.js';
import { getFlatActionBarActions } from '../../../../../platform/actions/browser/menuEntryActionViewItem.js';
import { IMenuService, MenuId } from '../../../../../platform/actions/common/actions.js';
import { IActionWidgetService } from '../../../../../platform/actionWidget/browser/actionWidget.js';
import { IContextKeyService } from '../../../../../platform/contextkey/common/contextkey.js';
import { IKeybindingService } from '../../../../../platform/keybinding/common/keybinding.js';
import { IChatAgentService } from '../../common/chatAgents.js';
import { IChatModeService } from '../../common/chatModes.js';
import { ChatAgentLocation } from '../../common/constants.js';
import { getOpenChatActionIdForMode } from '../actions/chatActions.js';
let ModePickerActionItem = class ModePickerActionItem extends ActionWidgetDropdownActionViewItem {
    constructor(action, delegate, actionWidgetService, chatAgentService, keybindingService, contextKeyService, chatModeService, menuService) {
        const makeAction = (mode, currentMode) => ({
            ...action,
            id: getOpenChatActionIdForMode(mode),
            label: mode.name,
            class: undefined,
            enabled: true,
            checked: currentMode.id === mode.id,
            tooltip: chatAgentService.getDefaultAgent(ChatAgentLocation.Panel, mode.kind)?.description ?? action.tooltip,
            run: async () => {
                const result = await action.run({ modeId: mode.id });
                this.renderLabel(this.element);
                return result;
            },
            category: { label: localize('built-in', "Built-In"), order: 0 }
        });
        const makeActionFromCustomMode = (mode, currentMode) => ({
            ...action,
            id: getOpenChatActionIdForMode(mode),
            label: mode.name,
            class: undefined,
            enabled: true,
            checked: currentMode.id === mode.id,
            tooltip: mode.description.get() ?? chatAgentService.getDefaultAgent(ChatAgentLocation.Panel, mode.kind)?.description ?? action.tooltip,
            run: async () => {
                const result = await action.run({ modeId: mode.id });
                this.renderLabel(this.element);
                return result;
            },
            category: { label: localize('custom', "Custom"), order: 1 }
        });
        const actionProvider = {
            getActions: () => {
                const modes = chatModeService.getModes();
                const currentMode = delegate.currentMode.get();
                const agentStateActions = modes.builtin.map(mode => makeAction(mode, currentMode));
                if (modes.custom) {
                    agentStateActions.push(...modes.custom.map(mode => makeActionFromCustomMode(mode, currentMode)));
                }
                return agentStateActions;
            }
        };
        const modePickerActionWidgetOptions = {
            actionProvider,
            actionBarActionProvider: {
                getActions: () => this.getModePickerActionBarActions()
            },
            showItemKeybindings: true
        };
        super(action, modePickerActionWidgetOptions, actionWidgetService, keybindingService, contextKeyService);
        this.delegate = delegate;
        this.contextKeyService = contextKeyService;
        this.menuService = menuService;
        // Listen to changes in the current mode and its properties
        this._register(autorun(reader => {
            this.renderLabel(this.element, this.delegate.currentMode.read(reader));
        }));
    }
    getModePickerActionBarActions() {
        const menuActions = this.menuService.createMenu(MenuId.ChatModePicker, this.contextKeyService);
        const menuContributions = getFlatActionBarActions(menuActions.getActions({ renderShortTitle: true }));
        menuActions.dispose();
        return menuContributions;
    }
    renderLabel(element, mode = this.delegate.currentMode.get()) {
        if (!this.element) {
            return null;
        }
        this.setAriaLabelAttributes(element);
        const state = this.delegate.currentMode.get().name;
        dom.reset(element, dom.$('span.chat-model-label', undefined, state), ...renderLabelWithIcons(`$(chevron-down)`));
        return null;
    }
    render(container) {
        super.render(container);
        container.classList.add('chat-modelPicker-item');
    }
};
ModePickerActionItem = __decorate([
    __param(2, IActionWidgetService),
    __param(3, IChatAgentService),
    __param(4, IKeybindingService),
    __param(5, IContextKeyService),
    __param(6, IChatModeService),
    __param(7, IMenuService)
], ModePickerActionItem);
export { ModePickerActionItem };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9kZVBpY2tlckFjdGlvbkl0ZW0uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9hZHZpa2FyL0RvY3VtZW50cy9hcmNoaXRlY3QvYXJjaDIvQXJjaElERS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2Jyb3dzZXIvbW9kZWxQaWNrZXIvbW9kZVBpY2tlckFjdGlvbkl0ZW0udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQ0FBb0MsQ0FBQztBQUMxRCxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSx3REFBd0QsQ0FBQztBQUc5RixPQUFPLEVBQUUsT0FBTyxFQUFlLE1BQU0sMENBQTBDLENBQUM7QUFDaEYsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBQ2pELE9BQU8sRUFBRSxrQ0FBa0MsRUFBRSxNQUFNLCtFQUErRSxDQUFDO0FBQ25JLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLG9FQUFvRSxDQUFDO0FBQzdHLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxFQUFrQixNQUFNLG1EQUFtRCxDQUFDO0FBQ3pHLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDhEQUE4RCxDQUFDO0FBRXBHLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQzdGLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQzdGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDRCQUE0QixDQUFDO0FBQy9ELE9BQU8sRUFBYSxnQkFBZ0IsRUFBRSxNQUFNLDJCQUEyQixDQUFDO0FBQ3hFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDJCQUEyQixDQUFDO0FBQzlELE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLDJCQUEyQixDQUFDO0FBT2hFLElBQU0sb0JBQW9CLEdB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