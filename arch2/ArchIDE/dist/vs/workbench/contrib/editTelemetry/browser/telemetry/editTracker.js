/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { observableSignal, runOnChange } from '../../../../../base/common/observable.js';
import { AnnotatedStringEdit } from '../../../../../editor/common/core/edits/stringEdit.js';
/**
 * Tracks a single document.
*/
export class DocumentEditSourceTracker extends Disposable {
    constructor(_doc, data) {
        super();
        this._doc = _doc;
        this.data = data;
        this._edits = AnnotatedStringEdit.empty;
        this._pendingExternalEdits = AnnotatedStringEdit.empty;
        this._update = observableSignal(this);
        this._sumAddedCharactersPerKey = new Map();
        this._register(runOnChange(this._doc.value, (_val, _prevVal, edits) => {
            const eComposed = AnnotatedStringEdit.compose(edits.map(e => e.edit));
            if (eComposed.replacements.every(e => e.data.source.category === 'external')) {
                if (this._edits.isEmpty()) {
                    // Ignore initial external edits
                }
                else {
                    // queue pending external edits
                    this._pendingExternalEdits = this._pendingExternalEdits.compose(eComposed);
                }
            }
            else {
                if (!this._pendingExternalEdits.isEmpty()) {
                    this._applyEdit(this._pendingExternalEdits);
                    this._pendingExternalEdits = AnnotatedStringEdit.empty;
                }
                this._applyEdit(eComposed);
            }
            this._update.trigger(undefined);
        }));
    }
    _applyEdit(e) {
        for (const r of e.replacements) {
            const existing = this._sumAddedCharactersPerKey.get(r.data.key) ?? 0;
            const newCount = existing + r.getNewLength();
            this._sumAddedCharactersPerKey.set(r.data.key, newCount);
        }
        this._edits = this._edits.compose(e);
    }
    async waitForQueue() {
        await this._doc.waitForQueue();
    }
    getChangedCharactersCount(key) {
        const val = this._sumAddedCharactersPerKey.get(key);
        return val ?? 0;
    }
    getTrackedRanges(reader) {
        this._update.read(reader);
        const ranges = this._edits.getNewRanges();
        return ranges.map((r, idx) => {
            const e = this._edits.replacements[idx];
            const te = new TrackedEdit(e.replaceRange, r, e.data.key, e.data.source, e.data.representative);
            return te;
        });
    }
    isEmpty() {
        return this._edits.isEmpty();
    }
    reset() {
        this._edits = AnnotatedStringEdit.empty;
    }
    _getDebugVisualization() {
        const ranges = this.getTrackedRanges();
        const txt = this._doc.value.get().value;
        return {
            ...{ $fileExtension: 'text.w' },
            'value': txt,
            'decorations': ranges.map(r => {
                return {
                    range: [r.range.start, r.range.endExclusive],
                    color: r.source.getColor(),
                };
            })
        };
    }
}
export class TrackedEdit {
    constructor(originalRange, range, sourceKey, source, sourceRepresentative) {
        this.originalRange = originalRange;
        this.range = range;
        this.sourceKey = sourceKey;
        this.source = source;
        this.sourceRepresentative = sourceRepresentative;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdFRyYWNrZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9hZHZpa2FyL0RvY3VtZW50cy9hcmNoaXRlY3QvYXJjaDIvQXJjaElERS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9lZGl0VGVsZW1ldHJ5L2Jyb3dzZXIvdGVsZW1ldHJ5L2VkaXRUcmFja2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNyRSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsV0FBVyxFQUFXLE1BQU0sMENBQTBDLENBQUM7QUFDbEcsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sdURBQXVELENBQUM7QUFLNUY7O0VBRUU7QUFDRixNQUFNLE9BQU8seUJBQW9DLFNBQVEsVUFBVTtJQU9sRSxZQUNrQixJQUFpQyxFQUNsQyxJQUFPO1FBRXZCLEtBQUssRUFBRSxDQUFDO1FBSFMsU0FBSSxHQUFKLElBQUksQ0FBNkI7UUFDbEMsU0FBSSxHQUFKLElBQUksQ0FBRztRQVJoQixXQUFNLEdBQTJDLG1CQUFtQixDQUFDLEtBQUssQ0FBQztRQUMzRSwwQkFBcUIsR0FBMkMsbUJBQW1CLENBQUMsS0FBSyxDQUFDO1FBRWpGLFlBQU8sR0FBRyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNqQyw4QkFBeUIsR0FBd0IsSUFBSSxHQUFHLEVBQUUsQ0FBQztRQVEzRSxJQUFJLENBQUMsU0FBUyxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDLElBQUksRUFBRSxRQUFRLEVBQUUsS0FBSyxFQUFFLEVBQUU7WUFDckUsTUFBTSxTQUFTLEdBQUcsbUJBQW1CLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FB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