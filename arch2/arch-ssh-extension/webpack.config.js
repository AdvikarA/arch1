//@ts-check

'use strict';

const path = require('path');
const webpack = require('webpack');

/**@type {import('webpack').Configuration}*/
const config = {
	target: 'node',
	entry: './src/extension.ts',
	output: {
		path: path.resolve(__dirname, 'out'),
		filename: 'extension.js',
		libraryTarget: "commonjs2",
		devtoolModuleFilenameTemplate: "../[resource-path]",
	},
	devtool: 'source-map',
	externals: {
		vscode: "commonjs vscode",
		bufferutil: "bufferutil",
		"utf-8-validate": "utf-8-validate",
	},
	resolve: {
		extensions: ['.ts', '.js'],
		fallback: {
			"crypto": false,
			"stream": false,
			"util": false,
			"buffer": false,
			"process": false,
			"path": false,
			"fs": false,
			"os": false
		}
	},
	module: {
		rules: [{
			test: /\.ts$/,
			exclude: /node_modules/,
			use: [{
				loader: 'ts-loader'
			}]
		}]
	},
	plugins: [
		new webpack.IgnorePlugin({
			resourceRegExp: /crypto\/build\/Release\/sshcrypto\.node$/,
		}),
		new webpack.IgnorePlugin({
			resourceRegExp: /cpu-features/,
		}),
		new webpack.DefinePlugin({
			'global.navigator': 'undefined',
			'globalThis.navigator': 'undefined',
			'navigator': 'undefined'
		})
	]
}

module.exports = (_env, argv) => {
	if (argv.mode === 'production') {
		config.devtool = false;
	}

	return config;
};
