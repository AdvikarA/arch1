/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { BaseToken } from '../../baseToken.js';
import { assert } from '../../../../../../../../../base/common/assert.js';
import { Range } from '../../../../../../../../../editor/common/core/range.js';
/**
 * Token representing a line of text with a `range` which
 * reflects the line's position in the original data.
 */
export class Line extends BaseToken {
    constructor(
    // the line index
    // Note! 1-based indexing
    lineNumber, 
    // the line contents
    text) {
        assert(!isNaN(lineNumber), `The line number must not be a NaN.`);
        assert(lineNumber > 0, `The line number must be >= 1, got "${lineNumber}".`);
        super(new Range(lineNumber, 1, lineNumber, text.length + 1));
        this.text = text;
    }
    /**
     * Returns a string representation of the token.
     */
    toString() {
        return `line("${this.shortText()}")${this.range}`;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGluZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL2FkdmlrYXIvRG9jdW1lbnRzL2FyY2hpdGVjdC9hcmNoMi9BcmNoSURFL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvY29tbW9uL3Byb21wdFN5bnRheC9jb2RlY3MvYmFzZS9saW5lc0NvZGVjL3Rva2Vucy9saW5lLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUMvQyxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDMUUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHdEQUF3RCxDQUFDO0FBRS9FOzs7R0FHRztBQUNILE1BQU0sT0FBTyxJQUFLLFNBQVEsU0FBUztJQUNsQztJQUNDLGlCQUFpQjtJQUNqQix5QkFBeUI7SUFDekIsVUFBa0I7SUFDbEIsb0JBQW9CO0lBQ0osSUFBWTtRQUU1QixNQUFNLENBQ0wsQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLEVBQ2xCLG9DQUFvQyxDQUNwQyxDQUFDO1FBRUYsTUFBTSxDQUNMLFVBQVUsR0FBRyxDQUFDLEVBQ2Qsc0NBQXNDLFVBQVUsSUFBSSxDQUNwRCxDQUFDO1FBRUYsS0FBSyxDQUNKLElBQUksS0FBSyxDQUNSLFVBQVUsRUFDVixDQUFDLEVBQ0QsVUFBVSxFQUNWLElBQUksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUNmLENBQ0QsQ0FBQztRQW5CYyxTQUFJLEdBQUosSUFBSSxDQUFRO0lBb0I3QixDQUFDO0lBRUQ7O09BRUc7SUFDYSxRQUFRO1FBQ3ZCLE9BQU8sU0FBUyxJQUFJLENBQUMsU0FBUyxFQUFFLEtBQUssSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO0lBQ25ELENBQUM7Q0FDRCJ9