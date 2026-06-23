const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { getSettings, saveSettings } = require("../db");

module.exports = {
  minTier: "administrator",
  data: new SlashCommandBuilder()
    .setName("prune_audit_history")
    .setDescription("Delete audit history records older than a set number of days.")
    .addIntegerOption((opt) =>
      opt.setName("older_than_days").setDescription("Delete records older than this many days, e.g. 90").setMinValue(1).setRequired(true)
    )
    .addBooleanOption((opt) =>
      opt.setName("confirm").setDescription("False = preview only (default-safe). True = actually delete.").setRequired(true)
    ),

  async execute(interaction) {
    const olderThanDays = interaction.options.getInteger("older_than_days");
    const confirm = interaction.options.getBoolean("confirm");

    const settings = getSettings(interaction.guildId);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - olderThanDays);

    const toKeep = settings.auditHistory.filter((r) => new Date(r.date) >= cutoff);
    const toRemoveCount = settings.auditHistory.length - toKeep.length;

    if (!confirm) {
      const embed = new EmbedBuilder()
        .setTitle("Preview — Prune Audit History (nothing deleted yet)")
        .setColor(0x3498db)
        .setDescription(
          `This would delete **${toRemoveCount}** record(s) older than ${olderThanDays} days, ` +
            `keeping **${toKeep.length}** of **${settings.auditHistory.length}** total.\n\n` +
            "Re-run this exact command with `confirm: True` to actually delete them."
        );
      await interaction.reply({ embeds: [embed] });
      return;
    }

    settings.auditHistory = toKeep;
    saveSettings(interaction.guildId, settings);

    const embed = new EmbedBuilder()
      .setTitle("Audit History Pruned")
      .setColor(0x2ecc71)
      .setDescription(`Deleted **${toRemoveCount}** record(s) older than ${olderThanDays} days. **${toKeep.length}** record(s) remain.`);

    await interaction.reply({ embeds: [embed] });
  }
};
