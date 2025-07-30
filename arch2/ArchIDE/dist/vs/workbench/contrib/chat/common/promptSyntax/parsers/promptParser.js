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
import { ILogService } from '../../../../../../platform/log/common/log.js';
import { BasePromptParser } from './basePromptParser.js';
import { IModelService } from '../../../../../../editor/common/services/model.js';
import { TextModelContentsProvider } from '../contentProviders/textModelContentsProvider.js';
import { FilePromptContentProvider } from '../contentProviders/filePromptContentsProvider.js';
import { IInstantiationService } from '../../../../../../platform/instantiation/common/instantiation.js';
import { IWorkbenchEnvironmentService } from '../../../../../services/environment/common/environmentService.js';
/**
 * Get prompt contents provider object based on the prompt type.
 */
function getContentsProvider(uri, options, modelService, instaService) {
    const model = modelService.getModel(uri);
    if (model) {
        return instaService.createInstance(TextModelContentsProvider, model, options);
    }
    return instaService.createInstance(FilePromptContentProvider, uri, options);
}
/**
 * General prompt parser class that automatically infers a prompt
 * contents provider type by the type of provided prompt URI.
 */
let PromptParser = class PromptParser extends BasePromptParser {
    constructor(uri, options, logService, modelService, instaService, envService) {
        const contentsProvider = getContentsProvider(uri, options, modelService, instaService);
        super(contentsProvider, options, instaService, envService, logService);
        this.contentsProvider = this._register(contentsProvider);
    }
    /**
     * Returns a string representation of this object.
     */
    toString() {
        const { sourceName } = this.contentsProvider;
        return `prompt-parser:${sourceName}:${this.uri.path}`;
    }
};
PromptParser = __decorate([
    __param(2, ILogService),
    __param(3, IModelService),
    __param(4, IInstantiationService),
    __param(5, IWorkbenchEnvironmentService)
], PromptParser);
export { PromptParser };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvbXB0UGFyc2VyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvYWR2aWthci9Eb2N1bWVudHMvYXJjaGl0ZWN0L2FyY2gyL0FyY2hJREUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9jb21tb24vcHJvbXB0U3ludGF4L3BhcnNlcnMvcHJvbXB0UGFyc2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBSWhHLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQztBQUMzRSxPQUFPLEVBQUUsZ0JBQWdCLEVBQXdCLE1BQU0sdUJBQXVCLENBQUM7QUFDL0UsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBQ2xGLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQzdGLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBQzlGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLGtFQUFrRSxDQUFDO0FBRXpHLE9BQU8sRUFBRSw0QkFBNEIsRUFBRSxNQUFNLGtFQUFrRSxDQUFDO0FBRWhIOztHQUVHO0FBQ0gsU0FBUyxtQkFBbUIsQ0FDM0IsR0FBUSxFQUNSLE9BQXVDLEVBQ3ZDLFlBQTJCLEVBQzNCLFlBQW1DO0lBRW5DLE1BQU0sS0FBSyxHQUFHLFlBQVksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDekMsSUFBSSxLQUFLLEVBQUUsQ0FBQztRQUNYLE9BQU8sWUFBWSxDQUFDLGNBQWMsQ0FBQyx5QkFBeUIsRUFBRSxLQUFLLEVBQUUsT0FBTyxDQUFDLENBQUM7SUFDL0UsQ0FBQztJQUNELE9BQU8sWUFBWSxDQUFDLGNBQWMsQ0FBQyx5QkFBeUIsRUFBRSxHQUFHLEVBQUUsT0FBTyxDQUFDLENBQUM7QUFDN0UsQ0FBQztBQUVEOzs7R0FHRztBQUNJLElBQU0sWUFBWSxHQUFsQixNQUFNLFlBQWEsU0FBUSxnQkFBeUM7SUFNMUUsWUFDQyxHQUFRLEVBQ1IsT0FBNkIsRUFDaEIsVUFBdUIsRUFDckIsWUFBMkIsRUFDbkIsWUFBbUMsRUFDNUIsVUFBd0M7UUFFdEUsTUFBTSxnQkFBZ0IsR0FBRyxtQkFBbUIsQ0FBQyxHQUFHLEVBQUUsT0FBTyxFQUFFLFlBQVksRUFBRSxZQUFZLENBQUMsQ0FBQztRQUV2RixLQUFLLENBQ0osZ0JBQWdCLEVBQ2hCLE9BQU8sRUFDUCxZQUFZLEVBQ1osVUFBVSxFQUNWLFVBQVUsQ0FDVixDQUFDO1FBRUYsSUFBSSxDQUFDLGdCQUFnQixHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztJQUMxRCxDQUFDO0lBRUQ7O09BRUc7SUFDYSxRQUFRO1FBQ3ZCLE1BQU0sRUFBRSxVQUFVLEVBQUUsR0FBRyxJQUFJLENBQUMsZ0JBQWdCLENBQUM7UUFFN0MsT0FBTyxpQkFBaUIsVUFBVSxJQUFJLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLENBQUM7SUFDdkQsQ0FBQztDQUNELENBQUE7QUFuQ1ksWUFBWTtJQVN0QixXQUFBLFdBQVcsQ0FBQTtJQUNYLFdBQUEsYUFBYSxDQUFBO0lBQ2IsV0FBQSxxQkFBcUIsQ0FBQTtJQUNyQixXQUFBLDRCQUE0QixDQUFBO0dBWmxCLFlBQVksQ0FtQ3hCIn0=