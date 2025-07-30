/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { assertSnapshot } from '../../../../../base/test/common/snapshot.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { Position } from '../../../../../editor/common/core/position.js';
import { Range } from '../../../../../editor/common/core/range.js';
import { CoverageDetailsModel } from '../../browser/codeCoverageDecorations.js';
suite('Code Coverage Decorations', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    const textModel = { getValueInRange: () => '' };
    const assertRanges = async (model) => await assertSnapshot(model.ranges.map(r => ({
        range: r.range.toString(),
        count: r.metadata.detail.type === 2 /* DetailType.Branch */ ? r.metadata.detail.detail.branches[r.metadata.detail.branch].count : r.metadata.detail.count,
    })));
    test('CoverageDetailsModel#1', async () => {
        // Create some sample coverage details
        const details = [
            { location: new Range(1, 0, 5, 0), type: 1 /* DetailType.Statement */, count: 1 },
            { location: new Range(2, 0, 3, 0), type: 1 /* DetailType.Statement */, count: 2 },
            { location: new Range(4, 0, 6, 0), type: 1 /* DetailType.Statement */, branches: [{ location: new Range(3, 0, 7, 0), count: 3 }], count: 4 },
        ];
        // Create a new CoverageDetailsModel instance
        const model = new CoverageDetailsModel(details, textModel);
        // Verify that the ranges are generated correctly
        await assertRanges(model);
    });
    test('CoverageDetailsModel#2', async () => {
        // Create some sample coverage details
        const details = [
            { location: new Range(1, 0, 5, 0), type: 1 /* DetailType.Statement */, count: 1 },
            { location: new Range(2, 0, 4, 0), type: 1 /* DetailType.Statement */, count: 2 },
            { location: new Range(3, 0, 3, 5), type: 1 /* DetailType.Statement */, count: 3 },
        ];
        // Create a new CoverageDetailsModel instance
        const model = new CoverageDetailsModel(details, textModel);
        // Verify that the ranges are generated correctly
        await assertRanges(model);
    });
    test('CoverageDetailsModel#3', async () => {
        // Create some sample coverage details
        const details = [
            { location: new Range(1, 0, 5, 0), type: 1 /* DetailType.Statement */, count: 1 },
            { location: new Range(2, 0, 3, 0), type: 1 /* DetailType.Statement */, count: 2 },
            { location: new Range(4, 0, 5, 0), type: 1 /* DetailType.Statement */, count: 3 },
        ];
        // Create a new CoverageDetailsModel instance
        const model = new CoverageDetailsModel(details, textModel);
        // Verify that the ranges are generated correctly
        await assertRanges(model);
    });
    test('CoverageDetailsModel#4', async () => {
        // Create some sample coverage details
        const details = [
            { location: new Range(1, 0, 5, 0), type: 1 /* DetailType.Statement */, count: 1 },
            { location: new Position(2, 0), type: 1 /* DetailType.Statement */, count: 2 },
            { location: new Range(4, 0, 5, 0), type: 1 /* DetailType.Statement */, count: 3 },
            { location: new Position(4, 3), type: 1 /* DetailType.Statement */, count: 4 },
        ];
        // Create a new CoverageDetailsModel instance
        const model = new CoverageDetailsModel(details, textModel);
        // Verify that the ranges are generated correctly
        await assertRanges(model);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29kZUNvdmVyYWdlRGVjb3JhdGlvbnMudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL2FkdmlrYXIvRG9jdW1lbnRzL2FyY2hpdGVjdC9hcmNoMi9BcmNoSURFL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlc3RpbmcvdGVzdC9icm93c2VyL2NvZGVDb3ZlcmFnZURlY29yYXRpb25zLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQzdFLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ25HLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQztBQUN6RSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFFbkUsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFHaEYsS0FBSyxDQUFDLDJCQUEyQixFQUFFLEdBQUcsRUFBRTtJQUN2Qyx1Q0FBdUMsRUFBRSxDQUFDO0lBRTFDLE1BQU0sU0FBUyxHQUFHLEVBQUUsZUFBZSxFQUFFLEdBQUcsRUFBRSxDQUFDLEVBQUUsRUFBdUIsQ0FBQztJQUNyRSxNQUFNLFlBQVksR0FBRyxLQUFLLEVBQUUsS0FBMkIsRUFBRSxFQUFFLENBQUMsTUFBTSxjQUFjLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQ3ZHLEtBQUssRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLFFBQVEsRUFBRTtRQUN6QixLQUFLLEVBQUUsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsSUFBSSw4QkFBc0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLFFBQVMsQ0FBQyxDQUFDLENB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