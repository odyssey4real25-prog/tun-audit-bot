const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { getSettings } = require("../db");

module.exports = {
  minTier: "member",
  data: new SlashCommandBuilder().setName("list_roles").setDescription("Show which Discord roles are mapped to Mentor/Government/Administrator."),

  async execute(interaction) {
    const settings = getSettings(interaction.guildId);
    const entries = Object.entries(settings.roleMap || {});

    if (entries.length === 0) {
      await interaction.reply({
        content: "No roles are mapped yet. An administrator can use `/set_role` to map a Discord role to Mentor, Government, or Administrator.",
        ephemeral: true
      });
      return;
    }

    // Showing role names (not live @mentions) so this command can never
    // accidentally ping a role.
    const grouped = { mentor: [], government: [], administrator: [] };
    for (const [roleId, tier] of entries) {
      const role = interaction.guild.roles.cache.get(roleId);
      const roleName = role ? role.name : `Unknown role (ID: ${roleId})`;
      if (grouped[tier]) grouped[tier].push(roleName);
    }

    const embed = new EmbedBuilder()
      .setTitle("Role → Tier Mapping")
      .setColor(0x3498db)
      .addFields(
        { name: "🟡 Mentor", value: grouped.mentor.join(", ") || "None" },
        { name: "🔵 Government", value: grouped.government.join(", ") || "None" },
        { name: "🔴 Administrator", value: grouped.administrator.join(", ") || "None" }
      )
      .setFooter({ text: "Anyone with Discord's own Administrator permission is also automatically Administrator tier." });

    await interaction.reply({ embeds: [embed] });
  }
};
