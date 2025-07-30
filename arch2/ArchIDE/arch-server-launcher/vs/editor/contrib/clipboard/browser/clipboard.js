/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as browser from '../../../../base/browser/browser.js';
import { getActiveDocument, getActiveWindow } from '../../../../base/browser/dom.js';
import * as platform from '../../../../base/common/platform.js';
import { StopWatch } from '../../../../base/common/stopwatch.js';
import * as nls from '../../../../nls.js';
import { MenuId, MenuRegistry } from '../../../../platform/actions/common/actions.js';
import { IClipboardService } from '../../../../platform/clipboard/common/clipboardService.js';
import { ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { CopyOptions, InMemoryClipboardMetadataManager } from '../../../browser/controller/editContext/clipboardUtils.js';
import { NativeEditContextRegistry } from '../../../browser/controller/editContext/native/nativeEditContextRegistry.js';
import { EditorAction, MultiCommand, registerEditorAction } from '../../../browser/editorExtensions.js';
import { ICodeEditorService } from '../../../browser/services/codeEditorService.js';
import { EditorContextKeys } from '../../../common/editorContextKeys.js';
import { CopyPasteController } from '../../dropOrPasteInto/browser/copyPasteController.js';
const CLIPBOARD_CONTEXT_MENU_GROUP = '9_cutcopypaste';
const supportsCut = (platform.isNative || document.queryCommandSupported('cut'));
const supportsCopy = (platform.isNative || document.queryCommandSupported('copy'));
// Firefox only supports navigator.clipboard.readText() in browser extensions.
// See https://developer.mozilla.org/en-US/docs/Web/API/Clipboard/readText#Browser_compatibility
// When loading over http, navigator.clipboard can be undefined. See https://github.com/microsoft/monaco-editor/issues/2313
const supportsPaste = (typeof navigator.clipboard === 'undefined' || browser.isFirefox) ? document.queryCommandSupported('paste') : true;
function registerCommand(command) {
    command.register();
    return command;
}
export const CutAction = supportsCut ? registerCommand(new MultiCommand({
    id: 'editor.action.clipboardCutAction',
    precondition: undefined,
    kbOpts: (
    // Do not bind cut keybindings in the browser,
    // since browsers do that for us and it avoids security prompts
    platform.isNative ? {
        primary: 2048 /* KeyMod.CtrlCmd */ | 54 /* KeyCode.KeyX */,
        win: { primary: 2048 /* KeyMod.CtrlCmd */ | 54 /* KeyCode.KeyX */, secondary: [1024 /* KeyMod.Shift */ | 20 /* KeyCode.Delete */] },
        weight: 100 /* KeybindingWeight.EditorContrib */
    } : undefined),
    menuOpts: [{
            menuId: MenuId.MenubarEditMenu,
            group: '2_ccp',
            title: nls.localize({ key: 'miCut', comment: ['&& denotes a mnemonic'] }, "Cu&&t"),
            order: 1
        }, {
            menuId: MenuId.EditorContext,
            group: CLIPBOARD_CONTEXT_MENU_GROUP,
            title: nls.localize('actions.clipboard.cutLabel', "Cut"),
            when: EditorContextKeys.writable,
            order: 1,
        }, {
            menuId: MenuId.CommandPalette,
            group: '',
            title: nls.localize('actions.clipboard.cutLabel', "Cut"),
            order: 1
        }, {
            menuId: MenuId.SimpleEditorContext,
            group: CLIPBOARD_CONTEXT_MENU_GROUP,
            title: nls.localize('actions.clipboard.cutLabel', "Cut"),
            when: EditorContextKeys.writable,
            order: 1,
        }]
})) : undefined;
export const CopyAction = supportsCopy ? registerCommand(new MultiCommand({
    id: 'editor.action.clipboardCopyAction',
    precondition: undefined,
    kbOpts: (
    // Do not bind copy keybindings in the browser,
    // since browsers do that for us and it avoids security prompts
    platform.isNative ? {
        primary: 2048 /* KeyMod.CtrlCmd */ | 33 /* KeyCode.KeyC */,
        win: { primary: 2048 /* KeyMod.CtrlCmd */ | 33 /* KeyCode.KeyC */, secondary: [2048 /* KeyMod.CtrlCmd */ | 19 /* KeyCode.Insert */] },
        weight: 100 /* KeybindingWeight.EditorContrib */
    } : undefined),
    menuOpts: [{
            menuId: MenuId.MenubarEditMenu,
            group: '2_ccp',
            title: nls.localize({ key: 'miCopy', comment: ['&& denotes a mnemonic'] }, "&&Copy"),
            order: 2
        }, {
            menuId: MenuId.EditorContext,
            group: CLIPBOARD_CONTEXT_MENU_GROUP,
            title: nls.localize('actions.clipboard.copyLabel', "Copy"),
            order: 2,
        }, {
            menuId: MenuId.CommandPalette,
            group: '',
            title: nls.localize('actions.clipboard.copyLabel', "Copy"),
            order: 1
        }, {
            menuId: MenuId.SimpleEditorContext,
            group: CLIPBOARD_CONTEXT_MENU_GROUP,
            title: nls.localize('actions.clipboard.copyLabel', "Copy"),
            order: 2,
        }]
})) : undefined;
MenuRegistry.appendMenuItem(MenuId.MenubarEditMenu, { submenu: MenuId.MenubarCopy, title: nls.localize2('copy as', "Copy As"), group: '2_ccp', order: 3 });
MenuRegistry.appendMenuItem(MenuId.EditorContext, { submenu: MenuId.EditorContextCopy, title: nls.localize2('copy as', "Copy As"), group: CLIPBOARD_CONTEXT_MENU_GROUP, order: 3 });
MenuRegistry.appendMenuItem(MenuId.EditorContext, { submenu: MenuId.EditorContextShare, title: nls.localize2('share', "Share"), group: '11_share', order: -1, when: ContextKeyExpr.and(ContextKeyExpr.notEquals('resourceScheme', 'output'), EditorContextKeys.editorTextFocus) });
MenuRegistry.appendMenuItem(MenuId.ExplorerContext, { submenu: MenuId.ExplorerContextShare, title: nls.localize2('share', "Share"), group: '11_share', order: -1 });
export const PasteAction = supportsPaste ? registerCommand(new MultiCommand({
    id: 'editor.action.clipboardPasteAction',
    precondition: undefined,
    kbOpts: (
    // Do not bind paste keybindings in the browser,
    // since browsers do that for us and it avoids security prompts
    platform.isNative ? {
        primary: 2048 /* KeyMod.CtrlCmd */ | 52 /* KeyCode.KeyV */,
        win: { primary: 2048 /* KeyMod.CtrlCmd */ | 52 /* KeyCode.KeyV */, secondary: [1024 /* KeyMod.Shift */ | 19 /* KeyCode.Insert */] },
        linux: { primary: 2048 /* KeyMod.CtrlCmd */ | 52 /* KeyCode.KeyV */, secondary: [1024 /* KeyMod.Shift */ | 19 /* KeyCode.Insert */] },
        weight: 100 /* KeybindingWeight.EditorContrib */
    } : undefined),
    menuOpts: [{
            menuId: MenuId.MenubarEditMenu,
            group: '2_ccp',
            title: nls.localize({ key: 'miPaste', comment: ['&& denotes a mnemonic'] }, "&&Paste"),
            order: 4
        }, {
            menuId: MenuId.EditorContext,
            group: CLIPBOARD_CONTEXT_MENU_GROUP,
            title: nls.localize('actions.clipboard.pasteLabel', "Paste"),
            when: EditorContextKeys.writable,
            order: 4,
        }, {
            menuId: MenuId.CommandPalette,
            group: '',
            title: nls.localize('actions.clipboard.pasteLabel', "Paste"),
            order: 1
        }, {
            menuId: MenuId.SimpleEditorContext,
            group: CLIPBOARD_CONTEXT_MENU_GROUP,
            title: nls.localize('actions.clipboard.pasteLabel', "Paste"),
            when: EditorContextKeys.writable,
            order: 4,
        }]
})) : undefined;
class ExecCommandCopyWithSyntaxHighlightingAction extends EditorAction {
    constructor() {
        super({
            id: 'editor.action.clipboardCopyWithSyntaxHighlightingAction',
            label: nls.localize2('actions.clipboard.copyWithSyntaxHighlightingLabel', "Copy with Syntax Highlighting"),
            precondition: undefined,
            kbOpts: {
                kbExpr: EditorContextKeys.textInputFocus,
                primary: 0,
                weight: 100 /* KeybindingWeight.EditorContrib */
            }
        });
    }
    run(accessor, editor) {
        if (!editor.hasModel()) {
            return;
        }
        const emptySelectionClipboard = editor.getOption(45 /* EditorOption.emptySelectionClipboard */);
        if (!emptySelectionClipboard && editor.getSelection().isEmpty()) {
            return;
        }
        CopyOptions.forceCopyWithSyntaxHighlighting = true;
        editor.focus();
        editor.getContainerDomNode().ownerDocument.execCommand('copy');
        CopyOptions.forceCopyWithSyntaxHighlighting = false;
    }
}
function registerExecCommandImpl(target, browserCommand) {
    if (!target) {
        return;
    }
    // 1. handle case when focus is in editor.
    target.addImplementation(10000, 'code-editor', (accessor, args) => {
        // Only if editor text focus (i.e. not if editor has widget focus).
        const focusedEditor = accessor.get(ICodeEditorService).getFocusedCodeEditor();
        if (focusedEditor && focusedEditor.hasTextFocus()) {
            // Do not execute if there is no selection and empty selection clipboard is off
            const emptySelectionClipboard = focusedEditor.getOption(45 /* EditorOption.emptySelectionClipboard */);
            const selection = focusedEditor.getSelection();
            if (selection && selection.isEmpty() && !emptySelectionClipboard) {
                return true;
            }
            // TODO this is very ugly. The entire copy/paste/cut system needs a complete refactoring.
            if (focusedEditor.getOption(169 /* EditorOption.effectiveEditContext */) && browserCommand === 'cut') {
                // execCommand(copy) works for edit context, but not execCommand(cut).
                focusedEditor.getContainerDomNode().ownerDocument.execCommand('copy');
                focusedEditor.trigger(undefined, "cut" /* Handler.Cut */, undefined);
            }
            else {
                focusedEditor.getContainerDomNode().ownerDocument.execCommand(browserCommand);
            }
            return true;
        }
        return false;
    });
    // 2. (default) handle case when focus is somewhere else.
    target.addImplementation(0, 'generic-dom', (accessor, args) => {
        getActiveDocument().execCommand(browserCommand);
        return true;
    });
}
registerExecCommandImpl(CutAction, 'cut');
registerExecCommandImpl(CopyAction, 'copy');
if (PasteAction) {
    // 1. Paste: handle case when focus is in editor.
    PasteAction.addImplementation(10000, 'code-editor', (accessor, args) => {
        const codeEditorService = accessor.get(ICodeEditorService);
        const clipboardService = accessor.get(IClipboardService);
        const telemetryService = accessor.get(ITelemetryService);
        const productService = accessor.get(IProductService);
        // Only if editor text focus (i.e. not if editor has widget focus).
        const focusedEditor = codeEditorService.getFocusedCodeEditor();
        if (focusedEditor && focusedEditor.hasModel() && focusedEditor.hasTextFocus()) {
            // execCommand(paste) does not work with edit context
            const editContextEnabled = focusedEditor.getOption(169 /* EditorOption.effectiveEditContext */);
            if (editContextEnabled) {
                const nativeEditContext = NativeEditContextRegistry.get(focusedEditor.getId());
                if (nativeEditContext) {
                    nativeEditContext.onWillPaste();
                }
            }
            const sw = StopWatch.create(true);
            const triggerPaste = clipboardService.triggerPaste(getActiveWindow().vscodeWindowId);
            if (triggerPaste) {
                return triggerPaste.then(async () => {
                    if (productService.quality !== 'stable') {
                        const duration = sw.elapsed();
                        telemetryService.publicLog2('editorAsyncPaste', { duration });
                    }
                    return CopyPasteController.get(focusedEditor)?.finishedPaste() ?? Promise.resolve();
                });
            }
            if (platform.isWeb) {
                // Use the clipboard service if document.execCommand('paste') was not successful
                return (async () => {
                    const clipboardText = await clipboardService.readText();
                    if (clipboardText !== '') {
                        const metadata = InMemoryClipboardMetadataManager.INSTANCE.get(clipboardText);
                        let pasteOnNewLine = false;
                        let multicursorText = null;
                        let mode = null;
                        if (metadata) {
                            pasteOnNewLine = (focusedEditor.getOption(45 /* EditorOption.emptySelectionClipboard */) && !!metadata.isFromEmptySelection);
                            multicursorText = (typeof metadata.multicursorText !== 'undefined' ? metadata.multicursorText : null);
                            mode = metadata.mode;
                        }
                        focusedEditor.trigger('keyboard', "paste" /* Handler.Paste */, {
                            text: clipboardText,
                            pasteOnNewLine,
                            multicursorText,
                            mode
                        });
                    }
                })();
            }
            return true;
        }
        return false;
    });
    // 2. Paste: (default) handle case when focus is somewhere else.
    PasteAction.addImplementation(0, 'generic-dom', (accessor, args) => {
        const triggerPaste = accessor.get(IClipboardService).triggerPaste(getActiveWindow().vscodeWindowId);
        return triggerPaste ?? false;
    });
}
if (supportsCopy) {
    registerEditorAction(ExecCommandCopyWithSyntaxHighlightingAction);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpcGJvYXJkLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvYWR2aWthci9Eb2N1bWVudHMvYXJjaGl0ZWN0L2FyY2gyL0FyY2hJREUvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvY2xpcGJvYXJkL2Jyb3dzZXIvY2xpcGJvYXJkLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxPQUFPLE1BQU0scUNBQXFDLENBQUM7QUFDL0QsT0FBTyxFQUFFLGlCQUFpQixFQUFFLGVBQWUsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBRXJGLE9BQU8sS0FBSyxRQUFRLE1BQU0scUNBQXFDLENBQUM7QUFDaEUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2pFLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUM7QUFDMUMsT0FBTyxFQUFFLE1BQU0sRUFBRSxZQUFZLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUN0RixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSwyREFBMkQsQ0FBQztBQUM5RixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFHdEYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHVEQUF1RCxDQUFDO0FBQ3hGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG9EQUFvRCxDQUFDO0FBQ3ZGLE9BQU8sRUFBRSxXQUFXLEVBQUUsZ0NBQWdDLEVBQUUsTUFBTSwyREFBMkQsQ0FBQztBQUMxSCxPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSw2RUFBNkUsQ0FBQztBQUV4SCxPQUFPLEVBQVcsWUFBWSxFQUFFLFlBQVksRUFBRSxvQkFBb0IsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2pILE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBR3BGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHNDQUFz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