/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import * as nls from '../../../../nls.js';
import { sep } from '../../../../base/common/path.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { Extensions as ConfigurationExtensions } from '../../../../platform/configuration/common/configurationRegistry.js';
import { registerWorkbenchContribution2 } from '../../../common/contributions.js';
import { EditorExtensions } from '../../../common/editor.js';
import { AutoSaveConfiguration, HotExitConfiguration, FILES_EXCLUDE_CONFIG, FILES_ASSOCIATIONS_CONFIG, FILES_READONLY_INCLUDE_CONFIG, FILES_READONLY_EXCLUDE_CONFIG, FILES_READONLY_FROM_PERMISSIONS_CONFIG } from '../../../../platform/files/common/files.js';
import { FILE_EDITOR_INPUT_ID, BINARY_TEXT_FILE_MODE } from '../common/files.js';
import { TextFileEditorTracker } from './editors/textFileEditorTracker.js';
import { TextFileSaveErrorHandler } from './editors/textFileSaveErrorHandler.js';
import { FileEditorInput } from './editors/fileEditorInput.js';
import { BinaryFileEditor } from './editors/binaryFileEditor.js';
import { SyncDescriptor } from '../../../../platform/instantiation/common/descriptors.js';
import { isNative, isWeb, isWindows } from '../../../../base/common/platform.js';
import { ExplorerViewletViewsContribution } from './explorerViewlet.js';
import { EditorPaneDescriptor } from '../../../browser/editor.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { ExplorerService, UNDO_REDO_SOURCE } from './explorerService.js';
import { GUESSABLE_ENCODINGS, SUPPORTED_ENCODINGS } from '../../../services/textfile/common/encoding.js';
import { Schemas } from '../../../../base/common/network.js';
import { WorkspaceWatcher } from './workspaceWatcher.js';
import { editorConfigurationBaseNode } from '../../../../editor/common/config/editorConfigurationSchema.js';
import { DirtyFilesIndicator } from '../common/dirtyFilesIndicator.js';
import { UndoCommand, RedoCommand } from '../../../../editor/browser/editorExtensions.js';
import { IUndoRedoService } from '../../../../platform/undoRedo/common/undoRedo.js';
import { IExplorerService } from './files.js';
import { FileEditorInputSerializer, FileEditorWorkingCopyEditorHandler } from './editors/fileEditorHandler.js';
import { ModesRegistry } from '../../../../editor/common/languages/modesRegistry.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { TextFileEditor } from './editors/textFileEditor.js';
let FileUriLabelContribution = class FileUriLabelContribution {
    static { this.ID = 'workbench.contrib.fileUriLabel'; }
    constructor(labelService) {
        labelService.registerFormatter({
            scheme: Schemas.file,
            formatting: {
                label: '${authority}${path}',
                separator: sep,
                tildify: !isWindows,
                normalizeDriveLetter: isWindows,
                authorityPrefix: sep + sep,
                workspaceSuffix: ''
            }
        });
    }
};
FileUriLabelContribution = __decorate([
    __param(0, ILabelService)
], FileUriLabelContribution);
registerSingleton(IExplorerService, ExplorerService, 1 /* InstantiationType.Delayed */);
// Register file editors
Registry.as(EditorExtensions.EditorPane).registerEditorPane(EditorPaneDescriptor.create(TextFileEditor, TextFileEditor.ID, nls.localize('textFileEditor', "Text File Editor")), [
    new SyncDescriptor(FileEditorInput)
]);
Registry.as(EditorExtensions.EditorPane).registerEditorPane(EditorPaneDescriptor.create(BinaryFileEditor, BinaryFileEditor.ID, nls.localize('binaryFileEditor', "Binary File Editor")), [
    new SyncDescriptor(FileEditorInput)
]);
// Register default file input factory
Registry.as(EditorExtensions.EditorFactory).registerFileEditorFactory({
    typeId: FILE_EDITOR_INPUT_ID,
    createFileEditor: (resource, preferredResource, preferredName, preferredDescription, preferredEncoding, preferredLanguageId, preferredContents, instantiationService) => {
        return instantiationService.createInstance(FileEditorInput, resource, preferredResource, preferredName, preferredDescription, preferredEncoding, preferredLanguageId, preferredContents);
    },
    isFileEditor: (obj) => {
        return obj instanceof FileEditorInput;
    }
});
// Register Editor Input Serializer & Handler
Registry.as(EditorExtensions.EditorFactory).registerEditorSerializer(FILE_EDITOR_INPUT_ID, FileEditorInputSerializer);
registerWorkbenchContribution2(FileEditorWorkingCopyEditorHandler.ID, FileEditorWorkingCopyEditorHandler, 2 /* WorkbenchPhase.BlockRestore */);
// Register Explorer views
registerWorkbenchContribution2(ExplorerViewletViewsContribution.ID, ExplorerViewletViewsContribution, 1 /* WorkbenchPhase.BlockStartup */);
// Register Text File Editor Tracker
registerWorkbenchContribution2(TextFileEditorTracker.ID, TextFileEditorTracker, 1 /* WorkbenchPhase.BlockStartup */);
// Register Text File Save Error Handler
registerWorkbenchContribution2(TextFileSaveErrorHandler.ID, TextFileSaveErrorHandler, 1 /* WorkbenchPhase.BlockStartup */);
// Register uri display for file uris
registerWorkbenchContribution2(FileUriLabelContribution.ID, FileUriLabelContribution, 1 /* WorkbenchPhase.BlockStartup */);
// Register Workspace Watcher
registerWorkbenchContribution2(WorkspaceWatcher.ID, WorkspaceWatcher, 3 /* WorkbenchPhase.AfterRestored */);
// Register Dirty Files Indicator
registerWorkbenchContribution2(DirtyFilesIndicator.ID, DirtyFilesIndicator, 1 /* WorkbenchPhase.BlockStartup */);
// Configuration
const configurationRegistry = Registry.as(ConfigurationExtensions.Configuration);
const hotExitConfiguration = isNative ?
    {
        'type': 'string',
        'scope': 1 /* ConfigurationScope.APPLICATION */,
        'enum': [HotExitConfiguration.OFF, HotExitConfiguration.ON_EXIT, HotExitConfiguration.ON_EXIT_AND_WINDOW_CLOSE],
        'default': HotExitConfiguration.ON_EXIT,
        'markdownEnumDescriptions': [
            nls.localize('hotExit.off', 'Disable hot exit. A prompt will show when attempting to close a window with editors that have unsaved changes.'),
            nls.localize('hotExit.onExit', 'Hot exit will be triggered when the last window is closed on Windows/Linux or when the `workbench.action.quit` command is triggered (command palette, keybinding, menu). All windows without folders opened will be restored upon next launch. A list of previously opened windows with unsaved files can be accessed via `File > Open Recent > More...`'),
            nls.localize('hotExit.onExitAndWindowClose', 'Hot exit will be triggered when the last window is closed on Windows/Linux or when the `workbench.action.quit` command is triggered (command palette, keybinding, menu), and also for any window with a folder opened regardless of whether it\'s the last window. All windows without folders opened will be restored upon next launch. A list of previously opened windows with unsaved files can be accessed via `File > Open Recent > More...`')
        ],
        'markdownDescription': nls.localize('hotExit', "[Hot Exit](https://aka.ms/vscode-hot-exit) controls whether unsaved files are remembered between sessions, allowing the save prompt when exiting the editor to be skipped.", HotExitConfiguration.ON_EXIT, HotExitConfiguration.ON_EXIT_AND_WINDOW_CLOSE)
    } : {
    'type': 'string',
    'scope': 1 /* ConfigurationScope.APPLICATION */,
    'enum': [HotExitConfiguration.OFF, HotExitConfiguration.ON_EXIT_AND_WINDOW_CLOSE],
    'default': HotExitConfiguration.ON_EXIT_AND_WINDOW_CLOSE,
    'markdownEnumDescriptions': [
        nls.localize('hotExit.off', 'Disable hot exit. A prompt will show when attempting to close a window with editors that have unsaved changes.'),
        nls.localize('hotExit.onExitAndWindowCloseBrowser', 'Hot exit will be triggered when the browser quits or the window or tab is closed.')
    ],
    'markdownDescription': nls.localize('hotExit', "[Hot Exit](https://aka.ms/vscode-hot-exit) controls whether unsaved files are remembered between sessions, allowing the save prompt when exiting the editor to be skipped.", HotExitConfiguration.ON_EXIT, HotExitConfiguration.ON_EXIT_AND_WINDOW_CLOSE)
};
configurationRegistry.registerConfiguration({
    'id': 'files',
    'order': 9,
    'title': nls.localize('filesConfigurationTitle', "Files"),
    'type': 'object',
    'properties': {
        [FILES_EXCLUDE_CONFIG]: {
            'type': 'object',
            'markdownDescription': nls.localize('exclude', "Configure [glob patterns](https://aka.ms/vscode-glob-patterns) for excluding files and folders. For example, the File Explorer decides which files and folders to show or hide based on this setting. Refer to the `#search.exclude#` setting to define search-specific excludes. Refer to the `#explorer.excludeGitIgnore#` setting for ignoring files based on your `.gitignore`."),
            'default': {
                ...{ '**/.git': true, '**/.svn': true, '**/.hg': true, '**/.DS_Store': true, '**/Thumbs.db': true },
                ...(isWeb ? { '**/*.crswap': true /* filter out swap files used for local file access */ } : undefined)
            },
            'scope': 5 /* ConfigurationScope.RESOURCE */,
            'additionalProperties': {
                'anyOf': [
                    {
                        'type': 'boolean',
                        'enum': [true, false],
                        'enumDescriptions': [nls.localize('trueDescription', "Enable the pattern."), nls.localize('falseDescription', "Disable the pattern.")],
                        'description': nls.localize('files.exclude.boolean', "The glob pattern to match file paths against. Set to true or false to enable or disable the pattern."),
                    },
                    {
                        'type': 'object',
                        'properties': {
                            'when': {
                                'type': 'string', // expression ({ "**/*.js": { "when": "$(basename).js" } })
                                'pattern': '\\w*\\$\\(basename\\)\\w*',
                                'default': '$(basename).ext',
                                'markdownDescription': nls.localize({ key: 'files.exclude.when', comment: ['\\$(basename) should not be translated'] }, "Additional check on the siblings of a matching file. Use \\$(basename) as variable for the matching file name.")
                            }
                        }
                    }
                ]
            }
        },
        [FILES_ASSOCIATIONS_CONFIG]: {
            'type': 'object',
            'markdownDescription': nls.localize('associations', "Configure [glob patterns](https://aka.ms/vscode-glob-patterns) of file associations to languages (for example `\"*.extension\": \"html\"`). Patterns will match on the absolute path of a file if they contain a path separator and will match on the name of the file otherwise. These have precedence over the default associations of the languages installed."),
            'additionalProperties': {
                'type': 'string'
            }
        },
        'files.encoding': {
            'type': 'string',
            'enum': Object.keys(SUPPORTED_ENCODINGS),
            'default': 'utf8',
            'description': nls.localize('encoding', "The default character set encoding to use when reading and writing files. This setting can also be configured per language."),
            'scope': 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */,
            'enumDescriptions': Object.keys(SUPPORTED_ENCODINGS).map(key => SUPPORTED_ENCODINGS[key].labelLong),
            'enumItemLabels': Object.keys(SUPPORTED_ENCODINGS).map(key => SUPPORTED_ENCODINGS[key].labelLong)
        },
        'files.autoGuessEncoding': {
            'type': 'boolean',
            'default': false,
            'markdownDescription': nls.localize('autoGuessEncoding', "When enabled, the editor will attempt to guess the character set encoding when opening files. This setting can also be configured per language. Note, this setting is not respected by text search. Only {0} is respected.", '`#files.encoding#`'),
            'scope': 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */
        },
        'files.candidateGuessEncodings': {
            'type': 'array',
            'items': {
                'type': 'string',
                'enum': Object.keys(GUESSABLE_ENCODINGS),
                'enumDescriptions': Object.keys(GUESSABLE_ENCODINGS).map(key => GUESSABLE_ENCODINGS[key].labelLong)
            },
            'default': [],
            'markdownDescription': nls.localize('candidateGuessEncodings', "List of character set encodings that the editor should attempt to guess in the order they are listed. In case it cannot be determined, {0} is respected", '`#files.encoding#`'),
            'scope': 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */
        },
        'files.eol': {
            'type': 'string',
            'enum': [
                '\n',
                '\r\n',
                'auto'
            ],
            'enumDescriptions': [
                nls.localize('eol.LF', "LF"),
                nls.localize('eol.CRLF', "CRLF"),
                nls.localize('eol.auto', "Uses operating system specific end of line character.")
            ],
            'default': 'auto',
            'description': nls.localize('eol', "The default end of line character."),
            'scope': 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */
        },
        'files.enableTrash': {
            'type': 'boolean',
            'default': true,
            'description': nls.localize('useTrash', "Moves files/folders to the OS trash (recycle bin on Windows) when deleting. Disabling this will delete files/folders permanently.")
        },
        'files.trimTrailingWhitespace': {
            'type': 'boolean',
            'default': false,
            'description': nls.localize('trimTrailingWhitespace', "When enabled, will trim trailing whitespace when saving a file."),
            'scope': 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */
        },
        'files.trimTrailingWhitespaceInRegexAndStrings': {
            'type': 'boolean',
            'default': true,
            'description': nls.localize('trimTrailingWhitespaceInRegexAndStrings', "When enabled, trailing whitespace will be removed from multiline strings and regexes will be removed on save or when executing 'editor.action.trimTrailingWhitespace'. This can cause whitespace to not be trimmed from lines when there isn't up-to-date token information."),
            'scope': 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */
        },
        'files.insertFinalNewline': {
            'type': 'boolean',
            'default': false,
            'description': nls.localize('insertFinalNewline', "When enabled, insert a final new line at the end of the file when saving it."),
            'scope': 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */
        },
        'files.trimFinalNewlines': {
            'type': 'boolean',
            'default': false,
            'description': nls.localize('trimFinalNewlines', "When enabled, will trim all new lines after the final new line at the end of the file when saving it."),
            scope: 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */,
        },
        'files.autoSave': {
            'type': 'string',
            'enum': [AutoSaveConfiguration.OFF, AutoSaveConfiguration.AFTER_DELAY, AutoSaveConfiguration.ON_FOCUS_CHANGE, AutoSaveConfiguration.ON_WINDOW_CHANGE],
            'markdownEnumDescriptions': [
                nls.localize({ comment: ['This is the description for a setting. Values surrounded by single quotes are not to be translated.'], key: 'files.autoSave.off' }, "An editor with changes is never automatically saved."),
                nls.localize({ comment: ['This is the description for a setting. Values surrounded by single quotes are not to be translated.'], key: 'files.autoSave.afterDelay' }, "An editor with changes is automatically saved after the configured `#files.autoSaveDelay#`."),
                nls.localize({ comment: ['This is the description for a setting. Values surrounded by single quotes are not to be translated.'], key: 'files.autoSave.onFocusChange' }, "An editor with changes is automatically saved when the editor loses focus."),
                nls.localize({ comment: ['This is the description for a setting. Values surrounded by single quotes are not to be translated.'], key: 'files.autoSave.onWindowChange' }, "An editor with changes is automatically saved when the window loses focus.")
            ],
            'default': isWeb ? AutoSaveConfiguration.AFTER_DELAY : AutoSaveConfiguration.OFF,
            'markdownDescription': nls.localize({ comment: ['This is the description for a setting. Values surrounded by single quotes are not to be translated.'], key: 'autoSave' }, "Controls [auto save](https://code.visualstudio.com/docs/editor/codebasics#_save-auto-save) of editors that have unsaved changes.", AutoSaveConfiguration.OFF, AutoSaveConfiguration.AFTER_DELAY, AutoSaveConfiguration.ON_FOCUS_CHANGE, AutoSaveConfiguration.ON_WINDOW_CHANGE, AutoSaveConfiguration.AFTER_DELAY),
            scope: 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */
        },
        'files.autoSaveDelay': {
            'type': 'number',
            'default': 1000,
            'minimum': 0,
            'markdownDescription': nls.localize({ comment: ['This is the description for a setting. Values surrounded by single quotes are not to be translated.'], key: 'autoSaveDelay' }, "Controls the delay in milliseconds after which an editor with unsaved changes is saved automatically. Only applies when `#files.autoSave#` is set to `{0}`.", AutoSaveConfiguration.AFTER_DELAY),
            scope: 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */
        },
        'files.autoSaveWorkspaceFilesOnly': {
            'type': 'boolean',
            'default': false,
            'markdownDescription': nls.localize('autoSaveWorkspaceFilesOnly', "When enabled, will limit [auto save](https://code.visualstudio.com/docs/editor/codebasics#_save-auto-save) of editors to files that are inside the opened workspace. Only applies when {0} is enabled.", '`#files.autoSave#`'),
            scope: 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */
        },
        'files.autoSaveWhenNoErrors': {
            'type': 'boolean',
            'default': false,
            'markdownDescription': nls.localize('autoSaveWhenNoErrors', "When enabled, will limit [auto save](https://code.visualstudio.com/docs/editor/codebasics#_save-auto-save) of editors to files that have no errors reported in them at the time the auto save is triggered. Only applies when {0} is enabled.", '`#files.autoSave#`'),
            scope: 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */
        },
        'files.watcherExclude': {
            'type': 'object',
            'patternProperties': {
                '.*': { 'type': 'boolean' }
            },
            'default': { '**/.git/objects/**': true, '**/.git/subtree-cache/**': true, '**/.hg/store/**': true },
            'markdownDescription': nls.localize('watcherExclude', "Configure paths or [glob patterns](https://aka.ms/vscode-glob-patterns) to exclude from file watching. Paths can either be relative to the watched folder or absolute. Glob patterns are matched relative from the watched folder. When you experience the file watcher process consuming a lot of CPU, make sure to exclude large folders that are of less interest (such as build output folders)."),
            'scope': 5 /* ConfigurationScope.RESOURCE */
        },
        'files.watcherInclude': {
            'type': 'array',
            'items': {
                'type': 'string'
            },
            'default': [],
            'description': nls.localize('watcherInclude', "Configure extra paths to watch for changes inside the workspace. By default, all workspace folders will be watched recursively, except for folders that are symbolic links. You can explicitly add absolute or relative paths to support watching folders that are symbolic links. Relative paths will be resolved to an absolute path using the currently opened workspace."),
            'scope': 5 /* ConfigurationScope.RESOURCE */
        },
        'files.hotExit': hotExitConfiguration,
        'files.defaultLanguage': {
            'type': 'string',
            'markdownDescription': nls.localize('defaultLanguage', "The default language identifier that is assigned to new files. If configured to `${activeEditorLanguage}`, will use the language identifier of the currently active text editor if any.")
        },
        [FILES_READONLY_INCLUDE_CONFIG]: {
            'type': 'object',
            'patternProperties': {
                '.*': { 'type': 'boolean' }
            },
            'default': {},
            'markdownDescription': nls.localize('filesReadonlyInclude', "Configure paths or [glob patterns](https://aka.ms/vscode-glob-patterns) to mark as read-only. Glob patterns are always evaluated relative to the path of the workspace folder unless they are absolute paths. You can exclude matching paths via the `#files.readonlyExclude#` setting. Files from readonly file system providers will always be read-only independent of this setting."),
            'scope': 5 /* ConfigurationScope.RESOURCE */
        },
        [FILES_READONLY_EXCLUDE_CONFIG]: {
            'type': 'object',
            'patternProperties': {
                '.*': { 'type': 'boolean' }
            },
            'default': {},
            'markdownDescription': nls.localize('filesReadonlyExclude', "Configure paths or [glob patterns](https://aka.ms/vscode-glob-patterns) to exclude from being marked as read-only if they match as a result of the `#files.readonlyInclude#` setting. Glob patterns are always evaluated relative to the path of the workspace folder unless they are absolute paths. Files from readonly file system providers will always be read-only independent of this setting."),
            'scope': 5 /* ConfigurationScope.RESOURCE */
        },
        [FILES_READONLY_FROM_PERMISSIONS_CONFIG]: {
            'type': 'boolean',
            'markdownDescription': nls.localize('filesReadonlyFromPermissions', "Marks files as read-only when their file permissions indicate as such. This can be overridden via `#files.readonlyInclude#` and `#files.readonlyExclude#` settings."),
            'default': false
        },
        'files.restoreUndoStack': {
            'type': 'boolean',
            'description': nls.localize('files.restoreUndoStack', "Restore the undo stack when a file is reopened."),
            'default': true
        },
        'files.saveConflictResolution': {
            'type': 'string',
            'enum': [
                'askUser',
                'overwriteFileOnDisk'
            ],
            'enumDescriptions': [
                nls.localize('askUser', "Will refuse to save and ask for resolving the save conflict manually."),
                nls.localize('overwriteFileOnDisk', "Will resolve the save conflict by overwriting the file on disk with the changes in the editor.")
            ],
            'description': nls.localize('files.saveConflictResolution', "A save conflict can occur when a file is saved to disk that was changed by another program in the meantime. To prevent data loss, the user is asked to compare the changes in the editor with the version on disk. This setting should only be changed if you frequently encounter save conflict errors and may result in data loss if used without caution."),
            'default': 'askUser',
            'scope': 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */
        },
        'files.dialog.defaultPath': {
            'type': 'string',
            'pattern': '^((\\/|\\\\\\\\|[a-zA-Z]:\\\\).*)?$', // slash OR UNC-root OR drive-root OR undefined
            'patternErrorMessage': nls.localize('defaultPathErrorMessage', "Default path for file dialogs must be an absolute path (e.g. C:\\\\myFolder or /myFolder)."),
            'description': nls.localize('fileDialogDefaultPath', "Default path for file dialogs, overriding user's home path. Only used in the absence of a context-specific path, such as most recently opened file or folder."),
            'scope': 2 /* ConfigurationScope.MACHINE */
        },
        'files.simpleDialog.enable': {
            'type': 'boolean',
            'description': nls.localize('files.simpleDialog.enable', "Enables the simple file dialog for opening and saving files and folders. The simple file dialog replaces the system file dialog when enabled."),
            'default': false
        },
        'files.participants.timeout': {
            type: 'number',
            default: 60000,
            markdownDescription: nls.localize('files.participants.timeout', "Timeout in milliseconds after which file participants for create, rename, and delete are cancelled. Use `0` to disable participants."),
        }
    }
});
configurationRegistry.registerConfiguration({
    ...editorConfigurationBaseNode,
    properties: {
        'editor.formatOnSave': {
            'type': 'boolean',
            'markdownDescription': nls.localize('formatOnSave', "Format a file on save. A formatter must be available and the editor must not be shutting down. When {0} is set to `afterDelay`, the file will only be formatted when saved explicitly.", '`#files.autoSave#`'),
            'scope': 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */,
        },
        'editor.formatOnSaveMode': {
            'type': 'string',
            'default': 'file',
            'enum': [
                'file',
                'modifications',
                'modificationsIfAvailable'
            ],
            'enumDescriptions': [
                nls.localize({ key: 'everything', comment: ['This is the description of an option'] }, "Format the whole file."),
                nls.localize({ key: 'modification', comment: ['This is the description of an option'] }, "Format modifications (requires source control)."),
                nls.localize({ key: 'modificationIfAvailable', comment: ['This is the description of an option'] }, "Will attempt to format modifications only (requires source control). If source control can't be used, then the whole file will be formatted."),
            ],
            'markdownDescription': nls.localize('formatOnSaveMode', "Controls if format on save formats the whole file or only modifications. Only applies when `#editor.formatOnSave#` is enabled."),
            'scope': 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */,
        },
    }
});
configurationRegistry.registerConfiguration({
    'id': 'explorer',
    'order': 10,
    'title': nls.localize('explorerConfigurationTitle', "File Explorer"),
    'type': 'object',
    'properties': {
        'explorer.openEditors.visible': {
            'type': 'number',
            'description': nls.localize({ key: 'openEditorsVisible', comment: ['Open is an adjective'] }, "The initial maximum number of editors shown in the Open Editors pane. Exceeding this limit will show a scroll bar and allow resizing the pane to display more items."),
            'default': 9,
            'minimum': 1
        },
        'explorer.openEditors.minVisible': {
            'type': 'number',
            'description': nls.localize({ key: 'openEditorsVisibleMin', comment: ['Open is an adjective'] }, "The minimum number of editor slots pre-allocated in the Open Editors pane. If set to 0 the Open Editors pane will dynamically resize based on the number of editors."),
            'default': 0,
            'minimum': 0
        },
        'explorer.openEditors.sortOrder': {
            'type': 'string',
            'enum': ['editorOrder', 'alphabetical', 'fullPath'],
            'description': nls.localize({ key: 'openEditorsSortOrder', comment: ['Open is an adjective'] }, "Controls the sorting order of editors in the Open Editors pane."),
            'enumDescriptions': [
                nls.localize('sortOrder.editorOrder', 'Editors are ordered in the same order editor tabs are shown.'),
                nls.localize('sortOrder.alphabetical', 'Editors are ordered alphabetically by tab name inside each editor group.'),
                nls.localize('sortOrder.fullPath', 'Editors are ordered alphabetically by full path inside each editor group.')
            ],
            'default': 'editorOrder'
        },
        'explorer.autoReveal': {
            'type': ['boolean', 'string'],
            'enum': [true, false, 'focusNoScroll'],
            'default': true,
            'enumDescriptions': [
                nls.localize('autoReveal.on', 'Files will be revealed and selected.'),
                nls.localize('autoReveal.off', 'Files will not be revealed and selected.'),
                nls.localize('autoReveal.focusNoScroll', 'Files will not be scrolled into view, but will still be focused.'),
            ],
            'description': nls.localize('autoReveal', "Controls whether the Explorer should automatically reveal and select files when opening them.")
        },
        'explorer.autoRevealExclude': {
            'type': 'object',
            'markdownDescription': nls.localize('autoRevealExclude', "Configure paths or [glob patterns](https://aka.ms/vscode-glob-patterns) for excluding files and folders from being revealed and selected in the Explorer when they are opened. Glob patterns are always evaluated relative to the path of the workspace folder unless they are absolute paths."),
            'default': { '**/node_modules': true, '**/bower_components': true },
            'additionalProperties': {
                'anyOf': [
                    {
                        'type': 'boolean',
                        'description': nls.localize('explorer.autoRevealExclude.boolean', "The glob pattern to match file paths against. Set to true or false to enable or disable the pattern."),
                    },
                    {
                        type: 'object',
                        properties: {
                            when: {
                                type: 'string', // expression ({ "**/*.js": { "when": "$(basename).js" } })
                                pattern: '\\w*\\$\\(basename\\)\\w*',
                                default: '$(basename).ext',
                                description: nls.localize('explorer.autoRevealExclude.when', 'Additional check on the siblings of a matching file. Use $(basename) as variable for the matching file name.')
                            }
                        }
                    }
                ]
            }
        },
        'explorer.enableDragAndDrop': {
            'type': 'boolean',
            'description': nls.localize('enableDragAndDrop', "Controls whether the Explorer should allow to move files and folders via drag and drop. This setting only effects drag and drop from inside the Explorer."),
            'default': true
        },
        'explorer.confirmDragAndDrop': {
            'type': 'boolean',
            'description': nls.localize('confirmDragAndDrop', "Controls whether the Explorer should ask for confirmation to move files and folders via drag and drop."),
            'default': true
        },
        'explorer.confirmPasteNative': {
            'type': 'boolean',
            'description': nls.localize('confirmPasteNative', "Controls whether the Explorer should ask for confirmation when pasting native files and folders."),
            'default': true
        },
        'explorer.confirmDelete': {
            'type': 'boolean',
            'description': nls.localize('confirmDelete', "Controls whether the Explorer should ask for confirmation when deleting a file via the trash."),
            'default': true
        },
        'explorer.enableUndo': {
            'type': 'boolean',
            'description': nls.localize('enableUndo', "Controls whether the Explorer should support undoing file and folder operations."),
            'default': true
        },
        'explorer.confirmUndo': {
            'type': 'string',
            'enum': ["verbose" /* UndoConfirmLevel.Verbose */, "default" /* UndoConfirmLevel.Default */, "light" /* UndoConfirmLevel.Light */],
            'description': nls.localize('confirmUndo', "Controls whether the Explorer should ask for confirmation when undoing."),
            'default': "default" /* UndoConfirmLevel.Default */,
            'enumDescriptions': [
                nls.localize('enableUndo.verbose', 'Explorer will prompt before all undo operations.'),
                nls.localize('enableUndo.default', 'Explorer will prompt before destructive undo operations.'),
                nls.localize('enableUndo.light', 'Explorer will not prompt before undo operations when focused.'),
            ],
        },
        'explorer.expandSingleFolderWorkspaces': {
            'type': 'boolean',
            'description': nls.localize('expandSingleFolderWorkspaces', "Controls whether the Explorer should expand multi-root workspaces containing only one folder during initialization"),
            'default': true
        },
        'explorer.sortOrder': {
            'type': 'string',
            'enum': ["default" /* SortOrder.Default */, "mixed" /* SortOrder.Mixed */, "filesFirst" /* SortOrder.FilesFirst */, "type" /* SortOrder.Type */, "modified" /* SortOrder.Modified */, "foldersNestsFiles" /* SortOrder.FoldersNestsFiles */],
            'default': "default" /* SortOrder.Default */,
            'enumDescriptions': [
                nls.localize('sortOrder.default', 'Files and folders are sorted by their names. Folders are displayed before files.'),
                nls.localize('sortOrder.mixed', 'Files and folders are sorted by their names. Files are interwoven with folders.'),
                nls.localize('sortOrder.filesFirst', 'Files and folders are sorted by their names. Files are displayed before folders.'),
                nls.localize('sortOrder.type', 'Files and folders are grouped by extension type then sorted by their names. Folders are displayed before files.'),
                nls.localize('sortOrder.modified', 'Files and folders are sorted by last modified date in descending order. Folders are displayed before files.'),
                nls.localize('sortOrder.foldersNestsFiles', 'Files and folders are sorted by their names. Folders are displayed before files. Files with nested children are displayed before other files.')
            ],
            'markdownDescription': nls.localize('sortOrder', "Controls the property-based sorting of files and folders in the Explorer. When `#explorer.fileNesting.enabled#` is enabled, also controls sorting of nested files.")
        },
        'explorer.sortOrderLexicographicOptions': {
            'type': 'string',
            'enum': ["default" /* LexicographicOptions.Default */, "upper" /* LexicographicOptions.Upper */, "lower" /* LexicographicOptions.Lower */, "unicode" /* LexicographicOptions.Unicode */],
            'default': "default" /* LexicographicOptions.Default */,
            'enumDescriptions': [
                nls.localize('sortOrderLexicographicOptions.default', 'Uppercase and lowercase names are mixed together.'),
                nls.localize('sortOrderLexicographicOptions.upper', 'Uppercase names are grouped together before lowercase names.'),
                nls.localize('sortOrderLexicographicOptions.lower', 'Lowercase names are grouped together before uppercase names.'),
                nls.localize('sortOrderLexicographicOptions.unicode', 'Names are sorted in Unicode order.')
            ],
            'description': nls.localize('sortOrderLexicographicOptions', "Controls the lexicographic sorting of file and folder names in the Explorer.")
        },
        'explorer.sortOrderReverse': {
            'type': 'boolean',
            'description': nls.localize('sortOrderReverse', "Controls whether the file and folder sort order, should be reversed."),
            'default': false,
        },
        'explorer.decorations.colors': {
            type: 'boolean',
            description: nls.localize('explorer.decorations.colors', "Controls whether file decorations should use colors."),
            default: true
        },
        'explorer.decorations.badges': {
            type: 'boolean',
            description: nls.localize('explorer.decorations.badges', "Controls whether file decorations should use badges."),
            default: true
        },
        'explorer.incrementalNaming': {
            'type': 'string',
            enum: ['simple', 'smart', 'disabled'],
            enumDescriptions: [
                nls.localize('simple', "Appends the word \"copy\" at the end of the duplicated name potentially followed by a number."),
                nls.localize('smart', "Adds a number at the end of the duplicated name. If some number is already part of the name, tries to increase that number."),
                nls.localize('disabled', "Disables incremental naming. If two files with the same name exist you will be prompted to overwrite the existing file.")
            ],
            description: nls.localize('explorer.incrementalNaming', "Controls which naming strategy to use when giving a new name to a duplicated Explorer item on paste."),
            default: 'simple'
        },
        'explorer.autoOpenDroppedFile': {
            'type': 'boolean',
            'description': nls.localize('autoOpenDroppedFile', "Controls whether the Explorer should automatically open a file when it is dropped into the explorer"),
            'default': true
        },
        'explorer.compactFolders': {
            'type': 'boolean',
            'description': nls.localize('compressSingleChildFolders', "Controls whether the Explorer should render folders in a compact form. In such a form, single child folders will be compressed in a combined tree element. Useful for Java package structures, for example."),
            'default': true
        },
        'explorer.copyRelativePathSeparator': {
            'type': 'string',
            'enum': [
                '/',
                '\\',
                'auto'
            ],
            'enumDescriptions': [
                nls.localize('copyRelativePathSeparator.slash', "Use slash as path separation character."),
                nls.localize('copyRelativePathSeparator.backslash', "Use backslash as path separation character."),
                nls.localize('copyRelativePathSeparator.auto', "Uses operating system specific path separation character."),
            ],
            'description': nls.localize('copyRelativePathSeparator', "The path separation character used when copying relative file paths."),
            'default': 'auto'
        },
        'explorer.copyPathSeparator': {
            'type': 'string',
            'enum': [
                '/',
                '\\',
                'auto'
            ],
            'enumDescriptions': [
                nls.localize('copyPathSeparator.slash', "Use slash as path separation character."),
                nls.localize('copyPathSeparator.backslash', "Use backslash as path separation character."),
                nls.localize('copyPathSeparator.auto', "Uses operating system specific path separation character."),
            ],
            'description': nls.localize('copyPathSeparator', "The path separation character used when copying file paths."),
            'default': 'auto'
        },
        'explorer.excludeGitIgnore': {
            type: 'boolean',
            markdownDescription: nls.localize('excludeGitignore', "Controls whether entries in .gitignore should be parsed and excluded from the Explorer. Similar to {0}.", '`#files.exclude#`'),
            default: false,
            scope: 5 /* ConfigurationScope.RESOURCE */
        },
        'explorer.fileNesting.enabled': {
            'type': 'boolean',
            scope: 5 /* ConfigurationScope.RESOURCE */,
            'markdownDescription': nls.localize('fileNestingEnabled', "Controls whether file nesting is enabled in the Explorer. File nesting allows for related files in a directory to be visually grouped together under a single parent file."),
            'default': false,
        },
        'explorer.fileNesting.expand': {
            'type': 'boolean',
            'markdownDescription': nls.localize('fileNestingExpand', "Controls whether file nests are automatically expanded. {0} must be set for this to take effect.", '`#explorer.fileNesting.enabled#`'),
            'default': true,
        },
        'explorer.fileNesting.patterns': {
            'type': 'object',
            scope: 5 /* ConfigurationScope.RESOURCE */,
            'markdownDescription': nls.localize('fileNestingPatterns', "Controls nesting of files in the Explorer. {0} must be set for this to take effect. Each __Item__ represents a parent pattern and may contain a single `*` character that matches any string. Each __Value__ represents a comma separated list of the child patterns that should be shown nested under a given parent. Child patterns may contain several special tokens:\n- `${capture}`: Matches the resolved value of the `*` from the parent pattern\n- `${basename}`: Matches the parent file's basename, the `file` in `file.ts`\n- `${extname}`: Matches the parent file's extension, the `ts` in `file.ts`\n- `${dirname}`: Matches the parent file's directory name, the `src` in `src/file.ts`\n- `*`:  Matches any string, may only be used once per child pattern", '`#explorer.fileNesting.enabled#`'),
            patternProperties: {
                '^[^*]*\\*?[^*]*$': {
                    markdownDescription: nls.localize('fileNesting.description', "Each key pattern may contain a single `*` character which will match any string."),
                    type: 'string',
                    pattern: '^([^,*]*\\*?[^,*]*)(, ?[^,*]*\\*?[^,*]*)*$',
                }
            },
            additionalProperties: false,
            'default': {
                '*.ts': '${capture}.js',
                '*.js': '${capture}.js.map, ${capture}.min.js, ${capture}.d.ts',
                '*.jsx': '${capture}.js',
                '*.tsx': '${capture}.ts',
                'tsconfig.json': 'tsconfig.*.json',
                'package.json': 'package-lock.json, yarn.lock, pnpm-lock.yaml, bun.lockb, bun.lock',
            }
        }
    }
});
UndoCommand.addImplementation(110, 'explorer', (accessor) => {
    const undoRedoService = accessor.get(IUndoRedoService);
    const explorerService = accessor.get(IExplorerService);
    const configurationService = accessor.get(IConfigurationService);
    const explorerCanUndo = configurationService.getValue().explorer.enableUndo;
    if (explorerService.hasViewFocus() && undoRedoService.canUndo(UNDO_REDO_SOURCE) && explorerCanUndo) {
        undoRedoService.undo(UNDO_REDO_SOURCE);
        return true;
    }
    return false;
});
RedoCommand.addImplementation(110, 'explorer', (accessor) => {
    const undoRedoService = accessor.get(IUndoRedoService);
    const explorerService = accessor.get(IExplorerService);
    const configurationService = accessor.get(IConfigurationService);
    const explorerCanUndo = configurationService.getValue().explorer.enableUndo;
    if (explorerService.hasViewFocus() && undoRedoService.canRedo(UNDO_REDO_SOURCE) && explorerCanUndo) {
        undoRedoService.redo(UNDO_REDO_SOURCE);
        return true;
    }
    return false;
});
ModesRegistry.registerLanguage({
    id: BINARY_TEXT_FILE_MODE,
    aliases: ['Binary'],
    mimetypes: ['text/x-code-binary']
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmlsZXMuY29udHJpYnV0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvYWR2aWthci9Eb2N1bWVudHMvYXJjaGl0ZWN0L2FyY2gyL0FyY2hJREUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvZmlsZXMvYnJvd3Nlci9maWxlcy5jb250cmlidXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQztBQUMxQyxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDdEQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQzVFLE9BQU8sRUFBMEIsVUFBVSxJQUFJLHVCQUF1QixFQUFvRCxNQUFNLG9FQUFvRSxDQUFDO0FBQ3JNLE9BQU8sRUFBMEMsOEJBQThCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUMxSCxPQUFPLEVBQTRDLGdCQUFnQixFQUFFLE1BQU0sMkJBQTJCLENBQUM7QUFDdkcsT0FBTyxFQUFFLHFCQUFxQixFQUFFLG9CQUFvQixFQUFFLG9CQUFvQixFQUFFLHlCQUF5QixFQUFFLDZCQUE2QixFQUFFLDZCQUE2QixFQUFFLHNDQUFzQyxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDaFEsT0FBTyxFQUFtQyxvQkFBb0IsRUFBRSxxQkFBcUIsRUFBeUMsTUFBTSxvQkFBb0IsQ0FBQztBQUN6SixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUMzRSxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUNqRixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFDL0QsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFFakUsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDBEQUEw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