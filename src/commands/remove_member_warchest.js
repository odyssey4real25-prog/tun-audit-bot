const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { resolveNationId } = require("../pnw");
const { getSettings, saveSettings } = require("../db");

module.exports = {
  minTier: "administrator",
  data: new SlashCommandBuilder()
    .setName("remove_member_warchest")
    .setDescription("Remove a nation's warchest override(s), reverting to the alliance-wide policy.")
    .addStringOption((opt) =>
      opt.setName("nation").setDescription("Nation ID, name, or profile link").setRequired(true)
    )
    .addStringOption((opt) =>
      opt
        .setName("resource")
        .setDescription("Remove just one resource's override. Leave blank to remove ALL overrides for this nation.")
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

    const resource = interaction.options.getString("resource");
    const settings = getSettings(interaction.guildId);
    const key = String(nationId);

    if (!settings.memberWarchestOverrides[key]) {
      await interaction.editReply(`Nation **${nationId}** has no overrides to remove.`);
      return;
    }

    if (resource) {
      delete settings.memberWarchestOverrides[key][resource];
      if (Object.keys(settings.memberWarchestOverrides[key]).length === 0) {
        delete settings.memberWarchestOverrides[key];
      }
    } else {
      delete settings.memberWarchestOverrides[key];
    }
    saveSettings(interaction.guildId, settings);

    const embed = new EmbedBuilder()
      .setTitle("Member Warchest Override Removed")
      .setColor(0x2ecc71)
      .setDescription(
        resource
          ? `Removed the **${resource}** override for nation **${nationId}**.`
          : `Removed ALL overrides for nation **${nationId}** — it now fully uses the alliance-wide policy.`
      );

    await interaction.editReply({ embeds: [embed] });
  }
};
