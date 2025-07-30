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
import { TopError } from './topError.js';
import { ChatModeKind } from '../../constants.js';
import { ModeHeader } from './promptHeader/modeHeader.js';
import { URI } from '../../../../../../base/common/uri.js';
import { PromptToken } from '../codecs/tokens/promptToken.js';
import * as path from '../../../../../../base/common/path.js';
import { ChatPromptCodec } from '../codecs/chatPromptCodec.js';
import { FileReference } from '../codecs/tokens/fileReference.js';
import { assertDefined } from '../../../../../../base/common/types.js';
import { Emitter } from '../../../../../../base/common/event.js';
import { DeferredPromise } from '../../../../../../base/common/async.js';
import { InstructionsHeader } from './promptHeader/instructionsHeader.js';
import { ILogService } from '../../../../../../platform/log/common/log.js';
import { PromptVariableWithData } from '../codecs/tokens/promptVariable.js';
import { assert, assertNever } from '../../../../../../base/common/assert.js';
import { basename, dirname, joinPath } from '../../../../../../base/common/resources.js';
import { BaseToken } from '../codecs/base/baseToken.js';
import { PromptHeader } from './promptHeader/promptHeader.js';
import { ObservableDisposable } from '../utils/observableDisposable.js';
import { INSTRUCTIONS_LANGUAGE_ID, MODE_LANGUAGE_ID, PROMPT_LANGUAGE_ID } from '../promptTypes.js';
import { LinesDecoder } from '../codecs/base/linesCodec/linesDecoder.js';
import { IInstantiationService } from '../../../../../../platform/instantiation/common/instantiation.js';
import { MarkdownLink } from '../codecs/base/markdownCodec/tokens/markdownLink.js';
import { MarkdownToken } from '../codecs/base/markdownCodec/tokens/markdownToken.js';
import { FrontMatterHeader } from '../codecs/base/markdownExtensionsCodec/tokens/frontMatterHeader.js';
import { ResolveError } from '../../promptFileReferenceErrors.js';
import { IWorkbenchEnvironmentService } from '../../../../../services/environment/common/environmentService.js';
import { Schemas } from '../../../../../../base/common/network.js';
/**
 * Base prompt parser class that provides a common interface for all
 * prompt parsers that are responsible for parsing chat prompt syntax.
 */
let BasePromptParser = class BasePromptParser extends ObservableDisposable {
    /**
     * List of all tokens that were parsed from the prompt contents so far.
     */
    get tokens() {
        return [...this.receivedTokens];
    }
    /**
     * Reference to the prompt header object that holds metadata associated
     * with the prompt.
     */
    get header() {
        return this.promptHeader;
    }
    /**
     * Get contents of the prompt body.
     */
    async getBody() {
        const startLineNumber = (this.header !== undefined)
            ? this.header.range.endLineNumber + 1
            : 1;
        const decoder = new LinesDecoder(await this.promptContentsProvider.contents);
        const tokens = (await decoder.consumeAll())
            .filter(({ range }) => {
            return (range.startLineNumber >= startLineNumber);
        });
        return BaseToken.render(tokens);
    }
    /**
     * Event that is fired when the current prompt parser is settled.
     */
    onSettled(callback) {
        const disposable = this._onSettled.event(callback);
        const streamEnded = (this.stream?.ended && (this.stream.isDisposed === false));
        // if already in the error state or stream has already ended,
        // invoke the callback immediately but asynchronously
        if (streamEnded || this.errorCondition) {
            setTimeout(callback.bind(undefined, this.errorCondition));
            return disposable;
        }
        return disposable;
    }
    /**
     * If file reference resolution fails, this attribute will be set
     * to an error instance that describes the error condition.
     */
    get errorCondition() {
        return this._errorCondition;
    }
    /**
     * Whether file references resolution failed.
     * Set to `undefined` if the `resolve` method hasn't been ever called yet.
     */
    get resolveFailed() {
        if (!this.firstParseResult.gotFirstResult) {
            return undefined;
        }
        return !!this._errorCondition;
    }
    /**
     * Returned promise is resolved when the parser process is settled.
     * The settled state means that the prompt parser stream exists and
     * has ended, or an error condition has been set in case of failure.
     *
     * Furthermore, this function can be called multiple times and will
     * block until the latest prompt contents parsing logic is settled
     * (e.g., for every `onContentChanged` event of the prompt source).
     */
    async settled() {
        assert(this.started, 'Cannot wait on the parser that did not start yet.');
        await this.firstParseResult.promise;
        if (this.errorCondition) {
            return false;
        }
        // by the time when the `firstParseResult` promise is resolved,
        // this object may have been already disposed, hence noop
        if (this.isDisposed) {
            return false;
        }
        assertDefined(this.stream, 'No stream reference found.');
        const completed = await this.stream.settled;
        // if prompt header exists, also wait for it to be settled
        if (this.promptHeader) {
            const headerCompleted = await this.promptHeader.settled;
            if (!headerCompleted) {
                return false;
            }
        }
        return completed;
    }
    constructor(promptContentsProvider, options, instantiationService, envService, logService) {
        super();
        this.promptContentsProvider = promptContentsProvider;
        this.instantiationService = instantiationService;
        this.envService = envService;
        this.logService = logService;
        /**
         * Private field behind the readonly {@link tokens} property.
         */
        this.receivedTokens = [];
        /**
         * List of file references in the current branch of the file reference tree.
         */
        this._references = [];
        /**
         * The event is fired when lines or their content change.
         */
        this._onUpdate = this._register(new Emitter());
        /**
         * Subscribe to the event that is fired the parser state or contents
         * changes, including changes in the possible prompt child references.
         */
        this.onUpdate = this._onUpdate.event;
        /**
         * Event that is fired when the current prompt parser is settled.
         */
        this._onSettled = this._register(new Emitter());
        /**
         * The promise is resolved when at least one parse result (a stream or
         * an error) has been received from the prompt contents provider.
         */
        this.firstParseResult = new FirstParseResult();
        /**
         * Private attribute to track if the {@link start}
         * method has been already called at least once.
         */
        this.started = false;
        this.options = options;
        this._register(this.promptContentsProvider.onContentChanged((streamOrError) => {
            // process the received message
            this.onContentsChanged(streamOrError);
            // indicate that we've received at least one `onContentChanged` event
            this.firstParseResult.end();
        }));
        // dispose self when contents provider is disposed
        this._register(this.promptContentsProvider.onDispose(this.dispose.bind(this)));
    }
    /**
     * Handler the event event that is triggered when prompt contents change.
     *
     * @param streamOrError Either a binary stream of file contents, or an error object
     * 						that was generated during the reference resolve attempt.
     * @param seenReferences List of parent references that we've have already seen
     * 					 	during the process of traversing the references tree. It's
     * 						used to prevent the tree navigation to fall into an infinite
     * 						references recursion.
     */
    onContentsChanged(streamOrError) {
        // dispose and cleanup the previously received stream
        // object or an error condition, if any received yet
        this.stream?.dispose();
        delete this.stream;
        delete this._errorCondition;
        this.receivedTokens = [];
        // cleanup current prompt header object
        this.promptHeader?.dispose();
        delete this.promptHeader;
        // dispose all currently existing references
        this.disposeReferences();
        // if an error received, set up the error condition and stop
        if (streamOrError instanceof ResolveError) {
            this._errorCondition = streamOrError;
            this._onUpdate.fire();
            // when error received fire the 'onSettled' event immediately
            this._onSettled.fire(streamOrError);
            return;
        }
        // decode the byte stream to a stream of prompt tokens
        this.stream = ChatPromptCodec.decode(streamOrError);
        /**
         * !NOTE! The order of event subscriptions below is critical here because
         *        the `data` event is also starts the stream, hence changing
         *        the order of event subscriptions can lead to race conditions.
         *        See {@link ReadableStreamEvents} for more info.
         */
        // on error or stream end, dispose the stream and fire the update event
        this.stream.on('error', this.onStreamEnd.bind(this, this.stream));
        this.stream.on('end', this.onStreamEnd.bind(this, this.stream));
        // when some tokens received, process and store the references
        this.stream.on('data', (token) => {
            // store all markdown and prompt token references
            if ((token instanceof MarkdownToken) || (token instanceof PromptToken)) {
                this.receivedTokens.push(token);
            }
            // if a prompt header token received, create a new prompt header instance
            if (token instanceof FrontMatterHeader) {
                return this.createHeader(token);
            }
            // try to convert a prompt variable with data token into a file reference
            if (token instanceof PromptVariableWithData) {
                try {
                    this.handleLinkToken(FileReference.from(token));
                }
                catch (error) {
                    // the `FileReference.from` call might throw if the `PromptVariableWithData` token
                    // can not be converted into a valid `#file` reference, hence we ignore the error
                }
            }
            // note! the `isURL` is a simple check and needs to be improved to truly
            // 		 handle only file references, ignoring broken URLs or references
            if (token instanceof MarkdownLink && !token.isURL) {
                this.handleLinkToken(token);
            }
        });
        // calling `start` on a disposed stream throws, so we warn and return instead
        if (this.stream.isDisposed) {
            this.logService.warn(`[prompt parser][${basename(this.uri)}] cannot start stream that has been already disposed, aborting`);
            return;
        }
        // start receiving data on the stream
        this.stream.start();
    }
    /**
     * Create header object base on the target prompt file language ID.
     * The language ID is important here, because it defines what type
     * of metadata is valid for a prompt file and what type of related
     * diagnostics we would show to the user.
     */
    createHeader(headerToken) {
        const { languageId } = this.promptContentsProvider;
        if (languageId === PROMPT_LANGUAGE_ID) {
            this.promptHeader = new PromptHeader(headerToken, languageId);
        }
        if (languageId === INSTRUCTIONS_LANGUAGE_ID) {
            this.promptHeader = new InstructionsHeader(headerToken, languageId);
        }
        if (languageId === MODE_LANGUAGE_ID) {
            this.promptHeader = new ModeHeader(headerToken, languageId);
        }
        this.promptHeader?.start();
    }
    /**
     * Handle a new reference token inside prompt contents.
     */
    handleLinkToken(token) {
        let referenceUri;
        if (path.isAbsolute(token.path)) {
            referenceUri = URI.file(token.path);
            if (this.envService.remoteAuthority) {
                referenceUri = referenceUri.with({
                    scheme: Schemas.vscodeRemote,
                    authority: this.envService.remoteAuthority,
                });
            }
        }
        else {
            referenceUri = joinPath(dirname(this.uri), token.path);
        }
        this._references.push(new PromptReference(referenceUri, token));
        this._onUpdate.fire();
        return this;
    }
    /**
     * Handle the `stream` end event.
     *
     * @param stream The stream that has ended.
     * @param error Optional error object if stream ended with an error.
     */
    onStreamEnd(stream, error) {
        // decoders can fire the 'end' event also when they are get disposed,
        // but because we dispose them when a new stream is received, we can
        // safely ignore the event in this case
        if (stream.isDisposed === true) {
            return this;
        }
        if (error) {
            this.logService.warn(`[prompt parser][${basename(this.uri)}] received an error on the chat prompt decoder stream: ${error}`);
        }
        this._onUpdate.fire();
        this._onSettled.fire(error);
        return this;
    }
    disposeReferences() {
        this._references.length = 0;
    }
    /**
     * Start the prompt parser.
     */
    start(token) {
        // if already started, nothing to do
        if (this.started) {
            return this;
        }
        this.started = true;
        // if already in the error state that could be set
        // in the constructor, then nothing to do
        if (this.errorCondition) {
            return this;
        }
        this.promptContentsProvider.start(token);
        return this;
    }
    /**
     * Associated URI of the prompt.
     */
    get uri() {
        return this.promptContentsProvider.uri;
    }
    /**
     * Get a list of immediate child references of the prompt.
     */
    get references() {
        return [...this._references];
    }
    /**
     * Valid metadata records defined in the prompt header.
     */
    get metadata() {
        const { promptType } = this.promptContentsProvider;
        if (promptType === 'non-prompt') {
            return null;
        }
        if (this.header === undefined) {
            return { promptType };
        }
        if (this.header instanceof InstructionsHeader || this.header instanceof ModeHeader) {
            return { promptType, ...this.header.metadata };
        }
        const { tools, mode, description, model } = this.header.metadata;
        const result = {};
        if (description !== undefined) {
            result.description = description;
        }
        if (tools !== undefined && mode !== ChatModeKind.Ask && mode !== ChatModeKind.Edit) {
            result.tools = tools;
            result.mode = ChatModeKind.Agent;
        }
        else if (mode !== undefined) {
            result.mode = mode;
        }
        if (model !== undefined) {
            result.model = model;
        }
        return { promptType, ...result };
    }
    /**
     * The top most error of the current reference or any of its
     * possible child reference errors.
     */
    get topError() {
        if (this.errorCondition) {
            return new TopError({
                errorSubject: 'root',
                errorsCount: 1,
                originalError: this.errorCondition,
            });
        }
        return undefined;
    }
    /**
     * Returns a string representation of this object.
     */
    toString() {
        return `prompt:${this.uri.path}`;
    }
    /**
     * @inheritdoc
     */
    dispose() {
        if (this.isDisposed) {
            return;
        }
        this.disposeReferences();
        this.stream?.dispose();
        delete this.stream;
        this.promptHeader?.dispose();
        delete this.promptHeader;
        super.dispose();
    }
};
BasePromptParser = __decorate([
    __param(2, IInstantiationService),
    __param(3, IWorkbenchEnvironmentService),
    __param(4, ILogService)
], BasePromptParser);
export { BasePromptParser };
/**
 * Prompt reference object represents any reference inside prompt text
 * contents. For instance the file variable(`#file:/path/to/file.md`) or
 * a markdown link(`[#file:file.md](/path/to/file.md)`).
 */
export class PromptReference {
    constructor(uri, token) {
        this.uri = uri;
        this.token = token;
    }
    /**
     * Get the range of the `link` part of the reference.
     */
    get linkRange() {
        // `#file:` references
        if (this.token instanceof FileReference) {
            return this.token.dataRange;
        }
        // `markdown link` references
        if (this.token instanceof MarkdownLink) {
            return this.token.linkRange;
        }
        return undefined;
    }
    /**
     * Type of the reference, - either a prompt `#file` variable,
     * or a `markdown link` reference (`[caption](/path/to/file.md)`).
     */
    get type() {
        if (this.token instanceof FileReference) {
            return 'file';
        }
        if (this.token instanceof MarkdownLink) {
            return 'file';
        }
        assertNever(this.token, `Unknown token type '${this.token}'.`);
    }
    /**
     * Subtype of the reference, - either a prompt `#file` variable,
     * or a `markdown link` reference (`[caption](/path/to/file.md)`).
     */
    get subtype() {
        if (this.token instanceof FileReference) {
            return 'prompt';
        }
        if (this.token instanceof MarkdownLink) {
            return 'markdown';
        }
        assertNever(this.token, `Unknown token type '${this.token}'.`);
    }
    get range() {
        return this.token.range;
    }
    get path() {
        return this.token.path;
    }
    get text() {
        return this.token.text;
    }
    /**
     * Returns a string representation of this object.
     */
    toString() {
        return `prompt-reference/${this.type}:${this.subtype}/${this.token}`;
    }
}
/**
 * A tiny utility object that helps us to track existence
 * of at least one parse result from the content provider.
 */
class FirstParseResult extends DeferredPromise {
    constructor() {
        super(...arguments);
        /**
         * Private attribute to track if we have
         * received at least one result.
         */
        this._gotResult = false;
    }
    /**
     * Whether we've received at least one result.
     */
    get gotFirstResult() {
        return this._gotResult;
    }
    /**
     * Get underlying promise reference.
     */
    get promise() {
        return this.p;
    }
    /**
     * Complete the underlying promise.
     */
    end() {
        this._gotResult = true;
        super.complete(void 0)
            .catch(() => {
            // the complete method is never fails
            // so we can ignore the error here
        });
        return;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmFzZVByb21wdFBhcnNlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL2FkdmlrYXIvRG9jdW1lbnRzL2FyY2hpdGVjdC9hcmNoMi9BcmNoSURFL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvY29tbW9uL3Byb21wdFN5bnRheC9wYXJzZXJzL2Jhc2VQcm9tcHRQYXJzZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGVBQWUsQ0FBQztBQUN6QyxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFFbEQsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBQzFELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQztBQUMzRCxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0saUNBQWlDLENBQUM7QUFDOUQsT0FBTyxLQUFLLElBQUksTUFBTSx1Q0FBdUMsQ0FBQztBQUM5RCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sOEJBQThCLENBQUM7QUFDL0QsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLG1DQUFtQyxDQUFDO0FBRWxFLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQztBQUN2RSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sd0NBQXdDLENBQUM7QUFDakUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHdDQUF3QyxDQUFDO0FBQ3pFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHNDQUFzQyxDQUFDO0FBQzFFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQztBQUMzRSxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQztBQUk1RSxPQUFPLEVBQUUsTUFBTSxFQUFFLFdBQVcsRUFBRSxNQUFNLHlDQUF5QyxD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