function rankingMetrics(ranking, relevant, k) {
  if (!Number.isInteger(k) || k < 1 || !Array.isArray(ranking) || !(relevant instanceof Set)) throw new Error('Invalid metric arguments');
  if (new Set(ranking).size !== ranking.length) throw new Error('Duplicate recommendation IDs');
  if (!relevant.size) return { recall: null, ndcg: null };
  let hits = 0, dcg = 0;
  for (const [index, id] of ranking.slice(0, k).entries()) if (relevant.has(id)) { hits++; dcg += 1 / Math.log2(index + 2); }
  let ideal = 0;
  for (let i = 0; i < Math.min(k, relevant.size); i++) ideal += 1 / Math.log2(i + 2);
  return { recall: hits / relevant.size, ndcg: dcg / ideal };
}
function summarize(rows, catalogSize) {
  const scored = rows.filter((r) => r.relevant.length > 0), unique = new Set(scored.flatMap((r) => r.ranking));
  return { users: rows.length, evaluated_users: scored.length, excluded_no_relevant: rows.length - scored.length,
    relevant_items: scored.reduce((n, r) => n + r.relevant.length, 0),
    recall: scored.length ? scored.reduce((n, r) => n + r.recall, 0) / scored.length : null,
    ndcg: scored.length ? scored.reduce((n, r) => n + r.ndcg, 0) / scored.length : null,
    catalog_coverage: catalogSize ? unique.size / catalogSize : null, recommended_unique: unique.size };
}
module.exports = { rankingMetrics, summarize };
