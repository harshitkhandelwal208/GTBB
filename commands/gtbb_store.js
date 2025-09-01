import { SlashCommandBuilder } from "discord.js";
import { getCurrentWeek, getWeek, addBase } from "../db/index.js";
import { requireHostRole } from "../utils/permissions.js";
import { safeReply, safeDefer } from "../utils/safeReply.js";

const HOST_ROLE_ID = process.env.GTBB_HOST_ROLE_ID;

export default {
  data: new SlashCommandBuilder()
    .setName("gtbb_store")
    .setDescription("GTBB Host: Store a base for a specific round in the current GTBB week")
    .addIntegerOption(opt =>
      opt.setName("round")
        .setDescription("Round number to assign this base to")
        .setRequired(true)
    )
    .addStringOption(opt => opt.setName("builder1").setDescription("Builder option 1").setRequired(true))
    .addStringOption(opt => opt.setName("builder2").setDescription("Builder option 2").setRequired(true))
    .addStringOption(opt => opt.setName("builder3").setDescription("Builder option 3").setRequired(true))
    .addStringOption(opt => opt.setName("builder4").setDescription("Builder option 4").setRequired(true))
    .addStringOption(opt => opt.setName("builder5").setDescription("Builder option 5").setRequired(true))
    .addIntegerOption(opt =>
      opt.setName("correct")
        .setDescription("Correct builder (1-5)")
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName("image")
        .setDescription("Direct image URL of the base (e.g. Discord CDN link)")
        .setRequired(true)
    ),

  async execute(interaction) {
    if (!requireHostRole(interaction, HOST_ROLE_ID)) return;

    await safeDefer(interaction);

    try {
      const roundNum = interaction.options.getInteger("round");
      const options = [
        interaction.options.getString("builder1"),
        interaction.options.getString("builder2"),
        interaction.options.getString("builder3"),
        interaction.options.getString("builder4"),
        interaction.options.getString("builder5"),
      ];
      const correct = interaction.options.getInteger("correct");
      const imageUrl = interaction.options.getString("image");

      if (![1, 2, 3, 4, 5].includes(correct)) {
        return interaction.editReply({ content: "❌ Correct builder must be between 1 and 5." });
      }

      const urlRegex =
        /^https?:\/\/(?:cdn\.discordapp\.com|media\.discordapp\.net|.+)\.(?:png|jpe?g|gif|webp)(?:\?.*)?$/i;

      if (!urlRegex.test(imageUrl)) {
        return interaction.editReply({
          content:
            "❌ Image must be a valid direct image URL (jpg, jpeg, png, gif, webp). Discord CDN links are recommended.",
        });
      }

      // Get current week number, default to 1 if not started yet
      const currentWeekNum = (await getCurrentWeek()) || 1;

      // Ensure week exists
      const week = (await getWeek(currentWeekNum)) || {
        weekNum: currentWeekNum,
        bases: [],
        gtbbRound: { current: null, state: "idle", round: 0, responses: [] },
        gtbbRounds: [],
        leaderboard: [],
        ended: false,
      };

      // Add the new base
      await addBase(week.weekNum, {
        baseName: `Round ${roundNum}`,
        round: roundNum,
        options,
        correct: correct - 1,
        image: imageUrl,
      });

      return interaction.editReply({
        content: `✅ Base stored for **Round ${roundNum}** in GTBB week ${week.weekNum}!`,
      });
    } catch (err) {
      try {
        await interaction.editReply({ content: "⚠️ Error storing base." });
      } catch {
        await safeReply(interaction, { content: "⚠️ Error storing base." });
      }
      throw err;
    }
  },
};
