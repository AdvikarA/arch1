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
import { DeferredPromise, disposableTimeout, RunOnceScheduler } from '../../../../base/common/async.js';
import { CancellationToken, CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { Event } from '../../../../base/common/event.js';
import { DisposableStore, toDisposable } from '../../../../base/common/lifecycle.js';
import { autorun, derived } from '../../../../base/common/observable.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { generateUuid } from '../../../../base/common/uuid.js';
import { localize } from '../../../../nls.js';
import { ByteSize, IFileService } from '../../../../platform/files/common/files.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
import { DefaultQuickAccessFilterValue } from '../../../../platform/quickinput/common/quickAccess.js';
import { IQuickInputService } from '../../../../platform/quickinput/common/quickInput.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { IViewsService } from '../../../services/views/common/viewsService.js';
import { IChatWidgetService } from '../../chat/browser/chat.js';
import { IChatAttachmentResolveService } from '../../chat/browser/chatAttachmentResolveService.js';
import { IMcpService, isMcpResourceTemplate, McpResourceURI } from '../common/mcpTypes.js';
import { openPanelChatAndGetWidget } from './openPanelChatAndGetWidget.js';
let McpResourcePickHelper = class McpResourcePickHelper {
    static sep(server) {
        return {
            id: server.definition.id,
            type: 'separator',
            label: server.definition.label,
        };
    }
    static item(resource) {
        if (isMcpResourceTemplate(resource)) {
            return {
                id: resource.template.template,
                label: resource.title || resource.name,
                description: resource.description,
                detail: localize('mcp.resource.template', 'Resource template: {0}', resource.template.template),
            };
        }
        return {
            id: resource.uri.toString(),
            label: resource.title || resource.name,
            description: resource.description,
            detail: resource.mcpUri + (resource.sizeInBytes !== undefined ? ' (' + ByteSize.formatSize(resource.sizeInBytes) + ')' : ''),
        };
    }
    constructor(_mcpService, _fileService, _quickInputService, _notificationService, _chatAttachmentResolveService) {
        this._mcpService = _mcpService;
        this._fileService = _fileService;
        this._quickInputService = _quickInputService;
        this._notificationService = _notificationService;
        this._chatAttachmentResolveService = _chatAttachmentResolveService;
        this.hasServersWithResources = derived(reader => {
            let enabled = false;
            for (const server of this._mcpService.servers.read(reader)) {
                const cap = server.capabilities.get();
                if (cap === undefined) {
                    enabled = true; // until we know more
                }
                else if (cap & 16 /* McpCapability.Resources */) {
                    enabled = true;
                    break;
                }
            }
            return enabled;
        });
    }
    async toAttachment(resource) {
        if (isMcpResourceTemplate(resource)) {
            return this._resourceTemplateToAttachment(resource);
        }
        else {
            return this._resourceToAttachment(resource);
        }
    }
    async toURI(resource) {
        if (isMcpResourceTemplate(resource)) {
            const maybeUri = await this._resourceTemplateToURI(resource);
            return maybeUri && await this._verifyUriIfNeeded(maybeUri);
        }
        else {
            return resource.uri;
        }
    }
    async _resourceToAttachment(resource) {
        const asImage = await this._chatAttachmentResolveService.resolveImageEditorAttachContext(resource.uri, undefined, resource.mimeType);
        if (asImage) {
            return asImage;
        }
        return {
            id: resource.uri.toString(),
            kind: 'file',
            name: resource.name,
            value: resource.uri,
        };
    }
    async _resourceTemplateToAttachment(rt) {
        const maybeUri = await this._resourceTemplateToURI(rt);
        const uri = maybeUri && await this._verifyUriIfNeeded(maybeUri);
        return uri && this._resourceToAttachment({
            uri,
            name: rt.name,
            mimeType: rt.mimeType,
        });
    }
    async _verifyUriIfNeeded({ uri, needsVerification }) {
        if (!needsVerification) {
            return uri;
        }
        const exists = await this._fileService.exists(uri);
        if (exists) {
            return uri;
        }
        this._notificationService.warn(localize('mcp.resource.template.notFound', "The resource {0} was not found.", McpResourceURI.toServer(uri).resourceURL.toString()));
        return undefined;
    }
    async _resourceTemplateToURI(rt) {
        const todo = rt.template.components.flatMap(c => typeof c === 'object' ? c.variables : []);
        const quickInput = this._quickInputService.createQuickPick();
        const cts = new CancellationTokenSource();
        const vars = {};
        quickInput.totalSteps = todo.length;
        quickInput.ignoreFocusOut = true;
        let needsVerification = false;
        try {
            for (let i = 0; i < todo.length; i++) {
                const variable = todo[i];
                const resolved = await this._promptForTemplateValue(quickInput, variable, vars, rt);
                if (resolved === undefined) {
                    return undefined;
                }
                // mark the URI as needing verification if any part was not a completion pick
                needsVerification ||= !resolved.completed;
                vars[todo[i].name] = variable.repeatable ? resolved.value.split('/') : resolved.value;
            }
            return { uri: rt.resolveURI(vars), needsVerification };
        }
        finally {
            cts.dispose(true);
            quickInput.dispose();
        }
    }
    _promptForTemplateValue(input, variable, variablesSoFar, rt) {
        const store = new DisposableStore();
        const completions = new Map([]);
        const variablesWithPlaceholders = { ...variablesSoFar };
        for (const variable of rt.template.components.flatMap(c => typeof c === 'object' ? c.variables : [])) {
            if (!variablesWithPlaceholders.hasOwnProperty(variable.name)) {
                variablesWithPlaceholders[variable.name] = `$${variable.name.toUpperCase()}`;
            }
        }
        let placeholder = localize('mcp.resource.template.placeholder', "Value for ${0} in {1}", variable.name.toUpperCase(), rt.template.resolve(variablesWithPlaceholders).replaceAll('%24', '$'));
        if (variable.optional) {
            placeholder += ' (' + localize('mcp.resource.template.optional', "Optional") + ')';
        }
        input.placeholder = placeholder;
        input.value = '';
        input.items = [];
        input.show();
        const currentID = generateUuid();
        const setItems = (value, completed = []) => {
            const items = completed.filter(c => c !== value).map(c => ({ id: c, label: c }));
            if (value) {
                items.unshift({ id: currentID, label: value });
            }
            else if (variable.optional) {
                items.unshift({ id: currentID, label: localize('mcp.resource.template.empty', "<Empty>") });
            }
            input.items = items;
        };
        let changeCancellation = store.add(new CancellationTokenSource());
        const getCompletionItems = () => {
            const inputValue = input.value;
            let promise = completions.get(inputValue);
            if (!promise) {
                promise = rt.complete(variable.name, inputValue, variablesSoFar, changeCancellation.token);
                completions.set(inputValue, promise);
            }
            promise.then(values => {
                if (!changeCancellation.token.isCancellationRequested) {
                    setItems(inputValue, values);
                }
            }).catch(() => {
                completions.delete(inputValue);
            }).finally(() => {
                if (!changeCancellation.token.isCancellationRequested) {
                    input.busy = false;
                }
            });
        };
        const getCompletionItemsScheduler = store.add(new RunOnceScheduler(getCompletionItems, 300));
        return new Promise(resolve => {
            store.add(input.onDidHide(() => resolve(undefined)));
            store.add(input.onDidAccept(() => {
                const item = input.selectedItems[0];
                if (item.id === currentID) {
                    resolve({ value: input.value, completed: false });
                }
                else if (variable.explodable && item.label.endsWith('/') && item.label !== input.value) {
                    // if navigating in a path structure, picking a `/` should let the user pick in a subdirectory
                    input.value = item.label;
                }
                else {
                    resolve({ value: item.label, completed: true });
                }
            }));
            store.add(input.onDidChangeValue(value => {
                input.busy = true;
                changeCancellation.dispose(true);
                store.delete(changeCancellation);
                changeCancellation = store.add(new CancellationTokenSource());
                getCompletionItemsScheduler.cancel();
                setItems(value);
                if (completions.has(input.value)) {
                    getCompletionItems();
                }
                else {
                    getCompletionItemsScheduler.schedule();
                }
            }));
            getCompletionItems();
        }).finally(() => store.dispose());
    }
    getPicks(onChange, token) {
        const cts = new CancellationTokenSource(token);
        const store = new DisposableStore();
        store.add(toDisposable(() => cts.dispose(true)));
        // We try to show everything in-sequence to avoid flickering (#250411) as long as
        // it loads within 5 seconds. Otherwise we just show things as the load in parallel.
        let showInSequence = true;
        store.add(disposableTimeout(() => {
            showInSequence = false;
            publish();
        }, 5_000));
        const publish = () => {
            const output = new Map();
            for (const [server, rec] of servers) {
                const r = [];
                output.set(server, r);
                if (rec.templates.isResolved) {
                    r.push(...rec.templates.value);
                }
                else if (showInSequence) {
                    break;
                }
                r.push(...rec.resourcesSoFar);
                if (!rec.resources.isSettled && showInSequence) {
                    break;
                }
            }
            onChange(output);
        };
        const servers = new Map();
        // Enumerate servers and start servers that need to be started to get capabilities
        return Promise.all((this.explicitServers || this._mcpService.servers.get()).map(async (server) => {
            let cap = server.capabilities.get();
            const rec = {
                templates: new DeferredPromise(),
                resourcesSoFar: [],
                resources: new DeferredPromise(),
            };
            servers.set(server, rec); // always add it to retain order
            if (cap === undefined) {
                cap = await new Promise(resolve => {
                    server.start().then(state => {
                        if (state.state === 3 /* McpConnectionState.Kind.Error */ || state.state === 0 /* McpConnectionState.Kind.Stopped */) {
                            resolve(undefined);
                        }
                    });
                    store.add(cts.token.onCancellationRequested(() => resolve(undefined)));
                    store.add(autorun(reader => {
                        const cap2 = server.capabilities.read(reader);
                        if (cap2 !== undefined) {
                            resolve(cap2);
                        }
                    }));
                });
            }
            if (cap && (cap & 16 /* McpCapability.Resources */)) {
                await Promise.all([
                    rec.templates.settleWith(server.resourceTemplates(cts.token).catch(() => [])).finally(publish),
                    rec.resources.settleWith((async () => {
                        for await (const page of server.resources(cts.token)) {
                            rec.resourcesSoFar = rec.resourcesSoFar.concat(page);
                            publish();
                        }
                    })())
                ]);
            }
            else {
                rec.templates.complete([]);
                rec.resources.complete([]);
            }
            publish();
        })).finally(() => {
            store.dispose();
        });
    }
};
McpResourcePickHelper = __decorate([
    __param(0, IMcpService),
    __param(1, IFileService),
    __param(2, IQuickInputService),
    __param(3, INotificationService),
    __param(4, IChatAttachmentResolveService)
], McpResourcePickHelper);
export { McpResourcePickHelper };
let AbstractMcpResourceAccessPick = class AbstractMcpResourceAccessPick {
    constructor(_scopeTo, _instantiationService, _editorService, _chatWidgetService, _viewsService) {
        this._scopeTo = _scopeTo;
        this._instantiationService = _instantiationService;
        this._editorService = _editorService;
        this._chatWidgetService = _chatWidgetService;
        this._viewsService = _viewsService;
    }
    applyToPick(picker, token, runOptions) {
        picker.canAcceptInBackground = true;
        picker.busy = true;
        picker.keepScrollPosition = true;
        const attachButton = localize('mcp.quickaccess.attach', "Attach to chat");
        const helper = this._instantiationService.createInstance(McpResourcePickHelper);
        if (this._scopeTo) {
            helper.explicitServers = [this._scopeTo];
        }
        helper.getPicks(servers => {
            const items = [];
            for (const [server, resources] of servers) {
                items.push(McpResourcePickHelper.sep(server));
                for (const resource of resources) {
                    const pickItem = McpResourcePickHelper.item(resource);
                    pickItem.buttons = [{ iconClass: ThemeIcon.asClassName(Codicon.attach), tooltip: attachButton }];
                    items.push({ ...pickItem, resource });
                }
            }
            picker.items = items;
        }, token).finally(() => {
            picker.busy = false;
        });
        const store = new DisposableStore();
        store.add(picker.onDidTriggerItemButton(event => {
            if (event.button.tooltip === attachButton) {
                picker.busy = true;
                helper.toAttachment(event.item.resource).then(async (a) => {
                    if (a) {
                        const widget = await openPanelChatAndGetWidget(this._viewsService, this._chatWidgetService);
                        widget?.attachmentModel.addContext(a);
                    }
                    picker.hide();
                });
            }
        }));
        store.add(picker.onDidAccept(async (event) => {
            if (!event.inBackground) {
                picker.hide(); // hide picker unless we accept in background
            }
            if (runOptions?.handleAccept) {
                runOptions.handleAccept?.(picker.activeItems[0], event.inBackground);
            }
            else {
                const [item] = picker.selectedItems;
                const uri = await helper.toURI(item.resource);
                if (uri) {
                    this._editorService.openEditor({ resource: uri, options: { preserveFocus: event.inBackground } });
                }
            }
        }));
        return store;
    }
};
AbstractMcpResourceAccessPick = __decorate([
    __param(1, IInstantiationService),
    __param(2, IEditorService),
    __param(3, IChatWidgetService),
    __param(4, IViewsService)
], AbstractMcpResourceAccessPick);
export { AbstractMcpResourceAccessPick };
let McpResourceQuickPick = class McpResourceQuickPick extends AbstractMcpResourceAccessPick {
    constructor(scopeTo, instantiationService, editorService, chatWidgetService, viewsService, _quickInputService) {
        super(scopeTo, instantiationService, editorService, chatWidgetService, viewsService);
        this._quickInputService = _quickInputService;
    }
    async pick(token = CancellationToken.None) {
        const store = new DisposableStore();
        const qp = store.add(this._quickInputService.createQuickPick({ useSeparators: true }));
        qp.placeholder = localize('mcp.quickaccess.placeholder', "Search for resources");
        store.add(this.applyToPick(qp, token));
        store.add(qp.onDidHide(() => store.dispose()));
        qp.show();
        await Event.toPromise(qp.onDidHide);
    }
};
McpResourceQuickPick = __decorate([
    __param(1, IInstantiationService),
    __param(2, IEditorService),
    __param(3, IChatWidgetService),
    __param(4, IViewsService),
    __param(5, IQuickInputService)
], McpResourceQuickPick);
export { McpResourceQuickPick };
let McpResourceQuickAccess = class McpResourceQuickAccess extends AbstractMcpResourceAccessPick {
    static { this.PREFIX = 'mcpr '; }
    constructor(instantiationService, editorService, chatWidgetService, viewsService) {
        super(undefined, instantiationService, editorService, chatWidgetService, viewsService);
        this.defaultFilterValue = DefaultQuickAccessFilterValue.LAST;
    }
    provide(picker, token, runOptions) {
        return this.applyToPick(picker, token, runOptions);
    }
};
McpResourceQuickAccess = __decorate([
    __param(0, IInstantiationService),
    __param(1, IEditorService),
    __param(2, IChatWidgetService),
    __param(3, IViewsService)
], McpResourceQuickAccess);
export { McpResourceQuickAccess };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWNwUmVzb3VyY2VRdWlja0FjY2Vzcy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL2FkdmlrYXIvRG9jdW1lbnRzL2FyY2hpdGVjdC9hcmNoMi9BcmNoSURFL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL21jcC9icm93c2VyL21jcFJlc291cmNlUXVpY2tBY2Nlc3MudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxpQkFBaUIsRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ3hHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSx1QkFBdUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ3JHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUM5RCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDekQsT0FBTyxFQUFFLGVBQWUsRUFBZSxZQUFZLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNsRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQ3pFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUVqRSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDL0QsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQzlDLE9BQU8sRUFBRSxRQUFRLEVBQUUsWUFBWSxFQUFFLE1BQU0sNENBQTRDLENBQUM7QUFDcEYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUM7QUFDbkcsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sMERBQTBELENBQUM7QUFDaEcsT0FBTyxFQUFFLDZCQUE2QixFQUF3RCxNQUFNLHVEQUF1RCxDQUFDO0FBQzVKLE9BQU8sRUFBRSxrQkFBa0Is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