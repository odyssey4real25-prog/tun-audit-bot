const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { TIER_CHOICES } = require("../audit/tiers");
const { getSettings, saveSettings } = require("../db");

module.exports = {
  minTier: "administrator",
  data: new SlashCommandBuilder()
    .setName("set_tier_role")
    .setDescription("Map a city-count tier to a Discord role (e.g. Initiate C1-C5).")
    .addStringOption((opt) => {
      opt.setName("tier").setDescription("Which city-count tier").setRequired(true);
      for (const choice of TIER_CHOICES) opt.addChoices(choice);
      return opt;
    })
    .addRoleOption((opt) => opt.setName("role").setDescription("The Discord role for this tier").setRequired(true)),

  async execute(interaction) {
    const tierKey = interaction.options.getString("tier");
    const role = interaction.options.getRole("role");

    const settings = getSettings(interaction.guildId);
    settings.tierRoles[tierKey] = role.id;
    saveSettings(interaction.guildId, settings);

    const tierLabel = TIER_CHOICES.find((c) => c.value === tierKey)?.name ?? tierKey;

    const embed = new EmbedBuilder()
      .setTitle("Tier Role Mapped")
      .setColor(0x2ecc71)
      .setDescription(`**${tierLabel}** is now mapped to **${role.name}**.`)
      .setFooter({ text: "Make sure the bot's own role is positioned ABOVE this role in Server Settings → Roles, or it won't be able to assign it." });

    await interaction.reply({ embeds: [embed] });
  }
};
