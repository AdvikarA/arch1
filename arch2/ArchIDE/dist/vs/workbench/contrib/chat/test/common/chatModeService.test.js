/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { timeout } from '../../../../../base/common/async.js';
import { Emitter } from '../../../../../base/common/event.js';
import { URI } from '../../../../../base/common/uri.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { IContextKeyService } from '../../../../../platform/contextkey/common/contextkey.js';
import { TestInstantiationService } from '../../../../../platform/instantiation/test/common/instantiationServiceMock.js';
import { MockContextKeyService } from '../../../../../platform/keybinding/test/common/mockKeybindingService.js';
import { ILogService, NullLogService } from '../../../../../platform/log/common/log.js';
import { IStorageService } from '../../../../../platform/storage/common/storage.js';
import { TestStorageService } from '../../../../test/common/workbenchTestServices.js';
import { IChatAgentService } from '../../common/chatAgents.js';
import { ChatMode, ChatModeService } from '../../common/chatModes.js';
import { ChatModeKind } from '../../common/constants.js';
import { IPromptsService } from '../../common/promptSyntax/service/promptsService.js';
import { MockPromptsService } from './mockPromptsService.js';
class TestChatAgentService {
    constructor() {
        this._hasToolsAgent = true;
        this._onDidChangeAgents = new Emitter();
        this.onDidChangeAgents = this._onDidChangeAgents.event;
    }
    get hasToolsAgent() {
        return this._hasToolsAgent;
    }
    setHasToolsAgent(value) {
        this._hasToolsAgent = value;
        this._onDidChangeAgents.fire(undefined);
    }
}
suite('ChatModeService', () => {
    const testDisposables = ensureNoDisposablesAreLeakedInTestSuite();
    let instantiationService;
    let promptsService;
    let chatAgentService;
    let storageService;
    let chatModeService;
    setup(async () => {
        instantiationService = testDisposables.add(new TestInstantiationService());
        promptsService = new MockPromptsService();
        chatAgentService = new TestChatAgentService();
        storageService = testDisposables.add(new TestStorageService());
        instantiationService.stub(IPromptsService, promptsService);
        instantiationService.stub(IChatAgentService, chatAgentService);
        instantiationService.stub(IStorageService, storageService);
        instantiationService.stub(ILogService, new NullLogService());
        instantiationService.stub(IContextKeyService, new MockContextKeyService());
        chatModeService = testDisposables.add(instantiationService.createInstance(ChatModeService));
    });
    test('should return builtin modes', () => {
        const modes = chatModeService.getModes();
        assert.strictEqual(modes.builtin.length, 3);
        assert.strictEqual(modes.custom.length, 0);
        // Check that Ask mode is always present
        const askMode = modes.builtin.find(mode => mode.id === ChatModeKind.Ask);
        assert.ok(askMode);
        assert.strictEqual(askMode.name, 'Ask');
        assert.strictEqual(askMode.kind, ChatModeKind.Ask);
    });
    test('should adjust builtin modes based on tools agent availability', () => {
        // With tools agent
        chatAgentService.setHasToolsAgent(true);
        let modes = chatModeService.getModes();
        assert.ok(modes.builtin.find(mode => mode.id === ChatModeKind.Agent));
        // Without tools agent - Agent mode should not be present
        chatAgentService.setHasToolsAgent(false);
        modes = chatModeService.getModes();
        assert.strictEqual(modes.builtin.find(mode => mode.id === ChatModeKind.Agent), undefined);
        // But Ask and Edit modes should always be present
        assert.ok(modes.builtin.find(mode => mode.id === ChatModeKind.Ask));
        assert.ok(modes.builtin.find(mode => mode.id === ChatModeKind.Edit));
    });
    test('should find builtin modes by id', () => {
        const agentMode = chatModeService.findModeById(ChatModeKind.Agent);
        assert.ok(agentMode);
        assert.strictEqual(agentMode.id, ChatMode.Agent.id);
        assert.strictEqual(agentMode.kind, ChatModeKind.Agent);
    });
    test('should return undefined for non-existent mode', () => {
        const mode = chatModeService.findModeById('non-existent-mode');
        assert.strictEqual(mode, undefined);
    });
    test('should handle custom modes from prompts service', async () => {
        const customMode = {
            uri: URI.parse('file:///test/custom-mode.md'),
            name: 'Test Mode',
            description: 'A test custom mode',
            tools: ['tool1', 'tool2'],
            body: 'Custom mode body'
        };
        promptsService.setCustomModes([customMode]);
        // Wait for the service to refresh
        await timeout(0);
        const modes = chatModeService.getModes();
        assert.strictEqual(modes.custom.length, 1);
        const testMode = modes.custom[0];
        assert.strictEqual(testMode.id, customMode.uri.toString());
        assert.strictEqual(testMode.name, customMode.name);
        assert.strictEqual(testMode.description.get(), customMode.description);
        assert.strictEqual(testMode.kind, ChatModeKind.Agent);
        assert.deepStrictEqual(testMode.customTools?.get(), customMode.tools);
        assert.strictEqual(testMode.body?.get(), customMode.body);
        assert.strictEqual(testMode.uri?.get().toString(), customMode.uri.toString());
    });
    test('should fire change event when custom modes are updated', async () => {
        let eventFired = false;
        testDisposables.add(chatModeService.onDidChangeChatModes(() => {
            eventFired = true;
        }));
        const customMode = {
            uri: URI.parse('file:///test/custom-mode.md'),
            name: 'Test Mode',
            description: 'A test custom mode',
            tools: [],
            body: 'Custom mode body'
        };
        promptsService.setCustomModes([customMode]);
        // Wait for the event to fire
        await timeout(0);
        assert.ok(eventFired);
    });
    test('should find custom modes by id', async () => {
        const customMode = {
            uri: URI.parse('file:///test/findable-mode.md'),
            name: 'Findable Mode',
            description: 'A findable custom mode',
            tools: [],
            body: 'Findable mode body'
        };
        promptsService.setCustomModes([customMode]);
        // Wait for the service to refresh
        await timeout(0);
        const foundMode = chatModeService.findModeById(customMode.uri.toString());
        assert.ok(foundMode);
        assert.strictEqual(foundMode.id, customMode.uri.toString());
        assert.strictEqual(foundMode.name, customMode.name);
    });
    test('should update existing custom mode instances when data changes', async () => {
        const uri = URI.parse('file:///test/updateable-mode.md');
        const initialMode = {
            uri,
            name: 'Initial Mode',
            description: 'Initial description',
            tools: ['tool1'],
            body: 'Initial body',
            model: 'gpt-4'
        };
        promptsService.setCustomModes([initialMode]);
        await timeout(0);
        const initialModes = chatModeService.getModes();
        const initialCustomMode = initialModes.custom[0];
        assert.strictEqual(initialCustomMode.description.get(), 'Initial description');
        // Update the mode data
        const updatedMode = {
            ...initialMode,
            description: 'Updated description',
            tools: ['tool1', 'tool2'],
            body: 'Updated body',
            model: 'Updated model'
        };
        promptsService.setCustomModes([updatedMode]);
        await timeout(0);
        const updatedModes = chatModeService.getModes();
        const updatedCustomMode = updatedModes.custom[0];
        // The instance should be the same (reused)
        assert.strictEqual(initialCustomMode, updatedCustomMode);
        // But the observable properties should be updated
        assert.strictEqual(updatedCustomMode.description.get(), 'Updated description');
        assert.deepStrictEqual(updatedCustomMode.customTools?.get(), ['tool1', 'tool2']);
        assert.strictEqual(updatedCustomMode.body?.get(), 'Updated body');
        assert.strictEqual(updatedCustomMode.model?.get(), 'Updated model');
    });
    test('should remove custom modes that no longer exist', async () => {
        const mode1 = {
            uri: URI.parse('file:///test/mode1.md'),
            name: 'Mode 1',
            description: 'First mode',
            tools: [],
            body: 'Mode 1 body'
        };
        const mode2 = {
            uri: URI.parse('file:///test/mode2.md'),
            name: 'Mode 2',
            description: 'Second mode',
            tools: [],
            body: 'Mode 2 body'
        };
        // Add both modes
        promptsService.setCustomModes([mode1, mode2]);
        await timeout(0);
        let modes = chatModeService.getModes();
        assert.strictEqual(modes.custom.length, 2);
        // Remove one mode
        promptsService.setCustomModes([mode1]);
        await timeout(0);
        modes = chatModeService.getModes();
        assert.strictEqual(modes.custom.length, 1);
        assert.strictEqual(modes.custom[0].id, mode1.uri.toString());
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdE1vZGVTZXJ2aWNlLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9hZHZpa2FyL0RvY3VtZW50cy9hcmNoaXRlY3QvYXJjaDIvQXJjaElERS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L3Rlc3QvY29tbW9uL2NoYXRNb2RlU2VydmljZS50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDOUQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQzlELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUN4RCxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUNuRyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUM3RixPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSwrRUFBK0UsQ0FBQztBQUN6SCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSx5RUFBeUUsQ0FBQztBQUNoSCxPQUFPLEVBQUUsV0FBVyxFQUFFLGNBQWMsRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBQ3hGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUNwRixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUN0RixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQztBQUMvRCxPQUFPLEVBQUUsUUFBUSxFQUFFLGVBQWUsRUFBRSxNQUFNLDJCQUEyQixDQUFDO0FBQ3RFLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQztBQUN6RCxPQUFPLEVBQW1CLGVBQWUsRUFBRSxNQUFNLHFEQUFxRCxDQUFD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