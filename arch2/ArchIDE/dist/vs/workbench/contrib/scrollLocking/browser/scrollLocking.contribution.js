/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { registerWorkbenchContribution2 } from '../../../common/contributions.js';
import { SyncScroll as ScrollLocking } from './scrollLocking.js';
registerWorkbenchContribution2(ScrollLocking.ID, ScrollLocking, 4 /* WorkbenchPhase.Eventually */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2Nyb2xsTG9ja2luZy5jb250cmlidXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9hZHZpa2FyL0RvY3VtZW50cy9hcmNoaXRlY3QvYXJjaDIvQXJjaElERS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9zY3JvbGxMb2NraW5nL2Jyb3dzZXIvc2Nyb2xsTG9ja2luZy5jb250cmlidXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFrQiw4QkFBOEIsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ2xHLE9BQU8sRUFBRSxVQUFVLElBQUksYUFBYSxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFFakUsOEJBQThCLENBQzdCLGFBQWEsQ0FBQyxFQUFFLEVBQ2hCLGFBQWEsb0NBRWIsQ0FBQyJ9