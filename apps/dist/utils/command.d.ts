export type CommandResult = {
    stdout: string;
    stderr: string;
    exitCode: number | null;
};
export type RunCommandOptions = {
    cwd?: string;
    env?: NodeJS.ProcessEnv;
    input?: string;
    timeoutMs?: number;
};
export declare const splitCommand: (raw: string) => {
    command: string;
    args: string[];
};
export declare const runCommand: (command: string, args: string[], options?: RunCommandOptions) => Promise<CommandResult>;
//# sourceMappingURL=command.d.ts.map