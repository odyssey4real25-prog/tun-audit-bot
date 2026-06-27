// autoNotify.js
//
// Runs one complete pass for a single guild: fetch every alliance member,
// check all 3 conditions, and DM anyone who matches — but only if they
// haven't already been DM'd for that same condition within the configured
// cooldown window, so a persistent condition doesn't spam someone every run.

const { getAllianceNations, isActiveMember } = require("../pnw");
const { resolveDiscordUser } = require("./resolveDiscordUser");
const { CONDITIONS } = require("./autoNotifyConditions");
const { tierKeyFor } = require("./tiers");

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isOnCooldown(settings, nationId, conditionKey, cooldownHours) {
  const key = `${nationId}:${conditionKey}`;
  const lastNotified = settings.lastNotified[key];
  if (!lastNotified) return false;
  const hoursSince = (Date.now() - new Date(lastNotified).getTime()) / (1000 * 60 * 60);
  return hoursSince < cooldownHours;
}

function markNotified(settings, nationId, conditionKey) {
  settings.lastNotified[`${nationId}:${conditionKey}`] = new Date().toISOString();
}

async function runAutoNotifyForGuild(client, guild, settings, { ignoreCooldown = false } = {}) {
  const stats = { checked: 0, dmsSent: 0, dmsFailed: 0, skippedNoDiscord: 0, skippedCooldown: 0, skippedExcludedTier: 0 };

  if (!settings.alliance.id) return stats;

  const { members } = await getAllianceNations(settings.alliance.id);
  const activeMembers = members.filter(isActiveMember);
  stats.checked = activeMembers.length;

  const excludedTiers = settings.autoNotify.excludedTiers || [];

  for (const nation of activeMembers) {
    if (excludedTiers.includes(tierKeyFor(nation.num_cities))) {
      stats.skippedExcludedTier += 1;
      continue;
    }

    // Figure out which conditions actually apply to this nation first,
    // before bothering to look up their Discord account.
    const matches = [];
    for (const condition of CONDITIONS) {
      const info = condition.check(nation, settings);
      if (!info) continue;

      if (!ignoreCooldown && isOnCooldown(settings, nation.id, condition.key, settings.autoNotify.cooldownHours)) {
        stats.skippedCooldown += 1;
        continue;
      }
      matches.push({ condition, info });
    }

    if (matches.length === 0) continue;

    const user = await resolveDiscordUser(client, guild, nation);
    if (!user) {
      stats.skippedNoDiscord += 1;
      continue;
    }

    for (const { condition, info } of matches) {
      const embed = condition.buildDM(nation, info, settings.alliance.name);
      try {
        await user.send({ embeds: [embed] });
        stats.dmsSent += 1;
        markNotified(settings, nation.id, condition.key);
      } catch (error) {
        stats.dmsFailed += 1;
      }
      await sleep(500); // be polite to Discord's DM rate limits
    }
  }

  return stats;
}

module.exports = { runAutoNotifyForGuild };
