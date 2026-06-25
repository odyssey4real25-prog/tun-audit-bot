// scheduler.js
//
// A single timer that wakes up periodically (every 15 minutes) and checks
// every guild the bot is in, for THREE independent jobs:
//   1. autoNotify        — DMs nations that currently have a problem.
//   2. scheduledReports   — DMs every member their own Grand Audit report
//                           on a fixed schedule.
//   3. tierRoleSync       — keeps each member's Discord tier role in sync
//                           with their current city count.
//
// Each guild can turn any of these on/off and set its own interval — this
// one timer just checks "is anyone due?" every 15 minutes and runs
// whichever jobs are due for whichever guilds.

const { getSettings, saveSettings } = require("./db");
const { runAutoNotifyForGuild } = require("./audit/autoNotify");
const { runScheduledReportsForGuild } = require("./audit/scheduledReports");
const { runTierRoleSyncForGuild } = require("./audit/tierRoleSync");

const TICK_INTERVAL_MS = 15 * 60 * 1000; // check every 15 minutes
const currentlyRunning = new Set(); // in-memory lock, keyed as "guildId:jobName"

function isDue(lastRunAtIso, intervalMs) {
  const lastRunAt = lastRunAtIso ? new Date(lastRunAtIso) : null;
  return !lastRunAt || Date.now() - lastRunAt.getTime() >= intervalMs;
}

async function runAutoNotifyJob(client, guild, settings) {
  const lockKey = `${guild.id}:autoNotify`;
  if (currentlyRunning.has(lockKey)) return;
  if (!settings.autoNotify?.enabled || !settings.alliance.id) return;
  if (!isDue(settings.autoNotify.lastRunAt, settings.autoNotify.intervalHours * 60 * 60 * 1000)) return;

  currentlyRunning.add(lockKey);
  try {
    console.log(`[autoNotify] Starting scheduled run for guild ${guild.id} (${guild.name})...`);
    const stats = await runAutoNotifyForGuild(client, guild, settings);
    settings.autoNotify.lastRunAt = new Date().toISOString();
    saveSettings(guild.id, settings);
    console.log(
      `[autoNotify] Finished guild ${guild.id}: checked ${stats.checked}, sent ${stats.dmsSent}, ` +
        `failed ${stats.dmsFailed}, no Discord linked ${stats.skippedNoDiscord}, on cooldown ${stats.skippedCooldown}`
    );
  } catch (error) {
    console.error(`[autoNotify] Error running scheduled notify for guild ${guild.id}:`, error);
  } finally {
    currentlyRunning.delete(lockKey);
  }
}

async function runScheduledReportsJob(client, guild, settings) {
  const lockKey = `${guild.id}:scheduledReports`;
  if (currentlyRunning.has(lockKey)) return;
  if (!settings.scheduledReports?.enabled || !settings.alliance.id) return;
  if (!isDue(settings.scheduledReports.lastRunAt, settings.scheduledReports.intervalDays * 24 * 60 * 60 * 1000)) return;

  currentlyRunning.add(lockKey);
  try {
    console.log(`[scheduledReports] Starting scheduled run for guild ${guild.id} (${guild.name})...`);
    const stats = await runScheduledReportsForGuild(client, guild, settings);
    settings.scheduledReports.lastRunAt = new Date().toISOString();
    saveSettings(guild.id, settings);
    console.log(
      `[scheduledReports] Finished guild ${guild.id}: checked ${stats.checked}, sent ${stats.dmsSent}, ` +
        `failed ${stats.dmsFailed}, no Discord linked ${stats.skippedNoDiscord}`
    );
  } catch (error) {
    console.error(`[scheduledReports] Error running scheduled reports for guild ${guild.id}:`, error);
  } finally {
    currentlyRunning.delete(lockKey);
  }
}

async function runTierRoleSyncJob(client, guild, settings) {
  const lockKey = `${guild.id}:tierRoleSync`;
  if (currentlyRunning.has(lockKey)) return;
  if (!settings.tierRoleSync?.enabled || !settings.alliance.id) return;
  if (!isDue(settings.tierRoleSync.lastRunAt, settings.tierRoleSync.intervalHours * 60 * 60 * 1000)) return;

  currentlyRunning.add(lockKey);
  try {
    console.log(`[tierRoleSync] Starting scheduled run for guild ${guild.id} (${guild.name})...`);
    const stats = await runTierRoleSyncForGuild(client, guild, settings);
    settings.tierRoleSync.lastRunAt = new Date().toISOString();
    saveSettings(guild.id, settings);
    console.log(
      `[tierRoleSync] Finished guild ${guild.id}: checked ${stats.checked}, updated ${stats.updated}, ` +
        `already correct ${stats.alreadyCorrect}, role errors ${stats.roleErrors}`
    );
  } catch (error) {
    console.error(`[tierRoleSync] Error running tier role sync for guild ${guild.id}:`, error);
  } finally {
    currentlyRunning.delete(lockKey);
  }
}

async function tick(client) {
  for (const guild of client.guilds.cache.values()) {
    const settings = getSettings(guild.id);
    await runAutoNotifyJob(client, guild, settings);
    await runScheduledReportsJob(client, guild, settings);
    await runTierRoleSyncJob(client, guild, settings);
  }
}

function startScheduler(client) {
  setInterval(() => {
    tick(client).catch((error) => console.error("[scheduler] Unexpected scheduler error:", error));
  }, TICK_INTERVAL_MS);
  console.log("✅ Scheduler started (checks every 15 minutes for guilds with any scheduled job enabled).");
}

module.exports = { startScheduler };
