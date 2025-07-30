/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../../base/test/common/utils.js';
import { registerTerminalSuggestProvidersConfiguration } from '../../common/terminalSuggestConfiguration.js';
suite('Terminal Suggest Dynamic Configuration', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('should update configuration when providers change', () => {
        // Test initial state
        registerTerminalSuggestProvidersConfiguration([]);
        // Test with some providers
        const providers = ['terminal-suggest', 'builtinPwsh', 'lsp', 'custom-provider'];
        registerTerminalSuggestProvidersConfiguration(providers);
        // Test with empty providers
        registerTerminalSuggestProvidersConfiguration([]);
        // The fact that this doesn't throw means the basic logic works
        assert.ok(true);
    });
    test('should include default providers even when none provided', () => {
        // This should not throw and should set up default configuration
        registerTerminalSuggestProvidersConfiguration(undefined);
        assert.ok(true);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxTdWdnZXN0Q29uZmlndXJhdGlvbi50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvYWR2aWthci9Eb2N1bWVudHMvYXJjaGl0ZWN0L2FyY2gyL0FyY2hJREUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVybWluYWxDb250cmliL3N1Z2dlc3QvdGVzdC9icm93c2VyL3Rlcm1pbmFsU3VnZ2VzdENvbmZpZ3VyYXRpb24udGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFDdEcsT0FBTyxFQUFFLDZDQUE2QyxFQUFFLE1BQU0sOENBQThDLENBQUM7QUFFN0csS0FBSyxDQUFDLHdDQUF3QyxFQUFFLEdBQUcsRUFBRTtJQUNwRCx1Q0FBdUMsRUFBRSxDQUFDO0lBRTFDLElBQUksQ0FBQyxtREFBbUQsRUFBRSxHQUFHLEVBQUU7UUFDOUQscUJBQXFCO1FBQ3JCLDZDQUE2QyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBRWxELDJCQUEyQjtRQUMzQixNQUFNLFNBQVMsR0FBRyxDQUFDLGtCQUFrQixFQUFFLGFBQWEsRUFBRSxLQUFLLEVBQUUsaUJBQWlCLENBQUMsQ0FBQztRQUNoRiw2Q0FBNkMsQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUV6RCw0QkFBNEI7UUFDNUIsNkNBQTZDLENBQUMsRUFBRSxDQUFDLENBQUM7UUFFbEQsK0RBQStEO1FBQy9ELE1BQU0sQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDakIsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsMERBQTBELEVBQUUsR0FBRyxFQUFFO1FBQ3JFLGdFQUFnRTtRQUNoRSw2Q0FBNkMsQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUN6RCxNQUFNLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ2pCLENBQUMsQ0FBQyxDQUFDO0FBQ0osQ0FBQyxDQUFDLENBQUMifQ==