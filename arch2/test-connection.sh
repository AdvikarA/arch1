#!/bin/bash

# Test script for Arch SSH Extension connection issues
# This script helps debug connection problems

set -e

echo "🔍 Arch SSH Extension Connection Test"
echo "====================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -d "ssh-extension" ]; then
    print_error "Please run this script from the arch2 directory"
    exit 1
fi

print_status "Starting connection test..."

# Step 1: Check if the extension is compiled
print_status "Step 1: Checking extension compilation..."
cd ssh-extension
if [ -d "out" ] && [ -f "out/extension.js" ]; then
    print_success "Extension is compiled"
else
    print_error "Extension is not compiled. Run 'npm run compile' first"
    exit 1
fi

# Step 2: Check if the extension is packaged
print_status "Step 2: Checking extension packaging..."
if ls arch-ssh-extension-*.vsix >/dev/null 2>&1; then
    print_success "Extension is packaged"
    EXTENSION_VSIX=$(ls arch-ssh-extension-*.vsix | head -1)
    print_status "Extension package: $EXTENSION_VSIX"
else
    print_error "Extension is not packaged. Run 'npm run package' first"
    exit 1
fi

# Step 3: Check VS Code configuration
print_status "Step 3: Checking VS Code configuration..."
VSCODE_CONFIG_DIR=""
if [[ "$OSTYPE" == "darwin"* ]]; then
    VSCODE_CONFIG_DIR="$HOME/Library/Application Support/Code/User"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    VSCODE_CONFIG_DIR="$HOME/.config/Code/User"
else
    VSCODE_CONFIG_DIR="$APPDATA/Code/User"
fi

if [ -f "$VSCODE_CONFIG_DIR/argv.json" ]; then
    if grep -q "arch.arch-ssh-extension" "$VSCODE_CONFIG_DIR/argv.json"; then
        print_success "Arch SSH extension is enabled in VS Code"
    else
        print_warning "Arch SSH extension is NOT enabled in VS Code"
        print_status "Run './setup-arch-ssh.sh' to enable the extension"
    fi
else
    print_warning "VS Code argv.json not found at $VSCODE_CONFIG_DIR/argv.json"
fi

# Step 4: Test basic SSH connectivity
print_status "Step 4: Testing basic SSH connectivity..."
if command -v ssh >/dev/null 2>&1; then
    print_success "SSH client is available"
else
    print_error "SSH client is not available"
    exit 1
fi

# Step 5: Check for common issues
print_status "Step 5: Checking for common issues..."

# Check if port 8080 is available
if lsof -i :8080 >/dev/null 2>&1; then
    print_warning "Port 8080 is already in use"
    print_status "This might cause connection issues"
else
    print_success "Port 8080 is available"
fi

# Check for SSH agent
if [ -n "$SSH_AUTH_SOCK" ]; then
    print_success "SSH agent is running"
else
    print_warning "SSH agent is not running"
    print_status "Consider running 'ssh-add' to add your keys"
fi

# Step 6: Provide debugging commands
print_status "Step 6: Debugging commands"
echo ""
echo "🔧 To debug the connection issue:"
echo ""
echo "1. Enable verbose SSH logging:"
echo "   export VSCODE_SSH_VERBOSE=1"
echo ""
echo "2. Test SSH connection manually:"
echo "   ssh -v test@localhost"
echo ""
echo "3. Check VS Code logs:"
echo "   - Open VS Code"
echo "   - Press Ctrl+Shift+P (or Cmd+Shift+P on macOS)"
echo "   - Run 'Developer: Open Process Explorer'"
echo "   - Look for 'arch-ssh-remote' processes"
echo ""
echo "4. Check extension logs:"
echo "   - Open VS Code"
echo "   - Press Ctrl+Shift+P (or Cmd+Shift+P on macOS)"
echo "   - Run 'Developer: Show Logs'"
echo "   - Look for 'Arch SSH Extension' entries"
echo ""
echo "5. Test with a simple connection:"
echo "   code --remote arch-ssh-remote+test@localhost:8080 --new-window"
echo ""

print_success "Connection test completed!"
echo ""
echo "📋 Summary:"
echo "✅ Extension is compiled and packaged"
echo "✅ SSH client is available"
echo "✅ Basic checks completed"
echo ""
echo "🎯 Next steps:"
echo "1. Make sure the extension is enabled in VS Code"
echo "2. Try connecting with verbose logging enabled"
echo "3. Check the logs for specific error messages"
echo "4. If the issue persists, try restarting VS Code" 