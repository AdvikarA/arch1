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
import { MarkdownString } from '../../../../../base/common/htmlContent.js';
import { ResourceSet } from '../../../../../base/common/map.js';
import { extname } from '../../../../../base/common/path.js';
import { URI } from '../../../../../base/common/uri.js';
import { localize } from '../../../../../nls.js';
import { IFileService } from '../../../../../platform/files/common/files.js';
import { IWebContentExtractorService } from '../../../../../platform/webContentExtractor/common/webContentExtractor.js';
import { detectEncodingFromBuffer } from '../../../../services/textfile/common/encoding.js';
import { ChatImageMimeType } from '../../common/languageModels.js';
import { ToolDataSource } from '../../common/languageModelToolsService.js';
import { InternalFetchWebPageToolId } from '../../common/tools/tools.js';
export const FetchWebPageToolData = {
    id: InternalFetchWebPageToolId,
    displayName: 'Fetch Web Page',
    canBeReferencedInPrompt: false,
    modelDescription: localize('fetchWebPage.modelDescription', 'Fetches the main content from a web page. This tool is useful for summarizing or analyzing the content of a webpage.'),
    source: ToolDataSource.Internal,
    inputSchema: {
        type: 'object',
        properties: {
            urls: {
                type: 'array',
                items: {
                    type: 'string',
                },
                description: localize('fetchWebPage.urlsDescription', 'An array of URLs to fetch content from.')
            }
        },
        required: ['urls']
    }
};
let FetchWebPageTool = class FetchWebPageTool {
    constructor(_readerModeService, _fileService) {
        this._readerModeService = _readerModeService;
        this._fileService = _fileService;
        this._alreadyApprovedDomains = new ResourceSet();
    }
    async invoke(invocation, _countTokens, _progress, token) {
        const urls = invocation.parameters.urls || [];
        const { webUris, fileUris, invalidUris } = this._parseUris(urls);
        const allValidUris = [...webUris.values(), ...fileUris.values()];
        if (!allValidUris.length && invalidUris.size === 0) {
            return {
                content: [{ kind: 'text', value: localize('fetchWebPage.noValidUrls', 'No valid URLs provided.') }]
            };
        }
        // We approved these via confirmation, so mark them as "approved" in this session
        // if they are not approved via the trusted domain service.
        for (const uri of webUris.values()) {
            this._alreadyApprovedDomains.add(uri);
        }
        // Get contents from web URIs
        const webContents = webUris.size > 0 ? await this._readerModeService.extract([...webUris.values()]) : [];
        // Get contents from file URIs
        const fileContents = [];
        const successfulFileUris = [];
        for (const uri of fileUris.values()) {
            try {
                const fileContent = await this._fileService.readFile(uri, undefined, token);
                // Check if this is a supported image type first
                const imageMimeType = this._getSupportedImageMimeType(uri);
                if (imageMimeType) {
                    // For supported image files, return as IToolResultDataPart
                    fileContents.push({
                        kind: 'data',
                        value: {
                            mimeType: imageMimeType,
                            data: fileContent.value
                        }
                    });
                }
                else {
                    // Check if the content is binary
                    const detected = detectEncodingFromBuffer({ buffer: fileContent.value, bytesRead: fileContent.value.byteLength });
                    if (detected.seemsBinary) {
                        // For binary files, return a message indicating they're not supported
                        // We do this for now until the tools that leverage this internal tool can support binary content
                        fileContents.push(localize('fetchWebPage.binaryNotSupported', 'Binary files are not supported at the moment.'));
                    }
                    else {
                        // For text files, convert to string
                        fileContents.push(fileContent.value.toString());
                    }
                }
                successfulFileUris.push(uri);
            }
            catch (error) {
                // If file service can't read it, treat as invalid
                fileContents.push(undefined);
            }
        }
        // Build results array in original order
        const results = [];
        let webIndex = 0;
        let fileIndex = 0;
        for (const url of urls) {
            if (invalidUris.has(url)) {
                results.push(undefined);
            }
            else if (webUris.has(url)) {
                results.push(webContents[webIndex]);
                webIndex++;
            }
            else if (fileUris.has(url)) {
                results.push(fileContents[fileIndex]);
                fileIndex++;
            }
            else {
                results.push(undefined);
            }
        }
        // Only include URIs that actually had content successfully fetched
        const actuallyValidUris = [...webUris.values(), ...successfulFileUris];
        return {
            content: this._getPromptPartsForResults(results),
            toolResultDetails: actuallyValidUris
        };
    }
    async prepareToolInvocation(context, token) {
        const { webUris, fileUris, invalidUris } = this._parseUris(context.parameters.urls);
        // Check which file URIs can actually be read
        const validFileUris = [];
        const additionalInvalidUrls = [];
        for (const [originalUrl, uri] of fileUris.entries()) {
            try {
                await this._fileService.stat(uri);
                validFileUris.push(uri);
            }
            catch (error) {
                // If file service can't stat it, treat as invalid
                additionalInvalidUrls.push(originalUrl);
            }
        }
        const invalid = [...Array.from(invalidUris), ...additionalInvalidUrls];
        const valid = [...webUris.values(), ...validFileUris];
        const urlsNeedingConfirmation = webUris.size > 0 ? [...webUris.values()].filter(url => !this._alreadyApprovedDomains.has(url)) : [];
        const pastTenseMessage = invalid.length
            ? invalid.length > 1
                // If there are multiple invalid URLs, show them all
                ? new MarkdownString(localize('fetchWebPage.pastTenseMessage.plural', 'Fetched {0} resources, but the following were invalid URLs:\n\n{1}\n\n', valid.length, invalid.map(url => `- ${url}`).join('\n')))
                // If there is only one invalid URL, show it
                : new MarkdownString(localize('fetchWebPage.pastTenseMessage.singular', 'Fetched resource, but the following was an invalid URL:\n\n{0}\n\n', invalid[0]))
            // No invalid URLs
            : new MarkdownString();
        const invocationMessage = new MarkdownString();
        if (valid.length > 1) {
            pastTenseMessage.appendMarkdown(localize('fetchWebPage.pastTenseMessageResult.plural', 'Fetched {0} resources', valid.length));
            invocationMessage.appendMarkdown(localize('fetchWebPage.invocationMessage.plural', 'Fetching {0} resources', valid.length));
        }
        else if (valid.length === 1) {
            const url = valid[0].toString();
            // If the URL is too long or it's a file url, show it as a link... otherwise, show it as plain text
            if (url.length > 400 || validFileUris.length === 1) {
                pastTenseMessage.appendMarkdown(localize({
                    key: 'fetchWebPage.pastTenseMessageResult.singularAsLink',
                    comment: [
                        // Make sure the link syntax is correct
                        '{Locked="]({0})"}',
                    ]
                }, 'Fetched [resource]({0})', url));
                invocationMessage.appendMarkdown(localize({
                    key: 'fetchWebPage.invocationMessage.singularAsLink',
                    comment: [
                        // Make sure the link syntax is correct
                        '{Locked="]({0})"}',
                    ]
                }, 'Fetching [resource]({0})', url));
            }
            else {
                pastTenseMessage.appendMarkdown(localize('fetchWebPage.pastTenseMessageResult.singular', 'Fetched {0}', url));
                invocationMessage.appendMarkdown(localize('fetchWebPage.invocationMessage.singular', 'Fetching {0}', url));
            }
        }
        const result = { invocationMessage, pastTenseMessage };
        if (urlsNeedingConfirmation.length) {
            let confirmationTitle;
            let confirmationMessage;
            if (urlsNeedingConfirmation.length === 1) {
                confirmationTitle = localize('fetchWebPage.confirmationTitle.singular', 'Fetch web page?');
                confirmationMessage = new MarkdownString(urlsNeedingConfirmation[0].toString(), { supportThemeIcons: true });
            }
            else {
                confirmationTitle = localize('fetchWebPage.confirmationTitle.plural', 'Fetch web pages?');
                confirmationMessage = new MarkdownString(urlsNeedingConfirmation.map(uri => `- ${uri.toString()}`).join('\n'), { supportThemeIcons: true });
            }
            result.confirmationMessages = {
                title: confirmationTitle,
                message: confirmationMessage,
                allowAutoConfirm: true,
                disclaimer: new MarkdownString('$(info) ' + localize('fetchWebPage.confirmationMessage.plural', 'Web content may contain malicious code or attempt prompt injection attacks.'), { supportThemeIcons: true })
            };
        }
        return result;
    }
    _parseUris(urls) {
        const webUris = new Map();
        const fileUris = new Map();
        const invalidUris = new Set();
        urls?.forEach(url => {
            try {
                const uriObj = URI.parse(url);
                if (uriObj.scheme === 'http' || uriObj.scheme === 'https') {
                    webUris.set(url, uriObj);
                }
                else {
                    // Try to handle other schemes via file service
                    fileUris.set(url, uriObj);
                }
            }
            catch (e) {
                invalidUris.add(url);
            }
        });
        return { webUris, fileUris, invalidUris };
    }
    _getPromptPartsForResults(results) {
        return results.map(value => {
            if (!value) {
                return {
                    kind: 'text',
                    value: localize('fetchWebPage.invalidUrl', 'Invalid URL')
                };
            }
            else if (typeof value === 'string') {
                return {
                    kind: 'text',
                    value: value
                };
            }
            else {
                // This is an IToolResultDataPart
                return value;
            }
        });
    }
    _getSupportedImageMimeType(uri) {
        const ext = extname(uri.path).toLowerCase();
        switch (ext) {
            case '.png':
                return ChatImageMimeType.PNG;
            case '.jpg':
            case '.jpeg':
                return ChatImageMimeType.JPEG;
            case '.gif':
                return ChatImageMimeType.GIF;
            case '.webp':
                return ChatImageMimeType.WEBP;
            case '.bmp':
                return ChatImageMimeType.BMP;
            default:
                return undefined;
        }
    }
};
FetchWebPageTool = __decorate([
    __param(0, IWebContentExtractorService),
    __param(1, IFileService)
], FetchWebPageTool);
export { FetchWebPageTool };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmV0Y2hQYWdlVG9vbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL2FkdmlrYXIvRG9jdW1lbnRzL2FyY2hpdGVjdC9hcmNoMi9BcmNoSURFL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvZWxlY3Ryb24tYnJvd3Nlci90b29scy9mZXRjaFBhZ2VUb29sLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBR2hHLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUMzRSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sbUNBQW1DLENBQUM7QUFDaEUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBQzdELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUN4RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sdUJBQXVCLENBQUM7QUFDakQsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLCtDQUErQyxDQUFDO0FBQzdFLE9BQU8sRUFBRSwyQkFBMkIsRUFBRSxNQUFNLDJFQUEyRSxDQUFDO0FBQ3hILE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLGtEQUFrRCxDQUFDO0FBQzVGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ25FLE9BQU8sRUFBaUwsY0FBYyxFQUFnQixNQUFNLDJDQUEyQyxDQUFDO0FBQ3hRLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLDZCQUE2QixDQUFDO0FBRXpFLE1BQU0sQ0FBQyxNQUFNLG9CQUFvQixHQUFjO0lBQzlDLEVBQUUsRUFBRSwwQkFBMEI7SUFDOUIsV0FBVyxFQUFFLGdCQUFnQjtJQUM3Qix1QkFBdUIsRUFBRSxLQUFLO0lBQzlCLGdCQUFnQixFQUFFLFFBQVEsQ0FBQywrQkFBK0IsRUFBRSxzSEFBc0gsQ0FBQztJQUNuTCxNQUFNLEVBQUUsY0FBYyxDQUFDLFFBQVE7SUFDL0IsV0FBVyxFQUFFO1FBQ1osSUFBSSxFQUFFLFFBQVE7UUFDZCxVQUFVLEVBQUU7WUFDWCxJQUFJLEVBQUU7Z0JBQ0wsSUFBSSxFQUFFLE9BQU87Z0JBQ2IsS0FBSyxFQUFFO29CQUNOLElBQUksRUFBRSxRQUFRO2lCQUNkO2dCQUNELFdBQVcsRUFBRSxRQUFRLENBQUMsOEJBQThCLEVBQUUseUNBQXlDLENBQUM7YUFDaEc7U0FDRDtRQUNELFFBQVEsRUFBRSxDQUFDLE1BQU0sQ0FBQztLQUNsQjtDQUNELENBQUM7QUFFSyxJQUFNLGdCQUFnQixHQUF0QixNQUFNLGdCQUFnQjtJQUc1QixZQUM4QixrQkFBZ0UsRUFDL0UsWUFBMkM7UUFEWCx1QkFBa0IsR0FBbEIsa0JBQWtCLENBQTZCO1FBQzlELGlCQUFZLEdBQVosWUFBWSxDQUFjO1FBSmxELDRCQUF1QixHQUFHLElBQUksV0FBVyxFQUFFLENBQUM7SUFLaEQsQ0FBQztJQUVMLEtBQUssQ0FBQyxNQUFNLENBQUMsVUFBMkIsRUFBRSxZQUFpQyxFQUFFLFNBQXVCLEVBQUUsS0FBd0I7UUFDN0gsTUFBTSxJQUFJLEdBQUksVUFBVSxDQUFDLFVBQWtDLENBQUMsSUFBSSxJQUFJLEVBQUUsQ0FBQztRQUN2RSxNQUFNLEVBQUUsT0FBTyxFQUFFLFFBQVEsRUFBRSxXQUFXLEVBQUUsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ2pFLE1BQU0sWUFBWSxHQUFHLENBQUMsR0FBRyxPQUFPLENBQUMsTUFBTSxFQUFFLEVBQUUsR0FBRyxRQUFRLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQztRQUVqRSxJQUFJLENBQUMsWUFBWSxDQUFDLE1BQU0sSUFBSSxXQUFXLENBQUMsSUFBSSxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQ3BELE9BQU87Z0JBQ04sT0FBTyxFQUFFLENBQUMsRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRSxRQUFRLENBQUMsMEJBQTBCLEVBQUUseUJBQXlCLENBQUMsRUFBRSxDQUFDO2FBQ25HLENBQUM7UUFDSCxDQUFDO1FBRUQsaUZBQWlGO1FBQ2pGLDJEQUEyRDtRQUMzRCxLQUFLLE1BQU0sR0FBRyxJQUFJLE9BQU8sQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDO1lBQ3BDLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDdkMsQ0FBQztRQUVELDZCQUE2QjtRQUM3QixNQUFNLFdBQVcsR0FBRyxPQUFPLENBQUMsSUFBSSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxJQUFJLENBQUMsa0JBQWtCLENBQUMsT0FBTyxDQUFDLENBQUMsR0FBRyxPQUFPLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7UUFFekcsOEJBQThCO1FBQzlCLE1BQU0sWUFBWSxHQUFpRCxFQUFFLENBQUM7UUFDdEUsTUFBTSxrQkFBa0IsR0FBVSxFQUFFLENBQUM7UUFDckMsS0FBSyxNQUFNLEdBQUcsSUFBSSxRQUFRLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQztZQUNyQyxJQUFJLENBQUM7Z0JBQ0osTUFBTSxXQUFXLEdBQUcsTUFBTSxJQUFJLENBQUMsWUFBWSxDQUFDLFFBQVEsQ0FBQyxHQUFHLEVBQUUsU0FBUyxFQUFFLEtBQUssQ0FBQyxDQUFDO2dCQUU1RSxnREFBZ0Q7Z0JBQ2hELE1BQU0sYUFBYSxHQUFHLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxHQUFHLENBQUMsQ0FBQztnQkFDM0QsSUFBSSxhQUFhLEVBQUUsQ0FBQztvQkFDbkIsMkRBQTJEO29CQUMzRCxZQUFZLENBQUMsSUFBSSxDQUFDO3dCQUNqQixJQUFJLEVBQUUsTUFBTTt3QkFDWixLQUFLLEVBQUU7NEJBQ04sUUFBUSxFQUFFLGFBQWE7NEJBQ3ZCLElBQUksRUFBRSxXQUFXLENBQUMsS0FBSzt5QkFDdkI7cUJBQ0QsQ0FBQyxDQUFDO2dCQUNKLENBQUM7cUJBQU0sQ0FBQztvQkFDUCxpQ0FBaUM7b0JBQ2pDLE1BQU0sUUFBUSxHQUFHLHdCQUF3QixDQUFDLEVBQUUsTUFBTSxFQUFFLFdBQVcsQ0FBQyxLQUFLLEVBQUUsU0FBUyxFQUFFLFdBQVcsQ0FBQyxLQUFLLENBQUMsVUFBVSxFQUFFLENBQUMsQ0FBQztvQkFFbEgsSUFBSSxRQUFRLENBQUMsV0FBVyxFQUFFLENBQUM7d0JBQzFCLHNFQUFzRTt3QkFDdEUsaUdBQWlHO3dCQUNqRyxZQUFZLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxpQ0FBaUMsRUFBRSwrQ0FBK0MsQ0FBQyxDQUFDLENBQUM7b0JBQ2pILENBQUM7eUJBQU0sQ0FBQzt3QkFDUCxvQ0FBb0M7d0JBQ3BDLFlBQVksQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDO29CQUNqRCxDQUFDO2dCQUNGLENBQUM7Z0JBRUQsa0JBQWtCLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQzlCLENBQUM7WUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO2dCQUNoQixrREFBa0Q7Z0JBQ2xELFlBQVksQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUM7WUFDOUIsQ0FBQztRQUNGLENBQUM7UUFFRCx3Q0FBd0M7UUFDeEMsTUFBTSxPQUFPLEdBQWlELEVBQUUsQ0FBQztRQUNqRSxJQUFJLFFBQVEsR0FBRyxDQUFDLENBQUM7UUFDakIsSUFBSSxTQUFTLEdBQUcsQ0FBQyxDQUFDO1FBQ2xCLEtBQUssTUFBTSxHQUFHLElBQUksSUFBSSxFQUFFLENBQUM7WUFDeEIsSUFBSSxXQUFXLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUM7Z0JBQzFCLE9BQU8sQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUM7WUFDekIsQ0FBQztpQkFBTSxJQUFJLE9BQU8sQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQztnQkFDN0IsT0FBTyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQztnQkFDcEMsUUFBUSxFQUFFLENBQUM7WUFDWixDQUFDO2lCQUFNLElBQUksUUFBUSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDO2dCQUM5QixPQUFPLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDO2dCQUN0QyxTQUFTLEVBQUUsQ0FBQztZQUNiLENBQUM7aUJBQU0sQ0FBQztnQkFDUCxPQUFPLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1lBQ3pCLENBQUM7UUFDRixDQUFDO1FBRUQsbUVBQW1FO1FBQ25FLE1BQU0saUJBQWlCLEdBQUcsQ0FBQyxHQUFHLE9BQU8sQ0FBQyxNQUFNLEVBQUUsRUFBRSxHQUFHLGtCQUFrQixDQUFDLENBQUM7UUFFdkUsT0FBTztZQUNOLE9BQU8sRUFBRSxJQUFJLENBQUMseUJBQXlCLENBQUMsT0FBTyxDQUFDO1lBQ2hELGlCQUFpQixFQUFFLGlCQUFpQjtTQUNwQyxDQUFDO0lBQ0gsQ0FBQztJQUVELEtBQUssQ0FBQyxxQkFBcUIsQ0FBQyxPQUEwQyxFQUFFLEtBQXdCO1FBQy9GLE1BQU0sRUFBRSxPQUFPLEVBQUUsUUFBUSxFQUFFLFdBQVcsRUFBRSxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUVwRiw2Q0FBNkM7UUFDN0MsTUFBTSxhQUFhLEdBQVUsRUFBRSxDQUFDO1FBQ2hDLE1BQU0scUJBQXFCLEdBQWEsRUFBRSxDQUFDO1FBQzNDLEtBQUssTUFBTSxDQUFDLFdBQVcsRUFBRSxHQUFHLENBQUMsSUFBSSxRQUFRLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQztZQUNyRCxJQUFJLENBQUM7Z0JBQ0osTUFBTSxJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztnQkFDbEMsYUFBYSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUN6QixDQUFDO1lBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztnQkFDaEIsa0RBQWtEO2dCQUNsRCxxQkFBcUIsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUM7WUFDekMsQ0FBQztRQUNGLENBQUM7UUFFRCxNQUFNLE9BQU8sR0FBRyxDQUFDLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsRUFBRSxHQUFHLHFCQUFxQixDQUFDLENBQUM7UUFDdkUsTUFBTSxLQUFLLEdBQUcsQ0FBQyxHQUFHLE9BQU8sQ0FBQyxNQUFNLEVBQUUsRUFBRSxHQUFHLGFBQWEsQ0FBQyxDQUFDO1FBQ3RELE1BQU0sdUJBQXVCLEdBQUcsT0FBTyxDQUFDLElBQUksR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxPQUFPLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO1FBRXBJLE1BQU0sZ0JBQWdCLEdBQUcsT0FBTyxDQUFDLE1BQU07WUFDdEMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxNQUFNLEdBQUcsQ0FBQztnQkFDbkIsb0RBQW9EO2dCQUNwRCxDQUFDLENBQUMsSUFBSSxjQUFjLENBQ25CLFFBQVEsQ0FDUCxzQ0FBc0MsRUFDdEMsd0VBQXdFLEVBQUUsS0FBSyxDQUFDLE1BQU0sRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsS0FBSyxHQUFHLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FDakksQ0FBQztnQkFDSCw0Q0FBNEM7Z0JBQzVDLENBQUMsQ0FBQyxJQUFJLGNBQWMsQ0FDbkIsUUFBUSxDQUNQLHdDQUF3QyxFQUN4QyxvRUFBb0UsRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQ2hGLENBQUM7WUFDSixrQkFBa0I7WUFDbEIsQ0FBQyxDQUFDLElBQUksY0FBYyxFQUFFLENBQUM7UUFFeEIsTUFBTSxpQkFBaUIsR0FBRyxJQUFJLGNBQWMsRUFBRSxDQUFDO1FBQy9DLElBQUksS0FBSyxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQztZQUN0QixnQkFBZ0IsQ0FBQyxjQUFjLENBQUMsUUFBUSxDQUFDLDRDQUE0QyxFQUFFLHVCQUF1QixFQUFFLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO1lBQy9ILGlCQUFpQixDQUFDLGNBQWMsQ0FBQyxRQUFRLENBQUMsdUNBQXVDLEVBQUUsd0JBQXdCLEVBQUUsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7UUFDN0gsQ0FBQzthQUFNLElBQUksS0FBSyxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUMvQixNQUFNLEdBQUcsR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxFQUFFLENBQUM7WUFDaEMsbUdBQW1HO1lBQ25HLElBQUksR0FBRyxDQUFDLE1BQU0sR0FBRyxHQUFHLElBQUksYUFBYSxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsQ0FBQztnQkFDcEQsZ0JBQWdCLENBQUMsY0FBYyxDQUFDLFFBQVEsQ0FBQztvQkFDeEMsR0FBRyxFQUFFLG9EQUFvRDtvQkFDekQsT0FBTyxFQUFFO3dCQUNSLHVDQUF1Qzt3QkFDdkMsbUJBQW1CO3FCQUNuQjtpQkFDRCxFQUFFLHlCQUF5QixFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUM7Z0JBQ3BDLGlCQUFpQixDQUFDLGNBQWMsQ0FBQyxRQUFRLENBQUM7b0JBQ3pDLEdBQUcsRUFBRSwrQ0FBK0M7b0JBQ3BELE9BQU8sRUFBRTt3QkFDUix1Q0FBdUM7d0JBQ3ZDLG1CQUFtQjtxQkFDbkI7aUJBQ0QsRUFBRSwwQkFBMEIsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDO1lBQ3RDLENBQUM7aUJBQU0sQ0FBQztnQkFDUCxnQkFBZ0IsQ0FBQyxjQUFjLENBQUMsUUFBUSxDQUFDLDhDQUE4QyxFQUFFLGFBQWEsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDO2dCQUM5RyxpQkFBaUIsQ0FBQyxjQUFjLENBQUMsUUFBUSxDQUFDLHlDQUF5QyxFQUFFLGNBQWMsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDO1lBQzVHLENBQUM7UUFDRixDQUFDO1FBRUQsTUFBTSxNQUFNLEdBQTRCLEVBQUUsaUJBQWlCLEVBQUUsZ0JBQWdCLEVBQUUsQ0FBQztRQUNoRixJQUFJLHVCQUF1QixDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ3BDLElBQUksaUJBQXlCLENBQUM7WUFDOUIsSUFBSSxtQkFBNEMsQ0FBQztZQUNqRCxJQUFJLHVCQUF1QixDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsQ0FBQztnQkFDMUMsaUJBQWlCLEdBQUcsUUFBUSxDQUFDLHlDQUF5QyxFQUFFLGlCQUFpQixDQUFDLENBQUM7Z0JBQzNGLG1CQUFtQixHQUFHLElBQUksY0FBYyxDQUN2Qyx1QkFBdUIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLEVBQUUsRUFDckMsRUFBRSxpQkFBaUIsRUFBRSxJQUFJLEVBQUUsQ0FDM0IsQ0FBQztZQUNILENBQUM7aUJBQU0sQ0FBQztnQkFDUCxpQkFBaUIsR0FBRyxRQUFRLENBQUMsdUNBQXVDLEVBQUUsa0JBQWtCLENBQUMsQ0FBQztnQkFDMUYsbUJBQW1CLEdBQUcsSUFBSSxjQUFjLENBQ3ZDLHVCQUF1QixDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEtBQUssR0FBRyxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQ3BFLEVBQUUsaUJBQWlCLEVBQUUsSUFBSSxFQUFFLENBQzNCLENBQUM7WUFDSCxDQUFDO1lBQ0QsTUFBTSxDQUFDLG9CQUFvQixHQUFHO2dCQUM3QixLQUFLLEVBQUUsaUJBQWlCO2dCQUN4QixPQUFPLEVBQUUsbUJBQW1CO2dCQUM1QixnQkFBZ0IsRUFBRSxJQUFJO2dCQUN0QixVQUFVLEVBQUUsSUFBSSxjQUFjLENBQUMsVUFBVSxHQUFHLFFBQVEsQ0FBQyx5Q0FBeUMsRUFBRSw2RUFBNkUsQ0FBQyxFQUFFLEVBQUUsaUJBQWlCLEVBQUUsSUFBSSxFQUFFLENBQUM7YUFDNU0sQ0FBQztRQUNILENBQUM7UUFDRCxPQUFPLE1BQU0sQ0FBQztJQUNmLENBQUM7SUFFTyxVQUFVLENBQUMsSUFBZTtRQUNqQyxNQUFNLE9BQU8sR0FBRyxJQUFJLEdBQUcsRUFBZSxDQUFDO1FBQ3ZDLE1BQU0sUUFBUSxHQUFHLElBQUksR0FBRyxFQUFlLENBQUM7UUFDeEMsTUFBTSxXQUFXLEdBQUcsSUFBSSxHQUFHLEVBQVUsQ0FBQztRQUV0QyxJQUFJLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxFQUFFO1lBQ25CLElBQUksQ0FBQztnQkFDSixNQUFNLE1BQU0sR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO2dCQUM5QixJQUFJLE1BQU0sQ0FBQyxNQUFNLEtBQUssTUFBTSxJQUFJLE1BQU0sQ0FBQyxNQUFNLEtBQUssT0FBTyxFQUFFLENBQUM7b0JBQzNELE9BQU8sQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLE1BQU0sQ0FBQyxDQUFDO2dCQUMxQixDQUFDO3FCQUFNLENBQUM7b0JBQ1AsK0NBQStDO29CQUMvQyxRQUFRLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxNQUFNLENBQUMsQ0FBQztnQkFDM0IsQ0FBQztZQUNGLENBQUM7WUFBQyxPQUFPLENBQUMsRUFBRSxDQUFDO2dCQUNaLFdBQVcsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDdEIsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUFDO1FBRUgsT0FBTyxFQUFFLE9BQU8sRUFBRSxRQUFRLEVBQUUsV0FBVyxFQUFFLENBQUM7SUFDM0MsQ0FBQztJQUVPLHlCQUF5QixDQUFDLE9BQXFEO1FBQ3RGLE9BQU8sT0FBTyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsRUFBRTtZQUMxQixJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7Z0JBQ1osT0FBTztvQkFDTixJQUFJLEVBQUUsTUFBTTtvQkFDWixLQUFLLEVBQUUsUUFBUSxDQUFDLHlCQUF5QixFQUFFLGFBQWEsQ0FBQztpQkFDekQsQ0FBQztZQUNILENBQUM7aUJBQU0sSUFBSSxPQUFPLEtBQUssS0FBSyxRQUFRLEVBQUUsQ0FBQztnQkFDdEMsT0FBTztvQkFDTixJQUFJLEVBQUUsTUFBTTtvQkFDWixLQUFLLEVBQUUsS0FBSztpQkFDWixDQUFDO1lBQ0gsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLGlDQUFpQztnQkFDakMsT0FBTyxLQUFLLENBQUM7WUFDZCxDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDO0lBRU8sMEJBQTBCLENBQUMsR0FBUTtRQUMxQyxNQUFNLEdBQUcsR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLFdBQVcsRUFBRSxDQUFDO1FBQzVDLFFBQVEsR0FBRyxFQUFFLENBQUM7WUFDYixLQUFLLE1BQU07Z0JBQ1YsT0FBTyxpQkFBaUIsQ0FBQyxHQUFHLENBQUM7WUFDOUIsS0FBSyxNQUFNLENBQUM7WUFDWixLQUFLLE9BQU87Z0JBQ1gsT0FBTyxpQkFBaUIsQ0FBQyxJQUFJLENBQUM7WUFDL0IsS0FBSyxNQUFNO2dCQUNWLE9BQU8saUJBQWlCLENBQUMsR0FBRyxDQUFDO1lBQzlCLEtBQUssT0FBTztnQkFDWCxPQUFPLGlCQUFpQixDQUFDLElBQUksQ0FBQztZQUMvQixLQUFLLE1BQU07Z0JBQ1YsT0FBTyxpQkFBaUIsQ0FBQyxHQUFHLENBQUM7WUFDOUI7Z0JBQ0MsT0FBTyxTQUFTLENBQUM7UUFDbkIsQ0FBQztJQUNGLENBQUM7Q0FDRCxDQUFBO0FBclBZLGdCQUFnQjtJQUkxQixXQUFBLDJCQUEyQixDQUFBO0lBQzNCLFdBQUEsWUFBWSxDQUFBO0dBTEYsZ0JBQWdCLENBcVA1QiJ9