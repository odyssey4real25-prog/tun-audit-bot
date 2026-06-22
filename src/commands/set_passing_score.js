const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { getSettings, saveSettings } = require("../db");

module.exports = {
  minTier: "administrator",
  data: new SlashCommandBuilder()
    .setName("set_passing_score")
    .setDescription("Set the minimum percentage score needed to pass an audit.")
    .addIntegerOption((opt) =>
      opt
        .setName("percentage")
        .setDescription("Passing percentage, e.g. 75")
        .setMinValue(0)
        .setMaxValue(100)
        .setRequired(true)
    ),

  async execute(interaction) {
    const settings = getSettings(interaction.guildId);
    settings.passingScore = interaction.options.getInteger("percentage");
    saveSettings(interaction.guildId, settings);

    const embed = new EmbedBuilder()
      .setTitle("Passing Score Updated")
      .setColor(0x2ecc71)
      .setDescription(`Nations now need **${settings.passingScore}%** or higher to pass an audit.`);

    await interaction.reply({ embeds: [embed] });
  }
};
