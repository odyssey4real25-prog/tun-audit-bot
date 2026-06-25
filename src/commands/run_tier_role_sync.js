const { SlashCommandBuilder } = require("discord.js");
const { runTierRoleSyncForGuild } = require("../audit/tierRoleSync");
const { getSettings, saveSettings } = require("../db");

module.exports = {
  minTier: "government",
  data: new SlashCommandBuilder()
    .setName("run_tier_role_sync")
    .setDescription("Manually sync everyone's tier role now, instead of waiting for the schedule."),

  async execute(interaction) {
    await interaction.deferReply();

    const settings = getSettings(interaction.guildId);
    if (!settings.alliance.id) {
      await interaction.editReply("❌ No alliance registered yet — run /set_alliance first.");
      return;
    }

    const anyTierRoleSet = Object.values(settings.tierRoles).some(Boolean);
    if (!anyTierRoleSet) {
      await interaction.editReply("❌ No tier roles configured yet — run /set_tier_role for at least one tier first.");
      return;
    }

    await interaction.editReply("⏳ Syncing tier roles for every member, this may take a few minutes...");

    let stats;
    try {
      stats = await runTierRoleSyncForGuild(interaction.client, interaction.guild, settings);
    } catch (error) {
      await interaction.editReply(`❌ Couldn't run the sync: ${error.message}`);
      return;
    }

    settings.tierRoleSync.lastRunAt = new Date().toISOString();
    saveSettings(interaction.guildId, settings);

    await interaction.followUp(
      `✅ Checked **${stats.checked}** member(s). Updated **${stats.updated}**, already correct **${stats.alreadyCorrect}**. ` +
        `${stats.roleErrors > 0 ? `⚠️ ${stats.roleErrors} failed (check the bot's role position/permissions). ` : ""}` +
        `⏭️ ${stats.skippedNoDiscord} had no Discord linked, ${stats.skippedNoRoleConfigured} had no role configured for their tier.`
    );
  }
};
