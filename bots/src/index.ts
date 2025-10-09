import { Client, Collection, Events, GatewayIntentBits } from 'discord.js';
import { env } from './config/env.js';
import type { Command } from './types/command.js';
import { loadCommands } from './utils/commandLoader.js';
import { registerCommands } from './utils/registerCommands.js';
import {
  handleDockerAction,
  handleDockerCommandModal,
  handleDockerSelect,
  handleDockerStopModal,
} from './services/dockerInteractions.js';

const bootstrap = async () => {
  const client = new Client({
    intents: [GatewayIntentBits.Guilds],
  });

  const commands = await loadCommands();
  await registerCommands(Array.from(commands.values()));
  const commandCollection = new Collection<string, Command>(commands);

  client.once(Events.ClientReady, () => {
    console.log(`Ready • logged in as ${client.user?.tag}`);
  });

  client.on(Events.InteractionCreate, async (interaction) => {
    try {
      if (interaction.isChatInputCommand()) {
        const command = commandCollection.get(interaction.commandName);
        if (!command) {
          await interaction.reply({
            content: 'Command is not available right now.',
            ephemeral: true,
          });
          return;
        }

        await command.execute(interaction);
        return;
      }

      if (interaction.isStringSelectMenu() && interaction.customId === 'docker:select') {
        await handleDockerSelect(interaction);
        return;
      }

      if (interaction.isButton() && interaction.customId.startsWith('docker:action:')) {
        await handleDockerAction(interaction);
        return;
      }

      if (interaction.isModalSubmit() && interaction.customId.startsWith('docker:modal:')) {
        if (interaction.customId.includes(':stop:')) {
          await handleDockerStopModal(interaction);
          return;
        }
        if (interaction.customId.includes(':command:')) {
          await handleDockerCommandModal(interaction);
          return;
        }
      }
    } catch (error) {
      console.error('[interactionCreate] error', error);
      if (interaction.isRepliable()) {
        const content = `Unexpected error: ${(error as Error).message}`;
        if (interaction.deferred || interaction.replied) {
          await interaction.followUp({ content, ephemeral: true }).catch(() => null);
        } else {
          await interaction.reply({ content, ephemeral: true }).catch(() => null);
        }
      }
    }
  });

  await client.login(env.token);
};

bootstrap().catch((error) => {
  console.error('Failed to start Discord bot', error);
  process.exit(1);
});
