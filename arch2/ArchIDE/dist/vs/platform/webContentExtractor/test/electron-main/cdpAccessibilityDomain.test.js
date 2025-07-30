/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as assert from 'assert';
import { URI } from '../../../../base/common/uri.js';
import { convertAXTreeToMarkdown } from '../../electron-main/cdpAccessibilityDomain.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
suite('CDP Accessibility Domain', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    const testUri = URI.parse('https://example.com/test');
    function createAXValue(type, value) {
        return { type, value };
    }
    function createAXProperty(name, value, type = 'string') {
        return {
            name: name,
            value: createAXValue(type, value)
        };
    }
    test('empty tree returns empty string', () => {
        const result = convertAXTreeToMarkdown(testUri, []);
        assert.strictEqual(result, '');
    });
    //#region Heading Tests
    test('simple heading conversion', () => {
        const nodes = [
            {
                nodeId: 'node1',
                childIds: ['node2'],
                ignored: false,
                role: createAXValue('role', 'heading'),
                name: createAXValue('string', 'Test Heading'),
                properties: [
                    createAXProperty('level', 2, 'integer')
                ]
            },
            {
                nodeId: 'node2',
                childIds: [],
                ignored: false,
                role: createAXValue('role', 'StaticText'),
                name: createAXValue('string', 'Test Heading')
            }
        ];
        const result = convertAXTreeToMarkdown(testUri, nodes);
        assert.strictEqual(result.trim(), '## Test Heading');
    });
    //#endregion
    //#region Paragraph Tests
    test('paragraph with text conversion', () => {
        const nodes = [
            {
                nodeId: 'node1',
                ignored: false,
                role: createAXValue('role', 'paragraph'),
                childIds: ['node2']
            },
            {
                nodeId: 'node2',
                ignored: false,
                role: createAXValue('role', 'StaticText'),
                name: createAXValue('string', 'This is a paragraph of text.')
            }
        ];
        const result = convertAXTreeToMarkdown(testUri, nodes);
        assert.strictEqual(result.trim(), 'This is a paragraph of text.');
    });
    test('really long paragraph should insert newlines at the space before 80 characters', () => {
        const longStr = [
            'This is a paragraph of text. It is really long. Like really really really really',
            'really really really really really really really long. That long.'
        ];
        const nodes = [
            {
                nodeId: 'node2',
                ignored: false,
                role: createAXValue('role', 'StaticText'),
                name: createAXValue('string', longStr.join(' '))
            }
        ];
        const result = convertAXTreeToMarkdown(testUri, nodes);
        assert.strictEqual(result.trim(), longStr.join('\n'));
    });
    //#endregion
    //#region List Tests
    test('list conversion', () => {
        const nodes = [
            {
                nodeId: 'node1',
                ignored: false,
                role: createAXValue('role', 'list'),
                childIds: ['node2', 'node3']
            },
            {
                nodeId: 'node2',
                ignored: false,
                role: createAXValue('role', 'listitem'),
                childIds: ['node4', 'node6']
            },
            {
                nodeId: 'node3',
                ignored: false,
                role: createAXValue('role', 'listitem'),
                childIds: ['node5', 'node7']
            },
            {
                nodeId: 'node4',
                ignored: false,
                role: createAXValue('role', 'ListMarker'),
                name: createAXValue('string', '1. ')
            },
            {
                nodeId: 'node5',
                ignored: false,
                role: createAXValue('role', 'ListMarker'),
                name: createAXValue('string', '2. ')
            },
            {
                nodeId: 'node6',
                ignored: false,
                role: createAXValue('role', 'StaticText'),
                name: createAXValue('string', 'Item 1')
            },
            {
                nodeId: 'node7',
                ignored: false,
                role: createAXValue('role', 'StaticText'),
                name: createAXValue('string', 'Item 2')
            }
        ];
        const result = convertAXTreeToMarkdown(testUri, nodes);
        const expected = `
1. Item 1
2. Item 2

`;
        assert.strictEqual(result, expected);
    });
    test('nested list conversion', () => {
        const nodes = [
            {
                nodeId: 'list1',
                ignored: false,
                role: createAXValue('role', 'list'),
                childIds: ['item1', 'item2']
            },
            {
                nodeId: 'item1',
                ignored: false,
                role: createAXValue('role', 'listitem'),
                childIds: ['marker1', 'text1', 'nestedList'],
                properties: [
                    createAXProperty('level', 1, 'integer')
                ]
            },
            {
                nodeId: 'marker1',
                ignored: false,
                role: createAXValue('role', 'ListMarker'),
                name: createAXValue('string', '- ')
            },
            {
                nodeId: 'text1',
                ignored: false,
                role: createAXValue('role', 'StaticText'),
                name: createAXValue('string', 'Item 1')
            },
            {
                nodeId: 'nestedList',
                ignored: false,
                role: createAXValue('role', 'list'),
                childIds: ['nestedItem']
            },
            {
                nodeId: 'nestedItem',
                ignored: false,
                role: createAXValue('role', 'listitem'),
                childIds: ['nestedMarker', 'nestedText'],
                properties: [
                    createAXProperty('level', 2, 'integer')
                ]
            },
            {
                nodeId: 'nestedMarker',
                ignored: false,
                role: createAXValue('role', 'ListMarker'),
                name: createAXValue('string', '- ')
            },
            {
                nodeId: 'nestedText',
                ignored: false,
                role: createAXValue('role', 'StaticText'),
                name: createAXValue('string', 'Item 1a')
            },
            {
                nodeId: 'item2',
                ignored: false,
                role: createAXValue('role', 'listitem'),
                childIds: ['marker2', 'text2'],
                properties: [
                    createAXProperty('level', 1, 'integer')
                ]
            },
            {
                nodeId: 'marker2',
                ignored: false,
                role: createAXValue('role', 'ListMarker'),
                name: createAXValue('string', '- ')
            },
            {
                nodeId: 'text2',
                ignored: false,
                role: createAXValue('role', 'StaticText'),
                name: createAXValue('string', 'Item 2')
            }
        ];
        const result = convertAXTreeToMarkdown(testUri, nodes);
        const indent = '  ';
        const expected = `
- Item 1
${indent}- Item 1a
- Item 2

`;
        assert.strictEqual(result, expected);
    });
    //#endregion
    //#region Links Tests
    test('links conversion', () => {
        const nodes = [
            {
                nodeId: 'node1',
                ignored: false,
                role: createAXValue('role', 'paragraph'),
                childIds: ['node2']
            },
            {
                nodeId: 'node2',
                ignored: false,
                role: createAXValue('role', 'link'),
                name: createAXValue('string', 'Test Link'),
                properties: [
                    createAXProperty('url', 'https://test.com')
                ]
            }
        ];
        const result = convertAXTreeToMarkdown(testUri, nodes);
        assert.strictEqual(result.trim(), '[Test Link](https://test.com)');
    });
    test('links to same page are not converted to markdown links', () => {
        const pageUri = URI.parse('https://example.com/page');
        const nodes = [
            {
                nodeId: 'link',
                ignored: false,
                role: createAXValue('role', 'link'),
                name: createAXValue('string', 'Current page link'),
                properties: [createAXProperty('url', 'https://example.com/page?section=1#header')]
            }
        ];
        const result = convertAXTreeToMarkdown(pageUri, nodes);
        assert.strictEqual(result.includes('Current page link'), true);
        assert.strictEqual(result.includes('[Current page link]'), false);
    });
    //#endregion
    //#region Image Tests
    test('image conversion', () => {
        const nodes = [
            {
                nodeId: 'node1',
                ignored: false,
                role: createAXValue('role', 'image'),
                name: createAXValue('string', 'Alt text'),
                properties: [
                    createAXProperty('url', 'https://test.com/image.png')
                ]
            }
        ];
        const result = convertAXTreeToMarkdown(testUri, nodes);
        assert.strictEqual(result.trim(), '![Alt text](https://test.com/image.png)');
    });
    test('image without URL shows alt text', () => {
        const nodes = [
            {
                nodeId: 'node1',
                ignored: false,
                role: createAXValue('role', 'image'),
                name: createAXValue('string', 'Alt text')
            }
        ];
        const result = convertAXTreeToMarkdown(testUri, nodes);
        assert.strictEqual(result.trim(), '[Image: Alt text]');
    });
    //#endregion
    //#region Description List Tests
    test('description list conversion', () => {
        const nodes = [
            {
                nodeId: 'dl',
                ignored: false,
                role: createAXValue('role', 'DescriptionList'),
                childIds: ['term1', 'def1', 'term2', 'def2']
            },
            {
                nodeId: 'term1',
                ignored: false,
                role: createAXValue('role', 'term'),
                childIds: ['termText1']
            },
            {
                nodeId: 'termText1',
                ignored: false,
                role: createAXValue('role', 'StaticText'),
                name: createAXValue('string', 'Term 1')
            },
            {
                nodeId: 'def1',
                ignored: false,
                role: createAXValue('role', 'definition'),
                childIds: ['defText1']
            },
            {
                nodeId: 'defText1',
                ignored: false,
                role: createAXValue('role', 'StaticText'),
                name: createAXValue('string', 'Definition 1')
            },
            {
                nodeId: 'term2',
                ignored: false,
                role: createAXValue('role', 'term'),
                childIds: ['termText2']
            },
            {
                nodeId: 'termText2',
                ignored: false,
                role: createAXValue('role', 'StaticText'),
                name: createAXValue('string', 'Term 2')
            },
            {
                nodeId: 'def2',
                ignored: false,
                role: createAXValue('role', 'definition'),
                childIds: ['defText2']
            },
            {
                nodeId: 'defText2',
                ignored: false,
                role: createAXValue('role', 'StaticText'),
                name: createAXValue('string', 'Definition 2')
            }
        ];
        const result = convertAXTreeToMarkdown(testUri, nodes);
        assert.strictEqual(result.includes('- **Term 1** Definition 1'), true);
        assert.strictEqual(result.includes('- **Term 2** Definition 2'), true);
    });
    //#endregion
    //#region Blockquote Tests
    test('blockquote conversion', () => {
        const nodes = [
            {
                nodeId: 'node1',
                ignored: false,
                role: createAXValue('role', 'blockquote'),
                name: createAXValue('string', 'This is a blockquote\nWith multiple lines')
            }
        ];
        const result = convertAXTreeToMarkdown(testUri, nodes);
        const expected = `> This is a blockquote
> With multiple lines`;
        assert.strictEqual(result.trim(), expected);
    });
    //#endregion
    //#region Code Tests
    test('preformatted text conversion', () => {
        const nodes = [
            {
                nodeId: 'node1',
                ignored: false,
                role: createAXValue('role', 'pre'),
                name: createAXValue('string', 'function test() {\n  return true;\n}')
            }
        ];
        const result = convertAXTreeToMarkdown(testUri, nodes);
        const expected = '```\nfunction test() {\n  return true;\n}\n```';
        assert.strictEqual(result.trim(), expected);
    });
    test('code block conversion', () => {
        const nodes = [
            {
                nodeId: 'code',
                ignored: false,
                role: createAXValue('role', 'code'),
                childIds: ['codeText']
            },
            {
                nodeId: 'codeText',
                ignored: false,
                role: createAXValue('role', 'StaticText'),
                name: createAXValue('string', 'const x = 42;\nconsole.log(x);')
            }
        ];
        const result = convertAXTreeToMarkdown(testUri, nodes);
        assert.strictEqual(result.includes('```'), true);
        assert.strictEqual(result.includes('const x = 42;'), true);
        assert.strictEqual(result.includes('console.log(x);'), true);
    });
    test('inline code conversion', () => {
        const nodes = [
            {
                nodeId: 'code',
                ignored: false,
                role: createAXValue('role', 'code'),
                childIds: ['codeText']
            },
            {
                nodeId: 'codeText',
                ignored: false,
                role: createAXValue('role', 'StaticText'),
                name: createAXValue('string', 'const x = 42;')
            }
        ];
        const result = convertAXTreeToMarkdown(testUri, nodes);
        assert.strictEqual(result.includes('`const x = 42;`'), true);
    });
    //#endregion
    //#region Table Tests
    test('table conversion', () => {
        const nodes = [
            {
                nodeId: 'table1',
                ignored: false,
                role: createAXValue('role', 'table'),
                childIds: ['row1', 'row2']
            },
            {
                nodeId: 'row1',
                ignored: false,
                role: createAXValue('role', 'row'),
                childIds: ['cell1', 'cell2']
            },
            {
                nodeId: 'row2',
                ignored: false,
                role: createAXValue('role', 'row'),
                childIds: ['cell3', 'cell4']
            },
            {
                nodeId: 'cell1',
                ignored: false,
                role: createAXValue('role', 'cell'),
                name: createAXValue('string', 'Header 1')
            },
            {
                nodeId: 'cell2',
                ignored: false,
                role: createAXValue('role', 'cell'),
                name: createAXValue('string', 'Header 2')
            },
            {
                nodeId: 'cell3',
                ignored: false,
                role: createAXValue('role', 'cell'),
                name: createAXValue('string', 'Data 1')
            },
            {
                nodeId: 'cell4',
                ignored: false,
                role: createAXValue('role', 'cell'),
                name: createAXValue('string', 'Data 2')
            }
        ];
        const result = convertAXTreeToMarkdown(testUri, nodes);
        const expected = `
| Header 1 | Header 2 |
| --- | --- |
| Data 1 | Data 2 |
`;
        assert.strictEqual(result.trim(), expected.trim());
    });
    //#endregion
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2RwQWNjZXNzaWJpbGl0eURvbWFpbi50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvYWR2aWthci9Eb2N1bWVudHMvYXJjaGl0ZWN0L2FyY2gyL0FyY2hJREUvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vd2ViQ29udGVudEV4dHJhY3Rvci90ZXN0L2VsZWN0cm9uLW1haW4vY2RwQWNjZXNzaWJpbGl0eURvbWFpbi50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQ2pDLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUNyRCxPQUFPLEVBQW1DLHVCQUF1QixFQUFFLE1BQU0sK0NBQStDLENBQUM7QUFDekgsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFFaEcsS0FBSyxDQUFDLDBCQUEwQixFQUFFLEdBQUcsRUFBRTtJQUN0Qyx1Q0FBdUMsRUFBRSxDQUFDO0lBRTFDLE1BQU0sT0FBTyxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsMEJBQTBCLENBQUMsQ0FBQztJQUV0RCxTQUFTLGFBQWEsQ0FBQyxJQUFpQixFQUFFLEtBQVU7UUFDbkQsT0FBTyxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsQ0FBQztJQUN4QixDQUFDO0lBRUQsU0FBUyxnQkFBZ0IsQ0FBQyxJQUFZLEVBQUUsS0FBVSxFQUFFLE9BQW9CLFFBQVE7UUFDL0UsT0FBTztZQUNOLElBQUksRUFBRSxJQUFXO1lBQ2pCLEtBQUssRUFBRSxhQUFhLENBQUMsSUFBSSxFQUFFLEtBQUssQ0FBQztTQUNqQyxDQUFDO0lBQ0gsQ0FBQztJQUVELElBQUksQ0FBQyxpQ0FBaUMsRUFBRSxHQUFHLEVBQUU7UUFDNUMsTUFBTSxNQUFNLEdBQUcsdUJBQXVCLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQ3BELE1BQU0sQ0FB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