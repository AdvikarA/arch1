/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { assert } from '../../../../../../../base/common/assert.js';
import { Range } from '../../../../../../../editor/common/core/range.js';
/**
 * Base class for all tokens with a `range` that reflects
 * token position in the original text.
 */
export class BaseToken {
    constructor(tokenRange) {
        this.tokenRange = tokenRange;
    }
    /**
     * Range of the token in the original text.
     */
    get range() {
        return this.tokenRange;
    }
    /**
     * Check if this token has the same range as another one.
     */
    sameRange(other) {
        return this.range.equalsRange(other);
    }
    /**
     * Check if this token is equal to another one.
     */
    equals(other) {
        if (other.constructor !== this.constructor) {
            return false;
        }
        if (this.text.length !== other.text.length) {
            return false;
        }
        if (this.text !== other.text) {
            return false;
        }
        return this.sameRange(other.range);
    }
    /**
     * Change `range` of the token with provided range components.
     */
    withRange(components) {
        this.tokenRange = new Range(components.startLineNumber ?? this.range.startLineNumber, components.startColumn ?? this.range.startColumn, components.endLineNumber ?? this.range.endLineNumber, components.endColumn ?? this.range.endColumn);
        return this;
    }
    /**
     * Collapse range of the token to its start position.
     * See {@link Range.collapseToStart} for more details.
     */
    collapseRangeToStart() {
        this.tokenRange = this.tokenRange.collapseToStart();
        return this;
    }
    /**
     * Render a list of tokens into a string.
     */
    static render(tokens, delimiter = '') {
        return tokens.map(token => token.text).join(delimiter);
    }
    /**
     * Returns the full range of a list of tokens in which the first token is
     * used as the start of a tokens sequence and the last token reflects the end.
     *
     * @throws if:
     * 	- provided {@link tokens} list is empty
     *  - the first token start number is greater than the start line of the last token
     *  - if the first and last token are on the same line, the first token start column must
     * 	  be smaller than the start column of the last token
     */
    static fullRange(tokens) {
        assert(tokens.length > 0, 'Cannot get full range for an empty list of tokens.');
        const firstToken = tokens[0];
        const lastToken = tokens[tokens.length - 1];
        // sanity checks for the full range we would construct
        assert(firstToken.range.startLineNumber <= lastToken.range.startLineNumber, 'First token must start on previous or the same line as the last token.');
        if ((firstToken !== lastToken) && (firstToken.range.startLineNumber === lastToken.range.startLineNumber)) {
            assert(firstToken.range.endColumn <= lastToken.range.startColumn, [
                'First token must end at least on previous or the same column as the last token.',
                `First token: ${firstToken}; Last token: ${lastToken}.`,
            ].join('\n'));
        }
        return new Range(firstToken.range.startLineNumber, firstToken.range.startColumn, lastToken.range.endLineNumber, lastToken.range.endColumn);
    }
    /**
     * Shorten version of the {@link text} property.
     */
    shortText(maxLength = 32) {
        if (this.text.length <= maxLength) {
            return this.text;
        }
        return `${this.text.slice(0, maxLength - 1)}...`;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmFzZVRva2VuLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvYWR2aWthci9Eb2N1bWVudHMvYXJjaGl0ZWN0L2FyY2gyL0FyY2hJREUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9jb21tb24vcHJvbXB0U3ludGF4L2NvZGVjcy9iYXNlL2Jhc2VUb2tlbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDcEUsT0FBTyxFQUFVLEtBQUssRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBRWpGOzs7R0FHRztBQUNILE1BQU0sT0FBZ0IsU0FBUztJQUM5QixZQUNTLFVBQWlCO1FBQWpCLGVBQVUsR0FBVixVQUFVLENBQU87SUFDdEIsQ0FBQztJQUVMOztPQUVHO0lBQ0gsSUFBVyxLQUFLO1FBQ2YsT0FBTyxJQUFJLENBQUMsVUFBVSxDQUFDO0lBQ3hCLENBQUM7SUFPRDs7T0FFRztJQUNJLFNBQVMsQ0FBQyxLQUFZO1FBQzVCLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDdEMsQ0FBQztJQU9EOztPQUVHO0lBQ0ksTUFBTSxDQUFDLEtBQWdCO1FBQzdCLElBQUksS0FBSyxDQUFDLFdBQVcsS0FBSyxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUM7WUFDNUMsT0FBTyxLQUFLLENBQUM7UUFDZCxDQUFDO1FBRUQsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sS0FBSyxLQUFLLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQzVDLE9BQU8sS0FBSyxDQUFDO1FBQ2QsQ0FBQztRQUVELElBQUksSUFBSSxDQUFDLElBQUksS0FBSyxLQUFLLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDOUIsT0FBTyxLQUFLLENBQUM7UUFDZCxDQUFDO1FBRUQsT0FBTyxJQUFJLENB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