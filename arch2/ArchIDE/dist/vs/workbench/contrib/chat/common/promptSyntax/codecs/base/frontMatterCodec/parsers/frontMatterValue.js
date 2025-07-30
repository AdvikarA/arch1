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
import { asBoolean, FrontMatterBoolean } from '../tokens/frontMatterBoolean.js';
import { FrontMatterValueToken } from '../tokens/frontMatterToken.js';
import { PartialFrontMatterSequence } from './frontMatterSequence.js';
import { FrontMatterSequence } from '../tokens/frontMatterSequence.js';
import { Word, Quote, DoubleQuote, LeftBracket } from '../../simpleCodec/tokens/tokens.js';
import { assertNotConsumed, ParserBase } from '../../simpleCodec/parserBase.js';
/**
 * List of tokens that can start a "value" sequence.
 *
 * - {@link Word} - can be a `boolean` value
 * - {@link Quote}, {@link DoubleQuote} - can start a `string` value
 * - {@link LeftBracket} - can start an `array` value
 */
export const VALID_VALUE_START_TOKENS = Object.freeze([
    Quote,
    DoubleQuote,
    LeftBracket,
]);
/**
 * Parser responsible for parsing a "value" sequence in a Front Matter header.
 */
export class PartialFrontMatterValue extends ParserBase {
    /**
     * Get the tokens that were accumulated so far.
     */
    get tokens() {
        if (this.currentValueParser === undefined) {
            return [];
        }
        return this.currentValueParser.tokens;
    }
    constructor(factory, 
    /**
     * Callback function to pass to the {@link PartialFrontMatterSequence}
     * if the current "value" sequence is not of a specific type.
     */
    shouldStop) {
        super();
        this.factory = factory;
        this.shouldStop = shouldStop;
    }
    accept(token) {
        if (this.currentValueParser !== undefined) {
            const acceptResult = this.currentValueParser.accept(token);
            const { result, wasTokenConsumed } = acceptResult;
            // current value parser is consumed with its child value parser
            this.isConsumed = this.currentValueParser.consumed;
            if (result === 'success') {
                const { nextParser } = acceptResult;
                if (nextParser instanceof FrontMatterValueToken) {
                    return {
                        result: 'success',
                        nextParser,
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
            return {
                result: 'failure',
                wasTokenConsumed,
            };
        }
        // if the first token represents a `quote` character, try to parse a string value
        if ((token instanceof Quote) || (token instanceof DoubleQuote)) {
            this.currentValueParser = this.factory.createString(token);
            return {
                result: 'success',
                nextParser: this,
                wasTokenConsumed: true,
            };
        }
        // if the first token represents a `[` character, try to parse an array value
        if (token instanceof LeftBracket) {
            this.currentValueParser = this.factory.createArray(token);
            return {
                result: 'success',
                nextParser: this,
                wasTokenConsumed: true,
            };
        }
        // if the first token represents a `word` try to parse a boolean
        const maybeBoolean = FrontMatterBoolean.tryFromToken(token);
        if (maybeBoolean !== null) {
            this.isConsumed = true;
            return {
                result: 'success',
                nextParser: maybeBoolean,
                wasTokenConsumed: true,
            };
        }
        // in all other cases, collect all the subsequent tokens into
        // a generic sequence of tokens until stopped by the `this.shouldStop`
        // callback or the call to the 'this.asSequenceToken' method
        this.currentValueParser = this.factory.createSequence(this.shouldStop);
        return this.accept(token);
    }
    /**
     * Check if provided token can be a start of a "value" sequence.
     * See {@link VALID_VALUE_START_TOKENS} for the list of valid tokens.
     */
    static isValueStartToken(token) {
        for (const ValidToken of VALID_VALUE_START_TOKENS) {
            if (token instanceof ValidToken) {
                return true;
            }
        }
        if ((token instanceof Word) && (asBoolean(token) !== null)) {
            return true;
        }
        return false;
    }
    /**
     * Check if the current 'value' sequence does not have a specific type
     * and is represented by a generic sequence of tokens ({@link PartialFrontMatterSequence}).
     */
    get isSequence() {
        if (this.currentValueParser === undefined) {
            return false;
        }
        return (this.currentValueParser instanceof PartialFrontMatterSequence);
    }
    /**
     * Convert current parser into a generic sequence of tokens.
     */
    asSequenceToken() {
        this.isConsumed = true;
        return new FrontMatterSequence(this.tokens);
    }
}
__decorate([
    assertNotConsumed
], PartialFrontMatterValue.prototype, "accept", null);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZnJvbnRNYXR0ZXJWYWx1ZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL2FkdmlrYXIvRG9jdW1lbnRzL2FyY2hpdGVjdC9hcmNoMi9BcmNoSURFL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvY29tbW9uL3Byb21wdFN5bnRheC9jb2RlY3MvYmFzZS9mcm9udE1hdHRlckNvZGVjL3BhcnNlcnMvZnJvbnRNYXR0ZXJWYWx1ZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7OztBQUtoRyxPQUFPLEVBQUUsU0FBUyxFQUFFLGtCQUFrQixFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDaEYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDdEUsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFDdEUsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFFdkUsT0FBTyxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsV0FBVyxFQUFFLFdBQVcsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQzNGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxVQUFVLEVBQXNCLE1BQU0saUNBQWlDLENBQUM7QUFHcEc7Ozs7OztHQU1HO0FBQ0gsTUFBTSxDQUFDLE1BQU0sd0JBQXdCLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQztJQUNyRCxLQUFLO0lBQ0wsV0FBVztJQUNYLFdBQVc7Q0FDWCxDQUFDLENBQUM7QUFPSDs7R0FFRztBQUNILE1BQU0sT0FBTyx1QkFBd0IsU0FBUSxVQUFnRjtJQU81SDs7T0FFRztJQUNILElBQW9CLE1BQU07UUFDekIsSUFBSSxJQUFJLENBQUMsa0JBQWtCLEtBQUssU0FBUyxFQUFFLENBQUM7WUFDM0MsT0FBTyxFQUFFLENBQUM7UUFDWCxDQUFDO1FBRUQsT0FBTyxJQUFJLENBQUMsa0JBQWtCLENBQUMsTUFBTSxD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