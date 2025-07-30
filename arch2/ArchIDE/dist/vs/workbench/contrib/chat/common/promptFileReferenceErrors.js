/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { basename } from '../../../../base/common/path.js';
import { assert, assertNever } from '../../../../base/common/assert.js';
/**
 * Base prompt parsing error class.
 */
class ParseError extends Error {
    constructor(message, options) {
        super(message, options);
    }
    /**
     * Check if provided object is of the same type as this error.
     */
    sameTypeAs(other) {
        if (other === null || other === undefined) {
            return false;
        }
        return other instanceof this.constructor;
    }
    /**
     * Check if provided object is equal to this error.
     */
    equal(other) {
        return this.sameTypeAs(other);
    }
}
/**
 * Base resolve error class used when file reference resolution fails.
 */
export class ResolveError extends ParseError {
    constructor(uri, message, options) {
        super(message, options);
        this.uri = uri;
    }
}
/**
 * A generic error for failing to resolve prompt contents stream.
 */
export class FailedToResolveContentsStream extends ResolveError {
    constructor(uri, originalError, message = `Failed to resolve prompt contents stream for '${uri.toString()}': ${originalError}.`) {
        super(uri, message);
        this.originalError = originalError;
        this.errorType = 'FailedToResolveContentsStream';
    }
}
/**
 * Error that reflects the case when attempt to open target file fails.
 */
export class OpenFailed extends FailedToResolveContentsStream {
    constructor(uri, originalError) {
        super(uri, originalError, `Failed to open '${uri.fsPath}': ${originalError}.`);
        this.errorType = 'OpenError';
    }
}
/**
 * Character use to join filenames/paths in a chain of references that
 * lead to recursion.
 */
const DEFAULT_RECURSIVE_PATH_JOIN_CHAR = ' -> ';
/**
 * Error that reflects the case when attempt resolve nested file
 * references failes due to a recursive reference, e.g.,
 *
 * ```markdown
 * // a.md
 * #file:b.md
 * ```
 *
 * ```markdown
 * // b.md
 * #file:a.md
 * ```
 */
export class RecursiveReference extends ResolveError {
    constructor(uri, recursivePath) {
        // sanity check - a recursive path must always have at least
        // two items in the list, otherwise it is not a recursive loop
        assert(recursivePath.length >= 2, `Recursive path must contain at least two paths, got '${recursivePath.length}'.`);
        super(uri, 'Recursive references found.');
        this.recursivePath = recursivePath;
        this.errorType = 'RecursiveReferenceError';
    }
    get message() {
        return `${super.message} ${this.getRecursivePathString('fullpath')}`;
    }
    /**
     * Returns a string representation of the recursive path.
     */
    getRecursivePathString(filename, pathJoinCharacter = DEFAULT_RECURSIVE_PATH_JOIN_CHAR) {
        const isDefault = (filename === 'fullpath') &&
            (pathJoinCharacter === DEFAULT_RECURSIVE_PATH_JOIN_CHAR);
        if (isDefault && (this.defaultPathStringCache !== undefined)) {
            return this.defaultPathStringCache;
        }
        const result = this.recursivePath
            .map((path) => {
            if (filename === 'fullpath') {
                return `'${path}'`;
            }
            if (filename === 'basename') {
                return `'${basename(path)}'`;
            }
            assertNever(filename, `Unknown filename format '${filename}'.`);
        })
            .join(pathJoinCharacter);
        if (isDefault) {
            this.defaultPathStringCache = result;
        }
        return result;
    }
    /**
     * Check if provided object is of the same type as this
     * error, contains the same recursive path and URI.
     */
    equal(other) {
        if (!this.sameTypeAs(other)) {
            return false;
        }
        if (this.uri.toString() !== other.uri.toString()) {
            return false;
        }
        // performance optimization - compare number of paths in the
        // recursive path chains first to avoid comparison of all strings
        if (this.recursivePath.length !== other.recursivePath.length) {
            return false;
        }
        const myRecursivePath = this.getRecursivePathString('fullpath');
        const theirRecursivePath = other.getRecursivePathString('fullpath');
        // performance optimization - if the path lengths don't match,
        // no need to compare entire strings as they must be different
        if (myRecursivePath.length !== theirRecursivePath.length) {
            return false;
        }
        return myRecursivePath === theirRecursivePath;
    }
    /**
     * Returns a string representation of the error object.
     */
    toString() {
        return `"${this.message}"(${this.uri})`;
    }
}
/**
 * Error for the case when a resource URI doesn't point to a prompt file.
 */
export class NotPromptFile extends ResolveError {
    constructor(uri, message = '') {
        const suffix = message ? `: ${message}` : '';
        super(uri, `Resource at ${uri.path} is not a prompt file${suffix}`);
        this.errorType = 'NotPromptFileError';
    }
}
/**
 * Error for the case when a resource URI points to a folder.
 */
export class FolderReference extends NotPromptFile {
    constructor(uri, message = '') {
        const suffix = message ? `: ${message}` : '';
        super(uri, `Entity at '${uri.path}' is a folder${suffix}`);
        this.errorType = 'FolderReferenceError';
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvbXB0RmlsZVJlZmVyZW5jZUVycm9ycy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL2FkdmlrYXIvRG9jdW1lbnRzL2FyY2hpdGVjdC9hcmNoMi9BcmNoSURFL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvY29tbW9uL3Byb21wdEZpbGVSZWZlcmVuY2VFcnJvcnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQzNELE9BQU8sRUFBRSxNQUFNLEVBQUUsV0FBVyxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFFeEU7O0dBRUc7QUFDSCxNQUFlLFVBQVcsU0FBUSxLQUFLO0lBTXRDLFlBQ0MsT0FBZ0IsRUFDaEIsT0FBc0I7UUFFdEIsS0FBSyxDQUFDLE9BQU8sRUFBRSxPQUFPLENBQUMsQ0FBQztJQUN6QixDQUFDO0lBRUQ7O09BRUc7SUFDSSxVQUFVLENBQUMsS0FBYztRQUMvQixJQUFJLEtBQUssS0FBSyxJQUFJLElBQUksS0FBSyxLQUFLLFNBQVMsRUFBRSxDQUFDO1lBQzNDLE9BQU8sS0FBSyxDQUFDO1FBQ2QsQ0FBQztRQUVELE9BQU8sS0FBSyxZQUFZLElBQUksQ0FBQyxXQUFXLENBQUM7SUFDMUMsQ0FBQztJQUVEOztPQUVHO0lBQ0ksS0FBSyxDQUFDLEtBQWM7UUFDMUIsT0FBTyxJQUFJLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQy9CLENBQUM7Q0FDRDtBQUVEOztHQUVHO0FBQ0gsTUFBTSxPQUFnQixZQUFhLFNBQVEsVUFBVTtJQUdwRCxZQUNpQixHQUFRLEVBQ3hCLE9BQWdCLEVBQ2hCLE9BQXNCO1FBRXRCLEtBQUssQ0FBQyxPQUFPLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFKUixRQUFHLEdBQUgsR0FBRyxDQUFLO0lBS3pCLENBQUM7Q0FDRDtBQUVEOztHQUVHO0FBQ0gsTUFB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