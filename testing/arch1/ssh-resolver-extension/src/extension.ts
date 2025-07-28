/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { spawn } from 'child_process';
import * as path from 'path';

// Declare proposed API types since they're not in public types
declare module 'vscode' {
  interface RemoteAuthorityResolverContext {
    // Add any needed properties
  }
  
  interface ResolverResult {
    // Add any needed properties
  }
  
  interface ManagedMessagePassing {
    onDidReceiveMessage: vscode.Event<Uint8Array>;
    onDidClose: vscode.Event<Error | undefined>;
    onDidEnd: vscode.Event<void>;
    send: (data: Uint8Array) => void;
    end: () => void;
  }
  
  interface RemoteAuthorityResolver {
    resolve(authority: string, context: RemoteAuthorityResolverContext): Promise<ResolverResult>;
  }
  
  class ManagedResolvedAuthority {
    constructor(connectionFactory: () => Promise<ManagedMessagePassing>, token?: string);
  }
  
  namespace workspace {
    function registerRemoteAuthorityResolver(authority: string, resolver: RemoteAuthorityResolver): vscode.Disposable;
  }
}

interface SSHConnectionConfig {
  host: string;
  user?: string;
  port?: number;
  privateKeyPath?: string;
  codeServerPort?: number;
}

export class SSHResolver implements vscode.RemoteAuthorityResolver {
  async resolve(authority: string, context: vscode.RemoteAuthorityResolverContext): Promise<vscode.ResolverResult> {
    // Parse the authority: ssh-remote+user@host:port
    const config = this.parseAuthority(authority);
    
    // Create a managed connection that will spawn code-server on the remote
    return new vscode.ManagedResolvedAuthority(
      () => this.createConnection(config),
      config.codeServerPort?.toString() || '8080'
    );
  }

  private parseAuthority(authority: string): SSHConnectionConfig {
    // Remove the ssh-remote+ prefix
    const authorityPart = authority.replace('ssh-remote+', '');
    
    // Parse user@host:port format
    const atIndex = authorityPart.indexOf('@');
    const colonIndex = authorityPart.lastIndexOf(':');
    
    let user = '';
    let host = authorityPart;
    let port = 22; // Default SSH port
    let codeServerPort = 8080; // Default code-server port
    
    if (atIndex > 0) {
      user = authorityPart.substring(0, atIndex);
      host = authorityPart.substring(atIndex + 1);
    }
    
    if (colonIndex > atIndex) {
      const portPart = authorityPart.substring(colonIndex + 1);
      const ports = portPart.split(',');
      if (ports.length >= 2) {
        port = parseInt(ports[0], 10);
        codeServerPort = parseInt(ports[1], 10);
        // Remove the port part from host
        host = authorityPart.substring(0, colonIndex);
        if (atIndex > 0) {
          host = authorityPart.substring(atIndex + 1, colonIndex);
        }
      } else {
        port = parseInt(portPart, 10);
        // Remove the port part from host
        host = authorityPart.substring(0, colonIndex);
        if (atIndex > 0) {
          host = authorityPart.substring(atIndex + 1, colonIndex);
        }
      }
    }
    
    return {
      host,
      user,
      port,
      codeServerPort
    };
  }

  private async createConnection(config: SSHConnectionConfig): Promise<vscode.ManagedMessagePassing> {
    return new Promise((resolve, reject) => {
      // Build SSH command to connect to remote and start code-server
      const { spawn } = require('child_process');
      
      const sshArgs = [
        '-t', // Force pseudo-terminal allocation
        '-L', `${config.codeServerPort}:localhost:${config.codeServerPort}`, // Port forwarding
        '-o', 'StrictHostKeyChecking=no',
        '-o', 'UserKnownHostsFile=/dev/null'
      ];
      
      if (config.privateKeyPath) {
        sshArgs.push('-i', config.privateKeyPath);
      }
      
      const sshCommand = `${config.user}@${config.host}`;
      sshArgs.push(sshCommand);
      
      // Command to run on remote: start code-server
      const remoteCommand = `code-server --port ${config.codeServerPort} --host 0.0.0.0 --auth none`;
      sshArgs.push(remoteCommand);
      
      console.log(`Starting SSH connection: ssh ${sshArgs.join(' ')}`);
      
      const sshProcess = spawn('ssh', sshArgs);
      
      // Create event emitters for the message passing interface
      const receiveEmitter = new vscode.EventEmitter<Uint8Array>();
      const closeEmitter = new vscode.EventEmitter<Error | undefined>();
      const endEmitter = new vscode.EventEmitter<void>();
      
      // Create message passing interface
      const messagePassing: vscode.ManagedMessagePassing = {
        onDidReceiveMessage: receiveEmitter.event,
        onDidClose: closeEmitter.event,
        onDidEnd: endEmitter.event,
        
        send: (data: Uint8Array) => {
          sshProcess.stdin.write(data);
        },
        
        end: () => {
          sshProcess.stdin.end();
        }
      };
      
      sshProcess.stdout.on('data', (data: Buffer) => {
        console.log('SSH stdout:', data.toString());
      });
      
      sshProcess.stderr.on('data', (data: Buffer) => {
        console.error('SSH stderr:', data.toString());
      });
      
      sshProcess.on('close', (code: number) => {
        if (code === 0) {
          endEmitter.fire();
        } else {
          closeEmitter.fire(new Error(`SSH process exited with code ${code}`));
        }
      });
      
      sshProcess.on('error', (error: Error) => {
        closeEmitter.fire(error);
      });
      
      // Wait a bit for the connection to establish
      setTimeout(() => {
        resolve(messagePassing);
      }, 2000);
    });
  }
}

export async function activate(context: vscode.ExtensionContext) {
	console.log('SSH Resolver Extension activated!');
	
	const resolver = new SSHResolver();
	
	// Register the SSH remote authority resolver
	context.subscriptions.push(
		vscode.workspace.registerRemoteAuthorityResolver('ssh-custom', resolver)
	);
	
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
				const authority = `ssh-remote+${user ? user + '@' : ''}${host}:${port},${codeServerPort}`;
				const uri = vscode.Uri.parse(`vscode-remote://${authority}/`);
				await vscode.commands.executeCommand('vscode.openFolder', uri);
			}
		})
	);
}

export function deactivate() {
  // Cleanup if needed
} 