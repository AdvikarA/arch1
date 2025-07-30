/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { DisposableStore, toDisposable } from '../common/lifecycle.js';
import { Schemas } from '../common/network.js';
import dompurify from './dompurify/dompurify.js';
/**
 * List of safe, non-input html tags.
 */
export const basicMarkupHtmlTags = Object.freeze([
    'a',
    'abbr',
    'b',
    'bdo',
    'blockquote',
    'br',
    'caption',
    'cite',
    'code',
    'col',
    'colgroup',
    'dd',
    'del',
    'details',
    'dfn',
    'div',
    'dl',
    'dt',
    'em',
    'figcaption',
    'figure',
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'hr',
    'i',
    'img',
    'ins',
    'kbd',
    'label',
    'li',
    'mark',
    'ol',
    'p',
    'pre',
    'q',
    'rp',
    'rt',
    'ruby',
    'samp',
    'small',
    'small',
    'source',
    'span',
    'strike',
    'strong',
    'sub',
    'summary',
    'sup',
    'table',
    'tbody',
    'td',
    'tfoot',
    'th',
    'thead',
    'time',
    'tr',
    'tt',
    'u',
    'ul',
    'var',
    'video',
    'wbr',
]);
export const defaultAllowedAttrs = Object.freeze([
    'href',
    'target',
    'src',
    'alt',
    'title',
    'for',
    'name',
    'role',
    'tabindex',
    'x-dispatch',
    'required',
    'checked',
    'placeholder',
    'type',
    'start',
    'width',
    'height',
    'align',
]);
function addDompurifyHook(hook, cb) {
    dompurify.addHook(hook, cb);
    return toDisposable(() => dompurify.removeHook(hook));
}
/**
 * Hooks dompurify using `afterSanitizeAttributes` to check that all `href` and `src`
 * attributes are valid.
 */
function hookDomPurifyHrefAndSrcSanitizer(allowedLinkProtocols, allowedMediaProtocols) {
    // https://github.com/cure53/DOMPurify/blob/main/demos/hooks-scheme-allowlist.html
    // build an anchor to map URLs to
    const anchor = document.createElement('a');
    function validateLink(value, allowedProtocols) {
        if (allowedProtocols === '*') {
            return true; // allow all protocols
        }
        anchor.href = value;
        return allowedProtocols.includes(anchor.protocol.replace(/:$/, ''));
    }
    dompurify.addHook('afterSanitizeAttributes', (node) => {
        // check all href/src attributes for validity
        for (const attr of ['href', 'src']) {
            if (node.hasAttribute(attr)) {
                const attrValue = node.getAttribute(attr);
                if (attr === 'href') {
                    if (!attrValue.startsWith('#') && !validateLink(attrValue, allowedLinkProtocols)) {
                        node.removeAttribute(attr);
                    }
                }
                else { // 'src'
                    if (!validateLink(attrValue, allowedMediaProtocols)) {
                        node.removeAttribute(attr);
                    }
                }
            }
        }
    });
    return toDisposable(() => dompurify.removeHook('afterSanitizeAttributes'));
}
const defaultDomPurifyConfig = Object.freeze({
    ALLOWED_TAGS: [...basicMarkupHtmlTags],
    ALLOWED_ATTR: [...defaultAllowedAttrs],
    RETURN_DOM: false,
    RETURN_DOM_FRAGMENT: false,
    RETURN_TRUSTED_TYPE: true,
    // We sanitize the src/href attributes later if needed
    ALLOW_UNKNOWN_PROTOCOLS: true,
});
/**
 * Sanitizes an html string.
 *
 * @param untrusted The HTML string to sanitize.
 * @param config Optional configuration for sanitization. If not provided, defaults to a safe configuration.
 *
 * @returns A sanitized string of html.
 */
export function sanitizeHtml(untrusted, config) {
    const store = new DisposableStore();
    try {
        const resolvedConfig = { ...defaultDomPurifyConfig };
        if (config?.allowedTags) {
            if (config.allowedTags.override) {
                resolvedConfig.ALLOWED_TAGS = [...config.allowedTags.override];
            }
            if (config.allowedTags.augment) {
                resolvedConfig.ALLOWED_TAGS = [...(resolvedConfig.ALLOWED_TAGS ?? []), ...config.allowedTags.augment];
            }
        }
        if (config?.allowedAttributes) {
            if (config.allowedAttributes.override) {
                resolvedConfig.ALLOWED_ATTR = [...config.allowedAttributes.override];
            }
            if (config.allowedAttributes.augment) {
                resolvedConfig.ALLOWED_ATTR = [...(resolvedConfig.ALLOWED_ATTR ?? []), ...config.allowedAttributes.augment];
            }
        }
        store.add(hookDomPurifyHrefAndSrcSanitizer(config?.allowedLinkProtocols?.override ?? [Schemas.http, Schemas.https], config?.allowedMediaProtocols?.override ?? [Schemas.http, Schemas.https]));
        if (config?._do_not_use_hooks?.uponSanitizeElement) {
            store.add(addDompurifyHook('uponSanitizeElement', config?._do_not_use_hooks.uponSanitizeElement));
        }
        if (config?._do_not_use_hooks?.uponSanitizeAttribute) {
            store.add(addDompurifyHook('uponSanitizeAttribute', config._do_not_use_hooks.uponSanitizeAttribute));
        }
        return dompurify.sanitize(untrusted, {
            ...resolvedConfig,
            RETURN_TRUSTED_TYPE: true
        });
    }
    finally {
        store.dispose();
    }
}
/**
 * Sanitizes the given `value` and reset the given `node` with it.
 */
export function safeSetInnerHtml(node, untrusted, config) {
    node.innerHTML = sanitizeHtml(untrusted, config);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZG9tU2FuaXRpemUuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9hZHZpa2FyL0RvY3VtZW50cy9hcmNoaXRlY3QvYXJjaDIvQXJjaElERS9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL2Jyb3dzZXIvZG9tU2FuaXRpemUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLGVBQWUsRUFBZSxZQUFZLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQztBQUNwRixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sc0JBQXNCLENBQUM7QUFDL0MsT0FBTyxTQUFTLE1BQU0sMEJBQTBCLENBQUM7QUFHakQ7O0dBRUc7QUFDSCxNQUFNLENBQUMsTUFBTSxtQkFBbUIsR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDO0lBQ2hELEdBQUc7SUFDSCxNQUFNO0lBQ04sR0FBRztJQUNILEtBQUs7SUFDTCxZQUFZO0lBQ1osSUFBSTtJQUNKLFNBQVM7SUFDVCxNQUFNO0lBQ04sTUFBTTtJQUNOLEtBQUs7SUFDTCxVQUFVO0lBQ1YsSUFBSTtJQUNKLEtBQUs7SUFDTCxTQUFTO0lBQ1QsS0FBSztJQUNMLEtBQUs7SUFDTCxJQUFJO0lBQ0osSUFBSTtJQUNKLElBQUk7SUFDSixZQUFZO0lBQ1osUUFBUTtJQUNSLElBQUk7SUFDSixJQUFJO0lBQ0osSUFBSTtJQUNKLElBQUk7SUFDSixJQUFJO0lBQ0osSUFBSTtJQUNKLElBQUk7SUFDSixHQUFHO0lBQ0gsS0FBSztJQUNMLEtBQUs7SUFDTCxLQUFLO0lBQ0wsT0FBTztJQUNQLElBQUk7SUFDSixNQUFNO0lBQ04sSUFBSTtJQUNKLEdBQUc7SUFDSCxLQUFLO0lBQ0wsR0FBRztJQUNILElBQUk7SUFDSixJQUFJO0lBQ0osTUFBTTtJQUNOLE1BQU07SUFDTixPQUFPO0lBQ1AsT0FBTztJQUNQLFFBQVE7SUFDUixNQUFNO0lBQ04sUUFBUTtJQUNSLFFBQVE7SUFDUixLQUFLO0lBQ0wsU0FBUztJ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