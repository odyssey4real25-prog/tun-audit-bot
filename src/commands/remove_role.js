const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { getSettings, saveSettings } = require("../db");

module.exports = {
  minTier: "administrator",
  data: new SlashCommandBuilder()
    .setName("remove_role")
    .setDescription("Remove a Discord role's tier mapping (it goes back to Member tier).")
    .addRoleOption((opt) => opt.setName("role").setDescription("The Discord role to unmap").setRequired(true)),

  async execute(interaction) {
    const role = interaction.options.getRole("role");
    const settings = getSettings(interaction.guildId);

    if (!settings.roleMap[role.id]) {
      await interaction.reply({ content: `**${role.name}** isn't mapped to any tier — nothing to remove.`, ephemeral: true });
      return;
    }

    const oldTier = settings.roleMap[role.id];
    delete settings.roleMap[role.id];
    saveSettings(interaction.guildId, settings);

    const embed = new EmbedBuilder()
      .setTitle("Role Unmapped")
      .setColor(0x2ecc71)
      .setDescription(`**${role.name}** was removed from **${oldTier}** tier and is now back to default Member tier.`);

    await interaction.reply({ embeds: [embed] });
  }
};
