import { SlashCommandBuilder } from 'discord.js';
import type { Command } from '../types/command.js';

const data = new SlashCommandBuilder()
  .setName('ping')
  .setDescription('Check that the bot is online');

export default {
  data: data.toJSON(),
  async execute(interaction) {
    await interaction.reply({ content: 'Pong!', ephemeral: true });
  },
} satisfies Command;

