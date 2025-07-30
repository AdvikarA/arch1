/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Codicon } from '../../../../base/common/codicons.js';
import { basename } from '../../../../base/common/resources.js';
import { URI } from '../../../../base/common/uri.js';
import { isLocation } from '../../../../editor/common/languages.js';
import { localize } from '../../../../nls.js';
export var OmittedState;
(function (OmittedState) {
    OmittedState[OmittedState["NotOmitted"] = 0] = "NotOmitted";
    OmittedState[OmittedState["Partial"] = 1] = "Partial";
    OmittedState[OmittedState["Full"] = 2] = "Full";
})(OmittedState || (OmittedState = {}));
export var IDiagnosticVariableEntryFilterData;
(function (IDiagnosticVariableEntryFilterData) {
    IDiagnosticVariableEntryFilterData.icon = Codicon.error;
    function fromMarker(marker) {
        return {
            filterUri: marker.resource,
            owner: marker.owner,
            problemMessage: marker.message,
            filterRange: { startLineNumber: marker.startLineNumber, endLineNumber: marker.endLineNumber, startColumn: marker.startColumn, endColumn: marker.endColumn }
        };
    }
    IDiagnosticVariableEntryFilterData.fromMarker = fromMarker;
    function toEntry(data) {
        return {
            id: id(data),
            name: label(data),
            icon: IDiagnosticVariableEntryFilterData.icon,
            value: data,
            kind: 'diagnostic',
            ...data,
        };
    }
    IDiagnosticVariableEntryFilterData.toEntry = toEntry;
    function id(data) {
        return [data.filterUri, data.owner, data.filterSeverity, data.filterRange?.startLineNumber].join(':');
    }
    IDiagnosticVariableEntryFilterData.id = id;
    function label(data) {
        let TrimThreshold;
        (function (TrimThreshold) {
            TrimThreshold[TrimThreshold["MaxChars"] = 30] = "MaxChars";
            TrimThreshold[TrimThreshold["MaxSpaceLookback"] = 10] = "MaxSpaceLookback";
        })(TrimThreshold || (TrimThreshold = {}));
        if (data.problemMessage) {
            if (data.problemMessage.length < 30 /* TrimThreshold.MaxChars */) {
                return data.problemMessage;
            }
            // Trim the message, on a space if it would not lose too much
            // data (MaxSpaceLookback) or just blindly otherwise.
            const lastSpace = data.problemMessage.lastIndexOf(' ', 30 /* TrimThreshold.MaxChars */);
            if (lastSpace === -1 || lastSpace + 10 /* TrimThreshold.MaxSpaceLookback */ < 30 /* TrimThreshold.MaxChars */) {
                return data.problemMessage.substring(0, 30 /* TrimThreshold.MaxChars */) + '…';
            }
            return data.problemMessage.substring(0, lastSpace) + '…';
        }
        let labelStr = localize('chat.attachment.problems.all', "All Problems");
        if (data.filterUri) {
            labelStr = localize('chat.attachment.problems.inFile', "Problems in {0}", basename(data.filterUri));
        }
        return labelStr;
    }
    IDiagnosticVariableEntryFilterData.label = label;
})(IDiagnosticVariableEntryFilterData || (IDiagnosticVariableEntryFilterData = {}));
export var IChatRequestVariableEntry;
(function (IChatRequestVariableEntry) {
    /**
     * Returns URI of the passed variant entry. Return undefined if not found.
     */
    function toUri(entry) {
        return URI.isUri(entry.value)
            ? entry.value
            : isLocation(entry.value)
                ? entry.value.uri
                : undefined;
    }
    IChatRequestVariableEntry.toUri = toUri;
})(IChatRequestVariableEntry || (IChatRequestVariableEntry = {}));
export function isImplicitVariableEntry(obj) {
    return obj.kind === 'implicit';
}
export function isPasteVariableEntry(obj) {
    return obj.kind === 'paste';
}
export function isImageVariableEntry(obj) {
    return obj.kind === 'image';
}
export function isNotebookOutputVariableEntry(obj) {
    return obj.kind === 'notebookOutput';
}
export function isElementVariableEntry(obj) {
    return obj.kind === 'element';
}
export function isDiagnosticsVariableEntry(obj) {
    return obj.kind === 'diagnostic';
}
export function isChatRequestFileEntry(obj) {
    return obj.kind === 'file';
}
export function isPromptFileVariableEntry(obj) {
    return obj.kind === 'promptFile';
}
export function isPromptTextVariableEntry(obj) {
    return obj.kind === 'promptText';
}
export function isChatRequestVariableEntry(obj) {
    const entry = obj;
    return typeof entry === 'object' &&
        entry !== null &&
        typeof entry.id === 'string' &&
        typeof entry.name === 'string';
}
export function isSCMHistoryItemVariableEntry(obj) {
    return obj.kind === 'scmHistoryItem';
}
export var PromptFileVariableKind;
(function (PromptFileVariableKind) {
    PromptFileVariableKind["Instruction"] = "vscode.prompt.instructions.root";
    PromptFileVariableKind["InstructionReference"] = "vscode.prompt.instructions";
    PromptFileVariableKind["PromptFile"] = "vscode.prompt.file";
})(PromptFileVariableKind || (PromptFileVariableKind = {}));
/**
 * Utility to convert a {@link uri} to a chat variable entry.
 * The `id` of the chat variable can be one of the following:
 *
 * - `vscode.prompt.instructions__<URI>`: for all non-root prompt instructions references
 * - `vscode.prompt.instructions.root__<URI>`: for *root* prompt instructions references
 * - `vscode.prompt.file__<URI>`: for prompt file references
 *
 * @param uri A resource URI that points to a prompt instructions file.
 * @param kind The kind of the prompt file variable entry.
 */
export function toPromptFileVariableEntry(uri, kind, originLabel, automaticallyAdded = false) {
    //  `id` for all `prompt files` starts with the well-defined part that the copilot extension(or other chatbot) can rely on
    return {
        id: `${kind}__${uri.toString()}`,
        name: `prompt:${basename(uri)}`,
        value: uri,
        kind: 'promptFile',
        modelDescription: 'Prompt instructions file',
        isRoot: kind !== PromptFileVariableKind.InstructionReference,
        originLabel,
        automaticallyAdded
    };
}
export function toPromptTextVariableEntry(content, settingId, automaticallyAdded = false) {
    return {
        id: `vscode.prompt.instructions.text${settingId ? `.${settingId}` : ''}`,
        name: `prompt:text`,
        value: content,
        settingId,
        kind: 'promptText',
        modelDescription: 'Prompt instructions text',
        automaticallyAdded
    };
}
export function toFileVariableEntry(uri, range) {
    return {
        kind: 'file',
        value: range ? { uri, range } : uri,
        id: uri.toString() + (range?.toString() ?? ''),
        name: basename(uri),
    };
}
export class ChatRequestVariableSet {
    constructor(entries) {
        this._ids = new Set();
        this._entries = [];
        if (entries) {
            this.add(...entries);
        }
    }
    add(...entry) {
        for (const e of entry) {
            if (!this._ids.has(e.id)) {
                this._ids.add(e.id);
                this._entries.push(e);
            }
        }
    }
    insertFirst(entry) {
        if (!this._ids.has(entry.id)) {
            this._ids.add(entry.id);
            this._entries.unshift(entry);
        }
    }
    remove(entry) {
        this._ids.delete(entry.id);
        this._entries = this._entries.filter(e => e.id !== entry.id);
    }
    has(entry) {
        return this._ids.has(entry.id);
    }
    asArray() {
        return this._entries.slice(0); // return a copy
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFZhcmlhYmxlRW50cmllcy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL2FkdmlrYXIvRG9jdW1lbnRzL2FyY2hpdGVjdC9hcmNoMi9BcmNoSURFL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvY29tbW9uL2NoYXRWYXJpYWJsZUVudHJpZXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQzlELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUVoRSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFHckQsT0FBTyxFQUFFLFVBQVUsRUFBd0IsTUFBTSx3Q0FBd0MsQ0FBQztBQUMxRixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFxQzlDLE1BQU0sQ0FBTixJQUFrQixZQUlqQjtBQUpELFdBQWtCLFlBQVk7SUFDN0IsMkRBQVUsQ0FBQTtJQUNWLHFEQUFPLENBQUE7SUFDUCwrQ0FBSSxDQUFBO0FBQ0wsQ0FBQyxFQUppQixZQUFZLEtBQVosWUFBWSxRQUk3QjtBQW9FRCxNQUFNLEtBQVcsa0NBQWtDLENBb0RsRDtBQXBERCxXQUFpQixrQ0FBa0M7SUFDckMsdUNBQUksR0FBRyxPQUFPLENBQUMsS0FBSyxDQUFDO0lBRWxDLFNBQWdCLFVBQVUsQ0FBQyxNQUFlO1FBQ3pDLE9BQU87WUFDTixTQUFTLEVBQUUsTUFBTSxDQUFDLFFBQVE7WUFDMUIsS0FBSyxFQUFFLE1BQU0sQ0FBQyxLQUFLO1lBQ25CLGNBQWMsRUFBRSxNQUFNLENBQUMsT0FBTztZQUM5QixXQUFXLEVBQUUsRUFBRSxlQUFlLEVBQUUsTUFBTSxDQUFDLGVBQWUsRUFBRSxhQUFhLEVBQUUsTUFBTSxDQUFDLGFBQWEsRUFBRSxXQUFXLEVBQUUsTUFBTSxDQUFDLFdBQVcsRUFB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