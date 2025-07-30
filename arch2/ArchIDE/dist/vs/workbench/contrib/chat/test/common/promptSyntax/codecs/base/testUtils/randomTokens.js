/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { Range } from '../../../../../../../../../editor/common/core/range.js';
import { Text } from '../../../../../../common/promptSyntax/codecs/base/textToken.js';
import { randomInt } from '../../../../../../../../../base/common/numbers.js';
import { assertNever } from '../../../../../../../../../base/common/assert.js';
import { NewLine } from '../../../../../../common/promptSyntax/codecs/base/linesCodec/tokens/newLine.js';
import { Space, Word } from '../../../../../../common/promptSyntax/codecs/base/simpleCodec/tokens/tokens.js';
/**
 * Test utility to clone a list of provided tokens.
 */
export function cloneTokens(tokens) {
    const clonedTokens = [];
    for (const token of tokens) {
        if (token instanceof NewLine) {
            clonedTokens.push(new NewLine(token.range));
            continue;
        }
        if (token instanceof Space) {
            clonedTokens.push(new Space(token.range));
            continue;
        }
        if (token instanceof Word) {
            clonedTokens.push(new Word(token.range, token.text));
            continue;
        }
        if (token instanceof Text) {
            clonedTokens.push(new Text(cloneTokens(token.children)));
            continue;
        }
        assertNever(token, `Unexpected token type '${token}'.`);
    }
    for (let i = 0; i < tokens.length; i++) {
        assert(tokens[i].equals(clonedTokens[i]), `Original and cloned tokens #${i} must be equal.`);
        assert(tokens[i] !== clonedTokens[i], `Original and cloned tokens #${i} must not be strict equal.`);
    }
    return clonedTokens;
}
/**
 * Test utility to generate a number of random tokens.
 */
export function randomTokens(tokenCount = randomInt(20, 10), startLine = randomInt(100, 1), startColumn = randomInt(100, 1)) {
    const tokens = [];
    let tokensLeft = tokenCount;
    while (tokensLeft > 0) {
        const caseNumber = randomInt(7, 1);
        switch (caseNumber) {
            case 1:
            case 2: {
                tokens.push(new NewLine(new Range(startLine, startColumn, startLine, startColumn + 1)));
                startLine++;
                startColumn = 1;
                break;
            }
            case 3:
            case 4: {
                tokens.push(new Space(new Range(startLine, startColumn, startLine, startColumn + 1)));
                startColumn++;
                break;
            }
            case 5:
            case 6: {
                const text = `word${randomInt(Number.MAX_SAFE_INTEGER, 1)}`;
                const endColumn = startColumn + text.length;
                tokens.push(new Word(new Range(startLine, startColumn, startLine, endColumn), text));
                startColumn = endColumn;
                break;
            }
            case 7: {
                const token = new Text(randomTokens(randomInt(3, 1), startLine, startColumn));
                tokens.push(token);
                startLine = token.range.endLineNumber;
                startColumn = token.range.endColumn;
                break;
            }
            default: {
                throw new Error(`Unexpected random token generation case number: '${caseNumber}'`);
            }
        }
        tokensLeft--;
    }
    return tokens;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmFuZG9tVG9rZW5zLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvYWR2aWthci9Eb2N1bWVudHMvYXJjaGl0ZWN0L2FyY2gyL0FyY2hJREUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC90ZXN0L2NvbW1vbi9wcm9tcHRTeW50YXgvY29kZWNzL2Jhc2UvdGVzdFV0aWxzL3JhbmRvbVRva2Vucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHdEQUF3RCxDQUFDO0FBQy9FLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxnRUFBZ0UsQ0FBQztBQUN0RixPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDOUUsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQy9FLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxnRkFBZ0YsQ0FBQztBQUN6RyxPQUFPLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxNQUFNLGdGQUFnRixDQUFDO0FBTzdHOztHQUVHO0FBQ0gsTUFBTSxVQUFVLFdBQVcsQ0FBQyxNQUFnQjtJQUMzQyxNQUFNLFlBQVksR0FBYSxFQUFFLENBQUM7SUFFbEMsS0FBSyxNQUFNLEtBQUssSUFBSSxNQUFNLEVBQUUsQ0FBQztRQUM1QixJQUFJLEtBQUssWUFBWSxPQUFPLEVBQUUsQ0FBQztZQUM5QixZQUFZLENBQUMsSUFBSSxDQUFDLElBQUksT0FBTyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO1lBQzVDLFNBQVM7UUFDVixDQUFDO1FBRUQsSUFBSSxLQUFLLFlBQVksS0FBSyxFQUFFLENBQUM7WUFDNUIsWUFBWSxDQUFDLElBQUksQ0FBQyxJQUFJLEtBQUssQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FB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