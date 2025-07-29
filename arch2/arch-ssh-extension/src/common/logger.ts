import * as vscode from 'vscode';

type LogLevel = 'Trace' | 'Debug' | 'Info' | 'Warning' | 'Error';
type FileOperation = 'READ' | 'WRITE' | 'DELETE' | 'RENAME' | 'WATCH' | 'LIST';
type NetworkDirection = 'LOCAL→REMOTE' | 'REMOTE→LOCAL' | 'BIDIRECTIONAL';

interface FileOperationDetails {
	operation: FileOperation;
	path: string;
	size?: number;
	duration?: number;
	error?: Error;
}

interface NetworkRequestDetails {
	direction: NetworkDirection;
	messageType: string;
	payload?: any;
	size?: number;
	timestamp: number;
}

interface TunnelActivityDetails {
	localPort: number;
	remoteEndpoint: string;
	action: 'CREATE' | 'DESTROY' | 'DATA_TRANSFER';
	dataSize?: number;
	duration?: number;
}

export default class Log {
	private output: vscode.OutputChannel;

	constructor(name: string) {
		this.output = vscode.window.createOutputChannel(name);
	}

	private getConfig(): vscode.WorkspaceConfiguration {
		return vscode.workspace.getConfiguration('remote.SSH');
	}

	private isLogLevelEnabled(level: LogLevel): boolean {
		const configLevel = this.getConfig().get<string>('logLevel', 'Info');
		const levels: LogLevel[] = ['Trace', 'Debug', 'Info', 'Warning', 'Error'];
		const configIndex = levels.indexOf(configLevel as LogLevel);
		const currentIndex = levels.indexOf(level);
		return currentIndex >= configIndex;
	}

	private shouldLogFileOperations(): boolean {
		return this.getConfig().get<boolean>('logFileOperations', false);
	}

	private shouldLogNetworkTraffic(): boolean {
		return this.getConfig().get<boolean>('logNetworkTraffic', false);
	}

	private shouldLogTunnelActivity(): boolean {
		return this.getConfig().get<boolean>('logTunnelActivity', false);
	}

	private data2String(data: any): string {
		if (data instanceof Error) {
			return data.stack || data.message;
		}
		if (data && typeof data === 'object') {
			try {
				return JSON.stringify(data, null, 2);
			} catch (e) {
				return data.toString();
			}
		}
		if (data && data.success === false && data.message) {
			return data.message;
		}
		return data ? data.toString() : '';
	}

	private formatBytes(bytes: number): string {
		if (bytes === 0) return '0 B';
		const k = 1024;
		const sizes = ['B', 'KB', 'MB', 'GB'];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
	}

	public trace(message: string, data?: any): void {
		this.logLevel('Trace', message, data);
	}

	public debug(message: string, data?: any): void {
		this.logLevel('Debug', message, data);
	}

	public info(message: string, data?: any): void {
		this.logLevel('Info', message, data);
	}

	public warning(message: string, data?: any): void {
		this.logLevel('Warning', message, data);
	}

	public error(message: string, data?: any): void {
		this.logLevel('Error', message, data);
	}

	public logLevel(level: LogLevel, message: string, data?: any): void {
		if (!this.isLogLevelEnabled(level)) {
			return;
		}

		const timestamp = this.now();
		const prefix = `[${level.padEnd(7)} - ${timestamp}]`;
		this.output.appendLine(`${prefix} ${message}`);
		
		if (data) {
			const dataStr = this.data2String(data);
			// Indent the data for better readability
			const indentedData = dataStr.split('\n').map(line => `    ${line}`).join('\n');
			this.output.appendLine(indentedData);
		}
	}

	// Structured logging methods for SSH extension debugging

	public logFileOperation(details: FileOperationDetails): void {
		if (!this.shouldLogFileOperations()) {
			return;
		}

		const { operation, path, size, duration, error } = details;
		let message = `📁 File Operation: ${operation} "${path}"`;
		
		if (size !== undefined) {
			message += ` (${this.formatBytes(size)})`;
		}
		
		if (duration !== undefined) {
			message += ` [${duration}ms]`;
		}

		if (error) {
			this.error(message, error);
		} else {
			this.debug(message);
		}
	}

	public logNetworkRequest(details: NetworkRequestDetails): void {
		if (!this.shouldLogNetworkTraffic()) {
			return;
		}

		const { direction, messageType, payload, size } = details;
		let message = `🌐 Network: ${direction} ${messageType}`;
		
		if (size !== undefined) {
			message += ` (${this.formatBytes(size)})`;
		}

		const logData = payload ? { messageType, payload } : { messageType };
		this.debug(message, logData);
	}

	public logTunnelActivity(details: TunnelActivityDetails): void {
		if (!this.shouldLogTunnelActivity()) {
			return;
		}

		const { localPort, remoteEndpoint, action, dataSize, duration } = details;
		let message = `🚇 Tunnel: ${action} localhost:${localPort} ↔ ${remoteEndpoint}`;
		
		if (dataSize !== undefined) {
			message += ` (${this.formatBytes(dataSize)})`;
		}
		
		if (duration !== undefined) {
			message += ` [${duration}ms]`;
		}

		this.debug(message);
	}

	public logAuthenticationAttempt(method: string, success: boolean, details?: any): void {
		const emoji = success ? '✅' : '❌';
		const message = `🔐 Auth: ${emoji} ${method}`;
		
		if (success) {
			this.info(message, details);
		} else {
			this.warning(message, details);
		}
	}

	public logConnectionState(state: string, host: string, details?: any): void {
		const stateEmojis: { [key: string]: string } = {
			'CONNECTING': '🔄',
			'CONNECTED': '✅',
			'DISCONNECTED': '❌',
			'RECONNECTING': '🔁',
			'ERROR': '💥'
		};
		
		const emoji = stateEmojis[state] || '📡';
		const message = `${emoji} Connection: ${state} to ${host}`;
		
		this.info(message, details);
	}

	public logServerInstallation(phase: string, progress?: number, details?: any): void {
		let message = `⚙️  Server Install: ${phase}`;
		
		if (progress !== undefined) {
			message += ` (${progress}%)`;
		}
		
		this.info(message, details);
	}

	// Performance timing helpers
	public startTimer(operationName: string): () => void {
		const startTime = Date.now();
		return () => {
			const duration = Date.now() - startTime;
			this.debug(`⏱️  Timer: ${operationName} completed in ${duration}ms`);
		};
	}

	// Batch logging for high-frequency operations
	private batchBuffer: Array<{ level: LogLevel; message: string; data?: any; timestamp: number }> = [];
	private batchTimeout: NodeJS.Timeout | undefined;

	public logBatched(level: LogLevel, message: string, data?: any): void {
		this.batchBuffer.push({ level, message, data, timestamp: Date.now() });
		
		if (this.batchTimeout) {
			clearTimeout(this.batchTimeout);
		}
		
		this.batchTimeout = setTimeout(() => {
			this.flushBatch();
		}, 100); // Flush every 100ms
	}

	private flushBatch(): void {
		if (this.batchBuffer.length === 0) return;
		
		this.debug(`📦 Batch Log: ${this.batchBuffer.length} operations in last 100ms`);
		
		for (const entry of this.batchBuffer) {
			this.logLevel(entry.level, entry.message, entry.data);
		}
		
		this.batchBuffer = [];
	}

	private now(): string {
		const now = new Date();
		return padLeft(now.getUTCHours() + '', 2, '0')
			+ ':' + padLeft(now.getMinutes() + '', 2, '0')
			+ ':' + padLeft(now.getUTCSeconds() + '', 2, '0') 
			+ '.' + padLeft(now.getMilliseconds() + '', 3, '0');
	}

	public show(): void {
		this.output.show();
	}

	public dispose(): void {
		if (this.batchTimeout) {
			clearTimeout(this.batchTimeout);
			this.flushBatch();
		}
		this.output.dispose();
	}
}

function padLeft(s: string, n: number, pad = ' '): string {
	return pad.repeat(Math.max(0, n - s.length)) + s;
}
