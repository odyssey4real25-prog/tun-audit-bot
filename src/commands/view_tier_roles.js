const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { TIER_CHOICES } = require("../audit/tiers");
const { getSettings } = require("../db");

module.exports = {
  minTier: "member",
  data: new SlashCommandBuilder().setName("view_tier_roles").setDescription("Show which Discord role is mapped to each city-count tier."),

  async execute(interaction) {
    const settings = getSettings(interaction.guildId);

    const lines = TIER_CHOICES.map((tier) => {
      const roleId = settings.tierRoles[tier.value];
      if (!roleId) return `**${tier.name}**: not set`;
      const role = interaction.guild.roles.cache.get(roleId);
      return `**${tier.name}**: ${role ? role.name : `Unknown role (ID: ${roleId})`}`;
    });

    const embed = new EmbedBuilder()
      .setTitle("Tier Role Mapping")
      .setColor(0x3498db)
      .setDescription(lines.join("\n"));

    await interaction.reply({ embeds: [embed] });
  }
};
