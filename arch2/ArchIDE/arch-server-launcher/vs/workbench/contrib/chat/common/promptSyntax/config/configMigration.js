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
import { assert } from '../../../../../../base/common/assert.js';
import { ILogService } from '../../../../../../platform/log/common/log.js';
import { asBoolean, PromptsConfig } from './config.js';
import { IConfigurationService } from '../../../../../../platform/configuration/common/configuration.js';
/**
 * Contribution that migrates the old config setting value to a new one.
 *
 * Note! This is a temporary logic and can be removed on ~2026-04-29.
 */
let ConfigMigration = class ConfigMigration {
    constructor(logService, configService) {
        this.logService = logService;
        this.configService = configService;
        // migrate the old config setting value to a new one
        this.migrateConfig()
            .catch((error) => {
            this.logService.warn('failed to migrate config setting value.', error);
        });
    }
    /**
     * The main function that implements the migration logic.
     */
    async migrateConfig() {
        const value = await this.configService.getValue(PromptsConfig.KEY);
        // if setting is not set, nothing to do
        if ((value === undefined) || (value === null)) {
            return;
        }
        // if the setting value is a boolean, we don't need to do
        // anything since it is already a valid configuration value
        if ((typeof value === 'boolean') || (asBoolean(value) !== undefined)) {
            return;
        }
        // in the old setting logic an array of strings was treated
        // as a list of locations, so we need to migrate that
        if (Array.isArray(value)) {
            // copy array values into a map of paths
            const locationsValue = {};
            for (const filePath of value) {
                if (typeof filePath !== 'string') {
                    continue;
                }
                const trimmedValue = filePath.trim();
                if (!trimmedValue) {
                    continue;
                }
                locationsValue[trimmedValue] = true;
            }
            await this.configService.updateValue(PromptsConfig.KEY, true);
            await this.configService.updateValue(PromptsConfig.PROMPT_LOCATIONS_KEY, locationsValue);
            return;
        }
        // in the old setting logic an object was treated as a map
        // of `location -> boolean`, so we need to migrate that
        if (typeof value === 'object') {
            // sanity check on the contents of value variable - while
            // we've handled the 'null' case above this assertion is
            // here to prevent churn when this block is moved around
            assert(value !== null, 'Object value must not be a null.');
            // copy object values into a map of paths
            const locationsValue = {};
            for (const [location, enabled] of Object.entries(value)) {
                // if the old location enabled value wasn't a boolean
                // then ignore it as it is not a valid value
                if ((typeof enabled !== 'boolean') || (asBoolean(enabled) === undefined)) {
                    continue;
                }
                const trimmedValue = location.trim();
                if (!trimmedValue) {
                    continue;
                }
                locationsValue[trimmedValue] = enabled;
            }
            await this.configService.updateValue(PromptsConfig.KEY, true);
            await this.configService.updateValue(PromptsConfig.PROMPT_LOCATIONS_KEY, locationsValue);
            return;
        }
        // in the old setting logic a string was treated as a single
        // location path, so we need to migrate that
        if (typeof value === 'string') {
            // sanity check on the contents of value variable - while
            // we've handled the 'boolean' case above this assertion is
            // here to prevent churn when this block is moved around
            assert(asBoolean(value) === undefined, `String value must not be a boolean, got '${value}'.`);
            await this.configService.updateValue(PromptsConfig.KEY, true);
            await this.configService.updateValue(PromptsConfig.PROMPT_LOCATIONS_KEY, { [value]: true });
            return;
        }
    }
};
ConfigMigration = __decorate([
    __param(0, ILogService),
    __param(1, IConfigurationService)
], ConfigMigration);
export { ConfigMigration };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlnTWlncmF0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvYWR2aWthci9Eb2N1bWVudHMvYXJjaGl0ZWN0L2FyY2gyL0FyY2hJREUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9jb21tb24vcHJvbXB0U3ludGF4L2NvbmZpZy9jb25maWdNaWdyYXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ2pFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQztBQUMzRSxPQUFPLEVBQUUsU0FBUyxFQUFFLGFBQWEsRUFBRSxNQUFNLGFBQWEsQ0FBQztBQUV2RCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxrRUFBa0UsQ0FBQztBQUV6Rzs7OztHQUlHO0FBQ0ksSUFBTSxlQUFlLEdBQXJCLE1BQU0sZUFBZTtJQUMzQixZQUMrQixVQUF1QixFQUNiLGFBQW9DO1FBRDlDLGVBQVUsR0FBVixVQUFVLENBQWE7UUFDYixrQkFBYSxHQUFiLGFBQWEsQ0FBdUI7UUFFNUUsb0RBQW9EO1FBQ3BELElBQUksQ0FBQyxhQUFhLEVBQUU7YUFDbEIsS0FBSyxDQUFDLENBQUMsS0FBSyxFQUFFLEVBQUU7WUFDaEIsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMseUNBQXlDLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDeEUsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDO0lBRUQ7O09BRUc7SUFDSyxLQUFLLENBQUMsYUFBYTtRQUMxQixNQUFNLEtBQUssR0FBRyxNQUFNLElBQUksQ0FBQyxhQUFhLENBQUMsUUFBUSxDQUFDLGFBQWEsQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUVuRSx1Q0FBdUM7UUFDdkMsSUFBSSxDQUFDLEtBQUssS0FBSyxTQUFTLENBQUMsSUFBSSxDQUFDLEtB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