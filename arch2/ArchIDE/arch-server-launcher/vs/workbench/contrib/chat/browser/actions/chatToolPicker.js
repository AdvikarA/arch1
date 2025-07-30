/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { assertNever } from '../../../../../base/common/assert.js';
import { Codicon } from '../../../../../base/common/codicons.js';
import { diffSets } from '../../../../../base/common/collections.js';
import { Event } from '../../../../../base/common/event.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { ThemeIcon } from '../../../../../base/common/themables.js';
import { assertType } from '../../../../../base/common/types.js';
import { generateUuid } from '../../../../../base/common/uuid.js';
import { localize } from '../../../../../nls.js';
import { ICommandService } from '../../../../../platform/commands/common/commands.js';
import { ExtensionIdentifier } from '../../../../../platform/extensions/common/extensions.js';
import { IQuickInputService } from '../../../../../platform/quickinput/common/quickInput.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { IEditorService } from '../../../../services/editor/common/editorService.js';
import { IExtensionsWorkbenchService } from '../../../extensions/common/extensions.js';
import { IMcpRegistry } from '../../../mcp/common/mcpRegistryTypes.js';
import { IMcpService, IMcpWorkbenchService } from '../../../mcp/common/mcpTypes.js';
import { ILanguageModelToolsService, ToolDataSource, ToolSet } from '../../common/languageModelToolsService.js';
import { ConfigureToolSets } from '../tools/toolSetsContribution.js';
/**
 * Chat Tools Picker - Dual Implementation
 *
 * This module provides a tools picker for the chat interface with two implementations:
 * 1. Legacy QuickPick implementation (showToolsPickerLegacy) - the original flat list approach
 * 2. New QuickTree implementation (showToolsPickerTree) - hierarchical tree approach
 *
 * The implementation is controlled by the workspace setting 'chat.tools.useTreePicker':
 * - false (default): Uses the legacy QuickPick implementation for backward compatibility
 * - true: Uses the new QuickTree implementation for improved UX with hierarchical structure
 *
 * Key differences between implementations:
 * - QuickPick: Flat list with indentation to show hierarchy
 * - QuickTree: True hierarchical tree with collapsible nodes and checkboxes
 *
 * MCP Server Special Case: MCP servers are represented differently in the tree:
 * - MCP Server appears as a bucket (parent node)
 * - Tools appear as direct children of the server bucket
 * - The MCP ToolSet is stored in bucket.toolset but not shown as separate tree node
 *
 * Both implementations maintain the same external API and return the same result format:
 * Map<IToolData | ToolSet, boolean> representing selected tools and toolsets.
 */
var BucketOrdinal;
(function (BucketOrdinal) {
    BucketOrdinal[BucketOrdinal["User"] = 0] = "User";
    BucketOrdinal[BucketOrdinal["BuiltIn"] = 1] = "BuiltIn";
    BucketOrdinal[BucketOrdinal["Mcp"] = 2] = "Mcp";
    BucketOrdinal[BucketOrdinal["Extension"] = 3] = "Extension";
})(BucketOrdinal || (BucketOrdinal = {}));
// Type guards for legacy QuickPick types
function isBucketPick(obj) {
    return Boolean(obj.children);
}
function isToolSetPick(obj) {
    return Boolean(obj.toolset);
}
function isToolPick(obj) {
    return Boolean(obj.tool);
}
function isCallbackPick(obj) {
    return Boolean(obj.run);
}
function isActionableButton(obj) {
    return typeof obj.action === 'function';
}
// Type guards for new QuickTree types
function isBucketTreeItem(item) {
    return item.itemType === 'bucket';
}
function isToolSetTreeItem(item) {
    return item.itemType === 'toolset';
}
function isToolTreeItem(item) {
    return item.itemType === 'tool';
}
function isCallbackTreeItem(item) {
    return item.itemType === 'callback';
}
/**
 * Maps different icon types (ThemeIcon or URI-based) to QuickTreeItem icon properties.
 * Handles the conversion between ToolSet/IToolData icon formats and tree item requirements.
 * Provides a default tool icon when no icon is specified.
 *
 * @param icon - Icon to map (ThemeIcon, URI object, or undefined)
 * @param useDefaultToolIcon - Whether to use a default tool icon when none is provided
 * @returns Object with iconClass (for ThemeIcon) or iconPath (for URIs) properties
 */
function mapIconToTreeItem(icon, useDefaultToolIcon = false) {
    if (!icon) {
        if (useDefaultToolIcon) {
            return { iconClass: ThemeIcon.asClassName(Codicon.tools) };
        }
        return {};
    }
    if (ThemeIcon.isThemeIcon(icon)) {
        return { iconClass: ThemeIcon.asClassName(icon) };
    }
    else {
        return { iconPath: icon };
    }
}
function createToolTreeItemFromData(tool, checked) {
    const iconProps = mapIconToTreeItem(tool.icon, true); // Use default tool icon if none provided
    return {
        itemType: 'tool',
        tool,
        id: tool.id,
        label: tool.toolReferenceName ?? tool.displayName,
        description: tool.userDescription ?? tool.modelDescription,
        checked,
        ...iconProps
    };
}
/**
 * New QuickTree implementation of the tools picker.
 * Uses IQuickTree to provide a true hierarchical tree structure with:
 * - Collapsible nodes for buckets and toolsets
 * - Checkbox state management with parent-child relationships
 * - Special handling for MCP servers (server as bucket, tools as direct children)
 * - Built-in filtering and search capabilities
 *
 * This implementation provides improved UX over the legacy flat list approach.
 */
async function showToolsPickerTree(accessor, placeHolder, description, toolsEntries, onUpdate) {
    const quickPickService = accessor.get(IQuickInputService);
    const mcpService = accessor.get(IMcpService);
    const mcpRegistry = accessor.get(IMcpRegistry);
    const commandService = accessor.get(ICommandService);
    const extensionsWorkbenchService = accessor.get(IExtensionsWorkbenchService);
    const editorService = accessor.get(IEditorService);
    const mcpWorkbenchService = accessor.get(IMcpWorkbenchService);
    const toolsService = accessor.get(ILanguageModelToolsService);
    const mcpServerByTool = new Map();
    for (const server of mcpService.servers.get()) {
        for (const tool of server.tools.get()) {
            mcpServerByTool.set(tool.id, server);
        }
    }
    // Create default entries if none provided
    if (!toolsEntries) {
        const defaultEntries = new Map();
        for (const tool of toolsService.getTools()) {
            if (tool.canBeReferencedInPrompt) {
                defaultEntries.set(tool, false);
            }
        }
        for (const toolSet of toolsService.toolSets.get()) {
            defaultEntries.set(toolSet, false);
        }
        toolsEntries = defaultEntries;
    }
    // Build tree structure
    const treeItems = [];
    const bucketMap = new Map();
    // Process entries and organize into buckets
    for (const [toolSetOrTool, picked] of toolsEntries) {
        let bucketItem;
        const buttons = [];
        if (toolSetOrTool.source.type === 'mcp') {
            const key = ToolDataSource.toKey(toolSetOrTool.source);
            const { definitionId } = toolSetOrTool.source;
            const mcpServer = mcpService.servers.get().find(candidate => candidate.definition.id === definitionId);
            if (!mcpServer) {
                continue;
            }
            bucketItem = bucketMap.get(key);
            if (!bucketItem) {
                const collection = mcpRegistry.collections.get().find(c => c.id === mcpServer.collection.id);
                if (collection?.source) {
                    buttons.push({
                        iconClass: ThemeIcon.asClassName(Codicon.settingsGear),
                        tooltip: localize('configMcpCol', "Configure {0}", collection.label),
                        action: () => collection.source ? collection.source instanceof ExtensionIdentifier ? extensionsWorkbenchService.open(collection.source.value, { tab: "features" /* ExtensionEditorTab.Features */, feature: 'mcp' }) : mcpWorkbenchService.open(collection.source, { tab: "configuration" /* McpServerEditorTab.Configuration */ }) : undefined
                    });
                }
                else if (collection?.presentation?.origin) {
                    buttons.push({
                        iconClass: ThemeIcon.asClassName(Codicon.settingsGear),
                        tooltip: localize('configMcpCol', "Configure {0}", collection.label),
                        action: () => editorService.openEditor({
                            resource: collection.presentation.origin,
                        })
                    });
                }
                if (mcpServer.connectionState.get().state === 3 /* McpConnectionState.Kind.Error */) {
                    buttons.push({
                        iconClass: ThemeIcon.asClassName(Codicon.warning),
                        tooltip: localize('mcpShowOutput', "Show Output"),
                        action: () => mcpServer.showOutput(),
                    });
                }
                bucketItem = {
                    itemType: 'bucket',
                    ordinal: 2 /* BucketOrdinal.Mcp */,
                    id: key,
                    label: localize('mcplabel', "MCP Server: {0}", toolSetOrTool.source.label),
                    checked: false,
                    collapsed: true,
                    children: [],
                    buttons,
                    alwaysShow: true,
                    iconClass: ThemeIcon.asClassName(Codicon.mcp)
                };
                bucketMap.set(key, bucketItem);
            }
            if (toolSetOrTool instanceof ToolSet) {
                // MCP ToolSets are hidden - store in bucket for special handling
                bucketItem.toolset = toolSetOrTool;
                bucketItem.checked = picked;
            }
            else if (toolSetOrTool.canBeReferencedInPrompt) {
                // Add MCP tools directly as children
                const toolTreeItem = createToolTreeItemFromData(toolSetOrTool, picked);
                bucketItem.children = [...(bucketItem.children || []), toolTreeItem];
            }
        }
        else {
            // Handle other tool sources (extension, internal, user)
            let ordinal;
            let label;
            let key;
            let collapsed;
            if (toolSetOrTool.source.type === 'extension') {
                ordinal = 3 /* BucketOrdinal.Extension */;
                label = localize('ext', 'Extension: {0}', toolSetOrTool.source.label);
                // Create separate buckets per extension, similar to MCP servers
                key = ToolDataSource.toKey(toolSetOrTool.source);
                collapsed = true;
            }
            else if (toolSetOrTool.source.type === 'internal') {
                ordinal = 1 /* BucketOrdinal.BuiltIn */;
                label = localize('defaultBucketLabel', "Built-In");
                // Group all internal tools under one bucket
                key = ordinal.toString();
            }
            else if (toolSetOrTool.source.type === 'user') {
                ordinal = 0 /* BucketOrdinal.User */;
                label = localize('userBucket', "User Defined Tool Sets");
                // Group all user tools under one bucket
                key = ordinal.toString();
                buttons.push({
                    iconClass: ThemeIcon.asClassName(Codicon.edit),
                    tooltip: localize('editUserBucket', "Edit Tool Set"),
                    action: () => {
                        assertType(toolSetOrTool.source.type === 'user');
                        editorService.openEditor({ resource: toolSetOrTool.source.file });
                    }
                });
            }
            else {
                assertNever(toolSetOrTool.source);
            }
            bucketItem = bucketMap.get(key);
            if (!bucketItem) {
                const iconProps = toolSetOrTool.source.type === 'extension'
                    ? { iconClass: ThemeIcon.asClassName(Codicon.extensions) }
                    : {};
                bucketItem = {
                    itemType: 'bucket',
                    ordinal,
                    id: key,
                    label,
                    checked: false,
                    children: [],
                    buttons,
                    collapsed,
                    alwaysShow: true,
                    ...iconProps
                };
                bucketMap.set(key, bucketItem);
            }
            if (toolSetOrTool instanceof ToolSet) {
                // Add ToolSet as child with its tools as grandchildren - create directly instead of using legacy pick structure
                const iconProps = mapIconToTreeItem(toolSetOrTool.icon);
                const toolSetTreeItem = {
                    itemType: 'toolset',
                    toolset: toolSetOrTool,
                    buttons,
                    id: toolSetOrTool.id,
                    label: toolSetOrTool.referenceName,
                    description: toolSetOrTool.description,
                    checked: picked,
                    collapsed: true,
                    children: Array.from(toolSetOrTool.getTools()).map(tool => createToolTreeItemFromData(tool, picked)),
                    ...iconProps
                };
                bucketItem.children = [...(bucketItem.children || []), toolSetTreeItem];
            }
            else if (toolSetOrTool.canBeReferencedInPrompt) {
                // Add individual tool as child
                const toolTreeItem = createToolTreeItemFromData(toolSetOrTool, picked);
                bucketItem.children = [...(bucketItem.children || []), toolTreeItem];
            }
        }
    }
    // Convert bucket map to sorted tree items
    const sortedBuckets = Array.from(bucketMap.values()).sort((a, b) => a.ordinal - b.ordinal);
    treeItems.push(...sortedBuckets);
    // Set up checkbox states based on parent-child relationships
    for (const bucketItem of treeItems.filter(isBucketTreeItem)) {
        if (bucketItem.checked) {
            // Check all children if bucket is checked
            bucketItem.children?.forEach(child => {
                child.checked = true;
            });
        }
        else {
            // Check bucket if any child is checked
            bucketItem.checked = bucketItem.children?.some(child => child.checked) || false;
        }
    }
    // Create and configure the tree picker
    const store = new DisposableStore();
    const treePicker = store.add(quickPickService.createQuickTree());
    treePicker.placeholder = placeHolder;
    treePicker.ignoreFocusOut = true;
    treePicker.description = description;
    treePicker.matchOnDescription = true;
    treePicker.matchOnLabel = true;
    if (treeItems.length === 0) {
        treePicker.placeholder = localize('noTools', "Add tools to chat");
    }
    treePicker.setItemTree(treeItems);
    // Handle button triggers
    store.add(treePicker.onDidTriggerItemButton(e => {
        if (e.button && typeof e.button.action === 'function') {
            e.button.action();
            store.dispose();
        }
    }));
    // Result collection
    const result = new Map();
    const collectResults = () => {
        result.clear();
        const traverse = (items) => {
            for (const item of items) {
                if (isBucketTreeItem(item)) {
                    if (item.toolset) {
                        // MCP server bucket represents a ToolSet
                        const checked = typeof item.checked === 'boolean' ? item.checked : false;
                        result.set(item.toolset, checked);
                    }
                    if (item.children) {
                        traverse(item.children);
                    }
                }
                else if (isToolSetTreeItem(item)) {
                    const checked = typeof item.checked === 'boolean' ? item.checked : false;
                    result.set(item.toolset, checked);
                    if (item.children) {
                        traverse(item.children);
                    }
                }
                else if (isToolTreeItem(item)) {
                    const checked = typeof item.checked === 'boolean' ? item.checked : false;
                    result.set(item.tool, checked);
                }
            }
        };
        traverse(treeItems);
        // Special MCP handling: MCP toolset is enabled only if all tools are enabled
        for (const item of toolsService.toolSets.get()) {
            if (item.source.type === 'mcp') {
                const toolsInSet = Array.from(item.getTools());
                result.set(item, toolsInSet.every(tool => result.get(tool)));
            }
        }
    };
    // Handle checkbox state changes
    store.add(treePicker.onDidChangeCheckedLeafItems(() => {
        collectResults();
        if (onUpdate) {
            // Check if results changed
            let didChange = toolsEntries.size !== result.size;
            for (const [key, value] of toolsEntries) {
                if (didChange) {
                    break;
                }
                didChange = result.get(key) !== value;
            }
            if (didChange) {
                onUpdate(result);
            }
        }
    }));
    // Handle acceptance
    let didAccept = false;
    store.add(treePicker.onDidAccept(() => {
        // Check if a callback item was activated
        const activeItems = treePicker.activeItems;
        const callbackItem = activeItems.find(isCallbackTreeItem);
        if (callbackItem) {
            callbackItem.run();
        }
        else {
            didAccept = true;
        }
    }));
    const addMcpServerButton = {
        iconClass: ThemeIcon.asClassName(Codicon.mcp),
        tooltip: localize('addMcpServer', 'Add MCP Server...')
    };
    const installExtension = {
        iconClass: ThemeIcon.asClassName(Codicon.extensions),
        tooltip: localize('addExtensionButton', 'Install Extension...')
    };
    const configureToolSets = {
        iconClass: ThemeIcon.asClassName(Codicon.gear),
        tooltip: localize('configToolSets', 'Configure Tool Sets...')
    };
    treePicker.title = localize('configureTools', "Configure Tools");
    treePicker.buttons = [addMcpServerButton, installExtension, configureToolSets];
    treePicker.onDidTriggerButton(button => {
        if (button === addMcpServerButton) {
            commandService.executeCommand("workbench.mcp.addConfiguration" /* McpCommandIds.AddConfiguration */);
        }
        else if (button === installExtension) {
            extensionsWorkbenchService.openSearch('@tag:language-model-tools');
        }
        else if (button === configureToolSets) {
            commandService.executeCommand(ConfigureToolSets.ID);
        }
        treePicker.hide();
    });
    treePicker.show();
    await Promise.race([Event.toPromise(Event.any(treePicker.onDidAccept, treePicker.onDidHide))]);
    store.dispose();
    collectResults();
    return didAccept ? result : undefined;
}
/**
 * Main entry point for the tools picker. Supports both QuickPick and QuickTree implementations
 * based on the 'chat.tools.useTreePicker' workspace setting.
 *
 * @param accessor - Service accessor for dependency injection
 * @param placeHolder - Placeholder text shown in the picker
 * @param description - Optional description text shown in the picker
 * @param toolsEntries - Optional initial selection state for tools and toolsets
 * @param onUpdate - Optional callback fired when the selection changes
 * @returns Promise resolving to the final selection map, or undefined if cancelled
 */
export async function showToolsPicker(accessor, placeHolder, description, toolsEntries, onUpdate) {
    // Feature flag logic: Choose between QuickTree and QuickPick implementations
    const configurationService = accessor.get(IConfigurationService);
    const useTreePicker = configurationService.getValue('chat.tools.useTreePicker');
    if (useTreePicker) {
        // New implementation: Use IQuickTree for hierarchical tree structure with checkboxes
        return showToolsPickerTree(accessor, placeHolder, description, toolsEntries, onUpdate);
    }
    else {
        // Legacy implementation: Use QuickPick for backward compatibility
        return showToolsPickerLegacy(accessor, placeHolder, description, toolsEntries, onUpdate);
    }
}
/**
 * Legacy QuickPick implementation (renamed from original showToolsPicker).
 * Uses a flat list with indentation to represent hierarchy.
 * Maintained for backward compatibility when 'chat.tools.useTreePicker' is false.
 */
async function showToolsPickerLegacy(accessor, placeHolder, description, toolsEntries, onUpdate) {
    const quickPickService = accessor.get(IQuickInputService);
    const mcpService = accessor.get(IMcpService);
    const mcpRegistry = accessor.get(IMcpRegistry);
    const commandService = accessor.get(ICommandService);
    const extensionsWorkbenchService = accessor.get(IExtensionsWorkbenchService);
    const editorService = accessor.get(IEditorService);
    const mcpWorkbenchService = accessor.get(IMcpWorkbenchService);
    const toolsService = accessor.get(ILanguageModelToolsService);
    const mcpServerByTool = new Map();
    for (const server of mcpService.servers.get()) {
        for (const tool of server.tools.get()) {
            mcpServerByTool.set(tool.id, server);
        }
    }
    const builtinBucket = {
        type: 'item',
        children: [],
        label: localize('defaultBucketLabel', "Built-In"),
        ordinal: 1 /* BucketOrdinal.BuiltIn */,
        picked: false,
    };
    const userBucket = {
        type: 'item',
        children: [],
        label: localize('userBucket', "User Defined Tool Sets"),
        ordinal: 0 /* BucketOrdinal.User */,
        alwaysShow: true,
        picked: false,
    };
    const addMcpPick = { type: 'item', label: localize('addServer', "Add MCP Server..."), iconClass: ThemeIcon.asClassName(Codicon.add), pickable: false, run: () => commandService.executeCommand("workbench.mcp.addConfiguration" /* McpCommandIds.AddConfiguration */) };
    const configureToolSetsPick = { type: 'item', label: localize('configToolSet', "Configure Tool Sets..."), iconClass: ThemeIcon.asClassName(Codicon.gear), pickable: false, run: () => commandService.executeCommand(ConfigureToolSets.ID) };
    const addExpPick = { type: 'item', label: localize('addExtension', "Install Extension..."), iconClass: ThemeIcon.asClassName(Codicon.add), pickable: false, run: () => extensionsWorkbenchService.openSearch('@tag:language-model-tools') };
    const addPick = {
        type: 'item', label: localize('addAny', "Add More Tools..."), iconClass: ThemeIcon.asClassName(Codicon.add), pickable: false, run: async () => {
            const pick = await quickPickService.pick([addMcpPick, addExpPick], {
                canPickMany: false,
                placeHolder: localize('noTools', "Add tools to chat")
            });
            pick?.run();
        }
    };
    const toolBuckets = new Map();
    if (!toolsEntries) {
        const defaultEntries = new Map();
        for (const tool of toolsService.getTools()) {
            if (tool.canBeReferencedInPrompt) {
                defaultEntries.set(tool, false);
            }
        }
        for (const toolSet of toolsService.toolSets.get()) {
            defaultEntries.set(toolSet, false);
        }
        toolsEntries = defaultEntries;
    }
    for (const [toolSetOrTool, picked] of toolsEntries) {
        let bucket;
        const buttons = [];
        if (toolSetOrTool.source.type === 'mcp') {
            const key = ToolDataSource.toKey(toolSetOrTool.source);
            const { definitionId } = toolSetOrTool.source;
            const mcpServer = mcpService.servers.get().find(candidate => candidate.definition.id === definitionId);
            if (!mcpServer) {
                continue;
            }
            const buttons = [];
            bucket = toolBuckets.get(key) ?? {
                type: 'item',
                label: localize('mcplabel', "MCP Server: {0}", toolSetOrTool.source.label),
                ordinal: 2 /* BucketOrdinal.Mcp */,
                picked: false,
                alwaysShow: true,
                children: [],
                buttons
            };
            toolBuckets.set(key, bucket);
            const collection = mcpRegistry.collections.get().find(c => c.id === mcpServer.collection.id);
            if (collection?.source) {
                buttons.push({
                    iconClass: ThemeIcon.asClassName(Codicon.settingsGear),
                    tooltip: localize('configMcpCol', "Configure {0}", collection.label),
                    action: () => collection.source ? collection.source instanceof ExtensionIdentifier ? extensionsWorkbenchService.open(collection.source.value, { tab: "features" /* ExtensionEditorTab.Features */, feature: 'mcp' }) : mcpWorkbenchService.open(collection.source, { tab: "configuration" /* McpServerEditorTab.Configuration */ }) : undefined
                });
            }
            else if (collection?.presentation?.origin) {
                buttons.push({
                    iconClass: ThemeIcon.asClassName(Codicon.settingsGear),
                    tooltip: localize('configMcpCol', "Configure {0}", collection.label),
                    action: () => editorService.openEditor({
                        resource: collection.presentation.origin,
                    })
                });
            }
            if (mcpServer.connectionState.get().state === 3 /* McpConnectionState.Kind.Error */) {
                buttons.push({
                    iconClass: ThemeIcon.asClassName(Codicon.warning),
                    tooltip: localize('mcpShowOutput', "Show Output"),
                    action: () => mcpServer.showOutput(),
                });
            }
        }
        else if (toolSetOrTool.source.type === 'extension') {
            const key = ToolDataSource.toKey(toolSetOrTool.source);
            bucket = toolBuckets.get(key) ?? {
                type: 'item',
                label: localize('ext', 'Extension: {0}', toolSetOrTool.source.label),
                ordinal: 3 /* BucketOrdinal.Extension */,
                picked: false,
                alwaysShow: true,
                children: []
            };
            toolBuckets.set(key, bucket);
        }
        else if (toolSetOrTool.source.type === 'internal') {
            bucket = builtinBucket;
        }
        else if (toolSetOrTool.source.type === 'user') {
            bucket = userBucket;
            buttons.push({
                iconClass: ThemeIcon.asClassName(Codicon.edit),
                tooltip: localize('editUserBucket', "Edit Tool Set"),
                action: () => {
                    assertType(toolSetOrTool.source.type === 'user');
                    editorService.openEditor({ resource: toolSetOrTool.source.file });
                }
            });
        }
        else {
            assertNever(toolSetOrTool.source);
        }
        if (toolSetOrTool instanceof ToolSet) {
            if (toolSetOrTool.source.type !== 'mcp') { // don't show the MCP toolset
                bucket.children.push({
                    parent: bucket,
                    type: 'item',
                    picked,
                    toolset: toolSetOrTool,
                    label: toolSetOrTool.referenceName,
                    description: toolSetOrTool.description,
                    indented: true,
                    buttons
                });
            }
            else {
                // stash the MCP toolset into the bucket item
                bucket.toolset = toolSetOrTool;
                bucket.picked = picked;
            }
        }
        else if (toolSetOrTool.canBeReferencedInPrompt) {
            bucket.children.push({
                parent: bucket,
                type: 'item',
                picked,
                tool: toolSetOrTool,
                label: toolSetOrTool.toolReferenceName ?? toolSetOrTool.displayName,
                description: toolSetOrTool.userDescription ?? toolSetOrTool.modelDescription,
                indented: true,
            });
        }
    }
    for (const bucket of [builtinBucket, userBucket]) {
        if (bucket.children.length > 0) {
            toolBuckets.set(generateUuid(), bucket);
        }
    }
    // set the checkmarks in the UI:
    // bucket is checked if at least one of the children is checked
    // tool is checked if the bucket is checked or the tool itself is checked
    for (const bucket of toolBuckets.values()) {
        if (bucket.picked) {
            // check all children if the bucket is checked
            for (const child of bucket.children) {
                child.picked = true;
            }
        }
        else {
            // check the bucket if one of the children is checked
            bucket.picked = bucket.children.some(child => child.picked);
        }
    }
    const store = new DisposableStore();
    const picks = [];
    for (const bucket of Array.from(toolBuckets.values()).sort((a, b) => a.ordinal - b.ordinal)) {
        picks.push({
            type: 'separator',
            label: bucket.status
        });
        picks.push(bucket);
        picks.push(...bucket.children.sort((a, b) => a.label.localeCompare(b.label)));
    }
    const picker = store.add(quickPickService.createQuickPick({ useSeparators: true }));
    picker.placeholder = placeHolder;
    picker.ignoreFocusOut = true;
    picker.description = description;
    picker.canSelectMany = true;
    picker.keepScrollPosition = true;
    picker.sortByLabel = false;
    picker.matchOnDescription = true;
    if (picks.length === 0) {
        picker.placeholder = localize('noTools', "Add tools to chat");
        picker.canSelectMany = false;
        picks.push(addMcpPick, addExpPick);
    }
    else {
        picks.push({ type: 'separator' }, configureToolSetsPick, addPick);
    }
    let lastSelectedItems = new Set();
    let ignoreEvent = false;
    const result = new Map();
    const _update = () => {
        ignoreEvent = true;
        try {
            const items = picks.filter((p) => p.type === 'item' && Boolean(p.picked));
            lastSelectedItems = new Set(items);
            picker.selectedItems = items;
            result.clear();
            for (const item of picks) {
                if (item.type !== 'item') {
                    continue;
                }
                if (isToolSetPick(item)) {
                    result.set(item.toolset, item.picked);
                }
                else if (isToolPick(item)) {
                    result.set(item.tool, item.picked);
                }
                else if (isBucketPick(item)) {
                    if (item.toolset) {
                        result.set(item.toolset, item.picked);
                    }
                    for (const child of item.children) {
                        if (isToolSetPick(child)) {
                            result.set(child.toolset, item.picked);
                        }
                        else if (isToolPick(child)) {
                            result.set(child.tool, item.picked);
                        }
                    }
                }
            }
            if (onUpdate) {
                let didChange = toolsEntries.size !== result.size;
                for (const [key, value] of toolsEntries) {
                    if (didChange) {
                        break;
                    }
                    didChange = result.get(key) !== value;
                }
                if (didChange) {
                    onUpdate(result);
                }
            }
        }
        finally {
            ignoreEvent = false;
        }
    };
    _update();
    picker.items = picks;
    picker.show();
    store.add(picker.onDidTriggerItemButton(e => {
        if (isActionableButton(e.button)) {
            e.button.action();
            store.dispose();
        }
    }));
    store.add(picker.onDidChangeSelection(selectedPicks => {
        if (ignoreEvent) {
            return;
        }
        const addPick = selectedPicks.find(isCallbackPick);
        if (addPick) {
            return;
        }
        const { added, removed } = diffSets(lastSelectedItems, new Set(selectedPicks));
        for (const item of added) {
            item.picked = true;
            if (isBucketPick(item)) {
                // add server -> add back tools
                for (const toolPick of item.children) {
                    toolPick.picked = true;
                }
            }
            else if (isToolPick(item) || isToolSetPick(item)) {
                // add server when tool is picked
                item.parent.picked = true;
            }
        }
        for (const item of removed) {
            item.picked = false;
            if (isBucketPick(item)) {
                // removed server -> remove tools
                for (const toolPick of item.children) {
                    toolPick.picked = false;
                }
            }
            else if ((isToolPick(item) || isToolSetPick(item)) && item.parent.children.every(child => !child.picked)) {
                // remove LAST tool -> remove server
                item.parent.picked = false;
            }
        }
        _update();
    }));
    let didAccept = false;
    store.add(picker.onDidAccept(() => {
        const callbackPick = picker.activeItems.find(isCallbackPick);
        if (callbackPick) {
            callbackPick.run();
        }
        else {
            didAccept = true;
        }
    }));
    await Promise.race([Event.toPromise(Event.any(picker.onDidAccept, picker.onDidHide))]);
    store.dispose();
    // in the result, a MCP toolset is only enabled if all tools in the toolset are enabled
    for (const item of toolsService.toolSets.get()) {
        if (item.source.type === 'mcp') {
            const toolsInSet = Array.from(item.getTools());
            result.set(item, toolsInSet.every(tool => result.get(tool)));
        }
    }
    return didAccept ? result : undefined;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFRvb2xQaWNrZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9hZHZpa2FyL0RvY3VtZW50cy9hcmNoaXRlY3QvYXJjaDIvQXJjaElERS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2Jyb3dzZXIvYWN0aW9ucy9jaGF0VG9vbFBpY2tlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUNoRyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDbkUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ2pFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUNyRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDNUQsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQzFFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNwRSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDakUsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUNqRCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0scURBQXFELENBQUM7QUFDdEYsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0seURBQXlELENBQUM7QUFFOUYsT0FBTyxFQUFxQixrQkFBa0IsRUFBdUQsTUFBTSx5REFBeUQsQ0FBQztBQUVySyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQztBQUN0RyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0scURBQXFELENBQUM7QUFDckYsT0FBTyxFQUFzQiwyQkFBMkIsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBRTNHLE9BQU8sRUFBRSxZ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