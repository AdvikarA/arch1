/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { PromptStringMetadata } from './base/string.js';
import { localize } from '../../../../../../../../nls.js';
import { INSTRUCTIONS_LANGUAGE_ID } from '../../../promptTypes.js';
import { isEmptyPattern, parse, splitGlobAware } from '../../../../../../../../base/common/glob.js';
import { PromptMetadataError, PromptMetadataWarning } from '../diagnostics.js';
import { FrontMatterRecord } from '../../../codecs/base/frontMatterCodec/tokens/index.js';
/**
 * Name of the metadata record in the prompt header.
 */
const RECORD_NAME = 'applyTo';
/**
 * Prompt `applyTo` metadata record inside the prompt header.
 */
export class PromptApplyToMetadata extends PromptStringMetadata {
    constructor(recordToken, languageId) {
        super(RECORD_NAME, recordToken, languageId);
    }
    get recordName() {
        return RECORD_NAME;
    }
    validate() {
        super.validate();
        // if we don't have a value token, validation must
        // has failed already so nothing to do more
        if (this.valueToken === undefined) {
            return this.issues;
        }
        // the applyTo metadata makes sense only for 'instruction' prompts
        if (this.languageId !== INSTRUCTIONS_LANGUAGE_ID) {
            this.issues.push(new PromptMetadataError(this.range, localize('prompt.header.metadata.string.diagnostics.invalid-language', "The '{0}' header property is only valid in instruction files.", this.recordName)));
            delete this.valueToken;
            return this.issues;
        }
        const { cleanText } = this.valueToken;
        // warn user if specified glob pattern is not valid
        if (this.isValidGlob(cleanText) === false) {
            this.issues.push(new PromptMetadataWarning(this.valueToken.range, localize('prompt.header.metadata.applyTo.diagnostics.non-valid-glob', "Invalid glob pattern '{0}'.", cleanText)));
            delete this.valueToken;
            return this.issues;
        }
        return this.issues;
    }
    /**
     * Check if a provided string contains a valid glob pattern.
     */
    isValidGlob(pattern) {
        try {
            const patterns = splitGlobAware(pattern, ',');
            if (patterns.length === 0) {
                return false;
            }
            for (const pattern of patterns) {
                const globPattern = parse(pattern);
                if (isEmptyPattern(globPattern)) {
                    return false;
                }
            }
            return true;
        }
        catch (_error) {
            return false;
        }
    }
    /**
     * Check if a provided front matter token is a metadata record
     * with name equal to `applyTo`.
     */
    static isApplyToRecord(token) {
        if ((token instanceof FrontMatterRecord) === false) {
            return false;
        }
        if (token.nameToken.text === RECORD_NAME) {
            return true;
        }
        return false;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXBwbHlUby5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL2FkdmlrYXIvRG9jdW1lbnRzL2FyY2hpdGVjdC9hcmNoMi9BcmNoSURFL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvY29tbW9uL3Byb21wdFN5bnRheC9wYXJzZXJzL3Byb21wdEhlYWRlci9tZXRhZGF0YS9hcHBseVRvLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLGtCQUFrQixDQUFDO0FBQ3hELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUMxRCxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQztBQUNuRSxPQUFPLEVBQUUsY0FBYyxFQUFFLEtBQUssRUFBRSxjQUFjLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUNwRyxPQUFPLEVBQTRCLG1CQUFtQixFQUFFLHFCQUFxQixFQUFFLE1BQU0sbUJBQW1CLENBQUM7QUFDekcsT0FBTyxFQUFFLGlCQUFpQixFQUFvQixNQUFNLHVEQUF1RCxDQUFDO0FBRTVHOztHQUVHO0FBQ0gsTUFBTSxXQUFXLEdBQUcsU0FBUyxDQUFDO0FBRTlCOztHQUVHO0FBQ0gsTUFBTSxPQUFPLHFCQUFzQixTQUFRLG9CQUFvQjtJQUM5RCxZQUNDLFdBQThCLEVBQzlCLFVBQWtCO1FBRWxCLEtBQUssQ0FBQyxXQUFXLEVBQUUsV0FBVyxFQUFFLFVBQVUsQ0FBQyxDQUFDO0lBQzdDLENBQUM7SUFFRCxJQUFvQixVQUFVO1FBQzdCLE9BQU8sV0FBVyxDQUFDO0lBQ3BCLENBQUM7SUFFZSxRQUFRO1FBQ3ZCLEtBQUssQ0FBQyxRQUFRLEVBQUUsQ0FBQztRQUVqQixrREFBa0Q7UUFDbEQsMkNBQTJDO1FBQzNDLElBQUksSUFBSSxDQUFDLFVBQVUsS0FBSyxTQUFTLEVBQUUsQ0FBQztZQUNuQyxPQUFPLElBQUksQ0FBQyxNQUFNLENBQUM7UUFDcEIsQ0FBQztRQUVELGtFQUFrRTtRQUNsRSxJQUFJLElBQUksQ0FBQyxVQUFVLEtBQUssd0JBQXdCLEVBQUUsQ0FBQztZQUNsRCxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FDZixJQUFJLG1CQUFtQixDQUN0QixJQUFJLENBQUMsS0FBSyxFQUNWLFFBQVEsQ0FDUCw0REFBNEQsRUFDNUQsK0RBQStELEVBQy9ELElBQUksQ0FBQyxVQUFVLENBQ2YsQ0FDRCxDQUNELENBQUM7WUFFRixPQUFPLElBQUksQ0FBQyxVQUFVLENBQUM7WUFDdkIsT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDO1FBQ3BCLENBQUM7UUFFRCxNQUFNLEVBQUUsU0FBUyxFQUFFLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQztRQUV0QyxtREFBbUQ7UUFDbkQsSUFBSSxJQUFJLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyxLQUFLLEtBQUssRUFBRSxDQUFDO1lBQzNDLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUNmLElBQUkscUJBQXFCLENBQ3hCLElBQUksQ0FBQyxVQUFVLENBQUMsS0FBSyxFQUNyQixRQUFRLENBQ1AsMkRBQTJELEVBQzNELDZCQUE2QixFQUM3QixTQUFTLENBQ1QsQ0FDRCxDQUNELENBQUM7WUFFRixPQUFPLElBQUksQ0FBQyxVQUFVLENBQUM7WUFDdkIsT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDO1FBQ3BCLENBQUM7UUFFRCxPQUFPLElBQUksQ0FBQyxNQUFNLENBQUM7SUFDcEIsQ0FBQztJQUVEOztPQUVHO0lBQ0ssV0FBVyxDQUNsQixPQUFlO1FBRWYsSUFBSSxDQUFDO1lBQ0osTUFBTSxRQUFRLEdBQUcsY0FBYyxDQUFDLE9BQU8sRUFBRSxHQUFHLENBQUMsQ0FBQztZQUM5QyxJQUFJLFFBQVEsQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFLENBQUM7Z0JBQzNCLE9BQU8sS0FBSyxDQUFDO1lBQ2QsQ0FBQztZQUNELEtBQUssTUFBTSxPQUFPLElBQUksUUFBUSxFQUFFLENBQUM7Z0JBRWhDLE1BQU0sV0FBVyxHQUFHLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQztnQkFDbkMsSUFBSSxjQUFjLENBQUMsV0FBVyxDQUFDLEVBQUUsQ0FBQztvQkFDakMsT0FBTyxLQUFLLENBQUM7Z0JBQ2QsQ0FBQztZQUNGLENBQUM7WUFDRCxPQUFPLElBQUksQ0FBQztRQUNiLENBQUM7UUFBQyxPQUFPLE1BQU0sRUFBRSxDQUFDO1lBQ2pCLE9BQU8sS0FBSyxDQUFDO1FBQ2QsQ0FBQztJQUNGLENBQUM7SUFFRDs7O09BR0c7SUFDSSxNQUFNLENBQUMsZUFBZSxDQUM1QixLQUF1QjtRQUV2QixJQUFJLENBQUMsS0FBSyxZQUFZLGlCQUFpQixDQUFDLEtBQUssS0FBSyxFQUFFLENBQUM7WUFDcEQsT0FBTyxLQUFLLENBQUM7UUFDZCxDQUFDO1FBRUQsSUFBSSxLQUFLLENBQUMsU0FBUyxDQUFDLElBQUksS0FBSyxXQUFXLEVBQUUsQ0FBQztZQUMxQyxPQUFPLElBQUksQ0FBQztRQUNiLENBQUM7UUFFRCxPQUFPLEtBQUssQ0FBQztJQUNkLENBQUM7Q0FDRCJ9