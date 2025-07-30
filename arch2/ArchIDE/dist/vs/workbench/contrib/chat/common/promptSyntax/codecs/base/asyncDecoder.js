/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Disposable } from '../../../../../../../base/common/lifecycle.js';
/**
 * Asynchronous iterator wrapper for a decoder.
 */
export class AsyncDecoder extends Disposable {
    /**
     * @param decoder The decoder instance to wrap.
     *
     * Note! Assumes ownership of the `decoder` object, hence will `dispose`
     * 		 it when the decoder stream is ended.
     */
    constructor(decoder) {
        super();
        this.decoder = decoder;
        // Buffer of messages that have been decoded but not yet consumed.
        this.messages = [];
        this._register(decoder);
    }
    /**
     * Async iterator implementation.
     */
    async *[Symbol.asyncIterator]() {
        // callback is called when `data` or `end` event is received
        const callback = (data) => {
            if (data !== undefined) {
                this.messages.push(data);
            }
            else {
                this.decoder.removeListener('data', callback);
                this.decoder.removeListener('end', callback);
            }
            // is the promise resolve callback is present,
            // then call it and remove the reference
            if (this.resolveOnNewEvent) {
                this.resolveOnNewEvent();
                delete this.resolveOnNewEvent;
            }
        };
        /**
         * !NOTE! The order of event subscriptions below is critical here because
         *        the `data` event is also starts the stream, hence changing
         *        the order of event subscriptions can lead to race conditions.
         *        See {@link ReadableStreamEvents} for more info.
         */
        this.decoder.on('end', callback);
        this.decoder.on('data', callback);
        // start flowing the decoder stream
        this.decoder.start();
        while (true) {
            const maybeMessage = this.messages.shift();
            if (maybeMessage !== undefined) {
                yield maybeMessage;
                continue;
            }
            // if no data available and stream ended, we're done
            if (this.decoder.ended) {
                this.dispose();
                return null;
            }
            // stream isn't ended so wait for the new
            // `data` or `end` event to be received
            await new Promise((resolve) => {
                this.resolveOnNewEvent = resolve;
            });
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXN5bmNEZWNvZGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvYWR2aWthci9Eb2N1bWVudHMvYXJjaGl0ZWN0L2FyY2gyL0FyY2hJREUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9jb21tb24vcHJvbXB0U3ludGF4L2NvZGVjcy9iYXNlL2FzeW5jRGVjb2Rlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sK0NBQStDLENBQUM7QUFHM0U7O0dBRUc7QUFDSCxNQUFNLE9BQU8sWUFBb0csU0FBUSxVQUFVO0lBWWxJOzs7OztPQUtHO0lBQ0gsWUFDa0IsT0FBMEI7UUFFM0MsS0FBSyxFQUFFLENBQUM7UUFGUyxZQUFPLEdBQVAsT0FBTyxDQUFtQjtRQWxCNUMsa0VBQWtFO1FBQ2pELGFBQVEsR0FBUSxFQUFFLENBQUM7UUFxQm5DLElBQUksQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLENBQUM7SUFDekIsQ0FBQztJQUVEOztPQUVHO0lBQ0gsS0FBSyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsYUFBYSxDQUFDO1FBQzVCLDREQUE0RDtRQUM1RCxNQUFNLFFBQVEsR0FBRyxDQUFDLElBQVEsRUFBRSxFQUFFO1lBQzdCLElBQUksSUFBSSxLQUFLLFNBQVMsRUFBRSxDQUFDO2dCQUN4QixJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUMxQixDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsSUFBSSxDQUFDLE9BQU8sQ0FBQyxjQUFjLENBQUMsTUFBTSxFQUFFLFFBQVEsQ0FBQyxDQUFDO2dCQUM5QyxJQUFJLENBQUMsT0FBTyxDQUFDLGNBQWMsQ0FBQyxLQUFLLEVBQUUsUUFBUSxDQUFDLENBQUM7WUFDOUMsQ0FBQztZQUVELDhDQUE4QztZQUM5Qyx3Q0FBd0M7WUFDeEMsSUFBSSxJQUFJLENBQUMsaUJBQWlCLEVBQUUsQ0FBQztnQkFDNUIsSUFBSSxDQUFDLGlCQUFpQixFQUFFLENBQUM7Z0JBQ3pCLE9BQU8sSUFBSSxDQUFDLGlCQUFpQixDQUFDO1lBQy9CLENBQUM7UUFDRixDQUFDLENBQUM7UUFFRjs7Ozs7V0FLRztRQUVILElBQUksQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLEtBQUssRUFBRSxRQUFRLENBQUMsQ0FBQztRQUNqQyxJQUFJLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxNQUFNLEVBQUUsUUFBUSxDQUFDLENBQUM7UUFFbEMsbUNBQW1DO1FBQ25DLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLENBQUM7UUFFckIsT0FBTyxJQUFJLEVBQUUsQ0FBQztZQUNiLE1BQU0sWUFBWSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxFQUFFLENBQUM7WUFDM0MsSUFBSSxZQUFZLEtBQUssU0FBUyxFQUFFLENBQUM7Z0JBQ2hDLE1BQU0sWUFBWSxDQUFDO2dCQUNuQixTQUFTO1lBQ1YsQ0FBQztZQUVELG9EQUFvRDtZQUNwRCxJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLENBQUM7Z0JBQ3hCLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztnQkFFZixPQUFPLElBQUksQ0FBQztZQUNiLENBQUM7WUFFRCx5Q0FBeUM7WUFDekMsdUNBQXVDO1lBQ3ZDLE1BQU0sSUFBSSxPQUFPLENBQUMsQ0FBQyxPQUFPLEVBQUUsRUFBRTtnQkFDN0IsSUFBSSxDQUFDLGlCQUFpQixHQUFHLE9BQU8sQ0FBQztZQUNsQyxDQUFDLENBQUMsQ0FBQztRQUNKLENBQUM7SUFDRixDQUFDO0NBQ0QifQ==