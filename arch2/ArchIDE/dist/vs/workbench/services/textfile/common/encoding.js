/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { newWriteableStream, listenStream } from '../../../../base/common/stream.js';
import { VSBuffer } from '../../../../base/common/buffer.js';
import { importAMDNodeModule } from '../../../../amdX.js';
import { CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { coalesce } from '../../../../base/common/arrays.js';
export const UTF8 = 'utf8';
export const UTF8_with_bom = 'utf8bom';
export const UTF16be = 'utf16be';
export const UTF16le = 'utf16le';
export function isUTFEncoding(encoding) {
    return [UTF8, UTF8_with_bom, UTF16be, UTF16le].some(utfEncoding => utfEncoding === encoding);
}
export const UTF16be_BOM = [0xFE, 0xFF];
export const UTF16le_BOM = [0xFF, 0xFE];
export const UTF8_BOM = [0xEF, 0xBB, 0xBF];
const ZERO_BYTE_DETECTION_BUFFER_MAX_LEN = 512; // number of bytes to look at to decide about a file being binary or not
const NO_ENCODING_GUESS_MIN_BYTES = 512; // when not auto guessing the encoding, small number of bytes are enough
const AUTO_ENCODING_GUESS_MIN_BYTES = 512 * 8; // with auto guessing we want a lot more content to be read for guessing
const AUTO_ENCODING_GUESS_MAX_BYTES = 512 * 128; // set an upper limit for the number of bytes we pass on to jschardet
export var DecodeStreamErrorKind;
(function (DecodeStreamErrorKind) {
    /**
     * Error indicating that the stream is binary even
     * though `acceptTextOnly` was specified.
     */
    DecodeStreamErrorKind[DecodeStreamErrorKind["STREAM_IS_BINARY"] = 1] = "STREAM_IS_BINARY";
})(DecodeStreamErrorKind || (DecodeStreamErrorKind = {}));
export class DecodeStreamError extends Error {
    constructor(message, decodeStreamErrorKind) {
        super(message);
        this.decodeStreamErrorKind = decodeStreamErrorKind;
    }
}
class DecoderStream {
    /**
     * This stream will only load iconv-lite lazily if the encoding
     * is not UTF-8. This ensures that for most common cases we do
     * not pay the price of loading the module from disk.
     *
     * We still need to be careful when converting UTF-8 to a string
     * though because we read the file in chunks of Buffer and thus
     * need to decode it via TextDecoder helper that is available
     * in browser and node.js environments.
     */
    static async create(encoding) {
        let decoder = undefined;
        if (encoding !== UTF8) {
            const iconv = await importAMDNodeModule('@vscode/iconv-lite-umd', 'lib/iconv-lite-umd.js');
            decoder = iconv.getDecoder(toNodeEncoding(encoding));
        }
        else {
            const utf8TextDecoder = new TextDecoder();
            decoder = {
                write(buffer) {
                    return utf8TextDecoder.decode(buffer, {
                        // Signal to TextDecoder that potentially more data is coming
                        // and that we are calling `decode` in the end to consume any
                        // remainders
                        stream: true
                    });
                },
                end() {
                    return utf8TextDecoder.decode();
                }
            };
        }
        return new DecoderStream(decoder);
    }
    constructor(iconvLiteDecoder) {
        this.iconvLiteDecoder = iconvLiteDecoder;
    }
    write(buffer) {
        return this.iconvLiteDecoder.write(buffer);
    }
    end() {
        return this.iconvLiteDecoder.end();
    }
}
export function toDecodeStream(source, options) {
    const minBytesRequiredForDetection = options.minBytesRequiredForDetection ?? options.guessEncoding ? AUTO_ENCODING_GUESS_MIN_BYTES : NO_ENCODING_GUESS_MIN_BYTES;
    return new Promise((resolve, reject) => {
        const target = newWriteableStream(strings => strings.join(''));
        const bufferedChunks = [];
        let bytesBuffered = 0;
        let decoder = undefined;
        const cts = new CancellationTokenSource();
        const createDecoder = async () => {
            try {
                // detect encoding from buffer
                const detected = await detectEncodingFromBuffer({
                    buffer: VSBuffer.concat(bufferedChunks),
                    bytesRead: bytesBuffered
                }, options.guessEncoding, options.candidateGuessEncodings);
                // throw early if the source seems binary and
                // we are instructed to only accept text
                if (detected.seemsBinary && options.acceptTextOnly) {
                    throw new DecodeStreamError('Stream is binary but only text is accepted for decoding', 1 /* DecodeStreamErrorKind.STREAM_IS_BINARY */);
                }
                // ensure to respect overwrite of encoding
                detected.encoding = await options.overwriteEncoding(detected.encoding);
                // decode and write buffered content
                decoder = await DecoderStream.create(detected.encoding);
                const decoded = decoder.write(VSBuffer.concat(bufferedChunks).buffer);
                target.write(decoded);
                bufferedChunks.length = 0;
                bytesBuffered = 0;
                // signal to the outside our detected encoding and final decoder stream
                resolve({
                    stream: target,
                    detected
                });
            }
            catch (error) {
                // Stop handling anything from the source and target
                cts.cancel();
                target.destroy();
                reject(error);
            }
        };
        listenStream(source, {
            onData: async (chunk) => {
                // if the decoder is ready, we just write directly
                if (decoder) {
                    target.write(decoder.write(chunk.buffer));
                }
                // otherwise we need to buffer the data until the stream is ready
                else {
                    bufferedChunks.push(chunk);
                    bytesBuffered += chunk.byteLength;
                    // buffered enough data for encoding detection, create stream
                    if (bytesBuffered >= minBytesRequiredForDetection) {
                        // pause stream here until the decoder is ready
                        source.pause();
                        await createDecoder();
                        // resume stream now that decoder is ready but
                        // outside of this stack to reduce recursion
                        setTimeout(() => source.resume());
                    }
                }
            },
            onError: error => target.error(error), // simply forward to target
            onEnd: async () => {
                // we were still waiting for data to do the encoding
                // detection. thus, wrap up starting the stream even
                // without all the data to get things going
                if (!decoder) {
                    await createDecoder();
                }
                // end the target with the remainders of the decoder
                target.end(decoder?.end());
            }
        }, cts.token);
    });
}
export async function toEncodeReadable(readable, encoding, options) {
    const iconv = await importAMDNodeModule('@vscode/iconv-lite-umd', 'lib/iconv-lite-umd.js');
    const encoder = iconv.getEncoder(toNodeEncoding(encoding), options);
    let bytesWritten = false;
    let done = false;
    return {
        read() {
            if (done) {
                return null;
            }
            const chunk = readable.read();
            if (typeof chunk !== 'string') {
                done = true;
                // If we are instructed to add a BOM but we detect that no
                // bytes have been written, we must ensure to return the BOM
                // ourselves so that we comply with the contract.
                if (!bytesWritten && options?.addBOM) {
                    switch (encoding) {
                        case UTF8:
                        case UTF8_with_bom:
                            return VSBuffer.wrap(Uint8Array.from(UTF8_BOM));
                        case UTF16be:
                            return VSBuffer.wrap(Uint8Array.from(UTF16be_BOM));
                        case UTF16le:
                            return VSBuffer.wrap(Uint8Array.from(UTF16le_BOM));
                    }
                }
                const leftovers = encoder.end();
                if (leftovers && leftovers.length > 0) {
                    bytesWritten = true;
                    return VSBuffer.wrap(leftovers);
                }
                return null;
            }
            bytesWritten = true;
            return VSBuffer.wrap(encoder.write(chunk));
        }
    };
}
export async function encodingExists(encoding) {
    const iconv = await importAMDNodeModule('@vscode/iconv-lite-umd', 'lib/iconv-lite-umd.js');
    return iconv.encodingExists(toNodeEncoding(encoding));
}
export function toNodeEncoding(enc) {
    if (enc === UTF8_with_bom || enc === null) {
        return UTF8; // iconv does not distinguish UTF 8 with or without BOM, so we need to help it
    }
    return enc;
}
export function detectEncodingByBOMFromBuffer(buffer, bytesRead) {
    if (!buffer || bytesRead < UTF16be_BOM.length) {
        return null;
    }
    const b0 = buffer.readUInt8(0);
    const b1 = buffer.readUInt8(1);
    // UTF-16 BE
    if (b0 === UTF16be_BOM[0] && b1 === UTF16be_BOM[1]) {
        return UTF16be;
    }
    // UTF-16 LE
    if (b0 === UTF16le_BOM[0] && b1 === UTF16le_BOM[1]) {
        return UTF16le;
    }
    if (bytesRead < UTF8_BOM.length) {
        return null;
    }
    const b2 = buffer.readUInt8(2);
    // UTF-8
    if (b0 === UTF8_BOM[0] && b1 === UTF8_BOM[1] && b2 === UTF8_BOM[2]) {
        return UTF8_with_bom;
    }
    return null;
}
// we explicitly ignore a specific set of encodings from auto guessing
// - ASCII: we never want this encoding (most UTF-8 files would happily detect as
//          ASCII files and then you could not type non-ASCII characters anymore)
// - UTF-16: we have our own detection logic for UTF-16
// - UTF-32: we do not support this encoding in VSCode
const IGNORE_ENCODINGS = ['ascii', 'utf-16', 'utf-32'];
/**
 * Guesses the encoding from buffer.
 */
async function guessEncodingByBuffer(buffer, candidateGuessEncodings) {
    const jschardet = await importAMDNodeModule('jschardet', 'dist/jschardet.min.js');
    // ensure to limit buffer for guessing due to https://github.com/aadsm/jschardet/issues/53
    const limitedBuffer = buffer.slice(0, AUTO_ENCODING_GUESS_MAX_BYTES);
    // before guessing jschardet calls toString('binary') on input if it is a Buffer,
    // since we are using it inside browser environment as well we do conversion ourselves
    // https://github.com/aadsm/jschardet/blob/v2.1.1/src/index.js#L36-L40
    const binaryString = encodeLatin1(limitedBuffer.buffer);
    // ensure to convert candidate encodings to jschardet encoding names if provided
    if (candidateGuessEncodings) {
        candidateGuessEncodings = coalesce(candidateGuessEncodings.map(e => toJschardetEncoding(e)));
        if (candidateGuessEncodings.length === 0) {
            candidateGuessEncodings = undefined;
        }
    }
    let guessed;
    try {
        guessed = jschardet.detect(binaryString, candidateGuessEncodings ? { detectEncodings: candidateGuessEncodings } : undefined);
    }
    catch (error) {
        return null; // jschardet throws for unknown encodings (https://github.com/microsoft/vscode/issues/239928)
    }
    if (!guessed || !guessed.encoding) {
        return null;
    }
    const enc = guessed.encoding.toLowerCase();
    if (0 <= IGNORE_ENCODINGS.indexOf(enc)) {
        return null; // see comment above why we ignore some encodings
    }
    return toIconvLiteEncoding(guessed.encoding);
}
const JSCHARDET_TO_ICONV_ENCODINGS = {
    'ibm866': 'cp866',
    'big5': 'cp950'
};
function normalizeEncoding(encodingName) {
    return encodingName.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
}
function toIconvLiteEncoding(encodingName) {
    const normalizedEncodingName = normalizeEncoding(encodingName);
    const mapped = JSCHARDET_TO_ICONV_ENCODINGS[normalizedEncodingName];
    return mapped || normalizedEncodingName;
}
function toJschardetEncoding(encodingName) {
    const normalizedEncodingName = normalizeEncoding(encodingName);
    const mapped = GUESSABLE_ENCODINGS[normalizedEncodingName];
    return mapped ? mapped.guessableName : undefined;
}
function encodeLatin1(buffer) {
    let result = '';
    for (let i = 0; i < buffer.length; i++) {
        result += String.fromCharCode(buffer[i]);
    }
    return result;
}
/**
 * The encodings that are allowed in a settings file don't match the canonical encoding labels specified by WHATWG.
 * See https://encoding.spec.whatwg.org/#names-and-labels
 * Iconv-lite strips all non-alphanumeric characters, but ripgrep doesn't. For backcompat, allow these labels.
 */
export function toCanonicalName(enc) {
    switch (enc) {
        case 'shiftjis':
            return 'shift-jis';
        case 'utf16le':
            return 'utf-16le';
        case 'utf16be':
            return 'utf-16be';
        case 'big5hkscs':
            return 'big5-hkscs';
        case 'eucjp':
            return 'euc-jp';
        case 'euckr':
            return 'euc-kr';
        case 'koi8r':
            return 'koi8-r';
        case 'koi8u':
            return 'koi8-u';
        case 'macroman':
            return 'x-mac-roman';
        case 'utf8bom':
            return 'utf8';
        default: {
            const m = enc.match(/windows(\d+)/);
            if (m) {
                return 'windows-' + m[1];
            }
            return enc;
        }
    }
}
export function detectEncodingFromBuffer({ buffer, bytesRead }, autoGuessEncoding, candidateGuessEncodings) {
    // Always first check for BOM to find out about encoding
    let encoding = detectEncodingByBOMFromBuffer(buffer, bytesRead);
    // Detect 0 bytes to see if file is binary or UTF-16 LE/BE
    // unless we already know that this file has a UTF-16 encoding
    let seemsBinary = false;
    if (encoding !== UTF16be && encoding !== UTF16le && buffer) {
        let couldBeUTF16LE = true; // e.g. 0xAA 0x00
        let couldBeUTF16BE = true; // e.g. 0x00 0xAA
        let containsZeroByte = false;
        // This is a simplified guess to detect UTF-16 BE or LE by just checking if
        // the first 512 bytes have the 0-byte at a specific location. For UTF-16 LE
        // this would be the odd byte index and for UTF-16 BE the even one.
        // Note: this can produce false positives (a binary file that uses a 2-byte
        // encoding of the same format as UTF-16) and false negatives (a UTF-16 file
        // that is using 4 bytes to encode a character).
        for (let i = 0; i < bytesRead && i < ZERO_BYTE_DETECTION_BUFFER_MAX_LEN; i++) {
            const isEndian = (i % 2 === 1); // assume 2-byte sequences typical for UTF-16
            const isZeroByte = (buffer.readUInt8(i) === 0);
            if (isZeroByte) {
                containsZeroByte = true;
            }
            // UTF-16 LE: expect e.g. 0xAA 0x00
            if (couldBeUTF16LE && (isEndian && !isZeroByte || !isEndian && isZeroByte)) {
                couldBeUTF16LE = false;
            }
            // UTF-16 BE: expect e.g. 0x00 0xAA
            if (couldBeUTF16BE && (isEndian && isZeroByte || !isEndian && !isZeroByte)) {
                couldBeUTF16BE = false;
            }
            // Return if this is neither UTF16-LE nor UTF16-BE and thus treat as binary
            if (isZeroByte && !couldBeUTF16LE && !couldBeUTF16BE) {
                break;
            }
        }
        // Handle case of 0-byte included
        if (containsZeroByte) {
            if (couldBeUTF16LE) {
                encoding = UTF16le;
            }
            else if (couldBeUTF16BE) {
                encoding = UTF16be;
            }
            else {
                seemsBinary = true;
            }
        }
    }
    // Auto guess encoding if configured
    if (autoGuessEncoding && !seemsBinary && !encoding && buffer) {
        return guessEncodingByBuffer(buffer.slice(0, bytesRead), candidateGuessEncodings).then(guessedEncoding => {
            return {
                seemsBinary: false,
                encoding: guessedEncoding
            };
        });
    }
    return { seemsBinary, encoding };
}
export const SUPPORTED_ENCODINGS = {
    utf8: {
        labelLong: 'UTF-8',
        labelShort: 'UTF-8',
        order: 1,
        alias: 'utf8bom',
        guessableName: 'UTF-8'
    },
    utf8bom: {
        labelLong: 'UTF-8 with BOM',
        labelShort: 'UTF-8 with BOM',
        encodeOnly: true,
        order: 2,
        alias: 'utf8'
    },
    utf16le: {
        labelLong: 'UTF-16 LE',
        labelShort: 'UTF-16 LE',
        order: 3,
        guessableName: 'UTF-16LE'
    },
    utf16be: {
        labelLong: 'UTF-16 BE',
        labelShort: 'UTF-16 BE',
        order: 4,
        guessableName: 'UTF-16BE'
    },
    windows1252: {
        labelLong: 'Western (Windows 1252)',
        labelShort: 'Windows 1252',
        order: 5,
        guessableName: 'windows-1252'
    },
    iso88591: {
        labelLong: 'Western (ISO 8859-1)',
        labelShort: 'ISO 8859-1',
        order: 6
    },
    iso88593: {
        labelLong: 'Western (ISO 8859-3)',
        labelShort: 'ISO 8859-3',
        order: 7
    },
    iso885915: {
        labelLong: 'Western (ISO 8859-15)',
        labelShort: 'ISO 8859-15',
        order: 8
    },
    macroman: {
        labelLong: 'Western (Mac Roman)',
        labelShort: 'Mac Roman',
        order: 9
    },
    cp437: {
        labelLong: 'DOS (CP 437)',
        labelShort: 'CP437',
        order: 10
    },
    windows1256: {
        labelLong: 'Arabic (Windows 1256)',
        labelShort: 'Windows 1256',
        order: 11
    },
    iso88596: {
        labelLong: 'Arabic (ISO 8859-6)',
        labelShort: 'ISO 8859-6',
        order: 12
    },
    windows1257: {
        labelLong: 'Baltic (Windows 1257)',
        labelShort: 'Windows 1257',
        order: 13
    },
    iso88594: {
        labelLong: 'Baltic (ISO 8859-4)',
        labelShort: 'ISO 8859-4',
        order: 14
    },
    iso885914: {
        labelLong: 'Celtic (ISO 8859-14)',
        labelShort: 'ISO 8859-14',
        order: 15
    },
    windows1250: {
        labelLong: 'Central European (Windows 1250)',
        labelShort: 'Windows 1250',
        order: 16,
        guessableName: 'windows-1250'
    },
    iso88592: {
        labelLong: 'Central European (ISO 8859-2)',
        labelShort: 'ISO 8859-2',
        order: 17,
        guessableName: 'ISO-8859-2'
    },
    cp852: {
        labelLong: 'Central European (CP 852)',
        labelShort: 'CP 852',
        order: 18
    },
    windows1251: {
        labelLong: 'Cyrillic (Windows 1251)',
        labelShort: 'Windows 1251',
        order: 19,
        guessableName: 'windows-1251'
    },
    cp866: {
        labelLong: 'Cyrillic (CP 866)',
        labelShort: 'CP 866',
        order: 20,
        guessableName: 'IBM866'
    },
    cp1125: {
        labelLong: 'Cyrillic (CP 1125)',
        labelShort: 'CP 1125',
        order: 21,
        guessableName: 'IBM1125'
    },
    iso88595: {
        labelLong: 'Cyrillic (ISO 8859-5)',
        labelShort: 'ISO 8859-5',
        order: 22,
        guessableName: 'ISO-8859-5'
    },
    koi8r: {
        labelLong: 'Cyrillic (KOI8-R)',
        labelShort: 'KOI8-R',
        order: 23,
        guessableName: 'KOI8-R'
    },
    koi8u: {
        labelLong: 'Cyrillic (KOI8-U)',
        labelShort: 'KOI8-U',
        order: 24
    },
    iso885913: {
        labelLong: 'Estonian (ISO 8859-13)',
        labelShort: 'ISO 8859-13',
        order: 25
    },
    windows1253: {
        labelLong: 'Greek (Windows 1253)',
        labelShort: 'Windows 1253',
        order: 26,
        guessableName: 'windows-1253'
    },
    iso88597: {
        labelLong: 'Greek (ISO 8859-7)',
        labelShort: 'ISO 8859-7',
        order: 27,
        guessableName: 'ISO-8859-7'
    },
    windows1255: {
        labelLong: 'Hebrew (Windows 1255)',
        labelShort: 'Windows 1255',
        order: 28,
        guessableName: 'windows-1255'
    },
    iso88598: {
        labelLong: 'Hebrew (ISO 8859-8)',
        labelShort: 'ISO 8859-8',
        order: 29,
        guessableName: 'ISO-8859-8'
    },
    iso885910: {
        labelLong: 'Nordic (ISO 8859-10)',
        labelShort: 'ISO 8859-10',
        order: 30
    },
    iso885916: {
        labelLong: 'Romanian (ISO 8859-16)',
        labelShort: 'ISO 8859-16',
        order: 31
    },
    windows1254: {
        labelLong: 'Turkish (Windows 1254)',
        labelShort: 'Windows 1254',
        order: 32
    },
    iso88599: {
        labelLong: 'Turkish (ISO 8859-9)',
        labelShort: 'ISO 8859-9',
        order: 33
    },
    windows1258: {
        labelLong: 'Vietnamese (Windows 1258)',
        labelShort: 'Windows 1258',
        order: 34
    },
    gbk: {
        labelLong: 'Simplified Chinese (GBK)',
        labelShort: 'GBK',
        order: 35
    },
    gb18030: {
        labelLong: 'Simplified Chinese (GB18030)',
        labelShort: 'GB18030',
        order: 36
    },
    cp950: {
        labelLong: 'Traditional Chinese (Big5)',
        labelShort: 'Big5',
        order: 37,
        guessableName: 'Big5'
    },
    big5hkscs: {
        labelLong: 'Traditional Chinese (Big5-HKSCS)',
        labelShort: 'Big5-HKSCS',
        order: 38
    },
    shiftjis: {
        labelLong: 'Japanese (Shift JIS)',
        labelShort: 'Shift JIS',
        order: 39,
        guessableName: 'SHIFT_JIS'
    },
    eucjp: {
        labelLong: 'Japanese (EUC-JP)',
        labelShort: 'EUC-JP',
        order: 40,
        guessableName: 'EUC-JP'
    },
    euckr: {
        labelLong: 'Korean (EUC-KR)',
        labelShort: 'EUC-KR',
        order: 41,
        guessableName: 'EUC-KR'
    },
    windows874: {
        labelLong: 'Thai (Windows 874)',
        labelShort: 'Windows 874',
        order: 42
    },
    iso885911: {
        labelLong: 'Latin/Thai (ISO 8859-11)',
        labelShort: 'ISO 8859-11',
        order: 43
    },
    koi8ru: {
        labelLong: 'Cyrillic (KOI8-RU)',
        labelShort: 'KOI8-RU',
        order: 44
    },
    koi8t: {
        labelLong: 'Tajik (KOI8-T)',
        labelShort: 'KOI8-T',
        order: 45
    },
    gb2312: {
        labelLong: 'Simplified Chinese (GB 2312)',
        labelShort: 'GB 2312',
        order: 46,
        guessableName: 'GB2312'
    },
    cp865: {
        labelLong: 'Nordic DOS (CP 865)',
        labelShort: 'CP 865',
        order: 47
    },
    cp850: {
        labelLong: 'Western European DOS (CP 850)',
        labelShort: 'CP 850',
        order: 48
    }
};
export const GUESSABLE_ENCODINGS = (() => {
    const guessableEncodings = {};
    for (const encoding in SUPPORTED_ENCODINGS) {
        if (SUPPORTED_ENCODINGS[encoding].guessableName) {
            guessableEncodings[encoding] = SUPPORTED_ENCODINGS[encoding];
        }
    }
    return guessableEncodings;
})();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZW5jb2RpbmcuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9hZHZpa2FyL0RvY3VtZW50cy9hcmNoaXRlY3QvYXJjaDIvQXJjaElERS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvdGV4dGZpbGUvY29tbW9uL2VuY29kaW5nLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBNEIsa0JBQWtCLEVBQUUsWUFBWSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDL0csT0FBTyxFQUFFLFFBQVEsRUFBNEMsTUFBTSxtQ0FBbUMsQ0FBQztBQUN2RyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQztBQUMxRCxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNsRixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFFN0QsTUFBTSxDQUFDLE1BQU0sSUFBSSxHQUFHLE1BQU0sQ0FBQztBQUMzQixNQUFNLENBQUMsTUFBTSxhQUFhLEdBQUcsU0FBUyxDQUFDO0FBQ3ZDLE1BQU0sQ0FBQyxNQUFNLE9BQU8sR0FBRyxTQUFTLENBQUM7QUFDakMsTUFBTSxDQUFDLE1BQU0sT0FBTyxHQUFHLFNBQVMsQ0FBQztBQUlqQyxNQUFNLFVBQVUsYUFBYSxDQUFDLFFBQWdCO0lBQzdDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsYUFBYSxFQUFFLE9BQU8sRUFBRSxPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLEVBQUUsQ0FBQyxXQUFXLEtBQUssUUFBUSxDQUFDLENBQUM7QUFDOUYsQ0FBQztBQUVELE1BQU0sQ0FBQyxNQUFNLFdBQVcsR0FBRyxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztBQUN4QyxNQUFNLENBQUMsTUFBTSxXQUFXLEdBQUcsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7QUFDeEMsTUFBTSxD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