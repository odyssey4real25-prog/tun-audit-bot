const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { getAllianceNations, getAllianceName, resolveAllianceId } = require("../pnw");
const { getSettings } = require("../db");

const CONTINENT_NAMES = {
  na: "North America",
  sa: "South America",
  as: "Asia",
  an: "Antarctica",
  eu: "Europe",
  af: "Africa",
  au: "Australia"
};

function continentName(code) {
  return CONTINENT_NAMES[(code || "").toLowerCase()] || code || "Unknown";
}

function ageInDays(dateString) {
  const founded = new Date(dateString);
  return Math.floor((Date.now() - founded.getTime()) / (1000 * 60 * 60 * 24));
}

// Truncates and pads text to a fixed width so columns line up in a
// monospace code block — this is what gives us a real "table" look
// without Discord supporting actual HTML tables.
function col(text, width) {
  const str = String(text);
  const trimmed = str.length > width - 1 ? str.slice(0, width - 2) + "…" : str;
  return trimmed.padEnd(width);
}

const COLUMN_WIDTHS = { nation: 24, leader: 16, cities: 7, age: 8, continent: 14, status: 8 };

function buildHeader() {
  return (
    col("Nation", COLUMN_WIDTHS.nation) +
    col("Leader", COLUMN_WIDTHS.leader) +
    col("Cities", COLUMN_WIDTHS.cities) +
    col("Age", COLUMN_WIDTHS.age) +
    col("Continent", COLUMN_WIDTHS.continent) +
    col("Status", COLUMN_WIDTHS.status)
  );
}

function buildRow(nation) {
  const status = nation.vacation_mode_turns > 0 ? "VM" : "";
  return (
    col(nation.nation_name, COLUMN_WIDTHS.nation) +
    col(nation.leader_name, COLUMN_WIDTHS.leader) +
    col(nation.num_cities, COLUMN_WIDTHS.cities) +
    col(`${ageInDays(nation.date)}d`, COLUMN_WIDTHS.age) +
    col(continentName(nation.continent), COLUMN_WIDTHS.continent) +
    col(status, COLUMN_WIDTHS.status)
  );
}

// Splits rows into code-block-sized chunks (well under Discord's
// 4096-character description limit per embed), repeating the header on
// every page so each page is readable on its own.
function chunkRows(rows, header, maxLength = 3400) {
  const chunks = [];
  let current = header;
  for (const row of rows) {
    if ((current + "\n" + row).length > maxLength) {
      chunks.push(current);
      current = header + "\n" + row;
    } else {
      current += "\n" + row;
    }
  }
  chunks.push(current);
  return chunks;
}

module.exports = {
  minTier: "mentor",
  data: new SlashCommandBuilder()
    .setName("member_list")
    .setDescription("List every alliance member with their leader, age, continent, and VM status.")
    .addStringOption((opt) =>
      opt.setName("alliance").setDescription("List a different alliance by ID, name, or link. Leave blank to use your home alliance.")
    ),

  async execute(interaction) {
    await interaction.deferReply();

    const settings = getSettings(interaction.guildId);
    const allianceInput = interaction.options.getString("alliance");
    let targetAllianceId;
    if (allianceInput) {
      try {
        targetAllianceId = await resolveAllianceId(allianceInput);
      } catch (error) {
        await interaction.editReply(`❌ ${error.message}`);
        return;
      }
    } else {
      targetAllianceId = settings.alliance.id;
    }
    if (!targetAllianceId) {
      await interaction.editReply("❌ No alliance registered yet — run /set_alliance first, or provide an alliance.");
      return;
    }
    const allianceName = targetAllianceId === settings.alliance.id
      ? (settings.alliance.name || `Alliance ${targetAllianceId}`)
      : await getAllianceName(targetAllianceId);

    await interaction.editReply("⏳ Building the member list...");

    let members;
    try {
      const result = await getAllianceNations(targetAllianceId);
      members = [...result.members].sort((a, b) => a.nation_name.localeCompare(b.nation_name));
    } catch (error) {
      await interaction.editReply(`❌ Couldn't fetch alliance nations: ${error.message}`);
      return;
    }

    const header = buildHeader();
    const rows = members.map(buildRow);
    const chunks = chunkRows(rows, header);

    const embeds = chunks.map((chunk, idx) =>
      new EmbedBuilder()
        .setTitle(`Member List — ${allianceName} (Page ${idx + 1}/${chunks.length})`)
        .setColor(0x3498db)
        .setDescription("```\n" + chunk + "\n```")
    );

    // Discord allows max 10 embeds per message — send in batches if there's
    // ever more pages than that (very large alliances).
    const BATCH_SIZE = 10;
    for (let i = 0; i < embeds.length; i += BATCH_SIZE) {
      await interaction.followUp({ embeds: embeds.slice(i, i + BATCH_SIZE) });
    }
  }
};
