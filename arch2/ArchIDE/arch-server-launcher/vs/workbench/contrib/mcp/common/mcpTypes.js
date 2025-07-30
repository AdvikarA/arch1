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
import { equals as arraysEqual } from '../../../../base/common/arrays.js';
import { assertNever } from '../../../../base/common/assert.js';
import { decodeHex, encodeHex, VSBuffer } from '../../../../base/common/buffer.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { equals as objectsEqual } from '../../../../base/common/objects.js';
import { ObservableMap } from '../../../../base/common/observable.js';
import { URI } from '../../../../base/common/uri.js';
import { localize } from '../../../../nls.js';
import { RawContextKey } from '../../../../platform/contextkey/common/contextkey.js';
import { ExtensionIdentifier } from '../../../../platform/extensions/common/extensions.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { MCP } from './modelContextProtocol.js';
export const extensionMcpCollectionPrefix = 'ext.';
export function extensionPrefixedIdentifier(identifier, id) {
    return ExtensionIdentifier.toKey(identifier) + '/' + id;
}
export var McpCollectionSortOrder;
(function (McpCollectionSortOrder) {
    McpCollectionSortOrder[McpCollectionSortOrder["WorkspaceFolder"] = 0] = "WorkspaceFolder";
    McpCollectionSortOrder[McpCollectionSortOrder["Workspace"] = 100] = "Workspace";
    McpCollectionSortOrder[McpCollectionSortOrder["User"] = 200] = "User";
    McpCollectionSortOrder[McpCollectionSortOrder["Extension"] = 300] = "Extension";
    McpCollectionSortOrder[McpCollectionSortOrder["Filesystem"] = 400] = "Filesystem";
    McpCollectionSortOrder[McpCollectionSortOrder["RemoteBoost"] = -50] = "RemoteBoost";
})(McpCollectionSortOrder || (McpCollectionSortOrder = {}));
export var McpCollectionDefinition;
(function (McpCollectionDefinition) {
    function equals(a, b) {
        return a.id === b.id
            && a.remoteAuthority === b.remoteAuthority
            && a.label === b.label
            && a.trustBehavior === b.trustBehavior;
    }
    McpCollectionDefinition.equals = equals;
})(McpCollectionDefinition || (McpCollectionDefinition = {}));
export var McpServerDefinition;
(function (McpServerDefinition) {
    function toSerialized(def) {
        return def;
    }
    McpServerDefinition.toSerialized = toSerialized;
    function fromSerialized(def) {
        return {
            id: def.id,
            label: def.label,
            cacheNonce: def.cacheNonce,
            launch: McpServerLaunch.fromSerialized(def.launch),
            variableReplacement: def.variableReplacement ? McpServerDefinitionVariableReplacement.fromSerialized(def.variableReplacement) : undefined,
        };
    }
    McpServerDefinition.fromSerialized = fromSerialized;
    function equals(a, b) {
        return a.id === b.id
            && a.label === b.label
            && arraysEqual(a.roots, b.roots, (a, b) => a.toString() === b.toString())
            && objectsEqual(a.launch, b.launch)
            && objectsEqual(a.presentation, b.presentation)
            && objectsEqual(a.variableReplacement, b.variableReplacement)
            && objectsEqual(a.devMode, b.devMode);
    }
    McpServerDefinition.equals = equals;
})(McpServerDefinition || (McpServerDefinition = {}));
export var McpServerDefinitionVariableReplacement;
(function (McpServerDefinitionVariableReplacement) {
    function toSerialized(def) {
        return def;
    }
    McpServerDefinitionVariableReplacement.toSerialized = toSerialized;
    function fromSerialized(def) {
        return {
            section: def.section,
            folder: def.folder ? { ...def.folder, uri: URI.revive(def.folder.uri) } : undefined,
            target: def.target,
        };
    }
    McpServerDefinitionVariableReplacement.fromSerialized = fromSerialized;
})(McpServerDefinitionVariableReplacement || (McpServerDefinitionVariableReplacement = {}));
export var LazyCollectionState;
(function (LazyCollectionState) {
    LazyCollectionState[LazyCollectionState["HasUnknown"] = 0] = "HasUnknown";
    LazyCollectionState[LazyCollectionState["LoadingUnknown"] = 1] = "LoadingUnknown";
    LazyCollectionState[LazyCollectionState["AllKnown"] = 2] = "AllKnown";
})(LazyCollectionState || (LazyCollectionState = {}));
export const IMcpService = createDecorator('IMcpService');
export class McpStartServerInteraction {
    constructor() {
        /** @internal */
        this.participants = new ObservableMap();
    }
}
export var McpServerTrust;
(function (McpServerTrust) {
    let Kind;
    (function (Kind) {
        /** The server is trusted */
        Kind[Kind["Trusted"] = 0] = "Trusted";
        /** The server is trusted as long as its nonce matches */
        Kind[Kind["TrustedOnNonce"] = 1] = "TrustedOnNonce";
        /** The server trust was denied. */
        Kind[Kind["Untrusted"] = 2] = "Untrusted";
        /** The server is not yet trusted or untrusted. */
        Kind[Kind["Unknown"] = 3] = "Unknown";
    })(Kind = McpServerTrust.Kind || (McpServerTrust.Kind = {}));
})(McpServerTrust || (McpServerTrust = {}));
export const isMcpResourceTemplate = (obj) => {
    return obj.template !== undefined;
};
export const isMcpResource = (obj) => {
    return obj.mcpUri !== undefined;
};
export var McpServerCacheState;
(function (McpServerCacheState) {
    /** Tools have not been read before */
    McpServerCacheState[McpServerCacheState["Unknown"] = 0] = "Unknown";
    /** Tools were read from the cache */
    McpServerCacheState[McpServerCacheState["Cached"] = 1] = "Cached";
    /** Tools were read from the cache or live, but they may be outdated. */
    McpServerCacheState[McpServerCacheState["Outdated"] = 2] = "Outdated";
    /** Tools are refreshing for the first time */
    McpServerCacheState[McpServerCacheState["RefreshingFromUnknown"] = 3] = "RefreshingFromUnknown";
    /** Tools are refreshing and the current tools are cached */
    McpServerCacheState[McpServerCacheState["RefreshingFromCached"] = 4] = "RefreshingFromCached";
    /** Tool state is live, server is connected */
    McpServerCacheState[McpServerCacheState["Live"] = 5] = "Live";
})(McpServerCacheState || (McpServerCacheState = {}));
export const mcpPromptReplaceSpecialChars = (s) => s.replace(/[^a-z0-9_.-]/gi, '_');
export const mcpPromptPrefix = (definition) => `/mcp.` + mcpPromptReplaceSpecialChars(definition.label);
export var McpServerTransportType;
(function (McpServerTransportType) {
    /** A command-line MCP server communicating over standard in/out */
    McpServerTransportType[McpServerTransportType["Stdio"] = 1] = "Stdio";
    /** An MCP server that uses Server-Sent Events */
    McpServerTransportType[McpServerTransportType["HTTP"] = 2] = "HTTP";
})(McpServerTransportType || (McpServerTransportType = {}));
export var McpServerLaunch;
(function (McpServerLaunch) {
    function toSerialized(launch) {
        return launch;
    }
    McpServerLaunch.toSerialized = toSerialized;
    function fromSerialized(launch) {
        switch (launch.type) {
            case 2 /* McpServerTransportType.HTTP */:
                return { type: launch.type, uri: URI.revive(launch.uri), headers: launch.headers };
            case 1 /* McpServerTransportType.Stdio */:
                return {
                    type: launch.type,
                    cwd: launch.cwd,
                    command: launch.command,
                    args: launch.args,
                    env: launch.env,
                    envFile: launch.envFile,
                };
        }
    }
    McpServerLaunch.fromSerialized = fromSerialized;
    async function hash(launch) {
        const nonce = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(launch)));
        return encodeHex(VSBuffer.wrap(new Uint8Array(nonce)));
    }
    McpServerLaunch.hash = hash;
})(McpServerLaunch || (McpServerLaunch = {}));
/**
 * McpConnectionState is the state of the underlying connection and is
 * communicated e.g. from the extension host to the renderer.
 */
export var McpConnectionState;
(function (McpConnectionState) {
    let Kind;
    (function (Kind) {
        Kind[Kind["Stopped"] = 0] = "Stopped";
        Kind[Kind["Starting"] = 1] = "Starting";
        Kind[Kind["Running"] = 2] = "Running";
        Kind[Kind["Error"] = 3] = "Error";
    })(Kind = McpConnectionState.Kind || (McpConnectionState.Kind = {}));
    McpConnectionState.toString = (s) => {
        switch (s.state) {
            case 0 /* Kind.Stopped */:
                return localize('mcpstate.stopped', 'Stopped');
            case 1 /* Kind.Starting */:
                return localize('mcpstate.starting', 'Starting');
            case 2 /* Kind.Running */:
                return localize('mcpstate.running', 'Running');
            case 3 /* Kind.Error */:
                return localize('mcpstate.error', 'Error {0}', s.message);
            default:
                assertNever(s);
        }
    };
    McpConnectionState.toKindString = (s) => {
        switch (s) {
            case 0 /* Kind.Stopped */:
                return 'stopped';
            case 1 /* Kind.Starting */:
                return 'starting';
            case 2 /* Kind.Running */:
                return 'running';
            case 3 /* Kind.Error */:
                return 'error';
            default:
                assertNever(s);
        }
    };
    /** Returns if the MCP state is one where starting a new server is valid */
    McpConnectionState.canBeStarted = (s) => s === 3 /* Kind.Error */ || s === 0 /* Kind.Stopped */;
    /** Gets whether the state is a running state. */
    McpConnectionState.isRunning = (s) => !McpConnectionState.canBeStarted(s.state);
})(McpConnectionState || (McpConnectionState = {}));
export class MpcResponseError extends Error {
    constructor(message, code, data) {
        super(`MPC ${code}: ${message}`);
        this.code = code;
        this.data = data;
    }
}
export class McpConnectionFailedError extends Error {
}
export var McpServerInstallState;
(function (McpServerInstallState) {
    McpServerInstallState[McpServerInstallState["Installing"] = 0] = "Installing";
    McpServerInstallState[McpServerInstallState["Installed"] = 1] = "Installed";
    McpServerInstallState[McpServerInstallState["Uninstalling"] = 2] = "Uninstalling";
    McpServerInstallState[McpServerInstallState["Uninstalled"] = 3] = "Uninstalled";
})(McpServerInstallState || (McpServerInstallState = {}));
export var McpServerEditorTab;
(function (McpServerEditorTab) {
    McpServerEditorTab["Readme"] = "readme";
    McpServerEditorTab["Manifest"] = "manifest";
    McpServerEditorTab["Configuration"] = "configuration";
})(McpServerEditorTab || (McpServerEditorTab = {}));
export const IMcpWorkbenchService = createDecorator('IMcpWorkbenchService');
let McpServerContainers = class McpServerContainers extends Disposable {
    constructor(containers, mcpWorkbenchService) {
        super();
        this.containers = containers;
        this._register(mcpWorkbenchService.onChange(this.update, this));
    }
    set mcpServer(extension) {
        this.containers.forEach(c => c.mcpServer = extension);
    }
    update(server) {
        for (const container of this.containers) {
            if (server && container.mcpServer) {
                if (server.id === container.mcpServer.id) {
                    container.mcpServer = server;
                }
            }
            else {
                container.update();
            }
        }
    }
};
McpServerContainers = __decorate([
    __param(1, IMcpWorkbenchService)
], McpServerContainers);
export { McpServerContainers };
export const McpServersGalleryEnabledContext = new RawContextKey('mcpServersGalleryEnabled', false);
export const HasInstalledMcpServersContext = new RawContextKey('hasInstalledMcpServers', true);
export const InstalledMcpServersViewId = 'workbench.views.mcp.installed';
export var McpResourceURI;
(function (McpResourceURI) {
    McpResourceURI.scheme = 'mcp-resource';
    // Random placeholder for empty authorities, otherwise they're represente as
    // `scheme//path/here` in the URI which would get normalized to `scheme/path/here`.
    const emptyAuthorityPlaceholder = 'dylo78gyp'; // chosen by a fair dice roll. Guaranteed to be random.
    function fromServer(def, resourceURI) {
        if (typeof resourceURI === 'string') {
            resourceURI = URI.parse(resourceURI);
        }
        return resourceURI.with({
            scheme: McpResourceURI.scheme,
            authority: encodeHex(VSBuffer.fromString(def.id)),
            path: ['', resourceURI.scheme, resourceURI.authority || emptyAuthorityPlaceholder].join('/') + resourceURI.path,
        });
    }
    McpResourceURI.fromServer = fromServer;
    function toServer(uri) {
        if (typeof uri === 'string') {
            uri = URI.parse(uri);
        }
        if (uri.scheme !== McpResourceURI.scheme) {
            throw new Error(`Invalid MCP resource URI: ${uri.toString()}`);
        }
        const parts = uri.path.split('/');
        if (parts.length < 3) {
            throw new Error(`Invalid MCP resource URI: ${uri.toString()}`);
        }
        const [, serverScheme, authority, ...path] = parts;
        // URI cannot correctly stringify empty authorities (#250905) so we use URL instead to construct
        const url = new URL(`${serverScheme}://${authority.toLowerCase() === emptyAuthorityPlaceholder ? '' : authority}`);
        url.pathname = path.length ? ('/' + path.join('/')) : '';
        url.search = uri.query;
        url.hash = uri.fragment;
        return {
            definitionId: decodeHex(uri.authority).toString(),
            resourceURL: url,
        };
    }
    McpResourceURI.toServer = toServer;
})(McpResourceURI || (McpResourceURI = {}));
/** Warning: this enum is cached in `mcpServer.ts` and all changes MUST only be additive. */
export var McpCapability;
(function (McpCapability) {
    McpCapability[McpCapability["Logging"] = 1] = "Logging";
    McpCapability[McpCapability["Completions"] = 2] = "Completions";
    McpCapability[McpCapability["Prompts"] = 4] = "Prompts";
    McpCapability[McpCapability["PromptsListChanged"] = 8] = "PromptsListChanged";
    McpCapability[McpCapability["Resources"] = 16] = "Resources";
    McpCapability[McpCapability["ResourcesSubscribe"] = 32] = "ResourcesSubscribe";
    McpCapability[McpCapability["ResourcesListChanged"] = 64] = "ResourcesListChanged";
    McpCapability[McpCapability["Tools"] = 128] = "Tools";
    McpCapability[McpCapability["ToolsListChanged"] = 256] = "ToolsListChanged";
})(McpCapability || (McpCapability = {}));
export const IMcpSamplingService = createDecorator('IMcpServerSampling');
export class McpError extends Error {
    static methodNotFound(method) {
        return new McpError(MCP.METHOD_NOT_FOUND, `Method not found: ${method}`);
    }
    static notAllowed() {
        return new McpError(-32000, 'The user has denied permission to call this method.');
    }
    static unknown(e) {
        const mcpError = new McpError(MCP.INTERNAL_ERROR, `Unknown error: ${e.stack}`);
        mcpError.cause = e;
        return mcpError;
    }
    constructor(code, message, data) {
        super(message);
        this.code = code;
        this.data = data;
    }
}
export var McpToolName;
(function (McpToolName) {
    McpToolName["Prefix"] = "mcp_";
    McpToolName[McpToolName["MaxPrefixLen"] = 18] = "MaxPrefixLen";
    McpToolName[McpToolName["MaxLength"] = 64] = "MaxLength";
})(McpToolName || (McpToolName = {}));
export const IMcpElicitationService = createDecorator('IMcpElicitationService');
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWNwVHlwZXMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9hZHZpa2FyL0RvY3VtZW50cy9hcmNoaXRlY3QvYXJjaDIvQXJjaElERS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9tY3AvY29tbW9uL21jcFR5cGVzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxNQUFNLElBQUksV0FBVyxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDMUUsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ2hFLE9BQU8sRUFBRSxTQUFTLEVBQUUsU0FBUyxFQUFFLFFBQVEsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBSW5GLE9BQU8sRUFBRSxVQUFVLEVBQWUsTUFBTSxzQ0FBc0MsQ0FBQztBQUMvRSxPQUFPLEVBQUUsTUFBTSxJQUFJLFlBQVksRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQzVFLE9BQU8sRUFBZSxhQUFhLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUNuRixPQUFPLEVBQUUsR0FBRyxFQUFpQixNQUFNLGdDQUFnQyxDQUFDO0FBRXBFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUU5QyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFFckYsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sc0RBQXNELENBQUM7QUFDM0YsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBUzdGLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQztBQUdoRCxNQUFNLENBQUMsTUFBTSw0QkFBNEIsR0FBRyxNQUFNLENBQUM7QUFFbkQsTUFBTSxVQUFVLDJCQUEyQixDQUFDLFVBQStCLEVBQUUsRUFBVTtJQUN0RixPQUFPLG1CQUFtQixDQUFDLEtBQUssQ0FBQyxVQUFVLENB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