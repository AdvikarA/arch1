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
var NotebookOutputEditor_1;
import * as DOM from '../../../../../base/browser/dom.js';
import * as nls from '../../../../../nls.js';
import { Emitter } from '../../../../../base/common/event.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { Schemas } from '../../../../../base/common/network.js';
import { URI } from '../../../../../base/common/uri.js';
import { generateUuid } from '../../../../../base/common/uuid.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { IStorageService } from '../../../../../platform/storage/common/storage.js';
import { ITelemetryService } from '../../../../../platform/telemetry/common/telemetry.js';
import { IThemeService } from '../../../../../platform/theme/common/themeService.js';
import { IUriIdentityService } from '../../../../../platform/uriIdentity/common/uriIdentity.js';
import { EditorPane } from '../../../../browser/parts/editor/editorPane.js';
import { registerWorkbenchContribution2 } from '../../../../common/contributions.js';
import { IEditorResolverService, RegisteredEditorPriority } from '../../../../services/editor/common/editorResolverService.js';
import { CellUri, NOTEBOOK_OUTPUT_EDITOR_ID } from '../../common/notebookCommon.js';
import { INotebookService } from '../../common/notebookService.js';
import { getDefaultNotebookCreationOptions } from '../notebookEditorWidget.js';
import { NotebookOptions } from '../notebookOptions.js';
import { BackLayerWebView } from '../view/renderers/backLayerWebView.js';
import { NotebookOutputEditorInput } from './notebookOutputEditorInput.js';
import { BareFontInfo } from '../../../../../editor/common/config/fontInfo.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { FontMeasurements } from '../../../../../editor/browser/config/fontMeasurements.js';
import { PixelRatio } from '../../../../../base/browser/pixelRatio.js';
import { NotebookViewModel } from '../viewModel/notebookViewModelImpl.js';
import { NotebookEventDispatcher } from '../viewModel/eventDispatcher.js';
import { ViewContext } from '../viewModel/viewContext.js';
export class NoopCellEditorOptions extends Disposable {
    static { this.fixedEditorOptions = {
        scrollBeyondLastLine: false,
        scrollbar: {
            verticalScrollbarSize: 14,
            horizontal: 'auto',
            useShadows: true,
            verticalHasArrows: false,
            horizontalHasArrows: false,
            alwaysConsumeMouseWheel: false
        },
        renderLineHighlightOnlyWhenFocus: true,
        overviewRulerLanes: 0,
        lineDecorationsWidth: 0,
        folding: true,
        fixedOverflowWidgets: true,
        minimap: { enabled: false },
        renderValidationDecorations: 'on',
        lineNumbersMinChars: 3
    }; }
    get value() {
        return this._value;
    }
    constructor() {
        super();
        this._onDidChange = this._register(new Emitter());
        this.onDidChange = this._onDidChange.event;
        this._value = Object.freeze({
            ...NoopCellEditorOptions.fixedEditorOptions,
            padding: { top: 12, bottom: 12 },
            readOnly: true
        });
    }
}
let NotebookOutputEditor = class NotebookOutputEditor extends EditorPane {
    static { NotebookOutputEditor_1 = this; }
    static { this.ID = NOTEBOOK_OUTPUT_EDITOR_ID; }
    get isDisposed() {
        return this._isDisposed;
    }
    constructor(group, instantiationService, themeService, telemetryService, storageService, configurationService, notebookService) {
        super(NotebookOutputEditor_1.ID, group, telemetryService, themeService, storageService);
        this.instantiationService = instantiationService;
        this.configurationService = configurationService;
        this.notebookService = notebookService;
        this.creationOptions = getDefaultNotebookCreationOptions();
        this._outputWebview = null;
        this._isDisposed = false;
        this._notebookOptions = this.instantiationService.createInstance(NotebookOptions, this.window, false, undefined);
        this._register(this._notebookOptions);
    }
    createEditor(parent) {
        this._rootElement = DOM.append(parent, DOM.$('.notebook-output-editor'));
    }
    get fontInfo() {
        if (!this._fontInfo) {
            this._fontInfo = this.createFontInfo();
        }
        return this._fontInfo;
    }
    createFontInfo() {
        const editorOptions = this.configurationService.getValue('editor');
        return FontMeasurements.readFontInfo(this.window, BareFontInfo.createFromRawSettings(editorOptions, PixelRatio.getInstance(this.window).value));
    }
    async _createOriginalWebview(id, viewType, resource) {
        this._outputWebview?.dispose();
        this._outputWebview = this.instantiationService.createInstance(BackLayerWebView, this, id, viewType, resource, {
            ...this._notebookOptions.computeDiffWebviewOptions(),
            fontFamily: this._generateFontFamily()
        }, undefined);
        // attach the webview container to the DOM tree first
        DOM.append(this._rootElement, this._outputWebview.element);
        this._outputWebview.createWebview(this.window);
        this._outputWebview.element.style.width = `calc(100% - 16px)`;
        this._outputWebview.element.style.left = `16px`;
    }
    _generateFontFamily() {
        return this.fontInfo.fontFamily ?? `"SF Mono", Monaco, Menlo, Consolas, "Ubuntu Mono", "Liberation Mono", "DejaVu Sans Mono", "Courier New", monospace`;
    }
    getTitle() {
        if (this.input) {
            return this.input.getName();
        }
        return nls.localize('notebookOutputEditor', "Notebook Output Editor");
    }
    async setInput(input, options, context, token) {
        await super.setInput(input, options, context, token);
        const model = await input.resolve();
        if (!model) {
            throw new Error('Invalid notebook output editor input');
        }
        const resolvedNotebookEditorModel = model.resolvedNotebookEditorModel;
        await this._createOriginalWebview(generateUuid(), resolvedNotebookEditorModel.viewType, URI.from({ scheme: Schemas.vscodeNotebookCellOutput, path: '', query: 'openIn=notebookOutputEditor' }));
        const notebookTextModel = resolvedNotebookEditorModel.notebook;
        const eventDispatcher = this._register(new NotebookEventDispatcher());
        const editorOptions = this._register(new NoopCellEditorOptions());
        const viewContext = new ViewContext(this._notebookOptions, eventDispatcher, _language => editorOptions);
        this._notebookViewModel = this.instantiationService.createInstance(NotebookViewModel, notebookTextModel.viewType, notebookTextModel, viewContext, null, { isReadOnly: true });
        const cellViewModel = this._notebookViewModel.getCellByHandle(model.cell.handle);
        if (!cellViewModel) {
            throw new Error('Invalid NotebookOutputEditorInput, no matching cell view model');
        }
        const cellOutputViewModel = cellViewModel.outputsViewModels.find(outputViewModel => outputViewModel.model.outputId === model.outputId);
        if (!cellOutputViewModel) {
            throw new Error('Invalid NotebookOutputEditorInput, no matching cell output view model');
        }
        let result = undefined;
        const [mimeTypes, pick] = cellOutputViewModel.resolveMimeTypes(notebookTextModel, undefined);
        const pickedMimeTypeRenderer = cellOutputViewModel.pickedMimeType || mimeTypes[pick];
        if (mimeTypes.length !== 0) {
            const renderer = this.notebookService.getRendererInfo(pickedMimeTypeRenderer.rendererId);
            result = renderer
                ? { type: 1 /* RenderOutputType.Extension */, renderer, source: cellOutputViewModel, mimeType: pickedMimeTypeRenderer.mimeType }
                : this._renderMissingRenderer(cellOutputViewModel, pickedMimeTypeRenderer.mimeType);
        }
        if (!result) {
            throw new Error('No InsetRenderInfo for output');
        }
        const cellInfo = {
            cellId: cellViewModel.id,
            cellHandle: model.cell.handle,
            cellUri: model.cell.uri,
        };
        this._outputWebview?.createOutput(cellInfo, result, 0, 0);
    }
    _renderMissingRenderer(viewModel, preferredMimeType) {
        if (!viewModel.model.outputs.length) {
            return this._renderMessage(viewModel, nls.localize('empty', "Cell has no output"));
        }
        if (!preferredMimeType) {
            const mimeTypes = viewModel.model.outputs.map(op => op.mime);
            const mimeTypesMessage = mimeTypes.join(', ');
            return this._renderMessage(viewModel, nls.localize('noRenderer.2', "No renderer could be found for output. It has the following mimetypes: {0}", mimeTypesMessage));
        }
        return this._renderSearchForMimetype(viewModel, preferredMimeType);
    }
    _renderMessage(viewModel, message) {
        const el = DOM.$('p', undefined, message);
        return { type: 0 /* RenderOutputType.Html */, source: viewModel, htmlContent: el.outerHTML };
    }
    _renderSearchForMimetype(viewModel, mimeType) {
        const query = `@tag:notebookRenderer ${mimeType}`;
        const p = DOM.$('p', undefined, `No renderer could be found for mimetype "${mimeType}", but one might be available on the Marketplace.`);
        const a = DOM.$('a', { href: `command:workbench.extensions.search?%22${query}%22`, class: 'monaco-button monaco-text-button', tabindex: 0, role: 'button', style: 'padding: 8px; text-decoration: none; color: rgb(255, 255, 255); background-color: rgb(14, 99, 156); max-width: 200px;' }, `Search Marketplace`);
        return {
            type: 0 /* RenderOutputType.Html */,
            source: viewModel,
            htmlContent: p.outerHTML + a.outerHTML,
        };
    }
    scheduleOutputHeightAck(cellInfo, outputId, height) {
        DOM.scheduleAtNextAnimationFrame(this.window, () => {
            this._outputWebview?.ackHeight([{ cellId: cellInfo.cellId, outputId, height }]);
        }, 10);
    }
    async focusNotebookCell(cell, focus) {
    }
    async focusNextNotebookCell(cell, focus) {
    }
    toggleNotebookCellSelection(cell) {
        throw new Error('Not implemented.');
    }
    getCellById(cellId) {
        throw new Error('Not implemented');
    }
    getCellByInfo(cellInfo) {
        return this._notebookViewModel?.getCellByHandle(cellInfo.cellHandle);
    }
    layout(dimension, position) {
    }
    setScrollTop(scrollTop) {
    }
    triggerScroll(event) {
    }
    getOutputRenderer() {
    }
    updateOutputHeight(cellInfo, output, height, isInit, source) {
    }
    updateMarkupCellHeight(cellId, height, isInit) {
    }
    setMarkupCellEditState(cellId, editState) {
    }
    didResizeOutput(cellId) {
    }
    didStartDragMarkupCell(cellId, event) {
    }
    didDragMarkupCell(cellId, event) {
    }
    didDropMarkupCell(cellId, event) {
    }
    didEndDragMarkupCell(cellId) {
    }
    updatePerformanceMetadata(cellId, executionId, duration, rendererId) {
    }
    didFocusOutputInputChange(inputFocused) {
    }
    dispose() {
        this._isDisposed = true;
        super.dispose();
    }
};
NotebookOutputEditor = NotebookOutputEditor_1 = __decorate([
    __param(1, IInstantiationService),
    __param(2, IThemeService),
    __param(3, ITelemetryService),
    __param(4, IStorageService),
    __param(5, IConfigurationService),
    __param(6, INotebookService)
], NotebookOutputEditor);
export { NotebookOutputEditor };
let NotebookOutputEditorContribution = class NotebookOutputEditorContribution {
    static { this.ID = 'workbench.contribution.notebookOutputEditorContribution'; }
    constructor(editorResolverService, instantiationService, uriIdentityService) {
        this.instantiationService = instantiationService;
        this.uriIdentityService = uriIdentityService;
        editorResolverService.registerEditor(`${Schemas.vscodeNotebookCellOutput}:/**`, {
            id: 'notebookOutputEditor',
            label: 'Notebook Output Editor',
            priority: RegisteredEditorPriority.default
        }, {
            canSupportResource: (resource) => {
                if (resource.scheme === Schemas.vscodeNotebookCellOutput) {
                    const params = new URLSearchParams(resource.query);
                    return params.get('openIn') === 'notebookOutputEditor';
                }
                return false;
            }
        }, {
            createEditorInput: async ({ resource, options }) => {
                const outputUriData = CellUri.parseCellOutputUri(resource);
                if (!outputUriData || !outputUriData.notebook || outputUriData.cellIndex === undefined || outputUriData.outputIndex === undefined || !outputUriData.outputId) {
                    throw new Error('Invalid output uri for notebook output editor');
                }
                const notebookUri = this.uriIdentityService.asCanonicalUri(outputUriData.notebook);
                const cellIndex = outputUriData.cellIndex;
                const outputId = outputUriData.outputId;
                const outputIndex = outputUriData.outputIndex;
                const editorInput = this.instantiationService.createInstance(NotebookOutputEditorInput, notebookUri, cellIndex, outputId, outputIndex);
                return {
                    editor: editorInput,
                    options: options
                };
            }
        });
    }
};
NotebookOutputEditorContribution = __decorate([
    __param(0, IEditorResolverService),
    __param(1, IInstantiationService),
    __param(2, IUriIdentityService)
], NotebookOutputEditorContribution);
export { NotebookOutputEditorContribution };
registerWorkbenchContribution2(NotebookOutputEditorContribution.ID, NotebookOutputEditorContribution, 2 /* WorkbenchPhase.BlockRestore */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tPdXRwdXRFZGl0b3IuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9hZHZpa2FyL0RvY3VtZW50cy9hcmNoaXRlY3QvYXJjaDIvQXJjaElERS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9ub3RlYm9vay9icm93c2VyL291dHB1dEVkaXRvci9ub3RlYm9va091dHB1dEVkaXRvci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQ0FBb0MsQ0FBQztBQUMxRCxPQUFPLEtBQUssR0FBRyxNQUFNLHVCQUF1QixDQUFDO0FBRTdDLE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSxxQ0FBcUMsQ0FBQztBQUNyRSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDckUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQ2hFLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUN4RCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFFbEUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0RBQStELENBQUM7QUFDdEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLG1EQUFtRCxDQUFDO0FBQ3BGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHVEQUF1RCxDQUFDO0FBQzFGLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUNyRixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSwyREFBMkQsQ0FBQztBQUNoRyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDNUUsT0FBTyxFQUEwQiw4QkFBOEIsRUFBa0IsTUFBTSxxQ0FBcUMsQ0FBQztBQUc3SCxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSw2REFBNkQsQ0FBQztBQUMvSCxPQUFPLEVBQUUsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDcEYsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFFbkUsT0FBTyxFQUFFLGlDQUFpQyxFQUFFLE1BQU0sNEJBQTRCLENBQUM7QUFDL0UsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBQ3hELE9BQU8sRUFBRSxnQkFBZ0IsRUFBK0IsTUFBTSx1Q0FBdUMsQ0FBQztBQUN0RyxPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQztBQUMzRSxPQUFPLEVBQUUsWUFBWSxFQUFZLE1BQU0saURBQWlELENBQUM7QUFDekYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0RBQStELENBQUM7QUFFdEcsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sMERBQTBELENBQUM7QUFDNUYsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLDJDQUEyQyxDQUFDO0FBQ3ZFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHVDQUF1QyxDQUFDO0FBQzFFLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLGlDQUFpQyxDQUFDO0FBQzFFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQztBQUUxRCxNQUFNLE9BQU8scUJBQXNCLFNBQVEsVUFBVTthQUNyQyx1QkFBa0IsR0FBdUI7UUFDdkQsb0JBQW9CLEVBQUUsS0FBSztRQUMzQixTQUFTLEVBQUU7WUFDVixxQkFBcUIsRUFBRSxFQUFFO1lBQ3pCLFVBQVUsRUFBRSxNQUFNO1lBQ2xCLFVBQVUsRUFBRSxJQUFJO1lBQ2hCLGlCQUFpQixFQUFFLEtBQUs7WUFDeEIsbUJBQW1CLEVBQUUsS0FBSztZQUMxQix1QkFBdUIsRUFBRSxLQUFLO1NBQzlCO1FBQ0QsZ0NBQWdDLEVBQUUsSUFBSTtRQUN0QyxrQkFBa0IsRUFBRSxDQUFDO1FBQ3JCLG9CQUFvQixFQUFFLENBQUM7UUFDdkIsT0FBTyxFQUFFLElBQUk7UUFDYixvQkFBb0IsRUFBRSxJQUFJO1FBQzFCLE9BQU8sRUFBRSxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUU7UUFDM0IsMkJBQTJCLEVBQUUsSUFBSTtRQUNqQyxtQkFBbUIsRUFBRSxDQUFDO0tBQ3RCLEFBbEJnQyxDQWtCL0I7SUFNRixJQUFJLEtBQUs7UUFDUixPQUFPLElBQUksQ0FBQyxNQUFNLENBQUM7SUFDcEIsQ0FBQztJQUVEO1FBQ0MsS0FBSyxFQUFFLENBQUM7UUFUUSxpQkFBWSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLEVBQVEsQ0FBQyxDQUFDO1FBQzNELGdCQUFXLEdBQWdCLElBQUksQ0FBQyxZQUFZLENBQUMsS0FBSyxDQUFDO1FBUzNELElBQUksQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQztZQUMzQixHQUFHLHFCQUFxQixDQUFDLGtCQUFrQjtZQUMzQyxPQUFPLEVBQUUsRUFBRSxHQUFHLEVBQUUsRUFBRSxFQUFFLE1BQU0sRUFBRSxFQUFFLEVBQUU7WUFDaEMsUUFBUSxFQUFFLElBQUk7U0FDZCxDQUFDLENBQUM7SUFDSixDQUFDOztBQUdLLElBQU0sb0JBQW9CLEdBQTFCLE1BQU0sb0JBQXFCLFNBQVEsVUFBVTs7YUFFbkMsT0FBRSxHQUFXLHlCQUF5QixBQUFwQyxDQUFxQztJQWF2RCxJQUFJLFVBQVU7UUFDYixPQUFPLElBQUksQ0FBQyxXQUFXLENBQUM7SUFDekIsQ0FBQztJQUVELFlBQ0MsS0FBbUIsRUFDSSxvQkFBNEQsRUFDcEUsWUFBMkIsRUFDdkIsZ0JBQW1DLEVBQ3JDLGNBQStCLEVBQ3pCLG9CQUE0RCxFQUNqRSxlQUFrRDtRQUdwRSxLQUFLLENBQUMsc0JBQW9CLENBQUMsRUFBRSxFQUFFLEtBQUssRUFBRSxnQkFBZ0IsRUFBRSxZQUFZLEVBQUUsY0FBYyxDQUFDLENBQUM7UUFSOUMseUJBQW9CLEdBQXBCLG9CQUFvQixDQUF1QjtRQUkzQyx5QkFBb0IsR0FBcEIsb0JBQW9CLENBQXVCO1FBQ2hELG9CQUFlLEdBQWYsZUFBZSxDQUFrQjtRQXRCckUsb0JBQWUsR0FBbUMsaUNBQWlDLEVBQUUsQ0FBQztRQUc5RSxtQkFBYyxHQUE2QyxJQUFJLENBQUM7UUFPaEUsZ0JBQVcsR0FBWSxLQUFLLENBQUM7UUFnQnBDLElBQUksQ0FBQyxnQkFBZ0IsR0FBRyxJQUFJLENBQUMsb0JBQW9CLENBQUMsY0FBYyxDQUFDLGVBQWUsRUFBRSxJQUFJLENBQUMsTUFBTSxFQUFFLEtBQUssRUFBRSxTQUFTLENBQUMsQ0FBQztRQUNqSCxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO0lBQ3ZDLENBQUM7SUFFUyxZQUFZLENBQUMsTUFBbUI7UUFDekMsSUFBSSxDQUFDLFlBQVksR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDLE1BQU0sRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDLHlCQUF5QixDQUFDLENBQUMsQ0FBQztJQUMxRSxDQUFDO0lBRUQsSUFBWSxRQUFRO1FBQ25CLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUM7WUFDckIsSUFBSSxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUMsY0FBYyxFQUFFLENBQUM7UUFDeEMsQ0FBQztRQUVELE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQztJQUN2QixDQUFDO0lBRU8sY0FBYztRQUNyQixNQUFNLGFBQWEsR0FBRyxJQUFJLENBQUMsb0JBQW9CLENBQUMsUUFBUSxDQUFxQixRQUFRLENBQUMsQ0FBQztRQUN2RixPQUFPLGdCQUFnQixDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLFlBQVksQ0FBQyxxQkFBcUIsQ0FBQyxhQUFhLEVBQUUsVUFBVSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztJQUNqSixDQUFDO0lBRU8sS0FBSyxDQUFDLHNCQUFzQixDQUFDLEVBQVUsRUFBRSxRQUFnQixFQUFFLFFBQWE7UUFDL0UsSUFBSSxDQUFDLGNBQWMsRUFBRSxPQUFPLEVBQUUsQ0FBQztRQUUvQixJQUFJLENBQUMsY0FBYyxHQUFHLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsZ0JBQWdCLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBRSxRQUFRLEVBQUUsUUFBUSxFQUFFO1lBQzlHLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixDQUFDLHlCQUF5QixFQUFFO1lBQ3BELFVBQVUsRUFBRSxJQUFJLENBQUMsbUJBQW1CLEVBQUU7U0FDdEMsRUFBRSxTQUFTLENBQXNDLENBQUM7UUFFbkQscURBQXFEO1FBQ3JELEdBQUcsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFlBQVksRUFBRSxJQUFJLENBQUMsY0FBYyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBRTNELElBQUksQ0FBQyxjQUFjLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUMvQyxJQUFJLENBQUMsY0FBYyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsS0FBSyxHQUFHLG1CQUFtQixDQUFDO1FBQzlELElBQUksQ0FBQyxjQUFjLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxJQUFJLEdBQUcsTUFBTSxDQUFDO0lBRWpELENBQUM7SUFFTyxtQkFBbUI7UUFDMUIsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDLFVBQVUsSUFBSSxvSEFBb0gsQ0FBQztJQUN6SixDQUFDO0lBRVEsUUFBUTtRQUNoQixJQUFJLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUNoQixPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDN0IsQ0FBQztRQUVELE9BQU8sR0FBRyxDQUFDLFFBQVEsQ0FBQyxzQkFBc0IsRUFBRSx3QkFBd0IsQ0FBQyxDQUFDO0lBQ3ZFLENBQUM7SUFFUSxLQUFLLENBQUMsUUFBUSxDQUFDLEtBQWdDLEVBQUUsT0FBbUMsRUFBRSxPQUEyQixFQUFFLEtBQXdCO1FBQ25KLE1BQU0sS0FBSyxDQUFDLFFBQVEsQ0FBQyxLQUFLLEVBQUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLENBQUMsQ0FBQztRQUVyRCxNQUFNLEtBQUssR0FBRyxNQUFNLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUNwQyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7WUFDWixNQUFNLElBQUksS0FBSyxDQUFDLHNDQUFzQyxDQUFDLENBQUM7UUFDekQsQ0FBQztRQUVELE1BQU0sMkJBQTJCLEdBQUcsS0FBSyxDQUFDLDJCQUEyQixDQUFDO1FBRXRFLE1BQU0sSUFBSSxDQUFDLHNCQUFzQixDQUFDLFlBQVksRUFBRSxFQUFFLDJCQUEyQixDQUFDLFFBQVEsRUFBRSxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsTUFBTSxFQUFFLE9BQU8sQ0FBQyx3QkFBd0IsRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLEtBQUssRUFBRSw2QkFBNkIsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUVoTSxNQUFNLGlCQUFpQixHQUFHLDJCQUEyQixDQUFDLFFBQVEsQ0FBQztRQUMvRCxNQUFNLGVBQWUsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksdUJBQXVCLEVBQUUsQ0FBQyxDQUFDO1FBQ3RFLE1BQU0sYUFBYSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxxQkFBcUIsRUFBRSxDQUFDLENBQUM7UUFDbEUsTUFBTSxXQUFXLEdBQUcsSUFBSSxXQUFXLENBQ2xDLElBQUksQ0FBQyxnQkFBZ0IsRUFDckIsZUFBZSxFQUNmLFNBQVMsQ0FBQyxFQUFFLENBQUMsYUFBYSxDQUMxQixDQUFDO1FBRUYsSUFBSSxDQUFDLGtCQUFrQixHQUFHLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsaUJBQWlCLEVBQUUsaUJBQWlCLENBQUMsUUFBUSxFQUFFLGlCQUFpQixFQUFFLFdBQVcsRUFBRSxJQUFJLEVBQUUsRUFBRSxVQUFVLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQztRQUU5SyxNQUFNLGFBQWEsR0FBRyxJQUFJLENBQUMsa0JBQWtCLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDakYsSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFDO1lBQ3BCLE1BQU0sSUFBSSxLQUFLLENBQUMsZ0VBQWdFLENBQUMsQ0FBQztRQUNuRixDQUFDO1FBRUQsTUFBTSxtQkFBbUIsR0FBRyxhQUFhLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxFQUFFLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQyxRQUFRLEtBQUssS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQ3ZJLElBQUksQ0FBQyxtQkFBbUIsRUFBRSxDQUFDO1lBQzFCLE1BQU0sSUFBSSxLQUFLLENBQUMsdUVBQXVFLENBQUMsQ0FBQztRQUMxRixDQUFDO1FBRUQsSUFBSSxNQUFNLEdBQW1DLFNBQVMsQ0FBQztRQUV2RCxNQUFNLENBQUMsU0FBUyxFQUFFLElBQUksQ0FBQyxHQUFHLG1CQUFtQixDQUFDLGdCQUFnQixDQUFDLGlCQUFpQixFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBQzdGLE1BQU0sc0JBQXNCLEdBQUcsbUJBQW1CLENBQUMsY0FBYyxJQUFJLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNyRixJQUFJLFNBQVMsQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDNUIsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQyxlQUFlLENBQUMsc0JBQXNCLENBQUMsVUFBVSxDQUFDLENBQUM7WUFDekYsTUFBTSxHQUFHLFFBQVE7Z0JBQ2hCLENBQUMsQ0FBQyxFQUFFLElBQUksb0NBQTRCLEVBQUUsUUFBUSxFQUFFLE1BQU0sRUFBRSxtQkFBbUIsRUFBRSxRQUFRLEVBQUUsc0JBQXNCLENBQUMsUUFBUSxFQUFFO2dCQUN4SCxDQUFDLENBQUMsSUFBSSxDQUFDLHNCQUFzQixDQUFDLG1CQUFtQixFQUFFLHNCQUFzQixDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBRXRGLENBQUM7UUFFRCxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDYixNQUFNLElBQUksS0FBSyxDQUFDLCtCQUErQixDQUFDLENBQUM7UUFDbEQsQ0FBQztRQUVELE1BQU0sUUFBUSxHQUFvQjtZQUNqQyxNQUFNLEVBQUUsYUFBYSxDQUFDLEVBQUU7WUFDeEIsVUFBVSxFQUFFLEtBQUssQ0FBQyxJQUFJLENBQUMsTUFBTTtZQUM3QixPQUFPLEVBQUUsS0FBSyxDQUFDLElBQUksQ0FBQyxHQUFHO1NBQ3ZCLENBQUM7UUFFRixJQUFJLENBQUMsY0FBYyxFQUFFLFlBQVksQ0FBQyxRQUFRLEVBQUUsTUFBTSxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztJQUMzRCxDQUFDO0lBRU8sc0JBQXNCLENBQUMsU0FBK0IsRUFBRSxpQkFBcUM7UUFDcEcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ3JDLE9BQU8sSUFBSSxDQUFDLGNBQWMsQ0FBQyxTQUFTLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxPQUFPLEVBQUUsb0JBQW9CLENBQUMsQ0FBQyxDQUFDO1FBQ3BGLENBQUM7UUFFRCxJQUFJLENBQUMsaUJBQWlCLEVBQUUsQ0FBQztZQUN4QixNQUFNLFNBQVMsR0FBRyxTQUFTLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDN0QsTUFBTSxnQkFBZ0IsR0FBRyxTQUFTLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQzlDLE9BQU8sSUFBSSxDQUFDLGNBQWMsQ0FBQyxTQUFTLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxjQUFjLEVBQUUsNEVBQTRFLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDO1FBQ3JLLENBQUM7UUFFRCxPQUFPLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxTQUFTLEVBQUUsaUJBQWlCLENBQUMsQ0FBQztJQUNwRSxDQUFDO0lBRU8sY0FBYyxDQUFDLFNBQStCLEVBQUUsT0FBZTtRQUN0RSxNQUFNLEVBQUUsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsRUFBRSxTQUFTLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFDMUMsT0FBTyxFQUFFLElBQUksK0JBQXVCLEVBQUUsTUFBTSxFQUFFLFNBQVMsRUFBRSxXQUFXLEVBQUUsRUFBRSxDQUFDLFNBQVMsRUFBRSxDQUFDO0lBQ3RGLENBQUM7SUFFTyx3QkFBd0IsQ0FBQyxTQUErQixFQUFFLFFBQWdCO1FBQ2pGLE1BQU0sS0FBSyxHQUFHLHlCQUF5QixRQUFRLEVBQUUsQ0FBQztRQUVsRCxNQUFNLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsRUFBRSxTQUFTLEVBQUUsNENBQTRDLFFBQVEsbURBQW1ELENBQUMsQ0FBQztRQUN6SSxNQUFNLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsRUFBRSxFQUFFLElBQUksRUFBRSwwQ0FBMEMsS0FBSyxLQUFLLEVBQUUsS0FBSyxFQUFFLGtDQUFrQyxFQUFFLFFBQVEsRUFBRSxDQUFDLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsdUhBQXVILEVBQUUsRUFBRSxvQkFBb0IsQ0FBQyxDQUFDO1FBRW5ULE9BQU87WUFDTixJQUFJLCtCQUF1QjtZQUMzQixNQUFNLEVBQUUsU0FBUztZQUNqQixXQUFXLEVBQUUsQ0FBQyxDQUFDLFNBQVMsR0FBRyxDQUFDLENBQUMsU0FBUztTQUN0QyxDQUFDO0lBQ0gsQ0FBQztJQUVELHVCQUF1QixDQUFDLFFBQXlCLEVBQUUsUUFBZ0IsRUFBRSxNQUFjO1FBQ2xGLEdBQUcsQ0FBQyw0QkFBNEIsQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLEdBQUcsRUFBRTtZQUNsRCxJQUFJLENBQUMsY0FBYyxFQUFFLFNBQVMsQ0FBQyxDQUFDLEVBQUUsTUFBTSxFQUFFLFFBQVEsQ0FBQyxNQUFNLEVBQUUsUUFBUSxFQUFFLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQztRQUNqRixDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7SUFDUixDQUFDO0lBRUQsS0FBSyxDQUFDLGlCQUFpQixDQUFDLElBQTJCLEVBQUUsS0FBd0M7SUFFN0YsQ0FBQztJQUVELEtBQUssQ0FBQyxxQkFBcUIsQ0FBQyxJQUEyQixFQUFFLEtBQXdDO0lBRWpHLENBQUM7SUFFRCwyQkFBMkIsQ0FBQyxJQUEyQjtRQUN0RCxNQUFNLElBQUksS0FBSyxDQUFDLGtCQUFrQixDQUFDLENBQUM7SUFDckMsQ0FBQztJQUVELFdBQVcsQ0FBQyxNQUFjO1FBQ3pCLE1BQU0sSUFBSSxLQUFLLENBQUMsaUJBQWlCLENBQUMsQ0FBQztJQUNwQyxDQUFDO0lBRUQsYUFBYSxDQUFDLFFBQXlCO1FBQ3RDLE9BQU8sSUFBSSxDQUFDLGtCQUFrQixFQUFFLGVBQWUsQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUEwQixDQUFDO0lBQy9GLENBQUM7SUFFRCxNQUFNLENBQUMsU0FBd0IsRUFBRSxRQUEwQjtJQUUzRCxDQUFDO0lBRUQsWUFBWSxDQUFDLFNBQWlCO0lBRTlCLENBQUM7SUFFRCxhQUFhLENBQUMsS0FBVTtJQUV4QixDQUFDO0lBRUQsaUJBQWlCO0lBRWpCLENBQUM7SUFFRCxrQkFBa0IsQ0FBQyxRQUF5QixFQUFFLE1BQTRCLEVBQUUsTUFBYyxFQUFFLE1BQWUsRUFBRSxNQUFlO0lBRTVILENBQUM7SUFFRCxzQkFBc0IsQ0FBQyxNQUFjLEVBQUUsTUFBYyxFQUFFLE1BQWU7SUFFdEUsQ0FBQztJQUVELHNCQUFzQixDQUFDLE1BQWMsRUFBRSxTQUF3QjtJQUUvRCxDQUFDO0lBRUQsZUFBZSxDQUFDLE1BQWM7SUFFOUIsQ0FBQztJQUVELHNCQUFzQixDQUFDLE1BQWMsRUFBRSxLQUE4QjtJQUVyRSxDQUFDO0lBRUQsaUJBQWlCLENBQUMsTUFBYyxFQUFFLEtBQThCO0lBRWhFLENBQUM7SUFFRCxpQkFBaUIsQ0FBQyxNQUFjLEVBQUUsS0FBaUU7SUFFbkcsQ0FBQztJQUVELG9CQUFvQixDQUFDLE1BQWM7SUFFbkMsQ0FBQztJQUVELHlCQUF5QixDQUFDLE1BQWMsRUFBRSxXQUFtQixFQUFFLFFBQWdCLEVBQUUsVUFBa0I7SUFFbkcsQ0FBQztJQUVELHlCQUF5QixDQUFDLFlBQXFCO0lBRS9DLENBQUM7SUFFUSxPQUFPO1FBQ2YsSUFBSSxDQUFDLFdBQVcsR0FBRyxJQUFJLENBQUM7UUFDeEIsS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFDO0lBQ2pCLENBQUM7O0FBL1BXLG9CQUFvQjtJQXFCOUIsV0FBQSxxQkFBcUIsQ0FBQTtJQUNyQixXQUFBLGFBQWEsQ0FBQTtJQUNiLFdBQUEsaUJBQWlCLENBQUE7SUFDakIsV0FBQSxlQUFlLENBQUE7SUFDZixXQUFBLHFCQUFxQixDQUFBO0lBQ3JCLFdBQUEsZ0JBQWdCLENBQUE7R0ExQk4sb0JBQW9CLENBZ1FoQzs7QUFFTSxJQUFNLGdDQUFnQyxHQUF0QyxNQUFNLGdDQUFnQzthQUU1QixPQUFFLEdBQUcseURBQXlELEFBQTVELENBQTZEO0lBRS9FLFlBQ3lCLHFCQUE2QyxFQUM3QixvQkFBMkMsRUFDN0Msa0JBQXVDO1FBRHJDLHlCQUFvQixHQUFwQixvQkFBb0IsQ0FBdUI7UUFDN0MsdUJBQWtCLEdBQWxCLGtCQUFrQixDQUFxQjtRQUM3RSxxQkFBcUIsQ0FBQyxjQUFjLENBQ25DLEdBQUcsT0FBTyxDQUFDLHdCQUF3QixNQUFNLEVBQ3pDO1lBQ0MsRUFBRSxFQUFFLHNCQUFzQjtZQUMxQixLQUFLLEVBQUUsd0JBQXdCO1lBQy9CLFFBQVEsRUFBRSx3QkFBd0IsQ0FBQyxPQUFPO1NBQzFDLEVBQ0Q7WUFDQyxrQkFBa0IsRUFBRSxDQUFDLFFBQWEsRUFBRSxFQUFFO2dCQUNyQyxJQUFJLFFBQVEsQ0FBQyxNQUFNLEtBQUssT0FBTyxDQUFDLHdCQUF3QixFQUFFLENBQUM7b0JBQzFELE1BQU0sTUFBTSxHQUFHLElBQUksZUFBZSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQztvQkFDbkQsT0FBTyxNQUFNLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxLQUFLLHNCQUFzQixDQUFDO2dCQUN4RCxDQUFDO2dCQUNELE9BQU8sS0FBSyxDQUFDO1lBQ2QsQ0FBQztTQUNELEVBQ0Q7WUFDQyxpQkFBaUIsRUFBRSxLQUFLLEVBQUUsRUFBRSxRQUFRLEVBQUUsT0FBTyxFQUFFLEVBQUUsRUFBRTtnQkFDbEQsTUFBTSxhQUFhLEdBQUcsT0FBTyxDQUFDLGtCQUFrQixDQUFDLFFBQVEsQ0FBQyxDQUFDO2dCQUMzRCxJQUFJLENBQUMsYUFBYSxJQUFJLENBQUMsYUFBYSxDQUFDLFFBQVEsSUFBSSxhQUFhLENBQUMsU0FBUyxLQUFLLFNBQVMsSUFBSSxhQUFhLENBQUMsV0FBVyxLQUFLLFNBQVMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxRQUFRLEVBQUUsQ0FBQztvQkFDOUosTUFBTSxJQUFJLEtBQUssQ0FBQywrQ0FBK0MsQ0FBQyxDQUFDO2dCQUNsRSxDQUFDO2dCQUVELE1BQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxjQUFjLENBQUMsYUFBYSxDQUFDLFFBQVEsQ0FBQyxDQUFDO2dCQUNuRixNQUFNLFNBQVMsR0FBRyxhQUFhLENBQUMsU0FBUyxDQUFDO2dCQUMxQyxNQUFNLFFBQVEsR0FBRyxhQUFhLENBQUMsUUFBUSxDQUFDO2dCQUN4QyxNQUFNLFdBQVcsR0FBRyxhQUFhLENBQUMsV0FBVyxDQUFDO2dCQUU5QyxNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsb0JBQW9CLENBQUMsY0FBYyxDQUFDLHlCQUF5QixFQUFFLFdBQVcsRUFBRSxTQUFTLEVBQUUsUUFBUSxFQUFFLFdBQVcsQ0FBQyxDQUFDO2dCQUN2SSxPQUFPO29CQUNOLE1BQU0sRUFBRSxXQUFXO29CQUNuQixPQUFPLEVBQUUsT0FBTztpQkFDaEIsQ0FBQztZQUNILENBQUM7U0FDRCxDQUNELENBQUM7SUFDSCxDQUFDOztBQTVDVyxnQ0FBZ0M7SUFLMUMsV0FBQSxzQkFBc0IsQ0FBQTtJQUN0QixXQUFBLHFCQUFxQixDQUFBO0lBQ3JCLFdBQUEsbUJBQW1CLENBQUE7R0FQVCxnQ0FBZ0MsQ0E2QzVDOztBQUVELDhCQUE4QixDQUFDLGdDQUFnQyxDQUFDLEVBQUUsRUFBRSxnQ0FBZ0Msc0NBQThCLENBQUMifQ==