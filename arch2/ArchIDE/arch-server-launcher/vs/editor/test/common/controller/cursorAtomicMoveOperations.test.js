/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { AtomicTabMoveOperations } from '../../../common/cursor/cursorAtomicMoveOperations.js';
suite('Cursor move command test', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('Test whitespaceVisibleColumn', () => {
        const testCases = [
            {
                lineContent: '        ',
                tabSize: 4,
                expectedPrevTabStopPosition: [-1, 0, 0, 0, 0, 4, 4, 4, 4, -1],
                expectedPrevTabStopVisibleColumn: [-1, 0, 0, 0, 0, 4, 4, 4, 4, -1],
                expectedVisibleColumn: [0, 1, 2, 3, 4, 5, 6, 7, 8, -1],
            },
            {
                lineContent: '  ',
                tabSize: 4,
                expectedPrevTabStopPosition: [-1, 0, 0, -1],
                expectedPrevTabStopVisibleColumn: [-1, 0, 0, -1],
                expectedVisibleColumn: [0, 1, 2, -1],
            },
            {
                lineContent: '\t',
                tabSize: 4,
                expectedPrevTabStopPosition: [-1, 0, -1],
                expectedPrevTabStopVisibleColumn: [-1, 0, -1],
                expectedVisibleColumn: [0, 4, -1],
            },
            {
                lineContent: '\t ',
                tabSize: 4,
                expectedPrevTabStopPosition: [-1, 0, 1, -1],
                expectedPrevTabStopVisibleColumn: [-1, 0, 4, -1],
                expectedVisibleColumn: [0, 4, 5, -1],
            },
            {
                lineContent: ' \t\t ',
                tabSize: 4,
                expectedPrevTabStopPosition: [-1, 0, 0, 2, 3, -1],
                expectedPrevTabStopVisibleColumn: [-1, 0, 0, 4, 8, -1],
                expectedVisibleColumn: [0, 1, 4, 8, 9, -1],
            },
            {
                lineContent: ' \tA',
                tabSize: 4,
                expectedPrevTabStopPosition: [-1, 0, 0, -1, -1],
                expectedPrevTabStopVisibleColumn: [-1, 0, 0, -1, -1],
                expectedVisibleColumn: [0, 1, 4, -1, -1],
            },
            {
                lineContent: 'A',
                tabSize: 4,
                expectedPrevTabStopPosition: [-1, -1, -1],
                expectedPrevTabStopVisibleColumn: [-1, -1, -1],
                expectedVisibleColumn: [0, -1, -1],
            },
            {
                lineContent: '',
                tabSize: 4,
                expectedPrevTabStopPosition: [-1, -1],
                expectedPrevTabStopVisibleColumn: [-1, -1],
                expectedVisibleColumn: [0, -1],
            },
        ];
        for (const testCase of testCases) {
            const maxPosition = testCase.expectedVisibleColumn.length;
            for (let position = 0; position < maxPosition; position++) {
                const actual = AtomicTabMoveOperations.whitespaceVisibleColumn(testCase.lineContent, position, testCase.tabSize);
                const expected = [
                    testCase.expectedPrevTabStopPosition[position],
                    testCase.expectedPrevTabStopVisibleColumn[position],
                    testCase.expectedVisibleColumn[position]
                ];
                assert.deepStrictEqual(actual, expected);
            }
        }
    });
    test('Test atomicPosition', () => {
        const testCases = [
            {
                lineContent: '        ',
                tabSize: 4,
                expectedLeft: [-1, 0, 0, 0, 0, 4, 4, 4, 4, -1],
                expectedRight: [4, 4, 4, 4, 8, 8, 8, 8, -1, -1],
                expectedNearest: [0, 0, 0, 4, 4, 4, 4, 8, 8, -1],
            },
            {
                lineContent: ' \t',
                tabSize: 4,
                expectedLeft: [-1, 0, 0, -1],
                expectedRight: [2, 2, -1, -1],
                expectedNearest: [0, 0, 2, -1],
            },
            {
                lineContent: '\t ',
                tabSize: 4,
                expectedLeft: [-1, 0, -1, -1],
                expectedRight: [1, -1, -1, -1],
                expectedNearest: [0, 1, -1, -1],
            },
            {
                lineContent: ' \t ',
                tabSize: 4,
                expectedLeft: [-1, 0, 0, -1, -1],
                expectedRight: [2, 2, -1, -1, -1],
                expectedNearest: [0, 0, 2, -1, -1],
            },
            {
                lineContent: '        A',
                tabSize: 4,
                expectedLeft: [-1, 0, 0, 0, 0, 4, 4, 4, 4, -1, -1],
                expectedRight: [4, 4, 4, 4, 8, 8, 8, 8, -1, -1, -1],
                expectedNearest: [0, 0, 0, 4, 4, 4, 4, 8, 8, -1, -1],
            },
            {
                lineContent: '      foo',
                tabSize: 4,
                expectedLeft: [-1, 0, 0, 0, 0, -1, -1, -1, -1, -1, -1],
                expectedRight: [4, 4, 4, 4, -1, -1, -1, -1, -1, -1, -1],
                expectedNearest: [0, 0, 0, 4, 4, -1, -1, -1, -1, -1, -1],
            },
        ];
        for (const testCase of testCases) {
            for (const { direction, expected } of [
                {
                    direction: 0 /* Direction.Left */,
                    expected: testCase.expectedLeft,
                },
                {
                    direction: 1 /* Direction.Right */,
                    expected: testCase.expectedRight,
                },
                {
                    direction: 2 /* Direction.Nearest */,
                    expected: testCase.expectedNearest,
                },
            ]) {
                const actual = expected.map((_, i) => AtomicTabMoveOperations.atomicPosition(testCase.lineContent, i, testCase.tabSize, direction));
                assert.deepStrictEqual(actual, expected);
            }
        }
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3Vyc29yQXRvbWljTW92ZU9wZXJhdGlvbnMudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL2FkdmlrYXIvRG9jdW1lbnRzL2FyY2hpdGVjdC9hcmNoMi9BcmNoSURFL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci90ZXN0L2NvbW1vbi9jb250cm9sbGVyL2N1cnNvckF0b21pY01vdmVPcGVyYXRpb25zLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQzVCLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQ2hHLE9BQU8sRUFBRSx1QkFBdUIsRUFBYSxNQUFNLHNEQUFzRCxDQUFDO0FBRTFHLEtBQUssQ0FBQywwQkFBMEIsRUFBRSxHQUFHLEVBQUU7SUFFdEMsdUNBQXVDLEVBQUUsQ0FBQztJQUUxQyxJQUFJLENBQUMsOEJBQThCLEVBQUUsR0FBRyxFQUFFO1FBQ3pDLE1BQU0sU0FBUyxHQUFHO1lBQ2pCO2dCQUNDLFdBQVcsRUFBRSxVQUFVO2dCQUN2QixPQUFPLEVBQUUsQ0FBQztnQkFDViwyQkFBMkIsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7Z0JBQzdELGdDQUFnQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztnQkFDbEUscUJBQXFCLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVB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LGFBQWEsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7Z0JBQy9DLGVBQWUsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO2FBQ2hEO1lBQ0Q7Z0JBQ0MsV0FBVyxFQUFFLEtBQUs7Z0JBQ2xCLE9BQU8sRUFBRSxDQUFDO2dCQUNWLFlBQVksRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7Z0JBQzVCLGFBQWEsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7Z0JBQzdCLGVBQWUsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO2FBQzlCO1lBQ0Q7Z0JBQ0MsV0FBVyxFQUFFLEtBQUs7Z0JBQ2xCLE9BQU8sRUFBRSxDQUFDO2dCQUNWLFlBQVksRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztnQkFDN0IsYUFBYSxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO2dCQUM5QixlQUFlLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO2FBQy9CO1lBQ0Q7Z0JBQ0MsV0FBVyxFQUFFLE1BQU07Z0JBQ25CLE9BQU8sRUFBRSxDQUFDO2dCQUNWLFlBQVksRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7Z0JBQ2hDLGFBQWEsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7Z0JBQ2pDLGVBQWUsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO2FBQ2xDO1lBQ0Q7Z0JBQ0MsV0FBVyxFQUFFLFdBQVc7Z0JBQ3hCLE9BQU8sRUFBRSxDQUFDO2dCQUNWLFlBQVksRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7Z0JBQ2xELGFBQWEsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7Z0JBQ25ELGVBQWUsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO2FBQ3BEO1lBQ0Q7Z0JBQ0MsV0FBVyxFQUFFLFdBQVc7Z0JBQ3hCLE9BQU8sRUFBRSxDQUFDO2dCQUNWLFlBQVksRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztnQkFDdEQsYUFBYSxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO2dCQUN2RCxlQUFlLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO2FBQ3hEO1NBQ0QsQ0FBQztRQUVGLEtBQUssTUFBTSxRQUFRLElBQUksU0FBUyxFQUFFLENBQUM7WUFDbEMsS0FBSyxNQUFNLEVBQUUsU0FBUyxFQUFFLFFBQVEsRUFBRSxJQUFJO2dCQUNyQztvQkFDQyxTQUFTLHdCQUFnQjtvQkFDekIsUUFBUSxFQUFFLFFBQVEsQ0FBQyxZQUFZO2lCQUMvQjtnQkFDRDtvQkFDQyxTQUFTLHlCQUFpQjtvQkFDMUIsUUFBUSxFQUFFLFFBQVEsQ0FBQyxhQUFhO2lCQUNoQztnQkFDRDtvQkFDQyxTQUFTLDJCQUFtQjtvQkFDNUIsUUFBUSxFQUFFLFFBQVEsQ0FBQyxlQUFlO2lCQUNsQzthQUNELEVBQUUsQ0FBQztnQkFFSCxNQUFNLE1BQU0sR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsdUJBQXVCLENBQUMsY0FBYyxDQUFDLFFBQVEsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxFQUFFLFFBQVEsQ0FBQyxPQUFPLEVBQUUsU0FBUyxDQUFDLENBQUMsQ0FBQztnQkFDcEksTUFBTSxDQUFDLGVBQWUsQ0FBQyxNQUFNLEVBQUUsUUFBUSxDQUFDLENBQUM7WUFDMUMsQ0FBQztRQUNGLENBQUM7SUFDRixDQUFDLENBQUMsQ0FBQztBQUNKLENBQUMsQ0FBQyxDQUFDIn0=