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
import { ObservableDisposable } from '../utils/observableDisposable.js';
import { CancellationTokenSource } from '../../../../../../base/common/cancellation.js';
/**
 * Abstract base class for all reusable prompt file providers.
 */
let ProviderInstanceBase = class ProviderInstanceBase extends ObservableDisposable {
    constructor(model, promptsService) {
        super();
        this.model = model;
        this.parser = promptsService.getSyntaxParserFor(model);
        this._register(this.parser.onDispose(this.dispose.bind(this)));
        let cancellationSource = new CancellationTokenSource();
        this._register(this.parser.onSettled((error) => {
            cancellationSource.dispose(true);
            cancellationSource = new CancellationTokenSource();
            this.onPromptSettled(error, cancellationSource.token);
        }));
        this.parser.start();
    }
};
ProviderInstanceBase = __decorate([
    __param(1, IPromptsService)
], ProviderInstanceBase);
export { ProviderInstanceBase };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvdmlkZXJJbnN0YW5jZUJhc2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9hZHZpa2FyL0RvY3VtZW50cy9hcmNoaXRlY3QvYXJjaDIvQXJjaElERS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2NvbW1vbi9wcm9tcHRTeW50YXgvbGFuZ3VhZ2VQcm92aWRlcnMvcHJvdmlkZXJJbnN0YW5jZUJhc2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLGVBQWUsRUFBaUIsTUFBTSw4QkFBOEIsQ0FBQztBQUU5RSxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUN4RSxPQUFPLEVBQXFCLHVCQUF1QixFQUFFLE1BQU0sK0NBQStDLENBQUM7QUFFM0c7O0dBRUc7QUFDSSxJQUFlLG9CQUFvQixHQUFuQyxNQUFlLG9CQUFxQixTQUFRLG9CQUFvQjtJQWdCdEUsWUFDb0IsS0FBaUIsRUFDbkIsY0FBK0I7UUFFaEQsS0FBSyxFQUFFLENBQUM7UUFIVyxVQUFLLEdBQUwsS0FBSyxDQUFZO1FBS3BDLElBQUksQ0FBQyxNQUFNLEdBQUcsY0FBYyxDQUFDLGtCQUFrQixDQUFDLEtBQUssQ0FBQyxDQUFDO1FBRXZELElBQUksQ0FBQyxTQUFTLENBQ2IsSUFBSSxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FDOUMsQ0FBQztRQUVGLElBQUksa0JBQWtCLEdBQUcsSUFBSSx1QkFBdUIsRUFBRSxDQUFDO1FBQ3ZELElBQUksQ0FBQyxTQUFTLENBQ2IsSUFBSSxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQyxLQUFLLEVBQUUsRUFBRTtZQUMvQixrQkFBa0IsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDakMsa0JBQWtCLEdBQUcsSUFBSSx1QkFBdUIsRUFBRSxDQUFDO1lBRW5ELElBQUksQ0FBQyxlQUFlLENBQUMsS0FBSyxFQUFFLGtCQUFrQixDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ3ZELENBQUMsQ0FBQyxDQUNGLENBQUM7UUFFRixJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssRUFBRSxDQUFDO0lBQ3JCLENBQUM7Q0FDRCxDQUFBO0FBeENxQixvQkFBb0I7SUFrQnZDLFdBQUEsZUFBZSxDQUFBO0dBbEJJLG9CQUFvQixDQXdDekMifQ==