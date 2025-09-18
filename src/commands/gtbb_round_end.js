const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { GTBBBase } = require('../models/GTBBBase');
const { GTBBWeek } = require('../models/GTBBWeek');
const { GTBBResponse } = require('../models/GTBBResponse');
const RoundMessage = require('../models/RoundMessage');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('gtbb_round_end')
        .setDescription('Ends the current GTBB round, locks answers, and gives points'),
    async execute(interaction, client, logger) {
        try {
            await interaction.deferReply();
            let week = await GTBBWeek.findOne({ status: 'active' });
            if (!week) return await interaction.editReply({ content: 'No active week.' });

            // Find round not locked
            let base = await GTBBBase.findOne({ week: week._id, locked: { $ne: true } });
            if (!base) return await interaction.editReply({ content: 'No running round to end.' });

            // Lock base
            base.locked = true;
            await base.save();

            // Tally responses
            const responses = await GTBBResponse.find({ base: base._id });
            let winners = [];
            let optionMap = { a: [], b: [], c: [], d: [], e: [] };

            for (const resp of responses) {
                // Record who answered which option
                optionMap[resp.answer]?.push(resp.userId);

                // Mark correct answers
                if (resp.answer === base.correctOption) {
                    winners.push(resp.userId);
                    resp.correct = true;
                    await resp.save();
                }
            }

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

            // Winners field
            const winnerList = winners.length
                ? (await Promise.all(winners.map(getDisplayName))).join('\n')
                : 'No one got it right!';

            // Options breakdown
            const optionFields = await Promise.all(
                base.options.map(async (optText, idx) => {
                    const optLetter = ['a', 'b', 'c', 'd', 'e'][idx];
                    const users = optionMap[optLetter] || [];
                    const userList = users.length
                        ? (await Promise.all(users.map(getDisplayName))).join('\n')
                        : 'No answers';
                    return {
                        name: `${String.fromCharCode(65 + idx)}. ${optText}`,
                        value: userList,
                        inline: true
                    };
                })
            );

            // Create embed
            let embed = new EmbedBuilder()
                .setTitle(`GTBB Round #${base.roundNumber} Results`)
                .setImage(base.baseImage)
                .addFields(
                    { name: 'Correct Answer', value: base.options[['a','b','c','d','e'].indexOf(base.correctOption)] },
                    { name: 'Winners', value: winnerList },
                    ...optionFields
                );

            // Disable all answer buttons by editing the stored round message
            const roundMsgDoc = await RoundMessage.findOne({ base: base._id });
            if (roundMsgDoc && roundMsgDoc.messageId) {
                const channel = interaction.channel;
                const roundMsg = await channel.messages.fetch(roundMsgDoc.messageId).catch(() => undefined);
                if (roundMsg) {
                    const disabledRow = new ActionRowBuilder().addComponents(
                        ...['a', 'b', 'c', 'd', 'e'].map((opt, idx) =>
                            new ButtonBuilder()
                                .setCustomId(`gtbb_answer_${week._id}_${base._id}_${opt}`)
                                .setLabel(String.fromCharCode(65 + idx) + '. ' + base.options[idx])
                                .setStyle(ButtonStyle.Primary)
                                .setDisabled(true)
                        )
                    );
                    await roundMsg.edit({ components: [disabledRow] });
                }
            }

            await interaction.editReply({ embeds: [embed] });
            logger.info(`Round ${base.roundNumber} ended by ${interaction.user.tag}`);
        } catch (err) {
            logger.error('Error ending round: ' + err);
            try {
                if (interaction.deferred || interaction.replied) {
                    await interaction.editReply({ content: 'Error ending round.' });
                } else {
                    await interaction.reply({ content: 'Error ending round.', ephemeral: true });
                }
            } catch {}
        }
    }
};