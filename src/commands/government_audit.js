const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { getAllianceNations } = require("../pnw");
const { checks: infraChecks } = require("../audit/checks/infrastructureLand");
const { checks: buildChecks } = require("../audit/checks/buildsProjects");
const { checks: otherChecks } = require("../audit/checks/others");
const { runChecks } = require("../audit/runAudit");
const { getSettings, saveSettings } = require("../db");

const ALL_CHECKS = [...infraChecks, ...buildChecks, ...otherChecks];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = {
  minTier: "government",
  data: new SlashCommandBuilder()
    .setName("government_audit")
    .setDescription("Run a Grand Audit on every member and show alliance-wide compliance stats."),

  async execute(interaction) {
    await interaction.deferReply();

    const settings = getSettings(interaction.guildId);
    if (!settings.alliance.id) {
      await interaction.editReply("❌ No alliance registered yet — run /set_alliance first.");
      return;
    }

    let members;
    try {
      const result = await getAllianceNations(settings.alliance.id);
      members = result.members;
    } catch (error) {
      await interaction.editReply(`❌ Couldn't fetch alliance nations: ${error.message}`);
      return;
    }

    await interaction.editReply(`⏳ Auditing ${members.length} members, this may take a minute...`);

    let totalPercent = 0;
    let passingCount = 0;
    let failingCount = 0;
    const failureTally = {}; // label -> how many nations failed this check

    for (const nation of members) {
      const results = runChecks(nation, ALL_CHECKS, settings);
      const maxPossible = results.reduce((sum, r) => sum + r.maxPoints, 0);
      const earned = results.reduce((sum, r) => sum + r.earnedPoints, 0);
      const percent = maxPossible === 0 ? 0 : Math.round((earned / maxPossible) * 1000) / 10;
      const pass = percent >= settings.passingScore;

      totalPercent += percent;
      if (pass) passingCount += 1;
      else failingCount += 1;

      for (const r of results) {
        if (!r.passed) {
          failureTally[r.label] = (failureTally[r.label] || 0) + 1;
        }
      }

      settings.auditHistory.push({
        nationId: Number(nation.id),
        nationName: nation.nation_name,
        date: new Date().toISOString().split("T")[0],
        score: percent,
        pass,
        command: "government_audit"
      });

      // Small pause to be a polite neighbor to the PnW API instead of
      // hammering it with 100+ requests all at once.
      await sleep(150);
    }

    saveSettings(interaction.guildId, settings);

    const averageScore = members.length === 0 ? 0 : Math.round((totalPercent / members.length) * 10) / 10;

    const topFailures = Object.entries(failureTally)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([label, count]) => `${label}: ${count} nation(s)`)
      .join("\n") || "None — great job!";

    const embed = new EmbedBuilder()
      .setTitle(`Government Audit — ${settings.alliance.name}`)
      .setColor(0x3498db)
      .addFields(
        { name: "Members Audited", value: String(members.length), inline: true },
        { name: "Average Score", value: `${averageScore}%`, inline: true },
        { name: "Passing", value: String(passingCount), inline: true },
        { name: "Failing", value: String(failingCount), inline: true },
        { name: "Most Common Failures", value: topFailures }
      );

    await interaction.followUp({ embeds: [embed] });
  }
};
