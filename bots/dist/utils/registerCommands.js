import { REST, Routes } from 'discord.js';
import { env } from '../config/env.js';
export const registerCommands = async (commands) => {
    const rest = new REST({ version: '10' }).setToken(env.token);
    const body = commands.map((command) => command.data);
    if (env.guildId) {
        await rest.put(Routes.applicationGuildCommands(env.clientId, env.guildId), { body });
        console.log(`[registerCommands] Registered ${body.length} guild command(s) for guild ${env.guildId}`);
    }
    else {
        await rest.put(Routes.applicationCommands(env.clientId), { body });
        console.log(`[registerCommands] Registered ${body.length} global command(s)`);
    }
};
//# sourceMappingURL=registerCommands.js.map