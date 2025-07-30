/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ModelDecorationOptions } from '../../../../../../../../../editor/common/model/textModel.js';
/**
 * Base class for all editor decorations.
 */
export class DecorationBase {
    /**
     * Indicates whether the decoration spans the whole line(s).
     */
    get isWholeLine() {
        return false;
    }
    /**
     * Hover message of the decoration.
     */
    get hoverMessage() {
        return null;
    }
    constructor(accessor, token) {
        this.token = token;
        this.id = accessor.addDecoration(this.range, this.decorationOptions);
    }
    /**
     * Range of the decoration.
     */
    get range() {
        return this.token.range;
    }
    /**
     * Changes the decoration in the editor.
     */
    change(accessor) {
        accessor.changeDecorationOptions(this.id, this.decorationOptions);
        return this;
    }
    /**
     * Removes associated editor decoration(s).
     */
    remove(accessor) {
        accessor.removeDecoration(this.id);
        return this;
    }
    /**
     * Get editor decoration options for this decorator.
     */
    get decorationOptions() {
        return ModelDecorationOptions.createDynamic({
            description: this.description,
            hoverMessage: this.hoverMessage,
            className: this.className,
            inlineClassName: this.inlineClassName,
            isWholeLine: this.isWholeLine,
            stickiness: 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */,
            shouldFillLineOnLineBreak: true,
        });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVjb3JhdGlvbkJhc2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9hZHZpa2FyL0RvY3VtZW50cy9hcmNoaXRlY3QvYXJjaDIvQXJjaElERS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2NvbW1vbi9wcm9tcHRTeW50YXgvbGFuZ3VhZ2VQcm92aWRlcnMvZGVjb3JhdGlvbnNQcm92aWRlci9kZWNvcmF0aW9ucy91dGlscy9kZWNvcmF0aW9uQmFzZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQU9oRyxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSw2REFBNkQsQ0FBQztBQUVyRzs7R0FFRztBQUNILE1BQU0sT0FBZ0IsY0FBYztJQW1CbkM7O09BRUc7SUFDSCxJQUFjLFdBQVc7UUFDeEIsT0FBTyxLQUFLLENBQUM7SUFDZCxDQUFDO0lBRUQ7O09BRUc7SUFDSCxJQUFjLFlBQVk7UUFDekIsT0FBTyxJQUFJLENBQUM7SUFDYixDQUFDO0lBT0QsWUFDQyxRQUFzQixFQUNILEtBQW1CO1FBQW5CLFVBQUssR0FBTCxLQUFLLENBQWM7UUFFdEMsSUFBSSxDQUFDLEVBQUUsR0FBRyxRQUFRLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLGlCQUFpQixDQUFDLENBQUM7SUFDdEUsQ0FBQztJQUVEOztPQUVHO0lBQ0gsSUFBVyxLQUFLO1FBQ2YsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQztJQUN6QixDQUFDO0lBRUQ7O09BRUc7SUFDSSxNQUFNLENBQ1osUUFBeUI7UUFFekIsUUFBUSxDQUFDLHVCQUF1QixDQUMvQixJQUFJLENBQUMsRUFBRSxFQUNQLElBQUksQ0FBQyxpQkFBaUIsQ0FDdEIsQ0FBQztRQUVGLE9BQU8sSUFBSSxDQUFDO0lBQ2IsQ0FBQztJQUVEOztPQUVHO0lBQ0ksTUFBTSxDQUNaLFFBQXlCO1FBRXpCLFFBQVEsQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUM7UUFFbkMsT0FBTyxJQUFJLENBQUM7SUFDYixDQUFDO0lBRUQ7O09BRUc7SUFDSCxJQUFZLGlCQUFpQjtRQUM1QixPQUFPLHNCQUFzQixDQUFDLGFBQWEsQ0FBQztZQUMzQyxXQUFXLEVBQUUsSUFBSSxDQUFDLFdBQVc7WUFDN0IsWUFBWSxFQUFFLElBQUksQ0FBQyxZQUFZO1lBQy9CLFNBQVMsRUFBRSxJQUFJLENBQUMsU0FBUztZQUN6QixlQUFlLEVBQUUsSUFBSSxDQUFDLGVBQWU7WUFDckMsV0FBVyxFQUFFLElBQUksQ0FBQyxXQUFXO1lBQzdCLFVBQVUsNERBQW9EO1lBQzlELHlCQUF5QixFQUFFLElBQUk7U0FDL0IsQ0FBQyxDQUFDO0lBQ0osQ0FBQztDQUNEIn0=