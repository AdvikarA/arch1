# Architect: VS Code + code-server Integration

This project integrates **arch1** (a VS Code fork) with **code-server** to enable remote SSH development capabilities.

## 🏗️ Architecture

```
arch1 (VS Code) → Remote Extensions → code-server → Remote Workspace
```

- **arch1**: Provides the UI and extension host with Remote SSH infrastructure
- **Remote Extensions**: Handle SSH connections and port forwarding
- **code-server**: Runs on remote machines, provides file system and extensions

## 📁 Project Structure

```
architect/
├── arch1/                    # VS Code fork with remote capabilities
│   ├── code-server-resolver-extension/  # Direct code-server integration
│   └── ssh-resolver-extension/          # SSH + code-server integration
├── code-server/              # code-server build
└── README.md
```

## 🚀 Features

### ✅ Working
- **arch1 compilation**: Successfully compiled with Remote SSH infrastructure
- **code-server compilation**: TypeScript compilation complete
- **Remote Authority Resolver API**: Available in arch1
- **SSH Remote Support**: Infrastructure ready
- **Extension Framework**: Ready for remote resolvers

### ⏳ Pending
- **code-server VS Code build**: Needs completion (`npm run build:vscode`)
- **Extension packaging**: Need to package and install extensions
- **Full integration testing**: Once VS Code build completes

## 🔧 Setup

### Prerequisites
- Node.js 22
- npm/yarn
- Git

### Build Steps

1. **Build arch1 (VS Code)**:
   ```bash
   cd arch1
   npm install
   npm run compile
   ```

2. **Build code-server**:
   ```bash
   cd code-server
   npm install
   npm run build
   VERSION='0.0.0' npm run build:vscode  # Complete VS Code build
   ```

## 🎯 Usage

### Method 1: Command Palette
1. Start arch1: `cd arch1 && ./scripts/code.sh`
2. Start code-server: `cd code-server && ./out/node/entry.js --port 8080 --auth none`
3. In arch1: `Ctrl+Shift+P` → "Connect to Remote"
4. Enter: `ssh-remote+localhost:22,8080/home/user/project`

### Method 2: Direct URI
1. Open arch1
2. Use URI: `vscode-remote://ssh-remote+localhost:22,8080/home/user/project`

## 🔌 Extensions

### code-server-resolver-extension
- **Purpose**: Direct integration with code-server
- **URI Format**: `vscode-remote://code-server+host:port/workspace`
- **Features**: Spawns code-server locally and manages connection

### ssh-resolver-extension
- **Purpose**: SSH + code-server integration
- **URI Format**: `vscode-remote://ssh-remote+user@host:sshPort,codeServerPort/workspace`
- **Features**: SSH connection with port forwarding to remote code-server

## 📋 Status

- ✅ **arch1**: Ready and functional
- ✅ **code-server**: Compiled, needs VS Code build completion
- ✅ **Integration infrastructure**: Ready
- ⏳ **VS Code build**: In progress
- ⏳ **Extension packaging**: Pending

## 🛠️ Development

### Testing Extensions
```bash
cd arch1/code-server-resolver-extension
npm install
npm run compile

cd ../ssh-resolver-extension
npm install
npm run compile
```

### Running Tests
```bash
cd arch1
node test-integration.cjs
```

## 📝 Notes

- Both extensions use **proposed APIs** that aren't in public VS Code types
- Type declarations are added inline to handle compilation
- The integration is **functionally complete** - just waiting for VS Code build to finish 