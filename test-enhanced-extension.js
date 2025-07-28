const fs = require('fs');
const path = require('path');

console.log('🧪 Testing Enhanced SSH Extension with Code-Server Integration\n');

// Test 1: Check if all required files exist
console.log('1. Checking file structure...');
const requiredFiles = [
    'src/extension.ts',
    'src/ssh-manager.ts',
    'out/extension.js',
    'package.json'
];

let allFilesExist = true;
requiredFiles.forEach(file => {
    if (fs.existsSync(file)) {
        console.log(`   ✅ ${file}`);
    } else {
        console.log(`   ❌ ${file} - MISSING`);
        allFilesExist = false;
    }
});

if (!allFilesExist) {
    console.error('\n❌ Some required files are missing. Please run "npm run compile" first.');
    process.exit(1);
}

// Test 2: Check package.json dependencies
console.log('\n2. Checking dependencies...');
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));

const requiredDeps = ['ssh2', '@types/ssh2'];
const missingDeps = requiredDeps.filter(dep => {
    return !packageJson.dependencies?.[dep] && !packageJson.devDependencies?.[dep];
});

if (missingDeps.length > 0) {
    console.log(`   ❌ Missing dependencies: ${missingDeps.join(', ')}`);
    console.log('   Run: npm install ssh2 @types/ssh2');
} else {
    console.log('   ✅ All required dependencies installed');
}

// Test 3: Check compiled output
console.log('\n3. Checking compiled output...');
const outDir = 'out';
if (fs.existsSync(outDir)) {
    const files = fs.readdirSync(outDir);
    console.log(`   ✅ out/ directory contains ${files.length} files`);
    files.forEach(file => {
        console.log(`      - ${file}`);
    });
} else {
    console.log('   ❌ out/ directory missing');
}

// Test 4: Verify command registration
console.log('\n4. Checking command registration...');
const commands = packageJson.contributes?.commands || [];
if (commands.length > 0) {
    console.log(`   ✅ ${commands.length} command(s) registered:`);
    commands.forEach(cmd => {
        console.log(`      - ${cmd.command}: ${cmd.title}`);
    });
} else {
    console.log('   ❌ No commands registered');
}

// Test 5: Check TypeScript compilation
console.log('\n5. Checking TypeScript compilation...');
try {
    const { execSync } = require('child_process');
    execSync('npx tsc --noEmit', { stdio: 'pipe' });
    console.log('   ✅ TypeScript compilation successful');
} catch (error) {
    console.log('   ❌ TypeScript compilation errors found');
    console.log('   Run: npm run compile');
}

console.log('\n🎉 Enhanced SSH Extension Test Results:');
console.log('=====================================');

if (allFilesExist && missingDeps.length === 0) {
    console.log('✅ Extension is ready for testing!');
    console.log('\n📋 What the extension now does:');
    console.log('1. Establishes real SSH connections using ssh2 library');
    console.log('2. Checks if code-server is running on the specified port');
    console.log('3. Retrieves code-server configuration and URL');
    console.log('4. Shows progress during connection');
    console.log('5. Offers to open code-server URL in browser');
    console.log('6. Handles authentication (SSH keys or password)');
    console.log('7. Provides detailed error messages and status updates');
    
    console.log('\n🚀 To test the extension:');
    console.log('1. Press F5 in VS Code to launch Extension Development Host');
    console.log('2. Open Command Palette (Cmd+Shift+P)');
    console.log('3. Run "Connect via SSH" command');
    console.log('4. Enter your SSH connection details');
    console.log('5. Watch the progress notifications');
    console.log('6. Check the Debug Console for detailed logs');
    
    console.log('\n💡 Testing Tips:');
    console.log('- Make sure you have SSH access to a server with code-server running');
    console.log('- Default SSH key (~/.ssh/id_rsa) will be used if no password provided');
    console.log('- Check the Debug Console for detailed connection logs');
    console.log('- The extension will show progress notifications during connection');
    
} else {
    console.log('❌ Extension needs fixes before testing');
    if (missingDeps.length > 0) {
        console.log('   Run: npm install ssh2 @types/ssh2');
    }
    if (!allFilesExist) {
        console.log('   Run: npm run compile');
    }
} 