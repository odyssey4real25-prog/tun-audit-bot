// runAudit.js
//
// This is the shared "engine" used by every audit command (/infrastructure_land,
// /build_slots_project, /others, /grand_audit). You give it:
//   - the nation's data
//   - a list of check definitions (each with a run() function)
//   - the server's settings (for point values + grade thresholds)
//   - a label for the report title and which command triggered it
//
// It runs every check, totals up the points, works out the grade tier
// (Excellent / Passing / Needs Improvement / Failing), builds a nice
// Discord embed, and returns a record we can save into audit history.

const { EmbedBuilder } = require("discord.js");
const { getGrade, isPassingGrade } = require("./grading");

function runChecks(nation, checkList, settings) {
  return checkList.map((check) => {
    const result = check.run(nation, settings);
    const maxPoints = settings.scores[check.key] ?? 0;
    const earnedPoints = result.passed ? maxPoints : 0;
    return {
      key: check.key,
      label: check.label,
      recommendation: check.recommendation,
      passed: result.passed,
      detail: result.detail,
      maxPoints,
      earnedPoints
    };
  });
}

function buildReportEmbed(nation, results, settings, reportTitle, options = {}) {
  const maxDetailLength = options.maxDetailLength ?? 1000;

  const maxPossible = results.reduce((sum, r) => sum + r.maxPoints, 0);
  const earned = results.reduce((sum, r) => sum + r.earnedPoints, 0);
  const percent = maxPossible === 0 ? 0 : Math.round((earned / maxPossible) * 1000) / 10;
  const grade = getGrade(percent, settings.gradeThresholds);
  const pass = isPassingGrade(grade);

  const embed = new EmbedBuilder()
    .setTitle(`${reportTitle} — ${nation.nation_name}`)
    .setColor(grade.color)
    .addFields(
      { name: "Cities", value: String(nation.num_cities), inline: true },
      { name: "Score", value: `${percent}% (${earned}/${maxPossible} pts)`, inline: true },
      { name: "Grade", value: `${grade.emoji} ${grade.label}`, inline: true }
    );

  for (const r of results) {
    const icon = r.passed ? "✅" : "❌";
    let fieldText = r.detail;
    if (!r.passed) {
      fieldText += `\n*Recommendation: ${r.recommendation}*`;
    }
    if (fieldText.length > maxDetailLength) fieldText = fieldText.slice(0, maxDetailLength) + "...";

    embed.addFields({
      name: `${icon} ${r.label} (${r.earnedPoints}/${r.maxPoints} pts)`,
      value: fieldText
    });
  }

  return { embed, percent, pass, grade, earned, maxPossible };
}

function buildHistoryRecord(nation, percent, pass, command, grade) {
  return {
    nationId: Number(nation.id),
    nationName: nation.nation_name,
    date: new Date().toISOString().split("T")[0],
    score: percent,
    pass,
    grade: grade ? grade.label : undefined,
    command
  };
}

module.exports = { runChecks, buildReportEmbed, buildHistoryRecord };
