#!/bin/bash

# Arch SSH Extension Setup Script
# This script helps configure VS Code to use the Arch SSH extension

echo "🚀 Setting up Arch SSH Extension..."

# Detect VS Code installation
VSCODE_CONFIG_DIR=""
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    VSCODE_CONFIG_DIR="$HOME/Library/Application Support/Code/User"
    VSCODE_OSS_CONFIG_DIR="$HOME/Library/Application Support/VSCodium/User"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux
    VSCODE_CONFIG_DIR="$HOME/.config/Code/User"
    VSCODE_OSS_CONFIG_DIR="$HOME/.config/VSCodium/User"
else
    # Windows (Git Bash)
    VSCODE_CONFIG_DIR="$APPDATA/Code/User"
    VSCODE_OSS_CONFIG_DIR="$APPDATA/VSCodium/User"
fi

# Function to update argv.json
update_argv_json() {
    local config_dir="$1"
    local argv_file="$config_dir/argv.json"
    
    if [[ ! -d "$config_dir" ]]; then
        echo "❌ VS Code config directory not found: $config_dir"
        return 1
    fi
    
    if [[ ! -f "$argv_file" ]]; then
        echo "📝 Creating new argv.json file..."
        cat > "$argv_file" << EOF
{
    "enable-proposed-api": [
        "arch.arch-ssh-extension"
    ]
}
EOF
    else
        echo "📝 Updating existing argv.json file..."
        # Check if our extension is already enabled
        if grep -q "arch.arch-ssh-extension" "$argv_file"; then
            echo "✅ Arch SSH extension is already enabled in argv.json"
        else
            # Add our extension to the enable-proposed-api array
            if grep -q "enable-proposed-api" "$argv_file"; then
                # Update existing enable-proposed-api array
                sed -i.bak 's/"enable-proposed-api": \[/"enable-proposed-api": [\n        "arch.arch-ssh-extension",/' "$argv_file"
            else
                # Add enable-proposed-api array
                sed -i.bak 's/^{/{\n    "enable-proposed-api": [\n        "arch.arch-ssh-extension"\n    ],/' "$argv_file"
            fi
            echo "✅ Added Arch SSH extension to argv.json"
        fi
    fi
}

# Try VS Code first
if [[ -d "$VSCODE_CONFIG_DIR" ]]; then
    echo "📁 Found VS Code config directory: $VSCODE_CONFIG_DIR"
    if update_argv_json "$VSCODE_CONFIG_DIR"; then
        echo "✅ Successfully configured VS Code"
    fi
fi

# Try VSCodium
if [[ -d "$VSCODE_OSS_CONFIG_DIR" ]]; then
    echo "📁 Found VSCodium config directory: $VSCODE_OSS_CONFIG_DIR"
    if update_argv_json "$VSCODE_OSS_CONFIG_DIR"; then
        echo "✅ Successfully configured VSCodium"
    fi
fi

echo ""
echo "🔧 Manual Configuration Steps:"
echo "1. Open VS Code/VSCodium"
echo "2. Press Ctrl+Shift+P (or Cmd+Shift+P on macOS)"
echo "3. Run 'Preferences: Configure Runtime Arguments'"
echo "4. Add 'arch.arch-ssh-extension' to the 'enable-proposed-api' array"
echo ""
echo "📋 The argv.json file should contain:"
echo "   {"
echo "     \"enable-proposed-api\": ["
echo "       \"arch.arch-ssh-extension\""
echo "     ]"
echo "   }"
echo ""
echo "🎯 After configuration:"
echo "1. Restart VS Code/VSCodium"
echo "2. The Arch SSH extension should be activated"
echo "3. Use 'Arch SSH: Connect to Host...' command"
echo ""
echo "🐧 For Alpine Linux users:"
echo "   sudo apk add bash libstdc++"
echo ""
echo "📁 SSH Configuration:"
echo "   Use 'Arch SSH: Open SSH Configuration File...' to manage SSH connections" 