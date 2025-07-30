/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { SpacingToken } from './simpleToken.js';
/**
 * A token that represent a `space` with a `range`. The `range`
 * value reflects the position of the token in the original data.
 */
export class Space extends SpacingToken {
    /**
     * The underlying symbol of the `Space` token.
     */
    static { this.symbol = ' '; }
    /**
     * Return text representation of the token.
     */
    get text() {
        return Space.symbol;
    }
    /**
     * Returns a string representation of the token.
     */
    toString() {
        return `space${this.range}`;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3BhY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9hZHZpa2FyL0RvY3VtZW50cy9hcmNoaXRlY3QvYXJjaDIvQXJjaElERS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2NvbW1vbi9wcm9tcHRTeW50YXgvY29kZWNzL2Jhc2Uvc2ltcGxlQ29kZWMvdG9rZW5zL3NwYWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxrQkFBa0IsQ0FBQztBQUVoRDs7O0dBR0c7QUFDSCxNQUFNLE9BQU8sS0FBTSxTQUFRLFlBQWlCO0lBQzNDOztPQUVHO2FBQzZCLFdBQU0sR0FBUSxHQUFHLENBQUM7SUFFbEQ7O09BRUc7SUFDSCxJQUFvQixJQUFJO1FBQ3ZCLE9BQU8sS0FBSyxDQUFDLE1BQU0sQ0FBQztJQUNyQixDQUFDO0lBRUQ7O09BRUc7SUFDYSxRQUFRO1FBQ3ZCLE9BQU8sUUFBUSxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7SUFDN0IsQ0FBQyJ9