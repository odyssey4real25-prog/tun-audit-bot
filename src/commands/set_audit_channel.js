const { SlashCommandBuilder, EmbedBuilder, ChannelType } = require("discord.js");
const { getSettings, saveSettings } = require("../db");

module.exports = {
  minTier: "administrator",
  data: new SlashCommandBuilder()
    .setName("set_audit_channel")
    .setDescription("Set the channel where automated audit reports get posted.")
    .addChannelOption((opt) =>
      opt
        .setName("channel")
        .setDescription("The channel for automated reports")
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true)
    ),

  async execute(interaction) {
    const channel = interaction.options.getChannel("channel");

    const settings = getSettings(interaction.guildId);
    settings.auditChannelId = channel.id;
    saveSettings(interaction.guildId, settings);

    const embed = new EmbedBuilder()
      .setTitle("Audit Channel Set")
      .setColor(0x2ecc71)
      .setDescription(`Automated audit reports will now be posted in <#${channel.id}>.`);

    await interaction.reply({ embeds: [embed] });
  }
};
