// notifyEmbed.js
//
// Builds the actual DM content sent to a nation's owner. Only shows the
// checks they're currently failing — no need to list everything they're
// already doing right in a "here's what to fix" message.

const { EmbedBuilder } = require("discord.js");

function buildFailureDM(nation, entry, allianceName, categoryLabel) {
  const failedResults = entry.results.filter((r) => !r.passed);

  const embed = new EmbedBuilder()
    .setTitle(`📋 Audit Update — ${categoryLabel}`)
    .setColor(entry.grade.color)
    .setDescription(
      `Hi **${nation.nation_name}**,\n\n` +
        `This is a heads-up from **${allianceName}** leadership about your latest **${categoryLabel}** audit.\n\n` +
        `**Score:** ${entry.percent}% — ${entry.grade.emoji} **${entry.grade.label}**\n\n` +
        `Here's what needs attention:`
    );

  for (const r of failedResults) {
    let detail = r.detail;
    if (detail.length > 300) detail = detail.slice(0, 300) + "...";
    embed.addFields({
      name: `❌ ${r.label}`,
      value: `${detail}\n**What to do:** ${r.recommendation}`
    });
  }

  embed.setFooter({ text: "This is an audit summary, not a punishment — reach out to a mentor or officer if you have questions." });

  return embed;
}

module.exports = { buildFailureDM };
