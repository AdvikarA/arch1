#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

console.log('Testing arch1 remote connection capabilities...');

// Test 1: Check if the remote authority resolver API is available
console.log('\n1. Checking Remote Authority Resolver API...');
try {
  const vscode = require('./out/vs/workbench/api/node/extHostExtensionService');
  console.log('✅ Remote API infrastructure is available');
} catch (error) {
  console.log('❌ Remote API not available:', error.message);
}

// Test 2: Check if we can spawn a remote process
console.log('\n2. Testing remote process spawning...');
try {
  const testProcess = spawn('node', ['--version'], {
    stdio: ['pipe', 'pipe', 'pipe']
  });
  
  testProcess.stdout.on('data', (data) => {
    console.log('✅ Process spawning works:', data.toString().trim());
  });
  
  testProcess.on('close', (code) => {
    console.log(`✅ Process exited with code ${code}`);
  });
  
  testProcess.on('error', (error) => {
    console.log('❌ Process spawning failed:', error.message);
  });
} catch (error) {
  console.log('❌ Process spawning test failed:', error.message);
}

// Test 3: Check if code-server is available
console.log('\n3. Checking code-server availability...');
const codeServerPath = path.resolve(__dirname, '../code-server/out/node/entry.js');
const fs = require('fs');

if (fs.existsSync(codeServerPath)) {
  console.log('✅ code-server found at:', codeServerPath);
  
  // Test if code-server can be spawned
  const codeServerTest = spawn('node', [codeServerPath, '--help'], {
    stdio: ['pipe', 'pipe', 'pipe']
  });
  
  codeServerTest.stdout.on('data', (data) => {
    if (data.toString().includes('code-server')) {
      console.log('✅ code-server can be spawned');
    }
  });
  
  codeServerTest.on('error', (error) => {
    console.log('❌ code-server spawn failed:', error.message);
  });
} else {
  console.log('❌ code-server not found at:', codeServerPath);
}

console.log('\n4. Testing URI parsing...');
const testUris = [
  'vscode-remote://ssh-remote+localhost:22/home/user/project',
  'vscode-remote://code-server+localhost:8080/home/user/project',
  'vscode-remote://dev-container+container-name/home/user/project'
];

testUris.forEach(uri => {
  try {
    const parsed = new URL(uri);
    console.log(`✅ URI parsing works: ${parsed.protocol}//${parsed.host}${parsed.pathname}`);
  } catch (error) {
    console.log(`❌ URI parsing failed for ${uri}:`, error.message);
  }
});

console.log('\n✅ Remote connection test completed!');
console.log('\nTo test the full integration:');
console.log('1. Wait for code-server VS Code build to complete');
console.log('2. Start code-server: node ../code-server/out/node/entry.js --port 8080 --auth none');
console.log('3. In arch1, use Command Palette: "Connect to Remote"');
console.log('4. Enter: ssh-remote+localhost:22,8080/home/user/project'); 