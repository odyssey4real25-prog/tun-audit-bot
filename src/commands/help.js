const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { loadCommands } = require("../loadCommands");

// IMPORTANT: This command builds its list automatically from every other
// command file's own .setDescription() text and minTier value. That means
// you never need to manually update /help when adding or changing a
// command — as long as the new command file sets a clear description and
// a minTier, it'll show up here correctly on its own.

const TIER_ORDER = ["member", "mentor", "government", "administrator"];
const TIER_LABELS = {
  member: "🟢 Member — anyone can use these",
  mentor: "🟡 Mentor",
  government: "🔵 Government",
  administrator: "🔴 Administrator"
};

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

    const embed = new EmbedBuilder()
      .setTitle("📖 TUN Audit Bot — Help")
      .setColor(0x3498db)
      .setDescription(
        "Here's everything I can do, grouped by who can use it.\n" +
          "💡 Tip: wherever a command asks for a `nation`, you can give a nation ID, a nation name, or a profile link."
      );

    for (const tier of TIER_ORDER) {
      const list = grouped[tier];
      embed.addFields({ name: TIER_LABELS[tier], value: list.length > 0 ? list.join("\n") : "None yet." });
    }

    await interaction.reply({ embeds: [embed] });
  }
};
