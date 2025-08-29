import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import {
  getLeaderboard,
  getCurrentWeek,
  getOverallLeaderboard,
  getWeek,
} from "../db/index.js";

export default {
  data: new SlashCommandBuilder()
    .setName("gtbb-leaderboard")
    .setDescription(
      "Show the GTBB leaderboard for a specific week or overall(leave blank for cuurent week)",
    )
    .addStringOption((opt) =>
      opt
        .setName("mode")
        .setDescription('Week number or "overall"')
        .setRequired(false),
    )
    .addBooleanOption((opt) =>
      opt.setName("ephemeral").setDescription("Reply only to you (ephemeral)?"),
    ),
  async execute(interaction) {
    const ephemeral = interaction.options.getBoolean("ephemeral") ?? false;
    let mode = interaction.options.getString("mode");
    let weekNum = null;
    let lb = [];
    let title = "";
    if (!mode) {
      weekNum = await getCurrentWeek();
      lb = await getLeaderboard(weekNum);
      title = `GTBB Leaderboard - Week ${weekNum}`;
    } else if (mode === "overall") {
      lb = await getOverallLeaderboard();
      title = `GTBB Overall Leaderboard`;
    } else {
      weekNum = parseInt(mode);
      const week = await getWeek(weekNum);
      if (isNaN(weekNum) || !week)
        return interaction.reply({
          content: `Invalid or missing week number.`,
          ephemeral,
        });
      lb = await getLeaderboard(weekNum);
      title = `GTBB Leaderboard - Week ${weekNum}`;
    }
    if (lb.length === 0)
      return interaction.reply({ content: `No scores found.`, ephemeral });
    const lines = await Promise.all(
      lb.map(async (e, i) => {
        try {
          const user = await interaction.client.users.fetch(e.userId);
          return `**${i + 1}.** ${user.username} - ${e.points} pts`;
        } catch {
          return `**${i + 1}.** <@${e.userId}> - ${e.points} pts`;
        }
      }),
    );
    const embed = new EmbedBuilder()
      .setTitle(title)
      .setDescription(lines.join("\n"))
      .setColor(0x3b88c3);
    await interaction.reply({ embeds: [embed], ephemeral });
  },
};
