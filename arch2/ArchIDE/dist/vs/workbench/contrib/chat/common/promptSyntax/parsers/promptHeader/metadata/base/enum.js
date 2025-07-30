/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { PromptStringMetadata } from './string.js';
import { localize } from '../../../../../../../../../nls.js';
import { assert } from '../../../../../../../../../base/common/assert.js';
import { isOneOf } from '../../../../../../../../../base/common/types.js';
import { PromptMetadataError } from '../../diagnostics.js';
import { FrontMatterSequence } from '../../../../codecs/base/frontMatterCodec/tokens/frontMatterSequence.js';
import { FrontMatterString } from '../../../../codecs/base/frontMatterCodec/tokens/index.js';
/**
 * Enum type is the special case of the {@link PromptStringMetadata string}
 * type that can take only a well-defined set of {@link validValues}.
 */
export class PromptEnumMetadata extends PromptStringMetadata {
    constructor(validValues, expectedRecordName, recordToken, languageId) {
        super(expectedRecordName, recordToken, languageId);
        this.validValues = validValues;
    }
    /**
     * Valid enum value or 'undefined'.
     */
    get value() {
        return this.enumValue;
    }
    /**
     * Validate the metadata record has an allowed value.
     */
    validate() {
        super.validate();
        if (this.valueToken === undefined) {
            return this.issues;
        }
        // sanity check for our expectations about the validate call
        assert(this.valueToken instanceof FrontMatterString
            || this.valueToken instanceof FrontMatterSequence, `Record token must be 'string', got '${this.valueToken}'.`);
        const { cleanText } = this.valueToken;
        if (isOneOf(cleanText, this.validValues)) {
            this.enumValue = cleanText;
            return this.issues;
        }
        this.issues.push(new PromptMetadataError(this.valueToken.range, localize('prompt.header.metadata.enum.diagnostics.invalid-value', "The '{0}' metadata must be one of {1}, got '{2}'.", this.recordName, this.validValues
            .map((value) => {
            return `'${value}'`;
        }).join(' | '), cleanText)));
        delete this.valueToken;
        return this.issues;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW51bS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL2FkdmlrYXIvRG9jdW1lbnRzL2FyY2hpdGVjdC9hcmNoMi9BcmNoSURFL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvY29tbW9uL3Byb21wdFN5bnRheC9wYXJzZXJzL3Byb21wdEhlYWRlci9tZXRhZGF0YS9iYXNlL2VudW0udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sYUFBYSxDQUFDO0FBQ25ELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUM3RCxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDMUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGlEQUFpRCxDQUFDO0FBQzFFLE9BQU8sRUFBNEIsbUJBQW1CLEVBQUUsTUFBTSxzQkFBc0IsQ0FBQztBQUNyRixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx3RUFBd0UsQ0FBQztBQUM3RyxPQUFPLEVBQXFCLGlCQUFpQixFQUFFLE1BQU0sMERBQTBELENBQUM7QUFFaEg7OztHQUdHO0FBQ0gsTUFBTSxPQUFnQixrQkFFcEIsU0FBUSxvQkFBb0I7SUFDN0IsWUFDa0IsV0FBb0MsRUFDckQsa0JBQTBCLEVBQzFCLFdBQThCLEVBQzlCLFVBQWtCO1FBRWxCLEtBQUssQ0FBQyxrQkFBa0IsRUFBRSxXQUFXLEVBQUUsVUFBVSxDQUFDLENBQUM7UUFMbEMsZ0JBQVcsR0FBWCxXQUFXLENBQXlCO0lBTXRELENBQUM7SUFNRDs7T0FFRztJQUNILElBQW9CLEtBQUs7UUFDeEIsT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDO0lBQ3ZCLENBQUM7SUFFRDs7T0FFRztJQUNhLFFBQVE7UUFDdkIsS0FBSyxDQUFDLFFBQVEsRUFBRSxDQUFDO1FBRWpCLElBQUksSUFBSSxDQUFDLFVBQVUsS0FBSyxTQUFTLEVBQUUsQ0FBQztZQUNuQyxPQUFPLElBQUksQ0FBQyxNQUFNLENBQUM7UUFDcEIsQ0FBQztRQUVELDREQUE0RDtRQUM1RCxNQUFNLENBQ0wsSUFBSSxDQUFDLFVBQVUsWUFBWSxpQkFBaUI7ZUFDekMsSUFBSSxDQUFDLFVBQVUsWUFBWSxtQkFBbUIsRUFDakQsdUNBQXVDLElBQUksQ0FBQyxVQUFVLElBQUksQ0FDMUQsQ0FBQztRQUVGLE1BQU0sRUFBRSxTQUFTLEVBQUUsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDO1FBQ3RDLElBQUksT0FBTyxDQUFDLFNBQVMsRUFBRSxJQUFJLENBQUMsV0FBVyxDQUFDLEVBQUUsQ0FBQztZQUMxQyxJQUFJLENBQUMsU0FBUyxHQUFHLFNBQVMsQ0FBQztZQUUzQixPQUFPLElBQUksQ0FBQyxNQUFNLENBQUM7UUFDcEIsQ0FBQztRQUVELElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUNmLElBQUksbUJBQW1CLENBQ3RCLElBQUksQ0FBQyxVQUFVLENBQUMsS0FBSyxFQUNyQixRQUFRLENBQ1AsdURBQXVELEVBQ3ZELG1EQUFtRCxFQUNuRCxJQUFJLENBQUMsVUFBVSxFQUNmLElBQUksQ0FBQyxXQUFXO2FBQ2QsR0FBRyxDQUFDLENBQUMsS0FBSyxFQUFFLEVBQUU7WUFDZCxPQUFPLElBQUksS0FBSyxHQUFHLENBQUM7UUFDckIsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxFQUNmLFNBQVMsQ0FDVCxDQUNELENBQ0QsQ0FBQztRQUVGLE9BQU8sSUFBSSxDQUFDLFVBQVUsQ0FBQztRQUN2QixPQUFPLElBQUksQ0FBQyxNQUFNLENBQUM7SUFDcEIsQ0FBQztDQUNEIn0=