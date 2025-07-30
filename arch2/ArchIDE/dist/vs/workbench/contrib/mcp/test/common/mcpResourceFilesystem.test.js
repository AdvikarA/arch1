/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as assert from 'assert';
import { Barrier, timeout } from '../../../../../base/common/async.js';
import { URI } from '../../../../../base/common/uri.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { FileSystemProviderErrorCode, FileType, IFileService } from '../../../../../platform/files/common/files.js';
import { ServiceCollection } from '../../../../../platform/instantiation/common/serviceCollection.js';
import { TestInstantiationService } from '../../../../../platform/instantiation/test/common/instantiationServiceMock.js';
import { ILoggerService, NullLogService } from '../../../../../platform/log/common/log.js';
import { IProductService } from '../../../../../platform/product/common/productService.js';
import { IStorageService } from '../../../../../platform/storage/common/storage.js';
import { ITelemetryService } from '../../../../../platform/telemetry/common/telemetry.js';
import { NullTelemetryService } from '../../../../../platform/telemetry/common/telemetryUtils.js';
import { IWorkspaceContextService } from '../../../../../platform/workspace/common/workspace.js';
import { TestContextService, TestLoggerService, TestProductService, TestStorageService } from '../../../../test/common/workbenchTestServices.js';
import { IMcpRegistry } from '../../common/mcpRegistryTypes.js';
import { McpResourceFilesystem } from '../../common/mcpResourceFilesystem.js';
import { McpService } from '../../common/mcpService.js';
import { IMcpService } from '../../common/mcpTypes.js';
import { TestMcpMessageTransport, TestMcpRegistry } from './mcpRegistryTypes.js';
suite('Workbench - MCP - ResourceFilesystem', () => {
    const ds = ensureNoDisposablesAreLeakedInTestSuite();
    let transport;
    let fs;
    setup(() => {
        const services = new ServiceCollection([IFileService, { registerProvider: () => { } }], [IStorageService, ds.add(new TestStorageService())], [ILoggerService, ds.add(new TestLoggerService())], [IWorkspaceContextService, new TestContextService()], [ITelemetryService, NullTelemetryService], [IProductService, TestProductService]);
        const parentInsta1 = ds.add(new TestInstantiationService(services));
        const registry = new TestMcpRegistry(parentInsta1);
        const parentInsta2 = ds.add(parentInsta1.createChild(new ServiceCollection([IMcpRegistry, registry])));
        const mcpService = ds.add(new McpService(parentInsta2, registry, new NullLogService()));
        mcpService.updateCollectedServers();
        const instaService = ds.add(parentInsta2.createChild(new ServiceCollection([IMcpRegistry, registry], [IMcpService, mcpService])));
        fs = ds.add(instaService.createInstance(McpResourceFilesystem));
        transport = ds.add(new TestMcpMessageTransport());
        registry.makeTestTransport = () => transport;
    });
    test('reads a basic file', async () => {
        transport.setResponder('resources/read', msg => {
            assert.strictEqual(msg.params.uri, 'custom://hello/world.txt');
            return {
                id: msg.id,
                jsonrpc: '2.0',
                result: {
                    contents: [{ uri: msg.params.uri, text: 'Hello World' }],
                }
            };
        });
        const response = await fs.readFile(URI.parse('mcp-resource://746573742D736572766572/custom/hello/world.txt'));
        assert.strictEqual(new TextDecoder().decode(response), 'Hello World');
    });
    test('stat returns file information', async () => {
        transport.setResponder('resources/read', msg => {
            assert.strictEqual(msg.params.uri, 'custom://hello/world.txt');
            return {
                id: msg.id,
                jsonrpc: '2.0',
                result: {
                    contents: [{ uri: msg.params.uri, text: 'Hello World' }],
                }
            };
        });
        const fileStats = await fs.stat(URI.parse('mcp-resource://746573742D736572766572/custom/hello/world.txt'));
        assert.strictEqual(fileStats.type, FileType.File);
        assert.strictEqual(fileStats.size, 'Hello World'.length);
    });
    test('stat returns directory information', async () => {
        transport.setResponder('resources/read', msg => {
            assert.strictEqual(msg.params.uri, 'custom://hello');
            return {
                id: msg.id,
                jsonrpc: '2.0',
                result: {
                    contents: [
                        { uri: 'custom://hello/file1.txt', text: 'File 1' },
                        { uri: 'custom://hello/file2.txt', text: 'File 2' },
                    ],
                }
            };
        });
        const dirStats = await fs.stat(URI.parse('mcp-resource://746573742D736572766572/custom/hello/'));
        assert.strictEqual(dirStats.type, FileType.Directory);
        // Size should be sum of all file contents in the directory
        assert.strictEqual(dirStats.size, 'File 1'.length + 'File 2'.length);
    });
    test('stat throws FileNotFound for nonexistent resources', async () => {
        transport.setResponder('resources/read', msg => {
            return {
                id: msg.id,
                jsonrpc: '2.0',
                result: {
                    contents: [],
                }
            };
        });
        await assert.rejects(() => fs.stat(URI.parse('mcp-resource://746573742D736572766572/custom/nonexistent.txt')), (err) => err.code === FileSystemProviderErrorCode.FileNotFound);
    });
    test('readdir returns directory contents', async () => {
        transport.setResponder('resources/read', msg => {
            assert.strictEqual(msg.params.uri, 'custom://hello/dir');
            return {
                id: msg.id,
                jsonrpc: '2.0',
                result: {
                    contents: [
                        { uri: 'custom://hello/dir/file1.txt', text: 'File 1' },
                        { uri: 'custom://hello/dir/file2.txt', text: 'File 2' },
                        { uri: 'custom://hello/dir/subdir/file3.txt', text: 'File 3' },
                    ],
                }
            };
        });
        const dirEntries = await fs.readdir(URI.parse('mcp-resource://746573742D736572766572/custom/hello/dir/'));
        assert.deepStrictEqual(dirEntries, [
            ['file1.txt', FileType.File],
            ['file2.txt', FileType.File],
            ['subdir', FileType.Directory],
        ]);
    });
    test('readdir throws when reading a file as directory', async () => {
        transport.setResponder('resources/read', msg => {
            return {
                id: msg.id,
                jsonrpc: '2.0',
                result: {
                    contents: [{ uri: msg.params.uri, text: 'This is a file' }],
                }
            };
        });
        await assert.rejects(() => fs.readdir(URI.parse('mcp-resource://746573742D736572766572/custom/hello/file.txt')), (err) => err.code === FileSystemProviderErrorCode.FileNotADirectory);
    });
    test('watch file emits change events', async () => {
        // Set up the responder for resource reading
        transport.setResponder('resources/read', msg => {
            return {
                id: msg.id,
                jsonrpc: '2.0',
                result: {
                    contents: [{ uri: msg.params.uri, text: 'File content' }],
                }
            };
        });
        const didSubscribe = new Barrier();
        // Set up the responder for resource subscription
        transport.setResponder('resources/subscribe', msg => {
            didSubscribe.open();
            return {
                id: msg.id,
                jsonrpc: '2.0',
                result: {},
            };
        });
        const uri = URI.parse('mcp-resource://746573742D736572766572/custom/hello/file.txt');
        const fileChanges = [];
        // Create a listener for file change events
        const disposable = fs.onDidChangeFile(events => {
            fileChanges.push(...events);
        });
        // Start watching the file
        const watchDisposable = fs.watch(uri, { excludes: [], recursive: false });
        // Simulate a file update notification from the server
        await didSubscribe.wait();
        await timeout(10); // wait for listeners to attach
        transport.simulateReceiveMessage({
            jsonrpc: '2.0',
            method: 'notifications/resources/updated',
            params: {
                uri: 'custom://hello/file.txt',
            },
        });
        transport.simulateReceiveMessage({
            jsonrpc: '2.0',
            method: 'notifications/resources/updated',
            params: {
                uri: 'custom://hello/unrelated.txt',
            },
        });
        // Check that we received a file change event
        assert.strictEqual(fileChanges.length, 1);
        assert.strictEqual(fileChanges[0].type, 0 /* FileChangeType.UPDATED */);
        assert.strictEqual(fileChanges[0].resource.toString(), uri.toString());
        // Clean up
        disposable.dispose();
        watchDisposable.dispose();
    });
    test('read blob resource', async () => {
        const blobBase64 = 'SGVsbG8gV29ybGQgYXMgQmxvYg=='; // "Hello World as Blob" in base64
        transport.setResponder('resources/read', msg => {
            assert.strictEqual(msg.params.uri, 'custom://hello/blob.bin');
            return {
                id: msg.id,
                jsonrpc: '2.0',
                result: {
                    contents: [{ uri: msg.params.uri, blob: blobBase64 }],
                }
            };
        });
        const response = await fs.readFile(URI.parse('mcp-resource://746573742D736572766572/custom/hello/blob.bin'));
        assert.strictEqual(new TextDecoder().decode(response), 'Hello World as Blob');
    });
    test('throws error for write operations', async () => {
        const uri = URI.parse('mcp-resource://746573742D736572766572/custom/hello/file.txt');
        await assert.rejects(async () => fs.writeFile(uri, new Uint8Array(), { create: true, overwrite: true, atomic: false, unlock: false }), (err) => err.code === FileSystemProviderErrorCode.NoPermissions);
        await assert.rejects(async () => fs.delete(uri, { recursive: false, useTrash: false, atomic: false }), (err) => err.code === FileSystemProviderErrorCode.NoPermissions);
        await assert.rejects(async () => fs.mkdir(uri), (err) => err.code === FileSystemProviderErrorCode.NoPermissions);
        await assert.rejects(async () => fs.rename(uri, URI.parse('mcp-resource://746573742D736572766572/custom/hello/newfile.txt'), { overwrite: false }), (err) => err.code === FileSystemProviderErrorCode.NoPermissions);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWNwUmVzb3VyY2VGaWxlc3lzdGVtLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9hZHZpa2FyL0RvY3VtZW50cy9hcmNoaXRlY3QvYXJjaDIvQXJjaElERS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9tY3AvdGVzdC9jb21tb24vbWNwUmVzb3VyY2VGaWxlc3lzdGVtLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDakMsT0FBTyxFQUFFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUN2RSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDeEQsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDbkcsT0FBTyxFQUFrQiwyQkFBMkIsRUFBRSxRQUFRLEVBQWUsWUFBWSxFQUFFLE1BQU0sK0NBQStDLENBQUM7QUFDakosT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sbUVBQW1FLENBQUM7QUFDdEcsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sK0VBQStFLENBQUM7QUFDekgsT0FBTyxFQUFFLGNBQWMsRUFBRSxjQUFjLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUMzRixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sMERBQTBELENBQUM7QUFDM0YsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBQ3BGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHVEQUF1RCxDQUFDO0FBQzFGLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ2xHLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLHVEQUF1RCxDQUFDO0FBQ2pHLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxpQkFBaUIsRUFBRSxrQkFBa0Is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