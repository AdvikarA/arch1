/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { createTrustedTypesPolicy } from '../../../../../../base/browser/trustedTypes.js';
import { applyFontInfo } from '../../../../config/domFontInfo.js';
import { EditorFontLigatures } from '../../../../../common/config/editorOptions.js';
import { StringBuilder } from '../../../../../common/core/stringBuilder.js';
import { LineDecoration } from '../../../../../common/viewLayout/lineDecorations.js';
import { RenderLineInput, renderViewLine } from '../../../../../common/viewLayout/viewLineRenderer.js';
import { ViewLineRenderingData } from '../../../../../common/viewModel.js';
const ttPolicy = createTrustedTypesPolicy('diffEditorWidget', { createHTML: value => value });
export function renderLines(source, options, decorations, domNode, noExtra = false) {
    applyFontInfo(domNode, options.fontInfo);
    const hasCharChanges = (decorations.length > 0);
    const sb = new StringBuilder(10000);
    let maxCharsPerLine = 0;
    let renderedLineCount = 0;
    const viewLineCounts = [];
    for (let lineIndex = 0; lineIndex < source.lineTokens.length; lineIndex++) {
        const lineNumber = lineIndex + 1;
        const lineTokens = source.lineTokens[lineIndex];
        const lineBreakData = source.lineBreakData[lineIndex];
        const actualDecorations = LineDecoration.filter(decorations, lineNumber, 1, Number.MAX_SAFE_INTEGER);
        if (lineBreakData) {
            let lastBreakOffset = 0;
            for (const breakOffset of lineBreakData.breakOffsets) {
                const viewLineTokens = lineTokens.sliceAndInflate(lastBreakOffset, breakOffset, 0);
                maxCharsPerLine = Math.max(maxCharsPerLine, renderOriginalLine(renderedLineCount, viewLineTokens, LineDecoration.extractWrapped(actualDecorations, lastBreakOffset, breakOffset), hasCharChanges, source.mightContainNonBasicASCII, source.mightContainRTL, options, sb, noExtra));
                renderedLineCount++;
                lastBreakOffset = breakOffset;
            }
            viewLineCounts.push(lineBreakData.breakOffsets.length);
        }
        else {
            viewLineCounts.push(1);
            maxCharsPerLine = Math.max(maxCharsPerLine, renderOriginalLine(renderedLineCount, lineTokens, actualDecorations, hasCharChanges, source.mightContainNonBasicASCII, source.mightContainRTL, options, sb, noExtra));
            renderedLineCount++;
        }
    }
    maxCharsPerLine += options.scrollBeyondLastColumn;
    const html = sb.build();
    const trustedhtml = ttPolicy ? ttPolicy.createHTML(html) : html;
    domNode.innerHTML = trustedhtml;
    const minWidthInPx = (maxCharsPerLine * options.typicalHalfwidthCharacterWidth);
    return {
        heightInLines: renderedLineCount,
        minWidthInPx,
        viewLineCounts,
    };
}
export class LineSource {
    constructor(lineTokens, lineBreakData = lineTokens.map(t => null), mightContainNonBasicASCII = true, mightContainRTL = true) {
        this.lineTokens = lineTokens;
        this.lineBreakData = lineBreakData;
        this.mightContainNonBasicASCII = mightContainNonBasicASCII;
        this.mightContainRTL = mightContainRTL;
    }
}
export class RenderOptions {
    static fromEditor(editor) {
        const modifiedEditorOptions = editor.getOptions();
        const fontInfo = modifiedEditorOptions.get(59 /* EditorOption.fontInfo */);
        const layoutInfo = modifiedEditorOptions.get(164 /* EditorOption.layoutInfo */);
        return new RenderOptions(editor.getModel()?.getOptions().tabSize || 0, fontInfo, modifiedEditorOptions.get(40 /* EditorOption.disableMonospaceOptimizations */), fontInfo.typicalHalfwidthCharacterWidth, modifiedEditorOptions.get(117 /* EditorOption.scrollBeyondLastColumn */), modifiedEditorOptions.get(75 /* EditorOption.lineHeight */), layoutInfo.decorationsWidth, modifiedEditorOptions.get(132 /* EditorOption.stopRenderingLineAfter */), modifiedEditorOptions.get(112 /* EditorOption.renderWhitespace */), modifiedEditorOptions.get(107 /* EditorOption.renderControlCharacters */), modifiedEditorOptions.get(60 /* EditorOption.fontLigatures */), modifiedEditorOptions.get(116 /* EditorOption.scrollbar */).verticalScrollbarSize);
    }
    constructor(tabSize, fontInfo, disableMonospaceOptimizations, typicalHalfwidthCharacterWidth, scrollBeyondLastColumn, lineHeight, lineDecorationsWidth, stopRenderingLineAfter, renderWhitespace, renderControlCharacters, fontLigatures, verticalScrollbarSize, setWidth = true) {
        this.tabSize = tabSize;
        this.fontInfo = fontInfo;
        this.disableMonospaceOptimizations = disableMonospaceOptimizations;
        this.typicalHalfwidthCharacterWidth = typicalHalfwidthCharacterWidth;
        this.scrollBeyondLastColumn = scrollBeyondLastColumn;
        this.lineHeight = lineHeight;
        this.lineDecorationsWidth = lineDecorationsWidth;
        this.stopRenderingLineAfter = stopRenderingLineAfter;
        this.renderWhitespace = renderWhitespace;
        this.renderControlCharacters = renderControlCharacters;
        this.fontLigatures = fontLigatures;
        this.verticalScrollbarSize = verticalScrollbarSize;
        this.setWidth = setWidth;
    }
    withSetWidth(setWidth) {
        return new RenderOptions(this.tabSize, this.fontInfo, this.disableMonospaceOptimizations, this.typicalHalfwidthCharacterWidth, this.scrollBeyondLastColumn, this.lineHeight, this.lineDecorationsWidth, this.stopRenderingLineAfter, this.renderWhitespace, this.renderControlCharacters, this.fontLigatures, this.verticalScrollbarSize, setWidth);
    }
    withScrollBeyondLastColumn(scrollBeyondLastColumn) {
        return new RenderOptions(this.tabSize, this.fontInfo, this.disableMonospaceOptimizations, this.typicalHalfwidthCharacterWidth, scrollBeyondLastColumn, this.lineHeight, this.lineDecorationsWidth, this.stopRenderingLineAfter, this.renderWhitespace, this.renderControlCharacters, this.fontLigatures, this.verticalScrollbarSize, this.setWidth);
    }
}
function renderOriginalLine(viewLineIdx, lineTokens, decorations, hasCharChanges, mightContainNonBasicASCII, mightContainRTL, options, sb, noExtra) {
    sb.appendString('<div class="view-line');
    if (!noExtra && !hasCharChanges) {
        // No char changes
        sb.appendString(' char-delete');
    }
    sb.appendString('" style="top:');
    sb.appendString(String(viewLineIdx * options.lineHeight));
    if (options.setWidth) {
        sb.appendString('px;width:1000000px;">');
    }
    else {
        sb.appendString('px;">');
    }
    const lineContent = lineTokens.getLineContent();
    const isBasicASCII = ViewLineRenderingData.isBasicASCII(lineContent, mightContainNonBasicASCII);
    const containsRTL = ViewLineRenderingData.containsRTL(lineContent, isBasicASCII, mightContainRTL);
    const output = renderViewLine(new RenderLineInput((options.fontInfo.isMonospace && !options.disableMonospaceOptimizations), options.fontInfo.canUseHalfwidthRightwardsArrow, lineContent, false, isBasicASCII, containsRTL, 0, lineTokens, decorations, options.tabSize, 0, options.fontInfo.spaceWidth, options.fontInfo.middotWidth, options.fontInfo.wsmiddotWidth, options.stopRenderingLineAfter, options.renderWhitespace, options.renderControlCharacters, options.fontLigatures !== EditorFontLigatures.OFF, null, // Send no selections, original line cannot be selected
    null, options.verticalScrollbarSize), sb);
    sb.appendString('</div>');
    return output.characterMapping.getHorizontalOffset(output.characterMapping.length);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVuZGVyTGluZXMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9hZHZpa2FyL0RvY3VtZW50cy9hcmNoaXRlY3QvYXJjaDIvQXJjaElERS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvYnJvd3Nlci93aWRnZXQvZGlmZkVkaXRvci9jb21wb25lbnRzL2RpZmZFZGl0b3JWaWV3Wm9uZXMvcmVuZGVyTGluZXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDMUYsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBRWxFLE9BQU8sRUFBRSxtQkFBbUIsRUFBbUQsTUFBTSwrQ0FBK0MsQ0FBQztBQUVySSxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFHNUUsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHFEQUFxRCxDQUFDO0FBQ3JGLE9BQU8sRUFBRSxlQUFlLEVBQUUsY0FBYyxFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDdkcsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFHM0UsTUFBTSxRQUFRLEdBQUcsd0JBQXdCLENBQUMsa0JBQWtCLEVBQUUsRUFBRSxVQUFVLEVBQUUsS0FBSyxDQUFDLEVBQUUsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDO0FBRTlGLE1BQU0sVUFBVSxXQUFXLENBQUMsTUFBa0IsRUFBRSxPQUFzQixFQUFFLFdBQStCLEVBQUUsT0FBb0IsRUFBRSxPQUFPLEdBQUcsS0FBSztJQUM3SSxhQUFhLENBQUMsT0FBTyxFQUFFLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQztJQUV6QyxNQUFNLGNBQWMsR0FBRyxDQUFDLFdBQVcsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUM7SUFFaEQsTUFBTSxFQUFFLEdBQUcsSUFBSSxhQUFhLENBQUMsS0FB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