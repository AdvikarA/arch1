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
import { assert } from '../../../../../../../../../../base/common/assert.js';
import { Colon, SpacingToken } from '../../../simpleCodec/tokens/tokens.js';
import { FrontMatterRecordName, FrontMatterRecordDelimiter } from '../../tokens/index.js';
import { assertNotConsumed, ParserBase } from '../../../simpleCodec/parserBase.js';
/**
 * Parser for a record `name` with the `: ` delimiter.
 *
 *  * E.g., `name:` in the example below:
 *
 * ```
 * name: 'value'
 * ```
 */
export class PartialFrontMatterRecordNameWithDelimiter extends ParserBase {
    constructor(factory, tokens) {
        super([...tokens]);
        this.factory = factory;
    }
    accept(token) {
        const previousToken = this.currentTokens[this.currentTokens.length - 1];
        const isSpacingToken = (token instanceof SpacingToken);
        // delimiter must always be a `:` followed by a "space" character
        // once we encounter that sequence, we can transition to the next parser
        if (isSpacingToken && (previousToken instanceof Colon)) {
            const recordDelimiter = new FrontMatterRecordDelimiter([
                previousToken,
                token,
            ]);
            const recordName = this.currentTokens[0];
            // sanity check
            assert(recordName instanceof FrontMatterRecordName, `Expected a front matter record name, got '${recordName}'.`);
            this.isConsumed = true;
            return {
                result: 'success',
                nextParser: this.factory.createRecord([recordName, recordDelimiter]),
                wasTokenConsumed: true,
            };
        }
        // allow some spacing before the colon delimiter
        if (token instanceof SpacingToken) {
            this.currentTokens.push(token);
            return {
                result: 'success',
                nextParser: this,
                wasTokenConsumed: true,
            };
        }
        // include the colon delimiter
        if (token instanceof Colon) {
            this.currentTokens.push(token);
            return {
                result: 'success',
                nextParser: this,
                wasTokenConsumed: true,
            };
        }
        // otherwise fail due to the unexpected token type between
        // record name and record name delimiter tokens
        this.isConsumed = true;
        return {
            result: 'failure',
            wasTokenConsumed: false,
        };
    }
}
__decorate([
    assertNotConsumed
], PartialFrontMatterRecordNameWithDelimiter.prototype, "accept", null);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZnJvbnRNYXR0ZXJSZWNvcmROYW1lV2l0aERlbGltaXRlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL2FkdmlrYXIvRG9jdW1lbnRzL2FyY2hpdGVjdC9hcmNoMi9BcmNoSURFL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvY29tbW9uL3Byb21wdFN5bnRheC9jb2RlY3MvYmFzZS9mcm9udE1hdHRlckNvZGVjL3BhcnNlcnMvZnJvbnRNYXR0ZXJSZWNvcmQvZnJvbnRNYXR0ZXJSZWNvcmROYW1lV2l0aERlbGltaXRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0scURBQXFELENBQUM7QUFFN0UsT0FBTyxFQUFFLEtBQUssRUFBRSxZQUFZLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUU1RSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUMxRixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsVUFBVSxFQUEyQixNQUFNLG9DQUFvQyxDQUFDO0FBYTVHOzs7Ozs7OztHQVFHO0FBQ0gsTUFBTSxPQUFPLHlDQUEwQyxTQUFRLFVBRzlEO0lBQ0EsWUFDa0IsT0FBaUMsRUFDbEQsTUFBd0Q7UUFFeEQsS0FBSyxDQUFDLENBQUMsR0FBRyxNQUFNLENBQUMsQ0FBQyxDQUFDO1FBSEYsWUFBTyxHQUFQLE9BQU8sQ0FBMEI7SUFJbkQsQ0FBQztJQUdNLE1BQU0sQ0FBQyxLQUEwQjtRQUN2QyxNQUFNLGFBQWEsR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDO1FBQ3hFLE1BQU0sY0FBYyxHQUFHLENBQUMsS0FBSyxZQUFZLFlBQVksQ0FBQyxDQUFDO1FBRXZELGlFQUFpRTtRQUNqRSx3RUFBd0U7UUFDeEUsSUFBSSxjQUFjLElBQUksQ0FBQyxhQUFhLFlBQVksS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUN4RCxNQUFNLGVBQWUsR0FBRyxJQUFJLDBCQUEwQixDQUFDO2dCQUN0RCxhQUFhO2dCQUNiLEtBQUs7YUFDTCxDQUFDLENBQUM7WUFFSCxNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBRXpDLGVBQWU7WUFDZixNQUFNLENBQ0wsVUFBVSxZQUFZLHFCQUFxQixFQUMzQyw2Q0FBNkMsVUFBVSxJQUFJLENBQzNELENBQUM7WUFFRixJQUFJLENBQUMsVUFBVSxHQUFHLElBQUksQ0FBQztZQUN2QixPQUFPO2dCQUNOLE1BQU0sRUFBRSxTQUFTO2dCQUNqQixVQUFVLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQ3BDLENBQUMsVUFBVSxFQUFFLGVBQWUsQ0FBQyxDQUM3QjtnQkFDRCxnQkFBZ0IsRUFBRSxJQUFJO2FBQ3RCLENBQUM7UUFDSCxDQUFDO1FBRUQsZ0RBQWdEO1FBQ2hELElBQUksS0FBSyxZQUFZLFlBQVksRUFBRSxDQUFDO1lBQ25DLElBQUksQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBRS9CLE9BQU87Z0JBQ04sTUFBTSxFQUFFLFNBQVM7Z0JBQ2pCLFVBQVUsRUFBRSxJQUFJO2dCQUNoQixnQkFBZ0IsRUFBRSxJQUFJO2FBQ3RCLENBQUM7UUFDSCxDQUFDO1FBRUQsOEJBQThCO1FBQzlCLElBQUksS0FBSyxZQUFZLEtBQUssRUFBRSxDQUFDO1lBQzVCLElBQUksQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBRS9CLE9BQU87Z0JBQ04sTUFBTSxFQUFFLFNBQVM7Z0JBQ2pCLFVBQVUsRUFBRSxJQUFJO2dCQUNoQixnQkFBZ0IsRUFBRSxJQUFJO2FBQ3RCLENBQUM7UUFDSCxDQUFDO1FBRUQsMERBQTBEO1FBQzFELCtDQUErQztRQUMvQyxJQUFJLENBQUMsVUFBVSxHQUFHLElBQUksQ0FBQztRQUN2QixPQUFPO1lBQ04sTUFBTSxFQUFFLFNBQVM7WUFDakIsZ0JBQWdCLEVBQUUsS0FBSztTQUN2QixDQUFDO0lBQ0gsQ0FBQztDQUNEO0FBNURPO0lBRE4saUJBQWlCO3VFQTREakIifQ==