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
import { Disposable } from '../../../../base/common/lifecycle.js';
import { localize } from '../../../../nls.js';
import { registerAction2 } from '../../../../platform/actions/common/actions.js';
import { CommandsRegistry } from '../../../../platform/commands/common/commands.js';
import { SyncDescriptor } from '../../../../platform/instantiation/common/descriptors.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { registerWorkbenchContribution2 } from '../../../common/contributions.js';
import { SignOutOfAccountAction } from './actions/signOutOfAccountAction.js';
import { IBrowserWorkbenchEnvironmentService } from '../../../services/environment/browser/environmentService.js';
import { Extensions } from '../../../services/extensionManagement/common/extensionFeatures.js';
import { ManageTrustedExtensionsForAccountAction } from './actions/manageTrustedExtensionsForAccountAction.js';
import { ManageAccountPreferencesForExtensionAction } from './actions/manageAccountPreferencesForExtensionAction.js';
import { IAuthenticationUsageService } from '../../../services/authentication/browser/authenticationUsageService.js';
import { ManageAccountPreferencesForMcpServerAction } from './actions/manageAccountPreferencesForMcpServerAction.js';
import { ManageTrustedMcpServersForAccountAction } from './actions/manageTrustedMcpServersForAccountAction.js';
import { RemoveDynamicAuthenticationProvidersAction } from './actions/manageDynamicAuthenticationProvidersAction.js';
import { IAuthenticationQueryService } from '../../../services/authentication/common/authenticationQuery.js';
import { IMcpRegistry } from '../../mcp/common/mcpRegistryTypes.js';
import { autorun } from '../../../../base/common/observable.js';
import { IAuthenticationService } from '../../../services/authentication/common/authentication.js';
import { Event } from '../../../../base/common/event.js';
const codeExchangeProxyCommand = CommandsRegistry.registerCommand('workbench.getCodeExchangeProxyEndpoints', function (accessor, _) {
    const environmentService = accessor.get(IBrowserWorkbenchEnvironmentService);
    return environmentService.options?.codeExchangeProxyEndpoints;
});
class AuthenticationDataRenderer extends Disposable {
    constructor() {
        super(...arguments);
        this.type = 'table';
    }
    shouldRender(manifest) {
        return !!manifest.contributes?.authentication;
    }
    render(manifest) {
        const authentication = manifest.contributes?.authentication || [];
        if (!authentication.length) {
            return { data: { headers: [], rows: [] }, dispose: () => { } };
        }
        const headers = [
            localize('authenticationlabel', "Label"),
            localize('authenticationid', "ID"),
            localize('authenticationMcpAuthorizationServers', "MCP Authorization Servers")
        ];
        const rows = authentication
            .sort((a, b) => a.label.localeCompare(b.label))
            .map(auth => {
            return [
                auth.label,
                auth.id,
                (auth.authorizationServerGlobs ?? []).join(',\n')
            ];
        });
        return {
            data: {
                headers,
                rows
            },
            dispose: () => { }
        };
    }
}
const extensionFeature = Registry.as(Extensions.ExtensionFeaturesRegistry).registerExtensionFeature({
    id: 'authentication',
    label: localize('authentication', "Authentication"),
    access: {
        canToggle: false
    },
    renderer: new SyncDescriptor(AuthenticationDataRenderer),
});
class AuthenticationContribution extends Disposable {
    static { this.ID = 'workbench.contrib.authentication'; }
    constructor() {
        super();
        this._register(codeExchangeProxyCommand);
        this._register(extensionFeature);
        this._registerActions();
    }
    _registerActions() {
        this._register(registerAction2(SignOutOfAccountAction));
        this._register(registerAction2(ManageTrustedExtensionsForAccountAction));
        this._register(registerAction2(ManageAccountPreferencesForExtensionAction));
        this._register(registerAction2(ManageTrustedMcpServersForAccountAction));
        this._register(registerAction2(ManageAccountPreferencesForMcpServerAction));
        this._register(registerAction2(RemoveDynamicAuthenticationProvidersAction));
    }
}
let AuthenticationUsageContribution = class AuthenticationUsageContribution {
    static { this.ID = 'workbench.contrib.authenticationUsage'; }
    constructor(_authenticationUsageService) {
        this._authenticationUsageService = _authenticationUsageService;
        this._initializeExtensionUsageCache();
    }
    async _initializeExtensionUsageCache() {
        await this._authenticationUsageService.initializeExtensionUsageCache();
    }
};
AuthenticationUsageContribution = __decorate([
    __param(0, IAuthenticationUsageService)
], AuthenticationUsageContribution);
// class AuthenticationExtensionsContribution extends Disposable implements IWorkbenchContribution {
// 	static ID = 'workbench.contrib.authenticationExtensions';
// 	constructor(
// 		@IExtensionService private readonly _extensionService: IExtensionService,
// 		@IAuthenticationQueryService private readonly _authenticationQueryService: IAuthenticationQueryService,
// 		@IAuthenticationService private readonly _authenticationService: IAuthenticationService
// 	) {
// 		super();
// 		void this.run();
// 		this._register(this._extensionService.onDidChangeExtensions(this._onDidChangeExtensions, this));
// 		this._register(
// 			Event.any(
// 				this._authenticationService.onDidChangeDeclaredProviders,
// 				this._authenticationService.onDidRegisterAuthenticationProvider
// 			)(() => this._cleanupRemovedExtensions())
// 		);
// 	}
// 	async run(): Promise<void> {
// 		await this._extensionService.whenInstalledExtensionsRegistered();
// 		this._cleanupRemovedExtensions();
// 	}
// 	private _onDidChangeExtensions(delta: { readonly added: readonly IExtensionDescription[]; readonly removed: readonly IExtensionDescription[] }): void {
// 		if (delta.removed.length > 0) {
// 			this._cleanupRemovedExtensions(delta.removed);
// 		}
// 	}
// 	private _cleanupRemovedExtensions(removedExtensions?: readonly IExtensionDescription[]): void {
// 		const extensionIdsToRemove = removedExtensions
// 			? new Set(removedExtensions.map(e => e.identifier.value))
// 			: new Set(this._extensionService.extensions.map(e => e.identifier.value));
// 		// If we are cleaning up specific removed extensions, we only remove those.
// 		const isTargetedCleanup = !!removedExtensions;
// 		const providerIds = this._authenticationQueryService.getProviderIds();
// 		for (const providerId of providerIds) {
// 			this._authenticationQueryService.provider(providerId).forEachAccount(account => {
// 				account.extensions().forEach(extension => {
// 					const shouldRemove = isTargetedCleanup
// 						? extensionIdsToRemove.has(extension.extensionId)
// 						: !extensionIdsToRemove.has(extension.extensionId);
// 					if (shouldRemove) {
// 						extension.removeUsage();
// 						extension.setAccessAllowed(false);
// 					}
// 				});
// 			});
// 		}
// 	}
// }
let AuthenticationMcpContribution = class AuthenticationMcpContribution extends Disposable {
    static { this.ID = 'workbench.contrib.authenticationMcp'; }
    constructor(_mcpRegistry, _authenticationQueryService, _authenticationService) {
        super();
        this._mcpRegistry = _mcpRegistry;
        this._authenticationQueryService = _authenticationQueryService;
        this._authenticationService = _authenticationService;
        this._cleanupRemovedMcpServers();
        // Listen for MCP collections changes using autorun with observables
        this._register(autorun(reader => {
            // Read the collections observable to register dependency
            this._mcpRegistry.collections.read(reader);
            // Schedule cleanup for next tick to avoid running during observable updates
            queueMicrotask(() => this._cleanupRemovedMcpServers());
        }));
        this._register(Event.any(this._authenticationService.onDidChangeDeclaredProviders, this._authenticationService.onDidRegisterAuthenticationProvider)(() => this._cleanupRemovedMcpServers()));
    }
    _cleanupRemovedMcpServers() {
        const currentServerIds = new Set(this._mcpRegistry.collections.get().flatMap(c => c.serverDefinitions.get()).map(s => s.id));
        const providerIds = this._authenticationQueryService.getProviderIds();
        for (const providerId of providerIds) {
            this._authenticationQueryService.provider(providerId).forEachAccount(account => {
                account.mcpServers().forEach(server => {
                    if (!currentServerIds.has(server.mcpServerId)) {
                        server.removeUsage();
                        server.setAccessAllowed(false);
                    }
                });
            });
        }
    }
};
AuthenticationMcpContribution = __decorate([
    __param(0, IMcpRegistry),
    __param(1, IAuthenticationQueryService),
    __param(2, IAuthenticationService)
], AuthenticationMcpContribution);
registerWorkbenchContribution2(AuthenticationContribution.ID, AuthenticationContribution, 3 /* WorkbenchPhase.AfterRestored */);
registerWorkbenchContribution2(AuthenticationUsageContribution.ID, AuthenticationUsageContribution, 4 /* WorkbenchPhase.Eventually */);
// registerWorkbenchContribution2(AuthenticationExtensionsContribution.ID, AuthenticationExtensionsContribution, WorkbenchPhase.Eventually);
registerWorkbenchContribution2(AuthenticationMcpContribution.ID, AuthenticationMcpContribution, 4 /* WorkbenchPhase.Eventually */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXV0aGVudGljYXRpb24uY29udHJpYnV0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvYWR2aWthci9Eb2N1bWVudHMvYXJjaGl0ZWN0L2FyY2gyL0FyY2hJREUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvYXV0aGVudGljYXRpb24vYnJvd3Nlci9hdXRoZW50aWNhdGlvbi5jb250cmlidXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUM5QyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDakYsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFFcEYsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDBEQUEwRCxDQUFDO0FBQzFGLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUM1RSxPQUFPLEVBQTBDLDhCQUE4QixFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDMUgsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDN0UsT0FBTyxFQUFFLG1DQUFtQyxFQUFFLE1BQU0sNkRBQTZELENBQUM7QUFDbEgsT0FBTyxFQUFFLFVBQVUsRUFBbUcsTUFBTSxtRUFBbUUsQ0FBQztBQUNoTSxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUMvRyxPQUFPLEVBQUUsMENBQTBDLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUNySCxPQUFPLEVBQUUsMkJBQTJCLEVBQUUsTUFBTSx3RUFBd0UsQ0FBQztBQUNySCxPQUFPLEVBQUUsMENBQTBDLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUNySCxPQUFPLEVBQUUs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