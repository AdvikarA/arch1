/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { BugIndicatingError } from './commonFacade/deps.js';
/**
 * Subscribes to and records changes and the last value of the given observables.
 * Don't use the key "changes", as it is reserved for the changes array!
*/
export function recordChanges(obs) {
    return {
        createChangeSummary: (_previousChangeSummary) => {
            return {
                changes: [],
            };
        },
        handleChange(ctx, changeSummary) {
            for (const key in obs) {
                if (ctx.didChange(obs[key])) {
                    changeSummary.changes.push({ key, change: ctx.change });
                }
            }
            return true;
        },
        beforeUpdate(reader, changeSummary) {
            for (const key in obs) {
                if (key === 'changes') {
                    throw new BugIndicatingError('property name "changes" is reserved for change tracking');
                }
                changeSummary[key] = obs[key].read(reader);
            }
        }
    };
}
/**
 * Subscribes to and records changes and the last value of the given observables.
 * Don't use the key "changes", as it is reserved for the changes array!
*/
export function recordChangesLazy(getObs) {
    let obs = undefined;
    return {
        createChangeSummary: (_previousChangeSummary) => {
            return {
                changes: [],
            };
        },
        handleChange(ctx, changeSummary) {
            if (!obs) {
                obs = getObs();
            }
            for (const key in obs) {
                if (ctx.didChange(obs[key])) {
                    changeSummary.changes.push({ key, change: ctx.change });
                }
            }
            return true;
        },
        beforeUpdate(reader, changeSummary) {
            if (!obs) {
                obs = getObs();
            }
            for (const key in obs) {
                if (key === 'changes') {
                    throw new BugIndicatingError('property name "changes" is reserved for change tracking');
                }
                changeSummary[key] = obs[key].read(reader);
            }
        }
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhbmdlVHJhY2tlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL2FkdmlrYXIvRG9jdW1lbnRzL2FyY2hpdGVjdC9hcmNoMi9BcmNoSURFL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvY29tbW9uL29ic2VydmFibGVJbnRlcm5hbC9jaGFuZ2VUcmFja2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHdCQUF3QixDQUFDO0FBbUI1RDs7O0VBR0U7QUFDRixNQUFNLFVBQVUsYUFBYSxDQUE0RCxHQUFTO0lBR2pHLE9BQU87UUFDTixtQkFBbUIsRUFBRSxDQUFDLHNCQUFzQixFQUFFLEVBQUU7WUFDL0MsT0FBTztnQkFDTixPQUFPLEVBQUUsRUFBRTthQUNKLENBQUM7UUFDVixDQUFDO1FBQ0QsWUFBWSxDQUFDLEdBQUcsRUFBRSxhQUFhO1lBQzlCLEtBQUssTUFBTSxHQUFHLElBQUksR0FBRyxFQUFFLENBQUM7Z0JBQ3ZCLElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDO29CQUM1QixhQUFhLENBQUMsT0FBZSxDQUFDLElBQUksQ0FBQyxFQUFFLEdBQUcsRUFBRSxNQUFNLEVBQUUsR0FBRyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUM7Z0JBQ2xFLENBQUM7WUFDRixDQUFDO1lBQ0QsT0FBTyxJQUFJLENBQUM7UUFDYixDQUFDO1FBQ0QsWUFBWSxDQUFDLE1BQU0sRUFBRSxhQUFhO1lBQ2pDLEtBQUssTUFBTSxHQUFHLElBQUksR0FBRyxFQUFFLENBQUM7Z0JBQ3ZCLElBQUksR0FBRyxLQUFLLFNBQVMsRUFBRSxDQUFDO29CQUN2QixNQUFNLElBQUksa0JBQWtCLENBQUMseURBQXlELENBQUMsQ0FBQztnQkFDekYsQ0FBQztnQkFDRCxhQUFhLENBQUMsR0FBRyxDQUFDLEdBQUcsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUM1QyxDQUFDO1FBQ0YsQ0FBQztLQUNELENBQUM7QUFDSCxDQUFDO0FBRUQ7OztFQUdFO0FBQ0YsTUFBTSxVQUFVLGlCQUFpQixDQUE0RCxNQUFrQjtJQUc5RyxJQUFJLEdBQUcsR0FBcUIsU0FBUyxDQUFDO0lBQ3RDLE9BQU87UUFDTixtQkFBbUIsRUFBRSxDQUFDLHNCQUFzQixFQUFFLEVBQUU7WUFDL0MsT0FBTztnQkFDTixPQUFPLEVBQUUsRUFBRTthQUNKLENBQUM7UUFDVixDQUFDO1FBQ0QsWUFBWSxDQUFDLEdBQUcsRUFBRSxhQUFhO1lBQzlCLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQztnQkFDVixHQUFHLEdBQUcsTUFBTSxFQUFFLENBQUM7WUFDaEIsQ0FBQztZQUNELEtBQUssTUFBTSxHQUFHLElBQUksR0FBRyxFQUFFLENBQUM7Z0JBQ3ZCLElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDO29CQUM1QixhQUFhLENBQUMsT0FBZSxDQUFDLElBQUksQ0FBQyxFQUFFLEdBQUcsRUFBRSxNQUFNLEVBQUUsR0FBRyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUM7Z0JBQ2xFLENBQUM7WUFDRixDQUFDO1lBQ0QsT0FBTyxJQUFJLENBQUM7UUFDYixDQUFDO1FBQ0QsWUFBWSxDQUFDLE1BQU0sRUFBRSxhQUFhO1lBQ2pDLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQztnQkFDVixHQUFHLEdBQUcsTUFBTSxFQUFFLENBQUM7WUFDaEIsQ0FBQztZQUNELEtBQUssTUFBTSxHQUFHLElBQUksR0FBRyxFQUFFLENBQUM7Z0JBQ3ZCLElBQUksR0FBRyxLQUFLLFNBQVMsRUFBRSxDQUFDO29CQUN2QixNQUFNLElBQUksa0JBQWtCLENBQUMseURBQXlELENBQUMsQ0FBQztnQkFDekYsQ0FBQztnQkFDRCxhQUFhLENBQUMsR0FBRyxDQUFDLEdBQUcsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUM1QyxDQUFDO1FBQ0YsQ0FBQztLQUNELENBQUM7QUFDSCxDQUFDIn0=