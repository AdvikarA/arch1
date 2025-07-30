/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter } from '../../../../../base/common/event.js';
export class MockPromptsService {
    constructor() {
        this._onDidChangeCustomChatModes = new Emitter();
        this.onDidChangeCustomChatModes = this._onDidChangeCustomChatModes.event;
        this._customModes = [];
    }
    setCustomModes(modes) {
        this._customModes = modes;
        this._onDidChangeCustomChatModes.fire();
    }
    async getCustomChatModes(token) {
        return this._customModes;
    }
    // Stub implementations for required interface methods
    getSyntaxParserFor(_model) { throw new Error('Not implemented'); }
    listPromptFiles(_type) { throw new Error('Not implemented'); }
    getSourceFolders(_type) { throw new Error('Not implemented'); }
    asPromptSlashCommand(_command) { return undefined; }
    resolvePromptSlashCommand(_data, _token) { throw new Error('Not implemented'); }
    findPromptSlashCommands() { throw new Error('Not implemented'); }
    parse(_uri, _type, _token) { throw new Error('Not implemented'); }
    getPromptFileType(_resource) { return undefined; }
    dispose() { }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9ja1Byb21wdHNTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvYWR2aWthci9Eb2N1bWVudHMvYXJjaGl0ZWN0L2FyY2gyL0FyY2hJREUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC90ZXN0L2NvbW1vbi9tb2NrUHJvbXB0c1NlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBSTlELE1BQU0sT0FBTyxrQkFBa0I7SUFBL0I7UUFHa0IsZ0NBQTJCLEdBQUcsSUFBSSxPQUFPLEVBQVEsQ0FBQztRQUMxRCwrQkFBMEIsR0FBRyxJQUFJLENBQUMsMkJBQTJCLENBQUMsS0FBSyxDQUFDO1FBRXJFLGlCQUFZLEdBQXNCLEVBQUUsQ0FBQztJQXFCOUMsQ0FBQztJQW5CQSxjQUFjLENBQUMsS0FBd0I7UUFDdEMsSUFBSSxDQUFDLFlBQVksR0FBRyxLQUFLLENBQUM7UUFDMUIsSUFBSSxDQUFDLDJCQUEyQixDQUFDLElBQUksRUFBRSxDQUFDO0lBQ3pDLENBQUM7SUFFRCxLQUFLLENBQUMsa0JBQWtCLENBQUMsS0FBd0I7UUFDaEQsT0FBTyxJQUFJLENBQUMsWUFBWSxDQUFDO0lBQzFCLENBQUM7SUFFRCxzREFBc0Q7SUFDdEQsa0JBQWtCLENBQUMsTUFBVyxJQUFTLE1BQU0sSUFBSSxLQUFLLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDNUUsZUFBZSxDQUFDLEtBQVUsSUFBNkIsTUFBTSxJQUFJLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUM1RixnQkFBZ0IsQ0FBQyxLQUFVLElBQW9CLE1BQU0sSUFBSSxLQUFLLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDcEYsb0JBQW9CLENBQUMsUUFBZ0IsSUFBUyxPQUFPLFNBQVMsQ0FBQyxDQUFDLENBQUM7SUFDakUseUJBQXlCLENBQUMsS0FBVSxFQUFFLE1BQXlCLElBQWtCLE1BQU0sSUFBSSxLQUFLLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDdEgsdUJBQXVCLEtBQXFCLE1BQU0sSUFBSSxLQUFLLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDakYsS0FBSyxDQUFDLElBQVMsRUFBRSxLQUFVLEVBQUUsTUFBeUIsSUFBa0IsTUFBTSxJQUFJLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUM3RyxpQkFBaUIsQ0FBQyxTQUFjLElBQVMsT0FBTyxTQUFTLENBQUMsQ0FBQyxDQUFDO0lBQzVELE9BQU8sS0FBVyxDQUFDO0NBQ25CIn0=