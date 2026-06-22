const { SlashCommandBuilder } = require("discord.js");
const { getNation, resolveNationId } = require("../pnw");
const { runGrandAudit } = require("../audit/grandAudit");
const { getSettings, saveSettings } = require("../db");
const { buildHistoryRecord } = require("../audit/runAudit");

module.exports = {
  minTier: "member",
  data: new SlashCommandBuilder()
    .setName("grand_audit")
    .setDescription("Run a complete audit (Infrastructure & Land, Builds & Projects, Others) on a nation.")
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

    const { embed, percent, pass, grade } = runGrandAudit(nation, settings);

    settings.auditHistory.push(buildHistoryRecord(nation, percent, pass, "grand_audit", grade));
    saveSettings(interaction.guildId, settings);

    await interaction.editReply({ embeds: [embed] });
  }
};
