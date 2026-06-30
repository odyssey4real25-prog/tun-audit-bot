const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { auditAllMembers } = require("../audit/allianceAudit");
const { CATEGORIES, CATEGORY_CHOICES } = require("../audit/categories");
const { TIER_RANGES, TIER_CHOICES } = require("../audit/tiers");
const { getAllianceName } = require("../pnw");
const { getSettings } = require("../db");

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
  return chunks.length > 0 ? chunks : ["No members in this tier."];
}

module.exports = {
  minTier: "member",
  data: new SlashCommandBuilder()
    .setName("tier_audit")
    .setDescription("Overview of all members in a city-count tier and their grade scores.")
    .addStringOption((opt) => {
      opt.setName("tier").setDescription("Which city-count tier to show").setRequired(true);
      for (const choice of TIER_CHOICES) opt.addChoices(choice);
      return opt;
    })
    .addStringOption((opt) => {
      opt.setName("category").setDescription("Which audit category to score by").setRequired(true);
      for (const choice of CATEGORY_CHOICES) opt.addChoices(choice);
      return opt;
    })
    .addIntegerOption((opt) =>
      opt.setName("alliance_id").setDescription("Audit a different alliance by PnW ID. Leave blank to use your home alliance.")
    ),

  async execute(interaction) {
    await interaction.deferReply();

    const settings = getSettings(interaction.guildId);
    const targetAllianceId = interaction.options.getInteger("alliance_id") || settings.alliance.id;
    if (!targetAllianceId) {
      await interaction.editReply("❌ No alliance registered yet — run /set_alliance first, or provide an alliance_id.");
      return;
    }
    const allianceName = targetAllianceId === settings.alliance.id
      ? (settings.alliance.name || `Alliance ${targetAllianceId}`)
      : await getAllianceName(targetAllianceId);

    const tierKey = interaction.options.getString("tier");
    const categoryKey = interaction.options.getString("category");
    const tier = TIER_RANGES[tierKey];
    const { checks, label } = CATEGORIES[categoryKey];

    await interaction.editReply("⏳ Auditing all members, this may take a minute...");

    let auditResults;
    try {
      auditResults = await auditAllMembers(targetAllianceId, settings, { checks });
    } catch (error) {
      await interaction.editReply(`❌ Couldn't fetch alliance nations: ${error.message}`);
      return;
    }

    const inTier = auditResults
      .filter((entry) => entry.nation.num_cities >= tier.min && entry.nation.num_cities <= tier.max)
      .sort((a, b) => b.percent - a.percent);

    const lines = inTier.map(
      (entry) => `${entry.grade.emoji} **${entry.nation.nation_name}** (${entry.nation.num_cities} cities) — ${entry.percent}% (${entry.grade.label})`
    );

    const embed = new EmbedBuilder()
      .setTitle(`${tier.label} Overview — ${label} — ${allianceName}`)
      .setColor(0x3498db)
      .setDescription(`**${inTier.length}** member(s) in this tier.`);

    chunkLines(lines).forEach((chunk, idx) => {
      embed.addFields({ name: idx === 0 ? "Members" : "\u200b", value: chunk });
    });

    await interaction.followUp({ embeds: [embed] });
  }
};
