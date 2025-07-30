/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export class TerminalDataBufferer {
    constructor(_callback) {
        this._callback = _callback;
        this._terminalBufferMap = new Map();
    }
    dispose() {
        for (const buffer of this._terminalBufferMap.values()) {
            buffer.dispose();
        }
    }
    startBuffering(id, event, throttleBy = 5) {
        const disposable = event((e) => {
            const data = (typeof e === 'string' ? e : e.data);
            let buffer = this._terminalBufferMap.get(id);
            if (buffer) {
                buffer.data.push(data);
                return;
            }
            const timeoutId = setTimeout(() => this.flushBuffer(id), throttleBy);
            buffer = {
                data: [data],
                timeoutId,
                dispose: () => {
                    clearTimeout(timeoutId);
                    this.flushBuffer(id);
                    disposable.dispose();
                }
            };
            this._terminalBufferMap.set(id, buffer);
        });
        return disposable;
    }
    stopBuffering(id) {
        const buffer = this._terminalBufferMap.get(id);
        buffer?.dispose();
    }
    flushBuffer(id) {
        const buffer = this._terminalBufferMap.get(id);
        if (buffer) {
            this._terminalBufferMap.delete(id);
            this._callback(id, buffer.data.join(''));
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxEYXRhQnVmZmVyaW5nLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvYWR2aWthci9Eb2N1bWVudHMvYXJjaGl0ZWN0L2FyY2gyL0FyY2hJREUvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vdGVybWluYWwvY29tbW9uL3Rlcm1pbmFsRGF0YUJ1ZmZlcmluZy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQVdoRyxNQUFNLE9BQU8sb0JBQW9CO0lBR2hDLFlBQTZCLFNBQTZDO1FBQTdDLGNBQVMsR0FBVCxTQUFTLENBQW9DO1FBRnpELHVCQUFrQixHQUFHLElBQUksR0FBRyxFQUE4QixDQUFDO0lBRzVFLENBQUM7SUFFRCxPQUFPO1FBQ04sS0FBSyxNQUFNLE1BQU0sSUFBSSxJQUFJLENBQUMsa0JBQWtCLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQztZQUN2RCxNQUFNLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDbEIsQ0FBQztJQUNGLENBQUM7SUFFRCxjQUFjLENBQUMsRUFBVSxFQUFFLEtBQXdDLEVBQUUsYUFBcUIsQ0FBQztRQUUxRixNQUFNLFVBQVUsR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUE2QixFQUFFLEVBQUU7WUFDMUQsTUFBTSxJQUFJLEdBQUcsQ0FBQyxPQUFPLENBQUMsS0FBSyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ2xELElBQUksTUFBTSxHQUFHLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDN0MsSUFBSSxNQUFNLEVBQUUsQ0FBQztnQkFDWixNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztnQkFDdkIsT0FBTztZQUNSLENBQUM7WUFFRCxNQUFNLFNBQVMsR0FBRyxVQUFVLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxFQUFFLENBQUMsRUFBRSxVQUFVLENBQUMsQ0FBQztZQUNyRSxNQUFNLEdBQUc7Z0JBQ1IsSUFBSSxFQUFFLENBQUMsSUFBSSxDQUFDO2dCQUNaLFNBQVM7Z0JBQ1QsT0FBTyxFQUFFLEdBQUcsRUFBRTtvQkFDYixZQUFZLENBQUMsU0FBUyxDQUFDLENBQUM7b0JBQ3hCLElBQUksQ0FBQyxXQUFXLENBQUMsRUFBRSxDQUFDLENBQUM7b0JBQ3JCLFVBQVUsQ0FBQyxPQUFPLEVBQUUsQ0FBQztnQkFDdEIsQ0FBQzthQUNELENBQUM7WUFDRixJQUFJLENBQUMsa0JBQWtCLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRSxNQUFNLENBQUMsQ0FBQztRQUN6QyxDQUFDLENBQUMsQ0FBQztRQUNILE9BQU8sVUFBVSxDQUFDO0lBQ25CLENBQUM7SUFFRCxhQUFhLENBQUMsRUFBVTtRQUN2QixNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsa0JBQWtCLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQy9DLE1BQU0sRUFBRSxPQUFPLEVBQUUsQ0FBQztJQUNuQixDQUFDO0lBRUQsV0FBVyxDQUFDLEVBQVU7UUFDckIsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLGtCQUFrQixDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUMvQyxJQUFJLE1BQU0sRUFBRSxDQUFDO1lBQ1osSUFBSSxDQUFDLGtCQUFrQixDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQztZQUNuQyxJQUFJLENBQUMsU0FBUyxDQUFDLEVBQUUsRUFBRSxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQzFDLENBQUM7SUFDRixDQUFDO0NBQ0QifQ==