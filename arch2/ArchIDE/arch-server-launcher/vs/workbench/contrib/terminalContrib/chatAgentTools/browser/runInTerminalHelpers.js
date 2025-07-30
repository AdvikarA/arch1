/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { posix as pathPosix, win32 as pathWin32 } from '../../../../../base/common/path.js';
import { removeAnsiEscapeCodes } from '../../../../../base/common/strings.js';
export function isPowerShell(envShell, os) {
    if (os === 1 /* OperatingSystem.Windows */) {
        return /^(?:powershell|pwsh)(?:-preview)?$/i.test(pathWin32.basename(envShell).replace(/\.exe$/i, ''));
    }
    return /^(?:powershell|pwsh)(?:-preview)?$/.test(pathPosix.basename(envShell));
}
// Maximum output length to prevent context overflow
const MAX_OUTPUT_LENGTH = 60000; // ~60KB limit to keep context manageable
const TRUNCATION_MESSAGE = '\n\n[... MIDDLE OF OUTPUT TRUNCATED ...]\n\n';
export function sanitizeTerminalOutput(output) {
    let sanitized = removeAnsiEscapeCodes(output)
        // Trim trailing \r\n characters
        .trimEnd();
    // Truncate if output is too long to prevent context overflow
    if (sanitized.length > MAX_OUTPUT_LENGTH) {
        const truncationMessageLength = TRUNCATION_MESSAGE.length;
        const availableLength = MAX_OUTPUT_LENGTH - truncationMessageLength;
        const startLength = Math.floor(availableLength * 0.4); // Keep 40% from start
        const endLength = availableLength - startLength; // Keep 60% from end
        const startPortion = sanitized.substring(0, startLength);
        const endPortion = sanitized.substring(sanitized.length - endLength);
        sanitized = startPortion + TRUNCATION_MESSAGE + endPortion;
    }
    return sanitized;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVuSW5UZXJtaW5hbEhlbHBlcnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9hZHZpa2FyL0RvY3VtZW50cy9hcmNoaXRlY3QvYXJjaDIvQXJjaElERS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXJtaW5hbENvbnRyaWIvY2hhdEFnZW50VG9vbHMvYnJvd3Nlci9ydW5JblRlcm1pbmFsSGVscGVycy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsS0FBSyxJQUFJLFNBQVMsRUFBRSxLQUFLLElBQUksU0FBUyxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFFNUYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFFOUUsTUFBTSxVQUFVLFlBQVksQ0FBQyxRQUFnQixFQUFFLEVBQW1CO0lBQ2pFLElBQUksRUFBRSxvQ0FBNEIsRUFBRSxDQUFDO1FBQ3BDLE9BQU8scUNBQXFDLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBRXhHLENBQUM7SUFDRCxPQUFPLG9DQUFvQyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUM7QUFDaEYsQ0FBQztBQUVELG9EQUFvRDtBQUNwRCxNQUFNLGlCQUFpQixHQUFHLEtBQUssQ0FBQyxDQUFDLHlDQUF5QztBQUMxRSxNQUFNLGtCQUFrQixHQUFHLDhDQUE4QyxDQUFDO0FBRTFFLE1BQU0sVUFBVSxzQkFBc0IsQ0FBQyxNQUFjO0lBQ3BELElBQUksU0FBUyxHQUFHLHFCQUFxQixDQUFDLE1BQU0sQ0FBQztRQUM1QyxnQ0FBZ0M7U0FDL0IsT0FBTyxFQUFFLENBQUM7SUFFWiw2REFBNkQ7SUFDN0QsSUFBSSxTQUFTLENBQUMsTUFBTSxHQUFHLGlCQUFpQixFQUFFLENBQUM7UUFDMUMsTUFBTSx1QkFBdUIsR0FBRyxrQkFBa0IsQ0FBQyxNQUFNLENBQUM7UUFDMUQsTUFBTSxlQUFlLEdBQUcsaUJBQWlCLEdBQUcsdUJBQXVCLENBQUM7UUFDcEUsTUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxlQUFlLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQyxzQkFBc0I7UUFDN0UsTUFBTSxTQUFTLEdBQUcsZUFBZSxHQUFHLFdBQVcsQ0FBQyxDQUFDLG9CQUFvQjtRQUVyRSxNQUFNLFlBQVksR0FBRyxTQUFTLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxXQUFXLENBQUMsQ0FBQztRQUN6RCxNQUFNLFVBQVUsR0FBRyxTQUFTLENBQUMsU0FBUyxDQUFDLFNBQVMsQ0FBQyxNQUFNLEdBQUcsU0FBUyxDQUFDLENBQUM7UUFFckUsU0FBUyxHQUFHLFlBQVksR0FBRyxrQkFBa0IsR0FBRyxVQUFVLENBQUM7SUFDNUQsQ0FBQztJQUVELE9BQU8sU0FBUyxDQUFDO0FBQ2xCLENBQUMifQ==