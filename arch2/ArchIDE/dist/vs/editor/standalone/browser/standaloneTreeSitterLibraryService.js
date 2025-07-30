/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export class StandaloneTreeSitterLibraryService {
    getParserClass() {
        throw new Error('getParserClass is not implemented in StandaloneTreeSitterLibraryService');
    }
    supportsLanguage(languageId, reader) {
        return false;
    }
    getLanguage(languageId, reader) {
        return undefined;
    }
    /**
     * Return value of null indicates that there are no injection queries for this language.
     * @param languageId
     * @param reader
     */
    getInjectionQueries(languageId, reader) {
        return null;
    }
    /**
     * Return value of null indicates that there are no highlights queries for this language.
     * @param languageId
     * @param reader
     */
    getHighlightingQueries(languageId, reader) {
        return null;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RhbmRhbG9uZVRyZWVTaXR0ZXJMaWJyYXJ5U2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL2FkdmlrYXIvRG9jdW1lbnRzL2FyY2hpdGVjdC9hcmNoMi9BcmNoSURFL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9zdGFuZGFsb25lL2Jyb3dzZXIvc3RhbmRhbG9uZVRyZWVTaXR0ZXJMaWJyYXJ5U2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQU1oRyxNQUFNLE9BQU8sa0NBQWtDO0lBRzlDLGNBQWM7UUFDYixNQUFNLElBQUksS0FBSyxDQUFDLHlFQUF5RSxDQUFDLENBQUM7SUFDNUYsQ0FBQztJQUVELGdCQUFnQixDQUFDLFVBQWtCLEVBQUUsTUFBMkI7UUFDL0QsT0FBTyxLQUFLLENBQUM7SUFDZCxDQUFDO0lBRUQsV0FBVyxDQUFDLFVBQWtCLEVBQUUsTUFBMkI7UUFDMUQsT0FBTyxTQUFTLENBQUM7SUFDbEIsQ0FBQztJQUNEOzs7O09BSUc7SUFDSCxtQkFBbUIsQ0FBQyxVQUFrQixFQUFFLE1BQTJCO1FBQ2xFLE9BQU8sSUFBSSxDQUFDO0lBQ2IsQ0FBQztJQUNEOzs7O09BSUc7SUFDSCxzQkFBc0IsQ0FBQyxVQUFrQixFQUFFLE1BQTJCO1FBQ3JFLE9BQU8sSUFBSSxDQUFDO0lBQ2IsQ0FBQztDQUNEIn0=