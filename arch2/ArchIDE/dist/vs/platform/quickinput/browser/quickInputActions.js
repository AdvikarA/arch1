/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { isMacintosh } from '../../../base/common/platform.js';
import { localize } from '../../../nls.js';
import { ContextKeyExpr } from '../../contextkey/common/contextkey.js';
import { InputFocusedContext } from '../../contextkey/common/contextkeys.js';
import { KeybindingsRegistry } from '../../keybinding/common/keybindingsRegistry.js';
import { endOfQuickInputBoxContext, inQuickInputContext, quickInputTypeContextKeyValue } from './quickInput.js';
import { IQuickInputService, QuickPickFocus } from '../common/quickInput.js';
const defaultCommandAndKeybindingRule = {
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    when: ContextKeyExpr.and(ContextKeyExpr.or(ContextKeyExpr.equals(quickInputTypeContextKeyValue, "quickPick" /* QuickInputType.QuickPick */), ContextKeyExpr.equals(quickInputTypeContextKeyValue, "quickTree" /* QuickInputType.QuickTree */)), inQuickInputContext),
    metadata: { description: localize('quickPick', "Used while in the context of the quick pick. If you change one keybinding for this command, you should change all of the other keybindings (modifier variants) of this command as well.") }
};
function registerQuickPickCommandAndKeybindingRule(rule, options = {}) {
    KeybindingsRegistry.registerCommandAndKeybindingRule({
        ...defaultCommandAndKeybindingRule,
        ...rule,
        secondary: getSecondary(rule.primary, rule.secondary ?? [], options)
    });
}
const ctrlKeyMod = isMacintosh ? 256 /* KeyMod.WinCtrl */ : 2048 /* KeyMod.CtrlCmd */;
// This function will generate all the combinations of keybindings for the given primary keybinding
function getSecondary(primary, secondary, options = {}) {
    if (options.withAltMod) {
        secondary.push(512 /* KeyMod.Alt */ + primary);
    }
    if (options.withCtrlMod) {
        secondary.push(ctrlKeyMod + primary);
        if (options.withAltMod) {
            secondary.push(512 /* KeyMod.Alt */ + ctrlKeyMod + primary);
        }
    }
    if (options.withCmdMod && isMacintosh) {
        secondary.push(2048 /* KeyMod.CtrlCmd */ + primary);
        if (options.withCtrlMod) {
            secondary.push(2048 /* KeyMod.CtrlCmd */ + 256 /* KeyMod.WinCtrl */ + primary);
        }
        if (options.withAltMod) {
            secondary.push(2048 /* KeyMod.CtrlCmd */ + 512 /* KeyMod.Alt */ + primary);
            if (options.withCtrlMod) {
                secondary.push(2048 /* KeyMod.CtrlCmd */ + 512 /* KeyMod.Alt */ + 256 /* KeyMod.WinCtrl */ + primary);
            }
        }
    }
    return secondary;
}
//#region Navigation
function focusHandler(focus, focusOnQuickNatigate) {
    return accessor => {
        // Assuming this is a quick pick due to above when clause
        const currentQuickPick = accessor.get(IQuickInputService).currentQuickInput;
        if (!currentQuickPick) {
            return;
        }
        if (focusOnQuickNatigate && currentQuickPick.quickNavigate) {
            return currentQuickPick.focus(focusOnQuickNatigate);
        }
        return currentQuickPick.focus(focus);
    };
}
registerQuickPickCommandAndKeybindingRule({ id: 'quickInput.pageNext', primary: 12 /* KeyCode.PageDown */, handler: focusHandler(QuickPickFocus.NextPage) }, { withAltMod: true, withCtrlMod: true, withCmdMod: true });
registerQuickPickCommandAndKeybindingRule({ id: 'quickInput.pagePrevious', primary: 11 /* KeyCode.PageUp */, handler: focusHandler(QuickPickFocus.PreviousPage) }, { withAltMod: true, withCtrlMod: true, withCmdMod: true });
registerQuickPickCommandAndKeybindingRule({ id: 'quickInput.first', primary: ctrlKeyMod + 14 /* KeyCode.Home */, handler: focusHandler(QuickPickFocus.First) }, { withAltMod: true, withCmdMod: true });
registerQuickPickCommandAndKeybindingRule({ id: 'quickInput.last', primary: ctrlKeyMod + 13 /* KeyCode.End */, handler: focusHandler(QuickPickFocus.Last) }, { withAltMod: true, withCmdMod: true });
registerQuickPickCommandAndKeybindingRule({ id: 'quickInput.next', primary: 18 /* KeyCode.DownArrow */, handler: focusHandler(QuickPickFocus.Next) }, { withCtrlMod: true });
registerQuickPickCommandAndKeybindingRule({ id: 'quickInput.previous', primary: 16 /* KeyCode.UpArrow */, handler: focusHandler(QuickPickFocus.Previous) }, { withCtrlMod: true });
// The next & previous separator commands are interesting because if we are in quick access mode, we are already holding a modifier key down.
// In this case, we want that modifier key+up/down to navigate to the next/previous item, not the next/previous separator.
// To handle this, we have a separate command for navigating to the next/previous separator when we are not in quick access mode.
// If, however, we are in quick access mode, and you hold down an additional modifier key, we will navigate to the next/previous separator.
const nextSeparatorFallbackDesc = localize('quickInput.nextSeparatorWithQuickAccessFallback', "If we're in quick access mode, this will navigate to the next item. If we are not in quick access mode, this will navigate to the next separator.");
const prevSeparatorFallbackDesc = localize('quickInput.previousSeparatorWithQuickAccessFallback', "If we're in quick access mode, this will navigate to the previous item. If we are not in quick access mode, this will navigate to the previous separator.");
if (isMacintosh) {
    registerQuickPickCommandAndKeybindingRule({
        id: 'quickInput.nextSeparatorWithQuickAccessFallback',
        primary: 2048 /* KeyMod.CtrlCmd */ + 18 /* KeyCode.DownArrow */,
        handler: focusHandler(QuickPickFocus.NextSeparator, QuickPickFocus.Next),
        metadata: { description: nextSeparatorFallbackDesc }
    });
    registerQuickPickCommandAndKeybindingRule({
        id: 'quickInput.nextSeparator',
        primary: 2048 /* KeyMod.CtrlCmd */ + 512 /* KeyMod.Alt */ + 18 /* KeyCode.DownArrow */,
        // Since macOS has the cmd key as the primary modifier, we need to add this additional
        // keybinding to capture cmd+ctrl+upArrow
        secondary: [2048 /* KeyMod.CtrlCmd */ + 256 /* KeyMod.WinCtrl */ + 18 /* KeyCode.DownArrow */],
        handler: focusHandler(QuickPickFocus.NextSeparator)
    }, { withCtrlMod: true });
    registerQuickPickCommandAndKeybindingRule({
        id: 'quickInput.previousSeparatorWithQuickAccessFallback',
        primary: 2048 /* KeyMod.CtrlCmd */ + 16 /* KeyCode.UpArrow */,
        handler: focusHandler(QuickPickFocus.PreviousSeparator, QuickPickFocus.Previous),
        metadata: { description: prevSeparatorFallbackDesc }
    });
    registerQuickPickCommandAndKeybindingRule({
        id: 'quickInput.previousSeparator',
        primary: 2048 /* KeyMod.CtrlCmd */ + 512 /* KeyMod.Alt */ + 16 /* KeyCode.UpArrow */,
        // Since macOS has the cmd key as the primary modifier, we need to add this additional
        // keybinding to capture cmd+ctrl+upArrow
        secondary: [2048 /* KeyMod.CtrlCmd */ + 256 /* KeyMod.WinCtrl */ + 16 /* KeyCode.UpArrow */],
        handler: focusHandler(QuickPickFocus.PreviousSeparator)
    }, { withCtrlMod: true });
}
else {
    registerQuickPickCommandAndKeybindingRule({
        id: 'quickInput.nextSeparatorWithQuickAccessFallback',
        primary: 512 /* KeyMod.Alt */ + 18 /* KeyCode.DownArrow */,
        handler: focusHandler(QuickPickFocus.NextSeparator, QuickPickFocus.Next),
        metadata: { description: nextSeparatorFallbackDesc }
    });
    registerQuickPickCommandAndKeybindingRule({
        id: 'quickInput.nextSeparator',
        primary: 2048 /* KeyMod.CtrlCmd */ + 512 /* KeyMod.Alt */ + 18 /* KeyCode.DownArrow */,
        handler: focusHandler(QuickPickFocus.NextSeparator)
    });
    registerQuickPickCommandAndKeybindingRule({
        id: 'quickInput.previousSeparatorWithQuickAccessFallback',
        primary: 512 /* KeyMod.Alt */ + 16 /* KeyCode.UpArrow */,
        handler: focusHandler(QuickPickFocus.PreviousSeparator, QuickPickFocus.Previous),
        metadata: { description: prevSeparatorFallbackDesc }
    });
    registerQuickPickCommandAndKeybindingRule({
        id: 'quickInput.previousSeparator',
        primary: 2048 /* KeyMod.CtrlCmd */ + 512 /* KeyMod.Alt */ + 16 /* KeyCode.UpArrow */,
        handler: focusHandler(QuickPickFocus.PreviousSeparator)
    });
}
//#endregion
//#region Accept
registerQuickPickCommandAndKeybindingRule({
    id: 'quickInput.acceptInBackground',
    // If we are in the quick pick but the input box is not focused or our cursor is at the end of the input box
    when: ContextKeyExpr.and(inQuickInputContext, ContextKeyExpr.equals(quickInputTypeContextKeyValue, "quickPick" /* QuickInputType.QuickPick */), ContextKeyExpr.or(InputFocusedContext.negate(), endOfQuickInputBoxContext)),
    primary: 17 /* KeyCode.RightArrow */,
    // Need a little extra weight to ensure this keybinding is preferred over the default cmd+alt+right arrow keybinding
    // https://github.com/microsoft/vscode/blob/1451e4fbbbf074a4355cc537c35b547b80ce1c52/src/vs/workbench/browser/parts/editor/editorActions.ts#L1178-L1195
    weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 50,
    handler: (accessor) => {
        const currentQuickPick = accessor.get(IQuickInputService).currentQuickInput;
        currentQuickPick?.accept(true);
    },
}, { withAltMod: true, withCtrlMod: true, withCmdMod: true });
//#region Toggle Hover
registerQuickPickCommandAndKeybindingRule({
    id: 'quickInput.toggleHover',
    primary: ctrlKeyMod | 10 /* KeyCode.Space */,
    handler: accessor => {
        const quickInputService = accessor.get(IQuickInputService);
        quickInputService.toggleHover();
    }
});
//#endregion
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicXVpY2tJbnB1dEFjdGlvbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9hZHZpa2FyL0RvY3VtZW50cy9hcmNoaXRlY3QvYXJjaDIvQXJjaElERS9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9xdWlja2lucHV0L2Jyb3dzZXIvcXVpY2tJbnB1dEFjdGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBRS9ELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQztBQUUzQyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDdkUsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDN0UsT0FBTyxFQUErQyxtQkFBbUIsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQ2xJLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxtQkFBbUIsRUFBRSw2QkFBNkIsRUFBRSxNQUFNLGlCQUFpQixDQUFDO0FBQ2hILE9BQU8sRUFBRSxrQkFBa0IsRUFBMEMsY0FBYyxFQUFFLE1BQU0seUJBQXlCLENBQUM7QUFFckgsTUFBTSwrQkFBK0IsR0FBRztJQUN2QyxNQUFNLDZDQUFtQztJQUN6QyxJQUFJLEVBQUUsY0FBYyxDQUFDLEdBQUcsQ0FDdkIsY0FBYyxDQUFDLEVBQUUsQ0FDaEIsY0FBYyxDQUFDLE1BQU0sQ0FBQyw2QkFBNkIsNkNBQTJCLEVBQzlFLGNBQWMsQ0FBQyxNQUFNLENBQUMsNkJBQTZCLDZDQUEyQixDQUM5RSxFQUNELG1CQUFtQixDQUNuQjtJQUNELFFBQVEsRUFBRSxFQUFFLFdBQVcsRUFBRSxRQUFRLENBQUMsV0FBVyxFQUFFLHlMQUF5TCxDQUFDLEVBQUU7Q0FDM08sQ0FBQztBQUNGLFNBQVMseUNBQXlDLENBQUMsSUFBZ0UsRUFBRSxVQUFpRixFQUFFO0lBQ3ZNLG1CQUFtQixD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