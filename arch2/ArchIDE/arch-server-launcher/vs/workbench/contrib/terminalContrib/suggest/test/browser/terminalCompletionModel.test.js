/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert, { notStrictEqual, strictEqual } from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../../base/test/common/utils.js';
import { TerminalCompletionModel } from '../../browser/terminalCompletionModel.js';
import { LineContext } from '../../../../../services/suggest/browser/simpleCompletionModel.js';
import { TerminalCompletionItem, TerminalCompletionItemKind } from '../../browser/terminalCompletionItem.js';
function createItem(options) {
    return new TerminalCompletionItem({
        ...options,
        kind: options.kind ?? TerminalCompletionItemKind.Method,
        label: options.label || 'defaultLabel',
        provider: options.provider || 'defaultProvider',
        replacementIndex: options.replacementIndex || 0,
        replacementLength: options.replacementLength || 1,
    });
}
function createFileItems(...labels) {
    return labels.map(label => createItem({ label, kind: TerminalCompletionItemKind.File }));
}
function createFileItemsModel(...labels) {
    return new TerminalCompletionModel(createFileItems(...labels), new LineContext('', 0));
}
function createFolderItems(...labels) {
    return labels.map(label => createItem({ label, kind: TerminalCompletionItemKind.Folder }));
}
function createFolderItemsModel(...labels) {
    return new TerminalCompletionModel(createFolderItems(...labels), new LineContext('', 0));
}
function assertItems(model, labels) {
    assert.deepStrictEqual(model.items.map(i => i.completion.label), labels);
    assert.strictEqual(model.items.length, labels.length); // sanity check
}
suite('TerminalCompletionModel', function () {
    ensureNoDisposablesAreLeakedInTestSuite();
    let model;
    test('should handle an empty list', function () {
        model = new TerminalCompletionModel([], new LineContext('', 0));
        assert.strictEqual(model.items.length, 0);
    });
    test('should handle a list with one item', function () {
        model = new TerminalCompletionModel([
            createItem({ label: 'a' }),
        ], new LineContext('', 0));
        assert.strictEqual(model.items.length, 1);
        assert.strictEqual(model.items[0].completion.label, 'a');
    });
    test('should sort alphabetically', function () {
        model = new TerminalCompletionModel([
            createItem({ label: 'b' }),
            createItem({ label: 'z' }),
            createItem({ label: 'a' }),
        ], new LineContext('', 0));
        assert.strictEqual(model.items.length, 3);
        assert.strictEqual(model.items[0].completion.label, 'a');
        assert.strictEqual(model.items[1].completion.label, 'b');
        assert.strictEqual(model.items[2].completion.label, 'z');
    });
    test('fuzzy matching', () => {
        const initial = [
            '.\\.eslintrc',
            '.\\resources\\',
            '.\\scripts\\',
            '.\\src\\',
        ];
        const expected = [
            '.\\scripts\\',
            '.\\src\\',
            '.\\.eslintrc',
            '.\\resources\\',
        ];
        model = new TerminalCompletionModel(initial.map(e => (createItem({ label: e }))), new LineContext('s', 0));
        assertItems(model, expected);
    });
    suite('files and folders', () => {
        test('should deprioritize files that start with underscore', function () {
            const initial = ['_a', 'a', 'z'];
            const expected = ['a', 'z', '_a'];
            assertItems(createFileItemsModel(...initial), expected);
            assertItems(createFolderItemsModel(...initial), expected);
        });
        test('should ignore the dot in dotfiles when sorting', function () {
            const initial = ['b', '.a', 'a', '.b'];
            const expected = ['.a', 'a', 'b', '.b'];
            assertItems(createFileItemsModel(...initial), expected);
            assertItems(createFolderItemsModel(...initial), expected);
        });
        test('should handle many files and folders correctly', function () {
            // This is VS Code's root directory with some python items added that have special
            // sorting
            const items = [
                ...createFolderItems('__pycache', '.build', '.configurations', '.devcontainer', '.eslint-plugin-local', '.github', '.profile-oss', '.vscode', '.vscode-test', 'build', 'cli', 'extensions', 'node_modules', 'out', 'remote', 'resources', 'scripts', 'src', 'test'),
                ...createFileItems('__init__.py', '.editorconfig', '.eslint-ignore', '.git-blame-ignore-revs', '.gitattributes', '.gitignore', '.lsifrc.json', '.mailmap', '.mention-bot', '.npmrc', '.nvmrc', '.vscode-test.js', 'cglicenses.json', 'cgmanifest.json', 'CodeQL.yml', 'CONTRIBUTING.md', 'eslint.config.js', 'gulpfile.js', 'LICENSE.txt', 'package-lock.json', 'package.json', 'product.json', 'README.md', 'SECURITY.md', 'ThirdPartyNotices.txt', 'tsfmt.json')
            ];
            const model = new TerminalCompletionModel(items, new LineContext('', 0));
            assertItems(model, [
                '.build',
                'build',
                'cglicenses.json',
                'cgmanifest.json',
                'cli',
                'CodeQL.yml',
                '.configurations',
                'CONTRIBUTING.md',
                '.devcontainer',
                '.editorconfig',
                'eslint.config.js',
                '.eslint-ignore',
                '.eslint-plugin-local',
                'extensions',
                '.gitattributes',
                '.git-blame-ignore-revs',
                '.github',
                '.gitignore',
                'gulpfile.js',
                'LICENSE.txt',
                '.lsifrc.json',
                '.mailmap',
                '.mention-bot',
                'node_modules',
                '.npmrc',
                '.nvmrc',
                'out',
                'package.json',
                'package-lock.json',
                'product.json',
                '.profile-oss',
                'README.md',
                'remote',
                'resources',
                'scripts',
                'SECURITY.md',
                'src',
                'test',
                'ThirdPartyNotices.txt',
                'tsfmt.json',
                '.vscode',
                '.vscode-test',
                '.vscode-test.js',
                '__init__.py',
                '__pycache',
            ]);
        });
    });
    suite('Punctuation', () => {
        test('punctuation chars should be below other methods', function () {
            const items = [
                createItem({ label: 'a' }),
                createItem({ label: 'b' }),
                createItem({ label: ',' }),
                createItem({ label: ';' }),
                createItem({ label: ':' }),
                createItem({ label: 'c' }),
                createItem({ label: '[' }),
                createItem({ label: '...' }),
            ];
            model = new TerminalCompletionModel(items, new LineContext('', 0));
            assertItems(model, ['a', 'b', 'c', ',', ';', ':', '[', '...']);
        });
        test('punctuation chars should be below other files', function () {
            const items = [
                createItem({ label: '..' }),
                createItem({ label: '...' }),
                createItem({ label: '../' }),
                createItem({ label: './a/' }),
                createItem({ label: './b/' }),
            ];
            model = new TerminalCompletionModel(items, new LineContext('', 0));
            assertItems(model, ['./a/', './b/', '..', '...', '../']);
        });
    });
    suite('inline completions', () => {
        function createItems(kind) {
            return [
                ...createFolderItems('a', 'c'),
                ...createFileItems('b', 'd'),
                new TerminalCompletionItem({
                    label: 'ab',
                    provider: 'core',
                    replacementIndex: 0,
                    replacementLength: 0,
                    kind
                })
            ];
        }
        suite('InlineSuggestion', () => {
            test('should put on top generally', function () {
                const model = new TerminalCompletionModel(createItems(TerminalCompletionItemKind.InlineSuggestion), new LineContext('', 0));
                strictEqual(model.items[0].completion.label, 'ab');
            });
            test('should NOT put on top when there\'s an exact match of another item', function () {
                const model = new TerminalCompletionModel(createItems(TerminalCompletionItemKind.InlineSuggestion), new LineContext('a', 0));
                notStrictEqual(model.items[0].completion.label, 'ab');
                strictEqual(model.items[1].completion.label, 'ab');
            });
        });
        suite('InlineSuggestionAlwaysOnTop', () => {
            test('should put on top generally', function () {
                const model = new TerminalCompletionModel(createItems(TerminalCompletionItemKind.InlineSuggestionAlwaysOnTop), new LineContext('', 0));
                strictEqual(model.items[0].completion.label, 'ab');
            });
            test('should put on top even if there\'s an exact match of another item', function () {
                const model = new TerminalCompletionModel(createItems(TerminalCompletionItemKind.InlineSuggestionAlwaysOnTop), new LineContext('a', 0));
                strictEqual(model.items[0].completion.label, 'ab');
            });
        });
    });
    suite('lsp priority sorting', () => {
        suite('Sort Python provider items', () => {
            test('Prioritize items with "python" in provider name when inside REPL', () => {
                const items = [
                    createItem({ label: 'b_default_provider', provider: 'defaultProvider' }),
                    createItem({ label: 'a_python_provider', provider: 'ms-python.python' })
                ];
                const model = new TerminalCompletionModel(items, new LineContext('', 0));
                assertItems(model, ['a_python_provider', 'b_default_provider']);
            });
            test('should sort "python" provider items above others', () => {
                const items = [
                    createItem({ label: 'z_default', provider: 'default' }),
                    createItem({ label: 'c_python', provider: 'ms-python.pylance' }),
                    createItem({ label: 'a_default', provider: 'default' }),
                    createItem({ label: 'b_python', provider: 'ms-python.python' })
                ];
                const model = new TerminalCompletionModel(items, new LineContext('', 0));
                assertItems(model, ['b_python', 'c_python', 'a_default', 'z_default']);
            });
            test('InlineSuggestionAlwaysOnTop should still be prioritized over "python" provider', () => {
                const items = [
                    createItem({ label: 'b_python', provider: 'python_provider' }),
                    new TerminalCompletionItem({
                        label: 'a_always_on_top',
                        provider: 'core',
                        replacementIndex: 0,
                        replacementLength: 0,
                        kind: TerminalCompletionItemKind.InlineSuggestionAlwaysOnTop
                    }),
                    createItem({ label: 'c_default', provider: 'default_provider' })
                ];
                const model = new TerminalCompletionModel(items, new LineContext('', 0));
                assertItems(model, ['a_always_on_top', 'b_python', 'c_default']);
            });
        });
    });
    suite('git branch priority sorting', () => {
        test('should prioritize main and master branches for git commands', () => {
            const items = [
                createItem({ kind: TerminalCompletionItemKind.Argument, label: 'feature-branch' }),
                createItem({ kind: TerminalCompletionItemKind.Argument, label: 'master' }),
                createItem({ kind: TerminalCompletionItemKind.Argument, label: 'development' }),
                createItem({ kind: TerminalCompletionItemKind.Argument, label: 'main' })
            ];
            const model = new TerminalCompletionModel(items, new LineContext('git checkout ', 0));
            assertItems(model, ['main', 'master', 'development', 'feature-branch']);
        });
        test('should prioritize main and master branches for git switch command', () => {
            const items = [
                createItem({ kind: TerminalCompletionItemKind.Argument, label: 'feature-branch' }),
                createItem({ kind: TerminalCompletionItemKind.Argument, label: 'main' }),
                createItem({ kind: TerminalCompletionItemKind.Argument, label: 'another-feature' }),
                createItem({ kind: TerminalCompletionItemKind.Argument, label: 'master' })
            ];
            const model = new TerminalCompletionModel(items, new LineContext('git switch ', 0));
            assertItems(model, ['main', 'master', 'another-feature', 'feature-branch']);
        });
        test('should not prioritize main and master for non-git commands', () => {
            const items = [
                createItem({ kind: TerminalCompletionItemKind.Argument, label: 'feature-branch' }),
                createItem({ kind: TerminalCompletionItemKind.Argument, label: 'master' }),
                createItem({ kind: TerminalCompletionItemKind.Argument, label: 'main' })
            ];
            const model = new TerminalCompletionModel(items, new LineContext('ls ', 0));
            assertItems(model, ['feature-branch', 'main', 'master']);
        });
        test('should handle git commands with leading whitespace', () => {
            const items = [
                createItem({ kind: TerminalCompletionItemKind.Argument, label: 'feature-branch' }),
                createItem({ kind: TerminalCompletionItemKind.Argument, label: 'master' }),
                createItem({ kind: TerminalCompletionItemKind.Argument, label: 'main' })
            ];
            const model = new TerminalCompletionModel(items, new LineContext('  git checkout ', 0));
            assertItems(model, ['main', 'master', 'feature-branch']);
        });
        test('should work with complex label objects', () => {
            const items = [
                createItem({ kind: TerminalCompletionItemKind.Argument, label: { label: 'feature-branch', description: 'Feature branch' } }),
                createItem({ kind: TerminalCompletionItemKind.Argument, label: { label: 'master', description: 'Master branch' } }),
                createItem({ kind: TerminalCompletionItemKind.Argument, label: { label: 'main', description: 'Main branch' } })
            ];
            const model = new TerminalCompletionModel(items, new LineContext('git checkout ', 0));
            assertItems(model, [
                { label: "main", description: "Main branch" },
                { label: "master", description: "Master branch" },
                { label: "feature-branch", description: "Feature branch" },
            ]);
        });
        test('should not prioritize branches with similar names', () => {
            const items = [
                createItem({ kind: TerminalCompletionItemKind.Argument, label: 'mainline' }),
                createItem({ kind: TerminalCompletionItemKind.Argument, label: 'masterpiece' }),
                createItem({ kind: TerminalCompletionItemKind.Argument, label: 'main' }),
                createItem({ kind: TerminalCompletionItemKind.Argument, label: 'master' })
            ];
            const model = new TerminalCompletionModel(items, new LineContext('git checkout ', 0));
            assertItems(model, ['main', 'master', 'mainline', 'masterpiece']);
        });
        test('should prioritize for git branch -d', () => {
            const items = [
                createItem({ kind: TerminalCompletionItemKind.Argument, label: 'main' }),
                createItem({ kind: TerminalCompletionItemKind.Argument, label: 'master' }),
                createItem({ kind: TerminalCompletionItemKind.Argument, label: 'dev' })
            ];
            const model = new TerminalCompletionModel(items, new LineContext('git branch -d ', 0));
            assertItems(model, ['main', 'master', 'dev']);
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxDb21wbGV0aW9uTW9kZWwudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL2FkdmlrYXIvRG9jdW1lbnRzL2FyY2hpdGVjdC9hcmNoMi9BcmNoSURFL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlcm1pbmFsQ29udHJpYi9zdWdnZXN0L3Rlc3QvYnJvd3Nlci90ZXJtaW5hbENvbXBsZXRpb25Nb2RlbC50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBQ2hHLE9BQU8sTUFBTSxFQUFFLEVBQUUsY0FBYyxFQUFFLFdBQVcsRUFBRSxNQUFNLFFBQVEsQ0FBQztBQUM3RCxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUN0RyxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUNuRixPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sa0VBQWtFLENBQUM7QUFDL0YsT0FBTyxFQUFFLHNCQUFzQixFQUFFLDBCQUEwQixFQUE0QixNQUFNLHlDQUF5QyxDQUFDO0FBR3ZJLFNBQVMsVUFBVSxDQUFDLE9BQXFDO0lBQ3hELE9BQU8sSUFBSSxzQkFBc0IsQ0FBQztRQUNqQyxHQUFHLE9BQU87UUFDVixJQUFJLEVBQUUsT0FBTyxDQUFDLElBQUksSUFBSSwwQkFBMEIsQ0FBQyxNQUFNO1FBQ3ZELEtBQUssRUFBRSxPQUFPLENBQUMsS0FBSyxJQUFJLGNBQWM7UUFDdEMsUUFBUSxFQUFFLE9BQU8sQ0FBQyxRQUFRLElBQUksaUJBQWlCO1FBQy9DLGdCQUFnQixFQUFFLE9BQU8sQ0FBQyxnQkFBZ0IsSUFBSSxDQUFDO1FBQy9DLGlCQUFpQixFQUFFLE9BQU8sQ0FBQyxpQkFBaUIsSUFBSSxDQUFDO0tBQ2pELENBQUMsQ0FBQztBQUNKLENBQUM7QUFFRCxTQUFTLGVBQWUsQ0FBQyxHQUFHLE1BQWdCO0lBQzNDLE9BQU8sTUFBTSxDQUFDLEdB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