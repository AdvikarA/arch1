/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { Range } from '../../../../../../../editor/common/core/range.js';
import { assertDefined } from '../../../../../../../base/common/types.js';
/**
 * An expected child reference to use in tests.
 */
export class ExpectedReference {
    constructor(options) {
        this.options = options;
    }
    /**
     * Validate that the provided reference is equal to this object.
     */
    validateEqual(other) {
        const { uri, text, path = [] } = this.options;
        const errorPrefix = `[${uri}] `;
        /**
         * Validate the base properties of the reference first.
         */
        assert.strictEqual(other.uri.toString(), uri.toString(), `${errorPrefix} Incorrect 'uri'.`);
        assert.strictEqual(other.text, text, `${errorPrefix} Incorrect 'text'.`);
        assert.strictEqual(other.path, path, `${errorPrefix} Incorrect 'path'.`);
        const range = new Range(this.options.startLine, this.options.startColumn, this.options.startLine, this.options.startColumn + text.length);
        assert(range.equalsRange(other.range), `${errorPrefix} Incorrect 'range': expected '${range}', got '${other.range}'.`);
        if (path.length) {
            assertDefined(other.linkRange, `${errorPrefix} Link range must be defined.`);
            const linkRange = new Range(this.options.startLine, this.options.pathStartColumn, this.options.startLine, this.options.pathStartColumn + path.length);
            assert(linkRange.equalsRange(other.linkRange), `${errorPrefix} Incorrect 'linkRange': expected '${linkRange}', got '${other.linkRange}'.`);
        }
        else {
            assert.strictEqual(other.linkRange, undefined, `${errorPrefix} Link range must be 'undefined'.`);
        }
    }
    /**
     * Returns a string representation of the reference.
     */
    toString() {
        return `expected-reference/${this.options.text}`;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXhwZWN0ZWRSZWZlcmVuY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9hZHZpa2FyL0RvY3VtZW50cy9hcmNoaXRlY3QvYXJjaDIvQXJjaElERS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L3Rlc3QvY29tbW9uL3Byb21wdFN5bnRheC90ZXN0VXRpbHMvZXhwZWN0ZWRSZWZlcmVuY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBRTVCLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUN6RSxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUF5QzFFOztHQUVHO0FBQ0gsTUFBTSxPQUFPLGlCQUFpQjtJQUM3QixZQUE2QixPQUFrQztRQUFsQyxZQUFPLEdBQVAsT0FBTyxDQUEyQjtJQUFJLENBQUM7SUFFcEU7O09BRUc7SUFDSSxhQUFhLENBQUMsS0FBdUI7UUFDM0MsTUFBTSxFQUFFLEdBQUcsRUFBRSxJQUFJLEVBQUUsSUFBSSxHQUFHLEVBQUUsRUFBRSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUM7UUFDOUMsTUFBTSxXQUFXLEdBQUcsSUFBSSxHQUFHLElBQUksQ0FBQztRQUVoQzs7V0FFRztRQUVILE1BQU0sQ0FBQyxXQUFXLENBQ2pCLEtBQUssQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLEVBQ3BCLEdBQUcsQ0FBQyxRQUFRLEVBQUUsRUFDZCxHQUFHLFdBQVcsbUJBQW1CLENBQ2pDLENBQUM7UUFFRixNQUFNLENBQUMsV0FBVyxDQUNqQixLQUFLLENBQUMsSUFBSSxFQUNWLElBQUksRUFDSixHQUFHLFdBQVcsb0JBQW9CLENBQ2xDLENBQUM7UUFFRixNQUFNLENBQUMsV0FBVyxDQUNqQixLQUFLLENBQUMsSUFBSSxFQUNWLElBQUksRUFDSixHQUFHLFdBQVcsb0JBQW9CLENBQ2xDLENBQUM7UUFFRixNQUFNLEtBQUssR0FBRyxJQUFJLEtBQUssQ0FDdEIsSUFBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLEVBQ3RCLElBQUksQ0FBQyxPQUFPLENBQUMsV0FBVyxFQUN4QixJQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFDdEIsSUFBSSxDQUFDLE9BQU8sQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FDdEMsQ0FBQztRQUVGLE1BQU0sQ0FDTCxLQUFLLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsRUFDOUIsR0FBRyxXQUFXLGlDQUFpQyxLQUFLLFdBQVcsS0FBSyxDQUFDLEtBQUssSUFBSSxDQUM5RSxDQUFDO1FBRUYsSUFBSSxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDakIsYUFBYSxDQUNaLEtBQUssQ0FBQyxTQUFTLEVBQ2YsR0FBRyxXQUFXLDhCQUE4QixDQUM1QyxDQUFDO1lBRUYsTUFBTSxTQUFTLEdBQUcsSUFBSSxLQUFLLENBQzFCLElBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxFQUN0QixJQUFJLENBQUMsT0FBTyxDQUFDLGVBQWUsRUFDNUIsSUFBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLEVBQ3RCLElBQUksQ0FBQyxPQUFPLENBQUMsZUFBZSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQzFDLENBQUM7WUFFRixNQUFNLENBQ0wsU0FBUyxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLEVBQ3RDLEdBQUcsV0FBVyxxQ0FBcUMsU0FBUyxXQUFXLEtBQUssQ0FBQyxTQUFTLElBQUksQ0FDMUYsQ0FBQztRQUNILENBQUM7YUFBTSxDQUFDO1lBQ1AsTUFBTSxDQUFDLFdBQVcsQ0FDakIsS0FBSyxDQUFDLFNBQVMsRUFDZixTQUFTLEVBQ1QsR0FBRyxXQUFXLGtDQUFrQyxDQUNoRCxDQUFDO1FBQ0gsQ0FBQztJQUNGLENBQUM7SUFFRDs7T0FFRztJQUNJLFFBQVE7UUFDZCxPQUFPLHNCQUFzQixJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxDQUFDO0lBQ2xELENBQUM7Q0FDRCJ9