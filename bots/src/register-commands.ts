import { loadCommands } from './utils/commandLoader.js';
import { registerCommands } from './utils/registerCommands.js';

const run = async () => {
  const commands = await loadCommands();
  await registerCommands(Array.from(commands.values()));
};

run().then(() => {
  console.log('✅ Slash commands registered successfully');
}).catch((error) => {
  console.error('Failed to register commands', error);
  process.exit(1);
});

