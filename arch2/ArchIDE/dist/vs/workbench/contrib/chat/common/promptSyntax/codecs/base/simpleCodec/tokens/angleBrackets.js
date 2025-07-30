/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { SimpleToken } from './simpleToken.js';
/**
 * A token that represent a `<` with a `range`. The `range`
 * value reflects the position of the token in the original data.
 */
export class LeftAngleBracket extends SimpleToken {
    /**
     * The underlying symbol of the token.
     */
    static { this.symbol = '<'; }
    /**
     * Return text representation of the token.
     */
    get text() {
        return LeftAngleBracket.symbol;
    }
    /**
     * Returns a string representation of the token.
     */
    toString() {
        return `left-angle-bracket${this.range}`;
    }
}
/**
 * A token that represent a `>` with a `range`. The `range`
 * value reflects the position of the token in the original data.
 */
export class RightAngleBracket extends SimpleToken {
    /**
     * The underlying symbol of the token.
     */
    static { this.symbol = '>'; }
    /**
     * Return text representation of the token.
     */
    get text() {
        return RightAngleBracket.symbol;
    }
    /**
     * Returns a string representation of the token.
     */
    toString() {
        return `right-angle-bracket${this.range}`;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYW5nbGVCcmFja2V0cy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL2FkdmlrYXIvRG9jdW1lbnRzL2FyY2hpdGVjdC9hcmNoMi9BcmNoSURFL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvY29tbW9uL3Byb21wdFN5bnRheC9jb2RlY3MvYmFzZS9zaW1wbGVDb2RlYy90b2tlbnMvYW5nbGVCcmFja2V0cy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sa0JBQWtCLENBQUM7QUFFL0M7OztHQUdHO0FBQ0gsTUFBTSxPQUFPLGdCQUFpQixTQUFRLFdBQWdCO0lBQ3JEOztPQUVHO2FBQzZCLFdBQU0sR0FBUSxHQUFHLENBQUM7SUFFbEQ7O09BRUc7SUFDSCxJQUFvQixJQUFJO1FBQ3ZCLE9BQU8sZ0JBQWdCLENBQUMsTUFBTSxDQUFDO0lBQ2hDLENBQUM7SUFFRDs7T0FFRztJQUNhLFFBQVE7UUFDdkIsT0FBTyxxQkFBcUIsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO0lBQzFDLENBQUM7O0FBR0Y7OztHQUdHO0FBQ0gsTUFBTSxPQUFPLGlCQUFrQixTQUFRLFdBQWdCO0lBQ3REOztPQUVHO2FBQzZCLFdBQU0sR0FBUSxHQUFHLENBQUM7SUFFbEQ7O09BRUc7SUFDSCxJQUFvQixJQUFJO1FBQ3ZCLE9BQU8saUJBQWlCLENBQUMsTUFBTSxDQUFDO0lBQ2pDLENBQUM7SUFFRDs7T0FFRztJQUNhLFFBQVE7UUFDdkIsT0FBTyxzQkFBc0IsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO0lBQzNDLENBQUMifQ==