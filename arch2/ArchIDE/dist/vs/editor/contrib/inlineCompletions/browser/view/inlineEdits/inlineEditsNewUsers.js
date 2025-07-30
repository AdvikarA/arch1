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
import { timeout } from '../../../../../../base/common/async.js';
import { BugIndicatingError } from '../../../../../../base/common/errors.js';
import { Disposable, DisposableStore, MutableDisposable } from '../../../../../../base/common/lifecycle.js';
import { autorun, autorunWithStore, derived, observableValue, runOnChange, runOnChangeWithCancellationToken } from '../../../../../../base/common/observable.js';
import { IConfigurationService } from '../../../../../../platform/configuration/common/configuration.js';
import { IStorageService } from '../../../../../../platform/storage/common/storage.js';
var UserKind;
(function (UserKind) {
    UserKind["FirstTime"] = "firstTime";
    UserKind["SecondTime"] = "secondTime";
    UserKind["Active"] = "active";
})(UserKind || (UserKind = {}));
let InlineEditsOnboardingExperience = class InlineEditsOnboardingExperience extends Disposable {
    constructor(_host, _model, _indicator, _collapsedView, _storageService, _configurationService) {
        super();
        this._host = _host;
        this._model = _model;
        this._indicator = _indicator;
        this._collapsedView = _collapsedView;
        this._storageService = _storageService;
        this._configurationService = _configurationService;
        this._disposables = this._register(new MutableDisposable());
        this._setupDone = observableValue({ name: 'setupDone' }, false);
        this._activeCompletionId = derived(reader => {
            const model = this._model.read(reader);
            if (!model) {
                return undefined;
            }
            if (!this._setupDone.read(reader)) {
                return undefined;
            }
            const indicator = this._indicator.read(reader);
            if (!indicator || !indicator.isVisible.read(reader)) {
                return undefined;
            }
            return model.inlineEdit.inlineCompletion.identity.id;
        });
        this._register(this._initializeDebugSetting());
        // Setup the onboarding experience for new users
        this._disposables.value = this.setupNewUserExperience();
        this._setupDone.set(true, undefined);
    }
    setupNewUserExperience() {
        if (this.getNewUserType() === UserKind.Active) {
            return undefined;
        }
        const disposableStore = new DisposableStore();
        let userHasHoveredOverIcon = false;
        let inlineEditHasBeenAccepted = false;
        let firstTimeUserAnimationCount = 0;
        let secondTimeUserAnimationCount = 0;
        // pulse animation for new users
        disposableStore.add(runOnChangeWithCancellationToken(this._activeCompletionId, async (id, _, __, token) => {
            if (id === undefined) {
                return;
            }
            let userType = this.getNewUserType();
            // User Kind Transition
            switch (userType) {
                case UserKind.FirstTime: {
                    if (firstTimeUserAnimationCount++ >= 5 || userHasHoveredOverIcon) {
                        userType = UserKind.SecondTime;
                        this.setNewUserType(userType);
                    }
                    break;
                }
                case UserKind.SecondTime: {
                    if (secondTimeUserAnimationCount++ >= 3 && inlineEditHasBeenAccepted) {
                        userType = UserKind.Active;
                        this.setNewUserType(userType);
                    }
                    break;
                }
            }
            // Animation
            switch (userType) {
                case UserKind.FirstTime: {
                    for (let i = 0; i < 3 && !token.isCancellationRequested; i++) {
                        await this._indicator.get()?.triggerAnimation();
                        await timeout(500);
                    }
                    break;
                }
                case UserKind.SecondTime: {
                    this._indicator.get()?.triggerAnimation();
                    break;
                }
            }
        }));
        disposableStore.add(autorun(reader => {
            if (this._collapsedView.isVisible.read(reader)) {
                if (this.getNewUserType() !== UserKind.Active) {
                    this._collapsedView.triggerAnimation();
                }
            }
        }));
        // Remember when the user has hovered over the icon
        disposableStore.add(autorunWithStore((reader, store) => {
            const indicator = this._indicator.read(reader);
            if (!indicator) {
                return;
            }
            store.add(runOnChange(indicator.isHoveredOverIcon, async (isHovered) => {
                if (isHovered) {
                    userHasHoveredOverIcon = true;
                }
            }));
        }));
        // Remember when the user has accepted an inline edit
        disposableStore.add(autorunWithStore((reader, store) => {
            const host = this._host.read(reader);
            if (!host) {
                return;
            }
            store.add(host.onDidAccept(() => {
                inlineEditHasBeenAccepted = true;
            }));
        }));
        return disposableStore;
    }
    getNewUserType() {
        return this._storageService.get('inlineEditsGutterIndicatorUserKind', -1 /* StorageScope.APPLICATION */, UserKind.FirstTime);
    }
    setNewUserType(value) {
        switch (value) {
            case UserKind.FirstTime:
                throw new BugIndicatingError('UserKind should not be set to first time');
            case UserKind.SecondTime:
                break;
            case UserKind.Active:
                this._disposables.clear();
                break;
        }
        this._storageService.store('inlineEditsGutterIndicatorUserKind', value, -1 /* StorageScope.APPLICATION */, 0 /* StorageTarget.USER */);
    }
    _initializeDebugSetting() {
        // Debug setting to reset the new user experience
        const hiddenDebugSetting = 'editor.inlineSuggest.edits.resetNewUserExperience';
        if (this._configurationService.getValue(hiddenDebugSetting)) {
            this._storageService.remove('inlineEditsGutterIndicatorUserKind', -1 /* StorageScope.APPLICATION */);
        }
        const disposable = this._configurationService.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration(hiddenDebugSetting) && this._configurationService.getValue(hiddenDebugSetting)) {
                this._storageService.remove('inlineEditsGutterIndicatorUserKind', -1 /* StorageScope.APPLICATION */);
                this._disposables.value = this.setupNewUserExperience();
            }
        });
        return disposable;
    }
};
InlineEditsOnboardingExperience = __decorate([
    __param(4, IStorageService),
    __param(5, IConfigurationService)
], InlineEditsOnboardingExperience);
export { InlineEditsOnboardingExperience };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5saW5lRWRpdHNOZXdVc2Vycy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL2FkdmlrYXIvRG9jdW1lbnRzL2FyY2hpdGVjdC9hcmNoMi9BcmNoSURFL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL2lubGluZUNvbXBsZXRpb25zL2Jyb3dzZXIvdmlldy9pbmxpbmVFZGl0cy9pbmxpbmVFZGl0c05ld1VzZXJzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUNqRSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUM3RSxPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBZSxpQkFBaUIsRUFBRSxNQUFNLDRDQUE0QyxDQUFDO0FBQ3pILE9BQU8sRUFBRSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsT0FBTyxFQUFlLGVBQWUsRUFBRSxXQUFXLEVBQUUsZ0NBQWdDLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQztBQUM5SyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxrRUFBa0UsQ0FBQztBQUN6RyxPQUFPLEVBQUUsZUFBZSxFQUErQixNQUFNLHNEQUFzRCxDQUFDO0FBS3BILElBQUssUUFJSjtBQUpELFdBQUssUUFBUTtJQUNaLG1DQUF1QixDQUFBO0lBQ3ZCLHFDQUF5QixDQUFBO0lBQ3pCLDZCQUFpQixDQUFBO0FBQ2xCLENBQUMsRUFKSSxRQUFRLEtBQVIsUUFBUSxRQUlaO0FBRU0sSUFBTSwrQkFBK0IsR0FBckMsTUFBTSwrQkFBZ0MsU0FBUSxVQUFVO0lBa0I5RCxZQUNrQixLQUErQyxFQUMvQyxNQUFpRCxFQUNqRCxVQUErRCxFQUMvRCxjQUF3QyxFQUN4QyxlQUFpRCxFQUMzQyxxQkFBNkQ7UUFFcEYsS0FBSyxFQUFFLENBQUM7UUFQUyxVQUFLLEdBQUwsS0FBSyxDQUEwQztRQUMv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