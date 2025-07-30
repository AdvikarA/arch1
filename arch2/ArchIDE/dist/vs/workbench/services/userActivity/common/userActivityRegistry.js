/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
class UserActivityRegistry {
    constructor() {
        this.todo = [];
        this.add = (ctor) => {
            this.todo.push(ctor);
        };
    }
    take(userActivityService, instantiation) {
        this.add = ctor => instantiation.createInstance(ctor, userActivityService);
        this.todo.forEach(this.add);
        this.todo = [];
    }
}
export const userActivityRegistry = new UserActivityRegistry();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNlckFjdGl2aXR5UmVnaXN0cnkuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9hZHZpa2FyL0RvY3VtZW50cy9hcmNoaXRlY3QvYXJjaDIvQXJjaElERS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvdXNlckFjdGl2aXR5L2NvbW1vbi91c2VyQWN0aXZpdHlSZWdpc3RyeS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUtoRyxNQUFNLG9CQUFvQjtJQUExQjtRQUNTLFNBQUksR0FBZ0UsRUFBRSxDQUFDO1FBRXhFLFFBQUcsR0FBRyxDQUFDLElBQStELEVBQUUsRUFBRTtZQUNoRixJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUN0QixDQUFDLENBQUM7SUFPSCxDQUFDO0lBTE8sSUFBSSxDQUFDLG1CQUF5QyxFQUFFLGFBQW9DO1FBQzFGLElBQUksQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLEVBQUUsQ0FBQyxhQUFhLENBQUMsY0FBYyxDQUFDLElBQUksRUFBRSxtQkFBbUIsQ0FBQyxDQUFDO1FBQzNFLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUM1QixJQUFJLENBQUMsSUFBSSxHQUFHLEVBQUUsQ0FBQztJQUNoQixDQUFDO0NBQ0Q7QUFFRCxNQUFNLENBQUMsTUFBTSxvQkFBb0IsR0FBRyxJQUFJLG9CQUFvQixFQUFFLENBQUMifQ==