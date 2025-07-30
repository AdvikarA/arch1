/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { PromptMetadataRecord } from './record.js';
import { localize } from '../../../../../../../../../nls.js';
import { PromptMetadataError } from '../../diagnostics.js';
import { FrontMatterSequence } from '../../../../codecs/base/frontMatterCodec/tokens/frontMatterSequence.js';
import { FrontMatterString } from '../../../../codecs/base/frontMatterCodec/tokens/index.js';
/**
 * Base class for all metadata records with a `string` value.
 */
export class PromptStringMetadata extends PromptMetadataRecord {
    /**
     * String value of a metadata record.
     */
    get value() {
        return this.valueToken?.cleanText;
    }
    constructor(expectedRecordName, recordToken, languageId) {
        super(expectedRecordName, recordToken, languageId);
    }
    /**
     * Validate the metadata record has a 'string' value.
     */
    validate() {
        const { valueToken } = this.recordToken;
        // validate that the record value is a string or a generic sequence
        // of tokens that can be interpreted as a string without quotes
        const isString = (valueToken instanceof FrontMatterString);
        const isSequence = (valueToken instanceof FrontMatterSequence);
        if (isString || isSequence) {
            this.valueToken = valueToken;
            return this.issues;
        }
        this.issues.push(new PromptMetadataError(valueToken.range, localize('prompt.header.metadata.string.diagnostics.invalid-value-type', "The '{0}' metadata must be a '{1}', got '{2}'.", this.recordName, 'string', valueToken.valueTypeName.toString())));
        delete this.valueToken;
        return this.issues;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RyaW5nLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvYWR2aWthci9Eb2N1bWVudHMvYXJjaGl0ZWN0L2FyY2gyL0FyY2hJREUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9jb21tb24vcHJvbXB0U3ludGF4L3BhcnNlcnMvcHJvbXB0SGVhZGVyL21ldGFkYXRhL2Jhc2Uvc3RyaW5nLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLGFBQWEsQ0FBQztBQUNuRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDN0QsT0FBTyxFQUE0QixtQkFBbUIsRUFBRSxNQUFNLHNCQUFzQixDQUFDO0FBQ3JGLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHdFQUF3RSxDQUFDO0FBQzdHLE9BQU8sRUFBcUIsaUJBQWlCLEVBQUUsTUFBTSwwREFBMEQsQ0FBQztBQUVoSDs7R0FFRztBQUNILE1BQU0sT0FBZ0Isb0JBQXFCLFNBQVEsb0JBQTRCO0lBTTlFOztPQUVHO0lBQ0gsSUFBb0IsS0FBSztRQUN4QixPQUFPLElBQUksQ0FBQyxVQUFVLEVBQUUsU0FBUyxDQUFDO0lBQ25DLENBQUM7SUFFRCxZQUNDLGtCQUEwQixFQUMxQixXQUE4QixFQUM5QixVQUFrQjtRQUVsQixLQUFLLENBQUMsa0JBQWtCLEVBQUUsV0FBVyxFQUFFLFVBQVUsQ0FBQyxDQUFDO0lBQ3BELENBQUM7SUFFRDs7T0FFRztJQUNhLFFBQVE7UUFDdkIsTUFBTSxFQUFFLFVBQVUsRUFBRSxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUM7UUFFeEMsbUVBQW1FO1FBQ25FLCtEQUErRDtRQUMvRCxNQUFNLFFBQVEsR0FBRyxDQUFDLFVBQVUsWUFBWSxpQkFBaUIsQ0FBQyxDQUFDO1FBQzNELE1BQU0sVUFBVSxHQUFHLENBQUMsVUFBVSxZQUFZLG1CQUFtQixDQUFDLENBQUM7UUFDL0QsSUFBSSxRQUFRLElBQUksVUFBVSxFQUFFLENBQUM7WUFDNUIsSUFBSSxDQUFDLFVBQVUsR0FBRyxVQUFVLENBQUM7WUFDN0IsT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDO1FBQ3BCLENBQUM7UUFFRCxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FDZixJQUFJLG1CQUFtQixDQUN0QixVQUFVLENBQUMsS0FBSyxFQUNoQixRQUFRLENBQ1AsOERBQThELEVBQzlELGdEQUFnRCxFQUNoRCxJQUFJLENBQUMsVUFBVSxFQUNmLFFBQVEsRUFDUixVQUFVLENBQUMsYUFBYSxDQUFDLFFBQVEsRUFBRSxDQUNuQyxDQUNELENBQ0QsQ0FBQztRQUVGLE9BQU8sSUFBSSxDQUFDLFVBQVUsQ0FBQztRQUN2QixPQUFPLElBQUksQ0FBQyxNQUFNLENBQUM7SUFDcEIsQ0FBQztDQUNEIn0=