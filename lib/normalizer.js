import { fuzzyFind } from "./lev.js";

const TEST_DB = [
  { keys: ["hemoglobin", "hb", "hgb", "hemglobin"], name: "Hemoglobin", unit: "g/dL", ref: { low: 12.0, high: 15.0 }, expl: "Hemoglobin carries oxygen in your blood. Low levels may be related to anemia." },
  { keys: ["wbc", "whitebloodcell", "white blood cell", "whitebloodcells"], name: "WBC", unit: "/uL", ref: { low: 4000, high: 11000 }, expl: "WBCs help fight infection. Higher counts can occur with infections or inflammation." },
  { keys: ["platelet", "platelets", "plt"], name: "Platelets", unit: "/uL", ref: { low: 150000, high: 450000 }, expl: "Platelets help your blood clot. Low or high values may affect bleeding or clotting." },
  { keys: ["sodium", "na", "na+"], name: "Sodium", unit: "mmol/L", ref: { low: 135, high: 145 }, expl: "Sodium helps regulate fluid balance and nerve function." },
  { keys: ["magnesium", "mg", "mg2+"], name: "Magnesium", unit: "mg/dL", ref: { low: 1.7, high: 2.2 }, expl: "Magnesium supports muscle and nerve function and energy production." },
  { keys: ["rbc", "red blood cell"], name: "RBC", unit: "million/uL", ref: { low: 4.2, high: 5.4 }, expl: "RBCs carry oxygen from your lungs to your body tissues." },
  { keys: ["glucose", "blood sugar", "fasting glucose"], name: "Glucose", unit: "mg/dL", ref: { low: 70, high: 99 }, expl: "Glucose measures blood sugar level — used to screen for diabetes." }
];

function findTestMeta(rawName) {
  const flatKeys = TEST_DB.flatMap(t => t.keys);
  const r = fuzzyFind(rawName, flatKeys, 0.35);
  if (!r) return null;
  const matchedKey = r.match;
  return TEST_DB.find(t => t.keys.includes(matchedKey));
}

export async function normalizeParsed(parsedList) {
  const tests = [];
  let successMatches = 0;

  for (const p of parsedList) {
    const nameCandidate = (p.name || "").replace(/[^a-zA-Z0-9 ]/g, "").trim().toLowerCase();

    const meta = findTestMeta(nameCandidate);

    if (!meta) {
      tests.push({
        name: p.name || "Unknown",
        value: p.value || null,
        unit: p.unit || null,
        status: p.statusText || "unknown",
        ref_range: null,
        // explanation: "Unknown test — not found in local database.",
        normalization_confidence: 0.3
      });
      continue;
    }

    successMatches++;
    const unitNorm = p.unit && p.unit.length > 0 ? p.unit : meta.unit;
    let status = p.statusText;

    if (!status && isFinite(p.value) && meta.ref) {
      if (p.value < meta.ref.low) status = "low";
      else if (p.value > meta.ref.high) status = "high";
      else status = "normal";
    }

    tests.push({
      name: meta.name,
      value: isFinite(p.value) ? p.value : null,
      unit: unitNorm,
      status: status || "unknown",
      ref_range: meta.ref,
      // explanation: meta.expl,
      normalization_confidence: 0.95
    });
  }

  const normalization_confidence = Math.min(0.99, 0.3 + (successMatches / Math.max(parsedList.length, 1)) * 0.7);
  return { tests, normalization_confidence };
}
