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
var TextModelContentsProvider_1;
import { TextModel } from '../../../../../../editor/common/model/textModel.js';
import { IInstantiationService } from '../../../../../../platform/instantiation/common/instantiation.js';
import { objectStreamFromTextModel } from '../codecs/base/utils/objectStreamFromTextModel.js';
import { FilePromptContentProvider } from './filePromptContentsProvider.js';
import { PromptContentsProviderBase } from './promptContentsProviderBase.js';
/**
 * Prompt contents provider for a {@link ITextModel} instance.
 */
let TextModelContentsProvider = TextModelContentsProvider_1 = class TextModelContentsProvider extends PromptContentsProviderBase {
    /**
     * URI component of the prompt associated with this contents provider.
     */
    get uri() {
        return this.model.uri;
    }
    get sourceName() {
        return 'text-model';
    }
    get languageId() {
        return this.options.languageId ?? this.model.getLanguageId();
    }
    constructor(model, options, instantiationService) {
        super(options);
        this.model = model;
        this.instantiationService = instantiationService;
        this._register(this.model.onWillDispose(this.dispose.bind(this)));
        if (options.updateOnChange) {
            this._register(this.model.onDidChangeContent(this.onChangeEmitter.fire.bind(this.onChangeEmitter)));
        }
    }
    /**
     * Creates a stream of binary data from the text model based on the changes
     * listed in the provided event.
     *
     * Note! this method implements a basic logic which does not take into account
     * 		 the `_event` argument for incremental updates. This needs to be improved.
     *
     * @param _event - event that describes the changes in the text model; `'full'` is
     * 				   the special value that means that all contents have changed
     * @param cancellationToken - token that cancels this operation
     */
    async getContentsStream(_event, cancellationToken) {
        return objectStreamFromTextModel(this.model, cancellationToken);
    }
    createNew(promptContentsSource, options) {
        if (promptContentsSource instanceof TextModel) {
            return this.instantiationService.createInstance(TextModelContentsProvider_1, promptContentsSource, options);
        }
        return this.instantiationService.createInstance(FilePromptContentProvider, promptContentsSource.uri, options);
    }
    /**
     * String representation of this object.
     */
    toString() {
        return `text-model-prompt-contents-provider:${this.uri.path}`;
    }
};
TextModelContentsProvider = TextModelContentsProvider_1 = __decorate([
    __param(2, IInstantiationService)
], TextModelContentsProvider);
export { TextModelContentsProvider };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dE1vZGVsQ29udGVudHNQcm92aWRlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL2FkdmlrYXIvRG9jdW1lbnRzL2FyY2hpdGVjdC9hcmNoMi9BcmNoSURFL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvY29tbW9uL3Byb21wdFN5bnRheC9jb250ZW50UHJvdmlkZXJzL3RleHRNb2RlbENvbnRlbnRzUHJvdmlkZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBTWhHLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxvREFBb0QsQ0FBQztBQUUvRSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxrRUFBa0UsQ0FBQztBQUN6RyxPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUM5RixPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUM1RSxPQUFPLEVBQWtDLDBCQUEwQixFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFHN0c7O0dBRUc7QUFDSSxJQUFNLHlCQUF5QixpQ0FBL0IsTUFBTSx5QkFBMEIsU0FBUSwwQkFBcUQ7SUFDbkc7O09BRUc7SUFDSCxJQUFXLEdBQUc7UUFDYixPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDO0lBQ3ZCLENBQUM7SUFFRCxJQUFvQixVQUFVO1FBQzdCLE9BQU8sWUFBWSxDQUFDO0lBQ3JCLENBQUM7SUFFRCxJQUFvQixVQUFVO1FBQzdCLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxVQUFVLElBQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxhQUFhLEVBQUUsQ0FBQztJQUM5RCxDQUFDO0lBRUQsWUFDa0IsS0FBaUIsRUFDbEMsT0FBdUMsRUFDQyxvQkFBMkM7UUFFbkYsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBSkUsVUFBSyxHQUFMLEtBQUssQ0FBWTtRQUVNLHlCQUFvQixHQUFwQixvQkFBb0IsQ0FBdUI7UUFJbkYsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDbEUsSUFBSSxPQUFPLENBQUMsY0FBYyxFQUFFLENBQUM7WUFDNUIsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLGtCQUFrQixDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3JHLENBQUM7SUFDRixDQUFDO0lBRUQ7Ozs7Ozs7Ozs7T0FVRztJQUNnQixLQUFLLENBQUMsaUJBQWlCLENBQ3pDLE1BQTBDLEVBQzFDLGlCQUFxQztRQUVyQyxPQUFPLHlCQUF5QixDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsaUJBQWlCLENBQUMsQ0FBQztJQUNqRSxDQUFDO0lBRWUsU0FBUyxDQUN4QixvQkFBOEMsRUFDOUMsT0FBdUM7UUFFdkMsSUFBSSxvQkFBb0IsWUFBWSxTQUFTLEVBQUUsQ0FBQztZQUMvQyxPQUFPLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxjQUFjLENBQzlDLDJCQUF5QixFQUN6QixvQkFBb0IsRUFDcEIsT0FBTyxDQUNQLENBQUM7UUFDSCxDQUFDO1FBRUQsT0FBTyxJQUFJLENBQUMsb0JBQW9CLENBQUMsY0FBYyxDQUM5Qyx5QkFBeUIsRUFDekIsb0JBQW9CLENBQUMsR0FBRyxFQUN4QixPQUFPLENBQ1AsQ0FBQztJQUNILENBQUM7SUFFRDs7T0FFRztJQUNhLFFBQVE7UUFDdkIsT0FBTyx1Q0FBdUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsQ0FBQztJQUMvRCxDQUFDO0NBQ0QsQ0FBQTtBQXhFWSx5QkFBeUI7SUFtQm5DLFdBQUEscUJBQXFCLENBQUE7R0FuQlgseUJBQXlCLENBd0VyQyJ9