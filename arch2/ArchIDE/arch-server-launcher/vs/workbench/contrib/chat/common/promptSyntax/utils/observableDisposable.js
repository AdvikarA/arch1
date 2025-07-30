/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Disposable, DisposableStore, toDisposable } from '../../../../../../base/common/lifecycle.js';
/**
* @deprecated do not use this, https://github.com/microsoft/vscode/issues/248366
 */
export class ObservableDisposable extends Disposable {
    constructor() {
        super(...arguments);
        /**
         * Underlying disposables store this object relies on.
         */
        this.store = this._register(new DisposableStore());
    }
    /**
     * Check if the current object is already has been disposed.
     */
    get isDisposed() {
        return this.store.isDisposed;
    }
    /**
     * The event is fired when this object is disposed.
     * Note! Executes the callback immediately if already disposed.
     *
     * @param callback The callback function to be called on updates.
     */
    onDispose(callback) {
        // if already disposed, execute the callback immediately
        if (this.isDisposed) {
            const timeoutHandle = setTimeout(callback);
            return toDisposable(() => {
                clearTimeout(timeoutHandle);
            });
        }
        return this.store.add(toDisposable(callback));
    }
    /**
     * Adds disposable object(s) to the list of disposables
     * that will be disposed with this object.
     */
    addDisposables(...disposables) {
        for (const disposable of disposables) {
            this.store.add(disposable);
        }
        return this;
    }
    /**
     * Assert that the current object was not yet disposed.
     *
     * @throws If the current object was already disposed.
     * @param error Error message or error object to throw if assertion fails.
     */
    assertNotDisposed(error) {
        assertNotDisposed(this, error);
    }
}
/**
 * @deprecated do not use this, https://github.com/microsoft/vscode/issues/248366
 */
export function assertNotDisposed(object, error) {
    if (!object.isDisposed) {
        return;
    }
    const errorToThrow = typeof error === 'string'
        ? new Error(error)
        : error;
    throw errorToThrow;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib2JzZXJ2YWJsZURpc3Bvc2FibGUuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9hZHZpa2FyL0RvY3VtZW50cy9hcmNoaXRlY3QvYXJjaDIvQXJjaElERS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2NvbW1vbi9wcm9tcHRTeW50YXgvdXRpbHMvb2JzZXJ2YWJsZURpc3Bvc2FibGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQWUsWUFBWSxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFFcEg7O0dBRUc7QUFDSCxNQUFNLE9BQWdCLG9CQUFxQixTQUFRLFVBQVU7SUFBN0Q7O1FBQ0M7O1dBRUc7UUFDYyxVQUFLLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLGVBQWUsRUFBRSxDQUFDLENBQUM7SUFtRGhFLENBQUM7SUFqREE7O09BRUc7SUFDSCxJQUFXLFVBQVU7UUFDcEIsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQztJQUM5QixDQUFDO0lBRUQ7Ozs7O09BS0c7SUFDSSxTQUFTLENBQUMsUUFBb0I7UUFDcEMsd0RBQXdEO1FBQ3hELElBQUksSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDO1lBQ3JCLE1BQU0sYUFBYSxHQUFHLFVBQVUsQ0FBQyxRQUFRLENBQUMsQ0FBQztZQUUzQyxPQUFPLFlBQVksQ0FBQyxHQUFHLEVBQUU7Z0JBQ3hCLFlBQVksQ0FBQyxhQUFhLENBQUMsQ0FBQztZQUM3QixDQUFDLENBQUMsQ0FBQztRQUNKLENBQUM7UUFFRCxPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDO0lBQy9DLENBQUM7SUFFRDs7O09BR0c7SUFDSSxjQUFjLENBQUMsR0FBRyxXQUEwQjtRQUNsRCxLQUFLLE1BQU0sVUFBVSxJQUFJLFdBQVcsRUFBRSxDQUFDO1lBQ3RDLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBQzVCLENBQUM7UUFFRCxPQUFPLElBQUksQ0FBQztJQUNiLENBQUM7SUFFRDs7Ozs7T0FLRztJQUNJLGlCQUFpQixDQUN2QixLQUFxQjtRQUVyQixpQkFBaUIsQ0FBQyxJQUFJLEVBQUUsS0FBSyxDQUFDLENBQUM7SUFDaEMsQ0FBQztDQUNEO0FBT0Q7O0dBRUc7QUFDSCxNQUFNLFVBQVUsaUJBQWlCLENBQ2hDLE1BQWUsRUFDZixLQUFxQjtJQUVyQixJQUFJLENBQUMsTUFBTSxDQUFDLFVBQVUsRUFBRSxDQUFDO1FBQ3hCLE9BQU87SUFDUixDQUFDO0lBRUQsTUFBTSxZQUFZLEdBQUcsT0FBTyxLQUFLLEtBQUssUUFBUTtRQUM3QyxDQUFDLENBQUMsSUFBSSxLQUFLLENBQUMsS0FBSyxDQUFDO1FBQ2xCLENBQUMsQ0FBQyxLQUFLLENBQUM7SUFFVCxNQUFNLFlBQVksQ0FBQztBQUNwQixDQUFDIn0=