import * as vscode from 'vscode';
import Log from './common/logger';
import { RemoteSSHResolver, REMOTE_SSH_AUTHORITY } from './authResolver';
import { openSSHConfigFile, promptOpenRemoteSSHWindow } from './commands';
import { HostTreeDataProvider } from './hostTreeView';
import { getRemoteWorkspaceLocationData, RemoteLocationHistory } from './remoteLocationHistory';

export async function activate(context: vscode.ExtensionContext) {
    const logger = new Log('Remote - SSH');
    context.subscriptions.push(logger);

    // Test log to verify the logger is working
    logger.info('SSH Extension activated - Enhanced logging ready!');
    logger.debug('Debug logging test - you should see this if debug level is enabled');
    
    // Monitor VS Code's language server communications at the extension host level
    monitorLanguageServerCommunications(logger);
    
    // Show which enhanced logging features are enabled
    const config = vscode.workspace.getConfiguration('remote.SSH');
    const enabledFeatures = [];
    if (config.get('logFileOperations')) enabledFeatures.push('📁 File Operations');
    if (config.get('logNetworkTraffic')) enabledFeatures.push('🌐 Network Traffic');
    if (config.get('logTunnelActivity')) enabledFeatures.push('🚇 Tunnel Activity');
    if (config.get('logJsonRpc')) enabledFeatures.push('📤 JSON-RPC Messages');
    
    if (enabledFeatures.length > 0) {
        logger.info(`🎯 Enhanced logging enabled: ${enabledFeatures.join(', ')}`);
    }

    // Add test command to manually trigger enhanced logging
    context.subscriptions.push(vscode.commands.registerCommand('openremotessh.testEnhancedLogging', () => {
        logger.info('🧪 Testing Enhanced Logging Features...');
        logger.show(); // Force show the output panel
        
        // Test all the enhanced logging methods
        logger.logConnectionState('CONNECTING', 'test.example.com', { attempt: 1 });
        
        logger.logAuthenticationAttempt('publickey', true, {
            keyFile: '~/.ssh/id_rsa',
            keyType: 'ssh-rsa',
            fingerprint: 'SHA256:test123...'
        });
        
        logger.logConnectionState('CONNECTED', 'test.example.com', { port: 22 });
        
        logger.logServerInstallation('STARTING', 0, { platform: 'linux' });
        logger.logServerInstallation('COMPLETE', 100, { platform: 'linux' });
        
        logger.logTunnelActivity({
            localPort: 8080,
            remoteEndpoint: '/tmp/vscode-server.sock',
            action: 'CREATE',
            duration: 50
        });
        
        logger.logFileOperation({
            operation: 'READ',
            path: '/workspace/test.ts',
            size: 1024,
            duration: 15
        });
        
        // Test JSON-RPC logging with comprehensive examples
        logger.info('🔄 Testing JSON-RPC Message Types...');
        
        // File open
        logger.logJsonRpcMessage('LOCAL→REMOTE', {
            jsonrpc: '2.0',
            id: 123,
            method: 'textDocument/didOpen',
            params: {
                textDocument: {
                    uri: 'file:///remote/components/Button.tsx'
                }
            }
        });
        
        // File change
        logger.logJsonRpcMessage('LOCAL→REMOTE', {
            jsonrpc: '2.0',
            method: 'textDocument/didChange',
            params: {
                textDocument: {
                    uri: 'file:///remote/components/Button.tsx'
                },
                contentChanges: [
                    { text: 'const [state, setState] = useState();' }
                ]
            }
        });
        
        // File save
        logger.logJsonRpcMessage('LOCAL→REMOTE', {
            jsonrpc: '2.0',
            method: 'textDocument/didSave',
            params: {
                textDocument: {
                    uri: 'file:///remote/components/Button.tsx'
                }
            }
        });
        
        // Auto-completion request
        logger.logJsonRpcMessage('LOCAL→REMOTE', {
            jsonrpc: '2.0',
            id: 456,
            method: 'textDocument/completion',
            params: {
                textDocument: {
                    uri: 'file:///remote/components/Button.tsx'
                },
                position: { line: 15, character: 8 }
            }
        });
        
        // Completion response
        logger.logJsonRpcMessage('REMOTE→LOCAL', {
            jsonrpc: '2.0',
            id: 456,
            result: {
                items: [
                    { label: 'useState', kind: 3 },
                    { label: 'useEffect', kind: 3 }
                ]
            }
        });
        
        // Diagnostics (errors/warnings)
        logger.logJsonRpcMessage('REMOTE→LOCAL', {
            jsonrpc: '2.0',
            method: 'textDocument/publishDiagnostics',
            params: {
                uri: 'file:///remote/components/Button.tsx',
                diagnostics: [
                    { severity: 1, message: 'Type error' },
                    { severity: 2, message: 'Unused variable' }
                ]
            }
        });
        
        // File watcher notification
        logger.logJsonRpcMessage('REMOTE→LOCAL', {
            jsonrpc: '2.0',
            method: 'workspace/didChangeWatchedFiles',
            params: {
                changes: [
                    { uri: 'file:///remote/package.json', type: 2 },
                    { uri: 'file:///remote/src/index.ts', type: 2 }
                ]
            }
        });
        
        // Statistics
        logger.logJsonRpcStats('LOCAL→REMOTE', 45, 8742);
        logger.logJsonRpcStats('REMOTE→LOCAL', 23, 15638);
        
        logger.info('✅ Enhanced logging test complete!');
        
        vscode.window.showInformationMessage('✅ Check the "Remote - SSH" output panel for emoji logs!');
    }));

    // Add direct connection test command
    context.subscriptions.push(vscode.commands.registerCommand('openremotessh.directConnectionTest', async () => {
        logger.info('🔧 Direct Connection Test - Opening SSH window...');
        
        // This should directly trigger our resolver
        const testHost = 'test.example.com';
        const authority = `open-ssh-remote+${testHost}`;
        
        logger.debug(`🎯 Triggering connection with authority: ${authority}`);
        
        try {
            await vscode.commands.executeCommand('vscode.newWindow', { 
                remoteAuthority: authority,
                reuseWindow: false 
            });
            logger.info('✅ Connection command executed successfully');
        } catch (error) {
            logger.error('❌ Connection command failed', error);
        }
    }));

    const remoteSSHResolver = new RemoteSSHResolver(context, logger);
    
    // Debug: Log resolver registration
    logger.debug(`🔗 Registering RemoteSSHResolver for authority: ${REMOTE_SSH_AUTHORITY}`);
    
    context.subscriptions.push(vscode.workspace.registerRemoteAuthorityResolver(REMOTE_SSH_AUTHORITY, remoteSSHResolver));
    context.subscriptions.push(remoteSSHResolver);

    const locationHistory = new RemoteLocationHistory(context);
    const locationData = getRemoteWorkspaceLocationData();
    if (locationData) {
        await locationHistory.addLocation(locationData[0], locationData[1]);
    }

    const hostTreeDataProvider = new HostTreeDataProvider(locationHistory);
    context.subscriptions.push(vscode.window.createTreeView('sshHosts', { treeDataProvider: hostTreeDataProvider }));
    context.subscriptions.push(hostTreeDataProvider);

    context.subscriptions.push(vscode.commands.registerCommand('openremotessh.openEmptyWindow', () => promptOpenRemoteSSHWindow(false)));
    context.subscriptions.push(vscode.commands.registerCommand('openremotessh.openEmptyWindowInCurrentWindow', () => promptOpenRemoteSSHWindow(true)));
    context.subscriptions.push(vscode.commands.registerCommand('openremotessh.openConfigFile', () => openSSHConfigFile()));
    context.subscriptions.push(vscode.commands.registerCommand('openremotessh.showLog', () => logger.show()));

    // Debug: Log all registered commands
    logger.debug('📝 Registered commands:', {
        commands: [
            'openremotessh.openEmptyWindow',
            'openremotessh.openEmptyWindowInCurrentWindow', 
            'openremotessh.openConfigFile',
            'openremotessh.showLog',
            'openremotessh.testEnhancedLogging',
            'openremotessh.directConnectionTest'
        ]
    });

    // Debug: Check what SSH-related extensions are available
    vscode.commands.getCommands().then(allCommands => {
        const sshCommands = allCommands.filter(cmd => 
            cmd.includes('ssh') || 
            cmd.includes('remote') || 
            cmd.includes('Remote')
        );
        logger.debug('🔍 All SSH/Remote commands found:', { sshCommands: sshCommands.slice(0, 20) });
    });
}

function monitorLanguageServerCommunications(logger: Log) {
    // Monitor workspace events that indicate JSON-RPC activity
    logger.info('🎯 Setting up VS Code language server monitoring...');
    
    // Monitor text document events (these trigger JSON-RPC)
    vscode.workspace.onDidOpenTextDocument((document) => {
        if (vscode.env.remoteName) {
            logger.logJsonRpcMessage('LOCAL→REMOTE', {
                jsonrpc: '2.0',
                method: 'textDocument/didOpen',
                params: {
                    textDocument: {
                        uri: document.uri.toString(),
                        languageId: document.languageId,
                        version: document.version,
                        text: `[${document.getText().length} chars]`
                    }
                }
            });
        }
    });
    
    vscode.workspace.onDidChangeTextDocument((event) => {
        if (vscode.env.remoteName && event.contentChanges.length > 0) {
            // Skip output channels and log files to avoid recursive logging
            const uri = event.document.uri.toString();
            if (uri.includes('output:') || 
                uri.includes('extension-output-') || 
                uri.endsWith('.log') ||
                uri.includes('Remote%20-%20SSH')) {
                return; // Skip logging for output channels and log files
            }
            
            // Only log if there are actual meaningful content changes (not empty/whitespace-only)
            const hasActualChanges = event.contentChanges.some(change => 
                (change.text && change.text.trim().length > 0) || 
                (change.range && !change.range.isEmpty) // deletions/replacements
            );
            
            if (hasActualChanges) {
                logger.logJsonRpcMessage('LOCAL→REMOTE', {
                    jsonrpc: '2.0',
                    method: 'textDocument/didChange',
                    params: {
                        textDocument: {
                            uri: event.document.uri.toString(),
                            version: event.document.version
                        },
                        contentChanges: event.contentChanges.map(change => ({
                            range: change.range,
                            text: `[${change.text.length} chars]`
                        }))
                    }
                });
            }
        }
    });
    
    vscode.workspace.onDidSaveTextDocument((document) => {
        if (vscode.env.remoteName) {
            logger.logJsonRpcMessage('LOCAL→REMOTE', {
                jsonrpc: '2.0',
                method: 'textDocument/didSave',
                params: {
                    textDocument: {
                        uri: document.uri.toString()
                    }
                }
            });
        }
    });
    
    vscode.workspace.onDidCloseTextDocument((document) => {
        if (vscode.env.remoteName) {
            logger.logJsonRpcMessage('LOCAL→REMOTE', {
                jsonrpc: '2.0',
                method: 'textDocument/didClose',
                params: {
                    textDocument: {
                        uri: document.uri.toString()
                    }
                }
            });
        }
    });
    
    // Monitor language feature requests
    vscode.languages.registerCompletionItemProvider('*', {
        provideCompletionItems(document, position) {
            if (vscode.env.remoteName) {
                logger.logJsonRpcMessage('LOCAL→REMOTE', {
                    jsonrpc: '2.0',
                    id: Math.floor(Math.random() * 1000),
                    method: 'textDocument/completion',
                    params: {
                        textDocument: {
                            uri: document.uri.toString()
                        },
                        position: {
                            line: position.line,
                            character: position.character
                        }
                    }
                });
            }
            return [];
        }
    });
    
    // Monitor hover requests
    vscode.languages.registerHoverProvider('*', {
        provideHover(document, position) {
            if (vscode.env.remoteName) {
                logger.logJsonRpcMessage('LOCAL→REMOTE', {
                    jsonrpc: '2.0',
                    id: Math.floor(Math.random() * 1000),
                    method: 'textDocument/hover',
                    params: {
                        textDocument: {
                            uri: document.uri.toString()
                        },
                        position: {
                            line: position.line,
                            character: position.character
                        }
                    }
                });
            }
            return null;
        }
    });
    
    logger.info('✅ VS Code language server monitoring active');
}

export function deactivate() {
}
