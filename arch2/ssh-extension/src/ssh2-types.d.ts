declare module 'ssh2' {
    export interface AuthHandlerResult {
        type: string;
        data?: any;
    }

    export interface ClientErrorExtensions {
        level?: string;
        description?: string;
    }

    export interface OpenSSHAgent {
        getIdentities(callback: (err: Error | undefined, publicKeys?: any[]) => void): void;
    }

    export class OpenSSHAgent {
        constructor(socketPath?: string);
        getIdentities(callback: (err: Error | undefined, publicKeys?: any[]) => void): void;
    }

    export interface ExecOptions {
        stream?: 'both' | 'stdout' | 'stderr';
        pty?: boolean;
        x11?: boolean;
        window?: {
            cols?: number;
            rows?: number;
            width?: number;
            height?: number;
        };
    }

    export interface ShellOptions {
        pty?: boolean;
        x11?: boolean;
        window?: {
            cols?: number;
            rows?: number;
            width?: number;
            height?: number;
        };
    }

    export interface SSHConnectConfig {
        host?: string;
        port?: number;
        username?: string;
        password?: string;
        privateKey?: Buffer | string;
        passphrase?: string;
        tryKeyboard?: boolean;
        authHandler?: AuthHandler;
        agent?: string | OpenSSHAgent;
        agentForward?: boolean;
        strictVendor?: boolean;
        keepaliveInterval?: number;
        keepaliveCountMax?: number;
        readyTimeout?: number;
        hostVerifier?: (key: Buffer) => boolean;
        algorithms?: {
            kex?: string[];
            cipher?: string[];
            serverHostKey?: string[];
            hmac?: string[];
            compress?: string[];
        };
        sock?: any;
        reconnect?: boolean;
        reconnectTries?: number;
        reconnectDelay?: number;
        uniqueId?: string;
        identity?: string | Buffer;
    }

    export interface ClientChannel {
        on(event: string, listener: Function): this;
        write(data: string | Buffer): boolean;
        end(): void;
        close(): void;
        stderr?: any;
        stdout?: any;
    }

    export class Client {
        on(event: 'ready', listener: (err: Error & ClientErrorExtensions) => void): this;
        on(event: string, listener: Function): this;
        connect(config: SSHConnectConfig): void;
        exec(command: string, callback: (err: Error | undefined, stream: ClientChannel) => void): void;
        exec(command: string, options: ExecOptions, callback: (err: Error | undefined, stream: ClientChannel) => void): void;
        shell(callback: (err: Error | undefined, stream: ClientChannel) => void): void;
        shell(options: ShellOptions, callback: (err: Error | undefined, stream: ClientChannel) => void): void;
        forwardOut(srcIP: string, srcPort: number, destIP: string, destPort: number, callback: (err: Error | undefined, stream: any) => void): void;
        openssh_forwardOutStreamLocal(socketPath: string, callback: (err: Error | undefined, stream: any) => void): void;
        end(): void;
    }

    export interface AuthHandler {
        (methodsLeft: string[] | null, partialSuccess: boolean | null, callback: (result: AuthHandlerResult) => void): void;
    }

    export namespace utils {
        export function parseKey(key: Buffer, passphrase?: string): any;
    }
}

declare module 'ssh2-streams' {
    export interface ParsedKey {
        type: string;
        comment: string;
        sign: (data: Buffer, algorithm?: string) => Buffer;
        verify: (data: Buffer, signature: Buffer, algorithm?: string) => boolean;
        getPublicSSH(): Buffer;
        isPrivateKey?: boolean;
        equals?: (other: ParsedKey) => boolean;
    }

    export interface PublicKeyEntry {
        type: string;
        comment: string;
        getPublicSSH(): Buffer;
    }

    export type KnownPublicKeys<T> = (T | PublicKeyEntry)[];
} 