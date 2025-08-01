/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { TestId } from '../../common/testId.js';
import { simplifyTestsToExecute } from '../../common/testService.js';
import { getInitializedMainTestCollection, makeSimpleStubTree } from './testStubs.js';
suite('Workbench - Test Service', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    suite('simplifyTestsToExecute', () => {
        const tree1 = {
            a: {
                b1: {
                    c1: {
                        d: undefined
                    },
                    c2: {
                        d: undefined
                    },
                },
                b2: undefined,
            }
        };
        test('noop on single item', async () => {
            const c = await getInitializedMainTestCollection(makeSimpleStubTree(tree1));
            const t = simplifyTestsToExecute(c, [
                c.getNodeById(new TestId(['ctrlId', 'a', 'b1']).toString())
            ]);
            assert.deepStrictEqual(t.map(t => t.item.extId.toString()), [
                new TestId(['ctrlId', 'a', 'b1']).toString()
            ]);
        });
        test('goes to common root 1', async () => {
            const c = await getInitializedMainTestCollection(makeSimpleStubTree(tree1));
            const t = simplifyTestsToExecute(c, [
                c.getNodeById(new TestId(['ctrlId', 'a', 'b1', 'c1', 'd']).toString()),
                c.getNodeById(new TestId(['ctrlId', 'a', 'b1', 'c2']).toString()),
            ]);
            assert.deepStrictEqual(t.map(t => t.item.extId.toString()), [
                new TestId(['ctrlId', 'a', 'b1']).toString()
            ]);
        });
        test('goes to common root 2', async () => {
            const c = await getInitializedMainTestCollection(makeSimpleStubTree(tree1));
            const t = simplifyTestsToExecute(c, [
                c.getNodeById(new TestId(['ctrlId', 'a', 'b1', 'c1']).toString()),
                c.getNodeById(new TestId(['ctrlId', 'a', 'b1']).toString()),
            ]);
            assert.deepStrictEqual(t.map(t => t.item.extId.toString()), [
                new TestId(['ctrlId', 'a', 'b1']).toString()
            ]);
        });
        test('goes to common root 3', async () => {
            const c = await getInitializedMainTestCollection(makeSimpleStubTree(tree1));
            const t = simplifyTestsToExecute(c, [
                c.getNodeById(new TestId(['ctrlId', 'a', 'b1', 'c1', 'd']).toString()),
                c.getNodeById(new TestId(['ctrlId', 'a', 'b1', 'c2']).toString()),
            ]);
            assert.deepStrictEqual(t.map(t => t.item.extId.toString()), [
                new TestId(['ctrlId', 'a', 'b1']).toString()
            ]);
        });
        test('goes to common root 4', async () => {
            const c = await getInitializedMainTestCollection(makeSimpleStubTree(tree1));
            const t = simplifyTestsToExecute(c, [
                c.getNodeById(new TestId(['ctrlId', 'a', 'b2']).toString()),
                c.getNodeById(new TestId(['ctrlId', 'a', 'b1']).toString()),
            ]);
            assert.deepStrictEqual(t.map(t => t.item.extId.toString()), [
                new TestId(['ctrlId']).toString()
            ]);
        });
        test('no-op divergent trees', async () => {
            const c = await getInitializedMainTestCollection(makeSimpleStubTree(tree1));
            const t = simplifyTestsToExecute(c, [
                c.getNodeById(new TestId(['ctrlId', 'a', 'b1', 'c2']).toString()),
                c.getNodeById(new TestId(['ctrlId', 'a', 'b2']).toString()),
            ]);
            assert.deepStrictEqual(t.map(t => t.item.extId.toString()), [
                new TestId(['ctrlId', 'a', 'b1', 'c2']).toString(),
                new TestId(['ctrlId', 'a', 'b2']).toString(),
            ]);
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdFNlcnZpY2UudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL2FkdmlrYXIvRG9jdW1lbnRzL2FyY2hpdGVjdC9hcmNoMi9BcmNoSURFL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlc3RpbmcvdGVzdC9jb21tb24vdGVzdFNlcnZpY2UudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEtBQUssTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUNqQyxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUNuRyxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sd0JBQXdCLENBQUM7QUFDaEQsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFDckUsT0FBTyxFQUFFLGdDQUFnQyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sZ0JBQWdCLENBQUM7QUFFdEYsS0FBSyxDQUFDLDBCQUEwQixFQUFFLEdBQUcsRUFBRTtJQUN0Qyx1Q0FBdUMsRUFBRSxDQUFDO0lBRTFDLEtBQUssQ0FBQyx3QkFBd0IsRUFBRSxHQUFHLEVBQUU7UUFDcEMsTUFBTSxLQUFLLEdBQUc7WUFDYixDQUFDLEVBQUU7Z0JBQ0YsRUFBRSxFQUFFO29CQUNILEVBQUUsRUFBRTt3QkFDSCxDQUFDLEVBQUUsU0FBUztxQkFDWjtvQkFDRCxFQUFFLEVBQUU7d0JBQ0gsQ0FBQyxFQUFFLFNBQVM7cUJBQ1o7aUJBQ0Q7Z0JBQ0QsRUFBRSxFQUFFLFNBQVM7YUFDYjtTQUNRLENBQUM7UUFFWCxJQUFJLENBQUMscUJBQXFCLEVBQUUsS0FBSyxJQUFJLEVBQUU7WUFDdEMsTUFBTSxDQUFDLEdBQUcsTUFBTSxnQ0FBZ0MsQ0FBQyxrQkFBa0IsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO1lBRTVFLE1BQU0sQ0FBQyxHQUFHLHNCQUFzQixDQUFDLENBQUMsRUFBRTtnQkFDbkMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxJQUFJLE1BQU0sQ0FBQyxDQUFDLFFBQVEsRUFBRSxHQUFHLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxRQUFRLEVBQUUsQ0FBRTthQUM1RCxDQUFDLENBQUM7WUFFSCxNQUFNLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLEVBQUUsQ0FBQyxFQUFFO2dCQUMzRCxJQUFJLE1BQU0sQ0FBQyxDQUFDLFFBQVEsRUFBRSxHQUFHLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxRQUFRLEVBQUU7YUFDNUMsQ0FBQyxDQUFDO1FBQ0osQ0FBQyxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsdUJBQXVCLEVBQUUsS0FBSyxJQUFJLEVBQUU7WUFDeEMsTUFBTSxDQUFDLEdBQUcsTUFBTSxnQ0FBZ0MsQ0FBQyxrQkFBa0IsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO1lBRTVFLE1BQU0sQ0FBQyxHQUFHLHNCQUFzQixDQUFDLENBQUMsRUFBRTtnQkFDbkMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxJQUFJLE1BQU0sQ0FBQyxDQUFDLFFBQVEsRUFBRSxHQUFHLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDLFFBQVEsRUFBRSxDQUFFO2dCQUN2RSxDQUFDLENBQUMsV0FBVyxDQUFDLElBQUksTUFBTSxDQUFDLENBQUMsUUFBUSxFQUFFLEdBQUcsRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxRQUFRLEVBQUUsQ0FBRTthQUNsRSxDQUFDLENBQUM7WUFFSCxNQUFNLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLEVBQUUsQ0FBQyxFQUFFO2dCQUMzRCxJQUFJLE1BQU0sQ0FBQyxDQUFDLFFBQVEsRUFBRSxHQUFHLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxRQUFRLEVBQUU7YUFDNUMsQ0FBQyxDQUFDO1FBQ0osQ0FBQyxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsdUJBQXVCLEVBQUUsS0FBSyxJQUFJLEVBQUU7WUFDeEMsTUFBTSxDQUFDLEdBQUcsTUFBTSxnQ0FBZ0MsQ0FBQyxrQkFBa0IsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO1lBRTVFLE1BQU0sQ0FBQyxHQUFHLHNCQUFzQixDQUFDLENBQUMsRUFBRTtnQkFDbkMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxJQUFJLE1BQU0sQ0FBQyxDQUFDLFFBQVEsRUFBRSxHQUFHLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsUUFBUSxFQUFFLENBQUU7Z0JBQ2xFLENBQUMsQ0FBQyxXQUFXLENBQUMsSUFBSSxNQUFNLENBQUMsQ0FBQyxRQUFRLEVBQUUsR0FBRyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsUUFBUSxFQUFFLENBQUU7YUFDNUQsQ0FBQyxDQUFDO1lBRUgsTUFBTSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxFQUFFLENBQUMsRUFBRTtnQkFDM0QsSUFBSSxNQUFNLENBQUMsQ0FBQyxRQUFRLEVBQUUsR0FBRyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsUUFBUSxFQUFFO2FBQzVDLENBQUMsQ0FBQztRQUNKLENBQUMsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLHVCQUF1QixFQUFFLEtBQUssSUFBSSxFQUFFO1lBQ3hDLE1BQU0sQ0FBQyxHQUFHLE1BQU0sZ0NBQWdDLENBQUMsa0JBQWtCLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztZQUU1RSxNQUFNLENBQUMsR0FBRyxzQkFBc0IsQ0FBQyxDQUFDLEVBQUU7Z0JBQ25DLENBQUMsQ0FBQyxXQUFXLENBQUMsSUFBSSxNQUFNLENBQUMsQ0FBQyxRQUFRLEVBQUUsR0FBRyxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxRQUFRLEVBQUUsQ0FBRTtnQkFDdkUsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxJQUFJLE1BQU0sQ0FBQyxDQUFDLFFBQVEsRUFBRSxHQUFHLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsUUFBUSxFQUFFLENBQUU7YUFDbEUsQ0FBQyxDQUFDO1lBRUgsTUFBTSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxFQUFFLENBQUMsRUFBRTtnQkFDM0QsSUFBSSxNQUFNLENBQUMsQ0FBQyxRQUFRLEVBQUUsR0FBRyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsUUFBUSxFQUFFO2FBQzVDLENBQUMsQ0FBQztRQUNKLENBQUMsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLHVCQUF1QixFQUFFLEtBQUssSUFBSSxFQUFFO1lBQ3hDLE1BQU0sQ0FBQyxHQUFHLE1BQU0sZ0NBQWdDLENBQUMsa0JBQWtCLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztZQUU1RSxNQUFNLENBQUMsR0FBRyxzQkFBc0IsQ0FBQyxDQUFDLEVBQUU7Z0JBQ25DLENBQUMsQ0FBQyxXQUFXLENBQUMsSUFBSSxNQUFNLENBQUMsQ0FBQyxRQUFRLEVBQUUsR0FBRyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsUUFBUSxFQUFFLENBQUU7Z0JBQzVELENBQUMsQ0FBQyxXQUFXLENBQUMsSUFBSSxNQUFNLENBQUMsQ0FBQyxRQUFRLEVBQUUsR0FBRyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsUUFBUSxFQUFFLENBQUU7YUFDNUQsQ0FBQyxDQUFDO1lBRUgsTUFBTSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxFQUFFLENBQUMsRUFBRTtnQkFDM0QsSUFBSSxNQUFNLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLFFBQVEsRUFBRTthQUNqQyxDQUFDLENBQUM7UUFDSixDQUFDLENBQUMsQ0FBQztRQUVILElBQUksQ0FBQyx1QkFBdUIsRUFBRSxLQUFLLElBQUksRUFBRTtZQUN4QyxNQUFNLENBQUMsR0FBRyxNQUFNLGdDQUFnQyxDQUFDLGtCQUFrQixDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7WUFFNUUsTUFBTSxDQUFDLEdBQUcsc0JBQXNCLENBQUMsQ0FBQyxFQUFFO2dCQUNuQyxDQUFDLENBQUMsV0FBVyxDQUFDLElBQUksTUFBTSxDQUFDLENBQUMsUUFBUSxFQUFFLEdBQUcsRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxRQUFRLEVBQUUsQ0FBRTtnQkFDbEUsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxJQUFJLE1BQU0sQ0FBQyxDQUFDLFFBQVEsRUFBRSxHQUFHLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxRQUFRLEVBQUUsQ0FBRTthQUM1RCxDQUFDLENBQUM7WUFFSCxNQUFNLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLEVBQUUsQ0FBQyxFQUFFO2dCQUMzRCxJQUFJLE1BQU0sQ0FBQyxDQUFDLFFBQVEsRUFBRSxHQUFHLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsUUFBUSxFQUFFO2dCQUNsRCxJQUFJLE1BQU0sQ0FBQyxDQUFDLFFBQVEsRUFBRSxHQUFHLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxRQUFRLEVBQUU7YUFDNUMsQ0FBQyxDQUFDO1FBQ0osQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDLENBQUMsQ0FBQztBQUNKLENBQUMsQ0FBQyxDQUFDIn0=