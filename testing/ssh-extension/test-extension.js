// Simulate VS Code extension environment
const vscode = {
  EventEmitter: class {
    constructor() {
      this.listeners = [];
    }
    fire(data) {
      this.listeners.forEach(listener => listener(data));
    }
    event = {
      listener: (callback) => {
        this.listeners.push(callback);
        return { dispose: () => {} };
      }
    };
  },
  ManagedResolvedAuthority: class {
    constructor(connectionFactory, token) {
      this.connectionFactory = connectionFactory;
      this.token = token;
      console.log('✅ ManagedResolvedAuthority created with token:', token);
    }
  },
  workspace: {
    registerRemoteAuthorityResolver: (authority, resolver) => {
      console.log('✅ Remote authority resolver registered for:', authority);
      return { dispose: () => {} };
    }
  },
  commands: {
    registerCommand: (command, callback) => {
      console.log('✅ Command registered:', command);
      return { dispose: () => {} };
    }
  },
  window: {
    showInputBox: async (options) => {
      console.log('Input box requested:', options.prompt);
      return options.value || '';
    }
  },
  Uri: {
    parse: (uri) => {
      console.log('URI parsed:', uri);
      return { toString: () => uri };
    }
  }
};

// Import the extension logic
const { SSHResolver } = require('./out/extension.js');

async function testExtension() {
  console.log('🧪 Testing SSH Extension Logic\n');
  
  // Test authority parsing
  const resolver = new SSHResolver();
  
  const testAuthorities = [
    'ssh-remote+localhost:22,8080',
    'ssh-remote+user@localhost:22,8080',
    'ssh-remote+user@example.com:2222,9000',
    'ssh-remote+example.com:22,8080'
  ];
  
  console.log('Testing authority parsing:');
  for (const authority of testAuthorities) {
    try {
      const result = await resolver.resolve(authority, {});
      console.log(`✅ ${authority} -> ${result.token}`);
    } catch (error) {
      console.log(`❌ ${authority} -> Error: ${error.message}`);
    }
  }
  
  console.log('\n🎉 Extension logic test completed!');
  console.log('\nTo test the full extension:');
  console.log('1. Open VS Code with: code --extensionDevelopmentPath=$(pwd) --new-window');
  console.log('2. Use Command Palette (Cmd+Shift+P) and run: "SSH Resolver: Connect"');
  console.log('3. Enter connection details to test SSH functionality');
}

testExtension().catch(console.error); 