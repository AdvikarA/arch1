/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { assert } from './assert.js';
export function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}
export function rot(index, modulo) {
    return (modulo + (index % modulo)) % modulo;
}
export class Counter {
    constructor() {
        this._next = 0;
    }
    getNext() {
        return this._next++;
    }
}
export class MovingAverage {
    constructor() {
        this._n = 1;
        this._val = 0;
    }
    update(value) {
        this._val = this._val + (value - this._val) / this._n;
        this._n += 1;
        return this._val;
    }
    get value() {
        return this._val;
    }
}
export class SlidingWindowAverage {
    constructor(size) {
        this._n = 0;
        this._val = 0;
        this._values = [];
        this._index = 0;
        this._sum = 0;
        this._values = new Array(size);
        this._values.fill(0, 0, size);
    }
    update(value) {
        const oldValue = this._values[this._index];
        this._values[this._index] = value;
        this._index = (this._index + 1) % this._values.length;
        this._sum -= oldValue;
        this._sum += value;
        if (this._n < this._values.length) {
            this._n += 1;
        }
        this._val = this._sum / this._n;
        return this._val;
    }
    get value() {
        return this._val;
    }
}
/** Returns whether the point is within the triangle formed by the following 6 x/y point pairs */
export function isPointWithinTriangle(x, y, ax, ay, bx, by, cx, cy) {
    const v0x = cx - ax;
    const v0y = cy - ay;
    const v1x = bx - ax;
    const v1y = by - ay;
    const v2x = x - ax;
    const v2y = y - ay;
    const dot00 = v0x * v0x + v0y * v0y;
    const dot01 = v0x * v1x + v0y * v1y;
    const dot02 = v0x * v2x + v0y * v2y;
    const dot11 = v1x * v1x + v1y * v1y;
    const dot12 = v1x * v2x + v1y * v2y;
    const invDenom = 1 / (dot00 * dot11 - dot01 * dot01);
    const u = (dot11 * dot02 - dot01 * dot12) * invDenom;
    const v = (dot00 * dot12 - dot01 * dot02) * invDenom;
    return u >= 0 && v >= 0 && u + v < 1;
}
/**
 * Function to get a (pseudo)random integer from a provided `max`...[`min`] range.
 * Both `min` and `max` values are inclusive. The `min` value is optional (defaults to `0`).
 *
 * @throws in the next cases:
 * 	- if provided `min` or `max` is not a number
 *  - if provided `min` or `max` is not finite
 *  - if provided `min` is larger than `max` value
 *
 * ## Examples
 *
 * Specifying a `max` value only uses `0` as the `min` value by default:
 *
 * ```typescript
 * // get a random integer between 0 and 10
 * const randomInt = randomInt(10);
 *
 * assert(
 *   randomInt >= 0,
 *   'Should be greater than or equal to 0.',
 * );
 *
 * assert(
 *   randomInt <= 10,
 *   'Should be less than or equal to 10.',
 * );
 * ```
 * * Specifying both `max` and `min` values:
 *
 * ```typescript
 * // get a random integer between 5 and 8
 * const randomInt = randomInt(8, 5);
 *
 * assert(
 *   randomInt >= 5,
 *   'Should be greater than or equal to 5.',
 * );
 *
 * assert(
 *   randomInt <= 8,
 *   'Should be less than or equal to 8.',
 * );
 * ```
 */
export function randomInt(max, min = 0) {
    assert(!isNaN(min), '"min" param is not a number.');
    assert(!isNaN(max), '"max" param is not a number.');
    assert(isFinite(max), '"max" param is not finite.');
    assert(isFinite(min), '"min" param is not finite.');
    assert(max > min, `"max"(${max}) param should be greater than "min"(${min}).`);
    const delta = max - min;
    const randomFloat = delta * Math.random();
    return Math.round(min + randomFloat);
}
export function randomChance(p) {
    assert(p >= 0 && p <= 1, 'p must be between 0 and 1');
    return Math.random() < p;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibnVtYmVycy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL2FkdmlrYXIvRG9jdW1lbnRzL2FyY2hpdGVjdC9hcmNoMi9BcmNoSURFL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvY29tbW9uL251bWJlcnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLGFBQWEsQ0FBQztBQUVyQyxNQUFNLFVBQVUsS0FBSyxDQUFDLEtBQWEsRUFBRSxHQUFXLEVBQUUsR0FBVztJQUM1RCxPQUFPLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUM7QUFDNUMsQ0FBQztBQUVELE1BQU0sVUFBVSxHQUFHLENBQUMsS0FBYSxFQUFFLE1BQWM7SUFDaEQsT0FBTyxDQUFDLE1BQU0sR0FBRyxDQUFDLEtBQUssR0FBRyxNQUFNLENBQUMsQ0FBQyxHQUFHLE1BQU0sQ0FBQztBQUM3QyxDQUFDO0FBRUQsTUFBTSxPQUFPLE9BQU87SUFBcEI7UUFDUyxVQUFLLEdBQUcsQ0FBQyxDQUFDO0lBS25CLENBQUM7SUFIQSxPQUFPO1FBQ04sT0FBTyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7SUFDckIsQ0FBQztDQUNEO0FBRUQsTUFBTSxPQUFPLGFBQWE7SUFBMUI7UUFFUyxPQUFFLEdBQUcsQ0FBQyxDQUFDO1FBQ1AsU0FBSSxHQUFHLENBQUMsQ0FBQztJQVdsQixDQUFDO0lBVEEsTUFBTSxDQUFDLEtBQWE7UUFDbkIsSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUMsSUFBSSxHQUFHLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUMsRUFBRSxDQUFDO1FBQ3RELElBQUksQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQ2IsT0FBTyxJQUFJLENBQUMsSUFBSSxD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