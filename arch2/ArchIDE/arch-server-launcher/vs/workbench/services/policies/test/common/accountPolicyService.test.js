/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { PolicyTag } from '../../../../../base/common/policy.js';
import { NullLogService } from '../../../../../platform/log/common/log.js';
import { DefaultAccountService } from '../../../accounts/common/defaultAccount.js';
import { AccountPolicyService } from '../../common/accountPolicyService.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { Registry } from '../../../../../platform/registry/common/platform.js';
import { Extensions } from '../../../../../platform/configuration/common/configurationRegistry.js';
import { DefaultConfiguration, PolicyConfiguration } from '../../../../../platform/configuration/common/configurations.js';
const BASE_DEFAULT_ACCOUNT = {
    enterprise: false,
    sessionId: 'abc123',
};
suite('AccountPolicyService', () => {
    const disposables = ensureNoDisposablesAreLeakedInTestSuite();
    let policyService;
    let defaultAccountService;
    let policyConfiguration;
    const logService = new NullLogService();
    const policyConfigurationNode = {
        'id': 'policyConfiguration',
        'order': 1,
        'title': 'a',
        'type': 'object',
        'properties': {
            'setting.A': {
                'type': 'string',
                'default': 'defaultValueA',
                policy: {
                    name: 'PolicySettingA',
                    minimumVersion: '1.0.0',
                }
            },
            'setting.B': {
                'type': 'string',
                'default': 'defaultValueB',
                policy: {
                    name: 'PolicySettingB',
                    minimumVersion: '1.0.0',
                    defaultValue: "policyValueB",
                    tags: [PolicyTag.Account, PolicyTag.Preview]
                }
            },
            'setting.C': {
                'type': 'array',
                'default': ['defaultValueC1', 'defaultValueC2'],
                policy: {
                    name: 'PolicySettingC',
                    minimumVersion: '1.0.0',
                    defaultValue: JSON.stringify(['policyValueC1', 'policyValueC2']),
                    tags: [PolicyTag.Account, PolicyTag.Preview]
                }
            },
            'setting.D': {
                'type': 'boolean',
                'default': true,
                policy: {
                    name: 'PolicySettingD',
                    minimumVersion: '1.0.0',
                    defaultValue: false,
                    tags: [PolicyTag.Account, PolicyTag.Preview]
                }
            },
            'setting.E': {
                'type': 'boolean',
                'default': true,
            }
        }
    };
    suiteSetup(() => Registry.as(Extensions.Configuration).registerConfiguration(policyConfigurationNode));
    suiteTeardown(() => Registry.as(Extensions.Configuration).deregisterConfigurations([policyConfigurationNode]));
    setup(async () => {
        const defaultConfiguration = disposables.add(new DefaultConfiguration(new NullLogService()));
        await defaultConfiguration.initialize();
        defaultAccountService = disposables.add(new DefaultAccountService());
        policyService = disposables.add(new AccountPolicyService(logService, defaultAccountService));
        policyConfiguration = disposables.add(new PolicyConfiguration(defaultConfiguration, policyService, new NullLogService()));
    });
    async function assertDefaultBehavior(defaultAccount) {
        defaultAccountService.setDefaultAccount(defaultAccount);
        await policyConfiguration.initialize();
        {
            const A = policyService.getPolicyValue('PolicySettingA');
            const B = policyService.getPolicyValue('PolicySettingB');
            const C = policyService.getPolicyValue('PolicySettingC');
            const D = policyService.getPolicyValue('PolicySettingD');
            // No policy is set
            assert.strictEqual(A, undefined);
            assert.strictEqual(B, undefined);
            assert.strictEqual(C, undefined);
            assert.strictEqual(D, undefined);
        }
        {
            const B = policyConfiguration.configurationModel.getValue('setting.B');
            const C = policyConfiguration.configurationModel.getValue('setting.C');
            const D = policyConfiguration.configurationModel.getValue('setting.D');
            assert.strictEqual(B, undefined);
            assert.deepStrictEqual(C, undefined);
            assert.strictEqual(D, undefined);
        }
    }
    test('should initialize with default account', async () => {
        const defaultAccount = { ...BASE_DEFAULT_ACCOUNT };
        await assertDefaultBehavior(defaultAccount);
    });
    test('should initialize with default account and preview features enabled', async () => {
        const defaultAccount = { ...BASE_DEFAULT_ACCOUNT, chat_preview_features_enabled: true };
        await assertDefaultBehavior(defaultAccount);
    });
    test('should initialize with default account and preview features disabled', async () => {
        const defaultAccount = { ...BASE_DEFAULT_ACCOUNT, chat_preview_features_enabled: false };
        defaultAccountService.setDefaultAccount(defaultAccount);
        await policyConfiguration.initialize();
        const actualConfigurationModel = policyConfiguration.configurationModel;
        {
            const A = policyService.getPolicyValue('PolicySettingA');
            const B = policyService.getPolicyValue('PolicySettingB');
            const C = policyService.getPolicyValue('PolicySettingC');
            const D = policyService.getPolicyValue('PolicySettingD');
            assert.strictEqual(A, undefined); // Not tagged with chat preview tags
            assert.strictEqual(B, 'policyValueB');
            assert.strictEqual(C, JSON.stringify(['policyValueC1', 'policyValueC2']));
            assert.strictEqual(D, false);
        }
        {
            const B = actualConfigurationModel.getValue('setting.B');
            const C = actualConfigurationModel.getValue('setting.C');
            const D = actualConfigurationModel.getValue('setting.D');
            assert.strictEqual(B, 'policyValueB');
            assert.deepStrictEqual(C, ['policyValueC1', 'policyValueC2']);
            assert.strictEqual(D, false);
        }
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWNjb3VudFBvbGljeVNlcnZpY2UudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL2FkdmlrYXIvRG9jdW1lbnRzL2FyY2hpdGVjdC9hcmNoMi9BcmNoSURFL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9wb2xpY2llcy90ZXN0L2NvbW1vbi9hY2NvdW50UG9saWN5U2VydmljZS50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDakUsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBQzNFLE9BQU8sRUFBRSxxQkFBcUIsRUFBMkMsTUFBTSw0Q0FBNEMsQ0FBQztBQUM1SCxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUM1RSxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUNuRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0scURBQXFELENBQUM7QUFDL0UsT0FBTyxFQUFFLFVBQVUsRUFBOEMsTUFBTSx1RUFBdUUsQ0FBQztBQUMvSSxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxnRUFBZ0UsQ0FBQztBQUUzSCxNQUFNLG9CQUFvQixHQUFvQjtJQUM3QyxVQUFVLEVBQUUsS0FBSztJQUNqQixTQUFTLEVBQUUsUUFBUTtDQUNuQixDQUFDO0FBRUYsS0FBSyxDQUFDLHNCQUFzQixFQUFFLEdBQUcsRUFBRTtJQUVsQyxNQUFNLFdBQVcsR0FBRyx1Q0FBdUMsRUFBRSxDQUFDO0lBRTlELElBQUksYUFBbUMsQ0FBQztJQUN4QyxJQUFJLHFCQUE2QyxDQUFDO0lBQ2xELElBQUksbUJBQXdDLENBQUM7SUFDN0MsTUFBTSxVQUFVLEdBQUcsSUFBSSxjQUFjLEVB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