/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { createDecorator } from '../../instantiation/common/instantiation.js';
export var PackageType;
(function (PackageType) {
    PackageType["NODE"] = "npm";
    PackageType["DOCKER"] = "docker";
    PackageType["PYTHON"] = "pypi";
    PackageType["NUGET"] = "nuget";
    PackageType["REMOTE"] = "remote";
})(PackageType || (PackageType = {}));
export const IMcpGalleryService = createDecorator('IMcpGalleryService');
export const IMcpManagementService = createDecorator('IMcpManagementService');
export const IAllowedMcpServersService = createDecorator('IAllowedMcpServersService');
export const mcpEnabledConfig = 'chat.mcp.enabled';
export const mcpGalleryServiceUrlConfig = 'chat.mcp.gallery.serviceUrl';
export const mcpAutoStartConfig = 'chat.mcp.autostart';
export var McpAutoStartValue;
(function (McpAutoStartValue) {
    McpAutoStartValue["Never"] = "never";
    McpAutoStartValue["OnlyNew"] = "onlyNew";
    McpAutoStartValue["NewAndOutdated"] = "newAndOutdated";
})(McpAutoStartValue || (McpAutoStartValue = {}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWNwTWFuYWdlbWVudC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL2FkdmlrYXIvRG9jdW1lbnRzL2FyY2hpdGVjdC9hcmNoMi9BcmNoSURFL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL21jcC9jb21tb24vbWNwTWFuYWdlbWVudC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQU9oRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUE0RDlFLE1BQU0sQ0FBTixJQUFrQixXQU1qQjtBQU5ELFdBQWtCLFdBQVc7SUFDNUIsMkJBQVksQ0FBQTtJQUNaLGdDQUFpQixDQUFBO0lBQ2pCLDhCQUFlLENBQUE7SUFDZiw4QkFBZSxDQUFBO0lBQ2YsZ0NBQWlCLENBQUE7QUFDbEIsQ0FBQyxFQU5pQixXQUFXLEtBQVgsV0FBVyxRQU01QjtBQTBERCxNQUFNLENBQUMsTUFBTSxrQkFBa0IsR0FBRyxlQUFlLENBQXFCLG9CQUFvQixDQUFDLENBQUM7QUFrRDVGLE1BQU0sQ0FBQyxNQUFNLHFCQUFxQixHQUFHLGVBQWUsQ0FBd0IsdUJBQXVCLENBQUMsQ0FBQztBQWdCckcsTUFBTSxDQUFDLE1BQU0seUJBQXlCLEdBQUcsZUFBZSxDQUE0QiwyQkFBMkIsQ0FBQyxDQUFDO0FBUWpILE1BQU0sQ0FBQyxNQUFNLGdCQUFnQixHQUFHLGtCQUFrQixDQUFDO0FBQ25ELE1BQU0sQ0FBQyxNQUFNLDBCQUEwQixHQUFHLDZCQUE2QixDQUFDO0FBQ3hFLE1BQU0sQ0FBQyxNQUFNLGtCQUFrQixHQUFHLG9CQUFvQixDQUFDO0FBRXZELE1BQU0sQ0FBTixJQUFrQixpQkFJakI7QUFKRCxXQUFrQixpQkFBaUI7SUFDbEMsb0NBQWUsQ0FBQTtJQUNmLHdDQUFtQixDQUFBO0lBQ25CLHNEQUFpQyxDQUFBO0FBQ2xDLENBQUMsRUFKaUIsaUJBQWlCLEtBQWpCLGlCQUFpQixRQUlsQyJ9