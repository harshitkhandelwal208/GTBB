import { REST, Routes, Client, GatewayIntentBits } from 'discord.js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
dotenv.config();

const commands = [];
const __dirname = path.dirname(decodeURIComponent(new URL(import.meta.url).pathname));
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const command = (await import(`./commands/${file}`)).default;
  commands.push(command.data.toJSON());
}

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

// Create a temporary client to get guild IDs
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once('clientReady', async () => {
  try {
    const user = await rest.get(Routes.user());
    const guilds = client.guilds.cache;
    
    console.log(`Found ${guilds.size} server(s). Registering commands...`);
    
    if (guilds.size === 0) {
      console.log('No servers found. Registering commands globally...');
      await rest.put(
        Routes.applicationCommands(user.id),
        { body: commands }
      );
      console.log('Commands registered globally!');
    } else {
      // Register to each guild for instant availability
      for (const [guildId, guild] of guilds) {
        console.log(`Registering commands to: ${guild.name}`);
        await rest.put(
          Routes.applicationGuildCommands(user.id, guildId),
          { body: commands }
        );
      }
      console.log(`Commands registered to ${guilds.size} server(s)!`);
    }
    
    client.destroy();
    process.exit(0);
  } catch (error) {
    console.error(error);
    client.destroy();
    process.exit(1);
  }
});

client.login(process.env.DISCORD_TOKEN);