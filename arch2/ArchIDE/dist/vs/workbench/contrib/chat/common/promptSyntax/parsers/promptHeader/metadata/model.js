/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { FrontMatterRecord } from '../../../codecs/base/frontMatterCodec/tokens/index.js';
import { PromptStringMetadata } from './base/string.js';
/**
 * Name of the metadata record in the prompt header.
 */
const RECORD_NAME = 'model';
export class PromptModelMetadata extends PromptStringMetadata {
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
    static isModelRecord(token) {
        if ((token instanceof FrontMatterRecord) === false) {
            return false;
        }
        if (token.nameToken.text === RECORD_NAME) {
            return true;
        }
        return false;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9kZWwuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9hZHZpa2FyL0RvY3VtZW50cy9hcmNoaXRlY3QvYXJjaDIvQXJjaElERS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2NvbW1vbi9wcm9tcHRTeW50YXgvcGFyc2Vycy9wcm9tcHRIZWFkZXIvbWV0YWRhdGEvbW9kZWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLGlCQUFpQixFQUFvQixNQUFNLHVEQUF1RCxDQUFDO0FBQzVHLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLGtCQUFrQixDQUFDO0FBRXhEOztHQUVHO0FBQ0gsTUFBTSxXQUFXLEdBQUcsT0FBTyxDQUFDO0FBRTVCLE1BQU0sT0FBTyxtQkFBb0IsU0FBUSxvQkFBb0I7SUFDNUQsSUFBb0IsVUFBVTtRQUM3QixPQUFPLFdBQVcsQ0FBQztJQUNwQixDQUFDO0lBRUQsWUFDQyxXQUE4QixFQUM5QixVQUFrQjtRQUVsQixLQUFLLENBQUMsV0FBVyxFQUFFLFdBQVcsRUFBRSxVQUFVLENBQUMsQ0FBQztJQUM3QyxDQUFDO0lBRUQ7OztPQUdHO0lBQ0ksTUFBTSxDQUFDLGFBQWEsQ0FBQyxLQUF1QjtRQUNsRCxJQUFJLENBQUMsS0FBSyxZQUFZLGlCQUFpQixDQUFDLEtBQUssS0FBSyxFQUFFLENBQUM7WUFDcEQsT0FBTyxLQUFLLENBQUM7UUFDZCxDQUFDO1FBRUQsSUFBSSxLQUFLLENBQUMsU0FBUyxDQUFDLElBQUksS0FBSyxXQUFXLEVBQUUsQ0FBQztZQUMxQyxPQUFPLElBQUksQ0FBQztRQUNiLENBQUM7UUFFRCxPQUFPLEtBQUssQ0FBQztJQUNkLENBQUM7Q0FDRCJ9