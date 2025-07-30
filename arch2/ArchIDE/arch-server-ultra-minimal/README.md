# ArchIDE Server Ultra-Minimal Package

Ultra-lightweight package using standard VS Code server with enhanced features via environment variables.

## Contents:
- `arch-server` - Enhanced launcher script
- `server-main.js` - Standard VS Code server
- `bootstrap-*.js` - VS Code bootstrap modules
- `product.json` - Product configuration

## Size: ~40KB (vs ~200MB full package)

## Usage:
```bash
./arch-server --start-server --port=8080
```

## Enhanced Features (via environment):
- ARCH_SERVER_ENHANCED_PROTOCOL=true
- ARCH_SERVER_SECURE_WEBSOCKET=true  
- ARCH_SERVER_FILE_SYSTEM_CONTROL=true
- ARCH_SERVER_TERMINAL_CONTROL=true
