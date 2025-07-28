const { spawn } = require('child_process');
const fs = require('fs');

console.log('🔍 Setting up VS Code ↔ Code-server communication test...\n');

// Start code-server with detailed logging
function startCodeServerWithLogging() {
    return new Promise((resolve, reject) => {
        console.log('Starting code-server with detailed logging...');
        
        const codeServer = spawn('/opt/homebrew/bin/code-server', [
            '--port', '8080',
            '--host', '0.0.0.0',
            '--auth', 'none',
            '--log', 'trace',
            '--verbose'
        ], {
            stdio: 'pipe',
            env: {
                ...process.env,
                'VSCODE_LOG_LEVEL': 'trace',
                'VSCODE_VERBOSE_LOGGING': 'true'
            }
        });
        
        codeServer.stdout.on('data', (data) => {
            const output = data.toString();
            
            // Look for VS Code communication patterns
            if (output.includes('textDocument') || output.includes('workspace') || output.includes('document')) {
                console.log('📁 VS CODE FILE OPERATION:', output);
            }
            
            if (output.includes('jsonrpc') || output.includes('method')) {
                console.log('🌐 JSON-RPC MESSAGE:', output);
            }
            
            if (output.includes('ssh') || output.includes('remote')) {
                console.log('🔗 SSH/REMOTE COMMUNICATION:', output);
            }
            
            // General logging
            console.log('code-server:', output);
        });
        
        codeServer.stderr.on('data', (data) => {
            const output = data.toString();
            console.log('code-server stderr:', output);
        });
        
        codeServer.on('error', (error) => {
            console.error('Failed to start code-server:', error);
            reject(error);
        });
        
        setTimeout(() => {
            console.log('✅ Code-server started with detailed logging');
            resolve(codeServer);
        }, 3000);
    });
}

// Test VS Code extension communication
function testVSCodeCommunication() {
    console.log('\n🧪 Testing VS Code Extension Communication');
    console.log('==========================================');
    console.log('📋 Steps to test:');
    console.log('1. Open VS Code and press F5 to launch Extension Development Host');
    console.log('2. Run "Connect via SSH" command');
    console.log('3. Enter: localhost, advikar, 22, 8080');
    console.log('4. When connected, switch files in VS Code');
    console.log('5. Watch this terminal for communication logs');
    console.log('\n💡 Expected communication:');
    console.log('   - VS Code sends file open requests via SSH');
    console.log('   - Code-server responds with file content');
    console.log('   - File change notifications');
    console.log('   - Workspace updates');
}

// Main function
async function setupVSCodeCommunicationTest() {
    try {
        // Start code-server
        const codeServer = await startCodeServerWithLogging();
        
        // Show test instructions
        testVSCodeCommunication();
        
        console.log('\n🎯 VS Code Communication Test Ready');
        console.log('==================================');
        console.log('🌐 Code-server: http://localhost:8080');
        console.log('📊 Watch this terminal for communication logs');
        console.log('\n💡 Now:');
        console.log('1. Open VS Code and launch Extension Development Host');
        console.log('2. Connect via SSH to localhost:8080');
        console.log('3. Switch files in VS Code');
        console.log('4. Watch for communication messages here');
        
        // Keep the process running
        process.on('SIGINT', () => {
            console.log('\n🛑 Stopping VS Code communication test...');
            codeServer.kill();
            process.exit(0);
        });
        
        console.log('\n💡 Press Ctrl+C to stop the test');
        
    } catch (error) {
        console.error('❌ VS Code communication test failed:', error);
        process.exit(1);
    }
}

setupVSCodeCommunicationTest(); 