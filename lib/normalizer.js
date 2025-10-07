import fetch from "node-fetch";
import { fuzzyFind } from "./lev.js";
import dontenv from 'dotenv'
dontenv.config();
const TEST_DB = [
  { keys: ["hemoglobin", "hb", "hgb", "hemglobin"], name: "Hemoglobin", unit: "g/dL", ref: { low: 12.0, high: 15.0 }, expl: "Hemoglobin carries oxygen in your blood. Low levels may be related to anemia." },
  { keys: ["wbc", "whitebloodcell", "white blood cell", "whitebloodcells"], name: "WBC", unit: "/uL", ref: { low: 4000, high: 11000 }, expl: "WBCs help fight infection. Higher counts can occur with infections or inflammation." },
  { keys: ["platelet", "platelets", "plt"], name: "Platelets", unit: "/uL", ref: { low: 150000, high: 450000 }, expl: "Platelets help your blood clot. Low or high values may affect bleeding or clotting." }
];

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = "gemini-2.5-flash";
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
async function queryGeminiForTestMeta(rawName) {
  if (!GEMINI_API_KEY) {
    console.error("Missing GEMINI_API_KEY");
    return null;
  }

  const prompt = `
You are a medical terminology normalizer.
Given this test name: "${rawName}"
Return ONLY valid JSON (no markdown, no explanation text):
{
  "name": "<Standard Test Name>",
  "unit": "<common unit or null>",
  "ref_range": {"low": <number|null>, "high": <number|null>},
  "explanation": "<one-line clinical explanation>"
}
If unsure, return {"name":"Unknown","unit":null,"ref_range":null,"explanation":"Unknown test."}
`;

  try {
    const resp = await fetch(GEMINI_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": GEMINI_API_KEY
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });

    console.log(`Gemini response: ${resp.status}`);
    const data = await resp.json();

    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!text) {
      console.error("No response from Gemini:", data);
      return null;
    }

    // Clean potential markdown code block markers
    const cleanText = text.replace(/```json|```/g, "").trim();

    let parsed;
    try {
      parsed = JSON.parse(cleanText);
    } catch (err) {
      console.error("Failed to parse Gemini JSON:", err.message, "\nRaw text:", cleanText);
      return null;
    }

    if (parsed.name && parsed.name !== "Unknown") return parsed;
    return null;
  } catch (err) {
    console.error("Gemini fetch failed:", err.message);
    return null;
  }
}

// Fuzzy match to local test DB
function findTestMeta(rawName) {
  const flatKeys = TEST_DB.flatMap(t => t.keys);
  const r = fuzzyFind(rawName, flatKeys, 0.35);
  if (!r) return null;
  const matchedKey = r.match;
  return TEST_DB.find(t => t.keys.includes(matchedKey));
}

// 🧬 Normalize parsed test data
export async function normalizeParsed(parsedList) {
  const tests = [];
  let successMatches = 0;

  for (const p of parsedList) {
    const nameCandidate = (p.name || "").replace(/[^a-zA-Z0-9 ]/g, "").trim();

    // 1️⃣ Try local lookup
    let meta = findTestMeta(nameCandidate);

    // 2️⃣ If not found locally, query Gemini
    if (!meta) {
      const aiMeta = await queryGeminiForTestMeta(nameCandidate);
      if (aiMeta) {
        meta = {
          keys: [nameCandidate.toLowerCase()],
          name: aiMeta.name,
          unit: aiMeta.unit,
          ref: aiMeta.ref_range,
          expl: aiMeta.explanation
        };
        TEST_DB.push(meta); // cache for later use
      }
    }

    // 3️⃣ Handle unknowns
    if (!meta) {
      tests.push({
        name: p.name || "Unknown",
        value: p.value || null,
        unit: p.unit || null,
        status: p.statusText || "unknown",
        ref_range: null,
        explanation: "Unknown test — AI or database could not identify.",
        normalization_confidence: 0.3
      });
      continue;
    }

    successMatches++;
    const unitNorm = p.unit && p.unit.length > 0 ? p.unit : meta.unit;
    let status = p.statusText;

    // 4️⃣ Infer status based on reference range
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
      normalization_confidence: meta.name !== "Unknown" ? 0.9 : 0.4
    });
  }

  const normalization_confidence = Math.min(0.99, 0.3 + (successMatches / Math.max(parsedList.length, 1)) * 0.7);
  return { tests, normalization_confidence };
}
