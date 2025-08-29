import { SlashCommandBuilder } from 'discord.js';
import { getCurrentWeek, setCurrentWeek, getWeek } from '../db/index.js';
import { requireHostRole } from '../utils/permissions.js';

const HOST_ROLE_ID = process.env.GTBB_HOST_ROLE_ID;

export default {
  data: new SlashCommandBuilder()
    .setName('gtbb_week_start')
    .setDescription('Start a new GTBB week (GTBB Host only)')
    .addRoleOption(opt => opt.setName('role').setDescription('Role to ping').setRequired(true))
    .addBooleanOption(opt => opt.setName('ephemeral').setDescription('Reply only to you (ephemeral)?')),
  async execute(interaction) {
    const ephemeral = interaction.options.getBoolean('ephemeral') ?? false;
    if (!requireHostRole(interaction, HOST_ROLE_ID)) return;
    const prevWeek = await getCurrentWeek();
    const newWeekNum = prevWeek + 1;
    await setCurrentWeek(newWeekNum);
    await getWeek(newWeekNum); // ensure week document exists
    await interaction.reply({ content: `GTBB week ${newWeekNum} started!`, ephemeral });
    const role = interaction.options.getRole('role');
    if (role) {
      await interaction.channel.send({
        content: `${role}`,
        allowedMentions: { roles: [role.id] }
      });
    }
  }
};