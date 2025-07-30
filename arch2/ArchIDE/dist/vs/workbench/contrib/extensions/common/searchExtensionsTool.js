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
import { Codicon } from '../../../../base/common/codicons.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { localize } from '../../../../nls.js';
import { EXTENSION_CATEGORIES } from '../../../../platform/extensions/common/extensions.js';
import { ToolDataSource } from '../../chat/common/languageModelToolsService.js';
import { IExtensionsWorkbenchService } from '../common/extensions.js';
export const SearchExtensionsToolId = 'vscode_searchExtensions_internal';
export const SearchExtensionsToolData = {
    id: SearchExtensionsToolId,
    toolReferenceName: 'extensions',
    canBeReferencedInPrompt: true,
    icon: ThemeIcon.fromId(Codicon.extensions.id),
    displayName: localize('searchExtensionsTool.displayName', 'Search Extensions'),
    modelDescription: localize('searchExtensionsTool.modelDescription', "This is a tool for browsing Visual Studio Code Extensions Marketplace. It allows the model to search for extensions and retrieve detailed information about them. The model should use this tool whenever it needs to discover extensions or resolve information about known ones. To use the tool, the model has to provide the category of the extensions, relevant search keywords, or known extension IDs. Note that search results may include false positives, so reviewing and filtering is recommended."),
    userDescription: localize('searchExtensionsTool.userDescription', 'Search for extensions in the Visual Studio Code Extensions Marketplace'),
    source: ToolDataSource.Internal,
    inputSchema: {
        type: 'object',
        properties: {
            category: {
                type: 'string',
                description: 'The category of extensions to search for',
                enum: EXTENSION_CATEGORIES,
            },
            keywords: {
                type: 'array',
                items: {
                    type: 'string',
                },
                description: 'The keywords to search for',
            },
            ids: {
                type: 'array',
                items: {
                    type: 'string',
                },
                description: 'The ids of the extensions to search for',
            },
        },
    }
};
let SearchExtensionsTool = class SearchExtensionsTool {
    constructor(extensionWorkbenchService) {
        this.extensionWorkbenchService = extensionWorkbenchService;
    }
    async invoke(invocation, _countTokens, _progress, token) {
        const params = invocation.parameters;
        if (!params.keywords?.length && !params.category && !params.ids?.length) {
            return {
                content: [{
                        kind: 'text',
                        value: localize('searchExtensionsTool.noInput', 'Please provide a category or keywords or ids to search for.')
                    }]
            };
        }
        const extensionsMap = new Map();
        const addExtension = (extensions) => {
            for (const extension of extensions) {
                if (extension.deprecationInfo || extension.isMalicious) {
                    continue;
                }
                extensionsMap.set(extension.identifier.id.toLowerCase(), {
                    id: extension.identifier.id,
                    name: extension.displayName,
                    description: extension.description,
                    installed: extension.state === 1 /* ExtensionState.Installed */,
                    installCount: extension.installCount ?? 0,
                    rating: extension.rating ?? 0,
                    categories: extension.categories ?? [],
                    tags: extension.gallery?.tags ?? []
                });
            }
        };
        const queryAndAddExtensions = async (text) => {
            const extensions = await this.extensionWorkbenchService.queryGallery({
                text,
                pageSize: 10,
                sortBy: "InstallCount" /* SortBy.InstallCount */
            }, token);
            if (extensions.firstPage.length) {
                addExtension(extensions.firstPage);
            }
        };
        // Search for extensions by their ids
        if (params.ids?.length) {
            const extensions = await this.extensionWorkbenchService.getExtensions(params.ids.map(id => ({ id })), token);
            addExtension(extensions);
        }
        if (params.keywords?.length) {
            for (const keyword of params.keywords ?? []) {
                if (keyword === 'featured') {
                    await queryAndAddExtensions('featured');
                }
                else {
                    let text = params.category ? `category:"${params.category}"` : '';
                    text = keyword ? `${text} ${keyword}`.trim() : text;
                    await queryAndAddExtensions(text);
                }
            }
        }
        else {
            await queryAndAddExtensions(`category:"${params.category}"`);
        }
        const result = Array.from(extensionsMap.values());
        return {
            content: [{
                    kind: 'text',
                    value: `Here are the list of extensions:\n${JSON.stringify(result)}\n. Important: Use the following format to display extensions to the user because there is a renderer available to parse these extensions in this format and display them with all details. So, do not describe about the extensions to the user.\n\`\`\`vscode-extensions\nextensionId1,extensionId2\n\`\`\`\n.`
                }],
            toolResultDetails: {
                input: JSON.stringify(params),
                output: [{ type: 'embed', isText: true, value: JSON.stringify(result.map(extension => extension.id)) }]
            }
        };
    }
};
SearchExtensionsTool = __decorate([
    __param(0, IExtensionsWorkbenchService)
], SearchExtensionsTool);
export { SearchExtensionsTool };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VhcmNoRXh0ZW5zaW9uc1Rvb2wuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9hZHZpa2FyL0RvY3VtZW50cy9hcmNoaXRlY3QvYXJjaDIvQXJjaElERS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9leHRlbnNpb25zL2NvbW1vbi9zZWFyY2hFeHRlbnNpb25zVG9vbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUdoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUM7QUFDOUQsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQ2pFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUU5QyxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxzREFBc0QsQ0FBQztBQUM1RixPQUFPLEVBQTJFLGNBQWMsRUFBZ0IsTUFBTSxnREFBZ0QsQ0FBQztBQUN2SyxPQUFPLEVBQThCLDJCQUEyQixFQUFFLE1BQU0seUJBQXlCLENBQUM7QUFFbEcsTUFBTSxDQUFDLE1BQU0sc0JBQXNCLEdBQUcsa0NBQWtDLENBQUM7QUFFekUsTUFBTSxDQUFDLE1BQU0sd0JBQXdCLEdBQWM7SUFDbEQsRUFBRSxFQUFFLHNCQUFzQjtJQUMxQixpQkFBaUIsRUFBRSxZQUFZO0lBQy9CLHVCQUF1QixFQUFFLElBQUk7SUFDN0IsSUFBSSxFQUFFLFNBQVMsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUM7SUFDN0MsV0FBVyxFQUFFLFFBQVEsQ0FBQyxrQ0FBa0MsRUFBRSxtQkFBbUIsQ0FBQztJQUM5RSxnQkFBZ0IsRUFBRSxRQUFRLENBQUMsdUNBQXVDLEVBQUUsaWZBQWlmLENBQUM7SUFDdGpCLGVBQWUsRUFBRSxRQUFRLENBQUMsc0NBQXNDLEVBQUUsd0VBQXdFLENBQUM7SUFDM0ksTUFBTSxFQUFFLGNBQWMsQ0FB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