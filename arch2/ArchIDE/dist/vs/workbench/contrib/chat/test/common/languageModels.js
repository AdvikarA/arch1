/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Event } from '../../../../../base/common/event.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
export class NullLanguageModelsService {
    constructor() {
        this.onDidChangeLanguageModels = Event.None;
    }
    registerLanguageModelProvider(vendor, provider) {
        return Disposable.None;
    }
    updateModelPickerPreference(modelIdentifier, showInModelPicker) {
        return;
    }
    getVendors() {
        return [];
    }
    getLanguageModelIds() {
        return [];
    }
    lookupLanguageModel(identifier) {
        return undefined;
    }
    async selectLanguageModels(selector) {
        return [];
    }
    sendChatRequest(identifier, from, messages, options, token) {
        throw new Error('Method not implemented.');
    }
    computeTokenLength(identifier, message, token) {
        throw new Error('Method not implemented.');
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGFuZ3VhZ2VNb2RlbHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9hZHZpa2FyL0RvY3VtZW50cy9hcmNoaXRlY3QvYXJjaDIvQXJjaElERS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L3Rlc3QvY29tbW9uL2xhbmd1YWdlTW9kZWxzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUM1RCxPQUFPLEVBQUUsVUFBVSxFQUFlLE1BQU0seUNBQXlDLENBQUM7QUFJbEYsTUFBTSxPQUFPLHlCQUF5QjtJQUF0QztRQU9DLDhCQUF5QixHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUM7SUE2QnhDLENBQUM7SUFqQ0EsNkJBQTZCLENBQUMsTUFBYyxFQUFFLFFBQW9DO1FBQ2pGLE9BQU8sVUFBVSxDQUFDLElBQUksQ0FBQztJQUN4QixDQUFDO0lBSUQsMkJBQTJCLENBQUMsZUFBdUIsRUFBRSxpQkFBMEI7UUFDOUUsT0FBTztJQUNSLENBQUM7SUFFRCxVQUFVO1FBQ1QsT0FBTyxFQUFFLENBQUM7SUFDWCxDQUFDO0lBRUQsbUJBQW1CO1FBQ2xCLE9BQU8sRUFBRSxDQUFDO0lBQ1gsQ0FBQztJQUVELG1CQUFtQixDQUFDLFVBQWtCO1FBQ3JDLE9BQU8sU0FBUyxDQUFDO0lBQ2xCLENBQUM7SUFFRCxLQUFLLENBQUMsb0JBQW9CLENBQUMsUUFBb0M7UUFDOUQsT0FBTyxFQUFFLENBQUM7SUFDWCxDQUFDO0lBRUQsZUFBZSxDQUFDLFVBQWtCLEVBQUUsSUFBeUIsRUFBRSxRQUF3QixFQUFFLE9BQWdDLEVBQUUsS0FBd0I7UUFDbEosTUFBTSxJQUFJLEtBQUssQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDO0lBQzVDLENBQUM7SUFFRCxrQkFBa0IsQ0FBQyxVQUFrQixFQUFFLE9BQThCLEVBQUUsS0FBd0I7UUFDOUYsTUFBTSxJQUFJLEtBQUssQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDO0lBQzVDLENBQUM7Q0FDRCJ9