#!/usr/bin/env node

const net = require('net');
const crypto = require('crypto');

// Simple JSON-RPC server for testing the interceptor
class TestJsonRpcServer {
    constructor(port = 8080) {
        this.port = port;
        this.server = null;
        this.connections = [];
        this.messageId = 1;
    }

    start() {
        this.server = net.createServer((socket) => {
            console.log('Client connected');
            this.connections.push(socket);

            socket.on('data', (data) => {
                const messages = this.parseMessages(data.toString());
                messages.forEach(msg => this.handleMessage(msg, socket));
            });

            socket.on('close', () => {
                console.log('Client disconnected');
                const index = this.connections.indexOf(socket);
                if (index > -1) {
                    this.connections.splice(index, 1);
                }
            });

            socket.on('error', (err) => {
                console.error('Socket error:', err.message);
            });
        });

        this.server.listen(this.port, () => {
            console.log(`Test JSON-RPC server listening on port ${this.port}`);
        });

        this.server.on('error', (err) => {
            console.error('Server error:', err.message);
        });
    }

    parseMessages(data) {
        const messages = [];
        const lines = data.split('\n').filter(line => line.trim());
        
        for (const line of lines) {
            try {
                const message = JSON.parse(line);
                if (message.jsonrpc === '2.0') {
                    messages.push(message);
                }
            } catch (error) {
                console.error('Failed to parse message:', line);
            }
        }
        
        return messages;
    }

    handleMessage(message, socket) {
        console.log('Received message:', JSON.stringify(message, null, 2));

        if (message.method) {
            // Handle different methods
            switch (message.method) {
                case 'initialize':
                    this.sendResponse(socket, message.id, {
                        capabilities: {
                            textDocumentSync: 1,
                            completionProvider: {
                                resolveProvider: true,
                                triggerCharacters: ['.', ':']
                            },
                            hoverProvider: true,
                            signatureHelpProvider: {
                                triggerCharacters: ['(', ',']
                            },
                            definitionProvider: true,
                            referencesProvider: true,
                            documentSymbolProvider: true,
                            workspaceSymbolProvider: true,
                            codeActionProvider: true,
                            codeLensProvider: {},
                            documentFormattingProvider: true,
                            documentRangeFormattingProvider: true,
                            documentOnTypeFormattingProvider: {
                                firstTriggerCharacter: '}',
                                moreTriggerCharacter: [';']
                            },
                            renameProvider: true,
                            documentLinkProvider: {},
                            executeCommandProvider: {
                                commands: ['vscode.executeCodeActionProvider']
                            },
                            workspace: {
                                workspaceFolders: {
                                    supported: true,
                                    changeNotifications: true
                                }
                            }
                        }
                    });
                    break;

                case 'textDocument/completion':
                    this.sendResponse(socket, message.id, {
                        isIncomplete: false,
                        items: [
                            {
                                label: 'test',
                                kind: 1,
                                insertText: 'test',
                                detail: 'Test completion item'
                            }
                        ]
                    });
                    break;

                case 'textDocument/hover':
                    this.sendResponse(socket, message.id, {
                        contents: [
                            {
                                language: 'javascript',
                                value: '// Test hover content'
                            }
                        ]
                    });
                    break;

                case 'textDocument/definition':
                    this.sendResponse(socket, message.id, {
                        uri: 'file:///test/file.js',
                        range: {
                            start: { line: 0, character: 0 },
                            end: { line: 0, character: 4 }
                        }
                    });
                    break;

                case 'workspace/executeCommand':
                    this.sendResponse(socket, message.id, null);
                    break;

                case 'shutdown':
                    this.sendResponse(socket, message.id, null);
                    break;

                case 'exit':
                    console.log('Received exit command');
                    process.exit(0);
                    break;

                default:
                    // Send error for unknown method
                    this.sendError(socket, message.id, -32601, 'Method not found');
                    break;
            }
        } else if (message.id) {
            // Response to a request
            console.log('Received response:', JSON.stringify(message, null, 2));
        }
    }

    sendResponse(socket, id, result) {
        const response = {
            jsonrpc: '2.0',
            id: id,
            result: result
        };
        
        console.log('Sending response:', JSON.stringify(response, null, 2));
        socket.write(JSON.stringify(response) + '\n');
    }

    sendError(socket, id, code, message, data = null) {
        const response = {
            jsonrpc: '2.0',
            id: id,
            error: {
                code: code,
                message: message,
                data: data
            }
        };
        
        console.log('Sending error:', JSON.stringify(response, null, 2));
        socket.write(JSON.stringify(response) + '\n');
    }

    sendNotification(method, params = null) {
        const notification = {
            jsonrpc: '2.0',
            method: method,
            params: params
        };
        
        console.log('Sending notification:', JSON.stringify(notification, null, 2));
        this.connections.forEach(socket => {
            socket.write(JSON.stringify(notification) + '\n');
        });
    }

    stop() {
        if (this.server) {
            this.server.close();
            this.connections.forEach(socket => socket.destroy());
            console.log('Test JSON-RPC server stopped');
        }
    }
}

// Start the server if this file is run directly
if (require.main === module) {
    const port = process.argv[2] || 8080;
    const server = new TestJsonRpcServer(parseInt(port));
    
    server.start();
    
    // Send a test notification every 5 seconds
    setInterval(() => {
        server.sendNotification('window/showMessage', {
            type: 1, // Info
            message: `Test notification at ${new Date().toISOString()}`
        });
    }, 5000);
    
    // Handle graceful shutdown
    process.on('SIGINT', () => {
        console.log('Shutting down...');
        server.stop();
        process.exit(0);
    });
}

module.exports = TestJsonRpcServer; 