/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Event } from '../../../../base/common/event.js';
import { getCodiconAriaLabel } from '../../../../base/common/iconLabels.js';
import { localize } from '../../../../nls.js';
/**
 * Accessibility provider for QuickTree.
 */
export class QuickTreeAccessibilityProvider {
    constructor(onCheckedEvent) {
        this.onCheckedEvent = onCheckedEvent;
    }
    getWidgetAriaLabel() {
        return localize('quickTree', "Quick Tree");
    }
    getAriaLabel(element) {
        return element.ariaLabel || [element.label, element.description, element.detail]
            .map(s => getCodiconAriaLabel(s))
            .filter(s => !!s)
            .join(', ');
    }
    getWidgetRole() {
        return 'tree';
    }
    getRole(_element) {
        return 'checkbox';
    }
    isChecked(element) {
        return {
            get value() { return element.checked === true; },
            onDidChange: e => Event.filter(this.onCheckedEvent, e => e.item === element)(_ => e()),
        };
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicXVpY2tJbnB1dFRyZWVBY2Nlc3NpYmlsaXR5UHJvdmlkZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9hZHZpa2FyL0RvY3VtZW50cy9hcmNoaXRlY3QvYXJjaDIvQXJjaElERS9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9xdWlja2lucHV0L2Jyb3dzZXIvdHJlZS9xdWlja0lucHV0VHJlZUFjY2Vzc2liaWxpdHlQcm92aWRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUloRyxPQUFPLEVBQUUsS0FBSyxFQUF5QixNQUFNLGtDQUFrQyxDQUFDO0FBQ2hGLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQzVFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUU5Qzs7R0FFRztBQUNILE1BQU0sT0FBTyw4QkFBOEI7SUFDMUMsWUFBNkIsY0FBaUQ7UUFBakQsbUJBQWMsR0FBZCxjQUFjLENBQW1DO0lBQUksQ0FBQztJQUVuRixrQkFBa0I7UUFDakIsT0FBTyxRQUFRLENBQUMsV0FBVyxFQUFFLFlBQVksQ0FBQyxDQUFDO0lBQzVDLENBQUM7SUFFRCxZQUFZLENBQUMsT0FBVTtRQUN0QixPQUFPLE9BQU8sQ0FBQyxTQUFTLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLE9BQU8sQ0FBQyxXQUFXLEVBQUUsT0FBTyxDQUFDLE1BQU0sQ0FBQzthQUM5RSxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDLENBQUMsQ0FBQzthQUNoQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO2FBQ2hCLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUNkLENBQUM7SUFFRCxhQUFhO1FBQ1osT0FBTyxNQUFNLENBQUM7SUFDZixDQUFDO0lBRUQsT0FBTyxDQUFDLFFBQVc7UUFDbEIsT0FBTyxVQUFVLENBQUM7SUFDbkIsQ0FBQztJQUVELFNBQVMsQ0FBQyxPQUFVO1FBQ25CLE9BQU87WUFDTixJQUFJLEtBQUssS0FBSyxPQUFPLE9BQU8sQ0FBQyxPQUFPLEtBQUssSUFBSSxDQUFDLENBQUMsQ0FBQztZQUNoRCxXQUFXLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxjQUFjLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxLQUFLLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUM7U0FDdEYsQ0FBQztJQUNILENBQUM7Q0FDRCJ9