/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
const privateSymbol = Symbol('TextModelEditSource');
export class TextModelEditSource {
    constructor(metadata, _privateCtorGuard) {
        this.metadata = metadata;
    }
    toString() {
        return `${this.metadata.source}`;
    }
    getType() {
        const metadata = this.metadata;
        switch (metadata.source) {
            case 'cursor':
                return metadata.kind;
            case 'inlineCompletionAccept':
                return metadata.source + (metadata.$nes ? ':nes' : '');
            case 'unknown':
                return metadata.name || 'unknown';
            default:
                return metadata.source;
        }
    }
    /**
     * Converts the metadata to a key string.
     * Only includes properties/values that have `level` many `$` prefixes or less.
    */
    toKey(level, filter = {}) {
        const metadata = this.metadata;
        const keys = Object.entries(metadata).filter(([key, value]) => {
            const filterVal = filter[key];
            if (filterVal !== undefined) {
                return filterVal;
            }
            const prefixCount = (key.match(/\$/g) || []).length;
            return prefixCount <= level && value !== undefined && value !== null && value !== '';
        }).map(([key, value]) => `${key}:${value}`);
        return keys.join('-');
    }
    get props() {
        return this.metadata;
    }
}
function createEditSource(metadata) {
    return new TextModelEditSource(metadata, privateSymbol);
}
export function isAiEdit(source) {
    switch (source.metadata.source) {
        case 'inlineCompletionAccept':
        case 'inlineCompletionPartialAccept':
        case 'inlineChat.applyEdits':
        case 'Chat.applyEdits':
            return true;
    }
    return false;
}
export function isUserEdit(source) {
    switch (source.metadata.source) {
        case 'cursor':
            return source.metadata.kind === 'type';
    }
    return false;
}
export const EditSources = {
    unknown(data) {
        return createEditSource({
            source: 'unknown',
            name: data.name,
        });
    },
    rename: () => createEditSource({ source: 'rename' }),
    chatApplyEdits(data) {
        return createEditSource({
            source: 'Chat.applyEdits',
            $modelId: avoidPathRedaction(data.modelId),
            $$sessionId: data.sessionId,
            $$requestId: data.requestId,
        });
    },
    chatUndoEdits: () => createEditSource({ source: 'Chat.undoEdits' }),
    chatReset: () => createEditSource({ source: 'Chat.reset' }),
    inlineCompletionAccept(data) {
        return createEditSource({
            source: 'inlineCompletionAccept',
            $nes: data.nes,
            ...toProperties(data.providerId),
            $$requestUuid: data.requestUuid,
        });
    },
    inlineCompletionPartialAccept(data) {
        return createEditSource({
            source: 'inlineCompletionPartialAccept',
            type: data.type,
            $nes: data.nes,
            ...toProperties(data.providerId),
            $$requestUuid: data.requestUuid,
        });
    },
    inlineChatApplyEdit(data) {
        return createEditSource({
            source: 'inlineChat.applyEdits',
            $modelId: avoidPathRedaction(data.modelId),
        });
    },
    reloadFromDisk: () => createEditSource({ source: 'reloadFromDisk' }),
    cursor(data) {
        return createEditSource({
            source: 'cursor',
            kind: data.kind,
            detailedSource: data.detailedSource,
        });
    },
    setValue: () => createEditSource({ source: 'setValue' }),
    eolChange: () => createEditSource({ source: 'eolChange' }),
    applyEdits: () => createEditSource({ source: 'applyEdits' }),
    snippet: () => createEditSource({ source: 'snippet' }),
    suggest: (data) => createEditSource({ source: 'suggest', ...toProperties(data.providerId) }),
    codeAction: (data) => createEditSource({ source: 'codeAction', $kind: data.kind, ...toProperties(data.providerId) })
};
function toProperties(version) {
    if (!version) {
        return {};
    }
    return {
        $extensionId: version.extensionId,
        $extensionVersion: version.extensionVersion,
        $providerId: version.providerId,
    };
}
function avoidPathRedaction(str) {
    if (str === undefined) {
        return undefined;
    }
    // To avoid false-positive file path redaction.
    return str.replaceAll('/', '|');
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dE1vZGVsRWRpdFNvdXJjZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL2FkdmlrYXIvRG9jdW1lbnRzL2FyY2hpdGVjdC9hcmNoMi9BcmNoSURFL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb21tb24vdGV4dE1vZGVsRWRpdFNvdXJjZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUloRyxNQUFNLGFBQWEsR0FBRyxNQUFNLENBQUMscUJBQXFCLENBQUMsQ0FBQztBQUVwRCxNQUFNLE9BQU8sbUJBQW1CO0lBQy9CLFlBQ2lCLFFBQXNDLEVBQ3RELGlCQUF1QztRQUR2QixhQUFRLEdBQVIsUUFBUSxDQUE4QjtJQUVuRCxDQUFDO0lBRUUsUUFBUTtRQUNkLE9BQU8sR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sRUFBRSxDQUFDO0lBQ2xDLENBQUM7SUFFTSxPQUFPO1FBQ2IsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQztRQUMvQixRQUFRLFFBQVEsQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUN6QixLQUFLLFFBQVE7Z0JBQ1osT0FBTyxRQUFRLENBQUMsSUFBSSxDQUFDO1lBQ3RCLEtBQUssd0JBQXdCO2dCQUM1QixPQUFPLFFBQVEsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBQ3hELEtBQUssU0FBUztnQkFDYixPQUFPLFFBQVEsQ0FBQyxJQUFJLElBQUksU0FBUyxDQUFDO1lBQ25DO2dCQUNDLE9BQU8sUUFBUSxDQUFDLE1BQU0sQ0FBQztRQUN6QixDQUFDO0lBQ0YsQ0FBQztJQUVEOzs7TUFHRTtJQUNLLEtBQUssQ0FBQyxLQUFhLEVBQUUsU0FBbUUsRUFBRTtRQUNoRyxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDO1FBQy9CLE1BQU0sSUFBSSxHQUFH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