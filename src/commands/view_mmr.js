const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { getSettings } = require("../db");

module.exports = {
  minTier: "member",
  data: new SlashCommandBuilder().setName("view_mmr").setDescription("View the alliance's current MMR requirement for every city-count tier."),

  async execute(interaction) {
    const settings = getSettings(interaction.guildId);

    const lines = Object.entries(settings.mmr).map(([tier, req]) => {
      return `**${tier}**: ${req.barracks}/${req.factory}/${req.hangar}/${req.drydock}`;
    });

    const embed = new EmbedBuilder()
      .setTitle("Current MMR Requirements")
      .setColor(0x3498db)
      .setDescription(lines.join("\n") + "\n\n(Barracks/Factory/Hangar/Drydock, per city)");

    await interaction.reply({ embeds: [embed] });
  }
};
