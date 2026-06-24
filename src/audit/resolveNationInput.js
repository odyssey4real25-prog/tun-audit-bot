// resolveNationInput.js
//
// Extends nation lookup so commands also accept a Discord mention —
// e.g. typing "@" into the nation field pops up Discord's own user
// picker, and choosing someone inserts a real mention like <@123456789>.
// We detect that and reverse-look-up which nation belongs to that person.
// If the input isn't a mention, we fall back to the normal ID/name/link lookup.

const { getAllianceNations, resolveNationId } = require("../pnw");

const MENTION_PATTERN = /^<@!?(\d+)>$/;

function isMention(input) {
  return MENTION_PATTERN.test(input.trim());
}

async function resolveNationIdFromMention(client, settings, input) {
  const match = input.trim().match(MENTION_PATTERN);
  const discordId = match[1];

  if (!settings.alliance.id) {
    throw new Error("No alliance registered yet, so Discord mentions can't be matched to a nation — run /set_alliance first.");
  }

  const { members } = await getAllianceNations(settings.alliance.id);

  const byVerifiedId = members.find((n) => n.discord_id && String(n.discord_id) === discordId);
  if (byVerifiedId) return Number(byVerifiedId.id);

  let username = null;
  try {
    const user = await client.users.fetch(discordId);
    username = user.username;
  } catch (error) {
    // Couldn't fetch that Discord user at all — fall through to the error below.
  }

  if (username) {
    const matches = members.filter((n) => n.discord && n.discord.toLowerCase() === username.toLowerCase());
    if (matches.length === 1) return Number(matches[0].id);
  }

  throw new Error(
    "Couldn't find a nation linked to that Discord account. Ask them to set/verify their Discord on the Politics & War website, " +
      "or provide their nation ID, name, or profile link instead."
  );
}

// Drop-in replacement for resolveNationId that also understands mentions.
// Safe to use anywhere that was already calling resolveNationId.
async function resolveNationInput(client, settings, input) {
  if (isMention(input)) {
    return resolveNationIdFromMention(client, settings, input);
  }
  return resolveNationId(input);
}

module.exports = { isMention, resolveNationIdFromMention, resolveNationInput };
