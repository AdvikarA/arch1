import * as vscode from 'vscode';
import { Client } from 'ssh2';

export interface SSHConnectionConfig {
    host: string;
    user?: string;
    port: number;
    codeServerPort: number;
    password?: string;
    privateKey?: string;
}

export interface CodeServerInfo {
    url: string;
    token?: string;
    workspace?: string;
}

export class SSHManager {
    private client: Client | null = null;

    async connect(config: SSHConnectionConfig): Promise<boolean> {
        return new Promise((resolve, reject) => {
            this.client = new Client();

            this.client.on('ready', () => {
                console.log('SSH connection established');
                resolve(true);
            });

            this.client.on('error', (err) => {
                console.error('SSH connection error:', err);
                reject(err);
            });

            const connectConfig: any = {
                host: config.host,
                port: config.port,
                username: config.user || 'root'
            };

            // Add authentication
            if (config.password) {
                connectConfig.password = config.password;
            } else if (config.privateKey) {
                connectConfig.privateKey = config.privateKey;
            } else {
                // Try to use default SSH key, but don't fail if it doesn't exist
                try {
                    const sshDir = require('os').homedir() + '/.ssh';
                    const keyFiles = ['id_ed25519', 'id_rsa', 'id_ecdsa'];
                    let keyFound = false;
                    
                    for (const keyFile of keyFiles) {
                        const sshKeyPath = `${sshDir}/${keyFile}`;
                        if (require('fs').existsSync(sshKeyPath)) {
                            connectConfig.privateKey = require('fs').readFileSync(sshKeyPath);
                            console.log(`Using SSH key: ${keyFile}`);
                            keyFound = true;
                            break;
                        }
                    }
                    
                    if (!keyFound) {
                        console.log('No SSH key found, will need password authentication');
                    }
                } catch (error) {
                    console.log('Error reading SSH key:', error);
                }
            }

            this.client.connect(connectConfig);
        });
    }

    async checkCodeServerStatus(port: number): Promise<boolean> {
        return new Promise((resolve) => {
            if (!this.client) {
                resolve(false);
                return;
            }

            this.client.exec(`curl -s http://localhost:${port}`, (err, stream) => {
                if (err) {
                    resolve(false);
                    return;
                }

                let output = '';
                stream.on('data', (data: Buffer) => {
                    output += data.toString();
                });

                stream.on('close', () => {
                    resolve(output.includes('code-server') || output.includes('VS Code'));
                });
            });
        });
    }

    async getCodeServerInfo(port: number): Promise<CodeServerInfo | null> {
        return new Promise((resolve) => {
            if (!this.client) {
                resolve(null);
                return;
            }

            // Try to get code-server configuration from the specific path
            this.client.exec(`cat ~/.config/code-server/config.yaml 2>/dev/null || echo ""`, (err, stream) => {
                if (err) {
                    resolve(null);
                    return;
                }

                let output = '';
                stream.on('data', (data: Buffer) => {
                    output += data.toString();
                });

                stream.on('close', () => {
                    const url = `http://localhost:${port}`;
                    let token: string | undefined;
                    let workspace: string | undefined;

                    // Parse config for token if available
                    const tokenMatch = output.match(/password:\s*(.+)/);
                    if (tokenMatch) {
                        token = tokenMatch[1].trim();
                    }

                    resolve({
                        url,
                        token,
                        workspace
                    });
                });
            });
        });
    }

    async openRemoteWorkspace(workspacePath?: string): Promise<void> {
        if (!this.client) {
            throw new Error('SSH connection not established');
        }

        // This would integrate with VS Code's remote development APIs
        // For now, we'll just log the workspace path
        console.log(`Would open remote workspace: ${workspacePath || 'default'}`);
    }

    async startCodeServer(port: number): Promise<boolean> {
        return new Promise((resolve) => {
            if (!this.client) {
                resolve(false);
                return;
            }

            // Try to start code-server using the specific path
            const command = `nohup /opt/homebrew/bin/code-server --port ${port} --host 0.0.0.0 --auth none > /tmp/code-server.log 2>&1 &`;
            
            this.client.exec(command, (err, stream) => {
                if (err) {
                    console.error('Error starting code-server:', err);
                    resolve(false);
                    return;
                }

                let output = '';
                stream.on('data', (data: Buffer) => {
                    output += data.toString();
                });

                stream.on('close', () => {
                    // Wait a moment for code-server to start
                    setTimeout(async () => {
                        const isRunning = await this.checkCodeServerStatus(port);
                        resolve(isRunning);
                    }, 2000);
                });
            });
        });
    }

    disconnect(): void {
        if (this.client) {
            this.client.end();
            this.client = null;
        }
    }
} 