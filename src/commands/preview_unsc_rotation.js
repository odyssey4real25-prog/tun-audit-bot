const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { getAllianceNations } = require("../pnw");
const { findEligibleNations } = require("../audit/unscRotation");
const { getSettings } = require("../db");

function chunkLines(lines, maxLength = 1000) {
  const chunks = [];
  let current = "";
  for (const line of lines) {
    if ((current + "\n" + line).length > maxLength) {
      chunks.push(current);
      current = line;
    } else {
      current = current ? `${current}\n${line}` : line;
    }
  }
  return chunks.length > 0 ? chunks : ["None"];
}

module.exports = {
  minTier: "government",
  data: new SlashCommandBuilder()
    .setName("preview_unsc_rotation")
    .setDescription("Show who's currently eligible/excluded for the council, without changing any roles."),

  async execute(interaction) {
    await interaction.deferReply();

    const settings = getSettings(interaction.guildId);
    const config = settings.unscRotation;

    if (!settings.alliance.id) {
      await interaction.editReply("❌ No alliance registered yet — run /set_alliance first.");
      return;
    }

    await interaction.editReply("⏳ Checking eligibility for all members...");

    let members;
    try {
      const result = await getAllianceNations(settings.alliance.id);
      members = result.members;
    } catch (error) {
      await interaction.editReply(`❌ Couldn't fetch alliance nations: ${error.message}`);
      return;
    }

    const { eligible, excluded } = await findEligibleNations(interaction.guild, settings, members);

    const eligibleLines = eligible.map(({ nation, seniorityDays }) => `✅ **${nation.nation_name}** — ${seniorityDays} days`);
    const excludedLines = excluded.map(({ nation, reason }) => `⏭️ **${nation.nation_name}** — ${reason}`);

    const embed = new EmbedBuilder()
      .setTitle("UNSC Rotation Preview (no roles changed)")
      .setColor(0x3498db)
      .setDescription(
        `**${eligible.length}** eligible, **${excluded.length}** excluded. ${config.seatCount} seat(s) per term — ` +
          `${eligible.length >= config.seatCount ? "enough eligible members to fill every seat." : "⚠️ NOT enough eligible members to fill every seat."}`
      );

    chunkLines(eligibleLines).forEach((chunk, idx) => {
      embed.addFields({ name: idx === 0 ? "Eligible" : "\u200b", value: chunk });
    });
    chunkLines(excludedLines).forEach((chunk, idx) => {
      embed.addFields({ name: idx === 0 ? "Excluded" : "\u200b", value: chunk });
    });

    await interaction.followUp({ embeds: [embed] });
  }
};
