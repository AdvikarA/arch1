/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ChatPromptDecoder } from './chatPromptDecoder.js';
/**
 * Codec that is capable to encode and decode tokens of an AI chatbot prompt message.
 */
export const ChatPromptCodec = Object.freeze({
    /**
     * Encode a stream of `TChatPromptToken`s into a stream of `VSBuffer`s.
     *
     * @see {@link ReadableStream}
     * @see {@link VSBuffer}
     */
    encode: (_stream) => {
        throw new Error('The `encode` method is not implemented.');
    },
    /**
     * Decode a of `VSBuffer`s into a readable of `TChatPromptToken`s.
     *
     * @see {@link TChatPromptToken}
     * @see {@link VSBuffer}
     * @see {@link ChatPromptDecoder}
     * @see {@link ReadableStream}
     */
    decode: (stream) => {
        return new ChatPromptDecoder(stream);
    },
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFByb21wdENvZGVjLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvYWR2aWthci9Eb2N1bWVudHMvYXJjaGl0ZWN0L2FyY2gyL0FyY2hJREUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9jb21tb24vcHJvbXB0U3ludGF4L2NvZGVjcy9jaGF0UHJvbXB0Q29kZWMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFJaEcsT0FBTyxFQUFFLGlCQUFpQixFQUFvQixNQUFNLHdCQUF3QixDQUFDO0FBd0M3RTs7R0FFRztBQUNILE1BQU0sQ0FBQyxNQUFNLGVBQWUsR0FBcUIsTUFBTSxDQUFDLE1BQU0sQ0FBQztJQUM5RDs7Ozs7T0FLRztJQUNILE1BQU0sRUFBRSxDQUFDLE9BQXlDLEVBQTRCLEVBQUU7UUFDL0UsTUFBTSxJQUFJLEtBQUssQ0FBQyx5Q0FBeUMsQ0FBQyxDQUFDO0lBQzVELENBQUM7SUFFRDs7Ozs7OztPQU9HO0lBQ0gsTUFBTSxFQUFFLENBQUMsTUFBZ0MsRUFBcUIsRUFBRTtRQUMvRCxPQUFPLElBQUksaUJBQWlCLENBQUMsTUFBTSxDQUFDLENBQUM7SUFDdEMsQ0FBQztDQUNELENBQUMsQ0FBQyJ9