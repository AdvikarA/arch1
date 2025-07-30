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
import { NewLine } from '../../../linesCodec/tokens/newLine.js';
import { PartialFrontMatterValue } from '../frontMatterValue.js';
import { assertNever } from '../../../../../../../../../../base/common/assert.js';
import { assertDefined } from '../../../../../../../../../../base/common/types.js';
import { PartialFrontMatterSequence } from '../frontMatterSequence.js';
import { CarriageReturn } from '../../../linesCodec/tokens/carriageReturn.js';
import { Word, FormFeed, SpacingToken } from '../../../simpleCodec/tokens/tokens.js';
import { assertNotConsumed, ParserBase } from '../../../simpleCodec/parserBase.js';
import { FrontMatterValueToken, FrontMatterRecord } from '../../tokens/index.js';
/**
 * Parser for a `record` inside a Front Matter header.
 *
 *  * E.g., `name: 'value'` in the example below:
 *
 * ```
 * ---
 * name: 'value'
 * isExample: true
 * ---
 * ```
 */
export class PartialFrontMatterRecord extends ParserBase {
    constructor(factory, tokens) {
        super(tokens);
        this.factory = factory;
        this.recordNameToken = tokens[0];
        this.recordDelimiterToken = tokens[1];
    }
    accept(token) {
        if (this.valueParser !== undefined) {
            const acceptResult = this.valueParser.accept(token);
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
                delete this.valueParser;
                this.isConsumed = true;
                try {
                    return {
                        result: 'success',
                        nextParser: new FrontMatterRecord([
                            this.recordNameToken,
                            this.recordDelimiterToken,
                            nextParser,
                        ]),
                        wasTokenConsumed,
                    };
                }
                catch (_error) {
                    return {
                        result: 'failure',
                        wasTokenConsumed,
                    };
                }
            }
            this.valueParser = nextParser;
            return {
                result: 'success',
                nextParser: this,
                wasTokenConsumed,
            };
        }
        // iterate until the first non-space token is found
        if (token instanceof SpacingToken) {
            this.currentTokens.push(token);
            return {
                result: 'success',
                nextParser: this,
                wasTokenConsumed: true,
            };
        }
        // if token can start a "value" sequence, parse the value
        if (PartialFrontMatterValue.isValueStartToken(token)) {
            this.valueParser = this.factory.createValue(shouldEndTokenSequence);
            return this.accept(token);
        }
        // in all other cases, collect all the subsequent tokens into
        // a "sequence of tokens" until a new line is found
        this.valueParser = this.factory.createSequence(shouldEndTokenSequence);
        // if we reached this "generic sequence" parser point, but the current token is
        // already of a type that stops such sequence, we must have accumulated some
        // spacing tokens, hence pass those to the parser and end the sequence immediately
        if (shouldEndTokenSequence(token)) {
            const spaceTokens = this.currentTokens
                .slice(this.startTokensCount);
            // if no space tokens accumulated at all, create an "empty" one this is needed
            // to ensure that the parser always has at least one token hence it can have
            // a valid range and can be interpreted as a real "value" token of the record
            if (spaceTokens.length === 0) {
                spaceTokens.push(Word.newOnLine('', token.range.startLineNumber, token.range.startColumn));
            }
            this.valueParser.addTokens(spaceTokens);
            return {
                result: 'success',
                nextParser: this.asRecordToken(),
                wasTokenConsumed: false,
            };
        }
        // otherwise use the "generic sequence" parser moving on
        return this.accept(token);
    }
    /**
     * Convert current parser into a {@link FrontMatterRecord} token.
     *
     * @throws if no current parser is present, or it is not of the {@link PartialFrontMatterValue}
     *         or {@link PartialFrontMatterSequence} types
     */
    asRecordToken() {
        assertDefined(this.valueParser, 'Current value parser must be defined.');
        if ((this.valueParser instanceof PartialFrontMatterValue)
            || (this.valueParser instanceof PartialFrontMatterSequence)) {
            const valueToken = this.valueParser.asSequenceToken();
            this.currentTokens.push(valueToken);
            this.isConsumed = true;
            return new FrontMatterRecord([
                this.recordNameToken,
                this.recordDelimiterToken,
                valueToken,
            ]);
        }
        assertNever(this.valueParser, `Unexpected value parser '${this.valueParser}'.`);
    }
}
__decorate([
    assertNotConsumed
], PartialFrontMatterRecord.prototype, "accept", null);
/**
 * Callback to check if a current token should end a
 * record value that is a generic sequence of tokens.
 */
function shouldEndTokenSequence(token) {
    return ((token instanceof NewLine)
        || (token instanceof CarriageReturn)
        || (token instanceof FormFeed));
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZnJvbnRNYXR0ZXJSZWNvcmQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9hZHZpa2FyL0RvY3VtZW50cy9hcmNoaXRlY3QvYXJjaDIvQXJjaElERS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2NvbW1vbi9wcm9tcHRTeW50YXgvY29kZWNzL2Jhc2UvZnJvbnRNYXR0ZXJDb2RlYy9wYXJzZXJzL2Zyb250TWF0dGVyUmVjb3JkL2Zyb250TWF0dGVyUmVjb3JkLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7O0FBR2hHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUNoRSxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQztBQUNqRSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0scURBQXFELENBQUM7QUFDbEYsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLG9EQUFvRCxDQUFDO0FBQ25GLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLDJCQUEyQixDQUFDO0FBQ3ZFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQztBQUU5RSxPQUFPLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxZQUFZLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUNyRixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsVUFBVSxFQUEyQixNQUFNLG9DQUFvQyxDQUFDO0FBQzVHLE9BQU8sRUFBRSxxQkFBcUIsRUFBcUQsaUJBQWlCLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQVFwSTs7Ozs7Ozs7Ozs7R0FXRztBQUNILE1BQU0sT0FBTyx3QkFBeUIsU0FBUSxVQUE0QztJQVd6RixZQUNrQixPQUFpQyxFQUNsRCxNQUEyRDtRQUUzRCxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUM7UUFIRyxZQUFPLEdBQVAsT0FBTyxDQUEwQjtRQUlsRCxJQUFJLENBQUMsZUFBZSxH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