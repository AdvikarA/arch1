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
import * as dom from '../../../../../base/browser/dom.js';
import { MarkdownString } from '../../../../../base/common/htmlContent.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { autorun, autorunWithStore, constObservable } from '../../../../../base/common/observable.js';
import { Range } from '../../../../common/core/range.js';
import { ILanguageService } from '../../../../common/languages/language.js';
import { HoverForeignElementAnchor, RenderedHoverParts } from '../../../hover/browser/hoverTypes.js';
import { InlineCompletionsController } from '../controller/inlineCompletionsController.js';
import { InlineSuggestionHintsContentWidget } from './inlineCompletionsHintsWidget.js';
import { MarkdownRenderer } from '../../../../browser/widget/markdownRenderer/browser/markdownRenderer.js';
import * as nls from '../../../../../nls.js';
import { IAccessibilityService } from '../../../../../platform/accessibility/common/accessibility.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { IOpenerService } from '../../../../../platform/opener/common/opener.js';
import { ITelemetryService } from '../../../../../platform/telemetry/common/telemetry.js';
import { GhostTextView } from '../view/ghostText/ghostTextView.js';
export class InlineCompletionsHover {
    constructor(owner, range, controller) {
        this.owner = owner;
        this.range = range;
        this.controller = controller;
    }
    isValidForHoverAnchor(anchor) {
        return (anchor.type === 1 /* HoverAnchorType.Range */
            && this.range.startColumn <= anchor.range.startColumn
            && this.range.endColumn >= anchor.range.endColumn);
    }
}
let InlineCompletionsHoverParticipant = class InlineCompletionsHoverParticipant {
    constructor(_editor, _languageService, _openerService, accessibilityService, _instantiationService, _telemetryService) {
        this._editor = _editor;
        this._languageService = _languageService;
        this._openerService = _openerService;
        this.accessibilityService = accessibilityService;
        this._instantiationService = _instantiationService;
        this._telemetryService = _telemetryService;
        this.hoverOrdinal = 4;
    }
    suggestHoverAnchor(mouseEvent) {
        const controller = InlineCompletionsController.get(this._editor);
        if (!controller) {
            return null;
        }
        const target = mouseEvent.target;
        if (target.type === 8 /* MouseTargetType.CONTENT_VIEW_ZONE */) {
            // handle the case where the mouse is over the view zone
            const viewZoneData = target.detail;
            if (controller.shouldShowHoverAtViewZone(viewZoneData.viewZoneId)) {
                return new HoverForeignElementAnchor(1000, this, Range.fromPositions(this._editor.getModel().validatePosition(viewZoneData.positionBefore || viewZoneData.position)), mouseEvent.event.posx, mouseEvent.event.posy, false);
            }
        }
        if (target.type === 7 /* MouseTargetType.CONTENT_EMPTY */) {
            // handle the case where the mouse is over the empty portion of a line following ghost text
            if (controller.shouldShowHoverAt(target.range)) {
                return new HoverForeignElementAnchor(1000, this, target.range, mouseEvent.event.posx, mouseEvent.event.posy, false);
            }
        }
        if (target.type === 6 /* MouseTargetType.CONTENT_TEXT */) {
            // handle the case where the mouse is directly over ghost text
            const mightBeForeignElement = target.detail.mightBeForeignElement;
            if (mightBeForeignElement && controller.shouldShowHoverAt(target.range)) {
                return new HoverForeignElementAnchor(1000, this, target.range, mouseEvent.event.posx, mouseEvent.event.posy, false);
            }
        }
        if (target.type === 9 /* MouseTargetType.CONTENT_WIDGET */ && target.element) {
            const ctx = GhostTextView.getWarningWidgetContext(target.element);
            if (ctx && controller.shouldShowHoverAt(ctx.range)) {
                return new HoverForeignElementAnchor(1000, this, ctx.range, mouseEvent.event.posx, mouseEvent.event.posy, false);
            }
        }
        return null;
    }
    computeSync(anchor, lineDecorations) {
        if (this._editor.getOption(71 /* EditorOption.inlineSuggest */).showToolbar !== 'onHover') {
            return [];
        }
        const controller = InlineCompletionsController.get(this._editor);
        if (controller && controller.shouldShowHoverAt(anchor.range)) {
            return [new InlineCompletionsHover(this, anchor.range, controller)];
        }
        return [];
    }
    renderHoverParts(context, hoverParts) {
        const disposables = new DisposableStore();
        const part = hoverParts[0];
        this._telemetryService.publicLog2('inlineCompletionHover.shown');
        if (this.accessibilityService.isScreenReaderOptimized() && !this._editor.getOption(12 /* EditorOption.screenReaderAnnounceInlineSuggestion */)) {
            disposables.add(this.renderScreenReaderText(context, part));
        }
        const model = part.controller.model.get();
        const widgetNode = document.createElement('div');
        context.fragment.appendChild(widgetNode);
        disposables.add(autorunWithStore((reader, store) => {
            const w = store.add(this._instantiationService.createInstance(InlineSuggestionHintsContentWidget.hot.read(reader), this._editor, false, constObservable(null), model.selectedInlineCompletionIndex, model.inlineCompletionsCount, model.activeCommands, model.warning, () => {
                context.onContentsChanged();
            }));
            widgetNode.replaceChildren(w.getDomNode());
        }));
        model.triggerExplicitly();
        const renderedHoverPart = {
            hoverPart: part,
            hoverElement: widgetNode,
            dispose() { disposables.dispose(); }
        };
        return new RenderedHoverParts([renderedHoverPart]);
    }
    getAccessibleContent(hoverPart) {
        return nls.localize('hoverAccessibilityStatusBar', 'There are inline completions here');
    }
    renderScreenReaderText(context, part) {
        const disposables = new DisposableStore();
        const $ = dom.$;
        const markdownHoverElement = $('div.hover-row.markdown-hover');
        const hoverContentsElement = dom.append(markdownHoverElement, $('div.hover-contents', { ['aria-live']: 'assertive' }));
        const renderer = new MarkdownRenderer({ editor: this._editor }, this._languageService, this._openerService);
        const render = (code) => {
            const inlineSuggestionAvailable = nls.localize('inlineSuggestionFollows', "Suggestion:");
            const renderedContents = disposables.add(renderer.render(new MarkdownString().appendText(inlineSuggestionAvailable).appendCodeblock('text', code), {
                asyncRenderCallback: () => {
                    hoverContentsElement.className = 'hover-contents code-hover-contents';
                    context.onContentsChanged();
                }
            }));
            hoverContentsElement.replaceChildren(renderedContents.element);
        };
        disposables.add(autorun(reader => {
            /** @description update hover */
            const ghostText = part.controller.model.read(reader)?.primaryGhostText.read(reader);
            if (ghostText) {
                const lineText = this._editor.getModel().getLineContent(ghostText.lineNumber);
                render(ghostText.renderForScreenReader(lineText));
            }
            else {
                dom.reset(hoverContentsElement);
            }
        }));
        context.fragment.appendChild(markdownHoverElement);
        return disposables;
    }
};
InlineCompletionsHoverParticipant = __decorate([
    __param(1, ILanguageService),
    __param(2, IOpenerService),
    __param(3, IAccessibilityService),
    __param(4, IInstantiationService),
    __param(5, ITelemetryService)
], InlineCompletionsHoverParticipant);
export { InlineCompletionsHoverParticipant };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaG92ZXJQYXJ0aWNpcGFudC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL2FkdmlrYXIvRG9jdW1lbnRzL2FyY2hpdGVjdC9hcmNoMi9BcmNoSURFL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL2lubGluZUNvbXBsZXRpb25zL2Jyb3dzZXIvaGludHNXaWRnZXQvaG92ZXJQYXJ0aWNpcGFudC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLG9DQUFvQyxDQUFDO0FBQzFELE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUMzRSxPQUFPLEVBQUUsZUFBZSxFQUFlLE1BQU0seUNBQXlDLENBQUM7QUFDdkYsT0FBTyxFQUFFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxlQUFlLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUd0RyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDekQsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFFNUUsT0FBTyxFQUFnQyx5QkFBeUIsRUFBMkcsa0JBQWtCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUM1TyxPQUFPLEVBQUUsMkJBQTJCLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQztBQUMzRixPQUFPLEVBQUUsa0NBQWtDLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUN2RixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSx5RUFBeUUsQ0FBQztBQUMzRyxPQUFPLEtBQUssR0FBRyxNQUFNLHVCQUF1QixDQUFDO0FBQzdDLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFDO0FBQ3RHLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFDO0FBQ3RHLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxpREFBaUQsQ0FBQztBQUNq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