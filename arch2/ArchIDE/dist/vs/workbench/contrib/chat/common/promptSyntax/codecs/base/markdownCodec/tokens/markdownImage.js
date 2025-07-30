/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { MarkdownToken } from './markdownToken.js';
import { Range } from '../../../../../../../../../editor/common/core/range.js';
import { assert } from '../../../../../../../../../base/common/assert.js';
/**
 * A token that represent a `markdown image` with a `range`. The `range`
 * value reflects the position of the token in the original data.
 */
export class MarkdownImage extends MarkdownToken {
    constructor(
    /**
     * The starting line number of the image (1-based indexing).
     */
    lineNumber, 
    /**
     * The starting column number of the image (1-based indexing).
     */
    columnNumber, 
    /**
     * The caption of the image, including the `!` and `square brackets`.
     */
    caption, 
    /**
     * The reference of the image, including the parentheses.
     */
    reference) {
        assert(!isNaN(lineNumber), `The line number must not be a NaN.`);
        assert(lineNumber > 0, `The line number must be >= 1, got "${lineNumber}".`);
        assert(columnNumber > 0, `The column number must be >= 1, got "${columnNumber}".`);
        assert(caption[0] === '!', `The caption must start with '!' character, got "${caption}".`);
        assert(caption[1] === '[' && caption[caption.length - 1] === ']', `The caption must be enclosed in square brackets, got "${caption}".`);
        assert(reference[0] === '(' && reference[reference.length - 1] === ')', `The reference must be enclosed in parentheses, got "${reference}".`);
        super(new Range(lineNumber, columnNumber, lineNumber, columnNumber + caption.length + reference.length));
        this.caption = caption;
        this.reference = reference;
        // set up the `isURL` flag based on the current
        try {
            new URL(this.path);
            this.isURL = true;
        }
        catch {
            this.isURL = false;
        }
    }
    get text() {
        return `${this.caption}${this.reference}`;
    }
    /**
     * Returns the `reference` part of the link without enclosing parentheses.
     */
    get path() {
        return this.reference.slice(1, this.reference.length - 1);
    }
    /**
     * Get the range of the `link part` of the token.
     */
    get linkRange() {
        if (this.path.length === 0) {
            return undefined;
        }
        const { range } = this;
        // note! '+1' for openning `(` of the link
        const startColumn = range.startColumn + this.caption.length + 1;
        const endColumn = startColumn + this.path.length;
        return new Range(range.startLineNumber, startColumn, range.endLineNumber, endColumn);
    }
    /**
     * Returns a string representation of the token.
     */
    toString() {
        return `md-image("${this.shortText()}")${this.range}`;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFya2Rvd25JbWFnZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL2FkdmlrYXIvRG9jdW1lbnRzL2FyY2hpdGVjdC9hcmNoMi9BcmNoSURFL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvY29tbW9uL3Byb21wdFN5bnRheC9jb2RlY3MvYmFzZS9tYXJrZG93bkNvZGVjL3Rva2Vucy9tYXJrZG93bkltYWdlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUNuRCxPQUFPLEVBQVUsS0FBSyxFQUFFLE1BQU0sd0RBQXdELENBQUM7QUFDdkYsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBRTFFOzs7R0FHRztBQUNILE1BQU0sT0FBTyxhQUFjLFNBQVEsYUFBYTtJQU0vQztJQUNDOztPQUVHO0lBQ0gsVUFBa0I7SUFDbEI7O09BRUc7SUFDSCxZQUFvQjtJQUNwQjs7T0FFRztJQUNjLE9BQWU7SUFDaEM7O09BRUc7SUFDYyxTQUFpQjtRQUVsQyxNQUFNLENBQ0wsQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLEVBQ2xCLG9DQUFvQyxDQUNwQyxDQUFDO1FBRUYsTUFBTSxDQUNMLFVBQVUsR0FBRyxDQUFDLEVBQ2Qsc0NBQXNDLFVBQVUsSUFBSSxDQUNwRCxDQUFDO1FBRUYsTUFBTSxDQUNMLFlBQVksR0FBRyxDQUFDLEVBQ2hCLHdDQUF3QyxZQUFZLElBQUksQ0FDeEQsQ0FBQztRQUVGLE1BQU0sQ0FDTCxPQUFPLENBQUMsQ0FBQyxDQUFDLEtBQUssR0FBRyxFQUNsQixtREFBbUQsT0FBTyxJQUFJLENBQzlELENBQUM7UUFFRixNQUFNLENBQ0wsT0FBTyxDQUFDLENBQUMsQ0FBQyxLQUFLLEdBQUcsSUFBSSxPQUFPLENBQUMsT0FBTyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsS0FBSyxHQUFHLEVBQ3pELHlEQUF5RCxPQUFPLElBQUksQ0FDcEUsQ0FBQztRQUVGLE1BQU0sQ0FDTCxTQUFTLENBQUMsQ0FBQyxDQUFDLEtBQUssR0FBRyxJQUFJLFNBQVMsQ0FBQyxTQUFTLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxLQUFLLEdBQUcsRUFDL0QsdURBQXVELFNBQVMsSUFBSSxDQUNwRSxDQUFDO1FBRUYsS0FBSyxDQUNKLElBQUksS0FBSyxDQUNSLFVBQVUsRUFDVixZQUFZLEVBQ1osVUFBVSxFQUNWLFlBQVksR0FBRyxPQUFPLENBQUMsTUFBTSxHQUFHLFNBQVMsQ0FBQyxNQUFNLENBQ2hELENBQ0QsQ0FBQztRQTNDZSxZQUFPLEdBQVAsT0FBTyxDQUFRO1FBSWYsY0FBUyxHQUFULFNBQVMsQ0FBUTtRQXlDbEMsK0NBQStDO1FBQy9DLElBQUksQ0FBQztZQUNKLElBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUNuQixJQUFJLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQztRQUNuQixDQUFDO1FBQUMsTUFBTSxDQUFDO1lBQ1IsSUFBSSxDQUFDLEtBQUssR0FBRyxLQUFLLENBQUM7UUFDcEIsQ0FBQztJQUNGLENBQUM7SUFFRCxJQUFvQixJQUFJO1FBQ3ZCLE9BQU8sR0FBRyxJQUFJLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztJQUMzQyxDQUFDO0lBRUQ7O09BRUc7SUFDSCxJQUFXLElBQUk7UUFDZCxPQUFPLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQztJQUMzRCxDQUFDO0lBRUQ7O09BRUc7SUFDSCxJQUFXLFNBQVM7UUFDbkIsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUM1QixPQUFPLFNBQVMsQ0FBQztRQUNsQixDQUFDO1FBRUQsTUFBTSxFQUFFLEtBQUssRUFBRSxHQUFHLElBQUksQ0FBQztRQUV2QiwwQ0FBMEM7UUFDMUMsTUFBTSxXQUFXLEdBQUcsS0FBSyxDQUFDLFdBQVcsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUM7UUFDaEUsTUFBTSxTQUFTLEdBQUcsV0FBVyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDO1FBRWpELE9BQU8sSUFBSSxLQUFLLENBQ2YsS0FBSyxDQUFDLGVBQWUsRUFDckIsV0FBVyxFQUNYLEtBQUssQ0FBQyxhQUFhLEVBQ25CLFNBQVMsQ0FDVCxDQUFDO0lBQ0gsQ0FBQztJQUVEOztPQUVHO0lBQ2EsUUFBUTtRQUN2QixPQUFPLGFBQWEsSUFBSSxDQUFDLFNBQVMsRUFBRSxLQUFLLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztJQUN2RCxDQUFDO0NBQ0QifQ==