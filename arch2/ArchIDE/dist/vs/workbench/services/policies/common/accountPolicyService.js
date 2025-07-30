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
import { equals } from '../../../../base/common/objects.js';
import { PolicyTag } from '../../../../base/common/policy.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { AbstractPolicyService } from '../../../../platform/policy/common/policy.js';
import { IDefaultAccountService } from '../../accounts/common/defaultAccount.js';
let AccountPolicyService = class AccountPolicyService extends AbstractPolicyService {
    constructor(logService, defaultAccountService) {
        super();
        this.logService = logService;
        this.defaultAccountService = defaultAccountService;
        this.accountPolicy = {
            chatPreviewFeaturesEnabled: true,
            mcpEnabled: true
        };
        this.defaultAccountService.getDefaultAccount()
            .then(account => {
            this._update({
                chatPreviewFeaturesEnabled: account?.chat_preview_features_enabled ?? true,
                mcpEnabled: account?.mcp ?? true
            });
            this._register(this.defaultAccountService.onDidChangeDefaultAccount(account => this._update({
                chatPreviewFeaturesEnabled: account?.chat_preview_features_enabled ?? true,
                mcpEnabled: account?.mcp ?? true
            })));
        });
    }
    _update(updatedPolicy) {
        if (!equals(this.accountPolicy, updatedPolicy)) {
            this.accountPolicy = updatedPolicy;
            this._updatePolicyDefinitions(this.policyDefinitions);
        }
    }
    async _updatePolicyDefinitions(policyDefinitions) {
        this.logService.trace(`AccountPolicyService#_updatePolicyDefinitions: Got ${Object.keys(policyDefinitions).length} policy definitions`);
        const updated = [];
        const updateIfNeeded = (key, policy, isFeatureEnabled) => {
            if (isFeatureEnabled) {
                // Clear the policy if it is set
                if (this.policies.has(key)) {
                    this.policies.delete(key);
                    updated.push(key);
                }
            }
            else {
                // Enforce the defaultValue if not already set
                const updatedValue = policy.defaultValue === undefined ? false : policy.defaultValue;
                if (this.policies.get(key) !== updatedValue) {
                    this.policies.set(key, updatedValue);
                    updated.push(key);
                }
            }
        };
        const hasAllTags = (policy, tags) => {
            return policy.tags && tags.every(tag => policy.tags.includes(tag));
        };
        for (const key in policyDefinitions) {
            const policy = policyDefinitions[key];
            // Map chat preview features with ACCOUNT + PREVIEW tags
            if (hasAllTags(policy, [PolicyTag.Account, PolicyTag.Preview])) {
                updateIfNeeded(key, policy, this.accountPolicy?.chatPreviewFeaturesEnabled);
            }
            // Map MCP feature with MCP tag
            else if (hasAllTags(policy, [PolicyTag.Account, PolicyTag.MCP])) {
                updateIfNeeded(key, policy, this.accountPolicy?.mcpEnabled);
            }
        }
        if (updated.length) {
            this._onDidChange.fire(updated);
        }
    }
};
AccountPolicyService = __decorate([
    __param(0, ILogService),
    __param(1, IDefaultAccountService)
], AccountPolicyService);
export { AccountPolicyService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWNjb3VudFBvbGljeVNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9hZHZpa2FyL0RvY3VtZW50cy9hcmNoaXRlY3QvYXJjaDIvQXJjaElERS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvcG9saWNpZXMvY29tbW9uL2FjY291bnRQb2xpY3lTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBR2hHLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUM1RCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDOUQsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ3JFLE9BQU8sRUFBRSxxQkFBcUIsRUFBb0MsTUFBTSw4Q0FBOEMsQ0FBQztBQUN2SCxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQU8xRSxJQUFNLG9CQUFvQixHQUExQixNQUFNLG9CQUFxQixTQUFRLHFCQUFxQjtJQUs5RCxZQUNjLFVBQXdDLEVBQzdCLHFCQUE4RDtRQUV0RixLQUFLLEVBQUUsQ0FBQztRQUhzQixlQUFVLEdBQVYsVUFBVSxDQUFhO1FBQ1osMEJBQXFCLEdBQXJCLHFCQUFxQixDQUF3QjtRQU4vRSxrQkFBYSxHQUFtQjtZQUN2QywwQkFBMEIsRUFBRSxJQUFJO1lBQ2hDLFVBQVUsRUFBRSxJQUFJO1NBQ2hCLENBQUM7UUFPRCxJQUFJLENBQUMscUJBQXFCLENBQUMsaUJBQWlCLEVBQUU7YUFDNUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxFQUFFO1lBQ2YsSUFBSSxDQUFDLE9BQU8sQ0FBQztnQkFDWiwwQkFBMEIsRUFBRSxPQUFPLEVBQUUsNkJBQTZCLElBQUksSUFBSTtnQkFDMUUsVUFBVSxFQUFFLE9BQU8sRUFBRSxHQUFHLElBQUksSUFBSTthQUNoQyxDQUFDLENBQUM7WUFDSCxJQUFJ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