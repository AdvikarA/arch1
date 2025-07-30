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
import { ITerminalInstanceService } from './terminal.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { TerminalExtensions } from '../../../../platform/terminal/common/terminal.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { TerminalInstance } from './terminalInstance.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { Emitter } from '../../../../base/common/event.js';
import { TerminalContextKeys } from '../common/terminalContextKey.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { IWorkbenchEnvironmentService } from '../../../services/environment/common/environmentService.js';
import { promiseWithResolvers } from '../../../../base/common/async.js';
let TerminalInstanceService = class TerminalInstanceService extends Disposable {
    get onDidCreateInstance() { return this._onDidCreateInstance.event; }
    get onDidRegisterBackend() { return this._onDidRegisterBackend.event; }
    constructor(_instantiationService, _contextKeyService, environmentService) {
        super();
        this._instantiationService = _instantiationService;
        this._contextKeyService = _contextKeyService;
        this._backendRegistration = new Map();
        this._onDidCreateInstance = this._register(new Emitter());
        this._onDidRegisterBackend = this._register(new Emitter());
        this._terminalShellTypeContextKey = TerminalContextKeys.shellType.bindTo(this._contextKeyService);
        for (const remoteAuthority of [undefined, environmentService.remoteAuthority]) {
            const { promise, resolve } = promiseWithResolvers();
            this._backendRegistration.set(remoteAuthority, { promise, resolve });
        }
    }
    createInstance(config, target) {
        const shellLaunchConfig = this.convertProfileToShellLaunchConfig(config);
        const instance = this._instantiationService.createInstance(TerminalInstance, this._terminalShellTypeContextKey, shellLaunchConfig);
        instance.target = target;
        this._onDidCreateInstance.fire(instance);
        return instance;
    }
    convertProfileToShellLaunchConfig(shellLaunchConfigOrProfile, cwd) {
        // Profile was provided
        if (shellLaunchConfigOrProfile && 'profileName' in shellLaunchConfigOrProfile) {
            const profile = shellLaunchConfigOrProfile;
            if (!profile.path) {
                return shellLaunchConfigOrProfile;
            }
            return {
                executable: profile.path,
                args: profile.args,
                env: profile.env,
                icon: profile.icon,
                color: profile.color,
                name: profile.overrideName ? profile.profileName : undefined,
                cwd
            };
        }
        // A shell launch config was provided
        if (shellLaunchConfigOrProfile) {
            if (cwd) {
                shellLaunchConfigOrProfile.cwd = cwd;
            }
            return shellLaunchConfigOrProfile;
        }
        // Return empty shell launch config
        return {};
    }
    async getBackend(remoteAuthority) {
        let backend = Registry.as(TerminalExtensions.Backend).getTerminalBackend(remoteAuthority);
        if (!backend) {
            // Ensure backend is initialized and try again
            await this._backendRegistration.get(remoteAuthority)?.promise;
            backend = Registry.as(TerminalExtensions.Backend).getTerminalBackend(remoteAuthority);
        }
        return backend;
    }
    getRegisteredBackends() {
        return Registry.as(TerminalExtensions.Backend).backends.values();
    }
    didRegisterBackend(backend) {
        this._backendRegistration.get(backend.remoteAuthority)?.resolve();
        this._onDidRegisterBackend.fire(backend);
    }
};
TerminalInstanceService = __decorate([
    __param(0, IInstantiationService),
    __param(1, IContextKeyService),
    __param(2, IWorkbenchEnvironmentService)
], TerminalInstanceService);
export { TerminalInstanceService };
registerSingleton(ITerminalInstanceService, TerminalInstanceService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxJbnN0YW5jZVNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9hZHZpa2FyL0RvY3VtZW50cy9hcmNoaXRlY3QvYXJjaDIvQXJjaElERS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXJtaW5hbC9icm93c2VyL3Rlcm1pbmFsSW5zdGFuY2VTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBcUIsd0JBQXdCLEVBQUUsTUFBTSxlQUFlLENBQUM7QUFDNUUsT0FBTyxFQUFxQixpQkFBaUIsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQy9HLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNsRSxPQUFPLEVBQW9GLGtCQUFrQixFQUFvQixNQUFNLGtEQUFrRCxDQUFDO0FBQzFMLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ25HLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBQ3pELE9BQU8sRUFBZSxrQkFBa0IsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBRXZHLE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSxrQ0FBa0MsQ0FBQztBQUNsRSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUN0RSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFDNUUsT0FBTyxFQUFFLDRCQUE0QixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDMUcsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFFakUsSUFBTSx1QkFBdUIsR0FBN0IsTUFBTSx1QkFBd0IsU0FBUSxVQUFVO0lBTXRELElBQUksbUJBQW1CLEtBQStCLE9BQU8sSUFBSSxDQUFDLG9CQUFvQixDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7SUFHL0YsSUFBSSxvQkFBb0IsS0FBOEIsT0FBTyxJQUFJLENBQUMscUJBQXFCLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztJQUVoRyxZQUN3QixxQkFBNkQsRUFDaEUsa0JBQXVELEVBQzdDLGtCQUFnRDtRQUU5RSxLQUFLLEVBQUUsQ0FBQztRQUpnQywwQkFBcUIsR0FBckIscUJBQXFCLENBQXVCO1FBQy9DLHVCQUFrQixHQUFsQixrQkFBa0IsQ0FBb0I7UUFWcEUseUJBQW9CLEdBQUcsSUFBSSxHQUFHLEVBQXVFLENBQUM7UUFFN0YseUJBQW9CLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sRUFBcUIsQ0FBQyxDQUFDO1FBR3hFLDBCQUFxQixHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLEVBQW9CLENBQUMsQ0FBQztRQVN4RixJQUFJLENBQUMsNEJBQTRCLEdBQUcsbUJBQW1CLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsQ0FBQztRQUVsRyxLQUFLLE1BQU0sZUFBZSxJQUFJLENBQUMsU0FBUyxFQUFFLGtCQUFrQixDQUFDLGVBQWUsQ0FBQyxFQUFFLENBQUM7WUFDL0UsTUFBTSxFQUFFLE9BQU8sRUFBRSxPQUFPLEVBQUUsR0FBRyxvQkFBb0IsRUFBUSxDQUFDO1lBQzFELElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxHQUFHLENBQUMsZUFBZSxFQUFFLEVBQUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxDQUFDLENBQUM7UUFDdEUsQ0FBQztJQUNGLENBQUM7SUFJRCxjQUFjLENBQUMsTUFBNkMsRUFBRSxNQUF3QjtRQUNyRixNQUFNLGlCQUFpQixHQUFHLElBQUksQ0FBQyxpQ0FBaUMsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUN6RSxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMscUJBQXFCLENBQUMsY0FBYyxDQUFDLGdCQUFnQixFQUFFLElBQUksQ0FBQyw0QkFBNEIsRUFBRSxpQkFBaUIsQ0FBQyxDQUFDO1FBQ25JLFFBQVEsQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFDO1FBQ3pCLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDekMsT0FBTyxRQUFRLENBQUM7SUFDakIsQ0FBQztJQUVELGlDQUFpQyxDQUFDLDBCQUFrRSxFQUFFLEdBQWtCO1FBQ3ZILHVCQUF1QjtRQUN2QixJQUFJLDBCQUEwQixJQUFJLGFBQWEsSUFBSSwwQkFBMEIsRUFBRSxDQUFDO1lBQy9FLE1BQU0sT0FBTyxHQUFHLDBCQUEwQixDQUFDO1lBQzNDLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLENBQUM7Z0JBQ25CLE9BQU8sMEJBQTBCLENBQUM7WUFDbkMsQ0FBQztZQUNELE9BQU87Z0JBQ04sVUFBVSxFQUFFLE9BQU8sQ0FBQyxJQUFJO2dCQUN4QixJQUFJLEVBQUUsT0FBTyxDQUFDLElBQUk7Z0JBQ2xCLEdBQUcsRUFBRSxPQUFPLENBQUMsR0FBRztnQkFDaEIsSUFBSSxFQUFFLE9BQU8sQ0FBQyxJQUFJO2dCQUNsQixLQUFLLEVBQUUsT0FBTyxDQUFDLEtBQUs7Z0JBQ3BCLElBQUksRUFBRSxPQUFPLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxTQUFTO2dCQUM1RCxHQUFHO2FBQ0gsQ0FBQztRQUNILENBQUM7UUFFRCxxQ0FBcUM7UUFDckMsSUFBSSwwQkFBMEIsRUFBRSxDQUFDO1lBQ2hDLElBQUksR0FBRyxFQUFFLENBQUM7Z0JBQ1QsMEJBQTBCLENBQUMsR0FBRyxHQUFHLEdBQUcsQ0FBQztZQUN0QyxDQUFDO1lBQ0QsT0FBTywwQkFBMEIsQ0FBQztRQUNuQyxDQUFDO1FBRUQsbUNBQW1DO1FBQ25DLE9BQU8sRUFBRSxDQUFDO0lBQ1gsQ0FBQztJQUVELEtBQUssQ0FBQyxVQUFVLENBQUMsZUFBd0I7UUFDeEMsSUFBSSxPQUFPLEdBQUcsUUFBUSxDQUFDLEVBQUUsQ0FBMkIsa0JBQWtCLENBQUMsT0FBTyxDQUFDLENBQUMsa0JBQWtCLENBQUMsZUFBZSxDQUFDLENBQUM7UUFDcEgsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ2QsOENBQThDO1lBQzlDLE1BQU0sSUFBSSxDQUFDLG9CQUFvQixDQUFDLEdBQUcsQ0FBQyxlQUFlLENBQUMsRUFBRSxPQUFPLENBQUM7WUFDOUQsT0FBTyxHQUFHLFFBQVEsQ0FBQyxFQUFFLENBQTJCLGtCQUFrQixDQUFDLE9BQU8sQ0FBQyxDQUFDLGtCQUFrQixDQUFDLGVBQWUsQ0FBQyxDQUFDO1FBQ2pILENBQUM7UUFDRCxPQUFPLE9BQU8sQ0FBQztJQUNoQixDQUFDO0lBRUQscUJBQXFCO1FBQ3BCLE9BQU8sUUFBUSxDQUFDLEVBQUUsQ0FBMkIsa0JBQWtCLENBQUMsT0FBTyxDQUFDLENBQUMsUUFBUSxDQUFDLE1BQU0sRUFBRSxDQUFDO0lBQzVGLENBQUM7SUFFRCxrQkFBa0IsQ0FBQyxPQUF5QjtRQUMzQyxJQUFJLENBQUMsb0JBQW9CLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxlQUFlLENBQUMsRUFBRSxPQUFPLEVBQUUsQ0FBQztRQUNsRSxJQUFJLENBQUMscUJBQXFCLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBQzFDLENBQUM7Q0FDRCxDQUFBO0FBbkZZLHVCQUF1QjtJQVlqQyxXQUFBLHFCQUFxQixDQUFBO0lBQ3JCLFdBQUEsa0JBQWtCLENBQUE7SUFDbEIsV0FBQSw0QkFBNEIsQ0FBQTtHQWRsQix1QkFBdUIsQ0FtRm5DOztBQUVELGlCQUFpQixDQUFDLHdCQUF3QixFQUFFLHVCQUF1QixvQ0FBNEIsQ0FBQyJ9