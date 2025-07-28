#!/bin/bash
set -euo pipefail

# Script to apply all patches to VS Code source
echo "Applying patches to VS Code source..."

cd "$(dirname "$0")"

# Check if we're in the right directory
if [ ! -d "patches" ]; then
    echo "Error: patches directory not found"
    exit 1
fi

if [ ! -d "lib/vscode" ]; then
    echo "Error: lib/vscode directory not found"
    exit 1
fi

# Go to VS Code directory
cd lib/vscode

# Reset any existing changes
git reset --hard HEAD
git clean -fd

# Apply patches in order from series file
echo "Reading patch series..."
while IFS= read -r patch_file; do
    if [ -n "$patch_file" ] && [[ ! "$patch_file" =~ ^# ]]; then
        echo "Applying patch: $patch_file"
        if [ -f "../../patches/$patch_file" ]; then
            git apply "../../patches/$patch_file"
            echo "✓ Applied $patch_file"
        else
            echo "✗ Patch file not found: $patch_file"
            exit 1
        fi
    fi
done < "../../patches/series"

echo "All patches applied successfully!"
echo "You can now run: npm run build:vscode" 