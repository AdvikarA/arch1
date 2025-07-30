/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { Range } from '../../../../../../../../../editor/common/core/range.js';
import { Word } from '../../../../../../common/promptSyntax/codecs/base/simpleCodec/tokens/tokens.js';
import { randomBoolean } from '../../../../../../../../../base/test/common/testUtils.js';
import { FrontMatterBoolean } from '../../../../../../common/promptSyntax/codecs/base/frontMatterCodec/tokens/index.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../../../../../base/test/common/utils.js';
import { FrontMatterSequence } from '../../../../../../common/promptSyntax/codecs/base/frontMatterCodec/tokens/frontMatterSequence.js';
suite('FrontMatterBoolean', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    suite('equals()', () => {
        suite('base case', () => {
            test('true', () => {
                // both values should yield the same result
                const booleanText = (randomBoolean())
                    ? 'true'
                    : 'TRUE';
                const boolean = new FrontMatterBoolean(new Word(new Range(1, 1, 1, 5), booleanText));
                const other = new FrontMatterBoolean(new Word(new Range(1, 1, 1, 5), booleanText));
                assert.strictEqual(boolean.value, true, 'Must have correct boolean value.');
                assert(boolean.equals(other), 'Booleans must be equal.');
            });
            test('false', () => {
                // both values should yield the same result
                const booleanText = (randomBoolean())
                    ? 'false'
                    : 'FALSE';
                const boolean = new FrontMatterBoolean(new Word(new Range(5, 15, 5, 15 + 6), booleanText));
                const other = new FrontMatterBoolean(new Word(new Range(5, 15, 5, 15 + 6), booleanText));
                assert.strictEqual(boolean.value, false, 'Must have correct boolean value.');
                assert(boolean.equals(other), 'Booleans must be equal.');
            });
        });
        suite('non-boolean token', () => {
            suite('word token', () => {
                test('true', () => {
                    // both values should yield the same result
                    const booleanText = (randomBoolean())
                        ? 'true'
                        : 'TRUE';
                    const boolean = new FrontMatterBoolean(new Word(new Range(1, 1, 1, 5), booleanText));
                    const other = new Word(new Range(1, 1, 1, 5), booleanText);
                    assert(boolean.equals(other) === false, 'Booleans must not be equal.');
                });
                test('false', () => {
                    // both values should yield the same result
                    const booleanText = (randomBoolean())
                        ? 'false'
                        : 'FALSE';
                    const boolean = new FrontMatterBoolean(new Word(new Range(1, 2, 1, 2 + 6), booleanText));
                    const other = new Word(new Range(1, 2, 1, 2 + 6), booleanText);
                    assert(boolean.equals(other) === false, 'Booleans must not be equal.');
                });
            });
            suite('sequence token', () => {
                test('true', () => {
                    // both values should yield the same result
                    const booleanText = (randomBoolean())
                        ? 'true'
                        : 'TRUE';
                    const boolean = new FrontMatterBoolean(new Word(new Range(1, 1, 1, 5), booleanText));
                    const other = new FrontMatterSequence([
                        new Word(new Range(1, 1, 1, 5), booleanText),
                    ]);
                    assert(boolean.equals(other) === false, 'Booleans must not be equal.');
                });
                test('false', () => {
                    // both values should yield the same result
                    const booleanText = (randomBoolean())
                        ? 'false'
                        : 'FALSE';
                    const boolean = new FrontMatterBoolean(new Word(new Range(1, 2, 1, 2 + 6), booleanText));
                    const other = new FrontMatterSequence([
                        new Word(new Range(1, 2, 1, 2 + 6), booleanText),
                    ]);
                    assert(boolean.equals(other) === false, 'Booleans must not be equal.');
                });
            });
        });
        suite('different range', () => {
            test('true', () => {
                // both values should yield the same result
                const booleanText = (randomBoolean())
                    ? 'true'
                    : 'TRUE';
                const boolean = new FrontMatterBoolean(new Word(new Range(1, 2, 1, 2 + 4), booleanText));
                const other = new FrontMatterBoolean(new Word(new Range(3, 2, 3, 2 + 4), booleanText));
                assert(boolean.equals(other) === false, 'Booleans must not be equal.');
            });
            test('false', () => {
                // both values should yield the same result
                const booleanText = (randomBoolean())
                    ? 'false'
                    : 'FALSE';
                const boolean = new FrontMatterBoolean(new Word(new Range(5, 15, 5, 15 + 5), booleanText));
                const other = new FrontMatterBoolean(new Word(new Range(4, 15, 4, 15 + 5), booleanText));
                assert(boolean.equals(other) === false, 'Booleans must not be equal.');
            });
        });
        suite('different text', () => {
            test('true', () => {
                const boolean = new FrontMatterBoolean(new Word(new Range(1, 1, 1, 5), 'true'));
                const other = new FrontMatterBoolean(new Word(new Range(1, 1, 1, 5), 'True'));
                assert(boolean.equals(other) === false, 'Booleans must not be equal.');
            });
            test('false', () => {
                const boolean = new FrontMatterBoolean(new Word(new Range(5, 15, 5, 15 + 6), 'FALSE'));
                const other = new FrontMatterBoolean(new Word(new Range(5, 15, 5, 15 + 6), 'false'));
                assert(boolean.equals(other) === false, 'Booleans must not be equal.');
            });
        });
        test('throws if cannot be converted to a boolean', () => {
            assert.throws(() => {
                new FrontMatterBoolean(new Word(new Range(1, 1, 1, 5), 'true1'));
            });
            assert.throws(() => {
                new FrontMatterBoolean(new Word(new Range(2, 5, 2, 5 + 6), 'fal se'));
            });
            assert.throws(() => {
                new FrontMatterBoolean(new Word(new Range(20, 4, 20, 4 + 1), '1'));
            });
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZnJvbnRNYXR0ZXJCb29sZWFuLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9hZHZpa2FyL0RvY3VtZW50cy9hcmNoaXRlY3QvYXJjaDIvQXJjaElERS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L3Rlc3QvY29tbW9uL3Byb21wdFN5bnRheC9jb2RlY3MvYmFzZS9mcm9udE1hdHRlckRlY29kZXIvZnJvbnRNYXR0ZXJCb29sZWFuLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQzVCLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSx3REFBd0QsQ0FBQztBQUMvRSxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sZ0ZBQWdGLENBQUM7QUFDdEcsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDBEQUEwRCxDQUFDO0FBQ3pGLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLG9GQUFvRixDQUFDO0FBQ3hILE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQy9HLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLGtHQUFrRyxDQUFDO0FBRXZJLEtBQUssQ0FBQyxvQkFBb0IsRUFBRSxHQUFHLEVBQUU7SUFDaEMsdUNBQXVDLEVBQUUsQ0FBQztJQUUxQyxLQUFLLENBQUMsVUFBVSxFQUFFLEdBQUcsRUFBRTtRQUN0QixLQUFLLENBQUMsV0FBVyxFQUFFLEdBQUcsRUFBRTtZQUN2QixJQUFJLENBQUMsTUFBTSxFQUFFLEdBQUcsRUFBRTtnQkFDakIsMkNBQTJDO2dCQUMzQyxNQUFNLFdBQVcsR0FBRyxDQUFDLGFBQWEsRUFBRSxDQUFDO29CQUNwQyxDQUFDLENBQUMsTUFBTTtvQkFDUixDQUFDLENBQUMsTUFBTSxDQUFDO2dCQUVWLE1BQU0sT0FBTyxHQUFHLElBQUksa0JBQWtCLENBQ3JDLElBQUksSUFB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