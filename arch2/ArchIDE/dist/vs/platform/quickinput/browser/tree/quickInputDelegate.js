/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { QuickInputTreeRenderer } from './quickInputTreeRenderer.js';
/**
 * Delegate for QuickInputTree that provides height and template information.
 */
export class QuickInputTreeDelegate {
    getHeight(element) {
        return element.detail ? 44 : 22; // 22 for single line, 44 for two lines
    }
    getTemplateId(_element) {
        return QuickInputTreeRenderer.ID;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicXVpY2tJbnB1dERlbGVnYXRlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvYWR2aWthci9Eb2N1bWVudHMvYXJjaGl0ZWN0L2FyY2gyL0FyY2hJREUvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vcXVpY2tpbnB1dC9icm93c2VyL3RyZWUvcXVpY2tJbnB1dERlbGVnYXRlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBSWhHLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBRXJFOztHQUVHO0FBQ0gsTUFBTSxPQUFPLHNCQUFzQjtJQUNsQyxTQUFTLENBQUMsT0FBVTtRQUNuQixPQUFPLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsdUNBQXVDO0lBQ3pFLENBQUM7SUFFRCxhQUFhLENBQUMsUUFBVztRQUN4QixPQUFPLHNCQUFzQixDQUFDLEVBQUUsQ0FBQztJQUNsQyxDQUFDO0NBQ0QifQ==