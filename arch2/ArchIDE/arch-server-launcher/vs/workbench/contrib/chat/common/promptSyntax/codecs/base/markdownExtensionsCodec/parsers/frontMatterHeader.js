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
import { Dash } from '../../simpleCodec/tokens/dash.js';
import { NewLine } from '../../linesCodec/tokens/newLine.js';
import { FrontMatterHeader } from '../tokens/frontMatterHeader.js';
import { assertDefined } from '../../../../../../../../../base/common/types.js';
import { assert, assertNever } from '../../../../../../../../../base/common/assert.js';
import { CarriageReturn } from '../../linesCodec/tokens/carriageReturn.js';
import { FrontMatterMarker } from '../tokens/frontMatterMarker.js';
import { assertNotConsumed, ParserBase } from '../../simpleCodec/parserBase.js';
/**
 * Parses the start marker of a Front Matter header.
 */
export class PartialFrontMatterStartMarker extends ParserBase {
    constructor(token) {
        const { range } = token;
        assert(range.startLineNumber === 1, `Front Matter header must start at the first line, but it starts at line #${range.startLineNumber}.`);
        assert(range.startColumn === 1, `Front Matter header must start at the beginning of the line, but it starts at ${range.startColumn}.`);
        super([token]);
    }
    accept(token) {
        const previousToken = this.currentTokens[this.currentTokens.length - 1];
        // collect a sequence of dash tokens that may end with a CR token
        if ((token instanceof Dash) || (token instanceof CarriageReturn)) {
            // a dash or CR tokens can go only after another dash token
            if ((previousToken instanceof Dash) === false) {
                this.isConsumed = true;
                return {
                    result: 'failure',
                    wasTokenConsumed: false,
                };
            }
            this.currentTokens.push(token);
            return {
                result: 'success',
                wasTokenConsumed: true,
                nextParser: this,
            };
        }
        // stop collecting dash tokens when a new line token is encountered
        if (token instanceof NewLine) {
            this.isConsumed = true;
            return {
                result: 'success',
                wasTokenConsumed: true,
                nextParser: new PartialFrontMatterHeader(FrontMatterMarker.fromTokens([
                    ...this.currentTokens,
                    token,
                ])),
            };
        }
        // any other token is invalid for the `start marker`
        this.isConsumed = true;
        return {
            result: 'failure',
            wasTokenConsumed: false,
        };
    }
    /**
     * Check if provided dash token can be a start of a Front Matter header.
     */
    static mayStartHeader(token) {
        return (token instanceof Dash)
            && (token.range.startLineNumber === 1)
            && (token.range.startColumn === 1);
    }
}
__decorate([
    assertNotConsumed
], PartialFrontMatterStartMarker.prototype, "accept", null);
/**
 * Parses a Front Matter header that already has a start marker
 * and possibly some content that follows.
 */
export class PartialFrontMatterHeader extends ParserBase {
    constructor(startMarker) {
        super([]);
        this.startMarker = startMarker;
    }
    get tokens() {
        const endMarkerTokens = (this.maybeEndMarker !== undefined)
            ? this.maybeEndMarker.tokens
            : [];
        return [
            ...this.startMarker.tokens,
            ...this.currentTokens,
            ...endMarkerTokens,
        ];
    }
    /**
     * Convert the current token sequence into a {@link FrontMatterHeader} token.
     *
     * Note! that this method marks the current parser object as "consumed"
     *       hence it should not be used after this method is called.
     */
    asFrontMatterHeader() {
        assertDefined(this.maybeEndMarker, 'Cannot convert to Front Matter header token without an end marker.');
        assert(this.maybeEndMarker.dashCount === this.startMarker.dashTokens.length, [
            'Start and end markers must have the same number of dashes',
            `, got ${this.startMarker.dashTokens.length} / ${this.maybeEndMarker.dashCount}.`,
        ].join(''));
        this.isConsumed = true;
        return FrontMatterHeader.fromTokens(this.startMarker.tokens, this.currentTokens, this.maybeEndMarker.tokens);
    }
    accept(token) {
        // if in the mode of parsing the end marker sequence, forward
        // the token to the current end marker parser instance
        if (this.maybeEndMarker !== undefined) {
            return this.acceptEndMarkerToken(token);
        }
        // collect all tokens until a `dash token at the beginning of a line` is found
        if (((token instanceof Dash) === false) || (token.range.startColumn !== 1)) {
            this.currentTokens.push(token);
            return {
                result: 'success',
                wasTokenConsumed: true,
                nextParser: this,
            };
        }
        // a dash token at the beginning of the line might be a start of the `end marker`
        // sequence of the front matter header, hence initialize appropriate parser object
        assert(this.maybeEndMarker === undefined, `End marker parser must not be present.`);
        this.maybeEndMarker = new PartialFrontMatterEndMarker(token);
        return {
            result: 'success',
            wasTokenConsumed: true,
            nextParser: this,
        };
    }
    /**
     * When a end marker parser is present, we pass all tokens to it
     * until it is completes the parsing process(either success or failure).
     */
    acceptEndMarkerToken(token) {
        assertDefined(this.maybeEndMarker, `Partial end marker parser must be initialized.`);
        // if we have a partial end marker, we are in the process of parsing
        // the end marker, so just pass the token to it and return
        const acceptResult = this.maybeEndMarker.accept(token);
        const { result, wasTokenConsumed } = acceptResult;
        if (result === 'success') {
            const { nextParser } = acceptResult;
            const endMarkerParsingComplete = (nextParser instanceof FrontMatterMarker);
            if (endMarkerParsingComplete === false) {
                return {
                    result: 'success',
                    wasTokenConsumed,
                    nextParser: this,
                };
            }
            const endMarker = nextParser;
            // start and end markers must have the same number of dashes, hence
            // if they don't match, we would like to continue parsing the header
            // until we find an end marker with the same number of dashes
            if (endMarker.dashTokens.length !== this.startMarker.dashTokens.length) {
                return this.handleEndMarkerParsingFailure(endMarker.tokens, wasTokenConsumed);
            }
            this.isConsumed = true;
            return {
                result: 'success',
                wasTokenConsumed: true,
                nextParser: FrontMatterHeader.fromTokens(this.startMarker.tokens, this.currentTokens, this.maybeEndMarker.tokens),
            };
        }
        // if failed to parse the end marker, we would like to continue parsing
        // the header until we find a valid end marker
        if (result === 'failure') {
            return this.handleEndMarkerParsingFailure(this.maybeEndMarker.tokens, wasTokenConsumed);
        }
        assertNever(result, `Unexpected result '${result}' while parsing the end marker.`);
    }
    /**
     * On failure to parse the end marker, we need to continue parsing
     * the header because there might be another valid end marker in
     * the stream of tokens. Therefore we copy over the end marker tokens
     * into the list of "content" tokens and reset the end marker parser.
     */
    handleEndMarkerParsingFailure(tokens, wasTokenConsumed) {
        this.currentTokens.push(...tokens);
        delete this.maybeEndMarker;
        return {
            result: 'success',
            wasTokenConsumed,
            nextParser: this,
        };
    }
}
__decorate([
    assertNotConsumed
], PartialFrontMatterHeader.prototype, "accept", null);
/**
 * Parser the end marker sequence of a Front Matter header.
 */
class PartialFrontMatterEndMarker extends ParserBase {
    constructor(token) {
        const { range } = token;
        assert(range.startColumn === 1, `Front Matter header must start at the beginning of the line, but it starts at ${range.startColumn}.`);
        super([token]);
    }
    /**
     * Number of dashes in the marker.
     */
    get dashCount() {
        return this.tokens
            .filter((token) => { return token instanceof Dash; })
            .length;
    }
    accept(token) {
        const previousToken = this.currentTokens[this.currentTokens.length - 1];
        // collect a sequence of dash tokens that may end with a CR token
        if ((token instanceof Dash) || (token instanceof CarriageReturn)) {
            // a dash or CR tokens can go only after another dash token
            if ((previousToken instanceof Dash) === false) {
                this.isConsumed = true;
                return {
                    result: 'failure',
                    wasTokenConsumed: false,
                };
            }
            this.currentTokens.push(token);
            return {
                result: 'success',
                wasTokenConsumed: true,
                nextParser: this,
            };
        }
        // stop collecting dash tokens when a new line token is encountered
        if (token instanceof NewLine) {
            this.isConsumed = true;
            this.currentTokens.push(token);
            return {
                result: 'success',
                wasTokenConsumed: true,
                nextParser: FrontMatterMarker.fromTokens([
                    ...this.currentTokens,
                ]),
            };
        }
        // any other token is invalid for the `start marker`
        this.isConsumed = true;
        return {
            result: 'failure',
            wasTokenConsumed: false,
        };
    }
}
__decorate([
    assertNotConsumed
], PartialFrontMatterEndMarker.prototype, "accept", null);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZnJvbnRNYXR0ZXJIZWFkZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9hZHZpa2FyL0RvY3VtZW50cy9hcmNoaXRlY3QvYXJjaDIvQXJjaElERS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2NvbW1vbi9wcm9tcHRTeW50YXgvY29kZWNzL2Jhc2UvbWFya2Rvd25FeHRlbnNpb25zQ29kZWMvcGFyc2Vycy9mcm9udE1hdHRlckhlYWRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDeEQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQzdELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ25FLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxpREFBaUQsQ0FBQztBQUVoRixPQUFPLEVBQUUsTUFBTSxFQUFFLFdBQVcsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQ3ZGLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUMzRSxPQUFPLEVBQUUsaUJBQWlCLEVBQWdCLE1BQU0sZ0NBQWdDLENBQUM7QUFDakYsT0FBTyxFQUFFLGlCQUFpQixFQUF1QixVQUFVLEVBQXNCLE1BQU0saUNBQWlDLENBQUM7QUFFekg7O0dBRUc7QUFDSCxNQUFNLE9BQU8sNkJBQThCLFNBQVEsVUFBa0Y7SUFDcEksWUFBWSxLQUFXO1FBQ3RCLE1BQU0sRUFBRSxLQUFLLEVBQUUsR0FBRyxLQUFLLENBQUM7UUFFeEIsTUFBTSxDQUNMLEtBQUssQ0FBQyxlQUFlLEtBQUssQ0FBQyxFQUMzQiw0RUFBNEUsS0FBSyxDQUFDLGVBQWUsR0FBRyxDQUNwRyxDQUFDO1FBRUYsTUFBTSxDQUNMLEtBQUssQ0FBQyxXQUFXLEtBQUssQ0FBQyxFQUN2QixpRkFBaUYs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