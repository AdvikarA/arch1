/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { PartialFrontMatterArray } from './frontMatterArray.js';
import { PartialFrontMatterRecord } from './frontMatterRecord/frontMatterRecord.js';
import { PartialFrontMatterRecordName } from './frontMatterRecord/frontMatterRecordName.js';
import { PartialFrontMatterRecordNameWithDelimiter } from './frontMatterRecord/frontMatterRecordNameWithDelimiter.js';
import { PartialFrontMatterSequence } from './frontMatterSequence.js';
import { PartialFrontMatterString } from './frontMatterString.js';
import { PartialFrontMatterValue } from './frontMatterValue.js';
export class FrontMatterParserFactory {
    createRecord(tokens) {
        return new PartialFrontMatterRecord(this, tokens);
    }
    createRecordName(startToken) {
        return new PartialFrontMatterRecordName(this, startToken);
    }
    createRecordNameWithDelimiter(tokens) {
        return new PartialFrontMatterRecordNameWithDelimiter(this, tokens);
    }
    createArray(startToken) {
        return new PartialFrontMatterArray(this, startToken);
    }
    createValue(shouldStop) {
        return new PartialFrontMatterValue(this, shouldStop);
    }
    createString(startToken) {
        return new PartialFrontMatterString(startToken);
    }
    createSequence(shouldStop) {
        return new PartialFrontMatterSequence(shouldStop);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZnJvbnRNYXR0ZXJQYXJzZXJGYWN0b3J5LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvYWR2aWthci9Eb2N1bWVudHMvYXJjaGl0ZWN0L2FyY2gyL0FyY2hJREUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9jb21tb24vcHJvbXB0U3ludGF4L2NvZGVjcy9iYXNlL2Zyb250TWF0dGVyQ29kZWMvcGFyc2Vycy9mcm9udE1hdHRlclBhcnNlckZhY3RvcnkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFPaEcsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFDaEUsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sMENBQTBDLENBQUM7QUFDcEYsT0FBTyxFQUFFLDRCQUE0QixFQUFFLE1BQU0sOENBQThDLENBQUM7QUFDNUYsT0FBTyxFQUFFLHlDQUF5QyxFQUFrQixNQUFNLDJEQUEyRCxDQUFDO0FBQ3RJLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLDBCQUEwQixDQUFDO0FBQ3RFLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLHdCQUF3QixDQUFDO0FBQ2xFLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBRWhFLE1BQU0sT0FBTyx3QkFBd0I7SUFDcEMsWUFBWSxDQUFDLE1BQTJEO1FBQ3ZFLE9BQU8sSUFBSSx3QkFBd0IsQ0FBQyxJQUFJLEVBQUUsTUFBTSxDQUFDLENBQUM7SUFDbkQsQ0FBQztJQUNELGdCQUFnQixDQUFDLFVBQWdCO1FBQ2hDLE9BQU8sSUFBSSw0QkFBNEIsQ0FBQyxJQUFJLEVBQUUsVUFBVSxDQUFDLENBQUM7SUFDM0QsQ0FBQztJQUNELDZCQUE2QixDQUFDLE1BQXdEO1FBQ3JGLE9BQU8sSUFBSSx5Q0FBeUMsQ0FBQyxJQUFJLEVBQUUsTUFBTSxDQUFDLENBQUM7SUFDcEUsQ0FBQztJQUNELFdBQVcsQ0FBQyxVQUF1QjtRQUNsQyxPQUFPLElBQUksdUJBQXVCLENBQUMsSUFBSSxFQUFFLFVBQVUsQ0FBQyxDQUFDO0lBQ3RELENBQUM7SUFDRCxXQUFXLENBQUMsVUFBeUM7UUFDcEQsT0FBTyxJQUFJLHVCQUF1QixDQUFDLElBQUksRUFBRSxVQUFVLENBQUMsQ0FBQztJQUN0RCxDQUFDO0lBQ0QsWUFBWSxDQUFDLFVBQXVCO1FBQ25DLE9BQU8sSUFBSSx3QkFBd0IsQ0FBQyxVQUFVLENBQUMsQ0FBQztJQUNqRCxDQUFDO0lBQ0QsY0FBYyxDQUFDLFVBQXlDO1FBQ3ZELE9BQU8sSUFBSSwwQkFBMEIsQ0FBQyxVQUFVLENBQUMsQ0FBQztJQUNuRCxDQUFDO0NBQ0QifQ==