import { SlashCommandBuilder } from 'discord.js';
import { getCurrentWeek, addBase } from '../db/index.js';
import { requireHostRole } from '../utils/permissions.js';

const HOST_ROLE_ID = process.env.GTBB_HOST_ROLE_ID;

export default {
  data: new SlashCommandBuilder()
    .setName('gtbb_store')
    .setDescription('GTBB Host: Upload a new base for the current GTBB week')
    .addStringOption(opt => opt.setName('basename').setDescription('Base number').setRequired(true))
    .addStringOption(opt => opt.setName('builder1').setDescription('Builder option 1').setRequired(true))
    .addStringOption(opt => opt.setName('builder2').setDescription('Builder option 2').setRequired(true))
    .addStringOption(opt => opt.setName('builder3').setDescription('Builder option 3').setRequired(true))
    .addStringOption(opt => opt.setName('builder4').setDescription('Builder option 4').setRequired(true))
    .addStringOption(opt => opt.setName('builder5').setDescription('Builder option 5').setRequired(true))
    .addIntegerOption(opt => opt.setName('correct').setDescription('Correct builder (1-5)').setRequired(true))
    .addStringOption(opt => opt.setName('image').setDescription('Direct image URL of the base').setRequired(true)),
  async execute(interaction) {
    const ephemeral = interaction.options.getBoolean('ephemeral') ?? false;
    if (!requireHostRole(interaction, HOST_ROLE_ID)) return;

    const baseName = interaction.options.getString('basename');
    const options = [
      interaction.options.getString('builder1'),
      interaction.options.getString('builder2'),
      interaction.options.getString('builder3'),
      interaction.options.getString('builder4'),
      interaction.options.getString('builder5')
    ];
    const correct = interaction.options.getInteger('correct');
    const image = interaction.options.getString('image');

    if (![1,2,3,4,5].includes(correct))
      return interaction.reply({ content: 'Correct builder must be between 1 and 5.', ephemeral });
    if (!/^https?:\/\/.+\.(jpg|jpeg|png|gif)$/i.test(image))
      return interaction.reply({ content: 'Image must be a valid direct image URL.', ephemeral });

    const weekNum = await getCurrentWeek();
    await addBase(weekNum, { baseName, options, correct: correct-1, image });
    return interaction.reply({ content: `Base "${baseName}" added for GTBB week ${weekNum}!`, ephemeral });
  }
};