import { SlashCommandBuilder } from "discord.js";
import { getCurrentWeek, updateGTBB, getWeek } from "../db/index.js";
import { requireHostRole } from "../utils/permissions.js";
import { safeReply, safeDefer } from "../utils/safeReply.js";

const HOST_ROLE_ID = process.env.GTBB_HOST_ROLE_ID;

export default {
  data: new SlashCommandBuilder()
    .setName("gtbb_round_start")
    .setDescription("GTBB Host: Start a new round for the current week")
    .addIntegerOption((opt) =>
      opt.setName("round").setDescription("Round number to start").setRequired(true)
    ),

  async execute(interaction) {
    if (!requireHostRole(interaction, HOST_ROLE_ID)) return;
    await safeDefer(interaction);

    try {
      const weekNum = await getCurrentWeek();
      if (!weekNum) return interaction.editReply({ content: "❌ No active week found." });

      const round = interaction.options.getInteger("round");
      const week = await getWeek(weekNum);

      if (!week || !week.bases.length) {
        return interaction.editReply({ content: "⚠️ No bases stored for this week." });
      }
      if (round > week.bases.length) {
        return interaction.editReply({
          content: `⚠️ Invalid round. Only ${week.bases.length} bases available.`,
        });
      }

      await updateGTBB(weekNum, { current: round - 1, state: "running", round });

      return interaction.editReply({
        content: `▶️ GTBB Round **${round}** has started for Week ${weekNum}!`,
      });
    } catch (err) {
      try {
        await interaction.editReply({ content: "⚠️ Error starting round." });
      } catch {
        await safeReply(interaction, { content: "⚠️ Error starting round." });
      }
      throw err;
    }
  },
};
