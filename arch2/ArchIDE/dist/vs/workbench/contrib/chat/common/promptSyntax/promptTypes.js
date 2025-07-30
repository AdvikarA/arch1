/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
/**
 * Documentation link for the reusable prompts feature.
 */
export const PROMPT_DOCUMENTATION_URL = 'https://aka.ms/vscode-ghcp-prompt-snippets';
export const INSTRUCTIONS_DOCUMENTATION_URL = 'https://aka.ms/vscode-ghcp-custom-instructions';
export const MODE_DOCUMENTATION_URL = 'https://aka.ms/vscode-ghcp-custom-chat-modes'; // todo
/**
 * Language ID for the reusable prompt syntax.
 */
export const PROMPT_LANGUAGE_ID = 'prompt';
/**
 * Language ID for instructions syntax.
 */
export const INSTRUCTIONS_LANGUAGE_ID = 'instructions';
/**
 * Language ID for modes syntax.
 */
export const MODE_LANGUAGE_ID = 'chatmode';
/**
 * Prompt and instructions files language selector.
 */
export const ALL_PROMPTS_LANGUAGE_SELECTOR = [PROMPT_LANGUAGE_ID, INSTRUCTIONS_LANGUAGE_ID, MODE_LANGUAGE_ID];
/**
 * The language id for for a prompts type.
 */
export function getLanguageIdForPromptsType(type) {
    switch (type) {
        case PromptsType.prompt:
            return PROMPT_LANGUAGE_ID;
        case PromptsType.instructions:
            return INSTRUCTIONS_LANGUAGE_ID;
        case PromptsType.mode:
            return MODE_LANGUAGE_ID;
        default:
            throw new Error(`Unknown prompt type: ${type}`);
    }
}
export function getPromptsTypeForLanguageId(languageId) {
    switch (languageId) {
        case PROMPT_LANGUAGE_ID:
            return PromptsType.prompt;
        case INSTRUCTIONS_LANGUAGE_ID:
            return PromptsType.instructions;
        case MODE_LANGUAGE_ID:
            return PromptsType.mode;
        default:
            return undefined;
    }
}
/**
 * What the prompt is used for.
 */
export var PromptsType;
(function (PromptsType) {
    PromptsType["instructions"] = "instructions";
    PromptsType["prompt"] = "prompt";
    PromptsType["mode"] = "mode";
})(PromptsType || (PromptsType = {}));
export function isValidPromptType(type) {
    return Object.values(PromptsType).includes(type);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvbXB0VHlwZXMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9hZHZpa2FyL0RvY3VtZW50cy9hcmNoaXRlY3QvYXJjaDIvQXJjaElERS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2NvbW1vbi9wcm9tcHRTeW50YXgvcHJvbXB0VHlwZXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFJaEc7O0dBRUc7QUFDSCxNQUFNLENBQUMsTUFBTSx3QkFBd0IsR0FBRyw0Q0FBNEMsQ0FBQztBQUNyRixNQUFNLENBQUMsTUFBTSw4QkFBOEIsR0FBRyxnREFBZ0QsQ0FBQztBQUMvRixNQUFNLENBQUMsTUFBTSxzQkFBc0IsR0FBRyw4Q0FBOEMsQ0FBQyxDQUFDLE9BQU87QUFFN0Y7O0dBRUc7QUFDSCxNQUFNLENBQUMsTUFBTSxrQkFBa0IsR0FBRyxRQUFRLENBQUM7QUFFM0M7O0dBRUc7QUFDSCxNQUFNLENBQUMsTUFBTSx3QkFBd0IsR0FBRyxjQUFjLENBQUM7QUFFdkQ7O0dBRUc7QUFDSCxNQUFNLENBQUMsTUFBTSxnQkFBZ0IsR0FBRyxVQUFVLENBQUM7QUFFM0M7O0dBRUc7QUFDSCxNQUFNLENBQUMsTUFBTSw2QkFBNkIsR0FBcUIsQ0FBQyxrQkFBa0IsRUFBRSx3QkFBd0IsRUFBRSxnQkFBZ0IsQ0FBQyxDQUFDO0FBRWhJOztHQUVHO0FBQ0gsTUFBTSxVQUFVLDJCQUEyQixDQUFDLElBQWlCO0lBQzVELFFBQVEsSUFBSSxFQUFFLENBQUM7UUFDZCxLQUFLLFdBQVcsQ0FBQyxNQUFNO1lBQ3RCLE9BQU8sa0JBQWtCLENBQUM7UUFDM0IsS0FBSyxXQUFXLENBQUMsWUFBWTtZQUM1QixPQUFPLHdCQUF3QixDQUFDO1FBQ2pDLEtBQUssV0FBVyxDQUFDLElBQUk7WUFDcEIsT0FBTyxnQkFBZ0IsQ0FBQztRQUN6QjtZQUNDLE1BQU0sSUFBSSxLQUFLLENBQUMsd0JBQXdCLElBQUksRUFBRSxDQUFDLENBQUM7SUFDbEQsQ0FBQztBQUNGLENBQUM7QUFFRCxNQUFNLFVBQVUsMkJBQTJCLENBQUMsVUFBa0I7SUFDN0QsUUFBUSxVQUFVLEVBQUUsQ0FBQztRQUNwQixLQUFLLGtCQUFrQjtZQUN0QixPQUFPLFdBQVcsQ0FBQyxNQUFNLENBQUM7UUFDM0IsS0FBSyx3QkFBd0I7WUFDNUIsT0FBTyxXQUFXLENBQUMsWUFBWSxDQUFDO1FBQ2pDLEtBQUssZ0JBQWdCO1lBQ3BCLE9BQU8sV0FBVyxDQUFDLElBQUksQ0FBQztRQUN6QjtZQUNDLE9BQU8sU0FBUyxDQUFDO0lBQ25CLENBQUM7QUFDRixDQUFDO0FBR0Q7O0dBRUc7QUFDSCxNQUFNLENBQU4sSUFBWSxXQUlYO0FBSkQsV0FBWSxXQUFXO0lBQ3RCLDRDQUE2QixDQUFBO0lBQzdCLGdDQUFpQixDQUFBO0lBQ2pCLDRCQUFhLENBQUE7QUFDZCxDQUFDLEVBSlcsV0FBVyxLQUFYLFdBQVcsUUFJdEI7QUFDRCxNQUFNLFVBQVUsaUJBQWlCLENBQUMsSUFBWTtJQUM3QyxPQUFPLE1BQU0sQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUFDLENBQUMsUUFBUSxDQUFDLElBQW1CLENBQUMsQ0FBQztBQUNqRSxDQUFDIn0=