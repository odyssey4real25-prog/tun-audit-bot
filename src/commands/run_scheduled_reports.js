const { SlashCommandBuilder } = require("discord.js");
const { runScheduledReportsForGuild } = require("../audit/scheduledReports");
const { getSettings, saveSettings } = require("../db");

module.exports = {
  minTier: "government",
  data: new SlashCommandBuilder()
    .setName("run_scheduled_reports")
    .setDescription("Manually send everyone their Grand Audit report now, instead of waiting for the schedule."),

  async execute(interaction) {
    await interaction.deferReply();

    const settings = getSettings(interaction.guildId);
    if (!settings.alliance.id) {
      await interaction.editReply("❌ No alliance registered yet — run /set_alliance first.");
      return;
    }

    await interaction.editReply("⏳ Sending personal Grand Audit reports to every member, this may take a few minutes...");

    let stats;
    try {
      stats = await runScheduledReportsForGuild(interaction.client, interaction.guild, settings);
    } catch (error) {
      await interaction.editReply(`❌ Couldn't run the reports pass: ${error.message}`);
      return;
    }

    settings.scheduledReports.lastRunAt = new Date().toISOString();
    saveSettings(interaction.guildId, settings);

    await interaction.followUp(
      `✅ Checked **${stats.checked}** member(s). Sent **${stats.dmsSent}** report(s). ` +
        `${stats.dmsFailed > 0 ? `❌ ${stats.dmsFailed} failed to deliver. ` : ""}` +
        `⏭️ ${stats.skippedNoDiscord} had no Discord linked.`
    );
  }
};
