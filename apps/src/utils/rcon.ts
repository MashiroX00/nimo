import { splitCommand, runCommand } from './command.js';
import { env } from '../config/env.js';
import { createLogger } from '../logger.js';

const log = createLogger('Rcon');
const rconCli = splitCommand(env.rconCli);

export type RconCommandOptions = {
  host?: string;
  port: number;
  password: string;
  command: string;
};

export const runRconCommand = async ({
  host = env.rconHost,
  port,
  password,
  command,
}: RconCommandOptions) => {
  const args = [
    ...rconCli.args,
    '-H',
    host,
    '-P',
    String(port),
    '-p',
    password,
    command,
  ];

  log.debug('Executing RCON command', { host, port, command });
  const result = await runCommand(rconCli.command, args);
  if (result.exitCode !== 0) {
    log.warn('RCON command returned non-zero exit code', {
      host,
      port,
      command,
      exitCode: result.exitCode,
      stderr: result.stderr,
      stdout: result.stdout,
    });
  }

  return result;
};
