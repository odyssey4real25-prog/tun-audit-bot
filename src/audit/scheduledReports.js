// scheduledReports.js
//
// Unlike autoNotify.js (which only DMs nations that have a problem),
// this sends EVERY member their own complete Grand Audit report on a
// fixed schedule — like a personal report card, whether they're doing
// great or not.

const { getAllianceNations } = require("../pnw");
const { resolveDiscordUser } = require("./resolveDiscordUser");
const { runGrandAudit } = require("./grandAudit");
const { buildHistoryRecord } = require("./runAudit");

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runScheduledReportsForGuild(client, guild, settings) {
  const stats = { checked: 0, dmsSent: 0, dmsFailed: 0, skippedNoDiscord: 0 };

  if (!settings.alliance.id) return stats;

  const { members } = await getAllianceNations(settings.alliance.id);
  stats.checked = members.length;

  for (const nation of members) {
    const user = await resolveDiscordUser(client, guild, nation);
    if (!user) {
      stats.skippedNoDiscord += 1;
      continue;
    }

    const { embed, percent, pass, grade } = runGrandAudit(nation, settings);

    try {
      await user.send({ embeds: [embed] });
      stats.dmsSent += 1;
      settings.auditHistory.push(buildHistoryRecord(nation, percent, pass, "scheduled_report", grade));
    } catch (error) {
      stats.dmsFailed += 1;
    }

    await sleep(500); // be polite to Discord's DM rate limits
  }

  return stats;
}

module.exports = { runScheduledReportsForGuild };
