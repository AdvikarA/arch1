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
import { Disposable } from '../../../../base/common/lifecycle.js';
import { localize } from '../../../../nls.js';
import { MenuRegistry } from '../../../../platform/actions/common/actions.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { Extensions as WorkbenchExtensions } from '../../../common/contributions.js';
import { isProposedApiEnabled } from '../../../services/extensions/common/extensions.js';
import { ExtensionsRegistry } from '../../../services/extensions/common/extensionsRegistry.js';
import { IRemoteCodingAgentsService } from '../common/remoteCodingAgentsService.js';
const extensionPoint = ExtensionsRegistry.registerExtensionPoint({
    extensionPoint: 'remoteCodingAgents',
    jsonSchema: {
        description: localize('remoteCodingAgentsExtPoint', 'Contributes remote coding agent integrations to the chat widget.'),
        type: 'array',
        items: {
            type: 'object',
            properties: {
                id: {
                    description: localize('remoteCodingAgentsExtPoint.id', 'A unique identifier for this item.'),
                    type: 'string',
                },
                command: {
                    description: localize('remoteCodingAgentsExtPoint.command', 'Identifier of the command to execute. The command must be declared in the "commands" section.'),
                    type: 'string'
                },
                displayName: {
                    description: localize('remoteCodingAgentsExtPoint.displayName', 'A user-friendly name for this item which is used for display in menus.'),
                    type: 'string'
                },
                description: {
                    description: localize('remoteCodingAgentsExtPoint.description', 'Description of the remote agent for use in menus and tooltips.'),
                    type: 'string'
                },
                followUpRegex: {
                    description: localize('remoteCodingAgentsExtPoint.followUpRegex', 'The last occurrence of pattern in an existing chat conversation is sent to the contributing extension to facilitate follow-up responses.'),
                    type: 'string',
                },
                when: {
                    description: localize('remoteCodingAgentsExtPoint.when', 'Condition which must be true to show this item.'),
                    type: 'string'
                },
            },
            required: ['command', 'displayName'],
        }
    }
});
let RemoteCodingAgentsContribution = class RemoteCodingAgentsContribution extends Disposable {
    constructor(logService, remoteCodingAgentsService) {
        super();
        this.logService = logService;
        this.remoteCodingAgentsService = remoteCodingAgentsService;
        extensionPoint.setHandler(extensions => {
            for (const ext of extensions) {
                if (!isProposedApiEnabled(ext.description, 'remoteCodingAgents')) {
                    continue;
                }
                if (!Array.isArray(ext.value)) {
                    continue;
                }
                for (const contribution of ext.value) {
                    const command = MenuRegistry.getCommand(contribution.command);
                    if (!command) {
                        continue;
                    }
                    const agent = {
                        id: contribution.id,
                        command: contribution.command,
                        displayName: contribution.displayName,
                        description: contribution.description,
                        followUpRegex: contribution.followUpRegex,
                        when: contribution.when
                    };
                    this.logService.info(`Registering remote coding agent: ${agent.displayName} (${agent.command})`);
                    this.remoteCodingAgentsService.registerAgent(agent);
                }
            }
        });
    }
};
RemoteCodingAgentsContribution = __decorate([
    __param(0, ILogService),
    __param(1, IRemoteCodingAgentsService)
], RemoteCodingAgentsContribution);
export { RemoteCodingAgentsContribution };
const workbenchRegistry = Registry.as(WorkbenchExtensions.Workbench);
workbenchRegistry.registerWorkbenchContribution(RemoteCodingAgentsContribution, 3 /* LifecyclePhase.Restored */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVtb3RlQ29kaW5nQWdlbnRzLmNvbnRyaWJ1dGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL2FkdmlrYXIvRG9jdW1lbnRzL2FyY2hpdGVjdC9hcmNoMi9BcmNoSURFL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3JlbW90ZUNvZGluZ0FnZW50cy9icm93c2VyL3JlbW90ZUNvZGluZ0FnZW50cy5jb250cmlidXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2xFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUM5QyxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sZ0RBQWdELENBQUM7QUFDOUUsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ3JFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrREFBa0QsQ0FBQztBQUM1RSxPQUFPLEVBQTBCLFVBQVUsSUFBSSxtQkFBbUIsRUFBbUMsTUFBTSxrQ0FBa0MsQ0FBQztBQUM5SSxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxtREFBbUQsQ0FBQztBQUN6RixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSwyREFBMkQsQ0FBQztBQUUvRixPQUFPLEVBQXNCLDBCQUEwQixFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFXeEcsTUFBTSxjQUFjLEdBQUcsa0JBQWtCLENBQUMsc0JBQXNCLENBQXFDO0lBQ3BHLGNBQWMsRUFBRSxvQkFBb0I7SUFDcEMsVUFBVSxFQUFFO1FBQ1gsV0FBVyxFQUFFLFFBQVEsQ0FBQyw0QkFBNEIsRUFBRSxrRUFBa0UsQ0FBQztRQUN2SCxJQUFJLEVBQUUsT0FBTztRQUNiLEtBQUssRUFBRTtZQUNOLElBQUksRUFBRSxRQUFRO1lBQ2QsVUFBVSxFQUFFO2dCQUNYLEVBQUUs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