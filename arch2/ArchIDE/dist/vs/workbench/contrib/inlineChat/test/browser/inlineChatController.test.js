/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { equals } from '../../../../../base/common/arrays.js';
import { DeferredPromise, raceCancellation, timeout } from '../../../../../base/common/async.js';
import { CancellationToken } from '../../../../../base/common/cancellation.js';
import { Emitter, Event } from '../../../../../base/common/event.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { constObservable } from '../../../../../base/common/observable.js';
import { assertType } from '../../../../../base/common/types.js';
import { mock } from '../../../../../base/test/common/mock.js';
import { runWithFakedTimers } from '../../../../../base/test/common/timeTravelScheduler.js';
import { IDiffProviderFactoryService } from '../../../../../editor/browser/widget/diffEditor/diffProviderFactoryService.js';
import { EditOperation } from '../../../../../editor/common/core/editOperation.js';
import { Range } from '../../../../../editor/common/core/range.js';
import { IEditorWorkerService } from '../../../../../editor/common/services/editorWorker.js';
import { IModelService } from '../../../../../editor/common/services/model.js';
import { ITextModelService } from '../../../../../editor/common/services/resolverService.js';
import { TestDiffProviderFactoryService } from '../../../../../editor/test/browser/diff/testDiffProviderFactoryService.js';
import { TestCommandService } from '../../../../../editor/test/browser/editorTestServices.js';
import { instantiateTestCodeEditor } from '../../../../../editor/test/browser/testCodeEditor.js';
import { IAccessibleViewService } from '../../../../../platform/accessibility/browser/accessibleView.js';
import { ICommandService } from '../../../../../platform/commands/common/commands.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { TestConfigurationService } from '../../../../../platform/configuration/test/common/testConfigurationService.js';
import { IContextKeyService } from '../../../../../platform/contextkey/common/contextkey.js';
import { IHoverService } from '../../../../../platform/hover/browser/hover.js';
import { NullHoverService } from '../../../../../platform/hover/test/browser/nullHoverService.js';
import { SyncDescriptor } from '../../../../../platform/instantiation/common/descriptors.js';
import { ServiceCollection } from '../../../../../platform/instantiation/common/serviceCollection.js';
import { MockContextKeyService } from '../../../../../platform/keybinding/test/common/mockKeybindingService.js';
import { ILogService, NullLogService } from '../../../../../platform/log/common/log.js';
import { IEditorProgressService } from '../../../../../platform/progress/common/progress.js';
import { ITelemetryService } from '../../../../../platform/telemetry/common/telemetry.js';
import { NullTelemetryService } from '../../../../../platform/telemetry/common/telemetryUtils.js';
import { IWorkspaceContextService } from '../../../../../platform/workspace/common/workspace.js';
import { IViewDescriptorService } from '../../../../common/views.js';
import { IWorkbenchAssignmentService } from '../../../../services/assignment/common/assignmentService.js';
import { NullWorkbenchAssignmentService } from '../../../../services/assignment/test/common/nullAssignmentService.js';
import { IExtensionService, nullExtensionDescription } from '../../../../services/extensions/common/extensions.js';
import { TextModelResolverService } from '../../../../services/textmodelResolver/common/textModelResolverService.js';
import { IViewsService } from '../../../../services/views/common/viewsService.js';
import { TestViewsService, workbenchInstantiationService } from '../../../../test/browser/workbenchTestServices.js';
import { TestContextService, TestExtensionService } from '../../../../test/common/workbenchTestServices.js';
import { IChatAccessibilityService, IChatWidgetService } from '../../../chat/browser/chat.js';
import { ChatInputBoxContentProvider } from '../../../chat/browser/chatEdinputInputContentProvider.js';
import { ChatVariablesService } from '../../../chat/browser/chatVariables.js';
import { ChatWidgetService } from '../../../chat/browser/chatWidget.js';
import { ChatAgentService, IChatAgentNameService, IChatAgentService } from '../../../chat/common/chatAgents.js';
import { IChatEditingService } from '../../../chat/common/chatEditingService.js';
import { IChatEntitlementService } from '../../../chat/common/chatEntitlementService.js';
import { IChatModeService } from '../../../chat/common/chatModes.js';
import { IChatService } from '../../../chat/common/chatService.js';
import { ChatService } from '../../../chat/common/chatServiceImpl.js';
import { ChatSlashCommandService, IChatSlashCommandService } from '../../../chat/common/chatSlashCommands.js';
import { IChatVariablesService } from '../../../chat/common/chatVariables.js';
import { ChatWidgetHistoryService, IChatWidgetHistoryService } from '../../../chat/common/chatWidgetHistoryService.js';
import { ChatAgentLocation, ChatModeKind } from '../../../chat/common/constants.js';
import { ILanguageModelsService, LanguageModelsService } from '../../../chat/common/languageModels.js';
import { ILanguageModelToolsService } from '../../../chat/common/languageModelToolsService.js';
import { IPromptsService } from '../../../chat/common/promptSyntax/service/promptsService.js';
import { MockChatModeService } from '../../../chat/test/common/mockChatModeService.js';
import { MockLanguageModelToolsService } from '../../../chat/test/common/mockLanguageModelToolsService.js';
import { INotebookEditorService } from '../../../notebook/browser/services/notebookEditorService.js';
import { RerunAction } from '../../browser/inlineChatActions.js';
import { InlineChatController1 } from '../../browser/inlineChatController.js';
import { IInlineChatSessionService } from '../../browser/inlineChatSessionService.js';
import { InlineChatSessionServiceImpl } from '../../browser/inlineChatSessionServiceImpl.js';
import { CTX_INLINE_CHAT_RESPONSE_TYPE } from '../../common/inlineChat.js';
import { TestWorkerService } from './testWorkerService.js';
import { ChatTransferService, IChatTransferService } from '../../../chat/common/chatTransferService.js';
import { IMcpService } from '../../../mcp/common/mcpTypes.js';
import { TestMcpService } from '../../../mcp/test/common/testMcpService.js';
suite('InlineChatController', function () {
    const agentData = {
        extensionId: nullExtensionDescription.identifier,
        publisherDisplayName: '',
        extensionDisplayName: '',
        extensionPublisherId: '',
        // id: 'testEditorAgent',
        name: 'testEditorAgent',
        isDefault: true,
        locations: [ChatAgentLocation.Editor],
        modes: [ChatModeKind.Ask],
        metadata: {},
        slashCommands: [],
        disambiguation: [],
    };
    class TestController extends InlineChatController1 {
        constructor() {
            super(...arguments);
            this.onDidChangeState = this._onDidEnterState.event;
            this.states = [];
        }
        static { this.INIT_SEQUENCE = ["CREATE_SESSION" /* State.CREATE_SESSION */, "INIT_UI" /* State.INIT_UI */, "WAIT_FOR_INPUT" /* State.WAIT_FOR_INPUT */]; }
        static { this.INIT_SEQUENCE_AUTO_SEND = [...this.INIT_SEQUENCE, "SHOW_REQUEST" /* State.SHOW_REQUEST */, "WAIT_FOR_INPUT" /* State.WAIT_FOR_INPUT */]; }
        awaitStates(states) {
            const actual = [];
            return new Promise((resolve, reject) => {
                const d = this.onDidChangeState(state => {
                    actual.push(state);
                    if (equals(states, actual)) {
                        d.dispose();
                        resolve(undefined);
                    }
                });
                setTimeout(() => {
                    d.dispose();
                    resolve(`[${states.join(',')}] <> [${actual.join(',')}]`);
                }, 1000);
            });
        }
    }
    const store = new DisposableStore();
    let configurationService;
    let editor;
    let model;
    let ctrl;
    let contextKeyService;
    let chatService;
    let chatAgentService;
    let inlineChatSessionService;
    let instaService;
    let chatWidget;
    setup(function () {
        const serviceCollection = new ServiceCollection([IConfigurationService, new TestConfigurationService()], [IChatVariablesService, new SyncDescriptor(ChatVariablesService)], [ILogService, new NullLogService()], [ITelemetryService, NullTelemetryService], [IHoverService, NullHoverService], [IExtensionService, new TestExtensionService()], [IContextKeyService, new MockContextKeyService()], [IViewsService, new class extends TestViewsService {
                async openView(id, focus) {
                    return { widget: chatWidget ?? null };
                }
            }()], [IWorkspaceContextService, new TestContextService()], [IChatWidgetHistoryService, new SyncDescriptor(ChatWidgetHistoryService)], [IChatWidgetService, new SyncDescriptor(ChatWidgetService)], [IChatSlashCommandService, new SyncDescriptor(ChatSlashCommandService)], [IChatTransferService, new SyncDescriptor(ChatTransferService)], [IChatService, new SyncDescriptor(ChatService)], [IMcpService, new TestMcpService()], [IChatAgentNameService, new class extends mock() {
                getAgentNameRestriction(chatAgentData) {
                    return false;
                }
            }], [IEditorWorkerService, new SyncDescriptor(TestWorkerService)], [IContextKeyService, contextKeyService], [IChatAgentService, new SyncDescriptor(ChatAgentService)], [IDiffProviderFactoryService, new SyncDescriptor(TestDiffProviderFactoryService)], [IInlineChatSessionService, new SyncDescriptor(InlineChatSessionServiceImpl)], [ICommandService, new SyncDescriptor(TestCommandService)], [IChatEditingService, new class extends mock() {
                constructor() {
                    super(...arguments);
                    this.editingSessionsObs = constObservable([]);
                }
            }], [IEditorProgressService, new class extends mock() {
                show(total, delay) {
                    return {
                        total() { },
                        worked(value) { },
                        done() { },
                    };
                }
            }], [IChatAccessibilityService, new class extends mock() {
                acceptResponse(response, requestId) { }
                acceptRequest() { return -1; }
                acceptElicitation() { }
            }], [IAccessibleViewService, new class extends mock() {
                getOpenAriaHint(verbositySettingKey) {
                    return null;
                }
            }], [IConfigurationService, configurationService], [IViewDescriptorService, new class extends mock() {
                constructor() {
                    super(...arguments);
                    this.onDidChangeLocation = Event.None;
                }
            }], [INotebookEditorService, new class extends mock() {
                listNotebookEditors() { return []; }
            }], [IWorkbenchAssignmentService, new NullWorkbenchAssignmentService()], [ILanguageModelsService, new SyncDescriptor(LanguageModelsService)], [ITextModelService, new SyncDescriptor(TextModelResolverService)], [ILanguageModelToolsService, new SyncDescriptor(MockLanguageModelToolsService)], [IPromptsService, new class extends mock() {
                async listPromptFiles(type, token) {
                    return [];
                }
            }], [IChatEntitlementService, new class extends mock() {
            }], [IChatModeService, new SyncDescriptor(MockChatModeService)]);
        instaService = store.add((store.add(workbenchInstantiationService(undefined, store))).createChild(serviceCollection));
        configurationService = instaService.get(IConfigurationService);
        configurationService.setUserConfiguration('chat', { editor: { fontSize: 14, fontFamily: 'default' } });
        configurationService.setUserConfiguration('editor', {});
        contextKeyService = instaService.get(IContextKeyService);
        chatService = instaService.get(IChatService);
        chatAgentService = instaService.get(IChatAgentService);
        inlineChatSessionService = store.add(instaService.get(IInlineChatSessionService));
        store.add(instaService.get(ILanguageModelsService));
        store.add(instaService.get(IEditorWorkerService));
        store.add(instaService.createInstance(ChatInputBoxContentProvider));
        model = store.add(instaService.get(IModelService).createModel('Hello\nWorld\nHello Again\nHello World\n', null));
        model.setEOL(0 /* EndOfLineSequence.LF */);
        editor = store.add(instantiateTestCodeEditor(instaService, model));
        store.add(chatAgentService.registerDynamicAgent({ id: 'testEditorAgent', ...agentData, }, {
            async invoke(request, progress, history, token) {
                progress([{
                        kind: 'textEdit',
                        uri: model.uri,
                        edits: [{
                                range: new Range(1, 1, 1, 1),
                                text: request.message
                            }]
                    }]);
                return {};
            },
        }));
    });
    teardown(function () {
        store.clear();
        ctrl?.dispose();
    });
    // TODO@jrieken re-enable, looks like List/ChatWidget is leaking
    // ensureNoDisposablesAreLeakedInTestSuite();
    test('creation, not showing anything', function () {
        ctrl = instaService.createInstance(TestController, editor);
        assert.ok(ctrl);
        assert.strictEqual(ctrl.getWidgetPosition(), undefined);
    });
    test('run (show/hide)', async function () {
        ctrl = instaService.createInstance(TestController, editor);
        const actualStates = ctrl.awaitStates(TestController.INIT_SEQUENCE_AUTO_SEND);
        const run = ctrl.run({ message: 'Hello', autoSend: true });
        assert.strictEqual(await actualStates, undefined);
        assert.ok(ctrl.getWidgetPosition() !== undefined);
        await ctrl.cancelSession();
        await run;
        assert.ok(ctrl.getWidgetPosition() === undefined);
    });
    test('wholeRange does not expand to whole lines, editor selection default', async function () {
        editor.setSelection(new Range(1, 1, 1, 3));
        ctrl = instaService.createInstance(TestController, editor);
        ctrl.run({});
        await Event.toPromise(Event.filter(ctrl.onDidChangeState, e => e === "WAIT_FOR_INPUT" /* State.WAIT_FOR_INPUT */));
        const session = inlineChatSessionService.getSession(editor, editor.getModel().uri);
        assert.ok(session);
        assert.deepStrictEqual(session.wholeRange.value, new Range(1, 1, 1, 3));
        await ctrl.cancelSession();
    });
    test('typing outside of wholeRange finishes session', async function () {
        configurationService.setUserConfiguration("inlineChat.finishOnType" /* InlineChatConfigKeys.FinishOnType */, true);
        ctrl = instaService.createInstance(TestController, editor);
        const actualStates = ctrl.awaitStates(TestController.INIT_SEQUENCE_AUTO_SEND);
        const r = ctrl.run({ message: 'Hello', autoSend: true });
        assert.strictEqual(await actualStates, undefined);
        const session = inlineChatSessionService.getSession(editor, editor.getModel().uri);
        assert.ok(session);
        assert.deepStrictEqual(session.wholeRange.value, new Range(1, 1, 1, 11 /* line length */));
        editor.setSelection(new Range(2, 1, 2, 1));
        editor.trigger('test', 'type', { text: 'a' });
        assert.strictEqual(await ctrl.awaitStates(["DONE" /* State.ACCEPT */]), undefined);
        await r;
    });
    test('\'whole range\' isn\'t updated for edits outside whole range #4346', async function () {
        editor.setSelection(new Range(3, 1, 3, 3));
        store.add(chatAgentService.registerDynamicAgent({
            id: 'testEditorAgent2',
            ...agentData
        }, {
            async invoke(request, progress, history, token) {
                progress([{
                        kind: 'textEdit',
                        uri: editor.getModel().uri,
                        edits: [{
                                range: new Range(1, 1, 1, 1), // EDIT happens outside of whole range
                                text: `${request.message}\n${request.message}`
                            }]
                    }]);
                return {};
            },
        }));
        ctrl = instaService.createInstance(TestController, editor);
        const p = ctrl.awaitStates(TestController.INIT_SEQUENCE);
        const r = ctrl.run({ message: 'GENGEN', autoSend: false });
        assert.strictEqual(await p, undefined);
        const session = inlineChatSessionService.getSession(editor, editor.getModel().uri);
        assert.ok(session);
        assert.deepStrictEqual(session.wholeRange.value, new Range(3, 1, 3, 3)); // initial
        ctrl.chatWidget.setInput('GENGEN');
        ctrl.chatWidget.acceptInput();
        assert.strictEqual(await ctrl.awaitStates(["SHOW_REQUEST" /* State.SHOW_REQUEST */, "WAIT_FOR_INPUT" /* State.WAIT_FOR_INPUT */]), undefined);
        assert.deepStrictEqual(session.wholeRange.value, new Range(1, 1, 4, 3));
        await ctrl.cancelSession();
        await r;
    });
    test('Stuck inline chat widget #211', async function () {
        store.add(chatAgentService.registerDynamicAgent({
            id: 'testEditorAgent2',
            ...agentData
        }, {
            async invoke(request, progress, history, token) {
                return new Promise(() => { });
            },
        }));
        ctrl = instaService.createInstance(TestController, editor);
        const p = ctrl.awaitStates([...TestController.INIT_SEQUENCE, "SHOW_REQUEST" /* State.SHOW_REQUEST */]);
        const r = ctrl.run({ message: 'Hello', autoSend: true });
        assert.strictEqual(await p, undefined);
        ctrl.acceptSession();
        await r;
        assert.strictEqual(ctrl.getWidgetPosition(), undefined);
    });
    test('[Bug] Inline Chat\'s streaming pushed broken iterations to the undo stack #2403', async function () {
        store.add(chatAgentService.registerDynamicAgent({
            id: 'testEditorAgent2',
            ...agentData
        }, {
            async invoke(request, progress, history, token) {
                progress([{ kind: 'textEdit', uri: model.uri, edits: [{ range: new Range(1, 1, 1, 1), text: 'hEllo1\n' }] }]);
                progress([{ kind: 'textEdit', uri: model.uri, edits: [{ range: new Range(2, 1, 2, 1), text: 'hEllo2\n' }] }]);
                progress([{ kind: 'textEdit', uri: model.uri, edits: [{ range: new Range(1, 1, 1000, 1), text: 'Hello1\nHello2\n' }] }]);
                return {};
            },
        }));
        const valueThen = editor.getModel().getValue();
        ctrl = instaService.createInstance(TestController, editor);
        const p = ctrl.awaitStates([...TestController.INIT_SEQUENCE, "SHOW_REQUEST" /* State.SHOW_REQUEST */, "WAIT_FOR_INPUT" /* State.WAIT_FOR_INPUT */]);
        const r = ctrl.run({ message: 'Hello', autoSend: true });
        assert.strictEqual(await p, undefined);
        ctrl.acceptSession();
        await r;
        assert.strictEqual(editor.getModel().getValue(), 'Hello1\nHello2\n');
        editor.getModel().undo();
        assert.strictEqual(editor.getModel().getValue(), valueThen);
    });
    test.skip('UI is streaming edits minutes after the response is finished #3345', async function () {
        return runWithFakedTimers({ maxTaskCount: Number.MAX_SAFE_INTEGER }, async () => {
            store.add(chatAgentService.registerDynamicAgent({
                id: 'testEditorAgent2',
                ...agentData
            }, {
                async invoke(request, progress, history, token) {
                    const text = '${CSI}#a\n${CSI}#b\n${CSI}#c\n';
                    await timeout(10);
                    progress([{ kind: 'textEdit', uri: model.uri, edits: [{ range: new Range(1, 1, 1, 1), text: text }] }]);
                    await timeout(10);
                    progress([{ kind: 'textEdit', uri: model.uri, edits: [{ range: new Range(1, 1, 1, 1), text: text.repeat(1000) + 'DONE' }] }]);
                    throw new Error('Too long');
                },
            }));
            // let modelChangeCounter = 0;
            // store.add(editor.getModel().onDidChangeContent(() => { modelChangeCounter++; }));
            ctrl = instaService.createInstance(TestController, editor);
            const p = ctrl.awaitStates([...TestController.INIT_SEQUENCE, "SHOW_REQUEST" /* State.SHOW_REQUEST */, "WAIT_FOR_INPUT" /* State.WAIT_FOR_INPUT */]);
            const r = ctrl.run({ message: 'Hello', autoSend: true });
            assert.strictEqual(await p, undefined);
            // assert.ok(modelChangeCounter > 0, modelChangeCounter.toString()); // some changes have been made
            // const modelChangeCounterNow = modelChangeCounter;
            assert.ok(!editor.getModel().getValue().includes('DONE'));
            await timeout(10);
            // assert.strictEqual(modelChangeCounterNow, modelChangeCounter);
            assert.ok(!editor.getModel().getValue().includes('DONE'));
            await ctrl.cancelSession();
            await r;
        });
    });
    test('escape doesn\'t remove code added from inline editor chat #3523 1/2', async function () {
        // NO manual edits -> cancel
        ctrl = instaService.createInstance(TestController, editor);
        const p = ctrl.awaitStates([...TestController.INIT_SEQUENCE, "SHOW_REQUEST" /* State.SHOW_REQUEST */, "WAIT_FOR_INPUT" /* State.WAIT_FOR_INPUT */]);
        const r = ctrl.run({ message: 'GENERATED', autoSend: true });
        assert.strictEqual(await p, undefined);
        assert.ok(model.getValue().includes('GENERATED'));
        ctrl.cancelSession();
        await r;
        assert.ok(!model.getValue().includes('GENERATED'));
    });
    test('escape doesn\'t remove code added from inline editor chat #3523, 2/2', async function () {
        // manual edits -> finish
        ctrl = instaService.createInstance(TestController, editor);
        const p = ctrl.awaitStates([...TestController.INIT_SEQUENCE, "SHOW_REQUEST" /* State.SHOW_REQUEST */, "WAIT_FOR_INPUT" /* State.WAIT_FOR_INPUT */]);
        const r = ctrl.run({ message: 'GENERATED', autoSend: true });
        assert.strictEqual(await p, undefined);
        assert.ok(model.getValue().includes('GENERATED'));
        editor.executeEdits('test', [EditOperation.insert(model.getFullModelRange().getEndPosition(), 'MANUAL')]);
        ctrl.acceptSession();
        await r;
        assert.ok(model.getValue().includes('GENERATED'));
        assert.ok(model.getValue().includes('MANUAL'));
    });
    test('re-run should discard pending edits', async function () {
        let count = 1;
        store.add(chatAgentService.registerDynamicAgent({
            id: 'testEditorAgent2',
            ...agentData
        }, {
            async invoke(request, progress, history, token) {
                progress([{ kind: 'textEdit', uri: model.uri, edits: [{ range: new Range(1, 1, 1, 1), text: request.message + (count++) }] }]);
                return {};
            },
        }));
        ctrl = instaService.createInstance(TestController, editor);
        const rerun = new RerunAction();
        model.setValue('');
        const p = ctrl.awaitStates([...TestController.INIT_SEQUENCE, "SHOW_REQUEST" /* State.SHOW_REQUEST */, "WAIT_FOR_INPUT" /* State.WAIT_FOR_INPUT */]);
        const r = ctrl.run({ message: 'PROMPT_', autoSend: true });
        assert.strictEqual(await p, undefined);
        assert.strictEqual(model.getValue(), 'PROMPT_1');
        const p2 = ctrl.awaitStates(["SHOW_REQUEST" /* State.SHOW_REQUEST */, "WAIT_FOR_INPUT" /* State.WAIT_FOR_INPUT */]);
        await instaService.invokeFunction(rerun.runInlineChatCommand, ctrl, editor);
        assert.strictEqual(await p2, undefined);
        assert.strictEqual(model.getValue(), 'PROMPT_2');
        ctrl.acceptSession();
        await r;
    });
    test('Retry undoes all changes, not just those from the request#5736', async function () {
        const text = [
            'eins-',
            'zwei-',
            'drei-'
        ];
        store.add(chatAgentService.registerDynamicAgent({
            id: 'testEditorAgent2',
            ...agentData
        }, {
            async invoke(request, progress, history, token) {
                progress([{ kind: 'textEdit', uri: model.uri, edits: [{ range: new Range(1, 1, 1, 1), text: text.shift() ?? '' }] }]);
                return {};
            },
        }));
        ctrl = instaService.createInstance(TestController, editor);
        const rerun = new RerunAction();
        model.setValue('');
        // REQUEST 1
        const p = ctrl.awaitStates([...TestController.INIT_SEQUENCE, "SHOW_REQUEST" /* State.SHOW_REQUEST */, "WAIT_FOR_INPUT" /* State.WAIT_FOR_INPUT */]);
        const r = ctrl.run({ message: '1', autoSend: true });
        assert.strictEqual(await p, undefined);
        assert.strictEqual(model.getValue(), 'eins-');
        // REQUEST 2
        const p2 = ctrl.awaitStates(["SHOW_REQUEST" /* State.SHOW_REQUEST */, "WAIT_FOR_INPUT" /* State.WAIT_FOR_INPUT */]);
        ctrl.chatWidget.setInput('1');
        await ctrl.chatWidget.acceptInput();
        assert.strictEqual(await p2, undefined);
        assert.strictEqual(model.getValue(), 'zwei-eins-');
        // REQUEST 2 - RERUN
        const p3 = ctrl.awaitStates(["SHOW_REQUEST" /* State.SHOW_REQUEST */, "WAIT_FOR_INPUT" /* State.WAIT_FOR_INPUT */]);
        await instaService.invokeFunction(rerun.runInlineChatCommand, ctrl, editor);
        assert.strictEqual(await p3, undefined);
        assert.strictEqual(model.getValue(), 'drei-eins-');
        ctrl.acceptSession();
        await r;
    });
    test('moving inline chat to another model undoes changes', async function () {
        const text = [
            'eins\n',
            'zwei\n'
        ];
        store.add(chatAgentService.registerDynamicAgent({
            id: 'testEditorAgent2',
            ...agentData
        }, {
            async invoke(request, progress, history, token) {
                progress([{ kind: 'textEdit', uri: model.uri, edits: [{ range: new Range(1, 1, 1, 1), text: text.shift() ?? '' }] }]);
                return {};
            },
        }));
        ctrl = instaService.createInstance(TestController, editor);
        // REQUEST 1
        const p = ctrl.awaitStates([...TestController.INIT_SEQUENCE, "SHOW_REQUEST" /* State.SHOW_REQUEST */, "WAIT_FOR_INPUT" /* State.WAIT_FOR_INPUT */]);
        ctrl.run({ message: '1', autoSend: true });
        assert.strictEqual(await p, undefined);
        assert.strictEqual(model.getValue(), 'eins\nHello\nWorld\nHello Again\nHello World\n');
        const targetModel = chatService.startSession(ChatAgentLocation.Editor, CancellationToken.None);
        store.add(targetModel);
        chatWidget = new class extends mock() {
            get viewModel() {
                return { model: targetModel };
            }
            focusLastMessage() { }
        };
        const r = ctrl.joinCurrentRun();
        await ctrl.viewInChat();
        assert.strictEqual(model.getValue(), 'Hello\nWorld\nHello Again\nHello World\n');
        await r;
    });
    test('moving inline chat to another model undoes changes (2 requests)', async function () {
        const text = [
            'eins\n',
            'zwei\n'
        ];
        store.add(chatAgentService.registerDynamicAgent({
            id: 'testEditorAgent2',
            ...agentData
        }, {
            async invoke(request, progress, history, token) {
                progress([{ kind: 'textEdit', uri: model.uri, edits: [{ range: new Range(1, 1, 1, 1), text: text.shift() ?? '' }] }]);
                return {};
            },
        }));
        ctrl = instaService.createInstance(TestController, editor);
        // REQUEST 1
        const p = ctrl.awaitStates([...TestController.INIT_SEQUENCE, "SHOW_REQUEST" /* State.SHOW_REQUEST */, "WAIT_FOR_INPUT" /* State.WAIT_FOR_INPUT */]);
        ctrl.run({ message: '1', autoSend: true });
        assert.strictEqual(await p, undefined);
        assert.strictEqual(model.getValue(), 'eins\nHello\nWorld\nHello Again\nHello World\n');
        // REQUEST 2
        const p2 = ctrl.awaitStates(["SHOW_REQUEST" /* State.SHOW_REQUEST */, "WAIT_FOR_INPUT" /* State.WAIT_FOR_INPUT */]);
        ctrl.chatWidget.setInput('1');
        await ctrl.chatWidget.acceptInput();
        assert.strictEqual(await p2, undefined);
        assert.strictEqual(model.getValue(), 'zwei\neins\nHello\nWorld\nHello Again\nHello World\n');
        const targetModel = chatService.startSession(ChatAgentLocation.Editor, CancellationToken.None);
        store.add(targetModel);
        chatWidget = new class extends mock() {
            get viewModel() {
                return { model: targetModel };
            }
            focusLastMessage() { }
        };
        const r = ctrl.joinCurrentRun();
        await ctrl.viewInChat();
        assert.strictEqual(model.getValue(), 'Hello\nWorld\nHello Again\nHello World\n');
        await r;
    });
    // TODO@jrieken https://github.com/microsoft/vscode/issues/251429
    test.skip('Clicking "re-run without /doc" while a request is in progress closes the widget #5997', async function () {
        model.setValue('');
        let count = 0;
        const commandDetection = [];
        const onDidInvoke = new Emitter();
        store.add(chatAgentService.registerDynamicAgent({
            id: 'testEditorAgent2',
            ...agentData
        }, {
            async invoke(request, progress, history, token) {
                queueMicrotask(() => onDidInvoke.fire());
                commandDetection.push(request.enableCommandDetection);
                progress([{ kind: 'textEdit', uri: model.uri, edits: [{ range: new Range(1, 1, 1, 1), text: request.message + (count++) }] }]);
                if (count === 1) {
                    // FIRST call waits for cancellation
                    await raceCancellation(new Promise(() => { }), token);
                }
                else {
                    await timeout(10);
                }
                return {};
            },
        }));
        ctrl = instaService.createInstance(TestController, editor);
        // REQUEST 1
        // const p = ctrl.awaitStates([...TestController.INIT_SEQUENCE, State.SHOW_REQUEST]);
        const p = Event.toPromise(onDidInvoke.event);
        ctrl.run({ message: 'Hello-', autoSend: true });
        await p;
        // assert.strictEqual(await p, undefined);
        // resend pending request without command detection
        const request = ctrl.chatWidget.viewModel?.model.getRequests().at(-1);
        assertType(request);
        const p2 = Event.toPromise(onDidInvoke.event);
        const p3 = ctrl.awaitStates(["SHOW_REQUEST" /* State.SHOW_REQUEST */, "WAIT_FOR_INPUT" /* State.WAIT_FOR_INPUT */]);
        chatService.resendRequest(request, { noCommandDetection: true, attempt: request.attempt + 1, location: ChatAgentLocation.Editor });
        await p2;
        assert.strictEqual(await p3, undefined);
        assert.deepStrictEqual(commandDetection, [true, false]);
        assert.strictEqual(model.getValue(), 'Hello-1');
    });
    test('Re-run without after request is done', async function () {
        model.setValue('');
        let count = 0;
        const commandDetection = [];
        store.add(chatAgentService.registerDynamicAgent({
            id: 'testEditorAgent2',
            ...agentData
        }, {
            async invoke(request, progress, history, token) {
                commandDetection.push(request.enableCommandDetection);
                progress([{ kind: 'textEdit', uri: model.uri, edits: [{ range: new Range(1, 1, 1, 1), text: request.message + (count++) }] }]);
                return {};
            },
        }));
        ctrl = instaService.createInstance(TestController, editor);
        // REQUEST 1
        const p = ctrl.awaitStates([...TestController.INIT_SEQUENCE, "SHOW_REQUEST" /* State.SHOW_REQUEST */, "WAIT_FOR_INPUT" /* State.WAIT_FOR_INPUT */]);
        ctrl.run({ message: 'Hello-', autoSend: true });
        assert.strictEqual(await p, undefined);
        // resend pending request without command detection
        const request = ctrl.chatWidget.viewModel?.model.getRequests().at(-1);
        assertType(request);
        const p2 = ctrl.awaitStates(["SHOW_REQUEST" /* State.SHOW_REQUEST */, "WAIT_FOR_INPUT" /* State.WAIT_FOR_INPUT */]);
        chatService.resendRequest(request, { noCommandDetection: true, attempt: request.attempt + 1, location: ChatAgentLocation.Editor });
        assert.strictEqual(await p2, undefined);
        assert.deepStrictEqual(commandDetection, [true, false]);
        assert.strictEqual(model.getValue(), 'Hello-1');
    });
    test('Inline: Pressing Rerun request while the response streams breaks the response #5442', async function () {
        model.setValue('two\none\n');
        const attempts = [];
        const deferred = new DeferredPromise();
        store.add(chatAgentService.registerDynamicAgent({
            id: 'testEditorAgent2',
            ...agentData
        }, {
            async invoke(request, progress, history, token) {
                attempts.push(request.attempt);
                progress([{ kind: 'textEdit', uri: model.uri, edits: [{ range: new Range(1, 1, 1, 1), text: `TRY:${request.attempt}\n` }] }]);
                await raceCancellation(deferred.p, token);
                deferred.complete();
                await timeout(10);
                return {};
            },
        }));
        ctrl = instaService.createInstance(TestController, editor);
        // REQUEST 1
        const p = ctrl.awaitStates([...TestController.INIT_SEQUENCE, "SHOW_REQUEST" /* State.SHOW_REQUEST */]);
        ctrl.run({ message: 'Hello-', autoSend: true });
        assert.strictEqual(await p, undefined);
        await timeout(10);
        assert.deepStrictEqual(attempts, [0]);
        // RERUN (cancel, undo, redo)
        const p2 = ctrl.awaitStates(["SHOW_REQUEST" /* State.SHOW_REQUEST */, "WAIT_FOR_INPUT" /* State.WAIT_FOR_INPUT */]);
        const rerun = new RerunAction();
        await instaService.invokeFunction(rerun.runInlineChatCommand, ctrl, editor);
        assert.strictEqual(await p2, undefined);
        assert.deepStrictEqual(attempts, [0, 1]);
        assert.strictEqual(model.getValue(), 'TRY:1\ntwo\none\n');
    });
    test('Stopping/cancelling a request should NOT undo its changes', async function () {
        model.setValue('World');
        const deferred = new DeferredPromise();
        let progress;
        store.add(chatAgentService.registerDynamicAgent({
            id: 'testEditorAgent2',
            ...agentData
        }, {
            async invoke(request, _progress, history, token) {
                progress = _progress;
                await deferred.p;
                return {};
            },
        }));
        ctrl = instaService.createInstance(TestController, editor);
        // REQUEST 1
        const p = ctrl.awaitStates([...TestController.INIT_SEQUENCE, "SHOW_REQUEST" /* State.SHOW_REQUEST */]);
        ctrl.run({ message: 'Hello', autoSend: true });
        await timeout(10);
        assert.strictEqual(await p, undefined);
        assertType(progress);
        const modelChange = new Promise(resolve => model.onDidChangeContent(() => resolve()));
        progress([{ kind: 'textEdit', uri: model.uri, edits: [{ range: new Range(1, 1, 1, 1), text: 'Hello-Hello' }] }]);
        await modelChange;
        assert.strictEqual(model.getValue(), 'HelloWorld'); // first word has been streamed
        const p2 = ctrl.awaitStates(["WAIT_FOR_INPUT" /* State.WAIT_FOR_INPUT */]);
        chatService.cancelCurrentRequestForSession(ctrl.chatWidget.viewModel.model.sessionId);
        assert.strictEqual(await p2, undefined);
        assert.strictEqual(model.getValue(), 'HelloWorld'); // CANCEL just stops the request and progressive typing but doesn't undo
    });
    test('Apply Edits from existing session w/ edits', async function () {
        model.setValue('');
        const newSession = await inlineChatSessionService.createSession(editor, {}, CancellationToken.None);
        assertType(newSession);
        await (await chatService.sendRequest(newSession.chatModel.sessionId, 'Existing', { location: ChatAgentLocation.Editor }))?.responseCreatedPromise;
        assert.strictEqual(newSession.chatModel.requestInProgress, true);
        const response = newSession.chatModel.lastRequest?.response;
        assertType(response);
        await new Promise(resolve => {
            if (response.isComplete) {
                resolve(undefined);
            }
            const d = response.onDidChange(() => {
                if (response.isComplete) {
                    d.dispose();
                    resolve(undefined);
                }
            });
        });
        ctrl = instaService.createInstance(TestController, editor);
        const p = ctrl.awaitStates([...TestController.INIT_SEQUENCE]);
        ctrl.run({ existingSession: newSession });
        assert.strictEqual(await p, undefined);
        assert.strictEqual(model.getValue(), 'Existing');
    });
    test('Undo on error (2 rounds)', async function () {
        return runWithFakedTimers({}, async () => {
            store.add(chatAgentService.registerDynamicAgent({ id: 'testEditorAgent', ...agentData, }, {
                async invoke(request, progress, history, token) {
                    progress([{
                            kind: 'textEdit',
                            uri: model.uri,
                            edits: [{
                                    range: new Range(1, 1, 1, 1),
                                    text: request.message
                                }]
                        }]);
                    if (request.message === 'two') {
                        await timeout(100); // give edit a chance
                        return {
                            errorDetails: { message: 'FAILED' }
                        };
                    }
                    return {};
                },
            }));
            model.setValue('');
            // ROUND 1
            ctrl = instaService.createInstance(TestController, editor);
            const p = ctrl.awaitStates([...TestController.INIT_SEQUENCE, "SHOW_REQUEST" /* State.SHOW_REQUEST */, "WAIT_FOR_INPUT" /* State.WAIT_FOR_INPUT */]);
            ctrl.run({ autoSend: true, message: 'one' });
            assert.strictEqual(await p, undefined);
            assert.strictEqual(model.getValue(), 'one');
            // ROUND 2
            const p2 = ctrl.awaitStates(["SHOW_REQUEST" /* State.SHOW_REQUEST */, "WAIT_FOR_INPUT" /* State.WAIT_FOR_INPUT */]);
            const values = new Set();
            store.add(model.onDidChangeContent(() => values.add(model.getValue())));
            ctrl.chatWidget.acceptInput('two'); // WILL Trigger a failure
            assert.strictEqual(await p2, undefined);
            assert.strictEqual(model.getValue(), 'one'); // undone
            assert.ok(values.has('twoone')); // we had but the change got undone
        });
    });
    test('Inline chat "discard" button does not always appear if response is stopped #228030', async function () {
        model.setValue('World');
        const deferred = new DeferredPromise();
        store.add(chatAgentService.registerDynamicAgent({
            id: 'testEditorAgent2',
            ...agentData
        }, {
            async invoke(request, progress, history, token) {
                progress([{ kind: 'textEdit', uri: model.uri, edits: [{ range: new Range(1, 1, 1, 1), text: 'Hello-Hello' }] }]);
                await deferred.p;
                return {};
            },
        }));
        ctrl = instaService.createInstance(TestController, editor);
        // REQUEST 1
        const p = ctrl.awaitStates([...TestController.INIT_SEQUENCE, "SHOW_REQUEST" /* State.SHOW_REQUEST */]);
        ctrl.run({ message: 'Hello', autoSend: true });
        assert.strictEqual(await p, undefined);
        const p2 = ctrl.awaitStates(["WAIT_FOR_INPUT" /* State.WAIT_FOR_INPUT */]);
        chatService.cancelCurrentRequestForSession(ctrl.chatWidget.viewModel.model.sessionId);
        assert.strictEqual(await p2, undefined);
        const value = contextKeyService.getContextKeyValue(CTX_INLINE_CHAT_RESPONSE_TYPE.key);
        assert.notStrictEqual(value, "none" /* InlineChatResponseType.None */);
    });
    test('Restore doesn\'t edit on errored result', async function () {
        return runWithFakedTimers({ useFakeTimers: true }, async () => {
            const model2 = store.add(instaService.get(IModelService).createModel('ABC', null));
            model.setValue('World');
            store.add(chatAgentService.registerDynamicAgent({
                id: 'testEditorAgent2',
                ...agentData
            }, {
                async invoke(request, progress, history, token) {
                    progress([{ kind: 'textEdit', uri: model.uri, edits: [{ range: new Range(1, 1, 1, 1), text: 'Hello1' }] }]);
                    await timeout(100);
                    progress([{ kind: 'textEdit', uri: model.uri, edits: [{ range: new Range(1, 1, 1, 1), text: 'Hello2' }] }]);
                    await timeout(100);
                    progress([{ kind: 'textEdit', uri: model.uri, edits: [{ range: new Range(1, 1, 1, 1), text: 'Hello3' }] }]);
                    await timeout(100);
                    return {
                        errorDetails: { message: 'FAILED' }
                    };
                },
            }));
            ctrl = instaService.createInstance(TestController, editor);
            // REQUEST 1
            const p = ctrl.awaitStates([...TestController.INIT_SEQUENCE, "SHOW_REQUEST" /* State.SHOW_REQUEST */, "WAIT_FOR_INPUT" /* State.WAIT_FOR_INPUT */]);
            ctrl.run({ message: 'Hello', autoSend: true });
            assert.strictEqual(await p, undefined);
            const p2 = ctrl.awaitStates(["PAUSE" /* State.PAUSE */]);
            editor.setModel(model2);
            assert.strictEqual(await p2, undefined);
            const p3 = ctrl.awaitStates([...TestController.INIT_SEQUENCE]);
            editor.setModel(model);
            assert.strictEqual(await p3, undefined);
            assert.strictEqual(model.getValue(), 'World');
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5saW5lQ2hhdENvbnRyb2xsZXIudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL2FkdmlrYXIvRG9jdW1lbnRzL2FyY2hpdGVjdC9hcmNoMi9BcmNoSURFL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2lubGluZUNoYXQvdGVzdC9icm93c2VyL2lubGluZUNoYXRDb250cm9sbGVyLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQzVCLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUM5RCxPQUFPLEVBQUUsZUFBZSxFQUFFLGdCQUFnQixFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQ2pHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQy9FLE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDckUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQzFFLE9BQU8sRUFBRSxlQUFlLEVBQWUsTUFBTSwwQ0FBMEMsQ0FBQztBQUN4RixPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDakUsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQy9ELE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHdEQUF3RCxDQUFDO0FBRTVGLE9BQU8sRUFBRSwyQkFBMkIsRUFBRSxNQUFNLCtFQUErRSxDQUFDO0FBQzVILE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxvREFBb0QsQ0FBQztBQUNuRixPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFFbkUsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sdURBQXVELENBQUM7QUFDN0YsT0FBTyxFQUFFLGFB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