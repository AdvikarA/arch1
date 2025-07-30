/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { Range } from '../../../../../../../../../editor/common/core/range.js';
import { randomRange } from '../testUtils/randomRange.js';
import { randomInt } from '../../../../../../../../../base/common/numbers.js';
import { BaseToken } from '../../../../../../common/promptSyntax/codecs/base/baseToken.js';
import { cloneTokens, randomTokens } from '../testUtils/randomTokens.js';
import { CompositeToken } from '../../../../../../common/promptSyntax/codecs/base/compositeToken.js';
import { randomBoolean } from '../../../../../../../../../base/test/common/testUtils.js';
import { Word } from '../../../../../../common/promptSyntax/codecs/base/simpleCodec/tokens/tokens.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../../../../../base/test/common/utils.js';
suite('CompositeToken', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    /**
     * A test token that extends the abstract {@link CompositeToken}
     * class which cannot be instantiated directly.
     */
    class TestCompositeToken extends CompositeToken {
        toString() {
            const tokenStrings = this.children.map((token) => {
                return token.toString();
            });
            return `CompositeToken:\n${tokenStrings.join('\n')})`;
        }
    }
    suite('constructor', () => {
        suite('infers range from the list of tokens', () => {
            test('one token', () => {
                const range = randomRange();
                const token = new TestCompositeToken([
                    new Word(range, 'word'),
                ]);
                assert(token.range.equalsRange(range), 'Expected the range to be equal to the token range.');
            });
            test('multiple tokens', () => {
                const tokens = randomTokens();
                const token = new TestCompositeToken(tokens);
                const expectedRange = Range.fromPositions(tokens[0].range.getStartPosition(), tokens[tokens.length - 1].range.getEndPosition());
                assert(token.range.equalsRange(expectedRange), `Composite token range must be '${expectedRange}', got '${token.range}'.`);
            });
            test('throws if no tokens provided', () => {
                assert.throws(() => {
                    new TestCompositeToken([]);
                });
            });
        });
        test('throws if no tokens provided', () => {
            assert.throws(() => {
                new TestCompositeToken([]);
            });
        });
    });
    test('text', () => {
        const tokens = randomTokens();
        const token = new TestCompositeToken(tokens);
        assert.strictEqual(token.text, BaseToken.render(tokens), 'Must have correct text value.');
    });
    test('tokens', () => {
        const tokens = randomTokens();
        const token = new TestCompositeToken(tokens);
        for (let i = 0; i < tokens.length; i++) {
            assert(token.children[i].equals(tokens[i]), `Token #${i} must be '${tokens[i]}', got '${token.children[i]}'.`);
        }
    });
    suite('equals', () => {
        suite('true', () => {
            test('same child tokens', () => {
                const tokens = randomTokens();
                const token1 = new TestCompositeToken(tokens);
                const token2 = new TestCompositeToken(tokens);
                assert(token1.equals(token2), 'Tokens must be equal.');
            });
            test('copied child tokens', () => {
                const tokens = randomTokens();
                const token1 = new TestCompositeToken([...tokens]);
                const token2 = new TestCompositeToken([...tokens]);
                assert(token1.equals(token2), 'Tokens must be equal.');
            });
            test('cloned child tokens', () => {
                const tokens = randomTokens();
                const tokens1 = cloneTokens(tokens);
                const tokens2 = cloneTokens(tokens);
                const token1 = new TestCompositeToken(tokens1);
                const token2 = new TestCompositeToken(tokens2);
                assert(token1.equals(token2), 'Tokens must be equal.');
            });
            test('composite tokens', () => {
                const tokens = randomTokens();
                // ensure there is at least one composite token
                const lastToken = tokens[tokens.length - 1];
                const compositeToken = new TestCompositeToken(randomTokens(randomInt(5, 2), lastToken.range.endLineNumber, lastToken.range.endColumn));
                tokens.push(compositeToken);
                const token1 = new TestCompositeToken([...tokens]);
                const token2 = new TestCompositeToken([...tokens]);
                assert(token1.equals(token2), 'Tokens must be equal.');
            });
        });
        suite('false', () => {
            test('unknown children number', () => {
                const token1 = new TestCompositeToken(randomTokens());
                const token2 = new TestCompositeToken(randomTokens());
                assert(token1.equals(token2) === false, 'Tokens must not be equal.');
            });
            test('different number of children', () => {
                const tokens1 = randomTokens();
                const tokens2 = randomTokens();
                if (tokens1.length === tokens2.length) {
                    (randomBoolean())
                        ? tokens1.pop()
                        : tokens2.pop();
                }
                const token1 = new TestCompositeToken(tokens1);
                const token2 = new TestCompositeToken(tokens2);
                assert(token1.equals(token2) === false, 'Tokens must not be equal.');
            });
            test('same number of children', () => {
                const tokensCount = randomInt(20, 10);
                const tokens1 = randomTokens(tokensCount);
                const tokens2 = randomTokens(tokensCount);
                assert.strictEqual(tokens1.length, tokens2.length, 'Tokens must have the same number of children for this test to be valid.');
                const token1 = new TestCompositeToken(tokens1);
                const token2 = new TestCompositeToken(tokens2);
                assert(token1.equals(token2) === false, 'Tokens must not be equal.');
            });
            test('unequal composite tokens', () => {
                const tokens = randomTokens();
                // ensure there is at least one composite token
                const lastToken = tokens[tokens.length - 1];
                const compositeToken1 = new TestCompositeToken(randomTokens(randomInt(3, 1), lastToken.range.endLineNumber, lastToken.range.endColumn));
                const compositeToken2 = new TestCompositeToken(randomTokens(randomInt(6, 4), lastToken.range.endLineNumber, lastToken.range.endColumn));
                assert(compositeToken1.equals(compositeToken2) === false, 'Composite tokens must not be equal for this test to be valid.');
                const tokens1 = [...tokens, compositeToken1];
                const tokens2 = [...tokens, compositeToken2];
                const token1 = new TestCompositeToken(tokens1);
                const token2 = new TestCompositeToken(tokens2);
                assert(token1.equals(token2) === false, 'Tokens must not be equal.');
            });
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tcG9zaXRlVG9rZW4udGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL2FkdmlrYXIvRG9jdW1lbnRzL2FyY2hpdGVjdC9hcmNoMi9BcmNoSURFL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvdGVzdC9jb21tb24vcHJvbXB0U3ludGF4L2NvZGVjcy9iYXNlL3Rva2Vucy9jb21wb3NpdGVUb2tlbi50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sd0RBQXdELENBQUM7QUFDL0UsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBQzFELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUM5RSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sZ0VBQWdFLENBQUM7QUFDM0YsT0FBTyxFQUFFLFdBQVcsRUFBRSxZQUFZLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUN6RSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0scUVBQXFFLENBQUM7QUFDckcsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDBEQUEwRCxDQUFDO0FBQ3pGLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxnRkFBZ0YsQ0FBQztBQUN0RyxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUUvRyxLQUFLLENBQUMsZ0JBQWdCLEVBQUUsR0FBRyxFQUFFO0lBQzVCLHVDQUF1QyxFQUFFLENBQUM7SUFFMUM7OztPQUdHO0lBQ0gsTUFBTSxrQkFBbUIsU0FBUSxjQUEyQjtRQUUzQyxRQUFRO1lBQ3ZCLE1BQU0sWUFBWSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUMsS0FBSyxFQUFFLEVBQUU7Z0JBQ2hELE9BQU8sS0FBSyxDQUFD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