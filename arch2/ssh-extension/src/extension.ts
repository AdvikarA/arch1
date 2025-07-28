import * as vscode from 'vscode';
import Log from './common/logger';
import { RemoteSSHResolver, REMOTE_SSH_AUTHORITY } from './authResolver';
import { openSSHConfigFile, promptOpenRemoteSSHWindow } from './commands';
import { HostTreeDataProvider } from './hostTreeView';
import { getRemoteWorkspaceLocationData, RemoteLocationHistory } from './remoteLocationHistory';
import { JsonRpcViewer } from './jsonRpcViewer';

export async function activate(context: vscode.ExtensionContext) {
    console.log('Arch SSH Extension: activate() called');
    console.log('Arch SSH Extension: Starting activation process...');
    const logger = new Log('Arch SSH');
    context.subscriptions.push(logger);
    logger.info('Arch SSH Extension activated');
    console.log('Arch SSH Extension: Logger created');

    const remoteSSHResolver = new RemoteSSHResolver(context, logger);
    console.log('Arch SSH Extension: RemoteSSHResolver created');
    logger.info(`Registering remote authority resolver for: ${REMOTE_SSH_AUTHORITY}`);
    context.subscriptions.push(vscode.workspace.registerRemoteAuthorityResolver(REMOTE_SSH_AUTHORITY, remoteSSHResolver));
    context.subscriptions.push(remoteSSHResolver);
    logger.info('Remote authority resolver registered successfully');
    console.log('Arch SSH Extension: Remote authority resolver registered');

    const locationHistory = new RemoteLocationHistory(context);
    const locationData = getRemoteWorkspaceLocationData();
    if (locationData) {
        await locationHistory.addLocation(locationData[0], locationData[1]);
    }

    const hostTreeDataProvider = new HostTreeDataProvider(locationHistory);
    context.subscriptions.push(vscode.window.createTreeView('archSshHosts', { treeDataProvider: hostTreeDataProvider }));
    context.subscriptions.push(hostTreeDataProvider);

    context.subscriptions.push(vscode.commands.registerCommand('archssh.openEmptyWindow', () => promptOpenRemoteSSHWindow(false)));
    context.subscriptions.push(vscode.commands.registerCommand('archssh.openEmptyWindowInCurrentWindow', () => promptOpenRemoteSSHWindow(true)));
    context.subscriptions.push(vscode.commands.registerCommand('archssh.openConfigFile', () => openSSHConfigFile()));
    context.subscriptions.push(vscode.commands.registerCommand('archssh.showLog', () => logger.show()));
    
    // JSON-RPC Viewer functionality
    const jsonRpcViewer = new JsonRpcViewer(context.extensionUri);
    context.subscriptions.push(vscode.commands.registerCommand('archssh.showJsonRpcViewer', () => {
        jsonRpcViewer.show();
    }));
    
    context.subscriptions.push(vscode.commands.registerCommand('archssh.exportJsonRpcLog', async () => {
        // This will be implemented to export the current log
        vscode.window.showInformationMessage('JSON-RPC log export functionality will be implemented');
    }));
    
    context.subscriptions.push(vscode.commands.registerCommand('archssh.clearJsonRpcLog', () => {
        jsonRpcViewer.clearMessages();
        vscode.window.showInformationMessage('JSON-RPC log cleared');
    }));
}

export function deactivate() {
}
