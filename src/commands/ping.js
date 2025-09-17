const { SlashCommandBuilder } = require('discord.js');
module.exports = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Check client ping'),
    async execute(interaction, client, logger) {
        try {
            const sent = await interaction.reply({ content: 'Pinging...', fetchReply: true, ephemeral: true });
            await interaction.editReply({ content: `Pong! Client latency: ${sent.createdTimestamp - interaction.createdTimestamp}ms, API latency: ${Math.round(client.ws.ping)}ms`, ephemeral: true });
        } catch (err) {
            logger.error('Ping command error: ' + err);
            await interaction.reply({ content: 'Ping error.', ephemeral: true });
        }
    }
};
