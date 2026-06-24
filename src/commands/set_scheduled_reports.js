const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { getSettings, saveSettings } = require("../db");

module.exports = {
  minTier: "administrator",
  data: new SlashCommandBuilder()
    .setName("set_scheduled_reports")
    .setDescription("Turn on/off sending every member their own Grand Audit report on a fixed schedule.")
    .addBooleanOption((opt) =>
      opt.setName("enabled").setDescription("Turn scheduled personal reports on or off").setRequired(true)
    )
    .addIntegerOption((opt) =>
      opt
        .setName("interval_days")
        .setDescription("How often, in days — 7 = weekly, 14 = every 2 weeks, 3 = every 3 days, etc.")
        .setMinValue(1)
    ),

  async execute(interaction) {
    const enabled = interaction.options.getBoolean("enabled");
    const intervalDays = interaction.options.getInteger("interval_days");

    const settings = getSettings(interaction.guildId);
    settings.scheduledReports.enabled = enabled;
    if (intervalDays !== null) settings.scheduledReports.intervalDays = intervalDays;
    saveSettings(interaction.guildId, settings);

    const embed = new EmbedBuilder()
      .setTitle("Scheduled Reports Updated")
      .setColor(enabled ? 0x2ecc71 : 0xe74c3c)
      .setDescription(
        `Personal Grand Audit reports are now **${enabled ? "ON" : "OFF"}**.\n` +
          `Every member will get their own report by DM every **${settings.scheduledReports.intervalDays} day(s)**.`
      );

    await interaction.reply({ embeds: [embed] });
  }
};
