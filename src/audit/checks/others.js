// others.js
//
// Checks 12, 13, 14, 16, 17, 18 from the spec (Section 7, Others).
// Check 15 isn't here on purpose — it's missing from the original spec too.
//
// Two simplifications worth knowing about:
// 1. Check 14 (Resource Control) compares current stockpiles directly
//    against your /set_warchest_policy targets. The spec's "Upkeep Buffer"
//    isn't folded in automatically yet — that requires modeling a nation's
//    full daily resource consumption (food, gas, munitions, steel, etc. for
//    every unit and building), which we haven't built. Easy to add later.
// 2. Check 17 (Power & Upkeep) only checks cash upkeep for soldiers, tanks,
//    aircraft, and ships (using Politics & War's official daily upkeep
//    rates), not food/gas/munitions upkeep. Can be expanded the same way.

const RESOURCE_FIELDS = [
  "money", "food", "coal", "oil", "uranium", "lead", "iron", "bauxite", "gasoline", "munitions", "steel", "aluminum"
];

// Official peacetime daily upkeep costs (politicsandwar.fandom.com/wiki/War)
const DAILY_UPKEEP = {
  soldiers: 1.25,
  tanks: 50,
  aircraft: 500,
  ships: 3375
};

// Official military capacity per building (politicsandwar.fandom.com/wiki/Military_Improvements)
const CAPACITY_PER_BUILDING = {
  barracks: 3000,
  factory: 250,
  hangar: 15,
  drydock: 5
};

function activeWarCount(wars) {
  // turnsleft > 0 means the war is still ongoing; 0 or negative means it ended.
  return wars.filter((w) => w.turnsleft > 0).length;
}

const checks = [
  {
    key: "check12_colour_bloc",
    label: "Alliance Colour Bloc",
    recommendation: "Change your nation's color to match the alliance's bloc color.",
    run(nation, settings) {
      const allianceColour = (settings.alliance.colour || "").toLowerCase();
      const nationColour = (nation.color || "").toLowerCase();
      if (!allianceColour) {
        return { passed: true, detail: "No alliance colour configured yet — skipping." };
      }
      if (nationColour === "beige") {
        return { passed: true, detail: "Nation is beige (post-war protection) — exempt until it expires." };
      }
      const passed = nationColour === allianceColour;
      return {
        passed,
        detail: passed
          ? `Nation is on bloc colour (${nation.color}).`
          : `Nation is ${nation.color}, expected ${settings.alliance.colour}.`
      };
    }
  },
  {
    key: "check13_raid_requirement",
    label: "Raid Requirement",
    recommendation: "Declare offensive wars until you meet your alliance's raid requirement.",
    run(nation, settings) {
      const { maxCityTier, requiredOffensiveWars } = settings.raidPolicy;
      if (nation.num_cities > maxCityTier) {
        return { passed: true, detail: `Nations above ${maxCityTier} cities are exempt from the raid requirement.` };
      }
      const activeOffensive = activeWarCount(nation.offensive_wars);
      const passed = activeOffensive >= requiredOffensiveWars;
      return {
        passed,
        detail: `${activeOffensive}/${requiredOffensiveWars} active offensive wars.`
      };
    }
  },
  {
    key: "check14_resource_control",
    label: "Resource Control",
    recommendation: "Spend down the listed resources to stay within your alliance's warchest policy.",
    run(nation, settings) {
      // Warchest targets are set PER CITY (/set_warchest_policy), so the
      // actual requirement for this nation is per-city amount × city count.
      const violations = [];
      for (const resource of RESOURCE_FIELDS) {
        const perCity = settings.warchestPolicy[resource];
        if (perCity === undefined || perCity === null) continue; // not tracked
        const required = perCity * nation.num_cities;
        if (nation[resource] > required) {
          violations.push(
            `${resource}: ${nation[resource].toLocaleString()} > ${required.toLocaleString()} (${perCity.toLocaleString()}/city × ${nation.num_cities} cities)`
          );
        }
      }
      return {
        passed: violations.length === 0,
        detail: violations.length === 0 ? "All tracked resources within policy." : violations.join("; ")
      };
    }
  },
  {
    key: "check16_activity",
    label: "Activity Check",
    recommendation: "Log in and take an action in-game.",
    run(nation, settings) {
      const lastActive = new Date(nation.last_active);
      const hoursSince = (Date.now() - lastActive.getTime()) / (1000 * 60 * 60);
      const limit = settings.activityLimitHours;
      const passed = hoursSince <= limit;
      return {
        passed,
        detail: `Last active ${hoursSince.toFixed(1)} hours ago (limit: ${limit} hours).`
      };
    }
  },
  {
    key: "check17_power_upkeep",
    label: "Power & Upkeep",
    recommendation: "Power the listed cities, and/or earn enough money to cover at least 1 day of military upkeep.",
    run(nation) {
      const unpowered = nation.cities.filter((c) => !c.powered).map((c) => c.name);

      const dailyCost =
        nation.soldiers * DAILY_UPKEEP.soldiers +
        nation.tanks * DAILY_UPKEEP.tanks +
        nation.aircraft * DAILY_UPKEEP.aircraft +
        nation.ships * DAILY_UPKEEP.ships;

      const hasUpkeep = nation.money >= dailyCost;

      const problems = [];
      if (unpowered.length > 0) problems.push(`Unpowered: ${unpowered.join(", ")}`);
      if (!hasUpkeep) problems.push(`Money $${nation.money.toLocaleString()} < 1 day upkeep $${dailyCost.toLocaleString()}`);

      return {
        passed: problems.length === 0,
        detail: problems.length === 0 ? "All cities powered, at least 1 day of upkeep available." : problems.join("; ")
      };
    }
  },
  {
    key: "check18_military_fill",
    label: "Military Fill Check",
    recommendation: "Train more units in the listed categories to use your full capacity.",
    run(nation) {
      const totals = { barracks: 0, factory: 0, hangar: 0, drydock: 0 };
      for (const city of nation.cities) {
        totals.barracks += city.barracks;
        totals.factory += city.factory;
        totals.hangar += city.hangar;
        totals.drydock += city.drydock;
      }

      const capacity = {
        soldiers: totals.barracks * CAPACITY_PER_BUILDING.barracks,
        tanks: totals.factory * CAPACITY_PER_BUILDING.factory,
        aircraft: totals.hangar * CAPACITY_PER_BUILDING.hangar,
        ships: totals.drydock * CAPACITY_PER_BUILDING.drydock
      };

      const fillPercent = (current, max) => (max === 0 ? 100 : Math.round((current / max) * 1000) / 10);

      const percents = {
        soldiers: fillPercent(nation.soldiers, capacity.soldiers),
        tanks: fillPercent(nation.tanks, capacity.tanks),
        aircraft: fillPercent(nation.aircraft, capacity.aircraft),
        ships: fillPercent(nation.ships, capacity.ships)
      };

      const passed = Object.values(percents).every((p) => p >= 99.9);

      const detail = `Soldiers ${percents.soldiers}%, Tanks ${percents.tanks}%, Aircraft ${percents.aircraft}%, Ships ${percents.ships}%`;

      return { passed, detail };
    }
  },
  {
    key: "check19_map_usage",
    label: "MAP Usage",
    recommendation: "Use your Military Action Points (MAP) to launch attacks instead of letting them sit at the cap.",
    run(nation) {
      const fullWars = nation.offensive_wars
        .filter((w) => w.turnsleft > 0 && w.att_points >= 12)
        .map((w) => `War #${w.id} (${w.att_points}/12 MAP)`);
      return {
        passed: fullWars.length === 0,
        detail: fullWars.length === 0 ? "No active offensive wars have MAP sitting at the cap." : fullWars.join("; ")
      };
    }
  },
  {
    key: "check20_spy_count",
    label: "Spy Count",
    recommendation: "Buy spies daily until you're back at your nation's spy cap.",
    run(nation) {
      const cap = nation.central_intelligence_agency ? 60 : 50;
      const passed = nation.spies >= cap;
      return {
        passed,
        detail: passed ? `Spies are full (${nation.spies}/${cap}).` : `Spies are below cap (${nation.spies}/${cap}).`
      };
    }
  }
];

module.exports = { checks };
