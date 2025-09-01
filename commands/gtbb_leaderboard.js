import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import { getCurrentWeek, getLeaderboard, getOverallLeaderboard } from "../db/index.js";
import { safeReply, safeDefer } from "../utils/safeReply.js";

export default {
  data: new SlashCommandBuilder()
    .setName("gtbb_leaderboard")
    .setDescription("View the GTBB leaderboard")
    .addStringOption((opt) =>
      opt.setName("scope")
        .setDescription("Show leaderboard for 'week' or 'overall'")
        .setRequired(false)
        .addChoices(
          { name: "This Week", value: "week" },
          { name: "Overall", value: "overall" }
        )
    ),

  async execute(interaction) {
    await safeDefer(interaction);

    try {
      const scope = interaction.options.getString("scope") || "week";
      let title, leaderboard;

      if (scope === "overall") {
        leaderboard = await getOverallLeaderboard(25);
        title = "🌍 Overall Leaderboard";
      } else {
        const weekNum = await getCurrentWeek();
        if (!weekNum) return interaction.editReply({ content: "❌ No active week found." });
        leaderboard = await getLeaderboard(weekNum);
        title = `📅 Week ${weekNum} Leaderboard`;
      }

      if (!leaderboard.length) {
        return interaction.editReply({ content: `⚠️ No leaderboard data available for ${scope}.` });
      }

      const lines = leaderboard.map(
        (entry, i) => `**${i + 1}.** <@${entry.userId}> — ${entry.points} pts`
      );

      const embed = new EmbedBuilder()
        .setTitle(title)
        .setDescription(lines.join("\n"))
        .setColor("Purple")
        .setTimestamp();

      return interaction.editReply({ embeds: [embed] });
    } catch (err) {
      try {
        await interaction.editReply({ content: "⚠️ Error fetching leaderboard." });
      } catch {
        await safeReply(interaction, { content: "⚠️ Error fetching leaderboard." });
      }
      throw err;
    }
  },
};
