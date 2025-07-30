/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Range } from '../../../../../../../../../editor/common/core/range.js';
import { BaseToken } from '../../baseToken.js';
/**
 * Base class for all "simple" tokens with a `range`.
 * A simple token is the one that represents a single character.
 */
export class SimpleToken extends BaseToken {
    /**
     * Create new token instance with range inside
     * the given `Line` at the given `column number`.
     */
    static newOnLine(line, atColumnNumber, Constructor) {
        const { range } = line;
        return new Constructor(new Range(range.startLineNumber, atColumnNumber, range.startLineNumber, atColumnNumber + Constructor.symbol.length));
    }
}
/**
 * Base class for all tokens that represent some form of
 * a spacing character, e.g. 'space', 'tab', etc.
 */
export class SpacingToken extends SimpleToken {
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2ltcGxlVG9rZW4uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9hZHZpa2FyL0RvY3VtZW50cy9hcmNoaXRlY3QvYXJjaDIvQXJjaElERS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2NvbW1vbi9wcm9tcHRTeW50YXgvY29kZWNzL2Jhc2Uvc2ltcGxlQ29kZWMvdG9rZW5zL3NpbXBsZVRva2VuLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSx3REFBd0QsQ0FBQztBQUMvRSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFrQi9DOzs7R0FHRztBQUNILE1BQU0sT0FBZ0IsV0FBb0MsU0FBUSxTQUFrQjtJQU1uRjs7O09BR0c7SUFDSSxNQUFNLENBQUMsU0FBUyxDQUN0QixJQUFVLEVBQ1YsY0FBc0IsRUFDdEIsV0FBNEM7UUFFNUMsTUFBTSxFQUFFLEtBQUssRUFBRSxHQUFHLElBQUksQ0FBQztRQUV2QixPQUFPLElBQUksV0FBVyxDQUFDLElBQUksS0FBSyxDQUMvQixLQUFLLENBQUMsZUFBZSxFQUNyQixjQUFjLEVBQ2QsS0FBSyxDQUFDLGVBQWUsRUFDckIsY0FBYyxHQUFHLFdBQVcsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUMxQyxDQUFDLENBQUM7SUFDSixDQUFDO0NBQ0Q7QUFFRDs7O0dBR0c7QUFDSCxNQUFNLE9BQWdCLFlBQThDLFNBQVEsV0FBb0I7Q0FBSSJ9