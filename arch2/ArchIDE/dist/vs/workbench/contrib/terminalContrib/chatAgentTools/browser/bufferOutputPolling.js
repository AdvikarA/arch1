/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { timeout } from '../../../../../base/common/async.js';
import { MarkdownString } from '../../../../../base/common/htmlContent.js';
import { localize } from '../../../../../nls.js';
import { ExtensionIdentifier } from '../../../../../platform/extensions/common/extensions.js';
import { ChatElicitationRequestPart } from '../../../chat/browser/chatElicitationRequestPart.js';
import { ChatModel } from '../../../chat/common/chatModel.js';
export var PollingConsts;
(function (PollingConsts) {
    PollingConsts[PollingConsts["MinNoDataEvents"] = 2] = "MinNoDataEvents";
    PollingConsts[PollingConsts["MinPollingDuration"] = 500] = "MinPollingDuration";
    PollingConsts[PollingConsts["FirstPollingMaxDuration"] = 20000] = "FirstPollingMaxDuration";
    PollingConsts[PollingConsts["ExtendedPollingMaxDuration"] = 120000] = "ExtendedPollingMaxDuration";
    PollingConsts[PollingConsts["MaxPollingIntervalDuration"] = 2000] = "MaxPollingIntervalDuration";
})(PollingConsts || (PollingConsts = {}));
/**
 * Waits for either polling to complete (terminal idle or timeout) or for the user to respond to a prompt.
 * If polling completes first, the prompt is removed. If the prompt completes first and is accepted, polling continues.
 */
export async function racePollingOrPrompt(pollFn, promptFn, originalResult, token, languageModelsService, execution) {
    const pollPromise = pollFn();
    const { promise: promptPromise, part } = promptFn();
    let promptResolved = false;
    const pollPromiseWrapped = pollPromise.then(async (result) => {
        if (!promptResolved && part) {
            // The terminal polling is finished, no need to show the prompt
            part.hide();
        }
        return { type: 'poll', result };
    });
    const promptPromiseWrapped = promptPromise.then(result => {
        promptResolved = true;
        return { type: 'prompt', result };
    });
    const raceResult = await Promise.race([
        pollPromiseWrapped,
        promptPromiseWrapped
    ]);
    if (raceResult.type === 'poll') {
        return raceResult.result;
    }
    else if (raceResult.type === 'prompt') {
        const promptResult = raceResult.result;
        if (promptResult) {
            // User accepted, poll again (extended)
            return await pollForOutputAndIdle(execution, true, token, languageModelsService);
        }
        else {
            return originalResult; // User rejected, return the original result
        }
    }
    // If prompt was rejected or something else, return the result of the first poll
    return await pollFn();
}
export function getOutput(instance, startMarker) {
    if (!instance.xterm || !instance.xterm.raw) {
        return '';
    }
    const lines = [];
    for (let y = Math.min(startMarker?.line ?? 0, 0); y < instance.xterm.raw.buffer.active.length; y++) {
        const line = instance.xterm.raw.buffer.active.getLine(y);
        if (!line) {
            continue;
        }
        lines.push(line.translateToString(true));
    }
    return lines.join('\n');
}
export async function pollForOutputAndIdle(execution, extendedPolling, token, languageModelsService) {
    const maxWaitMs = extendedPolling ? 120000 /* PollingConsts.ExtendedPollingMaxDuration */ : 20000 /* PollingConsts.FirstPollingMaxDuration */;
    const maxInterval = 2000 /* PollingConsts.MaxPollingIntervalDuration */;
    let currentInterval = 500 /* PollingConsts.MinPollingDuration */;
    const pollStartTime = Date.now();
    let lastBufferLength = 0;
    let noNewDataCount = 0;
    let buffer = '';
    let terminalExecutionIdleBeforeTimeout = false;
    while (true) {
        if (token.isCancellationRequested) {
            break;
        }
        const now = Date.now();
        const elapsed = now - pollStartTime;
        const timeLeft = maxWaitMs - elapsed;
        if (timeLeft <= 0) {
            break;
        }
        // Cap the wait so we never overshoot timeLeft
        const waitTime = Math.min(currentInterval, timeLeft);
        await timeout(waitTime);
        // Check again immediately after waking
        if (Date.now() - pollStartTime >= maxWaitMs) {
            break;
        }
        currentInterval = Math.min(currentInterval * 2, maxInterval);
        buffer = execution.getOutput();
        const currentBufferLength = buffer.length;
        if (currentBufferLength === lastBufferLength) {
            noNewDataCount++;
        }
        else {
            noNewDataCount = 0;
            lastBufferLength = currentBufferLength;
        }
        if (noNewDataCount >= 2 /* PollingConsts.MinNoDataEvents */) {
            if (execution.isActive && ((await execution.isActive()) === true)) {
                noNewDataCount = 0;
                lastBufferLength = currentBufferLength;
                continue;
            }
            terminalExecutionIdleBeforeTimeout = true;
            const modelOutputEvalResponse = await assessOutputForErrors(buffer, token, languageModelsService);
            return { modelOutputEvalResponse, terminalExecutionIdleBeforeTimeout, output: buffer, pollDurationMs: Date.now() - pollStartTime + (extendedPolling ? 20000 /* PollingConsts.FirstPollingMaxDuration */ : 0) };
        }
    }
    return { terminalExecutionIdleBeforeTimeout: false, output: buffer, pollDurationMs: Date.now() - pollStartTime + (extendedPolling ? 20000 /* PollingConsts.FirstPollingMaxDuration */ : 0) };
}
export function promptForMorePolling(command, context, chatService) {
    const chatModel = chatService.getSession(context.sessionId);
    if (chatModel instanceof ChatModel) {
        const request = chatModel.getRequests().at(-1);
        if (request) {
            let part = undefined;
            const promise = new Promise(resolve => {
                const thePart = part = new ChatElicitationRequestPart(new MarkdownString(localize('poll.terminal.waiting', "Continue waiting for `{0}` to finish?", command)), new MarkdownString(localize('poll.terminal.polling', "Copilot will continue to poll for output to determine when the terminal becomes idle for up to 2 minutes.")), '', localize('poll.terminal.accept', 'Yes'), localize('poll.terminal.reject', 'No'), async () => {
                    thePart.state = 'accepted';
                    thePart.hide();
                    resolve(true);
                }, async () => {
                    thePart.state = 'rejected';
                    thePart.hide();
                    resolve(false);
                });
                chatModel.acceptResponseProgress(request, thePart);
            });
            return { promise, part };
        }
    }
    return { promise: Promise.resolve(false) };
}
export async function assessOutputForErrors(buffer, token, languageModelsService) {
    const models = await languageModelsService.selectLanguageModels({ vendor: 'copilot', family: 'gpt-4o-mini' });
    if (!models.length) {
        return 'No models available';
    }
    const response = await languageModelsService.sendChatRequest(models[0], new ExtensionIdentifier('Github.copilot-chat'), [{ role: 2 /* ChatMessageRole.Assistant */, content: [{ type: 'text', value: `Evaluate this terminal output to determine if there were errors or if the command ran successfully: ${buffer}.` }] }], {}, token);
    let responseText = '';
    const streaming = (async () => {
        for await (const part of response.stream) {
            if (Array.isArray(part)) {
                for (const p of part) {
                    if (p.part.type === 'text') {
                        responseText += p.part.value;
                    }
                }
            }
            else if (part.part.type === 'text') {
                responseText += part.part.value;
            }
        }
    })();
    try {
        await Promise.all([response.result, streaming]);
        return response.result;
    }
    catch (err) {
        return 'Error occurred ' + err;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnVmZmVyT3V0cHV0UG9sbGluZy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL2FkdmlrYXIvRG9jdW1lbnRzL2FyY2hpdGVjdC9hcmNoMi9BcmNoSURFL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlcm1pbmFsQ29udHJpYi9jaGF0QWdlbnRUb29scy9icm93c2VyL2J1ZmZlck91dHB1dFBvbGxpbmcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBRTlELE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUMzRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFDakQsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0seURBQXlELENBQUM7QUFDOUYsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0scURBQXFELENBQUM7QUFDakcsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBTzlELE1BQU0sQ0FBTixJQUFrQixhQU1qQjtBQU5ELFdBQWtCLGFBQWE7SUFDOUIsdUVBQW1CLENBQUE7SUFDbkIsK0VBQXdCLENBQUE7SUFDeEIsMkZBQStCLENBQUE7SUFDL0Isa0dBQW1DLENBQUE7SUFDbkMsZ0dBQWlDLENBQUE7QUFDbEMsQ0FBQyxFQU5pQixhQUFhLEtBQWIsYUFBYSxRQU05QjtBQUdEOzs7R0FHRztBQUNILE1BQU0sQ0FBQyxLQUFLLFVBQVUsbUJBQW1CLENBQ3hDLE1BQWlKLEVBQ2pKLFFBQW1ILEVBQ25ILGNBQTBJLEVBQzFJLEtBQXdCLEVBQ3hCLHFCQUE2QyxFQUM3QyxTQUF5RTtJQUV6RSxNQUFNLFdBQVcsR0FBRyxNQUFNLEVBQUUsQ0FBQztJQUM3QixNQUFNLEVBQUUsT0FBTyxFQUFFLGFBQWEsRUFBRSxJQUFJLEVBQUUsR0FBRyxRQUFRLEVB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