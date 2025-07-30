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
var SCMHistoryItemContext_1;
import { coalesce } from '../../../../base/common/arrays.js';
import { ThrottledDelayer } from '../../../../base/common/async.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { fromNow } from '../../../../base/common/date.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { IModelService } from '../../../../editor/common/services/model.js';
import { ITextModelService } from '../../../../editor/common/services/resolverService.js';
import { localize } from '../../../../nls.js';
import { Action2, MenuId, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { CodeDataTransfers } from '../../../../platform/dnd/browser/dnd.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IViewsService } from '../../../services/views/common/viewsService.js';
import { showChatView } from '../../chat/browser/chat.js';
import { IChatContextPickService, picksWithPromiseFn } from '../../chat/browser/chatContextPickService.js';
import { ChatContextKeys } from '../../chat/common/chatContextKeys.js';
import { ScmHistoryItemResolver } from '../../multiDiffEditor/browser/scmMultiDiffSourceResolver.js';
import { ISCMService, ISCMViewService } from '../common/scm.js';
export function extractSCMHistoryItemDropData(e) {
    if (!e.dataTransfer?.types.includes(CodeDataTransfers.SCM_HISTORY_ITEM)) {
        return undefined;
    }
    const data = e.dataTransfer?.getData(CodeDataTransfers.SCM_HISTORY_ITEM);
    if (!data) {
        return undefined;
    }
    return JSON.parse(data);
}
let SCMHistoryItemContextContribution = class SCMHistoryItemContextContribution extends Disposable {
    static { this.ID = 'workbench.contrib.chat.scmHistoryItemContextContribution'; }
    constructor(contextPickService, instantiationService, textModelResolverService) {
        super();
        this._store.add(contextPickService.registerChatContextItem(instantiationService.createInstance(SCMHistoryItemContext)));
        this._store.add(textModelResolverService.registerTextModelContentProvider(ScmHistoryItemResolver.scheme, instantiationService.createInstance(SCMHistoryItemContextContentProvider)));
    }
};
SCMHistoryItemContextContribution = __decorate([
    __param(0, IChatContextPickService),
    __param(1, IInstantiationService),
    __param(2, ITextModelService)
], SCMHistoryItemContextContribution);
export { SCMHistoryItemContextContribution };
let SCMHistoryItemContext = SCMHistoryItemContext_1 = class SCMHistoryItemContext {
    static asAttachment(provider, historyItem) {
        const multiDiffSourceUri = ScmHistoryItemResolver.getMultiDiffSourceUri(provider, historyItem);
        const attachmentName = `$(${Codicon.repo.id})\u00A0${provider.name}\u00A0$(${Codicon.gitCommit.id})\u00A0${historyItem.displayId ?? historyItem.id}`;
        return {
            id: historyItem.id,
            name: attachmentName,
            value: multiDiffSourceUri,
            historyItem: {
                ...historyItem,
                references: []
            },
            kind: 'scmHistoryItem'
        };
    }
    constructor(_scmViewService) {
        this._scmViewService = _scmViewService;
        this.type = 'pickerPick';
        this.label = localize('chatContext.scmHistoryItems', 'Source Control...');
        this.icon = Codicon.gitCommit;
        this._delayer = new ThrottledDelayer(200);
    }
    isEnabled(_widget) {
        const activeRepository = this._scmViewService.activeRepository.get();
        return activeRepository?.provider.historyProvider.get() !== undefined;
    }
    asPicker(_widget) {
        return {
            placeholder: localize('chatContext.scmHistoryItems.placeholder', 'Select a change'),
            picks: picksWithPromiseFn((query, token) => {
                const filterText = query.trim() !== '' ? query.trim() : undefined;
                const activeRepository = this._scmViewService.activeRepository.get();
                const historyProvider = activeRepository?.provider.historyProvider.get();
                if (!activeRepository || !historyProvider) {
                    return Promise.resolve([]);
                }
                const historyItemRefs = coalesce([
                    historyProvider.historyItemRef.get(),
                    historyProvider.historyItemRemoteRef.get(),
                    historyProvider.historyItemBaseRef.get(),
                ]).map(ref => ref.id);
                return this._delayer.trigger(() => {
                    return historyProvider.provideHistoryItems({ historyItemRefs, filterText, limit: 100 }, token)
                        .then(historyItems => {
                        if (!historyItems) {
                            return [];
                        }
                        return historyItems.map(historyItem => {
                            const details = [`${historyItem.displayId ?? historyItem.id}`];
                            if (historyItem.author) {
                                details.push(historyItem.author);
                            }
                            if (historyItem.statistics) {
                                details.push(`${historyItem.statistics.files} ${localize('files', 'file(s)')}`);
                            }
                            if (historyItem.timestamp) {
                                details.push(fromNow(historyItem.timestamp, true, true));
                            }
                            return {
                                iconClass: ThemeIcon.asClassName(Codicon.gitCommit),
                                label: historyItem.subject,
                                detail: details.join(`$(${Codicon.circleSmallFilled.id})`),
                                asAttachment: () => SCMHistoryItemContext_1.asAttachment(activeRepository.provider, historyItem)
                            };
                        });
                    });
                });
            })
        };
    }
};
SCMHistoryItemContext = SCMHistoryItemContext_1 = __decorate([
    __param(0, ISCMViewService)
], SCMHistoryItemContext);
let SCMHistoryItemContextContentProvider = class SCMHistoryItemContextContentProvider {
    constructor(_modelService, _scmService) {
        this._modelService = _modelService;
        this._scmService = _scmService;
    }
    async provideTextContent(resource) {
        const uriFields = ScmHistoryItemResolver.parseUri(resource);
        if (!uriFields) {
            return null;
        }
        const textModel = this._modelService.getModel(resource);
        if (textModel) {
            return textModel;
        }
        const { repositoryId, historyItemId } = uriFields;
        const repository = this._scmService.getRepository(repositoryId);
        const historyProvider = repository?.provider.historyProvider.get();
        if (!repository || !historyProvider) {
            return null;
        }
        const historyItemContext = await historyProvider.resolveHistoryItemChatContext(historyItemId);
        if (!historyItemContext) {
            return null;
        }
        return this._modelService.createModel(historyItemContext, null, resource, false);
    }
};
SCMHistoryItemContextContentProvider = __decorate([
    __param(0, IModelService),
    __param(1, ISCMService)
], SCMHistoryItemContextContentProvider);
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'workbench.scm.action.graph.addHistoryItemToChat',
            title: localize('chat.action.scmHistoryItemContext', 'Add to Chat'),
            f1: false,
            menu: {
                id: MenuId.SCMHistoryItemContext,
                group: 'z_chat',
                order: 1,
                when: ChatContextKeys.enabled
            }
        });
    }
    async run(accessor, provider, historyItem) {
        const viewsService = accessor.get(IViewsService);
        const widget = await showChatView(viewsService);
        if (!provider || !historyItem || !widget) {
            return;
        }
        widget.attachmentModel.addContext(SCMHistoryItemContext.asAttachment(provider, historyItem));
    }
});
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'workbench.scm.action.graph.summarizeHistoryItem',
            title: localize('chat.action.scmHistoryItemSummarize', 'Explain Changes'),
            f1: false,
            menu: {
                id: MenuId.SCMHistoryItemContext,
                group: 'z_chat',
                order: 2,
                when: ChatContextKeys.enabled
            }
        });
    }
    async run(accessor, provider, historyItem) {
        const viewsService = accessor.get(IViewsService);
        const widget = await showChatView(viewsService);
        if (!provider || !historyItem || !widget) {
            return;
        }
        widget.attachmentModel.addContext(SCMHistoryItemContext.asAttachment(provider, historyItem));
        await widget.acceptInput('Summarize the attached history item');
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2NtSGlzdG9yeUNoYXRDb250ZXh0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvYWR2aWthci9Eb2N1bWVudHMvYXJjaGl0ZWN0L2FyY2gyL0FyY2hJREUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvc2NtL2Jyb3dzZXIvc2NtSGlzdG9yeUNoYXRDb250ZXh0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDN0QsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFFcEUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFDO0FBQzlELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUMxRCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFDbEUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBR2pFLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUM1RSxPQUFPLEVBQTZCLGlCQUFpQixFQUFFLE1BQU0sdURBQXVELENBQUM7QUFDckgsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQzlDLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxFQUFFLGVBQWUsRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQ2xHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQzVFLE9BQU8sRUFBRSxxQkFBcUIsRUFBb0IsTUFBTSw0REFBNEQsQ0FBQztBQUVySCxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDL0UsT0FBTyxFQUFlLFlBQVksRUFBRSxNQUFNLDRCQUE0QixDQUFDO0FBQ3ZFLE9BQU8sRUFBc0QsdUJBQXVCLEVB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