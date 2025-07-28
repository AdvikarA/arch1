#!/usr/bin/env node

const { spawn } = require('child_process');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function askQuestion(question) {
    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            resolve(answer);
        });
    });
}

async function main() {
    console.log('🔗 SSH Code-Server Connection Tool');
    console.log('=====================================\n');
    
    // Get connection details
    const host = await askQuestion('Enter SSH host (default: localhost): ') || 'localhost';
    const user = await askQuestion('Enter SSH user (optional): ') || '';
    const port = await askQuestion('Enter SSH port (default: 22): ') || '22';
    const codeServerPort = await askQuestion('Enter code-server port (default: 8080): ') || '8080';
    
    console.log(`\n🚀 Connecting to: ${user ? user + '@' : ''}${host}:${port}`);
    console.log(`📡 Code-server will be available on: http://localhost:${codeServerPort}\n`);
    
    // Build SSH command
    const sshArgs = [
        '-t', // Force pseudo-terminal allocation
        '-L', `${codeServerPort}:localhost:${codeServerPort}`, // Port forwarding
        '-o', 'StrictHostKeyChecking=no',
        '-o', 'UserKnownHostsFile=/dev/null'
    ];
    
    const sshCommand = `${user ? user + '@' : ''}${host}`;
    sshArgs.push(sshCommand);
    
    // Command to run on remote: start code-server
    const remoteCommand = `code-server --port ${codeServerPort} --host 0.0.0.0 --auth none`;
    sshArgs.push(remoteCommand);
    
    console.log(`🔗 SSH Command: ssh ${sshArgs.join(' ')}\n`);
    
    // Start SSH process
    const sshProcess = spawn('ssh', sshArgs);
    
    sshProcess.stdout.on('data', (data) => {
        console.log('SSH:', data.toString());
    });
    
    sshProcess.stderr.on('data', (data) => {
        console.log('SSH:', data.toString());
    });
    
    sshProcess.on('close', (code) => {
        console.log(`\n📊 SSH connection closed with code: ${code}`);
        rl.close();
    });
    
    sshProcess.on('error', (error) => {
        console.log('❌ SSH error:', error.message);
        rl.close();
    });
    
    // Handle Ctrl+C gracefully
    process.on('SIGINT', () => {
        console.log('\n🛑 Stopping SSH connection...');
        sshProcess.kill();
        rl.close();
        process.exit(0);
    });
    
    console.log('✅ SSH connection started!');
    console.log('📝 Press Ctrl+C to stop the connection\n');
}

main().catch(console.error); 