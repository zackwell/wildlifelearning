function tokenize(q: string): string[] {
  const cleaned = q.trim().toLowerCase();
  if (!cleaned) return [];
  const parts = cleaned.split(/[\s\u3000，。、；:!?,.]+/).filter(Boolean);
  const tokens = new Set<string>();
  for (const p of parts) {
    if (p.length >= 2) tokens.add(p);
    if (/[\u4e00-\u9fff]/.test(p)) {
      for (let i = 0; i < p.length - 1; i++) {
        tokens.add(p.slice(i, i + 2));
      }
    }
  }
  return [...tokens];
}

export function keywordScore(text: string, query: string): number {
  const t = text.toLowerCase();
  const tokens = tokenize(query);
  if (!tokens.length) return 0;
  let score = 0;
  for (const tok of tokens) {
    if (t.includes(tok)) score += 1;
  }
  return score / tokens.length;
}
