/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { PromptMetadataRecord } from './base/record.js';
import { localize } from '../../../../../../../../nls.js';
import { PromptMetadataError, PromptMetadataWarning } from '../diagnostics.js';
import { FrontMatterSequence } from '../../../codecs/base/frontMatterCodec/tokens/frontMatterSequence.js';
import { FrontMatterArray, FrontMatterRecord, FrontMatterString } from '../../../codecs/base/frontMatterCodec/tokens/index.js';
/**
 * Name of the metadata record in the prompt header.
 */
const RECORD_NAME = 'tools';
/**
 * Prompt `tools` metadata record inside the prompt header.
 */
export class PromptToolsMetadata extends PromptMetadataRecord {
    /**
     * List of all valid tool names that were found in
     * this metadata record.
     */
    get value() {
        if (this.validToolNames === undefined) {
            return [];
        }
        return [...this.validToolNames.keys()];
    }
    get recordName() {
        return RECORD_NAME;
    }
    constructor(recordToken, languageId) {
        super(RECORD_NAME, recordToken, languageId);
    }
    /**
     * Validate the metadata record and collect all issues
     * related to its content.
     */
    validate() {
        const { valueToken } = this.recordToken;
        // validate that the record value is an array
        if ((valueToken instanceof FrontMatterArray) === false) {
            this.issues.push(new PromptMetadataError(valueToken.range, localize('prompt.header.metadata.tools.diagnostics.invalid-value-type', "Must be an array of tool names, got '{0}'.", valueToken.valueTypeName.toString())));
            delete this.valueToken;
            return this.issues;
        }
        this.valueToken = valueToken;
        // validate that all array items
        this.validToolNames = new Map();
        for (const item of this.valueToken.items) {
            this.issues.push(...this.validateToolName(item, this.validToolNames));
        }
        return this.issues;
    }
    getToolRange(toolName) {
        return this.validToolNames?.get(toolName);
    }
    /**
     * Validate an individual provided value token that is used
     * for a tool name.
     */
    validateToolName(valueToken, validToolNames) {
        const issues = [];
        // tool name must be a quoted or an unquoted 'string'
        if ((valueToken instanceof FrontMatterString) === false &&
            (valueToken instanceof FrontMatterSequence) === false) {
            issues.push(new PromptMetadataWarning(valueToken.range, localize('prompt.header.metadata.tools.diagnostics.invalid-tool-name-type', "Unexpected tool name '{0}', expected a string literal.", valueToken.text)));
            return issues;
        }
        const cleanToolName = valueToken.cleanText.trim();
        // the tool name should not be empty
        if (cleanToolName.length === 0) {
            issues.push(new PromptMetadataWarning(valueToken.range, localize('prompt.header.metadata.tools.diagnostics.empty-tool-name', "Tool name cannot be empty.")));
            return issues;
        }
        // the tool name should not be duplicated
        if (validToolNames.has(cleanToolName)) {
            issues.push(new PromptMetadataWarning(valueToken.range, localize('prompt.header.metadata.tools.diagnostics.duplicate-tool-name', "Duplicate tool name '{0}'.", cleanToolName)));
            return issues;
        }
        validToolNames.set(cleanToolName, valueToken.range);
        return issues;
    }
    /**
     * Check if a provided front matter token is a metadata record
     * with name equal to `tools`.
     */
    static isToolsRecord(token) {
        if ((token instanceof FrontMatterRecord) === false) {
            return false;
        }
        if (token.nameToken.text === RECORD_NAME) {
            return true;
        }
        return false;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidG9vbHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9hZHZpa2FyL0RvY3VtZW50cy9hcmNoaXRlY3QvYXJjaDIvQXJjaElERS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2NvbW1vbi9wcm9tcHRTeW50YXgvcGFyc2Vycy9wcm9tcHRIZWFkZXIvbWV0YWRhdGEvdG9vbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sa0JBQWtCLENBQUM7QUFDeEQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQzFELE9BQU8sRUFBNEIsbUJBQW1CLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxtQkFBbUIsQ0FBQztBQUN6RyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxxRUFBcUUsQ0FBQztBQUMxRyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsaUJBQWlCLEVBQUUsaUJBQWlCLEVBQTJDLE1BQU0sdURBQXVELENBQUM7QUFHeEs7O0dBRUc7QUFDSCxNQUFNLFdBQVcsR0FBRyxPQUFPLENBQUM7QUFFNUI7O0dBRUc7QUFDSCxNQUFNLE9BQU8sbUJBQW9CLFNBQVEsb0JBQThCO0lBRXRFOzs7T0FHRztJQUNILElBQW9CLEtBQUs7UUFDeEIsSUFBSSxJQUFJLENBQUMsY0FBYyxLQUFLLFNBQVMsRUFBRSxDQUFDO1lBQ3ZDLE9BQU8sRUFBRSxDQUFDO1FBQ1gsQ0FBQztRQUVELE9BQU8sQ0FBQyxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQztJQUN4QyxDQUFDO0lBRUQsSUFBb0IsVUFBVTtRQUM3QixPQUFPLFdBQVcsQ0FBQztJQUNwQixDQUFDO0lBZUQsWUFDQyxXQUE4QixFQUM5QixVQUFrQjtRQUVsQixLQUFLLENBQUMsV0FBVyxFQUFFLFdBQVcsRUFBRSxVQUFVLENBQUMsQ0FBQztJQUM3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