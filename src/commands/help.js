const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { loadCommands } = require("../loadCommands");

// IMPORTANT: This command builds its list automatically from every other
// command file's own .setDescription() text and minTier value. That means
// you never need to manually update /help when adding or changing a
// command — as long as the new command file sets a clear description and
// a minTier, it'll show up here correctly on its own.
//
// DESIGN NOTE ON SCALING: each tier gets its OWN embed, rather than all
// tiers sharing fields inside one embed. Discord's 6000-character limit
// applies to an embed's ENTIRE combined content (title + description +
// every field together) — not per-field. Cramming all tiers into one
// embed meant the bot's total command text was competing for a single
// shared 6000-character budget, which could break as more commands were
// added (this happened once already). Giving each tier its own embed
// means each one gets its OWN fresh 6000-character budget — for routine
// bot growth this should never need touching again. Discord allows up to
// 10 embeds per message, and we only use 5 (intro + 4 tiers), so there's
// also room to add more tiers/categories later without restructuring.
//
// If a SINGLE tier somehow still grows past ~3500 characters on its own
// (a lot of commands), chunkLines() below will automatically split that
// tier across multiple same-titled embeds too, as a second safety net.

const TIER_ORDER = ["member", "mentor", "government", "administrator"];
const TIER_LABELS = {
  member: "🟢 Member — anyone can use these",
  mentor: "🟡 Mentor",
  government: "🔵 Government",
  administrator: "🔴 Administrator"
};
const TIER_COLORS = {
  member: 0x2ecc71,
  mentor: 0xf1c40f,
  government: 0x3498db,
  administrator: 0xe74c3c
};

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
  return chunks.length > 0 ? chunks : ["None yet."];
}

module.exports = {
  minTier: "member",
  data: new SlashCommandBuilder().setName("help").setDescription("Show every command the bot has and what it does."),

  async execute(interaction) {
    const commands = loadCommands();

    const grouped = { member: [], mentor: [], government: [], administrator: [] };
    for (const command of commands.values()) {
      const tier = grouped[command.minTier] ? command.minTier : "member";
      grouped[tier].push(`**/${command.data.name}** — ${command.data.description}`);
    }
    for (const tier of TIER_ORDER) grouped[tier].sort();

    const introEmbed = new EmbedBuilder()
      .setTitle("📖 TUN Audit Bot — Command Reference")
      .setColor(0x9b59b6)
      .setDescription(
        "Here's everything I can do, grouped by who can use it.\n\n" +
          "💡 Wherever a command asks for a `nation`, you can give a nation ID, a nation name, or a profile link.\n" +
          "💡 Wherever a command asks for an `alliance`, you can give an alliance ID, name, or page link — spelling is case-insensitive."
      );

    const embeds = [introEmbed];

    for (const tier of TIER_ORDER) {
      const chunks = chunkLines(grouped[tier]);
      chunks.forEach((chunk, idx) => {
        embeds.push(
          new EmbedBuilder()
            .setTitle(idx === 0 ? TIER_LABELS[tier] : `${TIER_LABELS[tier]} (cont.)`)
            .setColor(TIER_COLORS[tier])
            .setDescription(chunk)
        );
      });
    }

    // Discord allows max 10 embeds per message — send in batches if we
    // ever genuinely exceed that (would mean 200+ commands at current pace).
    const BATCH_SIZE = 10;
    for (let i = 0; i < embeds.length; i += BATCH_SIZE) {
      const batch = embeds.slice(i, i + BATCH_SIZE);
      if (i === 0) {
        await interaction.reply({ embeds: batch });
      } else {
        await interaction.followUp({ embeds: batch });
      }
    }
  }
};
