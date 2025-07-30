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
import { INativeBrowserElementsService } from '../../../../platform/browserElements/common/browserElements.js';
import { ipcRenderer } from '../../../../base/parts/sandbox/electron-browser/globals.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { IBrowserElementsService } from '../browser/browserElementsService.js';
import { IMainProcessService } from '../../../../platform/ipc/common/mainProcessService.js';
import { INativeWorkbenchEnvironmentService } from '../../environment/electron-browser/environmentService.js';
import { NativeBrowserElementsService } from '../../../../platform/browserElements/common/nativeBrowserElementsService.js';
let WorkbenchNativeBrowserElementsService = class WorkbenchNativeBrowserElementsService extends NativeBrowserElementsService {
    constructor(environmentService, mainProcessService) {
        super(environmentService.window.id, mainProcessService);
    }
};
WorkbenchNativeBrowserElementsService = __decorate([
    __param(0, INativeWorkbenchEnvironmentService),
    __param(1, IMainProcessService)
], WorkbenchNativeBrowserElementsService);
let cancelSelectionIdPool = 0;
let cancelAndDetachIdPool = 0;
let WorkbenchBrowserElementsService = class WorkbenchBrowserElementsService {
    constructor(simpleBrowser) {
        this.simpleBrowser = simpleBrowser;
    }
    async startDebugSession(token, browserType) {
        const cancelAndDetachId = cancelAndDetachIdPool++;
        const onCancelChannel = `vscode:cancelCurrentSession${cancelAndDetachId}`;
        const disposable = token.onCancellationRequested(() => {
            ipcRenderer.send(onCancelChannel, cancelAndDetachId);
            disposable.dispose();
        });
        try {
            await this.simpleBrowser.startDebugSession(token, browserType, cancelAndDetachId);
        }
        catch (error) {
            disposable.dispose();
            throw new Error('No debug session target found', error);
        }
    }
    async getElementData(rect, token, browserType) {
        if (!browserType) {
            return undefined;
        }
        const cancelSelectionId = cancelSelectionIdPool++;
        const onCancelChannel = `vscode:cancelElementSelection${cancelSelectionId}`;
        const disposable = token.onCancellationRequested(() => {
            ipcRenderer.send(onCancelChannel, cancelSelectionId);
        });
        try {
            const elementData = await this.simpleBrowser.getElementData(rect, token, browserType, cancelSelectionId);
            return elementData;
        }
        catch (error) {
            disposable.dispose();
            throw new Error(`Native Host: Error getting element data: ${error}`);
        }
        finally {
            disposable.dispose();
        }
    }
};
WorkbenchBrowserElementsService = __decorate([
    __param(0, INativeBrowserElementsService)
], WorkbenchBrowserElementsService);
registerSingleton(IBrowserElementsService, WorkbenchBrowserElementsService, 1 /* InstantiationType.Delayed */);
registerSingleton(INativeBrowserElementsService, WorkbenchNativeBrowserElementsService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnJvd3NlckVsZW1lbnRzU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL2FkdmlrYXIvRG9jdW1lbnRzL2FyY2hpdGVjdC9hcmNoMi9BcmNoSURFL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9icm93c2VyRWxlbWVudHMvZWxlY3Ryb24tYnJvd3Nlci9icm93c2VyRWxlbWVudHNTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBNkIsNkJBQTZCLEVBQUUsTUFBTSxnRUFBZ0UsQ0FBQztBQUUxSSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sNERBQTRELENBQUM7QUFFekYsT0FBTyxFQUFFLGlCQUFpQixFQUFxQixNQUFNLHlEQUF5RCxDQUFDO0FBQy9HLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQy9FLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHVEQUF1RCxDQUFDO0FBQzVGLE9BQU8sRUFBRSxrQ0FBa0MsRUFBRSxNQUFNLDBEQUEwRCxDQUFDO0FBQzlHLE9BQU8sRUFBRSw0QkFBNEIsRUFBRSxNQUFNLDZFQUE2RSxDQUFDO0FBRTNILElBQU0scUNBQXFDLEdBQTNDLE1BQU0scUNBQXNDLFNBQVEsNEJBQTRCO0lBRS9FLFlBQ3FDLGtCQUFzRCxFQUNyRSxrQkFBdUM7UUFFNUQsS0FBSyxDQUFDLGtCQUFrQixDQUFDLE1BQU0sQ0FBQyxFQUFFLEVBQUUsa0JBQWtCLENBQUMsQ0FBQztJQUN6RCxDQUFDO0NBQ0QsQ0FBQTtBQVJLLHFDQUFxQztJQUd4QyxXQUFBLGtDQUFrQyxDQUFBO0lBQ2xDLFdBQUEsbUJBQW1CLENBQUE7R0FKaEIscUNBQXFDLENBUTFDO0FBRUQsSUFBSSxxQkFBcUIsR0FBRyxDQUFDLENBQUM7QUFDOUIsSUFBSSxxQkFBcUIsR0FBRyxDQUFDLENBQUM7QUFFOUIsSUFBTSwrQkFBK0IsR0FBckMsTUFBTSwrQkFBK0I7SUFHcEMsWUFDaUQsYUFBNEM7UUFBNUMsa0JBQWEsR0FBYixhQUFhLENBQStCO0lBQ3pGLENBQUM7SUFFTCxLQUFLLENBQUMsaUJBQWlCLENBQUMsS0FBd0IsRUFBRSxXQUF3QjtRQUN6RSxNQUFNLGlCQUFpQixHQUFHLHFCQUFxQixFQUFFLENBQUM7UUFDbEQsTUFBTSxlQUFlLEdBQUcsOEJBQThCLGlCQUFpQixFQUFFLENBQUM7UUFFMUUsTUFBTSxVQUFVLEdBQUcsS0FBSyxDQUFDLHVCQUF1QixDQUFDLEdBQUcsRUFBRTtZQUNyRCxXQUFXLENBQUMsSUFBSSxDQUFDLGVBQWUsRUFBRSxpQkFBaUIsQ0FBQyxDQUFDO1lBQ3JELFVBQVUsQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUN0QixDQUFDLENBQUMsQ0FBQztRQUNILElBQUksQ0FBQztZQUNKLE1BQU0sSUFBSSxDQUFDLGFBQWEsQ0FBQyxpQkFBaUIsQ0FBQyxLQUFLLEVBQUUsV0FBVyxFQUFFLGlCQUFpQixDQUFDLENBQUM7UUFDbkYsQ0FBQztRQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7WUFDaEIsVUFBVSxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ3JCLE1BQU0sSUFBSSxLQUFLLENBQUMsK0JBQStCLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDekQsQ0FBQztJQUNGLENBQUM7SUFFRCxLQUFLLENBQUMsY0FBYyxDQUFDLElBQWdCLEVBQUUsS0FBd0IsRUFBRSxXQUFvQztRQUNwRyxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUM7WUFDbEIsT0FBTyxTQUFTLENBQUM7UUFDbEIsQ0FBQztRQUNELE1BQU0saUJBQWlCLEdBQUcscUJBQXFCLEVBQUUsQ0FBQztRQUNsRCxNQUFNLGVBQWUsR0FBRyxnQ0FBZ0MsaUJBQWlCLEVBQUUsQ0FBQztRQUM1RSxNQUFNLFVBQVUsR0FBRyxLQUFLLENBQUMsdUJBQXVCLENBQUMsR0FBRyxFQUFFO1lBQ3JELFdBQVcsQ0FBQyxJQUFJLENBQUMsZUFBZSxFQUFFLGlCQUFpQixDQUFDLENBQUM7UUFDdEQsQ0FBQyxDQUFDLENBQUM7UUFDSCxJQUFJLENBQUM7WUFDSixNQUFNLFdBQVcsR0FBRyxNQUFNLElBQUksQ0FBQyxhQUFhLENBQUMsY0FBYyxDQUFDLElBQUksRUFBRSxLQUFLLEVBQUUsV0FBVyxFQUFFLGlCQUFpQixDQUFDLENBQUM7WUFDekcsT0FBTyxXQUFXLENBQUM7UUFDcEIsQ0FBQztRQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7WUFDaEIsVUFBVSxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ3JCLE1BQU0sSUFBSSxLQUFLLENBQUMsNENBQTRDLEtBQUssRUFBRSxDQUFDLENBQUM7UUFDdEUsQ0FBQztnQkFBUyxDQUFDO1lBQ1YsVUFBVSxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQ3RCLENBQUM7SUFDRixDQUFDO0NBQ0QsQ0FBQTtBQTFDSywrQkFBK0I7SUFJbEMsV0FBQSw2QkFBNkIsQ0FBQTtHQUoxQiwrQkFBK0IsQ0EwQ3BDO0FBRUQsaUJBQWlCLENBQUMsdUJBQXVCLEVBQUUsK0JBQStCLG9DQUE0QixDQUFDO0FBQ3ZHLGlCQUFpQixDQUFDLDZCQUE2QixFQUFFLHFDQUFxQyxvQ0FBNEIsQ0FBQyJ9