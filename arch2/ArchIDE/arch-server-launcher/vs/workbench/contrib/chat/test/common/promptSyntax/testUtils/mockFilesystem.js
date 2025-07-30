/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { URI } from '../../../../../../../base/common/uri.js';
import { assert } from '../../../../../../../base/common/assert.js';
import { VSBuffer } from '../../../../../../../base/common/buffer.js';
import { timeout } from '../../../../../../../base/common/async.js';
import { IFileService } from '../../../../../../../platform/files/common/files.js';
/**
 * Utility to recursively creates provided filesystem structure.
 */
let MockFilesystem = class MockFilesystem {
    constructor(folders, fileService) {
        this.folders = folders;
        this.fileService = fileService;
    }
    /**
     * Starts the mock process.
     */
    async mock() {
        const result = await Promise.all(this.folders
            .map((folder) => {
            return this.mockFolder(folder);
        }));
        // wait for the filesystem event to settle before proceeding
        // this is temporary workaround and should be fixed once we
        // improve behavior of the `settled()` / `allSettled()` methods
        await timeout(25);
        return result;
    }
    /**
     * The internal implementation of the filesystem mocking process.
     *
     * @throws If a folder or file in the filesystem structure already exists.
     * 		   This is to prevent subtle errors caused by overwriting existing files.
     */
    async mockFolder(folder, parentFolder) {
        const folderUri = parentFolder
            ? URI.joinPath(parentFolder, folder.name)
            : URI.file(folder.name);
        assert(!(await this.fileService.exists(folderUri)), `Folder '${folderUri.path}' already exists.`);
        try {
            await this.fileService.createFolder(folderUri);
        }
        catch (error) {
            throw new Error(`Failed to create folder '${folderUri.fsPath}': ${error}.`);
        }
        const resolvedChildren = [];
        for (const child of folder.children) {
            const childUri = URI.joinPath(folderUri, child.name);
            // create child file
            if ('contents' in child) {
                assert(!(await this.fileService.exists(childUri)), `File '${folderUri.path}' already exists.`);
                const contents = (typeof child.contents === 'string')
                    ? child.contents
                    : child.contents.join('\n');
                await this.fileService.writeFile(childUri, VSBuffer.fromString(contents));
                resolvedChildren.push({
                    ...child,
                    uri: childUri,
                });
                continue;
            }
            // recursively create child filesystem structure
            resolvedChildren.push(await this.mockFolder(child, folderUri));
        }
        return {
            ...folder,
            uri: folderUri,
        };
    }
};
MockFilesystem = __decorate([
    __param(1, IFileService)
], MockFilesystem);
export { MockFilesystem };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9ja0ZpbGVzeXN0ZW0uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9hZHZpa2FyL0RvY3VtZW50cy9hcmNoaXRlY3QvYXJjaDIvQXJjaElERS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L3Rlc3QvY29tbW9uL3Byb21wdFN5bnRheC90ZXN0VXRpbHMvbW9ja0ZpbGVzeXN0ZW0udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQzlELE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQztBQUNwRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDdEUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBQ3BFLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxxREFBcUQsQ0FBQztBQTRCbkY7O0dBRUc7QUFDSSxJQUFNLGNBQWMsR0FBcEIsTUFBTSxjQUFjO0lBQzFCLFlBQ2tCLE9BQXNCLEVBQ1IsV0FBeUI7UUFEdkMsWUFBTyxHQUFQLE9BQU8sQ0FBZTtRQUNSLGdCQUFXLEdBQVgsV0FBVyxDQUFjO0lBQ3JELENBQUM7SUFFTDs7T0FFRztJQUNJLEtBQUssQ0FBQyxJQUFJO1FBQ2hCLE1BQU0sTUFBTSxHQUFHLE1BQU0sT0FBTyxDQUFDLEdBQUcsQ0FDL0IsSUFBSSxDQUFDLE9BQU87YUFDVixHQUFHLENBQUMsQ0FBQyxNQUFNLEVBQUUsRUFBRTtZQUNmLE9BQU8sSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUNoQyxDQUFDLENBQUMsQ0FDSCxDQUFDO1FBRUYsNERBQTREO1FBQzVELDJEQUEyRDtRQUMzRCwrREFBK0Q7UUFDL0QsTUFBTSxPQUFPLENBQUMsRUFBRSxDQUFDLENBQUM7UUFFbEIsT0FBTyxNQUFNLENBQUM7SUFDZixDQUFDO0lBRUQ7Ozs7O09BS0c7SUFDSyxLQUFLLENBQUMsVUFBVSxDQUN2QixNQUFtQixFQUNuQixZQUFrQjtRQUVsQixNQUFNLFNBQVMsR0FBRyxZQUFZO1lBQzdCLENBQUMsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLFlBQVksRUFBRSxNQUFNLENBQUMsSUFBSSxDQUFDO1lBQ3pDLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUV6QixNQUFNLENBQ0wsQ0FBQyxDQUFDLE1BQU0sSUFBSSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLENBQUMsRUFDM0MsV0FBVyxTQUFTLENBQUMsSUFBSSxtQkFBbUIsQ0FDNUMsQ0FBQztRQUVGLElBQUksQ0FBQztZQUNKLE1BQU0sSUFBSSxDQUFDLFdBQVcsQ0FBQyxZQUFZLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDaEQsQ0FBQztRQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7WUFDaEIsTUFBTSxJQUFJLEtBQUssQ0FBQyw0QkFBNEIsU0FBUyxDQUFDLE1BQU0sTUFBTSxLQUFLLEdBQUcsQ0FBQyxDQUFDO1FBQzdFLENBQUM7UUFFRCxNQUFNLGdCQUFnQixHQUFvRCxFQUFFLENBQUM7UUFDN0UsS0FBSyxNQUFNLEtBQUssSUFBSSxNQUFNLENBQUMsUUFBUSxFQUFFLENBQUM7WUFDckMsTUFBTSxRQUFRLEdBQUcsR0FBRyxDQUFDLFFBQVEsQ0FBQyxTQUFTLEVBQUUsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ3JELG9CQUFvQjtZQUNwQixJQUFJLFVBQVUsSUFBSSxLQUFLLEVBQUUsQ0FBQztnQkFDekIsTUFBTSxDQUNMLENBQUMsQ0FBQyxNQUFNLElBQUksQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDLEVBQzFDLFNBQVMsU0FBUyxDQUFDLElBQUksbUJBQW1CLENBQzFDLENBQUM7Z0JBRUYsTUFBTSxRQUFRLEdBQVcsQ0FBQyxPQUFPLEtBQUssQ0FBQyxRQUFRLEtBQUssUUFBUSxDQUFDO29CQUM1RCxDQUFDLENBQUMsS0FBSyxDQUFDLFFBQVE7b0JBQ2hCLENBQUMsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztnQkFFN0IsTUFBTSxJQUFJLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyxRQUFRLEVBQUUsUUFBUSxDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDO2dCQUUxRSxnQkFBZ0IsQ0FBQyxJQUFJLENBQUM7b0JBQ3JCLEdBQUcsS0FBSztvQkFDUixHQUFHLEVBQUUsUUFBUTtpQkFDYixDQUFDLENBQUM7Z0JBRUgsU0FBUztZQUNWLENBQUM7WUFFRCxnREFBZ0Q7WUFDaEQsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLE1BQU0sSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLEVBQUUsU0FBUyxDQUFDLENBQUMsQ0FBQztRQUNoRSxDQUFDO1FBRUQsT0FBTztZQUNOLEdBQUcsTUFBTTtZQUNULEdBQUcsRUFBRSxTQUFTO1NBQ2QsQ0FBQztJQUNILENBQUM7Q0FDRCxDQUFBO0FBbkZZLGNBQWM7SUFHeEIsV0FBQSxZQUFZLENBQUE7R0FIRixjQUFjLENBbUYxQiJ9