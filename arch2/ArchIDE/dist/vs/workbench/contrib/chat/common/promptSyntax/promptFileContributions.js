/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ConfigMigration } from './config/configMigration.js';
import { Registry } from '../../../../../platform/registry/common/platform.js';
import { Extensions } from '../../../../common/contributions.js';
import { PromptLinkProvider } from './languageProviders/promptLinkProvider.js';
import { PromptLinkDiagnosticsInstanceManager } from './languageProviders/promptLinkDiagnosticsProvider.js';
import { PromptHeaderDiagnosticsInstanceManager } from './languageProviders/promptHeaderDiagnosticsProvider.js';
import { isWindows } from '../../../../../base/common/platform.js';
import { PromptPathAutocompletion } from './languageProviders/promptPathAutocompletion.js';
import { PromptHeaderAutocompletion } from './languageProviders/promptHeaderAutocompletion.js';
import { PromptHeaderHoverProvider } from './languageProviders/promptHeaderHovers.js';
/**
 * Function that registers all prompt-file related contributions.
 */
export function registerPromptFileContributions() {
    // all language constributions
    registerContribution(PromptLinkProvider);
    registerContribution(PromptLinkDiagnosticsInstanceManager);
    registerContribution(PromptHeaderDiagnosticsInstanceManager);
    /**
     * PromptDecorationsProviderInstanceManager is currently disabled because the only currently
     * available decoration is the Front Matter header, which we decided to disable for now.
     * Add it back when more decorations are needed.
     */
    // registerContribution(PromptDecorationsProviderInstanceManager); ,
    /**
     * We restrict this provider to `Unix` machines for now because of
     * the filesystem paths differences on `Windows` operating system.
     *
     * Notes on `Windows` support:
     * 	- we add the `./` for the first path component, which may not work on `Windows`
     * 	- the first path component of the absolute paths must be a drive letter
     */
    if (!isWindows) {
        registerContribution(PromptPathAutocompletion);
    }
    registerContribution(PromptHeaderAutocompletion);
    registerContribution(PromptHeaderHoverProvider);
    registerContribution(ConfigMigration);
}
/**
 * Register a specific workbench contribution.
 */
function registerContribution(contribution) {
    Registry.as(Extensions.Workbench).registerWorkbenchContribution(contribution, 4 /* LifecyclePhase.Eventually */);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvbXB0RmlsZUNvbnRyaWJ1dGlvbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9hZHZpa2FyL0RvY3VtZW50cy9hcmNoaXRlY3QvYXJjaDIvQXJjaElERS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2NvbW1vbi9wcm9tcHRTeW50YXgvcHJvbXB0RmlsZUNvbnRyaWJ1dGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBQzlELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxxREFBcUQsQ0FBQztBQUUvRSxPQUFPLEVBQW1DLFVBQVUsRUFBMEIsTUFBTSxxQ0FBcUMsQ0FBQztBQUMxSCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUMvRSxPQUFPLEVBQUUsb0NBQW9DLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUM1RyxPQUFPLEVBQUUsc0NBQXNDLEVBQUUsTUFBTSx3REFBd0QsQ0FBQztBQUNoSCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDbkUsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0saURBQWlELENBQUM7QUFDM0YsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDL0YsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0sMkNBQTJDLENBQUM7QUFHdEY7O0dBRUc7QUFDSCxNQUFNLFVBQVUsK0JBQStCO0lBRTlDLDhCQUE4QjtJQUU5QixvQkFBb0IsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO0lBQ3pDLG9CQUFvQixDQUFDLG9DQUFvQyxDQUFDLENBQUM7SUFDM0Qsb0JBQW9CLENBQUMsc0NBQXNDLENBQUMsQ0FBQztJQUM3RDs7OztPQUlHO0lBQ0gsb0VBQW9FO0lBR3BFOzs7Ozs7O09BT0c7SUFDSCxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUM7UUFDaEIsb0JBQW9CLENBQUMsd0JBQXdCLENBQUMsQ0FBQztJQUNoRCxDQUFDO0lBQ0Qsb0JBQW9CLENBQUMsMEJBQTBCLENBQUMsQ0FBQztJQUNqRCxvQkFBb0IsQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDO0lBQ2hELG9CQUFvQixDQUFDLGVBQWUsQ0FBQyxDQUFDO0FBQ3ZDLENBQUM7QUFPRDs7R0FFRztBQUNILFNBQVMsb0JBQW9CLENBQUMsWUFBMkI7SUFDeEQsUUFBUSxDQUFDLEVBQUUsQ0FBa0MsVUFBVSxDQUFDLFNBQVMsQ0FBQyxDQUFDLDZCQUE2QixDQUFDLFlBQVksb0NBQTRCLENBQUM7QUFDM0ksQ0FBQyJ9