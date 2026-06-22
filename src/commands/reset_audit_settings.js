const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { getSettings, saveSettings, defaultSettings } = require("../db");

module.exports = {
  minTier: "administrator",
  data: new SlashCommandBuilder()
    .setName("reset_audit_settings")
    .setDescription("Restore all bot settings to their defaults. This cannot be undone.")
    .addBooleanOption((opt) =>
      opt
        .setName("confirm")
        .setDescription("Set to True to confirm — this resets alliance info, scores, MMR, roles, and policies.")
        .setRequired(true)
    ),

  async execute(interaction) {
    const confirm = interaction.options.getBoolean("confirm");

    if (!confirm) {
      await interaction.reply({
        content: "Nothing was changed. Run this again with `confirm: True` if you really want to reset all settings.",
        ephemeral: true
      });
      return;
    }

    // Audit history is a record of past audits, not a "setting" — keep it.
    const existing = getSettings(interaction.guildId);
    const fresh = defaultSettings();
    fresh.auditHistory = existing.auditHistory;
    saveSettings(interaction.guildId, fresh);

    const embed = new EmbedBuilder()
      .setTitle("Settings Reset")
      .setColor(0x2ecc71)
      .setDescription(
        "All bot settings have been restored to their defaults (alliance info, scores, MMR, role mapping, " +
          "warchest/resource policy, audit channel). Your audit history was kept. Run `/set_alliance` to start reconfiguring."
      );

    await interaction.reply({ embeds: [embed] });
  }
};
