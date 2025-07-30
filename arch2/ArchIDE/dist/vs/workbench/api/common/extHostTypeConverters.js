/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { asArray, coalesce, isNonEmptyArray } from '../../../base/common/arrays.js';
import { VSBuffer, encodeBase64 } from '../../../base/common/buffer.js';
import { UriList } from '../../../base/common/dataTransfer.js';
import { createSingleCallFunction } from '../../../base/common/functional.js';
import * as htmlContent from '../../../base/common/htmlContent.js';
import { ResourceMap, ResourceSet } from '../../../base/common/map.js';
import * as marked from '../../../base/common/marked/marked.js';
import { parse, revive } from '../../../base/common/marshalling.js';
import { Mimes } from '../../../base/common/mime.js';
import { cloneAndChange } from '../../../base/common/objects.js';
import { WellDefinedPrefixTree } from '../../../base/common/prefixTree.js';
import { basename } from '../../../base/common/resources.js';
import { ThemeIcon } from '../../../base/common/themables.js';
import { isDefined, isEmptyObject, isNumber, isString, isUndefinedOrNull } from '../../../base/common/types.js';
import { URI, isUriComponents } from '../../../base/common/uri.js';
import { generateUuid } from '../../../base/common/uuid.js';
import * as editorRange from '../../../editor/common/core/range.js';
import * as languages from '../../../editor/common/languages.js';
import { MarkerSeverity } from '../../../platform/markers/common/markers.js';
import { DEFAULT_EDITOR_ASSOCIATION } from '../../common/editor.js';
import { isImageVariableEntry } from '../../contrib/chat/common/chatVariableEntries.js';
import * as notebooks from '../../contrib/notebook/common/notebookCommon.js';
import { TestId } from '../../contrib/testing/common/testId.js';
import { denamespaceTestTag, namespaceTestTag } from '../../contrib/testing/common/testTypes.js';
import { ACTIVE_GROUP, SIDE_GROUP } from '../../services/editor/common/editorService.js';
import { checkProposedApiEnabled, isProposedApiEnabled } from '../../services/extensions/common/extensions.js';
import { SerializableObjectWithBuffers } from '../../services/extensions/common/proxyIdentifier.js';
import { getPrivateApiFor } from './extHostTestingPrivateApi.js';
import * as types from './extHostTypes.js';
import { LanguageModelTextPart } from './extHostTypes.js';
import { ChatAgentLocation } from '../../contrib/chat/common/constants.js';
import { AiSettingsSearchResultKind } from '../../services/aiSettingsSearch/common/aiSettingsSearch.js';
import { McpServerLaunch } from '../../contrib/mcp/common/mcpTypes.js';
export var Selection;
(function (Selection) {
    function to(selection) {
        const { selectionStartLineNumber, selectionStartColumn, positionLineNumber, positionColumn } = selection;
        const start = new types.Position(selectionStartLineNumber - 1, selectionStartColumn - 1);
        const end = new types.Position(positionLineNumber - 1, positionColumn - 1);
        return new types.Selection(start, end);
    }
    Selection.to = to;
    function from(selection) {
        const { anchor, active } = selection;
        return {
            selectionStartLineNumber: anchor.line + 1,
            selectionStartColumn: anchor.character + 1,
            positionLineNumber: active.line + 1,
            positionColumn: active.character + 1
        };
    }
    Selection.from = from;
})(Selection || (Selection = {}));
export var Range;
(function (Range) {
    function from(range) {
        if (!range) {
            return undefined;
        }
        const { start, end } = range;
        return {
            startLineNumber: start.line + 1,
            startColumn: start.character + 1,
            endLineNumber: end.line + 1,
            endColumn: end.character + 1
        };
    }
    Range.from = from;
    function to(range) {
        if (!range) {
            return undefined;
        }
        const { startLineNumber, startColumn, endLineNumber, endColumn } = range;
        return new types.Range(startLineNumber - 1, startColumn - 1, endLineNumber - 1, endColumn - 1);
    }
    Range.to = to;
})(Range || (Range = {}));
export var Location;
(function (Location) {
    function from(location) {
        return {
            uri: location.uri,
            range: Range.from(location.range)
        };
    }
    Location.from = from;
    function to(location) {
        return new types.Location(URI.revive(location.uri), Range.to(location.range));
    }
    Location.to = to;
})(Location || (Location = {}));
export var TokenType;
(function (TokenType) {
    function to(type) {
        switch (type) {
            case 1 /* encodedTokenAttributes.StandardTokenType.Comment */: return types.StandardTokenType.Comment;
            case 0 /* encodedTokenAttributes.StandardTokenType.Other */: return types.StandardTokenType.Other;
            case 3 /* encodedTokenAttributes.StandardTokenType.RegEx */: return types.StandardTokenType.RegEx;
            case 2 /* encodedTokenAttributes.StandardTokenType.String */: return types.StandardTokenType.String;
        }
    }
    TokenType.to = to;
})(TokenType || (TokenType = {}));
export var Position;
(function (Position) {
    function to(position) {
        return new types.Position(position.lineNumber - 1, position.column - 1);
    }
    Position.to = to;
    function from(position) {
        return { lineNumber: position.line + 1, column: position.character + 1 };
    }
    Position.from = from;
})(Position || (Position = {}));
export var DocumentSelector;
(function (DocumentSelector) {
    function from(value, uriTransformer, extension) {
        return coalesce(asArray(value).map(sel => _doTransformDocumentSelector(sel, uriTransformer, extension)));
    }
    DocumentSelector.from = from;
    function _doTransformDocumentSelector(selector, uriTransformer, extension) {
        if (typeof selector === 'string') {
            return {
                $serialized: true,
                language: selector,
                isBuiltin: extension?.isBuiltin,
            };
        }
        if (selector) {
            return {
                $serialized: true,
                language: selector.language,
                scheme: _transformScheme(selector.scheme, uriTransformer),
                pattern: GlobPattern.from(selector.pattern) ?? undefined,
                exclusive: selector.exclusive,
                notebookType: selector.notebookType,
                isBuiltin: extension?.isBuiltin
            };
        }
        return undefined;
    }
    function _transformScheme(scheme, uriTransformer) {
        if (uriTransformer && typeof scheme === 'string') {
            return uriTransformer.transformOutgoingScheme(scheme);
        }
        return scheme;
    }
})(DocumentSelector || (DocumentSelector = {}));
export var DiagnosticTag;
(function (DiagnosticTag) {
    function from(value) {
        switch (value) {
            case types.DiagnosticTag.Unnecessary:
                return 1 /* MarkerTag.Unnecessary */;
            case types.DiagnosticTag.Deprecated:
                return 2 /* MarkerTag.Deprecated */;
        }
        return undefined;
    }
    DiagnosticTag.from = from;
    function to(value) {
        switch (value) {
            case 1 /* MarkerTag.Unnecessary */:
                return types.DiagnosticTag.Unnecessary;
            case 2 /* MarkerTag.Deprecated */:
                return types.DiagnosticTag.Deprecated;
            default:
                return undefined;
        }
    }
    DiagnosticTag.to = to;
})(DiagnosticTag || (DiagnosticTag = {}));
export var Diagnostic;
(function (Diagnostic) {
    function from(value) {
        let code;
        if (value.code) {
            if (isString(value.code) || isNumber(value.code)) {
                code = String(value.code);
            }
            else {
                code = {
                    value: String(value.code.value),
                    target: value.code.target,
                };
            }
        }
        return {
            ...Range.from(value.range),
            message: value.message,
            source: value.source,
            code,
            severity: DiagnosticSeverity.from(value.severity),
            relatedInformation: value.relatedInformation && value.relatedInformation.map(DiagnosticRelatedInformation.from),
            tags: Array.isArray(value.tags) ? coalesce(value.tags.map(DiagnosticTag.from)) : undefined,
        };
    }
    Diagnostic.from = from;
    function to(value) {
        const res = new types.Diagnostic(Range.to(value), value.message, DiagnosticSeverity.to(value.severity));
        res.source = value.source;
        res.code = isString(value.code) ? value.code : value.code?.value;
        res.relatedInformation = value.relatedInformation && value.relatedInformation.map(DiagnosticRelatedInformation.to);
        res.tags = value.tags && coalesce(value.tags.map(DiagnosticTag.to));
        return res;
    }
    Diagnostic.to = to;
})(Diagnostic || (Diagnostic = {}));
export var DiagnosticRelatedInformation;
(function (DiagnosticRelatedInformation) {
    function from(value) {
        return {
            ...Range.from(value.location.range),
            message: value.message,
            resource: value.location.uri
        };
    }
    DiagnosticRelatedInformation.from = from;
    function to(value) {
        return new types.DiagnosticRelatedInformation(new types.Location(value.resource, Range.to(value)), value.message);
    }
    DiagnosticRelatedInformation.to = to;
})(DiagnosticRelatedInformation || (DiagnosticRelatedInformation = {}));
export var DiagnosticSeverity;
(function (DiagnosticSeverity) {
    function from(value) {
        switch (value) {
            case types.DiagnosticSeverity.Error:
                return MarkerSeverity.Error;
            case types.DiagnosticSeverity.Warning:
                return MarkerSeverity.Warning;
            case types.DiagnosticSeverity.Information:
                return MarkerSeverity.Info;
            case types.DiagnosticSeverity.Hint:
                return MarkerSeverity.Hint;
        }
        return MarkerSeverity.Error;
    }
    DiagnosticSeverity.from = from;
    function to(value) {
        switch (value) {
            case MarkerSeverity.Info:
                return types.DiagnosticSeverity.Information;
            case MarkerSeverity.Warning:
                return types.DiagnosticSeverity.Warning;
            case MarkerSeverity.Error:
                return types.DiagnosticSeverity.Error;
            case MarkerSeverity.Hint:
                return types.DiagnosticSeverity.Hint;
            default:
                return types.DiagnosticSeverity.Error;
        }
    }
    DiagnosticSeverity.to = to;
})(DiagnosticSeverity || (DiagnosticSeverity = {}));
export var ViewColumn;
(function (ViewColumn) {
    function from(column) {
        if (typeof column === 'number' && column >= types.ViewColumn.One) {
            return column - 1; // adjust zero index (ViewColumn.ONE => 0)
        }
        if (column === types.ViewColumn.Beside) {
            return SIDE_GROUP;
        }
        return ACTIVE_GROUP; // default is always the active group
    }
    ViewColumn.from = from;
    function to(position) {
        if (typeof position === 'number' && position >= 0) {
            return position + 1; // adjust to index (ViewColumn.ONE => 1)
        }
        throw new Error(`invalid 'EditorGroupColumn'`);
    }
    ViewColumn.to = to;
})(ViewColumn || (ViewColumn = {}));
function isDecorationOptions(something) {
    return (typeof something.range !== 'undefined');
}
export function isDecorationOptionsArr(something) {
    if (something.length === 0) {
        return true;
    }
    return isDecorationOptions(something[0]) ? true : false;
}
export var MarkdownString;
(function (MarkdownString) {
    function fromMany(markup) {
        return markup.map(MarkdownString.from);
    }
    MarkdownString.fromMany = fromMany;
    function isCodeblock(thing) {
        return thing && typeof thing === 'object'
            && typeof thing.language === 'string'
            && typeof thing.value === 'string';
    }
    function from(markup) {
        let res;
        if (isCodeblock(markup)) {
            const { language, value } = markup;
            res = { value: '```' + language + '\n' + value + '\n```\n' };
        }
        else if (types.MarkdownString.isMarkdownString(markup)) {
            res = { value: markup.value, isTrusted: markup.isTrusted, supportThemeIcons: markup.supportThemeIcons, supportHtml: markup.supportHtml, baseUri: markup.baseUri };
        }
        else if (typeof markup === 'string') {
            res = { value: markup };
        }
        else {
            res = { value: '' };
        }
        // extract uris into a separate object
        const resUris = Object.create(null);
        res.uris = resUris;
        const collectUri = ({ href }) => {
            try {
                let uri = URI.parse(href, true);
                uri = uri.with({ query: _uriMassage(uri.query, resUris) });
                resUris[href] = uri;
            }
            catch (e) {
                // ignore
            }
            return '';
        };
        marked.marked.walkTokens(marked.marked.lexer(res.value), token => {
            if (token.type === 'link') {
                collectUri({ href: token.href });
            }
            else if (token.type === 'image') {
                if (typeof token.href === 'string') {
                    collectUri(htmlContent.parseHrefAndDimensions(token.href));
                }
            }
        });
        return res;
    }
    MarkdownString.from = from;
    function _uriMassage(part, bucket) {
        if (!part) {
            return part;
        }
        let data;
        try {
            data = parse(part);
        }
        catch (e) {
            // ignore
        }
        if (!data) {
            return part;
        }
        let changed = false;
        data = cloneAndChange(data, value => {
            if (URI.isUri(value)) {
                const key = `__uri_${Math.random().toString(16).slice(2, 8)}`;
                bucket[key] = value;
                changed = true;
                return key;
            }
            else {
                return undefined;
            }
        });
        if (!changed) {
            return part;
        }
        return JSON.stringify(data);
    }
    function to(value) {
        const result = new types.MarkdownString(value.value, value.supportThemeIcons);
        result.isTrusted = value.isTrusted;
        result.supportHtml = value.supportHtml;
        result.baseUri = value.baseUri ? URI.from(value.baseUri) : undefined;
        return result;
    }
    MarkdownString.to = to;
    function fromStrict(value) {
        if (!value) {
            return undefined;
        }
        return typeof value === 'string' ? value : MarkdownString.from(value);
    }
    MarkdownString.fromStrict = fromStrict;
})(MarkdownString || (MarkdownString = {}));
export function fromRangeOrRangeWithMessage(ranges) {
    if (isDecorationOptionsArr(ranges)) {
        return ranges.map((r) => {
            return {
                range: Range.from(r.range),
                hoverMessage: Array.isArray(r.hoverMessage)
                    ? MarkdownString.fromMany(r.hoverMessage)
                    : (r.hoverMessage ? MarkdownString.from(r.hoverMessage) : undefined),
                renderOptions: /* URI vs Uri */ r.renderOptions
            };
        });
    }
    else {
        return ranges.map((r) => {
            return {
                range: Range.from(r)
            };
        });
    }
}
export function pathOrURIToURI(value) {
    if (typeof value === 'undefined') {
        return value;
    }
    if (typeof value === 'string') {
        return URI.file(value);
    }
    else {
        return value;
    }
}
export var ThemableDecorationAttachmentRenderOptions;
(function (ThemableDecorationAttachmentRenderOptions) {
    function from(options) {
        if (typeof options === 'undefined') {
            return options;
        }
        return {
            contentText: options.contentText,
            contentIconPath: options.contentIconPath ? pathOrURIToURI(options.contentIconPath) : undefined,
            border: options.border,
            borderColor: options.borderColor,
            fontStyle: options.fontStyle,
            fontWeight: options.fontWeight,
            textDecoration: options.textDecoration,
            color: options.color,
            backgroundColor: options.backgroundColor,
            margin: options.margin,
            width: options.width,
            height: options.height,
        };
    }
    ThemableDecorationAttachmentRenderOptions.from = from;
})(ThemableDecorationAttachmentRenderOptions || (ThemableDecorationAttachmentRenderOptions = {}));
export var ThemableDecorationRenderOptions;
(function (ThemableDecorationRenderOptions) {
    function from(options) {
        if (typeof options === 'undefined') {
            return options;
        }
        return {
            backgroundColor: options.backgroundColor,
            outline: options.outline,
            outlineColor: options.outlineColor,
            outlineStyle: options.outlineStyle,
            outlineWidth: options.outlineWidth,
            border: options.border,
            borderColor: options.borderColor,
            borderRadius: options.borderRadius,
            borderSpacing: options.borderSpacing,
            borderStyle: options.borderStyle,
            borderWidth: options.borderWidth,
            fontStyle: options.fontStyle,
            fontWeight: options.fontWeight,
            textDecoration: options.textDecoration,
            cursor: options.cursor,
            color: options.color,
            opacity: options.opacity,
            letterSpacing: options.letterSpacing,
            gutterIconPath: options.gutterIconPath ? pathOrURIToURI(options.gutterIconPath) : undefined,
            gutterIconSize: options.gutterIconSize,
            overviewRulerColor: options.overviewRulerColor,
            before: options.before ? ThemableDecorationAttachmentRenderOptions.from(options.before) : undefined,
            after: options.after ? ThemableDecorationAttachmentRenderOptions.from(options.after) : undefined,
        };
    }
    ThemableDecorationRenderOptions.from = from;
})(ThemableDecorationRenderOptions || (ThemableDecorationRenderOptions = {}));
export var DecorationRangeBehavior;
(function (DecorationRangeBehavior) {
    function from(value) {
        if (typeof value === 'undefined') {
            return value;
        }
        switch (value) {
            case types.DecorationRangeBehavior.OpenOpen:
                return 0 /* TrackedRangeStickiness.AlwaysGrowsWhenTypingAtEdges */;
            case types.DecorationRangeBehavior.ClosedClosed:
                return 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */;
            case types.DecorationRangeBehavior.OpenClosed:
                return 2 /* TrackedRangeStickiness.GrowsOnlyWhenTypingBefore */;
            case types.DecorationRangeBehavior.ClosedOpen:
                return 3 /* TrackedRangeStickiness.GrowsOnlyWhenTypingAfter */;
        }
    }
    DecorationRangeBehavior.from = from;
})(DecorationRangeBehavior || (DecorationRangeBehavior = {}));
export var DecorationRenderOptions;
(function (DecorationRenderOptions) {
    function from(options) {
        return {
            isWholeLine: options.isWholeLine,
            rangeBehavior: options.rangeBehavior ? DecorationRangeBehavior.from(options.rangeBehavior) : undefined,
            overviewRulerLane: options.overviewRulerLane,
            light: options.light ? ThemableDecorationRenderOptions.from(options.light) : undefined,
            dark: options.dark ? ThemableDecorationRenderOptions.from(options.dark) : undefined,
            backgroundColor: options.backgroundColor,
            outline: options.outline,
            outlineColor: options.outlineColor,
            outlineStyle: options.outlineStyle,
            outlineWidth: options.outlineWidth,
            border: options.border,
            borderColor: options.borderColor,
            borderRadius: options.borderRadius,
            borderSpacing: options.borderSpacing,
            borderStyle: options.borderStyle,
            borderWidth: options.borderWidth,
            fontStyle: options.fontStyle,
            fontWeight: options.fontWeight,
            textDecoration: options.textDecoration,
            cursor: options.cursor,
            color: options.color,
            opacity: options.opacity,
            letterSpacing: options.letterSpacing,
            gutterIconPath: options.gutterIconPath ? pathOrURIToURI(options.gutterIconPath) : undefined,
            gutterIconSize: options.gutterIconSize,
            overviewRulerColor: options.overviewRulerColor,
            before: options.before ? ThemableDecorationAttachmentRenderOptions.from(options.before) : undefined,
            after: options.after ? ThemableDecorationAttachmentRenderOptions.from(options.after) : undefined,
        };
    }
    DecorationRenderOptions.from = from;
})(DecorationRenderOptions || (DecorationRenderOptions = {}));
export var TextEdit;
(function (TextEdit) {
    function from(edit) {
        return {
            text: edit.newText,
            eol: edit.newEol && EndOfLine.from(edit.newEol),
            range: Range.from(edit.range)
        };
    }
    TextEdit.from = from;
    function to(edit) {
        const result = new types.TextEdit(Range.to(edit.range), edit.text);
        result.newEol = (typeof edit.eol === 'undefined' ? undefined : EndOfLine.to(edit.eol));
        return result;
    }
    TextEdit.to = to;
})(TextEdit || (TextEdit = {}));
export var WorkspaceEdit;
(function (WorkspaceEdit) {
    function from(value, versionInfo) {
        const result = {
            edits: []
        };
        if (value instanceof types.WorkspaceEdit) {
            // collect all files that are to be created so that their version
            // information (in case they exist as text model already) can be ignored
            const toCreate = new ResourceSet();
            for (const entry of value._allEntries()) {
                if (entry._type === 1 /* types.FileEditType.File */ && URI.isUri(entry.to) && entry.from === undefined) {
                    toCreate.add(entry.to);
                }
            }
            for (const entry of value._allEntries()) {
                if (entry._type === 1 /* types.FileEditType.File */) {
                    let contents;
                    if (entry.options?.contents) {
                        if (ArrayBuffer.isView(entry.options.contents)) {
                            contents = { type: 'base64', value: encodeBase64(VSBuffer.wrap(entry.options.contents)) };
                        }
                        else {
                            contents = { type: 'dataTransferItem', id: entry.options.contents._itemId };
                        }
                    }
                    // file operation
                    result.edits.push({
                        oldResource: entry.from,
                        newResource: entry.to,
                        options: { ...entry.options, contents },
                        metadata: entry.metadata
                    });
                }
                else if (entry._type === 2 /* types.FileEditType.Text */) {
                    // text edits
                    result.edits.push({
                        resource: entry.uri,
                        textEdit: TextEdit.from(entry.edit),
                        versionId: !toCreate.has(entry.uri) ? versionInfo?.getTextDocumentVersion(entry.uri) : undefined,
                        metadata: entry.metadata
                    });
                }
                else if (entry._type === 6 /* types.FileEditType.Snippet */) {
                    result.edits.push({
                        resource: entry.uri,
                        textEdit: {
                            range: Range.from(entry.range),
                            text: entry.edit.value,
                            insertAsSnippet: true,
                            keepWhitespace: entry.keepWhitespace
                        },
                        versionId: !toCreate.has(entry.uri) ? versionInfo?.getTextDocumentVersion(entry.uri) : undefined,
                        metadata: entry.metadata
                    });
                }
                else if (entry._type === 3 /* types.FileEditType.Cell */) {
                    // cell edit
                    result.edits.push({
                        metadata: entry.metadata,
                        resource: entry.uri,
                        cellEdit: entry.edit,
                        notebookVersionId: versionInfo?.getNotebookDocumentVersion(entry.uri)
                    });
                }
                else if (entry._type === 5 /* types.FileEditType.CellReplace */) {
                    // cell replace
                    result.edits.push({
                        metadata: entry.metadata,
                        resource: entry.uri,
                        notebookVersionId: versionInfo?.getNotebookDocumentVersion(entry.uri),
                        cellEdit: {
                            editType: 1 /* notebooks.CellEditType.Replace */,
                            index: entry.index,
                            count: entry.count,
                            cells: entry.cells.map(NotebookCellData.from)
                        }
                    });
                }
            }
        }
        return result;
    }
    WorkspaceEdit.from = from;
    function to(value) {
        const result = new types.WorkspaceEdit();
        const edits = new ResourceMap();
        for (const edit of value.edits) {
            if (edit.textEdit) {
                const item = edit;
                const uri = URI.revive(item.resource);
                const range = Range.to(item.textEdit.range);
                const text = item.textEdit.text;
                const isSnippet = item.textEdit.insertAsSnippet;
                let editOrSnippetTest;
                if (isSnippet) {
                    editOrSnippetTest = types.SnippetTextEdit.replace(range, new types.SnippetString(text));
                }
                else {
                    editOrSnippetTest = types.TextEdit.replace(range, text);
                }
                const array = edits.get(uri);
                if (!array) {
                    edits.set(uri, [editOrSnippetTest]);
                }
                else {
                    array.push(editOrSnippetTest);
                }
            }
            else {
                result.renameFile(URI.revive(edit.oldResource), URI.revive(edit.newResource), edit.options);
            }
        }
        for (const [uri, array] of edits) {
            result.set(uri, array);
        }
        return result;
    }
    WorkspaceEdit.to = to;
})(WorkspaceEdit || (WorkspaceEdit = {}));
export var SymbolKind;
(function (SymbolKind) {
    const _fromMapping = Object.create(null);
    _fromMapping[types.SymbolKind.File] = 0 /* languages.SymbolKind.File */;
    _fromMapping[types.SymbolKind.Module] = 1 /* languages.SymbolKind.Module */;
    _fromMapping[types.SymbolKind.Namespace] = 2 /* languages.SymbolKind.Namespace */;
    _fromMapping[types.SymbolKind.Package] = 3 /* languages.SymbolKind.Package */;
    _fromMapping[types.SymbolKind.Class] = 4 /* languages.SymbolKind.Class */;
    _fromMapping[types.SymbolKind.Method] = 5 /* languages.SymbolKind.Method */;
    _fromMapping[types.SymbolKind.Property] = 6 /* languages.SymbolKind.Property */;
    _fromMapping[types.SymbolKind.Field] = 7 /* languages.SymbolKind.Field */;
    _fromMapping[types.SymbolKind.Constructor] = 8 /* languages.SymbolKind.Constructor */;
    _fromMapping[types.SymbolKind.Enum] = 9 /* languages.SymbolKind.Enum */;
    _fromMapping[types.SymbolKind.Interface] = 10 /* languages.SymbolKind.Interface */;
    _fromMapping[types.SymbolKind.Function] = 11 /* languages.SymbolKind.Function */;
    _fromMapping[types.SymbolKind.Variable] = 12 /* languages.SymbolKind.Variable */;
    _fromMapping[types.SymbolKind.Constant] = 13 /* languages.SymbolKind.Constant */;
    _fromMapping[types.SymbolKind.String] = 14 /* languages.SymbolKind.String */;
    _fromMapping[types.SymbolKind.Number] = 15 /* languages.SymbolKind.Number */;
    _fromMapping[types.SymbolKind.Boolean] = 16 /* languages.SymbolKind.Boolean */;
    _fromMapping[types.SymbolKind.Array] = 17 /* languages.SymbolKind.Array */;
    _fromMapping[types.SymbolKind.Object] = 18 /* languages.SymbolKind.Object */;
    _fromMapping[types.SymbolKind.Key] = 19 /* languages.SymbolKind.Key */;
    _fromMapping[types.SymbolKind.Null] = 20 /* languages.SymbolKind.Null */;
    _fromMapping[types.SymbolKind.EnumMember] = 21 /* languages.SymbolKind.EnumMember */;
    _fromMapping[types.SymbolKind.Struct] = 22 /* languages.SymbolKind.Struct */;
    _fromMapping[types.SymbolKind.Event] = 23 /* languages.SymbolKind.Event */;
    _fromMapping[types.SymbolKind.Operator] = 24 /* languages.SymbolKind.Operator */;
    _fromMapping[types.SymbolKind.TypeParameter] = 25 /* languages.SymbolKind.TypeParameter */;
    function from(kind) {
        return typeof _fromMapping[kind] === 'number' ? _fromMapping[kind] : 6 /* languages.SymbolKind.Property */;
    }
    SymbolKind.from = from;
    function to(kind) {
        for (const k in _fromMapping) {
            if (_fromMapping[k] === kind) {
                return Number(k);
            }
        }
        return types.SymbolKind.Property;
    }
    SymbolKind.to = to;
})(SymbolKind || (SymbolKind = {}));
export var SymbolTag;
(function (SymbolTag) {
    function from(kind) {
        switch (kind) {
            case types.SymbolTag.Deprecated: return 1 /* languages.SymbolTag.Deprecated */;
        }
    }
    SymbolTag.from = from;
    function to(kind) {
        switch (kind) {
            case 1 /* languages.SymbolTag.Deprecated */: return types.SymbolTag.Deprecated;
        }
    }
    SymbolTag.to = to;
})(SymbolTag || (SymbolTag = {}));
export var WorkspaceSymbol;
(function (WorkspaceSymbol) {
    function from(info) {
        return {
            name: info.name,
            kind: SymbolKind.from(info.kind),
            tags: info.tags && info.tags.map(SymbolTag.from),
            containerName: info.containerName,
            location: location.from(info.location)
        };
    }
    WorkspaceSymbol.from = from;
    function to(info) {
        const result = new types.SymbolInformation(info.name, SymbolKind.to(info.kind), info.containerName, location.to(info.location));
        result.tags = info.tags && info.tags.map(SymbolTag.to);
        return result;
    }
    WorkspaceSymbol.to = to;
})(WorkspaceSymbol || (WorkspaceSymbol = {}));
export var DocumentSymbol;
(function (DocumentSymbol) {
    function from(info) {
        const result = {
            name: info.name || '!!MISSING: name!!',
            detail: info.detail,
            range: Range.from(info.range),
            selectionRange: Range.from(info.selectionRange),
            kind: SymbolKind.from(info.kind),
            tags: info.tags?.map(SymbolTag.from) ?? []
        };
        if (info.children) {
            result.children = info.children.map(from);
        }
        return result;
    }
    DocumentSymbol.from = from;
    function to(info) {
        const result = new types.DocumentSymbol(info.name, info.detail, SymbolKind.to(info.kind), Range.to(info.range), Range.to(info.selectionRange));
        if (isNonEmptyArray(info.tags)) {
            result.tags = info.tags.map(SymbolTag.to);
        }
        if (info.children) {
            result.children = info.children.map(to);
        }
        return result;
    }
    DocumentSymbol.to = to;
})(DocumentSymbol || (DocumentSymbol = {}));
export var CallHierarchyItem;
(function (CallHierarchyItem) {
    function to(item) {
        const result = new types.CallHierarchyItem(SymbolKind.to(item.kind), item.name, item.detail || '', URI.revive(item.uri), Range.to(item.range), Range.to(item.selectionRange));
        result._sessionId = item._sessionId;
        result._itemId = item._itemId;
        return result;
    }
    CallHierarchyItem.to = to;
    function from(item, sessionId, itemId) {
        sessionId = sessionId ?? item._sessionId;
        itemId = itemId ?? item._itemId;
        if (sessionId === undefined || itemId === undefined) {
            throw new Error('invalid item');
        }
        return {
            _sessionId: sessionId,
            _itemId: itemId,
            name: item.name,
            detail: item.detail,
            kind: SymbolKind.from(item.kind),
            uri: item.uri,
            range: Range.from(item.range),
            selectionRange: Range.from(item.selectionRange),
            tags: item.tags?.map(SymbolTag.from)
        };
    }
    CallHierarchyItem.from = from;
})(CallHierarchyItem || (CallHierarchyItem = {}));
export var CallHierarchyIncomingCall;
(function (CallHierarchyIncomingCall) {
    function to(item) {
        return new types.CallHierarchyIncomingCall(CallHierarchyItem.to(item.from), item.fromRanges.map(r => Range.to(r)));
    }
    CallHierarchyIncomingCall.to = to;
})(CallHierarchyIncomingCall || (CallHierarchyIncomingCall = {}));
export var CallHierarchyOutgoingCall;
(function (CallHierarchyOutgoingCall) {
    function to(item) {
        return new types.CallHierarchyOutgoingCall(CallHierarchyItem.to(item.to), item.fromRanges.map(r => Range.to(r)));
    }
    CallHierarchyOutgoingCall.to = to;
})(CallHierarchyOutgoingCall || (CallHierarchyOutgoingCall = {}));
export var location;
(function (location) {
    function from(value) {
        return {
            range: value.range && Range.from(value.range),
            uri: value.uri
        };
    }
    location.from = from;
    function to(value) {
        return new types.Location(URI.revive(value.uri), Range.to(value.range));
    }
    location.to = to;
})(location || (location = {}));
export var DefinitionLink;
(function (DefinitionLink) {
    function from(value) {
        const definitionLink = value;
        const location = value;
        return {
            originSelectionRange: definitionLink.originSelectionRange
                ? Range.from(definitionLink.originSelectionRange)
                : undefined,
            uri: definitionLink.targetUri ? definitionLink.targetUri : location.uri,
            range: Range.from(definitionLink.targetRange ? definitionLink.targetRange : location.range),
            targetSelectionRange: definitionLink.targetSelectionRange
                ? Range.from(definitionLink.targetSelectionRange)
                : undefined,
        };
    }
    DefinitionLink.from = from;
    function to(value) {
        return {
            targetUri: URI.revive(value.uri),
            targetRange: Range.to(value.range),
            targetSelectionRange: value.targetSelectionRange
                ? Range.to(value.targetSelectionRange)
                : undefined,
            originSelectionRange: value.originSelectionRange
                ? Range.to(value.originSelectionRange)
                : undefined
        };
    }
    DefinitionLink.to = to;
})(DefinitionLink || (DefinitionLink = {}));
export var Hover;
(function (Hover) {
    function from(hover) {
        const convertedHover = {
            range: Range.from(hover.range),
            contents: MarkdownString.fromMany(hover.contents),
            canIncreaseVerbosity: hover.canIncreaseVerbosity,
            canDecreaseVerbosity: hover.canDecreaseVerbosity,
        };
        return convertedHover;
    }
    Hover.from = from;
    function to(info) {
        const contents = info.contents.map(MarkdownString.to);
        const range = Range.to(info.range);
        const canIncreaseVerbosity = info.canIncreaseVerbosity;
        const canDecreaseVerbosity = info.canDecreaseVerbosity;
        return new types.VerboseHover(contents, range, canIncreaseVerbosity, canDecreaseVerbosity);
    }
    Hover.to = to;
})(Hover || (Hover = {}));
export var EvaluatableExpression;
(function (EvaluatableExpression) {
    function from(expression) {
        return {
            range: Range.from(expression.range),
            expression: expression.expression
        };
    }
    EvaluatableExpression.from = from;
    function to(info) {
        return new types.EvaluatableExpression(Range.to(info.range), info.expression);
    }
    EvaluatableExpression.to = to;
})(EvaluatableExpression || (EvaluatableExpression = {}));
export var InlineValue;
(function (InlineValue) {
    function from(inlineValue) {
        if (inlineValue instanceof types.InlineValueText) {
            return {
                type: 'text',
                range: Range.from(inlineValue.range),
                text: inlineValue.text
            };
        }
        else if (inlineValue instanceof types.InlineValueVariableLookup) {
            return {
                type: 'variable',
                range: Range.from(inlineValue.range),
                variableName: inlineValue.variableName,
                caseSensitiveLookup: inlineValue.caseSensitiveLookup
            };
        }
        else if (inlineValue instanceof types.InlineValueEvaluatableExpression) {
            return {
                type: 'expression',
                range: Range.from(inlineValue.range),
                expression: inlineValue.expression
            };
        }
        else {
            throw new Error(`Unknown 'InlineValue' type`);
        }
    }
    InlineValue.from = from;
    function to(inlineValue) {
        switch (inlineValue.type) {
            case 'text':
                return {
                    range: Range.to(inlineValue.range),
                    text: inlineValue.text
                };
            case 'variable':
                return {
                    range: Range.to(inlineValue.range),
                    variableName: inlineValue.variableName,
                    caseSensitiveLookup: inlineValue.caseSensitiveLookup
                };
            case 'expression':
                return {
                    range: Range.to(inlineValue.range),
                    expression: inlineValue.expression
                };
        }
    }
    InlineValue.to = to;
})(InlineValue || (InlineValue = {}));
export var InlineValueContext;
(function (InlineValueContext) {
    function from(inlineValueContext) {
        return {
            frameId: inlineValueContext.frameId,
            stoppedLocation: Range.from(inlineValueContext.stoppedLocation)
        };
    }
    InlineValueContext.from = from;
    function to(inlineValueContext) {
        return new types.InlineValueContext(inlineValueContext.frameId, Range.to(inlineValueContext.stoppedLocation));
    }
    InlineValueContext.to = to;
})(InlineValueContext || (InlineValueContext = {}));
export var DocumentHighlight;
(function (DocumentHighlight) {
    function from(documentHighlight) {
        return {
            range: Range.from(documentHighlight.range),
            kind: documentHighlight.kind
        };
    }
    DocumentHighlight.from = from;
    function to(occurrence) {
        return new types.DocumentHighlight(Range.to(occurrence.range), occurrence.kind);
    }
    DocumentHighlight.to = to;
})(DocumentHighlight || (DocumentHighlight = {}));
export var MultiDocumentHighlight;
(function (MultiDocumentHighlight) {
    function from(multiDocumentHighlight) {
        return {
            uri: multiDocumentHighlight.uri,
            highlights: multiDocumentHighlight.highlights.map(DocumentHighlight.from)
        };
    }
    MultiDocumentHighlight.from = from;
    function to(multiDocumentHighlight) {
        return new types.MultiDocumentHighlight(URI.revive(multiDocumentHighlight.uri), multiDocumentHighlight.highlights.map(DocumentHighlight.to));
    }
    MultiDocumentHighlight.to = to;
})(MultiDocumentHighlight || (MultiDocumentHighlight = {}));
export var CompletionTriggerKind;
(function (CompletionTriggerKind) {
    function to(kind) {
        switch (kind) {
            case 1 /* languages.CompletionTriggerKind.TriggerCharacter */:
                return types.CompletionTriggerKind.TriggerCharacter;
            case 2 /* languages.CompletionTriggerKind.TriggerForIncompleteCompletions */:
                return types.CompletionTriggerKind.TriggerForIncompleteCompletions;
            case 0 /* languages.CompletionTriggerKind.Invoke */:
            default:
                return types.CompletionTriggerKind.Invoke;
        }
    }
    CompletionTriggerKind.to = to;
})(CompletionTriggerKind || (CompletionTriggerKind = {}));
export var CompletionContext;
(function (CompletionContext) {
    function to(context) {
        return {
            triggerKind: CompletionTriggerKind.to(context.triggerKind),
            triggerCharacter: context.triggerCharacter
        };
    }
    CompletionContext.to = to;
})(CompletionContext || (CompletionContext = {}));
export var CompletionItemTag;
(function (CompletionItemTag) {
    function from(kind) {
        switch (kind) {
            case types.CompletionItemTag.Deprecated: return 1 /* languages.CompletionItemTag.Deprecated */;
        }
    }
    CompletionItemTag.from = from;
    function to(kind) {
        switch (kind) {
            case 1 /* languages.CompletionItemTag.Deprecated */: return types.CompletionItemTag.Deprecated;
        }
    }
    CompletionItemTag.to = to;
})(CompletionItemTag || (CompletionItemTag = {}));
export var CompletionCommand;
(function (CompletionCommand) {
    function from(c, converter, disposables) {
        if ('icon' in c && 'command' in c) {
            return {
                command: converter.toInternal(c.command, disposables),
                icon: IconPath.fromThemeIcon(c.icon)
            };
        }
        return { command: converter.toInternal(c, disposables) };
    }
    CompletionCommand.from = from;
})(CompletionCommand || (CompletionCommand = {}));
export var CompletionItemKind;
(function (CompletionItemKind) {
    const _from = new Map([
        [types.CompletionItemKind.Method, 0 /* languages.CompletionItemKind.Method */],
        [types.CompletionItemKind.Function, 1 /* languages.CompletionItemKind.Function */],
        [types.CompletionItemKind.Constructor, 2 /* languages.CompletionItemKind.Constructor */],
        [types.CompletionItemKind.Field, 3 /* languages.CompletionItemKind.Field */],
        [types.CompletionItemKind.Variable, 4 /* languages.CompletionItemKind.Variable */],
        [types.CompletionItemKind.Class, 5 /* languages.CompletionItemKind.Class */],
        [types.CompletionItemKind.Interface, 7 /* languages.CompletionItemKind.Interface */],
        [types.CompletionItemKind.Struct, 6 /* languages.CompletionItemKind.Struct */],
        [types.CompletionItemKind.Module, 8 /* languages.CompletionItemKind.Module */],
        [types.CompletionItemKind.Property, 9 /* languages.CompletionItemKind.Property */],
        [types.CompletionItemKind.Unit, 12 /* languages.CompletionItemKind.Unit */],
        [types.CompletionItemKind.Value, 13 /* languages.CompletionItemKind.Value */],
        [types.CompletionItemKind.Constant, 14 /* languages.CompletionItemKind.Constant */],
        [types.CompletionItemKind.Enum, 15 /* languages.CompletionItemKind.Enum */],
        [types.CompletionItemKind.EnumMember, 16 /* languages.CompletionItemKind.EnumMember */],
        [types.CompletionItemKind.Keyword, 17 /* languages.CompletionItemKind.Keyword */],
        [types.CompletionItemKind.Snippet, 28 /* languages.CompletionItemKind.Snippet */],
        [types.CompletionItemKind.Text, 18 /* languages.CompletionItemKind.Text */],
        [types.CompletionItemKind.Color, 19 /* languages.CompletionItemKind.Color */],
        [types.CompletionItemKind.File, 20 /* languages.CompletionItemKind.File */],
        [types.CompletionItemKind.Reference, 21 /* languages.CompletionItemKind.Reference */],
        [types.CompletionItemKind.Folder, 23 /* languages.CompletionItemKind.Folder */],
        [types.CompletionItemKind.Event, 10 /* languages.CompletionItemKind.Event */],
        [types.CompletionItemKind.Operator, 11 /* languages.CompletionItemKind.Operator */],
        [types.CompletionItemKind.TypeParameter, 24 /* languages.CompletionItemKind.TypeParameter */],
        [types.CompletionItemKind.Issue, 26 /* languages.CompletionItemKind.Issue */],
        [types.CompletionItemKind.User, 25 /* languages.CompletionItemKind.User */],
    ]);
    function from(kind) {
        return _from.get(kind) ?? 9 /* languages.CompletionItemKind.Property */;
    }
    CompletionItemKind.from = from;
    const _to = new Map([
        [0 /* languages.CompletionItemKind.Method */, types.CompletionItemKind.Method],
        [1 /* languages.CompletionItemKind.Function */, types.CompletionItemKind.Function],
        [2 /* languages.CompletionItemKind.Constructor */, types.CompletionItemKind.Constructor],
        [3 /* languages.CompletionItemKind.Field */, types.CompletionItemKind.Field],
        [4 /* languages.CompletionItemKind.Variable */, types.CompletionItemKind.Variable],
        [5 /* languages.CompletionItemKind.Class */, types.CompletionItemKind.Class],
        [7 /* languages.CompletionItemKind.Interface */, types.CompletionItemKind.Interface],
        [6 /* languages.CompletionItemKind.Struct */, types.CompletionItemKind.Struct],
        [8 /* languages.CompletionItemKind.Module */, types.CompletionItemKind.Module],
        [9 /* languages.CompletionItemKind.Property */, types.CompletionItemKind.Property],
        [12 /* languages.CompletionItemKind.Unit */, types.CompletionItemKind.Unit],
        [13 /* languages.CompletionItemKind.Value */, types.CompletionItemKind.Value],
        [14 /* languages.CompletionItemKind.Constant */, types.CompletionItemKind.Constant],
        [15 /* languages.CompletionItemKind.Enum */, types.CompletionItemKind.Enum],
        [16 /* languages.CompletionItemKind.EnumMember */, types.CompletionItemKind.EnumMember],
        [17 /* languages.CompletionItemKind.Keyword */, types.CompletionItemKind.Keyword],
        [28 /* languages.CompletionItemKind.Snippet */, types.CompletionItemKind.Snippet],
        [18 /* languages.CompletionItemKind.Text */, types.CompletionItemKind.Text],
        [19 /* languages.CompletionItemKind.Color */, types.CompletionItemKind.Color],
        [20 /* languages.CompletionItemKind.File */, types.CompletionItemKind.File],
        [21 /* languages.CompletionItemKind.Reference */, types.CompletionItemKind.Reference],
        [23 /* languages.CompletionItemKind.Folder */, types.CompletionItemKind.Folder],
        [10 /* languages.CompletionItemKind.Event */, types.CompletionItemKind.Event],
        [11 /* languages.CompletionItemKind.Operator */, types.CompletionItemKind.Operator],
        [24 /* languages.CompletionItemKind.TypeParameter */, types.CompletionItemKind.TypeParameter],
        [25 /* languages.CompletionItemKind.User */, types.CompletionItemKind.User],
        [26 /* languages.CompletionItemKind.Issue */, types.CompletionItemKind.Issue],
    ]);
    function to(kind) {
        return _to.get(kind) ?? types.CompletionItemKind.Property;
    }
    CompletionItemKind.to = to;
})(CompletionItemKind || (CompletionItemKind = {}));
export var CompletionItem;
(function (CompletionItem) {
    function to(suggestion, converter) {
        const result = new types.CompletionItem(suggestion.label);
        result.insertText = suggestion.insertText;
        result.kind = CompletionItemKind.to(suggestion.kind);
        result.tags = suggestion.tags?.map(CompletionItemTag.to);
        result.detail = suggestion.detail;
        result.documentation = htmlContent.isMarkdownString(suggestion.documentation) ? MarkdownString.to(suggestion.documentation) : suggestion.documentation;
        result.sortText = suggestion.sortText;
        result.filterText = suggestion.filterText;
        result.preselect = suggestion.preselect;
        result.commitCharacters = suggestion.commitCharacters;
        // range
        if (editorRange.Range.isIRange(suggestion.range)) {
            result.range = Range.to(suggestion.range);
        }
        else if (typeof suggestion.range === 'object') {
            result.range = { inserting: Range.to(suggestion.range.insert), replacing: Range.to(suggestion.range.replace) };
        }
        result.keepWhitespace = typeof suggestion.insertTextRules === 'undefined' ? false : Boolean(suggestion.insertTextRules & 1 /* languages.CompletionItemInsertTextRule.KeepWhitespace */);
        // 'insertText'-logic
        if (typeof suggestion.insertTextRules !== 'undefined' && suggestion.insertTextRules & 4 /* languages.CompletionItemInsertTextRule.InsertAsSnippet */) {
            result.insertText = new types.SnippetString(suggestion.insertText);
        }
        else {
            result.insertText = suggestion.insertText;
            result.textEdit = result.range instanceof types.Range ? new types.TextEdit(result.range, result.insertText) : undefined;
        }
        if (suggestion.additionalTextEdits && suggestion.additionalTextEdits.length > 0) {
            result.additionalTextEdits = suggestion.additionalTextEdits.map(e => TextEdit.to(e));
        }
        result.command = converter && suggestion.command ? converter.fromInternal(suggestion.command) : undefined;
        return result;
    }
    CompletionItem.to = to;
})(CompletionItem || (CompletionItem = {}));
export var ParameterInformation;
(function (ParameterInformation) {
    function from(info) {
        if (typeof info.label !== 'string' && !Array.isArray(info.label)) {
            throw new TypeError('Invalid label');
        }
        return {
            label: info.label,
            documentation: MarkdownString.fromStrict(info.documentation)
        };
    }
    ParameterInformation.from = from;
    function to(info) {
        return {
            label: info.label,
            documentation: htmlContent.isMarkdownString(info.documentation) ? MarkdownString.to(info.documentation) : info.documentation
        };
    }
    ParameterInformation.to = to;
})(ParameterInformation || (ParameterInformation = {}));
export var SignatureInformation;
(function (SignatureInformation) {
    function from(info) {
        return {
            label: info.label,
            documentation: MarkdownString.fromStrict(info.documentation),
            parameters: Array.isArray(info.parameters) ? info.parameters.map(ParameterInformation.from) : [],
            activeParameter: info.activeParameter,
        };
    }
    SignatureInformation.from = from;
    function to(info) {
        return {
            label: info.label,
            documentation: htmlContent.isMarkdownString(info.documentation) ? MarkdownString.to(info.documentation) : info.documentation,
            parameters: Array.isArray(info.parameters) ? info.parameters.map(ParameterInformation.to) : [],
            activeParameter: info.activeParameter,
        };
    }
    SignatureInformation.to = to;
})(SignatureInformation || (SignatureInformation = {}));
export var SignatureHelp;
(function (SignatureHelp) {
    function from(help) {
        return {
            activeSignature: help.activeSignature,
            activeParameter: help.activeParameter,
            signatures: Array.isArray(help.signatures) ? help.signatures.map(SignatureInformation.from) : [],
        };
    }
    SignatureHelp.from = from;
    function to(help) {
        return {
            activeSignature: help.activeSignature,
            activeParameter: help.activeParameter,
            signatures: Array.isArray(help.signatures) ? help.signatures.map(SignatureInformation.to) : [],
        };
    }
    SignatureHelp.to = to;
})(SignatureHelp || (SignatureHelp = {}));
export var InlayHint;
(function (InlayHint) {
    function to(converter, hint) {
        const res = new types.InlayHint(Position.to(hint.position), typeof hint.label === 'string' ? hint.label : hint.label.map(InlayHintLabelPart.to.bind(undefined, converter)), hint.kind && InlayHintKind.to(hint.kind));
        res.textEdits = hint.textEdits && hint.textEdits.map(TextEdit.to);
        res.tooltip = htmlContent.isMarkdownString(hint.tooltip) ? MarkdownString.to(hint.tooltip) : hint.tooltip;
        res.paddingLeft = hint.paddingLeft;
        res.paddingRight = hint.paddingRight;
        return res;
    }
    InlayHint.to = to;
})(InlayHint || (InlayHint = {}));
export var InlayHintLabelPart;
(function (InlayHintLabelPart) {
    function to(converter, part) {
        const result = new types.InlayHintLabelPart(part.label);
        result.tooltip = htmlContent.isMarkdownString(part.tooltip)
            ? MarkdownString.to(part.tooltip)
            : part.tooltip;
        if (languages.Command.is(part.command)) {
            result.command = converter.fromInternal(part.command);
        }
        if (part.location) {
            result.location = location.to(part.location);
        }
        return result;
    }
    InlayHintLabelPart.to = to;
})(InlayHintLabelPart || (InlayHintLabelPart = {}));
export var InlayHintKind;
(function (InlayHintKind) {
    function from(kind) {
        return kind;
    }
    InlayHintKind.from = from;
    function to(kind) {
        return kind;
    }
    InlayHintKind.to = to;
})(InlayHintKind || (InlayHintKind = {}));
export var DocumentLink;
(function (DocumentLink) {
    function from(link) {
        return {
            range: Range.from(link.range),
            url: link.target,
            tooltip: link.tooltip
        };
    }
    DocumentLink.from = from;
    function to(link) {
        let target = undefined;
        if (link.url) {
            try {
                target = typeof link.url === 'string' ? URI.parse(link.url, true) : URI.revive(link.url);
            }
            catch (err) {
                // ignore
            }
        }
        const result = new types.DocumentLink(Range.to(link.range), target);
        result.tooltip = link.tooltip;
        return result;
    }
    DocumentLink.to = to;
})(DocumentLink || (DocumentLink = {}));
export var ColorPresentation;
(function (ColorPresentation) {
    function to(colorPresentation) {
        const cp = new types.ColorPresentation(colorPresentation.label);
        if (colorPresentation.textEdit) {
            cp.textEdit = TextEdit.to(colorPresentation.textEdit);
        }
        if (colorPresentation.additionalTextEdits) {
            cp.additionalTextEdits = colorPresentation.additionalTextEdits.map(value => TextEdit.to(value));
        }
        return cp;
    }
    ColorPresentation.to = to;
    function from(colorPresentation) {
        return {
            label: colorPresentation.label,
            textEdit: colorPresentation.textEdit ? TextEdit.from(colorPresentation.textEdit) : undefined,
            additionalTextEdits: colorPresentation.additionalTextEdits ? colorPresentation.additionalTextEdits.map(value => TextEdit.from(value)) : undefined
        };
    }
    ColorPresentation.from = from;
})(ColorPresentation || (ColorPresentation = {}));
export var Color;
(function (Color) {
    function to(c) {
        return new types.Color(c[0], c[1], c[2], c[3]);
    }
    Color.to = to;
    function from(color) {
        return [color.red, color.green, color.blue, color.alpha];
    }
    Color.from = from;
})(Color || (Color = {}));
export var SelectionRange;
(function (SelectionRange) {
    function from(obj) {
        return { range: Range.from(obj.range) };
    }
    SelectionRange.from = from;
    function to(obj) {
        return new types.SelectionRange(Range.to(obj.range));
    }
    SelectionRange.to = to;
})(SelectionRange || (SelectionRange = {}));
export var TextDocumentSaveReason;
(function (TextDocumentSaveReason) {
    function to(reason) {
        switch (reason) {
            case 2 /* SaveReason.AUTO */:
                return types.TextDocumentSaveReason.AfterDelay;
            case 1 /* SaveReason.EXPLICIT */:
                return types.TextDocumentSaveReason.Manual;
            case 3 /* SaveReason.FOCUS_CHANGE */:
            case 4 /* SaveReason.WINDOW_CHANGE */:
                return types.TextDocumentSaveReason.FocusOut;
        }
    }
    TextDocumentSaveReason.to = to;
})(TextDocumentSaveReason || (TextDocumentSaveReason = {}));
export var TextEditorLineNumbersStyle;
(function (TextEditorLineNumbersStyle) {
    function from(style) {
        switch (style) {
            case types.TextEditorLineNumbersStyle.Off:
                return 0 /* RenderLineNumbersType.Off */;
            case types.TextEditorLineNumbersStyle.Relative:
                return 2 /* RenderLineNumbersType.Relative */;
            case types.TextEditorLineNumbersStyle.Interval:
                return 3 /* RenderLineNumbersType.Interval */;
            case types.TextEditorLineNumbersStyle.On:
            default:
                return 1 /* RenderLineNumbersType.On */;
        }
    }
    TextEditorLineNumbersStyle.from = from;
    function to(style) {
        switch (style) {
            case 0 /* RenderLineNumbersType.Off */:
                return types.TextEditorLineNumbersStyle.Off;
            case 2 /* RenderLineNumbersType.Relative */:
                return types.TextEditorLineNumbersStyle.Relative;
            case 3 /* RenderLineNumbersType.Interval */:
                return types.TextEditorLineNumbersStyle.Interval;
            case 1 /* RenderLineNumbersType.On */:
            default:
                return types.TextEditorLineNumbersStyle.On;
        }
    }
    TextEditorLineNumbersStyle.to = to;
})(TextEditorLineNumbersStyle || (TextEditorLineNumbersStyle = {}));
export var EndOfLine;
(function (EndOfLine) {
    function from(eol) {
        if (eol === types.EndOfLine.CRLF) {
            return 1 /* EndOfLineSequence.CRLF */;
        }
        else if (eol === types.EndOfLine.LF) {
            return 0 /* EndOfLineSequence.LF */;
        }
        return undefined;
    }
    EndOfLine.from = from;
    function to(eol) {
        if (eol === 1 /* EndOfLineSequence.CRLF */) {
            return types.EndOfLine.CRLF;
        }
        else if (eol === 0 /* EndOfLineSequence.LF */) {
            return types.EndOfLine.LF;
        }
        return undefined;
    }
    EndOfLine.to = to;
})(EndOfLine || (EndOfLine = {}));
export var ProgressLocation;
(function (ProgressLocation) {
    function from(loc) {
        if (typeof loc === 'object') {
            return loc.viewId;
        }
        switch (loc) {
            case types.ProgressLocation.SourceControl: return 3 /* MainProgressLocation.Scm */;
            case types.ProgressLocation.Window: return 10 /* MainProgressLocation.Window */;
            case types.ProgressLocation.Notification: return 15 /* MainProgressLocation.Notification */;
        }
        throw new Error(`Unknown 'ProgressLocation'`);
    }
    ProgressLocation.from = from;
})(ProgressLocation || (ProgressLocation = {}));
export var FoldingRange;
(function (FoldingRange) {
    function from(r) {
        const range = { start: r.start + 1, end: r.end + 1 };
        if (r.kind) {
            range.kind = FoldingRangeKind.from(r.kind);
        }
        return range;
    }
    FoldingRange.from = from;
    function to(r) {
        const range = { start: r.start - 1, end: r.end - 1 };
        if (r.kind) {
            range.kind = FoldingRangeKind.to(r.kind);
        }
        return range;
    }
    FoldingRange.to = to;
})(FoldingRange || (FoldingRange = {}));
export var FoldingRangeKind;
(function (FoldingRangeKind) {
    function from(kind) {
        if (kind) {
            switch (kind) {
                case types.FoldingRangeKind.Comment:
                    return languages.FoldingRangeKind.Comment;
                case types.FoldingRangeKind.Imports:
                    return languages.FoldingRangeKind.Imports;
                case types.FoldingRangeKind.Region:
                    return languages.FoldingRangeKind.Region;
            }
        }
        return undefined;
    }
    FoldingRangeKind.from = from;
    function to(kind) {
        if (kind) {
            switch (kind.value) {
                case languages.FoldingRangeKind.Comment.value:
                    return types.FoldingRangeKind.Comment;
                case languages.FoldingRangeKind.Imports.value:
                    return types.FoldingRangeKind.Imports;
                case languages.FoldingRangeKind.Region.value:
                    return types.FoldingRangeKind.Region;
            }
        }
        return undefined;
    }
    FoldingRangeKind.to = to;
})(FoldingRangeKind || (FoldingRangeKind = {}));
export var TextEditorOpenOptions;
(function (TextEditorOpenOptions) {
    function from(options) {
        if (options) {
            return {
                pinned: typeof options.preview === 'boolean' ? !options.preview : undefined,
                inactive: options.background,
                preserveFocus: options.preserveFocus,
                selection: typeof options.selection === 'object' ? Range.from(options.selection) : undefined,
                override: typeof options.override === 'boolean' ? DEFAULT_EDITOR_ASSOCIATION.id : undefined
            };
        }
        return undefined;
    }
    TextEditorOpenOptions.from = from;
})(TextEditorOpenOptions || (TextEditorOpenOptions = {}));
export var GlobPattern;
(function (GlobPattern) {
    function from(pattern) {
        if (pattern instanceof types.RelativePattern) {
            return pattern.toJSON();
        }
        if (typeof pattern === 'string') {
            return pattern;
        }
        // This is slightly bogus because we declare this method to accept
        // `vscode.GlobPattern` which can be `vscode.RelativePattern` class,
        // but given we cannot enforce classes from our vscode.d.ts, we have
        // to probe for objects too
        // Refs: https://github.com/microsoft/vscode/issues/140771
        if (isRelativePatternShape(pattern) || isLegacyRelativePatternShape(pattern)) {
            return new types.RelativePattern(pattern.baseUri ?? pattern.base, pattern.pattern).toJSON();
        }
        return pattern; // preserve `undefined` and `null`
    }
    GlobPattern.from = from;
    function isRelativePatternShape(obj) {
        const rp = obj;
        if (!rp) {
            return false;
        }
        return URI.isUri(rp.baseUri) && typeof rp.pattern === 'string';
    }
    function isLegacyRelativePatternShape(obj) {
        // Before 1.64.x, `RelativePattern` did not have any `baseUri: Uri`
        // property. To preserve backwards compatibility with older extensions
        // we allow this old format when creating the `vscode.RelativePattern`.
        const rp = obj;
        if (!rp) {
            return false;
        }
        return typeof rp.base === 'string' && typeof rp.pattern === 'string';
    }
    function to(pattern) {
        if (typeof pattern === 'string') {
            return pattern;
        }
        return new types.RelativePattern(URI.revive(pattern.baseUri), pattern.pattern);
    }
    GlobPattern.to = to;
})(GlobPattern || (GlobPattern = {}));
export var LanguageSelector;
(function (LanguageSelector) {
    function from(selector) {
        if (!selector) {
            return undefined;
        }
        else if (Array.isArray(selector)) {
            return selector.map(from);
        }
        else if (typeof selector === 'string') {
            return selector;
        }
        else {
            const filter = selector; // TODO: microsoft/TypeScript#42768
            return {
                language: filter.language,
                scheme: filter.scheme,
                pattern: GlobPattern.from(filter.pattern) ?? undefined,
                exclusive: filter.exclusive,
                notebookType: filter.notebookType
            };
        }
    }
    LanguageSelector.from = from;
})(LanguageSelector || (LanguageSelector = {}));
export var NotebookRange;
(function (NotebookRange) {
    function from(range) {
        return { start: range.start, end: range.end };
    }
    NotebookRange.from = from;
    function to(range) {
        return new types.NotebookRange(range.start, range.end);
    }
    NotebookRange.to = to;
})(NotebookRange || (NotebookRange = {}));
export var NotebookCellExecutionSummary;
(function (NotebookCellExecutionSummary) {
    function to(data) {
        return {
            timing: typeof data.runStartTime === 'number' && typeof data.runEndTime === 'number' ? { startTime: data.runStartTime, endTime: data.runEndTime } : undefined,
            executionOrder: data.executionOrder,
            success: data.lastRunSuccess
        };
    }
    NotebookCellExecutionSummary.to = to;
    function from(data) {
        return {
            lastRunSuccess: data.success,
            runStartTime: data.timing?.startTime,
            runEndTime: data.timing?.endTime,
            executionOrder: data.executionOrder
        };
    }
    NotebookCellExecutionSummary.from = from;
})(NotebookCellExecutionSummary || (NotebookCellExecutionSummary = {}));
export var NotebookCellKind;
(function (NotebookCellKind) {
    function from(data) {
        switch (data) {
            case types.NotebookCellKind.Markup:
                return notebooks.CellKind.Markup;
            case types.NotebookCellKind.Code:
            default:
                return notebooks.CellKind.Code;
        }
    }
    NotebookCellKind.from = from;
    function to(data) {
        switch (data) {
            case notebooks.CellKind.Markup:
                return types.NotebookCellKind.Markup;
            case notebooks.CellKind.Code:
            default:
                return types.NotebookCellKind.Code;
        }
    }
    NotebookCellKind.to = to;
})(NotebookCellKind || (NotebookCellKind = {}));
export var NotebookData;
(function (NotebookData) {
    function from(data) {
        const res = {
            metadata: data.metadata ?? Object.create(null),
            cells: [],
        };
        for (const cell of data.cells) {
            types.NotebookCellData.validate(cell);
            res.cells.push(NotebookCellData.from(cell));
        }
        return res;
    }
    NotebookData.from = from;
    function to(data) {
        const res = new types.NotebookData(data.cells.map(NotebookCellData.to));
        if (!isEmptyObject(data.metadata)) {
            res.metadata = data.metadata;
        }
        return res;
    }
    NotebookData.to = to;
})(NotebookData || (NotebookData = {}));
export var NotebookCellData;
(function (NotebookCellData) {
    function from(data) {
        return {
            cellKind: NotebookCellKind.from(data.kind),
            language: data.languageId,
            mime: data.mime,
            source: data.value,
            metadata: data.metadata,
            internalMetadata: NotebookCellExecutionSummary.from(data.executionSummary ?? {}),
            outputs: data.outputs ? data.outputs.map(NotebookCellOutput.from) : []
        };
    }
    NotebookCellData.from = from;
    function to(data) {
        return new types.NotebookCellData(NotebookCellKind.to(data.cellKind), data.source, data.language, data.mime, data.outputs ? data.outputs.map(NotebookCellOutput.to) : undefined, data.metadata, data.internalMetadata ? NotebookCellExecutionSummary.to(data.internalMetadata) : undefined);
    }
    NotebookCellData.to = to;
})(NotebookCellData || (NotebookCellData = {}));
export var NotebookCellOutputItem;
(function (NotebookCellOutputItem) {
    function from(item) {
        return {
            mime: item.mime,
            valueBytes: VSBuffer.wrap(item.data),
        };
    }
    NotebookCellOutputItem.from = from;
    function to(item) {
        return new types.NotebookCellOutputItem(item.valueBytes.buffer, item.mime);
    }
    NotebookCellOutputItem.to = to;
})(NotebookCellOutputItem || (NotebookCellOutputItem = {}));
export var NotebookCellOutput;
(function (NotebookCellOutput) {
    function from(output) {
        return {
            outputId: output.id,
            items: output.items.map(NotebookCellOutputItem.from),
            metadata: output.metadata
        };
    }
    NotebookCellOutput.from = from;
    function to(output) {
        const items = output.items.map(NotebookCellOutputItem.to);
        return new types.NotebookCellOutput(items, output.outputId, output.metadata);
    }
    NotebookCellOutput.to = to;
})(NotebookCellOutput || (NotebookCellOutput = {}));
export var NotebookExclusiveDocumentPattern;
(function (NotebookExclusiveDocumentPattern) {
    function from(pattern) {
        if (isExclusivePattern(pattern)) {
            return {
                include: GlobPattern.from(pattern.include) ?? undefined,
                exclude: GlobPattern.from(pattern.exclude) ?? undefined,
            };
        }
        return GlobPattern.from(pattern) ?? undefined;
    }
    NotebookExclusiveDocumentPattern.from = from;
    function to(pattern) {
        if (isExclusivePattern(pattern)) {
            return {
                include: GlobPattern.to(pattern.include),
                exclude: GlobPattern.to(pattern.exclude)
            };
        }
        return GlobPattern.to(pattern);
    }
    NotebookExclusiveDocumentPattern.to = to;
    function isExclusivePattern(obj) {
        const ep = obj;
        if (!ep) {
            return false;
        }
        return !isUndefinedOrNull(ep.include) && !isUndefinedOrNull(ep.exclude);
    }
})(NotebookExclusiveDocumentPattern || (NotebookExclusiveDocumentPattern = {}));
export var NotebookStatusBarItem;
(function (NotebookStatusBarItem) {
    function from(item, commandsConverter, disposables) {
        const command = typeof item.command === 'string' ? { title: '', command: item.command } : item.command;
        return {
            alignment: item.alignment === types.NotebookCellStatusBarAlignment.Left ? 1 /* notebooks.CellStatusbarAlignment.Left */ : 2 /* notebooks.CellStatusbarAlignment.Right */,
            command: commandsConverter.toInternal(command, disposables), // TODO@roblou
            text: item.text,
            tooltip: item.tooltip,
            accessibilityInformation: item.accessibilityInformation,
            priority: item.priority
        };
    }
    NotebookStatusBarItem.from = from;
})(NotebookStatusBarItem || (NotebookStatusBarItem = {}));
export var NotebookKernelSourceAction;
(function (NotebookKernelSourceAction) {
    function from(item, commandsConverter, disposables) {
        const command = typeof item.command === 'string' ? { title: '', command: item.command } : item.command;
        return {
            command: commandsConverter.toInternal(command, disposables),
            label: item.label,
            description: item.description,
            detail: item.detail,
            documentation: item.documentation
        };
    }
    NotebookKernelSourceAction.from = from;
})(NotebookKernelSourceAction || (NotebookKernelSourceAction = {}));
export var NotebookDocumentContentOptions;
(function (NotebookDocumentContentOptions) {
    function from(options) {
        return {
            transientOutputs: options?.transientOutputs ?? false,
            transientCellMetadata: options?.transientCellMetadata ?? {},
            transientDocumentMetadata: options?.transientDocumentMetadata ?? {},
            cellContentMetadata: options?.cellContentMetadata ?? {}
        };
    }
    NotebookDocumentContentOptions.from = from;
})(NotebookDocumentContentOptions || (NotebookDocumentContentOptions = {}));
export var NotebookRendererScript;
(function (NotebookRendererScript) {
    function from(preload) {
        return {
            uri: preload.uri,
            provides: preload.provides
        };
    }
    NotebookRendererScript.from = from;
    function to(preload) {
        return new types.NotebookRendererScript(URI.revive(preload.uri), preload.provides);
    }
    NotebookRendererScript.to = to;
})(NotebookRendererScript || (NotebookRendererScript = {}));
export var TestMessage;
(function (TestMessage) {
    function from(message) {
        return {
            message: MarkdownString.fromStrict(message.message) || '',
            type: 0 /* TestMessageType.Error */,
            expected: message.expectedOutput,
            actual: message.actualOutput,
            contextValue: message.contextValue,
            location: message.location && ({ range: Range.from(message.location.range), uri: message.location.uri }),
            stackTrace: message.stackTrace?.map(s => ({
                label: s.label,
                position: s.position && Position.from(s.position),
                uri: s.uri && URI.revive(s.uri).toJSON(),
            })),
        };
    }
    TestMessage.from = from;
    function to(item) {
        const message = new types.TestMessage(typeof item.message === 'string' ? item.message : MarkdownString.to(item.message));
        message.actualOutput = item.actual;
        message.expectedOutput = item.expected;
        message.contextValue = item.contextValue;
        message.location = item.location ? location.to(item.location) : undefined;
        return message;
    }
    TestMessage.to = to;
})(TestMessage || (TestMessage = {}));
export var TestTag;
(function (TestTag) {
    TestTag.namespace = namespaceTestTag;
    TestTag.denamespace = denamespaceTestTag;
})(TestTag || (TestTag = {}));
export var TestRunProfile;
(function (TestRunProfile) {
    function from(item) {
        return {
            controllerId: item.controllerId,
            profileId: item.profileId,
            group: TestRunProfileKind.from(item.kind),
        };
    }
    TestRunProfile.from = from;
})(TestRunProfile || (TestRunProfile = {}));
export var TestRunProfileKind;
(function (TestRunProfileKind) {
    const profileGroupToBitset = {
        [types.TestRunProfileKind.Coverage]: 8 /* TestRunProfileBitset.Coverage */,
        [types.TestRunProfileKind.Debug]: 4 /* TestRunProfileBitset.Debug */,
        [types.TestRunProfileKind.Run]: 2 /* TestRunProfileBitset.Run */,
    };
    function from(kind) {
        return profileGroupToBitset.hasOwnProperty(kind) ? profileGroupToBitset[kind] : 2 /* TestRunProfileBitset.Run */;
    }
    TestRunProfileKind.from = from;
})(TestRunProfileKind || (TestRunProfileKind = {}));
export var TestItem;
(function (TestItem) {
    function from(item) {
        const ctrlId = getPrivateApiFor(item).controllerId;
        return {
            extId: TestId.fromExtHostTestItem(item, ctrlId).toString(),
            label: item.label,
            uri: URI.revive(item.uri),
            busy: item.busy,
            tags: item.tags.map(t => TestTag.namespace(ctrlId, t.id)),
            range: editorRange.Range.lift(Range.from(item.range)),
            description: item.description || null,
            sortText: item.sortText || null,
            error: item.error ? (MarkdownString.fromStrict(item.error) || null) : null,
        };
    }
    TestItem.from = from;
    function toPlain(item) {
        return {
            parent: undefined,
            error: undefined,
            id: TestId.fromString(item.extId).localId,
            label: item.label,
            uri: URI.revive(item.uri),
            tags: (item.tags || []).map(t => {
                const { tagId } = TestTag.denamespace(t);
                return new types.TestTag(tagId);
            }),
            children: {
                add: () => { },
                delete: () => { },
                forEach: () => { },
                *[Symbol.iterator]() { },
                get: () => undefined,
                replace: () => { },
                size: 0,
            },
            range: Range.to(item.range || undefined),
            canResolveChildren: false,
            busy: item.busy,
            description: item.description || undefined,
            sortText: item.sortText || undefined,
        };
    }
    TestItem.toPlain = toPlain;
})(TestItem || (TestItem = {}));
(function (TestTag) {
    function from(tag) {
        return { id: tag.id };
    }
    TestTag.from = from;
    function to(tag) {
        return new types.TestTag(tag.id);
    }
    TestTag.to = to;
})(TestTag || (TestTag = {}));
export var TestResults;
(function (TestResults) {
    const convertTestResultItem = (node, parent) => {
        const item = node.value;
        if (!item) {
            return undefined; // should be unreachable
        }
        const snapshot = ({
            ...TestItem.toPlain(item.item),
            parent,
            taskStates: item.tasks.map(t => ({
                state: t.state,
                duration: t.duration,
                messages: t.messages
                    .filter((m) => m.type === 0 /* TestMessageType.Error */)
                    .map(TestMessage.to),
            })),
            children: [],
        });
        if (node.children) {
            for (const child of node.children.values()) {
                const c = convertTestResultItem(child, snapshot);
                if (c) {
                    snapshot.children.push(c);
                }
            }
        }
        return snapshot;
    };
    function to(serialized) {
        const tree = new WellDefinedPrefixTree();
        for (const item of serialized.items) {
            tree.insert(TestId.fromString(item.item.extId).path, item);
        }
        // Get the first node with a value in each subtree of IDs.
        const queue = [tree.nodes];
        const roots = [];
        while (queue.length) {
            for (const node of queue.pop()) {
                if (node.value) {
                    roots.push(node);
                }
                else if (node.children) {
                    queue.push(node.children.values());
                }
            }
        }
        return {
            completedAt: serialized.completedAt,
            results: roots.map(r => convertTestResultItem(r)).filter(isDefined),
        };
    }
    TestResults.to = to;
})(TestResults || (TestResults = {}));
export var TestCoverage;
(function (TestCoverage) {
    function fromCoverageCount(count) {
        return { covered: count.covered, total: count.total };
    }
    function fromLocation(location) {
        return 'line' in location ? Position.from(location) : Range.from(location);
    }
    function toLocation(location) {
        if (!location) {
            return undefined;
        }
        return 'endLineNumber' in location ? Range.to(location) : Position.to(location);
    }
    function to(serialized) {
        if (serialized.type === 1 /* DetailType.Statement */) {
            const branches = [];
            if (serialized.branches) {
                for (const branch of serialized.branches) {
                    branches.push({
                        executed: branch.count,
                        location: toLocation(branch.location),
                        label: branch.label
                    });
                }
            }
            return new types.StatementCoverage(serialized.count, toLocation(serialized.location), serialized.branches?.map(b => new types.BranchCoverage(b.count, toLocation(b.location), b.label)));
        }
        else {
            return new types.DeclarationCoverage(serialized.name, serialized.count, toLocation(serialized.location));
        }
    }
    TestCoverage.to = to;
    function fromDetails(coverage) {
        if (typeof coverage.executed === 'number' && coverage.executed < 0) {
            throw new Error(`Invalid coverage count ${coverage.executed}`);
        }
        if ('branches' in coverage) {
            return {
                count: coverage.executed,
                location: fromLocation(coverage.location),
                type: 1 /* DetailType.Statement */,
                branches: coverage.branches.length
                    ? coverage.branches.map(b => ({ count: b.executed, location: b.location && fromLocation(b.location), label: b.label }))
                    : undefined,
            };
        }
        else {
            return {
                type: 0 /* DetailType.Declaration */,
                name: coverage.name,
                count: coverage.executed,
                location: fromLocation(coverage.location),
            };
        }
    }
    TestCoverage.fromDetails = fromDetails;
    function fromFile(controllerId, id, coverage) {
        types.validateTestCoverageCount(coverage.statementCoverage);
        types.validateTestCoverageCount(coverage.branchCoverage);
        types.validateTestCoverageCount(coverage.declarationCoverage);
        return {
            id,
            uri: coverage.uri,
            statement: fromCoverageCount(coverage.statementCoverage),
            branch: coverage.branchCoverage && fromCoverageCount(coverage.branchCoverage),
            declaration: coverage.declarationCoverage && fromCoverageCount(coverage.declarationCoverage),
            testIds: coverage instanceof types.FileCoverage && coverage.includesTests.length ?
                coverage.includesTests.map(t => TestId.fromExtHostTestItem(t, controllerId).toString()) : undefined,
        };
    }
    TestCoverage.fromFile = fromFile;
})(TestCoverage || (TestCoverage = {}));
export var CodeActionTriggerKind;
(function (CodeActionTriggerKind) {
    function to(value) {
        switch (value) {
            case 1 /* languages.CodeActionTriggerType.Invoke */:
                return types.CodeActionTriggerKind.Invoke;
            case 2 /* languages.CodeActionTriggerType.Auto */:
                return types.CodeActionTriggerKind.Automatic;
        }
    }
    CodeActionTriggerKind.to = to;
})(CodeActionTriggerKind || (CodeActionTriggerKind = {}));
export var TypeHierarchyItem;
(function (TypeHierarchyItem) {
    function to(item) {
        const result = new types.TypeHierarchyItem(SymbolKind.to(item.kind), item.name, item.detail || '', URI.revive(item.uri), Range.to(item.range), Range.to(item.selectionRange));
        result._sessionId = item._sessionId;
        result._itemId = item._itemId;
        return result;
    }
    TypeHierarchyItem.to = to;
    function from(item, sessionId, itemId) {
        sessionId = sessionId ?? item._sessionId;
        itemId = itemId ?? item._itemId;
        if (sessionId === undefined || itemId === undefined) {
            throw new Error('invalid item');
        }
        return {
            _sessionId: sessionId,
            _itemId: itemId,
            kind: SymbolKind.from(item.kind),
            name: item.name,
            detail: item.detail ?? '',
            uri: item.uri,
            range: Range.from(item.range),
            selectionRange: Range.from(item.selectionRange),
            tags: item.tags?.map(SymbolTag.from)
        };
    }
    TypeHierarchyItem.from = from;
})(TypeHierarchyItem || (TypeHierarchyItem = {}));
export var ViewBadge;
(function (ViewBadge) {
    function from(badge) {
        if (!badge) {
            return undefined;
        }
        return {
            value: badge.value,
            tooltip: badge.tooltip
        };
    }
    ViewBadge.from = from;
})(ViewBadge || (ViewBadge = {}));
export var DataTransferItem;
(function (DataTransferItem) {
    function to(mime, item, resolveFileData) {
        const file = item.fileData;
        if (file) {
            return new types.InternalFileDataTransferItem(new types.DataTransferFile(file.name, URI.revive(file.uri), file.id, createSingleCallFunction(() => resolveFileData(file.id))));
        }
        if (mime === Mimes.uriList && item.uriListData) {
            return new types.InternalDataTransferItem(reviveUriList(item.uriListData));
        }
        return new types.InternalDataTransferItem(item.asString);
    }
    DataTransferItem.to = to;
    async function from(mime, item, id = generateUuid()) {
        const stringValue = await item.asString();
        if (mime === Mimes.uriList) {
            return {
                id,
                asString: stringValue,
                fileData: undefined,
                uriListData: serializeUriList(stringValue),
            };
        }
        const fileValue = item.asFile();
        return {
            id,
            asString: stringValue,
            fileData: fileValue ? {
                name: fileValue.name,
                uri: fileValue.uri,
                id: fileValue._itemId ?? fileValue.id,
            } : undefined,
        };
    }
    DataTransferItem.from = from;
    function serializeUriList(stringValue) {
        return UriList.split(stringValue).map(part => {
            if (part.startsWith('#')) {
                return part;
            }
            try {
                return URI.parse(part);
            }
            catch {
                // noop
            }
            return part;
        });
    }
    function reviveUriList(parts) {
        return UriList.create(parts.map(part => {
            return typeof part === 'string' ? part : URI.revive(part);
        }));
    }
})(DataTransferItem || (DataTransferItem = {}));
export var DataTransfer;
(function (DataTransfer) {
    function toDataTransfer(value, resolveFileData) {
        const init = value.items.map(([type, item]) => {
            return [type, DataTransferItem.to(type, item, resolveFileData)];
        });
        return new types.DataTransfer(init);
    }
    DataTransfer.toDataTransfer = toDataTransfer;
    async function from(dataTransfer) {
        const items = await Promise.all(Array.from(dataTransfer, async ([mime, value]) => {
            return [mime, await DataTransferItem.from(mime, value)];
        }));
        return { items };
    }
    DataTransfer.from = from;
    async function fromList(dataTransfer) {
        const items = await Promise.all(Array.from(dataTransfer, async ([mime, value]) => {
            return [mime, await DataTransferItem.from(mime, value, value.id)];
        }));
        return { items };
    }
    DataTransfer.fromList = fromList;
})(DataTransfer || (DataTransfer = {}));
export var ChatFollowup;
(function (ChatFollowup) {
    function from(followup, request) {
        return {
            kind: 'reply',
            agentId: followup.participant ?? request?.agentId ?? '',
            subCommand: followup.command ?? request?.command,
            message: followup.prompt,
            title: followup.label
        };
    }
    ChatFollowup.from = from;
    function to(followup) {
        return {
            prompt: followup.message,
            label: followup.title,
            participant: followup.agentId,
            command: followup.subCommand,
        };
    }
    ChatFollowup.to = to;
})(ChatFollowup || (ChatFollowup = {}));
export var LanguageModelChatMessageRole;
(function (LanguageModelChatMessageRole) {
    function to(role) {
        switch (role) {
            case 0 /* chatProvider.ChatMessageRole.System */: return types.LanguageModelChatMessageRole.System;
            case 1 /* chatProvider.ChatMessageRole.User */: return types.LanguageModelChatMessageRole.User;
            case 2 /* chatProvider.ChatMessageRole.Assistant */: return types.LanguageModelChatMessageRole.Assistant;
        }
    }
    LanguageModelChatMessageRole.to = to;
    function from(role) {
        switch (role) {
            case types.LanguageModelChatMessageRole.System: return 0 /* chatProvider.ChatMessageRole.System */;
            case types.LanguageModelChatMessageRole.User: return 1 /* chatProvider.ChatMessageRole.User */;
            case types.LanguageModelChatMessageRole.Assistant: return 2 /* chatProvider.ChatMessageRole.Assistant */;
        }
        return 1 /* chatProvider.ChatMessageRole.User */;
    }
    LanguageModelChatMessageRole.from = from;
})(LanguageModelChatMessageRole || (LanguageModelChatMessageRole = {}));
export var LanguageModelChatMessage;
(function (LanguageModelChatMessage) {
    function to(message) {
        const content = message.content.map(c => {
            if (c.type === 'text') {
                return new LanguageModelTextPart(c.value, c.audience);
            }
            else if (c.type === 'tool_result') {
                const content = c.value.map(part => {
                    if (part.type === 'text') {
                        return new types.LanguageModelTextPart(part.value, part.audience);
                    }
                    else {
                        return new types.LanguageModelPromptTsxPart(part.value);
                    }
                });
                return new types.LanguageModelToolResultPart(c.toolCallId, content, c.isError);
            }
            else if (c.type === 'image_url') {
                // Non-stable types
                return undefined;
            }
            else if (c.type === 'tool_use') {
                return new types.LanguageModelToolCallPart(c.toolCallId, c.name, c.parameters);
            }
            return undefined;
        }).filter(c => c !== undefined);
        const role = LanguageModelChatMessageRole.to(message.role);
        const result = new types.LanguageModelChatMessage(role, content, message.name);
        return result;
    }
    LanguageModelChatMessage.to = to;
    function from(message) {
        const role = LanguageModelChatMessageRole.from(message.role);
        const name = message.name;
        let messageContent = message.content;
        if (typeof messageContent === 'string') {
            messageContent = [new types.LanguageModelTextPart(messageContent)];
        }
        const content = messageContent.map((c) => {
            if (c instanceof types.LanguageModelToolResultPart) {
                return {
                    type: 'tool_result',
                    toolCallId: c.callId,
                    value: coalesce(c.content.map(part => {
                        if (part instanceof types.LanguageModelTextPart) {
                            return {
                                type: 'text',
                                value: part.value,
                                audience: part.audience,
                            };
                        }
                        else if (part instanceof types.LanguageModelPromptTsxPart) {
                            return {
                                type: 'prompt_tsx',
                                value: part.value,
                            };
                        }
                        else {
                            // Strip unknown parts
                            return undefined;
                        }
                    })),
                    isError: c.isError
                };
            }
            else if (c instanceof types.LanguageModelToolCallPart) {
                return {
                    type: 'tool_use',
                    toolCallId: c.callId,
                    name: c.name,
                    parameters: c.input
                };
            }
            else if (c instanceof types.LanguageModelTextPart) {
                return {
                    type: 'text',
                    value: c.value
                };
            }
            else {
                if (typeof c !== 'string') {
                    throw new Error('Unexpected chat message content type');
                }
                return {
                    type: 'text',
                    value: c
                };
            }
        });
        return {
            role,
            name,
            content
        };
    }
    LanguageModelChatMessage.from = from;
})(LanguageModelChatMessage || (LanguageModelChatMessage = {}));
export var LanguageModelChatMessage2;
(function (LanguageModelChatMessage2) {
    function to(message) {
        const content = message.content.map(c => {
            if (c.type === 'text') {
                return new LanguageModelTextPart(c.value, c.audience);
            }
            else if (c.type === 'tool_result') {
                const content = c.value.map(part => {
                    if (part.type === 'text') {
                        return new types.LanguageModelTextPart(part.value, part.audience);
                    }
                    else if (part.type === 'data') {
                        return new types.LanguageModelDataPart(part.value.data.buffer, part.value.mimeType);
                    }
                    else {
                        return new types.LanguageModelPromptTsxPart(part.value);
                    }
                });
                return new types.LanguageModelToolResultPart2(c.toolCallId, content, c.isError);
            }
            else if (c.type === 'image_url') {
                return new types.LanguageModelDataPart(c.value.data.buffer, c.value.mimeType);
            }
            else if (c.type === 'data') {
                return new types.LanguageModelDataPart(c.data.buffer, c.mimeType);
            }
            else {
                return new types.LanguageModelToolCallPart(c.toolCallId, c.name, c.parameters);
            }
        });
        const role = LanguageModelChatMessageRole.to(message.role);
        const result = new types.LanguageModelChatMessage2(role, content, message.name);
        return result;
    }
    LanguageModelChatMessage2.to = to;
    function from(message) {
        const role = LanguageModelChatMessageRole.from(message.role);
        const name = message.name;
        let messageContent = message.content;
        if (typeof messageContent === 'string') {
            messageContent = [new types.LanguageModelTextPart(messageContent)];
        }
        const content = messageContent.map((c) => {
            if ((c instanceof types.LanguageModelToolResultPart2) || (c instanceof types.LanguageModelToolResultPart)) {
                return {
                    type: 'tool_result',
                    toolCallId: c.callId,
                    value: coalesce(c.content.map(part => {
                        if (part instanceof types.LanguageModelTextPart) {
                            return {
                                type: 'text',
                                value: part.value,
                                audience: part.audience,
                            };
                        }
                        else if (part instanceof types.LanguageModelPromptTsxPart) {
                            return {
                                type: 'prompt_tsx',
                                value: part.value,
                            };
                        }
                        else if (part instanceof types.LanguageModelDataPart) {
                            return {
                                type: 'data',
                                value: {
                                    mimeType: part.mimeType,
                                    data: VSBuffer.wrap(part.data)
                                },
                                audience: part.audience
                            };
                        }
                        else {
                            // Strip unknown parts
                            return undefined;
                        }
                    })),
                    isError: c.isError
                };
            }
            else if (c instanceof types.LanguageModelDataPart) {
                if (isImageDataPart(c)) {
                    const value = {
                        mimeType: c.mimeType,
                        data: VSBuffer.wrap(c.data),
                    };
                    return {
                        type: 'image_url',
                        value: value
                    };
                }
                else {
                    return {
                        type: 'data',
                        mimeType: c.mimeType,
                        data: VSBuffer.wrap(c.data),
                        audience: c.audience
                    };
                }
            }
            else if (c instanceof types.LanguageModelToolCallPart) {
                return {
                    type: 'tool_use',
                    toolCallId: c.callId,
                    name: c.name,
                    parameters: c.input
                };
            }
            else if (c instanceof types.LanguageModelTextPart) {
                return {
                    type: 'text',
                    value: c.value
                };
            }
            else {
                if (typeof c !== 'string') {
                    throw new Error('Unexpected chat message content type llm 2');
                }
                return {
                    type: 'text',
                    value: c
                };
            }
        });
        return {
            role,
            name,
            content
        };
    }
    LanguageModelChatMessage2.from = from;
})(LanguageModelChatMessage2 || (LanguageModelChatMessage2 = {}));
function isImageDataPart(part) {
    switch (part.mimeType) {
        case types.ChatImageMimeType.PNG:
        case types.ChatImageMimeType.JPEG:
        case types.ChatImageMimeType.GIF:
        case types.ChatImageMimeType.WEBP:
        case types.ChatImageMimeType.BMP:
            return true;
        default:
            return false;
    }
}
export var ChatResponseMarkdownPart;
(function (ChatResponseMarkdownPart) {
    function from(part) {
        return {
            kind: 'markdownContent',
            content: MarkdownString.from(part.value)
        };
    }
    ChatResponseMarkdownPart.from = from;
    function to(part) {
        return new types.ChatResponseMarkdownPart(MarkdownString.to(part.content));
    }
    ChatResponseMarkdownPart.to = to;
})(ChatResponseMarkdownPart || (ChatResponseMarkdownPart = {}));
export var ChatResponseCodeblockUriPart;
(function (ChatResponseCodeblockUriPart) {
    function from(part) {
        return {
            kind: 'codeblockUri',
            uri: part.value,
            isEdit: part.isEdit,
        };
    }
    ChatResponseCodeblockUriPart.from = from;
    function to(part) {
        return new types.ChatResponseCodeblockUriPart(URI.revive(part.uri), part.isEdit);
    }
    ChatResponseCodeblockUriPart.to = to;
})(ChatResponseCodeblockUriPart || (ChatResponseCodeblockUriPart = {}));
export var ChatResponseMarkdownWithVulnerabilitiesPart;
(function (ChatResponseMarkdownWithVulnerabilitiesPart) {
    function from(part) {
        return {
            kind: 'markdownVuln',
            content: MarkdownString.from(part.value),
            vulnerabilities: part.vulnerabilities,
        };
    }
    ChatResponseMarkdownWithVulnerabilitiesPart.from = from;
    function to(part) {
        return new types.ChatResponseMarkdownWithVulnerabilitiesPart(MarkdownString.to(part.content), part.vulnerabilities);
    }
    ChatResponseMarkdownWithVulnerabilitiesPart.to = to;
})(ChatResponseMarkdownWithVulnerabilitiesPart || (ChatResponseMarkdownWithVulnerabilitiesPart = {}));
export var ChatResponseConfirmationPart;
(function (ChatResponseConfirmationPart) {
    function from(part) {
        return {
            kind: 'confirmation',
            title: part.title,
            message: MarkdownString.from(part.message),
            data: part.data,
            buttons: part.buttons
        };
    }
    ChatResponseConfirmationPart.from = from;
})(ChatResponseConfirmationPart || (ChatResponseConfirmationPart = {}));
export var ChatResponseFilesPart;
(function (ChatResponseFilesPart) {
    function from(part) {
        const { value, baseUri } = part;
        function convert(items, baseUri) {
            return items.map(item => {
                const myUri = URI.joinPath(baseUri, item.name);
                return {
                    label: item.name,
                    uri: myUri,
                    children: item.children && convert(item.children, myUri)
                };
            });
        }
        return {
            kind: 'treeData',
            treeData: {
                label: basename(baseUri),
                uri: baseUri,
                children: convert(value, baseUri)
            }
        };
    }
    ChatResponseFilesPart.from = from;
    function to(part) {
        const treeData = revive(part.treeData);
        function convert(items) {
            return items.map(item => {
                return {
                    name: item.label,
                    children: item.children && convert(item.children)
                };
            });
        }
        const baseUri = treeData.uri;
        const items = treeData.children ? convert(treeData.children) : [];
        return new types.ChatResponseFileTreePart(items, baseUri);
    }
    ChatResponseFilesPart.to = to;
})(ChatResponseFilesPart || (ChatResponseFilesPart = {}));
export var ChatResponseMultiDiffPart;
(function (ChatResponseMultiDiffPart) {
    function from(part) {
        return {
            kind: 'multiDiffData',
            multiDiffData: {
                title: part.title,
                resources: part.value.map(entry => ({
                    originalUri: entry.originalUri,
                    modifiedUri: entry.modifiedUri,
                    goToFileUri: entry.goToFileUri
                }))
            }
        };
    }
    ChatResponseMultiDiffPart.from = from;
    function to(part) {
        const resources = part.multiDiffData.resources.map(resource => ({
            originalUri: resource.originalUri ? URI.revive(resource.originalUri) : undefined,
            modifiedUri: resource.modifiedUri ? URI.revive(resource.modifiedUri) : undefined,
            goToFileUri: resource.goToFileUri ? URI.revive(resource.goToFileUri) : undefined
        }));
        return new types.ChatResponseMultiDiffPart(resources, part.multiDiffData.title);
    }
    ChatResponseMultiDiffPart.to = to;
})(ChatResponseMultiDiffPart || (ChatResponseMultiDiffPart = {}));
export var ChatResponseAnchorPart;
(function (ChatResponseAnchorPart) {
    function from(part) {
        // Work around type-narrowing confusion between vscode.Uri and URI
        const isUri = (thing) => URI.isUri(thing);
        const isSymbolInformation = (thing) => 'name' in thing;
        return {
            kind: 'inlineReference',
            name: part.title,
            inlineReference: isUri(part.value)
                ? part.value
                : isSymbolInformation(part.value)
                    ? WorkspaceSymbol.from(part.value)
                    : Location.from(part.value)
        };
    }
    ChatResponseAnchorPart.from = from;
    function to(part) {
        const value = revive(part);
        return new types.ChatResponseAnchorPart(URI.isUri(value.inlineReference)
            ? value.inlineReference
            : 'location' in value.inlineReference
                ? WorkspaceSymbol.to(value.inlineReference)
                : Location.to(value.inlineReference), part.name);
    }
    ChatResponseAnchorPart.to = to;
})(ChatResponseAnchorPart || (ChatResponseAnchorPart = {}));
export var ChatResponseProgressPart;
(function (ChatResponseProgressPart) {
    function from(part) {
        return {
            kind: 'progressMessage',
            content: MarkdownString.from(part.value)
        };
    }
    ChatResponseProgressPart.from = from;
    function to(part) {
        return new types.ChatResponseProgressPart(part.content.value);
    }
    ChatResponseProgressPart.to = to;
})(ChatResponseProgressPart || (ChatResponseProgressPart = {}));
export var ChatResponseWarningPart;
(function (ChatResponseWarningPart) {
    function from(part) {
        return {
            kind: 'warning',
            content: MarkdownString.from(part.value)
        };
    }
    ChatResponseWarningPart.from = from;
    function to(part) {
        return new types.ChatResponseWarningPart(part.content.value);
    }
    ChatResponseWarningPart.to = to;
})(ChatResponseWarningPart || (ChatResponseWarningPart = {}));
export var ChatResponseExtensionsPart;
(function (ChatResponseExtensionsPart) {
    function from(part) {
        return {
            kind: 'extensions',
            extensions: part.extensions
        };
    }
    ChatResponseExtensionsPart.from = from;
})(ChatResponseExtensionsPart || (ChatResponseExtensionsPart = {}));
export var ChatResponsePullRequestPart;
(function (ChatResponsePullRequestPart) {
    function from(part) {
        return {
            kind: 'pullRequest',
            author: part.author,
            title: part.title,
            description: part.description,
            uri: part.uri,
            linkTag: part.linkTag
        };
    }
    ChatResponsePullRequestPart.from = from;
})(ChatResponsePullRequestPart || (ChatResponsePullRequestPart = {}));
export var ChatResponseMovePart;
(function (ChatResponseMovePart) {
    function from(part) {
        return {
            kind: 'move',
            uri: part.uri,
            range: Range.from(part.range),
        };
    }
    ChatResponseMovePart.from = from;
    function to(part) {
        return new types.ChatResponseMovePart(URI.revive(part.uri), Range.to(part.range));
    }
    ChatResponseMovePart.to = to;
})(ChatResponseMovePart || (ChatResponseMovePart = {}));
export var ChatPrepareToolInvocationPart;
(function (ChatPrepareToolInvocationPart) {
    function from(part) {
        return {
            kind: 'prepareToolInvocation',
            toolName: part.toolName,
        };
    }
    ChatPrepareToolInvocationPart.from = from;
    function to(part) {
        return new types.ChatPrepareToolInvocationPart(part.toolName);
    }
    ChatPrepareToolInvocationPart.to = to;
})(ChatPrepareToolInvocationPart || (ChatPrepareToolInvocationPart = {}));
export var ChatToolInvocationPart;
(function (ChatToolInvocationPart) {
    function from(part) {
        // Convert extension API ChatToolInvocationPart to internal serialized format
        return {
            kind: 'toolInvocationSerialized',
            toolCallId: part.toolCallId,
            toolId: part.toolName,
            invocationMessage: part.invocationMessage || part.toolName,
            originMessage: part.originMessage,
            pastTenseMessage: part.pastTenseMessage,
            isConfirmed: part.isConfirmed,
            isComplete: part.isComplete ?? true,
            isError: part.isError ?? false,
            resultDetails: undefined,
            toolSpecificData: part.toolSpecificData ? convertToolSpecificData(part.toolSpecificData) : undefined,
            presentation: undefined
        };
    }
    ChatToolInvocationPart.from = from;
    function convertToolSpecificData(data) {
        // Convert extension API terminal tool data to internal format
        if ('command' in data && 'language' in data) {
            // ChatTerminalToolInvocationData
            return {
                kind: 'terminal',
                command: data.command,
                language: data.language
            };
        }
        else if ('commandLine' in data && 'language' in data) {
            // ChatTerminalToolInvocationData2
            return {
                kind: 'terminal2',
                commandLine: data.commandLine,
                language: data.language
            };
        }
        return data;
    }
    function to(part) {
        const toolInvocation = new types.ChatToolInvocationPart(part.toolId || part.toolName, part.toolCallId, part.isError);
        if (part.invocationMessage) {
            toolInvocation.invocationMessage = part.invocationMessage;
        }
        if (part.originMessage) {
            toolInvocation.originMessage = part.originMessage;
        }
        if (part.pastTenseMessage) {
            toolInvocation.pastTenseMessage = part.pastTenseMessage;
        }
        if (part.isConfirmed !== undefined) {
            toolInvocation.isConfirmed = part.isConfirmed;
        }
        if (part.isComplete !== undefined) {
            toolInvocation.isComplete = part.isComplete;
        }
        if (part.toolSpecificData) {
            toolInvocation.toolSpecificData = convertFromInternalToolSpecificData(part.toolSpecificData);
        }
        return toolInvocation;
    }
    ChatToolInvocationPart.to = to;
    function convertFromInternalToolSpecificData(data) {
        // Convert internal terminal tool data to extension API format
        if (data.kind === 'terminal') {
            return {
                command: data.command,
                language: data.language
            };
        }
        else if (data.kind === 'terminal2') {
            return {
                commandLine: data.commandLine,
                language: data.language
            };
        }
        return data;
    }
})(ChatToolInvocationPart || (ChatToolInvocationPart = {}));
export var ChatTask;
(function (ChatTask) {
    function from(part) {
        return {
            kind: 'progressTask',
            content: MarkdownString.from(part.value),
        };
    }
    ChatTask.from = from;
})(ChatTask || (ChatTask = {}));
export var ChatTaskResult;
(function (ChatTaskResult) {
    function from(part) {
        return {
            kind: 'progressTaskResult',
            content: typeof part === 'string' ? MarkdownString.from(part) : undefined
        };
    }
    ChatTaskResult.from = from;
})(ChatTaskResult || (ChatTaskResult = {}));
export var ChatResponseCommandButtonPart;
(function (ChatResponseCommandButtonPart) {
    function from(part, commandsConverter, commandDisposables) {
        // If the command isn't in the converter, then this session may have been restored, and the command args don't exist anymore
        const command = commandsConverter.toInternal(part.value, commandDisposables) ?? { command: part.value.command, title: part.value.title };
        return {
            kind: 'command',
            command
        };
    }
    ChatResponseCommandButtonPart.from = from;
    function to(part, commandsConverter) {
        // If the command isn't in the converter, then this session may have been restored, and the command args don't exist anymore
        return new types.ChatResponseCommandButtonPart(commandsConverter.fromInternal(part.command) ?? { command: part.command.id, title: part.command.title });
    }
    ChatResponseCommandButtonPart.to = to;
})(ChatResponseCommandButtonPart || (ChatResponseCommandButtonPart = {}));
export var ChatResponseTextEditPart;
(function (ChatResponseTextEditPart) {
    function from(part) {
        return {
            kind: 'textEdit',
            uri: part.uri,
            edits: part.edits.map(e => TextEdit.from(e)),
            done: part.isDone
        };
    }
    ChatResponseTextEditPart.from = from;
    function to(part) {
        const result = new types.ChatResponseTextEditPart(URI.revive(part.uri), part.edits.map(e => TextEdit.to(e)));
        result.isDone = part.done;
        return result;
    }
    ChatResponseTextEditPart.to = to;
})(ChatResponseTextEditPart || (ChatResponseTextEditPart = {}));
export var NotebookEdit;
(function (NotebookEdit) {
    function from(edit) {
        if (edit.newCellMetadata) {
            return {
                editType: 3 /* CellEditType.Metadata */,
                index: edit.range.start,
                metadata: edit.newCellMetadata
            };
        }
        else if (edit.newNotebookMetadata) {
            return {
                editType: 5 /* CellEditType.DocumentMetadata */,
                metadata: edit.newNotebookMetadata
            };
        }
        else {
            return {
                editType: 1 /* CellEditType.Replace */,
                index: edit.range.start,
                count: edit.range.end - edit.range.start,
                cells: edit.newCells.map(NotebookCellData.from)
            };
        }
    }
    NotebookEdit.from = from;
})(NotebookEdit || (NotebookEdit = {}));
export var ChatResponseNotebookEditPart;
(function (ChatResponseNotebookEditPart) {
    function from(part) {
        return {
            kind: 'notebookEdit',
            uri: part.uri,
            edits: part.edits.map(NotebookEdit.from),
            done: part.isDone
        };
    }
    ChatResponseNotebookEditPart.from = from;
})(ChatResponseNotebookEditPart || (ChatResponseNotebookEditPart = {}));
export var ChatResponseReferencePart;
(function (ChatResponseReferencePart) {
    function from(part) {
        const iconPath = ThemeIcon.isThemeIcon(part.iconPath) ? part.iconPath
            : URI.isUri(part.iconPath) ? { light: URI.revive(part.iconPath) }
                : (part.iconPath && 'light' in part.iconPath && 'dark' in part.iconPath && URI.isUri(part.iconPath.light) && URI.isUri(part.iconPath.dark) ? { light: URI.revive(part.iconPath.light), dark: URI.revive(part.iconPath.dark) }
                    : undefined);
        if (typeof part.value === 'object' && 'variableName' in part.value) {
            return {
                kind: 'reference',
                reference: {
                    variableName: part.value.variableName,
                    value: URI.isUri(part.value.value) || !part.value.value ?
                        part.value.value :
                        Location.from(part.value.value)
                },
                iconPath,
                options: part.options
            };
        }
        return {
            kind: 'reference',
            reference: URI.isUri(part.value) || typeof part.value === 'string' ?
                part.value :
                Location.from(part.value),
            iconPath,
            options: part.options
        };
    }
    ChatResponseReferencePart.from = from;
    function to(part) {
        const value = revive(part);
        const mapValue = (value) => URI.isUri(value) ?
            value :
            Location.to(value);
        return new types.ChatResponseReferencePart(typeof value.reference === 'string' ? value.reference : 'variableName' in value.reference ? {
            variableName: value.reference.variableName,
            value: value.reference.value && mapValue(value.reference.value)
        } :
            mapValue(value.reference)); // 'value' is extended with variableName
    }
    ChatResponseReferencePart.to = to;
})(ChatResponseReferencePart || (ChatResponseReferencePart = {}));
export var ChatResponseCodeCitationPart;
(function (ChatResponseCodeCitationPart) {
    function from(part) {
        return {
            kind: 'codeCitation',
            value: part.value,
            license: part.license,
            snippet: part.snippet
        };
    }
    ChatResponseCodeCitationPart.from = from;
})(ChatResponseCodeCitationPart || (ChatResponseCodeCitationPart = {}));
export var ChatResponsePart;
(function (ChatResponsePart) {
    function from(part, commandsConverter, commandDisposables) {
        if (part instanceof types.ChatResponseMarkdownPart) {
            return ChatResponseMarkdownPart.from(part);
        }
        else if (part instanceof types.ChatResponseAnchorPart) {
            return ChatResponseAnchorPart.from(part);
        }
        else if (part instanceof types.ChatResponseReferencePart) {
            return ChatResponseReferencePart.from(part);
        }
        else if (part instanceof types.ChatResponseProgressPart) {
            return ChatResponseProgressPart.from(part);
        }
        else if (part instanceof types.ChatResponseFileTreePart) {
            return ChatResponseFilesPart.from(part);
        }
        else if (part instanceof types.ChatResponseMultiDiffPart) {
            return ChatResponseMultiDiffPart.from(part);
        }
        else if (part instanceof types.ChatResponseCommandButtonPart) {
            return ChatResponseCommandButtonPart.from(part, commandsConverter, commandDisposables);
        }
        else if (part instanceof types.ChatResponseTextEditPart) {
            return ChatResponseTextEditPart.from(part);
        }
        else if (part instanceof types.ChatResponseNotebookEditPart) {
            return ChatResponseNotebookEditPart.from(part);
        }
        else if (part instanceof types.ChatResponseMarkdownWithVulnerabilitiesPart) {
            return ChatResponseMarkdownWithVulnerabilitiesPart.from(part);
        }
        else if (part instanceof types.ChatResponseCodeblockUriPart) {
            return ChatResponseCodeblockUriPart.from(part);
        }
        else if (part instanceof types.ChatResponseWarningPart) {
            return ChatResponseWarningPart.from(part);
        }
        else if (part instanceof types.ChatResponseConfirmationPart) {
            return ChatResponseConfirmationPart.from(part);
        }
        else if (part instanceof types.ChatResponseCodeCitationPart) {
            return ChatResponseCodeCitationPart.from(part);
        }
        else if (part instanceof types.ChatResponseMovePart) {
            return ChatResponseMovePart.from(part);
        }
        else if (part instanceof types.ChatResponseExtensionsPart) {
            return ChatResponseExtensionsPart.from(part);
        }
        else if (part instanceof types.ChatPrepareToolInvocationPart) {
            return ChatPrepareToolInvocationPart.from(part);
        }
        else if (part instanceof types.ChatResponsePullRequestPart) {
            return ChatResponsePullRequestPart.from(part);
        }
        else if (part instanceof types.ChatToolInvocationPart) {
            return ChatToolInvocationPart.from(part);
        }
        return {
            kind: 'markdownContent',
            content: MarkdownString.from('')
        };
    }
    ChatResponsePart.from = from;
    function to(part, commandsConverter) {
        switch (part.kind) {
            case 'reference': return ChatResponseReferencePart.to(part);
            case 'markdownContent':
            case 'inlineReference':
            case 'progressMessage':
            case 'treeData':
            case 'command':
                return toContent(part, commandsConverter);
        }
        return undefined;
    }
    ChatResponsePart.to = to;
    function toContent(part, commandsConverter) {
        switch (part.kind) {
            case 'markdownContent': return ChatResponseMarkdownPart.to(part);
            case 'inlineReference': return ChatResponseAnchorPart.to(part);
            case 'progressMessage': return undefined;
            case 'treeData': return ChatResponseFilesPart.to(part);
            case 'command': return ChatResponseCommandButtonPart.to(part, commandsConverter);
        }
        return undefined;
    }
    ChatResponsePart.toContent = toContent;
})(ChatResponsePart || (ChatResponsePart = {}));
export var ChatAgentRequest;
(function (ChatAgentRequest) {
    function to(request, location2, model, diagnostics, tools, extension, logService) {
        const toolReferences = [];
        const variableReferences = [];
        for (const v of request.variables.variables) {
            if (v.kind === 'tool') {
                toolReferences.push(v);
            }
            else if (v.kind === 'toolset') {
                toolReferences.push(...v.value);
            }
            else {
                variableReferences.push(v);
            }
        }
        const requestWithAllProps = {
            id: request.requestId,
            prompt: request.message,
            command: request.command,
            attempt: request.attempt ?? 0,
            enableCommandDetection: request.enableCommandDetection ?? true,
            isParticipantDetected: request.isParticipantDetected ?? false,
            references: variableReferences
                .map(v => ChatPromptReference.to(v, diagnostics, logService))
                .filter(isDefined),
            toolReferences: toolReferences.map(ChatLanguageModelToolReference.to),
            location: ChatLocation.to(request.location),
            acceptedConfirmationData: request.acceptedConfirmationData,
            rejectedConfirmationData: request.rejectedConfirmationData,
            location2,
            toolInvocationToken: Object.freeze({ sessionId: request.sessionId }),
            tools,
            model,
            editedFileEvents: request.editedFileEvents,
            modeInstructions: request.modeInstructions,
        };
        if (!isProposedApiEnabled(extension, 'chatParticipantPrivate')) {
            delete requestWithAllProps.id;
            delete requestWithAllProps.attempt;
            delete requestWithAllProps.enableCommandDetection;
            delete requestWithAllProps.isParticipantDetected;
            delete requestWithAllProps.location;
            delete requestWithAllProps.location2;
            delete requestWithAllProps.editedFileEvents;
        }
        if (!isProposedApiEnabled(extension, 'chatParticipantAdditions')) {
            delete requestWithAllProps.acceptedConfirmationData;
            delete requestWithAllProps.rejectedConfirmationData;
            delete requestWithAllProps.tools;
        }
        return requestWithAllProps;
    }
    ChatAgentRequest.to = to;
})(ChatAgentRequest || (ChatAgentRequest = {}));
export var ChatRequestDraft;
(function (ChatRequestDraft) {
    function to(request) {
        return {
            prompt: request.prompt,
            files: request.files.map((uri) => URI.revive(uri))
        };
    }
    ChatRequestDraft.to = to;
})(ChatRequestDraft || (ChatRequestDraft = {}));
export var ChatLocation;
(function (ChatLocation) {
    function to(loc) {
        switch (loc) {
            case ChatAgentLocation.Notebook: return types.ChatLocation.Notebook;
            case ChatAgentLocation.Terminal: return types.ChatLocation.Terminal;
            case ChatAgentLocation.Panel: return types.ChatLocation.Panel;
            case ChatAgentLocation.Editor: return types.ChatLocation.Editor;
        }
    }
    ChatLocation.to = to;
    function from(loc) {
        switch (loc) {
            case types.ChatLocation.Notebook: return ChatAgentLocation.Notebook;
            case types.ChatLocation.Terminal: return ChatAgentLocation.Terminal;
            case types.ChatLocation.Panel: return ChatAgentLocation.Panel;
            case types.ChatLocation.Editor: return ChatAgentLocation.Editor;
        }
    }
    ChatLocation.from = from;
})(ChatLocation || (ChatLocation = {}));
export var ChatPromptReference;
(function (ChatPromptReference) {
    function to(variable, diagnostics, logService) {
        let value = variable.value;
        if (!value) {
            let varStr;
            try {
                varStr = JSON.stringify(variable);
            }
            catch {
                varStr = `kind=${variable.kind}, id=${variable.id}, name=${variable.name}`;
            }
            logService.error(`[ChatPromptReference] Ignoring invalid reference in variable: ${varStr}`);
            return undefined;
        }
        if (isUriComponents(value)) {
            value = URI.revive(value);
        }
        else if (value && typeof value === 'object' && 'uri' in value && 'range' in value && isUriComponents(value.uri)) {
            value = Location.to(revive(value));
        }
        else if (isImageVariableEntry(variable)) {
            const ref = variable.references?.[0]?.reference;
            value = new types.ChatReferenceBinaryData(variable.mimeType ?? 'image/png', () => Promise.resolve(new Uint8Array(Object.values(variable.value))), ref && URI.isUri(ref) ? ref : undefined);
        }
        else if (variable.kind === 'diagnostic') {
            const filterSeverity = variable.filterSeverity && DiagnosticSeverity.to(variable.filterSeverity);
            const filterUri = variable.filterUri && URI.revive(variable.filterUri).toString();
            value = new types.ChatReferenceDiagnostic(diagnostics.map(([uri, d]) => {
                if (variable.filterUri && uri.toString() !== filterUri) {
                    return [uri, []];
                }
                return [uri, d.filter(d => {
                        if (filterSeverity && d.severity > filterSeverity) {
                            return false;
                        }
                        if (variable.filterRange && !editorRange.Range.areIntersectingOrTouching(variable.filterRange, Range.from(d.range))) {
                            return false;
                        }
                        return true;
                    })];
            }).filter(([, d]) => d.length > 0));
        }
        return {
            id: variable.id,
            name: variable.name,
            range: variable.range && [variable.range.start, variable.range.endExclusive],
            value,
            modelDescription: variable.modelDescription,
        };
    }
    ChatPromptReference.to = to;
})(ChatPromptReference || (ChatPromptReference = {}));
export var ChatLanguageModelToolReference;
(function (ChatLanguageModelToolReference) {
    function to(variable) {
        const value = variable.value;
        if (value) {
            throw new Error('Invalid tool reference');
        }
        return {
            name: variable.id,
            range: variable.range && [variable.range.start, variable.range.endExclusive],
        };
    }
    ChatLanguageModelToolReference.to = to;
})(ChatLanguageModelToolReference || (ChatLanguageModelToolReference = {}));
export var ChatAgentCompletionItem;
(function (ChatAgentCompletionItem) {
    function from(item, commandsConverter, disposables) {
        return {
            id: item.id,
            label: item.label,
            fullName: item.fullName,
            icon: item.icon?.id,
            value: item.values[0].value,
            insertText: item.insertText,
            detail: item.detail,
            documentation: item.documentation,
            command: commandsConverter.toInternal(item.command, disposables),
        };
    }
    ChatAgentCompletionItem.from = from;
})(ChatAgentCompletionItem || (ChatAgentCompletionItem = {}));
export var ChatAgentResult;
(function (ChatAgentResult) {
    function to(result) {
        return {
            errorDetails: result.errorDetails,
            metadata: reviveMetadata(result.metadata),
            nextQuestion: result.nextQuestion,
            details: result.details,
        };
    }
    ChatAgentResult.to = to;
    function from(result) {
        return {
            errorDetails: result.errorDetails,
            metadata: result.metadata,
            nextQuestion: result.nextQuestion,
            details: result.details
        };
    }
    ChatAgentResult.from = from;
    function reviveMetadata(metadata) {
        return cloneAndChange(metadata, value => {
            if (value.$mid === 20 /* MarshalledId.LanguageModelToolResult */) {
                return new types.LanguageModelToolResult(cloneAndChange(value.content, reviveMetadata));
            }
            else if (value.$mid === 21 /* MarshalledId.LanguageModelTextPart */) {
                return new types.LanguageModelTextPart(value.value, value.audience);
            }
            else if (value.$mid === 22 /* MarshalledId.LanguageModelPromptTsxPart */) {
                return new types.LanguageModelPromptTsxPart(value.value);
            }
            return undefined;
        });
    }
})(ChatAgentResult || (ChatAgentResult = {}));
export var ChatAgentUserActionEvent;
(function (ChatAgentUserActionEvent) {
    function to(result, event, commandsConverter) {
        if (event.action.kind === 'vote') {
            // Is the "feedback" type
            return;
        }
        const ehResult = ChatAgentResult.to(result);
        if (event.action.kind === 'command') {
            const command = event.action.commandButton.command;
            const commandButton = {
                command: commandsConverter.fromInternal(command) ?? { command: command.id, title: command.title },
            };
            const commandAction = { kind: 'command', commandButton };
            return { action: commandAction, result: ehResult };
        }
        else if (event.action.kind === 'followUp') {
            const followupAction = { kind: 'followUp', followup: ChatFollowup.to(event.action.followup) };
            return { action: followupAction, result: ehResult };
        }
        else if (event.action.kind === 'inlineChat') {
            return { action: { kind: 'editor', accepted: event.action.action === 'accepted' }, result: ehResult };
        }
        else if (event.action.kind === 'chatEditingSessionAction') {
            const outcomes = new Map([
                ['accepted', types.ChatEditingSessionActionOutcome.Accepted],
                ['rejected', types.ChatEditingSessionActionOutcome.Rejected],
                ['saved', types.ChatEditingSessionActionOutcome.Saved],
            ]);
            return {
                action: {
                    kind: 'chatEditingSessionAction',
                    outcome: outcomes.get(event.action.outcome) ?? types.ChatEditingSessionActionOutcome.Rejected,
                    uri: URI.revive(event.action.uri),
                    hasRemainingEdits: event.action.hasRemainingEdits
                }, result: ehResult
            };
        }
        else if (event.action.kind === 'chatEditingHunkAction') {
            const outcomes = new Map([
                ['accepted', types.ChatEditingSessionActionOutcome.Accepted],
                ['rejected', types.ChatEditingSessionActionOutcome.Rejected],
            ]);
            return {
                action: {
                    kind: 'chatEditingHunkAction',
                    outcome: outcomes.get(event.action.outcome) ?? types.ChatEditingSessionActionOutcome.Rejected,
                    uri: URI.revive(event.action.uri),
                    hasRemainingEdits: event.action.hasRemainingEdits,
                    lineCount: event.action.lineCount
                }, result: ehResult
            };
        }
        else {
            return { action: event.action, result: ehResult };
        }
    }
    ChatAgentUserActionEvent.to = to;
})(ChatAgentUserActionEvent || (ChatAgentUserActionEvent = {}));
export var TerminalQuickFix;
(function (TerminalQuickFix) {
    function from(quickFix, converter, disposables) {
        if ('terminalCommand' in quickFix) {
            return { terminalCommand: quickFix.terminalCommand, shouldExecute: quickFix.shouldExecute };
        }
        if ('uri' in quickFix) {
            return { uri: quickFix.uri };
        }
        return converter.toInternal(quickFix, disposables);
    }
    TerminalQuickFix.from = from;
})(TerminalQuickFix || (TerminalQuickFix = {}));
export var TerminalCompletionItemDto;
(function (TerminalCompletionItemDto) {
    function from(item) {
        return {
            ...item,
            documentation: MarkdownString.fromStrict(item.documentation),
        };
    }
    TerminalCompletionItemDto.from = from;
})(TerminalCompletionItemDto || (TerminalCompletionItemDto = {}));
export var TerminalCompletionList;
(function (TerminalCompletionList) {
    function from(completions, pathSeparator) {
        if (Array.isArray(completions)) {
            return {
                items: completions.map(i => TerminalCompletionItemDto.from(i)),
            };
        }
        return {
            items: completions.items.map(i => TerminalCompletionItemDto.from(i)),
            resourceRequestConfig: completions.resourceRequestConfig ? TerminalResourceRequestConfig.from(completions.resourceRequestConfig, pathSeparator) : undefined,
        };
    }
    TerminalCompletionList.from = from;
})(TerminalCompletionList || (TerminalCompletionList = {}));
export var TerminalResourceRequestConfig;
(function (TerminalResourceRequestConfig) {
    function from(resourceRequestConfig, pathSeparator) {
        return {
            ...resourceRequestConfig,
            pathSeparator,
            cwd: resourceRequestConfig.cwd,
        };
    }
    TerminalResourceRequestConfig.from = from;
})(TerminalResourceRequestConfig || (TerminalResourceRequestConfig = {}));
export var PartialAcceptInfo;
(function (PartialAcceptInfo) {
    function to(info) {
        return {
            kind: PartialAcceptTriggerKind.to(info.kind),
            acceptedLength: info.acceptedLength,
        };
    }
    PartialAcceptInfo.to = to;
})(PartialAcceptInfo || (PartialAcceptInfo = {}));
export var PartialAcceptTriggerKind;
(function (PartialAcceptTriggerKind) {
    function to(kind) {
        switch (kind) {
            case 0 /* languages.PartialAcceptTriggerKind.Word */:
                return types.PartialAcceptTriggerKind.Word;
            case 1 /* languages.PartialAcceptTriggerKind.Line */:
                return types.PartialAcceptTriggerKind.Line;
            case 2 /* languages.PartialAcceptTriggerKind.Suggest */:
                return types.PartialAcceptTriggerKind.Suggest;
            default:
                return types.PartialAcceptTriggerKind.Unknown;
        }
    }
    PartialAcceptTriggerKind.to = to;
})(PartialAcceptTriggerKind || (PartialAcceptTriggerKind = {}));
export var InlineCompletionEndOfLifeReason;
(function (InlineCompletionEndOfLifeReason) {
    function to(reason, convertFn) {
        if (reason.kind === languages.InlineCompletionEndOfLifeReasonKind.Ignored) {
            const supersededBy = reason.supersededBy ? convertFn(reason.supersededBy) : undefined;
            return {
                kind: types.InlineCompletionEndOfLifeReasonKind.Ignored,
                supersededBy: supersededBy,
                userTypingDisagreed: reason.userTypingDisagreed,
            };
        }
        else if (reason.kind === languages.InlineCompletionEndOfLifeReasonKind.Accepted) {
            return {
                kind: types.InlineCompletionEndOfLifeReasonKind.Accepted,
            };
        }
        return {
            kind: types.InlineCompletionEndOfLifeReasonKind.Rejected,
        };
    }
    InlineCompletionEndOfLifeReason.to = to;
})(InlineCompletionEndOfLifeReason || (InlineCompletionEndOfLifeReason = {}));
export var DebugTreeItem;
(function (DebugTreeItem) {
    function from(item, id) {
        return {
            id,
            label: item.label,
            description: item.description,
            canEdit: item.canEdit,
            collapsibleState: (item.collapsibleState || 0 /* DebugTreeItemCollapsibleState.None */),
            contextValue: item.contextValue,
        };
    }
    DebugTreeItem.from = from;
})(DebugTreeItem || (DebugTreeItem = {}));
export var LanguageModelToolSource;
(function (LanguageModelToolSource) {
    function to(source) {
        if (source.type === 'mcp') {
            return new types.LanguageModelToolMCPSource(source.label, source.serverLabel || source.label, source.instructions);
        }
        else if (source.type === 'extension') {
            return new types.LanguageModelToolExtensionSource(source.extensionId.value, source.label);
        }
        else {
            return undefined;
        }
    }
    LanguageModelToolSource.to = to;
})(LanguageModelToolSource || (LanguageModelToolSource = {}));
export var LanguageModelToolResult;
(function (LanguageModelToolResult) {
    function to(result) {
        return new types.LanguageModelToolResult(result.content.map(item => {
            if (item.kind === 'text') {
                return new types.LanguageModelTextPart(item.value, item.audience);
            }
            else {
                return new types.LanguageModelPromptTsxPart(item.value);
            }
        }));
    }
    LanguageModelToolResult.to = to;
    function from(result, extension) {
        if (result.toolResultMessage) {
            checkProposedApiEnabled(extension, 'chatParticipantPrivate');
        }
        const checkAudienceApi = (item) => {
            if (item.audience) {
                checkProposedApiEnabled(extension, 'languageModelToolResultAudience');
            }
        };
        return {
            content: result.content.map(item => {
                if (item instanceof types.LanguageModelTextPart) {
                    checkAudienceApi(item);
                    return {
                        kind: 'text',
                        value: item.value,
                        audience: item.audience
                    };
                }
                else if (item instanceof types.LanguageModelPromptTsxPart) {
                    return {
                        kind: 'promptTsx',
                        value: item.value,
                    };
                }
                else {
                    throw new Error('Unknown LanguageModelToolResult part type');
                }
            }),
            toolResultMessage: MarkdownString.fromStrict(result.toolResultMessage),
            toolResultDetails: result.toolResultDetails?.map(detail => URI.isUri(detail) ? detail : Location.from(detail)),
        };
    }
    LanguageModelToolResult.from = from;
})(LanguageModelToolResult || (LanguageModelToolResult = {}));
export var LanguageModelToolResult2;
(function (LanguageModelToolResult2) {
    function to(result) {
        return new types.LanguageModelToolResult2(result.content.map(item => {
            if (item.kind === 'text') {
                return new types.LanguageModelTextPart(item.value, item.audience);
            }
            else if (item.kind === 'data') {
                return new types.LanguageModelDataPart(item.value.data.buffer, item.value.mimeType, item.audience);
            }
            else {
                return new types.LanguageModelPromptTsxPart(item.value);
            }
        }));
    }
    LanguageModelToolResult2.to = to;
    function from(result, extension) {
        if (result.toolResultMessage) {
            checkProposedApiEnabled(extension, 'chatParticipantPrivate');
        }
        const checkAudienceApi = (item) => {
            if (item.audience) {
                checkProposedApiEnabled(extension, 'languageModelToolResultAudience');
            }
        };
        let hasBuffers = false;
        let detailsDto = undefined;
        if (Array.isArray(result.toolResultDetails)) {
            detailsDto = result.toolResultDetails?.map(detail => {
                return URI.isUri(detail) ? detail : Location.from(detail);
            });
        }
        else {
            if (result.toolResultDetails2) {
                detailsDto = {
                    output: {
                        type: 'data',
                        mimeType: result.toolResultDetails2.mime,
                        value: VSBuffer.wrap(result.toolResultDetails2.value),
                    }
                };
                hasBuffers = true;
            }
        }
        const dto = {
            content: result.content.map(item => {
                if (item instanceof types.LanguageModelTextPart) {
                    checkAudienceApi(item);
                    return {
                        kind: 'text',
                        value: item.value,
                        audience: item.audience
                    };
                }
                else if (item instanceof types.LanguageModelPromptTsxPart) {
                    return {
                        kind: 'promptTsx',
                        value: item.value,
                    };
                }
                else if (item instanceof types.LanguageModelDataPart) {
                    checkAudienceApi(item);
                    hasBuffers = true;
                    return {
                        kind: 'data',
                        value: {
                            mimeType: item.mimeType,
                            data: VSBuffer.wrap(item.data)
                        },
                        audience: item.audience
                    };
                }
                else {
                    throw new Error('Unknown LanguageModelToolResult part type');
                }
            }),
            toolResultMessage: MarkdownString.fromStrict(result.toolResultMessage),
            toolResultDetails: detailsDto,
        };
        return hasBuffers ? new SerializableObjectWithBuffers(dto) : dto;
    }
    LanguageModelToolResult2.from = from;
})(LanguageModelToolResult2 || (LanguageModelToolResult2 = {}));
export var IconPath;
(function (IconPath) {
    function fromThemeIcon(iconPath) {
        return iconPath;
    }
    IconPath.fromThemeIcon = fromThemeIcon;
})(IconPath || (IconPath = {}));
export var AiSettingsSearch;
(function (AiSettingsSearch) {
    function fromSettingsSearchResult(result) {
        return {
            query: result.query,
            kind: fromSettingsSearchResultKind(result.kind),
            settings: result.settings
        };
    }
    AiSettingsSearch.fromSettingsSearchResult = fromSettingsSearchResult;
    function fromSettingsSearchResultKind(kind) {
        switch (kind) {
            case AiSettingsSearchResultKind.EMBEDDED:
                return AiSettingsSearchResultKind.EMBEDDED;
            case AiSettingsSearchResultKind.LLM_RANKED:
                return AiSettingsSearchResultKind.LLM_RANKED;
            case AiSettingsSearchResultKind.CANCELED:
                return AiSettingsSearchResultKind.CANCELED;
            default:
                throw new Error('Unknown AiSettingsSearchResultKind');
        }
    }
})(AiSettingsSearch || (AiSettingsSearch = {}));
export var McpServerDefinition;
(function (McpServerDefinition) {
    function isHttpConfig(candidate) {
        return !!candidate.uri;
    }
    function from(item) {
        return McpServerLaunch.toSerialized(isHttpConfig(item)
            ? {
                type: 2 /* McpServerTransportType.HTTP */,
                uri: item.uri,
                headers: Object.entries(item.headers),
            }
            : {
                type: 1 /* McpServerTransportType.Stdio */,
                cwd: item.cwd?.fsPath,
                args: item.args,
                command: item.command,
                env: item.env,
                envFile: undefined,
            });
    }
    McpServerDefinition.from = from;
})(McpServerDefinition || (McpServerDefinition = {}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdFR5cGVDb252ZXJ0ZXJzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvYWR2aWthci9Eb2N1bWVudHMvYXJjaGl0ZWN0L2FyY2gyL0FyY2hJREUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS9jb21tb24vZXh0SG9zdFR5cGVDb252ZXJ0ZXJzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBRSxPQUFPLEVBQUUsUUFBUSxFQUFFLGVBQWUsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ3BGLE9BQU8sRUFBRSxRQUFRLEVBQUUsWUFBWSxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDeEUsT0FBTyxFQUF3QyxPQUFPLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNyRyxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUM5RSxPQUFPLEtBQUssV0FBVyxNQUFNLHFDQUFxQyxDQUFDO0FBRW5FLE9BQU8sRUFBRSxXQUFXLEVBQUUsV0FBVyxFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFDdkUsT0FBTyxLQUFLLE1BQU0sTUFBTSx1Q0FBdUMsQ0FBQztBQUNoRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBRXBFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUNyRCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDakUsT0FBTyxFQUFtQixxQkFBcUIsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQzVGLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUM3RCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDOUQsT0FBTyxFQUFFLFNBQVMsRUFBRSxhQUFhLEVBQUUsUUFBUSxFQUFFLFFBQVEsRUFBRSxpQkFBaUIsRUFBRSxNQUFN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RSw4Q0FBc0MsS0FBSyxDQUFDLGtCQUFrQixDQUFDLE1BQU0sQ0FBQztRQUN0RSxnREFBd0MsS0FBSyxDQUFDLGtCQUFrQixDQUFDLFFBQVEsQ0FBQztRQUMxRSxtREFBMkMsS0FBSyxDQUFDLGtCQUFrQixDQUFDLFdBQVcsQ0FBQztRQUNoRiw2Q0FBcUMsS0FBSyxDQUFDLGtCQUFrQixDQUFDLEtBQUssQ0FBQztRQUNwRSxnREFBd0MsS0FBSyxDQUFDLGtCQUFrQixDQUFDLFFBQVEsQ0FBQztRQUMxRSw2Q0FBcUMsS0FBSyxDQUFDLGtCQUFrQixDQUFDLEtBQUssQ0FBQztRQUNwRSxpREFBeUMsS0FBSyxDQUFDLGtCQUFrQixDQUFDLFNBQVMsQ0FBQztRQUM1RSw4Q0FBc0MsS0FBSyxDQUFDLGtCQUFrQixDQUFDLE1BQU0sQ0FBQztRQUN0RSw4Q0FBc0MsS0FBSyxDQUFDLGtCQUFrQixDQUFDLE1BQU0sQ0FBQztRQUN0RSxnREFBd0MsS0FBSyxDQUFDLGtCQUFrQixDQUFDLFFBQVEsQ0FBQztRQUMxRSw2Q0FBb0MsS0FBSyxDQUFDLGtCQUFrQixDQUFDLElBQUksQ0FBQztRQUNsRSw4Q0FBcUMsS0FBSyxDQUFDLGtCQUFrQixDQUFDLEtBQUssQ0FBQztRQUNwRSxpREFBd0MsS0FBSyxDQUFDLGtCQUFrQixDQUFDLFFBQVEsQ0FBQztRQUMxRSw2Q0FBb0MsS0FBSyxDQUFDLGtCQUFrQixDQUFDLElBQUksQ0FBQztRQUNsRSxtREFBMEMsS0FBSyxDQUFDLGtCQUFrQixDQUFDLFVBQVUsQ0FBQztRQUM5RSxnREFBdUMsS0FBSyxDQUFDLGtCQUFrQixDQUFDLE9BQU8sQ0FBQztRQUN4RSxnREFBdUMsS0FBSyxDQUFDLGtCQUFrQixDQUFDLE9BQU8sQ0FBQztRQUN4RSw2Q0FBb0MsS0FBSyxDQUFDLGtCQUFrQixDQUFDLElBQUksQ0FBQztRQUNsRSw4Q0FBcUMsS0FBSyxDQUFDLGtCQUFrQixDQUFDLEtBQUssQ0FBQztRQUNwRSw2Q0FBb0MsS0FBSyxDQUFDLGtCQUFrQixDQUFDLElBQUksQ0FBQztRQUNs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