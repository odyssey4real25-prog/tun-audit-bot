const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { getAllianceNations } = require("../pnw");
const { resolveDiscordUser } = require("../audit/resolveDiscordUser");
const { getSettings } = require("../db");

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function chunkLines(lines, maxLength = 1000) {
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
  return chunks;
}

module.exports = {
  minTier: "mentor",
  data: new SlashCommandBuilder()
    .setName("unlinked_members")
    .setDescription("List alliance members whose Discord account couldn't be found or matched."),

  async execute(interaction) {
    await interaction.deferReply();

    const settings = getSettings(interaction.guildId);
    if (!settings.alliance.id) {
      await interaction.editReply("❌ No alliance registered yet — run /set_alliance first.");
      return;
    }

    await interaction.editReply("⏳ Checking every member's Discord link, this may take a minute...");

    let members;
    try {
      const result = await getAllianceNations(settings.alliance.id);
      members = result.members;
    } catch (error) {
      await interaction.editReply(`❌ Couldn't fetch alliance nations: ${error.message}`);
      return;
    }

    const noDiscordField = [];
    const unresolved = [];

    for (const nation of members) {
      const user = await resolveDiscordUser(interaction.client, interaction.guild, nation);
      if (user) continue;

      if (!nation.discord && !nation.discord_id) {
        noDiscordField.push(nation);
      } else {
        unresolved.push(nation);
      }
      await sleep(150);
    }

    if (noDiscordField.length === 0 && unresolved.length === 0) {
      await interaction.followUp("✅ Every member's Discord account was found and matched!");
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle(`Unlinked Members — ${settings.alliance.name}`)
      .setColor(0xe74c3c)
      .setDescription(
        `**${noDiscordField.length + unresolved.length}** of **${members.length}** members couldn't be matched to a Discord account in this server.`
      );

    const noFieldLines = noDiscordField.map((n) => `• **${n.nation_name}** (${n.leader_name})`);
    const unresolvedLines = unresolved.map(
      (n) => `• **${n.nation_name}** (${n.leader_name}) — PnW Discord field: "${n.discord_id || n.discord}"`
    );

    chunkLines(noFieldLines, 1000).forEach((chunk, idx) => {
      embed.addFields({ name: idx === 0 ? "❌ No Discord set on PnW at all" : "\u200b", value: chunk });
    });
    chunkLines(unresolvedLines, 1000).forEach((chunk, idx) => {
      embed.addFields({ name: idx === 0 ? "⚠️ Set on PnW, but not found in this server" : "\u200b", value: chunk });
    });

    await interaction.followUp({ embeds: [embed] });
  }
};
