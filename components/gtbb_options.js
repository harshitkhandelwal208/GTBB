import { getCurrentWeek, getWeek, updateGTBB } from '../db/index.js';
import { MessageFlags } from 'discord.js';

export default async function handleGTBBOption(interaction) {
  const weekNum = await getCurrentWeek();
  const week = await getWeek(weekNum);
  if (week.gtbbRound.state !== 'running')
    return interaction.reply({ content: 'No GTBB round is running!', flags: MessageFlags.Ephemeral });
  const idx = Number(interaction.customId.replace('gtbb_option_', ''));
  let responses = Array.isArray(week.gtbbRound.responses) ? week.gtbbRound.responses : [];
  responses = responses.filter(r => r.userId !== interaction.user.id);
  responses.push({ userId: interaction.user.id, answer: idx });
  await updateGTBB(weekNum, { ...week.gtbbRound, responses });
  return interaction.reply({ content: `You selected Builder ${idx + 1}. You can change your answer until the round ends.`, flags: MessageFlags.Ephemeral });
}