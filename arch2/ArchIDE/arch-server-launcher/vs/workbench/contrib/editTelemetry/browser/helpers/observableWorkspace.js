/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { derivedHandleChanges, derivedWithStore, observableValue, autorunWithStore, runOnChange } from '../../../../../base/common/observable.js';
import { StringEdit } from '../../../../../editor/common/core/edits/stringEdit.js';
export class ObservableWorkspace {
    constructor() {
        this._version = 0;
        /**
         * Is fired when any open document changes.
        */
        this.onDidOpenDocumentChange = derivedHandleChanges({
            owner: this,
            changeTracker: {
                createChangeSummary: () => ({ didChange: false }),
                handleChange: (ctx, changeSummary) => {
                    if (!ctx.didChange(this.documents)) {
                        changeSummary.didChange = true; // A document changed
                    }
                    return true;
                }
            }
        }, (reader, changeSummary) => {
            const docs = this.documents.read(reader);
            for (const d of docs) {
                d.value.read(reader); // add dependency
            }
            if (changeSummary.didChange) {
                this._version++; // to force a change
            }
            return this._version;
            // TODO@hediet make this work:
            /*
            const docs = this.openDocuments.read(reader);
            for (const d of docs) {
                if (reader.readChangesSinceLastRun(d.value).length > 0) {
                    reader.reportChange(d);
                }
            }
            return undefined;
            */
        });
        this.lastActiveDocument = derivedWithStore((_reader, store) => {
            const obs = observableValue('lastActiveDocument', undefined);
            store.add(autorunWithStore((reader, store) => {
                const docs = this.documents.read(reader);
                for (const d of docs) {
                    store.add(runOnChange(d.value, () => {
                        obs.set(d, undefined);
                    }));
                }
            }));
            return obs;
        }).flatten();
    }
    getFirstOpenDocument() {
        return this.documents.get()[0];
    }
    getDocument(documentId) {
        return this.documents.get().find(d => d.uri.toString() === documentId.toString());
    }
}
export class StringEditWithReason extends StringEdit {
    constructor(replacements, reason) {
        super(replacements);
        this.reason = reason;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib2JzZXJ2YWJsZVdvcmtzcGFjZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL2FkdmlrYXIvRG9jdW1lbnRzL2FyY2hpdGVjdC9hcmNoMi9BcmNoSURFL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2VkaXRUZWxlbWV0cnkvYnJvd3Nlci9oZWxwZXJzL29ic2VydmFibGVXb3Jrc3BhY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUF5QixvQkFBb0IsRUFBRSxnQkFBZ0IsRUFBRSxlQUFlLEVBQUUsZ0JBQWdCLEVBQUUsV0FBVyxFQUFlLE1BQU0sMENBQTBDLENBQUM7QUFFdEwsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHVEQUF1RCxDQUFDO0FBSW5GLE1BQU0sT0FBZ0IsbUJBQW1CO0lBQXpDO1FBWVMsYUFBUSxHQUFHLENBQUMsQ0FBQztRQUVyQjs7VUFFRTtRQUNjLDRCQUF1QixHQUFHLG9CQUFvQixDQUFDO1lBQzlELEtBQUssRUFBRSxJQUFJO1lBQ1gsYUFBYSxFQUFFO2dCQUNkLG1CQUFtQixFQUFFLEdBQUcsRUFBRSxDQUFDLENBQUMsRUFBRSxTQUFTLEVBQUUsS0FBSyxFQUFFLENBQUM7Z0JBQ2pELFlBQVksRUFBRSxDQUFDLEdBQUcsRUFBRSxhQUFhLEVBQUUsRUFBRTtvQkFDcEMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUM7d0JBQ3BDLGFBQWEsQ0FBQyxTQUFTLEdBQUcsSUFBSSxDQUFDLENBQUMscUJBQXFCO29CQUN0RCxDQUFDO29CQUNELE9BQU8sSUFBSSxDQUFDO2dCQUNiLENBQUM7YUFDRDtTQUNELEVBQUUsQ0FBQyxNQUFNLEVBQUUsYUFBYSxFQUFFLEVBQUU7WUFDNUIsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDekMsS0FBSyxNQUFNLENBQUMsSUFBSSxJQUFJLEVBQUUsQ0FBQztnQkFDdEIsQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxpQkFBaUI7WUFDeEMsQ0FBQztZQUNELElBQUksYUFBYSxDQUFDLFNBQVMsRUFBRSxDQUFDO2dCQUM3QixJQUFJLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQyxvQkFBb0I7WUFDdEMsQ0FBQztZQUNELE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQztZQUVyQiw4QkFBOEI7WUFDOUI7Ozs7Ozs7O2NBUUU7UUFDSCxDQUFDLENBQUMsQ0FBQztRQUVhLHVCQUFrQixHQUFHLGdCQUFnQixDQUFDLENBQUMsT0FBTyxFQUFFLEtBQUssRUFBRSxFQUFFO1lBQ3hFLE1BQU0sR0FBRyxHQUFHLGVBQWUsQ0FBQyxvQkFBb0IsRUFBRSxTQUE0QyxDQUFDLENBQUM7WUFDaEcsS0FBSyxDQUFDLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLE1BQU0sRUFBRSxLQUFLLEVBQUUsRUFBRTtnQkFDNUMsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7Z0JBQ3pDLEtBQUssTUFBTSxDQUFDLElBQUksSUFBSSxFQUFFLENBQUM7b0JBQ3RCLEtBQUssQ0FBQyxHQUFHLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUUsR0FBRyxFQUFFO3dCQUNuQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxTQUFTLENBQUMsQ0FBQztvQkFDdkIsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDTCxDQUFDO1lBQ0YsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNKLE9BQU8sR0FBRyxDQUFDO1FBQ1osQ0FBQyxDQUFDLENBQUMsT0FBTyxFQUFFLENBQUM7SUFDZCxDQUFDO0lBMURBLG9CQUFvQjtRQUNuQixPQUFPLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDaEMsQ0FBQztJQUVELFdBQVcsQ0FBQyxVQUFlO1FBQzFCLE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxLQUFLLFVBQVUsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDO0lBQ25GLENBQUM7Q0FvREQ7QUFhRCxNQUFNLE9BQU8sb0JBQXFCLFNBQVEsVUFBVTtJQUNuRCxZQUNDLFlBQXdDLEVBQ3hCLE1BQTJCO1FBRTNDLEtBQUssQ0FBQyxZQUFZLENBQUMsQ0FBQztRQUZKLFdBQU0sR0FBTixNQUFNLENBQXFCO0lBRzVDLENBQUM7Q0FDRCJ9