const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { TIER_CHOICES } = require("../audit/tiers");
const { getSettings } = require("../db");

module.exports = {
  minTier: "member",
  data: new SlashCommandBuilder().setName("view_auto_notify_tiers").setDescription("Show which city-count tiers are excluded from automated DMs."),

  async execute(interaction) {
    const settings = getSettings(interaction.guildId);
    const excludedTiers = new Set(settings.autoNotify.excludedTiers || []);

    const lines = TIER_CHOICES.map(
      (tier) => `**${tier.name}**: ${excludedTiers.has(tier.value) ? "🚫 Excluded" : "✅ Included"}`
    );

    const embed = new EmbedBuilder()
      .setTitle("Auto-Notify Tier Settings")
      .setColor(0x3498db)
      .setDescription(lines.join("\n"))
      .setFooter({ text: "Use /set_auto_notify_tier to change this." });

    await interaction.reply({ embeds: [embed] });
  }
};
