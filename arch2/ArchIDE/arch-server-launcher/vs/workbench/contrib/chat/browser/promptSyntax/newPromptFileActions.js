/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { isEqual } from '../../../../../base/common/resources.js';
import { URI } from '../../../../../base/common/uri.js';
import { getCodeEditor } from '../../../../../editor/browser/editorBrowser.js';
import { SnippetController2 } from '../../../../../editor/contrib/snippet/browser/snippetController2.js';
import { localize, localize2 } from '../../../../../nls.js';
import { Action2, MenuId, registerAction2 } from '../../../../../platform/actions/common/actions.js';
import { ICommandService } from '../../../../../platform/commands/common/commands.js';
import { ContextKeyExpr } from '../../../../../platform/contextkey/common/contextkey.js';
import { IFileService } from '../../../../../platform/files/common/files.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { ILogService } from '../../../../../platform/log/common/log.js';
import { INotificationService, NeverShowAgainScope, Severity } from '../../../../../platform/notification/common/notification.js';
import { IOpenerService } from '../../../../../platform/opener/common/opener.js';
import { PromptsConfig } from '../../common/promptSyntax/config/config.js';
import { getLanguageIdForPromptsType, PromptsType } from '../../common/promptSyntax/promptTypes.js';
import { IUserDataSyncEnablementService } from '../../../../../platform/userDataSync/common/userDataSync.js';
import { IEditorService } from '../../../../services/editor/common/editorService.js';
import { CONFIGURE_SYNC_COMMAND_ID } from '../../../../services/userDataSync/common/userDataSync.js';
import { ISnippetsService } from '../../../snippets/browser/snippets.js';
import { ChatContextKeys } from '../../common/chatContextKeys.js';
import { CHAT_CATEGORY } from '../actions/chatActions.js';
import { askForPromptFileName } from './pickers/askForPromptName.js';
import { askForPromptSourceFolder } from './pickers/askForPromptSourceFolder.js';
class AbstractNewPromptFileAction extends Action2 {
    constructor(id, title, type) {
        super({
            id,
            title,
            f1: false,
            precondition: ContextKeyExpr.and(PromptsConfig.enabledCtx, ChatContextKeys.enabled),
            category: CHAT_CATEGORY,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */
            },
            menu: {
                id: MenuId.CommandPalette,
                when: ContextKeyExpr.and(PromptsConfig.enabledCtx, ChatContextKeys.enabled)
            }
        });
        this.type = type;
    }
    async run(accessor) {
        const logService = accessor.get(ILogService);
        const openerService = accessor.get(IOpenerService);
        const commandService = accessor.get(ICommandService);
        const notificationService = accessor.get(INotificationService);
        const userDataSyncEnablementService = accessor.get(IUserDataSyncEnablementService);
        const editorService = accessor.get(IEditorService);
        const fileService = accessor.get(IFileService);
        const instaService = accessor.get(IInstantiationService);
        const selectedFolder = await instaService.invokeFunction(askForPromptSourceFolder, this.type);
        if (!selectedFolder) {
            return;
        }
        const fileName = await instaService.invokeFunction(askForPromptFileName, this.type, selectedFolder.uri);
        if (!fileName) {
            return;
        }
        // create the prompt file
        await fileService.createFolder(selectedFolder.uri);
        const promptUri = URI.joinPath(selectedFolder.uri, fileName);
        await fileService.createFile(promptUri);
        await openerService.open(promptUri);
        const editor = getCodeEditor(editorService.activeTextEditorControl);
        if (editor && editor.hasModel() && isEqual(editor.getModel().uri, promptUri)) {
            SnippetController2.get(editor)?.apply([{
                    range: editor.getModel().getFullModelRange(),
                    template: getDefaultContentSnippet(this.type),
                }]);
        }
        if (selectedFolder.storage !== 'user') {
            return;
        }
        // due to PII concerns, synchronization of the 'user' reusable prompts
        // is disabled by default, but we want to make that fact clear to the user
        // hence after a 'user' prompt is create, we check if the synchronization
        // was explicitly configured before, and if it wasn't, we show a suggestion
        // to enable the synchronization logic in the Settings Sync configuration
        const isConfigured = userDataSyncEnablementService
            .isResourceEnablementConfigured("prompts" /* SyncResource.Prompts */);
        const isSettingsSyncEnabled = userDataSyncEnablementService.isEnabled();
        // if prompts synchronization has already been configured before or
        // if settings sync service is currently disabled, nothing to do
        if ((isConfigured === true) || (isSettingsSyncEnabled === false)) {
            return;
        }
        // show suggestion to enable synchronization of the user prompts and instructions to the user
        notificationService.prompt(Severity.Info, localize('workbench.command.prompts.create.user.enable-sync-notification', "Do you want to backup and sync your user prompt, instruction and mode files with Setting Sync?'"), [
            {
                label: localize('enable.capitalized', "Enable"),
                run: () => {
                    commandService.executeCommand(CONFIGURE_SYNC_COMMAND_ID)
                        .catch((error) => {
                        logService.error(`Failed to run '${CONFIGURE_SYNC_COMMAND_ID}' command: ${error}.`);
                    });
                },
            },
            {
                label: localize('learnMore.capitalized', "Learn More"),
                run: () => {
                    openerService.open(URI.parse('https://aka.ms/vscode-settings-sync-help'));
                },
            },
        ], {
            neverShowAgain: {
                id: 'workbench.command.prompts.create.user.enable-sync-notification',
                scope: NeverShowAgainScope.PROFILE,
            },
        });
    }
}
function getDefaultContentSnippet(promptType) {
    switch (promptType) {
        case PromptsType.prompt:
            return [
                `---`,
                `mode: \${1|ask,edit,agent|}`,
                `---`,
                `\${2:Define the task to achieve, including specific requirements, constraints, and success criteria.}`,
            ].join('\n');
        case PromptsType.instructions:
            return [
                `---`,
                `applyTo: '\${1|**,**/*.ts|}'`,
                `---`,
                `\${2:Provide project context and coding guidelines that AI should follow when generating code, answering questions, or reviewing changes.}`,
            ].join('\n');
        case PromptsType.mode:
            return [
                `---`,
                `description: '\${1:Description of the custom chat mode.}'`,
                `tools: []`,
                `---`,
                `\${2:Define the purpose of this chat mode and how AI should behave: response style, available tools, focus areas, and any mode-specific instructions or constraints.}`,
            ].join('\n');
        default:
            throw new Error(`Unknown prompt type: ${promptType}`);
    }
}
export const NEW_PROMPT_COMMAND_ID = 'workbench.command.new.prompt';
export const NEW_INSTRUCTIONS_COMMAND_ID = 'workbench.command.new.instructions';
export const NEW_MODE_COMMAND_ID = 'workbench.command.new.mode';
class NewPromptFileAction extends AbstractNewPromptFileAction {
    constructor() {
        super(NEW_PROMPT_COMMAND_ID, localize('commands.new.prompt.local.title', "New Prompt File..."), PromptsType.prompt);
    }
}
class NewInstructionsFileAction extends AbstractNewPromptFileAction {
    constructor() {
        super(NEW_INSTRUCTIONS_COMMAND_ID, localize('commands.new.instructions.local.title', "New Instructions File..."), PromptsType.instructions);
    }
}
class NewModeFileAction extends AbstractNewPromptFileAction {
    constructor() {
        super(NEW_MODE_COMMAND_ID, localize('commands.new.mode.local.title', "New Mode File..."), PromptsType.mode);
    }
}
class NewUntitledPromptFileAction extends Action2 {
    constructor() {
        super({
            id: 'workbench.command.new.untitled.prompt',
            title: localize2('commands.new.untitled.prompt.title', "New Untitled Prompt File"),
            f1: true,
            precondition: ContextKeyExpr.and(PromptsConfig.enabledCtx, ChatContextKeys.enabled),
            category: CHAT_CATEGORY,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */
            },
        });
    }
    async run(accessor) {
        const editorService = accessor.get(IEditorService);
        const snippetService = accessor.get(ISnippetsService);
        const languageId = getLanguageIdForPromptsType(PromptsType.prompt);
        const input = await editorService.openEditor({
            resource: undefined,
            languageId,
            options: {
                pinned: true
            }
        });
        const editor = getCodeEditor(editorService.activeTextEditorControl);
        if (editor && editor.hasModel()) {
            const snippets = await snippetService.getSnippets(languageId, { fileTemplateSnippets: true, noRecencySort: true, includeNoPrefixSnippets: true });
            if (snippets.length > 0) {
                SnippetController2.get(editor)?.apply([{
                        range: editor.getModel().getFullModelRange(),
                        template: snippets[0].body
                    }]);
            }
        }
        return input;
    }
}
export function registerNewPromptFileActions() {
    registerAction2(NewPromptFileAction);
    registerAction2(NewInstructionsFileAction);
    registerAction2(NewModeFileAction);
    registerAction2(NewUntitledPromptFileAction);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmV3UHJvbXB0RmlsZUFjdGlvbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9hZHZpa2FyL0RvY3VtZW50cy9hcmNoaXRlY3QvYXJjaDIvQXJjaElERS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2Jyb3dzZXIvcHJvbXB0U3ludGF4L25ld1Byb21wdEZpbGVBY3Rpb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNsRSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDeEQsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQy9FLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHFFQUFxRSxDQUFDO0FBQ3pHLE9BQU8sRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFDNUQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLEVBQUUsZUFBZSxFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDckcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHFEQUFxRCxDQUFDO0FBQ3RGLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUN6RixPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sK0NBQStDLENBQUM7QUFDN0UsT0FBTyxFQUFFLHFCQUFxQixFQUFvQixNQUFNLCtEQUErRCxDQUFDO0FBRXhILE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUN4RSxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsbUJBQW1CLEVBQUUsUUFBUSxFQUFFLE1BQU0sNkRBQTZELENBQUM7QUFDbEksT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGlEQUFpRCxDQUFDO0FBQ2pGLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSw0Q0FBNEMs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