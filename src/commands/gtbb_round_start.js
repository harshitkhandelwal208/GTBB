const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { GTBBBase } = require('../models/GTBBBase');
const { GTBBWeek } = require('../models/GTBBWeek');
const { GTBBResponse } = require('../models/GTBBResponse');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('gtbb_round_start')
        .setDescription('Start a GTBB round in the active week')
        .addIntegerOption(o => o.setName('round_number').setDescription('Round number').setRequired(true)),
    async execute(interaction, client, logger) {
        try {
            await interaction.deferReply({ ephemeral: false });

            let week = await GTBBWeek.findOne({ status: 'active' });
            if (!week) return await interaction.editReply({ content: 'No active week.' });
            const round = interaction.options.getInteger('round_number');
            const base = await GTBBBase.findOne({ week: week._id, roundNumber: round });
            if (!base) return await interaction.editReply({ content: 'No base stored for this round.' });

            // Get who has already answered
            const responses = await GTBBResponse.find({ base: base._id });
            let userIds = [...new Set(responses.map(r => r.userId))];
            let names = [];
            for (let uid of userIds) {
                try {
                    const user = await client.users.fetch(uid);
                    names.push(`[${user.username}](https://discord.com/user/${user.nickname})`);
                } catch {
                    names.push(`[User ${uid}](https://discord.com/user/${uid})`);
                }
            }
            const answeredString = userIds.length
                ? names.join(', ')
                : 'No one has answered yet.';

            // Send embed with image, option buttons, and answered users
            const embed = new EmbedBuilder()
                .setTitle(`GTBB Week #${week.weekNumber} - Round #${round}`)
                .setImage(base.baseImage)
                .setDescription('Who built this base? Choose your answer below:')
                .addFields({
                    name: 'Already answered',
                    value: answeredString,
                });

            const buttons = new ActionRowBuilder().addComponents(
                ...['a', 'b', 'c', 'd', 'e'].map((opt, idx) =>
                    new ButtonBuilder()
                        .setCustomId(`gtbb_answer_${week._id}_${base._id}_${opt}`)
                        .setLabel(String.fromCharCode(65 + idx) + '. ' + base.options[idx])
                        .setStyle(ButtonStyle.Primary)
                )
            );
            await interaction.editReply({ embeds: [embed], components: [buttons] });

            logger.info(`Round ${round} started by ${interaction.user.tag}`);
        } catch (err) {
            logger.error('Error starting round: ' + err);
            try {
                if (interaction.deferred || interaction.replied) {
                    await interaction.editReply({ content: 'Error starting round.' });
                } else {
                    await interaction.reply({ content: 'Error starting round.', ephemeral: true });
                }
            } catch {}
        }
    }
};