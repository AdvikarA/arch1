# ArchIDE Minimal Server Package

This is a lightweight deployment package containing only the essential files needed to run the ArchIDE server.

## Package Contents

- **arch-server**: Enhanced server launcher script
- **arch-server-main.js**: Custom ArchIDE server entry point
- **bootstrap-*.js**: Server bootstrap files
- **vs/**: Essential VS Code modules (only required files)
- **product.json**: Product configuration
- **package.json**: Package metadata

## Usage

```bash
./arch-server --start-server --port=8080
```

## Enhanced Features

- ✅ Enhanced Protocol Support
- ✅ Secure WebSocket Communication  
- ✅ File System Control
- ✅ Terminal Integration
- ✅ Minimal Package Size (~1MB vs 100+MB)

## Environment Variables

- `ARCH_SERVER_ENHANCED_PROTOCOL`: Enable enhanced protocol (default: true)
- `ARCH_SERVER_SECURE_WEBSOCKET`: Enable secure WebSocket (default: true)
- `ARCH_SERVER_FILE_SYSTEM_CONTROL`: Enable file system control (default: true)
- `ARCH_SERVER_TERMINAL_CONTROL`: Enable terminal control (default: true)
- `NODE_BINARY`: Path to Node.js binary (default: node)

Generated on: Tue Jul 29 20:44:43 PDT 2025
