# Enhanced ArchIDE Server Launcher

Simplified deployment package for the Enhanced ArchIDE Server.

## Files

- `arch-server`: Main launcher script
- `arch-server-main.js`: Compiled enhanced server
- `deploy-remote.sh`: Remote deployment script for SSH extension
- `VERSION`: Version information

## Usage

### Local Testing
```bash
./arch-server --help
./arch-server --start-server --port=8080
```

### Remote Deployment (used by SSH extension)
```bash
./deploy-remote.sh
```

## Environment Variables

- `ARCH_SERVER_ENHANCED_PROTOCOL`: Enable enhanced protocol (default: true)
- `ARCH_SERVER_SECURE_WEBSOCKET`: Enable secure WebSocket (default: true)  
- `ARCH_SERVER_FILE_SYSTEM_CONTROL`: Enable file system control (default: true)
- `ARCH_SERVER_TERMINAL_CONTROL`: Enable terminal control (default: true)
- `ARCH_SERVER_HOST`: Server host (default: 127.0.0.1)
- `ARCH_SERVER_PORT`: Server port (default: random)
- `ARCH_SERVER_INSTALL_DIR`: Installation directory (default: ~/.arch-server)
- `NODE_BINARY`: Node.js binary path (default: node)
