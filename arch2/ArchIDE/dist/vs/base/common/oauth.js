/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { decodeBase64 } from './buffer.js';
const WELL_KNOWN_ROUTE = '/.well-known';
export const AUTH_PROTECTED_RESOURCE_METADATA_DISCOVERY_PATH = `${WELL_KNOWN_ROUTE}/oauth-protected-resource`;
export const AUTH_SERVER_METADATA_DISCOVERY_PATH = `${WELL_KNOWN_ROUTE}/oauth-authorization-server`;
export const OPENID_CONNECT_DISCOVERY_PATH = `${WELL_KNOWN_ROUTE}/openid-configuration`;
export const AUTH_SCOPE_SEPARATOR = ' ';
//#region types
/**
 * Base OAuth 2.0 error codes as specified in RFC 6749.
 */
export var AuthorizationErrorType;
(function (AuthorizationErrorType) {
    AuthorizationErrorType["InvalidRequest"] = "invalid_request";
    AuthorizationErrorType["InvalidClient"] = "invalid_client";
    AuthorizationErrorType["InvalidGrant"] = "invalid_grant";
    AuthorizationErrorType["UnauthorizedClient"] = "unauthorized_client";
    AuthorizationErrorType["UnsupportedGrantType"] = "unsupported_grant_type";
    AuthorizationErrorType["InvalidScope"] = "invalid_scope";
})(AuthorizationErrorType || (AuthorizationErrorType = {}));
/**
 * Device authorization grant specific error codes as specified in RFC 8628 section 3.5.
 */
export var AuthorizationDeviceCodeErrorType;
(function (AuthorizationDeviceCodeErrorType) {
    /**
     * The authorization request is still pending as the end user hasn't completed the user interaction steps.
     */
    AuthorizationDeviceCodeErrorType["AuthorizationPending"] = "authorization_pending";
    /**
     * A variant of "authorization_pending", polling should continue but interval must be increased by 5 seconds.
     */
    AuthorizationDeviceCodeErrorType["SlowDown"] = "slow_down";
    /**
     * The authorization request was denied.
     */
    AuthorizationDeviceCodeErrorType["AccessDenied"] = "access_denied";
    /**
     * The "device_code" has expired and the device authorization session has concluded.
     */
    AuthorizationDeviceCodeErrorType["ExpiredToken"] = "expired_token";
})(AuthorizationDeviceCodeErrorType || (AuthorizationDeviceCodeErrorType = {}));
/**
 * Dynamic client registration specific error codes as specified in RFC 7591.
 */
export var AuthorizationRegistrationErrorType;
(function (AuthorizationRegistrationErrorType) {
    /**
     * The value of one or more redirection URIs is invalid.
     */
    AuthorizationRegistrationErrorType["InvalidRedirectUri"] = "invalid_redirect_uri";
    /**
     * The value of one of the client metadata fields is invalid and the server has rejected this request.
     */
    AuthorizationRegistrationErrorType["InvalidClientMetadata"] = "invalid_client_metadata";
    /**
     * The software statement presented is invalid.
     */
    AuthorizationRegistrationErrorType["InvalidSoftwareStatement"] = "invalid_software_statement";
    /**
     * The software statement presented is not approved for use by this authorization server.
     */
    AuthorizationRegistrationErrorType["UnapprovedSoftwareStatement"] = "unapproved_software_statement";
})(AuthorizationRegistrationErrorType || (AuthorizationRegistrationErrorType = {}));
//#endregion
//#region is functions
export function isAuthorizationProtectedResourceMetadata(obj) {
    if (typeof obj !== 'object' || obj === null) {
        return false;
    }
    const metadata = obj;
    return metadata.resource !== undefined;
}
export function isAuthorizationServerMetadata(obj) {
    if (typeof obj !== 'object' || obj === null) {
        return false;
    }
    const metadata = obj;
    return metadata.issuer !== undefined;
}
export function isAuthorizationDynamicClientRegistrationResponse(obj) {
    if (typeof obj !== 'object' || obj === null) {
        return false;
    }
    const response = obj;
    return response.client_id !== undefined;
}
export function isAuthorizationAuthorizeResponse(obj) {
    if (typeof obj !== 'object' || obj === null) {
        return false;
    }
    const response = obj;
    return response.code !== undefined && response.state !== undefined;
}
export function isAuthorizationTokenResponse(obj) {
    if (typeof obj !== 'object' || obj === null) {
        return false;
    }
    const response = obj;
    return response.access_token !== undefined && response.token_type !== undefined;
}
export function isAuthorizationDeviceResponse(obj) {
    if (typeof obj !== 'object' || obj === null) {
        return false;
    }
    const response = obj;
    return response.device_code !== undefined && response.user_code !== undefined && response.verification_uri !== undefined && response.expires_in !== undefined;
}
export function isAuthorizationErrorResponse(obj) {
    if (typeof obj !== 'object' || obj === null) {
        return false;
    }
    const response = obj;
    return response.error !== undefined;
}
export function isAuthorizationRegistrationErrorResponse(obj) {
    if (typeof obj !== 'object' || obj === null) {
        return false;
    }
    const response = obj;
    return response.error !== undefined;
}
//#endregion
export function getDefaultMetadataForUrl(authorizationServer) {
    return {
        issuer: authorizationServer.toString(),
        authorization_endpoint: new URL('/authorize', authorizationServer).toString(),
        token_endpoint: new URL('/token', authorizationServer).toString(),
        registration_endpoint: new URL('/register', authorizationServer).toString(),
        // Default values for Dynamic OpenID Providers
        // https://openid.net/specs/openid-connect-discovery-1_0.html
        response_types_supported: ['code', 'id_token', 'id_token token'],
    };
}
/**
 * The grant types that we support
 */
const grantTypesSupported = ['authorization_code', 'refresh_token', 'urn:ietf:params:oauth:grant-type:device_code'];
/**
 * Default port for the authorization flow. We try to use this port so that
 * the redirect URI does not change when running on localhost. This is useful
 * for servers that only allow exact matches on the redirect URI. The spec
 * says that the port should not matter, but some servers do not follow
 * the spec and require an exact match.
 */
export const DEFAULT_AUTH_FLOW_PORT = 33418;
export async function fetchDynamicRegistration(serverMetadata, clientName, scopes) {
    if (!serverMetadata.registration_endpoint) {
        throw new Error('Server does not support dynamic registration');
    }
    const response = await fetch(serverMetadata.registration_endpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            client_name: clientName,
            client_uri: 'https://code.visualstudio.com',
            grant_types: serverMetadata.grant_types_supported
                ? serverMetadata.grant_types_supported.filter(gt => grantTypesSupported.includes(gt))
                : grantTypesSupported,
            response_types: ['code'],
            redirect_uris: [
                'https://insiders.vscode.dev/redirect',
                'https://vscode.dev/redirect',
                'http://localhost',
                'http://127.0.0.1',
                // Added these for any server that might do
                // only exact match on the redirect URI even
                // though the spec says it should not care
                // about the port.
                `http://localhost:${DEFAULT_AUTH_FLOW_PORT}`,
                `http://127.0.0.1:${DEFAULT_AUTH_FLOW_PORT}`
            ],
            scope: scopes?.join(AUTH_SCOPE_SEPARATOR),
            token_endpoint_auth_method: 'none',
            // https://openid.net/specs/openid-connect-registration-1_0.html
            application_type: 'native'
        })
    });
    if (!response.ok) {
        const result = await response.text();
        let errorDetails = result;
        try {
            const errorResponse = JSON.parse(result);
            if (isAuthorizationRegistrationErrorResponse(errorResponse)) {
                errorDetails = `${errorResponse.error}${errorResponse.error_description ? `: ${errorResponse.error_description}` : ''}`;
            }
        }
        catch {
            // JSON parsing failed, use raw text
        }
        throw new Error(`Registration to ${serverMetadata.registration_endpoint} failed: ${errorDetails}`);
    }
    const registration = await response.json();
    if (isAuthorizationDynamicClientRegistrationResponse(registration)) {
        return registration;
    }
    throw new Error(`Invalid authorization dynamic client registration response: ${JSON.stringify(registration)}`);
}
export function parseWWWAuthenticateHeader(wwwAuthenticateHeaderValue) {
    const parts = wwwAuthenticateHeaderValue.split(' ');
    const scheme = parts[0];
    const params = {};
    if (parts.length > 1) {
        const attributes = parts.slice(1).join(' ').split(',');
        attributes.forEach(attr => {
            const [key, value] = attr.split('=').map(s => s.trim().replace(/"/g, ''));
            params[key] = value;
        });
    }
    return { scheme, params };
}
export function getClaimsFromJWT(token) {
    const parts = token.split('.');
    if (parts.length !== 3) {
        throw new Error('Invalid JWT token format: token must have three parts separated by dots');
    }
    const [header, payload, _signature] = parts;
    try {
        const decodedHeader = JSON.parse(decodeBase64(header).toString());
        if (typeof decodedHeader !== 'object') {
            throw new Error('Invalid JWT token format: header is not a JSON object');
        }
        const decodedPayload = JSON.parse(decodeBase64(payload).toString());
        if (typeof decodedPayload !== 'object') {
            throw new Error('Invalid JWT token format: payload is not a JSON object');
        }
        return decodedPayload;
    }
    catch (e) {
        if (e instanceof Error) {
            throw new Error(`Failed to parse JWT token: ${e.message}`);
        }
        throw new Error('Failed to parse JWT token');
    }
}
/**
 * Extracts the resource server base URL from an OAuth protected resource metadata discovery endpoint URL.
 *
 * @param discoveryUrl The full URL to the OAuth protected resource metadata discovery endpoint
 * @returns The base URL of the resource server
 *
 * @example
 * ```typescript
 * getResourceServerBaseUrlFromDiscoveryUrl('https://mcp.example.com/.well-known/oauth-protected-resource')
 * // Returns: 'https://mcp.example.com/'
 *
 * getResourceServerBaseUrlFromDiscoveryUrl('https://mcp.example.com/.well-known/oauth-protected-resource/mcp')
 * // Returns: 'https://mcp.example.com/mcp'
 * ```
 */
export function getResourceServerBaseUrlFromDiscoveryUrl(discoveryUrl) {
    const url = new URL(discoveryUrl);
    // Remove the well-known discovery path only if it appears at the beginning
    if (!url.pathname.startsWith(AUTH_PROTECTED_RESOURCE_METADATA_DISCOVERY_PATH)) {
        throw new Error(`Invalid discovery URL: expected path to start with ${AUTH_PROTECTED_RESOURCE_METADATA_DISCOVERY_PATH}`);
    }
    const pathWithoutDiscovery = url.pathname.substring(AUTH_PROTECTED_RESOURCE_METADATA_DISCOVERY_PATH.length);
    // Construct the base URL
    const baseUrl = new URL(url.origin);
    baseUrl.pathname = pathWithoutDiscovery || '/';
    return baseUrl.toString();
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib2F1dGguanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy9hZHZpa2FyL0RvY3VtZW50cy9hcmNoaXRlY3QvYXJjaDIvQXJjaElERS9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL2NvbW1vbi9vYXV0aC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sYUFBYSxDQUFDO0FBRTNDLE1BQU0sZ0JBQWdCLEdBQUcsY0FBYyxDQUFDO0FBQ3hDLE1BQU0sQ0FBQyxNQUFNLCtDQUErQyxHQUFHLEdBQUcsZ0JBQWdCLDJCQUEyQixDQUFDO0FBQzlHLE1BQU0sQ0FBQyxNQUFNLG1DQUFtQyxHQUFHLEdBQUcsZ0JBQWdCLDZCQUE2QixDQUFDO0FBQ3BHLE1BQU0sQ0FBQyxNQUFNLDZCQUE2QixHQUFHLEdBQUcsZ0JBQWdCLHVCQUF1QixDQUFDO0FBQ3hGLE1BQU0sQ0FBQyxNQUFNLG9CQUFvQixHQUFHLEdBQUcsQ0FBQztBQUV4QyxlQUFlO0FBRWY7O0dBRUc7QUFDSCxNQUFNLENBQU4sSUFBa0Isc0JBT2pCO0FBUEQsV0FBa0Isc0JBQXNCO0lBQ3ZDLDREQUFrQyxDQUFBO0lBQ2xDLDBEQUFnQyxDQUFBO0lBQ2hDLHdEQUE4QixDQUFBO0lBQzlCLG9FQUEwQyxDQUFBO0lBQzFDLHlFQUErQyxDQUFBO0lBQy9DLHdEQUE4QixDQUFBO0FBQy9CLENBQUMsRUFQaUIsc0JBQXNCLEtBQXRCLHNCQUFzQixRQU92QztBQUVEOztHQUVHO0FBQ0gsTUFBTSxDQUFOLElBQWtCLGdDQWlCakI7QUFqQkQsV0FBa0IsZ0NBQWdDO0lBQ2pEOztPQUVHO0lBQ0gsa0ZBQThDLENBQUE7SUFDOUM7O09BRUc7SUFDSCwwREFBc0IsQ0FBQTtJQUN0Qjs7T0FFRztJQUNILGtFQUE4QixDQUFBO0lBQzlCOztPQUVHO0lBQ0gsa0VBQThCLENBQUE7QUFDL0IsQ0FBQyxFQWpCaUIsZ0NBQWdDLEtBQWhDLGdDQUFn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