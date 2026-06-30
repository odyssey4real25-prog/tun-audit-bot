const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { getSettings } = require("../db");

module.exports = {
  minTier: "member",
  data: new SlashCommandBuilder().setName("view_unsc_config").setDescription("Show the current rotating council configuration and term."),

  async execute(interaction) {
    const settings = getSettings(interaction.guildId);
    const config = settings.unscRotation;

    const termInfo = config.termStartedAt
      ? `Started <t:${Math.floor(new Date(config.termStartedAt).getTime() / 1000)}:R>, ${config.currentTermNationIds.length} seated.`
      : "No term has run yet.";

    const embed = new EmbedBuilder()
      .setTitle("UNSC Rotation Configuration")
      .setColor(0x3498db)
      .setDescription(
        `**Enabled**: ${config.enabled ? "Yes" : "No"}\n` +
          `**Seats**: ${config.seatCount}\n` +
          `**Min seniority**: ${config.minSeniorityDays} days\n` +
          `**Term length**: ${config.intervalDays} days\n` +
          `**Non-permanent role**: ${config.nonPermanentRoleId ? `<@&${config.nonPermanentRoleId}>` : "Not set"}\n` +
          `**Permanent role (excluded)**: ${config.permanentRoleId ? `<@&${config.permanentRoleId}>` : "Not set"}\n` +
          `**Announcement ping role**: ${config.pingRoleId ? `<@&${config.pingRoleId}>` : "Not set"}\n` +
          `**Announce channel**: ${config.announceChannelId ? `<#${config.announceChannelId}>` : "Not set"}\n\n` +
          `**Current term**: ${termInfo}`
      );

    await interaction.reply({ embeds: [embed] });
  }
};
