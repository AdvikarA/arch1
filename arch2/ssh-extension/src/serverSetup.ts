import * as crypto from 'crypto';
import Log from './common/logger';
import { getVSCodeServerConfig } from './serverConfig';
import SSHConnection from './ssh/sshConnection';

export interface ServerInstallOptions {
    id: string;
    quality: string;
    commit: string;
    version: string;
    release?: string; // vscodium specific
    extensionIds: string[];
    envVariables: string[];
    useSocketPath: boolean;
    serverApplicationName: string;
    serverDataFolderName: string;
    serverDownloadUrlTemplate: string;
}

export interface ServerInstallResult {
    exitCode: number;
    listeningOn: number | string;
    connectionToken: string;
    logFile: string;
    osReleaseId: string;
    arch: string;
    platform: string;
    tmpDir: string;
    [key: string]: any;
}

export class ServerInstallError extends Error {
    constructor(message: string) {
        super(message);
    }
}

// Function to install and start VS Code server
export async function installCodeServer(conn: SSHConnection, serverDownloadUrlTemplate: string | undefined, extensionIds: string[], envVariables: string[], platform: string | undefined, useSocketPath: boolean, logger: Log): Promise<ServerInstallResult> {
    let shell = 'bash';

    // detect platform and shell for windows
    if (!platform || platform === 'windows') {
        const result = await conn.exec('uname -s');

        if (result.stdout) {
            const unameOutput = result.stdout.trim();
            if (unameOutput.includes('windows32')) {
                platform = 'windows';
            } else if (unameOutput.includes('MINGW64')) {
                platform = 'windows';
                shell = 'bash';
            } else if (unameOutput.includes('Darwin')) {
                platform = 'darwin';
            } else if (unameOutput.includes('Linux')) {
                platform = 'linux';
            }
        } else if (result.stderr) {
            if (result.stderr.includes('FullyQualifiedErrorId : CommandNotFoundException')) {
                platform = 'windows';
            }

            if (result.stderr.includes('is not recognized as an internal or external command')) {
                platform = 'windows';
                shell = 'cmd';
            }
        }

        if (platform) {
            logger.trace(`Detected platform: ${platform}, ${shell}`);
        }
    }

    // Detect architecture for proper binary selection
    let architecture = 'x64'; // default
    if (platform === 'darwin') {
        const archResult = await conn.exec('uname -m');
        if (archResult.stdout) {
            const arch = archResult.stdout.trim();
            if (arch === 'arm64' || arch === 'aarch64') {
                architecture = 'arm64';
            } else if (arch === 'x86_64') {
                architecture = 'x64';
            }
        }
        logger.trace(`Detected architecture: ${architecture}`);
    }

    const scriptId = crypto.randomBytes(12).toString('hex');

    // Get VS Code server configuration
    const serverConfig = await getVSCodeServerConfig();
    const serverPort = 8080; // Default port

    // Debug logging
    logger.info(`Server config: ${JSON.stringify(serverConfig)}`);
    logger.info(`Server download URL template: ${serverConfig.serverDownloadUrlTemplate}`);
    logger.info(`Platform: ${platform}, Architecture: ${architecture}, Platform suffix: ${platform === 'darwin' ? (architecture === 'arm64' ? 'darwin-arm64' : 'darwin') : platform === 'linux' ? 'linux-x64' : 'linux-x64'}`);

    // Check if VS Code server is already running
    const checkResult = await conn.exec(`lsof -i :${serverPort} || netstat -an | grep :${serverPort} || ss -tuln | grep :${serverPort}`);
    
    if (checkResult.stdout && checkResult.stdout.includes(`:${serverPort}`)) {
        logger.info(`VS Code server is already running on port ${serverPort}`);
        return {
            exitCode: 0,
            listeningOn: serverPort,
            connectionToken: 'vscode-server-token',
            logFile: '/tmp/vscode-server.log',
            osReleaseId: platform || 'linux',
            arch: 'x64',
            platform: platform || 'linux',
            tmpDir: '/tmp'
        };
    }
    
    // Add additional debugging
    logger.info(`Starting server installation process...`);
    logger.info(`Platform: ${platform}, Architecture: ${architecture}`);
    logger.info(`Server port: ${serverPort}, Use socket path: ${useSocketPath}`);

    // Generate script to install and start VS Code server
    logger.info(`Installing server - useSocketPath: ${useSocketPath}, serverPort: ${serverPort}`);
    const installScript = generateVSCodeServerInstallScript(scriptId, serverConfig, serverPort, extensionIds, envVariables, useSocketPath, platform || 'linux', architecture);

    logger.trace('VS Code server install command:', installScript);

    let commandOutput: { stdout: string; stderr: string };
    if (platform === 'windows') {
        // Windows implementation
        const installDir = `$HOME\\vscode-server`;
        const startScript = `${installDir}\\install-vscode-server.ps1`;
        
        let command = '';
        if (shell === 'powershell') {
            command = `md -Force ${installDir}; echo @'\n${installScript}\n'@ | Set-Content ${startScript}; powershell -ExecutionPolicy ByPass -File "${startScript}"`;
        } else {
            command = `mkdir -p ${installDir}; echo '${installScript}' > ${startScript}; bash ${startScript}`;
        }

        commandOutput = await conn.exec(command);
    } else {
        // Linux/macOS implementation
        const installDir = `$HOME/.vscode-server`;
        const startScript = `${installDir}/install-vscode-server.sh`;
        
        // Use heredoc to create the script file
        const command = `mkdir -p ${installDir}; cat > ${startScript} << 'EOF'
${installScript}
EOF
chmod +x ${startScript}; bash ${startScript}`;
        commandOutput = await conn.exec(command);
    }

    const fullOutput = commandOutput.stdout + '\n' + commandOutput.stderr;
    logger.trace(`Full command output: ${fullOutput}`);
    
    // Add more detailed logging
    logger.info(`Command stdout: ${commandOutput.stdout}`);
    logger.info(`Command stderr: ${commandOutput.stderr}`);
    
    const parsedOutput = parseVSCodeServerOutput(fullOutput, scriptId);
    logger.trace(`Parsed output: ${JSON.stringify(parsedOutput)}`);
    
    if (!parsedOutput) {
        logger.error(`Failed to parse server output. Full output: ${fullOutput}`);
        throw new ServerInstallError(`Failed to install VS Code server: ${fullOutput}`);
    }

    // Handle listeningOn field - it can be a port number or socket path
    let listeningOn: number | string;
    const listeningOnValue = parsedOutput.listeningOn || serverPort.toString();
    if (useSocketPath) {
        listeningOn = listeningOnValue; // Keep as string for socket path
    } else {
        listeningOn = parseInt(listeningOnValue); // Convert to number for port
    }
    
    const result = {
        exitCode: parseInt(parsedOutput.exitCode || '0'),
        listeningOn: listeningOn,
        connectionToken: parsedOutput.connectionToken || 'vscode-server-token',
        logFile: parsedOutput.logFile || '/tmp/vscode-server.log',
        osReleaseId: parsedOutput.osReleaseId || platform || 'linux',
        arch: parsedOutput.arch || 'x64',
        platform: parsedOutput.platform || platform || 'linux',
        tmpDir: parsedOutput.tmpDir || '/tmp'
    };
    
    logger.info(`Server installation result: ${JSON.stringify(result)}`);
    return result;
}

function parseVSCodeServerOutput(str: string, scriptId: string): { [k: string]: string } | undefined {
    const lines = str.split('\n');
    const result: { [k: string]: string } = {};

    for (const line of lines) {
        if (line.startsWith(`${scriptId}: `)) {
            const content = line.substring(scriptId.length + 2);
            const [key, ...valueParts] = content.split(': ');
            if (key && valueParts.length > 0) {
                result[key] = valueParts.join(': ');
            }
        }
    }

    // If we found any parsed output, return it
    if (Object.keys(result).length > 0) {
        return result;
    }

    // If no parsed output found, check if we have a successful server startup
    // Look for the key success indicators in the output
    const hasExitCode = str.includes(`${scriptId}: exitCode:0`);
    const hasListeningOn = str.includes(`${scriptId}: listeningOn:`);
    const hasConnectionToken = str.includes(`${scriptId}: connectionToken:`);
    
    if (hasExitCode && hasListeningOn && hasConnectionToken) {
        // Extract the values from the output
        const exitCodeMatch = str.match(new RegExp(`${scriptId}: exitCode:(\\d+)`));
        const listeningOnMatch = str.match(new RegExp(`${scriptId}: listeningOn:(.+)`));
        const connectionTokenMatch = str.match(new RegExp(`${scriptId}: connectionToken:(.+)`));
        const logFileMatch = str.match(new RegExp(`${scriptId}: logFile:(.+)`));
        const osReleaseIdMatch = str.match(new RegExp(`${scriptId}: osReleaseId:(.+)`));
        const archMatch = str.match(new RegExp(`${scriptId}: arch:(.+)`));
        const platformMatch = str.match(new RegExp(`${scriptId}: platform:(.+)`));
        const tmpDirMatch = str.match(new RegExp(`${scriptId}: tmpDir:(.+)`));

        return {
            exitCode: exitCodeMatch ? exitCodeMatch[1] : '0',
            listeningOn: listeningOnMatch ? listeningOnMatch[1].trim() : '8080',
            connectionToken: connectionTokenMatch ? connectionTokenMatch[1] : 'vscode-server-token',
            logFile: logFileMatch ? logFileMatch[1] : '/tmp/vscode-server-logs/server.log',
            osReleaseId: osReleaseIdMatch ? osReleaseIdMatch[1] : 'darwin',
            arch: archMatch ? archMatch[1] : 'arm64',
            platform: platformMatch ? platformMatch[1] : 'darwin',
            tmpDir: tmpDirMatch ? tmpDirMatch[1] : '/tmp'
        };
    }

    return undefined;
}

function generateVSCodeServerInstallScript(scriptId: string, serverConfig: any, serverPort: number, extensionIds: string[], envVariables: string[], useSocketPath: boolean, platform: string, architecture: string): string {
    const envVars = envVariables.map(v => `export ${v}`).join('\n');
    const extensionArgs = extensionIds.map(id => `--install-extension ${id}`).join(' ');
    
    const socketPath = useSocketPath ? '/tmp/vscode-server.sock' : '';
    const listenArg = useSocketPath ? `--socket-path ${socketPath}` : `--port ${serverPort}`;

    // Use the official VS Code server download URL with fallback
    let downloadUrl: string;
    let platformSuffix: string;
    
    // Map platform to VS Code server platform suffix
    // This matches the format used by the official VS Code SSH extension
    if (platform === 'darwin') {
        if (architecture === 'arm64') {
            platformSuffix = 'darwin-arm64'; // Use darwin-arm64 for Apple Silicon
        } else {
            platformSuffix = 'darwin'; // Use darwin for Intel Macs
        }
    } else if (platform === 'linux') {
        platformSuffix = 'linux-x64';
    } else if (platform === 'windows') {
        platformSuffix = 'win32-x64';
    } else {
        platformSuffix = 'linux-x64'; // fallback
    }
    
    // Use the official VS Code server download URL format
    // This matches the format used by the official VS Code SSH extension
    downloadUrl = `https://update.code.visualstudio.com/commit:${serverConfig.commit}/server-${platformSuffix}/stable`;

    // Platform-specific paths and commands
    const isDarwin = platform === 'darwin';
    const homeDir = isDarwin ? '$HOME' : '~';
    const tmpDir = isDarwin ? '/tmp' : '/tmp';
    const osReleaseCmd = isDarwin ? 'echo "darwin"' : 'cat /etc/os-release | grep ID= | head -1 | cut -d= -f2 | tr -d \'"\'"\'';
    
    return `#!/bin/bash
set -e

echo "${scriptId}: start"

# Set socket path configuration
useSocketPath="${useSocketPath}"
socketPath="${socketPath}"

# Set environment variables
${envVars}

# Create directories
mkdir -p ${homeDir}/.vscode-server/bin
mkdir -p ${homeDir}/.vscode-server/extensions
mkdir -p ${tmpDir}/vscode-server-logs

# Download VS Code server if not already present
VSCODE_SERVER_DIR="${homeDir}/.vscode-server/bin/${serverConfig.commit}"
if [ ! -f "$VSCODE_SERVER_DIR/bin/code-server" ]; then
    echo "Downloading VS Code server ${serverConfig.commit} for platform ${platform}..."
    echo "Download URL: ${downloadUrl}"
    
    # Download the server
    curl -L -o ${tmpDir}/vscode-server.tar.gz "${downloadUrl}"
    
    # Check if download was successful
    if [ ! -f "${tmpDir}/vscode-server.tar.gz" ]; then
        echo "Download failed"
        exit 1
    fi
    
    # Extract the server
    tar -xzf ${tmpDir}/vscode-server.tar.gz -C ${homeDir}/.vscode-server/bin --strip-components=1
    
    # Make executable
    chmod +x ${homeDir}/.vscode-server/bin/bin/code-server
    
    # Clean up
    rm ${tmpDir}/vscode-server.tar.gz
    echo "VS Code server downloaded and installed successfully"
fi

# Start VS Code server
if [ "${useSocketPath}" = "true" ]; then
    echo "Starting VS Code server on socket ${socketPath}..."
else
    echo "Starting VS Code server on port ${serverPort}..."
fi

# Check binary architecture
echo "Checking binary architecture..."
file ${homeDir}/.vscode-server/bin/bin/code-server || echo "file command not available"

# Check if binary exists and is executable
echo "Checking if binary exists..."
ls -la ${homeDir}/.vscode-server/bin/bin/code-server || echo "Binary not found"

echo "Checking if binary is executable..."
if [ -x "${homeDir}/.vscode-server/bin/bin/code-server" ]; then
    echo "Binary is executable"
else
    echo "Binary is NOT executable"
    chmod +x ${homeDir}/.vscode-server/bin/bin/code-server
    echo "Made binary executable"
fi

# Try to run the binary with --version to test it
echo "Testing binary with --version..."
${homeDir}/.vscode-server/bin/bin/code-server --version || echo "Binary test failed"

# Start the server in background
echo "Starting server in background..."
${homeDir}/.vscode-server/bin/bin/code-server --start-server ${listenArg} --accept-server-license-terms --log ${tmpDir}/vscode-server-logs/server.log > ${tmpDir}/vscode-server-logs/startup.log 2>&1 &
SERVER_PID=$!

echo "Server started with PID: $SERVER_PID"

# Wait for server to start
sleep 3

# Check if server is running
if [ "${useSocketPath}" = "true" ]; then
    # Check if socket file exists
    if [ -S "${socketPath}" ]; then
        echo "${scriptId}: exitCode:0"
        echo "${scriptId}: listeningOn:${socketPath}"
        echo "${scriptId}: connectionToken:vscode-server-token"
        echo "${scriptId}: logFile:${tmpDir}/vscode-server-logs/server.log"
        echo "${scriptId}: osReleaseId:$(${osReleaseCmd})"
        echo "${scriptId}: arch:\$(uname -m)"
        echo "${scriptId}: platform:${platform}"
        echo "${scriptId}: tmpDir:${tmpDir}"
    else
        echo "Server not running on socket ${socketPath}. Checking logs:"
        echo "Checking if log files exist:"
        ls -la ${tmpDir}/vscode-server-logs/ || echo "Log directory not found"
        cat ${tmpDir}/vscode-server-logs/server.log || echo "Could not read server log"
        cat ${tmpDir}/vscode-server-logs/startup.log || echo "Could not read startup log"
        echo "Checking if server process is still running:"
        ps aux | grep code-server || echo "No code-server process found"
        echo "${scriptId}: exitCode:1"
        echo "Failed to start VS Code server"
    fi
else
    # Check if server is running on port
    if lsof -i :${serverPort} > /dev/null 2>&1; then
        echo "${scriptId}: exitCode:0"
        echo "${scriptId}: listeningOn:${serverPort}"
        echo "${scriptId}: connectionToken:vscode-server-token"
        echo "${scriptId}: logFile:${tmpDir}/vscode-server-logs/server.log"
        echo "${scriptId}: osReleaseId:$(${osReleaseCmd})"
        echo "${scriptId}: arch:\$(uname -m)"
        echo "${scriptId}: platform:${platform}"
        echo "${scriptId}: tmpDir:${tmpDir}"
    else
        echo "Server not running on port ${serverPort}. Checking logs:"
        echo "Checking if log files exist:"
        ls -la ${tmpDir}/vscode-server-logs/ || echo "Log directory not found"
        cat ${tmpDir}/vscode-server-logs/server.log || echo "Could not read server log"
        cat ${tmpDir}/vscode-server-logs/startup.log || echo "Could not read startup log"
        echo "Checking if server process is still running:"
        ps aux | grep code-server || echo "No code-server process found"
        echo "${scriptId}: exitCode:1"
        echo "Failed to start VS Code server"
    fi
fi

echo "${scriptId}: end"`;
}

// Keep the original function name for backward compatibility
export async function startArchServer(conn: SSHConnection, serverPort: number, extensionIds: string[], envVariables: string[], platform: string | undefined, useSocketPath: boolean, logger: Log): Promise<ServerInstallResult> {
    // For now, just call the VS Code server function
    return installCodeServer(conn, undefined, extensionIds, envVariables, platform, useSocketPath, logger);
}
