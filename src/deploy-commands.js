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

(async () => {
  try {
    if (DISCORD_GUILD_ID) {
      console.log(`Registering ${commandData.length} commands to guild ${DISCORD_GUILD_ID} (fast, for testing)...`);
      await rest.put(Routes.applicationGuildCommands(DISCORD_CLIENT_ID, DISCORD_GUILD_ID), {
        body: commandData
      });
    } else {
      console.log(`Registering ${commandData.length} commands GLOBALLY (can take up to 1 hour to appear)...`);
      await rest.put(Routes.applicationCommands(DISCORD_CLIENT_ID), { body: commandData });
    }
    console.log("✅ Commands registered successfully.");
  } catch (error) {
    console.error("❌ Failed to register commands:", error);
  }
})();
