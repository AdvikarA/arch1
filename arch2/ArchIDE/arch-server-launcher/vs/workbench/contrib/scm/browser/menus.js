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
import { equals } from '../../../../base/common/arrays.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { DisposableStore, dispose } from '../../../../base/common/lifecycle.js';
import './media/scm.css';
import { localize } from '../../../../nls.js';
import { getActionBarActions } from '../../../../platform/actions/browser/menuEntryActionViewItem.js';
import { IMenuService, MenuId, MenuRegistry } from '../../../../platform/actions/common/actions.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ServiceCollection } from '../../../../platform/instantiation/common/serviceCollection.js';
import { ISCMService } from '../common/scm.js';
function actionEquals(a, b) {
    return a.id === b.id;
}
let SCMTitleMenu = class SCMTitleMenu {
    get actions() { return this._actions; }
    get secondaryActions() { return this._secondaryActions; }
    constructor(menuService, contextKeyService) {
        this._actions = [];
        this._secondaryActions = [];
        this._onDidChangeTitle = new Emitter();
        this.onDidChangeTitle = this._onDidChangeTitle.event;
        this.disposables = new DisposableStore();
        this.menu = menuService.createMenu(MenuId.SCMTitle, contextKeyService);
        this.disposables.add(this.menu);
        this.menu.onDidChange(this.updateTitleActions, this, this.disposables);
        this.updateTitleActions();
    }
    updateTitleActions() {
        const { primary, secondary } = getActionBarActions(this.menu.getActions({ shouldForwardArgs: true }));
        if (equals(primary, this._actions, actionEquals) && equals(secondary, this._secondaryActions, actionEquals)) {
            return;
        }
        this._actions = primary;
        this._secondaryActions = secondary;
        this._onDidChangeTitle.fire();
    }
    dispose() {
        this.disposables.dispose();
    }
};
SCMTitleMenu = __decorate([
    __param(0, IMenuService),
    __param(1, IContextKeyService)
], SCMTitleMenu);
export { SCMTitleMenu };
class SCMMenusItem {
    get resourceFolderMenu() {
        if (!this._resourceFolderMenu) {
            this._resourceFolderMenu = this.menuService.createMenu(MenuId.SCMResourceFolderContext, this.contextKeyService);
        }
        return this._resourceFolderMenu;
    }
    constructor(contextKeyService, menuService) {
        this.contextKeyService = contextKeyService;
        this.menuService = menuService;
    }
    getResourceGroupMenu(resourceGroup) {
        if (typeof resourceGroup.contextValue === 'undefined') {
            if (!this.genericResourceGroupMenu) {
                this.genericResourceGroupMenu = this.menuService.createMenu(MenuId.SCMResourceGroupContext, this.contextKeyService);
            }
            return this.genericResourceGroupMenu;
        }
        if (!this.contextualResourceGroupMenus) {
            this.contextualResourceGroupMenus = new Map();
        }
        let item = this.contextualResourceGroupMenus.get(resourceGroup.contextValue);
        if (!item) {
            const contextKeyService = this.contextKeyService.createOverlay([['scmResourceGroupState', resourceGroup.contextValue]]);
            const menu = this.menuService.createMenu(MenuId.SCMResourceGroupContext, contextKeyService);
            item = {
                menu, dispose() {
                    menu.dispose();
                }
            };
            this.contextualResourceGroupMenus.set(resourceGroup.contextValue, item);
        }
        return item.menu;
    }
    getResourceMenu(resource) {
        if (typeof resource.contextValue === 'undefined') {
            if (!this.genericResourceMenu) {
                this.genericResourceMenu = this.menuService.createMenu(MenuId.SCMResourceContext, this.contextKeyService);
            }
            return this.genericResourceMenu;
        }
        if (!this.contextualResourceMenus) {
            this.contextualResourceMenus = new Map();
        }
        let item = this.contextualResourceMenus.get(resource.contextValue);
        if (!item) {
            const contextKeyService = this.contextKeyService.createOverlay([['scmResourceState', resource.contextValue]]);
            const menu = this.menuService.createMenu(MenuId.SCMResourceContext, contextKeyService);
            item = {
                menu, dispose() {
                    menu.dispose();
                }
            };
            this.contextualResourceMenus.set(resource.contextValue, item);
        }
        return item.menu;
    }
    dispose() {
        this.genericResourceGroupMenu?.dispose();
        this.genericResourceMenu?.dispose();
        this._resourceFolderMenu?.dispose();
        if (this.contextualResourceGroupMenus) {
            dispose(this.contextualResourceGroupMenus.values());
            this.contextualResourceGroupMenus.clear();
            this.contextualResourceGroupMenus = undefined;
        }
        if (this.contextualResourceMenus) {
            dispose(this.contextualResourceMenus.values());
            this.contextualResourceMenus.clear();
            this.contextualResourceMenus = undefined;
        }
    }
}
let SCMRepositoryMenus = class SCMRepositoryMenus {
    constructor(provider, contextKeyService, instantiationService, menuService) {
        this.provider = provider;
        this.menuService = menuService;
        this.resourceGroupMenusItems = new Map();
        this.disposables = new DisposableStore();
        this.contextKeyService = contextKeyService.createOverlay([
            ['scmProvider', provider.providerId],
            ['scmProviderRootUri', provider.rootUri?.toString()],
            ['scmProviderHasRootUri', !!provider.rootUri],
        ]);
        const serviceCollection = new ServiceCollection([IContextKeyService, this.contextKeyService]);
        instantiationService = instantiationService.createChild(serviceCollection, this.disposables);
        this.titleMenu = instantiationService.createInstance(SCMTitleMenu);
        this.disposables.add(this.titleMenu);
        provider.onDidChangeResourceGroups(this.onDidChangeResourceGroups, this, this.disposables);
        this.onDidChangeResourceGroups();
    }
    getRepositoryMenu(repository) {
        const contextValue = repository.provider.contextValue.get();
        if (typeof contextValue === 'undefined') {
            if (!this.genericRepositoryMenu) {
                this.genericRepositoryMenu = this.menuService.createMenu(MenuId.SCMSourceControlInline, this.contextKeyService);
            }
            return this.genericRepositoryMenu;
        }
        if (!this.contextualRepositoryMenus) {
            this.contextualRepositoryMenus = new Map();
        }
        let item = this.contextualRepositoryMenus.get(contextValue);
        if (!item) {
            const contextKeyService = this.contextKeyService.createOverlay([['scmProviderContext', contextValue]]);
            const menu = this.menuService.createMenu(MenuId.SCMSourceControlInline, contextKeyService);
            item = {
                menu, dispose() {
                    menu.dispose();
                }
            };
            this.contextualRepositoryMenus.set(contextValue, item);
        }
        return item.menu;
    }
    getRepositoryContextMenu(repository) {
        const contextValue = repository.provider.contextValue.get();
        if (typeof contextValue === 'undefined') {
            if (!this.genericRepositoryContextMenu) {
                this.genericRepositoryContextMenu = this.menuService.createMenu(MenuId.SCMSourceControl, this.contextKeyService);
            }
            return this.genericRepositoryContextMenu;
        }
        if (!this.contextualRepositoryContextMenus) {
            this.contextualRepositoryContextMenus = new Map();
        }
        let item = this.contextualRepositoryContextMenus.get(contextValue);
        if (!item) {
            const contextKeyService = this.contextKeyService.createOverlay([['scmProviderContext', contextValue]]);
            const menu = this.menuService.createMenu(MenuId.SCMSourceControl, contextKeyService);
            item = {
                menu, dispose() {
                    menu.dispose();
                }
            };
            this.contextualRepositoryContextMenus.set(contextValue, item);
        }
        return item.menu;
    }
    getResourceGroupMenu(group) {
        return this.getOrCreateResourceGroupMenusItem(group).getResourceGroupMenu(group);
    }
    getResourceMenu(resource) {
        return this.getOrCreateResourceGroupMenusItem(resource.resourceGroup).getResourceMenu(resource);
    }
    getResourceFolderMenu(group) {
        return this.getOrCreateResourceGroupMenusItem(group).resourceFolderMenu;
    }
    getOrCreateResourceGroupMenusItem(group) {
        let result = this.resourceGroupMenusItems.get(group);
        if (!result) {
            const contextKeyService = this.contextKeyService.createOverlay([
                ['scmResourceGroup', group.id],
                ['multiDiffEditorEnableViewChanges', group.multiDiffEditorEnableViewChanges],
            ]);
            result = new SCMMenusItem(contextKeyService, this.menuService);
            this.resourceGroupMenusItems.set(group, result);
        }
        return result;
    }
    onDidChangeResourceGroups() {
        for (const resourceGroup of this.resourceGroupMenusItems.keys()) {
            if (!this.provider.groups.includes(resourceGroup)) {
                this.resourceGroupMenusItems.get(resourceGroup)?.dispose();
                this.resourceGroupMenusItems.delete(resourceGroup);
            }
        }
    }
    dispose() {
        this.genericRepositoryMenu?.dispose();
        if (this.contextualRepositoryMenus) {
            dispose(this.contextualRepositoryMenus.values());
            this.contextualRepositoryMenus.clear();
            this.contextualRepositoryMenus = undefined;
        }
        this.resourceGroupMenusItems.forEach(item => item.dispose());
        this.disposables.dispose();
    }
};
SCMRepositoryMenus = __decorate([
    __param(1, IContextKeyService),
    __param(2, IInstantiationService),
    __param(3, IMenuService)
], SCMRepositoryMenus);
export { SCMRepositoryMenus };
let SCMMenus = class SCMMenus {
    constructor(scmService, instantiationService) {
        this.instantiationService = instantiationService;
        this.disposables = new DisposableStore();
        this.repositoryMenuDisposables = new DisposableStore();
        this.menus = new Map();
        this.titleMenu = instantiationService.createInstance(SCMTitleMenu);
        scmService.onDidRemoveRepository(this.onDidRemoveRepository, this, this.disposables);
        // Duplicate the `SCMTitle` menu items to the `SCMSourceControlInline` menu. We do this
        // so that menu items can be independently hidden/shown in the "Source Control" and the
        // "Source Control Repositories" views.
        this.disposables.add(Event.runAndSubscribe(MenuRegistry.onDidChangeMenu, e => {
            if (e && !e.has(MenuId.SCMTitle)) {
                return;
            }
            this.repositoryMenuDisposables.clear();
            for (const menuItem of MenuRegistry.getMenuItems(MenuId.SCMTitle)) {
                this.repositoryMenuDisposables.add(MenuRegistry.appendMenuItem(MenuId.SCMSourceControlInline, menuItem));
            }
        }));
    }
    onDidRemoveRepository(repository) {
        const menus = this.menus.get(repository.provider);
        menus?.dispose();
        this.menus.delete(repository.provider);
    }
    getRepositoryMenus(provider) {
        let result = this.menus.get(provider);
        if (!result) {
            const menus = this.instantiationService.createInstance(SCMRepositoryMenus, provider);
            const dispose = () => {
                menus.dispose();
                this.menus.delete(provider);
            };
            result = { menus, dispose };
            this.menus.set(provider, result);
        }
        return result.menus;
    }
    dispose() {
        this.disposables.dispose();
    }
};
SCMMenus = __decorate([
    __param(0, ISCMService),
    __param(1, IInstantiationService)
], SCMMenus);
export { SCMMenus };
MenuRegistry.appendMenuItem(MenuId.SCMResourceContext, {
    title: localize('miShare', "Share"),
    submenu: MenuId.SCMResourceContextShare,
    group: '45_share',
    order: 3,
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWVudXMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9hZHZpa2FyL0RvY3VtZW50cy9hcmNoaXRlY3QvYXJjaDIvQXJjaElERS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9zY20vYnJvd3Nlci9tZW51cy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUdoRyxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDM0QsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUNsRSxPQUFPLEVBQUUsZUFBZSxFQUFlLE9BQU8sRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQzdGLE9BQU8saUJBQWlCLENBQUM7QUFDekIsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBQzlDLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLGlFQUFpRSxDQUFDO0FBQ3RHLE9BQU8sRUFBUyxZQUFZLEVBQUUsTUFBTSxFQUFFLFlBQVksRUFBRSxNQUFNLGdEQUFnRCxDQUFDO0FBQzNHLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHNEQUFzRCxDQUFDO0FBQzFGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFDO0FBQ25HLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGdFQUFnRSxDQUFDO0FBQ25HLE9BQU8sRUFBaUcsV0FBVyxFQUFFLE1BQU0sa0JBQWtCLENBQUM7QUFFOUksU0FBUyxZQUFZLENBQUMsQ0FBVSxFQUFFLENBQVU7SUFDM0MsT0FBTyxDQUFDLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUM7QUFDdEIsQ0FBQztBQUVNLElBQU0sWUFBWSxHQUFsQixNQUFNLFlBQVk7SUFHeEIsSUFBSSxPQUFPLEtBQWdCLE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUM7SUFH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