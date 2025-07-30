#!/usr/bin/env bash

set -e

echo "🏗️  Building Enhanced ArchIDE Server Package..."

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DIST_DIR="$ROOT/dist"

# Clean and create dist directory
rm -rf "$DIST_DIR"
mkdir -p "$DIST_DIR"

echo "📦 Packaging ArchIDE Server..."

# Copy essential server files
cp "$ROOT/out/arch-server-main.js" "$DIST_DIR/"
cp "$ROOT/out/bootstrap-server.js" "$DIST_DIR/"
cp "$ROOT/out/bootstrap-meta.js" "$DIST_DIR/"

# Copy VS Code server core (complete vs directory)
echo "📁 Copying VS Code platform files..."
cp -r "$ROOT/out/vs" "$DIST_DIR/" 2>/dev/null || true

# Create missing NLS messages file if it doesn't exist
if [ ! -f "$ROOT/out/nls.messages.json" ]; then
    echo '{}' > "$DIST_DIR/nls.messages.json"
fi

# Create simplified nls.messages.js
cat > "$DIST_DIR/vs/nls.messages.js" << 'EOF'
// Simplified NLS messages for ArchIDE server
export function getNLSLanguage() {
    return 'en';
}

export function getNLSMessages() {
    return {};
}

export const nlsBundle = {};
EOF

# Copy additional required files
cp "$ROOT/out/bootstrap-node.js" "$DIST_DIR/" 2>/dev/null || true

# Copy product information
cp "$ROOT/product.json" "$DIST_DIR/"

# Create startup script
cat > "$DIST_DIR/arch-server" << 'EOF'
#!/usr/bin/env bash

# Enhanced ArchIDE Server Launcher
# This script starts the ArchIDE server with enhanced capabilities

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NODE_BINARY="${NODE_BINARY:-node}"

echo "🚀 Starting Enhanced ArchIDE Server..."

# Check if node is available
if ! command -v "$NODE_BINARY" &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js or set NODE_BINARY environment variable."
    exit 1
fi

# Default enhanced features
ENHANCED_PROTOCOL="${ARCH_SERVER_ENHANCED_PROTOCOL:-true}"
SECURE_WEBSOCKET="${ARCH_SERVER_SECURE_WEBSOCKET:-true}"
FILE_SYSTEM_CONTROL="${ARCH_SERVER_FILE_SYSTEM_CONTROL:-true}"
TERMINAL_CONTROL="${ARCH_SERVER_TERMINAL_CONTROL:-true}"

# Build command with enhanced features
CMD_ARGS=("--start-server")

if [ "$ENHANCED_PROTOCOL" = "true" ]; then
    CMD_ARGS+=(--enhanced-protocol)
fi

if [ "$SECURE_WEBSOCKET" = "true" ]; then
    CMD_ARGS+=(--secure-websocket)
fi

if [ "$FILE_SYSTEM_CONTROL" = "true" ]; then
    CMD_ARGS+=(--file-system-control)
fi

if [ "$TERMINAL_CONTROL" = "true" ]; then
    CMD_ARGS+=(--terminal-control)
fi

# Accept license terms automatically
CMD_ARGS+=(--accept-server-license-terms)

# Add any additional arguments passed to this script
CMD_ARGS+=("$@")

echo "📋 Enhanced Features: Protocol=$ENHANCED_PROTOCOL, WebSocket=$SECURE_WEBSOCKET, FileSystem=$FILE_SYSTEM_CONTROL, Terminal=$TERMINAL_CONTROL"

# Launch the server
exec "$NODE_BINARY" "$SCRIPT_DIR/arch-server-main.js" "${CMD_ARGS[@]}"
EOF

chmod +x "$DIST_DIR/arch-server"

# Create version info
cat > "$DIST_DIR/VERSION" << EOF
ArchIDE Enhanced Server
Version: $(node -e "console.log(require('./product.json').version)")
Build Date: $(date -u +"%Y-%m-%d %H:%M:%S UTC")
Commit: $(git rev-parse HEAD 2>/dev/null || echo "unknown")
Enhanced Features: JSON-RPC, WebSocket, FileSystem, Terminal
EOF

# Create README
cat > "$DIST_DIR/README.md" << 'EOF'
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
EOF

echo "✅ ArchIDE Server package created in: $DIST_DIR"
echo "📁 Package contents:"
ls -la "$DIST_DIR"

echo ""
echo "🧪 Testing server package..."
cd "$DIST_DIR"
./arch-server --help | head -10

echo ""
echo "🎉 Enhanced ArchIDE Server package ready for deployment!"
