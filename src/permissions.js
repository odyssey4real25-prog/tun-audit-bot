// permissions.js
//
// This figures out a person's "tier": member, mentor, government, or administrator.
// - Administrator tier = anyone with Discord's own "Administrator" permission
//   on that server, OR a role that's been mapped to "administrator" with /set_role.
// - Mentor / Government tiers = roles that an admin has mapped using /set_role.
// - Everyone else = "member" (the default, lowest tier).

const { PermissionsBitField } = require("discord.js");

const TIER_RANK = {
  member: 0,
  mentor: 1,
  government: 2,
  administrator: 3
};

function getMemberTier(guildMember, settings) {
  if (guildMember.permissions.has(PermissionsBitField.Flags.Administrator)) {
    return "administrator";
  }

  const roleMap = settings.roleMap || {};
  let bestTier = "member";

  for (const role of guildMember.roles.cache.values()) {
    const mappedTier = roleMap[role.id];
    if (mappedTier && TIER_RANK[mappedTier] > TIER_RANK[bestTier]) {
      bestTier = mappedTier;
    }
  }

  return bestTier;
}

// Returns true if "tier" is at least as powerful as "minimumTier"
function meetsTier(tier, minimumTier) {
  return TIER_RANK[tier] >= TIER_RANK[minimumTier];
}

module.exports = { getMemberTier, meetsTier, TIER_RANK };
