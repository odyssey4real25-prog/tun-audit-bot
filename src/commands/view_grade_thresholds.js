const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { getSettings } = require("../db");

module.exports = {
  minTier: "member",
  data: new SlashCommandBuilder().setName("view_grade_thresholds").setDescription("View the current grade tier cutoffs."),

  async execute(interaction) {
    const settings = getSettings(interaction.guildId);
    const { excellent, good, average } = settings.gradeThresholds;

    const embed = new EmbedBuilder()
      .setTitle("Current Grade Thresholds")
      .setColor(0x3498db)
      .setDescription(
        `🟢 **Excellent**: ${excellent}%+\n` +
          `🟢 **Passing**: ${good}%–${excellent - 1}%\n` +
          `🟡 **Needs Improvement**: ${average}%–${good - 1}%\n` +
          `🔴 **Failing**: below ${average}%`
      );

    await interaction.reply({ embeds: [embed] });
  }
};
