const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { getAllianceNations, isActiveMember } = require("../pnw");
const { CONDITIONS } = require("../audit/autoNotifyConditions");
const { getSettings } = require("../db");

const CONDITION_LABELS = {
  inactivity: "⏰ Inactive",
  raid_capacity: "⚔️ Under Raid Capacity",
  map_full: "🎯 MAP Sitting at Cap",
  color_bloc: "🎨 Off Bloc Colour"
};

module.exports = {
  minTier: "mentor",
  data: new SlashCommandBuilder()
    .setName("alliance_status")
    .setDescription("Quick dashboard of how many members currently need attention. Sends no DMs."),

  async execute(interaction) {
    await interaction.deferReply();

    const settings = getSettings(interaction.guildId);
    if (!settings.alliance.id) {
      await interaction.editReply("❌ No alliance registered yet — run /set_alliance first.");
      return;
    }

    await interaction.editReply("⏳ Checking all members...");

    let members;
    try {
      const result = await getAllianceNations(settings.alliance.id);
      members = result.members.filter(isActiveMember);
    } catch (error) {
      await interaction.editReply(`❌ Couldn't fetch alliance nations: ${error.message}`);
      return;
    }

    const counts = {};
    for (const condition of CONDITIONS) counts[condition.key] = 0;

    for (const nation of members) {
      for (const condition of CONDITIONS) {
        if (condition.check(nation, settings)) counts[condition.key] += 1;
      }
    }

    const embed = new EmbedBuilder()
      .setTitle(`📊 Alliance Status — ${settings.alliance.name}`)
      .setColor(0x3498db)
      .setDescription(`Checked **${members.length}** member(s). No DMs were sent — this is just a quick look.`)
      .addFields(
        CONDITIONS.map((condition) => ({
          name: CONDITION_LABELS[condition.key] || condition.key,
          value: String(counts[condition.key]),
          inline: true
        }))
      )
      .setFooter({ text: "Use /notify_failing_nations or /run_auto_notify to actually message anyone." });

    await interaction.followUp({ embeds: [embed] });
  }
};
