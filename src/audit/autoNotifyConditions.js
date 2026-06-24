// autoNotifyConditions.js
//
// Each function here checks ONE specific condition against a nation and
// returns either null (condition not met, nothing to say) or a small
// object describing what's wrong — which the embed builder below turns
// into an actual DM.

const { EmbedBuilder } = require("discord.js");

function checkInactivity(nation, settings) {
  const lastActive = new Date(nation.last_active);
  const hoursSince = (Date.now() - lastActive.getTime()) / (1000 * 60 * 60);
  const limit = settings.activityLimitHours;
  if (hoursSince <= limit) return null;
  return { hoursSince: Math.round(hoursSince * 10) / 10, limit };
}

function checkRaidCapacity(nation, settings) {
  const { maxCityTier, requiredOffensiveWars } = settings.raidPolicy;
  if (nation.num_cities > maxCityTier) return null; // exempt

  const activeOffensive = nation.offensive_wars.filter((w) => w.turnsleft > 0).length;
  if (activeOffensive >= requiredOffensiveWars) return null;

  return { activeOffensive, requiredOffensiveWars, maxCityTier };
}

function checkMapFull(nation) {
  const fullWars = nation.offensive_wars.filter((w) => w.turnsleft > 0 && w.att_points >= 12);
  if (fullWars.length === 0) return null;
  return { fullWars };
}

function checkColorBloc(nation, settings) {
  const allianceColour = (settings.alliance.colour || "").toLowerCase();
  if (!allianceColour) return null; // not configured yet, nothing to compare against

  const nationColour = (nation.color || "").toLowerCase();
  if (nationColour === allianceColour) return null;
  if (nationColour === "beige") return null; // post-war protection — leave them alone until it expires

  return { allianceColour: settings.alliance.colour, nationColour: nation.color };
}

function buildInactivityDM(nation, info, allianceName) {
  return new EmbedBuilder()
    .setTitle("⏰ Activity Reminder")
    .setColor(0xf1c40f)
    .setDescription(
      `Hi **${nation.nation_name}**,\n\n` +
        `This is an automated reminder from **${allianceName}**. Your nation has been inactive for ` +
        `**${info.hoursSince} hours** (the alliance's limit is ${info.limit} hours).\n\n` +
        "Please log in and take an action in-game when you can."
    )
    .setFooter({ text: "This is an automated message — reach out to a mentor or officer if you have questions." });
}

function buildRaidDM(nation, info, allianceName) {
  return new EmbedBuilder()
    .setTitle("⚔️ Raid Capacity Reminder")
    .setColor(0xf1c40f)
    .setDescription(
      `Hi **${nation.nation_name}**,\n\n` +
        `This is an automated reminder from **${allianceName}**. You currently have ` +
        `**${info.activeOffensive}/${info.requiredOffensiveWars}** active offensive wars ` +
        `(nations with ${info.maxCityTier} cities or fewer need at least ${info.requiredOffensiveWars}).\n\n` +
        "For your tier, raiding is usually the most effective way to earn money and resources — " +
        "consider declaring more offensive wars on weaker, undefended nations."
    )
    .setFooter({ text: "This is an automated message — reach out to a mentor or officer if you have questions." });
}

function buildMapDM(nation, info, allianceName) {
  const lines = info.fullWars.map((w) => `War #${w.id} — ${w.att_points}/12 MAP`);
  return new EmbedBuilder()
    .setTitle("🎯 Unused MAP Reminder")
    .setColor(0xf1c40f)
    .setDescription(
      `Hi **${nation.nation_name}**,\n\n` +
        `This is an automated reminder from **${allianceName}**. You have Military Action Points sitting at the cap in:\n\n` +
        lines.join("\n") +
        "\n\nMAP is used to launch attacks — use it before it goes to waste!"
    )
    .setFooter({ text: "This is an automated message — reach out to a mentor or officer if you have questions." });
}

function buildColorBlocDM(nation, info, allianceName) {
  return new EmbedBuilder()
    .setTitle("🎨 Bloc Colour Reminder")
    .setColor(0xf1c40f)
    .setDescription(
      `Hi **${nation.nation_name}**,\n\n` +
        `This is an automated reminder from **${allianceName}**. Your nation's colour is currently ` +
        `**${info.nationColour}**, but the alliance bloc colour is **${info.allianceColour}**.\n\n` +
        "Please switch your nation's colour to match the bloc — this keeps you covered by the alliance's shared colour trade bonus."
    )
    .setFooter({ text: "This is an automated message — reach out to a mentor or officer if you have questions." });
}

const CONDITIONS = [
  { key: "inactivity", check: checkInactivity, buildDM: buildInactivityDM },
  { key: "raid_capacity", check: checkRaidCapacity, buildDM: buildRaidDM },
  { key: "map_full", check: checkMapFull, buildDM: buildMapDM },
  { key: "color_bloc", check: checkColorBloc, buildDM: buildColorBlocDM }
];

module.exports = { CONDITIONS };
