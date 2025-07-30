/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export class EditorWorkerHost {
    static { this.CHANNEL_NAME = 'editorWorkerHost'; }
    static getChannel(workerServer) {
        return workerServer.getChannel(EditorWorkerHost.CHANNEL_NAME);
    }
    static setChannel(workerClient, obj) {
        workerClient.setChannel(EditorWorkerHost.CHANNEL_NAME, obj);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yV29ya2VySG9zdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL2FkdmlrYXIvRG9jdW1lbnRzL2FyY2hpdGVjdC9hcmNoMi9BcmNoSURFL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb21tb24vc2VydmljZXMvZWRpdG9yV29ya2VySG9zdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUloRyxNQUFNLE9BQWdCLGdCQUFnQjthQUN2QixpQkFBWSxHQUFHLGtCQUFrQixDQUFDO0lBQ3pDLE1BQU0sQ0FBQyxVQUFVLENBQUMsWUFBOEI7UUFDdEQsT0FBTyxZQUFZLENBQUMsVUFBVSxDQUFtQixnQkFBZ0IsQ0FBQyxZQUFZLENBQUMsQ0FBQztJQUNqRixDQUFDO0lBQ00sTUFBTSxDQUFDLFVBQVUsQ0FBQyxZQUFtQyxFQUFFLEdBQXFCO1FBQ2xGLFlBQVksQ0FBQyxVQUFVLENBQW1CLGdCQUFnQixDQUFDLFlBQVksRUFBRSxHQUFHLENBQUMsQ0FBQztJQUMvRSxDQUFDIn0=