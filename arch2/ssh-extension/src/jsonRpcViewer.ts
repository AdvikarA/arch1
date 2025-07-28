import * as vscode from 'vscode';
import * as path from 'path';
import { JsonRpcMessage } from './jsonRpcInterceptor';

export class JsonRpcViewer {
    private panel: vscode.WebviewPanel | undefined;
    private messages: JsonRpcMessage[] = [];
    private extensionUri: vscode.Uri;

    constructor(extensionUri: vscode.Uri) {
        this.extensionUri = extensionUri;
    }

    public show(): void {
        if (this.panel) {
            this.panel.reveal();
            return;
        }

        this.panel = vscode.window.createWebviewPanel(
            'jsonRpcViewer',
            'JSON-RPC Message Viewer',
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true
            }
        );

        this.panel.webview.html = this.getWebviewContent();
        this.setupWebviewMessageHandling();
    }

    public updateMessages(messages: JsonRpcMessage[]): void {
        this.messages = messages;
        if (this.panel) {
            this.panel.webview.postMessage({
                type: 'updateMessages',
                messages: messages
            });
        }
    }

    public addMessage(message: JsonRpcMessage, direction: string): void {
        this.messages.push(message);
        if (this.panel) {
            this.panel.webview.postMessage({
                type: 'addMessage',
                message: message,
                direction: direction
            });
        }
    }

    public clearMessages(): void {
        this.messages = [];
        if (this.panel) {
            this.panel.webview.postMessage({
                type: 'clearMessages'
            });
        }
    }

    private setupWebviewMessageHandling(): void {
        if (!this.panel) return;

        this.panel.webview.onDidReceiveMessage(
            message => {
                switch (message.command) {
                    case 'exportMessages':
                        this.exportMessages();
                        break;
                    case 'clearMessages':
                        this.clearMessages();
                        break;
                    case 'filterMessages':
                        this.filterMessages(message.filter);
                        break;
                }
            }
        );

        this.panel.onDidDispose(() => {
            this.panel = undefined;
        });
    }

    private getWebviewContent(): string {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>JSON-RPC Message Viewer</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: var(--vscode-editor-background);
            color: var(--vscode-editor-foreground);
        }
        
        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 1px solid var(--vscode-panel-border);
        }
        
        .controls {
            display: flex;
            gap: 10px;
        }
        
        button {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
        }
        
        button:hover {
            background-color: var(--vscode-button-hoverBackground);
        }
        
        .filter-controls {
            display: flex;
            gap: 10px;
            margin-bottom: 20px;
            align-items: center;
        }
        
        input, select {
            background-color: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border: 1px solid var(--vscode-input-border);
            padding: 6px 10px;
            border-radius: 4px;
            font-size: 12px;
        }
        
        .message-container {
            max-height: 600px;
            overflow-y: auto;
            border: 1px solid var(--vscode-panel-border);
            border-radius: 4px;
        }
        
        .message {
            padding: 10px;
            border-bottom: 1px solid var(--vscode-panel-border);
            font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
            font-size: 11px;
            line-height: 1.4;
        }
        
        .message:hover {
            background-color: var(--vscode-list-hoverBackground);
        }
        
        .message-header {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
            font-size: 10px;
            color: var(--vscode-descriptionForeground);
        }
        
        .message-direction {
            font-weight: bold;
        }
        
        .direction-client {
            color: #007acc;
        }
        
        .direction-remote {
            color: #d73a49;
        }
        
        .message-content {
            background-color: var(--vscode-textBlockQuote-background);
            padding: 8px;
            border-radius: 4px;
            white-space: pre-wrap;
            word-break: break-word;
        }
        
        .message-method {
            font-weight: bold;
            color: var(--vscode-textPreformat-foreground);
        }
        
        .message-id {
            color: var(--vscode-textPreformat-foreground);
        }
        
        .stats {
            display: flex;
            gap: 20px;
            margin-bottom: 10px;
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
        }
        
        .no-messages {
            text-align: center;
            padding: 40px;
            color: var(--vscode-descriptionForeground);
            font-style: italic;
        }
    </style>
</head>
<body>
    <div class="header">
        <h2>JSON-RPC Message Viewer</h2>
        <div class="controls">
            <button id="clearBtn">Clear All</button>
            <button id="exportBtn">Export</button>
        </div>
    </div>
    
    <div class="filter-controls">
        <input type="text" id="methodFilter" placeholder="Filter by method name..." />
        <select id="directionFilter">
            <option value="">All Directions</option>
            <option value="client->remote">Client → Remote</option>
            <option value="remote->client">Remote → Client</option>
        </select>
        <button id="filterBtn">Filter</button>
        <button id="resetFilterBtn">Reset</button>
    </div>
    
    <div class="stats">
        <span id="totalMessages">Total Messages: 0</span>
        <span id="filteredMessages">Filtered Messages: 0</span>
    </div>
    
    <div class="message-container" id="messageContainer">
        <div class="no-messages">No messages captured yet...</div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        let allMessages = [];
        let filteredMessages = [];
        
        // Handle messages from extension
        window.addEventListener('message', event => {
            const message = event.data;
            switch (message.type) {
                case 'updateMessages':
                    allMessages = message.messages;
                    updateDisplay();
                    break;
                case 'addMessage':
                    allMessages.push(message.message);
                    updateDisplay();
                    break;
                case 'clearMessages':
                    allMessages = [];
                    updateDisplay();
                    break;
            }
        });
        
        function updateDisplay() {
            applyFilters();
            renderMessages();
            updateStats();
        }
        
        function applyFilters() {
            const methodFilter = document.getElementById('methodFilter').value.toLowerCase();
            const directionFilter = document.getElementById('directionFilter').value;
            
            filteredMessages = allMessages.filter(msg => {
                const methodMatch = !methodFilter || (msg.method && msg.method.toLowerCase().includes(methodFilter));
                const directionMatch = !directionFilter || true; // Simplified for now
                return methodMatch && directionMatch;
            });
        }
        
        function renderMessages() {
            const container = document.getElementById('messageContainer');
            
            if (filteredMessages.length === 0) {
                container.innerHTML = '<div class="no-messages">No messages match the current filter...</div>';
                return;
            }
            
            container.innerHTML = filteredMessages.map((msg, index) => {
                const direction = index % 2 === 0 ? 'client->remote' : 'remote->client'; // Simplified
                const directionClass = direction === 'client->remote' ? 'direction-client' : 'direction-remote';
                
                return \`
                    <div class="message">
                        <div class="message-header">
                            <span class="message-direction \${directionClass}">\${direction}</span>
                            <span class="message-id">ID: \${msg.id || 'N/A'}</span>
                        </div>
                        <div class="message-content">
                            <div class="message-method">Method: \${msg.method || 'N/A'}</div>
                            <div>Type: \${msg.method ? 'Request' : msg.result ? 'Response' : msg.error ? 'Error' : 'Notification'}</div>
                            <div>Content:</div>
                            <pre>\${JSON.stringify(msg, null, 2)}</pre>
                        </div>
                    </div>
                \`;
            }).join('');
        }
        
        function updateStats() {
            document.getElementById('totalMessages').textContent = \`Total Messages: \${allMessages.length}\`;
            document.getElementById('filteredMessages').textContent = \`Filtered Messages: \${filteredMessages.length}\`;
        }
        
        // Event listeners
        document.getElementById('clearBtn').addEventListener('click', () => {
            vscode.postMessage({ command: 'clearMessages' });
        });
        
        document.getElementById('exportBtn').addEventListener('click', () => {
            vscode.postMessage({ command: 'exportMessages' });
        });
        
        document.getElementById('filterBtn').addEventListener('click', () => {
            updateDisplay();
        });
        
        document.getElementById('resetFilterBtn').addEventListener('click', () => {
            document.getElementById('methodFilter').value = '';
            document.getElementById('directionFilter').value = '';
            updateDisplay();
        });
        
        // Initial display
        updateDisplay();
    </script>
</body>
</html>`;
    }

    private async exportMessages(): Promise<void> {
        const uri = await vscode.window.showSaveDialog({
            title: 'Export JSON-RPC Messages',
            filters: {
                'JSON Files': ['json']
            }
        });

        if (uri) {
            const exportData = {
                timestamp: new Date().toISOString(),
                totalMessages: this.messages.length,
                messages: this.messages
            };

            await vscode.workspace.fs.writeFile(uri, Buffer.from(JSON.stringify(exportData, null, 2)));
            vscode.window.showInformationMessage(`Exported ${this.messages.length} messages to ${uri.fsPath}`);
        }
    }

    private filterMessages(filter: any): void {
        // Handle filtering logic here
        this.updateMessages(this.messages);
    }
} 