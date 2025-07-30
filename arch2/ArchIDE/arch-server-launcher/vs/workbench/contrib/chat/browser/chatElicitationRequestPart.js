/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter } from '../../../../base/common/event.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
export class ChatElicitationRequestPart extends Disposable {
    constructor(title, message, originMessage, acceptButtonLabel, rejectButtonLabel, accept, reject) {
        super();
        this.title = title;
        this.message = message;
        this.originMessage = originMessage;
        this.acceptButtonLabel = acceptButtonLabel;
        this.rejectButtonLabel = rejectButtonLabel;
        this.accept = accept;
        this.reject = reject;
        this.kind = 'elicitation';
        this.state = 'pending';
        this._onDidRequestHide = this._register(new Emitter());
        this.onDidRequestHide = this._onDidRequestHide.event;
    }
    hide() {
        this._onDidRequestHide.fire();
    }
    toJSON() {
        return {
            kind: 'elicitation',
            title: this.title,
            message: this.message,
            state: this.state === 'pending' ? 'rejected' : this.state,
            acceptedResult: this.acceptedResult,
        };
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdEVsaWNpdGF0aW9uUmVxdWVzdFBhcnQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9hZHZpa2FyL0RvY3VtZW50cy9hcmNoaXRlY3QvYXJjaDIvQXJjaElERS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2Jyb3dzZXIvY2hhdEVsaWNpdGF0aW9uUmVxdWVzdFBhcnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBRTNELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUdsRSxNQUFNLE9BQU8sMEJBQTJCLFNBQVEsVUFBVTtJQVF6RCxZQUNpQixLQUErQixFQUMvQixPQUFpQyxFQUNqQyxhQUF1QyxFQUN2QyxpQkFBeUIsRUFDekIsaUJBQXlCLEVBQ3pCLE1BQTJCLEVBQzNCLE1BQTJCO1FBRTNDLEtBQUssRUFBRSxDQUFDO1FBUlEsVUFBSyxHQUFMLEtBQUssQ0FBMEI7UUFDL0IsWUFBTyxHQUFQLE9BQU8sQ0FBMEI7UUFDakMsa0JBQWEsR0FBYixhQUFhLENBQTBCO1FBQ3ZDLHNCQUFpQixHQUFqQixpQkFBaUIsQ0FBUTtRQUN6QixzQkFBaUIsR0FBakIsaUJBQWlCLENBQVE7UUFDekIsV0FBTSxHQUFOLE1BQU0sQ0FBcUI7UUFDM0IsV0FBTSxHQUFOLE1BQU0sQ0FBcUI7UUFkNUIsU0FBSSxHQUFHLGFBQWEsQ0FBQztRQUM5QixVQUFLLEdBQXdDLFNBQVMsQ0FBQztRQUd0RCxzQkFBaUIsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxFQUFRLENBQUMsQ0FBQztRQUNoRCxxQkFBZ0IsR0FBRyxJQUFJLENBQUMsaUJBQWlCLENBQUMsS0FBSyxDQUFDO0lBWWhFLENBQUM7SUFFRCxJQUFJO1FBQ0gsSUFBSSxDQUFDLGlCQUFpQixDQUFDLElBQUksRUFBRSxDQUFDO0lBQy9CLENBQUM7SUFFTSxNQUFNO1FBQ1osT0FBTztZQUNOLElBQUksRUFBRSxhQUFhO1lBQ25CLEtBQUssRUFBRSxJQUFJLENBQUMsS0FBSztZQUNqQixPQUFPLEVBQUUsSUFBSSxDQUFDLE9BQU87WUFDckIsS0FBSyxFQUFFLElBQUksQ0FBQyxLQUFLLEtBQUssU0FBUyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLO1lBQ3pELGNBQWMsRUFBRSxJQUFJLENBQUMsY0FBYztTQUNRLENBQUM7SUFDOUMsQ0FBQztDQUNEIn0=