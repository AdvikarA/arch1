# JSON-RPC Interceptor for Arch SSH Extension

This extension now includes a **JSON-RPC interceptor** that allows you to capture and view all JSON-RPC messages passed between VS Code and the remote server during SSH connections.

## Features

- **Real-time message capture**: Intercepts all JSON-RPC messages in both directions
- **Web-based viewer**: Beautiful webview interface to browse captured messages
- **Message filtering**: Filter messages by method name and direction
- **Export functionality**: Export captured messages to JSON files
- **Logging**: Automatic logging to files and console

## How It Works

The interceptor creates a **proxy server** that sits between VS Code and the remote server:

```
VS Code Client → JSON-RPC Interceptor → SSH Tunnel → Remote Server
```

All JSON-RPC messages flow through the interceptor, which:
1. **Captures** each message
2. **Logs** it to console and/or file
3. **Forwards** it unchanged to the destination
4. **Displays** it in the webview interface

## Usage

### 1. Connect to a Remote Host

Use the normal SSH connection process:

```bash
# Connect using the extension
code --remote arch-ssh-remote+user@hostname:port
```

### 2. Open the JSON-RPC Viewer

Once connected, you can open the JSON-RPC viewer in several ways:

- **Command Palette**: Press `Ctrl+Shift+P` and run `Arch SSH: Show JSON-RPC Viewer`
- **Command**: Use the command `archssh.showJsonRpcViewer`

### 3. View Captured Messages

The viewer will show:
- **Message direction** (Client → Remote or Remote → Client)
- **Method name** (e.g., `initialize`, `textDocument/completion`)
- **Message type** (Request, Response, Error, Notification)
- **Full message content** in formatted JSON

### 4. Filter Messages

Use the filter controls to:
- **Filter by method name**: Type part of a method name
- **Filter by direction**: Select Client → Remote or Remote → Client
- **Reset filters**: Clear all filters

### 5. Export Messages

- **Export to file**: Use `Arch SSH: Export JSON-RPC Log` command
- **Clear log**: Use `Arch SSH: Clear JSON-RPC Log` command

## Configuration

The interceptor can be configured through the extension settings:

```json
{
    "arch.ssh.jsonRpcInterceptor": {
        "enabled": true,
        "logToFile": true,
        "logToConsole": true,
        "logDirectory": "/tmp/vscode-jsonrpc-logs"
    }
}
```

## Testing with Test Server

You can test the interceptor using the included test server:

```bash
# Start the test JSON-RPC server
node test-jsonrpc-server.js 8080

# Connect to it through the extension
code --remote arch-ssh-remote+user@localhost:8080
```

The test server will:
- Respond to standard VS Code Language Server Protocol methods
- Send periodic notifications
- Log all received messages

## Message Types

The interceptor captures several types of JSON-RPC messages:

### Requests
```json
{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize",
    "params": { ... }
}
```

### Responses
```json
{
    "jsonrpc": "2.0",
    "id": 1,
    "result": { ... }
}
```

### Errors
```json
{
    "jsonrpc": "2.0",
    "id": 1,
    "error": {
        "code": -32601,
        "message": "Method not found"
    }
}
```

### Notifications
```json
{
    "jsonrpc": "2.0",
    "method": "window/showMessage",
    "params": { ... }
}
```

## Common VS Code LSP Methods

The interceptor will capture these common Language Server Protocol methods:

- `initialize` - Initial connection setup
- `textDocument/completion` - Code completion
- `textDocument/hover` - Hover information
- `textDocument/definition` - Go to definition
- `textDocument/references` - Find references
- `textDocument/symbol` - Document symbols
- `workspace/symbol` - Workspace symbols
- `textDocument/codeAction` - Code actions
- `textDocument/formatting` - Code formatting
- `textDocument/rename` - Rename symbol

## Debugging

### Enable Debug Logging

To see detailed interceptor logs, enable debug mode:

```json
{
    "arch.ssh.logLevel": "debug"
}
```

### View Log Files

Log files are saved to:
- **Console**: Check the VS Code Developer Console
- **Files**: Check the configured log directory (default: `/tmp/vscode-jsonrpc-logs`)

### Common Issues

1. **No messages captured**: Ensure the connection is using the `arch-ssh-remote` authority
2. **Viewer not showing**: Check that the webview is enabled in VS Code
3. **Port conflicts**: The interceptor uses a port offset of +1000 from the original tunnel

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   VS Code       │    │ JSON-RPC         │    │ Remote Server   │
│   Client        │───▶│ Interceptor      │───▶│ (VS Code Server)│
│                 │    │ (Port + 1000)    │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌──────────────────┐
                       │ SSH Tunnel       │
                       │ (Original Port)  │
                       └──────────────────┘
```

## API Reference

### JsonRpcInterceptor Class

```typescript
class JsonRpcInterceptor {
    constructor(config: InterceptorConfig, logger: Log)
    async start(): Promise<void>
    async stop(): Promise<void>
    getMessageLog(): JsonRpcMessage[]
    clearMessageLog(): void
    getMessagesByMethod(method: string): JsonRpcMessage[]
    exportMessageLog(filePath: string): void
}
```

### InterceptorConfig Interface

```typescript
interface InterceptorConfig {
    localPort: number;
    remoteHost: string;
    remotePort: number;
    logToFile?: boolean;
    logToConsole?: boolean;
    logDirectory?: string;
}
```

## Examples

### Basic Usage

```typescript
const interceptor = new JsonRpcInterceptor({
    localPort: 9080,
    remoteHost: '127.0.0.1',
    remotePort: 8080,
    logToFile: true,
    logToConsole: true
}, logger);

await interceptor.start();
```

### Filter Messages

```typescript
// Get all completion requests
const completionMessages = interceptor.getMessagesByMethod('textDocument/completion');

// Export to file
interceptor.exportMessageLog('/path/to/export.json');
```

## Troubleshooting

### Extension Not Activating

1. Check that `extensionKind` includes `"workspace"`
2. Verify activation events are properly configured
3. Check the VS Code Developer Console for errors

### No Messages in Viewer

1. Ensure you're connected using `arch-ssh-remote` authority
2. Check that the interceptor is started (look for log messages)
3. Verify the tunnel is established correctly

### Performance Issues

1. Disable file logging if not needed
2. Clear the message log periodically
3. Use filters to reduce displayed messages

## Contributing

To extend the interceptor:

1. **Add new message types**: Extend the `JsonRpcMessage` interface
2. **Add new filters**: Modify the webview JavaScript
3. **Add new export formats**: Extend the export functionality
4. **Add new visualizations**: Modify the webview HTML/CSS

## License

This feature is part of the Arch SSH Extension and follows the same license terms. 