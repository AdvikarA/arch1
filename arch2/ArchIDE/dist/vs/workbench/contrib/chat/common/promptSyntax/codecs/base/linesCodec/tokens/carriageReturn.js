/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { VSBuffer } from '../../../../../../../../../base/common/buffer.js';
import { SimpleToken } from '../../simpleCodec/tokens/simpleToken.js';
/**
 * Token that represent a `carriage return` with a `range`. The `range`
 * value reflects the position of the token in the original data.
 */
export class CarriageReturn extends SimpleToken {
    /**
     * The underlying symbol of the token.
     */
    static { this.symbol = '\r'; }
    /**
     * The byte representation of the {@link symbol}.
     */
    static { this.byte = VSBuffer.fromString(CarriageReturn.symbol); }
    /**
     * The byte representation of the token.
     */
    get byte() {
        return CarriageReturn.byte;
    }
    /**
     * Return text representation of the token.
     */
    get text() {
        return CarriageReturn.symbol;
    }
    /**
     * Returns a string representation of the token.
     */
    toString() {
        return `CR${this.range}`;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2FycmlhZ2VSZXR1cm4uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9hZHZpa2FyL0RvY3VtZW50cy9hcmNoaXRlY3QvYXJjaDIvQXJjaElERS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2NvbW1vbi9wcm9tcHRTeW50YXgvY29kZWNzL2Jhc2UvbGluZXNDb2RlYy90b2tlbnMvY2FycmlhZ2VSZXR1cm4udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQzVFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUV0RTs7O0dBR0c7QUFDSCxNQUFNLE9BQU8sY0FBZSxTQUFRLFdBQWlCO0lBQ3BEOztPQUVHO2FBQzZCLFdBQU0sR0FBUyxJQUFJLENBQUM7SUFFcEQ7O09BRUc7YUFDb0IsU0FBSSxHQUFHLFFBQVEsQ0FBQyxVQUFVLENBQUMsY0FBYyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBRXpFOztPQUVHO0lBQ0gsSUFBVyxJQUFJO1FBQ2QsT0FBTyxjQUFjLENBQUMsSUFBSSxDQUFDO0lBQzVCLENBQUM7SUFFRDs7T0FFRztJQUNILElBQW9CLElBQUk7UUFDdkIsT0FBTyxjQUFjLENBQUMsTUFBTSxDQUFDO0lBQzlCLENBQUM7SUFFRDs7T0FFRztJQUNhLFFBQVE7UUFDdkIsT0FBTyxLQUFLLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztJQUMxQixDQUFDIn0=