import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { OneDataSystemWebAppender } from '../../browser/1dsAppender.js';
class AppInsightsCoreMock {
    constructor() {
        this.pluginVersionString = 'Test Runner';
        this.events = [];
        this.IsTrackingPageView = false;
        this.exceptions = [];
    }
    track(event) {
        this.events.push(event.baseData);
    }
    unload(isAsync, unloadComplete) {
        // No-op
    }
}
suite('AIAdapter', () => {
    let appInsightsMock;
    let adapter;
    const prefix = 'prefix';
    teardown(() => {
        adapter.flush();
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    setup(() => {
        appInsightsMock = new AppInsightsCoreMock();
        adapter = new OneDataSystemWebAppender(false, prefix, undefined, () => appInsightsMock);
    });
    test('Simple event', () => {
        adapter.log('testEvent');
        assert.strictEqual(appInsightsMock.events.length, 1);
        assert.strictEqual(appInsightsMock.events[0].name, `${prefix}/testEvent`);
    });
    test('addional data', () => {
        adapter = new OneDataSystemWebAppender(false, prefix, { first: '1st', second: 2, third: true }, () => appInsightsMock);
        adapter.log('testEvent');
        assert.strictEqual(appInsightsMock.events.length, 1);
        const [first] = appInsightsMock.events;
        assert.strictEqual(first.name, `${prefix}/testEvent`);
        assert.strictEqual(first.properties['first'], '1st');
        assert.strictEqual(first.measurements['second'], 2);
        assert.strictEqual(first.measurements['third'], 1);
    });
    test('property limits', () => {
        let reallyLongPropertyName = 'abcdefghijklmnopqrstuvwxyz';
        for (let i = 0; i < 6; i++) {
            reallyLongPropertyName += 'abcdefghijklmnopqrstuvwxyz';
        }
        assert(reallyLongPropertyName.length > 150);
        let reallyLongPropertyValue = 'abcdefghijklmnopqrstuvwxyz012345678901234567890123';
        for (let i = 0; i < 400; i++) {
            reallyLongPropertyValue += 'abcdefghijklmnopqrstuvwxyz012345678901234567890123';
        }
        assert(reallyLongPropertyValue.length > 8192);
        const data = Object.create(null);
        data[reallyLongPropertyName] = '1234';
        data['reallyLongPropertyValue'] = reallyLongPropertyValue;
        adapter.log('testEvent', data);
        assert.strictEqual(appInsightsMock.events.length, 1);
        for (const prop in appInsightsMock.events[0].properties) {
            assert(prop.length < 150);
            assert(appInsightsMock.events[0].properties[prop].length < 8192);
        }
    });
    test('Different data types', () => {
        const date = new Date();
        adapter.log('testEvent', { favoriteDate: date, likeRed: false, likeBlue: true, favoriteNumber: 1, favoriteColor: 'blue', favoriteCars: ['bmw', 'audi', 'ford'] });
        assert.strictEqual(appInsightsMock.events.length, 1);
        assert.strictEqual(appInsightsMock.events[0].name, `${prefix}/testEvent`);
        assert.strictEqual(appInsightsMock.events[0].properties['favoriteColor'], 'blue');
        assert.strictEqual(appInsightsMock.events[0].measurements['likeRed'], 0);
        assert.strictEqual(appInsightsMock.events[0].measurements['likeBlue'], 1);
        assert.strictEqual(appInsightsMock.events[0].properties['favoriteDate'], date.toISOString());
        assert.strictEqual(appInsightsMock.events[0].properties['favoriteCars'], JSON.stringify(['bmw', 'audi', 'ford']));
        assert.strictEqual(appInsightsMock.events[0].measurements['favoriteNumber'], 1);
    });
    test('Nested data', () => {
        adapter.log('testEvent', {
            window: {
                title: 'some title',
                measurements: {
                    width: 100,
                    height: 200
                }
            },
            nestedObj: {
                nestedObj2: {
                    nestedObj3: {
                        testProperty: 'test',
                    }
                },
                testMeasurement: 1
            }
        });
        assert.strictEqual(appInsightsMock.events.length, 1);
        assert.strictEqual(appInsightsMock.events[0].name, `${prefix}/testEvent`);
        assert.strictEqual(appInsightsMock.events[0].properties['window.title'], 'some title');
        assert.strictEqual(appInsightsMock.events[0].measurements['window.measurements.width'], 100);
        assert.strictEqual(appInsightsMock.events[0].measurements['window.measurements.height'], 200);
        assert.strictEqual(appInsightsMock.events[0].properties['nestedObj.nestedObj2.nestedObj3'], JSON.stringify({ 'testProperty': 'test' }));
        assert.strictEqual(appInsightsMock.events[0].measurements['nestedObj.testMeasurement'], 1);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiMWRzQXBwZW5kZXIudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL2FkdmlrYXIvRG9jdW1lbnRzL2FyY2hpdGVjdC9hcmNoMi9BcmNoSURFL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3RlbGVtZXRyeS90ZXN0L2Jyb3dzZXIvMWRzQXBwZW5kZXIudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFLQSxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sdUNBQXVDLENBQUM7QUFDaEcsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFHeEUsTUFBTSxtQkFBbUI7SUFBekI7UUFDQyx3QkFBbUIsR0FBVyxhQUFhLENBQUM7UUFDckMsV0FBTSxHQUFVLEVBQUUsQ0FBQztRQUNuQix1QkFBa0IsR0FBWSxLQUFLLENBQUM7UUFDcEMsZUFBVSxHQUFVLEVBQUUsQ0FBQztJQVMvQixDQUFDO0lBUE8sS0FBSyxDQUFDLEtBQXFCO1FBQ2pDLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQztJQUNsQyxDQUFDO0lBRU0sTUFBTSxDQUFDLE9BQWdCLEVBQUUsY0FBNEQ7UUFDM0YsUUFBUTtJQUNULENBQUM7Q0FDRDtBQUVELEtBQUssQ0FBQyxXQUFXLEVBQUUsR0FBRyxFQUFFO0lBQ3ZCLElBQUksZUFBb0MsQ0FBQztJQUN6QyxJQUFJLE9BQWlDLENBQUM7SUFDdEMsTUFBTSxNQUFNLEdBQUcsUUFBUSxDQUFDO0lBR3hCLFFBQVEsQ0FBQyxHQUFHLEVBQUU7UUFDYixPQUFPLENBQUMsS0FBSyxFQUFFLENBQUM7SUFDakIsQ0FBQyxDQUFDLENBQUM7SUFFSCx1Q0FBdUMsRUFBRSxDQUFDO0lBRTFDLEtBQUssQ0FBQyxHQUFHLEVBQUU7UUFDVixlQUFlLEdBQUcsSUFBSSxtQkFBbUIsRUFBRSxDQUFDO1FBQzVD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