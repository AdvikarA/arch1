import * as vscode from 'vscode';

export async function activate(context: vscode.ExtensionContext) {
	console.log('SSH Resolver Extension activated!');
	
	// Register command to connect via SSH
	context.subscriptions.push(
		vscode.commands.registerCommand('ssh-resolver.connect', async () => {
			console.log('SSH Resolver connect command executed!');
			
			const host = await vscode.window.showInputBox({
				prompt: 'Enter SSH host',
				value: 'localhost'
			});
			
			const user = await vscode.window.showInputBox({
				prompt: 'Enter SSH user (optional)',
				value: ''
			});
			
			const port = await vscode.window.showInputBox({
				prompt: 'Enter SSH port',
				value: '22'
			});
			
			const codeServerPort = await vscode.window.showInputBox({
				prompt: 'Enter code-server port',
				value: '8080'
			});
			
			if (host && port && codeServerPort) {
				// For now, just show a message with the connection details
				vscode.window.showInformationMessage(
					`SSH Connection: ${user ? user + '@' : ''}${host}:${port} -> code-server:${codeServerPort}`
				);
				
				// TODO: Implement actual SSH connection logic
				console.log(`Would connect to: ${user ? user + '@' : ''}${host}:${port} -> code-server:${codeServerPort}`);
			}
		})
	);
}

export function deactivate() {
	// Cleanup if needed
} 