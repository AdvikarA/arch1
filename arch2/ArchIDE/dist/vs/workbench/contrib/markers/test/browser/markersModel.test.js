/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { URI } from '../../../../../base/common/uri.js';
import { MarkerSeverity } from '../../../../../platform/markers/common/markers.js';
import { MarkersModel, Marker, RelatedInformation } from '../../browser/markersModel.js';
import { groupBy } from '../../../../../base/common/collections.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
class TestMarkersModel extends MarkersModel {
    constructor(markers) {
        super();
        const byResource = groupBy(markers, r => r.resource.toString());
        Object.keys(byResource).forEach(key => {
            const markers = byResource[key];
            const resource = markers[0].resource;
            this.setResourceMarkers([[resource, markers]]);
        });
    }
}
suite('MarkersModel Test', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('marker ids are unique', function () {
        const marker1 = anErrorWithRange(3);
        const marker2 = anErrorWithRange(3);
        const marker3 = aWarningWithRange(3);
        const marker4 = aWarningWithRange(3);
        const testObject = new TestMarkersModel([marker1, marker2, marker3, marker4]);
        const actuals = testObject.resourceMarkers[0].markers;
        assert.notStrictEqual(actuals[0].id, actuals[1].id);
        assert.notStrictEqual(actuals[0].id, actuals[2].id);
        assert.notStrictEqual(actuals[0].id, actuals[3].id);
        assert.notStrictEqual(actuals[1].id, actuals[2].id);
        assert.notStrictEqual(actuals[1].id, actuals[3].id);
        assert.notStrictEqual(actuals[2].id, actuals[3].id);
    });
    test('sort palces resources with no errors at the end', function () {
        const marker1 = aMarker('a/res1', MarkerSeverity.Warning);
        const marker2 = aMarker('a/res2');
        const marker3 = aMarker('res4');
        const marker4 = aMarker('b/res3');
        const marker5 = aMarker('res4');
        const marker6 = aMarker('c/res2', MarkerSeverity.Info);
        const testObject = new TestMarkersModel([marker1, marker2, marker3, marker4, marker5, marker6]);
        const actuals = testObject.resourceMarkers;
        assert.strictEqual(5, actuals.length);
        assert.ok(compareResource(actuals[0], 'a/res2'));
        assert.ok(compareResource(actuals[1], 'b/res3'));
        assert.ok(compareResource(actuals[2], 'res4'));
        assert.ok(compareResource(actuals[3], 'a/res1'));
        assert.ok(compareResource(actuals[4], 'c/res2'));
    });
    test('sort resources by file path', function () {
        const marker1 = aMarker('a/res1');
        const marker2 = aMarker('a/res2');
        const marker3 = aMarker('res4');
        const marker4 = aMarker('b/res3');
        const marker5 = aMarker('res4');
        const marker6 = aMarker('c/res2');
        const testObject = new TestMarkersModel([marker1, marker2, marker3, marker4, marker5, marker6]);
        const actuals = testObject.resourceMarkers;
        assert.strictEqual(5, actuals.length);
        assert.ok(compareResource(actuals[0], 'a/res1'));
        assert.ok(compareResource(actuals[1], 'a/res2'));
        assert.ok(compareResource(actuals[2], 'b/res3'));
        assert.ok(compareResource(actuals[3], 'c/res2'));
        assert.ok(compareResource(actuals[4], 'res4'));
    });
    test('sort markers by severity, line and column', function () {
        const marker1 = aWarningWithRange(8, 1, 9, 3);
        const marker2 = aWarningWithRange(3);
        const marker3 = anErrorWithRange(8, 1, 9, 3);
        const marker4 = anIgnoreWithRange(5);
        const marker5 = anInfoWithRange(8, 1, 8, 4, 'ab');
        const marker6 = anErrorWithRange(3);
        const marker7 = anErrorWithRange(5);
        const marker8 = anInfoWithRange(5);
        const marker9 = anErrorWithRange(8, 1, 8, 4, 'ab');
        const marker10 = anErrorWithRange(10);
        const marker11 = anErrorWithRange(8, 1, 8, 4, 'ba');
        const marker12 = anIgnoreWithRange(3);
        const marker13 = aWarningWithRange(5);
        const marker14 = anErrorWithRange(4);
        const marker15 = anErrorWithRange(8, 2, 8, 4);
        const testObject = new TestMarkersModel([marker1, marker2, marker3, marker4, marker5, marker6, marker7, marker8, marker9, marker10, marker11, marker12, marker13, marker14, marker15]);
        const actuals = testObject.resourceMarkers[0].markers;
        assert.strictEqual(actuals[0].marker, marker6);
        assert.strictEqual(actuals[1].marker, marker14);
        assert.strictEqual(actuals[2].marker, marker7);
        assert.strictEqual(actuals[3].marker, marker9);
        assert.strictEqual(actuals[4].marker, marker11);
        assert.strictEqual(actuals[5].marker, marker3);
        assert.strictEqual(actuals[6].marker, marker15);
        assert.strictEqual(actuals[7].marker, marker10);
        assert.strictEqual(actuals[8].marker, marker2);
        assert.strictEqual(actuals[9].marker, marker13);
        assert.strictEqual(actuals[10].marker, marker1);
        assert.strictEqual(actuals[11].marker, marker8);
        assert.strictEqual(actuals[12].marker, marker5);
        assert.strictEqual(actuals[13].marker, marker12);
        assert.strictEqual(actuals[14].marker, marker4);
    });
    test('toString()', () => {
        let marker = aMarker('a/res1');
        marker.code = '1234';
        assert.strictEqual(JSON.stringify({ ...marker, resource: marker.resource.path }, null, '\t'), new Marker('1', marker).toString());
        marker = aMarker('a/res2', MarkerSeverity.Warning);
        assert.strictEqual(JSON.stringify({ ...marker, resource: marker.resource.path }, null, '\t'), new Marker('2', marker).toString());
        marker = aMarker('a/res2', MarkerSeverity.Info, 1, 2, 1, 8, 'Info', '');
        assert.strictEqual(JSON.stringify({ ...marker, resource: marker.resource.path }, null, '\t'), new Marker('3', marker).toString());
        marker = aMarker('a/res2', MarkerSeverity.Hint, 1, 2, 1, 8, 'Ignore message', 'Ignore');
        assert.strictEqual(JSON.stringify({ ...marker, resource: marker.resource.path }, null, '\t'), new Marker('4', marker).toString());
        marker = aMarker('a/res2', MarkerSeverity.Warning, 1, 2, 1, 8, 'Warning message', '', [{ startLineNumber: 2, startColumn: 5, endLineNumber: 2, endColumn: 10, message: 'some info', resource: URI.file('a/res3') }]);
        const testObject = new Marker('5', marker, null);
        // hack
        testObject.relatedInformation = marker.relatedInformation.map(r => new RelatedInformation('6', marker, r));
        assert.strictEqual(JSON.stringify({ ...marker, resource: marker.resource.path, relatedInformation: marker.relatedInformation.map(r => ({ ...r, resource: r.resource.path })) }, null, '\t'), testObject.toString());
    });
    test('Markers for same-document but different fragment', function () {
        const model = new TestMarkersModel([anErrorWithRange(1)]);
        assert.strictEqual(model.total, 1);
        const document = URI.parse('foo://test/path/file');
        const frag1 = URI.parse('foo://test/path/file#1');
        const frag2 = URI.parse('foo://test/path/file#two');
        model.setResourceMarkers([[document, [{ ...aMarker(), resource: frag1 }, { ...aMarker(), resource: frag2 }]]]);
        assert.strictEqual(model.total, 3);
        const a = model.getResourceMarkers(document);
        const b = model.getResourceMarkers(frag1);
        const c = model.getResourceMarkers(frag2);
        assert.ok(a === b);
        assert.ok(a === c);
        model.setResourceMarkers([[document, [{ ...aMarker(), resource: frag2 }]]]);
        assert.strictEqual(model.total, 2);
    });
    test('Problems are no sorted correctly #99135', function () {
        const model = new TestMarkersModel([]);
        assert.strictEqual(model.total, 0);
        const document = URI.parse('foo://test/path/file');
        const frag1 = URI.parse('foo://test/path/file#1');
        const frag2 = URI.parse('foo://test/path/file#2');
        model.setResourceMarkers([[frag1, [
                    { ...aMarker(), resource: frag1 },
                    { ...aMarker(undefined, MarkerSeverity.Warning), resource: frag1 },
                ]]]);
        model.setResourceMarkers([[frag2, [
                    { ...aMarker(), resource: frag2 }
                ]]]);
        assert.strictEqual(model.total, 3);
        const markers = model.getResourceMarkers(document)?.markers;
        assert.deepStrictEqual(markers?.map(m => m.marker.severity), [MarkerSeverity.Error, MarkerSeverity.Error, MarkerSeverity.Warning]);
        assert.deepStrictEqual(markers?.map(m => m.marker.resource.toString()), [frag1.toString(), frag2.toString(), frag1.toString()]);
    });
    function compareResource(a, b) {
        return a.resource.toString() === URI.file(b).toString();
    }
    function anErrorWithRange(startLineNumber = 10, startColumn = 5, endLineNumber = startLineNumber + 1, endColumn = startColumn + 5, message = 'some message') {
        return aMarker('some resource', MarkerSeverity.Error, startLineNumber, startColumn, endLineNumber, endColumn, message);
    }
    function aWarningWithRange(startLineNumber = 10, startColumn = 5, endLineNumber = startLineNumber + 1, endColumn = startColumn + 5, message = 'some message') {
        return aMarker('some resource', MarkerSeverity.Warning, startLineNumber, startColumn, endLineNumber, endColumn, message);
    }
    function anInfoWithRange(startLineNumber = 10, startColumn = 5, endLineNumber = startLineNumber + 1, endColumn = startColumn + 5, message = 'some message') {
        return aMarker('some resource', MarkerSeverity.Info, startLineNumber, startColumn, endLineNumber, endColumn, message);
    }
    function anIgnoreWithRange(startLineNumber = 10, startColumn = 5, endLineNumber = startLineNumber + 1, endColumn = startColumn + 5, message = 'some message') {
        return aMarker('some resource', MarkerSeverity.Hint, startLineNumber, startColumn, endLineNumber, endColumn, message);
    }
    function aMarker(resource = 'some resource', severity = MarkerSeverity.Error, startLineNumber = 10, startColumn = 5, endLineNumber = startLineNumber + 1, endColumn = startColumn + 5, message = 'some message', source = 'tslint', relatedInformation) {
        return {
            owner: 'someOwner',
            resource: URI.file(resource),
            severity,
            message,
            startLineNumber,
            startColumn,
            endLineNumber,
            endColumn,
            source,
            relatedInformation
        };
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFya2Vyc01vZGVsLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9hZHZpa2FyL0RvY3VtZW50cy9hcmNoaXRlY3QvYXJjaDIvQXJjaElERS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9tYXJrZXJzL3Rlc3QvYnJvd3Nlci9tYXJrZXJzTW9kZWwudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBQ3hELE9BQU8sRUFBVyxjQUFjLEVBQXVCLE1BQU0sbURBQW1ELENBQUM7QUFDakgsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLEVBQW1CLGtCQUFrQixFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFDMUcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBQ3BFLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFDO0FBRW5HLE1BQU0sZ0JBQWlCLFNBQVEsWUFBWTtJQUUxQyxZQUFZLE9BQWtCO1FBQzdCLEtBQUssRUFBRSxDQUFDO1FBRVIsTUFBTSxVQUFVLEdBQUcsT0FBTyxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQztRQUVoRSxNQUFNLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsRUFBRTtZQUNyQyxNQUFNLE9BQU8sR0FBRyxVQUFVLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDaEMsTUFBTSxRQUFRLEdBQUcsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQztZQUVyQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxDQUFDLFFBQVEsRUFBRSxPQUFPLENBQUMsQ0FB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akQsTUFBTSxDQUFDLEVBQUUsQ0FBQyxlQUFlLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFLFFBQVEsQ0FBQyxDQUFDLENBQUM7UUFDakQsTUFBTSxDQUFDLEVBQUUsQ0FBQyxlQUFlLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFLFFBQVEsQ0FBQyxDQUFDLENBQUM7UUFDakQsTUFBTSxDQUFDLEVBQUUsQ0FBQyxlQUFlLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFLFFBQVEsQ0FBQyxDQUFDLENBQUM7UUFDakQsTUFBTSxDQUFDLEVBQUUsQ0FBQyxlQUFlLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUM7SUFDaEQsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsMkNBQTJDLEVBQUU7UUFDakQsTUFBTSxPQUFPLEdBQUcsaUJBQWlCLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDOUMsTUFBTSxPQUFPLEdBQUcsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDckMsTUFBTSxPQUFPLEdBQUcsZ0JBQWdCLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDN0MsTUFBTSxPQUFPLEdBQUcsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDckMsTUFBTSxPQUFPLEdBQUcsZUFBZSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUNsRCxNQUFNLE9BQU8sR0FBRyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNwQyxNQUFNLE9BQU8sR0FBRyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNwQyxNQUFNLE9BQU8sR0FBRyxlQUFlLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDbkMsTUFBTSxPQUFPLEdBQUcsZ0JBQWdCLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQ25ELE1BQU0sUUFBUSxHQUFHLGdCQUFnQixDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQ3RDLE1BQU0sUUFBUSxHQUFHLGdCQUFnQixDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUNwRCxNQUFNLFFBQVEsR0FBRyxpQkFBaUIsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUN0QyxNQUFNLFFBQVEsR0FBRyxpQkFBaUIsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUN0QyxNQUFNLFFBQVEsR0FBRyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNyQyxNQUFNLFFBQVEsR0FBRyxnQkFBZ0IsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUM5QyxNQUFNLFVBQVUsR0FBRyxJQUFJLGdCQUFnQixDQUFDLENBQUMsT0FBTyxFQUFFLE9BQU8sRUFBRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxPQUFPLEVBQUUsUUFBUSxFQUFFLFFBQVEsRUFBRSxRQUFRLEVBQUUsUUFBUSxFQUFFLFFBQVEsRUFBRSxRQUFRLENBQUMsQ0FBQyxDQUFDO1FBRXZMLE1BQU0sT0FBTyxHQUFHLFVBQVUsQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDO1FBRXRELE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sRUFBRSxPQUFPLENBQUMsQ0FBQztRQUMvQyxNQUFNLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLEVBQUUsUUFBUSxDQUFDLENBQUM7UUFDaEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBQy9DLE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sRUFBRSxPQUFPLENBQUMsQ0FBQztRQUMvQyxNQUFNLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLEVBQUUsUUFBUSxDQUFDLENBQUM7UUFDaEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBQy9DLE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sRUFBRSxRQUFRLENBQUMsQ0FBQztRQUNoRCxNQUFNLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLEVBQUUsUUFBUSxDQUFDLENBQUM7UUFDaEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBQy9DLE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sRUFBRSxRQUFRLENBQUMsQ0FBQztRQUNoRCxNQUFNLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsQ0FBQyxNQUFNLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFDaEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLENBQUMsTUFBTSxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBQ2hELE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxDQUFDLE1BQU0sRUFBRSxPQUFPLENBQUMsQ0FBQztRQUNoRCxNQUFNLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsQ0FBQyxNQUFNLEVBQUUsUUFBUSxDQUFDLENBQUM7UUFDakQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLENBQUMsTUFBTSxFQUFFLE9BQU8sQ0FBQyxD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