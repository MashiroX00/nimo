import path from 'node:path';
import type { ChildProcessWithoutNullStreams } from 'node:child_process';
import { spawn } from 'node:child_process';
import { env } from '../config/env.js';
import { runCommand, splitCommand, type RunCommandOptions, type CommandResult } from './command.js';

const dockerCli = splitCommand(env.dockerCli);
const dockerComposeCli = splitCommand(env.dockerComposeCommand);

const execDocker = (args: string[], options: RunCommandOptions = {}) =>
  runCommand(dockerCli.command, [...dockerCli.args, ...args], options);

const execDockerCompose = (args: string[], options: RunCommandOptions = {}) =>
  runCommand(dockerComposeCli.command, [...dockerComposeCli.args, ...args], options);

export type ComposeOptions = {
  composeFile?: string | null;
  workingDirectory?: string | null;
  projectName: string;
  build?: boolean;
};

const resolveWorkingDirectory = (composeFile?: string | null, workingDirectory?: string | null) => {
  if (workingDirectory) return workingDirectory;
  if (composeFile) return path.dirname(composeFile);
  return undefined;
};

export const composeUp = async (options: ComposeOptions): Promise<CommandResult> => {
  const { composeFile, workingDirectory, projectName, build } = options;
  const args: string[] = [];
  if (composeFile) {
    args.push('-f', composeFile);
  }
  if (projectName) {
    args.push('-p', projectName);
  }
  args.push('up', '-d');
  if (build) {
    args.push('--build');
  }

  const cwd = resolveWorkingDirectory(composeFile ?? undefined, workingDirectory ?? undefined);
  const execOptions: RunCommandOptions = {};
  if (cwd) {
    execOptions.cwd = cwd;
  }
  return execDockerCompose(args, execOptions);
};

export const composeDown = async (options: ComposeOptions): Promise<CommandResult> => {
  const { composeFile, workingDirectory, projectName } = options;
  const args: string[] = [];
  if (composeFile) {
    args.push('-f', composeFile);
  }
  if (projectName) {
    args.push('-p', projectName);
  }
  args.push('down');

  const cwd = resolveWorkingDirectory(composeFile ?? undefined, workingDirectory ?? undefined);
  const execOptions: RunCommandOptions = {};
  if (cwd) {
    execOptions.cwd = cwd;
  }
  return execDockerCompose(args, execOptions);
};

export const getContainerPid = async (containerName: string): Promise<number | null> => {
  const result = await execDocker(['inspect', '--format', '{{.State.Pid}}', containerName]);
  if (result.exitCode !== 0) {
    return null;
  }
  const trimmed = result.stdout.trim();
  if (!trimmed) return null;
  const pid = Number.parseInt(trimmed, 10);
  return Number.isNaN(pid) ? null : pid;
};

export const isContainerRunning = async (containerName: string): Promise<boolean> => {
  const result = await execDocker(['inspect', '--format', '{{.State.Running}}', containerName]);
  if (result.exitCode !== 0) {
    return false;
  }
  return result.stdout.trim().toLowerCase() === 'true';
};

export type ContainerStats = {
  cpuPercent: number;
  memoryPercent: number;
  memoryUsageMb: number;
  memoryLimitMb: number;
  raw: Record<string, string>;
};

const convertMemoryToMb = (value: string): number => {
  const match = value.trim().match(/^([\d.]+)\s*([kKmMgGtTpP]i?b)$/);
  if (!match) {
    const numeric = Number.parseFloat(value);
    return Number.isFinite(numeric) ? numeric : 0;
  }

  const numberPart = match[1];
  const unitPart = match[2];
  if (!numberPart || !unitPart) {
    return 0;
  }
  const units: Record<string, number> = {
    b: 1 / 1024 / 1024,
    kb: 1 / 1024,
    kib: 1 / 1024,
    mb: 1,
    mib: 1,
    gb: 1024,
    gib: 1024,
    tb: 1_048_576,
    tib: 1_048_576,
    pb: 1_073_741_824,
    pib: 1_073_741_824,
  };

  const unitKey = unitPart.toLowerCase();
  const multiplier = units[unitKey] ?? 1;
  return Number.parseFloat(numberPart) * multiplier;
};

export const getContainerStats = async (containerName: string): Promise<ContainerStats | null> => {
  const result = await execDocker([
    'stats',
    containerName,
    '--no-stream',
    '--format',
    '{{json .}}',
  ]);

  if (result.exitCode !== 0) {
    return null;
  }

  const trimmed = result.stdout.trim();
  if (!trimmed) return null;

  let raw: Record<string, string>;
  try {
    raw = JSON.parse(trimmed) as Record<string, string>;
  } catch {
    return null;
  }
  const cpuPercent = Number.parseFloat((raw.CPUPerc ?? '0').replace('%', '')) || 0;
  const memUsageRaw = raw.MemUsage?.split('/') ?? [];
  const memUsage = memUsageRaw[0]?.trim() ?? '0MiB';
  const memLimit = memUsageRaw[1]?.trim() ?? '0MiB';
  const memoryUsageMb = convertMemoryToMb(memUsage);
  const memoryLimitMb = convertMemoryToMb(memLimit);
  const memPerc = Number.parseFloat((raw.MemPerc ?? '0').replace('%', '')) || 0;

  return {
    cpuPercent,
    memoryPercent: memPerc,
    memoryUsageMb,
    memoryLimitMb,
    raw,
  };
};

export const waitForContainerToStop = async (
  containerName: string,
  timeoutMs = 15_000,
  pollIntervalMs = 1_000,
): Promise<boolean> => {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const running = await isContainerRunning(containerName);
    if (!running) return true;
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }
  return false;
};

export const waitForContainerToStart = async (
  containerName: string,
  timeoutMs = 15_000,
  pollIntervalMs = 1_000,
): Promise<boolean> => {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const running = await isContainerRunning(containerName);
    if (running) return true;
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }
  return false;
};

export const sendCommandToContainer = async (containerName: string, command: string) => {
  const trimmed = command.trim();
  if (!trimmed) {
    throw new Error('Stop command is empty');
  }

  return execDocker(
    ['exec', '-i', containerName, 'sh', '-c', 'cat > /proc/1/fd/0'],
    { input: `${trimmed}\n` },
  );
};

export const tailContainerLogs = (
  containerName: string,
  onExit: (code: number | null) => void,
  options: { since?: string; follow?: boolean } = {},
): ChildProcessWithoutNullStreams => {
  const args = [...dockerCli.args, 'logs', containerName];
  if (options.since) {
    args.push('--since', options.since);
  }
  if (options.follow ?? true) {
    args.push('-f');
  }

  const child = spawn(dockerCli.command, args, { stdio: ['pipe', 'pipe', 'pipe'] });
  child.on('close', (code) => onExit(code));
  child.on('error', () => onExit(null));
  return child;
};

export const stopContainer = async (containerName: string): Promise<CommandResult> => {
  const args = ['stop', '--time', String(env.dockerStopTimeoutSec), containerName];
  return execDocker(args);
};

const writeFileToContainer = async (
  containerName: string,
  filePath: string,
  content: string,
): Promise<CommandResult> => {
  const dir = path.posix.dirname(filePath);
  const shellScript = [
    `mkdir -p '${dir}'`,
    `cat <<'EOF' > '${filePath}'`,
    content,
    'EOF',
    `chmod +x '${filePath}'`,
  ].join('\n');

  return execDocker(['exec', containerName, 'sh', '-c', shellScript]);
};

export const ensureManagementScripts = async (
  containerName: string,
  stopCommand?: string | null,
): Promise<void> => {
  const toolsDir = '/docker-tools';
  const stopScriptPath = `${toolsDir}/stop.sh`;
  const runScriptPath = `${toolsDir}/command.sh`;

  const defaultStop = (stopCommand ?? '').trim();
  const stopScript = `#!/bin/sh
set -eo pipefail

DEFAULT_COMMAND=${JSON.stringify(defaultStop)}
CMD="$DEFAULT_COMMAND"

if [ "$#" -gt 0 ]; then
  CMD="$*"
fi

if [ -z "$CMD" ]; then
  echo "No stop command configured" >&2
  exit 1
fi

printf '%s\\n' "$CMD" > /proc/1/fd/0
`;

  const runScript = `#!/bin/sh
set -eo pipefail

if [ "$#" -eq 0 ]; then
  echo "Usage: $0 <command...>" >&2
  exit 1
fi

CMD="$*"
printf '%s\\n' "$CMD" > /proc/1/fd/0
`;

  const stopResult = await writeFileToContainer(containerName, stopScriptPath, stopScript);
  if (stopResult.exitCode !== 0) {
    throw new Error(
      `Failed to write stop script: ${stopResult.stderr || stopResult.stdout || 'unknown error'}`,
    );
  }

  const runResult = await writeFileToContainer(containerName, runScriptPath, runScript);
  if (runResult.exitCode !== 0) {
    throw new Error(
      `Failed to write command script: ${runResult.stderr || runResult.stdout || 'unknown error'}`,
    );
  }
};
