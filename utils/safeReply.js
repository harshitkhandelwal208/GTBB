// utils/safeReply.js

/**
 * Safely reply/edit/followUp to an interaction without causing "already acknowledged".
 * - If not deferred/replied -> reply()
 * - If deferred & not replied -> editReply()
 * - If already replied -> followUp()
 *
 * options can be the same as the discord.js response options (string or object).
 */
export async function safeReply(interaction, options) {
    try {
      if (!interaction.deferred && !interaction.replied) {
        return await interaction.reply(options);
      }
      if (interaction.deferred && !interaction.replied) {
        return await interaction.editReply(options);
      }
      // already replied
      return await interaction.followUp(options);
    } catch (err) {
      // If even followUp fails, throw so caller can log
      throw err;
    }
  }
  
  /**
   * Try to defer safely if not already acknowledged.
   * If defer fails (race), ignore — command execution will try to use safeReply.
   */
  export async function safeDefer(interaction, opts = { ephemeral: false }) {
    try {
      if (!interaction.deferred && !interaction.replied) {
        await interaction.deferReply(opts);
      }
    } catch (err) {
      // ignore defer race conditions
    }
  }
  