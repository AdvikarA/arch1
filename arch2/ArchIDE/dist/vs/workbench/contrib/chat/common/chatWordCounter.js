/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
const r = String.raw;
/**
 * Matches `[text](link title?)` or `[text](<link> title?)`
 *
 * Taken from vscode-markdown-languageservice
 */
const linkPattern = r `(?<!\\)` + // Must not start with escape
    // text
    r `(!?\[` + // open prefix match -->
    /**/ r `(?:` +
    /*****/ r `[^\[\]\\]|` + // Non-bracket chars, or...
    /*****/ r `\\.|` + // Escaped char, or...
    /*****/ r `\[[^\[\]]*\]` + // Matched bracket pair
    /**/ r `)*` +
    r `\])` + // <-- close prefix match
    // Destination
    r `(\(\s*)` + // Pre href
    /**/ r `(` +
    /*****/ r `[^\s\(\)<](?:[^\s\(\)]|\([^\s\(\)]*?\))*|` + // Link without whitespace, or...
    /*****/ r `<(?:\\[<>]|[^<>])+>` + // In angle brackets
    /**/ r `)` +
    // Title
    /**/ r `\s*(?:"[^"]*"|'[^']*'|\([^\(\)]*\))?\s*` +
    r `\)`;
export function getNWords(str, numWordsToCount) {
    // This regex matches each word and skips over whitespace and separators. A word is:
    // A markdown link
    // One chinese character
    // One or more + - =, handled so that code like "a=1+2-3" is broken up better
    // One or more characters that aren't whitepace or any of the above
    const backtick = '`';
    const allWordMatches = Array.from(str.matchAll(new RegExp(linkPattern + r `|\p{sc=Han}|=+|\++|-+|[^\s\|\p{sc=Han}|=|\+|\-|${backtick}]+`, 'gu')));
    const targetWords = allWordMatches.slice(0, numWordsToCount);
    const endIndex = numWordsToCount >= allWordMatches.length
        ? str.length // Reached end of string
        : targetWords.length ? targetWords.at(-1).index + targetWords.at(-1)[0].length : 0;
    const value = str.substring(0, endIndex);
    return {
        value,
        returnedWordCount: targetWords.length === 0 ? (value.length ? 1 : 0) : targetWords.length,
        isFullString: endIndex >= str.length,
        totalWordCount: allWordMatches.length
    };
}
export function countWords(str) {
    const result = getNWords(str, Number.MAX_SAFE_INTEGER);
    return result.returnedWordCount;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFdvcmRDb3VudGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvYWR2aWthci9Eb2N1bWVudHMvYXJjaGl0ZWN0L2FyY2gyL0FyY2hJREUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9jb21tb24vY2hhdFdvcmRDb3VudGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBU2hHLE1BQU0sQ0FBQyxHQUFHLE1BQU0sQ0FBQyxHQUFHLENBQUM7QUFFckI7Ozs7R0FJRztBQUNILE1BQU0sV0FBVyxHQUNoQixDQUFDLENBQUEsU0FBUyxHQUFHLDZCQUE2QjtJQUUxQyxPQUFPO0lBQ1AsQ0FBQyxDQUFBLE9BQU8sR0FBRyx3QkFBd0I7SUFDbkMsSUFBSSxDQUFBLENBQUMsQ0FBQSxLQUFLO0lBQ1YsT0FBTyxDQUFBLENBQUMsQ0FBQSxZQUFZLEdBQUcsMkJBQTJCO0lBQ2xELE9BQU8sQ0FBQSxDQUFDLENBQUEsTUFBTSxHQUFHLHNCQUFzQjtJQUN2QyxPQUFPLENBQUEsQ0FBQyxDQUFBLGNBQWMsR0FBRyx1QkFBdUI7SUFDaEQsSUFBSSxDQUFBLENBQUMsQ0FBQSxJQUFJO0lBQ1QsQ0FBQyxDQUFBLEtBQUssR0FBRyx5QkFBeUI7SUFFbEMsY0FBYztJQUNkLENBQUMsQ0FBQSxTQUFTLEdBQUcsV0FBVztJQUN4QixJQUFJLENBQUEsQ0FBQyxDQUFBLEdBQUc7SUFDUixPQUFPLENBQUEsQ0FBQyxDQUFBLDJDQUEyQyxHQUFHLGlDQUFpQztJQUN2RixPQUFPLENBQUEsQ0FBQyxDQUFBLHFCQUFxQixHQUFHLG9CQUFvQjtJQUNwRCxJQUFJLENBQUEsQ0FBQyxDQUFBLEdBQUc7SUFFUixRQUFRO0lBQ1IsSUFBSSxDQUFBLENBQUMsQ0FBQSx5Q0FBeUM7SUFDOUMsQ0FBQyxDQUFBLElBQUksQ0FBQztBQUVQLE1BQU0sVUFBVSxTQUFTLENBQUMsR0FBVyxFQUFFLGVBQXVCO0lBQzdELG9GQUFvRjtJQUNwRixrQkFBa0I7SUFDbEIsd0JBQXdCO0lBQ3hCLDZFQUE2RTtJQUM3RSxtRUFBbUU7SUFDbkUsTUFBTSxRQUFRLEdBQUcsR0FBRyxDQUFDO0lBQ3JCLE1BQU0sY0FBYyxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxJQUFJLE1BQU0sQ0FBQyxXQUFXLEdBQUcsQ0FBQyxDQUFBLGtEQUFrRCxRQUFRLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFFakosTUFBTSxXQUFXLEdBQUcsY0FBYyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsZUFBZSxDQUFDLENBQUM7SUFFN0QsTUFBTSxRQUFRLEdBQUcsZUFBZSxJQUFJLGNBQWMsQ0FBQyxNQUFNO1FBQ3hELENBQUMsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLHdCQUF3QjtRQUNyQyxDQUFDLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBRSxDQUFDLEtBQUssR0FBRyxXQUFXLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFFdEYsTUFBTSxLQUFLLEdBQUcsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsUUFBUSxDQUFDLENBQUM7SUFDekMsT0FBTztRQUNOLEtBQUs7UUFDTCxpQkFBaUIsRUFBRSxXQUFXLENBQUMsTUFBTSxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsTUFBTTtRQUN6RixZQUFZLEVBQUUsUUFBUSxJQUFJLEdBQUcsQ0FBQyxNQUFNO1FBQ3BDLGNBQWMsRUFBRSxjQUFjLENBQUMsTUFBTTtLQUNyQyxDQUFDO0FBQ0gsQ0FBQztBQUVELE1BQU0sVUFBVSxVQUFVLENBQUMsR0FBVztJQUNyQyxNQUFNLE1BQU0sR0FBRyxTQUFTLENBQUMsR0FBRyxFQUFFLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO0lBQ3ZELE9BQU8sTUFBTSxDQUFDLGlCQUFpQixDQUFDO0FBQ2pDLENBQUMifQ==