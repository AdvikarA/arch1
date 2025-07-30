/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import themePickerContent from './media/theme_picker.js';
import themePickerSmallContent from './media/theme_picker_small.js';
import notebookProfileContent from './media/notebookProfile.js';
import { localize } from '../../../../nls.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { registerIcon } from '../../../../platform/theme/common/iconRegistry.js';
import { NotebookSetting } from '../../notebook/common/notebookCommon.js';
import { CONTEXT_ACCESSIBILITY_MODE_ENABLED } from '../../../../platform/accessibility/common/accessibility.js';
import product from '../../../../platform/product/common/product.js';
const defaultChat = {
    documentationUrl: product.defaultChatAgent?.documentationUrl ?? '',
    manageSettingsUrl: product.defaultChatAgent?.manageSettingsUrl ?? '',
    provider: product.defaultChatAgent?.provider ?? { default: { name: '' } },
    publicCodeMatchesUrl: product.defaultChatAgent?.publicCodeMatchesUrl ?? '',
};
export const copilotSettingsMessage = localize({ key: 'settings', comment: ['{Locked="["}', '{Locked="]({0})"}', '{Locked="]({1})"}'] }, "{0} Copilot Free, Pro and Pro+ may show [public code]({1}) suggestions and we may use your data for product improvement. You can change these [settings]({2}) at any time.", defaultChat.provider.default.name, defaultChat.publicCodeMatchesUrl, defaultChat.manageSettingsUrl);
class GettingStartedContentProviderRegistry {
    constructor() {
        this.providers = new Map();
    }
    registerProvider(moduleId, provider) {
        this.providers.set(moduleId, provider);
    }
    getProvider(moduleId) {
        return this.providers.get(moduleId);
    }
}
export const gettingStartedContentRegistry = new GettingStartedContentProviderRegistry();
export async function moduleToContent(resource) {
    if (!resource.query) {
        throw new Error('Getting Started: invalid resource');
    }
    const query = JSON.parse(resource.query);
    if (!query.moduleId) {
        throw new Error('Getting Started: invalid resource');
    }
    const provider = gettingStartedContentRegistry.getProvider(query.moduleId);
    if (!provider) {
        throw new Error(`Getting Started: no provider registered for ${query.moduleId}`);
    }
    return provider();
}
gettingStartedContentRegistry.registerProvider('vs/workbench/contrib/welcomeGettingStarted/common/media/theme_picker', themePickerContent);
gettingStartedContentRegistry.registerProvider('vs/workbench/contrib/welcomeGettingStarted/common/media/theme_picker_small', themePickerSmallContent);
gettingStartedContentRegistry.registerProvider('vs/workbench/contrib/welcomeGettingStarted/common/media/notebookProfile', notebookProfileContent);
// Register empty media for accessibility walkthrough
gettingStartedContentRegistry.registerProvider('vs/workbench/contrib/welcomeGettingStarted/common/media/empty', () => '');
const setupIcon = registerIcon('getting-started-setup', Codicon.zap, localize('getting-started-setup-icon', "Icon used for the setup category of welcome page"));
const beginnerIcon = registerIcon('getting-started-beginner', Codicon.lightbulb, localize('getting-started-beginner-icon', "Icon used for the beginner category of welcome page"));
export const NEW_WELCOME_EXPERIENCE = 'NewWelcomeExperience';
export const startEntries = [
    {
        id: 'welcome.showNewFileEntries',
        title: localize('gettingStarted.newFile.title', "New File..."),
        description: localize('gettingStarted.newFile.description', "Open a new untitled text file, notebook, or custom editor."),
        icon: Codicon.newFile,
        content: {
            type: 'startEntry',
            command: 'command:welcome.showNewFileEntries',
        }
    },
    {
        id: 'topLevelOpenMac',
        title: localize('gettingStarted.openMac.title', "Open..."),
        description: localize('gettingStarted.openMac.description', "Open a file or folder to start working"),
        icon: Codicon.folderOpened,
        when: '!isWeb && isMac',
        content: {
            type: 'startEntry',
            command: 'command:workbench.action.files.openFileFolder',
        }
    },
    {
        id: 'topLevelOpenFile',
        title: localize('gettingStarted.openFile.title', "Open File..."),
        description: localize('gettingStarted.openFile.description', "Open a file to start working"),
        icon: Codicon.goToFile,
        when: 'isWeb || !isMac',
        content: {
            type: 'startEntry',
            command: 'command:workbench.action.files.openFile',
        }
    },
    {
        id: 'topLevelOpenFolder',
        title: localize('gettingStarted.openFolder.title', "Open Folder..."),
        description: localize('gettingStarted.openFolder.description', "Open a folder to start working"),
        icon: Codicon.folderOpened,
        when: '!isWeb && !isMac',
        content: {
            type: 'startEntry',
            command: 'command:workbench.action.files.openFolder',
        }
    },
    {
        id: 'topLevelOpenFolderWeb',
        title: localize('gettingStarted.openFolder.title', "Open Folder..."),
        description: localize('gettingStarted.openFolder.description', "Open a folder to start working"),
        icon: Codicon.folderOpened,
        when: '!openFolderWorkspaceSupport && workbenchState == \'workspace\'',
        content: {
            type: 'startEntry',
            command: 'command:workbench.action.files.openFolderViaWorkspace',
        }
    },
    {
        id: 'topLevelGitClone',
        title: localize('gettingStarted.topLevelGitClone.title', "Clone Git Repository..."),
        description: localize('gettingStarted.topLevelGitClone.description', "Clone a remote repository to a local folder"),
        when: 'config.git.enabled && !git.missing',
        icon: Codicon.sourceControl,
        content: {
            type: 'startEntry',
            command: 'command:git.clone',
        }
    },
    {
        id: 'topLevelGitOpen',
        title: localize('gettingStarted.topLevelGitOpen.title', "Open Repository..."),
        description: localize('gettingStarted.topLevelGitOpen.description', "Connect to a remote repository or pull request to browse, search, edit, and commit"),
        when: 'workspacePlatform == \'webworker\'',
        icon: Codicon.sourceControl,
        content: {
            type: 'startEntry',
            command: 'command:remoteHub.openRepository',
        }
    },
    {
        id: 'topLevelRemoteOpen',
        title: localize('gettingStarted.topLevelRemoteOpen.title', "Connect to..."),
        description: localize('gettingStarted.topLevelRemoteOpen.description', "Connect to remote development workspaces."),
        when: '!isWeb',
        icon: Codicon.remote,
        content: {
            type: 'startEntry',
            command: 'command:workbench.action.remote.showMenu',
        }
    },
    {
        id: 'topLevelOpenTunnel',
        title: localize('gettingStarted.topLevelOpenTunnel.title', "Open Tunnel..."),
        description: localize('gettingStarted.topLevelOpenTunnel.description', "Connect to a remote machine through a Tunnel"),
        when: 'isWeb && showRemoteStartEntryInWeb',
        icon: Codicon.remote,
        content: {
            type: 'startEntry',
            command: 'command:workbench.action.remote.showWebStartEntryActions',
        }
    },
    {
        id: 'topLevelNewWorkspaceChat',
        title: localize('gettingStarted.newWorkspaceChat.title', "Generate New Workspace..."),
        description: localize('gettingStarted.newWorkspaceChat.description', "Chat to create a new workspace"),
        icon: Codicon.chatSparkle,
        when: '!isWeb && !chatSetupHidden',
        content: {
            type: 'startEntry',
            command: 'command:welcome.newWorkspaceChat',
        }
    },
];
const Button = (title, href) => `[${title}](${href})`;
const CopilotStepTitle = localize('gettingStarted.copilotSetup.title', "Use AI features with Copilot for free");
const CopilotDescription = localize({ key: 'gettingStarted.copilotSetup.description', comment: ['{Locked="["}', '{Locked="]({0})"}'] }, "You can use [Copilot]({0}) to generate code across multiple files, fix errors, ask questions about your code and much more using natural language.", defaultChat.documentationUrl ?? '');
const CopilotSignedOutButton = Button(localize('setupCopilotButton.signIn', "Set up Copilot"), `command:workbench.action.chat.triggerSetup`);
const CopilotSignedInButton = Button(localize('setupCopilotButton.setup', "Set up Copilot"), `command:workbench.action.chat.triggerSetup`);
const CopilotCompleteButton = Button(localize('setupCopilotButton.chatWithCopilot', "Chat with Copilot"), 'command:workbench.action.chat.open');
function createCopilotSetupStep(id, button, when, includeTerms) {
    const description = includeTerms ?
        `${CopilotDescription}\n\n${button}` :
        `${CopilotDescription}\n${button}`;
    return {
        id,
        title: CopilotStepTitle,
        description,
        when: `${when} && !chatSetupHidden`,
        media: {
            type: 'svg', altText: 'VS Code Copilot multi file edits', path: 'multi-file-edits.svg'
        },
    };
}
export const walkthroughs = [
    {
        id: 'Setup',
        title: localize('gettingStarted.setup.title', "Get started with VS Code"),
        description: localize('gettingStarted.setup.description', "Customize your editor, learn the basics, and start coding"),
        isFeatured: true,
        icon: setupIcon,
        when: '!isWeb',
        walkthroughPageTitle: localize('gettingStarted.setup.walkthroughPageTitle', 'Setup VS Code'),
        next: 'Beginner',
        content: {
            type: 'steps',
            steps: [
                createCopilotSetupStep('CopilotSetupSignedOut', CopilotSignedOutButton, 'chatEntitlementSignedOut', true),
                createCopilotSetupStep('CopilotSetupComplete', CopilotCompleteButton, 'chatSetupInstalled && !chatSetupDisabled && (chatPlanPro || chatPlanProPlus || chatPlanBusiness || chatPlanEnterprise || chatPlanFree)', false),
                createCopilotSetupStep('CopilotSetupSignedIn', CopilotSignedInButton, '!chatEntitlementSignedOut && (!chatSetupInstalled || chatSetupDisabled || chatPlanCanSignUp)', true),
                {
                    id: 'pickColorTheme',
                    title: localize('gettingStarted.pickColor.title', "Choose your theme"),
                    description: localize('gettingStarted.pickColor.description.interpolated', "The right theme helps you focus on your code, is easy on your eyes, and is simply more fun to use.\n{0}", Button(localize('titleID', "Browse Color Themes"), 'command:workbench.action.selectTheme')),
                    completionEvents: [
                        'onSettingChanged:workbench.colorTheme',
                        'onCommand:workbench.action.selectTheme'
                    ],
                    media: { type: 'markdown', path: 'theme_picker', }
                },
                {
                    id: 'extensionsWeb',
                    title: localize('gettingStarted.extensions.title', "Code with extensions"),
                    description: localize('gettingStarted.extensionsWeb.description.interpolated', "Extensions are VS Code's power-ups. A growing number are becoming available in the web.\n{0}", Button(localize('browsePopularWeb', "Browse Popular Web Extensions"), 'command:workbench.extensions.action.showPopularExtensions')),
                    when: 'workspacePlatform == \'webworker\'',
                    media: {
                        type: 'svg', altText: 'VS Code extension marketplace with featured language extensions', path: 'extensions-web.svg'
                    },
                },
                {
                    id: 'findLanguageExtensions',
                    title: localize('gettingStarted.findLanguageExts.title', "Rich support for all your languages"),
                    description: localize('gettingStarted.findLanguageExts.description.interpolated', "Code smarter with syntax highlighting, code completion, linting and debugging. While many languages are built-in, many more can be added as extensions.\n{0}", Button(localize('browseLangExts', "Browse Language Extensions"), 'command:workbench.extensions.action.showLanguageExtensions')),
                    when: 'workspacePlatform != \'webworker\'',
                    media: {
                        type: 'svg', altText: 'Language extensions', path: 'languages.svg'
                    },
                },
                // Hidden in favor of copilot entry (to be revisited when copilot entry moves, if at all)
                // {
                // 	id: 'settings',
                // 	title: localize('gettingStarted.settings.title', "Tune your settings"),
                // 	description: localize('gettingStarted.settings.description.interpolated', "Customize every aspect of VS Code and your extensions to your liking. Commonly used settings are listed first to get you started.\n{0}", Button(localize('tweakSettings', "Open Settings"), 'command:toSide:workbench.action.openSettings')),
                // 	media: {
                // 		type: 'svg', altText: 'VS Code Settings', path: 'settings.svg'
                // 	},
                // },
                // {
                // 	id: 'settingsSync',
                // 	title: localize('gettingStarted.settingsSync.title', "Sync settings across devices"),
                // 	description: localize('gettingStarted.settingsSync.description.interpolated', "Keep your essential customizations backed up and updated across all your devices.\n{0}", Button(localize('enableSync', "Backup and Sync Settings"), 'command:workbench.userDataSync.actions.turnOn')),
                // 	when: 'syncStatus != uninitialized',
                // 	completionEvents: ['onEvent:sync-enabled'],
                // 	media: {
                // 		type: 'svg', altText: 'The "Turn on Sync" entry in the settings gear menu.', path: 'settingsSync.svg'
                // 	},
                // },
                {
                    id: 'settingsAndSync',
                    title: localize('gettingStarted.settings.title', "Tune your settings"),
                    description: localize('gettingStarted.settingsAndSync.description.interpolated', "Customize every aspect of VS Code and your extensions to your liking. [Back up and sync](command:workbench.userDataSync.actions.turnOn) your essential customizations across all your devices.\n{0}", Button(localize('tweakSettings', "Open Settings"), 'command:toSide:workbench.action.openSettings')),
                    when: 'syncStatus != uninitialized',
                    completionEvents: ['onEvent:sync-enabled'],
                    media: {
                        type: 'svg', altText: 'VS Code Settings', path: 'settings.svg'
                    },
                },
                {
                    id: 'commandPaletteTask',
                    title: localize('gettingStarted.commandPalette.title', "Unlock productivity with the Command Palette "),
                    description: localize('gettingStarted.commandPalette.description.interpolated', "Run commands without reaching for your mouse to accomplish any task in VS Code.\n{0}", Button(localize('commandPalette', "Open Command Palette"), 'command:workbench.action.showCommands')),
                    media: { type: 'svg', altText: 'Command Palette overlay for searching and executing commands.', path: 'commandPalette.svg' },
                },
                // Hidden in favor of copilot entry (to be revisited when copilot entry moves, if at all)
                // {
                // 	id: 'pickAFolderTask-Mac',
                // 	title: localize('gettingStarted.setup.OpenFolder.title', "Open up your code"),
                // 	description: localize('gettingStarted.setup.OpenFolder.description.interpolated', "You're all set to start coding. Open a project folder to get your files into VS Code.\n{0}", Button(localize('pickFolder', "Pick a Folder"), 'command:workbench.action.files.openFileFolder')),
                // 	when: 'isMac && workspaceFolderCount == 0',
                // 	media: {
                // 		type: 'svg', altText: 'Explorer view showing buttons for opening folder and cloning repository.', path: 'openFolder.svg'
                // 	}
                // },
                // {
                // 	id: 'pickAFolderTask-Other',
                // 	title: localize('gettingStarted.setup.OpenFolder.title', "Open up your code"),
                // 	description: localize('gettingStarted.setup.OpenFolder.description.interpolated', "You're all set to start coding. Open a project folder to get your files into VS Code.\n{0}", Button(localize('pickFolder', "Pick a Folder"), 'command:workbench.action.files.openFolder')),
                // 	when: '!isMac && workspaceFolderCount == 0',
                // 	media: {
                // 		type: 'svg', altText: 'Explorer view showing buttons for opening folder and cloning repository.', path: 'openFolder.svg'
                // 	}
                // },
                {
                    id: 'quickOpen',
                    title: localize('gettingStarted.quickOpen.title', "Quickly navigate between your files"),
                    description: localize('gettingStarted.quickOpen.description.interpolated', "Navigate between files in an instant with one keystroke. Tip: Open multiple files by pressing the right arrow key.\n{0}", Button(localize('quickOpen', "Quick Open a File"), 'command:toSide:workbench.action.quickOpen')),
                    when: 'workspaceFolderCount != 0',
                    media: {
                        type: 'svg', altText: 'Go to file in quick search.', path: 'search.svg'
                    }
                },
                {
                    id: 'videoTutorial',
                    title: localize('gettingStarted.videoTutorial.title', "Watch video tutorials"),
                    description: localize('gettingStarted.videoTutorial.description.interpolated', "Watch the first in a series of short & practical video tutorials for VS Code's key features.\n{0}", Button(localize('watch', "Watch Tutorial"), 'https://aka.ms/vscode-getting-started-video')),
                    media: { type: 'svg', altText: 'VS Code Settings', path: 'learn.svg' },
                }
            ]
        }
    },
    {
        id: 'SetupWeb',
        title: localize('gettingStarted.setupWeb.title', "Get Started with VS Code for the Web"),
        description: localize('gettingStarted.setupWeb.description', "Customize your editor, learn the basics, and start coding"),
        isFeatured: true,
        icon: setupIcon,
        when: 'isWeb',
        next: 'Beginner',
        walkthroughPageTitle: localize('gettingStarted.setupWeb.walkthroughPageTitle', 'Setup VS Code Web'),
        content: {
            type: 'steps',
            steps: [
                {
                    id: 'pickColorThemeWeb',
                    title: localize('gettingStarted.pickColor.title', "Choose your theme"),
                    description: localize('gettingStarted.pickColor.description.interpolated', "The right theme helps you focus on your code, is easy on your eyes, and is simply more fun to use.\n{0}", Button(localize('titleID', "Browse Color Themes"), 'command:workbench.action.selectTheme')),
                    completionEvents: [
                        'onSettingChanged:workbench.colorTheme',
                        'onCommand:workbench.action.selectTheme'
                    ],
                    media: { type: 'markdown', path: 'theme_picker', }
                },
                {
                    id: 'menuBarWeb',
                    title: localize('gettingStarted.menuBar.title', "Just the right amount of UI"),
                    description: localize('gettingStarted.menuBar.description.interpolated', "The full menu bar is available in the dropdown menu to make room for your code. Toggle its appearance for faster access. \n{0}", Button(localize('toggleMenuBar', "Toggle Menu Bar"), 'command:workbench.action.toggleMenuBar')),
                    when: 'isWeb',
                    media: {
                        type: 'svg', altText: 'Comparing menu dropdown with the visible menu bar.', path: 'menuBar.svg'
                    },
                },
                {
                    id: 'extensionsWebWeb',
                    title: localize('gettingStarted.extensions.title', "Code with extensions"),
                    description: localize('gettingStarted.extensionsWeb.description.interpolated', "Extensions are VS Code's power-ups. A growing number are becoming available in the web.\n{0}", Button(localize('browsePopularWeb', "Browse Popular Web Extensions"), 'command:workbench.extensions.action.showPopularExtensions')),
                    when: 'workspacePlatform == \'webworker\'',
                    media: {
                        type: 'svg', altText: 'VS Code extension marketplace with featured language extensions', path: 'extensions-web.svg'
                    },
                },
                {
                    id: 'findLanguageExtensionsWeb',
                    title: localize('gettingStarted.findLanguageExts.title', "Rich support for all your languages"),
                    description: localize('gettingStarted.findLanguageExts.description.interpolated', "Code smarter with syntax highlighting, code completion, linting and debugging. While many languages are built-in, many more can be added as extensions.\n{0}", Button(localize('browseLangExts', "Browse Language Extensions"), 'command:workbench.extensions.action.showLanguageExtensions')),
                    when: 'workspacePlatform != \'webworker\'',
                    media: {
                        type: 'svg', altText: 'Language extensions', path: 'languages.svg'
                    },
                },
                {
                    id: 'settingsSyncWeb',
                    title: localize('gettingStarted.settingsSync.title', "Sync settings across devices"),
                    description: localize('gettingStarted.settingsSync.description.interpolated', "Keep your essential customizations backed up and updated across all your devices.\n{0}", Button(localize('enableSync', "Backup and Sync Settings"), 'command:workbench.userDataSync.actions.turnOn')),
                    when: 'syncStatus != uninitialized',
                    completionEvents: ['onEvent:sync-enabled'],
                    media: {
                        type: 'svg', altText: 'The "Turn on Sync" entry in the settings gear menu.', path: 'settingsSync.svg'
                    },
                },
                {
                    id: 'commandPaletteTaskWeb',
                    title: localize('gettingStarted.commandPalette.title', "Unlock productivity with the Command Palette "),
                    description: localize('gettingStarted.commandPalette.description.interpolated', "Run commands without reaching for your mouse to accomplish any task in VS Code.\n{0}", Button(localize('commandPalette', "Open Command Palette"), 'command:workbench.action.showCommands')),
                    media: { type: 'svg', altText: 'Command Palette overlay for searching and executing commands.', path: 'commandPalette.svg' },
                },
                {
                    id: 'pickAFolderTask-WebWeb',
                    title: localize('gettingStarted.setup.OpenFolder.title', "Open up your code"),
                    description: localize('gettingStarted.setup.OpenFolderWeb.description.interpolated', "You're all set to start coding. You can open a local project or a remote repository to get your files into VS Code.\n{0}\n{1}", Button(localize('openFolder', "Open Folder"), 'command:workbench.action.addRootFolder'), Button(localize('openRepository', "Open Repository"), 'command:remoteHub.openRepository')),
                    when: 'workspaceFolderCount == 0',
                    media: {
                        type: 'svg', altText: 'Explorer view showing buttons for opening folder and cloning repository.', path: 'openFolder.svg'
                    }
                },
                {
                    id: 'quickOpenWeb',
                    title: localize('gettingStarted.quickOpen.title', "Quickly navigate between your files"),
                    description: localize('gettingStarted.quickOpen.description.interpolated', "Navigate between files in an instant with one keystroke. Tip: Open multiple files by pressing the right arrow key.\n{0}", Button(localize('quickOpen', "Quick Open a File"), 'command:toSide:workbench.action.quickOpen')),
                    when: 'workspaceFolderCount != 0',
                    media: {
                        type: 'svg', altText: 'Go to file in quick search.', path: 'search.svg'
                    }
                }
            ]
        }
    },
    {
        id: 'SetupAccessibility',
        title: localize('gettingStarted.setupAccessibility.title', "Get Started with Accessibility Features"),
        description: localize('gettingStarted.setupAccessibility.description', "Learn the tools and shortcuts that make VS Code accessible. Note that some actions are not actionable from within the context of the walkthrough."),
        isFeatured: true,
        icon: setupIcon,
        when: CONTEXT_ACCESSIBILITY_MODE_ENABLED.key,
        next: 'Setup',
        walkthroughPageTitle: localize('gettingStarted.setupAccessibility.walkthroughPageTitle', 'Setup VS Code Accessibility'),
        content: {
            type: 'steps',
            steps: [
                {
                    id: 'accessibilityHelp',
                    title: localize('gettingStarted.accessibilityHelp.title', "Use the accessibility help dialog to learn about features"),
                    description: localize('gettingStarted.accessibilityHelp.description.interpolated', "The accessibility help dialog provides information about what to expect from a feature and the commands/keybindings to operate them.\n With focus in an editor, terminal, notebook, chat response, comment, or debug console, the relevant dialog can be opened with the Open Accessibility Help command.\n{0}", Button(localize('openAccessibilityHelp', "Open Accessibility Help"), 'command:editor.action.accessibilityHelp')),
                    media: {
                        type: 'markdown', path: 'empty'
                    }
                },
                {
                    id: 'accessibleView',
                    title: localize('gettingStarted.accessibleView.title', "Screen reader users can inspect content line by line, character by character in the accessible view."),
                    description: localize('gettingStarted.accessibleView.description.interpolated', "The accessible view is available for the terminal, hovers, notifications, comments, notebook output, chat responses, inline completions, and debug console output.\n With focus in any of those features, it can be opened with the Open Accessible View command.\n{0}", Button(localize('openAccessibleView', "Open Accessible View"), 'command:editor.action.accessibleView')),
                    media: {
                        type: 'markdown', path: 'empty'
                    }
                },
                {
                    id: 'verbositySettings',
                    title: localize('gettingStarted.verbositySettings.title', "Control the verbosity of aria labels"),
                    description: localize('gettingStarted.verbositySettings.description.interpolated', "Screen reader verbosity settings exist for features around the workbench so that once a user is familiar with a feature, they can avoid hearing hints about how to operate it. For example, features for which an accessibility help dialog exists will indicate how to open the dialog until the verbosity setting for that feature has been disabled.\n These and other accessibility settings can be configured by running the Open Accessibility Settings command.\n{0}", Button(localize('openVerbositySettings', "Open Accessibility Settings"), 'command:workbench.action.openAccessibilitySettings')),
                    media: {
                        type: 'markdown', path: 'empty'
                    }
                },
                {
                    id: 'commandPaletteTaskAccessibility',
                    title: localize('gettingStarted.commandPaletteAccessibility.title', "Unlock productivity with the Command Palette "),
                    description: localize('gettingStarted.commandPaletteAccessibility.description.interpolated', "Run commands without reaching for your mouse to accomplish any task in VS Code.\n{0}", Button(localize('commandPalette', "Open Command Palette"), 'command:workbench.action.showCommands')),
                    media: { type: 'markdown', path: 'empty' },
                },
                {
                    id: 'keybindingsAccessibility',
                    title: localize('gettingStarted.keyboardShortcuts.title', "Customize your keyboard shortcuts"),
                    description: localize('gettingStarted.keyboardShortcuts.description.interpolated', "Once you have discovered your favorite commands, create custom keyboard shortcuts for instant access.\n{0}", Button(localize('keyboardShortcuts', "Keyboard Shortcuts"), 'command:toSide:workbench.action.openGlobalKeybindings')),
                    media: {
                        type: 'markdown', path: 'empty',
                    }
                },
                {
                    id: 'accessibilitySignals',
                    title: localize('gettingStarted.accessibilitySignals.title', "Fine tune which accessibility signals you want to receive via audio or a braille device"),
                    description: localize('gettingStarted.accessibilitySignals.description.interpolated', "Accessibility sounds and announcements are played around the workbench for different events.\n These can be discovered and configured using the List Signal Sounds and List Signal Announcements commands.\n{0}\n{1}", Button(localize('listSignalSounds', "List Signal Sounds"), 'command:signals.sounds.help'), Button(localize('listSignalAnnouncements', "List Signal Announcements"), 'command:accessibility.announcement.help')),
                    media: {
                        type: 'markdown', path: 'empty'
                    }
                },
                {
                    id: 'hover',
                    title: localize('gettingStarted.hover.title', "Access the hover in the editor to get more information on a variable or symbol"),
                    description: localize('gettingStarted.hover.description.interpolated', "While focus is in the editor on a variable or symbol, a hover can be focused with the Show or Open Hover command.\n{0}", Button(localize('showOrFocusHover', "Show or Focus Hover"), 'command:editor.action.showHover')),
                    media: {
                        type: 'markdown', path: 'empty'
                    }
                },
                {
                    id: 'goToSymbol',
                    title: localize('gettingStarted.goToSymbol.title', "Navigate to symbols in a file"),
                    description: localize('gettingStarted.goToSymbol.description.interpolated', "The Go to Symbol command is useful for navigating between important landmarks in a document.\n{0}", Button(localize('openGoToSymbol', "Go to Symbol"), 'command:editor.action.goToSymbol')),
                    media: {
                        type: 'markdown', path: 'empty'
                    }
                },
                {
                    id: 'codeFolding',
                    title: localize('gettingStarted.codeFolding.title', "Use code folding to collapse blocks of code and focus on the code you're interested in."),
                    description: localize('gettingStarted.codeFolding.description.interpolated', "Fold or unfold a code section with the Toggle Fold command.\n{0}\n Fold or unfold recursively with the Toggle Fold Recursively Command\n{1}\n", Button(localize('toggleFold', "Toggle Fold"), 'command:editor.toggleFold'), Button(localize('toggleFoldRecursively', "Toggle Fold Recursively"), 'command:editor.toggleFoldRecursively')),
                    media: {
                        type: 'markdown', path: 'empty'
                    }
                },
                {
                    id: 'intellisense',
                    title: localize('gettingStarted.intellisense.title', "Use Intellisense to improve coding efficiency"),
                    description: localize('gettingStarted.intellisense.description.interpolated', "Intellisense suggestions can be opened with the Trigger Intellisense command.\n{0}\n Inline intellisense suggestions can be triggered with Trigger Inline Suggestion\n{1}\n Useful settings include editor.inlineCompletionsAccessibilityVerbose and editor.screenReaderAnnounceInlineSuggestion.", Button(localize('triggerIntellisense', "Trigger Intellisense"), 'command:editor.action.triggerSuggest'), Button(localize('triggerInlineSuggestion', 'Trigger Inline Suggestion'), 'command:editor.action.inlineSuggest.trigger')),
                    media: {
                        type: 'markdown', path: 'empty'
                    }
                },
                {
                    id: 'accessibilitySettings',
                    title: localize('gettingStarted.accessibilitySettings.title', "Configure accessibility settings"),
                    description: localize('gettingStarted.accessibilitySettings.description.interpolated', "Accessibility settings can be configured by running the Open Accessibility Settings command.\n{0}", Button(localize('openAccessibilitySettings', "Open Accessibility Settings"), 'command:workbench.action.openAccessibilitySettings')),
                    media: { type: 'markdown', path: 'empty' }
                }
            ]
        }
    },
    {
        id: 'Beginner',
        isFeatured: false,
        title: localize('gettingStarted.beginner.title', "Learn the Fundamentals"),
        icon: beginnerIcon,
        description: localize('gettingStarted.beginner.description', "Get an overview of the most essential features"),
        walkthroughPageTitle: localize('gettingStarted.beginner.walkthroughPageTitle', 'Essential Features'),
        content: {
            type: 'steps',
            steps: [
                {
                    id: 'extensions',
                    title: localize('gettingStarted.extensions.title', "Code with extensions"),
                    description: localize('gettingStarted.extensions.description.interpolated', "Extensions are VS Code's power-ups. They range from handy productivity hacks, expanding out-of-the-box features, to adding completely new capabilities.\n{0}", Button(localize('browsePopular', "Browse Popular Extensions"), 'command:workbench.extensions.action.showPopularExtensions')),
                    when: 'workspacePlatform != \'webworker\'',
                    media: {
                        type: 'svg', altText: 'VS Code extension marketplace with featured language extensions', path: 'extensions.svg'
                    },
                },
                {
                    id: 'terminal',
                    title: localize('gettingStarted.terminal.title', "Built-in terminal"),
                    description: localize('gettingStarted.terminal.description.interpolated', "Quickly run shell commands and monitor build output, right next to your code.\n{0}", Button(localize('showTerminal', "Open Terminal"), 'command:workbench.action.terminal.toggleTerminal')),
                    when: 'workspacePlatform != \'webworker\' && remoteName != codespaces && !terminalIsOpen',
                    media: {
                        type: 'svg', altText: 'Integrated terminal running a few npm commands', path: 'terminal.svg'
                    },
                },
                {
                    id: 'debugging',
                    title: localize('gettingStarted.debug.title', "Watch your code in action"),
                    description: localize('gettingStarted.debug.description.interpolated', "Accelerate your edit, build, test, and debug loop by setting up a launch configuration.\n{0}", Button(localize('runProject', "Run your Project"), 'command:workbench.action.debug.selectandstart')),
                    when: 'workspacePlatform != \'webworker\' && workspaceFolderCount != 0',
                    media: {
                        type: 'svg', altText: 'Run and debug view.', path: 'debug.svg',
                    },
                },
                {
                    id: 'scmClone',
                    title: localize('gettingStarted.scm.title', "Track your code with Git"),
                    description: localize('gettingStarted.scmClone.description.interpolated', "Set up the built-in version control for your project to track your changes and collaborate with others.\n{0}", Button(localize('cloneRepo', "Clone Repository"), 'command:git.clone')),
                    when: 'config.git.enabled && !git.missing && workspaceFolderCount == 0',
                    media: {
                        type: 'svg', altText: 'Source Control view.', path: 'git.svg',
                    },
                },
                {
                    id: 'scmSetup',
                    title: localize('gettingStarted.scm.title', "Track your code with Git"),
                    description: localize('gettingStarted.scmSetup.description.interpolated', "Set up the built-in version control for your project to track your changes and collaborate with others.\n{0}", Button(localize('initRepo', "Initialize Git Repository"), 'command:git.init')),
                    when: 'config.git.enabled && !git.missing && workspaceFolderCount != 0 && gitOpenRepositoryCount == 0',
                    media: {
                        type: 'svg', altText: 'Source Control view.', path: 'git.svg',
                    },
                },
                {
                    id: 'scm',
                    title: localize('gettingStarted.scm.title', "Track your code with Git"),
                    description: localize('gettingStarted.scm.description.interpolated', "No more looking up Git commands! Git and GitHub workflows are seamlessly integrated.\n{0}", Button(localize('openSCM', "Open Source Control"), 'command:workbench.view.scm')),
                    when: 'config.git.enabled && !git.missing && workspaceFolderCount != 0 && gitOpenRepositoryCount != 0 && activeViewlet != \'workbench.view.scm\'',
                    media: {
                        type: 'svg', altText: 'Source Control view.', path: 'git.svg',
                    },
                },
                {
                    id: 'installGit',
                    title: localize('gettingStarted.installGit.title', "Install Git"),
                    description: localize({ key: 'gettingStarted.installGit.description.interpolated', comment: ['The placeholders are command link items should not be translated'] }, "Install Git to track changes in your projects.\n{0}\n{1}Reload window{2} after installation to complete Git setup.", Button(localize('installGit', "Install Git"), 'https://aka.ms/vscode-install-git'), '[', '](command:workbench.action.reloadWindow)'),
                    when: 'git.missing',
                    media: {
                        type: 'svg', altText: 'Install Git.', path: 'git.svg',
                    },
                    completionEvents: [
                        'onContext:git.state == initialized'
                    ]
                },
                {
                    id: 'tasks',
                    title: localize('gettingStarted.tasks.title', "Automate your project tasks"),
                    when: 'workspaceFolderCount != 0 && workspacePlatform != \'webworker\'',
                    description: localize('gettingStarted.tasks.description.interpolated', "Create tasks for your common workflows and enjoy the integrated experience of running scripts and automatically checking results.\n{0}", Button(localize('runTasks', "Run Auto-detected Tasks"), 'command:workbench.action.tasks.runTask')),
                    media: {
                        type: 'svg', altText: 'Task runner.', path: 'runTask.svg',
                    },
                },
                {
                    id: 'shortcuts',
                    title: localize('gettingStarted.shortcuts.title', "Customize your shortcuts"),
                    description: localize('gettingStarted.shortcuts.description.interpolated', "Once you have discovered your favorite commands, create custom keyboard shortcuts for instant access.\n{0}", Button(localize('keyboardShortcuts', "Keyboard Shortcuts"), 'command:toSide:workbench.action.openGlobalKeybindings')),
                    media: {
                        type: 'svg', altText: 'Interactive shortcuts.', path: 'shortcuts.svg',
                    }
                },
                {
                    id: 'workspaceTrust',
                    title: localize('gettingStarted.workspaceTrust.title', "Safely browse and edit code"),
                    description: localize('gettingStarted.workspaceTrust.description.interpolated', "{0} lets you decide whether your project folders should **allow or restrict** automatic code execution __(required for extensions, debugging, etc)__.\nOpening a file/folder will prompt to grant trust. You can always {1} later.", Button(localize('workspaceTrust', "Workspace Trust"), 'https://code.visualstudio.com/docs/editor/workspace-trust'), Button(localize('enableTrust', "enable trust"), 'command:toSide:workbench.trust.manage')),
                    when: 'workspacePlatform != \'webworker\' && !isWorkspaceTrusted && workspaceFolderCount == 0',
                    media: {
                        type: 'svg', altText: 'Workspace Trust editor in Restricted mode and a primary button for switching to Trusted mode.', path: 'workspaceTrust.svg'
                    },
                },
            ]
        }
    },
    {
        id: 'notebooks',
        title: localize('gettingStarted.notebook.title', "Customize Notebooks"),
        description: '',
        icon: setupIcon,
        isFeatured: false,
        when: `config.${NotebookSetting.openGettingStarted} && userHasOpenedNotebook`,
        walkthroughPageTitle: localize('gettingStarted.notebook.walkthroughPageTitle', 'Notebooks'),
        content: {
            type: 'steps',
            steps: [
                {
                    completionEvents: ['onCommand:notebook.setProfile'],
                    id: 'notebookProfile',
                    title: localize('gettingStarted.notebookProfile.title', "Select the layout for your notebooks"),
                    description: localize('gettingStarted.notebookProfile.description', "Get notebooks to feel just the way you prefer"),
                    when: 'userHasOpenedNotebook',
                    media: {
                        type: 'markdown', path: 'notebookProfile'
                    }
                },
            ]
        }
    },
    {
        id: `${NEW_WELCOME_EXPERIENCE}`,
        title: localize('gettingStarted.new.title', "Get started with VS Code"),
        description: localize('gettingStarted.new.description', "Supercharge coding with AI"),
        isFeatured: false,
        icon: setupIcon,
        when: '!isWeb',
        walkthroughPageTitle: localize('gettingStarted.new.walkthroughPageTitle', 'Set up VS Code'),
        content: {
            type: 'steps',
            steps: [
                {
                    id: 'copilotSetup.chat',
                    title: localize('gettingStarted.agentMode.title', "Agent mode"),
                    description: localize('gettingStarted.agentMode.description', "Analyzes the problem, plans next steps, and makes changes for you."),
                    media: {
                        type: 'svg', altText: 'VS Code Copilot multi file edits', path: 'multi-file-edits.svg'
                    },
                },
                {
                    id: 'copilotSetup.inline',
                    title: localize('gettingStarted.nes.title', "Next edit suggestions"),
                    description: localize('gettingStarted.nes.description', "Get code suggestions that predict your next edit."),
                    media: {
                        type: 'svg', altText: 'Next edit suggestions', path: 'ai-powered-suggestions.svg'
                    },
                },
                {
                    id: 'copilotSetup.customize',
                    title: localize('gettingStarted.customize.title', "Personalized to how you work"),
                    description: localize('gettingStarted.customize.description', "Swap models, add agent mode tools, and create personalized instructions.\n{0}", Button(localize('signUp', "Enable AI features"), 'command:workbench.action.chat.triggerSetupWithoutDialog')),
                    media: {
                        type: 'svg', altText: 'Personalize', path: 'customize-ai.svg'
                    },
                },
                {
                    id: 'newCommandPaletteTask',
                    title: localize('newgettingStarted.commandPalette.title', "All commands within reach"),
                    description: localize('gettingStarted.commandPalette.description.interpolated', "Run commands without reaching for your mouse to accomplish any task in VS Code.\n{0}", Button(localize('commandPalette', "Open Command Palette"), 'command:workbench.action.showCommands')),
                    media: { type: 'svg', altText: 'Command Palette overlay for searching and executing commands.', path: 'commandPalette.svg' },
                },
                {
                    id: 'newPickColorTheme',
                    title: localize('gettingStarted.pickColor.title', "Choose your theme"),
                    description: localize('gettingStarted.pickColor.description.interpolated', "The right theme helps you focus on your code, is easy on your eyes, and is simply more fun to use.\n{0}", Button(localize('titleID', "Browse Color Themes"), 'command:workbench.action.selectTheme')),
                    completionEvents: [
                        'onSettingChanged:workbench.colorTheme',
                        'onCommand:workbench.action.selectTheme'
                    ],
                    media: { type: 'markdown', path: 'theme_picker_small', }
                },
                {
                    id: 'newFindLanguageExtensions',
                    title: localize('newgettingStarted.findLanguageExts.title', "Support for all languages"),
                    description: localize('newgettingStarted.findLanguageExts.description.interpolated', "Install the language extensions you need in your toolkit.\n{0}", Button(localize('browseLangExts', "Browse Language Extensions"), 'command:workbench.extensions.action.showLanguageExtensions')),
                    when: 'workspacePlatform != \'webworker\'',
                    media: {
                        type: 'svg', altText: 'Language extensions', path: 'languages.svg'
                    },
                },
            ]
        }
    }
];
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2V0dGluZ1N0YXJ0ZWRDb250ZW50LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvYWR2aWthci9Eb2N1bWVudHMvYXJjaGl0ZWN0L2FyY2gyL0FyY2hJREUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvd2VsY29tZUdldHRpbmdTdGFydGVkL2NvbW1vbi9nZXR0aW5nU3RhcnRlZENvbnRlbnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxrQkFBa0IsTUFBTSx5QkFBeUIsQ0FBQztBQUN6RCxPQUFPLHVCQUF1QixNQUFNLCtCQUErQixDQUFDO0FBQ3BFLE9BQU8sc0JBQXNCLE1BQU0sNEJBQTRCLENBQUM7QUFDaEUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQzlDLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUU5RCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDakYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQzFFLE9BQU8sRUFBRSxrQ0FBa0MsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBRWhILE9BQU8sT0FBTyxNQUFNLGdEQUFnRCxDQUFDO0FBTXJFLE1BQU0sV0FBVyxHQUFHO0lBQ25CLGdCQUFnQixFQUFFLE9BQU8sQ0FBQyxnQkFBZ0IsRUFBRSxnQkFBZ0IsSUFBSSxFQUFFO0lBQ2xFLGlCQUFpQixFQUFFLE9BQU8sQ0FBQyxnQkFBZ0IsRUFBRSxpQkFBaUIsSUFBSSxFQUFFO0lBQ3BFLFFBQVEsRUFBRSxPQUFPLENBQUMsZ0JBQWdCLEVBQUUsUUFBUSxJQUFJLEVBQUUsT0FBTyxFQUFFLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBRSxFQUFFO0lBQ3pFLG9CQUFvQixFQUFFLE9BQU8sQ0FBQyxnQkFBZ0IsRUFBRSxvQkFBb0IsSUFBSSxFQUFFO0NBQzFFLENBQUM7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