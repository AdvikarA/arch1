/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { spy } from 'sinon';
import { ObjectCache } from '../../../../common/promptSyntax/utils/objectCache.js';
import { timeout } from '../../../../../../../base/common/async.js';
import { ObservableDisposable } from '../../../../common/promptSyntax/utils/observableDisposable.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../../../base/test/common/utils.js';
/**
 * Test object class.
 */
class TestObject extends ObservableDisposable {
    constructor(ID) {
        super();
        this.ID = ID;
    }
    /**
     * Check if this object is equal to another one.
     */
    equal(other) {
        return this.ID === other.ID;
    }
}
suite('ObjectCache', function () {
    const disposables = ensureNoDisposablesAreLeakedInTestSuite();
    suite('get', () => {
        /**
         * Common test funtion to test core logic of the cache
         * with provider test ID keys of some specific type.
         *
         * @param key1 Test key1.
         * @param key2 Test key2.
         */
        const testCoreLogic = async (key1, key2) => {
            const factory = spy((key) => {
                const result = new TestObject(key);
                result.assertNotDisposed('Object must not be disposed.');
                return result;
            });
            const cache = disposables.add(new ObjectCache(factory));
            /**
             * Test the core logic of the cache using 2 objects.
             */
            const obj1 = cache.get(key1);
            assert(factory.calledOnceWithExactly(key1), '[obj1] Must be called once with the correct arguments.');
            assert(obj1.ID === key1, '[obj1] Returned object must have the correct ID.');
            const obj2 = cache.get(key1);
            assert(factory.calledOnceWithExactly(key1), '[obj2] Must be called once with the correct arguments.');
            assert(obj2.ID === key1, '[obj2] Returned object must have the correct ID.');
            assert(obj1 === obj2 && obj1.equal(obj2), '[obj2] Returned object must be the same instance.');
            factory.resetHistory();
            const obj3 = cache.get(key2);
            assert(factory.calledOnceWithExactly(key2), '[obj3] Must be called once with the correct arguments.');
            assert(obj3.ID === key2, '[obj3] Returned object must have the correct ID.');
            factory.resetHistory();
            const obj4 = cache.get(key1);
            assert(factory.notCalled, '[obj4] Factory must not be called.');
            assert(obj4.ID === key1, '[obj4] Returned object must have the correct ID.');
            assert(obj1 === obj4 && obj1.equal(obj4), '[obj4] Returned object must be the same instance.');
            factory.resetHistory();
            /**
             * Now test that the object is removed automatically from
             * the cache when it is disposed.
             */
            obj3.dispose();
            // the object is removed from the cache asynchronously
            // so add a small delay to ensure the object is removed
            await timeout(5);
            const obj5 = cache.get(key1);
            assert(factory.notCalled, '[obj5] Factory must not be called.');
            assert(obj5.ID === key1, '[obj5] Returned object must have the correct ID.');
            assert(obj1 === obj5 && obj1.equal(obj5), '[obj5] Returned object must be the same instance.');
            factory.resetHistory();
            /**
             * Test that the previously disposed object is recreated
             * on the new retrieval call.
             */
            const obj6 = cache.get(key2);
            assert(factory.calledOnceWithExactly(key2), '[obj6] Must be called once with the correct arguments.');
            assert(obj6.ID === key2, '[obj6] Returned object must have the correct ID.');
        };
        test('strings as keys', async function () {
            await testCoreLogic('key1', 'key2');
        });
        test('numbers as keys', async function () {
            await testCoreLogic(10, 17065);
        });
        test('objects as keys', async function () {
            await testCoreLogic(disposables.add(new TestObject({})), disposables.add(new TestObject({})));
        });
    });
    suite('remove', () => {
        /**
         * Common test funtion to test remove logic of the cache
         * with provider test ID keys of some specific type.
         *
         * @param key1 Test key1.
         * @param key2 Test key2.
         */
        const testRemoveLogic = async (key1, key2, disposeOnRemove) => {
            const factory = spy((key) => {
                const result = new TestObject(key);
                result.assertNotDisposed('Object must not be disposed.');
                return result;
            });
            // ObjectCache<TestObject<TKey>, TKey>
            const cache = disposables.add(new ObjectCache(factory));
            /**
             * Test the core logic of the cache.
             */
            const obj1 = cache.get(key1);
            assert(factory.calledOnceWithExactly(key1), '[obj1] Must be called once with the correct arguments.');
            assert(obj1.ID === key1, '[obj1] Returned object must have the correct ID.');
            factory.resetHistory();
            const obj2 = cache.get(key2);
            assert(factory.calledOnceWithExactly(key2), '[obj2] Must be called once with the correct arguments.');
            assert(obj2.ID === key2, '[obj2] Returned object must have the correct ID.');
            cache.remove(key2, disposeOnRemove);
            const object2Disposed = obj2.isDisposed;
            // ensure we don't leak undisposed object in the tests
            if (obj2.isDisposed === false) {
                obj2.dispose();
            }
            assert(object2Disposed === disposeOnRemove, `[obj2] Removed object must be disposed: ${disposeOnRemove}.`);
            factory.resetHistory();
            /**
             * Validate that another object is not disposed.
             */
            assert(obj1.isDisposed === false, '[obj1] Object must not be disposed.');
            const obj3 = cache.get(key1);
            assert(factory.notCalled, '[obj3] Factory must not be called.');
            assert(obj3.ID === key1, '[obj3] Returned object must have the correct ID.');
            assert(obj1 === obj3 && obj1.equal(obj3), '[obj3] Returned object must be the same instance.');
            factory.resetHistory();
        };
        test('strings as keys', async function () {
            await testRemoveLogic('key1', 'key2', false);
            await testRemoveLogic('some-key', 'another-key', true);
        });
        test('numbers as keys', async function () {
            await testRemoveLogic(7, 2400700, false);
            await testRemoveLogic(1090, 2654, true);
        });
        test('objects as keys', async function () {
            await testRemoveLogic(disposables.add(new TestObject(1)), disposables.add(new TestObject(1)), false);
            await testRemoveLogic(disposables.add(new TestObject(2)), disposables.add(new TestObject(2)), true);
        });
    });
    test('throws if factory returns a disposed object', async function () {
        const factory = (key) => {
            const result = new TestObject(key);
            if (key === 'key2') {
                result.dispose();
            }
            // caution! explicit type casting below!
            return result;
        };
        // ObjectCache<TestObject>
        const cache = disposables.add(new ObjectCache(factory));
        assert.doesNotThrow(() => {
            cache.get('key1');
        });
        assert.throws(() => {
            cache.get('key2');
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib2JqZWN0Q2FjaGUudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL2FkdmlrYXIvRG9jdW1lbnRzL2FyY2hpdGVjdC9hcmNoMi9BcmNoSURFL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvdGVzdC9jb21tb24vcHJvbXB0U3ludGF4L3V0aWxzL29iamVjdENhY2hlLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFDO0FBQzVCLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxPQUFPLENBQUM7QUFDNUIsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQ25GLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUNwRSxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSwrREFBK0QsQ0FBQztBQUNyRyxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUV6Rzs7R0FFRztBQUNILE1BQU0sVUFBdUQsU0FBUSxvQkFBb0I7SUFDeEYsWUFDaUIsRUFBUTtRQUV4QixLQUFLLEVBQUUsQ0FBQztRQUZRLE9BQUUsR0FBRixFQUFFLENBQU07SUFHekIsQ0FBQztJQUVEOztPQUVHO0lBQ0ksS0FBSyxDQUFDLEtBQXVDO1FBQ25ELE9BQU8sSUFBSSxDQUFDLEVBQUUsS0FBSyxLQUFLLENBQUMsRUFBRSxDQUFDO0lBQzdCLENBQUM7Q0FDRDtBQUVELEtBQUssQ0FBQyxhQUFhLEVBQUU7SUFDcEIsTUFBTSxXQUFXLEdBQUcsdUNBQXVDLEVBQUUsQ0FBQztJQUU5RCxLQUFLLENBQUMsS0FBSyxFQUFFLEdBQUcsRUFBRTtRQUNqQjs7Ozs7O1dBTUc7UUFDSCxNQUFNLGFBQWEsR0FBRyxLQUFLLEVBQXFDLElBQVUsRUFBRSxJQUFVLEVBQUUsRUFBRTtZQUN6RixNQUFNLE9BQU8sR0FBRyxH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