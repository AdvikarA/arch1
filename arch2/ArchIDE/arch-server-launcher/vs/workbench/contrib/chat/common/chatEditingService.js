/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { URI } from '../../../../base/common/uri.js';
import { localize } from '../../../../nls.js';
import { RawContextKey } from '../../../../platform/contextkey/common/contextkey.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
export const IChatEditingService = createDecorator('chatEditingService');
export const chatEditingSnapshotScheme = 'chat-editing-snapshot-text-model';
export var ModifiedFileEntryState;
(function (ModifiedFileEntryState) {
    ModifiedFileEntryState[ModifiedFileEntryState["Modified"] = 0] = "Modified";
    ModifiedFileEntryState[ModifiedFileEntryState["Accepted"] = 1] = "Accepted";
    ModifiedFileEntryState[ModifiedFileEntryState["Rejected"] = 2] = "Rejected";
})(ModifiedFileEntryState || (ModifiedFileEntryState = {}));
export var ChatEditingSessionState;
(function (ChatEditingSessionState) {
    ChatEditingSessionState[ChatEditingSessionState["Initial"] = 0] = "Initial";
    ChatEditingSessionState[ChatEditingSessionState["StreamingEdits"] = 1] = "StreamingEdits";
    ChatEditingSessionState[ChatEditingSessionState["Idle"] = 2] = "Idle";
    ChatEditingSessionState[ChatEditingSessionState["Disposed"] = 3] = "Disposed";
})(ChatEditingSessionState || (ChatEditingSessionState = {}));
export const CHAT_EDITING_MULTI_DIFF_SOURCE_RESOLVER_SCHEME = 'chat-editing-multi-diff-source';
export const chatEditingWidgetFileStateContextKey = new RawContextKey('chatEditingWidgetFileState', undefined, localize('chatEditingWidgetFileState', "The current state of the file in the chat editing widget"));
export const chatEditingAgentSupportsReadonlyReferencesContextKey = new RawContextKey('chatEditingAgentSupportsReadonlyReferences', undefined, localize('chatEditingAgentSupportsReadonlyReferences', "Whether the chat editing agent supports readonly references (temporary)"));
export const decidedChatEditingResourceContextKey = new RawContextKey('decidedChatEditingResource', []);
export const chatEditingResourceContextKey = new RawContextKey('chatEditingResource', undefined);
export const inChatEditingSessionContextKey = new RawContextKey('inChatEditingSession', undefined);
export const hasUndecidedChatEditingResourceContextKey = new RawContextKey('hasUndecidedChatEditingResource', false);
export const hasAppliedChatEditsContextKey = new RawContextKey('hasAppliedChatEdits', false);
export const applyingChatEditsFailedContextKey = new RawContextKey('applyingChatEditsFailed', false);
export const chatEditingMaxFileAssignmentName = 'chatEditingSessionFileLimit';
export const defaultChatEditingMaxFileLimit = 10;
export var ChatEditKind;
(function (ChatEditKind) {
    ChatEditKind[ChatEditKind["Created"] = 0] = "Created";
    ChatEditKind[ChatEditKind["Modified"] = 1] = "Modified";
})(ChatEditKind || (ChatEditKind = {}));
export function isChatEditingActionContext(thing) {
    return typeof thing === 'object' && !!thing && 'sessionId' in thing;
}
export function getMultiDiffSourceUri(session, showPreviousChanges) {
    return URI.from({
        scheme: CHAT_EDITING_MULTI_DIFF_SOURCE_RESOLVER_SCHEME,
        authority: session.chatSessionId,
        query: showPreviousChanges ? 'previous' : undefined,
    });
}
export function parseChatMultiDiffUri(uri) {
    const chatSessionId = uri.authority;
    const showPreviousChanges = uri.query === 'previous';
    return { chatSessionId, showPreviousChanges };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdEVkaXRpbmdTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvYWR2aWthci9Eb2N1bWVudHMvYXJjaGl0ZWN0L2FyY2gyL0FyY2hJREUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9jb21tb24vY2hhdEVkaXRpbmdTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBTWhHLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUdyRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDOUMsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQ3JGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQU03RixNQUFNLENBQUMsTUFBTSxtQkFBbUIsR0FBRyxlQUFlLENBQXNCLG9CQUFvQixDQUFDLENBQUM7QUE2RDlGLE1BQU0sQ0FBQyxNQUFNLHlCQUF5QixHQUFHLGtDQUFrQyxDQUFDO0FBcUY1RSxNQUFNLENBQU4sSUFBa0Isc0JBSWpCO0FBSkQsV0FBa0Isc0JBQXNCO0lBQ3ZDLDJFQUFRLENBQUE7SUFDUiwyRUFBUSxDQUFBO0lBQ1IsMkVBQVEsQ0FBQTtBQUNULENBQUMsRUFKaUIsc0JBQXNCLEtBQXRCLHNCQUFzQixRQUl2QztBQTRGRCxNQUFNLENBQU4sSUFBa0IsdUJBS2pCO0FBTEQsV0FBa0IsdUJBQXVCO0lBQ3hDLDJFQUFXLENBQUE7SUFDWCx5RkFBa0IsQ0FBQTtJQUNsQixxRUFBUSxDQUFBO0lBQ1IsNkVBQVksQ0FBQTtBQUNiLENBQUMsRUFMaUIsdUJBQXVCLEtBQXZCLHVCQUF1QixRQUt4QztBQUVELE1BQU0sQ0FBQyxNQUFNLDhDQUE4QyxHQUFHLGdDQUFnQyxDQUFDO0FBRS9GLE1BQU0sQ0FBQyxNQUFNLG9DQUFvQyxHQUFHLElBQUksYUFBYSxDQUF5Qiw0QkFBNEIsRUFBRSxTQUFTLEVBQUUsUUFBUSxDQUFDLDRCQUE0QixFQUFFLDBEQUEwRCxDQUFDLENBQUMsQ0FBQztBQUMzTyxNQUFNLENBQUMsTUFBTSxvREFBb0QsR0FBRyxJQUFJLGFBQWEsQ0FBVSw0Q0FBNEMsRUFBRSxTQUFTLEVBQUUsUUFBUSxDQUFDLDRDQUE0QyxFQUFFLHlFQUF5RSxDQUFDLENBQUMsQ0FBQztBQUMzUixNQUFNLENBQUMsTUFBTSxvQ0FBb0MsR0FBRyxJQUFJLGFBQWEsQ0FBVyw0QkFBNEIsRUFBRSxFQUFFLENBQUMsQ0FBQztBQUNsSCxNQUFNLENBQUMsTUFBTSw2QkFBNkIsR0FBRyxJQUFJLGFBQWEsQ0FBcUIscUJBQXFCLEVBQUUsU0FBUyxDQUFDLENBQUM7QUFDckgsTUFBTSxDQUFDLE1BQU0sOEJBQThCLEdBQUcsSUFBSSxhQUFhLENBQXNCLHNCQUFzQixFQUFFLFNBQVMsQ0FBQyxDQUFDO0FBQ3hILE1BQU0sQ0FBQyxNQUFNLHlDQUF5QyxHQUFHLElBQUksYUFBYSxDQUFzQixpQ0FBaUMsRUFBRSxLQUFLLENBQUMsQ0FBQztBQUMxSSxNQUFNLENBQUMsTUFBTSw2QkFBNkIsR0FBRyxJQUFJLGFBQWEsQ0FBc0IscUJBQXFCLEVBQUUsS0FBSyxDQUFDLENBQUM7QUFDbEgsTUFBTSxDQUFDLE1BQU0saUNBQWlDLEdBQUcsSUFBSSxhQUFhLENBQXNCLHlCQUF5QixFQUFFLEtBQUssQ0FBQyxDQUFDO0FBRTFILE1BQU0sQ0FBQyxNQUFNLGdDQUFnQyxHQUFHLDZCQUE2QixDQUFDO0FBQzlFLE1BQU0sQ0FBQyxNQUFNLDhCQUE4QixHQUFHLEVBQUUsQ0FBQztBQUVqRCxNQUFNLENBQU4sSUFBa0IsWUFHakI7QUFIRCxXQUFrQixZQUFZO0lBQzdCLHFEQUFPLENBQUE7SUFDUCx1REFBUSxDQUFBO0FBQ1QsQ0FBQyxFQUhpQixZQUFZLEtBQVosWUFBWSxRQUc3QjtBQU9ELE1BQU0sVUFBVSwwQkFBMEIsQ0FBQyxLQUFjO0lBQ3hELE9BQU8sT0FBTyxLQUFLLEtBQUssUUFBUSxJQUFJLENBQUMsQ0FBQyxLQUFLLElBQUksV0FBVyxJQUFJLEtBQUssQ0FBQztBQUNyRSxDQUFDO0FBRUQsTUFBTSxVQUFVLHFCQUFxQixDQUFDLE9BQTRCLEVBQUUsbUJBQTZCO0lBQ2hHLE9BQU8sR0FBRyxDQUFDLElBQUksQ0FBQztRQUNmLE1BQU0sRUFBRSw4Q0FBOEM7UUFDdEQsU0FBUyxFQUFFLE9BQU8sQ0FBQyxhQUFhO1FBQ2hDLEtBQUssRUFBRSxtQkFBbUIsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxTQUFTO0tBQ25ELENBQUMsQ0FBQztBQUNKLENBQUM7QUFFRCxNQUFNLFVBQVUscUJBQXFCLENBQUMsR0FBUTtJQUM3QyxNQUFNLGFBQWEsR0FBRyxHQUFHLENBQUMsU0FBUyxDQUFDO0lBQ3BDLE1BQU0sbUJBQW1CLEdBQUcsR0FBRyxDQUFDLEtBQUssS0FBSyxVQUFVLENBQUM7SUFFckQsT0FBTyxFQUFFLGFBQWEsRUFBRSxtQkFBbUIsRUFBRSxDQUFDO0FBQy9DLENBQUMifQ==