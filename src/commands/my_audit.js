const { SlashCommandBuilder } = require("discord.js");
const { getAllianceNations } = require("../pnw");
const { CATEGORIES, CATEGORY_CHOICES } = require("../audit/categories");
const { runChecks, buildReportEmbed, buildHistoryRecord } = require("../audit/runAudit");
const { runGrandAudit } = require("../audit/grandAudit");
const { getSettings, saveSettings } = require("../db");

// Finds the nation belonging to whoever ran the command, using whatever
// Discord info PnW has on file for each nation — no separate "link your
// account" step needed, but it only works if that nation's Discord field
// on the PnW website matches their actual Discord account.
function findMyNation(members, discordUser) {
  const byVerifiedId = members.find((n) => n.discord_id && String(n.discord_id) === discordUser.id);
  if (byVerifiedId) return byVerifiedId;

  const byUsername = members.filter(
    (n) => n.discord && n.discord.toLowerCase() === discordUser.username.toLowerCase()
  );
  if (byUsername.length === 1) return byUsername[0];

  return null;
}

module.exports = {
  minTier: "member",
  data: new SlashCommandBuilder()
    .setName("my_audit")
    .setDescription("Audit your own nation, found automatically via your linked Discord account.")
    .addStringOption((opt) => {
      opt.setName("category").setDescription("Which audit category to run").setRequired(true);
      for (const choice of CATEGORY_CHOICES) opt.addChoices(choice);
      return opt;
    }),

  async execute(interaction) {
    await interaction.deferReply();

    const settings = getSettings(interaction.guildId);
    if (!settings.alliance.id) {
      await interaction.editReply("❌ No alliance registered yet — run /set_alliance first.");
      return;
    }

    await interaction.editReply("⏳ Looking up your nation...");

    let members;
    try {
      const result = await getAllianceNations(settings.alliance.id);
      members = result.members;
    } catch (error) {
      await interaction.editReply(`❌ Couldn't fetch alliance nations: ${error.message}`);
      return;
    }

    const nation = findMyNation(members, interaction.user);
    if (!nation) {
      await interaction.editReply(
        "❌ Couldn't find a nation linked to your Discord account.\n" +
          "On the Politics & War website, make sure your nation's Discord field/verification matches your Discord username " +
          "(`Edit Nation` → Discord). In the meantime, you can still run `/grand_audit nation:<your nation name or ID>` directly."
      );
      return;
    }

    const categoryKey = interaction.options.getString("category");

    if (nation.vacation_mode_turns > 0) {
      await interaction.editReply(`ℹ️ **${nation.nation_name}** is currently in Vacation Mode — audits are skipped for VM nations.`);
      return;
    }

    let embed, percent, pass, grade;
    if (categoryKey === "grand_audit") {
      ({ embed, percent, pass, grade } = runGrandAudit(nation, settings));
    } else {
      const { checks, label } = CATEGORIES[categoryKey];
      const results = runChecks(nation, checks, settings);
      ({ embed, percent, pass, grade } = buildReportEmbed(nation, results, settings, `${label} Audit`));
    }

    settings.auditHistory.push(buildHistoryRecord(nation, percent, pass, "my_audit", grade));
    saveSettings(interaction.guildId, settings);

    await interaction.editReply({ content: null, embeds: [embed] });
  }
};
