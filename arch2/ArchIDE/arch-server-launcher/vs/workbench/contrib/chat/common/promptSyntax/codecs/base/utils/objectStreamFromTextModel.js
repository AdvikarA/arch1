/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ObjectStream } from './objectStream.js';
import { VSBuffer } from '../../../../../../../../base/common/buffer.js';
/**
 * Create new instance of the stream from a provided text model.
 */
export function objectStreamFromTextModel(model, cancellationToken) {
    return new ObjectStream(modelToGenerator(model), cancellationToken);
}
/**
 * Create a generator out of a provided text model.
 */
function modelToGenerator(model) {
    return (function* () {
        const totalLines = model.getLineCount();
        let currentLine = 1;
        while (currentLine <= totalLines) {
            if (model.isDisposed()) {
                return undefined;
            }
            yield VSBuffer.fromString(model.getLineContent(currentLine));
            if (currentLine !== totalLines) {
                yield VSBuffer.fromString(model.getEOL());
            }
            currentLine++;
        }
    })();
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib2JqZWN0U3RyZWFtRnJvbVRleHRNb2RlbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL2FkdmlrYXIvRG9jdW1lbnRzL2FyY2hpdGVjdC9hcmNoMi9BcmNoSURFL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvY29tbW9uL3Byb21wdFN5bnRheC9jb2RlY3MvYmFzZS91dGlscy9vYmplY3RTdHJlYW1Gcm9tVGV4dE1vZGVsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxtQkFBbUIsQ0FBQztBQUNqRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sK0NBQStDLENBQUM7QUFHekU7O0dBRUc7QUFDSCxNQUFNLFVBQVUseUJBQXlCLENBQ3hDLEtBQWlCLEVBQ2pCLGlCQUFxQztJQUVyQyxPQUFPLElBQUksWUFBWSxDQUFDLGdCQUFnQixDQUFDLEtBQUssQ0FBQyxFQUFFLGlCQUFpQixDQUFDLENBQUM7QUFDckUsQ0FBQztBQUVEOztHQUVHO0FBQ0gsU0FBUyxnQkFBZ0IsQ0FBQyxLQUFpQjtJQUMxQyxPQUFPLENBQUMsUUFBUSxDQUFDO1FBQ2hCLE1BQU0sVUFBVSxHQUFHLEtBQUssQ0FBQyxZQUFZLEVBQUUsQ0FBQztRQUN4QyxJQUFJLFdBQVcsR0FBRyxDQUFDLENBQUM7UUFFcEIsT0FBTyxXQUFXLElBQUksVUFBVSxFQUFFLENBQUM7WUFDbEMsSUFBSSxLQUFLLENBQUMsVUFBVSxFQUFFLEVBQUUsQ0FBQztnQkFDeEIsT0FBTyxTQUFTLENBQUM7WUFDbEIsQ0FBQztZQUVELE1BQU0sUUFBUSxDQUFDLFVBQVUsQ0FDeEIsS0FBSyxDQUFDLGNBQWMsQ0FBQyxXQUFXLENBQUMsQ0FDakMsQ0FBQztZQUNGLElBQUksV0FBVyxLQUFLLFVBQVUsRUFBRSxDQUFDO2dCQUNoQyxNQUFNLFFBQVEsQ0FBQyxVQUFVLENBQ3hCLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FDZCxDQUFDO1lBQ0gsQ0FBQztZQUVELFdBQVcsRUFBRSxDQUFDO1FBQ2YsQ0FBQztJQUNGLENBQUMsQ0FBQyxFQUFFLENBQUM7QUFDTixDQUFDIn0=