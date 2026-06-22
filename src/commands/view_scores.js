const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { getSettings } = require("../db");

module.exports = {
  minTier: "member",
  data: new SlashCommandBuilder()
    .setName("view_scores")
    .setDescription("View the current point value of every audit check."),

  async execute(interaction) {
    const settings = getSettings(interaction.guildId);
    const total = Object.values(settings.scores).reduce((sum, v) => sum + v, 0);

    const lines = Object.entries(settings.scores).map(
      ([key, value]) => `**${key}**: ${value} pts`
    );

    const embed = new EmbedBuilder()
      .setTitle("Current Audit Scoring")
      .setColor(0x3498db)
      .setDescription(lines.join("\n"))
      .setFooter({ text: `Total: ${total} / 100. Passing score: ${settings.passingScore}%` });

    await interaction.reply({ embeds: [embed] });
  }
};
