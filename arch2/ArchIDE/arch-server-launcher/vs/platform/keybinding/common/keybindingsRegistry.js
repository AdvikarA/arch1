/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { decodeKeybinding } from '../../../base/common/keybindings.js';
import { OS } from '../../../base/common/platform.js';
import { CommandsRegistry } from '../../commands/common/commands.js';
import { Registry } from '../../registry/common/platform.js';
import { combinedDisposable, DisposableStore, toDisposable } from '../../../base/common/lifecycle.js';
import { LinkedList } from '../../../base/common/linkedList.js';
export var KeybindingWeight;
(function (KeybindingWeight) {
    KeybindingWeight[KeybindingWeight["EditorCore"] = 0] = "EditorCore";
    KeybindingWeight[KeybindingWeight["EditorContrib"] = 100] = "EditorContrib";
    KeybindingWeight[KeybindingWeight["WorkbenchContrib"] = 200] = "WorkbenchContrib";
    KeybindingWeight[KeybindingWeight["BuiltinExtension"] = 300] = "BuiltinExtension";
    KeybindingWeight[KeybindingWeight["ExternalExtension"] = 400] = "ExternalExtension";
})(KeybindingWeight || (KeybindingWeight = {}));
/**
 * Stores all built-in and extension-provided keybindings (but not ones that user defines themselves)
 */
class KeybindingsRegistryImpl {
    constructor() {
        this._coreKeybindings = new LinkedList();
        this._extensionKeybindings = [];
        this._cachedMergedKeybindings = null;
    }
    /**
     * Take current platform into account and reduce to primary & secondary.
     */
    static bindToCurrentPlatform(kb) {
        if (OS === 1 /* OperatingSystem.Windows */) {
            if (kb && kb.win) {
                return kb.win;
            }
        }
        else if (OS === 2 /* OperatingSystem.Macintosh */) {
            if (kb && kb.mac) {
                return kb.mac;
            }
        }
        else {
            if (kb && kb.linux) {
                return kb.linux;
            }
        }
        return kb;
    }
    registerKeybindingRule(rule) {
        const actualKb = KeybindingsRegistryImpl.bindToCurrentPlatform(rule);
        const result = new DisposableStore();
        if (actualKb && actualKb.primary) {
            const kk = decodeKeybinding(actualKb.primary, OS);
            if (kk) {
                result.add(this._registerDefaultKeybinding(kk, rule.id, rule.args, rule.weight, 0, rule.when));
            }
        }
        if (actualKb && Array.isArray(actualKb.secondary)) {
            for (let i = 0, len = actualKb.secondary.length; i < len; i++) {
                const k = actualKb.secondary[i];
                const kk = decodeKeybinding(k, OS);
                if (kk) {
                    result.add(this._registerDefaultKeybinding(kk, rule.id, rule.args, rule.weight, -i - 1, rule.when));
                }
            }
        }
        return result;
    }
    setExtensionKeybindings(rules) {
        const result = [];
        let keybindingsLen = 0;
        for (const rule of rules) {
            if (rule.keybinding) {
                result[keybindingsLen++] = {
                    keybinding: rule.keybinding,
                    command: rule.id,
                    commandArgs: rule.args,
                    when: rule.when,
                    weight1: rule.weight,
                    weight2: 0,
                    extensionId: rule.extensionId || null,
                    isBuiltinExtension: rule.isBuiltinExtension || false
                };
            }
        }
        this._extensionKeybindings = result;
        this._cachedMergedKeybindings = null;
    }
    registerCommandAndKeybindingRule(desc) {
        return combinedDisposable(this.registerKeybindingRule(desc), CommandsRegistry.registerCommand(desc));
    }
    _registerDefaultKeybinding(keybinding, commandId, commandArgs, weight1, weight2, when) {
        const remove = this._coreKeybindings.push({
            keybinding: keybinding,
            command: commandId,
            commandArgs: commandArgs,
            when: when,
            weight1: weight1,
            weight2: weight2,
            extensionId: null,
            isBuiltinExtension: false
        });
        this._cachedMergedKeybindings = null;
        return toDisposable(() => {
            remove();
            this._cachedMergedKeybindings = null;
        });
    }
    getDefaultKeybindings() {
        if (!this._cachedMergedKeybindings) {
            this._cachedMergedKeybindings = Array.from(this._coreKeybindings).concat(this._extensionKeybindings);
            this._cachedMergedKeybindings.sort(sorter);
        }
        return this._cachedMergedKeybindings.slice(0);
    }
}
export const KeybindingsRegistry = new KeybindingsRegistryImpl();
// Define extension point ids
export const Extensions = {
    EditorModes: 'platform.keybindingsRegistry'
};
Registry.add(Extensions.EditorModes, KeybindingsRegistry);
function sorter(a, b) {
    if (a.weight1 !== b.weight1) {
        return a.weight1 - b.weight1;
    }
    if (a.command && b.command) {
        if (a.command < b.command) {
            return -1;
        }
        if (a.command > b.command) {
            return 1;
        }
    }
    return a.weight2 - b.weight2;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoia2V5YmluZGluZ3NSZWdpc3RyeS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL2FkdmlrYXIvRG9jdW1lbnRzL2FyY2hpdGVjdC9hcmNoMi9BcmNoSURFL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL2tleWJpbmRpbmcvY29tbW9uL2tleWJpbmRpbmdzUmVnaXN0cnkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLGdCQUFnQixFQUFjLE1BQU0scUNBQXFDLENBQUM7QUFDbkYsT0FBTyxFQUFtQixFQUFFLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQztBQUN2RSxPQUFPLEVBQUUsZ0JBQWdCLEVBQXFDLE1BQU0sbUNBQW1DLENBQUM7QUFFeEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQzdELE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxlQUFlLEVBQWUsWUFBWSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDbkgsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBa0RoRSxNQUFNLENBQU4sSUFBa0IsZ0JBTWpCO0FBTkQsV0FBa0IsZ0JBQWdCO0lBQ2pDLG1FQUFjLENBQUE7SUFDZCwyRUFBbUIsQ0FBQTtJQUNuQixpRkFBc0IsQ0FBQTtJQUN0QixpRkFBc0IsQ0FBQTtJQUN0QixtRkFBdUIsQ0FBQTtBQUN4QixDQUFDLEVBTmlCLGdCQUFnQixLQUFoQixnQkFBZ0IsUUFNakM7QUFjRDs7R0FFRztBQUNILE1BQU0sdUJBQXVCO0lBTTVCO1FBQ0MsSUFBSSxDQUFDLGdCQUFnQixHQUFHLElBQUksVUFBVSxFQUFFLENBQUM7UUFDekMsSUFBSSxDQUFDLHFCQUFxQixHQUFHLEVBQUUsQ0FBQztRQUNoQyxJQUFJLENBQUMsd0JBQXdCLEdBQUcsSUFBSSxDQUFDO0lBQ3RDLENBQUM7SUFFRDs7T0FFRztJQUNLLE1BQU0sQ0FBQyxxQkFBcUIsQ0FBQyxFQUFn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