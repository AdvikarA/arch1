/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import * as types from '../../common/types.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from './utils.js';
import { assertDefined, isOneOf, typeCheck } from '../../common/types.js';
suite('Types', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('isFunction', () => {
        assert(!types.isFunction(undefined));
        assert(!types.isFunction(null));
        assert(!types.isFunction('foo'));
        assert(!types.isFunction(5));
        assert(!types.isFunction(true));
        assert(!types.isFunction([]));
        assert(!types.isFunction([1, 2, '3']));
        assert(!types.isFunction({}));
        assert(!types.isFunction({ foo: 'bar' }));
        assert(!types.isFunction(/test/));
        assert(!types.isFunction(new RegExp('')));
        assert(!types.isFunction(new Date()));
        assert(types.isFunction(assert));
        assert(types.isFunction(function foo() { }));
    });
    test('areFunctions', () => {
        assert(!types.areFunctions());
        assert(!types.areFunctions(null));
        assert(!types.areFunctions('foo'));
        assert(!types.areFunctions(5));
        assert(!types.areFunctions(true));
        assert(!types.areFunctions([]));
        assert(!types.areFunctions([1, 2, '3']));
        assert(!types.areFunctions({}));
        assert(!types.areFunctions({ foo: 'bar' }));
        assert(!types.areFunctions(/test/));
        assert(!types.areFunctions(new RegExp('')));
        assert(!types.areFunctions(new Date()));
        assert(!types.areFunctions(assert, ''));
        assert(types.areFunctions(assert));
        assert(types.areFunctions(assert, assert));
        assert(types.areFunctions(function foo() { }));
    });
    test('isObject', () => {
        assert(!types.isObject(undefined));
        assert(!types.isObject(null));
        assert(!types.isObject('foo'));
        assert(!types.isObject(5));
        assert(!types.isObject(true));
        assert(!types.isObject([]));
        assert(!types.isObject([1, 2, '3']));
        assert(!types.isObject(/test/));
        assert(!types.isObject(new RegExp('')));
        assert(!types.isFunction(new Date()));
        assert.strictEqual(types.isObject(assert), false);
        assert(!types.isObject(function foo() { }));
        assert(types.isObject({}));
        assert(types.isObject({ foo: 'bar' }));
    });
    test('isEmptyObject', () => {
        assert(!types.isEmptyObject(undefined));
        assert(!types.isEmptyObject(null));
        assert(!types.isEmptyObject('foo'));
        assert(!types.isEmptyObject(5));
        assert(!types.isEmptyObject(true));
        assert(!types.isEmptyObject([]));
        assert(!types.isEmptyObject([1, 2, '3']));
        assert(!types.isEmptyObject(/test/));
        assert(!types.isEmptyObject(new RegExp('')));
        assert(!types.isEmptyObject(new Date()));
        assert.strictEqual(types.isEmptyObject(assert), false);
        assert(!types.isEmptyObject(function foo() { }));
        assert(!types.isEmptyObject({ foo: 'bar' }));
        assert(types.isEmptyObject({}));
    });
    test('isString', () => {
        assert(!types.isString(undefined));
        assert(!types.isString(null));
        assert(!types.isString(5));
        assert(!types.isString([]));
        assert(!types.isString([1, 2, '3']));
        assert(!types.isString(true));
        assert(!types.isString({}));
        assert(!types.isString(/test/));
        assert(!types.isString(new RegExp('')));
        assert(!types.isString(new Date()));
        assert(!types.isString(assert));
        assert(!types.isString(function foo() { }));
        assert(!types.isString({ foo: 'bar' }));
        assert(types.isString('foo'));
    });
    test('isNumber', () => {
        assert(!types.isNumber(undefined));
        assert(!types.isNumber(null));
        assert(!types.isNumber('foo'));
        assert(!types.isNumber([]));
        assert(!types.isNumber([1, 2, '3']));
        assert(!types.isNumber(true));
        assert(!types.isNumber({}));
        assert(!types.isNumber(/test/));
        assert(!types.isNumber(new RegExp('')));
        assert(!types.isNumber(new Date()));
        assert(!types.isNumber(assert));
        assert(!types.isNumber(function foo() { }));
        assert(!types.isNumber({ foo: 'bar' }));
        assert(!types.isNumber(parseInt('A', 10)));
        assert(types.isNumber(5));
    });
    test('isUndefined', () => {
        assert(!types.isUndefined(null));
        assert(!types.isUndefined('foo'));
        assert(!types.isUndefined([]));
        assert(!types.isUndefined([1, 2, '3']));
        assert(!types.isUndefined(true));
        assert(!types.isUndefined({}));
        assert(!types.isUndefined(/test/));
        assert(!types.isUndefined(new RegExp('')));
        assert(!types.isUndefined(new Date()));
        assert(!types.isUndefined(assert));
        assert(!types.isUndefined(function foo() { }));
        assert(!types.isUndefined({ foo: 'bar' }));
        assert(types.isUndefined(undefined));
    });
    test('isUndefinedOrNull', () => {
        assert(!types.isUndefinedOrNull('foo'));
        assert(!types.isUndefinedOrNull([]));
        assert(!types.isUndefinedOrNull([1, 2, '3']));
        assert(!types.isUndefinedOrNull(true));
        assert(!types.isUndefinedOrNull({}));
        assert(!types.isUndefinedOrNull(/test/));
        assert(!types.isUndefinedOrNull(new RegExp('')));
        assert(!types.isUndefinedOrNull(new Date()));
        assert(!types.isUndefinedOrNull(assert));
        assert(!types.isUndefinedOrNull(function foo() { }));
        assert(!types.isUndefinedOrNull({ foo: 'bar' }));
        assert(types.isUndefinedOrNull(undefined));
        assert(types.isUndefinedOrNull(null));
    });
    test('assertIsDefined / assertAreDefined', () => {
        assert.throws(() => types.assertReturnsDefined(undefined));
        assert.throws(() => types.assertReturnsDefined(null));
        assert.throws(() => types.assertReturnsAllDefined(null, undefined));
        assert.throws(() => types.assertReturnsAllDefined(true, undefined));
        assert.throws(() => types.assertReturnsAllDefined(undefined, false));
        assert.strictEqual(types.assertReturnsDefined(true), true);
        assert.strictEqual(types.assertReturnsDefined(false), false);
        assert.strictEqual(types.assertReturnsDefined('Hello'), 'Hello');
        assert.strictEqual(types.assertReturnsDefined(''), '');
        const res = types.assertReturnsAllDefined(1, true, 'Hello');
        assert.strictEqual(res[0], 1);
        assert.strictEqual(res[1], true);
        assert.strictEqual(res[2], 'Hello');
    });
    suite('assertDefined', () => {
        test('should not throw if `value` is defined (bool)', async () => {
            assert.doesNotThrow(function () {
                assertDefined(true, 'Oops something happened.');
            });
        });
        test('should not throw if `value` is defined (number)', async () => {
            assert.doesNotThrow(function () {
                assertDefined(5, 'Oops something happened.');
            });
        });
        test('should not throw if `value` is defined (zero)', async () => {
            assert.doesNotThrow(function () {
                assertDefined(0, 'Oops something happened.');
            });
        });
        test('should not throw if `value` is defined (string)', async () => {
            assert.doesNotThrow(function () {
                assertDefined('some string', 'Oops something happened.');
            });
        });
        test('should not throw if `value` is defined (empty string)', async () => {
            assert.doesNotThrow(function () {
                assertDefined('', 'Oops something happened.');
            });
        });
        /**
         * Note! API of `assert.throws()` is different in the browser
         * and in Node.js, and it is not possible to use the same code
         * here. Therefore we had to resort to the manual try/catch.
         */
        const assertThrows = (testFunction, errorMessage) => {
            let thrownError;
            try {
                testFunction();
            }
            catch (e) {
                thrownError = e;
            }
            assertDefined(thrownError, 'Must throw an error.');
            assert(thrownError instanceof Error, 'Error must be an instance of `Error`.');
            assert.strictEqual(thrownError.message, errorMessage, 'Error must have correct message.');
        };
        test('should throw if `value` is `null`', async () => {
            const errorMessage = 'Uggh ohh!';
            assertThrows(() => {
                assertDefined(null, errorMessage);
            }, errorMessage);
        });
        test('should throw if `value` is `undefined`', async () => {
            const errorMessage = 'Oh no!';
            assertThrows(() => {
                assertDefined(undefined, new Error(errorMessage));
            }, errorMessage);
        });
        test('should throw assertion error by default', async () => {
            const errorMessage = 'Uggh ohh!';
            let thrownError;
            try {
                assertDefined(null, errorMessage);
            }
            catch (e) {
                thrownError = e;
            }
            assertDefined(thrownError, 'Must throw an error.');
            assert(thrownError instanceof Error, 'Error must be an instance of `Error`.');
            assert.strictEqual(thrownError.message, errorMessage, 'Error must have correct message.');
        });
        test('should throw provided error instance', async () => {
            class TestError extends Error {
                constructor(...args) {
                    super(...args);
                    this.name = 'TestError';
                }
            }
            const errorMessage = 'Oops something hapenned.';
            const error = new TestError(errorMessage);
            let thrownError;
            try {
                assertDefined(null, error);
            }
            catch (e) {
                thrownError = e;
            }
            assert(thrownError instanceof TestError, 'Error must be an instance of `TestError`.');
            assert.strictEqual(thrownError.message, errorMessage, 'Error must have correct message.');
        });
    });
    suite('isOneOf', () => {
        suite('success', () => {
            suite('string', () => {
                test('type', () => {
                    assert.doesNotThrow(() => {
                        assert(isOneOf('foo', ['foo', 'bar']), 'Foo must be one of: foo, bar');
                    });
                });
                test('subtype', () => {
                    assert.doesNotThrow(() => {
                        const item = 'hi';
                        const list = ['hi', 'ciao'];
                        assert(isOneOf(item, list), 'Hi must be one of: hi, ciao');
                        typeCheck(item);
                    });
                });
            });
            suite('number', () => {
                test('type', () => {
                    assert.doesNotThrow(() => {
                        assert(isOneOf(10, [10, 100]), '10 must be one of: 10, 100');
                    });
                });
                test('subtype', () => {
                    assert.doesNotThrow(() => {
                        const item = 20;
                        const list = [20, 2000];
                        assert(isOneOf(item, list), '20 must be one of: 20, 2000');
                        typeCheck(item);
                    });
                });
            });
            suite('boolean', () => {
                test('type', () => {
                    assert.doesNotThrow(() => {
                        assert(isOneOf(true, [true, false]), 'true must be one of: true, false');
                    });
                    assert.doesNotThrow(() => {
                        assert(isOneOf(false, [true, false]), 'false must be one of: true, false');
                    });
                });
                test('subtype (true)', () => {
                    assert.doesNotThrow(() => {
                        const item = true;
                        const list = [true, true];
                        assert(isOneOf(item, list), 'true must be one of: true, true');
                        typeCheck(item);
                    });
                });
                test('subtype (false)', () => {
                    assert.doesNotThrow(() => {
                        const item = false;
                        const list = [false, true];
                        assert(isOneOf(item, list), 'false must be one of: false, true');
                        typeCheck(item);
                    });
                });
            });
            suite('undefined', () => {
                test('type', () => {
                    assert.doesNotThrow(() => {
                        assert(isOneOf(undefined, [undefined]), 'undefined must be one of: undefined');
                    });
                    assert.doesNotThrow(() => {
                        assert(isOneOf(undefined, [void 0]), 'undefined must be one of: void 0');
                    });
                });
                test('subtype', () => {
                    assert.doesNotThrow(() => {
                        let item;
                        const list = [undefined];
                        assert(isOneOf(item, list), 'undefined | null must be one of: undefined');
                        typeCheck(item);
                    });
                });
            });
            suite('null', () => {
                test('type', () => {
                    assert.doesNotThrow(() => {
                        assert(isOneOf(null, [null]), 'null must be one of: null');
                    });
                });
                test('subtype', () => {
                    assert.doesNotThrow(() => {
                        const item = null;
                        const list = [null];
                        assert(isOneOf(item, list), 'null must be one of: null');
                        typeCheck(item);
                    });
                });
            });
            suite('any', () => {
                test('item', () => {
                    assert.doesNotThrow(() => {
                        const item = '1';
                        const list = ['2', '1'];
                        assert(isOneOf(item, list), '1 must be one of: 2, 1');
                        typeCheck(item);
                    });
                });
                test('list', () => {
                    assert.doesNotThrow(() => {
                        const item = '5';
                        const list = ['3', '5', '2.5'];
                        assert(isOneOf(item, list), '5 must be one of: 3, 5, 2.5');
                        typeCheck(item);
                    });
                });
                test('both', () => {
                    assert.doesNotThrow(() => {
                        const item = '12';
                        const list = ['14.25', '7', '12'];
                        assert(isOneOf(item, list), '12 must be one of: 14.25, 7, 12');
                        typeCheck(item);
                    });
                });
            });
            suite('unknown', () => {
                test('item', () => {
                    assert.doesNotThrow(() => {
                        const item = '1';
                        const list = ['2', '1'];
                        assert(isOneOf(item, list), '1 must be one of: 2, 1');
                        typeCheck(item);
                    });
                });
                test('both', () => {
                    assert.doesNotThrow(() => {
                        const item = '12';
                        const list = ['14.25', '7', '12'];
                        assert(isOneOf(item, list), '12 must be one of: 14.25, 7, 12');
                        typeCheck(item);
                    });
                });
            });
        });
        suite('failure', () => {
            suite('string', () => {
                test('type', () => {
                    assert.throws(() => {
                        const item = 'baz';
                        assert(isOneOf(item, ['foo', 'bar']), 'Baz must not be one of: foo, bar');
                    });
                });
                test('subtype', () => {
                    assert.throws(() => {
                        const item = 'vitannia';
                        const list = ['hi', 'ciao'];
                        assert(isOneOf(item, list), 'vitannia must be one of: hi, ciao');
                    });
                });
                test('empty', () => {
                    assert.throws(() => {
                        const item = 'vitannia';
                        const list = [];
                        assert(isOneOf(item, list), 'vitannia must be one of: empty');
                    });
                });
            });
            suite('number', () => {
                test('type', () => {
                    assert.throws(() => {
                        assert(isOneOf(19, [10, 100]), '19 must not be one of: 10, 100');
                    });
                });
                test('subtype', () => {
                    assert.throws(() => {
                        const item = 24;
                        const list = [20, 2000];
                        assert(isOneOf(item, list), '24 must not be one of: 20, 2000');
                    });
                });
                test('empty', () => {
                    assert.throws(() => {
                        const item = 20;
                        const list = [];
                        assert(isOneOf(item, list), '20 must not be one of: empty');
                    });
                });
            });
            suite('boolean', () => {
                test('type', () => {
                    assert.throws(() => {
                        assert(isOneOf(true, [false]), 'true must not be one of: false');
                    });
                    assert.throws(() => {
                        assert(isOneOf(false, [true]), 'false must not be one of: true');
                    });
                });
                test('subtype (true)', () => {
                    assert.throws(() => {
                        const item = true;
                        const list = [false];
                        assert(isOneOf(item, list), 'true must not be one of: false');
                    });
                });
                test('subtype (false)', () => {
                    assert.throws(() => {
                        const item = false;
                        const list = [true, true, true];
                        assert(isOneOf(item, list), 'false must be one of: true, true, true');
                    });
                });
                test('empty', () => {
                    assert.throws(() => {
                        const item = true;
                        const list = [];
                        assert(isOneOf(item, list), 'true must be one of: empty');
                    });
                });
            });
            suite('undefined', () => {
                test('type', () => {
                    assert.throws(() => {
                        assert(isOneOf(undefined, []), 'undefined must not be one of: empty');
                    });
                    assert.throws(() => {
                        assert(isOneOf(void 0, []), 'void 0 must not be one of: empty');
                    });
                });
                test('subtype', () => {
                    assert.throws(() => {
                        let item;
                        const list = [null];
                        assert(isOneOf(item, list), 'undefined must be one of: null');
                    });
                });
                test('empty', () => {
                    assert.throws(() => {
                        let item;
                        const list = [];
                        assert(isOneOf(item, list), 'undefined must be one of: empty');
                    });
                });
            });
            suite('null', () => {
                test('type', () => {
                    assert.throws(() => {
                        assert(isOneOf(null, []), 'null must be one of: empty');
                    });
                });
                test('subtype', () => {
                    assert.throws(() => {
                        const item = null;
                        const list = [];
                        assert(isOneOf(item, list), 'null must be one of: empty');
                    });
                });
            });
            suite('any', () => {
                test('item', () => {
                    assert.throws(() => {
                        const item = '1';
                        const list = ['3', '4'];
                        assert(isOneOf(item, list), '1 must not be one of: 3, 4');
                    });
                });
                test('list', () => {
                    assert.throws(() => {
                        const item = '5';
                        const list = ['3', '6', '2.5'];
                        assert(isOneOf(item, list), '5 must not be one of: 3, 6, 2.5');
                    });
                });
                test('both', () => {
                    assert.throws(() => {
                        const item = '12';
                        const list = ['14.25', '7', '15'];
                        assert(isOneOf(item, list), '12 must not be one of: 14.25, 7, 15');
                    });
                });
                test('empty', () => {
                    assert.throws(() => {
                        const item = '25';
                        const list = [];
                        assert(isOneOf(item, list), '25 must not be one of: empty');
                    });
                });
            });
            suite('unknown', () => {
                test('item', () => {
                    assert.throws(() => {
                        const item = '100';
                        const list = ['12', '11'];
                        assert(isOneOf(item, list), '100 must not be one of: 12, 11');
                    });
                    test('both', () => {
                        assert.throws(() => {
                            const item = '21';
                            const list = ['14.25', '7', '12'];
                            assert(isOneOf(item, list), '21 must not be one of: 14.25, 7, 12');
                        });
                    });
                });
            });
        });
    });
    test('validateConstraints', () => {
        types.validateConstraints([1, 'test', true], [Number, String, Boolean]);
        types.validateConstraints([1, 'test', true], ['number', 'string', 'boolean']);
        types.validateConstraints([console.log], [Function]);
        types.validateConstraints([undefined], [types.isUndefined]);
        types.validateConstraints([1], [types.isNumber]);
        class Foo {
        }
        types.validateConstraints([new Foo()], [Foo]);
        function isFoo(f) { }
        assert.throws(() => types.validateConstraints([new Foo()], [isFoo]));
        function isFoo2(f) { return true; }
        types.validateConstraints([new Foo()], [isFoo2]);
        assert.throws(() => types.validateConstraints([1, true], [types.isNumber, types.isString]));
        assert.throws(() => types.validateConstraints(['2'], [types.isNumber]));
        assert.throws(() => types.validateConstraints([1, 'test', true], [Number, String, Number]));
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHlwZXMudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL2FkdmlrYXIvRG9jdW1lbnRzL2FyY2hpdGVjdC9hcmNoMi9BcmNoSURFL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvdGVzdC9jb21tb24vdHlwZXMudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxLQUFLLEtBQUssTUFBTSx1QkFBdUIsQ0FBQztBQUMvQyxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSxZQUFZLENBQUM7QUFDckUsT0FBTyxFQUFFLGFBQWEsRUFBRSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFFMUUsS0FBSyxDQUFDLE9BQU8sRUFBRSxHQUFHLEVBQUU7SUFFbkIsdUNBQXVDLEVBQUUsQ0FBQztJQUUxQyxJQUFJLENBQUMsWUFBWSxFQUFFLEdBQUcsRUFBRTtRQUN2QixNQUFNLENBQUMsQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUM7UUFDckMsTUFBTSxDQUFDLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO1FBQ2hDLE1BQU0sQ0FBQyxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztRQUNqQyxNQUFNLENBQUMsQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDN0IsTUFBTSxDQUFDLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO1FBQ2hDLE1BQU0sQ0FBQyxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUM5QixNQUFNLENBQUMsQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDdkMsTUFBTSxDQUFDLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQzlCLE1BQU0sQ0FBQyxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsRUFBRSxHQUFHLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQzFDLE1BQU0sQ0FBQyxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztRQUNsQyxNQUFNLENBQUMsQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLElBQUksTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUMxQyxNQUFNLENBQUMsQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLElBQUksSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBRXRDLE1BQU0sQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7UUFDakMsTUFBTSxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsU0FBUyxHQUFHLEtBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNuRCxDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyxjQUFjLEVBQUUsR0FBRyxFQUFFO1FBQ3pCLE1BQU0sQ0FBQyxDQUFDLEtBQUssQ0FBQyxZQUFZLEVBQUUsQ0FBQyxDQUFDO1FBQzlCLE1BQU0sQ0FBQyxDQUFDLEtBQUssQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztRQUNsQyxNQUFNLENBQUMsQ0FBQyxLQUFLLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7UUFDbkMsTUFBTSxDQUFDLENBQUMsS0FBSyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQy9CLE1BQU0sQ0FBQyxDQUFDLEtBQUssQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztRQUNsQyxNQUFNLENBQUMsQ0FBQyxLQUFLLENBQUMsWUFBWSxDQUFDLEVB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TUFBTSxDQUFDLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDO1FBQ3hDLE1BQU0sQ0FBQyxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztRQUNuQyxNQUFNLENBQUMsQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7UUFDcEMsTUFBTSxDQUFDLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ2hDLE1BQU0sQ0FBQyxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztRQUNuQyxNQUFNLENBQUMsQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDakMsTUFBTSxDQUFDLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzFDLE1BQU0sQ0FBQyxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztRQUNyQyxNQUFNLENBQUMsQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFDLElBQUksTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUM3QyxNQUFNLENBQUMsQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFDLElBQUksSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ3pDLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxNQUFNLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUN2RCxNQUFNLENBQUMsQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFDLFNBQVMsR0FBRyxLQUFVLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDdEQsTUFBTSxDQUFDLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxFQUFFLEdBQUcsRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFFN0MsTUFBTSxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztJQUNqQyxDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyxVQUFVLEVBQUUsR0FBRyxFQUFFO1FBQ3JCLE1BQU0sQ0FBQyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQztRQUNuQyxNQUFNLENBQUMsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7UUFDOUIsTUFBTSxDQUFDLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzNCLE1BQU0sQ0FBQyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUM1QixNQUFNLENBQUMsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDckMsTUFBTSxDQUFDLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO1FBQzlCLE1BQU0sQ0FBQyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUM1QixNQUFNLENBQUMsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7UUFDaEMsTUFBTSxDQUFDLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxJQUFJLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDeEMsTUFBTSxDQUFDLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxJQUFJLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQztRQUNwQyxNQUFNLENBQUMsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7UUFDaEMsTUFBTSxDQUFDLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxTQUFTLEdBQUcsS0FBVSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ2pELE1BQU0sQ0FBQyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsRUFBRSxHQUFHLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBRXhDLE1BQU0sQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7SUFDL0IsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsVUFBVSxFQUFFLEdBQUcsRUFBRTtRQUNyQixNQUFNLENBQUMsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUM7UUFDbkMsTUFBTSxDQUFDLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO1FBQzlCLE1BQU0sQ0FBQyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztRQUMvQixNQUFNLENBQUMsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDNUIsTUFBTSxDQUFDLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3JDLE1BQU0sQ0FBQyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztRQUM5QixNQUFNLENBQUMsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDNUIsTUFBTSxDQUFDLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO1FBQ2hDLE1BQU0sQ0FBQyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsSUFBSSxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3hDLE1BQU0sQ0FBQyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsSUFBSSxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDcEMsTUFBTSxDQUFDLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO1FBQ2hDLE1BQU0sQ0FBQyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsU0FBUyxHQUFHLEtBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNqRCxNQUFNLENBQUMsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLEVBQUUsR0FBRyxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQztRQUN4QyxNQUFNLENBQUMsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRTNDLE1BQU0sQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDM0IsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsYUFBYSxFQUFFLEdBQUcsRUFBRTtRQUN4QixNQUFNLENBQUMsQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7UUFDakMsTUFBTSxDQUFDLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO1FBQ2xDLE1BQU0sQ0FBQyxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUMvQixNQUFNLENBQUMsQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDeEMsTUFBTSxDQUFDLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO1FBQ2pDLE1BQU0sQ0FBQyxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUMvQixNQUFNLENBQUMsQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7UUFDbkMsTUFBTSxDQUFDLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxJQUFJLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDM0MsTUFBTSxDQUFDLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxJQUFJLElBQUksRUFBRSxDQUFDLENBQUMsQ0FBQztRQUN2QyxNQUFNLENBQUMsQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7UUFDbkMsTUFBTSxDQUFDLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxTQUFTLEdBQUcsS0FBVSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3BELE1BQU0sQ0FBQyxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsRUFBRSxHQUFHLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBRTNDLE1BQU0sQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUM7SUFDdEMsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsbUJBQW1CLEVBQUUsR0FBRyxFQUFFO1FBQzlCLE1BQU0sQ0FBQyxDQUFDLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO1FBQ3hDLE1BQU0sQ0FBQyxDQUFDLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ3JDLE1BQU0sQ0FBQyxDQUFDLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzlDLE1BQU0sQ0FBQyxDQUFDLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO1FBQ3ZDLE1BQU0sQ0FBQyxDQUFDLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ3JDLE1BQU0sQ0FBQyxDQUFDLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO1FBQ3pDLE1BQU0sQ0FBQyxDQUFDLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLE1BQU0sQ0FB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