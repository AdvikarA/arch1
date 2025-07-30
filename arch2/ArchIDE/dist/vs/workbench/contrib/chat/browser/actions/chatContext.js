var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { CancellationToken } from '../../../../../base/common/cancellation.js';
import { Codicon } from '../../../../../base/common/codicons.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { isElectron } from '../../../../../base/common/platform.js';
import { dirname } from '../../../../../base/common/resources.js';
import { ThemeIcon } from '../../../../../base/common/themables.js';
import { localize } from '../../../../../nls.js';
import { IClipboardService } from '../../../../../platform/clipboard/common/clipboardService.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { ILabelService } from '../../../../../platform/label/common/label.js';
import { EditorResourceAccessor, SideBySideEditor } from '../../../../common/editor.js';
import { DiffEditorInput } from '../../../../common/editor/diffEditorInput.js';
import { IEditorService } from '../../../../services/editor/common/editorService.js';
import { IHostService } from '../../../../services/host/browser/host.js';
import { UntitledTextEditorInput } from '../../../../services/untitled/common/untitledTextEditorInput.js';
import { FileEditorInput } from '../../../files/browser/editors/fileEditorInput.js';
import { NotebookEditorInput } from '../../../notebook/common/notebookEditorInput.js';
import { IChatContextPickService } from '../chatContextPickService.js';
import { IChatEditingService } from '../../common/chatEditingService.js';
import { ToolDataSource, ToolSet } from '../../common/languageModelToolsService.js';
import { imageToHash, isImage } from '../chatPasteProviders.js';
import { convertBufferToScreenshotVariable } from '../contrib/screenshot.js';
import { ChatInstructionsPickerPick } from '../promptSyntax/attachInstructionsAction.js';
let ChatContextContributions = class ChatContextContributions extends Disposable {
    static { this.ID = 'chat.contextContributions'; }
    constructor(instantiationService, contextPickService) {
        super();
        // ###############################################################################################
        //
        // Default context picks/values which are "native" to chat. This is NOT the complete list
        // and feature area specific context, like for notebooks, problems, etc, should be contributed
        // by the feature area.
        //
        // ###############################################################################################
        this._store.add(contextPickService.registerChatContextItem(instantiationService.createInstance(ToolsContextPickerPick)));
        this._store.add(contextPickService.registerChatContextItem(instantiationService.createInstance(ChatInstructionsPickerPick)));
        this._store.add(contextPickService.registerChatContextItem(instantiationService.createInstance(OpenEditorContextValuePick)));
        this._store.add(contextPickService.registerChatContextItem(instantiationService.createInstance(RelatedFilesContextPickerPick)));
        this._store.add(contextPickService.registerChatContextItem(instantiationService.createInstance(ClipboardImageContextValuePick)));
        this._store.add(contextPickService.registerChatContextItem(instantiationService.createInstance(ScreenshotContextValuePick)));
    }
};
ChatContextContributions = __decorate([
    __param(0, IInstantiationService),
    __param(1, IChatContextPickService)
], ChatContextContributions);
export { ChatContextContributions };
class ToolsContextPickerPick {
    constructor() {
        this.type = 'pickerPick';
        this.label = localize('chatContext.tools', 'Tools...');
        this.icon = Codicon.tools;
        this.ordinal = -500;
    }
    asPicker(widget) {
        const items = [];
        for (const entry of widget.input.selectedToolsModel.entries.get()) {
            if (entry instanceof ToolSet) {
                items.push({
                    toolInfo: ToolDataSource.classify(entry.source),
                    label: entry.referenceName,
                    description: entry.description,
                    asAttachment: () => this._asToolSetAttachment(entry)
                });
            }
            else {
                items.push({
                    toolInfo: ToolDataSource.classify(entry.source),
                    label: entry.toolReferenceName ?? entry.displayName,
                    description: entry.userDescription ?? entry.modelDescription,
                    asAttachment: () => this._asToolAttachment(entry)
                });
            }
        }
        items.sort((a, b) => {
            let res = a.toolInfo.ordinal - b.toolInfo.ordinal;
            if (res === 0) {
                res = a.toolInfo.label.localeCompare(b.toolInfo.label);
            }
            if (res === 0) {
                res = a.label.localeCompare(b.label);
            }
            return res;
        });
        let lastGroupLabel;
        const picks = [];
        for (const item of items) {
            if (lastGroupLabel !== item.toolInfo.label) {
                picks.push({ type: 'separator', label: item.toolInfo.label });
                lastGroupLabel = item.toolInfo.label;
            }
            picks.push(item);
        }
        return {
            placeholder: localize('chatContext.tools.placeholder', 'Select a tool'),
            picks: Promise.resolve(picks)
        };
    }
    _asToolAttachment(entry) {
        return {
            kind: 'tool',
            id: entry.id,
            icon: ThemeIcon.isThemeIcon(entry.icon) ? entry.icon : undefined,
            name: entry.displayName,
            value: undefined,
        };
    }
    _asToolSetAttachment(entry) {
        return {
            kind: 'toolset',
            id: entry.id,
            icon: entry.icon,
            name: entry.referenceName,
            value: Array.from(entry.getTools()).map(t => this._asToolAttachment(t)),
        };
    }
}
let OpenEditorContextValuePick = class OpenEditorContextValuePick {
    constructor(_editorService, _labelService) {
        this._editorService = _editorService;
        this._labelService = _labelService;
        this.type = 'valuePick';
        this.label = localize('chatContext.editors', 'Open Editors');
        this.icon = Codicon.file;
        this.ordinal = 800;
    }
    isEnabled() {
        return this._editorService.editors.filter(e => e instanceof FileEditorInput || e instanceof DiffEditorInput || e instanceof UntitledTextEditorInput).length > 0;
    }
    async asAttachment() {
        const result = [];
        for (const editor of this._editorService.editors) {
            if (!(editor instanceof FileEditorInput || editor instanceof DiffEditorInput || editor instanceof UntitledTextEditorInput || editor instanceof NotebookEditorInput)) {
                continue;
            }
            const uri = EditorResourceAccessor.getOriginalUri(editor, { supportSideBySide: SideBySideEditor.PRIMARY });
            if (!uri) {
                continue;
            }
            result.push({
                kind: 'file',
                id: uri.toString(),
                value: uri,
                name: this._labelService.getUriBasenameLabel(uri),
            });
        }
        return result;
    }
};
OpenEditorContextValuePick = __decorate([
    __param(0, IEditorService),
    __param(1, ILabelService)
], OpenEditorContextValuePick);
let RelatedFilesContextPickerPick = class RelatedFilesContextPickerPick {
    constructor(_chatEditingService, _labelService) {
        this._chatEditingService = _chatEditingService;
        this._labelService = _labelService;
        this.type = 'pickerPick';
        this.label = localize('chatContext.relatedFiles', 'Related Files');
        this.icon = Codicon.sparkle;
        this.ordinal = 300;
    }
    isEnabled(widget) {
        return this._chatEditingService.hasRelatedFilesProviders() && (Boolean(widget.getInput()) || widget.attachmentModel.fileAttachments.length > 0);
    }
    asPicker(widget) {
        const picks = (async () => {
            const chatSessionId = widget.viewModel?.sessionId;
            if (!chatSessionId) {
                return [];
            }
            const relatedFiles = await this._chatEditingService.getRelatedFiles(chatSessionId, widget.getInput(), widget.attachmentModel.fileAttachments, CancellationToken.None);
            if (!relatedFiles) {
                return [];
            }
            const attachments = widget.attachmentModel.getAttachmentIDs();
            return this._chatEditingService.getRelatedFiles(chatSessionId, widget.getInput(), widget.attachmentModel.fileAttachments, CancellationToken.None)
                .then((files) => (files ?? []).reduce((acc, cur) => {
                acc.push({ type: 'separator', label: cur.group });
                for (const file of cur.files) {
                    const label = this._labelService.getUriBasenameLabel(file.uri);
                    acc.push({
                        label: label,
                        description: this._labelService.getUriLabel(dirname(file.uri), { relative: true }),
                        disabled: attachments.has(file.uri.toString()),
                        asAttachment: () => {
                            return {
                                kind: 'file',
                                id: file.uri.toString(),
                                value: file.uri,
                                name: label,
                                omittedState: 0 /* OmittedState.NotOmitted */
                            };
                        }
                    });
                }
                return acc;
            }, []));
        })();
        return {
            placeholder: localize('relatedFiles', 'Add related files to your working set'),
            picks,
        };
    }
};
RelatedFilesContextPickerPick = __decorate([
    __param(0, IChatEditingService),
    __param(1, ILabelService)
], RelatedFilesContextPickerPick);
let ClipboardImageContextValuePick = class ClipboardImageContextValuePick {
    constructor(_clipboardService) {
        this._clipboardService = _clipboardService;
        this.type = 'valuePick';
        this.label = localize('imageFromClipboard', 'Image from Clipboard');
        this.icon = Codicon.fileMedia;
    }
    async isEnabled(widget) {
        if (!widget.input.selectedLanguageModel?.metadata.capabilities?.vision) {
            return false;
        }
        const imageData = await this._clipboardService.readImage();
        return isImage(imageData);
    }
    async asAttachment() {
        const fileBuffer = await this._clipboardService.readImage();
        return {
            id: await imageToHash(fileBuffer),
            name: localize('pastedImage', 'Pasted Image'),
            fullName: localize('pastedImage', 'Pasted Image'),
            value: fileBuffer,
            kind: 'image',
        };
    }
};
ClipboardImageContextValuePick = __decorate([
    __param(0, IClipboardService)
], ClipboardImageContextValuePick);
let ScreenshotContextValuePick = class ScreenshotContextValuePick {
    constructor(_hostService) {
        this._hostService = _hostService;
        this.type = 'valuePick';
        this.icon = Codicon.deviceCamera;
        this.label = (isElectron
            ? localize('chatContext.attachScreenshot.labelElectron.Window', 'Screenshot Window')
            : localize('chatContext.attachScreenshot.labelWeb', 'Screenshot'));
    }
    async isEnabled(widget) {
        return !!widget.input.selectedLanguageModel?.metadata.capabilities?.vision;
    }
    async asAttachment() {
        const blob = await this._hostService.getScreenshot();
        return blob && convertBufferToScreenshotVariable(blob);
    }
};
ScreenshotContextValuePick = __decorate([
    __param(0, IHostService)
], ScreenshotContextValuePick);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdENvbnRleHQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9hZHZpa2FyL0RvY3VtZW50cy9hcmNoaXRlY3QvYXJjaDIvQXJjaElERS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2Jyb3dzZXIvYWN0aW9ucy9jaGF0Q29udGV4dC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7QUFBQTs7O2dHQUdnRztBQUNoRyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUMvRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDakUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ3JFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUNwRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDbEUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ3BFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUNqRCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSw4REFBOEQsQ0FBQztBQUNqRyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQztBQUN0RyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sK0NBQStDLENBQUM7QUFHOUUsT0FBTyxFQUFFLHNCQUFzQixFQUFFLGdCQUFnQixFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFDeEYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDhDQUE4QyxDQUFDO0FBQy9FLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxxREFBcUQsQ0FBQztBQUNyRixPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFDekUsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0saUVBQWlFLENBQUM7QUFD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