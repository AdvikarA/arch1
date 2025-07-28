declare module 'vscode' {
    export interface RemoteAuthorityResolverContext {
        resolveAttempt: number;
    }

    export interface ResolverResult {
        authority: ResolvedAuthority;
        extensionHostEnv?: { [key: string]: string };
    }

    export interface ResolvedAuthority {
        host: string;
        port: number;
        connectionToken: string;
    }

    export interface RemoteAuthorityResolver {
        resolve(authority: string, context: RemoteAuthorityResolverContext): Promise<ResolverResult>;
    }

    export interface RemoteAuthorityResolverError {
        NotAvailable(message: string): Error;
        TemporarilyNotAvailable(message: string): Error;
    }

    export namespace workspace {
        export function registerRemoteAuthorityResolver(authorityPrefix: string, resolver: RemoteAuthorityResolver): vscode.Disposable;
        export function registerResourceLabelFormatter(formatter: ResourceLabelFormatter): vscode.Disposable;
    }

    export interface ResourceLabelFormatter {
        scheme: string;
        authority?: string;
        formatting: ResourceLabelFormatting;
    }

    export interface ResourceLabelFormatting {
        label: string;
        separator: string;
        tildify?: boolean;
        workspaceSuffix?: string;
    }

    export namespace window {
        export function withProgress<R>(options: ProgressOptions, task: (progress: Progress<{ message?: string; increment?: number }>) => Promise<R>): Promise<R>;
    }

    export interface ProgressOptions {
        location: ProgressLocation;
        title?: string;
        cancellable?: boolean;
    }

    export interface Progress<T> {
        report(value: T): void;
    }

    export enum ProgressLocation {
        SourceControl = 1,
        Window = 10,
        Notification = 15
    }
}

// Fix for Node.js navigator global issue
declare global {
    var navigator: any;
} 