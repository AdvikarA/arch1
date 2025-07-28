//@ts-check

'use strict';

const path = require('path');

module.exports = {
  target: 'node',
  mode: 'production',
  entry: './out/extension.js',
  output: {
    path: path.resolve(__dirname, 'out'),
    filename: 'extension.bundle.js',
    libraryTarget: 'commonjs2'
  },
  externals: {
    vscode: 'commonjs vscode',
    'cpu-features': 'commonjs cpu-features',
    'ssh2/lib/protocol/crypto/build/Release/sshcrypto.node': 'commonjs ssh2/lib/protocol/crypto/build/Release/sshcrypto.node'
  },
  resolve: {
    extensions: ['.js']
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env']
          }
        }
      }
    ]
  },
  ignoreWarnings: [
    {
      module: /cpu-features/,
    },
    {
      module: /sshcrypto\.node/,
    }
  ]
};
