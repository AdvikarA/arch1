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
import { assertDefined } from '../../../../../../base/common/types.js';
import { ProviderInstanceManagerBase } from './providerInstanceManagerBase.js';
import { IMarkerService, MarkerSeverity } from '../../../../../../platform/markers/common/markers.js';
import { IFileService } from '../../../../../../platform/files/common/files.js';
import { localize } from '../../../../../../nls.js';
/**
 * Unique ID of the markers provider class.
 */
const MARKERS_OWNER_ID = 'prompt-link-diagnostics-provider';
/**
 * Prompt links diagnostics provider for a single text model.
 */
let PromptLinkDiagnosticsProvider = class PromptLinkDiagnosticsProvider extends ProviderInstanceBase {
    constructor(model, promptsService, markerService, fileService) {
        super(model, promptsService);
        this.markerService = markerService;
        this.fileService = fileService;
    }
    /**
     * Update diagnostic markers for the current editor.
     */
    async onPromptSettled() {
        // clean up all previously added markers
        this.markerService.remove(MARKERS_OWNER_ID, [this.model.uri]);
        const markers = [];
        const stats = await this.fileService.resolveAll(this.parser.references.map(ref => ({ resource: ref.uri })));
        for (let i = 0; i < stats.length; i++) {
            if (!stats[i].success) {
                markers.push(toMarker(this.parser.references[i], localize('fileNotFound', 'File not found.')));
            }
        }
        this.markerService.changeOne(MARKERS_OWNER_ID, this.model.uri, markers);
    }
    /**
     * Returns a string representation of this object.
     */
    toString() {
        return `prompt-link-diagnostics:${this.model.uri.path}`;
    }
};
PromptLinkDiagnosticsProvider = __decorate([
    __param(1, IPromptsService),
    __param(2, IMarkerService),
    __param(3, IFileService)
], PromptLinkDiagnosticsProvider);
/**
 * Convert a prompt link with an issue to a marker data.
 *
 * @throws
 *  - if there is no link issue (e.g., `topError` undefined)
 *  - if there is no link range to highlight (e.g., `linkRange` undefined)
 *  - if the original error is of `NotPromptFile` type - we don't want to
 *    show diagnostic markers for non-prompt file links in the prompts
 */
function toMarker(link, message) {
    const { linkRange } = link;
    assertDefined(linkRange, 'Link range must to be defined.');
    return {
        message: message,
        severity: MarkerSeverity.Warning,
        ...linkRange,
    };
}
/**
 * The class that manages creation and disposal of {@link PromptLinkDiagnosticsProvider}
 * classes for each specific editor text model.
 */
export class PromptLinkDiagnosticsInstanceManager extends ProviderInstanceManagerBase {
    get InstanceClass() {
        return PromptLinkDiagnosticsProvider;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvbXB0TGlua0RpYWdub3N0aWNzUHJvdmlkZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9hZHZpa2FyL0RvY3VtZW50cy9hcmNoaXRlY3QvYXJjaDIvQXJjaElERS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2NvbW1vbi9wcm9tcHRTeW50YXgvbGFuZ3VhZ2VQcm92aWRlcnMvcHJvbXB0TGlua0RpYWdub3N0aWNzUHJvdmlkZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBRS9ELE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDJCQUEyQixDQUFDO0FBRWpFLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUN2RSxPQUFPLEVBQUUsMkJBQTJCLEVBQWtCLE1BQU0sa0NBQWtDLENBQUM7QUFDL0YsT0FBTyxFQUFlLGNBQWMsRUFBRSxjQUFjLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUNuSCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDaEYsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBRXBEOztHQUVHO0FBQ0gsTUFBTSxnQkFBZ0IsR0FBRyxrQ0FBa0MsQ0FBQztBQUU1RDs7R0FFRztBQUNILElBQU0sNkJBQTZCLEdBQW5DLE1BQU0sNkJBQThCLFNBQVEsb0JBQW9CO0lBQy9ELFlBQ0MsS0FBaUIsRUFDQSxjQUErQixFQUNmLGFBQTZCLEVBQy9CLFdBQXlCO1FBRXhELEtBQUssQ0FBQyxLQUFLLEVBQUUsY0FBYyxDQUFDLENBQUM7UUFISSxrQkFBYSxHQUFiLGFBQWEsQ0FBZ0I7UUFDL0IsZ0JBQVcsR0FBWCxXQUFXLENBQWM7SUFHekQsQ0FBQztJQUVEOztPQUVHO0lBQ2dCLEtBQUssQ0FBQyxlQUFlO1FBQ3ZDLHdDQUF3QztRQUN4QyxJQUFJLENBQUMsYUFBYSxDQUFDLE1BQU0sQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztRQUU5RCxNQUFNLE9BQU8sR0FBa0IsRUFBRSxDQUFDO1FBRWxDLE1BQU0sS0FBSyxHQUFHLE1BQU0sSUFBSSxDQUFDLFdBQVcsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLFFBQVEsRUFBRSxHQUFHLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDNUcsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUN2QyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDO2dCQUN2QixPQUFPLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsRUFBRSxRQUFRLENBQUMsY0FBYyxFQUFFLGlCQUFpQixDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ2hHLENBQUM7UUFDRixDQUFDO1FBRUQsSUFBSSxDQUFDLGFBQWEsQ0FBQyxTQUFTLENBQzNCLGdCQUFnQixFQUNoQixJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsRUFDZCxPQUFPLENBQ1AsQ0FBQztJQUNILENBQUM7SUFFRDs7T0FFRztJQUNhLFFBQVE7UUFDdkIsT0FBTywyQkFBMkIsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLENBQUM7SUFDekQsQ0FBQztDQUNELENBQUE7QUF2Q0ssNkJBQTZCO0lBR2hDLFdBQUEsZUFBZSxDQUFBO0lBQ2YsV0FBQSxjQUFjLENBQUE7SUFDZCxXQUFBLFlBQVksQ0FBQTtHQUxULDZCQUE2QixDQXVDbEM7QUFFRDs7Ozs7Ozs7R0FRRztBQUNILFNBQVMsUUFBUSxDQUFDLElBQTBCLEVBQUUsT0FBZTtJQUM1RCxNQUFNLEVBQUUsU0FBUyxFQUFFLEdBQUcsSUFBSSxDQUFDO0lBRTNCLGFBQWEsQ0FDWixTQUFTLEVBQ1QsZ0NBQWdDLENBQ2hDLENBQUM7SUFHRixPQUFPO1FBQ04sT0FBTyxFQUFFLE9BQU87UUFDaEIsUUFBUSxFQUFFLGNBQWMsQ0FBQyxPQUFPO1FBQ2hDLEdBQUcsU0FBUztLQUNaLENBQUM7QUFDSCxDQUFDO0FBRUQ7OztHQUdHO0FBQ0gsTUFBTSxPQUFPLG9DQUFxQyxTQUFRLDJCQUEwRDtJQUNuSCxJQUF1QixhQUFhO1FBQ25DLE9BQU8sNkJBQTZCLENBQUM7SUFDdEMsQ0FBQztDQUNEIn0=