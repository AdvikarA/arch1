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
import { assertNever } from '../../../base/common/assert.js';
import { Queue } from '../../../base/common/async.js';
import { VSBuffer } from '../../../base/common/buffer.js';
import { parse } from '../../../base/common/json.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { ResourceMap } from '../../../base/common/map.js';
import { ConfigurationTargetToString } from '../../configuration/common/configuration.js';
import { IFileService, toFileOperationResult } from '../../files/common/files.js';
import { registerSingleton } from '../../instantiation/common/extensions.js';
import { createDecorator } from '../../instantiation/common/instantiation.js';
import { IUriIdentityService } from '../../uriIdentity/common/uriIdentity.js';
export const IMcpResourceScannerService = createDecorator('IMcpResourceScannerService');
let McpResourceScannerService = class McpResourceScannerService extends Disposable {
    constructor(fileService, uriIdentityService) {
        super();
        this.fileService = fileService;
        this.uriIdentityService = uriIdentityService;
        this.resourcesAccessQueueMap = new ResourceMap();
    }
    async scanMcpServers(mcpResource, target) {
        return this.withProfileMcpServers(mcpResource, target);
    }
    async addMcpServers(servers, mcpResource, target) {
        await this.withProfileMcpServers(mcpResource, target, scannedMcpServers => {
            let updatedInputs = scannedMcpServers.inputs ?? [];
            const existingServers = scannedMcpServers.servers ?? {};
            for (const { name, config, inputs } of servers) {
                existingServers[name] = config;
                if (inputs) {
                    const existingInputIds = new Set(updatedInputs.map(input => input.id));
                    const newInputs = inputs.filter(input => !existingInputIds.has(input.id));
                    updatedInputs = [...updatedInputs, ...newInputs];
                }
            }
            return { servers: existingServers, inputs: updatedInputs };
        });
    }
    async removeMcpServers(serverNames, mcpResource, target) {
        await this.withProfileMcpServers(mcpResource, target, scannedMcpServers => {
            for (const serverName of serverNames) {
                if (scannedMcpServers.servers?.[serverName]) {
                    delete scannedMcpServers.servers[serverName];
                }
            }
            return scannedMcpServers;
        });
    }
    async withProfileMcpServers(mcpResource, target, updateFn) {
        return this.getResourceAccessQueue(mcpResource)
            .queue(async () => {
            target = target ?? 2 /* ConfigurationTarget.USER */;
            let scannedMcpServers = {};
            try {
                const content = await this.fileService.readFile(mcpResource);
                const errors = [];
                const result = parse(content.value.toString(), errors, { allowTrailingComma: true, allowEmptyContent: true }) || {};
                if (errors.length > 0) {
                    throw new Error('Failed to parse scanned MCP servers: ' + errors.join(', '));
                }
                if (target === 2 /* ConfigurationTarget.USER */) {
                    scannedMcpServers = this.fromUserMcpServers(result);
                }
                else if (target === 6 /* ConfigurationTarget.WORKSPACE_FOLDER */) {
                    scannedMcpServers = this.fromWorkspaceFolderMcpServers(result);
                }
                else if (target === 5 /* ConfigurationTarget.WORKSPACE */) {
                    const workspaceScannedMcpServers = result;
                    if (workspaceScannedMcpServers.settings?.mcp) {
                        scannedMcpServers = this.fromWorkspaceFolderMcpServers(workspaceScannedMcpServers.settings?.mcp);
                    }
                }
            }
            catch (error) {
                if (toFileOperationResult(error) !== 1 /* FileOperationResult.FILE_NOT_FOUND */) {
                    throw error;
                }
            }
            if (updateFn) {
                scannedMcpServers = updateFn(scannedMcpServers ?? {});
                if (target === 2 /* ConfigurationTarget.USER */) {
                    await this.writeScannedMcpServers(mcpResource, scannedMcpServers);
                }
                else if (target === 6 /* ConfigurationTarget.WORKSPACE_FOLDER */) {
                    await this.writeScannedMcpServersToWorkspaceFolder(mcpResource, scannedMcpServers);
                }
                else if (target === 5 /* ConfigurationTarget.WORKSPACE */) {
                    await this.writeScannedMcpServersToWorkspace(mcpResource, scannedMcpServers);
                }
                else {
                    assertNever(target, `Invalid Target: ${ConfigurationTargetToString(target)}`);
                }
            }
            return scannedMcpServers;
        });
    }
    async writeScannedMcpServers(mcpResource, scannedMcpServers) {
        if ((scannedMcpServers.servers && Object.keys(scannedMcpServers.servers).length > 0) || (scannedMcpServers.inputs && scannedMcpServers.inputs.length > 0)) {
            await this.fileService.writeFile(mcpResource, VSBuffer.fromString(JSON.stringify(scannedMcpServers, null, '\t')));
        }
        else {
            await this.fileService.del(mcpResource);
        }
    }
    async writeScannedMcpServersToWorkspaceFolder(mcpResource, scannedMcpServers) {
        await this.fileService.writeFile(mcpResource, VSBuffer.fromString(JSON.stringify(scannedMcpServers, null, '\t')));
    }
    async writeScannedMcpServersToWorkspace(mcpResource, scannedMcpServers) {
        let scannedWorkspaceMcpServers;
        try {
            const content = await this.fileService.readFile(mcpResource);
            const errors = [];
            scannedWorkspaceMcpServers = parse(content.value.toString(), errors, { allowTrailingComma: true, allowEmptyContent: true });
            if (errors.length > 0) {
                throw new Error('Failed to parse scanned MCP servers: ' + errors.join(', '));
            }
        }
        catch (error) {
            if (toFileOperationResult(error) !== 1 /* FileOperationResult.FILE_NOT_FOUND */) {
                throw error;
            }
            scannedWorkspaceMcpServers = { settings: {} };
        }
        if (!scannedWorkspaceMcpServers.settings) {
            scannedWorkspaceMcpServers.settings = {};
        }
        scannedWorkspaceMcpServers.settings.mcp = scannedMcpServers;
        await this.fileService.writeFile(mcpResource, VSBuffer.fromString(JSON.stringify(scannedWorkspaceMcpServers, null, '\t')));
    }
    fromUserMcpServers(scannedMcpServers) {
        const userMcpServers = {
            inputs: scannedMcpServers.inputs
        };
        const servers = Object.entries(scannedMcpServers.servers ?? {});
        if (servers.length > 0) {
            userMcpServers.servers = {};
            for (const [serverName, server] of servers) {
                userMcpServers.servers[serverName] = this.sanitizeServer(server);
            }
        }
        return userMcpServers;
    }
    fromWorkspaceFolderMcpServers(scannedWorkspaceFolderMcpServers) {
        const scannedMcpServers = {
            inputs: scannedWorkspaceFolderMcpServers.inputs
        };
        const servers = Object.entries(scannedWorkspaceFolderMcpServers.servers ?? {});
        if (servers.length > 0) {
            scannedMcpServers.servers = {};
            for (const [serverName, config] of servers) {
                scannedMcpServers.servers[serverName] = this.sanitizeServer(config);
            }
        }
        return scannedMcpServers;
    }
    sanitizeServer(serverOrConfig) {
        let server;
        if (serverOrConfig.config) {
            const oldScannedMcpServer = serverOrConfig;
            server = {
                ...oldScannedMcpServer.config,
                version: oldScannedMcpServer.version,
                gallery: oldScannedMcpServer.gallery
            };
        }
        else {
            server = serverOrConfig;
        }
        if (server.type === undefined || (server.type !== "http" /* McpServerType.REMOTE */ && server.type !== "stdio" /* McpServerType.LOCAL */)) {
            server.type = server.command ? "stdio" /* McpServerType.LOCAL */ : "http" /* McpServerType.REMOTE */;
        }
        return server;
    }
    getResourceAccessQueue(file) {
        let resourceQueue = this.resourcesAccessQueueMap.get(file);
        if (!resourceQueue) {
            resourceQueue = new Queue();
            this.resourcesAccessQueueMap.set(file, resourceQueue);
        }
        return resourceQueue;
    }
};
McpResourceScannerService = __decorate([
    __param(0, IFileService),
    __param(1, IUriIdentityService)
], McpResourceScannerService);
export { McpResourceScannerService };
registerSingleton(IMcpResourceScannerService, McpResourceScannerService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWNwUmVzb3VyY2VTY2FubmVyU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL2FkdmlrYXIvRG9jdW1lbnRzL2FyY2hpdGVjdC9hcmNoMi9BcmNoSURFL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL21jcC9jb21tb24vbWNwUmVzb3VyY2VTY2FubmVyU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDN0QsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBQ3RELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUUxRCxPQUFPLEVBQUUsS0FBSyxFQUFjLE1BQU0sOEJBQThCLENBQUM7QUFDakUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQy9ELE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUcxRCxPQUFPLEVBQXVCLDJCQUEyQixFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFDL0csT0FBTyxFQUF1QixZQUFZLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUN2RyxPQUFPLEVBQXFCLGlCQUFpQixFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDZDQUE2QyxDQUFDO0FBQzlFLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBeUI5RSxNQUFNLENBQUMsTUFBTSwwQkFBMEIsR0FBRyxlQUFlLENBQTZCLDRCQUE0QixDQUFDLENBQUM7QUFRN0csSUFBTSx5QkFBeUIsR0FBL0IsTUFBTSx5QkFBMEIsU0FBUSxVQUFVO0lBS3hELFlBQ2UsV0FBMEMsRUFDbkMsa0JBQTBEO1FBRS9FLEtBQUssRUFBRSxDQUFDO1FBSHVCLGdC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