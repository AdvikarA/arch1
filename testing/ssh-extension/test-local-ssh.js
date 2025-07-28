const { spawn } = require('child_process');

// Test SSH connection to localhost (simulating remote server)
async function testLocalSSH() {
  console.log('🧪 Testing SSH Extension with Localhost\n');
  
  // Test 1: Parse authority correctly
  function parseAuthority(authority) {
    const authorityPart = authority.replace('ssh-remote+', '');
    const atIndex = authorityPart.indexOf('@');
    const colonIndex = authorityPart.lastIndexOf(':');
    
    let user = '';
    let host = authorityPart;
    let port = 22;
    let codeServerPort = 8080;
    
    if (atIndex > 0) {
      user = authorityPart.substring(0, atIndex);
      host = authorityPart.substring(atIndex + 1);
    }
    
    if (colonIndex > atIndex) {
      const portPart = authorityPart.substring(colonIndex + 1);
      const ports = portPart.split(',');
      if (ports.length >= 2) {
        port = parseInt(ports[0], 10);
        codeServerPort = parseInt(ports[1], 10);
        host = authorityPart.substring(0, colonIndex);
        if (atIndex > 0) {
          host = authorityPart.substring(atIndex + 1, colonIndex);
        }
      } else {
        port = parseInt(portPart, 10);
        host = authorityPart.substring(0, colonIndex);
        if (atIndex > 0) {
          host = authorityPart.substring(atIndex + 1, colonIndex);
        }
      }
    }
    
    return { host, user, port, codeServerPort };
  }
  
  // Test authority parsing
  const testCases = [
    'ssh-remote+localhost:22,8080',
    'ssh-remote+user@localhost:22,8080',
    'ssh-remote+user@localhost:2222,9000'
  ];
  
  console.log('✅ Authority parsing tests:');
  testCases.forEach(testCase => {
    const config = parseAuthority(testCase);
    console.log(`  ${testCase} -> ${JSON.stringify(config)}`);
  });
  
  // Test 2: Simulate SSH connection to localhost
  console.log('\n🔌 Testing SSH connection to localhost...');
  
  const config = parseAuthority('ssh-remote+localhost:22,8080');
  
  // Build SSH command
  const sshArgs = [
    '-t',
    '-L', `${config.codeServerPort}:localhost:${config.codeServerPort}`,
    '-o', 'StrictHostKeyChecking=no',
    '-o', 'UserKnownHostsFile=/dev/null',
    'localhost',
    'echo "SSH connection test successful"'
  ];
  
  console.log(`SSH command: ssh ${sshArgs.join(' ')}`);
  
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
      console.log(`\nSSH process exited with code ${code}`);
      
      if (code === 0) {
        console.log('✅ SSH connection test passed!');
        console.log('\n🎉 Extension is ready for testing!');
        console.log('\nTo test the full extension:');
        console.log('1. Open VS Code with: code --extensionDevelopmentPath=$(pwd) --new-window');
        console.log('2. Use Command Palette (Cmd+Shift+P) and run: "SSH Resolver: Connect"');
        console.log('3. Enter: localhost as host, your username, 22 as SSH port, 8080 as code-server port');
        resolve();
      } else {
        console.log('❌ SSH connection test failed!');
        console.log('This is expected if SSH server is not running on localhost:22');
        console.log('\nTo enable SSH server on macOS:');
        console.log('sudo launchctl load -w /System/Library/LaunchDaemons/ssh.plist');
        reject(new Error(`SSH process exited with code ${code}`));
      }
    });
    
    sshProcess.on('error', (error) => {
      console.error('SSH process error:', error.message);
      reject(error);
    });
  });
}

testLocalSSH().catch(console.error); 