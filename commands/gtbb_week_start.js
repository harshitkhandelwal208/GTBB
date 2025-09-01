import { SlashCommandBuilder } from "discord.js";
import { getCurrentWeek, setCurrentWeek, getWeek, updateWeek } from "../db/index.js";
import { requireHostRole } from "../utils/permissions.js";
import { safeReply, safeDefer } from "../utils/safeReply.js";

const HOST_ROLE_ID = process.env.GTBB_HOST_ROLE_ID;

export default {
  data: new SlashCommandBuilder()
    .setName("gtbb_week_start")
    .setDescription("GTBB Host: Start a new GTBB week")
    .addRoleOption(option =>
      option.setName("role")
        .setDescription("Role to ping for the new week")
        .setRequired(true)
    ),

  async execute(interaction) {
    if (!requireHostRole(interaction, HOST_ROLE_ID)) return;

    await safeDefer(interaction);

    try {
      // Get current week number (or start fresh at 1)
      let current = await getCurrentWeek();
      const nextWeek = current ? current + 1 : 1;

      // Get existing bases if any (persisted)
      const previousWeek = await getWeek(nextWeek);
      const preservedBases = previousWeek?.bases || [];

      // Create/reset week document but preserve bases
      await updateWeek(nextWeek, {
        weekNum: nextWeek,
        bases: preservedBases,
        gtbbRound: {
          current: null,
          state: "idle",
          round: 0,
          responses: [],
        },
        gtbbRounds: [],
        leaderboard: [],
        ended: false,
      });

      // Set as active week
      await setCurrentWeek(nextWeek);

      // Get role to ping
      const role = interaction.options.getRole("role");

      // Confirm
      return interaction.editReply({
        content: `✅ GTBB **Week ${nextWeek}** has been started!\nAll previous rounds and scores have been reset.\n${role} - get ready for this week's GTBB!`,
      });
    } catch (err) {
      try {
        await interaction.editReply({ content: "⚠️ Error starting new week." });
      } catch {
        await safeReply(interaction, { content: "⚠️ Error starting new week." });
      }
      throw err;
    }
  },
};
