import * as cp from 'child_process';
import * as fs from 'fs';
import * as net from 'net';
import * as stream from 'stream';
import * as path from 'path';
import { SocksClient, SocksClientOptions } from 'socks';
import * as vscode from 'vscode';
import * as ssh2 from 'ssh2';
import type { ParsedKey } from 'ssh2-streams';
import Log from './common/logger';
import SSHDestination from './ssh/sshDestination';
import SSHConnection, { SSHTunnelConfig } from './ssh/sshConnection';
import SSHConfiguration from './ssh/sshConfig';
import { gatherIdentityFiles } from './ssh/identityFiles';
import { untildify, exists as fileExists } from './common/files';
import { findRandomPort } from './common/ports';
import { disposeAll } from './common/disposable';
import { installCodeServer, startArchServer, ServerInstallError } from './serverSetup';
import { isWindows } from './common/platform';
import * as os from 'os';
import { JsonRpcInterceptor, InterceptorConfig } from './jsonRpcInterceptor';

const PASSWORD_RETRY_COUNT = 3;
const PASSPHRASE_RETRY_COUNT = 3;

export const REMOTE_SSH_AUTHORITY = 'arch-ssh-remote';

export function getRemoteAuthority(host: string) {
    return `${REMOTE_SSH_AUTHORITY}+${host}`;
}

class TunnelInfo implements vscode.Disposable {
    constructor(
        readonly localPort: number,
        readonly remotePortOrSocketPath: number | string,
        private disposables: vscode.Disposable[]
    ) {
    }

    dispose() {
        disposeAll(this.disposables);
    }
}

interface SSHKey {
    filename: string;
    parsedKey: ParsedKey;
    fingerprint: string;
    agentSupport?: boolean;
    isPrivate?: boolean;
}

export class RemoteSSHResolver implements vscode.RemoteAuthorityResolver, vscode.Disposable {

    private proxyConnections: SSHConnection[] = [];
    private sshConnection: SSHConnection | undefined;
    private sshAgentSock: string | undefined;
    private proxyCommandProcess: cp.ChildProcessWithoutNullStreams | undefined;

    private socksTunnel: SSHTunnelConfig | undefined;
    private tunnels: TunnelInfo[] = [];
    private jsonRpcInterceptor: JsonRpcInterceptor | undefined;

    private labelFormatterDisposable: vscode.Disposable | undefined;

    constructor(
        readonly context: vscode.ExtensionContext,
        readonly logger: Log
    ) {
    }

    resolve(authority: string, context: vscode.RemoteAuthorityResolverContext): Promise<vscode.ResolverResult> {
        console.log(`Arch SSH Extension: resolve() called with authority: ${authority}`);
        this.logger.trace(`resolve() called with authority: ${authority}`);
        const [type, dest] = authority.split('+');
        console.log(`Arch SSH Extension: Parsed type: ${type}, dest: ${dest}`);
        this.logger.trace(`Parsed type: ${type}, dest: ${dest}`);
        if (type !== REMOTE_SSH_AUTHORITY) {
            throw new Error(`Invalid authority type for Arch SSH resolver: ${type}`);
        }

        console.log(`Arch SSH Extension: Resolving arch ssh remote authority '${authority}' (attempt #${context.resolveAttempt})`);
        this.logger.info(`Resolving arch ssh remote authority '${authority}' (attemp #${context.resolveAttempt})`);

        console.log(`Arch SSH Extension: Parsing SSH destination...`);
        const sshDest = SSHDestination.parseEncoded(dest);
        console.log(`Arch SSH Extension: SSH destination parsed: ${JSON.stringify(sshDest)}`);

        // It looks like default values are not loaded yet when resolving a remote,
        // so let's hardcode the default values here
        console.log(`Arch SSH Extension: Loading SSH configuration...`);
        const archSSHconfig = vscode.workspace.getConfiguration('arch.ssh');
        const enableDynamicForwarding = archSSHconfig.get<boolean>('enableDynamicForwarding', true)!;
        const enableAgentForwarding = archSSHconfig.get<boolean>('enableAgentForwarding', true)!;
        const serverPort = archSSHconfig.get<number>('serverPort', 8080)!;
        const defaultExtensions = archSSHconfig.get<string[]>('defaultExtensions', []);
        const remotePlatformMap = archSSHconfig.get<Record<string, string>>('remotePlatform', {});
        const remoteServerListenOnSocket = archSSHconfig.get<boolean>('remoteServerListenOnSocket', false)!;
        const connectTimeout = archSSHconfig.get<number>('connectTimeout', 60)!;
        
        console.log(`Arch SSH Extension: SSH configuration loaded - remoteServerListenOnSocket: ${remoteServerListenOnSocket}, serverPort: ${serverPort}, connectTimeout: ${connectTimeout}`);
        this.logger.info(`SSH configuration - remoteServerListenOnSocket: ${remoteServerListenOnSocket}`);

        console.log(`Arch SSH Extension: Starting progress dialog...`);
        return vscode.window.withProgress({
            title: `Setting up Arch SSH Host ${sshDest.hostname}`,
            location: vscode.ProgressLocation.Notification,
            cancellable: false
        }, async () => {
            try {
                console.log(`Arch SSH Extension: Loading SSH configuration from filesystem...`);
                const sshconfig = await SSHConfiguration.loadFromFS();
                console.log(`Arch SSH Extension: SSH configuration loaded from filesystem`);
                const sshHostConfig = sshconfig.getHostConfiguration(sshDest.hostname);
                console.log(`Arch SSH Extension: SSH host config: ${JSON.stringify(sshHostConfig)}`);
                const sshHostName = sshHostConfig['HostName'] ? sshHostConfig['HostName'].replace('%h', sshDest.hostname) : sshDest.hostname;
                const sshUser = sshHostConfig['User'] || sshDest.user || os.userInfo().username || ''; // https://github.com/openssh/openssh-portable/blob/5ec5504f1d328d5bfa64280cd617c3efec4f78f3/sshconnect.c#L1561-L1562
                const sshPort = sshHostConfig['Port'] ? parseInt(sshHostConfig['Port'], 10) : (sshDest.port || 22);
                console.log(`Arch SSH Extension: SSH connection details - host: ${sshHostName}, user: ${sshUser}, port: ${sshPort}`);

                this.sshAgentSock = sshHostConfig['IdentityAgent'] || process.env['SSH_AUTH_SOCK'] || (isWindows ? '\\\\.\\pipe\\openssh-ssh-agent' : undefined);
                this.sshAgentSock = this.sshAgentSock ? untildify(this.sshAgentSock) : undefined;
                const agentForward = enableAgentForwarding && (sshHostConfig['ForwardAgent'] || 'no').toLowerCase() === 'yes';
                const agent = agentForward && this.sshAgentSock ? new ssh2.OpenSSHAgent(this.sshAgentSock) : undefined;

                const preferredAuthentications = sshHostConfig['PreferredAuthentications'] ? sshHostConfig['PreferredAuthentications'].split(',').map(s => s.trim()) : ['publickey', 'password', 'keyboard-interactive'];

                const identityFiles: string[] = (sshHostConfig['IdentityFile'] as unknown as string[]) || [];
                const identitiesOnly = (sshHostConfig['IdentitiesOnly'] || 'no').toLowerCase() === 'yes';
                const identityKeys = await gatherIdentityFiles(identityFiles, this.sshAgentSock, identitiesOnly, this.logger);

                // Create proxy jump connections if any
                let proxyStream: ssh2.ClientChannel | stream.Duplex | undefined;
                if (sshHostConfig['ProxyJump']) {
                    const proxyJumps = sshHostConfig['ProxyJump'].split(',').filter(i => !!i.trim())
                        .map(i => {
                            const proxy = SSHDestination.parse(i);
                            const proxyHostConfig = sshconfig.getHostConfiguration(proxy.hostname);
                            return [proxy, proxyHostConfig] as [SSHDestination, Record<string, string>];
                        });
                    for (let i = 0; i < proxyJumps.length; i++) {
                        const [proxy, proxyHostConfig] = proxyJumps[i];
                        const proxyHostName = proxyHostConfig['HostName'] || proxy.hostname;
                        const proxyUser = proxyHostConfig['User'] || proxy.user || sshUser;
                        const proxyPort = proxyHostConfig['Port'] ? parseInt(proxyHostConfig['Port'], 10) : (proxy.port || sshPort);

                        const proxyAgentForward = enableAgentForwarding && (proxyHostConfig['ForwardAgent'] || 'no').toLowerCase() === 'yes';
                        const proxyAgent = proxyAgentForward && this.sshAgentSock ? new ssh2.OpenSSHAgent(this.sshAgentSock) : undefined;

                        const proxyIdentityFiles: string[] = (proxyHostConfig['IdentityFile'] as unknown as string[]) || [];
                        const proxyIdentitiesOnly = (proxyHostConfig['IdentitiesOnly'] || 'no').toLowerCase() === 'yes';
                        const proxyIdentityKeys = await gatherIdentityFiles(proxyIdentityFiles, this.sshAgentSock, proxyIdentitiesOnly, this.logger);

                        const proxyAuthHandler = this.getSSHAuthHandler(proxyUser, proxyHostName, proxyIdentityKeys, preferredAuthentications);
                        const proxyConnection = new SSHConnection({
                            host: !proxyStream ? proxyHostName : undefined,
                            port: !proxyStream ? proxyPort : undefined,
                            sock: proxyStream,
                            username: proxyUser,
                            readyTimeout: connectTimeout * 1000,
                            strictVendor: false,
                            agentForward: proxyAgentForward,
                            agent: proxyAgent,
                            authHandler: (arg0, arg1, arg2) => (proxyAuthHandler(arg0, arg1, arg2), undefined)
                        });
                        this.proxyConnections.push(proxyConnection);

                        const nextProxyJump = i < proxyJumps.length - 1 ? proxyJumps[i + 1] : undefined;
                        const destIP = nextProxyJump ? (nextProxyJump[1]['HostName'] || nextProxyJump[0].hostname) : sshHostName;
                        const destPort = nextProxyJump ? ((nextProxyJump[1]['Port'] && parseInt(nextProxyJump[1]['Port'], 10)) || nextProxyJump[0].port || 22) : sshPort;
                        proxyStream = await proxyConnection.forwardOut('127.0.0.1', 0, destIP, destPort);
                    }
                } else if (sshHostConfig['ProxyCommand']) {
                    let proxyArgs = (sshHostConfig['ProxyCommand'] as unknown as string[])
                        .map((arg) => arg.replace('%h', sshHostName).replace('%n', sshDest.hostname).replace('%p', sshPort.toString()).replace('%r', sshUser));
                    let proxyCommand = proxyArgs.shift()!;

                    let options = {};
                    if (isWindows && /\.(bat|cmd)$/.test(proxyCommand)) {
                        proxyCommand = `"${proxyCommand}"`;
                        proxyArgs = proxyArgs.map((arg) => arg.includes(' ') ? `"${arg}"` : arg);
                        options = { shell: true, windowsHide: true, windowsVerbatimArguments: true };
                    }

                    this.logger.trace(`Spawning ProxyCommand: ${proxyCommand} ${proxyArgs.join(' ')}`);

                    const child = cp.spawn(proxyCommand, proxyArgs, options);
                    proxyStream = stream.Duplex.from({ readable: child.stdout, writable: child.stdin });
                    this.proxyCommandProcess = child;
                }

                // Create final shh connection
                console.log(`Arch SSH Extension: Creating SSH connection...`);
                this.logger.trace(`About to create SSH connection to ${sshHostName}:${sshPort} as ${sshUser}`);
                const sshAuthHandler = this.getSSHAuthHandler(sshUser, sshHostName, identityKeys, preferredAuthentications);

                console.log(`Arch SSH Extension: Creating SSH connection to ${sshHostName}:${sshPort} as user ${sshUser}`);
                this.logger.info(`Creating SSH connection to ${sshHostName}:${sshPort} as user ${sshUser}`);
                this.sshConnection = new SSHConnection({
                    host: !proxyStream ? sshHostName : undefined,
                    port: !proxyStream ? sshPort : undefined,
                    sock: proxyStream,
                    username: sshUser,
                    readyTimeout: connectTimeout * 1000,
                    strictVendor: false,
                    agentForward,
                    agent,
                    authHandler: (arg0, arg1, arg2) => (sshAuthHandler(arg0, arg1, arg2), undefined),
                });
                console.log(`Arch SSH Extension: SSH connection object created, attempting to connect...`);
                this.logger.info(`Connecting to SSH server...`);
                
                // Add connection timeout handling
                const connectionPromise = this.sshConnection.connect();
                const timeoutPromise = new Promise((_, reject) => {
                    setTimeout(() => {
                        reject(new Error(`SSH connection timeout after ${connectTimeout} seconds`));
                    }, (connectTimeout + 10) * 1000);
                });
                
                await Promise.race([connectionPromise, timeoutPromise]);
                console.log(`Arch SSH Extension: SSH connection established successfully`);
                this.logger.info(`SSH connection established successfully`);

                const envVariables: Record<string, string | null> = {};
                if (agentForward) {
                    envVariables['SSH_AUTH_SOCK'] = null;
                }

                console.log(`Arch SSH Extension: Starting Arch server installation - serverPort: ${serverPort}, remoteServerListenOnSocket: ${remoteServerListenOnSocket}`);
                this.logger.info(`Starting Arch server installation - serverPort: ${serverPort}, remoteServerListenOnSocket: ${remoteServerListenOnSocket}`);
                const installResult = await startArchServer(this.sshConnection, serverPort, defaultExtensions, Object.keys(envVariables), remotePlatformMap[sshDest.hostname], remoteServerListenOnSocket, this.logger);
                console.log(`Arch SSH Extension: Server installation completed - exitCode: ${installResult.exitCode}, listeningOn: ${installResult.listeningOn}, type: ${typeof installResult.listeningOn}`);
                this.logger.info(`Server installation completed - exitCode: ${installResult.exitCode}, listeningOn: ${installResult.listeningOn}, type: ${typeof installResult.listeningOn}`);

                console.log(`Arch SSH Extension: Processing environment variables...`);
                for (const key of Object.keys(envVariables)) {
                    if (installResult[key] !== undefined) {
                        envVariables[key] = installResult[key];
                    }
                }
                console.log(`Arch SSH Extension: Environment variables processed`);

                console.log(`Arch SSH Extension: Updating terminal environment variables...`);
                // Update terminal env variables
                this.context.environmentVariableCollection.persistent = false;
                for (const [key, value] of Object.entries(envVariables)) {
                    if (value) {
                        this.context.environmentVariableCollection.replace(key, value);
                    }
                }
                console.log(`Arch SSH Extension: Terminal environment variables updated`);

                // SOCKS tunneling temporarily disabled
                // if (enableDynamicForwarding) {
                //     const socksPort = await findRandomPort();
                //     this.socksTunnel = await this.sshConnection!.addTunnel({
                //         name: `ssh_tunnel_socks_${socksPort}`,
                //         localPort: socksPort,
                //         socks: true
                //     });
                // }

                console.log(`Arch SSH Extension: Server listening on: ${installResult.listeningOn} (type: ${typeof installResult.listeningOn})`);
                this.logger.trace(`Server listening on: ${installResult.listeningOn} (type: ${typeof installResult.listeningOn})`);
                console.log(`Arch SSH Extension: Creating tunnel to server on: ${installResult.listeningOn}`);
                this.logger.info(`Creating tunnel to server on: ${installResult.listeningOn}`);
                
                // Add tunnel creation timeout handling
                const tunnelPromise = this.openTunnel(0, installResult.listeningOn);
                const tunnelTimeoutPromise = new Promise<never>((_, reject) => {
                    setTimeout(() => {
                        reject(new Error(`Tunnel creation timeout after 30 seconds`));
                    }, 30000);
                });
                
                const tunnelConfig = await Promise.race([tunnelPromise, tunnelTimeoutPromise]);
                console.log(`Arch SSH Extension: Tunnel created with local port: ${tunnelConfig.localPort}`);
                this.logger.trace(`Tunnel created with local port: ${tunnelConfig.localPort}`);
                console.log(`Arch SSH Extension: Tunnel successfully created - local port: ${tunnelConfig.localPort}, remote: ${installResult.listeningOn}`);
                this.logger.info(`Tunnel successfully created - local port: ${tunnelConfig.localPort}, remote: ${installResult.listeningOn}`);
                this.tunnels.push(tunnelConfig);

                console.log(`Arch SSH Extension: Enabling ports view...`);
                // Enable ports view
                vscode.commands.executeCommand('setContext', 'forwardedPortsViewEnabled', true);
                console.log(`Arch SSH Extension: Ports view enabled`);

                console.log(`Arch SSH Extension: Setting up label formatter...`);
                this.labelFormatterDisposable?.dispose();
                this.labelFormatterDisposable = vscode.workspace.registerResourceLabelFormatter({
                    scheme: 'vscode-remote',
                    authority: `${REMOTE_SSH_AUTHORITY}+*`,
                    formatting: {
                        label: '${path}',
                        separator: '/',
                        tildify: true,
                        workspaceSuffix: `SSH: ${sshDest.hostname}` + (sshDest.port && sshDest.port !== 22 ? `:${sshDest.port}` : '')
                    }
                });
                console.log(`Arch SSH Extension: Label formatter set up`);

                console.log(`Arch SSH Extension: Creating ResolvedAuthority with tunnelConfig.localPort: ${tunnelConfig.localPort}`);
                this.logger.info(`Creating ResolvedAuthority with tunnelConfig.localPort: ${tunnelConfig.localPort}`);
                const resolvedAuthority: vscode.ResolvedAuthority = {
                    host: '127.0.0.1',
                    port: tunnelConfig.localPort,
                    connectionToken: installResult.connectionToken
                };
                console.log(`Arch SSH Extension: Resolved authority created: ${JSON.stringify(resolvedAuthority)}`);
                this.logger.trace(`Resolved authority: ${JSON.stringify(resolvedAuthority)}`);
                console.log(`Arch SSH Extension: Final resolved authority - host: ${resolvedAuthority.host}, port: ${resolvedAuthority.port}, token: ${resolvedAuthority.connectionToken}`);
                this.logger.info(`Final resolved authority - host: ${resolvedAuthority.host}, port: ${resolvedAuthority.port}, token: ${resolvedAuthority.connectionToken}`);
                const resolvedResult: vscode.ResolverResult = {
                    authority: resolvedAuthority,
                    extensionHostEnv: envVariables as { [key: string]: string }
                };
                console.log(`Arch SSH Extension: About to return resolved result: ${JSON.stringify(resolvedResult)}`);
                return resolvedResult;
            } catch (e: unknown) {
                this.logger.error(`Error resolving authority`, e);
                this.logger.error(`Error details: ${e instanceof Error ? e.stack : String(e)}`);

                // Initial connection
                if (context.resolveAttempt === 1) {
                    this.logger.show();

                    const closeRemote = 'Close Remote';
                    const retry = 'Retry';
                    const result = await vscode.window.showErrorMessage(`Could not establish connection to "${sshDest.hostname}"`, { modal: true }, closeRemote, retry);
                    if (result === closeRemote) {
                        await vscode.commands.executeCommand('workbench.action.remote.close');
                    } else if (result === retry) {
                        await vscode.commands.executeCommand('workbench.action.reloadWindow');
                    }
                }

                if (e instanceof ServerInstallError || !(e instanceof Error)) {
                    throw new Error(`NotAvailable: ${e instanceof Error ? e.message : String(e)}`);
                } else {
                    throw new Error(`TemporarilyNotAvailable: ${e.message}`);
                }
            }
        });
    }

    // Optional method to get canonical URI
    getCanonicalURI?(uri: vscode.Uri): vscode.ProviderResult<vscode.Uri> {
        // For SSH connections, the URI is already canonical
        return undefined;
    }

    // Optional tunnel factory for better port forwarding
    tunnelFactory?(tunnelOptions: any, tunnelCreationOptions: any): Promise<any> | undefined {
        // Use our custom tunnel implementation
        return undefined;
    }

    // Optional port candidate filter
    showCandidatePort?(host: string, port: number, detail: string): Promise<boolean> {
        // Show all candidate ports
        return Promise.resolve(true);
    }

    private async openTunnel(localPort: number, remotePortOrSocketPath: number | string) {
        console.log(`Arch SSH Extension: openTunnel called with localPort: ${localPort}, remotePortOrSocketPath: ${remotePortOrSocketPath}`);
        localPort = localPort > 0 ? localPort : await findRandomPort();
        console.log(`Arch SSH Extension: Using localPort: ${localPort}`);

        const disposables: vscode.Disposable[] = [];
        const remotePort = typeof remotePortOrSocketPath === 'number' ? remotePortOrSocketPath : undefined;
        const remoteSocketPath = typeof remotePortOrSocketPath === 'string' ? remotePortOrSocketPath : undefined;
        // SOCKS tunneling temporarily disabled - always use direct tunnel
        console.log(`Arch SSH Extension: Opening tunnel ${localPort}(local) => ${remotePortOrSocketPath}(remote)`);
        this.logger.trace(`Opening tunnel ${localPort}(local) => ${remotePortOrSocketPath}(remote)`);
        console.log(`Arch SSH Extension: Remote port: ${remotePort}, Remote socket path: ${remoteSocketPath}`);
        this.logger.trace(`Remote port: ${remotePort}, Remote socket path: ${remoteSocketPath}`);
        
        const tunnelConfig = await this.sshConnection!.addTunnel({
            name: `ssh_tunnel_${localPort}_${remotePortOrSocketPath}`,
            remoteAddr: '127.0.0.1',
            remotePort,
            remoteSocketPath,
            localPort
        });
        
        console.log(`Arch SSH Extension: Tunnel config: ${JSON.stringify(tunnelConfig)}`);
        this.logger.trace(`Tunnel config: ${JSON.stringify(tunnelConfig)}`);
        console.log(`Arch SSH Extension: SSH tunnel created - localPort: ${tunnelConfig.localPort}, remotePort: ${tunnelConfig.remotePort}, remoteSocketPath: ${tunnelConfig.remoteSocketPath}`);
        this.logger.info(`SSH tunnel created - localPort: ${tunnelConfig.localPort}, remotePort: ${tunnelConfig.remotePort}, remoteSocketPath: ${tunnelConfig.remoteSocketPath}`);
        
        // Ensure the tunnel is fully established and localPort is set
        if (!tunnelConfig.localPort) {
            throw new Error(`Failed to establish tunnel: localPort is not set`);
        }
        
        console.log(`Arch SSH Extension: Creating disposables for tunnel...`);
        disposables.push({
            dispose: () => {
                this.sshConnection?.closeTunnel(tunnelConfig.name);
                this.logger.trace(`Tunnel ${tunnelConfig.name} closed`);
            }
        });

        console.log(`Arch SSH Extension: Creating TunnelInfo with localPort: ${tunnelConfig.localPort}, remotePortOrSocketPath: ${remotePortOrSocketPath}`);
        
        // JSON-RPC interceptor completely removed to fix WebSocket connection issues
        
        const tunnelInfo = new TunnelInfo(tunnelConfig.localPort, remotePortOrSocketPath, disposables);
        console.log(`Arch SSH Extension: TunnelInfo created successfully`);
        return tunnelInfo;
    }

    private getSSHAuthHandler(sshUser: string, sshHostName: string, identityKeys: SSHKey[], preferredAuthentications: string[]) {
        let passwordRetryCount = PASSWORD_RETRY_COUNT;
        let keyboardRetryCount = PASSWORD_RETRY_COUNT;
        identityKeys = identityKeys.slice();
        return async (methodsLeft: string[] | null, _partialSuccess: boolean | null, callback: (nextAuth: any) => void) => {
            if (methodsLeft === null) {
                this.logger.info(`Trying no-auth authentication`);

                return callback({
                    type: 'none',
                    username: sshUser,
                });
            }
            if (methodsLeft.includes('publickey') && identityKeys.length && preferredAuthentications.includes('publickey')) {
                const identityKey = identityKeys.shift()!;

                this.logger.info(`Trying publickey authentication: ${identityKey.filename} ${identityKey.parsedKey.type} SHA256:${identityKey.fingerprint}`);

                if (identityKey.agentSupport) {
                    return callback({
                        type: 'agent',
                        username: sshUser,
                        agent: new class implements ssh2.OpenSSHAgent {
                            // Only return the current key
                            getIdentities(callback: (err: Error | undefined, publicKeys?: ParsedKey[]) => void): void {
                                callback(undefined, [identityKey.parsedKey]);
                            }
                        }
                    });
                }
                if (identityKey.isPrivate) {
                    return callback({
                        type: 'publickey',
                        username: sshUser,
                        key: identityKey.parsedKey
                    });
                }
                if (!await fileExists(identityKey.filename)) {
                    // Try next identity file
                    return callback(null as any);
                }

                const keyBuffer = await fs.promises.readFile(identityKey.filename);
                let result = ssh2.utils.parseKey(keyBuffer); // First try without passphrase
                if (result instanceof Error && result.message === 'Encrypted private OpenSSH key detected, but no passphrase given') {
                    let passphraseRetryCount = PASSPHRASE_RETRY_COUNT;
                    while (result instanceof Error && passphraseRetryCount > 0) {
                        const passphrase = await vscode.window.showInputBox({
                            title: `Enter passphrase for ${identityKey.filename}`,
                            password: true,
                            ignoreFocusOut: true
                        });
                        if (!passphrase) {
                            break;
                        }
                        result = ssh2.utils.parseKey(keyBuffer, passphrase);
                        passphraseRetryCount--;
                    }
                }
                if (!result || result instanceof Error) {
                    // Try next identity file
                    return callback(null as any);
                }

                const key = Array.isArray(result) ? result[0] : result;
                return callback({
                    type: 'publickey',
                    username: sshUser,
                    key
                });
            }
            if (methodsLeft.includes('password') && passwordRetryCount > 0 && preferredAuthentications.includes('password')) {
                if (passwordRetryCount === PASSWORD_RETRY_COUNT) {
                    this.logger.info(`Trying password authentication`);
                }

                const password = await vscode.window.showInputBox({
                    title: `Enter password for ${sshUser}@${sshHostName}`,
                    password: true,
                    ignoreFocusOut: true
                });
                passwordRetryCount--;

                return callback(password
                    ? {
                        type: 'password',
                        username: sshUser,
                        password
                    }
                    : false);
            }
            if (methodsLeft.includes('keyboard-interactive') && keyboardRetryCount > 0 && preferredAuthentications.includes('keyboard-interactive')) {
                if (keyboardRetryCount === PASSWORD_RETRY_COUNT) {
                    this.logger.info(`Trying keyboard-interactive authentication`);
                }

                return callback({
                    type: 'keyboard-interactive',
                    username: sshUser,
                    prompt: async (_name, _instructions, _instructionsLang, prompts, finish) => {
                        const responses: string[] = [];
                        for (const prompt of prompts) {
                            const response = await vscode.window.showInputBox({
                                title: `(${sshUser}@${sshHostName}) ${prompt.prompt}`,
                                password: !prompt.echo,
                                ignoreFocusOut: true
                            });
                            if (response === undefined) {
                                keyboardRetryCount = 0;
                                break;
                            }
                            responses.push(response);
                        }
                        keyboardRetryCount--;
                        finish(responses);
                    }
                });
            }

            callback(false);
        };
    }

    dispose() {
        disposeAll(this.tunnels);
        // If there's proxy connections then just close the parent connection
        if (this.proxyConnections.length) {
            this.proxyConnections[0].close();
        } else {
            this.sshConnection?.close();
        }
        this.proxyCommandProcess?.kill();
        this.labelFormatterDisposable?.dispose();
        
        // JSON-RPC interceptor cleanup removed
    }
}
