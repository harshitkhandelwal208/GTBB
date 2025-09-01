import { SlashCommandBuilder } from "discord.js";
import { safeReply, safeDefer } from "../utils/safeReply.js";

export default {
  data: new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Check if the bot is alive and measure latency"),

  async execute(interaction) {
    await safeDefer(interaction);

    try {
      const sent = Date.now();
      await interaction.editReply({ content: "🏓 Pinging..." });

      const latency = Date.now() - sent;
      const apiLatency = Math.round(interaction.client.ws.ping);

      await interaction.editReply({
        content: `🏓 Pong!\nBot Latency: **${latency}ms**\nAPI Latency: **${apiLatency}ms**`,
      });
    } catch (err) {
      try {
        await interaction.editReply({ content: "⚠️ Error executing ping." });
      } catch {
        await safeReply(interaction, { content: "⚠️ Error executing ping." });
      }
      throw err;
    }
  },
};
