import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, ModalBuilder, StringSelectMenuBuilder, TextInputBuilder, TextInputStyle, } from 'discord.js';
const statusColor = {
    ACTIVE: 0x22c55e,
    INACTIVE: 0x6b7280,
    PENDING: 0xf59e0b,
};
const formatDate = (value) => {
    if (!value)
        return 'N/A';
    const date = typeof value === 'string' ? new Date(value) : value;
    if (Number.isNaN(date.getTime()))
        return 'N/A';
    return `<t:${Math.floor(date.getTime() / 1000)}:f>`;
};
export const createDockerEmbed = (docker, monitor) => {
    const fields = [
        { name: 'Status', value: docker.status, inline: true },
        { name: 'Type', value: docker.type ?? 'N/A', inline: true },
        { name: 'PID', value: docker.pid ? String(docker.pid) : 'N/A', inline: true },
        {
            name: 'Ports',
            value: `Local: ${docker.localport ?? 'N/A'} | Bind: ${docker.bindport ?? 'N/A'}`,
            inline: true,
        },
        {
            name: 'Compose',
            value: docker.dockercompose ?? 'N/A',
            inline: false,
        },
        {
            name: 'Folder',
            value: docker.dockerlocation ?? 'N/A',
            inline: false,
        },
        {
            name: 'Created',
            value: formatDate(docker.createdAt),
            inline: true,
        },
        {
            name: 'Updated',
            value: formatDate(docker.updatedAt),
            inline: true,
        },
    ];
    if (monitor) {
        fields.push({
            name: 'CPU',
            value: monitor.cpu !== null && monitor.cpu !== undefined ? `${monitor.cpu.toFixed(2)}%` : 'N/A',
            inline: true,
        });
        fields.push({
            name: 'Memory',
            value: monitor.ram !== null && monitor.ram !== undefined
                ? `${monitor.ram.toFixed(2)} MiB`
                : 'N/A',
            inline: true,
        });
    }
    return new EmbedBuilder()
        .setTitle(`Docker - ${docker.name}`)
        .setDescription(docker.description ?? 'No description provided')
        .setColor(statusColor[docker.status])
        .setFields(fields);
};
export const createEmptyDockerEmbed = () => new EmbedBuilder()
    .setTitle('Docker Management')
    .setDescription('Select a docker from the menu below or press Refresh to reload data.')
    .setColor(0x3b82f6);
export const createDockerSelectRow = (dockers, selectedId) => {
    const menu = new StringSelectMenuBuilder()
        .setCustomId('docker:select')
        .setPlaceholder('Pick a docker to manage');
    if (dockers.length === 0) {
        menu
            .setPlaceholder('No docker available')
            .setDisabled(true)
            .addOptions([
            {
                label: 'No docker',
                value: 'none',
                description: 'No docker entries were found',
            },
        ]);
    }
    else {
        menu.addOptions(dockers.map((docker) => ({
            label: docker.name,
            value: docker.id,
            description: docker.description?.slice(0, 90) ?? docker.status,
            default: selectedId === docker.id,
        })));
    }
    return new ActionRowBuilder().addComponents(menu);
};
export const createDockerActionRow = (docker) => {
    const startButton = new ButtonBuilder()
        .setCustomId(`docker:action:start:${docker.id}`)
        .setLabel('Start')
        .setStyle(ButtonStyle.Success)
        .setDisabled(docker.status === 'ACTIVE' || docker.status === 'PENDING');
    const stopButton = new ButtonBuilder()
        .setCustomId(`docker:action:stop:${docker.id}`)
        .setLabel('Stop')
        .setStyle(ButtonStyle.Danger)
        .setDisabled(docker.status !== 'ACTIVE');
    const refreshButton = new ButtonBuilder()
        .setCustomId(`docker:action:refresh:${docker.id}`)
        .setLabel('Refresh')
        .setStyle(ButtonStyle.Secondary);
    return new ActionRowBuilder().addComponents(startButton, stopButton, refreshButton);
};
export const createStopModal = (dockerId, messageId) => {
    const reasonInput = new TextInputBuilder()
        .setCustomId('reason')
        .setLabel('Stop reason (optional)')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(false)
        .setPlaceholder('Add a note for this action')
        .setMaxLength(200);
    return new ModalBuilder()
        .setCustomId(`docker:modal:stop:${dockerId}:${messageId}`)
        .setTitle('Stop Docker')
        .addComponents(new ActionRowBuilder().addComponents(reasonInput));
};
//# sourceMappingURL=docker.js.map