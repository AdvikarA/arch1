/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { ColorZone, OverviewRulerZone, OverviewZoneManager } from '../../../common/viewModel/overviewZoneManager.js';
suite('Editor View - OverviewZoneManager', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('pixel ratio 1, dom height 600', () => {
        const LINE_COUNT = 50;
        const LINE_HEIGHT = 20;
        const manager = new OverviewZoneManager((lineNumber) => LINE_HEIGHT * lineNumber);
        manager.setDOMWidth(30);
        manager.setDOMHeight(600);
        manager.setOuterHeight(LINE_COUNT * LINE_HEIGHT);
        manager.setLineHeight(LINE_HEIGHT);
        manager.setPixelRatio(1);
        manager.setZones([
            new OverviewRulerZone(1, 1, 0, '1'),
            new OverviewRulerZone(10, 10, 0, '2'),
            new OverviewRulerZone(30, 31, 0, '3'),
            new OverviewRulerZone(50, 50, 0, '4'),
        ]);
        // one line = 12, but cap is at 6
        assert.deepStrictEqual(manager.resolveColorZones(), [
            new ColorZone(12, 24, 1), //
            new ColorZone(120, 132, 2), // 120 -> 132
            new ColorZone(360, 384, 3), // 360 -> 372 [360 -> 384]
            new ColorZone(588, 600, 4), // 588 -> 600
        ]);
    });
    test('pixel ratio 1, dom height 300', () => {
        const LINE_COUNT = 50;
        const LINE_HEIGHT = 20;
        const manager = new OverviewZoneManager((lineNumber) => LINE_HEIGHT * lineNumber);
        manager.setDOMWidth(30);
        manager.setDOMHeight(300);
        manager.setOuterHeight(LINE_COUNT * LINE_HEIGHT);
        manager.setLineHeight(LINE_HEIGHT);
        manager.setPixelRatio(1);
        manager.setZones([
            new OverviewRulerZone(1, 1, 0, '1'),
            new OverviewRulerZone(10, 10, 0, '2'),
            new OverviewRulerZone(30, 31, 0, '3'),
            new OverviewRulerZone(50, 50, 0, '4'),
        ]);
        // one line = 6, cap is at 6
        assert.deepStrictEqual(manager.resolveColorZones(), [
            new ColorZone(6, 12, 1), //
            new ColorZone(60, 66, 2), // 60 -> 66
            new ColorZone(180, 192, 3), // 180 -> 192
            new ColorZone(294, 300, 4), // 294 -> 300
        ]);
    });
    test('pixel ratio 2, dom height 300', () => {
        const LINE_COUNT = 50;
        const LINE_HEIGHT = 20;
        const manager = new OverviewZoneManager((lineNumber) => LINE_HEIGHT * lineNumber);
        manager.setDOMWidth(30);
        manager.setDOMHeight(300);
        manager.setOuterHeight(LINE_COUNT * LINE_HEIGHT);
        manager.setLineHeight(LINE_HEIGHT);
        manager.setPixelRatio(2);
        manager.setZones([
            new OverviewRulerZone(1, 1, 0, '1'),
            new OverviewRulerZone(10, 10, 0, '2'),
            new OverviewRulerZone(30, 31, 0, '3'),
            new OverviewRulerZone(50, 50, 0, '4'),
        ]);
        // one line = 6, cap is at 12
        assert.deepStrictEqual(manager.resolveColorZones(), [
            new ColorZone(12, 24, 1), //
            new ColorZone(120, 132, 2), // 120 -> 132
            new ColorZone(360, 384, 3), // 360 -> 384
            new ColorZone(588, 600, 4), // 588 -> 600
        ]);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3ZlcnZpZXdab25lTWFuYWdlci50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvYWR2aWthci9Eb2N1bWVudHMvYXJjaGl0ZWN0L2FyY2gyL0FyY2hJREUvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL3Rlc3QvY29tbW9uL3ZpZXcvb3ZlcnZpZXdab25lTWFuYWdlci50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQztBQUM1QixPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQztBQUNoRyxPQUFPLEVBQUUsU0FBUyxFQUFFLGlCQUFpQixFQUFFLG1CQUFtQixFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFFckgsS0FBSyxDQUFDLG1DQUFtQyxFQUFFLEdBQUcsRUFBRTtJQUUvQyx1Q0FBdUMsRUFBRSxDQUFDO0lBRTFDLElBQUksQ0FBQywrQkFBK0IsRUFBRSxHQUFHLEVBQUU7UUFDMUMsTUFBTSxVQUFVLEdBQUcsRUFBRSxDQUFDO1FBQ3RCLE1BQU0sV0FBVyxHQUFHLEVBQUUsQ0FBQztRQUN2QixNQUFNLE9BQU8sR0FBRyxJQUFJLG1CQUFtQixDQUFDLENBQUMsVUFBVSxFQUFFLEVBQUUsQ0FBQyxXQUFXLEdBQUcsVUFBVSxDQUFDLENBQUM7UUFDbEYsT0FBTyxDQUFDLFdBQVcsQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUN4QixPQUFPLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQzFCLE9BQU8sQ0FBQyxjQUFjLENBQUMsVUFBVSxHQUFHLFdBQVcsQ0FBQyxDQUFDO1FBQ2pELE9BQU8sQ0FBQyxhQUFhLENBQUMsV0FBVyxDQUFDLENBQUM7UUFDbkMsT0FBTyxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUV6QixPQUFPLENBQUMsUUFBUSxDQUFDO1lBQ2hCLElBQUksaUJBQWlCLENBQUMsQ0FBQyxFQUFFLENB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