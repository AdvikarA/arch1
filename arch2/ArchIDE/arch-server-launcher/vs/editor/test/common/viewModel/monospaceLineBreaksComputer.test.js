/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { EditorOptions } from '../../../common/config/editorOptions.js';
import { FontInfo } from '../../../common/config/fontInfo.js';
import { ModelLineProjectionData } from '../../../common/modelLineProjectionData.js';
import { MonospaceLineBreaksComputerFactory } from '../../../common/viewModel/monospaceLineBreaksComputer.js';
function parseAnnotatedText(annotatedText) {
    let text = '';
    let currentLineIndex = 0;
    const indices = [];
    for (let i = 0, len = annotatedText.length; i < len; i++) {
        if (annotatedText.charAt(i) === '|') {
            currentLineIndex++;
        }
        else {
            text += annotatedText.charAt(i);
            indices[text.length - 1] = currentLineIndex;
        }
    }
    return { text: text, indices: indices };
}
function toAnnotatedText(text, lineBreakData) {
    // Insert line break markers again, according to algorithm
    let actualAnnotatedText = '';
    if (lineBreakData) {
        let previousLineIndex = 0;
        for (let i = 0, len = text.length; i < len; i++) {
            const r = lineBreakData.translateToOutputPosition(i);
            if (previousLineIndex !== r.outputLineIndex) {
                previousLineIndex = r.outputLineIndex;
                actualAnnotatedText += '|';
            }
            actualAnnotatedText += text.charAt(i);
        }
    }
    else {
        // No wrapping
        actualAnnotatedText = text;
    }
    return actualAnnotatedText;
}
function getLineBreakData(factory, tabSize, breakAfter, columnsForFullWidthChar, wrappingIndent, wordBreak, wrapOnEscapedLineFeeds, text, previousLineBreakData) {
    const fontInfo = new FontInfo({
        pixelRatio: 1,
        fontFamily: 'testFontFamily',
        fontWeight: 'normal',
        fontSize: 14,
        fontFeatureSettings: '',
        fontVariationSettings: '',
        lineHeight: 19,
        letterSpacing: 0,
        isMonospace: true,
        typicalHalfwidthCharacterWidth: 7,
        typicalFullwidthCharacterWidth: 7 * columnsForFullWidthChar,
        canUseHalfwidthRightwardsArrow: true,
        spaceWidth: 7,
        middotWidth: 7,
        wsmiddotWidth: 7,
        maxDigitWidth: 7
    }, false);
    const lineBreaksComputer = factory.createLineBreaksComputer(fontInfo, tabSize, breakAfter, wrappingIndent, wordBreak, wrapOnEscapedLineFeeds);
    const previousLineBreakDataClone = previousLineBreakData ? new ModelLineProjectionData(null, null, previousLineBreakData.breakOffsets.slice(0), previousLineBreakData.breakOffsetsVisibleColumn.slice(0), previousLineBreakData.wrappedTextIndentLength) : null;
    lineBreaksComputer.addRequest(text, null, previousLineBreakDataClone);
    return lineBreaksComputer.finalize()[0];
}
function assertLineBreaks(factory, tabSize, breakAfter, annotatedText, wrappingIndent = 0 /* WrappingIndent.None */, wordBreak = 'normal') {
    // Create version of `annotatedText` with line break markers removed
    const text = parseAnnotatedText(annotatedText).text;
    const lineBreakData = getLineBreakData(factory, tabSize, breakAfter, 2, wrappingIndent, wordBreak, false, text, null);
    const actualAnnotatedText = toAnnotatedText(text, lineBreakData);
    assert.strictEqual(actualAnnotatedText, annotatedText);
    return lineBreakData;
}
suite('Editor ViewModel - MonospaceLineBreaksComputer', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('MonospaceLineBreaksComputer', () => {
        const factory = new MonospaceLineBreaksComputerFactory('(', '\t).');
        // Empty string
        assertLineBreaks(factory, 4, 5, '');
        // No wrapping if not necessary
        assertLineBreaks(factory, 4, 5, 'aaa');
        assertLineBreaks(factory, 4, 5, 'aaaaa');
        assertLineBreaks(factory, 4, -1, 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');
        // Acts like hard wrapping if no char found
        assertLineBreaks(factory, 4, 5, 'aaaaa|a');
        // Honors wrapping character
        assertLineBreaks(factory, 4, 5, 'aaaaa|.');
        assertLineBreaks(factory, 4, 5, 'aaaaa|a.|aaa.|aa');
        assertLineBreaks(factory, 4, 5, 'aaaaa|a..|aaa.|aa');
        assertLineBreaks(factory, 4, 5, 'aaaaa|a...|aaa.|aa');
        assertLineBreaks(factory, 4, 5, 'aaaaa|a....|aaa.|aa');
        // Honors tabs when computing wrapping position
        assertLineBreaks(factory, 4, 5, '\t');
        assertLineBreaks(factory, 4, 5, '\t|aaa');
        assertLineBreaks(factory, 4, 5, '\t|a\t|aa');
        assertLineBreaks(factory, 4, 5, 'aa\ta');
        assertLineBreaks(factory, 4, 5, 'aa\t|aa');
        // Honors wrapping before characters (& gives it priority)
        assertLineBreaks(factory, 4, 5, 'aaa.|aa');
        assertLineBreaks(factory, 4, 5, 'aaa(.|aa');
        // Honors wrapping after characters (& gives it priority)
        assertLineBreaks(factory, 4, 5, 'aaa))|).aaa');
        assertLineBreaks(factory, 4, 5, 'aaa))|).|aaaa');
        assertLineBreaks(factory, 4, 5, 'aaa)|().|aaa');
        assertLineBreaks(factory, 4, 5, 'aaa|(().|aaa');
        assertLineBreaks(factory, 4, 5, 'aa.|(().|aaa');
        assertLineBreaks(factory, 4, 5, 'aa.|(.).|aaa');
    });
    function assertLineBreakDataEqual(a, b) {
        if (!a || !b) {
            assert.deepStrictEqual(a, b);
            return;
        }
        assert.deepStrictEqual(a.breakOffsets, b.breakOffsets);
        assert.deepStrictEqual(a.wrappedTextIndentLength, b.wrappedTextIndentLength);
        for (let i = 0; i < a.breakOffsetsVisibleColumn.length; i++) {
            const diff = a.breakOffsetsVisibleColumn[i] - b.breakOffsetsVisibleColumn[i];
            assert.ok(diff < 0.001);
        }
    }
    function assertIncrementalLineBreaks(factory, text, tabSize, breakAfter1, annotatedText1, breakAfter2, annotatedText2, wrappingIndent = 0 /* WrappingIndent.None */, columnsForFullWidthChar = 2) {
        // sanity check the test
        assert.strictEqual(text, parseAnnotatedText(annotatedText1).text);
        assert.strictEqual(text, parseAnnotatedText(annotatedText2).text);
        // check that the direct mapping is ok for 1
        const directLineBreakData1 = getLineBreakData(factory, tabSize, breakAfter1, columnsForFullWidthChar, wrappingIndent, 'normal', false, text, null);
        assert.strictEqual(toAnnotatedText(text, directLineBreakData1), annotatedText1);
        // check that the direct mapping is ok for 2
        const directLineBreakData2 = getLineBreakData(factory, tabSize, breakAfter2, columnsForFullWidthChar, wrappingIndent, 'normal', false, text, null);
        assert.strictEqual(toAnnotatedText(text, directLineBreakData2), annotatedText2);
        // check that going from 1 to 2 is ok
        const lineBreakData2from1 = getLineBreakData(factory, tabSize, breakAfter2, columnsForFullWidthChar, wrappingIndent, 'normal', false, text, directLineBreakData1);
        assert.strictEqual(toAnnotatedText(text, lineBreakData2from1), annotatedText2);
        assertLineBreakDataEqual(lineBreakData2from1, directLineBreakData2);
        // check that going from 2 to 1 is ok
        const lineBreakData1from2 = getLineBreakData(factory, tabSize, breakAfter1, columnsForFullWidthChar, wrappingIndent, 'normal', false, text, directLineBreakData2);
        assert.strictEqual(toAnnotatedText(text, lineBreakData1from2), annotatedText1);
        assertLineBreakDataEqual(lineBreakData1from2, directLineBreakData1);
    }
    test('MonospaceLineBreaksComputer incremental 1', () => {
        const factory = new MonospaceLineBreaksComputerFactory(EditorOptions.wordWrapBreakBeforeCharacters.defaultValue, EditorOptions.wordWrapBreakAfterCharacters.defaultValue);
        assertIncrementalLineBreaks(factory, 'just some text and more', 4, 10, 'just some |text and |more', 15, 'just some text |and more');
        assertIncrementalLineBreaks(factory, 'Cu scripserit suscipiantur eos, in affert pericula contentiones sed, cetero sanctus et pro. Ius vidit magna regione te, sit ei elaboraret liberavisse. Mundi verear eu mea, eam vero scriptorem in, vix in menandri assueverit. Natum definiebas cu vim. Vim doming vocibus efficiantur id. In indoctum deseruisse voluptatum vim, ad debitis verterem sed.', 4, 47, 'Cu scripserit suscipiantur eos, in affert |pericula contentiones sed, cetero sanctus et |pro. Ius vidit magna regione te, sit ei |elaboraret liberavisse. Mundi verear eu mea, |eam vero scriptorem in, vix in menandri |assueverit. Natum definiebas cu vim. Vim |doming vocibus efficiantur id. In indoctum |deseruisse voluptatum vim, ad debitis verterem |sed.', 142, 'Cu scripserit suscipiantur eos, in affert pericula contentiones sed, cetero sanctus et pro. Ius vidit magna regione te, sit ei elaboraret |liberavisse. Mundi verear eu mea, eam vero scriptorem in, vix in menandri assueverit. Natum definiebas cu vim. Vim doming vocibus efficiantur |id. In indoctum deseruisse voluptatum vim, ad debitis verterem sed.');
        assertIncrementalLineBreaks(factory, 'An his legere persecuti, oblique delicata efficiantur ex vix, vel at graecis officiis maluisset. Et per impedit voluptua, usu discere maiorum at. Ut assum ornatus temporibus vis, an sea melius pericula. Ea dicunt oblique phaedrum nam, eu duo movet nobis. His melius facilis eu, vim malorum temporibus ne. Nec no sale regione, meliore civibus placerat id eam. Mea alii fabulas definitionem te, agam volutpat ad vis, et per bonorum nonumes repudiandae.', 4, 57, 'An his legere persecuti, oblique delicata efficiantur ex |vix, vel at graecis officiis maluisset. Et per impedit |voluptua, usu discere maiorum at. Ut assum ornatus |temporibus vis, an sea melius pericula. Ea dicunt |oblique phaedrum nam, eu duo movet nobis. His melius |facilis eu, vim malorum temporibus ne. Nec no sale |regione, meliore civibus placerat id eam. Mea alii |fabulas definitionem te, agam volutpat ad vis, et per |bonorum nonumes repudiandae.', 58, 'An his legere persecuti, oblique delicata efficiantur ex |vix, vel at graecis officiis maluisset. Et per impedit |voluptua, usu discere maiorum at. Ut assum ornatus |temporibus vis, an sea melius pericula. Ea dicunt oblique |phaedrum nam, eu duo movet nobis. His melius facilis eu, |vim malorum temporibus ne. Nec no sale regione, meliore |civibus placerat id eam. Mea alii fabulas definitionem |te, agam volutpat ad vis, et per bonorum nonumes |repudiandae.');
        assertIncrementalLineBreaks(factory, '\t\t"owner": "vscode",', 4, 14, '\t\t"owner|": |"vscod|e",', 16, '\t\t"owner":| |"vscode"|,', 1 /* WrappingIndent.Same */);
        assertIncrementalLineBreaks(factory, '🐇👬🌖🌞🏇🍼🐇👬🌖🌞🏇🍼🐇👬🌖🌞🏇🍼🐇👬🌖🌞🏇🍼🐇&👬🌖🌞🏇🍼🐇👬🌖🌞🏇🍼🐇👬🌖🌞🏇🍼🐇👬🌖🌞🏇🍼🐇👬', 4, 51, '🐇👬🌖🌞🏇🍼🐇👬🌖🌞🏇🍼🐇👬🌖🌞🏇🍼🐇👬🌖🌞🏇🍼🐇&|👬🌖🌞🏇🍼🐇👬🌖🌞🏇🍼🐇👬🌖🌞🏇🍼🐇👬🌖🌞🏇🍼🐇👬', 50, '🐇👬🌖🌞🏇🍼🐇👬🌖🌞🏇🍼🐇👬🌖🌞🏇🍼🐇👬🌖🌞🏇🍼🐇|&|👬🌖🌞🏇🍼🐇👬🌖🌞🏇🍼🐇👬🌖🌞🏇🍼🐇👬🌖🌞🏇🍼🐇👬', 1 /* WrappingIndent.Same */);
        assertIncrementalLineBreaks(factory, '🐇👬&🌞🌖', 4, 5, '🐇👬&|🌞🌖', 4, '🐇👬|&|🌞🌖', 1 /* WrappingIndent.Same */);
        assertIncrementalLineBreaks(factory, '\t\tfunc(\'🌞🏇🍼🌞🏇🍼🐇&👬🌖🌞👬🌖🌞🏇🍼🐇👬\', WrappingIndent.Same);', 4, 26, '\t\tfunc|(\'🌞🏇🍼🌞🏇🍼🐇&|👬🌖🌞👬🌖🌞🏇🍼🐇|👬\', |WrappingIndent.|Same);', 27, '\t\tfunc|(\'🌞🏇🍼🌞🏇🍼🐇&|👬🌖🌞👬🌖🌞🏇🍼🐇|👬\', |WrappingIndent.|Same);', 1 /* WrappingIndent.Same */);
        assertIncrementalLineBreaks(factory, 'factory, "xtxtfunc(x"🌞🏇🍼🌞🏇🍼🐇&👬🌖🌞👬🌖🌞🏇🍼🐇👬x"', 4, 16, 'factory, |"xtxtfunc|(x"🌞🏇🍼🌞🏇🍼|🐇&|👬🌖🌞👬🌖🌞🏇🍼|🐇👬x"', 17, 'factory, |"xtxtfunc|(x"🌞🏇🍼🌞🏇🍼🐇|&👬🌖🌞👬🌖🌞🏇🍼|🐇👬x"', 1 /* WrappingIndent.Same */);
    });
    test('issue #95686: CRITICAL: loop forever on the monospaceLineBreaksComputer', () => {
        const factory = new MonospaceLineBreaksComputerFactory(EditorOptions.wordWrapBreakBeforeCharacters.defaultValue, EditorOptions.wordWrapBreakAfterCharacters.defaultValue);
        assertIncrementalLineBreaks(factory, '						<tr dmx-class:table-danger="(alt <= 50)" dmx-class:table-warning="(alt <= 200)" dmx-class:table-primary="(alt <= 400)" dmx-class:table-info="(alt <= 800)" dmx-class:table-success="(alt >= 400)">', 4, 179, '						<tr dmx-class:table-danger="(alt <= 50)" dmx-class:table-warning="(alt <= 200)" dmx-class:table-primary="(alt <= 400)" dmx-class:table-info="(alt <= 800)" |dmx-class:table-success="(alt >= 400)">', 1, '	|	|	|	|	|	|<|t|r| |d|m|x|-|c|l|a|s|s|:|t|a|b|l|e|-|d|a|n|g|e|r|=|"|(|a|l|t| |<|=| |5|0|)|"| |d|m|x|-|c|l|a|s|s|:|t|a|b|l|e|-|w|a|r|n|i|n|g|=|"|(|a|l|t| |<|=| |2|0|0|)|"| |d|m|x|-|c|l|a|s|s|:|t|a|b|l|e|-|p|r|i|m|a|r|y|=|"|(|a|l|t| |<|=| |4|0|0|)|"| |d|m|x|-|c|l|a|s|s|:|t|a|b|l|e|-|i|n|f|o|=|"|(|a|l|t| |<|=| |8|0|0|)|"| |d|m|x|-|c|l|a|s|s|:|t|a|b|l|e|-|s|u|c|c|e|s|s|=|"|(|a|l|t| |>|=| |4|0|0|)|"|>', 1 /* WrappingIndent.Same */);
    });
    test('issue #110392: Occasional crash when resize with panel on the right', () => {
        const factory = new MonospaceLineBreaksComputerFactory(EditorOptions.wordWrapBreakBeforeCharacters.defaultValue, EditorOptions.wordWrapBreakAfterCharacters.defaultValue);
        assertIncrementalLineBreaks(factory, '你好 **hello** **hello** **hello-world** hey there!', 4, 15, '你好 **hello** |**hello** |**hello-world**| hey there!', 1, '你|好| |*|*|h|e|l|l|o|*|*| |*|*|h|e|l|l|o|*|*| |*|*|h|e|l|l|o|-|w|o|r|l|d|*|*| |h|e|y| |t|h|e|r|e|!', 1 /* WrappingIndent.Same */, 1.6605405405405405);
    });
    test('MonospaceLineBreaksComputer - CJK and Kinsoku Shori', () => {
        const factory = new MonospaceLineBreaksComputerFactory('(', '\t)');
        assertLineBreaks(factory, 4, 5, 'aa \u5b89|\u5b89');
        assertLineBreaks(factory, 4, 5, '\u3042 \u5b89|\u5b89');
        assertLineBreaks(factory, 4, 5, '\u3042\u3042|\u5b89\u5b89');
        assertLineBreaks(factory, 4, 5, 'aa |\u5b89)\u5b89|\u5b89');
        assertLineBreaks(factory, 4, 5, 'aa \u3042|\u5b89\u3042)|\u5b89');
        assertLineBreaks(factory, 4, 5, 'aa |(\u5b89aa|\u5b89');
    });
    test('MonospaceLineBreaksComputer - WrappingIndent.Same', () => {
        const factory = new MonospaceLineBreaksComputerFactory('', '\t ');
        assertLineBreaks(factory, 4, 38, ' *123456789012345678901234567890123456|7890', 1 /* WrappingIndent.Same */);
    });
    test('issue #16332: Scroll bar overlaying on top of text', () => {
        const factory = new MonospaceLineBreaksComputerFactory('', '\t ');
        assertLineBreaks(factory, 4, 24, 'a/ very/long/line/of/tex|t/that/expands/beyon|d/your/typical/line/|of/code/', 2 /* WrappingIndent.Indent */);
    });
    test('issue #35162: wrappingIndent not consistently working', () => {
        const factory = new MonospaceLineBreaksComputerFactory('', '\t ');
        const mapper = assertLineBreaks(factory, 4, 24, '                t h i s |i s |a l |o n |g l |i n |e', 2 /* WrappingIndent.Indent */);
        assert.strictEqual(mapper.wrappedTextIndentLength, '                    '.length);
    });
    test('issue #75494: surrogate pairs', () => {
        const factory = new MonospaceLineBreaksComputerFactory('\t', ' ');
        assertLineBreaks(factory, 4, 49, '🐇👬🌖🌞🏇🍼🐇👬🌖🌞🏇🍼🐇👬🌖🌞🏇🍼🐇👬🌖🌞🏇🍼|🐇👬🌖🌞🏇🍼🐇👬🌖🌞🏇🍼🐇👬🌖🌞🏇🍼🐇👬🌖🌞🏇🍼|🐇👬', 1 /* WrappingIndent.Same */);
    });
    test('issue #75494: surrogate pairs overrun 1', () => {
        const factory = new MonospaceLineBreaksComputerFactory(EditorOptions.wordWrapBreakBeforeCharacters.defaultValue, EditorOptions.wordWrapBreakAfterCharacters.defaultValue);
        assertLineBreaks(factory, 4, 4, '🐇👬|&|🌞🌖', 1 /* WrappingIndent.Same */);
    });
    test('issue #75494: surrogate pairs overrun 2', () => {
        const factory = new MonospaceLineBreaksComputerFactory(EditorOptions.wordWrapBreakBeforeCharacters.defaultValue, EditorOptions.wordWrapBreakAfterCharacters.defaultValue);
        assertLineBreaks(factory, 4, 17, 'factory, |"xtxtfunc|(x"🌞🏇🍼🌞🏇🍼🐇|&👬🌖🌞👬🌖🌞🏇🍼|🐇👬x"', 1 /* WrappingIndent.Same */);
    });
    test('MonospaceLineBreaksComputer - WrappingIndent.DeepIndent', () => {
        const factory = new MonospaceLineBreaksComputerFactory('', '\t ');
        const mapper = assertLineBreaks(factory, 4, 26, '        W e A r e T e s t |i n g D e |e p I n d |e n t a t |i o n', 3 /* WrappingIndent.DeepIndent */);
        assert.strictEqual(mapper.wrappedTextIndentLength, '                '.length);
    });
    test('issue #33366: Word wrap algorithm behaves differently around punctuation', () => {
        const factory = new MonospaceLineBreaksComputerFactory(EditorOptions.wordWrapBreakBeforeCharacters.defaultValue, EditorOptions.wordWrapBreakAfterCharacters.defaultValue);
        assertLineBreaks(factory, 4, 23, 'this is a line of |text, text that sits |on a line', 1 /* WrappingIndent.Same */);
    });
    test('issue #152773: Word wrap algorithm behaves differently with bracket followed by comma', () => {
        const factory = new MonospaceLineBreaksComputerFactory(EditorOptions.wordWrapBreakBeforeCharacters.defaultValue, EditorOptions.wordWrapBreakAfterCharacters.defaultValue);
        assertLineBreaks(factory, 4, 24, 'this is a line of |(text), text that sits |on a line', 1 /* WrappingIndent.Same */);
    });
    test('issue #112382: Word wrap doesn\'t work well with control characters', () => {
        const factory = new MonospaceLineBreaksComputerFactory(EditorOptions.wordWrapBreakBeforeCharacters.defaultValue, EditorOptions.wordWrapBreakAfterCharacters.defaultValue);
        assertLineBreaks(factory, 4, 6, '\x06\x06\x06|\x06\x06\x06', 1 /* WrappingIndent.Same */);
    });
    test('Word break work well with Chinese/Japanese/Korean (CJK) text when setting normal', () => {
        const factory = new MonospaceLineBreaksComputerFactory(EditorOptions.wordWrapBreakBeforeCharacters.defaultValue, EditorOptions.wordWrapBreakAfterCharacters.defaultValue);
        assertLineBreaks(factory, 4, 5, '你好|1111', 1 /* WrappingIndent.Same */, 'normal');
    });
    test('Word break work well with Chinese/Japanese/Korean (CJK) text when setting keepAll', () => {
        const factory = new MonospaceLineBreaksComputerFactory(EditorOptions.wordWrapBreakBeforeCharacters.defaultValue, EditorOptions.wordWrapBreakAfterCharacters.defaultValue);
        assertLineBreaks(factory, 4, 8, '你好1111', 1 /* WrappingIndent.Same */, 'keepAll');
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9ub3NwYWNlTGluZUJyZWFrc0NvbXB1dGVyLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9hZHZpa2FyL0RvY3VtZW50cy9hcmNoaXRlY3QvYXJjaDIvQXJjaElERS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvdGVzdC9jb21tb24vdmlld01vZGVsL21vbm9zcGFjZUxpbmVCcmVha3NDb21wdXRlci50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBQ2hHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUNoRyxPQUFPLEVBQUUsYUFBYSxFQUFrQixNQUFNLHlDQUF5QyxDQUFDO0FBQ3hGLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUM5RCxPQUFPLEVBQThCLHVCQUF1QixFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDakgsT0FBTyxFQUFFLGtDQUFrQyxFQUFFLE1BQU0sMERBQTBELENBQUM7QUFFOUcsU0FBUyxrQkFBa0IsQ0FBQyxhQUFxQjtJQUNoRCxJQUFJLElBQUksR0FBRyxFQUFFLENBQUM7SUFDZCxJQUFJLGdCQUFnQixHQUFHLENBQUMsQ0FBQztJQUN6QixNQUFNLE9BQU8sR0FBYSxFQUFFLENBQUM7SUFDN0IsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsR0FBRyxHQUFHLGFBQWEsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxHQUFHLEdBQUcsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1FBQzFELElBQUksYUFBYSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsS0FBSyxHQUFHLEVBQUUsQ0FBQztZQUNyQyxnQkFBZ0IsRUFBRSxDQUFDO1FBQ3BCLENBQUM7YUFBTSxDQUFDO1lBQ1AsSUFBSSxJQUFJLGFBQWEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDaEMsT0FB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