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
import { sumBy } from '../../../../../base/common/arrays.js';
import { TimeoutTimer } from '../../../../../base/common/async.js';
import { onUnexpectedError } from '../../../../../base/common/errors.js';
import { Disposable, toDisposable, DisposableStore } from '../../../../../base/common/lifecycle.js';
import { runOnChange } from '../../../../../base/common/observable.js';
import { LineEdit } from '../../../../../editor/common/core/edits/lineEdit.js';
import { AnnotatedStringEdit, BaseStringEdit } from '../../../../../editor/common/core/edits/stringEdit.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { ITelemetryService } from '../../../../../platform/telemetry/common/telemetry.js';
import { ArcTracker } from './arcTracker.js';
import { createDocWithJustReason } from '../helpers/documentWithAnnotatedEdits.js';
let InlineEditArcTelemetrySender = class InlineEditArcTelemetrySender extends Disposable {
    constructor(docWithAnnotatedEdits, scmRepoBridge, _instantiationService) {
        super();
        this._instantiationService = _instantiationService;
        this._register(runOnChange(docWithAnnotatedEdits.value, (_val, _prev, changes) => {
            const edit = AnnotatedStringEdit.compose(changes.map(c => c.edit));
            if (!edit.replacements.some(r => r.data.editSource.metadata.source === 'inlineCompletionAccept')) {
                return;
            }
            if (!edit.replacements.every(r => r.data.editSource.metadata.source === 'inlineCompletionAccept')) {
                onUnexpectedError(new Error('ArcTelemetrySender: Not all edits are inline completion accept edits!'));
                return;
            }
            if (edit.replacements[0].data.editSource.metadata.source !== 'inlineCompletionAccept') {
                return;
            }
            const data = edit.replacements[0].data.editSource.metadata;
            const docWithJustReason = createDocWithJustReason(docWithAnnotatedEdits, this._store);
            const reporter = this._instantiationService.createInstance(ArcTelemetryReporter, [0, 30, 120, 300, 600, 900].map(s => s * 1000), _prev, docWithJustReason, scmRepoBridge, edit, res => {
                res.telemetryService.publicLog2('editTelemetry.reportInlineEditArc', {
                    extensionId: data.$extensionId ?? '',
                    extensionVersion: data.$extensionVersion ?? '',
                    opportunityId: data.$$requestUuid ?? 'unknown',
                    didBranchChange: res.didBranchChange ? 1 : 0,
                    timeDelayMs: res.timeDelayMs,
                    arc: res.arc,
                    originalCharCount: res.originalCharCount,
                    originalLineCount: res.originalLineCount,
                    currentLineCount: res.currentLineCount,
                    originalDeletedLineCount: res.originalDeletedLineCount,
                    currentDeletedLineCount: res.currentDeletedLineCount,
                });
            });
            this._register(toDisposable(() => {
                reporter.cancel();
            }));
        }));
    }
};
InlineEditArcTelemetrySender = __decorate([
    __param(2, IInstantiationService)
], InlineEditArcTelemetrySender);
export { InlineEditArcTelemetrySender };
let ChatArcTelemetrySender = class ChatArcTelemetrySender extends Disposable {
    constructor(docWithAnnotatedEdits, scmRepoBridge, _instantiationService) {
        super();
        this._instantiationService = _instantiationService;
        this._register(runOnChange(docWithAnnotatedEdits.value, (_val, _prev, changes) => {
            const edit = AnnotatedStringEdit.compose(changes.map(c => c.edit));
            const supportedSource = new Set(['Chat.applyEdits']);
            if (!edit.replacements.some(r => supportedSource.has(r.data.editSource.metadata.source))) {
                return;
            }
            if (!edit.replacements.every(r => supportedSource.has(r.data.editSource.metadata.source))) {
                onUnexpectedError(new Error(`ArcTelemetrySender: Not all edits are ${edit.replacements[0].data.editSource.metadata.source}!`));
                return;
            }
            const data = edit.replacements[0].data.editSource;
            const docWithJustReason = createDocWithJustReason(docWithAnnotatedEdits, this._store);
            const reporter = this._instantiationService.createInstance(ArcTelemetryReporter, [0, 60, 300].map(s => s * 1000), _prev, docWithJustReason, scmRepoBridge, edit, res => {
                res.telemetryService.publicLog2('editTelemetry.reportEditArc', {
                    sourceKeyCleaned: data.toKey(Number.MAX_SAFE_INTEGER, {
                        $extensionId: false,
                        $extensionVersion: false,
                        $$requestUuid: false,
                        $$sessionId: false,
                        $$requestId: false,
                        $modelId: false,
                    }),
                    extensionId: data.props.$extensionId,
                    extensionVersion: data.props.$extensionVersion,
                    opportunityId: data.props.$$requestUuid,
                    editSessionId: data.props.$$sessionId,
                    requestId: data.props.$$requestId,
                    modelId: data.props.$modelId,
                    didBranchChange: res.didBranchChange ? 1 : 0,
                    timeDelayMs: res.timeDelayMs,
                    arc: res.arc,
                    originalCharCount: res.originalCharCount,
                    originalLineCount: res.originalLineCount,
                    currentLineCount: res.currentLineCount,
                    originalDeletedLineCount: res.originalDeletedLineCount,
                });
            });
            this._register(toDisposable(() => {
                reporter.cancel();
            }));
        }));
    }
};
ChatArcTelemetrySender = __decorate([
    __param(2, IInstantiationService)
], ChatArcTelemetrySender);
export { ChatArcTelemetrySender };
let ArcTelemetryReporter = class ArcTelemetryReporter {
    constructor(_timesMs, _documentValueBeforeTrackedEdit, _document, 
    // _markedEdits -> document.value
    _gitRepo, _trackedEdit, _sendTelemetryEvent, _telemetryService) {
        this._timesMs = _timesMs;
        this._documentValueBeforeTrackedEdit = _documentValueBeforeTrackedEdit;
        this._document = _document;
        this._gitRepo = _gitRepo;
        this._trackedEdit = _trackedEdit;
        this._sendTelemetryEvent = _sendTelemetryEvent;
        this._telemetryService = _telemetryService;
        this._store = new DisposableStore();
        this._arcTracker = new ArcTracker(this._documentValueBeforeTrackedEdit, this._trackedEdit);
        this._store.add(runOnChange(this._document.value, (_val, _prevVal, changes) => {
            const edit = BaseStringEdit.composeOrUndefined(changes.map(c => c.edit));
            if (edit) {
                this._arcTracker.handleEdits(edit);
            }
        }));
        this._initialLineCounts = this._getLineCountInfo();
        this._initialBranchName = this._gitRepo?.headBranchNameObs.get();
        for (let i = 0; i < this._timesMs.length; i++) {
            const timeMs = this._timesMs[i];
            if (timeMs <= 0) {
                this._report(timeMs);
            }
            else {
                this._reportAfter(timeMs, i === this._timesMs.length - 1 ? () => {
                    this._store.dispose();
                } : undefined);
            }
        }
    }
    _getLineCountInfo() {
        const e = this._arcTracker.getTrackedEdit();
        const le = LineEdit.fromEdit(e, this._documentValueBeforeTrackedEdit);
        const deletedLineCount = sumBy(le.replacements, r => r.lineRange.length);
        const insertedLineCount = sumBy(le.getNewLineRanges(), r => r.length);
        return {
            deletedLineCounts: deletedLineCount,
            insertedLineCounts: insertedLineCount,
        };
    }
    _reportAfter(timeoutMs, cb) {
        const timer = new TimeoutTimer(() => {
            this._report(timeoutMs);
            timer.dispose();
            if (cb) {
                cb();
            }
        }, timeoutMs);
        this._store.add(timer);
    }
    _report(timeMs) {
        const currentBranch = this._gitRepo?.headBranchNameObs.get();
        const didBranchChange = currentBranch !== this._initialBranchName;
        const currentLineCounts = this._getLineCountInfo();
        this._sendTelemetryEvent({
            telemetryService: this._telemetryService,
            timeDelayMs: timeMs,
            didBranchChange,
            arc: this._arcTracker.getAcceptedRestrainedCharactersCount(),
            originalCharCount: this._arcTracker.getOriginalCharacterCount(),
            currentLineCount: currentLineCounts.insertedLineCounts,
            currentDeletedLineCount: currentLineCounts.deletedLineCounts,
            originalLineCount: this._initialLineCounts.insertedLineCounts,
            originalDeletedLineCount: this._initialLineCounts.deletedLineCounts,
        });
    }
    cancel() {
        this._store.dispose();
    }
};
ArcTelemetryReporter = __decorate([
    __param(6, ITelemetryService)
], ArcTelemetryReporter);
export { ArcTelemetryReporter };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXJjVGVsZW1ldHJ5U2VuZGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvYWR2aWthci9Eb2N1bWVudHMvYXJjaGl0ZWN0L2FyY2gyL0FyY2hJREUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvZWRpdFRlbGVtZXRyeS9icm93c2VyL3RlbGVtZXRyeS9hcmNUZWxlbWV0cnlTZW5kZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQzdELE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUNuRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUN6RSxPQUFPLEVBQUUsVUFBVSxFQUFFLFlBQVksRUFBRSxlQUFlLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNwRyxPQUFPLEVBQUUsV0FBVyxFQUF5QixNQUFNLDBDQUEwQyxDQUFDO0FBQzlGLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxxREFBcUQsQ0FBQztBQUMvRSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsY0FBYyxFQUFFLE1BQU0sdURBQXVELENBQUM7QUFFNUcsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0RBQStELENBQUM7QUFDdEcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sdURBQXVELENBQUM7QUFDMUYsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLGlCQUFpQixDQUFDO0FBQzdDLE9BQU8sRUFBK0MsdUJBQXVCLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQztBQUd6SCxJQUFNLDRCQUE0QixHQUFsQyxNQUFNLDRCQUE2QixTQUFRLFVBQVU7SUFDM0QsWUFDQyxxQkFBa0UsRUFDbEUsYUFBd0MsRUFDQSxxQkFBNEM7UUFFcEYsS0FBSyxFQUFFLENBQUM7UUFGZ0MsMEJBQXFCLEdBQXJCLHFC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