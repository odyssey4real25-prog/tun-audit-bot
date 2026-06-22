const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { getSettings, saveSettings } = require("../db");

module.exports = {
  minTier: "administrator",
  data: new SlashCommandBuilder()
    .setName("set_warchest_policy")
    .setDescription("Set the required warchest amount PER CITY for one resource. Run once per resource.")
    .addStringOption((opt) =>
      opt
        .setName("resource")
        .setDescription("Which resource to set a per-city target for")
        .setRequired(true)
        .addChoices(
          { name: "Money", value: "money" },
          { name: "Food", value: "food" },
          { name: "Coal", value: "coal" },
          { name: "Oil", value: "oil" },
          { name: "Uranium", value: "uranium" },
          { name: "Lead", value: "lead" },
          { name: "Iron", value: "iron" },
          { name: "Bauxite", value: "bauxite" },
          { name: "Gasoline", value: "gasoline" },
          { name: "Munitions", value: "munitions" },
          { name: "Steel", value: "steel" },
          { name: "Aluminum", value: "aluminum" }
        )
    )
    .addNumberOption((opt) =>
      opt
        .setName("amount_per_city")
        .setDescription("Required amount PER CITY, e.g. 5000 food per city (a 10-city nation needs 50,000)")
        .setRequired(true)
    ),

  async execute(interaction) {
    const resource = interaction.options.getString("resource");
    const amountPerCity = interaction.options.getNumber("amount_per_city");

    const settings = getSettings(interaction.guildId);
    settings.warchestPolicy[resource] = amountPerCity;
    saveSettings(interaction.guildId, settings);

    const exampleCities = 10;
    const exampleTotal = amountPerCity * exampleCities;

    const embed = new EmbedBuilder()
      .setTitle("Warchest Policy Updated")
      .setColor(0x2ecc71)
      .setDescription(
        `Required **${resource}**: **${amountPerCity.toLocaleString()} per city**.\n` +
          `Example: a ${exampleCities}-city nation would need **${exampleTotal.toLocaleString()}** total.`
      );

    await interaction.reply({ embeds: [embed] });
  }
};
