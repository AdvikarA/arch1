/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { registerAttachPromptActions } from './attachInstructionsAction.js';
import { registerChatModeActions } from './chatModeActions.js';
import { registerRunPromptActions } from './runPromptAction.js';
import { registerSaveToPromptActions } from './saveToPromptAction.js';
import { registerNewPromptFileActions } from './newPromptFileActions.js';
/**
 * Helper to register all actions related to reusable prompt files.
 */
export function registerPromptActions() {
    registerRunPromptActions();
    registerAttachPromptActions();
    registerSaveToPromptActions();
    registerChatModeActions();
    registerNewPromptFileActions();
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvbXB0RmlsZUFjdGlvbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9hZHZpa2FyL0RvY3VtZW50cy9hcmNoaXRlY3QvYXJjaDIvQXJjaElERS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2Jyb3dzZXIvcHJvbXB0U3ludGF4L3Byb21wdEZpbGVBY3Rpb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSwyQkFBMkIsRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQzVFLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLHNCQUFzQixDQUFDO0FBQy9ELE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLHNCQUFzQixDQUFDO0FBQ2hFLE9BQU8sRUFBRSwyQkFBMkIsRUFBRSxNQUFNLHlCQUF5QixDQUFDO0FBQ3RFLE9BQU8sRUFBRSw0QkFBNEIsRUFBRSxNQUFNLDJCQUEyQixDQUFDO0FBR3pFOztHQUVHO0FBQ0gsTUFBTSxVQUFVLHFCQUFxQjtJQUNwQyx3QkFBd0IsRUFBRSxDQUFDO0lBQzNCLDJCQUEyQixFQUFFLENBQUM7SUFDOUIsMkJBQTJCLEVBQUUsQ0FBQztJQUM5Qix1QkFBdUIsRUFBRSxDQUFDO0lBQzFCLDRCQUE0QixFQUFFLENBQUM7QUFDaEMsQ0FBQyJ9