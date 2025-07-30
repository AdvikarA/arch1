/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { PromptStringMetadata } from './base/string.js';
import { FrontMatterRecord } from '../../../codecs/base/frontMatterCodec/tokens/index.js';
/**
 * Name of the metadata record in the prompt header.
 */
const RECORD_NAME = 'description';
/**
 * Prompt `description` metadata record inside the prompt header.
 */
export class PromptDescriptionMetadata extends PromptStringMetadata {
    get recordName() {
        return RECORD_NAME;
    }
    constructor(recordToken, languageId) {
        super(RECORD_NAME, recordToken, languageId);
    }
    /**
     * Check if a provided front matter token is a metadata record
     * with name equal to `description`.
     */
    static isDescriptionRecord(token) {
        if ((token instanceof FrontMatterRecord) === false) {
            return false;
        }
        if (token.nameToken.text === RECORD_NAME) {
            return true;
        }
        return false;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVzY3JpcHRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9hZHZpa2FyL0RvY3VtZW50cy9hcmNoaXRlY3QvYXJjaDIvQXJjaElERS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2NvbW1vbi9wcm9tcHRTeW50YXgvcGFyc2Vycy9wcm9tcHRIZWFkZXIvbWV0YWRhdGEvZGVzY3JpcHRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sa0JBQWtCLENBQUM7QUFDeEQsT0FBTyxFQUFFLGlCQUFpQixFQUFvQixNQUFNLHVEQUF1RCxDQUFDO0FBRTVHOztHQUVHO0FBQ0gsTUFBTSxXQUFXLEdBQUcsYUFBYSxDQUFDO0FBRWxDOztHQUVHO0FBQ0gsTUFBTSxPQUFPLHlCQUEwQixTQUFRLG9CQUFvQjtJQUNsRSxJQUFvQixVQUFVO1FBQzdCLE9BQU8sV0FBVyxDQUFDO0lBQ3BCLENBQUM7SUFFRCxZQUNDLFdBQThCLEVBQzlCLFVBQWtCO1FBRWxCLEtBQUssQ0FBQyxXQUFXLEVBQUUsV0FBVyxFQUFFLFVBQVUsQ0FBQyxDQUFDO0lBQzdDLENBQUM7SUFFRDs7O09BR0c7SUFDSSxNQUFNLENBQUMsbUJBQW1CLENBQ2hDLEtBQXVCO1FBRXZCLElBQUksQ0FBQyxLQUFLLFlBQVksaUJBQWlCLENBQUMsS0FBSyxLQUFLLEVBQUUsQ0FBQztZQUNwRCxPQUFPLEtBQUssQ0FBQztRQUNkLENBQUM7UUFFRCxJQUFJLEtBQUssQ0FBQyxTQUFTLENBQUMsSUFBSSxLQUFLLFdBQVcsRUFBRSxDQUFDO1lBQzFDLE9BQU8sSUFBSSxDQUFDO1FBQ2IsQ0FBQztRQUVELE9BQU8sS0FBSyxDQUFDO0lBQ2QsQ0FBQztDQUNEIn0=