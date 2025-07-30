/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { assert } from '../../../../../../../../../base/common/assert.js';
import { SimpleToken } from '../../simpleCodec/tokens/tokens.js';
import { assertDefined } from '../../../../../../../../../base/common/types.js';
import { FrontMatterString } from '../tokens/frontMatterString.js';
import { assertNotConsumed, ParserBase } from '../../simpleCodec/parserBase.js';
/**
 * Parser responsible for parsing a string value.
 */
export class PartialFrontMatterString extends ParserBase {
    constructor(startToken) {
        super([startToken]);
        this.startToken = startToken;
    }
    accept(token) {
        this.currentTokens.push(token);
        // iterate until a `matching end quote` is found
        if ((token instanceof SimpleToken) && (this.startToken.sameType(token))) {
            return {
                result: 'success',
                nextParser: this.asStringToken(),
                wasTokenConsumed: true,
            };
        }
        return {
            result: 'success',
            nextParser: this,
            wasTokenConsumed: true,
        };
    }
    /**
     * Convert the current parser into a {@link FrontMatterString} token,
     * if possible.
     *
     * @throws if the first and last tokens are not quote tokens of the same type.
     */
    asStringToken() {
        const endToken = this.currentTokens[this.currentTokens.length - 1];
        assertDefined(endToken, `No matching end token found.`);
        assert(this.startToken.sameType(endToken), `String starts with \`${this.startToken.text}\`, but ends with \`${endToken.text}\`.`);
        return new FrontMatterString([
            this.startToken,
            ...this.currentTokens
                .slice(1, this.currentTokens.length - 1),
            endToken,
        ]);
    }
}
__decorate([
    assertNotConsumed
], PartialFrontMatterString.prototype, "accept", null);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZnJvbnRNYXR0ZXJTdHJpbmcuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9hZHZpa2FyL0RvY3VtZW50cy9hcmNoaXRlY3QvYXJjaDIvQXJjaElERS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2NvbW1vbi9wcm9tcHRTeW50YXgvY29kZWNzL2Jhc2UvZnJvbnRNYXR0ZXJDb2RlYy9wYXJzZXJzL2Zyb250TWF0dGVyU3RyaW5nLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUMxRSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDakUsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLGlEQUFpRCxDQUFDO0FBRWhGLE9BQU8sRUFBRSxpQkFBaUIsRUFBb0IsTUFBTSxnQ0FBZ0MsQ0FBQztBQUNyRixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsVUFBVSxFQUEyQixNQUFNLGlDQUFpQyxDQUFDO0FBRXpHOztHQUVHO0FBQ0gsTUFBTSxPQUFPLHdCQUF5QixTQUFRLFVBQTBGO0lBQ3ZJLFlBQ2tCLFVBQXVCO1FBRXhDLEtBQUssQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUM7UUFGSCxlQUFVLEdBQVYsVUFBVSxDQUFhO0lBR3pDLENBQUM7SUFHTSxNQUFNLENBQUMsS0FBMEI7UUFDdkMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7UUFFL0IsZ0RBQWdEO1FBQ2hELElBQUksQ0FBQyxLQUFLLFlBQVksV0FBVyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUM7WUFDekUsT0FBTztnQkFDTixNQUFNLEVBQUUsU0FBUztnQkFDakIsVUFBVSxFQUFFLElBQUksQ0FBQyxhQUFhLEVBQUU7Z0JBQ2hDLGdCQUFnQixFQUFFLElBQUk7YUFDdEIsQ0FBQztRQUNILENBQUM7UUFFRCxPQUFPO1lBQ04sTUFBTSxFQUFFLFNBQVM7WUFDakIsVUFBVSxFQUFFLElBQUk7WUFDaEIsZ0JBQWdCLEVBQUUsSUFBSTtTQUN0QixDQUFDO0lBQ0gsQ0FBQztJQUVEOzs7OztPQUtHO0lBQ0ksYUFBYTtRQUNuQixNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDO1FBRW5FLGFBQWEsQ0FDWixRQUFRLEVBQ1IsOEJBQThCLENBQzlCLENBQUM7UUFFRixNQUFNLENBQ0wsSUFBSSxDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLEVBQ2xDLHdCQUF3QixJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksdUJBQXVCLFFBQVEsQ0FBQyxJQUFJLEtBQUssQ0FDckYsQ0FBQztRQUVGLE9BQU8sSUFBSSxpQkFBaUIsQ0FBQztZQUM1QixJQUFJLENBQUMsVUFBVTtZQUNmLEdBQUcsSUFBSSxDQUFDLGFBQWE7aUJBQ25CLEtBQUssQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLGFBQWEsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDO1lBQ3pDLFFBQVE7U0FDUixDQUFDLENBQUM7SUFDSixDQUFDO0NBQ0Q7QUE3Q087SUFETixpQkFBaUI7c0RBa0JqQiJ9