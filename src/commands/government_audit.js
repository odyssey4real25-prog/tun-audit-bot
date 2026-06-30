const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { auditAllMembers } = require("../audit/allianceAudit");
const { getAllianceName, resolveAllianceId } = require("../pnw");
const { getSettings, saveSettings } = require("../db");

module.exports = {
  minTier: "government",
  data: new SlashCommandBuilder()
    .setName("government_audit")
    .setDescription("Run a Grand Audit on every member and show alliance-wide compliance stats.")
    .addStringOption((opt) =>
      opt.setName("alliance").setDescription("Audit a different alliance by ID, name, or link. Leave blank to use your home alliance.")
    ),

  async execute(interaction) {
    await interaction.deferReply();

    const settings = getSettings(interaction.guildId);
    const allianceInput = interaction.options.getString("alliance");
    let targetAllianceId;
    if (allianceInput) {
      try {
        targetAllianceId = await resolveAllianceId(allianceInput);
      } catch (error) {
        await interaction.editReply(`❌ ${error.message}`);
        return;
      }
    } else {
      targetAllianceId = settings.alliance.id;
    }

    if (!targetAllianceId) {
      await interaction.editReply("❌ No alliance registered yet — run /set_alliance first, or provide an alliance.");
      return;
    }

    const allianceName = targetAllianceId === settings.alliance.id
      ? (settings.alliance.name || `Alliance ${targetAllianceId}`)
      : await getAllianceName(targetAllianceId);

    await interaction.editReply(`⏳ Auditing **${allianceName}** members, this may take a minute...`);

    let auditResults;
    try {
      auditResults = await auditAllMembers(targetAllianceId, settings);
    } catch (error) {
      await interaction.editReply(`❌ Couldn't fetch alliance nations: ${error.message}`);
      return;
    }

    const gradeCounts = { Excellent: 0, Passing: 0, "Needs Improvement": 0, Failing: 0 };
    const failureTally = {}; // label -> how many nations failed this check
    let totalPercent = 0;

    for (const { results, percent, grade, nation } of auditResults) {
      totalPercent += percent;
      gradeCounts[grade.label] += 1;

      for (const r of results) {
        if (!r.passed) failureTally[r.label] = (failureTally[r.label] || 0) + 1;
      }

      settings.auditHistory.push({
        nationId: Number(nation.id),
        nationName: nation.nation_name,
        date: new Date().toISOString().split("T")[0],
        score: percent,
        pass: grade.label === "Excellent" || grade.label === "Passing",
        grade: grade.label,
        command: "government_audit"
      });
    }

    saveSettings(interaction.guildId, settings);

    const averageScore = auditResults.length === 0 ? 0 : Math.round((totalPercent / auditResults.length) * 10) / 10;

    const topFailures =
      Object.entries(failureTally)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([label, count]) => `${label}: ${count} nation(s)`)
        .join("\n") || "None — great job!";

    const embed = new EmbedBuilder()
      .setTitle(`Government Audit — ${allianceName}`)
      .setColor(0x3498db)
      .addFields(
        { name: "Members Audited", value: String(auditResults.length), inline: true },
        { name: "Average Score", value: `${averageScore}%`, inline: true },
        { name: "\u200b", value: "\u200b", inline: true },
        { name: "🟢 Excellent", value: String(gradeCounts.Excellent), inline: true },
        { name: "🟢 Passing", value: String(gradeCounts.Passing), inline: true },
        { name: "🟡 Needs Improvement", value: String(gradeCounts["Needs Improvement"]), inline: true },
        { name: "🔴 Failing", value: String(gradeCounts.Failing), inline: true },
        { name: "Most Common Failures", value: topFailures }
      );

    await interaction.followUp({ embeds: [embed] });
  }
};
