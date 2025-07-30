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
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { localize } from '../../../../../nls.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { registerWorkbenchContribution2 } from '../../../../common/contributions.js';
import { ILanguageModelToolsService, ToolDataSource } from '../../../chat/common/languageModelToolsService.js';
import { CreateAndRunTaskTool, CreateAndRunTaskToolData } from './task/createAndRunTaskTool.js';
import { GetTaskOutputTool, GetTaskOutputToolData } from './task/getTaskOutputTool.js';
import { RunTaskTool, RunTaskToolData } from './task/runTaskTool.js';
// #region Workbench contributions
let ChatAgentToolsContribution = class ChatAgentToolsContribution extends Disposable {
    static { this.ID = 'task.chatAgentTools'; }
    constructor(configurationService, instantiationService, toolsService) {
        super();
        const runTaskTool = instantiationService.createInstance(RunTaskTool);
        this._register(toolsService.registerToolData(RunTaskToolData));
        this._register(toolsService.registerToolImplementation(RunTaskToolData.id, runTaskTool));
        const getTaskOutputTool = instantiationService.createInstance(GetTaskOutputTool);
        this._register(toolsService.registerToolData(GetTaskOutputToolData));
        this._register(toolsService.registerToolImplementation(GetTaskOutputToolData.id, getTaskOutputTool));
        const createAndRunTaskTool = instantiationService.createInstance(CreateAndRunTaskTool);
        this._register(toolsService.registerToolData(CreateAndRunTaskToolData));
        this._register(toolsService.registerToolImplementation(CreateAndRunTaskToolData.id, createAndRunTaskTool));
        const toolSet = this._register(toolsService.createToolSet(ToolDataSource.Internal, 'runTasks', 'runTasks', {
            description: localize('toolset.runTasks', 'Runs tasks and gets their output for your workspace')
        }));
        toolSet.addTool(RunTaskToolData);
        toolSet.addTool(GetTaskOutputToolData);
        toolSet.addTool(CreateAndRunTaskToolData);
    }
};
ChatAgentToolsContribution = __decorate([
    __param(0, IConfigurationService),
    __param(1, IInstantiationService),
    __param(2, ILanguageModelToolsService)
], ChatAgentToolsContribution);
registerWorkbenchContribution2(ChatAgentToolsContribution.ID, ChatAgentToolsContribution, 3 /* WorkbenchPhase.AfterRestored */);
// #endregion Contributions
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGFzay5jaGF0QWdlbnRUb29scy5jb250cmlidXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9hZHZpa2FyL0RvY3VtZW50cy9hcmNoaXRlY3QvYXJjaDIvQXJjaElERS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXJtaW5hbENvbnRyaWIvY2hhdEFnZW50VG9vbHMvYnJvd3Nlci90YXNrLmNoYXRBZ2VudFRvb2xzLmNvbnRyaWJ1dGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0seUNBQXlDLENBQUM7QUFDckUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBQ2pELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFDO0FBQ3RHLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFDO0FBQ3RHLE9BQU8sRUFBRSw4QkFBOEIsRUFBK0MsTUFBTSxxQ0FBcUMsQ0FBQztBQUNsSSxPQUFPLEVBQUUsMEJBQTBCLEVBQUUsY0FBYyxFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDL0csT0FBTyxFQUFFLG9CQUFvQixFQUFFLHdCQUF3QixFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDaEcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLHFCQUFxQixFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFDdkYsT0FBTyxFQUFFLFdBQVcsRUFBRSxlQUFlLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQztBQUVyRSxrQ0FBa0M7QUFFbEMsSUFBTSwwQkFBMEIsR0FBaEMsTUFBTSwwQkFBMkIsU0FBUSxVQUFVO2FBRWxDLE9BQUUsR0FBRyxxQkFBcUIsQUFBeEIsQ0FBeUI7SUFFM0MsWUFDd0Isb0JBQTJDLEVBQzNDLG9CQUEyQyxFQUN0QyxZQUF3QztRQUVwRSxLQUFLLEVBQUUsQ0FBQztRQUNSLE1BQU0sV0FBVyxHQUFHLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyxXQUFXLENBQUMsQ0FBQztRQUNyRSxJQUFJLENBQUMsU0FBUyxDQUFDLFlBQVksQ0FBQyxnQkFBZ0IsQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDO1FBQy9ELElBQUksQ0FBQyxTQUFTLENBQUMsWUFBWSxDQUFDLDBCQUEwQixDQUFDLGVBQWUsQ0FBQyxFQUFFLEVBQUUsV0FBVyxDQUFDLENBQUMsQ0FBQztRQUV6RixNQUFNLGlCQUFpQixHQUFHLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO1FBQ2pGLElBQUksQ0FBQyxTQUFTLENBQUMsWUFBWSxDQUFDLGdCQUFnQixDQUFDLHFCQUFxQixDQUFDLENBQUMsQ0FBQztRQUNyRSxJQUFJLENBQUMsU0FBUyxDQUFDLFlBQVksQ0FBQywwQkFBMEIsQ0FBQyxxQkFBcUIsQ0FBQyxFQUFFLEVBQUUsaUJBQWlCLENBQUMsQ0FBQyxDQUFDO1FBRXJHLE1BQU0sb0JBQW9CLEdBQUcsb0JBQW9CLENBQUMsY0FBYyxDQUFDLG9CQUFvQixDQUFDLENBQUM7UUFDdkYsSUFBSSxDQUFDLFNBQVMsQ0FBQyxZQUFZLENBQUMsZ0JBQWdCLENBQUMsd0JBQXdCLENBQUMsQ0FBQyxDQUFDO1FBQ3hFLElBQUksQ0FBQyxTQUFTLENBQUMsWUFBWSxDQUFDLDBCQUEwQixDQUFDLHdCQUF3QixDQUFDLEVBQUUsRUFBRSxvQkFBb0IsQ0FBQyxDQUFDLENBQUM7UUFFM0csTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxZQUFZLENBQUMsYUFBYSxDQUFDLGNBQWMsQ0FBQyxRQUFRLEVBQUUsVUFBVSxFQUFFLFVBQVUsRUFBRTtZQUMxRyxXQUFXLEVBQUUsUUFBUSxDQUFDLGtCQUFrQixFQUFFLHFEQUFxRCxDQUFDO1NBQ2hHLENBQUMsQ0FBQyxDQUFDO1FBQ0osT0FBTyxDQUFDLE9BQU8sQ0FBQyxlQUFlLENBQUMsQ0FBQztRQUNqQyxPQUFPLENBQUMsT0FBTyxDQUFDLHFCQUFxQixDQUFDLENBQUM7UUFDdkMsT0FBTyxDQUFDLE9BQU8sQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDO0lBQzNDLENBQUM7O0FBNUJJLDBCQUEwQjtJQUs3QixXQUFBLHFCQUFxQixDQUFBO0lBQ3JCLFdBQUEscUJBQXFCLENBQUE7SUFDckIsV0FBQSwwQkFBMEIsQ0FBQTtHQVB2QiwwQkFBMEIsQ0E2Qi9CO0FBQ0QsOEJBQThCLENBQUMsMEJBQTBCLENBQUMsRUFBRSxFQUFFLDBCQUEwQix1Q0FBK0IsQ0FBQztBQUV4SCwyQkFBMkIifQ==