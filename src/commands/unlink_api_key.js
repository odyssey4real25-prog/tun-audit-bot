const { SlashCommandBuilder, MessageFlags } = require("discord.js");
const { getAllianceNations } = require("../pnw");
const { findMyNation } = require("../audit/findMyNation");
const { getSettings, saveSettings } = require("../db");

module.exports = {
  minTier: "member",
  data: new SlashCommandBuilder().setName("unlink_api_key").setDescription("Remove your own linked PnW API key."),

  async execute(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const settings = getSettings(interaction.guildId);
    if (!settings.alliance.id) {
      await interaction.editReply("❌ No alliance registered yet for this server.");
      return;
    }

    let members;
    try {
      const result = await getAllianceNations(settings.alliance.id);
      members = result.members;
    } catch (error) {
      await interaction.editReply(`❌ Couldn't verify alliance membership right now: ${error.message}`);
      return;
    }

    const nation = findMyNation(members, interaction.user);
    if (!nation) {
      await interaction.editReply("❌ Couldn't find a nation linked to your Discord account.");
      return;
    }

    const key = String(nation.id);
    if (!settings.linkedApiKeys[key]) {
      await interaction.editReply("You don't have a linked API key on file.");
      return;
    }

    delete settings.linkedApiKeys[key];
    saveSettings(interaction.guildId, settings);

    await interaction.editReply(`✅ Your linked API key for **${nation.nation_name}** has been removed.`);
  }
};
