const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Setting up ngrok for SSH extension testing...\n');

// Check if ngrok is installed
function checkNgrok() {
    return new Promise((resolve) => {
        const ngrok = spawn('ngrok', ['version'], { stdio: 'pipe' });
        ngrok.on('close', (code) => {
            resolve(code === 0);
        });
    });
}

// Start ngrok tunnel for SSH
async function startNgrokSSH() {
    console.log('1. Starting ngrok SSH tunnel...');
    
    return new Promise((resolve, reject) => {
        // Start ngrok on SSH port 22
        const ngrok = spawn('ngrok', ['tcp', '22'], { 
            stdio: ['pipe', 'pipe', 'pipe']
        });
        
        let tunnelUrl = '';
        
        ngrok.stdout.on('data', (data) => {
            const output = data.toString();
            console.log('ngrok output:', output);
            
            // Parse ngrok URL
            const match = output.match(/tcp:\/\/([^:]+):(\d+)/);
            if (match) {
                tunnelUrl = `tcp://${match[1]}:${match[2]}`;
                console.log(`✅ ngrok tunnel established: ${tunnelUrl}`);
                resolve({ ngrok, tunnelUrl });
            }
        });
        
        ngrok.stderr.on('data', (data) => {
            console.log('ngrok stderr:', data.toString());
        });
        
        ngrok.on('error', (error) => {
            console.error('❌ Failed to start ngrok:', error);
            reject(error);
        });
        
        // Timeout after 10 seconds
        setTimeout(() => {
            if (!tunnelUrl) {
                ngrok.kill();
                reject(new Error('Timeout waiting for ngrok tunnel'));
            }
        }, 10000);
    });
}

// Start code-server locally
async function startCodeServer() {
    console.log('\n2. Starting code-server locally...');
    
    return new Promise((resolve, reject) => {
        // Start code-server on port 8080
        const codeServer = spawn('/architect/code-server', [
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
            console.error('❌ Failed to start code-server:', error);
            reject(error);
        });
        
        // Wait a moment for code-server to start
        setTimeout(() => {
            console.log('✅ code-server started on port 8080');
            resolve(codeServer);
        }, 3000);
    });
}

// Main setup function
async function setupTestEnvironment() {
    try {
        // Check if ngrok is available
        const ngrokAvailable = await checkNgrok();
        if (!ngrokAvailable) {
            console.error('❌ ngrok is not installed or not in PATH');
            console.log('Please install ngrok: https://ngrok.com/download');
            process.exit(1);
        }
        
        console.log('✅ ngrok is available');
        
        // Start ngrok tunnel
        const { ngrok, tunnelUrl } = await startNgrokSSH();
        
        // Start code-server
        const codeServer = await startCodeServer();
        
        console.log('\n🎉 Test environment setup complete!');
        console.log('=====================================');
        console.log(`📡 ngrok SSH tunnel: ${tunnelUrl}`);
        console.log('🌐 code-server URL: http://localhost:8080');
        console.log('\n📋 To test your extension:');
        console.log('1. Open VS Code and press F5 to launch Extension Development Host');
        console.log('2. Run "Connect via SSH" command');
        console.log('3. Use these connection details:');
        console.log(`   - Host: ${tunnelUrl.split('://')[1].split(':')[0]}`);
        console.log(`   - Port: ${tunnelUrl.split(':')[2]}`);
        console.log('   - User: your local username');
        console.log('   - code-server port: 8080');
        
        console.log('\n⚠️  Note: You may need to accept the SSH connection on your local machine');
        console.log('   The extension will connect to your local SSH server through ngrok');
        
        // Keep processes running
        process.on('SIGINT', () => {
            console.log('\n🛑 Shutting down test environment...');
            ngrok.kill();
            codeServer.kill();
            process.exit(0);
        });
        
        console.log('\n💡 Press Ctrl+C to stop the test environment');
        
    } catch (error) {
        console.error('❌ Setup failed:', error);
        process.exit(1);
    }
}

setupTestEnvironment(); 