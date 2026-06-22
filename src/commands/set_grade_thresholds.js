const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { getSettings, saveSettings } = require("../db");

module.exports = {
  minTier: "administrator",
  data: new SlashCommandBuilder()
    .setName("set_grade_thresholds")
    .setDescription("Set the minimum % score for Excellent, Passing, and Needs Improvement. Below the lowest is Failing.")
    .addIntegerOption((opt) =>
      opt.setName("excellent").setDescription("Minimum % for Excellent, e.g. 90").setMinValue(0).setMaxValue(100).setRequired(true)
    )
    .addIntegerOption((opt) =>
      opt.setName("passing").setDescription("Minimum % for Passing, e.g. 80").setMinValue(0).setMaxValue(100).setRequired(true)
    )
    .addIntegerOption((opt) =>
      opt
        .setName("needs_improvement")
        .setDescription("Minimum % for Needs Improvement, e.g. 70 — anything below this is Failing")
        .setMinValue(0)
        .setMaxValue(100)
        .setRequired(true)
    ),

  async execute(interaction) {
    const excellent = interaction.options.getInteger("excellent");
    const good = interaction.options.getInteger("passing");
    const average = interaction.options.getInteger("needs_improvement");

    if (!(excellent >= good && good >= average)) {
      await interaction.reply({
        content:
          "❌ These need to be in descending order: Excellent ≥ Passing ≥ Needs Improvement. " +
          `You gave Excellent: ${excellent}, Passing: ${good}, Needs Improvement: ${average}.`,
        ephemeral: true
      });
      return;
    }

    const settings = getSettings(interaction.guildId);
    settings.gradeThresholds = { excellent, good, average };
    saveSettings(interaction.guildId, settings);

    const embed = new EmbedBuilder()
      .setTitle("Grade Thresholds Updated")
      .setColor(0x2ecc71)
      .setDescription(
        `🟢 **Excellent**: ${excellent}%+\n` +
          `🟢 **Passing**: ${good}%–${excellent - 1}%\n` +
          `🟡 **Needs Improvement**: ${average}%–${good - 1}%\n` +
          `🔴 **Failing**: below ${average}%`
      );

    await interaction.reply({ embeds: [embed] });
  }
};
