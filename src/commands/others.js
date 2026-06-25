const { SlashCommandBuilder } = require("discord.js");
const { getNation } = require("../pnw");
const { resolveNationInput } = require("../audit/resolveNationInput");
const { checks } = require("../audit/checks/others");
const { runChecks, buildReportEmbed, buildHistoryRecord } = require("../audit/runAudit");
const { getSettings, saveSettings } = require("../db");

module.exports = {
  minTier: "member",
  data: new SlashCommandBuilder()
    .setName("others")
    .setDescription("Run all non-build audit checks on a nation.")
    .addStringOption((opt) =>
      opt.setName("nation").setDescription("Nation ID, name, profile link, or @mention their Discord").setRequired(true)
    ),

  async execute(interaction) {
    await interaction.deferReply();

    const settings = getSettings(interaction.guildId);

    let nation;
    try {
      const nationId = await resolveNationInput(interaction.client, settings, interaction.options.getString("nation"));
      nation = await getNation(nationId);
    } catch (error) {
      await interaction.editReply(`❌ Couldn't fetch that nation: ${error.message}`);
      return;
    }

    if (nation.vacation_mode_turns > 0) {
      await interaction.editReply(`ℹ️ **${nation.nation_name}** is currently in Vacation Mode — audits are skipped for VM nations.`);
      return;
    }

    const results = runChecks(nation, checks, settings);
    const { embed, percent, pass, grade } = buildReportEmbed(nation, results, settings, "Other Compliance Audit");

    const record = buildHistoryRecord(nation, percent, pass, "others", grade);
    settings.auditHistory.push(record);
    saveSettings(interaction.guildId, settings);

    await interaction.editReply({ embeds: [embed] });
  }
};
