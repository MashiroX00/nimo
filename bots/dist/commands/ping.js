import { SlashCommandBuilder } from 'discord.js';
const data = new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Check that the bot is online');
export default {
    data: data.toJSON(),
    async execute(interaction) {
        await interaction.reply({ content: 'Pong!', ephemeral: true });
    },
};
//# sourceMappingURL=ping.js.map