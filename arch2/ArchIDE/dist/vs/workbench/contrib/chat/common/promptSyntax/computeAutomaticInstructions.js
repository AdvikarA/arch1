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
import { match, splitGlobAware } from '../../../../../base/common/glob.js';
import { ResourceMap, ResourceSet } from '../../../../../base/common/map.js';
import { Schemas } from '../../../../../base/common/network.js';
import { basename, joinPath } from '../../../../../base/common/resources.js';
import { localize } from '../../../../../nls.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { IFileService } from '../../../../../platform/files/common/files.js';
import { ILabelService } from '../../../../../platform/label/common/label.js';
import { ILogService } from '../../../../../platform/log/common/log.js';
import { IWorkspaceContextService } from '../../../../../platform/workspace/common/workspace.js';
import { IChatRequestVariableEntry, isPromptFileVariableEntry, toPromptFileVariableEntry, toPromptTextVariableEntry, PromptFileVariableKind } from '../chatVariableEntries.js';
import { PromptsConfig } from './config/config.js';
import { COPILOT_CUSTOM_INSTRUCTIONS_FILENAME, isPromptOrInstructionsFile } from './config/promptFileLocations.js';
import { PromptsType } from './promptTypes.js';
import { IPromptsService } from './service/promptsService.js';
let ComputeAutomaticInstructions = class ComputeAutomaticInstructions {
    constructor(_readFileTool, _promptsService, _logService, _labelService, _configurationService, _workspaceService, _fileService) {
        this._readFileTool = _readFileTool;
        this._promptsService = _promptsService;
        this._logService = _logService;
        this._labelService = _labelService;
        this._configurationService = _configurationService;
        this._workspaceService = _workspaceService;
        this._fileService = _fileService;
        this._parseResults = new ResourceMap();
        this._autoAddedInstructions = [];
    }
    get autoAddedInstructions() {
        return this._autoAddedInstructions;
    }
    async _parseInstructionsFile(uri, token) {
        if (this._parseResults.has(uri)) {
            return this._parseResults.get(uri);
        }
        const result = await this._promptsService.parse(uri, PromptsType.instructions, token);
        this._parseResults.set(uri, result);
        return result;
    }
    async collect(variables, token) {
        const instructionFiles = await this._promptsService.listPromptFiles(PromptsType.instructions, token);
        this._logService.trace(`[InstructionsContextComputer] ${instructionFiles.length} instruction files available.`);
        // find instructions where the `applyTo` matches the attached context
        const context = this._getContext(variables);
        const autoAddedInstructions = await this.findInstructionFilesFor(instructionFiles, context, token);
        variables.add(...autoAddedInstructions);
        this._autoAddedInstructions.push(...autoAddedInstructions);
        // get copilot instructions
        const copilotInstructions = await this._getCopilotInstructions();
        for (const entry of copilotInstructions) {
            variables.add(entry);
        }
        this._logService.trace(`[InstructionsContextComputer]  ${copilotInstructions.length} Copilot instructions files added.`);
        const instructionsWithPatternsList = await this._getInstructionsWithPatternsList(instructionFiles, variables, token);
        if (instructionsWithPatternsList.length > 0) {
            const text = instructionsWithPatternsList.join('\n');
            variables.add(toPromptTextVariableEntry(text, PromptsConfig.COPILOT_INSTRUCTIONS, true));
        }
        // add all instructions for all instruction files that are in the context
        await this._addReferencedInstructions(variables, token);
    }
    async collectCopilotInstructionsOnly(variables, token) {
        const copilotInstructions = await this._getCopilotInstructions();
        for (const entry of copilotInstructions) {
            variables.add(entry);
        }
        this._logService.trace(`[InstructionsContextComputer]  ${copilotInstructions.length} Copilot instructions files added.`);
        // add all instructions for all instruction files that are in the context
        await this._addReferencedInstructions(variables, token);
        return;
    }
    /** public for testing */
    async findInstructionFilesFor(instructionFiles, context, token) {
        const autoAddedInstructions = [];
        for (const instructionFile of instructionFiles) {
            const { metadata, uri } = await this._parseInstructionsFile(instructionFile.uri, token);
            if (metadata?.promptType !== PromptsType.instructions) {
                this._logService.trace(`[InstructionsContextComputer] Not an instruction file: ${uri}`);
                continue;
            }
            const applyTo = metadata?.applyTo;
            if (!applyTo) {
                this._logService.trace(`[InstructionsContextComputer] No 'applyTo' found: ${uri}`);
                continue;
            }
            if (context.instructions.has(uri)) {
                // the instruction file is already part of the input or has already been processed
                this._logService.trace(`[InstructionsContextComputer] Skipping already processed instruction file: ${uri}`);
                continue;
            }
            const match = this._matches(context.files, applyTo);
            if (match) {
                this._logService.trace(`[InstructionsContextComputer] Match for ${uri} with ${match.pattern}${match.file ? ` for file ${match.file}` : ''}`);
                const reason = !match.file ?
                    localize('instruction.file.reason.allFiles', 'Automatically attached as pattern is **') :
                    localize('instruction.file.reason.specificFile', 'Automatically attached as pattern {0} matches {1}', applyTo, this._labelService.getUriLabel(match.file, { relative: true }));
                autoAddedInstructions.push(toPromptFileVariableEntry(uri, PromptFileVariableKind.Instruction, reason, true));
            }
            else {
                this._logService.trace(`[InstructionsContextComputer] No match for ${uri} with ${applyTo}`);
            }
        }
        return autoAddedInstructions;
    }
    _getContext(attachedContext) {
        const files = new ResourceSet();
        const instructions = new ResourceSet();
        for (const variable of attachedContext.asArray()) {
            if (isPromptFileVariableEntry(variable)) {
                instructions.add(variable.value);
            }
            else {
                const uri = IChatRequestVariableEntry.toUri(variable);
                if (uri) {
                    files.add(uri);
                }
            }
        }
        return { files, instructions };
    }
    async _getCopilotInstructions() {
        const useCopilotInstructionsFiles = this._configurationService.getValue(PromptsConfig.USE_COPILOT_INSTRUCTION_FILES);
        if (!useCopilotInstructionsFiles) {
            return [];
        }
        const instructionFiles = [];
        instructionFiles.push(`.github/` + COPILOT_CUSTOM_INSTRUCTIONS_FILENAME);
        const { folders } = this._workspaceService.getWorkspace();
        const entries = [];
        for (const folder of folders) {
            for (const instructionFilePath of instructionFiles) {
                const file = joinPath(folder.uri, instructionFilePath);
                if (await this._fileService.exists(file)) {
                    entries.push(toPromptFileVariableEntry(file, PromptFileVariableKind.Instruction, localize('instruction.file.reason.copilot', 'Automatically attached as setting {0} is enabled', PromptsConfig.USE_COPILOT_INSTRUCTION_FILES), true));
                }
            }
        }
        return entries;
    }
    _matches(files, applyToPattern) {
        const patterns = splitGlobAware(applyToPattern, ',');
        const patterMatches = (pattern) => {
            pattern = pattern.trim();
            if (pattern.length === 0) {
                // if glob pattern is empty, skip it
                return undefined;
            }
            if (pattern === '**' || pattern === '**/*' || pattern === '*') {
                // if glob pattern is one of the special wildcard values,
                // add the instructions file event if no files are attached
                return { pattern };
            }
            if (!pattern.startsWith('/') && !pattern.startsWith('**/')) {
                // support relative glob patterns, e.g. `src/**/*.js`
                pattern = '**/' + pattern;
            }
            // match each attached file with each glob pattern and
            // add the instructions file if its rule matches the file
            for (const file of files) {
                // if the file is not a valid URI, skip it
                if (match(pattern, file.path)) {
                    return { pattern, file }; // return the matched pattern and file URI
                }
            }
            return undefined;
        };
        for (const pattern of patterns) {
            const matchResult = patterMatches(pattern);
            if (matchResult) {
                return matchResult; // return the first matched pattern and file URI
            }
        }
        return undefined;
    }
    async _getInstructionsWithPatternsList(instructionFiles, _existingVariables, token) {
        if (!this._readFileTool) {
            this._logService.trace('[InstructionsContextComputer] No readFile tool available, skipping instructions with patterns list.');
            return [];
        }
        const entries = [];
        for (const instructionFile of instructionFiles) {
            const { metadata, uri } = await this._parseInstructionsFile(instructionFile.uri, token);
            if (metadata?.promptType !== PromptsType.instructions) {
                continue;
            }
            const applyTo = metadata?.applyTo;
            const description = metadata?.description ?? '';
            if (applyTo && applyTo !== '**' && applyTo !== '**/*' && applyTo !== '*') {
                entries.push(`| ${metadata.applyTo} | '${getFilePath(uri)}' | ${description} |`);
            }
        }
        if (entries.length === 0) {
            return entries;
        }
        const toolName = 'read_file'; // workaround https://github.com/microsoft/vscode/issues/252167
        return [
            'Here is a list of instruction files that contain rules for modifying or creating new code.',
            'These files are important for ensuring that the code is modified or created correctly.',
            'Please make sure to follow the rules specified in these files when working with the codebase.',
            `If the file is not already available as attachment, use the \`${toolName}\` tool to acquire it.`,
            'Make sure to acquire the instructions before making any changes to the code.',
            '| Pattern | File Path | Description |',
            '| ------- | --------- | ----------- |',
        ].concat(entries);
    }
    async _addReferencedInstructions(attachedContext, token) {
        const seen = new ResourceSet();
        const todo = [];
        for (const variable of attachedContext.asArray()) {
            if (isPromptFileVariableEntry(variable)) {
                if (!seen.has(variable.value)) {
                    todo.push(variable.value);
                    seen.add(variable.value);
                }
            }
        }
        let next = todo.pop();
        while (next) {
            const result = await this._parseInstructionsFile(next, token);
            const refsToCheck = [];
            for (const ref of result.references) {
                if (!seen.has(ref) && (isPromptOrInstructionsFile(ref) || this._workspaceService.getWorkspaceFolder(ref) !== undefined)) {
                    // only add references that are either prompt or instruction files or are part of the workspace
                    refsToCheck.push({ resource: ref });
                    seen.add(ref);
                }
            }
            if (refsToCheck.length > 0) {
                const stats = await this._fileService.resolveAll(refsToCheck);
                for (let i = 0; i < stats.length; i++) {
                    const stat = stats[i];
                    const uri = refsToCheck[i].resource;
                    if (stat.success && stat.stat?.isFile) {
                        if (isPromptOrInstructionsFile(uri)) {
                            // only recursivly parse instruction files
                            todo.push(uri);
                        }
                        const reason = localize('instruction.file.reason.referenced', 'Referenced by {0}', basename(next));
                        attachedContext.add(toPromptFileVariableEntry(uri, PromptFileVariableKind.InstructionReference, reason, true));
                    }
                }
            }
            next = todo.pop();
        }
    }
};
ComputeAutomaticInstructions = __decorate([
    __param(1, IPromptsService),
    __param(2, ILogService),
    __param(3, ILabelService),
    __param(4, IConfigurationService),
    __param(5, IWorkspaceContextService),
    __param(6, IFileService)
], ComputeAutomaticInstructions);
export { ComputeAutomaticInstructions };
function getFilePath(uri) {
    if (uri.scheme === Schemas.file || uri.scheme === Schemas.vscodeRemote) {
        return uri.fsPath;
    }
    return uri.toString();
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tcHV0ZUF1dG9tYXRpY0luc3RydWN0aW9ucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL2FkdmlrYXIvRG9jdW1lbnRzL2FyY2hpdGVjdC9hcmNoMi9BcmNoSURFL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvY29tbW9uL3Byb21wdFN5bnRheC9jb21wdXRlQXV0b21hdGljSW5zdHJ1Y3Rpb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBR2hHLE9BQU8sRUFBRSxLQUFLLEVBQUUsY0FBYyxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDM0UsT0FBTyxFQUFFLFdBQVcsRUFBRSxXQUFXLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUM3RSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDaEUsT0FBTyxFQUFFLFFBQVEsRUFBRSxRQUFRLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUU3RSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFDakQsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0RBQStELENBQUM7QUFDdEcsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLCtDQUErQyxDQUFDO0FBQzdFLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQztBQUM5RSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFDeEUsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sdURBQXVELENBQUM7QUFDakcsT0FBTyxFQUEwQix5QkFBeUIsRUFBNEIseUJBQXlCLEVBQUUseUJBQXlCLEVBQUUseUJBQXlCLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQztBQUVqTyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDbkQsT0FBTyxFQUFFLG9DQUFvQyxFQUFFLDBC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