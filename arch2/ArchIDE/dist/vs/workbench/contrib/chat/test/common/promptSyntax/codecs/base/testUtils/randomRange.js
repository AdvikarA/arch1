/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { Range } from '../../../../../../../../../editor/common/core/range.js';
import { randomInt } from '../../../../../../../../../base/common/numbers.js';
import { randomBoolean } from '../../../../../../../../../base/test/common/testUtils.js';
/**
 * Generates a random {@link Range} object.
 *
 * @throws if {@link maxNumber} argument is less than `2`,
 *         is equal to `NaN` or is `infinite`.
 */
export function randomRange(maxNumber = 1_000) {
    assert(maxNumber > 1, `Max number must be greater than 1, got '${maxNumber}'.`);
    const startLineNumber = randomInt(maxNumber, 1);
    const endLineNumber = (randomBoolean() === true)
        ? startLineNumber
        : randomInt(2 * maxNumber, startLineNumber);
    const startColumnNumber = randomInt(maxNumber, 1);
    const endColumnNumber = (randomBoolean() === true)
        ? startColumnNumber + 1
        : randomInt(2 * maxNumber, startColumnNumber + 1);
    return new Range(startLineNumber, startColumnNumber, endLineNumber, endColumnNumber);
}
/**
 * Generates a random {@link Range} object that is different
 * from the provided one.
 */
export function randomRangeNotEqualTo(differentFrom, maxTries = 10) {
    let retriesLeft = maxTries;
    while (retriesLeft-- > 0) {
        const range = randomRange();
        if (range.equalsRange(differentFrom) === false) {
            return range;
        }
    }
    throw new Error(`Failed to generate a random range different from '${differentFrom}' in ${maxTries} tries.`);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmFuZG9tUmFuZ2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9hZHZpa2FyL0RvY3VtZW50cy9hcmNoaXRlY3QvYXJjaDIvQXJjaElERS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L3Rlc3QvY29tbW9uL3Byb21wdFN5bnRheC9jb2RlY3MvYmFzZS90ZXN0VXRpbHMvcmFuZG9tUmFuZ2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQzVCLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSx3REFBd0QsQ0FBQztBQUMvRSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDOUUsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDBEQUEwRCxDQUFDO0FBRXpGOzs7OztHQUtHO0FBQ0gsTUFBTSxVQUFVLFdBQVcsQ0FBQyxZQUFvQixLQUFLO0lBQ3BELE1BQU0sQ0FDTCxTQUFTLEdBQUcsQ0FBQyxFQUNiLDJDQUEyQyxTQUFTLElBQUksQ0FDeEQsQ0FBQztJQUVGLE1BQU0sZUFBZSxHQUFHLFNBQVMsQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDaEQsTUFBTSxhQUFhLEdBQUcsQ0FBQyxhQUFhLEVBQUUsS0FBSyxJQUFJLENBQUM7UUFDL0MsQ0FBQyxDQUFDLGVBQWU7UUFDakIsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEdBQUcsU0FBUyxFQUFFLGVBQWUsQ0FBQyxDQUFDO0lBRTdDLE1BQU0saUJBQWlCLEdBQUcsU0FBUyxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsQ0FBQztJQUNsRCxNQUFNLGVBQWUsR0FBRyxDQUFDLGFBQWEsRUFBRSxLQUFLLElBQUksQ0FBQztRQUNqRCxDQUFDLENBQUMsaUJBQWlCLEdBQUcsQ0FBQztRQUN2QixDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsR0FBRyxTQUFTLEVBQUUsaUJBQWlCLEdBQUcsQ0FBQyxDQUFDLENBQUM7SUFFbkQsT0FBTyxJQUFJLEtBQUssQ0FDZixlQUFlLEVBQ2YsaUJBQWlCLEVBQ2pCLGFBQWEsRUFDYixlQUFlLENBQ2YsQ0FBQztBQUNILENBQUM7QUFFRDs7O0dBR0c7QUFDSCxNQUFNLFVBQVUscUJBQXFCLENBQUMsYUFBb0IsRUFBRSxXQUFtQixFQUFFO0lBQ2hGLElBQUksV0FBVyxHQUFHLFFBQVEsQ0FBQztJQUUzQixPQUFPLFdBQVcsRUFBRSxHQUFHLENBQUMsRUFBRSxDQUFDO1FBQzFCLE1BQU0sS0FBSyxHQUFHLFdBQVcsRUFBRSxDQUFDO1FBQzVCLElBQUksS0FBSyxDQUFDLFdBQVcsQ0FBQyxhQUFhLENBQUMsS0FBSyxLQUFLLEVBQUUsQ0FBQztZQUNoRCxPQUFPLEtBQUssQ0FBQztRQUNkLENBQUM7SUFDRixDQUFDO0lBRUQsTUFBTSxJQUFJLEtBQUssQ0FDZCxxREFBcUQsYUFBYSxRQUFRLFFBQVEsU0FBUyxDQUMzRixDQUFDO0FBQ0gsQ0FBQyJ9