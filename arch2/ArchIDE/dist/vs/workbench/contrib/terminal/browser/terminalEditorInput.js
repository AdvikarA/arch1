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
var TerminalEditorInput_1;
import { localize } from '../../../../nls.js';
import Severity from '../../../../base/common/severity.js';
import { dispose, toDisposable } from '../../../../base/common/lifecycle.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { EditorInput } from '../../../common/editor/editorInput.js';
import { ITerminalInstanceService, terminalEditorId } from './terminal.js';
import { getColorClass, getUriClasses } from './terminalIcon.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { TerminalExitReason, TerminalLocation } from '../../../../platform/terminal/common/terminal.js';
import { ILifecycleService } from '../../../services/lifecycle/common/lifecycle.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { TerminalContextKeys } from '../common/terminalContextKey.js';
import { IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { Emitter } from '../../../../base/common/event.js';
let TerminalEditorInput = class TerminalEditorInput extends EditorInput {
    static { TerminalEditorInput_1 = this; }
    static { this.ID = 'workbench.editors.terminal'; }
    setGroup(group) {
        this._group = group;
        if (group?.scopedContextKeyService) {
            this._terminalInstance?.setParentContextKeyService(group.scopedContextKeyService);
        }
    }
    get group() {
        return this._group;
    }
    get typeId() {
        return TerminalEditorInput_1.ID;
    }
    get editorId() {
        return terminalEditorId;
    }
    get capabilities() {
        return 2 /* EditorInputCapabilities.Readonly */ | 8 /* EditorInputCapabilities.Singleton */ | 128 /* EditorInputCapabilities.CanDropIntoEditor */ | 64 /* EditorInputCapabilities.ForceDescription */;
    }
    setTerminalInstance(instance) {
        if (this._terminalInstance) {
            throw new Error('cannot set instance that has already been set');
        }
        this._terminalInstance = instance;
        this._setupInstanceListeners();
    }
    copy() {
        const instance = this._terminalInstanceService.createInstance(this._copyLaunchConfig || {}, TerminalLocation.Editor);
        instance.focusWhenReady();
        this._copyLaunchConfig = undefined;
        return this._instantiationService.createInstance(TerminalEditorInput_1, instance.resource, instance);
    }
    /**
     * Sets the launch config to use for the next call to EditorInput.copy, which will be used when
     * the editor's split command is run.
     */
    setCopyLaunchConfig(launchConfig) {
        this._copyLaunchConfig = launchConfig;
    }
    /**
     * Returns the terminal instance for this input if it has not yet been detached from the input.
     */
    get terminalInstance() {
        return this._isDetached ? undefined : this._terminalInstance;
    }
    showConfirm() {
        if (this._isReverted) {
            return false;
        }
        const confirmOnKill = this._configurationService.getValue("terminal.integrated.confirmOnKill" /* TerminalSettingId.ConfirmOnKill */);
        if (confirmOnKill === 'editor' || confirmOnKill === 'always') {
            return this._terminalInstance?.hasChildProcesses || false;
        }
        return false;
    }
    async confirm(terminals) {
        const { confirmed } = await this._dialogService.confirm({
            type: Severity.Warning,
            message: localize('confirmDirtyTerminal.message', "Do you want to terminate running processes?"),
            primaryButton: localize({ key: 'confirmDirtyTerminal.button', comment: ['&& denotes a mnemonic'] }, "&&Terminate"),
            detail: terminals.length > 1 ?
                terminals.map(terminal => terminal.editor.getName()).join('\n') + '\n\n' + localize('confirmDirtyTerminals.detail', "Closing will terminate the running processes in the terminals.") :
                localize('confirmDirtyTerminal.detail', "Closing will terminate the running processes in this terminal.")
        });
        return confirmed ? 1 /* ConfirmResult.DONT_SAVE */ : 2 /* ConfirmResult.CANCEL */;
    }
    async revert() {
        // On revert just treat the terminal as permanently non-dirty
        this._isReverted = true;
    }
    constructor(resource, _terminalInstance, _themeService, _terminalInstanceService, _instantiationService, _configurationService, _lifecycleService, _contextKeyService, _dialogService) {
        super();
        this.resource = resource;
        this._terminalInstance = _terminalInstance;
        this._themeService = _themeService;
        this._terminalInstanceService = _terminalInstanceService;
        this._instantiationService = _instantiationService;
        this._configurationService = _configurationService;
        this._lifecycleService = _lifecycleService;
        this._contextKeyService = _contextKeyService;
        this._dialogService = _dialogService;
        this.closeHandler = this;
        this._isDetached = false;
        this._isShuttingDown = false;
        this._isReverted = false;
        this._onDidRequestAttach = this._register(new Emitter());
        this.onDidRequestAttach = this._onDidRequestAttach.event;
        this._terminalEditorFocusContextKey = TerminalContextKeys.editorFocus.bindTo(_contextKeyService);
        if (_terminalInstance) {
            this._setupInstanceListeners();
        }
    }
    _setupInstanceListeners() {
        const instance = this._terminalInstance;
        if (!instance) {
            return;
        }
        const instanceOnDidFocusListener = instance.onDidFocus(() => this._terminalEditorFocusContextKey.set(true));
        const instanceOnDidBlurListener = instance.onDidBlur(() => this._terminalEditorFocusContextKey.reset());
        this._register(toDisposable(() => {
            if (!this._isDetached && !this._isShuttingDown) {
                // Will be ignored if triggered by onExit or onDisposed terminal events
                // as disposed was already called
                instance.dispose(TerminalExitReason.User);
            }
            dispose([instanceOnDidFocusListener, instanceOnDidBlurListener]);
        }));
        const disposeListeners = [
            instance.onExit((e) => {
                if (!instance.waitOnExit) {
                    this.dispose();
                }
            }),
            instance.onDisposed(() => this.dispose()),
            instance.onTitleChanged(() => this._onDidChangeLabel.fire()),
            instance.onIconChanged(() => this._onDidChangeLabel.fire()),
            instanceOnDidFocusListener,
            instanceOnDidBlurListener,
            instance.statusList.onDidChangePrimaryStatus(() => this._onDidChangeLabel.fire())
        ];
        // Don't dispose editor when instance is torn down on shutdown to avoid extra work and so
        // the editor/tabs don't disappear
        this._lifecycleService.onWillShutdown((e) => {
            this._isShuttingDown = true;
            dispose(disposeListeners);
            // Don't touch processes if the shutdown was a result of reload as they will be reattached
            const shouldPersistTerminals = this._configurationService.getValue("terminal.integrated.enablePersistentSessions" /* TerminalSettingId.EnablePersistentSessions */) && e.reason === 3 /* ShutdownReason.RELOAD */;
            if (shouldPersistTerminals) {
                instance.detachProcessAndDispose(TerminalExitReason.Shutdown);
            }
            else {
                instance.dispose(TerminalExitReason.Shutdown);
            }
        });
    }
    getName() {
        return this._terminalInstance?.title || this.resource.fragment;
    }
    getIcon() {
        if (!this._terminalInstance || !ThemeIcon.isThemeIcon(this._terminalInstance.icon)) {
            return undefined;
        }
        return this._terminalInstance.icon;
    }
    getLabelExtraClasses() {
        if (!this._terminalInstance) {
            return [];
        }
        const extraClasses = ['terminal-tab', 'predefined-file-icon'];
        const colorClass = getColorClass(this._terminalInstance);
        if (colorClass) {
            extraClasses.push(colorClass);
        }
        const uriClasses = getUriClasses(this._terminalInstance, this._themeService.getColorTheme().type);
        if (uriClasses) {
            extraClasses.push(...uriClasses);
        }
        return extraClasses;
    }
    /**
     * Detach the instance from the input such that when the input is disposed it will not dispose
     * of the terminal instance/process.
     */
    detachInstance() {
        if (!this._isShuttingDown) {
            this._terminalInstance?.detachFromElement();
            this._terminalInstance?.setParentContextKeyService(this._contextKeyService);
            this._isDetached = true;
        }
    }
    getDescription() {
        return this._terminalInstance?.description;
    }
    toUntyped() {
        return {
            resource: this.resource,
            options: {
                override: terminalEditorId,
                pinned: true,
                forceReload: true
            }
        };
    }
};
TerminalEditorInput = TerminalEditorInput_1 = __decorate([
    __param(2, IThemeService),
    __param(3, ITerminalInstanceService),
    __param(4, IInstantiationService),
    __param(5, IConfigurationService),
    __param(6, ILifecycleService),
    __param(7, IContextKeyService),
    __param(8, IDialogService)
], TerminalEditorInput);
export { TerminalEditorInput };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxFZGl0b3JJbnB1dC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL2FkdmlrYXIvRG9jdW1lbnRzL2FyY2hpdGVjdC9hcmNoMi9BcmNoSURFL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlcm1pbmFsL2Jyb3dzZXIvdGVybWluYWxFZGl0b3JJbnB1dC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQzlDLE9BQU8sUUFBUSxNQUFNLHFDQUFxQyxDQUFDO0FBQzNELE9BQU8sRUFBRSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sc0NBQXNDLENBQUM7QUFHN0UsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBQ2xGLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNqRSxPQUFPLEVBQUUsV0FBVyxFQUF1QixNQUFNLHVDQUF1QyxDQUFDO0FBQ3pGLE9BQU8sRUFBcUIsd0JBQXdCLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxlQUFlLENBQUM7QUFDOUYsT0FBTyxFQUFFLGFBQWEsRUFBRSxhQUFhLEVBQUUsTUFBTSxtQkFBbUIsQ0FBQztBQUNqRSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNuRyxPQUFPLEVBQXNCLGtCQUFrQixFQUFFLGdCQUFnQixFQUFxQixNQUFNLGtEQUFrRCxDQUFDO0FBRS9JLE9BQU8sRUFBRSxpQkFBaUIsRUFBcUMsTUFBTSxpREFBaUQsQ0FBQztBQUV2SCxPQUFPLEVBQWUsa0JBQWtCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUN2RyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQztBQUNuRyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUN0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