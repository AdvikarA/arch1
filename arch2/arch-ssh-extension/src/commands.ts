import * as vscode from 'vscode';
import * as fs from 'fs';
import { getRemoteAuthority } from './authResolver';
import { getSSHConfigPath } from './ssh/sshConfig';
import { exists as fileExists } from './common/files';
import SSHDestination from './ssh/sshDestination';
import Log from './common/logger';

// Create a logger for commands
const logger = new Log('Remote - SSH Commands');

export async function promptOpenRemoteSSHWindow(reuseWindow: boolean) {
    logger.debug(`🚀 promptOpenRemoteSSHWindow called (reuseWindow: ${reuseWindow})`);
    
    const host = await vscode.window.showInputBox({
        title: 'Enter [user@]hostname[:port]'
    });

    if (!host) {
        logger.debug(`❌ No host entered, canceling connection`);
        return;
    }

    logger.debug(`✅ Host entered: ${host}`);
    const sshDest = new SSHDestination(host);
    const encodedHost = sshDest.toEncodedString();
    logger.debug(`🔗 Encoded host: ${encodedHost}`);
    
    openRemoteSSHWindow(encodedHost, reuseWindow);
}

export function openRemoteSSHWindow(host: string, reuseWindow: boolean) {
    const remoteAuthority = getRemoteAuthority(host);
    logger.debug(`🪟 openRemoteSSHWindow called - authority: ${remoteAuthority}, reuseWindow: ${reuseWindow}`);
    
    vscode.commands.executeCommand('vscode.newWindow', { remoteAuthority, reuseWindow });
}

export function openRemoteSSHLocationWindow(host: string, path: string, reuseWindow: boolean) {
    vscode.commands.executeCommand('vscode.openFolder', vscode.Uri.from({ scheme: 'vscode-remote', authority: getRemoteAuthority(host), path }), { forceNewWindow: !reuseWindow });
}

export async function addNewHost() {
    const sshConfigPath = getSSHConfigPath();
    if (!await fileExists(sshConfigPath)) {
        await fs.promises.appendFile(sshConfigPath, '');
    }

    await vscode.commands.executeCommand('vscode.open', vscode.Uri.file(sshConfigPath), { preview: false });

    const textEditor = vscode.window.activeTextEditor;
    if (textEditor?.document.uri.fsPath !== sshConfigPath) {
        return;
    }

    const textDocument = textEditor.document;
    const lastLine = textDocument.lineAt(textDocument.lineCount - 1);

    if (!lastLine.isEmptyOrWhitespace) {
        await textEditor.edit((editBuilder: vscode.TextEditorEdit) => {
            editBuilder.insert(lastLine.range.end, '\n');
        });
    }

    let snippet = '\nHost ${1:dev}\n\tHostName ${2:dev.example.com}\n\tUser ${3:john}';
    await textEditor.insertSnippet(
        new vscode.SnippetString(snippet),
        new vscode.Position(textDocument.lineCount, 0)
    );
}

export async function openSSHConfigFile() {
    const sshConfigPath = getSSHConfigPath();
    if (!await fileExists(sshConfigPath)) {
        await fs.promises.appendFile(sshConfigPath, '');
    }
    vscode.commands.executeCommand('vscode.open', vscode.Uri.file(sshConfigPath));
}
