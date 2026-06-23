const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { auditAllMembers } = require("../audit/allianceAudit");
const { CATEGORIES, CATEGORY_CHOICES } = require("../audit/categories");
const { getSettings } = require("../db");

const MEDALS = ["🥇", "🥈", "🥉"];

module.exports = {
  minTier: "member",
  data: new SlashCommandBuilder()
    .setName("leaderboard")
    .setDescription("Show the top-scoring alliance members for a category.")
    .addStringOption((opt) => {
      opt.setName("category").setDescription("Which audit category to rank by").setRequired(true);
      for (const choice of CATEGORY_CHOICES) opt.addChoices(choice);
      return opt;
    })
    .addIntegerOption((opt) =>
      opt.setName("top").setDescription("How many nations to show (default 10)").setMinValue(1).setMaxValue(25)
    ),

  async execute(interaction) {
    await interaction.deferReply();

    const settings = getSettings(interaction.guildId);
    if (!settings.alliance.id) {
      await interaction.editReply("❌ No alliance registered yet — run /set_alliance first.");
      return;
    }

    const categoryKey = interaction.options.getString("category");
    const topN = interaction.options.getInteger("top") ?? 10;
    const { checks, label } = CATEGORIES[categoryKey];

    await interaction.editReply("⏳ Auditing all members, this may take a minute...");

    let auditResults;
    try {
      auditResults = await auditAllMembers(settings.alliance.id, settings, { checks });
    } catch (error) {
      await interaction.editReply(`❌ Couldn't fetch alliance nations: ${error.message}`);
      return;
    }

    const ranked = [...auditResults].sort((a, b) => b.percent - a.percent).slice(0, topN);

    const lines = ranked.map((entry, idx) => {
      const rankLabel = MEDALS[idx] || `#${idx + 1}`;
      return `${rankLabel} **${entry.nation.nation_name}** — ${entry.percent}% (${entry.grade.emoji} ${entry.grade.label})`;
    });

    const embed = new EmbedBuilder()
      .setTitle(`🏆 ${label} Leaderboard — ${settings.alliance.name}`)
      .setColor(0xf1c40f)
      .setDescription(lines.join("\n") || "No nations to rank.");

    await interaction.followUp({ embeds: [embed] });
  }
};
