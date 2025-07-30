/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as assert from 'assert';
import { URI } from '../../../../../../../../../base/common/uri.js';
import { createTextModel } from '../../../../../../../../../editor/test/common/testTextModel.js';
import { randomTokens } from '../testUtils/randomTokens.js';
import { randomInt } from '../../../../../../../../../base/common/numbers.js';
import { assertDefined } from '../../../../../../../../../base/common/types.js';
import { randomBoolean } from '../../../../../../../../../base/test/common/testUtils.js';
import { CancellationTokenSource } from '../../../../../../../../../base/common/cancellation.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../../../../../base/test/common/utils.js';
import { arrayToGenerator, ObjectStream } from '../../../../../../common/promptSyntax/codecs/base/utils/objectStream.js';
import { objectStreamFromTextModel } from '../../../../../../common/promptSyntax/codecs/base/utils/objectStreamFromTextModel.js';
suite('ObjectStream', () => {
    const disposables = ensureNoDisposablesAreLeakedInTestSuite();
    suite('fromArray()', () => {
        test('sends objects in the array', async () => {
            const tokens = randomTokens();
            const stream = disposables.add(ObjectStream.fromArray(tokens));
            const receivedTokens = await consume(stream);
            assertTokensEqual(receivedTokens, tokens);
        });
    });
    suite('fromTextModel()', () => {
        test('sends data in text model', async () => {
            const initialContents = [
                'some contents',
                'with some line breaks',
                'and some more contents',
                'and even more contents',
            ];
            // both line endings should yield the same results
            const lineEnding = (randomBoolean()) ? '\r\n' : '\n';
            const model = disposables.add(createTextModel(initialContents.join(lineEnding), 'unknown', undefined, URI.file('/foo.js')));
            const stream = disposables.add(objectStreamFromTextModel(model));
            const receivedData = await consume(stream);
            assert.strictEqual(receivedData.join(''), initialContents.join(lineEnding), 'Received data must be equal to the initial contents.');
        });
    });
    suite('cancellation token', () => {
        test('can be cancelled', async () => {
            const initialContents = [
                'some contents',
                'with some line breaks',
                'and some more contents',
                'and even more contents',
                'some contents',
                'with some line breaks',
                'and some more contents',
                'and even more contents',
            ];
            // both line endings should yield the same results
            const lineEnding = (randomBoolean()) ? '\r\n' : '\n';
            const model = disposables.add(createTextModel(initialContents.join(lineEnding), 'unknown', undefined, URI.file('/foo.js')));
            const stopAtLine = randomInt(5, 2);
            const cancellation = disposables.add(new CancellationTokenSource());
            // override the `getLineContent` method to cancel the stream
            // when a specific line number is being read from the model
            const originalGetLineContent = model.getLineContent.bind(model);
            model.getLineContent = (lineNumber) => {
                // cancel the stream when we reach this specific line number
                if (lineNumber === stopAtLine) {
                    cancellation.cancel();
                }
                return originalGetLineContent(lineNumber);
            };
            const stream = disposables.add(objectStreamFromTextModel(model, cancellation.token));
            const receivedData = await consume(stream);
            const expectedData = initialContents
                .slice(0, stopAtLine - 1)
                .join(lineEnding);
            assert.strictEqual(receivedData.join(''), 
            // because the stream is cancelled before the last line,
            // the last message always ends with the line ending
            expectedData + lineEnding, 'Received data must be equal to the contents before cancel.');
        });
    });
    suite('helpers', () => {
        suite('arrayToGenerator()', () => {
            test('sends tokens in the array', async () => {
                const tokens = randomTokens();
                const generator = arrayToGenerator(tokens);
                const receivedTokens = [];
                for (const token of generator) {
                    receivedTokens.push(token);
                }
                assertTokensEqual(receivedTokens, tokens);
            });
        });
    });
});
/**
 * Asserts that two tokens lists are equal.
 */
function assertTokensEqual(receivedTokens, expectedTokens) {
    for (let i = 0; i < expectedTokens.length; i++) {
        const receivedToken = receivedTokens[i];
        assertDefined(receivedToken, `Expected token #${i} to be '${expectedTokens[i]}', got 'undefined'.`);
        assert.ok(expectedTokens[i].equals(receivedTokens[i]), `Expected token #${i} to be '${expectedTokens[i]}', got '${receivedToken}'.`);
    }
}
/**
 * Consume a provided stream and return a list of received data objects.
 */
function consume(stream) {
    return new Promise((resolve, reject) => {
        const receivedData = [];
        stream.on('data', (token) => {
            receivedData.push(token);
        });
        stream.on('end', () => {
            resolve(receivedData);
        });
        stream.on('error', (error) => {
            reject(error);
        });
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib2JqZWN0U3RyZWFtLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9hZHZpa2FyL0RvY3VtZW50cy9hcmNoaXRlY3QvYXJjaDIvQXJjaElERS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L3Rlc3QvY29tbW9uL3Byb21wdFN5bnRheC9jb2RlY3MvYmFzZS91dGlscy9vYmplY3RTdHJlYW0udGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEtBQUssTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUNqQyxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sK0NBQStDLENBQUM7QUFDcEUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGdFQUFnRSxDQUFDO0FBQ2pHLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUM1RCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDOUUsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLGlEQUFpRCxDQUFDO0FBQ2hGLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSwwREFBMEQsQ0FBQztBQUN6RixPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSx3REFBd0QsQ0FBQztBQUNqRyxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUMvRyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsWUFBWSxFQUFFLE1BQU0seUVBQXlFLENBQUM7QUFDekgsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0sc0ZBQXNGLENBQUM7QUFHakksS0FBSyxDQUFDLGNBQWMsRUFBRSxHQUFHLEVBQUU7SUFDMUIsTUFBTSxXQUFXLEdBQUcsdUNBQXVDLEVBQUUsQ0FBQztJQUU5RCxLQUFLLENBQUMsYUFBYSxFQUFFLEdBQUcsRUFBRTtRQUN6QixJQUFJLENBQUMsNEJBQTRCLEVBQUUsS0FBSyxJQUFJLEVBQUU7WUFD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