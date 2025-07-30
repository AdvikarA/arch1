import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { exists as folderExists } from '../common/files';
import Log from '../common/logger';

const PATH_SSH_USER_DIR = path.join(os.homedir(), '.ssh');
const KNOW_HOST_FILE = path.join(PATH_SSH_USER_DIR, 'known_hosts');
const HASH_MAGIC = '|1|';
const HASH_DELIM = '|';
const logger = new Log('Remote - SSH HostFile');

export async function checkNewHostInHostkeys(host: string): Promise<boolean> {
    // Enhanced logging: Known hosts file read
    const startTime = Date.now();
    const fileContent = await fs.promises.readFile(KNOW_HOST_FILE, { encoding: 'utf8' });
    logger.logFileOperation({
        operation: 'READ',
        path: KNOW_HOST_FILE,
        size: fileContent.length,
        duration: Date.now() - startTime
    });
    
    const lines = fileContent.split(/\r?\n/);
    for (let line of lines) {
        line = line.trim();
        if (!line.startsWith(HASH_MAGIC)) {
            continue;
        }

        const [hostEncripted_] = line.split(' ');
        const [salt_, hostHash_] = hostEncripted_.substring(HASH_MAGIC.length).split(HASH_DELIM);
        const hostHash = crypto.createHmac('sha1', Buffer.from(salt_, 'base64')).update(host).digest();
        if (hostHash.toString('base64') === hostHash_) {
            return false;
        }
    }

    return true;
}

export async function addHostToHostFile(host: string, hostKey: Buffer, type: string): Promise<void> {
    if (!folderExists(PATH_SSH_USER_DIR)) {
        // Enhanced logging: SSH directory creation
        const startTime = Date.now();
        await fs.promises.mkdir(PATH_SSH_USER_DIR, 0o700);
        logger.logFileOperation({
            operation: 'WRITE',
            path: PATH_SSH_USER_DIR,
            duration: Date.now() - startTime
        });
    }

    const salt = crypto.randomBytes(20);
    const hostHash = crypto.createHmac('sha1', salt).update(host).digest();

    const entry = `${HASH_MAGIC}${salt.toString('base64')}${HASH_DELIM}${hostHash.toString('base64')} ${type} ${hostKey.toString('base64')}\n`;
    
    // Enhanced logging: Known hosts file write
    const startTime = Date.now();
    await fs.promises.appendFile(KNOW_HOST_FILE, entry);
    logger.logFileOperation({
        operation: 'WRITE',
        path: KNOW_HOST_FILE,
        size: entry.length,
        duration: Date.now() - startTime
    });
}
