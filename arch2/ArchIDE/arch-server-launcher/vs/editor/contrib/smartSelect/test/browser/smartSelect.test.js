/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { CancellationToken } from '../../../../../base/common/cancellation.js';
import { Event } from '../../../../../base/common/event.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { URI } from '../../../../../base/common/uri.js';
import { Position } from '../../../../common/core/position.js';
import { Range } from '../../../../common/core/range.js';
import { ILanguageConfigurationService } from '../../../../common/languages/languageConfigurationRegistry.js';
import { IModelService } from '../../../../common/services/model.js';
import { BracketSelectionRangeProvider } from '../../browser/bracketSelections.js';
import { provideSelectionRanges } from '../../browser/smartSelect.js';
import { WordSelectionRangeProvider } from '../../browser/wordSelections.js';
import { createModelServices } from '../../../../test/common/testTextModel.js';
import { javascriptOnEnterRules } from '../../../../test/common/modes/supports/onEnterRules.js';
import { LanguageFeatureRegistry } from '../../../../common/languageFeatureRegistry.js';
import { ILanguageService } from '../../../../common/languages/language.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
class StaticLanguageSelector {
    constructor(languageId) {
        this.languageId = languageId;
        this.onDidChange = Event.None;
    }
}
suite('SmartSelect', () => {
    const OriginalBracketSelectionRangeProviderMaxDuration = BracketSelectionRangeProvider._maxDuration;
    suiteSetup(() => {
        BracketSelectionRangeProvider._maxDuration = 5000; // 5 seconds
    });
    suiteTeardown(() => {
        BracketSelectionRangeProvider._maxDuration = OriginalBracketSelectionRangeProviderMaxDuration;
    });
    const languageId = 'mockJSMode';
    let disposables;
    let modelService;
    const providers = new LanguageFeatureRegistry();
    setup(() => {
        disposables = new DisposableStore();
        const instantiationService = createModelServices(disposables);
        modelService = instantiationService.get(IModelService);
        const languagConfigurationService = instantiationService.get(ILanguageConfigurationService);
        const languageService = instantiationService.get(ILanguageService);
        disposables.add(languageService.registerLanguage({ id: languageId }));
        disposables.add(languagConfigurationService.register(languageId, {
            brackets: [
                ['(', ')'],
                ['{', '}'],
                ['[', ']']
            ],
            onEnterRules: javascriptOnEnterRules,
            wordPattern: /(-?\d*\.\d\w*)|([^\`\~\!\@\#\$\%\^\&\*\(\)\=\+\[\{\]\}\\\;\:\'\"\,\.\<\>\/\?\s]+)/g
        }));
    });
    teardown(() => {
        disposables.dispose();
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    async function assertGetRangesToPosition(text, lineNumber, column, ranges, selectLeadingAndTrailingWhitespace = true) {
        const uri = URI.file('test.js');
        const model = modelService.createModel(text.join('\n'), new StaticLanguageSelector(languageId), uri);
        const [actual] = await provideSelectionRanges(providers, model, [new Position(lineNumber, column)], { selectLeadingAndTrailingWhitespace, selectSubwords: true }, CancellationToken.None);
        const actualStr = actual.map(r => new Range(r.startLineNumber, r.startColumn, r.endLineNumber, r.endColumn).toString());
        const desiredStr = ranges.reverse().map(r => String(r));
        assert.deepStrictEqual(actualStr, desiredStr, `\nA: ${actualStr} VS \nE: ${desiredStr}`);
        modelService.destroyModel(uri);
    }
    test('getRangesToPosition #1', () => {
        return assertGetRangesToPosition([
            'function a(bar, foo){',
            '\tif (bar) {',
            '\t\treturn (bar + (2 * foo))',
            '\t}',
            '}'
        ], 3, 20, [
            new Range(1, 1, 5, 2), // all
            new Range(1, 21, 5, 2), // {} outside
            new Range(1, 22, 5, 1), // {} inside
            new Range(2, 1, 4, 3), // block
            new Range(2, 1, 4, 3),
            new Range(2, 2, 4, 3),
            new Range(2, 11, 4, 3),
            new Range(2, 12, 4, 2),
            new Range(3, 1, 3, 27), // line w/ triva
            new Range(3, 3, 3, 27), // line w/o triva
            new Range(3, 10, 3, 27), // () outside
            new Range(3, 11, 3, 26), // () inside
            new Range(3, 17, 3, 26), // () outside
            new Range(3, 18, 3, 25), // () inside
        ]);
    });
    test('config: selectLeadingAndTrailingWhitespace', async () => {
        await assertGetRangesToPosition([
            'aaa',
            '\tbbb',
            ''
        ], 2, 3, [
            new Range(1, 1, 3, 1), // all
            new Range(2, 1, 2, 5), // line w/ triva
            new Range(2, 2, 2, 5), // bbb
        ], true);
        await assertGetRangesToPosition([
            'aaa',
            '\tbbb',
            ''
        ], 2, 3, [
            new Range(1, 1, 3, 1), // all
            new Range(2, 2, 2, 5), // () inside
        ], false);
    });
    test('getRangesToPosition #56886. Skip empty lines correctly.', () => {
        return assertGetRangesToPosition([
            'function a(bar, foo){',
            '\tif (bar) {',
            '',
            '\t}',
            '}'
        ], 3, 1, [
            new Range(1, 1, 5, 2),
            new Range(1, 21, 5, 2),
            new Range(1, 22, 5, 1),
            new Range(2, 1, 4, 3),
            new Range(2, 1, 4, 3),
            new Range(2, 2, 4, 3),
            new Range(2, 11, 4, 3),
            new Range(2, 12, 4, 2),
        ]);
    });
    test('getRangesToPosition #56886. Do not skip lines with only whitespaces.', () => {
        return assertGetRangesToPosition([
            'function a(bar, foo){',
            '\tif (bar) {',
            ' ',
            '\t}',
            '}'
        ], 3, 1, [
            new Range(1, 1, 5, 2), // all
            new Range(1, 21, 5, 2), // {} outside
            new Range(1, 22, 5, 1), // {} inside
            new Range(2, 1, 4, 3),
            new Range(2, 1, 4, 3),
            new Range(2, 2, 4, 3),
            new Range(2, 11, 4, 3),
            new Range(2, 12, 4, 2),
            new Range(3, 1, 3, 2), // block
            new Range(3, 1, 3, 2) // empty line
        ]);
    });
    test('getRangesToPosition #40658. Cursor at first position inside brackets should select line inside.', () => {
        return assertGetRangesToPosition([
            ' [ ]',
            ' { } ',
            '( ) '
        ], 2, 3, [
            new Range(1, 1, 3, 5),
            new Range(2, 1, 2, 6), // line w/ triava
            new Range(2, 2, 2, 5), // {} inside, line w/o triva
            new Range(2, 3, 2, 4) // {} inside
        ]);
    });
    test('getRangesToPosition #40658. Cursor in empty brackets should reveal brackets first.', () => {
        return assertGetRangesToPosition([
            ' [] ',
            ' { } ',
            '  ( ) '
        ], 1, 3, [
            new Range(1, 1, 3, 7), // all
            new Range(1, 1, 1, 5), // line w/ trival
            new Range(1, 2, 1, 4), // [] outside, line w/o trival
            new Range(1, 3, 1, 3), // [] inside
        ]);
    });
    test('getRangesToPosition #40658. Tokens before bracket will be revealed first.', () => {
        return assertGetRangesToPosition([
            '  [] ',
            ' { } ',
            'selectthis( ) '
        ], 3, 11, [
            new Range(1, 1, 3, 15), // all
            new Range(3, 1, 3, 15), // line w/ trivia
            new Range(3, 1, 3, 14), // line w/o trivia
            new Range(3, 1, 3, 11) // word
        ]);
    });
    // -- bracket selections
    async function assertRanges(provider, value, ...expected) {
        const index = value.indexOf('|');
        value = value.replace('|', ''); // CodeQL [SM02383] js/incomplete-sanitization this is purpose only the first | character
        const model = modelService.createModel(value, new StaticLanguageSelector(languageId), URI.parse('fake:lang'));
        const pos = model.getPositionAt(index);
        const all = await provider.provideSelectionRanges(model, [pos], CancellationToken.None);
        const ranges = all[0];
        modelService.destroyModel(model.uri);
        assert.strictEqual(expected.length, ranges.length);
        for (const range of ranges) {
            const exp = expected.shift() || null;
            assert.ok(Range.equalsRange(range.range, exp), `A=${range.range} <> E=${exp}`);
        }
    }
    test('bracket selection', async () => {
        await assertRanges(new BracketSelectionRangeProvider(), '(|)', new Range(1, 2, 1, 2), new Range(1, 1, 1, 3));
        await assertRanges(new BracketSelectionRangeProvider(), '[[[](|)]]', new Range(1, 6, 1, 6), new Range(1, 5, 1, 7), // ()
        new Range(1, 3, 1, 7), new Range(1, 2, 1, 8), // [[]()]
        new Range(1, 2, 1, 8), new Range(1, 1, 1, 9));
        await assertRanges(new BracketSelectionRangeProvider(), '[a[](|)a]', new Range(1, 6, 1, 6), new Range(1, 5, 1, 7), new Range(1, 2, 1, 8), new Range(1, 1, 1, 9));
        // no bracket
        await assertRanges(new BracketSelectionRangeProvider(), 'fofof|fofo');
        // empty
        await assertRanges(new BracketSelectionRangeProvider(), '[[[]()]]|');
        await assertRanges(new BracketSelectionRangeProvider(), '|[[[]()]]');
        // edge
        await assertRanges(new BracketSelectionRangeProvider(), '[|[[]()]]', new Range(1, 2, 1, 8), new Range(1, 1, 1, 9));
        await assertRanges(new BracketSelectionRangeProvider(), '[[[]()]|]', new Range(1, 2, 1, 8), new Range(1, 1, 1, 9));
        await assertRanges(new BracketSelectionRangeProvider(), 'aaa(aaa)bbb(b|b)ccc(ccc)', new Range(1, 13, 1, 15), new Range(1, 12, 1, 16));
        await assertRanges(new BracketSelectionRangeProvider(), '(aaa(aaa)bbb(b|b)ccc(ccc))', new Range(1, 14, 1, 16), new Range(1, 13, 1, 17), new Range(1, 2, 1, 25), new Range(1, 1, 1, 26));
    });
    test('bracket with leading/trailing', async () => {
        await assertRanges(new BracketSelectionRangeProvider(), 'for(a of b){\n  foo(|);\n}', new Range(2, 7, 2, 7), new Range(2, 6, 2, 8), new Range(1, 13, 3, 1), new Range(1, 12, 3, 2), new Range(1, 1, 3, 2), new Range(1, 1, 3, 2));
        await assertRanges(new BracketSelectionRangeProvider(), 'for(a of b)\n{\n  foo(|);\n}', new Range(3, 7, 3, 7), new Range(3, 6, 3, 8), new Range(2, 2, 4, 1), new Range(2, 1, 4, 2), new Range(1, 1, 4, 2), new Range(1, 1, 4, 2));
    });
    test('in-word ranges', async () => {
        await assertRanges(new WordSelectionRangeProvider(), 'f|ooBar', new Range(1, 1, 1, 4), // foo
        new Range(1, 1, 1, 7), // fooBar
        new Range(1, 1, 1, 7));
        await assertRanges(new WordSelectionRangeProvider(), 'f|oo_Ba', new Range(1, 1, 1, 4), new Range(1, 1, 1, 7), new Range(1, 1, 1, 7));
        await assertRanges(new WordSelectionRangeProvider(), 'f|oo-Ba', new Range(1, 1, 1, 4), new Range(1, 1, 1, 7), new Range(1, 1, 1, 7));
    });
    test('in-word ranges with selectSubwords=false', async () => {
        await assertRanges(new WordSelectionRangeProvider(false), 'f|ooBar', new Range(1, 1, 1, 7), new Range(1, 1, 1, 7));
        await assertRanges(new WordSelectionRangeProvider(false), 'f|oo_Ba', new Range(1, 1, 1, 7), new Range(1, 1, 1, 7));
        await assertRanges(new WordSelectionRangeProvider(false), 'f|oo-Ba', new Range(1, 1, 1, 7), new Range(1, 1, 1, 7));
    });
    test('Default selection should select current word/hump first in camelCase #67493', async function () {
        await assertRanges(new WordSelectionRangeProvider(), 'Abs|tractSmartSelect', new Range(1, 1, 1, 9), new Range(1, 1, 1, 20), new Range(1, 1, 1, 20));
        await assertRanges(new WordSelectionRangeProvider(), 'AbstractSma|rtSelect', new Range(1, 9, 1, 14), new Range(1, 1, 1, 20), new Range(1, 1, 1, 20));
        await assertRanges(new WordSelectionRangeProvider(), 'Abstrac-Sma|rt-elect', new Range(1, 9, 1, 14), new Range(1, 1, 1, 20), new Range(1, 1, 1, 20));
        await assertRanges(new WordSelectionRangeProvider(), 'Abstrac_Sma|rt_elect', new Range(1, 9, 1, 14), new Range(1, 1, 1, 20), new Range(1, 1, 1, 20));
        await assertRanges(new WordSelectionRangeProvider(), 'Abstrac_Sma|rt-elect', new Range(1, 9, 1, 14), new Range(1, 1, 1, 20), new Range(1, 1, 1, 20));
        await assertRanges(new WordSelectionRangeProvider(), 'Abstrac_Sma|rtSelect', new Range(1, 9, 1, 14), new Range(1, 1, 1, 20), new Range(1, 1, 1, 20));
    });
    test('Smart select: only add line ranges if they\'re contained by the next range #73850', async function () {
        const reg = providers.register('*', {
            provideSelectionRanges() {
                return [[
                        { range: { startLineNumber: 1, startColumn: 10, endLineNumber: 1, endColumn: 11 } },
                        { range: { startLineNumber: 1, startColumn: 10, endLineNumber: 3, endColumn: 2 } },
                        { range: { startLineNumber: 1, startColumn: 1, endLineNumber: 3, endColumn: 2 } },
                    ]];
            }
        });
        await assertGetRangesToPosition(['type T = {', '\tx: number', '}'], 1, 10, [
            new Range(1, 1, 3, 2), // all
            new Range(1, 10, 3, 2), // { ... }
            new Range(1, 10, 1, 11), // {
        ]);
        reg.dispose();
    });
    test('Expand selection in words with underscores is inconsistent #90589', async function () {
        await assertRanges(new WordSelectionRangeProvider(), 'Hel|lo_World', new Range(1, 1, 1, 6), new Range(1, 1, 1, 12), new Range(1, 1, 1, 12));
        await assertRanges(new WordSelectionRangeProvider(), 'Hello_Wo|rld', new Range(1, 7, 1, 12), new Range(1, 1, 1, 12), new Range(1, 1, 1, 12));
        await assertRanges(new WordSelectionRangeProvider(), 'Hello|_World', new Range(1, 1, 1, 6), new Range(1, 1, 1, 12), new Range(1, 1, 1, 12));
        await assertRanges(new WordSelectionRangeProvider(), 'Hello_|World', new Range(1, 7, 1, 12), new Range(1, 1, 1, 12), new Range(1, 1, 1, 12));
        await assertRanges(new WordSelectionRangeProvider(), 'Hello|-World', new Range(1, 1, 1, 6), new Range(1, 1, 1, 12), new Range(1, 1, 1, 12));
        await assertRanges(new WordSelectionRangeProvider(), 'Hello-|World', new Range(1, 7, 1, 12), new Range(1, 1, 1, 12), new Range(1, 1, 1, 12));
        await assertRanges(new WordSelectionRangeProvider(), 'Hello|World', new Range(1, 6, 1, 11), new Range(1, 1, 1, 11), new Range(1, 1, 1, 11));
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic21hcnRTZWxlY3QudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL2FkdmlrYXIvRG9jdW1lbnRzL2FyY2hpdGVjdC9hcmNoMi9BcmNoSURFL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL3NtYXJ0U2VsZWN0L3Rlc3QvYnJvd3Nlci9zbWFydFNlbGVjdC50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBQ2hHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUMvRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDNUQsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQzFFLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUN4RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDL0QsT0FBTyxFQUFVLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBRWpFLE9BQU8sRUFBRSw2QkFBNkIsRUFBRSxNQUFNLCtEQUErRCxDQUFDO0FBQzlHLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNyRSxPQUFPLEVBQUUsNkJBQTZCLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUNuRixPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUN0RSxPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUM3RSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUMvRSxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSx3REFBd0QsQ0FBQztBQUNoRyxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQztBQUN4RixPQUFPLEVBQXNCLGdC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LENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsU0FBUztRQUN2RCxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FDNUMsQ0FBQztRQUVGLE1BQU0sWUFBWSxDQUFDLElBQUksNkJBQTZCLEVBQUUsRUFBRSxXQUFXLEVBQ2xFLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUM1QyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FDNUMsQ0FBQztRQUVGLGFBQWE7UUFDYixNQUFNLFlBQVksQ0FBQyxJQUFJLDZCQUE2QixFQUFFLEVBQUUsWUFBWSxDQUFDLENBQUM7UUFFdEUsUUFBUTtRQUNSLE1BQU0sWUFBWSxDQUFDLElBQUksNkJBQTZCLEVBQUUsRUFBRSxXQUFXLENBQUMsQ0FBQztRQUNyRSxNQUFNLFlBQVksQ0FBQyxJQUFJLDZCQUE2QixFQUFFLEVBQUUsV0FBVyxDQUFDLENBQUM7UUFFckUsT0FBTztRQUNQLE1BQU0sWUFBWSxDQUFDLElBQUksNkJBQTZCLEVBQUUsRUFBRSxXQUFXLEVBQUUsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNuSCxNQUFNLFlBQVksQ0FBQyxJQUFJLDZCQUE2QixFQUFFLEVBQUUsV0FBVyxFQUFFLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFbkgsTUFBTSxZQUFZLENBQUMsSUFBSSw2QkFBNkIsRUFBRSxFQUFFLDBCQUEwQixFQUFFLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFFLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDdEksTUFBTSxZQUFZLENBQUMsSUFBSSw2QkFBNkIsRUFBRSxFQUFFLDRCQUE0QixFQUFFLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFFLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFFLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFFLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDekwsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsK0JBQStCLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFFaEQsTUFBTSxZQUFZLENBQUMsSUFBSSw2QkFBNkIsRUFBRSxFQUFFLDRCQUE0QixFQUNuRixJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFDNUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQzlDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUM1QyxDQUFDO1FBRUYsTUFBTSxZQUFZLENBQUMsSUFBSSw2QkFBNkIsRUFBRSxFQUFFLDhCQUE4QixFQUNyRixJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFDNUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQzVDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUM1QyxDQUFDO0lBQ0gsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFFakMsTUFBTSxZQUFZLENBQUMsSUFBSSwwQkFBMEIsRUFBRSxFQUFFLFNBQVMsRUFDN0QsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsTUFBTTtRQUM3QixJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxTQUFTO1FBQ2hDLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUNyQixDQUFDO1FBRUYsTUFBTSxZQUFZLENBQUMsSUFBSSwwQkFBMEIsRUFBRSxFQUFFLFNBQVMsRUFDN0QsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQ3JCLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUNyQixJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FDckIsQ0FBQztRQUVGLE1BQU0sWUFBWSxDQUFDLElBQUksMEJBQTBCLEVBQUUsRUFBRSxTQUFTLEVBQzdELElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUNyQixJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFDckIsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQ3JCLENBQUM7SUFDSCxDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQywwQ0FBMEMsRUFBRSxLQUFLLElBQUksRUFBRTtRQUUzRCxNQUFNLFlBQVksQ0FBQyxJQUFJLDBCQUEwQixDQUFDLEtBQUssQ0FBQyxFQUFFLFNBQVMsRUFDbEUsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQ3JCLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUNyQixDQUFDO1FBRUYsTUFBTSxZQUFZLENBQUMsSUFBSSwwQkFBMEIsQ0FBQyxLQUFLLENBQUMsRUFBRSxTQUFTLEVBQ2xFLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUNyQixJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FDckIsQ0FBQztRQUVGLE1BQU0sWUFBWSxDQUFDLElBQUksMEJBQTBCLENBQUMsS0FBSyxDQUFDLEVBQUUsU0FBUyxFQUNsRSxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFDckIsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQ3JCLENBQUM7SUFDSCxDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyw2RUFBNkUsRUFBRSxLQUFLO1FBRXhGLE1BQU0sWUFBWSxDQUFDLElBQUksMEJBQTBCLEVBQUUsRUFBRSxzQkFBc0IsRUFDMUUsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQ3JCLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUN0QixJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FDdEIsQ0FBQztRQUVGLE1BQU0sWUFBWSxDQUFDLElBQUksMEJBQTBCLEVBQUUsRUFBRSxzQkFBc0IsRUFDMUUsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQ3RCLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUN0QixJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FDdEIsQ0FBQztRQUVGLE1BQU0sWUFBWSxDQUFDLElBQUksMEJBQTBCLEVBQUUsRUFBRSxzQkFBc0IsRUFDMUUsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQ3RCLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUN0QixJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FDdEIsQ0FBQztRQUVGLE1BQU0sWUFBWSxDQUFDLElBQUksMEJBQTBCLEVBQUUsRUFBRSxzQkFBc0IsRUFDMUUsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQ3RCLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUN0QixJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FDdEIsQ0FBQztRQUVGLE1BQU0sWUFBWSxDQUFDLElBQUksMEJBQTBCLEVBQUUsRUFBRSxzQkFBc0IsRUFDMUUsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQ3RCLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUN0QixJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FDdEIsQ0FBQztRQUVGLE1BQU0sWUFBWSxDQUFDLElBQUksMEJBQTBCLEVBQUUsRUFBRSxzQkFBc0IsRUFDMUUsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLEVBQ3RCLElBQUksS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUN0QixJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFF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