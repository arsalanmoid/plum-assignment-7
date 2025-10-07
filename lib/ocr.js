import { createWorker } from "tesseract.js";
import { OCR_LANG, OCR_OPTIONS } from "../config.js";

export async function extractTextFromImage(buffer) {
  // buffer: file buffer
  // returns { text, confidence }
  const worker = await createWorker();
  await worker.loadLanguage(OCR_LANG);
  await worker.initialize(OCR_LANG);
  // set options if needed
  try {
    const { data } = await worker.recognize(buffer, OCR_LANG, OCR_OPTIONS);
    // average confidence across blocks (0-100)
    const conf = (data?.confidence ?? 50) / 100;
    await worker.terminate();
    return { text: data?.text ?? "", confidence: conf };
  } catch (err) {
    await worker.terminate();
    throw err;
  }
}

export function extractTestsFromText(text){
  // naive split by newlines and common separators. preserves small mistakes.
  // returns {tests_raw: string[], confidence: number}
  if (!text) return { tests_raw: [], confidence: 0 };

  // normalize separators (some OCRs join lines)
  const lines = text
    .split(/\r?\n/)
    .map(s => s.trim())
    .filter(Boolean);

  // Also try splitting by semicolon or when several items on same line separated by comma AND contain numbers.
  const expanded = [];
  for (const line of lines){
    // If line contains multiple test-like items, split by commas but keep parentheses intact
    // simple heuristic: split by ")," or " ; " or "  " if contains ) or (
    if ((line.match(/\d/) || []).length > 0 && line.includes(',')){
      // split and trim items that look like "Name value unit"
      const parts = line.split(',').map(p => p.trim()).filter(Boolean);
      for (const p of parts) expanded.push(p);
    } else {
      expanded.push(line);
    }
  }

  // now try extracting tokens that look like test entries (name + number)
  const tests_raw = [];
  for (const s of expanded){
    // If line has at least one number, treat as a test line.
    if (/[0-9]/.test(s)) tests_raw.push(s.replace(/\s+/g,' ').trim());
  }

  // base confidence heuristic:
  let confidence = Math.min(0.99, Math.max(0.2, 0.6 + (tests_raw.length * 0.05)));
  return { tests_raw, confidence };
}
