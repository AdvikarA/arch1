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
import { Throttler } from '../../../../../base/common/async.js';
import { Disposable, DisposableMap, DisposableStore } from '../../../../../base/common/lifecycle.js';
import { ResourceMap } from '../../../../../base/common/map.js';
import { observableValue } from '../../../../../base/common/observable.js';
import { posix as pathPosix, sep as pathSep, win32 as pathWin32 } from '../../../../../base/common/path.js';
import { isWindows } from '../../../../../base/common/platform.js';
import { URI } from '../../../../../base/common/uri.js';
import { ITextModelService } from '../../../../../editor/common/services/resolverService.js';
import { IRemoteAgentService } from '../../../../services/remote/common/remoteAgentService.js';
import { getMcpServerMapping } from '../mcpConfigFileUtils.js';
import { mcpConfigurationSection } from '../mcpConfiguration.js';
import { IMcpRegistry } from '../mcpRegistryTypes.js';
import { IMcpWorkbenchService, McpServerLaunch } from '../mcpTypes.js';
let InstalledMcpServersDiscovery = class InstalledMcpServersDiscovery extends Disposable {
    constructor(mcpWorkbenchService, mcpRegistry, remoteAgentService, textModelService) {
        super();
        this.mcpWorkbenchService = mcpWorkbenchService;
        this.mcpRegistry = mcpRegistry;
        this.remoteAgentService = remoteAgentService;
        this.textModelService = textModelService;
        this.collectionDisposables = this._register(new DisposableMap());
    }
    start() {
        const throttler = this._register(new Throttler());
        this._register(this.mcpWorkbenchService.onChange(() => throttler.queue(() => this.sync())));
        this.sync();
    }
    async getServerIdMapping(resource, pathToServers) {
        const store = new DisposableStore();
        try {
            const ref = await this.textModelService.createModelReference(resource);
            store.add(ref);
            const serverIdMapping = getMcpServerMapping({ model: ref.object.textEditorModel, pathToServers });
            return serverIdMapping;
        }
        catch {
            return new Map();
        }
        finally {
            store.dispose();
        }
    }
    async sync() {
        try {
            const remoteEnv = await this.remoteAgentService.getEnvironment();
            const collections = new Map();
            const mcpConfigPathInfos = new ResourceMap();
            for (const server of this.mcpWorkbenchService.getEnabledLocalMcpServers()) {
                let mcpConfigPathPromise = mcpConfigPathInfos.get(server.mcpResource);
                if (!mcpConfigPathPromise) {
                    mcpConfigPathPromise = (async (local) => {
                        const mcpConfigPath = this.mcpWorkbenchService.getMcpConfigPath(local);
                        const locations = mcpConfigPath?.uri ? await this.getServerIdMapping(mcpConfigPath?.uri, mcpConfigPath.section ? [...mcpConfigPath.section, 'servers'] : ['servers']) : new Map();
                        return mcpConfigPath ? { ...mcpConfigPath, locations } : undefined;
                    })(server);
                    mcpConfigPathInfos.set(server.mcpResource, mcpConfigPathPromise);
                }
                const config = server.config;
                const mcpConfigPath = await mcpConfigPathPromise;
                const collectionId = `mcp.config.${mcpConfigPath ? mcpConfigPath.id : 'unknown'}`;
                let definitions = collections.get(collectionId);
                if (!definitions) {
                    definitions = [mcpConfigPath, []];
                    collections.set(collectionId, definitions);
                }
                const { isAbsolute, join, sep } = mcpConfigPath?.remoteAuthority && remoteEnv
                    ? (remoteEnv.os === 1 /* OperatingSystem.Windows */ ? pathWin32 : pathPosix)
                    : (isWindows ? pathWin32 : pathPosix);
                const fsPathForRemote = (uri) => {
                    const fsPathLocal = uri.fsPath;
                    return fsPathLocal.replaceAll(pathSep, sep);
                };
                const launch = config.type === 'http' ? {
                    type: 2 /* McpServerTransportType.HTTP */,
                    uri: URI.parse(config.url),
                    headers: Object.entries(config.headers || {}),
                } : {
                    type: 1 /* McpServerTransportType.Stdio */,
                    command: config.command,
                    args: config.args || [],
                    env: config.env || {},
                    envFile: config.envFile,
                    cwd: config.cwd
                        // if the cwd is defined in a workspace folder but not absolute (and not
                        // a variable or tilde-expansion) then resolve it in the workspace folder
                        // if the cwd is defined in a workspace folder but not absolute (and not
                        // a variable or tilde-expansion) then resolve it in the workspace folder
                        ? (!isAbsolute(config.cwd) && !config.cwd.startsWith('~') && !config.cwd.startsWith('${') && mcpConfigPath?.workspaceFolder
                            ? join(fsPathForRemote(mcpConfigPath.workspaceFolder.uri), config.cwd)
                            : config.cwd)
                        : mcpConfigPath?.workspaceFolder
                            ? fsPathForRemote(mcpConfigPath.workspaceFolder.uri)
                            : undefined,
                };
                definitions[1].push({
                    id: `${collectionId}.${server.name}`,
                    label: server.name,
                    launch,
                    cacheNonce: await McpServerLaunch.hash(launch),
                    roots: mcpConfigPath?.workspaceFolder ? [mcpConfigPath.workspaceFolder.uri] : undefined,
                    variableReplacement: {
                        folder: mcpConfigPath?.workspaceFolder,
                        section: mcpConfigurationSection,
                        target: mcpConfigPath?.target ?? 2 /* ConfigurationTarget.USER */,
                    },
                    devMode: config.dev,
                    presentation: {
                        order: mcpConfigPath?.order,
                        origin: mcpConfigPath?.locations.get(server.name)
                    }
                });
            }
            for (const [id, [mcpConfigPath, serverDefinitions]] of collections) {
                this.collectionDisposables.deleteAndDispose(id);
                this.collectionDisposables.set(id, this.mcpRegistry.registerCollection({
                    id,
                    label: mcpConfigPath?.label ?? '',
                    presentation: {
                        order: serverDefinitions[0]?.presentation?.order,
                        origin: mcpConfigPath?.uri,
                    },
                    remoteAuthority: mcpConfigPath?.remoteAuthority ?? null,
                    serverDefinitions: observableValue(this, serverDefinitions),
                    trustBehavior: mcpConfigPath?.workspaceFolder ? 1 /* McpServerTrust.Kind.TrustedOnNonce */ : 0 /* McpServerTrust.Kind.Trusted */,
                    configTarget: mcpConfigPath?.target ?? 2 /* ConfigurationTarget.USER */,
                    scope: mcpConfigPath?.scope ?? 0 /* StorageScope.PROFILE */,
                }));
            }
            for (const [id] of this.collectionDisposables) {
                if (!collections.has(id)) {
                    this.collectionDisposables.deleteAndDispose(id);
                }
            }
        }
        catch (error) {
            this.collectionDisposables.clearAndDisposeAll();
        }
    }
};
InstalledMcpServersDiscovery = __decorate([
    __param(0, IMcpWorkbenchService),
    __param(1, IMcpRegistry),
    __param(2, IRemoteAgentService),
    __param(3, ITextModelService)
], InstalledMcpServersDiscovery);
export { InstalledMcpServersDiscovery };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5zdGFsbGVkTWNwU2VydmVyc0Rpc2NvdmVyeS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL2FkdmlrYXIvRG9jdW1lbnRzL2FyY2hpdGVjdC9hcmNoMi9BcmNoSURFL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL21jcC9jb21tb24vZGlzY292ZXJ5L2luc3RhbGxlZE1jcFNlcnZlcnNEaXNjb3ZlcnkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQ2hFLE9BQU8sRUFBRSxVQUFVLEVBQUUsYUFBYSxFQUFFLGVBQWUsRUFBZSxNQUFNLHlDQUF5QyxDQUFDO0FBQ2xILE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUNoRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDM0UsT0FBTyxFQUFFLEtBQUssSUFBSSxTQUFTLEVBQUUsR0FBRyxJQUFJLE9BQU8sRUFBRSxLQUFLLElBQUksU0FBUyxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDNUcsT0FBTyxFQUFFLFNBQVMsRUFBbUIsTUFBTSx3Q0FBd0MsQ0FBQztBQUNwRixPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFFeEQsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sMERBQTBELENBQUM7QUFJN0YsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sMERBQTBELENBQUM7QUFDL0YsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sMEJBQTBCLENBQUM7QUFDL0QsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sd0JBQXdCLENBQUM7QUFDakUsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLHdCQUF3QixDQUFDO0FBQ3RELE9BQU8sRUFBa0Isb0JBQW9CLEVBQXVCLGVBQWUsRUFBMEMs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