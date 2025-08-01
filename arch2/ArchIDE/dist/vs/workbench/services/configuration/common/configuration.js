/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { refineServiceDecorator } from '../../../../platform/instantiation/common/instantiation.js';
export const FOLDER_CONFIG_FOLDER_NAME = '.vscode';
export const FOLDER_SETTINGS_NAME = 'settings';
export const FOLDER_SETTINGS_PATH = `${FOLDER_CONFIG_FOLDER_NAME}/${FOLDER_SETTINGS_NAME}.json`;
export const defaultSettingsSchemaId = 'vscode://schemas/settings/default';
export const userSettingsSchemaId = 'vscode://schemas/settings/user';
export const profileSettingsSchemaId = 'vscode://schemas/settings/profile';
export const machineSettingsSchemaId = 'vscode://schemas/settings/machine';
export const workspaceSettingsSchemaId = 'vscode://schemas/settings/workspace';
export const folderSettingsSchemaId = 'vscode://schemas/settings/folder';
export const launchSchemaId = 'vscode://schemas/launch';
export const tasksSchemaId = 'vscode://schemas/tasks';
export const mcpSchemaId = 'vscode://schemas/mcp';
export const APPLICATION_SCOPES = [1 /* ConfigurationScope.APPLICATION */, 3 /* ConfigurationScope.APPLICATION_MACHINE */];
export const PROFILE_SCOPES = [2 /* ConfigurationScope.MACHINE */, 4 /* ConfigurationScope.WINDOW */, 5 /* ConfigurationScope.RESOURCE */, 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */, 7 /* ConfigurationScope.MACHINE_OVERRIDABLE */];
export const LOCAL_MACHINE_PROFILE_SCOPES = [4 /* ConfigurationScope.WINDOW */, 5 /* ConfigurationScope.RESOURCE */, 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */];
export const LOCAL_MACHINE_SCOPES = [1 /* ConfigurationScope.APPLICATION */, ...LOCAL_MACHINE_PROFILE_SCOPES];
export const REMOTE_MACHINE_SCOPES = [2 /* ConfigurationScope.MACHINE */, 3 /* ConfigurationScope.APPLICATION_MACHINE */, 4 /* ConfigurationScope.WINDOW */, 5 /* ConfigurationScope.RESOURCE */, 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */, 7 /* ConfigurationScope.MACHINE_OVERRIDABLE */];
export const WORKSPACE_SCOPES = [4 /* ConfigurationScope.WINDOW */, 5 /* ConfigurationScope.RESOURCE */, 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */, 7 /* ConfigurationScope.MACHINE_OVERRIDABLE */];
export const FOLDER_SCOPES = [5 /* ConfigurationScope.RESOURCE */, 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */, 7 /* ConfigurationScope.MACHINE_OVERRIDABLE */];
export const TASKS_CONFIGURATION_KEY = 'tasks';
export const LAUNCH_CONFIGURATION_KEY = 'launch';
export const MCP_CONFIGURATION_KEY = 'mcp';
export const WORKSPACE_STANDALONE_CONFIGURATIONS = Object.create(null);
WORKSPACE_STANDALONE_CONFIGURATIONS[TASKS_CONFIGURATION_KEY] = `${FOLDER_CONFIG_FOLDER_NAME}/${TASKS_CONFIGURATION_KEY}.json`;
WORKSPACE_STANDALONE_CONFIGURATIONS[LAUNCH_CONFIGURATION_KEY] = `${FOLDER_CONFIG_FOLDER_NAME}/${LAUNCH_CONFIGURATION_KEY}.json`;
WORKSPACE_STANDALONE_CONFIGURATIONS[MCP_CONFIGURATION_KEY] = `${FOLDER_CONFIG_FOLDER_NAME}/${MCP_CONFIGURATION_KEY}.json`;
export const USER_STANDALONE_CONFIGURATIONS = Object.create(null);
USER_STANDALONE_CONFIGURATIONS[TASKS_CONFIGURATION_KEY] = `${TASKS_CONFIGURATION_KEY}.json`;
USER_STANDALONE_CONFIGURATIONS[MCP_CONFIGURATION_KEY] = `${MCP_CONFIGURATION_KEY}.json`;
export const IWorkbenchConfigurationService = refineServiceDecorator(IConfigurationService);
export const TASKS_DEFAULT = '{\n\t\"version\": \"2.0.0\",\n\t\"tasks\": []\n}';
export const APPLY_ALL_PROFILES_SETTING = 'workbench.settings.applyToAllProfiles';
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlndXJhdGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL2FkdmlrYXIvRG9jdW1lbnRzL2FyY2hpdGVjdC9hcmNoMi9BcmNoSURFL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9jb25maWd1cmF0aW9uL2NvbW1vbi9jb25maWd1cmF0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBSWhHLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ25HLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBS3BHLE1BQU0sQ0FBQyxNQUFNLHlCQUF5QixHQUFHLFNBQVMsQ0FBQztBQUNuRCxNQUFNLENBQUMsTUFBTSxvQkFBb0IsR0FBRyxVQUFVLENBQUM7QUFDL0MsTUFBTSxDQUFDLE1BQU0sb0JBQW9CLEdBQUcsR0FBRyx5QkFBeUIsSUFBSSxvQkFBb0IsT0FBTyxDQUFDO0FBRWhHLE1BQU0sQ0FBQyxNQUFNLHVCQUF1QixHQUFHLG1DQUFtQyxDQUFDO0FBQzNFLE1BQU0sQ0FBQyxNQUFNLG9CQUFvQixHQUFHLGdDQUFnQyxDQUFDO0FBQ3JFLE1BQU0sQ0FBQyxNQUFNLHVCQUF1QixHQUFHLG1DQUFtQyxDQUFDO0FBQzNFLE1BQU0sQ0FBQyxNQUFNLHVCQUF1QixHQUFHLG1DQUFtQyxDQUFDO0FBQzNFLE1BQU0sQ0FBQyxNQUFNLHlCQUF5QixHQUFHLHFDQUFxQyxDQUFDO0FBQy9FLE1BQU0sQ0FBQyxNQUFNLHNCQUFzQixHQUFHLGtDQUFrQyxDQUFDO0FBQ3pFLE1BQU0sQ0FBQyxNQUFNLGNBQWMsR0FBRyx5QkFBeUIsQ0FBQztBQUN4RCxNQUFNLENBQUMsTUFBTSxhQUFhLEdBQUcsd0JBQXdCLENBQUM7QUFDdEQsTUFBTSxDQUFDLE1BQU0sV0FBVyxHQUFHLHNCQUFzQixDQUFDO0FBRWxELE1BQU0sQ0FBQyxNQUFNLGtCQUFrQixHQUFHLHdGQUF3RSxDQUFDO0FBQzNHLE1BQU0sQ0FBQyxNQUFNLGNBQWMsR0FBRyw2TUFBcUssQ0FBQztBQUNwTSxNQUFNLENBQUMsTUFBTSw0QkFBNEIsR0FBRyx5SEFBaUcsQ0FBQztBQUM5SSxNQUFNLENBQUMsTUFBTSxvQkFBb0IsR0FBRyx5Q0FBaUMsR0FBRyw0QkFBNEIsQ0FBQyxDQUFDO0FBQ3RHLE1BQU0sQ0FBQyxNQUFNLHFCQUFxQixHQUFHLDZQQUE2TSxDQUFDO0FBQ25QLE1BQU0sQ0FBQyxNQUFNLGdCQUFnQixHQUFHLHlLQUF5SSxDQUFDO0FBQzFLLE1BQU0sQ0FBQyxNQUFNLGFBQWEsR0FBRyxzSUFBOEcsQ0FBQztBQUU1SSxNQUFNLENBQUMsTUFBTSx1QkFBdUIsR0FBRyxPQUFPLENBQUM7QUFDL0MsTUFBTSxDQUFDLE1BQU0sd0JBQXdCLEdBQUcsUUFBUSxDQUFDO0FBQ2pELE1BQU0sQ0FBQyxNQUFNLHFCQUFxQixHQUFHLEtBQUssQ0FBQztBQUUzQyxNQUFNLENBQUMsTUFBTSxtQ0FBbUMsR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDO0FBQ3ZFLG1DQUFtQyxDQUFDLHVCQUF1QixDQUFDLEdBQUcsR0FBRyx5QkFBeUIsSUFBSSx1QkFBdUIsT0FBTyxDQUFDO0FBQzlILG1DQUFtQyxDQUFDLHdCQUF3QixDQUFDLEdBQUcsR0FBRyx5QkFBeUIsSUFBSSx3QkFBd0IsT0FBTyxDQUFDO0FBQ2hJLG1DQUFtQyxDQUFDLHFCQUFxQixDQUFDLEdBQUcsR0FBRyx5QkFBeUIsSUFBSSxxQkFBcUIsT0FBTyxDQUFDO0FBQzFILE1BQU0sQ0FBQyxNQUFNLDhCQUE4QixHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUM7QUFDbEUsOEJBQThCLENBQUMsdUJBQXVCLENBQUMsR0FBRyxHQUFHLHVCQUF1QixPQUFPLENBQUM7QUFDNUYsOEJBQThCLENBQUMscUJBQXFCLENBQUMsR0FBRyxHQUFHLHFCQUFxQixPQUFPLENBQUM7QUFzQnhGLE1BQU0sQ0FBQyxNQUFNLDhCQUE4QixHQUFHLHNCQUFzQixDQUF3RCxxQkFBcUIsQ0FBQyxDQUFDO0FBK0JuSixNQUFNLENBQUMsTUFBTSxhQUFhLEdBQUcsa0RBQWtELENBQUM7QUFFaEYsTUFBTSxDQUFDLE1BQU0sMEJBQTBCLEdBQUcsdUNBQXVDLENBQUMifQ==