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
import { IPromptsService } from '../../service/promptsService.js';
import { ProviderInstanceBase } from '../providerInstanceBase.js';
import { FrontMatterDecoration } from './decorations/frontMatterDecoration.js';
import { toDisposable } from '../../../../../../../base/common/lifecycle.js';
import { ProviderInstanceManagerBase } from '../providerInstanceManagerBase.js';
import { registerThemingParticipant } from '../../../../../../../platform/theme/common/themeService.js';
import { ReactiveDecorationBase } from './decorations/utils/reactiveDecorationBase.js';
/**
 * List of all supported decorations.
 */
const SUPPORTED_DECORATIONS = Object.freeze([
    FrontMatterDecoration,
]);
/**
 * Prompt syntax decorations provider for text models.
 */
let PromptDecorator = class PromptDecorator extends ProviderInstanceBase {
    constructor(model, promptsService) {
        super(model, promptsService);
        /**
         * Currently active decorations.
         */
        this.decorations = [];
        this.watchCursorPosition();
    }
    async onPromptSettled(_error) {
        // by the time the promise above completes, either this object
        // or the text model might be already has been disposed
        if (this.isDisposed || this.model.isDisposed()) {
            return;
        }
        this.addDecorations();
        return;
    }
    /**
     * Get the current cursor position inside an active editor.
     * Note! Currently not implemented because the provider is disabled, and
     *       we need to do some refactoring to get accurate cursor position.
     */
    get cursorPosition() {
        if (this.model.isDisposed()) {
            return null;
        }
        return null;
    }
    /**
     * Watch editor cursor position and update reactive decorations accordingly.
     */
    watchCursorPosition() {
        const interval = setInterval(() => {
            const { cursorPosition } = this;
            const changedDecorations = [];
            for (const decoration of this.decorations) {
                if ((decoration instanceof ReactiveDecorationBase) === false) {
                    continue;
                }
                if (decoration.setCursorPosition(cursorPosition) === true) {
                    changedDecorations.push(decoration);
                }
            }
            if (changedDecorations.length === 0) {
                return;
            }
            this.changeModelDecorations(changedDecorations);
        }, 25);
        this._register(toDisposable(() => {
            clearInterval(interval);
        }));
        return this;
    }
    /**
     * Update existing decorations.
     */
    changeModelDecorations(decorations) {
        this.model.changeDecorations((accessor) => {
            for (const decoration of decorations) {
                decoration.change(accessor);
            }
        });
        return this;
    }
    /**
     * Add decorations for all prompt tokens.
     */
    addDecorations() {
        this.model.changeDecorations((accessor) => {
            const { tokens } = this.parser;
            // remove all existing decorations
            for (const decoration of this.decorations.splice(0)) {
                decoration.remove(accessor);
            }
            // then add new decorations based on the current tokens
            for (const token of tokens) {
                for (const Decoration of SUPPORTED_DECORATIONS) {
                    if (Decoration.handles(token) === false) {
                        continue;
                    }
                    this.decorations.push(new Decoration(accessor, token));
                    break;
                }
            }
        });
        return this;
    }
    /**
     * Remove all existing decorations.
     */
    removeAllDecorations() {
        if (this.decorations.length === 0) {
            return this;
        }
        this.model.changeDecorations((accessor) => {
            for (const decoration of this.decorations.splice(0)) {
                decoration.remove(accessor);
            }
        });
        return this;
    }
    dispose() {
        if (this.isDisposed) {
            return;
        }
        this.removeAllDecorations();
        super.dispose();
    }
    /**
     * Returns a string representation of this object.
     */
    toString() {
        return `text-model-prompt-decorator:${this.model.uri.path}`;
    }
};
PromptDecorator = __decorate([
    __param(1, IPromptsService)
], PromptDecorator);
export { PromptDecorator };
/**
 * Register CSS styles of the supported decorations.
 */
registerThemingParticipant((_theme, collector) => {
    for (const Decoration of SUPPORTED_DECORATIONS) {
        for (const [className, styles] of Object.entries(Decoration.cssStyles)) {
            collector.addRule(`.monaco-editor ${className} { ${styles.join(' ')} }`);
        }
    }
});
/**
 * Provider for prompt syntax decorators on text models.
 */
export class PromptDecorationsProviderInstanceManager extends ProviderInstanceManagerBase {
    get InstanceClass() {
        return PromptDecorator;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvbXB0RGVjb3JhdGlvbnNQcm92aWRlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL2FkdmlrYXIvRG9jdW1lbnRzL2FyY2hpdGVjdC9hcmNoMi9BcmNoSURFL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvY29tbW9uL3Byb21wdFN5bnRheC9sYW5ndWFnZVByb3ZpZGVycy9kZWNvcmF0aW9uc1Byb3ZpZGVyL3Byb21wdERlY29yYXRpb25zUHJvdmlkZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDRCQUE0QixDQUFDO0FBRWxFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQy9FLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQztBQUc3RSxPQUFPLEVBQUUsMkJBQTJCLEVBQWtCLE1BQU0sbUNBQW1DLENBQUM7QUFDaEcsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFFeEcsT0FBTyxFQUFFLHNCQUFzQixFQUFxQixNQUFNLCtDQUErQyxDQUFDO0FBUTFHOztHQUVHO0FBQ0gsTUFBTSxxQkFBcUIsR0FBaUQsTUFBTSxDQUFDLE1BQU0sQ0FBQztJQUN6RixxQkFBcUI7Q0FDckIsQ0FBQyxDQUFDO0FBRUg7O0dBRUc7QUFDSSxJQUFNLGVBQWUsR0FBckIsTUFBTSxlQUFnQixTQUFRLG9CQUFvQjtJQU14RCxZQUNDLEtBQWlCLEVBQ0EsY0FBK0I7UUFFaEQsS0FBSyxDQUFDLEtBQUssRUFBRSxjQUFjLENBQUMsQ0FBQztRQVQ5Qjs7V0FFRztRQUNjLGdCQUFXLEdBQWdDLEVBQUUsQ0FBQztRQVE5RCxJQUFJLENBQUMsbUJBQW1CLEVBQUUsQ0FBQztJQUM1QixD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