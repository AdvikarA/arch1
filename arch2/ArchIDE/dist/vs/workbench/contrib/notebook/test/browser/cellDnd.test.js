/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { performCellDropEdits } from '../../browser/view/cellParts/cellDnd.js';
import { CellKind } from '../../common/notebookCommon.js';
import { withTestNotebook } from './testNotebookEditor.js';
import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
async function testCellDnd(beginning, dragAction, end) {
    await withTestNotebook(beginning.startOrder.map(text => [text, 'plaintext', CellKind.Code, []]), (editor, viewModel) => {
        editor.setSelections(beginning.selections);
        editor.setFocus({ start: beginning.focus, end: beginning.focus + 1 });
        performCellDropEdits(editor, viewModel.cellAt(dragAction.dragIdx), dragAction.direction, viewModel.cellAt(dragAction.dragOverIdx));
        for (const i in end.endOrder) {
            assert.equal(viewModel.viewCells[i].getText(), end.endOrder[i]);
        }
        assert.equal(editor.getSelections().length, 1);
        assert.deepStrictEqual(editor.getSelections()[0], end.selection);
        assert.deepStrictEqual(editor.getFocus(), { start: end.focus, end: end.focus + 1 });
    });
}
suite('cellDND', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('drag 1 cell', async () => {
        await testCellDnd({
            startOrder: ['0', '1', '2', '3'],
            selections: [{ start: 0, end: 1 }],
            focus: 0
        }, {
            dragIdx: 0,
            dragOverIdx: 1,
            direction: 'below'
        }, {
            endOrder: ['1', '0', '2', '3'],
            selection: { start: 1, end: 2 },
            focus: 1
        });
    });
    test('drag multiple contiguous cells down', async () => {
        await testCellDnd({
            startOrder: ['0', '1', '2', '3'],
            selections: [{ start: 1, end: 3 }],
            focus: 1
        }, {
            dragIdx: 1,
            dragOverIdx: 3,
            direction: 'below'
        }, {
            endOrder: ['0', '3', '1', '2'],
            selection: { start: 2, end: 4 },
            focus: 2
        });
    });
    test('drag multiple contiguous cells up', async () => {
        await testCellDnd({
            startOrder: ['0', '1', '2', '3'],
            selections: [{ start: 2, end: 4 }],
            focus: 2
        }, {
            dragIdx: 3,
            dragOverIdx: 0,
            direction: 'above'
        }, {
            endOrder: ['2', '3', '0', '1'],
            selection: { start: 0, end: 2 },
            focus: 0
        });
    });
    test('drag ranges down', async () => {
        await testCellDnd({
            startOrder: ['0', '1', '2', '3'],
            selections: [{ start: 0, end: 1 }, { start: 2, end: 3 }],
            focus: 0
        }, {
            dragIdx: 0,
            dragOverIdx: 3,
            direction: 'below'
        }, {
            endOrder: ['1', '3', '0', '2'],
            selection: { start: 2, end: 4 },
            focus: 2
        });
    });
    test('drag ranges up', async () => {
        await testCellDnd({
            startOrder: ['0', '1', '2', '3'],
            selections: [{ start: 1, end: 2 }, { start: 3, end: 4 }],
            focus: 1
        }, {
            dragIdx: 1,
            dragOverIdx: 0,
            direction: 'above'
        }, {
            endOrder: ['1', '3', '0', '2'],
            selection: { start: 0, end: 2 },
            focus: 0
        });
    });
    test('drag ranges between ranges', async () => {
        await testCellDnd({
            startOrder: ['0', '1', '2', '3'],
            selections: [{ start: 0, end: 1 }, { start: 3, end: 4 }],
            focus: 0
        }, {
            dragIdx: 0,
            dragOverIdx: 1,
            direction: 'below'
        }, {
            endOrder: ['1', '0', '3', '2'],
            selection: { start: 1, end: 3 },
            focus: 1
        });
    });
    test('drag ranges just above a range', async () => {
        await testCellDnd({
            startOrder: ['0', '1', '2', '3'],
            selections: [{ start: 1, end: 2 }, { start: 3, end: 4 }],
            focus: 1
        }, {
            dragIdx: 1,
            dragOverIdx: 1,
            direction: 'above'
        }, {
            endOrder: ['0', '1', '3', '2'],
            selection: { start: 1, end: 3 },
            focus: 1
        });
    });
    test('drag ranges inside a range', async () => {
        await testCellDnd({
            startOrder: ['0', '1', '2', '3'],
            selections: [{ start: 0, end: 2 }, { start: 3, end: 4 }],
            focus: 0
        }, {
            dragIdx: 0,
            dragOverIdx: 0,
            direction: 'below'
        }, {
            endOrder: ['0', '1', '3', '2'],
            selection: { start: 0, end: 3 },
            focus: 0
        });
    });
    test('dragged cell is not focused or selected', async () => {
        await testCellDnd({
            startOrder: ['0', '1', '2', '3'],
            selections: [{ start: 1, end: 2 }],
            focus: 1
        }, {
            dragIdx: 2,
            dragOverIdx: 3,
            direction: 'below'
        }, {
            endOrder: ['0', '1', '3', '2'],
            selection: { start: 3, end: 4 },
            focus: 3
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2VsbERuZC50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvYWR2aWthci9Eb2N1bWVudHMvYXJjaGl0ZWN0L2FyY2gyL0FyY2hJREUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbm90ZWJvb2svdGVzdC9icm93c2VyL2NlbGxEbmQudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUMvRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDMUQsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0seUJBQXlCLENBQUM7QUFDM0QsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBRTVCLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBb0JuRyxLQUFLLFVBQVUsV0FBVyxDQUFDLFNBQTBCLEVBQUUsVUFBdUIsRUFBRSxHQUFjO0lBQzdGLE1BQU0sZ0JBQWdCLENBQ3JCLFNBQVMsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxJQUFJLEVBQUUsV0FBVyxFQUFFLFFBQVEsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLENBQUMsRUFDeEUsQ0FBQyxNQUFNLEVBQUUsU0FBUyxFQUFFLEVBQUU7UUFDckIsTUFBTSxDQUFDLGFBQWEsQ0FBQyxTQUFTLENBQUMsVUFBVSxDQUFDLENBQUM7UUFDM0MsTUFBTSxDQUFDLFFBQVEsQ0FBQyxFQUFFLEtBQUssRUFBRSxTQUFTLENBQUMsS0FBSyxFQUFFLEdBQUcsRUFBRSxTQUFTLENBQUMsS0FBSyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDdEUsb0JBQW9CLENBQUMsTUFBTSxFQUFFLFNBQVMsQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBRSxFQUFFLFVBQVUsQ0FB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