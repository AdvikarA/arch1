/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { URI } from '../../../base/common/uri.js';
export function isEmptyWindowBackupInfo(obj) {
    const candidate = obj;
    return typeof candidate?.backupFolder === 'string';
}
export function deserializeWorkspaceInfos(serializedBackupWorkspaces) {
    let workspaceBackupInfos = [];
    try {
        if (Array.isArray(serializedBackupWorkspaces.workspaces)) {
            workspaceBackupInfos = serializedBackupWorkspaces.workspaces.map(workspace => ({
                workspace: {
                    id: workspace.id,
                    configPath: URI.parse(workspace.configURIPath)
                },
                remoteAuthority: workspace.remoteAuthority
            }));
        }
    }
    catch (e) {
        // ignore URI parsing exceptions
    }
    return workspaceBackupInfos;
}
export function deserializeFolderInfos(serializedBackupWorkspaces) {
    let folderBackupInfos = [];
    try {
        if (Array.isArray(serializedBackupWorkspaces.folders)) {
            folderBackupInfos = serializedBackupWorkspaces.folders.map(folder => ({
                folderUri: URI.parse(folder.folderUri),
                remoteAuthority: folder.remoteAuthority
            }));
        }
    }
    catch (e) {
        // ignore URI parsing exceptions
    }
    return folderBackupInfos;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmFja3VwLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvYWR2aWthci9Eb2N1bWVudHMvYXJjaGl0ZWN0L2FyY2gyL0FyY2hJREUvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vYmFja3VwL25vZGUvYmFja3VwLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQU9sRCxNQUFNLFVBQVUsdUJBQXVCLENBQUMsR0FBWTtJQUNuRCxNQUFNLFNBQVMsR0FBRyxHQUF5QyxDQUFDO0lBRTVELE9BQU8sT0FBTyxTQUFTLEVBQUUsWUFBWSxLQUFLLFFBQVEsQ0FBQztBQUNwRCxDQUFDO0FBUUQsTUFBTSxVQUFVLHlCQUF5QixDQUFDLDBCQUF1RDtJQUNoRyxJQUFJLG9CQUFvQixHQUEyQixFQUFFLENBQUM7SUFDdEQsSUFBSSxDQUFDO1FBQ0osSUFBSSxLQUFLLENBQUMsT0FBTyxDQUFDLDBCQUEwQixDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUM7WUFDMUQsb0JBQW9CLEdBQUcsMEJBQTBCLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLENBQzdFO2dCQUNDLFNBQVMsRUFBRTtvQkFDVixFQUFFLEVBQUUsU0FBUyxDQUFDLEVBQUU7b0JBQ2hCLFVBQVUsRUFBRSxHQUFHLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxhQUFhLENBQUM7aUJBQzlDO2dCQUNELGVBQWUsRUFBRSxTQUFTLENBQUMsZUFBZTthQUMxQyxDQUNELENBQUMsQ0FBQztRQUNKLENBQUM7SUFDRixDQUFDO0lBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztRQUNaLGdDQUFnQztJQUNqQyxDQUFDO0lBRUQsT0FBTyxvQkFBb0IsQ0FBQztBQUM3QixDQUFDO0FBT0QsTUFBTSxVQUFVLHNCQUFzQixDQUFDLDBCQUF1RDtJQUM3RixJQUFJLGlCQUFpQixHQUF3QixFQUFFLENBQUM7SUFDaEQsSUFBSSxDQUFDO1FBQ0osSUFBSSxLQUFLLENBQUMsT0FBTyxDQUFDLDBCQUEwQixDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7WUFDdkQsaUJBQWlCLEdBQUcsMEJBQTBCLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQ3BFO2dCQUNDLFNBQVMsRUFBRSxHQUFHLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUM7Z0JBQ3RDLGVBQWUsRUFBRSxNQUFNLENBQUMsZUFBZTthQUN2QyxDQUNELENBQUMsQ0FBQztRQUNKLENBQUM7SUFDRixDQUFDO0lBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztRQUNaLGdDQUFnQztJQUNqQyxDQUFDO0lBRUQsT0FBTyxpQkFBaUIsQ0FBQztBQUMxQixDQUFDIn0=