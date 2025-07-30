/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { LineReplacement } from '../../../../../common/core/edits/lineEdit.js';
import { LineRange } from '../../../../../common/core/ranges/lineRange.js';
export class InlineEditWithChanges {
    get lineEdit() {
        return LineReplacement.fromSingleTextEdit(this.edit.toReplacement(this.originalText), this.originalText);
    }
    get originalLineRange() { return this.lineEdit.lineRange; }
    get modifiedLineRange() { return this.lineEdit.toLineEdit().getNewLineRanges()[0]; }
    get displayRange() {
        return this.originalText.lineRange.intersect(this.originalLineRange.join(LineRange.ofLength(this.originalLineRange.startLineNumber, this.lineEdit.newLines.length)));
    }
    constructor(originalText, edit, cursorPosition, commands, inlineCompletion) {
        this.originalText = originalText;
        this.edit = edit;
        this.cursorPosition = cursorPosition;
        this.commands = commands;
        this.inlineCompletion = inlineCompletion;
    }
    equals(other) {
        return this.originalText.getValue() === other.originalText.getValue() &&
            this.edit.equals(other.edit) &&
            this.cursorPosition.equals(other.cursorPosition) &&
            this.commands === other.commands &&
            this.inlineCompletion === other.inlineCompletion;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5saW5lRWRpdFdpdGhDaGFuZ2VzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvYWR2aWthci9Eb2N1bWVudHMvYXJjaGl0ZWN0L2FyY2gyL0FyY2hJREUvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvaW5saW5lQ29tcGxldGlvbnMvYnJvd3Nlci92aWV3L2lubGluZUVkaXRzL2lubGluZUVkaXRXaXRoQ2hhbmdlcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sOENBQThDLENBQUM7QUFDL0UsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBTzNFLE1BQU0sT0FBTyxxQkFBcUI7SUFDakMsSUFBVyxRQUFRO1FBQ2xCLE9BQU8sZUFBZSxDQUFDLGtCQUFrQixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsRUFBRSxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUM7SUFDMUcsQ0FBQztJQUVELElBQVcsaUJBQWlCLEtBQUssT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUM7SUFDbEUsSUFBVyxpQkFBaUIsS0FBSyxPQUFPLElBQUksQ0FBQyxRQUFRLENBQUMsVUFBVSxFQUFFLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFFM0YsSUFBVyxZQUFZO1FBQ3RCLE9BQU8sSUFBSSxDQUFDLFlBQVksQ0FBQyxTQUFTLENBQUMsU0FBUyxDQUMzQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUMxQixTQUFTLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxlQUFlLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQ3pGLENBQ0EsQ0FBQztJQUNKLENBQUM7SUFFRCxZQUNpQixZQUEwQixFQUMxQixJQUFjLEVBQ2QsY0FBd0IsRUFDeEIsUUFBNEMsRUFDNUMsZ0JBQXNDO1FBSnRDLGlCQUFZLEdBQVosWUFBWSxDQUFjO1FBQzFCLFNBQUksR0FBSixJQUFJLENBQVU7UUFDZCxtQkFBYyxHQUFkLGNBQWMsQ0FBVTtRQUN4QixhQUFRLEdBQVIsUUFBUSxDQUFvQztRQUM1QyxxQkFBZ0IsR0FBaEIsZ0JBQWdCLENBQXNCO0lBRXZELENBQUM7SUFFRCxNQUFNLENBQUMsS0FBNEI7UUFDbEMsT0FBTyxJQUFJLENBQUMsWUFBWSxDQUFDLFFBQVEsRUFBRSxLQUFLLEtBQUssQ0FBQyxZQUFZLENBQUMsUUFBUSxFQUFFO1lBQ3BFLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUM7WUFDNUIsSUFBSSxDQUFDLGNBQWMsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQztZQUNoRCxJQUFJLENBQUMsUUFBUSxLQUFLLEtBQUssQ0FBQyxRQUFRO1lBQ2hDLElBQUksQ0FBQyxnQkFBZ0IsS0FBSyxLQUFLLENBQUMsZ0JBQWdCLENBQUM7SUFDbkQsQ0FBQztDQUNEIn0=