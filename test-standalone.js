#!/usr/bin/env node

const { spawn } = require('child_process');

// Simulate the SSH connection logic from our extension
async function testSSHConnection(host, user, port, codeServerPort) {
    console.log(`\n🧪 Testing SSH Connection:`);
    console.log(`   Host: ${host}`);
    console.log(`   User: ${user || 'default'}`);
    console.log(`   SSH Port: ${port}`);
    console.log(`   Code-server Port: ${codeServerPort}`);
    
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
    
    console.log(`\n🔗 SSH Command: ssh ${sshArgs.join(' ')}`);
    
    return new Promise((resolve, reject) => {
        const sshProcess = spawn('ssh', sshArgs);
        
        let stdout = '';
        let stderr = '';
        
        sshProcess.stdout.on('data', (data) => {
            stdout += data.toString();
            console.log('SSH stdout:', data.toString());
        });
        
        sshProcess.stderr.on('data', (data) => {
            stderr += data.toString();
            console.log('SSH stderr:', data.toString());
        });
        
        sshProcess.on('close', (code) => {
            console.log(`\n📊 SSH Process exited with code: ${code}`);
            if (code === 0) {
                console.log('✅ SSH connection successful!');
                resolve({ success: true, stdout, stderr });
            } else {
                console.log('❌ SSH connection failed!');
                resolve({ success: false, stdout, stderr, code });
            }
        });
        
        sshProcess.on('error', (error) => {
            console.log('❌ SSH process error:', error.message);
            reject(error);
        });
        
        // Give it some time to establish connection
        setTimeout(() => {
            console.log('\n⏱️  Connection timeout - this is expected for testing');
            sshProcess.kill();
        }, 5000);
    });
}

// Test different scenarios
async function runTests() {
    console.log('🚀 Starting SSH Connection Tests\n');
    
    const tests = [
        { host: 'localhost', user: '', port: 22, codeServerPort: 8080 },
        { host: 'localhost', user: 'advikar', port: 22, codeServerPort: 8082 },
        { host: '127.0.0.1', user: '', port: 22, codeServerPort: 8080 }
    ];
    
    for (const test of tests) {
        try {
            await testSSHConnection(test.host, test.user, test.port, test.codeServerPort);
            console.log('\n' + '='.repeat(50) + '\n');
        } catch (error) {
            console.log('❌ Test failed:', error.message);
        }
    }
    
    console.log('🎉 All tests completed!');
}

// Run the tests
runTests().catch(console.error); 