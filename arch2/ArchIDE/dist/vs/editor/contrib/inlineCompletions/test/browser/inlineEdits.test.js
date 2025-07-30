/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { timeout } from '../../../../../base/common/async.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { AnnotatedText, InlineEditContext, MockSearchReplaceCompletionsProvider, withAsyncTestCodeEditorAndInlineCompletionsModel } from './utils.js';
suite('Inline Edits', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    const val = new AnnotatedText(`
class Point {
	constructor(public x: number, public y: number) {}

	getLength2D(): number {
		return↓ Math.sqrt(this.x * this.x + this.y * this.y↓);
	}
}
`);
    async function runTest(cb) {
        const provider = new MockSearchReplaceCompletionsProvider();
        await withAsyncTestCodeEditorAndInlineCompletionsModel(val.value, { fakeClock: true, provider, inlineSuggest: { enabled: true } }, async (ctx) => {
            const view = new InlineEditContext(ctx.model, ctx.editor);
            ctx.store.add(view);
            await cb(ctx, provider, view);
        });
    }
    test('Can Accept Inline Edit', async function () {
        await runTest(async ({ context, model, editor, editorViewModel }, provider, view) => {
            provider.add(`getLength2D(): number {
		return Math.sqrt(this.x * this.x + this.y * this.y);
	}`, `getLength3D(): number {
		return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
	}`);
            await model.trigger();
            await timeout(10000);
            assert.deepStrictEqual(view.getAndClearViewStates(), ([
                undefined,
                "\n\tget❰Length2↦Length3❱D(): numbe...\n...y * this.y❰ + th...his.z❱);\n"
            ]));
            model.accept();
            assert.deepStrictEqual(editor.getValue(), `
class Point {
	constructor(public x: number, public y: number) {}

	getLength3D(): number {
		return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
	}
}
`);
        });
    });
    test('Can Type Inline Edit', async function () {
        await runTest(async ({ context, model, editor, editorViewModel }, provider, view) => {
            provider.add(`getLength2D(): number {
		return Math.sqrt(this.x * this.x + this.y * this.y);
	}`, `getLength3D(): number {
		return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
	}`);
            await model.trigger();
            await timeout(10000);
            assert.deepStrictEqual(view.getAndClearViewStates(), ([
                undefined,
                "\n\tget❰Length2↦Length3❱D(): numbe...\n...y * this.y❰ + th...his.z❱);\n"
            ]));
            editor.setPosition(val.getMarkerPosition(1));
            editorViewModel.type(' + t');
            assert.deepStrictEqual(view.getAndClearViewStates(), ([
                "\n\tget❰Length2↦Length3❱D(): numbe...\n...this.y + t❰his.z...his.z❱);\n"
            ]));
            editorViewModel.type('his.z * this.z');
            assert.deepStrictEqual(view.getAndClearViewStates(), ([
                "\n\tget❰Length2↦Length3❱D(): numbe..."
            ]));
        });
    });
    test('Inline Edit Stays On Unrelated Edit', async function () {
        await runTest(async ({ context, model, editor, editorViewModel }, provider, view) => {
            provider.add(`getLength2D(): number {
		return Math.sqrt(this.x * this.x + this.y * this.y);
	}`, `getLength3D(): number {
		return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
	}`);
            await model.trigger();
            await timeout(10000);
            assert.deepStrictEqual(view.getAndClearViewStates(), ([
                undefined,
                "\n\tget❰Length2↦Length3❱D(): numbe...\n...y * this.y❰ + th...his.z❱);\n"
            ]));
            editor.setPosition(val.getMarkerPosition(0));
            editorViewModel.type('/* */');
            assert.deepStrictEqual(view.getAndClearViewStates(), ([
                "\n\tget❰Length2↦Length3❱D(): numbe...\n...y * this.y❰ + th...his.z❱);\n"
            ]));
            await timeout(10000);
            assert.deepStrictEqual(view.getAndClearViewStates(), ([
                undefined
            ]));
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5saW5lRWRpdHMudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL2FkdmlrYXIvRG9jdW1lbnRzL2FyY2hpdGVjdC9hcmNoMi9BcmNoSURFL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL2lubGluZUNvbXBsZXRpb25zL3Rlc3QvYnJvd3Nlci9pbmxpbmVFZGl0cy50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDOUQsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDbkcsT0FBTyxFQUFFLGFBQWEsRUFBRSxpQkFBaUIsRUFBcUQsb0NBQW9DLEVBQUUsZ0RBQWdELEVBQUUsTUFBTSxZQUFZLENBQUM7QUFFek0sS0FBSyxDQUFDLGNBQWMsRUFBRSxHQUFHLEVBQUU7SUFDMUIsdUNBQXVDLEVBQUUsQ0FBQztJQUUxQyxNQUFNLEdBQUcsR0FBRyxJQUFJLGFBQWEsQ0FBQzs7Ozs7Ozs7Q0FROUIsQ0FBQyxDQUFDO0lBRUYsS0FBSyxVQUFVLE9BQU8sQ0FBQyxFQUFzSjtRQUM1SyxNQUFNLFFBQVEsR0FBRyxJQUFJLG9DQUFvQyxFQUFFLENBQUM7UUFDNUQsTUFBTSxnREFBZ0QsQ0FBQyxHQUFHLENBQUMsS0FBSyxFQUMvRCxFQUFFLFNBQVMsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLGFBQWEsRUFBRSxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUMvRCxLQUFLLEVBQUUsR0FBRyxFQUFFLEVBQUU7WUFDYixNQUFNLElBQUksR0FBRyxJQUFJLGlCQUFpQixDQUFDLEdBQUcsQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQzFELEdBQUcsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLElBQUks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