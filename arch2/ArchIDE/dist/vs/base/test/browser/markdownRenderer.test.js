/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { fillInIncompleteTokens, renderMarkdown, renderAsPlaintext } from '../../browser/markdownRenderer.js';
import { MarkdownString } from '../../common/htmlContent.js';
import * as marked from '../../common/marked/marked.js';
import { parse } from '../../common/marshalling.js';
import { isWeb } from '../../common/platform.js';
import { URI } from '../../common/uri.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../common/utils.js';
function strToNode(str) {
    return new DOMParser().parseFromString(str, 'text/html').body.firstChild;
}
function assertNodeEquals(actualNode, expectedHtml) {
    const expectedNode = strToNode(expectedHtml);
    assert.ok(actualNode.isEqualNode(expectedNode), `Expected: ${expectedNode.outerHTML}\nActual: ${actualNode.outerHTML}`);
}
suite('MarkdownRenderer', () => {
    const store = ensureNoDisposablesAreLeakedInTestSuite();
    suite('Sanitization', () => {
        test('Should not render images with unknown schemes', () => {
            const markdown = { value: `![image](no-such://example.com/cat.gif)` };
            const result = store.add(renderMarkdown(markdown)).element;
            assert.strictEqual(result.innerHTML, '<p><img alt="image"></p>');
        });
    });
    suite('Images', () => {
        test('image rendering conforms to default', () => {
            const markdown = { value: `![image](http://example.com/cat.gif 'caption')` };
            const result = store.add(renderMarkdown(markdown)).element;
            assertNodeEquals(result, '<div><p><img title="caption" alt="image" src="http://example.com/cat.gif"></p></div>');
        });
        test('image rendering conforms to default without title', () => {
            const markdown = { value: `![image](http://example.com/cat.gif)` };
            const result = store.add(renderMarkdown(markdown)).element;
            assertNodeEquals(result, '<div><p><img alt="image" src="http://example.com/cat.gif"></p></div>');
        });
        test('image width from title params', () => {
            const result = store.add(renderMarkdown({ value: `![image](http://example.com/cat.gif|width=100px 'caption')` })).element;
            assertNodeEquals(result, `<div><p><img width="100" title="caption" alt="image" src="http://example.com/cat.gif"></p></div>`);
        });
        test('image height from title params', () => {
            const result = store.add(renderMarkdown({ value: `![image](http://example.com/cat.gif|height=100 'caption')` })).element;
            assertNodeEquals(result, `<div><p><img height="100" title="caption" alt="image" src="http://example.com/cat.gif"></p></div>`);
        });
        test('image width and height from title params', () => {
            const result = store.add(renderMarkdown({ value: `![image](http://example.com/cat.gif|height=200,width=100 'caption')` })).element;
            assertNodeEquals(result, `<div><p><img height="200" width="100" title="caption" alt="image" src="http://example.com/cat.gif"></p></div>`);
        });
        test('image with file uri should render as same origin uri', () => {
            if (isWeb) {
                return;
            }
            const result = store.add(renderMarkdown({ value: `![image](file:///images/cat.gif)` })).element;
            assertNodeEquals(result, '<div><p><img src="vscode-file://vscode-app/images/cat.gif" alt="image"></p></div>');
        });
    });
    suite('Code block renderer', () => {
        const simpleCodeBlockRenderer = (lang, code) => {
            const element = document.createElement('code');
            element.textContent = code;
            return Promise.resolve(element);
        };
        test('asyncRenderCallback should be invoked for code blocks', () => {
            const markdown = { value: '```js\n1 + 1;\n```' };
            return new Promise(resolve => {
                store.add(renderMarkdown(markdown, {
                    asyncRenderCallback: resolve,
                    codeBlockRenderer: simpleCodeBlockRenderer
                }));
            });
        });
        test('asyncRenderCallback should not be invoked if result is immediately disposed', () => {
            const markdown = { value: '```js\n1 + 1;\n```' };
            return new Promise((resolve, reject) => {
                const result = renderMarkdown(markdown, {
                    asyncRenderCallback: reject,
                    codeBlockRenderer: simpleCodeBlockRenderer
                });
                result.dispose();
                setTimeout(resolve, 10);
            });
        });
        test('asyncRenderCallback should not be invoked if dispose is called before code block is rendered', () => {
            const markdown = { value: '```js\n1 + 1;\n```' };
            return new Promise((resolve, reject) => {
                let resolveCodeBlockRendering;
                const result = renderMarkdown(markdown, {
                    asyncRenderCallback: reject,
                    codeBlockRenderer: () => {
                        return new Promise(resolve => {
                            resolveCodeBlockRendering = resolve;
                        });
                    }
                });
                setTimeout(() => {
                    result.dispose();
                    resolveCodeBlockRendering(document.createElement('code'));
                    setTimeout(resolve, 10);
                }, 10);
            });
        });
        test('Code blocks should use leading language id (#157793)', async () => {
            const markdown = { value: '```js some other stuff\n1 + 1;\n```' };
            const lang = await new Promise(resolve => {
                store.add(renderMarkdown(markdown, {
                    codeBlockRenderer: async (lang, value) => {
                        resolve(lang);
                        return simpleCodeBlockRenderer(lang, value);
                    }
                }));
            });
            assert.strictEqual(lang, 'js');
        });
    });
    suite('ThemeIcons Support On', () => {
        test('render appendText', () => {
            const mds = new MarkdownString(undefined, { supportThemeIcons: true });
            mds.appendText('$(zap) $(not a theme icon) $(add)');
            const result = store.add(renderMarkdown(mds)).element;
            assert.strictEqual(result.innerHTML, `<p>$(zap)&nbsp;$(not&nbsp;a&nbsp;theme&nbsp;icon)&nbsp;$(add)</p>`);
        });
        test('render appendMarkdown', () => {
            const mds = new MarkdownString(undefined, { supportThemeIcons: true });
            mds.appendMarkdown('$(zap) $(not a theme icon) $(add)');
            const result = store.add(renderMarkdown(mds)).element;
            assert.strictEqual(result.innerHTML, `<p><span class="codicon codicon-zap"></span> $(not a theme icon) <span class="codicon codicon-add"></span></p>`);
        });
        test('render appendMarkdown with escaped icon', () => {
            const mds = new MarkdownString(undefined, { supportThemeIcons: true });
            mds.appendMarkdown('\\$(zap) $(not a theme icon) $(add)');
            const result = store.add(renderMarkdown(mds)).element;
            assert.strictEqual(result.innerHTML, `<p>$(zap) $(not a theme icon) <span class="codicon codicon-add"></span></p>`);
        });
        test('render icon in link', () => {
            const mds = new MarkdownString(undefined, { supportThemeIcons: true });
            mds.appendMarkdown(`[$(zap)-link](#link)`);
            const result = store.add(renderMarkdown(mds)).element;
            assert.strictEqual(result.innerHTML, `<p><a data-href="#link" href="" title="#link" draggable="false"><span class="codicon codicon-zap"></span>-link</a></p>`);
        });
        test('render icon in table', () => {
            const mds = new MarkdownString(undefined, { supportThemeIcons: true });
            mds.appendMarkdown(`
| text   | text                 |
|--------|----------------------|
| $(zap) | [$(zap)-link](#link) |`);
            const result = store.add(renderMarkdown(mds)).element;
            assert.strictEqual(result.innerHTML, `<table>
<thead>
<tr>
<th>text</th>
<th>text</th>
</tr>
</thead>
<tbody><tr>
<td><span class="codicon codicon-zap"></span></td>
<td><a data-href="#link" href="" title="#link" draggable="false"><span class="codicon codicon-zap"></span>-link</a></td>
</tr>
</tbody></table>
`);
        });
        test('render icon in <a> without href (#152170)', () => {
            const mds = new MarkdownString(undefined, { supportThemeIcons: true, supportHtml: true });
            mds.appendMarkdown(`<a>$(sync)</a>`);
            const result = store.add(renderMarkdown(mds)).element;
            assert.strictEqual(result.innerHTML, `<p><span class="codicon codicon-sync"></span></p>`);
        });
    });
    suite('ThemeIcons Support Off', () => {
        test('render appendText', () => {
            const mds = new MarkdownString(undefined, { supportThemeIcons: false });
            mds.appendText('$(zap) $(not a theme icon) $(add)');
            const result = store.add(renderMarkdown(mds)).element;
            assert.strictEqual(result.innerHTML, `<p>$(zap)&nbsp;$(not&nbsp;a&nbsp;theme&nbsp;icon)&nbsp;$(add)</p>`);
        });
        test('render appendMarkdown with escaped icon', () => {
            const mds = new MarkdownString(undefined, { supportThemeIcons: false });
            mds.appendMarkdown('\\$(zap) $(not a theme icon) $(add)');
            const result = store.add(renderMarkdown(mds)).element;
            assert.strictEqual(result.innerHTML, `<p>$(zap) $(not a theme icon) $(add)</p>`);
        });
    });
    test('npm Hover Run Script not working #90855', function () {
        const md = JSON.parse('{"value":"[Run Script](command:npm.runScriptFromHover?%7B%22documentUri%22%3A%7B%22%24mid%22%3A1%2C%22fsPath%22%3A%22c%3A%5C%5CUsers%5C%5Cjrieken%5C%5CCode%5C%5C_sample%5C%5Cfoo%5C%5Cpackage.json%22%2C%22_sep%22%3A1%2C%22external%22%3A%22file%3A%2F%2F%2Fc%253A%2FUsers%2Fjrieken%2FCode%2F_sample%2Ffoo%2Fpackage.json%22%2C%22path%22%3A%22%2Fc%3A%2FUsers%2Fjrieken%2FCode%2F_sample%2Ffoo%2Fpackage.json%22%2C%22scheme%22%3A%22file%22%7D%2C%22script%22%3A%22echo%22%7D \\"Run the script as a task\\")","supportThemeIcons":false,"isTrusted":true,"uris":{"__uri_e49443":{"$mid":1,"fsPath":"c:\\\\Users\\\\jrieken\\\\Code\\\\_sample\\\\foo\\\\package.json","_sep":1,"external":"file:///c%3A/Users/jrieken/Code/_sample/foo/package.json","path":"/c:/Users/jrieken/Code/_sample/foo/package.json","scheme":"file"},"command:npm.runScriptFromHover?%7B%22documentUri%22%3A%7B%22%24mid%22%3A1%2C%22fsPath%22%3A%22c%3A%5C%5CUsers%5C%5Cjrieken%5C%5CCode%5C%5C_sample%5C%5Cfoo%5C%5Cpackage.json%22%2C%22_sep%22%3A1%2C%22external%22%3A%22file%3A%2F%2F%2Fc%253A%2FUsers%2Fjrieken%2FCode%2F_sample%2Ffoo%2Fpackage.json%22%2C%22path%22%3A%22%2Fc%3A%2FUsers%2Fjrieken%2FCode%2F_sample%2Ffoo%2Fpackage.json%22%2C%22scheme%22%3A%22file%22%7D%2C%22script%22%3A%22echo%22%7D":{"$mid":1,"path":"npm.runScriptFromHover","scheme":"command","query":"{\\"documentUri\\":\\"__uri_e49443\\",\\"script\\":\\"echo\\"}"}}}');
        const element = store.add(renderMarkdown(md)).element;
        const anchor = element.querySelector('a');
        assert.ok(anchor);
        assert.ok(anchor.dataset['href']);
        const uri = URI.parse(anchor.dataset['href']);
        const data = parse(decodeURIComponent(uri.query));
        assert.ok(data);
        assert.strictEqual(data.script, 'echo');
        assert.ok(data.documentUri.toString().startsWith('file:///c%3A/'));
    });
    test('Should not render command links by default', () => {
        const md = new MarkdownString(`[command1](command:doFoo) <a href="command:doFoo">command2</a>`, {
            supportHtml: true
        });
        const result = store.add(renderMarkdown(md)).element;
        assert.strictEqual(result.innerHTML, `<p>command1 command2</p>`);
    });
    test('Should render command links in trusted strings', () => {
        const md = new MarkdownString(`[command1](command:doFoo) <a href="command:doFoo">command2</a>`, {
            isTrusted: true,
            supportHtml: true,
        });
        const result = store.add(renderMarkdown(md)).element;
        assert.strictEqual(result.innerHTML, `<p><a data-href="command:doFoo" href="" title="command:doFoo" draggable="false">command1</a> <a data-href="command:doFoo" href="">command2</a></p>`);
    });
    suite('PlaintextMarkdownRender', () => {
        test('test code, blockquote, heading, list, listitem, paragraph, table, tablerow, tablecell, strong, em, br, del, text are rendered plaintext', () => {
            const markdown = { value: '`code`\n>quote\n# heading\n- list\n\ntable | table2\n--- | --- \none | two\n\n\nbo**ld**\n_italic_\n~~del~~\nsome text' };
            const expected = 'code\nquote\nheading\nlist\n\ntable table2\none two\nbold\nitalic\ndel\nsome text';
            const result = renderAsPlaintext(markdown);
            assert.strictEqual(result, expected);
        });
        test('test html, hr, image, link are rendered plaintext', () => {
            const markdown = { value: '<div>html</div>\n\n---\n![image](imageLink)\n[text](textLink)' };
            const expected = 'text';
            const result = renderAsPlaintext(markdown);
            assert.strictEqual(result, expected);
        });
        test(`Should not remove html inside of code blocks`, () => {
            const markdown = {
                value: [
                    '```html',
                    '<form>html</form>',
                    '```',
                ].join('\n')
            };
            const expected = [
                '```',
                '<form>html</form>',
                '```',
            ].join('\n');
            const result = renderAsPlaintext(markdown, { includeCodeBlocksFences: true });
            assert.strictEqual(result, expected);
        });
    });
    suite('supportHtml', () => {
        test('supportHtml is disabled by default', () => {
            const mds = new MarkdownString(undefined, {});
            mds.appendMarkdown('a<b>b</b>c');
            const result = store.add(renderMarkdown(mds)).element;
            assert.strictEqual(result.innerHTML, `<p>abc</p>`);
        });
        test('Renders html when supportHtml=true', () => {
            const mds = new MarkdownString(undefined, { supportHtml: true });
            mds.appendMarkdown('a<b>b</b>c');
            const result = store.add(renderMarkdown(mds)).element;
            assert.strictEqual(result.innerHTML, `<p>a<b>b</b>c</p>`);
        });
        test('Should not include scripts even when supportHtml=true', () => {
            const mds = new MarkdownString(undefined, { supportHtml: true });
            mds.appendMarkdown('a<b onclick="alert(1)">b</b><script>alert(2)</script>c');
            const result = store.add(renderMarkdown(mds)).element;
            assert.strictEqual(result.innerHTML, `<p>a<b>b</b>c</p>`);
        });
        test('Should not render html appended as text', () => {
            const mds = new MarkdownString(undefined, { supportHtml: true });
            mds.appendText('a<b>b</b>c');
            const result = store.add(renderMarkdown(mds)).element;
            assert.strictEqual(result.innerHTML, `<p>a&lt;b&gt;b&lt;/b&gt;c</p>`);
        });
        test('Should render html images', () => {
            if (isWeb) {
                return;
            }
            const mds = new MarkdownString(undefined, { supportHtml: true });
            mds.appendMarkdown(`<img src="http://example.com/cat.gif">`);
            const result = store.add(renderMarkdown(mds)).element;
            assert.strictEqual(result.innerHTML, `<img src="http://example.com/cat.gif">`);
        });
        test('Should render html images with file uri as same origin uri', () => {
            if (isWeb) {
                return;
            }
            const mds = new MarkdownString(undefined, { supportHtml: true });
            mds.appendMarkdown(`<img src="file:///images/cat.gif">`);
            const result = store.add(renderMarkdown(mds)).element;
            assert.strictEqual(result.innerHTML, `<img src="vscode-file://vscode-app/images/cat.gif">`);
        });
    });
    suite('fillInIncompleteTokens', () => {
        function ignoreRaw(...tokenLists) {
            tokenLists.forEach(tokens => {
                tokens.forEach(t => t.raw = '');
            });
        }
        const completeTable = '| a | b |\n| --- | --- |';
        suite('table', () => {
            test('complete table', () => {
                const tokens = marked.marked.lexer(completeTable);
                const newTokens = fillInIncompleteTokens(tokens);
                assert.equal(newTokens, tokens);
            });
            test('full header only', () => {
                const incompleteTable = '| a | b |';
                const tokens = marked.marked.lexer(incompleteTable);
                const completeTableTokens = marked.marked.lexer(completeTable);
                const newTokens = fillInIncompleteTokens(tokens);
                assert.deepStrictEqual(newTokens, completeTableTokens);
            });
            test('full header only with trailing space', () => {
                const incompleteTable = '| a | b | ';
                const tokens = marked.marked.lexer(incompleteTable);
                const completeTableTokens = marked.marked.lexer(completeTable);
                const newTokens = fillInIncompleteTokens(tokens);
                if (newTokens) {
                    ignoreRaw(newTokens, completeTableTokens);
                }
                assert.deepStrictEqual(newTokens, completeTableTokens);
            });
            test('incomplete header', () => {
                const incompleteTable = '| a | b';
                const tokens = marked.marked.lexer(incompleteTable);
                const completeTableTokens = marked.marked.lexer(completeTable);
                const newTokens = fillInIncompleteTokens(tokens);
                if (newTokens) {
                    ignoreRaw(newTokens, completeTableTokens);
                }
                assert.deepStrictEqual(newTokens, completeTableTokens);
            });
            test('incomplete header one column', () => {
                const incompleteTable = '| a ';
                const tokens = marked.marked.lexer(incompleteTable);
                const completeTableTokens = marked.marked.lexer(incompleteTable + '|\n| --- |');
                const newTokens = fillInIncompleteTokens(tokens);
                if (newTokens) {
                    ignoreRaw(newTokens, completeTableTokens);
                }
                assert.deepStrictEqual(newTokens, completeTableTokens);
            });
            test('full header with extras', () => {
                const incompleteTable = '| a **bold** | b _italics_ |';
                const tokens = marked.marked.lexer(incompleteTable);
                const completeTableTokens = marked.marked.lexer(incompleteTable + '\n| --- | --- |');
                const newTokens = fillInIncompleteTokens(tokens);
                assert.deepStrictEqual(newTokens, completeTableTokens);
            });
            test('full header with leading text', () => {
                // Parsing this gives one token and one 'text' subtoken
                const incompleteTable = 'here is a table\n| a | b |';
                const tokens = marked.marked.lexer(incompleteTable);
                const completeTableTokens = marked.marked.lexer(incompleteTable + '\n| --- | --- |');
                const newTokens = fillInIncompleteTokens(tokens);
                assert.deepStrictEqual(newTokens, completeTableTokens);
            });
            test('full header with leading other stuff', () => {
                // Parsing this gives one token and one 'text' subtoken
                const incompleteTable = '```js\nconst xyz = 123;\n```\n| a | b |';
                const tokens = marked.marked.lexer(incompleteTable);
                const completeTableTokens = marked.marked.lexer(incompleteTable + '\n| --- | --- |');
                const newTokens = fillInIncompleteTokens(tokens);
                assert.deepStrictEqual(newTokens, completeTableTokens);
            });
            test('full header with incomplete separator', () => {
                const incompleteTable = '| a | b |\n| ---';
                const tokens = marked.marked.lexer(incompleteTable);
                const completeTableTokens = marked.marked.lexer(completeTable);
                const newTokens = fillInIncompleteTokens(tokens);
                assert.deepStrictEqual(newTokens, completeTableTokens);
            });
            test('full header with incomplete separator 2', () => {
                const incompleteTable = '| a | b |\n| --- |';
                const tokens = marked.marked.lexer(incompleteTable);
                const completeTableTokens = marked.marked.lexer(completeTable);
                const newTokens = fillInIncompleteTokens(tokens);
                assert.deepStrictEqual(newTokens, completeTableTokens);
            });
            test('full header with incomplete separator 3', () => {
                const incompleteTable = '| a | b |\n|';
                const tokens = marked.marked.lexer(incompleteTable);
                const completeTableTokens = marked.marked.lexer(completeTable);
                const newTokens = fillInIncompleteTokens(tokens);
                assert.deepStrictEqual(newTokens, completeTableTokens);
            });
            test('not a table', () => {
                const incompleteTable = '| a | b |\nsome text';
                const tokens = marked.marked.lexer(incompleteTable);
                const newTokens = fillInIncompleteTokens(tokens);
                assert.deepStrictEqual(newTokens, tokens);
            });
            test('not a table 2', () => {
                const incompleteTable = '| a | b |\n| --- |\nsome text';
                const tokens = marked.marked.lexer(incompleteTable);
                const newTokens = fillInIncompleteTokens(tokens);
                assert.deepStrictEqual(newTokens, tokens);
            });
        });
        function simpleMarkdownTestSuite(name, delimiter) {
            test(`incomplete ${name}`, () => {
                const incomplete = `${delimiter}code`;
                const tokens = marked.marked.lexer(incomplete);
                const newTokens = fillInIncompleteTokens(tokens);
                const completeTokens = marked.marked.lexer(incomplete + delimiter);
                assert.deepStrictEqual(newTokens, completeTokens);
            });
            test(`complete ${name}`, () => {
                const text = `leading text ${delimiter}code${delimiter} trailing text`;
                const tokens = marked.marked.lexer(text);
                const newTokens = fillInIncompleteTokens(tokens);
                assert.deepStrictEqual(newTokens, tokens);
            });
            test(`${name} with leading text`, () => {
                const incomplete = `some text and ${delimiter}some code`;
                const tokens = marked.marked.lexer(incomplete);
                const newTokens = fillInIncompleteTokens(tokens);
                const completeTokens = marked.marked.lexer(incomplete + delimiter);
                assert.deepStrictEqual(newTokens, completeTokens);
            });
            test(`${name} with trailing space`, () => {
                const incomplete = `some text and ${delimiter}some code `;
                const tokens = marked.marked.lexer(incomplete);
                const newTokens = fillInIncompleteTokens(tokens);
                const completeTokens = marked.marked.lexer(incomplete.trimEnd() + delimiter);
                assert.deepStrictEqual(newTokens, completeTokens);
            });
            test(`single loose "${delimiter}"`, () => {
                const text = `some text and ${delimiter}by itself\nmore text here`;
                const tokens = marked.marked.lexer(text);
                const newTokens = fillInIncompleteTokens(tokens);
                assert.deepStrictEqual(newTokens, tokens);
            });
            test(`incomplete ${name} after newline`, () => {
                const text = `some text\nmore text here and ${delimiter}text`;
                const tokens = marked.marked.lexer(text);
                const newTokens = fillInIncompleteTokens(tokens);
                const completeTokens = marked.marked.lexer(text + delimiter);
                assert.deepStrictEqual(newTokens, completeTokens);
            });
            test(`incomplete after complete ${name}`, () => {
                const text = `leading text ${delimiter}code${delimiter} trailing text and ${delimiter}another`;
                const tokens = marked.marked.lexer(text);
                const newTokens = fillInIncompleteTokens(tokens);
                const completeTokens = marked.marked.lexer(text + delimiter);
                assert.deepStrictEqual(newTokens, completeTokens);
            });
            test(`incomplete ${name} in list`, () => {
                const text = `- list item one\n- list item two and ${delimiter}text`;
                const tokens = marked.marked.lexer(text);
                const newTokens = fillInIncompleteTokens(tokens);
                const completeTokens = marked.marked.lexer(text + delimiter);
                assert.deepStrictEqual(newTokens, completeTokens);
            });
            test(`incomplete ${name} in asterisk list`, () => {
                const text = `* list item one\n* list item two and ${delimiter}text`;
                const tokens = marked.marked.lexer(text);
                const newTokens = fillInIncompleteTokens(tokens);
                const completeTokens = marked.marked.lexer(text + delimiter);
                assert.deepStrictEqual(newTokens, completeTokens);
            });
            test(`incomplete ${name} in numbered list`, () => {
                const text = `1. list item one\n2. list item two and ${delimiter}text`;
                const tokens = marked.marked.lexer(text);
                const newTokens = fillInIncompleteTokens(tokens);
                const completeTokens = marked.marked.lexer(text + delimiter);
                assert.deepStrictEqual(newTokens, completeTokens);
            });
        }
        suite('list', () => {
            test('list with complete codeblock', () => {
                const list = `-
	\`\`\`js
	let x = 1;
	\`\`\`
- list item two
`;
                const tokens = marked.marked.lexer(list);
                const newTokens = fillInIncompleteTokens(tokens);
                assert.deepStrictEqual(newTokens, tokens);
            });
            test.skip('list with incomplete codeblock', () => {
                const incomplete = `- list item one

	\`\`\`js
	let x = 1;`;
                const tokens = marked.marked.lexer(incomplete);
                const newTokens = fillInIncompleteTokens(tokens);
                const completeTokens = marked.marked.lexer(incomplete + '\n	```');
                assert.deepStrictEqual(newTokens, completeTokens);
            });
            test('list with subitems', () => {
                const list = `- hello
	- sub item
- text
	newline for some reason
`;
                const tokens = marked.marked.lexer(list);
                const newTokens = fillInIncompleteTokens(tokens);
                assert.deepStrictEqual(newTokens, tokens);
            });
            test('ordered list with subitems', () => {
                const list = `1. hello
	- sub item
2. text
	newline for some reason
`;
                const tokens = marked.marked.lexer(list);
                const newTokens = fillInIncompleteTokens(tokens);
                assert.deepStrictEqual(newTokens, tokens);
            });
            test('list with stuff', () => {
                const list = `- list item one \`codespan\` **bold** [link](http://microsoft.com) more text`;
                const tokens = marked.marked.lexer(list);
                const newTokens = fillInIncompleteTokens(tokens);
                assert.deepStrictEqual(newTokens, tokens);
            });
            test('list with incomplete link text', () => {
                const incomplete = `- list item one
- item two [link`;
                const tokens = marked.marked.lexer(incomplete);
                const newTokens = fillInIncompleteTokens(tokens);
                const completeTokens = marked.marked.lexer(incomplete + '](https://microsoft.com)');
                assert.deepStrictEqual(newTokens, completeTokens);
            });
            test('list with incomplete link target', () => {
                const incomplete = `- list item one
- item two [link](`;
                const tokens = marked.marked.lexer(incomplete);
                const newTokens = fillInIncompleteTokens(tokens);
                const completeTokens = marked.marked.lexer(incomplete + ')');
                assert.deepStrictEqual(newTokens, completeTokens);
            });
            test('ordered list with incomplete link target', () => {
                const incomplete = `1. list item one
2. item two [link](`;
                const tokens = marked.marked.lexer(incomplete);
                const newTokens = fillInIncompleteTokens(tokens);
                const completeTokens = marked.marked.lexer(incomplete + ')');
                assert.deepStrictEqual(newTokens, completeTokens);
            });
            test('ordered list with extra whitespace', () => {
                const incomplete = `1. list item one
2. item two [link](`;
                const tokens = marked.marked.lexer(incomplete);
                const newTokens = fillInIncompleteTokens(tokens);
                const completeTokens = marked.marked.lexer(incomplete + ')');
                assert.deepStrictEqual(newTokens, completeTokens);
            });
            test('list with extra whitespace', () => {
                const incomplete = `- list item one
- item two [link](`;
                const tokens = marked.marked.lexer(incomplete);
                const newTokens = fillInIncompleteTokens(tokens);
                const completeTokens = marked.marked.lexer(incomplete + ')');
                assert.deepStrictEqual(newTokens, completeTokens);
            });
            test('list with incomplete link with other stuff', () => {
                const incomplete = `- list item one
- item two [\`link`;
                const tokens = marked.marked.lexer(incomplete);
                const newTokens = fillInIncompleteTokens(tokens);
                const completeTokens = marked.marked.lexer(incomplete + '\`](https://microsoft.com)');
                assert.deepStrictEqual(newTokens, completeTokens);
            });
            test('ordered list with incomplete link with other stuff', () => {
                const incomplete = `1. list item one
1. item two [\`link`;
                const tokens = marked.marked.lexer(incomplete);
                const newTokens = fillInIncompleteTokens(tokens);
                const completeTokens = marked.marked.lexer(incomplete + '\`](https://microsoft.com)');
                assert.deepStrictEqual(newTokens, completeTokens);
            });
            test('list with incomplete subitem', () => {
                const incomplete = `1. list item one
	- `;
                const tokens = marked.marked.lexer(incomplete);
                const newTokens = fillInIncompleteTokens(tokens);
                const completeTokens = marked.marked.lexer(incomplete + '&nbsp;');
                assert.deepStrictEqual(newTokens, completeTokens);
            });
            test('list with incomplete nested subitem', () => {
                const incomplete = `1. list item one
	- item 2
		- `;
                const tokens = marked.marked.lexer(incomplete);
                const newTokens = fillInIncompleteTokens(tokens);
                const completeTokens = marked.marked.lexer(incomplete + '&nbsp;');
                assert.deepStrictEqual(newTokens, completeTokens);
            });
            test('text with start of list is not a heading', () => {
                const incomplete = `hello\n- `;
                const tokens = marked.marked.lexer(incomplete);
                const newTokens = fillInIncompleteTokens(tokens);
                const completeTokens = marked.marked.lexer(incomplete + ' &nbsp;');
                assert.deepStrictEqual(newTokens, completeTokens);
            });
            test('even more text with start of list is not a heading', () => {
                const incomplete = `# hello\n\ntext\n-`;
                const tokens = marked.marked.lexer(incomplete);
                const newTokens = fillInIncompleteTokens(tokens);
                const completeTokens = marked.marked.lexer(incomplete + ' &nbsp;');
                assert.deepStrictEqual(newTokens, completeTokens);
            });
        });
        suite('codespan', () => {
            simpleMarkdownTestSuite('codespan', '`');
            test(`backtick between letters`, () => {
                const text = 'a`b';
                const tokens = marked.marked.lexer(text);
                const newTokens = fillInIncompleteTokens(tokens);
                const completeCodespanTokens = marked.marked.lexer(text + '`');
                assert.deepStrictEqual(newTokens, completeCodespanTokens);
            });
            test(`nested pattern`, () => {
                const text = 'sldkfjsd `abc __def__ ghi';
                const tokens = marked.marked.lexer(text);
                const newTokens = fillInIncompleteTokens(tokens);
                const completeTokens = marked.marked.lexer(text + '`');
                assert.deepStrictEqual(newTokens, completeTokens);
            });
        });
        suite('star', () => {
            simpleMarkdownTestSuite('star', '*');
            test(`star between letters`, () => {
                const text = 'sldkfjsd a*b';
                const tokens = marked.marked.lexer(text);
                const newTokens = fillInIncompleteTokens(tokens);
                const completeTokens = marked.marked.lexer(text + '*');
                assert.deepStrictEqual(newTokens, completeTokens);
            });
            test(`nested pattern`, () => {
                const text = 'sldkfjsd *abc __def__ ghi';
                const tokens = marked.marked.lexer(text);
                const newTokens = fillInIncompleteTokens(tokens);
                const completeTokens = marked.marked.lexer(text + '*');
                assert.deepStrictEqual(newTokens, completeTokens);
            });
        });
        suite('double star', () => {
            simpleMarkdownTestSuite('double star', '**');
            test(`double star between letters`, () => {
                const text = 'a**b';
                const tokens = marked.marked.lexer(text);
                const newTokens = fillInIncompleteTokens(tokens);
                const completeTokens = marked.marked.lexer(text + '**');
                assert.deepStrictEqual(newTokens, completeTokens);
            });
            // TODO trim these patterns from end
            test.skip(`ending in doublestar`, () => {
                const incomplete = `some text and **`;
                const tokens = marked.marked.lexer(incomplete);
                const newTokens = fillInIncompleteTokens(tokens);
                const completeTokens = marked.marked.lexer(incomplete.trimEnd() + '**');
                assert.deepStrictEqual(newTokens, completeTokens);
            });
        });
        suite('underscore', () => {
            simpleMarkdownTestSuite('underscore', '_');
            test(`underscore between letters`, () => {
                const text = `this_not_italics`;
                const tokens = marked.marked.lexer(text);
                const newTokens = fillInIncompleteTokens(tokens);
                assert.deepStrictEqual(newTokens, tokens);
            });
        });
        suite('double underscore', () => {
            simpleMarkdownTestSuite('double underscore', '__');
            test(`double underscore between letters`, () => {
                const text = `this__not__bold`;
                const tokens = marked.marked.lexer(text);
                const newTokens = fillInIncompleteTokens(tokens);
                assert.deepStrictEqual(newTokens, tokens);
            });
        });
        suite('link', () => {
            test('incomplete link text', () => {
                const incomplete = 'abc [text';
                const tokens = marked.marked.lexer(incomplete);
                const newTokens = fillInIncompleteTokens(tokens);
                const completeTokens = marked.marked.lexer(incomplete + '](https://microsoft.com)');
                assert.deepStrictEqual(newTokens, completeTokens);
            });
            test('incomplete link target', () => {
                const incomplete = 'foo [text](http://microsoft';
                const tokens = marked.marked.lexer(incomplete);
                const newTokens = fillInIncompleteTokens(tokens);
                const completeTokens = marked.marked.lexer(incomplete + ')');
                assert.deepStrictEqual(newTokens, completeTokens);
            });
            test('incomplete link target 2', () => {
                const incomplete = 'foo [text](http://microsoft.com';
                const tokens = marked.marked.lexer(incomplete);
                const newTokens = fillInIncompleteTokens(tokens);
                const completeTokens = marked.marked.lexer(incomplete + ')');
                assert.deepStrictEqual(newTokens, completeTokens);
            });
            test('incomplete link target with extra stuff', () => {
                const incomplete = '[before `text` after](http://microsoft.com';
                const tokens = marked.marked.lexer(incomplete);
                const newTokens = fillInIncompleteTokens(tokens);
                const completeTokens = marked.marked.lexer(incomplete + ')');
                assert.deepStrictEqual(newTokens, completeTokens);
            });
            test('incomplete link target with extra stuff and incomplete arg', () => {
                const incomplete = '[before `text` after](http://microsoft.com "more text ';
                const tokens = marked.marked.lexer(incomplete);
                const newTokens = fillInIncompleteTokens(tokens);
                const completeTokens = marked.marked.lexer(incomplete + '")');
                assert.deepStrictEqual(newTokens, completeTokens);
            });
            test('incomplete link target with incomplete arg', () => {
                const incomplete = 'foo [text](http://microsoft.com "more text here ';
                const tokens = marked.marked.lexer(incomplete);
                const newTokens = fillInIncompleteTokens(tokens);
                const completeTokens = marked.marked.lexer(incomplete + '")');
                assert.deepStrictEqual(newTokens, completeTokens);
            });
            test('incomplete link target with incomplete arg 2', () => {
                const incomplete = '[text](command:vscode.openRelativePath "arg';
                const tokens = marked.marked.lexer(incomplete);
                const newTokens = fillInIncompleteTokens(tokens);
                const completeTokens = marked.marked.lexer(incomplete + '")');
                assert.deepStrictEqual(newTokens, completeTokens);
            });
            test('incomplete link target with complete arg', () => {
                const incomplete = 'foo [text](http://microsoft.com "more text here"';
                const tokens = marked.marked.lexer(incomplete);
                const newTokens = fillInIncompleteTokens(tokens);
                const completeTokens = marked.marked.lexer(incomplete + ')');
                assert.deepStrictEqual(newTokens, completeTokens);
            });
            test('link text with incomplete codespan', () => {
                const incomplete = `text [\`codespan`;
                const tokens = marked.marked.lexer(incomplete);
                const newTokens = fillInIncompleteTokens(tokens);
                const completeTokens = marked.marked.lexer(incomplete + '`](https://microsoft.com)');
                assert.deepStrictEqual(newTokens, completeTokens);
            });
            test('link text with incomplete stuff', () => {
                const incomplete = `text [more text \`codespan\` text **bold`;
                const tokens = marked.marked.lexer(incomplete);
                const newTokens = fillInIncompleteTokens(tokens);
                const completeTokens = marked.marked.lexer(incomplete + '**](https://microsoft.com)');
                assert.deepStrictEqual(newTokens, completeTokens);
            });
            test('Looks like incomplete link target but isn\'t', () => {
                const complete = '**bold** `codespan` text](';
                const tokens = marked.marked.lexer(complete);
                const newTokens = fillInIncompleteTokens(tokens);
                const completeTokens = marked.marked.lexer(complete);
                assert.deepStrictEqual(newTokens, completeTokens);
            });
            test.skip('incomplete link in list', () => {
                const incomplete = '- [text';
                const tokens = marked.marked.lexer(incomplete);
                const newTokens = fillInIncompleteTokens(tokens);
                const completeTokens = marked.marked.lexer(incomplete + '](https://microsoft.com)');
                assert.deepStrictEqual(newTokens, completeTokens);
            });
            test('square brace between letters', () => {
                const incomplete = 'a[b';
                const tokens = marked.marked.lexer(incomplete);
                const newTokens = fillInIncompleteTokens(tokens);
                assert.deepStrictEqual(newTokens, tokens);
            });
            test('square brace on previous line', () => {
                const incomplete = 'text[\nmore text';
                const tokens = marked.marked.lexer(incomplete);
                const newTokens = fillInIncompleteTokens(tokens);
                assert.deepStrictEqual(newTokens, tokens);
            });
            test('square braces in text', () => {
                const incomplete = 'hello [what] is going on';
                const tokens = marked.marked.lexer(incomplete);
                const newTokens = fillInIncompleteTokens(tokens);
                assert.deepStrictEqual(newTokens, tokens);
            });
            test('complete link', () => {
                const incomplete = 'text [link](http://microsoft.com)';
                const tokens = marked.marked.lexer(incomplete);
                const newTokens = fillInIncompleteTokens(tokens);
                assert.deepStrictEqual(newTokens, tokens);
            });
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFya2Rvd25SZW5kZXJlci50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvYWR2aWthci9Eb2N1bWVudHMvYXJjaGl0ZWN0L2FyY2gyL0FyY2hJREUvc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS90ZXN0L2Jyb3dzZXIvbWFya2Rvd25SZW5kZXJlci50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEVBQUUsc0JBQXNCLEVBQUUsY0FBYyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDOUcsT0FBTyxFQUFtQixjQUFjLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUM5RSxPQUFPLEtBQUssTUFBTSxNQUFNLCtCQUErQixDQUFDO0FBQ3hELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUNwRCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFDakQsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLHFCQUFxQixDQUFDO0FBQzFDLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBRTdFLFNBQVMsU0FBUyxDQUFDLEdBQVc7SUFDN0IsT0FBTyxJQUFJLFNBQVMsRUFBRSxDQUFDLGVBQWUsQ0FBQyxHQUFHLEVBQUUsV0FBVyxDQUFDLENBQUMsSUFBSSxDQUFDLFVBQXlCLENBQUM7QUFDekYsQ0FBQztBQUVELFNBQVMsZ0JBQWdCLENBQUMsVUFBdUIsRUFBRSxZQUFvQjtJQUN0RSxNQUFNLFlBQVksR0FBRyxTQUFTLENBQUMsWUFBWSxDQUFDLENBQUM7SUFDN0MsTUFBTSxDQUFDLEVBQUUsQ0FDUixVQUFVLENBQUMsV0FBVyxDQUFDLFlBQVksQ0FBQyxFQUNwQyxhQUFhLFlBQVksQ0FBQyxTQUFTLGFBQWEsVUFBVSxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUM7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