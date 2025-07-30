/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { URI } from '../../../../../../../base/common/uri.js';
import { VSBuffer } from '../../../../../../../base/common/buffer.js';
import { Schemas } from '../../../../../../../base/common/network.js';
import { randomInt } from '../../../../../../../base/common/numbers.js';
import { assertDefined } from '../../../../../../../base/common/types.js';
import { NotPromptFile } from '../../../../common/promptFileReferenceErrors.js';
import { IFileService } from '../../../../../../../platform/files/common/files.js';
import { FileService } from '../../../../../../../platform/files/common/fileService.js';
import { randomBoolean } from '../../../../../../../base/test/common/testUtils.js';
import { timeout } from '../../../../../../../base/common/async.js';
import { NullPolicyService } from '../../../../../../../platform/policy/common/policy.js';
import { Line } from '../../../../common/promptSyntax/codecs/base/linesCodec/tokens/line.js';
import { ILogService, NullLogService } from '../../../../../../../platform/log/common/log.js';
import { LinesDecoder } from '../../../../common/promptSyntax/codecs/base/linesCodec/linesDecoder.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../../../base/test/common/utils.js';
import { IConfigurationService } from '../../../../../../../platform/configuration/common/configuration.js';
import { ConfigurationService } from '../../../../../../../platform/configuration/common/configurationService.js';
import { InMemoryFileSystemProvider } from '../../../../../../../platform/files/common/inMemoryFilesystemProvider.js';
import { FilePromptContentProvider } from '../../../../common/promptSyntax/contentProviders/filePromptContentsProvider.js';
import { TestInstantiationService } from '../../../../../../../platform/instantiation/test/common/instantiationServiceMock.js';
/**
 * Timeout to wait for the content changed event to be emitted.
 */
const CONTENT_CHANGED_TIMEOUT = 50;
suite('FilePromptContentsProvider', () => {
    const testDisposables = ensureNoDisposablesAreLeakedInTestSuite();
    let instantiationService;
    setup(async () => {
        const nullPolicyService = new NullPolicyService();
        const nullLogService = testDisposables.add(new NullLogService());
        const nullFileService = testDisposables.add(new FileService(nullLogService));
        const nullConfigService = testDisposables.add(new ConfigurationService(URI.file('/config.json'), nullFileService, nullPolicyService, nullLogService));
        instantiationService = testDisposables.add(new TestInstantiationService());
        const fileSystemProvider = testDisposables.add(new InMemoryFileSystemProvider());
        testDisposables.add(nullFileService.registerProvider(Schemas.file, fileSystemProvider));
        instantiationService.stub(IFileService, nullFileService);
        instantiationService.stub(ILogService, nullLogService);
        instantiationService.stub(IConfigurationService, nullConfigService);
    });
    test('provides contents of a file', async () => {
        const fileService = instantiationService.get(IFileService);
        const fileName = `file-${randomInt(10000)}.prompt.md`;
        const fileUri = URI.file(`/${fileName}`);
        if (await fileService.exists(fileUri)) {
            await fileService.del(fileUri);
        }
        await fileService.writeFile(fileUri, VSBuffer.fromString('Hello, world!'));
        await timeout(5);
        const contentsProvider = testDisposables.add(instantiationService.createInstance(FilePromptContentProvider, fileUri, { allowNonPromptFiles: true, languageId: undefined, updateOnChange: true }));
        let streamOrError;
        testDisposables.add(contentsProvider.onContentChanged((event) => {
            streamOrError = event;
        }));
        contentsProvider.start();
        await timeout(CONTENT_CHANGED_TIMEOUT);
        assertDefined(streamOrError, 'The `streamOrError` must be defined.');
        assert(!(streamOrError instanceof Error), `Provider must produce a byte stream, got '${streamOrError}'.`);
        const stream = new LinesDecoder(streamOrError);
        const receivedLines = await stream.consumeAll();
        assert.strictEqual(receivedLines.length, 1, 'Must read the correct number of lines from the provider.');
        const expectedLine = new Line(1, 'Hello, world!');
        const receivedLine = receivedLines[0];
        assert(receivedLine.equals(expectedLine), `Expected to receive '${expectedLine}', got '${receivedLine}'.`);
    });
    suite('options', () => {
        suite('allowNonPromptFiles', () => {
            test('true', async () => {
                const fileService = instantiationService.get(IFileService);
                const fileName = (randomBoolean() === true)
                    ? `file-${randomInt(10_000)}.md`
                    : `file-${randomInt(10_000)}.txt`;
                const fileUri = URI.file(`/${fileName}`);
                if (await fileService.exists(fileUri)) {
                    await fileService.del(fileUri);
                }
                await fileService.writeFile(fileUri, VSBuffer.fromString('Hello, world!'));
                await timeout(5);
                const contentsProvider = testDisposables.add(instantiationService.createInstance(FilePromptContentProvider, fileUri, { allowNonPromptFiles: true, languageId: undefined, updateOnChange: true }));
                let streamOrError;
                testDisposables.add(contentsProvider.onContentChanged((event) => {
                    streamOrError = event;
                }));
                contentsProvider.start();
                await timeout(CONTENT_CHANGED_TIMEOUT);
                assertDefined(streamOrError, 'The `streamOrError` must be defined.');
                assert(!(streamOrError instanceof Error), `Provider must produce a byte stream, got '${streamOrError}'.`);
                const stream = new LinesDecoder(streamOrError);
                const receivedLines = await stream.consumeAll();
                assert.strictEqual(receivedLines.length, 1, 'Must read the correct number of lines from the provider.');
                const expectedLine = new Line(1, 'Hello, world!');
                const receivedLine = receivedLines[0];
                assert(receivedLine.equals(expectedLine), `Expected to receive '${expectedLine}', got '${receivedLine}'.`);
            });
            test('false', async () => {
                const fileService = instantiationService.get(IFileService);
                const fileName = (randomBoolean() === true)
                    ? `file-${randomInt(10_000)}.md`
                    : `file-${randomInt(10_000)}.txt`;
                const fileUri = URI.file(`/${fileName}`);
                if (await fileService.exists(fileUri)) {
                    await fileService.del(fileUri);
                }
                await fileService.writeFile(fileUri, VSBuffer.fromString('Hello, world!'));
                await timeout(5);
                const contentsProvider = testDisposables.add(instantiationService.createInstance(FilePromptContentProvider, fileUri, { allowNonPromptFiles: false, languageId: undefined, updateOnChange: true }));
                let streamOrError;
                testDisposables.add(contentsProvider.onContentChanged((event) => {
                    streamOrError = event;
                }));
                contentsProvider.start();
                await timeout(CONTENT_CHANGED_TIMEOUT);
                assertDefined(streamOrError, 'The `streamOrError` must be defined.');
                assert(streamOrError instanceof NotPromptFile, `Provider must produce an 'NotPromptFile' error, got '${streamOrError}'.`);
            });
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmlsZVByb21wdENvbnRlbnRzUHJvdmlkZXIudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL2FkdmlrYXIvRG9jdW1lbnRzL2FyY2hpdGVjdC9hcmNoMi9BcmNoSURFL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvdGVzdC9jb21tb24vcHJvbXB0U3ludGF4L2NvbnRlbnRQcm92aWRlcnMvZmlsZVByb21wdENvbnRlbnRzUHJvdmlkZXIudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQzlELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUN0RSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFDdEUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQ3hFLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUUxRSxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0saURBQWlELENBQUM7QUFDaEYsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLHFEQUFxRCxDQUFDO0FBQ25GLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSwyREFBMkQsQ0FBQztBQUN4RixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFDbkYsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBQ3BFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHVEQUF1RCxDQUFDO0FBQzFGLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSx1RUFBdUUsQ0FBQztBQUM3RixPQUFPLEVBQUUsV0FBVyxFQUFFLGNBQWMsRUFBRSxNQUFNLGlEQUFpRCxDQUFDO0FBQzlGLE9BQU8s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