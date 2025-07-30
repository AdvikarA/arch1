/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as dom from '../../../../base/browser/dom.js';
import { createFastDomNode } from '../../../../base/browser/fastDomNode.js';
import { PartFingerprints, ViewPart } from '../../view/viewPart.js';
/**
 * This view part is responsible for rendering the content widgets, which are
 * used for rendering elements that are associated to an editor position,
 * such as suggestions or the parameter hints.
 */
export class ViewContentWidgets extends ViewPart {
    constructor(context, viewDomNode) {
        super(context);
        this._viewDomNode = viewDomNode;
        this._widgets = {};
        this.domNode = createFastDomNode(document.createElement('div'));
        PartFingerprints.write(this.domNode, 1 /* PartFingerprint.ContentWidgets */);
        this.domNode.setClassName('contentWidgets');
        this.domNode.setPosition('absolute');
        this.domNode.setTop(0);
        this.overflowingContentWidgetsDomNode = createFastDomNode(document.createElement('div'));
        PartFingerprints.write(this.overflowingContentWidgetsDomNode, 2 /* PartFingerprint.OverflowingContentWidgets */);
        this.overflowingContentWidgetsDomNode.setClassName('overflowingContentWidgets');
    }
    dispose() {
        super.dispose();
        this._widgets = {};
    }
    // --- begin event handlers
    onConfigurationChanged(e) {
        const keys = Object.keys(this._widgets);
        for (const widgetId of keys) {
            this._widgets[widgetId].onConfigurationChanged(e);
        }
        return true;
    }
    onDecorationsChanged(e) {
        // true for inline decorations that can end up relayouting text
        return true;
    }
    onFlushed(e) {
        return true;
    }
    onLineMappingChanged(e) {
        this._updateAnchorsViewPositions();
        return true;
    }
    onLinesChanged(e) {
        this._updateAnchorsViewPositions();
        return true;
    }
    onLinesDeleted(e) {
        this._updateAnchorsViewPositions();
        return true;
    }
    onLinesInserted(e) {
        this._updateAnchorsViewPositions();
        return true;
    }
    onScrollChanged(e) {
        return true;
    }
    onZonesChanged(e) {
        return true;
    }
    // ---- end view event handlers
    _updateAnchorsViewPositions() {
        const keys = Object.keys(this._widgets);
        for (const widgetId of keys) {
            this._widgets[widgetId].updateAnchorViewPosition();
        }
    }
    addWidget(_widget) {
        const myWidget = new Widget(this._context, this._viewDomNode, _widget);
        this._widgets[myWidget.id] = myWidget;
        if (myWidget.allowEditorOverflow) {
            this.overflowingContentWidgetsDomNode.appendChild(myWidget.domNode);
        }
        else {
            this.domNode.appendChild(myWidget.domNode);
        }
        this.setShouldRender();
    }
    setWidgetPosition(widget, primaryAnchor, secondaryAnchor, preference, affinity) {
        const myWidget = this._widgets[widget.getId()];
        myWidget.setPosition(primaryAnchor, secondaryAnchor, preference, affinity);
        this.setShouldRender();
    }
    removeWidget(widget) {
        const widgetId = widget.getId();
        if (this._widgets.hasOwnProperty(widgetId)) {
            const myWidget = this._widgets[widgetId];
            delete this._widgets[widgetId];
            const domNode = myWidget.domNode.domNode;
            domNode.remove();
            domNode.removeAttribute('monaco-visible-content-widget');
            this.setShouldRender();
        }
    }
    shouldSuppressMouseDownOnWidget(widgetId) {
        if (this._widgets.hasOwnProperty(widgetId)) {
            return this._widgets[widgetId].suppressMouseDown;
        }
        return false;
    }
    onBeforeRender(viewportData) {
        const keys = Object.keys(this._widgets);
        for (const widgetId of keys) {
            this._widgets[widgetId].onBeforeRender(viewportData);
        }
    }
    prepareRender(ctx) {
        const keys = Object.keys(this._widgets);
        for (const widgetId of keys) {
            this._widgets[widgetId].prepareRender(ctx);
        }
    }
    render(ctx) {
        const keys = Object.keys(this._widgets);
        for (const widgetId of keys) {
            this._widgets[widgetId].render(ctx);
        }
    }
}
class Widget {
    constructor(context, viewDomNode, actual) {
        this._primaryAnchor = new PositionPair(null, null);
        this._secondaryAnchor = new PositionPair(null, null);
        this._context = context;
        this._viewDomNode = viewDomNode;
        this._actual = actual;
        const options = this._context.configuration.options;
        const layoutInfo = options.get(164 /* EditorOption.layoutInfo */);
        const allowOverflow = options.get(4 /* EditorOption.allowOverflow */);
        this.domNode = createFastDomNode(this._actual.getDomNode());
        this.id = this._actual.getId();
        this.allowEditorOverflow = (this._actual.allowEditorOverflow || false) && allowOverflow;
        this.suppressMouseDown = this._actual.suppressMouseDown || false;
        this._fixedOverflowWidgets = options.get(51 /* EditorOption.fixedOverflowWidgets */);
        this._contentWidth = layoutInfo.contentWidth;
        this._contentLeft = layoutInfo.contentLeft;
        this._affinity = null;
        this._preference = [];
        this._cachedDomNodeOffsetWidth = -1;
        this._cachedDomNodeOffsetHeight = -1;
        this._maxWidth = this._getMaxWidth();
        this._isVisible = false;
        this._renderData = null;
        this.domNode.setPosition((this._fixedOverflowWidgets && this.allowEditorOverflow) ? 'fixed' : 'absolute');
        this.domNode.setDisplay('none');
        this.domNode.setVisibility('hidden');
        this.domNode.setAttribute('widgetId', this.id);
        this.domNode.setMaxWidth(this._maxWidth);
    }
    onConfigurationChanged(e) {
        const options = this._context.configuration.options;
        if (e.hasChanged(164 /* EditorOption.layoutInfo */)) {
            const layoutInfo = options.get(164 /* EditorOption.layoutInfo */);
            this._contentLeft = layoutInfo.contentLeft;
            this._contentWidth = layoutInfo.contentWidth;
            this._maxWidth = this._getMaxWidth();
        }
    }
    updateAnchorViewPosition() {
        this._setPosition(this._affinity, this._primaryAnchor.modelPosition, this._secondaryAnchor.modelPosition);
    }
    _setPosition(affinity, primaryAnchor, secondaryAnchor) {
        this._affinity = affinity;
        this._primaryAnchor = getValidPositionPair(primaryAnchor, this._context.viewModel, this._affinity);
        this._secondaryAnchor = getValidPositionPair(secondaryAnchor, this._context.viewModel, this._affinity);
        function getValidPositionPair(position, viewModel, affinity) {
            if (!position) {
                return new PositionPair(null, null);
            }
            // Do not trust that widgets give a valid position
            const validModelPosition = viewModel.model.validatePosition(position);
            if (viewModel.coordinatesConverter.modelPositionIsVisible(validModelPosition)) {
                const viewPosition = viewModel.coordinatesConverter.convertModelPositionToViewPosition(validModelPosition, affinity ?? undefined);
                return new PositionPair(position, viewPosition);
            }
            return new PositionPair(position, null);
        }
    }
    _getMaxWidth() {
        const elDocument = this.domNode.domNode.ownerDocument;
        const elWindow = elDocument.defaultView;
        return (this.allowEditorOverflow
            ? elWindow?.innerWidth || elDocument.documentElement.offsetWidth || elDocument.body.offsetWidth
            : this._contentWidth);
    }
    setPosition(primaryAnchor, secondaryAnchor, preference, affinity) {
        this._setPosition(affinity, primaryAnchor, secondaryAnchor);
        this._preference = preference;
        if (this._primaryAnchor.viewPosition && this._preference && this._preference.length > 0) {
            // this content widget would like to be visible if possible
            // we change it from `display:none` to `display:block` even if it
            // might be outside the viewport such that we can measure its size
            // in `prepareRender`
            this.domNode.setDisplay('block');
        }
        else {
            this.domNode.setDisplay('none');
        }
        this._cachedDomNodeOffsetWidth = -1;
        this._cachedDomNodeOffsetHeight = -1;
    }
    _layoutBoxInViewport(anchor, width, height, ctx) {
        // Our visible box is split horizontally by the current line => 2 boxes
        // a) the box above the line
        const aboveLineTop = anchor.top;
        const heightAvailableAboveLine = aboveLineTop;
        // b) the box under the line
        const underLineTop = anchor.top + anchor.height;
        const heightAvailableUnderLine = ctx.viewportHeight - underLineTop;
        const aboveTop = aboveLineTop - height;
        const fitsAbove = (heightAvailableAboveLine >= height);
        const belowTop = underLineTop;
        const fitsBelow = (heightAvailableUnderLine >= height);
        // And its left
        let left = anchor.left;
        if (left + width > ctx.scrollLeft + ctx.viewportWidth) {
            left = ctx.scrollLeft + ctx.viewportWidth - width;
        }
        if (left < ctx.scrollLeft) {
            left = ctx.scrollLeft;
        }
        return { fitsAbove, aboveTop, fitsBelow, belowTop, left };
    }
    _layoutHorizontalSegmentInPage(windowSize, domNodePosition, left, width) {
        // Leave some clearance to the left/right
        const LEFT_PADDING = 15;
        const RIGHT_PADDING = 15;
        // Initially, the limits are defined as the dom node limits
        const MIN_LIMIT = Math.max(LEFT_PADDING, domNodePosition.left - width);
        const MAX_LIMIT = Math.min(domNodePosition.left + domNodePosition.width + width, windowSize.width - RIGHT_PADDING);
        const elDocument = this._viewDomNode.domNode.ownerDocument;
        const elWindow = elDocument.defaultView;
        let absoluteLeft = domNodePosition.left + left - (elWindow?.scrollX ?? 0);
        if (absoluteLeft + width > MAX_LIMIT) {
            const delta = absoluteLeft - (MAX_LIMIT - width);
            absoluteLeft -= delta;
            left -= delta;
        }
        if (absoluteLeft < MIN_LIMIT) {
            const delta = absoluteLeft - MIN_LIMIT;
            absoluteLeft -= delta;
            left -= delta;
        }
        return [left, absoluteLeft];
    }
    _layoutBoxInPage(anchor, width, height, ctx) {
        const aboveTop = anchor.top - height;
        const belowTop = anchor.top + anchor.height;
        const domNodePosition = dom.getDomNodePagePosition(this._viewDomNode.domNode);
        const elDocument = this._viewDomNode.domNode.ownerDocument;
        const elWindow = elDocument.defaultView;
        const absoluteAboveTop = domNodePosition.top + aboveTop - (elWindow?.scrollY ?? 0);
        const absoluteBelowTop = domNodePosition.top + belowTop - (elWindow?.scrollY ?? 0);
        const windowSize = dom.getClientArea(elDocument.body);
        const [left, absoluteAboveLeft] = this._layoutHorizontalSegmentInPage(windowSize, domNodePosition, anchor.left - ctx.scrollLeft + this._contentLeft, width);
        // Leave some clearance to the top/bottom
        const TOP_PADDING = 22;
        const BOTTOM_PADDING = 22;
        const fitsAbove = (absoluteAboveTop >= TOP_PADDING);
        const fitsBelow = (absoluteBelowTop + height <= windowSize.height - BOTTOM_PADDING);
        if (this._fixedOverflowWidgets) {
            return {
                fitsAbove,
                aboveTop: Math.max(absoluteAboveTop, TOP_PADDING),
                fitsBelow,
                belowTop: absoluteBelowTop,
                left: absoluteAboveLeft
            };
        }
        return { fitsAbove, aboveTop, fitsBelow, belowTop, left };
    }
    _prepareRenderWidgetAtExactPositionOverflowing(topLeft) {
        return new Coordinate(topLeft.top, topLeft.left + this._contentLeft);
    }
    /**
     * Compute the coordinates above and below the primary and secondary anchors.
     * The content widget *must* touch the primary anchor.
     * The content widget should touch if possible the secondary anchor.
     */
    _getAnchorsCoordinates(ctx) {
        const primary = getCoordinates(this._primaryAnchor.viewPosition, this._affinity);
        const secondaryViewPosition = (this._secondaryAnchor.viewPosition?.lineNumber === this._primaryAnchor.viewPosition?.lineNumber ? this._secondaryAnchor.viewPosition : null);
        const secondary = getCoordinates(secondaryViewPosition, this._affinity);
        return { primary, secondary };
        function getCoordinates(position, affinity) {
            if (!position) {
                return null;
            }
            const horizontalPosition = ctx.visibleRangeForPosition(position);
            if (!horizontalPosition) {
                return null;
            }
            // Left-align widgets that should appear :before content
            const left = (position.column === 1 && affinity === 3 /* PositionAffinity.LeftOfInjectedText */ ? 0 : horizontalPosition.left);
            const top = ctx.getVerticalOffsetForLineNumber(position.lineNumber) - ctx.scrollTop;
            const lineHeight = ctx.getLineHeightForLineNumber(position.lineNumber);
            return new AnchorCoordinate(top, left, lineHeight);
        }
    }
    _reduceAnchorCoordinates(primary, secondary, width) {
        if (!secondary) {
            return primary;
        }
        const fontInfo = this._context.configuration.options.get(59 /* EditorOption.fontInfo */);
        let left = secondary.left;
        if (left < primary.left) {
            left = Math.max(left, primary.left - width + fontInfo.typicalFullwidthCharacterWidth);
        }
        else {
            left = Math.min(left, primary.left + width - fontInfo.typicalFullwidthCharacterWidth);
        }
        return new AnchorCoordinate(primary.top, left, primary.height);
    }
    _prepareRenderWidget(ctx) {
        if (!this._preference || this._preference.length === 0) {
            return null;
        }
        const { primary, secondary } = this._getAnchorsCoordinates(ctx);
        if (!primary) {
            return {
                kind: 'offViewport',
                preserveFocus: this.domNode.domNode.contains(this.domNode.domNode.ownerDocument.activeElement)
            };
            // return null;
        }
        if (this._cachedDomNodeOffsetWidth === -1 || this._cachedDomNodeOffsetHeight === -1) {
            let preferredDimensions = null;
            if (typeof this._actual.beforeRender === 'function') {
                preferredDimensions = safeInvoke(this._actual.beforeRender, this._actual);
            }
            if (preferredDimensions) {
                this._cachedDomNodeOffsetWidth = preferredDimensions.width;
                this._cachedDomNodeOffsetHeight = preferredDimensions.height;
            }
            else {
                const domNode = this.domNode.domNode;
                const clientRect = domNode.getBoundingClientRect();
                this._cachedDomNodeOffsetWidth = Math.round(clientRect.width);
                this._cachedDomNodeOffsetHeight = Math.round(clientRect.height);
            }
        }
        const anchor = this._reduceAnchorCoordinates(primary, secondary, this._cachedDomNodeOffsetWidth);
        let placement;
        if (this.allowEditorOverflow) {
            placement = this._layoutBoxInPage(anchor, this._cachedDomNodeOffsetWidth, this._cachedDomNodeOffsetHeight, ctx);
        }
        else {
            placement = this._layoutBoxInViewport(anchor, this._cachedDomNodeOffsetWidth, this._cachedDomNodeOffsetHeight, ctx);
        }
        // Do two passes, first for perfect fit, second picks first option
        for (let pass = 1; pass <= 2; pass++) {
            for (const pref of this._preference) {
                // placement
                if (pref === 1 /* ContentWidgetPositionPreference.ABOVE */) {
                    if (!placement) {
                        // Widget outside of viewport
                        return null;
                    }
                    if (pass === 2 || placement.fitsAbove) {
                        return {
                            kind: 'inViewport',
                            coordinate: new Coordinate(placement.aboveTop, placement.left),
                            position: 1 /* ContentWidgetPositionPreference.ABOVE */
                        };
                    }
                }
                else if (pref === 2 /* ContentWidgetPositionPreference.BELOW */) {
                    if (!placement) {
                        // Widget outside of viewport
                        return null;
                    }
                    if (pass === 2 || placement.fitsBelow) {
                        return {
                            kind: 'inViewport',
                            coordinate: new Coordinate(placement.belowTop, placement.left),
                            position: 2 /* ContentWidgetPositionPreference.BELOW */
                        };
                    }
                }
                else {
                    if (this.allowEditorOverflow) {
                        return {
                            kind: 'inViewport',
                            coordinate: this._prepareRenderWidgetAtExactPositionOverflowing(new Coordinate(anchor.top, anchor.left)),
                            position: 0 /* ContentWidgetPositionPreference.EXACT */
                        };
                    }
                    else {
                        return {
                            kind: 'inViewport',
                            coordinate: new Coordinate(anchor.top, anchor.left),
                            position: 0 /* ContentWidgetPositionPreference.EXACT */
                        };
                    }
                }
            }
        }
        return null;
    }
    /**
     * On this first pass, we ensure that the content widget (if it is in the viewport) has the max width set correctly.
     */
    onBeforeRender(viewportData) {
        if (!this._primaryAnchor.viewPosition || !this._preference) {
            return;
        }
        if (this._primaryAnchor.viewPosition.lineNumber < viewportData.startLineNumber || this._primaryAnchor.viewPosition.lineNumber > viewportData.endLineNumber) {
            // Outside of viewport
            return;
        }
        this.domNode.setMaxWidth(this._maxWidth);
    }
    prepareRender(ctx) {
        this._renderData = this._prepareRenderWidget(ctx);
    }
    render(ctx) {
        if (!this._renderData || this._renderData.kind === 'offViewport') {
            // This widget should be invisible
            if (this._isVisible) {
                this.domNode.removeAttribute('monaco-visible-content-widget');
                this._isVisible = false;
                if (this._renderData?.kind === 'offViewport' && this._renderData.preserveFocus) {
                    // widget wants to be shown, but it is outside of the viewport and it
                    // has focus which we need to preserve
                    this.domNode.setTop(-1000);
                }
                else {
                    this.domNode.setVisibility('hidden');
                }
            }
            if (typeof this._actual.afterRender === 'function') {
                safeInvoke(this._actual.afterRender, this._actual, null, null);
            }
            return;
        }
        // This widget should be visible
        if (this.allowEditorOverflow) {
            this.domNode.setTop(this._renderData.coordinate.top);
            this.domNode.setLeft(this._renderData.coordinate.left);
        }
        else {
            this.domNode.setTop(this._renderData.coordinate.top + ctx.scrollTop - ctx.bigNumbersDelta);
            this.domNode.setLeft(this._renderData.coordinate.left);
        }
        if (!this._isVisible) {
            this.domNode.setVisibility('inherit');
            this.domNode.setAttribute('monaco-visible-content-widget', 'true');
            this._isVisible = true;
        }
        if (typeof this._actual.afterRender === 'function') {
            safeInvoke(this._actual.afterRender, this._actual, this._renderData.position, this._renderData.coordinate);
        }
    }
}
class PositionPair {
    constructor(modelPosition, viewPosition) {
        this.modelPosition = modelPosition;
        this.viewPosition = viewPosition;
    }
}
class Coordinate {
    constructor(top, left) {
        this.top = top;
        this.left = left;
        this._coordinateBrand = undefined;
    }
}
class AnchorCoordinate {
    constructor(top, left, height) {
        this.top = top;
        this.left = left;
        this.height = height;
        this._anchorCoordinateBrand = undefined;
    }
}
function safeInvoke(fn, thisArg, ...args) {
    try {
        return fn.call(thisArg, ...args);
    }
    catch {
        // ignore
        return null;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29udGVudFdpZGdldHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9hZHZpa2FyL0RvY3VtZW50cy9hcmNoaXRlY3QvYXJjaDIvQXJjaElERS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvYnJvd3Nlci92aWV3UGFydHMvY29udGVudFdpZGdldHMvY29udGVudFdpZGdldHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxpQ0FBaUMsQ0FBQztBQUN2RCxPQUFPLEVBQWUsaUJBQWlCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUV6RixPQUFPLEVBQW1CLGdCQUFnQixFQUFFLFFBQVEsRUFBRSxNQUFNLHdCQUF3QixDQUFDO0FBV3JGOzs7O0dBSUc7QUFDSCxNQUFNLE9BQU8sa0JBQW1CLFNBQVEsUUFBUTtJQVEvQyxZQUFZLE9BQW9CLEVBQUUsV0FBcUM7UUFDdEUsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQ2YsSUFBSSxDQUFDLFlBQVksR0FBRyxXQUFXLENBQUM7UUFDaEMsSUFBSSxDQUFDLFFBQVEsR0FBRyxFQUFFLENBQUM7UUFFbkIsSUFBSSxDQUFDLE9BQU8sR0FBRyxpQkFBaUIsQ0FBQyxRQUFRLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7UUFDaEUsZ0JBQWdCLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxPQUFPLHlDQUFpQyxDQUFDO1FBQ3JFLElBQUksQ0FBQyxPQUFPLENBQUMsWUFBWSxDQUFDLGdCQUFnQixDQUFDLENBQUM7UUFDNUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsVUFBVSxDQUFDLENBQUM7UUFDckMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFdkIsSUFBSSxDQUFDLGdDQUFnQyxHQUFHLGlCQUFpQixDQUFDLFFBQVEsQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztRQUN6RixnQkFBZ0IsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLGdDQUFnQyxvREFBNEMsQ0FBQztRQUN6RyxJQUFJLENBQUMsZ0NBQWdDLENBQUMsWUFBWSxDQUFDLDJCQUEyQixDQUFDLENBQUM7SUFDakYsQ0FBQztJQUVlLE9BQU87UUFDdEIsS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQ2hCLElBQUksQ0FBQyxRQUFRLEdBQUcsRUFBRSxDQUFDO0lBQ3BCLENBQUM7SUFFRCwyQkFBMkI7SUFFWCxzQkFBc0IsQ0FBQyxDQUEyQztRQUNqRixNQUFNLElBQUksR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUN4QyxLQUFLLE1BQU0sUUFBUSxJQUFJLElBQUksRUFBRSxDQUFDO1lBQzdCLElBQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLENBQUMsc0JBQXNCLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDbkQsQ0FBQztRQUNELE9BQU8sSUFBSSxDQUFDO0lBQ2IsQ0FBQztJQUNlLG9CQUFvQixDQUFDLENBQXlDO1FBQzdFLCtEQUErRDtRQUMvRCxPQUFPLElBQUksQ0FBQztJQUNiLENBQUM7SUFDZSxTQUFTLENBQUMsQ0FBOEI7UUFDdkQsT0FBTyxJQUFJLENBQUM7SUFDYixDQUFDO0lBQ2Usb0JBQW9CLENBQUMsQ0FBeUM7UUFDN0UsSUFBSSxDQUFDLDJCQUEyQixFQUFFLENBQUM7UUFDbkMsT0FBTyxJQUFJLENBQUM7SUFDYixDQUFDO0lBQ2UsY0FBYyxDQUFDLENBQW1DO1FBQ2pFLElBQUksQ0FBQywyQkFBMkIsRUFBRSxDQUFDO1FBQ25DLE9BQU8sSUFBSSxDQUFDO0lBQ2IsQ0FBQztJQUNlLGNBQWMsQ0FBQyxDQUFtQztRQUNqRSxJQUFJLENBQUMsMkJBQTJCLEVBQUUsQ0FBQztRQUNuQyxPQUFPLElBQUksQ0FBQztJQUNiLENBQUM7SUFDZSxlQUFlLENBQUMsQ0FBb0M7UUFDbkUsSUFBSSxDQUFDLDJCQUEyQixFQUFFLENBQUM7UUFDbkMsT0FBTyxJQUFJLENBQUM7SUFDYixDQUFDO0lBQ2UsZUFBZSxDQUFDLENBQW9DO1FBQ25FLE9BQU8sSUFBSSxDQUFDO0lBQ2IsQ0FBQztJQUNlLGNBQWMsQ0FBQyxDQUFtQztRQUNqRSxPQUFPLElBQUksQ0FBQztJQUNiLENBQUM7SUFFRCwrQkFBK0I7SUFFdkIsMkJBQTJCO1FBQ2xDLE1BQU0sSUFBSSxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQ3hDLEtBQUssTUFBTSxRQUFRLElBQUksSUFBSSxFQUFFLENBQUM7WUFDN0IsSUFBSSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsQ0FBQyx3QkFBd0IsRUFBRSxDQUFDO1FBQ3BELENBQUM7SUFDRixDQUFDO0lBRU0sU0FBUyxDQUFDLE9BQXVCO1FBQ3ZDLE1BQU0sUUFBUSxHQUFHLElBQUksTUFBTSxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLFlBQVksRUFBRSxPQUFPLENBQUMsQ0FBQztRQUN2RSxJQUFJLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsR0FBRyxRQUFRLENBQUM7UUFFdEMsSUFBSSxRQUFRLENBQUMsbUJBQW1CLEVBQUUsQ0FBQztZQUNsQyxJQUFJLENBQUMsZ0NBQWdDLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUNyRSxDQUFDO2FBQU0sQ0FBQztZQUNQLElBQUksQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUM1QyxDQUFDO1FBRUQsSUFBSSxDQUFDLGVBQWUsRUFBRSxDQUFDO0lBQ3hCLENBQUM7SUFFTSxpQkFBaUIsQ0FBQyxNQUFzQixFQUFFLGFBQStCLEVBQUUsZUFBaUMsRUFBRSxVQUFvRCxFQUFFLFFBQWlDO1FBQzNNLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUM7UUFDL0MsUUFBUSxDQUFDLFdBQVcsQ0FBQyxhQUFhLEVBQUUsZUFBZSxFQUFFLFVBQVUsRUFBRSxRQUFRLENBQUMsQ0FBQztRQUUzRSxJQUFJLENBQUMsZUFBZSxFQUFFLENBQUM7SUFDeEIsQ0FBQztJQUVNLFlBQVksQ0FBQyxNQUFzQjtRQUN6QyxNQUFNLFFBQVEsR0FBRyxNQUFNLENBQUMsS0FBSyxFQUFFLENBQUM7UUFDaEMsSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLGNBQWMsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDO1lBQzVDLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLENBQUM7WUFDekMsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBRS9CLE1BQU0sT0FBTyxHQUFHLFFBQVEsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDO1lBQ3pDLE9BQU8sQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUNqQixPQUFPLENBQUMsZUFBZSxDQUFDLCtCQUErQixDQUFDLENBQUM7WUFFekQsSUFBSSxDQUFDLGVBQWUsRUFBRSxDQUFDO1FBQ3hCLENBQUM7SUFDRixDQUFDO0lBRU0sK0JBQStCLENBQUMsUUFBZ0I7UUFDdEQsSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLGNBQWMsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDO1lBQzVDLE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsQ0FBQyxpQkFBaUIsQ0FBQztRQUNsRCxDQUFDO1FBQ0QsT0FBTyxLQUFLLENBQUM7SUFDZCxDQUFDO0lBRU0sY0FBYyxDQUFDLFlBQTBCO1FBQy9DLE1BQU0sSUFBSSxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQ3hDLEtBQUssTUFBTSxRQUFRLElBQUksSUFBSSxFQUFFLENBQUM7WUFDN0IsSUFBSSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsQ0FBQyxjQUFjLENBQUMsWUFBWSxDQUFDLENBQUM7UUFDdEQsQ0FBQztJQUNGLENBQUM7SUFFTSxhQUFhLENBQUMsR0FBcUI7UUFDekMsTUFBTSxJQUFJLEdBQUcsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDeEMsS0FBSyxNQUFNLFFBQVEsSUFBSSxJQUFJLEVBQUUsQ0FBQztZQUM3QixJQUFJLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUM1QyxDQUFDO0lBQ0YsQ0FBQztJQUVNLE1BQU0sQ0FBQyxHQUErQjtRQUM1QyxNQUFNLElBQUksR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUN4QyxLQUFLLE1BQU0sUUFBUSxJQUFJLElBQUksRUFBRSxDQUFDO1lBQzdCLElBQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ3JDLENBQUM7SUFDRixDQUFDO0NBQ0Q7QUF5QkQsTUFBTSxNQUFNO0lBeUJYLFlBQVksT0FBb0IsRUFBRSxXQUFxQyxFQUFFLE1BQXNCO1FBWHZGLG1CQUFjLEdBQWlCLElBQUksWUFBWSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztRQUM1RCxxQkFBZ0IsR0FBaUIsSUFBSSxZQUFZLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO1FBV3JFLElBQUksQ0FBQyxRQUFRLEdBQUcsT0FBTyxDQUFDO1FBQ3hCLElBQUksQ0FBQyxZQUFZLEdBQUcsV0FBVyxDQUFDO1FBQ2hDLElBQUksQ0FBQyxPQUFPLEdBQUcsTUFBTSxDQUFDO1FBRXRCLE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQztRQUNwRCxNQUFNLFVBQVUsR0FBRyxPQUFPLENBQUMsR0FBRyxtQ0FBeUIsQ0FBQztRQUN4RCxNQUFNLGFBQWEsR0FBRyxPQUFPLENBQUMsR0FBRyxvQ0FBNEIsQ0FBQztRQUU5RCxJQUFJLENBQUMsT0FBTyxHQUFHLGlCQUFpQixDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsVUFBVSxFQUFFLENBQUMsQ0FBQztRQUM1RCxJQUFJLENBQUMsRUFBRSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLENBQUM7UUFDL0IsSUFBSSxDQUFDLG1CQUFtQixHQUFHLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxtQkFBbUIsSUFBSSxLQUFLLENBQUMsSUFBSSxhQUFhLENBQUM7UUFDeEYsSUFBSSxDQUFDLGlCQUFpQixHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsaUJBQWlCLElBQUksS0FBSyxDQUFDO1FBRWpFLElBQUksQ0FBQyxxQkFBcUIsR0FBRyxPQUFPLENBQUMsR0FBRyw0Q0FBbUMsQ0FBQztRQUM1RSxJQUFJLENBQUMsYUFBYSxHQUFHLFVBQVUsQ0FBQyxZQUFZLENBQUM7UUFDN0MsSUFBSSxDQUFDLFlBQVksR0FBRyxVQUFVLENBQUMsV0FBVyxDQUFDO1FBRTNDLElBQUksQ0FBQyxTQUFTLEdBQUcsSUFBSSxDQUFDO1FBQ3RCLElBQUksQ0FBQyxXQUFXLEdBQUcsRUFBRSxDQUFDO1FBQ3RCLElBQUksQ0FBQyx5QkFBeUIsR0FBRyxDQUFDLENBQUMsQ0FBQztRQUNwQyxJQUFJLENBQUMsMEJBQTBCLEdBQUcsQ0FBQyxDQUFDLENBQUM7UUFDckMsSUFBSSxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUM7UUFDckMsSUFBSSxDQUFDLFVBQVUsR0FBRyxLQUFLLENBQUM7UUFDeEIsSUFBSSxDQUFDLFdBQVcsR0FBRyxJQUFJLENBQUM7UUFFeEIsSUFBSSxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsQ0FBQyxJQUFJLENBQUMscUJBQXFCLElBQUksSUFBSSxDQUFDLG1CQUFtQixDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUM7UUFDMUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDaEMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxhQUFhLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDckMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUMsVUFBVSxFQUFFLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUMvQyxJQUFJLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUM7SUFDMUMsQ0FBQztJQUVNLHNCQUFzQixDQUFDLENBQTJDO1FBQ3hFLE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQztRQUNwRCxJQUFJLENBQUMsQ0FBQyxVQUFVLG1DQUF5QixFQUFFLENBQUM7WUFDM0MsTUFBTSxVQUFVLEdBQUcsT0FBTyxDQUFDLEdBQUcsbUNBQXlCLENBQUM7WUFDeEQsSUFBSSxDQUFDLFlBQVksR0FBRyxVQUFVLENBQUMsV0FBVyxDQUFDO1lBQzNDLElBQUksQ0FBQyxhQUFhLEdBQUcsVUFBVSxDQUFDLFlBQVksQ0FBQztZQUM3QyxJQUFJLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQztRQUN0QyxDQUFDO0lBQ0YsQ0FBQztJQUVNLHdCQUF3QjtRQUM5QixJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsSUFBSSxDQUFDLGNBQWMsQ0FBQyxhQUFhLEVBQUUsSUFBSSxDQUFDLGdCQUFnQixDQUFDLGFBQWEsQ0FBQyxDQUFDO0lBQzNHLENBQUM7SUFFTyxZQUFZLENBQUMsUUFBaUMsRUFBRSxhQUErQixFQUFFLGVBQWlDO1FBQ3pILElBQUksQ0FBQyxTQUFTLEdBQUcsUUFBUSxDQUFDO1FBQzFCLElBQUksQ0FBQyxjQUFjLEdBQUcsb0JBQW9CLENBQUMsYUFBYSxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsU0FBUyxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUNuRyxJQUFJLENBQUMsZ0JBQWdCLEdBQUcsb0JBQW9CLENBQUMsZUFBZSxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsU0FBUyxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUV2RyxTQUFTLG9CQUFvQixDQUFDLFFBQTBCLEVBQUUsU0FBcUIsRUFBRSxRQUFpQztZQUNqSCxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7Z0JBQ2YsT0FBTyxJQUFJLFlBQVksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7WUFDckMsQ0FBQztZQUNELGtEQUFrRDtZQUNsRCxNQUFNLGtCQUFrQixHQUFHLFNBQVMsQ0FBQyxLQUFLLENBQUMsZ0JBQWdCLENBQUMsUUFBUSxDQUFDLENBQUM7WUFDdEUsSUFBSSxTQUFTLENBQUMsb0JBQW9CLENBQUMsc0JBQXNCLENBQUMsa0JBQWtCLENBQUMsRUFBRSxDQUFDO2dCQUMvRSxNQUFNLFlBQVksR0FBRyxTQUFTLENBQUMsb0JBQW9CLENBQUMsa0NBQWtDLENBQUMsa0JBQWtCLEVBQUUsUUFBUSxJQUFJLFNBQVMsQ0FBQyxDQUFDO2dCQUNsSSxPQUFPLElBQUksWUFBWSxDQUFDLFFBQVEsRUFBRSxZQUFZLENBQUMsQ0FBQztZQUNqRCxDQUFDO1lBQ0QsT0FBTyxJQUFJLFlBQVksQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDekMsQ0FBQztJQUNGLENBQUM7SUFFTyxZQUFZO1FBQ25CLE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLGFBQWEsQ0FBQztRQUN0RCxNQUFNLFFBQVEsR0FBRyxVQUFVLENBQUMsV0FBVyxDQUFDO1FBQ3hDLE9BQU8sQ0FDTixJQUFJLENBQUMsbUJBQW1CO1lBQ3ZCLENBQUMsQ0FBQyxRQUFRLEVBQUUsVUFBVSxJQUFJLFVBQVUsQ0FBQyxlQUFlLENBQUMsV0FBVyxJQUFJLFVBQVUsQ0FBQyxJQUFJLENBQUMsV0FBVztZQUMvRixDQUFDLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FDckIsQ0FBQztJQUNILENBQUM7SUFFTSxXQUFXLENBQUMsYUFBK0IsRUFBRSxlQUFpQyxFQUFFLFVBQW9ELEVBQUUsUUFBaUM7UUFDN0ssSUFBSSxDQUFDLFlBQVksQ0FBQyxRQUFRLEVBQUUsYUFBYSxFQUFFLGVBQWUsQ0FBQyxDQUFDO1FBQzVELElBQUksQ0FBQyxXQUFXLEdBQUcsVUFBVSxDQUFDO1FBQzlCLElBQUksSUFBSSxDQUFDLGNBQWMsQ0FBQyxZQUFZLElBQUksSUFBSSxDQUFDLFdBQVcsSUFBSSxJQUFJLENBQUMsV0FBVyxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQztZQUN6RiwyREFBMkQ7WUFDM0QsaUVBQWlFO1lBQ2pFLGtFQUFrRTtZQUNsRSxxQkFBcUI7WUFDckIsSUFBSSxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDbEMsQ0FBQzthQUFNLENBQUM7WUFDUCxJQUFJLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUNqQyxDQUFDO1FBQ0QsSUFBSSxDQUFDLHlCQUF5QixHQUFHLENBQUMsQ0FBQyxDQUFDO1FBQ3BDLElBQUksQ0FBQywwQkFBMEIsR0FBRyxDQUFDLENBQUMsQ0FBQztJQUN0QyxDQUFDO0lBRU8sb0JBQW9CLENBQUMsTUFBd0IsRUFBRSxLQUFhLEVBQUUsTUFBYyxFQUFFLEdBQXFCO1FBQzFHLHVFQUF1RTtRQUV2RSw0QkFBNEI7UUFDNUIsTUFBTSxZQUFZLEdBQUcsTUFBTSxDQUFDLEdBQUcsQ0FBQztRQUNoQyxNQUFNLHdCQUF3QixHQUFHLFlBQVksQ0FBQztRQUU5Qyw0QkFBNEI7UUFDNUIsTUFBTSxZQUFZLEdBQUcsTUFBTSxDQUFDLEdBQUcsR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDO1FBQ2hELE1BQU0sd0JBQXdCLEdBQUcsR0FBRyxDQUFDLGNBQWMsR0FBRyxZQUFZLENBQUM7UUFFbkUsTUFBTSxRQUFRLEdBQUcsWUFBWSxHQUFHLE1BQU0sQ0FBQztRQUN2QyxNQUFNLFNBQVMsR0FBRyxDQUFDLHdCQUF3QixJQUFJLE1BQU0sQ0FBQyxDQUFDO1FBQ3ZELE1BQU0sUUFBUSxHQUFHLFlBQVksQ0FBQztRQUM5QixNQUFNLFNBQVMsR0FBRyxDQUFDLHdCQUF3QixJQUFJLE1BQU0sQ0FBQyxDQUFDO1FBRXZELGVBQWU7UUFDZixJQUFJLElBQUksR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDO1FBQ3ZCLElBQUksSUFBSSxHQUFHLEtBQUssR0FBRyxHQUFHLENBQUMsVUFBVSxHQUFHLEdBQUcsQ0FBQyxhQUFhLEVBQUUsQ0FBQztZQUN2RCxJQUFJLEdBQUcsR0FBRyxDQUFDLFVBQVUsR0FBRyxHQUFHLENBQUMsYUFBYSxHQUFHLEtBQUssQ0FBQztRQUNuRCxDQUFDO1FBQ0QsSUFBSSxJQUFJLEdBQUcsR0FBRyxDQUFDLFVBQVUsRUFBRSxDQUFDO1lBQzNCLElBQUksR0FBRyxHQUFHLENBQUMsVUFBVSxDQUFDO1FBQ3ZCLENBQUM7UUFFRCxPQUFPLEVBQUUsU0FBUyxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRSxDQUFDO0lBQzNELENBQUM7SUFFTyw4QkFBOEIsQ0FBQyxVQUF5QixFQUFFLGVBQXlDLEVBQUUsSUFBWSxFQUFFLEtBQWE7UUFDdkkseUNBQXlDO1FBQ3pDLE1BQU0sWUFBWSxHQUFHLEVBQUUsQ0FBQztRQUN4QixNQUFNLGFBQWEsR0FBRyxFQUFFLENBQUM7UUFFekIsMkRBQTJEO1FBQzNELE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsWUFBWSxFQUFFLGVBQWUsQ0FBQyxJQUFJLEdBQUcsS0FBSyxDQUFDLENBQUM7UUFDdkUsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxlQUFlLENBQUMsSUFBSSxHQUFHLGVBQWUsQ0FBQyxLQUFLLEdBQUcsS0FBSyxFQUFFLFVBQVUsQ0FBQyxLQUFLLEdBQUcsYUFBYSxDQUFDLENBQUM7UUFFbkgsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxPQUFPLENBQUMsYUFBYSxDQUFDO1FBQzNELE1BQU0sUUFBUSxHQUFHLFVBQVUsQ0FBQyxXQUFXLENBQUM7UUFDeEMsSUFBSSxZQUFZLEdBQUcsZUFBZSxDQUFDLElBQUksR0FBRyxJQUFJLEdBQUcsQ0FBQyxRQUFRLEVBQUUsT0FBTyxJQUFJLENBQUMsQ0FBQyxDQUFDO1FBRTFFLElBQUksWUFBWSxHQUFHLEtBQUssR0FBRyxTQUFTLEVBQUUsQ0FBQztZQUN0QyxNQUFNLEtBQUssR0FBRyxZQUFZLEdBQUcsQ0FBQyxTQUFTLEdBQUcsS0FBSyxDQUFDLENBQUM7WUFDakQsWUFBWSxJQUFJLEtBQUssQ0FBQztZQUN0QixJQUFJLElBQUksS0FBSyxDQUFDO1FBQ2YsQ0FBQztRQUVELElBQUksWUFBWSxHQUFHLFNBQVMsRUFBRSxDQUFDO1lBQzlCLE1BQU0sS0FBSyxHQUFHLFlBQVksR0FBRyxTQUFTLENBQUM7WUFDdkMsWUFBWSxJQUFJLEtBQUssQ0FBQztZQUN0QixJQUFJLElBQUksS0FBSyxDQUFDO1FBQ2YsQ0FBQztRQUVELE9BQU8sQ0FBQyxJQUFJLEVBQUUsWUFBWSxDQUFDLENBQUM7SUFDN0IsQ0FBQztJQUVPLGdCQUFnQixDQUFDLE1BQXdCLEVBQUUsS0FBYSxFQUFFLE1BQWMsRUFBRSxHQUFxQjtRQUN0RyxNQUFNLFFBQVEsR0FBRyxNQUFNLENBQUMsR0FBRyxHQUFHLE1BQU0sQ0FBQztRQUNyQyxNQUFNLFFBQVEsR0FBRyxNQUFNLENBQUMsR0FBRyxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUM7UUFFNUMsTUFBTSxlQUFlLEdBQUcsR0FBRyxDQUFDLHNCQUFzQixDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDOUUsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxPQUFPLENBQUMsYUFBYSxDQUFDO1FBQzNELE1BQU0sUUFBUSxHQUFHLFVBQVUsQ0FBQyxXQUFXLENBQUM7UUFDeEMsTUFBTSxnQkFBZ0IsR0FBRyxlQUFlLENBQUMsR0FBRyxHQUFHLFFBQVEsR0FBRyxDQUFDLFFBQVEsRUFBRSxPQUFPLElBQUksQ0FBQyxDQUFDLENBQUM7UUFDbkYsTUFBTSxnQkFBZ0IsR0FBRyxlQUFlLENBQUMsR0FBRyxHQUFHLFFBQVEsR0FBRyxDQUFDLFFBQVEsRUFBRSxPQUFPLElBQUksQ0FBQyxDQUFDLENBQUM7UUFFbkYsTUFBTSxVQUFVLEdBQUcsR0FBRyxDQUFDLGFBQWEsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDdEQsTUFBTSxDQUFDLElBQUksRUFBRSxpQkFBaUIsQ0FBQyxHQUFHLElBQUksQ0FBQyw4QkFBOEIsQ0FBQyxVQUFVLEVBQUUsZUFBZSxFQUFFLE1BQU0sQ0FBQyxJQUFJLEdBQUcsR0FBRyxDQUFDLFVBQVUsR0FBRyxJQUFJLENBQUMsWUFBWSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBRTVKLHlDQUF5QztRQUN6QyxNQUFNLFdBQVcsR0FBRyxFQUFFLENBQUM7UUFDdkIsTUFBTSxjQUFjLEdBQUcsRUFBRSxDQUFDO1FBRTFCLE1BQU0sU0FBUyxHQUFHLENBQUMsZ0JBQWdCLElBQUksV0FBVyxDQUFDLENBQUM7UUFDcEQsTUFBTSxTQUFTLEdBQUcsQ0FBQyxnQkFBZ0IsR0FBRyxNQUFNLElBQUksVUFBVSxDQUFDLE1BQU0sR0FBRyxjQUFjLENBQUMsQ0FBQztRQUVwRixJQUFJLElBQUksQ0FBQyxxQkFBcUIsRUFBRSxDQUFDO1lBQ2hDLE9BQU87Z0JBQ04sU0FBUztnQkFDVCxRQUFRLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxnQkFBZ0IsRUFBRSxXQUFXLENBQUM7Z0JBQ2pELFNBQVM7Z0JBQ1QsUUFBUSxFQUFFLGdCQUFnQjtnQkFDMUIsSUFBSSxFQUFFLGlCQUFpQjthQUN2QixDQUFDO1FBQ0gsQ0FBQztRQUVELE9BQU8sRUFBRSxTQUFTLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFLENBQUM7SUFDM0QsQ0FBQztJQUVPLDhDQUE4QyxDQUFDLE9BQW1CO1FBQ3pFLE9BQU8sSUFBSSxVQUFVLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxPQUFPLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQztJQUN0RSxDQUFDO0lBRUQ7Ozs7T0FJRztJQUNLLHNCQUFzQixDQUFDLEdBQXFCO1FBQ25ELE1BQU0sT0FBTyxHQUFHLGNBQWMsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLFlBQVksRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDakYsTUFBTSxxQkFBcUIsR0FBRyxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxZQUFZLEVBQUUsVUFBVSxLQUFLLElBQUksQ0FBQyxjQUFjLENBQUMsWUFBWSxFQUFFLFVBQVUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDNUssTUFBTSxTQUFTLEdBQUcsY0FBYyxDQUFDLHFCQUFxQixFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUN4RSxPQUFPLEVBQUUsT0FBTyxFQUFFLFNBQVMsRUFBRSxDQUFDO1FBRTlCLFNBQVMsY0FBYyxDQUFDLFFBQXlCLEVBQUUsUUFBaUM7WUFDbkYsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO2dCQUNmLE9BQU8sSUFBSSxDQUFDO1lBQ2IsQ0FBQztZQUVELE1BQU0sa0JBQWtCLEdBQUcsR0FBRyxDQUFDLHVCQUF1QixDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBQ2pFLElBQUksQ0FBQyxrQkFBa0IsRUFBRSxDQUFDO2dCQUN6QixPQUFPLElBQUksQ0FBQztZQUNiLENBQUM7WUFFRCx3REFBd0Q7WUFDeEQsTUFBTSxJQUFJLEdBQUcsQ0FBQyxRQUFRLENBQUMsTUFBTSxLQUFLLENBQUMsSUFBSSxRQUFRLGdEQUF3QyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLGtCQUFrQixDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ3ZILE1BQU0sR0FBRyxHQUFHLEdBQUcsQ0FBQyw4QkFBOEIsQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLEdBQUcsR0FBRyxDQUFDLFNBQVMsQ0FBQztZQUNwRixNQUFNLFVBQVUsR0FBRyxHQUFHLENBQUMsMEJBQTBCLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxDQUFDO1lBQ3ZFLE9BQU8sSUFBSSxnQkFBZ0IsQ0FBQyxHQUFHLEVBQUUsSUFBSSxFQUFFLFVBQVUsQ0FBQyxDQUFDO1FBQ3BELENBQUM7SUFDRixDQUFDO0lBRU8sd0JBQXdCLENBQUMsT0FBeUIsRUFBRSxTQUFrQyxFQUFFLEtBQWE7UUFDNUcsSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDO1lBQ2hCLE9BQU8sT0FBTyxDQUFDO1FBQ2hCLENBQUM7UUFFRCxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUMsR0FBRyxnQ0FBdUIsQ0FBQztRQUVoRixJQUFJLElBQUksR0FBRyxTQUFTLENBQUMsSUFBSSxDQUFDO1FBQzFCLElBQUksSUFBSSxHQUFHLE9BQU8sQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUN6QixJQUFJLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsT0FBTyxDQUFDLElBQUksR0FBRyxLQUFLLEdBQUcsUUFBUSxDQUFDLDhCQUE4QixDQUFDLENBQUM7UUFDdkYsQ0FBQzthQUFNLENBQUM7WUFDUCxJQUFJLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsT0FBTyxDQUFDLElBQUksR0FBRyxLQUFLLEdBQUcsUUFBUSxDQUFDLDhCQUE4QixDQUFDLENBQUM7UUFDdkYsQ0FBQztRQUNELE9BQU8sSUFBSSxnQkFBZ0IsQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLElBQUksRUFBRSxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUM7SUFDaEUsQ0FBQztJQUVPLG9CQUFvQixDQUFDLEdBQXFCO1FBQ2pELElBQUksQ0FBQyxJQUFJLENBQUMsV0FBVyxJQUFJLElBQUksQ0FBQyxXQUFXLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQ3hELE9BQU8sSUFBSSxDQUFDO1FBQ2IsQ0FBQztRQUVELE1BQU0sRUFBRSxPQUFPLEVBQUUsU0FBUyxFQUFFLEdBQUcsSUFBSSxDQUFDLHNCQUFzQixDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ2hFLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUNkLE9BQU87Z0JBQ04sSUFBSSxFQUFFLGFBQWE7Z0JBQ25CLGFBQWEsRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsYUFBYSxDQUFDLGFBQWEsQ0FBQzthQUM5RixDQUFDO1lBQ0YsZUFBZTtRQUNoQixDQUFDO1FBRUQsSUFBSSxJQUFJLENBQUMseUJBQXlCLEtBQUssQ0FBQyxDQUFDLElBQUksSUFBSSxDQUFDLDBCQUEwQixLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUM7WUFFckYsSUFBSSxtQkFBbUIsR0FBc0IsSUFBSSxDQUFDO1lBQ2xELElBQUksT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLFlBQVksS0FBSyxVQUFVLEVBQUUsQ0FBQztnQkFDckQsbUJBQW1CLEdBQUcsVUFBVSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsWUFBWSxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUMzRSxDQUFDO1lBQ0QsSUFBSSxtQkFBbUIsRUFBRSxDQUFDO2dCQUN6QixJQUFJLENBQUMseUJBQXlCLEdBQUcsbUJBQW1CLENBQUMsS0FBSyxDQUFDO2dCQUMzRCxJQUFJLENBQUMsMEJBQTBCLEdBQUcsbUJBQW1CLENBQUMsTUFBTSxDQUFDO1lBQzlELENBQUM7aUJBQU0sQ0FBQztnQkFDUCxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQztnQkFDckMsTUFBTSxVQUFVLEdBQUcsT0FBTyxDQUFDLHFCQUFxQixFQUFFLENBQUM7Z0JBQ25ELElBQUksQ0FBQyx5QkFBeUIsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsQ0FBQztnQkFDOUQsSUFBSSxDQUFDLDBCQUEwQixHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQ2pFLENBQUM7UUFDRixDQUFDO1FBRUQsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLHdCQUF3QixDQUFDLE9BQU8sRUFBRSxTQUFTLEVBQUUsSUFBSSxDQUFDLHlCQUF5QixDQUFDLENBQUM7UUFFakcsSUFBSSxTQUFrQyxDQUFDO1FBQ3ZDLElBQUksSUFBSSxDQUFDLG1CQUFtQixFQUFFLENBQUM7WUFDOUIsU0FBUyxHQUFHLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLHlCQUF5QixFQUFFLElBQUksQ0FBQywwQkFBMEIsRUFBRSxHQUFHLENBQUMsQ0FBQztRQUNqSCxDQUFDO2FBQU0sQ0FBQztZQUNQLFNBQVMsR0FBRyxJQUFJLENBQUMsb0JBQW9CLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyx5QkFBeUIsRUFBRSxJQUFJLENBQUMsMEJBQTBCLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFDckgsQ0FBQztRQUVELGtFQUFrRTtRQUNsRSxLQUFLLElBQUksSUFBSSxHQUFHLENBQUMsRUFBRSxJQUFJLElBQUksQ0FBQyxFQUFFLElBQUksRUFBRSxFQUFFLENBQUM7WUFDdEMsS0FBSyxNQUFNLElBQUksSUFBSSxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUM7Z0JBQ3JDLFlBQVk7Z0JBQ1osSUFBSSxJQUFJLGtEQUEwQyxFQUFFLENBQUM7b0JBQ3BELElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQzt3QkFDaEIsNkJBQTZCO3dCQUM3QixPQUFPLElBQUksQ0FBQztvQkFDYixDQUFDO29CQUNELElBQUksSUFBSSxLQUFLLENBQUMsSUFBSSxTQUFTLENBQUMsU0FBUyxFQUFFLENBQUM7d0JBQ3ZDLE9BQU87NEJBQ04sSUFBSSxFQUFFLFlBQVk7NEJBQ2xCLFVBQVUsRUFBRSxJQUFJLFVBQVUsQ0FBQyxTQUFTLENBQUMsUUFBUSxFQUFFLFNBQVMsQ0FBQyxJQUFJLENBQUM7NEJBQzlELFFBQVEsK0NBQXVDO3lCQUMvQyxDQUFDO29CQUNILENBQUM7Z0JBQ0YsQ0FBQztxQkFBTSxJQUFJLElBQUksa0RBQTBDLEVBQUUsQ0FBQztvQkFDM0QsSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDO3dCQUNoQiw2QkFBNkI7d0JBQzdCLE9BQU8sSUFBSSxDQUFDO29CQUNiLENBQUM7b0JBQ0QsSUFBSSxJQUFJLEtBQUssQ0FBQyxJQUFJLFNBQVMsQ0FBQyxTQUFTLEVBQUUsQ0FBQzt3QkFDdkMsT0FBTzs0QkFDTixJQUFJLEVBQUUsWUFBWTs0QkFDbEIsVUFBVSxFQUFFLElBQUksVUFBVSxDQUFDLFNBQVMsQ0FBQyxRQUFRLEVBQUUsU0FBUyxDQUFDLElBQUksQ0FBQzs0QkFDOUQsUUFBUSwrQ0FBdUM7eUJBQy9DLENBQUM7b0JBQ0gsQ0FBQztnQkFDRixDQUFDO3FCQUFNLENBQUM7b0JBQ1AsSUFBSSxJQUFJLENBQUMsbUJBQW1CLEVBQUUsQ0FBQzt3QkFDOUIsT0FBTzs0QkFDTixJQUFJLEVBQUUsWUFBWTs0QkFDbEIsVUFBVSxFQUFFLElBQUksQ0FBQyw4Q0FBOEMsQ0FBQyxJQUFJLFVBQVUsQ0FBQyxNQUFNLENBQUMsR0FBRyxFQUFFLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQzs0QkFDeEcsUUFBUSwrQ0FBdUM7eUJBQy9DLENBQUM7b0JBQ0gsQ0FBQzt5QkFBTSxDQUFDO3dCQUNQLE9BQU87NEJBQ04sSUFBSSxFQUFFLFlBQVk7NEJBQ2xCLFVBQVUsRUFBRSxJQUFJLFVBQVUsQ0FBQyxNQUFNLENBQUMsR0FBRyxFQUFFLE1BQU0sQ0FBQyxJQUFJLENBQUM7NEJBQ25ELFFBQVEsK0NBQXVDO3lCQUMvQyxDQUFDO29CQUNILENBQUM7Z0JBQ0YsQ0FBQztZQUNGLENBQUM7UUFDRixDQUFDO1FBRUQsT0FBTyxJQUFJLENBQUM7SUFDYixDQUFDO0lBRUQ7O09BRUc7SUFDSSxjQUFjLENBQUMsWUFBMEI7UUFDL0MsSUFBSSxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsWUFBWSxJQUFJLENBQUMsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDO1lBQzVELE9BQU87UUFDUixDQUFDO1FBRUQsSUFBSSxJQUFJLENBQUMsY0FBYyxDQUFDLFlBQVksQ0FBQyxVQUFVLEdBQUcsWUFBWSxDQUFDLGVBQWUsSUFBSSxJQUFJLENBQUMsY0FBYyxDQUFDLFlBQVksQ0FBQyxVQUFVLEdBQUcsWUFBWSxDQUFDLGFBQWEsRUFBRSxDQUFDO1lBQzVKLHNCQUFzQjtZQUN0QixPQUFPO1FBQ1IsQ0FBQztRQUVELElBQUksQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQztJQUMxQyxDQUFDO0lBRU0sYUFBYSxDQUFDLEdBQXFCO1FBQ3pDLElBQUksQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDLG9CQUFvQixDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQ25ELENBQUM7SUFFTSxNQUFNLENBQUMsR0FBK0I7UUFDNUMsSUFBSSxDQUFDLElBQUksQ0FBQyxXQUFXLElBQUksSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLEtBQUssYUFBYSxFQUFFLENBQUM7WUFDbEUsa0NBQWtDO1lBQ2xDLElBQUksSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDO2dCQUNyQixJQUFJLENBQUMsT0FBTyxDQUFDLGVBQWUsQ0FBQywrQkFBK0IsQ0FBQyxDQUFDO2dCQUM5RCxJQUFJLENBQUMsVUFBVSxHQUFHLEtBQUssQ0FBQztnQkFFeEIsSUFBSSxJQUFJLENBQUMsV0FBVyxFQUFFLElBQUksS0FBSyxhQUFhLElBQUksSUFBSSxDQUFDLFdBQVcsQ0FBQyxhQUFhLEVBQUUsQ0FBQztvQkFDaEYscUVBQXFFO29CQUNyRSxzQ0FBc0M7b0JBQ3RDLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUM7Z0JBQzVCLENBQUM7cUJBQU0sQ0FBQztvQkFDUCxJQUFJLENBQUMsT0FBTyxDQUFDLGFBQWEsQ0FBQyxRQUFRLENBQUMsQ0FBQztnQkFDdEMsQ0FBQztZQUNGLENBQUM7WUFFRCxJQUFJLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxXQUFXLEtBQUssVUFBVSxFQUFFLENBQUM7Z0JBQ3BELFVBQVUsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLFdBQVcsRUFBRSxJQUFJLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztZQUNoRSxDQUFDO1lBQ0QsT0FBTztRQUNSLENBQUM7UUFFRCxnQ0FBZ0M7UUFDaEMsSUFBSSxJQUFJLENBQUMsbUJBQW1CLEVBQUUsQ0FBQztZQUM5QixJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUNyRCxJQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUN4RCxDQUFDO2FBQU0sQ0FBQztZQUNQLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsVUFBVSxDQUFDLEdBQUcsR0FBRyxHQUFHLENBQUMsU0FBUyxHQUFHLEdBQUcsQ0FBQyxlQUFlLENBQUMsQ0FBQztZQUMzRixJQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUN4RCxDQUFDO1FBRUQsSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQztZQUN0QixJQUFJLENBQUMsT0FBTyxDQUFDLGFBQWEsQ0FBQyxTQUFTLENBQUMsQ0FBQztZQUN0QyxJQUFJLENBQUMsT0FBTyxDQUFDLFlBQVksQ0FBQywrQkFBK0IsRUFBRSxNQUFNLENBQUMsQ0FBQztZQUNuRSxJQUFJLENBQUMsVUFBVSxHQUFHLElBQUksQ0FBQztRQUN4QixDQUFDO1FBRUQsSUFBSSxPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsV0FBVyxLQUFLLFVBQVUsRUFBRSxDQUFDO1lBQ3BELFVBQVUsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLFdBQVcsRUFBRSxJQUFJLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxXQUFXLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxXQUFXLENBQUMsVUFBVSxDQUFDLENBQUM7UUFDNUcsQ0FBQztJQUNGLENBQUM7Q0FDRDtBQUVELE1BQU0sWUFBWTtJQUNqQixZQUNpQixhQUErQixFQUMvQixZQUE2QjtRQUQ3QixrQkFBYSxHQUFiLGFBQWEsQ0FBa0I7UUFDL0IsaUJBQVksR0FBWixZQUFZLENBQWlCO0lBQzFDLENBQUM7Q0FDTDtBQUVELE1BQU0sVUFBVTtJQUdmLFlBQ2lCLEdBQVcsRUFDWCxJQUFZO1FBRFosUUFBRyxHQUFILEdBQUcsQ0FBUTtRQUNYLFNBQUksR0FBSixJQUFJLENBQVE7UUFKN0IscUJBQWdCLEdBQVMsU0FBUyxDQUFDO0lBSy9CLENBQUM7Q0FDTDtBQUVELE1BQU0sZ0JBQWdCO0lBR3JCLFlBQ2lCLEdBQVcsRUFDWCxJQUFZLEVBQ1osTUFBYztRQUZkLFFBQUcsR0FBSCxHQUFHLENBQVE7UUFDWCxTQUFJLEdBQUosSUFBSSxDQUFRO1FBQ1osV0FBTSxHQUFOLE1BQU0sQ0FBUTtRQUwvQiwyQkFBc0IsR0FBUyxTQUFTLENBQUM7SUFNckMsQ0FBQztDQUNMO0FBRUQsU0FBUyxVQUFVLENBQW9DLEVBQUssRUFBRSxPQUE2QixFQUFFLEdBQUcsSUFBbUI7SUFDbEgsSUFBSSxDQUFDO1FBQ0osT0FBTyxFQUFFLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxHQUFHLElBQUksQ0FBQyxDQUFDO0lBQ2xDLENBQUM7SUFBQyxNQUFNLENBQUM7UUFDUixTQUFTO1FBQ1QsT0FBTyxJQUFJLENBQUM7SUFDYixDQUFDO0FBQ0YsQ0FBQyJ9