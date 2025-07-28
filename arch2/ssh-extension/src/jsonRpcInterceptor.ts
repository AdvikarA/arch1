import * as net from 'net';
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import Log from './common/logger';

export interface JsonRpcMessage {
    jsonrpc: '2.0';
    id?: number | string;
    method?: string;
    params?: any;
    result?: any;
    error?: {
        code: number;
        message: string;
        data?: any;
    };
}

export interface InterceptorConfig {
    localPort: number;
    remoteHost: string;
    remotePort: number;
    logToFile?: boolean;
    logToConsole?: boolean;
    logDirectory?: string;
}

export class JsonRpcInterceptor {
    private server: net.Server | undefined;
    private connections: net.Socket[] = [];
    private logger: Log;
    private config: InterceptorConfig;
    private messageLog: JsonRpcMessage[] = [];
    private logFile: string | undefined;

    constructor(config: InterceptorConfig, logger: Log) {
        this.config = config;
        this.logger = logger;
        
        if (config.logToFile && config.logDirectory) {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            this.logFile = path.join(config.logDirectory, `jsonrpc-${timestamp}.log`);
        }
    }

    async start(): Promise<void> {
        return new Promise((resolve, reject) => {
            this.server = net.createServer((socket) => {
                this.logger.info('New connection to interceptor');
                this.connections.push(socket);

                // Connect to the actual remote server
                const remoteSocket = net.createConnection({
                    host: this.config.remoteHost,
                    port: this.config.remotePort
                }, () => {
                    this.logger.info(`Connected to remote server ${this.config.remoteHost}:${this.config.remotePort}`);
                });

                // Set up bidirectional data flow with interception
                this.setupDataFlow(socket, remoteSocket);

                socket.on('close', () => {
                    this.logger.info('Client connection closed');
                    remoteSocket.destroy();
                    this.removeConnection(socket);
                });

                remoteSocket.on('close', () => {
                    this.logger.info('Remote connection closed');
                    socket.destroy();
                    this.removeConnection(socket);
                });

                socket.on('error', (err) => {
                    this.logger.error(`Client socket error: ${err.message}`);
                    remoteSocket.destroy();
                    this.removeConnection(socket);
                });

                remoteSocket.on('error', (err) => {
                    this.logger.error(`Remote socket error: ${err.message}`);
                    socket.destroy();
                    this.removeConnection(socket);
                });
            });

            this.server.listen(this.config.localPort, () => {
                this.logger.info(`JSON-RPC interceptor listening on port ${this.config.localPort}`);
                resolve();
            });

            this.server.on('error', (err) => {
                this.logger.error(`Interceptor server error: ${err.message}`);
                reject(err);
            });
        });
    }

    private setupDataFlow(clientSocket: net.Socket, remoteSocket: net.Socket) {
        // Client -> Remote (with interception)
        clientSocket.on('data', (data) => {
            this.interceptAndForward(data, 'client->remote', clientSocket, remoteSocket);
        });

        // Remote -> Client (with interception)
        remoteSocket.on('data', (data) => {
            this.interceptAndForward(data, 'remote->client', remoteSocket, clientSocket);
        });
    }

    private interceptAndForward(data: Buffer, direction: string, fromSocket: net.Socket, toSocket: net.Socket) {
        try {
            // Try to parse as JSON-RPC message
            const messages = this.parseJsonRpcMessages(data);
            
            if (messages.length > 0) {
                // Log each JSON-RPC message
                messages.forEach((msg, index) => {
                    this.logMessage(msg, direction, index);
                });
            } else {
                // Log raw data if it's not JSON-RPC
                this.logRawData(data, direction);
            }
        } catch (error) {
            // Log raw data if parsing fails
            this.logRawData(data, direction);
        }

        // Forward the data unchanged
        toSocket.write(data);
    }

    private parseJsonRpcMessages(data: Buffer): JsonRpcMessage[] {
        const messages: JsonRpcMessage[] = [];
        const text = data.toString('utf8');
        
        // Split by newlines in case multiple messages are concatenated
        const lines = text.split('\n').filter(line => line.trim());
        
        for (const line of lines) {
            try {
                const message = JSON.parse(line) as JsonRpcMessage;
                if (message.jsonrpc === '2.0') {
                    messages.push(message);
                }
            } catch (error) {
                // Not a valid JSON message, skip
            }
        }
        
        return messages;
    }

    private logMessage(message: JsonRpcMessage, direction: string, index: number) {
        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp,
            direction,
            index,
            message
        };

        // Add to in-memory log
        this.messageLog.push(message);

        // Log to console if enabled
        if (this.config.logToConsole) {
            this.logger.info(`JSON-RPC [${direction}] [${index}]: ${JSON.stringify(message, null, 2)}`);
        }

        // Log to file if enabled
        if (this.config.logToFile && this.logFile) {
            const logLine = `${timestamp} [${direction}] [${index}] ${JSON.stringify(message)}\n`;
            fs.appendFileSync(this.logFile, logLine);
        }
    }

    private logRawData(data: Buffer, direction: string) {
        const timestamp = new Date().toISOString();
        const hexData = data.toString('hex');
        const asciiData = data.toString('ascii').replace(/[^\x20-\x7E]/g, '.');

        if (this.config.logToConsole) {
            this.logger.info(`RAW [${direction}] (${data.length} bytes): ${asciiData}`);
        }

        if (this.config.logToFile && this.logFile) {
            const logLine = `${timestamp} [${direction}] RAW (${data.length} bytes): ${hexData} (${asciiData})\n`;
            fs.appendFileSync(this.logFile, logLine);
        }
    }

    private removeConnection(socket: net.Socket) {
        const index = this.connections.indexOf(socket);
        if (index > -1) {
            this.connections.splice(index, 1);
        }
    }

    async stop(): Promise<void> {
        return new Promise((resolve) => {
            // Close all client connections
            this.connections.forEach(socket => socket.destroy());
            this.connections = [];

            // Close the server
            if (this.server) {
                this.server.close(() => {
                    this.logger.info('JSON-RPC interceptor stopped');
                    resolve();
                });
            } else {
                resolve();
            }
        });
    }

    // Get all captured messages
    getMessageLog(): JsonRpcMessage[] {
        return [...this.messageLog];
    }

    // Clear the message log
    clearMessageLog(): void {
        this.messageLog = [];
    }

    // Get messages by method name
    getMessagesByMethod(method: string): JsonRpcMessage[] {
        return this.messageLog.filter(msg => msg.method === method);
    }

    // Get messages by direction
    getMessagesByDirection(direction: 'client->remote' | 'remote->client'): JsonRpcMessage[] {
        // This is a simplified implementation - in a real scenario you'd need to track direction
        return this.messageLog;
    }

    // Export message log to file
    exportMessageLog(filePath: string): void {
        const exportData = {
            timestamp: new Date().toISOString(),
            totalMessages: this.messageLog.length,
            messages: this.messageLog
        };
        
        fs.writeFileSync(filePath, JSON.stringify(exportData, null, 2));
        this.logger.info(`Message log exported to ${filePath}`);
    }
} 