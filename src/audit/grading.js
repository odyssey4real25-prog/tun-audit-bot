// grading.js
//
// Turns a percentage score into one of 4 grade tiers, using whatever
// thresholds the admin has configured with /set_grade_thresholds.
// Every report (single-nation and alliance-wide) calls this same function,
// so they're always perfectly consistent with each other.

function getGrade(percent, gradeThresholds) {
  if (percent >= gradeThresholds.excellent) {
    return { label: "Excellent", emoji: "🟢", color: 0x2ecc71 };
  }
  if (percent >= gradeThresholds.good) {
    return { label: "Passing", emoji: "🟢", color: 0x2ecc71 };
  }
  if (percent >= gradeThresholds.average) {
    return { label: "Needs Improvement", emoji: "🟡", color: 0xf1c40f };
  }
  return { label: "Failing", emoji: "🔴", color: 0xe74c3c };
}

// For places that still need a simple yes/no (e.g. "X passing, Y failing"
// counts in /government_audit). Excellent and Passing count as passing;
// Needs Improvement and Failing count as not passing.
function isPassingGrade(grade) {
  return grade.label === "Excellent" || grade.label === "Passing";
}

module.exports = { getGrade, isPassingGrade };
