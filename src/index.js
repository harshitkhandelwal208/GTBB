// Discord.js v14+ GTBB Quiz Bot with MongoDB, Express Keepalive, Winston logging
require('dotenv').config();
const { Client, GatewayIntentBits, Partials, Collection, ActivityType, REST, Routes } = require('discord.js');
const mongoose = require('mongoose');
const winston = require('winston');
const express = require('express');
const path = require('path');
const fs = require('fs');

// ----- Winston LOGGING -----
const logger = winston.createLogger({
    transports: [
        new winston.transports.File({
            filename: 'gtbb.log',
            format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.json()
            ),
        }),
    ],
});

// ----- Express Keepalive -----
const app = express();
const KEEPALIVE_USER = process.env.KEEPALIVE_USER;
const KEEPALIVE_PASS = process.env.KEEPALIVE_PASS;
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => res.send('GTBB Bot is alive!'));
app.get('/logs', (req, res) => {
    const auth = {login: KEEPALIVE_USER, password: KEEPALIVE_PASS};
    const b64auth = (req.headers.authorization || '').split(' ')[1] || '';
    const [login, password] = Buffer.from(b64auth, 'base64').toString().split(':');
    if (login && password && login === auth.login && password === auth.password) {
        res.sendFile(path.resolve('./gtbb.log'));
    } else {
        res.set('WWW-Authenticate', 'Basic realm="401"');
        res.status(401).send('Authentication required.');
    }
});
app.listen(PORT, () => logger.info(`Keepalive running on port ${PORT}`));

// ----- Discord Client -----
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers, GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessageReactions,
    ],
    partials: [Partials.Channel, Partials.Message, Partials.Reaction],
});

// ----- Command Handler -----
client.commands = new Collection();
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'));
const commandsToRegister = [];

for (const file of commandFiles) {
    try {
        const command = require(path.join(commandsPath, file));
        if (!command || !command.data || !command.data.name) {
            console.warn(`Skipping command "${file}" because it does not export { data: { name } }.`);
            continue;
        }
        client.commands.set(command.data.name, command);
        // Only register non-dev commands globally
        if (!file.startsWith('dev_')) {
            commandsToRegister.push(command.data.toJSON());
        }
    } catch (e) {
        console.error(`Error loading command file "${file}":\n`, e);
    }
}

// ----- Discord Client Ready Event -----
client.once('clientReady', async () => {
    logger.info(`Logged in as ${client.user.tag}`);
    client.user.setActivity('🤔🤔 Guessing The BaseBuilder!', { type: ActivityType.Custom });

    // List servers on startup (with error handling)
    const guilds = await client.guilds.fetch();
    let names = [];
    for (const [id] of guilds) {
        try {
            const g = await client.guilds.fetch(id);
            if (g && g.name) {
                names.push(g.name);
            }
        } catch (e) {
            logger.warn(`Could not fetch guild ${id}: ${e}`);
        }
    }
    logger.info(`Servers: ${names.join(', ')}`);
    console.log(`Servers: ${names.join(', ')}`);

    // ----- Delete all global commands -----
    const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN);
    try {
        logger.info('Deleting all global application commands...');
        await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: [] });
        logger.info('All global commands deleted.');
    } catch (err) {
        logger.error('Error deleting global commands: ' + err);
    }

    // ----- Register all commands -----
    try {
        logger.info('Registering global slash commands...');
        await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID),
            { body: commandsToRegister }
        );
        logger.info('All global slash commands registered.');
    } catch (error) {
        logger.error('Error registering commands: ' + error);
    }
});

// ----- MongoDB -----
mongoose.connect(process.env.MONGO_URI)
  .then(() => logger.info('Connected to MongoDB'))
  .catch((err) => logger.error('MongoDB connection error: ' + err));

// ----- Interaction Create -----
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand() && !interaction.isButton()) return;

    // Restrict commands except leaderboard to users with GTBB_ADMIN_ROLE
    const GTBB_ADMIN_ROLE = process.env.GTBB_ADMIN_ROLE_ID;
    if (interaction.isChatInputCommand()) {
        const cmdName = interaction.commandName;
        if (!['gtbb_leaderboard', 'ping'].includes(cmdName)) {
            if (!interaction.member.roles.cache.has(GTBB_ADMIN_ROLE)) {
                await interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
                return;
            }
        }
        const command = client.commands.get(cmdName);
        if (!command) return;
        try {
            await command.execute(interaction, client, logger);
        } catch (err) {
            logger.error(`Error in command ${cmdName}: ${err}`);
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ content: 'There was an error executing this command.', ephemeral: true });
            } else {
                await interaction.reply({ content: 'There was an error executing this command.', ephemeral: true });
            }
        }
    } else if (interaction.isButton()) {
        // Button handling for gtbb_round_start
        try {
            const buttonHandler = require('./utils/buttonHandler.js');
            await buttonHandler(interaction, client, logger);
        } catch (err) {
            logger.error('Error handling button: ' + err);
            try { await interaction.reply({ content: 'Button handler error.', ephemeral: true }); } catch {}
        }
    }
});

// ----- Error Handling -----
process.on('unhandledRejection', err => {
    logger.error('Unhandled promise rejection: ' + err);
});
process.on('uncaughtException', err => {
    logger.error('Uncaught Exception: ' + err);
});
console.log(`\nKeepalive running!\n- Root: http://localhost:${PORT}/\n- Logs: http://localhost:${PORT}/logs\n`);
// ----- Login -----
client.login(process.env.BOT_TOKEN);

module.exports = { client, logger };