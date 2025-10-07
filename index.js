import express from "express";
import multer from "multer";
import { extractTextFromImage, extractTestsFromText } from "./lib/ocr.js";
import { parseTestLine } from "./lib/parser.js";
import { normalizeParsed } from "./lib/normalizer.js";
import { summarizeTests } from "./lib/summarizer.js";

const upload = multer();
const app = express();
app.use(express.json());

app.post("/parse", upload.single("report"), async (req, res) => {
  try {
    const textInput = (req.body?.text || "").toString().trim();
    let ocrText = null;
    let ocrConfidence = 0;

    if (textInput) {
      ocrText = textInput;
      ocrConfidence = 0.95;
    } else if (req.file) {
      const { buffer } = req.file;
      const ocrResult = await extractTextFromImage(buffer);
      ocrText = ocrResult.text;
      ocrConfidence = ocrResult.confidence;
    } else {
      return res.status(400).json({ status: "unprocessed", reason: "no input provided" });
    }

    const { tests_raw, confidence: step1_conf } = extractTestsFromText(ocrText);

    return res.json({
      tests_raw,
      confidence: +(ocrConfidence * step1_conf).toFixed(2),
      ocr_text: ocrText
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: "error", message: err.message });
  }
});

app.post("/normalize", async (req, res) => {
  try {
    const parsedLines = req.body?.parsed || [];
    if (!Array.isArray(parsedLines) || parsedLines.length === 0) {
      return res.status(400).json({ status: "unprocessed", reason: "no parsed lines provided" });
    }

    const { tests, normalization_confidence } = await normalizeParsed(parsedLines);
    if (!Array.isArray(tests) || tests.length === 0) {
      return res.json({ status: "unprocessed", reason: "normalization failed", tests: [], normalization_confidence });
    }

    return res.json({ tests, normalization_confidence });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: "error", message: err.message });
  }
});

app.post("/summarize", async (req, res) => {
  try {
    const tests = req.body?.tests || [];
    if (!Array.isArray(tests) || tests.length === 0) {
      return res.status(400).json({ status: "unprocessed", reason: "no tests provided" });
    }

    const summ = await summarizeTests(tests);
    return res.json(summ);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: "error", message: err.message });
  }
});

app.post("/analyze", upload.single("report"), async (req, res) => {
  try {
    const textInput = (req.body?.text || "").toString().trim();
    let ocrText = null;
    let ocrConfidence = 0;

    if (textInput) {
      ocrText = textInput;
      ocrConfidence = 0.95;
    } else if (req.file) {
      const { buffer } = req.file;
      const ocrResult = await extractTextFromImage(buffer);
      ocrText = ocrResult.text;
      ocrConfidence = ocrResult.confidence;
    } else {
      return res.status(400).json({ status: "unprocessed", reason: "no input provided" });
    }

    const { tests_raw, confidence: step1_conf } = extractTestsFromText(ocrText);
    const parsed = tests_raw.map(line => parseTestLine(line));
    const { tests, normalization_confidence } = await normalizeParsed(parsed);
    const summ = await summarizeTests(tests);

    const final = {
      tests,
      summary: summ.summary,
      explanations: summ.explanations,
      status: "ok",
      confidences: {
        ocr_confidence: +(ocrConfidence * step1_conf).toFixed(2),
        normalization_confidence: +(normalization_confidence).toFixed(2)
      }
    };

    return res.json(final);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: "error", message: err.message });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`AI Med Report Simplifier running on port ${port}`));
