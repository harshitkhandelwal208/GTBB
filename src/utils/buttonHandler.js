const { GTBBResponse } = require('../models/GTBBResponse');
const { GTBBBase } = require('../models/GTBBBase');
const { GTBBWeek } = require('../models/GTBBWeek');
const { EmbedBuilder } = require('discord.js');

module.exports = async function(interaction, client, logger) {
    if (!interaction.isButton()) return;

    const customId = interaction.customId;
    // Format: gtbb_answer_<weekId>_<baseId>_<option>
    if (!customId.startsWith('gtbb_answer_')) return;

    // Robust customId parsing
    const parts = customId.split('_');
    if (parts.length < 5) {
        await interaction.reply({ content: 'Button data invalid. Please contact an admin.', ephemeral: true });
        return;
    }
    const weekId = parts[2];
    const baseId = parts[3];
    const answer = parts.slice(4).join('_');
    const userId = interaction.user.id;

    // Validate answer value
    const allowedAnswers = ['a', 'b', 'c', 'd', 'e'];
    if (!allowedAnswers.includes(answer)) {
        await interaction.reply({ content: 'Invalid answer choice.', ephemeral: true });
        return;
    }

    // Ensure base exists and is not locked
    const base = await GTBBBase.findById(baseId);
    if (!base) {
        await interaction.reply({ content: 'Could not find this round.', ephemeral: true });
        return;
    }
    if (base.locked) {
        await interaction.reply({ content: 'This round is closed. No further answers accepted.', ephemeral: true });
        return;
    }

    // Prevent double answering
    const already = await GTBBResponse.findOne({ base: baseId, userId });
    if (already) {
        return interaction.reply({ content: 'You have already answered this round!', ephemeral: true });
    }

    // Save response, mark correct if matches
    await GTBBResponse.create({
        week: base.week, // Use base.week to ensure correct reference
        base: baseId,
        userId,
        answer,
        correct: answer === base.correctOption
    });

    // Try to update the embed in the message to add this user to the "Already answered" field
    try {
        // Fetch all responses for this base
        const responses = await GTBBResponse.find({ base: baseId });
        let userIds = [...new Set(responses.map(r => r.userId))];
        let names = [];
        for (let uid of userIds) {
            try {
                const user = await client.users.fetch(uid);
                names.push(`[${user.username}](https://discordapp.com/users/${user.id})`);
            } catch {
                names.push(`[User ${uid}](https://discordapp.com/users/${uid})`);
            }
        }
        const answeredString = userIds.length
            ? names.join(', ')
            : 'No one has answered yet.';

        // Try to fetch and update the message embed
        try {
            const msg = await interaction.message.fetch();
            const oldEmbed = msg.embeds[0];
            const newEmbed = EmbedBuilder.from(oldEmbed)
                .setFields(
                    ...oldEmbed.fields.filter(f => f.name !== 'Already answered'),
                    { name: 'Already answered', value: answeredString }
                );
            await msg.edit({ embeds: [newEmbed], components: msg.components });
        } catch (msgErr) {
            logger.error('Could not fetch or edit message for answer embed: ' + msgErr);
            // Continue; don't block user feedback if embed can't be updated
        }
    } catch (embedErr) {
        logger.error('Error updating answer list embed: ' + embedErr);
        // Continue; don't block user feedback if embed can't be updated
    }

    // Always reply to the user, even if embed update fails
    await interaction.reply({ content: `Your answer (${answer.toUpperCase()}) has been recorded!`, ephemeral: true });
};