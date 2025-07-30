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
var AiStatsStatusBar_1;
import { n } from '../../../../../base/browser/dom.js';
import { ActionBar } from '../../../../../base/browser/ui/actionbar/actionbar.js';
import { Codicon } from '../../../../../base/common/codicons.js';
import { createHotClass } from '../../../../../base/common/hotReloadHelpers.js';
import { Disposable, DisposableStore } from '../../../../../base/common/lifecycle.js';
import { autorun, derived } from '../../../../../base/common/observable.js';
import { ThemeIcon } from '../../../../../base/common/themables.js';
import { localize } from '../../../../../nls.js';
import { ICommandService } from '../../../../../platform/commands/common/commands.js';
import { IStatusbarService } from '../../../../services/statusbar/browser/statusbar.js';
import { AI_STATS_SETTING_ID } from '../settingIds.js';
import './media.css';
let AiStatsStatusBar = class AiStatsStatusBar extends Disposable {
    static { AiStatsStatusBar_1 = this; }
    static { this.hot = createHotClass(AiStatsStatusBar_1); }
    constructor(_aiStatsFeature, _statusbarService, _commandService) {
        super();
        this._aiStatsFeature = _aiStatsFeature;
        this._statusbarService = _statusbarService;
        this._commandService = _commandService;
        this._register(autorun((reader) => {
            const statusBarItem = this._createStatusBar().keepUpdated(reader.store);
            const store = this._register(new DisposableStore());
            reader.store.add(this._statusbarService.addEntry({
                name: localize('inlineSuggestions', "Inline Suggestions"),
                ariaLabel: localize('inlineSuggestionsStatusBar', "Inline suggestions status bar"),
                text: '',
                tooltip: {
                    element: async (_token) => {
                        store.clear();
                        const elem = this._createStatusBarHover();
                        return elem.keepUpdated(store).element;
                    },
                    markdownNotSupportedFallback: undefined,
                },
                content: statusBarItem.element,
            }, 'aiStatsStatusBar', 1 /* StatusbarAlignment.RIGHT */, 100));
        }));
    }
    _createStatusBar() {
        return n.div({
            style: {
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
            }
        }, [
            n.div({
                class: 'ai-stats-status-bar',
                style: {
                    display: 'flex',
                    flexDirection: 'column',
                    width: 50,
                    height: 6,
                    borderRadius: 6,
                    border: '1px solid var(--vscode-statusBar-foreground)',
                }
            }, [
                n.div({
                    style: {
                        flex: 1,
                        display: 'flex',
                        overflow: 'hidden',
                        borderRadius: 6,
                        border: '1px solid transparent',
                    }
                }, [
                    n.div({
                        style: {
                            width: this._aiStatsFeature.aiRate.map(v => `${v * 100}%`),
                            backgroundColor: 'var(--vscode-statusBar-foreground)',
                        }
                    })
                ])
            ])
        ]);
    }
    _createStatusBarHover() {
        const aiRatePercent = this._aiStatsFeature.aiRate.map(r => `${Math.round(r * 100)}%`);
        return n.div({
            class: 'ai-stats-status-bar',
        }, [
            n.div({
                class: 'header',
                style: {
                    fontWeight: 'bold',
                    fontSize: '14px',
                    marginBottom: '4px',
                    minWidth: '200px',
                }
            }, [
                n.div({ style: { flex: 1 } }, [localize('aiStatsStatusBarHeader', "AI Usage Statistics")]),
                n.div({ style: { marginLeft: 'auto' } }, actionBar([
                    {
                        action: {
                            id: 'foo',
                            label: '',
                            enabled: true,
                            run: () => openSettingsCommand({ ids: [AI_STATS_SETTING_ID] }).run(this._commandService),
                            class: ThemeIcon.asClassName(Codicon.gear),
                            tooltip: ''
                        },
                        options: { icon: true, label: false, }
                    }
                ]))
            ]),
            n.div({ style: { display: 'flex' } }, [
                n.div({ style: { flex: 1 } }, [
                    localize('text1', "Manual vs. AI typing ratio: {0}", aiRatePercent.get()),
                ]),
                /*
                TODO: Write article that explains the ratio and link to it.

                n.div({ style: { marginLeft: 'auto' } }, actionBar([
                    {
                        action: {
                            id: 'aiStatsStatusBar.openSettings',
                            label: '',
                            enabled: true,
                            run: () => { },
                            class: ThemeIcon.asClassName(Codicon.info),
                            tooltip: ''
                        },
                        options: { icon: true, label: true, }
                    }
                ]))*/
            ]),
            localize('text2', "Accepted inline suggestions today: {0}", this._aiStatsFeature.acceptedInlineSuggestionsToday.get()),
        ]);
    }
};
AiStatsStatusBar = AiStatsStatusBar_1 = __decorate([
    __param(1, IStatusbarService),
    __param(2, ICommandService)
], AiStatsStatusBar);
export { AiStatsStatusBar };
function actionBar(actions, options) {
    return derived((_reader) => n.div({
        class: [],
        style: {},
        ref: elem => {
            const actionBar = _reader.store.add(new ActionBar(elem, options));
            for (const { action, options } of actions) {
                actionBar.push(action, options);
            }
        }
    }));
}
class CommandWithArgs {
    constructor(commandId, args = []) {
        this.commandId = commandId;
        this.args = args;
    }
    run(commandService) {
        commandService.executeCommand(this.commandId, ...this.args);
    }
}
function openSettingsCommand(options = {}) {
    return new CommandWithArgs('workbench.action.openSettings', [{
            query: options.ids ? options.ids.map(id => `@id:${id}`).join(' ') : undefined,
        }]);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWlTdGF0c1N0YXR1c0Jhci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL2FkdmlrYXIvRG9jdW1lbnRzL2FyY2hpdGVjdC9hcmNoMi9BcmNoSURFL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2VkaXRUZWxlbWV0cnkvYnJvd3Nlci9lZGl0U3RhdHMvYWlTdGF0c1N0YXR1c0Jhci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLENBQUMsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQ3ZELE9BQU8sRUFBRSxTQUFTLEVBQXFDLE1BQU0sdURBQXVELENBQUM7QUFFckgsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ2pFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQztBQUNoRixPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ3RGLE9BQU8sRUFBRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDNUUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ3BFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUNqRCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0scURBQXFELENBQUM7QUFDdEYsT0FBTyxFQUFFLGlCQUFpQixFQUFzQixNQUFNLHFEQUFxRCxDQUFDO0FBQzVHLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLGtCQUFrQixDQUFDO0FBRXZELE9BQU8sYUFBYSxDQUFDO0FBRWQsSUFBTSxnQkFBZ0IsR0FBdEIsTUFBTSxnQkFBaUIsU0FBUSxVQUFVOzthQUN4QixRQUFHLEdBQUcsY0FBYyxDQUFDLGtCQUFnQixDQUFDLEFBQW5DLENBQW9DO0lBRTlELFlBQ2tCLGVBQStCLEVBQ1osaUJBQW9DLEVB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