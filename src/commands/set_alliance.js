const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { getSettings, saveSettings } = require("../db");

module.exports = {
  minTier: "administrator",
  data: new SlashCommandBuilder()
    .setName("set_alliance")
    .setDescription("Register your alliance with the bot.")
    .addIntegerOption((opt) =>
      opt.setName("alliance_id").setDescription("Your alliance's PnW ID number").setRequired(true)
    )
    .addStringOption((opt) =>
      opt.setName("alliance_name").setDescription("Your alliance's name").setRequired(true)
    )
    .addStringOption((opt) =>
      opt.setName("alliance_colour").setDescription("Your alliance's bloc colour").setRequired(true)
    ),

  async execute(interaction) {
    const settings = getSettings(interaction.guildId);
    settings.alliance = {
      id: interaction.options.getInteger("alliance_id"),
      name: interaction.options.getString("alliance_name"),
      colour: interaction.options.getString("alliance_colour")
    };
    saveSettings(interaction.guildId, settings);

    const embed = new EmbedBuilder()
      .setTitle("Alliance Registered")
      .setColor(0x2ecc71)
      .addFields(
        { name: "Alliance Name", value: settings.alliance.name, inline: true },
        { name: "Alliance ID", value: String(settings.alliance.id), inline: true },
        { name: "Colour", value: settings.alliance.colour, inline: true }
      );

    await interaction.reply({ embeds: [embed] });
  }
};
