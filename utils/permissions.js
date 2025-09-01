// utils/permissions.js

/**
 * Simple host-role permission checker.
 * Returns true if the interaction user has the host role OR is the guild owner.
 * If the check fails, replies ephemerally to the user.
 */
export function requireHostRole(interaction, hostRoleId) {
    if (!hostRoleId) {
      // No restriction set -> allow
      return true;
    }
    try {
      const member = interaction.member;
      if (!member) {
        // Could not resolve member (DM) -> deny
        interaction.reply?.({ content: "This command must be used in a server.", ephemeral: true }).catch(() => {});
        return false;
      }
      if (member.user?.id === interaction.guild?.ownerId) return true;
      const has = member.roles?.cache?.has(hostRoleId);
      if (!has) {
        interaction.reply?.({ content: "You don't have permission to run this command.", ephemeral: true }).catch(() => {});
        return false;
      }
      return true;
    } catch (err) {
      // in case of error, deny
      interaction.reply?.({ content: "Permission check failed.", ephemeral: true }).catch(() => {});
      return false;
    }
  }
  