const { spawn } = require('child_process');
const fs = require('fs');

console.log('🔍 Starting code-server with debug logging...\n');

// Start code-server with debug logging
function startCodeServerWithDebug() {
    return new Promise((resolve, reject) => {
        const codeServer = spawn('/opt/homebrew/bin/code-server', [
            '--port', '8080',
            '--host', '0.0.0.0',
            '--auth', 'none',
            '--log', 'debug',
            '--verbose'
        ], {
            stdio: 'pipe',
            env: {
                ...process.env,
                'VSCODE_LOG_LEVEL': 'debug',
                'VSCODE_VERBOSE_LOGGING': 'true'
            }
        });
        
        console.log('📊 Code-server debug logging enabled');
        console.log('🔍 Watch for file operations and communication:');
        console.log('   - File open/close events');
        console.log('   - WebSocket messages');
        console.log('   - HTTP requests/responses');
        console.log('   - Extension host communication');
        
        codeServer.stdout.on('data', (data) => {
            const output = data.toString();
            console.log('code-server stdout:', output);
            
            // Look for specific file operation patterns
            if (output.includes('file') || output.includes('workspace') || output.includes('document')) {
                console.log('📁 FILE OPERATION DETECTED:', output);
            }
            
            if (output.includes('websocket') || output.includes('message')) {
                console.log('🌐 WEBSOCKET MESSAGE:', output);
            }
        });
        
        codeServer.stderr.on('data', (data) => {
            const output = data.toString();
            console.log('code-server stderr:', output);
            
            // Look for communication patterns
            if (output.includes('request') || output.includes('response')) {
                console.log('📡 HTTP REQUEST/RESPONSE:', output);
            }
        });
        
        codeServer.on('error', (error) => {
            console.error('Failed to start code-server:', error);
            reject(error);
        });
        
        setTimeout(() => {
            console.log('\n✅ Code-server started with debug logging');
            console.log('🌐 Access at: http://localhost:8080');
            console.log('\n💡 Now:');
            console.log('1. Open http://localhost:8080 in your browser');
            console.log('2. Open a file in code-server');
            console.log('3. Switch between files');
            console.log('4. Watch the console output for communication logs');
            resolve(codeServer);
        }, 3000);
    });
}

// Start the debug session
async function startDebugSession() {
    try {
        const codeServer = await startCodeServerWithDebug();
        
        console.log('\n🎯 Debug Session Active');
        console.log('================================');
        console.log('📋 What to look for:');
        console.log('   - File open/close events');
        console.log('   - Document change notifications');
        console.log('   - WebSocket message exchanges');
        console.log('   - Extension host communication');
        console.log('   - Workspace file operations');
        
        // Keep the process running
        process.on('SIGINT', () => {
            console.log('\n🛑 Stopping debug session...');
            codeServer.kill();
            process.exit(0);
        });
        
        console.log('\n💡 Press Ctrl+C to stop the debug session');
        
    } catch (error) {
        console.error('❌ Debug session failed:', error);
        process.exit(1);
    }
}

startDebugSession(); 