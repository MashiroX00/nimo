import { dockerApi } from './dockerApi.js';
import { createDockerActionRow, createDockerEmbed, createDockerSelectRow, createEmptyDockerEmbed, createStopModal, } from '../components/docker.js';
const parseActionCustomId = (customId) => {
    const [, , action, dockerId] = customId.split(':');
    return { action, dockerId };
};
const parseModalCustomId = (customId) => {
    const [, , , dockerId, messageId] = customId.split(':');
    return { dockerId, messageId };
};
const resolveTargetMessage = async (interaction) => {
    if (!interaction.channel)
        return null;
    if (interaction.isModalSubmit()) {
        const { messageId } = parseModalCustomId(interaction.customId);
        return interaction.channel.messages.fetch(messageId).catch(() => null);
    }
    if (interaction.isButton() || interaction.isStringSelectMenu()) {
        return interaction.message;
    }
    return null;
};
const updateManageMessage = async (interaction, selectedId) => {
    const message = await resolveTargetMessage(interaction);
    if (!message)
        return;
    const dockers = await dockerApi.listDockers();
    const targetId = selectedId ?? dockers[0]?.id;
    let embed = createEmptyDockerEmbed();
    let actionRow = null;
    if (targetId) {
        const docker = dockers.find((item) => item.id === targetId);
        if (docker) {
            const stats = await dockerApi.getDockerStats(docker.id).catch(() => null);
            embed = createDockerEmbed(docker, stats);
            actionRow = createDockerActionRow(docker);
        }
    }
    const selectRow = createDockerSelectRow(dockers, targetId ?? undefined);
    const components = actionRow ? [selectRow, actionRow] : [selectRow];
    await message.edit({ embeds: [embed], components });
};
export const handleDockerSelect = async (interaction) => {
    const selectedId = interaction.values[0];
    try {
        await interaction.deferUpdate();
        await updateManageMessage(interaction, selectedId);
    }
    catch (error) {
        console.error('[docker] handleDockerSelect error', error);
        await interaction.followUp({
            content: `Cannot load docker information: ${error.message}`,
            ephemeral: true,
        });
    }
};
export const handleDockerAction = async (interaction) => {
    const { action, dockerId } = parseActionCustomId(interaction.customId);
    if (action === 'stop') {
        const modal = createStopModal(dockerId, interaction.message.id);
        await interaction.showModal(modal);
        return;
    }
    try {
        await interaction.deferUpdate();
        if (action === 'start') {
            const docker = await dockerApi.startDocker(dockerId);
            await interaction.followUp({
                content: `Started docker "${docker.name}" successfully.`,
                ephemeral: true,
            });
        }
        if (action === 'refresh') {
            await interaction.followUp({
                content: 'Docker information refreshed.',
                ephemeral: true,
            });
        }
    }
    catch (error) {
        await interaction.followUp({
            content: `Action failed: ${error.message}`,
            ephemeral: true,
        });
    }
    finally {
        await updateManageMessage(interaction, dockerId);
    }
};
export const handleDockerStopModal = async (interaction) => {
    const { dockerId } = parseModalCustomId(interaction.customId);
    const reason = interaction.fields.getTextInputValue('reason') || undefined;
    try {
        await interaction.deferReply({ ephemeral: true });
        const docker = await dockerApi.stopDocker(dockerId, reason);
        await interaction.editReply({
            content: `Stopped docker "${docker.name}" successfully.`,
        });
    }
    catch (error) {
        await interaction.editReply({
            content: `Failed to stop docker: ${error.message}`,
        });
    }
    finally {
        await updateManageMessage(interaction, dockerId);
    }
};
//# sourceMappingURL=dockerInteractions.js.map