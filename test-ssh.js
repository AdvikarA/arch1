const { spawn } = require('child_process');

// Test the SSH connection logic from the extension
function parseAuthority(authority) {
  // Remove the ssh-remote+ prefix
  const authorityPart = authority.replace('ssh-remote+', '');
  
  // Parse user@host:port format
  const atIndex = authorityPart.indexOf('@');
  const colonIndex = authorityPart.lastIndexOf(':');
  
  let user = '';
  let host = authorityPart;
  let port = 22; // Default SSH port
  let codeServerPort = 8080; // Default code-server port
  
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
      // Remove the port part from host
      host = authorityPart.substring(0, colonIndex);
      if (atIndex > 0) {
        host = authorityPart.substring(atIndex + 1, colonIndex);
      }
    } else {
      port = parseInt(portPart, 10);
      // Remove the port part from host
      host = authorityPart.substring(0, colonIndex);
      if (atIndex > 0) {
        host = authorityPart.substring(atIndex + 1, colonIndex);
      }
    }
  }
  
  return {
    host,
    user,
    port,
    codeServerPort
  };
}

// Test cases
const testCases = [
  'ssh-remote+localhost:22,8080',
  'ssh-remote+user@localhost:22,8080',
  'ssh-remote+user@example.com:2222,9000',
  'ssh-remote+example.com:22,8080'
];

console.log('Testing SSH authority parsing:');
testCases.forEach(testCase => {
  const config = parseAuthority(testCase);
  console.log(`\nInput: ${testCase}`);
  console.log(`Parsed:`, config);
});

// Test SSH connection (local test)
console.log('\n\nTesting SSH connection to localhost...');

const config = parseAuthority('ssh-remote+localhost:22,8080');
const sshArgs = [
  '-t', // Force pseudo-terminal allocation
  '-L', `${config.codeServerPort}:localhost:${config.codeServerPort}`, // Port forwarding
  '-o', 'StrictHostKeyChecking=no',
  '-o', 'UserKnownHostsFile=/dev/null',
  'localhost',
  'echo "SSH connection test successful"'
];

console.log(`SSH command: ssh ${sshArgs.join(' ')}`);

const sshProcess = spawn('ssh', sshArgs);

sshProcess.stdout.on('data', (data) => {
  console.log('SSH stdout:', data.toString());
});

sshProcess.stderr.on('data', (data) => {
  console.log('SSH stderr:', data.toString());
});

sshProcess.on('close', (code) => {
  console.log(`SSH process exited with code ${code}`);
  if (code === 0) {
    console.log('✅ SSH connection test passed!');
  } else {
    console.log('❌ SSH connection test failed!');
  }
});

sshProcess.on('error', (error) => {
  console.error('SSH process error:', error);
}); 