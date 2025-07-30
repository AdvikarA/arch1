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
import { ITelemetryService } from '../../../../../platform/telemetry/common/telemetry.js';
import { TerminalCompletionItemKind } from './terminalCompletionItem.js';
let TerminalSuggestTelemetry = class TerminalSuggestTelemetry extends Disposable {
    constructor(commandDetection, _promptInputModel, _telemetryService) {
        super();
        this._promptInputModel = _promptInputModel;
        this._telemetryService = _telemetryService;
        this._kindMap = new Map([
            [TerminalCompletionItemKind.File, 'File'],
            [TerminalCompletionItemKind.Folder, 'Folder'],
            [TerminalCompletionItemKind.Method, 'Method'],
            [TerminalCompletionItemKind.Alias, 'Alias'],
            [TerminalCompletionItemKind.Argument, 'Argument'],
            [TerminalCompletionItemKind.Option, 'Option'],
            [TerminalCompletionItemKind.OptionValue, 'Option Value'],
            [TerminalCompletionItemKind.Flag, 'Flag'],
            [TerminalCompletionItemKind.InlineSuggestion, 'Inline Suggestion'],
            [TerminalCompletionItemKind.InlineSuggestionAlwaysOnTop, 'Inline Suggestion'],
        ]);
        this._register(commandDetection.onCommandFinished((e) => {
            this._sendTelemetryInfo(false, e.exitCode);
            this._acceptedCompletions = undefined;
        }));
        this._register(this._promptInputModel.onDidInterrupt(() => {
            this._sendTelemetryInfo(true);
            this._acceptedCompletions = undefined;
        }));
    }
    acceptCompletion(sessionId, completion, commandLine) {
        if (!completion || !commandLine) {
            this._acceptedCompletions = undefined;
            return;
        }
        this._acceptedCompletions = this._acceptedCompletions || [];
        this._acceptedCompletions.push({ label: typeof completion.label === 'string' ? completion.label : completion.label.label, kind: this._kindMap.get(completion.kind), sessionId, provider: completion.provider });
    }
    /**
     * Logs the latency (ms) from completion request to completions shown.
     * @param sessionId The terminal session ID
     * @param latency The measured latency in ms
     * @param firstShownFor Object indicating if completions have been shown for window/shell
     */
    logCompletionLatency(sessionId, latency, firstShownFor) {
        this._telemetryService.publicLog2('terminal.suggest.completionLatency', {
            terminalSessionId: sessionId,
            latency,
            firstWindow: firstShownFor.window,
            firstShell: firstShownFor.shell
        });
    }
    _sendTelemetryInfo(fromInterrupt, exitCode) {
        const commandLine = this._promptInputModel?.value;
        for (const completion of this._acceptedCompletions || []) {
            const label = completion?.label;
            const kind = completion?.kind;
            const provider = completion?.provider;
            if (label === undefined || commandLine === undefined || kind === undefined || provider === undefined) {
                return;
            }
            let outcome;
            if (fromInterrupt) {
                outcome = "Interrupted" /* CompletionOutcome.Interrupted */;
            }
            else if (commandLine.trim() && commandLine.includes(label)) {
                outcome = "Accepted" /* CompletionOutcome.Accepted */;
            }
            else if (inputContainsFirstHalfOfLabel(commandLine, label)) {
                outcome = "AcceptedWithEdit" /* CompletionOutcome.AcceptedWithEdit */;
            }
            else {
                outcome = "Deleted" /* CompletionOutcome.Deleted */;
            }
            this._telemetryService.publicLog2('terminal.suggest.acceptedCompletion', {
                kind,
                outcome,
                exitCode,
                terminalSessionId: completion.sessionId,
                provider
            });
        }
    }
};
TerminalSuggestTelemetry = __decorate([
    __param(2, ITelemetryService)
], TerminalSuggestTelemetry);
export { TerminalSuggestTelemetry };
var CompletionOutcome;
(function (CompletionOutcome) {
    CompletionOutcome["Accepted"] = "Accepted";
    CompletionOutcome["Deleted"] = "Deleted";
    CompletionOutcome["AcceptedWithEdit"] = "AcceptedWithEdit";
    CompletionOutcome["Interrupted"] = "Interrupted";
})(CompletionOutcome || (CompletionOutcome = {}));
function inputContainsFirstHalfOfLabel(commandLine, label) {
    return commandLine.includes(label.substring(0, Math.ceil(label.length / 2)));
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxTdWdnZXN0VGVsZW1ldHJ5LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvYWR2aWthci9Eb2N1bWVudHMvYXJjaGl0ZWN0L2FyY2gyL0FyY2hJREUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVybWluYWxDb250cmliL3N1Z2dlc3QvYnJvd3Nlci90ZXJtaW5hbFN1Z2dlc3RUZWxlbWV0cnkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ3JFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHVEQUF1RCxDQUFDO0FBRzFGLE9BQU8sRUFBdUIsMEJBQTBCLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUV2RixJQUFNLHdCQUF3QixHQUE5QixNQUFNLHdCQUF5QixTQUFRLFVBQVU7SUFnQnZELFlBQ0MsZ0JBQTZDLEVBQzVCLGlCQUFvQyxFQUNsQyxpQkFBcUQ7UUFFeEUsS0FBSyxFQUFFLENBQUM7UUFIUyxzQkFBaUIsR0FBakIsaUJBQWlCLENBQW1CO1FBQ2pCLHNCQUFpQixHQUFqQixpQkFBaUIsQ0FBbUI7UUFoQmpFLGFBQVEsR0FBRyxJQUFJLEdBQUcsQ0FBaUI7WUFDMUMsQ0FBQywwQkFBMEIsQ0FBQyxJQUFJLEVBQUUsTUFBTSxDQUFDO1lBQ3pDLENBQUMsMEJBQTBCLENBQUMsTUFBTSxFQUFFLFFBQVEsQ0FBQztZQUM3QyxDQUFDLDBCQUEwQixDQUFDLE1BQU0sRUFBRSxRQUFRLENBQUM7WUFDN0MsQ0FBQywwQkFBMEIsQ0FBQyxLQUFLLEVBQUUsT0FBTyxDQUFDO1lBQzNDLENBQUMsMEJBQTBCLENBQUMsUUFBUSxFQUFFLFVBQVUsQ0FBQztZQUNqRCxDQUFDLDBCQUEwQixDQUFDLE1BQU0sRUFBRSxRQUFRLENBQUM7WUFDN0MsQ0FBQywwQkFBMEIsQ0FBQyxXQUFXLEVBQUUs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