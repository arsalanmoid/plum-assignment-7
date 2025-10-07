import fetch from "node-fetch";
import dontenv from 'dotenv'
dontenv.config();
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = "gemini-2.5-flash";
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

export async function summarizeTests(tests) {
  if (!Array.isArray(tests) || tests.length === 0) {
    return { summary: "", explanations: [], status: "unprocessed", reason: "no tests found" };
  }
  if (tests.length === 0) {
    return { summary: "All test results are within normal ranges.", explanations: [], status: "ok" };
  }

  const testDetails = tests.map(t => `${t.name}: ${t.value ?? "N/A"} (${t.status.toUpperCase()})`).join("\n");

  const prompt = `
You are a friendly, patient-focused medical assistant.  
Given the following lab test results:

${testDetails}

Please return JSON only with the following structure:

{
  "summary": "<one-sentence overview of abnormal tests>",
  "explanations": [
    "Here's a closer look at what each result means:",
    "1.<Test Name> (<Value> - <STATUS>): <Plain-language explanation>",
    "2.<Test Name> (<Value> - <STATUS>): <Plain-language explanation>",
    "...",
    "3.This information is for educational purposes only and is not a medical diagnosis. Please consult your healthcare provider for personalized advice."
  ]
}
`;

  try {
    const resp = await fetch(GEMINI_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": GEMINI_API_KEY
      },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });

    if (!resp.ok) {
      const errText = await resp.text();
      throw new Error(`Gemini API error: ${resp.status} ${errText}`);
    }

    const json = await resp.json();
    const candidate = json.candidates?.[0];
    const parts = candidate?.content?.parts || [];
    const text = parts.map(p => p.text).join("").replace(/```json|```/g, "").trim();

    const parsed = JSON.parse(text);
    return parsed;

  } catch (err) {
    console.error("Error calling Gemini for summarization:", err);
    // fallback
    return fallbackSummarizer(abnormal);
  }
}

// fallback if Gemini fails
function fallbackSummarizer(abnormal) {
  const summary = `Overall, your results indicate that ${tests.map((t, i) => {
  let statusText;
  switch ((t.status || "").toLowerCase()) {
    case "low":
      statusText = "a bit low";
      break;
    case "high":
      statusText = "a little high";
      break;
    case "good":
    case "normal":
      statusText = "within the normal range";
      break;
    default:
      statusText = "needs attention";
  }
  return `${t.name} is ${statusText}`;
}).join(", while ")}.`;


  const explanations = ["Here's a closer look at what each result means:"];
  abnormal.forEach((t, i) => {
    explanations.push(`${i + 1}.${t.name} (${t.value} - ${t.status.toUpperCase()}): ${
      t.status === "low"
        ? `${t.name} is slightly lower than the typical range, which may indicate reduced function or mild deficiency.`
        : `${t.name} is slightly higher than the typical range, which may indicate your body is responding to infection or inflammation.`
    }`);
  });
  explanations.push(
    `${abnormal.length + 1}.This information is for educational purposes only and is not a medical diagnosis. Please consult your healthcare provider for personalized advice.`
  );

  return { summary, explanations, status: "ok" };
}
