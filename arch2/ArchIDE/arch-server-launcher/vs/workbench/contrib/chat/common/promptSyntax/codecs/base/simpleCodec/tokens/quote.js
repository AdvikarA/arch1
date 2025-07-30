/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { SimpleToken } from './simpleToken.js';
/**
 * A token that represent a `'` with a `range`. The `range`
 * value reflects the position of the token in the original data.
 */
export class Quote extends SimpleToken {
    /**
     * The underlying symbol of the token.
     */
    static { this.symbol = '\''; }
    /**
     * Return text representation of the token.
     */
    get text() {
        return Quote.symbol;
    }
    /**
     * Checks if the provided token is of the same type
     * as the current one.
     */
    sameType(other) {
        return (other instanceof this.constructor);
    }
    /**
     * Returns a string representation of the token.
     */
    toString() {
        return `quote${this.range}`;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicXVvdGUuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9hZHZpa2FyL0RvY3VtZW50cy9hcmNoaXRlY3QvYXJjaDIvQXJjaElERS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2NvbW1vbi9wcm9tcHRTeW50YXgvY29kZWNzL2Jhc2Uvc2ltcGxlQ29kZWMvdG9rZW5zL3F1b3RlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxrQkFBa0IsQ0FBQztBQUUvQzs7O0dBR0c7QUFDSCxNQUFNLE9BQU8sS0FBTSxTQUFRLFdBQWdCO0lBQzFDOztPQUVHO2FBQzZCLFdBQU0sR0FBUyxJQUFJLENBQUM7SUFFcEQ7O09BRUc7SUFDSCxJQUFvQixJQUFJO1FBQ3ZCLE9BQU8sS0FBSyxDQUFDLE1BQU0sQ0FBQztJQUNyQixDQUFDO0lBRUQ7OztPQUdHO0lBQ0ksUUFBUSxDQUFDLEtBQWdCO1FBQy9CLE9BQU8sQ0FBQyxLQUFLLFlBQVksSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDO0lBQzVDLENBQUM7SUFFRDs7T0FFRztJQUNhLFFBQVE7UUFDdkIsT0FBTyxRQUFRLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztJQUM3QixDQUFDIn0=