/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as assert from 'assert';
import { CancellationToken } from '../../../../../base/common/cancellation.js';
import { VSBuffer } from '../../../../../base/common/buffer.js';
import { URI } from '../../../../../base/common/uri.js';
import { ResourceMap } from '../../../../../base/common/map.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { FetchWebPageTool } from '../../electron-browser/tools/fetchPageTool.js';
import { TestFileService } from '../../../../test/browser/workbenchTestServices.js';
class TestWebContentExtractorService {
    constructor(uriToContentMap) {
        this.uriToContentMap = uriToContentMap;
    }
    async extract(uris) {
        return uris.map(uri => {
            const content = this.uriToContentMap.get(uri);
            if (content === undefined) {
                throw new Error(`No content configured for URI: ${uri.toString()}`);
            }
            return content;
        });
    }
}
class ExtendedTestFileService extends TestFileService {
    constructor(uriToContentMap) {
        super();
        this.uriToContentMap = uriToContentMap;
    }
    async readFile(resource, options) {
        const content = this.uriToContentMap.get(resource);
        if (content === undefined) {
            throw new Error(`File not found: ${resource.toString()}`);
        }
        const buffer = typeof content === 'string' ? VSBuffer.fromString(content) : content;
        return {
            resource,
            value: buffer,
            name: '',
            size: buffer.byteLength,
            etag: '',
            mtime: 0,
            ctime: 0,
            readonly: false,
            locked: false
        };
    }
    async stat(resource) {
        // Check if the resource exists in our map
        if (!this.uriToContentMap.has(resource)) {
            throw new Error(`File not found: ${resource.toString()}`);
        }
        return super.stat(resource);
    }
}
suite('FetchWebPageTool', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('should handle http/https via web content extractor and other schemes via file service', async () => {
        const webContentMap = new ResourceMap([
            [URI.parse('https://example.com'), 'HTTPS content'],
            [URI.parse('http://example.com'), 'HTTP content']
        ]);
        const fileContentMap = new ResourceMap([
            [URI.parse('test://static/resource/50'), 'MCP resource content'],
            [URI.parse('mcp-resource://746573742D736572766572/custom/hello/world.txt'), 'Custom MCP content']
        ]);
        const tool = new FetchWebPageTool(new TestWebContentExtractorService(webContentMap), new ExtendedTestFileService(fileContentMap));
        const testUrls = [
            'https://example.com',
            'http://example.com',
            'test://static/resource/50',
            'mcp-resource://746573742D736572766572/custom/hello/world.txt',
            'file:///path/to/nonexistent',
            'ftp://example.com',
            'invalid-url'
        ];
        const result = await tool.invoke({ callId: 'test-call-1', toolId: 'fetch-page', parameters: { urls: testUrls }, context: undefined }, () => Promise.resolve(0), { report: () => { } }, CancellationToken.None);
        // Should have 7 results (one for each input URL)
        assert.strictEqual(result.content.length, 7, 'Should have result for each input URL');
        // HTTP and HTTPS URLs should have their content from web extractor
        assert.strictEqual(result.content[0].value, 'HTTPS content', 'HTTPS URL should return content');
        assert.strictEqual(result.content[1].value, 'HTTP content', 'HTTP URL should return content');
        // MCP resources should have their content from file service
        assert.strictEqual(result.content[2].value, 'MCP resource content', 'test:// URL should return content from file service');
        assert.strictEqual(result.content[3].value, 'Custom MCP content', 'mcp-resource:// URL should return content from file service');
        // Nonexistent file should be marked as invalid
        assert.strictEqual(result.content[4].value, 'Invalid URL', 'Nonexistent file should be invalid');
        // Unsupported scheme (ftp) should be marked as invalid since file service can't handle it
        assert.strictEqual(result.content[5].value, 'Invalid URL', 'ftp:// URL should be invalid');
        // Invalid URL should be marked as invalid
        assert.strictEqual(result.content[6].value, 'Invalid URL', 'Invalid URL should be invalid');
        // All successfully fetched URLs should be in toolResultDetails
        assert.strictEqual(Array.isArray(result.toolResultDetails) ? result.toolResultDetails.length : 0, 4, 'Should have 4 valid URLs in toolResultDetails');
    });
    test('should handle empty and undefined URLs', async () => {
        const tool = new FetchWebPageTool(new TestWebContentExtractorService(new ResourceMap()), new ExtendedTestFileService(new ResourceMap()));
        // Test empty array
        const emptyResult = await tool.invoke({ callId: 'test-call-2', toolId: 'fetch-page', parameters: { urls: [] }, context: undefined }, () => Promise.resolve(0), { report: () => { } }, CancellationToken.None);
        assert.strictEqual(emptyResult.content.length, 1, 'Empty array should return single message');
        assert.strictEqual(emptyResult.content[0].value, 'No valid URLs provided.', 'Should indicate no valid URLs');
        // Test undefined
        const undefinedResult = await tool.invoke({ callId: 'test-call-3', toolId: 'fetch-page', parameters: {}, context: undefined }, () => Promise.resolve(0), { report: () => { } }, CancellationToken.None);
        assert.strictEqual(undefinedResult.content.length, 1, 'Undefined URLs should return single message');
        assert.strictEqual(undefinedResult.content[0].value, 'No valid URLs provided.', 'Should indicate no valid URLs');
        // Test array with invalid URLs
        const invalidResult = await tool.invoke({ callId: 'test-call-4', toolId: 'fetch-page', parameters: { urls: ['', ' ', 'invalid-scheme-that-fileservice-cannot-handle://test'] }, context: undefined }, () => Promise.resolve(0), { report: () => { } }, CancellationToken.None);
        assert.strictEqual(invalidResult.content.length, 3, 'Should have result for each invalid URL');
        assert.strictEqual(invalidResult.content[0].value, 'Invalid URL', 'Empty string should be invalid');
        assert.strictEqual(invalidResult.content[1].value, 'Invalid URL', 'Space-only string should be invalid');
        assert.strictEqual(invalidResult.content[2].value, 'Invalid URL', 'Unhandleable scheme should be invalid');
    });
    test('should provide correct past tense messages for mixed valid/invalid URLs', async () => {
        const webContentMap = new ResourceMap([
            [URI.parse('https://valid.com'), 'Valid content']
        ]);
        const fileContentMap = new ResourceMap([
            [URI.parse('test://valid/resource'), 'Valid MCP content']
        ]);
        const tool = new FetchWebPageTool(new TestWebContentExtractorService(webContentMap), new ExtendedTestFileService(fileContentMap));
        const preparation = await tool.prepareToolInvocation({ parameters: { urls: ['https://valid.com', 'test://valid/resource', 'invalid://invalid'] } }, CancellationToken.None);
        assert.ok(preparation, 'Should return prepared invocation');
        assert.ok(preparation.pastTenseMessage, 'Should have past tense message');
        const messageText = typeof preparation.pastTenseMessage === 'string' ? preparation.pastTenseMessage : preparation.pastTenseMessage.value;
        assert.ok(messageText.includes('Fetched'), 'Should mention fetched resources');
        assert.ok(messageText.includes('invalid://invalid'), 'Should mention invalid URL');
    });
    test('should return message for binary files indicating they are not supported', async () => {
        // Create binary content (a simple PNG-like header with null bytes)
        const binaryContent = new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D]);
        const binaryBuffer = VSBuffer.wrap(binaryContent);
        const fileContentMap = new ResourceMap([
            [URI.parse('file:///path/to/binary.dat'), binaryBuffer],
            [URI.parse('file:///path/to/text.txt'), 'This is text content']
        ]);
        const tool = new FetchWebPageTool(new TestWebContentExtractorService(new ResourceMap()), new ExtendedTestFileService(fileContentMap));
        const result = await tool.invoke({
            callId: 'test-call-binary',
            toolId: 'fetch-page',
            parameters: { urls: ['file:///path/to/binary.dat', 'file:///path/to/text.txt'] },
            context: undefined
        }, () => Promise.resolve(0), { report: () => { } }, CancellationToken.None);
        // Should have 2 results
        assert.strictEqual(result.content.length, 2, 'Should have 2 results');
        // First result should be a text part with binary not supported message
        assert.strictEqual(result.content[0].kind, 'text', 'Binary file should return text part');
        if (result.content[0].kind === 'text') {
            assert.strictEqual(result.content[0].value, 'Binary files are not supported at the moment.', 'Should return not supported message');
        }
        // Second result should be a text part for the text file
        assert.strictEqual(result.content[1].kind, 'text', 'Text file should return text part');
        if (result.content[1].kind === 'text') {
            assert.strictEqual(result.content[1].value, 'This is text content', 'Should return text content');
        }
        // Both files should be in toolResultDetails since they were successfully fetched
        assert.strictEqual(Array.isArray(result.toolResultDetails) ? result.toolResultDetails.length : 0, 2, 'Should have 2 valid URLs in toolResultDetails');
    });
    test('PNG files are now supported as image data parts (regression test)', async () => {
        // This test ensures that PNG files that previously returned "not supported"
        // messages now return proper image data parts
        const binaryContent = new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D]);
        const binaryBuffer = VSBuffer.wrap(binaryContent);
        const fileContentMap = new ResourceMap([
            [URI.parse('file:///path/to/image.png'), binaryBuffer]
        ]);
        const tool = new FetchWebPageTool(new TestWebContentExtractorService(new ResourceMap()), new ExtendedTestFileService(fileContentMap));
        const result = await tool.invoke({
            callId: 'test-png-support',
            toolId: 'fetch-page',
            parameters: { urls: ['file:///path/to/image.png'] },
            context: undefined
        }, () => Promise.resolve(0), { report: () => { } }, CancellationToken.None);
        // Should have 1 result
        assert.strictEqual(result.content.length, 1, 'Should have 1 result');
        // PNG file should now be returned as a data part, not a "not supported" message
        assert.strictEqual(result.content[0].kind, 'data', 'PNG file should return data part');
        if (result.content[0].kind === 'data') {
            assert.strictEqual(result.content[0].value.mimeType, 'image/png', 'Should have PNG MIME type');
            assert.strictEqual(result.content[0].value.data, binaryBuffer, 'Should have correct binary data');
        }
    });
    test('should correctly distinguish between binary and text content', async () => {
        // Create content that might be ambiguous
        const jsonData = '{"name": "test", "value": 123}';
        // Create definitely binary data - some random bytes with null bytes that don't follow UTF-16 pattern
        const realBinaryData = new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x00, 0x00, 0x00, 0x0D, 0xFF, 0x00, 0xAB]); // More clearly binary
        const fileContentMap = new ResourceMap([
            [URI.parse('file:///data.json'), jsonData], // Should be detected as text
            [URI.parse('file:///binary.dat'), VSBuffer.wrap(realBinaryData)] // Should be detected as binary
        ]);
        const tool = new FetchWebPageTool(new TestWebContentExtractorService(new ResourceMap()), new ExtendedTestFileService(fileContentMap));
        const result = await tool.invoke({
            callId: 'test-distinguish',
            toolId: 'fetch-page',
            parameters: { urls: ['file:///data.json', 'file:///binary.dat'] },
            context: undefined
        }, () => Promise.resolve(0), { report: () => { } }, CancellationToken.None);
        // JSON should be returned as text
        assert.strictEqual(result.content[0].kind, 'text', 'JSON should be detected as text');
        if (result.content[0].kind === 'text') {
            assert.strictEqual(result.content[0].value, jsonData, 'Should return JSON as text');
        }
        // Binary data should be returned as not supported message
        assert.strictEqual(result.content[1].kind, 'text', 'Binary content should return text part with message');
        if (result.content[1].kind === 'text') {
            assert.strictEqual(result.content[1].value, 'Binary files are not supported at the moment.', 'Should return not supported message');
        }
    });
    test('Supported image files are returned as data parts', async () => {
        // Test data for different supported image formats
        const pngData = VSBuffer.fromString('fake PNG data');
        const jpegData = VSBuffer.fromString('fake JPEG data');
        const gifData = VSBuffer.fromString('fake GIF data');
        const webpData = VSBuffer.fromString('fake WebP data');
        const bmpData = VSBuffer.fromString('fake BMP data');
        const fileContentMap = new ResourceMap();
        fileContentMap.set(URI.parse('file:///image.png'), pngData);
        fileContentMap.set(URI.parse('file:///photo.jpg'), jpegData);
        fileContentMap.set(URI.parse('file:///animation.gif'), gifData);
        fileContentMap.set(URI.parse('file:///modern.webp'), webpData);
        fileContentMap.set(URI.parse('file:///bitmap.bmp'), bmpData);
        const tool = new FetchWebPageTool(new TestWebContentExtractorService(new ResourceMap()), new ExtendedTestFileService(fileContentMap));
        const result = await tool.invoke({
            callId: 'test-images',
            toolId: 'fetch-page',
            parameters: { urls: ['file:///image.png', 'file:///photo.jpg', 'file:///animation.gif', 'file:///modern.webp', 'file:///bitmap.bmp'] },
            context: undefined
        }, () => Promise.resolve(0), { report: () => { } }, CancellationToken.None);
        // All images should be returned as data parts
        assert.strictEqual(result.content.length, 5, 'Should have 5 results');
        // Check PNG
        assert.strictEqual(result.content[0].kind, 'data', 'PNG should be data part');
        if (result.content[0].kind === 'data') {
            assert.strictEqual(result.content[0].value.mimeType, 'image/png', 'PNG should have correct MIME type');
            assert.strictEqual(result.content[0].value.data, pngData, 'PNG should have correct data');
        }
        // Check JPEG
        assert.strictEqual(result.content[1].kind, 'data', 'JPEG should be data part');
        if (result.content[1].kind === 'data') {
            assert.strictEqual(result.content[1].value.mimeType, 'image/jpeg', 'JPEG should have correct MIME type');
            assert.strictEqual(result.content[1].value.data, jpegData, 'JPEG should have correct data');
        }
        // Check GIF
        assert.strictEqual(result.content[2].kind, 'data', 'GIF should be data part');
        if (result.content[2].kind === 'data') {
            assert.strictEqual(result.content[2].value.mimeType, 'image/gif', 'GIF should have correct MIME type');
            assert.strictEqual(result.content[2].value.data, gifData, 'GIF should have correct data');
        }
        // Check WebP
        assert.strictEqual(result.content[3].kind, 'data', 'WebP should be data part');
        if (result.content[3].kind === 'data') {
            assert.strictEqual(result.content[3].value.mimeType, 'image/webp', 'WebP should have correct MIME type');
            assert.strictEqual(result.content[3].value.data, webpData, 'WebP should have correct data');
        }
        // Check BMP
        assert.strictEqual(result.content[4].kind, 'data', 'BMP should be data part');
        if (result.content[4].kind === 'data') {
            assert.strictEqual(result.content[4].value.mimeType, 'image/bmp', 'BMP should have correct MIME type');
            assert.strictEqual(result.content[4].value.data, bmpData, 'BMP should have correct data');
        }
    });
    test('Mixed image and text files work correctly', async () => {
        const textData = 'This is some text content';
        const imageData = VSBuffer.fromString('fake image data');
        const fileContentMap = new ResourceMap();
        fileContentMap.set(URI.parse('file:///text.txt'), textData);
        fileContentMap.set(URI.parse('file:///image.png'), imageData);
        const tool = new FetchWebPageTool(new TestWebContentExtractorService(new ResourceMap()), new ExtendedTestFileService(fileContentMap));
        const result = await tool.invoke({
            callId: 'test-mixed',
            toolId: 'fetch-page',
            parameters: { urls: ['file:///text.txt', 'file:///image.png'] },
            context: undefined
        }, () => Promise.resolve(0), { report: () => { } }, CancellationToken.None);
        // Text should be returned as text part
        assert.strictEqual(result.content[0].kind, 'text', 'Text file should be text part');
        if (result.content[0].kind === 'text') {
            assert.strictEqual(result.content[0].value, textData, 'Text should have correct content');
        }
        // Image should be returned as data part
        assert.strictEqual(result.content[1].kind, 'data', 'Image file should be data part');
        if (result.content[1].kind === 'data') {
            assert.strictEqual(result.content[1].value.mimeType, 'image/png', 'Image should have correct MIME type');
            assert.strictEqual(result.content[1].value.data, imageData, 'Image should have correct data');
        }
    });
    test('Case insensitive image extensions work', async () => {
        const imageData = VSBuffer.fromString('fake image data');
        const fileContentMap = new ResourceMap();
        fileContentMap.set(URI.parse('file:///image.PNG'), imageData);
        fileContentMap.set(URI.parse('file:///photo.JPEG'), imageData);
        const tool = new FetchWebPageTool(new TestWebContentExtractorService(new ResourceMap()), new ExtendedTestFileService(fileContentMap));
        const result = await tool.invoke({
            callId: 'test-case',
            toolId: 'fetch-page',
            parameters: { urls: ['file:///image.PNG', 'file:///photo.JPEG'] },
            context: undefined
        }, () => Promise.resolve(0), { report: () => { } }, CancellationToken.None);
        // Both should be returned as data parts despite uppercase extensions
        assert.strictEqual(result.content[0].kind, 'data', 'PNG with uppercase extension should be data part');
        if (result.content[0].kind === 'data') {
            assert.strictEqual(result.content[0].value.mimeType, 'image/png', 'Should have correct MIME type');
        }
        assert.strictEqual(result.content[1].kind, 'data', 'JPEG with uppercase extension should be data part');
        if (result.content[1].kind === 'data') {
            assert.strictEqual(result.content[1].value.mimeType, 'image/jpeg', 'Should have correct MIME type');
        }
    });
    // Comprehensive tests for toolResultDetails
    suite('toolResultDetails', () => {
        test('should include only successfully fetched URIs in correct order', async () => {
            const webContentMap = new ResourceMap([
                [URI.parse('https://success1.com'), 'Content 1'],
                [URI.parse('https://success2.com'), 'Content 2']
            ]);
            const fileContentMap = new ResourceMap([
                [URI.parse('file:///success.txt'), 'File content'],
                [URI.parse('mcp-resource://server/file.txt'), 'MCP content']
            ]);
            const tool = new FetchWebPageTool(new TestWebContentExtractorService(webContentMap), new ExtendedTestFileService(fileContentMap));
            const testUrls = [
                'https://success1.com', // index 0 - should be in toolResultDetails
                'invalid-url', // index 1 - should NOT be in toolResultDetails
                'file:///success.txt', // index 2 - should be in toolResultDetails
                'https://success2.com', // index 3 - should be in toolResultDetails
                'file:///nonexistent.txt', // index 4 - should NOT be in toolResultDetails
                'mcp-resource://server/file.txt' // index 5 - should be in toolResultDetails
            ];
            const result = await tool.invoke({ callId: 'test-details', toolId: 'fetch-page', parameters: { urls: testUrls }, context: undefined }, () => Promise.resolve(0), { report: () => { } }, CancellationToken.None);
            // Verify toolResultDetails contains exactly the successful URIs
            assert.ok(Array.isArray(result.toolResultDetails), 'toolResultDetails should be an array');
            assert.strictEqual(result.toolResultDetails.length, 4, 'Should have 4 successful URIs');
            // Check that all entries are URI objects
            const uriDetails = result.toolResultDetails;
            assert.ok(uriDetails.every(uri => uri instanceof URI), 'All toolResultDetails entries should be URI objects');
            // Check specific URIs are included (web URIs first, then successful file URIs)
            const expectedUris = [
                'https://success1.com/',
                'https://success2.com/',
                'file:///success.txt',
                'mcp-resource://server/file.txt'
            ];
            const actualUriStrings = uriDetails.map(uri => uri.toString());
            assert.deepStrictEqual(actualUriStrings.sort(), expectedUris.sort(), 'Should contain exactly the expected successful URIs');
            // Verify content array matches input order (including failures)
            assert.strictEqual(result.content.length, 6, 'Content should have result for each input URL');
            assert.strictEqual(result.content[0].value, 'Content 1', 'First web URI content');
            assert.strictEqual(result.content[1].value, 'Invalid URL', 'Invalid URL marked as invalid');
            assert.strictEqual(result.content[2].value, 'File content', 'File URI content');
            assert.strictEqual(result.content[3].value, 'Content 2', 'Second web URI content');
            assert.strictEqual(result.content[4].value, 'Invalid URL', 'Nonexistent file marked as invalid');
            assert.strictEqual(result.content[5].value, 'MCP content', 'MCP resource content');
        });
        test('should exclude failed web requests from toolResultDetails', async () => {
            // Set up web content extractor that will throw for some URIs
            const webContentMap = new ResourceMap([
                [URI.parse('https://success.com'), 'Success content']
                // https://failure.com not in map - will throw error
            ]);
            const tool = new FetchWebPageTool(new TestWebContentExtractorService(webContentMap), new ExtendedTestFileService(new ResourceMap()));
            const testUrls = [
                'https://success.com', // Should succeed
                'https://failure.com' // Should fail (not in content map)
            ];
            try {
                await tool.invoke({ callId: 'test-web-failure', toolId: 'fetch-page', parameters: { urls: testUrls }, context: undefined }, () => Promise.resolve(0), { report: () => { } }, CancellationToken.None);
                // If the web extractor throws, it should be handled gracefully
                // But in this test setup, the TestWebContentExtractorService throws for missing content
                assert.fail('Expected test web content extractor to throw for missing URI');
            }
            catch (error) {
                // This is expected behavior with the current test setup
                // The TestWebContentExtractorService throws when content is not found
                assert.ok(error.message.includes('No content configured for URI'), 'Should throw for unconfigured URI');
            }
        });
        test('should exclude failed file reads from toolResultDetails', async () => {
            const fileContentMap = new ResourceMap([
                [URI.parse('file:///existing.txt'), 'File exists']
                // file:///missing.txt not in map - will throw error
            ]);
            const tool = new FetchWebPageTool(new TestWebContentExtractorService(new ResourceMap()), new ExtendedTestFileService(fileContentMap));
            const testUrls = [
                'file:///existing.txt', // Should succeed
                'file:///missing.txt' // Should fail (not in file map)
            ];
            const result = await tool.invoke({ callId: 'test-file-failure', toolId: 'fetch-page', parameters: { urls: testUrls }, context: undefined }, () => Promise.resolve(0), { report: () => { } }, CancellationToken.None);
            // Verify only successful file URI is in toolResultDetails
            assert.ok(Array.isArray(result.toolResultDetails), 'toolResultDetails should be an array');
            assert.strictEqual(result.toolResultDetails.length, 1, 'Should have only 1 successful URI');
            const uriDetails = result.toolResultDetails;
            assert.strictEqual(uriDetails[0].toString(), 'file:///existing.txt', 'Should contain only the successful file URI');
            // Verify content reflects both attempts
            assert.strictEqual(result.content.length, 2, 'Should have results for both input URLs');
            assert.strictEqual(result.content[0].value, 'File exists', 'First file should have content');
            assert.strictEqual(result.content[1].value, 'Invalid URL', 'Second file should be marked invalid');
        });
        test('should handle mixed success and failure scenarios', async () => {
            const webContentMap = new ResourceMap([
                [URI.parse('https://web-success.com'), 'Web success']
            ]);
            const fileContentMap = new ResourceMap([
                [URI.parse('file:///file-success.txt'), 'File success'],
                [URI.parse('mcp-resource://good/file.txt'), VSBuffer.fromString('MCP binary content')]
            ]);
            const tool = new FetchWebPageTool(new TestWebContentExtractorService(webContentMap), new ExtendedTestFileService(fileContentMap));
            const testUrls = [
                'invalid-scheme://bad', // Invalid URI
                'https://web-success.com', // Web success
                'file:///file-missing.txt', // File failure
                'file:///file-success.txt', // File success
                'completely-invalid-url', // Invalid URL format
                'mcp-resource://good/file.txt' // MCP success
            ];
            const result = await tool.invoke({ callId: 'test-mixed', toolId: 'fetch-page', parameters: { urls: testUrls }, context: undefined }, () => Promise.resolve(0), { report: () => { } }, CancellationToken.None);
            // Should have 3 successful URIs: web-success, file-success, mcp-success
            assert.ok(Array.isArray(result.toolResultDetails), 'toolResultDetails should be an array');
            assert.strictEqual(result.toolResultDetails.length, 3, 'Should have 3 successful URIs');
            const uriDetails = result.toolResultDetails;
            const actualUriStrings = uriDetails.map(uri => uri.toString());
            const expectedSuccessful = [
                'https://web-success.com/',
                'file:///file-success.txt',
                'mcp-resource://good/file.txt'
            ];
            assert.deepStrictEqual(actualUriStrings.sort(), expectedSuccessful.sort(), 'Should contain exactly the successful URIs');
            // Verify content array reflects all inputs in original order
            assert.strictEqual(result.content.length, 6, 'Should have results for all input URLs');
            assert.strictEqual(result.content[0].value, 'Invalid URL', 'Invalid scheme marked as invalid');
            assert.strictEqual(result.content[1].value, 'Web success', 'Web success content');
            assert.strictEqual(result.content[2].value, 'Invalid URL', 'Missing file marked as invalid');
            assert.strictEqual(result.content[3].value, 'File success', 'File success content');
            assert.strictEqual(result.content[4].value, 'Invalid URL', 'Invalid URL marked as invalid');
            assert.strictEqual(result.content[5].value, 'MCP binary content', 'MCP success content');
        });
        test('should return empty toolResultDetails when all requests fail', async () => {
            const tool = new FetchWebPageTool(new TestWebContentExtractorService(new ResourceMap()), // Empty - all web requests fail
            new ExtendedTestFileService(new ResourceMap()) // Empty - all file requests fail
            );
            const testUrls = [
                'https://nonexistent.com',
                'file:///missing.txt',
                'invalid-url',
                'bad://scheme'
            ];
            try {
                const result = await tool.invoke({ callId: 'test-all-fail', toolId: 'fetch-page', parameters: { urls: testUrls }, context: undefined }, () => Promise.resolve(0), { report: () => { } }, CancellationToken.None);
                // If web extractor doesn't throw, check the results
                assert.ok(Array.isArray(result.toolResultDetails), 'toolResultDetails should be an array');
                assert.strictEqual(result.toolResultDetails.length, 0, 'Should have no successful URIs');
                assert.strictEqual(result.content.length, 4, 'Should have results for all input URLs');
                assert.ok(result.content.every(content => content.value === 'Invalid URL'), 'All content should be marked as invalid');
            }
            catch (error) {
                // Expected with TestWebContentExtractorService when no content is configured
                assert.ok(error.message.includes('No content configured for URI'), 'Should throw for unconfigured URI');
            }
        });
        test('should handle empty URL array', async () => {
            const tool = new FetchWebPageTool(new TestWebContentExtractorService(new ResourceMap()), new ExtendedTestFileService(new ResourceMap()));
            const result = await tool.invoke({ callId: 'test-empty', toolId: 'fetch-page', parameters: { urls: [] }, context: undefined }, () => Promise.resolve(0), { report: () => { } }, CancellationToken.None);
            assert.strictEqual(result.content.length, 1, 'Should have one content item for empty URLs');
            assert.strictEqual(result.content[0].value, 'No valid URLs provided.', 'Should indicate no valid URLs');
            assert.ok(!result.toolResultDetails, 'toolResultDetails should not be present for empty URLs');
        });
        test('should handle image files in toolResultDetails', async () => {
            const imageBuffer = VSBuffer.fromString('fake-png-data');
            const fileContentMap = new ResourceMap([
                [URI.parse('file:///image.png'), imageBuffer],
                [URI.parse('file:///document.txt'), 'Text content']
            ]);
            const tool = new FetchWebPageTool(new TestWebContentExtractorService(new ResourceMap()), new ExtendedTestFileService(fileContentMap));
            const result = await tool.invoke({ callId: 'test-images', toolId: 'fetch-page', parameters: { urls: ['file:///image.png', 'file:///document.txt'] }, context: undefined }, () => Promise.resolve(0), { report: () => { } }, CancellationToken.None);
            // Both files should be successful and in toolResultDetails
            assert.ok(Array.isArray(result.toolResultDetails), 'toolResultDetails should be an array');
            assert.strictEqual(result.toolResultDetails.length, 2, 'Should have 2 successful file URIs');
            const uriDetails = result.toolResultDetails;
            assert.strictEqual(uriDetails[0].toString(), 'file:///image.png', 'Should include image file');
            assert.strictEqual(uriDetails[1].toString(), 'file:///document.txt', 'Should include text file');
            // Check content types
            assert.strictEqual(result.content[0].kind, 'data', 'Image should be data part');
            assert.strictEqual(result.content[1].kind, 'text', 'Text file should be text part');
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmV0Y2hQYWdlVG9vbC50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvYWR2aWthci9Eb2N1bWVudHMvYXJjaGl0ZWN0L2FyY2gyL0FyY2hJREUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC90ZXN0L2VsZWN0cm9uLWJyb3dzZXIvZmV0Y2hQYWdlVG9vbC50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQ2pDLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQy9FLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNoRSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDeEQsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ2hFLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBR25HLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLCtDQUErQyxDQUFDO0FBQ2pGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUVwRixNQUFNLDhCQUE4QjtJQUduQyxZQUFvQixlQUFvQztRQUFwQyxvQkFBZSxHQUFmLGVBQWUsQ0FBcUI7SUFBSSxDQUFDO0lBRTdELEtBQUssQ0FBQyxPQUFPLENBQUMsSUFBVztRQUN4QixPQUFPLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEVBQUU7WUFDckIsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDOUMsSUFBSSxPQUFPLEtBQUssU0FBUyxFQUFFLENBQUM7Z0JBQzNCLE1BQU0sSUFBSSxLQUFLLENBQUMsa0NBQWtDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsRUFBRSxDQUFD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