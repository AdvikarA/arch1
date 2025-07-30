/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { CssClassModifiers } from '../types.js';
import { ReactiveDecorationBase } from './utils/reactiveDecorationBase.js';
/**
 * Decoration CSS class names.
 */
export var CssClassNames;
(function (CssClassNames) {
    CssClassNames["Main"] = ".prompt-front-matter-decoration-marker";
    CssClassNames["Inline"] = ".prompt-front-matter-decoration-marker-inline";
    CssClassNames["MainInactive"] = ".prompt-front-matter-decoration-marker.prompt-decoration-inactive";
    CssClassNames["InlineInactive"] = ".prompt-front-matter-decoration-marker-inline.prompt-decoration-inactive";
})(CssClassNames || (CssClassNames = {}));
/**
 * Editor decoration for a `marker` token of a Front Matter header.
 */
export class FrontMatterMarkerDecoration extends ReactiveDecorationBase {
    /**
     * Activate/deactivate the decoration.
     */
    activate(state) {
        const position = (state === true)
            ? this.token.range.getStartPosition()
            : null;
        this.setCursorPosition(position);
        return this;
    }
    get classNames() {
        return CssClassNames;
    }
    get description() {
        return 'Marker decoration of a Front Matter header.';
    }
    static get cssStyles() {
        return {
            [CssClassNames.Inline]: [
                'color: var(--vscode-disabledForeground);',
            ],
            [CssClassNames.InlineInactive]: [
                'opacity: 0.25;',
            ],
        };
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZnJvbnRNYXR0ZXJNYXJrZXJEZWNvcmF0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvYWR2aWthci9Eb2N1bWVudHMvYXJjaGl0ZWN0L2FyY2gyL0FyY2hJREUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9jb21tb24vcHJvbXB0U3ludGF4L2xhbmd1YWdlUHJvdmlkZXJzL2RlY29yYXRpb25zUHJvdmlkZXIvZGVjb3JhdGlvbnMvZnJvbnRNYXR0ZXJNYXJrZXJEZWNvcmF0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGFBQWEsQ0FBQztBQUdoRCxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUUzRTs7R0FFRztBQUNILE1BQU0sQ0FBTixJQUFZLGFBS1g7QUFMRCxXQUFZLGFBQWE7SUFDeEIsZ0VBQStDLENBQUE7SUFDL0MseUVBQXdELENBQUE7SUFDeEQsbUdBQW1FLENBQUE7SUFDbkUsNEdBQXVFLENBQUE7QUFDeEUsQ0FBQyxFQUxXLGFBQWEsS0FBYixhQUFhLFFBS3hCO0FBRUQ7O0dBRUc7QUFDSCxNQUFNLE9BQU8sMkJBQTRCLFNBQVEsc0JBQXdEO0lBQ3hHOztPQUVHO0lBQ0ksUUFBUSxDQUFDLEtBQWM7UUFDN0IsTUFBTSxRQUFRLEdBQUcsQ0FBQyxLQUFLLEtBQUssSUFBSSxDQUFDO1lBQ2hDLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxnQkFBZ0IsRUFBRTtZQUNyQyxDQUFDLENBQUMsSUFBSSxDQUFDO1FBRVIsSUFBSSxDQUFDLGlCQUFpQixDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBRWpDLE9BQU8sSUFBSSxDQUFDO0lBQ2IsQ0FBQztJQUVELElBQXVCLFVBQVU7UUFDaEMsT0FBTyxhQUFhLENBQUM7SUFDdEIsQ0FBQztJQUVELElBQXVCLFdBQVc7UUFDakMsT0FBTyw2Q0FBNkMsQ0FBQztJQUN0RCxDQUFDO0lBRU0sTUFBTSxLQUFLLFNBQVM7UUFDMUIsT0FBTztZQUNOLENBQUMsYUFBYSxDQUFDLE1BQU0sQ0FBQyxFQUFFO2dCQUN2QiwwQ0FBMEM7YUFDMUM7WUFDRCxDQUFDLGFBQWEsQ0FBQyxjQUFjLENBQUMsRUFBRTtnQkFDL0IsZ0JBQWdCO2FBQ2hCO1NBQ0QsQ0FBQztJQUNILENBQUM7Q0FDRCJ9