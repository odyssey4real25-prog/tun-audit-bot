const { SlashCommandBuilder } = require("discord.js");
const { getAllianceNations } = require("../pnw");
const { runGrandAudit } = require("../audit/grandAudit");
const { buildHistoryRecord } = require("../audit/runAudit");
const { getSettings, saveSettings } = require("../db");

// Note: this command runs everything immediately when someone types it —
// it does NOT run on a timer/schedule by itself (e.g. "every day at 9am").
// True automatic scheduling needs a small always-on timer added to index.js.
// Flag it if you want that added — it's a natural next step from here.

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = {
  minTier: "government",
  data: new SlashCommandBuilder()
    .setName("auto_grand_audit")
    .setDescription("Run a Grand Audit on every alliance member and post each report in the audit channel."),

  async execute(interaction) {
    await interaction.deferReply();

    const settings = getSettings(interaction.guildId);

    if (!settings.alliance.id) {
      await interaction.editReply("❌ No alliance registered yet — run /set_alliance first.");
      return;
    }
    if (!settings.auditChannelId) {
      await interaction.editReply("❌ No audit channel set yet — run /set_audit_channel first.");
      return;
    }

    const channel = interaction.guild.channels.cache.get(settings.auditChannelId);
    if (!channel) {
      await interaction.editReply("❌ The configured audit channel no longer exists. Run /set_audit_channel again.");
      return;
    }

    let members;
    try {
      const result = await getAllianceNations(settings.alliance.id);
      members = result.members;
    } catch (error) {
      await interaction.editReply(`❌ Couldn't fetch alliance nations: ${error.message}`);
      return;
    }

    await interaction.editReply(
      `⏳ Running Grand Audits on ${members.length} members and posting reports in <#${channel.id}>. This will take a few minutes...`
    );

    let posted = 0;
    for (const nation of members) {
      const { embed, percent, pass } = runGrandAudit(nation, settings);
      settings.auditHistory.push(buildHistoryRecord(nation, percent, pass, "auto_grand_audit"));

      try {
        await channel.send({ embeds: [embed] });
        posted += 1;
      } catch (error) {
        console.error(`Failed to post report for ${nation.nation_name}:`, error);
      }

      // Be polite to both the PnW API and Discord's rate limits.
      await sleep(400);
    }

    saveSettings(interaction.guildId, settings);

    await interaction.followUp(`✅ Done! Posted ${posted}/${members.length} reports in <#${channel.id}>.`);
  }
};
