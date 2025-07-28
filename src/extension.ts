import * as vscode from 'vscode';
import { SSHManager, SSHConnectionConfig } from './ssh-manager';

export async function activate(context: vscode.ExtensionContext) {
	console.log('SSH Resolver Extension activated!');
	
	const sshManager = new SSHManager();
	
	// Register command to connect via SSH to code-server
	context.subscriptions.push(
		vscode.commands.registerCommand('ssh-resolver.connect', async () => {
			console.log('SSH Resolver connect command executed!');
			
			try {
				// Get connection details from user
				const host = await vscode.window.showInputBox({
					prompt: 'Enter SSH host',
					value: 'localhost'
				});
				
				if (!host) {
					vscode.window.showErrorMessage('Host is required');
					return;
				}
				
				const user = await vscode.window.showInputBox({
					prompt: 'Enter SSH user (optional)',
					value: ''
				});
				
				const portStr = await vscode.window.showInputBox({
					prompt: 'Enter SSH port',
					value: '22'
				});
				
				const codeServerPortStr = await vscode.window.showInputBox({
					prompt: 'Enter code-server port',
					value: '8080'
				});
				
				if (!portStr || !codeServerPortStr) {
					vscode.window.showErrorMessage('Port and code-server port are required');
					return;
				}
				
				const port = parseInt(portStr);
				const codeServerPort = parseInt(codeServerPortStr);
				
				// Show progress
				const progressOptions = {
					location: vscode.ProgressLocation.Notification,
					title: "Connecting to code-server via SSH...",
					cancellable: false
				};
				
				await vscode.window.withProgress(progressOptions, async (progress) => {
					progress.report({ message: 'Establishing SSH connection...' });
					
					// Configure SSH connection
					const config: SSHConnectionConfig = {
						host,
						user: user || undefined,
						port,
						codeServerPort
					};
					
					// Try to connect
					let connected = false;
					try {
						connected = await sshManager.connect(config);
					} catch (error: any) {
						// If connection failed due to authentication, try with password
						if (error.message?.includes('ENOENT') || error.message?.includes('authentication')) {
							const password = await vscode.window.showInputBox({
								prompt: 'SSH password required',
								password: true,
								placeHolder: 'Enter your SSH password'
							});
							
							if (password) {
								config.password = password;
								try {
									connected = await sshManager.connect(config);
								} catch (passwordError: any) {
									vscode.window.showErrorMessage(`SSH authentication failed: ${passwordError.message}`);
									return;
								}
							} else {
								vscode.window.showErrorMessage('Password required for SSH connection');
								return;
							}
						} else {
							throw error;
						}
					}
					
					if (connected) {
						progress.report({ message: 'Checking code-server status...' });
						
						// Check if code-server is running
						const codeServerRunning = await sshManager.checkCodeServerStatus(codeServerPort);
						
						if (codeServerRunning) {
							progress.report({ message: 'Getting code-server information...' });
							
							// Get code-server info
							const codeServerInfo = await sshManager.getCodeServerInfo(codeServerPort);
							
							if (codeServerInfo) {
								// Show success message
								vscode.window.showInformationMessage(`✅ Connected to code-server at ${codeServerInfo.url}`);
								
								// Log connection details
								console.log('Code-server URL:', codeServerInfo.url);
								if (codeServerInfo.token) {
									console.log('Code-server token available');
								}
								
								// Open code-server in VS Code's remote development
								await openCodeServerInVSCode(codeServerInfo, config);
								
								// Log the communication details
								console.log('🔗 SSH Extension Communication Details:');
								console.log('   - Connected to:', `${config.user || 'root'}@${config.host}:${config.port}`);
								console.log('   - Code-server URL:', codeServerInfo.url);
								console.log('   - Code-server port:', config.codeServerPort);
								console.log('   - SSH tunnel established');
								console.log('   - Ready for file operations');
								
								// Show what happens when files are switched
								console.log('\n📁 When you switch files in VS Code:');
								console.log('   1. VS Code sends file open request via SSH');
								console.log('   2. Code-server receives request and reads file');
								console.log('   3. Code-server sends file content back via SSH');
								console.log('   4. VS Code displays the file content');
								console.log('\n💡 Watch the code-server logs for these messages!');
								
							} else {
								vscode.window.showWarningMessage('Connected to SSH but could not get code-server info');
							}
						} else {
							// Offer to start code-server if not running
							const startCodeServer = await vscode.window.showWarningMessage(
								`SSH connection successful, but code-server is not running on port ${codeServerPort}. Start code-server?`,
								'Yes', 'No'
							);
							
							if (startCodeServer === 'Yes') {
								await startCodeServerOnRemote(sshManager, codeServerPort);
							}
						}
					} else {
						vscode.window.showErrorMessage('Failed to establish SSH connection');
					}
				});
				
			} catch (error) {
				console.error('SSH connection error:', error);
				vscode.window.showErrorMessage(`SSH connection failed: ${error}`);
			} finally {
				// Clean up SSH connection
				sshManager.disconnect();
			}
		})
	);
}

async function openCodeServerInVSCode(codeServerInfo: any, sshConfig: SSHConnectionConfig) {
	try {
		// Show options to the user
		const action = await vscode.window.showInformationMessage(
			`Connected to code-server at ${codeServerInfo.url}. How would you like to connect?`,
			'Open Code-Server in VS Code', 'Open in Browser', 'Copy Connection Details'
		);
		
		switch (action) {
			case 'Open Code-Server in VS Code':
				// Open code-server in VS Code (not remote mode)
				console.log('🔗 Opening code-server in VS Code...');
				console.log('   - Code-server URL:', codeServerInfo.url);
				console.log('   - SSH connection established');
				console.log('   - VS Code will communicate with code-server');
				
				// Open code-server URL in VS Code
				await vscode.env.openExternal(vscode.Uri.parse(codeServerInfo.url));
				
				console.log('✅ Code-server opened in VS Code');
				console.log('📁 Now when you switch files in VS Code:');
				console.log('   1. VS Code sends request to code-server via SSH');
				console.log('   2. Code-server reads file from remote filesystem');
				console.log('   3. Code-server sends file content back to VS Code');
				console.log('   4. VS Code displays the file content');
				console.log('\n💡 Watch the code-server logs for communication!');
				break;
				
			case 'Open in Browser':
				// Open code-server URL in browser
				await vscode.env.openExternal(vscode.Uri.parse(codeServerInfo.url));
				break;
				
			case 'Copy Connection Details':
				// Copy connection details to clipboard
				const details = `SSH: ${sshConfig.user || 'root'}@${sshConfig.host}:${sshConfig.port}\nCode-Server: ${codeServerInfo.url}`;
				await vscode.env.clipboard.writeText(details);
				vscode.window.showInformationMessage('Connection details copied to clipboard');
				break;
		}
		
	} catch (error) {
		console.error('Error opening code-server:', error);
		vscode.window.showErrorMessage('Failed to open code-server');
	}
}

async function startCodeServerOnRemote(sshManager: SSHManager, port: number) {
	try {
		// Try to start code-server on the remote server
		const started = await sshManager.startCodeServer(port);
		
		if (started) {
			vscode.window.showInformationMessage(`✅ Code-server started on port ${port}`);
		} else {
			vscode.window.showErrorMessage('Failed to start code-server on remote server');
		}
	} catch (error) {
		console.error('Error starting code-server:', error);
		vscode.window.showErrorMessage('Failed to start code-server');
	}
}

export function deactivate() {
	// Cleanup if needed
} 