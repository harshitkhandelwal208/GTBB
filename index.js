import dotenv from "dotenv";
import {
  Client,
  GatewayIntentBits,
  Collection,
  Events,
  ActivityType,
  MessageFlags,
} from "discord.js";
import fs from "fs";
import path from "path";
import { keepAlive } from "./server.js";
import { logError, logInfo, cleanupLogs } from "./utils/logger.js";
dotenv.config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});
keepAlive();
client.commands = new Collection();
const __dirname = path.dirname(
  decodeURIComponent(new URL(import.meta.url).pathname),
);
const commandsPath = path.join(__dirname, "commands");
const commandFiles = fs
  .readdirSync(commandsPath)
  .filter((file) => file.endsWith(".js"));
for (const file of commandFiles) {
  const command = (await import(`./commands/${file}`)).default;
  client.commands.set(command.data.name, command);
}

const componentHandlers = {};
const componentsPath = path.join(__dirname, "components");
const componentFiles = fs
  .readdirSync(componentsPath)
  .filter((file) => file.endsWith(".js"));
for (const file of componentFiles) {
  const name = file.replace(".js", "");
  componentHandlers[name] = (await import(`./components/${file}`)).default;
}

client.once("clientReady", () => {
  cleanupLogs();
  logInfo(`Bot ready as ${client.user.tag}`);
  logInfo(`Process ID: ${process.pid}`);
  logInfo(`Memory usage: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`);
  client.user.setActivity("Guessing The BaseBuilder🤔🤔", {
    type: ActivityType.Custom,
  });
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (interaction.isChatInputCommand()) {
    const command = client.commands.get(interaction.commandName);
    if (!command) return;
    try {
      await command.execute(interaction);
    } catch (error) {
      logError('COMMAND_ERROR', `Error executing command: ${interaction.commandName}`, error);
      try {
        await interaction.reply({
          content: "There was an error executing this command.",
          flags: MessageFlags.Ephemeral,
        });
      } catch {}
    }
  }
  if (interaction.isButton()) {
    for (const key in componentHandlers) {
      if (interaction.customId.startsWith(key)) {
        try {
          await componentHandlers[key](interaction);
        } catch (error) {
          logError('COMPONENT_ERROR', `Error processing button interaction: ${interaction.customId}`, error);
          try {
            await interaction.reply({
              content: "There was an error processing your answer.",
              flags: MessageFlags.Ephemeral,
            });
          } catch {}
        }
      }
    }
  }
});

// Add global error handlers to prevent crashes
process.on('unhandledRejection', (reason, promise) => {
  logError('UNHANDLED_REJECTION', 'Unhandled promise rejection detected', reason instanceof Error ? reason : new Error(String(reason)));
});

process.on('uncaughtException', (error) => {
  logError('UNCAUGHT_EXCEPTION', 'Uncaught exception detected - this will crash the bot', error);
  process.exit(1);
});

// Add Discord connection error handling
client.on('error', error => {
  logError('DISCORD_ERROR', 'Discord client error occurred', error);
});

client.on('warn', warning => {
  logError('DISCORD_WARNING', `Discord client warning: ${warning}`);
});

client.on('disconnect', () => {
  logError('DISCORD_DISCONNECT', 'Bot disconnected from Discord! Attempting to reconnect...');
});

client.on('reconnecting', () => {
  logInfo('Bot reconnecting to Discord...');
});

// Add shutdown logging
process.on('SIGTERM', () => {
  logError('SHUTDOWN', 'Bot received SIGTERM signal - process being terminated');
  client.destroy();
  process.exit(0);
});

process.on('SIGINT', () => {
  logError('SHUTDOWN', 'Bot received SIGINT signal - process interrupted (Ctrl+C)');
  client.destroy();
  process.exit(0);
});

process.on('beforeExit', (code) => {
  logError('SHUTDOWN', `Bot process about to exit with code: ${code}`);
});

process.on('exit', (code) => {
  // Note: Can't use async operations here, so we use console.log
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [SHUTDOWN] Bot process exited with code: ${code}`);
});

// Log Discord client shutdown
client.on('invalidated', () => {
  logError('DISCORD_SHUTDOWN', 'Discord session invalidated - bot will shut down');
});

// Login with error handling
client.login(process.env.DISCORD_TOKEN).catch(error => {
  logError('LOGIN_ERROR', 'Failed to login to Discord', error);
  process.exit(1);
});