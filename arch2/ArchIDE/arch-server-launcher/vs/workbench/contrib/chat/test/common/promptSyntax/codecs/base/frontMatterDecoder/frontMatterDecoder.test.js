/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Range } from '../../../../../../../../../editor/common/core/range.js';
import { TestDecoder } from '../utils/testDecoder.js';
import { newWriteableStream } from '../../../../../../../../../base/common/stream.js';
import { NewLine } from '../../../../../../common/promptSyntax/codecs/base/linesCodec/tokens/newLine.js';
import { DoubleQuote } from '../../../../../../common/promptSyntax/codecs/base/simpleCodec/tokens/doubleQuote.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../../../../../base/test/common/utils.js';
import { LeftBracket, RightBracket } from '../../../../../../common/promptSyntax/codecs/base/simpleCodec/tokens/brackets.js';
import { FrontMatterDecoder } from '../../../../../../common/promptSyntax/codecs/base/frontMatterCodec/frontMatterDecoder.js';
import { FrontMatterSequence } from '../../../../../../common/promptSyntax/codecs/base/frontMatterCodec/tokens/frontMatterSequence.js';
import { ExclamationMark, Quote, Tab, Word, Space, Colon, VerticalTab, Comma, Dash } from '../../../../../../common/promptSyntax/codecs/base/simpleCodec/tokens/tokens.js';
import { FrontMatterBoolean, FrontMatterString, FrontMatterArray, FrontMatterRecord, FrontMatterRecordDelimiter, FrontMatterRecordName } from '../../../../../../common/promptSyntax/codecs/base/frontMatterCodec/tokens/index.js';
/**
 * Front Matter decoder for testing purposes.
 */
export class TestFrontMatterDecoder extends TestDecoder {
    constructor() {
        const stream = newWriteableStream(null);
        const decoder = new FrontMatterDecoder(stream);
        super(stream, decoder);
    }
}
suite('FrontMatterDecoder', () => {
    const disposables = ensureNoDisposablesAreLeakedInTestSuite();
    test('produces expected tokens', async () => {
        const test = disposables.add(new TestFrontMatterDecoder());
        await test.run([
            'just: "write some yaml "',
            'write-some :\t[ \' just\t \',  "yaml!", true, , ,]',
            'anotherField \t\t\t  :  FALSE ',
        ], [
            // first record
            new FrontMatterRecord([
                new FrontMatterRecordName([
                    new Word(new Range(1, 1, 1, 1 + 4), 'just'),
                ]),
                new FrontMatterRecordDelimiter([
                    new Colon(new Range(1, 5, 1, 6)),
                    new Space(new Range(1, 6, 1, 7)),
                ]),
                new FrontMatterString([
                    new DoubleQuote(new Range(1, 7, 1, 8)),
                    new Word(new Range(1, 8, 1, 8 + 5), 'write'),
                    new Space(new Range(1, 13, 1, 14)),
                    new Word(new Range(1, 14, 1, 14 + 4), 'some'),
                    new Space(new Range(1, 18, 1, 19)),
                    new Word(new Range(1, 19, 1, 19 + 4), 'yaml'),
                    new Space(new Range(1, 23, 1, 24)),
                    new DoubleQuote(new Range(1, 24, 1, 25)),
                ]),
            ]),
            new NewLine(new Range(1, 25, 1, 26)),
            // second record
            new FrontMatterRecord([
                new FrontMatterRecordName([
                    new Word(new Range(2, 1, 2, 1 + 5), 'write'),
                    new Dash(new Range(2, 6, 2, 7)),
                    new Word(new Range(2, 7, 2, 7 + 4), 'some'),
                ]),
                new FrontMatterRecordDelimiter([
                    new Colon(new Range(2, 12, 2, 13)),
                    new Tab(new Range(2, 13, 2, 14)),
                ]),
                new FrontMatterArray([
                    new LeftBracket(new Range(2, 14, 2, 15)),
                    new FrontMatterString([
                        new Quote(new Range(2, 16, 2, 17)),
                        new Space(new Range(2, 17, 2, 18)),
                        new Word(new Range(2, 18, 2, 18 + 4), 'just'),
                        new Tab(new Range(2, 22, 2, 23)),
                        new Space(new Range(2, 23, 2, 24)),
                        new Quote(new Range(2, 24, 2, 25)),
                    ]),
                    new FrontMatterString([
                        new DoubleQuote(new Range(2, 28, 2, 29)),
                        new Word(new Range(2, 29, 2, 29 + 4), 'yaml'),
                        new ExclamationMark(new Range(2, 33, 2, 34)),
                        new DoubleQuote(new Range(2, 34, 2, 35)),
                    ]),
                    new FrontMatterBoolean(new Word(new Range(2, 37, 2, 37 + 4), 'true')),
                    new RightBracket(new Range(2, 46, 2, 47)),
                ]),
            ]),
            new NewLine(new Range(2, 47, 2, 48)),
            // third record
            new FrontMatterRecord([
                new FrontMatterRecordName([
                    new Word(new Range(3, 1, 3, 1 + 12), 'anotherField'),
                ]),
                new FrontMatterRecordDelimiter([
                    new Colon(new Range(3, 19, 3, 20)),
                    new Space(new Range(3, 20, 3, 21)),
                ]),
                new FrontMatterBoolean(new Word(new Range(3, 22, 3, 22 + 5), 'FALSE')),
            ]),
            new Space(new Range(3, 27, 3, 28)),
        ]);
    });
    suite('record', () => {
        suite('values', () => {
            test('unquoted string', async () => {
                const test = disposables.add(new TestFrontMatterDecoder());
                await test.run([
                    'just: write some yaml ',
                    'anotherField \t\t :  fal\v \t',
                ], [
                    // first record
                    new FrontMatterRecord([
                        new FrontMatterRecordName([
                            new Word(new Range(1, 1, 1, 1 + 4), 'just'),
                        ]),
                        new FrontMatterRecordDelimiter([
                            new Colon(new Range(1, 5, 1, 6)),
                            new Space(new Range(1, 6, 1, 7)),
                        ]),
                        new FrontMatterSequence([
                            new Word(new Range(1, 7, 1, 7 + 5), 'write'),
                            new Space(new Range(1, 12, 1, 13)),
                            new Word(new Range(1, 13, 1, 13 + 4), 'some'),
                            new Space(new Range(1, 17, 1, 18)),
                            new Word(new Range(1, 18, 1, 18 + 4), 'yaml'),
                        ]),
                    ]),
                    new Space(new Range(1, 22, 1, 23)),
                    new NewLine(new Range(1, 23, 1, 24)),
                    // second record
                    new FrontMatterRecord([
                        new FrontMatterRecordName([
                            new Word(new Range(2, 1, 2, 1 + 12), 'anotherField'),
                        ]),
                        new FrontMatterRecordDelimiter([
                            new Colon(new Range(2, 17, 2, 18)),
                            new Space(new Range(2, 18, 2, 19)),
                        ]),
                        new FrontMatterSequence([
                            new Word(new Range(2, 20, 2, 20 + 3), 'fal'),
                        ]),
                    ]),
                    new VerticalTab(new Range(2, 23, 2, 24)),
                    new Space(new Range(2, 24, 2, 25)),
                    new Tab(new Range(2, 25, 2, 26)),
                ]);
            });
            test('quoted string', async () => {
                const test = disposables.add(new TestFrontMatterDecoder());
                await test.run([
                    `just\t:\t'\vdo\tsome\ntesting, please\v' `,
                    'anotherField \t\t :\v\v"fal\nse"',
                ], [
                    // first record
                    new FrontMatterRecord([
                        new FrontMatterRecordName([
                            new Word(new Range(1, 1, 1, 1 + 4), 'just'),
                        ]),
                        new FrontMatterRecordDelimiter([
                            new Colon(new Range(1, 6, 1, 7)),
                            new Tab(new Range(1, 7, 1, 8)),
                        ]),
                        new FrontMatterString([
                            new Quote(new Range(1, 8, 1, 9)),
                            new VerticalTab(new Range(1, 9, 1, 10)),
                            new Word(new Range(1, 10, 1, 10 + 2), 'do'),
                            new Tab(new Range(1, 12, 1, 13)),
                            new Word(new Range(1, 13, 1, 13 + 4), 'some'),
                            new NewLine(new Range(1, 17, 1, 18)),
                            new Word(new Range(2, 1, 2, 1 + 7), 'testing'),
                            new Comma(new Range(2, 8, 2, 9)),
                            new Space(new Range(2, 9, 2, 10)),
                            new Word(new Range(2, 10, 2, 10 + 6), 'please'),
                            new VerticalTab(new Range(2, 16, 2, 17)),
                            new Quote(new Range(2, 17, 2, 18)),
                        ]),
                    ]),
                    new Space(new Range(2, 18, 2, 19)),
                    new NewLine(new Range(2, 19, 2, 20)),
                    // second record
                    new FrontMatterRecord([
                        new FrontMatterRecordName([
                            new Word(new Range(3, 1, 3, 1 + 12), 'anotherField'),
                        ]),
                        new FrontMatterRecordDelimiter([
                            new Colon(new Range(3, 17, 3, 18)),
                            new VerticalTab(new Range(3, 18, 3, 19)),
                        ]),
                        new FrontMatterString([
                            new DoubleQuote(new Range(3, 20, 3, 21)),
                            new Word(new Range(3, 21, 3, 21 + 3), 'fal'),
                            new NewLine(new Range(3, 24, 3, 25)),
                            new Word(new Range(4, 1, 4, 1 + 2), 'se'),
                            new DoubleQuote(new Range(4, 3, 4, 4)),
                        ]),
                    ]),
                ]);
            });
            test('boolean', async () => {
                const test = disposables.add(new TestFrontMatterDecoder());
                await test.run([
                    'anotherField \t\t :  FALSE ',
                    'my-field: true\t ',
                ], [
                    // first record
                    new FrontMatterRecord([
                        new FrontMatterRecordName([
                            new Word(new Range(1, 1, 1, 1 + 12), 'anotherField'),
                        ]),
                        new FrontMatterRecordDelimiter([
                            new Colon(new Range(1, 17, 1, 18)),
                            new Space(new Range(1, 18, 1, 19)),
                        ]),
                        new FrontMatterBoolean(new Word(new Range(1, 20, 1, 20 + 5), 'FALSE')),
                    ]),
                    new Space(new Range(1, 25, 1, 26)),
                    new NewLine(new Range(1, 26, 1, 27)),
                    // second record
                    new FrontMatterRecord([
                        new FrontMatterRecordName([
                            new Word(new Range(2, 1, 2, 1 + 2), 'my'),
                            new Dash(new Range(2, 3, 2, 4)),
                            new Word(new Range(2, 4, 2, 4 + 5), 'field'),
                        ]),
                        new FrontMatterRecordDelimiter([
                            new Colon(new Range(2, 9, 2, 10)),
                            new Space(new Range(2, 10, 2, 11)),
                        ]),
                        new FrontMatterBoolean(new Word(new Range(2, 11, 2, 11 + 4), 'true')),
                    ]),
                    new Tab(new Range(2, 15, 2, 16)),
                    new Space(new Range(2, 16, 2, 17)),
                ]);
            });
            suite('array', () => {
                test('empty', async () => {
                    const test = disposables.add(new TestFrontMatterDecoder());
                    await test.run([
                        `tools\v:\t []`,
                        'anotherField \t\t :\v\v"fal\nse"',
                    ], [
                        // first record
                        new FrontMatterRecord([
                            new FrontMatterRecordName([
                                new Word(new Range(1, 1, 1, 1 + 5), 'tools'),
                            ]),
                            new FrontMatterRecordDelimiter([
                                new Colon(new Range(1, 7, 1, 8)),
                                new Tab(new Range(1, 8, 1, 9)),
                            ]),
                            new FrontMatterArray([
                                new LeftBracket(new Range(1, 10, 1, 11)),
                                new RightBracket(new Range(1, 11, 1, 12)),
                            ]),
                        ]),
                        new NewLine(new Range(1, 12, 1, 13)),
                        // second record
                        new FrontMatterRecord([
                            new FrontMatterRecordName([
                                new Word(new Range(2, 1, 2, 1 + 12), 'anotherField'),
                            ]),
                            new FrontMatterRecordDelimiter([
                                new Colon(new Range(2, 17, 2, 18)),
                                new VerticalTab(new Range(2, 18, 2, 19)),
                            ]),
                            new FrontMatterString([
                                new DoubleQuote(new Range(2, 20, 2, 21)),
                                new Word(new Range(2, 21, 2, 21 + 3), 'fal'),
                                new NewLine(new Range(2, 24, 2, 25)),
                                new Word(new Range(3, 1, 3, 1 + 2), 'se'),
                                new DoubleQuote(new Range(3, 3, 3, 4)),
                            ]),
                        ]),
                    ]);
                });
                test('mixed values', async () => {
                    const test = disposables.add(new TestFrontMatterDecoder());
                    await test.run([
                        `tools\v:\t [true , 'toolName', some-tool]`,
                    ], [
                        // first record
                        new FrontMatterRecord([
                            new FrontMatterRecordName([
                                new Word(new Range(1, 1, 1, 1 + 5), 'tools'),
                            ]),
                            new FrontMatterRecordDelimiter([
                                new Colon(new Range(1, 7, 1, 8)),
                                new Tab(new Range(1, 8, 1, 9)),
                            ]),
                            new FrontMatterArray([
                                new LeftBracket(new Range(1, 10, 1, 11)),
                                // first array value
                                new FrontMatterBoolean(new Word(new Range(1, 11, 1, 11 + 4), 'true')),
                                // second array value
                                new FrontMatterString([
                                    new Quote(new Range(1, 18, 1, 19)),
                                    new Word(new Range(1, 19, 1, 19 + 8), 'toolName'),
                                    new Quote(new Range(1, 27, 1, 28)),
                                ]),
                                // third array value
                                new FrontMatterSequence([
                                    new Word(new Range(1, 30, 1, 30 + 4), 'some'),
                                    new Dash(new Range(1, 34, 1, 35)),
                                    new Word(new Range(1, 35, 1, 35 + 4), 'tool'),
                                ]),
                                new RightBracket(new Range(1, 39, 1, 40)),
                            ]),
                        ]),
                    ]);
                });
                test('redundant commas', async () => {
                    const test = disposables.add(new TestFrontMatterDecoder());
                    await test.run([
                        `tools\v:\t [true ,, 'toolName', , , some-tool  ,]`,
                    ], [
                        // first record
                        new FrontMatterRecord([
                            new FrontMatterRecordName([
                                new Word(new Range(1, 1, 1, 1 + 5), 'tools'),
                            ]),
                            new FrontMatterRecordDelimiter([
                                new Colon(new Range(1, 7, 1, 8)),
                                new Tab(new Range(1, 8, 1, 9)),
                            ]),
                            new FrontMatterArray([
                                new LeftBracket(new Range(1, 10, 1, 11)),
                                // first array value
                                new FrontMatterBoolean(new Word(new Range(1, 11, 1, 11 + 4), 'true')),
                                // second array value
                                new FrontMatterString([
                                    new Quote(new Range(1, 19, 1, 20)),
                                    new Word(new Range(1, 20, 1, 20 + 8), 'toolName'),
                                    new Quote(new Range(1, 28, 1, 29)),
                                ]),
                                // third array value
                                new FrontMatterSequence([
                                    new Word(new Range(1, 35, 1, 35 + 4), 'some'),
                                    new Dash(new Range(1, 39, 1, 40)),
                                    new Word(new Range(1, 40, 1, 40 + 4), 'tool'),
                                ]),
                                new RightBracket(new Range(1, 47, 1, 48)),
                            ]),
                        ]),
                    ]);
                });
            });
        });
    });
    test('empty', async () => {
        const test = disposables.add(new TestFrontMatterDecoder());
        await test.run('', []);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZnJvbnRNYXR0ZXJEZWNvZGVyLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9hZHZpa2FyL0RvY3VtZW50cy9hcmNoaXRlY3QvYXJjaDIvQXJjaElERS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L3Rlc3QvY29tbW9uL3Byb21wdFN5bnRheC9jb2RlY3MvYmFzZS9mcm9udE1hdHRlckRlY29kZXIvZnJvbnRNYXR0ZXJEZWNvZGVyLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHdEQUF3RCxDQUFDO0FBQy9FLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQztBQUV0RCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUN0RixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sZ0ZBQWdGLENBQUM7QUFDekcsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHFGQUFxRixDQUFDO0FBRWxILE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQy9HLE9BQU8sRUFBRSxXQUFXLEVBQUUsWUFBWSxFQUFFLE1BQU0sa0ZBQWtGLENBQUM7QUFDN0gsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sMEZBQTBGLENBQUM7QUFDOUgsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sa0dBQWtHLENBQUM7QUFDdkksT0FBTyxFQUFFLGVBQWUsRUFBRSxLQUFLLEVBQUUsR0FBRyxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLFdBQVcsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLE1BQU0sZ0ZBQWdGLENBQUM7QUFDM0ssT0FBTyxFQUFFLGtCQUFrQixFQUFFLGlCQUFpQixFQUFFLGdCQUFnQixFQUFFLGlCQUFpQixFQUFFLDBCQUEwQixFQUFFLHFCQUFxQixFQUFFLE1BQU0sb0ZBQW9GLENBQUM7QUFFbk87O0dBRUc7QUFDSCxNQUFNLE9BQU8sc0JBQXVCLFNBQVEsV0FBb0Q7SUFDL0Y7UUFDQyxNQUFNLE1BQU0sR0FBRyxrQkFBa0IsQ0FBVyxJQUFJLENBQUMsQ0FBQztRQUNsRCxNQUFNLE9BQU8sR0FBRyxJQUFJLGtCQUFrQixDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBRS9DLEtBQUssQ0FBQyxNQUFNLEVBQUUsT0FBTyxDQUFDLENBQUM7SUFDeEIsQ0FBQztDQUNEO0FBRUQsS0FBSyxDQUFDLG9CQUFvQixFQUFFLEdBQUcsRUFBRTtJQUNoQyxNQUFNLFdBQVcsR0FBRyx1Q0FBdUMsRUFBRSxDQUFDO0lBRTlELElBQUksQ0FBQywwQkFBMEIsRUFBRSxLQUFLLElBQUksRUFBRTtRQUMzQyxNQUFNLElBQUksR0FBRyxXQUFXLENBQUMsR0FBRyxDQUFDLElBQUksc0JBQXNCLEVBQUUsQ0FBQyxDQUFDO1FBRTNELE1BQU0sSUFBSSxDQUFDLEdBQUcsQ0FDYjtZQUNDLDBCQUEwQjtZQUMxQixvREFBb0Q7WUFDcEQsZ0NBQWdDO1NBQ2hDLEVBQ0Q7WUFDQyxlQUFlO1lBQ2YsSUFBSSxpQkFBaUIsQ0FBQztnQkFDckIsSUFBSSxxQkFBcUIsQ0FBQztvQkFDekIsSUFBSSxJQUFJLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLE1BQU0sQ0FBQztpQkFDM0MsQ0FBQztnQkFDRixJQUFJLDBCQUEwQixDQUFDO29CQUM5QixJQUFJLEtBQUssQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztvQkFDaEMsSUFBSSxLQUFLLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7aUJBQ2hDLENBQUM7Z0JBQ0YsSUFBSSxpQkFBaUIsQ0FBQztvQkFDckIsSUFBSSxXQUFXLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7b0JBQ3RDLElBQUksSUFBSSxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxPQUFPLENBQUM7b0JBQzVDLElBQUksS0FBSyxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO29CQUNsQyxJQUFJLElBQUksQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLEdBQUcsQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDO29CQUM3QyxJQUFJLEtBQUssQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztvQkFDbEMsSUFBSSxJQUFJLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxHQUFHLENBQUMsQ0FBQyxFQUFFLE1BQU0sQ0FBQztvQkFDN0MsSUFBSSxLQUFLLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7b0JBQ2xDLElBQUksV0FBVyxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO2lCQUN4QyxDQUFDO2FBQ0YsQ0FBQztZQUNGLElBQUksT0FBTyxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1lBQ3BDLGdCQUFnQjtZQUNoQixJQUFJLGlCQUFpQixDQUFDO2dCQUNyQixJQUFJLHFCQUFxQixDQUFDO29CQUN6QixJQUFJLElBQUksQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsT0FBTyxDQUFDO29CQUM1QyxJQUFJLElBQUksQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztvQkFDL0IsSUFBSSxJQUFJLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLE1BQU0sQ0FBQztpQkFDM0MsQ0FBQztnQkFDRixJQUFJLDBCQUEwQixDQUFDO29CQUM5QixJQUFJLEtBQUssQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztvQkFDbEMsSUFBSSxHQUFHLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7aUJBQ2hDLENBQUM7Z0JBQ0YsSUFBSSxnQkFBZ0IsQ0FBQztvQkFDcEIsSUFBSSxXQUFXLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7b0JBQ3hDLElBQUksaUJBQWlCLENBQUM7d0JBQ3JCLElBQUksS0FBSyxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO3dCQUNsQyxJQUFJLEtBQUssQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQzt3QkFDbEMsSUFBSSxJQUFJLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxHQUFHLENBQUMsQ0FBQyxFQUFFLE1BQU0sQ0FBQzt3QkFDN0MsSUFBSSxHQUFHLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7d0JBQ2hDLElBQUksS0FBSyxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO3dCQUNsQyxJQUFJLEtBQUssQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztxQkFDbEMsQ0FBQztvQkFDRixJQUFJLGlCQUFpQixDQUFDO3dCQUNyQixJQUFJLFdBQVcsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQzt3QkFDeEMsSUFBSSxJQUFJLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxHQUFHLENBQUMsQ0FBQyxFQUFFLE1BQU0sQ0FBQzt3QkFDN0MsSUFBSSxlQUFlLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7d0JBQzVDLElBQUksV0FBVyxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO3FCQUN4QyxDQUFDO29CQUNGLElBQUksa0JBQWtCLENBQ3JCLElBQUksSUFBSSxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsR0FBRyxDQUFDLENBQUMsRUFBRSxNQUFNLENBQUMsQ0FDN0M7b0JBQ0QsSUFBSSxZQUFZLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7aUJBQ3pDLENBQUM7YUFDRixDQUFDO1lBQ0YsSUFBSSxPQUFPLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7WUFDcEMsZUFBZTtZQUNmLElBQUksaUJBQWlCLENBQUM7Z0JBQ3JCLElBQUkscUJBQXFCLENBQUM7b0JBQ3pCLElBQUksSUFBSSxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsR0FBRyxFQUFFLENBQUMsRUFBRSxjQUFjLENBQUM7aUJBQ3BELENBQUM7Z0JBQ0YsSUFBSSwwQkFBMEIsQ0FBQztvQkFDOUIsSUFBSSxLQUFLLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7b0JBQ2xDLElBQUksS0FBSyxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO2lCQUNsQyxDQUFDO2dCQUNGLElBQUksa0JBQWtCLENBQ3JCLElBQUksSUFBSSxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsR0FBRyxDQUFDLENBQUMsRUFBRSxPQUFPLENBQUMsQ0FDOUM7YUFDRCxDQUFDO1lBQ0YsSUFBSSxLQUFLLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7U0FDbEMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQyxDQUFDLENBQUM7SUFFSCxLQUFLLENBQUMsUUFBUSxFQUFFLEdBQUcsRUFBRTtRQUNwQixLQUFLLENBQUMsUUFBUSxFQUFFLEdBQUcsRUFBRTtZQUNwQixJQUFJLENBQUMsaUJBQWlCLEVBQUUsS0FBSyxJQUFJLEVBQUU7Z0JBQ2xDLE1BQU0sSUFBSSxHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQUMsSUFBSSxzQkFBc0IsRUFBRSxDQUFDLENBQUM7Z0JBRTNELE1BQU0sSUFBSSxDQUFDLEdBQUcsQ0FDYjtvQkFDQyx3QkFBd0I7b0JBQ3hCLCtCQUErQjtpQkFDL0IsRUFDRDtvQkFDQyxlQUFlO29CQUNmLElBQUksaUJBQWlCLENBQUM7d0JBQ3JCLElBQUkscUJBQXFCLENBQUM7NEJBQ3pCLElBQUksSUFBSSxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxNQUFNLENBQUM7eUJBQzNDLENBQUM7d0JBQ0YsSUFBSSwwQkFBMEIsQ0FBQzs0QkFDOUIsSUFBSSxLQUFLLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7NEJBQ2hDLElBQUksS0FBSyxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO3lCQUNoQyxDQUFDO3dCQUNGLElBQUksbUJBQW1CLENBQUM7NEJBQ3ZCLElBQUksSUFBSSxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxPQUFPLENBQUM7NEJBQzVDLElBQUksS0FBSyxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDOzRCQUNsQyxJQUFJLElBQUksQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLEdBQUcsQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDOzRCQUM3QyxJQUFJLEtBQUssQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQzs0QkFDbEMsSUFBSSxJQUFJLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxHQUFHLENBQUMsQ0FBQyxFQUFFLE1BQU0sQ0FBQzt5QkFDN0MsQ0FBQztxQkFDRixDQUFDO29CQUNGLElBQUksS0FBSyxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO29CQUNsQyxJQUFJLE9BQU8sQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztvQkFDcEMsZ0JBQWdCO29CQUNoQixJQUFJLGlCQUFpQixDQUFDO3dCQUNyQixJQUFJLHFCQUFxQixDQUFDOzRCQUN6QixJQUFJLElBQUksQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEdBQUcsRUFBRSxDQUFDLEVBQUUsY0FBYyxDQUFDO3lCQUNwRCxDQUFDO3dCQUNGLElBQUksMEJBQTBCLENBQUM7NEJBQzlCLElBQUksS0FBSyxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDOzRCQUNsQyxJQUFJLEtBQUssQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQzt5QkFDbEMsQ0FBQzt3QkFDRixJQUFJLG1CQUFtQixDQUFDOzRCQUN2QixJQUFJLElBQUksQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLEdBQUcsQ0FBQyxDQUFDLEVBQUUsS0FBSyxDQUFDO3lCQUM1QyxDQUFDO3FCQUNGLENBQUM7b0JBQ0YsSUFBSSxXQUFXLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7b0JBQ3hDLElBQUksS0FBSyxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO29CQUNsQyxJQUFJLEdBQUcsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztpQkFDaEMsQ0FBQyxDQUFDO1lBQ0wsQ0FBQyxDQUFDLENBQUM7WUFFSCxJQUFJLENBQUMsZUFBZSxFQUFFLEtBQUssSUFBSSxFQUFFO2dCQUNoQyxNQUFNLElBQUksR0FBRyxXQUFXLENBQUMsR0FBRyxDQUFDLElBQUksc0JBQXNCLEVBQUUsQ0FBQyxDQUFDO2dCQUUzRCxNQUFNLElBQUksQ0FBQyxHQUFHLENBQ2I7b0JBQ0MsMkNBQTJDO29CQUMzQyxrQ0FBa0M7aUJBQ2xDLEVBQ0Q7b0JBQ0MsZUFBZTtvQkFDZixJQUFJLGlCQUFpQixDQUFDO3dCQUNyQixJQUFJLHFCQUFxQixDQUFDOzRCQUN6QixJQUFJLElBQUksQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDO3lCQUMzQyxDQUFDO3dCQUNGLElBQUksMEJBQTBCLENBQUM7NEJBQzlCLElBQUksS0FBSyxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDOzRCQUNoQyxJQUFJLEdBQUcsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQzt5QkFDOUIsQ0FBQzt3QkFDRixJQUFJLGlCQUFpQixDQUFDOzRCQUNyQixJQUFJLEtBQUssQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQzs0QkFDaEMsSUFBSSxXQUFXLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7NEJBQ3ZDLElBQUksSUFBSSxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsR0FBRyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUM7NEJBQzNDLElBQUksR0FBRyxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDOzRCQUNoQyxJQUFJLElBQUksQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLEdBQUcsQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDOzRCQUM3QyxJQUFJLE9BQU8sQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQzs0QkFDcEMsSUFBSSxJQUFJLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLFNBQVMsQ0FBQzs0QkFDOUMsSUFBSSxLQUFLLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7NEJBQ2hDLElBQUksS0FBSyxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDOzRCQUNqQyxJQUFJLElBQUksQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLEdBQUcsQ0FBQyxDQUFDLEVBQUUsUUFBUSxDQUFDOzRCQUMvQyxJQUFJLFdBQVcsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQzs0QkFDeEMsSUFBSSxLQUFLLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7eUJBQ2xDLENBQUM7cUJBQ0YsQ0FBQztvQkFDRixJQUFJLEtBQUssQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztvQkFDbEMsSUFBSSxPQUFPLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7b0JBQ3BDLGdCQUFnQjtvQkFDaEIsSUFBSSxpQkFBaUIsQ0FBQzt3QkFDckIsSUFBSSxxQkFBcUIsQ0FBQzs0QkFDekIsSUFBSSxJQUFJLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxFQUFFLGNBQWMsQ0FBQzt5QkFDcEQsQ0FBQzt3QkFDRixJQUFJLDBCQUEwQixDQUFDOzRCQUM5QixJQUFJLEtBQUssQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQzs0QkFDbEMsSUFBSSxXQUFXLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7eUJBQ3hDLENBQUM7d0JBQ0YsSUFBSSxpQkFBaUIsQ0FBQzs0QkFDckIsSUFBSSxXQUFXLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7NEJBQ3hDLElBQUksSUFBSSxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsR0FBRyxDQUFDLENBQUMsRUFBRSxLQUFLLENBQUM7NEJBQzVDLElBQUksT0FBTyxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDOzRCQUNwQyxJQUFJLElBQUksQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDOzRCQUN6QyxJQUFJLFdBQVcsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQzt5QkFDdEMsQ0FBQztxQkFDRixDQUFDO2lCQUNGLENBQUMsQ0FBQztZQUNMLENBQUMsQ0FBQyxDQUFDO1lBRUgsSUFBSSxDQUFDLFNBQVMsRUFBRSxLQUFLLElBQUksRUFBRTtnQkFDMUIsTUFBTSxJQUFJLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FBQyxJQUFJLHNCQUFzQixFQUFFLENBQUMsQ0FBQztnQkFFM0QsTUFBTSxJQUFJLENBQUMsR0FBRyxDQUNiO29CQUNDLDZCQUE2QjtvQkFDN0IsbUJBQW1CO2lCQUNuQixFQUNEO29CQUNDLGVBQWU7b0JBQ2YsSUFBSSxpQkFBaUIsQ0FBQzt3QkFDckIsSUFBSSxxQkFBcUIsQ0FBQzs0QkFDekIsSUFBSSxJQUFJLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxFQUFFLGNBQWMsQ0FBQzt5QkFDcEQsQ0FBQzt3QkFDRixJQUFJLDBCQUEwQixDQUFDOzRCQUM5QixJQUFJLEtBQUssQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQzs0QkFDbEMsSUFBSSxLQUFLLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7eUJBQ2xDLENBQUM7d0JBQ0YsSUFBSSxrQkFBa0IsQ0FDckIsSUFBSSxJQUFJLENBQ1AsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxHQUFHLENBQUMsQ0FBQyxFQUMzQixPQUFPLENBQ1AsQ0FDRDtxQkFDRCxDQUFDO29CQUNGLElBQUksS0FBSyxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO29CQUNsQyxJQUFJLE9BQU8sQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztvQkFDcEMsZ0JBQWdCO29CQUNoQixJQUFJLGlCQUFpQixDQUFDO3dCQUNyQixJQUFJLHFCQUFxQixDQUFDOzRCQUN6QixJQUFJLElBQUksQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDOzRCQUN6QyxJQUFJLElBQUksQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQzs0QkFDL0IsSUFBSSxJQUFJLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLE9BQU8sQ0FBQzt5QkFDNUMsQ0FBQzt3QkFDRixJQUFJLDBCQUEwQixDQUFDOzRCQUM5QixJQUFJLEtBQUssQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQzs0QkFDakMsSUFBSSxLQUFLLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7eUJBQ2xDLENBQUM7d0JBQ0YsSUFBSSxrQkFBa0IsQ0FDckIsSUFBSSxJQUFJLENBQ1AsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxHQUFHLENBQUMsQ0FBQyxFQUMzQixNQUFNLENBQ04sQ0FDRDtxQkFDRCxDQUFDO29CQUNGLElBQUksR0FBRyxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO29CQUNoQyxJQUFJLEtBQUssQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztpQkFDbEMsQ0FBQyxDQUFDO1lBQ0wsQ0FBQyxDQUFDLENBQUM7WUFFSCxLQUFLLENBQUMsT0FBTyxFQUFFLEdBQUcsRUFBRTtnQkFDbkIsSUFBSSxDQUFDLE9BQU8sRUFBRSxLQUFLLElBQUksRUFBRTtvQkFDeEIsTUFBTSxJQUFJLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FBQyxJQUFJLHNCQUFzQixFQUFFLENBQUMsQ0FBQztvQkFFM0QsTUFBTSxJQUFJLENBQUMsR0FBRyxDQUNiO3dCQUNDLGVBQWU7d0JBQ2Ysa0NBQWtDO3FCQUNsQyxFQUNEO3dCQUNDLGVBQWU7d0JBQ2YsSUFBSSxpQkFBaUIsQ0FBQzs0QkFDckIsSUFBSSxxQkFBcUIsQ0FBQztnQ0FDekIsSUFBSSxJQUFJLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLE9BQU8sQ0FBQzs2QkFDNUMsQ0FBQzs0QkFDRixJQUFJLDBCQUEwQixDQUFDO2dDQUM5QixJQUFJLEtBQUssQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztnQ0FDaEMsSUFBSSxHQUFHLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7NkJBQzlCLENBQUM7NEJBQ0YsSUFBSSxnQkFBZ0IsQ0FBQztnQ0FDcEIsSUFBSSxXQUFXLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7Z0NBQ3hDLElBQUksWUFBWSxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDOzZCQUN6QyxDQUFDO3lCQUNGLENBQUM7d0JBQ0YsSUFBSSxPQUFPLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7d0JBQ3BDLGdCQUFnQjt3QkFDaEIsSUFBSSxpQkFBaUIsQ0FBQzs0QkFDckIsSUFBSSxxQkFBcUIsQ0FBQztnQ0FDekIsSUFBSSxJQUFJLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxFQUFFLGNBQWMsQ0FBQzs2QkFDcEQsQ0FBQzs0QkFDRixJQUFJLDBCQUEwQixDQUFDO2dDQUM5QixJQUFJLEtBQUssQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztnQ0FDbEMsSUFBSSxXQUFXLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7NkJBQ3hDLENBQUM7NEJBQ0YsSUFBSSxpQkFBaUIsQ0FBQztnQ0FDckIsSUFBSSxXQUFXLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7Z0NBQ3hDLElBQUksSUFBSSxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsR0FBRyxDQUFDLENBQUMsRUFBRSxLQUFLLENBQUM7Z0NBQzVDLElBQUksT0FBTyxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO2dDQUNwQyxJQUFJLElBQUksQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDO2dDQUN6QyxJQUFJLFdBQVcsQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQzs2QkFDdEMsQ0FBQzt5QkFDRixDQUFDO3FCQUNGLENBQUMsQ0FBQztnQkFDTCxDQUFDLENBQUMsQ0FBQztnQkFFSCxJQUFJLENBQUMsY0FBYyxFQUFFLEtBQUssSUFBSSxFQUFFO29CQUMvQixNQUFNLElBQUksR0FBRyxXQUFXLENBQUMsR0FBRyxDQUFDLElBQUksc0JBQXNCLEVBQUUsQ0FBQyxDQUFDO29CQUUzRCxNQUFNLElBQUksQ0FBQyxHQUFHLENBQ2I7d0JBQ0MsMkNBQTJDO3FCQUMzQyxFQUNEO3dCQUNDLGVBQWU7d0JBQ2YsSUFBSSxpQkFBaUIsQ0FBQzs0QkFDckIsSUFBSSxxQkFBcUIsQ0FBQztnQ0FDekIsSUFBSSxJQUFJLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLE9BQU8sQ0FBQzs2QkFDNUMsQ0FBQzs0QkFDRixJQUFJLDBCQUEwQixDQUFDO2dDQUM5QixJQUFJLEtBQUssQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztnQ0FDaEMsSUFBSSxHQUFHLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7NkJBQzlCLENBQUM7NEJBQ0YsSUFBSSxnQkFBZ0IsQ0FBQztnQ0FDcEIsSUFBSSxXQUFXLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7Z0NBQ3hDLG9CQUFvQjtnQ0FDcEIsSUFBSSxrQkFBa0IsQ0FDckIsSUFBSSxJQUFJLENBQ1AsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxHQUFHLENBQUMsQ0FBQyxFQUMzQixNQUFNLENBQ04sQ0FDRDtnQ0FDRCxxQkFBcUI7Z0NBQ3JCLElBQUksaUJBQWlCLENBQUM7b0NBQ3JCLElBQUksS0FBSyxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO29DQUNsQyxJQUFJLElBQUksQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLEdBQUcsQ0FBQyxDQUFDLEVBQUUsVUFBVSxDQUFDO29DQUNqRCxJQUFJLEtBQUssQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztpQ0FDbEMsQ0FBQztnQ0FDRixvQkFBb0I7Z0NBQ3BCLElBQUksbUJBQW1CLENBQUM7b0NBQ3ZCLElBQUksSUFBSSxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsR0FBRyxDQUFDLENBQUMsRUFBRSxNQUFNLENBQUM7b0NBQzdDLElBQUksSUFBSSxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO29DQUNqQyxJQUFJLElBQUksQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLEdBQUcsQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDO2lDQUM3QyxDQUFDO2dDQUNGLElBQUksWUFBWSxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDOzZCQUN6QyxDQUFDO3lCQUNGLENBQUM7cUJBQ0YsQ0FBQyxDQUFDO2dCQUNMLENBQUMsQ0FBQyxDQUFDO2dCQUVILElBQUksQ0FBQyxrQkFBa0IsRUFBRSxLQUFLLElBQUksRUFBRTtvQkFDbkMsTUFBTSxJQUFJLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FBQyxJQUFJLHNCQUFzQixFQUFFLENBQUMsQ0FBQztvQkFFM0QsTUFBTSxJQUFJLENBQUMsR0FBRyxDQUNiO3dCQUNDLG1EQUFtRDtxQkFDbkQsRUFDRDt3QkFDQyxlQUFlO3dCQUNmLElBQUksaUJBQWlCLENBQUM7NEJBQ3JCLElBQUkscUJBQXFCLENBQUM7Z0NBQ3pCLElBQUksSUFBSSxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxPQUFPLENBQUM7NkJBQzVDLENBQUM7NEJBQ0YsSUFBSSwwQkFBMEIsQ0FBQztnQ0FDOUIsSUFBSSxLQUFLLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7Z0NBQ2hDLElBQUksR0FBRyxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDOzZCQUM5QixDQUFDOzRCQUNGLElBQUksZ0JBQWdCLENBQUM7Z0NBQ3BCLElBQUksV0FBVyxDQUFDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO2dDQUN4QyxvQkFBb0I7Z0NBQ3BCLElBQUksa0JBQWtCLENBQ3JCLElBQUksSUFBSSxDQUNQLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsR0FBRyxDQUFDLENBQUMsRUFDM0IsTUFBTSxDQUNOLENBQ0Q7Z0NBQ0QscUJBQXFCO2dDQUNyQixJQUFJLGlCQUFpQixDQUFDO29DQUNyQixJQUFJLEtBQUssQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztvQ0FDbEMsSUFBSSxJQUFJLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxHQUFHLENBQUMsQ0FBQyxFQUFFLFVBQVUsQ0FBQztvQ0FDakQsSUFBSSxLQUFLLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7aUNBQ2xDLENBQUM7Z0NBQ0Ysb0JBQW9CO2dDQUNwQixJQUFJLG1CQUFtQixDQUFDO29DQUN2QixJQUFJLElBQUksQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLEdBQUcsQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDO29DQUM3QyxJQUFJLElBQUksQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztvQ0FDakMsSUFBSSxJQUFJLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsRUFBRSxHQUFHLENBQUMsQ0FBQyxFQUFFLE1BQU0sQ0FBQztpQ0FDN0MsQ0FBQztnQ0FDRixJQUFJLFlBQVksQ0FBQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQzs2QkFDekMsQ0FBQzt5QkFDRixDQUFDO3FCQUNGLENBQUMsQ0FBQztnQkFDTCxDQUFDLENBQUMsQ0FBQztZQUNKLENBQUMsQ0FBQyxDQUFDO1FBQ0osQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyxPQUFPLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDeEIsTUFBTSxJQUFJLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FDM0IsSUFBSSxzQkFBc0IsRUFBRSxDQUM1QixDQUFDO1FBRUYsTUFBTSxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQztJQUN4QixDQUFDLENBQUMsQ0FBQztBQUNKLENBQUMsQ0FBQyxDQUFDIn0=