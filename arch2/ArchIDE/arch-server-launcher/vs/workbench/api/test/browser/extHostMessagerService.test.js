/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { MainThreadMessageService } from '../../browser/mainThreadMessageService.js';
import { NoOpNotification } from '../../../../platform/notification/common/notification.js';
import { mock } from '../../../../base/test/common/mock.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { Event } from '../../../../base/common/event.js';
import { TestDialogService } from '../../../../platform/dialogs/test/common/testDialogService.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { TestExtensionService } from '../../../test/common/workbenchTestServices.js';
const emptyCommandService = {
    _serviceBrand: undefined,
    onWillExecuteCommand: () => Disposable.None,
    onDidExecuteCommand: () => Disposable.None,
    executeCommand: (commandId, ...args) => {
        return Promise.resolve(undefined);
    }
};
const emptyNotificationService = new class {
    constructor() {
        this.onDidChangeFilter = Event.None;
    }
    notify(...args) {
        throw new Error('not implemented');
    }
    info(...args) {
        throw new Error('not implemented');
    }
    warn(...args) {
        throw new Error('not implemented');
    }
    error(...args) {
        throw new Error('not implemented');
    }
    prompt(severity, message, choices, options) {
        throw new Error('not implemented');
    }
    status(message, options) {
        return { close: () => { } };
    }
    setFilter() {
        throw new Error('not implemented');
    }
    getFilter(source) {
        throw new Error('not implemented');
    }
    getFilters() {
        throw new Error('not implemented');
    }
    removeFilter(sourceId) {
        throw new Error('not implemented');
    }
};
class EmptyNotificationService {
    constructor(withNotify) {
        this.withNotify = withNotify;
        this.filter = false;
        this.onDidChangeFilter = Event.None;
    }
    notify(notification) {
        this.withNotify(notification);
        return new NoOpNotification();
    }
    info(message) {
        throw new Error('Method not implemented.');
    }
    warn(message) {
        throw new Error('Method not implemented.');
    }
    error(message) {
        throw new Error('Method not implemented.');
    }
    prompt(severity, message, choices, options) {
        throw new Error('Method not implemented');
    }
    status(message, options) {
        return { close: () => { } };
    }
    setFilter() {
        throw new Error('Method not implemented.');
    }
    getFilter(source) {
        throw new Error('Method not implemented.');
    }
    getFilters() {
        throw new Error('Method not implemented.');
    }
    removeFilter(sourceId) {
        throw new Error('Method not implemented.');
    }
}
suite('ExtHostMessageService', function () {
    test('propagte handle on select', async function () {
        const service = new MainThreadMessageService(null, new EmptyNotificationService(notification => {
            assert.strictEqual(notification.actions.primary.length, 1);
            queueMicrotask(() => notification.actions.primary[0].run());
        }), emptyCommandService, new TestDialogService(), new TestExtensionService());
        const handle = await service.$showMessage(1, 'h', {}, [{ handle: 42, title: 'a thing', isCloseAffordance: true }]);
        assert.strictEqual(handle, 42);
        service.dispose();
    });
    suite('modal', () => {
        test('calls dialog service', async () => {
            const service = new MainThreadMessageService(null, emptyNotificationService, emptyCommandService, new class extends mock() {
                prompt({ type, message, buttons, cancelButton }) {
                    assert.strictEqual(type, 1);
                    assert.strictEqual(message, 'h');
                    assert.strictEqual(buttons.length, 1);
                    assert.strictEqual(cancelButton.label, 'Cancel');
                    return Promise.resolve({ result: buttons[0].run({ checkboxChecked: false }) });
                }
            }, new TestExtensionService());
            const handle = await service.$showMessage(1, 'h', { modal: true }, [{ handle: 42, title: 'a thing', isCloseAffordance: false }]);
            assert.strictEqual(handle, 42);
            service.dispose();
        });
        test('returns undefined when cancelled', async () => {
            const service = new MainThreadMessageService(null, emptyNotificationService, emptyCommandService, new class extends mock() {
                prompt(prompt) {
                    return Promise.resolve({ result: prompt.cancelButton.run({ checkboxChecked: false }) });
                }
            }, new TestExtensionService());
            const handle = await service.$showMessage(1, 'h', { modal: true }, [{ handle: 42, title: 'a thing', isCloseAffordance: false }]);
            assert.strictEqual(handle, undefined);
            service.dispose();
        });
        test('hides Cancel button when not needed', async () => {
            const service = new MainThreadMessageService(null, emptyNotificationService, emptyCommandService, new class extends mock() {
                prompt({ type, message, buttons, cancelButton }) {
                    assert.strictEqual(buttons.length, 0);
                    assert.ok(cancelButton);
                    return Promise.resolve({ result: cancelButton.run({ checkboxChecked: false }) });
                }
            }, new TestExtensionService());
            const handle = await service.$showMessage(1, 'h', { modal: true }, [{ handle: 42, title: 'a thing', isCloseAffordance: true }]);
            assert.strictEqual(handle, 42);
            service.dispose();
        });
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdE1lc3NhZ2VyU2VydmljZS50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvYWR2aWthci9Eb2N1bWVudHMvYXJjaGl0ZWN0L2FyY2gyL0FyY2hJREUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS90ZXN0L2Jyb3dzZXIvZXh0SG9zdE1lc3NhZ2VyU2VydmljZS50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUVyRixPQUFPLEVBQXVDLGdCQUFnQixFQUEySyxNQUFNLDBEQUEwRCxDQUFDO0FBRTFTLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUM1RCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDbEUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ3pELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLCtEQUErRCxDQUFDO0FBQ2xHLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQ2hHLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLCtDQUErQyxDQUFDO0FBRXJGLE1BQU0sbUJBQW1CLEdBQW9CO0lBQzVDLGFBQWEsRUFBRSxTQUFTO0lBQ3hCLG9CQUFvQixFQUFFLEdBQUcsRUFBRSxDQUFDLFVBQVUsQ0FBQyxJQUFJO0lBQzNDLG1CQUFtQixFQUFFLEdBQUcsRUFBRSxDQUFDLFVBQVUsQ0FBQyxJQUFJO0lBQzFDLGNBQWMsRUFBRSxDQUFDLFNBQWlCLEVBQUUsR0FBRyxJQUFXLEVBQWdCLEVBQUU7UUFDbkUsT0FBTyxPQUFPLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDO0lBQ25DLENBQUM7Q0FDRCxDQUFDO0FBRUYsTUFBTSx3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