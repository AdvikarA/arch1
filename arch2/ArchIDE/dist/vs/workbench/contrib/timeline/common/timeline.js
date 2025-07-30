/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ExtensionIdentifier } from '../../../../platform/extensions/common/extensions.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
export function toKey(extension, source) {
    return `${typeof extension === 'string' ? extension : ExtensionIdentifier.toKey(extension)}|${source}`;
}
export const TimelinePaneId = 'timeline';
const TIMELINE_SERVICE_ID = 'timeline';
export const ITimelineService = createDecorator(TIMELINE_SERVICE_ID);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGltZWxpbmUuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9hZHZpa2FyL0RvY3VtZW50cy9hcmNoaXRlY3QvYXJjaDIvQXJjaElERS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90aW1lbGluZS9jb21tb24vdGltZWxpbmUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFPaEcsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDM0YsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBSzdGLE1BQU0sVUFBVSxLQUFLLENBQUMsU0FBdUMsRUFBRSxNQUFjO0lBQzVFLE9BQU8sR0FBRyxPQUFPLFNBQVMsS0FBSyxRQUFRLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsbUJBQW1CLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxJQUFJLE1BQU0sRUFBRSxDQUFDO0FBQ3hHLENBQUM7QUFFRCxNQUFNLENBQUMsTUFBTSxjQUFjLEdBQUcsVUFBVSxDQUFDO0FBd0l6QyxNQUFNLG1CQUFtQixHQUFHLFVBQVUsQ0FBQztBQUN2QyxNQUFNLENBQUMsTUFBTSxnQkFBZ0IsR0FBRyxlQUFlLENBQW1CLG1CQUFtQixDQUFDLENBQUMifQ==