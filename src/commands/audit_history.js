const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { getSettings } = require("../db");

module.exports = {
  minTier: "member",
  data: new SlashCommandBuilder()
    .setName("audit_history")
    .setDescription("View previous audit records for a nation.")
    .addStringOption((opt) =>
      opt.setName("nation").setDescription("Nation ID, name, or profile link").setRequired(true)
    ),

  async execute(interaction) {
    const input = interaction.options.getString("nation").trim();
    const settings = getSettings(interaction.guildId);

    // No need to call the PnW API here — just match against what's already
    // saved locally, by ID (plain number or from a link) or by name.
    const linkMatch = input.match(/id=(\d+)/);
    const idFromInput = linkMatch ? Number(linkMatch[1]) : /^\d+$/.test(input) ? Number(input) : null;

    const records = settings.auditHistory.filter((r) =>
      idFromInput !== null ? r.nationId === idFromInput : r.nationName.toLowerCase() === input.toLowerCase()
    );

    if (records.length === 0) {
      await interaction.reply({
        content: `No audit history found for "${input}". (It only shows up after running an audit command on that nation at least once.)`,
        ephemeral: true
      });
      return;
    }

    const lines = records
      .slice(-10)
      .reverse()
      .map((r) => `**${r.date}** — ${r.score}% — ${r.pass ? "✅ PASS" : "❌ FAIL"} (${r.command})`);

    const embed = new EmbedBuilder()
      .setTitle(`Audit History — ${records[0].nationName}`)
      .setColor(0x3498db)
      .setDescription(lines.join("\n"));

    await interaction.reply({ embeds: [embed] });
  }
};
