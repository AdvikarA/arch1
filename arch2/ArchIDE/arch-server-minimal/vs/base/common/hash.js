/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { encodeHex, VSBuffer } from './buffer.js';
import * as strings from './strings.js';
/**
 * Return a hash value for an object.
 *
 * Note that this should not be used for binary data types. Instead,
 * prefer {@link hashAsync}.
 */
export function hash(obj) {
    return doHash(obj, 0);
}
export function doHash(obj, hashVal) {
    switch (typeof obj) {
        case 'object':
            if (obj === null) {
                return numberHash(349, hashVal);
            }
            else if (Array.isArray(obj)) {
                return arrayHash(obj, hashVal);
            }
            return objectHash(obj, hashVal);
        case 'string':
            return stringHash(obj, hashVal);
        case 'boolean':
            return booleanHash(obj, hashVal);
        case 'number':
            return numberHash(obj, hashVal);
        case 'undefined':
            return numberHash(937, hashVal);
        default:
            return numberHash(617, hashVal);
    }
}
export function numberHash(val, initialHashVal) {
    return (((initialHashVal << 5) - initialHashVal) + val) | 0; // hashVal * 31 + ch, keep as int32
}
function booleanHash(b, initialHashVal) {
    return numberHash(b ? 433 : 863, initialHashVal);
}
export function stringHash(s, hashVal) {
    hashVal = numberHash(149417, hashVal);
    for (let i = 0, length = s.length; i < length; i++) {
        hashVal = numberHash(s.charCodeAt(i), hashVal);
    }
    return hashVal;
}
function arrayHash(arr, initialHashVal) {
    initialHashVal = numberHash(104579, initialHashVal);
    return arr.reduce((hashVal, item) => doHash(item, hashVal), initialHashVal);
}
function objectHash(obj, initialHashVal) {
    initialHashVal = numberHash(181387, initialHashVal);
    return Object.keys(obj).sort().reduce((hashVal, key) => {
        hashVal = stringHash(key, hashVal);
        return doHash(obj[key], hashVal);
    }, initialHashVal);
}
/** Hashes the input as SHA-1, returning a hex-encoded string. */
export const hashAsync = (input) => {
    // Note: I would very much like to expose a streaming interface for hashing
    // generally, but this is not available in web crypto yet, see
    // https://github.com/w3c/webcrypto/issues/73
    // StringSHA1 is faster for small string input, use it since we have it:
    if (typeof input === 'string' && input.length < 250) {
        const sha = new StringSHA1();
        sha.update(input);
        return Promise.resolve(sha.digest());
    }
    let buff;
    if (typeof input === 'string') {
        buff = new TextEncoder().encode(input);
    }
    else if (input instanceof VSBuffer) {
        buff = input.buffer;
    }
    else {
        buff = input;
    }
    return crypto.subtle.digest('sha-1', buff).then(toHexString); // CodeQL [SM04514] we use sha1 here for validating old stored client state, not for security
};
var SHA1Constant;
(function (SHA1Constant) {
    SHA1Constant[SHA1Constant["BLOCK_SIZE"] = 64] = "BLOCK_SIZE";
    SHA1Constant[SHA1Constant["UNICODE_REPLACEMENT"] = 65533] = "UNICODE_REPLACEMENT";
})(SHA1Constant || (SHA1Constant = {}));
function leftRotate(value, bits, totalBits = 32) {
    // delta + bits = totalBits
    const delta = totalBits - bits;
    // All ones, expect `delta` zeros aligned to the right
    const mask = ~((1 << delta) - 1);
    // Join (value left-shifted `bits` bits) with (masked value right-shifted `delta` bits)
    return ((value << bits) | ((mask & value) >>> delta)) >>> 0;
}
function toHexString(bufferOrValue, bitsize = 32) {
    if (bufferOrValue instanceof ArrayBuffer) {
        return encodeHex(VSBuffer.wrap(new Uint8Array(bufferOrValue)));
    }
    return (bufferOrValue >>> 0).toString(16).padStart(bitsize / 4, '0');
}
/**
 * A SHA1 implementation that works with strings and does not allocate.
 *
 * Prefer to use {@link hashAsync} in async contexts
 */
export class StringSHA1 {
    static { this._bigBlock32 = new DataView(new ArrayBuffer(320)); } // 80 * 4 = 320
    constructor() {
        this._h0 = 0x67452301;
        this._h1 = 0xEFCDAB89;
        this._h2 = 0x98BADCFE;
        this._h3 = 0x10325476;
        this._h4 = 0xC3D2E1F0;
        this._buff = new Uint8Array(64 /* SHA1Constant.BLOCK_SIZE */ + 3 /* to fit any utf-8 */);
        this._buffDV = new DataView(this._buff.buffer);
        this._buffLen = 0;
        this._totalLen = 0;
        this._leftoverHighSurrogate = 0;
        this._finished = false;
    }
    update(str) {
        const strLen = str.length;
        if (strLen === 0) {
            return;
        }
        const buff = this._buff;
        let buffLen = this._buffLen;
        let leftoverHighSurrogate = this._leftoverHighSurrogate;
        let charCode;
        let offset;
        if (leftoverHighSurrogate !== 0) {
            charCode = leftoverHighSurrogate;
            offset = -1;
            leftoverHighSurrogate = 0;
        }
        else {
            charCode = str.charCodeAt(0);
            offset = 0;
        }
        while (true) {
            let codePoint = charCode;
            if (strings.isHighSurrogate(charCode)) {
                if (offset + 1 < strLen) {
                    const nextCharCode = str.charCodeAt(offset + 1);
                    if (strings.isLowSurrogate(nextCharCode)) {
                        offset++;
                        codePoint = strings.computeCodePoint(charCode, nextCharCode);
                    }
                    else {
                        // illegal => unicode replacement character
                        codePoint = 65533 /* SHA1Constant.UNICODE_REPLACEMENT */;
                    }
                }
                else {
                    // last character is a surrogate pair
                    leftoverHighSurrogate = charCode;
                    break;
                }
            }
            else if (strings.isLowSurrogate(charCode)) {
                // illegal => unicode replacement character
                codePoint = 65533 /* SHA1Constant.UNICODE_REPLACEMENT */;
            }
            buffLen = this._push(buff, buffLen, codePoint);
            offset++;
            if (offset < strLen) {
                charCode = str.charCodeAt(offset);
            }
            else {
                break;
            }
        }
        this._buffLen = buffLen;
        this._leftoverHighSurrogate = leftoverHighSurrogate;
    }
    _push(buff, buffLen, codePoint) {
        if (codePoint < 0x0080) {
            buff[buffLen++] = codePoint;
        }
        else if (codePoint < 0x0800) {
            buff[buffLen++] = 0b11000000 | ((codePoint & 0b00000000000000000000011111000000) >>> 6);
            buff[buffLen++] = 0b10000000 | ((codePoint & 0b00000000000000000000000000111111) >>> 0);
        }
        else if (codePoint < 0x10000) {
            buff[buffLen++] = 0b11100000 | ((codePoint & 0b00000000000000001111000000000000) >>> 12);
            buff[buffLen++] = 0b10000000 | ((codePoint & 0b00000000000000000000111111000000) >>> 6);
            buff[buffLen++] = 0b10000000 | ((codePoint & 0b00000000000000000000000000111111) >>> 0);
        }
        else {
            buff[buffLen++] = 0b11110000 | ((codePoint & 0b00000000000111000000000000000000) >>> 18);
            buff[buffLen++] = 0b10000000 | ((codePoint & 0b00000000000000111111000000000000) >>> 12);
            buff[buffLen++] = 0b10000000 | ((codePoint & 0b00000000000000000000111111000000) >>> 6);
            buff[buffLen++] = 0b10000000 | ((codePoint & 0b00000000000000000000000000111111) >>> 0);
        }
        if (buffLen >= 64 /* SHA1Constant.BLOCK_SIZE */) {
            this._step();
            buffLen -= 64 /* SHA1Constant.BLOCK_SIZE */;
            this._totalLen += 64 /* SHA1Constant.BLOCK_SIZE */;
            // take last 3 in case of UTF8 overflow
            buff[0] = buff[64 /* SHA1Constant.BLOCK_SIZE */ + 0];
            buff[1] = buff[64 /* SHA1Constant.BLOCK_SIZE */ + 1];
            buff[2] = buff[64 /* SHA1Constant.BLOCK_SIZE */ + 2];
        }
        return buffLen;
    }
    digest() {
        if (!this._finished) {
            this._finished = true;
            if (this._leftoverHighSurrogate) {
                // illegal => unicode replacement character
                this._leftoverHighSurrogate = 0;
                this._buffLen = this._push(this._buff, this._buffLen, 65533 /* SHA1Constant.UNICODE_REPLACEMENT */);
            }
            this._totalLen += this._buffLen;
            this._wrapUp();
        }
        return toHexString(this._h0) + toHexString(this._h1) + toHexString(this._h2) + toHexString(this._h3) + toHexString(this._h4);
    }
    _wrapUp() {
        this._buff[this._buffLen++] = 0x80;
        this._buff.subarray(this._buffLen).fill(0);
        if (this._buffLen > 56) {
            this._step();
            this._buff.fill(0);
        }
        // this will fit because the mantissa can cover up to 52 bits
        const ml = 8 * this._totalLen;
        this._buffDV.setUint32(56, Math.floor(ml / 4294967296), false);
        this._buffDV.setUint32(60, ml % 4294967296, false);
        this._step();
    }
    _step() {
        const bigBlock32 = StringSHA1._bigBlock32;
        const data = this._buffDV;
        for (let j = 0; j < 64 /* 16*4 */; j += 4) {
            bigBlock32.setUint32(j, data.getUint32(j, false), false);
        }
        for (let j = 64; j < 320 /* 80*4 */; j += 4) {
            bigBlock32.setUint32(j, leftRotate((bigBlock32.getUint32(j - 12, false) ^ bigBlock32.getUint32(j - 32, false) ^ bigBlock32.getUint32(j - 56, false) ^ bigBlock32.getUint32(j - 64, false)), 1), false);
        }
        let a = this._h0;
        let b = this._h1;
        let c = this._h2;
        let d = this._h3;
        let e = this._h4;
        let f, k;
        let temp;
        for (let j = 0; j < 80; j++) {
            if (j < 20) {
                f = (b & c) | ((~b) & d);
                k = 0x5A827999;
            }
            else if (j < 40) {
                f = b ^ c ^ d;
                k = 0x6ED9EBA1;
            }
            else if (j < 60) {
                f = (b & c) | (b & d) | (c & d);
                k = 0x8F1BBCDC;
            }
            else {
                f = b ^ c ^ d;
                k = 0xCA62C1D6;
            }
            temp = (leftRotate(a, 5) + f + e + k + bigBlock32.getUint32(j * 4, false)) & 0xffffffff;
            e = d;
            d = c;
            c = leftRotate(b, 30);
            b = a;
            a = temp;
        }
        this._h0 = (this._h0 + a) & 0xffffffff;
        this._h1 = (this._h1 + b) & 0xffffffff;
        this._h2 = (this._h2 + c) & 0xffffffff;
        this._h3 = (this._h3 + d) & 0xffffffff;
        this._h4 = (this._h4 + e) & 0xffffffff;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaGFzaC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL2FkdmlrYXIvRG9jdW1lbnRzL2FyY2hpdGVjdC9hcmNoMi9BcmNoSURFL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvY29tbW9uL2hhc2gudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFNBQVMsRUFBRSxRQUFRLEVBQUUsTUFBTSxhQUFhLENBQUM7QUFDbEQsT0FBTyxLQUFLLE9BQU8sTUFBTSxjQUFjLENBQUM7QUFJeEM7Ozs7O0dBS0c7QUFDSCxNQUFNLFVBQVUsSUFBSSxDQUFJLEdBQTBDO0lBQ2pFLE9BQU8sTUFBTSxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQztBQUN2QixDQUFDO0FBRUQsTUFBTSxVQUFVLE1BQU0sQ0FBQyxHQUFZLEVBQUUsT0FBZTtJQUNuRCxRQUFRLE9BQU8sR0FBRyxFQUFFLENBQUM7UUFDcEIsS0FBSyxRQUFRO1lBQ1osSUFBSSxHQUFHLEtBQUssSUFBSSxFQUFFLENBQUM7Z0JBQ2xCLE9BQU8sVUFBVSxDQUFDLEdBQUcsRUFBRSxPQUFPLENBQUMsQ0FBQztZQUNqQyxDQUFDO2lCQUFNLElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDO2dCQUMvQixPQUFPLFNBQVMsQ0FBQyxHQUFHLEVBQUUsT0FBTyxDQUFDLENBQUM7WUFDaEMsQ0FBQztZQUNELE9BQU8sVUFBVSxDQUFDLEdBQUcsRUFBRSxPQUFPLENBQUMsQ0FBQztRQUNqQyxLQUFLLFFBQVE7WUFDWixPQUFPLFVBQVUsQ0FBQyxHQUFHLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFDakMsS0FBSyxTQUFTO1lBQ2IsT0FBTyxXQUFXLENBQUMsR0FBRyxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBQ2xDLEtBQUssUUFBUTtZQUNaLE9BQU8sVUFBVSxDQUFDLEdBQUcsRUFBRSxPQUFPLENBQUMsQ0FBQztRQUNqQyxLQUFLLFdB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Q0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsVUFBVSxDQUFDLFNBQVMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDLEdBQUcsVUFBVSxDQUFDO1lBQ3hGLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDTixDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQ04sQ0FBQyxHQUFHLFVBQVUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7WUFDdEIsQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUNOLENBQUMsR0FBRyxJQUFJLENBQUM7UUFDVixDQUFDO1FBRUQsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLEdBQUcsVUFBVSxDQUFDO1FBQ3ZDLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxHQUFHLFVBQVUsQ0FBQztRQUN2QyxJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsR0FBRyxVQUFVLENBQUM7UUFDdkMsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLEdBQUcsVUFBVSxDQUFDO1FBQ3ZDLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxHQUFHLFVBQVUsQ0FBQztJQUN4QyxDQUFDIn0=