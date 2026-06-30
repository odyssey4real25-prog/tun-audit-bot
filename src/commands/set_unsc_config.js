const { SlashCommandBuilder, EmbedBuilder, ChannelType } = require("discord.js");
const { getSettings, saveSettings } = require("../db");

module.exports = {
  minTier: "administrator",
  data: new SlashCommandBuilder()
    .setName("set_unsc_config")
    .setDescription("Configure the rotating council (e.g. Non-Permanent UNSC Members) feature.")
    .addBooleanOption((opt) => opt.setName("enabled").setDescription("Turn the automatic monthly rotation on or off"))
    .addIntegerOption((opt) => opt.setName("seat_count").setDescription("How many seats per term, e.g. 10").setMinValue(1))
    .addIntegerOption((opt) =>
      opt.setName("min_seniority_days").setDescription("Minimum seniority (in days) required to be eligible, e.g. 60").setMinValue(0)
    )
    .addIntegerOption((opt) => opt.setName("interval_days").setDescription("Term length in days, e.g. 30").setMinValue(1))
    .addRoleOption((opt) => opt.setName("non_permanent_role").setDescription("The role given to seated non-permanent members"))
    .addRoleOption((opt) =>
      opt.setName("permanent_role").setDescription("Members with this role are always excluded from selection")
    )
    .addChannelOption((opt) =>
      opt.setName("announce_channel").setDescription("Where to post the rotation announcement").addChannelTypes(ChannelType.GuildText)
    ),

  async execute(interaction) {
    const settings = getSettings(interaction.guildId);
    const config = settings.unscRotation;

    const enabled = interaction.options.getBoolean("enabled");
    const seatCount = interaction.options.getInteger("seat_count");
    const minSeniorityDays = interaction.options.getInteger("min_seniority_days");
    const intervalDays = interaction.options.getInteger("interval_days");
    const nonPermanentRole = interaction.options.getRole("non_permanent_role");
    const permanentRole = interaction.options.getRole("permanent_role");
    const announceChannel = interaction.options.getChannel("announce_channel");

    if (enabled !== null) config.enabled = enabled;
    if (seatCount !== null) config.seatCount = seatCount;
    if (minSeniorityDays !== null) config.minSeniorityDays = minSeniorityDays;
    if (intervalDays !== null) config.intervalDays = intervalDays;
    if (nonPermanentRole) config.nonPermanentRoleId = nonPermanentRole.id;
    if (permanentRole) config.permanentRoleId = permanentRole.id;
    if (announceChannel) config.announceChannelId = announceChannel.id;

    saveSettings(interaction.guildId, settings);

    const embed = new EmbedBuilder()
      .setTitle("UNSC Rotation Config Updated")
      .setColor(config.enabled ? 0x2ecc71 : 0xe74c3c)
      .setDescription(
        `**Enabled**: ${config.enabled ? "Yes" : "No"}\n` +
          `**Seats**: ${config.seatCount}\n` +
          `**Min seniority**: ${config.minSeniorityDays} days\n` +
          `**Term length**: ${config.intervalDays} days\n` +
          `**Non-permanent role**: ${config.nonPermanentRoleId ? `<@&${config.nonPermanentRoleId}>` : "Not set"}\n` +
          `**Permanent role (excluded)**: ${config.permanentRoleId ? `<@&${config.permanentRoleId}>` : "Not set"}\n` +
          `**Announce channel**: ${config.announceChannelId ? `<#${config.announceChannelId}>` : "Not set"}`
      )
      .setFooter({
        text: "Note: 'seniority' here means nation age (days since founding), since Politics & War's API doesn't expose a true alliance-join date."
      });

    await interaction.reply({ embeds: [embed] });
  }
};
