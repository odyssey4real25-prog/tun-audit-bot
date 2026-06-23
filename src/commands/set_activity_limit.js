const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { getSettings, saveSettings } = require("../db");

module.exports = {
  minTier: "administrator",
  data: new SlashCommandBuilder()
    .setName("set_activity_limit")
    .setDescription("Set how many hours of inactivity before a nation is considered inactive.")
    .addIntegerOption((opt) =>
      opt.setName("hours").setDescription("Hours of inactivity, e.g. 36").setMinValue(1).setRequired(true)
    ),

  async execute(interaction) {
    const hours = interaction.options.getInteger("hours");

    const settings = getSettings(interaction.guildId);
    settings.activityLimitHours = hours;
    saveSettings(interaction.guildId, settings);

    const embed = new EmbedBuilder()
      .setTitle("Activity Limit Updated")
      .setColor(0x2ecc71)
      .setDescription(`Nations inactive for more than **${hours} hours** will now be flagged as inactive.`);

    await interaction.reply({ embeds: [embed] });
  }
};
