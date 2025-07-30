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
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { Emitter } from '../../../../base/common/event.js';
import { Iterable } from '../../../../base/common/iterator.js';
import { DisposableStore, toDisposable } from '../../../../base/common/lifecycle.js';
import { isFalsyOrWhitespace } from '../../../../base/common/strings.js';
import { localize } from '../../../../nls.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { IExtensionService, isProposedApiEnabled } from '../../../services/extensions/common/extensions.js';
import { ExtensionsRegistry } from '../../../services/extensions/common/extensionsRegistry.js';
export var ChatMessageRole;
(function (ChatMessageRole) {
    ChatMessageRole[ChatMessageRole["System"] = 0] = "System";
    ChatMessageRole[ChatMessageRole["User"] = 1] = "User";
    ChatMessageRole[ChatMessageRole["Assistant"] = 2] = "Assistant";
})(ChatMessageRole || (ChatMessageRole = {}));
export var ToolResultAudience;
(function (ToolResultAudience) {
    ToolResultAudience[ToolResultAudience["Assistant"] = 0] = "Assistant";
    ToolResultAudience[ToolResultAudience["User"] = 1] = "User";
})(ToolResultAudience || (ToolResultAudience = {}));
/**
 * Enum for supported image MIME types.
 */
export var ChatImageMimeType;
(function (ChatImageMimeType) {
    ChatImageMimeType["PNG"] = "image/png";
    ChatImageMimeType["JPEG"] = "image/jpeg";
    ChatImageMimeType["GIF"] = "image/gif";
    ChatImageMimeType["WEBP"] = "image/webp";
    ChatImageMimeType["BMP"] = "image/bmp";
})(ChatImageMimeType || (ChatImageMimeType = {}));
/**
 * Specifies the detail level of the image.
 */
export var ImageDetailLevel;
(function (ImageDetailLevel) {
    ImageDetailLevel["Low"] = "low";
    ImageDetailLevel["High"] = "high";
})(ImageDetailLevel || (ImageDetailLevel = {}));
export var ILanguageModelChatMetadata;
(function (ILanguageModelChatMetadata) {
    function suitableForAgentMode(metadata) {
        const supportsToolsAgent = typeof metadata.capabilities?.agentMode === 'undefined' || metadata.capabilities.agentMode;
        return supportsToolsAgent && !!metadata.capabilities?.toolCalling;
    }
    ILanguageModelChatMetadata.suitableForAgentMode = suitableForAgentMode;
    function asQualifiedName(metadata) {
        if (metadata.modelPickerCategory === undefined) {
            // in the others category
            return `${metadata.name} (${metadata.family})`;
        }
        return metadata.name;
    }
    ILanguageModelChatMetadata.asQualifiedName = asQualifiedName;
})(ILanguageModelChatMetadata || (ILanguageModelChatMetadata = {}));
export const ILanguageModelsService = createDecorator('ILanguageModelsService');
const languageModelType = {
    type: 'object',
    properties: {
        vendor: {
            type: 'string',
            description: localize('vscode.extension.contributes.languageModels.vendor', "A globally unique vendor of language models.")
        },
        displayName: {
            type: 'string',
            description: localize('vscode.extension.contributes.languageModels.displayName', "The display name of the language model vendor.")
        },
        managementCommand: {
            type: 'string',
            description: localize('vscode.extension.contributes.languageModels.managementCommand', "A command to manage the language model vendor, e.g. 'Manage Copilot models'. This is used in the chat model picker. If not provided, a gear icon is not rendered during vendor selection.")
        }
    }
};
export const languageModelExtensionPoint = ExtensionsRegistry.registerExtensionPoint({
    extensionPoint: 'languageModels',
    jsonSchema: {
        description: localize('vscode.extension.contributes.languageModels', "Contribute language models of a specific vendor."),
        oneOf: [
            languageModelType,
            {
                type: 'array',
                items: languageModelType
            }
        ]
    },
    activationEventsGenerator: (contribs, result) => {
        for (const contrib of contribs) {
            result.push(`onLanguageModelChat:${contrib.vendor}`);
        }
    }
});
let LanguageModelsService = class LanguageModelsService {
    constructor(_extensionService, _logService, _storageService) {
        this._extensionService = _extensionService;
        this._logService = _logService;
        this._storageService = _storageService;
        this._store = new DisposableStore();
        this._providers = new Map();
        this._modelCache = new Map();
        this._vendors = new Map();
        this._modelPickerUserPreferences = {}; // We use a record instead of a map for better serialization when storing
        this._onLanguageModelChange = this._store.add(new Emitter());
        this.onDidChangeLanguageModels = this._onLanguageModelChange.event;
        this._modelPickerUserPreferences = this._storageService.getObject('chatModelPickerPreferences', 0 /* StorageScope.PROFILE */, this._modelPickerUserPreferences);
        this._store.add(languageModelExtensionPoint.setHandler((extensions) => {
            this._vendors.clear();
            for (const extension of extensions) {
                if (!isProposedApiEnabled(extension.description, 'chatProvider')) {
                    extension.collector.error(localize('vscode.extension.contributes.languageModels.chatProviderRequired', "This contribution point requires the 'chatProvider' proposal."));
                    continue;
                }
                for (const item of Iterable.wrap(extension.value)) {
                    if (this._vendors.has(item.vendor)) {
                        extension.collector.error(localize('vscode.extension.contributes.languageModels.vendorAlreadyRegistered', "The vendor '{0}' is already registered and cannot be registered twice", item.vendor));
                        continue;
                    }
                    if (isFalsyOrWhitespace(item.vendor)) {
                        extension.collector.error(localize('vscode.extension.contributes.languageModels.emptyVendor', "The vendor field cannot be empty."));
                        continue;
                    }
                    if (item.vendor.trim() !== item.vendor) {
                        extension.collector.error(localize('vscode.extension.contributes.languageModels.whitespaceVendor', "The vendor field cannot start or end with whitespace."));
                        continue;
                    }
                    this._vendors.set(item.vendor, item);
                }
            }
            for (const [vendor, _] of this._providers) {
                if (!this._vendors.has(vendor)) {
                    this._providers.delete(vendor);
                }
            }
        }));
    }
    dispose() {
        this._store.dispose();
        this._providers.clear();
    }
    updateModelPickerPreference(modelIdentifier, showInModelPicker) {
        const model = this._modelCache.get(modelIdentifier);
        if (!model) {
            this._logService.warn(`[LM] Cannot update model picker preference for unknown model ${modelIdentifier}`);
            return;
        }
        delete this._modelPickerUserPreferences[modelIdentifier];
        if (model.isUserSelectable !== showInModelPicker) {
            this._modelPickerUserPreferences[modelIdentifier] = showInModelPicker;
            this._storageService.store('chatModelPickerPreferences', this._modelPickerUserPreferences, 0 /* StorageScope.PROFILE */, 0 /* StorageTarget.USER */);
            this._onLanguageModelChange.fire();
            this._logService.trace(`[LM] Updated model picker preference for ${modelIdentifier} to ${showInModelPicker}`);
        }
    }
    getVendors() {
        return Array.from(this._vendors.values());
    }
    getLanguageModelIds() {
        return Array.from(this._modelCache.keys());
    }
    lookupLanguageModel(modelIdentifier) {
        const model = this._modelCache.get(modelIdentifier);
        if (model && this._modelPickerUserPreferences[modelIdentifier] !== undefined) {
            return { ...model, isUserSelectable: this._modelPickerUserPreferences[modelIdentifier] };
        }
        return model;
    }
    _clearModelCache(vendors) {
        if (typeof vendors === 'string') {
            vendors = [vendors];
        }
        for (const vendor of vendors) {
            for (const [id, model] of this._modelCache.entries()) {
                if (model.vendor === vendor) {
                    this._modelCache.delete(id);
                }
            }
        }
    }
    async resolveLanguageModels(vendors, silent) {
        if (typeof vendors === 'string') {
            vendors = [vendors];
        }
        this._clearModelCache(vendors);
        for (const vendor of vendors) {
            const provider = this._providers.get(vendor);
            if (!provider) {
                this._logService.warn(`[LM] No provider registered for vendor ${vendor}`);
                continue;
            }
            try {
                const modelsAndIdentifiers = await provider.prepareLanguageModelChat({ silent }, CancellationToken.None);
                for (const modelAndIdentifier of modelsAndIdentifiers) {
                    if (this._modelCache.has(modelAndIdentifier.identifier)) {
                        this._logService.warn(`[LM] Model ${modelAndIdentifier.identifier} is already registered. Skipping.`);
                        continue;
                    }
                    this._modelCache.set(modelAndIdentifier.identifier, modelAndIdentifier.metadata);
                }
                this._logService.trace(`[LM] Resolved language models for vendor ${vendor}`, modelsAndIdentifiers);
            }
            catch (error) {
                this._logService.error(`[LM] Error resolving language models for vendor ${vendor}:`, error);
            }
        }
        this._onLanguageModelChange.fire();
    }
    async selectLanguageModels(selector, allowPromptingUser) {
        if (selector.vendor) {
            // selective activation
            await this._extensionService.activateByEvent(`onLanguageModelChat:${selector.vendor}}`);
            await this.resolveLanguageModels([selector.vendor], !allowPromptingUser);
        }
        else {
            // activate all extensions that do language models
            const allVendors = Array.from(this._vendors.keys());
            const all = allVendors.map(vendor => this._extensionService.activateByEvent(`onLanguageModelChat:${vendor}`));
            await Promise.all(all);
            await this.resolveLanguageModels(allVendors, !allowPromptingUser);
        }
        const result = [];
        for (const [internalModelIdentifier, model] of this._modelCache) {
            if ((selector.vendor === undefined || model.vendor === selector.vendor)
                && (selector.family === undefined || model.family === selector.family)
                && (selector.version === undefined || model.version === selector.version)
                && (selector.id === undefined || model.id === selector.id)) {
                result.push(internalModelIdentifier);
            }
        }
        this._logService.trace('[LM] selected language models', selector, result);
        return result;
    }
    registerLanguageModelProvider(vendor, provider) {
        this._logService.trace('[LM] registering language model provider', vendor, provider);
        if (!this._vendors.has(vendor)) {
            throw new Error(`Chat model provider uses UNKNOWN vendor ${vendor}.`);
        }
        if (this._providers.has(vendor)) {
            throw new Error(`Chat model provider for vendor ${vendor} is already registered.`);
        }
        this._providers.set(vendor, provider);
        // TODO @lramos15 - Smarter restore logic. Don't activate all providers, but only those which were known to need restoring
        this.resolveLanguageModels(vendor, true).then(() => {
            this._onLanguageModelChange.fire();
        });
        return toDisposable(() => {
            this._logService.trace('[LM] UNregistered language model provider', vendor);
            this._clearModelCache(vendor);
            this._providers.delete(vendor);
        });
    }
    async sendChatRequest(modelId, from, messages, options, token) {
        const provider = this._providers.get(this._modelCache.get(modelId)?.vendor || '');
        if (!provider) {
            throw new Error(`Chat provider for model ${modelId} is not registered.`);
        }
        return provider.sendChatRequest(modelId, messages, from, options, token);
    }
    computeTokenLength(modelId, message, token) {
        const model = this._modelCache.get(modelId);
        if (!model) {
            throw new Error(`Chat model ${modelId} could not be found.`);
        }
        const provider = this._providers.get(model.vendor);
        if (!provider) {
            throw new Error(`Chat provider for model ${modelId} is not registered.`);
        }
        return provider.provideTokenCount(modelId, message, token);
    }
};
LanguageModelsService = __decorate([
    __param(0, IExtensionService),
    __param(1, ILogService),
    __param(2, IStorageService)
], LanguageModelsService);
export { LanguageModelsService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGFuZ3VhZ2VNb2RlbHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9hZHZpa2FyL0RvY3VtZW50cy9hcmNoaXRlY3QvYXJjaDIvQXJjaElERS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2NvbW1vbi9sYW5ndWFnZU1vZGVscy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUdoRyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUM1RSxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0sa0NBQWtDLENBQUM7QUFDbEUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBRS9ELE9BQU8sRUFBRSxlQUFlLEVBQWUsWUFBWSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDbEcsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFFekUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBRTlDLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUM3RixPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDckUsT0FBTyxFQUFFLGVBQWUsRUFBK0IsTUFBTSxnREFBZ0QsQ0FBQztBQUM5RyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUM1RyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSwyREFBMkQsQ0FBQztBQUUvRixNQUFNLENBQU4sSUFBa0IsZUFJakI7QUFKRCxXQUFrQixlQUFlO0lBQ2hDLHlEQUFNLENBQUE7SUFDTixxREFBSSxDQUFBO0lBQ0osK0RBQVMsQ0FBQTtBQUNWLENBQUMsRUFKaUIsZUFBZSxLQUFmLGVBQWUsUUFJaEM7QUFFRCxNQUFNLENBQU4sSUFBWSxrQkFHWDtBQUhELFdBQVksa0JBQWtCO0lBQzdCLHFFQUFhLENBQUE7SUFDYiwyREFBUSxDQUFBO0FBQ1QsQ0FBQyxFQUhXLGtCQUFrQixLQUFsQixrQkFBa0IsUUFHN0I7QUFnQ0Q7O0dBRUc7QUFDSCxNQUFNLENBQU4sSUFBWSxpQkFNWDtBQU5ELFdBQVksaUJBQWlCO0lBQzVCLHNDQUFpQixDQUFBO0lBQ2pCLHdDQUFtQixDQUFBO0lBQ25CLHNDQUFpQixDQUFBO0lBQ2pCLHdDQUFtQixDQUFBO0lBQ25CLHNDQUFpQixDQUFBO0FBQ2xCLENBQUMsRUFOVyxpQkFBaUIsS0FBakIsaUJBQWlCLFFBTTVCO0FBRUQ7O0dBRUc7QUFDSCxNQUFNLENBQU4sSUFBWSxnQkFHWDtBQUhELFdBQVksZ0JBQWdCO0lBQzNCLCtCQUFXLENBQUE7SUFDWCxpQ0FBYSxDQUFBO0FBQ2QsQ0FBQyxFQUhXLGdCQUFnQixLQUFoQixnQkFBZ0IsUUFHM0I7QUF1RkQsTUFBTSxLQUFXLDBCQUEwQixDQWExQztBQWJELFdBQWlCLDBCQUEwQjtJQUMxQyxTQUFnQixvQkFBb0IsQ0FBQyxRQUFvQztRQUN4RSxNQUFNLGtCQUFrQixHQUFHLE9BQU8sUUFBUSxDQUFDLFlBQVksRUFBRSxTQUFTLEtBQUssV0FBVyxJQUFJLFFBQVEsQ0FBQyxZQUFZLENBQUMsU0FBUyxDQUFDO1FBQ3RILE9BQU8sa0JBQWtCLElBQUksQ0FBQyxDQUFDLFFBQVEsQ0FBQyxZQUFZLEVBQUUsV0FBVyxDQUFDO0lBQ25FLENBQUM7SUFIZSwrQ0FBb0IsdUJBR25DLENBQUE7SUFFRCxTQUFnQixlQUFlLENBQUMsUUFBb0M7UUFDbkUsSUFBSSxRQUFRLENBQUMsbUJBQW1CLEtBQUssU0FBUyxFQUFFLENBQUM7WUFDaEQseUJBQXlCO1lBQ3pCLE9BQU8sR0FBRyxRQUFRLENBQUMsSUFBSSxLQUFLLFFBQVEsQ0FBQyxNQUFNLEdBQUcsQ0FBQztRQUNoRCxDQUFDO1FBQ0QsT0FBTyxRQUFRLENBQUMsSUFBSSxDQUFDO0lBQ3RCLENBQUM7SUFOZSwwQ0FBZSxrQkFNOUIsQ0FBQTtBQUNGLENBQUMsRUFiZ0IsMEJBQTBCLEtBQTFCLDBCQUEwQixRQWExQztBQThCRCxNQUFNLENBQUMsTUFBTSxzQkFBc0IsR0FBRyxlQUFlLENBQXlCLHdCQUF3QixDQUFDLENBQUM7QUFvQ3hHLE1BQU0saUJBQWlCLEdBQWdCO0lBQ3RDLElBQUksRUFBRSxRQUFRO0lBQ2QsVUFBVSxFQUFFO1FBQ1gsTUFBTSxFQUFFO1lBQ1AsSUFBSSxFQUFFLFFBQVE7WUFDZCxXQUFXLEVBQUUsUUFBUSxDQUFDLG9EQUFvRCxFQUFFLDhDQUE4QyxDQUFDO1NBQzNIO1FBQ0QsV0FBVyxFQUFFO1lBQ1osSUFBSSxFQUFFLFFBQVE7WUFDZCxXQUFXLEVBQUUsUUFBUSxDQUFDLHlEQUF5RCxFQUFFLGdEQUFnRCxDQUFDO1NBQ2xJO1FBQ0QsaUJBQWlCLEVBQUU7WUFDbEIsSUFBSSxFQUFFLFFBQVE7WUFDZCxXQUFXLEVBQUUsUUFBUSxDQUFDLCtEQUErRCxFQUFFLDJMQUEyTCxDQUFDO1NBQ25SO0tBQ0Q7Q0FDRCxDQUFDO0FBUUYsTUFBTSxDQUFDLE1BQU0sMkJBQTJCLEdBQUcsa0JBQWtCLENBQUMsc0JBQXNCLENBQTREO0lBQy9JLGNBQWMsRUFBRSxnQkFBZ0I7SUFDaEMsVUFBVSxFQUFFO1FBQ1gsV0FBVyxFQUFFLFFBQVEsQ0FBQyw2Q0FBNkMsRUFBRSxrREFBa0QsQ0FBQztRQUN4SCxLQUFLLEVBQUU7WUFDTixpQkFBaUI7WUFDakI7Z0JBQ0MsSUFBSSxFQUFFLE9BQU87Z0JBQ2IsS0FBSyxFQUFFLGlCQUFpQjthQUN4QjtTQUNEO0tBQ0Q7SUFDRCx5QkFBeUIsRUFBRSxDQUFDLFFBQXNDLEVBQUUsTUFBb0MsRUFBRSxFQUFFO1FBQzNHLEtBQUssTUFBTSxPQUFPLElBQUksUUFBUSxFQUFFLENBQUM7WUFDaEMsTUFBTSxDQUFDLElBQUksQ0FBQyx1QkFBdUIsT0FBTyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUM7UUFDdEQsQ0FBQztJQUNGLENBQUM7Q0FDRCxDQUFDLENBQUM7QUFFSSxJQUFNLHFCQUFxQixHQUEzQixNQUFNLHFCQUFxQjtJQWNqQyxZQUNvQixpQkFBcUQsRUFDM0QsV0FBeUMsRUFDckMsZUFBaUQ7UUFGOUIsc0JBQWlCLEdBQWpCLGlCQUFpQixDQUFtQjtRQUMxQyxnQkFBVyxHQUFYLFdBQVcsQ0FBYTtRQUNwQixvQkFBZSxHQUFmLGVBQWUsQ0FBaUI7UUFibEQsV0FBTSxHQUFHLElBQUksZUFBZSxFQUFFLENBQUM7UUFFL0IsZUFBVSxHQUFHLElBQUksR0FBRyxFQUFzQyxDQUFDO1FBQzNELGdCQUFXLEdBQUcsSUFBSSxHQUFHLEVBQXNDLENBQUM7UUFDNUQsYUFBUSxHQUFHLElBQUksR0FBRyxFQUFzQyxDQUFDO1FBQ3pELGdDQUEyQixHQUE0QixFQUFFLENBQUMsQ0FBQyx5RUFBeUU7UUFFcEksMkJBQXNCLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsSUFBSSxPQUFPLEVBQVEsQ0FBQyxDQUFDO1FBQ3RFLDhCQUF5QixHQUFnQixJQUFJLENBQUMsc0JBQXNCLENBQUMsS0FBSyxDQUFDO1FBUW5GLElBQUksQ0FBQywyQkFBMkIsR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDLFNBQVMsQ0FBMEIsNEJBQTRCLGdDQUF3QixJQUFJLENBQUMsMkJBQTJCLENBQUMsQ0FBQztRQUVqTCxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQywyQkFBMkIsQ0FBQyxVQUFVLENBQUMsQ0FBQyxVQUFVLEVBQUUsRUFBRTtZQUVyRSxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssRUFBRSxDQUFDO1lBRXRCLEtBQUssTUFBTSxTQUFTLElBQUksVUFBVSxFQUFFLENBQUM7Z0JBRXBDLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxTQUFTLENBQUMsV0FBVyxFQUFFLGNBQWMsQ0FBQyxFQUFFLENBQUM7b0JBQ2xFLFNBQVMsQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxrRUFBa0UsRUFBRSwrREFBK0QsQ0FBQyxDQUFDLENBQUM7b0JBQ3pLLFNBQVM7Z0JBQ1YsQ0FBQztnQkFFRCxLQUFLLE1BQU0sSUFBSSxJQUFJLFFBQVEsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUM7b0JBQ25ELElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUM7d0JBQ3BDLFNBQVMsQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxxRUFBcUUsRUFBRSx1RUFBdUUsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQzt3QkFDak0sU0FBUztvQkFDVixDQUFDO29CQUNELElBQUksbUJBQW1CLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUM7d0JBQ3RDLFNBQVMsQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyx5REFBeUQsRUFBRSxtQ0FBbUMsQ0FBQyxDQUFDLENBQUM7d0JBQ3BJLFNBQVM7b0JBQ1YsQ0FBQztvQkFDRCxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLEtBQUssSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO3dCQUN4QyxTQUFTLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsOERBQThELEVBQUUsdURBQXVELENBQUMsQ0FBQyxDQUFDO3dCQUM3SixTQUFTO29CQUNWLENBQUM7b0JBQ0QsSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsQ0FBQztnQkFDdEMsQ0FBQztZQUNGLENBQUM7WUFDRCxLQUFLLE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLElBQUksSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDO2dCQUMzQyxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQztvQkFDaEMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUM7Z0JBQ2hDLENBQUM7WUFDRixDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNMLENBQUM7SUFFRCxPQUFPO1FBQ04sSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUN0QixJQUFJLENBQUMsVUFBVSxDQUFDLEtBQUssRUFBRSxDQUFDO0lBQ3pCLENBQUM7SUFFRCwyQkFBMkIsQ0FBQyxlQUF1QixFQUFFLGlCQUEwQjtRQUM5RSxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxlQUFlLENBQUMsQ0FBQztRQUNwRCxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7WUFDWixJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxnRUFBZ0UsZUFBZSxFQUFFLENBQUMsQ0FBQztZQUN6RyxPQUFPO1FBQ1IsQ0FBQztRQUNELE9BQU8sSUFBSSxDQUFDLDJCQUEyQixDQUFDLGVBQWUsQ0FBQyxDQUFDO1FBQ3pELElBQUksS0FBSyxDQUFDLGdCQUFnQixLQUFLLGlCQUFpQixFQUFFLENBQUM7WUFDbEQsSUFBSSxDQUFDLDJCQUEyQixDQUFDLGVBQWUsQ0FBQyxHQUFHLGlCQUFpQixDQUFDO1lBQ3RFLElBQUksQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFDLDRCQUE0QixFQUFFLElBQUksQ0FBQywyQkFBMkIsMkRBQTJDLENBQUM7WUFDckksSUFBSSxDQUFDLHNCQUFzQixDQUFDLElBQUksRUFBRSxDQUFDO1lBQ25DLElBQUksQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLDRDQUE0QyxlQUFlLE9BQU8saUJBQWlCLEVBQUUsQ0FBQyxDQUFDO1FBQy9HLENBQUM7SUFDRixDQUFDO0lBRUQsVUFBVTtRQUNULE9BQU8sS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUM7SUFDM0MsQ0FBQztJQUVELG1CQUFtQjtRQUNsQixPQUFPLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDO0lBQzVDLENBQUM7SUFFRCxtQkFBbUIsQ0FBQyxlQUF1QjtRQUMxQyxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxlQUFlLENBQUMsQ0FBQztRQUNwRCxJQUFJLEtBQUssSUFBSSxJQUFJLENBQUMsMkJBQTJCLENBQUMsZUFBZSxDQUFDLEtBQUssU0FBUyxFQUFFLENBQUM7WUFDOUUsT0FBTyxFQUFFLEdBQUcsS0FBSyxFQUFFLGdCQUFnQixFQUFFLElBQUksQ0FBQywyQkFBMkIsQ0FBQyxlQUFlLENBQUMsRUFBRSxDQUFDO1FBQzFGLENBQUM7UUFDRCxPQUFPLEtBQUssQ0FBQztJQUNkLENBQUM7SUFFTyxnQkFBZ0IsQ0FBQyxPQUEwQjtRQUNsRCxJQUFJLE9BQU8sT0FBTyxLQUFLLFFBQVEsRUFBRSxDQUFDO1lBQ2pDLE9BQU8sR0FBRyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQ3JCLENBQUM7UUFDRCxLQUFLLE1BQU0sTUFBTSxJQUFJLE9BQU8sRUFBRSxDQUFDO1lBQzlCLEtBQUssTUFBTSxDQUFDLEVBQUUsRUFBRSxLQUFLLENBQUMsSUFBSSxJQUFJLENBQUMsV0FBVyxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUM7Z0JBQ3RELElBQUksS0FBSyxDQUFDLE1BQU0sS0FBSyxNQUFNLEVBQUUsQ0FBQztvQkFDN0IsSUFBSSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUM7Z0JBQzdCLENBQUM7WUFDRixDQUFDO1FBQ0YsQ0FBQztJQUNGLENBQUM7SUFFRCxLQUFLLENBQUMscUJBQXFCLENBQUMsT0FBMEIsRUFBRSxNQUFlO1FBQ3RFLElBQUksT0FBTyxPQUFPLEtBQUssUUFBUSxFQUFFLENBQUM7WUFDakMsT0FBTyxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDckIsQ0FBQztRQUNELElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUMvQixLQUFLLE1BQU0sTUFBTSxJQUFJLE9BQU8sRUFBRSxDQUFDO1lBQzlCLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQzdDLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztnQkFDZixJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQywwQ0FBMEMsTUFBTSxFQUFFLENBQUMsQ0FBQztnQkFDMUUsU0FBUztZQUNWLENBQUM7WUFDRCxJQUFJLENBQUM7Z0JBQ0osTUFBTSxvQkFBb0IsR0FBRyxNQUFNLFFBQVEsQ0FBQyx3QkFBd0IsQ0FBQyxFQUFFLE1BQU0sRUFBRSxFQUFFLGlCQUFpQixDQUFDLElBQUksQ0FBQyxDQUFDO2dCQUN6RyxLQUFLLE1BQU0sa0JBQWtCLElBQUksb0JBQW9CLEVBQUUsQ0FBQztvQkFDdkQsSUFBSSxJQUFJLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDO3dCQUN6RCxJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxjQUFjLGtCQUFrQixDQUFDLFVBQVUsbUNBQW1DLENBQUMsQ0FBQzt3QkFDdEcsU0FBUztvQkFDVixDQUFDO29CQUNELElBQUksQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLGtCQUFrQixDQUFDLFVBQVUsRUFBRSxrQkFBa0IsQ0FBQyxRQUFRLENBQUMsQ0FBQztnQkFDbEYsQ0FBQztnQkFDRCxJQUFJLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyw0Q0FBNEMsTUFBTSxFQUFFLEVBQUUsb0JBQW9CLENBQUMsQ0FBQztZQUNwRyxDQUFDO1lBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztnQkFDaEIsSUFBSSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsbURBQW1ELE1BQU0sR0FBRyxFQUFFLEtBQUssQ0FBQyxDQUFDO1lBQzdGLENBQUM7UUFDRixDQUFDO1FBQ0QsSUFBSSxDQUFDLHNCQUFzQixDQUFDLElBQUksRUFBRSxDQUFDO0lBQ3BDLENBQUM7SUFFRCxLQUFLLENBQUMsb0JBQW9CLENBQUMsUUFBb0MsRUFBRSxrQkFBNEI7UUFFNUYsSUFBSSxRQUFRLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDckIsdUJBQXVCO1lBQ3ZCLE1BQU0sSUFBSSxDQUFDLGlCQUFpQixDQUFDLGVBQWUsQ0FBQyx1QkFBdUIsUUFBUSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUM7WUFDeEYsTUFBTSxJQUFJLENBQUMscUJBQXFCLENBQUMsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO1FBQzFFLENBQUM7YUFBTSxDQUFDO1lBQ1Asa0RBQWtEO1lBQ2xELE1BQU0sVUFBVSxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDO1lBQ3BELE1BQU0sR0FBRyxHQUFHLFVBQVUsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsZUFBZSxDQUFDLHVCQUF1QixNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDOUcsTUFBTSxPQUFPLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQ3ZCLE1BQU0sSUFBSSxDQUFDLHFCQUFxQixDQUFDLFVBQVUsRUFBRSxDQUFDLGtCQUFrQixDQUFDLENBQUM7UUFDbkUsQ0FBQztRQUVELE1BQU0sTUFBTSxHQUFhLEVBQUUsQ0FBQztRQUU1QixLQUFLLE1BQU0sQ0FBQyx1QkFBdUIsRUFBRSxLQUFLLENBQUMsSUFBSSxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUM7WUFDakUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLEtBQUssU0FBUyxJQUFJLEtBQUssQ0FBQyxNQUFNLEtBQUssUUFBUSxDQUFDLE1BQU0sQ0FBQzttQkFDbkUsQ0FBQyxRQUFRLENBQUMsTUFBTSxLQUFLLFNBQVMsSUFBSSxLQUFLLENBQUMsTUFBTSxLQUFLLFFBQVEsQ0FBQyxNQUFNLENBQUM7bUJBQ25FLENBQUMsUUFBUSxDQUFDLE9BQU8sS0FBSyxTQUFTLElBQUksS0FBSyxDQUFDLE9BQU8sS0FBSyxRQUFRLENBQUMsT0FBTyxDQUFDO21CQUN0RSxDQUFDLFFBQVEsQ0FBQyxFQUFFLEtBQUssU0FBUyxJQUFJLEtBQUssQ0FBQyxFQUFFLEtBQUssUUFBUSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUM7Z0JBQzdELE1BQU0sQ0FBQyxJQUFJLENBQUMsdUJBQXVCLENBQUMsQ0FBQztZQUN0QyxDQUFDO1FBQ0YsQ0FBQztRQUVELElBQUksQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLCtCQUErQixFQUFFLFFBQVEsRUFBRSxNQUFNLENBQUMsQ0FBQztRQUUxRSxPQUFPLE1BQU0sQ0FBQztJQUNmLENBQUM7SUFFRCw2QkFBNkIsQ0FBQyxNQUFjLEVBQUUsUUFBb0M7UUFDakYsSUFBSSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsMENBQTBDLEVBQUUsTUFBTSxFQUFFLFFBQVEsQ0FBQyxDQUFDO1FBRXJGLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDO1lBQ2hDLE1BQU0sSUFBSSxLQUFLLENBQUMsMkNBQTJDLE1BQU0sR0FBRyxDQUFDLENBQUM7UUFDdkUsQ0FBQztRQUNELElBQUksSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQztZQUNqQyxNQUFNLElBQUksS0FBSyxDQUFDLGtDQUFrQyxNQUFNLHlCQUF5QixDQUFDLENBQUM7UUFDcEYsQ0FBQztRQUVELElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLE1BQU0sRUFBRSxRQUFRLENBQUMsQ0FBQztRQUV0QywwSEFBMEg7UUFDMUgsSUFBSSxDQUFDLHFCQUFxQixDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFO1lBQ2xELElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxJQUFJLEVBQUUsQ0FBQztRQUNwQyxDQUFDLENBQUMsQ0FBQztRQUVILE9BQU8sWUFBWSxDQUFDLEdBQUcsRUFBRTtZQUN4QixJQUFJLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQywyQ0FBMkMsRUFBRSxNQUFNLENBQUMsQ0FBQztZQUM1RSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDOUIsSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDaEMsQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDO0lBRUQsS0FBSyxDQUFDLGVBQWUsQ0FBQyxPQUFlLEVBQUUsSUFBeUIsRUFBRSxRQUF3QixFQUFFLE9BQWdDLEVBQUUsS0FBd0I7UUFDckosTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLEVBQUUsTUFBTSxJQUFJLEVBQUUsQ0FBQyxDQUFDO1FBQ2xGLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUNmLE1BQU0sSUFBSSxLQUFLLENBQUMsMkJBQTJCLE9BQU8scUJBQXFCLENBQUMsQ0FBQztRQUMxRSxDQUFDO1FBQ0QsT0FBTyxRQUFRLENBQUMsZUFBZSxDQUFDLE9BQU8sRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBRSxLQUFLLENBQUMsQ0FBQztJQUMxRSxDQUFDO0lBRUQsa0JBQWtCLENBQUMsT0FBZSxFQUFFLE9BQThCLEVBQUUsS0FBd0I7UUFDM0YsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDNUMsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO1lBQ1osTUFBTSxJQUFJLEtBQUssQ0FBQyxjQUFjLE9BQU8sc0JBQXNCLENBQUMsQ0FBQztRQUM5RCxDQUFDO1FBQ0QsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ25ELElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUNmLE1BQU0sSUFBSSxLQUFLLENBQUMsMkJBQTJCLE9BQU8scUJBQXFCLENBQUMsQ0FBQztRQUMxRSxDQUFDO1FBQ0QsT0FBTyxRQUFRLENBQUMsaUJBQWlCLENBQUMsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLENBQUMsQ0FBQztJQUM1RCxDQUFDO0NBQ0QsQ0FBQTtBQS9NWSxxQkFBcUI7SUFlL0IsV0FBQSxpQkFBaUIsQ0FBQTtJQUNqQixXQUFBLFdBQVcsQ0FBQTtJQUNYLFdBQUEsZUFBZSxDQUFBO0dBakJMLHFCQUFxQixDQStNakMifQ==