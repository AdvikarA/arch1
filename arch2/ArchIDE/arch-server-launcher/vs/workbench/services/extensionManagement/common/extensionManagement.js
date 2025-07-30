/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { createDecorator, refineServiceDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { IExtensionManagementService } from '../../../../platform/extensionManagement/common/extensionManagement.js';
export const IProfileAwareExtensionManagementService = refineServiceDecorator(IExtensionManagementService);
export var ExtensionInstallLocation;
(function (ExtensionInstallLocation) {
    ExtensionInstallLocation[ExtensionInstallLocation["Local"] = 1] = "Local";
    ExtensionInstallLocation[ExtensionInstallLocation["Remote"] = 2] = "Remote";
    ExtensionInstallLocation[ExtensionInstallLocation["Web"] = 3] = "Web";
})(ExtensionInstallLocation || (ExtensionInstallLocation = {}));
export const IExtensionManagementServerService = createDecorator('extensionManagementServerService');
export const IWorkbenchExtensionManagementService = refineServiceDecorator(IProfileAwareExtensionManagementService);
export var EnablementState;
(function (EnablementState) {
    EnablementState[EnablementState["DisabledByTrustRequirement"] = 0] = "DisabledByTrustRequirement";
    EnablementState[EnablementState["DisabledByExtensionKind"] = 1] = "DisabledByExtensionKind";
    EnablementState[EnablementState["DisabledByEnvironment"] = 2] = "DisabledByEnvironment";
    EnablementState[EnablementState["EnabledByEnvironment"] = 3] = "EnabledByEnvironment";
    EnablementState[EnablementState["DisabledByMalicious"] = 4] = "DisabledByMalicious";
    EnablementState[EnablementState["DisabledByVirtualWorkspace"] = 5] = "DisabledByVirtualWorkspace";
    EnablementState[EnablementState["DisabledByInvalidExtension"] = 6] = "DisabledByInvalidExtension";
    EnablementState[EnablementState["DisabledByAllowlist"] = 7] = "DisabledByAllowlist";
    EnablementState[EnablementState["DisabledByExtensionDependency"] = 8] = "DisabledByExtensionDependency";
    EnablementState[EnablementState["DisabledGlobally"] = 9] = "DisabledGlobally";
    EnablementState[EnablementState["DisabledWorkspace"] = 10] = "DisabledWorkspace";
    EnablementState[EnablementState["EnabledGlobally"] = 11] = "EnabledGlobally";
    EnablementState[EnablementState["EnabledWorkspace"] = 12] = "EnabledWorkspace";
})(EnablementState || (EnablementState = {}));
export const IWorkbenchExtensionEnablementService = createDecorator('extensionEnablementService');
export const IWebExtensionsScannerService = createDecorator('IWebExtensionsScannerService');
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uTWFuYWdlbWVudC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL2FkdmlrYXIvRG9jdW1lbnRzL2FyY2hpdGVjdC9hcmNoMi9BcmNoSURFL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9leHRlbnNpb25NYW5hZ2VtZW50L2NvbW1vbi9leHRlbnNpb25NYW5hZ2VtZW50LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBRSxlQUFlLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUVySCxPQUFPLEVBQUUsMkJBQTJCLEVBQXNOLE1BQU0sd0VBQXdFLENBQUM7QUFNelUsTUFBTSxDQUFDLE1BQU0sdUNBQXVDLEdBQUcsc0JBQXNCLENBQXVFLDJCQUEyQixDQUFDLENBQUM7QUFjakwsTUFBTSxDQUFOLElBQWtCLHdCQUlqQjtBQUpELFdBQWtCLHdCQUF3QjtJQUN6Qyx5RUFBUyxDQUFBO0lBQ1QsMkVBQU0sQ0FBQTtJQUNOLHFFQUFHLENBQUE7QUFDSixDQUFDLEVBSmlCLHdCQUF3QixLQUF4Qix3QkFBd0IsUUFJekM7QUFFRCxNQUFNLENBQUMsTUFBTSxpQ0FBaUMsR0FBRyxlQUFlLENBQW9DLGtDQUFrQyxDQUFDLENBQUM7QUE2QnhJLE1BQU0sQ0FBQyxNQUFNLG9DQUFvQyxHQUFHLHNCQUFzQixDQUFnRix1Q0FBdUMsQ0FBQyxDQUFDO0FBcUNuTSxNQUFNLENBQU4sSUFBa0IsZUFjakI7QUFkRCxXQUFrQixlQUFlO0lBQ2hDLGlHQUEwQixDQUFBO0lBQzFCLDJGQUF1QixDQUFBO0lBQ3ZCLHVGQUFxQixDQUFBO0lBQ3JCLHFGQUFvQixDQUFBO0lBQ3BCLG1GQUFtQixDQUFBO0lBQ25CLGlHQUEwQixDQUFBO0lBQzFCLGlHQUEwQixDQUFBO0lBQzFCLG1GQUFtQixDQUFBO0lBQ25CLHVHQUE2QixDQUFBO0lBQzdCLDZFQUFnQixDQUFBO0lBQ2hCLGdGQUFpQixDQUFBO0lBQ2pCLDRFQUFlLENBQUE7SUFDZiw4RUFBZ0IsQ0FBQTtBQUNqQixDQUFDLEVBZGlCLGVBQWUsS0FBZixlQUFlLFFBY2hDO0FBRUQsTUFBTSxDQUFDLE1BQU0sb0NBQW9DLEdBQUcsZUFBZSxDQUF1Qyw0QkFBNEIsQ0FBQyxDQUFDO0FBOEV4SSxNQUFNLENBQUMsTUFBTSw0QkFBNEIsR0FBRyxlQUFlLENBQStCLDhCQUE4QixDQUFDLENBQUMifQ==