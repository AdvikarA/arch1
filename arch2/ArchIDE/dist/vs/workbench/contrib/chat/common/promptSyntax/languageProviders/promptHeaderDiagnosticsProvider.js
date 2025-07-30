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
import { IPromptsService } from '../service/promptsService.js';
import { ProviderInstanceBase } from './providerInstanceBase.js';
import { assertNever } from '../../../../../../base/common/assert.js';
import { CancellationToken } from '../../../../../../base/common/cancellation.js';
import { ProviderInstanceManagerBase } from './providerInstanceManagerBase.js';
import { PromptMetadataError, PromptMetadataWarning } from '../parsers/promptHeader/diagnostics.js';
import { IMarkerService, MarkerSeverity } from '../../../../../../platform/markers/common/markers.js';
import { PromptHeader } from '../parsers/promptHeader/promptHeader.js';
import { ModeHeader } from '../parsers/promptHeader/modeHeader.js';
import { ILanguageModelChatMetadata, ILanguageModelsService } from '../../languageModels.js';
import { ILanguageModelToolsService } from '../../languageModelToolsService.js';
import { localize } from '../../../../../../nls.js';
import { ChatModeKind } from '../../constants.js';
/**
 * Unique ID of the markers provider class.
 */
const MARKERS_OWNER_ID = 'prompts-header-diagnostics-provider';
/**
 * Prompt header diagnostics provider for an individual text model
 * of a prompt file.
 */
let PromptHeaderDiagnosticsProvider = class PromptHeaderDiagnosticsProvider extends ProviderInstanceBase {
    constructor(model, promptsService, markerService, languageModelsService, languageModelToolsService) {
        super(model, promptsService);
        this.markerService = markerService;
        this.languageModelsService = languageModelsService;
        this.languageModelToolsService = languageModelToolsService;
        this._register(languageModelsService.onDidChangeLanguageModels(() => {
            this.onPromptSettled(undefined, CancellationToken.None);
        }));
        this._register(languageModelToolsService.onDidChangeTools(() => {
            this.onPromptSettled(undefined, CancellationToken.None);
        }));
    }
    /**
     * Update diagnostic markers for the current editor.
     */
    async onPromptSettled(_error, token) {
        const { header } = this.parser;
        if (header === undefined) {
            this.markerService.remove(MARKERS_OWNER_ID, [this.model.uri]);
            return;
        }
        // header parsing process is separate from the prompt parsing one, hence
        // apply markers only after the header is settled and so has diagnostics
        const completed = await header.settled;
        if (!completed || token.isCancellationRequested) {
            return;
        }
        const markers = [];
        for (const diagnostic of header.diagnostics) {
            markers.push(toMarker(diagnostic));
        }
        if (header instanceof PromptHeader) {
            this.validateTools(header.metadataUtility.tools, header.metadata.mode, markers);
            this.validateModel(header.metadataUtility.model, header.metadata.mode, markers);
        }
        else if (header instanceof ModeHeader) {
            this.validateTools(header.metadataUtility.tools, ChatModeKind.Agent, markers);
            this.validateModel(header.metadataUtility.model, ChatModeKind.Agent, markers);
        }
        if (markers.length === 0) {
            this.markerService.remove(MARKERS_OWNER_ID, [this.model.uri]);
            return;
        }
        this.markerService.changeOne(MARKERS_OWNER_ID, this.model.uri, markers);
        return;
    }
    validateModel(modelNode, modeKind, markers) {
        if (!modelNode || modelNode.value === undefined) {
            return;
        }
        const languageModes = this.languageModelsService.getLanguageModelIds();
        if (languageModes.length === 0) {
            // likely the service is not initialized yet
            return;
        }
        const modelMetadata = this.findModelByName(languageModes, modelNode.value);
        if (!modelMetadata) {
            markers.push({
                message: localize('promptHeaderDiagnosticsProvider.modelNotFound', "Unknown model '{0}'", modelNode.value),
                severity: MarkerSeverity.Warning,
                ...modelNode.range,
            });
        }
        else if (modeKind === ChatModeKind.Agent && !ILanguageModelChatMetadata.suitableForAgentMode(modelMetadata)) {
            markers.push({
                message: localize('promptHeaderDiagnosticsProvider.modelNotSuited', "Model '{0}' is not suited for agent mode", modelNode.value),
                severity: MarkerSeverity.Warning,
                ...modelNode.range,
            });
        }
    }
    findModelByName(languageModes, modelName) {
        for (const model of languageModes) {
            const metadata = this.languageModelsService.lookupLanguageModel(model);
            if (metadata && metadata.isUserSelectable !== false && ILanguageModelChatMetadata.asQualifiedName(metadata) === modelName) {
                return metadata;
            }
        }
        return undefined;
    }
    validateTools(tools, modeKind, markers) {
        if (!tools || tools.value === undefined || modeKind === ChatModeKind.Ask || modeKind === ChatModeKind.Edit) {
            return;
        }
        const toolNames = new Set(tools.value);
        if (toolNames.size === 0) {
            return;
        }
        for (const tool of this.languageModelToolsService.getTools()) {
            toolNames.delete(tool.toolReferenceName ?? tool.displayName);
        }
        for (const toolSet of this.languageModelToolsService.toolSets.get()) {
            toolNames.delete(toolSet.referenceName);
        }
        for (const toolName of toolNames) {
            const range = tools.getToolRange(toolName);
            if (range) {
                markers.push({
                    message: localize('promptHeaderDiagnosticsProvider.toolNotFound', "Unknown tool '{0}'", toolName),
                    severity: MarkerSeverity.Warning,
                    ...range,
                });
            }
        }
    }
    /**
     * Returns a string representation of this object.
     */
    toString() {
        return `prompt-header-diagnostics:${this.model.uri.path}`;
    }
};
PromptHeaderDiagnosticsProvider = __decorate([
    __param(1, IPromptsService),
    __param(2, IMarkerService),
    __param(3, ILanguageModelsService),
    __param(4, ILanguageModelToolsService)
], PromptHeaderDiagnosticsProvider);
/**
 * Convert a provided diagnostic object into a marker data object.
 */
function toMarker(diagnostic) {
    if (diagnostic instanceof PromptMetadataWarning) {
        return {
            message: diagnostic.message,
            severity: MarkerSeverity.Warning,
            ...diagnostic.range,
        };
    }
    if (diagnostic instanceof PromptMetadataError) {
        return {
            message: diagnostic.message,
            severity: MarkerSeverity.Error,
            ...diagnostic.range,
        };
    }
    assertNever(diagnostic, `Unknown prompt metadata diagnostic type '${diagnostic}'.`);
}
/**
 * The class that manages creation and disposal of {@link PromptHeaderDiagnosticsProvider}
 * classes for each specific editor text model.
 */
export class PromptHeaderDiagnosticsInstanceManager extends ProviderInstanceManagerBase {
    get InstanceClass() {
        return PromptHeaderDiagnosticsProvider;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvbXB0SGVhZGVyRGlhZ25vc3RpY3NQcm92aWRlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL2FkdmlrYXIvRG9jdW1lbnRzL2FyY2hpdGVjdC9hcmNoMi9BcmNoSURFL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvY29tbW9uL3Byb21wdFN5bnRheC9sYW5ndWFnZVByb3ZpZGVycy9wcm9tcHRIZWFkZXJEaWFnbm9zdGljc1Byb3ZpZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUMvRCxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQztBQUVqRSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDdEUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sK0NBQStDLENBQUM7QUFDbEYsT0FBTyxFQUFFLDJCQUEyQixFQUFrQixNQUFNLGtDQUFrQyxDQUFDO0FBQy9GLE9BQU8sRUFBZSxtQkFBbUIsRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ2pILE9BQU8sRUFBZSxjQUFjLEVBQUUsY0FBYyxFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDbkgsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBR3ZFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUNuRSxPQUFPLEVBQUUsMEJBQTBCLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQztBQUM3RixPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUNoRixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFDcEQsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FB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