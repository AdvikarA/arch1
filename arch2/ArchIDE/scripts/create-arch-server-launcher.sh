#!/usr/bin/env bash

set -e

echo "🏗️  Creating Enhanced ArchIDE Server Launcher..."

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LAUNCHER_DIR="$ROOT/arch-server-launcher"

# Clean and create launcher directory
rm -rf "$LAUNCHER_DIR"
mkdir -p "$LAUNCHER_DIR"

echo "📦 Creating launcher package..."

# Create the main launcher script
cat > "$LAUNCHER_DIR/arch-server" << EOF
#!/usr/bin/env bash

# Enhanced ArchIDE Server Launcher
# This script deploys and runs the ArchIDE server with enhanced capabilities

set -e

SCRIPT_DIR="\$(cd "\$(dirname "\${BASH_SOURCE[0]}")" && pwd)"
NODE_BINARY="\${NODE_BINARY:-node}"

echo "🚀 Enhanced ArchIDE Server Deployment..."

# Check if node is available
if ! command -v "\$NODE_BINARY" &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js or set NODE_BINARY environment variable."
    exit 1
fi

# Default enhanced features
ENHANCED_PROTOCOL="\${ARCH_SERVER_ENHANCED_PROTOCOL:-true}"
SECURE_WEBSOCKET="\${ARCH_SERVER_SECURE_WEBSOCKET:-true}"
FILE_SYSTEM_CONTROL="\${ARCH_SERVER_FILE_SYSTEM_CONTROL:-true}"
TERMINAL_CONTROL="\${ARCH_SERVER_TERMINAL_CONTROL:-true}"

# Build command with enhanced features
CMD_ARGS=("--start-server")

if [ "\$ENHANCED_PROTOCOL" = "true" ]; then
    CMD_ARGS+=(--enhanced-protocol)
fi

if [ "\$SECURE_WEBSOCKET" = "true" ]; then
    CMD_ARGS+=(--secure-websocket)
fi

if [ "\$FILE_SYSTEM_CONTROL" = "true" ]; then
    CMD_ARGS+=(--file-system-control)
fi

if [ "\$TERMINAL_CONTROL" = "true" ]; then
    CMD_ARGS+=(--terminal-control)
fi

# Accept license terms automatically
CMD_ARGS+=(--accept-server-license-terms)

# Add any additional arguments passed to this script
CMD_ARGS+=("\$@")

echo "📋 Enhanced Features: Protocol=\$ENHANCED_PROTOCOL, WebSocket=\$SECURE_WEBSOCKET, FileSystem=\$FILE_SYSTEM_CONTROL, Terminal=\$TERMINAL_CONTROL"

# Launch the server using the compiled arch-server-main.js directly
exec "\$NODE_BINARY" "\$SCRIPT_DIR/arch-server-main.js" "\${CMD_ARGS[@]}"
EOF

chmod +x "$LAUNCHER_DIR/arch-server"

# Copy the compiled enhanced server and dependencies
cp "$ROOT/out/arch-server-main.js" "$LAUNCHER_DIR/"
cp "$ROOT/out/bootstrap-server.js" "$LAUNCHER_DIR/"
cp "$ROOT/out/bootstrap-meta.js" "$LAUNCHER_DIR/"
cp "$ROOT/out/bootstrap-node.js" "$LAUNCHER_DIR/"

# Copy VS Code platform files
cp -r "$ROOT/out/vs" "$LAUNCHER_DIR/"

# Copy product information
cp "$ROOT/product.json" "$LAUNCHER_DIR/"

# Create a deployment script for SSH extension
cat > "$LAUNCHER_DIR/deploy-remote.sh" << 'EOF'
#!/usr/bin/env bash

# Enhanced ArchIDE Server Remote Deployment Script
# This script is used by the SSH extension to deploy the server

set -e

echo "🚀 Deploying Enhanced ArchIDE Server..."

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Default installation directory
INSTALL_DIR="${ARCH_SERVER_INSTALL_DIR:-$HOME/.arch-server}"

# Create installation directory
mkdir -p "$INSTALL_DIR"

# Copy server files
echo "📁 Installing server files to: $INSTALL_DIR"
cp "$SCRIPT_DIR/arch-server" "$INSTALL_DIR/"
cp "$SCRIPT_DIR/arch-server-main.js" "$INSTALL_DIR/"

# Make launcher executable
chmod +x "$INSTALL_DIR/arch-server"

# Generate connection token
CONNECTION_TOKEN=$(openssl rand -hex 32 2>/dev/null || head -c 32 /dev/urandom | xxd -p -c 32)

# Start the server
echo "🔗 Starting Enhanced ArchIDE Server..."
cd "$INSTALL_DIR"

# Set default host and port
HOST="${ARCH_SERVER_HOST:-127.0.0.1}"
PORT="${ARCH_SERVER_PORT:-0}"

# Launch server and capture output
OUTPUT_FILE="$(mktemp)"
./arch-server --host="$HOST" --port="$PORT" --connection-token="$CONNECTION_TOKEN" > "$OUTPUT_FILE" 2>&1 &
SERVER_PID=$!

# Wait for server to start and extract listening information
for i in {1..30}; do
    if grep -q "listening on" "$OUTPUT_FILE" 2>/dev/null; then
        break
    fi
    sleep 0.5
done

# Extract server information
if grep -q "listening on" "$OUTPUT_FILE"; then
    LISTENING_INFO=$(grep "listening on" "$OUTPUT_FILE" | head -1)
    echo "✅ Server started successfully"
    echo "listeningOn=$LISTENING_INFO"
    echo "connectionToken=$CONNECTION_TOKEN"
    echo "serverPid=$SERVER_PID"
else
    echo "❌ Failed to start server"
    cat "$OUTPUT_FILE"
    kill $SERVER_PID 2>/dev/null || true
    exit 1
fi

# Clean up temp file
rm -f "$OUTPUT_FILE"

echo "🎉 Enhanced ArchIDE Server deployed and running!"
EOF

chmod +x "$LAUNCHER_DIR/deploy-remote.sh"

# Create version info
cat > "$LAUNCHER_DIR/VERSION" << EOF
ArchIDE Enhanced Server Launcher
Version: $(node -e "console.log(require('../product.json').version)" 2>/dev/null || echo "1.0.0")
Build Date: $(date -u +"%Y-%m-%d %H:%M:%S UTC")
Commit: $(git rev-parse HEAD 2>/dev/null || echo "unknown")
Enhanced Features: JSON-RPC, WebSocket, FileSystem, Terminal
EOF

# Create README
cat > "$LAUNCHER_DIR/README.md" << 'EOF'
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
EOF

echo "✅ Enhanced ArchIDE Server Launcher created in: $LAUNCHER_DIR"
echo "📁 Launcher contents:"
ls -la "$LAUNCHER_DIR"

echo ""
echo "🧪 Testing launcher..."
cd "$LAUNCHER_DIR"
./arch-server --help | head -5

echo ""
echo "🎉 Enhanced ArchIDE Server Launcher ready!"
echo "📋 To test locally: cd $LAUNCHER_DIR && ./arch-server --start-server --port=8080"
echo "📋 For SSH extension: Use deploy-remote.sh script"
