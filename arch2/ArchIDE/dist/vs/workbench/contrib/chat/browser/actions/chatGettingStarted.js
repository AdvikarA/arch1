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
var ChatGettingStartedContribution_1;
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { IProductService } from '../../../../../platform/product/common/productService.js';
import { IExtensionService } from '../../../../services/extensions/common/extensions.js';
import { ExtensionIdentifier } from '../../../../../platform/extensions/common/extensions.js';
import { IExtensionManagementService } from '../../../../../platform/extensionManagement/common/extensionManagement.js';
import { IStorageService } from '../../../../../platform/storage/common/storage.js';
import { IWorkbenchLayoutService } from '../../../../services/layout/browser/layoutService.js';
import { showCopilotView } from '../chat.js';
import { IViewsService } from '../../../../services/views/common/viewsService.js';
let ChatGettingStartedContribution = class ChatGettingStartedContribution extends Disposable {
    static { ChatGettingStartedContribution_1 = this; }
    static { this.ID = 'workbench.contrib.chatGettingStarted'; }
    static { this.hideWelcomeView = 'workbench.chat.hideWelcomeView'; }
    constructor(productService, extensionService, viewsService, extensionManagementService, storageService, layoutService) {
        super();
        this.productService = productService;
        this.extensionService = extensionService;
        this.viewsService = viewsService;
        this.extensionManagementService = extensionManagementService;
        this.storageService = storageService;
        this.layoutService = layoutService;
        this.recentlyInstalled = false;
        const defaultChatAgent = this.productService.defaultChatAgent;
        const hideWelcomeView = this.storageService.getBoolean(ChatGettingStartedContribution_1.hideWelcomeView, -1 /* StorageScope.APPLICATION */, false);
        if (!defaultChatAgent || hideWelcomeView) {
            return;
        }
        this.registerListeners(defaultChatAgent);
    }
    registerListeners(defaultChatAgent) {
        this._register(this.extensionManagementService.onDidInstallExtensions(async (result) => {
            for (const e of result) {
                if (ExtensionIdentifier.equals(defaultChatAgent.extensionId, e.identifier.id) && e.operation === 2 /* InstallOperation.Install */) {
                    this.recentlyInstalled = true;
                    return;
                }
            }
        }));
        this._register(this.extensionService.onDidChangeExtensionsStatus(async (event) => {
            for (const ext of event) {
                if (ExtensionIdentifier.equals(defaultChatAgent.extensionId, ext.value)) {
                    const extensionStatus = this.extensionService.getExtensionsStatus();
                    if (extensionStatus[ext.value].activationTimes && this.recentlyInstalled) {
                        this.onDidInstallChat();
                        return;
                    }
                }
            }
        }));
    }
    async onDidInstallChat() {
        // Open Copilot view
        showCopilotView(this.viewsService, this.layoutService);
        // Only do this once
        this.storageService.store(ChatGettingStartedContribution_1.hideWelcomeView, true, -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
        this.recentlyInstalled = false;
    }
};
ChatGettingStartedContribution = ChatGettingStartedContribution_1 = __decorate([
    __param(0, IProductService),
    __param(1, IExtensionService),
    __param(2, IViewsService),
    __param(3, IExtensionManagementService),
    __param(4, IStorageService),
    __param(5, IWorkbenchLayoutService)
], ChatGettingStartedContribution);
export { ChatGettingStartedContribution };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdEdldHRpbmdTdGFydGVkLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvYWR2aWthci9Eb2N1bWVudHMvYXJjaGl0ZWN0L2FyY2gyL0FyY2hJREUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9icm93c2VyL2FjdGlvbnMvY2hhdEdldHRpbmdTdGFydGVkLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUdoRyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDckUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDBEQUEwRCxDQUFDO0FBQzNGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQ3pGLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQzlGLE9BQU8sRUFBRSwyQkFBMkIsRUFBb0IsTUFBTSwyRUFBMkUsQ0FBQztBQUMxSSxPQUFPLEVBQUUsZUFBZSxFQUErQixNQUFNLG1EQUFtRCxDQUFDO0FBRWpILE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQy9GLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxZQUFZLENBQUM7QUFDN0MsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBRTNFLElBQU0sOEJBQThCLEdBQXBDLE1BQU0sOEJBQStCLFNBQVEsVUFBVTs7YUFDN0MsT0FBRSxHQUFHLHNDQUFzQyxBQUF6QyxDQUEwQzthQUdwQyxvQkFBZSxHQUFHLGdDQUFnQyxBQUFuQyxDQUFvQztJQUUzRSxZQUNrQixjQUFnRCxFQUM5QyxnQkFBb0QsRUFDeEQsWUFBNEMsRUFDOUIsMEJBQXdFLEVBQ3BGLGNBQWdELEVBQ3hDLGFBQXVEO1FBRWhGLEtBQUssRUFBRSxDQUFDO1FBUDBCLG1CQUFjLEdBQWQsY0FBYyxDQUFpQjtRQUM3QixxQkFBZ0Is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