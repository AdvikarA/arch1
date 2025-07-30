/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { NotebookCellLayoutManager } from '../../browser/notebookCellLayoutManager.js';
suite('NotebookCellLayoutManager', () => {
    const store = ensureNoDisposablesAreLeakedInTestSuite();
    const mockCellViewModel = () => {
        return { handle: 'cell1' };
    };
    class MockList {
        constructor() {
            this._height = new Map();
            this.inRenderingTransaction = false;
            this.getViewIndexCalled = false;
            this.cells = [];
        }
        getViewIndex(cell) { return this.cells.indexOf(cell) < 0 ? undefined : this.cells.indexOf(cell); }
        elementHeight(cell) { return this._height.get(cell) ?? 100; }
        updateElementHeight2(cell, height) { this._height.set(cell, height); }
    }
    class MockLoggingService {
        debug() { }
    }
    class MockNotebookWidget {
        constructor() {
            this.viewModel = { hasCell: (cell) => true, getCellIndex: () => 0 };
            this.visibleRanges = [{ start: 0 }];
        }
        hasEditorFocus() { return true; }
        getAbsoluteTopOfElement() { return 0; }
        getLength() { return 1; }
        getDomNode() {
            return {
                style: {
                    height: '100px'
                }
            };
        }
    }
    test('should update cell height', async () => {
        const cell = mockCellViewModel();
        const cell2 = mockCellViewModel();
        const list = new MockList();
        list.cells.push(cell);
        list.cells.push(cell2);
        const widget = new MockNotebookWidget();
        const mgr = store.add(new NotebookCellLayoutManager(widget, list, new MockLoggingService()));
        mgr.layoutNotebookCell(cell, 200);
        mgr.layoutNotebookCell(cell2, 200);
        assert.strictEqual(list.elementHeight(cell), 200);
        assert.strictEqual(list.elementHeight(cell2), 200);
    });
    test('should schedule updates if already in a rendering transaction', async () => {
        const cell = mockCellViewModel();
        const cell2 = mockCellViewModel();
        const list = new MockList();
        list.inRenderingTransaction = true;
        list.cells.push(cell);
        list.cells.push(cell2);
        const widget = new MockNotebookWidget();
        const mgr = store.add(new NotebookCellLayoutManager(widget, list, new MockLoggingService()));
        const promise = mgr.layoutNotebookCell(cell, 200);
        mgr.layoutNotebookCell(cell2, 200);
        assert.strictEqual(list.elementHeight(cell), 100);
        assert.strictEqual(list.elementHeight(cell2), 100);
        list.inRenderingTransaction = false;
        await promise;
        assert.strictEqual(list.elementHeight(cell), 200);
        assert.strictEqual(list.elementHeight(cell2), 200);
    });
    test('should not update if cell is hidden', async () => {
        const cell = mockCellViewModel();
        const list = new MockList();
        const widget = new MockNotebookWidget();
        const mgr = store.add(new NotebookCellLayoutManager(widget, list, new MockLoggingService()));
        await mgr.layoutNotebookCell(cell, 200);
        assert.strictEqual(list.elementHeight(cell), 100);
    });
    test('should not update if height is unchanged', async () => {
        const cell = mockCellViewModel();
        const list = new MockList();
        list.cells.push(cell);
        const widget = new MockNotebookWidget();
        const mgr = store.add(new NotebookCellLayoutManager(widget, list, new MockLoggingService()));
        await mgr.layoutNotebookCell(cell, 100);
        assert.strictEqual(list.elementHeight(cell), 100);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tDZWxsTGF5b3V0TWFuYWdlci50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvYWR2aWthci9Eb2N1bWVudHMvYXJjaGl0ZWN0L2FyY2gyL0FyY2hJREUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbm90ZWJvb2svdGVzdC9icm93c2VyL25vdGVib29rQ2VsbExheW91dE1hbmFnZXIudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUNoRyxPQUFPLEtBQUssTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUNqQyxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUVuRyxPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUV2RixLQUFLLENBQUMsMkJBQTJCLEVBQUUsR0FBRyxFQUFFO0lBRXZDLE1BQU0sS0FBSyxHQUFHLHVDQUF1QyxFQUFFLENBQUM7SUFFeEQsTUFBTSxpQkFBaUIsR0FBRyxHQUFHLEVBQUU7UUFDOUIsT0FBTyxFQUFFLE1BQU0sRUFBRSxPQUFPLEVBQStCLENBQUM7SUFDekQsQ0FBQyxDQUFDO0lBRUYsTUFBTSxRQUFRO1FBQWQ7WUFDUyxZQUFPLEdBQUcsSUFBSSxHQUFHLEVBQUUsQ0FBQztZQUc1QiwyQkFBc0IsR0FBRyxLQUFLLENBQUM7WUFFL0IsdUJBQWtCLEdBQUcsS0FBSyxDQUFDO1lBQzNCLFVBQUssR0FBcUIsRUFBRSxDQUFDO1FBQzlCLENBQUM7UUFOQSxZQUFZLENBQUMsSUFBb0IsSUFBSSxPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDbEgsYUFBYSxDQUFDLElBQW9CLElBQUks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