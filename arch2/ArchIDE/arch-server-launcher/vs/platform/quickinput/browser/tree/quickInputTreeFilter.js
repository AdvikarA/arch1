/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { matchesFuzzyIconAware, parseLabelWithIcons } from '../../../../base/common/iconLabels.js';
export class QuickInputTreeFilter {
    constructor() {
        this.filterValue = '';
        this.matchOnLabel = true;
        this.matchOnDescription = false;
        this.matchOnDetail = false;
    }
    filter(element, parentVisibility) {
        if (!this.filterValue || !(this.matchOnLabel || this.matchOnDescription || this.matchOnDetail)) {
            return element.children
                ? { visibility: 2 /* TreeVisibility.Recurse */, data: {} }
                : { visibility: 1 /* TreeVisibility.Visible */, data: {} };
        }
        const labelHighlights = this.matchOnLabel ? matchesFuzzyIconAware(this.filterValue, parseLabelWithIcons(element.label)) ?? undefined : undefined;
        const descriptionHighlights = this.matchOnDescription ? matchesFuzzyIconAware(this.filterValue, parseLabelWithIcons(element.description || '')) ?? undefined : undefined;
        const detailHighlights = this.matchOnDetail ? matchesFuzzyIconAware(this.filterValue, parseLabelWithIcons(element.detail || '')) ?? undefined : undefined;
        const visibility = parentVisibility === 1 /* TreeVisibility.Visible */
            // Parent is visible because it had matches, so we show all children
            ? 1 /* TreeVisibility.Visible */
            // This would only happen on Parent is recurse so...
            : (labelHighlights || descriptionHighlights || detailHighlights)
                // If we have any highlights, we are visible
                ? 1 /* TreeVisibility.Visible */
                // Otherwise, we defer to the children or if no children, we are hidden
                : element.children
                    ? 2 /* TreeVisibility.Recurse */
                    : 0 /* TreeVisibility.Hidden */;
        return {
            visibility,
            data: {
                labelHighlights,
                descriptionHighlights,
                detailHighlights
            }
        };
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicXVpY2tJbnB1dFRyZWVGaWx0ZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9hZHZpa2FyL0RvY3VtZW50cy9hcmNoaXRlY3QvYXJjaDIvQXJjaElERS9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9xdWlja2lucHV0L2Jyb3dzZXIvdHJlZS9xdWlja0lucHV0VHJlZUZpbHRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUluRyxNQUFNLE9BQU8sb0JBQW9CO0lBQWpDO1FBQ0MsZ0JBQVcsR0FBVyxFQUFFLENBQUM7UUFDekIsaUJBQVksR0FBWSxJQUFJLENBQUM7UUFDN0IsdUJBQWtCLEdBQVksS0FBSyxDQUFDO1FBQ3BDLGtCQUFhLEdBQVksS0FBSyxDQUFDO0lBa0NoQyxDQUFDO0lBaENBLE1BQU0sQ0FBQyxPQUF1QixFQUFFLGdCQUFnQztRQUMvRCxJQUFJLENBQUMsSUFBSSxDQUFDLFdBQVcsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLFlBQVksSUFBSSxJQUFJLENBQUMsa0JBQWtCLElBQUksSUFBSSxDQUFDLGFBQWEsQ0FBQyxFQUFFLENBQUM7WUFDaEcsT0FBTyxPQUFPLENBQUMsUUFBUTtnQkFDdEIsQ0FBQyxDQUFDLEVBQUUsVUFBVSxnQ0FBd0IsRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFO2dCQUNsRCxDQUFDLENBQUMsRUFBRSxVQUFVLGdDQUF3QixFQUFFLElBQUksRUFBRSxFQUFFLEVBQUUsQ0FBQztRQUNyRCxDQUFDO1FBRUQsTUFBTSxlQUFlLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMscUJBQXFCLENBQUMsSUFBSSxDQUFDLFdBQVcsRUFBRSxtQkFBbUIsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUMsSUFBSSxTQUFTLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQztRQUNqSixNQUFNLHFCQUFxQixHQUFHLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLENBQUMscUJBQXFCLENBQUMsSUFBSSxDQUFDLFdBQVcsRUFBRSxtQkFBbUIsQ0FBQyxPQUFPLENBQUMsV0FBVyxJQUFJLEVBQUUsQ0FBQyxDQUFDLElBQUksU0FBUyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUM7UUFDekssTUFBTSxnQkFBZ0IsR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxxQkFBcUIsQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLG1CQUFtQixDQUFDLE9BQU8sQ0FBQyxNQUFNLElBQUksRUFBRSxDQUFDLENBQUMsSUFBSSxTQUFTLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQztRQUUxSixNQUFNLFVBQVUsR0FBRyxnQkFBZ0IsbUNBQTJCO1lBQzdELG9FQUFvRTtZQUNwRSxDQUFDO1lBQ0Qsb0RBQW9EO1lBQ3BELENBQUMsQ0FBQyxDQUFDLGVBQWUsSUFBSSxxQkFBcUIsSUFBSSxnQkFBZ0IsQ0FBQztnQkFDL0QsNENBQTRDO2dCQUM1QyxDQUFDO2dCQUNELHVFQUF1RTtnQkFDdkUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxRQUFRO29CQUNqQixDQUFDO29CQUNELENBQUMsOEJBQXNCLENBQUM7UUFFM0IsT0FBTztZQUNOLFVBQVU7WUFDVixJQUFJLEVBQUU7Z0JBQ0wsZUFBZTtnQkFDZixxQkFBcUI7Z0JBQ3JCLGdCQUFnQjthQUNoQjtTQUNELENBQUM7SUFDSCxDQUFDO0NBQ0QifQ==