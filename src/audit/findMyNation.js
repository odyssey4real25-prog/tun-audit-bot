// findMyNation.js
//
// Finds the nation belonging to a specific Discord user, using whatever
// Discord info PnW has on file for each nation — verified ID first, then
// falling back to username matching. Only works if that nation's Discord
// field/verification on the PnW website actually matches their account.

function findMyNation(members, discordUser) {
  const byVerifiedId = members.find((n) => n.discord_id && String(n.discord_id) === discordUser.id);
  if (byVerifiedId) return byVerifiedId;

  const byUsername = members.filter(
    (n) => n.discord && n.discord.toLowerCase() === discordUser.username.toLowerCase()
  );
  if (byUsername.length === 1) return byUsername[0];

  return null;
}

module.exports = { findMyNation };
