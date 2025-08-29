import { SlashCommandBuilder } from 'discord.js';
export default {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Replies with Pong! and the client ping'),
    async execute(interaction) {
        const ping = interaction.client.ws.ping;
        await interaction.reply(`Pong! Client ping: ${ping}ms`);
    },
};