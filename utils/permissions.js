import { MessageFlags } from 'discord.js';

export function requireHostRole(interaction, allowedRoleId) {
  if (!interaction.member?.roles?.cache?.has(allowedRoleId)) {
    interaction.reply({ content: 'You do not have permission to run this command. Only GTBB Hosts can do this.', flags: MessageFlags.Ephemeral });
    return false;
  }
  return true;
}