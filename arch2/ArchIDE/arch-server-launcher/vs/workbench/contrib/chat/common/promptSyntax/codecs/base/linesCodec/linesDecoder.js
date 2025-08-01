/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Line } from './tokens/line.js';
import { Range } from '../../../../../../../../editor/common/core/range.js';
import { NewLine } from './tokens/newLine.js';
import { assert } from '../../../../../../../../base/common/assert.js';
import { CarriageReturn } from './tokens/carriageReturn.js';
import { VSBuffer } from '../../../../../../../../base/common/buffer.js';
import { assertDefined } from '../../../../../../../../base/common/types.js';
import { BaseDecoder } from '../baseDecoder.js';
/**
 * The `decoder` part of the `LinesCodec` and is able to transform
 * data from a binary stream into a stream of text lines(`Line`).
 */
export class LinesDecoder extends BaseDecoder {
    constructor() {
        super(...arguments);
        /**
         * Buffered received data yet to be processed.
         */
        this.buffer = VSBuffer.alloc(0);
    }
    /**
     * Process data received from the input stream.
     */
    onStreamData(chunk) {
        this.buffer = VSBuffer.concat([this.buffer, chunk]);
        this.processData(false);
    }
    /**
     * Process buffered data.
     *
     * @param streamEnded Flag that indicates if the input stream has ended,
     * 					  which means that is the last call of this method.
     * @throws If internal logic implementation error is detected.
     */
    processData(streamEnded) {
        // iterate over each line of the data buffer, emitting each line
        // as a `Line` token followed by a `NewLine` token, if applies
        while (this.buffer.byteLength > 0) {
            // get line number based on a previously emitted line, if any
            const lineNumber = this.lastEmittedLine
                ? this.lastEmittedLine.range.startLineNumber + 1
                : 1;
            // find the `\r`, `\n`, or `\r\n` tokens in the data
            const endOfLineTokens = this.findEndOfLineTokens(lineNumber, streamEnded);
            const firstToken = endOfLineTokens[0];
            // if no end-of-the-line tokens found, stop the current processing
            // attempt because we either (1) need more data to be received or
            // (2) the stream has ended; in the case (2) remaining data must
            // be emitted as the last line
            if (firstToken === undefined) {
                // (2) if `streamEnded`, we need to emit the whole remaining
                // data as the last line immediately
                if (streamEnded) {
                    this.emitLine(lineNumber, this.buffer.slice(0));
                }
                break;
            }
            // emit the line found in the data as the `Line` token
            this.emitLine(lineNumber, this.buffer.slice(0, firstToken.range.startColumn - 1));
            // must always hold true as the `emitLine` above sets this
            assertDefined(this.lastEmittedLine, 'No last emitted line found.');
            // Note! A standalone `\r` token case is not a well-defined case, and
            // 		 was primarily used by old Mac OSx systems which treated it as
            // 		 a line ending (same as `\n`). Hence for backward compatibility
            // 		 with those systems, we treat it as a new line token as well.
            // 		 We do that by replacing standalone `\r` token with `\n` one.
            if ((endOfLineTokens.length === 1) && (firstToken instanceof CarriageReturn)) {
                endOfLineTokens.splice(0, 1, new NewLine(firstToken.range));
            }
            // emit the end-of-the-line tokens
            let startColumn = this.lastEmittedLine.range.endColumn;
            for (const token of endOfLineTokens) {
                const byteLength = token.byte.byteLength;
                const endColumn = startColumn + byteLength;
                // emit the token updating its column start/end numbers based on
                // the emitted line text length and previous end-of-the-line token
                this._onData.fire(token.withRange({ startColumn, endColumn }));
                // shorten the data buffer by the length of the token
                this.buffer = this.buffer.slice(byteLength);
                // update the start column for the next token
                startColumn = endColumn;
            }
        }
        // if the stream has ended, assert that the input data buffer is now empty
        // otherwise we have a logic error and leaving some buffered data behind
        if (streamEnded) {
            assert(this.buffer.byteLength === 0, 'Expected the input data buffer to be empty when the stream ends.');
        }
    }
    /**
     * Find the end of line tokens in the data buffer.
     * Can return:
     *  - [`\r`, `\n`] tokens if the sequence is found
     *  - [`\r`] token if only the carriage return is found
     *  - [`\n`] token if only the newline is found
     *  - an `empty array` if no end of line tokens found
     */
    findEndOfLineTokens(lineNumber, streamEnded) {
        const result = [];
        // find the first occurrence of the carriage return and newline tokens
        const carriageReturnIndex = this.buffer.indexOf(CarriageReturn.byte);
        const newLineIndex = this.buffer.indexOf(NewLine.byte);
        // if the `\r` comes before the `\n`(if `\n` present at all)
        if (carriageReturnIndex >= 0 && ((carriageReturnIndex < newLineIndex) || (newLineIndex === -1))) {
            // add the carriage return token first
            result.push(new CarriageReturn(new Range(lineNumber, (carriageReturnIndex + 1), lineNumber, (carriageReturnIndex + 1) + CarriageReturn.byte.byteLength)));
            // if the `\r\n` sequence
            if (newLineIndex === carriageReturnIndex + 1) {
                // add the newline token to the result
                result.push(new NewLine(new Range(lineNumber, (newLineIndex + 1), lineNumber, (newLineIndex + 1) + NewLine.byte.byteLength)));
            }
            // either `\r` or `\r\n` cases found; if we have the `\r` token, we can return
            // the end-of-line tokens only, if the `\r` is followed by at least one more
            // character (it could be a `\n` or any other character), or if the stream has
            // ended (which means the `\r` is at the end of the line)
            if ((this.buffer.byteLength > carriageReturnIndex + 1) || streamEnded) {
                return result;
            }
            // in all other cases, return the empty array (no lend-of-line tokens found)
            return [];
        }
        // no `\r`, but there is `\n`
        if (newLineIndex >= 0) {
            result.push(new NewLine(new Range(lineNumber, (newLineIndex + 1), lineNumber, (newLineIndex + 1) + NewLine.byte.byteLength)));
        }
        // neither `\r` nor `\n` found, no end of line found at all
        return result;
    }
    /**
     * Emit a provided line as the `Line` token to the output stream.
     */
    emitLine(lineNumber, // Note! 1-based indexing
    lineBytes) {
        const line = new Line(lineNumber, lineBytes.toString());
        this._onData.fire(line);
        // store the last emitted line so we can use it when we need
        // to send the remaining line in the `onStreamEnd` method
        this.lastEmittedLine = line;
        // shorten the data buffer by the length of the line emitted
        this.buffer = this.buffer.slice(lineBytes.byteLength);
    }
    /**
     * Handle the end of the input stream - if the buffer still has some data,
     * emit it as the last available line token before firing the `onEnd` event.
     */
    onStreamEnd() {
        // if the input data buffer is not empty when the input stream ends, emit
        // the remaining data as the last line before firing the `onEnd` event
        if (this.buffer.byteLength > 0) {
            this.processData(true);
        }
        super.onStreamEnd();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGluZXNEZWNvZGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvYWR2aWthci9Eb2N1bWVudHMvYXJjaGl0ZWN0L2FyY2gyL0FyY2hJREUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9jb21tb24vcHJvbXB0U3ludGF4L2NvZGVjcy9iYXNlL2xpbmVzQ29kZWMvbGluZXNEZWNvZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxrQkFBa0IsQ0FBQztBQUN4QyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0scURBQXFELENBQUM7QUFDNUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFCQUFxQixDQUFDO0FBQzlDLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQztBQUN2RSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sNEJBQTRCLENBQUM7QUFDNUQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLCtDQUErQyxDQUFDO0FBQ3pFLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQztBQUM3RSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sbUJBQW1CLENBQUM7QUFZaEQ7OztHQUdHO0FBQ0gsTUFBTSxPQUFPLFlBQWEsU0FBUSxXQUFpQztJQUFuRTs7UUFDQzs7V0FFRztRQUNLLFdBQU0sR0FBYSxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBNE05QyxDQUFDO0lBbE1BOztPQUVHO0lBQ2dCLFlBQVksQ0FBQyxLQUFlO1FBQzlDLElBQUksQ0FBQyxNQUFNLEdBQUcsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQztRQUVwRCxJQUFJLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQ3pCLENBQUM7SUFFRDs7Ozs7O09BTUc7SUFDSyxXQUFXLENBQ2xCLFdBQW9CO1FBRXBCLGdFQUFnRTtRQUNoRSw4REFBOEQ7UUFDOUQsT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDLFVBQVUsR0FBRyxDQUFDLEVBQUUsQ0FBQztZQUNuQyw2REFBNkQ7WUFDN0QsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLGVBQWU7Z0JBQ3RDLENBQUMsQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQyxlQUFlLEdBQUcsQ0FBQztnQkFDaEQsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUVMLG9EQUFvRDtZQUNwRCxNQUFNLGVBQWUsR0FBRyxJQUFJLENBQUMsbUJBQW1CLENBQy9DLFVBQVUsRUFDVixXQUFXLENBQ1gsQ0FBQztZQUNGLE1BQU0sVUFBVSxHQUEyQyxlQUFlLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFFOUUsa0VBQWtFO1lBQ2xFLGlFQUFpRTtZQUNqRSxnRUFBZ0U7WUFDaEUsOEJBQThCO1lBQzlCLElBQUksVUFBVSxLQUFLLFNBQVMsRUFBRSxDQUFDO2dCQUM5Qiw0REFBNEQ7Z0JBQzVELG9DQUFvQztnQkFDcEMsSUFBSSxXQUFXLEVBQUUsQ0FBQztvQkFDakIsSUFBSSxDQUFDLFFBQVEsQ0FBQyxVQUFVLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDakQsQ0FBQztnQkFFRCxNQUFNO1lBQ1AsQ0FBQztZQUVELHNEQUFzRDtZQUN0RCxJQUFJLENBQUMsUUFBUSxDQUFDLFVBQVUsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsVUFBVSxDQUFDLEtBQUssQ0FBQyxXQUFXLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUVsRiwwREFBMEQ7WUFDMUQsYUFBYSxDQUNaLElBQUksQ0FBQyxlQUFlLEVBQ3BCLDZCQUE2QixDQUM3QixDQUFDO1lBRUYscUVBQXFFO1lBQ3JFLG1FQUFtRTtZQUNuRSxvRUFBb0U7WUFDcEUsa0VBQWtFO1lBQ2xFLGtFQUFrRTtZQUNsRSxJQUFJLENBQUMsZUFBZSxDQUFDLE1BQU0sS0FBSyxDQUFDLENBQUMsSUFBSSxDQUFDLFVBQVUsWUFBWSxjQUFjLENBQUMsRUFBRSxDQUFDO2dCQUM5RSxlQUFlLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsSUFBSSxPQUFPLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7WUFDN0QsQ0FBQztZQUVELGtDQUFrQztZQUNsQyxJQUFJLFdBQVcsR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUM7WUFDdkQsS0FBSyxNQUFNLEtBQUssSUFBSSxlQUFlLEVBQUUsQ0FBQztnQkFDckMsTUFBTSxVQUFVLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUM7Z0JBQ3pDLE1BQU0sU0FBUyxHQUFHLFdBQVcsR0FBRyxVQUFVLENBQUM7Z0JBQzNDLGdFQUFnRTtnQkFDaEUsa0VBQWtFO2dCQUNsRSxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLEVBQUUsV0FBVyxFQUFFLFNBQVMsRUFBRSxDQUFDLENBQUMsQ0FBQztnQkFDL0QscURBQXFEO2dCQUNyRCxJQUFJLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxDQUFDO2dCQUM1Qyw2Q0FBNkM7Z0JBQzdDLFdBQVcsR0FBRyxTQUFTLENBQUM7WUFDekIsQ0FBQztRQUNGLENBQUM7UUFFRCwwRUFBMEU7UUFDMUUsd0VBQXdFO1FBQ3hFLElBQUksV0FBVyxFQUFFLENBQUM7WUFDakIsTUFBTSxDQUNMLElBQUksQ0FBQyxNQUFNLENBQUMsVUFBVSxLQUFLLENBQUMsRUFDNUIsa0VBQWtFLENBQ2xFLENBQUM7UUFDSCxDQUFDO0lBQ0YsQ0FBQztJQUVEOzs7Ozs7O09BT0c7SUFDSyxtQkFBbUIsQ0FDMUIsVUFBa0IsRUFDbEIsV0FBb0I7UUFFcEIsTUFBTSxNQUFNLEdBQUcsRUFBRSxDQUFDO1FBRWxCLHNFQUFzRTtRQUN0RSxNQUFNLG1CQUFtQixHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNyRSxNQUFNLFlBQVksR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7UUFFdkQsNERBQTREO1FBQzVELElBQUksbUJBQW1CLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxtQkFBbUIsR0FBRyxZQUFZLENBQUMsSUFBSSxDQUFDLFlBQVksS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztZQUNqRyxzQ0FBc0M7WUFDdEMsTUFBTSxDQUFDLElBQUksQ0FDVixJQUFJLGNBQWMsQ0FBQyxJQUFJLEtBQUssQ0FDM0IsVUFBVSxFQUNWLENBQUMsbUJBQW1CLEdBQUcsQ0FBQyxDQUFDLEVBQ3pCLFVBQVUsRUFDVixDQUFDLG1CQUFtQixHQUFHLENBQUMsQ0FBQyxHQUFHLGNBQWMsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUMxRCxDQUFDLENBQ0YsQ0FBQztZQUVGLHlCQUF5QjtZQUN6QixJQUFJLFlBQVksS0FBSyxtQkFBbUIsR0FBRyxDQUFDLEVBQUUsQ0FBQztnQkFDOUMsc0NBQXNDO2dCQUN0QyxNQUFNLENBQUMsSUFBSSxDQUNWLElBQUksT0FBTyxDQUFDLElBQUksS0FBSyxDQUNwQixVQUFVLEVBQ1YsQ0FBQyxZQUFZLEdBQUcsQ0FBQyxDQUFDLEVBQ2xCLFVBQVUsRUFDVixDQUFDLFlBQVksR0FBRyxDQUFDLENBQUMsR0FBRyxPQUFPLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FDNUMsQ0FBQyxDQUNGLENBQUM7WUFDSCxDQUFDO1lBRUQsOEVBQThFO1lBQzlFLDRFQUE0RTtZQUM1RSw4RUFBOEU7WUFDOUUseURBQXlEO1lBQ3pELElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLFVBQVUsR0FBRyxtQkFBbUIsR0FBRyxDQUFDLENBQUMsSUFBSSxXQUFXLEVBQUUsQ0FBQztnQkFDdkUsT0FBTyxNQUFNLENBQUM7WUFDZixDQUFDO1lBRUQsNEVBQTRFO1lBQzVFLE9BQU8sRUFBRSxDQUFDO1FBQ1gsQ0FBQztRQUVELDZCQUE2QjtRQUM3QixJQUFJLFlBQVksSUFBSSxDQUFDLEVBQUUsQ0FBQztZQUN2QixNQUFNLENBQUMsSUFBSSxDQUNWLElBQUksT0FBTyxDQUFDLElBQUksS0FBSyxDQUNwQixVQUFVLEVBQ1YsQ0FBQyxZQUFZLEdBQUcsQ0FBQyxDQUFDLEVBQ2xCLFVBQVUsRUFDVixDQUFDLFlBQVksR0FBRyxDQUFDLENBQUMsR0FBRyxPQUFPLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FDNUMsQ0FBQyxDQUNGLENBQUM7UUFDSCxDQUFDO1FBRUQsMkRBQTJEO1FBQzNELE9BQU8sTUFBTSxDQUFDO0lBQ2YsQ0FBQztJQUVEOztPQUVHO0lBQ0ssUUFBUSxDQUNmLFVBQWtCLEVBQUUseUJBQXlCO0lBQzdDLFNBQW1CO1FBR25CLE1BQU0sSUFBSSxHQUFHLElBQUksSUFBSSxDQUFDLFVBQVUsRUFBRSxTQUFTLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQztRQUN4RCxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUV4Qiw0REFBNEQ7UUFDNUQseURBQXlEO1FBQ3pELElBQUksQ0FBQyxlQUFlLEdBQUcsSUFBSSxDQUFDO1FBRTVCLDREQUE0RDtRQUM1RCxJQUFJLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxVQUFVLENBQUMsQ0FBQztJQUN2RCxDQUFDO0lBRUQ7OztPQUdHO0lBQ2dCLFdBQVc7UUFDN0IseUVBQXlFO1FBQ3pFLHNFQUFzRTtRQUN0RSxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsVUFBVSxHQUFHLENBQUMsRUFBRSxDQUFDO1lBQ2hDLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDeEIsQ0FBQztRQUVELEtBQUssQ0FBQyxXQUFXLEVBQUUsQ0FBQztJQUNyQixDQUFDO0NBQ0QifQ==