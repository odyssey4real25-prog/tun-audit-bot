// categories.js
//
// Single source of truth for the 4 audit categories, so every command that
// lets someone pick a category (notify, export, etc.) stays in sync
// automatically instead of each redefining its own copy.

const { checks: infraChecks } = require("./checks/infrastructureLand");
const { checks: buildChecks } = require("./checks/buildsProjects");
const { checks: otherChecks } = require("./checks/others");
const { ALL_CHECKS } = require("./grandAudit");

const CATEGORIES = {
  infrastructure_land: { checks: infraChecks, label: "Infrastructure & Land" },
  build_slots_project: { checks: buildChecks, label: "Builds & Projects" },
  others: { checks: otherChecks, label: "Other Compliance" },
  grand_audit: { checks: ALL_CHECKS, label: "Grand Audit" }
};

const CATEGORY_CHOICES = [
  { name: "Infrastructure & Land", value: "infrastructure_land" },
  { name: "Builds & Projects", value: "build_slots_project" },
  { name: "Other Compliance", value: "others" },
  { name: "Grand Audit (all checks)", value: "grand_audit" }
];

module.exports = { CATEGORIES, CATEGORY_CHOICES };
