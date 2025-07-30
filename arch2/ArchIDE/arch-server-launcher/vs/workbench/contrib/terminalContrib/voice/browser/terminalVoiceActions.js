/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize2 } from '../../../../../nls.js';
import { ContextKeyExpr } from '../../../../../platform/contextkey/common/contextkey.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { HasSpeechProvider } from '../../../speech/common/speechService.js';
import { registerActiveInstanceAction, sharedWhenClause } from '../../../terminal/browser/terminalActions.js';
import { TerminalVoiceSession } from './terminalVoice.js';
export function registerTerminalVoiceActions() {
    registerActiveInstanceAction({
        id: "workbench.action.terminal.startVoice" /* TerminalCommandId.StartVoice */,
        title: localize2('workbench.action.terminal.startDictation', "Start Dictation in Terminal"),
        precondition: ContextKeyExpr.and(HasSpeechProvider, sharedWhenClause.terminalAvailable),
        f1: true,
        run: (activeInstance, c, accessor) => {
            const instantiationService = accessor.get(IInstantiationService);
            TerminalVoiceSession.getInstance(instantiationService).start();
        }
    });
    registerActiveInstanceAction({
        id: "workbench.action.terminal.stopVoice" /* TerminalCommandId.StopVoice */,
        title: localize2('workbench.action.terminal.stopDictation', "Stop Dictation in Terminal"),
        precondition: ContextKeyExpr.and(HasSpeechProvider, sharedWhenClause.terminalAvailable),
        f1: true,
        run: (activeInstance, c, accessor) => {
            const instantiationService = accessor.get(IInstantiationService);
            TerminalVoiceSession.getInstance(instantiationService).stop(true);
        }
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxWb2ljZUFjdGlvbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9hZHZpa2FyL0RvY3VtZW50cy9hcmNoaXRlY3QvYXJjaDIvQXJjaElERS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXJtaW5hbENvbnRyaWIvdm9pY2UvYnJvd3Nlci90ZXJtaW5hbFZvaWNlQWN0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFDbEQsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQ3pGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFDO0FBQ3RHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFDO0FBQzVFLE9BQU8sRUFBRSw0QkFBNEIsRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLDhDQUE4QyxDQUFDO0FBRTlHLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLG9CQUFvQixDQUFDO0FBRTFELE1BQU0sVUFBVSw0QkFBNEI7SUFDM0MsNEJBQTRCLENBQUM7UUFDNUIsRUFBRSwyRUFBOEI7UUFDaEMsS0FBSyxFQUFFLFNBQVMsQ0FBQywwQ0FBMEMsRUFBRSw2QkFBNkIsQ0FBQztRQUMzRixZQUFZLEVBQUUsY0FBYyxDQUFDLEdBQUcsQ0FBQyxpQkFBaUIsRUFBRSxnQkFBZ0IsQ0FBQyxpQkFBaUIsQ0FBQztRQUN2RixFQUFFLEVBQUUsSUFBSTtRQUNSLEdBQUcsRUFBRSxDQUFDLGNBQWMsRUFBRSxDQUFDLEVBQUUsUUFBUSxFQUFFLEVBQUU7WUFDcEMsTUFBTSxvQkFBb0IsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLHFCQUFxQixDQUFDLENBQUM7WUFDakUsb0JBQW9CLENBQUMsV0FBVyxDQUFDLG9CQUFvQixDQUFDLENBQUMsS0FBSyxFQUFFLENBQUM7UUFDaEUsQ0FBQztLQUNELENBQUMsQ0FBQztJQUVILDRCQUE0QixDQUFDO1FBQzVCLEVBQUUseUVBQTZCO1FBQy9CLEtBQUssRUFBRSxTQUFTLENBQUMseUNBQXlDLEVBQUUsNEJBQTRCLENBQUM7UUFDekYsWUFBWSxFQUFFLGNBQWMsQ0FBQyxHQUFHLENBQUMsaUJBQWlCLEVBQUUsZ0JBQWdCLENBQUMsaUJBQWlCLENBQUM7UUFDdkYsRUFBRSxFQUFFLElBQUk7UUFDUixHQUFHLEVBQUUsQ0FBQyxjQUFjLEVBQUUsQ0FBQyxFQUFFLFFBQVEsRUFBRSxFQUFFO1lBQ3BDLE1BQU0sb0JBQW9CLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDO1lBQ2pFLG9CQUFvQixDQUFDLFdBQVcsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNuRSxDQUFDO0tBQ0QsQ0FBQyxDQUFDO0FBQ0osQ0FBQyJ9