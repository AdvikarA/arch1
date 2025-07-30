# Enhanced ArchIDE Server

This is a custom VS Code server with enhanced remote development capabilities.

## Features

- **Enhanced JSON-RPC Protocol**: Advanced communication capabilities
- **Secure WebSocket**: Enhanced security and compression
- **File System Control**: Advanced file operations and monitoring
- **Terminal Control**: Enhanced terminal management

## Usage

```bash
# Start with default enhanced features
./arch-server

# Start with custom configuration
./arch-server --host=0.0.0.0 --port=8080

# Start with specific features
ARCH_SERVER_ENHANCED_PROTOCOL=true \
ARCH_SERVER_SECURE_WEBSOCKET=true \
./arch-server

# Get help
./arch-server --help
```

## Environment Variables

- `ARCH_SERVER_ENHANCED_PROTOCOL`: Enable enhanced protocol (default: true)
- `ARCH_SERVER_SECURE_WEBSOCKET`: Enable secure WebSocket (default: true)
- `ARCH_SERVER_FILE_SYSTEM_CONTROL`: Enable file system control (default: true)
- `ARCH_SERVER_TERMINAL_CONTROL`: Enable terminal control (default: true)
- `NODE_BINARY`: Path to Node.js binary (default: node)

## Integration with SSH Extension

This server is designed to work with the arch-ssh-extension as a drop-in replacement for the standard VS Code server.
