/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { localize } from '../../../../../nls.js';
import { ToolDataSource } from '../../../chat/common/languageModelToolsService.js';
import { RunInTerminalTool } from './runInTerminalTool.js';
export const GetTerminalOutputToolData = {
    id: 'get_terminal_output',
    toolReferenceName: 'getTerminalOutput',
    displayName: localize('getTerminalOutputTool.displayName', 'Get Terminal Output'),
    modelDescription: 'Get the output of a terminal command previously started with run_in_terminal',
    source: ToolDataSource.Internal,
    inputSchema: {
        type: 'object',
        properties: {
            command: {
                type: 'string',
                description: 'The ID of the terminal command output to check.'
            },
        },
        required: [
            'id',
        ]
    }
};
export class GetTerminalOutputTool extends Disposable {
    async prepareToolInvocation(context, token) {
        return {
            invocationMessage: localize('bg.progressive', "Checking background terminal output"),
            pastTenseMessage: localize('bg.past', "Checked background terminal output"),
        };
    }
    async invoke(invocation, _countTokens, _progress, token) {
        const args = invocation.parameters;
        return {
            content: [{
                    kind: 'text',
                    value: `Output of terminal ${args.id}:\n${RunInTerminalTool.getBackgroundOutput(args.id)}`
                }]
        };
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2V0VGVybWluYWxPdXRwdXRUb29sLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvYWR2aWthci9Eb2N1bWVudHMvYXJjaGl0ZWN0L2FyY2gyL0FyY2hJREUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVybWluYWxDb250cmliL2NoYXRBZ2VudFRvb2xzL2Jyb3dzZXIvZ2V0VGVybWluYWxPdXRwdXRUb29sLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUNyRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFDakQsT0FBTyxFQUFFLGNBQWMsRUFBNkwsTUFBTSxtREFBbUQsQ0FBQztBQUM5USxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQztBQUUzRCxNQUFNLENBQUMsTUFBTSx5QkFBeUIsR0FBYztJQUNuRCxFQUFFLEVBQUUscUJBQXFCO0lBQ3pCLGlCQUFpQixFQUFFLG1CQUFtQjtJQUN0QyxXQUFXLEVBQUUsUUFBUSxDQUFDLG1DQUFtQyxFQUFFLHFCQUFxQixDQUFDO0lBQ2pGLGdCQUFnQixFQUFFLDhFQUE4RTtJQUNoRyxNQUFNLEVBQUUsY0FBYyxDQUFDLFFBQVE7SUFDL0IsV0FBVyxFQUFFO1FBQ1osSUFBSSxFQUFFLFFBQVE7UUFDZCxVQUFVLEVBQUU7WUFDWCxPQUFPLEVBQUU7Z0JBQ1IsSUFBSSxFQUFFLFFBQVE7Z0JBQ2QsV0FBVyxFQUFFLGlEQUFpRDthQUM5RDtTQUNEO1FBQ0QsUUFBUSxFQUFFO1lBQ1QsSUFBSTtTQUNKO0tBQ0Q7Q0FDRCxDQUFDO0FBTUYsTUFBTSxPQUFPLHFCQUFzQixTQUFRLFVBQVU7SUFDcEQsS0FBSyxDQUFDLHFCQUFxQixDQUFDLE9BQTBDLEVBQUUsS0FBd0I7UUFDL0YsT0FBTztZQUNOLGlCQUFpQixFQUFFLFFBQVEsQ0FBQyxnQkFBZ0IsRUFBRSxxQ0FBcUMsQ0FBQztZQUNwRixnQkFBZ0IsRUFBRSxRQUFRLENBQUMsU0FBUyxFQUFFLG9DQUFvQyxDQUFDO1NBQzNFLENBQUM7SUFDSCxDQUFDO0lBRUQsS0FBSyxDQUFDLE1BQU0sQ0FBQyxVQUEyQixFQUFFLFlBQWlDLEVBQUUsU0FBdUIsRUFBRSxLQUF3QjtRQUM3SCxNQUFNLElBQUksR0FBRyxVQUFVLENBQUMsVUFBMkMsQ0FBQztRQUNwRSxPQUFPO1lBQ04sT0FBTyxFQUFFLENBQUM7b0JBQ1QsSUFBSSxFQUFFLE1BQU07b0JBQ1osS0FBSyxFQUFFLHNCQUFzQixJQUFJLENBQUMsRUFBRSxNQUFNLGlCQUFpQixDQUFDLG1CQUFtQixDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsRUFBRTtpQkFDMUYsQ0FBQztTQUNGLENBQUM7SUFDSCxDQUFDO0NBQ0QifQ==