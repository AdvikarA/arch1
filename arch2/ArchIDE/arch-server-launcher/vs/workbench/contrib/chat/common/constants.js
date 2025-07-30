/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export var ChatConfiguration;
(function (ChatConfiguration) {
    ChatConfiguration["UseFileStorage"] = "chat.useFileStorage";
    ChatConfiguration["AgentEnabled"] = "chat.agent.enabled";
    ChatConfiguration["Edits2Enabled"] = "chat.edits2.enabled";
    ChatConfiguration["ExtensionToolsEnabled"] = "chat.extensionTools.enabled";
    ChatConfiguration["EditRequests"] = "chat.editRequests";
    ChatConfiguration["EnableMath"] = "chat.math.enabled";
    ChatConfiguration["CheckpointsEnabled"] = "chat.checkpoints.enabled";
    ChatConfiguration["AgentSessionsViewLocation"] = "chat.agentSessionsViewLocation";
})(ChatConfiguration || (ChatConfiguration = {}));
/**
 * The "kind" of the chat mode- "Agent" for custom modes.
 */
export var ChatModeKind;
(function (ChatModeKind) {
    ChatModeKind["Ask"] = "ask";
    ChatModeKind["Edit"] = "edit";
    ChatModeKind["Agent"] = "agent";
})(ChatModeKind || (ChatModeKind = {}));
export function validateChatMode(mode) {
    switch (mode) {
        case ChatModeKind.Ask:
        case ChatModeKind.Edit:
        case ChatModeKind.Agent:
            return mode;
        default:
            return undefined;
    }
}
export function isChatMode(mode) {
    return !!validateChatMode(mode);
}
export var ChatAgentLocation;
(function (ChatAgentLocation) {
    ChatAgentLocation["Panel"] = "panel";
    ChatAgentLocation["Terminal"] = "terminal";
    ChatAgentLocation["Notebook"] = "notebook";
    ChatAgentLocation["Editor"] = "editor";
})(ChatAgentLocation || (ChatAgentLocation = {}));
(function (ChatAgentLocation) {
    function fromRaw(value) {
        switch (value) {
            case 'panel': return ChatAgentLocation.Panel;
            case 'terminal': return ChatAgentLocation.Terminal;
            case 'notebook': return ChatAgentLocation.Notebook;
            case 'editor': return ChatAgentLocation.Editor;
        }
        return ChatAgentLocation.Panel;
    }
    ChatAgentLocation.fromRaw = fromRaw;
})(ChatAgentLocation || (ChatAgentLocation = {}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uc3RhbnRzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvYWR2aWthci9Eb2N1bWVudHMvYXJjaGl0ZWN0L2FyY2gyL0FyY2hJREUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9jb21tb24vY29uc3RhbnRzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE1BQU0sQ0FBTixJQUFZLGlCQVNYO0FBVEQsV0FBWSxpQkFBaUI7SUFDNUIsMkRBQXNDLENBQUE7SUFDdEMsd0RBQW1DLENBQUE7SUFDbkMsMERBQXFDLENBQUE7SUFDckMsMEVBQXFELENBQUE7SUFDckQsdURBQWtDLENBQUE7SUFDbEMscURBQWdDLENBQUE7SUFDaEMsb0VBQStDLENBQUE7SUFDL0MsaUZBQTRELENBQUE7QUFDN0QsQ0FBQyxFQVRXLGlCQUFpQixLQUFqQixpQkFBaUIsUUFTNUI7QUFFRDs7R0FFRztBQUNILE1BQU0sQ0FBTixJQUFZLFlBSVg7QUFKRCxXQUFZLFlBQVk7SUFDdkIsMkJBQVcsQ0FBQTtJQUNYLDZCQUFhLENBQUE7SUFDYiwrQkFBZSxDQUFBO0FBQ2hCLENBQUMsRUFKVyxZQUFZLEtBQVosWUFBWSxRQUl2QjtBQUVELE1BQU0sVUFBVSxnQkFBZ0IsQ0FBQyxJQUFhO0lBQzdDLFFBQVEsSUFBSSxFQUFFLENBQUM7UUFDZCxLQUFLLFlBQVksQ0FBQyxHQUFHLENBQUM7UUFDdEIsS0FBSyxZQUFZLENBQUMsSUFBSSxDQUFDO1FBQ3ZCLEtBQUssWUFBWSxDQUFDLEtBQUs7WUFDdEIsT0FBTyxJQUFvQixDQUFDO1FBQzdCO1lBQ0MsT0FBTyxTQUFTLENBQUM7SUFDbkIsQ0FBQztBQUNGLENBQUM7QUFFRCxNQUFNLFVBQVUsVUFBVSxDQUFDLElBQWE7SUFDdkMsT0FBTyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLENBQUM7QUFDakMsQ0FBQztBQUlELE1BQU0sQ0FBTixJQUFZLGlCQUtYO0FBTEQsV0FBWSxpQkFBaUI7SUFDNUIsb0NBQWUsQ0FBQTtJQUNmLDBDQUFxQixDQUFBO0lBQ3JCLDBDQUFxQixDQUFBO0lBQ3JCLHNDQUFpQixDQUFBO0FBQ2xCLENBQUMsRUFMVyxpQkFBaUIsS0FBakIsaUJBQWlCLFFBSzVCO0FBRUQsV0FBaUIsaUJBQWlCO0lBQ2pDLFNBQWdCLE9BQU8sQ0FBQyxLQUEwQztRQUNqRSxRQUFRLEtBQUssRUFBRSxDQUFDO1lBQ2YsS0FBSyxPQUFPLENBQUMsQ0FBQyxPQUFPLGlCQUFpQixDQUFDLEtBQUssQ0FBQztZQUM3QyxLQUFLLFVBQVUsQ0FBQyxDQUFDLE9BQU8saUJBQWlCLENBQUMsUUFBUSxDQUFDO1lBQ25ELEtBQUssVUFBVSxDQUFDLENBQUMsT0FBTyxpQkFBaUIsQ0FBQyxRQUFRLENBQUM7WUFDbkQsS0FBSyxRQUFRLENBQUMsQ0FBQyxPQUFPLGlCQUFpQixDQUFDLE1BQU0sQ0FBQztRQUNoRCxDQUFDO1FBQ0QsT0FBTyxpQkFBaUIsQ0FBQyxLQUFLLENBQUM7SUFDaEMsQ0FBQztJQVJlLHlCQUFPLFVBUXRCLENBQUE7QUFDRixDQUFDLEVBVmdCLGlCQUFpQixLQUFqQixpQkFBaUIsUUFVakMifQ==