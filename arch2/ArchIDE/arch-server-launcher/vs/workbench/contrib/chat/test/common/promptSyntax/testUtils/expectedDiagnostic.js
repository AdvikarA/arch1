/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { assertNever } from '../../../../../../../base/common/assert.js';
import { PromptMetadataDiagnostic, PromptMetadataError, PromptMetadataWarning } from '../../../../common/promptSyntax/parsers/promptHeader/diagnostics.js';
/**
 * Base class for all expected diagnostics used in the unit tests.
 */
class ExpectedDiagnostic extends PromptMetadataDiagnostic {
    /**
     * Validate that the provided diagnostic is equal to this object.
     */
    validateEqual(other) {
        this.validateTypesEqual(other);
        assert.strictEqual(this.message, other.message, `Expected message '${this.message}', got '${other.message}'.`);
        assert(this.range
            .equalsRange(other.range), `Expected range '${this.range}', got '${other.range}'.`);
    }
    /**
     * Validate that the provided diagnostic is of the same
     * diagnostic type as this object.
     */
    validateTypesEqual(other) {
        if (other instanceof PromptMetadataWarning) {
            assert(this instanceof ExpectedDiagnosticWarning, `Expected a warning diagnostic object, got '${other}'.`);
            return;
        }
        if (other instanceof PromptMetadataError) {
            assert(this instanceof ExpectedDiagnosticError, `Expected a error diagnostic object, got '${other}'.`);
            return;
        }
        assertNever(other, `Unknown diagnostic type '${other}'.`);
    }
}
/**
 * Expected warning diagnostic object for testing purposes.
 */
export class ExpectedDiagnosticWarning extends ExpectedDiagnostic {
    /**
     * Returns a string representation of this object.
     */
    toString() {
        return `expected-diagnostic/warning(${this.message})${this.range}`;
    }
}
/**
 * Expected error diagnostic object for testing purposes.
 */
export class ExpectedDiagnosticError extends ExpectedDiagnostic {
    /**
     * Returns a string representation of this object.
     */
    toString() {
        return `expected-diagnostic/error(${this.message})${this.range}`;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXhwZWN0ZWREaWFnbm9zdGljLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvYWR2aWthci9Eb2N1bWVudHMvYXJjaGl0ZWN0L2FyY2gyL0FyY2hJREUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC90ZXN0L2NvbW1vbi9wcm9tcHRTeW50YXgvdGVzdFV0aWxzL2V4cGVjdGVkRGlhZ25vc3RpYy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQ3pFLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxtQkFBbUIsRUFBRSxxQkFBcUIsRUFBZSxNQUFNLHFFQUFxRSxDQUFDO0FBRXhLOztHQUVHO0FBQ0gsTUFBZSxrQkFBbUIsU0FBUSx3QkFBd0I7SUFDakU7O09BRUc7SUFDSSxhQUFhLENBQUMsS0FBa0I7UUFDdEMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLEtBQUssQ0FBQyxDQUFDO1FBRS9CLE1BQU0sQ0FBQyxXQUFXLENBQ2pCLElBQUksQ0FBQyxPQUFPLEVBQ1osS0FBSyxDQUFDLE9BQU8sRUFDYixxQkFBcUIsSUFBSSxDQUFDLE9BQU8sV0FBVyxLQUFLLENBQUMsT0FBTyxJQUFJLENBQzdELENBQUM7UUFFRixNQUFNLENBQ0wsSUFBSSxDQUFDLEtBQUs7YUFDUixXQUFXLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxFQUMxQixtQkFBbUIsSUFBSSxDQUFDLEtBQUssV0FBVyxLQUFLLENBQUMsS0FBSyxJQUFJLENBQ3ZELENBQUM7SUFDSCxDQUFDO0lBRUQ7OztPQUdHO0lBQ0ssa0JBQWtCLENBQUMsS0FBa0I7UUFDNUMsSUFBSSxLQUFLLFlBQVkscUJBQXFCLEVBQUUsQ0FBQztZQUM1QyxNQUFNLENBQ0wsSUFBSSxZQUFZLHlCQUF5QixFQUN6Qyw4Q0FBOEMsS0FBSyxJQUFJLENBQ3ZELENBQUM7WUFFRixPQUFPO1FBQ1IsQ0FBQztRQUVELElBQUksS0FBSyxZQUFZLG1CQUFtQixFQUFFLENBQUM7WUFDMUMsTUFBTSxDQUNMLElBQUksWUFBWSx1QkFBdUIsRUFDdkMsNENBQTRDLEtBQUssSUFBSSxDQUNyRCxDQUFDO1lBRUYsT0FBTztRQUNSLENBQUM7UUFFRCxXQUFXLENBQ1YsS0FBSyxFQUNMLDRCQUE0QixLQUFLLElBQUksQ0FDckMsQ0FBQztJQUNILENBQUM7Q0FDRDtBQUVEOztHQUVHO0FBQ0gsTUFBTSxPQUFPLHlCQUEwQixTQUFRLGtCQUFrQjtJQUNoRTs7T0FFRztJQUNhLFFBQVE7UUFDdkIsT0FBTywrQkFBK0IsSUFBSSxDQUFDLE9BQU8sSUFBSSxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7SUFDcEUsQ0FBQztDQUNEO0FBRUQ7O0dBRUc7QUFDSCxNQUFNLE9BQU8sdUJBQXdCLFNBQVEsa0JBQWtCO0lBQzlEOztPQUVHO0lBQ2EsUUFBUTtRQUN2QixPQUFPLDZCQUE2QixJQUFJLENBQUMsT0FBTyxJQUFJLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztJQUNsRSxDQUFDO0NBQ0QifQ==