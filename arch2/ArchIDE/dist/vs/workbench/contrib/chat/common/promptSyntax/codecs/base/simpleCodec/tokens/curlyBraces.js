/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { SimpleToken } from './simpleToken.js';
/**
 * A token that represent a `{` with a `range`. The `range`
 * value reflects the position of the token in the original data.
 */
export class LeftCurlyBrace extends SimpleToken {
    /**
     * The underlying symbol of the token.
     */
    static { this.symbol = '{'; }
    /**
     * Return text representation of the token.
     */
    get text() {
        return LeftCurlyBrace.symbol;
    }
    /**
     * Returns a string representation of the token.
     */
    toString() {
        return `left-curly-brace${this.range}`;
    }
}
/**
 * A token that represent a `}` with a `range`. The `range`
 * value reflects the position of the token in the original data.
 */
export class RightCurlyBrace extends SimpleToken {
    /**
     * The underlying symbol of the token.
     */
    static { this.symbol = '}'; }
    /**
     * Return text representation of the token.
     */
    get text() {
        return RightCurlyBrace.symbol;
    }
    /**
     * Returns a string representation of the token.
     */
    toString() {
        return `right-curly-brace${this.range}`;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3VybHlCcmFjZXMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9hZHZpa2FyL0RvY3VtZW50cy9hcmNoaXRlY3QvYXJjaDIvQXJjaElERS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2NvbW1vbi9wcm9tcHRTeW50YXgvY29kZWNzL2Jhc2Uvc2ltcGxlQ29kZWMvdG9rZW5zL2N1cmx5QnJhY2VzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxrQkFBa0IsQ0FBQztBQUUvQzs7O0dBR0c7QUFDSCxNQUFNLE9BQU8sY0FBZSxTQUFRLFdBQWdCO0lBQ25EOztPQUVHO2FBQzZCLFdBQU0sR0FBUSxHQUFHLENBQUM7SUFFbEQ7O09BRUc7SUFDSCxJQUFvQixJQUFJO1FBQ3ZCLE9BQU8sY0FBYyxDQUFDLE1BQU0sQ0FBQztJQUM5QixDQUFDO0lBRUQ7O09BRUc7SUFDYSxRQUFRO1FBQ3ZCLE9BQU8sbUJBQW1CLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztJQUN4QyxDQUFDOztBQUdGOzs7R0FHRztBQUNILE1BQU0sT0FBTyxlQUFnQixTQUFRLFdBQWdCO0lBQ3BEOztPQUVHO2FBQzZCLFdBQU0sR0FBUSxHQUFHLENBQUM7SUFFbEQ7O09BRUc7SUFDSCxJQUFvQixJQUFJO1FBQ3ZCLE9BQU8sZUFBZSxDQUFDLE1BQU0sQ0FBQztJQUMvQixDQUFDO0lBRUQ7O09BRUc7SUFDYSxRQUFRO1FBQ3ZCLE9BQU8sb0JBQW9CLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztJQUN6QyxDQUFDIn0=