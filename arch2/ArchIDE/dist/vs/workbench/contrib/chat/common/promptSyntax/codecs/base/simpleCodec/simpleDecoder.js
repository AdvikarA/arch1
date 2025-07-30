/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { NewLine } from '../linesCodec/tokens/newLine.js';
import { CarriageReturn } from '../linesCodec/tokens/carriageReturn.js';
import { LinesDecoder } from '../linesCodec/linesDecoder.js';
import { At, Tab, Word, Hash, Dash, Colon, Slash, Space, Quote, Comma, FormFeed, DollarSign, DoubleQuote, VerticalTab, LeftBracket, RightBracket, LeftCurlyBrace, RightCurlyBrace, ExclamationMark, LeftParenthesis, RightParenthesis, LeftAngleBracket, RightAngleBracket, } from './tokens/tokens.js';
import { SimpleToken } from './tokens/simpleToken.js';
import { BaseDecoder } from '../baseDecoder.js';
/**
 * List of well-known distinct tokens that this decoder emits (excluding
 * the word stop characters defined below). Everything else is considered
 * an arbitrary "text" sequence and is emitted as a single {@link Word} token.
 */
export const WELL_KNOWN_TOKENS = Object.freeze([
    LeftParenthesis, RightParenthesis, LeftBracket, RightBracket, LeftCurlyBrace, RightCurlyBrace,
    LeftAngleBracket, RightAngleBracket, Space, Tab, VerticalTab, FormFeed, Colon, Hash, Dash,
    ExclamationMark, At, Slash, DollarSign, Quote, DoubleQuote, Comma,
]);
/**
 * A {@link Word} sequence stops when one of the well-known tokens are encountered.
 * Note! the `\r` and `\n` are excluded from the list because this decoder based on
 *       the {@link LinesDecoder} which emits {@link Line} tokens without them.
 */
const WORD_STOP_CHARACTERS = Object.freeze(WELL_KNOWN_TOKENS.map(token => token.symbol));
/**
 * A decoder that can decode a stream of `Line`s into a stream
 * of simple token, - `Word`, `Space`, `Tab`, `NewLine`, etc.
 */
export class SimpleDecoder extends BaseDecoder {
    constructor(stream) {
        super(new LinesDecoder(stream));
    }
    onStreamData(line) {
        // re-emit new line tokens immediately
        if (line instanceof CarriageReturn || line instanceof NewLine) {
            this._onData.fire(line);
            return;
        }
        // loop through the text separating it into `Word` and `well-known` tokens
        const lineText = line.text.split('');
        let i = 0;
        while (i < lineText.length) {
            // index is 0-based, but column numbers are 1-based
            const columnNumber = i + 1;
            const character = lineText[i];
            // check if the current character is a well-known token
            const tokenConstructor = WELL_KNOWN_TOKENS
                .find((wellKnownToken) => {
                return wellKnownToken.symbol === character;
            });
            // if it is a well-known token, emit it and continue to the next one
            if (tokenConstructor) {
                this._onData.fire(SimpleToken.newOnLine(line, columnNumber, tokenConstructor));
                i++;
                continue;
            }
            // otherwise, it is an arbitrary "text" sequence of characters,
            // that needs to be collected into a single `Word` token, hence
            // read all the characters until a stop character is encountered
            let word = '';
            while (i < lineText.length && !(WORD_STOP_CHARACTERS.includes(lineText[i]))) {
                word += lineText[i];
                i++;
            }
            // emit a "text" sequence of characters as a single `Word` token
            this._onData.fire(Word.newOnLine(word, line, columnNumber));
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2ltcGxlRGVjb2Rlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL2FkdmlrYXIvRG9jdW1lbnRzL2FyY2hpdGVjdC9hcmNoMi9BcmNoSURFL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvY29tbW9uL3Byb21wdFN5bnRheC9jb2RlY3MvYmFzZS9zaW1wbGVDb2RlYy9zaW1wbGVEZWNvZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUMxRCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDeEUsT0FBTyxFQUFFLFlBQVksRUFBK0IsTUFBTSwrQkFBK0IsQ0FBQztBQUMxRixPQUFPLEVBQ04sRUFBRSxFQUNGLEdBQUcsRUFDSCxJQUFJLEVBQ0osSUFBSSxFQUNKLElBQUksRUFDSixLQUFLLEVBQ0wsS0FBSyxFQUNMLEtBQUssRUFDTCxLQUFLLEVBQ0wsS0FBSyxFQUNMLFFBQVEsRUFDUixVQUFVLEVBQ1YsV0FBVyxFQUNYLFdBQVcsRUFFWCxXQUFXLEVBQ1gsWUFBWSxFQUVaLGNBQWMsRUFDZCxlQUFlLEVBQ2YsZUFBZSxFQUVmLGVBQWUsRUFDZixnQkFBZ0IsRUFFaEIsZ0JBQWdCLEVBQ2hCLGlCQUFpQixHQUNqQixNQUFNLG9CQUFvQixDQUFDO0FBQzVCLE9BQU8sRUFBcUIsV0FBVyxFQUFFLE1BQU0seUJBQXlCLENBQUM7QUFFekUsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLG1CQUFtQixDQUFDO0FBZ0JoRDs7OztHQUlHO0FBQ0gsTUFBTSxDQUFDLE1BQU0saUJBQWlCLEdBQStDLE1BQU0sQ0FBQyxNQUFNLENBQUM7SUFDMUYsZUFBZSxFQUFFLGdCQUFnQixFQUFFLFdBQVcsRUFBRSxZQUFZLEVBQUUsY0FBYyxFQUFFLGVBQWU7SUFDN0YsZ0JBQWdCLEVBQUUsaUJBQWlCLEVB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