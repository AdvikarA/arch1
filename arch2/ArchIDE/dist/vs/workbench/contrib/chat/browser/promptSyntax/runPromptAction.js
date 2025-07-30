/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ChatViewId, showChatView } from '../chat.js';
import { ACTION_ID_NEW_CHAT, CHAT_CATEGORY, CHAT_CONFIG_MENU_ID } from '../actions/chatActions.js';
import { OS } from '../../../../../base/common/platform.js';
import { Codicon } from '../../../../../base/common/codicons.js';
import { ChatContextKeys } from '../../common/chatContextKeys.js';
import { assertDefined } from '../../../../../base/common/types.js';
import { ResourceContextKey } from '../../../../common/contextkeys.js';
import { PromptsType, PROMPT_LANGUAGE_ID } from '../../common/promptSyntax/promptTypes.js';
import { localize, localize2 } from '../../../../../nls.js';
import { UILabelProvider } from '../../../../../base/common/keybindingLabels.js';
import { PromptsConfig } from '../../common/promptSyntax/config/config.js';
import { IViewsService } from '../../../../services/views/common/viewsService.js';
import { PromptFilePickers } from './pickers/promptFilePickers.js';
import { EditorContextKeys } from '../../../../../editor/common/editorContextKeys.js';
import { ICommandService } from '../../../../../platform/commands/common/commands.js';
import { ContextKeyExpr } from '../../../../../platform/contextkey/common/contextkey.js';
import { ICodeEditorService } from '../../../../../editor/browser/services/codeEditorService.js';
import { Action2, MenuId, registerAction2 } from '../../../../../platform/actions/common/actions.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { IOpenerService } from '../../../../../platform/opener/common/opener.js';
import { getPromptCommandName } from '../../common/promptSyntax/service/promptsServiceImpl.js';
/**
 * Condition for the `Run Current Prompt` action.
 */
const EDITOR_ACTIONS_CONDITION = ContextKeyExpr.and(ContextKeyExpr.and(PromptsConfig.enabledCtx, ChatContextKeys.enabled), ResourceContextKey.HasResource, ResourceContextKey.LangId.isEqualTo(PROMPT_LANGUAGE_ID));
/**
 * Keybinding of the action.
 */
const COMMAND_KEY_BINDING = 256 /* KeyMod.WinCtrl */ | 90 /* KeyCode.Slash */ | 512 /* KeyMod.Alt */;
/**
 * Action ID for the `Run Current Prompt` action.
 */
const RUN_CURRENT_PROMPT_ACTION_ID = 'workbench.action.chat.run.prompt.current';
/**
 * Action ID for the `Run Prompt...` action.
 */
const RUN_SELECTED_PROMPT_ACTION_ID = 'workbench.action.chat.run.prompt';
/**
 * Action ID for the `Configure Prompt Files...` action.
 */
const CONFIGURE_PROMPTS_ACTION_ID = 'workbench.action.chat.configure.prompts';
/**
 * Base class of the `Run Prompt` action.
 */
class RunPromptBaseAction extends Action2 {
    constructor(options) {
        super({
            id: options.id,
            title: options.title,
            f1: false,
            precondition: ContextKeyExpr.and(PromptsConfig.enabledCtx, ChatContextKeys.enabled),
            category: CHAT_CATEGORY,
            icon: options.icon,
            keybinding: {
                when: ContextKeyExpr.and(EditorContextKeys.editorTextFocus, EDITOR_ACTIONS_CONDITION),
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: options.keybinding,
            },
            menu: [
                {
                    id: MenuId.EditorTitleRun,
                    group: 'navigation',
                    order: options.alt ? 0 : 1,
                    alt: options.alt,
                    when: EDITOR_ACTIONS_CONDITION,
                },
            ],
        });
    }
    /**
     * Executes the run prompt action with provided options.
     */
    async execute(resource, inNewChat, accessor) {
        const viewsService = accessor.get(IViewsService);
        const commandService = accessor.get(ICommandService);
        resource ||= getActivePromptFileUri(accessor);
        assertDefined(resource, 'Cannot find URI resource for an active text editor.');
        if (inNewChat === true) {
            await commandService.executeCommand(ACTION_ID_NEW_CHAT);
        }
        const widget = await showChatView(viewsService);
        if (widget) {
            widget.setInput(`/${getPromptCommandName(resource.path)}`);
            // submit the prompt immediately
            await widget.acceptInput();
        }
        return widget;
    }
}
const RUN_CURRENT_PROMPT_ACTION_TITLE = localize2('run-prompt.capitalized', "Run Prompt in Current Chat");
const RUN_CURRENT_PROMPT_ACTION_ICON = Codicon.playCircle;
/**
 * The default `Run Current Prompt` action.
 */
class RunCurrentPromptAction extends RunPromptBaseAction {
    constructor() {
        super({
            id: RUN_CURRENT_PROMPT_ACTION_ID,
            title: RUN_CURRENT_PROMPT_ACTION_TITLE,
            icon: RUN_CURRENT_PROMPT_ACTION_ICON,
            keybinding: COMMAND_KEY_BINDING,
        });
    }
    async run(accessor, resource) {
        return await super.execute(resource, false, accessor);
    }
}
class RunSelectedPromptAction extends Action2 {
    constructor() {
        super({
            id: RUN_SELECTED_PROMPT_ACTION_ID,
            title: localize2('run-prompt.capitalized.ellipses', "Run Prompt..."),
            icon: Codicon.bookmark,
            f1: true,
            precondition: ContextKeyExpr.and(PromptsConfig.enabledCtx, ChatContextKeys.enabled),
            keybinding: {
                when: ContextKeyExpr.and(PromptsConfig.enabledCtx, ChatContextKeys.enabled),
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: COMMAND_KEY_BINDING,
            },
            category: CHAT_CATEGORY,
        });
    }
    async run(accessor) {
        const viewsService = accessor.get(IViewsService);
        const commandService = accessor.get(ICommandService);
        const instaService = accessor.get(IInstantiationService);
        const pickers = instaService.createInstance(PromptFilePickers);
        const placeholder = localize('commands.prompt.select-dialog.placeholder', 'Select the prompt file to run (hold {0}-key to use in new chat)', UILabelProvider.modifierLabels[OS].ctrlKey);
        const result = await pickers.selectPromptFile({ placeholder, type: PromptsType.prompt });
        if (result === undefined) {
            return;
        }
        const { promptFile, keyMods } = result;
        if (keyMods.ctrlCmd === true) {
            await commandService.executeCommand(ACTION_ID_NEW_CHAT);
        }
        const widget = await showChatView(viewsService);
        if (widget) {
            widget.setInput(`/${getPromptCommandName(promptFile.path)}`);
            // submit the prompt immediately
            await widget.acceptInput();
            widget.focusInput();
        }
    }
}
class ManagePromptFilesAction extends Action2 {
    constructor() {
        super({
            id: CONFIGURE_PROMPTS_ACTION_ID,
            title: localize2('configure-prompts', "Configure Prompt Files..."),
            shortTitle: localize2('configure-prompts.short', "Prompt Files"),
            icon: Codicon.bookmark,
            f1: true,
            precondition: ContextKeyExpr.and(PromptsConfig.enabledCtx, ChatContextKeys.enabled),
            category: CHAT_CATEGORY,
            menu: {
                id: CHAT_CONFIG_MENU_ID,
                when: ContextKeyExpr.and(PromptsConfig.enabledCtx, ChatContextKeys.enabled, ContextKeyExpr.equals('view', ChatViewId)),
                order: 10,
                group: '0_level'
            },
        });
    }
    async run(accessor) {
        const openerService = accessor.get(IOpenerService);
        const instaService = accessor.get(IInstantiationService);
        const pickers = instaService.createInstance(PromptFilePickers);
        const placeholder = localize('commands.prompt.manage-dialog.placeholder', 'Select the prompt file to open');
        const result = await pickers.selectPromptFile({ placeholder, type: PromptsType.prompt, optionEdit: false });
        if (result !== undefined) {
            await openerService.open(result.promptFile);
        }
    }
}
/**
 * Gets `URI` of a prompt file open in an active editor instance, if any.
 */
function getActivePromptFileUri(accessor) {
    const codeEditorService = accessor.get(ICodeEditorService);
    const model = codeEditorService.getActiveCodeEditor()?.getModel();
    if (model?.getLanguageId() === PROMPT_LANGUAGE_ID) {
        return model.uri;
    }
    return undefined;
}
/**
 * Action ID for the `Run Current Prompt In New Chat` action.
 */
const RUN_CURRENT_PROMPT_IN_NEW_CHAT_ACTION_ID = 'workbench.action.chat.run-in-new-chat.prompt.current';
const RUN_IN_NEW_CHAT_ACTION_TITLE = localize2('run-prompt-in-new-chat.capitalized', "Run Prompt In New Chat");
/**
 * Icon for the `Run Current Prompt In New Chat` action.
 */
const RUN_IN_NEW_CHAT_ACTION_ICON = Codicon.play;
/**
 * `Run Current Prompt In New Chat` action.
 */
class RunCurrentPromptInNewChatAction extends RunPromptBaseAction {
    constructor() {
        super({
            id: RUN_CURRENT_PROMPT_IN_NEW_CHAT_ACTION_ID,
            title: RUN_IN_NEW_CHAT_ACTION_TITLE,
            icon: RUN_IN_NEW_CHAT_ACTION_ICON,
            keybinding: COMMAND_KEY_BINDING | 2048 /* KeyMod.CtrlCmd */,
            alt: {
                id: RUN_CURRENT_PROMPT_ACTION_ID,
                title: RUN_CURRENT_PROMPT_ACTION_TITLE,
                icon: RUN_CURRENT_PROMPT_ACTION_ICON,
            },
        });
    }
    async run(accessor, resource) {
        return await super.execute(resource, true, accessor);
    }
}
/**
 * Helper to register all the `Run Current Prompt` actions.
 */
export function registerRunPromptActions() {
    registerAction2(RunCurrentPromptInNewChatAction);
    registerAction2(RunCurrentPromptAction);
    registerAction2(RunSelectedPromptAction);
    registerAction2(ManagePromptFilesAction);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVuUHJvbXB0QWN0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvYWR2aWthci9Eb2N1bWVudHMvYXJjaGl0ZWN0L2FyY2gyL0FyY2hJREUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9icm93c2VyL3Byb21wdFN5bnRheC9ydW5Qcm9tcHRBY3Rpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFVBQVUsRUFBZSxZQUFZLEVBQUUsTUFBTSxZQUFZLENBQUM7QUFDbkUsT0FBTyxFQUFFLGtCQUFrQixFQUFFLGFBQWEsRUFBRSxtQkFBbUIsRUFBRSxNQUFNLDJCQUEyQixDQUFDO0FBRW5HLE9BQU8sRUFBRSxFQUFFLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUM1RCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDakUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUVwRSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUV2RSxPQUFPLEVBQUUsV0FBVyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDM0YsT0FBTyxFQUFvQixRQUFRLEVBQUUsU0FBUyxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFDOUUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBRWpGLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUMzRSxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDbEYsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFFbkUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFD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