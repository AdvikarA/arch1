const { spawn } = require('child_process');
const fs = require('fs');

console.log('🧪 Testing SSH Extension with Local SSH Connection\n');

// Check if SSH server is running locally
function checkSSHServer() {
    return new Promise((resolve) => {
        const ssh = spawn('ssh', ['-o', 'ConnectTimeout=5', 'localhost', 'echo', 'SSH working'], {
            stdio: 'pipe'
        });
        
        ssh.on('close', (code) => {
            resolve(code === 0);
        });
        
        ssh.on('error', () => {
            resolve(false);
        });
    });
}

// Start code-server locally
async function startCodeServer() {
    console.log('Starting code-server locally...');
    
    return new Promise((resolve, reject) => {
        const codeServer = spawn('/opt/homebrew/bin/code-server', [
            '--port', '8080',
            '--host', '0.0.0.0',
            '--auth', 'none'
        ], {
            stdio: 'pipe'
        });
        
        codeServer.stdout.on('data', (data) => {
            console.log('code-server:', data.toString());
        });
        
        codeServer.stderr.on('data', (data) => {
            console.log('code-server stderr:', data.toString());
        });
        
        codeServer.on('error', (error) => {
            console.error('Failed to start code-server:', error);
            reject(error);
        });
        
        setTimeout(() => {
            console.log('✅ code-server started on port 8080');
            resolve(codeServer);
        }, 3000);
    });
}

// Test the extension with local connection
async function testLocalConnection() {
    try {
        // Check SSH server
        const sshAvailable = await checkSSHServer();
        if (!sshAvailable) {
            console.log('⚠️  Local SSH server not available');
            console.log('   You can still test the extension with remote servers');
        } else {
            console.log('✅ Local SSH server available');
        }
        
        // Start code-server
        const codeServer = await startCodeServer();
        
        console.log('\n🎉 Local test environment ready!');
        console.log('================================');
        console.log('🌐 code-server URL: http://localhost:8080');
        console.log('\n📋 To test your extension:');
        console.log('1. Open VS Code and press F5 to launch Extension Development Host');
        console.log('2. Run "Connect via SSH" command');
        console.log('3. Use these connection details:');
        console.log('   - Host: localhost');
        console.log('   - Port: 22');
        console.log('   - User: your local username');
        console.log('   - code-server port: 8080');
        
        console.log('\n💡 Alternative: Use ngrok to simulate remote connection');
        console.log('   Run: node setup-ngrok-test.js');
        
        // Keep code-server running
        process.on('SIGINT', () => {
            console.log('\n🛑 Shutting down code-server...');
            codeServer.kill();
            process.exit(0);
        });
        
        console.log('\n💡 Press Ctrl+C to stop code-server');
        
    } catch (error) {
        console.error('❌ Test setup failed:', error);
        process.exit(1);
    }
}

testLocalConnection(); 