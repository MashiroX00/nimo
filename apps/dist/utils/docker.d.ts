import type { ChildProcessWithoutNullStreams } from 'node:child_process';
import { type CommandResult } from './command.js';
export type ComposeOptions = {
    composeFile?: string | null;
    workingDirectory?: string | null;
    projectName: string;
    build?: boolean;
};
export declare const composeUp: (options: ComposeOptions) => Promise<CommandResult>;
export declare const composeDown: (options: ComposeOptions) => Promise<CommandResult>;
export declare const getContainerPid: (containerName: string) => Promise<number | null>;
export declare const isContainerRunning: (containerName: string) => Promise<boolean>;
export type ContainerStats = {
    cpuPercent: number;
    memoryPercent: number;
    memoryUsageMb: number;
    memoryLimitMb: number;
    raw: Record<string, string>;
};
export declare const getContainerStats: (containerName: string) => Promise<ContainerStats | null>;
export declare const waitForContainerToStop: (containerName: string, timeoutMs?: number, pollIntervalMs?: number) => Promise<boolean>;
export declare const waitForContainerToStart: (containerName: string, timeoutMs?: number, pollIntervalMs?: number) => Promise<boolean>;
export declare const sendCommandToContainer: (containerName: string, command: string) => Promise<CommandResult>;
export declare const tailContainerLogs: (containerName: string, onExit: (code: number | null) => void, options?: {
    since?: string;
    follow?: boolean;
}) => ChildProcessWithoutNullStreams;
//# sourceMappingURL=docker.d.ts.map