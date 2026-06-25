const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { auditAllMembers } = require("../audit/allianceAudit");
const { CATEGORIES, CATEGORY_CHOICES } = require("../audit/categories");
const { getSettings } = require("../db");

// Note: these tiers are specific to this overview command, and are
// intentionally different from the MMR tiers (/set_mmr uses C16-C20/C21+,
// this command uses C16-C19/C20+) — exactly as requested.
const TIER_RANGES = {
  c1_c5: { min: 1, max: 5, label: "C1-C5" },
  c6_c10: { min: 6, max: 10, label: "C6-C10" },
  c11_c15: { min: 11, max: 15, label: "C11-C15" },
  c16_c19: { min: 16, max: 19, label: "C16-C19" },
  c20_plus: { min: 20, max: Infinity, label: "C20+" }
};

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
    .addStringOption((opt) =>
      opt
        .setName("tier")
        .setDescription("Which city-count tier to show")
        .setRequired(true)
        .addChoices(
          { name: "C1-C5", value: "c1_c5" },
          { name: "C6-C10", value: "c6_c10" },
          { name: "C11-C15", value: "c11_c15" },
          { name: "C16-C19", value: "c16_c19" },
          { name: "C20+", value: "c20_plus" }
        )
    )
    .addStringOption((opt) => {
      opt.setName("category").setDescription("Which audit category to score by").setRequired(true);
      for (const choice of CATEGORY_CHOICES) opt.addChoices(choice);
      return opt;
    }),

  async execute(interaction) {
    await interaction.deferReply();

    const settings = getSettings(interaction.guildId);
    if (!settings.alliance.id) {
      await interaction.editReply("❌ No alliance registered yet — run /set_alliance first.");
      return;
    }

    const tierKey = interaction.options.getString("tier");
    const categoryKey = interaction.options.getString("category");
    const tier = TIER_RANGES[tierKey];
    const { checks, label } = CATEGORIES[categoryKey];

    await interaction.editReply("⏳ Auditing all members, this may take a minute...");

    let auditResults;
    try {
      auditResults = await auditAllMembers(settings.alliance.id, settings, { checks });
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
      .setTitle(`${tier.label} Overview — ${label} — ${settings.alliance.name}`)
      .setColor(0x3498db)
      .setDescription(`**${inTier.length}** member(s) in this tier.`);

    chunkLines(lines).forEach((chunk, idx) => {
      embed.addFields({ name: idx === 0 ? "Members" : "\u200b", value: chunk });
    });

    await interaction.followUp({ embeds: [embed] });
  }
};
