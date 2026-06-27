const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { TIER_CHOICES } = require("../audit/tiers");
const { getSettings, saveSettings } = require("../db");

module.exports = {
  minTier: "administrator",
  data: new SlashCommandBuilder()
    .setName("set_auto_notify_tier")
    .setDescription("Turn automated DMs on/off for one specific city-count tier.")
    .addStringOption((opt) => {
      opt.setName("tier").setDescription("Which city-count tier").setRequired(true);
      for (const choice of TIER_CHOICES) opt.addChoices(choice);
      return opt;
    })
    .addBooleanOption((opt) =>
      opt
        .setName("enabled")
        .setDescription("False = exclude this tier from automated DMs entirely. True = include it again.")
        .setRequired(true)
    ),

  async execute(interaction) {
    const tierKey = interaction.options.getString("tier");
    const enabled = interaction.options.getBoolean("enabled");
    const tierLabel = TIER_CHOICES.find((c) => c.value === tierKey)?.name ?? tierKey;

    const settings = getSettings(interaction.guildId);
    const excludedTiers = new Set(settings.autoNotify.excludedTiers || []);

    if (enabled) {
      excludedTiers.delete(tierKey);
    } else {
      excludedTiers.add(tierKey);
    }
    settings.autoNotify.excludedTiers = [...excludedTiers];
    saveSettings(interaction.guildId, settings);

    const embed = new EmbedBuilder()
      .setTitle("Auto-Notify Tier Setting Updated")
      .setColor(enabled ? 0x2ecc71 : 0xe74c3c)
      .setDescription(
        enabled
          ? `**${tierLabel}** nations are now **included** in automated DMs again.`
          : `**${tierLabel}** nations are now **excluded** from automated DMs — they won't get inactivity, raid, MAP, or colour bloc reminders, regardless of /set_auto_notify.`
      );

    await interaction.reply({ embeds: [embed] });
  }
};
