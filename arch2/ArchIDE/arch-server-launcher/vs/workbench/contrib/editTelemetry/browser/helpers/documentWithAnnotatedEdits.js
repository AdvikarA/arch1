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
import { AsyncReader, AsyncReaderEndOfStream } from '../../../../../base/common/async.js';
import { CachedFunction } from '../../../../../base/common/cache.js';
import { Disposable, DisposableStore } from '../../../../../base/common/lifecycle.js';
import { observableValue, runOnChange } from '../../../../../base/common/observable.js';
import { AnnotatedStringEdit } from '../../../../../editor/common/core/edits/stringEdit.js';
import { IEditorWorkerService } from '../../../../../editor/common/services/editorWorker.js';
import { iterateObservableChanges, mapObservableDelta } from './utils.js';
/**
 * Creates a document that is a delayed copy of the original document,
 * but with edits annotated with the source of the edit.
*/
export class DocumentWithSourceAnnotatedEdits extends Disposable {
    constructor(_originalDoc) {
        super();
        this._originalDoc = _originalDoc;
        const v = this.value = observableValue(this, _originalDoc.value.get());
        this._register(runOnChange(this._originalDoc.value, (val, _prevVal, edits) => {
            const eComposed = AnnotatedStringEdit.compose(edits.map(e => {
                const editSourceData = new EditSourceData(e.reason);
                return e.mapData(() => editSourceData);
            }));
            v.set(val, undefined, { edit: eComposed });
        }));
    }
    waitForQueue() {
        return Promise.resolve();
    }
}
/**
 * Only joins touching edits if the source and the metadata is the same (e.g. requestUuids must be equal).
*/
export class EditSourceData {
    constructor(editSource) {
        this.editSource = editSource;
        this.key = this.editSource.toKey(1);
        this.source = EditSourceBase.create(this.editSource);
    }
    join(data) {
        if (this.editSource !== data.editSource) {
            return undefined;
        }
        return this;
    }
    toEditSourceData() {
        return new EditKeySourceData(this.key, this.source, this.editSource);
    }
}
export class EditKeySourceData {
    constructor(key, source, representative) {
        this.key = key;
        this.source = source;
        this.representative = representative;
    }
    join(data) {
        if (this.key !== data.key) {
            return undefined;
        }
        if (this.source !== data.source) {
            return undefined;
        }
        // The representatives could be different! (But equal modulo key)
        return this;
    }
}
export class EditSourceBase {
    static { this._cache = new CachedFunction({ getCacheKey: v => v.toString() }, (arg) => arg); }
    static create(reason) {
        const data = reason.metadata;
        switch (data.source) {
            case 'reloadFromDisk':
                return this._cache.get(new ExternalEditSource());
            case 'inlineCompletionPartialAccept':
            case 'inlineCompletionAccept': {
                const type = 'type' in data ? data.type : undefined;
                if ('$nes' in data && data.$nes) {
                    return this._cache.get(new InlineSuggestEditSource('nes', data.$extensionId ?? '', type));
                }
                return this._cache.get(new InlineSuggestEditSource('completion', data.$extensionId ?? '', type));
            }
            case 'snippet':
                return this._cache.get(new IdeEditSource('suggest'));
            case 'unknown':
                if (!data.name) {
                    return this._cache.get(new UnknownEditSource());
                }
                switch (data.name) {
                    case 'formatEditsCommand':
                        return this._cache.get(new IdeEditSource('format'));
                }
                return this._cache.get(new UnknownEditSource());
            case 'Chat.applyEdits':
                return this._cache.get(new ChatEditSource('sidebar'));
            case 'inlineChat.applyEdits':
                return this._cache.get(new ChatEditSource('inline'));
            case 'cursor':
                return this._cache.get(new UserEditSource());
            default:
                return this._cache.get(new UnknownEditSource());
        }
    }
}
export class InlineSuggestEditSource extends EditSourceBase {
    constructor(kind, extensionId, type) {
        super();
        this.kind = kind;
        this.extensionId = extensionId;
        this.type = type;
        this.category = 'ai';
        this.feature = 'inlineSuggest';
    }
    toString() { return `${this.category}/${this.feature}/${this.kind}/${this.extensionId}/${this.type}`; }
    getColor() { return '#00ff0033'; }
}
class ChatEditSource extends EditSourceBase {
    constructor(kind) {
        super();
        this.kind = kind;
        this.category = 'ai';
        this.feature = 'chat';
    }
    toString() { return `${this.category}/${this.feature}/${this.kind}`; }
    getColor() { return '#00ff0066'; }
}
class IdeEditSource extends EditSourceBase {
    constructor(feature) {
        super();
        this.feature = feature;
        this.category = 'ide';
    }
    toString() { return `${this.category}/${this.feature}`; }
    getColor() { return this.feature === 'format' ? '#0000ff33' : '#80808033'; }
}
class UserEditSource extends EditSourceBase {
    constructor() {
        super();
        this.category = 'user';
    }
    toString() { return this.category; }
    getColor() { return '#d3d3d333'; }
}
/** Caused by external tools that trigger a reload from disk */
class ExternalEditSource extends EditSourceBase {
    constructor() {
        super();
        this.category = 'external';
    }
    toString() { return this.category; }
    getColor() { return '#009ab254'; }
}
class UnknownEditSource extends EditSourceBase {
    constructor() {
        super();
        this.category = 'unknown';
    }
    toString() { return this.category; }
    getColor() { return '#ff000033'; }
}
let CombineStreamedChanges = class CombineStreamedChanges extends Disposable {
    constructor(_originalDoc, _diffService) {
        super();
        this._originalDoc = _originalDoc;
        this._diffService = _diffService;
        this._runStore = this._register(new DisposableStore());
        this._runQueue = Promise.resolve();
        this.value = this._value = observableValue(this, _originalDoc.value.get());
        this._restart();
        this._diffService.computeStringEditFromDiff('foo', 'last.value.value', { maxComputationTimeMs: 500 }, 'advanced');
    }
    async _restart() {
        this._runStore.clear();
        const iterator = iterateObservableChanges(this._originalDoc.value, this._runStore)[Symbol.asyncIterator]();
        const p = this._runQueue;
        this._runQueue = this._runQueue.then(() => this._run(iterator));
        await p;
    }
    async _run(iterator) {
        const reader = new AsyncReader(iterator);
        while (true) {
            let peeked = await reader.peek();
            if (peeked === AsyncReaderEndOfStream) {
                return;
            }
            else if (isChatEdit(peeked)) {
                const first = peeked;
                let last = first;
                let chatEdit = AnnotatedStringEdit.empty;
                do {
                    reader.readBufferedOrThrow();
                    last = peeked;
                    chatEdit = chatEdit.compose(AnnotatedStringEdit.compose(peeked.change.map(c => c.edit)));
                    const peekedOrUndefined = await reader.peekTimeout(1000);
                    if (!peekedOrUndefined) {
                        break;
                    }
                    peeked = peekedOrUndefined;
                } while (peeked !== AsyncReaderEndOfStream && isChatEdit(peeked));
                if (!chatEdit.isEmpty()) {
                    const data = chatEdit.replacements[0].data;
                    const diffEdit = await this._diffService.computeStringEditFromDiff(first.prevValue.value, last.value.value, { maxComputationTimeMs: 500 }, 'advanced');
                    const edit = diffEdit.mapData(_e => data);
                    this._value.set(last.value, undefined, { edit });
                }
            }
            else {
                reader.readBufferedOrThrow();
                const e = AnnotatedStringEdit.compose(peeked.change.map(c => c.edit));
                this._value.set(peeked.value, undefined, { edit: e });
            }
        }
    }
    async waitForQueue() {
        await this._originalDoc.waitForQueue();
        await this._restart();
    }
};
CombineStreamedChanges = __decorate([
    __param(1, IEditorWorkerService)
], CombineStreamedChanges);
export { CombineStreamedChanges };
function isChatEdit(next) {
    return next.change.every(c => c.edit.replacements.every(e => {
        if (e.data.source.category === 'ai' && e.data.source.feature === 'chat') {
            return true;
        }
        return false;
    }));
}
export class MinimizeEditsProcessor extends Disposable {
    constructor(_originalDoc) {
        super();
        this._originalDoc = _originalDoc;
        const v = this.value = observableValue(this, _originalDoc.value.get());
        let prevValue = this._originalDoc.value.get().value;
        this._register(runOnChange(this._originalDoc.value, (val, _prevVal, edits) => {
            const eComposed = AnnotatedStringEdit.compose(edits.map(e => e.edit));
            const e = eComposed.removeCommonSuffixAndPrefix(prevValue);
            prevValue = val.value;
            v.set(val, undefined, { edit: e });
        }));
    }
    async waitForQueue() {
        await this._originalDoc.waitForQueue();
    }
}
/**
 * Removing the metadata allows touching edits from the same source to merged, even if they were caused by different actions (e.g. two user edits).
 */
export function createDocWithJustReason(docWithAnnotatedEdits, store) {
    const docWithJustReason = {
        value: mapObservableDelta(docWithAnnotatedEdits.value, edit => ({ edit: edit.edit.mapData(d => d.data.toEditSourceData()) }), store),
        waitForQueue: () => docWithAnnotatedEdits.waitForQueue(),
    };
    return docWithJustReason;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZG9jdW1lbnRXaXRoQW5ub3RhdGVkRWRpdHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9hZHZpa2FyL0RvY3VtZW50cy9hcmNoaXRlY3QvYXJjaDIvQXJjaElERS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9lZGl0VGVsZW1ldHJ5L2Jyb3dzZXIvaGVscGVycy9kb2N1bWVudFdpdGhBbm5vdGF0ZWRFZGl0cy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsV0FBVyxFQUFFLHNCQUFzQixFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDMUYsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQ3JFLE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDdEYsT0FBTyxFQUE4QyxlQUFlLEVBQUUsV0FBVyxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDcEksT0FBTyxFQUFFLG1CQUFtQixFQUFhLE1BQU0sdURBQXVELENBQUM7QUFFdkcsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sdURBQXVELENBQUM7QUFHN0YsT0FBTyxFQUFFLHdCQUF3QixFQUFFLGtCQUFrQixFQUFFLE1BQU0sWUFBWSxDQUFDO0FBTzFFOzs7RUFHRTtBQUNGLE1BQU0sT0FBTyxnQ0FBaUMsU0FBUSxVQUFVO0lBRy9ELFlBQTZCLFlBQWlDO1FBQzdELEtBQUssRUFBRSxDQUFDO1FBRG9CLGlCQUFZLEdBQVosWUFBWSxDQUFxQjtRQUc3RCxNQUFNLENBQUMsR0FBRyxJQUFJLENBQUMsS0FBSyxHQUFHLGVBQWUsQ0FBQyxJQUFJLEVBQUUsWUFBWSxDQUFDLEtBQUssQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDO1FBRXZFLElBQUksQ0FBQyxTQUFTLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsS0FBSyxFQUFFLENBQUMsR0FBRyxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsRUFBRTtZQUM1RSxNQUFNLFNBQVMsR0FBRyxtQkFBbUIsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRTtnQkFDM0QsTUFBTSxjQUFjLEdBQUcsSUFBSSxjQUFjLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDO2dCQUNwRCxPQUFPLENBQUMsQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLENBQUMsY0FBYyxDQUFDLENBQUM7WUFDeEMsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUVKLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLFNBQVMsRUFBRSxFQUFFLElBQUksRUFBRSxTQUFTLEVBQUUsQ0FBQyxDQUFDO1FBQzVDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDO0lBRU0sWUFBWTtRQUNsQixPQUFPLE9BQU8sQ0FBQyxPQUFPLEVBQUUsQ0FBQztJQUMxQixDQUFDO0NBQ0Q7QUFFRDs7RUFFRTtBQUNGLE1BQU0sT0FBTyxjQUFjO0lBSTFCLFlBQ2lCLFVBQStCO1FBQS9CLGVBQVUsR0FBVixVQUFVLENBQXFCO1FBRS9DLElBQUksQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDcEMsSUFBSSxDQUFDLE1BQU0sR0FBRyxjQUFjLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQztJQUN0RCxDQUFDO0lBRUQsSUFBSSxDQUFDLElBQW9CO1FBQ3hCLElBQUksSUFBSSxDQUFDLFVBQVUsS0FBSyxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUM7WUFDekMsT0FBTyxTQUFTLENBQUM7UUFDbEIsQ0FBQztRQUNELE9BQU8sSUFBSSxDQUFDO0lBQ2IsQ0FBQztJQUVELGdCQUFnQjtRQUNmLE9BQU8sSUFBSSxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDO0lBQ3RFLENBQUM7Q0FDRDtBQUVELE1BQU0sT0FBTyxpQkFBaUI7SUFDN0IsWUFDaUIsR0FBVyxFQUNYLE1BQWtCLEVBQ2xCLGNBQW1DO1FBRm5DLFFBQUcsR0FBSCxHQUFHLENBQVE7UUFDWCxXQUFNLEdBQU4sTUFBTSxDQUFZO1FBQ2xCLG1CQUFjLEdBQWQsY0FBYyxDQUFxQjtJQUNoRCxDQUFDO0lBRUwsSUFBSSxDQUFDLElBQXVCO1FBQzNCLElBQUksSUFBSSxDQUFDLEdBQUcsS0FBSyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUM7WUFDM0IsT0FBTyxTQUFTLENBQUM7UUFDbEIsQ0FBQztRQUNELElBQUksSUFBSSxDQUFDLE1BQU0sS0FBSyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDakMsT0FBTyxTQUFTLENBQUM7UUFDbEIsQ0FBQztRQUNELGlFQUFpRTtRQUNqRSxPQUFPLElBQUksQ0FBQztJQUNiLENBQUM7Q0FDRDtBQUVELE1BQU0sT0FBZ0IsY0FBYzthQUNwQixXQUFNLEdBQUcsSUFBSSxjQUFjLENBQUMsRUFBRSxXQUFXLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsUUFBUSxFQUFFLEVBQUUsRUFBRSxDQUFDLEdBQWUsRUFBRSxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUM7SUFFbEcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxNQUEyQjtRQUMvQyxNQUFNLElBQUksR0FBRyxNQUFNLENBQUMsUUFBUSxDQUFDO1FBQzdCLFFBQVEsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ3JCLEtBQUssZ0JBQWdCO2dCQUNwQixPQUFPLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLElBQUksa0JBQWtCLEVBQUUsQ0FBQyxDQUFDO1lBQ2xELEtBQUssK0JBQStCLENBQUM7WUFDckMsS0FBSyx3QkFBd0IsQ0FBQyxDQUFDLENBQUM7Z0JBQy9CLE1BQU0sSUFBSSxHQUFHLE1BQU0sSUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQztnQkFDcEQsSUFBSSxNQUFNLElBQUksSUFBSSxJQUFJLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztvQkFDakMsT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxJQUFJLHVCQUF1QixDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsWUFBWSxJQUFJLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDO2dCQUMzRixDQUFDO2dCQUNELE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsSUFBSSx1QkFBdUIsQ0FBQyxZQUFZLEVBQUUsSUFBSSxDQUFDLFlBQVksSUFBSSxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQztZQUNsRyxDQUFDO1lBQ0QsS0FBSyxTQUFTO2dCQUNiLE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsSUFBSSxhQUFhLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQztZQUN0RCxLQUFLLFNBQVM7Z0JBQ2IsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztvQkFDaEIsT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxJQUFJLGlCQUFpQixFQUFFLENBQUMsQ0FBQztnQkFDakQsQ0FBQztnQkFDRCxRQUFRLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztvQkFDbkIsS0FBSyxvQkFBb0I7d0JBQ3hCLE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsSUFBSSxhQUFhLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQztnQkFDdEQsQ0FBQztnQkFDRCxPQUFPLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLElBQUksaUJBQWlCLEVBQUUsQ0FBQyxDQUFDO1lBRWpELEtBQUssaUJBQWlCO2dCQUNyQixPQUFPLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLElBQUksY0FBYyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUM7WUFDdkQsS0FBSyx1QkFBdUI7Z0JBQzNCLE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsSUFBSSxjQUFjLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQztZQUN0RCxLQUFLLFFBQVE7Z0JBQ1osT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxJQUFJLGNBQWMsRUFBRSxDQUFDLENBQUM7WUFDOUM7Z0JBQ0MsT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxJQUFJLGlCQUFpQixFQUFFLENBQUMsQ0FBQztRQUNsRCxDQUFDO0lBQ0YsQ0FBQzs7QUFPRixNQUFNLE9BQU8sdUJBQXdCLFNBQVEsY0FBYztJQUcxRCxZQUNpQixJQUEwQixFQUMxQixXQUFtQixFQUNuQixJQUFpQztRQUM5QyxLQUFLLEVBQUUsQ0FBQztRQUhLLFNBQUksR0FBSixJQUFJLENBQXNCO1FBQzFCLGdCQUFXLEdBQVgsV0FBVyxDQUFRO1FBQ25CLFNBQUksR0FBSixJQUFJLENBQTZCO1FBTGxDLGFBQVEsR0FBRyxJQUFJLENBQUM7UUFDaEIsWUFBTyxHQUFHLGVBQWUsQ0FBQztJQUs3QixDQUFDO0lBRUwsUUFBUSxLQUFLLE9BQU8sR0FBRyxJQUFJLENBQUMsUUFBUSxJQUFJLElBQUksQ0FBQyxPQUFPLElBQUksSUFBSSxDQUFDLElBQUksSUFBSSxJQUFJLENBQUMsV0FBVyxJQUFJLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFFekcsUUFBUSxLQUFhLE9BQU8sV0FBVyxDQUFDLENBQUMsQ0FBQztDQUNqRDtBQUVELE1BQU0sY0FBZSxTQUFRLGNBQWM7SUFHMUMsWUFDaUIsSUFBMEI7UUFDdkMsS0FBSyxFQUFFLENBQUM7UUFESyxTQUFJLEdBQUosSUFBSSxDQUFzQjtRQUgzQixhQUFRLEdBQUcsSUFBSSxDQUFDO1FBQ2hCLFlBQU8sR0FBRyxNQUFNLENBQUM7SUFHcEIsQ0FBQztJQUVMLFFBQVEsS0FBSyxPQUFPLEdBQUcsSUFBSSxDQUFDLFFBQVEsSUFBSSxJQUFJLENBQUMsT0FBTyxJQUFJLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFFeEUsUUFBUSxLQUFhLE9BQU8sV0FBVyxDQUFDLENBQUMsQ0FBQztDQUNqRDtBQUVELE1BQU0sYUFBYyxTQUFRLGNBQWM7SUFFekMsWUFDaUIsT0FBc0M7UUFDbkQsS0FBSyxFQUFFLENBQUM7UUFESyxZQUFPLEdBQVAsT0FBTyxDQUErQjtRQUZ2QyxhQUFRLEdBQUcsS0FBSyxDQUFDO0lBR3BCLENBQUM7SUFFTCxRQUFRLEtBQUssT0FBTyxHQUFHLElBQUksQ0FBQyxRQUFRLElBQUksSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsQ0FBQztJQUUzRCxRQUFRLEtBQWEsT0FBTyxJQUFJLENBQUMsT0FBTyxLQUFLLFFBQVEsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDO0NBQzNGO0FBRUQsTUFBTSxjQUFlLFNBQVEsY0FBYztJQUUxQztRQUFnQixLQUFLLEVBQUUsQ0FBQztRQURSLGFBQVEsR0FBRyxNQUFNLENBQUM7SUFDVCxDQUFDO0lBRWpCLFFBQVEsS0FBSyxPQUFPLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDO0lBRXRDLFFBQVEsS0FBYSxPQUFPLFdBQVcsQ0FBQyxDQUFDLENBQUM7Q0FDakQ7QUFFRCwrREFBK0Q7QUFDL0QsTUFBTSxrQkFBbUIsU0FBUSxjQUFjO0lBRTlDO1FBQWdCLEtBQUssRUFBRSxDQUFDO1FBRFIsYUFBUSxHQUFHLFVBQVUsQ0FBQztJQUNiLENBQUM7SUFFakIsUUFBUSxLQUFLLE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUM7SUFFdEMsUUFBUSxLQUFhLE9BQU8sV0FBVyxDQUFDLENBQUMsQ0FBQztDQUNqRDtBQUVELE1BQU0saUJBQWtCLFNBQVEsY0FBYztJQUU3QztRQUFnQixLQUFLLEVBQUUsQ0FBQztRQURSLGFBQVEsR0FBRyxTQUFTLENBQUM7SUFDWixDQUFDO0lBRWpCLFFBQVEsS0FBSyxPQUFPLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDO0lBRXRDLFFBQVEsS0FBYSxPQUFPLFdBQVcsQ0FBQyxDQUFDLENBQUM7Q0FDakQ7QUFFTSxJQUFNLHNCQUFzQixHQUE1QixNQUFNLHNCQUFzRyxTQUFRLFVBQVU7SUFNcEksWUFDa0IsWUFBb0QsRUFDL0MsWUFBbUQ7UUFFekUsS0FBSyxFQUFFLENBQUM7UUFIUyxpQkFBWSxHQUFaLFlBQVksQ0FBd0M7UUFDOUIsaUJBQVksR0FBWixZQUFZLENBQXNCO1FBTHpELGNBQVMsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksZUFBZSxFQUFFLENBQUMsQ0FBQztRQUMzRCxjQUFTLEdBQWtCLE9BQU8sQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQVFwRCxJQUFJLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxNQUFNLEdBQUcsZUFBZSxDQUFDLElBQUksRUFBRSxZQUFZLENBQUMsS0FBSyxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUM7UUFDM0UsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO1FBRWhCLElBQUksQ0FBQyxZQUFZLENBQUMseUJBQXlCLENBQUMsS0FBSyxFQUFFLGtCQUFrQixFQUFFLEVBQUUsb0JBQW9CLEVBQUUsR0FBRyxFQUFFLEVBQUUsVUFBVSxDQUFDLENBQUM7SUFDbkgsQ0FBQztJQUVELEtBQUssQ0FBQyxRQUFRO1FBQ2IsSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLEVBQUUsQ0FBQztRQUN2QixNQUFNLFFBQVEsR0FBRyx3QkFBd0IsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsTUFBTSxDQUFDLGFBQWEsQ0FBQyxFQUFFLENBQUM7UUFDM0csTUFBTSxDQUFDLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQztRQUN6QixJQUFJLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQztRQUNoRSxNQUFNLENBQUMsQ0FBQztJQUNULENBQUM7SUFFTyxLQUFLLENBQUMsSUFBSSxDQUFDLFFBQW1JO1FBQ3JKLE1BQU0sTUFBTSxHQUFHLElBQUksV0FBVyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQ3pDLE9BQU8sSUFBSSxFQUFFLENBQUM7WUFDYixJQUFJLE1BQU0sR0FBRyxNQUFNLE1BQU0sQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUNqQyxJQUFJLE1BQU0sS0FBSyxzQkFBc0IsRUFBRSxDQUFDO2dCQUN2QyxPQUFPO1lBQ1IsQ0FBQztpQkFBTSxJQUFJLFVBQVUsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDO2dCQUMvQixNQUFNLEtBQUssR0FBRyxNQUFNLENBQUM7Z0JBRXJCLElBQUksSUFBSSxHQUFHLEtBQUssQ0FBQztnQkFDakIsSUFBSSxRQUFRLEdBQUcsbUJBQW1CLENBQUMsS0FBdUMsQ0FBQztnQkFFM0UsR0FBRyxDQUFDO29CQUNILE1BQU0sQ0FBQyxtQkFBbUIsRUFBRSxDQUFDO29CQUM3QixJQUFJLEdBQUcsTUFBTSxDQUFDO29CQUNkLFFBQVEsR0FBRyxRQUFRLENBQUMsT0FBTyxDQUFDLG1CQUFtQixDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7b0JBQ3pGLE1BQU0saUJBQWlCLEdBQUcsTUFBTSxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxDQUFDO29CQUN6RCxJQUFJLENBQUMsaUJBQWlCLEVBQUUsQ0FBQzt3QkFDeEIsTUFBTTtvQkFDUCxDQUFDO29CQUNELE1BQU0sR0FBRyxpQkFBaUIsQ0FBQztnQkFDNUIsQ0FBQyxRQUFRLE1BQU0sS0FBSyxzQkFBc0IsSUFBSSxVQUFVLENBQUMsTUFBTSxDQUFDLEVBQUU7Z0JBRWxFLElBQUksQ0FBQyxRQUFRLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQztvQkFDekIsTUFBTSxJQUFJLEdBQUcsUUFBUSxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUM7b0JBQzNDLE1BQU0sUUFBUSxHQUFHLE1BQU0sSUFBSSxDQUFDLFlBQVksQ0FBQyx5QkFBeUIsQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLG9CQUFvQixFQUFFLEdBQUcsRUFBRSxFQUFFLFVBQVUsQ0FBQyxDQUFDO29CQUN2SixNQUFNLElBQUksR0FBRyxRQUFRLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUM7b0JBQzFDLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsU0FBUyxFQUFFLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQztnQkFDbEQsQ0FBQztZQUNGLENBQUM7aUJBQU0sQ0FBQztnQkFDUCxNQUFNLENBQUMsbUJBQW1CLEVBQUUsQ0FBQztnQkFDN0IsTUFBTSxDQUFDLEdBQUcsbUJBQW1CLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7Z0JBQ3RFLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUUsU0FBUyxFQUFFLEVBQUUsSUFBSSxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDdkQsQ0FBQztRQUNGLENBQUM7SUFDRixDQUFDO0lBRUQsS0FBSyxDQUFDLFlBQVk7UUFDakIsTUFBTSxJQUFJLENBQUMsWUFBWSxDQUFDLFlBQVksRUFBRSxDQUFDO1FBQ3ZDLE1BQU0sSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO0lBQ3ZCLENBQUM7Q0FDRCxDQUFBO0FBbkVZLHNCQUFzQjtJQVFoQyxXQUFBLG9CQUFvQixDQUFBO0dBUlYsc0JBQXNCLENBbUVsQzs7QUFFRCxTQUFTLFVBQVUsQ0FBQyxJQUF3RztJQUMzSCxPQUFPLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFO1FBQzNELElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxLQUFLLElBQUksSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLEtBQUssTUFBTSxFQUFFLENBQUM7WUFDekUsT0FBTyxJQUFJLENBQUM7UUFDYixDQUFDO1FBQ0QsT0FBTyxLQUFLLENBQUM7SUFDZCxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ0wsQ0FBQztBQUVELE1BQU0sT0FBTyxzQkFBK0QsU0FBUSxVQUFVO0lBRzdGLFlBQ2tCLFlBQW9EO1FBRXJFLEtBQUssRUFBRSxDQUFDO1FBRlMsaUJBQVksR0FBWixZQUFZLENBQXdDO1FBSXJFLE1BQU0sQ0FBQyxHQUFHLElBQUksQ0FBQyxLQUFLLEdBQUcsZUFBZSxDQUFDLElBQUksRUFBRSxZQUFZLENBQUMsS0FBSyxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUM7UUFFdkUsSUFBSSxTQUFTLEdBQVcsSUFBSSxDQUFDLFlBQVksQ0FBQyxLQUFLLENBQUMsR0FBRyxFQUFFLENBQUMsS0FBSyxDQUFDO1FBQzVELElBQUksQ0FBQyxTQUFTLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsS0FBSyxFQUFFLENBQUMsR0FBRyxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsRUFBRTtZQUM1RSxNQUFNLFNBQVMsR0FBRyxtQkFBbUIsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO1lBRXRFLE1BQU0sQ0FBQyxHQUFHLFNBQVMsQ0FBQywyQkFBMkIsQ0FBQyxTQUFTLENBQUMsQ0FBQztZQUMzRCxTQUFTLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQztZQUV0QixDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxTQUFTLEVBQUUsRUFBRSxJQUFJLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUNwQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztJQUVELEtBQUssQ0FBQyxZQUFZO1FBQ2pCLE1BQU0sSUFBSSxDQUFDLFlBQVksQ0FBQyxZQUFZLEVBQUUsQ0FBQztJQUN4QyxDQUFDO0NBQ0Q7QUFFRDs7R0FFRztBQUNILE1BQU0sVUFBVSx1QkFBdUIsQ0FBQyxxQkFBa0UsRUFBRSxLQUFzQjtJQUNqSSxNQUFNLGlCQUFpQixHQUFtRDtRQUN6RSxLQUFLLEVBQUUsa0JBQWtCLENBQUMscUJBQXFCLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxLQUFLLENBQUM7UUFDcEksWUFBWSxFQUFFLEdBQUcsRUFBRSxDQUFDLHFCQUFxQixDQUFDLFlBQVksRUFBRTtLQUN4RCxDQUFDO0lBQ0YsT0FBTyxpQkFBaUIsQ0FBQztBQUMxQixDQUFDIn0=