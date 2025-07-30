/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { SimpleToken } from './simpleToken.js';
/**
 * A token that represent a `#` with a `range`. The `range`
 * value reflects the position of the token in the original data.
 */
export class Hash extends SimpleToken {
    /**
     * The underlying symbol of the token.
     */
    static { this.symbol = '#'; }
    /**
     * Return text representation of the token.
     */
    get text() {
        return Hash.symbol;
    }
    /**
     * Returns a string representation of the token.
     */
    toString() {
        return `hash${this.range}`;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaGFzaC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL2FkdmlrYXIvRG9jdW1lbnRzL2FyY2hpdGVjdC9hcmNoMi9BcmNoSURFL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvY29tbW9uL3Byb21wdFN5bnRheC9jb2RlY3MvYmFzZS9zaW1wbGVDb2RlYy90b2tlbnMvaGFzaC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sa0JBQWtCLENBQUM7QUFFL0M7OztHQUdHO0FBQ0gsTUFBTSxPQUFPLElBQUssU0FBUSxXQUFnQjtJQUN6Qzs7T0FFRzthQUM2QixXQUFNLEdBQVEsR0FBRyxDQUFDO0lBRWxEOztPQUVHO0lBQ0gsSUFBb0IsSUFBSTtRQUN2QixPQUFPLElBQUksQ0FBQyxNQUFNLENBQUM7SUFDcEIsQ0FBQztJQUVEOztPQUVHO0lBQ2EsUUFBUTtRQUN2QixPQUFPLE9BQU8sSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO0lBQzVCLENBQUMifQ==