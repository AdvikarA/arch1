/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { VSBuffer } from '../../../../../../../../../base/common/buffer.js';
import { randomInt } from '../../../../../../../../../base/common/numbers.js';
import { assertDefined } from '../../../../../../../../../base/common/types.js';
import { Disposable } from '../../../../../../../../../base/common/lifecycle.js';
import { SimpleToken } from '../../../../../../common/promptSyntax/codecs/base/simpleCodec/tokens/simpleToken.js';
/**
 * A reusable test utility that asserts that the given decoder
 * produces the expected `expectedTokens` sequence of tokens.
 *
 * ## Examples
 *
 * ```typescript
 * const stream = newWriteableStream<VSBuffer>(null);
 * const decoder = testDisposables.add(new LinesDecoder(stream));
 *
 * // create a new test utility instance
 * const test = testDisposables.add(new TestDecoder(stream, decoder));
 *
 * // run the test
 * await test.run(
 *   ' hello world\n',
 *   [
 * 	   new Line(1, ' hello world'),
 * 	   new NewLine(new Range(1, 13, 1, 14)),
 *   ],
 * );
 */
export class TestDecoder extends Disposable {
    constructor(stream, decoder) {
        super();
        this.stream = stream;
        this.decoder = decoder;
        this._register(this.decoder);
    }
    /**
     * Write provided {@linkcode inputData} data to the input byte stream
     * asynchronously in the background in small random-length chunks.
     *
     * @param inputData Input data to send.
     */
    sendData(inputData) {
        // if input data was passed as an array of lines,
        // join them into a single string with newlines
        if (Array.isArray(inputData)) {
            inputData = inputData.join('\n');
        }
        // write the input data to the stream in multiple random-length
        // chunks to simulate real input stream data flows
        let inputDataBytes = VSBuffer.fromString(inputData);
        const interval = setInterval(() => {
            if (inputDataBytes.byteLength <= 0) {
                clearInterval(interval);
                this.stream.end();
                return;
            }
            const dataToSend = inputDataBytes.slice(0, randomInt(inputDataBytes.byteLength));
            this.stream.write(dataToSend);
            inputDataBytes = inputDataBytes.slice(dataToSend.byteLength);
        }, randomInt(5));
        return this;
    }
    /**
     * Run the test sending the `inputData` data to the stream and asserting
     * that the decoder produces the `expectedTokens` sequence of tokens.
     *
     * @param inputData Input data of the input byte stream.
     * @param expectedTokens List of expected tokens the test token must produce.
     * @param tokensConsumeMethod *Optional* method of consuming the decoder stream.
     *       					  Defaults to a random method (see {@linkcode randomTokensConsumeMethod}).
     */
    async run(inputData, expectedTokens, tokensConsumeMethod = this.randomTokensConsumeMethod()) {
        try {
            // initiate the data sending flow
            this.sendData(inputData);
            // receive tokens from the decoder stream
            const receivedTokens = await this.receiveTokens(tokensConsumeMethod);
            // validate the received tokens
            this.validateReceivedTokens(receivedTokens, expectedTokens);
        }
        catch (error) {
            assertDefined(error, `An non-nullable error must be thrown.`);
            assert(error instanceof Error, `An error error instance must be thrown.`);
            // add the tokens consume method to the error message so we
            // would know which method of consuming the tokens failed exactly
            error.message = `[${tokensConsumeMethod}] ${error.message}`;
            throw error;
        }
    }
    /**
     * Randomly generate a tokens consume method type for the test.
     */
    randomTokensConsumeMethod() {
        const testConsumeMethodIndex = randomInt(2);
        switch (testConsumeMethodIndex) {
            // test the `async iterator` code path
            case 0: {
                return 'async-generator';
            }
            // test the `.consumeAll()` method code path
            case 1: {
                return 'consume-all-method';
            }
            // test the `.onData()` event consume flow
            case 2: {
                return 'on-data-event';
            }
            // ensure that the switch block is exhaustive
            default: {
                throw new Error(`Unknown consume method index '${testConsumeMethodIndex}'.`);
            }
        }
    }
    /**
     * Receive all tokens from the decoder stream using the specified consume method.
     */
    async receiveTokens(tokensConsumeMethod = this.randomTokensConsumeMethod()) {
        // consume the decoder tokens based on specified
        // (or randomly generated) tokens consume method
        const receivedTokens = [];
        switch (tokensConsumeMethod) {
            // test the `async iterator` code path
            case 'async-generator': {
                for await (const token of this.decoder) {
                    if (token === null) {
                        break;
                    }
                    receivedTokens.push(token);
                }
                break;
            }
            // test the `.consumeAll()` method code path
            case 'consume-all-method': {
                receivedTokens.push(...(await this.decoder.consumeAll()));
                break;
            }
            // test the `.onData()` event consume flow
            case 'on-data-event': {
                this.decoder.onData((token) => {
                    receivedTokens.push(token);
                });
                this.decoder.start();
                // in this case we also test the `settled` promise of the decoder
                await this.decoder.settled;
                break;
            }
            // ensure that the switch block is exhaustive
            default: {
                throw new Error(`Unknown consume method '${tokensConsumeMethod}'.`);
            }
        }
        return receivedTokens;
    }
    /**
     * Validate that received tokens list is equal to the expected one.
     */
    validateReceivedTokens(receivedTokens, expectedTokens) {
        for (let i = 0; i < expectedTokens.length; i++) {
            const expectedToken = expectedTokens[i];
            const receivedToken = receivedTokens[i];
            assertDefined(receivedToken, `Expected token '${i}' to be '${expectedToken}', got 'undefined'.`);
            const expectedTokenString = (expectedToken instanceof SimpleToken)
                ? `${expectedToken} `
                : `\n  "${expectedToken.text}"(${expectedToken.range})\n`;
            const receivedTokenString = (receivedToken instanceof SimpleToken)
                ? receivedToken.toString()
                : `\n  "${receivedToken.text}"(${receivedToken.range})\n`;
            assert(receivedToken.equals(expectedToken), `Expected token '${i}' to be: ${expectedTokenString}got: ${receivedTokenString}`);
        }
        if (receivedTokens.length === expectedTokens.length) {
            return;
        }
        // sanity check - if received/expected list lengths are not equal, the received
        // list must be longer than the expected one, because the other way around case
        // must have been caught by the comparison loop above
        assert(receivedTokens.length > expectedTokens.length, 'Must have received more tokens than expected.');
        const index = expectedTokens.length;
        throw new Error([
            `Expected no '${index}' token present, got '${receivedTokens[index]}'.`,
            `(received ${receivedTokens.length} tokens in total)`,
        ].join(' '));
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdERlY29kZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9hZHZpa2FyL0RvY3VtZW50cy9hcmNoaXRlY3QvYXJjaDIvQXJjaElERS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L3Rlc3QvY29tbW9uL3Byb21wdFN5bnRheC9jb2RlY3MvYmFzZS91dGlscy90ZXN0RGVjb2Rlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQzVFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUM5RSxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0saURBQWlELENBQUM7QUFDaEYsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHFEQUFxRCxDQUFDO0FBSWpGLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxxRkFBcUYsQ0FBQztBQVNsSDs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0dBcUJHO0FBQ0gsTUFBTSxPQUFPLFdBQTJELFNBQVEsVUFBVTtJQUN6RixZQUNrQixNQUFpQyxFQUNsQyxPQUFVO1FBRTFCLEtBQUssRUFBRSxDQUFDO1FBSFMsV0FBTSxHQUFOLE1BQU0sQ0FBMkI7UUFDbEMsWUFBTyxHQUFQLE9BQU8sQ0FBRztRQUkxQixJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUM5QixDQUFDO0lBRUQ7Ozs7O09BS0c7SUFDSSxRQUFRLENBQ2QsU0FBNEI7UUFFNUIsaURBQWlEO1FBQ2pELCtDQUErQztRQUMvQyxJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQztZQUM5QixTQUFTLEdBQUcsU0FBUyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNsQyxDQUFDO1FBRUQs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