// index.js
import "dotenv/config";
import {
  Client,
  GatewayIntentBits,
  Collection,
  Events,
  ActivityType,
} from "discord.js";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import express from "express"; // ✅ keepalive server

import { logger, logUnhandledError, logShutdown } from "./utils/logger.js";
import { loadCommands } from "./utils/commandLoader.js";
import { registerCommands } from "./utils/commandRegistrar.js";
import { safeReply } from "./utils/safeReply.js";
import { disconnect as dbDisconnect } from "./db/index.js";

const { DISCORD_TOKEN, DISCORD_CLIENT_ID } = process.env;

if (!DISCORD_TOKEN || !DISCORD_CLIENT_ID) {
  logger.error("Missing DISCORD_TOKEN or DISCORD_CLIENT_ID in environment.");
  process.exit(1);
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
});

client.commands = new Collection();
const componentHandlers = {};

// Resolve paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function bootstrap() {
  // Load commands
  const { commands } = await loadCommands();
  for (const cmd of commands) {
    client.commands.set(cmd.data.name, cmd);
  }

  // Register commands globally
  const commandsJSON = commands.map((c) => c.data.toJSON());
  await registerCommands({
    clientId: DISCORD_CLIENT_ID,
    token: DISCORD_TOKEN,
    commandsJSON,
  });

  // Load component handlers dynamically
  const componentsPath = path.join(__dirname, "components");
  if (fs.existsSync(componentsPath)) {
    const files = fs.readdirSync(componentsPath).filter((f) => f.endsWith(".js"));
    for (const file of files) {
      const name = file.replace(".js", "");
      const mod = await import(`./components/${file}`);
      componentHandlers[name] = mod.default || mod;
    }
  }

  await client.login(DISCORD_TOKEN);
}

client.once(Events.ClientReady, (c) => {
  logger.info(`🤖 Logged in as ${c.user.tag} (id: ${c.user.id})`);
  client.user.setActivity("Guessing the Base Builder 🤔🤔", {
    type: ActivityType.Custom,
  });

  // Optional heartbeat log every 10 min
  setInterval(() => {
    logger.info("⏳ Heartbeat: bot is alive.");
  }, 10 * 60 * 1000);
});

client.on(Events.InteractionCreate, async (interaction) => {
  try {
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) {
        await safeReply(interaction, {
          content: "Command not found.",
          ephemeral: true,
        });
        return;
      }
      await command.execute(interaction);
    } else if (interaction.isButton()) {
      for (const key in componentHandlers) {
        if (interaction.customId.startsWith(key)) {
          await componentHandlers[key](interaction);
          break;
        }
      }
    }
  } catch (err) {
    logUnhandledError(err, "interaction");
    try {
      await safeReply(interaction, {
        content: "⚠️ An error occurred while processing your interaction.",
        ephemeral: true,
      });
    } catch {}
  }
});

// Error handlers
process.on("unhandledRejection", (reason) =>
  logUnhandledError(reason, "unhandledRejection")
);
process.on("uncaughtException", (err) => {
  logUnhandledError(err, "uncaughtException");
  // Let Render restart cleanly
  setTimeout(() => process.exit(1), 2000);
});

client.on("error", (err) => logUnhandledError(err, "discord_error"));
client.on("warn", (warn) => logger.warn("Discord warning:", warn));
client.on("invalidated", () =>
  logShutdown("Discord session invalidated; shutting down")
);

// Graceful shutdown
const shutdown = (signal) => async () => {
  logShutdown(`Received ${signal}`);
  try {
    if (client?.isReady()) await client.destroy();
    await dbDisconnect();
  } catch (err) {
    logUnhandledError(err, "shutdown");
  } finally {
    process.exit(0);
  }
};
process.on("SIGINT", shutdown("SIGINT"));
process.on("SIGTERM", shutdown("SIGTERM"));

bootstrap().catch((err) => {
  logUnhandledError(err, "bootstrap");
  process.exit(1);
});

// --------------------
// ✅ Optional Express Keepalive (for Render Web Services)
// --------------------
if (process.env.PORT) {
  const app = express();
  const PORT = process.env.PORT;

  app.get("/", (req, res) => {
    res.send("✅ GTBB bot is alive!");
  });

  app.listen(PORT, () => {
    logger.info(`🌐 Keepalive server running on port ${PORT}`);
  });
}
