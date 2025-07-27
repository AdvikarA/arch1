const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔑 Setting up SSH keys for testing...\n');

// Check if SSH keys already exist
function checkExistingKeys() {
    const sshDir = path.join(require('os').homedir(), '.ssh');
    const keyFiles = ['id_rsa', 'id_ed25519', 'id_ecdsa'];
    
    for (const keyFile of keyFiles) {
        const keyPath = path.join(sshDir, keyFile);
        if (fs.existsSync(keyPath)) {
            console.log(`✅ Found existing SSH key: ${keyFile}`);
            return keyPath;
        }
    }
    
    return null;
}

// Generate SSH key
function generateSSHKey() {
    return new Promise((resolve, reject) => {
        console.log('Generating new SSH key...');
        
        const sshKeygen = spawn('ssh-keygen', [
            '-t', 'ed25519',
            '-f', path.join(require('os').homedir(), '.ssh', 'id_ed25519'),
            '-N', '', // No passphrase
            '-C', 'test-key-for-ssh-extension'
        ], {
            stdio: 'pipe'
        });
        
        sshKeygen.on('close', (code) => {
            if (code === 0) {
                console.log('✅ SSH key generated successfully');
                resolve(path.join(require('os').homedir(), '.ssh', 'id_ed25519'));
            } else {
                reject(new Error(`ssh-keygen failed with code ${code}`));
            }
        });
        
        sshKeygen.on('error', (error) => {
            reject(error);
        });
    });
}

// Copy public key to authorized_keys for local testing
function setupLocalAuth(keyPath) {
    return new Promise((resolve, reject) => {
        const publicKeyPath = keyPath + '.pub';
        
        if (!fs.existsSync(publicKeyPath)) {
            reject(new Error('Public key not found'));
            return;
        }
        
        const publicKey = fs.readFileSync(publicKeyPath, 'utf8');
        const authorizedKeysPath = path.join(require('os').homedir(), '.ssh', 'authorized_keys');
        
        // Create authorized_keys if it doesn't exist
        if (!fs.existsSync(authorizedKeysPath)) {
            fs.writeFileSync(authorizedKeysPath, publicKey);
            console.log('✅ Created authorized_keys file');
        } else {
            // Check if key is already in authorized_keys
            const authorizedKeys = fs.readFileSync(authorizedKeysPath, 'utf8');
            if (!authorizedKeys.includes(publicKey.trim())) {
                fs.appendFileSync(authorizedKeysPath, '\n' + publicKey);
                console.log('✅ Added public key to authorized_keys');
            } else {
                console.log('✅ Public key already in authorized_keys');
            }
        }
        
        resolve();
    });
}

// Main setup function
async function setupSSHKeys() {
    try {
        // Check for existing keys
        const existingKey = checkExistingKeys();
        
        if (existingKey) {
            console.log(`Using existing SSH key: ${existingKey}`);
        } else {
            // Generate new key
            const newKeyPath = await generateSSHKey();
            console.log(`Generated new SSH key: ${newKeyPath}`);
        }
        
        // Setup local authentication
        await setupLocalAuth(existingKey || path.join(require('os').homedir(), '.ssh', 'id_ed25519'));
        
        console.log('\n🎉 SSH key setup complete!');
        console.log('================================');
        console.log('📋 Your extension can now use SSH key authentication');
        console.log('💡 For local testing, you can also use password authentication');
        console.log('\n🚀 To test your extension:');
        console.log('1. Reload the extension in VS Code (Ctrl+R)');
        console.log('2. Run "Connect via SSH" command');
        console.log('3. Use localhost as host and your username');
        
    } catch (error) {
        console.error('❌ SSH key setup failed:', error);
        console.log('\n💡 You can still test with password authentication');
    }
}

setupSSHKeys(); 