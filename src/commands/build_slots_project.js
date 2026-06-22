const { SlashCommandBuilder } = require("discord.js");
const { getNation, resolveNationId } = require("../pnw");
const { checks } = require("../audit/checks/buildsProjects");
const { runChecks, buildReportEmbed, buildHistoryRecord } = require("../audit/runAudit");
const { getSettings, saveSettings } = require("../db");

module.exports = {
  minTier: "member",
  data: new SlashCommandBuilder()
    .setName("build_slots_project")
    .setDescription("Audit a nation's Builds, Military, and Project compliance.")
    .addStringOption((opt) =>
      opt.setName("nation").setDescription("Nation ID, name, or profile link").setRequired(true)
    ),

  async execute(interaction) {
    await interaction.deferReply();

    const settings = getSettings(interaction.guildId);

    let nation;
    try {
      const nationId = await resolveNationId(interaction.options.getString("nation"));
      nation = await getNation(nationId);
    } catch (error) {
      await interaction.editReply(`❌ Couldn't fetch that nation: ${error.message}`);
      return;
    }

    const results = runChecks(nation, checks, settings);
    const { embed, percent, pass, grade } = buildReportEmbed(nation, results, settings, "Builds & Projects Audit");

    const record = buildHistoryRecord(nation, percent, pass, "build_slots_project", grade);
    settings.auditHistory.push(record);
    saveSettings(interaction.guildId, settings);

    await interaction.editReply({ embeds: [embed] });
  }
};
