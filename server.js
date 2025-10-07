import express from "express";
import multer from "multer";
import { extractTextFromImage, extractTestsFromText } from "./lib/ocr.js";
import { parseTestLine } from "./lib/parser.js";
import { normalizeParsed } from "./lib/normalizer.js";
import { summarizeTests } from "./lib/summarizer.js";

const upload = multer();
const app = express();
app.use(express.json());

async function processLabText(inputText, ocrConfidence = 0.95) {
  const { tests_raw, confidence: step1_conf } = extractTestsFromText(inputText);

  if (tests_raw.length === 0) {
    return {
      status: "unprocessed",
      reason: "no tests extracted from input",
      tests_raw: [],
      confidence: ocrConfidence * step1_conf
    };
  }

  const step1 = { tests_raw, confidence: +(ocrConfidence * step1_conf).toFixed(2) };

  const parsed = tests_raw.map(line => parseTestLine(line));

  const { tests, normalization_confidence } = await normalizeParsed(parsed);

  if (!Array.isArray(tests) || tests.length === 0) {
    return { status: "unprocessed", reason: "normalization failed", tests: [], normalization_confidence };
  }

  const summ = await summarizeTests(tests);

  if (summ.status && summ.status === "unprocessed") {
    return { status: "unprocessed", reason: summ.reason };
  }
  
  return {
    tests,
    summary: summ.summary,
    explanations: summ.explanations,
    status: "ok",
    confidences: {
      ocr_confidence: step1.confidence,
      normalization_confidence: +(normalization_confidence).toFixed(2)
    }
  };
}

app.post("/analyze/image", upload.single("report"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ status: "unprocessed", reason: "no image file provided" });
    }

    const { buffer } = req.file;
    const ocrResult = await extractTextFromImage(buffer);
    const result = await processLabText(ocrResult.text, ocrResult.confidence);

    return res.json(result);
  } catch (err) {
    console.error("Error in /analyze/image:", err);
    return res.status(500).json({ status: "error", message: err.message });
  }
});

app.post("/analyze/text", async (req, res) => {
  try {
    const textInput = (req.body?.text || "").toString().trim();

    if (!textInput) {
      return res.status(400).json({ status: "unprocessed", reason: "no text input provided" });
    }

    const result = await processLabText(textInput, 0.95);
    return res.json(result);
  } catch (err) {
    console.error("Error in /analyze/text:", err);
    return res.status(500).json({ status: "error", message: err.message });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`AI Med Report Simplifier running on port ${port}`));
