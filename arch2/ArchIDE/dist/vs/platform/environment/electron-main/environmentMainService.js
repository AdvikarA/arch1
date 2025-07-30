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
import { memoize } from '../../../base/common/decorators.js';
import { join } from '../../../base/common/path.js';
import { isLinux } from '../../../base/common/platform.js';
import { createStaticIPCHandle } from '../../../base/parts/ipc/node/ipc.net.js';
import { IEnvironmentService } from '../common/environment.js';
import { NativeEnvironmentService } from '../node/environmentService.js';
import { refineServiceDecorator } from '../../instantiation/common/instantiation.js';
export const IEnvironmentMainService = refineServiceDecorator(IEnvironmentService);
export class EnvironmentMainService extends NativeEnvironmentService {
    constructor() {
        super(...arguments);
        this._snapEnv = {};
    }
    get backupHome() { return join(this.userDataPath, 'Backups'); }
    get mainIPCHandle() { return createStaticIPCHandle(this.userDataPath, 'main', this.productService.version); }
    get mainLockfile() { return join(this.userDataPath, 'code.lock'); }
    get disableUpdates() { return !!this.args['disable-updates']; }
    get crossOriginIsolated() { return !!this.args['enable-coi']; }
    get enableRDPDisplayTracking() { return !!this.args['enable-rdp-display-tracking']; }
    get codeCachePath() { return process.env['VSCODE_CODE_CACHE_PATH'] || undefined; }
    get useCodeCache() { return !!this.codeCachePath; }
    unsetSnapExportedVariables() {
        if (!isLinux) {
            return;
        }
        for (const key in process.env) {
            if (key.endsWith('_VSCODE_SNAP_ORIG')) {
                const originalKey = key.slice(0, -17); // Remove the _VSCODE_SNAP_ORIG suffix
                if (this._snapEnv[originalKey]) {
                    continue;
                }
                // Preserve the original value in case the snap env is re-entered
                if (process.env[originalKey]) {
                    this._snapEnv[originalKey] = process.env[originalKey];
                }
                // Copy the original value from before entering the snap env if available,
                // if not delete the env variable.
                if (process.env[key]) {
                    process.env[originalKey] = process.env[key];
                }
                else {
                    delete process.env[originalKey];
                }
            }
        }
    }
    restoreSnapExportedVariables() {
        if (!isLinux) {
            return;
        }
        for (const key in this._snapEnv) {
            process.env[key] = this._snapEnv[key];
            delete this._snapEnv[key];
        }
    }
}
__decorate([
    memoize
], EnvironmentMainService.prototype, "backupHome", null);
__decorate([
    memoize
], EnvironmentMainService.prototype, "mainIPCHandle", null);
__decorate([
    memoize
], EnvironmentMainService.prototype, "mainLockfile", null);
__decorate([
    memoize
], EnvironmentMainService.prototype, "disableUpdates", null);
__decorate([
    memoize
], EnvironmentMainService.prototype, "crossOriginIsolated", null);
__decorate([
    memoize
], EnvironmentMainService.prototype, "enableRDPDisplayTracking", null);
__decorate([
    memoize
], EnvironmentMainService.prototype, "codeCachePath", null);
__decorate([
    memoize
], EnvironmentMainService.prototype, "useCodeCache", null);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW52aXJvbm1lbnRNYWluU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL2FkdmlrYXIvRG9jdW1lbnRzL2FyY2hpdGVjdC9hcmNoMi9BcmNoSURFL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL2Vudmlyb25tZW50L2VsZWN0cm9uLW1haW4vZW52aXJvbm1lbnRNYWluU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDN0QsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBQ3BELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUMzRCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNoRixPQUFPLEVBQUUsbUJBQW1CLEVBQTZCLE1BQU0sMEJBQTBCLENBQUM7QUFDMUYsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDekUsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFFckYsTUFBTSxDQUFDLE1BQU0sdUJBQXVCLEdBQUcsc0JBQXNCLENBQStDLG1CQUFtQixDQUFDLENBQUM7QUE2QmpJLE1BQU0sT0FBTyxzQkFBdUIsU0FBUSx3QkFBd0I7SUFBcEU7O1FBRVMsYUFBUSxHQUEyQixFQUFFLENBQUM7SUE0RC9DLENBQUM7SUF6REEsSUFBSSxVQUFVLEtBQWEsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLFlBQVksRUFBRSxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFHdkUsSUFBSSxhQUFhLEtBQWEsT0FBTyxxQkFBcUIsQ0FBQyxJQUFJLENBQUMsWUFBWSxFQUFFLE1BQU0sRUFBRSxJQUFJLENBQUMsY0FBYyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUdySCxJ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