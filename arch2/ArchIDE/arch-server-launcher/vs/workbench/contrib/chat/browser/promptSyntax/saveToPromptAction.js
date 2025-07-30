/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize2 } from '../../../../../nls.js';
import { Action2, registerAction2 } from '../../../../../platform/actions/common/actions.js';
import { ContextKeyExpr } from '../../../../../platform/contextkey/common/contextkey.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { ILogService } from '../../../../../platform/log/common/log.js';
import { PromptsConfig } from '../../common/promptSyntax/config/config.js';
import { IEditorService } from '../../../../services/editor/common/editorService.js';
import { ChatContextKeys } from '../../common/chatContextKeys.js';
import { chatSubcommandLeader } from '../../common/chatParserTypes.js';
import { PROMPT_LANGUAGE_ID } from '../../common/promptSyntax/promptTypes.js';
import { CHAT_CATEGORY } from '../actions/chatActions.js';
import { ChatModeKind } from '../../common/constants.js';
import { PromptFileRewriter } from './promptFileRewriter.js';
import { ILanguageModelChatMetadata } from '../../common/languageModels.js';
import { URI } from '../../../../../base/common/uri.js';
import { Schemas } from '../../../../../base/common/network.js';
/**
 * Action ID for the `Save Prompt` action.
 */
export const SAVE_TO_PROMPT_ACTION_ID = 'workbench.action.chat.save-to-prompt';
/**
 * Name of the in-chat slash command associated with this action.
 */
export const SAVE_TO_PROMPT_SLASH_COMMAND_NAME = 'save';
/**
 * Class that defines the `Save Prompt` action.
 */
class SaveToPromptAction extends Action2 {
    constructor() {
        super({
            id: SAVE_TO_PROMPT_ACTION_ID,
            title: localize2('workbench.actions.save-to-prompt.label', "Save chat session to a prompt file"),
            f1: false,
            precondition: ContextKeyExpr.and(PromptsConfig.enabledCtx, ChatContextKeys.enabled),
            category: CHAT_CATEGORY,
        });
    }
    async run(accessor, options) {
        const logService = accessor.get(ILogService);
        const editorService = accessor.get(IEditorService);
        const rewriter = accessor.get(IInstantiationService).createInstance(PromptFileRewriter);
        const logPrefix = 'save to prompt';
        const chatWidget = options.chat;
        const mode = chatWidget.input.currentModeObs.get();
        const model = chatWidget.input.selectedLanguageModel;
        const toolAndToolsetMap = chatWidget.input.selectedToolsModel.entriesMap.get();
        const output = [];
        output.push('---');
        output.push(`description: New prompt created from chat session`);
        output.push(`mode: ${mode.kind}`);
        if (mode.kind === ChatModeKind.Agent) {
            output.push(`tools: ${rewriter.getNewValueString(toolAndToolsetMap)}`);
        }
        if (model) {
            output.push(`model: ${ILanguageModelChatMetadata.asQualifiedName(model.metadata)}`);
        }
        output.push('---');
        const viewModel = chatWidget.viewModel;
        if (viewModel) {
            for (const request of viewModel.model.getRequests()) {
                const { message, response: responseModel } = request;
                if (isSaveToPromptSlashCommand(message)) {
                    continue;
                }
                if (responseModel === undefined) {
                    logService.warn(`[${logPrefix}]: skipping request '${request.id}' with no response`);
                    continue;
                }
                const { response } = responseModel;
                output.push(`<user>`);
                output.push(request.message.text);
                output.push(`</user>`);
                output.push();
                output.push(`<assistant>`);
                output.push(response.getMarkdown());
                output.push(`</assistant>`);
                output.push();
            }
            const promptText = output.join('\n');
            const untitledPath = 'new.prompt.md';
            const untitledResource = URI.from({ scheme: Schemas.untitled, path: untitledPath });
            const editor = await editorService.openEditor({
                resource: untitledResource,
                contents: promptText,
                languageId: PROMPT_LANGUAGE_ID,
            });
            editor?.focus();
        }
    }
}
/**
 * Check if provided message belongs to the `save to prompt` slash
 * command itself that was run in the chat to invoke this action.
 */
function isSaveToPromptSlashCommand(message) {
    const { parts } = message;
    if (parts.length < 1) {
        return false;
    }
    const firstPart = parts[0];
    if (firstPart.kind !== 'slash') {
        return false;
    }
    if (firstPart.text !== `${chatSubcommandLeader}${SAVE_TO_PROMPT_SLASH_COMMAND_NAME}`) {
        return false;
    }
    return true;
}
/**
 * Helper to register all the `Save Prompt` actions.
 */
export function registerSaveToPromptActions() {
    registerAction2(SaveToPromptAction);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2F2ZVRvUHJvbXB0QWN0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvYWR2aWthci9Eb2N1bWVudHMvYXJjaGl0ZWN0L2FyY2gyL0FyY2hJREUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9icm93c2VyL3Byb21wdFN5bnRheC9zYXZlVG9Qcm9tcHRBY3Rpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBQ2xELE9BQU8sRUFBRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFFN0YsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQ3pGLE9BQU8sRUFBRSxxQkFBcUIsRUFBb0IsTUFBTSwrREFBK0QsQ0FBQztBQUN4SCxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFDeEUsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQzNFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxxREFBcUQsQ0FBQztBQUNyRixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDbEUsT0FBTyxFQUFFLG9CQUFvQixFQUFzQixNQUFNLGlDQUFpQyxDQUFDO0FBQzNGLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQzlFLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQztBQUUxRCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sMkJBQTJCLENBQUM7QUFDekQsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0seUJBQXlCLENBQUM7QUFDN0QsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDNUUsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLG1DQUFt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