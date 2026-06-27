const { SlashCommandBuilder } = require("discord.js");
const { runAutoNotifyForGuild } = require("../audit/autoNotify");
const { getSettings, saveSettings } = require("../db");

module.exports = {
  minTier: "government",
  data: new SlashCommandBuilder()
    .setName("run_auto_notify")
    .setDescription("Manually run the automated-notify pass now, instead of waiting for the schedule.")
    .addBooleanOption((opt) =>
      opt.setName("ignore_cooldown").setDescription("Send even to nations DM'd recently (useful for testing)")
    ),

  async execute(interaction) {
    await interaction.deferReply();

    const settings = getSettings(interaction.guildId);
    if (!settings.alliance.id) {
      await interaction.editReply("❌ No alliance registered yet — run /set_alliance first.");
      return;
    }

    const ignoreCooldown = interaction.options.getBoolean("ignore_cooldown") ?? false;

    await interaction.editReply("⏳ Running auto-notify pass now, this may take a few minutes...");

    let stats;
    try {
      stats = await runAutoNotifyForGuild(interaction.client, interaction.guild, settings, { ignoreCooldown });
    } catch (error) {
      await interaction.editReply(`❌ Couldn't run the notify pass: ${error.message}`);
      return;
    }

    settings.autoNotify.lastRunAt = new Date().toISOString();
    saveSettings(interaction.guildId, settings);

    await interaction.followUp(
      `✅ Checked **${stats.checked}** member(s). Sent **${stats.dmsSent}** DM(s). ` +
        `${stats.dmsFailed > 0 ? `❌ ${stats.dmsFailed} failed to deliver. ` : ""}` +
        `⏭️ ${stats.skippedNoDiscord} had no Discord linked, ${stats.skippedCooldown} were on cooldown, ${stats.skippedExcludedTier} were in an excluded tier.`
    );
  }
};
