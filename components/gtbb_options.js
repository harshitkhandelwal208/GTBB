// components/gtbb_options.js
import { addAnswer, getCurrentWeek } from "../db/index.js";
import { safeReply } from "../utils/safeReply.js";

export default async function handleOptions(interaction) {
  try {
    // ✅ Acknowledge button instantly (prevents "interaction failed")
    await interaction.deferReply({ ephemeral: true });

    // customId format: "gtbb_options:<baseIndex>:<choice>"
    const [, baseIndexStr, choiceStr] = interaction.customId.split(":");
    const baseIndex = parseInt(baseIndexStr, 10);
    const choice = parseInt(choiceStr, 10);

    if (isNaN(baseIndex) || isNaN(choice)) {
      return interaction.editReply({
        content: "❌ Invalid button data.",
      });
    }

    // get the current week from DB (set via /gtbb_week_start)
    const weekNum = await getCurrentWeek();
    if (!weekNum) {
      return interaction.editReply({
        content: "❌ No active week is running.",
      });
    }

    // store the answer
    await addAnswer(weekNum, interaction.user.id, baseIndex, choice);

    // confirm to the user
    await interaction.editReply({
      content: `✅ Your answer for base **#${baseIndex + 1}** has been recorded as option **${choice + 1}**.`,
    });
  } catch (err) {
    console.error("❌ Error in gtbb_options:", err);
    if (!interaction.replied && !interaction.deferred) {
      await safeReply(interaction, {
        content: "⚠️ Failed to register your answer.",
        ephemeral: true,
      });
    }
  }
}
