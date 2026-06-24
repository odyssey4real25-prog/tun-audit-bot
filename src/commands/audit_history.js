const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { getSettings } = require("../db");
const { isMention, resolveNationIdFromMention } = require("../audit/resolveNationInput");

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
      opt.setName("nation").setDescription("Nation ID, name, profile link, or @mention their Discord").setRequired(true)
    ),

  async execute(interaction) {
    await interaction.deferReply();

    const input = interaction.options.getString("nation").trim();
    const settings = getSettings(interaction.guildId);

    let idFromInput = null;

    if (isMention(input)) {
      // Only hits the PnW API in this specific case — plain ID/name/link
      // lookups below stay fast and API-free, as before.
      try {
        idFromInput = await resolveNationIdFromMention(interaction.client, settings, input);
      } catch (error) {
        await interaction.editReply(`❌ ${error.message}`);
        return;
      }
    } else {
      const linkMatch = input.match(/id=(\d+)/);
      idFromInput = linkMatch ? Number(linkMatch[1]) : /^\d+$/.test(input) ? Number(input) : null;
    }

    const records = settings.auditHistory.filter((r) =>
      idFromInput !== null ? r.nationId === idFromInput : r.nationName.toLowerCase() === input.toLowerCase()
    );

    if (records.length === 0) {
      await interaction.editReply(
        `No audit history found for "${input}". (It only shows up after running an audit command on that nation at least once.)`
      );
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

    await interaction.editReply({ embeds: [embed] });
  }
};
