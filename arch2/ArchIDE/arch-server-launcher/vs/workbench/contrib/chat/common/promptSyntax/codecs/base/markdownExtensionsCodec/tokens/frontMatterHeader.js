/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Text } from '../../textToken.js';
import { BaseToken } from '../../baseToken.js';
import { MarkdownExtensionsToken } from './markdownExtensionsToken.js';
import { FrontMatterMarker } from './frontMatterMarker.js';
/**
 * Token that represents a `Front Matter` header in a text.
 */
export class FrontMatterHeader extends MarkdownExtensionsToken {
    constructor(range, startMarker, content, endMarker) {
        super(range);
        this.startMarker = startMarker;
        this.content = content;
        this.endMarker = endMarker;
    }
    /**
     * Return complete text representation of the token.
     */
    get text() {
        const text = [
            this.startMarker.text,
            this.content.text,
            this.endMarker.text,
        ];
        return text.join('');
    }
    /**
     * Range of the content of the Front Matter header.
     */
    get contentRange() {
        return this.content.range;
    }
    /**
     * Content token of the Front Matter header.
     */
    get contentToken() {
        return this.content;
    }
    /**
     * Create new instance of the token from the given tokens.
     */
    static fromTokens(startMarkerTokens, contentTokens, endMarkerTokens) {
        const range = BaseToken.fullRange([...startMarkerTokens, ...endMarkerTokens]);
        return new FrontMatterHeader(range, FrontMatterMarker.fromTokens(startMarkerTokens), new Text(contentTokens), FrontMatterMarker.fromTokens(endMarkerTokens));
    }
    /**
     * Returns a string representation of the token.
     */
    toString() {
        return `frontmatter("${this.shortText()}")${this.range}`;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZnJvbnRNYXR0ZXJIZWFkZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9hZHZpa2FyL0RvY3VtZW50cy9hcmNoaXRlY3QvYXJjaDIvQXJjaElERS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2NvbW1vbi9wcm9tcHRTeW50YXgvY29kZWNzL2Jhc2UvbWFya2Rvd25FeHRlbnNpb25zQ29kZWMvdG9rZW5zL2Zyb250TWF0dGVySGVhZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUUxQyxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDL0MsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFFdkUsT0FBTyxFQUFFLGlCQUFpQixFQUFnQixNQUFNLHdCQUF3QixDQUFDO0FBRXpFOztHQUVHO0FBQ0gsTUFBTSxPQUFPLGlCQUFrQixTQUFRLHVCQUF1QjtJQUM3RCxZQUNDLEtBQVksRUFDSSxXQUE4QixFQUM5QixPQUFhLEVBQ2IsU0FBNEI7UUFFNUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBSkcsZ0JBQVcsR0FBWCxXQUFXLENBQW1CO1FBQzlCLFlBQU8sR0FBUCxPQUFPLENBQU07UUFDYixjQUFTLEdBQVQsU0FBUyxDQUFtQjtJQUc3QyxDQUFDO0lBRUQ7O09BRUc7SUFDSCxJQUFXLElBQUk7UUFDZCxNQUFNLElBQUksR0FBYTtZQUN0QixJQUFJLENBQUMsV0FBVyxDQUFDLElBQUk7WUFDckIsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJO1lBQ2pCLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSTtTQUNuQixDQUFDO1FBRUYsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBQ3RCLENBQUM7SUFFRDs7T0FFRztJQUNILElBQVcsWUFBWTtRQUN0QixPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDO0lBQzNCLENBQUM7SUFFRDs7T0FFRztJQUNILElBQVcsWUFBWTtRQUN0QixPQUFPLElBQUksQ0FBQyxPQUFPLENBQUM7SUFDckIsQ0FBQztJQUVEOztPQUVHO0lBQ0ksTUFBTSxDQUFDLFVBQVUsQ0FDdkIsaUJBQTBDLEVBQzFDLGFBQTZDLEVBQzdDLGVBQXdDO1FBRXhDLE1BQU0sS0FBSyxHQUFHLFNBQVMsQ0FBQyxTQUFTLENBQ2hDLENBQUMsR0FBRyxpQkFBaUIsRUFBRSxHQUFHLGVBQWUsQ0FBQyxDQUMxQyxDQUFDO1FBRUYsT0FBTyxJQUFJLGlCQUFpQixDQUMzQixLQUFLLEVBQ0wsaUJBQWlCLENBQUMsVUFBVSxDQUFDLGlCQUFpQixDQUFDLEVBQy9DLElBQUksSUFBSSxDQUFDLGFBQWEsQ0FBQyxFQUN2QixpQkFBaUIsQ0FBQyxVQUFVLENBQUMsZUFBZSxDQUFDLENBQzdDLENBQUM7SUFDSCxDQUFDO0lBRUQ7O09BRUc7SUFDYSxRQUFRO1FBQ3ZCLE9BQU8sZ0JBQWdCLElBQUksQ0FBQyxTQUFTLEVBQUUsS0FBSyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7SUFDMUQsQ0FBQztDQUNEIn0=