var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var InlineChatZoneWidget_1;
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { addDisposableListener, Dimension } from '../../../../base/browser/dom.js';
import * as aria from '../../../../base/browser/ui/aria/aria.js';
import { MutableDisposable, toDisposable } from '../../../../base/common/lifecycle.js';
import { autorun } from '../../../../base/common/observable.js';
import { isEqual } from '../../../../base/common/resources.js';
import { assertType } from '../../../../base/common/types.js';
import { StableEditorBottomScrollState } from '../../../../editor/browser/stableEditorScroll.js';
import { ZoneWidget } from '../../../../editor/contrib/zoneWidget/browser/zoneWidget.js';
import { localize } from '../../../../nls.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { isResponseVM } from '../../chat/common/chatViewModel.js';
import { ACTION_REGENERATE_RESPONSE, ACTION_REPORT_ISSUE, ACTION_TOGGLE_DIFF, CTX_INLINE_CHAT_OUTER_CURSOR_POSITION, MENU_INLINE_CHAT_SIDE, MENU_INLINE_CHAT_WIDGET_SECONDARY, MENU_INLINE_CHAT_WIDGET_STATUS } from '../common/inlineChat.js';
import { EditorBasedInlineChatWidget } from './inlineChatWidget.js';
let InlineChatZoneWidget = class InlineChatZoneWidget extends ZoneWidget {
    static { InlineChatZoneWidget_1 = this; }
    static { this._options = {
        showFrame: true,
        frameWidth: 1,
        // frameColor: 'var(--vscode-inlineChat-border)',
        isResizeable: true,
        showArrow: false,
        isAccessible: true,
        className: 'inline-chat-widget',
        keepEditorSelection: true,
        showInHiddenAreas: true,
        ordinal: 50000,
    }; }
    constructor(location, options, editors, _instaService, _logService, contextKeyService) {
        super(editors.editor, InlineChatZoneWidget_1._options);
        this._instaService = _instaService;
        this._logService = _logService;
        this._scrollUp = this._disposables.add(new ScrollUpState(this.editor));
        this.notebookEditor = editors.notebookEditor;
        this._ctxCursorPosition = CTX_INLINE_CHAT_OUTER_CURSOR_POSITION.bindTo(contextKeyService);
        this._disposables.add(toDisposable(() => {
            this._ctxCursorPosition.reset();
        }));
        this.widget = this._instaService.createInstance(EditorBasedInlineChatWidget, location, this.editor, {
            statusMenuId: {
                menu: MENU_INLINE_CHAT_WIDGET_STATUS,
                options: {
                    buttonConfigProvider: (action, index) => {
                        const isSecondary = index > 0;
                        if (new Set([ACTION_REGENERATE_RESPONSE, ACTION_TOGGLE_DIFF, ACTION_REPORT_ISSUE]).has(action.id)) {
                            return { isSecondary, showIcon: true, showLabel: false };
                        }
                        else {
                            return { isSecondary };
                        }
                    }
                }
            },
            secondaryMenuId: MENU_INLINE_CHAT_WIDGET_SECONDARY,
            inZoneWidget: true,
            chatWidgetViewOptions: {
                menus: {
                    telemetrySource: 'interactiveEditorWidget-toolbar',
                    inputSideToolbar: MENU_INLINE_CHAT_SIDE
                },
                ...options,
                rendererOptions: {
                    renderTextEditsAsSummary: (uri) => {
                        // render when dealing with the current file in the editor
                        return isEqual(uri, editors.editor.getModel()?.uri);
                    },
                    renderDetectedCommandsWithRequest: true,
                    ...options?.rendererOptions
                },
            }
        });
        this._disposables.add(this.widget);
        let revealFn;
        this._disposables.add(this.widget.chatWidget.onWillMaybeChangeHeight(() => {
            if (this.position) {
                revealFn = this._createZoneAndScrollRestoreFn(this.position);
            }
        }));
        this._disposables.add(this.widget.onDidChangeHeight(() => {
            if (this.position && !this._usesResizeHeight) {
                // only relayout when visible
                revealFn ??= this._createZoneAndScrollRestoreFn(this.position);
                const height = this._computeHeight();
                this._relayout(height.linesValue);
                revealFn?.();
                revealFn = undefined;
            }
        }));
        this.create();
        this._disposables.add(autorun(r => {
            const isBusy = this.widget.requestInProgress.read(r);
            this.domNode.firstElementChild?.classList.toggle('busy', isBusy);
        }));
        this._disposables.add(addDisposableListener(this.domNode, 'click', e => {
            if (!this.editor.hasWidgetFocus() && !this.widget.hasFocus()) {
                this.editor.focus();
            }
        }, true));
        // todo@jrieken listen ONLY when showing
        const updateCursorIsAboveContextKey = () => {
            if (!this.position || !this.editor.hasModel()) {
                this._ctxCursorPosition.reset();
            }
            else if (this.position.lineNumber === this.editor.getPosition().lineNumber) {
                this._ctxCursorPosition.set('above');
            }
            else if (this.position.lineNumber + 1 === this.editor.getPosition().lineNumber) {
                this._ctxCursorPosition.set('below');
            }
            else {
                this._ctxCursorPosition.reset();
            }
        };
        this._disposables.add(this.editor.onDidChangeCursorPosition(e => updateCursorIsAboveContextKey()));
        this._disposables.add(this.editor.onDidFocusEditorText(e => updateCursorIsAboveContextKey()));
        updateCursorIsAboveContextKey();
    }
    _fillContainer(container) {
        container.style.setProperty('--vscode-inlineChat-background', 'var(--vscode-editor-background)');
        container.appendChild(this.widget.domNode);
    }
    _doLayout(heightInPixel) {
        this._updatePadding();
        const info = this.editor.getLayoutInfo();
        const width = info.contentWidth - info.verticalScrollbarWidth;
        // width = Math.min(850, width);
        this._dimension = new Dimension(width, heightInPixel);
        this.widget.layout(this._dimension);
    }
    _computeHeight() {
        const chatContentHeight = this.widget.contentHeight;
        const editorHeight = this.notebookEditor?.getLayoutInfo().height ?? this.editor.getLayoutInfo().height;
        const contentHeight = this._decoratingElementsHeight() + Math.min(chatContentHeight, Math.max(this.widget.minHeight, editorHeight * 0.42));
        const heightInLines = contentHeight / this.editor.getOption(75 /* EditorOption.lineHeight */);
        return { linesValue: heightInLines, pixelsValue: contentHeight };
    }
    _getResizeBounds() {
        const lineHeight = this.editor.getOption(75 /* EditorOption.lineHeight */);
        const decoHeight = this._decoratingElementsHeight();
        const minHeightPx = decoHeight + this.widget.minHeight;
        const maxHeightPx = decoHeight + this.widget.contentHeight;
        return {
            minLines: minHeightPx / lineHeight,
            maxLines: maxHeightPx / lineHeight
        };
    }
    _onWidth(_widthInPixel) {
        if (this._dimension) {
            this._doLayout(this._dimension.height);
        }
    }
    show(position) {
        assertType(this.container);
        this._updatePadding();
        const revealZone = this._createZoneAndScrollRestoreFn(position);
        super.show(position, this._computeHeight().linesValue);
        this.widget.chatWidget.setVisible(true);
        this.widget.focus();
        revealZone();
        this._scrollUp.enable();
    }
    _updatePadding() {
        assertType(this.container);
        const info = this.editor.getLayoutInfo();
        const marginWithoutIndentation = info.glyphMarginWidth + info.lineNumbersWidth + info.decorationsWidth;
        this.container.style.paddingLeft = `${marginWithoutIndentation}px`;
    }
    reveal(position) {
        const stickyScroll = this.editor.getOption(130 /* EditorOption.stickyScroll */);
        const magicValue = stickyScroll.enabled ? stickyScroll.maxLineCount : 0;
        this.editor.revealLines(position.lineNumber + magicValue, position.lineNumber + magicValue, 1 /* ScrollType.Immediate */);
        this._scrollUp.reset();
        this.updatePositionAndHeight(position);
    }
    updatePositionAndHeight(position) {
        const revealZone = this._createZoneAndScrollRestoreFn(position);
        super.updatePositionAndHeight(position, !this._usesResizeHeight ? this._computeHeight().linesValue : undefined);
        revealZone();
    }
    _createZoneAndScrollRestoreFn(position) {
        const scrollState = StableEditorBottomScrollState.capture(this.editor);
        const lineNumber = position.lineNumber <= 1 ? 1 : 1 + position.lineNumber;
        const scrollTop = this.editor.getScrollTop();
        const lineTop = this.editor.getTopForLineNumber(lineNumber);
        const zoneTop = lineTop - this._computeHeight().pixelsValue;
        const hasResponse = this.widget.chatWidget.viewModel?.getItems().find(candidate => {
            return isResponseVM(candidate) && candidate.response.value.length > 0;
        });
        if (hasResponse && zoneTop < scrollTop || this._scrollUp.didScrollUpOrDown) {
            // don't reveal the zone if it is already out of view (unless we are still getting ready)
            // or if an outside scroll-up happened (e.g the user scrolled up/down to see the new content)
            return this._scrollUp.runIgnored(() => {
                scrollState.restore(this.editor);
            });
        }
        return this._scrollUp.runIgnored(() => {
            scrollState.restore(this.editor);
            const scrollTop = this.editor.getScrollTop();
            const lineTop = this.editor.getTopForLineNumber(lineNumber);
            const zoneTop = lineTop - this._computeHeight().pixelsValue;
            const editorHeight = this.editor.getLayoutInfo().height;
            const lineBottom = this.editor.getBottomForLineNumber(lineNumber);
            let newScrollTop = zoneTop;
            let forceScrollTop = false;
            if (lineBottom >= (scrollTop + editorHeight)) {
                // revealing the top of the zone would push out the line we are interested in and
                // therefore we keep the line in the viewport
                newScrollTop = lineBottom - editorHeight;
                forceScrollTop = true;
            }
            if (newScrollTop < scrollTop || forceScrollTop) {
                this._logService.trace('[IE] REVEAL zone', { zoneTop, lineTop, lineBottom, scrollTop, newScrollTop, forceScrollTop });
                this.editor.setScrollTop(newScrollTop, 1 /* ScrollType.Immediate */);
            }
        });
    }
    revealRange(range, isLastLine) {
        // noop
    }
    hide() {
        const scrollState = StableEditorBottomScrollState.capture(this.editor);
        this._scrollUp.disable();
        this._ctxCursorPosition.reset();
        this.widget.reset();
        this.widget.chatWidget.setVisible(false);
        super.hide();
        aria.status(localize('inlineChatClosed', 'Closed inline chat widget'));
        scrollState.restore(this.editor);
    }
};
InlineChatZoneWidget = InlineChatZoneWidget_1 = __decorate([
    __param(3, IInstantiationService),
    __param(4, ILogService),
    __param(5, IContextKeyService)
], InlineChatZoneWidget);
export { InlineChatZoneWidget };
class ScrollUpState {
    constructor(_editor) {
        this._editor = _editor;
        this._ignoreEvents = false;
        this._listener = new MutableDisposable();
    }
    dispose() {
        this._listener.dispose();
    }
    reset() {
        this._didScrollUpOrDown = undefined;
    }
    enable() {
        this._didScrollUpOrDown = undefined;
        this._listener.value = this._editor.onDidScrollChange(e => {
            if (!e.scrollTopChanged || this._ignoreEvents) {
                return;
            }
            this._listener.clear();
            this._didScrollUpOrDown = true;
        });
    }
    disable() {
        this._listener.clear();
        this._didScrollUpOrDown = undefined;
    }
    runIgnored(callback) {
        return () => {
            this._ignoreEvents = true;
            try {
                return callback();
            }
            finally {
                this._ignoreEvents = false;
            }
        };
    }
    get didScrollUpOrDown() {
        return this._didScrollUpOrDown;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5saW5lQ2hhdFpvbmVXaWRnZXQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9hZHZpa2FyL0RvY3VtZW50cy9hcmNoaXRlY3QvYXJjaDIvQXJjaElERS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9pbmxpbmVDaGF0L2Jyb3dzZXIvaW5saW5lQ2hhdFpvbmVXaWRnZXQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7OztBQUFBOzs7Z0dBR2dHO0FBQ2hHLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxTQUFTLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUNuRixPQUFPLEtBQUssSUFBSSxNQUFNLDBDQUEwQyxDQUFDO0FBQ2pFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxZQUFZLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUN2RixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDaEUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQy9ELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUU5RCxPQUFPLEVBQUUsNkJBQTZCLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUtqRyxPQUFPLEVBQVksVUFBVSxFQUFFLE1BQU0sNkRBQTZELENBQUM7QUFDbkcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQzlDLE9BQU8sRUFBZSxrQkFBa0IsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQ3ZHLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ25HLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUdyRSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFFbEUsT0FBTyxFQUFFLDBCQUEwQixFQUFFLG1CQUFtQixFQUFFLGtCQUFrQixFQUFFLHFDQUFxQyxFQUFFLHFCQUFx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