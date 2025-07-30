/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { SimpleToken } from './simpleToken.js';
/**
 * A token that represent a `[` with a `range`. The `range`
 * value reflects the position of the token in the original data.
 */
export class LeftBracket extends SimpleToken {
    /**
     * The underlying symbol of the token.
     */
    static { this.symbol = '['; }
    /**
     * Return text representation of the token.
     */
    get text() {
        return LeftBracket.symbol;
    }
    /**
     * Returns a string representation of the token.
     */
    toString() {
        return `left-bracket${this.range}`;
    }
}
/**
 * A token that represent a `]` with a `range`. The `range`
 * value reflects the position of the token in the original data.
 */
export class RightBracket extends SimpleToken {
    /**
     * The underlying symbol of the token.
     */
    static { this.symbol = ']'; }
    /**
     * Return text representation of the token.
     */
    get text() {
        return RightBracket.symbol;
    }
    /**
     * Returns a string representation of the token.
     */
    toString() {
        return `right-bracket${this.range}`;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnJhY2tldHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9hZHZpa2FyL0RvY3VtZW50cy9hcmNoaXRlY3QvYXJjaDIvQXJjaElERS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2NvbW1vbi9wcm9tcHRTeW50YXgvY29kZWNzL2Jhc2Uvc2ltcGxlQ29kZWMvdG9rZW5zL2JyYWNrZXRzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxrQkFBa0IsQ0FBQztBQUUvQzs7O0dBR0c7QUFDSCxNQUFNLE9BQU8sV0FBWSxTQUFRLFdBQWdCO0lBQ2hEOztPQUVHO2FBQzZCLFdBQU0sR0FBUSxHQUFHLENBQUM7SUFFbEQ7O09BRUc7SUFDSCxJQUFvQixJQUFJO1FBQ3ZCLE9BQU8sV0FBVyxDQUFDLE1BQU0sQ0FBQztJQUMzQixDQUFDO0lBRUQ7O09BRUc7SUFDYSxRQUFRO1FBQ3ZCLE9BQU8sZUFBZSxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7SUFDcEMsQ0FBQzs7QUFHRjs7O0dBR0c7QUFDSCxNQUFNLE9BQU8sWUFBYSxTQUFRLFdBQWdCO0lBQ2pEOztPQUVHO2FBQzZCLFdBQU0sR0FBUSxHQUFHLENBQUM7SUFFbEQ7O09BRUc7SUFDSCxJQUFvQixJQUFJO1FBQ3ZCLE9BQU8sWUFBWSxDQUFDLE1BQU0sQ0FBQztJQUM1QixDQUFDO0lBRUQ7O09BRUc7SUFDYSxRQUFRO1FBQ3ZCLE9BQU8sZ0JBQWdCLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztJQUNyQyxDQUFDIn0=