import { fuzzyFind } from "./lev.js";

const STATUS_KEYWORDS = {
  low: ["low","l","lo","lw","l0"],
  high: ["high","hgh","hg","hi","h","hgH","hgH"],
  normal: ["normal","within range","w/n","wr","nrml"]
};

export function parseTestLine(line){
  // attempt to extract: name, value, unit, statusText (e.g., Low)
  // examples:
  // "Hemoglobin 10.2 g/dL (Low)"
  // "WBC 11200 /uL (Hgh)"
  // "WBC 11,200 /uL (High)"
  const original = line;
  // Normalize commas in numbers: 11,200 => 11200
  const cleaned = line.replace(/,/g, '');
  // Find parenthetical status if any
  let statusText = null;
  let withoutParen = cleaned;
  const parenMatch = cleaned.match(/\(([^)]+)\)/);
  if (parenMatch) {
    statusText = parenMatch[1].trim();
    withoutParen = cleaned.replace(parenMatch[0], ' ');
  }

  // Try to find number + unit: e.g., 10.2 g/dL or 11200 /uL
  const numUnitRegex = /([-+]?\d*\.?\d+)\s*([a-zA-Z\/\u00B2\-\%\^0-9\.]*)/; // permissive
  const match = withoutParen.match(numUnitRegex);
  if (!match) {
    // fallback: try to find integer
    const m2 = withoutParen.match(/(\d{2,6})/);
    if (!m2) return { original, name: withoutParen.trim(), value: null, unit: null, statusText };
    const value = Number(m2[1]);
    // name = text before the number
    const name = withoutParen.slice(0, m2.index).trim();
    return { original, name, value, unit: null, statusText };
  }

  const value = Number(match[1]);
  const unit = (match[2] || "").trim() || null;
  const name = withoutParen.slice(0, match.index).trim();

  // Clean the name a bit (fix common OCR mistakes like Hemglobin)
  const nameClean = name.replace(/[:\-–]+$/g, '').trim();

  // normalize status word using fuzzy matching
  let statusNormalized = null;
  if (statusText){
    const st = statusText.toLowerCase().replace(/[^a-z]/g,'');
    // try mapping
    for (const [k, arr] of Object.entries(STATUS_KEYWORDS)){
      for (const cand of arr){
        if (levenshteinSimple(st, cand) <= 2 || st === cand) { statusNormalized = k; break; }
      }
      if (statusNormalized) break;
    }
    if (!statusNormalized){
      // last resort fuzzyFind
      const flat = [].concat(...Object.values(STATUS_KEYWORDS));
      const r = fuzzyFind(statusText, flat, 0.4);
      statusNormalized = r ? (Object.keys(STATUS_KEYWORDS).find(k => STATUS_KEYWORDS[k].includes(r.match)) || null) : null;
    }
  }

  return { original, name: nameClean, value: isFinite(value) ? value : null, unit, statusText: statusNormalized ?? (statusText || null) };
}

// simple small helper used above
function levenshteinSimple(a,b){
  if(!a) return b?.length ?? 0;
  if(!b) return a.length;
  a = a.toLowerCase(); b = b.toLowerCase();
  let dp = Array.from({length: a.length+1}, () => Array(b.length+1).fill(0));
  for(let i=0;i<=a.length;i++) dp[i][0]=i;
  for(let j=0;j<=b.length;j++) dp[0][j]=j;
  for(let i=1;i<=a.length;i++){
    for(let j=1;j<=b.length;j++){
      const cost = a[i-1] === b[j-1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i-1][j]+1, dp[i][j-1]+1, dp[i-1][j-1]+cost);
    }
  }
  return dp[a.length][b.length];
}
