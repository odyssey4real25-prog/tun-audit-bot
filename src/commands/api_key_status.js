const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { resolveNationInput } = require("../audit/resolveNationInput");
const { getSettings } = require("../db");

module.exports = {
  minTier: "mentor",
  data: new SlashCommandBuilder()
    .setName("api_key_status")
    .setDescription("Check whether a nation has a linked API key on file (never shows the key itself).")
    .addStringOption((opt) =>
      opt.setName("nation").setDescription("Nation ID, name, profile link, or @mention their Discord").setRequired(true)
    ),

  async execute(interaction) {
    await interaction.deferReply();

    const settings = getSettings(interaction.guildId);

    let nationId;
    try {
      nationId = await resolveNationInput(interaction.client, settings, interaction.options.getString("nation"));
    } catch (error) {
      await interaction.editReply(`❌ ${error.message}`);
      return;
    }

    const record = settings.linkedApiKeys[String(nationId)];

    if (!record) {
      await interaction.editReply(`Nation **${nationId}**: ❌ No API key linked.`);
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle(`API Key Status — Nation ${nationId}`)
      .setColor(0x2ecc71)
      .setDescription(`✅ A key is linked (since ${new Date(record.linkedAt).toLocaleDateString()}).`)
      .setFooter({ text: "The key itself is encrypted and never displayed, even to administrators." });

    await interaction.editReply({ embeds: [embed] });
  }
};
