/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { assert } from '../../../../../../../base/common/assert.js';
import { randomInt } from '../../../../../../../base/common/numbers.js';
import { Range } from '../../../../../../../editor/common/core/range.js';
import { Text } from '../../../../common/promptSyntax/codecs/base/textToken.js';
import { newWriteableStream } from '../../../../../../../base/common/stream.js';
import { randomBoolean } from '../../../../../../../base/test/common/testUtils.js';
import { TestDecoder } from './base/utils/testDecoder.js';
import { Word } from '../../../../common/promptSyntax/codecs/base/simpleCodec/tokens/word.js';
import { NewLine } from '../../../../common/promptSyntax/codecs/base/linesCodec/tokens/newLine.js';
import { TestSimpleDecoder } from './base/simpleDecoder.test.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../../../base/test/common/utils.js';
import { CarriageReturn } from '../../../../common/promptSyntax/codecs/base/linesCodec/tokens/carriageReturn.js';
import { FrontMatterHeader } from '../../../../common/promptSyntax/codecs/base/markdownExtensionsCodec/tokens/frontMatterHeader.js';
import { Colon, Dash, DoubleQuote, Space, Tab, VerticalTab } from '../../../../common/promptSyntax/codecs/base/simpleCodec/tokens/tokens.js';
import { MarkdownExtensionsDecoder } from '../../../../common/promptSyntax/codecs/base/markdownExtensionsCodec/markdownExtensionsDecoder.js';
import { FrontMatterMarker } from '../../../../common/promptSyntax/codecs/base/markdownExtensionsCodec/tokens/frontMatterMarker.js';
/**
 * End-of-line utility class for convenience.
 */
class TestEndOfLine extends Text {
    /**
     * Create a new instance with provided end-of line type and
     * a starting position.
     */
    static create(type, lineNumber, startColumn) {
        // sanity checks
        assert(lineNumber >= 1, `Line number must be greater than or equal to 1, got '${lineNumber}'.`);
        assert(startColumn >= 1, `Start column must be greater than or equal to 1, got '${startColumn}'.`);
        const tokens = [];
        if (type === '\r\n') {
            tokens.push(new CarriageReturn(new Range(lineNumber, startColumn, lineNumber, startColumn + 1)));
            startColumn += 1;
        }
        tokens.push(new NewLine(new Range(lineNumber, startColumn, lineNumber, startColumn + 1)));
        return new TestEndOfLine(tokens);
    }
}
/**
 * Test decoder for the `MarkdownExtensionsDecoder` class.
 */
export class TestMarkdownExtensionsDecoder extends TestDecoder {
    constructor() {
        const stream = newWriteableStream(null);
        const decoder = new MarkdownExtensionsDecoder(stream);
        super(stream, decoder);
    }
}
/**
 * Front Matter marker utility class for testing purposes.
 */
class TestFrontMatterMarker extends FrontMatterMarker {
    /**
     * Create a new instance with provided dashes count,
     * line number, and an end-of-line type.
     */
    static create(dashCount, lineNumber, endOfLine) {
        const tokens = [];
        let columnNumber = 1;
        while (columnNumber <= dashCount) {
            tokens.push(new Dash(new Range(lineNumber, columnNumber, lineNumber, columnNumber + 1)));
            columnNumber++;
        }
        if (endOfLine !== undefined) {
            const endOfLineTokens = TestEndOfLine.create(endOfLine, lineNumber, columnNumber);
            tokens.push(...endOfLineTokens.children);
        }
        return TestFrontMatterMarker.fromTokens(tokens);
    }
}
suite('MarkdownExtensionsDecoder', () => {
    const disposables = ensureNoDisposablesAreLeakedInTestSuite();
    /**
     * Create a Front Matter header start/end marker with a random length.
     */
    const randomMarker = (maxDashCount = 10, minDashCount = 1) => {
        const dashCount = randomInt(maxDashCount, minDashCount);
        return new Array(dashCount).fill('-').join('');
    };
    suite('Front Matter header', () => {
        suite('successful cases', () => {
            test('produces expected tokens', async () => {
                const test = disposables.add(new TestMarkdownExtensionsDecoder());
                // both line endings should result in the same result
                const newLine = (randomBoolean())
                    ? '\n'
                    : '\r\n';
                const markerLength = randomInt(10, 3);
                const promptContents = [
                    new Array(markerLength).fill('-').join(''),
                    'variables: ',
                    '  - name: value\v',
                    new Array(markerLength).fill('-').join(''),
                    'some text',
                ];
                const startMarker = TestFrontMatterMarker.create(markerLength, 1, newLine);
                const endMarker = TestFrontMatterMarker.create(markerLength, 4, newLine);
                await test.run(promptContents.join(newLine), [
                    // header
                    new FrontMatterHeader(new Range(1, 1, 4, 1 + markerLength + newLine.length), startMarker, new Text([
                        new Word(new Range(2, 1, 2, 1 + 9), 'variables'),
                        new Colon(new Range(2, 10, 2, 11)),
                        new Space(new Range(2, 11, 2, 12)),
                        ...TestEndOfLine.create(newLine, 2, 12).children,
                        new Space(new Range(3, 1, 3, 2)),
                        new Space(new Range(3, 2, 3, 3)),
                        new Dash(new Range(3, 3, 3, 4)),
                        new Space(new Range(3, 4, 3, 5)),
                        new Word(new Range(3, 5, 3, 5 + 4), 'name'),
                        new Colon(new Range(3, 9, 3, 10)),
                        new Space(new Range(3, 10, 3, 11)),
                        new Word(new Range(3, 11, 3, 11 + 5), 'value'),
                        new VerticalTab(new Range(3, 16, 3, 17)),
                        ...TestEndOfLine.create(newLine, 3, 17).children,
                    ]), endMarker),
                    // content after the header
                    new Word(new Range(5, 1, 5, 1 + 4), 'some'),
                    new Space(new Range(5, 5, 5, 6)),
                    new Word(new Range(5, 6, 5, 6 + 4), 'text'),
                ]);
            });
            test('can contain dashes in the header contents', async () => {
                const test = disposables.add(new TestMarkdownExtensionsDecoder());
                // both line endings should result in the same result
                const newLine = (randomBoolean())
                    ? '\n'
                    : '\r\n';
                const markerLength = randomInt(10, 4);
                // number of dashes inside the header contents it should not matter how many
                // dashes are there, but the count should not be equal to `markerLength`
                const dashesLength = (randomBoolean())
                    ? randomInt(markerLength - 1, 1)
                    : randomInt(2 * markerLength, markerLength + 1);
                const promptContents = [
                    // start marker
                    new Array(markerLength).fill('-').join(''),
                    // contents
                    'variables: ',
                    new Array(dashesLength).fill('-').join(''), // dashes inside the contents
                    '  - name: value\t',
                    // end marker
                    new Array(markerLength).fill('-').join(''),
                    'some text',
                ];
                const startMarker = TestFrontMatterMarker.create(markerLength, 1, newLine);
                const endMarker = TestFrontMatterMarker.create(markerLength, 4, newLine);
                await test.run(promptContents.join(newLine), [
                    // header
                    new FrontMatterHeader(new Range(1, 1, 5, 1 + markerLength + newLine.length), startMarker, new Text([
                        new Word(new Range(2, 1, 2, 1 + 9), 'variables'),
                        new Colon(new Range(2, 10, 2, 11)),
                        new Space(new Range(2, 11, 2, 12)),
                        ...TestEndOfLine.create(newLine, 2, 12).children,
                        // dashes inside the header
                        ...TestFrontMatterMarker.create(dashesLength, 3, newLine).dashTokens,
                        ...TestEndOfLine.create(newLine, 3, dashesLength + 1).children,
                        // -
                        new Space(new Range(4, 1, 4, 2)),
                        new Space(new Range(4, 2, 4, 3)),
                        new Dash(new Range(4, 3, 4, 4)),
                        new Space(new Range(4, 4, 4, 5)),
                        new Word(new Range(4, 5, 4, 5 + 4), 'name'),
                        new Colon(new Range(4, 9, 4, 10)),
                        new Space(new Range(4, 10, 4, 11)),
                        new Word(new Range(4, 11, 4, 11 + 5), 'value'),
                        new Tab(new Range(4, 16, 4, 17)),
                        ...TestEndOfLine.create(newLine, 4, 17).children,
                    ]), endMarker),
                    // content after the header
                    new Word(new Range(6, 1, 6, 1 + 4), 'some'),
                    new Space(new Range(6, 5, 6, 6)),
                    new Word(new Range(6, 6, 6, 6 + 4), 'text'),
                ]);
            });
            test('can be at the end of the file', async () => {
                const test = disposables.add(new TestMarkdownExtensionsDecoder());
                // both line endings should result in the same result
                const newLine = (randomBoolean())
                    ? '\n'
                    : '\r\n';
                const markerLength = randomInt(10, 4);
                const promptContents = [
                    // start marker
                    new Array(markerLength).fill('-').join(''),
                    // contents
                    '	description: "my description"',
                    // end marker
                    new Array(markerLength).fill('-').join(''),
                ];
                const startMarker = TestFrontMatterMarker.create(markerLength, 1, newLine);
                const endMarker = TestFrontMatterMarker.create(markerLength, 3);
                await test.run(promptContents.join(newLine), [
                    // header
                    new FrontMatterHeader(new Range(1, 1, 3, 1 + markerLength), startMarker, new Text([
                        new Tab(new Range(2, 1, 2, 2)),
                        new Word(new Range(2, 2, 2, 2 + 11), 'description'),
                        new Colon(new Range(2, 13, 2, 14)),
                        new Space(new Range(2, 14, 2, 15)),
                        new DoubleQuote(new Range(2, 15, 2, 16)),
                        new Word(new Range(2, 16, 2, 16 + 2), 'my'),
                        new Space(new Range(2, 18, 2, 19)),
                        new Word(new Range(2, 19, 2, 19 + 11), 'description'),
                        new DoubleQuote(new Range(2, 30, 2, 31)),
                        ...TestEndOfLine.create(newLine, 2, 31).children,
                    ]), endMarker),
                ]);
            });
        });
        suite('failure cases', () => {
            test('fails if header starts not on the first line', async () => {
                const test = disposables.add(new TestMarkdownExtensionsDecoder());
                const simpleDecoder = disposables.add(new TestSimpleDecoder());
                const marker = randomMarker(5);
                // prompt contents
                const contents = [
                    '',
                    marker,
                    'variables:',
                    '  - name: value',
                    marker,
                    'some text',
                ];
                // both line ending should result in the same result
                const newLine = (randomBoolean())
                    ? '\n'
                    : '\r\n';
                const stringContents = contents.join(newLine);
                // send the same contents to the simple decoder
                simpleDecoder.sendData(stringContents);
                // in the failure case we expect tokens to be re-emitted, therefore
                // the list of tokens produced must be equal to the one of SimpleDecoder
                await test.run(stringContents, (await simpleDecoder.receiveTokens()));
            });
            test('fails if header markers do not match (start marker is longer)', async () => {
                const test = disposables.add(new TestMarkdownExtensionsDecoder());
                const simpleDecoder = disposables.add(new TestSimpleDecoder());
                const marker = randomMarker(5);
                // prompt contents
                const contents = [
                    `${marker}${marker}`,
                    'variables:',
                    '  - name: value',
                    marker,
                    'some text',
                ];
                // both line ending should result in the same result
                const newLine = (randomBoolean())
                    ? '\n'
                    : '\r\n';
                const stringContents = contents.join(newLine);
                // send the same contents to the simple decoder
                simpleDecoder.sendData(stringContents);
                // in the failure case we expect tokens to be re-emitted, therefore
                // the list of tokens produced must be equal to the one of SimpleDecoder
                await test.run(stringContents, (await simpleDecoder.receiveTokens()));
            });
            test('fails if header markers do not match (end marker is longer)', async () => {
                const test = disposables.add(new TestMarkdownExtensionsDecoder());
                const simpleDecoder = disposables.add(new TestSimpleDecoder());
                const marker = randomMarker(5);
                const promptContents = [
                    marker,
                    'variables:',
                    '  - name: value',
                    `${marker}${marker}`,
                    'some text',
                ];
                // both line ending should result in the same result
                const newLine = (randomBoolean())
                    ? '\n'
                    : '\r\n';
                const stringContents = promptContents.join(newLine);
                // send the same contents to the simple decoder
                simpleDecoder.sendData(stringContents);
                // in the failure case we expect tokens to be re-emitted, therefore
                // the list of tokens produced must be equal to the one of SimpleDecoder
                await test.run(stringContents, (await simpleDecoder.receiveTokens()));
            });
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFya2Rvd25FeHRlbnNpb25zRGVjb2Rlci50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvYWR2aWthci9Eb2N1bWVudHMvYXJjaGl0ZWN0L2FyY2gyL0FyY2hJREUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC90ZXN0L2NvbW1vbi9wcm9tcHRTeW50YXgvY29kZWNzL21hcmtkb3duRXh0ZW5zaW9uc0RlY29kZXIudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFFcEUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQ3hFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUN6RSxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sMERBQTBELENBQUM7QUFDaEYsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDaEYsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLG9EQUFvRCxDQUFDO0FBQ25GLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUMxRCxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sd0VBQXdFLENBQUM7QUFDOUYsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLDBFQUEwRSxDQUFDO0FBRW5HLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBQ2pFLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQ3pHLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxpRkFBaUYsQ0FBQztBQUNqSCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxpR0FBaUcsQ0FBQztBQUNwSSxPQUFPLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxXQUFXLEVBQUUsS0FBSyxFQUFFLEdB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QkFBaUIsQ0FDcEIsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxHQUFHLFlBQVksQ0FBQyxFQUNwQyxXQUFXLEVBQ1gsSUFBSSxJQUFJLENBQUM7d0JBQ1IsSUFBSSxHQUFHLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7d0JBQzlCLElBQUksSUFBSSxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsR0FBRyxFQUFFLENBQUMsRUFBRSxhQUFhLENBQUM7d0JBQ25ELElBQUksS0FBSyxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO3dCQUNsQyxJQUFJLEtBQUssQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQzt3QkFDbEMsSUFBSSxXQUFXLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7d0JBQ3hDLElBQUksSUFBSSxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsR0FBRyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUM7d0JBQzNDLElBQUksS0FBSyxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO3dCQUNsQyxJQUFJLElBQUksQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUUsYUFBYSxDQUFDO3dCQUNyRCxJQUFJLFdBQVcsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMs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