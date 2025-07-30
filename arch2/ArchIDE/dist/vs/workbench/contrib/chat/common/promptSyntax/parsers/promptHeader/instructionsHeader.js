/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { PromptApplyToMetadata } from './metadata/applyTo.js';
import { HeaderBase } from './headerBase.js';
/**
 * Header object for instruction files.
 */
export class InstructionsHeader extends HeaderBase {
    handleToken(token) {
        // if the record might be a "applyTo" metadata
        // add it to the list of parsed metadata records
        if (PromptApplyToMetadata.isApplyToRecord(token)) {
            const metadata = new PromptApplyToMetadata(token, this.languageId);
            this.issues.push(...metadata.validate());
            this.meta.applyTo = metadata;
            return true;
        }
        return false;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5zdHJ1Y3Rpb25zSGVhZGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvYWR2aWthci9Eb2N1bWVudHMvYXJjaGl0ZWN0L2FyY2gyL0FyY2hJREUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9jb21tb24vcHJvbXB0U3ludGF4L3BhcnNlcnMvcHJvbXB0SGVhZGVyL2luc3RydWN0aW9uc0hlYWRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUM5RCxPQUFPLEVBQUUsVUFBVSxFQUFxQyxNQUFNLGlCQUFpQixDQUFDO0FBbUJoRjs7R0FFRztBQUNILE1BQU0sT0FBTyxrQkFBbUIsU0FBUSxVQUFpQztJQUNyRCxXQUFXLENBQUMsS0FBd0I7UUFDdEQsOENBQThDO1FBQzlDLGdEQUFnRDtRQUNoRCxJQUFJLHFCQUFxQixDQUFDLGVBQWUsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQ2xELE1BQU0sUUFBUSxHQUFHLElBQUkscUJBQXFCLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQztZQUVuRSxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLFFBQVEsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDO1lBQ3pDLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxHQUFHLFFBQVEsQ0FBQztZQUU3QixPQUFPLElBQUksQ0FBQztRQUNiLENBQUM7UUFFRCxPQUFPLEtBQUssQ0FBQztJQUNkLENBQUM7Q0FDRCJ9