import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import { getCurrentWeek, getWeek, updateWeek, getLeaderboard } from "../db/index.js";
import { requireHostRole } from "../utils/permissions.js";
import { getAdjectives } from "../utils/adjectives.js";
import { safeReply, safeDefer } from "../utils/safeReply.js";

const HOST_ROLE_ID = process.env.GTBB_HOST_ROLE_ID;

export default {
  data: new SlashCommandBuilder()
    .setName("gtbb_week_end")
    .setDescription("GTBB Host: End the current week and finalize leaderboard"),

  async execute(interaction) {
    if (!requireHostRole(interaction, HOST_ROLE_ID)) return;

    await safeDefer(interaction);

    try {
      const weekNum = await getCurrentWeek();
      if (!weekNum) {
        return interaction.editReply({ content: "❌ No active week found." });
      }

      const week = await getWeek(weekNum);
      if (!week || week.ended) {
        return interaction.editReply({ content: "❌ This week is already ended." });
      }

      // Finalize week
      await updateWeek(weekNum, { ended: true });

      // Fetch leaderboard
      const leaderboard = await getLeaderboard(weekNum);
      if (!leaderboard.length) {
        return interaction.editReply({
          content: `⚠️ Week ${weekNum} ended, but no one scored any points.`,
        });
      }

      // Group players by score (to handle ties)
      const groups = new Map();
      leaderboard.forEach((entry) => {
        if (!groups.has(entry.points)) groups.set(entry.points, []);
        groups.get(entry.points).push(entry.userId);
      });

      // Sort by score descending
      const sortedScores = [...groups.keys()].sort((a, b) => b - a);

      // Load adjectives (ensuring we have enough unique ones)
      const allAdjectives = await getAdjectives();
      const adjectives = [...allAdjectives]; // copy
      if (adjectives.length < sortedScores.length) {
        // fallback: repeat pool if not enough
        while (adjectives.length < sortedScores.length) {
          adjectives.push(...allAdjectives);
        }
      }

      // Shuffle adjectives so assignment is random but unique
      for (let i = adjectives.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [adjectives[i], adjectives[j]] = [adjectives[j], adjectives[i]];
      }

      // Position labels
      const positionLabels = ["first", "second", "third"];
      const announcements = [];

      sortedScores.forEach((score, idx) => {
        const users = groups.get(score);
        const adjective = adjectives[idx]; // unique assignment

        // Position text (after 3rd → ordinal)
        let pos;
        if (idx < positionLabels.length) {
          pos = positionLabels[idx];
        } else {
          const n = idx + 1;
          pos = `${n}${["th", "st", "nd", "rd"][((n % 100 - 20) % 10)] || "th"}`;
        }

        const mentions = users.map((id) => `<@${id}>`).join(", ");
        announcements.push(
          `In **${adjective} ${pos} place** with **${score} points**, we have ${mentions}!`
        );
      });

      const embed = new EmbedBuilder()
        .setTitle(`🏆 GTBB Week ${weekNum} Results`)
        .setDescription(announcements.join("\n\n"))
        .setColor("Gold")
        .setTimestamp();

      return interaction.editReply({ embeds: [embed] });
    } catch (err) {
      try {
        await interaction.editReply({ content: "⚠️ Error ending week." });
      } catch {
        await safeReply(interaction, { content: "⚠️ Error ending week." });
      }
      throw err;
    }
  },
};
