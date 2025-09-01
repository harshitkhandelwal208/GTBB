import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import { getCurrentWeek, getWeek, updateGTBB, addGTBBRound, addLeaderboardEntry } from "../db/index.js";
import { requireHostRole } from "../utils/permissions.js";
import { safeReply, safeDefer } from "../utils/safeReply.js";

const HOST_ROLE_ID = process.env.GTBB_HOST_ROLE_ID;

export default {
  data: new SlashCommandBuilder()
    .setName("gtbb_round_end")
    .setDescription("GTBB Host: End the current round and show results"),

  async execute(interaction) {
    if (!requireHostRole(interaction, HOST_ROLE_ID)) return;
    await safeDefer(interaction);

    try {
      const weekNum = await getCurrentWeek();
      if (!weekNum) return interaction.editReply({ content: "❌ No active week found." });

      const week = await getWeek(weekNum);
      if (!week?.gtbbRound || week.gtbbRound.state !== "running") {
        return interaction.editReply({ content: "⚠️ No round is currently running." });
      }

      const roundIdx = week.gtbbRound.current;
      const roundNum = week.gtbbRound.round;
      const base = week.bases[roundIdx];
      if (!base) {
        return interaction.editReply({ content: "⚠️ No base found for this round." });
      }

      // Tally answers
      const responses = week.gtbbRound.responses || [];
      const results = responses.reduce((acc, r) => {
        if (!acc[r.answer]) acc[r.answer] = [];
        acc[r.answer].push(r.userId);
        return acc;
      }, {});

      // Update leaderboard
      for (const r of responses) {
        if (r.answer === base.correct) {
          await addLeaderboardEntry(weekNum, { userId: r.userId, points: 1 });
        }
      }

      // Save round results
      await addGTBBRound(weekNum, {
        baseIndex: roundIdx,
        responses,
        roundTs: new Date(),
      });

      await updateGTBB(weekNum, { current: null, state: "idle", responses: [] });

      // Build embed
      const optionsList = base.options
        .map((opt, i) => {
          const isCorrect = i === base.correct;
          const players = results[i] ? results[i].map((u) => `<@${u}>`).join(", ") : "None";
          return `${isCorrect ? "✅" : "❌"} **${opt}** → ${players}`;
        })
        .join("\n\n");

      const embed = new EmbedBuilder()
        .setTitle(`📢 Round ${roundNum} Results (Week ${weekNum})`)
        .setDescription(optionsList)
        .setImage(base.image)
        .setColor("Blue")
        .setTimestamp();

      return interaction.editReply({ embeds: [embed] });
    } catch (err) {
      try {
        await interaction.editReply({ content: "⚠️ Error ending round." });
      } catch {
        await safeReply(interaction, { content: "⚠️ Error ending round." });
      }
      throw err;
    }
  },
};
