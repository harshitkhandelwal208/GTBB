import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { getCurrentWeek, getWeek, updateGTBB } from '../db/index.js';
import { requireHostRole } from '../utils/permissions.js';

const HOST_ROLE_ID = process.env.GTBB_HOST_ROLE_ID;

export default {
  data: new SlashCommandBuilder().setName('gtbb_round_start').setDescription('Start a GTBB round (GTBB Host only)')
    .addBooleanOption(opt => opt.setName('ephemeral').setDescription('Reply only to you (ephemeral)?')),
  async execute(interaction) {
    const ephemeral = interaction.options.getBoolean('ephemeral') ?? false;
    if (!requireHostRole(interaction, HOST_ROLE_ID)) return;
    const weekNum = await getCurrentWeek();
    const week = await getWeek(weekNum);
    if (week.gtbbRound.state === 'running')
      return interaction.reply({ content: 'A GTBB round is already running!', ephemeral });
    if ((week.bases || []).length === 0)
      return interaction.reply({ content: 'No bases in the preset bank.', ephemeral });
    // Pick a random base not used this week
    const used = new Set((week.gtbbRounds || []).map(r => r.baseIndex));
    const candidates = week.bases
      .map((b, idx) => ({ b, idx }))
      .filter((_, idx) => !used.has(idx));
    if (candidates.length === 0)
      return interaction.reply({ content: 'All bases used this week.', ephemeral });
    const pick = candidates[Math.floor(Math.random() * candidates.length)];
    const gtbbRound = { current: pick.idx, state: 'running', round: Date.now(), responses: [] };
    await updateGTBB(weekNum, gtbbRound);

    const embed = new EmbedBuilder()
      .setTitle('Guess The Base Builder')
      .setDescription(`Who made this base?\n\n**${pick.b.baseName}**`)
      .setImage(pick.b.image)
      .setColor(0x00AE86)
      .addFields(pick.b.options.map((opt, i) => ({
        name: `Builder ${i+1}`,
        value: opt,
        inline: false
      })))
      .setFooter({ text: 'Click a button below to answer!' });

    const row = new ActionRowBuilder();
    for (let i = 0; i < 5; i++) {
      row.addComponents(new ButtonBuilder()
        .setCustomId(`gtbb_option_${i}`)
        .setLabel(`Builder ${i+1}`)
        .setStyle(ButtonStyle.Primary));
    }

    await interaction.reply({ embeds: [embed], components: [row], ephemeral });
    await interaction.channel.send({ embeds: [embed], components: [row] });
  }
};