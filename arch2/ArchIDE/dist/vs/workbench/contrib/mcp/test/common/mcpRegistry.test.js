/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as assert from 'assert';
import * as sinon from 'sinon';
import { timeout } from '../../../../../base/common/async.js';
import { observableValue } from '../../../../../base/common/observable.js';
import { upcast } from '../../../../../base/common/types.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { TestConfigurationService } from '../../../../../platform/configuration/test/common/testConfigurationService.js';
import { IDialogService } from '../../../../../platform/dialogs/common/dialogs.js';
import { ServiceCollection } from '../../../../../platform/instantiation/common/serviceCollection.js';
import { TestInstantiationService } from '../../../../../platform/instantiation/test/common/instantiationServiceMock.js';
import { ILoggerService, ILogService, NullLogger, NullLogService } from '../../../../../platform/log/common/log.js';
import { mcpEnabledConfig } from '../../../../../platform/mcp/common/mcpManagement.js';
import { IProductService } from '../../../../../platform/product/common/productService.js';
import { ISecretStorageService } from '../../../../../platform/secrets/common/secrets.js';
import { TestSecretStorageService } from '../../../../../platform/secrets/test/common/testSecretStorageService.js';
import { IStorageService } from '../../../../../platform/storage/common/storage.js';
import { IConfigurationResolverService } from '../../../../services/configurationResolver/common/configurationResolver.js';
import { ConfigurationResolverExpression } from '../../../../services/configurationResolver/common/configurationResolverExpression.js';
import { IOutputService } from '../../../../services/output/common/output.js';
import { TestLoggerService, TestStorageService } from '../../../../test/common/workbenchTestServices.js';
import { McpRegistry } from '../../common/mcpRegistry.js';
import { McpStartServerInteraction } from '../../common/mcpTypes.js';
import { TestMcpMessageTransport } from './mcpRegistryTypes.js';
class TestConfigurationResolverService {
    constructor() {
        this.interactiveCounter = 0;
        // Used to simulate stored/resolved variables
        this.resolvedVariables = new Map();
        // Add some test variables
        this.resolvedVariables.set('workspaceFolder', '/test/workspace');
        this.resolvedVariables.set('fileBasename', 'test.txt');
    }
    resolveAsync(folder, value) {
        const parsed = ConfigurationResolverExpression.parse(value);
        for (const variable of parsed.unresolved()) {
            const resolved = this.resolvedVariables.get(variable.inner);
            if (resolved) {
                parsed.resolve(variable, resolved);
            }
        }
        return Promise.resolve(parsed.toObject());
    }
    resolveWithInteraction(folder, config, section, variables, target) {
        const parsed = ConfigurationResolverExpression.parse(config);
        // For testing, we simulate interaction by returning a map with some variables
        const result = new Map();
        result.set('input:testInteractive', `interactiveValue${this.interactiveCounter++}`);
        result.set('command:testCommand', `commandOutput${this.interactiveCounter++}}`);
        // If variables are provided, include those too
        for (const [k, v] of result.entries()) {
            parsed.resolve({ id: '${' + k + '}' }, v);
        }
        return Promise.resolve(result);
    }
}
class TestMcpHostDelegate {
    constructor() {
        this.priority = 0;
    }
    canStart() {
        return true;
    }
    start() {
        return new TestMcpMessageTransport();
    }
    waitForInitialProviderPromises() {
        return Promise.resolve();
    }
}
class TestDialogService {
    constructor() {
        this._promptSpy = sinon.stub();
        this._promptSpy.callsFake(() => {
            return Promise.resolve({ result: this._promptResult });
        });
    }
    setPromptResult(result) {
        this._promptResult = result;
    }
    get promptSpy() {
        return this._promptSpy;
    }
    prompt(options) {
        return this._promptSpy(options);
    }
}
class TestMcpRegistry extends McpRegistry {
    _promptForTrustOpenDialog() {
        return Promise.resolve(this.nextDefinitionIdsToTrust);
    }
}
suite('Workbench - MCP - Registry', () => {
    const store = ensureNoDisposablesAreLeakedInTestSuite();
    let registry;
    let testStorageService;
    let testConfigResolverService;
    let testDialogService;
    let testCollection;
    let baseDefinition;
    let configurationService;
    let logger;
    let trustNonceBearer;
    setup(() => {
        testConfigResolverService = new TestConfigurationResolverService();
        testStorageService = store.add(new TestStorageService());
        testDialogService = new TestDialogService();
        configurationService = new TestConfigurationService({ [mcpEnabledConfig]: true });
        trustNonceBearer = { trustedAtNonce: undefined };
        const services = new ServiceCollection([IConfigurationService, configurationService], [IConfigurationResolverService, testConfigResolverService], [IStorageService, testStorageService], [ISecretStorageService, new TestSecretStorageService()], [ILoggerService, store.add(new TestLoggerService())], [ILogService, store.add(new NullLogService())], [IOutputService, upcast({ showChannel: () => { } })], [IDialogService, testDialogService], [IProductService, {}]);
        logger = new NullLogger();
        const instaService = store.add(new TestInstantiationService(services));
        registry = store.add(instaService.createInstance(TestMcpRegistry));
        // Create test collection that can be reused
        testCollection = {
            id: 'test-collection',
            label: 'Test Collection',
            remoteAuthority: null,
            serverDefinitions: observableValue('serverDefs', []),
            trustBehavior: 0 /* McpServerTrust.Kind.Trusted */,
            scope: -1 /* StorageScope.APPLICATION */,
            configTarget: 2 /* ConfigurationTarget.USER */,
        };
        // Create base definition that can be reused
        baseDefinition = {
            id: 'test-server',
            label: 'Test Server',
            cacheNonce: 'a',
            launch: {
                type: 1 /* McpServerTransportType.Stdio */,
                command: 'test-command',
                args: [],
                env: {},
                envFile: undefined,
                cwd: '/test',
            }
        };
    });
    test('registerCollection adds collection to registry', () => {
        const disposable = registry.registerCollection(testCollection);
        store.add(disposable);
        assert.strictEqual(registry.collections.get().length, 1);
        assert.strictEqual(registry.collections.get()[0], testCollection);
        disposable.dispose();
        assert.strictEqual(registry.collections.get().length, 0);
    });
    test('collections are not visible when not enabled', () => {
        const disposable = registry.registerCollection(testCollection);
        store.add(disposable);
        assert.strictEqual(registry.collections.get().length, 1);
        configurationService.setUserConfiguration(mcpEnabledConfig, false);
        configurationService.onDidChangeConfigurationEmitter.fire({ affectsConfiguration: () => true });
        assert.strictEqual(registry.collections.get().length, 0);
        configurationService.setUserConfiguration(mcpEnabledConfig, true);
        configurationService.onDidChangeConfigurationEmitter.fire({ affectsConfiguration: () => true });
    });
    test('registerDelegate adds delegate to registry', () => {
        const delegate = new TestMcpHostDelegate();
        const disposable = registry.registerDelegate(delegate);
        store.add(disposable);
        assert.strictEqual(registry.delegates.get().length, 1);
        assert.strictEqual(registry.delegates.get()[0], delegate);
        disposable.dispose();
        assert.strictEqual(registry.delegates.get().length, 0);
    });
    test('resolveConnection creates connection with resolved variables and memorizes them until cleared', async () => {
        const definition = {
            ...baseDefinition,
            launch: {
                type: 1 /* McpServerTransportType.Stdio */,
                command: '${workspaceFolder}/cmd',
                args: ['--file', '${fileBasename}'],
                env: {
                    PATH: '${input:testInteractive}'
                },
                envFile: undefined,
                cwd: '/test',
            },
            variableReplacement: {
                section: 'mcp',
                target: 5 /* ConfigurationTarget.WORKSPACE */,
            }
        };
        const delegate = new TestMcpHostDelegate();
        store.add(registry.registerDelegate(delegate));
        testCollection.serverDefinitions.set([definition], undefined);
        store.add(registry.registerCollection(testCollection));
        const connection = await registry.resolveConnection({ collectionRef: testCollection, definitionRef: definition, logger, trustNonceBearer });
        assert.ok(connection);
        assert.strictEqual(connection.definition, definition);
        assert.strictEqual(connection.launchDefinition.command, '/test/workspace/cmd');
        assert.strictEqual(connection.launchDefinition.env.PATH, 'interactiveValue0');
        connection.dispose();
        const connection2 = await registry.resolveConnection({ collectionRef: testCollection, definitionRef: definition, logger, trustNonceBearer });
        assert.ok(connection2);
        assert.strictEqual(connection2.launchDefinition.env.PATH, 'interactiveValue0');
        connection2.dispose();
        registry.clearSavedInputs(1 /* StorageScope.WORKSPACE */);
        const connection3 = await registry.resolveConnection({ collectionRef: testCollection, definitionRef: definition, logger, trustNonceBearer });
        assert.ok(connection3);
        assert.strictEqual(connection3.launchDefinition.env.PATH, 'interactiveValue4');
        connection3.dispose();
    });
    test('resolveConnection uses user-provided launch configuration', async () => {
        // Create a collection with custom launch resolver
        const customCollection = {
            ...testCollection,
            resolveServerLanch: async (def) => {
                return {
                    ...def.launch,
                    env: { CUSTOM_ENV: 'value' },
                };
            }
        };
        // Create a definition with variable replacement
        const definition = {
            ...baseDefinition,
            variableReplacement: {
                section: 'mcp',
                target: 5 /* ConfigurationTarget.WORKSPACE */,
            }
        };
        const delegate = new TestMcpHostDelegate();
        store.add(registry.registerDelegate(delegate));
        testCollection.serverDefinitions.set([definition], undefined);
        store.add(registry.registerCollection(customCollection));
        // Resolve connection should use the custom launch configuration
        const connection = await registry.resolveConnection({
            collectionRef: customCollection,
            definitionRef: definition,
            logger,
            trustNonceBearer,
        });
        assert.ok(connection);
        // Verify the launch configuration passed to _replaceVariablesInLaunch was the custom one
        assert.deepStrictEqual(connection.launchDefinition.env, { CUSTOM_ENV: 'value' });
        connection.dispose();
    });
    suite('Lazy Collections', () => {
        let lazyCollection;
        let normalCollection;
        let removedCalled;
        setup(() => {
            removedCalled = false;
            lazyCollection = {
                ...testCollection,
                id: 'lazy-collection',
                lazy: {
                    isCached: false,
                    load: () => Promise.resolve(),
                    removed: () => { removedCalled = true; }
                }
            };
            normalCollection = {
                ...testCollection,
                id: 'lazy-collection',
                serverDefinitions: observableValue('serverDefs', [baseDefinition])
            };
        });
        test('registers lazy collection', () => {
            const disposable = registry.registerCollection(lazyCollection);
            store.add(disposable);
            assert.strictEqual(registry.collections.get().length, 1);
            assert.strictEqual(registry.collections.get()[0], lazyCollection);
            assert.strictEqual(registry.lazyCollectionState.get().state, 0 /* LazyCollectionState.HasUnknown */);
        });
        test('lazy collection is replaced by normal collection', () => {
            store.add(registry.registerCollection(lazyCollection));
            store.add(registry.registerCollection(normalCollection));
            const collections = registry.collections.get();
            assert.strictEqual(collections.length, 1);
            assert.strictEqual(collections[0], normalCollection);
            assert.strictEqual(collections[0].lazy, undefined);
            assert.strictEqual(registry.lazyCollectionState.get().state, 2 /* LazyCollectionState.AllKnown */);
        });
        test('lazyCollectionState updates correctly during loading', async () => {
            lazyCollection = {
                ...lazyCollection,
                lazy: {
                    ...lazyCollection.lazy,
                    load: async () => {
                        await timeout(0);
                        store.add(registry.registerCollection(normalCollection));
                        return Promise.resolve();
                    }
                }
            };
            store.add(registry.registerCollection(lazyCollection));
            assert.strictEqual(registry.lazyCollectionState.get().state, 0 /* LazyCollectionState.HasUnknown */);
            const loadingPromise = registry.discoverCollections();
            assert.strictEqual(registry.lazyCollectionState.get().state, 1 /* LazyCollectionState.LoadingUnknown */);
            await loadingPromise;
            // The collection wasn't replaced, so it should be removed
            assert.strictEqual(registry.collections.get().length, 1);
            assert.strictEqual(registry.lazyCollectionState.get().state, 2 /* LazyCollectionState.AllKnown */);
            assert.strictEqual(removedCalled, false);
        });
        test('removed callback is called when lazy collection is not replaced', async () => {
            store.add(registry.registerCollection(lazyCollection));
            await registry.discoverCollections();
            assert.strictEqual(removedCalled, true);
        });
        test('cached lazy collections are tracked correctly', () => {
            lazyCollection.lazy.isCached = true;
            store.add(registry.registerCollection(lazyCollection));
            assert.strictEqual(registry.lazyCollectionState.get().state, 2 /* LazyCollectionState.AllKnown */);
            // Adding an uncached lazy collection changes the state
            const uncachedLazy = {
                ...lazyCollection,
                id: 'uncached-lazy',
                lazy: {
                    ...lazyCollection.lazy,
                    isCached: false
                }
            };
            store.add(registry.registerCollection(uncachedLazy));
            assert.strictEqual(registry.lazyCollectionState.get().state, 0 /* LazyCollectionState.HasUnknown */);
        });
    });
    suite('Trust Flow', () => {
        /**
         * Helper to create a test MCP collection with a specific trust behavior
         */
        function createTestCollection(trustBehavior, id = 'test-collection') {
            return {
                id,
                label: 'Test Collection',
                remoteAuthority: null,
                serverDefinitions: observableValue('serverDefs', []),
                trustBehavior,
                scope: -1 /* StorageScope.APPLICATION */,
                configTarget: 2 /* ConfigurationTarget.USER */,
            };
        }
        /**
         * Helper to create a test server definition with a specific cache nonce
         */
        function createTestDefinition(id = 'test-server', cacheNonce = 'nonce-a') {
            return {
                id,
                label: 'Test Server',
                cacheNonce,
                launch: {
                    type: 1 /* McpServerTransportType.Stdio */,
                    command: 'test-command',
                    args: [],
                    env: {},
                    envFile: undefined,
                    cwd: '/test',
                }
            };
        }
        /**
         * Helper to set up a basic registry with delegate and collection
         */
        function setupRegistry(trustBehavior = 1 /* McpServerTrust.Kind.TrustedOnNonce */, cacheNonce = 'nonce-a') {
            const delegate = new TestMcpHostDelegate();
            store.add(registry.registerDelegate(delegate));
            const collection = createTestCollection(trustBehavior);
            const definition = createTestDefinition('test-server', cacheNonce);
            collection.serverDefinitions.set([definition], undefined);
            store.add(registry.registerCollection(collection));
            return { collection, definition, delegate };
        }
        test('trusted collection allows connection without prompting', async () => {
            const { collection, definition } = setupRegistry(0 /* McpServerTrust.Kind.Trusted */);
            const connection = await registry.resolveConnection({
                collectionRef: collection,
                definitionRef: definition,
                logger,
                trustNonceBearer,
            });
            assert.ok(connection, 'Connection should be created for trusted collection');
            assert.strictEqual(registry.nextDefinitionIdsToTrust, undefined, 'Trust dialog should not have been called');
            connection.dispose();
        });
        test('nonce-based trust allows connection when nonce matches', async () => {
            const { collection, definition } = setupRegistry(1 /* McpServerTrust.Kind.TrustedOnNonce */, 'nonce-a');
            trustNonceBearer.trustedAtNonce = 'nonce-a';
            const connection = await registry.resolveConnection({
                collectionRef: collection,
                definitionRef: definition,
                logger,
                trustNonceBearer,
            });
            assert.ok(connection, 'Connection should be created when nonce matches');
            assert.strictEqual(registry.nextDefinitionIdsToTrust, undefined, 'Trust dialog should not have been called');
            connection.dispose();
        });
        test('nonce-based trust prompts when nonce changes', async () => {
            const { collection, definition } = setupRegistry(1 /* McpServerTrust.Kind.TrustedOnNonce */, 'nonce-b');
            trustNonceBearer.trustedAtNonce = 'nonce-a'; // Different nonce
            registry.nextDefinitionIdsToTrust = [definition.id]; // User trusts the server
            const connection = await registry.resolveConnection({
                collectionRef: collection,
                definitionRef: definition,
                logger,
                trustNonceBearer,
            });
            assert.ok(connection, 'Connection should be created when user trusts');
            assert.strictEqual(trustNonceBearer.trustedAtNonce, 'nonce-b', 'Nonce should be updated');
            connection.dispose();
        });
        test('nonce-based trust denies connection when user rejects', async () => {
            const { collection, definition } = setupRegistry(1 /* McpServerTrust.Kind.TrustedOnNonce */, 'nonce-b');
            trustNonceBearer.trustedAtNonce = 'nonce-a'; // Different nonce
            registry.nextDefinitionIdsToTrust = []; // User does not trust the server
            const connection = await registry.resolveConnection({
                collectionRef: collection,
                definitionRef: definition,
                logger,
                trustNonceBearer,
            });
            assert.strictEqual(connection, undefined, 'Connection should not be created when user rejects');
            assert.strictEqual(trustNonceBearer.trustedAtNonce, '__vscode_not_trusted', 'Should mark as explicitly not trusted');
        });
        test('autoTrustChanges bypasses prompt when nonce changes', async () => {
            const { collection, definition } = setupRegistry(1 /* McpServerTrust.Kind.TrustedOnNonce */, 'nonce-b');
            trustNonceBearer.trustedAtNonce = 'nonce-a'; // Different nonce
            const connection = await registry.resolveConnection({
                collectionRef: collection,
                definitionRef: definition,
                logger,
                trustNonceBearer,
                autoTrustChanges: true,
            });
            assert.ok(connection, 'Connection should be created with autoTrustChanges');
            assert.strictEqual(trustNonceBearer.trustedAtNonce, 'nonce-b', 'Nonce should be updated');
            assert.strictEqual(registry.nextDefinitionIdsToTrust, undefined, 'Trust dialog should not have been called');
            connection.dispose();
        });
        test('promptType "never" skips prompt and fails silently', async () => {
            const { collection, definition } = setupRegistry(1 /* McpServerTrust.Kind.TrustedOnNonce */, 'nonce-b');
            trustNonceBearer.trustedAtNonce = 'nonce-a'; // Different nonce
            const connection = await registry.resolveConnection({
                collectionRef: collection,
                definitionRef: definition,
                logger,
                trustNonceBearer,
                promptType: 'never',
            });
            assert.strictEqual(connection, undefined, 'Connection should not be created with promptType "never"');
            assert.strictEqual(registry.nextDefinitionIdsToTrust, undefined, 'Trust dialog should not have been called');
        });
        test('promptType "only-new" skips previously untrusted servers', async () => {
            const { collection, definition } = setupRegistry(1 /* McpServerTrust.Kind.TrustedOnNonce */, 'nonce-b');
            trustNonceBearer.trustedAtNonce = '__vscode_not_trusted'; // Previously explicitly denied
            const connection = await registry.resolveConnection({
                collectionRef: collection,
                definitionRef: definition,
                logger,
                trustNonceBearer,
                promptType: 'only-new',
            });
            assert.strictEqual(connection, undefined, 'Connection should not be created for previously untrusted server');
            assert.strictEqual(registry.nextDefinitionIdsToTrust, undefined, 'Trust dialog should not have been called');
        });
        test('promptType "all-untrusted" prompts for previously untrusted servers', async () => {
            const { collection, definition } = setupRegistry(1 /* McpServerTrust.Kind.TrustedOnNonce */, 'nonce-b');
            trustNonceBearer.trustedAtNonce = '__vscode_not_trusted'; // Previously explicitly denied
            registry.nextDefinitionIdsToTrust = [definition.id]; // User now trusts the server
            const connection = await registry.resolveConnection({
                collectionRef: collection,
                definitionRef: definition,
                logger,
                trustNonceBearer,
                promptType: 'all-untrusted',
            });
            assert.ok(connection, 'Connection should be created when user trusts previously untrusted server');
            assert.strictEqual(trustNonceBearer.trustedAtNonce, 'nonce-b', 'Nonce should be updated');
            connection.dispose();
        });
        test('concurrent resolveConnection calls with same interaction are grouped', async () => {
            const { collection, definition } = setupRegistry(1 /* McpServerTrust.Kind.TrustedOnNonce */, 'nonce-b');
            trustNonceBearer.trustedAtNonce = 'nonce-a'; // Different nonce
            // Create a second definition that also needs trust
            const definition2 = createTestDefinition('test-server-2', 'nonce-c');
            collection.serverDefinitions.set([definition, definition2], undefined);
            // Create shared interaction
            const interaction = new McpStartServerInteraction();
            // Manually set participants as mentioned in the requirements
            interaction.participants.set(definition.id, { s: 'unknown' });
            interaction.participants.set(definition2.id, { s: 'unknown' });
            const trustNonceBearer2 = { trustedAtNonce: 'nonce-b' }; // Different nonce for second server
            // Trust both servers
            registry.nextDefinitionIdsToTrust = [definition.id, definition2.id];
            // Start both connections concurrently with the same interaction
            const [connection1, connection2] = await Promise.all([
                registry.resolveConnection({
                    collectionRef: collection,
                    definitionRef: definition,
                    logger,
                    trustNonceBearer,
                    interaction,
                }),
                registry.resolveConnection({
                    collectionRef: collection,
                    definitionRef: definition2,
                    logger,
                    trustNonceBearer: trustNonceBearer2,
                    interaction,
                })
            ]);
            assert.ok(connection1, 'First connection should be created');
            assert.ok(connection2, 'Second connection should be created');
            assert.strictEqual(trustNonceBearer.trustedAtNonce, 'nonce-b', 'First nonce should be updated');
            assert.strictEqual(trustNonceBearer2.trustedAtNonce, 'nonce-c', 'Second nonce should be updated');
            connection1.dispose();
            connection2.dispose();
        });
        test('user cancelling trust dialog returns undefined for all pending connections', async () => {
            const { collection, definition } = setupRegistry(1 /* McpServerTrust.Kind.TrustedOnNonce */, 'nonce-b');
            trustNonceBearer.trustedAtNonce = 'nonce-a'; // Different nonce
            // Create a second definition that also needs trust
            const definition2 = createTestDefinition('test-server-2', 'nonce-c');
            collection.serverDefinitions.set([definition, definition2], undefined);
            // Create shared interaction
            const interaction = new McpStartServerInteraction();
            // Manually set participants as mentioned in the requirements
            interaction.participants.set(definition.id, { s: 'unknown' });
            interaction.participants.set(definition2.id, { s: 'unknown' });
            const trustNonceBearer2 = { trustedAtNonce: 'nonce-b' }; // Different nonce for second server
            // User cancels the dialog
            registry.nextDefinitionIdsToTrust = undefined;
            // Start both connections concurrently with the same interaction
            const [connection1, connection2] = await Promise.all([
                registry.resolveConnection({
                    collectionRef: collection,
                    definitionRef: definition,
                    logger,
                    trustNonceBearer,
                    interaction,
                }),
                registry.resolveConnection({
                    collectionRef: collection,
                    definitionRef: definition2,
                    logger,
                    trustNonceBearer: trustNonceBearer2,
                    interaction,
                })
            ]);
            assert.strictEqual(connection1, undefined, 'First connection should not be created when user cancels');
            assert.strictEqual(connection2, undefined, 'Second connection should not be created when user cancels');
        });
        test('partial trust selection in grouped interaction', async () => {
            const { collection, definition } = setupRegistry(1 /* McpServerTrust.Kind.TrustedOnNonce */, 'nonce-b');
            trustNonceBearer.trustedAtNonce = 'nonce-a'; // Different nonce
            // Create a second definition that also needs trust
            const definition2 = createTestDefinition('test-server-2', 'nonce-c');
            collection.serverDefinitions.set([definition, definition2], undefined);
            // Create shared interaction
            const interaction = new McpStartServerInteraction();
            // Manually set participants as mentioned in the requirements
            interaction.participants.set(definition.id, { s: 'unknown' });
            interaction.participants.set(definition2.id, { s: 'unknown' });
            const trustNonceBearer2 = { trustedAtNonce: 'nonce-b' }; // Different nonce for second server
            // User trusts only the first server
            registry.nextDefinitionIdsToTrust = [definition.id];
            // Start both connections concurrently with the same interaction
            const [connection1, connection2] = await Promise.all([
                registry.resolveConnection({
                    collectionRef: collection,
                    definitionRef: definition,
                    logger,
                    trustNonceBearer,
                    interaction,
                }),
                registry.resolveConnection({
                    collectionRef: collection,
                    definitionRef: definition2,
                    logger,
                    trustNonceBearer: trustNonceBearer2,
                    interaction,
                })
            ]);
            assert.ok(connection1, 'First connection should be created when trusted');
            assert.strictEqual(connection2, undefined, 'Second connection should not be created when not trusted');
            assert.strictEqual(trustNonceBearer.trustedAtNonce, 'nonce-b', 'First nonce should be updated');
            assert.strictEqual(trustNonceBearer2.trustedAtNonce, '__vscode_not_trusted', 'Second nonce should be marked as not trusted');
            connection1.dispose();
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWNwUmVnaXN0cnkudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL2FkdmlrYXIvRG9jdW1lbnRzL2FyY2hpdGVjdC9hcmNoMi9BcmNoSURFL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL21jcC90ZXN0L2NvbW1vbi9tY3BSZWdpc3RyeS50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQ2pDLE9BQU8sS0FBSyxLQUFLLE1BQU0sT0FBTyxDQUFDO0FBQy9CLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUM5RCxPQUFPLEVBQXVCLGVBQWUsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBQ2hHLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUM3RCxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUNuRyxPQUFPLEVBQXVCLHFCQUFxQixFQUFFLE1BQU0sK0RBQStELENBQUM7QUFDM0gsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sK0VBQStFLENBQUM7QUFDekgsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBQ25GLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG1FQUFtRSxDQUFDO0FBQ3RHLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLCtFQUErRSxDQUFDO0FBQ3pILE9BQU8sRUFBVyxjQUFjLEVBQUUsV0FBVyxFQUFFLFVBQVUsRUFBRSxjQUFjLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUM3SCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxxREFBcUQsQ0FBQztBQUN2RixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sMERBQTBELENBQUM7QUFDM0YsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sbURBQW1ELENB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