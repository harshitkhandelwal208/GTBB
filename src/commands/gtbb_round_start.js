const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
} = require('discord.js');
const { GTBBBase } = require('../models/GTBBBase');
const { GTBBWeek } = require('../models/GTBBWeek');
const { GTBBResponse } = require('../models/GTBBResponse');
const RoundMessage = require('../models/RoundMessage');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('gtbb_round_start')
        .setDescription('Start a GTBB round in the active week')
        .addIntegerOption(o =>
            o.setName('round_number')
                .setDescription('Round number')
                .setRequired(true)
        ),
    async execute(interaction, client, logger) {
        try {
            await interaction.deferReply({ ephemeral: false });

            const week = await GTBBWeek.findOne({ status: 'active' });
            if (!week) {
                return await interaction.editReply({ content: 'No active week.' });
            }

            const round = interaction.options.getInteger('round_number');
            const base = await GTBBBase.findOne({ week: week._id, roundNumber: round });
            if (!base) {
                return await interaction.editReply({ content: 'No base stored for this round.' });
            }

            // Get who has already answered
            const responses = await GTBBResponse.find({ base: base._id });
            const userIds = [...new Set(responses.map(r => r.userId))];

            // Helper: fetch display name (nickname > username)
            const getDisplayName = async (uid) => {
                try {
                    const member = await interaction.guild.members.fetch(uid);
                    return `[${member.displayName}](https://discordapp.com/users/${uid})`;
                } catch {
                    try {
                        const user = await client.users.fetch(uid);
                        return `[${user.username}](https://discordapp.com/users/${uid})`;
                    } catch {
                        return `[User ${uid}](https://discordapp.com/users/${uid})`;
                    }
                }
            };

            let answeredString;
            if (userIds.length > 0) {
                const names = await Promise.all(userIds.map(getDisplayName));
                answeredString = names.join('\n'); // newline separated
            } else {
                answeredString = 'No one has answered yet.';
            }

            // Create the embed
            const embed = new EmbedBuilder()
                .setTitle(`GTBB Week #${week.weekNumber} - Round #${round}`)
                .setImage(base.baseImage)
                .setDescription('Who built this base? Choose your answer below:')
                .addFields({
                    name: 'Already answered',
                    value: answeredString,
                });

            // Create option buttons
            const buttons = new ActionRowBuilder().addComponents(
                ...['a', 'b', 'c', 'd', 'e'].map((opt, idx) =>
                    new ButtonBuilder()
                        .setCustomId(`gtbb_answer_${week._id}_${base._id}_${opt}`)
                        .setLabel(`${String.fromCharCode(65 + idx)}. ${base.options[idx]}`)
                        .setStyle(ButtonStyle.Primary)
                )
            );

            // Send the round message
            const sentMsg = await interaction.editReply({ embeds: [embed], components: [buttons] });

            // Save or update the message ID in RoundMessage collection
            await RoundMessage.findOneAndUpdate(
                { base: base._id },
                { messageId: sentMsg.id },
                { upsert: true, new: true }
            );

            logger.info(`Round ${round} started by ${interaction.user.tag}, message ID ${sentMsg.id} stored.`);
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
    },
};