/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { encodeBase64, VSBuffer, decodeBase64 } from '../../../../base/common/buffer.js';
import { Schemas } from '../../../../base/common/network.js';
import { URI } from '../../../../base/common/uri.js';
export var ChatSessionUri;
(function (ChatSessionUri) {
    ChatSessionUri.scheme = Schemas.vscodeChatSession;
    function forSession(chatSessionType, sessionId) {
        const encodedId = encodeBase64(VSBuffer.wrap(new TextEncoder().encode(sessionId)), false, true);
        // TODO: Do we need to encode the authority too?
        return URI.from({ scheme: ChatSessionUri.scheme, authority: chatSessionType, path: '/' + encodedId });
    }
    ChatSessionUri.forSession = forSession;
    function parse(resource) {
        if (resource.scheme !== ChatSessionUri.scheme) {
            return undefined;
        }
        if (!resource.authority) {
            return undefined;
        }
        const parts = resource.path.split('/');
        if (parts.length !== 2) {
            return undefined;
        }
        const chatSessionType = resource.authority;
        const decodedSessionId = decodeBase64(parts[1]);
        return { chatSessionType, sessionId: new TextDecoder().decode(decodedSessionId.buffer) };
    }
    ChatSessionUri.parse = parse;
})(ChatSessionUri || (ChatSessionUri = {}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFVyaS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL2FkdmlrYXIvRG9jdW1lbnRzL2FyY2hpdGVjdC9hcmNoMi9BcmNoSURFL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvY29tbW9uL2NoYXRVcmkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFlBQVksRUFBRSxRQUFRLEVBQUUsWUFBWSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDekYsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQzdELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQU9yRCxNQUFNLEtBQVcsY0FBYyxDQTRCOUI7QUE1QkQsV0FBaUIsY0FBYztJQUVqQixxQkFBTSxHQUFHLE9BQU8sQ0FBQyxpQkFBaUIsQ0FBQztJQUVoRCxTQUFnQixVQUFVLENBQUMsZUFBdUIsRUFBRSxTQUFpQjtRQUNwRSxNQUFNLFNBQVMsR0FBRyxZQUFZLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxJQUFJLFdBQVcsRUFBRSxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLEtBQUssRUFBRSxJQUFJLENBQUMsQ0FBQztRQUNoRyxnREFBZ0Q7UUFDaEQsT0FBTyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsTUFBTSxFQUFOLGVBQUEsTUFBTSxFQUFFLFNBQVMsRUFBRSxlQUFlLEVBQUUsSUFBSSxFQUFFLEdBQUcsR0FBRyxTQUFTLEVBQUUsQ0FBQyxDQUFDO0lBQ2hGLENBQUM7SUFKZSx5QkFBVSxhQUl6QixDQUFBO0lBRUQsU0FBZ0IsS0FBSyxDQUFDLFFBQWE7UUFDbEMsSUFBSSxRQUFRLENBQUMsTUFBTSxLQUFLLGVBQUEsTUFBTSxFQUFFLENBQUM7WUFDaEMsT0FBTyxTQUFTLENBQUM7UUFDbEIsQ0FBQztRQUVELElBQUksQ0FBQyxRQUFRLENBQUMsU0FBUyxFQUFFLENBQUM7WUFDekIsT0FBTyxTQUFTLENBQUM7UUFDbEIsQ0FBQztRQUVELE1BQU0sS0FBSyxHQUFHLFFBQVEsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ3ZDLElBQUksS0FBSyxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUN4QixPQUFPLFNBQVMsQ0FBQztRQUNsQixDQUFDO1FBRUQsTUFBTSxlQUFlLEdBQUcsUUFBUSxDQUFDLFNBQVMsQ0FBQztRQUMzQyxNQUFNLGdCQUFnQixHQUFHLFlBQVksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNoRCxPQUFPLEVBQUUsZUFBZSxFQUFFLFNBQVMsRUFBRSxJQUFJLFdBQVcsRUFBRSxDQUFDLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDO0lBQzFGLENBQUM7SUFqQmUsb0JBQUssUUFpQnBCLENBQUE7QUFDRixDQUFDLEVBNUJnQixjQUFjLEtBQWQsY0FBYyxRQTRCOUIifQ==