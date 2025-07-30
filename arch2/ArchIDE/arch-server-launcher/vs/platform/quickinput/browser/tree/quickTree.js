/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter, Event } from '../../../../base/common/event.js';
import { autorun, observableValue } from '../../../../base/common/observable.js';
import { localize } from '../../../../nls.js';
import { QuickInput } from '../quickInput.js';
import { getParentNodeState } from './quickInputTree.js';
// Contains the API
export class QuickTree extends QuickInput {
    static { this.DEFAULT_ARIA_LABEL = localize('quickInputBox.ariaLabel', "Type to narrow down results."); }
    constructor(ui) {
        super(ui);
        this.type = "quickTree" /* QuickInputType.QuickTree */;
        this._value = observableValue('value', '');
        this._ariaLabel = observableValue('ariaLabel', undefined);
        this._placeholder = observableValue('placeholder', undefined);
        this._matchOnDescription = observableValue('matchOnDescription', false);
        this._matchOnDetail = observableValue('matchOnDetail', false);
        this._matchOnLabel = observableValue('matchOnLabel', true);
        this._activeItems = observableValue('activeItems', []);
        this._itemTree = observableValue('itemTree', []);
        this.onDidChangeValue = Event.fromObservable(this._value, this._store);
        this.onDidChangeActive = Event.fromObservable(this._activeItems, this._store);
        this._onDidChangeCheckedLeafItems = new Emitter();
        this.onDidChangeCheckedLeafItems = this._onDidChangeCheckedLeafItems.event;
        this.onDidAccept = ui.onDidAccept;
        this._registerAutoruns();
        this._register(ui.tree.onDidChangeCheckedLeafItems(e => this._onDidChangeCheckedLeafItems.fire(e)));
    }
    get value() { return this._value.get(); }
    set value(value) { this._value.set(value, undefined); }
    get ariaLabel() { return this._ariaLabel.get(); }
    set ariaLabel(ariaLabel) { this._ariaLabel.set(ariaLabel, undefined); }
    get placeholder() { return this._placeholder.get(); }
    set placeholder(placeholder) { this._placeholder.set(placeholder, undefined); }
    get matchOnDescription() { return this._matchOnDescription.get(); }
    set matchOnDescription(matchOnDescription) { this._matchOnDescription.set(matchOnDescription, undefined); }
    get matchOnDetail() { return this._matchOnDetail.get(); }
    set matchOnDetail(matchOnDetail) { this._matchOnDetail.set(matchOnDetail, undefined); }
    get matchOnLabel() { return this._matchOnLabel.get(); }
    set matchOnLabel(matchOnLabel) { this._matchOnLabel.set(matchOnLabel, undefined); }
    get activeItems() { return this._activeItems.get(); }
    set activeItems(activeItems) { this._activeItems.set(activeItems, undefined); }
    get itemTree() { return this._itemTree.get(); }
    get onDidTriggerItemButton() {
        // Is there a cleaner way to avoid the `as` cast here?
        return this.ui.tree.onDidTriggerButton;
    }
    // TODO: Fix the any casting
    get checkedLeafItems() { return this.ui.tree.getCheckedLeafItems(); }
    setItemTree(itemTree) {
        this._itemTree.set(itemTree, undefined);
    }
    getParent(element) {
        return this.ui.tree.tree.getParentElement(element) ?? undefined;
    }
    setCheckboxState(element, checked) {
        this.ui.tree.check(element, checked);
    }
    expand(element) {
        this.ui.tree.tree.expand(element);
    }
    collapse(element) {
        this.ui.tree.tree.collapse(element);
    }
    isCollapsed(element) {
        return this.ui.tree.tree.isCollapsed(element);
    }
    focusOnInput() {
        this.ui.inputBox.setFocus();
    }
    show() {
        if (!this.visible) {
            const visibilities = {
                title: !!this.title || !!this.step || !!this.titleButtons.length,
                description: !!this.description,
                checkAll: true,
                checkBox: true,
                inputBox: true,
                progressBar: true,
                visibleCount: true,
                count: true,
                ok: true,
                list: false,
                tree: true,
                message: !!this.validationMessage,
                customButton: false
            };
            this.ui.setVisibilities(visibilities);
            this.visibleDisposables.add(this.ui.inputBox.onDidChange(value => {
                this._value.set(value, undefined);
            }));
            this.visibleDisposables.add(this.ui.tree.onDidChangeCheckboxState((e) => {
                const checkAllState = getParentNodeState([...this.ui.tree.tree.getNode().children]);
                if (this.ui.checkAll.checked !== checkAllState) {
                    this.ui.checkAll.checked = checkAllState;
                }
            }));
            this.visibleDisposables.add(this.ui.checkAll.onChange(_e => {
                const checked = this.ui.checkAll.checked;
                this.ui.tree.checkAll(checked);
            }));
            this.visibleDisposables.add(this.ui.tree.onDidChangeCheckedLeafItems(e => {
                this.ui.count.setCount(e.length);
            }));
        }
        super.show(); // TODO: Why have show() bubble up while update() trickles down?
        // Intial state
        this.ui.count.setCount(this.ui.tree.getCheckedLeafItems().length);
        const checkAllState = getParentNodeState([...this.ui.tree.tree.getNode().children]);
        if (this.ui.checkAll.checked !== checkAllState) {
            this.ui.checkAll.checked = checkAllState;
        }
    }
    update() {
        if (!this.visible) {
            return;
        }
        const visibilities = {
            title: !!this.title || !!this.step || !!this.titleButtons.length,
            description: !!this.description,
            checkAll: true,
            checkBox: true,
            inputBox: true,
            progressBar: true,
            visibleCount: true,
            count: true,
            ok: true,
            tree: true,
            message: !!this.validationMessage
        };
        this.ui.setVisibilities(visibilities);
        super.update();
    }
    _registerListeners() {
    }
    // TODO: Move to using autoruns instead of update function
    _registerAutoruns() {
        this.registerVisibleAutorun(reader => {
            const value = this._value.read(reader);
            this.ui.inputBox.value = value;
            this.ui.tree.filter(value);
        });
        this.registerVisibleAutorun(reader => {
            let ariaLabel = this._ariaLabel.read(reader);
            if (!ariaLabel) {
                ariaLabel = this.placeholder || QuickTree.DEFAULT_ARIA_LABEL;
                // If we have a title, include it in the aria label.
                if (this.title) {
                    ariaLabel += ` - ${this.title}`;
                }
            }
            if (this.ui.list.ariaLabel !== ariaLabel) {
                this.ui.list.ariaLabel = ariaLabel ?? null;
            }
            if (this.ui.inputBox.ariaLabel !== ariaLabel) {
                this.ui.inputBox.ariaLabel = ariaLabel ?? 'input';
            }
        });
        this.registerVisibleAutorun(reader => {
            const placeholder = this._placeholder.read(reader);
            if (this.ui.inputBox.placeholder !== placeholder) {
                this.ui.inputBox.placeholder = placeholder ?? '';
            }
        });
        this.registerVisibleAutorun((reader) => {
            const matchOnLabel = this._matchOnLabel.read(reader);
            const matchOnDescription = this._matchOnDescription.read(reader);
            const matchOnDetail = this._matchOnDetail.read(reader);
            this.ui.tree.updateFilterOptions({ matchOnLabel, matchOnDescription, matchOnDetail });
        });
        this.registerVisibleAutorun((reader) => {
            const itemTree = this._itemTree.read(reader);
            this.ui.tree.setTreeData(itemTree);
        });
    }
    registerVisibleAutorun(fn) {
        this._register(autorun((reader) => {
            if (this._visible.read(reader)) {
                fn(reader);
            }
        }));
    }
    focus(focus) {
        this.ui.tree.focus(focus);
        // To allow things like space to check/uncheck items
        this.ui.tree.tree.domFocus();
    }
    /**
     * Programmatically accepts an item. Used internally for keyboard navigation.
     * @param inBackground Whether you are accepting an item in the background and keeping the picker open.
     */
    accept(_inBackground) {
        // No-op for now since we expect only multi-select quick trees which don't need
        // the speed of accept.
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicXVpY2tUcmVlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvYWR2aWthci9Eb2N1bWVudHMvYXJjaGl0ZWN0L2FyY2gyL0FyY2hJREUvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vcXVpY2tpbnB1dC9icm93c2VyL3RyZWUvcXVpY2tUcmVlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDbEUsT0FBTyxFQUFFLE9BQU8sRUFBVyxlQUFlLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUMxRixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFFOUMsT0FBTyxFQUFFLFVBQVUsRUFBOEIsTUFBTSxrQkFBa0IsQ0FBQztBQUMxRSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQztBQUV6RCxtQkFBbUI7QUFFbkIsTUFBTSxPQUFPLFNBQW9DLFNBQVEsVUFBVTthQUMxQyx1QkFBa0IsR0FBRyxRQUFRLENBQUMseUJBQXlCLEVBQUUsOEJBQThCLENBQUMsQUFBdEUsQ0FBdUU7SUFxQmpILFlBQVksRUFBZ0I7UUFDM0IsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBcEJGLFNBQUksOENBQTRCO1FBRXhCLFdBQU0sR0FBRyxlQUFlLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQ3RDLGVBQVUsR0FBRyxlQUFlLENBQXFCLFdBQVcsRUFBRSxTQUFTLENBQUMsQ0FBQztRQUN6RSxpQkFBWSxHQUFHLGVBQWUsQ0FBcUIsYUFBYSxFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBQzdFLHdCQUFtQixHQUFHLGVBQWUsQ0FBQyxvQkFBb0IsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUNuRSxtQkFBYyxHQUFHLGVBQWUsQ0FBQyxlQUFlLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDekQsa0JBQWEs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