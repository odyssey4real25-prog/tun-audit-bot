const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { resolveNationId } = require("../pnw");
const { getSettings, saveSettings } = require("../db");

module.exports = {
  minTier: "administrator",
  data: new SlashCommandBuilder()
    .setName("set_member_warchest")
    .setDescription("Set a custom per-city warchest target for one nation, overriding the alliance policy.")
    .addStringOption((opt) =>
      opt.setName("nation").setDescription("Nation ID, name, or profile link").setRequired(true)
    )
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
      opt.setName("amount_per_city").setDescription("Required amount PER CITY for this nation").setRequired(true)
    ),

  async execute(interaction) {
    await interaction.deferReply();

    const resource = interaction.options.getString("resource");
    const amountPerCity = interaction.options.getNumber("amount_per_city");

    let nationId;
    try {
      nationId = await resolveNationId(interaction.options.getString("nation"));
    } catch (error) {
      await interaction.editReply(`❌ ${error.message}`);
      return;
    }

    const settings = getSettings(interaction.guildId);
    const key = String(nationId);
    if (!settings.memberWarchestOverrides[key]) settings.memberWarchestOverrides[key] = {};
    settings.memberWarchestOverrides[key][resource] = amountPerCity;
    saveSettings(interaction.guildId, settings);

    const embed = new EmbedBuilder()
      .setTitle("Member Warchest Override Set")
      .setColor(0x2ecc71)
      .setDescription(
        `Nation **${nationId}** now has a custom **${resource}** target: **${amountPerCity.toLocaleString()} per city**.\n` +
          "Any other resources not overridden for this nation still use the alliance-wide policy."
      );

    await interaction.editReply({ embeds: [embed] });
  }
};
