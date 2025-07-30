/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { AsyncIterableSource, DeferredPromise, timeout } from '../../../../../base/common/async.js';
import { CancellationTokenSource } from '../../../../../base/common/cancellation.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { mock } from '../../../../../base/test/common/mock.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { NullLogService } from '../../../../../platform/log/common/log.js';
import { languageModelExtensionPoint, LanguageModelsService } from '../../common/languageModels.js';
import { nullExtensionDescription } from '../../../../services/extensions/common/extensions.js';
import { ExtensionsRegistry } from '../../../../services/extensions/common/extensionsRegistry.js';
import { DEFAULT_MODEL_PICKER_CATEGORY } from '../../common/modelPicker/modelPickerWidget.js';
import { TestStorageService } from '../../../../test/common/workbenchTestServices.js';
import { Event } from '../../../../../base/common/event.js';
suite('LanguageModels', function () {
    let languageModels;
    const store = new DisposableStore();
    const activationEvents = new Set();
    setup(function () {
        languageModels = new LanguageModelsService(new class extends mock() {
            activateByEvent(name) {
                activationEvents.add(name);
                return Promise.resolve();
            }
        }, new NullLogService(), new TestStorageService());
        const ext = ExtensionsRegistry.getExtensionPoints().find(e => e.name === languageModelExtensionPoint.name);
        ext.acceptUsers([{
                description: { ...nullExtensionDescription, enabledApiProposals: ['chatProvider'] },
                value: { vendor: 'test-vendor' },
                collector: null
            }, {
                description: { ...nullExtensionDescription, enabledApiProposals: ['chatProvider'] },
                value: { vendor: 'actual-vendor' },
                collector: null
            }]);
        store.add(languageModels.registerLanguageModelProvider('test-vendor', {
            onDidChange: Event.None,
            prepareLanguageModelChat: async () => {
                const modelMetadata = [
                    {
                        extension: nullExtensionDescription.identifier,
                        name: 'Pretty Name',
                        vendor: 'test-vendor',
                        family: 'test-family',
                        version: 'test-version',
                        modelPickerCategory: undefined,
                        id: 'test-id-1',
                        maxInputTokens: 100,
                        maxOutputTokens: 100,
                    },
                    {
                        extension: nullExtensionDescription.identifier,
                        name: 'Pretty Name',
                        vendor: 'test-vendor',
                        family: 'test2-family',
                        version: 'test2-version',
                        modelPickerCategory: undefined,
                        id: 'test-id-12',
                        maxInputTokens: 100,
                        maxOutputTokens: 100,
                    }
                ];
                const modelMetadataAndIdentifier = modelMetadata.map(m => ({
                    metadata: m,
                    identifier: m.id,
                }));
                return modelMetadataAndIdentifier;
            },
            sendChatRequest: async () => {
                throw new Error();
            },
            provideTokenCount: async () => {
                throw new Error();
            }
        }));
    });
    teardown(function () {
        languageModels.dispose();
        activationEvents.clear();
        store.clear();
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    test('empty selector returns all', async function () {
        const result1 = await languageModels.selectLanguageModels({});
        assert.deepStrictEqual(result1.length, 2);
        assert.deepStrictEqual(result1[0], 'test-id-1');
        assert.deepStrictEqual(result1[1], 'test-id-12');
    });
    test('selector with id works properly', async function () {
        const result1 = await languageModels.selectLanguageModels({ id: 'test-id-1' });
        assert.deepStrictEqual(result1.length, 1);
        assert.deepStrictEqual(result1[0], 'test-id-1');
    });
    test('no warning that a matching model was not found #213716', async function () {
        const result1 = await languageModels.selectLanguageModels({ vendor: 'test-vendor' });
        assert.deepStrictEqual(result1.length, 2);
        const result2 = await languageModels.selectLanguageModels({ vendor: 'test-vendor', family: 'FAKE' });
        assert.deepStrictEqual(result2.length, 0);
    });
    test('sendChatRequest returns a response-stream', async function () {
        store.add(languageModels.registerLanguageModelProvider('actual-vendor', {
            onDidChange: Event.None,
            prepareLanguageModelChat: async () => {
                const modelMetadata = [
                    {
                        extension: nullExtensionDescription.identifier,
                        name: 'Pretty Name',
                        vendor: 'actual-vendor',
                        family: 'actual-family',
                        version: 'actual-version',
                        id: 'actual-lm',
                        maxInputTokens: 100,
                        maxOutputTokens: 100,
                        modelPickerCategory: DEFAULT_MODEL_PICKER_CATEGORY,
                    }
                ];
                const modelMetadataAndIdentifier = modelMetadata.map(m => ({
                    metadata: m,
                    identifier: m.id,
                }));
                return modelMetadataAndIdentifier;
            },
            sendChatRequest: async (modelId, messages, _from, _options, token) => {
                // const message = messages.at(-1);
                const defer = new DeferredPromise();
                const stream = new AsyncIterableSource();
                (async () => {
                    while (!token.isCancellationRequested) {
                        stream.emitOne({ index: 0, part: { type: 'text', value: Date.now().toString() } });
                        await timeout(10);
                    }
                    defer.complete(undefined);
                })();
                return {
                    stream: stream.asyncIterable,
                    result: defer.p
                };
            },
            provideTokenCount: async () => {
                throw new Error();
            }
        }));
        // Register the extension point for the actual vendor
        const ext = ExtensionsRegistry.getExtensionPoints().find(e => e.name === languageModelExtensionPoint.name);
        ext.acceptUsers([{
                description: { ...nullExtensionDescription, enabledApiProposals: ['chatProvider'] },
                value: { vendor: 'actual-vendor' },
                collector: null
            }]);
        const models = await languageModels.selectLanguageModels({ id: 'actual-lm' });
        assert.ok(models.length === 1);
        const first = models[0];
        const cts = new CancellationTokenSource();
        const request = await languageModels.sendChatRequest(first, nullExtensionDescription.identifier, [{ role: 1 /* ChatMessageRole.User */, content: [{ type: 'text', value: 'hello' }] }], {}, cts.token);
        assert.ok(request);
        cts.dispose(true);
        await request.result;
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGFuZ3VhZ2VNb2RlbHMudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL2FkdmlrYXIvRG9jdW1lbnRzL2FyY2hpdGVjdC9hcmNoMi9BcmNoSURFL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvdGVzdC9jb21tb24vbGFuZ3VhZ2VNb2RlbHMudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLG1CQUFtQixFQUFFLGVBQWUsRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUNwRyxPQUFPLEVBQXFCLHVCQUF1QixFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDeEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQzFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUMvRCxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUNuRyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFDM0UsT0FBTyxFQUEwQywyQkFBMkIsRUFBRSxxQkFBcUIsRUFBZ0IsTUFBTSxnQ0FBZ0MsQ0FBQztBQUMxSixPQUFPLEVBQXFCLHdCQUF3QixFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDbkgsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sOERBQThELENBQUM7QUFDbEcsT0FBTyxFQUFFLDZCQUE2QixFQUFFLE1BQU0sK0NBQStDLENBQUM7QUFFOUYsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDdEYsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBRTVELEtBQUssQ0FBQyxnQkFBZ0IsRUFBRTtJQUV2QixJQUFJLGNBQXFDLENBQUM7SUFFMUMsTUFBTSxLQUFLLEdB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