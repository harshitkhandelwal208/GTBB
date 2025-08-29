import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import {
  getCurrentWeek, getWeek, updateWeek,
  getLeaderboard, getOverallLeaderboard
} from '../db/index.js';
import { requireHostRole } from '../utils/permissions.js';
import { fetchAdjectives } from '../utils/adjectives.js';

const HOST_ROLE_ID = process.env.GTBB_HOST_ROLE_ID;

export default {
  data: new SlashCommandBuilder()
    .setName('gtbb_week_end')
    .setDescription('End this GTBB week and announce results (GTBB Host only)'),
  async execute(interaction) {
    const ephemeral = false;
    if (!requireHostRole(interaction, HOST_ROLE_ID)) return;
    const weekNum = await getCurrentWeek();
    const week = await getWeek(weekNum);
    if (!week) return interaction.reply({ content: `No data for GTBB week ${weekNum}.`, ephemeral });

    week.ended = true;
    await updateWeek(weekNum, { ended: true });

    await interaction.reply({ content: `GTBB week ${weekNum} ended. Results incoming!`, ephemeral });

    // Per-base detailed results
    const baseResults = (week.bases || []).map((b, i) => {
      let correct = 0, total = 0;
      if (week.gtbbRounds) {
        for (const round of week.gtbbRounds) {
          if (round.baseIndex === i) {
            total += round.responses.length;
            correct += round.responses.filter(r => r.answer === b.correct).length;
          }
        }
      }
      return {
        title: `Base ${i+1}: ${b.baseName}`,
        correct,
        total,
        correctOption: b.options[b.correct]
      };
    });

    // Leaderboards
    const weekLeaderboard = await getLeaderboard(weekNum);
    const overallLeaderboard = await getOverallLeaderboard();

    const weekRankStrings = await Promise.all(weekLeaderboard.map(async (e, i) => {
      try {
        const user = await interaction.client.users.fetch(e.userId);
        return `**${i+1}.** ${user.username} - ${e.points} pts`;
      } catch {
        return `**${i+1}.** <@${e.userId}> - ${e.points} pts`;
      }
    }));

    const overallRankStrings = await Promise.all(overallLeaderboard.map(async (e, i) => {
      try {
        const user = await interaction.client.users.fetch(e.userId);
        return `**${i+1}.** ${user.username} - ${e.points} pts`;
      } catch {
        return `**${i+1}.** <@${e.userId}> - ${e.points} pts`;
      }
    }));

    // Detailed results embed
    const embed = new EmbedBuilder()
      .setTitle(`GTBB Week ${weekNum} Results`)
      .addFields(baseResults.map(r => ({
        name: r.title,
        value: `Correct: ${r.correct}/${r.total} (Builder: ${r.correctOption})`,
        inline: false
      })))
      .addFields([
        { name: 'GTBB Leaderboard', value: weekRankStrings.join('\n') || 'No scores.' },
        { name: 'Overall Leaderboard', value: overallRankStrings.join('\n') || 'No scores.' }
      ])
      .setColor(0x00AE86);

    await interaction.channel.send({ embeds: [embed] });

    // Fetch adjectives for top users (real API)
    const usernames = await Promise.all(weekLeaderboard.map(async e => {
      try {
        const user = await interaction.client.users.fetch(e.userId);
        return user.username;
      } catch {
        return e.userId;
      }
    }));
    const adjectives = await fetchAdjectives(usernames);

    const mentions = weekLeaderboard.map((e, i) => `<@${e.userId}> (${adjectives[i]})`).join(', ');
    if (weekLeaderboard.length > 0) {
      await interaction.channel.send(
        `🏆 Congratulations to this week's top base guessers: ${mentions}!`
      );
    }
  }
};