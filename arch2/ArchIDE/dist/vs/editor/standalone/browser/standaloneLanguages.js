/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Color } from '../../../base/common/color.js';
import { Range } from '../../common/core/range.js';
import * as languages from '../../common/languages.js';
import { ILanguageService } from '../../common/languages/language.js';
import { ILanguageConfigurationService } from '../../common/languages/languageConfigurationRegistry.js';
import { ModesRegistry } from '../../common/languages/modesRegistry.js';
import { ILanguageFeaturesService } from '../../common/services/languageFeatures.js';
import * as standaloneEnums from '../../common/standalone/standaloneEnums.js';
import { StandaloneServices } from './standaloneServices.js';
import { compile } from '../common/monarch/monarchCompile.js';
import { MonarchTokenizer } from '../common/monarch/monarchLexer.js';
import { IStandaloneThemeService } from '../common/standaloneTheme.js';
import { IConfigurationService } from '../../../platform/configuration/common/configuration.js';
import { IMarkerService } from '../../../platform/markers/common/markers.js';
/**
 * Register information about a new language.
 */
export function register(language) {
    // Intentionally using the `ModesRegistry` here to avoid
    // instantiating services too quickly in the standalone editor.
    ModesRegistry.registerLanguage(language);
}
/**
 * Get the information of all the registered languages.
 */
export function getLanguages() {
    let result = [];
    result = result.concat(ModesRegistry.getLanguages());
    return result;
}
export function getEncodedLanguageId(languageId) {
    const languageService = StandaloneServices.get(ILanguageService);
    return languageService.languageIdCodec.encodeLanguageId(languageId);
}
/**
 * An event emitted when a language is associated for the first time with a text model.
 * @event
 */
export function onLanguage(languageId, callback) {
    return StandaloneServices.withServices(() => {
        const languageService = StandaloneServices.get(ILanguageService);
        const disposable = languageService.onDidRequestRichLanguageFeatures((encounteredLanguageId) => {
            if (encounteredLanguageId === languageId) {
                // stop listening
                disposable.dispose();
                // invoke actual listener
                callback();
            }
        });
        return disposable;
    });
}
/**
 * An event emitted when a language is associated for the first time with a text model or
 * when a language is encountered during the tokenization of another language.
 * @event
 */
export function onLanguageEncountered(languageId, callback) {
    return StandaloneServices.withServices(() => {
        const languageService = StandaloneServices.get(ILanguageService);
        const disposable = languageService.onDidRequestBasicLanguageFeatures((encounteredLanguageId) => {
            if (encounteredLanguageId === languageId) {
                // stop listening
                disposable.dispose();
                // invoke actual listener
                callback();
            }
        });
        return disposable;
    });
}
/**
 * Set the editing configuration for a language.
 */
export function setLanguageConfiguration(languageId, configuration) {
    const languageService = StandaloneServices.get(ILanguageService);
    if (!languageService.isRegisteredLanguageId(languageId)) {
        throw new Error(`Cannot set configuration for unknown language ${languageId}`);
    }
    const languageConfigurationService = StandaloneServices.get(ILanguageConfigurationService);
    return languageConfigurationService.register(languageId, configuration, 100);
}
/**
 * @internal
 */
export class EncodedTokenizationSupportAdapter {
    constructor(languageId, actual) {
        this._languageId = languageId;
        this._actual = actual;
    }
    dispose() {
        // NOOP
    }
    getInitialState() {
        return this._actual.getInitialState();
    }
    tokenize(line, hasEOL, state) {
        if (typeof this._actual.tokenize === 'function') {
            return TokenizationSupportAdapter.adaptTokenize(this._languageId, this._actual, line, state);
        }
        throw new Error('Not supported!');
    }
    tokenizeEncoded(line, hasEOL, state) {
        const result = this._actual.tokenizeEncoded(line, state);
        return new languages.EncodedTokenizationResult(result.tokens, result.endState);
    }
}
/**
 * @internal
 */
export class TokenizationSupportAdapter {
    constructor(_languageId, _actual, _languageService, _standaloneThemeService) {
        this._languageId = _languageId;
        this._actual = _actual;
        this._languageService = _languageService;
        this._standaloneThemeService = _standaloneThemeService;
    }
    dispose() {
        // NOOP
    }
    getInitialState() {
        return this._actual.getInitialState();
    }
    static _toClassicTokens(tokens, language) {
        const result = [];
        let previousStartIndex = 0;
        for (let i = 0, len = tokens.length; i < len; i++) {
            const t = tokens[i];
            let startIndex = t.startIndex;
            // Prevent issues stemming from a buggy external tokenizer.
            if (i === 0) {
                // Force first token to start at first index!
                startIndex = 0;
            }
            else if (startIndex < previousStartIndex) {
                // Force tokens to be after one another!
                startIndex = previousStartIndex;
            }
            result[i] = new languages.Token(startIndex, t.scopes, language);
            previousStartIndex = startIndex;
        }
        return result;
    }
    static adaptTokenize(language, actual, line, state) {
        const actualResult = actual.tokenize(line, state);
        const tokens = TokenizationSupportAdapter._toClassicTokens(actualResult.tokens, language);
        let endState;
        // try to save an object if possible
        if (actualResult.endState.equals(state)) {
            endState = state;
        }
        else {
            endState = actualResult.endState;
        }
        return new languages.TokenizationResult(tokens, endState);
    }
    tokenize(line, hasEOL, state) {
        return TokenizationSupportAdapter.adaptTokenize(this._languageId, this._actual, line, state);
    }
    _toBinaryTokens(languageIdCodec, tokens) {
        const languageId = languageIdCodec.encodeLanguageId(this._languageId);
        const tokenTheme = this._standaloneThemeService.getColorTheme().tokenTheme;
        const result = [];
        let resultLen = 0;
        let previousStartIndex = 0;
        for (let i = 0, len = tokens.length; i < len; i++) {
            const t = tokens[i];
            const metadata = tokenTheme.match(languageId, t.scopes) | 1024 /* MetadataConsts.BALANCED_BRACKETS_MASK */;
            if (resultLen > 0 && result[resultLen - 1] === metadata) {
                // same metadata
                continue;
            }
            let startIndex = t.startIndex;
            // Prevent issues stemming from a buggy external tokenizer.
            if (i === 0) {
                // Force first token to start at first index!
                startIndex = 0;
            }
            else if (startIndex < previousStartIndex) {
                // Force tokens to be after one another!
                startIndex = previousStartIndex;
            }
            result[resultLen++] = startIndex;
            result[resultLen++] = metadata;
            previousStartIndex = startIndex;
        }
        const actualResult = new Uint32Array(resultLen);
        for (let i = 0; i < resultLen; i++) {
            actualResult[i] = result[i];
        }
        return actualResult;
    }
    tokenizeEncoded(line, hasEOL, state) {
        const actualResult = this._actual.tokenize(line, state);
        const tokens = this._toBinaryTokens(this._languageService.languageIdCodec, actualResult.tokens);
        let endState;
        // try to save an object if possible
        if (actualResult.endState.equals(state)) {
            endState = state;
        }
        else {
            endState = actualResult.endState;
        }
        return new languages.EncodedTokenizationResult(tokens, endState);
    }
}
function isATokensProvider(provider) {
    return (typeof provider.getInitialState === 'function');
}
function isEncodedTokensProvider(provider) {
    return 'tokenizeEncoded' in provider;
}
function isThenable(obj) {
    return obj && typeof obj.then === 'function';
}
/**
 * Change the color map that is used for token colors.
 * Supported formats (hex): #RRGGBB, $RRGGBBAA, #RGB, #RGBA
 */
export function setColorMap(colorMap) {
    const standaloneThemeService = StandaloneServices.get(IStandaloneThemeService);
    if (colorMap) {
        const result = [null];
        for (let i = 1, len = colorMap.length; i < len; i++) {
            result[i] = Color.fromHex(colorMap[i]);
        }
        standaloneThemeService.setColorMapOverride(result);
    }
    else {
        standaloneThemeService.setColorMapOverride(null);
    }
}
/**
 * @internal
 */
function createTokenizationSupportAdapter(languageId, provider) {
    if (isEncodedTokensProvider(provider)) {
        return new EncodedTokenizationSupportAdapter(languageId, provider);
    }
    else {
        return new TokenizationSupportAdapter(languageId, provider, StandaloneServices.get(ILanguageService), StandaloneServices.get(IStandaloneThemeService));
    }
}
/**
 * Register a tokens provider factory for a language. This tokenizer will be exclusive with a tokenizer
 * set using `setTokensProvider` or one created using `setMonarchTokensProvider`, but will work together
 * with a tokens provider set using `registerDocumentSemanticTokensProvider` or `registerDocumentRangeSemanticTokensProvider`.
 */
export function registerTokensProviderFactory(languageId, factory) {
    const adaptedFactory = new languages.LazyTokenizationSupport(async () => {
        const result = await Promise.resolve(factory.create());
        if (!result) {
            return null;
        }
        if (isATokensProvider(result)) {
            return createTokenizationSupportAdapter(languageId, result);
        }
        return new MonarchTokenizer(StandaloneServices.get(ILanguageService), StandaloneServices.get(IStandaloneThemeService), languageId, compile(languageId, result), StandaloneServices.get(IConfigurationService));
    });
    return languages.TokenizationRegistry.registerFactory(languageId, adaptedFactory);
}
/**
 * Set the tokens provider for a language (manual implementation). This tokenizer will be exclusive
 * with a tokenizer created using `setMonarchTokensProvider`, or with `registerTokensProviderFactory`,
 * but will work together with a tokens provider set using `registerDocumentSemanticTokensProvider`
 * or `registerDocumentRangeSemanticTokensProvider`.
 */
export function setTokensProvider(languageId, provider) {
    const languageService = StandaloneServices.get(ILanguageService);
    if (!languageService.isRegisteredLanguageId(languageId)) {
        throw new Error(`Cannot set tokens provider for unknown language ${languageId}`);
    }
    if (isThenable(provider)) {
        return registerTokensProviderFactory(languageId, { create: () => provider });
    }
    return languages.TokenizationRegistry.register(languageId, createTokenizationSupportAdapter(languageId, provider));
}
/**
 * Set the tokens provider for a language (monarch implementation). This tokenizer will be exclusive
 * with a tokenizer set using `setTokensProvider`, or with `registerTokensProviderFactory`, but will
 * work together with a tokens provider set using `registerDocumentSemanticTokensProvider` or
 * `registerDocumentRangeSemanticTokensProvider`.
 */
export function setMonarchTokensProvider(languageId, languageDef) {
    const create = (languageDef) => {
        return new MonarchTokenizer(StandaloneServices.get(ILanguageService), StandaloneServices.get(IStandaloneThemeService), languageId, compile(languageId, languageDef), StandaloneServices.get(IConfigurationService));
    };
    if (isThenable(languageDef)) {
        return registerTokensProviderFactory(languageId, { create: () => languageDef });
    }
    return languages.TokenizationRegistry.register(languageId, create(languageDef));
}
/**
 * Register a reference provider (used by e.g. reference search).
 */
export function registerReferenceProvider(languageSelector, provider) {
    const languageFeaturesService = StandaloneServices.get(ILanguageFeaturesService);
    return languageFeaturesService.referenceProvider.register(languageSelector, provider);
}
/**
 * Register a rename provider (used by e.g. rename symbol).
 */
export function registerRenameProvider(languageSelector, provider) {
    const languageFeaturesService = StandaloneServices.get(ILanguageFeaturesService);
    return languageFeaturesService.renameProvider.register(languageSelector, provider);
}
/**
 * Register a new symbol-name provider (e.g., when a symbol is being renamed, show new possible symbol-names)
 */
export function registerNewSymbolNameProvider(languageSelector, provider) {
    const languageFeaturesService = StandaloneServices.get(ILanguageFeaturesService);
    return languageFeaturesService.newSymbolNamesProvider.register(languageSelector, provider);
}
/**
 * Register a signature help provider (used by e.g. parameter hints).
 */
export function registerSignatureHelpProvider(languageSelector, provider) {
    const languageFeaturesService = StandaloneServices.get(ILanguageFeaturesService);
    return languageFeaturesService.signatureHelpProvider.register(languageSelector, provider);
}
/**
 * Register a hover provider (used by e.g. editor hover).
 */
export function registerHoverProvider(languageSelector, provider) {
    const languageFeaturesService = StandaloneServices.get(ILanguageFeaturesService);
    return languageFeaturesService.hoverProvider.register(languageSelector, {
        provideHover: async (model, position, token, context) => {
            const word = model.getWordAtPosition(position);
            return Promise.resolve(provider.provideHover(model, position, token, context)).then((value) => {
                if (!value) {
                    return undefined;
                }
                if (!value.range && word) {
                    value.range = new Range(position.lineNumber, word.startColumn, position.lineNumber, word.endColumn);
                }
                if (!value.range) {
                    value.range = new Range(position.lineNumber, position.column, position.lineNumber, position.column);
                }
                return value;
            });
        }
    });
}
/**
 * Register a document symbol provider (used by e.g. outline).
 */
export function registerDocumentSymbolProvider(languageSelector, provider) {
    const languageFeaturesService = StandaloneServices.get(ILanguageFeaturesService);
    return languageFeaturesService.documentSymbolProvider.register(languageSelector, provider);
}
/**
 * Register a document highlight provider (used by e.g. highlight occurrences).
 */
export function registerDocumentHighlightProvider(languageSelector, provider) {
    const languageFeaturesService = StandaloneServices.get(ILanguageFeaturesService);
    return languageFeaturesService.documentHighlightProvider.register(languageSelector, provider);
}
/**
 * Register an linked editing range provider.
 */
export function registerLinkedEditingRangeProvider(languageSelector, provider) {
    const languageFeaturesService = StandaloneServices.get(ILanguageFeaturesService);
    return languageFeaturesService.linkedEditingRangeProvider.register(languageSelector, provider);
}
/**
 * Register a definition provider (used by e.g. go to definition).
 */
export function registerDefinitionProvider(languageSelector, provider) {
    const languageFeaturesService = StandaloneServices.get(ILanguageFeaturesService);
    return languageFeaturesService.definitionProvider.register(languageSelector, provider);
}
/**
 * Register a implementation provider (used by e.g. go to implementation).
 */
export function registerImplementationProvider(languageSelector, provider) {
    const languageFeaturesService = StandaloneServices.get(ILanguageFeaturesService);
    return languageFeaturesService.implementationProvider.register(languageSelector, provider);
}
/**
 * Register a type definition provider (used by e.g. go to type definition).
 */
export function registerTypeDefinitionProvider(languageSelector, provider) {
    const languageFeaturesService = StandaloneServices.get(ILanguageFeaturesService);
    return languageFeaturesService.typeDefinitionProvider.register(languageSelector, provider);
}
/**
 * Register a code lens provider (used by e.g. inline code lenses).
 */
export function registerCodeLensProvider(languageSelector, provider) {
    const languageFeaturesService = StandaloneServices.get(ILanguageFeaturesService);
    return languageFeaturesService.codeLensProvider.register(languageSelector, provider);
}
/**
 * Register a code action provider (used by e.g. quick fix).
 */
export function registerCodeActionProvider(languageSelector, provider, metadata) {
    const languageFeaturesService = StandaloneServices.get(ILanguageFeaturesService);
    return languageFeaturesService.codeActionProvider.register(languageSelector, {
        providedCodeActionKinds: metadata?.providedCodeActionKinds,
        documentation: metadata?.documentation,
        provideCodeActions: (model, range, context, token) => {
            const markerService = StandaloneServices.get(IMarkerService);
            const markers = markerService.read({ resource: model.uri }).filter(m => {
                return Range.areIntersectingOrTouching(m, range);
            });
            return provider.provideCodeActions(model, range, { markers, only: context.only, trigger: context.trigger }, token);
        },
        resolveCodeAction: provider.resolveCodeAction
    });
}
/**
 * Register a formatter that can handle only entire models.
 */
export function registerDocumentFormattingEditProvider(languageSelector, provider) {
    const languageFeaturesService = StandaloneServices.get(ILanguageFeaturesService);
    return languageFeaturesService.documentFormattingEditProvider.register(languageSelector, provider);
}
/**
 * Register a formatter that can handle a range inside a model.
 */
export function registerDocumentRangeFormattingEditProvider(languageSelector, provider) {
    const languageFeaturesService = StandaloneServices.get(ILanguageFeaturesService);
    return languageFeaturesService.documentRangeFormattingEditProvider.register(languageSelector, provider);
}
/**
 * Register a formatter than can do formatting as the user types.
 */
export function registerOnTypeFormattingEditProvider(languageSelector, provider) {
    const languageFeaturesService = StandaloneServices.get(ILanguageFeaturesService);
    return languageFeaturesService.onTypeFormattingEditProvider.register(languageSelector, provider);
}
/**
 * Register a link provider that can find links in text.
 */
export function registerLinkProvider(languageSelector, provider) {
    const languageFeaturesService = StandaloneServices.get(ILanguageFeaturesService);
    return languageFeaturesService.linkProvider.register(languageSelector, provider);
}
/**
 * Register a completion item provider (use by e.g. suggestions).
 */
export function registerCompletionItemProvider(languageSelector, provider) {
    const languageFeaturesService = StandaloneServices.get(ILanguageFeaturesService);
    return languageFeaturesService.completionProvider.register(languageSelector, provider);
}
/**
 * Register a document color provider (used by Color Picker, Color Decorator).
 */
export function registerColorProvider(languageSelector, provider) {
    const languageFeaturesService = StandaloneServices.get(ILanguageFeaturesService);
    return languageFeaturesService.colorProvider.register(languageSelector, provider);
}
/**
 * Register a folding range provider
 */
export function registerFoldingRangeProvider(languageSelector, provider) {
    const languageFeaturesService = StandaloneServices.get(ILanguageFeaturesService);
    return languageFeaturesService.foldingRangeProvider.register(languageSelector, provider);
}
/**
 * Register a declaration provider
 */
export function registerDeclarationProvider(languageSelector, provider) {
    const languageFeaturesService = StandaloneServices.get(ILanguageFeaturesService);
    return languageFeaturesService.declarationProvider.register(languageSelector, provider);
}
/**
 * Register a selection range provider
 */
export function registerSelectionRangeProvider(languageSelector, provider) {
    const languageFeaturesService = StandaloneServices.get(ILanguageFeaturesService);
    return languageFeaturesService.selectionRangeProvider.register(languageSelector, provider);
}
/**
 * Register a document semantic tokens provider. A semantic tokens provider will complement and enhance a
 * simple top-down tokenizer. Simple top-down tokenizers can be set either via `setMonarchTokensProvider`
 * or `setTokensProvider`.
 *
 * For the best user experience, register both a semantic tokens provider and a top-down tokenizer.
 */
export function registerDocumentSemanticTokensProvider(languageSelector, provider) {
    const languageFeaturesService = StandaloneServices.get(ILanguageFeaturesService);
    return languageFeaturesService.documentSemanticTokensProvider.register(languageSelector, provider);
}
/**
 * Register a document range semantic tokens provider. A semantic tokens provider will complement and enhance a
 * simple top-down tokenizer. Simple top-down tokenizers can be set either via `setMonarchTokensProvider`
 * or `setTokensProvider`.
 *
 * For the best user experience, register both a semantic tokens provider and a top-down tokenizer.
 */
export function registerDocumentRangeSemanticTokensProvider(languageSelector, provider) {
    const languageFeaturesService = StandaloneServices.get(ILanguageFeaturesService);
    return languageFeaturesService.documentRangeSemanticTokensProvider.register(languageSelector, provider);
}
/**
 * Register an inline completions provider.
 */
export function registerInlineCompletionsProvider(languageSelector, provider) {
    const languageFeaturesService = StandaloneServices.get(ILanguageFeaturesService);
    return languageFeaturesService.inlineCompletionsProvider.register(languageSelector, provider);
}
/**
 * Register an inlay hints provider.
 */
export function registerInlayHintsProvider(languageSelector, provider) {
    const languageFeaturesService = StandaloneServices.get(ILanguageFeaturesService);
    return languageFeaturesService.inlayHintsProvider.register(languageSelector, provider);
}
/**
 * @internal
 */
export function createMonacoLanguagesAPI() {
    return {
        register: register,
        getLanguages: getLanguages,
        onLanguage: onLanguage,
        onLanguageEncountered: onLanguageEncountered,
        getEncodedLanguageId: getEncodedLanguageId,
        // provider methods
        setLanguageConfiguration: setLanguageConfiguration,
        setColorMap: setColorMap,
        registerTokensProviderFactory: registerTokensProviderFactory,
        setTokensProvider: setTokensProvider,
        setMonarchTokensProvider: setMonarchTokensProvider,
        registerReferenceProvider: registerReferenceProvider,
        registerRenameProvider: registerRenameProvider,
        registerNewSymbolNameProvider: registerNewSymbolNameProvider,
        registerCompletionItemProvider: registerCompletionItemProvider,
        registerSignatureHelpProvider: registerSignatureHelpProvider,
        registerHoverProvider: registerHoverProvider,
        registerDocumentSymbolProvider: registerDocumentSymbolProvider,
        registerDocumentHighlightProvider: registerDocumentHighlightProvider,
        registerLinkedEditingRangeProvider: registerLinkedEditingRangeProvider,
        registerDefinitionProvider: registerDefinitionProvider,
        registerImplementationProvider: registerImplementationProvider,
        registerTypeDefinitionProvider: registerTypeDefinitionProvider,
        registerCodeLensProvider: registerCodeLensProvider,
        registerCodeActionProvider: registerCodeActionProvider,
        registerDocumentFormattingEditProvider: registerDocumentFormattingEditProvider,
        registerDocumentRangeFormattingEditProvider: registerDocumentRangeFormattingEditProvider,
        registerOnTypeFormattingEditProvider: registerOnTypeFormattingEditProvider,
        registerLinkProvider: registerLinkProvider,
        registerColorProvider: registerColorProvider,
        registerFoldingRangeProvider: registerFoldingRangeProvider,
        registerDeclarationProvider: registerDeclarationProvider,
        registerSelectionRangeProvider: registerSelectionRangeProvider,
        registerDocumentSemanticTokensProvider: registerDocumentSemanticTokensProvider,
        registerDocumentRangeSemanticTokensProvider: registerDocumentRangeSemanticTokensProvider,
        registerInlineCompletionsProvider: registerInlineCompletionsProvider,
        registerInlayHintsProvider: registerInlayHintsProvider,
        // enums
        DocumentHighlightKind: standaloneEnums.DocumentHighlightKind,
        CompletionItemKind: standaloneEnums.CompletionItemKind,
        CompletionItemTag: standaloneEnums.CompletionItemTag,
        CompletionItemInsertTextRule: standaloneEnums.CompletionItemInsertTextRule,
        SymbolKind: standaloneEnums.SymbolKind,
        SymbolTag: standaloneEnums.SymbolTag,
        IndentAction: standaloneEnums.IndentAction,
        CompletionTriggerKind: standaloneEnums.CompletionTriggerKind,
        SignatureHelpTriggerKind: standaloneEnums.SignatureHelpTriggerKind,
        InlayHintKind: standaloneEnums.InlayHintKind,
        InlineCompletionTriggerKind: standaloneEnums.InlineCompletionTriggerKind,
        CodeActionTriggerType: standaloneEnums.CodeActionTriggerType,
        NewSymbolNameTag: standaloneEnums.NewSymbolNameTag,
        NewSymbolNameTriggerKind: standaloneEnums.NewSymbolNameTriggerKind,
        PartialAcceptTriggerKind: standaloneEnums.PartialAcceptTriggerKind,
        HoverVerbosityAction: standaloneEnums.HoverVerbosityAction,
        InlineCompletionEndOfLifeReasonKind: standaloneEnums.InlineCompletionEndOfLifeReasonKind,
        // classes
        FoldingRangeKind: languages.FoldingRangeKind,
        SelectedSuggestionInfo: languages.SelectedSuggestionInfo,
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RhbmRhbG9uZUxhbmd1YWdlcy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL2FkdmlrYXIvRG9jdW1lbnRzL2FyY2hpdGVjdC9hcmNoMi9BcmNoSURFL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9zdGFuZGFsb25lL2Jyb3dzZXIvc3RhbmRhbG9uZUxhbmd1YWdlcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sK0JBQStCLENBQUM7QUFHdEQsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLDRCQUE0QixDQUFDO0FBRW5ELE9BQU8sS0FBSyxTQUFTLE1BQU0sMkJBQTJCLENBQUM7QUFDdkQsT0FBTyxFQUEyQixnQkFBZ0IsRUFBRSxNQUFNLG9DQUFvQyxDQUFDO0FBRS9GLE9BQU8sRUFBRSw2QkFBNkIsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQ3hHLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQztBQUd4RSxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQztBQUNyRixPQUFPLEtBQUssZUFBZSxNQUFNLDRDQUE0QyxDQUFDO0FBQzlFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHlCQUF5QixDQUFDO0FBQzdELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUM5RCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQztBQUVyRSxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQztBQUN2RSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQztBQUNoRyxPQUFPLEVBQWUsY0FBYyxFQUFFLE1BQU0sNkNBQTZDLENBQUM7QUFFMUY7O0dBRUc7QUFDSCxNQUFNLFVBQVUsUUFBUSxDQUFDLFFBQWlDO0lBQ3pELHdEQUF3RDtJQUN4RCwrREFBK0Q7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