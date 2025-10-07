export function levenshtein(a, b) {
  if (!a) return b?.length ?? 0;
  if (!b) return a.length;
  const m = a.length, n = b.length;
  const dp = Array.from({length: m+1}, () => new Array(n+1).fill(0));
  for (let i=0;i<=m;i++) dp[i][0]=i;
  for (let j=0;j<=n;j++) dp[0][j]=j;
  for (let i=1;i<=m;i++){
    for (let j=1;j<=n;j++){
      const cost = a[i-1] === b[j-1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i-1][j]+1, dp[i][j-1]+1, dp[i-1][j-1]+cost);
    }
  }
  return dp[m][n];
}

export function fuzzyFind(word, candidates, maxRatio=0.35){
  // return best match if normalized distance ratio <= maxRatio
  word = (word||"").toLowerCase().replace(/\s+/g,'');
  let best=null, bestScore=1.0;
  for (const c of candidates){
    const s = levenshtein(word, c.toLowerCase().replace(/\s+/g,'')) / Math.max(word.length, c.length, 1);
    if (s < bestScore){
      bestScore = s; best = c;
    }
  }
  if (bestScore <= maxRatio) return {match: best, score: 1 - bestScore};
  return null;
}
