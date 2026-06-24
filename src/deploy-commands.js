// deploy-commands.js
//
// Discord needs to be TOLD what slash commands your bot has before
// people can use them. Run this file once now, and again any time
// you add or change a command:
//
//     npm run deploy
//
require("dotenv").config();
const { REST, Routes } = require("discord.js");
const { loadCommands } = require("./loadCommands");

const { DISCORD_TOKEN, DISCORD_CLIENT_ID, DISCORD_GUILD_ID } = process.env;

if (!DISCORD_TOKEN || !DISCORD_CLIENT_ID) {
  console.error("❌ Missing DISCORD_TOKEN or DISCORD_CLIENT_ID in your .env file.");
  process.exit(1);
}

const commands = loadCommands();
const commandData = commands.map((cmd) => cmd.data.toJSON());

const rest = new REST().setToken(DISCORD_TOKEN);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Network hiccups (interrupted connections, SSL blips) happen occasionally
// and aren't actual problems with your setup — retrying a couple of times
// before giving up saves you from having to manually re-run this yourself.
async function registerWithRetry(route, body, maxAttempts = 3) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await rest.put(route, { body });
      return;
    } catch (error) {
      if (attempt === maxAttempts) throw error;
      console.warn(`⚠️ Attempt ${attempt} failed (${error.message}), retrying...`);
      await sleep(attempt * 1000);
    }
  }
}

(async () => {
  try {
    if (DISCORD_GUILD_ID) {
      console.log(`Registering ${commandData.length} commands to guild ${DISCORD_GUILD_ID} (fast, for testing)...`);
      await registerWithRetry(Routes.applicationGuildCommands(DISCORD_CLIENT_ID, DISCORD_GUILD_ID), commandData);
    } else {
      console.log(`Registering ${commandData.length} commands GLOBALLY (can take up to 1 hour to appear)...`);
      await registerWithRetry(Routes.applicationCommands(DISCORD_CLIENT_ID), commandData);
    }
    console.log("✅ Commands registered successfully.");
  } catch (error) {
    console.error("❌ Failed to register commands after retrying:", error);
  }
})();
