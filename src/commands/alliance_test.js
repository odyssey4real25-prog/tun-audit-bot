const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { getAllianceNations } = require("../pnw");
const { getSettings } = require("../db");

module.exports = {
  minTier: "administrator",
  data: new SlashCommandBuilder()
    .setName("alliance_test")
    .setDescription("[Setup] Test fetching every nation in your registered alliance."),

  async execute(interaction) {
    await interaction.deferReply();

    const settings = getSettings(interaction.guildId);
    if (!settings.alliance.id) {
      await interaction.editReply("❌ No alliance registered yet — run /set_alliance first.");
      return;
    }

    try {
      const { members, applicantCount, totalFetched } = await getAllianceNations(settings.alliance.id);
      const names = members.slice(0, 15).map((n) => `${n.nation_name} (${n.num_cities} cities)`).join("\n");

      const embed = new EmbedBuilder()
        .setTitle(`Alliance Test — ${settings.alliance.name}`)
        .setColor(0x2ecc71)
        .setDescription(
          `✅ Found **${totalFetched}** nations total, **${applicantCount}** are applicants (excluded), **${members.length}** are full members. First 15 members shown:\n${names}`
        );

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      await interaction.editReply(`❌ Alliance fetch failed:\n\`\`\`${error.message}\`\`\`\nCopy this whole message and send it back so it can be fixed.`);
    }
  }
};
