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
import { assert } from '../../../../../../../base/common/assert.js';
import { PromptTemplateVariable } from '../tokens/promptTemplateVariable.js';
import { BaseToken } from '../base/baseToken.js';
import { DollarSign, LeftCurlyBrace, RightCurlyBrace } from '../base/simpleCodec/tokens/tokens.js';
import { assertNotConsumed, ParserBase } from '../base/simpleCodec/parserBase.js';
/**
 * Parser that handles start sequence of a `${variable}` token sequence in
 * a prompt text. Transitions to {@link PartialPromptTemplateVariable} parser
 * as soon as the `${` character sequence is found.
 */
export class PartialPromptTemplateVariableStart extends ParserBase {
    constructor(token) {
        super([token]);
    }
    accept(token) {
        if (token instanceof LeftCurlyBrace) {
            this.currentTokens.push(token);
            this.isConsumed = true;
            return {
                result: 'success',
                nextParser: new PartialPromptTemplateVariable(this.currentTokens),
                wasTokenConsumed: true,
            };
        }
        return {
            result: 'failure',
            wasTokenConsumed: false,
        };
    }
}
__decorate([
    assertNotConsumed
], PartialPromptTemplateVariableStart.prototype, "accept", null);
/**
 * Parser that handles a partial `${variable}` token sequence in a prompt text.
 */
export class PartialPromptTemplateVariable extends ParserBase {
    constructor(tokens) {
        super(tokens);
    }
    accept(token) {
        // template variables are terminated by the `}` character
        if (token instanceof RightCurlyBrace) {
            this.currentTokens.push(token);
            this.isConsumed = true;
            return {
                result: 'success',
                nextParser: this.asPromptTemplateVariable(),
                wasTokenConsumed: true,
            };
        }
        // otherwise it is a valid name character, so add it to the list of
        // the current tokens and continue the parsing process
        this.currentTokens.push(token);
        return {
            result: 'success',
            nextParser: this,
            wasTokenConsumed: true,
        };
    }
    /**
     * Returns a string representation of the prompt template variable
     * contents, if any is present.
     */
    get contents() {
        const contentTokens = [];
        // template variables are surrounded by `${}`, hence we need to have
        // at least `${` plus one character for the contents to be non-empty
        if (this.currentTokens.length < 3) {
            return '';
        }
        // collect all tokens besides the first two (`${`) and a possible `}` at the end
        for (let i = 2; i < this.currentTokens.length; i++) {
            const token = this.currentTokens[i];
            const isLastToken = (i === this.currentTokens.length - 1);
            if ((token instanceof RightCurlyBrace) && (isLastToken === true)) {
                break;
            }
            contentTokens.push(token);
        }
        return BaseToken.render(contentTokens);
    }
    /**
     * Try to convert current parser instance into a {@link PromptTemplateVariable} token.
     *
     * @throws if:
     * 	- current tokens sequence cannot be converted to a valid template variable token
     */
    asPromptTemplateVariable() {
        const firstToken = this.currentTokens[0];
        const secondToken = this.currentTokens[1];
        const lastToken = this.currentTokens[this.currentTokens.length - 1];
        // template variables are surrounded by `${}`, hence we need
        // to have at least 3 tokens in the list for a valid one
        assert(this.currentTokens.length >= 3, 'Prompt template variable should have at least 3 tokens.');
        // a complete template variable must end with a `}`
        assert(lastToken instanceof RightCurlyBrace, 'Last token is not a "}".');
        // sanity checks of the first and second tokens
        assert(firstToken instanceof DollarSign, 'First token must be a "$".');
        assert(secondToken instanceof LeftCurlyBrace, 'Second token must be a "{".');
        return new PromptTemplateVariable(BaseToken.fullRange(this.currentTokens), this.contents);
    }
}
__decorate([
    assertNotConsumed
], PartialPromptTemplateVariable.prototype, "accept", null);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvbXB0VGVtcGxhdGVWYXJpYWJsZVBhcnNlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL2FkdmlrYXIvRG9jdW1lbnRzL2FyY2hpdGVjdC9hcmNoMi9BcmNoSURFL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvY29tbW9uL3Byb21wdFN5bnRheC9jb2RlY3MvcGFyc2Vycy9wcm9tcHRUZW1wbGF0ZVZhcmlhYmxlUGFyc2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUNwRSxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUM3RSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sc0JBQXNCLENBQUM7QUFFakQsT0FBTyxFQUFFLFVBQVUsRUFBRSxjQUFjLEVBQUUsZUFBZSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDbkcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLFVBQVUsRUFBc0IsTUFBTSxtQ0FBbUMsQ0FBQztBQU90Rzs7OztHQUlHO0FBQ0gsTUFBTSxPQUFPLGtDQUFtQyxTQUFRLFVBQTJHO0lBQ2xLLFlBQVksS0FBaUI7UUFDNUIsS0FBSyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztJQUNoQixDQUFDO0lBR00sTUFBTSxDQUFDLEtBQTBCO1FBQ3ZDLElBQUksS0FBSyxZQUFZLGNBQWMsRUFBRSxDQUFDO1lBQ3JDLElBQUksQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBRS9CLElBQUksQ0FBQyxVQUFVLEdBQUcsSUFBSSxDQUFDO1lBQ3ZCLE9BQU87Z0JBQ04sTUFBTSxFQUFFLFNBQVM7Z0JBQ2pCLFVBQVUsRUFBRSxJQUFJLDZCQUE2QixDQUFDLElBQUksQ0FBQyxhQUFhLENBQUM7Z0JBQ2pFLGdCQUFnQixFQUFFLElBQUk7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