const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { getSettings, saveSettings } = require("../db");

module.exports = {
  minTier: "administrator",
  data: new SlashCommandBuilder()
    .setName("set_mmr")
    .setDescription("Set the required MMR for a city-count tier (e.g. C1-C5).")
    .addStringOption((opt) =>
      opt
        .setName("tier")
        .setDescription("Which city-count tier this applies to")
        .setRequired(true)
        .addChoices(
          { name: "C1-C5 (1 to 5 cities)", value: "C1-C5" },
          { name: "C6-C10 (6 to 10 cities)", value: "C6-C10" },
          { name: "C11-C15 (11 to 15 cities)", value: "C11-C15" },
          { name: "C16-C20 (16 to 20 cities)", value: "C16-C20" },
          { name: "C21+ (21 or more cities)", value: "C21+" }
        )
    )
    .addIntegerOption((opt) => opt.setName("barracks").setDescription("Required barracks per city").setRequired(true))
    .addIntegerOption((opt) => opt.setName("factory").setDescription("Required factories per city").setRequired(true))
    .addIntegerOption((opt) => opt.setName("hangar").setDescription("Required hangars per city").setRequired(true))
    .addIntegerOption((opt) => opt.setName("drydock").setDescription("Required drydocks per city").setRequired(true)),

  async execute(interaction) {
    const tier = interaction.options.getString("tier");

    const settings = getSettings(interaction.guildId);
    settings.mmr[tier] = {
      barracks: interaction.options.getInteger("barracks"),
      factory: interaction.options.getInteger("factory"),
      hangar: interaction.options.getInteger("hangar"),
      drydock: interaction.options.getInteger("drydock")
    };
    saveSettings(interaction.guildId, settings);

    const { barracks, factory, hangar, drydock } = settings.mmr[tier];
    const embed = new EmbedBuilder()
      .setTitle("MMR Updated")
      .setColor(0x2ecc71)
      .setDescription(`**${tier}** nations now require **${barracks}/${factory}/${hangar}/${drydock}**\n(Barracks/Factory/Hangar/Drydock, per city)`);

    await interaction.reply({ embeds: [embed] });
  }
};
