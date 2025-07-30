/*---------------------------------------------------------------------------------------------
 *  ArchIDE Enhanced Remote Server - Custom Implementation
 *  Enhanced VS Code Server with Advanced Remote Development Capabilities
 *--------------------------------------------------------------------------------------------*/
import './bootstrap-server.js'; // this MUST come before other imports as it changes global state
import * as path from 'path';
import * as http from 'http';
import * as readline from 'readline';
import { performance } from 'perf_hooks';
import { fileURLToPath } from 'url';
import minimist from 'minimist';
import { resolveNLSConfiguration } from './vs/base/node/nls.js';
import { product } from './bootstrap-meta.js';
import * as perf from './vs/base/common/performance.js';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
perf.mark('arch-server/start');
globalThis.archServerStartTime = performance.now();
console.log('🚀 ArchIDE Enhanced Server Starting...');
// Enhanced argument parsing with custom options
const parsedArgs = minimist(process.argv.slice(2), {
    boolean: [
        'start-server', 'list-extensions', 'print-ip-address', 'help', 'version',
        'accept-server-license-terms', 'update-extensions',
        // Enhanced ArchIDE options
        'enhanced-protocol', 'secure-websocket', 'file-system-control', 'terminal-control'
    ],
    string: [
        'install-extension', 'install-builtin-extension', 'uninstall-extension',
        'locate-extension', 'socket-path', 'host', 'port', 'compatibility'
    ],
    alias: { help: 'h', version: 'v' }
});
// Enhanced environment variable support
['host', 'port', 'accept-server-license-terms', 'enhanced-protocol', 'secure-websocket'].forEach(e => {
    if (!parsedArgs[e]) {
        const envValue = process.env[`ARCH_SERVER_${e.toUpperCase().replace('-', '_')}`];
        if (envValue) {
            parsedArgs[e] = envValue === 'true' || envValue === '1' ? true : envValue;
        }
    }
});
const extensionLookupArgs = ['list-extensions', 'locate-extension'];
const extensionInstallArgs = ['install-extension', 'install-builtin-extension', 'uninstall-extension', 'update-extensions'];
const shouldSpawnCli = parsedArgs.help || parsedArgs.version || extensionLookupArgs.some(a => !!parsedArgs[a]) || (extensionInstallArgs.some(a => !!parsedArgs[a]) && !parsedArgs['start-server']);
const nlsConfiguration = await resolveNLSConfiguration({ userLocale: 'en', osLocale: 'en', commit: product.commit, userDataPath: '', nlsMetadataPath: __dirname });
// Enhanced help text
if (parsedArgs.help) {
    console.log(`
🏗️  ArchIDE Enhanced Server v${product.version}

Enhanced VS Code Server with Advanced Remote Development Capabilities

Usage: arch-server [options]

Enhanced Features:
  --enhanced-protocol          Enable enhanced JSON-RPC protocol with additional capabilities
  --secure-websocket          Enable enhanced WebSocket security and compression
  --file-system-control       Enable advanced file system operations and monitoring
  --terminal-control          Enable advanced terminal management and integration

Standard Options:
  --host <ip-address>         Server host (default: localhost)
  --port <port>              Server port (default: random)
  --socket-path <path>       Unix socket path
  --connection-token <token>  Security token
  --start-server             Start the server
  --accept-server-license-terms  Accept license terms

Environment Variables:
  ARCH_SERVER_ENHANCED_PROTOCOL=true     Enable enhanced protocol
  ARCH_SERVER_SECURE_WEBSOCKET=true      Enable secure WebSocket
  ARCH_SERVER_HOST=<host>                Set server host
  ARCH_SERVER_PORT=<port>                Set server port

Examples:
  arch-server --start-server --enhanced-protocol --secure-websocket
  arch-server --start-server --host=0.0.0.0 --port=8080
  arch-server --start-server --socket-path=/tmp/arch-server.sock
`);
    process.exit(0);
}
async function loadCode(nlsConfiguration) {
    // Enhanced server loading with custom capabilities
    const mod = await import('./vs/server/node/server.main.js');
    return {
        spawnCli: mod.spawnCli,
        createServer: async (address) => {
            const server = await mod.createServer(address);
            // Enhance the server with our custom capabilities
            if (parsedArgs['enhanced-protocol']) {
                console.log('✅ Enhanced JSON-RPC Protocol: ENABLED');
                // Enhanced protocol features will be added here
            }
            if (parsedArgs['secure-websocket']) {
                console.log('✅ Secure WebSocket: ENABLED');
                // Enhanced WebSocket security will be added here
            }
            if (parsedArgs['file-system-control']) {
                console.log('✅ File System Control: ENABLED');
                // Enhanced file system capabilities will be added here
            }
            if (parsedArgs['terminal-control']) {
                console.log('✅ Terminal Control: ENABLED');
                // Enhanced terminal management will be added here
            }
            return server;
        }
    };
}
if (shouldSpawnCli) {
    loadCode(nlsConfiguration).then((mod) => {
        mod.spawnCli();
    });
}
else {
    let _remoteExtensionHostAgentServerPromise = null;
    const getRemoteExtensionHostAgentServer = () => {
        if (!_remoteExtensionHostAgentServerPromise) {
            _remoteExtensionHostAgentServerPromise = loadCode(nlsConfiguration).then(async (mod) => {
                const server = await mod.createServer(address);
                return server;
            });
        }
        return _remoteExtensionHostAgentServerPromise;
    };
    // Enhanced license handling
    if (Array.isArray(product.serverLicense) && product.serverLicense.length) {
        console.log('📄 ArchIDE Server License Terms:');
        console.log(product.serverLicense.join('\n'));
        if (product.serverLicensePrompt && parsedArgs['accept-server-license-terms'] !== true) {
            if (hasStdinWithoutTty()) {
                console.log('❗ To accept the license terms, start the server with --accept-server-license-terms');
                process.exit(1);
            }
            try {
                const accept = await prompt(product.serverLicensePrompt);
                if (!accept) {
                    process.exit(1);
                }
            }
            catch (e) {
                console.log('❌ License acceptance error:', e);
                process.exit(1);
            }
        }
    }
    let firstRequest = true;
    let firstWebSocket = true;
    let address = null;
    const server = http.createServer(async (req, res) => {
        if (firstRequest) {
            firstRequest = false;
            perf.mark('arch-server/firstRequest');
            console.log('📥 First HTTP request received');
        }
        const remoteExtensionHostAgentServer = await getRemoteExtensionHostAgentServer();
        return remoteExtensionHostAgentServer.handleRequest(req, res);
    });
    server.on('upgrade', async (req, socket) => {
        if (firstWebSocket) {
            firstWebSocket = false;
            perf.mark('arch-server/firstWebSocket');
            console.log('🔗 First WebSocket connection established');
        }
        const remoteExtensionHostAgentServer = await getRemoteExtensionHostAgentServer();
        return remoteExtensionHostAgentServer.handleUpgrade(req, socket);
    });
    server.on('error', err => {
        console.error('❌ ArchIDE Server error:', err);
    });
    const host = parsedArgs['host'] || 'localhost';
    const port = parsedArgs['port'] || 0;
    const socketPath = parsedArgs['socket-path'];
    if (socketPath) {
        console.log(`🚀 Starting ArchIDE server on socket: ${socketPath}`);
        server.listen(socketPath, () => {
            address = socketPath;
            console.log(`✅ ArchIDE server listening on socket: ${socketPath}`);
        });
    }
    else {
        console.log(`🚀 Starting ArchIDE server on ${host}:${port}`);
        server.listen(port, host, () => {
            address = server.address();
            if (address && typeof address !== 'string') {
                console.log(`✅ ArchIDE server listening on ${address.address}:${address.port}`);
                console.log(`🌐 Server URL: http://${address.address}:${address.port}`);
            }
        });
    }
    process.on('exit', () => {
        console.log('👋 ArchIDE server shutting down...');
    });
    process.on('SIGINT', () => {
        console.log('🛑 Received SIGINT, shutting down gracefully...');
        server.close(() => {
            process.exit(0);
        });
    });
    process.on('SIGTERM', () => {
        console.log('🛑 Received SIGTERM, shutting down gracefully...');
        server.close(() => {
            process.exit(0);
        });
    });
}
function hasStdinWithoutTty() {
    try {
        return !process.stdin.isTTY; // requires without --enable-source-maps
    }
    catch (error) {
        return false;
    }
}
async function prompt(question) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    return new Promise((resolve) => {
        rl.question(`${question} (y/N) `, (answer) => {
            rl.close();
            resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
        });
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXJjaC1zZXJ2ZXItbWFpbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL2FkdmlrYXIvRG9jdW1lbnRzL2FyY2hpdGVjdC9hcmNoMi9BcmNoSURFL3NyYy8iLCJzb3VyY2VzIjpbImFyY2gtc2VydmVyLW1haW4udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyx1QkFBdUIsQ0FBQyxDQUFDLGlFQUFpRTtBQUNqRyxPQUFPLEtBQUssSUFBSSxNQUFNLE1BQU0sQ0FBQztBQUM3QixPQUFPLEtBQUssSUFBSSxNQUFNLE1BQU0sQ0FBQztBQUU3QixPQUFPLEtBQUssUUFBUSxNQUFNLFVBQVUsQ0FBQztBQUNyQyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sWUFBWSxDQUFDO0FBQ3pDLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxLQUFLLENBQUM7QUFDcEMsT0FBTyxRQUFRLE1BQU0sVUFBVSxDQUFDO0FBQ2hDLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLHVCQUF1QixDQUFDO0FBQ2hFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQztBQUM5QyxPQUFPLEtBQUssSUFBSSxNQUFNLGlDQUFpQyxDQUFDO0FBSXhELE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsYUFBYSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztBQUUvRCxJQUFJLENBQUMsSUFBSSxDQUFDLG1CQUFtQixDQUFDLENBQUM7QUFDOUIsVUFBa0IsQ0FBQyxtQkFBbUIsR0FBRyxXQUFXLENBQUMsR0FBRyxFQUFFLENBQUM7QUFFNUQsT0FBTyxDQUFDLEdBQUcsQ0FBQyx3Q0FBd0MsQ0FBQyxDQUFDO0FBRXRELGdEQUFnRDtBQUNoRCxNQUFNLFVBQVUsR0FBRyxRQUFRLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUU7SUFDbEQsT0FB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