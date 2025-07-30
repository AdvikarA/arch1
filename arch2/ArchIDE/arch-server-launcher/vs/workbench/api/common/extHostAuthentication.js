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
import * as nls from '../../../nls.js';
import { Emitter, Event } from '../../../base/common/event.js';
import { MainContext } from './extHost.protocol.js';
import { Disposable, ProgressLocation } from './extHostTypes.js';
import { ExtensionIdentifier } from '../../../platform/extensions/common/extensions.js';
import { INTERNAL_AUTH_PROVIDER_PREFIX } from '../../services/authentication/common/authentication.js';
import { createDecorator } from '../../../platform/instantiation/common/instantiation.js';
import { IExtHostRpcService } from './extHostRpcService.js';
import { URI } from '../../../base/common/uri.js';
import { fetchDynamicRegistration, getClaimsFromJWT, isAuthorizationErrorResponse, isAuthorizationTokenResponse } from '../../../base/common/oauth.js';
import { IExtHostWindow } from './extHostWindow.js';
import { IExtHostInitDataService } from './extHostInitDataService.js';
import { ILoggerService, ILogService } from '../../../platform/log/common/log.js';
import { autorun, derivedOpts, observableValue } from '../../../base/common/observable.js';
import { stringHash } from '../../../base/common/hash.js';
import { DisposableStore } from '../../../base/common/lifecycle.js';
import { IExtHostUrlsService } from './extHostUrls.js';
import { encodeBase64, VSBuffer } from '../../../base/common/buffer.js';
import { equals as arraysEqual } from '../../../base/common/arrays.js';
import { IExtHostProgress } from './extHostProgress.js';
import { CancellationError, isCancellationError } from '../../../base/common/errors.js';
import { raceCancellationError, SequencerByKey } from '../../../base/common/async.js';
export const IExtHostAuthentication = createDecorator('IExtHostAuthentication');
let ExtHostAuthentication = class ExtHostAuthentication {
    constructor(extHostRpc, _initData, _extHostWindow, _extHostUrls, _extHostProgress, _extHostLoggerService, _logService) {
        this._initData = _initData;
        this._extHostWindow = _extHostWindow;
        this._extHostUrls = _extHostUrls;
        this._extHostProgress = _extHostProgress;
        this._extHostLoggerService = _extHostLoggerService;
        this._logService = _logService;
        this._dynamicAuthProviderCtor = DynamicAuthProvider;
        this._authenticationProviders = new Map();
        this._providerOperations = new SequencerByKey();
        this._onDidChangeSessions = new Emitter();
        this._getSessionTaskSingler = new TaskSingler();
        this._onDidDynamicAuthProviderTokensChange = new Emitter();
        this._proxy = extHostRpc.getProxy(MainContext.MainThreadAuthentication);
    }
    /**
     * This sets up an event that will fire when the auth sessions change with a built-in filter for the extensionId
     * if a session change only affects a specific extension.
     * @param extensionId The extension that is interested in the event.
     * @returns An event with a built-in filter for the extensionId
     */
    getExtensionScopedSessionsEvent(extensionId) {
        const normalizedExtensionId = extensionId.toLowerCase();
        return Event.chain(this._onDidChangeSessions.event, ($) => $
            .filter(e => !e.extensionIdFilter || e.extensionIdFilter.includes(normalizedExtensionId))
            .map(e => ({ provider: e.provider })));
    }
    async getSession(requestingExtension, providerId, scopes, options = {}) {
        const extensionId = ExtensionIdentifier.toKey(requestingExtension.identifier);
        const sortedScopes = [...scopes].sort().join(' ');
        const keys = Object.keys(options);
        const optionsStr = keys.sort().map(key => `${key}:${!!options[key]}`).join(', ');
        return await this._getSessionTaskSingler.getOrCreate(`${extensionId} ${providerId} ${sortedScopes} ${optionsStr}`, async () => {
            await this._proxy.$ensureProvider(providerId);
            const extensionName = requestingExtension.displayName || requestingExtension.name;
            return this._proxy.$getSession(providerId, scopes, extensionId, extensionName, options);
        });
    }
    async getAccounts(providerId) {
        await this._proxy.$ensureProvider(providerId);
        return await this._proxy.$getAccounts(providerId);
    }
    registerAuthenticationProvider(id, label, provider, options) {
        // register
        void this._providerOperations.queue(id, async () => {
            // This use to be synchronous, but that wasn't an accurate representation because the main thread
            // may have unregistered the provider in the meantime. I don't see how this could really be done
            // synchronously, so we just say first one wins.
            if (this._authenticationProviders.get(id)) {
                this._logService.error(`An authentication provider with id '${id}' is already registered. The existing provider will not be replaced.`);
                return;
            }
            const listener = provider.onDidChangeSessions(e => this._proxy.$sendDidChangeSessions(id, e));
            this._authenticationProviders.set(id, { label, provider, disposable: listener, options: options ?? { supportsMultipleAccounts: false } });
            await this._proxy.$registerAuthenticationProvider(id, label, options?.supportsMultipleAccounts ?? false, options?.supportedAuthorizationServers);
        });
        // unregister
        return new Disposable(() => {
            void this._providerOperations.queue(id, async () => {
                const providerData = this._authenticationProviders.get(id);
                if (providerData) {
                    providerData.disposable?.dispose();
                    this._authenticationProviders.delete(id);
                    await this._proxy.$unregisterAuthenticationProvider(id);
                }
            });
        });
    }
    $createSession(providerId, scopes, options) {
        return this._providerOperations.queue(providerId, async () => {
            const providerData = this._authenticationProviders.get(providerId);
            if (providerData) {
                options.authorizationServer = URI.revive(options.authorizationServer);
                return await providerData.provider.createSession(scopes, options);
            }
            throw new Error(`Unable to find authentication provider with handle: ${providerId}`);
        });
    }
    $removeSession(providerId, sessionId) {
        return this._providerOperations.queue(providerId, async () => {
            const providerData = this._authenticationProviders.get(providerId);
            if (providerData) {
                return await providerData.provider.removeSession(sessionId);
            }
            throw new Error(`Unable to find authentication provider with handle: ${providerId}`);
        });
    }
    $getSessions(providerId, scopes, options) {
        return this._providerOperations.queue(providerId, async () => {
            const providerData = this._authenticationProviders.get(providerId);
            if (providerData) {
                options.authorizationServer = URI.revive(options.authorizationServer);
                return await providerData.provider.getSessions(scopes, options);
            }
            throw new Error(`Unable to find authentication provider with handle: ${providerId}`);
        });
    }
    $onDidChangeAuthenticationSessions(id, label, extensionIdFilter) {
        // Don't fire events for the internal auth providers
        if (!id.startsWith(INTERNAL_AUTH_PROVIDER_PREFIX)) {
            this._onDidChangeSessions.fire({ provider: { id, label }, extensionIdFilter });
        }
        return Promise.resolve();
    }
    $onDidUnregisterAuthenticationProvider(id) {
        return this._providerOperations.queue(id, async () => {
            const providerData = this._authenticationProviders.get(id);
            if (providerData) {
                providerData.disposable?.dispose();
                this._authenticationProviders.delete(id);
            }
        });
    }
    async $registerDynamicAuthProvider(authorizationServerComponents, serverMetadata, resourceMetadata, clientId, clientSecret, initialTokens) {
        if (!clientId) {
            const authorizationServer = URI.revive(authorizationServerComponents);
            if (serverMetadata.registration_endpoint) {
                try {
                    const registration = await fetchDynamicRegistration(serverMetadata, this._initData.environment.appName, resourceMetadata?.scopes_supported);
                    clientId = registration.client_id;
                    clientSecret = registration.client_secret;
                }
                catch (err) {
                    this._logService.warn(`Dynamic registration failed for ${authorizationServer.toString()}: ${err.message}. Prompting user for client ID and client secret...`);
                }
            }
            // Still no client id so dynamic client registration was either not supported or failed
            if (!clientId) {
                this._logService.info(`Prompting user for client registration details for ${authorizationServer.toString()}`);
                const clientDetails = await this._proxy.$promptForClientRegistration(authorizationServer.toString());
                if (!clientDetails) {
                    throw new Error('User did not provide client details');
                }
                clientId = clientDetails.clientId;
                clientSecret = clientDetails.clientSecret;
                this._logService.info(`User provided client registration for ${authorizationServer.toString()}`);
                if (clientSecret) {
                    this._logService.trace(`User provided client secret for ${authorizationServer.toString()}`);
                }
                else {
                    this._logService.trace(`User did not provide client secret for ${authorizationServer.toString()}`);
                }
            }
        }
        const provider = new this._dynamicAuthProviderCtor(this._extHostWindow, this._extHostUrls, this._initData, this._extHostProgress, this._extHostLoggerService, this._proxy, URI.revive(authorizationServerComponents), serverMetadata, resourceMetadata, clientId, clientSecret, this._onDidDynamicAuthProviderTokensChange, initialTokens || []);
        // Use the sequencer to ensure dynamic provider registration is serialized
        await this._providerOperations.queue(provider.id, async () => {
            this._authenticationProviders.set(provider.id, {
                label: provider.label,
                provider,
                disposable: Disposable.from(provider, provider.onDidChangeSessions(e => this._proxy.$sendDidChangeSessions(provider.id, e)), provider.onDidChangeClientId(() => this._proxy.$sendDidChangeDynamicProviderInfo({
                    providerId: provider.id,
                    clientId: provider.clientId,
                    clientSecret: provider.clientSecret
                }))),
                options: { supportsMultipleAccounts: false }
            });
            await this._proxy.$registerDynamicAuthenticationProvider(provider.id, provider.label, provider.authorizationServer, provider.clientId, provider.clientSecret);
        });
        return provider.id;
    }
    async $onDidChangeDynamicAuthProviderTokens(authProviderId, clientId, tokens) {
        this._onDidDynamicAuthProviderTokensChange.fire({ authProviderId, clientId, tokens });
    }
};
ExtHostAuthentication = __decorate([
    __param(0, IExtHostRpcService),
    __param(1, IExtHostInitDataService),
    __param(2, IExtHostWindow),
    __param(3, IExtHostUrlsService),
    __param(4, IExtHostProgress),
    __param(5, ILoggerService),
    __param(6, ILogService)
], ExtHostAuthentication);
export { ExtHostAuthentication };
class TaskSingler {
    constructor() {
        this._inFlightPromises = new Map();
    }
    getOrCreate(key, promiseFactory) {
        const inFlight = this._inFlightPromises.get(key);
        if (inFlight) {
            return inFlight;
        }
        const promise = promiseFactory().finally(() => this._inFlightPromises.delete(key));
        this._inFlightPromises.set(key, promise);
        return promise;
    }
}
let DynamicAuthProvider = class DynamicAuthProvider {
    constructor(_extHostWindow, _extHostUrls, _initData, _extHostProgress, loggerService, _proxy, authorizationServer, _serverMetadata, _resourceMetadata, _clientId, _clientSecret, onDidDynamicAuthProviderTokensChange, initialTokens) {
        this._extHostWindow = _extHostWindow;
        this._extHostUrls = _extHostUrls;
        this._initData = _initData;
        this._extHostProgress = _extHostProgress;
        this._proxy = _proxy;
        this.authorizationServer = authorizationServer;
        this._serverMetadata = _serverMetadata;
        this._resourceMetadata = _resourceMetadata;
        this._clientId = _clientId;
        this._clientSecret = _clientSecret;
        this._onDidChangeSessions = new Emitter();
        this.onDidChangeSessions = this._onDidChangeSessions.event;
        this._onDidChangeClientId = new Emitter();
        this.onDidChangeClientId = this._onDidChangeClientId.event;
        const stringifiedServer = authorizationServer.toString(true);
        // Auth Provider Id is a combination of the authorization server and the resource, if provided.
        this.id = _resourceMetadata?.resource
            ? stringifiedServer + ' ' + _resourceMetadata?.resource
            : stringifiedServer;
        // Auth Provider label is just the resource name if provided, otherwise the authority of the authorization server.
        this.label = _resourceMetadata?.resource_name ?? this.authorizationServer.authority;
        this._logger = loggerService.createLogger(this.id, { name: this.label });
        this._disposable = new DisposableStore();
        this._disposable.add(this._onDidChangeSessions);
        const scopedEvent = Event.chain(onDidDynamicAuthProviderTokensChange.event, $ => $
            .filter(e => e.authProviderId === this.id && e.clientId === _clientId)
            .map(e => e.tokens));
        this._tokenStore = this._disposable.add(new TokenStore({
            onDidChange: scopedEvent,
            set: (tokens) => _proxy.$setSessionsForDynamicAuthProvider(this.id, this.clientId, tokens),
        }, initialTokens, this._logger));
        this._disposable.add(this._tokenStore.onDidChangeSessions(e => this._onDidChangeSessions.fire(e)));
        // Will be extended later to support other flows
        this._createFlows = [];
        if (_serverMetadata.authorization_endpoint) {
            this._createFlows.push({
                label: nls.localize('url handler', "URL Handler"),
                handler: (scopes, progress, token) => this._createWithUrlHandler(scopes, progress, token)
            });
        }
    }
    get clientId() {
        return this._clientId;
    }
    get clientSecret() {
        return this._clientSecret;
    }
    async getSessions(scopes, _options) {
        this._logger.info(`Getting sessions for scopes: ${scopes?.join(' ') ?? 'all'}`);
        if (!scopes) {
            return this._tokenStore.sessions;
        }
        // The oauth spec says tthat order doesn't matter so we sort the scopes for easy comparison
        // https://datatracker.ietf.org/doc/html/rfc6749#section-3.3
        // TODO@TylerLeonhardt: Do this for all scope handling in the auth APIs
        const sortedScopes = [...scopes].sort();
        const scopeStr = scopes.join(' ');
        let sessions = this._tokenStore.sessions.filter(session => arraysEqual([...session.scopes].sort(), sortedScopes));
        this._logger.info(`Found ${sessions.length} sessions for scopes: ${scopeStr}`);
        if (sessions.length) {
            const newTokens = [];
            const removedTokens = [];
            const tokenMap = new Map(this._tokenStore.tokens.map(token => [token.access_token, token]));
            for (const session of sessions) {
                const token = tokenMap.get(session.accessToken);
                if (token && token.expires_in) {
                    const now = Date.now();
                    const expiresInMS = token.expires_in * 1000;
                    // Check if the token is about to expire in 5 minutes or if it is expired
                    if (now > token.created_at + expiresInMS - (5 * 60 * 1000)) {
                        this._logger.info(`Token for session ${session.id} is about to expire, refreshing...`);
                        removedTokens.push(token);
                        if (!token.refresh_token) {
                            // No refresh token available, cannot refresh
                            this._logger.warn(`No refresh token available for scopes ${session.scopes.join(' ')}. Throwing away token.`);
                            continue;
                        }
                        try {
                            const newToken = await this.exchangeRefreshTokenForToken(token.refresh_token);
                            // TODO@TylerLeonhardt: When the core scope handling doesn't care about order, this check should be
                            // updated to not care about order
                            if (newToken.scope !== scopeStr) {
                                this._logger.warn(`Token scopes '${newToken.scope}' do not match requested scopes '${scopeStr}'. Overwriting token with what was requested...`);
                                newToken.scope = scopeStr;
                            }
                            this._logger.info(`Successfully created a new token for scopes ${session.scopes.join(' ')}.`);
                            newTokens.push(newToken);
                        }
                        catch (err) {
                            this._logger.error(`Failed to refresh token: ${err}`);
                        }
                    }
                }
            }
            if (newTokens.length || removedTokens.length) {
                this._tokenStore.update({ added: newTokens, removed: removedTokens });
                // Since we updated the tokens, we need to re-filter the sessions
                // to get the latest state
                sessions = this._tokenStore.sessions.filter(session => arraysEqual([...session.scopes].sort(), sortedScopes));
            }
            this._logger.info(`Found ${sessions.length} sessions for scopes: ${scopeStr}`);
            return sessions;
        }
        return [];
    }
    async createSession(scopes, _options) {
        this._logger.info(`Creating session for scopes: ${scopes.join(' ')}`);
        let token;
        for (let i = 0; i < this._createFlows.length; i++) {
            const { handler } = this._createFlows[i];
            try {
                token = await this._extHostProgress.withProgressFromSource({ label: this.label, id: this.id }, {
                    location: ProgressLocation.Notification,
                    title: nls.localize('authenticatingTo', "Authenticating to '{0}'", this.label),
                    cancellable: true
                }, (progress, token) => handler(scopes, progress, token));
                if (token) {
                    break;
                }
            }
            catch (err) {
                const nextMode = this._createFlows[i + 1]?.label;
                if (!nextMode) {
                    break; // No more flows to try
                }
                const message = isCancellationError(err)
                    ? nls.localize('userCanceledContinue', "Having trouble authenticating to '{0}'? Would you like to try a different way? ({1})", this.label, nextMode)
                    : nls.localize('continueWith', "You have not yet finished authenticating to '{0}'. Would you like to try a different way? ({1})", this.label, nextMode);
                const result = await this._proxy.$showContinueNotification(message);
                if (!result) {
                    throw new CancellationError();
                }
                this._logger.error(`Failed to create token via flow '${nextMode}': ${err}`);
            }
        }
        if (!token) {
            throw new Error('Failed to create authentication token');
        }
        if (token.scope !== scopes.join(' ')) {
            this._logger.warn(`Token scopes '${token.scope}' do not match requested scopes '${scopes.join(' ')}'. Overwriting token with what was requested...`);
            token.scope = scopes.join(' ');
        }
        // Store session for later retrieval
        this._tokenStore.update({ added: [{ ...token, created_at: Date.now() }], removed: [] });
        const session = this._tokenStore.sessions.find(t => t.accessToken === token.access_token);
        this._logger.info(`Created session for scopes: ${token.scope}`);
        return session;
    }
    async removeSession(sessionId) {
        this._logger.info(`Removing session with id: ${sessionId}`);
        const session = this._tokenStore.sessions.find(session => session.id === sessionId);
        if (!session) {
            this._logger.error(`Session with id ${sessionId} not found`);
            return;
        }
        const token = this._tokenStore.tokens.find(token => token.access_token === session.accessToken);
        if (!token) {
            this._logger.error(`Failed to retrieve token for removed session: ${session.id}`);
            return;
        }
        this._tokenStore.update({ added: [], removed: [token] });
        this._logger.info(`Removed token for session: ${session.id} with scopes: ${session.scopes.join(' ')}`);
    }
    dispose() {
        this._disposable.dispose();
    }
    async _createWithUrlHandler(scopes, progress, token) {
        if (!this._serverMetadata.authorization_endpoint) {
            throw new Error('Authorization Endpoint required');
        }
        if (!this._serverMetadata.token_endpoint) {
            throw new Error('Token endpoint not available in server metadata');
        }
        // Generate PKCE code verifier (random string) and code challenge (SHA-256 hash of verifier)
        const codeVerifier = this.generateRandomString(64);
        const codeChallenge = await this.generateCodeChallenge(codeVerifier);
        // Generate a random state value to prevent CSRF
        const nonce = this.generateRandomString(32);
        const callbackUri = URI.parse(`${this._initData.environment.appUriScheme}://dynamicauthprovider/${this.authorizationServer.authority}/authorize?nonce=${nonce}`);
        let state;
        try {
            state = await this._extHostUrls.createAppUri(callbackUri);
        }
        catch (error) {
            throw new Error(`Failed to create external URI: ${error}`);
        }
        // Prepare the authorization request URL
        const authorizationUrl = new URL(this._serverMetadata.authorization_endpoint);
        authorizationUrl.searchParams.append('client_id', this._clientId);
        authorizationUrl.searchParams.append('response_type', 'code');
        authorizationUrl.searchParams.append('state', state.toString());
        authorizationUrl.searchParams.append('code_challenge', codeChallenge);
        authorizationUrl.searchParams.append('code_challenge_method', 'S256');
        const scopeString = scopes.join(' ');
        if (scopeString) {
            // If non-empty scopes are provided, include scope parameter in the request
            authorizationUrl.searchParams.append('scope', scopeString);
        }
        if (this._resourceMetadata?.resource) {
            // If a resource is specified, include it in the request
            authorizationUrl.searchParams.append('resource', this._resourceMetadata.resource);
        }
        // Use a redirect URI that matches what was registered during dynamic registration
        const redirectUri = 'https://vscode.dev/redirect';
        authorizationUrl.searchParams.append('redirect_uri', redirectUri);
        const promise = this.waitForAuthorizationCode(callbackUri);
        // Open the browser for user authorization
        this._logger.info(`Opening authorization URL for scopes: ${scopeString}`);
        this._logger.trace(`Authorization URL: ${authorizationUrl.toString()}`);
        const opened = await this._extHostWindow.openUri(authorizationUrl.toString(), {});
        if (!opened) {
            throw new CancellationError();
        }
        progress.report({
            message: nls.localize('completeAuth', "Complete the authentication in the browser window that has opened."),
        });
        // Wait for the authorization code via a redirect
        let code;
        try {
            const response = await raceCancellationError(promise, token);
            code = response.code;
        }
        catch (err) {
            if (isCancellationError(err)) {
                this._logger.info('Authorization code request was cancelled by the user.');
                throw err;
            }
            this._logger.error(`Failed to receive authorization code: ${err}`);
            throw new Error(`Failed to receive authorization code: ${err}`);
        }
        this._logger.info(`Authorization code received for scopes: ${scopeString}`);
        // Exchange the authorization code for tokens
        const tokenResponse = await this.exchangeCodeForToken(code, codeVerifier, redirectUri);
        return tokenResponse;
    }
    generateRandomString(length) {
        const array = new Uint8Array(length);
        crypto.getRandomValues(array);
        return Array.from(array)
            .map(b => b.toString(16).padStart(2, '0'))
            .join('')
            .substring(0, length);
    }
    async generateCodeChallenge(codeVerifier) {
        const encoder = new TextEncoder();
        const data = encoder.encode(codeVerifier);
        const digest = await crypto.subtle.digest('SHA-256', data);
        // Base64url encode the digest
        return encodeBase64(VSBuffer.wrap(new Uint8Array(digest)), false, false)
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '');
    }
    async waitForAuthorizationCode(expectedState) {
        const result = await this._proxy.$waitForUriHandler(expectedState);
        // Extract the code parameter directly from the query string. NOTE, URLSearchParams does not work here because
        // it will decode the query string and we need to keep it encoded.
        const codeMatch = /[?&]code=([^&]+)/.exec(result.query || '');
        if (!codeMatch || codeMatch.length < 2) {
            // No code parameter found in the query string
            throw new Error('Authentication failed: No authorization code received');
        }
        return { code: codeMatch[1] };
    }
    async exchangeCodeForToken(code, codeVerifier, redirectUri) {
        if (!this._serverMetadata.token_endpoint) {
            throw new Error('Token endpoint not available in server metadata');
        }
        const tokenRequest = new URLSearchParams();
        tokenRequest.append('client_id', this._clientId);
        tokenRequest.append('grant_type', 'authorization_code');
        tokenRequest.append('code', code);
        tokenRequest.append('redirect_uri', redirectUri);
        tokenRequest.append('code_verifier', codeVerifier);
        // Add client secret if available
        if (this._clientSecret) {
            tokenRequest.append('client_secret', this._clientSecret);
        }
        this._logger.info('Exchanging authorization code for token...');
        this._logger.trace(`Url: ${this._serverMetadata.token_endpoint}`);
        this._logger.trace(`Token request body: ${tokenRequest.toString()}`);
        let response;
        try {
            response = await fetch(this._serverMetadata.token_endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Accept': 'application/json'
                },
                body: tokenRequest.toString()
            });
        }
        catch (err) {
            this._logger.error(`Failed to exchange authorization code for token: ${err}`);
            throw new Error(`Failed to exchange authorization code for token: ${err}`);
        }
        if (!response.ok) {
            const text = await response.text();
            throw new Error(`Token exchange failed: ${response.status} ${response.statusText} - ${text}`);
        }
        const result = await response.json();
        if (isAuthorizationTokenResponse(result)) {
            this._logger.info(`Successfully exchanged authorization code for token.`);
            return result;
        }
        else if (isAuthorizationErrorResponse(result) && result.error === "invalid_client" /* AuthorizationErrorType.InvalidClient */) {
            this._logger.warn(`Client ID (${this._clientId}) was invalid, generated a new one.`);
            await this._generateNewClientId();
            throw new Error(`Client ID was invalid, generated a new one. Please try again.`);
        }
        throw new Error(`Invalid authorization token response: ${JSON.stringify(result)}`);
    }
    async exchangeRefreshTokenForToken(refreshToken) {
        if (!this._serverMetadata.token_endpoint) {
            throw new Error('Token endpoint not available in server metadata');
        }
        const tokenRequest = new URLSearchParams();
        tokenRequest.append('client_id', this._clientId);
        tokenRequest.append('grant_type', 'refresh_token');
        tokenRequest.append('refresh_token', refreshToken);
        // Add client secret if available
        if (this._clientSecret) {
            tokenRequest.append('client_secret', this._clientSecret);
        }
        const response = await fetch(this._serverMetadata.token_endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'application/json'
            },
            body: tokenRequest.toString()
        });
        const result = await response.json();
        if (isAuthorizationTokenResponse(result)) {
            return {
                ...result,
                created_at: Date.now(),
            };
        }
        else if (isAuthorizationErrorResponse(result) && result.error === "invalid_client" /* AuthorizationErrorType.InvalidClient */) {
            this._logger.warn(`Client ID (${this._clientId}) was invalid, generated a new one.`);
            await this._generateNewClientId();
            throw new Error(`Client ID was invalid, generated a new one. Please try again.`);
        }
        throw new Error(`Invalid authorization token response: ${JSON.stringify(result)}`);
    }
    async _generateNewClientId() {
        try {
            const registration = await fetchDynamicRegistration(this._serverMetadata, this._initData.environment.appName, this._resourceMetadata?.scopes_supported);
            this._clientId = registration.client_id;
            this._clientSecret = registration.client_secret;
            this._onDidChangeClientId.fire();
        }
        catch (err) {
            // When DCR fails, try to prompt the user for a client ID and client secret
            this._logger.info(`Dynamic registration failed for ${this.authorizationServer.toString()}: ${err}. Prompting user for client ID and client secret.`);
            try {
                const clientDetails = await this._proxy.$promptForClientRegistration(this.authorizationServer.toString());
                if (!clientDetails) {
                    throw new Error('User did not provide client details');
                }
                this._clientId = clientDetails.clientId;
                this._clientSecret = clientDetails.clientSecret;
                this._logger.info(`User provided client ID for ${this.authorizationServer.toString()}`);
                if (clientDetails.clientSecret) {
                    this._logger.info(`User provided client secret for ${this.authorizationServer.toString()}`);
                }
                else {
                    this._logger.info(`User did not provide client secret for ${this.authorizationServer.toString()} (optional)`);
                }
                this._onDidChangeClientId.fire();
            }
            catch (promptErr) {
                this._logger.error(`Failed to fetch new client ID and user did not provide one: ${err}`);
                throw new Error(`Failed to fetch new client ID and user did not provide one: ${err}`);
            }
        }
    }
};
DynamicAuthProvider = __decorate([
    __param(0, IExtHostWindow),
    __param(1, IExtHostUrlsService),
    __param(2, IExtHostInitDataService),
    __param(3, IExtHostProgress),
    __param(4, ILoggerService)
], DynamicAuthProvider);
export { DynamicAuthProvider };
class TokenStore {
    constructor(_persistence, initialTokens, _logger) {
        this._persistence = _persistence;
        this._logger = _logger;
        this._onDidChangeSessions = new Emitter();
        this.onDidChangeSessions = this._onDidChangeSessions.event;
        this._disposable = new DisposableStore();
        this._tokensObservable = observableValue('tokens', initialTokens);
        this._sessionsObservable = derivedOpts({ equalsFn: (a, b) => arraysEqual(a, b, (a, b) => a.accessToken === b.accessToken) }, (reader) => this._tokensObservable.read(reader).map(t => this._getSessionFromToken(t)));
        this._disposable.add(this._registerChangeEventAutorun());
        this._disposable.add(this._persistence.onDidChange((tokens) => this._tokensObservable.set(tokens, undefined)));
    }
    get tokens() {
        return this._tokensObservable.get();
    }
    get sessions() {
        return this._sessionsObservable.get();
    }
    dispose() {
        this._disposable.dispose();
    }
    update({ added, removed }) {
        this._logger.trace(`Updating tokens: added ${added.length}, removed ${removed.length}`);
        const currentTokens = [...this._tokensObservable.get()];
        for (const token of removed) {
            const index = currentTokens.findIndex(t => t.access_token === token.access_token);
            if (index !== -1) {
                currentTokens.splice(index, 1);
            }
        }
        for (const token of added) {
            const index = currentTokens.findIndex(t => t.access_token === token.access_token);
            if (index === -1) {
                currentTokens.push(token);
            }
            else {
                currentTokens[index] = token;
            }
        }
        if (added.length || removed.length) {
            this._tokensObservable.set(currentTokens, undefined);
            void this._persistence.set(currentTokens);
        }
        this._logger.trace(`Tokens updated: ${currentTokens.length} tokens stored.`);
    }
    _registerChangeEventAutorun() {
        let previousSessions = [];
        return autorun((reader) => {
            this._logger.trace('Checking for session changes...');
            const currentSessions = this._sessionsObservable.read(reader);
            if (previousSessions === currentSessions) {
                this._logger.trace('No session changes detected.');
                return;
            }
            if (!currentSessions || currentSessions.length === 0) {
                // If currentSessions is undefined, all previous sessions are considered removed
                this._logger.trace('All sessions removed.');
                if (previousSessions.length > 0) {
                    this._onDidChangeSessions.fire({
                        added: [],
                        removed: previousSessions,
                        changed: []
                    });
                    previousSessions = [];
                }
                return;
            }
            const added = [];
            const removed = [];
            // Find added sessions
            for (const current of currentSessions) {
                const exists = previousSessions.some(prev => prev.accessToken === current.accessToken);
                if (!exists) {
                    added.push(current);
                }
            }
            // Find removed sessions
            for (const prev of previousSessions) {
                const exists = currentSessions.some(current => current.accessToken === prev.accessToken);
                if (!exists) {
                    removed.push(prev);
                }
            }
            // Fire the event if there are any changes
            if (added.length > 0 || removed.length > 0) {
                this._logger.trace(`Sessions changed: added ${added.length}, removed ${removed.length}`);
                this._onDidChangeSessions.fire({ added, removed, changed: [] });
            }
            // Update previous sessions reference
            previousSessions = currentSessions;
        });
    }
    _getSessionFromToken(token) {
        let claims;
        if (token.id_token) {
            try {
                claims = getClaimsFromJWT(token.id_token);
            }
            catch (e) {
                // log
            }
        }
        if (!claims) {
            try {
                claims = getClaimsFromJWT(token.access_token);
            }
            catch (e) {
                // log
            }
        }
        const scopes = token.scope
            ? token.scope.split(' ')
            : claims?.scope
                ? claims.scope.split(' ')
                : [];
        return {
            id: stringHash(token.access_token, 0).toString(),
            accessToken: token.access_token,
            account: {
                id: claims?.sub || 'unknown',
                // TODO: Don't say MCP...
                label: claims?.preferred_username || claims?.name || claims?.email || 'MCP',
            },
            scopes: scopes,
            idToken: token.id_token
        };
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdEF1dGhlbnRpY2F0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMvYWR2aWthci9Eb2N1bWVudHMvYXJjaGl0ZWN0L2FyY2gyL0FyY2hJREUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS9jb21tb24vZXh0SG9zdEF1dGhlbnRpY2F0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBR2hHLE9BQU8sS0FBSyxHQUFHLE1BQU0saUJBQWlCLENBQUM7QUFDdkMsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUMvRCxPQUFPLEVBQUUsV0FBVyxFQUE2RCxNQUFNLHVCQUF1QixDQUFDO0FBQy9HLE9BQU8sRUFBRSxVQUFVLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxtQkFBbUIsQ0FBQztBQUNqRSxPQUFPLEVBQXlCLG1CQUFtQixFQUFFLE1BQU0sbURBQW1ELENBQUM7QUFDL0csT0FBTyxFQUFFLDZCQUE2QixFQUFFLE1BQU0sd0RBQXdELENBQUM7QUFDdkcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHlEQUF5RCxDQUFDO0FBQzFGLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHdCQUF3QixDQUFDO0FBQzVELE9BQU8sRUFBRSxHQUFHLEVBQWlCLE1BQU0sNkJBQTZCLENBQUM7QUFDakUsT0FBTyxFQUEwQix3QkFBd0IsRUFBRSxnQkFBZ0IsRUFBK0gsNEJBQTRCLEVBQUUsNEJBQTRCLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQztBQUM1UyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sb0JBQW9CLENBQUM7QUFDcEQsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sNkJBQTZCLENBQUM7QUFDdEUsT0FBTyxFQUFXLGNBQWMsRUFBRSxXQUFXLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQztBQUMzRixPQUFPLEVBQUUsT0FBTyxFQUFFLFdBQVcsRUFBb0MsZUFBZSxFQUFFLE1BQU0sb0NBQW9DLENBQUM7QUFDN0gsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLDhCQUE4QixDQUFDO0FBQzFELE9BQU8sRUFBRSxlQUFlLEVBQWUsTUFBTSxtQ0FBbUMsQ0FBQztBQUNqRixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxrQkFBa0IsQ0FBQztBQUN2RCxPQUFPLEVBQUUsWUFBWSxFQUFFLFFBQVEsRUFBRSxNQUFNLGdDQUFnQyxDQUFDO0FBQ3hFLE9BQU8sRUFBRSxNQUFNLElBQUksV0FBVyxFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDdkUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sc0JBQXNCLENBQUM7QUFFeEQsT0FBTyxFQUFFLGlCQUFpQixFQUFFLG1CQUFtQixFQUFFLE1BQU0sZ0NBQWdDLENBQUM7QUFDeEYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLGNBQWMsRUFBRSxNQUFNLCtCQUErQixDQUFDO0FBR3RGLE1BQU0sQ0FBQyxNQUFNLHNCQUFzQixHQUFHLGVBQWUsQ0FBeUIsd0JBQXdCLENBQUMsQ0FBQztBQVNqRyxJQUFNLHFCQUFxQixHQUEzQixNQUFNLHFCQUFxQjtJQWVqQyxZQUNxQixVQUE4QixFQUN6QixTQUFtRCxFQUM1RCxjQUErQyxFQUMxQyxZQUFrRCxFQUNyRCxnQkFBbUQsRUFDckQscUJBQXNELEVBQ3pELFdBQXlDO1FBTFosY0FBUyxHQUFULFNBQVMsQ0FBeUI7UUFDM0MsbUJBQWMsR0FBZCxjQUFjLENBQWdCO1FBQ3pCLGlCQUFZLEdBQVosWUFBWSxDQUFxQjtRQUNwQyxxQkFBZ0IsR0FBaEIsZ0JBQWdCLENBQWtCO1FBQ3BDLDBCQUFxQixHQUFyQixxQkFBcUIsQ0FBZ0I7UUFDeEMsZ0JBQVcsR0FBWCxXQUFXLENBQWE7UUFsQnBDLDZCQUF3QixHQUFHLG1CQUFtQixDQUFDO1FBRzFELDZCQUF3QixHQUFzQyxJQUFJLEdBQUcsRUFBZ0MsQ0FBQztRQUN0Ryx3QkFBbUIsR0FBRyxJQUFJLGNBQWMsRUFBVSxDQUFDO1FBRW5ELHlCQUFvQixHQUFHLElBQUksT0FBTyxFQUErRSxDQUFDO1FBQ2xILDJCQUFzQixHQUFHLElBQUksV0FBVyxFQUE0QyxDQUFDO1FBRXJGLDBDQUFxQyxHQUFHLElBQUksT0FBTyxFQUErRSxDQUFDO1FBVzFJLElBQUksQ0FBQyxNQUFNLEdBQUcsVUFBVSxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsd0JBQXdCLENBQUMsQ0FBQztJQUN6RSxDQUFDO0lBRUQ7Ozs7O09BS0c7SUFDSCwrQkFBK0IsQ0FBQyxXQUFtQjtRQUNsRCxNQUFNLHFCQUFxQixHQUFHLFdBQVcsQ0FBQyxXQUFXLEVBQUUsQ0FBQztRQUN4RCxPQUFPLEtBQUssQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLG9CQUFvQixDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQzthQUMxRCxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxpQkFBaUIsSUFBSSxDQUFDLENBQUMsaUJBQWlCLENBQUMsUUFBUSxDQUFDLHFCQUFxQixDQUFDLENBQUM7YUFDeEYsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLFFBQVEsRUFBRSxDQUFDLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQyxDQUNyQyxDQUFDO0lBQ0gsQ0FBQztJQU1ELEtBQUssQ0FBQyxVQUFVLENBQUMsbUJBQTBDLEVBQUUsVUFBa0IsRUFBRSxNQUF5QixFQUFFLFVBQWtELEVBQUU7UUFDL0osTUFBTSxXQUFXLEdBQUcsbUJBQW1CLENBQUMsS0FBSyxDQUFDLG1CQUFtQixDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBQzlFLE1BQU0sWUFBWSxHQUFHLENBQUMsR0FBRyxNQUFNLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDbEQsTUFBTSxJQUFJLEdBQXFELE1BQU0sQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFxRCxDQUFDO1FBQ3hJLE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDakYsT0FBTyxNQUFNLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxXQUFXLENBQUMsR0FBRyxXQUFXLElBQUksVUFBVSxJQUFJLFlBQVksSUFBSSxVQUFVLEVBQUUsRUFBRSxLQUFLLElBQUksRUFBRTtZQUM3SCxNQUFNLElBQUksQ0FBQyxNQUFNLENBQUMsZUFBZSxDQUFDLFVBQVUsQ0FBQyxDQUFDO1lBQzlDLE1BQU0sYUFBYSxHQUFHLG1CQUFtQixDQUFDLFdBQVcsSUFBSSxtQkFBbUIsQ0FBQyxJQUFJLENBQUM7WUFDbEYsT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxVQUFVLEVBQUUsTUFBTSxFQUFFLFdBQVcsRUFBRSxhQUFhLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFDekYsQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDO0lBRUQsS0FBSyxDQUFDLFdBQVcsQ0FBQyxVQUFrQjtRQUNuQyxNQUFNLElBQUksQ0FBQyxNQUFNLENBQUMsZUFBZSxDQUFDLFVBQVUsQ0FBQyxDQUFDO1FBQzlDLE9BQU8sTUFBTSxJQUFJLENBQUMsTUFBTSxDQUFDLFlBQVksQ0FBQyxVQUFVLENBQUMsQ0FBQztJQUNuRCxDQUFDO0lBRUQsOEJBQThCLENBQUMsRUFBVSxFQUFFLEtBQWEsRUFBRSxRQUF1QyxFQUFFLE9BQThDO1FBQ2hKLFdBQVc7UUFDWCxLQUFLLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxLQUFLLENBQUMsRUFBRSxFQUFFLEtBQUssSUFBSSxFQUFFO1lBQ2xELGlHQUFpRztZQUNqRyxnR0FBZ0c7WUFDaEcsZ0RBQWdEO1lBQ2hELElBQUksSUFBSSxDQUFDLHdCQUF3QixDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDO2dCQUMzQyxJQUFJLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyx1Q0FBdUMsRUFBRSxzRUFBc0UsQ0FBQyxDQUFDO2dCQUN4SSxPQUFPO1lBQ1IsQ0FBQztZQUNELE1BQU0sUUFBUSxHQUFHLFFBQVEsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsc0JBQXNCLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDOUYsSUFBSSxDQUFDLHdCQUF3QixDQUFDLEdBQUcsQ0FBQyxFQUFFLEVBQUUsRUFBRSxLQUFLLEVBQUUsUUFBUSxFQUFFLFVBQVUsRUFBRSxRQUFRLEVBQUUsT0FBTyxFQUFFLE9BQU8sSUFBSSxFQUFFLHdCQUF3QixFQUFFLEtBQUssRUFBRSxFQUFFLENBQUMsQ0FBQztZQUMxSSxNQUFNLElBQUksQ0FBQyxNQUFNLENBQUMsK0JBQStCLENBQUMsRUFBRSxFQUFFLEtBQUssRUFBRSxPQUFPLEVBQUUsd0JBQXdCLElBQUksS0FBSyxFQUFFLE9BQU8sRUFBRSw2QkFBNkIsQ0FBQyxDQUFDO1FBQ2xKLENBQUMsQ0FBQyxDQUFDO1FBRUgsYUFBYTtRQUNiLE9BQU8sSUFBSSxVQUFVLENBQUMsR0FBRyxFQUFFO1lBQzFCLEtBQUssSUFBSSxDQUFDLG1CQUFtQixDQUFDLEtBQUssQ0FBQyxFQUFFLEVBQUUsS0FBSyxJQUFJLEVBQUU7Z0JBQ2xELE1BQU0sWUFBWSxHQUFHLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUM7Z0JBQzNELElBQUksWUFBWSxFQUFFLENBQUM7b0JBQ2xCLFlBQVksQ0FBQyxVQUFVLEVBQUUsT0FBTyxFQUFFLENBQUM7b0JBQ25DLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUM7b0JBQ3pDLE1BQU0sSUFBSSxDQUFDLE1BQU0sQ0FBQyxpQ0FBaUMsQ0FBQyxFQUFFLENBQUMsQ0FBQztnQkFDekQsQ0FBQztZQUNGLENBQUMsQ0FBQyxDQUFDO1FBQ0osQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDO0lBRUQsY0FBYyxDQUFDLFVBQWtCLEVBQUUsTUFBZ0IsRUFBRSxPQUFvRDtRQUN4RyxPQUFPLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxLQUFLLENBQUMsVUFBVSxFQUFFLEtBQUssSUFBSSxFQUFFO1lBQzVELE1BQU0sWUFBWSxHQUFHLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLENBQUM7WUFDbkUsSUFBSSxZQUFZLEVBQUUsQ0FBQztnQkFDbEIsT0FBTyxDQUFDLG1CQUFtQixHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLG1CQUFtQixDQUFDLENBQUM7Z0JBQ3RFLE9BQU8sTUFBTSxZQUFZLENBQUMsUUFBUSxDQUFDLGFBQWEsQ0FBQyxNQUFNLEVBQUUsT0FBTyxDQUFDLENBQUM7WUFDbkUsQ0FBQztZQUVELE1BQU0sSUFBSSxLQUFLLENBQUMsdURBQXVELFVBQVUsRUFBRSxDQUFDLENBQUM7UUFDdEYsQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDO0lBRUQsY0FBYyxDQUFDLFVBQWtCLEVBQUUsU0FBaUI7UUFDbkQsT0FBTyxJQUFJLENBQUMsbUJBQW1CLENBQUMsS0FBSyxDQUFDLFVBQVUsRUFBRSxLQUFLLElBQUksRUFBRTtZQUM1RCxNQUFNLFlBQVksR0FBRyxJQUFJLENBQUMsd0JBQXdCLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxDQUFDO1lBQ25FLElBQUksWUFBWSxFQUFFLENBQUM7Z0JBQ2xCLE9BQU8sTUFBTSxZQUFZLENBQUMsUUFBUSxDQUFDLGFBQWEsQ0FBQyxTQUFTLENBQUMsQ0FBQztZQUM3RCxDQUFDO1lBRUQsTUFBTSxJQUFJLEtBQUssQ0FBQyx1REFBdUQsVUFBVSxFQUFFLENBQUMsQ0FBQztRQUN0RixDQUFDLENBQUMsQ0FBQztJQUNKLENBQUM7SUFFRCxZQUFZLENBQUMsVUFBa0IsRUFBRSxNQUF5QyxFQUFFLE9BQW9EO1FBQy9ILE9BQU8sSUFBSSxDQUFDLG1CQUFtQixDQUFDLEtBQUssQ0FBQyxVQUFVLEVBQUUsS0FBSyxJQUFJLEVBQUU7WUFDNUQsTUFBTSxZQUFZLEdBQUcsSUFBSSxDQUFDLHdCQUF3QixDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsQ0FBQztZQUNuRSxJQUFJLFlBQVksRUFBRSxDQUFDO2dCQUNsQixPQUFPLENBQUMsbUJBQW1CLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsbUJBQW1CLENBQUMsQ0FBQztnQkFDdEUsT0FBTyxNQUFNLFlBQVksQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLE1BQU0sRUFBRSxPQUFPLENBQUMsQ0FBQztZQUNqRSxDQUFDO1lBRUQsTUFBTSxJQUFJLEtBQUssQ0FBQyx1REFBdUQsVUFBVSxFQUFFLENBQUMsQ0FBQztRQUN0RixDQUFDLENBQUMsQ0FBQztJQUNKLENBQUM7SUFFRCxrQ0FBa0MsQ0FBQyxFQUFVLEVBQUUsS0FBYSxFQUFFLGlCQUE0QjtRQUN6RixvREFBb0Q7UUFDcEQsSUFBSSxDQUFDLEVBQUUsQ0FBQyxVQUFVLENBQUMsNkJBQTZCLENBQUMsRUFBRSxDQUFDO1lBQ25ELElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsRUFBRSxRQUFRLEVBQUUsRUFBRSxFQUFFLEVBQUUsS0FBSyxFQUFFLEVBQUUsaUJBQWlCLEVBQUUsQ0FBQyxDQUFDO1FBQ2hGLENBQUM7UUFDRCxPQUFPLE9BQU8sQ0FBQyxPQUFPLEVBQUUsQ0FBQztJQUMxQixDQUFDO0lBRUQsc0NBQXNDLENBQUMsRUFBVTtRQUNoRCxPQUFPLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxLQUFLLENBQUMsRUFBRSxFQUFFLEtBQUssSUFBSSxFQUFFO1lBQ3BELE1BQU0sWUFBWSxHQUFHLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDM0QsSUFBSSxZQUFZLEVBQUUsQ0FBQztnQkFDbEIsWUFBWSxDQUFDLFVBQVUsRUFBRSxPQUFPLEVBQUUsQ0FBQztnQkFDbkMsSUFBSSxDQUFDLHdCQUF3QixDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQztZQUMxQyxDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQUM7SUFDSixDQUFDO0lBRUQsS0FBSyxDQUFDLDRCQUE0QixDQUNqQyw2QkFBNEMsRUFDNUMsY0FBNEMsRUFDNUMsZ0JBQXFFLEVBQ3JFLFFBQTRCLEVBQzVCLFlBQWdDLEVBQ2hDLGFBQWdEO1FBRWhELElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUNmLE1BQU0sbUJBQW1CLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyw2QkFBNkIsQ0FBQyxDQUFDO1lBQ3RFLElBQUksY0FBYyxDQUFDLHFCQUFxQixFQUFFLENBQUM7Z0JBQzFDLElBQUksQ0FBQztvQkFDSixNQUFNLFlBQVksR0FBRyxNQUFNLHdCQUF3QixDQUFDLGNBQWMsRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLFdBQVcsQ0FBQyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQztvQkFDNUksUUFBUSxHQUFHLFlBQVksQ0FBQyxTQUFTLENBQUM7b0JBQ2xDLFlBQVksR0FBRyxZQUFZLENBQUMsYUFBYSxDQUFDO2dCQUMzQyxDQUFDO2dCQUFDLE9BQU8sR0FBRyxFQUFFLENBQUM7b0JBQ2QsSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsbUNBQW1DLG1CQUFtQixDQUFDLFFBQVEsRUFBRSxLQUFLLEdBQUcsQ0FBQyxPQUFPLHFEQUFxRCxDQUFDLENBQUM7Z0JBQy9KLENBQUM7WUFDRixDQUFDO1lBQ0QsdUZBQXVGO1lBQ3ZGLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztnQkFDZixJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxzREFBc0QsbUJBQW1CLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FBQyxDQUFDO2dCQUM5RyxNQUFNLGFBQWEsR0FBRyxNQUFNLElBQUksQ0FBQyxNQUFNLENBQUMsNEJBQTRCLENBQUMsbUJBQW1CLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQztnQkFDckcsSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFDO29CQUNwQixNQUFNLElBQUksS0FBSyxDQUFDLHFDQUFxQyxDQUFDLENBQUM7Z0JBQ3hELENBQUM7Z0JBQ0QsUUFBUSxHQUFHLGFBQWEsQ0FBQyxRQUFRLENBQUM7Z0JBQ2xDLFlBQVksR0FBRyxhQUFhLENBQUMsWUFBWSxDQUFDO2dCQUMxQyxJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyx5Q0FBeUMsbUJBQW1CLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FBQyxDQUFDO2dCQUNqRyxJQUFJLFlBQVksRUFBRSxDQUFDO29CQUNsQixJQUFJLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxtQ0FBbUMsbUJBQW1CLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FBQyxDQUFDO2dCQUM3RixDQUFDO3FCQUFNLENBQUM7b0JBQ1AsSUFBSSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsMENBQTBDLG1CQUFtQixDQUFDLFFBQVEsRUFBRSxFQUFFLENBQUMsQ0FBQztnQkFDcEcsQ0FBQztZQUNGLENBQUM7UUFDRixDQUFDO1FBQ0QsTUFBTSxRQUFRLEdBQUcsSUFBSSxJQUFJLENBQUMsd0JBQXdCLENBQ2pELElBQUksQ0FBQyxjQUFjLEVBQ25CLElBQUksQ0FBQyxZQUFZLEVBQ2pCLElBQUksQ0FBQyxTQUFTLEVBQ2QsSUFBSSxDQUFDLGdCQUFnQixFQUNyQixJQUFJLENBQUMscUJBQXFCLEVBQzFCLElBQUksQ0FBQyxNQUFNLEVBQ1gsR0FBRyxDQUFDLE1BQU0sQ0FBQyw2QkFBNkIsQ0FBQyxFQUN6QyxjQUFjLEVBQ2QsZ0JBQWdCLEVBQ2hCLFFBQVEsRUFDUixZQUFZLEVBQ1osSUFBSSxDQUFDLHFDQUFxQyxFQUMxQyxhQUFhLElBQUksRUFBRSxDQUNuQixDQUFDO1FBRUYsMEVBQTBFO1FBQzFFLE1BQU0sSUFBSSxDQUFDLG1CQUFtQixDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsRUFBRSxFQUFFLEtBQUssSUFBSSxFQUFFO1lBQzVELElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxHQUFHLENBQ2hDLFFBQVEsQ0FBQyxFQUFFLEVBQ1g7Z0JBQ0MsS0FBSyxFQUFFLFFBQVEsQ0FBQyxLQUFLO2dCQUNyQixRQUFRO2dCQUNSLFVBQVUsRUFBRSxVQUFVLENBQUMsSUFBSSxDQUMxQixRQUFRLEVBQ1IsUUFBUSxDQUFDLG1CQUFtQixDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxzQkFBc0IsQ0FBQyxRQUFRLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQ3JGLFFBQVEsQ0FBQyxtQkFBbUIsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLGlDQUFpQyxDQUFDO29CQUNoRixVQUFVLEVBQUUsUUFBUSxDQUFDLEVBQUU7b0JBQ3ZCLFFBQVEsRUFBRSxRQUFRLENBQUMsUUFBUTtvQkFDM0IsWUFBWSxFQUFFLFFBQVEsQ0FBQyxZQUFZO2lCQUNuQyxDQUFDLENBQUMsQ0FDSDtnQkFDRCxPQUFPLEVBQUUsRUFBRSx3QkFBd0IsRUFBRSxLQUFLLEVBQUU7YUFDNUMsQ0FDRCxDQUFDO1lBQ0YsTUFBTSxJQUFJLENBQUMsTUFBTSxDQUFDLHNDQUFzQyxDQUFDLFFBQVEsQ0FBQyxFQUFFLEVBQUUsUUFBUSxDQUFDLEtBQUssRUFBRSxRQUFRLENBQUMsbUJBQW1CLEVBQUUsUUFBUSxDQUFDLFFBQVEsRUFBRSxRQUFRLENBQUMsWUFBWSxDQUFDLENBQUM7UUFDL0osQ0FBQyxDQUFDLENBQUM7UUFFSCxPQUFPLFFBQVEsQ0FBQyxFQUFFLENBQUM7SUFDcEIsQ0FBQztJQUVELEtBQUssQ0FBQyxxQ0FBcUMsQ0FBQyxjQUFzQixFQUFFLFFBQWdCLEVBQUUsTUFBNkI7UUFDbEgsSUFBSSxDQUFDLHFDQUFxQyxDQUFDLElBQUksQ0FBQyxFQUFFLGNBQWMsRUFBRSxRQUFRLEVBQUUsTUFBTSxFQUFFLENBQUMsQ0FBQztJQUN2RixDQUFDO0NBQ0QsQ0FBQTtBQS9OWSxxQkFBcUI7SUFnQi9CLFdBQUEsa0JBQWtCLENBQUE7SUFDbEIsV0FBQSx1QkFBdUIsQ0FBQTtJQUN2QixXQUFBLGNBQWMsQ0FBQTtJQUNkLFdBQUEsbUJBQW1CLENBQUE7SUFDbkIsV0FBQSxnQkFBZ0IsQ0FBQTtJQUNoQixXQUFBLGNBQWMsQ0FBQTtJQUNkLFdBQUEsV0FBVyxDQUFBO0dBdEJELHFCQUFxQixDQStOakM7O0FBRUQsTUFBTSxXQUFXO0lBQWpCO1FBQ1Msc0JBQWlCLEdBQUcsSUFBSSxHQUFHLEVBQXNCLENBQUM7SUFZM0QsQ0FBQztJQVhBLFdBQVcsQ0FBQyxHQUFXLEVBQUUsY0FBZ0M7UUFDeEQsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLGlCQUFpQixDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUNqRCxJQUFJLFFBQVEsRUFBRSxDQUFDO1lBQ2QsT0FBTyxRQUFRLENBQUM7UUFDakIsQ0FBQztRQUVELE1BQU0sT0FBTyxHQUFHLGNBQWMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7UUFDbkYsSUFBSSxDQUFDLGlCQUFpQixDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFFekMsT0FBTyxPQUFPLENBQUM7SUFDaEIsQ0FBQztDQUNEO0FBRU0sSUFBTSxtQkFBbUIsR0FBekIsTUFBTSxtQkFBbUI7SUFvQi9CLFlBQ2lCLGNBQWlELEVBQzVDLFlBQW9ELEVBQ2hELFNBQXFELEVBQzVELGdCQUFtRCxFQUNyRCxhQUE2QixFQUMxQixNQUFxQyxFQUMvQyxtQkFBd0IsRUFDZCxlQUE2QyxFQUM3QyxpQkFBc0UsRUFDL0UsU0FBaUIsRUFDakIsYUFBaUMsRUFDM0Msb0NBQTBILEVBQzFILGFBQW9DO1FBWkQsbUJBQWMsR0FBZCxjQUFjLENBQWdCO1FBQ3pCLGlCQUFZLEdBQVosWUFBWSxDQUFxQjtRQUM3QixjQUFTLEdBQVQsU0FBUyxDQUF5QjtRQUMzQyxxQkFBZ0IsR0FBaEIsZ0JBQWdCLENBQWtCO1FBRWxELFdBQU0sR0FBTixNQUFNLENBQStCO1FBQy9DLHdCQUFtQixHQUFuQixtQkFBbUIsQ0FBSztRQUNkLG9CQUFlLEdBQWYsZUFBZSxDQUE4QjtRQUM3QyxzQkFBaUIsR0FBakIsaUJBQWlCLENBQXFEO1FBQy9FLGNBQVMsR0FBVCxTQUFTLENBQVE7UUFDakIsa0JBQWEsR0FBYixhQUFhLENBQW9CO1FBM0JwQyx5QkFBb0IsR0FBRyxJQUFJLE9BQU8sRUFBa0UsQ0FBQztRQUNwRyx3QkFBbUIsR0FBRyxJQUFJLENBQUMsb0JBQW9CLENBQUMsS0FBSyxDQUFDO1FBRTlDLHlCQUFvQixHQUFHLElBQUksT0FBTyxFQUFRLENBQUM7UUFDbkQsd0JBQW1CLEdBQUcsSUFBSSxDQUFDLG9CQUFvQixDQUFDLEtBQUssQ0FBQztRQTJCOUQsTUFBTSxpQkFBaUIsR0FBRyxtQkFBbUIsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDN0QsK0ZBQStGO1FBQy9GLElBQUksQ0FBQyxFQUFFLEdBQUcsaUJBQWlCLEVBQUUsUUFBUTtZQUNwQyxDQUFDLENBQUMsaUJBQWlCLEdBQUcsR0FBRyxHQUFHLGlCQUFpQixFQUFFLFFBQVE7WUFDdkQsQ0FBQyxDQUFDLGlCQUFpQixDQUFDO1FBQ3JCLGtIQUFrSDtRQUNsSCxJQUFJLENBQUMsS0FBSyxHQUFHLGlCQUFpQixFQUFFLGFBQWEsSUFBSSxJQUFJLENBQUMsbUJBQW1CLENBQUMsU0FBUyxDQUFDO1FBRXBGLElBQUksQ0FBQyxPQUFPLEdBQUcsYUFBYSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDO1FBQ3pFLElBQUksQ0FBQyxXQUFXLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQztRQUN6QyxJQUFJLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsb0JBQW9CLENBQUMsQ0FBQztRQUNoRCxNQUFNLFdBQVcsR0FBRyxLQUFLLENBQUMsS0FBSyxDQUFDLG9DQUFvQyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7YUFDaEYsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLGNBQWMsS0FBSyxJQUFJLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxRQUFRLEtBQUssU0FBUyxDQUFDO2FBQ3JFLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FDbkIsQ0FBQztRQUNGLElBQUksQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsSUFBSSxVQUFVLENBQ3JEO1lBQ0MsV0FBVyxFQUFFLFdBQVc7WUFDeEIsR0FBRyxFQUFFLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQyxNQUFNLENBQUMsa0NBQWtDLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsUUFBUSxFQUFFLE1BQU0sQ0FBQztTQUMxRixFQUNELGFBQWEsRUFDYixJQUFJLENBQUMsT0FBTyxDQUNaLENBQUMsQ0FBQztRQUNILElBQUksQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsbUJBQW1CLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsb0JBQW9CLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNuRyxnREFBZ0Q7UUFDaEQsSUFBSSxDQUFDLFlBQVksR0FBRyxFQUFFLENBQUM7UUFDdkIsSUFBSSxlQUFlLENBQUMsc0JBQXNCLEVBQUUsQ0FBQztZQUM1QyxJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQztnQkFDdEIsS0FBSyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsYUFBYSxFQUFFLGFBQWEsQ0FBQztnQkFDakQsT0FBTyxFQUFFLENBQUMsTUFBTSxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxNQUFNLEVBQUUsUUFBUSxFQUFFLEtBQUssQ0FBQzthQUN6RixDQUFDLENBQUM7UUFDSixDQUFDO0lBQ0YsQ0FBQztJQUVELElBQUksUUFBUTtRQUNYLE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQztJQUN2QixDQUFDO0lBRUQsSUFBSSxZQUFZO1FBQ2YsT0FBTyxJQUFJLENBQUMsYUFBYSxDQUFDO0lBQzNCLENBQUM7SUFFRCxLQUFLLENBQUMsV0FBVyxDQUFDLE1BQXFDLEVBQUUsUUFBcUQ7UUFDN0csSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsZ0NBQWdDLE1BQU0sRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksS0FBSyxFQUFFLENBQUMsQ0FBQztRQUNoRixJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDYixPQUFPLElBQUksQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDO1FBQ2xDLENBQUM7UUFDRCwyRkFBMkY7UUFDM0YsNERBQTREO1FBQzVELHVFQUF1RTtRQUN2RSxNQUFNLFlBQVksR0FBRyxDQUFDLEdBQUcsTUFBTSxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUM7UUFDeEMsTUFBTSxRQUFRLEdBQUcsTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUNsQyxJQUFJLFFBQVEsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxXQUFXLENBQUMsQ0FBQyxHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQyxJQUFJLEVBQUUsRUFBRSxZQUFZLENBQUMsQ0FBQyxDQUFDO1FBQ2xILElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLFNBQVMsUUFBUSxDQUFDLE1BQU0seUJBQXlCLFFBQVEsRUFBRSxDQUFDLENBQUM7UUFDL0UsSUFBSSxRQUFRLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDckIsTUFBTSxTQUFTLEdBQTBCLEVBQUUsQ0FBQztZQUM1QyxNQUFNLGFBQWEsR0FBMEIsRUFBRSxDQUFDO1lBQ2hELE1BQU0sUUFBUSxHQUFHLElBQUksR0FBRyxDQUE4QixJQUFJLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxZQUFZLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ3pILEtBQUssTUFBTSxPQUFPLElBQUksUUFBUSxFQUFFLENBQUM7Z0JBQ2hDLE1BQU0sS0FBSyxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxDQUFDO2dCQUNoRCxJQUFJLEtBQUssSUFBSSxLQUFLLENBQUMsVUFBVSxFQUFFLENBQUM7b0JBQy9CLE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQztvQkFDdkIsTUFBTSxXQUFXLEdBQUcsS0FBSyxDQUFDLFVBQVUsR0FBRyxJQUFJLENBQUM7b0JBQzVDLHlFQUF5RTtvQkFDekUsSUFBSSxHQUFHLEdBQUcsS0FBSyxDQUFDLFVBQVUsR0FBRyxXQUFXLEdBQUcsQ0FBQyxDQUFDLEdBQUcsRUFBRSxHQUFHLElBQUksQ0FBQyxFQUFFLENBQUM7d0JBQzVELElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLHFCQUFxQixPQUFPLENBQUMsRUFBRSxvQ0FBb0MsQ0FBQyxDQUFDO3dCQUN2RixhQUFhLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO3dCQUMxQixJQUFJLENBQUMsS0FBSyxDQUFDLGFBQWEsRUFBRSxDQUFDOzRCQUMxQiw2Q0FBNkM7NEJBQzdDLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLHlDQUF5QyxPQUFPLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsd0JBQXdCLENBQUMsQ0FBQzs0QkFDN0csU0FBUzt3QkFDVixDQUFDO3dCQUNELElBQUksQ0FBQzs0QkFDSixNQUFNLFFBQVEsR0FBRyxNQUFNLElBQUksQ0FBQyw0QkFBNEIsQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFDLENBQUM7NEJBQzlFLG1HQUFtRzs0QkFDbkcsa0NBQWtDOzRCQUNsQyxJQUFJLFFBQVEsQ0FBQyxLQUFLLEtBQUssUUFBUSxFQUFFLENBQUM7Z0NBQ2pDLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLGlCQUFpQixRQUFRLENBQUMsS0FBSyxvQ0FBb0MsUUFBUSxpREFBaUQsQ0FBQyxDQUFDO2dDQUNoSixRQUFRLENBQUMsS0FBSyxHQUFHLFFBQVEsQ0FBQzs0QkFDM0IsQ0FBQzs0QkFDRCxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQywrQ0FBK0MsT0FBTyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDOzRCQUM5RixTQUFTLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO3dCQUMxQixDQUFDO3dCQUFDLE9BQU8sR0FBRyxFQUFFLENBQUM7NEJBQ2QsSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsNEJBQTRCLEdBQUcsRUFBRSxDQUFDLENBQUM7d0JBQ3ZELENBQUM7b0JBRUYsQ0FBQztnQkFDRixDQUFDO1lBQ0YsQ0FBQztZQUNELElBQUksU0FBUyxDQUFDLE1BQU0sSUFBSSxhQUFhLENBQUMsTUFBTSxFQUFFLENBQUM7Z0JBQzlDLElBQUksQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLEVBQUUsS0FBSyxFQUFFLFNBQVMsRUFBRSxPQUFPLEVBQUUsYUFBYSxFQUFFLENBQUMsQ0FBQztnQkFDdEUsaUVBQWlFO2dCQUNqRSwwQkFBMEI7Z0JBQzFCLFFBQVEsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxXQUFXLENBQUMsQ0FBQyxHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQyxJQUFJLEVBQUUsRUFBRSxZQUFZLENBQUMsQ0FBQyxDQUFDO1lBQy9HLENBQUM7WUFDRCxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxTQUFTLFFBQVEsQ0FBQyxNQUFNLHlCQUF5QixRQUFRLEVBQUUsQ0FBQyxDQUFDO1lBQy9FLE9BQU8sUUFBUSxDQUFDO1FBQ2pCLENBQUM7UUFDRCxPQUFPLEVBQUUsQ0FBQztJQUNYLENBQUM7SUFFRCxLQUFLLENBQUMsYUFBYSxDQUFDLE1BQWdCLEVBQUUsUUFBcUQ7UUFDMUYsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsZ0NBQWdDLE1BQU0sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQ3RFLElBQUksS0FBOEMsQ0FBQztRQUNuRCxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUNuRCxNQUFNLEVBQUUsT0FBTyxFQUFFLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUN6QyxJQUFJLENBQUM7Z0JBQ0osS0FBSyxHQUFHLE1BQU0sSUFBSSxDQUFDLGdCQUFnQixDQUFDLHNCQUFzQixDQUN6RCxFQUFFLEtBQUssRUFBRSxJQUFJLENBQUMsS0FBSyxFQUFFLEVBQUUsRUFBRSxJQUFJLENBQUMsRUFBRSxFQUFFLEVBQ2xDO29CQUNDLFFBQVEsRUFBRSxnQkFBZ0IsQ0FBQyxZQUFZO29CQUN2QyxLQUFLLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxrQkFBa0IsRUFBRSx5QkFBeUIsRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDO29CQUM5RSxXQUFXLEVBQUUsSUFBSTtpQkFDakIsRUFDRCxDQUFDLFFBQVEsRUFBRSxLQUFLLEVBQUUsRUFBRSxDQUFDLE9BQU8sQ0FBQyxNQUFNLEVBQUUsUUFBUSxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUM7Z0JBQ3hELElBQUksS0FBSyxFQUFFLENBQUM7b0JBQ1gsTUFBTTtnQkFDUCxDQUFDO1lBQ0YsQ0FBQztZQUFDLE9BQU8sR0FBRyxFQUFFLENBQUM7Z0JBQ2QsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsS0FBSyxDQUFDO2dCQUNqRCxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7b0JBQ2YsTUFBTSxDQUFDLHVCQUF1QjtnQkFDL0IsQ0FBQztnQkFDRCxNQUFNLE9BQU8sR0FBRyxtQkFBbUIsQ0FBQyxHQUFHLENBQUM7b0JBQ3ZDLENBQUMsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLHNCQUFzQixFQUFFLHNGQUFzRixFQUFFLElBQUksQ0FBQyxLQUFLLEVBQUUsUUFBUSxDQUFDO29CQUNwSixDQUFDLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxjQUFjLEVBQUUsaUdBQWlHLEVBQUUsSUFBSSxDQUFDLEtBQUssRUFBRSxRQUFRLENBQUMsQ0FBQztnQkFFekosTUFBTSxNQUFNLEdBQUcsTUFBTSxJQUFJLENBQUMsTUFBTSxDQUFDLHlCQUF5QixDQUFDLE9BQU8sQ0FBQyxDQUFDO2dCQUNwRSxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7b0JBQ2IsTUFBTSxJQUFJLGlCQUFpQixFQUFFLENBQUM7Z0JBQy9CLENBQUM7Z0JBQ0QsSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsb0NBQW9DLFFBQVEsTUFBTSxHQUFHLEVBQUUsQ0FBQyxDQUFDO1lBQzdFLENBQUM7UUFDRixDQUFDO1FBQ0QsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO1lBQ1osTUFBTSxJQUFJLEtBQUssQ0FBQyx1Q0FBdUMsQ0FBQyxDQUFDO1FBQzFELENBQUM7UUFDRCxJQUFJLEtBQUssQ0FBQyxLQUFLLEtBQUssTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDO1lBQ3RDLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLGlCQUFpQixLQUFLLENBQUMsS0FBSyxvQ0FBb0MsTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsaURBQWlELENBQUMsQ0FBQztZQUNySixLQUFLLENBQUMsS0FBSyxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDaEMsQ0FBQztRQUVELG9DQUFvQztRQUNwQyxJQUFJLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsR0FBRyxLQUFLLEVBQUUsVUFBVSxFQUFFLElBQUksQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDLEVBQUUsT0FBTyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFDeEYsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLFdBQVcsS0FBSyxLQUFLLENBQUMsWUFBWSxDQUFFLENBQUM7UUFDM0YsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsK0JBQStCLEtBQUssQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDO1FBQ2hFLE9BQU8sT0FBTyxDQUFDO0lBQ2hCLENBQUM7SUFFRCxLQUFLLENBQUMsYUFBYSxDQUFDLFNBQWlCO1FBQ3BDLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLDZCQUE2QixTQUFTLEVBQUUsQ0FBQyxDQUFDO1FBQzVELE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxFQUFFLEtBQUssU0FBUyxDQUFDLENBQUM7UUFDcEYsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ2QsSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsbUJBQW1CLFNBQVMsWUFBWSxDQUFDLENBQUM7WUFDN0QsT0FBTztRQUNSLENBQUM7UUFDRCxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsWUFBWSxLQUFLLE9BQU8sQ0FBQyxXQUFXLENBQUMsQ0FBQztRQUNoRyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7WUFDWixJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxpREFBaUQsT0FBTyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7WUFDbEYsT0FBTztRQUNSLENBQUM7UUFDRCxJQUFJLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsT0FBTyxFQUFFLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQ3pELElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLDhCQUE4QixPQUFPLENBQUMsRUFBRSxpQkFBaUIsT0FBTyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBQ3hHLENBQUM7SUFFRCxPQUFPO1FBQ04sSUFBSSxDQUFDLFdBQVcsQ0FBQyxPQUFPLEVBQUUsQ0FBQztJQUM1QixDQUFDO0lBRU8sS0FBSyxDQUFDLHFCQUFxQixDQUFDLE1BQWdCLEVBQUUsUUFBd0MsRUFBRSxLQUErQjtRQUM5SCxJQUFJLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxzQkFBc0IsRUFBRSxDQUFDO1lBQ2xELE1BQU0sSUFBSSxLQUFLLENBQUMsaUNBQWlDLENBQUMsQ0FBQztRQUNwRCxDQUFDO1FBQ0QsSUFBSSxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsY0FBYyxFQUFFLENBQUM7WUFDMUMsTUFBTSxJQUFJLEtBQUssQ0FBQyxpREFBaUQsQ0FBQyxDQUFDO1FBQ3BFLENBQUM7UUFFRCw0RkFBNEY7UUFDNUYsTUFBTSxZQUFZLEdBQUcsSUFBSSxDQUFDLG9CQUFvQixDQUFDLEVBQUUsQ0FBQyxDQUFDO1FBQ25ELE1BQU0sYUFBYSxHQUFHLE1BQU0sSUFBSSxDQUFDLHFCQUFxQixDQUFDLFlBQVksQ0FBQyxDQUFDO1FBRXJFLGdEQUFnRDtRQUNoRCxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsb0JBQW9CLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDNUMsTUFBTSxXQUFXLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsV0FBVyxDQUFDLFlBQVksMEJBQTBCLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxTQUFTLG9CQUFvQixLQUFLLEVBQUUsQ0FBQyxDQUFDO1FBQ2pLLElBQUksS0FBVSxDQUFDO1FBQ2YsSUFBSSxDQUFDO1lBQ0osS0FBSyxHQUFHLE1BQU0sSUFBSSxDQUFDLFlBQVksQ0FBQyxZQUFZLENBQUMsV0FBVyxDQUFDLENBQUM7UUFDM0QsQ0FBQztRQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7WUFDaEIsTUFBTSxJQUFJLEtBQUssQ0FBQyxrQ0FBa0MsS0FBSyxFQUFFLENBQUMsQ0FBQztRQUM1RCxDQUFDO1FBRUQsd0NBQXdDO1FBQ3hDLE1BQU0sZ0JBQWdCLEdBQUcsSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDO1FBQzlFLGdCQUFnQixDQUFDLFlBQVksQ0FBQyxNQUFNLENBQUMsV0FBVyxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUNsRSxnQkFBZ0IsQ0FBQyxZQUFZLENBQUMsTUFBTSxDQUFDLGVBQWUsRUFBRSxNQUFNLENBQUMsQ0FBQztRQUM5RCxnQkFBZ0IsQ0FBQyxZQUFZLENBQUMsTUFBTSxDQUFDLE9BQU8sRUFBRSxLQUFLLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQztRQUNoRSxnQkFBZ0IsQ0FBQyxZQUFZLENBQUMsTUFBTSxDQUFDLGdCQUFnQixFQUFFLGFBQWEsQ0FBQyxDQUFDO1FBQ3RFLGdCQUFnQixDQUFDLFlBQVksQ0FBQyxNQUFNLENBQUMsdUJBQXVCLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFDdEUsTUFBTSxXQUFXLEdBQUcsTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUNyQyxJQUFJLFdBQVcsRUFBRSxDQUFDO1lBQ2pCLDJFQUEyRTtZQUMzRSxnQkFBZ0IsQ0FBQyxZQUFZLENBQUMsTUFBTSxDQUFDLE9BQU8sRUFBRSxXQUFXLENBQUMsQ0FBQztRQUM1RCxDQUFDO1FBQ0QsSUFBSSxJQUFJLENBQUMsaUJBQWlCLEVBQUUsUUFBUSxFQUFFLENBQUM7WUFDdEMsd0RBQXdEO1lBQ3hELGdCQUFnQixDQUFDLFlBQVksQ0FBQyxNQUFNLENBQUMsVUFBVSxFQUFFLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUNuRixDQUFDO1FBRUQsa0ZBQWtGO1FBQ2xGLE1BQU0sV0FBVyxHQUFHLDZCQUE2QixDQUFDO1FBQ2xELGdCQUFnQixDQUFDLFlBQVksQ0FBQyxNQUFNLENBQUMsY0FBYyxFQUFFLFdBQVcsQ0FBQyxDQUFDO1FBRWxFLE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxXQUFXLENBQUMsQ0FBQztRQUUzRCwwQ0FBMEM7UUFDMUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMseUNBQXlDLFdBQVcsRUFBRSxDQUFDLENBQUM7UUFDMUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsc0JBQXNCLGdCQUFnQixDQUFDLFFBQVEsRUFBRSxFQUFFLENBQUMsQ0FBQztRQUN4RSxNQUFNLE1BQU0sR0FBRyxNQUFNLElBQUksQ0FBQyxjQUFjLENBQUMsT0FBTyxDQUFDLGdCQUFnQixDQUFDLFFBQVEsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQ2xGLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUNiLE1BQU0sSUFBSSxpQkFBaUIsRUFBRSxDQUFDO1FBQy9CLENBQUM7UUFDRCxRQUFRLENBQUMsTUFBTSxDQUFDO1lBQ2YsT0FBTyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsY0FBYyxFQUFFLG9FQUFvRSxDQUFDO1NBQzNHLENBQUMsQ0FBQztRQUVILGlEQUFpRDtRQUNqRCxJQUFJLElBQXdCLENBQUM7UUFDN0IsSUFBSSxDQUFDO1lBQ0osTUFBTSxRQUFRLEdBQUcsTUFBTSxxQkFBcUIsQ0FBQyxPQUFPLEVBQUUsS0FBSyxDQUFDLENBQUM7WUFDN0QsSUFBSSxHQUFHLFFBQVEsQ0FBQyxJQUFJLENBQUM7UUFDdEIsQ0FBQztRQUFDLE9BQU8sR0FBRyxFQUFFLENBQUM7WUFDZCxJQUFJLG1CQUFtQixDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUM7Z0JBQzlCLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLHVEQUF1RCxDQUFDLENBQUM7Z0JBQzNFLE1BQU0sR0FBRyxDQUFDO1lBQ1gsQ0FBQztZQUNELElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLHlDQUF5QyxHQUFHLEVBQUUsQ0FBQyxDQUFDO1lBQ25FLE1BQU0sSUFBSSxLQUFLLENBQUMseUNBQXlDLEdBQUcsRUFBRSxDQUFDLENBQUM7UUFDakUsQ0FBQztRQUNELElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLDJDQUEyQyxXQUFXLEVBQUUsQ0FBQyxDQUFDO1FBRTVFLDZDQUE2QztRQUM3QyxNQUFNLGFBQWEsR0FBRyxNQUFNLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxJQUFJLEVBQUUsWUFBWSxFQUFFLFdBQVcsQ0FBQyxDQUFDO1FBQ3ZGLE9BQU8sYUFBYSxDQUFDO0lBQ3RCLENBQUM7SUFFUyxvQkFBb0IsQ0FBQyxNQUFjO1FBQzVDLE1BQU0sS0FBSyxHQUFHLElBQUksVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ3JDLE1BQU0sQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDOUIsT0FBTyxLQUFLLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQzthQUN0QixHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUM7YUFDekMsSUFBSSxDQUFDLEVBQUUsQ0FBQzthQUNSLFNBQVMsQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDLENBQUM7SUFDeEIsQ0FBQztJQUVTLEtBQUssQ0FBQyxxQkFBcUIsQ0FBQyxZQUFvQjtRQUN6RCxNQUFNLE9BQU8sR0FBRyxJQUFJLFdBQVcsRUFBRSxDQUFDO1FBQ2xDLE1BQU0sSUFBSSxHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUMsWUFBWSxDQUFDLENBQUM7UUFDMUMsTUFBTSxNQUFNLEdBQUcsTUFBTSxNQUFNLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxTQUFTLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFFM0QsOEJBQThCO1FBQzlCLE9BQU8sWUFBWSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsSUFBSSxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxLQUFLLEVBQUUsS0FBSyxDQUFDO2FBQ3RFLE9BQU8sQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDO2FBQ25CLE9BQU8sQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDO2FBQ25CLE9BQU8sQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLENBQUM7SUFDdEIsQ0FBQztJQUVPLEtBQUssQ0FBQyx3QkFBd0IsQ0FBQyxhQUFrQjtRQUN4RCxNQUFNLE1BQU0sR0FBRyxNQUFNLElBQUksQ0FBQyxNQUFNLENBQUMsa0JBQWtCLENBQUMsYUFBYSxDQUFDLENBQUM7UUFDbkUsOEdBQThHO1FBQzlHLGtFQUFrRTtRQUNsRSxNQUFNLFNBQVMsR0FBRyxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssSUFBSSxFQUFFLENBQUMsQ0FBQztRQUM5RCxJQUFJLENBQUMsU0FBUyxJQUFJLFNBQVMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUM7WUFDeEMsOENBQThDO1lBQzlDLE1BQU0sSUFBSSxLQUFLLENBQUMsdURBQXVELENBQUMsQ0FBQztRQUMxRSxDQUFDO1FBQ0QsT0FBTyxFQUFFLElBQUksRUFBRSxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztJQUMvQixDQUFDO0lBRVMsS0FBSyxDQUFDLG9CQUFvQixDQUFDLElBQVksRUFBRSxZQUFvQixFQUFFLFdBQW1CO1FBQzNGLElBQUksQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLGNBQWMsRUFBRSxDQUFDO1lBQzFDLE1BQU0sSUFBSSxLQUFLLENBQUMsaURBQWlELENBQUMsQ0FBQztRQUNwRSxDQUFDO1FBRUQsTUFBTSxZQUFZLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQztRQUMzQyxZQUFZLENBQUMsTUFBTSxDQUFDLFdBQVcsRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDakQsWUFBWSxDQUFDLE1BQU0sQ0FBQyxZQUFZLEVBQUUsb0JBQW9CLENBQUMsQ0FBQztRQUN4RCxZQUFZLENBQUMsTUFBTSxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsQ0FBQztRQUNsQyxZQUFZLENBQUMsTUFBTSxDQUFDLGNBQWMsRUFBRSxXQUFXLENBQUMsQ0FBQztRQUNqRCxZQUFZLENBQUMsTUFBTSxDQUFDLGVBQWUsRUFBRSxZQUFZLENBQUMsQ0FBQztRQUVuRCxpQ0FBaUM7UUFDakMsSUFBSSxJQUFJLENBQUMsYUFBYSxFQUFFLENBQUM7WUFDeEIsWUFBWSxDQUFDLE1BQU0sQ0FBQyxlQUFlLEVBQUUsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDO1FBQzFELENBQUM7UUFFRCxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyw0Q0FBNEMsQ0FBQyxDQUFDO1FBQ2hFLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLFFBQVEsSUFBSSxDQUFDLGVBQWUsQ0FBQyxjQUFjLEVBQUUsQ0FBQyxDQUFDO1FBQ2xFLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLHVCQUF1QixZQUFZLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQ3JFLElBQUksUUFBa0IsQ0FBQztRQUN2QixJQUFJLENBQUM7WUFDSixRQUFRLEdBQUcsTUFBTSxLQUFLLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxjQUFjLEVBQUU7Z0JBQzNELE1BQU0sRUFBRSxNQUFNO2dCQUNkLE9BQU8sRUFBRTtvQkFDUixjQUFjLEVBQUUsbUNBQW1DO29CQUNuRCxRQUFRLEVBQUUsa0JBQWtCO2lCQUM1QjtnQkFDRCxJQUFJLEVBQUUsWUFBWSxDQUFDLFFBQVEsRUFBRTthQUM3QixDQUFDLENBQUM7UUFDSixDQUFDO1FBQUMsT0FBTyxHQUFHLEVBQUUsQ0FBQztZQUNkLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLG9EQUFvRCxHQUFHLEVBQUUsQ0FBQyxDQUFDO1lBQzlFLE1BQU0sSUFBSSxLQUFLLENBQUMsb0RBQW9ELEdBQUcsRUFBRSxDQUFDLENBQUM7UUFDNUUsQ0FBQztRQUVELElBQUksQ0FBQyxRQUFRLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDbEIsTUFBTSxJQUFJLEdBQUcsTUFBTSxRQUFRLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDbkMsTUFBTSxJQUFJLEtBQUssQ0FBQywwQkFBMEIsUUFBUSxDQUFDLE1BQU0sSUFBSSxRQUFRLENBQUMsVUFBVSxNQUFNLElBQUksRUFBRSxDQUFDLENBQUM7UUFDL0YsQ0FBQztRQUVELE1BQU0sTUFBTSxHQUFHLE1BQU0sUUFBUSxDQUFDLElBQUksRUFBRSxDQUFDO1FBQ3JDLElBQUksNEJBQTRCLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQztZQUMxQyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxzREFBc0QsQ0FBQyxDQUFDO1lBQzFFLE9BQU8sTUFBTSxDQUFDO1FBQ2YsQ0FBQzthQUFNLElBQUksNEJBQTRCLENBQUMsTUFBTSxDQUFDLElBQUksTUFBTSxDQUFDLEtBQUssZ0VBQXlDLEVBQUUsQ0FBQztZQUMxRyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxjQUFjLElBQUksQ0FBQyxTQUFTLHFDQUFxQyxDQUFDLENBQUM7WUFDckYsTUFBTSxJQUFJLENBQUMsb0JBQW9CLEVBQUUsQ0FBQztZQUNsQyxNQUFNLElBQUksS0FBSyxDQUFDLCtEQUErRCxDQUFDLENBQUM7UUFDbEYsQ0FBQztRQUNELE1BQU0sSUFBSSxLQUFLLENBQUMseUNBQXlDLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBQ3BGLENBQUM7SUFFUyxLQUFLLENBQUMsNEJBQTRCLENBQUMsWUFBb0I7UUFDaEUsSUFBSSxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsY0FBYyxFQUFFLENBQUM7WUFDMUMsTUFBTSxJQUFJLEtBQUssQ0FBQyxpREFBaUQsQ0FBQyxDQUFDO1FBQ3BFLENBQUM7UUFFRCxNQUFNLFlBQVksR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFDO1FBQzNDLFlBQVksQ0FBQyxNQUFNLENBQUMsV0FBVyxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUNqRCxZQUFZLENBQUMsTUFBTSxDQUFDLFlBQVksRUFBRSxlQUFlLENBQUMsQ0FBQztRQUNuRCxZQUFZLENBQUMsTUFBTSxDQUFDLGVBQWUsRUFBRSxZQUFZLENBQUMsQ0FBQztRQUVuRCxpQ0FBaUM7UUFDakMsSUFBSSxJQUFJLENBQUMsYUFBYSxFQUFFLENBQUM7WUFDeEIsWUFBWSxDQUFDLE1BQU0sQ0FBQyxlQUFlLEVBQUUsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDO1FBQzFELENBQUM7UUFFRCxNQUFNLFFBQVEsR0FBRyxNQUFNLEtBQUssQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLGNBQWMsRUFBRTtZQUNqRSxNQUFNLEVBQUUsTUFBTTtZQUNkLE9BQU8sRUFBRTtnQkFDUixjQUFjLEVBQUUsbUNBQW1DO2dCQUNuRCxRQUFRLEVBQUUsa0JBQWtCO2FBQzVCO1lBQ0QsSUFBSSxFQUFFLFlBQVksQ0FBQyxRQUFRLEVBQUU7U0FDN0IsQ0FBQyxDQUFDO1FBRUgsTUFBTSxNQUFNLEdBQUcsTUFBTSxRQUFRLENBQUMsSUFBSSxFQUFFLENBQUM7UUFDckMsSUFBSSw0QkFBNEIsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDO1lBQzFDLE9BQU87Z0JBQ04sR0FBRyxNQUFNO2dCQUNULFVBQVUsRUFBRSxJQUFJLENBQUMsR0FBRyxFQUFFO2FBQ3RCLENBQUM7UUFDSCxDQUFDO2FBQU0sSUFBSSw0QkFBNEIsQ0FBQyxNQUFNLENBQUMsSUFBSSxNQUFNLENBQUMsS0FBSyxnRUFBeUMsRUFBRSxDQUFDO1lBQzFHLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLGNBQWMsSUFBSSxDQUFDLFNBQVMscUNBQXFDLENBQUMsQ0FBQztZQUNyRixNQUFNLElBQUksQ0FBQyxvQkFBb0IsRUFBRSxDQUFDO1lBQ2xDLE1BQU0sSUFBSSxLQUFLLENBQUMsK0RBQStELENBQUMsQ0FBQztRQUNsRixDQUFDO1FBQ0QsTUFBTSxJQUFJLEtBQUssQ0FBQyx5Q0FBeUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUM7SUFDcEYsQ0FBQztJQUVTLEtBQUssQ0FBQyxvQkFBb0I7UUFDbkMsSUFBSSxDQUFDO1lBQ0osTUFBTSxZQUFZLEdBQUcsTUFBTSx3QkFBd0IsQ0FBQyxJQUFJLENBQUMsZUFBZSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsV0FBVyxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsaUJBQWlCLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQztZQUN4SixJQUFJLENBQUMsU0FBUyxHQUFHLFlBQVksQ0FBQyxTQUFTLENBQUM7WUFDeEMsSUFBSSxDQUFDLGFBQWEsR0FBRyxZQUFZLENBQUMsYUFBYSxDQUFDO1lBQ2hELElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxJQUFJLEVBQUUsQ0FBQztRQUNsQyxDQUFDO1FBQUMsT0FBTyxHQUFHLEVBQUUsQ0FBQztZQUNkLDJFQUEyRTtZQUMzRSxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxtQ0FBbUMsSUFBSSxDQUFDLG1CQUFtQixDQUFDLFFBQVEsRUFBRSxLQUFLLEdBQUcsbURBQW1ELENBQUMsQ0FBQztZQUVySixJQUFJLENBQUM7Z0JBQ0osTUFBTSxhQUFhLEdBQUcsTUFBTSxJQUFJLENBQUMsTUFBTSxDQUFDLDRCQUE0QixDQUFDLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDO2dCQUMxRyxJQUFJLENBQUMsYUFBYSxFQUFFLENBQUM7b0JBQ3BCLE1BQU0sSUFBSSxLQUFLLENBQUMscUNBQXFDLENBQUMsQ0FBQztnQkFDeEQsQ0FBQztnQkFDRCxJQUFJLENBQUMsU0FBUyxHQUFHLGFBQWEsQ0FBQyxRQUFRLENBQUM7Z0JBQ3hDLElBQUksQ0FBQyxhQUFhLEdBQUcsYUFBYSxDQUFDLFlBQVksQ0FBQztnQkFDaEQsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsK0JBQStCLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxRQUFRLEVBQUUsRUFBRSxDQUFDLENBQUM7Z0JBQ3hGLElBQUksYUFBYSxDQUFDLFlBQVksRUFBRSxDQUFDO29CQUNoQyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxtQ0FBbUMsSUFBSSxDQUFDLG1CQUFtQixDQUFDLFFBQVEsRUFBRSxFQUFFLENBQUMsQ0FBQztnQkFDN0YsQ0FBQztxQkFBTSxDQUFDO29CQUNQLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLDBDQUEwQyxJQUFJLENBQUMsbUJBQW1CLENBQUMsUUFBUSxFQUFFLGFBQWEsQ0FBQyxDQUFDO2dCQUMvRyxDQUFDO2dCQUVELElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUNsQyxDQUFDO1lBQUMsT0FBTyxTQUFTLEVBQUUsQ0FBQztnQkFDcEIsSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsK0RBQStELEdBQUcsRUFBRSxDQUFDLENBQUM7Z0JBQ3pGLE1BQU0sSUFBSSxLQUFLLENBQUMsK0RBQStELEdBQUcsRUFBRSxDQUFDLENBQUM7WUFDdkYsQ0FBQztRQUNGLENBQUM7SUFDRixDQUFDO0NBQ0QsQ0FBQTtBQWxiWSxtQkFBbUI7SUFxQjdCLFdBQUEsY0FBYyxDQUFBO0lBQ2QsV0FBQSxtQkFBbUIsQ0FBQTtJQUNuQixXQUFBLHVCQUF1QixDQUFBO0lBQ3ZCLFdBQUEsZ0JBQWdCLENBQUE7SUFDaEIsV0FBQSxjQUFjLENBQUE7R0F6QkosbUJBQW1CLENBa2IvQjs7QUFTRCxNQUFNLFVBQVU7SUFTZixZQUNrQixZQUF5RyxFQUMxSCxhQUFvQyxFQUNuQixPQUFnQjtRQUZoQixpQkFBWSxHQUFaLFlBQVksQ0FBNkY7UUFFekcsWUFBTyxHQUFQLE9BQU8sQ0FBUztRQVJqQix5QkFBb0IsR0FBRyxJQUFJLE9BQU8sRUFBa0UsQ0FBQztRQUM3Ryx3QkFBbUIsR0FBRyxJQUFJLENBQUMsb0JBQW9CLENBQUMsS0FBSyxDQUFDO1FBUzlELElBQUksQ0FBQyxXQUFXLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQztRQUN6QyxJQUFJLENBQUMsaUJBQWlCLEdBQUcsZUFBZSxDQUF3QixRQUFRLEVBQUUsYUFBYSxDQUFDLENBQUM7UUFDekYsSUFBSSxDQUFDLG1CQUFtQixHQUFHLFdBQVcsQ0FDckMsRUFBRSxRQUFRLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxXQUFXLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxXQUFXLEtBQUssQ0FBQyxDQUFDLFdBQVcsQ0FBQyxFQUFFLEVBQ3BGLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUN0RixDQUFDO1FBQ0YsSUFBSSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLDJCQUEyQixFQUFFLENBQUMsQ0FBQztRQUN6RCxJQUFJLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLFdBQVcsQ0FBQyxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLEdBQUcsQ0FBQyxNQUFNLEVBQUUsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ2hILENBQUM7SUFFRCxJQUFJLE1BQU07UUFDVCxPQUFPLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxHQUFHLEVBQUUsQ0FBQztJQUNyQyxDQUFDO0lBRUQsSUFBSSxRQUFRO1FBQ1gsT0FBTyxJQUFJLENBQUMsbUJBQW1CLENBQUMsR0FBRyxFQUFFLENBQUM7SUFDdkMsQ0FBQztJQUVELE9BQU87UUFDTixJQUFJLENBQUMsV0FBVyxDQUFDLE9BQU8sRUFBRSxDQUFDO0lBQzVCLENBQUM7SUFFRCxNQUFNLENBQUMsRUFBRSxLQUFLLEVBQUUsT0FBTyxFQUFvRTtRQUMxRixJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQywwQkFBMEIsS0FBSyxDQUFDLE1BQU0sYUFBYSxPQUFPLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQztRQUN4RixNQUFNLGFBQWEsR0FBRyxDQUFDLEdBQUcsSUFBSSxDQUFDLGlCQUFpQixDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUM7UUFDeEQsS0FBSyxNQUFNLEtBQUssSUFBSSxPQUFPLEVBQUUsQ0FBQztZQUM3QixNQUFNLEtBQUssR0FBRyxhQUFhLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLFlBQVksS0FBSyxLQUFLLENBQUMsWUFBWSxDQUFDLENBQUM7WUFDbEYsSUFBSSxLQUFLLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQztnQkFDbEIsYUFBYSxDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDaEMsQ0FBQztRQUNGLENBQUM7UUFDRCxLQUFLLE1BQU0sS0FBSyxJQUFJLEtBQUssRUFBRSxDQUFDO1lBQzNCLE1BQU0sS0FBSyxHQUFHLGFBQWEsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsWUFBWSxLQUFLLEtBQUssQ0FBQyxZQUFZLENBQUMsQ0FBQztZQUNsRixJQUFJLEtBQUssS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDO2dCQUNsQixhQUFhLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQzNCLENBQUM7aUJBQU0sQ0FBQztnQkFDUCxhQUFhLENBQUMsS0FBSyxDQUFDLEdBQUcsS0FBSyxDQUFDO1lBQzlCLENBQUM7UUFDRixDQUFDO1FBQ0QsSUFBSSxLQUFLLENBQUMsTUFBTSxJQUFJLE9BQU8sQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUNwQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsR0FBRyxDQUFDLGFBQWEsRUFBRSxTQUFTLENBQUMsQ0FBQztZQUNyRCxLQUFLLElBQUksQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDLGFBQWEsQ0FBQyxDQUFDO1FBQzNDLENBQUM7UUFDRCxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxtQkFBbUIsYUFBYSxDQUFDLE1BQU0saUJBQWlCLENBQUMsQ0FBQztJQUM5RSxDQUFDO0lBRU8sMkJBQTJCO1FBQ2xDLElBQUksZ0JBQWdCLEdBQW1DLEVBQUUsQ0FBQztRQUMxRCxPQUFPLE9BQU8sQ0FBQyxDQUFDLE1BQU0sRUFBRSxFQUFFO1lBQ3pCLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLGlDQUFpQyxDQUFDLENBQUM7WUFDdEQsTUFBTSxlQUFlLEdBQUcsSUFBSSxDQUFDLG1CQUFtQixDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUM5RCxJQUFJLGdCQUFnQixLQUFLLGVBQWUsRUFBRSxDQUFDO2dCQUMxQyxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyw4QkFBOEIsQ0FBQyxDQUFDO2dCQUNuRCxPQUFPO1lBQ1IsQ0FBQztZQUVELElBQUksQ0FBQyxlQUFlLElBQUksZUFBZSxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsQ0FBQztnQkFDdEQsZ0ZBQWdGO2dCQUNoRixJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDO2dCQUM1QyxJQUFJLGdCQUFnQixDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQztvQkFDakMsSUFBSSxDQUFDLG9CQUFvQixDQUFDLElBQUksQ0FBQzt3QkFDOUIsS0FBSyxFQUFFLEVBQUU7d0JBQ1QsT0FBTyxFQUFFLGdCQUFnQjt3QkFDekIsT0FBTyxFQUFFLEVBQUU7cUJBQ1gsQ0FBQyxDQUFDO29CQUNILGdCQUFnQixHQUFHLEVBQUUsQ0FBQztnQkFDdkIsQ0FBQztnQkFDRCxPQUFPO1lBQ1IsQ0FBQztZQUVELE1BQU0sS0FBSyxHQUFtQyxFQUFFLENBQUM7WUFDakQsTUFBTSxPQUFPLEdBQW1DLEVBQUUsQ0FBQztZQUVuRCxzQkFBc0I7WUFDdEIsS0FBSyxNQUFNLE9BQU8sSUFBSSxlQUFlLEVBQUUsQ0FBQztnQkFDdkMsTUFBTSxNQUFNLEdBQUcsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLFdBQVcsS0FBSyxPQUFPLENBQUMsV0FBVyxDQUFDLENBQUM7Z0JBQ3ZGLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztvQkFDYixLQUFLLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO2dCQUNyQixDQUFDO1lBQ0YsQ0FBQztZQUVELHdCQUF3QjtZQUN4QixLQUFLLE1BQU0sSUFBSSxJQUFJLGdCQUFnQixFQUFFLENBQUM7Z0JBQ3JDLE1BQU0sTUFBTSxHQUFHLGVBQWUsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsV0FBVyxLQUFLLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQztnQkFDekYsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO29CQUNiLE9BQU8sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7Z0JBQ3BCLENBQUM7WUFDRixDQUFDO1lBRUQsMENBQTBDO1lBQzFDLElBQUksS0FBSyxDQUFDLE1BQU0sR0FBRyxDQUFDLElBQUksT0FBTyxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQztnQkFDNUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsMkJBQTJCLEtBQUssQ0FBQyxNQUFNLGFBQWEsT0FBTyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUM7Z0JBQ3pGLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsRUFBRSxLQUFLLEVBQUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDO1lBQ2pFLENBQUM7WUFFRCxxQ0FBcUM7WUFDckMsZ0JBQWdCLEdBQUcsZUFBZSxDQUFDO1FBQ3BDLENBQUMsQ0FBQyxDQUFDO0lBQ0osQ0FBQztJQUVPLG9CQUFvQixDQUFDLEtBQWtDO1FBQzlELElBQUksTUFBMkMsQ0FBQztRQUNoRCxJQUFJLEtBQUssQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUNwQixJQUFJLENBQUM7Z0JBQ0osTUFBTSxHQUFHLGdCQUFnQixDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQztZQUMzQyxDQUFDO1lBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztnQkFDWixNQUFNO1lBQ1AsQ0FBQztRQUNGLENBQUM7UUFDRCxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDYixJQUFJLENBQUM7Z0JBQ0osTUFBTSxHQUFHLGdCQUFnQixDQUFDLEtBQUssQ0FBQyxZQUFZLENBQUMsQ0FBQztZQUMvQyxDQUFDO1lBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztnQkFDWixNQUFNO1lBQ1AsQ0FBQztRQUNGLENBQUM7UUFDRCxNQUFNLE1BQU0sR0FBRyxLQUFLLENBQUMsS0FBSztZQUN6QixDQUFDLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDO1lBQ3hCLENBQUMsQ0FBQyxNQUFNLEVBQUUsS0FBSztnQkFDZCxDQUFDLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDO2dCQUN6QixDQUFDLENBQUMsRUFBRSxDQUFDO1FBQ1AsT0FBTztZQUNOLEVBQUUsRUFBRSxVQUFVLENBQUMsS0FBSyxDQUFDLFlBQVksRUFBRSxDQUFDLENBQUMsQ0FBQyxRQUFRLEVBQUU7WUFDaEQsV0FBVyxFQUFFLEtBQUssQ0FBQyxZQUFZO1lBQy9CLE9BQU8sRUFBRTtnQkFDUixFQUFFLEVBQUUsTUFBTSxFQUFFLEdBQUcsSUFBSSxTQUFTO2dCQUM1Qix5QkFBeUI7Z0JBQ3pCLEtBQUssRUFBRSxNQUFNLEVBQUUsa0JBQWtCLElBQUksTUFBTSxFQUFFLElBQUksSUFBSSxNQUFNLEVBQUUsS0FBSyxJQUFJLEtBQUs7YUFDM0U7WUFDRCxNQUFNLEVBQUUsTUFBTTtZQUNkLE9BQU8sRUFBRSxLQUFLLENBQUMsUUFBUTtTQUN2QixDQUFDO0lBQ0gsQ0FBQztDQUNEIn0=