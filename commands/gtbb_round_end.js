import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import {
  getCurrentWeek, getWeek, updateGTBB, addGTBBRound, addLeaderboardEntry
} from '../db/index.js';
import { requireHostRole } from '../utils/permissions.js';

const HOST_ROLE_ID = process.env.GTBB_HOST_ROLE_ID;

export default {
  data: new SlashCommandBuilder().setName('gtbb_round_end').setDescription('End the current GTBB round (GTBB Host only)'),
  async execute(interaction) {
    const ephemeral = false;
    if (!requireHostRole(interaction, HOST_ROLE_ID)) return;
    const weekNum = await getCurrentWeek();
    const week = await getWeek(weekNum);
    if (week.gtbbRound.state !== 'running')
      return interaction.reply({ content: 'No GTBB round is running.', ephemeral });
    const b = week.bases[week.gtbbRound.current];
    const responses = week.gtbbRound.responses;
    // Save round's responses for week statistics
    await addGTBBRound(weekNum, {
      baseIndex: week.gtbbRound.current,
      responses: [...responses]
    });
    // Show answer and responses
    const correct = b.correct;
    let correctUsers = [];
    let fields = responses.length > 0 ? responses.map(r => {
      const isCorrect = r.answer === correct;
      if (isCorrect) correctUsers.push(r.userId);
      return {
        name: `<@${r.userId}>`,
        value: b.options[r.answer] + (isCorrect ? " ✅" : " ❌"),
        inline: false
      };
    }) : [{ name: "No responses.", value: "😕", inline: false }];

    for (const uid of correctUsers) {
      await addLeaderboardEntry(weekNum, { userId: uid, points: 1 });
    }
    await updateGTBB(weekNum, { current: null, state: 'idle', round: null, responses: [] });

    const embed = new EmbedBuilder()
      .setTitle("GTBB Round Ended")
      .setDescription(`The correct builder was: **${b.options[correct]}**`)
      .addFields(fields)
      .setColor(0xFFAA00);

    await interaction.reply({ embeds: [embed], ephemeral });
    await interaction.channel.send({ embeds: [embed] });
  }
};