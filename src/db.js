// db.js
//
// This is our "database." Instead of a complicated database server,
// we save one plain text file (in JSON format) per Discord server (guild)
// inside the /data folder. Every time we need to read or change settings,
// we load that file, change it, and save it back.
//
// This keeps things simple and easy to understand for now.

const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "..", "data");

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// The default settings every new server starts with.
function defaultSettings() {
  return {
    alliance: { id: null, name: null, colour: null },
    // MMR now varies by city-count tier, since a 3-city nation and a
    // 25-city nation shouldn't need the same number of military buildings.
    mmr: {
      "C1-C5": { barracks: 0, factory: 0, hangar: 0, drydock: 0 },
      "C6-C10": { barracks: 0, factory: 0, hangar: 0, drydock: 0 },
      "C11-C15": { barracks: 0, factory: 0, hangar: 0, drydock: 0 },
      "C16-C20": { barracks: 0, factory: 0, hangar: 0, drydock: 0 },
      "C21+": { barracks: 0, factory: 0, hangar: 0, drydock: 0 }
    },
    scores: {
      check1_infra_cap: 6,
      check2_equal_infra: 6,
      check3_land_ratio: 6,
      check4_mmr: 8,
      check5_free_slots: 6,
      check6_farm_restriction: 5,
      check7_activity_center: 5,
      check8_civil_arable: 5,
      check9_nuclear_power: 6,
      check10_excess_nuclear: 5,
      check11_project_opportunity: 6,
      check12_colour_bloc: 6,
      check13_raid_requirement: 6,
      check14_resource_control: 8,
      check16_activity: 8,
      check17_power_upkeep: 5,
      check18_military_fill: 9
    },
    passingScore: 75,
    warchestPolicy: {},
    resourcePolicy: { upkeepBufferDays: 5 },
    auditChannelId: null,
    roleMap: {}, // { "discordRoleId": "mentor" | "government" | "administrator" }
    auditHistory: [] // { nationId, nationName, date, score, pass, command }
  };
}

function filePathFor(guildId) {
  return path.join(DATA_DIR, `${guildId}.json`);
}

function getSettings(guildId) {
  const file = filePathFor(guildId);
  if (!fs.existsSync(file)) {
    const fresh = defaultSettings();
    fs.writeFileSync(file, JSON.stringify(fresh, null, 2));
    return fresh;
  }
  const raw = fs.readFileSync(file, "utf8");
  const settings = JSON.parse(raw);

  // Migration: older versions stored one flat MMR instead of 5 tiers.
  // If we spot the old shape, carry that value into every tier as a
  // starting point — you'll likely want to adjust the tiers individually
  // with /set_mmr afterward.
  if (settings.mmr && !settings.mmr["C1-C5"]) {
    const oldFlat = settings.mmr;
    settings.mmr = {
      "C1-C5": { ...oldFlat },
      "C6-C10": { ...oldFlat },
      "C11-C15": { ...oldFlat },
      "C16-C20": { ...oldFlat },
      "C21+": { ...oldFlat }
    };
    saveSettings(guildId, settings);
  }

  return settings;
}

function saveSettings(guildId, settings) {
  const file = filePathFor(guildId);
  fs.writeFileSync(file, JSON.stringify(settings, null, 2));
}

module.exports = { getSettings, saveSettings, defaultSettings };
