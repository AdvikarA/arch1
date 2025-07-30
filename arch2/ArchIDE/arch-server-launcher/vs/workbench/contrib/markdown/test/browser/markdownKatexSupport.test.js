/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { getWindow } from '../../../../../base/browser/dom.js';
import { basicMarkupHtmlTags, defaultAllowedAttrs } from '../../../../../base/browser/domSanitize.js';
import { renderMarkdown } from '../../../../../base/browser/markdownRenderer.js';
import { MarkdownString } from '../../../../../base/common/htmlContent.js';
import { assertSnapshot } from '../../../../../base/test/common/snapshot.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { MarkedKatexSupport } from '../../browser/markedKatexSupport.js';
suite('Markdown Katex Support Test', () => {
    const store = ensureNoDisposablesAreLeakedInTestSuite();
    async function renderMarkdownWithKatex(str) {
        const katex = await MarkedKatexSupport.loadExtension(getWindow(document), {});
        const rendered = store.add(renderMarkdown(new MarkdownString(str), {
            sanitizerConfig: MarkedKatexSupport.getSanitizerOptions({
                allowedTags: basicMarkupHtmlTags,
                allowedAttributes: defaultAllowedAttrs,
            }),
            markedExtensions: [katex],
        }));
        return rendered;
    }
    test('Basic inline equation', async () => {
        const rendered = await renderMarkdownWithKatex('Hello $\\frac{1}{2}$ World!');
        await assertSnapshot(rendered.element.innerHTML);
    });
    test('Should support inline equation wrapped in parans', async () => {
        const rendered = await renderMarkdownWithKatex('Hello ($\\frac{1}{2}$) World!');
        await assertSnapshot(rendered.element.innerHTML);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFya2Rvd25LYXRleFN1cHBvcnQudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL2FkdmlrYXIvRG9jdW1lbnRzL2FyY2hpdGVjdC9hcmNoMi9BcmNoSURFL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL21hcmtkb3duL3Rlc3QvYnJvd3Nlci9tYXJrZG93bkthdGV4U3VwcG9ydC50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBQ2hHLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUMvRCxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUN0RyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0saURBQWlELENBQUM7QUFDakYsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBQzNFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUM3RSxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUNuRyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUd6RSxLQUFLLENBQUMsNkJBQTZCLEVBQUUsR0FBRyxFQUFFO0lBQ3pDLE1BQU0sS0FBSyxHQUFHLHVDQUF1QyxFQUFFLENBQUM7SUFFeEQsS0FBSyxVQUFVLHVCQUF1QixDQUFDLEdBQVc7UUFDakQsTUFBTSxLQUFLLEdBQUcsTUFBTSxrQkFBa0IsQ0FBQyxhQUFhLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQzlFLE1BQU0sUUFBUSxHQUFHLEtBQUssQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLElBQUksY0FBYyxDQUFDLEdBQUcsQ0FBQyxFQUFFO1lBQ2xFLGVBQWUsRUFBRSxrQkFBa0IsQ0FBQyxtQkFBbUIsQ0FBQztnQkFDdkQsV0FBVyxFQUFFLG1CQUFtQjtnQkFDaEMsaUJBQWlCLEVBQUUsbUJBQW1CO2FBQ3RDLENBQUM7WUFDRixnQkFBZ0IsRUFBRSxDQUFDLEtBQUssQ0FBQztTQUN6QixDQUFDLENBQUMsQ0FBQztRQUNKLE9BQU8sUUFBUSxDQUFDO0lBQ2pCLENBQUM7SUFFRCxJQUFJLENBQUMsdUJBQXVCLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDeEMsTUFBTSxRQUFRLEdBQUcsTUFBTSx1QkFBdUIsQ0FBQyw2QkFBNkIsQ0FBQyxDQUFDO1FBQzlFLE1BQU0sY0FBYyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUM7SUFDbEQsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsa0RBQWtELEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDbkUsTUFBTSxRQUFRLEdBQUcsTUFBTSx1QkFBdUIsQ0FBQywrQkFBK0IsQ0FBQyxDQUFDO1FBQ2hGLE1BQU0sY0FBYyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUM7SUFDbEQsQ0FBQyxDQUFDLENBQUM7QUFDSixDQUFDLENBQUMsQ0FBQyJ9