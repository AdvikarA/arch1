/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../../../../../nls.js';
import { contrastBorder, editorBackground } from '../../../../../../../../platform/theme/common/colorRegistry.js';
import { asCssVariable, darken, registerColor } from '../../../../../../../../platform/theme/common/colorUtils.js';
import { FrontMatterHeader } from '../../../codecs/base/markdownExtensionsCodec/tokens/frontMatterHeader.js';
import { CssClassModifiers } from '../types.js';
import { FrontMatterMarkerDecoration } from './frontMatterMarkerDecoration.js';
import { ReactiveDecorationBase } from './utils/reactiveDecorationBase.js';
/**
 * Decoration CSS class names.
 */
export var CssClassNames;
(function (CssClassNames) {
    CssClassNames["Main"] = ".prompt-front-matter-decoration";
    CssClassNames["Inline"] = ".prompt-front-matter-decoration-inline";
    CssClassNames["MainInactive"] = ".prompt-front-matter-decoration.prompt-decoration-inactive";
    CssClassNames["InlineInactive"] = ".prompt-front-matter-decoration-inline.prompt-decoration-inactive";
})(CssClassNames || (CssClassNames = {}));
/**
 * Main background color of `active` Front Matter header block.
 */
export const BACKGROUND_COLOR = registerColor('prompt.frontMatter.background', { dark: darken(editorBackground, 0.2), light: darken(editorBackground, 0.05), hcDark: contrastBorder, hcLight: contrastBorder }, localize('chat.prompt.frontMatter.background.description', "Background color of a Front Matter header block."));
/**
 * Background color of `inactive` Front Matter header block.
 */
export const INACTIVE_BACKGROUND_COLOR = registerColor('prompt.frontMatter.inactiveBackground', { dark: darken(editorBackground, 0.1), light: darken(editorBackground, 0.025), hcDark: contrastBorder, hcLight: contrastBorder }, localize('chat.prompt.frontMatter.inactiveBackground.description', "Background color of an inactive Front Matter header block."));
/**
 * CSS styles for the decoration.
 */
export const CSS_STYLES = {
    [CssClassNames.Main]: [
        `background-color: ${asCssVariable(BACKGROUND_COLOR)};`,
        'z-index: -1;', // this is required to allow for selections to appear above the decoration background
    ],
    [CssClassNames.MainInactive]: [
        `background-color: ${asCssVariable(INACTIVE_BACKGROUND_COLOR)};`,
    ],
    [CssClassNames.InlineInactive]: [
        'color: var(--vscode-disabledForeground);',
    ],
    ...FrontMatterMarkerDecoration.cssStyles,
};
/**
 * Editor decoration for the Front Matter header token inside a prompt.
 */
export class FrontMatterDecoration extends ReactiveDecorationBase {
    constructor(accessor, token) {
        super(accessor, token);
        this.childDecorators.push(new FrontMatterMarkerDecoration(accessor, token.startMarker), new FrontMatterMarkerDecoration(accessor, token.endMarker));
    }
    setCursorPosition(position) {
        const result = super.setCursorPosition(position);
        for (const marker of this.childDecorators) {
            if ((marker instanceof FrontMatterMarkerDecoration) === false) {
                continue;
            }
            // activate/deactivate markers based on the active state
            // of the main Front Matter header decoration
            marker.activate(this.active);
        }
        return result;
    }
    get classNames() {
        return CssClassNames;
    }
    get isWholeLine() {
        return true;
    }
    get description() {
        return 'Front Matter header decoration.';
    }
    static get cssStyles() {
        return CSS_STYLES;
    }
    /**
     * Whether current decoration class can decorate provided token.
     */
    static handles(token) {
        return token instanceof FrontMatterHeader;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZnJvbnRNYXR0ZXJEZWNvcmF0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvYWR2aWthci9Eb2N1bWVudHMvYXJjaGl0ZWN0L2FyY2gyL0FyY2hJREUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9jb21tb24vcHJvbXB0U3ludGF4L2xhbmd1YWdlUHJvdmlkZXJzL2RlY29yYXRpb25zUHJvdmlkZXIvZGVjb3JhdGlvbnMvZnJvbnRNYXR0ZXJEZWNvcmF0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUMxRCxPQUFPLEVBQUUsY0FBYyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sZ0VBQWdFLENBQUM7QUFDbEgsT0FBTyxFQUFFLGFBQWEsRUFBbUIsTUFBTSxFQUFFLGFBQWEsRUFBRSxNQUFNLDZEQUE2RCxDQUFDO0FBRXBJLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDBFQUEwRSxDQUFDO0FBQzdHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGFBQWEsQ0FBQztBQUNoRCxPQUFPLEVBQUUsMkJBQTJCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUMvRSxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUczRTs7R0FFRztBQUNILE1BQU0sQ0FBTixJQUFZLGFBS1g7QUFMRCxXQUFZLGFBQWE7SUFDeEIseURBQXdDLENBQUE7SUFDeEMsa0VBQWlELENBQUE7SUFDakQsNEZBQW1FLENBQUE7SUFDbkUscUdBQXVFLENBQUE7QUFDeEUsQ0FBQyxFQUxXLGFBQWEsS0FBYixhQUFhLFFBS3hCO0FBRUQ7O0dBRUc7QUFDSCxNQUFNLENBQUMsTUFBTSxnQkFBZ0IsR0FBb0IsYUFBYSxDQUM3RCwrQkFBK0IsRUFDL0IsRUFBRSxJQUFJLEVBQUUsTUFBTSxDQUFDLGdCQUFnQixFQUFF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