const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { resolveNationId } = require("../pnw");
const { getSettings } = require("../db");

module.exports = {
  minTier: "member",
  data: new SlashCommandBuilder()
    .setName("view_member_warchest")
    .setDescription("Show a specific nation's warchest overrides, if any.")
    .addStringOption((opt) =>
      opt.setName("nation").setDescription("Nation ID, name, or profile link").setRequired(true)
    ),

  async execute(interaction) {
    await interaction.deferReply();

    let nationId;
    try {
      nationId = await resolveNationId(interaction.options.getString("nation"));
    } catch (error) {
      await interaction.editReply(`❌ ${error.message}`);
      return;
    }

    const settings = getSettings(interaction.guildId);
    const override = settings.memberWarchestOverrides[String(nationId)];

    if (!override || Object.keys(override).length === 0) {
      await interaction.editReply(`Nation **${nationId}** has no custom overrides — it uses the alliance-wide warchest policy.`);
      return;
    }

    const lines = Object.entries(override).map(([resource, perCity]) => `**${resource}**: ${perCity.toLocaleString()}/city`);

    const embed = new EmbedBuilder()
      .setTitle(`Warchest Override — Nation ${nationId}`)
      .setColor(0x3498db)
      .setDescription(lines.join("\n") + "\n\nAny resource not listed here still uses the alliance-wide policy.");

    await interaction.editReply({ embeds: [embed] });
  }
};
