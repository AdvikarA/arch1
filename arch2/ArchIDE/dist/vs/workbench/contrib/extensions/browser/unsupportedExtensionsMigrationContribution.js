/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { IExtensionGalleryService, IGlobalExtensionEnablementService } from '../../../../platform/extensionManagement/common/extensionManagement.js';
import { IExtensionStorageService } from '../../../../platform/extensionManagement/common/extensionStorage.js';
import { migrateUnsupportedExtensions } from '../../../../platform/extensionManagement/common/unsupportedExtensionsMigration.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IExtensionManagementServerService } from '../../../services/extensionManagement/common/extensionManagement.js';
let UnsupportedExtensionsMigrationContrib = class UnsupportedExtensionsMigrationContrib {
    constructor(extensionManagementServerService, extensionGalleryService, extensionStorageService, extensionEnablementService, logService) {
        // Unsupported extensions are not migrated for local extension management server, because it is done in shared process
        if (extensionManagementServerService.remoteExtensionManagementServer) {
            migrateUnsupportedExtensions(extensionManagementServerService.remoteExtensionManagementServer.extensionManagementService, extensionGalleryService, extensionStorageService, extensionEnablementService, logService);
        }
        if (extensionManagementServerService.webExtensionManagementServer) {
            migrateUnsupportedExtensions(extensionManagementServerService.webExtensionManagementServer.extensionManagementService, extensionGalleryService, extensionStorageService, extensionEnablementService, logService);
        }
    }
};
UnsupportedExtensionsMigrationContrib = __decorate([
    __param(0, IExtensionManagementServerService),
    __param(1, IExtensionGalleryService),
    __param(2, IExtensionStorageService),
    __param(3, IGlobalExtensionEnablementService),
    __param(4, ILogService)
], UnsupportedExtensionsMigrationContrib);
export { UnsupportedExtensionsMigrationContrib };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidW5zdXBwb3J0ZWRFeHRlbnNpb25zTWlncmF0aW9uQ29udHJpYnV0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvYWR2aWthci9Eb2N1bWVudHMvYXJjaGl0ZWN0L2FyY2gyL0FyY2hJREUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvZXh0ZW5zaW9ucy9icm93c2VyL3Vuc3VwcG9ydGVkRXh0ZW5zaW9uc01pZ3JhdGlvbkNvbnRyaWJ1dGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsaUNBQWlDLEVBQUUsTUFBTSx3RUFBd0UsQ0FBQztBQUNySixPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxxRUFBcUUsQ0FBQztBQUMvRyxPQUFPLEVBQUUsNEJBQTRCLEVBQUUsTUFBTSxtRkFBbUYsQ0FBQztBQUNqSSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFFckUsT0FBTyxFQUFFLGlDQUFpQyxFQUFFLE1BQU0scUVBQXFFLENBQUM7QUFFakgsSUFBTSxxQ0FBcUMsR0FBM0MsTUFBTSxxQ0FBcUM7SUFFakQsWUFDb0MsZ0NBQW1FLEVBQzVFLHVCQUFpRCxFQUNqRCx1QkFBaUQsRUFDeEMsMEJBQTZELEVBQ25GLFVBQXVCO1FBRXBDLHNIQUFzSDtRQUN0SCxJQUFJLGdDQUFnQyxDQUFDLCtCQUErQixFQUFFLENBQUM7WUFDdEUsNEJBQTRCLENBQUMsZ0NBQWdDLENBQUMsK0JBQStCLENBQUMsMEJBQTBCLEVBQUUsdUJBQXVCLEVBQUUsdUJBQXVCLEVBQUUsMEJBQTBCLEVBQUUsVUFBVSxDQUFDLENBQUM7UUFDck4sQ0FBQztRQUNELElBQUksZ0NBQWdDLENBQUMsNEJBQTRCLEVBQUUsQ0FBQztZQUNuRSw0QkFBNEIsQ0FBQyxnQ0FBZ0MsQ0FBQyw0QkFBNEIsQ0FBQywwQkFBMEIsRUFBRSx1QkFBdUIsRUFBRSx1QkFBdUIsRUFBRSwwQkFBMEIsRUFBRSxVQUFVLENBQUMsQ0FBQztRQUNsTixDQUFDO0lBQ0YsQ0FBQztDQUVELENBQUE7QUFsQlkscUNBQXFDO0lBRy9DLFdBQUEsaUNBQWlDLENBQUE7SUFDakMsV0FBQSx3QkFBd0IsQ0FBQTtJQUN4QixXQUFBLHdCQUF3QixDQUFBO0lBQ3hCLFdBQUEsaUNBQWlDLENBQUE7SUFDakMsV0FBQSxXQUFXLENBQUE7R0FQRCxxQ0FBcUMsQ0FrQmpEIn0=