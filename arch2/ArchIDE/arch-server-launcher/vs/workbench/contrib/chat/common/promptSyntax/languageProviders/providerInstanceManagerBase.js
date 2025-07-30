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
import { assert } from '../../../../../../base/common/assert.js';
import { assertDefined } from '../../../../../../base/common/types.js';
import { Disposable } from '../../../../../../base/common/lifecycle.js';
import { ObjectCache } from '../utils/objectCache.js';
import { INSTRUCTIONS_LANGUAGE_ID, MODE_LANGUAGE_ID, PROMPT_LANGUAGE_ID } from '../promptTypes.js';
import { IModelService } from '../../../../../../editor/common/services/model.js';
import { PromptsConfig } from '../config/config.js';
import { IEditorService } from '../../../../../services/editor/common/editorService.js';
import { IInstantiationService } from '../../../../../../platform/instantiation/common/instantiation.js';
import { IConfigurationService } from '../../../../../../platform/configuration/common/configuration.js';
/**
 * A generic base class that manages creation and disposal of {@link TInstance}
 * objects for each specific editor object that is used for reusable prompt files.
 */
let ProviderInstanceManagerBase = class ProviderInstanceManagerBase extends Disposable {
    constructor(modelService, editorService, instantiationService, configService) {
        super();
        // cache of managed instances
        this.instances = this._register(new ObjectCache((model) => {
            assert(model.isDisposed() === false, 'Text model must not be disposed.');
            // sanity check - the new TS/JS discrepancies regarding fields initialization
            // logic mean that this can be `undefined` during runtime while defined in TS
            assertDefined(this.InstanceClass, 'Instance class field must be defined.');
            const instance = instantiationService.createInstance(this.InstanceClass, model);
            // this is a sanity check and the contract of the object cache,
            // we must return a non-disposed object from this factory function
            instance.assertNotDisposed('Created instance must not be disposed.');
            return instance;
        }));
        // if the feature is disabled, do not create any providers
        if (PromptsConfig.enabled(configService) === false) {
            return;
        }
        // subscribe to changes of the active editor
        this._register(editorService.onDidActiveEditorChange(() => {
            const { activeTextEditorControl } = editorService;
            if (activeTextEditorControl === undefined) {
                return;
            }
            this.handleNewEditor(activeTextEditorControl);
        }));
        // handle existing visible text editors
        editorService
            .visibleTextEditorControls
            .forEach(this.handleNewEditor.bind(this));
        // subscribe to "language change" events for all models
        this._register(modelService.onModelLanguageChanged((event) => {
            const { model, oldLanguageId } = event;
            // if language is set to `prompt` or `instructions` language, handle that model
            if (isPromptFileModel(model)) {
                this.instances.get(model);
                return;
            }
            // if the language is changed away from `prompt` or `instructions`,
            // remove and dispose provider for this model
            if (isPromptFile(oldLanguageId)) {
                this.instances.remove(model, true);
                return;
            }
        }));
    }
    /**
     * Initialize a new {@link TInstance} for the given editor.
     */
    handleNewEditor(editor) {
        const model = editor.getModel();
        if (model === null) {
            return this;
        }
        if (isPromptFileModel(model) === false) {
            return this;
        }
        // note! calling `get` also creates a provider if it does not exist;
        // 		and the provider is auto-removed when the editor is disposed
        this.instances.get(model);
        return this;
    }
};
ProviderInstanceManagerBase = __decorate([
    __param(0, IModelService),
    __param(1, IEditorService),
    __param(2, IInstantiationService),
    __param(3, IConfigurationService)
], ProviderInstanceManagerBase);
export { ProviderInstanceManagerBase };
/**
 * Check if provided language ID is one of the prompt file languages.
 */
function isPromptFile(languageId) {
    return [
        PROMPT_LANGUAGE_ID,
        INSTRUCTIONS_LANGUAGE_ID,
        MODE_LANGUAGE_ID,
    ].includes(languageId);
}
/**
 * Check if a provided model is used for prompt files.
 */
function isPromptFileModel(model) {
    // we support only `text editors` for now so filter out `diff` ones
    if ('modified' in model || 'model' in model) {
        return false;
    }
    if (model.isDisposed()) {
        return false;
    }
    if (isPromptFile(model.getLanguageId()) === false) {
        return false;
    }
    return true;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvdmlkZXJJbnN0YW5jZU1hbmFnZXJCYXNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvYWR2aWthci9Eb2N1bWVudHMvYXJjaGl0ZWN0L2FyY2gyL0FyY2hJREUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9jb21tb24vcHJvbXB0U3ludGF4L2xhbmd1YWdlUHJvdmlkZXJzL3Byb3ZpZGVySW5zdGFuY2VNYW5hZ2VyQmFzZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUdoRyxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFFakUsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ3ZFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUN4RSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0seUJBQXlCLENBQUM7QUFDdEQsT0FBTyxFQUFFLHdCQUF3QixFQUFFLGdCQUFnQixFQUFFLGtCQUFrQixFQUFFLE1BQU0sbUJBQW1CLENBQUM7QUFDbkcsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBQ2xGLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQztBQUNwRCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sd0RBQXdELENBQUM7QUFFeEYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sa0VBQWtFLENBQUM7QUFDekcsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sa0VBQWtFLENBQUM7QUFjekc7OztHQUdHO0FBQ0ksSUFBZSwyQkFBMkIsR0FBMUMsTUFBZSwyQkFBb0UsU0FBUSxVQUFVO0lBVzNHLFlBQ2dCLFlBQTJCLEVBQzFCLGFBQTZCLEVBQ3RCLG9CQUEyQyxFQUMzQyxhQUFvQztRQUUzRCxLQUFLLEVBQUUsQ0FBQztRQUVSLDZCQUE2QjtRQUM3QixJQUFJ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