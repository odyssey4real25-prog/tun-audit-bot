const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { getNation } = require("../pnw");

module.exports = {
  minTier: "administrator",
  data: new SlashCommandBuilder()
    .setName("api_test")
    .setDescription("[Setup] Test the connection to the Politics & War API and see the raw data.")
    .addIntegerOption((opt) =>
      opt.setName("nation_id").setDescription("A nation ID to test with").setRequired(true)
    ),

  async execute(interaction) {
    await interaction.deferReply();

    try {
      const nation = await getNation(interaction.options.getInteger("nation_id"));

      // Pretty-print the data we got back, capped so Discord doesn't reject the message.
      const json = JSON.stringify(nation, null, 2);
      const trimmed = json.length > 1800 ? json.slice(0, 1800) + "\n... (cut off)" : json;

      const embed = new EmbedBuilder()
        .setTitle(`API Test — ${nation.nation_name}`)
        .setColor(0x2ecc71)
        .setDescription("✅ Connected successfully! Here's the raw data we received:\n```json\n" + trimmed + "\n```");

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      await interaction.editReply({
        content: `❌ API test failed:\n\`\`\`${error.message}\`\`\`\nCopy this whole message and send it back so it can be fixed.`
      });
    }
  }
};
