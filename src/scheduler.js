// scheduler.js
//
// A single timer that wakes up periodically (every 15 minutes) and checks
// every guild the bot is in, for TWO independent jobs:
//   1. autoNotify   — DMs nations that currently have a problem (inactivity,
//                      raid capacity, full MAP, off-bloc colour).
//   2. scheduledReports — DMs every member their own full Grand Audit report
//                      on a fixed schedule, regardless of whether anything's wrong.
//
// Each guild can turn either job on/off and set its own interval — this
// one timer just checks "is anyone due?" every 15 minutes and runs
// whichever jobs are due for whichever guilds.

const { getSettings, saveSettings } = require("./db");
const { runAutoNotifyForGuild } = require("./audit/autoNotify");
const { runScheduledReportsForGuild } = require("./audit/scheduledReports");

const TICK_INTERVAL_MS = 15 * 60 * 1000; // check every 15 minutes
const currentlyRunning = new Set(); // in-memory lock, keyed as "guildId:jobName"

async function runAutoNotifyJob(client, guild, settings) {
  const lockKey = `${guild.id}:autoNotify`;
  if (currentlyRunning.has(lockKey)) return;
  if (!settings.autoNotify?.enabled || !settings.alliance.id) return;

  const lastRunAt = settings.autoNotify.lastRunAt ? new Date(settings.autoNotify.lastRunAt) : null;
  const intervalMs = settings.autoNotify.intervalHours * 60 * 60 * 1000;
  const due = !lastRunAt || Date.now() - lastRunAt.getTime() >= intervalMs;
  if (!due) return;

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

  const lastRunAt = settings.scheduledReports.lastRunAt ? new Date(settings.scheduledReports.lastRunAt) : null;
  const intervalMs = settings.scheduledReports.intervalDays * 24 * 60 * 60 * 1000;
  const due = !lastRunAt || Date.now() - lastRunAt.getTime() >= intervalMs;
  if (!due) return;

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

async function tick(client) {
  for (const guild of client.guilds.cache.values()) {
    const settings = getSettings(guild.id);
    await runAutoNotifyJob(client, guild, settings);
    await runScheduledReportsJob(client, guild, settings);
  }
}

function startScheduler(client) {
  setInterval(() => {
    tick(client).catch((error) => console.error("[scheduler] Unexpected scheduler error:", error));
  }, TICK_INTERVAL_MS);
  console.log("✅ Scheduler started (checks every 15 minutes for guilds with auto-notify or scheduled reports enabled).");
}

module.exports = { startScheduler };
