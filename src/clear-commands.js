// Dev terminal command: node src/commands/dev_clear_commands.js
require('dotenv').config();
const { REST, Routes } = require('discord.js');
const { client } = require('./index.js'); // Adjust path if needed

const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN);

(async () => {
    try {
        // Wait for client to be ready
        if (!client.isReady()) {
            await new Promise(resolve => client.once('clientReady', resolve));
        }

        console.log('Deleting all global application commands...');
        await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: [] });
        console.log('Global commands deleted.');

        // Clear per-guild commands
        const guilds = client.guilds.cache.map(guild => guild.id);
        for (const guildId of guilds) {
            await rest.put(Routes.applicationGuildCommands(process.env.CLIENT_ID, guildId), { body: [] });
            console.log(`Guild commands deleted for ${guildId}`);
        }
    } catch (err) {
        console.error('Error clearing commands:', err);
    } finally {
        client.destroy();
    }
})();