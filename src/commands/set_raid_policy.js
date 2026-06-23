const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { getSettings, saveSettings } = require("../db");

module.exports = {
  minTier: "administrator",
  data: new SlashCommandBuilder()
    .setName("set_raid_policy")
    .setDescription("Set which nations the raid requirement applies to, and how many active offensive wars they need.")
    .addIntegerOption((opt) =>
      opt
        .setName("max_city_tier")
        .setDescription("Applies to nations at or below this many cities, e.g. 14")
        .setMinValue(1)
        .setRequired(true)
    )
    .addIntegerOption((opt) =>
      opt
        .setName("required_wars")
        .setDescription("Minimum active offensive wars required, e.g. 4")
        .setMinValue(0)
        .setRequired(true)
    ),

  async execute(interaction) {
    const maxCityTier = interaction.options.getInteger("max_city_tier");
    const requiredOffensiveWars = interaction.options.getInteger("required_wars");

    const settings = getSettings(interaction.guildId);
    settings.raidPolicy = { maxCityTier, requiredOffensiveWars };
    saveSettings(interaction.guildId, settings);

    const embed = new EmbedBuilder()
      .setTitle("Raid Policy Updated")
      .setColor(0x2ecc71)
      .setDescription(
        `Nations with **${maxCityTier} cities or fewer** now need **${requiredOffensiveWars} active offensive wars**. ` +
          `Nations above ${maxCityTier} cities are exempt.`
      );

    await interaction.reply({ embeds: [embed] });
  }
};
