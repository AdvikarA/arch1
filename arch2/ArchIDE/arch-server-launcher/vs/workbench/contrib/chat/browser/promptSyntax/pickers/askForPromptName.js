/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../../../nls.js';
import { getPromptFileExtension } from '../../../common/promptSyntax/config/promptFileLocations.js';
import { PromptsType } from '../../../common/promptSyntax/promptTypes.js';
import { IQuickInputService } from '../../../../../../platform/quickinput/common/quickInput.js';
import { URI } from '../../../../../../base/common/uri.js';
import { IFileService } from '../../../../../../platform/files/common/files.js';
import Severity from '../../../../../../base/common/severity.js';
import { isValidBasename } from '../../../../../../base/common/extpath.js';
/**
 * Asks the user for a file name.
 */
export async function askForPromptFileName(accessor, type, selectedFolder, existingFileName) {
    const quickInputService = accessor.get(IQuickInputService);
    const fileService = accessor.get(IFileService);
    const sanitizeInput = (input) => {
        const trimmedName = input.trim();
        if (!trimmedName) {
            return undefined;
        }
        const fileExtension = getPromptFileExtension(type);
        return (trimmedName.endsWith(fileExtension))
            ? trimmedName
            : `${trimmedName}${fileExtension}`;
    };
    const validateInput = async (value) => {
        const fileName = sanitizeInput(value);
        if (!fileName) {
            return {
                content: localize('askForPromptFileName.error.empty', "Please enter a name."),
                severity: Severity.Warning
            };
        }
        if (!isValidBasename(fileName)) {
            return {
                content: localize('askForPromptFileName.error.invalid', "The name contains invalid characters."),
                severity: Severity.Error
            };
        }
        const fileUri = URI.joinPath(selectedFolder, fileName);
        if (await fileService.exists(fileUri)) {
            return {
                content: localize('askForPromptFileName.error.exists', "A file for the given name already exists."),
                severity: Severity.Error
            };
        }
        return undefined;
    };
    const placeHolder = existingFileName ? getPlaceholderStringForRename(type) : getPlaceholderStringForNew(type);
    const result = await quickInputService.input({ placeHolder, validateInput, value: existingFileName });
    if (!result) {
        return undefined;
    }
    return sanitizeInput(result);
}
function getPlaceholderStringForNew(type) {
    switch (type) {
        case PromptsType.instructions:
            return localize('askForInstructionsFileName.placeholder', "Enter the name of the instructions file");
        case PromptsType.prompt:
            return localize('askForPromptFileName.placeholder', "Enter the name of the prompt file");
        case PromptsType.mode:
            return localize('askForModeFileName.placeholder', "Enter the name of the custom chat mode file");
        default:
            throw new Error('Unknown prompt type');
    }
}
function getPlaceholderStringForRename(type) {
    switch (type) {
        case PromptsType.instructions:
            return localize('askForRenamedInstructionsFileName.placeholder', "Enter a new name of the instructions file");
        case PromptsType.prompt:
            return localize('askForRenamedPromptFileName.placeholder', "Enter a new name of the prompt file");
        case PromptsType.mode:
            return localize('askForRenamedModeFileName.placeholder', "Enter a new name of the custom chat mode file");
        default:
            throw new Error('Unknown prompt type');
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXNrRm9yUHJvbXB0TmFtZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL2FkdmlrYXIvRG9jdW1lbnRzL2FyY2hpdGVjdC9hcmNoMi9BcmNoSURFL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvYnJvd3Nlci9wcm9tcHRTeW50YXgvcGlja2Vycy9hc2tGb3JQcm9tcHROYW1lLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQztBQUNwRCxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNwRyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFDMUUsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDaEcsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQzNELE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUNoRixPQUFPLFFBQVEsTUFBTSwyQ0FBMkMsQ0FBQztBQUNqRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFHM0U7O0dBRUc7QUFDSCxNQUFNLENBQUMsS0FBSyxVQUFVLG9CQUFvQixDQUN6QyxRQUEwQixFQUMxQixJQUFpQixFQUNqQixjQUFtQixFQUNuQixnQkFBeUI7SUFFekIsTUFBTSxpQkFBaUIsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGtCQUFrQixDQUFDLENBQUM7SUFDM0QsTUFBTSxXQUFXLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsQ0FBQztJQUUvQyxNQUFNLGFBQWEsR0FBRyxDQUFDLEtBQWEsRUFBRSxFQUFFO1FBQ3ZDLE1BQU0sV0FBVyxHQUFHLEtBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQztRQUNqQyxJQUFJLENBQUMsV0FBVyxF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