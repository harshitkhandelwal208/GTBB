const { SlashCommandBuilder } = require('discord.js');
const { GTBBWeek } = require('../models/GTBBWeek');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('gtbb_week_start')
        .setDescription('Start the next GTBB week (activates stored questions and optionally pings a role)')
        .addRoleOption(option =>
            option.setName('ping_role')
                .setDescription('Role to ping for GTBB week start')
                .setRequired(false)
        ),
    async execute(interaction, client, logger) {
        try {
            await interaction.deferReply();

            // End the current active week, if any
            const currentActive = await GTBBWeek.findOne({ status: 'active' });
            if (currentActive) {
                currentActive.status = 'ended';
                await currentActive.save();
            }

            // Find the next week to activate
            const nextWeek = await GTBBWeek.findOne({ status: 'next' });
            if (!nextWeek) {
                return await interaction.editReply({
                    content: 'No GTBB week is prepared (no bases stored for the next week yet). Please store questions with `/gtbb_store` first.'
                });
            }

            nextWeek.status = 'active';
            await nextWeek.save();

            logger.info(`GTBB week #${nextWeek.weekNumber} started by ${interaction.user.tag}`);

            // Handle role ping
            const role = interaction.options.getRole('ping_role');
            const pingText = role ? `<@&${role.id}> ` : '';

            await interaction.editReply({
                content: `${pingText}GTBB Week #${nextWeek.weekNumber} has started! Good luck to all participants!`,
                allowedMentions: role
                    ? { roles: [role.id] } // only allow this specific role to be pinged
                    : { parse: [] }        // no role pings
            });
        } catch (err) {
            logger.error('Error starting new week: ' + err);
            try {
                if (interaction.deferred || interaction.replied) {
                    await interaction.editReply({ content: 'Error starting new week.' });
                } else {
                    await interaction.reply({ content: 'Error starting new week.', ephemeral: true });
                }
            } catch {}
        }
    }
};