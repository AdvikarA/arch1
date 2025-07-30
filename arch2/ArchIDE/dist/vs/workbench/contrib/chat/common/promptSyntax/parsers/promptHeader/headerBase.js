/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../../../../nls.js';
import { Disposable } from '../../../../../../../base/common/lifecycle.js';
import { ObjectStream } from '../../codecs/base/utils/objectStream.js';
import { PromptMetadataError, PromptMetadataWarning } from './diagnostics.js';
import { SimpleToken } from '../../codecs/base/simpleCodec/tokens/tokens.js';
import { FrontMatterRecord } from '../../codecs/base/frontMatterCodec/tokens/index.js';
import { FrontMatterDecoder } from '../../codecs/base/frontMatterCodec/frontMatterDecoder.js';
import { PromptDescriptionMetadata } from './metadata/description.js';
/**
 * Base class for prompt/instruction/mode headers.
 */
export class HeaderBase extends Disposable {
    /**
     * Data object with all header's metadata records.
     */
    get metadata() {
        const result = {};
        for (const [entryName, entryValue] of Object.entries(this.meta)) {
            if (entryValue?.value === undefined) {
                continue;
            }
            // note! we have to resort to `Object.assign()` here because
            //       the `Object.entries()` call looses type information
            Object.assign(result, {
                [entryName]: entryValue.value,
            });
        }
        return result;
    }
    /**
     * A copy of metadata object with utility classes as values
     * for each of prompt header's record.
     *
     * Please use {@link metadata} instead if all you need to read is
     * the plain "data" object representation of valid metadata records.
     */
    get metadataUtility() {
        return { ...this.meta };
    }
    /**
     * List of all diagnostic issues found while parsing
     * the prompt header.
     */
    get diagnostics() {
        return this.issues;
    }
    /**
     * Full range of the header in the original document.
     */
    get range() {
        return this.token.range;
    }
    constructor(token, languageId) {
        super();
        this.token = token;
        this.languageId = languageId;
        this.issues = [];
        this.meta = {};
        this.recordNames = new Set();
        this.stream = this._register(new FrontMatterDecoder(ObjectStream.fromArray([...token.contentToken.children])));
        this.stream.onData(this.onData.bind(this));
        this.stream.onError(this.onError.bind(this));
    }
    /**
     * Process front matter tokens, converting them into
     * well-known prompt metadata records.
     */
    onData(token) {
        // we currently expect only front matter 'records' for
        // the prompt metadata, hence add diagnostics for all
        // other tokens and ignore them
        if ((token instanceof FrontMatterRecord) === false) {
            // unless its a simple token, in which case we just ignore it
            if (token instanceof SimpleToken) {
                return;
            }
            this.issues.push(new PromptMetadataError(token.range, localize('prompt.header.diagnostics.unexpected-token', "Unexpected token '{0}'.", token.text)));
            return;
        }
        const recordName = token.nameToken.text;
        // if we already have a record with this name,
        // add a warning diagnostic and ignore it
        if (this.recordNames.has(recordName)) {
            this.issues.push(new PromptMetadataWarning(token.range, localize('prompt.header.metadata.diagnostics.duplicate-record', "Duplicate property '{0}' will be ignored.", recordName)));
            return;
        }
        this.recordNames.add(recordName);
        // if the record might be a "description" metadata
        // add it to the list of parsed metadata records
        if (PromptDescriptionMetadata.isDescriptionRecord(token)) {
            const metadata = new PromptDescriptionMetadata(token, this.languageId);
            this.issues.push(...metadata.validate());
            this.meta.description = metadata;
            this.recordNames.add(recordName);
            return;
        }
        // pipe the token to the actual implementation class
        // that might to handle it based on the token type
        if (this.handleToken(token)) {
            return;
        }
        // all other records are "unknown" ones
        this.issues.push(new PromptMetadataWarning(token.range, localize('prompt.header.metadata.diagnostics.unknown-record', "Unknown property '{0}' will be ignored.", recordName)));
    }
    /**
     * Process errors from the underlying front matter decoder.
     */
    onError(error) {
        this.issues.push(new PromptMetadataError(this.token.range, localize('prompt.header.diagnostics.parsing-error', "Failed to parse prompt header: {0}", error.message)));
    }
    /**
     * Promise that resolves when parsing process of
     * the prompt header completes.
     */
    get settled() {
        return this.stream.settled;
    }
    /**
     * Starts the parsing process of the prompt header.
     */
    start() {
        this.stream.start();
        return this;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaGVhZGVyQmFzZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL2FkdmlrYXIvRG9jdW1lbnRzL2FyY2hpdGVjdC9hcmNoMi9BcmNoSURFL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvY29tbW9uL3Byb21wdFN5bnRheC9wYXJzZXJzL3Byb21wdEhlYWRlci9oZWFkZXJCYXNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUt2RCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sK0NBQStDLENBQUM7QUFDM0UsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQ3ZFLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxxQkFBcUIsRUFBb0IsTUFBTSxrQkFBa0IsQ0FBQztBQUNoRyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDN0UsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sb0RBQW9ELENBQUM7QUFFdkYsT0FBTyxFQUFFLGtCQUFrQixFQUEwQixNQUFNLDBEQUEwRCxDQUFDO0FBQ3RILE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLDJCQUEyQixDQUFDO0FBOEJ0RTs7R0FFRztBQUNILE1BQU0sT0FBZ0IsVUFFcEIsU0FBUSxVQUFVO0lBV25COztPQUVHO0lBQ0gsSUFBVyxRQUFRO1FBQ2xCLE1BQU0sTUFBTSxHQUFvQyxFQUFFLENBQUM7UUFFbkQsS0FBSyxNQUFNLENBQUMsU0FBUyxFQUFFLFVBQVUsQ0FBQyxJQUFJLE1BQU0sQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUM7WUFDakUsSUFBSSxVQUFVLEVBQUUsS0FBSyxLQUFLLFNBQVMsRUFBRSxDQUFDO2dCQUNyQyxTQUFTO1lBQ1YsQ0FBQztZQUVELDREQUE0RDtZQUM1RCw0REFBNEQ7WUFDNUQsTUFBTSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUU7Z0JBQ3JCLENBQUMsU0FBUyxDQUFDLEVBQUUsVUFBVSxDQUFDLEtBQUs7YUFDN0IsQ0FBQyxDQUFDO1FBQ0osQ0FBQztRQUVELE9BQU8sTUFBTSxDQUFDO0lBQ2YsQ0FBQztJQUVEOzs7Ozs7T0FNRztJQUNILElBQVcsZUFBZTtRQUN6QixPQUFPLEVBQUUsR0FBRyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7SUFDekIsQ0FBQztJQVlEOzs7T0FHRztJQUNILElBQVcsV0FBVztRQUNyQixPQUFPLElBQUksQ0FBQyxNQUFNLENBQUM7SUFDcEIsQ0FBQztJQUVEOztPQUVHO0lBQ0gsSUFBVyxLQUFLO1FBQ2YsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQztJQUN6QixDQUFDO0lBRUQsWUFDaUIsS0FBd0IsRUFDeEIsVUFBa0I7UUFFbEMsS0FBSyxFQUFFLENBQUM7UUFIUSxVQUFLLEdBQUwsS0FBSyxDQUFtQjtRQUN4QixlQUFVLEdBQVYsVUFBVSxDQUFRO1FBSWxDLElBQUksQ0FBQyxNQUFNLEdBQUcsRUFBRSxDQUFDO1FBQ2pCLElBQUksQ0FBQyxJQUFJLEdBQUcsRUFBRSxDQUFDO1FBQ2YsSUFBSSxDQUFDLFdBQVcsR0FBRyxJQUFJLEdBQUcsRUFBVSxDQUFDO1FBRXJDLElBQUksQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FDM0IsSUFBSSxrQkFBa0IsQ0FDckIsWUFBWSxDQUFDLFNBQVMsQ0FBQyxDQUFDLEdBQUcsS0FBSyxDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUN4RCxDQUNELENBQUM7UUFDRixJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO1FBQzNDLElBQUksQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7SUFDOUMsQ0FBQztJQWVEOzs7T0FHRztJQUNLLE1BQU0sQ0FBQyxLQUF3QjtRQUN0QyxzREFBc0Q7UUFDdEQscURBQXFEO1FBQ3JELCtCQUErQjtRQUMvQixJQUFJLENBQUMsS0FBSyxZQUFZLGlCQUFpQixDQUFDLEtBQUssS0FBSyxFQUFFLENBQUM7WUFDcEQsNkRBQTZEO1lBQzdELElBQUksS0FBSyxZQUFZLFdBQVcsRUFBRSxDQUFDO2dCQUNsQyxPQUFPO1lBQ1IsQ0FBQztZQUVELElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUNmLElBQUksbUJBQW1CLENBQ3RCLEtBQUssQ0FBQyxLQUFLLEVBQ1gsUUFBUSxDQUNQLDRDQUE0QyxFQUM1Qyx5QkFBeUIsRUFDekIsS0FBSyxDQUFDLElBQUksQ0FDVixDQUNELENBQ0QsQ0FBQztZQUVGLE9BQU87UUFDUixDQUFDO1FBRUQsTUFBTSxVQUFVLEdBQUcsS0FBSyxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUM7UUFFeEMsOENBQThDO1FBQzlDLHlDQUF5QztRQUN6QyxJQUFJLElBQUksQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUM7WUFDdEMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQ2YsSUFBSSxxQkFBcUIsQ0FDeEIsS0FBSyxDQUFDLEtBQUssRUFDWCxRQUFRLENBQ1AscURBQXFELEVBQ3JELDJDQUEyQyxFQUMzQyxVQUFVLENBQ1YsQ0FDRCxDQUNELENBQUM7WUFFRixPQUFPO1FBQ1IsQ0FBQztRQUNELElBQUksQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBRWpDLGtEQUFrRDtRQUNsRCxnREFBZ0Q7UUFDaEQsSUFBSSx5QkFBeUIsQ0FBQyxtQkFBbUIsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQzFELE1BQU0sUUFBUSxHQUFHLElBQUkseUJBQXlCLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQztZQUV2RSxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLFFBQVEsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDO1lBQ3pDLElBQUksQ0FBQyxJQUFJLENBQUMsV0FBVyxHQUFHLFFBQVEsQ0FBQztZQUNqQyxJQUFJLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsQ0FBQztZQUNqQyxPQUFPO1FBQ1IsQ0FBQztRQUVELG9EQUFvRDtRQUNwRCxrREFBa0Q7UUFDbEQsSUFBSSxJQUFJLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDN0IsT0FBTztRQUNSLENBQUM7UUFFRCx1Q0FBdUM7UUFDdkMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQ2YsSUFBSSxxQkFBcUIsQ0FDeEIsS0FBSyxDQUFDLEtBQUssRUFDWCxRQUFRLENBQ1AsbURBQW1ELEVBQ25ELHlDQUF5QyxFQUN6QyxVQUFVLENBQ1YsQ0FDRCxDQUNELENBQUM7SUFDSCxDQUFDO0lBRUQ7O09BRUc7SUFDSyxPQUFPLENBQUMsS0FBWTtRQUMzQixJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FDZixJQUFJLG1CQUFtQixDQUN0QixJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssRUFDaEIsUUFBUSxDQUNQLHlDQUF5QyxFQUN6QyxvQ0FBb0MsRUFDcEMsS0FBSyxDQUFDLE9BQU8sQ0FDYixDQUNELENBQ0QsQ0FBQztJQUNILENBQUM7SUFFRDs7O09BR0c7SUFDSCxJQUFXLE9BQU87UUFDakIsT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQztJQUM1QixDQUFDO0lBRUQ7O09BRUc7SUFDSSxLQUFLO1FBQ1gsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUUsQ0FBQztRQUVwQixPQUFPLElBQUksQ0FBQztJQUNiLENBQUM7Q0FDRCJ9