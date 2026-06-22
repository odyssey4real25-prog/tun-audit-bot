const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { auditAllMembers } = require("../audit/allianceAudit");
const { getSettings } = require("../db");

module.exports = {
  minTier: "mentor",
  data: new SlashCommandBuilder()
    .setName("mentor_dashboard")
    .setDescription("Overview of audited nations, common failures, and who needs mentor attention."),

  async execute(interaction) {
    await interaction.deferReply();

    const settings = getSettings(interaction.guildId);
    if (!settings.alliance.id) {
      await interaction.editReply("❌ No alliance registered yet — run /set_alliance first.");
      return;
    }

    await interaction.editReply("⏳ Auditing all members, this may take a minute...");

    let auditResults;
    try {
      auditResults = await auditAllMembers(settings.alliance.id, settings);
    } catch (error) {
      await interaction.editReply(`❌ Couldn't fetch alliance nations: ${error.message}`);
      return;
    }

    const failureTally = {};
    for (const { results } of auditResults) {
      for (const r of results) {
        if (!r.passed) failureTally[r.label] = (failureTally[r.label] || 0) + 1;
      }
    }
    const topFailures =
      Object.entries(failureTally)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([label, count]) => `${label}: ${count} nation(s)`)
        .join("\n") || "None — great job!";

    const needsAttention = auditResults
      .filter((r) => !r.pass)
      .sort((a, b) => a.percent - b.percent)
      .slice(0, 10)
      .map((r) => `${r.nation.nation_name}: ${r.percent}%`)
      .join("\n") || "No nations are currently failing!";

    const embed = new EmbedBuilder()
      .setTitle(`Mentor Dashboard — ${settings.alliance.name}`)
      .setColor(0x3498db)
      .addFields(
        { name: "Total Nations Audited", value: String(auditResults.length), inline: true },
        { name: "Common Failures", value: topFailures },
        { name: "Needs Mentor Attention (lowest scores)", value: needsAttention }
      );

    await interaction.followUp({ embeds: [embed] });
  }
};
