/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { BaseToken } from '../../baseToken.js';
import { FrontMatterValueToken } from './frontMatterToken.js';
/**
 * Token that represents a string value in a Front Matter header.
 */
export class FrontMatterString extends FrontMatterValueToken {
    constructor() {
        super(...arguments);
        /**
         * Name of the `string` value type.
         */
        this.valueTypeName = 'quoted-string';
    }
    /**
     * Text of the string value without the wrapping quotes.
     */
    get cleanText() {
        return BaseToken.render(this.children.slice(1, this.children.length - 1));
    }
    toString() {
        return `front-matter-string(${this.shortText()})${this.range}`;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZnJvbnRNYXR0ZXJTdHJpbmcuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9hZHZpa2FyL0RvY3VtZW50cy9hcmNoaXRlY3QvYXJjaDIvQXJjaElERS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2NvbW1vbi9wcm9tcHRTeW50YXgvY29kZWNzL2Jhc2UvZnJvbnRNYXR0ZXJDb2RlYy90b2tlbnMvZnJvbnRNYXR0ZXJTdHJpbmcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQy9DLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBUTlEOztHQUVHO0FBQ0gsTUFBTSxPQUFPLGlCQUFzRCxTQUFRLHFCQUcxRTtJQUhEOztRQUlDOztXQUVHO1FBQ3NCLGtCQUFhLEdBQUcsZUFBZSxDQUFDO0lBYzFELENBQUM7SUFaQTs7T0FFRztJQUNILElBQVcsU0FBUztRQUNuQixPQUFPLFNBQVMsQ0FBQyxNQUFNLENBQ3RCLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FDaEQsQ0FBQztJQUNILENBQUM7SUFFZSxRQUFRO1FBQ3ZCLE9BQU8sdUJBQXVCLElBQUksQ0FBQyxTQUFTLEVBQUUsSUFBSSxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7SUFDaEUsQ0FBQztDQUNEIn0=