# Code Server Remote Resolver Extension

This extension provides direct integration with code-server as the remote server for VS Code. Unlike the SSH resolver, this extension **directly spawns and manages code-server processes**.

## How It Works

### Direct Integration
- **Spawns code-server locally** as a managed process
- **Connects VS Code directly** to the code-server instance
- **No SSH required** - direct process management

### Architecture
```
VS Code (arch1) → Extension → code-server process
```

## Installation

1. **Build the extension:**
   ```bash
   cd arch1/code-server-resolver-extension
   npm install
   npm run compile
   ```

2. **Install the extension** in your VS Code

## Usage

### Method 1: Command Palette
1. Open VS Code
2. Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on macOS)
3. Run "Connect to Code Server"
4. Enter the connection details

### Method 2: Direct URI
Use the following URI format:
```
vscode-remote://code-server+host:port/workspace
```

### Examples:

1. **Connect to local code-server:**
   ```
   vscode-remote://code-server+localhost:8080/home/user/project
   ```

2. **Connect to remote code-server:**
   ```
   vscode-remote://code-server+remote-server.com:8080/home/user/project
   ```

3. **Default workspace:**
   ```
   vscode-remote://code-server+localhost:8080
   ```

## Prerequisites

1. **code-server built** in the `../code-server/` directory
2. **Node.js** available in PATH
3. **Proper permissions** to spawn processes

## How it works

1. The extension **spawns a code-server process** locally
2. It **configures code-server** with the specified host, port, and workspace
3. VS Code **connects directly** to the code-server instance
4. The extension **manages the code-server lifecycle**

## Configuration

The extension supports the following parameters:
- `host`: code-server host (default: localhost)
- `port`: code-server port (default: 8080)
- `workspace`: workspace path to open (optional)

## Code-Server Integration

This extension **directly uses code-server** by:

1. **Spawning the code-server process** from the built code-server directory
2. **Passing configuration** via command-line arguments
3. **Managing the process lifecycle** (start, stop, restart)
4. **Handling communication** between VS Code and code-server

### Code-Server Process Management

```typescript
// Spawn code-server process
const codeServerProcess = spawn('node', [codeServerPath, ...args], {
  stdio: ['pipe', 'pipe', 'pipe'],
  env: {
    ...process.env,
    NODE_ENV: 'development'
  }
});
```

## Advantages Over SSH Resolver

1. **Direct Process Management** - No SSH overhead
2. **Better Integration** - Direct access to code-server APIs
3. **Easier Debugging** - Local process management
4. **Faster Connection** - No network latency
5. **More Control** - Direct configuration of code-server

## Development

To develop this extension:

```bash
cd arch1/code-server-resolver-extension
npm install
npm run watch  # For development with auto-recompile
```

## Troubleshooting

1. **code-server not found:**
   - Ensure code-server is built: `cd ../code-server && npm run build`
   - Check the path in the extension: `../../../code-server/out/node/entry.js`

2. **Process spawn fails:**
   - Check Node.js installation
   - Verify file permissions
   - Check antivirus/firewall settings

3. **Connection issues:**
   - Verify the port is available
   - Check if code-server started successfully
   - Review the console output for errors 