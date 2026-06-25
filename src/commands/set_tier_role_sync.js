const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { getSettings, saveSettings } = require("../db");

module.exports = {
  minTier: "administrator",
  data: new SlashCommandBuilder()
    .setName("set_tier_role_sync")
    .setDescription("Turn on/off automatically keeping tier roles in sync with each member's current city count.")
    .addBooleanOption((opt) =>
      opt.setName("enabled").setDescription("Turn automatic tier role syncing on or off").setRequired(true)
    )
    .addIntegerOption((opt) =>
      opt.setName("interval_hours").setDescription("How often to check everyone, e.g. 12").setMinValue(1)
    ),

  async execute(interaction) {
    const enabled = interaction.options.getBoolean("enabled");
    const intervalHours = interaction.options.getInteger("interval_hours");

    const settings = getSettings(interaction.guildId);
    settings.tierRoleSync.enabled = enabled;
    if (intervalHours !== null) settings.tierRoleSync.intervalHours = intervalHours;
    saveSettings(interaction.guildId, settings);

    const embed = new EmbedBuilder()
      .setTitle("Tier Role Sync Updated")
      .setColor(enabled ? 0x2ecc71 : 0xe74c3c)
      .setDescription(
        `Automatic tier role syncing is now **${enabled ? "ON" : "OFF"}**.\n` +
          `Checking every **${settings.tierRoleSync.intervalHours} hours**.\n\n` +
          "Make sure you've mapped all 5 tiers with /set_tier_role first, and that the bot's role sits above them in Server Settings → Roles."
      );

    await interaction.reply({ embeds: [embed] });
  }
};
