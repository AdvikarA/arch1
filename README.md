# SSH Remote Resolver Extension

This extension provides SSH remote connectivity for VS Code, allowing you to connect to remote machines running code-server.

## Installation

1. **Build the extension:**
   ```bash
   cd ssh-resolver-extension
   npm install
   npm run compile
   ```

2. **Install the extension:**
   - Copy the extension folder to your VS Code extensions directory
   - Or use the VSIX installer

## Usage

### Method 1: Command Palette
1. Open VS Code
2. Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on macOS)
3. Run "Connect via SSH"
4. Enter the connection details

### Method 2: Direct URI
Use the following URI format:
```
vscode-remote://ssh-remote+user@host:sshPort,codeServerPort/path/to/workspace
```

### Examples:

1. **Connect to localhost:**
   ```
   vscode-remote://ssh-remote+localhost:22,8080/home/user/project
   ```

2. **Connect to remote server:**
   ```
   vscode-remote://ssh-remote+user@remote-server.com:22,8080/home/user/project
   ```

3. **Custom SSH port:**
   ```
   vscode-remote://ssh-remote+user@server.com:2222,9000/home/user/project
   ```

## Prerequisites

1. **SSH access** to the remote machine
2. **code-server installed** on the remote machine
3. **SSH key authentication** (recommended) or password authentication

## How it works

1. The extension establishes an SSH connection to the remote machine
2. It starts code-server on the remote machine via SSH
3. It sets up port forwarding to access code-server locally
4. VS Code connects to the local forwarded port

## Configuration

The extension supports the following connection parameters:
- `host`: Remote machine hostname or IP
- `user`: SSH username (optional)
- `sshPort`: SSH port (default: 22)
- `codeServerPort`: code-server port (default: 8080)

## Troubleshooting

1. **SSH connection fails:**
   - Verify SSH access to the remote machine
   - Check SSH key permissions
   - Ensure the remote machine is accessible

2. **code-server not found:**
   - Install code-server on the remote machine
   - Ensure code-server is in the PATH

3. **Port forwarding issues:**
   - Check if the code-server port is available
   - Verify firewall settings

## Development

To develop this extension:

```bash
cd ssh-resolver-extension
npm install
npm run watch  # For development with auto-recompile
``` 