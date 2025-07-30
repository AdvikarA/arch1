/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var TextureAtlasPage_1;
import { Disposable, toDisposable } from '../../../../base/common/lifecycle.js';
import { NKeyMap } from '../../../../base/common/map.js';
import { ILogService, LogLevel } from '../../../../platform/log/common/log.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { TextureAtlasShelfAllocator } from './textureAtlasShelfAllocator.js';
import { TextureAtlasSlabAllocator } from './textureAtlasSlabAllocator.js';
let TextureAtlasPage = class TextureAtlasPage extends Disposable {
    static { TextureAtlasPage_1 = this; }
    get version() { return this._version; }
    /**
     * The maximum number of glyphs that can be drawn to the page. This is currently a hard static
     * cap that must not be reached as it will cause the GPU buffer to overflow.
     */
    static { this.maximumGlyphCount = 5_000; }
    get usedArea() { return this._usedArea; }
    get source() { return this._canvas; }
    get glyphs() {
        return this._glyphInOrderSet.values();
    }
    constructor(textureIndex, pageSize, allocatorType, _logService, themeService) {
        super();
        this._logService = _logService;
        this._version = 0;
        this._usedArea = { left: 0, top: 0, right: 0, bottom: 0 };
        this._glyphMap = new NKeyMap();
        this._glyphInOrderSet = new Set();
        this._canvas = new OffscreenCanvas(pageSize, pageSize);
        this._colorMap = themeService.getColorTheme().tokenColorMap;
        switch (allocatorType) {
            case 'shelf':
                this._allocator = new TextureAtlasShelfAllocator(this._canvas, textureIndex);
                break;
            case 'slab':
                this._allocator = new TextureAtlasSlabAllocator(this._canvas, textureIndex);
                break;
            default:
                this._allocator = allocatorType(this._canvas, textureIndex);
                break;
        }
        // Reduce impact of a memory leak if this object is not released
        this._register(toDisposable(() => {
            this._canvas.width = 1;
            this._canvas.height = 1;
        }));
    }
    getGlyph(rasterizer, chars, tokenMetadata, decorationStyleSetId) {
        // IMPORTANT: There are intentionally no intermediate variables here to aid in runtime
        // optimization as it's a very hot function
        return this._glyphMap.get(chars, tokenMetadata, decorationStyleSetId, rasterizer.cacheKey) ?? this._createGlyph(rasterizer, chars, tokenMetadata, decorationStyleSetId);
    }
    _createGlyph(rasterizer, chars, tokenMetadata, decorationStyleSetId) {
        // Ensure the glyph can fit on the page
        if (this._glyphInOrderSet.size >= TextureAtlasPage_1.maximumGlyphCount) {
            return undefined;
        }
        // Rasterize and allocate the glyph
        const rasterizedGlyph = rasterizer.rasterizeGlyph(chars, tokenMetadata, decorationStyleSetId, this._colorMap);
        const glyph = this._allocator.allocate(rasterizedGlyph);
        // Ensure the glyph was allocated
        if (glyph === undefined) {
            // TODO: undefined here can mean the glyph was too large for a slab on the page, this
            // can lead to big problems if we don't handle it properly https://github.com/microsoft/vscode/issues/232984
            return undefined;
        }
        // Save the glyph
        this._glyphMap.set(glyph, chars, tokenMetadata, decorationStyleSetId, rasterizer.cacheKey);
        this._glyphInOrderSet.add(glyph);
        // Update page version and it's tracked used area
        this._version++;
        this._usedArea.right = Math.max(this._usedArea.right, glyph.x + glyph.w - 1);
        this._usedArea.bottom = Math.max(this._usedArea.bottom, glyph.y + glyph.h - 1);
        if (this._logService.getLevel() === LogLevel.Trace) {
            this._logService.trace('New glyph', {
                chars,
                tokenMetadata,
                decorationStyleSetId,
                rasterizedGlyph,
                glyph
            });
        }
        return glyph;
    }
    getUsagePreview() {
        return this._allocator.getUsagePreview();
    }
    getStats() {
        return this._allocator.getStats();
    }
};
TextureAtlasPage = TextureAtlasPage_1 = __decorate([
    __param(3, ILogService),
    __param(4, IThemeService)
], TextureAtlasPage);
export { TextureAtlasPage };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dHVyZUF0bGFzUGFnZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL2FkdmlrYXIvRG9jdW1lbnRzL2FyY2hpdGVjdC9hcmNoMi9BcmNoSURFL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9icm93c2VyL2dwdS9hdGxhcy90ZXh0dXJlQXRsYXNQYWdlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsVUFBVSxFQUFFLFlBQVksRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2hGLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUN6RCxPQUFPLEVBQUUsV0FBVyxFQUFFLFFBQVEsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQy9FLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUdsRixPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQztBQUM3RSxPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUlwRSxJQUFNLGdCQUFnQixHQUF0QixNQUFNLGdCQUFpQixTQUFRLFVBQVU7O0lBRy9DLElBQUksT0FBTyxLQUFhLE9BQU8sSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUM7SUFFL0M7OztPQUdHO2FBQ2Esc0JBQWlCLEdBQUcsS0FBSyxBQUFSLENBQVM7SUFHMUMsSUFBVyxRQUFRLEtBQTZCLE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUM7SUFHeEUsSUFBSSxNQUFNLEtBQXNCLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7SUFJdEQsSUFBSSxNQUFNO1FBQ1QsT0FBTyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsTUFBTSxFQUFFLENBQUM7SUFDdkMsQ0FBQztJQUtELFlBQ0MsWUFBb0IsRUFDcEIsUUFBZ0IsRUFDaEIsYUFBNEIsRUFDZixXQUF5QyxFQUN2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