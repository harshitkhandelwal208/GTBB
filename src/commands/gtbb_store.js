const { SlashCommandBuilder } = require('discord.js');
const { GTBBBase } = require('../models/GTBBBase');
module.exports = {
    data: new SlashCommandBuilder()
        .setName('gtbb_store')
        .setDescription('Store a question for a future GTBB round.')
        // ---- All required options first ----
        .addStringOption(o => o.setName('correct_option').setDescription('Correct option (a-e)').setRequired(true).addChoices(
            { name: 'A', value: 'a' }, { name: 'B', value: 'b' }, { name: 'C', value: 'c' }, { name: 'D', value: 'd' }, { name: 'E', value: 'e' }
        ))
        .addStringOption(o => o.setName('option_a').setDescription('Option A').setRequired(true))
        .addStringOption(o => o.setName('option_b').setDescription('Option B').setRequired(true))
        .addStringOption(o => o.setName('option_c').setDescription('Option C').setRequired(true))
        .addStringOption(o => o.setName('option_d').setDescription('Option D').setRequired(true))
        .addStringOption(o => o.setName('option_e').setDescription('Option E').setRequired(true))
        .addIntegerOption(o => o.setName('round_number').setDescription('Round number').setRequired(true))
        // ---- Optional options after all required ----
        .addStringOption(o => o.setName('base_image').setDescription('Image URL (leave blank if uploading an image below)').setRequired(false))
        .addAttachmentOption(o => o.setName('base_image_upload').setDescription('Upload the base image (leave blank if using URL)').setRequired(false)),
    async execute(interaction, client, logger) {
        // ...rest of your function unchanged...
        let imageUrl = interaction.options.getString('base_image');
        const attachment = interaction.options.getAttachment('base_image_upload');
        if (attachment && attachment.contentType && attachment.contentType.startsWith('image/')) {
            imageUrl = attachment.url;
        }
        if (!imageUrl) {
            return interaction.reply({ content: 'You must provide either an image URL or upload an image.', ephemeral: true });
        }
        // ...rest unchanged...
        const data = {
            baseImage: imageUrl,
            correctOption: interaction.options.getString('correct_option'),
            options: [
                interaction.options.getString('option_a'),
                interaction.options.getString('option_b'),
                interaction.options.getString('option_c'),
                interaction.options.getString('option_d'),
                interaction.options.getString('option_e'),
            ],
            roundNumber: interaction.options.getInteger('round_number'),
        };
        try {
            let nextWeek = await require('../models/GTBBWeek').GTBBWeek.findOne({ status: 'next' });
            if (!nextWeek) {
                nextWeek = await require('../models/GTBBWeek').GTBBWeek.create({ status: 'next', weekNumber: (await require('../models/GTBBWeek').GTBBWeek.countDocuments()) + 1 });
            }
            await GTBBBase.create({
                ...data,
                week: nextWeek._id
            });
            logger.info(`Base stored for round ${data.roundNumber} in week ${nextWeek.weekNumber} by ${interaction.user.tag}`);
            await interaction.reply({ content: `Question stored for GTBB Week #${nextWeek.weekNumber}, Round #${data.roundNumber}`, ephemeral: true });
        } catch (err) {
            logger.error('Error storing question: ' + err);
            await interaction.reply({ content: 'Error storing the question. Please check your input or contact an admin.', ephemeral: true });
        }
    }
};