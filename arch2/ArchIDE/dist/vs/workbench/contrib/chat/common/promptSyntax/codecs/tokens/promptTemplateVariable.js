/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { PromptToken } from './promptToken.js';
import { DollarSign } from '../base/simpleCodec/tokens/dollarSign.js';
import { LeftCurlyBrace, RightCurlyBrace } from '../base/simpleCodec/tokens/curlyBraces.js';
/**
 * Represents a `${variable}` token in a prompt text.
 */
export class PromptTemplateVariable extends PromptToken {
    constructor(range, 
    /**
     * The contents of the template variable, excluding
     * the surrounding `${}` characters.
     */
    contents) {
        super(range);
        this.contents = contents;
    }
    /**
     * Get full text of the token.
     */
    get text() {
        return [
            DollarSign.symbol,
            LeftCurlyBrace.symbol,
            this.contents,
            RightCurlyBrace.symbol,
        ].join('');
    }
    /**
     * Return a string representation of the token.
     */
    toString() {
        return `${this.text}${this.range}`;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvbXB0VGVtcGxhdGVWYXJpYWJsZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL2FkdmlrYXIvRG9jdW1lbnRzL2FyY2hpdGVjdC9hcmNoMi9BcmNoSURFL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvY29tbW9uL3Byb21wdFN5bnRheC9jb2RlY3MvdG9rZW5zL3Byb21wdFRlbXBsYXRlVmFyaWFibGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLGtCQUFrQixDQUFDO0FBRS9DLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUN0RSxPQUFPLEVBQUUsY0FBYyxFQUFFLGVBQWUsRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBRTVGOztHQUVHO0FBQ0gsTUFBTSxPQUFPLHNCQUF1QixTQUFRLFdBQVc7SUFDdEQsWUFDQyxLQUFZO0lBQ1o7OztPQUdHO0lBQ2EsUUFBZ0I7UUFFaEMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBRkcsYUFBUSxHQUFSLFFBQVEsQ0FBUTtJQUdqQyxDQUFDO0lBRUQ7O09BRUc7SUFDSCxJQUFXLElBQUk7UUFDZCxPQUFPO1lBQ04sVUFBVSxDQUFDLE1BQU07WUFDakIsY0FBYyxDQUFDLE1BQU07WUFDckIsSUFBSSxDQUFDLFFBQVE7WUFDYixlQUFlLENBQUMsTUFBTTtTQUN0QixDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQztJQUNaLENBQUM7SUFFRDs7T0FFRztJQUNhLFFBQVE7UUFDdkIsT0FBTyxHQUFHLElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO0lBQ3BDLENBQUM7Q0FDRCJ9