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
import assert from 'assert';
import { timeout } from '../../../../../../base/common/async.js';
import { Disposable } from '../../../../../../base/common/lifecycle.js';
import { Schemas } from '../../../../../../base/common/network.js';
import { URI } from '../../../../../../base/common/uri.js';
import { randomBoolean } from '../../../../../../base/test/common/testUtils.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../../base/test/common/utils.js';
import { Range } from '../../../../../../editor/common/core/range.js';
import { ILanguageService } from '../../../../../../editor/common/languages/language.js';
import { IModelService } from '../../../../../../editor/common/services/model.js';
import { IConfigurationService } from '../../../../../../platform/configuration/common/configuration.js';
import { ConfigurationService } from '../../../../../../platform/configuration/common/configurationService.js';
import { IFileService } from '../../../../../../platform/files/common/files.js';
import { FileService } from '../../../../../../platform/files/common/fileService.js';
import { InMemoryFileSystemProvider } from '../../../../../../platform/files/common/inMemoryFilesystemProvider.js';
import { IInstantiationService } from '../../../../../../platform/instantiation/common/instantiation.js';
import { TestInstantiationService } from '../../../../../../platform/instantiation/test/common/instantiationServiceMock.js';
import { ILogService, NullLogService } from '../../../../../../platform/log/common/log.js';
import { NullPolicyService } from '../../../../../../platform/policy/common/policy.js';
import { ChatModeKind } from '../../../common/constants.js';
import { MarkdownLink } from '../../../common/promptSyntax/codecs/base/markdownCodec/tokens/markdownLink.js';
import { FileReference } from '../../../common/promptSyntax/codecs/tokens/fileReference.js';
import { getPromptFileType } from '../../../common/promptSyntax/config/promptFileLocations.js';
import { PromptsType } from '../../../common/promptSyntax/promptTypes.js';
import { FilePromptParser } from '../../../common/promptSyntax/parsers/filePromptParser.js';
import { MockFilesystem } from './testUtils/mockFilesystem.js';
/**
 * Represents a file reference with an expected
 * error condition value for testing purposes.
 */
class ExpectedReference {
    constructor(dirname, linkToken, errorCondition) {
        this.linkToken = linkToken;
        this.errorCondition = errorCondition;
        this.uri = (linkToken.path.startsWith('/'))
            ? URI.file(linkToken.path)
            : URI.joinPath(dirname, linkToken.path);
    }
    /**
     * Range of the underlying file reference token.
     */
    get range() {
        return this.linkToken.range;
    }
    /**
     * String representation of the expected reference.
     */
    toString() {
        return `file-prompt:${this.uri.path}`;
    }
}
/**
 * A reusable test utility to test the `PromptFileReference` class.
 */
let TestPromptFileReference = class TestPromptFileReference extends Disposable {
    constructor(fileStructure, rootFileUri, expectedReferences, fileService, instantiationService) {
        super();
        this.fileStructure = fileStructure;
        this.rootFileUri = rootFileUri;
        this.expectedReferences = expectedReferences;
        this.fileService = fileService;
        this.instantiationService = instantiationService;
        // create in-memory file system
        const fileSystemProvider = this._register(new InMemoryFileSystemProvider());
        this._register(this.fileService.registerProvider(Schemas.file, fileSystemProvider));
    }
    /**
     * Run the test.
     */
    async run() {
        // create the files structure on the disk
        await (this.instantiationService.createInstance(MockFilesystem, this.fileStructure)).mock();
        // randomly test with and without delay to ensure that the file
        // reference resolution is not susceptible to race conditions
        if (randomBoolean()) {
            await timeout(5);
        }
        // start resolving references for the specified root file
        const rootReference = this._register(this.instantiationService.createInstance(FilePromptParser, this.rootFileUri, { allowNonPromptFiles: true, languageId: undefined, updateOnChange: true })).start();
        // wait until entire prompts tree is resolved
        await rootReference.settled();
        // resolve the root file reference including all nested references
        const resolvedReferences = rootReference.references;
        for (let i = 0; i < this.expectedReferences.length; i++) {
            const expectedReference = this.expectedReferences[i];
            const resolvedReference = resolvedReferences[i];
            if (expectedReference.linkToken instanceof MarkdownLink) {
                assert(resolvedReference?.subtype === 'markdown', [
                    `Expected ${i}th resolved reference to be a markdown link`,
                    `got '${resolvedReference}'.`,
                ].join(', '));
            }
            if (expectedReference.linkToken instanceof FileReference) {
                assert(resolvedReference?.subtype === 'prompt', [
                    `Expected ${i}th resolved reference to be a #file: link`,
                    `got '${resolvedReference}'.`,
                ].join(', '));
            }
            assert((resolvedReference) &&
                (resolvedReference.uri.toString() === expectedReference.uri.toString()), [
                `Expected ${i}th resolved reference URI to be '${expectedReference.uri}'`,
                `got '${resolvedReference?.uri}'.`,
            ].join(', '));
            assert((resolvedReference) &&
                (resolvedReference.range.equalsRange(expectedReference.range)), [
                `Expected ${i}th resolved reference range to be '${expectedReference.range}'`,
                `got '${resolvedReference?.range}'.`,
            ].join(', '));
        }
        assert.strictEqual(resolvedReferences.length, this.expectedReferences.length, [
            `\nExpected(${this.expectedReferences.length}): [\n ${this.expectedReferences.join('\n ')}\n]`,
            `Received(${resolvedReferences.length}): [\n ${resolvedReferences.join('\n ')}\n]`,
        ].join('\n'));
        return rootReference;
    }
};
TestPromptFileReference = __decorate([
    __param(3, IFileService),
    __param(4, IInstantiationService)
], TestPromptFileReference);
/**
 * Create expected file reference for testing purposes.
 *
 * Note! This utility also use for `markdown links` at the moment.
 *
 * @param filePath The expected path of the file reference (without the `#file:` prefix).
 * @param lineNumber The expected line number of the file reference.
 * @param startColumnNumber The expected start column number of the file reference.
 */
function createTestFileReference(filePath, lineNumber, startColumnNumber) {
    const range = new Range(lineNumber, startColumnNumber, lineNumber, startColumnNumber + `#file:${filePath}`.length);
    return new FileReference(range, filePath);
}
suite('PromptFileReference', function () {
    const testDisposables = ensureNoDisposablesAreLeakedInTestSuite();
    let instantiationService;
    setup(async () => {
        const nullPolicyService = new NullPolicyService();
        const nullLogService = testDisposables.add(new NullLogService());
        const nullFileService = testDisposables.add(new FileService(nullLogService));
        const nullConfigService = testDisposables.add(new ConfigurationService(URI.file('/config.json'), nullFileService, nullPolicyService, nullLogService));
        instantiationService = testDisposables.add(new TestInstantiationService());
        instantiationService.stub(IFileService, nullFileService);
        instantiationService.stub(ILogService, nullLogService);
        instantiationService.stub(IConfigurationService, nullConfigService);
        instantiationService.stub(IModelService, { getModel() { return null; } });
        instantiationService.stub(ILanguageService, {
            guessLanguageIdByFilepathOrFirstLine(uri) {
                return getPromptFileType(uri) ?? null;
            }
        });
    });
    test('resolves nested file references', async function () {
        const rootFolderName = 'resolves-nested-file-references';
        const rootFolder = `/${rootFolderName}`;
        const rootUri = URI.file(rootFolder);
        const test = testDisposables.add(instantiationService.createInstance(TestPromptFileReference, 
        /**
         * The file structure to be created on the disk for the test.
         */
        [{
                name: rootFolderName,
                children: [
                    {
                        name: 'file1.prompt.md',
                        contents: '## Some Header\nsome contents\n ',
                    },
                    {
                        name: 'file2.prompt.md',
                        contents: '## Files\n\t- this file #file:folder1/file3.prompt.md \n\t- also this [file4.prompt.md](./folder1/some-other-folder/file4.prompt.md) please!\n ',
                    },
                    {
                        name: 'folder1',
                        children: [
                            {
                                name: 'file3.prompt.md',
                                contents: `\n[](./some-other-folder/non-existing-folder)\n\t- some seemingly random #file:${rootFolder}/folder1/some-other-folder/yetAnotherFolder🤭/another-file.prompt.md contents\n some more\t content`,
                            },
                            {
                                name: 'some-other-folder',
                                children: [
                                    {
                                        name: 'file4.prompt.md',
                                        contents: 'this file has a non-existing #file:./some-non-existing/file.prompt.md\t\treference\n\n\nand some\n non-prompt #file:./some-non-prompt-file.md\t\t \t[](../../folder1/)\t',
                                    },
                                    {
                                        name: 'file.txt',
                                        contents: 'contents of a non-prompt-snippet file',
                                    },
                                    {
                                        name: 'yetAnotherFolder🤭',
                                        children: [
                                            {
                                                name: 'another-file.prompt.md',
                                                contents: `[caption](${rootFolder}/folder1/some-other-folder)\nanother-file.prompt.md contents\t [#file:file.txt](../file.txt)`,
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
            }], 
        /**
         * The root file path to start the resolve process from.
         */
        URI.file(`/${rootFolderName}/file2.prompt.md`), 
        /**
         * The expected references to be resolved.
         */
        [
            new ExpectedReference(rootUri, createTestFileReference('folder1/file3.prompt.md', 2, 14)),
            new ExpectedReference(rootUri, new MarkdownLink(3, 14, '[file4.prompt.md]', '(./folder1/some-other-folder/file4.prompt.md)')),
        ]));
        await test.run();
    });
    suite('metadata', () => {
        test('tools', async function () {
            const rootFolderName = 'resolves-nested-file-references';
            const rootFolder = `/${rootFolderName}`;
            const rootUri = URI.file(rootFolder);
            const test = testDisposables.add(instantiationService.createInstance(TestPromptFileReference, 
            /**
             * The file structure to be created on the disk for the test.
             */
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
                            name: 'file2.prompt.md',
                            contents: [
                                '---',
                                'description: \'Root prompt description.\'',
                                'tools: [\'my-tool1\']',
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
                                        '---',
                                        '',
                                        '[](./some-other-folder/non-existing-folder)',
                                        `\t- some seemingly random #file:${rootFolder}/folder1/some-other-folder/yetAnotherFolder🤭/another-file.prompt.md contents`,
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
                                            contents: 'contents of a non-prompt-snippet file',
                                        },
                                        {
                                            name: 'yetAnotherFolder🤭',
                                            children: [
                                                {
                                                    name: 'another-file.prompt.md',
                                                    contents: [
                                                        '---',
                                                        'tools: [\'my-tool3\', false, "my-tool2" ]',
                                                        '---',
                                                        `[](${rootFolder}/folder1/some-other-folder)`,
                                                        'another-file.prompt.md contents\t [#file:file.txt](../file.txt)',
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
                }], 
            /**
             * The root file path to start the resolve process from.
             */
            URI.file(`/${rootFolderName}/file2.prompt.md`), 
            /**
             * The expected references to be resolved.
             */
            [
                new ExpectedReference(rootUri, createTestFileReference('folder1/file3.prompt.md', 7, 14)),
                new ExpectedReference(rootUri, new MarkdownLink(8, 14, '[file4.prompt.md]', '(./folder1/some-other-folder/file4.prompt.md)')),
            ]));
            const rootReference = await test.run();
            const { metadata } = rootReference;
            assert.deepStrictEqual(metadata, {
                promptType: PromptsType.prompt,
                mode: 'agent',
                description: 'Root prompt description.',
                tools: ['my-tool1'],
            }, 'Must have correct metadata.');
        });
        suite('applyTo', () => {
            test('prompt language', async function () {
                const rootFolderName = 'resolves-nested-file-references';
                const rootFolder = `/${rootFolderName}`;
                const rootUri = URI.file(rootFolder);
                const test = testDisposables.add(instantiationService.createInstance(TestPromptFileReference, 
                /**
                 * The file structure to be created on the disk for the test.
                 */
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
                                name: 'file2.prompt.md',
                                contents: [
                                    '---',
                                    'applyTo: \'**/*\'',
                                    'tools: [ false, \'my-tool12\' , ]',
                                    'description: \'Description of my prompt.\'',
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
                                            '---',
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
                                                    'tools: [\'my-tool1\', "my-tool2", true, , \'my-tool3\' , ]',
                                                    'something: true',
                                                    'mode: \'agent\'\t',
                                                    '---',
                                                    '',
                                                    '',
                                                    'and some more content',
                                                ],
                                            },
                                        ],
                                    },
                                ],
                            },
                        ],
                    }], 
                /**
                 * The root file path to start the resolve process from.
                 */
                URI.file(`/${rootFolderName}/file2.prompt.md`), 
                /**
                 * The expected references to be resolved.
                 */
                [
                    new ExpectedReference(rootUri, createTestFileReference('folder1/file3.prompt.md', 7, 14)),
                    new ExpectedReference(rootUri, new MarkdownLink(8, 14, '[file4.prompt.md]', '(./folder1/some-other-folder/file4.prompt.md)')),
                ]));
                const rootReference = await test.run();
                const { metadata } = rootReference;
                assert.deepStrictEqual(metadata, {
                    promptType: PromptsType.prompt,
                    mode: ChatModeKind.Agent,
                    description: 'Description of my prompt.',
                    tools: ['my-tool12'],
                }, 'Must have correct metadata.');
            });
            test('instructions language', async function () {
                const rootFolderName = 'resolves-nested-file-references';
                const rootFolder = `/${rootFolderName}`;
                const rootUri = URI.file(rootFolder);
                const test = testDisposables.add(instantiationService.createInstance(TestPromptFileReference, 
                /**
                 * The file structure to be created on the disk for the test.
                 */
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
                                name: 'file2.instructions.md',
                                contents: [
                                    '---',
                                    'applyTo: \'**/*\'',
                                    'tools: [ false, \'my-tool12\' , ]',
                                    'description: \'Description of my instructions file.\'',
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
                                            '---',
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
                                                    'tools: [\'my-tool1\', "my-tool2", true, , \'my-tool3\' , ]',
                                                    'something: true',
                                                    'mode: \'agent\'\t',
                                                    '---',
                                                    '',
                                                    '',
                                                    'and some more content',
                                                ],
                                            },
                                        ],
                                    },
                                ],
                            },
                        ],
                    }], 
                /**
                 * The root file path to start the resolve process from.
                 */
                URI.file(`/${rootFolderName}/file2.instructions.md`), 
                /**
                 * The expected references to be resolved.
                 */
                [
                    new ExpectedReference(rootUri, createTestFileReference('folder1/file3.prompt.md', 7, 14)),
                    new ExpectedReference(rootUri, new MarkdownLink(8, 14, '[file4.prompt.md]', '(./folder1/some-other-folder/file4.prompt.md)')),
                ]));
                const rootReference = await test.run();
                const { metadata } = rootReference;
                assert.deepStrictEqual(metadata, {
                    promptType: PromptsType.instructions,
                    applyTo: '**/*',
                    description: 'Description of my instructions file.',
                }, 'Must have correct metadata.');
            });
        });
        suite('tools and mode compatibility', () => {
            test('tools are ignored if root prompt is in the ask mode', async function () {
                const rootFolderName = 'resolves-nested-file-references';
                const rootFolder = `/${rootFolderName}`;
                const rootUri = URI.file(rootFolder);
                const test = testDisposables.add(instantiationService.createInstance(TestPromptFileReference, 
                /**
                 * The file structure to be created on the disk for the test.
                 */
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
                                name: 'file2.prompt.md',
                                contents: [
                                    '---',
                                    'description: \'Description of my prompt.\'',
                                    'mode: "ask" ',
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
                                            'mode: \'agent\'\t',
                                            '---',
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
                                                    '---',
                                                    '',
                                                    '',
                                                    'and some more content',
                                                ],
                                            },
                                        ],
                                    },
                                ],
                            },
                        ],
                    }], 
                /**
                 * The root file path to start the resolve process from.
                 */
                URI.file(`/${rootFolderName}/file2.prompt.md`), 
                /**
                 * The expected references to be resolved.
                 */
                [
                    new ExpectedReference(rootUri, createTestFileReference('folder1/file3.prompt.md', 6, 14)),
                    new ExpectedReference(rootUri, new MarkdownLink(7, 14, '[file4.prompt.md]', '(./folder1/some-other-folder/file4.prompt.md)')),
                ]));
                const rootReference = await test.run();
                const { metadata } = rootReference;
                assert.deepStrictEqual(metadata, {
                    promptType: PromptsType.prompt,
                    mode: ChatModeKind.Ask,
                    description: 'Description of my prompt.',
                }, 'Must have correct metadata.');
            });
            test('tools are ignored if root prompt is in the edit mode', async function () {
                const rootFolderName = 'resolves-nested-file-references';
                const rootFolder = `/${rootFolderName}`;
                const rootUri = URI.file(rootFolder);
                const test = testDisposables.add(instantiationService.createInstance(TestPromptFileReference, 
                /**
                 * The file structure to be created on the disk for the test.
                 */
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
                                name: 'file2.prompt.md',
                                contents: [
                                    '---',
                                    'description: \'Description of my prompt.\'',
                                    'mode:\t\t"edit"\t\t',
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
                                            '---',
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
                                                    'mode: \'agent\'\t',
                                                    '---',
                                                    '',
                                                    '',
                                                    'and some more content',
                                                ],
                                            },
                                        ],
                                    },
                                ],
                            },
                        ],
                    }], 
                /**
                 * The root file path to start the resolve process from.
                 */
                URI.file(`/${rootFolderName}/file2.prompt.md`), 
                /**
                 * The expected references to be resolved.
                 */
                [
                    new ExpectedReference(rootUri, createTestFileReference('folder1/file3.prompt.md', 6, 14)),
                    new ExpectedReference(rootUri, new MarkdownLink(7, 14, '[file4.prompt.md]', '(./folder1/some-other-folder/file4.prompt.md)')),
                ]));
                const rootReference = await test.run();
                const { metadata } = rootReference;
                assert.deepStrictEqual(metadata, {
                    promptType: PromptsType.prompt,
                    mode: ChatModeKind.Edit,
                    description: 'Description of my prompt.',
                }, 'Must have correct metadata.');
            });
            test('tools are not ignored if root prompt is in the agent mode', async function () {
                const rootFolderName = 'resolves-nested-file-references';
                const rootFolder = `/${rootFolderName}`;
                const rootUri = URI.file(rootFolder);
                const test = testDisposables.add(instantiationService.createInstance(TestPromptFileReference, 
                /**
                 * The file structure to be created on the disk for the test.
                 */
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
                                name: 'file2.prompt.md',
                                contents: [
                                    '---',
                                    'description: \'Description of my prompt.\'',
                                    'mode: \t\t "agent" \t\t ',
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
                                            '---',
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
                                                    'tools: [\'my-tool1\', "my-tool2", true, , \'my-tool3\' , ]',
                                                    'something: true',
                                                    'mode: \'agent\'\t',
                                                    '---',
                                                    '',
                                                    '',
                                                    'and some more content',
                                                ],
                                            },
                                        ],
                                    },
                                ],
                            },
                        ],
                    }], 
                /**
                 * The root file path to start the resolve process from.
                 */
                URI.file(`/${rootFolderName}/file2.prompt.md`), 
                /**
                 * The expected references to be resolved.
                 */
                [
                    new ExpectedReference(rootUri, createTestFileReference('folder1/file3.prompt.md', 6, 14)),
                    new ExpectedReference(rootUri, new MarkdownLink(7, 14, '[file4.prompt.md]', '(./folder1/some-other-folder/file4.prompt.md)')),
                ]));
                const rootReference = await test.run();
                const { metadata } = rootReference;
                assert.deepStrictEqual(metadata, {
                    promptType: PromptsType.prompt,
                    mode: ChatModeKind.Agent,
                    description: 'Description of my prompt.',
                }, 'Must have correct metadata.');
            });
            test('tools are not ignored if root prompt implicitly in the agent mode', async function () {
                const rootFolderName = 'resolves-nested-file-references';
                const rootFolder = `/${rootFolderName}`;
                const rootUri = URI.file(rootFolder);
                const test = testDisposables.add(instantiationService.createInstance(TestPromptFileReference, 
                /**
                 * The file structure to be created on the disk for the test.
                 */
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
                                name: 'file2.prompt.md',
                                contents: [
                                    '---',
                                    'tools: [ false, \'my-tool12\' , ]',
                                    'description: \'Description of the prompt file.\'',
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
                                            '---',
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
                                                    'tools: [\'my-tool1\', "my-tool2", true, , \'my-tool3\' , ]',
                                                    'something: true',
                                                    'mode: \'agent\'\t',
                                                    '---',
                                                    '',
                                                    '',
                                                    'and some more content',
                                                ],
                                            },
                                        ],
                                    },
                                ],
                            },
                        ],
                    }], 
                /**
                 * The root file path to start the resolve process from.
                 */
                URI.file(`/${rootFolderName}/file2.prompt.md`), 
                /**
                 * The expected references to be resolved.
                 */
                [
                    new ExpectedReference(rootUri, createTestFileReference('folder1/file3.prompt.md', 6, 14)),
                    new ExpectedReference(rootUri, new MarkdownLink(7, 14, '[file4.prompt.md]', '(./folder1/some-other-folder/file4.prompt.md)')),
                ]));
                const rootReference = await test.run();
                const { metadata, } = rootReference;
                assert.deepStrictEqual(metadata, {
                    promptType: PromptsType.prompt,
                    mode: ChatModeKind.Agent,
                    tools: ['my-tool12'],
                    description: 'Description of the prompt file.',
                }, 'Must have correct metadata.');
            });
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvbXB0RmlsZVJlZmVyZW5jZS50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvYWR2aWthci9Eb2N1bWVudHMvYXJjaGl0ZWN0L2FyY2gyL0FyY2hJREUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC90ZXN0L2NvbW1vbi9wcm9tcHRTeW50YXgvcHJvbXB0RmlsZVJlZmVyZW5jZS50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDakUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQ3hFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUNuRSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDM0QsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLGlEQUFpRCxDQUFDO0FBQ2hGLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQ3RHLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQztBQUN0RSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSx1REFBdUQsQ0FBQztBQUN6RixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDbEYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sa0VBQWtFLENBQUM7QUFDekcsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0seUVBQXlFLENBQUM7QUFDL0csT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQ2hGLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx3REFBd0QsQ0FBQztBQUNyRixPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSx1RUFB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