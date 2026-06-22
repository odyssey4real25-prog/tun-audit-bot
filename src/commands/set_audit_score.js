const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { getSettings, saveSettings } = require("../db");

// This list must match the keys used in db.js -> defaultSettings().scores
const CHECK_CHOICES = [
  { name: "1 - Infrastructure Cap", value: "check1_infra_cap" },
  { name: "2 - Equal Infrastructure", value: "check2_equal_infra" },
  { name: "3 - Land Ratio", value: "check3_land_ratio" },
  { name: "4 - MMR Requirement", value: "check4_mmr" },
  { name: "5 - No Free Building Slots", value: "check5_free_slots" },
  { name: "6 - Farm Restriction", value: "check6_farm_restriction" },
  { name: "7 - Activity Center", value: "check7_activity_center" },
  { name: "8 - Civil Engineering & Arable Land", value: "check8_civil_arable" },
  { name: "9 - Nuclear Power Requirement", value: "check9_nuclear_power" },
  { name: "10 - No Excess Nuclear Plants", value: "check10_excess_nuclear" },
  { name: "11 - Project Opportunity", value: "check11_project_opportunity" },
  { name: "12 - Alliance Colour Bloc", value: "check12_colour_bloc" },
  { name: "13 - Raid Requirement", value: "check13_raid_requirement" },
  { name: "14 - Resource Control", value: "check14_resource_control" },
  { name: "16 - Activity Check", value: "check16_activity" },
  { name: "17 - Power & Upkeep", value: "check17_power_upkeep" },
  { name: "18 - Military Fill Check", value: "check18_military_fill" }
];

module.exports = {
  minTier: "administrator",
  data: new SlashCommandBuilder()
    .setName("set_audit_score")
    .setDescription("Change the point value of one audit check.")
    .addStringOption((opt) => {
      opt.setName("check").setDescription("Which check to change").setRequired(true);
      for (const choice of CHECK_CHOICES) opt.addChoices(choice);
      return opt;
    })
    .addIntegerOption((opt) =>
      opt.setName("points").setDescription("New point value").setMinValue(0).setMaxValue(100).setRequired(true)
    ),

  async execute(interaction) {
    const checkKey = interaction.options.getString("check");
    const points = interaction.options.getInteger("points");

    const settings = getSettings(interaction.guildId);
    settings.scores[checkKey] = points;
    saveSettings(interaction.guildId, settings);

    const total = Object.values(settings.scores).reduce((sum, v) => sum + v, 0);
    const warning = total !== 100 ? `\n⚠️ Heads up: your scores now add up to **${total}**, not 100.` : "";

    const choiceLabel = CHECK_CHOICES.find((c) => c.value === checkKey)?.name ?? checkKey;

    const embed = new EmbedBuilder()
      .setTitle("Audit Score Updated")
      .setColor(0x2ecc71)
      .setDescription(`**${choiceLabel}** is now worth **${points} points**.${warning}`);

    await interaction.reply({ embeds: [embed] });
  }
};
