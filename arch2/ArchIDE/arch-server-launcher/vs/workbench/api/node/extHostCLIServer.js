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
import { createRandomIPCHandle } from '../../../base/parts/ipc/node/ipc.net.js';
import * as http from 'http';
import * as fs from 'fs';
import { IExtHostCommands } from '../common/extHostCommands.js';
import { URI } from '../../../base/common/uri.js';
import { ILogService } from '../../../platform/log/common/log.js';
import { hasWorkspaceFileExtension } from '../../../platform/workspace/common/workspace.js';
export class CLIServerBase {
    constructor(_commands, logService, _ipcHandlePath) {
        this._commands = _commands;
        this.logService = logService;
        this._ipcHandlePath = _ipcHandlePath;
        this._server = http.createServer((req, res) => this.onRequest(req, res));
        this.setup().catch(err => {
            logService.error(err);
            return '';
        });
    }
    get ipcHandlePath() {
        return this._ipcHandlePath;
    }
    async setup() {
        try {
            this._server.listen(this.ipcHandlePath);
            this._server.on('error', err => this.logService.error(err));
        }
        catch (err) {
            this.logService.error('Could not start open from terminal server.');
        }
        return this._ipcHandlePath;
    }
    onRequest(req, res) {
        const sendResponse = (statusCode, returnObj) => {
            res.writeHead(statusCode, { 'content-type': 'application/json' });
            res.end(JSON.stringify(returnObj || null), (err) => err && this.logService.error(err)); // CodeQL [SM01524] Only the message portion of errors are passed in.
        };
        const chunks = [];
        req.setEncoding('utf8');
        req.on('data', (d) => chunks.push(d));
        req.on('end', async () => {
            try {
                const data = JSON.parse(chunks.join(''));
                let returnObj;
                switch (data.type) {
                    case 'open':
                        returnObj = await this.open(data);
                        break;
                    case 'openExternal':
                        returnObj = await this.openExternal(data);
                        break;
                    case 'status':
                        returnObj = await this.getStatus(data);
                        break;
                    case 'extensionManagement':
                        returnObj = await this.manageExtensions(data);
                        break;
                    default:
                        sendResponse(404, `Unknown message type: ${data.type}`);
                        break;
                }
                sendResponse(200, returnObj);
            }
            catch (e) {
                const message = e instanceof Error ? e.message : JSON.stringify(e);
                sendResponse(500, message);
                this.logService.error('Error while processing pipe request', e);
            }
        });
    }
    async open(data) {
        const { fileURIs, folderURIs, forceNewWindow, diffMode, mergeMode, addMode, removeMode, forceReuseWindow, gotoLineMode, waitMarkerFilePath, remoteAuthority } = data;
        const urisToOpen = [];
        if (Array.isArray(folderURIs)) {
            for (const s of folderURIs) {
                try {
                    urisToOpen.push({ folderUri: URI.parse(s) });
                }
                catch (e) {
                    // ignore
                }
            }
        }
        if (Array.isArray(fileURIs)) {
            for (const s of fileURIs) {
                try {
                    if (hasWorkspaceFileExtension(s)) {
                        urisToOpen.push({ workspaceUri: URI.parse(s) });
                    }
                    else {
                        urisToOpen.push({ fileUri: URI.parse(s) });
                    }
                }
                catch (e) {
                    // ignore
                }
            }
        }
        const waitMarkerFileURI = waitMarkerFilePath ? URI.file(waitMarkerFilePath) : undefined;
        const preferNewWindow = !forceReuseWindow && !waitMarkerFileURI && !addMode && !removeMode;
        const windowOpenArgs = { forceNewWindow, diffMode, mergeMode, addMode, removeMode, gotoLineMode, forceReuseWindow, preferNewWindow, waitMarkerFileURI, remoteAuthority };
        this._commands.executeCommand('_remoteCLI.windowOpen', urisToOpen, windowOpenArgs);
    }
    async openExternal(data) {
        for (const uriString of data.uris) {
            const uri = URI.parse(uriString);
            const urioOpen = uri.scheme === 'file' ? uri : uriString; // workaround for #112577
            await this._commands.executeCommand('_remoteCLI.openExternal', urioOpen);
        }
    }
    async manageExtensions(data) {
        const toExtOrVSIX = (inputs) => inputs?.map(input => /\.vsix$/i.test(input) ? URI.parse(input) : input);
        const commandArgs = {
            list: data.list,
            install: toExtOrVSIX(data.install),
            uninstall: toExtOrVSIX(data.uninstall),
            force: data.force
        };
        return await this._commands.executeCommand('_remoteCLI.manageExtensions', commandArgs);
    }
    async getStatus(data) {
        return await this._commands.executeCommand('_remoteCLI.getSystemStatus');
    }
    dispose() {
        this._server.close();
        if (this._ipcHandlePath && process.platform !== 'win32' && fs.existsSync(this._ipcHandlePath)) {
            fs.unlinkSync(this._ipcHandlePath);
        }
    }
}
let CLIServer = class CLIServer extends CLIServerBase {
    constructor(commands, logService) {
        super(commands, logService, createRandomIPCHandle());
    }
};
CLIServer = __decorate([
    __param(0, IExtHostCommands),
    __param(1, ILogService)
], CLIServer);
export { CLIServer };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdENMSVNlcnZlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL2FkdmlrYXIvRG9jdW1lbnRzL2FyY2hpdGVjdC9hcmNoMi9BcmNoSURFL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvbm9kZS9leHRIb3N0Q0xJU2VydmVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ2hGLE9BQU8sS0FBSyxJQUFJLE1BQU0sTUFBTSxDQUFDO0FBQzdCLE9BQU8sS0FBSyxFQUFFLE1BQU0sSUFBSSxDQUFDO0FBQ3pCLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBRWhFLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUNsRCxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDbEUsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0saURBQWlELENBQUM7QUF3QzVGLE1BQU0sT0FBTyxhQUFhO0lBR3pCLFlBQ2tCLFNBQTRCLEVBQzVCLFVBQXVCLEVBQ3ZCLGNBQXNCO1FBRnRCLGNBQVMsR0FBVCxTQUFTLENBQW1CO1FBQzVCLGVBQVUsR0FBVixVQUFVLENBQWE7UUFDdkIsbUJBQWMsR0FBZCxjQUFjLENBQVE7UUFFdkMsSUFBSSxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQztRQUN6RSxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxFQUFFO1lBQ3hCLFVBQVUsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDdEIsT0FBTyxFQUFF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