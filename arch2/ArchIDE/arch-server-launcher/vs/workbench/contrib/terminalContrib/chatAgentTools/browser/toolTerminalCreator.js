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
var ToolTerminalCreator_1;
import { DeferredPromise, disposableTimeout, timeout } from '../../../../../base/common/async.js';
import { Codicon } from '../../../../../base/common/codicons.js';
import { CancellationError } from '../../../../../base/common/errors.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { ThemeIcon } from '../../../../../base/common/themables.js';
import { ITerminalService } from '../../../terminal/browser/terminal.js';
var ShellLaunchType;
(function (ShellLaunchType) {
    ShellLaunchType[ShellLaunchType["Unknown"] = 0] = "Unknown";
    ShellLaunchType[ShellLaunchType["Default"] = 1] = "Default";
    ShellLaunchType[ShellLaunchType["Fallback"] = 2] = "Fallback";
})(ShellLaunchType || (ShellLaunchType = {}));
export var ShellIntegrationQuality;
(function (ShellIntegrationQuality) {
    ShellIntegrationQuality["None"] = "none";
    ShellIntegrationQuality["Basic"] = "basic";
    ShellIntegrationQuality["Rich"] = "rich";
})(ShellIntegrationQuality || (ShellIntegrationQuality = {}));
let ToolTerminalCreator = class ToolTerminalCreator {
    static { ToolTerminalCreator_1 = this; }
    /**
     * The shell preference cached for the lifetime of the window. This allows skipping previous
     * shell approaches that failed in previous runs to save time.
     */
    static { this._lastSuccessfulShell = 0 /* ShellLaunchType.Unknown */; }
    constructor(_terminalService) {
        this._terminalService = _terminalService;
    }
    async createTerminal(token) {
        const instance = await this._createCopilotTerminal();
        const toolTerminal = {
            instance,
            shellIntegrationQuality: "none" /* ShellIntegrationQuality.None */,
        };
        // The default profile has shell integration
        if (ToolTerminalCreator_1._lastSuccessfulShell <= 1 /* ShellLaunchType.Default */) {
            const shellIntegrationQuality = await this._waitForShellIntegration(instance, 5000);
            if (token.isCancellationRequested) {
                instance.dispose();
                throw new CancellationError();
            }
            if (shellIntegrationQuality !== "none" /* ShellIntegrationQuality.None */) {
                ToolTerminalCreator_1._lastSuccessfulShell = 1 /* ShellLaunchType.Default */;
                toolTerminal.shellIntegrationQuality = shellIntegrationQuality;
                return toolTerminal;
            }
        }
        // Fallback case: No shell integration in default profile
        ToolTerminalCreator_1._lastSuccessfulShell = 2 /* ShellLaunchType.Fallback */;
        return toolTerminal;
    }
    _createCopilotTerminal() {
        return this._terminalService.createTerminal({
            config: {
                icon: ThemeIcon.fromId(Codicon.chatSparkle.id),
                hideFromUser: true,
                env: {
                    GIT_PAGER: 'cat', // avoid making `git diff` interactive when called from copilot
                },
            },
        });
    }
    _waitForShellIntegration(instance, timeoutMs) {
        const dataFinished = new DeferredPromise();
        const deferred = new DeferredPromise();
        const timer = disposableTimeout(() => deferred.complete("none" /* ShellIntegrationQuality.None */), timeoutMs);
        if (instance.capabilities.get(2 /* TerminalCapability.CommandDetection */)?.hasRichCommandDetection) {
            timer.dispose();
            deferred.complete("rich" /* ShellIntegrationQuality.Rich */);
        }
        else {
            const onSetRichCommandDetection = this._terminalService.createOnInstanceCapabilityEvent(2 /* TerminalCapability.CommandDetection */, e => e.onSetRichCommandDetection);
            const richCommandDetectionListener = onSetRichCommandDetection.event((e) => {
                if (e.instance !== instance) {
                    return;
                }
                deferred.complete("rich" /* ShellIntegrationQuality.Rich */);
            });
            const store = new DisposableStore();
            const commandDetection = instance.capabilities.get(2 /* TerminalCapability.CommandDetection */);
            if (commandDetection) {
                timer.dispose();
                // When command detection lights up, allow up to 200ms for the rich command
                // detection sequence to come in before declaring it as basic shell integration.
                // up.
                Promise.race([
                    dataFinished.p,
                    timeout(200)
                ]).then(() => {
                    if (!deferred.isResolved) {
                        deferred.complete("basic" /* ShellIntegrationQuality.Basic */);
                    }
                });
            }
            else {
                store.add(instance.capabilities.onDidAddCapabilityType(e => {
                    if (e === 2 /* TerminalCapability.CommandDetection */) {
                        timer.dispose();
                        // When command detection lights up, allow up to 200ms for the rich command
                        // detection sequence to come in before declaring it as basic shell integration.
                        // up.
                        Promise.race([
                            dataFinished.p,
                            timeout(200)
                        ]).then(() => deferred.complete("basic" /* ShellIntegrationQuality.Basic */));
                    }
                }));
            }
            deferred.p.finally(() => {
                store.dispose();
                richCommandDetectionListener.dispose();
            });
        }
        return deferred.p;
    }
};
ToolTerminalCreator = ToolTerminalCreator_1 = __decorate([
    __param(0, ITerminalService)
], ToolTerminalCreator);
export { ToolTerminalCreator };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidG9vbFRlcm1pbmFsQ3JlYXRvci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL2FkdmlrYXIvRG9jdW1lbnRzL2FyY2hpdGVjdC9hcmNoMi9BcmNoSURFL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlcm1pbmFsQ29udHJpYi9jaGF0QWdlbnRUb29scy9icm93c2VyL3Rvb2xUZXJtaW5hbENyZWF0b3IudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxlQUFlLEVBQUUsaUJBQWlCLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFFbEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ2pFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ3pFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUMxRSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFFcEUsT0FBTyxFQUFFLGdCQUFnQixFQUEwQixNQUFNLHVDQUF1QyxDQUFDO0FBRWpHLElBQVcsZUFJVjtBQUpELFdBQVcsZUFBZTtJQUN6QiwyREFBVyxDQUFBO0lBQ1gsMkRBQVcsQ0FBQTtJQUNYLDZEQUFZLENBQUE7QUFDYixDQUFDLEVBSlUsZUFBZSxLQUFmLGVBQWUsUUFJekI7QUFFRCxNQUFNLENBQU4sSUFBa0IsdUJBSWpCO0FBSkQsV0FBa0IsdUJBQXVCO0lBQ3hDLHdDQUFhLENBQUE7SUFDYiwwQ0FBZSxDQUFBO0lBQ2Ysd0NBQWEsQ0FBQTtBQUNkLENBQUMsRUFKaUIsdUJBQXVCLEtBQXZCLHVCQUF1QixRQUl4QztBQU9NLElBQU0sbUJBQW1CLEdBQXpCLE1BQU0sbUJBQW1COztJQUMvQjs7O09BR0c7YUFDWSx5QkFBb0Isa0NBQUEsQ0FBNEM7SUFFL0UsWUFDb0MsZ0JBQWtDO1FBQWxD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