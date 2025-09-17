// Run this to register commands: node src/utils/deploy-commands.js
require('dotenv').config();
const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
const commands = [];
const commandsPath = path.join(__dirname, '../commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js') && !file.startsWith('dev_'));
for (const file of commandFiles) {
    const command = require(path.join(commandsPath, file));
    if ('data' in command && 'execute' in command) {
        commands.push(command.data.toJSON());
    }
}
const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN);
(async () => {
    try {
        await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID),
            { body: commands }
        );
        console.log('Commands registered globally.');
    } catch (error) {
        console.error(error);
    }
})();
