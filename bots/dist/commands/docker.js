import { SlashCommandBuilder, } from 'discord.js';
import { dockerApi } from '../services/dockerApi.js';
import { createDockerActionRow, createDockerEmbed, createDockerSelectRow, createEmptyDockerEmbed, } from '../components/docker.js';
const buildManageReply = async () => {
    const dockers = await dockerApi.listDockers();
    const selectedDocker = dockers[0] ?? null;
    const stats = selectedDocker ? await dockerApi.getDockerStats(selectedDocker.id).catch(() => null) : null;
    const embed = selectedDocker ? createDockerEmbed(selectedDocker, stats) : createEmptyDockerEmbed();
    const selectRow = createDockerSelectRow(dockers, selectedDocker?.id);
    const rows = selectedDocker ? [selectRow, createDockerActionRow(selectedDocker)] : [selectRow];
    return {
        embeds: [embed],
        components: rows,
    };
};
const execute = async (interaction) => {
    const subcommand = interaction.options.getSubcommand();
    if (subcommand === 'manage') {
        const reply = await buildManageReply();
        await interaction.reply({ ...reply, fetchReply: true });
        return;
    }
    if (subcommand === 'status') {
        const name = interaction.options.getString('name', true);
        await interaction.deferReply({ ephemeral: true });
        try {
            const docker = await dockerApi.getDockerByName(name);
            if (!docker) {
                await interaction.editReply({ content: `Docker "${name}" was not found.` });
                return;
            }
            const stats = await dockerApi.getDockerStats(docker.id).catch(() => null);
            const embed = createDockerEmbed(docker, stats);
            await interaction.editReply({ embeds: [embed] });
        }
        catch (error) {
            await interaction.editReply({
                content: `Unable to fetch docker information: ${error.message}`,
            });
        }
        return;
    }
    if (subcommand === 'command') {
        const name = interaction.options.getString('name', true);
        const commandInput = interaction.options.getString('input', true);
        await interaction.deferReply({ ephemeral: true });
        try {
            const docker = await dockerApi.getDockerByName(name);
            if (!docker) {
                await interaction.editReply({ content: `Docker "${name}" was not found.` });
                return;
            }
            const result = await dockerApi.sendCommand(docker.id, commandInput);
            await interaction.editReply({
                content: [
                    `Sent command to **${docker.name}**`,
                    `Exit code: ${result.exitCode ?? 'n/a'}`,
                    result.stdout ? `\nOutput:\n\`\`\`\n${result.stdout.slice(0, 1800)}\n\`\`\`` : '',
                    result.stderr ? `\nErrors:\n\`\`\`\n${result.stderr.slice(0, 1800)}\n\`\`\`` : '',
                ]
                    .filter(Boolean)
                    .join('\n'),
            });
        }
        catch (error) {
            await interaction.editReply({
                content: `Failed to send command: ${error.message}`,
            });
        }
        return;
    }
};
const data = new SlashCommandBuilder()
    .setName('docker')
    .setDescription('Manage Docker containers through the API')
    .addSubcommand((sub) => sub.setName('manage').setDescription('Open the interactive Docker management view'))
    .addSubcommand((sub) => sub
    .setName('status')
    .setDescription('Show the current status of a docker entry')
    .addStringOption((option) => option
    .setName('name')
    .setDescription('Docker name to inspect')
    .setRequired(true)))
    .addSubcommand((sub) => sub
    .setName('command')
    .setDescription('Send a raw command to the docker STDIN')
    .addStringOption((option) => option.setName('name').setDescription('Docker name to target').setRequired(true))
    .addStringOption((option) => option
    .setName('input')
    .setDescription('Command text to send')
    .setRequired(true)));
export default {
    data: data.toJSON(),
    execute,
};
//# sourceMappingURL=docker.js.map