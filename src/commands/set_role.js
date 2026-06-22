const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { getSettings, saveSettings } = require("../db");

module.exports = {
  minTier: "administrator",
  data: new SlashCommandBuilder()
    .setName("set_role")
    .setDescription("Map a Discord role to a bot permission tier (Mentor, Government, or Administrator).")
    .addRoleOption((opt) => opt.setName("role").setDescription("The Discord role to map").setRequired(true))
    .addStringOption((opt) =>
      opt
        .setName("tier")
        .setDescription("Which tier this role should have")
        .setRequired(true)
        .addChoices(
          { name: "Mentor", value: "mentor" },
          { name: "Government", value: "government" },
          { name: "Administrator", value: "administrator" }
        )
    ),

  async execute(interaction) {
    const role = interaction.options.getRole("role");
    const tier = interaction.options.getString("tier");

    const settings = getSettings(interaction.guildId);
    settings.roleMap[role.id] = tier;
    saveSettings(interaction.guildId, settings);

    const embed = new EmbedBuilder()
      .setTitle("Role Mapped")
      .setColor(0x2ecc71)
      .setDescription(`The role **${role.name}** now has **${tier}** permissions in this bot.`);

    await interaction.reply({ embeds: [embed] });
  }
};
