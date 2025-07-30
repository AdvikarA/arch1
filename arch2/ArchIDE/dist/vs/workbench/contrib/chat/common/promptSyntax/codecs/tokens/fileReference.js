/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { PromptVariableWithData } from './promptVariable.js';
import { assert } from '../../../../../../../base/common/assert.js';
/**
 * Name of the variable.
 */
const VARIABLE_NAME = 'file';
/**
 * Object represents a file reference token inside a chatbot prompt.
 */
export class FileReference extends PromptVariableWithData {
    constructor(range, path) {
        super(range, VARIABLE_NAME, path);
        this.path = path;
    }
    /**
     * Create a {@link FileReference} from a {@link PromptVariableWithData} instance.
     * @throws if variable name is not equal to {@link VARIABLE_NAME}.
     */
    static from(variable) {
        assert(variable.name === VARIABLE_NAME, `Variable name must be '${VARIABLE_NAME}', got '${variable.name}'.`);
        return new FileReference(variable.range, variable.data);
    }
    /**
     * Get the range of the `link` part of the token (e.g.,
     * the `/path/to/file.md` part of `#file:/path/to/file.md`).
     */
    get linkRange() {
        return super.dataRange;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmlsZVJlZmVyZW5jZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL2FkdmlrYXIvRG9jdW1lbnRzL2FyY2hpdGVjdC9hcmNoMi9BcmNoSURFL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvY29tbW9uL3Byb21wdFN5bnRheC9jb2RlY3MvdG9rZW5zL2ZpbGVSZWZlcmVuY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0scUJBQXFCLENBQUM7QUFDN0QsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBR3BFOztHQUVHO0FBQ0gsTUFBTSxhQUFhLEdBQVcsTUFBTSxDQUFDO0FBRXJDOztHQUVHO0FBQ0gsTUFBTSxPQUFPLGFBQWMsU0FBUSxzQkFBc0I7SUFDeEQsWUFDQyxLQUFZLEVBQ0ksSUFBWTtRQUU1QixLQUFLLENBQUMsS0FBSyxFQUFFLGFBQWEsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUZsQixTQUFJLEdBQUosSUFBSSxDQUFRO0lBRzdCLENBQUM7SUFFRDs7O09BR0c7SUFDSSxNQUFNLENBQUMsSUFBSSxDQUFDLFFBQWdDO1FBQ2xELE1BQU0sQ0FDTCxRQUFRLENBQUMsSUFBSSxLQUFLLGFBQWEsRUFDL0IsMEJBQTBCLGFBQWEsV0FBVyxRQUFRLENBQUMsSUFBSSxJQUFJLENBQ25FLENBQUM7UUFFRixPQUFPLElBQUksYUFBYSxDQUN2QixRQUFRLENBQUMsS0FBSyxFQUNkLFFBQVEsQ0FBQyxJQUFJLENBQ2IsQ0FBQztJQUNILENBQUM7SUFFRDs7O09BR0c7SUFDSCxJQUFXLFNBQVM7UUFDbkIsT0FBTyxLQUFLLENBQUMsU0FBUyxDQUFDO0lBQ3hCLENBQUM7Q0FDRCJ9