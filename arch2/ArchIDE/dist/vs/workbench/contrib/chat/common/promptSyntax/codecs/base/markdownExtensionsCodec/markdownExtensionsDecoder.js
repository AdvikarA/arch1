/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { BaseDecoder } from '../baseDecoder.js';
import { MarkdownExtensionsToken } from './tokens/markdownExtensionsToken.js';
import { SimpleDecoder } from '../simpleCodec/simpleDecoder.js';
import { PartialFrontMatterHeader, PartialFrontMatterStartMarker } from './parsers/frontMatterHeader.js';
/**
 * Decoder responsible for decoding extensions of markdown syntax,
 * e.g., a `Front Matter` header, etc.
 */
export class MarkdownExtensionsDecoder extends BaseDecoder {
    constructor(stream) {
        super(new SimpleDecoder(stream));
    }
    onStreamData(token) {
        // front matter headers start with a `-` at the first column of the first line
        if ((this.current === undefined) && PartialFrontMatterStartMarker.mayStartHeader(token)) {
            this.current = new PartialFrontMatterStartMarker(token);
            return;
        }
        // if current parser is not initiated, - we are not inside a sequence of tokens
        // we care about, therefore re-emit the token immediately and continue
        if (this.current === undefined) {
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
            if (nextParser instanceof MarkdownExtensionsToken) {
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
            // then reset the currently initialized parser object
            this.reEmitCurrentTokens();
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
            if (this.current === undefined) {
                return;
            }
            // if current parser can be converted into a valid Front Matter
            // header, then emit it and reset the current parser object
            if (this.current instanceof PartialFrontMatterHeader) {
                this._onData.fire(this.current.asFrontMatterHeader());
                delete this.current;
                return;
            }
        }
        catch {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFya2Rvd25FeHRlbnNpb25zRGVjb2Rlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL2FkdmlrYXIvRG9jdW1lbnRzL2FyY2hpdGVjdC9hcmNoMi9BcmNoSURFL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvY29tbW9uL3Byb21wdFN5bnRheC9jb2RlY3MvYmFzZS9tYXJrZG93bkV4dGVuc2lvbnNDb2RlYy9tYXJrZG93bkV4dGVuc2lvbnNEZWNvZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBSWhHLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxtQkFBbUIsQ0FBQztBQUNoRCxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUM5RSxPQUFPLEVBQUUsYUFBYSxFQUF1QixNQUFNLGlDQUFpQyxDQUFDO0FBQ3JGLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSw2QkFBNkIsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBT3pHOzs7R0FHRztBQUNILE1BQU0sT0FBTyx5QkFBMEIsU0FBUSxXQUEwRDtJQU94RyxZQUNDLE1BQWdDO1FBRWhDLEtBQUssQ0FBQyxJQUFJLGFBQWEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO0lBQ2xDLENBQUM7SUFFa0IsWUFBWSxDQUFDLEtBQTBCO1FBQ3pELDhFQUE4RTtRQUM5RSxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sS0FBSyxTQUFTLENBQUMsSUFBSSw2QkFBNkIsQ0FBQyxjQUFjLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUN6RixJQUFJLENBQUMsT0FBTyxHQUFHLElBQUksNkJBQTZCLENBQUMsS0FBSyxDQUFDLENBQUM7WUFFeEQsT0FBTztRQUNSLENBQUM7UUFFRCwrRUFBK0U7UUFDL0Usc0VBQXNFO1FBQ3RFLElBQUksSUFBSSxDQUFDLE9BQU8sS0FBSyxTQUFTLEVBQUUsQ0FBQztZQUNoQyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUN6QixPQUFPO1FBQ1IsQ0FBQztRQUVELDhEQUE4RDtRQUM5RCxzREFBc0Q7UUFDdEQsTUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDL0MsSUFBSSxXQUFXLENBQUMsTUFBTSxLQUFLLFNBQVMsRUFBRSxDQUFDO1lBQ3RDLE1BQU0sRUFBRSxVQUFVLEVBQUUsR0FBRyxXQUFXLENBQUM7WUFFbkMsMERBQTBEO1lBQzFELCtEQUErRDtZQUMvRCxJQUFJLFVBQVUsWUFBWSx1QkFBdUIsRUFBRSxDQUFDO2dCQUNuRCxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQztnQkFDOUIsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDO1lBQ3JCLENBQUM7aUJBQU0sQ0FBQztnQkFDUCw4Q0FBOEM7Z0JBQzlDLElBQUksQ0FBQyxPQUFPLEdBQUcsVUFBVSxDQUFDO1lBQzNCLENBQUM7UUFDRixDQUFDO2FBQU0sQ0FBQztZQUNQLGlFQUFpRTtZQUNqRSwrREFBK0Q7WUFDL0QscURBQXFEO1lBQ3JELElBQUksQ0FBQyxtQkFBbUIsRUFBRSxDQUFDO1FBQzVCLENBQUM7UUFFRCxxRUFBcUU7UUFDckUscUVBQXFFO1FBQ3JFLHNDQUFzQztRQUN0QyxJQUFJLENBQUMsV0FBVyxDQUFDLGdCQUFnQixFQUFFLENBQUM7WUFDbkMsSUFBSSxDQUFDLFlBQVksQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUMxQixDQUFDO0lBQ0YsQ0FBQztJQUVrQixXQUFXO1FBQzdCLElBQUksQ0FBQztZQUNKLElBQUksSUFBSSxDQUFDLE9BQU8sS0FBSyxTQUFTLEVBQUUsQ0FBQztnQkFDaEMsT0FBTztZQUNSLENBQUM7WUFFRCwrREFBK0Q7WUFDL0QsMkRBQTJEO1lBQzNELElBQUksSUFBSSxDQUFDLE9BQU8sWUFBWSx3QkFBd0IsRUFBRSxDQUFDO2dCQUN0RCxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FDaEIsSUFBSSxDQUFDLE9BQU8sQ0FBQyxtQkFBbUIsRUFBRSxDQUNsQyxDQUFDO2dCQUNGLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQztnQkFDcEIsT0FBTztZQUNSLENBQUM7UUFFRixDQUFDO1FBQUMsTUFBTSxDQUFDO1lBQ1IseURBQXlEO1lBQ3pELHdDQUF3QztZQUN4QyxJQUFJLENBQUMsbUJBQW1CLEVBQUUsQ0FBQztRQUM1QixDQUFDO2dCQUFTLENBQUM7WUFDVixPQUFPLElBQUksQ0FBQyxPQUFPLENBQUM7WUFDcEIsS0FBSyxDQUFDLFdBQVcsRUFBRSxDQUFDO1FBQ3JCLENBQUM7SUFDRixDQUFDO0lBRUQ7O09BRUc7SUFDTyxtQkFBbUI7UUFDNUIsSUFBSSxJQUFJLENBQUMsT0FBTyxLQUFLLFNBQVMsRUFBRSxDQUFDO1lBQ2hDLE9BQU87UUFDUixDQUFDO1FBRUQsS0FBSyxNQUFNLEtBQUssSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ3pDLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQzFCLENBQUM7UUFDRCxPQUFPLElBQUksQ0FBQyxPQUFPLENBQUM7SUFDckIsQ0FBQztDQUNEIn0=