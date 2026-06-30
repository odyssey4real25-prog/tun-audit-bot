const { SlashCommandBuilder, AttachmentBuilder } = require("discord.js");
const ExcelJS = require("exceljs");
const path = require("path");
const os = require("os");
const fs = require("fs");
const { auditAllMembers } = require("../audit/allianceAudit");
const { CATEGORIES, CATEGORY_CHOICES } = require("../audit/categories");
const { getAllianceName } = require("../pnw");
const { getSettings } = require("../db");

const GRADE_FILL_COLORS = {
  Excellent: "FF2ECC71",
  Passing: "FF2ECC71",
  "Needs Improvement": "FFF1C40F",
  Failing: "FFE74C3C"
};

module.exports = {
  minTier: "government",
  data: new SlashCommandBuilder()
    .setName("export_audit_report")
    .setDescription("Export a full alliance audit to a downloadable spreadsheet.")
    .addStringOption((opt) => {
      opt.setName("category").setDescription("Which audit category to export").setRequired(true);
      for (const choice of CATEGORY_CHOICES) opt.addChoices(choice);
      return opt;
    })
    .addIntegerOption((opt) =>
      opt.setName("alliance_id").setDescription("Audit a different alliance by PnW ID. Leave blank to use your home alliance.")
    ),

  async execute(interaction) {
    await interaction.deferReply();

    const settings = getSettings(interaction.guildId);
    const targetAllianceId = interaction.options.getInteger("alliance_id") || settings.alliance.id;
    if (!targetAllianceId) {
      await interaction.editReply("❌ No alliance registered yet — run /set_alliance first, or provide an alliance_id.");
      return;
    }
    const allianceName = targetAllianceId === settings.alliance.id
      ? (settings.alliance.name || `Alliance ${targetAllianceId}`)
      : await getAllianceName(targetAllianceId);

    const categoryKey = interaction.options.getString("category");
    const { checks, label } = CATEGORIES[categoryKey];

    await interaction.editReply(`⏳ Auditing **${allianceName}** members, this may take a minute...`);

    let auditResults;
    try {
      auditResults = await auditAllMembers(targetAllianceId, settings, { checks });
    } catch (error) {
      await interaction.editReply(`❌ Couldn't fetch alliance nations: ${error.message}`);
      return;
    }

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "TUN Audit Bot";
    workbook.created = new Date();

    // --- Summary sheet: one row per nation ---
    const summary = workbook.addWorksheet("Summary");
    summary.columns = [
      { header: "Nation", key: "nation", width: 28 },
      { header: "Leader", key: "leader", width: 20 },
      { header: "Cities", key: "cities", width: 8 },
      { header: "Score %", key: "score", width: 10 },
      { header: "Grade", key: "grade", width: 18 },
      { header: "Failed Checks", key: "failedCount", width: 14 },
      { header: "Discord (unverified)", key: "discord", width: 22 }
    ];
    summary.getRow(1).font = { bold: true };

    for (const entry of auditResults) {
      const failedCount = entry.results.filter((r) => !r.passed).length;
      const row = summary.addRow({
        nation: entry.nation.nation_name,
        leader: entry.nation.leader_name,
        cities: entry.nation.num_cities,
        score: entry.percent,
        grade: entry.grade.label,
        failedCount,
        discord: entry.nation.discord || ""
      });
      row.getCell("grade").fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: GRADE_FILL_COLORS[entry.grade.label] || "FFFFFFFF" }
      };
    }

    // --- Failed Checks Detail sheet: one row per failed check ---
    const detail = workbook.addWorksheet("Failed Checks Detail");
    detail.columns = [
      { header: "Nation", key: "nation", width: 28 },
      { header: "Check", key: "check", width: 28 },
      { header: "Detail", key: "detail", width: 60 },
      { header: "Recommendation", key: "recommendation", width: 60 }
    ];
    detail.getRow(1).font = { bold: true };

    for (const entry of auditResults) {
      for (const r of entry.results) {
        if (!r.passed) {
          detail.addRow({
            nation: entry.nation.nation_name,
            check: r.label,
            detail: r.detail,
            recommendation: r.recommendation
          });
        }
      }
    }

    const fileName = `alliance-audit-${categoryKey}-${Date.now()}.xlsx`;
    const filePath = path.join(os.tmpdir(), fileName);

    try {
      await workbook.xlsx.writeFile(filePath);
      const attachment = new AttachmentBuilder(filePath, { name: `${label.replace(/\s+/g, "_")}_Audit.xlsx` });
      await interaction.followUp({
        content: `✅ Exported **${label}** audit for **${allianceName}** (**${auditResults.length}** members).`,
        files: [attachment]
      });
    } catch (error) {
      await interaction.followUp(`❌ Couldn't build the spreadsheet: ${error.message}`);
    } finally {
      fs.unlink(filePath, () => {}); // best-effort cleanup, ignore errors
    }
  }
};
