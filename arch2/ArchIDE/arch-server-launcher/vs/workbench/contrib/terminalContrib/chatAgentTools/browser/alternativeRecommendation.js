/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
let previouslyRecommededInSession = false;
const terminalCommands = [
    {
        commands: [
            new RegExp(/^python3? -m pip install(\b)/),
            new RegExp(/^pip3? install(\b)/),
        ],
        tags: ['python environment'],
    },
    {
        commands: [
            new RegExp(/^python3? -m jupyter(\b)/),
            new RegExp(/^python3? -m pip install\b.*jupyter\b.*/),
            new RegExp(/^pip3? install\b.*jupyter\b.*/),
            new RegExp(/^jupyter(\b)/), // jupyter lab, jupyer notebook, jupyter nbconvert, etc.
        ],
        tags: ['python environment', 'jupyter environment'],
    }
];
export function getRecommendedToolsOverRunInTerminal(commandLine, languageModelToolsService) {
    const tools = languageModelToolsService.getTools();
    if (!tools || previouslyRecommededInSession) {
        return;
    }
    const recommendedTools = new Set();
    const messages = [
        `The terminal command '${commandLine}' was not executed.`,
        `Try using some of the following tools instead of running a Terminal Command (if unable to use one of these tools as an alternative then run the same terminal command again):`,
    ];
    for (const terminalCommand of terminalCommands) {
        if (!terminalCommand.commands.some((condition) => condition.test(commandLine))) {
            continue;
        }
        const tagsToSearchFor = terminalCommand.tags;
        Array.from(tools)
            .filter(t => tagsToSearchFor.some(tag => t.tags?.includes(tag)))
            .forEach(tool => {
            recommendedTools.add(tool.id);
        });
    }
    recommendedTools.forEach(toolName => {
        messages.push(`- ${toolName}`);
    });
    if (recommendedTools.size) {
        previouslyRecommededInSession = true;
        return {
            content: [{
                    kind: 'text',
                    value: messages.join('  \n')
                }],
        };
    }
    return undefined;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWx0ZXJuYXRpdmVSZWNvbW1lbmRhdGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL2FkdmlrYXIvRG9jdW1lbnRzL2FyY2hpdGVjdC9hcmNoMi9BcmNoSURFL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlcm1pbmFsQ29udHJpYi9jaGF0QWdlbnRUb29scy9icm93c2VyL2FsdGVybmF0aXZlUmVjb21tZW5kYXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFJaEcsSUFBSSw2QkFBNkIsR0FBRyxLQUFLLENBQUM7QUFFMUMsTUFBTSxnQkFBZ0IsR0FBNkM7SUFDbEU7UUFDQyxRQUFRLEVBQUU7WUFDVCxJQUFJLE1BQU0sQ0FBQyw4QkFBOEIsQ0FBQztZQUMxQyxJQUFJLE1BQU0sQ0FBQyxvQkFBb0IsQ0FBQztTQUNoQztRQUNELElBQUksRUFBRSxDQUFDLG9CQUFvQixDQUFDO0tBQzVCO0lBQ0Q7UUFDQyxRQUFRLEVBQUU7WUFDVCxJQUFJLE1BQU0sQ0FBQywwQkFBMEIsQ0FBQztZQUN0QyxJQUFJLE1BQU0sQ0FBQyx5Q0FBeUMsQ0FBQztZQUNyRCxJQUFJLE1BQU0sQ0FBQywrQkFBK0IsQ0FBQztZQUMzQyxJQUFJLE1BQU0sQ0FBQyxjQUFjLENBQUMsRUFBRSx3REFBd0Q7U0FDcEY7UUFDRCxJQUFJLEVBQUUsQ0FBQyxvQkFBb0IsRUFBRSxxQkFBcUIsQ0FBQztLQUNuRDtDQUNELENBQUM7QUFFRixNQUFNLFVBQVUsb0NBQW9DLENBQUMsV0FBbUIsRUFBRSx5QkFBcUQ7SUFDOUgsTUFBTSxLQUFLLEdBQUcseUJBQXlCLENBQUMsUUFBUSxFQUFFLENBQUM7SUFDbkQsSUFBSSxDQUFDLEtBQUssSUFBSSw2QkFBNkIsRUFBRSxDQUFDO1FBQzdDLE9BQU87SUFDUixDQUFDO0lBRUQsTUFBTSxnQkFBZ0IsR0FBRyxJQUFJLEdBQUcsRUFBVSxDQUFDO0lBQzNDLE1BQU0sUUFBUSxHQUFhO1FBQzFCLHlCQUF5QixXQUFXLHFCQUFxQjtRQUN6RCwrS0FBK0s7S0FDL0ssQ0FBQztJQUNGLEtBQUssTUFBTSxlQUFlLElBQUksZ0JBQWdCLEVBQUUsQ0FBQztRQUNoRCxJQUFJLENBQUMsZUFBZSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxTQUFTLEVBQUUsRUFBRSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUMsRUFBRSxDQUFDO1lBQ2hGLFNBQVM7UUFDVixDQUFDO1FBQ0QsTUFBTSxlQUFlLEdBQUcsZUFBZSxDQUFDLElBQUksQ0FBQztRQUM3QyxLQUFLLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQzthQUNmLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO2FBQy9ELE9BQU8sQ0FBQyxJQUFJLENBQUMsRUFBRTtZQUNmLGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDL0IsQ0FBQyxDQUFDLENBQUM7SUFFTCxDQUFDO0lBQ0QsZ0JBQWdCLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxFQUFFO1FBQ25DLFFBQVEsQ0FBQyxJQUFJLENBQUMsS0FBSyxRQUFRLEVBQUUsQ0FBQyxDQUFDO0lBQ2hDLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxnQkFBZ0IsQ0FBQyxJQUFJLEVBQUUsQ0FBQztRQUMzQiw2QkFBNkIsR0FBRyxJQUFJLENBQUM7UUFDckMsT0FBTztZQUNOLE9BQU8sRUFBRSxDQUFDO29CQUNULElBQUksRUFBRSxNQUFNO29CQUNaLEtBQUssRUFBRSxRQUFRLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQztpQkFDNUIsQ0FBQztTQUNGLENBQUM7SUFDSCxDQUFDO0lBRUQsT0FBTyxTQUFTLENBQUM7QUFDbEIsQ0FBQyJ9