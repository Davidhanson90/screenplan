/** Simple fuzzy score: subsequence match with bonus for contiguous / word-start hits. */
export function fuzzyScore(query: string, text: string): number {
  const q = query.trim().toLowerCase();
  const t = text.toLowerCase();
  if (!q) return 1;
  if (t.includes(q)) return 100 + (q.length / Math.max(t.length, 1)) * 20;

  let qi = 0;
  let score = 0;
  let streak = 0;
  for (let i = 0; i < t.length && qi < q.length; i += 1) {
    if (t[i] === q[qi]) {
      streak += 1;
      score += 1 + streak;
      if (i === 0 || /[\s-]/.test(t[i - 1] ?? "")) score += 4;
      qi += 1;
    } else {
      streak = 0;
    }
  }
  return qi === q.length ? score : 0;
}

export function fuzzyFilter<T>(
  items: T[],
  query: string,
  getText: (item: T) => string,
  limit = 50
): T[] {
  if (!query.trim()) return items.slice(0, limit);
  return items
    .map((item) => ({ item, score: fuzzyScore(query, getText(item)) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.item);
}
