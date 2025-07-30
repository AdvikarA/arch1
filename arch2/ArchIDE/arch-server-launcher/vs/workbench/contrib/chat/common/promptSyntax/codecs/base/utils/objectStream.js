/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { assertNever } from '../../../../../../../../base/common/assert.js';
import { ObservableDisposable } from '../../../utils/observableDisposable.js';
import { newWriteableStream } from '../../../../../../../../base/common/stream.js';
/**
 * A readable stream of provided objects.
 */
export class ObjectStream extends ObservableDisposable {
    constructor(data, cancellationToken) {
        super();
        this.data = data;
        this.cancellationToken = cancellationToken;
        /**
         * Flag that indicates whether the stream has ended.
         */
        this.ended = false;
        this.stream = newWriteableStream(null);
        if (cancellationToken?.isCancellationRequested) {
            this.end();
            return;
        }
        // send a first batch of data immediately
        this.send(true);
    }
    /**
     * Starts process of sending data to the stream.
     *
     * @param stopAfterFirstSend whether to continue sending data to the stream
     *             or stop sending after the first batch of data is sent instead
     */
    send(stopAfterFirstSend = false) {
        // this method can be called asynchronously by the `setTimeout` utility below, hence
        // the state of the cancellation token or the stream itself might have changed by that time
        if (this.cancellationToken?.isCancellationRequested || this.ended) {
            this.end();
            return;
        }
        this.sendData()
            .then(() => {
            if (this.cancellationToken?.isCancellationRequested || this.ended) {
                this.end();
                return;
            }
            if (stopAfterFirstSend === true) {
                this.stopStream();
                return;
            }
            this.timeoutHandle = setTimeout(this.send.bind(this));
        })
            .catch((error) => {
            this.stream.error(error);
            this.dispose();
        });
    }
    /**
     * Stop the data sending loop.
     */
    stopStream() {
        if (this.timeoutHandle === undefined) {
            return this;
        }
        clearTimeout(this.timeoutHandle);
        this.timeoutHandle = undefined;
        return this;
    }
    /**
     * Sends a provided number of objects to the stream.
     */
    async sendData(objectsCount = 25) {
        // send up to 'objectsCount' objects at a time
        while (objectsCount > 0) {
            try {
                const next = this.data.next();
                if (next.done || this.cancellationToken?.isCancellationRequested) {
                    this.end();
                    return;
                }
                await this.stream.write(next.value);
                objectsCount--;
            }
            catch (error) {
                this.stream.error(error);
                this.dispose();
                return;
            }
        }
    }
    /**
     * Ends the stream and stops sending data objects.
     */
    end() {
        if (this.ended) {
            return this;
        }
        this.ended = true;
        this.stopStream();
        this.stream.end();
        return this;
    }
    pause() {
        this.stopStream();
        this.stream.pause();
        return;
    }
    resume() {
        this.send();
        this.stream.resume();
        return;
    }
    destroy() {
        this.dispose();
    }
    removeListener(event, callback) {
        this.stream.removeListener(event, callback);
        return;
    }
    on(event, callback) {
        if (event === 'data') {
            this.stream.on(event, callback);
            // this is the convention of the readable stream, - when
            // the `data` event is registered, the stream is started
            this.send();
            return;
        }
        if (event === 'error') {
            this.stream.on(event, callback);
            return;
        }
        if (event === 'end') {
            this.stream.on(event, callback);
            return;
        }
        assertNever(event, `Unexpected event name '${event}'.`);
    }
    /**
     * Cleanup send interval and destroy the stream.
     */
    dispose() {
        this.stopStream();
        this.stream.destroy();
        super.dispose();
    }
    /**
     * Create new instance of the stream from a provided array.
     */
    static fromArray(array, cancellationToken) {
        return new ObjectStream(arrayToGenerator(array), cancellationToken);
    }
}
/**
 * Create a generator out of a provided array.
 */
export function arrayToGenerator(array) {
    return (function* () {
        for (const item of array) {
            yield item;
        }
    })();
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib2JqZWN0U3RyZWFtLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvYWR2aWthci9Eb2N1bWVudHMvYXJjaGl0ZWN0L2FyY2gyL0FyY2hJREUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9jb21tb24vcHJvbXB0U3ludGF4L2NvZGVjcy9iYXNlL3V0aWxzL29iamVjdFN0cmVhbS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sK0NBQStDLENBQUM7QUFFNUUsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDOUUsT0FBTyxFQUFFLGtCQUFrQixFQUFtQyxNQUFNLCtDQUErQyxDQUFDO0FBR3BIOztHQUVHO0FBQ0gsTUFBTSxPQUFPLFlBQStCLFNBQVEsb0JBQW9CO0lBaUJ2RSxZQUNrQixJQUE2QixFQUM3QixpQkFBcUM7UUFFdEQsS0FBSyxFQUFFLENBQUM7UUFIUyxTQUFJLEdBQUosSUFBSSxDQUF5QjtRQUM3QixzQkFBaUIsR0FBakIsaUJBQWlCLENBQW9CO1FBbEJ2RDs7V0FFRztRQUNLLFVBQUssR0FBWSxLQUFLLENBQUM7UUFtQjlCLElBQUksQ0FBQyxNQUFNLEdBQUcsa0JBQWtCLENBQUksSUFBSSxDQUFDLENBQUM7UUFFMUMsSUFBSSxpQkFBaUIsRUFBRSx1QkFBdUIsRUFBRSxDQUFDO1lBQ2hELElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQztZQUNYLE9BQU87UUFDUixDQUFDO1FBRUQseUNBQXlDO1FBQ3pDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDakIsQ0FBQztJQUVEOzs7OztPQUtHO0lBQ0ksSUFBSSxDQUNWLHFCQUE4QixLQUFLO1FBRW5DLG9GQUFvRjtRQUNwRiwyRkFBMkY7UUFDM0YsSUFBSSxJQUFJLENBQUMsaUJBQWlCLEVBQUUsdUJBQXVCLElBQUksSUFBSSxD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