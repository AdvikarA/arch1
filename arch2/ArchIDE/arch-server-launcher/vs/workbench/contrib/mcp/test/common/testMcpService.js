/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { observableValue } from '../../../../../base/common/observable.js';
export class TestMcpService {
    constructor() {
        this.servers = observableValue(this, []);
        this.lazyCollectionState = observableValue(this, { state: 2 /* LazyCollectionState.AllKnown */, collections: [] });
    }
    resetCaches() {
    }
    resetTrust() {
    }
    activateCollections() {
        return Promise.resolve();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdE1jcFNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9hZHZpa2FyL0RvY3VtZW50cy9hcmNoaXRlY3QvYXJjaDIvQXJjaElERS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9tY3AvdGVzdC9jb21tb24vdGVzdE1jcFNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBRzNFLE1BQU0sT0FBTyxjQUFjO0lBQTNCO1FBRVEsWUFBTyxHQUFHLGVBQWUsQ0FBd0IsSUFBSSxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBUTNELHdCQUFtQixHQUFHLGVBQWUsQ0FBQyxJQUFJLEVBQUUsRUFBRSxLQUFLLHNDQUE4QixFQUFFLFdBQVcsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDO0lBSzlHLENBQUM7SUFaQSxXQUFXO0lBRVgsQ0FBQztJQUNELFVBQVU7SUFFVixDQUFDO0lBSUQsbUJBQW1CO1FBQ2xCLE9BQU8sT0FBTyxDQUFDLE9BQU8sRUFBRSxDQUFDO0lBQzFCLENBQUM7Q0FDRCJ9