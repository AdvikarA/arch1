/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { CancellationToken } from '../../../../../base/common/cancellation.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { URI } from '../../../../../base/common/uri.js';
import { mock } from '../../../../../base/test/common/mock.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { Position } from '../../../../common/core/position.js';
import { Range } from '../../../../common/core/range.js';
import { InlineCompletionTriggerKind } from '../../../../common/languages.js';
import { ILanguageFeaturesService } from '../../../../common/services/languageFeatures.js';
import { SuggestInlineCompletions } from '../../browser/suggestInlineCompletions.js';
import { ISuggestMemoryService } from '../../browser/suggestMemory.js';
import { createCodeEditorServices, instantiateTestCodeEditor } from '../../../../test/browser/testCodeEditor.js';
import { createTextModel } from '../../../../test/common/testTextModel.js';
import { ServiceCollection } from '../../../../../platform/instantiation/common/serviceCollection.js';
import { generateUuid } from '../../../../../base/common/uuid.js';
suite('Suggest Inline Completions', function () {
    const disposables = new DisposableStore();
    const services = new ServiceCollection([ISuggestMemoryService, new class extends mock() {
            select() {
                return 0;
            }
        }]);
    let insta;
    let model;
    let editor;
    setup(function () {
        insta = createCodeEditorServices(disposables, services);
        model = createTextModel('he', undefined, undefined, URI.from({ scheme: 'foo', path: 'foo.bar' }));
        editor = instantiateTestCodeEditor(insta, model);
        editor.updateOptions({ quickSuggestions: { comments: 'inline', strings: 'inline', other: 'inline' } });
        insta.invokeFunction(accessor => {
            disposables.add(accessor.get(ILanguageFeaturesService).completionProvider.register({ pattern: '*.bar', scheme: 'foo' }, new class {
                constructor() {
                    this._debugDisplayName = 'test';
                }
                provideCompletionItems(model, position, context, token) {
                    const word = model.getWordUntilPosition(position);
                    const range = new Range(position.lineNumber, word.startColumn, position.lineNumber, word.endColumn);
                    const suggestions = [];
                    suggestions.push({ insertText: 'hello', label: 'hello', range, kind: 5 /* CompletionItemKind.Class */ });
                    suggestions.push({ insertText: 'hell', label: 'hell', range, kind: 5 /* CompletionItemKind.Class */ });
                    suggestions.push({ insertText: 'hey', label: 'hey', range, kind: 28 /* CompletionItemKind.Snippet */ });
                    return { suggestions };
                }
            }));
        });
    });
    teardown(function () {
        disposables.clear();
        model.dispose();
        editor.dispose();
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    const context = { triggerKind: InlineCompletionTriggerKind.Explicit, selectedSuggestionInfo: undefined, includeInlineCompletions: true, includeInlineEdits: false, requestUuid: generateUuid(), requestIssuedDateTime: 0 };
    test('Aggressive inline completions when typing within line #146948', async function () {
        const completions = disposables.add(insta.createInstance(SuggestInlineCompletions));
        {
            // (1,3), end of word -> suggestions
            const result = await completions.provideInlineCompletions(model, new Position(1, 3), context, CancellationToken.None);
            assert.strictEqual(result?.items.length, 3);
            completions.disposeInlineCompletions(result);
        }
        {
            // (1,2), middle of word -> NO suggestions
            const result = await completions.provideInlineCompletions(model, new Position(1, 2), context, CancellationToken.None);
            assert.ok(result === undefined);
        }
    });
    test('Snippets show in inline suggestions even though they are turned off #175190', async function () {
        const completions = disposables.add(insta.createInstance(SuggestInlineCompletions));
        {
            // unfiltered
            const result = await completions.provideInlineCompletions(model, new Position(1, 3), context, CancellationToken.None);
            assert.strictEqual(result?.items.length, 3);
            completions.disposeInlineCompletions(result);
        }
        {
            // filtered
            editor.updateOptions({ suggest: { showSnippets: false } });
            const result = await completions.provideInlineCompletions(model, new Position(1, 3), context, CancellationToken.None);
            assert.strictEqual(result?.items.length, 2);
            completions.disposeInlineCompletions(result);
        }
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3VnZ2VzdElubGluZUNvbXBsZXRpb25zLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9hZHZpa2FyL0RvY3VtZW50cy9hcmNoaXRlY3QvYXJjaDIvQXJjaElERS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9zdWdnZXN0L3Rlc3QvYnJvd3Nlci9zdWdnZXN0SW5saW5lQ29tcGxldGlvbnMudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDL0UsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQzFFLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUN4RCxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDL0QsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDbkcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQy9ELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUN6RCxPQUFPLEVBQTBILDJCQUEyQixFQUFrQixNQUFNLGlDQUFpQyxDQUFDO0FBR3ROLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLGlEQUFpRCxDQUFDO0FBQzNGLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBQ3JGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ3ZFLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSx5QkFBeUIsRUFBbUIsTUFBTSw0Q0FBNEMsQ0FBQztBQUNsSSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDM0UsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sbUVBQW1FLENBQUM7QUFFdEcsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBR2xFLEtBQUssQ0FBQyw0QkFBNEIsRUFBRTtJQUVuQyxNQUFNLFdBQVcsR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFDO0lBQzFDLE1BQU0sUUFBUSxHQUFHLElBQUksaUJBQWlCLENBQUMsQ0FBQyxxQkFBcUIsRUFBRSxJQUFJLEtBQU0sU0FBUSxJQUFJLEVBQXlCO1lBQ3BHLE1BQU07Z0JBQ2QsT0FBTyxDQUFDLENBQUM7WUFDVixDQUFDO1NBQ0QsQ0FBQyxDQUFDLENBQUM7SUFFSixJQUFJLEtBQStCLENBQUM7SUFDcEMsSUFBSSxLQUFnQixDQUFDO0lBQ3JCLElBQUksTUFBdUIsQ0FBQztJQUU1QixLQUFLLENBQUM7UUFFTCxLQUFLLEdBQUcsd0JBQXdCLENBQUMsV0FBVyxFQUFFLFFBQVEsQ0FBQyxDQUFDO1FBQ3hELEtBQUssR0FBRyxlQUFlLENBQUMsSUFBSSxFQUFFLFNBQVMsRUFBRSxTQUFTLEVBQUUsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLFNBQVMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUNsRyxNQUFNLEdBQUcseUJBQXlCLENBQUMsS0FBSyxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQ2pELE1BQU0sQ0FBQyxhQUFhLENBQUMsRUFBRSxnQkFBZ0IsRUFBRSxFQUFFLFFBQVEsRUFBRSxRQUFRLEVBQUUsT0FBTyxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsUUFBUSxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBRXZHLEtBQUssQ0FBQyxjQUFjLENBQUMsUUFBUSxDQUFDLEVBQUU7WUFDL0IsV0FBVyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLHdCQUF3QixDQUFDLENBQUMsa0JBQWtCLENBQUMsUUFBUSxDQUFDLEVBQUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFLEVBQUUsSUFBSTtnQkFBQTtvQkFDM0gsc0JBQWlCLEdBQUcsTUFBTSxDQUFDO2dCQWdCNUIsQ0FBQztnQkFaQSxzQkFBc0IsQ0FBQyxLQUFpQixFQUFFLFFBQWtCLEVBQUUsT0FBMEIsRUFBRSxLQUF3QjtvQkFFakgsTUFBTSxJQUFJLEdBQUcsS0FBSyxDQUFDLG9CQUFvQixDQUFDLFFBQVEsQ0FBQyxDQUFDO29CQUNsRCxNQUFNLEtBQUssR0FBRyxJQUFJLEtBQUssQ0FBQyxRQUFRLENBQUMsVUFBVSxFQUFFLElBQUksQ0FBQyxXQUFXLEVBQUUsUUFBUSxDQUFDLFVBQVUsRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUM7b0JBRXBHLE1BQU0sV0FBVyxHQUFxQixFQUFFLENBQUM7b0JBQ3pDLFdBQVcsQ0FBQyxJQUFJLENBQUMsRUFBRSxVQUFVLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLElBQUksa0NBQTBCLEVBQUUsQ0FBQyxDQUFDO29CQUNqRyxXQUFXLENBQUMsSUFBSSxDQUFDLEVBQUUsVUFBVSxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRSxJQUFJLGtDQUEwQixFQUFFLENBQUMsQ0FBQztvQkFDL0YsV0FBVyxDQUFDLElBQUksQ0FBQyxFQUFFLFVBQVUsRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsSUFBSSxxQ0FBNEIsRUFBRSxDQUFDLENBQUM7b0JBQy9GLE9BQU8sRUFBRSxXQUFXLEVBQUUsQ0FBQztnQkFDeEIsQ0FBQzthQUVELENBQUMsQ0FBQyxDQUFDO1FBQ0wsQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDLENBQUMsQ0FBQztJQUVILFFBQVEsQ0FBQztRQUNSLFdBQVcsQ0FBQyxLQUFLLEVBQUUsQ0FBQztRQUNwQixLQUFLLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDaEIsTUFBTSxDQUFDLE9BQU8sRUFBRSxDQUFDO0lBQ2xCLENBQUMsQ0FBQyxDQUFDO0lBR0gsdUNBQXVDLEVBQUUsQ0FBQztJQUUxQyxNQUFNLE9BQU8sR0FBNEIsRUFBRSxXQUFXLEVBQUUsMkJBQTJCLENBQUMsUUFBUSxFQUFFLHNCQUFzQixFQUFFLFNBQVMsRUFBRSx3QkFBd0IsRUFBRSxJQUFJLEVBQUUsa0JBQWtCLEVBQUUsS0FBSyxFQUFFLFdBQVcsRUFBRSxZQUFZLEVBQUUsRUFBRSxxQkFBcUIsRUFBRSxDQUFDLEVBQUUsQ0FBQztJQUVwUCxJQUFJLENBQUMsK0RBQStELEVBQUUsS0FBSztRQUUxRSxNQUFNLFdBQVcsR0FBNkIsV0FBVyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLHdCQUF3QixDQUFDLENBQUMsQ0FBQztRQUU5RyxDQUFDO1lBQ0Esb0NBQW9DO1lBQ3BDLE1BQU0sTUFBTSxHQUFHLE1BQU0sV0FBVyxDQUFDLHdCQUF3QixDQUFDLEtBQUssRUFBRSxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsT0FBTyxFQUFFLGlCQUFpQixDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ3RILE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxFQUFFLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDNUMsV0FBVyxDQUFDLHdCQUF3QixDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQzlDLENBQUM7UUFDRCxDQUFDO1lBQ0EsMENBQTBDO1lBQzFDLE1BQU0sTUFBTSxHQUFHLE1BQU0sV0FBVyxDQUFDLHdCQUF3QixDQUFDLEtBQUssRUFBRSxJQUFJLFFBQVEsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsT0FBTyxFQUFFLGlCQUFpQixDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ3RILE1BQU0sQ0FBQyxFQUFFLENBQUMsTUFBTSxLQUFLLFNBQVMsQ0FBQyxDQUFDO1FBQ2pDLENBQUM7SUFDRixDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyw2RUFBNkUsRUFBRSxLQUFLO1FBQ3hGLE1BQU0sV0FBVyxHQUE2QixXQUFXLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsd0JBQXdCLENBQUMsQ0FBQyxDQUFDO1FBRTlHLENBQUM7WUFDQSxhQUFhO1lBQ2IsTUFBTSxNQUFNLEdBQUcsTUFBTSxXQUFXLENBQUMsd0JBQXdCLENBQUMsS0FBSyxFQUFFLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxPQUFPLEVBQUUsaUJBQWlCLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDdEgsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLEVBQUUsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQztZQUM1QyxXQUFXLENBQUMsd0JBQXdCLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDOUMsQ0FBQztRQUVELENBQUM7WUFDQSxXQUFXO1lBQ1gsTUFBTSxDQUFDLGFBQWEsQ0FBQyxFQUFFLE9BQU8sRUFBRSxFQUFFLFlBQVksRUFBRSxLQUFLLEVBQUUsRUFBRSxDQUFDLENBQUM7WUFDM0QsTUFBTSxNQUFNLEdBQUcsTUFBTSxXQUFXLENBQUMsd0JBQXdCLENBQUMsS0FBSyxFQUFFLElBQUksUUFBUSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxPQUFPLEVBQUUsaUJBQWlCLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDdEgsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLEVBQUUsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQztZQUM1QyxXQUFXLENBQUMsd0JBQXdCLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDOUMsQ0FBQztJQUVGLENBQUMsQ0FBQyxDQUFDO0FBQ0osQ0FBQyxDQUFDLENBQUMifQ==