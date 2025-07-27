const { spawn } = require('child_process');
const fs = require('fs');

console.log('🌐 Setting up network traffic capture...\n');

// Check if mitmproxy is installed
function checkMitmproxy() {
    return new Promise((resolve) => {
        const mitmproxy = spawn('mitmproxy', ['--version'], { stdio: 'pipe' });
        mitmproxy.on('close', (code) => {
            resolve(code === 0);
        });
        mitmproxy.on('error', () => {
            resolve(false);
        });
    });
}

// Start mitmproxy to capture traffic
function startMitmproxy() {
    return new Promise((resolve, reject) => {
        console.log('Starting mitmproxy on port 8081...');
        
        const mitmproxy = spawn('mitmproxy', [
            '-p', '8081',
            '--set', 'confdir=~/.mitmproxy',
            '--set', 'termlog_verbosity=debug',
            '--set', 'flow_detail=3'
        ], {
            stdio: 'pipe'
        });
        
        mitmproxy.stdout.on('data', (data) => {
            const output = data.toString();
            console.log('mitmproxy:', output);
            
            // Look for code-server traffic
            if (output.includes('localhost:8080') || output.includes('code-server')) {
                console.log('🎯 CODE-SERVER TRAFFIC DETECTED:', output);
            }
        });
        
        mitmproxy.stderr.on('data', (data) => {
            console.log('mitmproxy stderr:', data.toString());
        });
        
        mitmproxy.on('error', (error) => {
            console.error('Failed to start mitmproxy:', error);
            reject(error);
        });
        
        setTimeout(() => {
            console.log('✅ mitmproxy started on port 8081');
            resolve(mitmproxy);
        }, 2000);
    });
}

// Start code-server with proxy
function startCodeServerWithProxy() {
    return new Promise((resolve, reject) => {
        console.log('Starting code-server with proxy...');
        
        const codeServer = spawn('/opt/homebrew/bin/code-server', [
            '--port', '8080',
            '--host', '0.0.0.0',
            '--auth', 'none'
        ], {
            stdio: 'pipe',
            env: {
                ...process.env,
                'HTTP_PROXY': 'http://localhost:8081',
                'HTTPS_PROXY': 'http://localhost:8081'
            }
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
            console.log('✅ Code-server started with proxy');
            resolve(codeServer);
        }, 3000);
    });
}

// Main function
async function captureNetworkTraffic() {
    try {
        // Check if mitmproxy is available
        const mitmproxyAvailable = await checkMitmproxy();
        if (!mitmproxyAvailable) {
            console.log('❌ mitmproxy is not installed');
            console.log('💡 Install it with: brew install mitmproxy');
            console.log('💡 Or use the debug logging method instead');
            return;
        }
        
        console.log('✅ mitmproxy is available');
        
        // Start mitmproxy
        const mitmproxy = await startMitmproxy();
        
        // Start code-server
        const codeServer = await startCodeServerWithProxy();
        
        console.log('\n🎯 Network Capture Active');
        console.log('==========================');
        console.log('📊 mitmproxy: http://localhost:8081');
        console.log('🌐 code-server: http://localhost:8080');
        console.log('\n📋 To capture traffic:');
        console.log('1. Open http://localhost:8081 in browser (mitmproxy interface)');
        console.log('2. Open http://localhost:8080 in browser (code-server)');
        console.log('3. Switch files in code-server');
        console.log('4. Watch the mitmproxy interface for traffic');
        
        // Keep processes running
        process.on('SIGINT', () => {
            console.log('\n🛑 Stopping network capture...');
            mitmproxy.kill();
            codeServer.kill();
            process.exit(0);
        });
        
        console.log('\n💡 Press Ctrl+C to stop the capture');
        
    } catch (error) {
        console.error('❌ Network capture failed:', error);
        process.exit(1);
    }
}

captureNetworkTraffic(); 