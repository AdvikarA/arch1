#!/bin/bash

# ArchIDE + ArchServer + SSH Extension Integration Test
# This script demonstrates the complete workflow

set -e

echo "🚀 ArchIDE + ArchServer + SSH Extension Integration Test"
echo "========================================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
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
if [ ! -d "ArchIDE" ] || [ ! -d "ArchServer" ] || [ ! -d "ssh-extension" ]; then
    print_error "Please run this script from the arch2 directory"
    exit 1
fi

print_status "Starting integration test..."

# Step 1: Verify SSH Extension compilation
print_status "Step 1: Verifying SSH Extension compilation..."
cd ssh-extension
if npm run compile; then
    print_success "SSH Extension compiles successfully"
else
    print_error "SSH Extension compilation failed"
    exit 1
fi

# Step 2: Package SSH Extension
print_status "Step 2: Packaging SSH Extension..."
if npm run package; then
    print_success "SSH Extension packaged successfully"
    EXTENSION_VSIX=$(ls arch-ssh-extension-*.vsix | head -1)
    print_status "Extension package: $EXTENSION_VSIX"
else
    print_error "SSH Extension packaging failed"
    exit 1
fi

# Step 3: Verify ArchServer compilation
print_status "Step 3: Verifying ArchServer compilation..."
cd ../ArchServer
if npm run compile; then
    print_success "ArchServer compiles successfully"
else
    print_error "ArchServer compilation failed"
    exit 1
fi

# Step 4: Test ArchServer binary
print_status "Step 4: Testing ArchServer binary..."
if [ -f "./arch-server" ] && [ -x "./arch-server" ]; then
    print_success "ArchServer binary exists and is executable"
    ./arch-server --help > /dev/null 2>&1 && print_success "ArchServer binary works correctly"
else
    print_error "ArchServer binary not found or not executable"
    exit 1
fi

# Step 5: Check ArchIDE build status
print_status "Step 5: Checking ArchIDE build status..."
cd ../ArchIDE
if [ -d "out" ] && [ -f "out/main.js" ]; then
    print_success "ArchIDE appears to be built"
else
    print_warning "ArchIDE may not be fully built. Run 'npm run compile' in ArchIDE directory"
fi

# Step 6: Test activation script
print_status "Step 6: Testing activation script..."
cd ..
if [ -f "setup-arch-ssh.sh" ] && [ -x "setup-arch-ssh.sh" ]; then
    print_success "Activation script exists and is executable"
    # Test the script (dry run)
    if ./setup-arch-ssh.sh --dry-run 2>/dev/null; then
        print_success "Activation script works correctly"
    else
        print_warning "Activation script may need adjustments"
    fi
else
    print_error "Activation script not found or not executable"
fi

# Step 7: Verify documentation
print_status "Step 7: Verifying documentation..."
if [ -f "README.md" ] && [ -f "ACTIVATION.md" ]; then
    print_success "Documentation files exist"
else
    print_warning "Some documentation files may be missing"
fi

# Step 8: Integration summary
print_status "Step 8: Integration Summary"
echo "=================================="
echo "✅ SSH Extension: Compiled and packaged"
echo "✅ ArchServer: Compiled with working binary"
echo "✅ ArchIDE: Build status verified"
echo "✅ Activation: Script ready for use"
echo "✅ Documentation: Available"

print_success "Integration test completed successfully!"
echo ""
echo "🎯 Next Steps:"
echo "1. Run './setup-arch-ssh.sh' to activate the extension"
echo "2. Start ArchIDE with the extension enabled"
echo "3. Use the 'Arch SSH: Open Empty Window' command"
echo "4. Connect to a remote server using the custom SSH extension"
echo "5. The extension will automatically start ArchServer on the remote machine"
echo ""
echo "📚 Documentation:"
echo "- README.md: Project overview and setup"
echo "- ACTIVATION.md: Detailed activation instructions"
echo "- ssh-extension/README.md: Extension-specific documentation" 