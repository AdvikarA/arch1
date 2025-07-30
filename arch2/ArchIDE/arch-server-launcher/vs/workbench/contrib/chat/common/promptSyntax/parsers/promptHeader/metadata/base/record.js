/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { assert } from '../../../../../../../../../base/common/assert.js';
import { PromptMetadataError, PromptMetadataWarning } from '../../diagnostics.js';
/**
 * Abstract class for all metadata records in the prompt header.
 */
export class PromptMetadataRecord {
    /**
     * Full range of the metadata's record text in the prompt header.
     */
    get range() {
        return this.recordToken.range;
    }
    constructor(expectedRecordName, recordToken, languageId) {
        this.expectedRecordName = expectedRecordName;
        this.recordToken = recordToken;
        this.languageId = languageId;
        // validate that the record name has the expected name
        const recordName = recordToken.nameToken.text;
        assert(recordName === expectedRecordName, `Record name must be '${expectedRecordName}', got '${recordName}'.`);
        this.issues = [];
    }
    /**
     * Name of the metadata record.
     */
    get recordName() {
        return this.recordToken.nameToken.text;
    }
    /**
     * List of all diagnostic issues related to this metadata record.
     */
    get diagnostics() {
        return this.issues;
    }
    /**
     * List of all `error` issue diagnostics.
     */
    get errorDiagnostics() {
        return this.diagnostics
            .filter((diagnostic) => {
            return (diagnostic instanceof PromptMetadataError);
        });
    }
    /**
     * List of all `warning` issue diagnostics.
     */
    get warningDiagnostics() {
        return this.diagnostics
            .filter((diagnostic) => {
            return (diagnostic instanceof PromptMetadataWarning);
        });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVjb3JkLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvYWR2aWthci9Eb2N1bWVudHMvYXJjaGl0ZWN0L2FyY2gyL0FyY2hJREUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9jb21tb24vcHJvbXB0U3ludGF4L3BhcnNlcnMvcHJvbXB0SGVhZGVyL21ldGFkYXRhL2Jhc2UvcmVjb3JkLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUUxRSxPQUFPLEVBQTRCLG1CQUFtQixFQUFFLHFCQUFxQixFQUFFLE1BQU0sc0JBQXNCLENBQUM7QUF3QjVHOztHQUVHO0FBQ0gsTUFBTSxPQUFnQixvQkFBb0I7SUFPekM7O09BRUc7SUFDSCxJQUFXLEtBQUs7UUFDZixPQUFPLElBQUksQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDO0lBQy9CLENBQUM7SUFFRCxZQUNvQixrQkFBMEIsRUFDMUIsV0FBOEIsRUFDOUIsVUFBa0I7UUFGbEIsdUJBQWtCLEdBQWxCLGtCQUFrQixDQUFRO1FBQzFCLGdCQUFXLEdBQVgsV0FBVyxDQUFtQjtRQUM5QixlQUFVLEdBQVYsVUFBVSxDQUFRO1FBRXJDLHNEQUFzRDtRQUN0RCxNQUFNLFVBQVUsR0FBRyxXQUFXLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQztRQUM5QyxNQUFNLENBQ0wsVUFBVSxLQUFLLGtCQUFrQixFQUNqQyx3QkFBd0Isa0JBQWtCLFdBQVcsVUFBVSxJQUFJLENBQ25FLENBQUM7UUFFRixJQUFJLENBQUMsTUFBTSxHQUFHLEVBQUUsQ0FBQztJQUNsQixDQUFDO0lBRUQ7O09BRUc7SUFDSCxJQUFXLFVBQVU7UUFDcEIsT0FBTyxJQUFJLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUM7SUFDeEMsQ0FBQztJQVFEOztPQUVHO0lBQ0gsSUFBVyxXQUFXO1FBQ3JCLE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQztJQUNwQixDQUFDO0lBT0Q7O09BRUc7SUFDSCxJQUFXLGdCQUFnQjtRQUMxQixPQUFPLElBQUksQ0FBQyxXQUFXO2FBQ3JCLE1BQU0sQ0FBQyxDQUFDLFVBQVUsRUFBRSxFQUFFO1lBQ3RCLE9BQU8sQ0FBQyxVQUFVLFlBQVksbUJBQW1CLENBQUMsQ0FBQztRQUNwRCxDQUFDLENBQUMsQ0FBQztJQUNMLENBQUM7SUFFRDs7T0FFRztJQUNILElBQVcsa0JBQWtCO1FBQzVCLE9BQU8sSUFBSSxDQUFDLFdBQVc7YUFDckIsTUFBTSxDQUFDLENBQUMsVUFBVSxFQUFFLEVBQUU7WUFDdEIsT0FBTyxDQUFDLFVBQVUsWUFBWSxxQkFBcUIsQ0FBQyxDQUFDO1FBQ3RELENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztDQUNEIn0=