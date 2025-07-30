/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { BaseToken } from '../../baseToken.js';
import { Range } from '../../../../../../../../../editor/common/core/range.js';
/**
 * A token that represent a word - a set of continuous
 * characters without stop characters, like a `space`,
 * a `tab`, or a `new line`.
 */
export class Word extends BaseToken {
    constructor(
    /**
     * The word range.
     */
    range, 
    /**
     * The string value of the word.
     */
    text) {
        super(range);
        this.text = text;
    }
    /**
     * Create new `Word` token with the given `text` and the range
     * inside the given `Line` at the specified `column number`.
     */
    static newOnLine(text, line, atColumnNumber) {
        const startLineNumber = (typeof line === 'number')
            ? line
            : line.range.startLineNumber;
        const range = new Range(startLineNumber, atColumnNumber, startLineNumber, atColumnNumber + text.length);
        return new Word(range, text);
    }
    /**
     * Returns a string representation of the token.
     */
    toString() {
        return `word("${this.shortText()}")${this.range}`;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29yZC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL2FkdmlrYXIvRG9jdW1lbnRzL2FyY2hpdGVjdC9hcmNoMi9BcmNoSURFL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvY29tbW9uL3Byb21wdFN5bnRheC9jb2RlY3MvYmFzZS9zaW1wbGVDb2RlYy90b2tlbnMvd29yZC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFFL0MsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHdEQUF3RCxDQUFDO0FBRS9FOzs7O0dBSUc7QUFDSCxNQUFNLE9BQU8sSUFBb0MsU0FBUSxTQUFnQjtJQUN4RTtJQUNDOztPQUVHO0lBQ0gsS0FBWTtJQUVaOztPQUVHO0lBQ2EsSUFBVztRQUUzQixLQUFLLENBQUMsS0FBSyxDQUFDLENBQUM7UUFGRyxTQUFJLEdBQUosSUFBSSxDQUFPO0lBRzVCLENBQUM7SUFFRDs7O09BR0c7SUFDSSxNQUFNLENBQUMsU0FBUyxDQUN0QixJQUFZLEVBQ1osSUFBbUIsRUFDbkIsY0FBc0I7UUFFdEIsTUFBTSxlQUFlLEdBQUcsQ0FBQyxPQUFPLElBQUksS0FBSyxRQUFRLENBQUM7WUFDakQsQ0FBQyxDQUFDLElBQUk7WUFDTixDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxlQUFlLENBQUM7UUFFOUIsTUFBTSxLQUFLLEdBQUcsSUFBSSxLQUFLLENBQ3RCLGVBQWUsRUFBRSxjQUFjLEVBQy9CLGVBQWUsRUFBRSxjQUFjLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FDN0MsQ0FBQztRQUVGLE9BQU8sSUFBSSxJQUFJLENBQ2QsS0FBSyxFQUNMLElBQUksQ0FDSixDQUFDO0lBQ0gsQ0FBQztJQUVEOztPQUVHO0lBQ2EsUUFBUTtRQUN2QixPQUFPLFNBQVMsSUFBSSxDQUFDLFNBQVMsRUFBRSxLQUFLLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztJQUNuRCxDQUFDO0NBQ0QifQ==