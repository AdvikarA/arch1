/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { importAMDNodeModule, resolveAmdNodeModulePath } from '../../../../amdX.js';
import { Lazy } from '../../../../base/common/lazy.js';
export class MarkedKatexSupport {
    static getSanitizerOptions(baseConfig) {
        return {
            allowedTags: {
                override: [
                    ...baseConfig.allowedTags,
                    ...trustedMathMlTags,
                ]
            },
            customAttrSanitizer: (attrName, attrValue) => {
                if (attrName === 'class') {
                    return true; // TODO: allows all classes for now since we don't have a list of possible katex classes
                }
                else if (attrName === 'style') {
                    return this.sanitizeKatexStyles(attrValue);
                }
                return baseConfig.allowedAttributes.includes(attrName);
            },
        };
    }
    static { this.tempSanitizerRule = new Lazy(() => {
        // Create a CSSStyleDeclaration object via a style sheet rule
        const styleSheet = new CSSStyleSheet();
        styleSheet.insertRule(`.temp{}`);
        const rule = styleSheet.cssRules[0];
        if (!(rule instanceof CSSStyleRule)) {
            throw new Error('Invalid CSS rule');
        }
        return rule.style;
    }); }
    static sanitizeStyles(styleString, allowedProperties) {
        const style = this.tempSanitizerRule.value;
        style.cssText = styleString;
        const sanitizedProps = [];
        for (let i = 0; i < style.length; i++) {
            const prop = style[i];
            if (allowedProperties.includes(prop)) {
                const value = style.getPropertyValue(prop);
                // Allow through lists of numbers with units or bare words like 'block'
                // Main goal is to block things like 'url()'.
                if (/^(([\d\.\-]+\w*\s?)+|\w+)$/.test(value)) {
                    sanitizedProps.push(`${prop}: ${value}`);
                }
            }
        }
        return sanitizedProps.join('; ');
    }
    static sanitizeKatexStyles(styleString) {
        const allowedProperties = [
            'display',
            'position',
            'font-family',
            'font-style',
            'font-weight',
            'font-size',
            'height',
            'width',
            'margin',
            'padding',
            'top',
            'left',
            'right',
            'bottom',
            'vertical-align',
            'transform',
            'border',
            'color',
            'white-space',
            'text-align',
            'line-height',
            'float',
            'clear',
        ];
        return this.sanitizeStyles(styleString, allowedProperties);
    }
    static { this._katexPromise = new Lazy(async () => {
        this._katex = await importAMDNodeModule('katex', 'dist/katex.min.js');
        return this._katex;
    }); }
    static getExtension(window, options = {}) {
        if (!this._katex) {
            return undefined;
        }
        this.ensureKatexStyles(window);
        return MarkedKatexExtension.extension(this._katex, options);
    }
    static async loadExtension(window, options = {}) {
        const katex = await this._katexPromise.value;
        this.ensureKatexStyles(window);
        return MarkedKatexExtension.extension(katex, options);
    }
    static ensureKatexStyles(window) {
        const doc = window.document;
        if (!doc.querySelector('link.katex')) {
            const katexStyle = document.createElement('link');
            katexStyle.classList.add('katex');
            katexStyle.rel = 'stylesheet';
            katexStyle.href = resolveAmdNodeModulePath('katex', 'dist/katex.min.css');
            doc.head.appendChild(katexStyle);
        }
    }
}
export var MarkedKatexExtension;
(function (MarkedKatexExtension) {
    const inlineRule = /^(\${1,2})(?!\$)((?:\\.|[^\\\n])*?(?:\\.|[^\\\n\$]))\1(?=[\s?!\.,:'\uff1f\uff01\u3002\uff0c\uff1a']|$)/;
    const inlineRuleNonStandard = /^(\${1,2})(?!\$)((?:\\.|[^\\\n])*?(?:\\.|[^\\\n\$]))\1/; // Non-standard, even if there are no spaces before and after $ or $$, try to parse
    const blockRule = /^(\${1,2})\n((?:\\[^]|[^\\])+?)\n\1(?:\n|$)/;
    function extension(katex, options = {}) {
        return {
            extensions: [
                inlineKatex(options, createRenderer(katex, options, false)),
                blockKatex(options, createRenderer(katex, options, true)),
            ],
        };
    }
    MarkedKatexExtension.extension = extension;
    function createRenderer(katex, options, newlineAfter) {
        return (token) => {
            return katex.renderToString(token.text, {
                ...options,
                displayMode: token.displayMode,
            }) + (newlineAfter ? '\n' : '');
        };
    }
    function inlineKatex(options, renderer) {
        const nonStandard = true;
        const ruleReg = nonStandard ? inlineRuleNonStandard : inlineRule;
        return {
            name: 'inlineKatex',
            level: 'inline',
            start(src) {
                let index;
                let indexSrc = src;
                while (indexSrc) {
                    index = indexSrc.indexOf('$');
                    if (index === -1) {
                        return;
                    }
                    const f = nonStandard ? index > -1 : index === 0 || indexSrc.charAt(index - 1) === ' ';
                    if (f) {
                        const possibleKatex = indexSrc.substring(index);
                        if (possibleKatex.match(ruleReg)) {
                            return index;
                        }
                    }
                    indexSrc = indexSrc.substring(index + 1).replace(/^\$+/, '');
                }
                return;
            },
            tokenizer(src, tokens) {
                const match = src.match(ruleReg);
                if (match) {
                    return {
                        type: 'inlineKatex',
                        raw: match[0],
                        text: match[2].trim(),
                        displayMode: match[1].length === 2,
                    };
                }
                return;
            },
            renderer,
        };
    }
    function blockKatex(options, renderer) {
        return {
            name: 'blockKatex',
            level: 'block',
            tokenizer(src, tokens) {
                const match = src.match(blockRule);
                if (match) {
                    return {
                        type: 'blockKatex',
                        raw: match[0],
                        text: match[2].trim(),
                        displayMode: match[1].length === 2,
                    };
                }
                return;
            },
            renderer,
        };
    }
})(MarkedKatexExtension || (MarkedKatexExtension = {}));
const trustedMathMlTags = Object.freeze([
    'semantics',
    'annotation',
    'math',
    'menclose',
    'merror',
    'mfenced',
    'mfrac',
    'mglyph',
    'mi',
    'mlabeledtr',
    'mmultiscripts',
    'mn',
    'mo',
    'mover',
    'mpadded',
    'mphantom',
    'mroot',
    'mrow',
    'ms',
    'mspace',
    'msqrt',
    'mstyle',
    'msub',
    'msup',
    'msubsup',
    'mtable',
    'mtd',
    'mtext',
    'mtr',
    'munder',
    'munderover',
    'mprescripts',
    // svg tags
    'svg',
    'altglyph',
    'altglyphdef',
    'altglyphitem',
    'circle',
    'clippath',
    'defs',
    'desc',
    'ellipse',
    'filter',
    'font',
    'g',
    'glyph',
    'glyphref',
    'hkern',
    'line',
    'lineargradient',
    'marker',
    'mask',
    'metadata',
    'mpath',
    'path',
    'pattern',
    'polygon',
    'polyline',
    'radialgradient',
    'rect',
    'stop',
    'style',
    'switch',
    'symbol',
    'text',
    'textpath',
    'title',
    'tref',
    'tspan',
    'view',
    'vkern',
]);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFya2VkS2F0ZXhTdXBwb3J0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvYWR2aWthci9Eb2N1bWVudHMvYXJjaGl0ZWN0L2FyY2gyL0FyY2hJREUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbWFya2Rvd24vYnJvd3Nlci9tYXJrZWRLYXRleFN1cHBvcnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLG1CQUFtQixFQUFFLHdCQUF3QixFQUFFLE1BQU0scUJBQXFCLENBQUM7QUFHcEYsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBR3ZELE1BQU0sT0FBTyxrQkFBa0I7SUFFdkIsTUFBTSxDQUFDLG1CQUFtQixDQUFDLFVBR2pDO1FBQ0EsT0FBTztZQUNOLFdBQVcsRUFBRTtnQkFDWixRQUFRLEVBQUU7b0JBQ1QsR0FBRyxVQUFVLENBQUMsV0FBVztvQkFDekIsR0FBRyxpQkFBaUI7aUJBQ3BCO2FBQ0Q7WUFDRCxtQkFBbUIsRUFBRSxDQUFDLFFBQVEsRUFBRSxTQUFTLEVBQUUsRUFBRTtnQkFDNUMsSUFBSSxRQUFRLEtBQUssT0FBTyxFQUFFLENBQUM7b0JBQzFCLE9BQU8sSUFBSSxDQUFDLENBQUMsd0ZBQXdGO2dCQUN0RyxDQUFDO3FCQUFNLElBQUksUUFBUSxLQUFLLE9BQU8sRUFBRSxDQUFDO29CQUNqQyxPQUFPLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxTQUFTLENBQUMsQ0FBQztnQkFDNUMsQ0FBQztnQkFFRCxPQUFPLFVBQVUsQ0FBQyxpQkFBaUIsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLENBQUM7WUFDeEQsQ0FBQztTQUNELENBQUM7SUFDSCxDQUFDO2FBRWMsc0JBQWlCLEdBQUcsSUFBSSxJQUFJLENBQUMsR0FBRyxFQUFFO1FBQ2hELDZEQUE2RDtRQUM3RCxNQUFNLFVBQVUsR0FBRyxJQUFJLGFBQWEsRUFBRSxDQUFDO1FB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