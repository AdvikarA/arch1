#!/bin/bash

# Test script for JSON-RPC Interceptor
# This script demonstrates how to use the interceptor with a test server

echo "=== JSON-RPC Interceptor Test ==="
echo ""

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js to run the test server."
    exit 1
fi

# Check if the test server file exists
if [ ! -f "test-jsonrpc-server.js" ]; then
    echo "❌ test-jsonrpc-server.js not found. Please run this script from the ssh-extension directory."
    exit 1
fi

# Check if the extension is installed
if ! code --list-extensions | grep -q "arch.arch-ssh-extension"; then
    echo "⚠️  Arch SSH Extension not found. Installing..."
    code --install-extension arch-ssh-extension-0.0.1.vsix
fi

echo "🚀 Starting test JSON-RPC server on port 8080..."
echo "   This server will respond to VS Code Language Server Protocol messages"
echo ""

# Start the test server in the background
node test-jsonrpc-server.js 8080 &
SERVER_PID=$!

# Wait a moment for the server to start
sleep 2

echo "✅ Test server started with PID: $SERVER_PID"
echo ""
echo "📋 Next steps:"
echo "1. Open VS Code"
echo "2. Press Ctrl+Shift+P and run: 'Arch SSH: Connect to Host...'"
echo "3. Enter: localhost:8080"
echo "4. Once connected, run: 'Arch SSH: Show JSON-RPC Viewer'"
echo "5. Watch the captured JSON-RPC messages in real-time!"
echo ""
echo "🔍 The interceptor will capture messages like:"
echo "   - initialize (connection setup)"
echo "   - textDocument/completion (code completion)"
echo "   - textDocument/hover (hover information)"
echo "   - window/showMessage (notifications)"
echo ""
echo "📁 Log files will be saved to: /tmp/vscode-jsonrpc-logs/"
echo ""

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Stopping test server..."
    kill $SERVER_PID 2>/dev/null
    echo "✅ Test server stopped"
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

echo "⏳ Test server is running. Press Ctrl+C to stop."
echo ""

# Keep the script running
while true; do
    sleep 1
done 