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

    // Add test command to manually trigger enhanced logging
    context.subscriptions.push(vscode.commands.registerCommand('openremotessh.testEnhancedLogging', () => {
        logger.info('🧪 Testing Enhanced Logging Features...');
        
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
        
        logger.info('✅ Enhanced logging test complete!');
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

export function deactivate() {
}
