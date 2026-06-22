// allianceAudit.js
//
// Runs every check against every member of an alliance and hands back a
// structured list — one entry per nation — instead of building a Discord
// embed itself. This lets different commands (mentor dashboard, failing
// nations list, government report) slice the same underlying data their
// own way without each re-implementing the "loop over the whole alliance" part.

const { getAllianceNations } = require("../pnw");
const { ALL_CHECKS } = require("./grandAudit");
const { runChecks } = require("./runAudit");
const { getGrade, isPassingGrade } = require("./grading");

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function auditAllMembers(allianceId, settings, { delayMs = 150 } = {}) {
  const { members } = await getAllianceNations(allianceId);

  const auditResults = [];
  for (const nation of members) {
    const results = runChecks(nation, ALL_CHECKS, settings);
    const maxPossible = results.reduce((sum, r) => sum + r.maxPoints, 0);
    const earned = results.reduce((sum, r) => sum + r.earnedPoints, 0);
    const percent = maxPossible === 0 ? 0 : Math.round((earned / maxPossible) * 1000) / 10;
    const grade = getGrade(percent, settings.gradeThresholds);
    const pass = isPassingGrade(grade);

    auditResults.push({ nation, results, percent, pass, grade });

    // Be polite to the PnW API instead of firing 100+ requests at once.
    await sleep(delayMs);
  }

  return auditResults;
}

module.exports = { auditAllMembers };
