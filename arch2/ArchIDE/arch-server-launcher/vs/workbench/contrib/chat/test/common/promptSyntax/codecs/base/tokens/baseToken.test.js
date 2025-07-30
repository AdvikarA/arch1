/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { Range } from '../../../../../../../../../editor/common/core/range.js';
import { randomInt } from '../../../../../../../../../base/common/numbers.js';
import { BaseToken } from '../../../../../../common/promptSyntax/codecs/base/baseToken.js';
import { assertDefined } from '../../../../../../../../../base/common/types.js';
import { randomBoolean } from '../../../../../../../../../base/test/common/testUtils.js';
import { NewLine } from '../../../../../../common/promptSyntax/codecs/base/linesCodec/tokens/newLine.js';
import { randomRange, randomRangeNotEqualTo } from '../testUtils/randomRange.js';
import { CarriageReturn } from '../../../../../../common/promptSyntax/codecs/base/linesCodec/tokens/carriageReturn.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../../../../../base/test/common/utils.js';
import { WELL_KNOWN_TOKENS } from '../../../../../../common/promptSyntax/codecs/base/simpleCodec/simpleDecoder.js';
import { At, Colon, DollarSign, ExclamationMark, Hash, LeftAngleBracket, LeftBracket, LeftCurlyBrace, RightAngleBracket, RightBracket, RightCurlyBrace, Slash, Space, Word } from '../../../../../../common/promptSyntax/codecs/base/simpleCodec/tokens/tokens.js';
/**
 * List of simple tokens to randomly select from
 * in the {@link randomSimpleToken} utility.
 */
const TOKENS = Object.freeze([
    ...WELL_KNOWN_TOKENS,
    CarriageReturn,
    NewLine,
]);
/**
 * Generates a random {@link SimpleToken} instance.
 */
function randomSimpleToken() {
    const index = randomInt(TOKENS.length - 1);
    const Constructor = TOKENS[index];
    assertDefined(Constructor, `Cannot find a constructor object for a well-known token at index '${index}'.`);
    return new Constructor(randomRange());
}
suite('BaseToken', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    suite('render()', () => {
        /**
         * Note! Range of tokens is ignored by the render method, that's
         *       why we generate random ranges for each token in this test.
         */
        test('a list of tokens', () => {
            const tests = [
                ['/textoftheword$#', [
                        new Slash(randomRange()),
                        new Word(randomRange(), 'textoftheword'),
                        new DollarSign(randomRange()),
                        new Hash(randomRange()),
                    ]],
                ['<:👋helou👋:>', [
                        new LeftAngleBracket(randomRange()),
                        new Colon(randomRange()),
                        new Word(randomRange(), '👋helou👋'),
                        new Colon(randomRange()),
                        new RightAngleBracket(randomRange()),
                    ]],
                [' {$#[ !@! ]#$} ', [
                        new Space(randomRange()),
                        new LeftCurlyBrace(randomRange()),
                        new DollarSign(randomRange()),
                        new Hash(randomRange()),
                        new LeftBracket(randomRange()),
                        new Space(randomRange()),
                        new ExclamationMark(randomRange()),
                        new At(randomRange()),
                        new ExclamationMark(randomRange()),
                        new Space(randomRange()),
                        new RightBracket(randomRange()),
                        new Hash(randomRange()),
                        new DollarSign(randomRange()),
                        new RightCurlyBrace(randomRange()),
                        new Space(randomRange()),
                    ]],
            ];
            for (const test of tests) {
                const [expectedText, tokens] = test;
                assert.strictEqual(expectedText, BaseToken.render(tokens), 'Must correctly render tokens.');
            }
        });
        test('accepts tokens delimiter', () => {
            // couple of different delimiters to try
            const delimiter = (randomBoolean())
                ? ', '
                : ' | ';
            const tests = [
                [`/${delimiter}textoftheword${delimiter}$${delimiter}#`, [
                        new Slash(randomRange()),
                        new Word(randomRange(), 'textoftheword'),
                        new DollarSign(randomRange()),
                        new Hash(randomRange()),
                    ]],
                [`<${delimiter}:${delimiter}👋helou👋${delimiter}:${delimiter}>`, [
                        new LeftAngleBracket(randomRange()),
                        new Colon(randomRange()),
                        new Word(randomRange(), '👋helou👋'),
                        new Colon(randomRange()),
                        new RightAngleBracket(randomRange()),
                    ]],
            ];
            for (const test of tests) {
                const [expectedText, tokens] = test;
                assert.strictEqual(expectedText, BaseToken.render(tokens, delimiter), 'Must correctly render tokens with a custom delimiter.');
            }
        });
        test('an empty list of tokens', () => {
            assert.strictEqual('', BaseToken.render([]), `Must correctly render and empty list of tokens.`);
        });
    });
    suite('fullRange()', () => {
        suite('throws', () => {
            test('if empty list provided', () => {
                assert.throws(() => {
                    BaseToken.fullRange([]);
                });
            });
            test('if start line number of the first token is greater than one of the last token', () => {
                assert.throws(() => {
                    const lastToken = randomSimpleToken();
                    // generate a first token
                    //  starting line number that is
                    // greater than the start line number of the last token
                    const startLineNumber = lastToken.range.startLineNumber + randomInt(10, 1);
                    const firstToken = new Colon(new Range(startLineNumber, lastToken.range.startColumn, startLineNumber, lastToken.range.startColumn + 1));
                    BaseToken.fullRange([
                        firstToken,
                        // tokens in the middle are ignored, so we
                        // generate random ones to fill the gap
                        randomSimpleToken(),
                        randomSimpleToken(),
                        randomSimpleToken(),
                        randomSimpleToken(),
                        randomSimpleToken(),
                        // -
                        lastToken,
                    ]);
                });
            });
            test('if start line numbers are equal and end of the first token is greater than the start of the last token', () => {
                assert.throws(() => {
                    const firstToken = randomSimpleToken();
                    const lastToken = new Hash(new Range(firstToken.range.startLineNumber, firstToken.range.endColumn - 1, firstToken.range.startLineNumber + randomInt(10), firstToken.range.endColumn));
                    BaseToken.fullRange([
                        firstToken,
                        // tokens in the middle are ignored, so we
                        // generate random ones to fill the gap
                        randomSimpleToken(),
                        randomSimpleToken(),
                        randomSimpleToken(),
                        randomSimpleToken(),
                        randomSimpleToken(),
                        // -
                        lastToken,
                    ]);
                });
            });
        });
    });
    suite('withRange()', () => {
        test('updates token range', () => {
            class TestToken extends BaseToken {
                get text() {
                    throw new Error('Method not implemented.');
                }
                toString() {
                    throw new Error('Method not implemented.');
                }
            }
            const rangeBefore = randomRange();
            const token = new TestToken(rangeBefore);
            assert(token.range.equalsRange(rangeBefore), 'Token range must be unchanged before updating.');
            const rangeAfter = randomRangeNotEqualTo(rangeBefore);
            token.withRange(rangeAfter);
            assert(token.range.equalsRange(rangeAfter), `Token range must be to the new '${rangeAfter}' one.`);
        });
    });
    suite('collapseRangeToStart()', () => {
        test('collapses token range to the start position', () => {
            class TestToken extends BaseToken {
                get text() {
                    throw new Error('Method not implemented.');
                }
                toString() {
                    throw new Error('Method not implemented.');
                }
            }
            const startLineNumber = randomInt(10, 1);
            const startColumnNumber = randomInt(10, 1);
            const range = new Range(startLineNumber, startColumnNumber, startLineNumber + randomInt(10, 1), startColumnNumber + randomInt(10, 1));
            const token = new TestToken(range);
            assert(token.range.isEmpty() === false, 'Token range must not be empty before collapsing.');
            token.collapseRangeToStart();
            assert(token.range.isEmpty(), 'Token range must be empty after collapsing.');
            assert.strictEqual(token.range.startLineNumber, startLineNumber, 'Token range start line number must not change.');
            assert.strictEqual(token.range.startColumn, startColumnNumber, 'Token range start column number must not change.');
            assert.strictEqual(token.range.endLineNumber, startLineNumber, 'Token range end line number must be equal to line start number.');
            assert.strictEqual(token.range.endColumn, startColumnNumber, 'Token range end column number must be equal to column start number.');
        });
    });
    suite('equals()', () => {
        test('true', () => {
            class TestToken extends BaseToken {
                constructor(range, value) {
                    super(range);
                    this.value = value;
                }
                get text() {
                    return this.value;
                }
                toString() {
                    throw new Error('Method not implemented.');
                }
            }
            const text = 'contents';
            const startLineNumber = randomInt(100, 1);
            const startColumnNumber = randomInt(100, 1);
            const range = new Range(startLineNumber, startColumnNumber, startLineNumber, startColumnNumber + text.length);
            const token1 = new TestToken(range, text);
            const token2 = new TestToken(range, text);
            assert(token1.equals(token2), `Token of type '${token1.constructor.name}' must be equal to token of type '${token2.constructor.name}'.`);
            assert(token2.equals(token1), `Token of type '${token2.constructor.name}' must be equal to token of type '${token1.constructor.name}'.`);
        });
        suite('false', () => {
            suite('different constructor', () => {
                test('same base class', () => {
                    class TestToken1 extends BaseToken {
                        get text() {
                            throw new Error('Method not implemented.');
                        }
                        toString() {
                            throw new Error('Method not implemented.');
                        }
                    }
                    class TestToken2 extends BaseToken {
                        get text() {
                            throw new Error('Method not implemented.');
                        }
                        toString() {
                            throw new Error('Method not implemented.');
                        }
                    }
                    const range = randomRange();
                    const token1 = new TestToken1(range);
                    const token2 = new TestToken2(range);
                    assert.strictEqual(token1.equals(token2), false, `Token of type '${token1.constructor.name}' must not be equal to token of type '${token2.constructor.name}'.`);
                    assert.strictEqual(token2.equals(token1), false, `Token of type '${token2.constructor.name}' must not be equal to token of type '${token1.constructor.name}'.`);
                });
                test('child', () => {
                    class TestToken1 extends BaseToken {
                        get text() {
                            throw new Error('Method not implemented.');
                        }
                        toString() {
                            throw new Error('Method not implemented.');
                        }
                    }
                    class TestToken2 extends TestToken1 {
                    }
                    const range = randomRange();
                    const token1 = new TestToken1(range);
                    const token2 = new TestToken2(range);
                    assert.strictEqual(token1.equals(token2), false, `Token of type '${token1.constructor.name}' must not be equal to token of type '${token2.constructor.name}'.`);
                    assert.strictEqual(token2.equals(token1), false, `Token of type '${token2.constructor.name}' must not be equal to token of type '${token1.constructor.name}'.`);
                });
                test('different direct ancestor', () => {
                    class TestToken1 extends BaseToken {
                        get text() {
                            throw new Error('Method not implemented.');
                        }
                        toString() {
                            throw new Error('Method not implemented.');
                        }
                    }
                    class TestToken3 extends BaseToken {
                        get text() {
                            throw new Error('Method not implemented.');
                        }
                        toString() {
                            throw new Error('Method not implemented.');
                        }
                    }
                    class TestToken2 extends TestToken3 {
                    }
                    const range = randomRange();
                    const token1 = new TestToken1(range);
                    const token2 = new TestToken2(range);
                    assert.strictEqual(token1.equals(token2), false, `Token of type '${token1.constructor.name}' must not be equal to token of type '${token2.constructor.name}'.`);
                    assert.strictEqual(token2.equals(token1), false, `Token of type '${token2.constructor.name}' must not be equal to token of type '${token1.constructor.name}'.`);
                });
            });
            test('different text', () => {
                class TestToken extends BaseToken {
                    constructor(value) {
                        super(new Range(1, 1, 1, 1 + value.length));
                        this.value = value;
                    }
                    get text() {
                        return this.value;
                    }
                    toString() {
                        throw new Error('Method not implemented.');
                    }
                }
                const token1 = new TestToken('text1');
                const token2 = new TestToken('text2');
                assert.strictEqual(token1.equals(token2), false, `Token of type '${token1.constructor.name}' must not be equal to token of type '${token2.constructor.name}'.`);
                assert.strictEqual(token2.equals(token1), false, `Token of type '${token2.constructor.name}' must not be equal to token of type '${token1.constructor.name}'.`);
            });
            test('different range', () => {
                class TestToken extends BaseToken {
                    get text() {
                        return 'some text value';
                    }
                    toString() {
                        throw new Error('Method not implemented.');
                    }
                }
                const range1 = randomRange();
                const token1 = new TestToken(range1);
                const range2 = randomRangeNotEqualTo(range1);
                const token2 = new TestToken(range2);
                assert.strictEqual(token1.equals(token2), false, `Token of type '${token1.constructor.name}' must not be equal to token of type '${token2.constructor.name}'.`);
                assert.strictEqual(token2.equals(token1), false, `Token of type '${token2.constructor.name}' must not be equal to token of type '${token1.constructor.name}'.`);
            });
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmFzZVRva2VuLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9hZHZpa2FyL0RvY3VtZW50cy9hcmNoaXRlY3QvYXJjaDIvQXJjaElERS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L3Rlc3QvY29tbW9uL3Byb21wdFN5bnRheC9jb2RlY3MvYmFzZS90b2tlbnMvYmFzZVRva2VuLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQzVCLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSx3REFBd0QsQ0FBQztBQUMvRSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDOUUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLGdFQUFnRSxDQUFDO0FBQzNGLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxpREFBaUQsQ0FBQztBQUNoRixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sMERBQTBELENBQUM7QUFDekYsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGdGQUFnRixDQUFDO0FBQ3pHLE9BQU8sRUFBRSxXQUFXLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUNqRixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sdUZBQXVGLENBQUM7QUFDdkgsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDL0csT0FBTyxFQUFnQixpQkFBaUIsRUFBRSxNQUFNLGdGQUFnRixDQUFDO0FBRWpJLE9BQU8sRUFBRSxFQUFFLEVBQUUsS0FBSyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQUUsSUFBSSxFQUFFLGdCQUFnQixFQUFFLFdBQVcsRUFBRSxjQUFjLEVBQUUsaUJBQWlCLEVBQUUsWUFBWSxFQUFFLGVBQWUsRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxNQUFNLGdG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