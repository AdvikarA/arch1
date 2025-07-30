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
import { getWindow } from '../../../../base/browser/dom.js';
import { raceCancellationError } from '../../../../base/common/async.js';
import { matchesMimeType } from '../../../../base/common/dataTransfer.js';
import { CancellationError } from '../../../../base/common/errors.js';
import { Emitter } from '../../../../base/common/event.js';
import { Disposable, DisposableStore } from '../../../../base/common/lifecycle.js';
import { autorun } from '../../../../base/common/observable.js';
import { generateUuid } from '../../../../base/common/uuid.js';
import * as nls from '../../../../nls.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { IWebviewService } from '../../../contrib/webview/browser/webview.js';
import { IExtensionService, isProposedApiEnabled } from '../../../services/extensions/common/extensions.js';
import { ExtensionsRegistry } from '../../../services/extensions/common/extensionsRegistry.js';
export const IChatOutputRendererService = createDecorator('chatOutputRendererService');
let ChatOutputRendererService = class ChatOutputRendererService extends Disposable {
    constructor(_webviewService, _extensionService) {
        super();
        this._webviewService = _webviewService;
        this._extensionService = _extensionService;
        this._contributions = new Map();
        this._renderers = new Map();
        this._register(chatOutputRenderContributionPoint.setHandler(extensions => {
            this.updateContributions(extensions);
        }));
    }
    registerRenderer(viewType, renderer, options) {
        this._renderers.set(viewType, { renderer, options });
        return {
            dispose: () => {
                this._renderers.delete(viewType);
            }
        };
    }
    async renderOutputPart(mime, data, parent, webviewOptions, token) {
        const rendererData = await this.getRenderer(mime, token);
        if (token.isCancellationRequested) {
            throw new CancellationError();
        }
        if (!rendererData) {
            throw new Error(`No renderer registered found for mime type: ${mime}`);
        }
        const store = new DisposableStore();
        const webview = store.add(this._webviewService.createWebviewElement({
            title: '',
            origin: webviewOptions.origin ?? generateUuid(),
            options: {
                enableFindWidget: false,
                purpose: "chatOutputItem" /* WebviewContentPurpose.ChatOutputItem */,
                tryRestoreScrollPosition: false,
            },
            contentOptions: {},
            extension: rendererData.options.extension ? rendererData.options.extension : undefined,
        }));
        const onDidChangeHeight = store.add(new Emitter());
        store.add(autorun(reader => {
            const height = reader.readObservable(webview.intrinsicContentSize);
            if (height) {
                onDidChangeHeight.fire(height.height);
                parent.style.height = `${height.height}px`;
            }
        }));
        webview.mountTo(parent, getWindow(parent));
        await rendererData.renderer.renderOutputPart(mime, data, webview, token);
        return {
            get webview() { return webview; },
            onDidChangeHeight: onDidChangeHeight.event,
            dispose: () => {
                store.dispose();
            },
            reinitialize: () => {
                webview.reinitializeAfterDismount();
            },
        };
    }
    async getRenderer(mime, token) {
        await raceCancellationError(this._extensionService.whenInstalledExtensionsRegistered(), token);
        for (const [id, value] of this._contributions) {
            if (value.mimes.some(m => matchesMimeType(m, [mime]))) {
                await raceCancellationError(this._extensionService.activateByEvent(`onChatOutputRenderer:${id}`), token);
                const rendererData = this._renderers.get(id);
                if (rendererData) {
                    return rendererData;
                }
            }
        }
        return undefined;
    }
    updateContributions(extensions) {
        this._contributions.clear();
        for (const extension of extensions) {
            if (!isProposedApiEnabled(extension.description, 'chatOutputRenderer')) {
                continue;
            }
            for (const contribution of extension.value) {
                if (this._contributions.has(contribution.viewType)) {
                    extension.collector.error(`Chat output renderer with view type '${contribution.viewType}' already registered`);
                    continue;
                }
                this._contributions.set(contribution.viewType, {
                    mimes: contribution.mimeTypes,
                });
            }
        }
    }
};
ChatOutputRendererService = __decorate([
    __param(0, IWebviewService),
    __param(1, IExtensionService)
], ChatOutputRendererService);
export { ChatOutputRendererService };
const chatOutputRenderContributionPoint = ExtensionsRegistry.registerExtensionPoint({
    extensionPoint: 'chatOutputRenderers',
    activationEventsGenerator: (contributions, result) => {
        for (const contrib of contributions) {
            result.push(`onChatOutputRenderer:${contrib.viewType}`);
        }
    },
    jsonSchema: {
        description: nls.localize('vscode.extension.contributes.chatOutputRenderer', 'Contributes a renderer for specific MIME types in chat outputs'),
        type: 'array',
        items: {
            type: 'object',
            additionalProperties: false,
            required: ['viewType', 'mimeTypes'],
            properties: {
                viewType: {
                    type: 'string',
                    description: nls.localize('chatOutputRenderer.viewType', 'Unique identifier for the renderer.'),
                },
                mimeTypes: {
                    type: 'array',
                    description: nls.localize('chatOutputRenderer.mimeTypes', 'MIME types that this renderer can handle'),
                    items: {
                        type: 'string'
                    }
                }
            }
        }
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdE91dHB1dEl0ZW1SZW5kZXJlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL2FkdmlrYXIvRG9jdW1lbnRzL2FyY2hpdGVjdC9hcmNoMi9BcmNoSURFL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvYnJvd3Nlci9jaGF0T3V0cHV0SXRlbVJlbmRlcmVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUM1RCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUV6RSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDMUUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDdEUsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLGtDQUFrQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFlLE1BQU0sc0NBQXNDLENBQUM7QUFDaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBRWhFLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUMvRCxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFDO0FBRTFDLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUM3RixPQUFPLEVBQVksZUFBZSxFQUF5QixNQUFNLDZDQUE2QyxDQUFDO0FBQy9HLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxvQkFBb0IsRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBQzVHLE9BQU8sRUFBRSxrQkFBa0IsRUFBdUIsTUFBTSwyREFBMkQsQ0FBQztBQWFwSCxNQUFNLENBQUMsTUFBTSwwQkFBMEIsR0FBRyxlQUFlLENBQTZCLDJCQUEyQixDQUFDLENBQUM7QUEyQjVHLElB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