import { spawn } from 'node:child_process';
export const splitCommand = (raw) => {
    const normalized = raw.replace(/\\"/g, '"').trim();
    const tokens = normalized.match(/(?:[^\s"]+|"[^"]*")+/g) ?? [];
    const [head, ...tail] = tokens;
    if (!head) {
        throw new Error(`Invalid command "${raw}"`);
    }
    const unquote = (value) => value.replace(/^"(.*)"$/, '$1');
    return {
        command: unquote(head),
        args: tail.map(unquote),
    };
};
export const runCommand = async (command, args, options = {}) => {
    const { cwd, env, input, timeoutMs } = options;
    return new Promise((resolve, reject) => {
        const child = spawn(command, args, { cwd, env, stdio: ['pipe', 'pipe', 'pipe'] });
        const stdoutChunks = [];
        const stderrChunks = [];
        let timeout;
        if (timeoutMs && timeoutMs > 0) {
            timeout = setTimeout(() => {
                child.kill('SIGTERM');
                reject(new Error(`Command timed out after ${timeoutMs}ms: ${command} ${args.join(' ')}`));
            }, timeoutMs);
        }
        if (input) {
            child.stdin.write(input);
            child.stdin.end();
        }
        child.stdout.on('data', (chunk) => stdoutChunks.push(Buffer.from(chunk)));
        child.stderr.on('data', (chunk) => stderrChunks.push(Buffer.from(chunk)));
        child.on('error', (error) => {
            if (timeout)
                clearTimeout(timeout);
            reject(error);
        });
        child.on('close', (code) => {
            if (timeout)
                clearTimeout(timeout);
            resolve({
                stdout: Buffer.concat(stdoutChunks).toString(),
                stderr: Buffer.concat(stderrChunks).toString(),
                exitCode: code,
            });
        });
    });
};
//# sourceMappingURL=command.js.map