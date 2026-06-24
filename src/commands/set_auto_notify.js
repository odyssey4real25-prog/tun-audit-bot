const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { getSettings, saveSettings } = require("../db");

module.exports = {
  minTier: "administrator",
  data: new SlashCommandBuilder()
    .setName("set_auto_notify")
    .setDescription("Turn automated DMs on/off (inactivity, raid capacity, full MAP) and configure timing.")
    .addBooleanOption((opt) =>
      opt.setName("enabled").setDescription("Turn automated DMs on or off").setRequired(true)
    )
    .addIntegerOption((opt) =>
      opt.setName("interval_hours").setDescription("How often to check everyone, e.g. 6").setMinValue(1)
    )
    .addIntegerOption((opt) =>
      opt
        .setName("cooldown_hours")
        .setDescription("Don't DM the same nation for the same issue again within this many hours, e.g. 24")
        .setMinValue(1)
    ),

  async execute(interaction) {
    const enabled = interaction.options.getBoolean("enabled");
    const intervalHours = interaction.options.getInteger("interval_hours");
    const cooldownHours = interaction.options.getInteger("cooldown_hours");

    const settings = getSettings(interaction.guildId);
    settings.autoNotify.enabled = enabled;
    if (intervalHours !== null) settings.autoNotify.intervalHours = intervalHours;
    if (cooldownHours !== null) settings.autoNotify.cooldownHours = cooldownHours;
    saveSettings(interaction.guildId, settings);

    const embed = new EmbedBuilder()
      .setTitle("Auto-Notify Settings Updated")
      .setColor(enabled ? 0x2ecc71 : 0xe74c3c)
      .setDescription(
        `Automated DMs are now **${enabled ? "ON" : "OFF"}**.\n` +
          `Checking every **${settings.autoNotify.intervalHours} hours**, ` +
          `cooldown of **${settings.autoNotify.cooldownHours} hours** per nation per issue.\n\n` +
          "Covers: inactivity, low raid capacity, and full Military Action Points."
      );

    await interaction.reply({ embeds: [embed] });
  }
};
