/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
export var NotebookExecutionType;
(function (NotebookExecutionType) {
    NotebookExecutionType[NotebookExecutionType["cell"] = 0] = "cell";
    NotebookExecutionType[NotebookExecutionType["notebook"] = 1] = "notebook";
})(NotebookExecutionType || (NotebookExecutionType = {}));
export const INotebookExecutionStateService = createDecorator('INotebookExecutionStateService');
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tFeGVjdXRpb25TdGF0ZVNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9hZHZpa2FyL0RvY3VtZW50cy9hcmNoaXRlY3QvYXJjaDIvQXJjaElERS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9ub3RlYm9vay9jb21tb24vbm90ZWJvb2tFeGVjdXRpb25TdGF0ZVNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFNaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBMEM3RixNQUFNLENBQU4sSUFBWSxxQkFHWDtBQUhELFdBQVkscUJBQXFCO0lBQ2hDLGlFQUFJLENBQUE7SUFDSix5RUFBUSxDQUFBO0FBQ1QsQ0FBQyxFQUhXLHFCQUFxQixLQUFyQixxQkFBcUIsUUFHaEM7QUEwQkQsTUFBTSxDQUFDLE1BQU0sOEJBQThCLEdBQUcsZUFBZSxDQUFpQyxnQ0FBZ0MsQ0FBQyxDQUFDIn0=