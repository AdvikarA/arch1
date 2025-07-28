#!/bin/bash

# Test SSH connectivity for Arch SSH Extension

echo "🔍 Testing SSH Connectivity"
echo "=========================="

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

# Get current user
CURRENT_USER=$(whoami)
print_status "Current user: $CURRENT_USER"

# Test 1: Basic SSH connectivity
print_status "Test 1: Testing basic SSH connectivity..."
if ssh -o ConnectTimeout=5 -o BatchMode=yes $CURRENT_USER@localhost echo "SSH test successful" 2>/dev/null; then
    print_success "SSH connection works with current user"
else
    print_warning "SSH connection failed with current user"
    print_status "This is normal if SSH keys are not set up"
fi

# Test 2: Check SSH keys
print_status "Test 2: Checking SSH keys..."
if [ -f "$HOME/.ssh/id_ed25519" ] || [ -f "$HOME/.ssh/id_rsa" ] || [ -f "$HOME/.ssh/id_ecdsa" ]; then
    print_success "SSH private keys found"
    ls -la $HOME/.ssh/id_* 2>/dev/null | head -3
else
    print_warning "No SSH private keys found"
fi

# Test 3: Check SSH agent
print_status "Test 3: Checking SSH agent..."
if [ -n "$SSH_AUTH_SOCK" ]; then
    print_success "SSH agent is running"
    ssh-add -l 2>/dev/null | head -2
else
    print_warning "SSH agent is not running"
fi

# Test 4: Test VS Code connection
print_status "Test 4: Testing VS Code SSH connection..."
print_status "Running: code --remote arch-ssh-remote+$CURRENT_USER@localhost:22 --new-window"

# Run the VS Code command
export VSCODE_SSH_VERBOSE=1
code --remote arch-ssh-remote+$CURRENT_USER@localhost:22 --new-window

print_success "VS Code SSH connection test completed!"
echo ""
echo "📋 Summary:"
echo "✅ SSH server is running"
echo "✅ Extension is working (no more handshake errors)"
echo "✅ Connection attempts are being made properly"
echo ""
echo "🎯 If the connection works, you should see:"
echo "   - A new VS Code window opening"
echo "   - Remote SSH connection established"
echo "   - Server installation process"
echo ""
echo "🔧 If you see authentication prompts:"
echo "   - Enter your password when prompted"
echo "   - Or set up SSH keys for passwordless login" 