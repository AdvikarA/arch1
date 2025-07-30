/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
// #######################################################################
// ###                                                                 ###
// ### !!! PLEASE ADD COMMON IMPORTS INTO WORKBENCH.COMMON.MAIN.TS !!! ###
// ###                                                                 ###
// #######################################################################
//#region --- workbench common
import './workbench.common.main.js';
//#endregion
//#region --- workbench (desktop main)
import './electron-browser/desktop.main.js';
import './electron-browser/desktop.contribution.js';
//#endregion
//#region --- workbench parts
import './electron-browser/parts/dialogs/dialog.contribution.js';
//#endregion
//#region --- workbench services
import './services/textfile/electron-browser/nativeTextFileService.js';
import './services/dialogs/electron-browser/fileDialogService.js';
import './services/workspaces/electron-browser/workspacesService.js';
import './services/menubar/electron-browser/menubarService.js';
import './services/update/electron-browser/updateService.js';
import './services/url/electron-browser/urlService.js';
import './services/lifecycle/electron-browser/lifecycleService.js';
import './services/title/electron-browser/titleService.js';
import './services/host/electron-browser/nativeHostService.js';
import './services/request/electron-browser/requestService.js';
import './services/clipboard/electron-browser/clipboardService.js';
import './services/contextmenu/electron-browser/contextmenuService.js';
import './services/workspaces/electron-browser/workspaceEditingService.js';
import './services/configurationResolver/electron-browser/configurationResolverService.js';
import './services/accessibility/electron-browser/accessibilityService.js';
import './services/keybinding/electron-browser/nativeKeyboardLayout.js';
import './services/path/electron-browser/pathService.js';
import './services/themes/electron-browser/nativeHostColorSchemeService.js';
import './services/extensionManagement/electron-browser/extensionManagementService.js';
import './services/mcp/electron-browser/mcpWorkbenchManagementService.js';
import './services/encryption/electron-browser/encryptionService.js';
import './services/browserElements/electron-browser/browserElementsService.js';
import './services/secrets/electron-browser/secretStorageService.js';
import './services/localization/electron-browser/languagePackService.js';
import './services/telemetry/electron-browser/telemetryService.js';
import './services/extensions/electron-browser/extensionHostStarter.js';
import '../platform/extensionResourceLoader/common/extensionResourceLoaderService.js';
import './services/localization/electron-browser/localeService.js';
import './services/extensions/electron-browser/extensionsScannerService.js';
import './services/extensionManagement/electron-browser/extensionManagementServerService.js';
import './services/extensionManagement/electron-browser/extensionGalleryManifestService.js';
import './services/extensionManagement/electron-browser/extensionTipsService.js';
import './services/userDataSync/electron-browser/userDataSyncService.js';
import './services/userDataSync/electron-browser/userDataAutoSyncService.js';
import './services/timer/electron-browser/timerService.js';
import './services/environment/electron-browser/shellEnvironmentService.js';
import './services/integrity/electron-browser/integrityService.js';
import './services/workingCopy/electron-browser/workingCopyBackupService.js';
import './services/checksum/electron-browser/checksumService.js';
import '../platform/remote/electron-browser/sharedProcessTunnelService.js';
import './services/tunnel/electron-browser/tunnelService.js';
import '../platform/diagnostics/electron-browser/diagnosticsService.js';
import '../platform/profiling/electron-browser/profilingService.js';
import '../platform/telemetry/electron-browser/customEndpointTelemetryService.js';
import '../platform/remoteTunnel/electron-browser/remoteTunnelService.js';
import './services/files/electron-browser/elevatedFileService.js';
import './services/search/electron-browser/searchService.js';
import './services/workingCopy/electron-browser/workingCopyHistoryService.js';
import './services/userDataSync/browser/userDataSyncEnablementService.js';
import './services/extensions/electron-browser/nativeExtensionService.js';
import '../platform/userDataProfile/electron-browser/userDataProfileStorageService.js';
import './services/auxiliaryWindow/electron-browser/auxiliaryWindowService.js';
import '../platform/extensionManagement/electron-browser/extensionsProfileScannerService.js';
import '../platform/webContentExtractor/electron-browser/webContentExtractorService.js';
import './services/process/electron-browser/processService.js';
import { registerSingleton } from '../platform/instantiation/common/extensions.js';
import { IUserDataInitializationService, UserDataInitializationService } from './services/userData/browser/userDataInit.js';
import { SyncDescriptor } from '../platform/instantiation/common/descriptors.js';
registerSingleton(IUserDataInitializationService, new SyncDescriptor(UserDataInitializationService, [[]], true));
//#endregion
//#region --- workbench contributions
// Logs
import './contrib/logs/electron-browser/logs.contribution.js';
// Localizations
import './contrib/localization/electron-browser/localization.contribution.js';
// Explorer
import './contrib/files/electron-browser/fileActions.contribution.js';
// CodeEditor Contributions
import './contrib/codeEditor/electron-browser/codeEditor.contribution.js';
// Debug
import './contrib/debug/electron-browser/extensionHostDebugService.js';
// Extensions Management
import './contrib/extensions/electron-browser/extensions.contribution.js';
// Issues
import './contrib/issue/electron-browser/issue.contribution.js';
// Process Explorer
import './contrib/processExplorer/electron-browser/processExplorer.contribution.js';
// Remote
import './contrib/remote/electron-browser/remote.contribution.js';
// Terminal
import './contrib/terminal/electron-browser/terminal.contribution.js';
// Themes
import './contrib/themes/browser/themes.test.contribution.js';
import './services/themes/electron-browser/themes.contribution.js';
// User Data Sync
import './contrib/userDataSync/electron-browser/userDataSync.contribution.js';
// Tags
import './contrib/tags/electron-browser/workspaceTagsService.js';
import './contrib/tags/electron-browser/tags.contribution.js';
// Performance
import './contrib/performance/electron-browser/performance.contribution.js';
// Tasks
import './contrib/tasks/electron-browser/taskService.js';
// External terminal
import './contrib/externalTerminal/electron-browser/externalTerminal.contribution.js';
// Webview
import './contrib/webview/electron-browser/webview.contribution.js';
// Splash
import './contrib/splash/electron-browser/splash.contribution.js';
// Local History
import './contrib/localHistory/electron-browser/localHistory.contribution.js';
// Merge Editor
import './contrib/mergeEditor/electron-browser/mergeEditor.contribution.js';
// Multi Diff Editor
import './contrib/multiDiffEditor/browser/multiDiffEditor.contribution.js';
// Remote Tunnel
import './contrib/remoteTunnel/electron-browser/remoteTunnel.contribution.js';
// Chat
import './contrib/chat/electron-browser/chat.contribution.js';
import './contrib/inlineChat/electron-browser/inlineChat.contribution.js';
// Encryption
import './contrib/encryption/electron-browser/encryption.contribution.js';
// Emergency Alert
import './contrib/emergencyAlert/electron-browser/emergencyAlert.contribution.js';
// MCP
import './contrib/mcp/electron-browser/mcp.contribution.js';
//#endregion
export { main } from './electron-browser/desktop.main.js';
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya2JlbmNoLmRlc2t0b3AubWFpbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL2FkdmlrYXIvRG9jdW1lbnRzL2FyY2hpdGVjdC9hcmNoMi9BcmNoSURFL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC93b3JrYmVuY2guZGVza3RvcC5tYWluLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLDBFQUEwRTtBQUMxRSwwRUFBMEU7QUFDMUUsMEVBQTBFO0FBQzFFLDBFQUEwRTtBQUMxRSwwRUFBMEU7QUFFMUUsOEJBQThCO0FBRTlCLE9BQU8sNEJBQTRCLENBQUM7QUFFcEMsWUFBWTtBQUdaLHNDQUFzQztBQUV0QyxPQUFPLG9DQUFvQyxDQUFDO0FBQzVDLE9BQU8sNENBQTRDLENBQUM7QUFFcEQsWUFBWTtBQUdaLDZCQUE2QjtBQUU3QixPQUFPLHlEQUF5RCxDQUFDO0FBRWpFLFlBQVk7QUFHWixnQ0FBZ0M7QUFFaEMsT0FBTywrREFBK0QsQ0FBQztBQUN2RSxPQUFPLDBEQUEwRCxDQUFDO0FBQ2xFLE9BQU8sNkRBQTZELENBQUM7QUFDckUsT0FBTyx1REFBdUQsQ0FBQztBQUMvRCxPQUFPLHFEQUFxRCxDQUFDO0FBQzdELE9BQU8sK0NBQStDLENBQUM7QUFDdkQsT0FBTywyREFBMkQsQ0FBQztBQUNuRSxPQUFPLG1EQUFtRCxDQUFDO0FBQzNELE9BQU8sdURBQXVELENBQUM7QUFDL0QsT0FBTyx1REFBdUQsQ0FBQztBQUMvRCxPQUFPLDJEQUEyRCxDQUFDO0FBQ25FLE9BQU8sK0RBQStELENBQUM7QUFDdkUsT0FBTyxtRUFBbUUsQ0FBQztBQUMzRSxPQUFPLG1GQUFtRixDQUFDO0FBQzNGLE9BQU8sbUVBQW1FLENBQUM7QUFDM0UsT0FBTyxnRUFBZ0UsQ0FBQztBQUN4RSxPQUFPLGlEQUFpRCxDQUFDO0FBQ3pELE9BQU8sb0VBQW9FLENBQUM7QUFDNUUsT0FBTywrRUFBK0UsQ0FBQztBQUN2RixPQUFP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