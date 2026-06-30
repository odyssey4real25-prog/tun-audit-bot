// unscRotation.js
//
// Handles one full rotation: removes the role from the outgoing term,
// selects a new set of eligible members, assigns them the role, and
// posts an announcement in the configured channel.

const { EmbedBuilder } = require("discord.js");
const { getAllianceNations, isActiveMember } = require("../pnw");
const { resolveGuildMember } = require("./resolveDiscordUser");

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Shuffles an array fairly (Fisher-Yates) so selection among equally
// eligible members isn't biased toward whoever the API happens to list first.
function shuffle(array) {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// Finds nations eligible for a new term, applying all 4 rules from the
// spec. Returns BOTH the eligible list and the reasons anyone was excluded,
// so a preview/report can show why.
async function findEligibleNations(guild, settings, members) {
  const config = settings.unscRotation;
  const eligible = [];
  const excluded = []; // { nation, reason }

  for (const nation of members) {
    if (!isActiveMember(nation)) {
      excluded.push({ nation, reason: "In Vacation Mode" });
      continue;
    }

    if (!nation.discord && !nation.discord_id) {
      excluded.push({ nation, reason: "No Discord linked on PnW" });
      continue;
    }

    const member = await resolveGuildMember(guild, nation);
    if (!member) {
      excluded.push({ nation, reason: "Discord account not found in this server" });
      continue;
    }

    if (config.permanentRoleId && member.roles.cache.has(config.permanentRoleId)) {
      excluded.push({ nation, reason: "Has the Permanent UNSC Member role (always excluded)" });
      continue;
    }

    // Real alliance seniority (days as a member of THIS alliance), confirmed
    // available directly from the API — shown publicly on every nation's page.
    const seniorityDays = nation.alliance_seniority ?? 0;
    if (seniorityDays < config.minSeniorityDays) {
      excluded.push({ nation, reason: `Only ${seniorityDays} days alliance seniority (needs ${config.minSeniorityDays}+)` });
      continue;
    }

    eligible.push({ nation, member, seniorityDays });
  }

  return { eligible, excluded };
}

// The actual rotation: roll off the outgoing term's role, pick and seat a
// new term, post the announcement. Returns a summary for logging/replies.
async function runUnscRotation(client, guild, settings) {
  const config = settings.unscRotation;
  const summary = {
    outgoingRemoved: 0,
    outgoingErrors: 0,
    newlySeated: [],
    eligibleCount: 0,
    excludedCount: 0,
    skippedNoRole: false,
    skippedNoChannel: false,
    skippedNoAlliance: false
  };

  if (!settings.alliance.id) {
    summary.skippedNoAlliance = true;
    return summary;
  }
  if (!config.nonPermanentRoleId) {
    summary.skippedNoRole = true;
    return summary;
  }

  // Step 1: roll the outgoing term out of the role. We re-derive "who
  // currently has it" from the role itself (rather than the saved roster)
  // since that's simpler and self-correcting if anything ever drifted.
  const role = guild.roles.cache.get(config.nonPermanentRoleId);
  if (role) {
    for (const member of role.members.values()) {
      try {
        await member.roles.remove(config.nonPermanentRoleId);
        summary.outgoingRemoved += 1;
      } catch (error) {
        summary.outgoingErrors += 1;
      }
      await sleep(300);
    }
  }

  // Step 2: fetch members and select a new term.
  const { members } = await getAllianceNations(settings.alliance.id);
  const { eligible, excluded } = await findEligibleNations(guild, settings, members);
  summary.eligibleCount = eligible.length;
  summary.excludedCount = excluded.length;

  const selected = shuffle(eligible).slice(0, config.seatCount);

  // Step 3: assign the role to the new term.
  for (const { nation, member } of selected) {
    try {
      await member.roles.add(config.nonPermanentRoleId);
      summary.newlySeated.push({ nation, member });
    } catch (error) {
      summary.outgoingErrors += 1; // reusing the same error counter for simplicity
    }
    await sleep(300);
  }

  // Step 4: save the new term's roster and post an announcement.
  config.currentTermNationIds = selected.map(({ nation }) => Number(nation.id));
  config.termStartedAt = new Date().toISOString();

  if (config.announceChannelId) {
    const channel = guild.channels.cache.get(config.announceChannelId);
    if (channel) {
      const lines = selected.map(
        ({ nation, member }) => `**${nation.nation_name}** — <@${member.id}> (${nation.alliance_seniority} days seniority)`
      );

      const pingContent = config.pingRoleId ? `<@&${config.pingRoleId}>` : null;

      const embed = new EmbedBuilder()
        .setTitle("🪐 New Non-Permanent UNSC Members")
        .setColor(0x3498db)
        .setDescription(
          (lines.join("\n") || "No eligible members were found this term.") +
            `\n\nTerm length: ${config.intervalDays} days.`
        )
        .setFooter({ text: `${summary.eligibleCount} eligible, ${summary.excludedCount} excluded this round.` });

      try {
        await channel.send({ content: pingContent, embeds: [embed] });
      } catch (error) {
        // Non-fatal — the rotation itself still succeeded even if the announcement failed to post.
      }
    } else {
      summary.skippedNoChannel = true;
    }
  } else {
    summary.skippedNoChannel = true;
  }

  return summary;
}

module.exports = { runUnscRotation, findEligibleNations };
