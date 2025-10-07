import { existsSync } from 'node:fs';
import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import type { Command } from '../types/command.js';

const COMMAND_EXTENSIONS = ['.js', '.mjs', '.cjs', '.ts'];

export const loadCommands = async (): Promise<Map<string, Command>> => {
  const commands = new Map<string, Command>();
  const possibleDirs = [
    path.resolve(process.cwd(), 'dist', 'commands'),
    path.resolve(process.cwd(), 'src', 'commands'),
  ];

  const commandsDir = possibleDirs.find((dir) => existsSync(dir));
  if (!commandsDir) {
    console.warn('[commandLoader] No commands directory found.');
    return commands;
  }

  const files = await readdir(commandsDir);

  for (const file of files) {
    const ext = path.extname(file);
    if (!COMMAND_EXTENSIONS.includes(ext)) continue;

    const moduleUrl = pathToFileURL(path.join(commandsDir, file)).href;
    // eslint-disable-next-line no-await-in-loop
    const imported = await import(moduleUrl);
    const command: Command | undefined = imported.default;

    if (!command) {
      console.warn(`[commandLoader] File ${file} does not export a default command.`);
      continue;
    }

    commands.set(command.data.name, command);
  }

  return commands;
};

export const getCommandData = (commands: Map<string, Command>) =>
  Array.from(commands.values()).map((command) => command.data);
