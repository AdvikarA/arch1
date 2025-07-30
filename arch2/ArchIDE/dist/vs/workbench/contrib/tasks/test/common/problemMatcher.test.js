/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as matchers from '../../common/problemMatcher.js';
import assert from 'assert';
import { ValidationStatus } from '../../../../../base/common/parsers.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
class ProblemReporter {
    constructor() {
        this._validationStatus = new ValidationStatus();
        this._messages = [];
    }
    info(message) {
        this._messages.push(message);
        this._validationStatus.state = 1 /* ValidationState.Info */;
    }
    warn(message) {
        this._messages.push(message);
        this._validationStatus.state = 2 /* ValidationState.Warning */;
    }
    error(message) {
        this._messages.push(message);
        this._validationStatus.state = 3 /* ValidationState.Error */;
    }
    fatal(message) {
        this._messages.push(message);
        this._validationStatus.state = 4 /* ValidationState.Fatal */;
    }
    hasMessage(message) {
        return this._messages.indexOf(message) !== null;
    }
    get messages() {
        return this._messages;
    }
    get state() {
        return this._validationStatus.state;
    }
    isOK() {
        return this._validationStatus.isOK();
    }
    get status() {
        return this._validationStatus;
    }
}
suite('ProblemPatternParser', () => {
    let reporter;
    let parser;
    const testRegexp = new RegExp('test');
    ensureNoDisposablesAreLeakedInTestSuite();
    setup(() => {
        reporter = new ProblemReporter();
        parser = new matchers.ProblemPatternParser(reporter);
    });
    suite('single-pattern definitions', () => {
        test('parses a pattern defined by only a regexp', () => {
            const problemPattern = {
                regexp: 'test'
            };
            const parsed = parser.parse(problemPattern);
            assert(reporter.isOK());
            assert.deepStrictEqual(parsed, {
                regexp: testRegexp,
                kind: matchers.ProblemLocationKind.Location,
                file: 1,
                line: 2,
                character: 3,
                message: 0
            });
        });
        test('does not sets defaults for line and character if kind is File', () => {
            const problemPattern = {
                regexp: 'test',
                kind: 'file'
            };
            const parsed = parser.parse(problemPattern);
            assert.deepStrictEqual(parsed, {
                regexp: testRegexp,
                kind: matchers.ProblemLocationKind.File,
                file: 1,
                message: 0
            });
        });
    });
    suite('multi-pattern definitions', () => {
        test('defines a pattern based on regexp and property fields, with file/line location', () => {
            const problemPattern = [
                { regexp: 'test', file: 3, line: 4, column: 5, message: 6 }
            ];
            const parsed = parser.parse(problemPattern);
            assert(reporter.isOK());
            assert.deepStrictEqual(parsed, [{
                    regexp: testRegexp,
                    kind: matchers.ProblemLocationKind.Location,
                    file: 3,
                    line: 4,
                    character: 5,
                    message: 6
                }]);
        });
        test('defines a pattern bsaed on regexp and property fields, with location', () => {
            const problemPattern = [
                { regexp: 'test', file: 3, location: 4, message: 6 }
            ];
            const parsed = parser.parse(problemPattern);
            assert(reporter.isOK());
            assert.deepStrictEqual(parsed, [{
                    regexp: testRegexp,
                    kind: matchers.ProblemLocationKind.Location,
                    file: 3,
                    location: 4,
                    message: 6
                }]);
        });
        test('accepts a pattern that provides the fields from multiple entries', () => {
            const problemPattern = [
                { regexp: 'test', file: 3 },
                { regexp: 'test1', line: 4 },
                { regexp: 'test2', column: 5 },
                { regexp: 'test3', message: 6 }
            ];
            const parsed = parser.parse(problemPattern);
            assert(reporter.isOK());
            assert.deepStrictEqual(parsed, [
                { regexp: testRegexp, kind: matchers.ProblemLocationKind.Location, file: 3 },
                { regexp: new RegExp('test1'), line: 4 },
                { regexp: new RegExp('test2'), character: 5 },
                { regexp: new RegExp('test3'), message: 6 }
            ]);
        });
        test('forbids setting the loop flag outside of the last element in the array', () => {
            const problemPattern = [
                { regexp: 'test', file: 3, loop: true },
                { regexp: 'test1', line: 4 }
            ];
            const parsed = parser.parse(problemPattern);
            assert.strictEqual(null, parsed);
            assert.strictEqual(3 /* ValidationState.Error */, reporter.state);
            assert(reporter.hasMessage('The loop property is only supported on the last line matcher.'));
        });
        test('forbids setting the kind outside of the first element of the array', () => {
            const problemPattern = [
                { regexp: 'test', file: 3 },
                { regexp: 'test1', kind: 'file', line: 4 }
            ];
            const parsed = parser.parse(problemPattern);
            assert.strictEqual(null, parsed);
            assert.strictEqual(3 /* ValidationState.Error */, reporter.state);
            assert(reporter.hasMessage('The problem pattern is invalid. The kind property must be provided only in the first element'));
        });
        test('kind: Location requires a regexp', () => {
            const problemPattern = [
                { file: 0, line: 1, column: 20, message: 0 }
            ];
            const parsed = parser.parse(problemPattern);
            assert.strictEqual(null, parsed);
            assert.strictEqual(3 /* ValidationState.Error */, reporter.state);
            assert(reporter.hasMessage('The problem pattern is missing a regular expression.'));
        });
        test('kind: Location requires a regexp on every entry', () => {
            const problemPattern = [
                { regexp: 'test', file: 3 },
                { line: 4 },
                { regexp: 'test2', column: 5 },
                { regexp: 'test3', message: 6 }
            ];
            const parsed = parser.parse(problemPattern);
            assert.strictEqual(null, parsed);
            assert.strictEqual(3 /* ValidationState.Error */, reporter.state);
            assert(reporter.hasMessage('The problem pattern is missing a regular expression.'));
        });
        test('kind: Location requires a message', () => {
            const problemPattern = [
                { regexp: 'test', file: 0, line: 1, column: 20 }
            ];
            const parsed = parser.parse(problemPattern);
            assert.strictEqual(null, parsed);
            assert.strictEqual(3 /* ValidationState.Error */, reporter.state);
            assert(reporter.hasMessage('The problem pattern is invalid. It must have at least have a file and a message.'));
        });
        test('kind: Location requires a file', () => {
            const problemPattern = [
                { regexp: 'test', line: 1, column: 20, message: 0 }
            ];
            const parsed = parser.parse(problemPattern);
            assert.strictEqual(null, parsed);
            assert.strictEqual(3 /* ValidationState.Error */, reporter.state);
            assert(reporter.hasMessage('The problem pattern is invalid. It must either have kind: "file" or have a line or location match group.'));
        });
        test('kind: Location requires either a line or location', () => {
            const problemPattern = [
                { regexp: 'test', file: 1, column: 20, message: 0 }
            ];
            const parsed = parser.parse(problemPattern);
            assert.strictEqual(null, parsed);
            assert.strictEqual(3 /* ValidationState.Error */, reporter.state);
            assert(reporter.hasMessage('The problem pattern is invalid. It must either have kind: "file" or have a line or location match group.'));
        });
        test('kind: File accepts a regexp, file and message', () => {
            const problemPattern = [
                { regexp: 'test', file: 2, kind: 'file', message: 6 }
            ];
            const parsed = parser.parse(problemPattern);
            assert(reporter.isOK());
            assert.deepStrictEqual(parsed, [{
                    regexp: testRegexp,
                    kind: matchers.ProblemLocationKind.File,
                    file: 2,
                    message: 6
                }]);
        });
        test('kind: File requires a file', () => {
            const problemPattern = [
                { regexp: 'test', kind: 'file', message: 6 }
            ];
            const parsed = parser.parse(problemPattern);
            assert.strictEqual(null, parsed);
            assert.strictEqual(3 /* ValidationState.Error */, reporter.state);
            assert(reporter.hasMessage('The problem pattern is invalid. It must have at least have a file and a message.'));
        });
        test('kind: File requires a message', () => {
            const problemPattern = [
                { regexp: 'test', kind: 'file', file: 6 }
            ];
            const parsed = parser.parse(problemPattern);
            assert.strictEqual(null, parsed);
            assert.strictEqual(3 /* ValidationState.Error */, reporter.state);
            assert(reporter.hasMessage('The problem pattern is invalid. It must have at least have a file and a message.'));
        });
        test('empty pattern array should be handled gracefully', () => {
            const problemPattern = [];
            const parsed = parser.parse(problemPattern);
            assert.strictEqual(null, parsed);
            assert.strictEqual(3 /* ValidationState.Error */, reporter.state);
            assert(reporter.hasMessage('The problem pattern is invalid. It must contain at least one pattern.'));
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvYmxlbU1hdGNoZXIudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL2FkdmlrYXIvRG9jdW1lbnRzL2FyY2hpdGVjdC9hcmNoMi9BcmNoSURFL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rhc2tzL3Rlc3QvY29tbW9uL3Byb2JsZW1NYXRjaGVyLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFDaEcsT0FBTyxLQUFLLFFBQVEsTUFBTSxnQ0FBZ0MsQ0FBQztBQUUzRCxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFxQyxnQkFBZ0IsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQzVHLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBRW5HLE1BQU0sZUFBZTtJQUlwQjtRQUNDLElBQUksQ0FBQyxpQkFBaUIsR0FBRyxJQUFJLGdCQUFnQixFQUFFLENBQUM7UUFDaEQsSUFBSSxDQUFDLFNBQVMsR0FBRyxFQUFFLENBQUM7SUFDckIsQ0FBQztJQUVNLElBQUksQ0FBQyxPQUFlO1FBQzFCLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQzdCLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxLQUFLLCtCQUF1QixDQUFDO0lBQ3JELENBQUM7SUFFTSxJQUFJLENBQUMsT0FBZTtRQUMxQixJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUM3QixJQUFJLENBQUMsaUJBQWlCLENBQUMsS0FBSyxrQ0FBMEIsQ0FBQztJQUN4RCxDQUFDO0lBRU0sS0FBSyxDQUFDLE9BQWU7UUFDM0IsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDN0IsSUFBSSxDQUFDLGlCQUFpQixDQUFDLEtBQUssZ0NBQXdCLENBQUM7SUFDdEQsQ0FBQztJQUVNLEtB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