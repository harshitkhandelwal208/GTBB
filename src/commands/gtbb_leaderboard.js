const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { GTBBPoint } = require('../models/GTBBPoint');
const { GTBBWeek } = require('../models/GTBBWeek');
module.exports = {
    data: new SlashCommandBuilder()
        .setName('gtbb_leaderboard')
        .setDescription('Show the GTBB leaderboard')
        .addSubcommand(s =>
            s.setName('week')
             .setDescription('Leaderboard for a specific week')
             .addIntegerOption(o => o.setName('week_number').setDescription('Week number'))
        )
        .addSubcommand(s =>
            s.setName('overall')
             .setDescription('Overall leaderboard (all weeks)')
        ),
    async execute(interaction, client, logger) {
        try {
            let sub = interaction.options.getSubcommand();
            let leaderboard = [];
            if (sub === 'week') {
                let weekNum = interaction.options.getInteger('week_number');
                let week;
                if (!weekNum) {
                    week = await GTBBWeek.findOne({ status: 'active' }) || await GTBBWeek.findOne().sort({ weekNumber: -1 });
                } else {
                    week = await GTBBWeek.findOne({ weekNumber: weekNum });
                }
                if (!week) return await interaction.reply({ content: 'Week not found.', ephemeral: true });
                leaderboard = await GTBBPoint.find({ week: week._id }).sort({ points: -1 });
            } else {
                // Overall
                const agg = await GTBBPoint.aggregate([
                    { $group: { _id: '$userId', points: { $sum: '$points' } } },
                    { $sort: { points: -1 } }
                ]);
                leaderboard = agg.map(e => ({ userId: e._id, points: e.points }));
            }
            // Format as embed (show server nickname as hyperlink to Discord profile)
            let desc = '';
            for (let i = 0; i < leaderboard.length; i++) {
                let entry = leaderboard[i];
                let member;
                try {
                    member = await interaction.guild.members.fetch(entry.userId);
                } catch { member = null; }
                let name = member ? member.displayName : `User ${entry.userId}`;
                desc += `${i + 1}. [${name}](https://discordapp.com/users/${entry.userId}) — **${entry.points}** pts\n`;
            }
            let embed = new EmbedBuilder()
                .setTitle(`GTBB ${sub === 'week' ? 'Weekly' : 'Overall'} Leaderboard`)
                .setDescription(desc || 'No data yet.')
                .setColor(0x00AE86);
            await interaction.reply({ embeds: [embed] });
        } catch (err) {
            logger.error('Error showing leaderboard: ' + err);
            await interaction.reply({ content: 'Error showing leaderboard.', ephemeral: true });
        }
    }
};
