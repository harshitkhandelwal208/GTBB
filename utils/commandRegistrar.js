// utils/commandRegistrar.js
import { REST, Routes } from "discord.js";
import { logger } from "./logger.js";

export async function registerCommands({ clientId, token, commandsJSON }) {
  const rest = new REST({ version: "10" }).setToken(token);

  try {
    logger.info(`[Commands] Registering ${commandsJSON.length} GLOBAL commands...`);
    const data = await rest.put(Routes.applicationCommands(clientId), { body: commandsJSON });
    logger.info(`[Commands] Global sync requested. Count: ${data.length}`);
  } catch (err) {
    logger.error(err, "[Commands] Failed to register");
    throw err;
  }
}
