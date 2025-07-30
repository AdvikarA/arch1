/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { EditorActivation } from '../../../../platform/editor/common/editor.js';
import { isEditorInputWithOptions, isEditorInput } from '../../../common/editor.js';
import { preferredSideBySideGroupDirection, IEditorGroupsService } from './editorGroupsService.js';
import { AUX_WINDOW_GROUP, SIDE_GROUP } from './editorService.js';
export function findGroup(accessor, editor, preferredGroup) {
    const editorGroupService = accessor.get(IEditorGroupsService);
    const configurationService = accessor.get(IConfigurationService);
    const group = doFindGroup(editor, preferredGroup, editorGroupService, configurationService);
    if (group instanceof Promise) {
        return group.then(group => handleGroupActivation(group, editor, preferredGroup, editorGroupService));
    }
    return handleGroupActivation(group, editor, preferredGroup, editorGroupService);
}
function handleGroupActivation(group, editor, preferredGroup, editorGroupService) {
    // Resolve editor activation strategy
    let activation = undefined;
    if (editorGroupService.activeGroup !== group && // only if target group is not already active
        editor.options && !editor.options.inactive && // never for inactive editors
        editor.options.preserveFocus && // only if preserveFocus
        typeof editor.options.activation !== 'number' && // only if activation is not already defined (either true or false)
        preferredGroup !== SIDE_GROUP // never for the SIDE_GROUP
    ) {
        // If the resolved group is not the active one, we typically
        // want the group to become active. There are a few cases
        // where we stay away from encorcing this, e.g. if the caller
        // is already providing `activation`.
        //
        // Specifically for historic reasons we do not activate a
        // group is it is opened as `SIDE_GROUP` with `preserveFocus:true`.
        // repeated Alt-clicking of files in the explorer always open
        // into the same side group and not cause a group to be created each time.
        activation = EditorActivation.ACTIVATE;
    }
    return [group, activation];
}
function doFindGroup(input, preferredGroup, editorGroupService, configurationService) {
    let group;
    const editor = isEditorInputWithOptions(input) ? input.editor : input;
    const options = input.options;
    // Group: Instance of Group
    if (preferredGroup && typeof preferredGroup !== 'number') {
        group = preferredGroup;
    }
    // Group: Specific Group
    else if (typeof preferredGroup === 'number' && preferredGroup >= 0) {
        group = editorGroupService.getGroup(preferredGroup);
    }
    // Group: Side by Side
    else if (preferredGroup === SIDE_GROUP) {
        const direction = preferredSideBySideGroupDirection(configurationService);
        let candidateGroup = editorGroupService.findGroup({ direction });
        if (!candidateGroup || isGroupLockedForEditor(candidateGroup, editor)) {
            // Create new group either when the candidate group
            // is locked or was not found in the direction
            candidateGroup = editorGroupService.addGroup(editorGroupService.activeGroup, direction);
        }
        group = candidateGroup;
    }
    // Group: Aux Window
    else if (preferredGroup === AUX_WINDOW_GROUP) {
        group = editorGroupService.createAuxiliaryEditorPart({
            bounds: options?.auxiliary?.bounds,
            compact: options?.auxiliary?.compact,
            alwaysOnTop: options?.auxiliary?.alwaysOnTop
        }).then(group => group.activeGroup);
    }
    // Group: Unspecified without a specific index to open
    else if (!options || typeof options.index !== 'number') {
        const groupsByLastActive = editorGroupService.getGroups(1 /* GroupsOrder.MOST_RECENTLY_ACTIVE */);
        // Respect option to reveal an editor if it is already visible in any group
        if (options?.revealIfVisible) {
            for (const lastActiveGroup of groupsByLastActive) {
                if (isActive(lastActiveGroup, editor)) {
                    group = lastActiveGroup;
                    break;
                }
            }
        }
        // Respect option to reveal an editor if it is open (not necessarily visible)
        // Still prefer to reveal an editor in a group where the editor is active though.
        // We also try to reveal an editor if it has the `Singleton` capability which
        // indicates that the same editor cannot be opened across groups.
        if (!group) {
            if (options?.revealIfOpened || configurationService.getValue('workbench.editor.revealIfOpen') || (isEditorInput(editor) && editor.hasCapability(8 /* EditorInputCapabilities.Singleton */))) {
                let groupWithInputActive = undefined;
                let groupWithInputOpened = undefined;
                for (const group of groupsByLastActive) {
                    if (isOpened(group, editor)) {
                        if (!groupWithInputOpened) {
                            groupWithInputOpened = group;
                        }
                        if (!groupWithInputActive && group.isActive(editor)) {
                            groupWithInputActive = group;
                        }
                    }
                    if (groupWithInputOpened && groupWithInputActive) {
                        break; // we found all groups we wanted
                    }
                }
                // Prefer a target group where the input is visible
                group = groupWithInputActive || groupWithInputOpened;
            }
        }
    }
    // Fallback to active group if target not valid but avoid
    // locked editor groups unless editor is already opened there
    if (!group) {
        let candidateGroup = editorGroupService.activeGroup;
        // Locked group: find the next non-locked group
        // going up the neigbours of the group or create
        // a new group otherwise
        if (isGroupLockedForEditor(candidateGroup, editor)) {
            for (const group of editorGroupService.getGroups(1 /* GroupsOrder.MOST_RECENTLY_ACTIVE */)) {
                if (isGroupLockedForEditor(group, editor)) {
                    continue;
                }
                candidateGroup = group;
                break;
            }
            if (isGroupLockedForEditor(candidateGroup, editor)) {
                // Group is still locked, so we have to create a new
                // group to the side of the candidate group
                group = editorGroupService.addGroup(candidateGroup, preferredSideBySideGroupDirection(configurationService));
            }
            else {
                group = candidateGroup;
            }
        }
        // Non-locked group: take as is
        else {
            group = candidateGroup;
        }
    }
    return group;
}
function isGroupLockedForEditor(group, editor) {
    if (!group.isLocked) {
        // only relevant for locked editor groups
        return false;
    }
    if (isOpened(group, editor)) {
        // special case: the locked group contains
        // the provided editor. in that case we do not want
        // to open the editor in any different group.
        return false;
    }
    // group is locked for this editor
    return true;
}
function isActive(group, editor) {
    if (!group.activeEditor) {
        return false;
    }
    return group.activeEditor.matches(editor);
}
function isOpened(group, editor) {
    for (const typedEditor of group.editors) {
        if (typedEditor.matches(editor)) {
            return true;
        }
    }
    return false;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yR3JvdXBGaW5kZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9hZHZpa2FyL0RvY3VtZW50cy9hcmNoaXRlY3QvYXJjaDIvQXJjaElERS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvZWRpdG9yL2NvbW1vbi9lZGl0b3JHcm91cEZpbmRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNuRyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQztBQUVoRixPQUFPLEVBQTBCLHdCQUF3QixFQUF1QixhQUFhLEVBQTJCLE1BQU0sMkJBQTJCLENBQUM7QUFFMUosT0FBTyxFQUE2QixpQ0FBaUMsRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBQzlILE9BQU8sRUFBRSxnQkFBZ0IsRUFBeUMsVUFBVSxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFjekcsTUFBTSxVQUFVLFNBQVMsQ0FBQyxRQUEwQixFQUFFLE1BQW9ELEVBQUUsY0FBMEM7SUFDckosTUFBTSxrQkFBa0IsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLG9CQUFvQixDQUFDLENBQUM7SUFDOUQsTUFBTSxvQkFBb0IsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLHFCQUFxQixDQUFDLENBQUM7SUFFakUsTUFBTSxLQUFLLEdBQUcsV0FBVyxDQUFDLE1BQU0sRUFBRSxjQUFjLEVBQUUsa0JBQWtCLEVBQUUsb0JBQW9CLENBQUMsQ0FBQztJQUM1RixJQUFJLEtBQUssWUFBWSxPQUFPLEVBQUUsQ0FBQztRQUM5QixPQUFPLEtBQUssQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxxQkFBcUIsQ0FBQyxLQUFLLEVBQUUsTUFBTSxFQUFFLGNBQWMsRUFBRSxrQkFBa0IsQ0FBQyxDQUFDLENBQUM7SUFDdEcs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