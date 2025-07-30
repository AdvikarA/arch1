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
import { MarkdownString } from '../../../../../../base/common/htmlContent.js';
import { Disposable } from '../../../../../../base/common/lifecycle.js';
import { ILanguageFeaturesService } from '../../../../../../editor/common/services/languageFeatures.js';
import { localize } from '../../../../../../nls.js';
import { ILanguageModelChatMetadata, ILanguageModelsService } from '../../languageModels.js';
import { ILanguageModelToolsService } from '../../languageModelToolsService.js';
import { InstructionsHeader } from '../parsers/promptHeader/instructionsHeader.js';
import { ModeHeader } from '../parsers/promptHeader/modeHeader.js';
import { ALL_PROMPTS_LANGUAGE_SELECTOR, getPromptsTypeForLanguageId } from '../promptTypes.js';
import { IPromptsService } from '../service/promptsService.js';
let PromptHeaderHoverProvider = class PromptHeaderHoverProvider extends Disposable {
    constructor(promptsService, languageService, languageModelToolsService, languageModelsService) {
        super();
        this.promptsService = promptsService;
        this.languageService = languageService;
        this.languageModelToolsService = languageModelToolsService;
        this.languageModelsService = languageModelsService;
        /**
         * Debug display name for this provider.
         */
        this._debugDisplayName = 'PromptHeaderHoverProvider';
        this._register(this.languageService.hoverProvider.register(ALL_PROMPTS_LANGUAGE_SELECTOR, this));
    }
    createHover(contents, range) {
        return {
            contents: [new MarkdownString(contents)],
            range
        };
    }
    async provideHover(model, position, token, _context) {
        const promptType = getPromptsTypeForLanguageId(model.getLanguageId());
        if (!promptType) {
            // if the model is not a prompt, we don't provide any completions
            return undefined;
        }
        const parser = this.promptsService.getSyntaxParserFor(model);
        await parser.start(token).settled();
        if (token.isCancellationRequested) {
            return undefined;
        }
        const header = parser.header;
        if (!header) {
            return undefined;
        }
        const completed = await header.settled;
        if (!completed || token.isCancellationRequested) {
            return undefined;
        }
        if (header instanceof InstructionsHeader) {
            const descriptionRange = header.metadataUtility.description?.range;
            if (descriptionRange?.containsPosition(position)) {
                return this.createHover(localize('promptHeader.instructions.description', 'The description of the instruction file. It can be used to provide additional context or information about the instructions and is passed to the language model as part of the prompt.'), descriptionRange);
            }
            const applyToRange = header.metadataUtility.applyTo?.range;
            if (applyToRange?.containsPosition(position)) {
                return this.createHover(localize('promptHeader.instructions.applyToRange', 'One or more glob pattern (separated by comma) that describe for which files the instructions apply to. Based on these patterns, the file is automatically included in the prompt, when the context contains a file that matches one or more of these patterns. Use `**` when you want this file to always be added.\nExample: **/*.ts, **/*.js, client/**'), applyToRange);
            }
        }
        else if (header instanceof ModeHeader) {
            const descriptionRange = header.metadataUtility.description?.range;
            if (descriptionRange?.containsPosition(position)) {
                return this.createHover(localize('promptHeader.mode.description', 'The description of the mode file. It can be used to provide additional context or information about the mode to the mode author.'), descriptionRange);
            }
            const model = header.metadataUtility.model;
            if (model?.range.containsPosition(position)) {
                return this.getModelHover(model, model.range, localize('promptHeader.mode.model', 'The model to use in this mode.'));
            }
            const tools = header.metadataUtility.tools;
            if (tools?.range?.containsPosition(position)) {
                return this.getToolHover(tools, position, localize('promptHeader.mode.tools', 'The tools to use in this mode.'));
            }
        }
        else {
            const descriptionRange = header.metadataUtility.description?.range;
            if (descriptionRange?.containsPosition(position)) {
                return this.createHover(localize('promptHeader.prompt.description', 'The description of the prompt file. It can be used to provide additional context or information about the prompt to the prompt author.'), descriptionRange);
            }
            const model = header.metadataUtility.model;
            if (model?.range.containsPosition(position)) {
                return this.getModelHover(model, model.range, localize('promptHeader.prompt.model', 'The model to use in this prompt.'));
            }
            const tools = header.metadataUtility.tools;
            if (tools?.range?.containsPosition(position)) {
                return this.getToolHover(tools, position, localize('promptHeader.prompt.tools', 'The tools to use in this prompt.'));
            }
            const modeRange = header.metadataUtility.mode?.range;
            if (modeRange?.containsPosition(position)) {
                return this.createHover(localize('promptHeader.prompt.mode', 'The mode (ask, edit or agent) to use when running this prompt.'), modeRange);
            }
        }
        return undefined;
    }
    getToolHover(node, position, baseMessage) {
        if (node.value) {
            for (const toolName of node.value) {
                const toolRange = node.getToolRange(toolName);
                if (toolRange?.containsPosition(position)) {
                    const tool = this.languageModelToolsService.getToolByName(toolName);
                    if (tool) {
                        return this.createHover(tool.modelDescription, toolRange);
                    }
                    const toolSet = this.languageModelToolsService.getToolSetByName(toolName);
                    if (toolSet) {
                        return this.getToolsetHover(toolSet, toolRange);
                    }
                }
            }
        }
        return this.createHover(baseMessage, node.range);
    }
    getToolsetHover(toolSet, range) {
        const lines = [];
        lines.push(localize('toolSetName', 'ToolSet: {0}\n\n', toolSet.referenceName));
        if (toolSet.description) {
            lines.push(toolSet.description);
        }
        for (const tool of toolSet.getTools()) {
            lines.push(`- ${tool.toolReferenceName ?? tool.displayName}`);
        }
        return this.createHover(lines.join('\n'), range);
    }
    getModelHover(node, range, baseMessage) {
        const modelName = node.value;
        if (modelName) {
            for (const id of this.languageModelsService.getLanguageModelIds()) {
                const meta = this.languageModelsService.lookupLanguageModel(id);
                if (meta && ILanguageModelChatMetadata.asQualifiedName(meta) === modelName) {
                    const lines = [];
                    lines.push(baseMessage + '\n');
                    lines.push(localize('modelName', '- Name: {0}', meta.name));
                    lines.push(localize('modelFamily', '- Family: {0}', meta.family));
                    lines.push(localize('modelVendor', '- Vendor: {0}', meta.vendor));
                    if (meta.description) {
                        lines.push('', '', meta.description);
                    }
                    return this.createHover(lines.join('\n'), range);
                }
            }
        }
        return this.createHover(baseMessage, range);
    }
};
PromptHeaderHoverProvider = __decorate([
    __param(0, IPromptsService),
    __param(1, ILanguageFeaturesService),
    __param(2, ILanguageModelToolsService),
    __param(3, ILanguageModelsService)
], PromptHeaderHoverProvider);
export { PromptHeaderHoverProvider };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvbXB0SGVhZGVySG92ZXJzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvYWR2aWthci9Eb2N1bWVudHMvYXJjaGl0ZWN0L2FyY2gyL0FyY2hJREUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9jb21tb24vcHJvbXB0U3ludGF4L2xhbmd1YWdlUHJvdmlkZXJzL3Byb21wdEhlYWRlckhvdmVycy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUdoRyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sOENBQThDLENBQUM7QUFDOUUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBS3hFLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLDhEQUE4RCxDQUFDO0FBQ3hHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQUNwRCxPQUFPLEVBQUUsMEJBQTBCLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQztBQUM3RixPQUFPLEVBQUUsMEJBQTBCLEVBQVcsTUFBTSxvQ0FBb0MsQ0FBQztBQUN6RixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQztBQUduRixPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDbkUsT0FBTyxFQUFFLDZCQUE2QixFQUFFLDJCQUEyQixFQUFFLE1BQU0sbUJBQW1CLENBQUM7QUFDL0YsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBRXhELElBQU0seUJBQXlCLEdBQS9CLE1BQU0seUJBQTBCLFNBQVEsVUFBVTtJQU14RCxZQUNrQixjQUFnRCxFQUN2QyxlQUEwRCxFQUN4RCx5QkFBc0UsRUFDMUUscUJBQThEO1FBRXRGLEtBQUssRUFBRSxDQUFDO1FBTDBCLG1CQUFjLEdBQWQsY0FBYyxDQUFpQjtRQUN0QixvQkFBZSxHQUFmLGVB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