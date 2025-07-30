/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { AbstractOneDataSystemAppender } from '../common/1dsAppender.js';
export class OneDataSystemWebAppender extends AbstractOneDataSystemAppender {
    constructor(isInternalTelemetry, eventPrefix, defaultData, iKeyOrClientFactory) {
        super(isInternalTelemetry, eventPrefix, defaultData, iKeyOrClientFactory);
        // If we cannot fetch the endpoint it means it is down and we should not send any telemetry.
        // This is most likely due to ad blockers
        fetch(this.endPointHealthUrl, { method: 'GET' }).catch(err => {
            this._aiCoreOrKey = undefined;
        });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiMWRzQXBwZW5kZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9hZHZpa2FyL0RvY3VtZW50cy9hcmNoaXRlY3QvYXJjaDIvQXJjaElERS9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS90ZWxlbWV0cnkvYnJvd3Nlci8xZHNBcHBlbmRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsNkJBQTZCLEVBQW9CLE1BQU0sMEJBQTBCLENBQUM7QUFHM0YsTUFBTSxPQUFPLHdCQUF5QixTQUFRLDZCQUE2QjtJQUMxRSxZQUNDLG1CQUE0QixFQUM1QixXQUFtQixFQUNuQixXQUEwQyxFQUMxQyxtQkFBc0Q7UUFFdEQsS0FBSyxDQUFDLG1CQUFtQixFQUFFLFdBQVcsRUFBRSxXQUFXLEVBQUUsbUJBQW1CLENBQUMsQ0FBQztRQUUxRSw0RkFBNEY7UUFDNUYseUNBQXlDO1FBQ3pDLEtBQUssQ0FBQyxJQUFJLENBQUMsaUJBQWlCLEVBQUUsRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLEVBQUU7WUFDNUQsSUFBSSxDQUFDLFlBQVksR0FBRyxTQUFTLENBQUM7UUFDL0IsQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDO0NBQ0QifQ==