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
import { IInstantiationService } from '../../../../../../platform/instantiation/common/instantiation.js';
import { ChatCollapsibleListContentPart } from '../chatReferencesContentPart.js';
import { BaseChatToolInvocationSubPart } from './chatToolInvocationSubPart.js';
let ChatResultListSubPart = class ChatResultListSubPart extends BaseChatToolInvocationSubPart {
    constructor(toolInvocation, context, message, toolDetails, listPool, instantiationService) {
        super(toolInvocation);
        this.codeblocks = [];
        const collapsibleListPart = this._register(instantiationService.createInstance(ChatCollapsibleListContentPart, toolDetails.map(detail => ({
            kind: 'reference',
            reference: detail,
        })), message, context, listPool));
        this._register(collapsibleListPart.onDidChangeHeight(() => this._onDidChangeHeight.fire()));
        this.domNode = collapsibleListPart.domNode;
    }
};
ChatResultListSubPart = __decorate([
    __param(5, IInstantiationService)
], ChatResultListSubPart);
export { ChatResultListSubPart };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFJlc3VsdExpc3RTdWJQYXJ0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvYWR2aWthci9Eb2N1bWVudHMvYXJjaGl0ZWN0L2FyY2gyL0FyY2hJREUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9icm93c2VyL2NoYXRDb250ZW50UGFydHMvdG9vbEludm9jYXRpb25QYXJ0cy9jaGF0UmVzdWx0TGlzdFN1YlBhcnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFLaEcsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sa0VBQWtFLENBQUM7QUFJekcsT0FBTyxFQUFFLDhCQUE4QixFQUFpRCxNQUFNLGlDQUFpQyxDQUFDO0FBQ2hJLE9BQU8sRUFBRSw2QkFBNkIsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBRXhFLElBQU0scUJBQXFCLEdBQTNCLE1BQU0scUJBQXNCLFNBQVEsNkJBQTZCO0lBSXZFLFlBQ0MsY0FBbUUsRUFDbkUsT0FBc0MsRUFDdEMsT0FBaUMsRUFDakMsV0FBa0MsRUFDbEMsUUFBNkIsRUFDTixvQkFBMkM7UUFFbEUsS0FBSyxDQUFDLGNBQWMsQ0FBQyxDQUFDO1FBVlAsZUFBVSxHQUF5QixFQUFFLENBQUM7UUFZckQsTUFBTSxtQkFBbUIsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLG9CQUFvQixDQUFDLGNBQWMsQ0FDN0UsOEJBQThCLEVBQzlCLFdBQVcsQ0FBQyxHQUFHLENBQTJCLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQztZQUNwRCxJQUFJLEVBQUUsV0FBVztZQUNqQixTQUFTLEVBQUUsTUFBTTtTQUNqQixDQUFDLENBQUMsRUFDSCxPQUFPLEVBQ1AsT0FBTyxFQUNQLFFBQVEsQ0FDUixDQUFDLENBQUM7UUFDSCxJQUFJLENBQUMsU0FBUyxDQUFDLG1CQUFtQixDQUFDLGlCQUFpQixDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDNUYsSUFBSSxDQUFDLE9BQU8sR0FBRyxtQkFBbUIsQ0FBQyxPQUFPLENBQUM7SUFDNUMsQ0FBQztDQUNELENBQUE7QUEzQlkscUJBQXFCO0lBVS9CLFdBQUEscUJBQXFCLENBQUE7R0FWWCxxQkFBcUIsQ0EyQmpDIn0=