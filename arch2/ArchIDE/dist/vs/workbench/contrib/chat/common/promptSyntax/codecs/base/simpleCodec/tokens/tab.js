/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { SpacingToken } from './simpleToken.js';
/**
 * A token that represent a `tab` with a `range`. The `range`
 * value reflects the position of the token in the original data.
 */
export class Tab extends SpacingToken {
    /**
     * The underlying symbol of the token.
     */
    static { this.symbol = '\t'; }
    /**
     * Return text representation of the token.
     */
    get text() {
        return Tab.symbol;
    }
    /**
     * Returns a string representation of the token.
     */
    toString() {
        return `tab${this.range}`;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGFiLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvYWR2aWthci9Eb2N1bWVudHMvYXJjaGl0ZWN0L2FyY2gyL0FyY2hJREUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9jb21tb24vcHJvbXB0U3ludGF4L2NvZGVjcy9iYXNlL3NpbXBsZUNvZGVjL3Rva2Vucy90YWIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLGtCQUFrQixDQUFDO0FBRWhEOzs7R0FHRztBQUNILE1BQU0sT0FBTyxHQUFJLFNBQVEsWUFBa0I7SUFDMUM7O09BRUc7YUFDNkIsV0FBTSxHQUFTLElBQUksQ0FBQztJQUVwRDs7T0FFRztJQUNILElBQW9CLElBQUk7UUFDdkIsT0FBTyxHQUFHLENBQUMsTUFBTSxDQUFDO0lBQ25CLENBQUM7SUFFRDs7T0FFRztJQUNhLFFBQVE7UUFDdkIsT0FBTyxNQUFNLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztJQUMzQixDQUFDIn0=