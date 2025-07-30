/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import * as sinon from 'sinon';
import { timeout } from '../../../../../../../base/common/async.js';
import { Schemas } from '../../../../../../../base/common/network.js';
import { assertDefined } from '../../../../../../../base/common/types.js';
import { URI } from '../../../../../../../base/common/uri.js';
import { randomBoolean } from '../../../../../../../base/test/common/testUtils.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../../../base/test/common/utils.js';
import { Range } from '../../../../../../../editor/common/core/range.js';
import { ILanguageService } from '../../../../../../../editor/common/languages/language.js';
import { IModelService } from '../../../../../../../editor/common/services/model.js';
import { createTextModel } from '../../../../../../../editor/test/common/testTextModel.js';
import { IConfigurationService } from '../../../../../../../platform/configuration/common/configuration.js';
import { TestConfigurationService } from '../../../../../../../platform/configuration/test/common/testConfigurationService.js';
import { IFileService } from '../../../../../../../platform/files/common/files.js';
import { FileService } from '../../../../../../../platform/files/common/fileService.js';
import { InMemoryFileSystemProvider } from '../../../../../../../platform/files/common/inMemoryFilesystemProvider.js';
import { TestInstantiationService } from '../../../../../../../platform/instantiation/test/common/instantiationServiceMock.js';
import { ILogService, NullLogService } from '../../../../../../../platform/log/common/log.js';
import { IWorkspacesService } from '../../../../../../../platform/workspaces/common/workspaces.js';
import { INSTRUCTION_FILE_EXTENSION, PROMPT_FILE_EXTENSION } from '../../../../common/promptSyntax/config/promptFileLocations.js';
import { INSTRUCTIONS_LANGUAGE_ID, PROMPT_LANGUAGE_ID, PromptsType } from '../../../../common/promptSyntax/promptTypes.js';
import { TextModelPromptParser } from '../../../../common/promptSyntax/parsers/textModelPromptParser.js';
import { PromptsService } from '../../../../common/promptSyntax/service/promptsServiceImpl.js';
import { IPromptsService } from '../../../../common/promptSyntax/service/promptsService.js';
import { MockFilesystem } from '../testUtils/mockFilesystem.js';
import { ILabelService } from '../../../../../../../platform/label/common/label.js';
import { ComputeAutomaticInstructions } from '../../../../common/promptSyntax/computeAutomaticInstructions.js';
import { CancellationToken } from '../../../../../../../base/common/cancellation.js';
import { ResourceSet } from '../../../../../../../base/common/map.js';
import { IWorkbenchEnvironmentService } from '../../../../../../services/environment/common/environmentService.js';
/**
 * Helper class to assert the properties of a link.
 */
class ExpectedLink {
    constructor(uri, fullRange, linkRange) {
        this.uri = uri;
        this.fullRange = fullRange;
        this.linkRange = linkRange;
    }
    /**
     * Assert a provided link has the same properties as this object.
     */
    assertEqual(link) {
        assert.strictEqual(link.type, 'file', 'Link must have correct type.');
        assert.strictEqual(link.uri.toString(), this.uri.toString(), 'Link must have correct URI.');
        assert(this.fullRange.equalsRange(link.range), `Full range must be '${this.fullRange}', got '${link.range}'.`);
        assertDefined(link.linkRange, 'Link must have a link range.');
        assert(this.linkRange.equalsRange(link.linkRange), `Link range must be '${this.linkRange}', got '${link.linkRange}'.`);
    }
}
/**
 * Asserts that provided links are equal to the expected links.
 * @param links Links to assert.
 * @param expectedLinks Expected links to compare against.
 */
function assertLinks(links, expectedLinks) {
    for (let i = 0; i < links.length; i++) {
        try {
            expectedLinks[i].assertEqual(links[i]);
        }
        catch (error) {
            throw new Error(`link#${i}: ${error}`);
        }
    }
    assert.strictEqual(links.length, expectedLinks.length, `Links count must be correct.`);
}
suite('PromptsService', () => {
    const disposables = ensureNoDisposablesAreLeakedInTestSuite();
    let service;
    let instaService;
    setup(async () => {
        instaService = disposables.add(new TestInstantiationService());
        instaService.stub(ILogService, new NullLogService());
        instaService.stub(IWorkspacesService, {});
        instaService.stub(IConfigurationService, new TestConfigurationService());
        instaService.stub(IWorkbenchEnvironmentService, {});
        const fileService = disposables.add(instaService.createInstance(FileService));
        instaService.stub(IFileService, fileService);
        instaService.stub(IModelService, { getModel() { return null; } });
        instaService.stub(ILanguageService, {
            guessLanguageIdByFilepathOrFirstLine(uri) {
                if (uri.path.endsWith(PROMPT_FILE_EXTENSION)) {
                    return PROMPT_LANGUAGE_ID;
                }
                if (uri.path.endsWith(INSTRUCTION_FILE_EXTENSION)) {
                    return INSTRUCTIONS_LANGUAGE_ID;
                }
                return 'plaintext';
            }
        });
        instaService.stub(ILabelService, { getUriLabel: (uri) => uri.path });
        const fileSystemProvider = disposables.add(new InMemoryFileSystemProvider());
        disposables.add(fileService.registerProvider(Schemas.file, fileSystemProvider));
        service = disposables.add(instaService.createInstance(PromptsService));
        instaService.stub(IPromptsService, service);
    });
    suite('getParserFor', () => {
        test('provides cached parser instance', async () => {
            // both languages must yield the same result
            const languageId = (randomBoolean())
                ? PROMPT_LANGUAGE_ID
                : INSTRUCTIONS_LANGUAGE_ID;
            /**
             * Create a text model, get a parser for it, and perform basic assertions.
             */
            const model1 = disposables.add(createTextModel('test1\n\t#file:./file.md\n\n\n   [bin file](/root/tmp.bin)\t\n', languageId, undefined, URI.file('/Users/vscode/repos/test/file1.txt')));
            const parser1 = service.getSyntaxParserFor(model1);
            assert.strictEqual(parser1.uri.toString(), model1.uri.toString(), 'Must create parser1 with the correct URI.');
            assert(!parser1.isDisposed, 'Parser1 must not be disposed.');
            assert(parser1 instanceof TextModelPromptParser, 'Parser1 must be an instance of TextModelPromptParser.');
            /**
             * Validate that all links of the model are correctly parsed.
             */
            await parser1.settled();
            assertLinks(parser1.references, [
                new ExpectedLink(URI.file('/Users/vscode/repos/test/file.md'), new Range(2, 2, 2, 2 + 15), new Range(2, 8, 2, 8 + 9)),
                new ExpectedLink(URI.file('/root/tmp.bin'), new Range(5, 4, 5, 4 + 25), new Range(5, 15, 5, 15 + 13)),
            ]);
            // wait for some random amount of time
            await timeout(5);
            /**
             * Next, get parser for the same exact model and
             * validate that the same cached object is returned.
             */
            // get the same parser again, the call must return the same object
            const parser1_1 = service.getSyntaxParserFor(model1);
            assert.strictEqual(parser1, parser1_1, 'Must return the same parser object.');
            assert.strictEqual(parser1_1.uri.toString(), model1.uri.toString(), 'Must create parser1_1 with the correct URI.');
            /**
             * Get parser for a different model and perform basic assertions.
             */
            const model2 = disposables.add(createTextModel('some text #file:/absolute/path.txt  \t\ntest-text2', languageId, undefined, URI.file('/Users/vscode/repos/test/some-folder/file.md')));
            // wait for some random amount of time
            await timeout(5);
            const parser2 = service.getSyntaxParserFor(model2);
            assert.strictEqual(parser2.uri.toString(), model2.uri.toString(), 'Must create parser2 with the correct URI.');
            assert(!parser2.isDisposed, 'Parser2 must not be disposed.');
            assert(parser2 instanceof TextModelPromptParser, 'Parser2 must be an instance of TextModelPromptParser.');
            assert(!parser2.isDisposed, 'Parser2 must not be disposed.');
            assert(!parser1.isDisposed, 'Parser1 must not be disposed.');
            assert(!parser1_1.isDisposed, 'Parser1_1 must not be disposed.');
            /**
             * Validate that all links of the model 2 are correctly parsed.
             */
            await parser2.settled();
            assert.notStrictEqual(parser1.uri.toString(), parser2.uri.toString(), 'Parser2 must have its own URI.');
            assertLinks(parser2.references, [
                new ExpectedLink(URI.file('/absolute/path.txt'), new Range(1, 11, 1, 11 + 24), new Range(1, 17, 1, 17 + 18)),
            ]);
            /**
             * Validate the first parser was not affected by the presence
             * of the second parser.
             */
            await parser1_1.settled();
            // parser1_1 has the same exact links as before
            assertLinks(parser1_1.references, [
                new ExpectedLink(URI.file('/Users/vscode/repos/test/file.md'), new Range(2, 2, 2, 2 + 15), new Range(2, 8, 2, 8 + 9)),
                new ExpectedLink(URI.file('/root/tmp.bin'), new Range(5, 4, 5, 4 + 25), new Range(5, 15, 5, 15 + 13)),
            ]);
            // wait for some random amount of time
            await timeout(5);
            /**
             * Dispose the first parser, perform basic validations, and confirm
             * that the second parser is not affected by the disposal of the first one.
             */
            parser1.dispose();
            assert(parser1.isDisposed, 'Parser1 must be disposed.');
            assert(parser1_1.isDisposed, 'Parser1_1 must be disposed.');
            assert(!parser2.isDisposed, 'Parser2 must not be disposed.');
            /**
             * Get parser for the first model again. Confirm that we get
             * a new non-disposed parser object back with correct properties.
             */
            const parser1_2 = service.getSyntaxParserFor(model1);
            assert(!parser1_2.isDisposed, 'Parser1_2 must not be disposed.');
            assert.notStrictEqual(parser1_2, parser1, 'Must create a new parser object for the model1.');
            assert.strictEqual(parser1_2.uri.toString(), model1.uri.toString(), 'Must create parser1_2 with the correct URI.');
            /**
             * Validate that the contents of the second parser did not change.
             */
            await parser1_2.settled();
            // parser1_2 must have the same exact links as before
            assertLinks(parser1_2.references, [
                new ExpectedLink(URI.file('/Users/vscode/repos/test/file.md'), new Range(2, 2, 2, 2 + 15), new Range(2, 8, 2, 8 + 9)),
                new ExpectedLink(URI.file('/root/tmp.bin'), new Range(5, 4, 5, 4 + 25), new Range(5, 15, 5, 15 + 13)),
            ]);
            // wait for some random amount of time
            await timeout(5);
            /**
             * This time dispose model of the second parser instead of
             * the parser itself. Validate that the parser is disposed too, but
             * the newly created first parser is not affected.
             */
            // dispose the `model` of the second parser now
            model2.dispose();
            // assert that the parser is also disposed
            assert(parser2.isDisposed, 'Parser2 must be disposed.');
            // sanity check that the other parser is not affected
            assert(!parser1_2.isDisposed, 'Parser1_2 must not be disposed.');
            /**
             * Create a new second parser with new model - we cannot use
             * the old one because it was disposed. This new model also has
             * a different second link.
             */
            // we cannot use the same model since it was already disposed
            const model2_1 = disposables.add(createTextModel('some text #file:/absolute/path.txt  \n [caption](.copilot/prompts/test.prompt.md)\t\n\t\n more text', languageId, undefined, URI.file('/Users/vscode/repos/test/some-folder/file.md')));
            const parser2_1 = service.getSyntaxParserFor(model2_1);
            assert(!parser2_1.isDisposed, 'Parser2_1 must not be disposed.');
            assert.notStrictEqual(parser2_1, parser2, 'Parser2_1 must be a new object.');
            assert.strictEqual(parser2_1.uri.toString(), model2.uri.toString(), 'Must create parser2_1 with the correct URI.');
            /**
             * Validate that new model2 contents are parsed correctly.
             */
            await parser2_1.settled();
            // parser2_1 must have 2 links now
            assertLinks(parser2_1.references, [
                // the first link didn't change
                new ExpectedLink(URI.file('/absolute/path.txt'), new Range(1, 11, 1, 11 + 24), new Range(1, 17, 1, 17 + 18)),
                // the second link is new
                new ExpectedLink(URI.file('/Users/vscode/repos/test/some-folder/.copilot/prompts/test.prompt.md'), new Range(2, 2, 2, 2 + 42), new Range(2, 12, 2, 12 + 31)),
            ]);
        });
        test('auto-updated on model changes', async () => {
            const langId = 'bazLang';
            const model = disposables.add(createTextModel(' \t #file:../file.md\ntest1\n\t\n  [another file](/Users/root/tmp/file2.txt)\t\n', langId, undefined, URI.file('/repos/test/file1.txt')));
            const parser = service.getSyntaxParserFor(model);
            // sanity checks
            assert(parser.isDisposed === false, 'Parser must not be disposed.');
            assert(parser instanceof TextModelPromptParser, 'Parser must be an instance of TextModelPromptParser.');
            await parser.settled();
            assertLinks(parser.references, [
                new ExpectedLink(URI.file('/repos/file.md'), new Range(1, 4, 1, 4 + 16), new Range(1, 10, 1, 10 + 10)),
                new ExpectedLink(URI.file('/Users/root/tmp/file2.txt'), new Range(4, 3, 4, 3 + 41), new Range(4, 18, 4, 18 + 25)),
            ]);
            model.applyEdits([
                {
                    range: new Range(4, 18, 4, 18 + 25),
                    text: '/Users/root/tmp/file3.txt',
                },
            ]);
            await parser.settled();
            assertLinks(parser.references, [
                // link1 didn't change
                new ExpectedLink(URI.file('/repos/file.md'), new Range(1, 4, 1, 4 + 16), new Range(1, 10, 1, 10 + 10)),
                // link2 changed in the file name only
                new ExpectedLink(URI.file('/Users/root/tmp/file3.txt'), new Range(4, 3, 4, 3 + 41), new Range(4, 18, 4, 18 + 25)),
            ]);
        });
        test('throws if a disposed model provided', async function () {
            const model = disposables.add(createTextModel('test1\ntest2\n\ntest3\t\n', 'barLang', undefined, URI.parse('./github/prompts/file.prompt.md')));
            // dispose the model before using it
            model.dispose();
            assert.throws(() => {
                service.getSyntaxParserFor(model);
            }, 'Cannot create a prompt parser for a disposed model.');
        });
    });
    suite('parse', () => {
        test('explicit', async function () {
            const rootFolderName = 'resolves-nested-file-references';
            const rootFolder = `/${rootFolderName}`;
            const rootFileName = 'file2.prompt.md';
            const rootFolderUri = URI.file(rootFolder);
            const rootFileUri = URI.joinPath(rootFolderUri, rootFileName);
            await (instaService.createInstance(MockFilesystem, 
            // the file structure to be created on the disk for the test
            [{
                    name: rootFolderName,
                    children: [
                        {
                            name: 'file1.prompt.md',
                            contents: [
                                '## Some Header',
                                'some contents',
                                ' ',
                            ],
                        },
                        {
                            name: rootFileName,
                            contents: [
                                '---',
                                'description: \'Root prompt description.\'',
                                'tools: [\'my-tool1\', , true]',
                                'mode: "agent" ',
                                '---',
                                '## Files',
                                '\t- this file #file:folder1/file3.prompt.md ',
                                '\t- also this [file4.prompt.md](./folder1/some-other-folder/file4.prompt.md) please!',
                                ' ',
                            ],
                        },
                        {
                            name: 'folder1',
                            children: [
                                {
                                    name: 'file3.prompt.md',
                                    contents: [
                                        '---',
                                        'tools: [ false, \'my-tool1\' , ]',
                                        'mode: \'edit\'',
                                        '---',
                                        '',
                                        '[](./some-other-folder/non-existing-folder)',
                                        `\t- some seemingly random #file:${rootFolder}/folder1/some-other-folder/yetAnotherFolder🤭/another-file.instructions.md contents`,
                                        ' some more\t content',
                                    ],
                                },
                                {
                                    name: 'some-other-folder',
                                    children: [
                                        {
                                            name: 'file4.prompt.md',
                                            contents: [
                                                '---',
                                                'tools: [\'my-tool1\', "my-tool2", true, , ]',
                                                'something: true',
                                                'mode: \'ask\'\t',
                                                'description: "File 4 splendid description."',
                                                '---',
                                                'this file has a non-existing #file:./some-non-existing/file.prompt.md\t\treference',
                                                '',
                                                '',
                                                'and some',
                                                ' non-prompt #file:./some-non-prompt-file.md\t\t \t[](../../folder1/)\t',
                                            ],
                                        },
                                        {
                                            name: 'file.txt',
                                            contents: [
                                                '---',
                                                'description: "Non-prompt file description".',
                                                'tools: ["my-tool-24"]',
                                                '---',
                                            ],
                                        },
                                        {
                                            name: 'yetAnotherFolder🤭',
                                            children: [
                                                {
                                                    name: 'another-file.instructions.md',
                                                    contents: [
                                                        '---',
                                                        'description: "Another file description."',
                                                        'tools: [\'my-tool3\', false, "my-tool2" ]',
                                                        'applyTo: "**/*.tsx"',
                                                        '---',
                                                        `[](${rootFolder}/folder1/some-other-folder)`,
                                                        'another-file.instructions.md contents\t [#file:file.txt](../file.txt)',
                                                    ],
                                                },
                                                {
                                                    name: 'one_more_file_just_in_case.prompt.md',
                                                    contents: 'one_more_file_just_in_case.prompt.md contents',
                                                },
                                            ],
                                        },
                                    ],
                                },
                            ],
                        },
                    ],
                }])).mock();
            const file3 = URI.joinPath(rootFolderUri, 'folder1/file3.prompt.md');
            const file4 = URI.joinPath(rootFolderUri, 'folder1/some-other-folder/file4.prompt.md');
            const someOtherFolder = URI.joinPath(rootFolderUri, '/folder1/some-other-folder');
            const someOtherFolderFile = URI.joinPath(rootFolderUri, '/folder1/some-other-folder/file.txt');
            const nonExistingFolder = URI.joinPath(rootFolderUri, 'folder1/some-other-folder/non-existing-folder');
            const yetAnotherFile = URI.joinPath(rootFolderUri, 'folder1/some-other-folder/yetAnotherFolder🤭/another-file.instructions.md');
            const result1 = await service.parse(rootFileUri, PromptsType.prompt, CancellationToken.None);
            assert.deepStrictEqual(result1, {
                uri: rootFileUri,
                metadata: {
                    promptType: PromptsType.prompt,
                    description: 'Root prompt description.',
                    tools: ['my-tool1'],
                    mode: 'agent',
                },
                topError: undefined,
                references: [file3, file4]
            });
            const result2 = await service.parse(file3, PromptsType.prompt, CancellationToken.None);
            assert.deepStrictEqual(result2, {
                uri: file3,
                metadata: {
                    promptType: PromptsType.prompt,
                    mode: 'edit',
                },
                topError: undefined,
                references: [nonExistingFolder, yetAnotherFile]
            });
            const result3 = await service.parse(yetAnotherFile, PromptsType.instructions, CancellationToken.None);
            assert.deepStrictEqual(result3, {
                uri: yetAnotherFile,
                metadata: {
                    promptType: PromptsType.instructions,
                    description: 'Another file description.',
                    applyTo: '**/*.tsx',
                },
                topError: undefined,
                references: [someOtherFolder, someOtherFolderFile]
            });
            const result4 = await service.parse(file4, PromptsType.instructions, CancellationToken.None);
            assert.deepStrictEqual(result4, {
                uri: file4,
                metadata: {
                    promptType: PromptsType.instructions,
                    description: 'File 4 splendid description.',
                },
                topError: undefined,
                references: [
                    URI.joinPath(rootFolderUri, '/folder1/some-other-folder/some-non-existing/file.prompt.md'),
                    URI.joinPath(rootFolderUri, '/folder1/some-other-folder/some-non-prompt-file.md'),
                    URI.joinPath(rootFolderUri, '/folder1/'),
                ]
            });
        });
    });
    suite('findInstructionFilesFor', () => {
        teardown(() => {
            sinon.restore();
        });
        test('finds correct instruction files', async () => {
            const rootFolderName = 'finds-instruction-files';
            const rootFolder = `/${rootFolderName}`;
            const rootFolderUri = URI.file(rootFolder);
            const userPromptsFolderName = '/tmp/user-data/prompts';
            const userPromptsFolderUri = URI.file(userPromptsFolderName);
            sinon.stub(service, 'listPromptFiles')
                .returns(Promise.resolve([
                // local instructions
                {
                    uri: URI.joinPath(rootFolderUri, '.github/prompts/file1.instructions.md'),
                    storage: 'local',
                    type: PromptsType.instructions,
                },
                {
                    uri: URI.joinPath(rootFolderUri, '.github/prompts/file2.instructions.md'),
                    storage: 'local',
                    type: PromptsType.instructions,
                },
                {
                    uri: URI.joinPath(rootFolderUri, '.github/prompts/file3.instructions.md'),
                    storage: 'local',
                    type: PromptsType.instructions,
                },
                {
                    uri: URI.joinPath(rootFolderUri, '.github/prompts/file4.instructions.md'),
                    storage: 'local',
                    type: PromptsType.instructions,
                },
                // user instructions
                {
                    uri: URI.joinPath(userPromptsFolderUri, 'file10.instructions.md'),
                    storage: 'user',
                    type: PromptsType.instructions,
                },
                {
                    uri: URI.joinPath(userPromptsFolderUri, 'file11.instructions.md'),
                    storage: 'user',
                    type: PromptsType.instructions,
                },
            ]));
            // mock current workspace file structure
            await (instaService.createInstance(MockFilesystem, [{
                    name: rootFolderName,
                    children: [
                        {
                            name: 'file1.prompt.md',
                            contents: [
                                '## Some Header',
                                'some contents',
                                ' ',
                            ],
                        },
                        {
                            name: '.github/prompts',
                            children: [
                                {
                                    name: 'file1.instructions.md',
                                    contents: [
                                        '---',
                                        'description: \'Instructions file 1.\'',
                                        'applyTo: "**/*.tsx"',
                                        '---',
                                        'Some instructions 1 contents.',
                                    ],
                                },
                                {
                                    name: 'file2.instructions.md',
                                    contents: [
                                        '---',
                                        'description: \'Instructions file 2.\'',
                                        'applyTo: "**/folder1/*.tsx"',
                                        '---',
                                        'Some instructions 2 contents.',
                                    ],
                                },
                                {
                                    name: 'file3.instructions.md',
                                    contents: [
                                        '---',
                                        'description: \'Instructions file 3.\'',
                                        'applyTo: "**/folder2/*.tsx"',
                                        '---',
                                        'Some instructions 3 contents.',
                                    ],
                                },
                                {
                                    name: 'file4.instructions.md',
                                    contents: [
                                        '---',
                                        'description: \'Instructions file 4.\'',
                                        'applyTo: "src/build/*.tsx"',
                                        '---',
                                        'Some instructions 4 contents.',
                                    ],
                                },
                                {
                                    name: 'file5.prompt.md',
                                    contents: [
                                        '---',
                                        'description: \'Prompt file 5.\'',
                                        '---',
                                        'Some prompt 5 contents.',
                                    ],
                                },
                            ],
                        },
                        {
                            name: 'folder1',
                            children: [
                                {
                                    name: 'main.tsx',
                                    contents: 'console.log("Haalou!")',
                                },
                            ],
                        },
                    ],
                }])).mock();
            // mock user data instructions
            await (instaService.createInstance(MockFilesystem, [
                {
                    name: userPromptsFolderName,
                    children: [
                        {
                            name: 'file10.instructions.md',
                            contents: [
                                '---',
                                'description: \'Instructions file 10.\'',
                                'applyTo: "**/folder1/*.tsx"',
                                '---',
                                'Some instructions 10 contents.',
                            ],
                        },
                        {
                            name: 'file11.instructions.md',
                            contents: [
                                '---',
                                'description: \'Instructions file 11.\'',
                                'applyTo: "**/folder1/*.py"',
                                '---',
                                'Some instructions 11 contents.',
                            ],
                        },
                        {
                            name: 'file12.prompt.md',
                            contents: [
                                '---',
                                'description: \'Prompt file 12.\'',
                                '---',
                                'Some prompt 12 contents.',
                            ],
                        },
                    ],
                }
            ])).mock();
            const instructionFiles = await service.listPromptFiles(PromptsType.instructions, CancellationToken.None);
            const contextComputer = instaService.createInstance(ComputeAutomaticInstructions, undefined);
            const context = {
                files: new ResourceSet([
                    URI.joinPath(rootFolderUri, 'folder1/main.tsx'),
                ]),
                instructions: new ResourceSet(),
            };
            const instructions = await contextComputer.findInstructionFilesFor(instructionFiles, context, CancellationToken.None);
            assert.deepStrictEqual(instructions.map(i => i.value.path), [
                // local instructions
                URI.joinPath(rootFolderUri, '.github/prompts/file1.instructions.md').path,
                URI.joinPath(rootFolderUri, '.github/prompts/file2.instructions.md').path,
                // user instructions
                URI.joinPath(userPromptsFolderUri, 'file10.instructions.md').path,
            ], 'Must find correct instruction files.');
        });
        test('does not have duplicates', async () => {
            const rootFolderName = 'finds-instruction-files-without-duplicates';
            const rootFolder = `/${rootFolderName}`;
            const rootFolderUri = URI.file(rootFolder);
            const userPromptsFolderName = '/tmp/user-data/prompts';
            const userPromptsFolderUri = URI.file(userPromptsFolderName);
            sinon.stub(service, 'listPromptFiles')
                .returns(Promise.resolve([
                // local instructions
                {
                    uri: URI.joinPath(rootFolderUri, '.github/prompts/file1.instructions.md'),
                    storage: 'local',
                    type: PromptsType.instructions,
                },
                {
                    uri: URI.joinPath(rootFolderUri, '.github/prompts/file2.instructions.md'),
                    storage: 'local',
                    type: PromptsType.instructions,
                },
                {
                    uri: URI.joinPath(rootFolderUri, '.github/prompts/file3.instructions.md'),
                    storage: 'local',
                    type: PromptsType.instructions,
                },
                {
                    uri: URI.joinPath(rootFolderUri, '.github/prompts/file4.instructions.md'),
                    storage: 'local',
                    type: PromptsType.instructions,
                },
                // user instructions
                {
                    uri: URI.joinPath(userPromptsFolderUri, 'file10.instructions.md'),
                    storage: 'user',
                    type: PromptsType.instructions,
                },
                {
                    uri: URI.joinPath(userPromptsFolderUri, 'file11.instructions.md'),
                    storage: 'user',
                    type: PromptsType.instructions,
                },
            ]));
            // mock current workspace file structure
            await (instaService.createInstance(MockFilesystem, [{
                    name: rootFolderName,
                    children: [
                        {
                            name: 'file1.prompt.md',
                            contents: [
                                '## Some Header',
                                'some contents',
                                ' ',
                            ],
                        },
                        {
                            name: '.github/prompts',
                            children: [
                                {
                                    name: 'file1.instructions.md',
                                    contents: [
                                        '---',
                                        'description: \'Instructions file 1.\'',
                                        'applyTo: "**/*.tsx"',
                                        '---',
                                        'Some instructions 1 contents.',
                                    ],
                                },
                                {
                                    name: 'file2.instructions.md',
                                    contents: [
                                        '---',
                                        'description: \'Instructions file 2.\'',
                                        'applyTo: "**/folder1/*.tsx"',
                                        '---',
                                        'Some instructions 2 contents. [](./file1.instructions.md)',
                                    ],
                                },
                                {
                                    name: 'file3.instructions.md',
                                    contents: [
                                        '---',
                                        'description: \'Instructions file 3.\'',
                                        'applyTo: "**/folder2/*.tsx"',
                                        '---',
                                        'Some instructions 3 contents.',
                                    ],
                                },
                                {
                                    name: 'file4.instructions.md',
                                    contents: [
                                        '---',
                                        'description: \'Instructions file 4.\'',
                                        'applyTo: "src/build/*.tsx"',
                                        '---',
                                        '[](./file3.instructions.md) Some instructions 4 contents.',
                                    ],
                                },
                                {
                                    name: 'file5.prompt.md',
                                    contents: [
                                        '---',
                                        'description: \'Prompt file 5.\'',
                                        '---',
                                        'Some prompt 5 contents.',
                                    ],
                                },
                            ],
                        },
                        {
                            name: 'folder1',
                            children: [
                                {
                                    name: 'main.tsx',
                                    contents: 'console.log("Haalou!")',
                                },
                            ],
                        },
                    ],
                }])).mock();
            // mock user data instructions
            await (instaService.createInstance(MockFilesystem, [
                {
                    name: userPromptsFolderName,
                    children: [
                        {
                            name: 'file10.instructions.md',
                            contents: [
                                '---',
                                'description: \'Instructions file 10.\'',
                                'applyTo: "**/folder1/*.tsx"',
                                '---',
                                'Some instructions 10 contents.',
                            ],
                        },
                        {
                            name: 'file11.instructions.md',
                            contents: [
                                '---',
                                'description: \'Instructions file 11.\'',
                                'applyTo: "**/folder1/*.py"',
                                '---',
                                'Some instructions 11 contents.',
                            ],
                        },
                        {
                            name: 'file12.prompt.md',
                            contents: [
                                '---',
                                'description: \'Prompt file 12.\'',
                                '---',
                                'Some prompt 12 contents.',
                            ],
                        },
                    ],
                }
            ])).mock();
            const instructionFiles = await service.listPromptFiles(PromptsType.instructions, CancellationToken.None);
            const contextComputer = instaService.createInstance(ComputeAutomaticInstructions, undefined);
            const context = {
                files: new ResourceSet([
                    URI.joinPath(rootFolderUri, 'folder1/main.tsx'),
                    URI.joinPath(rootFolderUri, 'folder1/index.tsx'),
                    URI.joinPath(rootFolderUri, 'folder1/constants.tsx'),
                ]),
                instructions: new ResourceSet(),
            };
            const instructions = await contextComputer.findInstructionFilesFor(instructionFiles, context, CancellationToken.None);
            assert.deepStrictEqual(instructions.map(i => i.value.path), [
                // local instructions
                URI.joinPath(rootFolderUri, '.github/prompts/file1.instructions.md').path,
                URI.joinPath(rootFolderUri, '.github/prompts/file2.instructions.md').path,
                // user instructions
                URI.joinPath(userPromptsFolderUri, 'file10.instructions.md').path,
            ], 'Must find correct instruction files.');
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvbXB0c1NlcnZpY2UudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL2FkdmlrYXIvRG9jdW1lbnRzL2FyY2hpdGVjdC9hcmNoMi9BcmNoSURFL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvdGVzdC9jb21tb24vcHJvbXB0U3ludGF4L3NlcnZpY2UvcHJvbXB0c1NlcnZpY2UudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxLQUFLLEtBQUssTUFBTSxPQUFPLENBQUM7QUFDL0IsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBQ3BFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUN0RSxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFDMUUsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQzlELE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxvREFBb0QsQ0FBQztBQUNuRixPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUN6RyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDekUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sMERBQTBELENBQUM7QUFDNUYsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQ3JGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSwwREFBMEQsQ0FBQztBQUMzRixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxxRUFBcUUsQ0FBQztBQUM1RyxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxxRkFBcUYsQ0FBQztBQUMvSCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0scURBQXFELENBQUM7QUFDbkYsT0FBTyxF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