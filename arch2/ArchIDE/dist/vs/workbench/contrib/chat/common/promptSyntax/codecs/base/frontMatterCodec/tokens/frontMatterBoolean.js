/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Word } from '../../simpleCodec/tokens/tokens.js';
import { FrontMatterValueToken } from './frontMatterToken.js';
import { assertDefined } from '../../../../../../../../../base/common/types.js';
/**
 * Token that represents a `boolean` value in a Front Matter header.
 */
export class FrontMatterBoolean extends FrontMatterValueToken {
    /**
     * @throws if provided {@link Word} cannot be converted to a `boolean` value.
     */
    constructor(token) {
        const value = asBoolean(token);
        assertDefined(value, `Cannot convert '${token}' to a boolean value.`);
        super([token]);
        /**
         * Name of the `boolean` value type.
         */
        this.valueTypeName = 'boolean';
        this.value = value;
    }
    /**
     * Try creating a {@link FrontMatterBoolean} out of provided token.
     * Unlike the constructor, this method does not throw, returning
     * a 'null' value on failure instead.
     */
    static tryFromToken(token) {
        if (token instanceof Word === false) {
            return null;
        }
        try {
            return new FrontMatterBoolean(token);
        }
        catch (_error) {
            // noop
            return null;
        }
    }
    equals(other) {
        if (super.equals(other) === false) {
            return false;
        }
        return this.value === other.value;
    }
    toString() {
        return `front-matter-boolean(${this.shortText()})${this.range}`;
    }
}
/**
 * Try to convert a {@link Word} token to a `boolean` value.
 */
export function asBoolean(token) {
    if (token.text.toLowerCase() === 'true') {
        return true;
    }
    if (token.text.toLowerCase() === 'false') {
        return false;
    }
    return null;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZnJvbnRNYXR0ZXJCb29sZWFuLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvYWR2aWthci9Eb2N1bWVudHMvYXJjaGl0ZWN0L2FyY2gyL0FyY2hJREUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9jb21tb24vcHJvbXB0U3ludGF4L2NvZGVjcy9iYXNlL2Zyb250TWF0dGVyQ29kZWMvdG9rZW5zL2Zyb250TWF0dGVyQm9vbGVhbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDMUQsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFDOUQsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLGlEQUFpRCxDQUFDO0FBRWhGOztHQUVHO0FBQ0gsTUFBTSxPQUFPLGtCQUFtQixTQUFRLHFCQUFpRDtJQVd4Rjs7T0FFRztJQUNILFlBQVksS0FBVztRQUN0QixNQUFNLEtBQUssR0FBRyxTQUFTLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDL0IsYUFBYSxDQUNaLEtBQUssRUFDTCxtQkFBbUIsS0FBSyx1QkFBdUIsQ0FDL0MsQ0FBQztRQUVGLEtBQUssQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7UUFwQmhCOztXQUVHO1FBQ3NCLGtCQUFhLEdBQUcsU0FBUyxDQUFDO1FBbUJsRCxJQUFJLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQztJQUNwQixDQUFDO0lBRUQ7Ozs7T0FJRztJQUNJLE1BQU0sQ0FBQyxZQUFZLENBQ3pCLEtBQWdCO1FBRWhCLElBQUksS0FBSyxZQUFZLElBQUksS0FBSyxLQUFLLEVBQUUsQ0FBQztZQUNyQyxPQUFPLElBQUksQ0FBQztRQUNiLENBQUM7UUFFRCxJQUFJLENBQUM7WUFDSixPQUFPLElBQUksa0JBQWtCLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDdEMsQ0FBQztRQUFDLE9BQU8sTUFBTSxFQUFFLENBQUM7WUFDakIsT0FBTztZQUNQLE9BQU8sSUFBSSxDQUFDO1FBQ2IsQ0FBQztJQUNGLENBQUM7SUFFZSxNQUFNLENBQUMsS0FBZ0I7UUFDdEMsSUFBSSxLQUFLLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxLQUFLLEtBQUssRUFBRSxDQUFDO1lBQ25DLE9BQU8sS0FBSyxDQUFDO1FBQ2QsQ0FBQztRQUVELE9BQU8sSUFBSSxDQUFDLEtBQUssS0FBSyxLQUFLLENBQUMsS0FBSyxDQUFDO0lBQ25DLENBQUM7SUFFZSxRQUFRO1FBQ3ZCLE9BQU8sd0JBQXdCLElBQUksQ0FBQyxTQUFTLEVBQUUsSUFBSSxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7SUFDakUsQ0FBQztDQUNEO0FBRUQ7O0dBRUc7QUFDSCxNQUFNLFVBQVUsU0FBUyxDQUN4QixLQUFXO0lBRVgsSUFBSSxLQUFLLENBQUMsSUFBSSxDQUFDLFdBQVcsRUFBRSxLQUFLLE1BQU0sRUFBRSxDQUFDO1FBQ3pDLE9BQU8sSUFBSSxDQUFDO0lBQ2IsQ0FBQztJQUVELElBQUksS0FBSyxDQUFDLElBQUksQ0FBQyxXQUFXLEVBQUUsS0FBSyxPQUFPLEVBQUUsQ0FBQztRQUMxQyxPQUFPLEtBQUssQ0FBQztJQUNkLENBQUM7SUFFRCxPQUFPLElBQUksQ0FBQztBQUNiLENBQUMifQ==