/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { PromptToken } from './promptToken.js';
/**
 * All prompt at-mentions start with `/` character.
 */
const START_CHARACTER = '/';
/**
 * Represents a `/command` token in a prompt text.
 */
export class PromptSlashCommand extends PromptToken {
    constructor(range, 
    /**
     * The name of a command, excluding the `/` character at the start.
     */
    name) {
        super(range);
        this.name = name;
    }
    /**
     * Get full text of the token.
     */
    get text() {
        return `${START_CHARACTER}${this.name}`;
    }
    /**
     * Return a string representation of the token.
     */
    toString() {
        return `${this.text}${this.range}`;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvbXB0U2xhc2hDb21tYW5kLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvYWR2aWthci9Eb2N1bWVudHMvYXJjaGl0ZWN0L2FyY2gyL0FyY2hJREUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9jb21tb24vcHJvbXB0U3ludGF4L2NvZGVjcy90b2tlbnMvcHJvbXB0U2xhc2hDb21tYW5kLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxrQkFBa0IsQ0FBQztBQUcvQzs7R0FFRztBQUNILE1BQU0sZUFBZSxHQUFXLEdBQUcsQ0FBQztBQUVwQzs7R0FFRztBQUNILE1BQU0sT0FBTyxrQkFBbUIsU0FBUSxXQUFXO0lBQ2xELFlBQ0MsS0FBWTtJQUNaOztPQUVHO0lBQ2EsSUFBWTtRQUc1QixLQUFLLENBQUMsS0FBSyxDQUFDLENBQUM7UUFIRyxTQUFJLEdBQUosSUFBSSxDQUFRO0lBSTdCLENBQUM7SUFFRDs7T0FFRztJQUNILElBQVcsSUFBSTtRQUNkLE9BQU8sR0FBRyxlQUFlLEdBQUcsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO0lBQ3pDLENBQUM7SUFFRDs7T0FFRztJQUNhLFFBQVE7UUFDdkIsT0FBTyxHQUFHLElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO0lBQ3BDLENBQUM7Q0FDRCJ9