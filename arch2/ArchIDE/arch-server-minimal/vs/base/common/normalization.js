/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { LRUCache } from './map.js';
const nfcCache = new LRUCache(10000); // bounded to 10000 elements
export function normalizeNFC(str) {
    return normalize(str, 'NFC', nfcCache);
}
const nfdCache = new LRUCache(10000); // bounded to 10000 elements
export function normalizeNFD(str) {
    return normalize(str, 'NFD', nfdCache);
}
const nonAsciiCharactersPattern = /[^\u0000-\u0080]/;
function normalize(str, form, normalizedCache) {
    if (!str) {
        return str;
    }
    const cached = normalizedCache.get(str);
    if (cached) {
        return cached;
    }
    let res;
    if (nonAsciiCharactersPattern.test(str)) {
        res = str.normalize(form);
    }
    else {
        res = str;
    }
    // Use the cache for fast lookup
    normalizedCache.set(str, res);
    return res;
}
export const removeAccents = (function () {
    // transform into NFD form and remove accents
    // see: https://stackoverflow.com/questions/990904/remove-accents-diacritics-in-a-string-in-javascript/37511463#37511463
    const regex = /[\u0300-\u036f]/g;
    return function (str) {
        return normalizeNFD(str).replace(regex, '');
    };
})();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm9ybWFsaXphdGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL2FkdmlrYXIvRG9jdW1lbnRzL2FyY2hpdGVjdC9hcmNoMi9BcmNoSURFL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvY29tbW9uL25vcm1hbGl6YXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLFVBQVUsQ0FBQztBQUVwQyxNQUFNLFFBQVEsR0FBRyxJQUFJLFFBQVEsQ0FBaUIsS0FBSyxDQUFDLENBQUMsQ0FBQyw0QkFBNEI7QUFDbEYsTUFBTSxVQUFVLFlBQVksQ0FBQyxHQUFXO0lBQ3ZDLE9BQU8sU0FBUyxDQUFDLEdBQUcsRUFBRSxLQUFLLEVBQUUsUUFBUSxDQUFDLENBQUM7QUFDeEMsQ0FBQztBQUVELE1BQU0sUUFBUSxHQUFHLElBQUksUUFBUSxDQUFpQixLQUFLLENBQUMsQ0FBQyxDQUFDLDRCQUE0QjtBQUNsRixNQUFNLFVBQVUsWUFBWSxDQUFDLEdBQVc7SUFDdkMsT0FBTyxTQUFTLENBQUMsR0FBRyxFQUFFLEtBQUssRUFBRSxRQUFRLENBQUMsQ0FBQztBQUN4QyxDQUFDO0FBRUQsTUFBTSx5QkFBeUIsR0FBRyxrQkFBa0IsQ0FBQztBQUNyRCxTQUFTLFNBQVMsQ0FBQyxHQUFXLEVBQUUsSUFBWSxFQUFFLGVBQXlDO0lBQ3RGLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQztRQUNWLE9BQU8sR0FBRyxDQUFDO0lBQ1osQ0FBQztJQUVELE1BQU0sTUFBTSxHQUFHLGVBQWUsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDeEMsSUFBSSxNQUFNLEVBQUUsQ0FBQztRQUNaLE9BQU8sTUFBTSxDQUFDO0lBQ2YsQ0FBQztJQUVELElBQUksR0FBVyxDQUFDO0lBQ2hCLElBQUkseUJBQXlCLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUM7UUFDekMsR0FBRyxHQUFHLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDM0IsQ0FBQztTQUFNLENBQUM7UUFDUCxHQUFHLEdBQUcsR0FBRyxDQUFDO0lBQ1gsQ0FBQztJQUVELGdDQUFnQztJQUNoQyxlQUFlLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQztJQUU5QixPQUFPLEdBQUcsQ0FBQztBQUNaLENBQUM7QUFFRCxNQUFNLENBQUMsTUFBTSxhQUFhLEdBQTRCLENBQUM7SUFDdEQsNkNBQTZDO0lBQzdDLHdIQUF3SDtJQUN4SCxNQUFNLEtBQUssR0FBRyxrQkFBa0IsQ0FBQztJQUNqQyxPQUFPLFVBQVUsR0FBVztRQUMzQixPQUFPLFlBQVksQ0FBQyxHQUFHLENBQUMsQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxDQUFDO0lBQzdDLENBQUMsQ0FBQztBQUNILENBQUMsQ0FBQyxFQUFFLENBQUMifQ==