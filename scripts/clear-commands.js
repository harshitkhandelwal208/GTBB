// scripts/clear-commands.js
import { REST, Routes } from "discord.js";
import "dotenv/config";

const { DISCORD_TOKEN, DISCORD_CLIENT_ID } = process.env;

if (!DISCORD_TOKEN || !DISCORD_CLIENT_ID) {
  console.error("❌ Missing DISCORD_TOKEN or DISCORD_CLIENT_ID in environment.");
  process.exit(1);
}

const rest = new REST({ version: "10" }).setToken(DISCORD_TOKEN);

(async () => {
  try {
    // 1. Delete global commands
    console.log("🗑️ Deleting ALL global commands...");
    await rest.put(Routes.applicationCommands(DISCORD_CLIENT_ID), { body: [] });
    console.log("✅ Global commands cleared.");

    // 2. Fetch guilds the bot is in
    console.log("📡 Fetching guilds the bot is in...");
    const guilds = await rest.get(Routes.userGuilds());

    if (!Array.isArray(guilds) || guilds.length === 0) {
      console.log("ℹ️ Bot is not in any guilds (or no access to fetch them).");
      return;
    }

    // 3. Delete commands from each guild
    for (const guild of guilds) {
      try {
        console.log(`🗑️ Deleting commands in guild: ${guild.name} (${guild.id})`);
        await rest.put(
          Routes.applicationGuildCommands(DISCORD_CLIENT_ID, guild.id),
          { body: [] }
        );
        console.log(`✅ Cleared commands in guild: ${guild.name}`);
      } catch (err) {
        console.error(`❌ Failed to clear guild ${guild.name} (${guild.id}):`, err.message);
      }
    }

    console.log("🎉 Done! All commands cleared globally and per guild.");
  } catch (err) {
    console.error("❌ Error clearing commands:", err);
    process.exit(1);
  }
})();
