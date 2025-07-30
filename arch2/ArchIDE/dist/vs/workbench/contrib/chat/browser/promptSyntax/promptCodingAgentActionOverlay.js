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
var PromptCodingAgentActionOverlayWidget_1;
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { ICommandService } from '../../../../../platform/commands/common/commands.js';
import { IContextKeyService } from '../../../../../platform/contextkey/common/contextkey.js';
import { ChatContextKeys } from '../../common/chatContextKeys.js';
import { IRemoteCodingAgentsService } from '../../../remoteCodingAgents/common/remoteCodingAgentsService.js';
import { localize } from '../../../../../nls.js';
import { Button } from '../../../../../base/browser/ui/button/button.js';
import { getPromptCommandName } from '../../common/promptSyntax/service/promptsServiceImpl.js';
import { PROMPT_LANGUAGE_ID } from '../../common/promptSyntax/promptTypes.js';
import { $ } from '../../../../../base/browser/dom.js';
let PromptCodingAgentActionOverlayWidget = class PromptCodingAgentActionOverlayWidget extends Disposable {
    static { PromptCodingAgentActionOverlayWidget_1 = this; }
    static { this.ID = 'promptCodingAgentActionOverlay'; }
    constructor(_editor, _commandService, _contextKeyService, _remoteCodingAgentService) {
        super();
        this._editor = _editor;
        this._commandService = _commandService;
        this._contextKeyService = _contextKeyService;
        this._remoteCodingAgentService = _remoteCodingAgentService;
        this._isVisible = false;
        this._domNode = $('.prompt-coding-agent-action-overlay');
        this._button = this._register(new Button(this._domNode, {
            supportIcons: true,
            title: localize('runPromptWithCodingAgent', "Run prompt file in a remote coding agent")
        }));
        this._button.element.style.background = 'var(--vscode-button-background)';
        this._button.element.style.color = 'var(--vscode-button-foreground)';
        this._button.label = localize('runWithCodingAgent.label', "{0} Delegate to Copilot coding agent", '$(cloud-upload)');
        this._register(this._button.onDidClick(async () => {
            await this._execute();
        }));
        this._register(this._contextKeyService.onDidChangeContext(() => {
            this._updateVisibility();
        }));
        this._register(this._editor.onDidChangeModel(() => {
            this._updateVisibility();
        }));
        this._register(this._editor.onDidLayoutChange(() => {
            if (this._isVisible) {
                this._editor.layoutOverlayWidget(this);
            }
        }));
        // initial visibility
        this._updateVisibility();
    }
    getId() {
        return PromptCodingAgentActionOverlayWidget_1.ID;
    }
    getDomNode() {
        return this._domNode;
    }
    getPosition() {
        if (!this._isVisible) {
            return null;
        }
        return {
            preference: 1 /* OverlayWidgetPositionPreference.BOTTOM_RIGHT_CORNER */,
        };
    }
    _updateVisibility() {
        const enableRemoteCodingAgentPromptFileOverlay = ChatContextKeys.enableRemoteCodingAgentPromptFileOverlay.getValue(this._contextKeyService);
        const hasRemoteCodingAgent = ChatContextKeys.hasRemoteCodingAgent.getValue(this._contextKeyService);
        const model = this._editor.getModel();
        const isPromptFile = model?.getLanguageId() === PROMPT_LANGUAGE_ID;
        const shouldBeVisible = !!(isPromptFile && enableRemoteCodingAgentPromptFileOverlay && hasRemoteCodingAgent);
        if (shouldBeVisible !== this._isVisible) {
            this._isVisible = shouldBeVisible;
            if (this._isVisible) {
                this._editor.addOverlayWidget(this);
            }
            else {
                this._editor.removeOverlayWidget(this);
            }
        }
    }
    async _execute() {
        const model = this._editor.getModel();
        if (!model) {
            return;
        }
        this._button.enabled = false;
        try {
            const promptContent = model.getValue();
            const promptName = getPromptCommandName(model.uri.path);
            const agents = this._remoteCodingAgentService.getAvailableAgents();
            const agent = agents[0]; // Use the first available agent
            if (!agent) {
                return;
            }
            await this._commandService.executeCommand(agent.command, {
                userPrompt: promptName,
                summary: promptContent,
                source: 'prompt',
            });
        }
        finally {
            this._button.enabled = true;
        }
    }
    dispose() {
        if (this._isVisible) {
            this._editor.removeOverlayWidget(this);
        }
        super.dispose();
    }
};
PromptCodingAgentActionOverlayWidget = PromptCodingAgentActionOverlayWidget_1 = __decorate([
    __param(1, ICommandService),
    __param(2, IContextKeyService),
    __param(3, IRemoteCodingAgentsService)
], PromptCodingAgentActionOverlayWidget);
export { PromptCodingAgentActionOverlayWidget };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvbXB0Q29kaW5nQWdlbnRBY3Rpb25PdmVybGF5LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvYWR2aWthci9Eb2N1bWVudHMvYXJjaGl0ZWN0L2FyY2gyL0FyY2hJREUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9icm93c2VyL3Byb21wdFN5bnRheC9wcm9tcHRDb2RpbmdBZ2VudEFjdGlvbk92ZXJsYXkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUVyRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0scURBQXFELENBQUM7QUFDdEYsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0seURBQXlELENBQUM7QUFDN0YsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLGlFQUFpRSxDQUFDO0FBQzdHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUNqRCxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0saURBQWlELENBQUM7QUFDekUsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0seURBQXlELENBQUM7QUFDL0YsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDOUUsT0FBTyxFQUFFLENBQUMsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBRWhELElBQU0sb0NBQW9DLEdBQTFDLE1BQU0sb0NBQXFDLFNBQVEsVUFBVTs7YUFFM0MsT0FBRSxHQUFHLGdDQUFnQyxBQUFuQyxDQUFvQztJQU05RCxZQUNrQixPQUFvQixFQUNwQixlQUFpRCxFQUM5QyxrQkFBdUQsRUFDL0MseUJBQXNFO1FBRWxHLEtBQUssRUFBRSxDQUFDO1FBTFMsWUFBTyxHQUFQLE9BQU8sQ0FBYTtRQUNI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