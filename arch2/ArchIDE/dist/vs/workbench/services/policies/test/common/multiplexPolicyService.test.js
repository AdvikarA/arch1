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
import { MultiplexPolicyService } from '../../common/multiplexPolicyService.js';
import { FilePolicyService } from '../../../../../platform/policy/common/filePolicyService.js';
import { URI } from '../../../../../base/common/uri.js';
import { InMemoryFileSystemProvider } from '../../../../../platform/files/common/inMemoryFilesystemProvider.js';
import { FileService } from '../../../../../platform/files/common/fileService.js';
import { VSBuffer } from '../../../../../base/common/buffer.js';
const BASE_DEFAULT_ACCOUNT = {
    enterprise: false,
    sessionId: 'abc123',
};
suite('MultiplexPolicyService', () => {
    const disposables = ensureNoDisposablesAreLeakedInTestSuite();
    let policyService;
    let fileService;
    let defaultAccountService;
    let policyConfiguration;
    const logService = new NullLogService();
    const policyFile = URI.file('policyFile').with({ scheme: 'vscode-tests' });
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
        fileService = disposables.add(new FileService(new NullLogService()));
        const diskFileSystemProvider = disposables.add(new InMemoryFileSystemProvider());
        disposables.add(fileService.registerProvider(policyFile.scheme, diskFileSystemProvider));
        defaultAccountService = disposables.add(new DefaultAccountService());
        policyService = disposables.add(new MultiplexPolicyService([
            disposables.add(new FilePolicyService(policyFile, fileService, new NullLogService())),
            disposables.add(new AccountPolicyService(logService, defaultAccountService)),
        ], logService));
        policyConfiguration = disposables.add(new PolicyConfiguration(defaultConfiguration, policyService, new NullLogService()));
    });
    async function clear() {
        // Reset
        defaultAccountService.setDefaultAccount({ ...BASE_DEFAULT_ACCOUNT });
        await fileService.writeFile(policyFile, VSBuffer.fromString(JSON.stringify({})));
    }
    test('no policy', async () => {
        await clear();
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
            const A = policyConfiguration.configurationModel.getValue('setting.A');
            const B = policyConfiguration.configurationModel.getValue('setting.B');
            const C = policyConfiguration.configurationModel.getValue('setting.C');
            const D = policyConfiguration.configurationModel.getValue('setting.D');
            const E = policyConfiguration.configurationModel.getValue('setting.E');
            assert.strictEqual(A, undefined);
            assert.strictEqual(B, undefined);
            assert.deepStrictEqual(C, undefined);
            assert.strictEqual(D, undefined);
            assert.strictEqual(E, undefined);
        }
    });
    test('policy from file only', async () => {
        await clear();
        const defaultAccount = { ...BASE_DEFAULT_ACCOUNT };
        defaultAccountService.setDefaultAccount(defaultAccount);
        await fileService.writeFile(policyFile, VSBuffer.fromString(JSON.stringify({ 'PolicySettingA': 'policyValueA' })));
        await policyConfiguration.initialize();
        {
            const A = policyService.getPolicyValue('PolicySettingA');
            const B = policyService.getPolicyValue('PolicySettingB');
            const C = policyService.getPolicyValue('PolicySettingC');
            const D = policyService.getPolicyValue('PolicySettingD');
            assert.strictEqual(A, 'policyValueA');
            assert.strictEqual(B, undefined);
            assert.strictEqual(C, undefined);
            assert.strictEqual(D, undefined);
        }
        {
            const A = policyConfiguration.configurationModel.getValue('setting.A');
            const B = policyConfiguration.configurationModel.getValue('setting.B');
            const C = policyConfiguration.configurationModel.getValue('setting.C');
            const D = policyConfiguration.configurationModel.getValue('setting.D');
            const E = policyConfiguration.configurationModel.getValue('setting.E');
            assert.strictEqual(A, 'policyValueA');
            assert.strictEqual(B, undefined);
            assert.deepStrictEqual(C, undefined);
            assert.strictEqual(D, undefined);
            assert.strictEqual(E, undefined);
        }
    });
    test('policy from default account only', async () => {
        await clear();
        const defaultAccount = { ...BASE_DEFAULT_ACCOUNT, chat_preview_features_enabled: false };
        defaultAccountService.setDefaultAccount(defaultAccount);
        await fileService.writeFile(policyFile, VSBuffer.fromString(JSON.stringify({})));
        await policyConfiguration.initialize();
        const actualConfigurationModel = policyConfiguration.configurationModel;
        {
            const A = policyService.getPolicyValue('PolicySettingA');
            const B = policyService.getPolicyValue('PolicySettingB');
            const C = policyService.getPolicyValue('PolicySettingC');
            const D = policyService.getPolicyValue('PolicySettingD');
            assert.strictEqual(A, undefined); // Not tagged with preview tags
            assert.strictEqual(B, 'policyValueB');
            assert.strictEqual(C, JSON.stringify(['policyValueC1', 'policyValueC2']));
            assert.strictEqual(D, false);
        }
        {
            const A = policyConfiguration.configurationModel.getValue('setting.A');
            const B = actualConfigurationModel.getValue('setting.B');
            const C = actualConfigurationModel.getValue('setting.C');
            const D = actualConfigurationModel.getValue('setting.D');
            assert.strictEqual(A, undefined);
            assert.strictEqual(B, 'policyValueB');
            assert.deepStrictEqual(C, ['policyValueC1', 'policyValueC2']);
            assert.strictEqual(D, false);
        }
    });
    test('policy from file and default account', async () => {
        await clear();
        const defaultAccount = { ...BASE_DEFAULT_ACCOUNT, chat_preview_features_enabled: false };
        defaultAccountService.setDefaultAccount(defaultAccount);
        await fileService.writeFile(policyFile, VSBuffer.fromString(JSON.stringify({ 'PolicySettingA': 'policyValueA' })));
        await policyConfiguration.initialize();
        const actualConfigurationModel = policyConfiguration.configurationModel;
        {
            const A = policyService.getPolicyValue('PolicySettingA');
            const B = policyService.getPolicyValue('PolicySettingB');
            const C = policyService.getPolicyValue('PolicySettingC');
            const D = policyService.getPolicyValue('PolicySettingD');
            assert.strictEqual(A, 'policyValueA');
            assert.strictEqual(B, 'policyValueB');
            assert.strictEqual(C, JSON.stringify(['policyValueC1', 'policyValueC2']));
            assert.strictEqual(D, false);
        }
        {
            const A = actualConfigurationModel.getValue('setting.A');
            const B = actualConfigurationModel.getValue('setting.B');
            const C = actualConfigurationModel.getValue('setting.C');
            const D = actualConfigurationModel.getValue('setting.D');
            assert.strictEqual(A, 'policyValueA');
            assert.strictEqual(B, 'policyValueB');
            assert.deepStrictEqual(C, ['policyValueC1', 'policyValueC2']);
            assert.strictEqual(D, false);
        }
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibXVsdGlwbGV4UG9saWN5U2VydmljZS50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvYWR2aWthci9Eb2N1bWVudHMvYXJjaGl0ZWN0L2FyY2gyL0FyY2hJREUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3BvbGljaWVzL3Rlc3QvY29tbW9uL211bHRpcGxleFBvbGljeVNlcnZpY2UudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2pFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUMzRSxPQUFPLEVBQUUscUJBQXFCLEVBQTJDLE1BQU0sNENBQTRDLENBQUM7QUFDNUgsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDNUUsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDbkcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHFEQUFxRCxDQUFDO0FBQy9FLE9BQU8sRUFBRSxVQUFVLEVBQThDLE1BQU0sdUVBQXVFLENBQUM7QUFDL0ksT0FBTyxFQUFFLG9CQUFvQixFQUFFLG1CQUFtQixFQUFFLE1BQU0sZ0VBQWdFLENBQUM7QUFDM0gsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDaEYsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDL0YsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBRXhELE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLG9FQUFvRSxDQUFDO0FBQ2hILE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxxREFBcUQsQ0FBQztBQUNsRixPQUFPLEVBQUUsUUFBUSxFQUFFLE1B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