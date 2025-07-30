/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as arrays from '../../../base/common/arrays.js';
import * as objects from '../../../base/common/objects.js';
import * as platform from '../../../base/common/platform.js';
import { EDITOR_MODEL_DEFAULTS } from '../core/misc/textModelDefaults.js';
import { USUAL_WORD_SEPARATORS } from '../core/wordHelper.js';
import * as nls from '../../../nls.js';
/**
 * Configuration options for auto indentation in the editor
 */
export var EditorAutoIndentStrategy;
(function (EditorAutoIndentStrategy) {
    EditorAutoIndentStrategy[EditorAutoIndentStrategy["None"] = 0] = "None";
    EditorAutoIndentStrategy[EditorAutoIndentStrategy["Keep"] = 1] = "Keep";
    EditorAutoIndentStrategy[EditorAutoIndentStrategy["Brackets"] = 2] = "Brackets";
    EditorAutoIndentStrategy[EditorAutoIndentStrategy["Advanced"] = 3] = "Advanced";
    EditorAutoIndentStrategy[EditorAutoIndentStrategy["Full"] = 4] = "Full";
})(EditorAutoIndentStrategy || (EditorAutoIndentStrategy = {}));
/**
 * @internal
 * The width of the minimap gutter, in pixels.
 */
export const MINIMAP_GUTTER_WIDTH = 8;
//#endregion
/**
 * An event describing that the configuration of the editor has changed.
 */
export class ConfigurationChangedEvent {
    /**
     * @internal
     */
    constructor(values) {
        this._values = values;
    }
    hasChanged(id) {
        return this._values[id];
    }
}
/**
 * @internal
 */
export class ComputeOptionsMemory {
    constructor() {
        this.stableMinimapLayoutInput = null;
        this.stableFitMaxMinimapScale = 0;
        this.stableFitRemainingWidth = 0;
    }
}
/**
 * @internal
 */
class BaseEditorOption {
    constructor(id, name, defaultValue, schema) {
        this.id = id;
        this.name = name;
        this.defaultValue = defaultValue;
        this.schema = schema;
    }
    applyUpdate(value, update) {
        return applyUpdate(value, update);
    }
    compute(env, options, value) {
        return value;
    }
}
export class ApplyUpdateResult {
    constructor(newValue, didChange) {
        this.newValue = newValue;
        this.didChange = didChange;
    }
}
function applyUpdate(value, update) {
    if (typeof value !== 'object' || typeof update !== 'object' || !value || !update) {
        return new ApplyUpdateResult(update, value !== update);
    }
    if (Array.isArray(value) || Array.isArray(update)) {
        const arrayEquals = Array.isArray(value) && Array.isArray(update) && arrays.equals(value, update);
        return new ApplyUpdateResult(update, !arrayEquals);
    }
    let didChange = false;
    for (const key in update) {
        if (update.hasOwnProperty(key)) {
            const result = applyUpdate(value[key], update[key]);
            if (result.didChange) {
                value[key] = result.newValue;
                didChange = true;
            }
        }
    }
    return new ApplyUpdateResult(value, didChange);
}
/**
 * @internal
 */
class ComputedEditorOption {
    constructor(id) {
        this.schema = undefined;
        this.id = id;
        this.name = '_never_';
        this.defaultValue = undefined;
    }
    applyUpdate(value, update) {
        return applyUpdate(value, update);
    }
    validate(input) {
        return this.defaultValue;
    }
}
class SimpleEditorOption {
    constructor(id, name, defaultValue, schema) {
        this.id = id;
        this.name = name;
        this.defaultValue = defaultValue;
        this.schema = schema;
    }
    applyUpdate(value, update) {
        return applyUpdate(value, update);
    }
    validate(input) {
        if (typeof input === 'undefined') {
            return this.defaultValue;
        }
        return input;
    }
    compute(env, options, value) {
        return value;
    }
}
/**
 * @internal
 */
export function boolean(value, defaultValue) {
    if (typeof value === 'undefined') {
        return defaultValue;
    }
    if (value === 'false') {
        // treat the string 'false' as false
        return false;
    }
    return Boolean(value);
}
class EditorBooleanOption extends SimpleEditorOption {
    constructor(id, name, defaultValue, schema = undefined) {
        if (typeof schema !== 'undefined') {
            schema.type = 'boolean';
            schema.default = defaultValue;
        }
        super(id, name, defaultValue, schema);
    }
    validate(input) {
        return boolean(input, this.defaultValue);
    }
}
/**
 * @internal
 */
export function clampedInt(value, defaultValue, minimum, maximum) {
    if (typeof value === 'undefined') {
        return defaultValue;
    }
    let r = parseInt(value, 10);
    if (isNaN(r)) {
        return defaultValue;
    }
    r = Math.max(minimum, r);
    r = Math.min(maximum, r);
    return r | 0;
}
class EditorIntOption extends SimpleEditorOption {
    static clampedInt(value, defaultValue, minimum, maximum) {
        return clampedInt(value, defaultValue, minimum, maximum);
    }
    constructor(id, name, defaultValue, minimum, maximum, schema = undefined) {
        if (typeof schema !== 'undefined') {
            schema.type = 'integer';
            schema.default = defaultValue;
            schema.minimum = minimum;
            schema.maximum = maximum;
        }
        super(id, name, defaultValue, schema);
        this.minimum = minimum;
        this.maximum = maximum;
    }
    validate(input) {
        return EditorIntOption.clampedInt(input, this.defaultValue, this.minimum, this.maximum);
    }
}
/**
 * @internal
 */
export function clampedFloat(value, defaultValue, minimum, maximum) {
    if (typeof value === 'undefined') {
        return defaultValue;
    }
    const r = EditorFloatOption.float(value, defaultValue);
    return EditorFloatOption.clamp(r, minimum, maximum);
}
class EditorFloatOption extends SimpleEditorOption {
    static clamp(n, min, max) {
        if (n < min) {
            return min;
        }
        if (n > max) {
            return max;
        }
        return n;
    }
    static float(value, defaultValue) {
        if (typeof value === 'number') {
            return value;
        }
        if (typeof value === 'undefined') {
            return defaultValue;
        }
        const r = parseFloat(value);
        return (isNaN(r) ? defaultValue : r);
    }
    constructor(id, name, defaultValue, validationFn, schema, minimum, maximum) {
        if (typeof schema !== 'undefined') {
            schema.type = 'number';
            schema.default = defaultValue;
            schema.minimum = minimum;
            schema.maximum = maximum;
        }
        super(id, name, defaultValue, schema);
        this.validationFn = validationFn;
        this.minimum = minimum;
        this.maximum = maximum;
    }
    validate(input) {
        return this.validationFn(EditorFloatOption.float(input, this.defaultValue));
    }
}
class EditorStringOption extends SimpleEditorOption {
    static string(value, defaultValue) {
        if (typeof value !== 'string') {
            return defaultValue;
        }
        return value;
    }
    constructor(id, name, defaultValue, schema = undefined) {
        if (typeof schema !== 'undefined') {
            schema.type = 'string';
            schema.default = defaultValue;
        }
        super(id, name, defaultValue, schema);
    }
    validate(input) {
        return EditorStringOption.string(input, this.defaultValue);
    }
}
/**
 * @internal
 */
export function stringSet(value, defaultValue, allowedValues, renamedValues) {
    if (typeof value !== 'string') {
        return defaultValue;
    }
    if (renamedValues && value in renamedValues) {
        return renamedValues[value];
    }
    if (allowedValues.indexOf(value) === -1) {
        return defaultValue;
    }
    return value;
}
class EditorStringEnumOption extends SimpleEditorOption {
    constructor(id, name, defaultValue, allowedValues, schema = undefined) {
        if (typeof schema !== 'undefined') {
            schema.type = 'string';
            schema.enum = allowedValues;
            schema.default = defaultValue;
        }
        super(id, name, defaultValue, schema);
        this._allowedValues = allowedValues;
    }
    validate(input) {
        return stringSet(input, this.defaultValue, this._allowedValues);
    }
}
class EditorEnumOption extends BaseEditorOption {
    constructor(id, name, defaultValue, defaultStringValue, allowedValues, convert, schema = undefined) {
        if (typeof schema !== 'undefined') {
            schema.type = 'string';
            schema.enum = allowedValues;
            schema.default = defaultStringValue;
        }
        super(id, name, defaultValue, schema);
        this._allowedValues = allowedValues;
        this._convert = convert;
    }
    validate(input) {
        if (typeof input !== 'string') {
            return this.defaultValue;
        }
        if (this._allowedValues.indexOf(input) === -1) {
            return this.defaultValue;
        }
        return this._convert(input);
    }
}
//#endregion
//#region autoIndent
function _autoIndentFromString(autoIndent) {
    switch (autoIndent) {
        case 'none': return 0 /* EditorAutoIndentStrategy.None */;
        case 'keep': return 1 /* EditorAutoIndentStrategy.Keep */;
        case 'brackets': return 2 /* EditorAutoIndentStrategy.Brackets */;
        case 'advanced': return 3 /* EditorAutoIndentStrategy.Advanced */;
        case 'full': return 4 /* EditorAutoIndentStrategy.Full */;
    }
}
//#endregion
//#region accessibilitySupport
class EditorAccessibilitySupport extends BaseEditorOption {
    constructor() {
        super(2 /* EditorOption.accessibilitySupport */, 'accessibilitySupport', 0 /* AccessibilitySupport.Unknown */, {
            type: 'string',
            enum: ['auto', 'on', 'off'],
            enumDescriptions: [
                nls.localize('accessibilitySupport.auto', "Use platform APIs to detect when a Screen Reader is attached."),
                nls.localize('accessibilitySupport.on', "Optimize for usage with a Screen Reader."),
                nls.localize('accessibilitySupport.off', "Assume a screen reader is not attached."),
            ],
            default: 'auto',
            tags: ['accessibility'],
            description: nls.localize('accessibilitySupport', "Controls if the UI should run in a mode where it is optimized for screen readers.")
        });
    }
    validate(input) {
        switch (input) {
            case 'auto': return 0 /* AccessibilitySupport.Unknown */;
            case 'off': return 1 /* AccessibilitySupport.Disabled */;
            case 'on': return 2 /* AccessibilitySupport.Enabled */;
        }
        return this.defaultValue;
    }
    compute(env, options, value) {
        if (value === 0 /* AccessibilitySupport.Unknown */) {
            // The editor reads the `accessibilitySupport` from the environment
            return env.accessibilitySupport;
        }
        return value;
    }
}
class EditorComments extends BaseEditorOption {
    constructor() {
        const defaults = {
            insertSpace: true,
            ignoreEmptyLines: true,
        };
        super(29 /* EditorOption.comments */, 'comments', defaults, {
            'editor.comments.insertSpace': {
                type: 'boolean',
                default: defaults.insertSpace,
                description: nls.localize('comments.insertSpace', "Controls whether a space character is inserted when commenting.")
            },
            'editor.comments.ignoreEmptyLines': {
                type: 'boolean',
                default: defaults.ignoreEmptyLines,
                description: nls.localize('comments.ignoreEmptyLines', 'Controls if empty lines should be ignored with toggle, add or remove actions for line comments.')
            },
        });
    }
    validate(_input) {
        if (!_input || typeof _input !== 'object') {
            return this.defaultValue;
        }
        const input = _input;
        return {
            insertSpace: boolean(input.insertSpace, this.defaultValue.insertSpace),
            ignoreEmptyLines: boolean(input.ignoreEmptyLines, this.defaultValue.ignoreEmptyLines),
        };
    }
}
//#endregion
//#region cursorBlinking
/**
 * The kind of animation in which the editor's cursor should be rendered.
 */
export var TextEditorCursorBlinkingStyle;
(function (TextEditorCursorBlinkingStyle) {
    /**
     * Hidden
     */
    TextEditorCursorBlinkingStyle[TextEditorCursorBlinkingStyle["Hidden"] = 0] = "Hidden";
    /**
     * Blinking
     */
    TextEditorCursorBlinkingStyle[TextEditorCursorBlinkingStyle["Blink"] = 1] = "Blink";
    /**
     * Blinking with smooth fading
     */
    TextEditorCursorBlinkingStyle[TextEditorCursorBlinkingStyle["Smooth"] = 2] = "Smooth";
    /**
     * Blinking with prolonged filled state and smooth fading
     */
    TextEditorCursorBlinkingStyle[TextEditorCursorBlinkingStyle["Phase"] = 3] = "Phase";
    /**
     * Expand collapse animation on the y axis
     */
    TextEditorCursorBlinkingStyle[TextEditorCursorBlinkingStyle["Expand"] = 4] = "Expand";
    /**
     * No-Blinking
     */
    TextEditorCursorBlinkingStyle[TextEditorCursorBlinkingStyle["Solid"] = 5] = "Solid";
})(TextEditorCursorBlinkingStyle || (TextEditorCursorBlinkingStyle = {}));
/**
 * @internal
 */
export function cursorBlinkingStyleFromString(cursorBlinkingStyle) {
    switch (cursorBlinkingStyle) {
        case 'blink': return 1 /* TextEditorCursorBlinkingStyle.Blink */;
        case 'smooth': return 2 /* TextEditorCursorBlinkingStyle.Smooth */;
        case 'phase': return 3 /* TextEditorCursorBlinkingStyle.Phase */;
        case 'expand': return 4 /* TextEditorCursorBlinkingStyle.Expand */;
        case 'solid': return 5 /* TextEditorCursorBlinkingStyle.Solid */;
    }
}
//#endregion
//#region cursorStyle
/**
 * The style in which the editor's cursor should be rendered.
 */
export var TextEditorCursorStyle;
(function (TextEditorCursorStyle) {
    /**
     * As a vertical line (sitting between two characters).
     */
    TextEditorCursorStyle[TextEditorCursorStyle["Line"] = 1] = "Line";
    /**
     * As a block (sitting on top of a character).
     */
    TextEditorCursorStyle[TextEditorCursorStyle["Block"] = 2] = "Block";
    /**
     * As a horizontal line (sitting under a character).
     */
    TextEditorCursorStyle[TextEditorCursorStyle["Underline"] = 3] = "Underline";
    /**
     * As a thin vertical line (sitting between two characters).
     */
    TextEditorCursorStyle[TextEditorCursorStyle["LineThin"] = 4] = "LineThin";
    /**
     * As an outlined block (sitting on top of a character).
     */
    TextEditorCursorStyle[TextEditorCursorStyle["BlockOutline"] = 5] = "BlockOutline";
    /**
     * As a thin horizontal line (sitting under a character).
     */
    TextEditorCursorStyle[TextEditorCursorStyle["UnderlineThin"] = 6] = "UnderlineThin";
})(TextEditorCursorStyle || (TextEditorCursorStyle = {}));
/**
 * @internal
 */
export function cursorStyleToString(cursorStyle) {
    switch (cursorStyle) {
        case TextEditorCursorStyle.Line: return 'line';
        case TextEditorCursorStyle.Block: return 'block';
        case TextEditorCursorStyle.Underline: return 'underline';
        case TextEditorCursorStyle.LineThin: return 'line-thin';
        case TextEditorCursorStyle.BlockOutline: return 'block-outline';
        case TextEditorCursorStyle.UnderlineThin: return 'underline-thin';
    }
}
/**
 * @internal
 */
export function cursorStyleFromString(cursorStyle) {
    switch (cursorStyle) {
        case 'line': return TextEditorCursorStyle.Line;
        case 'block': return TextEditorCursorStyle.Block;
        case 'underline': return TextEditorCursorStyle.Underline;
        case 'line-thin': return TextEditorCursorStyle.LineThin;
        case 'block-outline': return TextEditorCursorStyle.BlockOutline;
        case 'underline-thin': return TextEditorCursorStyle.UnderlineThin;
    }
}
//#endregion
//#region editorClassName
class EditorClassName extends ComputedEditorOption {
    constructor() {
        super(161 /* EditorOption.editorClassName */);
    }
    compute(env, options, _) {
        const classNames = ['monaco-editor'];
        if (options.get(48 /* EditorOption.extraEditorClassName */)) {
            classNames.push(options.get(48 /* EditorOption.extraEditorClassName */));
        }
        if (env.extraEditorClassName) {
            classNames.push(env.extraEditorClassName);
        }
        if (options.get(82 /* EditorOption.mouseStyle */) === 'default') {
            classNames.push('mouse-default');
        }
        else if (options.get(82 /* EditorOption.mouseStyle */) === 'copy') {
            classNames.push('mouse-copy');
        }
        if (options.get(126 /* EditorOption.showUnused */)) {
            classNames.push('showUnused');
        }
        if (options.get(156 /* EditorOption.showDeprecated */)) {
            classNames.push('showDeprecated');
        }
        return classNames.join(' ');
    }
}
//#endregion
//#region emptySelectionClipboard
class EditorEmptySelectionClipboard extends EditorBooleanOption {
    constructor() {
        super(45 /* EditorOption.emptySelectionClipboard */, 'emptySelectionClipboard', true, { description: nls.localize('emptySelectionClipboard', "Controls whether copying without a selection copies the current line.") });
    }
    compute(env, options, value) {
        return value && env.emptySelectionClipboard;
    }
}
class EditorFind extends BaseEditorOption {
    constructor() {
        const defaults = {
            cursorMoveOnType: true,
            findOnType: true,
            seedSearchStringFromSelection: 'always',
            autoFindInSelection: 'never',
            globalFindClipboard: false,
            addExtraSpaceOnTop: true,
            loop: true,
            history: 'workspace',
            replaceHistory: 'workspace',
        };
        super(50 /* EditorOption.find */, 'find', defaults, {
            'editor.find.cursorMoveOnType': {
                type: 'boolean',
                default: defaults.cursorMoveOnType,
                description: nls.localize('find.cursorMoveOnType', "Controls whether the cursor should jump to find matches while typing.")
            },
            'editor.find.seedSearchStringFromSelection': {
                type: 'string',
                enum: ['never', 'always', 'selection'],
                default: defaults.seedSearchStringFromSelection,
                enumDescriptions: [
                    nls.localize('editor.find.seedSearchStringFromSelection.never', 'Never seed search string from the editor selection.'),
                    nls.localize('editor.find.seedSearchStringFromSelection.always', 'Always seed search string from the editor selection, including word at cursor position.'),
                    nls.localize('editor.find.seedSearchStringFromSelection.selection', 'Only seed search string from the editor selection.')
                ],
                description: nls.localize('find.seedSearchStringFromSelection', "Controls whether the search string in the Find Widget is seeded from the editor selection.")
            },
            'editor.find.autoFindInSelection': {
                type: 'string',
                enum: ['never', 'always', 'multiline'],
                default: defaults.autoFindInSelection,
                enumDescriptions: [
                    nls.localize('editor.find.autoFindInSelection.never', 'Never turn on Find in Selection automatically (default).'),
                    nls.localize('editor.find.autoFindInSelection.always', 'Always turn on Find in Selection automatically.'),
                    nls.localize('editor.find.autoFindInSelection.multiline', 'Turn on Find in Selection automatically when multiple lines of content are selected.')
                ],
                description: nls.localize('find.autoFindInSelection', "Controls the condition for turning on Find in Selection automatically.")
            },
            'editor.find.globalFindClipboard': {
                type: 'boolean',
                default: defaults.globalFindClipboard,
                description: nls.localize('find.globalFindClipboard', "Controls whether the Find Widget should read or modify the shared find clipboard on macOS."),
                included: platform.isMacintosh
            },
            'editor.find.addExtraSpaceOnTop': {
                type: 'boolean',
                default: defaults.addExtraSpaceOnTop,
                description: nls.localize('find.addExtraSpaceOnTop', "Controls whether the Find Widget should add extra lines on top of the editor. When true, you can scroll beyond the first line when the Find Widget is visible.")
            },
            'editor.find.loop': {
                type: 'boolean',
                default: defaults.loop,
                description: nls.localize('find.loop', "Controls whether the search automatically restarts from the beginning (or the end) when no further matches can be found.")
            },
            'editor.find.history': {
                type: 'string',
                enum: ['never', 'workspace'],
                default: 'workspace',
                enumDescriptions: [
                    nls.localize('editor.find.history.never', 'Do not store search history from the find widget.'),
                    nls.localize('editor.find.history.workspace', 'Store search history across the active workspace'),
                ],
                description: nls.localize('find.history', "Controls how the find widget history should be stored")
            },
            'editor.find.replaceHistory': {
                type: 'string',
                enum: ['never', 'workspace'],
                default: 'workspace',
                enumDescriptions: [
                    nls.localize('editor.find.replaceHistory.never', 'Do not store history from the replace widget.'),
                    nls.localize('editor.find.replaceHistory.workspace', 'Store replace history across the active workspace'),
                ],
                description: nls.localize('find.replaceHistory', "Controls how the replace widget history should be stored")
            },
            'editor.find.findOnType': {
                type: 'boolean',
                default: defaults.findOnType,
                description: nls.localize('find.findOnType', "Controls whether the Find Widget should search as you type.")
            },
        });
    }
    validate(_input) {
        if (!_input || typeof _input !== 'object') {
            return this.defaultValue;
        }
        const input = _input;
        return {
            cursorMoveOnType: boolean(input.cursorMoveOnType, this.defaultValue.cursorMoveOnType),
            findOnType: boolean(input.findOnType, this.defaultValue.findOnType),
            seedSearchStringFromSelection: typeof _input.seedSearchStringFromSelection === 'boolean'
                ? (_input.seedSearchStringFromSelection ? 'always' : 'never')
                : stringSet(input.seedSearchStringFromSelection, this.defaultValue.seedSearchStringFromSelection, ['never', 'always', 'selection']),
            autoFindInSelection: typeof _input.autoFindInSelection === 'boolean'
                ? (_input.autoFindInSelection ? 'always' : 'never')
                : stringSet(input.autoFindInSelection, this.defaultValue.autoFindInSelection, ['never', 'always', 'multiline']),
            globalFindClipboard: boolean(input.globalFindClipboard, this.defaultValue.globalFindClipboard),
            addExtraSpaceOnTop: boolean(input.addExtraSpaceOnTop, this.defaultValue.addExtraSpaceOnTop),
            loop: boolean(input.loop, this.defaultValue.loop),
            history: stringSet(input.history, this.defaultValue.history, ['never', 'workspace']),
            replaceHistory: stringSet(input.replaceHistory, this.defaultValue.replaceHistory, ['never', 'workspace']),
        };
    }
}
//#endregion
//#region fontLigatures
/**
 * @internal
 */
export class EditorFontLigatures extends BaseEditorOption {
    static { this.OFF = '"liga" off, "calt" off'; }
    static { this.ON = '"liga" on, "calt" on'; }
    constructor() {
        super(60 /* EditorOption.fontLigatures */, 'fontLigatures', EditorFontLigatures.OFF, {
            anyOf: [
                {
                    type: 'boolean',
                    description: nls.localize('fontLigatures', "Enables/Disables font ligatures ('calt' and 'liga' font features). Change this to a string for fine-grained control of the 'font-feature-settings' CSS property."),
                },
                {
                    type: 'string',
                    description: nls.localize('fontFeatureSettings', "Explicit 'font-feature-settings' CSS property. A boolean can be passed instead if one only needs to turn on/off ligatures.")
                }
            ],
            description: nls.localize('fontLigaturesGeneral', "Configures font ligatures or font features. Can be either a boolean to enable/disable ligatures or a string for the value of the CSS 'font-feature-settings' property."),
            default: false
        });
    }
    validate(input) {
        if (typeof input === 'undefined') {
            return this.defaultValue;
        }
        if (typeof input === 'string') {
            if (input === 'false' || input.length === 0) {
                return EditorFontLigatures.OFF;
            }
            if (input === 'true') {
                return EditorFontLigatures.ON;
            }
            return input;
        }
        if (Boolean(input)) {
            return EditorFontLigatures.ON;
        }
        return EditorFontLigatures.OFF;
    }
}
//#endregion
//#region fontVariations
/**
 * @internal
 */
export class EditorFontVariations extends BaseEditorOption {
    // Text is laid out using default settings.
    static { this.OFF = 'normal'; }
    // Translate `fontWeight` config to the `font-variation-settings` CSS property.
    static { this.TRANSLATE = 'translate'; }
    constructor() {
        super(63 /* EditorOption.fontVariations */, 'fontVariations', EditorFontVariations.OFF, {
            anyOf: [
                {
                    type: 'boolean',
                    description: nls.localize('fontVariations', "Enables/Disables the translation from font-weight to font-variation-settings. Change this to a string for fine-grained control of the 'font-variation-settings' CSS property."),
                },
                {
                    type: 'string',
                    description: nls.localize('fontVariationSettings', "Explicit 'font-variation-settings' CSS property. A boolean can be passed instead if one only needs to translate font-weight to font-variation-settings.")
                }
            ],
            description: nls.localize('fontVariationsGeneral', "Configures font variations. Can be either a boolean to enable/disable the translation from font-weight to font-variation-settings or a string for the value of the CSS 'font-variation-settings' property."),
            default: false
        });
    }
    validate(input) {
        if (typeof input === 'undefined') {
            return this.defaultValue;
        }
        if (typeof input === 'string') {
            if (input === 'false') {
                return EditorFontVariations.OFF;
            }
            if (input === 'true') {
                return EditorFontVariations.TRANSLATE;
            }
            return input;
        }
        if (Boolean(input)) {
            return EditorFontVariations.TRANSLATE;
        }
        return EditorFontVariations.OFF;
    }
    compute(env, options, value) {
        // The value is computed from the fontWeight if it is true.
        // So take the result from env.fontInfo
        return env.fontInfo.fontVariationSettings;
    }
}
//#endregion
//#region fontInfo
class EditorFontInfo extends ComputedEditorOption {
    constructor() {
        super(59 /* EditorOption.fontInfo */);
    }
    compute(env, options, _) {
        return env.fontInfo;
    }
}
//#endregion
//#region effectiveCursorStyle
class EffectiveCursorStyle extends ComputedEditorOption {
    constructor() {
        super(160 /* EditorOption.effectiveCursorStyle */);
    }
    compute(env, options, _) {
        return env.inputMode === 'overtype' ?
            options.get(91 /* EditorOption.overtypeCursorStyle */) :
            options.get(34 /* EditorOption.cursorStyle */);
    }
}
//#endregion
//#region effectiveExperimentalEditContext
class EffectiveEditContextEnabled extends ComputedEditorOption {
    constructor() {
        super(169 /* EditorOption.effectiveEditContext */);
    }
    compute(env, options) {
        return env.editContextSupported && options.get(44 /* EditorOption.editContext */);
    }
}
//#endregion
//#region effectiveAllowVariableFonts
class EffectiveAllowVariableFonts extends ComputedEditorOption {
    constructor() {
        super(171 /* EditorOption.effectiveAllowVariableFonts */);
    }
    compute(env, options) {
        const accessibilitySupport = env.accessibilitySupport;
        if (accessibilitySupport === 2 /* AccessibilitySupport.Enabled */) {
            return options.get(7 /* EditorOption.allowVariableFontsInAccessibilityMode */);
        }
        else {
            return options.get(6 /* EditorOption.allowVariableFonts */);
        }
    }
}
//#engregion
//#region fontSize
class EditorFontSize extends SimpleEditorOption {
    constructor() {
        super(61 /* EditorOption.fontSize */, 'fontSize', EDITOR_FONT_DEFAULTS.fontSize, {
            type: 'number',
            minimum: 6,
            maximum: 100,
            default: EDITOR_FONT_DEFAULTS.fontSize,
            description: nls.localize('fontSize', "Controls the font size in pixels.")
        });
    }
    validate(input) {
        const r = EditorFloatOption.float(input, this.defaultValue);
        if (r === 0) {
            return EDITOR_FONT_DEFAULTS.fontSize;
        }
        return EditorFloatOption.clamp(r, 6, 100);
    }
    compute(env, options, value) {
        // The final fontSize respects the editor zoom level.
        // So take the result from env.fontInfo
        return env.fontInfo.fontSize;
    }
}
//#endregion
//#region fontWeight
class EditorFontWeight extends BaseEditorOption {
    static { this.SUGGESTION_VALUES = ['normal', 'bold', '100', '200', '300', '400', '500', '600', '700', '800', '900']; }
    static { this.MINIMUM_VALUE = 1; }
    static { this.MAXIMUM_VALUE = 1000; }
    constructor() {
        super(62 /* EditorOption.fontWeight */, 'fontWeight', EDITOR_FONT_DEFAULTS.fontWeight, {
            anyOf: [
                {
                    type: 'number',
                    minimum: EditorFontWeight.MINIMUM_VALUE,
                    maximum: EditorFontWeight.MAXIMUM_VALUE,
                    errorMessage: nls.localize('fontWeightErrorMessage', "Only \"normal\" and \"bold\" keywords or numbers between 1 and 1000 are allowed.")
                },
                {
                    type: 'string',
                    pattern: '^(normal|bold|1000|[1-9][0-9]{0,2})$'
                },
                {
                    enum: EditorFontWeight.SUGGESTION_VALUES
                }
            ],
            default: EDITOR_FONT_DEFAULTS.fontWeight,
            description: nls.localize('fontWeight', "Controls the font weight. Accepts \"normal\" and \"bold\" keywords or numbers between 1 and 1000.")
        });
    }
    validate(input) {
        if (input === 'normal' || input === 'bold') {
            return input;
        }
        return String(EditorIntOption.clampedInt(input, EDITOR_FONT_DEFAULTS.fontWeight, EditorFontWeight.MINIMUM_VALUE, EditorFontWeight.MAXIMUM_VALUE));
    }
}
class EditorGoToLocation extends BaseEditorOption {
    constructor() {
        const defaults = {
            multiple: 'peek',
            multipleDefinitions: 'peek',
            multipleTypeDefinitions: 'peek',
            multipleDeclarations: 'peek',
            multipleImplementations: 'peek',
            multipleReferences: 'peek',
            multipleTests: 'peek',
            alternativeDefinitionCommand: 'editor.action.goToReferences',
            alternativeTypeDefinitionCommand: 'editor.action.goToReferences',
            alternativeDeclarationCommand: 'editor.action.goToReferences',
            alternativeImplementationCommand: '',
            alternativeReferenceCommand: '',
            alternativeTestsCommand: '',
        };
        const jsonSubset = {
            type: 'string',
            enum: ['peek', 'gotoAndPeek', 'goto'],
            default: defaults.multiple,
            enumDescriptions: [
                nls.localize('editor.gotoLocation.multiple.peek', 'Show Peek view of the results (default)'),
                nls.localize('editor.gotoLocation.multiple.gotoAndPeek', 'Go to the primary result and show a Peek view'),
                nls.localize('editor.gotoLocation.multiple.goto', 'Go to the primary result and enable Peek-less navigation to others')
            ]
        };
        const alternativeCommandOptions = ['', 'editor.action.referenceSearch.trigger', 'editor.action.goToReferences', 'editor.action.peekImplementation', 'editor.action.goToImplementation', 'editor.action.peekTypeDefinition', 'editor.action.goToTypeDefinition', 'editor.action.peekDeclaration', 'editor.action.revealDeclaration', 'editor.action.peekDefinition', 'editor.action.revealDefinitionAside', 'editor.action.revealDefinition'];
        super(67 /* EditorOption.gotoLocation */, 'gotoLocation', defaults, {
            'editor.gotoLocation.multiple': {
                deprecationMessage: nls.localize('editor.gotoLocation.multiple.deprecated', "This setting is deprecated, please use separate settings like 'editor.editor.gotoLocation.multipleDefinitions' or 'editor.editor.gotoLocation.multipleImplementations' instead."),
            },
            'editor.gotoLocation.multipleDefinitions': {
                description: nls.localize('editor.editor.gotoLocation.multipleDefinitions', "Controls the behavior the 'Go to Definition'-command when multiple target locations exist."),
                ...jsonSubset,
            },
            'editor.gotoLocation.multipleTypeDefinitions': {
                description: nls.localize('editor.editor.gotoLocation.multipleTypeDefinitions', "Controls the behavior the 'Go to Type Definition'-command when multiple target locations exist."),
                ...jsonSubset,
            },
            'editor.gotoLocation.multipleDeclarations': {
                description: nls.localize('editor.editor.gotoLocation.multipleDeclarations', "Controls the behavior the 'Go to Declaration'-command when multiple target locations exist."),
                ...jsonSubset,
            },
            'editor.gotoLocation.multipleImplementations': {
                description: nls.localize('editor.editor.gotoLocation.multipleImplemenattions', "Controls the behavior the 'Go to Implementations'-command when multiple target locations exist."),
                ...jsonSubset,
            },
            'editor.gotoLocation.multipleReferences': {
                description: nls.localize('editor.editor.gotoLocation.multipleReferences', "Controls the behavior the 'Go to References'-command when multiple target locations exist."),
                ...jsonSubset,
            },
            'editor.gotoLocation.alternativeDefinitionCommand': {
                type: 'string',
                default: defaults.alternativeDefinitionCommand,
                enum: alternativeCommandOptions,
                description: nls.localize('alternativeDefinitionCommand', "Alternative command id that is being executed when the result of 'Go to Definition' is the current location.")
            },
            'editor.gotoLocation.alternativeTypeDefinitionCommand': {
                type: 'string',
                default: defaults.alternativeTypeDefinitionCommand,
                enum: alternativeCommandOptions,
                description: nls.localize('alternativeTypeDefinitionCommand', "Alternative command id that is being executed when the result of 'Go to Type Definition' is the current location.")
            },
            'editor.gotoLocation.alternativeDeclarationCommand': {
                type: 'string',
                default: defaults.alternativeDeclarationCommand,
                enum: alternativeCommandOptions,
                description: nls.localize('alternativeDeclarationCommand', "Alternative command id that is being executed when the result of 'Go to Declaration' is the current location.")
            },
            'editor.gotoLocation.alternativeImplementationCommand': {
                type: 'string',
                default: defaults.alternativeImplementationCommand,
                enum: alternativeCommandOptions,
                description: nls.localize('alternativeImplementationCommand', "Alternative command id that is being executed when the result of 'Go to Implementation' is the current location.")
            },
            'editor.gotoLocation.alternativeReferenceCommand': {
                type: 'string',
                default: defaults.alternativeReferenceCommand,
                enum: alternativeCommandOptions,
                description: nls.localize('alternativeReferenceCommand', "Alternative command id that is being executed when the result of 'Go to Reference' is the current location.")
            },
        });
    }
    validate(_input) {
        if (!_input || typeof _input !== 'object') {
            return this.defaultValue;
        }
        const input = _input;
        return {
            multiple: stringSet(input.multiple, this.defaultValue.multiple, ['peek', 'gotoAndPeek', 'goto']),
            multipleDefinitions: input.multipleDefinitions ?? stringSet(input.multipleDefinitions, 'peek', ['peek', 'gotoAndPeek', 'goto']),
            multipleTypeDefinitions: input.multipleTypeDefinitions ?? stringSet(input.multipleTypeDefinitions, 'peek', ['peek', 'gotoAndPeek', 'goto']),
            multipleDeclarations: input.multipleDeclarations ?? stringSet(input.multipleDeclarations, 'peek', ['peek', 'gotoAndPeek', 'goto']),
            multipleImplementations: input.multipleImplementations ?? stringSet(input.multipleImplementations, 'peek', ['peek', 'gotoAndPeek', 'goto']),
            multipleReferences: input.multipleReferences ?? stringSet(input.multipleReferences, 'peek', ['peek', 'gotoAndPeek', 'goto']),
            multipleTests: input.multipleTests ?? stringSet(input.multipleTests, 'peek', ['peek', 'gotoAndPeek', 'goto']),
            alternativeDefinitionCommand: EditorStringOption.string(input.alternativeDefinitionCommand, this.defaultValue.alternativeDefinitionCommand),
            alternativeTypeDefinitionCommand: EditorStringOption.string(input.alternativeTypeDefinitionCommand, this.defaultValue.alternativeTypeDefinitionCommand),
            alternativeDeclarationCommand: EditorStringOption.string(input.alternativeDeclarationCommand, this.defaultValue.alternativeDeclarationCommand),
            alternativeImplementationCommand: EditorStringOption.string(input.alternativeImplementationCommand, this.defaultValue.alternativeImplementationCommand),
            alternativeReferenceCommand: EditorStringOption.string(input.alternativeReferenceCommand, this.defaultValue.alternativeReferenceCommand),
            alternativeTestsCommand: EditorStringOption.string(input.alternativeTestsCommand, this.defaultValue.alternativeTestsCommand),
        };
    }
}
class EditorHover extends BaseEditorOption {
    constructor() {
        const defaults = {
            enabled: true,
            delay: 300,
            hidingDelay: 300,
            sticky: true,
            above: true,
        };
        super(69 /* EditorOption.hover */, 'hover', defaults, {
            'editor.hover.enabled': {
                type: 'boolean',
                default: defaults.enabled,
                description: nls.localize('hover.enabled', "Controls whether the hover is shown.")
            },
            'editor.hover.delay': {
                type: 'number',
                default: defaults.delay,
                minimum: 0,
                maximum: 10000,
                description: nls.localize('hover.delay', "Controls the delay in milliseconds after which the hover is shown.")
            },
            'editor.hover.sticky': {
                type: 'boolean',
                default: defaults.sticky,
                description: nls.localize('hover.sticky', "Controls whether the hover should remain visible when mouse is moved over it.")
            },
            'editor.hover.hidingDelay': {
                type: 'integer',
                minimum: 0,
                default: defaults.hidingDelay,
                description: nls.localize('hover.hidingDelay', "Controls the delay in milliseconds after which the hover is hidden. Requires `editor.hover.sticky` to be enabled.")
            },
            'editor.hover.above': {
                type: 'boolean',
                default: defaults.above,
                description: nls.localize('hover.above', "Prefer showing hovers above the line, if there's space.")
            },
        });
    }
    validate(_input) {
        if (!_input || typeof _input !== 'object') {
            return this.defaultValue;
        }
        const input = _input;
        return {
            enabled: boolean(input.enabled, this.defaultValue.enabled),
            delay: EditorIntOption.clampedInt(input.delay, this.defaultValue.delay, 0, 10000),
            sticky: boolean(input.sticky, this.defaultValue.sticky),
            hidingDelay: EditorIntOption.clampedInt(input.hidingDelay, this.defaultValue.hidingDelay, 0, 600000),
            above: boolean(input.above, this.defaultValue.above),
        };
    }
}
export var RenderMinimap;
(function (RenderMinimap) {
    RenderMinimap[RenderMinimap["None"] = 0] = "None";
    RenderMinimap[RenderMinimap["Text"] = 1] = "Text";
    RenderMinimap[RenderMinimap["Blocks"] = 2] = "Blocks";
})(RenderMinimap || (RenderMinimap = {}));
/**
 * @internal
 */
export class EditorLayoutInfoComputer extends ComputedEditorOption {
    constructor() {
        super(164 /* EditorOption.layoutInfo */);
    }
    compute(env, options, _) {
        return EditorLayoutInfoComputer.computeLayout(options, {
            memory: env.memory,
            outerWidth: env.outerWidth,
            outerHeight: env.outerHeight,
            isDominatedByLongLines: env.isDominatedByLongLines,
            lineHeight: env.fontInfo.lineHeight,
            viewLineCount: env.viewLineCount,
            lineNumbersDigitCount: env.lineNumbersDigitCount,
            typicalHalfwidthCharacterWidth: env.fontInfo.typicalHalfwidthCharacterWidth,
            maxDigitWidth: env.fontInfo.maxDigitWidth,
            pixelRatio: env.pixelRatio,
            glyphMarginDecorationLaneCount: env.glyphMarginDecorationLaneCount
        });
    }
    static computeContainedMinimapLineCount(input) {
        const typicalViewportLineCount = input.height / input.lineHeight;
        const extraLinesBeforeFirstLine = Math.floor(input.paddingTop / input.lineHeight);
        let extraLinesBeyondLastLine = Math.floor(input.paddingBottom / input.lineHeight);
        if (input.scrollBeyondLastLine) {
            extraLinesBeyondLastLine = Math.max(extraLinesBeyondLastLine, typicalViewportLineCount - 1);
        }
        const desiredRatio = (extraLinesBeforeFirstLine + input.viewLineCount + extraLinesBeyondLastLine) / (input.pixelRatio * input.height);
        const minimapLineCount = Math.floor(input.viewLineCount / desiredRatio);
        return { typicalViewportLineCount, extraLinesBeforeFirstLine, extraLinesBeyondLastLine, desiredRatio, minimapLineCount };
    }
    static _computeMinimapLayout(input, memory) {
        const outerWidth = input.outerWidth;
        const outerHeight = input.outerHeight;
        const pixelRatio = input.pixelRatio;
        if (!input.minimap.enabled) {
            return {
                renderMinimap: 0 /* RenderMinimap.None */,
                minimapLeft: 0,
                minimapWidth: 0,
                minimapHeightIsEditorHeight: false,
                minimapIsSampling: false,
                minimapScale: 1,
                minimapLineHeight: 1,
                minimapCanvasInnerWidth: 0,
                minimapCanvasInnerHeight: Math.floor(pixelRatio * outerHeight),
                minimapCanvasOuterWidth: 0,
                minimapCanvasOuterHeight: outerHeight,
            };
        }
        // Can use memory if only the `viewLineCount` and `remainingWidth` have changed
        const stableMinimapLayoutInput = memory.stableMinimapLayoutInput;
        const couldUseMemory = (stableMinimapLayoutInput
            // && input.outerWidth === lastMinimapLayoutInput.outerWidth !!! INTENTIONAL OMITTED
            && input.outerHeight === stableMinimapLayoutInput.outerHeight
            && input.lineHeight === stableMinimapLayoutInput.lineHeight
            && input.typicalHalfwidthCharacterWidth === stableMinimapLayoutInput.typicalHalfwidthCharacterWidth
            && input.pixelRatio === stableMinimapLayoutInput.pixelRatio
            && input.scrollBeyondLastLine === stableMinimapLayoutInput.scrollBeyondLastLine
            && input.paddingTop === stableMinimapLayoutInput.paddingTop
            && input.paddingBottom === stableMinimapLayoutInput.paddingBottom
            && input.minimap.enabled === stableMinimapLayoutInput.minimap.enabled
            && input.minimap.side === stableMinimapLayoutInput.minimap.side
            && input.minimap.size === stableMinimapLayoutInput.minimap.size
            && input.minimap.showSlider === stableMinimapLayoutInput.minimap.showSlider
            && input.minimap.renderCharacters === stableMinimapLayoutInput.minimap.renderCharacters
            && input.minimap.maxColumn === stableMinimapLayoutInput.minimap.maxColumn
            && input.minimap.scale === stableMinimapLayoutInput.minimap.scale
            && input.verticalScrollbarWidth === stableMinimapLayoutInput.verticalScrollbarWidth
            // && input.viewLineCount === lastMinimapLayoutInput.viewLineCount !!! INTENTIONAL OMITTED
            // && input.remainingWidth === lastMinimapLayoutInput.remainingWidth !!! INTENTIONAL OMITTED
            && input.isViewportWrapping === stableMinimapLayoutInput.isViewportWrapping);
        const lineHeight = input.lineHeight;
        const typicalHalfwidthCharacterWidth = input.typicalHalfwidthCharacterWidth;
        const scrollBeyondLastLine = input.scrollBeyondLastLine;
        const minimapRenderCharacters = input.minimap.renderCharacters;
        let minimapScale = (pixelRatio >= 2 ? Math.round(input.minimap.scale * 2) : input.minimap.scale);
        const minimapMaxColumn = input.minimap.maxColumn;
        const minimapSize = input.minimap.size;
        const minimapSide = input.minimap.side;
        const verticalScrollbarWidth = input.verticalScrollbarWidth;
        const viewLineCount = input.viewLineCount;
        const remainingWidth = input.remainingWidth;
        const isViewportWrapping = input.isViewportWrapping;
        const baseCharHeight = minimapRenderCharacters ? 2 : 3;
        let minimapCanvasInnerHeight = Math.floor(pixelRatio * outerHeight);
        const minimapCanvasOuterHeight = minimapCanvasInnerHeight / pixelRatio;
        let minimapHeightIsEditorHeight = false;
        let minimapIsSampling = false;
        let minimapLineHeight = baseCharHeight * minimapScale;
        let minimapCharWidth = minimapScale / pixelRatio;
        let minimapWidthMultiplier = 1;
        if (minimapSize === 'fill' || minimapSize === 'fit') {
            const { typicalViewportLineCount, extraLinesBeforeFirstLine, extraLinesBeyondLastLine, desiredRatio, minimapLineCount } = EditorLayoutInfoComputer.computeContainedMinimapLineCount({
                viewLineCount: viewLineCount,
                scrollBeyondLastLine: scrollBeyondLastLine,
                paddingTop: input.paddingTop,
                paddingBottom: input.paddingBottom,
                height: outerHeight,
                lineHeight: lineHeight,
                pixelRatio: pixelRatio
            });
            // ratio is intentionally not part of the layout to avoid the layout changing all the time
            // when doing sampling
            const ratio = viewLineCount / minimapLineCount;
            if (ratio > 1) {
                minimapHeightIsEditorHeight = true;
                minimapIsSampling = true;
                minimapScale = 1;
                minimapLineHeight = 1;
                minimapCharWidth = minimapScale / pixelRatio;
            }
            else {
                let fitBecomesFill = false;
                let maxMinimapScale = minimapScale + 1;
                if (minimapSize === 'fit') {
                    const effectiveMinimapHeight = Math.ceil((extraLinesBeforeFirstLine + viewLineCount + extraLinesBeyondLastLine) * minimapLineHeight);
                    if (isViewportWrapping && couldUseMemory && remainingWidth <= memory.stableFitRemainingWidth) {
                        // There is a loop when using `fit` and viewport wrapping:
                        // - view line count impacts minimap layout
                        // - minimap layout impacts viewport width
                        // - viewport width impacts view line count
                        // To break the loop, once we go to a smaller minimap scale, we try to stick with it.
                        fitBecomesFill = true;
                        maxMinimapScale = memory.stableFitMaxMinimapScale;
                    }
                    else {
                        fitBecomesFill = (effectiveMinimapHeight > minimapCanvasInnerHeight);
                    }
                }
                if (minimapSize === 'fill' || fitBecomesFill) {
                    minimapHeightIsEditorHeight = true;
                    const configuredMinimapScale = minimapScale;
                    minimapLineHeight = Math.min(lineHeight * pixelRatio, Math.max(1, Math.floor(1 / desiredRatio)));
                    if (isViewportWrapping && couldUseMemory && remainingWidth <= memory.stableFitRemainingWidth) {
                        // There is a loop when using `fill` and viewport wrapping:
                        // - view line count impacts minimap layout
                        // - minimap layout impacts viewport width
                        // - viewport width impacts view line count
                        // To break the loop, once we go to a smaller minimap scale, we try to stick with it.
                        maxMinimapScale = memory.stableFitMaxMinimapScale;
                    }
                    minimapScale = Math.min(maxMinimapScale, Math.max(1, Math.floor(minimapLineHeight / baseCharHeight)));
                    if (minimapScale > configuredMinimapScale) {
                        minimapWidthMultiplier = Math.min(2, minimapScale / configuredMinimapScale);
                    }
                    minimapCharWidth = minimapScale / pixelRatio / minimapWidthMultiplier;
                    minimapCanvasInnerHeight = Math.ceil((Math.max(typicalViewportLineCount, extraLinesBeforeFirstLine + viewLineCount + extraLinesBeyondLastLine)) * minimapLineHeight);
                    if (isViewportWrapping) {
                        // remember for next time
                        memory.stableMinimapLayoutInput = input;
                        memory.stableFitRemainingWidth = remainingWidth;
                        memory.stableFitMaxMinimapScale = minimapScale;
                    }
                    else {
                        memory.stableMinimapLayoutInput = null;
                        memory.stableFitRemainingWidth = 0;
                    }
                }
            }
        }
        // Given:
        // (leaving 2px for the cursor to have space after the last character)
        // viewportColumn = (contentWidth - verticalScrollbarWidth - 2) / typicalHalfwidthCharacterWidth
        // minimapWidth = viewportColumn * minimapCharWidth
        // contentWidth = remainingWidth - minimapWidth
        // What are good values for contentWidth and minimapWidth ?
        // minimapWidth = ((contentWidth - verticalScrollbarWidth - 2) / typicalHalfwidthCharacterWidth) * minimapCharWidth
        // typicalHalfwidthCharacterWidth * minimapWidth = (contentWidth - verticalScrollbarWidth - 2) * minimapCharWidth
        // typicalHalfwidthCharacterWidth * minimapWidth = (remainingWidth - minimapWidth - verticalScrollbarWidth - 2) * minimapCharWidth
        // (typicalHalfwidthCharacterWidth + minimapCharWidth) * minimapWidth = (remainingWidth - verticalScrollbarWidth - 2) * minimapCharWidth
        // minimapWidth = ((remainingWidth - verticalScrollbarWidth - 2) * minimapCharWidth) / (typicalHalfwidthCharacterWidth + minimapCharWidth)
        const minimapMaxWidth = Math.floor(minimapMaxColumn * minimapCharWidth);
        const minimapWidth = Math.min(minimapMaxWidth, Math.max(0, Math.floor(((remainingWidth - verticalScrollbarWidth - 2) * minimapCharWidth) / (typicalHalfwidthCharacterWidth + minimapCharWidth))) + MINIMAP_GUTTER_WIDTH);
        let minimapCanvasInnerWidth = Math.floor(pixelRatio * minimapWidth);
        const minimapCanvasOuterWidth = minimapCanvasInnerWidth / pixelRatio;
        minimapCanvasInnerWidth = Math.floor(minimapCanvasInnerWidth * minimapWidthMultiplier);
        const renderMinimap = (minimapRenderCharacters ? 1 /* RenderMinimap.Text */ : 2 /* RenderMinimap.Blocks */);
        const minimapLeft = (minimapSide === 'left' ? 0 : (outerWidth - minimapWidth - verticalScrollbarWidth));
        return {
            renderMinimap,
            minimapLeft,
            minimapWidth,
            minimapHeightIsEditorHeight,
            minimapIsSampling,
            minimapScale,
            minimapLineHeight,
            minimapCanvasInnerWidth,
            minimapCanvasInnerHeight,
            minimapCanvasOuterWidth,
            minimapCanvasOuterHeight,
        };
    }
    static computeLayout(options, env) {
        const outerWidth = env.outerWidth | 0;
        const outerHeight = env.outerHeight | 0;
        const lineHeight = env.lineHeight | 0;
        const lineNumbersDigitCount = env.lineNumbersDigitCount | 0;
        const typicalHalfwidthCharacterWidth = env.typicalHalfwidthCharacterWidth;
        const maxDigitWidth = env.maxDigitWidth;
        const pixelRatio = env.pixelRatio;
        const viewLineCount = env.viewLineCount;
        const wordWrapOverride2 = options.get(153 /* EditorOption.wordWrapOverride2 */);
        const wordWrapOverride1 = (wordWrapOverride2 === 'inherit' ? options.get(152 /* EditorOption.wordWrapOverride1 */) : wordWrapOverride2);
        const wordWrap = (wordWrapOverride1 === 'inherit' ? options.get(148 /* EditorOption.wordWrap */) : wordWrapOverride1);
        const wordWrapColumn = options.get(151 /* EditorOption.wordWrapColumn */);
        const isDominatedByLongLines = env.isDominatedByLongLines;
        const showGlyphMargin = options.get(66 /* EditorOption.glyphMargin */);
        const showLineNumbers = (options.get(76 /* EditorOption.lineNumbers */).renderType !== 0 /* RenderLineNumbersType.Off */);
        const lineNumbersMinChars = options.get(77 /* EditorOption.lineNumbersMinChars */);
        const scrollBeyondLastLine = options.get(118 /* EditorOption.scrollBeyondLastLine */);
        const padding = options.get(95 /* EditorOption.padding */);
        const minimap = options.get(81 /* EditorOption.minimap */);
        const scrollbar = options.get(116 /* EditorOption.scrollbar */);
        const verticalScrollbarWidth = scrollbar.verticalScrollbarSize;
        const verticalScrollbarHasArrows = scrollbar.verticalHasArrows;
        const scrollbarArrowSize = scrollbar.arrowSize;
        const horizontalScrollbarHeight = scrollbar.horizontalScrollbarSize;
        const folding = options.get(52 /* EditorOption.folding */);
        const showFoldingDecoration = options.get(125 /* EditorOption.showFoldingControls */) !== 'never';
        let lineDecorationsWidth = options.get(74 /* EditorOption.lineDecorationsWidth */);
        if (folding && showFoldingDecoration) {
            lineDecorationsWidth += 16;
        }
        let lineNumbersWidth = 0;
        if (showLineNumbers) {
            const digitCount = Math.max(lineNumbersDigitCount, lineNumbersMinChars);
            lineNumbersWidth = Math.round(digitCount * maxDigitWidth);
        }
        let glyphMarginWidth = 0;
        if (showGlyphMargin) {
            glyphMarginWidth = lineHeight * env.glyphMarginDecorationLaneCount;
        }
        let glyphMarginLeft = 0;
        let lineNumbersLeft = glyphMarginLeft + glyphMarginWidth;
        let decorationsLeft = lineNumbersLeft + lineNumbersWidth;
        let contentLeft = decorationsLeft + lineDecorationsWidth;
        const remainingWidth = outerWidth - glyphMarginWidth - lineNumbersWidth - lineDecorationsWidth;
        let isWordWrapMinified = false;
        let isViewportWrapping = false;
        let wrappingColumn = -1;
        if (options.get(2 /* EditorOption.accessibilitySupport */) === 2 /* AccessibilitySupport.Enabled */ && wordWrapOverride1 === 'inherit' && isDominatedByLongLines) {
            // Force viewport width wrapping if model is dominated by long lines
            isWordWrapMinified = true;
            isViewportWrapping = true;
        }
        else if (wordWrap === 'on' || wordWrap === 'bounded') {
            isViewportWrapping = true;
        }
        else if (wordWrap === 'wordWrapColumn') {
            wrappingColumn = wordWrapColumn;
        }
        const minimapLayout = EditorLayoutInfoComputer._computeMinimapLayout({
            outerWidth: outerWidth,
            outerHeight: outerHeight,
            lineHeight: lineHeight,
            typicalHalfwidthCharacterWidth: typicalHalfwidthCharacterWidth,
            pixelRatio: pixelRatio,
            scrollBeyondLastLine: scrollBeyondLastLine,
            paddingTop: padding.top,
            paddingBottom: padding.bottom,
            minimap: minimap,
            verticalScrollbarWidth: verticalScrollbarWidth,
            viewLineCount: viewLineCount,
            remainingWidth: remainingWidth,
            isViewportWrapping: isViewportWrapping,
        }, env.memory || new ComputeOptionsMemory());
        if (minimapLayout.renderMinimap !== 0 /* RenderMinimap.None */ && minimapLayout.minimapLeft === 0) {
            // the minimap is rendered to the left, so move everything to the right
            glyphMarginLeft += minimapLayout.minimapWidth;
            lineNumbersLeft += minimapLayout.minimapWidth;
            decorationsLeft += minimapLayout.minimapWidth;
            contentLeft += minimapLayout.minimapWidth;
        }
        const contentWidth = remainingWidth - minimapLayout.minimapWidth;
        // (leaving 2px for the cursor to have space after the last character)
        const viewportColumn = Math.max(1, Math.floor((contentWidth - verticalScrollbarWidth - 2) / typicalHalfwidthCharacterWidth));
        const verticalArrowSize = (verticalScrollbarHasArrows ? scrollbarArrowSize : 0);
        if (isViewportWrapping) {
            // compute the actual wrappingColumn
            wrappingColumn = Math.max(1, viewportColumn);
            if (wordWrap === 'bounded') {
                wrappingColumn = Math.min(wrappingColumn, wordWrapColumn);
            }
        }
        return {
            width: outerWidth,
            height: outerHeight,
            glyphMarginLeft: glyphMarginLeft,
            glyphMarginWidth: glyphMarginWidth,
            glyphMarginDecorationLaneCount: env.glyphMarginDecorationLaneCount,
            lineNumbersLeft: lineNumbersLeft,
            lineNumbersWidth: lineNumbersWidth,
            decorationsLeft: decorationsLeft,
            decorationsWidth: lineDecorationsWidth,
            contentLeft: contentLeft,
            contentWidth: contentWidth,
            minimap: minimapLayout,
            viewportColumn: viewportColumn,
            isWordWrapMinified: isWordWrapMinified,
            isViewportWrapping: isViewportWrapping,
            wrappingColumn: wrappingColumn,
            verticalScrollbarWidth: verticalScrollbarWidth,
            horizontalScrollbarHeight: horizontalScrollbarHeight,
            overviewRuler: {
                top: verticalArrowSize,
                width: verticalScrollbarWidth,
                height: (outerHeight - 2 * verticalArrowSize),
                right: 0
            }
        };
    }
}
//#endregion
//#region WrappingStrategy
class WrappingStrategy extends BaseEditorOption {
    constructor() {
        super(155 /* EditorOption.wrappingStrategy */, 'wrappingStrategy', 'simple', {
            'editor.wrappingStrategy': {
                enumDescriptions: [
                    nls.localize('wrappingStrategy.simple', "Assumes that all characters are of the same width. This is a fast algorithm that works correctly for monospace fonts and certain scripts (like Latin characters) where glyphs are of equal width."),
                    nls.localize('wrappingStrategy.advanced', "Delegates wrapping points computation to the browser. This is a slow algorithm, that might cause freezes for large files, but it works correctly in all cases.")
                ],
                type: 'string',
                enum: ['simple', 'advanced'],
                default: 'simple',
                description: nls.localize('wrappingStrategy', "Controls the algorithm that computes wrapping points. Note that when in accessibility mode, advanced will be used for the best experience.")
            }
        });
    }
    validate(input) {
        return stringSet(input, 'simple', ['simple', 'advanced']);
    }
    compute(env, options, value) {
        const accessibilitySupport = options.get(2 /* EditorOption.accessibilitySupport */);
        if (accessibilitySupport === 2 /* AccessibilitySupport.Enabled */) {
            // if we know for a fact that a screen reader is attached, we switch our strategy to advanced to
            // help that the editor's wrapping points match the textarea's wrapping points
            return 'advanced';
        }
        return value;
    }
}
//#endregion
//#region lightbulb
export var ShowLightbulbIconMode;
(function (ShowLightbulbIconMode) {
    ShowLightbulbIconMode["Off"] = "off";
    ShowLightbulbIconMode["OnCode"] = "onCode";
    ShowLightbulbIconMode["On"] = "on";
})(ShowLightbulbIconMode || (ShowLightbulbIconMode = {}));
class EditorLightbulb extends BaseEditorOption {
    constructor() {
        const defaults = { enabled: ShowLightbulbIconMode.OnCode };
        super(73 /* EditorOption.lightbulb */, 'lightbulb', defaults, {
            'editor.lightbulb.enabled': {
                type: 'string',
                enum: [ShowLightbulbIconMode.Off, ShowLightbulbIconMode.OnCode, ShowLightbulbIconMode.On],
                default: defaults.enabled,
                enumDescriptions: [
                    nls.localize('editor.lightbulb.enabled.off', 'Disable the code action menu.'),
                    nls.localize('editor.lightbulb.enabled.onCode', 'Show the code action menu when the cursor is on lines with code.'),
                    nls.localize('editor.lightbulb.enabled.on', 'Show the code action menu when the cursor is on lines with code or on empty lines.'),
                ],
                description: nls.localize('enabled', "Enables the Code Action lightbulb in the editor.")
            }
        });
    }
    validate(_input) {
        if (!_input || typeof _input !== 'object') {
            return this.defaultValue;
        }
        const input = _input;
        return {
            enabled: stringSet(input.enabled, this.defaultValue.enabled, [ShowLightbulbIconMode.Off, ShowLightbulbIconMode.OnCode, ShowLightbulbIconMode.On])
        };
    }
}
class EditorStickyScroll extends BaseEditorOption {
    constructor() {
        const defaults = { enabled: true, maxLineCount: 5, defaultModel: 'outlineModel', scrollWithEditor: true };
        super(130 /* EditorOption.stickyScroll */, 'stickyScroll', defaults, {
            'editor.stickyScroll.enabled': {
                type: 'boolean',
                default: defaults.enabled,
                description: nls.localize('editor.stickyScroll.enabled', "Shows the nested current scopes during the scroll at the top of the editor.")
            },
            'editor.stickyScroll.maxLineCount': {
                type: 'number',
                default: defaults.maxLineCount,
                minimum: 1,
                maximum: 20,
                description: nls.localize('editor.stickyScroll.maxLineCount', "Defines the maximum number of sticky lines to show.")
            },
            'editor.stickyScroll.defaultModel': {
                type: 'string',
                enum: ['outlineModel', 'foldingProviderModel', 'indentationModel'],
                default: defaults.defaultModel,
                description: nls.localize('editor.stickyScroll.defaultModel', "Defines the model to use for determining which lines to stick. If the outline model does not exist, it will fall back on the folding provider model which falls back on the indentation model. This order is respected in all three cases.")
            },
            'editor.stickyScroll.scrollWithEditor': {
                type: 'boolean',
                default: defaults.scrollWithEditor,
                description: nls.localize('editor.stickyScroll.scrollWithEditor', "Enable scrolling of Sticky Scroll with the editor's horizontal scrollbar.")
            },
        });
    }
    validate(_input) {
        if (!_input || typeof _input !== 'object') {
            return this.defaultValue;
        }
        const input = _input;
        return {
            enabled: boolean(input.enabled, this.defaultValue.enabled),
            maxLineCount: EditorIntOption.clampedInt(input.maxLineCount, this.defaultValue.maxLineCount, 1, 20),
            defaultModel: stringSet(input.defaultModel, this.defaultValue.defaultModel, ['outlineModel', 'foldingProviderModel', 'indentationModel']),
            scrollWithEditor: boolean(input.scrollWithEditor, this.defaultValue.scrollWithEditor)
        };
    }
}
class EditorInlayHints extends BaseEditorOption {
    constructor() {
        const defaults = { enabled: 'on', fontSize: 0, fontFamily: '', padding: false, maximumLength: 43 };
        super(158 /* EditorOption.inlayHints */, 'inlayHints', defaults, {
            'editor.inlayHints.enabled': {
                type: 'string',
                default: defaults.enabled,
                description: nls.localize('inlayHints.enable', "Enables the inlay hints in the editor."),
                enum: ['on', 'onUnlessPressed', 'offUnlessPressed', 'off'],
                markdownEnumDescriptions: [
                    nls.localize('editor.inlayHints.on', "Inlay hints are enabled"),
                    nls.localize('editor.inlayHints.onUnlessPressed', "Inlay hints are showing by default and hide when holding {0}", platform.isMacintosh ? `Ctrl+Option` : `Ctrl+Alt`),
                    nls.localize('editor.inlayHints.offUnlessPressed', "Inlay hints are hidden by default and show when holding {0}", platform.isMacintosh ? `Ctrl+Option` : `Ctrl+Alt`),
                    nls.localize('editor.inlayHints.off', "Inlay hints are disabled"),
                ],
            },
            'editor.inlayHints.fontSize': {
                type: 'number',
                default: defaults.fontSize,
                markdownDescription: nls.localize('inlayHints.fontSize', "Controls font size of inlay hints in the editor. As default the {0} is used when the configured value is less than {1} or greater than the editor font size.", '`#editor.fontSize#`', '`5`')
            },
            'editor.inlayHints.fontFamily': {
                type: 'string',
                default: defaults.fontFamily,
                markdownDescription: nls.localize('inlayHints.fontFamily', "Controls font family of inlay hints in the editor. When set to empty, the {0} is used.", '`#editor.fontFamily#`')
            },
            'editor.inlayHints.padding': {
                type: 'boolean',
                default: defaults.padding,
                description: nls.localize('inlayHints.padding', "Enables the padding around the inlay hints in the editor.")
            },
            'editor.inlayHints.maximumLength': {
                type: 'number',
                default: defaults.maximumLength,
                markdownDescription: nls.localize('inlayHints.maximumLength', "Maximum overall length of inlay hints, for a single line, before they get truncated by the editor. Set to `0` to never truncate")
            }
        });
    }
    validate(_input) {
        if (!_input || typeof _input !== 'object') {
            return this.defaultValue;
        }
        const input = _input;
        if (typeof input.enabled === 'boolean') {
            input.enabled = input.enabled ? 'on' : 'off';
        }
        return {
            enabled: stringSet(input.enabled, this.defaultValue.enabled, ['on', 'off', 'offUnlessPressed', 'onUnlessPressed']),
            fontSize: EditorIntOption.clampedInt(input.fontSize, this.defaultValue.fontSize, 0, 100),
            fontFamily: EditorStringOption.string(input.fontFamily, this.defaultValue.fontFamily),
            padding: boolean(input.padding, this.defaultValue.padding),
            maximumLength: EditorIntOption.clampedInt(input.maximumLength, this.defaultValue.maximumLength, 0, Number.MAX_SAFE_INTEGER),
        };
    }
}
//#endregion
//#region lineDecorationsWidth
class EditorLineDecorationsWidth extends BaseEditorOption {
    constructor() {
        super(74 /* EditorOption.lineDecorationsWidth */, 'lineDecorationsWidth', 10);
    }
    validate(input) {
        if (typeof input === 'string' && /^\d+(\.\d+)?ch$/.test(input)) {
            const multiple = parseFloat(input.substring(0, input.length - 2));
            return -multiple; // negative numbers signal a multiple
        }
        else {
            return EditorIntOption.clampedInt(input, this.defaultValue, 0, 1000);
        }
    }
    compute(env, options, value) {
        if (value < 0) {
            // negative numbers signal a multiple
            return EditorIntOption.clampedInt(-value * env.fontInfo.typicalHalfwidthCharacterWidth, this.defaultValue, 0, 1000);
        }
        else {
            return value;
        }
    }
}
//#endregion
//#region lineHeight
class EditorLineHeight extends EditorFloatOption {
    constructor() {
        super(75 /* EditorOption.lineHeight */, 'lineHeight', EDITOR_FONT_DEFAULTS.lineHeight, x => EditorFloatOption.clamp(x, 0, 150), { markdownDescription: nls.localize('lineHeight', "Controls the line height. \n - Use 0 to automatically compute the line height from the font size.\n - Values between 0 and 8 will be used as a multiplier with the font size.\n - Values greater than or equal to 8 will be used as effective values.") }, 0, 150);
    }
    compute(env, options, value) {
        // The lineHeight is computed from the fontSize if it is 0.
        // Moreover, the final lineHeight respects the editor zoom level.
        // So take the result from env.fontInfo
        return env.fontInfo.lineHeight;
    }
}
class EditorMinimap extends BaseEditorOption {
    constructor() {
        const defaults = {
            enabled: true,
            size: 'proportional',
            side: 'right',
            showSlider: 'mouseover',
            autohide: 'none',
            renderCharacters: true,
            maxColumn: 120,
            scale: 1,
            showRegionSectionHeaders: true,
            showMarkSectionHeaders: true,
            markSectionHeaderRegex: '\\bMARK:\\s*(?<separator>\-?)\\s*(?<label>.*)$',
            sectionHeaderFontSize: 9,
            sectionHeaderLetterSpacing: 1,
        };
        super(81 /* EditorOption.minimap */, 'minimap', defaults, {
            'editor.minimap.enabled': {
                type: 'boolean',
                default: defaults.enabled,
                description: nls.localize('minimap.enabled', "Controls whether the minimap is shown.")
            },
            'editor.minimap.autohide': {
                type: 'string',
                enum: ['none', 'mouseover', 'scroll'],
                enumDescriptions: [
                    nls.localize('minimap.autohide.none', "The minimap is always shown."),
                    nls.localize('minimap.autohide.mouseover', "The minimap is hidden when mouse is not over the minimap and shown when mouse is over the minimap."),
                    nls.localize('minimap.autohide.scroll', "The minimap is only shown when the editor is scrolled"),
                ],
                default: defaults.autohide,
                description: nls.localize('minimap.autohide', "Controls whether the minimap is hidden automatically.")
            },
            'editor.minimap.size': {
                type: 'string',
                enum: ['proportional', 'fill', 'fit'],
                enumDescriptions: [
                    nls.localize('minimap.size.proportional', "The minimap has the same size as the editor contents (and might scroll)."),
                    nls.localize('minimap.size.fill', "The minimap will stretch or shrink as necessary to fill the height of the editor (no scrolling)."),
                    nls.localize('minimap.size.fit', "The minimap will shrink as necessary to never be larger than the editor (no scrolling)."),
                ],
                default: defaults.size,
                description: nls.localize('minimap.size', "Controls the size of the minimap.")
            },
            'editor.minimap.side': {
                type: 'string',
                enum: ['left', 'right'],
                default: defaults.side,
                description: nls.localize('minimap.side', "Controls the side where to render the minimap.")
            },
            'editor.minimap.showSlider': {
                type: 'string',
                enum: ['always', 'mouseover'],
                default: defaults.showSlider,
                description: nls.localize('minimap.showSlider', "Controls when the minimap slider is shown.")
            },
            'editor.minimap.scale': {
                type: 'number',
                default: defaults.scale,
                minimum: 1,
                maximum: 3,
                enum: [1, 2, 3],
                description: nls.localize('minimap.scale', "Scale of content drawn in the minimap: 1, 2 or 3.")
            },
            'editor.minimap.renderCharacters': {
                type: 'boolean',
                default: defaults.renderCharacters,
                description: nls.localize('minimap.renderCharacters', "Render the actual characters on a line as opposed to color blocks.")
            },
            'editor.minimap.maxColumn': {
                type: 'number',
                default: defaults.maxColumn,
                description: nls.localize('minimap.maxColumn', "Limit the width of the minimap to render at most a certain number of columns.")
            },
            'editor.minimap.showRegionSectionHeaders': {
                type: 'boolean',
                default: defaults.showRegionSectionHeaders,
                description: nls.localize('minimap.showRegionSectionHeaders', "Controls whether named regions are shown as section headers in the minimap.")
            },
            'editor.minimap.showMarkSectionHeaders': {
                type: 'boolean',
                default: defaults.showMarkSectionHeaders,
                description: nls.localize('minimap.showMarkSectionHeaders', "Controls whether MARK: comments are shown as section headers in the minimap.")
            },
            'editor.minimap.markSectionHeaderRegex': {
                type: 'string',
                default: defaults.markSectionHeaderRegex,
                description: nls.localize('minimap.markSectionHeaderRegex', "Defines the regular expression used to find section headers in comments. The regex must contain a named match group `label` (written as `(?<label>.+)`) that encapsulates the section header, otherwise it will not work. Optionally you can include another match group named `separator`. Use \\n in the pattern to match multi-line headers."),
            },
            'editor.minimap.sectionHeaderFontSize': {
                type: 'number',
                default: defaults.sectionHeaderFontSize,
                description: nls.localize('minimap.sectionHeaderFontSize', "Controls the font size of section headers in the minimap.")
            },
            'editor.minimap.sectionHeaderLetterSpacing': {
                type: 'number',
                default: defaults.sectionHeaderLetterSpacing,
                description: nls.localize('minimap.sectionHeaderLetterSpacing', "Controls the amount of space (in pixels) between characters of section header. This helps the readability of the header in small font sizes.")
            }
        });
    }
    validate(_input) {
        if (!_input || typeof _input !== 'object') {
            return this.defaultValue;
        }
        const input = _input;
        // Validate mark section header regex
        let markSectionHeaderRegex = this.defaultValue.markSectionHeaderRegex;
        const inputRegex = _input.markSectionHeaderRegex;
        if (typeof inputRegex === 'string') {
            try {
                new RegExp(inputRegex, 'd');
                markSectionHeaderRegex = inputRegex;
            }
            catch { }
        }
        return {
            enabled: boolean(input.enabled, this.defaultValue.enabled),
            autohide: stringSet(input.autohide, this.defaultValue.autohide, ['none', 'mouseover', 'scroll']),
            size: stringSet(input.size, this.defaultValue.size, ['proportional', 'fill', 'fit']),
            side: stringSet(input.side, this.defaultValue.side, ['right', 'left']),
            showSlider: stringSet(input.showSlider, this.defaultValue.showSlider, ['always', 'mouseover']),
            renderCharacters: boolean(input.renderCharacters, this.defaultValue.renderCharacters),
            scale: EditorIntOption.clampedInt(input.scale, 1, 1, 3),
            maxColumn: EditorIntOption.clampedInt(input.maxColumn, this.defaultValue.maxColumn, 1, 10000),
            showRegionSectionHeaders: boolean(input.showRegionSectionHeaders, this.defaultValue.showRegionSectionHeaders),
            showMarkSectionHeaders: boolean(input.showMarkSectionHeaders, this.defaultValue.showMarkSectionHeaders),
            markSectionHeaderRegex: markSectionHeaderRegex,
            sectionHeaderFontSize: EditorFloatOption.clamp(input.sectionHeaderFontSize ?? this.defaultValue.sectionHeaderFontSize, 4, 32),
            sectionHeaderLetterSpacing: EditorFloatOption.clamp(input.sectionHeaderLetterSpacing ?? this.defaultValue.sectionHeaderLetterSpacing, 0, 5),
        };
    }
}
//#endregion
//#region multiCursorModifier
function _multiCursorModifierFromString(multiCursorModifier) {
    if (multiCursorModifier === 'ctrlCmd') {
        return (platform.isMacintosh ? 'metaKey' : 'ctrlKey');
    }
    return 'altKey';
}
class EditorPadding extends BaseEditorOption {
    constructor() {
        super(95 /* EditorOption.padding */, 'padding', { top: 0, bottom: 0 }, {
            'editor.padding.top': {
                type: 'number',
                default: 0,
                minimum: 0,
                maximum: 1000,
                description: nls.localize('padding.top', "Controls the amount of space between the top edge of the editor and the first line.")
            },
            'editor.padding.bottom': {
                type: 'number',
                default: 0,
                minimum: 0,
                maximum: 1000,
                description: nls.localize('padding.bottom', "Controls the amount of space between the bottom edge of the editor and the last line.")
            }
        });
    }
    validate(_input) {
        if (!_input || typeof _input !== 'object') {
            return this.defaultValue;
        }
        const input = _input;
        return {
            top: EditorIntOption.clampedInt(input.top, 0, 0, 1000),
            bottom: EditorIntOption.clampedInt(input.bottom, 0, 0, 1000)
        };
    }
}
class EditorParameterHints extends BaseEditorOption {
    constructor() {
        const defaults = {
            enabled: true,
            cycle: true
        };
        super(97 /* EditorOption.parameterHints */, 'parameterHints', defaults, {
            'editor.parameterHints.enabled': {
                type: 'boolean',
                default: defaults.enabled,
                description: nls.localize('parameterHints.enabled', "Enables a pop-up that shows parameter documentation and type information as you type.")
            },
            'editor.parameterHints.cycle': {
                type: 'boolean',
                default: defaults.cycle,
                description: nls.localize('parameterHints.cycle', "Controls whether the parameter hints menu cycles or closes when reaching the end of the list.")
            },
        });
    }
    validate(_input) {
        if (!_input || typeof _input !== 'object') {
            return this.defaultValue;
        }
        const input = _input;
        return {
            enabled: boolean(input.enabled, this.defaultValue.enabled),
            cycle: boolean(input.cycle, this.defaultValue.cycle)
        };
    }
}
//#endregion
//#region pixelRatio
class EditorPixelRatio extends ComputedEditorOption {
    constructor() {
        super(162 /* EditorOption.pixelRatio */);
    }
    compute(env, options, _) {
        return env.pixelRatio;
    }
}
//#endregion
//#region
class PlaceholderOption extends BaseEditorOption {
    constructor() {
        super(99 /* EditorOption.placeholder */, 'placeholder', undefined);
    }
    validate(input) {
        if (typeof input === 'undefined') {
            return this.defaultValue;
        }
        if (typeof input === 'string') {
            return input;
        }
        return this.defaultValue;
    }
}
class EditorQuickSuggestions extends BaseEditorOption {
    constructor() {
        const defaults = {
            other: 'on',
            comments: 'off',
            strings: 'off'
        };
        const types = [
            { type: 'boolean' },
            {
                type: 'string',
                enum: ['on', 'inline', 'off'],
                enumDescriptions: [nls.localize('on', "Quick suggestions show inside the suggest widget"), nls.localize('inline', "Quick suggestions show as ghost text"), nls.localize('off', "Quick suggestions are disabled")]
            }
        ];
        super(101 /* EditorOption.quickSuggestions */, 'quickSuggestions', defaults, {
            type: 'object',
            additionalProperties: false,
            properties: {
                strings: {
                    anyOf: types,
                    default: defaults.strings,
                    description: nls.localize('quickSuggestions.strings', "Enable quick suggestions inside strings.")
                },
                comments: {
                    anyOf: types,
                    default: defaults.comments,
                    description: nls.localize('quickSuggestions.comments', "Enable quick suggestions inside comments.")
                },
                other: {
                    anyOf: types,
                    default: defaults.other,
                    description: nls.localize('quickSuggestions.other', "Enable quick suggestions outside of strings and comments.")
                },
            },
            default: defaults,
            markdownDescription: nls.localize('quickSuggestions', "Controls whether suggestions should automatically show up while typing. This can be controlled for typing in comments, strings, and other code. Quick suggestion can be configured to show as ghost text or with the suggest widget. Also be aware of the {0}-setting which controls if suggestions are triggered by special characters.", '`#editor.suggestOnTriggerCharacters#`')
        });
        this.defaultValue = defaults;
    }
    validate(input) {
        if (typeof input === 'boolean') {
            // boolean -> all on/off
            const value = input ? 'on' : 'off';
            return { comments: value, strings: value, other: value };
        }
        if (!input || typeof input !== 'object') {
            // invalid object
            return this.defaultValue;
        }
        const { other, comments, strings } = input;
        const allowedValues = ['on', 'inline', 'off'];
        let validatedOther;
        let validatedComments;
        let validatedStrings;
        if (typeof other === 'boolean') {
            validatedOther = other ? 'on' : 'off';
        }
        else {
            validatedOther = stringSet(other, this.defaultValue.other, allowedValues);
        }
        if (typeof comments === 'boolean') {
            validatedComments = comments ? 'on' : 'off';
        }
        else {
            validatedComments = stringSet(comments, this.defaultValue.comments, allowedValues);
        }
        if (typeof strings === 'boolean') {
            validatedStrings = strings ? 'on' : 'off';
        }
        else {
            validatedStrings = stringSet(strings, this.defaultValue.strings, allowedValues);
        }
        return {
            other: validatedOther,
            comments: validatedComments,
            strings: validatedStrings
        };
    }
}
export var RenderLineNumbersType;
(function (RenderLineNumbersType) {
    RenderLineNumbersType[RenderLineNumbersType["Off"] = 0] = "Off";
    RenderLineNumbersType[RenderLineNumbersType["On"] = 1] = "On";
    RenderLineNumbersType[RenderLineNumbersType["Relative"] = 2] = "Relative";
    RenderLineNumbersType[RenderLineNumbersType["Interval"] = 3] = "Interval";
    RenderLineNumbersType[RenderLineNumbersType["Custom"] = 4] = "Custom";
})(RenderLineNumbersType || (RenderLineNumbersType = {}));
class EditorRenderLineNumbersOption extends BaseEditorOption {
    constructor() {
        super(76 /* EditorOption.lineNumbers */, 'lineNumbers', { renderType: 1 /* RenderLineNumbersType.On */, renderFn: null }, {
            type: 'string',
            enum: ['off', 'on', 'relative', 'interval'],
            enumDescriptions: [
                nls.localize('lineNumbers.off', "Line numbers are not rendered."),
                nls.localize('lineNumbers.on', "Line numbers are rendered as absolute number."),
                nls.localize('lineNumbers.relative', "Line numbers are rendered as distance in lines to cursor position."),
                nls.localize('lineNumbers.interval', "Line numbers are rendered every 10 lines.")
            ],
            default: 'on',
            description: nls.localize('lineNumbers', "Controls the display of line numbers.")
        });
    }
    validate(lineNumbers) {
        let renderType = this.defaultValue.renderType;
        let renderFn = this.defaultValue.renderFn;
        if (typeof lineNumbers !== 'undefined') {
            if (typeof lineNumbers === 'function') {
                renderType = 4 /* RenderLineNumbersType.Custom */;
                renderFn = lineNumbers;
            }
            else if (lineNumbers === 'interval') {
                renderType = 3 /* RenderLineNumbersType.Interval */;
            }
            else if (lineNumbers === 'relative') {
                renderType = 2 /* RenderLineNumbersType.Relative */;
            }
            else if (lineNumbers === 'on') {
                renderType = 1 /* RenderLineNumbersType.On */;
            }
            else {
                renderType = 0 /* RenderLineNumbersType.Off */;
            }
        }
        return {
            renderType,
            renderFn
        };
    }
}
//#endregion
//#region renderValidationDecorations
/**
 * @internal
 */
export function filterValidationDecorations(options) {
    const renderValidationDecorations = options.get(111 /* EditorOption.renderValidationDecorations */);
    if (renderValidationDecorations === 'editable') {
        return options.get(103 /* EditorOption.readOnly */);
    }
    return renderValidationDecorations === 'on' ? false : true;
}
//#endregion
//#region filterFontDecorations
/**
 * @internal
 */
export function filterFontDecorations(options) {
    return !options.get(171 /* EditorOption.effectiveAllowVariableFonts */);
}
class EditorRulers extends BaseEditorOption {
    constructor() {
        const defaults = [];
        const columnSchema = { type: 'number', description: nls.localize('rulers.size', "Number of monospace characters at which this editor ruler will render.") };
        super(115 /* EditorOption.rulers */, 'rulers', defaults, {
            type: 'array',
            items: {
                anyOf: [
                    columnSchema,
                    {
                        type: [
                            'object'
                        ],
                        properties: {
                            column: columnSchema,
                            color: {
                                type: 'string',
                                description: nls.localize('rulers.color', "Color of this editor ruler."),
                                format: 'color-hex'
                            }
                        }
                    }
                ]
            },
            default: defaults,
            description: nls.localize('rulers', "Render vertical rulers after a certain number of monospace characters. Use multiple values for multiple rulers. No rulers are drawn if array is empty.")
        });
    }
    validate(input) {
        if (Array.isArray(input)) {
            const rulers = [];
            for (const _element of input) {
                if (typeof _element === 'number') {
                    rulers.push({
                        column: EditorIntOption.clampedInt(_element, 0, 0, 10000),
                        color: null
                    });
                }
                else if (_element && typeof _element === 'object') {
                    const element = _element;
                    rulers.push({
                        column: EditorIntOption.clampedInt(element.column, 0, 0, 10000),
                        color: element.color
                    });
                }
            }
            rulers.sort((a, b) => a.column - b.column);
            return rulers;
        }
        return this.defaultValue;
    }
}
//#endregion
//#region readonly
/**
 * Configuration options for readonly message
 */
class ReadonlyMessage extends BaseEditorOption {
    constructor() {
        const defaults = undefined;
        super(104 /* EditorOption.readOnlyMessage */, 'readOnlyMessage', defaults);
    }
    validate(_input) {
        if (!_input || typeof _input !== 'object') {
            return this.defaultValue;
        }
        return _input;
    }
}
function _scrollbarVisibilityFromString(visibility, defaultValue) {
    if (typeof visibility !== 'string') {
        return defaultValue;
    }
    switch (visibility) {
        case 'hidden': return 2 /* ScrollbarVisibility.Hidden */;
        case 'visible': return 3 /* ScrollbarVisibility.Visible */;
        default: return 1 /* ScrollbarVisibility.Auto */;
    }
}
class EditorScrollbar extends BaseEditorOption {
    constructor() {
        const defaults = {
            vertical: 1 /* ScrollbarVisibility.Auto */,
            horizontal: 1 /* ScrollbarVisibility.Auto */,
            arrowSize: 11,
            useShadows: true,
            verticalHasArrows: false,
            horizontalHasArrows: false,
            horizontalScrollbarSize: 12,
            horizontalSliderSize: 12,
            verticalScrollbarSize: 14,
            verticalSliderSize: 14,
            handleMouseWheel: true,
            alwaysConsumeMouseWheel: true,
            scrollByPage: false,
            ignoreHorizontalScrollbarInContentHeight: false,
        };
        super(116 /* EditorOption.scrollbar */, 'scrollbar', defaults, {
            'editor.scrollbar.vertical': {
                type: 'string',
                enum: ['auto', 'visible', 'hidden'],
                enumDescriptions: [
                    nls.localize('scrollbar.vertical.auto', "The vertical scrollbar will be visible only when necessary."),
                    nls.localize('scrollbar.vertical.visible', "The vertical scrollbar will always be visible."),
                    nls.localize('scrollbar.vertical.fit', "The vertical scrollbar will always be hidden."),
                ],
                default: 'auto',
                description: nls.localize('scrollbar.vertical', "Controls the visibility of the vertical scrollbar.")
            },
            'editor.scrollbar.horizontal': {
                type: 'string',
                enum: ['auto', 'visible', 'hidden'],
                enumDescriptions: [
                    nls.localize('scrollbar.horizontal.auto', "The horizontal scrollbar will be visible only when necessary."),
                    nls.localize('scrollbar.horizontal.visible', "The horizontal scrollbar will always be visible."),
                    nls.localize('scrollbar.horizontal.fit', "The horizontal scrollbar will always be hidden."),
                ],
                default: 'auto',
                description: nls.localize('scrollbar.horizontal', "Controls the visibility of the horizontal scrollbar.")
            },
            'editor.scrollbar.verticalScrollbarSize': {
                type: 'number',
                default: defaults.verticalScrollbarSize,
                description: nls.localize('scrollbar.verticalScrollbarSize', "The width of the vertical scrollbar.")
            },
            'editor.scrollbar.horizontalScrollbarSize': {
                type: 'number',
                default: defaults.horizontalScrollbarSize,
                description: nls.localize('scrollbar.horizontalScrollbarSize', "The height of the horizontal scrollbar.")
            },
            'editor.scrollbar.scrollByPage': {
                type: 'boolean',
                default: defaults.scrollByPage,
                description: nls.localize('scrollbar.scrollByPage', "Controls whether clicks scroll by page or jump to click position.")
            },
            'editor.scrollbar.ignoreHorizontalScrollbarInContentHeight': {
                type: 'boolean',
                default: defaults.ignoreHorizontalScrollbarInContentHeight,
                description: nls.localize('scrollbar.ignoreHorizontalScrollbarInContentHeight', "When set, the horizontal scrollbar will not increase the size of the editor's content.")
            }
        });
    }
    validate(_input) {
        if (!_input || typeof _input !== 'object') {
            return this.defaultValue;
        }
        const input = _input;
        const horizontalScrollbarSize = EditorIntOption.clampedInt(input.horizontalScrollbarSize, this.defaultValue.horizontalScrollbarSize, 0, 1000);
        const verticalScrollbarSize = EditorIntOption.clampedInt(input.verticalScrollbarSize, this.defaultValue.verticalScrollbarSize, 0, 1000);
        return {
            arrowSize: EditorIntOption.clampedInt(input.arrowSize, this.defaultValue.arrowSize, 0, 1000),
            vertical: _scrollbarVisibilityFromString(input.vertical, this.defaultValue.vertical),
            horizontal: _scrollbarVisibilityFromString(input.horizontal, this.defaultValue.horizontal),
            useShadows: boolean(input.useShadows, this.defaultValue.useShadows),
            verticalHasArrows: boolean(input.verticalHasArrows, this.defaultValue.verticalHasArrows),
            horizontalHasArrows: boolean(input.horizontalHasArrows, this.defaultValue.horizontalHasArrows),
            handleMouseWheel: boolean(input.handleMouseWheel, this.defaultValue.handleMouseWheel),
            alwaysConsumeMouseWheel: boolean(input.alwaysConsumeMouseWheel, this.defaultValue.alwaysConsumeMouseWheel),
            horizontalScrollbarSize: horizontalScrollbarSize,
            horizontalSliderSize: EditorIntOption.clampedInt(input.horizontalSliderSize, horizontalScrollbarSize, 0, 1000),
            verticalScrollbarSize: verticalScrollbarSize,
            verticalSliderSize: EditorIntOption.clampedInt(input.verticalSliderSize, verticalScrollbarSize, 0, 1000),
            scrollByPage: boolean(input.scrollByPage, this.defaultValue.scrollByPage),
            ignoreHorizontalScrollbarInContentHeight: boolean(input.ignoreHorizontalScrollbarInContentHeight, this.defaultValue.ignoreHorizontalScrollbarInContentHeight),
        };
    }
}
/**
 * @internal
*/
export const inUntrustedWorkspace = 'inUntrustedWorkspace';
/**
 * @internal
 */
export const unicodeHighlightConfigKeys = {
    allowedCharacters: 'editor.unicodeHighlight.allowedCharacters',
    invisibleCharacters: 'editor.unicodeHighlight.invisibleCharacters',
    nonBasicASCII: 'editor.unicodeHighlight.nonBasicASCII',
    ambiguousCharacters: 'editor.unicodeHighlight.ambiguousCharacters',
    includeComments: 'editor.unicodeHighlight.includeComments',
    includeStrings: 'editor.unicodeHighlight.includeStrings',
    allowedLocales: 'editor.unicodeHighlight.allowedLocales',
};
class UnicodeHighlight extends BaseEditorOption {
    constructor() {
        const defaults = {
            nonBasicASCII: inUntrustedWorkspace,
            invisibleCharacters: true,
            ambiguousCharacters: true,
            includeComments: inUntrustedWorkspace,
            includeStrings: true,
            allowedCharacters: {},
            allowedLocales: { _os: true, _vscode: true },
        };
        super(141 /* EditorOption.unicodeHighlighting */, 'unicodeHighlight', defaults, {
            [unicodeHighlightConfigKeys.nonBasicASCII]: {
                restricted: true,
                type: ['boolean', 'string'],
                enum: [true, false, inUntrustedWorkspace],
                default: defaults.nonBasicASCII,
                description: nls.localize('unicodeHighlight.nonBasicASCII', "Controls whether all non-basic ASCII characters are highlighted. Only characters between U+0020 and U+007E, tab, line-feed and carriage-return are considered basic ASCII.")
            },
            [unicodeHighlightConfigKeys.invisibleCharacters]: {
                restricted: true,
                type: 'boolean',
                default: defaults.invisibleCharacters,
                description: nls.localize('unicodeHighlight.invisibleCharacters', "Controls whether characters that just reserve space or have no width at all are highlighted.")
            },
            [unicodeHighlightConfigKeys.ambiguousCharacters]: {
                restricted: true,
                type: 'boolean',
                default: defaults.ambiguousCharacters,
                description: nls.localize('unicodeHighlight.ambiguousCharacters', "Controls whether characters are highlighted that can be confused with basic ASCII characters, except those that are common in the current user locale.")
            },
            [unicodeHighlightConfigKeys.includeComments]: {
                restricted: true,
                type: ['boolean', 'string'],
                enum: [true, false, inUntrustedWorkspace],
                default: defaults.includeComments,
                description: nls.localize('unicodeHighlight.includeComments', "Controls whether characters in comments should also be subject to Unicode highlighting.")
            },
            [unicodeHighlightConfigKeys.includeStrings]: {
                restricted: true,
                type: ['boolean', 'string'],
                enum: [true, false, inUntrustedWorkspace],
                default: defaults.includeStrings,
                description: nls.localize('unicodeHighlight.includeStrings', "Controls whether characters in strings should also be subject to Unicode highlighting.")
            },
            [unicodeHighlightConfigKeys.allowedCharacters]: {
                restricted: true,
                type: 'object',
                default: defaults.allowedCharacters,
                description: nls.localize('unicodeHighlight.allowedCharacters', "Defines allowed characters that are not being highlighted."),
                additionalProperties: {
                    type: 'boolean'
                }
            },
            [unicodeHighlightConfigKeys.allowedLocales]: {
                restricted: true,
                type: 'object',
                additionalProperties: {
                    type: 'boolean'
                },
                default: defaults.allowedLocales,
                description: nls.localize('unicodeHighlight.allowedLocales', "Unicode characters that are common in allowed locales are not being highlighted.")
            },
        });
    }
    applyUpdate(value, update) {
        let didChange = false;
        if (update.allowedCharacters && value) {
            // Treat allowedCharacters atomically
            if (!objects.equals(value.allowedCharacters, update.allowedCharacters)) {
                value = { ...value, allowedCharacters: update.allowedCharacters };
                didChange = true;
            }
        }
        if (update.allowedLocales && value) {
            // Treat allowedLocales atomically
            if (!objects.equals(value.allowedLocales, update.allowedLocales)) {
                value = { ...value, allowedLocales: update.allowedLocales };
                didChange = true;
            }
        }
        const result = super.applyUpdate(value, update);
        if (didChange) {
            return new ApplyUpdateResult(result.newValue, true);
        }
        return result;
    }
    validate(_input) {
        if (!_input || typeof _input !== 'object') {
            return this.defaultValue;
        }
        const input = _input;
        return {
            nonBasicASCII: primitiveSet(input.nonBasicASCII, inUntrustedWorkspace, [true, false, inUntrustedWorkspace]),
            invisibleCharacters: boolean(input.invisibleCharacters, this.defaultValue.invisibleCharacters),
            ambiguousCharacters: boolean(input.ambiguousCharacters, this.defaultValue.ambiguousCharacters),
            includeComments: primitiveSet(input.includeComments, inUntrustedWorkspace, [true, false, inUntrustedWorkspace]),
            includeStrings: primitiveSet(input.includeStrings, inUntrustedWorkspace, [true, false, inUntrustedWorkspace]),
            allowedCharacters: this.validateBooleanMap(_input.allowedCharacters, this.defaultValue.allowedCharacters),
            allowedLocales: this.validateBooleanMap(_input.allowedLocales, this.defaultValue.allowedLocales),
        };
    }
    validateBooleanMap(map, defaultValue) {
        if ((typeof map !== 'object') || !map) {
            return defaultValue;
        }
        const result = {};
        for (const [key, value] of Object.entries(map)) {
            if (value === true) {
                result[key] = true;
            }
        }
        return result;
    }
}
/**
 * Configuration options for inline suggestions
 */
class InlineEditorSuggest extends BaseEditorOption {
    constructor() {
        const defaults = {
            enabled: true,
            mode: 'subwordSmart',
            showToolbar: 'onHover',
            suppressSuggestions: false,
            keepOnBlur: false,
            fontFamily: 'default',
            syntaxHighlightingEnabled: true,
            edits: {
                enabled: true,
                showCollapsed: false,
                renderSideBySide: 'auto',
                allowCodeShifting: 'always',
            },
            experimental: {
                suppressInlineSuggestions: '',
                triggerCommandOnProviderChange: true,
            },
        };
        super(71 /* EditorOption.inlineSuggest */, 'inlineSuggest', defaults, {
            'editor.inlineSuggest.enabled': {
                type: 'boolean',
                default: defaults.enabled,
                description: nls.localize('inlineSuggest.enabled', "Controls whether to automatically show inline suggestions in the editor.")
            },
            'editor.inlineSuggest.showToolbar': {
                type: 'string',
                default: defaults.showToolbar,
                enum: ['always', 'onHover', 'never'],
                enumDescriptions: [
                    nls.localize('inlineSuggest.showToolbar.always', "Show the inline suggestion toolbar whenever an inline suggestion is shown."),
                    nls.localize('inlineSuggest.showToolbar.onHover', "Show the inline suggestion toolbar when hovering over an inline suggestion."),
                    nls.localize('inlineSuggest.showToolbar.never', "Never show the inline suggestion toolbar."),
                ],
                description: nls.localize('inlineSuggest.showToolbar', "Controls when to show the inline suggestion toolbar."),
            },
            'editor.inlineSuggest.syntaxHighlightingEnabled': {
                type: 'boolean',
                default: defaults.syntaxHighlightingEnabled,
                description: nls.localize('inlineSuggest.syntaxHighlightingEnabled', "Controls whether to show syntax highlighting for inline suggestions in the editor."),
            },
            'editor.inlineSuggest.suppressSuggestions': {
                type: 'boolean',
                default: defaults.suppressSuggestions,
                description: nls.localize('inlineSuggest.suppressSuggestions', "Controls how inline suggestions interact with the suggest widget. If enabled, the suggest widget is not shown automatically when inline suggestions are available.")
            },
            'editor.inlineSuggest.experimental.suppressInlineSuggestions': {
                type: 'string',
                default: defaults.experimental.suppressInlineSuggestions,
                tags: ['experimental'],
                description: nls.localize('inlineSuggest.suppressInlineSuggestions', "Suppresses inline completions for specified extension IDs -- comma separated."),
                experiment: {
                    mode: 'startup'
                }
            },
            'editor.inlineSuggest.experimental.triggerCommandOnProviderChange': {
                type: 'boolean',
                default: defaults.experimental.triggerCommandOnProviderChange,
                tags: ['experimental'],
                description: nls.localize('inlineSuggest.triggerCommandOnProviderChange', "Controls whether to trigger a command when the inline suggestion provider changes."),
                experiment: {
                    mode: 'startup'
                }
            },
            'editor.inlineSuggest.fontFamily': {
                type: 'string',
                default: defaults.fontFamily,
                description: nls.localize('inlineSuggest.fontFamily', "Controls the font family of the inline suggestions.")
            },
            'editor.inlineSuggest.edits.allowCodeShifting': {
                type: 'string',
                default: defaults.edits.allowCodeShifting,
                description: nls.localize('inlineSuggest.edits.allowCodeShifting', "Controls whether showing a suggestion will shift the code to make space for the suggestion inline."),
                enum: ['always', 'horizontal', 'never'],
                tags: ['nextEditSuggestions']
            },
            'editor.inlineSuggest.edits.renderSideBySide': {
                type: 'string',
                default: defaults.edits.renderSideBySide,
                description: nls.localize('inlineSuggest.edits.renderSideBySide', "Controls whether larger suggestions can be shown side by side."),
                enum: ['auto', 'never'],
                enumDescriptions: [
                    nls.localize('editor.inlineSuggest.edits.renderSideBySide.auto', "Larger suggestions will show side by side if there is enough space, otherwise they will be shown below."),
                    nls.localize('editor.inlineSuggest.edits.renderSideBySide.never', "Larger suggestions are never shown side by side and will always be shown below."),
                ],
                tags: ['nextEditSuggestions']
            },
            'editor.inlineSuggest.edits.showCollapsed': {
                type: 'boolean',
                default: defaults.edits.showCollapsed,
                description: nls.localize('inlineSuggest.edits.showCollapsed', "Controls whether the suggestion will show as collapsed until jumping to it."),
                tags: ['nextEditSuggestions']
            },
        });
    }
    validate(_input) {
        if (!_input || typeof _input !== 'object') {
            return this.defaultValue;
        }
        const input = _input;
        return {
            enabled: boolean(input.enabled, this.defaultValue.enabled),
            mode: stringSet(input.mode, this.defaultValue.mode, ['prefix', 'subword', 'subwordSmart']),
            showToolbar: stringSet(input.showToolbar, this.defaultValue.showToolbar, ['always', 'onHover', 'never']),
            suppressSuggestions: boolean(input.suppressSuggestions, this.defaultValue.suppressSuggestions),
            keepOnBlur: boolean(input.keepOnBlur, this.defaultValue.keepOnBlur),
            fontFamily: EditorStringOption.string(input.fontFamily, this.defaultValue.fontFamily),
            syntaxHighlightingEnabled: boolean(input.syntaxHighlightingEnabled, this.defaultValue.syntaxHighlightingEnabled),
            edits: {
                enabled: boolean(input.edits?.enabled, this.defaultValue.edits.enabled),
                showCollapsed: boolean(input.edits?.showCollapsed, this.defaultValue.edits.showCollapsed),
                allowCodeShifting: stringSet(input.edits?.allowCodeShifting, this.defaultValue.edits.allowCodeShifting, ['always', 'horizontal', 'never']),
                renderSideBySide: stringSet(input.edits?.renderSideBySide, this.defaultValue.edits.renderSideBySide, ['never', 'auto']),
            },
            experimental: {
                suppressInlineSuggestions: EditorStringOption.string(input.experimental?.suppressInlineSuggestions, this.defaultValue.experimental.suppressInlineSuggestions),
                triggerCommandOnProviderChange: boolean(input.experimental?.triggerCommandOnProviderChange, this.defaultValue.experimental.triggerCommandOnProviderChange),
            },
        };
    }
}
/**
 * Configuration options for inline suggestions
 */
class BracketPairColorization extends BaseEditorOption {
    constructor() {
        const defaults = {
            enabled: EDITOR_MODEL_DEFAULTS.bracketPairColorizationOptions.enabled,
            independentColorPoolPerBracketType: EDITOR_MODEL_DEFAULTS.bracketPairColorizationOptions.independentColorPoolPerBracketType,
        };
        super(21 /* EditorOption.bracketPairColorization */, 'bracketPairColorization', defaults, {
            'editor.bracketPairColorization.enabled': {
                type: 'boolean',
                default: defaults.enabled,
                markdownDescription: nls.localize('bracketPairColorization.enabled', "Controls whether bracket pair colorization is enabled or not. Use {0} to override the bracket highlight colors.", '`#workbench.colorCustomizations#`')
            },
            'editor.bracketPairColorization.independentColorPoolPerBracketType': {
                type: 'boolean',
                default: defaults.independentColorPoolPerBracketType,
                description: nls.localize('bracketPairColorization.independentColorPoolPerBracketType', "Controls whether each bracket type has its own independent color pool.")
            },
        });
    }
    validate(_input) {
        if (!_input || typeof _input !== 'object') {
            return this.defaultValue;
        }
        const input = _input;
        return {
            enabled: boolean(input.enabled, this.defaultValue.enabled),
            independentColorPoolPerBracketType: boolean(input.independentColorPoolPerBracketType, this.defaultValue.independentColorPoolPerBracketType),
        };
    }
}
/**
 * Configuration options for inline suggestions
 */
class GuideOptions extends BaseEditorOption {
    constructor() {
        const defaults = {
            bracketPairs: false,
            bracketPairsHorizontal: 'active',
            highlightActiveBracketPair: true,
            indentation: true,
            highlightActiveIndentation: true
        };
        super(22 /* EditorOption.guides */, 'guides', defaults, {
            'editor.guides.bracketPairs': {
                type: ['boolean', 'string'],
                enum: [true, 'active', false],
                enumDescriptions: [
                    nls.localize('editor.guides.bracketPairs.true', "Enables bracket pair guides."),
                    nls.localize('editor.guides.bracketPairs.active', "Enables bracket pair guides only for the active bracket pair."),
                    nls.localize('editor.guides.bracketPairs.false', "Disables bracket pair guides."),
                ],
                default: defaults.bracketPairs,
                description: nls.localize('editor.guides.bracketPairs', "Controls whether bracket pair guides are enabled or not.")
            },
            'editor.guides.bracketPairsHorizontal': {
                type: ['boolean', 'string'],
                enum: [true, 'active', false],
                enumDescriptions: [
                    nls.localize('editor.guides.bracketPairsHorizontal.true', "Enables horizontal guides as addition to vertical bracket pair guides."),
                    nls.localize('editor.guides.bracketPairsHorizontal.active', "Enables horizontal guides only for the active bracket pair."),
                    nls.localize('editor.guides.bracketPairsHorizontal.false', "Disables horizontal bracket pair guides."),
                ],
                default: defaults.bracketPairsHorizontal,
                description: nls.localize('editor.guides.bracketPairsHorizontal', "Controls whether horizontal bracket pair guides are enabled or not.")
            },
            'editor.guides.highlightActiveBracketPair': {
                type: 'boolean',
                default: defaults.highlightActiveBracketPair,
                description: nls.localize('editor.guides.highlightActiveBracketPair', "Controls whether the editor should highlight the active bracket pair.")
            },
            'editor.guides.indentation': {
                type: 'boolean',
                default: defaults.indentation,
                description: nls.localize('editor.guides.indentation', "Controls whether the editor should render indent guides.")
            },
            'editor.guides.highlightActiveIndentation': {
                type: ['boolean', 'string'],
                enum: [true, 'always', false],
                enumDescriptions: [
                    nls.localize('editor.guides.highlightActiveIndentation.true', "Highlights the active indent guide."),
                    nls.localize('editor.guides.highlightActiveIndentation.always', "Highlights the active indent guide even if bracket guides are highlighted."),
                    nls.localize('editor.guides.highlightActiveIndentation.false', "Do not highlight the active indent guide."),
                ],
                default: defaults.highlightActiveIndentation,
                description: nls.localize('editor.guides.highlightActiveIndentation', "Controls whether the editor should highlight the active indent guide.")
            }
        });
    }
    validate(_input) {
        if (!_input || typeof _input !== 'object') {
            return this.defaultValue;
        }
        const input = _input;
        return {
            bracketPairs: primitiveSet(input.bracketPairs, this.defaultValue.bracketPairs, [true, false, 'active']),
            bracketPairsHorizontal: primitiveSet(input.bracketPairsHorizontal, this.defaultValue.bracketPairsHorizontal, [true, false, 'active']),
            highlightActiveBracketPair: boolean(input.highlightActiveBracketPair, this.defaultValue.highlightActiveBracketPair),
            indentation: boolean(input.indentation, this.defaultValue.indentation),
            highlightActiveIndentation: primitiveSet(input.highlightActiveIndentation, this.defaultValue.highlightActiveIndentation, [true, false, 'always']),
        };
    }
}
function primitiveSet(value, defaultValue, allowedValues) {
    const idx = allowedValues.indexOf(value);
    if (idx === -1) {
        return defaultValue;
    }
    return allowedValues[idx];
}
class EditorSuggest extends BaseEditorOption {
    constructor() {
        const defaults = {
            insertMode: 'insert',
            filterGraceful: true,
            snippetsPreventQuickSuggestions: false,
            localityBonus: false,
            shareSuggestSelections: false,
            selectionMode: 'always',
            showIcons: true,
            showStatusBar: false,
            preview: false,
            previewMode: 'subwordSmart',
            showInlineDetails: true,
            showMethods: true,
            showFunctions: true,
            showConstructors: true,
            showDeprecated: true,
            matchOnWordStartOnly: true,
            showFields: true,
            showVariables: true,
            showClasses: true,
            showStructs: true,
            showInterfaces: true,
            showModules: true,
            showProperties: true,
            showEvents: true,
            showOperators: true,
            showUnits: true,
            showValues: true,
            showConstants: true,
            showEnums: true,
            showEnumMembers: true,
            showKeywords: true,
            showWords: true,
            showColors: true,
            showFiles: true,
            showReferences: true,
            showFolders: true,
            showTypeParameters: true,
            showSnippets: true,
            showUsers: true,
            showIssues: true,
        };
        super(133 /* EditorOption.suggest */, 'suggest', defaults, {
            'editor.suggest.insertMode': {
                type: 'string',
                enum: ['insert', 'replace'],
                enumDescriptions: [
                    nls.localize('suggest.insertMode.insert', "Insert suggestion without overwriting text right of the cursor."),
                    nls.localize('suggest.insertMode.replace', "Insert suggestion and overwrite text right of the cursor."),
                ],
                default: defaults.insertMode,
                description: nls.localize('suggest.insertMode', "Controls whether words are overwritten when accepting completions. Note that this depends on extensions opting into this feature.")
            },
            'editor.suggest.filterGraceful': {
                type: 'boolean',
                default: defaults.filterGraceful,
                description: nls.localize('suggest.filterGraceful', "Controls whether filtering and sorting suggestions accounts for small typos.")
            },
            'editor.suggest.localityBonus': {
                type: 'boolean',
                default: defaults.localityBonus,
                description: nls.localize('suggest.localityBonus', "Controls whether sorting favors words that appear close to the cursor.")
            },
            'editor.suggest.shareSuggestSelections': {
                type: 'boolean',
                default: defaults.shareSuggestSelections,
                markdownDescription: nls.localize('suggest.shareSuggestSelections', "Controls whether remembered suggestion selections are shared between multiple workspaces and windows (needs `#editor.suggestSelection#`).")
            },
            'editor.suggest.selectionMode': {
                type: 'string',
                enum: ['always', 'never', 'whenTriggerCharacter', 'whenQuickSuggestion'],
                enumDescriptions: [
                    nls.localize('suggest.insertMode.always', "Always select a suggestion when automatically triggering IntelliSense."),
                    nls.localize('suggest.insertMode.never', "Never select a suggestion when automatically triggering IntelliSense."),
                    nls.localize('suggest.insertMode.whenTriggerCharacter', "Select a suggestion only when triggering IntelliSense from a trigger character."),
                    nls.localize('suggest.insertMode.whenQuickSuggestion', "Select a suggestion only when triggering IntelliSense as you type."),
                ],
                default: defaults.selectionMode,
                markdownDescription: nls.localize('suggest.selectionMode', "Controls whether a suggestion is selected when the widget shows. Note that this only applies to automatically triggered suggestions ({0} and {1}) and that a suggestion is always selected when explicitly invoked, e.g via `Ctrl+Space`.", '`#editor.quickSuggestions#`', '`#editor.suggestOnTriggerCharacters#`')
            },
            'editor.suggest.snippetsPreventQuickSuggestions': {
                type: 'boolean',
                default: defaults.snippetsPreventQuickSuggestions,
                description: nls.localize('suggest.snippetsPreventQuickSuggestions', "Controls whether an active snippet prevents quick suggestions.")
            },
            'editor.suggest.showIcons': {
                type: 'boolean',
                default: defaults.showIcons,
                description: nls.localize('suggest.showIcons', "Controls whether to show or hide icons in suggestions.")
            },
            'editor.suggest.showStatusBar': {
                type: 'boolean',
                default: defaults.showStatusBar,
                description: nls.localize('suggest.showStatusBar', "Controls the visibility of the status bar at the bottom of the suggest widget.")
            },
            'editor.suggest.preview': {
                type: 'boolean',
                default: defaults.preview,
                description: nls.localize('suggest.preview', "Controls whether to preview the suggestion outcome in the editor.")
            },
            'editor.suggest.showInlineDetails': {
                type: 'boolean',
                default: defaults.showInlineDetails,
                description: nls.localize('suggest.showInlineDetails', "Controls whether suggest details show inline with the label or only in the details widget.")
            },
            'editor.suggest.maxVisibleSuggestions': {
                type: 'number',
                deprecationMessage: nls.localize('suggest.maxVisibleSuggestions.dep', "This setting is deprecated. The suggest widget can now be resized."),
            },
            'editor.suggest.filteredTypes': {
                type: 'object',
                deprecationMessage: nls.localize('deprecated', "This setting is deprecated, please use separate settings like 'editor.suggest.showKeywords' or 'editor.suggest.showSnippets' instead.")
            },
            'editor.suggest.showMethods': {
                type: 'boolean',
                default: true,
                markdownDescription: nls.localize('editor.suggest.showMethods', "When enabled IntelliSense shows `method`-suggestions.")
            },
            'editor.suggest.showFunctions': {
                type: 'boolean',
                default: true,
                markdownDescription: nls.localize('editor.suggest.showFunctions', "When enabled IntelliSense shows `function`-suggestions.")
            },
            'editor.suggest.showConstructors': {
                type: 'boolean',
                default: true,
                markdownDescription: nls.localize('editor.suggest.showConstructors', "When enabled IntelliSense shows `constructor`-suggestions.")
            },
            'editor.suggest.showDeprecated': {
                type: 'boolean',
                default: true,
                markdownDescription: nls.localize('editor.suggest.showDeprecated', "When enabled IntelliSense shows `deprecated`-suggestions.")
            },
            'editor.suggest.matchOnWordStartOnly': {
                type: 'boolean',
                default: true,
                markdownDescription: nls.localize('editor.suggest.matchOnWordStartOnly', "When enabled IntelliSense filtering requires that the first character matches on a word start. For example, `c` on `Console` or `WebContext` but _not_ on `description`. When disabled IntelliSense will show more results but still sorts them by match quality.")
            },
            'editor.suggest.showFields': {
                type: 'boolean',
                default: true,
                markdownDescription: nls.localize('editor.suggest.showFields', "When enabled IntelliSense shows `field`-suggestions.")
            },
            'editor.suggest.showVariables': {
                type: 'boolean',
                default: true,
                markdownDescription: nls.localize('editor.suggest.showVariables', "When enabled IntelliSense shows `variable`-suggestions.")
            },
            'editor.suggest.showClasses': {
                type: 'boolean',
                default: true,
                markdownDescription: nls.localize('editor.suggest.showClasss', "When enabled IntelliSense shows `class`-suggestions.")
            },
            'editor.suggest.showStructs': {
                type: 'boolean',
                default: true,
                markdownDescription: nls.localize('editor.suggest.showStructs', "When enabled IntelliSense shows `struct`-suggestions.")
            },
            'editor.suggest.showInterfaces': {
                type: 'boolean',
                default: true,
                markdownDescription: nls.localize('editor.suggest.showInterfaces', "When enabled IntelliSense shows `interface`-suggestions.")
            },
            'editor.suggest.showModules': {
                type: 'boolean',
                default: true,
                markdownDescription: nls.localize('editor.suggest.showModules', "When enabled IntelliSense shows `module`-suggestions.")
            },
            'editor.suggest.showProperties': {
                type: 'boolean',
                default: true,
                markdownDescription: nls.localize('editor.suggest.showPropertys', "When enabled IntelliSense shows `property`-suggestions.")
            },
            'editor.suggest.showEvents': {
                type: 'boolean',
                default: true,
                markdownDescription: nls.localize('editor.suggest.showEvents', "When enabled IntelliSense shows `event`-suggestions.")
            },
            'editor.suggest.showOperators': {
                type: 'boolean',
                default: true,
                markdownDescription: nls.localize('editor.suggest.showOperators', "When enabled IntelliSense shows `operator`-suggestions.")
            },
            'editor.suggest.showUnits': {
                type: 'boolean',
                default: true,
                markdownDescription: nls.localize('editor.suggest.showUnits', "When enabled IntelliSense shows `unit`-suggestions.")
            },
            'editor.suggest.showValues': {
                type: 'boolean',
                default: true,
                markdownDescription: nls.localize('editor.suggest.showValues', "When enabled IntelliSense shows `value`-suggestions.")
            },
            'editor.suggest.showConstants': {
                type: 'boolean',
                default: true,
                markdownDescription: nls.localize('editor.suggest.showConstants', "When enabled IntelliSense shows `constant`-suggestions.")
            },
            'editor.suggest.showEnums': {
                type: 'boolean',
                default: true,
                markdownDescription: nls.localize('editor.suggest.showEnums', "When enabled IntelliSense shows `enum`-suggestions.")
            },
            'editor.suggest.showEnumMembers': {
                type: 'boolean',
                default: true,
                markdownDescription: nls.localize('editor.suggest.showEnumMembers', "When enabled IntelliSense shows `enumMember`-suggestions.")
            },
            'editor.suggest.showKeywords': {
                type: 'boolean',
                default: true,
                markdownDescription: nls.localize('editor.suggest.showKeywords', "When enabled IntelliSense shows `keyword`-suggestions.")
            },
            'editor.suggest.showWords': {
                type: 'boolean',
                default: true,
                markdownDescription: nls.localize('editor.suggest.showTexts', "When enabled IntelliSense shows `text`-suggestions.")
            },
            'editor.suggest.showColors': {
                type: 'boolean',
                default: true,
                markdownDescription: nls.localize('editor.suggest.showColors', "When enabled IntelliSense shows `color`-suggestions.")
            },
            'editor.suggest.showFiles': {
                type: 'boolean',
                default: true,
                markdownDescription: nls.localize('editor.suggest.showFiles', "When enabled IntelliSense shows `file`-suggestions.")
            },
            'editor.suggest.showReferences': {
                type: 'boolean',
                default: true,
                markdownDescription: nls.localize('editor.suggest.showReferences', "When enabled IntelliSense shows `reference`-suggestions.")
            },
            'editor.suggest.showCustomcolors': {
                type: 'boolean',
                default: true,
                markdownDescription: nls.localize('editor.suggest.showCustomcolors', "When enabled IntelliSense shows `customcolor`-suggestions.")
            },
            'editor.suggest.showFolders': {
                type: 'boolean',
                default: true,
                markdownDescription: nls.localize('editor.suggest.showFolders', "When enabled IntelliSense shows `folder`-suggestions.")
            },
            'editor.suggest.showTypeParameters': {
                type: 'boolean',
                default: true,
                markdownDescription: nls.localize('editor.suggest.showTypeParameters', "When enabled IntelliSense shows `typeParameter`-suggestions.")
            },
            'editor.suggest.showSnippets': {
                type: 'boolean',
                default: true,
                markdownDescription: nls.localize('editor.suggest.showSnippets', "When enabled IntelliSense shows `snippet`-suggestions.")
            },
            'editor.suggest.showUsers': {
                type: 'boolean',
                default: true,
                markdownDescription: nls.localize('editor.suggest.showUsers', "When enabled IntelliSense shows `user`-suggestions.")
            },
            'editor.suggest.showIssues': {
                type: 'boolean',
                default: true,
                markdownDescription: nls.localize('editor.suggest.showIssues', "When enabled IntelliSense shows `issues`-suggestions.")
            }
        });
    }
    validate(_input) {
        if (!_input || typeof _input !== 'object') {
            return this.defaultValue;
        }
        const input = _input;
        return {
            insertMode: stringSet(input.insertMode, this.defaultValue.insertMode, ['insert', 'replace']),
            filterGraceful: boolean(input.filterGraceful, this.defaultValue.filterGraceful),
            snippetsPreventQuickSuggestions: boolean(input.snippetsPreventQuickSuggestions, this.defaultValue.filterGraceful),
            localityBonus: boolean(input.localityBonus, this.defaultValue.localityBonus),
            shareSuggestSelections: boolean(input.shareSuggestSelections, this.defaultValue.shareSuggestSelections),
            selectionMode: stringSet(input.selectionMode, this.defaultValue.selectionMode, ['always', 'never', 'whenQuickSuggestion', 'whenTriggerCharacter']),
            showIcons: boolean(input.showIcons, this.defaultValue.showIcons),
            showStatusBar: boolean(input.showStatusBar, this.defaultValue.showStatusBar),
            preview: boolean(input.preview, this.defaultValue.preview),
            previewMode: stringSet(input.previewMode, this.defaultValue.previewMode, ['prefix', 'subword', 'subwordSmart']),
            showInlineDetails: boolean(input.showInlineDetails, this.defaultValue.showInlineDetails),
            showMethods: boolean(input.showMethods, this.defaultValue.showMethods),
            showFunctions: boolean(input.showFunctions, this.defaultValue.showFunctions),
            showConstructors: boolean(input.showConstructors, this.defaultValue.showConstructors),
            showDeprecated: boolean(input.showDeprecated, this.defaultValue.showDeprecated),
            matchOnWordStartOnly: boolean(input.matchOnWordStartOnly, this.defaultValue.matchOnWordStartOnly),
            showFields: boolean(input.showFields, this.defaultValue.showFields),
            showVariables: boolean(input.showVariables, this.defaultValue.showVariables),
            showClasses: boolean(input.showClasses, this.defaultValue.showClasses),
            showStructs: boolean(input.showStructs, this.defaultValue.showStructs),
            showInterfaces: boolean(input.showInterfaces, this.defaultValue.showInterfaces),
            showModules: boolean(input.showModules, this.defaultValue.showModules),
            showProperties: boolean(input.showProperties, this.defaultValue.showProperties),
            showEvents: boolean(input.showEvents, this.defaultValue.showEvents),
            showOperators: boolean(input.showOperators, this.defaultValue.showOperators),
            showUnits: boolean(input.showUnits, this.defaultValue.showUnits),
            showValues: boolean(input.showValues, this.defaultValue.showValues),
            showConstants: boolean(input.showConstants, this.defaultValue.showConstants),
            showEnums: boolean(input.showEnums, this.defaultValue.showEnums),
            showEnumMembers: boolean(input.showEnumMembers, this.defaultValue.showEnumMembers),
            showKeywords: boolean(input.showKeywords, this.defaultValue.showKeywords),
            showWords: boolean(input.showWords, this.defaultValue.showWords),
            showColors: boolean(input.showColors, this.defaultValue.showColors),
            showFiles: boolean(input.showFiles, this.defaultValue.showFiles),
            showReferences: boolean(input.showReferences, this.defaultValue.showReferences),
            showFolders: boolean(input.showFolders, this.defaultValue.showFolders),
            showTypeParameters: boolean(input.showTypeParameters, this.defaultValue.showTypeParameters),
            showSnippets: boolean(input.showSnippets, this.defaultValue.showSnippets),
            showUsers: boolean(input.showUsers, this.defaultValue.showUsers),
            showIssues: boolean(input.showIssues, this.defaultValue.showIssues),
        };
    }
}
class SmartSelect extends BaseEditorOption {
    constructor() {
        super(128 /* EditorOption.smartSelect */, 'smartSelect', {
            selectLeadingAndTrailingWhitespace: true,
            selectSubwords: true,
        }, {
            'editor.smartSelect.selectLeadingAndTrailingWhitespace': {
                description: nls.localize('selectLeadingAndTrailingWhitespace', "Whether leading and trailing whitespace should always be selected."),
                default: true,
                type: 'boolean'
            },
            'editor.smartSelect.selectSubwords': {
                description: nls.localize('selectSubwords', "Whether subwords (like 'foo' in 'fooBar' or 'foo_bar') should be selected."),
                default: true,
                type: 'boolean'
            }
        });
    }
    validate(input) {
        if (!input || typeof input !== 'object') {
            return this.defaultValue;
        }
        return {
            selectLeadingAndTrailingWhitespace: boolean(input.selectLeadingAndTrailingWhitespace, this.defaultValue.selectLeadingAndTrailingWhitespace),
            selectSubwords: boolean(input.selectSubwords, this.defaultValue.selectSubwords),
        };
    }
}
//#endregion
//#region wordSegmenterLocales
/**
 * Locales used for segmenting lines into words when doing word related navigations or operations.
 *
 * Specify the BCP 47 language tag of the word you wish to recognize (e.g., ja, zh-CN, zh-Hant-TW, etc.).
 */
class WordSegmenterLocales extends BaseEditorOption {
    constructor() {
        const defaults = [];
        super(146 /* EditorOption.wordSegmenterLocales */, 'wordSegmenterLocales', defaults, {
            anyOf: [
                {
                    type: 'string',
                }, {
                    type: 'array',
                    items: {
                        type: 'string'
                    }
                }
            ],
            description: nls.localize('wordSegmenterLocales', "Locales to be used for word segmentation when doing word related navigations or operations. Specify the BCP 47 language tag of the word you wish to recognize (e.g., ja, zh-CN, zh-Hant-TW, etc.)."),
            type: 'array',
            items: {
                type: 'string',
            },
            default: defaults,
        });
    }
    validate(input) {
        if (typeof input === 'string') {
            input = [input];
        }
        if (Array.isArray(input)) {
            const validLocales = [];
            for (const locale of input) {
                if (typeof locale === 'string') {
                    try {
                        if (Intl.Segmenter.supportedLocalesOf(locale).length > 0) {
                            validLocales.push(locale);
                        }
                    }
                    catch {
                        // ignore invalid locales
                    }
                }
            }
            return validLocales;
        }
        return this.defaultValue;
    }
}
//#endregion
//#region wrappingIndent
/**
 * Describes how to indent wrapped lines.
 */
export var WrappingIndent;
(function (WrappingIndent) {
    /**
     * No indentation => wrapped lines begin at column 1.
     */
    WrappingIndent[WrappingIndent["None"] = 0] = "None";
    /**
     * Same => wrapped lines get the same indentation as the parent.
     */
    WrappingIndent[WrappingIndent["Same"] = 1] = "Same";
    /**
     * Indent => wrapped lines get +1 indentation toward the parent.
     */
    WrappingIndent[WrappingIndent["Indent"] = 2] = "Indent";
    /**
     * DeepIndent => wrapped lines get +2 indentation toward the parent.
     */
    WrappingIndent[WrappingIndent["DeepIndent"] = 3] = "DeepIndent";
})(WrappingIndent || (WrappingIndent = {}));
class WrappingIndentOption extends BaseEditorOption {
    constructor() {
        super(154 /* EditorOption.wrappingIndent */, 'wrappingIndent', 1 /* WrappingIndent.Same */, {
            'editor.wrappingIndent': {
                type: 'string',
                enum: ['none', 'same', 'indent', 'deepIndent'],
                enumDescriptions: [
                    nls.localize('wrappingIndent.none', "No indentation. Wrapped lines begin at column 1."),
                    nls.localize('wrappingIndent.same', "Wrapped lines get the same indentation as the parent."),
                    nls.localize('wrappingIndent.indent', "Wrapped lines get +1 indentation toward the parent."),
                    nls.localize('wrappingIndent.deepIndent', "Wrapped lines get +2 indentation toward the parent."),
                ],
                description: nls.localize('wrappingIndent', "Controls the indentation of wrapped lines."),
                default: 'same'
            }
        });
    }
    validate(input) {
        switch (input) {
            case 'none': return 0 /* WrappingIndent.None */;
            case 'same': return 1 /* WrappingIndent.Same */;
            case 'indent': return 2 /* WrappingIndent.Indent */;
            case 'deepIndent': return 3 /* WrappingIndent.DeepIndent */;
        }
        return 1 /* WrappingIndent.Same */;
    }
    compute(env, options, value) {
        const accessibilitySupport = options.get(2 /* EditorOption.accessibilitySupport */);
        if (accessibilitySupport === 2 /* AccessibilitySupport.Enabled */) {
            // if we know for a fact that a screen reader is attached, we use no indent wrapping to
            // help that the editor's wrapping points match the textarea's wrapping points
            return 0 /* WrappingIndent.None */;
        }
        return value;
    }
}
class EditorWrappingInfoComputer extends ComputedEditorOption {
    constructor() {
        super(165 /* EditorOption.wrappingInfo */);
    }
    compute(env, options, _) {
        const layoutInfo = options.get(164 /* EditorOption.layoutInfo */);
        return {
            isDominatedByLongLines: env.isDominatedByLongLines,
            isWordWrapMinified: layoutInfo.isWordWrapMinified,
            isViewportWrapping: layoutInfo.isViewportWrapping,
            wrappingColumn: layoutInfo.wrappingColumn,
        };
    }
}
class EditorDropIntoEditor extends BaseEditorOption {
    constructor() {
        const defaults = { enabled: true, showDropSelector: 'afterDrop' };
        super(43 /* EditorOption.dropIntoEditor */, 'dropIntoEditor', defaults, {
            'editor.dropIntoEditor.enabled': {
                type: 'boolean',
                default: defaults.enabled,
                markdownDescription: nls.localize('dropIntoEditor.enabled', "Controls whether you can drag and drop a file into a text editor by holding down the `Shift` key (instead of opening the file in an editor)."),
            },
            'editor.dropIntoEditor.showDropSelector': {
                type: 'string',
                markdownDescription: nls.localize('dropIntoEditor.showDropSelector', "Controls if a widget is shown when dropping files into the editor. This widget lets you control how the file is dropped."),
                enum: [
                    'afterDrop',
                    'never'
                ],
                enumDescriptions: [
                    nls.localize('dropIntoEditor.showDropSelector.afterDrop', "Show the drop selector widget after a file is dropped into the editor."),
                    nls.localize('dropIntoEditor.showDropSelector.never', "Never show the drop selector widget. Instead the default drop provider is always used."),
                ],
                default: 'afterDrop',
            },
        });
    }
    validate(_input) {
        if (!_input || typeof _input !== 'object') {
            return this.defaultValue;
        }
        const input = _input;
        return {
            enabled: boolean(input.enabled, this.defaultValue.enabled),
            showDropSelector: stringSet(input.showDropSelector, this.defaultValue.showDropSelector, ['afterDrop', 'never']),
        };
    }
}
class EditorPasteAs extends BaseEditorOption {
    constructor() {
        const defaults = { enabled: true, showPasteSelector: 'afterPaste' };
        super(96 /* EditorOption.pasteAs */, 'pasteAs', defaults, {
            'editor.pasteAs.enabled': {
                type: 'boolean',
                default: defaults.enabled,
                markdownDescription: nls.localize('pasteAs.enabled', "Controls whether you can paste content in different ways."),
            },
            'editor.pasteAs.showPasteSelector': {
                type: 'string',
                markdownDescription: nls.localize('pasteAs.showPasteSelector', "Controls if a widget is shown when pasting content in to the editor. This widget lets you control how the file is pasted."),
                enum: [
                    'afterPaste',
                    'never'
                ],
                enumDescriptions: [
                    nls.localize('pasteAs.showPasteSelector.afterPaste', "Show the paste selector widget after content is pasted into the editor."),
                    nls.localize('pasteAs.showPasteSelector.never', "Never show the paste selector widget. Instead the default pasting behavior is always used."),
                ],
                default: 'afterPaste',
            },
        });
    }
    validate(_input) {
        if (!_input || typeof _input !== 'object') {
            return this.defaultValue;
        }
        const input = _input;
        return {
            enabled: boolean(input.enabled, this.defaultValue.enabled),
            showPasteSelector: stringSet(input.showPasteSelector, this.defaultValue.showPasteSelector, ['afterPaste', 'never']),
        };
    }
}
//#endregion
const DEFAULT_WINDOWS_FONT_FAMILY = 'Consolas, \'Courier New\', monospace';
const DEFAULT_MAC_FONT_FAMILY = 'Menlo, Monaco, \'Courier New\', monospace';
const DEFAULT_LINUX_FONT_FAMILY = '\'Droid Sans Mono\', \'monospace\', monospace';
/**
 * @internal
 */
export const EDITOR_FONT_DEFAULTS = {
    fontFamily: (platform.isMacintosh ? DEFAULT_MAC_FONT_FAMILY : (platform.isWindows ? DEFAULT_WINDOWS_FONT_FAMILY : DEFAULT_LINUX_FONT_FAMILY)),
    fontWeight: 'normal',
    fontSize: (platform.isMacintosh ? 12 : 14),
    lineHeight: 0,
    letterSpacing: 0,
};
/**
 * @internal
 */
export const editorOptionsRegistry = [];
function register(option) {
    editorOptionsRegistry[option.id] = option;
    return option;
}
export var EditorOption;
(function (EditorOption) {
    EditorOption[EditorOption["acceptSuggestionOnCommitCharacter"] = 0] = "acceptSuggestionOnCommitCharacter";
    EditorOption[EditorOption["acceptSuggestionOnEnter"] = 1] = "acceptSuggestionOnEnter";
    EditorOption[EditorOption["accessibilitySupport"] = 2] = "accessibilitySupport";
    EditorOption[EditorOption["accessibilityPageSize"] = 3] = "accessibilityPageSize";
    EditorOption[EditorOption["allowOverflow"] = 4] = "allowOverflow";
    EditorOption[EditorOption["allowVariableLineHeights"] = 5] = "allowVariableLineHeights";
    EditorOption[EditorOption["allowVariableFonts"] = 6] = "allowVariableFonts";
    EditorOption[EditorOption["allowVariableFontsInAccessibilityMode"] = 7] = "allowVariableFontsInAccessibilityMode";
    EditorOption[EditorOption["ariaLabel"] = 8] = "ariaLabel";
    EditorOption[EditorOption["ariaRequired"] = 9] = "ariaRequired";
    EditorOption[EditorOption["autoClosingBrackets"] = 10] = "autoClosingBrackets";
    EditorOption[EditorOption["autoClosingComments"] = 11] = "autoClosingComments";
    EditorOption[EditorOption["screenReaderAnnounceInlineSuggestion"] = 12] = "screenReaderAnnounceInlineSuggestion";
    EditorOption[EditorOption["autoClosingDelete"] = 13] = "autoClosingDelete";
    EditorOption[EditorOption["autoClosingOvertype"] = 14] = "autoClosingOvertype";
    EditorOption[EditorOption["autoClosingQuotes"] = 15] = "autoClosingQuotes";
    EditorOption[EditorOption["autoIndent"] = 16] = "autoIndent";
    EditorOption[EditorOption["autoIndentOnPaste"] = 17] = "autoIndentOnPaste";
    EditorOption[EditorOption["autoIndentOnPasteWithinString"] = 18] = "autoIndentOnPasteWithinString";
    EditorOption[EditorOption["automaticLayout"] = 19] = "automaticLayout";
    EditorOption[EditorOption["autoSurround"] = 20] = "autoSurround";
    EditorOption[EditorOption["bracketPairColorization"] = 21] = "bracketPairColorization";
    EditorOption[EditorOption["guides"] = 22] = "guides";
    EditorOption[EditorOption["codeLens"] = 23] = "codeLens";
    EditorOption[EditorOption["codeLensFontFamily"] = 24] = "codeLensFontFamily";
    EditorOption[EditorOption["codeLensFontSize"] = 25] = "codeLensFontSize";
    EditorOption[EditorOption["colorDecorators"] = 26] = "colorDecorators";
    EditorOption[EditorOption["colorDecoratorsLimit"] = 27] = "colorDecoratorsLimit";
    EditorOption[EditorOption["columnSelection"] = 28] = "columnSelection";
    EditorOption[EditorOption["comments"] = 29] = "comments";
    EditorOption[EditorOption["contextmenu"] = 30] = "contextmenu";
    EditorOption[EditorOption["copyWithSyntaxHighlighting"] = 31] = "copyWithSyntaxHighlighting";
    EditorOption[EditorOption["cursorBlinking"] = 32] = "cursorBlinking";
    EditorOption[EditorOption["cursorSmoothCaretAnimation"] = 33] = "cursorSmoothCaretAnimation";
    EditorOption[EditorOption["cursorStyle"] = 34] = "cursorStyle";
    EditorOption[EditorOption["cursorSurroundingLines"] = 35] = "cursorSurroundingLines";
    EditorOption[EditorOption["cursorSurroundingLinesStyle"] = 36] = "cursorSurroundingLinesStyle";
    EditorOption[EditorOption["cursorWidth"] = 37] = "cursorWidth";
    EditorOption[EditorOption["cursorHeight"] = 38] = "cursorHeight";
    EditorOption[EditorOption["disableLayerHinting"] = 39] = "disableLayerHinting";
    EditorOption[EditorOption["disableMonospaceOptimizations"] = 40] = "disableMonospaceOptimizations";
    EditorOption[EditorOption["domReadOnly"] = 41] = "domReadOnly";
    EditorOption[EditorOption["dragAndDrop"] = 42] = "dragAndDrop";
    EditorOption[EditorOption["dropIntoEditor"] = 43] = "dropIntoEditor";
    EditorOption[EditorOption["editContext"] = 44] = "editContext";
    EditorOption[EditorOption["emptySelectionClipboard"] = 45] = "emptySelectionClipboard";
    EditorOption[EditorOption["experimentalGpuAcceleration"] = 46] = "experimentalGpuAcceleration";
    EditorOption[EditorOption["experimentalWhitespaceRendering"] = 47] = "experimentalWhitespaceRendering";
    EditorOption[EditorOption["extraEditorClassName"] = 48] = "extraEditorClassName";
    EditorOption[EditorOption["fastScrollSensitivity"] = 49] = "fastScrollSensitivity";
    EditorOption[EditorOption["find"] = 50] = "find";
    EditorOption[EditorOption["fixedOverflowWidgets"] = 51] = "fixedOverflowWidgets";
    EditorOption[EditorOption["folding"] = 52] = "folding";
    EditorOption[EditorOption["foldingStrategy"] = 53] = "foldingStrategy";
    EditorOption[EditorOption["foldingHighlight"] = 54] = "foldingHighlight";
    EditorOption[EditorOption["foldingImportsByDefault"] = 55] = "foldingImportsByDefault";
    EditorOption[EditorOption["foldingMaximumRegions"] = 56] = "foldingMaximumRegions";
    EditorOption[EditorOption["unfoldOnClickAfterEndOfLine"] = 57] = "unfoldOnClickAfterEndOfLine";
    EditorOption[EditorOption["fontFamily"] = 58] = "fontFamily";
    EditorOption[EditorOption["fontInfo"] = 59] = "fontInfo";
    EditorOption[EditorOption["fontLigatures"] = 60] = "fontLigatures";
    EditorOption[EditorOption["fontSize"] = 61] = "fontSize";
    EditorOption[EditorOption["fontWeight"] = 62] = "fontWeight";
    EditorOption[EditorOption["fontVariations"] = 63] = "fontVariations";
    EditorOption[EditorOption["formatOnPaste"] = 64] = "formatOnPaste";
    EditorOption[EditorOption["formatOnType"] = 65] = "formatOnType";
    EditorOption[EditorOption["glyphMargin"] = 66] = "glyphMargin";
    EditorOption[EditorOption["gotoLocation"] = 67] = "gotoLocation";
    EditorOption[EditorOption["hideCursorInOverviewRuler"] = 68] = "hideCursorInOverviewRuler";
    EditorOption[EditorOption["hover"] = 69] = "hover";
    EditorOption[EditorOption["inDiffEditor"] = 70] = "inDiffEditor";
    EditorOption[EditorOption["inlineSuggest"] = 71] = "inlineSuggest";
    EditorOption[EditorOption["letterSpacing"] = 72] = "letterSpacing";
    EditorOption[EditorOption["lightbulb"] = 73] = "lightbulb";
    EditorOption[EditorOption["lineDecorationsWidth"] = 74] = "lineDecorationsWidth";
    EditorOption[EditorOption["lineHeight"] = 75] = "lineHeight";
    EditorOption[EditorOption["lineNumbers"] = 76] = "lineNumbers";
    EditorOption[EditorOption["lineNumbersMinChars"] = 77] = "lineNumbersMinChars";
    EditorOption[EditorOption["linkedEditing"] = 78] = "linkedEditing";
    EditorOption[EditorOption["links"] = 79] = "links";
    EditorOption[EditorOption["matchBrackets"] = 80] = "matchBrackets";
    EditorOption[EditorOption["minimap"] = 81] = "minimap";
    EditorOption[EditorOption["mouseStyle"] = 82] = "mouseStyle";
    EditorOption[EditorOption["mouseWheelScrollSensitivity"] = 83] = "mouseWheelScrollSensitivity";
    EditorOption[EditorOption["mouseWheelZoom"] = 84] = "mouseWheelZoom";
    EditorOption[EditorOption["multiCursorMergeOverlapping"] = 85] = "multiCursorMergeOverlapping";
    EditorOption[EditorOption["multiCursorModifier"] = 86] = "multiCursorModifier";
    EditorOption[EditorOption["multiCursorPaste"] = 87] = "multiCursorPaste";
    EditorOption[EditorOption["multiCursorLimit"] = 88] = "multiCursorLimit";
    EditorOption[EditorOption["occurrencesHighlight"] = 89] = "occurrencesHighlight";
    EditorOption[EditorOption["occurrencesHighlightDelay"] = 90] = "occurrencesHighlightDelay";
    EditorOption[EditorOption["overtypeCursorStyle"] = 91] = "overtypeCursorStyle";
    EditorOption[EditorOption["overtypeOnPaste"] = 92] = "overtypeOnPaste";
    EditorOption[EditorOption["overviewRulerBorder"] = 93] = "overviewRulerBorder";
    EditorOption[EditorOption["overviewRulerLanes"] = 94] = "overviewRulerLanes";
    EditorOption[EditorOption["padding"] = 95] = "padding";
    EditorOption[EditorOption["pasteAs"] = 96] = "pasteAs";
    EditorOption[EditorOption["parameterHints"] = 97] = "parameterHints";
    EditorOption[EditorOption["peekWidgetDefaultFocus"] = 98] = "peekWidgetDefaultFocus";
    EditorOption[EditorOption["placeholder"] = 99] = "placeholder";
    EditorOption[EditorOption["definitionLinkOpensInPeek"] = 100] = "definitionLinkOpensInPeek";
    EditorOption[EditorOption["quickSuggestions"] = 101] = "quickSuggestions";
    EditorOption[EditorOption["quickSuggestionsDelay"] = 102] = "quickSuggestionsDelay";
    EditorOption[EditorOption["readOnly"] = 103] = "readOnly";
    EditorOption[EditorOption["readOnlyMessage"] = 104] = "readOnlyMessage";
    EditorOption[EditorOption["renameOnType"] = 105] = "renameOnType";
    EditorOption[EditorOption["renderRichScreenReaderContent"] = 106] = "renderRichScreenReaderContent";
    EditorOption[EditorOption["renderControlCharacters"] = 107] = "renderControlCharacters";
    EditorOption[EditorOption["renderFinalNewline"] = 108] = "renderFinalNewline";
    EditorOption[EditorOption["renderLineHighlight"] = 109] = "renderLineHighlight";
    EditorOption[EditorOption["renderLineHighlightOnlyWhenFocus"] = 110] = "renderLineHighlightOnlyWhenFocus";
    EditorOption[EditorOption["renderValidationDecorations"] = 111] = "renderValidationDecorations";
    EditorOption[EditorOption["renderWhitespace"] = 112] = "renderWhitespace";
    EditorOption[EditorOption["revealHorizontalRightPadding"] = 113] = "revealHorizontalRightPadding";
    EditorOption[EditorOption["roundedSelection"] = 114] = "roundedSelection";
    EditorOption[EditorOption["rulers"] = 115] = "rulers";
    EditorOption[EditorOption["scrollbar"] = 116] = "scrollbar";
    EditorOption[EditorOption["scrollBeyondLastColumn"] = 117] = "scrollBeyondLastColumn";
    EditorOption[EditorOption["scrollBeyondLastLine"] = 118] = "scrollBeyondLastLine";
    EditorOption[EditorOption["scrollPredominantAxis"] = 119] = "scrollPredominantAxis";
    EditorOption[EditorOption["selectionClipboard"] = 120] = "selectionClipboard";
    EditorOption[EditorOption["selectionHighlight"] = 121] = "selectionHighlight";
    EditorOption[EditorOption["selectionHighlightMaxLength"] = 122] = "selectionHighlightMaxLength";
    EditorOption[EditorOption["selectionHighlightMultiline"] = 123] = "selectionHighlightMultiline";
    EditorOption[EditorOption["selectOnLineNumbers"] = 124] = "selectOnLineNumbers";
    EditorOption[EditorOption["showFoldingControls"] = 125] = "showFoldingControls";
    EditorOption[EditorOption["showUnused"] = 126] = "showUnused";
    EditorOption[EditorOption["snippetSuggestions"] = 127] = "snippetSuggestions";
    EditorOption[EditorOption["smartSelect"] = 128] = "smartSelect";
    EditorOption[EditorOption["smoothScrolling"] = 129] = "smoothScrolling";
    EditorOption[EditorOption["stickyScroll"] = 130] = "stickyScroll";
    EditorOption[EditorOption["stickyTabStops"] = 131] = "stickyTabStops";
    EditorOption[EditorOption["stopRenderingLineAfter"] = 132] = "stopRenderingLineAfter";
    EditorOption[EditorOption["suggest"] = 133] = "suggest";
    EditorOption[EditorOption["suggestFontSize"] = 134] = "suggestFontSize";
    EditorOption[EditorOption["suggestLineHeight"] = 135] = "suggestLineHeight";
    EditorOption[EditorOption["suggestOnTriggerCharacters"] = 136] = "suggestOnTriggerCharacters";
    EditorOption[EditorOption["suggestSelection"] = 137] = "suggestSelection";
    EditorOption[EditorOption["tabCompletion"] = 138] = "tabCompletion";
    EditorOption[EditorOption["tabIndex"] = 139] = "tabIndex";
    EditorOption[EditorOption["trimWhitespaceOnDelete"] = 140] = "trimWhitespaceOnDelete";
    EditorOption[EditorOption["unicodeHighlighting"] = 141] = "unicodeHighlighting";
    EditorOption[EditorOption["unusualLineTerminators"] = 142] = "unusualLineTerminators";
    EditorOption[EditorOption["useShadowDOM"] = 143] = "useShadowDOM";
    EditorOption[EditorOption["useTabStops"] = 144] = "useTabStops";
    EditorOption[EditorOption["wordBreak"] = 145] = "wordBreak";
    EditorOption[EditorOption["wordSegmenterLocales"] = 146] = "wordSegmenterLocales";
    EditorOption[EditorOption["wordSeparators"] = 147] = "wordSeparators";
    EditorOption[EditorOption["wordWrap"] = 148] = "wordWrap";
    EditorOption[EditorOption["wordWrapBreakAfterCharacters"] = 149] = "wordWrapBreakAfterCharacters";
    EditorOption[EditorOption["wordWrapBreakBeforeCharacters"] = 150] = "wordWrapBreakBeforeCharacters";
    EditorOption[EditorOption["wordWrapColumn"] = 151] = "wordWrapColumn";
    EditorOption[EditorOption["wordWrapOverride1"] = 152] = "wordWrapOverride1";
    EditorOption[EditorOption["wordWrapOverride2"] = 153] = "wordWrapOverride2";
    EditorOption[EditorOption["wrappingIndent"] = 154] = "wrappingIndent";
    EditorOption[EditorOption["wrappingStrategy"] = 155] = "wrappingStrategy";
    EditorOption[EditorOption["showDeprecated"] = 156] = "showDeprecated";
    EditorOption[EditorOption["inertialScroll"] = 157] = "inertialScroll";
    EditorOption[EditorOption["inlayHints"] = 158] = "inlayHints";
    EditorOption[EditorOption["wrapOnEscapedLineFeeds"] = 159] = "wrapOnEscapedLineFeeds";
    // Leave these at the end (because they have dependencies!)
    EditorOption[EditorOption["effectiveCursorStyle"] = 160] = "effectiveCursorStyle";
    EditorOption[EditorOption["editorClassName"] = 161] = "editorClassName";
    EditorOption[EditorOption["pixelRatio"] = 162] = "pixelRatio";
    EditorOption[EditorOption["tabFocusMode"] = 163] = "tabFocusMode";
    EditorOption[EditorOption["layoutInfo"] = 164] = "layoutInfo";
    EditorOption[EditorOption["wrappingInfo"] = 165] = "wrappingInfo";
    EditorOption[EditorOption["defaultColorDecorators"] = 166] = "defaultColorDecorators";
    EditorOption[EditorOption["colorDecoratorsActivatedOn"] = 167] = "colorDecoratorsActivatedOn";
    EditorOption[EditorOption["inlineCompletionsAccessibilityVerbose"] = 168] = "inlineCompletionsAccessibilityVerbose";
    EditorOption[EditorOption["effectiveEditContext"] = 169] = "effectiveEditContext";
    EditorOption[EditorOption["scrollOnMiddleClick"] = 170] = "scrollOnMiddleClick";
    EditorOption[EditorOption["effectiveAllowVariableFonts"] = 171] = "effectiveAllowVariableFonts";
})(EditorOption || (EditorOption = {}));
export const EditorOptions = {
    acceptSuggestionOnCommitCharacter: register(new EditorBooleanOption(0 /* EditorOption.acceptSuggestionOnCommitCharacter */, 'acceptSuggestionOnCommitCharacter', true, { markdownDescription: nls.localize('acceptSuggestionOnCommitCharacter', "Controls whether suggestions should be accepted on commit characters. For example, in JavaScript, the semi-colon (`;`) can be a commit character that accepts a suggestion and types that character.") })),
    acceptSuggestionOnEnter: register(new EditorStringEnumOption(1 /* EditorOption.acceptSuggestionOnEnter */, 'acceptSuggestionOnEnter', 'on', ['on', 'smart', 'off'], {
        markdownEnumDescriptions: [
            '',
            nls.localize('acceptSuggestionOnEnterSmart', "Only accept a suggestion with `Enter` when it makes a textual change."),
            ''
        ],
        markdownDescription: nls.localize('acceptSuggestionOnEnter', "Controls whether suggestions should be accepted on `Enter`, in addition to `Tab`. Helps to avoid ambiguity between inserting new lines or accepting suggestions.")
    })),
    accessibilitySupport: register(new EditorAccessibilitySupport()),
    accessibilityPageSize: register(new EditorIntOption(3 /* EditorOption.accessibilityPageSize */, 'accessibilityPageSize', 500, 1, 1073741824 /* Constants.MAX_SAFE_SMALL_INTEGER */, {
        description: nls.localize('accessibilityPageSize', "Controls the number of lines in the editor that can be read out by a screen reader at once. When we detect a screen reader we automatically set the default to be 500. Warning: this has a performance implication for numbers larger than the default."),
        tags: ['accessibility']
    })),
    allowOverflow: register(new EditorBooleanOption(4 /* EditorOption.allowOverflow */, 'allowOverflow', true)),
    allowVariableLineHeights: register(new EditorBooleanOption(5 /* EditorOption.allowVariableLineHeights */, 'allowVariableLineHeights', true, {
        description: nls.localize('allowVariableLineHeights', "Controls whether to allow using variable line heights in the editor.")
    })),
    allowVariableFonts: register(new EditorBooleanOption(6 /* EditorOption.allowVariableFonts */, 'allowVariableFonts', true, {
        description: nls.localize('allowVariableFonts', "Controls whether to allow using variable fonts in the editor.")
    })),
    allowVariableFontsInAccessibilityMode: register(new EditorBooleanOption(7 /* EditorOption.allowVariableFontsInAccessibilityMode */, 'allowVariableFontsInAccessibilityMode', false, {
        description: nls.localize('allowVariableFontsInAccessibilityMode', "Controls whether to allow using variable fonts in the editor in the accessibility mode."),
        tags: ['accessibility']
    })),
    ariaLabel: register(new EditorStringOption(8 /* EditorOption.ariaLabel */, 'ariaLabel', nls.localize('editorViewAccessibleLabel', "Editor content"))),
    ariaRequired: register(new EditorBooleanOption(9 /* EditorOption.ariaRequired */, 'ariaRequired', false, undefined)),
    screenReaderAnnounceInlineSuggestion: register(new EditorBooleanOption(12 /* EditorOption.screenReaderAnnounceInlineSuggestion */, 'screenReaderAnnounceInlineSuggestion', true, {
        description: nls.localize('screenReaderAnnounceInlineSuggestion', "Control whether inline suggestions are announced by a screen reader."),
        tags: ['accessibility']
    })),
    autoClosingBrackets: register(new EditorStringEnumOption(10 /* EditorOption.autoClosingBrackets */, 'autoClosingBrackets', 'languageDefined', ['always', 'languageDefined', 'beforeWhitespace', 'never'], {
        enumDescriptions: [
            '',
            nls.localize('editor.autoClosingBrackets.languageDefined', "Use language configurations to determine when to autoclose brackets."),
            nls.localize('editor.autoClosingBrackets.beforeWhitespace', "Autoclose brackets only when the cursor is to the left of whitespace."),
            '',
        ],
        description: nls.localize('autoClosingBrackets', "Controls whether the editor should automatically close brackets after the user adds an opening bracket.")
    })),
    autoClosingComments: register(new EditorStringEnumOption(11 /* EditorOption.autoClosingComments */, 'autoClosingComments', 'languageDefined', ['always', 'languageDefined', 'beforeWhitespace', 'never'], {
        enumDescriptions: [
            '',
            nls.localize('editor.autoClosingComments.languageDefined', "Use language configurations to determine when to autoclose comments."),
            nls.localize('editor.autoClosingComments.beforeWhitespace', "Autoclose comments only when the cursor is to the left of whitespace."),
            '',
        ],
        description: nls.localize('autoClosingComments', "Controls whether the editor should automatically close comments after the user adds an opening comment.")
    })),
    autoClosingDelete: register(new EditorStringEnumOption(13 /* EditorOption.autoClosingDelete */, 'autoClosingDelete', 'auto', ['always', 'auto', 'never'], {
        enumDescriptions: [
            '',
            nls.localize('editor.autoClosingDelete.auto', "Remove adjacent closing quotes or brackets only if they were automatically inserted."),
            '',
        ],
        description: nls.localize('autoClosingDelete', "Controls whether the editor should remove adjacent closing quotes or brackets when deleting.")
    })),
    autoClosingOvertype: register(new EditorStringEnumOption(14 /* EditorOption.autoClosingOvertype */, 'autoClosingOvertype', 'auto', ['always', 'auto', 'never'], {
        enumDescriptions: [
            '',
            nls.localize('editor.autoClosingOvertype.auto', "Type over closing quotes or brackets only if they were automatically inserted."),
            '',
        ],
        description: nls.localize('autoClosingOvertype', "Controls whether the editor should type over closing quotes or brackets.")
    })),
    autoClosingQuotes: register(new EditorStringEnumOption(15 /* EditorOption.autoClosingQuotes */, 'autoClosingQuotes', 'languageDefined', ['always', 'languageDefined', 'beforeWhitespace', 'never'], {
        enumDescriptions: [
            '',
            nls.localize('editor.autoClosingQuotes.languageDefined', "Use language configurations to determine when to autoclose quotes."),
            nls.localize('editor.autoClosingQuotes.beforeWhitespace', "Autoclose quotes only when the cursor is to the left of whitespace."),
            '',
        ],
        description: nls.localize('autoClosingQuotes', "Controls whether the editor should automatically close quotes after the user adds an opening quote.")
    })),
    autoIndent: register(new EditorEnumOption(16 /* EditorOption.autoIndent */, 'autoIndent', 4 /* EditorAutoIndentStrategy.Full */, 'full', ['none', 'keep', 'brackets', 'advanced', 'full'], _autoIndentFromString, {
        enumDescriptions: [
            nls.localize('editor.autoIndent.none', "The editor will not insert indentation automatically."),
            nls.localize('editor.autoIndent.keep', "The editor will keep the current line's indentation."),
            nls.localize('editor.autoIndent.brackets', "The editor will keep the current line's indentation and honor language defined brackets."),
            nls.localize('editor.autoIndent.advanced', "The editor will keep the current line's indentation, honor language defined brackets and invoke special onEnterRules defined by languages."),
            nls.localize('editor.autoIndent.full', "The editor will keep the current line's indentation, honor language defined brackets, invoke special onEnterRules defined by languages, and honor indentationRules defined by languages."),
        ],
        description: nls.localize('autoIndent', "Controls whether the editor should automatically adjust the indentation when users type, paste, move or indent lines.")
    })),
    autoIndentOnPaste: register(new EditorBooleanOption(17 /* EditorOption.autoIndentOnPaste */, 'autoIndentOnPaste', false, { description: nls.localize('autoIndentOnPaste', "Controls whether the editor should automatically auto-indent the pasted content.") })),
    autoIndentOnPasteWithinString: register(new EditorBooleanOption(18 /* EditorOption.autoIndentOnPasteWithinString */, 'autoIndentOnPasteWithinString', true, { description: nls.localize('autoIndentOnPasteWithinString', "Controls whether the editor should automatically auto-indent the pasted content when pasted within a string. This takes effect when autoIndentOnPaste is true.") })),
    automaticLayout: register(new EditorBooleanOption(19 /* EditorOption.automaticLayout */, 'automaticLayout', false)),
    autoSurround: register(new EditorStringEnumOption(20 /* EditorOption.autoSurround */, 'autoSurround', 'languageDefined', ['languageDefined', 'quotes', 'brackets', 'never'], {
        enumDescriptions: [
            nls.localize('editor.autoSurround.languageDefined', "Use language configurations to determine when to automatically surround selections."),
            nls.localize('editor.autoSurround.quotes', "Surround with quotes but not brackets."),
            nls.localize('editor.autoSurround.brackets', "Surround with brackets but not quotes."),
            ''
        ],
        description: nls.localize('autoSurround', "Controls whether the editor should automatically surround selections when typing quotes or brackets.")
    })),
    bracketPairColorization: register(new BracketPairColorization()),
    bracketPairGuides: register(new GuideOptions()),
    stickyTabStops: register(new EditorBooleanOption(131 /* EditorOption.stickyTabStops */, 'stickyTabStops', false, { description: nls.localize('stickyTabStops', "Emulate selection behavior of tab characters when using spaces for indentation. Selection will stick to tab stops.") })),
    codeLens: register(new EditorBooleanOption(23 /* EditorOption.codeLens */, 'codeLens', true, { description: nls.localize('codeLens', "Controls whether the editor shows CodeLens.") })),
    codeLensFontFamily: register(new EditorStringOption(24 /* EditorOption.codeLensFontFamily */, 'codeLensFontFamily', '', { description: nls.localize('codeLensFontFamily', "Controls the font family for CodeLens.") })),
    codeLensFontSize: register(new EditorIntOption(25 /* EditorOption.codeLensFontSize */, 'codeLensFontSize', 0, 0, 100, {
        type: 'number',
        default: 0,
        minimum: 0,
        maximum: 100,
        markdownDescription: nls.localize('codeLensFontSize', "Controls the font size in pixels for CodeLens. When set to 0, 90% of `#editor.fontSize#` is used.")
    })),
    colorDecorators: register(new EditorBooleanOption(26 /* EditorOption.colorDecorators */, 'colorDecorators', true, { description: nls.localize('colorDecorators', "Controls whether the editor should render the inline color decorators and color picker.") })),
    colorDecoratorActivatedOn: register(new EditorStringEnumOption(167 /* EditorOption.colorDecoratorsActivatedOn */, 'colorDecoratorsActivatedOn', 'clickAndHover', ['clickAndHover', 'hover', 'click'], {
        enumDescriptions: [
            nls.localize('editor.colorDecoratorActivatedOn.clickAndHover', "Make the color picker appear both on click and hover of the color decorator"),
            nls.localize('editor.colorDecoratorActivatedOn.hover', "Make the color picker appear on hover of the color decorator"),
            nls.localize('editor.colorDecoratorActivatedOn.click', "Make the color picker appear on click of the color decorator")
        ],
        description: nls.localize('colorDecoratorActivatedOn', "Controls the condition to make a color picker appear from a color decorator.")
    })),
    colorDecoratorsLimit: register(new EditorIntOption(27 /* EditorOption.colorDecoratorsLimit */, 'colorDecoratorsLimit', 500, 1, 1000000, {
        markdownDescription: nls.localize('colorDecoratorsLimit', "Controls the max number of color decorators that can be rendered in an editor at once.")
    })),
    columnSelection: register(new EditorBooleanOption(28 /* EditorOption.columnSelection */, 'columnSelection', false, { description: nls.localize('columnSelection', "Enable that the selection with the mouse and keys is doing column selection.") })),
    comments: register(new EditorComments()),
    contextmenu: register(new EditorBooleanOption(30 /* EditorOption.contextmenu */, 'contextmenu', true)),
    copyWithSyntaxHighlighting: register(new EditorBooleanOption(31 /* EditorOption.copyWithSyntaxHighlighting */, 'copyWithSyntaxHighlighting', true, { description: nls.localize('copyWithSyntaxHighlighting', "Controls whether syntax highlighting should be copied into the clipboard.") })),
    cursorBlinking: register(new EditorEnumOption(32 /* EditorOption.cursorBlinking */, 'cursorBlinking', 1 /* TextEditorCursorBlinkingStyle.Blink */, 'blink', ['blink', 'smooth', 'phase', 'expand', 'solid'], cursorBlinkingStyleFromString, { description: nls.localize('cursorBlinking', "Control the cursor animation style.") })),
    cursorSmoothCaretAnimation: register(new EditorStringEnumOption(33 /* EditorOption.cursorSmoothCaretAnimation */, 'cursorSmoothCaretAnimation', 'off', ['off', 'explicit', 'on'], {
        enumDescriptions: [
            nls.localize('cursorSmoothCaretAnimation.off', "Smooth caret animation is disabled."),
            nls.localize('cursorSmoothCaretAnimation.explicit', "Smooth caret animation is enabled only when the user moves the cursor with an explicit gesture."),
            nls.localize('cursorSmoothCaretAnimation.on', "Smooth caret animation is always enabled.")
        ],
        description: nls.localize('cursorSmoothCaretAnimation', "Controls whether the smooth caret animation should be enabled.")
    })),
    cursorStyle: register(new EditorEnumOption(34 /* EditorOption.cursorStyle */, 'cursorStyle', TextEditorCursorStyle.Line, 'line', ['line', 'block', 'underline', 'line-thin', 'block-outline', 'underline-thin'], cursorStyleFromString, { description: nls.localize('cursorStyle', "Controls the cursor style in insert input mode.") })),
    overtypeCursorStyle: register(new EditorEnumOption(91 /* EditorOption.overtypeCursorStyle */, 'overtypeCursorStyle', TextEditorCursorStyle.Block, 'block', ['line', 'block', 'underline', 'line-thin', 'block-outline', 'underline-thin'], cursorStyleFromString, { description: nls.localize('overtypeCursorStyle', "Controls the cursor style in overtype input mode.") })),
    cursorSurroundingLines: register(new EditorIntOption(35 /* EditorOption.cursorSurroundingLines */, 'cursorSurroundingLines', 0, 0, 1073741824 /* Constants.MAX_SAFE_SMALL_INTEGER */, { description: nls.localize('cursorSurroundingLines', "Controls the minimal number of visible leading lines (minimum 0) and trailing lines (minimum 1) surrounding the cursor. Known as 'scrollOff' or 'scrollOffset' in some other editors.") })),
    cursorSurroundingLinesStyle: register(new EditorStringEnumOption(36 /* EditorOption.cursorSurroundingLinesStyle */, 'cursorSurroundingLinesStyle', 'default', ['default', 'all'], {
        enumDescriptions: [
            nls.localize('cursorSurroundingLinesStyle.default', "`cursorSurroundingLines` is enforced only when triggered via the keyboard or API."),
            nls.localize('cursorSurroundingLinesStyle.all', "`cursorSurroundingLines` is enforced always.")
        ],
        markdownDescription: nls.localize('cursorSurroundingLinesStyle', "Controls when `#editor.cursorSurroundingLines#` should be enforced.")
    })),
    cursorWidth: register(new EditorIntOption(37 /* EditorOption.cursorWidth */, 'cursorWidth', 0, 0, 1073741824 /* Constants.MAX_SAFE_SMALL_INTEGER */, { markdownDescription: nls.localize('cursorWidth', "Controls the width of the cursor when `#editor.cursorStyle#` is set to `line`.") })),
    cursorHeight: register(new EditorIntOption(38 /* EditorOption.cursorHeight */, 'cursorHeight', 0, 0, 1073741824 /* Constants.MAX_SAFE_SMALL_INTEGER */, { markdownDescription: nls.localize('cursorHeight', "Controls the height of the cursor when `#editor.cursorStyle#` is set to `line`. Cursor's max height depends on line height.") })),
    disableLayerHinting: register(new EditorBooleanOption(39 /* EditorOption.disableLayerHinting */, 'disableLayerHinting', false)),
    disableMonospaceOptimizations: register(new EditorBooleanOption(40 /* EditorOption.disableMonospaceOptimizations */, 'disableMonospaceOptimizations', false)),
    domReadOnly: register(new EditorBooleanOption(41 /* EditorOption.domReadOnly */, 'domReadOnly', false)),
    dragAndDrop: register(new EditorBooleanOption(42 /* EditorOption.dragAndDrop */, 'dragAndDrop', true, { description: nls.localize('dragAndDrop', "Controls whether the editor should allow moving selections via drag and drop.") })),
    emptySelectionClipboard: register(new EditorEmptySelectionClipboard()),
    dropIntoEditor: register(new EditorDropIntoEditor()),
    editContext: register(new EditorBooleanOption(44 /* EditorOption.editContext */, 'editContext', true, {
        description: nls.localize('editContext', "Sets whether the EditContext API should be used instead of the text area to power input in the editor."),
        included: platform.isChrome || platform.isEdge || platform.isNative
    })),
    renderRichScreenReaderContent: register(new EditorBooleanOption(106 /* EditorOption.renderRichScreenReaderContent */, 'renderRichScreenReaderContent', false, {
        description: nls.localize('renderRichScreenReaderContent', "Whether to render rich screen reader content when the `editor.editContext` is enabled."),
    })),
    stickyScroll: register(new EditorStickyScroll()),
    experimentalGpuAcceleration: register(new EditorStringEnumOption(46 /* EditorOption.experimentalGpuAcceleration */, 'experimentalGpuAcceleration', 'off', ['off', 'on'], {
        tags: ['experimental'],
        enumDescriptions: [
            nls.localize('experimentalGpuAcceleration.off', "Use regular DOM-based rendering."),
            nls.localize('experimentalGpuAcceleration.on', "Use GPU acceleration."),
        ],
        description: nls.localize('experimentalGpuAcceleration', "Controls whether to use the experimental GPU acceleration to render the editor.")
    })),
    experimentalWhitespaceRendering: register(new EditorStringEnumOption(47 /* EditorOption.experimentalWhitespaceRendering */, 'experimentalWhitespaceRendering', 'svg', ['svg', 'font', 'off'], {
        enumDescriptions: [
            nls.localize('experimentalWhitespaceRendering.svg', "Use a new rendering method with svgs."),
            nls.localize('experimentalWhitespaceRendering.font', "Use a new rendering method with font characters."),
            nls.localize('experimentalWhitespaceRendering.off', "Use the stable rendering method."),
        ],
        description: nls.localize('experimentalWhitespaceRendering', "Controls whether whitespace is rendered with a new, experimental method.")
    })),
    extraEditorClassName: register(new EditorStringOption(48 /* EditorOption.extraEditorClassName */, 'extraEditorClassName', '')),
    fastScrollSensitivity: register(new EditorFloatOption(49 /* EditorOption.fastScrollSensitivity */, 'fastScrollSensitivity', 5, x => (x <= 0 ? 5 : x), { markdownDescription: nls.localize('fastScrollSensitivity', "Scrolling speed multiplier when pressing `Alt`.") })),
    find: register(new EditorFind()),
    fixedOverflowWidgets: register(new EditorBooleanOption(51 /* EditorOption.fixedOverflowWidgets */, 'fixedOverflowWidgets', false)),
    folding: register(new EditorBooleanOption(52 /* EditorOption.folding */, 'folding', true, { description: nls.localize('folding', "Controls whether the editor has code folding enabled.") })),
    foldingStrategy: register(new EditorStringEnumOption(53 /* EditorOption.foldingStrategy */, 'foldingStrategy', 'auto', ['auto', 'indentation'], {
        enumDescriptions: [
            nls.localize('foldingStrategy.auto', "Use a language-specific folding strategy if available, else the indentation-based one."),
            nls.localize('foldingStrategy.indentation', "Use the indentation-based folding strategy."),
        ],
        description: nls.localize('foldingStrategy', "Controls the strategy for computing folding ranges.")
    })),
    foldingHighlight: register(new EditorBooleanOption(54 /* EditorOption.foldingHighlight */, 'foldingHighlight', true, { description: nls.localize('foldingHighlight', "Controls whether the editor should highlight folded ranges.") })),
    foldingImportsByDefault: register(new EditorBooleanOption(55 /* EditorOption.foldingImportsByDefault */, 'foldingImportsByDefault', false, { description: nls.localize('foldingImportsByDefault', "Controls whether the editor automatically collapses import ranges.") })),
    foldingMaximumRegions: register(new EditorIntOption(56 /* EditorOption.foldingMaximumRegions */, 'foldingMaximumRegions', 5000, 10, 65000, // limit must be less than foldingRanges MAX_FOLDING_REGIONS
    { description: nls.localize('foldingMaximumRegions', "The maximum number of foldable regions. Increasing this value may result in the editor becoming less responsive when the current source has a large number of foldable regions.") })),
    unfoldOnClickAfterEndOfLine: register(new EditorBooleanOption(57 /* EditorOption.unfoldOnClickAfterEndOfLine */, 'unfoldOnClickAfterEndOfLine', false, { description: nls.localize('unfoldOnClickAfterEndOfLine', "Controls whether clicking on the empty content after a folded line will unfold the line.") })),
    fontFamily: register(new EditorStringOption(58 /* EditorOption.fontFamily */, 'fontFamily', EDITOR_FONT_DEFAULTS.fontFamily, { description: nls.localize('fontFamily', "Controls the font family.") })),
    fontInfo: register(new EditorFontInfo()),
    fontLigatures2: register(new EditorFontLigatures()),
    fontSize: register(new EditorFontSize()),
    fontWeight: register(new EditorFontWeight()),
    fontVariations: register(new EditorFontVariations()),
    formatOnPaste: register(new EditorBooleanOption(64 /* EditorOption.formatOnPaste */, 'formatOnPaste', false, { description: nls.localize('formatOnPaste', "Controls whether the editor should automatically format the pasted content. A formatter must be available and the formatter should be able to format a range in a document.") })),
    formatOnType: register(new EditorBooleanOption(65 /* EditorOption.formatOnType */, 'formatOnType', false, { description: nls.localize('formatOnType', "Controls whether the editor should automatically format the line after typing.") })),
    glyphMargin: register(new EditorBooleanOption(66 /* EditorOption.glyphMargin */, 'glyphMargin', true, { description: nls.localize('glyphMargin', "Controls whether the editor should render the vertical glyph margin. Glyph margin is mostly used for debugging.") })),
    gotoLocation: register(new EditorGoToLocation()),
    hideCursorInOverviewRuler: register(new EditorBooleanOption(68 /* EditorOption.hideCursorInOverviewRuler */, 'hideCursorInOverviewRuler', false, { description: nls.localize('hideCursorInOverviewRuler', "Controls whether the cursor should be hidden in the overview ruler.") })),
    hover: register(new EditorHover()),
    inDiffEditor: register(new EditorBooleanOption(70 /* EditorOption.inDiffEditor */, 'inDiffEditor', false)),
    inertialScroll: register(new EditorBooleanOption(157 /* EditorOption.inertialScroll */, 'inertialScroll', false, { description: nls.localize('inertialScroll', "Make scrolling inertial - mostly useful with touchpad on linux.") })),
    letterSpacing: register(new EditorFloatOption(72 /* EditorOption.letterSpacing */, 'letterSpacing', EDITOR_FONT_DEFAULTS.letterSpacing, x => EditorFloatOption.clamp(x, -5, 20), { description: nls.localize('letterSpacing', "Controls the letter spacing in pixels.") })),
    lightbulb: register(new EditorLightbulb()),
    lineDecorationsWidth: register(new EditorLineDecorationsWidth()),
    lineHeight: register(new EditorLineHeight()),
    lineNumbers: register(new EditorRenderLineNumbersOption()),
    lineNumbersMinChars: register(new EditorIntOption(77 /* EditorOption.lineNumbersMinChars */, 'lineNumbersMinChars', 5, 1, 300)),
    linkedEditing: register(new EditorBooleanOption(78 /* EditorOption.linkedEditing */, 'linkedEditing', false, { description: nls.localize('linkedEditing', "Controls whether the editor has linked editing enabled. Depending on the language, related symbols such as HTML tags, are updated while editing.") })),
    links: register(new EditorBooleanOption(79 /* EditorOption.links */, 'links', true, { description: nls.localize('links', "Controls whether the editor should detect links and make them clickable.") })),
    matchBrackets: register(new EditorStringEnumOption(80 /* EditorOption.matchBrackets */, 'matchBrackets', 'always', ['always', 'near', 'never'], { description: nls.localize('matchBrackets', "Highlight matching brackets.") })),
    minimap: register(new EditorMinimap()),
    mouseStyle: register(new EditorStringEnumOption(82 /* EditorOption.mouseStyle */, 'mouseStyle', 'text', ['text', 'default', 'copy'])),
    mouseWheelScrollSensitivity: register(new EditorFloatOption(83 /* EditorOption.mouseWheelScrollSensitivity */, 'mouseWheelScrollSensitivity', 1, x => (x === 0 ? 1 : x), { markdownDescription: nls.localize('mouseWheelScrollSensitivity', "A multiplier to be used on the `deltaX` and `deltaY` of mouse wheel scroll events.") })),
    mouseWheelZoom: register(new EditorBooleanOption(84 /* EditorOption.mouseWheelZoom */, 'mouseWheelZoom', false, {
        markdownDescription: platform.isMacintosh
            ? nls.localize('mouseWheelZoom.mac', "Zoom the font of the editor when using mouse wheel and holding `Cmd`.")
            : nls.localize('mouseWheelZoom', "Zoom the font of the editor when using mouse wheel and holding `Ctrl`.")
    })),
    multiCursorMergeOverlapping: register(new EditorBooleanOption(85 /* EditorOption.multiCursorMergeOverlapping */, 'multiCursorMergeOverlapping', true, { description: nls.localize('multiCursorMergeOverlapping', "Merge multiple cursors when they are overlapping.") })),
    multiCursorModifier: register(new EditorEnumOption(86 /* EditorOption.multiCursorModifier */, 'multiCursorModifier', 'altKey', 'alt', ['ctrlCmd', 'alt'], _multiCursorModifierFromString, {
        markdownEnumDescriptions: [
            nls.localize('multiCursorModifier.ctrlCmd', "Maps to `Control` on Windows and Linux and to `Command` on macOS."),
            nls.localize('multiCursorModifier.alt', "Maps to `Alt` on Windows and Linux and to `Option` on macOS.")
        ],
        markdownDescription: nls.localize({
            key: 'multiCursorModifier',
            comment: [
                '- `ctrlCmd` refers to a value the setting can take and should not be localized.',
                '- `Control` and `Command` refer to the modifier keys Ctrl or Cmd on the keyboard and can be localized.'
            ]
        }, "The modifier to be used to add multiple cursors with the mouse. The Go to Definition and Open Link mouse gestures will adapt such that they do not conflict with the [multicursor modifier](https://code.visualstudio.com/docs/editor/codebasics#_multicursor-modifier).")
    })),
    multiCursorPaste: register(new EditorStringEnumOption(87 /* EditorOption.multiCursorPaste */, 'multiCursorPaste', 'spread', ['spread', 'full'], {
        markdownEnumDescriptions: [
            nls.localize('multiCursorPaste.spread', "Each cursor pastes a single line of the text."),
            nls.localize('multiCursorPaste.full', "Each cursor pastes the full text.")
        ],
        markdownDescription: nls.localize('multiCursorPaste', "Controls pasting when the line count of the pasted text matches the cursor count.")
    })),
    multiCursorLimit: register(new EditorIntOption(88 /* EditorOption.multiCursorLimit */, 'multiCursorLimit', 10000, 1, 100000, {
        markdownDescription: nls.localize('multiCursorLimit', "Controls the max number of cursors that can be in an active editor at once.")
    })),
    occurrencesHighlight: register(new EditorStringEnumOption(89 /* EditorOption.occurrencesHighlight */, 'occurrencesHighlight', 'singleFile', ['off', 'singleFile', 'multiFile'], {
        markdownEnumDescriptions: [
            nls.localize('occurrencesHighlight.off', "Does not highlight occurrences."),
            nls.localize('occurrencesHighlight.singleFile', "Highlights occurrences only in the current file."),
            nls.localize('occurrencesHighlight.multiFile', "Experimental: Highlights occurrences across all valid open files.")
        ],
        markdownDescription: nls.localize('occurrencesHighlight', "Controls whether occurrences should be highlighted across open files.")
    })),
    occurrencesHighlightDelay: register(new EditorIntOption(90 /* EditorOption.occurrencesHighlightDelay */, 'occurrencesHighlightDelay', 0, 0, 2000, {
        description: nls.localize('occurrencesHighlightDelay', "Controls the delay in milliseconds after which occurrences are highlighted."),
        tags: ['preview']
    })),
    overtypeOnPaste: register(new EditorBooleanOption(92 /* EditorOption.overtypeOnPaste */, 'overtypeOnPaste', true, { description: nls.localize('overtypeOnPaste', "Controls whether pasting should overtype.") })),
    overviewRulerBorder: register(new EditorBooleanOption(93 /* EditorOption.overviewRulerBorder */, 'overviewRulerBorder', true, { description: nls.localize('overviewRulerBorder', "Controls whether a border should be drawn around the overview ruler.") })),
    overviewRulerLanes: register(new EditorIntOption(94 /* EditorOption.overviewRulerLanes */, 'overviewRulerLanes', 3, 0, 3)),
    padding: register(new EditorPadding()),
    pasteAs: register(new EditorPasteAs()),
    parameterHints: register(new EditorParameterHints()),
    peekWidgetDefaultFocus: register(new EditorStringEnumOption(98 /* EditorOption.peekWidgetDefaultFocus */, 'peekWidgetDefaultFocus', 'tree', ['tree', 'editor'], {
        enumDescriptions: [
            nls.localize('peekWidgetDefaultFocus.tree', "Focus the tree when opening peek"),
            nls.localize('peekWidgetDefaultFocus.editor', "Focus the editor when opening peek")
        ],
        description: nls.localize('peekWidgetDefaultFocus', "Controls whether to focus the inline editor or the tree in the peek widget.")
    })),
    placeholder: register(new PlaceholderOption()),
    definitionLinkOpensInPeek: register(new EditorBooleanOption(100 /* EditorOption.definitionLinkOpensInPeek */, 'definitionLinkOpensInPeek', false, { description: nls.localize('definitionLinkOpensInPeek', "Controls whether the Go to Definition mouse gesture always opens the peek widget.") })),
    quickSuggestions: register(new EditorQuickSuggestions()),
    quickSuggestionsDelay: register(new EditorIntOption(102 /* EditorOption.quickSuggestionsDelay */, 'quickSuggestionsDelay', 10, 0, 1073741824 /* Constants.MAX_SAFE_SMALL_INTEGER */, {
        description: nls.localize('quickSuggestionsDelay', "Controls the delay in milliseconds after which quick suggestions will show up."),
        experiment: {
            mode: 'startup'
        }
    })),
    readOnly: register(new EditorBooleanOption(103 /* EditorOption.readOnly */, 'readOnly', false)),
    readOnlyMessage: register(new ReadonlyMessage()),
    renameOnType: register(new EditorBooleanOption(105 /* EditorOption.renameOnType */, 'renameOnType', false, { description: nls.localize('renameOnType', "Controls whether the editor auto renames on type."), markdownDeprecationMessage: nls.localize('renameOnTypeDeprecate', "Deprecated, use `editor.linkedEditing` instead.") })),
    renderControlCharacters: register(new EditorBooleanOption(107 /* EditorOption.renderControlCharacters */, 'renderControlCharacters', true, { description: nls.localize('renderControlCharacters', "Controls whether the editor should render control characters."), restricted: true })),
    renderFinalNewline: register(new EditorStringEnumOption(108 /* EditorOption.renderFinalNewline */, 'renderFinalNewline', (platform.isLinux ? 'dimmed' : 'on'), ['off', 'on', 'dimmed'], { description: nls.localize('renderFinalNewline', "Render last line number when the file ends with a newline.") })),
    renderLineHighlight: register(new EditorStringEnumOption(109 /* EditorOption.renderLineHighlight */, 'renderLineHighlight', 'line', ['none', 'gutter', 'line', 'all'], {
        enumDescriptions: [
            '',
            '',
            '',
            nls.localize('renderLineHighlight.all', "Highlights both the gutter and the current line."),
        ],
        description: nls.localize('renderLineHighlight', "Controls how the editor should render the current line highlight.")
    })),
    renderLineHighlightOnlyWhenFocus: register(new EditorBooleanOption(110 /* EditorOption.renderLineHighlightOnlyWhenFocus */, 'renderLineHighlightOnlyWhenFocus', false, { description: nls.localize('renderLineHighlightOnlyWhenFocus', "Controls if the editor should render the current line highlight only when the editor is focused.") })),
    renderValidationDecorations: register(new EditorStringEnumOption(111 /* EditorOption.renderValidationDecorations */, 'renderValidationDecorations', 'editable', ['editable', 'on', 'off'])),
    renderWhitespace: register(new EditorStringEnumOption(112 /* EditorOption.renderWhitespace */, 'renderWhitespace', 'selection', ['none', 'boundary', 'selection', 'trailing', 'all'], {
        enumDescriptions: [
            '',
            nls.localize('renderWhitespace.boundary', "Render whitespace characters except for single spaces between words."),
            nls.localize('renderWhitespace.selection', "Render whitespace characters only on selected text."),
            nls.localize('renderWhitespace.trailing', "Render only trailing whitespace characters."),
            ''
        ],
        description: nls.localize('renderWhitespace', "Controls how the editor should render whitespace characters.")
    })),
    revealHorizontalRightPadding: register(new EditorIntOption(113 /* EditorOption.revealHorizontalRightPadding */, 'revealHorizontalRightPadding', 15, 0, 1000)),
    roundedSelection: register(new EditorBooleanOption(114 /* EditorOption.roundedSelection */, 'roundedSelection', true, { description: nls.localize('roundedSelection', "Controls whether selections should have rounded corners.") })),
    rulers: register(new EditorRulers()),
    scrollbar: register(new EditorScrollbar()),
    scrollBeyondLastColumn: register(new EditorIntOption(117 /* EditorOption.scrollBeyondLastColumn */, 'scrollBeyondLastColumn', 4, 0, 1073741824 /* Constants.MAX_SAFE_SMALL_INTEGER */, { description: nls.localize('scrollBeyondLastColumn', "Controls the number of extra characters beyond which the editor will scroll horizontally.") })),
    scrollBeyondLastLine: register(new EditorBooleanOption(118 /* EditorOption.scrollBeyondLastLine */, 'scrollBeyondLastLine', true, { description: nls.localize('scrollBeyondLastLine', "Controls whether the editor will scroll beyond the last line.") })),
    scrollOnMiddleClick: register(new EditorBooleanOption(170 /* EditorOption.scrollOnMiddleClick */, 'scrollOnMiddleClick', false, { description: nls.localize('scrollOnMiddleClick', "Controls whether the editor will scroll when the middle button is pressed.") })),
    scrollPredominantAxis: register(new EditorBooleanOption(119 /* EditorOption.scrollPredominantAxis */, 'scrollPredominantAxis', true, { description: nls.localize('scrollPredominantAxis', "Scroll only along the predominant axis when scrolling both vertically and horizontally at the same time. Prevents horizontal drift when scrolling vertically on a trackpad.") })),
    selectionClipboard: register(new EditorBooleanOption(120 /* EditorOption.selectionClipboard */, 'selectionClipboard', true, {
        description: nls.localize('selectionClipboard', "Controls whether the Linux primary clipboard should be supported."),
        included: platform.isLinux
    })),
    selectionHighlight: register(new EditorBooleanOption(121 /* EditorOption.selectionHighlight */, 'selectionHighlight', true, { description: nls.localize('selectionHighlight', "Controls whether the editor should highlight matches similar to the selection.") })),
    selectionHighlightMaxLength: register(new EditorIntOption(122 /* EditorOption.selectionHighlightMaxLength */, 'selectionHighlightMaxLength', 200, 0, 1073741824 /* Constants.MAX_SAFE_SMALL_INTEGER */, { description: nls.localize('selectionHighlightMaxLength', "Controls how many characters can be in the selection before similiar matches are not highlighted. Set to zero for unlimited.") })),
    selectionHighlightMultiline: register(new EditorBooleanOption(123 /* EditorOption.selectionHighlightMultiline */, 'selectionHighlightMultiline', false, { description: nls.localize('selectionHighlightMultiline', "Controls whether the editor should highlight selection matches that span multiple lines.") })),
    selectOnLineNumbers: register(new EditorBooleanOption(124 /* EditorOption.selectOnLineNumbers */, 'selectOnLineNumbers', true)),
    showFoldingControls: register(new EditorStringEnumOption(125 /* EditorOption.showFoldingControls */, 'showFoldingControls', 'mouseover', ['always', 'never', 'mouseover'], {
        enumDescriptions: [
            nls.localize('showFoldingControls.always', "Always show the folding controls."),
            nls.localize('showFoldingControls.never', "Never show the folding controls and reduce the gutter size."),
            nls.localize('showFoldingControls.mouseover', "Only show the folding controls when the mouse is over the gutter."),
        ],
        description: nls.localize('showFoldingControls', "Controls when the folding controls on the gutter are shown.")
    })),
    showUnused: register(new EditorBooleanOption(126 /* EditorOption.showUnused */, 'showUnused', true, { description: nls.localize('showUnused', "Controls fading out of unused code.") })),
    showDeprecated: register(new EditorBooleanOption(156 /* EditorOption.showDeprecated */, 'showDeprecated', true, { description: nls.localize('showDeprecated', "Controls strikethrough deprecated variables.") })),
    inlayHints: register(new EditorInlayHints()),
    snippetSuggestions: register(new EditorStringEnumOption(127 /* EditorOption.snippetSuggestions */, 'snippetSuggestions', 'inline', ['top', 'bottom', 'inline', 'none'], {
        enumDescriptions: [
            nls.localize('snippetSuggestions.top', "Show snippet suggestions on top of other suggestions."),
            nls.localize('snippetSuggestions.bottom', "Show snippet suggestions below other suggestions."),
            nls.localize('snippetSuggestions.inline', "Show snippets suggestions with other suggestions."),
            nls.localize('snippetSuggestions.none', "Do not show snippet suggestions."),
        ],
        description: nls.localize('snippetSuggestions', "Controls whether snippets are shown with other suggestions and how they are sorted.")
    })),
    smartSelect: register(new SmartSelect()),
    smoothScrolling: register(new EditorBooleanOption(129 /* EditorOption.smoothScrolling */, 'smoothScrolling', false, { description: nls.localize('smoothScrolling', "Controls whether the editor will scroll using an animation.") })),
    stopRenderingLineAfter: register(new EditorIntOption(132 /* EditorOption.stopRenderingLineAfter */, 'stopRenderingLineAfter', 10000, -1, 1073741824 /* Constants.MAX_SAFE_SMALL_INTEGER */)),
    suggest: register(new EditorSuggest()),
    inlineSuggest: register(new InlineEditorSuggest()),
    inlineCompletionsAccessibilityVerbose: register(new EditorBooleanOption(168 /* EditorOption.inlineCompletionsAccessibilityVerbose */, 'inlineCompletionsAccessibilityVerbose', false, { description: nls.localize('inlineCompletionsAccessibilityVerbose', "Controls whether the accessibility hint should be provided to screen reader users when an inline completion is shown.") })),
    suggestFontSize: register(new EditorIntOption(134 /* EditorOption.suggestFontSize */, 'suggestFontSize', 0, 0, 1000, { markdownDescription: nls.localize('suggestFontSize', "Font size for the suggest widget. When set to {0}, the value of {1} is used.", '`0`', '`#editor.fontSize#`') })),
    suggestLineHeight: register(new EditorIntOption(135 /* EditorOption.suggestLineHeight */, 'suggestLineHeight', 0, 0, 1000, { markdownDescription: nls.localize('suggestLineHeight', "Line height for the suggest widget. When set to {0}, the value of {1} is used. The minimum value is 8.", '`0`', '`#editor.lineHeight#`') })),
    suggestOnTriggerCharacters: register(new EditorBooleanOption(136 /* EditorOption.suggestOnTriggerCharacters */, 'suggestOnTriggerCharacters', true, { description: nls.localize('suggestOnTriggerCharacters', "Controls whether suggestions should automatically show up when typing trigger characters.") })),
    suggestSelection: register(new EditorStringEnumOption(137 /* EditorOption.suggestSelection */, 'suggestSelection', 'first', ['first', 'recentlyUsed', 'recentlyUsedByPrefix'], {
        markdownEnumDescriptions: [
            nls.localize('suggestSelection.first', "Always select the first suggestion."),
            nls.localize('suggestSelection.recentlyUsed', "Select recent suggestions unless further typing selects one, e.g. `console.| -> console.log` because `log` has been completed recently."),
            nls.localize('suggestSelection.recentlyUsedByPrefix', "Select suggestions based on previous prefixes that have completed those suggestions, e.g. `co -> console` and `con -> const`."),
        ],
        description: nls.localize('suggestSelection', "Controls how suggestions are pre-selected when showing the suggest list.")
    })),
    tabCompletion: register(new EditorStringEnumOption(138 /* EditorOption.tabCompletion */, 'tabCompletion', 'off', ['on', 'off', 'onlySnippets'], {
        enumDescriptions: [
            nls.localize('tabCompletion.on', "Tab complete will insert the best matching suggestion when pressing tab."),
            nls.localize('tabCompletion.off', "Disable tab completions."),
            nls.localize('tabCompletion.onlySnippets', "Tab complete snippets when their prefix match. Works best when 'quickSuggestions' aren't enabled."),
        ],
        description: nls.localize('tabCompletion', "Enables tab completions.")
    })),
    tabIndex: register(new EditorIntOption(139 /* EditorOption.tabIndex */, 'tabIndex', 0, -1, 1073741824 /* Constants.MAX_SAFE_SMALL_INTEGER */)),
    trimWhitespaceOnDelete: register(new EditorBooleanOption(140 /* EditorOption.trimWhitespaceOnDelete */, 'trimWhitespaceOnDelete', false, { description: nls.localize('trimWhitespaceOnDelete', "Controls whether the editor will also delete the next line's indentation whitespace when deleting a newline.") })),
    unicodeHighlight: register(new UnicodeHighlight()),
    unusualLineTerminators: register(new EditorStringEnumOption(142 /* EditorOption.unusualLineTerminators */, 'unusualLineTerminators', 'prompt', ['auto', 'off', 'prompt'], {
        enumDescriptions: [
            nls.localize('unusualLineTerminators.auto', "Unusual line terminators are automatically removed."),
            nls.localize('unusualLineTerminators.off', "Unusual line terminators are ignored."),
            nls.localize('unusualLineTerminators.prompt', "Unusual line terminators prompt to be removed."),
        ],
        description: nls.localize('unusualLineTerminators', "Remove unusual line terminators that might cause problems.")
    })),
    useShadowDOM: register(new EditorBooleanOption(143 /* EditorOption.useShadowDOM */, 'useShadowDOM', true)),
    useTabStops: register(new EditorBooleanOption(144 /* EditorOption.useTabStops */, 'useTabStops', true, { description: nls.localize('useTabStops', "Spaces and tabs are inserted and deleted in alignment with tab stops.") })),
    wordBreak: register(new EditorStringEnumOption(145 /* EditorOption.wordBreak */, 'wordBreak', 'normal', ['normal', 'keepAll'], {
        markdownEnumDescriptions: [
            nls.localize('wordBreak.normal', "Use the default line break rule."),
            nls.localize('wordBreak.keepAll', "Word breaks should not be used for Chinese/Japanese/Korean (CJK) text. Non-CJK text behavior is the same as for normal."),
        ],
        description: nls.localize('wordBreak', "Controls the word break rules used for Chinese/Japanese/Korean (CJK) text.")
    })),
    wordSegmenterLocales: register(new WordSegmenterLocales()),
    wordSeparators: register(new EditorStringOption(147 /* EditorOption.wordSeparators */, 'wordSeparators', USUAL_WORD_SEPARATORS, { description: nls.localize('wordSeparators', "Characters that will be used as word separators when doing word related navigations or operations.") })),
    wordWrap: register(new EditorStringEnumOption(148 /* EditorOption.wordWrap */, 'wordWrap', 'off', ['off', 'on', 'wordWrapColumn', 'bounded'], {
        markdownEnumDescriptions: [
            nls.localize('wordWrap.off', "Lines will never wrap."),
            nls.localize('wordWrap.on', "Lines will wrap at the viewport width."),
            nls.localize({
                key: 'wordWrap.wordWrapColumn',
                comment: [
                    '- `editor.wordWrapColumn` refers to a different setting and should not be localized.'
                ]
            }, "Lines will wrap at `#editor.wordWrapColumn#`."),
            nls.localize({
                key: 'wordWrap.bounded',
                comment: [
                    '- viewport means the edge of the visible window size.',
                    '- `editor.wordWrapColumn` refers to a different setting and should not be localized.'
                ]
            }, "Lines will wrap at the minimum of viewport and `#editor.wordWrapColumn#`."),
        ],
        description: nls.localize({
            key: 'wordWrap',
            comment: [
                '- \'off\', \'on\', \'wordWrapColumn\' and \'bounded\' refer to values the setting can take and should not be localized.',
                '- `editor.wordWrapColumn` refers to a different setting and should not be localized.'
            ]
        }, "Controls how lines should wrap.")
    })),
    wordWrapBreakAfterCharacters: register(new EditorStringOption(149 /* EditorOption.wordWrapBreakAfterCharacters */, 'wordWrapBreakAfterCharacters', 
    // allow-any-unicode-next-line
    ' \t})]?|/&.,;¢°′″‰℃、。｡､￠，．：；？！％・･ゝゞヽヾーァィゥェォッャュョヮヵヶぁぃぅぇぉっゃゅょゎゕゖㇰㇱㇲㇳㇴㇵㇶㇷㇸㇹㇺㇻㇼㇽㇾㇿ々〻ｧｨｩｪｫｬｭｮｯｰ”〉》」』】〕）］｝｣')),
    wordWrapBreakBeforeCharacters: register(new EditorStringOption(150 /* EditorOption.wordWrapBreakBeforeCharacters */, 'wordWrapBreakBeforeCharacters', 
    // allow-any-unicode-next-line
    '([{‘“〈《「『【〔（［｛｢£¥＄￡￥+＋')),
    wordWrapColumn: register(new EditorIntOption(151 /* EditorOption.wordWrapColumn */, 'wordWrapColumn', 80, 1, 1073741824 /* Constants.MAX_SAFE_SMALL_INTEGER */, {
        markdownDescription: nls.localize({
            key: 'wordWrapColumn',
            comment: [
                '- `editor.wordWrap` refers to a different setting and should not be localized.',
                '- \'wordWrapColumn\' and \'bounded\' refer to values the different setting can take and should not be localized.'
            ]
        }, "Controls the wrapping column of the editor when `#editor.wordWrap#` is `wordWrapColumn` or `bounded`.")
    })),
    wordWrapOverride1: register(new EditorStringEnumOption(152 /* EditorOption.wordWrapOverride1 */, 'wordWrapOverride1', 'inherit', ['off', 'on', 'inherit'])),
    wordWrapOverride2: register(new EditorStringEnumOption(153 /* EditorOption.wordWrapOverride2 */, 'wordWrapOverride2', 'inherit', ['off', 'on', 'inherit'])),
    wrapOnEscapedLineFeeds: register(new EditorBooleanOption(159 /* EditorOption.wrapOnEscapedLineFeeds */, 'wrapOnEscapedLineFeeds', false, { markdownDescription: nls.localize('wrapOnEscapedLineFeeds', "Controls whether literal `\\n` shall trigger a wordWrap.\nfor example\n```c\nchar* str=\"hello\\nworld\"\n```\nwill be displayed as\n```c\nchar* str=\"hello\\n\n           world\"\n```") })),
    // Leave these at the end (because they have dependencies!)
    effectiveCursorStyle: register(new EffectiveCursorStyle()),
    editorClassName: register(new EditorClassName()),
    defaultColorDecorators: register(new EditorStringEnumOption(166 /* EditorOption.defaultColorDecorators */, 'defaultColorDecorators', 'auto', ['auto', 'always', 'never'], {
        enumDescriptions: [
            nls.localize('editor.defaultColorDecorators.auto', "Show default color decorators only when no extension provides colors decorators."),
            nls.localize('editor.defaultColorDecorators.always', "Always show default color decorators."),
            nls.localize('editor.defaultColorDecorators.never', "Never show default color decorators."),
        ],
        description: nls.localize('defaultColorDecorators', "Controls whether inline color decorations should be shown using the default document color provider.")
    })),
    pixelRatio: register(new EditorPixelRatio()),
    tabFocusMode: register(new EditorBooleanOption(163 /* EditorOption.tabFocusMode */, 'tabFocusMode', false, { markdownDescription: nls.localize('tabFocusMode', "Controls whether the editor receives tabs or defers them to the workbench for navigation.") })),
    layoutInfo: register(new EditorLayoutInfoComputer()),
    wrappingInfo: register(new EditorWrappingInfoComputer()),
    wrappingIndent: register(new WrappingIndentOption()),
    wrappingStrategy: register(new WrappingStrategy()),
    effectiveEditContextEnabled: register(new EffectiveEditContextEnabled()),
    effectiveAllowVariableFonts: register(new EffectiveAllowVariableFonts())
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yT3B0aW9ucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL2FkdmlrYXIvRG9jdW1lbnRzL2FyY2hpdGVjdC9hcmNoMi9BcmNoSURFL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb21tb24vY29uZmlnL2VkaXRvck9wdGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLE1BQU0sTUFBTSxnQ0FBZ0MsQ0FBQztBQUd6RCxPQUFPLEtBQUssT0FBTyxNQUFNLGlDQUFpQyxDQUFDO0FBQzNELE9BQU8sS0FBSyxRQUFRLE1BQU0sa0NBQWtDLENBQUM7QUFJN0QsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDMUUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFDOUQsT0FBTyxLQUFLLEdBQUcsTUFBTSxpQkFBaUIsQ0FBQztBQXFCdkM7O0dBRUc7QUFDSCxNQUFNLENBQU4sSUFBa0Isd0JBTWpCO0FBTkQsV0FBa0Isd0JBQXdCO0lBQ3pDLHVFQUFRLENBQUE7SUFDUix1RUFBUSxDQUFBO0lBQ1IsK0VBQVksQ0FBQTtJQUNaLCtFQUFZLENBQUE7SUFDWix1RUFBUSxDQUFBO0FBQ1QsQ0FBQyxFQU5pQix3QkFBd0IsS0FBeEIsd0JBQXdCLFFBTXpDO0FBbXlCRDs7O0dBR0c7QUFDSCxNQUFNLENBQUMsTUFBTSxvQkFBb0IsR0FBRyxDQUFDLENBQUM7QUF3SnRDLFlBQVk7QUFFWjs7R0FFRztBQUNILE1BQU0sT0FBTyx5QkFBeUI7SUFFckM7O09BRUc7SUFDSCxZQUFZLE1BQWlCO1FBQzVCLElBQUksQ0FBQyxPQUFPLEdBQUcsTUFBTSxDQUFDO0lBQ3ZCLENBQUM7SUFDTSxVQUFVLENBQUMsRUFBZ0I7UUFDakMsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBQ3pCLENBQUM7Q0FDRDtBQWdDRDs7R0FF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QUFZLENBQUMsYUFBYSxDQUFDO1lBQzVFLFdBQVcsRUFBRSxPQUFPLENBQUMsS0FBSyxDQUFDLFdBQVcsRUFBRSxJQUFJLENBQUMsWUFBWSxDQUFDLFdBQVcsQ0FBQztZQUN0RSxXQUFXLEVBQUUsT0FBTyxDQUFDLEtBQUssQ0FBQyxXQUFXLEVBQUUsSUFBSSxDQUFDLFlBQVksQ0FBQyxXQUFXLENBQUM7WUFDdEUsY0FBYyxFQUFFLE9BQU8sQ0FBQyxLQUFLLENBQUMsY0FBYyxFQUFFLElBQUksQ0FBQyxZQUFZLENBQUMsY0FBYyxDQUFDO1lBQy9FLFdBQVcsRUFBRSxPQUFPLENBQUMsS0FBSyxDQUFDLFdBQVcsRUFBRSxJQUFJLENBQUMsWUFBWSxDQUFDLFdBQVcsQ0FBQztZQUN0RSxjQUFjLEVBQUUsT0FBTyxDQUFDLEtBQUssQ0FBQyxjQUFjLEVBQUUsSUFBSSxDQUFDLFlBQVksQ0FBQyxjQUFjLENBQUM7WUFDL0UsVUFBVSxFQUFFLE9BQU8sQ0FBQyxLQUFLLENBQUMsVUFBVSxFQUFFLElBQUksQ0FBQyxZQUFZLENBQUMsVUFBVSxDQUFDO1lBQ25FLGFBQWEsRUFBRSxPQUFPLENBQUMsS0FBSyxDQUFDLGFBQWEsRUFBRSxJQUFJLENBQUMsWUFBWSxDQUFDLGFBQWEsQ0FBQztZQUM1RSxTQUFTLEVBQUUsT0FBTyxDQUFDLEtBQUssQ0FBQyxTQUFTLEVBQUUsSUFBSSxDQUFDLFlBQVksQ0FBQyxTQUFTLENBQUM7WUFDaEUsVUFBVSxFQUFFLE9BQU8sQ0FBQyxLQUFLLENBQUMsVUFBVSxFQUFFLElBQUksQ0FBQyxZQUFZLENBQUMsVUFBVSxDQUFDO1lBQ25FLGFBQWEsRUFBRSxPQUFPLENBQUMsS0FBSyxDQUFDLGFBQWEsRUFBRSxJQUFJLENBQUMsWUFBWSxDQUFDLGFBQWEsQ0FBQztZQUM1RSxTQUFTLEVBQUUsT0FBTyxDQUFDLEtBQUssQ0FBQyxTQUFTLEVBQUUsSUFBSSxDQUFDLFlBQVksQ0FBQyxTQUFTLENBQUM7WUFDaEUsZUFBZSxFQUFFLE9BQU8sQ0FBQyxLQUFLLENBQUMsZUFBZSxFQUFF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