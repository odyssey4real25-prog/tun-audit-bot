// infrastructureLand.js
//
// Each function here is one "check" from the spec (Section 7, Infrastructure & Land).
// Every check function gets the nation's data + the server's settings, and must
// return: { passed: true/false, detail: "explanation text" }
//
// A small tolerance (0.01) is used when comparing decimal numbers, since
// the game sometimes stores infrastructure with tiny rounding differences.

function infraCapFor(cityIndex) {
  // cityIndex is 1-based (city #1, #2, #3...)
  if (cityIndex <= 14) return 1300;
  if (cityIndex <= 19) return 1500;
  return 2000;
}

const checks = [
  {
    key: "check1_infra_cap",
    label: "Infrastructure Cap",
    recommendation: "Lower infrastructure in the listed cities to stay within the cap for their city number.",
    run(nation) {
      const violations = [];
      nation.cities.forEach((city, idx) => {
        const cap = infraCapFor(idx + 1);
        if (city.infrastructure > cap + 0.01) {
          violations.push(`${city.name} (C${idx + 1}): ${city.infrastructure} > cap ${cap}`);
        }
      });
      return {
        passed: violations.length === 0,
        detail: violations.length === 0 ? "All cities within their infrastructure cap." : violations.join("; ")
      };
    }
  },
  {
    key: "check2_equal_infra",
    label: "Equal Infrastructure",
    recommendation: "Buy or sell infrastructure so every city has the same amount.",
    run(nation) {
      const infraValues = nation.cities.map((c) => c.infrastructure);
      const max = Math.max(...infraValues);
      const min = Math.min(...infraValues);
      const equal = max - min <= 0.01;
      return {
        passed: equal,
        detail: equal
          ? "All cities have equal infrastructure."
          : `Infrastructure ranges from ${min} to ${max} (should all match).`
      };
    }
  },
  {
    key: "check3_land_ratio",
    label: "Land Ratio",
    recommendation: "Buy or sell land in the listed cities so Land = Infrastructure + 500.",
    run(nation) {
      const violations = [];
      nation.cities.forEach((city) => {
        const expectedLand = city.infrastructure + 500;
        if (Math.abs(city.land - expectedLand) > 0.01) {
          violations.push(`${city.name}: land ${city.land}, expected ${expectedLand.toFixed(2)}`);
        }
      });
      return {
        passed: violations.length === 0,
        detail: violations.length === 0 ? "All cities meet the land ratio." : violations.join("; ")
      };
    }
  }
];

module.exports = { checks };
