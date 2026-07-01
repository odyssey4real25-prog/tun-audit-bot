const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { getAllianceNations } = require("../pnw");
const { findEligibleNations } = require("../audit/unscRotation");
const { getSettings } = require("../db");

// Splits lines into chunks that fit within Discord's embed field limit.
// Importantly: always pushes the remaining `current` buffer BEFORE
// checking if anything was collected — the original bug returned "None"
// when all lines fit into one chunk (because the `chunks` array stayed
// empty even though `current` held all the content).
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
  if (current) chunks.push(current); // always flush the last buffer
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

    const eligibleLines = eligible.map(
      ({ nation, seniorityDays }) => `✅ **${nation.nation_name}** — ${seniorityDays} days`
    );
    const excludedLines = excluded.map(
      ({ nation, reason }) => `⏭️ **${nation.nation_name}** — ${reason}`
    );

    // Each list might need multiple embeds if it exceeds Discord's total
    // 6000-char embed limit — send Eligible and Excluded as separate
    // follow-ups so they each get their own fresh budget.
    const summary = new EmbedBuilder()
      .setTitle("UNSC Rotation Preview (no roles changed)")
      .setColor(0x3498db)
      .setDescription(
        `**${eligible.length}** eligible, **${excluded.length}** excluded. ` +
          `${config.seatCount} seat(s) per term — ` +
          `${eligible.length >= config.seatCount
            ? "enough eligible members to fill every seat."
            : "⚠️ NOT enough eligible members to fill every seat."}`
      );

    const eligibleEmbed = new EmbedBuilder()
      .setTitle("✅ Eligible Members")
      .setColor(0x2ecc71)
      .setDescription(eligibleLines.join("\n") || "None");

    const embedsToSend = [summary, eligibleEmbed];

    // Excluded list might be long — chunk it into separate embeds if needed
    const excludedChunks = chunkLines(excludedLines);
    excludedChunks.forEach((chunk, idx) => {
      embedsToSend.push(
        new EmbedBuilder()
          .setTitle(idx === 0 ? "⏭️ Excluded Members" : "⏭️ Excluded Members (cont.)")
          .setColor(0xe74c3c)
          .setDescription(chunk)
      );
    });

    // Discord allows max 10 embeds per message — send in batches if needed
    const BATCH_SIZE = 10;
    for (let i = 0; i < embedsToSend.length; i += BATCH_SIZE) {
      const batch = embedsToSend.slice(i, i + BATCH_SIZE);
      await interaction.followUp({ embeds: batch });
    }
  }
};
