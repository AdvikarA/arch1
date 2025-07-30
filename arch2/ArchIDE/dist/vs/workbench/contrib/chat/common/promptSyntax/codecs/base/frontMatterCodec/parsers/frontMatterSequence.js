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
import { FrontMatterSequence } from '../tokens/frontMatterSequence.js';
import { assertNotConsumed, ParserBase } from '../../simpleCodec/parserBase.js';
/**
 * Parser responsible for parsing a "generic sequence of tokens"
 * of an arbitrary length in a Front Matter header.
 */
export class PartialFrontMatterSequence extends ParserBase {
    constructor(
    /**
     * Callback function that is called to check if the current token
     * should stop the parsing process of the current generic "value"
     * sequence of arbitrary tokens by returning `true`.
     *
     * When this happens, the parser *will not consume* the token that
     * was passed to the `shouldStop` callback or to its `accept` method.
     * On the other hand, the parser will be "consumed" hence using it
     * to process other tokens will yield an error.
     */
    shouldStop) {
        super([]);
        this.shouldStop = shouldStop;
    }
    accept(token) {
        // collect all tokens until an end of the sequence is found
        if (this.shouldStop(token)) {
            this.isConsumed = true;
            return {
                result: 'success',
                nextParser: this.asSequenceToken(),
                wasTokenConsumed: false,
            };
        }
        this.currentTokens.push(token);
        return {
            result: 'success',
            nextParser: this,
            wasTokenConsumed: true,
        };
    }
    /**
     * Add provided tokens to the list of the current parsed tokens.
     */
    addTokens(tokens) {
        this.currentTokens.push(...tokens);
        return this;
    }
    /**
     * Convert the current parser into a {@link FrontMatterSequence} token.
     */
    asSequenceToken() {
        this.isConsumed = true;
        return new FrontMatterSequence(this.currentTokens);
    }
}
__decorate([
    assertNotConsumed
], PartialFrontMatterSequence.prototype, "accept", null);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZnJvbnRNYXR0ZXJTZXF1ZW5jZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL2FkdmlrYXIvRG9jdW1lbnRzL2FyY2hpdGVjdC9hcmNoMi9BcmNoSURFL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvY29tbW9uL3Byb21wdFN5bnRheC9jb2RlY3MvYmFzZS9mcm9udE1hdHRlckNvZGVjL3BhcnNlcnMvZnJvbnRNYXR0ZXJTZXF1ZW5jZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7OztBQUdoRyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUV2RSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsVUFBVSxFQUFzQixNQUFNLGlDQUFpQyxDQUFDO0FBRXBHOzs7R0FHRztBQUNILE1BQU0sT0FBTywwQkFBMkIsU0FBUSxVQUcvQztJQUNBO0lBQ0M7Ozs7Ozs7OztPQVNHO0lBQ2MsVUFBeUM7UUFFMUQsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBRk8sZUFBVSxHQUFWLFVBQVUsQ0FBK0I7SUFHM0QsQ0FBQztJQUdNLE1BQU0sQ0FDWixLQUEwQjtRQUcxQiwyREFBMkQ7UUFDM0QsSUFBSSxJQUFJLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDNUIsSUFBSSxDQUFDLFVBQVUsR0FBRyxJQUFJLENBQUM7WUFFdkIsT0FBTztnQkFDTixNQUFNLEVBQUUsU0FBUztnQkFDakIsVUFBVSxFQUFFLElBQUksQ0FBQyxlQUFlLEVBQUU7Z0JBQ2xDLGdCQUFnQixFQUFFLEtBQUs7YUFDdkIsQ0FBQztRQUNILENBQUM7UUFFRCxJQUFJLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUMvQixPQUFPO1lBQ04sTUFBTSxFQUFFLFNBQVM7WUFDakIsVUFBVSxFQUFFLElBQUk7WUFDaEIsZ0JBQWdCLEVBQUUsSUFBSTtTQUN0QixDQUFDO0lBQ0gsQ0FBQztJQUVEOztPQUVHO0lBQ0ksU0FBUyxDQUNmLE1BQXNDO1FBRXRDLElBQUksQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLEdBQUcsTUFBTSxDQUFDLENBQUM7UUFFbkMsT0FBTyxJQUFJLENBQUM7SUFDYixDQUFDO0lBRUQ7O09BRUc7SUFDSSxlQUFlO1FBQ3JCLElBQUksQ0FBQyxVQUFVLEdBQUcsSUFBSSxDQUFDO1FBRXZCLE9BQU8sSUFBSSxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUM7SUFDcEQsQ0FBQztDQUNEO0FBMUNPO0lBRE4saUJBQWlCO3dEQXNCakIifQ==