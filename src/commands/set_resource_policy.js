const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { getSettings, saveSettings } = require("../db");

module.exports = {
  minTier: "administrator",
  data: new SlashCommandBuilder()
    .setName("set_resource_policy")
    .setDescription("Set the resource upkeep buffer (in days).")
    .addIntegerOption((opt) =>
      opt.setName("upkeep_buffer_days").setDescription("Days of upkeep buffer, e.g. 5").setMinValue(0).setRequired(true)
    ),

  async execute(interaction) {
    const days = interaction.options.getInteger("upkeep_buffer_days");

    const settings = getSettings(interaction.guildId);
    settings.resourcePolicy.upkeepBufferDays = days;
    saveSettings(interaction.guildId, settings);

    const embed = new EmbedBuilder()
      .setTitle("Resource Policy Updated")
      .setColor(0x2ecc71)
      .setDescription(`Upkeep buffer set to **${days} days**.`);

    await interaction.reply({ embeds: [embed] });
  }
};
