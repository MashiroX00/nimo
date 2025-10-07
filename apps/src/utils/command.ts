import { spawn } from 'node:child_process';

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

export const splitCommand = (raw: string): { command: string; args: string[] } => {
  const normalized = raw.replace(/\\"/g, '"').trim();
  const tokens = normalized.match(/(?:[^\s"]+|"[^"]*")+/g) ?? [];
  const [head, ...tail] = tokens;
  if (!head) {
    throw new Error(`Invalid command "${raw}"`);
  }

  const unquote = (value: string) => value.replace(/^"(.*)"$/, '$1');
  return {
    command: unquote(head),
    args: tail.map(unquote),
  };
};

export const runCommand = async (
  command: string,
  args: string[],
  options: RunCommandOptions = {},
): Promise<CommandResult> => {
  const { cwd, env, input, timeoutMs } = options;

  return new Promise<CommandResult>((resolve, reject) => {
    const child = spawn(command, args, { cwd, env, stdio: ['pipe', 'pipe', 'pipe'] });
    const stdoutChunks: Buffer[] = [];
    const stderrChunks: Buffer[] = [];

    let timeout: NodeJS.Timeout | undefined;
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
      if (timeout) clearTimeout(timeout);
      reject(error);
    });

    child.on('close', (code) => {
      if (timeout) clearTimeout(timeout);
      resolve({
        stdout: Buffer.concat(stdoutChunks).toString(),
        stderr: Buffer.concat(stderrChunks).toString(),
        exitCode: code,
      });
    });
  });
};
