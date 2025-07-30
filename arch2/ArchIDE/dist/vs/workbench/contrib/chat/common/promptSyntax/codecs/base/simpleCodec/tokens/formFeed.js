/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { SimpleToken } from './simpleToken.js';
/**
 * Token that represent a `form feed` with a `range`. The `range`
 * value reflects the position of the token in the original data.
 */
export class FormFeed extends SimpleToken {
    /**
     * The underlying symbol of the token.
     */
    static { this.symbol = '\f'; }
    /**
     * Return text representation of the token.
     */
    get text() {
        return FormFeed.symbol;
    }
    /**
     * Returns a string representation of the token.
     */
    toString() {
        return `formfeed${this.range}`;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZm9ybUZlZWQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9hZHZpa2FyL0RvY3VtZW50cy9hcmNoaXRlY3QvYXJjaDIvQXJjaElERS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2NvbW1vbi9wcm9tcHRTeW50YXgvY29kZWNzL2Jhc2Uvc2ltcGxlQ29kZWMvdG9rZW5zL2Zvcm1GZWVkLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxrQkFBa0IsQ0FBQztBQUUvQzs7O0dBR0c7QUFDSCxNQUFNLE9BQU8sUUFBUyxTQUFRLFdBQWlCO0lBQzlDOztPQUVHO2FBQzZCLFdBQU0sR0FBUyxJQUFJLENBQUM7SUFFcEQ7O09BRUc7SUFDSCxJQUFvQixJQUFJO1FBQ3ZCLE9BQU8sUUFBUSxDQUFDLE1BQU0sQ0FBQztJQUN4QixDQUFDO0lBRUQ7O09BRUc7SUFDYSxRQUFRO1FBQ3ZCLE9BQU8sV0FBVyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7SUFDaEMsQ0FBQyJ9