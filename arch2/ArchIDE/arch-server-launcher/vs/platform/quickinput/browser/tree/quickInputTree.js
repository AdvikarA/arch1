/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export function getParentNodeState(parentChildren) {
    let containsChecks = false;
    let containsUnchecks = false;
    let containsPartial = false;
    for (const element of parentChildren) {
        switch (element.element?.checked) {
            case 'partial':
                containsPartial = true;
                break;
            case true:
                containsChecks = true;
                break;
            default:
                containsUnchecks = true;
                break;
        }
        if (containsChecks && containsUnchecks && containsPartial) {
            break;
        }
    }
    const newState = containsUnchecks
        ? containsPartial
            ? 'partial'
            : containsChecks
                ? 'partial'
                : false
        : containsPartial
            ? 'partial'
            : containsChecks;
    return newState;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicXVpY2tJbnB1dFRyZWUuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9hZHZpa2FyL0RvY3VtZW50cy9hcmNoaXRlY3QvYXJjaDIvQXJjaElERS9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9xdWlja2lucHV0L2Jyb3dzZXIvdHJlZS9xdWlja0lucHV0VHJlZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQVloRyxNQUFNLFVBQVUsa0JBQWtCLENBQUMsY0FBK0c7SUFDakosSUFBSSxjQUFjLEdBQUcsS0FBSyxDQUFDO0lBQzNCLElBQUksZ0JBQWdCLEdBQUcsS0FBSyxDQUFDO0lBQzdCLElBQUksZUFBZSxHQUFHLEtBQUssQ0FBQztJQUU1QixLQUFLLE1BQU0sT0FBTyxJQUFJLGNBQWMsRUFBRSxDQUFDO1FBQ3RDLFFBQVEsT0FBTyxDQUFDLE9BQU8sRUFBRSxPQUFPLEVBQUUsQ0FBQztZQUNsQyxLQUFLLFNBQVM7Z0JBQ2IsZUFBZSxHQUFHLElBQUksQ0FBQztnQkFDdkIsTUFBTTtZQUNQLEtBQUssSUFBSTtnQkFDUixjQUFjLEdBQUcsSUFBSSxDQUFDO2dCQUN0QixNQUFNO1lBQ1A7Z0JBQ0MsZ0JBQWdCLEdBQUcsSUFBSSxDQUFDO2dCQUN4QixNQUFNO1FBQ1IsQ0FBQztRQUNELElBQUksY0FBYyxJQUFJLGdCQUFnQixJQUFJLGVBQWUsRUFBRSxDQUFDO1lBQzNELE1BQU07UUFDUCxDQUFDO0lBQ0YsQ0FBQztJQUNELE1BQU0sUUFBUSxHQUFHLGdCQUFnQjtRQUNoQyxDQUFDLENBQUMsZUFBZTtZQUNoQixDQUFDLENBQUMsU0FBUztZQUNYLENBQUMsQ0FBQyxjQUFjO2dCQUNmLENBQUMsQ0FBQyxTQUFTO2dCQUNYLENBQUMsQ0FBQyxLQUFLO1FBQ1QsQ0FBQyxDQUFDLGVBQWU7WUFDaEIsQ0FBQyxDQUFDLFNBQVM7WUFDWCxDQUFDLENBQUMsY0FBYyxDQUFDO0lBQ25CLE9BQU8sUUFBUSxDQUFDO0FBQ2pCLENBQUMifQ==