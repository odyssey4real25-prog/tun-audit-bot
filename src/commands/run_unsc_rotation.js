const { SlashCommandBuilder } = require("discord.js");
const { runUnscRotation } = require("../audit/unscRotation");
const { getSettings, saveSettings } = require("../db");

module.exports = {
  minTier: "government",
  data: new SlashCommandBuilder()
    .setName("run_unsc_rotation")
    .setDescription("Manually run a council rotation now, instead of waiting for the schedule."),

  async execute(interaction) {
    await interaction.deferReply();

    const settings = getSettings(interaction.guildId);
    const config = settings.unscRotation;

    if (!settings.alliance.id) {
      await interaction.editReply("❌ No alliance registered yet — run /set_alliance first.");
      return;
    }
    if (!config.nonPermanentRoleId) {
      await interaction.editReply("❌ No non-permanent role configured yet — run /set_unsc_config first.");
      return;
    }

    await interaction.editReply("⏳ Running the rotation, this may take a few minutes...");

    let summary;
    try {
      summary = await runUnscRotation(interaction.client, interaction.guild, settings);
    } catch (error) {
      await interaction.editReply(`❌ Couldn't run the rotation: ${error.message}`);
      return;
    }

    config.lastRunAt = new Date().toISOString();
    saveSettings(interaction.guildId, settings);

    const seatedLines = summary.newlySeated.map(({ nation, member }) => `${nation.nation_name} — <@${member.id}>`);

    await interaction.followUp(
      `✅ Rotation complete.\n` +
        `Removed role from **${summary.outgoingRemoved}** outgoing member(s).\n` +
        `**${summary.eligibleCount}** eligible, **${summary.excludedCount}** excluded.\n` +
        `Seated **${summary.newlySeated.length}/${config.seatCount}** seats:\n` +
        (seatedLines.join("\n") || "(none)") +
        (summary.skippedNoChannel ? "\n⚠️ No announce channel configured/found — nothing was posted publicly." : "") +
        (summary.outgoingErrors > 0 ? `\n⚠️ ${summary.outgoingErrors} role error(s) — check the bot's role position/permissions.` : "")
    );
  }
};
