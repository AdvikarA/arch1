/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { McpResourceURI } from '../../common/mcpTypes.js';
import * as assert from 'assert';
suite('MCP Types', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('McpResourceURI - round trips', () => {
        const roundTrip = (uri) => {
            const from = McpResourceURI.fromServer({ label: '', id: 'my-id' }, uri);
            const to = McpResourceURI.toServer(from);
            assert.strictEqual(to.definitionId, 'my-id');
            assert.strictEqual(to.resourceURL.toString(), uri, `expected to round trip ${uri}`);
        };
        roundTrip('file:///path/to/file.txt');
        roundTrip('custom-scheme://my-path/to/resource.txt');
        roundTrip('custom-scheme://my-path');
        roundTrip('custom-scheme://my-path/');
        roundTrip('custom-scheme://my-path/?with=query&params=here');
        roundTrip('custom-scheme:///my-path');
        roundTrip('custom-scheme:///my-path/foo/?with=query&params=here');
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWNwVHlwZXMudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL2FkdmlrYXIvRG9jdW1lbnRzL2FyY2hpdGVjdC9hcmNoMi9BcmNoSURFL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL21jcC90ZXN0L2NvbW1vbi9tY3BUeXBlcy50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ25HLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQUMxRCxPQUFPLEtBQUssTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUVqQyxLQUFLLENBQUMsV0FBVyxFQUFFLEdBQUcsRUFBRTtJQUN2Qix1Q0FBdUMsRUFBRSxDQUFDO0lBRTFDLElBQUksQ0FBQyw4QkFBOEIsRUFBRSxHQUFHLEVBQUU7UUFDekMsTUFBTSxTQUFTLEdBQUcsQ0FBQyxHQUFXLEVBQUUsRUFBRTtZQUNqQyxNQUFNLElBQUksR0FBRyxjQUFjLENBQUMsVUFBVSxDQUFDLEVBQUUsS0FBSyxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsT0FBTyxFQUFFLEVBQUUsR0FBRyxDQUFDLENBQUM7WUFDeEUsTUFBTSxFQUFFLEdBQUcsY0FBYyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUN6QyxNQUFNLENBQUMsV0FBVyxDQUFDLEVBQUUsQ0FBQyxZQUFZLEVBQUUsT0FBTyxDQUFDLENBQUM7WUFDN0MsTUFBTSxDQUFDLFdBQVcsQ0FBQyxFQUFFLENBQUMsV0FBVyxDQUFDLFFBQVEsRUFBRSxFQUFFLEdBQUcsRUFBRSwwQkFBMEIsR0FBRyxFQUFFLENBQUMsQ0FBQztRQUNyRixDQUFDLENBQUM7UUFFRixTQUFTLENBQUMsMEJBQTBCLENBQUMsQ0FBQztRQUN0QyxTQUFTLENBQUMseUNBQXlDLENBQUMsQ0FBQztRQUNyRCxTQUFTLENBQUMseUJBQXlCLENBQUMsQ0FBQztRQUNyQyxTQUFTLENBQUMsMEJBQTBCLENBQUMsQ0FBQztRQUN0QyxTQUFTLENBQUMsaURBQWlELENBQUMsQ0FBQztRQUU3RCxTQUFTLENBQUMsMEJBQTBCLENBQUMsQ0FBQztRQUN0QyxTQUFTLENBQUMsc0RBQXNELENBQUMsQ0FBQztJQUNuRSxDQUFDLENBQUMsQ0FBQztBQUNKLENBQUMsQ0FBQyxDQUFDIn0=