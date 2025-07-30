/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { Range } from '../../../../../../../../../editor/common/core/range.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../../../../../base/test/common/utils.js';
import { FrontMatterSequence } from '../../../../../../common/promptSyntax/codecs/base/frontMatterCodec/tokens/frontMatterSequence.js';
import { Colon, LeftBracket, Quote, RightBracket, Space, Tab, VerticalTab, Word } from '../../../../../../common/promptSyntax/codecs/base/simpleCodec/tokens/tokens.js';
import { FrontMatterArray, FrontMatterBoolean, FrontMatterRecord, FrontMatterRecordDelimiter, FrontMatterRecordName, FrontMatterString } from '../../../../../../common/promptSyntax/codecs/base/frontMatterCodec/tokens/index.js';
suite('FrontMatterBoolean', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    suite('trimValueEnd()', () => {
        test('trims space tokens at the end of record\'s value', () => {
            const recordName = new FrontMatterRecordName([
                new Word(new Range(4, 10, 4, 10 + 3), 'key'),
            ]);
            const recordDelimiter = new FrontMatterRecordDelimiter([
                new Colon(new Range(4, 14, 4, 15)),
                new VerticalTab(new Range(4, 15, 4, 16)),
            ]);
            const recordValue = new FrontMatterSequence([
                new Word(new Range(4, 18, 4, 18 + 10), 'some-value'),
                new VerticalTab(new Range(4, 28, 4, 29)),
                new Tab(new Range(4, 29, 4, 30)),
                new Space(new Range(4, 30, 4, 31)),
                new Tab(new Range(4, 31, 4, 32)),
            ]);
            const record = new FrontMatterRecord([
                recordName, recordDelimiter, recordValue,
            ]);
            const trimmed = record.trimValueEnd();
            assert.deepStrictEqual(trimmed, [
                new VerticalTab(new Range(4, 28, 4, 29)),
                new Tab(new Range(4, 29, 4, 30)),
                new Space(new Range(4, 30, 4, 31)),
                new Tab(new Range(4, 31, 4, 32)),
            ], 'Must return correct trimmed list of spacing tokens.');
            assert(record.range.equalsRange(new Range(4, 10, 4, 28)), 'Must correctly update token range.');
        });
        suite('does not trim non-sequence value tokens', () => {
            test('boolean', () => {
                const recordName = new FrontMatterRecordName([
                    new Word(new Range(4, 10, 4, 10 + 3), 'yke'),
                ]);
                const recordDelimiter = new FrontMatterRecordDelimiter([
                    new Colon(new Range(4, 14, 4, 15)),
                    new VerticalTab(new Range(4, 15, 4, 16)),
                ]);
                const recordValue = new FrontMatterBoolean(new Word(new Range(4, 18, 4, 18 + 4), 'true'));
                const record = new FrontMatterRecord([
                    recordName, recordDelimiter, recordValue,
                ]);
                const trimmed = record.trimValueEnd();
                assert.deepStrictEqual(trimmed, [], 'Must return empty list of trimmed spacing tokens.');
                assert(record.range.equalsRange(new Range(4, 10, 4, 22)), 'Must not update token range.');
            });
            test('quoted string', () => {
                const recordName = new FrontMatterRecordName([
                    new Word(new Range(4, 10, 4, 10 + 3), 'eyk'),
                ]);
                const recordDelimiter = new FrontMatterRecordDelimiter([
                    new Colon(new Range(4, 14, 4, 15)),
                    new VerticalTab(new Range(4, 15, 4, 16)),
                ]);
                const recordValue = new FrontMatterString([
                    new Quote(new Range(4, 18, 4, 19)),
                    new Word(new Range(4, 19, 4, 19 + 10), 'some text'),
                    new Quote(new Range(4, 29, 4, 30)),
                ]);
                const record = new FrontMatterRecord([
                    recordName, recordDelimiter, recordValue,
                ]);
                const trimmed = record.trimValueEnd();
                assert.deepStrictEqual(trimmed, [], 'Must return empty list of trimmed spacing tokens.');
                assert(record.range.equalsRange(new Range(4, 10, 4, 30)), 'Must not update token range.');
            });
            test('array', () => {
                const recordName = new FrontMatterRecordName([
                    new Word(new Range(4, 10, 4, 10 + 3), 'yek'),
                ]);
                const recordDelimiter = new FrontMatterRecordDelimiter([
                    new Colon(new Range(4, 14, 4, 15)),
                    new VerticalTab(new Range(4, 15, 4, 16)),
                ]);
                const recordValue = new FrontMatterArray([
                    new LeftBracket(new Range(4, 18, 4, 19)),
                    new FrontMatterString([
                        new Quote(new Range(4, 18, 4, 19)),
                        new Word(new Range(4, 19, 4, 19 + 10), 'some text'),
                        new Quote(new Range(4, 29, 4, 30)),
                    ]),
                    new FrontMatterBoolean(new Word(new Range(4, 34, 4, 34 + 4), 'true')),
                    new RightBracket(new Range(4, 38, 4, 39)),
                ]);
                const record = new FrontMatterRecord([
                    recordName, recordDelimiter, recordValue,
                ]);
                const trimmed = record.trimValueEnd();
                assert.deepStrictEqual(trimmed, [], 'Must return empty list of trimmed spacing tokens.');
                assert(record.range.equalsRange(new Range(4, 10, 4, 39)), 'Must not update token range.');
            });
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZnJvbnRNYXR0ZXJSZWNvcmQudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL2FkdmlrYXIvRG9jdW1lbnRzL2FyY2hpdGVjdC9hcmNoMi9BcmNoSURFL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvdGVzdC9jb21tb24vcHJvbXB0U3ludGF4L2NvZGVjcy9iYXNlL2Zyb250TWF0dGVyRGVjb2Rlci9mcm9udE1hdHRlclJlY29yZC50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sd0RBQXdELENBQUM7QUFDL0UsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDL0csT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sa0dBQWtHLENBQUM7QUFDdkksT0FBTyxFQUFFLEtBQUssRUFBRSxXQUFXLEVBQUUsS0FBSyxFQUFFLFlBQVksRUFBRSxLQUFLLEVBQUUsR0FBRyxFQUFFLFdBQVcsRUFBRSxJQUFJLEVBQUUsTUFBTSxnRkFBZ0YsQ0FBQztBQUN4SyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsa0JBQWtCLEVBQUUsaUJBQWlCLEVBQUUsMEJBQTBCLEVBQUUscUJBQXFCLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxvRkFBb0YsQ0FBQztBQUVuTyxLQUFLLENBQUMsb0JBQW9CLEVBQUUsR0FBRyxFQUFFO0lBQ2hDLHVDQUF1QyxFQUFFLENBQUM7SUFFMUMsS0FBSyxDQUFDLGdCQUFnQixFQUFFLEdBQUcsRUFBRTtRQUM1QixJQUFJLENBQUMsa0RBQWtELEVBQUUsR0FBRyxFQUFFO1lBQzdELE1BQU0sVUFBVSxHQUFHLElBQUkscUJBQXFCLENBQUM7Z0JBQzVDLElBQUksSUFBSSxDQUNQLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FB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