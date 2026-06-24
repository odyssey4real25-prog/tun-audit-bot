// scheduler.js
//
// A single timer that wakes up periodically (every 15 minutes) and checks
// every guild the bot is in. For each guild, if that guild's admin has
// turned on auto-notify (/set_auto_notify enabled:True) AND enough time
// has passed since its last run (based on that guild's own configured
// interval), it runs one full notify pass for that guild.
//
// This means different servers can have different intervals, while the
// bot only needs ONE timer total, no matter how many servers it's in.

const { getSettings, saveSettings } = require("./db");
const { runAutoNotifyForGuild } = require("./audit/autoNotify");

const TICK_INTERVAL_MS = 15 * 60 * 1000; // check every 15 minutes
const currentlyRunning = new Set(); // in-memory lock, guildIds currently mid-run

async function tick(client) {
  for (const guild of client.guilds.cache.values()) {
    try {
      const settings = getSettings(guild.id);
      if (!settings.autoNotify?.enabled) continue;
      if (!settings.alliance.id) continue;
      if (currentlyRunning.has(guild.id)) continue;

      const lastRunAt = settings.autoNotify.lastRunAt ? new Date(settings.autoNotify.lastRunAt) : null;
      const intervalMs = settings.autoNotify.intervalHours * 60 * 60 * 1000;
      const due = !lastRunAt || Date.now() - lastRunAt.getTime() >= intervalMs;
      if (!due) continue;

      currentlyRunning.add(guild.id);
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
      currentlyRunning.delete(guild.id);
    }
  }
}

function startScheduler(client) {
  setInterval(() => {
    tick(client).catch((error) => console.error("[autoNotify] Unexpected scheduler error:", error));
  }, TICK_INTERVAL_MS);
  console.log("✅ Auto-notify scheduler started (checks every 15 minutes for guilds with it enabled).");
}

module.exports = { startScheduler };
