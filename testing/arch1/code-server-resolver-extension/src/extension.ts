/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

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

interface CodeServerConfig {
  host: string;
  port: number;
  workspace?: string;
  user?: string;
  password?: string;
  token?: string;
}

class CodeServerResolver implements vscode.RemoteAuthorityResolver {
  async resolve(authority: string, context: vscode.RemoteAuthorityResolverContext): Promise<vscode.ResolverResult> {
    // Parse the authority: code-server+host:port/workspace
    const config = this.parseAuthority(authority);
    
    // Create a managed connection that will spawn code-server
    return new vscode.ManagedResolvedAuthority(
      () => this.createConnection(config),
      config.token || 'default'
    );
  }

  private parseAuthority(authority: string): CodeServerConfig {
    // Remove the code-server+ prefix
    const authorityPart = authority.replace('code-server+', '');
    
    // Parse host:port/workspace format
    const slashIndex = authorityPart.indexOf('/');
    const colonIndex = authorityPart.indexOf(':');
    
    let host = 'localhost';
    let port = 8080;
    let workspace = '/';
    
    if (colonIndex > 0) {
      host = authorityPart.substring(0, colonIndex);
      const portPart = authorityPart.substring(colonIndex + 1);
      if (slashIndex > colonIndex) {
        port = parseInt(portPart.substring(0, slashIndex - colonIndex - 1), 10);
        workspace = authorityPart.substring(slashIndex);
      } else {
        port = parseInt(portPart, 10);
      }
    } else if (slashIndex > 0) {
      host = authorityPart.substring(0, slashIndex);
      workspace = authorityPart.substring(slashIndex);
    } else {
      host = authorityPart;
    }
    
    return {
      host,
      port,
      workspace
    };
  }

  private async createConnection(config: CodeServerConfig): Promise<vscode.ManagedMessagePassing> {
    return new Promise((resolve, reject) => {
      // Use the system-installed code-server
      const { spawn } = require('child_process');
      
      // Build code-server arguments
      const args = [
        '--port', config.port.toString(),
        '--host', config.host,
        '--auth', 'none', // For development, no auth
        '--disable-telemetry',
        '--disable-update-check'
      ];
      
      if (config.workspace && config.workspace !== '/') {
        args.push(config.workspace);
      }
      
      console.log(`Starting code-server with args: ${args.join(' ')}`);
      
      // Spawn code-server process
      const codeServerProcess = spawn('code-server', args, {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env,
          NODE_ENV: 'development'
        }
      });
      
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
          codeServerProcess.stdin.write(data);
        },
        
        end: () => {
          codeServerProcess.stdin.end();
        }
      };
      
      codeServerProcess.stdout.on('data', (data: Buffer) => {
        console.log('code-server stdout:', data.toString());
      });
      
      codeServerProcess.stderr.on('data', (data: Buffer) => {
        console.error('code-server stderr:', data.toString());
      });
      
      codeServerProcess.on('close', (code: number) => {
        if (code === 0) {
          endEmitter.fire();
        } else {
          closeEmitter.fire(new Error(`code-server process exited with code ${code}`));
        }
      });
      
      codeServerProcess.on('error', (error: Error) => {
        closeEmitter.fire(error);
      });
      
      // Wait for code-server to start
      setTimeout(() => {
        resolve(messagePassing);
      }, 2000);
    });
  }
}

export async function activate(context: vscode.ExtensionContext) {
  const resolver = new CodeServerResolver();
  
  // Register the code-server remote authority resolver
  context.subscriptions.push(
    vscode.workspace.registerRemoteAuthorityResolver('code-server', resolver)
  );
  
  // Register command to connect to code-server
  context.subscriptions.push(
    vscode.commands.registerCommand('code-server-resolver.connect', async () => {
      const host = await vscode.window.showInputBox({
        prompt: 'Enter code-server host',
        value: 'localhost'
      });
      
      const port = await vscode.window.showInputBox({
        prompt: 'Enter code-server port',
        value: '8080'
      });
      
      const workspace = await vscode.window.showInputBox({
        prompt: 'Enter workspace path (optional)',
        value: '/home/user/project'
      });
      
      if (host && port) {
        const authority = `code-server+${host}:${port}${workspace ? workspace : ''}`;
        const uri = vscode.Uri.parse(`vscode-remote://${authority}`);
        await vscode.commands.executeCommand('vscode.openFolder', uri);
      }
    })
  );
}

export function deactivate() {
  // Cleanup if needed
} 