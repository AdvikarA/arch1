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
