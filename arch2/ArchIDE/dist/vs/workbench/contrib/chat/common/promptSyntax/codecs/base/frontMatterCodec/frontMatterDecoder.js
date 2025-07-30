/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Word } from '../simpleCodec/tokens/tokens.js';
import { assert } from '../../../../../../../../base/common/assert.js';
import { VALID_INTER_RECORD_SPACING_TOKENS } from './constants.js';
import { FrontMatterToken, FrontMatterRecord } from './tokens/index.js';
import { BaseDecoder } from '../baseDecoder.js';
import { SimpleDecoder } from '../simpleCodec/simpleDecoder.js';
import { ObjectStream } from '../utils/objectStream.js';
import { PartialFrontMatterRecord } from './parsers/frontMatterRecord/frontMatterRecord.js';
import { FrontMatterParserFactory } from './parsers/frontMatterParserFactory.js';
/**
 * Decoder capable of parsing Front Matter contents from a sequence of simple tokens.
 */
export class FrontMatterDecoder extends BaseDecoder {
    constructor(stream) {
        if (stream instanceof ObjectStream) {
            super(stream);
        }
        else {
            super(new SimpleDecoder(stream));
        }
        this.parserFactory = new FrontMatterParserFactory();
    }
    onStreamData(token) {
        if (this.current !== undefined) {
            const acceptResult = this.current.accept(token);
            const { result, wasTokenConsumed } = acceptResult;
            if (result === 'failure') {
                this.reEmitCurrentTokens();
                if (wasTokenConsumed === false) {
                    this._onData.fire(token);
                }
                delete this.current;
                return;
            }
            const { nextParser } = acceptResult;
            if (nextParser instanceof FrontMatterToken) {
                // front matter record token is the spacial case - because it can
                // contain trailing space tokens, we want to emit "trimmed" record
                // token and the trailing spaces tokens separately
                const trimmedTokens = (nextParser instanceof FrontMatterRecord)
                    ? nextParser.trimValueEnd()
                    : [];
                this._onData.fire(nextParser);
                // re-emit all trailing space tokens if present
                for (const trimmedToken of trimmedTokens) {
                    this._onData.fire(trimmedToken);
                }
                if (wasTokenConsumed === false) {
                    this._onData.fire(token);
                }
                delete this.current;
                return;
            }
            this.current = nextParser;
            if (wasTokenConsumed === false) {
                this._onData.fire(token);
            }
            return;
        }
        // a word token starts a new record
        if (token instanceof Word) {
            this.current = this.parserFactory.createRecordName(token);
            return;
        }
        // re-emit all "space" tokens immediately as all of them
        // are valid while we are not in the "record parsing" mode
        for (const ValidToken of VALID_INTER_RECORD_SPACING_TOKENS) {
            if (token instanceof ValidToken) {
                this._onData.fire(token);
                return;
            }
        }
        // unexpected token type, re-emit existing tokens and continue
        this.reEmitCurrentTokens();
    }
    onStreamEnd() {
        try {
            if (this.current === undefined) {
                return;
            }
            assert(this.current instanceof PartialFrontMatterRecord, 'Only partial front matter records can be processed on stream end.');
            const record = this.current.asRecordToken();
            const trimmedTokens = record.trimValueEnd();
            this._onData.fire(record);
            for (const trimmedToken of trimmedTokens) {
                this._onData.fire(trimmedToken);
            }
        }
        catch (_error) {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZnJvbnRNYXR0ZXJEZWNvZGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvYWR2aWthci9Eb2N1bWVudHMvYXJjaGl0ZWN0L2FyY2gyL0FyY2hJREUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9jb21tb24vcHJvbXB0U3ludGF4L2NvZGVjcy9iYXNlL2Zyb250TWF0dGVyQ29kZWMvZnJvbnRNYXR0ZXJEZWNvZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUN2RCxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sK0NBQStDLENBQUM7QUFFdkUsT0FBTyxFQUFFLGlDQUFpQyxFQUFFLE1BQU0sZ0JBQWdCLENBQUM7QUFFbkUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLGlCQUFpQixFQUFFLE1BQU0sbUJBQW1CLENBQUM7QUFDeEUsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLG1CQUFtQixDQUFDO0FBQ2hELE9BQU8sRUFBRSxhQUFhLEVBQTRCLE1BQU0saUNBQWlDLENBQUM7QUFDMUYsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBRXhELE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBRTVGLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBT2pGOztHQUVHO0FBQ0gsTUFBTSxPQUFPLGtCQUFtQixTQUFRLFdBQW1EO0lBUzFGLFlBQ0MsTUFBb0U7UUFFcEUsSUFBSSxNQUFNLFlBQVksWUFBWSxFQUFFLENBQUM7WUFDcEMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ2YsQ0FBQzthQUFNLENBQUM7WUFDUCxLQUFLLENBQUMsSUFBSSxhQUFhLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztRQUNsQyxDQUFDO1FBQ0QsSUFBSSxDQUFD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