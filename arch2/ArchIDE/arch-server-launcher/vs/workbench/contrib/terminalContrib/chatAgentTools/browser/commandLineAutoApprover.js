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
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { isPowerShell } from './runInTerminalHelpers.js';
let CommandLineAutoApprover = class CommandLineAutoApprover extends Disposable {
    constructor(_configurationService) {
        super();
        this._configurationService = _configurationService;
        this._denyListRules = [];
        this._allowListRules = [];
        this._allowListCommandLineRules = [];
        this._denyListCommandLineRules = [];
        this.updateConfiguration();
        this._register(this._configurationService.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration("chat.agent.terminal.autoApprove" /* TerminalChatAgentToolsSettingId.AutoApprove */)) {
                this.updateConfiguration();
            }
        }));
    }
    updateConfiguration() {
        const { denyListRules, allowListRules, allowListCommandLineRules, denyListCommandLineRules } = this._mapAutoApproveConfigToRules(this._configurationService.getValue("chat.agent.terminal.autoApprove" /* TerminalChatAgentToolsSettingId.AutoApprove */));
        this._allowListRules = allowListRules;
        this._denyListRules = denyListRules;
        this._allowListCommandLineRules = allowListCommandLineRules;
        this._denyListCommandLineRules = denyListCommandLineRules;
    }
    isCommandAutoApproved(command, shell, os) {
        // Check the deny list to see if this command requires explicit approval
        for (const rule of this._denyListRules) {
            if (this._commandMatchesRegex(rule.regex, command, shell, os)) {
                return { result: 'denied', reason: `Command '${command}' is denied by deny list rule: ${rule.sourceText}` };
            }
        }
        // Check the allow list to see if the command is allowed to run without explicit approval
        for (const rule of this._allowListRules) {
            if (this._commandMatchesRegex(rule.regex, command, shell, os)) {
                return { result: 'approved', reason: `Command '${command}' is approved by allow list rule: ${rule.sourceText}` };
            }
        }
        // TODO: LLM-based auto-approval https://github.com/microsoft/vscode/issues/253267
        // Fallback is always to require approval
        return { result: 'noMatch', reason: `Command '${command}' has no matching auto approve entries` };
    }
    isCommandLineAutoApproved(commandLine) {
        // Check the deny list first to see if this command line requires explicit approval
        for (const rule of this._denyListCommandLineRules) {
            if (rule.regex.test(commandLine)) {
                return { result: 'denied', reason: `Command line '${commandLine}' is denied by deny list rule: ${rule.sourceText}` };
            }
        }
        // Check if the full command line matches any of the allow list command line regexes
        for (const rule of this._allowListCommandLineRules) {
            if (rule.regex.test(commandLine)) {
                return { result: 'approved', reason: `Command line '${commandLine}' is approved by allow list rule: ${rule.sourceText}` };
            }
        }
        return { result: 'noMatch', reason: `Command line '${commandLine}' has no matching auto approve entries` };
    }
    _commandMatchesRegex(regex, command, shell, os) {
        if (regex.test(command)) {
            return true;
        }
        else if (isPowerShell(shell, os) && command.startsWith('(')) {
            // Allow ignoring of the leading ( for PowerShell commands as it's a command pattern to
            // operate on the output of a command. For example `(Get-Content README.md) ...`
            if (regex.test(command.slice(1))) {
                return true;
            }
        }
        return false;
    }
    _mapAutoApproveConfigToRules(config) {
        if (!config || typeof config !== 'object') {
            return {
                denyListRules: [],
                allowListRules: [],
                allowListCommandLineRules: [],
                denyListCommandLineRules: []
            };
        }
        const denyListRules = [];
        const allowListRules = [];
        const allowListCommandLineRules = [];
        const denyListCommandLineRules = [];
        Object.entries(config).forEach(([key, value]) => {
            if (typeof value === 'boolean') {
                const regex = this._convertAutoApproveEntryToRegex(key);
                // IMPORTANT: Only true and false are used, null entries need to be ignored
                if (value === true) {
                    allowListRules.push({ regex, sourceText: key });
                }
                else if (value === false) {
                    denyListRules.push({ regex, sourceText: key });
                }
            }
            else if (typeof value === 'object' && value !== null) {
                // Handle object format like { approve: true/false, matchCommandLine: true/false }
                const objectValue = value;
                if (typeof objectValue.approve === 'boolean') {
                    const regex = this._convertAutoApproveEntryToRegex(key);
                    if (objectValue.approve === true) {
                        if (objectValue.matchCommandLine === true) {
                            allowListCommandLineRules.push({ regex, sourceText: key });
                        }
                        else {
                            allowListRules.push({ regex, sourceText: key });
                        }
                    }
                    else if (objectValue.approve === false) {
                        if (objectValue.matchCommandLine === true) {
                            denyListCommandLineRules.push({ regex, sourceText: key });
                        }
                        else {
                            denyListRules.push({ regex, sourceText: key });
                        }
                    }
                }
            }
        });
        return {
            denyListRules,
            allowListRules,
            allowListCommandLineRules,
            denyListCommandLineRules
        };
    }
    _convertAutoApproveEntryToRegex(value) {
        // If it's wrapped in `/`, it's in regex format and should be converted directly
        // Support all standard JavaScript regex flags: d, g, i, m, s, u, v, y
        const regexMatch = value.match(/^\/(?<pattern>.+)\/(?<flags>[dgimsuvy]*)$/);
        const regexPattern = regexMatch?.groups?.pattern;
        if (regexPattern) {
            let flags = regexMatch.groups?.flags;
            // Remove global flag as it can cause confusion
            if (flags) {
                flags = flags.replaceAll('g', '');
            }
            return new RegExp(regexPattern, flags || undefined);
        }
        // Escape regex special characters
        const sanitizedValue = value.replace(/[\\^$.*+?()[\]{}|]/g, '\\$&');
        // Regular strings should match the start of the command line and be a word boundary
        return new RegExp(`^${sanitizedValue}\\b`);
    }
};
CommandLineAutoApprover = __decorate([
    __param(0, IConfigurationService)
], CommandLineAutoApprover);
export { CommandLineAutoApprover };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbWFuZExpbmVBdXRvQXBwcm92ZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9hZHZpa2FyL0RvY3VtZW50cy9hcmNoaXRlY3QvYXJjaDIvQXJjaElERS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXJtaW5hbENvbnRyaWIvY2hhdEFnZW50VG9vbHMvYnJvd3Nlci9jb21tYW5kTGluZUF1dG9BcHByb3Zlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFFckUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0RBQStELENBQUM7QUFFdEcsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDJCQUEyQixDQUFDO0FBU2xELElBQU0sdUJBQXVCLEdBQTdCLE1BQU0sdUJBQXdCLFNBQVEsVUFBVTtJQU10RCxZQUN3QixxQkFBNkQ7UUFFcEYsS0FBSyxFQUFFLENBQUM7UUFGZ0MsMEJBQXFCLEdBQXJCLHFCQUFxQixDQUF1QjtRQU43RSxtQkFBYyxHQUF1QixFQUFFLENBQUM7UUFDeEMsb0JBQWUsR0FBdUIsRUFBRSxDQUFDO1FBQ3pDLCtCQUEwQixHQUF1QixFQUFFLENBQUM7UUFDcEQsOEJBQXlCLEdBQXVCLEVBQUUsQ0FBQztRQU0xRCxJQUFJLENBQUMsbUJBQW1CLEVBQUUsQ0FBQztRQUMzQixJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDLENBQUMsRUFBRTtZQUN0RSxJQUFJLENBQUMsQ0FBQyxvQkFBb0IscUZBQTZDLEVBQUUsQ0FBQztnQkFDekUsSUFBSSxDQUFDLG1CQUFtQixFQUFFLENBQUM7WUFDNUIsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDO0lBRUQsbUJBQW1CO1FBQ2xCLE1BQU0sRUFBRSxhQUFhLEVBQUUsY0FBYyxFQUFFLHlCQUF5QixFQUFFLHdCQUF3QixFQUFFLEdBQUcsSUFBSSxDQUFDLDRCQUE0QixDQUFDLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxRQUFRLHFGQUE2QyxDQUFDLENBQUM7UUFDbk4sSUFBSSxDQUFDLGVBQWUsR0FBRyxjQUFjLENBQUM7UUFDdEMsSUFBSSxDQUFDLGNBQWMsR0FBRyxhQUFhLENBQUM7UUFDcEMsSUFBSSxDQUFDLDBCQUEwQixHQUFHLHlCQUF5QixDQUFDO1FBQzVELElBQUksQ0FBQyx5QkFBeUIsR0FBRyx3QkFBd0IsQ0FBQztJQUMzRCxDQUFDO0lBRUQscUJBQXFCLENBQUMsT0FBZSxFQUFFLEtBQWEsRUFBRSxFQUFtQjtRQUN4RSx3RUFBd0U7UUFDeEUsS0FBSyxNQUFNLElBQUksSUFBSSxJQUFJLENBQUMsY0FBYyxFQUFFLENBQUM7WUFDeEMsSUFBSSxJQUFJLENBQUMsb0JBQW9CLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLEVBQUUsQ0FBQyxFQUFFLENBQUM7Z0JBQy9ELE9BQU8sRUFBRSxNQUFNLEVBQUUsUUFBUSxFQUFFLE1BQU0sRUFBRSxZQUFZLE9BQU8sa0NBQWtDLElBQUksQ0FBQyxVQUFVLEVBQUUsRUFBRSxDQUFDO1lBQzdHLENBQUM7UUFDRixDQUFDO1FBRUQseUZBQXlGO1FBQ3pGLEtBQUssTUFBTSxJQUFJLElBQUksSUFBSSxDQUFDLGVBQWUsRUFBRSxDQUFDO1lBQ3pDLElBQUksSUFBSSxDQUFDLG9CQUFvQixDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxFQUFFLENBQUMsRUFBRSxDQUFDO2dCQUMvRCxPQUFPLEVBQUUsTUFBTSxFQUFFLFVBQVUsRUFBRSxNQUFNLEVBQUUsWUFBWSxPQUFPLHFDQUFxQyxJQUFJLENBQUMsVUFBVSxFQUFFLEVBQUUsQ0FBQztZQUNsSCxDQUFDO1FBQ0YsQ0FBQztRQUVELGtGQUFrRjtRQUVsRix5Q0FBeUM7UUFDekMsT0FBTyxFQUFFLE1BQU0sRUFBRSxTQUFTLEVBQUUsTUFBTSxFQUFFLFlBQVksT0FBTyx3Q0FBd0MsRUFBRSxDQUFDO0lBQ25HLENBQUM7SUFFRCx5QkFBeUIsQ0FBQyxXQUFtQjtRQUM1QyxtRkFBbUY7UUFDbkYsS0FBSyxNQUFNLElBQUksSUFBSSxJQUFJLENBQUMseUJBQXlCLEVBQUUsQ0FBQztZQUNuRCxJQUFJLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxFQUFFLENBQUM7Z0JBQ2xDLE9BQU8sRUFBRSxNQUFNLEVBQUUsUUFBUSxFQUFFLE1BQU0sRUFBRSxpQkFBaUIsV0FBVyxrQ0FBa0MsSUFBSSxDQUFDLFVBQVUsRUFBRSxFQUFFLENBQUM7WUFDdEgsQ0FBQztRQUNGLENBQUM7UUFFRCxvRkFBb0Y7UUFDcEYsS0FBSyxNQUFNLElBQUksSUFBSSxJQUFJLENBQUMsMEJBQTBCLEVBQUUsQ0FBQztZQUNwRCxJQUFJLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxFQUFFLENBQUM7Z0JBQ2xDLE9BQU8sRUFBRSxNQUFNLEVBQUUsVUFBVSxFQUFFLE1BQU0sRUFBRSxpQkFBaUIsV0FBVyxxQ0FBcUMsSUFBSSxDQUFDLFVBQVUsRUFBRSxFQUFFLENBQUM7WUFDM0gsQ0FBQztRQUNGLENBQUM7UUFDRCxPQUFPLEVBQUUsTUFBTSxFQUFFLFNBQVMsRUFBRSxNQUFNLEVBQUUsaUJBQWlCLFdBQVcsd0NBQXdDLEVBQUUsQ0FBQztJQUM1RyxDQUFDO0lBRU8sb0JBQW9CLENBQUMsS0FBYSxFQUFFLE9BQWUsRUFBRSxLQUFhLEVBQUUsRUFBbUI7UUFDOUYsSUFBSSxLQUFLLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7WUFDekIsT0FBTyxJQUFJLENBQUM7UUFDYixDQUFDO2FBQU0sSUFBSSxZQUFZLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxJQUFJLE9BQU8sQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQztZQUMvRCx1RkFBdUY7WUFDdkYsZ0ZBQWdGO1lBQ2hGLElBQUksS0FBSyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztnQkFDbEMsT0FBTyxJQUFJLENBQUM7WUFDYixDQUFDO1FBQ0YsQ0FBQztRQUNELE9BQU8sS0FBSyxDQUFDO0lBQ2QsQ0FBQztJQUVPLDRCQUE0QixDQUFDLE1BQWU7UUFNbkQsSUFBSSxDQUFDLE1BQU0sSUFBSSxPQUFPLE1BQU0sS0FBSyxRQUFRLEVBQUUsQ0FBQztZQUMzQyxPQUFPO2dCQUNOLGFBQWEsRUFBRSxFQUFFO2dCQUNqQixjQUFjLEVBQUUsRUFBRTtnQkFDbEIseUJBQXlCLEVBQUUsRUFBRTtnQkFDN0Isd0JBQXdCLEVBQUUsRUFBRTthQUM1QixDQUFDO1FBQ0gsQ0FBQztRQUVELE1BQU0sYUFBYSxHQUF1QixFQUFFLENBQUM7UUFDN0MsTUFBTSxjQUFjLEdBQXVCLEVBQUUsQ0FBQztRQUM5QyxNQUFNLHlCQUF5QixHQUF1QixFQUFFLENBQUM7UUFDekQsTUFBTSx3QkFBd0IsR0FBdUIsRUFBRSxDQUFDO1FBRXhELE1BQU0sQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxHQUFHLEVBQUUsS0FBSyxDQUFDLEVBQUUsRUFBRTtZQUMvQyxJQUFJLE9BQU8sS0FBSyxLQUFLLFNBQVMsRUFBRSxDQUFDO2dCQUNoQyxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsK0JBQStCLENBQUMsR0FBRyxDQUFDLENBQUM7Z0JBQ3hELDJFQUEyRTtnQkFDM0UsSUFBSSxLQUFLLEtBQUssSUFBSSxFQUFFLENBQUM7b0JBQ3BCLGNBQWMsQ0FBQyxJQUFJLENBQUMsRUFBRSxLQUFLLEVBQUUsVUFBVSxFQUFFLEdBQUcsRUFBRSxDQUFDLENBQUM7Z0JBQ2pELENBQUM7cUJBQU0sSUFBSSxLQUFLLEtBQUssS0FBSyxFQUFFLENBQUM7b0JBQzVCLGFBQWEsQ0FBQyxJQUFJLENBQUMsRUFBRSxLQUFLLEVBQUUsVUFBVSxFQUFFLEdBQUcsRUFBRSxDQUFDLENBQUM7Z0JBQ2hELENBQUM7WUFDRixDQUFDO2lCQUFNLElBQUksT0FBTyxLQUFLLEtBQUssUUFBUSxJQUFJLEtBQUssS0FBSyxJQUFJLEVBQUUsQ0FBQztnQkFDeEQsa0ZBQWtGO2dCQUNsRixNQUFNLFdBQVcsR0FBRyxLQUEwRCxDQUFDO2dCQUMvRSxJQUFJLE9BQU8sV0FBVyxDQUFDLE9BQU8sS0FBSyxTQUFTLEVBQUUsQ0FBQztvQkFDOUMsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLCtCQUErQixDQUFDLEdBQUcsQ0FBQyxDQUFDO29CQUN4RCxJQUFJLFdBQVcsQ0FBQyxPQUFPLEtBQUssSUFBSSxFQUFFLENBQUM7d0JBQ2xDLElBQUksV0FBVyxDQUFDLGdCQUFnQixLQUFLLElBQUksRUFBRSxDQUFDOzRCQUMzQyx5QkFBeUIsQ0FBQyxJQUFJLENBQUMsRUFBRSxLQUFLLEVBQUUsVUFBVSxFQUFFLEdBQUcsRUFBRSxDQUFDLENBQUM7d0JBQzVELENBQUM7NkJBQU0sQ0FBQzs0QkFDUCxjQUFjLENBQUMsSUFBSSxDQUFDLEVBQUUsS0FBSyxFQUFFLFVBQVUsRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFDO3dCQUNqRCxDQUFDO29CQUNGLENBQUM7eUJBQU0sSUFBSSxXQUFXLENBQUMsT0FBTyxLQUFLLEtBQUssRUFBRSxDQUFDO3dCQUMxQyxJQUFJLFdBQVcsQ0FBQyxnQkFBZ0IsS0FBSyxJQUFJLEVBQUUsQ0FBQzs0QkFDM0Msd0JBQXdCLENBQUMsSUFBSSxDQUFDLEVBQUUsS0FBSyxFQUFFLFVBQVUsRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFDO3dCQUMzRCxDQUFDOzZCQUFNLENBQUM7NEJBQ1AsYUFBYSxDQUFDLElBQUksQ0FBQyxFQUFFLEtBQUssRUFBRSxVQUFVLEVBQUUsR0FBRyxFQUFFLENBQUMsQ0FBQzt3QkFDaEQsQ0FBQztvQkFDRixDQUFDO2dCQUNGLENBQUM7WUFDRixDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQUM7UUFFSCxPQUFPO1lBQ04sYUFBYTtZQUNiLGNBQWM7WUFDZCx5QkFBeUI7WUFDekIsd0JBQXdCO1NBQ3hCLENBQUM7SUFDSCxDQUFDO0lBRU8sK0JBQStCLENBQUMsS0FBYTtRQUNwRCxnRkFBZ0Y7UUFDaEYsc0VBQXNFO1FBQ3RFLE1BQU0sVUFBVSxHQUFHLEtBQUssQ0FBQyxLQUFLLENBQUMsMkNBQTJDLENBQUMsQ0FBQztRQUM1RSxNQUFNLFlBQVksR0FBRyxVQUFVLEVBQUUsTUFBTSxFQUFFLE9BQU8sQ0FBQztRQUNqRCxJQUFJLFlBQVksRUFBRSxDQUFDO1lBQ2xCLElBQUksS0FBSyxHQUFHLFVBQVUsQ0FBQyxNQUFNLEVBQUUsS0FBSyxDQUFDO1lBQ3JDLCtDQUErQztZQUMvQyxJQUFJLEtBQUssRUFBRSxDQUFDO2dCQUNYLEtBQUssR0FBRyxLQUFLLENBQUMsVUFBVSxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUMsQ0FBQztZQUNuQyxDQUFDO1lBQ0QsT0FBTyxJQUFJLE1BQU0sQ0FBQyxZQUFZLEVBQUUsS0FBSyxJQUFJLFNBQVMsQ0FBQyxDQUFDO1FBQ3JELENBQUM7UUFFRCxrQ0FBa0M7UUFDbEMsTUFBTSxjQUFjLEdBQUcsS0FBSyxDQUFDLE9BQU8sQ0FBQyxxQkFBcUIsRUFBRSxNQUFNLENBQUMsQ0FBQztRQUVwRSxvRkFBb0Y7UUFDcEYsT0FBTyxJQUFJLE1BQU0sQ0FBQyxJQUFJLGNBQWMsS0FBSyxDQUFDLENBQUM7SUFDNUMsQ0FBQztDQUNELENBQUE7QUE1SlksdUJBQXVCO0lBT2pDLFdBQUEscUJBQXFCLENBQUE7R0FQWCx1QkFBdUIsQ0E0Sm5DIn0=