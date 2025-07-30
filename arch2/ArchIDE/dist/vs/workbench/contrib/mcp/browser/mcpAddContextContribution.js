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
import { Codicon } from '../../../../base/common/codicons.js';
import { CancellationError } from '../../../../base/common/errors.js';
import { Disposable, MutableDisposable } from '../../../../base/common/lifecycle.js';
import { autorun, observableValue } from '../../../../base/common/observable.js';
import { localize } from '../../../../nls.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IChatContextPickService } from '../../chat/browser/chatContextPickService.js';
import { McpResourcePickHelper } from './mcpResourceQuickAccess.js';
let McpAddContextContribution = class McpAddContextContribution extends Disposable {
    constructor(_chatContextPickService, instantiationService) {
        super();
        this._chatContextPickService = _chatContextPickService;
        this._addContextMenu = this._register(new MutableDisposable());
        this._helper = instantiationService.createInstance(McpResourcePickHelper);
        this._register(autorun(reader => {
            const enabled = this._helper.hasServersWithResources.read(reader);
            if (enabled && !this._addContextMenu.value) {
                this._registerAddContextMenu();
            }
            else {
                this._addContextMenu.clear();
            }
        }));
    }
    _registerAddContextMenu() {
        this._addContextMenu.value = this._chatContextPickService.registerChatContextItem({
            type: 'pickerPick',
            label: localize('mcp.addContext', "MCP Resources..."),
            icon: Codicon.mcp,
            asPicker: () => ({
                placeholder: localize('mcp.addContext.placeholder', "Select MCP Resource..."),
                picks: (_query, token) => this._getResourcePicks(token),
            }),
        });
    }
    _getResourcePicks(token) {
        const observable = observableValue(this, { busy: true, picks: [] });
        this._helper.getPicks(servers => {
            const picks = [];
            for (const [server, resources] of servers) {
                if (resources.length === 0) {
                    continue;
                }
                picks.push(McpResourcePickHelper.sep(server));
                for (const resource of resources) {
                    picks.push({
                        ...McpResourcePickHelper.item(resource),
                        asAttachment: () => this._helper.toAttachment(resource).then(r => {
                            if (!r) {
                                throw new CancellationError();
                            }
                            else {
                                return r;
                            }
                        }),
                    });
                }
            }
            observable.set({ picks, busy: true }, undefined);
        }, token).finally(() => {
            observable.set({ busy: false, picks: observable.get().picks }, undefined);
        });
        return observable;
    }
};
McpAddContextContribution = __decorate([
    __param(0, IChatContextPickService),
    __param(1, IInstantiationService)
], McpAddContextContribution);
export { McpAddContextContribution };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWNwQWRkQ29udGV4dENvbnRyaWJ1dGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL2FkdmlrYXIvRG9jdW1lbnRzL2FyY2hpdGVjdC9hcmNoMi9BcmNoSURFL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL21jcC9icm93c2VyL21jcEFkZENvbnRleHRDb250cmlidXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFHaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQzlELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ3RFLE9BQU8sRUFBRSxVQUFVLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNyRixPQUFPLEVBQUUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQ2pGLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUM5QyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUVuRyxPQUFPLEVBQW1CLHVCQUF1QixFQUFFLE1BQU0sOENBQThDLENBQUM7QUFDeEcsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFFN0QsSUFBTSx5QkFBeUIsR0FBL0IsTUFBTSx5QkFBMEIsU0FBUSxVQUFVO0lBR3hELFlBQzBCLHVCQUFpRSxFQUNuRSxvQkFBMkM7UUFFbEUsS0FBSyxFQUFFLENBQUM7UUFIa0MsNEJBQXVCLEdBQXZCLHVCQUF1QixDQUF5QjtRQUYxRSxvQkFBZSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxpQkFBaUIsRUFBRSxDQUFDLENBQUM7UUFPMUUsSUFBSSxDQUFDLE9BQU8sR0FBRyxvQkFBb0IsQ0FBQyxjQUFjLENBQUMscUJBQXFCLENBQUMsQ0FBQztRQUMxRSxJQUFJLENBQUMs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