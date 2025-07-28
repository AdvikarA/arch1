const path = require('path');
const fs = require('fs');

// Test if the extension compiled successfully
console.log('Testing SSH Extension...\n');

// Check if out directory exists
if (!fs.existsSync('out')) {
    console.error('❌ out directory not found. Run "npm run compile" first.');
    process.exit(1);
}

// Check if extension.js exists
if (!fs.existsSync('out/extension.js')) {
    console.error('❌ extension.js not found in out directory.');
    process.exit(1);
}

// Check if package.json is valid
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
if (!packageJson.main) {
    console.error('❌ package.json missing "main" field.');
    process.exit(1);
}

if (!packageJson.contributes || !packageJson.contributes.commands) {
    console.error('❌ package.json missing command contributions.');
    process.exit(1);
}

console.log('✅ Extension compiled successfully');
console.log('✅ package.json is valid');
console.log('✅ Command contributions found:', packageJson.contributes.commands.length, 'commands');

// Test the command structure
const commands = packageJson.contributes.commands;
commands.forEach(cmd => {
    console.log(`  - ${cmd.command}: ${cmd.title}`);
});

console.log('\n🎉 Extension is ready for testing!');
console.log('\nTo test in VS Code:');
console.log('1. Press F5 to launch Extension Development Host');
console.log('2. Open Command Palette (Cmd+Shift+P)');
console.log('3. Type "Connect via SSH" and select the command');
console.log('4. Follow the prompts to test the SSH connection functionality'); 