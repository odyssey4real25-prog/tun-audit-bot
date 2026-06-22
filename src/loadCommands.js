// loadCommands.js
//
// This scans the /commands folder, reads every command file in it,
// and hands them all back as one neat list (a "Collection").
// This means: to add a new command, you just add a new file to /commands —
// you never need to touch this file again.

const fs = require("fs");
const path = require("path");
const { Collection } = require("discord.js");

function loadCommands() {
  const commands = new Collection();
  const commandsPath = path.join(__dirname, "commands");
  const files = fs.readdirSync(commandsPath).filter((f) => f.endsWith(".js"));

  for (const file of files) {
    const command = require(path.join(commandsPath, file));
    if (!command.data || !command.execute) {
      console.warn(`⚠️  Skipping ${file} — it's missing "data" or "execute".`);
      continue;
    }
    commands.set(command.data.name, command);
  }

  return commands;
}

module.exports = { loadCommands };
