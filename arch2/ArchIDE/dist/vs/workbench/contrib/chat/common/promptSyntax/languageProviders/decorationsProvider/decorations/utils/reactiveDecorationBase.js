/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { DecorationBase } from './decorationBase.js';
/**
 * Base class for all reactive editor decorations. A reactive decoration
 * is a decoration that can change its appearance based on current cursor
 * position in the editor, hence can "react" to the user's actions.
 */
export class ReactiveDecorationBase extends DecorationBase {
    /**
     * Whether the decoration has changed since the last {@link change}.
     */
    get changed() {
        // if any of the child decorators changed, this object is also
        // considered to be changed
        for (const marker of this.childDecorators) {
            if ((marker instanceof ReactiveDecorationBase) === false) {
                continue;
            }
            if (marker.changed === true) {
                return true;
            }
        }
        return this.didChange;
    }
    constructor(accessor, token) {
        super(accessor, token);
        /**
         * Private field for the {@link changed} property.
         */
        this.didChange = true;
        this.childDecorators = [];
    }
    /**
     * Whether cursor is currently inside the decoration range.
     */
    get active() {
        return true;
        /**
         * Temporarily disable until we have a proper way to get
         * the cursor position inside active editor.
         */
        /**
         * if (!this.cursorPosition) {
         * 	return false;
         * }
         *
         * // when cursor is at the end of a range, the range considered to
         * // not contain the position, but we want to include it
         * const atEnd = (this.range.endLineNumber === this.cursorPosition.lineNumber)
         * 	&& (this.range.endColumn === this.cursorPosition.column);
         *
         * return atEnd || this.range.containsPosition(this.cursorPosition);
         */
    }
    /**
     * Set cursor position and update {@link changed} property if needed.
     */
    setCursorPosition(position) {
        if (this.cursorPosition === position) {
            return false;
        }
        if (this.cursorPosition && position) {
            if (this.cursorPosition.equals(position)) {
                return false;
            }
        }
        const wasActive = this.active;
        this.cursorPosition = position;
        this.didChange = (wasActive !== this.active);
        return this.changed;
    }
    change(accessor) {
        if (this.didChange === false) {
            return this;
        }
        super.change(accessor);
        this.didChange = false;
        for (const marker of this.childDecorators) {
            marker.change(accessor);
        }
        return this;
    }
    remove(accessor) {
        super.remove(accessor);
        for (const marker of this.childDecorators) {
            marker.remove(accessor);
        }
        return this;
    }
    get className() {
        return (this.active)
            ? this.classNames.Main
            : this.classNames.MainInactive;
    }
    get inlineClassName() {
        return (this.active)
            ? this.classNames.Inline
            : this.classNames.InlineInactive;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVhY3RpdmVEZWNvcmF0aW9uQmFzZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL2FkdmlrYXIvRG9jdW1lbnRzL2FyY2hpdGVjdC9hcmNoMi9BcmNoSURFL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvY29tbW9uL3Byb21wdFN5bnRheC9sYW5ndWFnZVByb3ZpZGVycy9kZWNvcmF0aW9uc1Byb3ZpZGVyL2RlY29yYXRpb25zL3V0aWxzL3JlYWN0aXZlRGVjb3JhdGlvbkJhc2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHFCQUFxQixDQUFDO0FBS3JEOzs7O0dBSUc7QUFDSCxNQUFNLE9BQWdCLHNCQUdwQixTQUFRLGNBQTJDO0lBYXBEOztPQUVHO0lBQ0gsSUFBVyxPQUFPO1FBQ2pCLDhEQUE4RDtRQUM5RCwyQkFBMkI7UUFDM0IsS0FBSyxNQUFNLE1BQU0sSUFBSSxJQUFJLENBQUMsZUFBZSxFQUFFLENBQUM7WUFDM0MsSUFBSSxDQUFDLE1BQU0sWUFBWSxzQkFBc0IsQ0FBQyxLQUFLLEtBQUssRUFBRSxDQUFDO2dCQUMxRCxTQUFTO1lBQ1YsQ0FBQztZQUVELElBQUksTUFBTSxDQUFDLE9BQU8sS0FBSyxJQUFJLEVBQUUsQ0FBQztnQkFDN0IsT0FBTyxJQUFJLENBQUM7WUFDYixDQUFDO1FBQ0YsQ0FBQztRQUVELE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQztJQUN2QixDQUFDO0lBRUQsWUFDQyxRQUFzQixFQUN0QixLQUFtQjtRQUVuQixLQUFLLENBQUMsUUFBUSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBVXhCOztXQUVHO1FBQ0ssY0FBUyxHQUFHLElBQUksQ0FBQztRQVh4QixJQUFJLENBQUMsZUFBZSxHQUFHLEVBQUUsQ0FBQztJQUMzQixDQUFDO0lBWUQ7O09BRUc7SUFDSCxJQUFjLE1BQU07UUFDbkIsT0FBTyxJQUFJLENBQUM7UUFFWjs7O1dBR0c7UUFDSDs7Ozs7Ozs7Ozs7V0FXRztJQUNKLENBQUM7SUFFRDs7T0FFRztJQUNJLGlCQUFpQixDQUN2QixRQUFxQztRQUVyQyxJQUFJLElBQUksQ0FBQyxjQUFjLEtBQUssUUFBUSxFQUFFLENBQUM7WUFDdEMsT0FBTyxLQUFLLENBQUM7UUFDZCxDQUFDO1FBRUQsSUFBSSxJQUFJLENBQUMsY0FBYyxJQUFJLFFBQVEsRUFBRSxDQUFDO1lBQ3JDLElBQUksSUFBSSxDQUFDLGNBQWMsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQztnQkFDMUMsT0FBTyxLQUFLLENBQUM7WUFDZCxDQUFDO1FBQ0YsQ0FBQztRQUVELE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUM7UUFDOUIsSUFBSSxDQUFDLGNBQWMsR0FBRyxRQUFRLENBQUM7UUFDL0IsSUFBSSxDQUFDLFNBQVMsR0FBRyxDQUFDLFNBQVMsS0FBSyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7UUFFN0MsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDO0lBQ3JCLENBQUM7SUFFZSxNQUFNLENBQ3JCLFFBQXlCO1FBRXpCLElBQUksSUFBSSxDQUFDLFNBQVMsS0FBSyxLQUFLLEVBQUUsQ0FBQztZQUM5QixPQUFPLElBQUksQ0FBQztRQUNiLENBQUM7UUFFRCxLQUFLLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQ3ZCLElBQUksQ0FBQyxTQUFTLEdBQUcsS0FBSyxDQUFDO1FBRXZCLEtBQUssTUFBTSxNQUFNLElBQUksSUFBSSxDQUFDLGVBQWUsRUFBRSxDQUFDO1lBQzNDLE1BQU0sQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDekIsQ0FBQztRQUVELE9BQU8sSUFBSSxDQUFDO0lBQ2IsQ0FBQztJQUVlLE1BQU0sQ0FDckIsUUFBeUI7UUFFekIsS0FBSyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUV2QixLQUFLLE1BQU0sTUFBTSxJQUFJLElBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQztZQUMzQyxNQUFNLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQ3pCLENBQUM7UUFFRCxPQUFPLElBQUksQ0FBQztJQUNiLENBQUM7SUFFRCxJQUF1QixTQUFTO1FBQy9CLE9BQU8sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDO1lBQ25CLENBQUMsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUk7WUFDdEIsQ0FBQyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsWUFBWSxDQUFDO0lBQ2pDLENBQUM7SUFFRCxJQUF1QixlQUFlO1FBQ3JDLE9BQU8sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDO1lBQ25CLENBQUMsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU07WUFDeEIsQ0FBQyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsY0FBYyxDQUFDO0lBQ25DLENBQUM7Q0FDRCJ9