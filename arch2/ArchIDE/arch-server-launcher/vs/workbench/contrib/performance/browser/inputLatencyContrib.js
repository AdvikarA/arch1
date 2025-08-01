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
import { inputLatency } from '../../../../base/browser/performance.js';
import { RunOnceScheduler } from '../../../../base/common/async.js';
import { Event } from '../../../../base/common/event.js';
import { Disposable, MutableDisposable } from '../../../../base/common/lifecycle.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
let InputLatencyContrib = class InputLatencyContrib extends Disposable {
    constructor(_editorService, _telemetryService) {
        super();
        this._editorService = _editorService;
        this._telemetryService = _telemetryService;
        this._listener = this._register(new MutableDisposable());
        // The current sampling strategy is when the active editor changes, start sampling and
        // report the results after 60 seconds. It's done this way as we don't want to sample
        // everything, just somewhat randomly, and using an interval would utilize CPU when the
        // application is inactive.
        this._scheduler = this._register(new RunOnceScheduler(() => {
            this._logSamples();
            this._setupListener();
        }, 60000));
        // Only log 1% of users selected randomly to reduce the volume of data
        if (Math.random() <= 0.01) {
            this._setupListener();
        }
    }
    _setupListener() {
        this._listener.value = Event.once(this._editorService.onDidActiveEditorChange)(() => this._scheduler.schedule());
    }
    _logSamples() {
        const measurements = inputLatency.getAndClearMeasurements();
        if (!measurements) {
            return;
        }
        this._telemetryService.publicLog2('performance.inputLatency', {
            keydown: measurements.keydown,
            input: measurements.input,
            render: measurements.render,
            total: measurements.total,
            sampleCount: measurements.sampleCount
        });
    }
};
InputLatencyContrib = __decorate([
    __param(0, IEditorService),
    __param(1, ITelemetryService)
], InputLatencyContrib);
export { InputLatencyContrib };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5wdXRMYXRlbmN5Q29udHJpYi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL2FkdmlrYXIvRG9jdW1lbnRzL2FyY2hpdGVjdC9hcmNoMi9BcmNoSURFL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3BlcmZvcm1hbmNlL2Jyb3dzZXIvaW5wdXRMYXRlbmN5Q29udHJpYi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDdkUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sa0NBQWtDLENBQUM7QUFDcEUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFDO0FBQ3pELE9BQU8sRUFBRSxVQUFVLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUNyRixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQztBQUV2RixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sa0RBQWtELENBQUM7QUFFM0UsSUFBTSxtQkFBbUIsR0FBekIsTUFBTSxtQkFBb0IsU0FBUSxVQUFVO0lBSWxELFlBQ2lCLGNBQStDLEVBQzVDLGlCQUFxRDtRQUV4RSxLQUFLLEVBQUUsQ0FBQztRQUh5QixtQkFBYyxHQUFkLGNBQWMsQ0FBZ0I7UUFDM0Isc0JBQWlCLEdBQWpCLGlCQUFpQixDQUFtQjtRQUx4RCxjQUFTLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLGlCQUFpQixFQUFFLENBQUMsQ0FBQztRQVNwRSxzRkFBc0Y7UUFDdEYscUZBQXFGO1FBQ3JGLHVGQUF1RjtRQUN2RiwyQkFBMkI7UUFDM0IsSUFBSSxDQUFDLFVBQVUsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksZ0JBQWdCLENBQUMsR0FBRyxFQUFFO1lBQzFELElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQztZQUNuQixJQUFJLENBQUMsY0FBYyxFQUFFLENBQUM7UUFDdkIsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUM7UUFHWCxzRUFBc0U7UUFDdEUsSUFBSSxJQUFJLENBQUMsTUFBTSxFQUFFLElBQUksSUFBSSxFQUFFLENBQUM7WUFDM0IsSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFDO1FBQ3ZCLENBQUM7SUFFRixDQUFDO0lBRU8sY0FBYztRQUNyQixJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsdUJBQXVCLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUM7SUFDbEgsQ0FBQztJQUVPLFdBQVc7UUFDbEIsTUFBTSxZQUFZLEdBQUcsWUFBWSxDQUFDLHVCQUF1QixFQUFFLENBQUM7UUFDNUQsSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDO1lBQ25CLE9BQU87UUFDUixDQUFDO1FBc0JELElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxVQUFVLENBQXNFLDBCQUEwQixFQUFFO1lBQ2xJLE9BQU8sRUFBRSxZQUFZLENBQUMsT0FBTztZQUM3QixLQUFLLEVBQUUsWUFBWSxDQUFDLEtBQUs7WUFDekIsTUFBTSxFQUFFLFlBQVksQ0FBQyxNQUFNO1lBQzNCLEtBQUssRUFBRSxZQUFZLENBQUMsS0FBSztZQUN6QixXQUFXLEVBQUUsWUFBWSxDQUFDLFdBQVc7U0FDckMsQ0FBQyxDQUFDO0lBQ0osQ0FBQztDQUNELENBQUE7QUFqRVksbUJBQW1CO0lBSzdCLFdBQUEsY0FBYyxDQUFBO0lBQ2QsV0FBQSxpQkFBaUIsQ0FBQTtHQU5QLG1CQUFtQixDQWlFL0IifQ==