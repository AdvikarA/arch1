/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../../nls.js';
export var TerminalChatAgentToolsSettingId;
(function (TerminalChatAgentToolsSettingId) {
    TerminalChatAgentToolsSettingId["AutoApprove"] = "chat.agent.terminal.autoApprove";
})(TerminalChatAgentToolsSettingId || (TerminalChatAgentToolsSettingId = {}));
const autoApproveBoolean = {
    type: 'boolean',
    enum: [
        true,
        false,
    ],
    enumDescriptions: [
        localize('autoApprove.true', "Automatically approve the pattern."),
        localize('autoApprove.false', "Require explicit approval for the pattern."),
    ],
    description: localize('autoApprove.key', "The start of a command to match against. A regular expression can be provided by wrapping the string in `/` characters."),
};
export const terminalChatAgentToolsConfiguration = {
    ["chat.agent.terminal.autoApprove" /* TerminalChatAgentToolsSettingId.AutoApprove */]: {
        markdownDescription: [
            localize('autoApprove.description.intro', "A list of commands or regular expressions that control whether the run in terminal tool commands require explicit approval. These will be matched against the start of a command. A regular expression can be provided by wrapping the string in {0} characters followed by optional flags such as {1} for case-insensitivity.", '`/`', '`i`'),
            localize('autoApprove.description.values', "Set to {0} to automatically approve commands, {1} to always require explicit approval or {2} to unset the value.", '`true`', '`false`', '`null`'),
            localize('autoApprove.description.subCommands', "Note that these commands and regular expressions are evaluated for every _sub-command_ within the full _command line_, so {0} for example will need both {1} and {2} to match a {3} entry and must not match a {4} entry in order to auto approve. Inline commands are also detected so {5} will need both {5} and {6} to pass.", '`foo && bar`', '`foo`', '`bar`', '`true`', '`false`', '`echo $(rm file)`', '`rm file`'),
            localize('autoApprove.description.commandLine', "An object can be used to match against the full command line instead of matching sub-commands and inline commands, for example {0}. In order to be auto approved _both_ the sub-command and command line must not be explicitly denied, then _either_ all sub-commands or command line needs to be approved.", '`{ approve: false, matchCommandLine: true }`'),
            [
                localize('autoApprove.description.examples.title', 'Examples:'),
                `|${localize('autoApprove.description.examples.value', "Value")}|${localize('autoApprove.description.examples.description', "Description")}|`,
                '|---|---|',
                '| `\"mkdir\": true` | ' + localize('autoApprove.description.examples.mkdir', "Allow all commands starting with {0}", '`mkdir`'),
                '| `\"npm run build\": true` | ' + localize('autoApprove.description.examples.npmRunBuild', "Allow all commands starting with {0}", '`npm run build`'),
                '| `\"/^git (status\\|show\\b.*)$/\": true` | ' + localize('autoApprove.description.examples.regexGit', "Allow {0} and all commands starting with {1}", '`git status`', '`git show`'),
                '| `\"/^Get-ChildItem\\b/i\": true` | ' + localize('autoApprove.description.examples.regexCase', "will allow {0} commands regardless of casing", '`Get-ChildItem`'),
                '| `\"/.*/\": true` | ' + localize('autoApprove.description.examples.regexAll', "Allow all commands (denied commands still require approval)"),
                '| `\"rm\": false` | ' + localize('autoApprove.description.examples.rm', "Require explicit approval for all commands starting with {0}", '`rm`'),
                '| `\"/\.ps1/i\": { approve: false, matchCommandLine: true }` | ' + localize('autoApprove.description.examples.ps1', "Require explicit approval for any _command line_ that contains {0} regardless of casing", '`".ps1"`'),
                '| `\"rm\": null` | ' + localize('autoApprove.description.examples.rmUnset', "Unset the default {0} value for {1}", '`false`', '`rm`'),
            ].join('\n')
        ].join('\n\n'),
        type: 'object',
        scope: 3 /* ConfigurationScope.APPLICATION_MACHINE */,
        additionalProperties: {
            anyOf: [
                autoApproveBoolean,
                {
                    type: 'object',
                    properties: {
                        approve: autoApproveBoolean,
                        matchCommandLine: {
                            type: 'boolean',
                            enum: [
                                true,
                                false,
                            ],
                            enumDescriptions: [
                                localize('autoApprove.matchCommandLine.true', "Match against the full command line, eg. `foo && bar`."),
                                localize('autoApprove.matchCommandLine.false', "Match against sub-commands and inline commands, eg. `foo && bar` will need both `foo` and `bar` to match."),
                            ],
                            description: localize('autoApprove.matchCommandLine', "Whether to match against the full command line, as opposed to splitting by sub-commands and inline commands."),
                        }
                    }
                },
                {
                    type: 'null',
                    description: localize('autoApprove.null', "Ignore the pattern, this is useful for unsetting the same pattern set at a higher scope."),
                },
            ]
        },
        tags: [
            'experimental'
        ],
        default: {
            rm: false,
            rmdir: false,
            del: false,
            kill: false,
            curl: false,
            wget: false,
            eval: false,
            chmod: false,
            chown: false,
            '/^Remove-Item\\b/i': false,
        },
    }
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxDaGF0QWdlbnRUb29sc0NvbmZpZ3VyYXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9hZHZpa2FyL0RvY3VtZW50cy9hcmNoaXRlY3QvYXJjaDIvQXJjaElERS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXJtaW5hbENvbnRyaWIvY2hhdEFnZW50VG9vbHMvY29tbW9uL3Rlcm1pbmFsQ2hhdEFnZW50VG9vbHNDb25maWd1cmF0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBSWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUdqRCxNQUFNLENBQU4sSUFBa0IsK0JBRWpCO0FBRkQsV0FBa0IsK0JBQStCO0lBQ2hELGtGQUErQyxDQUFBO0FBQ2hELENBQUMsRUFGaUIsK0JBQStCLEtBQS9CLCtCQUErQixRQUVoRDtBQU1ELE1BQU0sa0JBQWtCLEdBQWdCO0lBQ3ZDLElBQUksRUFBRSxTQUFTO0lBQ2YsSUFBSSxFQUFFO1FBQ0wsSUFBSTtRQUNKLEtBQUs7S0FDTDtJQUNELGdCQUFnQixFQUFFO1FBQ2pCLFFBQVEsQ0FBQyxrQkFBa0IsRUFBRSxvQ0FBb0MsQ0FBQztRQUNsRSxRQUFRLENBQUMsbUJBQW1CLEVBQUUsNENBQTRDLENBQUM7S0FDM0U7SUFDRCxXQUFXLEVBQUUsUUFBUSxDQUFDLGlCQUFpQixFQUFFLHlIQUF5SCxDQUFDO0NBQ25LLENBQUM7QUFFRixNQUFNLENBQUMsTUFBTSxtQ0FBbUMsR0FBb0Q7SUFDbkcscUZBQTZDLEVBQUU7UUFDOUMsbUJBQW1CLEVBQUU7WUFDcEIsUUFBUSxDQUFDLCtCQUErQixFQUFFLGdVQUFnVSxFQUFFLEtBQUssRUFBRSxLQUFLLENBQUM7WUFDelgsUUFBUSxDQUFDLGdDQUFnQyxFQUFFLGtIQUFrSCxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsUUFBUSxDQUFDO1lBQzdMLFFBQVEsQ0FBQyxx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