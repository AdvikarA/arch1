/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { MarkdownString } from '../../../../base/common/htmlContent.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { localize } from '../../../../nls.js';
import { SyncDescriptor } from '../../../../platform/instantiation/common/descriptors.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { mcpSchemaId } from '../../../services/configuration/common/configuration.js';
import { inputsSchema } from '../../../services/configurationResolver/common/configurationResolverSchema.js';
import { Extensions } from '../../../services/extensionManagement/common/extensionFeatures.js';
const mcpActivationEventPrefix = 'onMcpCollection:';
/**
 * note: `contributedCollectionId` is _not_ the collection ID. The collection
 * ID is formed by passing the contributed ID through `extensionPrefixedIdentifier`
 */
export const mcpActivationEvent = (contributedCollectionId) => mcpActivationEventPrefix + contributedCollectionId;
export var DiscoverySource;
(function (DiscoverySource) {
    DiscoverySource["ClaudeDesktop"] = "claude-desktop";
    DiscoverySource["Windsurf"] = "windsurf";
    DiscoverySource["CursorGlobal"] = "cursor-global";
    DiscoverySource["CursorWorkspace"] = "cursor-workspace";
})(DiscoverySource || (DiscoverySource = {}));
export const allDiscoverySources = Object.keys({
    ["claude-desktop" /* DiscoverySource.ClaudeDesktop */]: true,
    ["windsurf" /* DiscoverySource.Windsurf */]: true,
    ["cursor-global" /* DiscoverySource.CursorGlobal */]: true,
    ["cursor-workspace" /* DiscoverySource.CursorWorkspace */]: true,
});
export const discoverySourceLabel = {
    ["claude-desktop" /* DiscoverySource.ClaudeDesktop */]: localize('mcp.discovery.source.claude-desktop', "Claude Desktop"),
    ["windsurf" /* DiscoverySource.Windsurf */]: localize('mcp.discovery.source.windsurf', "Windsurf"),
    ["cursor-global" /* DiscoverySource.CursorGlobal */]: localize('mcp.discovery.source.cursor-global', "Cursor (Global)"),
    ["cursor-workspace" /* DiscoverySource.CursorWorkspace */]: localize('mcp.discovery.source.cursor-workspace', "Cursor (Workspace)"),
};
export const mcpConfigurationSection = 'mcp';
export const mcpDiscoverySection = 'chat.mcp.discovery.enabled';
export const mcpServerSamplingSection = 'chat.mcp.serverSampling';
export const mcpSchemaExampleServers = {
    'mcp-server-time': {
        command: 'python',
        args: ['-m', 'mcp_server_time', '--local-timezone=America/Los_Angeles'],
        env: {},
    }
};
const httpSchemaExamples = {
    'my-mcp-server': {
        url: 'http://localhost:3001/mcp',
        headers: {},
    }
};
const mcpDevModeProps = (stdio) => ({
    dev: {
        type: 'object',
        markdownDescription: localize('app.mcp.dev', 'Enabled development mode for the server. When present, the server will be started eagerly and output will be included in its output. Properties inside the `dev` object can configure additional behavior.'),
        examples: [{ watch: 'src/**/*.ts', debug: { type: 'node' } }],
        properties: {
            watch: {
                description: localize('app.mcp.dev.watch', 'A glob pattern or list of glob patterns relative to the workspace folder to watch. The MCP server will be restarted when these files change.'),
                examples: ['src/**/*.ts'],
                oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }],
            },
            ...(stdio && {
                debug: {
                    markdownDescription: localize('app.mcp.dev.debug', 'If set, debugs the MCP server using the given runtime as it\'s started.'),
                    oneOf: [
                        {
                            type: 'object',
                            required: ['type'],
                            properties: {
                                type: {
                                    type: 'string',
                                    enum: ['node'],
                                    description: localize('app.mcp.dev.debug.type.node', "Debug the MCP server using Node.js.")
                                }
                            },
                            additionalProperties: false
                        },
                        {
                            type: 'object',
                            required: ['type'],
                            properties: {
                                type: {
                                    type: 'string',
                                    enum: ['debugpy'],
                                    description: localize('app.mcp.dev.debug.type.python', "Debug the MCP server using Python and debugpy.")
                                },
                                debugpyPath: {
                                    type: 'string',
                                    description: localize('app.mcp.dev.debug.debugpyPath', "Path to the debugpy executable.")
                                },
                            },
                            additionalProperties: false
                        }
                    ]
                }
            })
        }
    }
});
export const mcpStdioServerSchema = {
    type: 'object',
    additionalProperties: false,
    examples: [mcpSchemaExampleServers['mcp-server-time']],
    properties: {
        type: {
            type: 'string',
            enum: ['stdio'],
            description: localize('app.mcp.json.type', "The type of the server.")
        },
        command: {
            type: 'string',
            description: localize('app.mcp.json.command', "The command to run the server.")
        },
        cwd: {
            type: 'string',
            description: localize('app.mcp.json.cwd', "The working directory for the server command. Defaults to the workspace folder when run in a workspace."),
            examples: ['${workspaceFolder}'],
        },
        args: {
            type: 'array',
            description: localize('app.mcp.args.command', "Arguments passed to the server."),
            items: {
                type: 'string'
            },
        },
        envFile: {
            type: 'string',
            description: localize('app.mcp.envFile.command', "Path to a file containing environment variables for the server."),
            examples: ['${workspaceFolder}/.env'],
        },
        env: {
            description: localize('app.mcp.env.command', "Environment variables passed to the server."),
            additionalProperties: {
                anyOf: [
                    { type: 'null' },
                    { type: 'string' },
                    { type: 'number' },
                ]
            }
        },
        ...mcpDevModeProps(true),
    }
};
export const mcpServerSchema = {
    id: mcpSchemaId,
    type: 'object',
    title: localize('app.mcp.json.title', "Model Context Protocol Servers"),
    allowTrailingCommas: true,
    allowComments: true,
    additionalProperties: false,
    properties: {
        servers: {
            examples: [
                mcpSchemaExampleServers,
                httpSchemaExamples,
            ],
            additionalProperties: {
                oneOf: [
                    mcpStdioServerSchema, {
                        type: 'object',
                        additionalProperties: false,
                        required: ['url'],
                        examples: [httpSchemaExamples['my-mcp-server']],
                        properties: {
                            type: {
                                type: 'string',
                                enum: ['http', 'sse'],
                                description: localize('app.mcp.json.type', "The type of the server.")
                            },
                            url: {
                                type: 'string',
                                format: 'uri',
                                pattern: '^https?:\\/\\/.+',
                                patternErrorMessage: localize('app.mcp.json.url.pattern', "The URL must start with 'http://' or 'https://'."),
                                description: localize('app.mcp.json.url', "The URL of the Streamable HTTP or SSE endpoint.")
                            },
                            headers: {
                                type: 'object',
                                description: localize('app.mcp.json.headers', "Additional headers sent to the server."),
                                additionalProperties: { type: 'string' },
                            },
                            ...mcpDevModeProps(false),
                        }
                    },
                ]
            }
        },
        inputs: inputsSchema.definitions.inputs
    }
};
export const mcpContributionPoint = {
    extensionPoint: 'mcpServerDefinitionProviders',
    activationEventsGenerator(contribs, result) {
        for (const contrib of contribs) {
            if (contrib.id) {
                result.push(mcpActivationEvent(contrib.id));
            }
        }
    },
    jsonSchema: {
        description: localize('vscode.extension.contributes.mcp', 'Contributes Model Context Protocol servers. Users of this should also use `vscode.lm.registerMcpServerDefinitionProvider`.'),
        type: 'array',
        defaultSnippets: [{ body: [{ id: '', label: '' }] }],
        items: {
            additionalProperties: false,
            type: 'object',
            defaultSnippets: [{ body: { id: '', label: '' } }],
            properties: {
                id: {
                    description: localize('vscode.extension.contributes.mcp.id', "Unique ID for the collection."),
                    type: 'string'
                },
                label: {
                    description: localize('vscode.extension.contributes.mcp.label', "Display name for the collection."),
                    type: 'string'
                }
            }
        }
    }
};
class McpServerDefinitionsProviderRenderer extends Disposable {
    constructor() {
        super(...arguments);
        this.type = 'table';
    }
    shouldRender(manifest) {
        return !!manifest.contributes?.mcpServerDefinitionProviders && Array.isArray(manifest.contributes.mcpServerDefinitionProviders) && manifest.contributes.mcpServerDefinitionProviders.length > 0;
    }
    render(manifest) {
        const mcpServerDefinitionProviders = manifest.contributes?.mcpServerDefinitionProviders ?? [];
        const headers = [localize('id', "ID"), localize('name', "Name")];
        const rows = mcpServerDefinitionProviders
            .map(mcpServerDefinitionProvider => {
            return [
                new MarkdownString().appendMarkdown(`\`${mcpServerDefinitionProvider.id}\``),
                mcpServerDefinitionProvider.label
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
Registry.as(Extensions.ExtensionFeaturesRegistry).registerExtensionFeature({
    id: mcpConfigurationSection,
    label: localize('mcpServerDefinitionProviders', "MCP Servers"),
    access: {
        canToggle: false
    },
    renderer: new SyncDescriptor(McpServerDefinitionsProviderRenderer),
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWNwQ29uZmlndXJhdGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL2FkdmlrYXIvRG9jdW1lbnRzL2FyY2hpdGVjdC9hcmNoMi9BcmNoSURFL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL21jcC9jb21tb24vbWNwQ29uZmlndXJhdGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFFeEUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUU5QyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sMERBQTBELENBQUM7QUFDMUYsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQzVFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUN0RixPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sK0VBQStFLENBQUM7QUFDN0csT0FBTyxFQUFFLFVBQVUsRUFBbUcsTUFBTSxtRUFBbUUsQ0FBQztBQUdoTSxNQUFNLHdCQUF3QixHQUFHLGtCQUFrQixDQUFDO0FBRXBEOzs7R0FHRztBQUNILE1BQU0sQ0FBQyxNQUFNLGtCQUFrQixHQUFHLENBQUMsdUJBQStCLEVBQUUsRUFBRSxDQUNyRSx3QkFBd0IsR0FBRyx1QkFBdUIsQ0FBQztBQUVwRCxNQUFNLENBQU4sSUFBa0IsZUFLakI7QUFMRCxXQUFrQixlQUFlO0lBQ2hDLG1EQUFnQyxDQUFBO0lBQ2hDLHdDQUFxQixDQUFBO0lBQ3JCLGlEQUE4QixDQUFBO0lBQzlCLHVEQUFvQyxDQUFBO0FBQ3JDLENBQUMsRUFMaUIsZUFBZSxLQUFmLGVBQWUsUUFLaEM7QUFFRCxNQUFNLENBQUMsTUFBTSxtQkFBbUIsR0FBRyxNQUFNLENBQUMsSUFBSSxD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