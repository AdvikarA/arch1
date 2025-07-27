# SSH Extension with Code-Server Integration

A custom VS Code extension that connects to remote servers via SSH and integrates with code-server for remote development.

## 🚀 Features

- **SSH Connection**: Establishes secure SSH connections to remote servers
- **Code-Server Detection**: Automatically detects if code-server is running on the remote server
- **Code-Server Management**: Can start code-server if it's not running
- **Multiple Authentication**: Supports SSH key and password authentication
- **Progress Tracking**: Shows detailed progress during connection
- **Communication Logging**: Captures and logs communication between VS Code and code-server

## 📋 What It Does

This extension works as a bridge between VS Code and code-server:

1. **Connects to remote server** via SSH
2. **Checks if code-server is running** on the specified port
3. **Starts code-server if needed** using the correct path
4. **Opens code-server** in VS Code or browser
5. **Shows communication** between VS Code and code-server when files are switched

## 🛠️ Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/AdvikarA/arch1.git
   cd arch1
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Compile the extension**:
   ```bash
   npm run compile
   ```

4. **Open in VS Code**:
   ```bash
   code .
   ```

5. **Press F5** to launch Extension Development Host

## 🧪 Testing

### Local Testing

1. **Start the test environment**:
   ```bash
   node test-local-ssh.js
   ```

2. **Run the extension**:
   - Press F5 in VS Code
   - Open Command Palette (Cmd+Shift+P)
   - Run "Connect via SSH"
   - Enter: `localhost`, `advikar`, `22`, `8080`

### Debug Communication

To see the communication between VS Code and code-server:

```bash
node debug-code-server.js
```

Then switch files in VS Code and watch the terminal output.

## 🔧 Configuration

### SSH Keys Setup

The extension automatically uses SSH keys if available. To set up SSH keys:

```bash
node setup-ssh-keys.js
```

### Code-Server Path

The extension is configured to use code-server at `/opt/homebrew/bin/code-server`. Update the path in `src/ssh-manager.ts` if needed.

## 📁 Project Structure

```
ssh-extension/
├── src/
│   ├── extension.ts          # Main extension logic
│   └── ssh-manager.ts        # SSH connection manager
├── out/                      # Compiled JavaScript
├── .vscode/                  # VS Code configuration
├── test-*.js                 # Test scripts
├── setup-*.js                # Setup scripts
└── package.json              # Dependencies and scripts
```

## 🔍 Communication Flow

When you switch files in VS Code:

1. **VS Code** sends file request via SSH
2. **Code-server** receives request and reads file from remote filesystem
3. **Code-server** sends file content back to VS Code
4. **VS Code** displays the file content

## 🎯 Key Features

- ✅ **Real SSH connections** using ssh2 library
- ✅ **Code-server integration** with automatic detection
- ✅ **Progress notifications** during connection
- ✅ **Multiple authentication methods** (SSH keys, password)
- ✅ **Communication logging** for debugging
- ✅ **Error handling** with detailed messages

## 🚀 Usage

1. **Open VS Code** and press F5
2. **Run "Connect via SSH"** command
3. **Enter connection details**:
   - Host: Your remote server
   - User: SSH username
   - SSH Port: Usually 22
   - Code-server Port: Usually 8080
4. **Choose connection method**:
   - Open Code-Server in VS Code
   - Open in Browser
   - Copy Connection Details

## 🔧 Development

### Compile Changes

```bash
npm run compile
```

### Watch Mode

```bash
npm run watch
```

### Test the Extension

```bash
node test-enhanced-extension.js
```

## 📊 Communication Examples

When you switch files, you'll see communication like:

```
📁 VS CODE FILE OPERATION: textDocument/didOpen
🌐 JSON-RPC MESSAGE: {"method":"textDocument/didOpen","params":{"textDocument":{"uri":"file:///path/to/file.js"}}}
🔗 SSH/REMOTE COMMUNICATION: File read request via SSH
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details.

## 🔗 Links

- [GitHub Repository](https://github.com/AdvikarA/arch1)
- [VS Code Extension API](https://code.visualstudio.com/api)
- [Code-Server Documentation](https://coder.com/docs/code-server/latest) 