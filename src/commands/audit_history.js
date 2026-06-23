const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { getSettings } = require("../db");

// Compares each record to the most recent EARLIER record of the same
// command type (so a Grand Audit is only ever compared to a previous
// Grand Audit, not to an Infrastructure & Land check, etc. — otherwise
// the comparison wouldn't mean anything).
function addTrendArrows(records) {
  return records.map((record, idx) => {
    let trend = null;
    for (let i = idx - 1; i >= 0; i--) {
      if (records[i].command === record.command) {
        if (record.score > records[i].score) trend = "📈";
        else if (record.score < records[i].score) trend = "📉";
        else trend = "➡️";
        break;
      }
    }
    return { ...record, trend };
  });
}

module.exports = {
  minTier: "member",
  data: new SlashCommandBuilder()
    .setName("audit_history")
    .setDescription("View previous audit records for a nation, with score trends.")
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

    const withTrend = addTrendArrows(records);
    const latest = withTrend[withTrend.length - 1];

    let headline;
    if (latest.trend === "📈") headline = `📈 Improved since their last ${latest.command} audit.`;
    else if (latest.trend === "📉") headline = `📉 Declined since their last ${latest.command} audit.`;
    else if (latest.trend === "➡️") headline = `➡️ No change since their last ${latest.command} audit.`;
    else headline = "ℹ️ This is the first recorded audit of this type for this nation.";

    const lines = withTrend
      .slice(-10)
      .reverse()
      .map((r) => `**${r.date}** — ${r.score}% — ${r.grade ?? (r.pass ? "PASS" : "FAIL")} ${r.trend ?? ""} (${r.command})`);

    const embed = new EmbedBuilder()
      .setTitle(`Audit History — ${records[0].nationName}`)
      .setColor(0x3498db)
      .setDescription(`${headline}\n\n${lines.join("\n")}`);

    await interaction.reply({ embeds: [embed] });
  }
};
