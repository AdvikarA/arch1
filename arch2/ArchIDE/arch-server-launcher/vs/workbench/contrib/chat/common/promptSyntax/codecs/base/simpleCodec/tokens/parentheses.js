/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { SimpleToken } from './simpleToken.js';
/**
 * A token that represent a `(` with a `range`. The `range`
 * value reflects the position of the token in the original data.
 */
export class LeftParenthesis extends SimpleToken {
    /**
     * The underlying symbol of the token.
     */
    static { this.symbol = '('; }
    /**
     * Return text representation of the token.
     */
    get text() {
        return LeftParenthesis.symbol;
    }
    /**
     * Returns a string representation of the token.
     */
    toString() {
        return `left-parenthesis${this.range}`;
    }
}
/**
 * A token that represent a `)` with a `range`. The `range`
 * value reflects the position of the token in the original data.
 */
export class RightParenthesis extends SimpleToken {
    /**
     * The underlying symbol of the token.
     */
    static { this.symbol = ')'; }
    /**
     * Return text representation of the token.
     */
    get text() {
        return RightParenthesis.symbol;
    }
    /**
     * Returns a string representation of the token.
     */
    toString() {
        return `right-parenthesis${this.range}`;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFyZW50aGVzZXMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9hZHZpa2FyL0RvY3VtZW50cy9hcmNoaXRlY3QvYXJjaDIvQXJjaElERS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2NvbW1vbi9wcm9tcHRTeW50YXgvY29kZWNzL2Jhc2Uvc2ltcGxlQ29kZWMvdG9rZW5zL3BhcmVudGhlc2VzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxrQkFBa0IsQ0FBQztBQUUvQzs7O0dBR0c7QUFDSCxNQUFNLE9BQU8sZUFBZ0IsU0FBUSxXQUFnQjtJQUNwRDs7T0FFRzthQUM2QixXQUFNLEdBQVEsR0FBRyxDQUFDO0lBRWxEOztPQUVHO0lBQ0gsSUFBb0IsSUFBSTtRQUN2QixPQUFPLGVBQWUsQ0FBQyxNQUFNLENBQUM7SUFDL0IsQ0FBQztJQUVEOztPQUVHO0lBQ2EsUUFBUTtRQUN2QixPQUFPLG1CQUFtQixJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7SUFDeEMsQ0FBQzs7QUFHRjs7O0dBR0c7QUFDSCxNQUFNLE9BQU8sZ0JBQWlCLFNBQVEsV0FBZ0I7SUFDckQ7O09BRUc7YUFDNkIsV0FBTSxHQUFRLEdBQUcsQ0FBQztJQUVsRDs7T0FFRztJQUNILElBQW9CLElBQUk7UUFDdkIsT0FBTyxnQkFBZ0IsQ0FBQyxNQUFNLENBQUM7SUFDaEMsQ0FBQztJQUVEOztPQUVHO0lBQ2EsUUFBUTtRQUN2QixPQUFPLG9CQUFvQixJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7SUFDekMsQ0FBQyJ9