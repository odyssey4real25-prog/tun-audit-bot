// tiers.js
//
// Single source of truth for the 5 city-count tiers used by /tier_audit
// and the tier-role auto-assignment system. Keeping this in one place
// means both features always agree on what "C1-C5" etc. actually means.

const TIER_RANGES = {
  c1_c5: { min: 1, max: 5, label: "C1-C5" },
  c6_c10: { min: 6, max: 10, label: "C6-C10" },
  c11_c15: { min: 11, max: 15, label: "C11-C15" },
  c16_c19: { min: 16, max: 19, label: "C16-C19" },
  c20_plus: { min: 20, max: Infinity, label: "C20+" }
};

const TIER_CHOICES = [
  { name: "C1-C5", value: "c1_c5" },
  { name: "C6-C10", value: "c6_c10" },
  { name: "C11-C15", value: "c11_c15" },
  { name: "C16-C19", value: "c16_c19" },
  { name: "C20+", value: "c20_plus" }
];

function tierKeyFor(numCities) {
  for (const [key, range] of Object.entries(TIER_RANGES)) {
    if (numCities >= range.min && numCities <= range.max) return key;
  }
  return null;
}

module.exports = { TIER_RANGES, TIER_CHOICES, tierKeyFor };
