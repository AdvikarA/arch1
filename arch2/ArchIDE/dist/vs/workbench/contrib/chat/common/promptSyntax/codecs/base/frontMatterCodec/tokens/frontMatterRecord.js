/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { BaseToken } from '../../baseToken.js';
import { FrontMatterSequence } from './frontMatterSequence.js';
import { FrontMatterToken } from './frontMatterToken.js';
/**
 * Token representing a `record name` inside a Front Matter record.
 *
 * E.g., `name` in the example below:
 *
 * ```
 * ---
 * name: 'value'
 * ---
 * ```
 */
export class FrontMatterRecordName extends FrontMatterToken {
    toString() {
        return `front-matter-record-name(${this.shortText()})${this.range}`;
    }
}
/**
 * Token representing a delimiter of a record inside a Front Matter header.
 *
 * E.g., `: ` in the example below:
 *
 * ```
 * ---
 * name: 'value'
 * ---
 * ```
 */
export class FrontMatterRecordDelimiter extends FrontMatterToken {
    toString() {
        return `front-matter-delimiter(${this.shortText()})${this.range}`;
    }
}
/**
 * Token representing a `record` inside a Front Matter header.
 *
 * E.g., `name: 'value'` in the example below:
 *
 * ```
 * ---
 * name: 'value'
 * ---
 * ```
 */
export class FrontMatterRecord extends FrontMatterToken {
    /**
     * Token that represent `name` of the record.
     *
     * E.g., `tools` in the example below:
     *
     * ```
     * ---
     * tools: ['value']
     * ---
     * ```
     */
    get nameToken() {
        return this.children[0];
    }
    /**
     * Token that represent `value` of the record.
     *
     * E.g., `['value']` in the example below:
     *
     * ```
     * ---
     * tools: ['value']
     * ---
     * ```
     */
    get valueToken() {
        return this.children[2];
    }
    /**
     * Trim spacing tokens at the end of the record.
     */
    trimValueEnd() {
        const { valueToken } = this;
        // only the "generic sequence" value tokens can hold
        // some spacing tokens at the end of them
        if ((valueToken instanceof FrontMatterSequence) === false) {
            return [];
        }
        const trimmedTokens = valueToken.trimEnd();
        // update the current range to reflect the current trimmed value
        this.withRange(BaseToken.fullRange(this.children));
        return trimmedTokens;
    }
    toString() {
        return `front-matter-record(${this.shortText()})${this.range}`;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZnJvbnRNYXR0ZXJSZWNvcmQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9hZHZpa2FyL0RvY3VtZW50cy9hcmNoaXRlY3QvYXJjaDIvQXJjaElERS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2NvbW1vbi9wcm9tcHRTeW50YXgvY29kZWNzL2Jhc2UvZnJvbnRNYXR0ZXJDb2RlYy90b2tlbnMvZnJvbnRNYXR0ZXJSZWNvcmQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQy9DLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBRS9ELE9BQU8sRUFBRSxnQkFBZ0IsRUFBOEMsTUFBTSx1QkFBdUIsQ0FBQztBQU9yRzs7Ozs7Ozs7OztHQVVHO0FBQ0gsTUFBTSxPQUFPLHFCQUFzQixTQUFRLGdCQUF1QztJQUNqRSxRQUFRO1FBQ3ZCLE9BQU8sNEJBQTRCLElBQUksQ0FBQyxTQUFTLEVBQUUsSUFBSSxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7SUFDckUsQ0FBQztDQUNEO0FBRUQ7Ozs7Ozs7Ozs7R0FVRztBQUNILE1BQU0sT0FBTywwQkFBMkIsU0FBUSxnQkFBZ0Q7SUFDL0UsUUFBUTtRQUN2QixPQUFPLDBCQUEwQixJQUFJLENBQUMsU0FBUyxFQUFFLElBQUksSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO0lBQ25FLENBQUM7Q0FDRDtBQUVEOzs7Ozs7Ozs7O0dBVUc7QUFDSCxNQUFNLE9BQU8saUJBQWtCLFNBQVEsZ0JBRXRDO0lBQ0E7Ozs7Ozs7Ozs7T0FVRztJQUNILElBQVcsU0FBUztRQUNuQixPQUFPLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDekIsQ0FBQztJQUVEOzs7Ozs7Ozs7O09BVUc7SUFDSCxJQUFXLFVBQVU7UUFDcEIsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3pCLENBQUM7SUFFRDs7T0FFRztJQUNJLFlBQVk7UUFDbEIsTUFBTSxFQUFFLFVBQVUsRUFBRSxHQUFHLElBQUksQ0FBQztRQUU1QixvREFBb0Q7UUFDcEQseUNBQXlDO1FBQ3pDLElBQUksQ0FBQyxVQUFVLFlBQVksbUJBQW1CLENBQUMsS0FBSyxLQUFLLEVBQUUsQ0FBQztZQUMzRCxPQUFPLEVBQUUsQ0FBQztRQUNYLENBQUM7UUFFRCxNQUFNLGFBQWEsR0FBRyxVQUFVLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDM0MsZ0VBQWdFO1FBQ2hFLElBQUksQ0FBQyxTQUFTLENBQ2IsU0FBUyxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQ2xDLENBQUM7UUFFRixPQUFPLGFBQWEsQ0FBQztJQUN0QixDQUFDO0lBRWUsUUFBUTtRQUN2QixPQUFPLHVCQUF1QixJQUFJLENBQUMsU0FBUyxFQUFFLElBQUksSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO0lBQ2hFLENBQUM7Q0FDRCJ9