var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var LspTerminalModelContentProvider_1;
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Disposable, MutableDisposable } from '../../../../../base/common/lifecycle.js';
import { IModelService } from '../../../../../editor/common/services/model.js';
import { ILanguageService } from '../../../../../editor/common/languages/language.js';
import { ITextModelService } from '../../../../../editor/common/services/resolverService.js';
import { URI } from '../../../../../base/common/uri.js';
import { Schemas } from '../../../../../base/common/network.js';
import { PYTHON_LANGUAGE_ID, VSCODE_LSP_TERMINAL_PROMPT_TRACKER } from './lspTerminalUtil.js';
let LspTerminalModelContentProvider = class LspTerminalModelContentProvider extends Disposable {
    static { LspTerminalModelContentProvider_1 = this; }
    static { this.scheme = Schemas.vscodeTerminal; }
    constructor(capabilityStore, terminalId, virtualTerminalDocument, shellType, textModelService, _modelService, _languageService) {
        super();
        this._modelService = _modelService;
        this._languageService = _languageService;
        this._onCommandFinishedListener = this._register(new MutableDisposable());
        this._register(textModelService.registerTextModelContentProvider(LspTerminalModelContentProvider_1.scheme, this));
        this._capabilitiesStore = capabilityStore;
        this._commandDetection = this._capabilitiesStore.get(2 /* TerminalCapability.CommandDetection */);
        this._registerTerminalCommandFinishedListener();
        this._virtualTerminalDocumentUri = virtualTerminalDocument;
        this._shellType = shellType;
    }
    // Listens to onDidChangeShellType event from `terminal.suggest.contribution.ts`
    shellTypeChanged(shellType) {
        this._shellType = shellType;
    }
    /**
     * Sets or updates content for a terminal virtual document.
     * This is when user has executed succesful command in terminal.
     * Transfer the content to virtual document, and relocate delimiter to get terminal prompt ready for next prompt.
     */
    setContent(content) {
        const model = this._modelService.getModel(this._virtualTerminalDocumentUri);
        // Trailing coming from Python itself shouldn't be included in the REPL.
        if (content !== 'exit()' && this._shellType === "python" /* GeneralShellType.Python */) {
            if (model) {
                const existingContent = model.getValue();
                if (existingContent === '') {
                    model.setValue(VSCODE_LSP_TERMINAL_PROMPT_TRACKER);
                }
                else {
                    // If we are appending to existing content, remove delimiter, attach new content, and re-add delimiter
                    const delimiterIndex = existingContent.lastIndexOf(VSCODE_LSP_TERMINAL_PROMPT_TRACKER);
                    const sanitizedExistingContent = delimiterIndex !== -1 ?
                        existingContent.substring(0, delimiterIndex) :
                        existingContent;
                    const newContent = sanitizedExistingContent + '\n' + content + '\n' + VSCODE_LSP_TERMINAL_PROMPT_TRACKER;
                    model.setValue(newContent);
                }
            }
        }
    }
    /**
     * Real-time conversion of terminal input to virtual document happens here.
     * This is when user types in terminal, and we want to track the input.
     * We want to track the input and update the virtual document.
     * Note: This is for non-executed command.
    */
    trackPromptInputToVirtualFile(content) {
        this._commandDetection = this._capabilitiesStore.get(2 /* TerminalCapability.CommandDetection */);
        const model = this._modelService.getModel(this._virtualTerminalDocumentUri);
        if (content !== 'exit()' && this._shellType === "python" /* GeneralShellType.Python */) {
            if (model) {
                const existingContent = model.getValue();
                const delimiterIndex = existingContent.lastIndexOf(VSCODE_LSP_TERMINAL_PROMPT_TRACKER);
                // Keep content only up to delimiter
                const sanitizedExistingContent = delimiterIndex !== -1 ?
                    existingContent.substring(0, delimiterIndex) :
                    existingContent;
                // Combine base content with new content
                const newContent = sanitizedExistingContent + VSCODE_LSP_TERMINAL_PROMPT_TRACKER + content;
                model.setValue(newContent);
            }
        }
    }
    _registerTerminalCommandFinishedListener() {
        const attachListener = () => {
            if (this._onCommandFinishedListener.value) {
                return;
            }
            // Inconsistent repro: Covering case where commandDetection is available but onCommandFinished becomes available later
            if (this._commandDetection && this._commandDetection.onCommandFinished) {
                this._onCommandFinishedListener.value = this._register(this._commandDetection.onCommandFinished((e) => {
                    if (e.exitCode === 0 && this._shellType === "python" /* GeneralShellType.Python */) {
                        this.setContent(e.command);
                    }
                }));
            }
        };
        attachListener();
        // Listen to onDidAddCapabilityType because command detection is not available until later
        this._register(this._capabilitiesStore.onDidAddCapabilityType(e => {
            if (e === 2 /* TerminalCapability.CommandDetection */) {
                this._commandDetection = this._capabilitiesStore.get(2 /* TerminalCapability.CommandDetection */);
                attachListener();
            }
        }));
    }
    // TODO: Adapt to support non-python virtual document for non-python REPLs.
    async provideTextContent(resource) {
        const existing = this._modelService.getModel(resource);
        if (existing && !existing.isDisposed()) {
            return existing;
        }
        const extension = resource.path.split('.').pop();
        let languageId = undefined;
        if (extension) {
            languageId = this._languageService.getLanguageIdByLanguageName(extension);
            if (!languageId) {
                switch (extension) {
                    case 'py':
                        languageId = PYTHON_LANGUAGE_ID;
                        break;
                    // case 'ps1': languageId = 'powershell'; break;
                    // case 'js': languageId = 'javascript'; break;
                    // case 'ts': languageId = 'typescript'; break; etc...
                }
            }
        }
        const languageSelection = languageId ?
            this._languageService.createById(languageId) :
            this._languageService.createById('plaintext');
        return this._modelService.createModel('', languageSelection, resource, false);
    }
};
LspTerminalModelContentProvider = LspTerminalModelContentProvider_1 = __decorate([
    __param(4, ITextModelService),
    __param(5, IModelService),
    __param(6, ILanguageService)
], LspTerminalModelContentProvider);
export { LspTerminalModelContentProvider };
/**
 * Creates a terminal language virtual URI.
 */
// TODO: Make this [OS generic](https://github.com/microsoft/vscode/issues/249477)
export function createTerminalLanguageVirtualUri(terminalId, languageExtension) {
    return URI.from({
        scheme: Schemas.vscodeTerminal,
        path: `/terminal${terminalId}.${languageExtension}`,
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibHNwVGVybWluYWxNb2RlbENvbnRlbnRQcm92aWRlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL2FkdmlrYXIvRG9jdW1lbnRzL2FyY2hpdGVjdC9hcmNoMi9BcmNoSURFL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlcm1pbmFsQ29udHJpYi9zdWdnZXN0L2Jyb3dzZXIvbHNwVGVybWluYWxNb2RlbENvbnRlbnRQcm92aWRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7O0FBQUE7OztnR0FHZ0c7QUFDaEcsT0FBTyxFQUFFLFVBQVUsRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ3hGLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUMvRSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQztBQUN0RixPQUFPLEVBQTZCLGlCQUFpQixFQUFFLE1BQU0sMERBQTBELENBQUM7QUFDeEgsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBRXhELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUdoRSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsa0NBQWtDLEVBQUUsTUFBTSxzQkFBc0IsQ0FBQztBQU92RixJQUFNLCtCQUErQixHQUFyQyxNQUFNLCtCQUFnQyxTQUFRLFVBQVU7O2FBQzlDLFdBQU0sR0FBRyxPQUFPLENBQUMsY0FBYyxBQUF6QixDQUEwQjtJQU9oRCxZQUNDLGVBQXlDLEVBQ3pDLFVBQWtCLEVBQ2xCLHVCQUE0QixFQUM1QixTQUF3QyxFQUNyQixnQkFBbUMsRUFDdkMsYUFBNkMsRUFDMUMsZ0JBQW1EO1FBR3JFLEtBQUssRUFBRSxDQUFDO1FBSndCLGtCQUFhLEdBQWIsYUFBYSxDQUFlO1FBQ3pCLHFCQUFnQixHQUFoQixnQkFBZ0IsQ0FBa0I7UUFUckQsK0JBQTBCLEdBQUcsSUFBSSxD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