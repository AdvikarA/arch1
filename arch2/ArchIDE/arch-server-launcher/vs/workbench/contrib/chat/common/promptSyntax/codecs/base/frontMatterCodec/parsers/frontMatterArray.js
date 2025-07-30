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
import { FrontMatterArray } from '../tokens/frontMatterArray.js';
import { assertDefined } from '../../../../../../../../../base/common/types.js';
import { VALID_INTER_RECORD_SPACING_TOKENS } from '../constants.js';
import { FrontMatterValueToken } from '../tokens/frontMatterToken.js';
import { FrontMatterSequence } from '../tokens/frontMatterSequence.js';
import { Comma, RightBracket } from '../../simpleCodec/tokens/tokens.js';
import { assertNotConsumed, ParserBase } from '../../simpleCodec/parserBase.js';
/**
 * List of tokens that can go in-between array items
 * and array brackets.
 */
const VALID_DELIMITER_TOKENS = Object.freeze([
    ...VALID_INTER_RECORD_SPACING_TOKENS,
    Comma,
]);
/**
 * Responsible for parsing an array syntax (or "inline sequence"
 * in YAML terms), e.g. `[1, '2', true, 2.54]`
*/
export class PartialFrontMatterArray extends ParserBase {
    constructor(factory, startToken) {
        super([startToken]);
        this.factory = factory;
        this.startToken = startToken;
        /**
         * Whether an array item is allowed in the current position of the token
         * sequence. E.g., items are allowed after a command or a open bracket,
         * but not immediately after another item in the array.
         */
        this.arrayItemAllowed = true;
    }
    accept(token) {
        if (this.currentValueParser !== undefined) {
            const acceptResult = this.currentValueParser.accept(token);
            const { result, wasTokenConsumed } = acceptResult;
            if (result === 'failure') {
                this.isConsumed = true;
                return {
                    result: 'failure',
                    wasTokenConsumed,
                };
            }
            const { nextParser } = acceptResult;
            if (nextParser instanceof FrontMatterValueToken) {
                this.currentTokens.push(nextParser);
                delete this.currentValueParser;
                // if token was not consume, call the `accept()` method
                // recursively so that the current parser can re-process
                // the token (e.g., a comma or a closing square bracket)
                if (wasTokenConsumed === false) {
                    return this.accept(token);
                }
                return {
                    result: 'success',
                    nextParser: this,
                    wasTokenConsumed,
                };
            }
            this.currentValueParser = nextParser;
            return {
                result: 'success',
                nextParser: this,
                wasTokenConsumed,
            };
        }
        if (token instanceof RightBracket) {
            // sanity check in case this block moves around
            // to a different place in the code
            assert(this.currentValueParser === undefined, `Unexpected end of array. Last value is not finished.`);
            this.currentTokens.push(token);
            this.isConsumed = true;
            return {
                result: 'success',
                nextParser: this.asArrayToken(),
                wasTokenConsumed: true,
            };
        }
        // iterate until a valid value start token is found
        for (const ValidToken of VALID_DELIMITER_TOKENS) {
            if (token instanceof ValidToken) {
                this.currentTokens.push(token);
                if ((this.arrayItemAllowed === false) && token instanceof Comma) {
                    this.arrayItemAllowed = true;
                }
                return {
                    result: 'success',
                    nextParser: this,
                    wasTokenConsumed: true,
                };
            }
        }
        // is an array item value is allowed at this position, create a new
        // value parser and start the value parsing process using it
        if (this.arrayItemAllowed === true) {
            this.currentValueParser = this.factory.createValue((currentToken) => {
                // comma or a closing square bracket must stop the parsing
                // process of the value represented by a generic sequence of tokens
                return ((currentToken instanceof RightBracket)
                    || (currentToken instanceof Comma));
            });
            this.arrayItemAllowed = false;
            return this.accept(token);
        }
        // in all other cases fail because of the unexpected token type
        this.isConsumed = true;
        return {
            result: 'failure',
            wasTokenConsumed: false,
        };
    }
    /**
     * Convert current parser into a {@link FrontMatterArray} token,
     * if possible.
     *
     * @throws if the last token in the accumulated token list
     * 		   is not a closing bracket ({@link RightBracket}).
     */
    asArrayToken() {
        const endToken = this.currentTokens[this.currentTokens.length - 1];
        assertDefined(endToken, 'No tokens found.');
        assert(endToken instanceof RightBracket, 'Cannot find a closing bracket of the array.');
        const valueTokens = [];
        for (const currentToken of this.currentTokens) {
            if ((currentToken instanceof FrontMatterValueToken) === false) {
                continue;
            }
            // the generic sequence tokens can have trailing spacing tokens,
            // hence trim them to ensure the array contains only "clean" values
            if (currentToken instanceof FrontMatterSequence) {
                currentToken.trimEnd();
            }
            valueTokens.push(currentToken);
        }
        this.isConsumed = true;
        return new FrontMatterArray([
            this.startToken,
            ...valueTokens,
            endToken,
        ]);
    }
}
__decorate([
    assertNotConsumed
], PartialFrontMatterArray.prototype, "accept", null);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZnJvbnRNYXR0ZXJBcnJheS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL2FkdmlrYXIvRG9jdW1lbnRzL2FyY2hpdGVjdC9hcmNoMi9BcmNoSURFL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvY29tbW9uL3Byb21wdFN5bnRheC9jb2RlY3MvYmFzZS9mcm9udE1hdHRlckNvZGVjL3BhcnNlcnMvZnJvbnRNYXR0ZXJBcnJheS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFFMUUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDakUsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLGlEQUFpRCxDQUFDO0FBQ2hGLE9BQU8sRUFBRSxpQ0FBaUMsRUFBRSxNQUFNLGlCQUFpQixDQUFDO0FBQ3BFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQ3RFLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBRXZFLE9BQU8sRUFBRSxLQUFLLEVBQWUsWUFBWSxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDdEYsT0FBTyxFQUFFLGlCQUFpQixFQUFFLFVBQVUsRUFBc0IsTUFBTSxpQ0FBaUMsQ0FBQztBQUdwRzs7O0dBR0c7QUFDSCxNQUFNLHNCQUFzQixHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUM7SUFDNUMsR0FBRyxpQ0FBaUM7SUFDcEMsS0FBSztDQUNMLENBQUMsQ0FBQztBQUVIOzs7RUFHRTtBQUNGLE1BQU0sT0FBTyx1QkFBd0IsU0FBUSxVQUEyRTtJQWF2SCxZQUNrQixPQUFpQyxFQUNqQyxVQUF1QjtRQUV4QyxLQUFLLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDO1FBSEgsWUFBTyxHQUFQLE9BQU8sQ0FBMEI7UUFDakMs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