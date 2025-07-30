/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { h, reset } from '../../../../../base/browser/dom.js';
import { Disposable, toDisposable } from '../../../../../base/common/lifecycle.js';
import { autorun, observableFromEvent, observableSignal, observableSignalFromEvent, observableValue, transaction } from '../../../../../base/common/observable.js';
import { LineRange } from '../../../../common/core/ranges/lineRange.js';
import { OffsetRange } from '../../../../common/core/ranges/offsetRange.js';
export class EditorGutter extends Disposable {
    constructor(_editor, _domNode, itemProvider) {
        super();
        this._editor = _editor;
        this._domNode = _domNode;
        this.itemProvider = itemProvider;
        this.scrollTop = observableFromEvent(this, this._editor.onDidScrollChange, (e) => /** @description editor.onDidScrollChange */ this._editor.getScrollTop());
        this.isScrollTopZero = this.scrollTop.map((scrollTop) => /** @description isScrollTopZero */ scrollTop === 0);
        this.modelAttached = observableFromEvent(this, this._editor.onDidChangeModel, (e) => /** @description editor.onDidChangeModel */ this._editor.hasModel());
        this.editorOnDidChangeViewZones = observableSignalFromEvent('onDidChangeViewZones', this._editor.onDidChangeViewZones);
        this.editorOnDidContentSizeChange = observableSignalFromEvent('onDidContentSizeChange', this._editor.onDidContentSizeChange);
        this.domNodeSizeChanged = observableSignal('domNodeSizeChanged');
        this.views = new Map();
        this._domNode.className = 'gutter monaco-editor';
        const scrollDecoration = this._domNode.appendChild(h('div.scroll-decoration', { role: 'presentation', ariaHidden: 'true', style: { width: '100%' } })
            .root);
        const o = new ResizeObserver(() => {
            transaction(tx => {
                /** @description ResizeObserver: size changed */
                this.domNodeSizeChanged.trigger(tx);
            });
        });
        o.observe(this._domNode);
        this._register(toDisposable(() => o.disconnect()));
        this._register(autorun(reader => {
            /** @description update scroll decoration */
            scrollDecoration.className = this.isScrollTopZero.read(reader) ? '' : 'scroll-decoration';
        }));
        this._register(autorun(reader => /** @description EditorGutter.Render */ this.render(reader)));
    }
    dispose() {
        super.dispose();
        reset(this._domNode);
    }
    render(reader) {
        if (!this.modelAttached.read(reader)) {
            return;
        }
        this.domNodeSizeChanged.read(reader);
        this.editorOnDidChangeViewZones.read(reader);
        this.editorOnDidContentSizeChange.read(reader);
        const scrollTop = this.scrollTop.read(reader);
        const visibleRanges = this._editor.getVisibleRanges();
        const unusedIds = new Set(this.views.keys());
        const viewRange = OffsetRange.ofStartAndLength(0, this._domNode.clientHeight);
        if (!viewRange.isEmpty) {
            for (const visibleRange of visibleRanges) {
                const visibleRange2 = new LineRange(visibleRange.startLineNumber, visibleRange.endLineNumber + 1);
                const gutterItems = this.itemProvider.getIntersectingGutterItems(visibleRange2, reader);
                transaction(tx => {
                    /** EditorGutter.render */
                    for (const gutterItem of gutterItems) {
                        if (!gutterItem.range.intersect(visibleRange2)) {
                            continue;
                        }
                        unusedIds.delete(gutterItem.id);
                        let view = this.views.get(gutterItem.id);
                        if (!view) {
                            const viewDomNode = document.createElement('div');
                            this._domNode.appendChild(viewDomNode);
                            const gutterItemObs = observableValue('item', gutterItem);
                            const itemView = this.itemProvider.createView(gutterItemObs, viewDomNode);
                            view = new ManagedGutterItemView(gutterItemObs, itemView, viewDomNode);
                            this.views.set(gutterItem.id, view);
                        }
                        else {
                            view.item.set(gutterItem, tx);
                        }
                        const top = gutterItem.range.startLineNumber <= this._editor.getModel().getLineCount()
                            ? this._editor.getTopForLineNumber(gutterItem.range.startLineNumber, true) - scrollTop
                            : this._editor.getBottomForLineNumber(gutterItem.range.startLineNumber - 1, false) - scrollTop;
                        const bottom = gutterItem.range.endLineNumberExclusive === 1 ?
                            Math.max(top, this._editor.getTopForLineNumber(gutterItem.range.startLineNumber, false) - scrollTop)
                            : Math.max(top, this._editor.getBottomForLineNumber(gutterItem.range.endLineNumberExclusive - 1, true) - scrollTop);
                        const height = bottom - top;
                        view.domNode.style.top = `${top}px`;
                        view.domNode.style.height = `${height}px`;
                        view.gutterItemView.layout(OffsetRange.ofStartAndLength(top, height), viewRange);
                    }
                });
            }
        }
        for (const id of unusedIds) {
            const view = this.views.get(id);
            view.gutterItemView.dispose();
            view.domNode.remove();
            this.views.delete(id);
        }
    }
}
class ManagedGutterItemView {
    constructor(item, gutterItemView, domNode) {
        this.item = item;
        this.gutterItemView = gutterItemView;
        this.domNode = domNode;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yR3V0dGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvYWR2aWthci9Eb2N1bWVudHMvYXJjaGl0ZWN0L2FyY2gyL0FyY2hJREUvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2Jyb3dzZXIvd2lkZ2V0L2RpZmZFZGl0b3IvdXRpbHMvZWRpdG9yR3V0dGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxDQUFDLEVBQUUsS0FBSyxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDOUQsT0FBTyxFQUFFLFVBQVUsRUFBZSxZQUFZLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNoRyxPQUFPLEVBQUUsT0FBTyxFQUE2QyxtQkFBbUIsRUFBRSxnQkFBZ0IsRUFBRSx5QkFBeUIsRUFBRSxlQUFlLEVBQUUsV0FBVyxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFFOU0sT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQ3hFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQztBQUU1RSxNQUFNLE9BQU8sWUFBMEQsU0FBUSxVQUFVO0lBU3hGLFlBQ2tCLE9BQXlCLEVBQ3pCLFFBQXFCLEVBQ3JCLFlBQW9DO1FBRXJELEtBQUssRUFBRSxDQUFDO1FBSlMsWUFBTyxHQUFQLE9BQU8sQ0FBa0I7UUFDekIsYUFBUSxHQUFSLFFBQVEsQ0FBYTtRQUNyQixpQkFBWSxHQUFaLFlBQVksQ0FBd0I7UUFHckQsSUFBSSxDQUFDLFNBQVMsR0FBRyxtQkFBbUIsQ0FBQyxJQUFJLEVBQ3hDLElBQUksQ0FBQyxPQUFPLENBQUMsaUJBQWlCLEVBQzlCLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyw0Q0FBNEMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLFlBQVksRUFBRSxDQUMvRSxDQUFDO1FBQ0YsSUFBSSxDQUFDLGVBQWUsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcs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