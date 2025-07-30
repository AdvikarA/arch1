/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { URI } from '../../../../../../base/common/uri.js';
export function getTaskDefinition(id) {
    const idx = id.indexOf(': ');
    const taskType = id.substring(0, idx);
    let taskLabel = idx > 0 ? id.substring(idx + 2) : id;
    if (/^\d+$/.test(taskLabel)) {
        taskLabel = id;
    }
    return { taskLabel, taskType };
}
export function getTaskRepresentation(task) {
    if ('label' in task && task.label) {
        return task.label;
    }
    else if ('script' in task && task.script) {
        return task.script;
    }
    else if ('command' in task && task.command) {
        return typeof task.command === 'string' ? task.command : task.command.name?.toString() || '';
    }
    return '';
}
export async function getTaskForTool(id, taskDefinition, workspaceFolder, configurationService, taskService) {
    let index = 0;
    let task;
    const configTasks = configurationService.getValue('tasks').tasks ?? [];
    for (const configTask of configTasks) {
        if ((configTask.type && taskDefinition.taskType ? configTask.type === taskDefinition.taskType : true) &&
            ((getTaskRepresentation(configTask) === taskDefinition?.taskLabel) || (id === configTask.label))) {
            task = configTask;
            break;
        }
        else if (id === `${configTask.type}: ${index}`) {
            task = configTask;
            break;
        }
        index++;
    }
    if (!task) {
        return;
    }
    const configuringTasks = (await taskService.getWorkspaceTasks())?.get(URI.file(workspaceFolder).toString())?.configurations?.byIdentifier;
    const configuredTask = Object.values(configuringTasks ?? {}).find(t => {
        return t.type === task.type && (t._label === task.label || t._label === `${task.type}: ${getTaskRepresentation(task)}`);
    });
    let resolvedTask;
    if (configuredTask) {
        resolvedTask = await taskService.tryResolveTask(configuredTask);
    }
    if (!resolvedTask) {
        const customTasks = (await taskService.getWorkspaceTasks())?.get(URI.file(workspaceFolder).toString())?.set?.tasks;
        resolvedTask = customTasks?.find(t => task.label === t._label || task.label === t._label);
    }
    return resolvedTask;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGFza0hlbHBlcnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9hZHZpa2FyL0RvY3VtZW50cy9hcmNoaXRlY3QvYXJjaDIvQXJjaElERS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXJtaW5hbENvbnRyaWIvY2hhdEFnZW50VG9vbHMvYnJvd3Nlci90YXNrL3Rhc2tIZWxwZXJzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUszRCxNQUFNLFVBQVUsaUJBQWlCLENBQUMsRUFBVTtJQUMzQyxNQUFNLEdBQUcsR0FBRyxFQUFFLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQzdCLE1BQU0sUUFBUSxHQUFHLEVBQUUsQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDO0lBQ3RDLElBQUksU0FBUyxHQUFHLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7SUFFckQsSUFBSSxPQUFPLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUM7UUFDN0IsU0FBUyxHQUFHLEVBQUUsQ0FBQztJQUNoQixDQUFDO0lBRUQsT0FBTyxFQUFFLFNBQVMsRUFBRSxRQUFRLEVBQUUsQ0FBQztBQUVoQyxDQUFDO0FBRUQsTUFBTSxVQUFVLHFCQUFxQixDQUFDLElBQTRCO0lBQ2pFLElBQUksT0FBTyxJQUFJLElBQUksSUFBSSxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7UUFDbkMsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDO0lBQ25CLENBQUM7U0FBTSxJQUFJLFFBQVEsSUFBSSxJQUFJLElBQUksSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO1FBQzVDLE9BQU8sSUFBSSxD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