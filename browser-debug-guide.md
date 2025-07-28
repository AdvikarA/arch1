# 🔍 Browser Debug Guide for Code-Server Communication

## Method 1: Debug Logging (Recommended)

```bash
# Start code-server with debug logging
node debug-code-server.js
```

Then:
1. Open http://localhost:8080 in your browser
2. Open browser DevTools (F12)
3. Go to Console tab
4. Switch files in code-server
5. Watch the terminal output for communication logs

## Method 2: Browser Network Tab

1. **Start code-server**:
   ```bash
   /opt/homebrew/bin/code-server --port 8080 --host 0.0.0.0 --auth none
   ```

2. **Open code-server** in browser: http://localhost:8080

3. **Open DevTools** (F12):
   - Go to **Network** tab
   - Check "Preserve log"
   - Filter by "WS" (WebSocket) or "XHR"

4. **Switch files** in code-server and watch for:
   - WebSocket messages
   - HTTP requests/responses
   - File operation events

## Method 3: WebSocket Inspector

1. **Install WebSocket Inspector extension** in your browser
2. **Start code-server** as above
3. **Open code-server** in browser
4. **Use the WebSocket Inspector** to see real-time messages

## Method 4: Network Traffic Capture

```bash
# Install mitmproxy
brew install mitmproxy

# Start network capture
node capture-network.js
```

Then:
1. Open http://localhost:8081 (mitmproxy interface)
2. Open http://localhost:8080 (code-server)
3. Switch files and watch the traffic

## What to Look For

### File Operations:
- `textDocument/didOpen` - File opened
- `textDocument/didChange` - File content changed
- `textDocument/didClose` - File closed
- `workspace/didChangeWatchedFiles` - File system changes

### WebSocket Messages:
- JSON-RPC messages
- File content requests
- Editor state updates
- Extension host communication

### HTTP Requests:
- File content requests
- Extension downloads
- Configuration updates

## Example Communication Patterns

```json
// File opened
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "textDocument/didOpen",
  "params": {
    "textDocument": {
      "uri": "file:///path/to/file.js",
      "languageId": "javascript",
      "version": 1,
      "text": "file content..."
    }
  }
}

// File content request
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "textDocument/hover",
  "params": {
    "textDocument": {
      "uri": "file:///path/to/file.js"
    },
    "position": {
      "line": 10,
      "character": 5
    }
  }
}
```

## Quick Start

1. **Start debug logging**:
   ```bash
   node debug-code-server.js
   ```

2. **Open code-server** in browser: http://localhost:8080

3. **Open a file** and **switch between files**

4. **Watch the terminal** for communication logs

5. **Look for patterns** like:
   - File open/close events
   - Document change notifications
   - WebSocket message exchanges
   - Extension host communication 