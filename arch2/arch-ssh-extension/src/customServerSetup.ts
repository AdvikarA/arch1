import * as crypto from 'crypto';
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import SSHConnection from './ssh/sshConnection';
import Log from './common/logger';

export interface CustomServerConfig {
    enabled: boolean;
    binaryPath: string;
    deploymentMethod: 'upload' | 'download' | 'existing';
    downloadUrl?: string;
    enhancedProtocol: boolean;
    secureWebSocket: boolean;
}

export interface CustomServerInstallResult {
    exitCode: number;
    listeningOn: string | number;
    connectionToken: string;
    logFile: string;
    platform: string;
    arch: string;
    serverPath: string;
    capabilities: {
        fileSystem: boolean;
        terminal: boolean;
        enhancedProtocol: boolean;
        secureWebSocket: boolean;
    };
}

export async function getCustomServerConfig(): Promise<CustomServerConfig> {
    const config = vscode.workspace.getConfiguration('remote.SSH.customServer');
    
    return {
        enabled: config.get<boolean>('enabled', false),
        binaryPath: config.get<string>('binaryPath', ''),
        deploymentMethod: config.get<'upload' | 'download' | 'existing'>('deploymentMethod', 'upload'),
        downloadUrl: config.get<string>('downloadUrl', ''),
        enhancedProtocol: config.get<boolean>('enhancedProtocol', true),
        secureWebSocket: config.get<boolean>('secureWebSocket', true)
    };
}

export async function shouldUseCustomServer(): Promise<boolean> {
    try {
        const config = await getCustomServerConfig();
        
        // **CUSTOM SERVER ENABLED** - Deploy our ArchIDE server instead of VS Code server
        if (config.enabled) {
            return true;
        }
        
        return false;
        
    } catch (error) {
        return false;
    }
}

async function detectRemotePlatform(conn: SSHConnection, logger: Log): Promise<string> {
    logger.debug('🔍 Detecting remote platform...');
    
    try {
        const result = await conn.exec('uname -s');
        
        if (result.stdout) {
            const kernel = result.stdout.trim().toLowerCase();
            if (kernel.includes('linux')) {
                logger.debug('✅ Detected platform: linux');
                return 'linux';
            } else if (kernel.includes('darwin')) {
                logger.debug('✅ Detected platform: macos');
                return 'macos';
            } else if (kernel.includes('freebsd')) {
                logger.debug('✅ Detected platform: freebsd');
                return 'freebsd';
            }
        }
        
        // Try Windows detection
        const winResult = await conn.exec('echo %OS%');
        if (winResult.stdout && winResult.stdout.includes('Windows')) {
            logger.debug('✅ Detected platform: windows');
            return 'windows';
        }
        
    } catch (error) {
        logger.warning('⚠️ Could not detect platform, defaulting to linux', error);
    }
    
    return 'linux'; // Default fallback
}

async function detectRemoteArch(conn: SSHConnection, logger: Log): Promise<string> {
    logger.debug('🔍 Detecting remote architecture...');
    
    try {
        const result = await conn.exec('uname -m');
        
        if (result.stdout) {
            const arch = result.stdout.trim().toLowerCase();
            if (arch.includes('x86_64') || arch.includes('amd64')) {
                logger.debug('✅ Detected architecture: x64');
                return 'x64';
            } else if (arch.includes('arm64') || arch.includes('aarch64')) {
                logger.debug('✅ Detected architecture: arm64');
                return 'arm64';
            } else if (arch.includes('armv7l') || arch.includes('armv8l')) {
                logger.debug('✅ Detected architecture: armhf');
                return 'armhf';
            }
        }
    } catch (error) {
        logger.warning('⚠️ Could not detect architecture, defaulting to x64', error);
    }
    
    return 'x64'; // Default fallback
}

async function validateCustomServerConfig(config: CustomServerConfig, logger: Log): Promise<void> {
    logger.debug('🔍 Validating custom server configuration...');
    
    if (!config.enabled) {
        throw new Error('Custom server is not enabled');
    }
    
    switch (config.deploymentMethod) {
        case 'upload':
            if (!config.binaryPath) {
                throw new Error('Binary path is required for upload deployment method');
            }
            // Note: We can't check if local file exists in this context
            break;
        case 'download':
            if (!config.downloadUrl) {
                throw new Error('Download URL is required for download deployment method');
            }
            if (!config.downloadUrl.startsWith('http://') && !config.downloadUrl.startsWith('https://')) {
                throw new Error('Download URL must be a valid HTTP/HTTPS URL');
            }
            break;
        case 'existing':
            if (!config.binaryPath) {
                throw new Error('Binary path is required for existing deployment method');
            }
            break;
        default:
            throw new Error(`Unknown deployment method: ${config.deploymentMethod}`);
    }
    
    logger.debug('✅ Custom server configuration is valid');
}

export async function installCustomArchServer(
    conn: SSHConnection,
    config: CustomServerConfig,
    extensionIds: string[],
    envVariables: string[],
    platform: string | undefined,
    useSocketPath: boolean,
    logger: Log
): Promise<CustomServerInstallResult> {
    
    logger.info('🚀 Starting custom ArchIDE server deployment...');
    
    // Validate configuration first
    await validateCustomServerConfig(config, logger);
    
    // Detect platform and architecture if not provided
    if (!platform) {
        platform = await detectRemotePlatform(conn, logger);
    }
    
    const arch = await detectRemoteArch(conn, logger);
    const scriptId = crypto.randomBytes(12).toString('hex');
    
    logger.info(`📋 Deployment configuration:
    • Platform: ${platform}
    • Architecture: ${arch}
    • Method: ${config.deploymentMethod}
    • Enhanced Protocol: ${config.enhancedProtocol}
    • Secure WebSocket: ${config.secureWebSocket}`);
    
    const installScript = generateCustomServerInstallScript({
        id: scriptId,
        platform,
        arch,
        config,
        extensionIds,
        envVariables,
        useSocketPath
    });
    
    logger.debug('📝 Generated installation script:', installScript.substring(0, 500) + '...');
    
    // Handle upload deployment method - upload arch-server-launcher via SFTP
    if (config.deploymentMethod === 'upload') {
        logger.info('📤 Uploading ArchIDE server package via SFTP...');
        
        try {
            // Upload the entire arch-server-launcher directory to ~/.arch-ide-server
            await uploadArchServerLauncher(conn, config.binaryPath, logger);
            logger.info('✅ ArchIDE server package uploaded successfully');
        } catch (uploadError) {
            logger.warning('❌ Failed to upload ArchIDE server package:', uploadError);
            throw new Error(`SFTP upload failed: ${uploadError}`);
        }
    }
    
    // Execute the installation script
    const commandOutput = await conn.exec(`bash -c '${installScript.replace(/'/g, `'\\''`)}'`);
    
    if (commandOutput.stderr) {
        logger.trace('📤 Installation stderr:', commandOutput.stderr);
    }
    logger.trace('📥 Installation stdout:', commandOutput.stdout);
    
    // Parse the result
    const resultMap = parseCustomServerInstallOutput(commandOutput.stdout, scriptId);
    if (!resultMap) {
        throw new Error('Failed to parse custom ArchIDE server installation output');
    }
    
    const exitCode = parseInt(resultMap.exitCode, 10);
    if (exitCode !== 0) {
        throw new Error(`Custom ArchIDE server installation failed with exit code ${exitCode}`);
    }
    
    const listeningOn = resultMap.listeningOn.match(/^\d+$/)
        ? parseInt(resultMap.listeningOn, 10)
        : resultMap.listeningOn;
    
    const result: CustomServerInstallResult = {
        exitCode,
        listeningOn,
        connectionToken: resultMap.connectionToken,
        logFile: resultMap.logFile,
        platform,
        arch,
        serverPath: resultMap.serverPath,
        capabilities: {
            fileSystem: config.enhancedProtocol,
            terminal: config.enhancedProtocol,
            enhancedProtocol: config.enhancedProtocol,
            secureWebSocket: config.secureWebSocket
        }
    };
    
    logger.info('✅ Custom ArchIDE server deployed successfully!', {
        listeningOn: result.listeningOn,
        serverPath: result.serverPath,
        capabilities: result.capabilities
    });
    
    return result;
}

interface InstallScriptOptions {
    id: string;
    platform: string;
    arch: string;
    config: CustomServerConfig;
    extensionIds: string[];
    envVariables: string[];
    useSocketPath: boolean;
}

function generateCustomServerInstallScript(options: InstallScriptOptions): string {
    const { id, platform, arch, config, extensionIds, envVariables, useSocketPath } = options;
    
    const extensions = extensionIds.map(id => `--install-extension="${id}"`).join(' ');
    const serverListenFlag = useSocketPath 
        ? `--socket-path="$TMP_DIR/arch-ide-server-sock-${crypto.randomUUID()}"` 
        : '--port=0';
    
    return `
#!/bin/bash

# Custom ArchIDE Server Installation Script
# ID: ${id}

set -e

TMP_DIR="\${TMPDIR:-/tmp}"
ARCH_SERVER_DIR="$HOME/.arch-ide-server"
ARCH_SERVER_BINARY="$ARCH_SERVER_DIR/arch-server"
ARCH_SERVER_LOGFILE="$ARCH_SERVER_DIR/arch-server.log"
ARCH_SERVER_PIDFILE="$ARCH_SERVER_DIR/arch-server.pid"
ARCH_SERVER_TOKENFILE="$ARCH_SERVER_DIR/arch-server.token"

# Environment variables
${envVariables.map(envVar => `export ${envVar}`).join('\n')}

function print_install_results_and_exit() {
    echo "${id}: start"
    echo "exitCode==$1=="
    echo "listeningOn==$LISTENING_ON=="
    echo "connectionToken==$SERVER_CONNECTION_TOKEN=="
    echo "logFile==$ARCH_SERVER_LOGFILE=="
    echo "platform==${platform}=="
    echo "arch==${arch}=="
    echo "serverPath==$ARCH_SERVER_BINARY=="
    ${envVariables.map(envVar => `echo "${envVar}==\$${envVar}=="`).join('\n')}
    echo "${id}: end"
    exit $1
}

# Create server directory
if [[ ! -d $ARCH_SERVER_DIR ]]; then
    mkdir -p $ARCH_SERVER_DIR
    if (( $? > 0 )); then
        echo "Error creating ArchIDE server directory"
        print_install_results_and_exit 1
    fi
fi

# Deploy server binary based on deployment method
case "${config.deploymentMethod}" in
    "upload")
        echo "📤 Uploading ArchIDE server package to remote machine..."
        # The arch-server-launcher package will be uploaded via SFTP to $ARCH_SERVER_DIR
        # This includes: arch-server, arch-server-main.js, bootstrap files, vs/, product.json
        
        # Check if upload was successful by looking for the main launcher
        if [[ ! -f "$ARCH_SERVER_BINARY" ]]; then
            echo "❌ ArchIDE server binary not found after upload. Expected: $ARCH_SERVER_BINARY"
            print_install_results_and_exit 1
        fi
        
        # Make the arch-server script executable
        chmod +x "$ARCH_SERVER_BINARY"
        echo "✅ ArchIDE server package uploaded and configured"
        ;;
    "download")
        if [[ -n "${config.downloadUrl}" ]]; then
            echo "Downloading ArchIDE server from ${config.downloadUrl}"
            if [[ ! -z $(which wget) ]]; then
                wget --tries=3 --timeout=10 --continue --no-verbose -O "$ARCH_SERVER_BINARY" "${config.downloadUrl}"
            elif [[ ! -z $(which curl) ]]; then
                curl --retry 3 --connect-timeout 10 --location --show-error --silent --output "$ARCH_SERVER_BINARY" "${config.downloadUrl}"
            else
                echo "Error: No tool to download server binary"
                print_install_results_and_exit 1
            fi
            
            if (( $? > 0 )); then
                echo "Error downloading ArchIDE server"
                print_install_results_and_exit 1
            fi
            
            chmod +x "$ARCH_SERVER_BINARY"
        else
            echo "Error: Download URL not specified"
            print_install_results_and_exit 1
        fi
        ;;
    "existing")
        if [[ ! -f "${config.binaryPath}" ]]; then
            echo "Error: Existing ArchIDE server binary not found at ${config.binaryPath}"
            print_install_results_and_exit 1
        fi
        ARCH_SERVER_BINARY="${config.binaryPath}"
        ;;
    *)
        echo "Error: Unknown deployment method ${config.deploymentMethod}"
        print_install_results_and_exit 1
        ;;
esac

# Generate connection token
if [[ -f $ARCH_SERVER_TOKENFILE ]]; then
    rm $ARCH_SERVER_TOKENFILE
fi

touch $ARCH_SERVER_TOKENFILE
chmod 600 $ARCH_SERVER_TOKENFILE
SERVER_CONNECTION_TOKEN="${crypto.randomUUID()}"
echo $SERVER_CONNECTION_TOKEN > $ARCH_SERVER_TOKENFILE

# Check if server is already running
if [[ -f $ARCH_SERVER_PIDFILE ]]; then
    SERVER_PID="$(cat $ARCH_SERVER_PIDFILE)"
    SERVER_RUNNING_PROCESS="$(ps -o pid,args -p $SERVER_PID | grep $ARCH_SERVER_BINARY)"
else
    SERVER_RUNNING_PROCESS="$(ps -o pid,args -A | grep $ARCH_SERVER_BINARY | grep -v grep)"
fi

if [[ -z $SERVER_RUNNING_PROCESS ]]; then
    # Clean up old log file
    if [[ -f $ARCH_SERVER_LOGFILE ]]; then
        rm $ARCH_SERVER_LOGFILE
    fi
    
    # Start ArchIDE server with enhanced capabilities
    if [[ "$ARCH_SERVER_BINARY" == "code-server-direct" ]]; then
        # Use enhanced direct mode - install standard VS Code server first, then use it with enhancements
        echo "🚀 Installing standard VS Code server for ArchIDE enhancement..."
        
        # Standard VS Code server installation
        VSCODE_SERVER_DIR="$HOME/.vscode-server"
        if [[ ! -d "$VSCODE_SERVER_DIR" ]]; then
            mkdir -p "$VSCODE_SERVER_DIR"
        fi
        
        # Find existing VS Code server or use standard installation
        VSCODE_BIN=\$(find "$VSCODE_SERVER_DIR" -name "code-server" -type f 2>/dev/null | head -1)
        if [[ -z "$VSCODE_BIN" ]]; then
            echo "❌ No VS Code server found, standard installation will handle this"
            print_install_results_and_exit 1
        fi
        
        echo "✅ Using VS Code server with ArchIDE enhancements: $VSCODE_BIN"
        node "$VSCODE_BIN" \\
            --start-server \\
            --host=127.0.0.1 \\
            ${serverListenFlag} \\
            ${extensions} \\
            --connection-token-file $ARCH_SERVER_TOKENFILE \\
            --telemetry-level off \\
            --enable-remote-auto-shutdown \\
            --accept-server-license-terms \\
            &> $ARCH_SERVER_LOGFILE &
    else
        # Use custom binary
        $ARCH_SERVER_BINARY \\
            --start-server \\
            --host=127.0.0.1 \\
            ${serverListenFlag} \\
            ${extensions} \\
            --connection-token-file $ARCH_SERVER_TOKENFILE \\
            --telemetry-level off \\
            --enable-remote-auto-shutdown \\
            --accept-server-license-terms \\
            ${config.enhancedProtocol ? '--enhanced-protocol' : ''} \\
            ${config.secureWebSocket ? '--secure-websocket' : ''} \\
            &> $ARCH_SERVER_LOGFILE &
    fi
    
    echo $! > $ARCH_SERVER_PIDFILE
    echo "ArchIDE server started with PID $(cat $ARCH_SERVER_PIDFILE)"
else
    echo "ArchIDE server is already running"
fi

# Wait for server to start and get listening address
if [[ -f $ARCH_SERVER_LOGFILE ]]; then
    for i in {1..10}; do
        LISTENING_ON="$(cat $ARCH_SERVER_LOGFILE | grep -E 'ArchIDE server listening on .+' | sed 's/ArchIDE server listening on //' | tail -1)"
        if [[ -n $LISTENING_ON ]]; then
            break
        fi
        sleep 0.5
    done
    
    if [[ -z $LISTENING_ON ]]; then
        echo "Error: ArchIDE server did not start successfully"
        cat $ARCH_SERVER_LOGFILE
        print_install_results_and_exit 1
    fi
else
    echo "Error: ArchIDE server log file not found"
    print_install_results_and_exit 1
fi

echo "✅ ArchIDE server successfully started and listening on $LISTENING_ON"
print_install_results_and_exit 0
`;
}

function parseCustomServerInstallOutput(str: string, scriptId: string): { [k: string]: string } | undefined {
    const lines = str.split('\n');
    let started = false;
    const resultMap: { [k: string]: string } = {};

    for (const line of lines) {
        if (line === `${scriptId}: start`) {
            started = true;
            continue;
        }

        if (line === `${scriptId}: end`) {
            break;
        }

        if (started) {
            const match = line.match(/^(.+)==(.+)==$/);
            if (match) {
                resultMap[match[1]] = match[2];
            }
        }
    }

    return Object.keys(resultMap).length > 0 ? resultMap : undefined;
}

async function uploadDirectoryContents(sftp: any, localDir: string, remoteDir: string, logger: Log): Promise<void> {
    const files = fs.readdirSync(localDir);
    
    for (const file of files) {
        const localPath = path.join(localDir, file);
        const remotePath = `${remoteDir}/${file}`;
        const stat = fs.statSync(localPath);
        
        if (stat.isDirectory()) {
            // Create remote directory and recursively upload contents
            logger.debug(`📁 Creating remote directory: ${remotePath}`);
            await new Promise<void>((resolve) => {
                sftp.mkdir(remotePath, (err: any) => {
                    // Ignore error if directory already exists
                    if (err && err.code !== 4) {
                        logger.warning(`⚠️ Could not create directory ${remotePath}:`, err);
                    }
                    resolve();
                });
            });
            
            // Recursively upload directory contents
            await uploadDirectoryContents(sftp, localPath, remotePath, logger);
        } else {
            // Upload file
            logger.debug(`📄 Uploading file: ${localPath} → ${remotePath}`);
            await new Promise<void>((resolve, reject) => {
                sftp.fastPut(localPath, remotePath, (err: any) => {
                    if (err) {
                        logger.warning(`❌ Failed to upload ${file}:`, err);
                        reject(err);
                    } else {
                        logger.trace(`✅ Uploaded: ${file}`);
                        resolve();
                    }
                });
            });
        }
    }
}

async function uploadArchServerLauncher(conn: SSHConnection, localBinaryPath: string, logger: Log): Promise<void> {
    return new Promise((resolve, reject) => {
        logger.info(`📤 Uploading ArchIDE server package from ${localBinaryPath}...`);
        
        // Get the underlying SSH2 connection
        const sshConnection = (conn as any).sshConnection;
        if (!sshConnection) {
            reject(new Error('SSH connection not established'));
            return;
        }
        
        // Create SFTP connection
        sshConnection.sftp((err: any, sftp: any) => {
            if (err) {
                logger.warning('❌ Failed to create SFTP connection:', err);
                reject(err);
                return;
            }
            
            const localLauncherDir = path.dirname(localBinaryPath);
            const remoteServerDir = '.arch-ide-server';
            
            logger.info(`📁 Creating remote directory: ${remoteServerDir}`);
            
            // Create remote directory
            sftp.mkdir(remoteServerDir, (mkdirErr: any) => {
                // Ignore error if directory already exists
                if (mkdirErr && mkdirErr.code !== 4) { // 4 = SSH2_FX_FAILURE (directory exists)
                    logger.warning('⚠️ Could not create remote directory:', mkdirErr);
                }
                
                // Upload arch-server-launcher contents
                uploadDirectoryContents(sftp, localLauncherDir, remoteServerDir, logger)
                    .then(() => {
                        sftp.end();
                        logger.info('✅ ArchIDE server package uploaded successfully');
                        resolve();
                    })
                    .catch((uploadErr: any) => {
                        sftp.end();
                        logger.warning('❌ Failed to upload package:', uploadErr);
                        reject(uploadErr);
                    });
            });
        });
    });
}
