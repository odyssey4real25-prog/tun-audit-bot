const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { auditAllMembers } = require("../audit/allianceAudit");
const { checks: infraChecks } = require("../audit/checks/infrastructureLand");
const { checks: buildChecks } = require("../audit/checks/buildsProjects");
const { checks: otherChecks } = require("../audit/checks/others");
const { ALL_CHECKS } = require("../audit/grandAudit");
const { resolveDiscordUser } = require("../audit/resolveDiscordUser");
const { buildFailureDM } = require("../audit/notifyEmbed");
const { getSettings } = require("../db");

const CATEGORIES = {
  infrastructure_land: { checks: infraChecks, label: "Infrastructure & Land" },
  build_slots_project: { checks: buildChecks, label: "Builds & Projects" },
  others: { checks: otherChecks, label: "Other Compliance" },
  grand_audit: { checks: ALL_CHECKS, label: "Grand Audit" }
};

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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
  if (current) chunks.push(current);
  return chunks.length > 0 ? chunks : ["None"];
}

module.exports = {
  minTier: "mentor",
  data: new SlashCommandBuilder()
    .setName("notify_failing_nations")
    .setDescription("DM nations about what they're failing in a category. Always previews before sending.")
    .addStringOption((opt) =>
      opt
        .setName("category")
        .setDescription("Which audit category to check and message about")
        .setRequired(true)
        .addChoices(
          { name: "Infrastructure & Land", value: "infrastructure_land" },
          { name: "Builds & Projects", value: "build_slots_project" },
          { name: "Other Compliance", value: "others" },
          { name: "Grand Audit (all checks)", value: "grand_audit" }
        )
    )
    .addStringOption((opt) =>
      opt
        .setName("include")
        .setDescription("Who to include")
        .setRequired(true)
        .addChoices(
          { name: "Failing only", value: "failing_only" },
          { name: "Needs Improvement & Failing", value: "needs_improvement_and_failing" }
        )
    )
    .addBooleanOption((opt) =>
      opt
        .setName("confirm")
        .setDescription("False = preview only (default-safe). True = actually send the DMs.")
        .setRequired(true)
    ),

  async execute(interaction) {
    await interaction.deferReply();

    const settings = getSettings(interaction.guildId);
    if (!settings.alliance.id) {
      await interaction.editReply("❌ No alliance registered yet — run /set_alliance first.");
      return;
    }

    const categoryKey = interaction.options.getString("category");
    const includeOption = interaction.options.getString("include");
    const confirm = interaction.options.getBoolean("confirm");
    const { checks, label } = CATEGORIES[categoryKey];

    await interaction.editReply("⏳ Auditing all members, this may take a minute...");

    let auditResults;
    try {
      auditResults = await auditAllMembers(settings.alliance.id, settings, { checks });
    } catch (error) {
      await interaction.editReply(`❌ Couldn't fetch alliance nations: ${error.message}`);
      return;
    }

    const targeted = auditResults.filter((entry) =>
      includeOption === "failing_only" ? entry.grade.label === "Failing" : !entry.pass
    );

    if (targeted.length === 0) {
      await interaction.followUp("✅ No nations currently match that filter — nobody to notify!");
      return;
    }

    // Figure out who we can actually message before sending or even previewing.
    const toMessage = [];
    const noDiscordLinked = [];
    for (const entry of targeted) {
      const user = await resolveDiscordUser(interaction.client, interaction.guild, entry.nation);
      if (user) {
        toMessage.push({ entry, user });
      } else {
        noDiscordLinked.push(entry);
      }
      await sleep(200);
    }

    if (!confirm) {
      const willMessageLines = toMessage.map(({ entry, user }) => `${entry.grade.emoji} **${entry.nation.nation_name}** → ${user.username} (${entry.percent}%)`);
      const skippedLines = noDiscordLinked.map((entry) => `${entry.grade.emoji} **${entry.nation.nation_name}** — no linked Discord found (${entry.percent}%)`);

      const embed = new EmbedBuilder()
        .setTitle(`Preview — Notify "${label}" (no messages sent yet)`)
        .setColor(0x3498db)
        .setDescription(
          `**${toMessage.length}** nation(s) would receive a DM. **${noDiscordLinked.length}** would be skipped (no Discord account linked/found).\n\n` +
            "Re-run this exact command with `confirm: True` to actually send these DMs."
        );

      chunkLines(willMessageLines).forEach((chunk, idx) => {
        embed.addFields({ name: idx === 0 ? "✅ Would message" : "\u200b", value: chunk });
      });
      chunkLines(skippedLines).forEach((chunk, idx) => {
        embed.addFields({ name: idx === 0 ? "⏭️ Would skip" : "\u200b", value: chunk });
      });

      await interaction.followUp({ embeds: [embed] });
      return;
    }

    // confirm:true — actually send the DMs now.
    await interaction.followUp(`⏳ Sending ${toMessage.length} DM(s)...`);

    let sent = 0;
    let failed = 0;
    for (const { entry, user } of toMessage) {
      const dmEmbed = buildFailureDM(entry.nation, entry, settings.alliance.name, label);
      try {
        await user.send({ embeds: [dmEmbed] });
        sent += 1;
      } catch (error) {
        failed += 1;
        console.error(`Couldn't DM ${entry.nation.nation_name} (${user.username}):`, error.message);
      }
      // Be polite to Discord's DM rate limits.
      await sleep(500);
    }

    await interaction.followUp(
      `✅ Sent ${sent} DM(s). ${failed > 0 ? `❌ ${failed} failed to deliver (likely DMs disabled or no mutual server). ` : ""}⏭️ ${noDiscordLinked.length} skipped (no Discord linked).`
    );
  }
};
