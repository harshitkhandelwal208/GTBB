const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { GTBBWeek } = require('../models/GTBBWeek');
const { GTBBResponse } = require('../models/GTBBResponse');
const { GTBBPoint } = require('../models/GTBBPoint');
const axios = require('axios');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('gtbb_week_end')
        .setDescription('Ends the current GTBB week and posts results'),
    async execute(interaction, client, logger) {
        try {
            await interaction.deferReply({ ephemeral: false });

            let week = await GTBBWeek.findOne({ status: 'active' });
            if (!week) return await interaction.editReply({ content: 'No active week.' });
            week.status = 'ended'; await week.save();

            // Get adjectives for leaderboard using Datamuse API
            let adjectives = [];
            try {
                const adjRes = await axios.get(
                    'https://api.datamuse.com/words?rel_jjb=champion&max=15'
                );
                adjectives = adjRes.data.map(w => w.word);
                if (adjectives.length === 0) {
                    adjectives = ['amazing', 'brilliant', 'cool', 'smart', 'quick', 'sharp', 'wise', 'witty', 'lucky', 'skilled'];
                }
            } catch {
                adjectives = ['amazing', 'brilliant', 'cool', 'smart', 'quick', 'sharp', 'wise', 'witty', 'lucky', 'skilled'];
            }

            // Summarize week
            const responses = await GTBBResponse.find({ week: week._id });
            let points = {};
            for (const r of responses) {
                points[r.userId] = (points[r.userId] || 0) + (r.correct ? 1 : 0);
            }

            // Save points to DB
            for (const [uid, pts] of Object.entries(points)) {
                await GTBBPoint.create({ userId: uid, week: week._id, points: pts });
            }

            // Prepare leaderboard (top 10)
            let sorted = Object.entries(points).sort(([, a], [, b]) => b - a).slice(0, 10);
            let leaderboard = [];
            let prevPoints = null, rank = 0, numAtRank = 0;
            for (const [i, [uid, pts]] of sorted.entries()) {
                if (pts !== prevPoints) { rank += numAtRank + 1; numAtRank = 0; }
                else numAtRank++;
                leaderboard.push({ rank, uid, pts });
                prevPoints = pts;
            }

            // Fetch nicknames (fallback to username if not in guild)
            const nicknames = {};
            for (const entry of leaderboard) {
                try {
                    const member = await interaction.guild.members.fetch(entry.uid);
                    nicknames[entry.uid] = member.displayName;
                } catch {
                    try {
                        const user = await client.users.fetch(entry.uid);
                        nicknames[entry.uid] = user.username;
                    } catch {
                        nicknames[entry.uid] = `User ${entry.uid}`;
                    }
                }
            }

            // Single announcement (with embed)
            let embed = new EmbedBuilder()
                .setTitle(`GTBB Week #${week.weekNumber} Leaderboard`)
                .setColor(0xFFD700)
                .setDescription(
                    leaderboard.length === 0
    ? 'No one participated!'
    : leaderboard.map((e, idx) => {
        let medal = '';
        if (e.rank === 1) medal = '🥇 ';
        else if (e.rank === 2) medal = '🥈 ';
        else if (e.rank === 3) medal = '🥉 ';

        return `${medal}In **${adjectives[idx % adjectives.length]}** ${ordinal(e.rank)}: [${nicknames[e.uid]}](https://discordapp.com/users/${e.uid}) (${e.pts} pts)`;
    }).join('\n')

                );

            await interaction.editReply({
                content: `GTBB week ended! 🎉\nResults for Week #${week.weekNumber}:`,
                embeds: [embed]
            });

            logger.info(`Week ${week.weekNumber} ended by ${interaction.user.tag}`);
        } catch (err) {
            logger.error('Error ending week: ' + err);
            try {
                if (interaction.deferred || interaction.replied) {
                    await interaction.editReply({ content: 'Error ending week.' });
                } else {
                    await interaction.reply({ content: 'Error ending week.', ephemeral: true });
                }
            } catch {}
        }
    }
};

function ordinal(n) {
    const ord = ["th", "st", "nd", "rd"], v = n % 100;
    return n + (ord[(v - 20) % 10] || ord[v] || ord[0]);
}
