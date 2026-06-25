// resolveDiscordUser.js
//
// A PnW nation can have a Discord account linked two ways:
//   - discord_id: a verified account ID — reliable, but often null if the
//     player never went through Discord verification on the PnW website.
//   - discord: a free-text username the player typed into their nation
//     settings — usually present, but not verified, so it could be a typo
//     or out of date.
//
// We try the verified ID first, and only fall back to searching the
// server's members by username if that's not available.

async function resolveDiscordUser(client, guild, nation) {
  if (nation.discord_id) {
    try {
      return await client.users.fetch(String(nation.discord_id));
    } catch (error) {
      // Fall through to the username search below.
    }
  }

  if (nation.discord) {
    try {
      // guild.members.search() asks Discord directly for matching members —
      // it doesn't require fetching/caching the entire member list.
      const results = await guild.members.search({ query: nation.discord, limit: 5 });
      const exactMatch = results.find((m) => m.user.username.toLowerCase() === nation.discord.toLowerCase());
      if (exactMatch) return exactMatch.user;
      if (results.size === 1) return results.first().user;
    } catch (error) {
      // Fall through to returning null below.
    }
  }

  return null;
}

// Same logic as resolveDiscordUser, but returns a GuildMember instead of a
// User — needed for anything that manages roles (member.roles.add/remove),
// since roles only exist in the context of a specific server membership.
async function resolveGuildMember(guild, nation) {
  if (nation.discord_id) {
    try {
      return await guild.members.fetch(String(nation.discord_id));
    } catch (error) {
      // Fall through to the username search below.
    }
  }

  if (nation.discord) {
    try {
      const results = await guild.members.search({ query: nation.discord, limit: 5 });
      const exactMatch = results.find((m) => m.user.username.toLowerCase() === nation.discord.toLowerCase());
      if (exactMatch) return exactMatch;
      if (results.size === 1) return results.first();
    } catch (error) {
      // Fall through to returning null below.
    }
  }

  return null;
}

module.exports = { resolveDiscordUser, resolveGuildMember };
