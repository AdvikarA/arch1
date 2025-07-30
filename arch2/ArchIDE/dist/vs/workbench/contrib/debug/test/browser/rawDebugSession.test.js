/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { mock, mockObject } from '../../../../../base/test/common/mock.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { RawDebugSession } from '../../browser/rawDebugSession.js';
import { MockDebugAdapter } from '../common/mockDebug.js';
suite('RawDebugSession', () => {
    const disposables = ensureNoDisposablesAreLeakedInTestSuite();
    function createTestObjects() {
        const debugAdapter = new MockDebugAdapter();
        const dbgr = mockObject()({
            type: 'mock-debug'
        });
        const session = new RawDebugSession(debugAdapter, dbgr, 'sessionId', 'name', new (mock()), new (mock()), new (mock()), new (mock()));
        disposables.add(session);
        disposables.add(debugAdapter);
        return { debugAdapter, dbgr };
    }
    test('handles startDebugging request success', async () => {
        const { debugAdapter, dbgr } = createTestObjects();
        dbgr.startDebugging.returns(Promise.resolve(true));
        debugAdapter.sendRequestBody('startDebugging', {
            request: 'launch',
            configuration: {
                type: 'some-other-type'
            }
        });
        const response = await debugAdapter.waitForResponseFromClient('startDebugging');
        assert.strictEqual(response.command, 'startDebugging');
        assert.strictEqual(response.success, true);
    });
    test('handles startDebugging request failure', async () => {
        const { debugAdapter, dbgr } = createTestObjects();
        dbgr.startDebugging.returns(Promise.resolve(false));
        debugAdapter.sendRequestBody('startDebugging', {
            request: 'launch',
            configuration: {
                type: 'some-other-type'
            }
        });
        const response = await debugAdapter.waitForResponseFromClient('startDebugging');
        assert.strictEqual(response.command, 'startDebugging');
        assert.strictEqual(response.success, false);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmF3RGVidWdTZXNzaW9uLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9hZHZpa2FyL0RvY3VtZW50cy9hcmNoaXRlY3QvYXJjaDIvQXJjaElERS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9kZWJ1Zy90ZXN0L2Jyb3dzZXIvcmF3RGVidWdTZXNzaW9uLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQzVCLE9BQU8sRUFBRSxJQUFJLEVBQUUsVUFBVSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDM0UsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFLbkcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBRW5FLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLHdCQUF3QixDQUFDO0FBRTFELEtBQUssQ0FBQyxpQkFBaUIsRUFBRSxHQUFHLEVBQUU7SUFDN0IsTUFBTSxXQUFXLEdBQUcsdUNBQXVDLEVBQUUsQ0FBQztJQUU5RCxTQUFTLGlCQUFpQjtRQUN6QixNQUFNLFlBQVksR0FBRyxJQUFJLGdCQUFnQixFQUFFLENBQUM7UUFDNUMsTUFBTSxJQUFJLEdBQUcsVUFBVSxFQUFhLENBQUM7WUFDcEMsSUFBSSxFQUFFLFlBQVk7U0FDbEIsQ0FBQyxDQUFDO1FBRUgsTUFBTSxPQUFPLEdBQUcsSUFBSSxlQUFlLENBQ2xDLFlBQVksRUFDWixJQUF3QixFQUN4QixXQUFXLEVBQ1gsTUFBTSxFQUNOLElBQUksQ0FBQyxJQUFJLEVBQThCLENBQUMsRUFDeEMsSUFBSSxDQUFDLElBQUksRUFBa0IsQ0FBQyxFQUM1QixJQUFJLENBQUMsSUFBSSxFQUF3QixDQUFDLEVBQ2xDLElBQUksQ0FBQyxJQUFJLEVBQWtCLENBQUMsQ0FBQyxDQUFDO1FBQy9CLFdBQVcsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDekIsV0FBVyxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsQ0FBQztRQUU5QixPQUFPLEVBQUUsWUFBWSxFQUFFLElBQUksRUFBRSxDQUFDO0lBQy9CLENBQUM7SUFFRCxJQUFJLENBQUMsd0NBQXdDLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDekQsTUFBTSxFQUFFLFlBQVksRUFBRSxJQUFJLEVBQUUsR0FBRyxpQkFBaUIsRUFBRSxDQUFDO1FBQ25ELElBQUksQ0FBQyxjQUFjLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztRQUVuRCxZQUFZLENBQUMsZUFBZSxDQUFDLGdCQUFnQixFQUFFO1lBQzlDLE9BQU8sRUFBRSxRQUFRO1lBQ2pCLGFBQWEsRUFBRTtnQkFDZCxJQUFJLEVBQUUsaUJBQWlCO2FBQ3ZCO1NBQytDLENBQUMsQ0FBQztRQUNuRCxNQUFNLFFBQVEsR0FBRyxNQUFNLFlBQVksQ0FBQyx5QkFBeUIsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO1FBQ2hGLE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLE9BQU8sRUFBRSxnQkFBZ0IsQ0FBQyxDQUFDO1FBQ3ZELE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsQ0FBQztJQUM1QyxDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyx3Q0FBd0MsRUFBRSxLQUFLLElBQUksRUFBRTtRQUN6RCxNQUFNLEVBQUUsWUFBWSxFQUFFLElBQUksRUFBRSxHQUFHLGlCQUFpQixFQUFFLENBQUM7UUFDbkQsSUFBSSxDQUFDLGNBQWMsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO1FBRXBELFlBQVksQ0FBQyxlQUFlLENBQUMsZ0JBQWdCLEVBQUU7WUFDOUMsT0FBTyxFQUFFLFFBQVE7WUFDakIsYUFBYSxFQUFFO2dCQUNkLElBQUksRUFBRSxpQkFBaUI7YUFDdkI7U0FDK0MsQ0FBQyxDQUFDO1FBQ25ELE1BQU0sUUFBUSxHQUFHLE1BQU0sWUFBWSxDQUFDLHlCQUF5QixDQUFDLGdCQUFnQixDQUFDLENBQUM7UUFDaEYsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsT0FBTyxFQUFFLGdCQUFnQixDQUFDLENBQUM7UUFDdkQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsT0FBTyxFQUFFLEtBQUssQ0FBQyxDQUFDO0lBQzdDLENBQUMsQ0FBQyxDQUFDO0FBQ0osQ0FBQyxDQUFDLENBQUMifQ==