/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { mapLspKindToTerminalKind, TerminalCompletionItemKind } from './terminalCompletionItem.js';
import { Position } from '../../../../../editor/common/core/position.js';
export class LspCompletionProviderAddon extends Disposable {
    constructor(provider, textVirtualModel, lspTerminalModelContentProvider) {
        super();
        this.id = 'lsp';
        this.isBuiltin = true;
        this._provider = provider;
        this._textVirtualModel = textVirtualModel;
        this._lspTerminalModelContentProvider = lspTerminalModelContentProvider;
        this.triggerCharacters = provider.triggerCharacters ? [...provider.triggerCharacters, ' '] : [' '];
    }
    activate(terminal) {
        // console.log('activate');
    }
    async provideCompletions(value, cursorPosition, allowFallbackCompletions, token) {
        // Apply edit for non-executed current commandline --> Pretend we are typing in the real-document.
        this._lspTerminalModelContentProvider.trackPromptInputToVirtualFile(value);
        const textBeforeCursor = value.substring(0, cursorPosition);
        const lines = textBeforeCursor.split('\n');
        const column = lines[lines.length - 1].length + 1;
        // Get line from virtualDocument, not from terminal
        const lineNum = this._textVirtualModel.object.textEditorModel.getLineCount();
        const positionVirtualDocument = new Position(lineNum, column);
        const completions = [];
        if (this._provider && this._provider._debugDisplayName !== 'wordbasedCompletions') {
            const result = await this._provider.provideCompletionItems(this._textVirtualModel.object.textEditorModel, positionVirtualDocument, { triggerKind: 1 /* CompletionTriggerKind.TriggerCharacter */ }, token);
            for (const item of (result?.suggestions || [])) {
                // TODO: Support more terminalCompletionItemKind for [different LSP providers](https://github.com/microsoft/vscode/issues/249479)
                const convertedKind = item.kind ? mapLspKindToTerminalKind(item.kind) : TerminalCompletionItemKind.Method;
                const completionItemTemp = createCompletionItemPython(cursorPosition, textBeforeCursor, convertedKind, 'lspCompletionItem', undefined);
                const terminalCompletion = {
                    label: item.label,
                    provider: `lsp:${this._provider._debugDisplayName}`,
                    detail: item.detail,
                    documentation: item.documentation,
                    kind: convertedKind,
                    replacementIndex: completionItemTemp.replacementIndex,
                    replacementLength: completionItemTemp.replacementLength,
                };
                // Store unresolved item and provider for lazy resolution if needed
                if (this._provider.resolveCompletionItem && (!item.detail || !item.documentation)) {
                    terminalCompletion._unresolvedItem = item;
                    terminalCompletion._resolveProvider = this._provider;
                }
                completions.push(terminalCompletion);
            }
        }
        return completions;
    }
}
export function createCompletionItemPython(cursorPosition, prefix, kind, label, detail) {
    const endsWithDot = prefix.endsWith('.');
    const endsWithSpace = prefix.endsWith(' ');
    if (endsWithSpace) {
        // Case where user is triggering completion with space:
        // For example, typing `import  ` to request completion for list of modules
        // This is similar to completions we are used to seeing in upstream shell (such as typing `ls  ` inside bash).
        const lastWord = endsWithSpace ? '' : prefix.split(' ').at(-1) ?? '';
        return {
            label: label,
            detail: detail ?? detail ?? '',
            replacementIndex: cursorPosition - lastWord.length,
            replacementLength: lastWord.length,
            kind: kind ?? kind ?? TerminalCompletionItemKind.Method
        };
    }
    else {
        // Case where user is triggering completion with dot:
        // For example, typing `pathlib.` to request completion for list of methods, attributes from the pathlib module.
        const lastWord = endsWithDot ? '' : prefix.split('.').at(-1) ?? '';
        return {
            label,
            detail: detail ?? detail ?? '',
            replacementIndex: cursorPosition - lastWord.length,
            replacementLength: lastWord.length,
            kind: kind ?? kind ?? TerminalCompletionItemKind.Method
        };
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibHNwQ29tcGxldGlvblByb3ZpZGVyQWRkb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9hZHZpa2FyL0RvY3VtZW50cy9hcmNoaXRlY3QvYXJjaDIvQXJjaElERS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXJtaW5hbENvbnRyaWIvc3VnZ2VzdC9icm93c2VyL2xzcENvbXBsZXRpb25Qcm92aWRlckFkZG9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBRSxVQUFVLEVBQWMsTUFBTSx5Q0FBeUMsQ0FBQztBQUdqRixPQUFPLEVBQXVCLHdCQUF3QixFQUFFLDBCQUEwQixFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFFeEgsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLCtDQUErQyxDQUFDO0FBS3pFLE1BQU0sT0FBTywwQkFBMkIsU0FBUSxVQUFVO0lBUXpELFlBQ0MsUUFBZ0MsRUFDaEMsZ0JBQXNELEVBQ3RELCtCQUFnRTtRQUVoRSxLQUFLLEVBQUUsQ0FBQztRQVpBLE9BQUUsR0FBRyxLQUFLLENBQUM7UUFDWCxjQUFTLEdBQUcsSUFBSSxDQUFDO1FBWXpCLElBQUksQ0FBQyxTQUFTLEdBQUcsUUFBUSxDQUFDO1FBQzFCLElBQUksQ0FBQyxpQkFBaUIsR0FBRyxnQkFBZ0IsQ0FBQztRQUMxQyxJQUFJLENBQUMsZ0NBQWdDLEdBQUcsK0JBQStCLENBQUM7UUFDeEUsSUFBSSxDQUFDLGlCQUFpQixHQUFHLFFBQVEsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLFFBQVEsQ0FBQyxpQkFBaUIsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUNwRyxDQUFDO0lBRUQsUUFBUSxDQUFDLFFBQWtCO1FBQzFCLDJCQUEyQjtJQUM1QixDQUFDO0lBRUQsS0FBSyxDQUFDLGtCQUFrQixDQUFDLEtBQWEsRUFBRSxj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