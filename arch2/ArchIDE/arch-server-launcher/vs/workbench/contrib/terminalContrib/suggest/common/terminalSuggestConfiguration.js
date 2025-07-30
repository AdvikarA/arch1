/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../../nls.js';
import { Extensions as ConfigurationExtensions } from '../../../../../platform/configuration/common/configurationRegistry.js';
import { Registry } from '../../../../../platform/registry/common/platform.js';
import product from '../../../../../platform/product/common/product.js';
export var TerminalSuggestSettingId;
(function (TerminalSuggestSettingId) {
    TerminalSuggestSettingId["Enabled"] = "terminal.integrated.suggest.enabled";
    TerminalSuggestSettingId["QuickSuggestions"] = "terminal.integrated.suggest.quickSuggestions";
    TerminalSuggestSettingId["SuggestOnTriggerCharacters"] = "terminal.integrated.suggest.suggestOnTriggerCharacters";
    TerminalSuggestSettingId["RunOnEnter"] = "terminal.integrated.suggest.runOnEnter";
    TerminalSuggestSettingId["WindowsExecutableExtensions"] = "terminal.integrated.suggest.windowsExecutableExtensions";
    TerminalSuggestSettingId["Providers"] = "terminal.integrated.suggest.providers";
    TerminalSuggestSettingId["ShowStatusBar"] = "terminal.integrated.suggest.showStatusBar";
    TerminalSuggestSettingId["CdPath"] = "terminal.integrated.suggest.cdPath";
    TerminalSuggestSettingId["InlineSuggestion"] = "terminal.integrated.suggest.inlineSuggestion";
    TerminalSuggestSettingId["UpArrowNavigatesHistory"] = "terminal.integrated.suggest.upArrowNavigatesHistory";
    TerminalSuggestSettingId["SelectionMode"] = "terminal.integrated.suggest.selectionMode";
})(TerminalSuggestSettingId || (TerminalSuggestSettingId = {}));
export const windowsDefaultExecutableExtensions = [
    'exe', // Executable file
    'bat', // Batch file
    'cmd', // Command script
    'com', // Command file
    'msi', // Windows Installer package
    'ps1', // PowerShell script
    'vbs', // VBScript file
    'js', // JScript file
    'jar', // Java Archive (requires Java runtime)
    'py', // Python script (requires Python interpreter)
    'rb', // Ruby script (requires Ruby interpreter)
    'pl', // Perl script (requires Perl interpreter)
    'sh', // Shell script (via WSL or third-party tools)
];
export const terminalSuggestConfigSection = 'terminal.integrated.suggest';
export const terminalSuggestConfiguration = {
    ["terminal.integrated.suggest.enabled" /* TerminalSuggestSettingId.Enabled */]: {
        restricted: true,
        markdownDescription: localize('suggest.enabled', "Enables terminal intellisense suggestions (preview) for supported shells ({0}) when {1} is set to {2}.\n\nIf shell integration is installed manually, {3} needs to be set to {4} before calling the shell integration script.", 'PowerShell v7+, zsh, bash, fish', `\`#${"terminal.integrated.shellIntegration.enabled" /* TerminalSettingId.ShellIntegrationEnabled */}#\``, '`true`', '`VSCODE_SUGGEST`', '`1`'),
        type: 'boolean',
        default: product.quality !== 'stable',
        tags: ['preview'],
    },
    ["terminal.integrated.suggest.providers" /* TerminalSuggestSettingId.Providers */]: {
        restricted: true,
        markdownDescription: localize('suggest.providers', "Providers are enabled by default. Omit them by setting the id of the provider to `false`."),
        type: 'object',
        properties: {},
        default: {
            'pwsh-shell-integration': false,
        },
        tags: ['preview'],
    },
    ["terminal.integrated.suggest.quickSuggestions" /* TerminalSuggestSettingId.QuickSuggestions */]: {
        restricted: true,
        markdownDescription: localize('suggest.quickSuggestions', "Controls whether suggestions should automatically show up while typing. Also be aware of the {0}-setting which controls if suggestions are triggered by special characters.", `\`#${"terminal.integrated.suggest.suggestOnTriggerCharacters" /* TerminalSuggestSettingId.SuggestOnTriggerCharacters */}#\``),
        type: 'object',
        properties: {
            commands: {
                description: localize('suggest.quickSuggestions.commands', 'Enable quick suggestions for commands, the first word in a command line input.'),
                type: 'string',
                enum: ['off', 'on'],
            },
            arguments: {
                description: localize('suggest.quickSuggestions.arguments', 'Enable quick suggestions for arguments, anything after the first word in a command line input.'),
                type: 'string',
                enum: ['off', 'on'],
            },
            unknown: {
                description: localize('suggest.quickSuggestions.unknown', 'Enable quick suggestions when it\'s unclear what the best suggestion is, if this is on files and folders will be suggested as a fallback.'),
                type: 'string',
                enum: ['off', 'on'],
            },
        },
        default: {
            commands: 'on',
            arguments: 'on',
            unknown: 'off',
        },
        tags: ['preview']
    },
    ["terminal.integrated.suggest.suggestOnTriggerCharacters" /* TerminalSuggestSettingId.SuggestOnTriggerCharacters */]: {
        restricted: true,
        markdownDescription: localize('suggest.suggestOnTriggerCharacters', "Controls whether suggestions should automatically show up when typing trigger characters."),
        type: 'boolean',
        default: true,
        tags: ['preview']
    },
    ["terminal.integrated.suggest.runOnEnter" /* TerminalSuggestSettingId.RunOnEnter */]: {
        restricted: true,
        markdownDescription: localize('suggest.runOnEnter', "Controls whether suggestions should run immediately when `Enter` (not `Tab`) is used to accept the result."),
        enum: ['never', 'exactMatch', 'exactMatchIgnoreExtension', 'always'],
        markdownEnumDescriptions: [
            localize('runOnEnter.never', "Never run on `Enter`."),
            localize('runOnEnter.exactMatch', "Run on `Enter` when the suggestion is typed in its entirety."),
            localize('runOnEnter.exactMatchIgnoreExtension', "Run on `Enter` when the suggestion is typed in its entirety or when a file is typed without its extension included."),
            localize('runOnEnter.always', "Always run on `Enter`.")
        ],
        default: 'never',
        tags: ['preview']
    },
    ["terminal.integrated.suggest.selectionMode" /* TerminalSuggestSettingId.SelectionMode */]: {
        markdownDescription: localize('terminal.integrated.selectionMode', "Controls how suggestion selection works in the integrated terminal."),
        type: 'string',
        enum: ['partial', 'always', 'never'],
        markdownEnumDescriptions: [
            localize('terminal.integrated.selectionMode.partial', "Partially select a suggestion when automatically triggering IntelliSense. `Tab` can be used to accept the first suggestion, only after navigating the suggestions via `Down` will `Enter` also accept the active suggestion."),
            localize('terminal.integrated.selectionMode.always', "Always select a suggestion when automatically triggering IntelliSense. `Enter` or `Tab` can be used to accept the first suggestion."),
            localize('terminal.integrated.selectionMode.never', "Never select a suggestion when automatically triggering IntelliSense. The list must be navigated via `Down` before `Enter` or `Tab` can be used to accept the active suggestion."),
        ],
        default: 'partial',
        tags: ['preview']
    },
    ["terminal.integrated.suggest.windowsExecutableExtensions" /* TerminalSuggestSettingId.WindowsExecutableExtensions */]: {
        restricted: true,
        markdownDescription: localize("terminalWindowsExecutableSuggestionSetting", "A set of windows command executable extensions that will be included as suggestions in the terminal.\n\nMany executables are included by default, listed below:\n\n{0}.\n\nTo exclude an extension, set it to `false`\n\n. To include one not in the list, add it and set it to `true`.", windowsDefaultExecutableExtensions.sort().map(extension => `- ${extension}`).join('\n')),
        type: 'object',
        default: {},
        tags: ['preview']
    },
    ["terminal.integrated.suggest.showStatusBar" /* TerminalSuggestSettingId.ShowStatusBar */]: {
        restricted: true,
        markdownDescription: localize('suggest.showStatusBar', "Controls whether the terminal suggestions status bar should be shown."),
        type: 'boolean',
        default: true,
        tags: ['preview']
    },
    ["terminal.integrated.suggest.cdPath" /* TerminalSuggestSettingId.CdPath */]: {
        restricted: true,
        markdownDescription: localize('suggest.cdPath', "Controls whether to enable $CDPATH support which exposes children of the folders in the $CDPATH variable regardless of the current working directory. $CDPATH is expected to be semi colon-separated on Windows and colon-separated on other platforms."),
        type: 'string',
        enum: ['off', 'relative', 'absolute'],
        markdownEnumDescriptions: [
            localize('suggest.cdPath.off', "Disable the feature."),
            localize('suggest.cdPath.relative', "Enable the feature and use relative paths."),
            localize('suggest.cdPath.absolute', "Enable the feature and use absolute paths. This is useful when the shell doesn't natively support `$CDPATH`."),
        ],
        default: 'absolute',
        tags: ['preview']
    },
    ["terminal.integrated.suggest.inlineSuggestion" /* TerminalSuggestSettingId.InlineSuggestion */]: {
        restricted: true,
        markdownDescription: localize('suggest.inlineSuggestion', "Controls whether the shell's inline suggestion should be detected and how it is scored."),
        type: 'string',
        enum: ['off', 'alwaysOnTopExceptExactMatch', 'alwaysOnTop'],
        markdownEnumDescriptions: [
            localize('suggest.inlineSuggestion.off', "Disable the feature."),
            localize('suggest.inlineSuggestion.alwaysOnTopExceptExactMatch', "Enable the feature and sort the inline suggestion without forcing it to be on top. This means that exact matches will be will be above the inline suggestion."),
            localize('suggest.inlineSuggestion.alwaysOnTop', "Enable the feature and always put the inline suggestion on top."),
        ],
        default: 'alwaysOnTop',
        tags: ['preview']
    },
    ["terminal.integrated.suggest.upArrowNavigatesHistory" /* TerminalSuggestSettingId.UpArrowNavigatesHistory */]: {
        restricted: true,
        markdownDescription: localize('suggest.upArrowNavigatesHistory', "Determines whether the up arrow key navigates the command history when focus is on the first suggestion and navigation has not yet occurred. When set to false, the up arrow will move focus to the last suggestion instead."),
        type: 'boolean',
        default: true,
        tags: ['preview']
    },
};
let terminalSuggestProvidersConfiguration;
export function registerTerminalSuggestProvidersConfiguration(availableProviders) {
    const registry = Registry.as(ConfigurationExtensions.Configuration);
    const oldProvidersConfiguration = terminalSuggestProvidersConfiguration;
    const providersProperties = {};
    const corePwshProviderId = 'core:pwsh-shell-integration';
    const defaultValue = {
        [corePwshProviderId]: false,
    };
    providersProperties[corePwshProviderId] ??= {
        type: 'boolean',
        description: localize('suggest.provider.pwsh.description', "Enable or disable the PowerShell script-based provider. This enables PowerShell-specific argument completion."),
        deprecated: true,
        deprecationMessage: localize('suggest.provider.pwsh.deprecation', "This is deprecated as it has performance problems, the upcoming LSP provider will supersede this."),
        default: false
    };
    if (availableProviders) {
        for (const providerId of availableProviders) {
            if (providerId in defaultValue) {
                continue;
            }
            providersProperties[providerId] = {
                type: 'boolean',
                description: localize('suggest.provider.description', "Whether to enable this provider."),
                default: true
            };
            defaultValue[providerId] = true;
        }
    }
    terminalSuggestProvidersConfiguration = {
        id: 'terminalSuggestProviders',
        order: 100,
        title: localize('terminalSuggestProvidersConfigurationTitle', "Terminal Suggest Providers"),
        type: 'object',
        properties: {
            ["terminal.integrated.suggest.providers" /* TerminalSuggestSettingId.Providers */]: {
                restricted: true,
                markdownDescription: localize('suggest.providers', "Providers are enabled by default. Omit them by setting the id of the provider to `false`."),
                type: 'object',
                properties: providersProperties,
                default: defaultValue,
                tags: ['preview'],
            }
        }
    };
    registry.updateConfigurations({
        add: [terminalSuggestProvidersConfiguration],
        remove: oldProvidersConfiguration ? [oldProvidersConfiguration] : []
    });
}
registerTerminalSuggestProvidersConfiguration([]);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxTdWdnZXN0Q29uZmlndXJhdGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL2FkdmlrYXIvRG9jdW1lbnRzL2FyY2hpdGVjdC9hcmNoMi9BcmNoSURFL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlcm1pbmFsQ29udHJpYi9zdWdnZXN0L2NvbW1vbi90ZXJtaW5hbFN1Z2dlc3RDb25maWd1cmF0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUNqRCxPQUFPLEVBQW9ELFVBQVUsSUFBSSx1QkFBdUIsRUFBMEIsTUFBTSx1RUFBdUUsQ0FBQztBQUN4TSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0scURBQXFELENBQUM7QUFDL0UsT0FBTyxPQUFPLE1BQU0sbURBQW1ELENBQUM7QUFHeEUsTUFBTSxDQUFOLElBQWtCLHdCQVlqQjtBQVpELFdBQWtCLHdCQUF3QjtJQUN6QywyRUFBK0MsQ0FBQTtJQUMvQyw2RkFBaUUsQ0FBQTtJQUNqRSxpSEFBcUYsQ0FBQTtJQUNyRixpRkFBcUQsQ0FBQTtJQUNyRCxtSEFBdUYsQ0FBQTtJQUN2RiwrRUFBbUQsQ0FBQTtJQUNuRCx1RkFBMkQsQ0FBQTtJQUMzRCx5RUFBNkMsQ0FBQTtJQUM3Qyw2RkFBaUUsQ0FBQTtJQUNqRSwyR0FBK0UsQ0FBQTtJQUMvRSx1RkFBMkQsQ0FBQTtBQUM1RCxDQUFDLEVBWmlCLHdCQUF3QixLQUF4Qix3QkFBd0IsUUFZekM7QUFFRCxNQUFNLENBQUMsTUFBTSxrQ0FBa0MsR0FBYTtJQUMzRCxLQUFLLEVBQUksa0JBQWtCO0lBQzNCLEtBQUssRUFBSSxhQUFhO0lBQ3RCLEtBQUssRUFBSSxpQkFBaUI7SUFDMUIsS0FBSyxFQUFJLGVBQWU7SUFFeEIsS0FBSyxFQUFJLDRCQUE0QjtJQUVyQyxLQUFLLEVBQUksb0JBQW9CO0lBRTdCLEtBQUssRUFBSSxnQkFBZ0I7SUFDekIsSUFBSSxFQUFLLGVBQWU7SUFDeEIsS0FBSyxFQUFJLHVDQUF1QztJQUNoRCxJQUFJLEVBQUssOENBQThDO0lBQ3ZELElBQUksRUFBSywwQ0FBMEM7SUFDbkQsSUFBSSxFQUFLLDBDQUEwQztJQUNuRCxJQUFJLEVBQUssOENBQThDO0NBQ3ZELENBQUM7QUFFRixNQUFNLENBQUMsTUFBTSw0QkFBNEIsR0FBRyw2QkFBNkIsQ0FBQztBQWtCMUUsTUFBTSxDQUFDLE1BQU0sNEJBQTRCLEdBQW9EO0lBQzVGLDhFQUFrQyxFQUFFO1FBQ25DLFVBQVUsRUFBRSxJQUFJO1FBQ2hCLG1CQUFtQixFQUFFLFFBQVEsQ0FBQyxpQkFBaUIsRUFBRSwrTkFBK04sRUFBRSxpQ0FBaUMsRUFBRSxNQUFNLDhGQUF5QyxLQUFLLEVBQUUsUUFBUSxFQUFFLGtCQUFrQixFQUFFLEtBQUssQ0FBQztRQUMvWSxJQUFJLEVBQUUsU0FBUztRQUNmLE9BQU8sRUFBRSxPQUFPLENBQUMsT0FBTyxLQUFLLFFBQVE7UUFDckMsSUFBSSxFQUFFLENBQUMsU0FBUyxDQUFDO0tBQ2pCO0lBQ0Qsa0ZBQW9DLEVBQUU7UUFDckMsVUFBVSxFQUFFLElBQUk7UUFDaEIsbUJBQW1CLEVBQUUsUUFBUSxDQUFDLG1CQUFtQixFQUFFLDJGQUEyRixDQUFDO1FBQy9JLElBQUksRUFBRSxRQUFRO1FBQ2QsVUFBVSxFQUFFLEVBQUU7UUFDZCxPQUFPLEVBQUU7WUFDUix3QkFBd0IsRUFBRSxLQUFLO1NBQy9CO1FBQ0QsSUFBSSxFQUFFLENBQUMsU0FBUyxDQUFDO0tBQ2pCO0lBQ0QsZ0dBQTJDLEVBQUU7UUFDNUMsVUFBVSxFQUFFLElBQUk7UUFDaEIsbUJBQW1CLEVBQUUsUUFBUSxDQUFDLDBCQUEwQixFQUFFLDZLQUE2SyxFQUFFLE1BQU0sa0hBQW1ELEtBQUssQ0FBQztRQUN4UyxJQUFJLEVBQUUsUUFBUTtRQUNkLFVBQVUsRUFBRTtZQUNYLFFBQVEsRUFBRTtnQkFDVCxXQUFXLEVBQUUsUUFBUSxDQUFDLG1DQUFtQyxFQUFFLGdGQUFnRixDQUFDO2dCQUM1SSxJQUFJLEVBQUUsUUFBUTtnQkFDZCxJQUFJLEVBQUUsQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDO2FBQ25CO1lBQ0QsU0FBUyxFQUFFO2dCQUNWLFdBQVcsRUFBRSxRQUFRLENBQUMsb0NBQW9DLEVBQUUsZ0dBQWdHLENBQUM7Z0JBQzdKLElBQUksRUFBRSxRQUFRO2dCQUNkLElBQUksRUFBRSxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUM7YUFDbkI7WUFDRCxPQUFPLEVBQUU7Z0JBQ1IsV0FBVyxFQUFFLFFBQVEsQ0FBQyxrQ0FBa0MsRUFBRSwySUFBMkksQ0FBQztnQkFDdE0sSUFBSSxFQUFFLFFBQVE7Z0JBQ2QsSUFBSSxFQUFFLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQzthQUNuQjtTQUNEO1FBQ0QsT0FBTyxFQUFFO1lBQ1IsUUFBUSxFQUFFLElBQUk7WUFDZCxTQUFTLEVBQUUsSUFBSTtZQUNmLE9BQU8sRUFBRSxLQUFLO1NBQ2Q7UUFDRCxJQUFJLEVBQUUsQ0FBQyxTQUFTLENBQUM7S0FDakI7SUFDRCxvSEFBcUQsRUFBRTtRQUN0RCxVQUFVLEVBQUUsSUFBSTtRQUNoQixtQkFBbUIsRUFBRSxRQUFRLENBQUMsb0NBQW9DLEVBQUUsMkZBQTJGLENBQUM7UUFDaEssSUFBSSxFQUFFLFNBQVM7UUFDZixPQUFPLEVBQUUsSUFBSTtRQUNiLElBQUksRUFBRSxDQUFDLFNBQVMsQ0FBQztLQUNqQjtJQUNELG9GQUFxQyxFQUFFO1FBQ3RDLFVBQVUsRUFBRSxJQUFJO1FBQ2hCLG1CQUFtQixFQUFFLFFBQVEsQ0FBQyxvQkFBb0IsRUFBRSw0R0FBNEcsQ0FBQztRQUNqSyxJQUFJLEVBQUUsQ0FBQyxPQUFPLEVBQUUsWUFBWSxFQUFFLDJCQUEyQixFQUFFLFFBQVEsQ0FBQztRQUNwRSx3QkFBd0IsRUFBRTtZQUN6QixRQUFRLENBQUMsa0JBQWtCLEVBQUUsdUJBQXVCLENBQUM7WUFDckQsUUFBUSxDQUFDLHVCQUF1QixFQUFFLDhEQUE4RCxDQUFDO1lBQ2pHLFFBQVEsQ0FBQyxzQ0FBc0MsRUFBRSxxSEFBcUgsQ0FBQztZQUN2SyxRQUFRLENBQUMsbUJBQW1CLEVBQUUsd0JBQXdCLENBQUM7U0FDdkQ7UUFDRCxPQUFPLEVBQUUsT0FBTztRQUNoQixJQUFJLEVBQUUsQ0FBQyxTQUFTLENBQUM7S0FDakI7SUFDRCwwRkFBd0MsRUFBRTtRQUN6QyxtQkFBbUIsRUFBRSxRQUFRLENBQUMsbUNBQW1DLEVBQUUscUVBQXFFLENBQUM7UUFDekksSUFBSSxFQUFFLFFBQVE7UUFDZCxJQUFJLEVBQUUsQ0FBQyxTQUFTLEVBQUUsUUFBUSxFQUFFLE9BQU8sQ0FBQztRQUNwQyx3QkFBd0IsRUFBRTtZQUN6QixRQUFRLENBQUMsMkNBQTJDLEVBQUUsOE5BQThOLENBQUM7WUFDclIsUUFBUSxDQUFDLDBDQUEwQyxFQUFFLHFJQUFxSSxDQUFDO1lBQzNMLFFBQVEsQ0FBQyx5Q0FBeUMsRUFBRSxrTEFBa0wsQ0FBQztTQUN2TztRQUNELE9BQU8sRUFBRSxTQUFTO1FBQ2xCLElBQUksRUFBRSxDQUFDLFNBQVMsQ0FBQztLQUNqQjtJQUNELHNIQUFzRCxFQUFFO1FBQ3ZELFVBQVUsRUFBRSxJQUFJO1FBQ2hCLG1CQUFtQixFQUFFLFFBQVEsQ0FBQyw0Q0FBNEMsRUFBRSx5UkFBeVIsRUFDcFcsa0NBQWtDLENBQUMsSUFBSSxFQUFFLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUMsS0FBSyxTQUFTLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FDdkY7UUFDRCxJQUFJLEVBQUUsUUFBUTtRQUNkLE9BQU8sRUFBRSxFQUFFO1FBQ1gsSUFBSSxFQUFFLENBQUMsU0FBUyxDQUFDO0tBQ2pCO0lBQ0QsMEZBQXdDLEVBQUU7UUFDekMsVUFBVSxFQUFFLElBQUk7UUFDaEIsbUJBQW1CLEVBQUUsUUFBUSxDQUFDLHVCQUF1QixFQUFFLHVFQUF1RSxDQUFDO1FBQy9ILElBQUksRUFBRSxTQUFTO1FBQ2YsT0FBTyxFQUFFLElBQUk7UUFDYixJQUFJLEVBQUUsQ0FBQyxTQUFTLENBQUM7S0FDakI7SUFDRCw0RUFBaUMsRUFBRTtRQUNsQyxVQUFVLEVBQUUsSUFBSTtRQUNoQixtQkFBbUIsRUFBRSxRQUFRLENBQUMsZ0JBQWdCLEVBQUUseVBBQXlQLENBQUM7UUFDMVMsSUFBSSxFQUFFLFFBQVE7UUFDZCxJQUFJLEVBQUUsQ0FBQyxLQUFLLEVBQUUsVUFBVSxFQUFFLFVBQVUsQ0FBQztRQUNyQyx3QkFBd0IsRUFBRTtZQUN6QixRQUFRLENBQUMsb0JBQW9CLEVBQUUsc0JBQXNCLENBQUM7WUFDdEQsUUFBUSxDQUFDLHlCQUF5QixFQUFFLDRDQUE0QyxDQUFDO1lBQ2pGLFFBQVEsQ0FBQyx5QkFBeUIsRUFBRSw4R0FBOEcsQ0FBQztTQUNuSjtRQUNELE9BQU8sRUFBRSxVQUFVO1FBQ25CLElBQUksRUFBRSxDQUFDLFNBQVMsQ0FBQztLQUNqQjtJQUNELGdHQUEyQyxFQUFFO1FBQzVDLFVBQVUsRUFBRSxJQUFJO1FBQ2hCLG1CQUFtQixFQUFFLFFBQVEsQ0FBQywwQkFBMEIsRUFBRSx5RkFBeUYsQ0FBQztRQUNwSixJQUFJLEVBQUUsUUFBUTtRQUNkLElBQUksRUFBRSxDQUFDLEtBQUssRUFBRSw2QkFBNkIsRUFBRSxhQUFhLENBQUM7UUFDM0Qsd0JBQXdCLEVBQUU7WUFDekIsUUFBUSxDQUFDLDhCQUE4QixFQUFFLHNCQUFzQixDQUFDO1lBQ2hFLFFBQVEsQ0FBQyxzREFBc0QsRUFBRSwrSkFBK0osQ0FBQztZQUNqTyxRQUFRLENBQUMsc0NBQXNDLEVBQUUsaUVBQWlFLENBQUM7U0FDbkg7UUFDRCxPQUFPLEVBQUUsYUFBYTtRQUN0QixJQUFJLEVBQUUsQ0FBQyxTQUFTLENBQUM7S0FDakI7SUFDRCw4R0FBa0QsRUFBRTtRQUNuRCxVQUFVLEVBQUUsSUFBSTtRQUNoQixtQkFBbUIsRUFBRSxRQUFRLENBQUMsaUNBQWlDLEVBQUUsOE5BQThOLENBQUM7UUFDaFMsSUFBSSxFQUFFLFNBQVM7UUFDZixPQUFPLEVBQUUsSUFBSTtRQUNiLElBQUksRUFBRSxDQUFDLFNBQVMsQ0FBQztLQUNqQjtDQUVELENBQUM7QUFFRixJQUFJLHFDQUFxRSxDQUFDO0FBRTFFLE1BQU0sVUFBVSw2Q0FBNkMsQ0FBQyxrQkFBNkI7SUFDMUYsTUFBTSxRQUFRLEdBQUcsUUFBUSxDQUFDLEVBQUUsQ0FBeUIsdUJBQXVCLENBQUMsYUFBYSxDQUFDLENBQUM7SUFFNUYsTUFBTSx5QkFBeUIsR0FBRyxxQ0FBcUMsQ0FBQztJQUV4RSxNQUFNLG1CQUFtQixHQUFvRCxFQUFFLENBQUM7SUFFaEYsTUFBTSxrQkFBa0IsR0FBRyw2QkFBNkIsQ0FBQztJQUN6RCxNQUFNLFlBQVksR0FBK0I7UUFDaEQsQ0FBQyxrQkFBa0IsQ0FBQyxFQUFFLEtBQUs7S0FDM0IsQ0FBQztJQUNGLG1CQUFtQixDQUFDLGtCQUFrQixDQUFDLEtBQUs7UUFDM0MsSUFBSSxFQUFFLFNBQVM7UUFDZixXQUFXLEVBQUUsUUFBUSxDQUFDLG1DQUFtQyxFQUFFLCtHQUErRyxDQUFDO1FBQzNLLFVBQVUsRUFBRSxJQUFJO1FBQ2hCLGtCQUFrQixFQUFFLFFBQVEsQ0FBQyxtQ0FBbUMsRUFBRSxtR0FBbUcsQ0FBQztRQUN0SyxPQUFPLEVBQUUsS0FBSztLQUNkLENBQUM7SUFFRixJQUFJLGtCQUFrQixFQUFFLENBQUM7UUFDeEIsS0FBSyxNQUFNLFVBQVUsSUFBSSxrQkFBa0IsRUFBRSxDQUFDO1lBQzdDLElBQUksVUFBVSxJQUFJLFlBQVksRUFBRSxDQUFDO2dCQUNoQyxTQUFTO1lBQ1YsQ0FBQztZQUNELG1CQUFtQixDQUFDLFVBQVUsQ0FBQyxHQUFHO2dCQUNqQyxJQUFJLEVBQUUsU0FBUztnQkFDZixXQUFXLEVBQUUsUUFBUSxDQUFDLDhCQUE4QixFQUFFLGtDQUFrQyxDQUFDO2dCQUN6RixPQUFPLEVBQUUsSUFBSTthQUNiLENBQUM7WUFDRixZQUFZLENBQUMsVUFBVSxDQUFDLEdBQUcsSUFBSSxDQUFDO1FBQ2pDLENBQUM7SUFDRixDQUFDO0lBRUQscUNBQXFDLEdBQUc7UUFDdkMsRUFBRSxFQUFFLDBCQUEwQjtRQUM5QixLQUFLLEVBQUUsR0FBRztRQUNWLEtBQUssRUFBRSxRQUFRLENBQUMsNENBQTRDLEVBQUUsNEJBQTRCLENBQUM7UUFDM0YsSUFBSSxFQUFFLFFBQVE7UUFDZCxVQUFVLEVBQUU7WUFDWCxrRkFBb0MsRUFBRTtnQkFDckMsVUFBVSxFQUFFLElBQUk7Z0JBQ2hCLG1CQUFtQixFQUFFLFFBQVEsQ0FBQyxtQkFBbUIsRUFBRSwyRkFBMkYsQ0FBQztnQkFDL0ksSUFBSSxFQUFFLFFBQVE7Z0JBQ2QsVUFBVSxFQUFFLG1CQUFtQjtnQkFDL0IsT0FBTyxFQUFFLFlBQVk7Z0JBQ3JCLElBQUksRUFBRSxDQUFDLFNBQVMsQ0FBQzthQUNqQjtTQUNEO0tBQ0QsQ0FBQztJQUVGLFFBQVEsQ0FBQyxvQkFBb0IsQ0FBQztRQUM3QixHQUFHLEVBQUUsQ0FBQyxxQ0FBcUMsQ0FBQztRQUM1QyxNQUFNLEVBQUUseUJBQXlCLENBQUMsQ0FBQyxDQUFDLENBQUMseUJBQXlCLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRTtLQUNwRSxDQUFDLENBQUM7QUFDSixDQUFDO0FBRUQsNkNBQTZDLENBQUMsRUFBRSxDQUFDLENBQUMifQ==