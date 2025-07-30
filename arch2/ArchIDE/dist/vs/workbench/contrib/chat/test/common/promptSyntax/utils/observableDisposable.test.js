/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { spy } from 'sinon';
import { timeout } from '../../../../../../../base/common/async.js';
import { randomInt } from '../../../../../../../base/common/numbers.js';
import { Disposable } from '../../../../../../../base/common/lifecycle.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../../../base/test/common/utils.js';
import { assertNotDisposed, ObservableDisposable } from '../../../../common/promptSyntax/utils/observableDisposable.js';
suite('ObservableDisposable', () => {
    const disposables = ensureNoDisposablesAreLeakedInTestSuite();
    test('tracks `disposed` state', () => {
        // this is an abstract class, so we have to create
        // an anonymous class that extends it
        const object = new class extends ObservableDisposable {
        }();
        disposables.add(object);
        assert(object instanceof ObservableDisposable, 'Object must be instance of ObservableDisposable.');
        assert(object instanceof Disposable, 'Object must be instance of Disposable.');
        assert(object.isDisposed === false, 'Object must not be disposed yet.');
        object.dispose();
        assert(object.isDisposed, 'Object must be disposed.');
    });
    suite('onDispose()', () => {
        test('fires the event on dispose', async () => {
            // this is an abstract class, so we have to create
            // an anonymous class that extends it
            const object = new class extends ObservableDisposable {
            }();
            disposables.add(object);
            assert(object.isDisposed === false, 'Object must not be disposed yet.');
            const onDisposeSpy = spy();
            disposables.add(object.onDispose(onDisposeSpy));
            assert(onDisposeSpy.notCalled, '`onDispose` callback must not be called yet.');
            await timeout(10);
            assert(onDisposeSpy.notCalled, '`onDispose` callback must not be called yet.');
            // dispose object and wait for the event to be fired/received
            object.dispose();
            await timeout(1);
            /**
             * Validate that the callback was called.
             */
            assert(object.isDisposed, 'Object must be disposed.');
            assert(onDisposeSpy.calledOnce, '`onDispose` callback must be called.');
            /**
             * Validate that the callback is not called again.
             */
            object.dispose();
            object.dispose();
            await timeout(10);
            object.dispose();
            assert(onDisposeSpy.calledOnce, '`onDispose` callback must not be called again.');
            assert(object.isDisposed, 'Object must be disposed.');
        });
        test('executes callback immediately if already disposed', async () => {
            // this is an abstract class, so we have to create
            // an anonymous class that extends it
            const object = new class extends ObservableDisposable {
            }();
            disposables.add(object);
            // dispose object and wait for the event to be fired/received
            object.dispose();
            await timeout(10);
            const onDisposeSpy = spy();
            disposables.add(object.onDispose(onDisposeSpy));
            await timeout(10);
            assert(onDisposeSpy.calledOnce, '`onDispose` callback must be called immediately.');
            await timeout(10);
            disposables.add(object.onDispose(onDisposeSpy));
            await timeout(10);
            assert(onDisposeSpy.calledTwice, '`onDispose` callback must be called immediately the second time.');
            // dispose object and wait for the event to be fired/received
            object.dispose();
            await timeout(10);
            assert(onDisposeSpy.calledTwice, '`onDispose` callback must not be called again on dispose.');
        });
    });
    suite('addDisposable()', () => {
        test('disposes provided object with itself', async () => {
            class TestDisposable {
                constructor() {
                    this._disposed = false;
                }
                get disposed() {
                    return this._disposed;
                }
                dispose() {
                    this._disposed = true;
                }
            }
            // this is an abstract class, so we have to create
            // an anonymous class that extends it
            const object = new class extends ObservableDisposable {
            }();
            disposables.add(object);
            assert(object.isDisposed === false, 'Object must not be disposed yet.');
            const disposableObjects = [];
            for (let i = 0; i < randomInt(20, 10); i++) {
                disposableObjects.push(new TestDisposable());
            }
            // a sanity check for the initial state of the objects
            for (const disposable of disposableObjects) {
                assert(disposable.disposed === false, 'Disposable object must not be disposed yet.');
            }
            object.addDisposables(...disposableObjects);
            // a sanity check after the 'addDisposable' call
            for (const disposable of disposableObjects) {
                assert(disposable.disposed === false, 'Disposable object must not be disposed yet.');
            }
            object.dispose();
            // finally validate that all objects are disposed
            const allDisposed = disposableObjects.reduce((acc, disposable) => {
                return acc && disposable.disposed;
            }, true);
            assert(allDisposed === true, 'Disposable object must be disposed now.');
        });
        test('disposes the entire tree of disposables', async () => {
            class TestDisposable extends ObservableDisposable {
            }
            /**
             * Generate a tree of disposable objects.
             */
            const disposableObjects = (count = randomInt(20, 10), parent = null) => {
                assert(count > 0, 'Count must be greater than 0.');
                const allDisposables = [];
                for (let i = 0; i < count; i++) {
                    const disposableObject = new TestDisposable();
                    allDisposables.push(disposableObject);
                    if (parent !== null) {
                        parent.addDisposables(disposableObject);
                    }
                    // generate child disposable objects recursively
                    // to create a tree structure
                    const countMax = count / 2;
                    const countMin = count / 5;
                    if (countMin < 1) {
                        return allDisposables;
                    }
                    const childDisposables = disposableObjects(randomInt(countMax, countMin), disposableObject);
                    allDisposables.push(...childDisposables);
                }
                return allDisposables;
            };
            // this is an abstract class, so we have to create
            // an anonymous class that extends it
            const object = new class extends ObservableDisposable {
            }();
            disposables.add(object);
            assert(object.isDisposed === false, 'Object must not be disposed yet.');
            const disposablesCount = randomInt(20, 10);
            const allDisposableObjects = disposableObjects(disposablesCount, object);
            assert(allDisposableObjects.length > disposablesCount, 'Must have some of the nested disposable objects for this test to be valid.');
            // a sanity check for the initial state of the objects
            for (const disposable of allDisposableObjects) {
                assert(disposable.isDisposed === false, 'Disposable object must not be disposed yet.');
            }
            object.dispose();
            // finally validate that all objects are disposed
            const allDisposed = allDisposableObjects.reduce((acc, disposable) => {
                return acc && disposable.isDisposed;
            }, true);
            assert(allDisposed === true, 'Disposable object must be disposed now.');
        });
    });
    suite('asserts', () => {
        test('not disposed (method)', async () => {
            // this is an abstract class, so we have to create
            // an anonymous class that extends it
            const object = new class extends ObservableDisposable {
            }();
            disposables.add(object);
            assert.doesNotThrow(() => {
                object.assertNotDisposed('Object must not be disposed.');
            });
            await timeout(10);
            assert.doesNotThrow(() => {
                object.assertNotDisposed('Object must not be disposed.');
            });
            // dispose object and wait for the event to be fired/received
            object.dispose();
            await timeout(1);
            assert.throws(() => {
                object.assertNotDisposed('Object must not be disposed.');
            });
            await timeout(10);
            assert.throws(() => {
                object.assertNotDisposed('Object must not be disposed.');
            });
        });
        test('not disposed (function)', async () => {
            // this is an abstract class, so we have to create
            // an anonymous class that extends it
            const object = new class extends ObservableDisposable {
            }();
            disposables.add(object);
            assert.doesNotThrow(() => {
                assertNotDisposed(object, 'Object must not be disposed.');
            });
            await timeout(10);
            assert.doesNotThrow(() => {
                assertNotDisposed(object, 'Object must not be disposed.');
            });
            // dispose object and wait for the event to be fired/received
            object.dispose();
            await timeout(1);
            assert.throws(() => {
                assertNotDisposed(object, 'Object must not be disposed.');
            });
            await timeout(10);
            assert.throws(() => {
                assertNotDisposed(object, 'Object must not be disposed.');
            });
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib2JzZXJ2YWJsZURpc3Bvc2FibGUudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL2FkdmlrYXIvRG9jdW1lbnRzL2FyY2hpdGVjdC9hcmNoMi9BcmNoSURFL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvdGVzdC9jb21tb24vcHJvbXB0U3ludGF4L3V0aWxzL29ic2VydmFibGVEaXNwb3NhYmxlLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFDaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQzVCLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxPQUFPLENBQUM7QUFDNUIsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBQ3BFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUN4RSxPQUFPLEVBQUUsVUFBVSxFQUFlLE1BQU0sK0NBQStDLENBQUM7QUFDeEYsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDekcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLG9CQUFvQixFQUFFLE1BQU0sK0RBQStELENBQUM7QUFFeEgsS0FBSyxDQUFDLHNCQUFzQixFQUFFLEdBQUcsRUFBRTtJQUNsQyxNQUFNLFdBQVcsR0FBRyx1Q0FBdUMsRUFBRSxDQUFDO0lBRTlELElBQUksQ0FBQyx5QkFBeUIsRUFBRSxHQUFHLEVBQUU7UUFDcEMsa0RBQWtEO1FBQ2xELHFDQUFxQztRQUNyQyxNQUFNLE1BQU0sR0FBRyxJQUFJLEtBQU0sU0FBUSxvQkFBb0I7U0FBSSxFQUFFLENBQUM7UUFDNUQsV0FBVyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUV4QixNQUFNLENBQ0wsTUFBTSxZQUFZLG9CQUFvQixFQUN0QyxrREFBa0QsQ0FDbEQsQ0FBQztRQUVGLE1BQU0sQ0FDTCxNQUFNLFlBQVksVUFBVSxFQUM1Qix3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