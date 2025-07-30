import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import Log from './common/logger';

const logger = new Log('Remote - SSH ServerConfig');

let vscodeProductJson: any;
async function getVSCodeProductJson() {
    if (!vscodeProductJson) {
        // Enhanced logging: VS Code product.json read
        const productJsonPath = path.join(vscode.env.appRoot, 'product.json');
        const startTime = Date.now();
        const productJsonStr = await fs.promises.readFile(productJsonPath, 'utf8');
        logger.logFileOperation({
            operation: 'READ',
            path: productJsonPath,
            size: productJsonStr.length,
            duration: Date.now() - startTime
        });
        
        vscodeProductJson = JSON.parse(productJsonStr);
    }

    return vscodeProductJson;
}

export interface IServerConfig {
    version: string;
    commit: string;
    quality: string;
    release?: string; // vscodium-like specific
    serverApplicationName: string;
    serverDataFolderName: string;
    serverDownloadUrlTemplate?: string; // vscodium-like specific
}

export async function getVSCodeServerConfig(): Promise<IServerConfig> {
    const productJson = await getVSCodeProductJson();

    const customServerBinaryName = vscode.workspace.getConfiguration('remote.SSH.experimental').get<string>('serverBinaryName', '');

    return {
        version: vscode.version.replace('-insider',''),
        commit: productJson.commit,
        quality: productJson.quality,
        release: productJson.release,
        serverApplicationName: customServerBinaryName || productJson.serverApplicationName,
        serverDataFolderName: productJson.serverDataFolderName,
        serverDownloadUrlTemplate: productJson.serverDownloadUrlTemplate
    };
}
