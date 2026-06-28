// pnw.js
//
// This file is our "phone line" to the Politics & War game servers.
// Politics & War uses a system called GraphQL — instead of many different
// web addresses for different data, there's ONE address, and you send it
// a "query" describing exactly what fields you want back.
//
// Every field below has been tested against the live API and confirmed
// to work (last confirmed 2026-06-21). If PnW ever renames a field, the
// API's error message will say exactly which one — easy to spot and fix.

// Using Node's own built-in fetch (Node 18+) instead of the node-fetch
// package — it's more reliable on Windows for back-to-back HTTPS requests.

const PNW_API_URL = "https://api.politicsandwar.com/graphql";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function queryPNW(query, variables = {}, attempt = 1) {
  const apiKey = process.env.PNW_API_KEY;
  if (!apiKey) {
    throw new Error("Missing PNW_API_KEY in your .env file.");
  }

  let response;
  try {
    response = await fetch(`${PNW_API_URL}?api_key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, variables })
    });
  } catch (networkError) {
    // A real network/TLS-level hiccup (not a GraphQL error). Retry a
    // couple of times with a short pause before giving up — this kind of
    // blip is usually gone on the next attempt.
    if (attempt < 3) {
      await sleep(attempt * 1000);
      return queryPNW(query, variables, attempt + 1);
    }
    throw new Error(`Network error talking to the PnW API after ${attempt} attempts: ${networkError.message}`);
  }

  const json = await response.json();

  if (json.errors && json.errors.length > 0) {
    // GraphQL errors are usually very specific, e.g.
    // "Cannot query field 'xyz' on type 'Nation'."
    const messages = json.errors.map((e) => e.message).join(" | ");
    throw new Error(`PnW API error: ${messages}`);
  }

  return json.data;
}

const NATION_QUERY = `
  query GetNation($id: [Int]) {
    nations(id: $id, first: 1) {
      data {
        id
        nation_name
        leader_name
        date
        continent
        alliance_id
        alliance_position
        color
        score
        num_cities
        last_active
        vacation_mode_turns
        soldiers
        tanks
        aircraft
        ships
        green_technologies
        mass_irrigation
        recycling_initiative
        activity_center
        center_for_civil_engineering
        arable_land_agency
        research_and_development_center
        projects
        wars_won
        wars_lost
        discord
        discord_id
        spies
        central_intelligence_agency
        money
        food
        coal
        oil
        uranium
        lead
        iron
        bauxite
        gasoline
        munitions
        steel
        aluminum
        offensive_wars {
          id
          turnsleft
          att_points
        }
        defensive_wars {
          id
          turnsleft
        }
        cities {
          id
          name
          infrastructure
          land
          powered
          coal_power
          oil_power
          nuclear_power
          wind_power
          coal_mine
          oil_well
          iron_mine
          bauxite_mine
          lead_mine
          uranium_mine
          farm
          oil_refinery
          steel_mill
          aluminum_refinery
          munitions_factory
          police_station
          hospital
          recycling_center
          subway
          supermarket
          bank
          shopping_mall
          stadium
          barracks
          factory
          hangar
          drydock
        }
      }
    }
  }
`;

async function getNation(nationId) {
  const data = await queryPNW(NATION_QUERY, { id: [nationId] });
  const nation = data?.nations?.data?.[0];
  if (!nation) {
    throw new Error(`No nation found with ID ${nationId}. Double-check the ID.`);
  }

  // Sort cities by ID ascending — in Politics & War, city IDs are handed out
  // in the order cities are bought, so this gives us "city #1, #2, #3..."
  // which several audit checks (like the infrastructure cap) depend on.
  nation.cities = [...nation.cities].sort((a, b) => Number(a.id) - Number(b.id));

  return nation;
}

// Same fields as getNation, but for a whole alliance at once, handling
// pagination (PnW returns results in pages, similar to a paginated list
// on a website — we keep asking for "the next page" until there isn't one).
const ALLIANCE_NATIONS_QUERY = `
  query GetAllianceNations($allianceId: [Int], $page: Int) {
    nations(alliance_id: $allianceId, first: 50, page: $page) {
      paginatorInfo {
        hasMorePages
        currentPage
      }
      data {
        id
        nation_name
        leader_name
        date
        continent
        alliance_id
        alliance_position
        color
        score
        num_cities
        last_active
        vacation_mode_turns
        soldiers
        tanks
        aircraft
        ships
        green_technologies
        mass_irrigation
        recycling_initiative
        activity_center
        center_for_civil_engineering
        arable_land_agency
        research_and_development_center
        projects
        wars_won
        wars_lost
        discord
        discord_id
        spies
        central_intelligence_agency
        money
        food
        coal
        oil
        uranium
        lead
        iron
        bauxite
        gasoline
        munitions
        steel
        aluminum
        offensive_wars {
          id
          turnsleft
          att_points
        }
        defensive_wars {
          id
          turnsleft
        }
        cities {
          id
          name
          infrastructure
          land
          powered
          coal_power
          oil_power
          nuclear_power
          wind_power
          coal_mine
          oil_well
          iron_mine
          bauxite_mine
          lead_mine
          uranium_mine
          farm
          oil_refinery
          steel_mill
          aluminum_refinery
          munitions_factory
          police_station
          hospital
          recycling_center
          subway
          supermarket
          bank
          shopping_mall
          stadium
          barracks
          factory
          hangar
          drydock
        }
      }
    }
  }
`;

async function getAllianceNations(allianceId) {
  const allNations = [];
  let page = 1;
  let hasMorePages = true;

  while (hasMorePages) {
    const data = await queryPNW(ALLIANCE_NATIONS_QUERY, { allianceId: [allianceId], page });
    const result = data?.nations;
    if (!result) break;

    for (const nation of result.data) {
      nation.cities = [...nation.cities].sort((a, b) => Number(a.id) - Number(b.id));
      allNations.push(nation);
    }

    hasMorePages = result.paginatorInfo?.hasMorePages ?? false;
    page += 1;
  }

  // Applicants aren't accepted members yet, so they're excluded from audits.
  const members = allNations.filter((n) => (n.alliance_position || "").toUpperCase() !== "APPLICANT");

  return { members, applicantCount: allNations.length - members.length, totalFetched: allNations.length };
}

// Looks up a nation's ID by name. Used when someone types a nation name
// instead of an ID/link in a slash command.
const NATION_BY_NAME_QUERY = `
  query FindNationByName($name: [String]) {
    nations(nation_name: $name, first: 5) {
      data {
        id
        nation_name
      }
    }
  }
`;

function titleCase(text) {
  return text.replace(/\w\S*/g, (word) => word[0].toUpperCase() + word.slice(1).toLowerCase());
}

async function findNationIdByName(name) {
  // We can't be sure the PnW API's name filter ignores case, so we try a
  // few common capitalizations ourselves until one matches.
  const variants = [...new Set([name, name.toUpperCase(), name.toLowerCase(), titleCase(name)])];

  for (const variant of variants) {
    const data = await queryPNW(NATION_BY_NAME_QUERY, { name: [variant] });
    const match = data?.nations?.data?.[0];
    if (match) return Number(match.id);
  }

  return null;
}

// Accepts whatever someone typed into a "nation" option — a plain ID
// (e.g. "713016"), a profile link (e.g. "https://politicsandwar.com/nation/id=713016"),
// or a nation name (e.g. "CITADEL OF REALITY") — and figures out the nation ID.
async function resolveNationId(input) {
  const trimmed = String(input).trim();

  const linkMatch = trimmed.match(/id=(\d+)/);
  if (linkMatch) return Number(linkMatch[1]);

  if (/^\d+$/.test(trimmed)) return Number(trimmed);

  const id = await findNationIdByName(trimmed);
  if (!id) {
    throw new Error(
      `Couldn't find a nation named "${trimmed}". Check the spelling/capitalization, or try their nation ID or profile link instead.`
    );
  }
  return id;
}

// True if a nation is NOT currently in Vacation Mode. Used to exclude VM
// nations from audits, auto-DMs, and scheduled reports — they're paused,
// not non-compliant.
function isActiveMember(nation) {
  return !(nation.vacation_mode_turns > 0);
}

// Confirms a personal API key (submitted by a member, not our bot's own
// key) actually authenticates against the PnW API. This only proves the
// key is valid and active — it can't prove it belongs to a specific
// nation, since public nation data is readable with any valid key. True
// ownership is enforced by PnW's own backend at the moment a deposit is
// actually attempted (which additionally requires a separate whitelisted
// bot key from PnW staff — see README).
async function verifyPersonalApiKey(apiKey) {
  const response = await fetch(`${PNW_API_URL}?api_key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: "{ nations(first: 1) { data { id } } }" })
  });
  const json = await response.json();
  if (json.errors && json.errors.length > 0) {
    throw new Error(json.errors.map((e) => e.message).join(" | "));
  }
  return true;
}

module.exports = { queryPNW, getNation, getAllianceNations, resolveNationId, isActiveMember, verifyPersonalApiKey };
