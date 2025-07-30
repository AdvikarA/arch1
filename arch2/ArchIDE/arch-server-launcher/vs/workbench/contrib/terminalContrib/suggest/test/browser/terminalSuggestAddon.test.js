/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { strictEqual } from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../../base/test/common/utils.js';
import { isInlineCompletionSupported } from '../../browser/terminalSuggestAddon.js';
suite('Terminal Suggest Addon - Inline Completion, Shell Type Support', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('should return true for supported shell types', () => {
        strictEqual(isInlineCompletionSupported("bash" /* PosixShellType.Bash */), true);
        strictEqual(isInlineCompletionSupported("zsh" /* PosixShellType.Zsh */), true);
        strictEqual(isInlineCompletionSupported("fish" /* PosixShellType.Fish */), true);
        strictEqual(isInlineCompletionSupported("pwsh" /* GeneralShellType.PowerShell */), true);
        strictEqual(isInlineCompletionSupported("gitbash" /* WindowsShellType.GitBash */), true);
    });
    test('should return false for unsupported shell types', () => {
        strictEqual(isInlineCompletionSupported("nu" /* GeneralShellType.NuShell */), false);
        strictEqual(isInlineCompletionSupported("julia" /* GeneralShellType.Julia */), false);
        strictEqual(isInlineCompletionSupported("node" /* GeneralShellType.Node */), false);
        strictEqual(isInlineCompletionSupported("python" /* GeneralShellType.Python */), false);
        strictEqual(isInlineCompletionSupported("sh" /* PosixShellType.Sh */), false);
        strictEqual(isInlineCompletionSupported("csh" /* PosixShellType.Csh */), false);
        strictEqual(isInlineCompletionSupported("ksh" /* PosixShellType.Ksh */), false);
        strictEqual(isInlineCompletionSupported("cmd" /* WindowsShellType.CommandPrompt */), false);
        strictEqual(isInlineCompletionSupported("wsl" /* WindowsShellType.Wsl */), false);
        strictEqual(isInlineCompletionSupported("python" /* GeneralShellType.Python */), false);
        strictEqual(isInlineCompletionSupported(undefined), false);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxTdWdnZXN0QWRkb24udGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL2FkdmlrYXIvRG9jdW1lbnRzL2FyY2hpdGVjdC9hcmNoMi9BcmNoSURFL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlcm1pbmFsQ29udHJpYi9zdWdnZXN0L3Rlc3QvYnJvd3Nlci90ZXJtaW5hbFN1Z2dlc3RBZGRvbi50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxRQUFRLENBQUM7QUFDckMsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFFdEcsT0FBTyxFQUFFLDJCQUEyQixFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFFcEYsS0FBSyxDQUFDLGdFQUFnRSxFQUFFLEdBQUcsRUFBRTtJQUM1RSx1Q0FBdUMsRUFBRSxDQUFDO0lBRTFDLElBQUksQ0FBQyw4Q0FBOEMsRUFBRSxHQUFHLEVBQUU7UUFDekQsV0FBVyxDQUFDLDJCQUEyQixrQ0FBcUIsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUNwRSxXQUFXLENBQUMsMkJBQTJCLGdDQUFvQixFQUFFLElBQUksQ0FBQyxDQUFDO1FBQ25FLFdBQVcsQ0FBQywyQkFBMkIsa0NBQXFCLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDcEUsV0FBVyxDQUFDLDJCQUEyQiwwQ0FBNkIsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUM1RSxXQUFXLENBQUMsMkJBQTJCLDBDQUEwQixFQUFFLElBQUksQ0FBQyxDQUFDO0lBQzFFLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLGlEQUFpRCxFQUFFLEdBQUcsRUFBRTtRQUM1RCxXQUFXLENBQUMsMkJBQTJCLHFDQUEwQixFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQzFFLFdBQVcsQ0FBQywyQkFBMkIsc0NBQXdCLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDeEUsV0FBVyxDQUFDLDJCQUEyQixvQ0FBdUIsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUN2RSxXQUFXLENBQUMsMkJBQTJCLHdDQUF5QixFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQ3pFLFdBQVcsQ0FBQywyQkFBMkIsOEJBQW1CLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDbkUsV0FBVyxDQUFDLDJCQUEyQixnQ0FBb0IsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUNwRSxXQUFXLENBQUMsMkJBQTJCLGdDQUFvQixFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQ3BFLFdBQVcsQ0FBQywyQkFBMkIsNENBQWdDLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDaEYsV0FBVyxDQUFDLDJCQUEyQixrQ0FBc0IsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUN0RSxXQUFXLENBQUMsMkJBQTJCLHdDQUF5QixFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQ3pFLFdBQVcsQ0FBQywyQkFBMkIsQ0FBQyxTQUFTLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQztJQUM1RCxDQUFDLENBQUMsQ0FBQztBQUNKLENBQUMsQ0FBQyxDQUFDIn0=