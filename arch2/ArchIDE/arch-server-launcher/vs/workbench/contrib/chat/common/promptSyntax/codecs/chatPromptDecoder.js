/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { PromptToken } from './tokens/promptToken.js';
import { PartialPromptAtMention } from './parsers/promptAtMentionParser.js';
import { assert, assertNever } from '../../../../../../base/common/assert.js';
import { PartialPromptSlashCommand } from './parsers/promptSlashCommandParser.js';
import { BaseDecoder } from './base/baseDecoder.js';
import { At } from './base/simpleCodec/tokens/at.js';
import { Hash } from './base/simpleCodec/tokens/hash.js';
import { Slash } from './base/simpleCodec/tokens/slash.js';
import { DollarSign } from './base/simpleCodec/tokens/dollarSign.js';
import { PartialPromptVariableName, PartialPromptVariableWithData } from './parsers/promptVariableParser.js';
import { MarkdownDecoder } from './base/markdownCodec/markdownDecoder.js';
import { PartialPromptTemplateVariable, PartialPromptTemplateVariableStart } from './parsers/promptTemplateVariableParser.js';
/**
 * Decoder for the common chatbot prompt message syntax.
 * For instance, the file references `#file:./path/file.md` are handled by this decoder.
 */
export class ChatPromptDecoder extends BaseDecoder {
    constructor(stream) {
        super(new MarkdownDecoder(stream));
    }
    onStreamData(token) {
        // prompt `#variables` always start with the `#` character, hence
        // initiate a parser object if we encounter respective token and
        // there is no active parser object present at the moment
        if ((token instanceof Hash) && !this.current) {
            this.current = new PartialPromptVariableName(token);
            return;
        }
        // prompt `@mentions` always start with the `@` character, hence
        // initiate a parser object if we encounter respective token and
        // there is no active parser object present at the moment
        if ((token instanceof At) && !this.current) {
            this.current = new PartialPromptAtMention(token);
            return;
        }
        // prompt `/commands` always start with the `/` character, hence
        // initiate a parser object if we encounter respective token and
        // there is no active parser object present at the moment
        if ((token instanceof Slash) && !this.current) {
            this.current = new PartialPromptSlashCommand(token);
            return;
        }
        // prompt `${template:variables}` always start with the `$` character,
        // hence initiate a parser object if we encounter respective token and
        // there is no active parser object present at the moment
        if ((token instanceof DollarSign) && !this.current) {
            this.current = new PartialPromptTemplateVariableStart(token);
            return;
        }
        // if current parser was not yet initiated, - we are in the general "text"
        // parsing mode, therefore re-emit the token immediately and continue
        if (!this.current) {
            this._onData.fire(token);
            return;
        }
        // if there is a current parser object, submit the token to it
        // so it can progress with parsing the tokens sequence
        const parseResult = this.current.accept(token);
        // process the parse result next
        switch (parseResult.result) {
            // in the case of success there might be 2 cases:
            //   1) parsing fully completed and an instance of `PromptToken` is returned back,
            //      in this case, emit the parsed token (e.g., a `link`) and reset the current
            //      parser object reference so a new parsing process can be initiated next
            //   2) parsing is still in progress and the next parser object is returned, hence
            //      we need to replace the current parser object with a new one and continue
            case 'success': {
                const { nextParser } = parseResult;
                if (nextParser instanceof PromptToken) {
                    this._onData.fire(nextParser);
                    delete this.current;
                }
                else {
                    this.current = nextParser;
                }
                break;
            }
            // in the case of failure, reset the current parser object
            case 'failure': {
                // if failed to parse a sequence of a tokens, re-emit the tokens accumulated
                // so far then reset the current parser object
                this.reEmitCurrentTokens();
                break;
            }
        }
        // if token was not consumed by the parser, call `onStreamData` again
        // so the token is properly handled by the decoder in the case when a
        // new sequence starts with this token
        if (!parseResult.wasTokenConsumed) {
            this.onStreamData(token);
        }
    }
    onStreamEnd() {
        try {
            // if there is no currently active parser object present, nothing to do
            if (this.current === undefined) {
                return;
            }
            // otherwise try to convert unfinished parser object to a token
            if (this.current instanceof PartialPromptVariableName) {
                this._onData.fire(this.current.asPromptVariable());
                return;
            }
            if (this.current instanceof PartialPromptVariableWithData) {
                this._onData.fire(this.current.asPromptVariableWithData());
                return;
            }
            if (this.current instanceof PartialPromptAtMention) {
                this._onData.fire(this.current.asPromptAtMention());
                return;
            }
            if (this.current instanceof PartialPromptSlashCommand) {
                this._onData.fire(this.current.asPromptSlashCommand());
                return;
            }
            assert((this.current instanceof PartialPromptTemplateVariableStart) === false, 'Incomplete template variable token.');
            if (this.current instanceof PartialPromptTemplateVariable) {
                this._onData.fire(this.current.asPromptTemplateVariable());
                return;
            }
            assertNever(this.current, `Unknown parser object '${this.current}'`);
        }
        catch (_error) {
            // if failed to convert current parser object to a token,
            // re-emit the tokens accumulated so far
            this.reEmitCurrentTokens();
        }
        finally {
            delete this.current;
            super.onStreamEnd();
        }
    }
    /**
     * Re-emit tokens accumulated so far in the current parser object.
     */
    reEmitCurrentTokens() {
        if (this.current === undefined) {
            return;
        }
        for (const token of this.current.tokens) {
            this._onData.fire(token);
        }
        delete this.current;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFByb21wdERlY29kZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9hZHZpa2FyL0RvY3VtZW50cy9hcmNoaXRlY3QvYXJjaDIvQXJjaElERS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2NvbW1vbi9wcm9tcHRTeW50YXgvY29kZWNzL2NoYXRQcm9tcHREZWNvZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQztBQUt0RCxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUU1RSxPQUFPLEVBQUUsTUFBTSxFQUFFLFdBQVcsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQzlFLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQ2xGLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUVwRCxPQUFPLEVBQUUsRUFBRSxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDckQsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ3pELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUMzRCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDckUsT0FBTyxFQUFFLHlCQUF5QixFQUFFLDZCQUE2QixFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDN0csT0FBTyxFQUFFLGVBQWUsRUFBa0IsTUFBTSx5Q0FBeUMsQ0FBQztBQUMxRixPQUFPLEVBQUUsNkJBQTZCLEVBQUUsa0NBQWtDLEVBQWlDLE1BQU0sMkNBQTJDLENBQUM7QUFRN0o7OztHQUdHO0FBQ0gsTUFBTSxPQUFPLGlCQUFrQixTQUFRLFdBQTZDO0lBVW5GLFlBQ0MsTUFBZ0M7UUFFaEMsS0FBSyxDQUFDLElBQUksZUFBZSxDQUFDLE1B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