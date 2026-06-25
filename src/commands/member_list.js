const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { getAllianceNations } = require("../pnw");
const { getSettings } = require("../db");

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Splits a big list of lines into embed-sized chunks (well under Discord's
// 4096-character description limit per embed).
function chunkLines(lines, maxLength = 3500) {
  const chunks = [];
  let current = "";
  for (const line of lines) {
    if ((current + "\n" + line).length > maxLength) {
      chunks.push(current);
      current = line;
    } else {
      current = current ? `${current}\n${line}` : line;
    }
  }
  if (current) chunks.push(current);
  return chunks.length > 0 ? chunks : ["No members found."];
}

async function getDiscordDisplay(client, nation) {
  if (nation.discord_id) {
    try {
      const user = await client.users.fetch(String(nation.discord_id));
      return `${user.username} ✅`;
    } catch (error) {
      // Verified ID on file, but Discord couldn't find/return that account
      // (e.g. they deleted it) — fall through to the unverified field below.
    }
  }
  if (nation.discord) {
    return `${nation.discord} (unverified)`;
  }
  return "No Discord linked";
}

module.exports = {
  minTier: "mentor",
  data: new SlashCommandBuilder()
    .setName("member_list")
    .setDescription("List every alliance member with their Discord, city count, and VM status."),

  async execute(interaction) {
    await interaction.deferReply();

    const settings = getSettings(interaction.guildId);
    if (!settings.alliance.id) {
      await interaction.editReply("❌ No alliance registered yet — run /set_alliance first.");
      return;
    }

    await interaction.editReply("⏳ Building the member list, this may take a minute...");

    let members;
    try {
      const result = await getAllianceNations(settings.alliance.id);
      members = [...result.members].sort((a, b) => a.nation_name.localeCompare(b.nation_name));
    } catch (error) {
      await interaction.editReply(`❌ Couldn't fetch alliance nations: ${error.message}`);
      return;
    }

    const lines = [];
    for (const nation of members) {
      const discordDisplay = await getDiscordDisplay(interaction.client, nation);
      const vmTag = nation.vacation_mode_turns > 0 ? " 🌴 VM" : "";
      lines.push(`**${nation.nation_name}** (C${nation.num_cities}) — ${discordDisplay}${vmTag}`);
      // Only a real delay when we actually hit the Discord API above.
      if (nation.discord_id) await sleep(100);
    }

    const chunks = chunkLines(lines);
    const embeds = chunks.map((chunk, idx) =>
      new EmbedBuilder()
        .setTitle(`Member List — ${settings.alliance.name} (Page ${idx + 1}/${chunks.length})`)
        .setColor(0x3498db)
        .setDescription(chunk)
    );

    // Discord allows max 10 embeds per message — send in batches if there's
    // ever more pages than that (very large alliances).
    const BATCH_SIZE = 10;
    for (let i = 0; i < embeds.length; i += BATCH_SIZE) {
      const batch = embeds.slice(i, i + BATCH_SIZE);
      await interaction.followUp({ embeds: batch });
    }
  }
};
