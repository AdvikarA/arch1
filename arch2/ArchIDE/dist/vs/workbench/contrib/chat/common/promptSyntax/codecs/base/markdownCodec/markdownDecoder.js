/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { MarkdownToken } from './tokens/markdownToken.js';
import { LeftBracket } from '../simpleCodec/tokens/brackets.js';
import { PartialMarkdownImage } from './parsers/markdownImage.js';
import { LeftAngleBracket } from '../simpleCodec/tokens/angleBrackets.js';
import { ExclamationMark } from '../simpleCodec/tokens/exclamationMark.js';
import { BaseDecoder } from '../baseDecoder.js';
import { MarkdownCommentStart, PartialMarkdownCommentStart } from './parsers/markdownComment.js';
import { MarkdownExtensionsDecoder } from '../markdownExtensionsCodec/markdownExtensionsDecoder.js';
import { PartialMarkdownLinkCaption } from './parsers/markdownLink.js';
/**
 * Decoder capable of parsing markdown entities (e.g., links) from a sequence of simple tokens.
 */
export class MarkdownDecoder extends BaseDecoder {
    constructor(stream) {
        super(new MarkdownExtensionsDecoder(stream));
    }
    onStreamData(token) {
        // `markdown links` start with `[` character, so here we can
        // initiate the process of parsing a markdown link
        if (token instanceof LeftBracket && !this.current) {
            this.current = new PartialMarkdownLinkCaption(token);
            return;
        }
        // `markdown comments` start with `<` character, so here we can
        // initiate the process of parsing a markdown comment
        if (token instanceof LeftAngleBracket && !this.current) {
            this.current = new PartialMarkdownCommentStart(token);
            return;
        }
        // `markdown image links` start with `!` character, so here we can
        // initiate the process of parsing a markdown image
        if (token instanceof ExclamationMark && !this.current) {
            this.current = new PartialMarkdownImage(token);
            return;
        }
        // if current parser was not initiated before, - we are not inside a sequence
        // of tokens we care about, therefore re-emit the token immediately and continue
        if (!this.current) {
            this._onData.fire(token);
            return;
        }
        // if there is a current parser object, submit the token to it
        // so it can progress with parsing the tokens sequence
        const parseResult = this.current.accept(token);
        if (parseResult.result === 'success') {
            const { nextParser } = parseResult;
            // if got a fully parsed out token back, emit it and reset
            // the current parser object so a new parsing process can start
            if (nextParser instanceof MarkdownToken) {
                this._onData.fire(nextParser);
                delete this.current;
            }
            else {
                // otherwise, update the current parser object
                this.current = nextParser;
            }
        }
        else {
            // if failed to parse a sequence of a tokens as a single markdown
            // entity (e.g., a link), re-emit the tokens accumulated so far
            // then reset the current parser object
            for (const currentToken of this.current.tokens) {
                this._onData.fire(currentToken);
            }
            delete this.current;
        }
        // if token was not consumed by the parser, call `onStreamData` again
        // so the token is properly handled by the decoder in the case when a
        // new sequence starts with this token
        if (!parseResult.wasTokenConsumed) {
            this.onStreamData(token);
        }
    }
    onStreamEnd() {
        // if the stream has ended and there is a current incomplete parser
        // object present, handle the remaining parser object
        if (this.current) {
            // if a `markdown comment` does not have an end marker `-->`
            // it is still a comment that extends to the end of the file
            // so re-emit the current parser as a comment token
            if (this.current instanceof MarkdownCommentStart) {
                this._onData.fire(this.current.asMarkdownComment());
                delete this.current;
                this.onStreamEnd();
                return;
            }
            // in all other cases, re-emit existing parser tokens
            const { tokens } = this.current;
            for (const token of [...tokens]) {
                this._onData.fire(token);
            }
            delete this.current;
        }
        super.onStreamEnd();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFya2Rvd25EZWNvZGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvYWR2aWthci9Eb2N1bWVudHMvYXJjaGl0ZWN0L2FyY2gyL0FyY2hJREUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9jb21tb24vcHJvbXB0U3ludGF4L2NvZGVjcy9iYXNlL21hcmtkb3duQ29kZWMvbWFya2Rvd25EZWNvZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQztBQUUxRCxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDaEUsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sNEJBQTRCLENBQUM7QUFHbEUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDMUUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQzNFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxtQkFBbUIsQ0FBQztBQUNoRCxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsMkJBQTJCLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUNqRyxPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUNwRyxPQUFPLEVBQTRDLDBCQUEwQixFQUFFLE1BQU0sMkJBQTJCLENBQUM7QUFPakg7O0dBRUc7QUFDSCxNQUFNLE9BQU8sZUFBZ0IsU0FBUSxXQUFnRDtJQVVwRixZQUNDLE1BQWdDO1FBRWhDLEtBQUssQ0FBQyxJQUFJLHlCQUF5QixDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7SUFDOUMsQ0FBQztJQUVrQixZQUFZLENBQUMsS0FBMEI7UUFDekQsNERBQTREO1FBQzVELGtEQUFrRDtRQUNsRCxJQUFJLEtBQUssWUFBWSxXQUFXLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLENB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