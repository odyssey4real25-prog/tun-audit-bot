const {
  SlashCommandBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  MessageFlags
} = require("discord.js");
const { getAllianceNations, verifyPersonalApiKey } = require("../pnw");
const { findMyNation } = require("../audit/findMyNation");
const { encrypt } = require("../crypto");
const { getSettings, saveSettings } = require("../db");

const MODAL_CUSTOM_ID = "link_api_key_modal";
const INPUT_CUSTOM_ID = "api_key_input";

module.exports = {
  minTier: "member",
  modalCustomId: MODAL_CUSTOM_ID,
  data: new SlashCommandBuilder()
    .setName("link_api_key")
    .setDescription("Securely link your personal PnW API key (opens a private form — never shown in chat)."),

  // This just opens the form. The actual key is handled in handleModalSubmit
  // below, once Discord sends us the private submission.
  async execute(interaction) {
    const modal = new ModalBuilder().setCustomId(MODAL_CUSTOM_ID).setTitle("Link Your PnW API Key");

    const input = new TextInputBuilder()
      .setCustomId(INPUT_CUSTOM_ID)
      .setLabel("Your Politics & War API Key")
      .setStyle(TextInputStyle.Short)
      .setPlaceholder("Find this at politicsandwar.com/account/ -> API tab")
      .setRequired(true);

    modal.addComponents(new ActionRowBuilder().addComponents(input));

    await interaction.showModal(modal);
  },

  async handleModalSubmit(interaction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const apiKey = interaction.fields.getTextInputValue(INPUT_CUSTOM_ID).trim();
    const settings = getSettings(interaction.guildId);

    if (!settings.alliance.id) {
      await interaction.editReply("❌ No alliance registered yet for this server — ask an admin to run /set_alliance first.");
      return;
    }

    let members;
    try {
      const result = await getAllianceNations(settings.alliance.id);
      members = result.members;
    } catch (error) {
      await interaction.editReply(`❌ Couldn't verify alliance membership right now: ${error.message}`);
      return;
    }

    const nation = findMyNation(members, interaction.user);
    if (!nation) {
      await interaction.editReply(
        "❌ Couldn't find a nation linked to your Discord account.\n" +
          "On the Politics & War website, make sure your nation's Discord field/verification matches your Discord username " +
          "(`Edit Nation` → Discord), then try again."
      );
      return;
    }

    try {
      await verifyPersonalApiKey(apiKey);
    } catch (error) {
      await interaction.editReply(`❌ That key didn't work: ${error.message}\nDouble-check you copied it correctly.`);
      return;
    }

    settings.linkedApiKeys[String(nation.id)] = {
      encrypted: encrypt(apiKey),
      linkedAt: new Date().toISOString()
    };
    saveSettings(interaction.guildId, settings);

    await interaction.editReply(
      `✅ Your API key has been verified and securely saved for **${nation.nation_name}**.\n\n` +
        "Heads up: this alone doesn't enable any automatic deposits yet — that also requires the alliance to get " +
        "separate approval from Politics & War's staff for bank mutation access. You'll be notified before anything " +
        "real happens with it. You can remove it anytime with `/unlink_api_key`."
    );
  }
};
