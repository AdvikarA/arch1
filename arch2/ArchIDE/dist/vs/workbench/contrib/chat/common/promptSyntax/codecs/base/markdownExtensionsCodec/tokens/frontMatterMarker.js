/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { BaseToken } from '../../baseToken.js';
import { Dash } from '../../simpleCodec/tokens/dash.js';
import { MarkdownExtensionsToken } from './markdownExtensionsToken.js';
/**
 * Marker for the start and end of a Front Matter header.
 */
export class FrontMatterMarker extends MarkdownExtensionsToken {
    /**
     * Returns complete text representation of the token.
     */
    get text() {
        return BaseToken.render(this.tokens);
    }
    /**
     * List of {@link Dash} tokens in the marker.
     */
    get dashTokens() {
        return this.tokens
            .filter((token) => { return token instanceof Dash; });
    }
    constructor(range, tokens) {
        super(range);
        this.tokens = tokens;
    }
    /**
     * Create new instance of the token from a provided
     * list of tokens.
     */
    static fromTokens(tokens) {
        const range = BaseToken.fullRange(tokens);
        return new FrontMatterMarker(range, tokens);
    }
    toString() {
        return `frontmatter-marker(${this.dashTokens.length}:${this.range})`;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZnJvbnRNYXR0ZXJNYXJrZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9hZHZpa2FyL0RvY3VtZW50cy9hcmNoaXRlY3QvYXJjaDIvQXJjaElERS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2NvbW1vbi9wcm9tcHRTeW50YXgvY29kZWNzL2Jhc2UvbWFya2Rvd25FeHRlbnNpb25zQ29kZWMvdG9rZW5zL2Zyb250TWF0dGVyTWFya2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUMvQyxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFFeEQsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFRdkU7O0dBRUc7QUFDSCxNQUFNLE9BQU8saUJBQWtCLFNBQVEsdUJBQXVCO0lBQzdEOztPQUVHO0lBQ0gsSUFBVyxJQUFJO1FBQ2QsT0FBTyxTQUFTLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztJQUN0QyxDQUFDO0lBRUQ7O09BRUc7SUFDSCxJQUFXLFVBQVU7UUFDcEIsT0FBTyxJQUFJLENBQUMsTUFBTTthQUNoQixNQUFNLENBQUMsQ0FBQyxLQUFLLEVBQUUsRUFBRSxHQUFHLE9BQU8sS0FBSyxZQUFZLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3hELENBQUM7SUFFRCxZQUNDLEtBQVksRUFDSSxNQUErQjtRQUUvQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUM7UUFGRyxXQUFNLEdBQU4sTUFBTSxDQUF5QjtJQUdoRCxDQUFDO0lBRUQ7OztPQUdHO0lBQ0ksTUFBTSxDQUFDLFVBQVUsQ0FDdkIsTUFBK0I7UUFFL0IsTUFBTSxLQUFLLEdBQUcsU0FBUyxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUUxQyxPQUFPLElBQUksaUJBQWlCLENBQUMsS0FBSyxFQUFFLE1BQU0sQ0FBQyxDQUFDO0lBQzdDLENBQUM7SUFFTSxRQUFRO1FBQ2QsT0FBTyxzQkFBc0IsSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLElBQUksSUFBSSxDQUFDLEtBQUssR0FBRyxDQUFDO0lBQ3RFLENBQUM7Q0FDRCJ9