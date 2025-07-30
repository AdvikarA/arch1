/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { URI } from '../../../../base/common/uri.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { getMimeTypes, registerPlatformLanguageAssociation, registerConfiguredLanguageAssociation } from '../../../common/services/languagesAssociations.js';
suite('LanguagesAssociations', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('Dynamically Register Text Mime', () => {
        let guess = getMimeTypes(URI.file('foo.monaco'));
        assert.deepStrictEqual(guess, ['application/unknown']);
        registerPlatformLanguageAssociation({ id: 'monaco', extension: '.monaco', mime: 'text/monaco' });
        guess = getMimeTypes(URI.file('foo.monaco'));
        assert.deepStrictEqual(guess, ['text/monaco', 'text/plain']);
        guess = getMimeTypes(URI.file('.monaco'));
        assert.deepStrictEqual(guess, ['text/monaco', 'text/plain']);
        registerPlatformLanguageAssociation({ id: 'codefile', filename: 'Codefile', mime: 'text/code' });
        guess = getMimeTypes(URI.file('Codefile'));
        assert.deepStrictEqual(guess, ['text/code', 'text/plain']);
        guess = getMimeTypes(URI.file('foo.Codefile'));
        assert.deepStrictEqual(guess, ['application/unknown']);
        registerPlatformLanguageAssociation({ id: 'docker', filepattern: 'Docker*', mime: 'text/docker' });
        guess = getMimeTypes(URI.file('Docker-debug'));
        assert.deepStrictEqual(guess, ['text/docker', 'text/plain']);
        guess = getMimeTypes(URI.file('docker-PROD'));
        assert.deepStrictEqual(guess, ['text/docker', 'text/plain']);
        registerPlatformLanguageAssociation({ id: 'niceregex', mime: 'text/nice-regex', firstline: /RegexesAreNice/ });
        guess = getMimeTypes(URI.file('Randomfile.noregistration'), 'RegexesAreNice');
        assert.deepStrictEqual(guess, ['text/nice-regex', 'text/plain']);
        guess = getMimeTypes(URI.file('Randomfile.noregistration'), 'RegexesAreNotNice');
        assert.deepStrictEqual(guess, ['application/unknown']);
        guess = getMimeTypes(URI.file('Codefile'), 'RegexesAreNice');
        assert.deepStrictEqual(guess, ['text/code', 'text/plain']);
    });
    test('Mimes Priority', () => {
        registerPlatformLanguageAssociation({ id: 'monaco', extension: '.monaco', mime: 'text/monaco' });
        registerPlatformLanguageAssociation({ id: 'foobar', mime: 'text/foobar', firstline: /foobar/ });
        let guess = getMimeTypes(URI.file('foo.monaco'));
        assert.deepStrictEqual(guess, ['text/monaco', 'text/plain']);
        guess = getMimeTypes(URI.file('foo.monaco'), 'foobar');
        assert.deepStrictEqual(guess, ['text/monaco', 'text/plain']);
        registerPlatformLanguageAssociation({ id: 'docker', filename: 'dockerfile', mime: 'text/winner' });
        registerPlatformLanguageAssociation({ id: 'docker', filepattern: 'dockerfile*', mime: 'text/looser' });
        guess = getMimeTypes(URI.file('dockerfile'));
        assert.deepStrictEqual(guess, ['text/winner', 'text/plain']);
        registerPlatformLanguageAssociation({ id: 'azure-looser', mime: 'text/azure-looser', firstline: /azure/ });
        registerPlatformLanguageAssociation({ id: 'azure-winner', mime: 'text/azure-winner', firstline: /azure/ });
        guess = getMimeTypes(URI.file('azure'), 'azure');
        assert.deepStrictEqual(guess, ['text/azure-winner', 'text/plain']);
    });
    test('Specificity priority 1', () => {
        registerPlatformLanguageAssociation({ id: 'monaco2', extension: '.monaco2', mime: 'text/monaco2' });
        registerPlatformLanguageAssociation({ id: 'monaco2', filename: 'specific.monaco2', mime: 'text/specific-monaco2' });
        assert.deepStrictEqual(getMimeTypes(URI.file('specific.monaco2')), ['text/specific-monaco2', 'text/plain']);
        assert.deepStrictEqual(getMimeTypes(URI.file('foo.monaco2')), ['text/monaco2', 'text/plain']);
    });
    test('Specificity priority 2', () => {
        registerPlatformLanguageAssociation({ id: 'monaco3', filename: 'specific.monaco3', mime: 'text/specific-monaco3' });
        registerPlatformLanguageAssociation({ id: 'monaco3', extension: '.monaco3', mime: 'text/monaco3' });
        assert.deepStrictEqual(getMimeTypes(URI.file('specific.monaco3')), ['text/specific-monaco3', 'text/plain']);
        assert.deepStrictEqual(getMimeTypes(URI.file('foo.monaco3')), ['text/monaco3', 'text/plain']);
    });
    test('Mimes Priority - Longest Extension wins', () => {
        registerPlatformLanguageAssociation({ id: 'monaco', extension: '.monaco', mime: 'text/monaco' });
        registerPlatformLanguageAssociation({ id: 'monaco', extension: '.monaco.xml', mime: 'text/monaco-xml' });
        registerPlatformLanguageAssociation({ id: 'monaco', extension: '.monaco.xml.build', mime: 'text/monaco-xml-build' });
        let guess = getMimeTypes(URI.file('foo.monaco'));
        assert.deepStrictEqual(guess, ['text/monaco', 'text/plain']);
        guess = getMimeTypes(URI.file('foo.monaco.xml'));
        assert.deepStrictEqual(guess, ['text/monaco-xml', 'text/plain']);
        guess = getMimeTypes(URI.file('foo.monaco.xml.build'));
        assert.deepStrictEqual(guess, ['text/monaco-xml-build', 'text/plain']);
    });
    test('Mimes Priority - User configured wins', () => {
        registerConfiguredLanguageAssociation({ id: 'monaco', extension: '.monaco.xnl', mime: 'text/monaco' });
        registerPlatformLanguageAssociation({ id: 'monaco', extension: '.monaco.xml', mime: 'text/monaco-xml' });
        const guess = getMimeTypes(URI.file('foo.monaco.xnl'));
        assert.deepStrictEqual(guess, ['text/monaco', 'text/plain']);
    });
    test('Mimes Priority - Pattern matches on path if specified', () => {
        registerPlatformLanguageAssociation({ id: 'monaco', filepattern: '**/dot.monaco.xml', mime: 'text/monaco' });
        registerPlatformLanguageAssociation({ id: 'other', filepattern: '*ot.other.xml', mime: 'text/other' });
        const guess = getMimeTypes(URI.file('/some/path/dot.monaco.xml'));
        assert.deepStrictEqual(guess, ['text/monaco', 'text/plain']);
    });
    test('Mimes Priority - Last registered mime wins', () => {
        registerPlatformLanguageAssociation({ id: 'monaco', filepattern: '**/dot.monaco.xml', mime: 'text/monaco' });
        registerPlatformLanguageAssociation({ id: 'other', filepattern: '**/dot.monaco.xml', mime: 'text/other' });
        const guess = getMimeTypes(URI.file('/some/path/dot.monaco.xml'));
        assert.deepStrictEqual(guess, ['text/other', 'text/plain']);
    });
    test('Data URIs', () => {
        registerPlatformLanguageAssociation({ id: 'data', extension: '.data', mime: 'text/data' });
        assert.deepStrictEqual(getMimeTypes(URI.parse(`data:;label:something.data;description:data,`)), ['text/data', 'text/plain']);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGFuZ3VhZ2VzQXNzb2NpYXRpb25zLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9hZHZpa2FyL0RvY3VtZW50cy9hcmNoaXRlY3QvYXJjaDIvQXJjaElERS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvdGVzdC9jb21tb24vc2VydmljZXMvbGFuZ3VhZ2VzQXNzb2NpYXRpb25zLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQzVCLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUNyRCxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUNoRyxPQUFPLEVBQUUsWUFBWSxFQUFFLG1DQUFtQyxFQUFFLHFDQUFxQyxFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFFN0osS0FBSyxDQUFDLHVCQUF1QixFQUFFLEdBQUcsRUFBRTtJQUVuQyx1Q0FBdUMsRUFBRSxDQUFDO0lBRTFDLElBQUksQ0FBQyxnQ0FBZ0MsRUFBRSxHQUFHLEVBQUU7UUFDM0MsSUFBSSxLQUFLLEdBQUcsWUFBWSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQztRQUNqRCxNQUFNLENBQUMsZUFBZSxDQUFDLEtBQUssRUFBRSxDQUFDLHFCQUFxQixDQUFDLENBQUMsQ0FBQztRQUV2RCxtQ0FBbUMsQ0FBQyxFQUFFLEVBQUUsRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLFNBQVMsRUFBRSxJQUFJLEVBQUUsYUFBYSxFQUFFLENBQUMsQ0FBQztRQUNqRyxLQUFLLEdBQUcsWUFBWSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQztRQUM3QyxNQUFNLENBQUMsZUFBZSxDQUFDLEtBQUssRUFBRSxDQUFDLGFBQWEsRUFBRSxZQUFZLENBQUMsQ0FBQyxDQUFDO1FBRTdELEtBQUss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