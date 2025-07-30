/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
/**
 * Diagnostics object that hold information about some issue
 * related to the prompt header metadata.
 */
export class PromptMetadataDiagnostic {
    constructor(range, message) {
        this.range = range;
        this.message = message;
    }
}
/**
 * Diagnostics object that hold information about some
 * non-fatal issue related to the prompt header metadata.
 */
export class PromptMetadataWarning extends PromptMetadataDiagnostic {
    toString() {
        return `warning(${this.message})${this.range}`;
    }
}
/**
 * Diagnostics object that hold information about some
 * fatal issue related to the prompt header metadata.
 */
export class PromptMetadataError extends PromptMetadataDiagnostic {
    toString() {
        return `error(${this.message})${this.range}`;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlhZ25vc3RpY3MuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9hZHZpa2FyL0RvY3VtZW50cy9hcmNoaXRlY3QvYXJjaDIvQXJjaElERS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2NvbW1vbi9wcm9tcHRTeW50YXgvcGFyc2Vycy9wcm9tcHRIZWFkZXIvZGlhZ25vc3RpY3MudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFTaEc7OztHQUdHO0FBQ0gsTUFBTSxPQUFnQix3QkFBd0I7SUFDN0MsWUFDaUIsS0FBWSxFQUNaLE9BQWU7UUFEZixVQUFLLEdBQUwsS0FBSyxDQUFPO1FBQ1osWUFBTyxHQUFQLE9BQU8sQ0FBUTtJQUM1QixDQUFDO0NBTUw7QUFFRDs7O0dBR0c7QUFDSCxNQUFNLE9BQU8scUJBQXNCLFNBQVEsd0JBQXdCO0lBQ2xELFFBQVE7UUFDdkIsT0FBTyxXQUFXLElBQUksQ0FBQyxPQUFPLElBQUksSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO0lBQ2hELENBQUM7Q0FDRDtBQUVEOzs7R0FHRztBQUNILE1BQU0sT0FBTyxtQkFBb0IsU0FBUSx3QkFBd0I7SUFDaEQsUUFBUTtRQUN2QixPQUFPLFNBQVMsSUFBSSxDQUFDLE9BQU8sSUFBSSxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7SUFDOUMsQ0FBQztDQUNEIn0=