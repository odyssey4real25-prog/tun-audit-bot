// grandAudit.js
//
// Runs every check (Infrastructure & Land + Builds & Projects + Others)
// against one nation and builds a report embed, automatically shrinking
// the report if it would be too big for Discord. Shared by /grand_audit
// (one nation, on demand) and /auto_grand_audit (every alliance member).

const { EmbedBuilder } = require("discord.js");
const { checks: infraChecks } = require("./checks/infrastructureLand");
const { checks: buildChecks } = require("./checks/buildsProjects");
const { checks: otherChecks } = require("./checks/others");
const { runChecks, buildReportEmbed } = require("./runAudit");
const { getGrade, isPassingGrade } = require("./grading");

const ALL_CHECKS = [...infraChecks, ...buildChecks, ...otherChecks];

function buildCompactEmbed(nation, results, settings) {
  const maxPossible = results.reduce((sum, r) => sum + r.maxPoints, 0);
  const earned = results.reduce((sum, r) => sum + r.earnedPoints, 0);
  const percent = maxPossible === 0 ? 0 : Math.round((earned / maxPossible) * 1000) / 10;
  const grade = getGrade(percent, settings.gradeThresholds);
  const pass = isPassingGrade(grade);

  const lines = results.map((r) => `${r.passed ? "✅" : "❌"} ${r.label} (${r.earnedPoints}/${r.maxPoints})`);

  const embed = new EmbedBuilder()
    .setTitle(`Grand Audit — ${nation.nation_name}`)
    .setColor(grade.color)
    .addFields(
      { name: "Cities", value: String(nation.num_cities), inline: true },
      { name: "Score", value: `${percent}% (${earned}/${maxPossible} pts)`, inline: true },
      { name: "Grade", value: `${grade.emoji} ${grade.label}`, inline: true }
    )
    .setDescription(lines.join("\n"))
    .setFooter({ text: "Report shortened to fit. Run /infrastructure_land, /build_slots_project, or /others for full detail on a failed check." });

  return { embed, percent, pass, grade };
}

function runGrandAudit(nation, settings) {
  const results = runChecks(nation, ALL_CHECKS, settings);

  let { embed, percent, pass, grade } = buildReportEmbed(nation, results, settings, "Grand Audit", {
    maxDetailLength: 180
  });

  // Discord embeds have a hard 6000-character total limit.
  if (JSON.stringify(embed.toJSON()).length > 5800) {
    const compact = buildCompactEmbed(nation, results, settings);
    embed = compact.embed;
    percent = compact.percent;
    pass = compact.pass;
    grade = compact.grade;
  }

  return { results, embed, percent, pass, grade };
}

module.exports = { runGrandAudit, ALL_CHECKS };
