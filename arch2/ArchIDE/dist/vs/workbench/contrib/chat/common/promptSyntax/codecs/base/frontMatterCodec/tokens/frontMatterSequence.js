/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { BaseToken } from '../../baseToken.js';
import { FrontMatterValueToken } from './frontMatterToken.js';
import { Word, SpacingToken } from '../../simpleCodec/tokens/tokens.js';
/**
 * Token represents a generic sequence of tokens in a Front Matter header.
 */
export class FrontMatterSequence extends FrontMatterValueToken {
    /**
     * @override Because this token represent a generic sequence of tokens,
     *           the type name is represented by the sequence of tokens itself
     */
    get valueTypeName() {
        return this;
    }
    /**
     * Text of the sequence value. The method exists to provide a
     * consistent interface with {@link FrontMatterString} token.
     *
     * Note! that this method does not automatically trim spacing tokens
     *       in the sequence. If you need to get a trimmed value, call
     *       {@link trimEnd} method first.
     */
    get cleanText() {
        return this.text;
    }
    /**
     * Trim spacing tokens at the end of the sequence.
     */
    trimEnd() {
        const trimmedTokens = [];
        // iterate the tokens list from the end to the start, collecting
        // all the spacing tokens we encounter until we reach a non-spacing token
        let lastNonSpace = this.childTokens.length - 1;
        while (lastNonSpace >= 0) {
            const token = this.childTokens[lastNonSpace];
            if (token instanceof SpacingToken) {
                trimmedTokens.push(token);
                lastNonSpace--;
                continue;
            }
            break;
        }
        this.childTokens.length = lastNonSpace + 1;
        // if there are only spacing tokens were present add a single
        // empty token to the sequence, so it has something to work with
        if (this.childTokens.length === 0) {
            this.collapseRangeToStart();
            this.childTokens.push(new Word(this.range, ''));
        }
        // update the current range to reflect the current trimmed value
        this.withRange(BaseToken.fullRange(this.childTokens));
        // trimmed tokens are collected starting from the end,
        // moving to the start, hence reverse them before returning
        return trimmedTokens.reverse();
    }
    toString() {
        return `front-matter-sequence(${this.shortText()})${this.range}`;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZnJvbnRNYXR0ZXJTZXF1ZW5jZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL2FkdmlrYXIvRG9jdW1lbnRzL2FyY2hpdGVjdC9hcmNoMi9BcmNoSURFL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvY29tbW9uL3Byb21wdFN5bnRheC9jb2RlY3MvYmFzZS9mcm9udE1hdHRlckNvZGVjL3Rva2Vucy9mcm9udE1hdHRlclNlcXVlbmNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUMvQyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUM5RCxPQUFPLEVBQUUsSUFBSSxFQUFFLFlBQVksRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBSXhFOztHQUVHO0FBQ0gsTUFBTSxPQUFPLG1CQUFvQixTQUFRLHFCQUEwRTtJQUNsSDs7O09BR0c7SUFDSCxJQUFvQixhQUFhO1FBQ2hDLE9BQU8sSUFBSSxDQUFDO0lBQ2IsQ0FBQztJQUVEOzs7Ozs7O09BT0c7SUFDSCxJQUFXLFNBQVM7UUFDbkIsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDO0lBQ2xCLENBQUM7SUFFRDs7T0FFRztJQUNJLE9BQU87UUFDYixNQUFNLGFBQWEsR0FBRyxFQUFFLENBQUM7UUFFekIsZ0VBQWdFO1FBQ2hFLHlFQUF5RTtRQUN6RSxJQUFJLFlBQVksR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUM7UUFDL0MsT0FBTyxZQUFZLElBQUksQ0FBQyxFQUFFLENBQUM7WUFDMUIsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxZQUFZLENBQUMsQ0FBQztZQUU3QyxJQUFJLEtBQUssWUFBWSxZQUFZLEVBQUUsQ0FBQztnQkFDbkMsYUFBYSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztnQkFDMUIsWUFBWSxFQUFFLENBQUM7Z0JBRWYsU0FBUztZQUNWLENBQUM7WUFFRCxNQUFNO1FBQ1AsQ0FBQztRQUNELElBQUksQ0FBQyxXQUFXLENBQUMsTUFBTSxHQUFHLFlBQVksR0FBRyxDQUFDLENBQUM7UUFFM0MsNkRBQTZEO1FBQzdELGdFQUFnRTtRQUNoRSxJQUFJLElBQUksQ0FBQyxXQUFXLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQ25DLElBQUksQ0FBQyxvQkFBb0IsRUFBRSxDQUFDO1lBQzVCLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUNqRCxDQUFDO1FBRUQsZ0VBQWdFO1FBQ2hFLElBQUksQ0FBQyxTQUFTLENBQ2IsU0FBUyxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQ3JDLENBQUM7UUFFRixzREFBc0Q7UUFDdEQsMkRBQTJEO1FBQzNELE9BQU8sYUFBYSxDQUFDLE9BQU8sRUFBRSxDQUFDO0lBQ2hDLENBQUM7SUFFZSxRQUFRO1FBQ3ZCLE9BQU8seUJBQXlCLElBQUksQ0FBQyxTQUFTLEVBQUUsSUFBSSxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7SUFDbEUsQ0FBQztDQUNEIn0=