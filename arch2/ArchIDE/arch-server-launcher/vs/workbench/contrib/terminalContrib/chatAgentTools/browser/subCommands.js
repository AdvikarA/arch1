/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { isPowerShell } from './runInTerminalHelpers.js';
// Derived from https://github.com/microsoft/vscode/blob/315b0949786b3807f05cb6acd13bf0029690a052/extensions/terminal-suggest/src/tokens.ts#L14-L18
// Some of these can match the same string, so the order matters. Always put the more specific one
// first (eg. >> before >)
const shellTypeResetChars = new Map([
    ['sh', ['&>>', '2>>', '>>', '2>', '&>', '||', '&&', '|&', '<<', '&', ';', '{', '>', '<', '|']],
    ['zsh', ['<<<', '2>>', '&>>', '>>', '2>', '&>', '<(', '<>', '||', '&&', '|&', '&', ';', '{', '<<', '<(', '>', '<', '|']],
    ['pwsh', ['*>>', '2>>', '>>', '2>', '&&', '*>', '>', '<', '|', ';', '!', '&']],
]);
export function splitCommandLineIntoSubCommands(commandLine, envShell, envOS) {
    let shellType;
    const envShellWithoutExe = envShell.replace(/\.exe$/, '');
    if (isPowerShell(envShell, envOS)) {
        shellType = 'pwsh';
    }
    else {
        switch (envShellWithoutExe) {
            case 'zsh':
                shellType = 'zsh';
                break;
            default:
                shellType = 'sh';
                break;
        }
    }
    const subCommands = [commandLine];
    const resetChars = shellTypeResetChars.get(shellType);
    if (resetChars) {
        for (const chars of resetChars) {
            for (let i = 0; i < subCommands.length; i++) {
                const subCommand = subCommands[i];
                if (subCommand.includes(chars)) {
                    subCommands.splice(i, 1, ...subCommand.split(chars).map(e => e.trim()));
                    i--;
                }
            }
        }
    }
    return subCommands;
}
export function extractInlineSubCommands(commandLine, envShell, envOS) {
    const inlineCommands = [];
    const shellType = isPowerShell(envShell, envOS) ? 'pwsh' : 'sh';
    /**
     * Extract command substitutions that start with a specific prefix and are enclosed in parentheses
     * Handles nested parentheses correctly
     */
    function extractWithPrefix(text, prefix) {
        const results = [];
        let i = 0;
        while (i < text.length) {
            const startIndex = text.indexOf(prefix, i);
            if (startIndex === -1) {
                break;
            }
            const contentStart = startIndex + prefix.length;
            if (contentStart >= text.length || text[contentStart] !== '(') {
                i = startIndex + 1;
                continue;
            }
            // Find the matching closing parenthesis, handling nested parentheses
            let parenCount = 1;
            let j = contentStart + 1;
            while (j < text.length && parenCount > 0) {
                if (text[j] === '(') {
                    parenCount++;
                }
                else if (text[j] === ')') {
                    parenCount--;
                }
                j++;
            }
            if (parenCount === 0) {
                // Found matching closing parenthesis
                const innerCommand = text.substring(contentStart + 1, j - 1).trim();
                if (innerCommand) {
                    results.push(innerCommand);
                    // Recursively extract nested inline commands
                    results.push(...extractInlineSubCommands(innerCommand, envShell, envOS));
                }
            }
            i = startIndex + 1;
        }
        return results;
    }
    /**
     * Extract backtick command substitutions (legacy POSIX)
     */
    function extractBackticks(text) {
        const results = [];
        let i = 0;
        while (i < text.length) {
            const startIndex = text.indexOf('`', i);
            if (startIndex === -1) {
                break;
            }
            const endIndex = text.indexOf('`', startIndex + 1);
            if (endIndex === -1) {
                break;
            }
            const innerCommand = text.substring(startIndex + 1, endIndex).trim();
            if (innerCommand) {
                results.push(innerCommand);
                // Recursively extract nested inline commands
                results.push(...extractInlineSubCommands(innerCommand, envShell, envOS));
            }
            i = endIndex + 1;
        }
        return results;
    }
    if (shellType === 'pwsh') {
        // PowerShell command substitution patterns
        inlineCommands.push(...extractWithPrefix(commandLine, '$')); // $(command)
        inlineCommands.push(...extractWithPrefix(commandLine, '@')); // @(command)
        inlineCommands.push(...extractWithPrefix(commandLine, '&')); // &(command)
    }
    else {
        // POSIX shell (bash, zsh, sh) command substitution patterns
        inlineCommands.push(...extractWithPrefix(commandLine, '$')); // $(command)
        inlineCommands.push(...extractWithPrefix(commandLine, '<')); // <(command) - process substitution
        inlineCommands.push(...extractWithPrefix(commandLine, '>')); // >(command) - process substitution
        inlineCommands.push(...extractBackticks(commandLine)); // `command`
    }
    return new Set(inlineCommands);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3ViQ29tbWFuZHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9hZHZpa2FyL0RvY3VtZW50cy9hcmNoaXRlY3QvYXJjaDIvQXJjaElERS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXJtaW5hbENvbnRyaWIvY2hhdEFnZW50VG9vbHMvYnJvd3Nlci9zdWJDb21tYW5kcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sMkJBQTJCLENBQUM7QUFFekQsbUpBQW1KO0FBQ25KLGtHQUFrRztBQUNsRywwQkFBMEI7QUFDMUIsTUFBTSxtQkFBbUIsR0FBRyxJQUFJLEdBQUcsQ0FBa0M7SUFDcEUsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxLQUFLLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsQ0FBQyxDQUFDO0lBQzlGLENBQUMsS0FBSyxFQUFFLENBQUMsS0FBSyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUM7SUFDeEgsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxLQUFLLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdB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