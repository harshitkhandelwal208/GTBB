// utils/commandLoader.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function loadCommands(commandsDirRelative = '../commands') {
  const commandsDir = path.join(__dirname, commandsDirRelative);
  const files = fs.readdirSync(commandsDir).filter(f => f.endsWith('.js'));
  const commands = [];
  const map = new Map();

  for (const file of files) {
    const full = path.join(commandsDir, file);
    const mod = await import(pathToFileURL(full).href);
    const cmd = mod.default || mod;

    if (!cmd?.data || typeof cmd.execute !== 'function') {
      // Skip invalid definitions
      continue;
    }

    const name = cmd.data.name;
    commands.push(cmd);
    map.set(name, cmd);
  }

  return { commands, map };
}
