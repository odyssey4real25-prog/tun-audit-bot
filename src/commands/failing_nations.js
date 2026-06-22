const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { auditAllMembers } = require("../audit/allianceAudit");
const { getSettings } = require("../db");

module.exports = {
  minTier: "mentor",
  data: new SlashCommandBuilder()
    .setName("failing_nations")
    .setDescription("List every alliance member currently below the passing score."),

  async execute(interaction) {
    await interaction.deferReply();

    const settings = getSettings(interaction.guildId);
    if (!settings.alliance.id) {
      await interaction.editReply("❌ No alliance registered yet — run /set_alliance first.");
      return;
    }

    await interaction.editReply("⏳ Auditing all members, this may take a minute...");

    let auditResults;
    try {
      auditResults = await auditAllMembers(settings.alliance.id, settings);
    } catch (error) {
      await interaction.editReply(`❌ Couldn't fetch alliance nations: ${error.message}`);
      return;
    }

    const failing = auditResults.filter((r) => !r.pass).sort((a, b) => a.percent - b.percent);

    if (failing.length === 0) {
      await interaction.followUp("✅ No nations are currently failing!");
      return;
    }

    // Discord embed fields cap at 1024 characters — split into chunks of ~20 lines if needed.
    const lines = failing.map((r) => `❌ **${r.nation.nation_name}** — ${r.percent}% (${r.nation.num_cities} cities)`);
    const chunks = [];
    let current = "";
    for (const line of lines) {
      if ((current + "\n" + line).length > 1000) {
        chunks.push(current);
        current = line;
      } else {
        current = current ? `${current}\n${line}` : line;
      }
    }
    if (current) chunks.push(current);

    const embed = new EmbedBuilder()
      .setTitle(`Failing Nations — ${settings.alliance.name}`)
      .setColor(0xe74c3c)
      .setDescription(`**${failing.length}** of **${auditResults.length}** nations are below ${settings.passingScore}%.`);

    chunks.forEach((chunk, idx) => {
      embed.addFields({ name: idx === 0 ? "Nations" : "\u200b", value: chunk });
    });

    await interaction.followUp({ embeds: [embed] });
  }
};
