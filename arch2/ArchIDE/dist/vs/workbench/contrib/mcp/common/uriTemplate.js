/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
/**
 * Represents an RFC 6570 URI Template.
 */
export class UriTemplate {
    constructor(template, components) {
        this.template = template;
        this.template = template;
        this.components = components;
    }
    /**
     * Parses a URI template string into a UriTemplate instance.
     */
    static parse(template) {
        const components = [];
        const regex = /\{([^{}]+)\}/g;
        let match;
        let lastPos = 0;
        while ((match = regex.exec(template))) {
            const [expression, inner] = match;
            components.push(template.slice(lastPos, match.index));
            lastPos = match.index + expression.length;
            // Handle escaped braces: treat '{{' and '}}' as literals, not expressions
            if (template[match.index - 1] === '{' || template[lastPos] === '}') {
                components.push(inner);
                continue;
            }
            let operator = '';
            let rest = inner;
            if (rest.length > 0 && UriTemplate._isOperator(rest[0])) {
                operator = rest[0];
                rest = rest.slice(1);
            }
            const variables = rest.split(',').map((v) => {
                let name = v;
                let explodable = false;
                let repeatable = false;
                let prefixLength = undefined;
                let optional = false;
                if (name.endsWith('*')) {
                    explodable = true;
                    repeatable = true;
                    name = name.slice(0, -1);
                }
                const prefixMatch = name.match(/^(.*?):(\d+)$/);
                if (prefixMatch) {
                    name = prefixMatch[1];
                    prefixLength = parseInt(prefixMatch[2], 10);
                }
                if (name.endsWith('?')) {
                    optional = true;
                    name = name.slice(0, -1);
                }
                return { explodable, name, optional, prefixLength, repeatable };
            });
            components.push({ expression, operator, variables });
        }
        components.push(template.slice(lastPos));
        return new UriTemplate(template, components);
    }
    static { this._operators = ['+', '#', '.', '/', ';', '?', '&']; }
    static _isOperator(ch) {
        return UriTemplate._operators.includes(ch);
    }
    /**
     * Resolves the template with the given variables.
     */
    resolve(variables) {
        let result = '';
        for (const comp of this.components) {
            if (typeof comp === 'string') {
                result += comp;
            }
            else {
                result += this._expand(comp, variables);
            }
        }
        return result;
    }
    _expand(comp, variables) {
        const op = comp.operator;
        const varSpecs = comp.variables;
        if (varSpecs.length === 0) {
            return comp.expression;
        }
        const vals = [];
        const isNamed = op === ';' || op === '?' || op === '&';
        const isReserved = op === '+' || op === '#';
        const isFragment = op === '#';
        const isLabel = op === '.';
        const isPath = op === '/';
        const isForm = op === '?';
        const isFormCont = op === '&';
        const isParam = op === ';';
        let prefix = '';
        if (op === '+') {
            prefix = '';
        }
        else if (op === '#') {
            prefix = '#';
        }
        else if (op === '.') {
            prefix = '.';
        }
        else if (op === '/') {
            prefix = '';
        }
        else if (op === ';') {
            prefix = ';';
        }
        else if (op === '?') {
            prefix = '?';
        }
        else if (op === '&') {
            prefix = '&';
        }
        for (const v of varSpecs) {
            const value = variables[v.name];
            const defined = Object.prototype.hasOwnProperty.call(variables, v.name);
            if (value === undefined || value === null || (Array.isArray(value) && value.length === 0)) {
                if (isParam) {
                    if (defined && (value === null || value === undefined)) {
                        vals.push(v.name);
                    }
                    continue;
                }
                if (isForm || isFormCont) {
                    if (defined) {
                        vals.push(UriTemplate._formPair(v.name, '', isNamed));
                    }
                    continue;
                }
                continue;
            }
            if (typeof value === 'object' && !Array.isArray(value)) {
                if (v.explodable) {
                    const pairs = [];
                    for (const k in value) {
                        if (Object.prototype.hasOwnProperty.call(value, k)) {
                            const thisVal = String(value[k]);
                            if (isParam) {
                                pairs.push(k + '=' + thisVal);
                            }
                            else if (isForm || isFormCont) {
                                pairs.push(k + '=' + thisVal);
                            }
                            else if (isLabel) {
                                pairs.push(k + '=' + thisVal);
                            }
                            else if (isPath) {
                                pairs.push('/' + k + '=' + UriTemplate._encode(thisVal, isReserved));
                            }
                            else {
                                pairs.push(k + '=' + UriTemplate._encode(thisVal, isReserved));
                            }
                        }
                    }
                    if (isLabel) {
                        vals.push(pairs.join('.'));
                    }
                    else if (isPath) {
                        vals.push(pairs.join(''));
                    }
                    else if (isParam) {
                        vals.push(pairs.join(';'));
                    }
                    else if (isForm || isFormCont) {
                        vals.push(pairs.join('&'));
                    }
                    else {
                        vals.push(pairs.join(','));
                    }
                }
                else {
                    // Not explodable: join as k1,v1,k2,v2,... and assign to variable name
                    const pairs = [];
                    for (const k in value) {
                        if (Object.prototype.hasOwnProperty.call(value, k)) {
                            pairs.push(k);
                            pairs.push(String(value[k]));
                        }
                    }
                    // For label, param, form, join as keys=semi,;,dot,.,comma,, (no encoding of , or ;)
                    const joined = pairs.join(',');
                    if (isLabel) {
                        vals.push(joined);
                    }
                    else if (isParam || isForm || isFormCont) {
                        vals.push(v.name + '=' + joined);
                    }
                    else {
                        vals.push(joined);
                    }
                }
                continue;
            }
            if (Array.isArray(value)) {
                if (v.explodable) {
                    if (isLabel) {
                        vals.push(value.join('.'));
                    }
                    else if (isPath) {
                        vals.push(value.map(x => '/' + UriTemplate._encode(x, isReserved)).join(''));
                    }
                    else if (isParam) {
                        vals.push(value.map(x => v.name + '=' + String(x)).join(';'));
                    }
                    else if (isForm || isFormCont) {
                        vals.push(value.map(x => v.name + '=' + String(x)).join('&'));
                    }
                    else {
                        vals.push(value.map(x => UriTemplate._encode(x, isReserved)).join(','));
                    }
                }
                else {
                    if (isLabel) {
                        vals.push(value.join(','));
                    }
                    else if (isParam) {
                        vals.push(v.name + '=' + value.join(','));
                    }
                    else if (isForm || isFormCont) {
                        vals.push(v.name + '=' + value.join(','));
                    }
                    else {
                        vals.push(value.map(x => UriTemplate._encode(x, isReserved)).join(','));
                    }
                }
                continue;
            }
            let str = String(value);
            if (v.prefixLength !== undefined) {
                str = str.substring(0, v.prefixLength);
            }
            // For simple expansion, encode ! as well (not reserved)
            // Only + and # are reserved
            const enc = UriTemplate._encode(str, op === '+' || op === '#');
            if (isParam) {
                vals.push(v.name + '=' + enc);
            }
            else if (isForm || isFormCont) {
                vals.push(v.name + '=' + enc);
            }
            else if (isLabel) {
                vals.push(enc);
            }
            else if (isPath) {
                vals.push('/' + enc);
            }
            else {
                vals.push(enc);
            }
        }
        let joined = '';
        if (isLabel) {
            // Remove trailing dot for missing values
            const filtered = vals.filter(v => v !== '');
            joined = filtered.length ? prefix + filtered.join('.') : '';
        }
        else if (isPath) {
            // Remove empty segments for undefined/null
            const filtered = vals.filter(v => v !== '');
            joined = filtered.length ? filtered.join('') : '';
            if (joined && !joined.startsWith('/')) {
                joined = '/' + joined;
            }
        }
        else if (isParam) {
            // For param, if value is empty string, just append ;name
            joined = vals.length ? prefix + vals.map(v => v.replace(/=\s*$/, '')).join(';') : '';
        }
        else if (isForm) {
            joined = vals.length ? prefix + vals.join('&') : '';
        }
        else if (isFormCont) {
            joined = vals.length ? prefix + vals.join('&') : '';
        }
        else if (isFragment) {
            joined = prefix + vals.join(',');
        }
        else if (isReserved) {
            joined = vals.join(',');
        }
        else {
            joined = vals.join(',');
        }
        return joined;
    }
    static _encode(str, reserved) {
        return reserved ? encodeURI(str) : pctEncode(str);
    }
    static _formPair(k, v, named) {
        return named ? k + '=' + encodeURIComponent(String(v)) : encodeURIComponent(String(v));
    }
}
function pctEncode(str) {
    let out = '';
    for (let i = 0; i < str.length; i++) {
        const chr = str.charCodeAt(i);
        if (
        // alphanum ranges:
        (chr >= 0x30 && chr <= 0x39 || chr >= 0x41 && chr <= 0x5a || chr >= 0x61 && chr <= 0x7a) ||
            // unreserved characters:
            (chr === 0x2d || chr === 0x2e || chr === 0x5f || chr === 0x7e)) {
            out += str[i];
        }
        else {
            out += '%' + chr.toString(16).toUpperCase();
        }
    }
    return out;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXJpVGVtcGxhdGUuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9hZHZpa2FyL0RvY3VtZW50cy9hcmNoaXRlY3QvYXJjaDIvQXJjaElERS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9tY3AvY29tbW9uL3VyaVRlbXBsYXRlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBZ0JoRzs7R0FFRztBQUNILE1BQU0sT0FBTyxXQUFXO0lBTXZCLFlBQ2lCLFFBQWdCLEVBQ2hDLFVBQXlEO1FBRHpDLGFBQVEsR0FBUixRQUFRLENBQVE7UUFHaEMsSUFBSSxDQUFDLFFBQVEsR0FBRyxRQUFRLENBQUM7UUFDekIsSUFBSSxDQUFDLFVBQVUsR0FBRyxVQUFVLENBQUM7SUFDOUIsQ0FBQztJQUVEOztPQUVHO0lBQ0ksTUFBTSxDQUFDLEtBQUssQ0FBQyxRQUFnQjtRQUNuQyxNQUFNLFVBQVUsR0FBMEMsRUFBRSxDQUFDO1FBQzdELE1BQU0sS0FBSyxHQUFHLGVBQWUsQ0FBQztRQUM5QixJQUFJLEtBQTZCLENBQUM7UUFDbEMsSUFBSSxPQUFPLEdBQUcsQ0FBQyxDQUFDO1FBQ2hCLE9BQU8sQ0FBQyxLQUFLLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUM7WUFDdkMsTUFBTSxDQUFDLFVBQVUsRUFBRSxLQUFLLENBQUMsR0FBRyxLQUFLLENBQUM7WUFDbEMsVUFBVSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLE9BQU8sRUFBRSxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztZQUN0RCxPQUFPLEdBQUcsS0FBSyxDQUFDLEtBQUssR0FBRyxVQUFVLENBQUMsTUFBTSxDQUFDO1lBRTFDLDBFQUEwRTtZQUMxRSxJQUFJLFFBQVEsQ0FBQyxLQUFLLENBQUMsS0FBSyxHQUFHLENBQUMsQ0FBQyxLQUFLLEdBQUcsSUFBSSxRQUFRLENBQUMsT0FBTyxD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