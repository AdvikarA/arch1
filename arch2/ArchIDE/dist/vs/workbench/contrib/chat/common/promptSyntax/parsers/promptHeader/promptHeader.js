/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ChatModeKind } from '../../../constants.js';
import { localize } from '../../../../../../../nls.js';
import { PromptMetadataWarning } from './diagnostics.js';
import { assert } from '../../../../../../../base/common/assert.js';
import { assertDefined } from '../../../../../../../base/common/types.js';
import { HeaderBase } from './headerBase.js';
import { PromptModelMetadata } from './metadata/model.js';
import { PromptToolsMetadata } from './metadata/tools.js';
import { PromptModeMetadata } from './metadata/mode.js';
/**
 * Header object for prompt files.
 */
export class PromptHeader extends HeaderBase {
    handleToken(token) {
        // if the record might be a "tools" metadata
        // add it to the list of parsed metadata records
        if (PromptToolsMetadata.isToolsRecord(token)) {
            const metadata = new PromptToolsMetadata(token, this.languageId);
            this.issues.push(...metadata.validate());
            this.meta.tools = metadata;
            this.validateToolsAndModeCompatibility();
            return true;
        }
        // if the record might be a "mode" metadata
        // add it to the list of parsed metadata records
        if (PromptModeMetadata.isModeRecord(token)) {
            const metadata = new PromptModeMetadata(token, this.languageId);
            this.issues.push(...metadata.validate());
            this.meta.mode = metadata;
            this.validateToolsAndModeCompatibility();
            return true;
        }
        if (PromptModelMetadata.isModelRecord(token)) {
            const metadata = new PromptModelMetadata(token, this.languageId);
            this.issues.push(...metadata.validate());
            this.meta.model = metadata;
            return true;
        }
        return false;
    }
    /**
     * Check if value of `tools` and `mode` metadata
     * are compatible with each other.
     */
    get toolsAndModeCompatible() {
        const { tools, mode } = this.meta;
        // if 'tools' is not set, then the mode metadata
        // can have any value so skip the validation
        if (tools === undefined) {
            return true;
        }
        // if 'mode' is not set or invalid it will be ignored,
        // therefore treat it as if it was not set
        if (mode?.value === undefined) {
            return true;
        }
        // when mode is set, valid, and tools are present,
        // the only valid value for the mode is 'agent'
        return (mode.value === ChatModeKind.Agent);
    }
    /**
     * Validate that the `tools` and `mode` metadata are compatible
     * with each other. If not, add a warning diagnostic.
     */
    validateToolsAndModeCompatibility() {
        if (this.toolsAndModeCompatible === true) {
            return;
        }
        const { tools, mode } = this.meta;
        // sanity checks on the behavior of the `toolsAndModeCompatible` getter
        assertDefined(tools, 'Tools metadata must have been present.');
        assertDefined(mode, 'Mode metadata must have been present.');
        assert(mode.value !== ChatModeKind.Agent, 'Mode metadata must not be agent mode.');
        this.issues.push(new PromptMetadataWarning(tools.range, localize('prompt.header.metadata.mode.diagnostics.incompatible-with-tools', "Tools can only be used when in 'agent' mode, but the mode is set to '{0}'. The tools will be ignored.", mode.value)));
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvbXB0SGVhZGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvYWR2aWthci9Eb2N1bWVudHMvYXJjaGl0ZWN0L2FyY2gyL0FyY2hJREUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9jb21tb24vcHJvbXB0U3ludGF4L3BhcnNlcnMvcHJvbXB0SGVhZGVyL3Byb21wdEhlYWRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFDckQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBQ3ZELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLGtCQUFrQixDQUFDO0FBQ3pELE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUNwRSxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFFMUUsT0FBTyxFQUFFLFVBQVUsRUFBcUMsTUFBTSxpQkFBaUIsQ0FBQztBQUdoRixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQztBQUMxRCxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQztBQUMxRCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQTJCeEQ7O0dBRUc7QUFDSCxNQUFNLE9BQU8sWUFBYSxTQUFRLFVBQTJCO0lBQ3pDLFdBQVcsQ0FBQyxLQUF3QjtRQUN0RCw0Q0FBNEM7UUFDNUMsZ0RBQWdEO1FBQ2hELElBQUksbUJBQW1CLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDOUMsTUFBTSxRQUFRLEdBQUcsSUFBSSxtQkFBbUIsQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDO1lBRWpFLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEdB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