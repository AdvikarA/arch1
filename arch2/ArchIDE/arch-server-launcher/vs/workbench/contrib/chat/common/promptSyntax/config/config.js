/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ContextKeyExpr } from '../../../../../../platform/contextkey/common/contextkey.js';
import { PromptsType } from '../promptTypes.js';
import { getPromptFileDefaultLocation } from './promptFileLocations.js';
/**
 * Configuration helper for the `reusable prompts` feature.
 * @see {@link PromptsConfig.KEY}, {@link PromptsConfig.PROMPT_LOCATIONS_KEY}, {@link PromptsConfig.INSTRUCTIONS_LOCATION_KEY} or {@link PromptsConfig.MODE_LOCATION_KEY}.
 *
 * ### Functions
 *
 * - {@link enabled} allows to check if the feature is enabled
 * - {@link getLocationsValue} allows to current read configuration value
 * - {@link promptSourceFolders} gets list of source folders for prompt files
 *
 * ### File Paths Resolution
 *
 * We resolve only `*.prompt.md` files inside the resulting source folders. Relative paths are resolved
 * relative to:
 *
 * - the current workspace `root`, if applicable, in other words one of the workspace folders
 *   can be used as a prompt files source folder
 * - root of each top-level folder in the workspace (if there are multiple workspace folders)
 * - current root folder (if a single folder is open)
 */
export var PromptsConfig;
(function (PromptsConfig) {
    /**
     * Configuration key for the `reusable prompts` feature
     * (also known as `prompt files`, `prompt instructions`, etc.).
     */
    PromptsConfig.KEY = 'chat.promptFiles';
    /**
     * Configuration key for the locations of reusable prompt files.
     */
    PromptsConfig.PROMPT_LOCATIONS_KEY = 'chat.promptFilesLocations';
    /**
     * Configuration key for the locations of instructions files.
     */
    PromptsConfig.INSTRUCTIONS_LOCATION_KEY = 'chat.instructionsFilesLocations';
    /**
     * Configuration key for the locations of mode files.
     */
    PromptsConfig.MODE_LOCATION_KEY = 'chat.modeFilesLocations';
    /**
     * Configuration key for use of the copilot instructions file.
     */
    PromptsConfig.USE_COPILOT_INSTRUCTION_FILES = 'github.copilot.chat.codeGeneration.useInstructionFiles';
    /**
     * Configuration key for the copilot instruction setting.
     */
    PromptsConfig.COPILOT_INSTRUCTIONS = 'github.copilot.chat.codeGeneration.instructions';
    /**
     * Checks if the feature is enabled.
     * @see {@link PromptsConfig.KEY}.
     */
    function enabled(configService) {
        const enabledValue = configService.getValue(PromptsConfig.KEY);
        return asBoolean(enabledValue) ?? false;
    }
    PromptsConfig.enabled = enabled;
    /**
     * Context key expression for the `reusable prompts` feature `enabled` status.
     */
    PromptsConfig.enabledCtx = ContextKeyExpr.equals(`config.${PromptsConfig.KEY}`, true);
    /**
     * Get value of the `reusable prompt locations` configuration setting.
     * @see {@link PROMPT_LOCATIONS_CONFIG_KEY}, {@link INSTRUCTIONS_LOCATIONS_CONFIG_KEY}, {@link MODE_LOCATIONS_CONFIG_KEY}.
     */
    function getLocationsValue(configService, type) {
        const key = getPromptFileLocationsConfigKey(type);
        const configValue = configService.getValue(key);
        if (configValue === undefined || configValue === null || Array.isArray(configValue)) {
            return undefined;
        }
        // note! this would be also true for `null` and `array`,
        // 		 but those cases are already handled above
        if (typeof configValue === 'object') {
            const paths = {};
            for (const [path, value] of Object.entries(configValue)) {
                const cleanPath = path.trim();
                const booleanValue = asBoolean(value);
                // if value can be mapped to a boolean, and the clean
                // path is not empty, add it to the map
                if ((booleanValue !== undefined) && cleanPath) {
                    paths[cleanPath] = booleanValue;
                }
            }
            return paths;
        }
        return undefined;
    }
    PromptsConfig.getLocationsValue = getLocationsValue;
    /**
     * Gets list of source folders for prompt files.
     * Defaults to {@link PROMPT_DEFAULT_SOURCE_FOLDER}, {@link INSTRUCTIONS_DEFAULT_SOURCE_FOLDER} or {@link MODE_DEFAULT_SOURCE_FOLDER}.
     */
    function promptSourceFolders(configService, type) {
        const value = getLocationsValue(configService, type);
        const defaultSourceFolder = getPromptFileDefaultLocation(type);
        // note! the `value &&` part handles the `undefined`, `null`, and `false` cases
        if (value && (typeof value === 'object')) {
            const paths = [];
            // if the default source folder is not explicitly disabled, add it
            if (value[defaultSourceFolder] !== false) {
                paths.push(defaultSourceFolder);
            }
            // copy all the enabled paths to the result list
            for (const [path, enabledValue] of Object.entries(value)) {
                // we already added the default source folder, so skip it
                if ((enabledValue === false) || (path === defaultSourceFolder)) {
                    continue;
                }
                paths.push(path);
            }
            return paths;
        }
        // `undefined`, `null`, and `false` cases
        return [];
    }
    PromptsConfig.promptSourceFolders = promptSourceFolders;
})(PromptsConfig || (PromptsConfig = {}));
export function getPromptFileLocationsConfigKey(type) {
    switch (type) {
        case PromptsType.instructions:
            return PromptsConfig.INSTRUCTIONS_LOCATION_KEY;
        case PromptsType.prompt:
            return PromptsConfig.PROMPT_LOCATIONS_KEY;
        case PromptsType.mode:
            return PromptsConfig.MODE_LOCATION_KEY;
        default:
            throw new Error('Unknown prompt type');
    }
}
/**
 * Helper to parse an input value of `any` type into a boolean.
 *
 * @param value - input value to parse
 * @returns `true` if the value is the boolean `true` value or a string that can
 * 			be clearly mapped to a boolean (e.g., `"true"`, `"TRUE"`, `"FaLSe"`, etc.),
 * 			`undefined` for rest of the values
 */
export function asBoolean(value) {
    if (typeof value === 'boolean') {
        return value;
    }
    if (typeof value === 'string') {
        const cleanValue = value.trim().toLowerCase();
        if (cleanValue === 'true') {
            return true;
        }
        if (cleanValue === 'false') {
            return false;
        }
        return undefined;
    }
    return undefined;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlnLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvYWR2aWthci9Eb2N1bWVudHMvYXJjaGl0ZWN0L2FyY2gyL0FyY2hJREUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9jb21tb24vcHJvbXB0U3ludGF4L2NvbmZpZy9jb25maWcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQzVGLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxtQkFBbUIsQ0FBQztBQUNoRCxPQUFPLEVBQW9FLDRCQUE0QixFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFFMUk7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7R0FtQkc7QUFDSCxNQUFNLEtBQVcsYUFBYSxDQWtIN0I7QUFsSEQsV0FBaUIsYUFBYTtJQUM3Qjs7O09BR0c7SUFDVSxpQkFBRyxHQUFHLGtCQUFrQixDQUFDO0lBRXRDOztPQUVHO0lBQ1Usa0NBQW9CLEdBQUcsMkJBQTJCLENBQUM7SUFFaEU7O09BRUc7SUFDVSx1Q0FBeUIsR0FBRyxpQ0FBaUMsQ0FBQztJQUMzRTs7T0FFRztJQUNVLCtCQUFpQixHQUFHLHlCQUF5QixDQUFDO0lBRTNEOztPQUVHO0lBQ1UsMkNBQTZCLEdBQUcsd0RBQXdELENBQUM7SUFFdEc7O09BRUc7SUFDVSxrQ0FBb0IsR0FBRyxpREFBaUQsQ0FBQztJQUV0Rjs7O09BR0c7SUFDSCxTQUFnQixPQUFPLENBQUMsYUFBb0M7UUFDM0QsTUFBTSxZQUFZLEdBQUcsYUFBYSxDQUFDLFFBQVEsQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLENBQUM7UUFFL0QsT0FBTyxTQUFTLENBQUMsWUFBWSxDQUFDLElBQUksS0FBSyxDQUFDO0lBQ3pDLENBQUM7SUFKZSxxQkFBTyxVQUl0QixDQUFBO0lBRUQ7O09BRUc7SUFDVSx3QkFBVSxHQUFHLGNBQWMsQ0FBQyxNQUFN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